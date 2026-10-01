import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type DaneSeryjnychDyplomow = {
  tytulSzkolenia: string
  trybSzkolenia: 'stacjonarne' | 'online'
  miejsceSzkolenia: string
  trener: string
  liczbaGodzin: string | null
  daty: string[]
  uczestnicy: string[]
  organizator: 'SEMPER' | 'IIST'
}

export function zbudujDaneSeryjnychDyplomow(kontekst: KontekstDokumentuSzkolenia, grupaId: string): DaneSeryjnychDyplomow | null {
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId)
  if (!grupa) return null
  const lokalizacja = grupa.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.sala || pozycja.adres || pozycja.trybOnline)
  const nazwaOrganizatora = `${kontekst.organizator.marka ?? ''} ${kontekst.organizator.nazwa ?? ''}`.toLocaleUpperCase('pl')
  return {
    tytulSzkolenia: kontekst.szkolenie.tytul,
    trybSzkolenia: grupa.tryb?.toLocaleLowerCase('pl').includes('online') ? 'online' : 'stacjonarne',
    miejsceSzkolenia: lokalizacja?.trybOnline ? 'Online' : [lokalizacja?.nazwa, lokalizacja?.sala, lokalizacja?.adres].filter(Boolean).join(', '),
    trener: (grupa.trenerzy.length ? grupa.trenerzy : kontekst.trenerzy).map((trener) => trener.imieINazwisko).join(', '),
    liczbaGodzin: grupa.liczbaGodzin === null ? null : String(grupa.liczbaGodzin),
    daty: [...grupa.daty],
    uczestnicy: grupa.uczestnicy.filter((uczestnik, indeks, wszyscy) => wszyscy.findIndex((pozycja) => pozycja.id === uczestnik.id) === indeks).map((uczestnik) => uczestnik.nazwaPelna.trim()).filter(Boolean),
    organizator: nazwaOrganizatora.includes('IIST') ? 'IIST' : 'SEMPER',
  }
}

export function parsujListeUczestnikow(wartosc: string) {
  return [...new Set(wartosc.split(/\r?\n/).map((wiersz) => wiersz.split(/\t|;/)[0].trim()).filter(Boolean))]
}

export function polaczUczestnikowPoNazwie<Uczestnik extends { imieNazwisko: string }>(
  nazwy: string[], obecni: Uczestnik[], utworz: (nazwa: string, indeks: number) => Uczestnik,
) {
  const dostepni = [...obecni]
  return nazwy.map((nazwa, indeks) => {
    const indeksObecnego = dostepni.findIndex((uczestnik) => uczestnik.imieNazwisko === nazwa)
    return indeksObecnego >= 0 ? dostepni.splice(indeksObecnego, 1)[0] : utworz(nazwa, indeks)
  })
}

export function sprawdzDaneDyplomu(dane: {
  uczestnicy: Array<{ imieNazwisko: string; numerRejestru: string }>
  tytulSzkolenia: string; wybraneDaty: string[]; liczbaGodzin: string
  trener: string; trybSzkolenia: 'online' | 'stacjonarne'; miejsceSzkolenia: string
}) {
  const problemy: string[] = []
  const uczestnicy = dane.uczestnicy.filter((uczestnik) => uczestnik.imieNazwisko.trim())

  if (!uczestnicy.length) {
    problemy.push('dodaj co najmniej jednego uczestnika')
  }

  if (!dane.tytulSzkolenia.trim()) {
    problemy.push('uzupełnij tytuł szkolenia')
  }

  if (!dane.wybraneDaty.length) {
    problemy.push('wybierz termin szkolenia')
  }

  if (!Number.isFinite(Number(dane.liczbaGodzin)) || Number(dane.liczbaGodzin) <= 0) {
    problemy.push('uzupełnij liczbę godzin')
  }

  if (!dane.trener.trim()) {
    problemy.push('uzupełnij eksperta / trenera')
  }

  if (dane.trybSzkolenia !== 'online' && !dane.miejsceSzkolenia.trim()) {
    problemy.push('uzupełnij miejsce szkolenia')
  }

  const brakiNumerow = uczestnicy.filter((uczestnik) => !uczestnik.numerRejestru.trim()).length

  if (brakiNumerow) {
    problemy.push(
      brakiNumerow === 1
        ? 'uzupełnij numer rejestru dla 1 uczestnika'
        : `uzupełnij numer rejestru dla ${brakiNumerow} uczestników`,
    )
  }

  return problemy
}
