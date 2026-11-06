import type { WersjaRoboczaGeneratora } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import { pobierzNazweOpiekuna } from '../../../moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow'
import { czyDokumentMaNowszeDaneZrodlowe, type Dokument } from '../modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../rejestrDokumentow'
import { pobierzDokumentyPowiazaneZeSzczegolami, przygotujZrodloZWersjiRoboczej, zbudujKontekstZeSzczegolow } from '../../integracje/szczegolyDoDokumentow/index'
import { oczyscNazwePliku } from '../nazwyDokumentow'

export type KonfiguracjaPakietu = {
  wersjaSchematu: 1
  kolejnosc: string[]
  wybraneId: string[]
  grupyId: string[] | null
  stronaTytulowa: boolean
  spisDokumentow: boolean
  podzialNaGrupy: boolean
  oznaczenie: boolean
  trybCertyfikatow: 'wzor' | 'wszyscy'
}
export type MetadanePakietu = { szkolenieId: string; tytul: string; klient: string; termin: string; organizator: string; opiekun: string; wersja: string }
export type StanDokumentuPakietu = { stan: 'gotowy' | 'roboczy' | 'nieaktualny' | 'bledny' | 'brak' | 'niedostepny'; komunikat: string; blokuje: boolean }
export const typyEksportowane = ['PROGRAM_SZKOLENIA', 'LISTA_OBECNOSCI', 'ANKIETA', 'CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM', 'KARTA_NA_DRZWI', 'CHECKLISTA_PACZKI']
const typyDomyslne = typyEksportowane.slice(0, 6)

export function pobierzMetadanePakietu(wersja: WersjaRoboczaGeneratora): MetadanePakietu {
  const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja))
  const daty = [...new Set(wersja.grupy.flatMap((grupa) => [grupa.dataOd, grupa.dataDo]).filter(Boolean))].sort()
  const formatuj = (data: string) => data.split('-').reverse().join('.')
  return { szkolenieId: kontekst.zrodlo.szczegolyOrganizacyjneId, tytul: wersja.dane.tytulSzkolenia, klient: wersja.dane.nazwaKlienta || kontekst.klient.nazwa || '—', termin: daty.length ? [...new Set([daty[0], daty.at(-1)!])].map(formatuj).join('–') : 'Bez terminu', organizator: wersja.dane.organizator || 'Inny', opiekun: pobierzNazweOpiekuna(wersja.dane.opiekunId), wersja: wersja.wersja }
}

export function pobierzDokumentyPakietu(wersja: WersjaRoboczaGeneratora) {
  return pobierzDokumentyPowiazaneZeSzczegolami(pobierzMetadanePakietu(wersja).szkolenieId)
}

export function utworzDomyslnaKonfiguracje(dokumenty: Dokument<unknown, unknown>[]): KonfiguracjaPakietu {
  const uporzadkowane = [...dokumenty].sort((a, b) => (a.powiazania.grupaId ?? '').localeCompare(b.powiazania.grupaId ?? '') || typyEksportowane.indexOf(a.typ) - typyEksportowane.indexOf(b.typ))
  return { wersjaSchematu: 1, kolejnosc: uporzadkowane.map((dokument) => dokument.id), wybraneId: uporzadkowane.filter((dokument) => typyDomyslne.includes(dokument.typ) && !dokument.czyZarchiwizowany).map((dokument) => dokument.id), grupyId: null, stronaTytulowa: true, spisDokumentow: true, podzialNaGrupy: true, oznaczenie: false, trybCertyfikatow: 'wzor' }
}

export function odczytajKonfiguracjePakietu(szkolenieId: string, dokumenty: Dokument<unknown, unknown>[]): KonfiguracjaPakietu {
  const zapis = repozytoriumWspolnychDokumentow.pobierzAutosave('pakiet-do-zatwierdzenia:' + szkolenieId)?.dane
  const domyslna = utworzDomyslnaKonfiguracje(dokumenty)
  if (!zapis || typeof zapis !== 'object') return domyslna
  const dane = zapis as Record<string, unknown>
  if (dane.wersjaSchematu !== 1) throw new Error('Nieobsługiwana wersja konfiguracji pakietu.')
  const lista = (wartosc: unknown): wartosc is string[] => Array.isArray(wartosc) && wartosc.every((id) => typeof id === 'string')
  if (!lista(dane.kolejnosc) || !lista(dane.wybraneId) || !(dane.grupyId === null || lista(dane.grupyId)) || !['stronaTytulowa', 'spisDokumentow', 'podzialNaGrupy', 'oznaczenie'].every((klucz) => typeof dane[klucz] === 'boolean') || !['wzor', 'wszyscy'].includes(String(dane.trybCertyfikatow))) throw new Error('Konfiguracja pakietu jest uszkodzona. Zachowano dotychczasowy zapis.')
  const konfiguracja = dane as KonfiguracjaPakietu
  return { ...konfiguracja, wybraneId: [...new Set(konfiguracja.wybraneId)], kolejnosc: [...new Set([...konfiguracja.kolejnosc, ...konfiguracja.wybraneId, ...domyslna.kolejnosc])] }
}

