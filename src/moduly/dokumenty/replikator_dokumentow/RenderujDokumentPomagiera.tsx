import type { CSSProperties, ReactNode } from 'react'
import type {
  DokumentPomagiera,
  ElementDokumentu,
  ElementObrazuDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  PozycjaElementuDokumentu,
  StronaDokumentu,
} from '../../../wspolne/dokumenty/typyDokumentu'
import PodgladOryginaluDokumentu from './PodgladOryginaluDokumentu'

type WlasciwosciRenderera = {
  dokument: DokumentPomagiera
  zaznaczonyElementId?: string | null
  pokazOryginalJakoTlo?: boolean
  przezroczystoscOryginalu?: number
  onZaznaczElement?: (elementId: string) => void
  onZmienTekst?: (elementId: string, tekst: string) => void
}

function ustawPozycje(pozycja: PozycjaElementuDokumentu, strona: StronaDokumentu, zIndex?: number): CSSProperties {
  return {
    left: `${(pozycja.x / strona.szerokoscMm) * 100}%`,
    top: `${(pozycja.y / strona.wysokoscMm) * 100}%`,
    width: `${(pozycja.szerokosc / strona.szerokoscMm) * 100}%`,
    height: `${(pozycja.wysokosc / strona.wysokoscMm) * 100}%`,
    zIndex,
  }
}

function czyElementTekstowy(element: ElementDokumentu): element is ElementTekstowyDokumentu {
  return element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka'
}

function czyElementObrazu(element: ElementDokumentu): element is ElementObrazuDokumentu {
  return element.rodzaj === 'obraz'
}

function czyElementTabeli(element: ElementDokumentu): element is ElementTabeliDokumentu {
  return element.rodzaj === 'tabela'
}

function ustawKlaseElementu(element: ElementDokumentu, zaznaczonyElementId?: string | null) {
  const klasaStatusu = ` replikator-dokumentow__element--${element.status}`
  const klasaZaznaczenia = zaznaczonyElementId === element.id ? ' replikator-dokumentow__element--zaznaczony' : ''

  return `${klasaStatusu}${klasaZaznaczenia}`
}

