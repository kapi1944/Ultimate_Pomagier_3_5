import type { DokumentChecklistyPaczki, SzczegolyDoChecklisty } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { czyDaneOdbiorcySaKompletne, czyPozycjaJestAktywna } from '../../../dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import type { PaczkaPulpitu } from '../modele/pulpit'

export type WysylkaMonitora = PaczkaPulpitu & {
  szczegolyId: string
  zrodloSzczegolowId: string
  checklistaId?: string
  klient: string
  grupa: string
  grupaId: string
  paczkaId?: string
  nazwaPaczki: string
  liczbaUczestnikow: number
  liczbaNiepotwierdzonych: number
  czyMoznaOznaczycWyslana: boolean
  statusPrzesylki: string
}

export type PilnoscWysylki = 'ZALEGLE' | 'DZISIAJ' | 'JUTRO' | 'ZA_2_3_DNI' | 'POZOSTALE' | 'WYSŁANE'
export type FiltrMonitora = 'WSZYSTKIE' | 'ZALEGLE' | 'DZISIAJ' | 'NAJBLIZSZE_3_DNI' | 'WYSŁANE'

function numerDnia(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  const dzien = new Date(data + 'T00:00:00Z')
  return Number.isNaN(dzien.getTime()) || dzien.toISOString().slice(0, 10) !== data ? null : dzien.getTime() / 86_400_000
}

export function czyPoprawnaDataWysylki(data: string) {
  return numerDnia(data) !== null
}

export function pobierzPilnoscWysylki(wysylka: WysylkaMonitora, dzisiaj: Date): PilnoscWysylki {
  if (wysylka.czyWyslana) return 'WYSŁANE'
  const termin = numerDnia(wysylka.planowanaDataWysylki)
  if (termin === null) return 'POZOSTALE'
  const roznica = termin - Date.UTC(dzisiaj.getFullYear(), dzisiaj.getMonth(), dzisiaj.getDate()) / 86_400_000
  if (roznica < 0) return 'ZALEGLE'
  if (roznica === 0) return 'DZISIAJ'
  if (roznica === 1) return 'JUTRO'
  return roznica <= 3 ? 'ZA_2_3_DNI' : 'POZOSTALE'
}

export function filtrujWysylki(wysylki: WysylkaMonitora[], filtr: FiltrMonitora, dzisiaj: Date) {
  return wysylki.filter((wysylka) => {
    const pilnosc = pobierzPilnoscWysylki(wysylka, dzisiaj)
    return filtr === 'WSZYSTKIE' || (filtr === 'NAJBLIZSZE_3_DNI' ? pilnosc === 'JUTRO' || pilnosc === 'ZA_2_3_DNI' : pilnosc === filtr)
  })
}

export function sortujWysylki(wysylki: WysylkaMonitora[], dzisiaj: Date) {
  const kolejnosc: PilnoscWysylki[] = ['ZALEGLE', 'DZISIAJ', 'JUTRO', 'ZA_2_3_DNI', 'POZOSTALE', 'WYSŁANE']
  return [...wysylki].sort((pierwsza, druga) =>
    kolejnosc.indexOf(pobierzPilnoscWysylki(pierwsza, dzisiaj)) - kolejnosc.indexOf(pobierzPilnoscWysylki(druga, dzisiaj))
    || (numerDnia(pierwsza.planowanaDataWysylki) ?? Infinity) - (numerDnia(druga.planowanaDataWysylki) ?? Infinity)
    || pierwsza.id.localeCompare(druga.id, 'pl'))
}

