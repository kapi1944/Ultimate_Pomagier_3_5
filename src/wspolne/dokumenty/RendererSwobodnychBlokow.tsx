import type { CSSProperties } from 'react'
import type { TrybRenderowaniaDokumentu } from './trybRenderowaniaDokumentu'
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
  trybRenderowania: TrybRenderowaniaDokumentu
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
    left: `${blok.xMm / 2.1}%`,
    top: `${blok.yMm / 2.97}%`,
    width: `${blok.szerokoscMm / 2.1}%`,
    height: `${blok.wysokoscMm / 2.97}%`,
    zIndex: blok.indeksWarstwy,
    boxSizing: 'border-box',
    overflow: 'hidden',
    pointerEvents: 'none',
  }
}

export default function RendererSwobodnychBlokow({ bloki, numerStrony, kontekst, trybRenderowania }: WlasciwosciRendereraSwobodnychBlokow) {
  return bloki.filter((blok) => czyBlokWidocznyNaStronie(blok, numerStrony)).map((blok) => {
    const stylPolozenia = pobierzStylPolozenia(blok)

    if (blok.typ === 'tekst') {
      return (
        <div
          data-blok-swobodny={blok.id}
          data-tryb-renderowania={trybRenderowania}
          key={blok.id}
          style={{
            ...stylPolozenia,
            color: blok.dane.kolor,
            fontFamily: blok.dane.rodzinaCzcionki,
            fontSize: `${blok.dane.rozmiarCzcionkiPt * 0.168}cqw`,
            fontWeight: blok.dane.gruboscCzcionki,
            fontStyle: blok.dane.kursywa ? 'italic' : 'normal',
            textDecoration: blok.dane.podkreslenie ? 'underline' : 'none',
            lineHeight: blok.dane.interlinia,
            textAlign: wyrownanieCss[blok.dane.wyrownanie],
            padding: `${(blok.dane.marginesWewnetrznyMm ?? 0) / 2.1}cqw`,
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
        data-tryb-renderowania={trybRenderowania}
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
