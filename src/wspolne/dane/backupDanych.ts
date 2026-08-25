export type KategoriaBackupu = 'DOKUMENTY' | 'SZCZEGOLY_ORGANIZACYJNE' | 'PROGRAMY' | 'PULPIT_I_ZADANIA' | 'KARTOTEKI' | 'USTAWIENIA' | 'WSZYSTKO'
export type RodzajKopiiLokalnej = 'AUTOMATYCZNA' | 'PRZED_OPERACJA'

export const wersjaFormatuBackupu = 1
export const kluczOstatniegoPelnegoBackupu = 'ultimatePomagier.backup.ostatniPelny.v1'
const prefiksKopiiLokalnej = 'ultimatePomagier.backup.lokalny.v1.'
const kluczIndeksuKopiiLokalnych = `${prefiksKopiiLokalnej}indeks`

type ManifestBackupu = {
  wersjaFormatu: number
  utworzono: string
  wersjaAplikacji: string
  sekcje: Record<string, string[]>
  liczbaRekordow: Record<string, number>
  schematy: Record<string, string | number | null>
  sumaKontrolna: string
}

export type BackupDanych = { manifest: ManifestBackupu; dane: Record<string, string> }
export type WynikWalidacjiBackupu = { poprawny: boolean; backup: BackupDanych | null; blad: string | null }

