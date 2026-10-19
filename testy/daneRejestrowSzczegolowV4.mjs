import { poczatkoweDaneFormularza, poczatkowiAdresaci, utworzPoczatkowaGrupe } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'

export function utworzDaneRejestrowV4(opiekunId, autorId) {
  const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Szkolenie rejestru V4', nazwaKlienta: 'Klient rejestru V4', opiekunId, status: 'PEŁNE' }
  const grupy = [1, 2, 3].map((numer) => ({ ...utworzPoczatkowaGrupe(numer), id: `grupa-v4-${numer}`, nazwa: `Grupa ${numer}`, trenerzy: [{ id: 'trener-v4-1', imieNazwisko: 'Trener Pierwszy', telefon: '', email: '' }, { id: `trener-v4-${numer + 1}`, imieNazwisko: `Trener grupy ${numer}`, telefon: '', email: '' }] }))
  const kopia = { id: 'kopia-v4-1', dokumentId: 'dokument-v4-1', wersja: 'test-v4', etykietaWersji: '2026-10-19 v1', nazwa: '[Kopia robocza] Szkic testowy V4', dataZapisu: '2026-10-19T10:15:00.000Z', autorId, autorNazwa: 'Autor testowy V4', dane, grupy, adresaci: structuredClone(poczatkowiAdresaci), statusyPol: { tytulSzkolenia: 'niepewne' } }
  const opublikowane = ['OCZEKUJĄCE', 'ZAAKCEPTOWANE', 'GOTOWE', 'NIEZREALIZOWANE', 'ROZLICZONE'].map((status, indeks) => ({
    ...structuredClone(kopia), id: `dokument-v4-${indeks + 1}`, nazwa: `Dokument opublikowany V4 ${indeks + 1}`, opiekunId,
    dane: { ...structuredClone(dane), tytulSzkolenia: `Szkolenie opublikowane V4 ${indeks + 1}`, status },
    status, statusSzkolenia: indeks === 3 ? 'NIEZREALIZOWANE' : 'W PRZYGOTOWANIACH',
    numerWersji: indeks + 2, dataPublikacji: '2026-10-18T08:30:00.000Z', dataPierwszejPublikacji: '2026-10-17T07:00:00.000Z', dataOstatniejPublikacji: '2026-10-18T08:30:00.000Z', zrodloKopiiRoboczejId: kopia.id,
  }))
  const kopie = [kopia, { ...structuredClone(kopia), id: 'kopia-v4-2', dokumentId: 'dokument-v4-2', nazwa: 'Szkic aktualizacji V4', dane: { ...structuredClone(dane), status: 'NIEPEŁNE' }, zrodloOpublikowanegoId: 'dokument-v4-2', bazowaWersjaOpublikowana: 1 }]
  return { kopie, opublikowane }
}
