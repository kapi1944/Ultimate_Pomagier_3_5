import { czyDokumentMaNowszeDaneZrodlowe, statusyDokumentow, typyDokumentow, utworzNowyDokument, walidujDokument, type Dokument } from './modelDokumentu'

export const kluczRejestruDokumentow = 'ultimatePomagier.rejestrDokumentow.v1'
export const kluczKopiiBezpieczenstwaRejestruDokumentow = 'ultimatePomagier.rejestrDokumentow.kopia-bezpieczenstwa'
export const wersjaRejestruDokumentow = 3

export type KopiaRoboczaDokumentu = { id: string; dokumentNadrzednyId: string | null; czyNowyDokument: boolean; daneDokumentu: unknown; reczneNadpisania: Record<string, unknown>; utworzono: string; zaktualizowano: string }
export type AutosaveDokumentu = { id: string; generatorId: string; dokumentId: string | null; dane: unknown; zapisano: string }
export type WpisHistoriiWspolnegoDokumentu = { id: string; dokumentId: string | null; dokumentLogicznyId: string | null; typ: string; data: string; dane: unknown; automatyczne: boolean; daneLegacy?: unknown; pochodzenie?: { magazyn: string; klucz: string; idLegacy: string } }
export type WpisMigracjiDokumentow = { id: string; stan: 'NIE_ROZPOCZETA' | 'W_TRAKCIE' | 'OCZEKUJE_WERYFIKACJI' | 'POTWIERDZONA'; data: string; mapowanieId: Record<string, string>; raport: Record<string, unknown> }
export type StanRejestruDokumentow = { wersja: 3; dokumenty: Dokument<unknown, unknown>[]; kopieRobocze: KopiaRoboczaDokumentu[]; autosave: AutosaveDokumentu[]; historia: WpisHistoriiWspolnegoDokumentu[]; migracje: WpisMigracjiDokumentow[] }
export type ZmianyDokumentu = Partial<Omit<Dokument<unknown, unknown>, 'id' | 'utworzono' | 'zmodyfikowano'>>

