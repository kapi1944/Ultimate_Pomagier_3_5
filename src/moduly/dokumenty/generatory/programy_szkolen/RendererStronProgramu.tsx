import { Fragment, useMemo, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import { geometriaStronyProgramu, pobierzWymiaryStronyProgramu } from './geometriaStronyProgramu'
import type { FragmentDniaProgramu, FragmentModuluProgramu, GrupaPunktowProgramu, ModelPaginacjiProgramu, StronaProgramu } from './paginatorProgramu'
import { utworzModelPaginacjiProgramu, utworzModelPaginacjiProgramuDlaTekstuSurowego } from './paginatorProgramu'
import {
  RendererFragmentuDniaProgramu,
  RendererFragmentuModuluProgramu,
  type WlasciwosciWygladuTrescProgramu,
} from './RendererPodgladuProgramu'
import { usePaginacjaProgramu } from './usePaginacjaProgramu'
import logotypSemper from './zasoby/logotyp-semper.png'
import mapaPolskiSemper from './zasoby/mapa-polski-semper.png'
import {
  pobierzElementyIdentyfikacjiProgramu,
  profileOrganizatorowProgramu,
  type ElementyIdentyfikacjiProgramu,
  type PresetWygladuProgramu,
} from './presetyProgramu'

type WlasciwosciRendereraStronProgramu = WlasciwosciWygladuTrescProgramu & {
  dokument: DokumentBlokowy
  preset: PresetWygladuProgramu
  profilFirmy: 'semper' | 'iist'
  tytul: string
  elementyIdentyfikacji?: Partial<ElementyIdentyfikacjiProgramu>
  czyJustowac: boolean
  logotypUzytkownika?: string
  szerokoscLogotypu: number
  gruboscObramowaniaTytulu: number
  nazwaOrganizatora: string
  kontaktOrganizatora: string
  stopkaOrganizatora: string
  czyFormatowanieSkryptowe: boolean
  tekstSurowy: string
}

type WlasciwosciStronyFizycznej = {
  strona?: StronaProgramu
  pierwszaStrona: boolean
  preset: PresetWygladuProgramu
  profilFirmy: 'semper' | 'iist'
  tytul: string
  elementy: ElementyIdentyfikacjiProgramu
  wyglad: WlasciwosciWygladuTrescProgramu
  czyJustowac: boolean
  logotypUzytkownika?: string
  szerokoscLogotypu: number
  gruboscObramowaniaTytulu: number
  nazwaOrganizatora: string
  kontaktOrganizatora: string
  stopkaOrganizatora: string
  atrybutyStrony?: Record<string, string | true>
  atrybutyTresci?: Record<string, string>
  zawartosc?: ReactNode
}

function RendererZawartosciStrony({ strona, wyglad }: { strona?: StronaProgramu; wyglad: WlasciwosciWygladuTrescProgramu }) {
  if (!strona?.fragmentyDni.length) {
    return <div className="program-kartka-a4__pusty">Brak treści programu.</div>
  }

  return (
    <>
      {strona.fragmentyDni.map((fragmentDnia) => (
        <RendererFragmentuDniaProgramu fragment={fragmentDnia} key={fragmentDnia.dzien.id} wyglad={wyglad} />
      ))}
    </>
  )
}

function StronaFizycznaProgramu({
  strona,
  pierwszaStrona,
  preset,
  profilFirmy,
  tytul,
  elementy,
  wyglad,
  czyJustowac,
  logotypUzytkownika,
  szerokoscLogotypu,
  gruboscObramowaniaTytulu,
  nazwaOrganizatora,
  kontaktOrganizatora,
  stopkaOrganizatora,
  atrybutyStrony,
  atrybutyTresci,
  zawartosc,
}: WlasciwosciStronyFizycznej) {
  const profil = profileOrganizatorowProgramu[profilFirmy]
  const tresc = zawartosc ?? <RendererZawartosciStrony strona={strona} wyglad={wyglad} />

  if (preset === 'DOTYCHCZASOWY') {
    return (
      <article className="program-dotychczasowy__strona program-kartka-a4" {...atrybutyStrony}>
        <header className="program-kartka-a4__naglowek" style={{ borderColor: wyglad.kolorAkcentu }}>
          <div className="program-kartka-a4__meta">
            <div className="program-kartka-a4__profil">{nazwaOrganizatora}</div>
            <div className="program-kartka-a4__kontakt">{kontaktOrganizatora}</div>
          </div>
          {pierwszaStrona && logotypUzytkownika && (
            <div className="program-kartka-a4__logotyp">
              <img alt="Logotyp" src={logotypUzytkownika} style={{ width: `${szerokoscLogotypu}%` }} />
            </div>
          )}
          {pierwszaStrona && <div className="program-kartka-a4__etykieta">Program szkolenia</div>}
          {pierwszaStrona && (
            <div
              className="program-kartka-a4__tytul"
              style={{ borderWidth: `${gruboscObramowaniaTytulu}px`, color: wyglad.kolorAkcentu }}
            >
              {tytul || '„Program szkolenia”'}
            </div>
          )}
        </header>
        <main className="program-dotychczasowy__tresc program-kartka-a4__tresc" {...atrybutyTresci}>{tresc}</main>
        <footer className="program-kartka-a4__stopka">{stopkaOrganizatora}</footer>
      </article>
    )
  }

  return (
    <article className="program-semper__strona" {...atrybutyStrony}>
      {elementy.naglowekKontaktowy && (
        <header className="program-semper__naglowek" data-testid="program-strona-naglowek">
          {elementy.gornySzaryPas && <div className="program-semper__pas" aria-hidden="true" />}
          <div className="program-semper__kontakt-etykieta">Kontakt:</div>
          <div className="program-semper__kontakt"><span>{profil.strona}</span><span>{profil.email}</span></div>
          <div className="program-semper__kontakt"><span>tel.: {profil.telefon}</span><span>fax: {profil.fax}</span></div>
          {elementy.logoOrganizatora && profilFirmy === 'semper' && <img className="program-semper__logo" src={logotypSemper} alt="SEMPER" />}
        </header>
      )}
      {pierwszaStrona && elementy.etykietaProgramu && <div className="program-semper__etykieta">Program szkolenia</div>}
      {pierwszaStrona && elementy.panelTytulu && <div className="program-semper__panel-tytulu">{tytul || 'Program szkolenia'}</div>}
      <main className={`program-semper__tresc${czyJustowac ? ' program-semper__tresc--justowana' : ''}`} {...atrybutyTresci}>{tresc}</main>
      <footer className="program-semper__stopka" data-testid="program-strona-stopka">
        {elementy.numerStrony && <div className="program-semper__numer-strony">Strona | {strona?.numer ?? 1}</div>}
        {elementy.stopkaFirmowa && <div className="program-semper__stopka-pas"><div><strong>{profil.nazwa}</strong><br />NIP {profil.nip} REGON {profil.regon}<br />{profil.adres}</div>{elementy.hasloMarki && <div>{profil.haslo}</div>}</div>}
        {elementy.mapaPolski && profilFirmy === 'semper' && <img aria-hidden="true" className="program-semper__mapa" src={mapaPolskiSemper} alt="" />}
      </footer>
    </article>
  )
}

function utworzFragmentPomiarowyModulu(modul: ModelPaginacjiProgramu['dni'][number]['moduly'][number], czyPokazacTytul: boolean, grupyPunktow: GrupaPunktowProgramu[]): FragmentModuluProgramu {
  return { modul, grupyPunktow, czyPokazacTytul, poczatkowyIndeksNumeracji: 0 }
}

function utworzFragmentPomiarowyDnia(dzien: ModelPaginacjiProgramu['dni'][number]): FragmentDniaProgramu {
  return { dzien, czyPokazacNaglowek: Boolean(dzien.blok?.tresc), moduly: [] }
}

function ObszarPomiaruProgramu({
  obszarPomiarowyRef,
  model,
  wlasciwosciStrony,
}: {
  obszarPomiarowyRef: RefObject<HTMLDivElement>
  model: ModelPaginacjiProgramu
  wlasciwosciStrony: Omit<WlasciwosciStronyFizycznej, 'strona' | 'pierwszaStrona' | 'zawartosc' | 'atrybutyStrony' | 'atrybutyTresci'>
}) {
  const moduly = model.dni.flatMap((dzien) => dzien.moduly)

  return (
    <div aria-hidden="true" className="program-pomiar" ref={obszarPomiarowyRef}>
      <StronaFizycznaProgramu
        {...wlasciwosciStrony}
        pierwszaStrona
        atrybutyTresci={{ 'data-pomiar-pojemnosci': 'pierwsza' }}
        zawartosc={<div />}
      />
      <StronaFizycznaProgramu
        {...wlasciwosciStrony}
        pierwszaStrona={false}
        atrybutyTresci={{ 'data-pomiar-pojemnosci': 'kolejna' }}
        zawartosc={<div />}
      />
      <StronaFizycznaProgramu
        {...wlasciwosciStrony}
        pierwszaStrona={false}
        zawartosc={
          <div>
            {model.dni.map((dzien) => (
              <RendererFragmentuDniaProgramu
                atrybutyPomiaru={{ 'data-pomiar-dnia': '', 'data-pomiar-naglowka-dnia': dzien.id }}
                fragment={utworzFragmentPomiarowyDnia(dzien)}
                key={`naglowek-${dzien.id}`}
                wyglad={wlasciwosciStrony.wyglad}
              />
            ))}
            <div className="program-kartka-a4__moduly" data-pomiar-modulow="">
              {moduly.map((modul) => (
                <Fragment key={`pomiary-${modul.id}`}>
                  <RendererFragmentuModuluProgramu
                    atrybutyPomiaru={{ 'data-pomiar-modulu': modul.id, 'data-pomiar-modulu-calego': modul.id }}
                    fragment={utworzFragmentPomiarowyModulu(modul, true, modul.grupyPunktow)}
                    indeksModulu={0}
                    wyglad={wlasciwosciStrony.wyglad}
                  />
                  <RendererFragmentuModuluProgramu
                    atrybutyPomiaru={{ 'data-pomiar-modulu-baza-z-tytulem': modul.id }}
                    czyUkrywacPusty
                    fragment={utworzFragmentPomiarowyModulu(modul, true, [])}
                    indeksModulu={0}
                    wyglad={wlasciwosciStrony.wyglad}
                  />
                  <RendererFragmentuModuluProgramu
                    atrybutyPomiaru={{ 'data-pomiar-modulu-baza-bez-tytulu': modul.id }}
                    czyUkrywacPusty
                    fragment={utworzFragmentPomiarowyModulu(modul, false, [])}
                    indeksModulu={0}
                    wyglad={wlasciwosciStrony.wyglad}
                  />
                  <RendererFragmentuModuluProgramu
                    atrybutyPomiaru={{ 'data-pomiar-modulu-kolejnego': modul.id }}
                    fragment={utworzFragmentPomiarowyModulu(modul, true, modul.grupyPunktow)}
                    indeksModulu={1}
                    wyglad={wlasciwosciStrony.wyglad}
                  />
                  <RendererFragmentuModuluProgramu
                    atrybutyPomiaruGrup={(grupa) => ({ 'data-pomiar-grupy': `${modul.id}|${grupa.id}` })}
                    atrybutyPomiaruListy={{ 'data-pomiar-listy': '' }}
                    fragment={utworzFragmentPomiarowyModulu(modul, false, modul.grupyPunktow)}
                    indeksModulu={0}
                    wyglad={wlasciwosciStrony.wyglad}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        }
      />
    </div>
  )
}

export default function RendererStronProgramu({
  dokument,
  preset,
  profilFirmy,
  tytul,
  elementyIdentyfikacji: nadpisania,
  czyJustowac,
  logotypUzytkownika,
  szerokoscLogotypu,
  gruboscObramowaniaTytulu,
  nazwaOrganizatora,
  kontaktOrganizatora,
  stopkaOrganizatora,
  czyFormatowanieSkryptowe,
  tekstSurowy,
  ...wyglad
}: WlasciwosciRendereraStronProgramu) {
  const model = useMemo(
    () => czyFormatowanieSkryptowe ? utworzModelPaginacjiProgramu(dokument) : utworzModelPaginacjiProgramuDlaTekstuSurowego(tekstSurowy),
    [czyFormatowanieSkryptowe, dokument, tekstSurowy],
  )
  const elementy = pobierzElementyIdentyfikacjiProgramu(preset, nadpisania)
  const wymiaryStrony = pobierzWymiaryStronyProgramu()
  const stylGeometrii = {
    '--program-szerokosc-strony': wymiaryStrony.szerokosc,
    '--program-wysokosc-strony': wymiaryStrony.wysokosc,
    '--program-odstep-gorny': `${geometriaStronyProgramu.odstepGornyMm}mm`,
    '--program-odstep-poziomy': `${geometriaStronyProgramu.odstepPoziomyMm}mm`,
    '--program-wysokosc-stopki': `${geometriaStronyProgramu.wysokoscStopkiMm}mm`,
  } as CSSProperties
  const kluczUkladu = JSON.stringify({ dokument: dokument.struktura, tekstSurowy, czyFormatowanieSkryptowe, preset, profilFirmy, tytul, elementy, czyJustowac, logotypUzytkownika, szerokoscLogotypu, gruboscObramowaniaTytulu, wyglad })
  const { obszarPomiarowyRef, wynik, czyPomiaryGotowe } = usePaginacjaProgramu(model, kluczUkladu)
  const wlasciwosciStrony = {
    preset,
    profilFirmy,
    tytul,
    elementy,
    wyglad,
    czyJustowac,
    logotypUzytkownika,
    szerokoscLogotypu,
    gruboscObramowaniaTytulu,
    nazwaOrganizatora,
    kontaktOrganizatora,
    stopkaOrganizatora,
  }

  return (
    <div className={`program-strony program-strony--${preset.toLowerCase()}`} data-testid="program-strony" style={stylGeometrii}>
      <ObszarPomiaruProgramu model={model} obszarPomiarowyRef={obszarPomiarowyRef} wlasciwosciStrony={wlasciwosciStrony} />
      {czyPomiaryGotowe && wynik ? (
        wynik.strony.map((strona) => (
          <StronaFizycznaProgramu
            {...wlasciwosciStrony}
            atrybutyStrony={{ 'data-strona-dokumentu': true, 'data-testid': 'program-strona' }}
            pierwszaStrona={strona.numer === 1}
            key={`strona-${strona.numer}`}
            strona={strona}
          />
        ))
      ) : (
        <div className="program-strony__oczekiwanie">Trwa pomiar układu stron…</div>
      )}
      {wynik?.problemy.length ? <div className="program-strony__problemy" role="alert">{wynik.problemy.map((problem) => <p key={problem.id}>{problem.komunikat}</p>)}</div> : null}
    </div>
  )
}
