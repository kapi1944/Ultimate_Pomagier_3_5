import { useState } from 'react'
import type { GrupaSzkoleniowa, StatusyPolImportu } from '../typy'
import { parsujListeUczestnikow, pobierzDokumentListyObecnosci, utworzTekstListyObecnosci } from '../uslugi/eksportListyObecnosci'
import { PoleCheckbox, PoleLiczbowe, PoleSuwak, PoleTekstoweWielowierszowe } from './PolaSzczegolow'
import SekcjaFormularza from './SekcjaFormularza'

type WlasciwosciSekcjiUczestnikow = {
  grupa: GrupaSzkoleniowa
  statusyPol: StatusyPolImportu
  aktualizujGrupe: (id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) => void
}

export default function SekcjaUczestnikow({ grupa, statusyPol, aktualizujGrupe }: WlasciwosciSekcjiUczestnikow) {
  const [tekstListy, ustawTekstListy] = useState('')
  const [czyOdwrocicKolejnosc, ustawCzyOdwrocicKolejnosc] = useState(false)

  function zastosujListe(tekst: string) {
    const uczestnicy = parsujListeUczestnikow(tekst, czyOdwrocicKolejnosc)
    aktualizujGrupe(
      grupa.id,
      (obecna) => ({
        ...obecna,
        uczestnicy,
        liczbaUczestnikow: uczestnicy.length,
      }),
      'grupy.0.uczestnicy',
    )
  }

  function obsluzPlik(plik: File | undefined) {
    if (!plik) {
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      const tresc = String(czytnik.result ?? '')
      ustawTekstListy(tresc)
      zastosujListe(tresc)
    }
    czytnik.readAsText(plik)
  }

  return (
    <SekcjaFormularza
      id="uczestnicy"
      tytul="Uczestnicy"
      akcje={
        <>
          <button type="button" onClick={() => pobierzDokumentListyObecnosci(grupa)}>
            Eksport listy DOC
          </button>
          <button type="button" onClick={() => window.print()}>
            Drukuj/PDF
          </button>
        </>
      }
    >
      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <PoleLiczbowe
          etykieta="Liczba uczestników"
          pole="grupy.0.liczbaUczestnikow"
          statusyPol={statusyPol}
          min={0}
          wartosc={grupa.liczbaUczestnikow}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, liczbaUczestnikow: wartosc }), 'grupy.0.liczbaUczestnikow')}
        />
        <PoleSuwak
          etykieta="Margines wierszy listy"
          pole="grupy.0.marginesWierszyListy"
          statusyPol={statusyPol}
          min={4}
          max={18}
          wartosc={grupa.marginesWierszyListy}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, marginesWierszyListy: wartosc }), 'grupy.0.marginesWierszyListy')}
        />
      </div>

      <div className="szczegoly-flagi">
        <PoleCheckbox
          etykieta="Odwróć kolejność imię/nazwisko"
          pole="uczestnicy.odwroconaKolejnosc"
          statusyPol={statusyPol}
          zaznaczone={czyOdwrocicKolejnosc}
          ustawZaznaczone={ustawCzyOdwrocicKolejnosc}
        />
        <PoleCheckbox
          etykieta="Pusta lista obecności"
          pole="grupy.0.pustaListaObecnosci"
          statusyPol={statusyPol}
          zaznaczone={grupa.pustaListaObecnosci}
          ustawZaznaczone={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, pustaListaObecnosci: wartosc }), 'grupy.0.pustaListaObecnosci')}
        />
      </div>

      <PoleTekstoweWielowierszowe
        etykieta="Wklej listę tekstową"
        pole="grupy.0.uczestnicy"
        statusyPol={statusyPol}
        wartosc={tekstListy}
        ustawWartosc={(wartosc) => {
          ustawTekstListy(wartosc)
          zastosujListe(wartosc)
        }}
      />

      <label className="szczegoly-pole">
        <span className="szczegoly-pole__naglowek">Import CSV/TXT</span>
        <input accept=".csv,.txt,text/csv,text/plain" type="file" onChange={(zdarzenie) => obsluzPlik(zdarzenie.target.files?.[0])} />
      </label>

      <div className="szczegoly-tabela-przewijana">
        <table className="szczegoly-tabela">
          <thead>
            <tr>
              <th>Lp.</th>
              <th>Imię</th>
              <th>Nazwisko</th>
              <th>E-mail</th>
            </tr>
          </thead>
          <tbody>
            {grupa.uczestnicy.map((uczestnik, indeks) => (
              <tr key={uczestnik.id}>
                <td>{indeks + 1}</td>
                <td>{uczestnik.imie}</td>
                <td>{uczestnik.nazwisko}</td>
                <td>{uczestnik.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <pre className="szczegoly-mini-podglad">{utworzTekstListyObecnosci(grupa)}</pre>
    </SekcjaFormularza>
  )
}