function renderujElement(
  element: ElementDokumentu,
  strona: StronaDokumentu,
  wlasciwosci: WlasciwosciRenderera,
): ReactNode {
  const klasa = ustawKlaseElementu(element, wlasciwosci.zaznaczonyElementId)
  const zaznacz = () => wlasciwosci.onZaznaczElement?.(element.id)

  if (czyElementObrazu(element)) {
    return (
      <img
        alt={element.nazwa}
        className={`replikator-dokumentow__element replikator-dokumentow__obraz${klasa}`}
        key={element.id}
        src={element.zrodlo}
        style={ustawPozycje(element.pozycja, strona, element.zIndex ?? 2)}
        onClick={zaznacz}
      />
    )
  }

  if (czyElementTabeli(element)) {
    return (
      <table
        className={`replikator-dokumentow__element replikator-dokumentow__tabela${klasa}`}
        key={element.id}
        style={{
          ...ustawPozycje(element.pozycja, strona, element.zIndex ?? 3),
          color: element.styl.kolor,
          fontFamily: element.styl.krojCzcionki,
          fontSize: `${element.styl.rozmiarCzcionki}px`,
        }}
        onClick={zaznacz}
      >
        <colgroup>
          {element.kolumny.map((kolumna, indeks) => (
            <col key={`${element.id}-kolumna-${indeks}`} style={{ width: `${kolumna.szerokosc}%` }} />
          ))}
        </colgroup>
        <tbody>
          {element.komorki.map((wiersz, indeksWiersza) => (
            <tr
              key={`${element.id}-wiersz-${indeksWiersza}`}
              style={{ height: element.wiersze[indeksWiersza] ? `${Math.max(12, element.wiersze[indeksWiersza].wysokosc * 2)}px` : undefined }}
            >
              {wiersz.map((komorka, indeksKomorki) => (
                <td
                  colSpan={komorka.colSpan}
                  key={`${element.id}-komorka-${indeksWiersza}-${indeksKomorki}`}
                  rowSpan={komorka.rowSpan}
                  style={{
                    background: komorka.kolorTla,
                    borderStyle: komorka.obramowanie ? 'solid' : 'none',
                    textAlign: komorka.wyrownanie === 'prawo' ? 'right' : komorka.wyrownanie === 'lewo' ? 'left' : 'center',
                  }}
                >
                  {komorka.tekst}
                </td>
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
        className={`replikator-dokumentow__element replikator-dokumentow__plik-osadzony${klasa}`}
        data={element.zrodlo}
        key={element.id}
        style={ustawPozycje(element.pozycja, strona, element.zIndex ?? 1)}
        type={element.typMime}
        onClick={zaznacz}
      >
        {element.nazwa}
      </object>
    )
  }

  if (element.rodzaj === 'blok') {
    return element.elementy.map((dziecko) => renderujElement(dziecko, strona, wlasciwosci))
  }

  if (element.rodzaj === 'ksztalt') {
    return (
      <span
        className={`replikator-dokumentow__element replikator-dokumentow__ksztalt replikator-dokumentow__ksztalt--${element.typKsztaltu}${klasa}`}
        key={element.id}
        style={{
          ...ustawPozycje(element.pozycja, strona, element.zIndex ?? 1),
          background: element.wypelnienie,
          border: element.obramowanie,
          borderRadius: element.promienZaokraglenia,
        }}
        onClick={zaznacz}
      />
    )
  }

  if (element.rodzaj === 'linia') {
    return (
      <span
        className={`replikator-dokumentow__element replikator-dokumentow__linia${klasa}`}
        key={element.id}
        style={ustawPozycje(element.pozycja, strona, element.zIndex ?? 2)}
        onClick={zaznacz}
      />
    )
  }

  if (element.rodzaj === 'checkbox') {
    return (
      <span
        className={`replikator-dokumentow__element replikator-dokumentow__checkbox${klasa}`}
        key={element.id}
        style={ustawPozycje(element.pozycja, strona, element.zIndex ?? 3)}
        onClick={zaznacz}
      >
        {element.wartosc ? '✓' : ''}
      </span>
    )
  }

  if (czyElementTekstowy(element)) {
    return (
      <p
        className={`replikator-dokumentow__element replikator-dokumentow__tekst${klasa}`}
        contentEditable={Boolean(wlasciwosci.onZmienTekst)}
        key={element.id}
        suppressContentEditableWarning
        style={{
          ...ustawPozycje(element.pozycja, strona, element.zIndex ?? 4),
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
                : element.styl.wyrownanie === 'wyjustuj'
                  ? 'justify'
                  : 'left',
          textDecoration: element.styl.podkreslenie ? 'underline' : 'none',
        }}
        onBlur={(zdarzenie) => wlasciwosci.onZmienTekst?.(element.id, zdarzenie.currentTarget.textContent ?? '')}
        onClick={zaznacz}
      >
        {element.tekst}
      </p>
    )
  }

  return null
}

export default function RenderujDokumentPomagiera(wlasciwosci: WlasciwosciRenderera) {
  return (
    <div className="replikator-dokumentow__strony">
      {wlasciwosci.dokument.strony.map((strona) => (
        <article
          className="replikator-dokumentow__kartka"
          key={strona.id}
          aria-label={`Podgląd strony ${strona.numer} dokumentu Pomagiera`}
          style={{
            '--szerokosc-mm': strona.szerokoscMm,
            '--wysokosc-mm': strona.wysokoscMm,
          } as CSSProperties & Record<string, number>}
        >
          {wlasciwosci.pokazOryginalJakoTlo && (
            <div className="replikator-dokumentow__oryginal-tlo" style={{ opacity: (wlasciwosci.przezroczystoscOryginalu ?? 45) / 100 }}>
              <PodgladOryginaluDokumentu dokument={wlasciwosci.dokument} />
            </div>
          )}
          {strona.elementy.map((element) => renderujElement(element, strona, wlasciwosci))}
        </article>
      ))}
    </div>
  )
}
