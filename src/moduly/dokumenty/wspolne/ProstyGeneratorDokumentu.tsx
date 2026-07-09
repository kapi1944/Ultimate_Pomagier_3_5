import { useEffect, useMemo, useState, type ReactNode } from 'react'
import PrawyPanelGeneratora, { type PozycjaKontroliJakosci, type SekcjaPrawegoPanelu } from './komponenty/PrawyPanelGeneratora'
import UkladGeneratoraDokumentu from './komponenty/UkladGeneratoraDokumentu'
import './prostyGeneratorDokumentu.css'

type KonfiguracjaGeneratora = {
  tytul: string
  opis: string
  etykietaDanychWejsciowych: string
  tekstPrzykladowy: string
  kluczLocalStorage: string
  generujDokument: (daneWejsciowe: string) => string
  statusPanelu?: (kontekst: KontekstPaneluProstegoGeneratora) => ReactNode
  licznikProblemowPanelu?: (kontekst: KontekstPaneluProstegoGeneratora) => number
  sekcjePanelu?: (kontekst: KontekstPaneluProstegoGeneratora) => SekcjaPrawegoPanelu[]
  pozycjeJakosciPanelu?: (kontekst: KontekstPaneluProstegoGeneratora) => PozycjaKontroliJakosci[]
  aktywnaGrupaJakosci?: string
}

type KontekstPaneluProstegoGeneratora = {
  daneWejsciowe: string
  wygenerowanyDokument: string
}

