import type { ReactNode } from 'react'
import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import { pobierzGruboscTekstuPozycjiListyProgramu } from './stylPozycjiListyProgramu'

type StylDniPodgladu = 'pasek' | 'naglowek'
type SeparacjaModulowPodgladu = 'brak' | 'ramka' | 'linia' | 'separator-pytan'
type StylListyPodgladu = 'numeracja' | 'punktory'

type WlasciwosciRendereraPodgladuProgramu = {
  dokument: DokumentBlokowy
  kolorAkcentu: string
  stylDni: StylDniPodgladu
  separacjaModulow: SeparacjaModulowPodgladu
  stylPodpunktow: StylListyPodgladu
  stylListyGlownej: StylListyPodgladu
  stylePoziomowListy: string[]
  czyPogrubiacNaglowkiListyProgramu: boolean
}

function renderujMarkdownInline(tekst: string): ReactNode[] {
  const elementy: ReactNode[] = []
  const wzorzec = /(\*\*([^*]+)\*\*|\+\+([^+]+)\+\+|\*([^*\n]+)\*)/g
  let ostatniIndeks = 0
  let dopasowanie: RegExpExecArray | null = wzorzec.exec(tekst)

  while (dopasowanie) {
    if (dopasowanie.index > ostatniIndeks) {
      elementy.push(tekst.slice(ostatniIndeks, dopasowanie.index))
    }

    const klucz = `${dopasowanie.index}-${dopasowanie[0]}`

    if (dopasowanie[2]) {
      elementy.push(<strong key={klucz}>{dopasowanie[2]}</strong>)
    } else if (dopasowanie[3]) {
      elementy.push(<u key={klucz}>{dopasowanie[3]}</u>)
    } else if (dopasowanie[4]) {
      elementy.push(<em key={klucz}>{dopasowanie[4]}</em>)
    }

    ostatniIndeks = dopasowanie.index + dopasowanie[0].length
    dopasowanie = wzorzec.exec(tekst)
  }

  if (ostatniIndeks < tekst.length) {
    elementy.push(tekst.slice(ostatniIndeks))
  }

  return elementy.length ? elementy : [tekst]
}

function pobierzBlokiPoTypie(bloki: BlokDokumentu[], typ: BlokDokumentu['typ']) {
  return bloki.filter((blok) => blok.typ === typ)
}

export default function RendererPodgladuProgramu({
  dokument,
  kolorAkcentu,
  stylDni,
  separacjaModulow,
  stylPodpunktow,
  stylListyGlownej,
  stylePoziomowListy,
  czyPogrubiacNaglowkiListyProgramu,
}: WlasciwosciRendereraPodgladuProgramu) {
  const dni = pobierzBlokiPoTypie(dokument.struktura, 'Dzien')
  const punktyProste = dokument.struktura.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')

  function pobierzMarker(blok: BlokDokumentu, liczniki: number[], stylListy: StylListyPodgladu) {
    const poziom = Math.max(0, blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0)

    liczniki[poziom] = (liczniki[poziom] ?? 0) + 1
    liczniki.length = poziom + 1

    if (poziom === 0 && stylListy === 'numeracja') {
      return `${liczniki[0]}.`
    }

    return stylePoziomowListy[Math.min(poziom, stylePoziomowListy.length - 1)] ?? '•'
  }

  function renderujPunkty(bloki: BlokDokumentu[], stylListy: StylListyPodgladu) {
    const liczniki: number[] = []

    if (!bloki.length) {
      return <div className="program-kartka-a4__pusty">Brak podpunktów.</div>
    }

    return (
      <div className="program-kartka-a4__lista">
        {bloki.map((blok) => {
          const poziom = Math.max(0, blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0)

          return (
            <div
              className={`program-kartka-a4__pozycja${
                blok.statusDiagnostyczny === 'do_sprawdzenia' ? ' program-kartka-a4__pozycja--niepewna' : ''
              }`}
              key={blok.id}
              style={{
                marginLeft: `${Math.min(poziom, 8) * 22}px`,
              }}
            >
              <span className="program-kartka-a4__marker">{pobierzMarker(blok, liczniki, stylListy)}</span>
              <span style={{ fontWeight: pobierzGruboscTekstuPozycjiListyProgramu(poziom, czyPogrubiacNaglowkiListyProgramu) }}>
                {renderujMarkdownInline(blok.tresc ?? '')}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  if (!dni.length) {
    return punktyProste.length ? renderujPunkty(punktyProste, stylListyGlownej) : <div className="program-kartka-a4__pusty">Brak treści programu.</div>
  }

  return (
    <>
      {dni.map((dzien) => {
        const tematDnia = dzien.dzieci.find((blok) => blok.typ === 'Sekcja')
        const moduly = pobierzBlokiPoTypie(dzien.dzieci, 'Modul')

        return (
          <section className="program-kartka-a4__dzien" key={dzien.id}>
            {dzien.tresc && (
              <h2
                className={`program-kartka-a4__dzien-tytul program-kartka-a4__dzien-tytul--${stylDni}`}
                style={{
                  backgroundColor: stylDni === 'pasek' ? kolorAkcentu : 'transparent',
                  borderColor: kolorAkcentu,
                }}
              >
                {dzien.tresc}
                {tematDnia?.tresc && <span className="program-kartka-a4__temat-dnia">{renderujMarkdownInline(tematDnia.tresc)}</span>}
              </h2>
            )}

            <div className="program-kartka-a4__moduly">
              {moduly.map((modul, indeksModulu) => {
                const punkty = modul.dzieci.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')

                return (
                  <article
                    className={`program-kartka-a4__modul${
                      separacjaModulow === 'ramka' ? ' program-kartka-a4__modul--ramka' : ''
                    }${
                      separacjaModulow === 'separator-pytan' && indeksModulu > 0
                        ? ' program-kartka-a4__modul--separator-pytan'
                        : ''
                    }${modul.statusDiagnostyczny === 'do_sprawdzenia' ? ' program-kartka-a4__modul--niepewny' : ''}`}
                    key={modul.id}
                    style={separacjaModulow === 'separator-pytan' && indeksModulu > 0 ? { borderColor: kolorAkcentu } : undefined}
                  >
                    <h3
                      className={`program-kartka-a4__modul-tytul${
                        separacjaModulow === 'linia' ? ' program-kartka-a4__modul-tytul--linia' : ''
                      }`}
                    >
                      {renderujMarkdownInline(modul.tresc ?? '')}
                    </h3>
                    {renderujPunkty(punkty, stylPodpunktow)}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
