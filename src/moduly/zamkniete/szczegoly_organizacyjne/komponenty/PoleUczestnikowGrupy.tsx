import type { GrupaSzkoleniowa, UczestnikGrupy } from '../typy'
import { pobierzIdBleduPola } from './identyfikatoryPol'
import { ZnacznikBleduPola } from './PolaSzczegolow'
import { useBladPola } from './stanBledowPol'
import { useState } from 'react'
import ImporterListyOcr from '../../../../wspolne/ocr/ImporterListyOcr'
import { dodajUczestnikowBezDuplikatow } from '../../../../wspolne/ocr/modelTabeliOcr'

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
  const [czyImporterOtwarty, ustawCzyImporterOtwarty] = useState(false)
  const tekstUczestnikow = (grupa.uczestnicy ?? []).map((uczestnik) => `${uczestnik.imie} ${uczestnik.nazwisko}`.trim()).join('\n')
  const poleLiczbyUczestnikow = `grupy.${indeks}.liczbaUczestnikow`
  const idBleduUczestnikow = pobierzIdBleduPola(`grupy.${indeks}.uczestnicy`)
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
    <>
    <button type="button" onClick={() => ustawCzyImporterOtwarty(true)}>Importuj listę ze skanu (OCR)</button>
    {czyImporterOtwarty && <ImporterListyOcr kontekst={`grupa:${grupa.id}`} opisZastosowania="Do grupy szkolenia zostaną dodane imiona i nazwiska. Dane zespołu zachowasz w wyniku OCR i eksportowanej tabeli." obecneNazwy={(grupa.uczestnicy ?? []).map((osoba) => `${osoba.imie} ${osoba.nazwisko}`.trim())} zamknij={() => ustawCzyImporterOtwarty(false)} zastosuj={(osoby) => aktualizujGrupe(grupa.id, (obecna) => {
      const dotychczasowi = obecna.uczestnicy ?? []
      const uczestnicy = dodajUczestnikowBezDuplikatow(dotychczasowi.map((osoba) => ({ ...osoba, imieINazwisko: `${osoba.imie} ${osoba.nazwisko}`.trim() })), osoby).map((osoba) => {
        const istniejacy = dotychczasowi.find((uczestnik) => uczestnik.id === osoba.id)
        const [imie, ...nazwisko] = osoba.imieINazwisko.split(/\s+/)
        return istniejacy ?? { id: osoba.id, imie, nazwisko: nazwisko.join(' '), email: '' }
      })
      return { ...obecna, uczestnicy, liczbaUczestnikow: uczestnicy.length }
    }, `grupy.${indeks}.uczestnicy`)} />}
    <label className="szczegoly-pole">
      <span className="szczegoly-pole__naglowek"><span className="szczegoly-pole__etykieta">Uczestnicy<ZnacznikBleduPola blad={blad} /></span></span>
      <textarea aria-describedby={blad ? idBleduUczestnikow : undefined} aria-invalid={Boolean(blad)} placeholder="Jedna osoba w każdym wierszu" rows={5} value={tekstUczestnikow} onChange={(zdarzenie) => ustawUczestnikow(zdarzenie.target.value)} />
      {blad && <span className="szczegoly-pole__blad" id={idBleduUczestnikow}>{blad}</span>}
      <span className="szczegoly-pole__pomoc">Lista uczestników jest źródłem danych dla Listy obecności.</span>
    </label>
    </>
  )
}
