import { poczatkowaGrupa, poczatkoweDaneFormularza, poczatkowiAdresaci } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import type { DaneFormularza, WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
function klonuj<TDane>(dane: TDane): TDane {
  return JSON.parse(JSON.stringify(dane)) as TDane
}

export function utworzWersjeTestowa(czyZGrupa = true, liczbaGrup = 1): WersjaRoboczaGeneratora {
  const dane = klonuj(poczatkoweDaneFormularza) as DaneFormularza
  dane.tytulSzkolenia = 'Pomoc publiczna — ą ć ę ł ń ó ś ź ż'
  dane.nazwaKlienta = 'Klient Testowy'
  dane.nabywca.nazwa = 'Klient Testowy'
  dane.opiekunId = 'opiekun-1'
  dane.programSzkolenia = 'Dzień 1\nModuł 1. Wprowadzenie\n- Zasady bezpieczeństwa'
  dane.wysylkaPaczkiDotyczy = true
  dane.odbiorcaPaczki = { ...dane.odbiorcaPaczki, imieNazwisko: 'Anna Odbiorca', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa' }
  const grupa = {
    ...klonuj(poczatkowaGrupa),
    id: 'grupa-a',
    nazwa: 'Grupa A',
    dataOd: '2026-09-15',
    dataDo: '2026-09-16',
    liczbaUczestnikow: 2,
    liczbaGodzin: 16,
    miejsce: 'Sala 7, Warszawa',
    trenerzy: [{ id: 'trener-1', imieNazwisko: 'Jan Trener', telefon: '', email: '' }],
    uczestnicy: [
      { id: 'uczestnik-1', imie: 'Anna', nazwisko: 'Nowak', email: 'anna@example.com' },
      { id: 'uczestnik-2', imie: 'Piotr', nazwisko: 'Lis', email: 'piotr@example.com' },
    ],
  }
  const drugaGrupa = {
    ...klonuj(grupa),
    id: 'grupa-b',
    nazwa: 'Grupa B',
    dataOd: '2026-09-17',
    dataDo: '2026-09-18',
    miejsce: 'Sala 8, Kraków',
    trenerzy: [{ id: 'trener-2', imieNazwisko: 'Ewa Trener', telefon: '', email: '' }],
    uczestnicy: [
      { id: 'uczestnik-3', imie: 'Ola', nazwisko: 'Kowalska', email: 'ola@example.com' },
      { id: 'uczestnik-4', imie: 'Marek', nazwisko: 'Wilk', email: 'marek@example.com' },
    ],
  }

  return {
    id: 'szczegoly-1',
    dokumentId: 'szczegoly-1',
    wersja: 'test',
    etykietaWersji: 'v1',
    nazwa: 'Szczegóły testowe',
    dataZapisu: '2026-09-10T10:00:00.000Z',
    autorId: 'uzytkownik-1',
    autorNazwa: 'Użytkownik Testowy',
    dane,
    grupy: czyZGrupa ? [grupa, ...(liczbaGrup > 1 ? [drugaGrupa] : [])] : [],
    adresaci: klonuj(poczatkowiAdresaci),
    statusyPol: {},
  }
}