const kluczeDokumentow = [
  'ultimatePomagier.rejestrDokumentow.v1', 'ultimatePomagier.dokumenty.wspolne.v1', 'ultimatePomagier.dokumenty.historiaEksportow.v1', 'ultimatePomagier.kopieRobocze',
  'ultimate-pomagier.listy-obecnosci.szkic', 'ultimate-pomagier.listy-obecnosci.szkic.dokumentId', 'ultimate-pomagier.ankiety.szkic', 'ultimate-pomagier.ankiety.szkic.dokumentId',
  'ultimate-pomagier.karta-na-drzwi.szkic', 'ultimate-pomagier.karta-na-drzwi.szkic.dokumentId', 'ultimate-pomagier.dyplomy.generator-pawla', 'ultimate-pomagier.dyplomy.generator-pawla.dokumentId',
  'ultimate-pomagier.log-wymuszen-eksportu',
]
const kluczeSzczegolow = ['ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja', 'ultimatePomagier.szczegolyOrganizacyjne.opublikowane', 'ultimatePomagier.szczegolyOrganizacyjne.autosave', 'ultimatePomagier.szczegolyOrganizacyjne.historia', 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze']
const kluczeProgramow = ['ultimate-pomagier-program-szkolenia-roboczy', 'ultimatePomagier.programySzkolen.autosave.v1', 'ultimatePomagier.programySzkolen.aktywnaKopiaRobocza', 'ultimatePomagier.programySzkolen.kopieRobocze.wspolnyMagazyn.v1']
const kluczePulpitu = ['ultimatePomagier.pulpit.v1']
const kluczeKartotek = ['ultimatePomagier.uzytkownicy.v1', 'ultimate-pomagier.kartoteki.trenerzy', 'ultimate-pomagier.kartoteki.klienci', 'ultimate-pomagier.kartoteki.lokalizacje', 'ultimate-pomagier.kartoteki.szablony-dokumentow']
const kluczeUstawien = ['ultimatePomagier.ustawieniaAplikacji.v1', 'ultimatePomagier.menuPrzypiete', 'ultimatePomagier.menuWysuwanieZKrawedzi', 'ultimatePomagier.panelJakosciPrzypiety', 'ultimatePomagier.panelJakosciWysuwanieZKrawedzi', 'ultimate-pomagier.dyplomy.panel-ustawien-przypiety', 'ultimate-pomagier.dyplomy.panel-ustawien-wysuwanie', 'ultimate-pomagier-aktywny-widok']

function unikalne(wartosci: string[]) { return [...new Set(wartosci)] }
function wszystkieKluczeStorage() { const klucze: string[] = []; for (let indeks = 0; indeks < localStorage.length; indeks += 1) { const klucz = localStorage.key(indeks); if (klucz) klucze.push(klucz) } return klucze }
function kluczeDynamiczne() { return wszystkieKluczeStorage().filter((klucz) => (klucz.startsWith('ultimatePomagier.menuDrzewo.v1.') || klucz.startsWith('ultimatePomagier.migracjaDokumentow.kopia.')) && !klucz.startsWith(prefiksKopiiLokalnej)) }
function nazwaSekcji(kategoria: KategoriaBackupu) { return kategoria === 'WSZYSTKO' ? 'Wszystko' : kategoria }

export function pobierzKluczeKategorii(kategoria: KategoriaBackupu): string[] {
  const sekcje: Record<Exclude<KategoriaBackupu, 'WSZYSTKO'>, string[]> = { DOKUMENTY: kluczeDokumentow, SZCZEGOLY_ORGANIZACYJNE: kluczeSzczegolow, PROGRAMY: kluczeProgramow, PULPIT_I_ZADANIA: kluczePulpitu, KARTOTEKI: kluczeKartotek, USTAWIENIA: [...kluczeUstawien, ...kluczeDynamiczne()] }
  return kategoria === 'WSZYSTKO' ? unikalne([...Object.values(sekcje).flat(), ...wszystkieKluczeStorage().filter((klucz) => !klucz.startsWith(prefiksKopiiLokalnej) && klucz !== kluczOstatniegoPelnegoBackupu && klucz !== 'ultimatePomagier.sesjaUzytkownika.v1' && klucz !== 'ultimate-pomagier.zalogowany-uzytkownik' && klucz !== 'ultimate-pomagier.aktywna-rola')]) : unikalne(sekcje[kategoria])
}

function stabilnyTekst(dane: Record<string, string>) { return Object.keys(dane).sort().map((klucz) => `${klucz.length}:${klucz}${dane[klucz].length}:${dane[klucz]}`).join('|') }
function sumaKontrolna(dane: Record<string, string>) { let suma = 2166136261; for (const znak of stabilnyTekst(dane)) { suma ^= znak.charCodeAt(0); suma = Math.imul(suma, 16777619) } return (suma >>> 0).toString(16).padStart(8, '0') }
function liczbaRekordow(wartosc: string) { try { const odczyt = JSON.parse(wartosc) as unknown; if (Array.isArray(odczyt)) return odczyt.length; if (odczyt && typeof odczyt === 'object' && Array.isArray((odczyt as { dokumenty?: unknown[] }).dokumenty)) return (odczyt as { dokumenty: unknown[] }).dokumenty.length; return 1 } catch { return 1 } }

export function utworzBackup(kategorie: KategoriaBackupu[] = ['WSZYSTKO']): BackupDanych {
  const czyPelny = kategorie.includes('WSZYSTKO')
  const wybrane: KategoriaBackupu[] = czyPelny ? ['DOKUMENTY', 'SZCZEGOLY_ORGANIZACYJNE', 'PROGRAMY', 'PULPIT_I_ZADANIA', 'KARTOTEKI', 'USTAWIENIA'] : unikalne(kategorie) as KategoriaBackupu[]
  const dane: Record<string, string> = {}
  const sekcje: Record<string, string[]> = {}
  const liczba: Record<string, number> = {}
  wybrane.forEach((kategoria) => {
    const klucze = pobierzKluczeKategorii(kategoria).filter((klucz) => localStorage.getItem(klucz) !== null)
    sekcje[nazwaSekcji(kategoria)] = klucze
    liczba[nazwaSekcji(kategoria)] = klucze.reduce((suma, klucz) => suma + liczbaRekordow(localStorage.getItem(klucz)!), 0)
    klucze.forEach((klucz) => { dane[klucz] = localStorage.getItem(klucz)! })
  })
  const backup: BackupDanych = { manifest: { wersjaFormatu: wersjaFormatuBackupu, utworzono: new Date().toISOString(), wersjaAplikacji: 'ultimate-pomagier-3.5', sekcje, liczbaRekordow: liczba, schematy: { rejestrDokumentow: 3, backup: wersjaFormatuBackupu }, sumaKontrolna: sumaKontrolna(dane) }, dane }
  if (czyPelny) localStorage.setItem(kluczOstatniegoPelnegoBackupu, backup.manifest.utworzono)
  return backup
}

export function serializujBackup(backup: BackupDanych) { return JSON.stringify(backup) }
export function sprawdzBackup(tekst: string): WynikWalidacjiBackupu {
  let odczyt: unknown
  try { odczyt = JSON.parse(tekst) as unknown } catch { return { poprawny: false, backup: null, blad: 'Plik backupu nie jest poprawnym JSON-em.' } }
  if (!odczyt || typeof odczyt !== 'object' || !('manifest' in odczyt) || !('dane' in odczyt)) return { poprawny: false, backup: null, blad: 'Backup nie ma wymaganego manifestu.' }
  const backup = odczyt as BackupDanych
  if (backup.manifest?.wersjaFormatu !== wersjaFormatuBackupu) return { poprawny: false, backup: null, blad: 'Wersja formatu backupu nie jest obsługiwana.' }
  if (!backup.dane || typeof backup.dane !== 'object' || Object.values(backup.dane).some((wartosc) => typeof wartosc !== 'string')) return { poprawny: false, backup: null, blad: 'Backup zawiera niepoprawne dane.' }
  if (backup.manifest.sumaKontrolna !== sumaKontrolna(backup.dane)) return { poprawny: false, backup: null, blad: 'Suma kontrolna backupu jest niepoprawna.' }
  return { poprawny: true, backup, blad: null }
}

function pobierzIndeksKopii() { try { const wartosc = JSON.parse(localStorage.getItem(kluczIndeksuKopiiLokalnych) ?? '[]') as unknown; return Array.isArray(wartosc) ? wartosc.filter((pozycja): pozycja is { klucz: string; data: string; rodzaj: RodzajKopiiLokalnej } => Boolean(pozycja && typeof pozycja === 'object' && typeof (pozycja as { klucz?: unknown }).klucz === 'string' && typeof (pozycja as { data?: unknown }).data === 'string')) : [] } catch { return [] } }
function zapiszIndeksKopii(indeks: Array<{ klucz: string; data: string; rodzaj: RodzajKopiiLokalnej }>) { localStorage.setItem(kluczIndeksuKopiiLokalnych, JSON.stringify(indeks)) }

export function utworzKopieLokalnaPrzedOperacja(rodzaj: RodzajKopiiLokalnej, kategorie: KategoriaBackupu[] = ['WSZYSTKO']) {
  const backup = utworzBackup(kategorie)
  const klucz = `${prefiksKopiiLokalnej}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(klucz, serializujBackup(backup))
  if (!sprawdzBackup(localStorage.getItem(klucz) ?? '').poprawny) { localStorage.removeItem(klucz); throw new Error('Nie udało się zweryfikować lokalnej kopii bezpieczeństwa.') }
  const indeks = [...pobierzIndeksKopii(), { klucz, data: backup.manifest.utworzono, rodzaj }].sort((pierwsza, druga) => Date.parse(druga.data) - Date.parse(pierwsza.data))
  indeks.slice(3).forEach((pozycja) => localStorage.removeItem(pozycja.klucz))
  zapiszIndeksKopii(indeks.slice(0, 3))
  return { klucz, backup }
}

export function pobierzDateOstatniegoPelnegoBackupu() { return localStorage.getItem(kluczOstatniegoPelnegoBackupu) }
export function czyNalezyPrzypomniecOPelnymBackupu(teraz = new Date()) { const data = pobierzDateOstatniegoPelnegoBackupu(); return !data || Number.isNaN(Date.parse(data)) || teraz.getTime() - Date.parse(data) >= 30 * 24 * 60 * 60 * 1000 }

function kluczeDoOdtworzenia(backup: BackupDanych, kategorie: KategoriaBackupu[]) { const nazwy = kategorie.includes('WSZYSTKO') ? Object.keys(backup.manifest.sekcje) : kategorie.map(nazwaSekcji); return unikalne(nazwy.flatMap((nazwa) => backup.manifest.sekcje[nazwa] ?? [])) }
export function przywrocBackup(backup: BackupDanych, kategorie: KategoriaBackupu[] = ['WSZYSTKO']) {
  const sprawdzenie = sprawdzBackup(serializujBackup(backup)); if (!sprawdzenie.poprawny) throw new Error(sprawdzenie.blad ?? 'Niepoprawny backup.')
  const kopiaPrzedRestore = utworzKopieLokalnaPrzedOperacja('PRZED_OPERACJA', kategorie)
  const klucze = kluczeDoOdtworzenia(backup, kategorie)
  if (!klucze.length) throw new Error('Wybrany backup nie zawiera wskazanej sekcji do przywrócenia.')
  const kluczeDoUsuniecia = unikalne(kategorie.flatMap((kategoria) => pobierzKluczeKategorii(kategoria)))
  const kluczeTransakcji = unikalne([...klucze, ...kluczeDoUsuniecia])
  const stanPrzed: Record<string, string | null> = Object.fromEntries(kluczeTransakcji.map((klucz) => [klucz, localStorage.getItem(klucz)]))
  try {
    kluczeDoUsuniecia.forEach((klucz) => localStorage.removeItem(klucz))
    klucze.forEach((klucz) => localStorage.setItem(klucz, backup.dane[klucz]))
    const poZapisie = Object.fromEntries(klucze.map((klucz) => [klucz, localStorage.getItem(klucz)]))
    if (JSON.stringify(poZapisie) !== JSON.stringify(Object.fromEntries(klucze.map((klucz) => [klucz, backup.dane[klucz]])))) throw new Error('Weryfikacja zapisu restore nie powiodła się.')
    return { kopiaPrzedRestore, przywroconeKlucze: klucze }
  } catch (blad) {
    kluczeTransakcji.forEach((klucz) => localStorage.removeItem(klucz))
    Object.entries(stanPrzed).forEach(([klucz, wartosc]) => { if (wartosc !== null) localStorage.setItem(klucz, wartosc) })
    throw blad
  }
}
