import type { GrupaSzkoleniowa, UczestnikGrupy } from '../typy'
import { pobierzIdBleduPola } from './identyfikatoryPol'
import { ZnacznikBleduPola } from './PolaSzczegolow'
import { useBladPola } from './stanBledowPol'

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
  const poleLiczbyUczestnikow = `grupy.${indeks}.liczbaUczestnikow`
  const blad = useBladPola(poleLiczbyUczestnikow)

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
      <span className="szczegoly-pole__naglowek"><span className="szczegoly-pole__etykieta">Uczestnicy<ZnacznikBleduPola blad={blad} /></span></span>
      <textarea aria-describedby={blad ? pobierzIdBleduPola(poleLiczbyUczestnikow) : undefined} aria-invalid={Boolean(blad)} placeholder="Jedna osoba w każdym wierszu" rows={5} value={tekstUczestnikow} onChange={(zdarzenie) => ustawUczestnikow(zdarzenie.target.value)} />
      {blad && <span className="szczegoly-pole__blad" id={pobierzIdBleduPola(poleLiczbyUczestnikow)}>{blad}</span>}
      <span className="szczegoly-pole__pomoc">Lista uczestników jest źródłem danych dla Listy obecności.</span>
    </label>
  )
}
