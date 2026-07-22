import type { ReactNode } from 'react'
import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import type { FragmentDniaProgramu, FragmentModuluProgramu, GrupaPunktowProgramu } from './paginatorProgramu'
import { utworzModelPaginacjiProgramu } from './paginatorProgramu'
import { pobierzGruboscTekstuPozycjiListyProgramu } from './stylPozycjiListyProgramu'

type StylDniPodgladu = 'pasek' | 'naglowek'
type SeparacjaModulowPodgladu = 'brak' | 'ramka' | 'linia' | 'separator-pytan'
type StylListyPodgladu = 'numeracja' | 'punktory'

export type WlasciwosciWygladuTrescProgramu = {
  kolorAkcentu: string
  stylDni: StylDniPodgladu
  separacjaModulow: SeparacjaModulowPodgladu
  stylPodpunktow: StylListyPodgladu
  stylListyGlownej: StylListyPodgladu
  stylePoziomowListy: string[]
  czyPogrubiacNaglowkiListyProgramu: boolean
}

type WlasciwosciRendereraPodgladuProgramu = WlasciwosciWygladuTrescProgramu & {
  dokument: DokumentBlokowy
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

function pobierzPoziom(blok: BlokDokumentu) {
  return Math.max(0, blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0)
}

function pobierzMarker(blok: BlokDokumentu, liczniki: number[], stylListy: StylListyPodgladu, stylePoziomowListy: string[]) {
  const poziom = pobierzPoziom(blok)

  liczniki[poziom] = (liczniki[poziom] ?? 0) + 1
  liczniki.length = poziom + 1

  if (poziom === 0 && stylListy === 'numeracja') {
    return `${liczniki[0]}.`
  }

  return stylePoziomowListy[Math.min(poziom, stylePoziomowListy.length - 1)] ?? '•'
}

export function RendererGrupyPunktowProgramu({
  grupyPunktow,
  poczatkowyIndeksNumeracji,
  stylListy,
  stylePoziomowListy,
  czyPogrubiacNaglowkiListyProgramu,
  atrybutyPomiaru,
  atrybutyPomiaruListy,
  czyTrescSurowa,
}: {
  grupyPunktow: GrupaPunktowProgramu[]
  poczatkowyIndeksNumeracji: number
  stylListy: StylListyPodgladu
  stylePoziomowListy: string[]
  czyPogrubiacNaglowkiListyProgramu: boolean
  atrybutyPomiaru?: (grupa: GrupaPunktowProgramu) => Record<string, string>
  atrybutyPomiaruListy?: Record<string, string>
  czyTrescSurowa?: boolean
}) {
  const liczniki = [poczatkowyIndeksNumeracji]

  if (czyTrescSurowa) {
    return (
      <div className="program-kartka-a4__surowy" {...atrybutyPomiaruListy}>
        {grupyPunktow.map((grupa) => (
          <div className="program-kartka-a4__wiersz-surowy" key={grupa.id} {...atrybutyPomiaru?.(grupa)}>
            {renderujMarkdownInline(grupa.bloki.map((blok) => blok.tresc ?? '').join(' '))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="program-kartka-a4__lista" {...atrybutyPomiaruListy}>
      {grupyPunktow.map((grupa) => (
        <div className="program-kartka-a4__grupa-punktow" key={grupa.id} {...atrybutyPomiaru?.(grupa)}>
          {grupa.bloki.map((blok) => {
            const poziom = pobierzPoziom(blok)

            return (
              <div
                className={`program-kartka-a4__pozycja${
                  blok.statusDiagnostyczny === 'do_sprawdzenia' ? ' program-kartka-a4__pozycja--niepewna' : ''
                }`}
                key={blok.id}
                style={{ marginLeft: `${Math.min(poziom, 8) * 22}px` }}
              >
                <span className="program-kartka-a4__marker">{pobierzMarker(blok, liczniki, stylListy, stylePoziomowListy)}</span>
                <span style={{ fontWeight: pobierzGruboscTekstuPozycjiListyProgramu(poziom, czyPogrubiacNaglowkiListyProgramu) }}>
                  {renderujMarkdownInline(blok.tresc ?? '')}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function RendererFragmentuModuluProgramu({
  fragment,
  indeksModulu,
  wyglad,
  atrybutyPomiaru,
  atrybutyPomiaruGrup,
  atrybutyPomiaruListy,
  czyUkrywacPusty,
}: {
  fragment: FragmentModuluProgramu
  indeksModulu: number
  wyglad: WlasciwosciWygladuTrescProgramu
  atrybutyPomiaru?: Record<string, string>
  atrybutyPomiaruGrup?: (grupa: GrupaPunktowProgramu) => Record<string, string>
  atrybutyPomiaruListy?: Record<string, string>
  czyUkrywacPusty?: boolean
}) {
  const { modul, grupyPunktow, czyPokazacTytul, poczatkowyIndeksNumeracji } = fragment
  const { kolorAkcentu, separacjaModulow, stylPodpunktow, stylListyGlownej, stylePoziomowListy, czyPogrubiacNaglowkiListyProgramu } = wyglad
  const stylListy = modul.id === 'lista-prosta-programu' ? stylListyGlownej : stylPodpunktow
  const czyTrescSurowa = modul.trybTresc === 'surowa'

  return (
    <article
      className={`program-kartka-a4__modul${
        separacjaModulow === 'ramka' ? ' program-kartka-a4__modul--ramka' : ''
      }${
        separacjaModulow === 'separator-pytan' && indeksModulu > 0
          ? ' program-kartka-a4__modul--separator-pytan'
          : ''
      }${modul.blok.statusDiagnostyczny === 'do_sprawdzenia' ? ' program-kartka-a4__modul--niepewny' : ''}`}
      style={separacjaModulow === 'separator-pytan' && indeksModulu > 0 ? { borderColor: kolorAkcentu } : undefined}
      {...atrybutyPomiaru}
    >
      {czyPokazacTytul && modul.blok.tresc && (
        <h3 className={`program-kartka-a4__modul-tytul${separacjaModulow === 'linia' ? ' program-kartka-a4__modul-tytul--linia' : ''}`}>
          {renderujMarkdownInline(modul.blok.tresc)}
        </h3>
      )}
      {grupyPunktow.length ? (
        <RendererGrupyPunktowProgramu
          czyPogrubiacNaglowkiListyProgramu={czyPogrubiacNaglowkiListyProgramu}
          grupyPunktow={grupyPunktow}
          poczatkowyIndeksNumeracji={poczatkowyIndeksNumeracji}
          stylListy={stylListy}
          stylePoziomowListy={stylePoziomowListy}
          atrybutyPomiaru={atrybutyPomiaruGrup}
          atrybutyPomiaruListy={atrybutyPomiaruListy}
          czyTrescSurowa={czyTrescSurowa}
        />
      ) : !czyUkrywacPusty ? (
        <div className="program-kartka-a4__pusty">Brak podpunktów.</div>
      ) : null}
    </article>
  )
}

export function RendererFragmentuDniaProgramu({
  fragment,
  wyglad,
  atrybutyPomiaru,
}: {
  fragment: FragmentDniaProgramu
  wyglad: WlasciwosciWygladuTrescProgramu
  atrybutyPomiaru?: Record<string, string>
}) {
  const { dzien, czyPokazacNaglowek, moduly } = fragment

  return (
    <section className="program-kartka-a4__dzien" {...atrybutyPomiaru}>
      {czyPokazacNaglowek && dzien.blok?.tresc && (
        <h2
          className={`program-kartka-a4__dzien-tytul program-kartka-a4__dzien-tytul--${wyglad.stylDni}`}
          style={{
            backgroundColor: wyglad.stylDni === 'pasek' ? wyglad.kolorAkcentu : 'transparent',
            borderColor: wyglad.kolorAkcentu,
          }}
        >
          {dzien.blok.tresc}
          {dzien.temat?.tresc && <span className="program-kartka-a4__temat-dnia">{renderujMarkdownInline(dzien.temat.tresc)}</span>}
        </h2>
      )}
      <div className="program-kartka-a4__moduly">
        {moduly.map((modul, indeksModulu) => (
          <RendererFragmentuModuluProgramu fragment={modul} indeksModulu={indeksModulu} key={`${modul.modul.id}-${modul.poczatkowyIndeksNumeracji}`} wyglad={wyglad} />
        ))}
      </div>
    </section>
  )
}

export default function RendererPodgladuProgramu({ dokument, ...wyglad }: WlasciwosciRendereraPodgladuProgramu) {
  const model = utworzModelPaginacjiProgramu(dokument)

  if (!model.dni.length) {
    return <div className="program-kartka-a4__pusty">Brak treści programu.</div>
  }

  return (
    <>
      {model.dni.map((dzien) => (
        <RendererFragmentuDniaProgramu
          fragment={{
            dzien,
            czyPokazacNaglowek: Boolean(dzien.blok?.tresc),
            moduly: dzien.moduly.map((modul) => ({
              modul,
              grupyPunktow: modul.grupyPunktow,
              czyPokazacTytul: true,
              poczatkowyIndeksNumeracji: 0,
            })),
          }}
          key={dzien.id}
          wyglad={wyglad}
        />
      ))}
    </>
  )
}
