import KartaGrupySzkoleniowej from '../komponenty/KartaGrupySzkoleniowej'
import PanelAdresatow from '../komponenty/PanelAdresatow'
import PanelImportuEksportu from '../komponenty/PanelImportuEksportu'
import PanelPodgladuSzczegolow from '../komponenty/PanelPodgladuSzczegolow'
import { PoleTekstowe, PoleTekstoweWielowierszowe, PoleWyboru } from '../komponenty/PolaSzczegolow'
import SekcjaDanychKlienta from '../komponenty/SekcjaDanychKlienta'
import SekcjaDokumentacjiMaterialow from '../komponenty/SekcjaDokumentacjiMaterialow'
import SekcjaFormularza from '../komponenty/SekcjaFormularza'
import SekcjaKontaktuOrganizacyjnego from '../komponenty/SekcjaKontaktuOrganizacyjnego'
import SekcjaUczestnikow from '../komponenty/SekcjaUczestnikow'
import { useGeneratorSzczegolow } from '../hooki/useGeneratorSzczegolow'
import { statusySzczegolow } from '../stale'
import type { DaneFormularza, OrganizatorSzkolenia, StatusSzczegolow } from '../typy'
import './widokNowychSzczegolowOrganizacyjnych.css'

const sekcjeNawigacji = [
  ['podstawowe', 'Podstawowe'],
  ['dane-klienta', 'Dane klienta'],
  ['kontakt-organizacyjny', 'Kontakt'],
  ['grupy-terminy', 'Grupy'],
  ['dokumentacja-materialy', 'Dokumentacja'],
  ['uczestnicy', 'Uczestnicy'],
  ['program-szkolenia', 'Program'],
  ['uwagi', 'Uwagi'],
]