export function zapiszKonfiguracjePakietu(szkolenieId: string, konfiguracja: KonfiguracjaPakietu) {
  repozytoriumWspolnychDokumentow.zapiszAutosave({ id: 'pakiet-do-zatwierdzenia:' + szkolenieId, dokumentId: null, generatorId: 'pakiety_do_zatwierdzenia', dane: konfiguracja })
}

export function przeniesDokument(kolejnosc: string[], id: string, celId: string) {
  if (id === celId || !kolejnosc.includes(id) || !kolejnosc.includes(celId)) return kolejnosc
  const wynik = kolejnosc.filter((pozycja) => pozycja !== id)
  wynik.splice(kolejnosc.indexOf(celId), 0, id)
  return wynik
}

export function sprawdzStanDokumentu(dokument: Dokument<unknown, unknown> | undefined, wersja: WersjaRoboczaGeneratora): StanDokumentuPakietu {
  if (!dokument || dokument.czyUsunietyMiekko) return { stan: 'brak', komunikat: 'Brak dokumentu. Utwórz go przez istniejący mechanizm poniżej.', blokuje: true }
  if (dokument.czyZarchiwizowany || !typyEksportowane.includes(dokument.typ)) return { stan: 'niedostepny', komunikat: 'Dokument technicznie niedostępny do eksportu. Otwórz generator.', blokuje: true }
  const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja))
  if (dokument.powiazania.grupaId && !wersja.grupy.some((grupa) => grupa.id === dokument.powiazania.grupaId)) return { stan: 'bledny', komunikat: 'Grupa dokumentu nie istnieje już w szkoleniu.', blokuje: true }
  if (czyDokumentMaNowszeDaneZrodlowe(dokument, kontekst.zrodlo.odciskDanych)) return { stan: 'nieaktualny', komunikat: 'Nieaktualny względem Szczegółów organizacyjnych. Sprawdź dane w generatorze.', blokuje: true }
  return dokument.status === 'ROBOCZY' ? { stan: 'roboczy', komunikat: 'Roboczy — możliwy przegląd', blokuje: false } : { stan: 'gotowy', komunikat: 'Gotowy', blokuje: false }
}

export function przygotujPlanPakietu(wersja: WersjaRoboczaGeneratora, konfiguracja: KonfiguracjaPakietu) {
  const dokumenty = pobierzDokumentyPakietu(wersja)
  if (!konfiguracja.wybraneId.length) throw new Error('Wybierz co najmniej jeden dokument.')
  const identyfikatory = [...new Set([...konfiguracja.kolejnosc, ...konfiguracja.wybraneId])].filter((id) => konfiguracja.wybraneId.includes(id))
  return identyfikatory.map((id) => {
    const dokument = dokumenty.find((pozycja) => pozycja.id === id)
    const stan = sprawdzStanDokumentu(dokument, wersja)
    if (!dokument || stan.blokuje) throw new Error((dokument?.tytul ?? 'Wybrany dokument') + ': ' + stan.komunikat)
    if (konfiguracja.grupyId && dokument.powiazania.grupaId && !konfiguracja.grupyId.includes(dokument.powiazania.grupaId)) throw new Error('Wybrany dokument należy do grupy wyłączonej z pakietu.')
    return dokument
  })
}

// Pełny snapshot wykrywa także zapis bez podbicia numeru wersji.
export function sygnaturaZrodel(wersja: WersjaRoboczaGeneratora, konfiguracja: KonfiguracjaPakietu) {
  return JSON.stringify({ metadane: pobierzMetadanePakietu(wersja), kontekst: zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja)), konfiguracja, dokumenty: przygotujPlanPakietu(wersja, konfiguracja) })
}

export function nazwaPlikuPakietu(metadane: MetadanePakietu) {
  return oczyscNazwePliku([metadane.organizator, metadane.tytul.trim().slice(0, 75), metadane.termin, 'DO_ZATWIERDZENIA'].join('_').replace(/\s+/g, '_')).replace(/[. ]+$/g, '') + '.pdf'
}
