import type { DokumentChecklistyPaczki, SzczegolyDoChecklisty } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { czyPozycjaJestAktywna } from '../../../dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import type { PaczkaPulpitu } from '../modele/pulpit'

export type WysylkaMonitora = PaczkaPulpitu & {
  szczegolyId: string
  checklistaId?: string
  klient: string
  grupa: string
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
    const powiazane = checklisty.filter((checklista) => !checklista.czyUsunietyMiekko && checklista.daneDokumentu.statusChecklisty !== 'ZARCHIWIZOWANA' && checklista.daneDokumentu.szczegolyOrganizacyjneId === szkolenie.id && checklista.daneDokumentu.grupaId === grupa.id)
    if (grupa.formaSzkolenia === 'Online' && !szkolenie.dane.wysylkaPaczkiDotyczy) return []
    if (!szkolenie.dane.wysylkaPaczkiDotyczy && !powiazane.length) return []
    return (powiazane.length ? powiazane : [null]).map((checklista): WysylkaMonitora => {
      const dane = checklista?.daneDokumentu
      const wymagane = dane?.pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && !pozycja.czyOnline && czyPozycjaJestAktywna(pozycja)) ?? []
      const brakujaceElementy = wymagane.filter((pozycja) => pozycja.statusGotowosci !== 'GOTOWE').map((pozycja) => pozycja.nazwa)
      const liczbaWyslanych = dane?.paczki.filter((paczka) => paczka.statusOperacyjny === 'WYSŁANA').length ?? 0
      const czyWyslana = dane ? Boolean(checklista && wyslanePaczki[checklista.id]) || (dane.paczki.length > 0 && liczbaWyslanych === dane.paczki.length) : szkolenie.dane.statusSzkolenia === 'WYSŁANA PACZKA'
      const datyPaczek = dane?.paczki.filter((paczka) => czyWyslana || paczka.statusOperacyjny !== 'WYSŁANA').map((paczka) => paczka.parametryLogistyczne.dataWyslania) ?? []
      const daty = datyPaczek.filter(czyPoprawnaDataWysylki).sort()
      // Dotychczasowy Pulpit traktuje dataWyslania checklisty jako termin planowany.
      const czyMaDatyPaczek = datyPaczek.some(Boolean)
      const planowanaDataWysylki = czyMaDatyPaczek ? daty[0] || datyPaczek.find(Boolean) || '' : dane?.dataWyslania || ''
      if (czyMaDatyPaczek && daty.length !== datyPaczek.length) brakujaceElementy.push('poprawne terminy wysyłki części paczek')
      if (dane) {
        const odbiorca = dane.daneOdbiorcy
        if ([odbiorca.imieNazwisko || odbiorca.nazwaFirmy, odbiorca.ulica, odbiorca.nrBudynku, odbiorca.kodPocztowy, odbiorca.miasto].some((wartosc) => !wartosc.trim())) brakujaceElementy.push('dane odbiorcy')
      } else brakujaceElementy.push('checklista paczki')
      let statusPrzesylki = 'Robocza'
      if (czyWyslana) statusPrzesylki = dane ? 'Wysłana' : 'Wysłana — status szkolenia'
      else if (!dane) statusPrzesylki = 'Brak checklisty'
      else if (liczbaWyslanych) statusPrzesylki = `Częściowo wysłana (${liczbaWyslanych}/${dane.paczki.length})`
      else if (dane.paczki.length && dane.paczki.every((paczka) => paczka.statusOperacyjny === 'GOTOWA')) statusPrzesylki = 'Gotowa do wysyłki'
      else if (dane.paczki.some((paczka) => paczka.statusOperacyjny === 'W_PRZYGOTOWANIU')) statusPrzesylki = 'W przygotowaniu'
      return {
        id: checklista?.id ?? `szczegoly:${szkolenie.id}:grupa:${grupa.id}`,
        szczegolyId: szkolenie.id,
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
    })
  }))
}