export interface RepozytoriumWspolnychDokumentow {
  pobierzWszystkie(): Dokument<unknown, unknown>[]
  pobierzPoId(id: string): Dokument<unknown, unknown> | null
  utworz<TDane, TUstawienia>(dokument: Dokument<TDane, TUstawienia>): Dokument<TDane, TUstawienia>
  aktualizuj(id: string, zmiany: ZmianyDokumentu): Dokument<unknown, unknown> | null
  archiwizuj(id: string): Dokument<unknown, unknown> | null
  przywroc(id: string): Dokument<unknown, unknown> | null
  usunMiekko(id: string): Dokument<unknown, unknown> | null
  przywrocZKosza(id: string): Dokument<unknown, unknown> | null
  usunTrwale(id: string): boolean
  utworzKopieRobocza(dane: Omit<KopiaRoboczaDokumentu, 'id' | 'utworzono' | 'zaktualizowano'> & { id?: string }): KopiaRoboczaDokumentu
  pobierzKopieRobocza(id: string): KopiaRoboczaDokumentu | null
  aktualizujKopieRobocza(id: string, zmiany: Partial<Pick<KopiaRoboczaDokumentu, 'daneDokumentu' | 'reczneNadpisania'>>): KopiaRoboczaDokumentu | null
  usunKopieRobocza(id: string): boolean
  odswiezDostepnoscDanychZrodlowych(id: string, aktualnyZnacznikDanychZrodlowych: string | null): Dokument<unknown, unknown> | null
  pobierzHistorie(dokumentId?: string): WpisHistoriiWspolnegoDokumentu[]
  dodajWpisHistorii(wpis: Omit<WpisHistoriiWspolnegoDokumentu, 'id' | 'data'> & Partial<Pick<WpisHistoriiWspolnegoDokumentu, 'id' | 'data'>>): WpisHistoriiWspolnegoDokumentu
  pobierzAutosave(id: string): AutosaveDokumentu | null
  zapiszAutosave(autosave: Omit<AutosaveDokumentu, 'zapisano'> & { zapisano?: string }): AutosaveDokumentu
  usunAutosave(id: string): boolean
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> { return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc)) }
function czyNalezyDo<Typ extends string>(wartosc: unknown, wartosci: readonly Typ[]): wartosc is Typ { return typeof wartosc === 'string' && wartosci.includes(wartosc as Typ) }
function tekstLubNull(wartosc: unknown): string | null { return typeof wartosc === 'string' ? wartosc : null }
function dataLubNull(wartosc: unknown): string | null { return typeof wartosc === 'string' && !Number.isNaN(Date.parse(wartosc)) ? wartosc : null }
function utworzId(prefiks: string) { return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? `${prefiks}-${crypto.randomUUID()}` : `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }
function pustyStan(): StanRejestruDokumentow { return { wersja: 3, dokumenty: [], kopieRobocze: [], autosave: [], historia: [], migracje: [] } }

function normalizujDokument(wartosc: unknown): Dokument<unknown, unknown> | null {
  if (!czyObiekt(wartosc) || typeof wartosc.id !== 'string' || !czyNalezyDo(wartosc.typ, typyDokumentow) || typeof wartosc.tytul !== 'string' || typeof wartosc.generatorId !== 'string') return null
  const utworzono = dataLubNull(wartosc.utworzono)
  const zmodyfikowano = dataLubNull(wartosc.zmodyfikowano)
  const status = czyNalezyDo(wartosc.status, statusyDokumentow) ? wartosc.status : null
  if (!utworzono || !zmodyfikowano || !status) return null
  const integralnosc = czyObiekt(wartosc.integralnosc) ? wartosc.integralnosc : {}
  const powiazania = czyObiekt(wartosc.powiazania) ? wartosc.powiazania : {}
  const pochodzenieMigracji = czyObiekt(wartosc.pochodzenieMigracji) && typeof wartosc.pochodzenieMigracji.magazyn === 'string' && typeof wartosc.pochodzenieMigracji.klucz === 'string' && typeof wartosc.pochodzenieMigracji.typLegacy === 'string' && typeof wartosc.pochodzenieMigracji.idLegacy === 'string' && typeof wartosc.pochodzenieMigracji.odciskZrodla === 'string' && typeof wartosc.pochodzenieMigracji.idMigracji === 'string' && typeof wartosc.pochodzenieMigracji.zmigrowano === 'string' ? { magazyn: wartosc.pochodzenieMigracji.magazyn, klucz: wartosc.pochodzenieMigracji.klucz, typLegacy: wartosc.pochodzenieMigracji.typLegacy, idLegacy: wartosc.pochodzenieMigracji.idLegacy, odciskZrodla: wartosc.pochodzenieMigracji.odciskZrodla, idMigracji: wartosc.pochodzenieMigracji.idMigracji, zmigrowano: wartosc.pochodzenieMigracji.zmigrowano } : null
  const dokument = {
    ...utworzNowyDokument({ id: wartosc.id, typ: wartosc.typ, tytul: wartosc.tytul, generatorId: wartosc.generatorId, daneDokumentu: wartosc.daneDokumentu, ustawieniaDokumentu: wartosc.ustawieniaDokumentu, dokumentLogicznyId: tekstLubNull(wartosc.dokumentLogicznyId) ?? wartosc.id, statusBiznesowy: tekstLubNull(wartosc.statusBiznesowy), widocznosc: tekstLubNull(wartosc.widocznosc), zrodloUtworzenia: tekstLubNull(wartosc.zrodloUtworzenia), rekordZrodlowyId: tekstLubNull(wartosc.rekordZrodlowyId), wersjaFormatu: tekstLubNull(wartosc.wersjaFormatu), szkolenieId: tekstLubNull(wartosc.szkolenieId), klientId: tekstLubNull(wartosc.klientId), organizatorId: tekstLubNull(wartosc.organizatorId), dokumentNadrzednyId: tekstLubNull(wartosc.dokumentNadrzednyId), poprzedniaWersjaId: tekstLubNull(wartosc.poprzedniaWersjaId), autorId: tekstLubNull(wartosc.autorId), wlascicielId: tekstLubNull(wartosc.wlascicielId), ostatnioModyfikujacyId: tekstLubNull(wartosc.ostatnioModyfikujacyId), pochodzenieMigracji, powiazania: { szkolenieId: tekstLubNull(powiazania.szkolenieId) ?? tekstLubNull(wartosc.szkolenieId), grupaId: tekstLubNull(powiazania.grupaId), klientId: tekstLubNull(powiazania.klientId) ?? tekstLubNull(wartosc.klientId), organizatorId: tekstLubNull(powiazania.organizatorId) ?? tekstLubNull(wartosc.organizatorId), szczegolyOrganizacyjneId: tekstLubNull(powiazania.szczegolyOrganizacyjneId) ?? tekstLubNull(integralnosc.idZrodlowychSzczegolow), wersjaSzczegolowId: tekstLubNull(powiazania.wersjaSzczegolowId), odciskDanychZrodlowych: tekstLubNull(powiazania.odciskDanychZrodlowych) ?? tekstLubNull(integralnosc.znacznikDanychZrodlowych) }, integralnosc: { powiazanieZeSzczegolami: integralnosc.powiazanieZeSzczegolami === 'POWIAZANY_ZE_SZCZEGOLAMI' ? 'POWIAZANY_ZE_SZCZEGOLAMI' : 'SAMODZIELNY', idZrodlowychSzczegolow: tekstLubNull(integralnosc.idZrodlowychSzczegolow), znacznikDanychZrodlowych: tekstLubNull(integralnosc.znacznikDanychZrodlowych), reczneNadpisania: czyObiekt(integralnosc.reczneNadpisania) ? integralnosc.reczneNadpisania : {}, czyDaneZrodloweNowsze: integralnosc.czyDaneZrodloweNowsze === true } }),
    wersja: typeof wartosc.wersja === 'number' ? wartosc.wersja : 1,
    wersjaSchematu: typeof wartosc.wersjaSchematu === 'number' ? wartosc.wersjaSchematu : 1,
    utworzono,
    zmodyfikowano,
    zaktualizowano: dataLubNull(wartosc.zaktualizowano) ?? zmodyfikowano,
    opublikowano: dataLubNull(wartosc.opublikowano),
    czyZarchiwizowany: wartosc.czyZarchiwizowany === true || status === 'ZARCHIWIZOWANY',
    zarchiwizowano: dataLubNull(wartosc.zarchiwizowano) ?? (status === 'ZARCHIWIZOWANY' ? zmodyfikowano : null),
    czyUsunietyMiekko: wartosc.czyUsunietyMiekko === true,
    usunieto: dataLubNull(wartosc.usunieto),
    status,
  } satisfies Dokument<unknown, unknown>
  return walidujDokument(dokument).czyPoprawny ? dokument : null
}

function normalizujKopie(wartosc: unknown): KopiaRoboczaDokumentu | null { return czyObiekt(wartosc) && typeof wartosc.id === 'string' && (wartosc.dokumentNadrzednyId === null || typeof wartosc.dokumentNadrzednyId === 'string') && typeof wartosc.utworzono === 'string' && typeof wartosc.zaktualizowano === 'string' ? { id: wartosc.id, dokumentNadrzednyId: wartosc.dokumentNadrzednyId, czyNowyDokument: wartosc.czyNowyDokument === true, daneDokumentu: wartosc.daneDokumentu, reczneNadpisania: czyObiekt(wartosc.reczneNadpisania) ? wartosc.reczneNadpisania : {}, utworzono: wartosc.utworzono, zaktualizowano: wartosc.zaktualizowano } : null }
function normalizujAutosave(wartosc: unknown): AutosaveDokumentu | null { return czyObiekt(wartosc) && typeof wartosc.id === 'string' && typeof wartosc.generatorId === 'string' && (wartosc.dokumentId === null || typeof wartosc.dokumentId === 'string') && typeof wartosc.zapisano === 'string' ? { id: wartosc.id, generatorId: wartosc.generatorId, dokumentId: wartosc.dokumentId, dane: wartosc.dane, zapisano: wartosc.zapisano } : null }
function normalizujHistorie(wartosc: unknown): WpisHistoriiWspolnegoDokumentu | null { return czyObiekt(wartosc) && typeof wartosc.id === 'string' && typeof wartosc.typ === 'string' && typeof wartosc.data === 'string' ? { id: wartosc.id, dokumentId: tekstLubNull(wartosc.dokumentId), dokumentLogicznyId: tekstLubNull(wartosc.dokumentLogicznyId), typ: wartosc.typ, data: wartosc.data, dane: wartosc.dane, automatyczne: wartosc.automatyczne === true, daneLegacy: wartosc.daneLegacy, pochodzenie: czyObiekt(wartosc.pochodzenie) && typeof wartosc.pochodzenie.magazyn === 'string' && typeof wartosc.pochodzenie.klucz === 'string' && typeof wartosc.pochodzenie.idLegacy === 'string' ? { magazyn: wartosc.pochodzenie.magazyn, klucz: wartosc.pochodzenie.klucz, idLegacy: wartosc.pochodzenie.idLegacy } : undefined } : null }
function normalizujMigracje(wartosc: unknown): WpisMigracjiDokumentow | null { return czyObiekt(wartosc) && typeof wartosc.id === 'string' && (wartosc.stan === 'NIE_ROZPOCZETA' || wartosc.stan === 'W_TRAKCIE' || wartosc.stan === 'OCZEKUJE_WERYFIKACJI' || wartosc.stan === 'POTWIERDZONA') && typeof wartosc.data === 'string' ? { id: wartosc.id, stan: wartosc.stan, data: wartosc.data, mapowanieId: czyObiekt(wartosc.mapowanieId) ? Object.fromEntries(Object.entries(wartosc.mapowanieId).filter(([, id]) => typeof id === 'string')) as Record<string, string> : {}, raport: czyObiekt(wartosc.raport) ? wartosc.raport : {} } : null }

function walidujStan(stan: StanRejestruDokumentow) {
  const idDokumentow = new Set<string>()
  for (const dokument of stan.dokumenty) {
    if (!walidujDokument(dokument).czyPoprawny) throw new Error('Rejestr dokumentów zawiera niepoprawny dokument.')
    if (idDokumentow.has(dokument.id)) throw new Error('Rejestr dokumentów zawiera zduplikowany identyfikator.')
    idDokumentow.add(dokument.id)
  }
}

function przeksztalcDoV3(odczyt: Record<string, unknown>): StanRejestruDokumentow {
  const dokumenty = (Array.isArray(odczyt.dokumenty) ? odczyt.dokumenty : []).map(normalizujDokument)
  const kopieRobocze = (Array.isArray(odczyt.kopieRobocze) ? odczyt.kopieRobocze : []).map(normalizujKopie)
  const autosave = (Array.isArray(odczyt.autosave) ? odczyt.autosave : []).map(normalizujAutosave)
  const historia = (Array.isArray(odczyt.historia) ? odczyt.historia : []).map(normalizujHistorie)
  const migracje = (Array.isArray(odczyt.migracje) ? odczyt.migracje : []).map(normalizujMigracje)
  if (dokumenty.some((dokument) => dokument === null) || kopieRobocze.some((kopia) => kopia === null) || autosave.some((pozycja) => pozycja === null) || historia.some((wpis) => wpis === null) || migracje.some((wpis) => wpis === null)) throw new Error('Rejestr dokumentów zawiera uszkodzone dane.')
  const stan: StanRejestruDokumentow = { wersja: 3, dokumenty: dokumenty as Dokument<unknown, unknown>[], kopieRobocze: kopieRobocze as KopiaRoboczaDokumentu[], autosave: autosave as AutosaveDokumentu[], historia: historia as WpisHistoriiWspolnegoDokumentu[], migracje: migracje as WpisMigracjiDokumentow[] }
  walidujStan(stan)
  return stan
}

function zapiszStan(stan: StanRejestruDokumentow) { walidujStan(stan); localStorage.setItem(kluczRejestruDokumentow, JSON.stringify(stan)) }
export function pobierzStanRejestruDokumentowBezZapisu(): StanRejestruDokumentow {
  const zapis = localStorage.getItem(kluczRejestruDokumentow)
  if (zapis === null) return pustyStan()
  let odczyt: unknown
  try { odczyt = JSON.parse(zapis) as unknown } catch { throw new Error('Rejestr dokumentów zawiera uszkodzony JSON.') }
  if (!czyObiekt(odczyt)) throw new Error('Rejestr dokumentów ma nieobsługiwany schemat.')
  const wersja = typeof odczyt.wersja === 'number' ? odczyt.wersja : 0
  if (wersja > wersjaRejestruDokumentow) throw new Error('Rejestr dokumentów ma nowszą, nieobsługiwaną wersję.')
  return przeksztalcDoV3(odczyt)
}
export function pobierzStanRejestruDokumentow(): StanRejestruDokumentow {
  const zapis = localStorage.getItem(kluczRejestruDokumentow)
  const stan = pobierzStanRejestruDokumentowBezZapisu()
  if (zapis === null) return stan
  const odczyt = JSON.parse(zapis) as Record<string, unknown>
  const wersja = typeof odczyt.wersja === 'number' ? odczyt.wersja : 0
  if (wersja < wersjaRejestruDokumentow) { localStorage.setItem(kluczKopiiBezpieczenstwaRejestruDokumentow, zapis); zapiszStan(stan) }
  return stan
}
export function zapiszStanRejestruDokumentow(stan: StanRejestruDokumentow) { zapiszStan(stan) }

function dodajHistorie(stan: StanRejestruDokumentow, dokument: Dokument<unknown, unknown> | null, typ: string, dane: unknown) { stan.historia.unshift({ id: utworzId('historia'), dokumentId: dokument?.id ?? null, dokumentLogicznyId: dokument?.dokumentLogicznyId ?? null, typ, data: new Date().toISOString(), dane, automatyczne: true }) }
function aktualizujStan(id: string, zmien: (dokument: Dokument<unknown, unknown>) => Dokument<unknown, unknown>, typHistorii: string) {
  const stan = pobierzStanRejestruDokumentow()
  const indeks = stan.dokumenty.findIndex((dokument) => dokument.id === id)
  if (indeks === -1) return null
  const dokument = zmien(stan.dokumenty[indeks])
  if (!walidujDokument(dokument).czyPoprawny) throw new Error('Zmiany naruszają model dokumentu.')
  stan.dokumenty[indeks] = dokument
  dodajHistorie(stan, dokument, typHistorii, { dokument })
  zapiszStan(stan)
  return dokument
}

export const repozytoriumWspolnychDokumentow: RepozytoriumWspolnychDokumentow = {
  pobierzWszystkie: () => [...pobierzStanRejestruDokumentow().dokumenty].sort((pierwszy, drugi) => Date.parse(drugi.zmodyfikowano) - Date.parse(pierwszy.zmodyfikowano)),
  pobierzPoId: (id) => pobierzStanRejestruDokumentow().dokumenty.find((dokument) => dokument.id === id) ?? null,
  utworz<TDane, TUstawienia>(dokument: Dokument<TDane, TUstawienia>) { const stan = pobierzStanRejestruDokumentow(); const rekord = dokument as Dokument<unknown, unknown>; if (stan.dokumenty.some((istniejacy) => istniejacy.id === rekord.id)) throw new Error('Dokument o tym identyfikatorze już istnieje.'); if (!walidujDokument(rekord).czyPoprawny) throw new Error('Nie można zapisać niepoprawnego dokumentu.'); stan.dokumenty.unshift(rekord); dodajHistorie(stan, rekord, 'utworzenie', { dokument: rekord }); zapiszStan(stan); return dokument },
  aktualizuj(id, zmiany) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, ...zmiany, id: dokument.id, utworzono: dokument.utworzono, zmodyfikowano: teraz, zaktualizowano: teraz }), 'aktualizacja') },
  archiwizuj(id) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, status: 'ZARCHIWIZOWANY', czyZarchiwizowany: true, zarchiwizowano: teraz, zmodyfikowano: teraz, zaktualizowano: teraz }), 'archiwizacja') },
  przywroc(id) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, status: 'GOTOWY', czyZarchiwizowany: false, zarchiwizowano: null, zmodyfikowano: teraz, zaktualizowano: teraz }), 'przywrocenie') },
  usunMiekko(id) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, czyUsunietyMiekko: true, usunieto: teraz, zmodyfikowano: teraz, zaktualizowano: teraz }), 'kosz') },
  przywrocZKosza(id) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, czyUsunietyMiekko: false, usunieto: null, zmodyfikowano: teraz, zaktualizowano: teraz }), 'przywrocenie_z_kosza') },
  usunTrwale(id) { const stan = pobierzStanRejestruDokumentow(); const dokument = stan.dokumenty.find((pozycja) => pozycja.id === id); if (!dokument?.czyUsunietyMiekko) return false; stan.dokumenty = stan.dokumenty.filter((pozycja) => pozycja.id !== id); dodajHistorie(stan, dokument, 'usuniecie_trwale', { dokument }); zapiszStan(stan); return true },
  utworzKopieRobocza(dane) { const stan = pobierzStanRejestruDokumentow(); const teraz = new Date().toISOString(); const zajeteId = new Set([...stan.dokumenty.map((dokument) => dokument.id), ...stan.kopieRobocze.map((kopia) => kopia.id)]); const id = dane.id && !zajeteId.has(dane.id) ? dane.id : utworzId('kopia'); const kopia: KopiaRoboczaDokumentu = { ...dane, id, utworzono: teraz, zaktualizowano: teraz }; stan.kopieRobocze.unshift(kopia); zapiszStan(stan); return kopia },
  pobierzKopieRobocza: (id) => pobierzStanRejestruDokumentow().kopieRobocze.find((kopia) => kopia.id === id) ?? null,
  aktualizujKopieRobocza(id, zmiany) { const stan = pobierzStanRejestruDokumentow(); const indeks = stan.kopieRobocze.findIndex((kopia) => kopia.id === id); if (indeks === -1) return null; const kopia = { ...stan.kopieRobocze[indeks], ...zmiany, id, zaktualizowano: new Date().toISOString() }; stan.kopieRobocze[indeks] = kopia; zapiszStan(stan); return kopia },
  usunKopieRobocza(id) { const stan = pobierzStanRejestruDokumentow(); const kopieRobocze = stan.kopieRobocze.filter((kopia) => kopia.id !== id); if (kopieRobocze.length === stan.kopieRobocze.length) return false; zapiszStan({ ...stan, kopieRobocze }); return true },
  odswiezDostepnoscDanychZrodlowych(id, aktualnyZnacznikDanychZrodlowych) { const teraz = new Date().toISOString(); return aktualizujStan(id, (dokument) => ({ ...dokument, integralnosc: { ...dokument.integralnosc, czyDaneZrodloweNowsze: czyDokumentMaNowszeDaneZrodlowe(dokument, aktualnyZnacznikDanychZrodlowych) }, zmodyfikowano: teraz, zaktualizowano: teraz }), 'odswiezenie_zrodla') },
  pobierzHistorie: (dokumentId) => pobierzStanRejestruDokumentow().historia.filter((wpis) => !dokumentId || wpis.dokumentId === dokumentId).sort((pierwszy, drugi) => Date.parse(drugi.data) - Date.parse(pierwszy.data)),
  dodajWpisHistorii(wpis) { const stan = pobierzStanRejestruDokumentow(); const rekord: WpisHistoriiWspolnegoDokumentu = { ...wpis, id: wpis.id?.trim() || utworzId('historia'), data: wpis.data ?? new Date().toISOString() }; const istniejacy = stan.historia.find((pozycja) => pozycja.id === rekord.id); if (istniejacy) return istniejacy; stan.historia.unshift(rekord); zapiszStan(stan); return rekord },
  pobierzAutosave: (id) => pobierzStanRejestruDokumentow().autosave.find((pozycja) => pozycja.id === id) ?? null,
  zapiszAutosave(autosave) { const stan = pobierzStanRejestruDokumentow(); const rekord: AutosaveDokumentu = { ...autosave, zapisano: autosave.zapisano ?? new Date().toISOString() }; const indeks = stan.autosave.findIndex((pozycja) => pozycja.id === rekord.id); if (indeks === -1) stan.autosave.unshift(rekord); else stan.autosave[indeks] = rekord; zapiszStan(stan); return rekord },
  usunAutosave(id) { const stan = pobierzStanRejestruDokumentow(); const autosave = stan.autosave.filter((pozycja) => pozycja.id !== id); if (autosave.length === stan.autosave.length) return false; zapiszStan({ ...stan, autosave }); return true },
}