export function zbudujWysylkiMonitora(szczegoly: SzczegolyDoChecklisty[], checklisty: DokumentChecklistyPaczki[], wyslanePaczki: Record<string, string>): WysylkaMonitora[] {
  return szczegoly.filter((szkolenie) => szkolenie.dane.statusSzkolenia !== 'NIEZREALIZOWANE' && szkolenie.dane.status !== 'NIEZREALIZOWANE').flatMap((szkolenie) => szkolenie.grupy.flatMap((grupa) => {
    const powiazane = checklisty.filter((checklista) => !checklista.czyUsunietyMiekko && !checklista.czyZarchiwizowany && checklista.daneDokumentu.statusChecklisty !== 'ZARCHIWIZOWANA' && [szkolenie.id, szkolenie.zrodloKontekstu.szczegolyOrganizacyjneId].includes(checklista.daneDokumentu.szczegolyOrganizacyjneId ?? '') && checklista.daneDokumentu.grupaId === grupa.id)
    if (grupa.formaSzkolenia === 'Online' && !szkolenie.dane.wysylkaPaczkiDotyczy) return []
    if (!szkolenie.dane.wysylkaPaczkiDotyczy && !powiazane.length) return []
    return (powiazane.length ? powiazane : [null]).flatMap((checklista) => (checklista?.daneDokumentu.paczki.length ? checklista.daneDokumentu.paczki : [null]).map((paczka): WysylkaMonitora => {
      const dane = checklista?.daneDokumentu
      const pozycje = dane?.pozycje.filter((pozycja) => !paczka || pozycja.paczkaId === paczka.id) ?? []
      const wymagane = pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && !pozycja.czyOnline && czyPozycjaJestAktywna(pozycja))
      const brakujaceElementy = wymagane.filter((pozycja) => pozycja.statusGotowosci !== 'GOTOWE').map((pozycja) => pozycja.nazwa)
      const liczbaNiepotwierdzonych = pozycje.filter((pozycja) => pozycja.importDyspozycji?.czyIloscWymagaPotwierdzenia).length
      const konflikty = pozycje.filter((pozycja) => pozycja.importDyspozycji?.czyKonfliktReczny)
      const niepewne = pozycje.filter((pozycja) => pozycja.importDyspozycji?.dyspozycja.status === 'niepewne')
      if (liczbaNiepotwierdzonych) brakujaceElementy.push(`potwierdzenie ilości wydruków (${liczbaNiepotwierdzonych})`)
      if (konflikty.length) brakujaceElementy.push('konflikt z ręcznymi ustawieniami: ' + konflikty.map((pozycja) => pozycja.nazwa).join(', '))
      if (niepewne.length) brakujaceElementy.push('weryfikacja niejednoznacznych dyspozycji')
      // Stare potwierdzenia pozostają czytelne; nowe zapisy trafiają do paczki checklisty.
      const czyWyslana = dane ? Boolean(checklista && wyslanePaczki[checklista.id]) || paczka?.statusOperacyjny === 'WYSŁANA' : szkolenie.dane.statusSzkolenia === 'WYSŁANA PACZKA'
      const planowanaDataWysylki = paczka?.parametryLogistyczne.dataWyslania || (dane?.paczki.length === 1 ? dane.dataWyslania : '') || ''
      if (!czyDaneOdbiorcySaKompletne(dane?.daneOdbiorcy ?? { ...szkolenie.dane.odbiorcaPaczki, zrodloPropozycji: null })) brakujaceElementy.push('adres odbiorcy')
      if (!dane) brakujaceElementy.push('checklista paczki')
      let statusPrzesylki = 'Wymaga przygotowania'
      if (czyWyslana) statusPrzesylki = dane ? 'Wysłana' : 'Wysłana — status szkolenia'
      else if (liczbaNiepotwierdzonych || konflikty.length || niepewne.length) statusPrzesylki = 'Wymaga potwierdzenia'
      else if (dane && brakujaceElementy.length === 0 && (wymagane.length > 0 || paczka?.statusOperacyjny === 'GOTOWA')) statusPrzesylki = 'Gotowa do wysyłki'
      else if (paczka?.statusOperacyjny === 'W_PRZYGOTOWANIU' || paczka?.statusOperacyjny === 'GOTOWA' || wymagane.some((pozycja) => pozycja.statusGotowosci !== 'NIEGOTOWE')) statusPrzesylki = 'W trakcie kompletowania'
      return {
        id: checklista && paczka ? `${checklista.id}:paczka:${paczka.id}` : checklista?.id ?? `szczegoly:${szkolenie.id}:grupa:${grupa.id}`,
        szczegolyId: szkolenie.id,
        zrodloSzczegolowId: szkolenie.zrodloKontekstu.szczegolyOrganizacyjneId,
        grupaId: grupa.id,
        paczkaId: paczka?.id,
        nazwaPaczki: paczka?.nazwa || 'Paczka do przygotowania',
        liczbaUczestnikow: grupa.liczbaUczestnikow,
        liczbaNiepotwierdzonych,
        czyMoznaOznaczycWyslana: Boolean(paczka && dane && !['WYDRUKOWANA', 'KOMPLETNA', 'ZARCHIWIZOWANA'].includes(dane.statusChecklisty) && !dane.wersjeWydruku.length),
        checklistaId: checklista?.id,
        nazwaSzkolenia: szkolenie.dane.tytulSzkolenia || szkolenie.nazwa || 'Brak tytułu',
        klient: szkolenie.dane.nazwaKlienta || szkolenie.dane.nabywca.nazwa || 'Brak klienta',
        grupa: grupa.nazwa || 'Grupa bez nazwy',
        miasto: grupa.miejsce || (grupa.formaSzkolenia === 'Online' ? 'Online' : 'Brak lokalizacji'),
        terminySzkolenia: [grupa.dataOd, grupa.dataDo].filter((data, indeks, datyGrupy) => Boolean(data) && datyGrupy.indexOf(data) === indeks),
        trenerzy: grupa.trenerzy.map((trener) => trener.imieNazwisko),
        planowanaDataWysylki,
        wlascicielId: dane?.wysylaczId || dane?.opiekunId || szkolenie.opiekunId || checklista?.wlascicielId || '',
        liczbaGotowych: wymagane.filter((pozycja) => pozycja.statusGotowosci === 'GOTOWE').length,
        liczbaWymaganych: wymagane.length,
        brakujaceElementy,
        czyWyslana,
        statusPrzesylki,
      }
    }))
  }))
}
