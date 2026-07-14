import { useEffect, useMemo, useState } from 'react'
import { zapiszDokumentRoboczyGeneratora } from '../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import './prostyGeneratorDokumentu.css'

type KonfiguracjaGeneratora = {
  tytul: string
  opis: string
  etykietaDanychWejsciowych: string
  tekstPrzykladowy: string
  kluczLocalStorage: string
  generujDokument: (daneWejsciowe: string) => string
}

const konfiguracjeRejestru: Record<string, { typ: 'LISTA_OBECNOSCI' | 'ANKIETA' | 'KARTA_NA_DRZWI'; generatorId: string }> = {
  'ultimate-pomagier.listy-obecnosci.szkic': { typ: 'LISTA_OBECNOSCI', generatorId: 'listy_obecnosci' },
  'ultimate-pomagier.ankiety.szkic': { typ: 'ANKIETA', generatorId: 'ankiety' },
  'ultimate-pomagier.karta-na-drzwi.szkic': { typ: 'KARTA_NA_DRZWI', generatorId: 'karta_na_drzwi' },
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
}: KonfiguracjaGeneratora) {
  const [daneWejsciowe, ustawDaneWejsciowe] = useState(() => {
    return localStorage.getItem(kluczLocalStorage) ?? tekstPrzykladowy
  })
  const [komunikat, ustawKomunikat] = useState('Szkic zapisany lokalnie.')
  const [idDokumentu, ustawIdDokumentu] = useState(() => localStorage.getItem(kluczLocalStorage + '.dokumentId'))
  const wygenerowanyDokument = useMemo(() => generujDokument(daneWejsciowe), [daneWejsciowe, generujDokument])

  useEffect(() => {
    localStorage.setItem(kluczLocalStorage, daneWejsciowe)
  }, [daneWejsciowe, kluczLocalStorage])

  function obsluzGenerowanie() {
    try {
      const konfiguracja = konfiguracjeRejestru[kluczLocalStorage]
      const dokument = konfiguracja
        ? zapiszDokumentRoboczyGeneratora({ id: idDokumentu, ...konfiguracja, tytul, daneDokumentu: { tekst: daneWejsciowe }, ustawieniaDokumentu: {} })
        : null

      if (dokument) {
        ustawIdDokumentu(dokument.id)
        localStorage.setItem(`${kluczLocalStorage}.dokumentId`, dokument.id)
      }
      ustawKomunikat('Podgląd jest aktualny. Dokument roboczy zapisano w rejestrze.')
    } catch {
      ustawKomunikat('Podgląd jest aktualny, ale nie udało się zapisać dokumentu roboczego.')
    }
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

  return (
    <section className="widok prosty-generator">
      <header className="prosty-generator__naglowek">
        <h1>{tytul}</h1>
        <p>{opis}</p>
      </header>

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

          <div className="prosty-generator__akcje">
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
          </div>

          <p className="prosty-generator__komunikat">{komunikat}</p>
        </section>

        <section className="prosty-generator__panel">
          <h2>Wygenerowany dokument</h2>
          <pre className="prosty-generator__wynik">{wygenerowanyDokument}</pre>
        </section>
      </div>
    </section>
  )
}
