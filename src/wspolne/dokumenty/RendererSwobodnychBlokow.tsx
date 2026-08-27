import type { CSSProperties } from 'react'
import {
  czyBlokWidocznyNaStronie,
  pobierzTekstBloku,
  pobierzZrodloObrazuBloku,
  type BlokSwobodnyDokumentu,
  type KontekstSwobodnychBlokow,
} from './modelSwobodnychBlokow'

type WlasciwosciRendereraSwobodnychBlokow = {
  bloki: BlokSwobodnyDokumentu[]
  numerStrony: number
  kontekst: KontekstSwobodnychBlokow
}

const wyrownanieCss = {
  lewo: 'left',
  srodek: 'center',
  prawo: 'right',
  wyjustuj: 'justify',
} as const

function pobierzStylPolozenia(blok: BlokSwobodnyDokumentu): CSSProperties {
  return {
    position: 'absolute',
    left: `${blok.xMm}mm`,
    top: `${blok.yMm}mm`,
    width: `${blok.szerokoscMm}mm`,
    height: `${blok.wysokoscMm}mm`,
    zIndex: blok.indeksWarstwy,
    boxSizing: 'border-box',
    overflow: 'hidden',
    pointerEvents: 'none',
  }
}

export default function RendererSwobodnychBlokow({ bloki, numerStrony, kontekst }: WlasciwosciRendereraSwobodnychBlokow) {
  return bloki.filter((blok) => czyBlokWidocznyNaStronie(blok, numerStrony)).map((blok) => {
    const stylPolozenia = pobierzStylPolozenia(blok)

    if (blok.typ === 'tekst') {
      return (
        <div
          data-blok-swobodny={blok.id}
          key={blok.id}
          style={{
            ...stylPolozenia,
            color: blok.dane.kolor,
            fontFamily: blok.dane.rodzinaCzcionki,
            fontSize: `${blok.dane.rozmiarCzcionkiPt}pt`,
            fontWeight: blok.dane.gruboscCzcionki,
            lineHeight: blok.dane.interlinia,
            textAlign: wyrownanieCss[blok.dane.wyrownanie],
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {pobierzTekstBloku(blok, kontekst)}
        </div>
      )
    }

    const zrodlo = pobierzZrodloObrazuBloku(blok, kontekst)
    return zrodlo ? (
      <img
        alt={blok.dane.tekstAlternatywny}
        data-blok-swobodny={blok.id}
        key={blok.id}
        src={zrodlo}
        style={{
          ...stylPolozenia,
          objectFit: blok.dane.zachowajProporcje ? blok.dane.trybDopasowania : 'fill',
        }}
      />
    ) : null
  })
}