export default function WidokNowychSzczegolowOrganizacyjnych() {
  const generator = useGeneratorSzczegolow()
  const pierwszaGrupa = generator.grupy[0]

  function ustawStatus(status: StatusSzczegolow) {
    generator.aktualizujDane((dane) => ({ ...dane, status }), 'status')
  }

  function renderujPoleUwagi(klucz: keyof DaneFormularza['uwagi'], etykieta: string) {
    if (!generator.czyWidocznaUwaga(klucz)) {
      return null
    }

    return (
      <PoleTekstoweWielowierszowe
        etykieta={etykieta}
        pole={`uwagi.${klucz}`}
        statusyPol={generator.statusyPol}
        wartosc={generator.daneFormularza.uwagi[klucz]}
        ustawWartosc={(wartosc) =>
          generator.aktualizujDane(
            (dane) => ({
              ...dane,
              uwagi: {
                ...dane.uwagi,
                [klucz]: wartosc,
              },
            }),
            `uwagi.${klucz}`,
          )
        }
      />
    )
  }

  return (
    <section className="widok szczegoly-organizacyjne">
      <header className="szczegoly-naglowek">
        <div>
          <h1>Nowe szczegóły organizacyjne</h1>
          <p>Generator szczegółów dla szkoleń zamkniętych.</p>
        </div>
        <label className="szczegoly-uzytkownik">
          <span>Użytkownik testowy</span>
          <select value={generator.aktywnyUzytkownikId} onChange={(zdarzenie) => generator.ustawAktywnyUzytkownikId(zdarzenie.target.value)}>
            {generator.lokalniUzytkownicy.map((uzytkownik) => (
              <option key={uzytkownik.id} value={uzytkownik.id}>
                {uzytkownik.nazwa} - {uzytkownik.rola}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="szczegoly-gorna-belka" aria-label="Sekcje generatora">
        <div className="szczegoly-gorna-belka__linki">
          {sekcjeNawigacji.map(([id, etykieta]) => (
            <a href={`#${id}`} key={id}>
              {etykieta}
            </a>
          ))}
        </div>
        <div className="szczegoly-statusy">
          {statusySzczegolow.map((status) => (
            <button
              className={status === generator.daneFormularza.status ? 'szczegoly-status szczegoly-status--aktywny' : 'szczegoly-status'}
              key={status}
              type="button"
              onClick={() => ustawStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </nav>

      <div className="szczegoly-uklad">
        <aside className="szczegoly-lewy-panel">
          <PanelImportuEksportu
            komunikat={generator.komunikat}
            trescMaila={generator.trescMaila}
            ustawTrescMaila={generator.ustawTrescMaila}
            obsluzImportMaila={generator.obsluzImportMaila}
            importujJson={generator.importujJson}
            eksportujJson={generator.eksportujJson}
            eksportujDoc={generator.eksportujDoc}
            drukujPdf={generator.drukujPdf}
            pokazKomunikatImportuDokumentow={generator.pokazKomunikatImportuDokumentow}
          />
          <PanelAdresatow
            adresaci={generator.adresaci}
            wszyscyAdresaci={generator.wszyscyAdresaci}
            ustawAdresaci={generator.ustawAdresaci}
            utworzLinkMailto={generator.utworzLinkMailto}
          />
          <PanelPodgladuSzczegolow
            kopieRobocze={generator.kopieRobocze}
            podgladSzczegolow={generator.podgladSzczegolow}
            rozpoznaneObszary={generator.rozpoznaneObszary}
            wczytajWersje={generator.wczytajWersje}
          />
        </aside>

        <div className="szczegoly-formularz">
          <SekcjaFormularza id="podstawowe" tytul="Podstawowe informacje">
            <div className="szczegoly-siatka szczegoly-siatka--dwa">
              <PoleTekstowe
                etykieta="Tytuł szkolenia"
                pole="tytulSzkolenia"
                statusyPol={generator.statusyPol}
                wartosc={generator.daneFormularza.tytulSzkolenia}
                ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, tytulSzkolenia: wartosc }), 'tytulSzkolenia')}
              />
              <PoleWyboru
                etykieta="Organizator"
                pole="organizator"
                statusyPol={generator.statusyPol}
                opcje={['SEMPER', 'IIST']}
                wartosc={generator.daneFormularza.organizator}
                ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, organizator: wartosc as OrganizatorSzkolenia }), 'organizator')}
              />
            </div>
          </SekcjaFormularza>

          <SekcjaDanychKlienta dane={generator.daneFormularza} statusyPol={generator.statusyPol} aktualizujDane={generator.aktualizujDane} />

          <SekcjaKontaktuOrganizacyjnego dane={generator.daneFormularza} statusyPol={generator.statusyPol} aktualizujDane={generator.aktualizujDane} />

          <SekcjaFormularza
            id="grupy-terminy"
            tytul="Grupy i terminy"
            akcje={
              <button type="button" onClick={generator.dodajGrupe}>
                Dodaj grupę
              </button>
            }
          >
            <div className="szczegoly-grupy">
              {generator.grupy.map((grupa, indeks) => (
                <KartaGrupySzkoleniowej
                  key={grupa.id}
                  grupa={grupa}
                  indeks={indeks}
                  statusyPol={generator.statusyPol}
                  czyKontaktWspolny={generator.daneFormularza.kontaktWspolnyDlaGrup}
                  trenerzyKartoteki={generator.trenerzyKartoteki}
                  aktualizujGrupe={generator.aktualizujGrupe}
                  usunGrupe={generator.usunGrupe}
                  dodajTreneraDoKartoteki={generator.dodajTreneraDoKartoteki}
                  dodajTreneraDoGrupy={generator.dodajTreneraDoGrupy}
                  usunTreneraZGrupy={generator.usunTreneraZGrupy}
                  zastosujTreneraDoWszystkichGrup={generator.zastosujTreneraDoWszystkichGrup}
                />
              ))}
            </div>
          </SekcjaFormularza>

          <SekcjaDokumentacjiMaterialow
            dane={generator.daneFormularza}
            statusyPol={generator.statusyPol}
            aktualizujDane={generator.aktualizujDane}
            zastosujDokumentacjeDoKazdejGrupy={generator.zastosujDokumentacjeDoKazdejGrupy}
          />

          {pierwszaGrupa && <SekcjaUczestnikow grupa={pierwszaGrupa} statusyPol={generator.statusyPol} aktualizujGrupe={generator.aktualizujGrupe} />}

          <SekcjaFormularza id="program-szkolenia" tytul="Program szkolenia">
            <PoleTekstoweWielowierszowe
              etykieta="Program szkolenia"
              pole="programSzkolenia"
              statusyPol={generator.statusyPol}
              wartosc={generator.daneFormularza.programSzkolenia}
              ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, programSzkolenia: wartosc }), 'programSzkolenia')}
            />
          </SekcjaFormularza>

          <SekcjaFormularza id="uwagi" tytul="Uwagi">
            <div className="szczegoly-siatka szczegoly-siatka--dwa">
              {renderujPoleUwagi('wewnetrzne', 'Uwagi wewnętrzne')}
              {renderujPoleUwagi('informacjeNiepewne', 'Informacje niepewne')}
              {renderujPoleUwagi('opiekuna', 'Uwagi Opiekuna')}
              {renderujPoleUwagi('dlaKlienta', 'Uwagi dla Klienta')}
              {renderujPoleUwagi('dlaTrenera', 'Uwagi dla Trenera')}
              {renderujPoleUwagi('dlaWysylaczy', 'Uwagi dla Wysyłaczy')}
            </div>
          </SekcjaFormularza>
        </div>
      </div>

      <footer className="szczegoly-dolna-belka">
        <button type="button" onClick={generator.zapiszWersje}>
          Zapisz wersję roboczą
        </button>
        <button type="button" onClick={generator.wprowadzSzkolenie}>
          Wprowadź to szkolenie
        </button>
        <button type="button" onClick={generator.wyczyscFormularz}>
          Wyczyść formularz
        </button>
      </footer>
    </section>
  )
}
