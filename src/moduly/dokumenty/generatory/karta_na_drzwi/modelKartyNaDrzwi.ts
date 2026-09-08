import { WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, normalizujBlokiSwobodneDokumentu, type BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type OrientacjaKartyNaDrzwi = 'pozioma' | 'pionowa'
export type FormatKartyNaDrzwi = 'a4' | 'a5' | 'a6'
export type WariantSzablonuKartyNaDrzwi = 'oryginalny' | 'nowoczesny' | 'wlasny'
export type KluczPolaKartyNaDrzwi = 'tytulSzkolenia' | 'termin' | 'godziny' | 'miejsce' | 'sala' | 'grupa' | 'trener' | 'organizator' | 'dodatkowyTekst'
export type WidocznoscPolKartyNaDrzwi = Record<Exclude<KluczPolaKartyNaDrzwi, 'tytulSzkolenia'>, boolean>

export type KartaNaDrzwi = Record<KluczPolaKartyNaDrzwi, string> & {
  id: string; kolejnosc: number; zrodlaPol: Partial<Record<KluczPolaKartyNaDrzwi, string | null>>; nadpisaniaLokalne: Partial<Record<KluczPolaKartyNaDrzwi, boolean>>; grupaId: string | null; szczegolyOrganizacyjneId: string | null
}
export type UstawieniaSzablonuKartyNaDrzwi = { id: string; nazwa: string; wariant: WariantSzablonuKartyNaDrzwi; format: FormatKartyNaDrzwi; orientacja: OrientacjaKartyNaDrzwi; widocznoscPol: WidocznoscPolKartyNaDrzwi; blokiSwobodne: BlokSwobodnyDokumentu[]; wersjaSchematuBlokow: number; kilkaKartNaArkuszuA4: boolean }
export type WymiaryKartyNaDrzwi = { szerokoscMm: number; wysokoscMm: number }
export type UkladKartNaArkuszuA4 = WymiaryKartyNaDrzwi & { liczbaKolumn: number; liczbaWierszy: number; liczbaKart: number; szerokoscKartyMm: number; wysokoscKartyMm: number }
export type DaneKartyNaDrzwi = { wersjaSchematu: 4; zestaw: { szczegolyOrganizacyjneId: string | null; nazwaZestawu: string; kartaZaznaczonaId: string | null }; karty: KartaNaDrzwi[]; ustawieniaSzablonu: UstawieniaSzablonuKartyNaDrzwi }
export type WlasnySzablonKartyNaDrzwi = Omit<UstawieniaSzablonuKartyNaDrzwi, 'wariant'> & { wariant: 'wlasny' }

const domyslnaWidocznosc: WidocznoscPolKartyNaDrzwi = { termin: true, godziny: true, miejsce: true, sala: true, grupa: false, trener: false, organizator: true, dodatkowyTekst: true }
export const tekstPrzykladowyKartyNaDrzwi = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15
Miejsce: Sala szkoleniowa A
Ekspert merytoryczny: Jan Nowak
Opiekun szkolenia: Anna Kowalska
Telefon opiekuna: +48 501 234 567
Organizator: SEMPER
Marka: SEMPER
Dodatkowy tekst: Zapraszamy uczestników szkolenia`

function utworzId(przedrostek: string) { return globalThis.crypto?.randomUUID?.() ?? `${przedrostek}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
function klonuj<T>(wartosc: T): T { return JSON.parse(JSON.stringify(wartosc)) as T }
function blokTekstu(id: string, nazwa: string, sciezka: string, xMm: number, yMm: number, szerokoscMm: number, wysokoscMm: number, rozmiarCzcionkiPt: number): BlokSwobodnyDokumentu { return { id, nazwa, rola: 'element_staly_szablonu', typ: 'tekst', pochodzenie: 'szablon', zablokowany: false, xMm, yMm, szerokoscMm, wysokoscMm, przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 2, dane: { zrodlo: { rodzaj: 'pole_danych', sciezka, tekstZastepczy: nazwa }, rozmiarCzcionkiPt, gruboscCzcionki: 700, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek', interlinia: 1.15, kolor: '#172033', marginesWewnetrznyMm: 1 } } }

export function pobierzWymiaryKartyNaDrzwi(format: FormatKartyNaDrzwi, orientacja: OrientacjaKartyNaDrzwi): WymiaryKartyNaDrzwi {
  const wymiary: Record<FormatKartyNaDrzwi, WymiaryKartyNaDrzwi> = { a4: { szerokoscMm: 210, wysokoscMm: 297 }, a5: { szerokoscMm: 148, wysokoscMm: 210 }, a6: { szerokoscMm: 105, wysokoscMm: 148 } }
  const bazowe = wymiary[format]
  return orientacja === 'pionowa' ? bazowe : { szerokoscMm: bazowe.wysokoscMm, wysokoscMm: bazowe.szerokoscMm }
}

export function przeskalujBlokiKartyNaDrzwi(bloki: BlokSwobodnyDokumentu[], zFormat: FormatKartyNaDrzwi, zOrientacja: OrientacjaKartyNaDrzwi, naFormat: FormatKartyNaDrzwi, naOrientacja: OrientacjaKartyNaDrzwi) {
  const z = pobierzWymiaryKartyNaDrzwi(zFormat, zOrientacja)
  const na = pobierzWymiaryKartyNaDrzwi(naFormat, naOrientacja)
  const skalaX = na.szerokoscMm / z.szerokoscMm
  const skalaY = na.wysokoscMm / z.wysokoscMm
  return bloki.map((blok) => ({ ...blok, xMm: Math.round(blok.xMm * skalaX * 100) / 100, yMm: Math.round(blok.yMm * skalaY * 100) / 100, szerokoscMm: Math.round(blok.szerokoscMm * skalaX * 100) / 100, wysokoscMm: Math.round(blok.wysokoscMm * skalaY * 100) / 100 }))
}

export function pobierzUkladKartNaArkuszuA4(format: Exclude<FormatKartyNaDrzwi, 'a4'>, orientacja: OrientacjaKartyNaDrzwi): UkladKartNaArkuszuA4 {
  const wymiaryKarty = pobierzWymiaryKartyNaDrzwi(format, orientacja)
  const arkusz = pobierzWymiaryKartyNaDrzwi('a4', format === 'a5' ? (orientacja === 'pozioma' ? 'pionowa' : 'pozioma') : orientacja)
  const liczbaKolumn = Math.floor(arkusz.szerokoscMm / wymiaryKarty.szerokoscMm)
  const liczbaWierszy = Math.floor(arkusz.wysokoscMm / wymiaryKarty.wysokoscMm)
  return { ...arkusz, liczbaKolumn, liczbaWierszy, liczbaKart: liczbaKolumn * liczbaWierszy, szerokoscKartyMm: wymiaryKarty.szerokoscMm, wysokoscKartyMm: wymiaryKarty.wysokoscMm }
}

export function utworzBlokiSzablonuKartyNaDrzwi(orientacja: OrientacjaKartyNaDrzwi, wariant: WariantSzablonuKartyNaDrzwi = 'oryginalny', format: FormatKartyNaDrzwi = 'a4'): BlokSwobodnyDokumentu[] {
  const { szerokoscMm: szerokosc, wysokoscMm: wysokosc } = pobierzWymiaryKartyNaDrzwi(format, orientacja); const pozioma = orientacja === 'pozioma'; const nowoczesny = wariant === 'nowoczesny'
  const skala = Math.min(szerokosc / (pozioma ? 297 : 210), wysokosc / (pozioma ? 210 : 297))
  const wymiar = (wartosc: number) => Math.max(3, Math.round(wartosc * skala * 100) / 100)
  const y = (wartosc: number) => Math.min(Math.max(3, wymiar(wartosc)), wysokosc - 3)
  return [
    { id: 'logo', nazwa: 'Logo', rola: 'logo', typ: 'obraz', pochodzenie: 'szablon', zablokowany: false, xMm: szerokosc - wymiar(nowoczesny ? 42 : 48), yMm: y(nowoczesny ? 14 : 12), szerokoscMm: wymiar(nowoczesny ? 28 : 34), wysokoscMm: wymiar(20), przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 3, dane: { zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora', zachowajProporcje: true, trybDopasowania: 'contain' } },
    blokTekstu('tytul', 'Tytuł szkolenia', 'tytulSzkolenia', wymiar(16), y(nowoczesny ? (pozioma ? 48 : 58) : (pozioma ? 55 : 65)), szerokosc - wymiar(32), wymiar(nowoczesny ? (pozioma ? 38 : 44) : (pozioma ? 28 : 32)), wymiar(nowoczesny ? (pozioma ? 28 : 24) : (pozioma ? 24 : 21))),
    blokTekstu('sala-lokalizacja', 'Sala / lokalizacja', 'salaLokalizacja', wymiar(16), y(nowoczesny ? (pozioma ? 98 : 118) : (pozioma ? 116 : 137)), szerokosc - wymiar(32), wymiar(nowoczesny ? 18 : 14), wymiar(nowoczesny ? 17 : 13)),
    blokTekstu('termin', 'Termin i godziny', 'terminGodziny', wymiar(16), y(nowoczesny ? (pozioma ? 124 : 148) : (pozioma ? 94 : 112)), szerokosc - wymiar(32), wymiar(14), wymiar(nowoczesny ? 14 : 13)),
    blokTekstu('grupa', 'Grupa', 'grupa', wymiar(16), y(nowoczesny ? (pozioma ? 150 : 175) : (pozioma ? 150 : 178)), szerokosc - wymiar(32), wymiar(13), wymiar(12)),
    blokTekstu('trener', 'Trener', 'trener', wymiar(16), y(nowoczesny ? (pozioma ? 169 : 198) : (pozioma ? 169 : 215)), szerokosc - wymiar(32), wymiar(13), wymiar(11)),
    blokTekstu('dodatkowy-tekst', 'Dodatkowy tekst', 'dodatkowyTekst', wymiar(16), y(nowoczesny ? (pozioma ? 186 : 224) : (pozioma ? 150 : 178)), szerokosc - wymiar(32), wymiar(nowoczesny ? 22 : (pozioma ? 25 : 34)), wymiar(11)),
    blokTekstu('organizator', 'Organizator', 'organizator', wymiar(16), y(pozioma ? 196 : 268), szerokosc - wymiar(32), wymiar(10), wymiar(9)),
  ]
}
export function utworzUstawieniaBazowegoSzablonu(wariant: Exclude<WariantSzablonuKartyNaDrzwi, 'wlasny'> = 'oryginalny', orientacja: OrientacjaKartyNaDrzwi = 'pozioma', format: FormatKartyNaDrzwi = 'a4'): UstawieniaSzablonuKartyNaDrzwi { return { id: `bazowy-${wariant}`, nazwa: wariant === 'oryginalny' ? 'Oryginalny' : 'Nowoczesny', wariant, format, orientacja, widocznoscPol: wariant === 'nowoczesny' ? { ...domyslnaWidocznosc, grupa: true, trener: true } : { ...domyslnaWidocznosc }, blokiSwobodne: utworzBlokiSzablonuKartyNaDrzwi(orientacja, wariant, format), wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, kilkaKartNaArkuszuA4: false } }
export function utworzKarteNaDrzwi(wartosci: Partial<KartaNaDrzwi> = {}): KartaNaDrzwi { return { id: wartosci.id ?? utworzId('karta'), kolejnosc: wartosci.kolejnosc ?? 1, tytulSzkolenia: wartosci.tytulSzkolenia ?? 'Tytuł szkolenia', termin: wartosci.termin ?? '', godziny: wartosci.godziny ?? '', miejsce: wartosci.miejsce ?? '', sala: wartosci.sala ?? '', grupa: wartosci.grupa ?? '', trener: wartosci.trener ?? '', organizator: wartosci.organizator ?? 'SEMPER', dodatkowyTekst: wartosci.dodatkowyTekst ?? '', zrodlaPol: { ...wartosci.zrodlaPol }, nadpisaniaLokalne: { ...wartosci.nadpisaniaLokalne }, grupaId: wartosci.grupaId ?? null, szczegolyOrganizacyjneId: wartosci.szczegolyOrganizacyjneId ?? null } }
export function uporzadkujKarty(karty: KartaNaDrzwi[]) { return karty.map((karta, indeks) => ({ ...karta, kolejnosc: indeks + 1 })) }
export function utworzDomyslneDaneKartyNaDrzwi(): DaneKartyNaDrzwi { const karta = utworzKarteNaDrzwi({ ...pobierzDaneKartyNaDrzwi(tekstPrzykladowyKartyNaDrzwi), kolejnosc: 1 }); return { wersjaSchematu: 4, zestaw: { szczegolyOrganizacyjneId: null, nazwaZestawu: 'Karty na drzwi', kartaZaznaczonaId: karta.id }, karty: [karta], ustawieniaSzablonu: utworzUstawieniaBazowegoSzablonu() } }

function utworzKarteZKontekstu(kontekst: KontekstDokumentuSzkolenia, grupaId: string, opiekun = '', indeksLokalizacji = 0): KartaNaDrzwi | null {
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId); if (!grupa) return null
  const lokalizacja = grupa.lokalizacje[indeksLokalizacji] ?? grupa.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.sala || pozycja.adres || pozycja.trybOnline)
  const miejsce = lokalizacja?.trybOnline ? 'Online' : [lokalizacja?.nazwa, lokalizacja?.adres].filter(Boolean).join(', '); const sala = lokalizacja?.sala ?? ''
  const trener = (grupa.trenerzy.length ? grupa.trenerzy : kontekst.trenerzy).map((pozycja) => pozycja.imieINazwisko).join(', '); const termin = lokalizacja?.data ?? grupa.daty.join(', '); const godziny = grupa.liczbaGodzin === null ? '' : `${grupa.liczbaGodzin} godz.`; const organizator = kontekst.organizator.marka || kontekst.organizator.nazwa || 'SEMPER'
  const zrodlaPol = { tytulSzkolenia: kontekst.szkolenie.tytul, termin, godziny, miejsce, sala, grupa: grupa.nazwa, trener, organizator, dodatkowyTekst: opiekun ? `Opiekun: ${opiekun}` : '' }
  return utworzKarteNaDrzwi({ ...zrodlaPol, zrodlaPol, grupaId: grupa.id, szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId })
}
export function utworzDaneKartyNaDrzwiZKontekstu(kontekst: KontekstDokumentuSzkolenia, grupaId: string, opiekun = ''): DaneKartyNaDrzwi | null { const karta = utworzKarteZKontekstu(kontekst, grupaId, opiekun); return karta ? { wersjaSchematu: 4, zestaw: { szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId, nazwaZestawu: `Karty — ${karta.tytulSzkolenia}`, kartaZaznaczonaId: karta.id }, karty: [karta], ustawieniaSzablonu: utworzUstawieniaBazowegoSzablonu() } : null }
export function utworzKartyZGrupISal(kontekst: KontekstDokumentuSzkolenia, opiekun = ''): KartaNaDrzwi[] { const klucze = new Set<string>(); return uporzadkujKarty(kontekst.grupy.flatMap((grupa) => (grupa.lokalizacje.length ? grupa.lokalizacje : [null]).flatMap((lokalizacja, indeks) => { const karta = utworzKarteZKontekstu(kontekst, grupa.id, opiekun, indeks); const klucz = [grupa.id, lokalizacja?.data ?? karta?.termin, lokalizacja?.sala ?? '', lokalizacja?.nazwa ?? '', lokalizacja?.adres ?? ''].join('|'); if (!karta || klucze.has(klucz)) return []; klucze.add(klucz); return [karta] }))) }
export function zduplikujKarteNaDrzwi(karta: KartaNaDrzwi): KartaNaDrzwi { return utworzKarteNaDrzwi({ ...klonuj(karta), id: utworzId('karta'), kolejnosc: karta.kolejnosc + 1 }) }
export function zmienPoleKartyLokalnie(karta: KartaNaDrzwi, pole: KluczPolaKartyNaDrzwi, wartosc: string): KartaNaDrzwi { return { ...karta, [pole]: wartosc, nadpisaniaLokalne: { ...karta.nadpisaniaLokalne, [pole]: karta.zrodlaPol[pole] !== undefined && karta.zrodlaPol[pole] !== null && wartosc !== karta.zrodlaPol[pole] } } }
export function przywrocPoleKartyZeZrodla(karta: KartaNaDrzwi, pole: KluczPolaKartyNaDrzwi): KartaNaDrzwi { const zrodlo = karta.zrodlaPol[pole]; return zrodlo === undefined || zrodlo === null ? karta : { ...karta, [pole]: zrodlo, nadpisaniaLokalne: { ...karta.nadpisaniaLokalne, [pole]: false } } }
export function pobierzDaneRenderowaniaKarty(karta: KartaNaDrzwi, widocznosc: WidocznoscPolKartyNaDrzwi = domyslnaWidocznosc) { return { ...karta, salaLokalizacja: [widocznosc.sala && karta.sala, widocznosc.miejsce && karta.miejsce].filter(Boolean).join(' · '), terminGodziny: [widocznosc.termin && karta.termin, widocznosc.godziny && karta.godziny].filter(Boolean).join(' · ') } }
export function obliczRozmiarTytuluKarty(tytul: string, docelowyPt: number, minimalnyPt = 12, pojemnoscZnakow = 54, parametry?: { szerokoscMm: number; wysokoscMm: number; interlinia?: number }) {
  if (!parametry) return Math.max(minimalnyPt, Math.round(Math.min(docelowyPt, docelowyPt * Math.sqrt(pojemnoscZnakow / Math.max(tytul.trim().length, 1)))))
  const interlinia = parametry.interlinia ?? 1.15
  for (let rozmiar = Math.round(docelowyPt); rozmiar >= minimalnyPt; rozmiar -= 1) {
    const znakiNaWiersz = Math.max(1, Math.floor(parametry.szerokoscMm / (rozmiar * 0.1764)))
    const liczbaWierszy = Math.max(1, Math.ceil(tytul.trim().length / znakiNaWiersz))
    const wysokoscTekstuMm = liczbaWierszy * rozmiar * 0.3528 * interlinia
    if (wysokoscTekstuMm <= parametry.wysokoscMm) return rozmiar
  }
  return minimalnyPt
}
export function serializujDaneKartyNaDrzwi(dane: DaneKartyNaDrzwi) { return JSON.stringify(dane) }
export function deserializujDaneKartyNaDrzwi(zapis: string | null): DaneKartyNaDrzwi {
  const domyslne = utworzDomyslneDaneKartyNaDrzwi(); if (!zapis?.trim()) return domyslne
  try { const rekord = JSON.parse(zapis) as Record<string, unknown>; if (Array.isArray(rekord.karty) && rekord.ustawieniaSzablonu && rekord.zestaw) { const suroweUstawienia = rekord.ustawieniaSzablonu as Record<string, unknown>; const orientacja = suroweUstawienia.orientacja === 'pionowa' ? 'pionowa' : 'pozioma'; const format = suroweUstawienia.format === 'a5' || suroweUstawienia.format === 'a6' ? suroweUstawienia.format : 'a4'; const wariant = suroweUstawienia.wariant === 'nowoczesny' || suroweUstawienia.wariant === 'wlasny' ? suroweUstawienia.wariant : 'oryginalny'; const baza = wariant === 'wlasny' ? utworzUstawieniaBazowegoSzablonu('oryginalny', orientacja, format) : utworzUstawieniaBazowegoSzablonu(wariant, orientacja, format); const karty = uporzadkujKarty(rekord.karty.filter((karta): karta is Record<string, unknown> => Boolean(karta && typeof karta === 'object')).map((karta, indeks) => utworzKarteNaDrzwi({ ...(karta as Partial<KartaNaDrzwi>), id: typeof karta.id === 'string' ? karta.id : undefined, kolejnosc: indeks + 1, zrodlaPol: typeof karta.zrodlaPol === 'object' && karta.zrodlaPol ? karta.zrodlaPol as KartaNaDrzwi['zrodlaPol'] : {}, nadpisaniaLokalne: typeof karta.nadpisaniaLokalne === 'object' && karta.nadpisaniaLokalne ? karta.nadpisaniaLokalne as KartaNaDrzwi['nadpisaniaLokalne'] : {} }))); const zestaw = rekord.zestaw as Record<string, unknown>; const stareBloki = normalizujBlokiSwobodneDokumentu(suroweUstawienia.blokiSwobodne); const blokiSwobodne = stareBloki.length ? (rekord.wersjaSchematu === 4 ? stareBloki : przeskalujBlokiKartyNaDrzwi(stareBloki, 'a4', orientacja, format, orientacja)) : baza.blokiSwobodne; return { wersjaSchematu: 4, zestaw: { szczegolyOrganizacyjneId: typeof zestaw.szczegolyOrganizacyjneId === 'string' ? zestaw.szczegolyOrganizacyjneId : null, nazwaZestawu: typeof zestaw.nazwaZestawu === 'string' ? zestaw.nazwaZestawu : 'Karty na drzwi', kartaZaznaczonaId: typeof zestaw.kartaZaznaczonaId === 'string' ? zestaw.kartaZaznaczonaId : karty[0]?.id ?? null }, karty: karty.length ? karty : [utworzKarteNaDrzwi()], ustawieniaSzablonu: { ...baza, id: typeof suroweUstawienia.id === 'string' ? suroweUstawienia.id : baza.id, nazwa: typeof suroweUstawienia.nazwa === 'string' ? suroweUstawienia.nazwa : baza.nazwa, wariant, format, orientacja, widocznoscPol: { ...baza.widocznoscPol, ...(typeof suroweUstawienia.widocznoscPol === 'object' && suroweUstawienia.widocznoscPol ? suroweUstawienia.widocznoscPol as Partial<WidocznoscPolKartyNaDrzwi> : {}) }, blokiSwobodne, kilkaKartNaArkuszuA4: suroweUstawienia.kilkaKartNaArkuszuA4 === true } } }
    const orientacja = rekord.orientacja === 'pionowa' ? 'pionowa' : 'pozioma'; const daneWejsciowe = typeof rekord.daneWejsciowe === 'string' ? rekord.daneWejsciowe : zapis; const pola = pobierzDaneKartyNaDrzwi(daneWejsciowe); const karta = utworzKarteNaDrzwi({ ...pola, zrodlaPol: { ...pola }, grupaId: typeof rekord.grupaId === 'string' ? rekord.grupaId : null, szczegolyOrganizacyjneId: typeof rekord.szczegolyOrganizacyjneId === 'string' ? rekord.szczegolyOrganizacyjneId : null }); const baza = utworzUstawieniaBazowegoSzablonu('oryginalny', orientacja); return { wersjaSchematu: 4, zestaw: { szczegolyOrganizacyjneId: karta.szczegolyOrganizacyjneId, nazwaZestawu: `Karty — ${karta.tytulSzkolenia}`, kartaZaznaczonaId: karta.id }, karty: [karta], ustawieniaSzablonu: { ...baza, blokiSwobodne: normalizujBlokiSwobodneDokumentu(rekord.blokiSwobodne).length ? normalizujBlokiSwobodneDokumentu(rekord.blokiSwobodne) : baza.blokiSwobodne } }
  } catch { return { ...domyslne, karty: [utworzKarteNaDrzwi({ ...pobierzDaneKartyNaDrzwi(zapis) })] } }
}
export function pobierzDaneKartyNaDrzwi(tekst: string) { const pobierz = (etykieta: string) => tekst.split('\n').find((wiersz) => wiersz.toLocaleLowerCase('pl').startsWith(`${etykieta.toLocaleLowerCase('pl')}:`))?.split(':').slice(1).join(':').trim() ?? ''; const ekspert = pobierz('Ekspert merytoryczny'); const opiekun = pobierz('Opiekun szkolenia'); const telefon = pobierz('Telefon opiekuna'); const marka = pobierz('Marka') || pobierz('Organizator') || 'SEMPER'; return { tytulSzkolenia: pobierz('Tytuł szkolenia') || 'Tytuł szkolenia', termin: pobierz('Data') || '', godziny: pobierz('Godziny'), miejsce: pobierz('Miejsce') || '', sala: pobierz('Sala'), grupa: pobierz('Grupa'), trener: ekspert, dodatkowyTekst: pobierz('Dodatkowy tekst') || [ekspert && `Ekspert: ${ekspert}`, opiekun && `Opiekun: ${opiekun}`, telefon].filter(Boolean).join('\n'), organizator: pobierz('Organizator') || marka, marka } }
