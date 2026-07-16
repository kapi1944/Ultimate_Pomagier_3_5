import type { DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import logotypSemper from './zasoby/logotyp-semper.png'
import mapaPolskiSemper from './zasoby/mapa-polski-semper.png'
import RendererPodgladuProgramu from './RendererPodgladuProgramu'
import {
  konfiguracjePresetowProgramu,
  pobierzElementyIdentyfikacjiProgramu,
  profileOrganizatorowProgramu,
  type ElementyIdentyfikacjiProgramu,
  type PresetWygladuProgramu,
} from './presetyProgramu'

type WlasciwosciRendereraStronSemper = {
  dokument: DokumentBlokowy
  preset: Exclude<PresetWygladuProgramu, 'DOTYCHCZASOWY'>
  profilFirmy: 'semper' | 'iist'
  tytul: string
  elementyIdentyfikacji?: Partial<ElementyIdentyfikacjiProgramu>
  czyJustowac: boolean
}

function podzielNaStrony<T>(elementy: T[], liczbaNaStronie: number) {
  return elementy.reduce<T[][]>((strony, element, indeks) => {
    const pozycjaStrony = Math.floor(indeks / liczbaNaStronie)
    strony[pozycjaStrony] ??= []
    strony[pozycjaStrony].push(element)
    return strony
  }, [])
}

function pobierzStrony(dokument: DokumentBlokowy, dlugoscTytulu: number) {
  const elementy = dokument.struktura.length ? dokument.struktura : []
  const mniejMiejscaNaPierwszejStronie = Math.min(3, Math.floor(dlugoscTytulu / 72))
  const liczbaNaStronie = Math.max(1, 3 - mniejMiejscaNaPierwszejStronie)
  return podzielNaStrony(elementy, liczbaNaStronie).length ? podzielNaStrony(elementy, liczbaNaStronie) : [[]]
}

export default function RendererStronSemper({ dokument, preset, profilFirmy, tytul, elementyIdentyfikacji: nadpisania, czyJustowac }: WlasciwosciRendereraStronSemper) {
  const konfiguracja = konfiguracjePresetowProgramu[preset]
  const elementy = pobierzElementyIdentyfikacjiProgramu(preset, nadpisania)
  const profil = profileOrganizatorowProgramu[profilFirmy]
  const strony = pobierzStrony(dokument, tytul.length)

  return (
    <div className={`program-semper program-semper--${preset.toLowerCase()}`} data-testid="program-semper">
      {strony.map((struktura, indeksStrony) => {
        const pierwszaStrona = indeksStrony === 0
        const dokumentStrony = { ...dokument, struktura }

        return (
          <article className="program-semper__strona" data-testid="program-semper-strona" key={`strona-${indeksStrony}`}>
            {elementy.naglowekKontaktowy && (
              <header className="program-semper__naglowek" data-testid="program-semper-naglowek">
                {elementy.gornySzaryPas && <div className="program-semper__pas" aria-hidden="true" />}
                <div className="program-semper__kontakt-etykieta">Kontakt:</div>
                <div className="program-semper__kontakt"><span>{profil.strona}</span><span>{profil.email}</span></div>
                <div className="program-semper__kontakt"><span>tel.: {profil.telefon}</span><span>fax: {profil.fax}</span></div>
                {elementy.logoOrganizatora && profilFirmy === 'semper' && <img className="program-semper__logo" src={logotypSemper} alt="SEMPER" />}
              </header>
            )}

            {pierwszaStrona && elementy.etykietaProgramu && <div className="program-semper__etykieta">Program szkolenia</div>}
            {pierwszaStrona && elementy.panelTytulu && <div className="program-semper__panel-tytulu" data-testid="program-semper-panel-tytulu">{tytul || 'Program szkolenia'}</div>}

            <main className={`program-semper__tresc${czyJustowac ? ' program-semper__tresc--justowana' : ''}`}>
              <RendererPodgladuProgramu
                czyPogrubiacNaglowkiListyProgramu
                dokument={dokumentStrony}
                kolorAkcentu={profil.kolor}
                separacjaModulow={konfiguracja.separacjaModulow}
                stylDni={konfiguracja.stylDni}
                stylListyGlownej={konfiguracja.stylListyGlownej}
                stylPodpunktow={konfiguracja.stylPodpunktow}
                stylePoziomowListy={['a)', 'b)', 'c)']}
              />
            </main>

            <footer className="program-semper__stopka" data-testid="program-semper-stopka">
              {elementy.numerStrony && <div className="program-semper__numer-strony">Strona | {indeksStrony + 1}</div>}
              {elementy.stopkaFirmowa && <div className="program-semper__stopka-pas"><div><strong>{profil.nazwa}</strong><br />NIP {profil.nip} REGON {profil.regon}<br />{profil.adres}</div>{elementy.hasloMarki && <div>{profil.haslo}</div>}</div>}
              {elementy.mapaPolski && profilFirmy === 'semper' && <img aria-hidden="true" className="program-semper__mapa" src={mapaPolskiSemper} alt="" />}
            </footer>
          </article>
        )
      })}
    </div>
  )
}
