import type { GrupaSzkoleniowa, UczestnikGrupy } from '../typy'

type WlasciwosciPolaUczestnikowGrupy = {
  grupa: GrupaSzkoleniowa
  indeks: number
  aktualizujGrupe: (id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) => void
}

function utworzUczestnikow(grupa: GrupaSzkoleniowa, tekst: string): UczestnikGrupy[] {
  const obecniWedlugNazwy = new Map((grupa.uczestnicy ?? []).map((uczestnik) => [`${uczestnik.imie} ${uczestnik.nazwisko}`.trim().toLocaleLowerCase('pl'), uczestnik]))

  return tekst
    .split('\n')
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
    .map((nazwaPelna, indeks) => {
      const [imie = '', ...pozostaleNazwisko] = nazwaPelna.split(/\s+/)
      const nazwisko = pozostaleNazwisko.join(' ')
      const poprzedni = obecniWedlugNazwy.get(nazwaPelna.toLocaleLowerCase('pl'))

      return {
        id: poprzedni?.id ?? `${grupa.id}-uczestnik-${indeks + 1}`,
        imie,
        nazwisko,
        email: poprzedni?.email ?? '',
      }
    })
}

export default function PoleUczestnikowGrupy({ grupa, indeks, aktualizujGrupe }: WlasciwosciPolaUczestnikowGrupy) {
  const tekstUczestnikow = (grupa.uczestnicy ?? []).map((uczestnik) => `${uczestnik.imie} ${uczestnik.nazwisko}`.trim()).join('\n')

  function ustawUczestnikow(tekst: string) {
    aktualizujGrupe(
      grupa.id,
      (obecna) => {
        const uczestnicy = utworzUczestnikow(obecna, tekst)
        return { ...obecna, uczestnicy, liczbaUczestnikow: uczestnicy.length }
      },
      `grupy.${indeks}.uczestnicy`,
    )
  }

  return (
    <label className="szczegoly-pole">
      <span className="szczegoly-pole__naglowek">Uczestnicy</span>
      <textarea placeholder="Jedna osoba w każdym wierszu" rows={5} value={tekstUczestnikow} onChange={(zdarzenie) => ustawUczestnikow(zdarzenie.target.value)} />
      <span className="szczegoly-pole__pomoc">Lista uczestników jest źródłem danych dla Listy obecności.</span>
    </label>
  )
}
