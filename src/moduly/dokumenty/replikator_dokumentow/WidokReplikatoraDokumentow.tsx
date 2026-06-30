import { useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react'
import { utworzDokumentZTekstu } from '../../../wspolne/dokumenty/utworzDokumentZTekstu'
import { importujPlikDoDokumentu } from '../../../wspolne/import/importujPlikDoDokumentu'
import type {
  DokumentPomagiera,
  ElementDokumentu,
  PozycjaElementuDokumentu,
  TypZrodlaDokumentu,
} from '../../../wspolne/dokumenty/typyDokumentu'
import './replikatorDokumentow.css'

const tekstPrzykladowy = `Wzorcowy dokument szkoleniowy
Kontakt: biuro@pomagier.local
Telefon: +48 501 234 567

Uczestnik: Jan Kowalski
Szkolenie: Skuteczna komunikacja w zespole
Data: 2026-07-15`

function opiszTypZrodla(typ: TypZrodlaDokumentu) {
  const etykiety: Record<TypZrodlaDokumentu, string> = {
    tekst: 'Tekst',
    docx: 'DOCX',
    pdf: 'PDF',
    obraz: 'Obraz / skan',
    ocr: 'OCR',
    nieznany: 'Nieznany',
  }

  return etykiety[typ]
}

function policzElementy(elementy: ElementDokumentu[]): number {
  return elementy.reduce<number>((suma, element) => {
    if (element.rodzaj === 'blok') {
      return suma + 1 + policzElementy(element.elementy)
    }

    return suma + 1
  }, 0)
}

function ustawPozycje(pozycja: PozycjaElementuDokumentu): CSSProperties {
  return {
    left: `${(pozycja.x / 210) * 100}%`,
    top: `${(pozycja.y / 297) * 100}%`,
    width: `${(pozycja.szerokosc / 210) * 100}%`,
    minHeight: `${(pozycja.wysokosc / 297) * 100}%`,
  }
}

function renderujElement(element: ElementDokumentu): ReactNode {
  if (element.rodzaj === 'obraz') {
    return (
      <img
        alt={element.nazwa}
        className="replikator-dokumentow__element replikator-dokumentow__obraz"
        key={element.id}
        src={element.zrodlo}
        style={ustawPozycje(element.pozycja)}
      />
    )
  }

  if (element.rodzaj === 'tabela') {
    return (
      <table
        className="replikator-dokumentow__element replikator-dokumentow__tabela"
        key={element.id}
        style={{
          ...ustawPozycje(element.pozycja),
          color: element.styl.kolor,
          fontFamily: element.styl.krojCzcionki,
          fontSize: `${element.styl.rozmiarCzcionki}px`,
        }}
      >
        <tbody>
          {element.wiersze.map((wiersz, indeksWiersza) => (
            <tr key={`${element.id}-wiersz-${indeksWiersza}`}>
              {wiersz.map((komorka, indeksKomorki) => (
                <td key={`${element.id}-komorka-${indeksWiersza}-${indeksKomorki}`}>{komorka}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (element.rodzaj === 'plik_osadzony') {
    return (
      <object
        className="replikator-dokumentow__element replikator-dokumentow__plik-osadzony"
        data={element.zrodlo}
        key={element.id}
        style={ustawPozycje(element.pozycja)}
        type={element.typMime}
      >
        {element.nazwa}
      </object>
    )
  }

  if (element.rodzaj === 'blok') {
    return element.elementy.map(renderujElement)
  }

  if (element.rodzaj === 'linia') {
    return <span className="replikator-dokumentow__element replikator-dokumentow__linia" key={element.id} style={ustawPozycje(element.pozycja)} />
  }

  return (
    <p
      className="replikator-dokumentow__element replikator-dokumentow__tekst"
      key={element.id}
      style={{
        ...ustawPozycje(element.pozycja),
        color: element.styl.kolor,
        fontFamily: element.styl.krojCzcionki,
        fontSize: `${element.styl.rozmiarCzcionki}px`,
        fontStyle: element.styl.kursywa ? 'italic' : 'normal',
        fontWeight: element.styl.pogrubienie ? 700 : 400,
        textAlign:
          element.styl.wyrownanie === 'srodek'
            ? 'center'
            : element.styl.wyrownanie === 'prawo'
              ? 'right'
              : 'left',
        textDecoration: element.styl.podkreslenie ? 'underline' : 'none',
      }}
    >
      {element.tekst}
    </p>
  )
}

export default function WidokReplikatoraDokumentow() {
  const [nazwaWzorca, ustawNazweWzorca] = useState('Wzorzec tekstowy')
  const [tekstWzorca, ustawTekstWzorca] = useState(tekstPrzykladowy)
  const [dokument, ustawDokument] = useState<DokumentPomagiera>(() =>
    utworzDokumentZTekstu('Wzorzec tekstowy', tekstPrzykladowy),
  )
  const [komunikat, ustawKomunikat] = useState('Replikator działa lokalnie na tekście, DOCX i obrazach.')

  const liczbaElementow = dokument.strony.reduce((suma, obecnaStrona) => suma + policzElementy(obecnaStrona.elementy), 0)

  function obsluzZmianeNazwy(nazwa: string) {
    ustawNazweWzorca(nazwa)

    if (dokument.zrodlo.typ === 'tekst') {
      ustawDokument(utworzDokumentZTekstu(nazwa, tekstWzorca))
    }
  }

  function obsluzZmianeTekstu(tekst: string) {
    ustawTekstWzorca(tekst)
    ustawDokument(utworzDokumentZTekstu(nazwaWzorca, tekst))
    ustawKomunikat('Zaktualizowano tekstowy wzorzec dokumentu.')
  }

  async function obsluzWyborPliku(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    try {
      const wynik = await importujPlikDoDokumentu(plik)

      ustawNazweWzorca(wynik.dokument.nazwa)
      ustawTekstWzorca(wynik.tekstZrodlowy)
      ustawDokument(wynik.dokument)
      ustawKomunikat(wynik.komunikat)
    } catch {
      ustawKomunikat('Nie udało się zaimportować pliku. Sprawdź format albo spróbuj zapisać dokument ponownie.')
    }
  }

  return (
    <section className="widok replikator-dokumentow">
      <header className="replikator-dokumentow__naglowek">
        <div>
          <h1>Replikator dokumentów</h1>
          <p>Importuje wzorzec i odtwarza roboczy układ stron, tekstów, tabel oraz obrazów.</p>
        </div>
        <span>{opiszTypZrodla(dokument.zrodlo.typ)}</span>
      </header>

      <div className="replikator-dokumentow__uklad">
        <section className="replikator-dokumentow__panel">
          <h2>Import wzorca</h2>

          <label className="replikator-dokumentow__pole">
            Nazwa wzorca
            <input value={nazwaWzorca} onChange={(zdarzenie) => obsluzZmianeNazwy(zdarzenie.target.value)} />
          </label>

          <label className="replikator-dokumentow__pole">
            Plik źródłowy
            <input accept=".txt,.docx,.pdf,.jpg,.jpeg,.svg,image/*" onChange={obsluzWyborPliku} type="file" />
          </label>

          <label className="replikator-dokumentow__pole">
            Treść rozpoznana
            <textarea value={tekstWzorca} onChange={(zdarzenie) => obsluzZmianeTekstu(zdarzenie.target.value)} />
          </label>

          <p className="replikator-dokumentow__komunikat">{komunikat}</p>

          <div className="replikator-dokumentow__dane">
            <section>
              <h3>Wykryte e-maile</h3>
              {dokument.metadane.emaile.length ? (
                <ul>
                  {dokument.metadane.emaile.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
              ) : (
                <p>Brak wykrytych adresów.</p>
              )}
            </section>

            <section>
              <h3>Wykryte telefony</h3>
              {dokument.metadane.telefony.length ? (
                <ul>
                  {dokument.metadane.telefony.map((telefon) => (
                    <li key={telefon}>{telefon}</li>
                  ))}
                </ul>
              ) : (
                <p>Brak wykrytych numerów.</p>
              )}
            </section>
          </div>
        </section>

        <section className="replikator-dokumentow__panel replikator-dokumentow__panel--podglad">
          <div className="replikator-dokumentow__pasek">
            <div>
              <h2>Podgląd modelu</h2>
              <span>
                {dokument.strony.length} stron, {liczbaElementow} elementów
              </span>
            </div>
            <span>{dokument.zrodlo.typ.toUpperCase()}</span>
          </div>

          <div className="replikator-dokumentow__strony">
            {dokument.strony.map((strona) => (
              <article
                className="replikator-dokumentow__kartka"
                key={strona.id}
                aria-label={`Podgląd strony ${strona.numer} dokumentu Pomagiera`}
              >
                {strona.elementy.map(renderujElement)}
              </article>
            ))}
          </div>

          <dl className="replikator-dokumentow__metryka">
            <div>
              <dt>Id dokumentu</dt>
              <dd>{dokument.id}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>A4 210x297 mm</dd>
            </div>
            <div>
              <dt>Pola dynamiczne</dt>
              <dd>{dokument.polaDynamiczne.length}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  )
}