function zabezpieczHtml(tekst: string) {
  return tekst
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function ProstyGeneratorDokumentu({
  tytul,
  opis,
  etykietaDanychWejsciowych,
  tekstPrzykladowy,
  kluczLocalStorage,
  generujDokument,
  statusPanelu,
  licznikProblemowPanelu,
  sekcjePanelu,
  pozycjeJakosciPanelu,
  aktywnaGrupaJakosci = 'Dane wejściowe',
}: KonfiguracjaGeneratora) {
  const [daneWejsciowe, ustawDaneWejsciowe] = useState(() => {
    return localStorage.getItem(kluczLocalStorage) ?? tekstPrzykladowy
  })
  const [komunikat, ustawKomunikat] = useState('Szkic zapisany lokalnie.')
  const wygenerowanyDokument = useMemo(() => generujDokument(daneWejsciowe), [daneWejsciowe, generujDokument])

  useEffect(() => {
    localStorage.setItem(kluczLocalStorage, daneWejsciowe)
  }, [daneWejsciowe, kluczLocalStorage])

  function obsluzGenerowanie() {
    ustawKomunikat('Podgląd jest aktualny. Szkic zapisany lokalnie.')
  }

  async function obsluzKopiowanie() {
    if (!wygenerowanyDokument.trim()) {
      ustawKomunikat('Najpierw wygeneruj dokument.')
      return
    }

    try {
      await navigator.clipboard.writeText(wygenerowanyDokument)
      ustawKomunikat('Wynik skopiowany do schowka.')
    } catch {
      ustawKomunikat('Nie udało się skopiować wyniku.')
    }
  }

  function obsluzDrukowanie() {
    if (!wygenerowanyDokument.trim()) {
      ustawKomunikat('Najpierw wygeneruj dokument.')
      return
    }

    const oknoDruku = window.open('', '_blank', 'width=900,height=700')

    if (!oknoDruku) {
      ustawKomunikat('Nie udało się otworzyć okna drukowania.')
      return
    }

    oknoDruku.document.write(`
      <!doctype html>
      <html lang="pl">
        <head>
          <meta charset="utf-8" />
          <title>${zabezpieczHtml(tytul)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            pre { white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
          </style>
        </head>
        <body>
          <pre>${zabezpieczHtml(wygenerowanyDokument)}</pre>
        </body>
      </html>
    `)
    oknoDruku.document.close()
    oknoDruku.focus()
    oknoDruku.print()
  }

  function obsluzCzyszczenie() {
    ustawDaneWejsciowe('')
    localStorage.removeItem(kluczLocalStorage)
    ustawKomunikat('Wyczyszczono dane i zapisany szkic.')
  }

  const kontekstPanelu = { daneWejsciowe, wygenerowanyDokument }
  const liczbaWierszy = daneWejsciowe.split('\n').filter((wiersz) => wiersz.trim()).length
  const licznikProblemow = licznikProblemowPanelu?.(kontekstPanelu) ?? 0
  const sekcjePaneluGeneratora = sekcjePanelu?.(kontekstPanelu) ?? []
  const pozycjeJakosci = pozycjeJakosciPanelu?.(kontekstPanelu) ?? [
    {
      id: 'dane-wejsciowe',
      tytul: daneWejsciowe.trim() ? 'Dane wejściowe są dostępne' : 'Brak danych wejściowych',
      opis: `Wiersze: ${liczbaWierszy}. Znaki: ${daneWejsciowe.length}.`,
      poziom: daneWejsciowe.trim() ? 'poprawne' : 'krytyczne',
      grupa: 'Dane wejściowe',
      zakladka: 'Dane wejściowe',
      idPola: `${kluczLocalStorage}-dane`,
      czyBlokujePublikacje: !daneWejsciowe.trim(),
      czyBlokujeEksport: !daneWejsciowe.trim(),
      kolejnosc: 1,
    },
    {
      id: 'podglad-techniczny',
      tytul: wygenerowanyDokument.trim() ? 'Podgląd techniczny jest gotowy' : 'Brak wyniku',
      poziom: wygenerowanyDokument.trim() ? 'poprawne' : 'ostrzezenie',
      grupa: 'Podgląd',
      zakladka: 'Podgląd',
      czyBlokujePublikacje: false,
      czyBlokujeEksport: !wygenerowanyDokument.trim(),
      kolejnosc: 2,
    },
    {
      id: 'ustawienia-rozszerzone',
      tytul: 'Ustawienia rozszerzone',
      opis: 'Do wdrożenia później.',
      poziom: 'podpowiedz',
      grupa: 'Ustawienia',
      zakladka: 'Ustawienia',
      czyBlokujePublikacje: false,
      czyBlokujeEksport: false,
      kolejnosc: 3,
    },
  ]
  const akcjeGeneratora = (
    <>
      <button type="button" onClick={obsluzGenerowanie}>
        Generuj
      </button>
      <button type="button" onClick={obsluzKopiowanie}>
        Kopiuj wynik
      </button>
      <button type="button" onClick={obsluzDrukowanie}>
        Drukuj
      </button>
      <button type="button" onClick={obsluzCzyszczenie}>
        Wyczyść
      </button>
    </>
  )

  return (
    <UkladGeneratoraDokumentu
      nazwaKlasy="widok prosty-generator"
      naglowek={
        <div className="prosty-generator__naglowek">
          <h1>{tytul}</h1>
          <p>{opis}</p>
        </div>
      }
      pasekAkcji={<div className="prosty-generator__akcje">{akcjeGeneratora}</div>}
      prawyPanel={(stanPanelu) => (
        <PrawyPanelGeneratora
          komunikaty={<p>{komunikat}</p>}
          licznikProblemow={licznikProblemow}
          pozycjeJakosci={pozycjeJakosci}
          aktywnaGrupaJakosci={aktywnaGrupaJakosci}
          etykietaAktywnejGrupy="Aktywna sekcja"
          sekcje={sekcjePaneluGeneratora}
          stanPanelu={stanPanelu}
          status={statusPanelu?.(kontekstPanelu) ?? (wygenerowanyDokument.trim() ? 'Podgląd techniczny jest dostępny.' : 'Brak wyniku.')}
          statusJakosci={licznikProblemow ? 'NIEPEŁNE' : 'GOTOWE'}
          tytul={`Panel: ${tytul}`}
        />
      )}
      licznikProblemow={licznikProblemow}
    >
      <div className="prosty-generator__siatka">
        <section className="prosty-generator__panel">
          <label className="prosty-generator__etykieta" htmlFor={`${kluczLocalStorage}-dane`}>
            {etykietaDanychWejsciowych}
          </label>
          <textarea
            className="prosty-generator__textarea"
            id={`${kluczLocalStorage}-dane`}
            onChange={(zdarzenie) => ustawDaneWejsciowe(zdarzenie.target.value)}
            value={daneWejsciowe}
          />

          <p className="prosty-generator__komunikat">{komunikat}</p>
        </section>

        <section className="prosty-generator__panel">
          <h2>Wygenerowany dokument</h2>
          <pre className="prosty-generator__wynik">{wygenerowanyDokument}</pre>
        </section>
      </div>
    </UkladGeneratoraDokumentu>
  )
}
