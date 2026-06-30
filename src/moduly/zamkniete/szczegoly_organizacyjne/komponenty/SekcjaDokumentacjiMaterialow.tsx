import type { DaneDokumentacjiMaterialow, DaneFormularza, StatusyPolImportu } from '../typy'
import { PoleCheckbox, PoleTekstowe, PoleTekstoweWielowierszowe, PoleWyboru, PoleLiczbowe } from './PolaSzczegolow'
import SekcjaFormularza from './SekcjaFormularza'

type WlasciwosciSekcjiDokumentacji = {
  dane: DaneFormularza
  statusyPol: StatusyPolImportu
  aktualizujDane: (aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) => void
  zastosujDokumentacjeDoKazdejGrupy: () => void
}

function aktualizujDokumentacje(
  dokumentacja: DaneDokumentacjiMaterialow,
  klucz: keyof DaneDokumentacjiMaterialow,
  wartosc: DaneDokumentacjiMaterialow[keyof DaneDokumentacjiMaterialow],
) {
  return {
    ...dokumentacja,
    [klucz]: wartosc,
  }
}

export default function SekcjaDokumentacjiMaterialow({
  dane,
  statusyPol,
  aktualizujDane,
  zastosujDokumentacjeDoKazdejGrupy,
}: WlasciwosciSekcjiDokumentacji) {
  function obsluzLogo(plik: File | undefined) {
    if (!plik) {
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      aktualizujDane(
        (obecne) => ({
          ...obecne,
          logotypy: {
            ...obecne.logotypy,
            nazwaPliku: plik.name,
            podglad: String(czytnik.result ?? ''),
          },
        }),
        'logotypy.nazwaPliku',
      )
    }
    czytnik.readAsDataURL(plik)
  }

  return (
    <SekcjaFormularza
      id="dokumentacja-materialy"
      tytul="Dokumentacja i materiały"
      akcje={
        <button type="button" onClick={zastosujDokumentacjeDoKazdejGrupy}>
          Zastosuj do każdej grupy
        </button>
      }
    >
      <div className="szczegoly-flagi">
        {[
          ['listaObecnosci', 'Lista obecności'],
          ['ankiety', 'Ankiety'],
          ['certyfikaty', 'Certyfikaty'],
          ['program', 'Program'],
          ['kartaInformacyjna', 'Karta informacyjna'],
          ['materialyInspekcyjne', 'Materiały inspekcyjne'],
          ['podreczniki', 'Podręczniki'],
          ['materialyDodatkowe', 'Materiały dodatkowe'],
          ['testPrzedPo', 'Przed/po teście'],
          ['dostepnoscCyfrowa', 'Dostępność cyfrowa'],
          ['kompletDlaZamawiajacego', '+1 komplet dla zamawiającego'],
          ['wzorKlienta', 'Wzór klienta'],
        ].map(([klucz, etykieta]) => (
          <PoleCheckbox
            key={klucz}
            etykieta={etykieta}
            pole={`dokumentacja.${klucz}`}
            statusyPol={statusyPol}
            zaznaczone={Boolean(dane.dokumentacja[klucz as keyof DaneDokumentacjiMaterialow])}
            ustawZaznaczone={(wartosc) =>
              aktualizujDane(
                (obecne) => ({
                  ...obecne,
                  dokumentacja: aktualizujDokumentacje(obecne.dokumentacja, klucz as keyof DaneDokumentacjiMaterialow, wartosc),
                }),
                `dokumentacja.${klucz}`,
              )
            }
          />
        ))}
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <PoleWyboru
          etykieta="Sposób dokumentu"
          pole="dokumentacja.sposobDokumentu"
          statusyPol={statusyPol}
          opcje={['druk', 'online']}
          wartosc={dane.dokumentacja.sposobDokumentu}
          ustawWartosc={(wartosc) =>
            aktualizujDane(
              (obecne) => ({ ...obecne, dokumentacja: { ...obecne.dokumentacja, sposobDokumentu: wartosc as DaneDokumentacjiMaterialow['sposobDokumentu'] } }),
              'dokumentacja.sposobDokumentu',
            )
          }
        />
        <PoleTekstoweWielowierszowe
          etykieta="Materiały"
          pole="materialy"
          statusyPol={statusyPol}
          wartosc={dane.materialy}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, materialy: wartosc }), 'materialy')}
        />
      </div>

      <PoleTekstoweWielowierszowe
        etykieta="Uwagi do dokumentacji"
        pole="dokumentacja.uwagi"
        statusyPol={statusyPol}
        wartosc={dane.dokumentacja.uwagi}
        ustawWartosc={(wartosc) =>
          aktualizujDane((obecne) => ({ ...obecne, dokumentacja: { ...obecne.dokumentacja, uwagi: wartosc } }), 'dokumentacja.uwagi')
        }
      />

      <section className="szczegoly-podsekcja">
        <h3>Logotypy</h3>
        <PoleCheckbox
          etykieta="Logotypy wymagane"
          pole="logotypy.czyWymagane"
          statusyPol={statusyPol}
          zaznaczone={dane.logotypy.czyWymagane}
          ustawZaznaczone={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, logotypy: { ...obecne.logotypy, czyWymagane: wartosc } }), 'logotypy.czyWymagane')}
        />
        <div className="szczegoly-siatka szczegoly-siatka--dwa">
          <label className="szczegoly-pole">
            <span className="szczegoly-pole__naglowek">Import pliku graficznego</span>
            <input accept="image/*" type="file" onChange={(zdarzenie) => obsluzLogo(zdarzenie.target.files?.[0])} />
          </label>
          <PoleTekstowe
            etykieta="Link do logotypu / Dysk Google"
            pole="logotypy.link"
            statusyPol={statusyPol}
            typ="url"
            wartosc={dane.logotypy.link}
            ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, logotypy: { ...obecne.logotypy, link: wartosc } }), 'logotypy.link')}
          />
        </div>
        {dane.logotypy.podglad && <img alt="Podgląd logotypu" className="szczegoly-logo-podglad" src={dane.logotypy.podglad} />}
        <div className="szczegoly-siatka szczegoly-siatka--dwa">
          <PoleTekstowe
            etykieta="Informacja o finansowaniu"
            pole="logotypy.informacjaOFinansowaniu"
            statusyPol={statusyPol}
            wartosc={dane.logotypy.informacjaOFinansowaniu}
            ustawWartosc={(wartosc) =>
              aktualizujDane((obecne) => ({ ...obecne, logotypy: { ...obecne.logotypy, informacjaOFinansowaniu: wartosc } }), 'logotypy.informacjaOFinansowaniu')
            }
          />
          <PoleTekstowe
            etykieta="Dodatkowe zastrzeżenie"
            pole="logotypy.zastrzezenie"
            statusyPol={statusyPol}
            wartosc={dane.logotypy.zastrzezenie}
            ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, logotypy: { ...obecne.logotypy, zastrzezenie: wartosc } }), 'logotypy.zastrzezenie')}
          />
        </div>
      </section>

      <section className="szczegoly-podsekcja">
        <h3>Dodatkowe wymogi</h3>
        <div className="szczegoly-flagi">
          <PoleCheckbox
            etykieta="Wcześniejszy przyjazd trenera"
            pole="dodatkoweWymogi.wczesniejszyPrzyjazdTrenera"
            statusyPol={statusyPol}
            zaznaczone={dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera}
            ustawZaznaczone={(wartosc) =>
              aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, wczesniejszyPrzyjazdTrenera: wartosc } }), 'dodatkoweWymogi.wczesniejszyPrzyjazdTrenera')
            }
          />
          <PoleCheckbox
            etykieta="Dokumentacja zdjęciowa"
            pole="dodatkoweWymogi.dokumentacjaZdjęciowa"
            statusyPol={statusyPol}
            zaznaczone={dane.dodatkoweWymogi.dokumentacjaZdjęciowa}
            ustawZaznaczone={(wartosc) =>
              aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, dokumentacjaZdjęciowa: wartosc } }), 'dodatkoweWymogi.dokumentacjaZdjęciowa')
            }
          />
          <PoleCheckbox
            etykieta="Kary za nieterminowość"
            pole="dodatkoweWymogi.karyZaNieterminowosc"
            statusyPol={statusyPol}
            zaznaczone={dane.dodatkoweWymogi.karyZaNieterminowosc}
            ustawZaznaczone={(wartosc) =>
              aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, karyZaNieterminowosc: wartosc } }), 'dodatkoweWymogi.karyZaNieterminowosc')
            }
          />
          <PoleCheckbox
            etykieta="Nowe szkolenie za ocenę"
            pole="dodatkoweWymogi.noweSzkolenieZaOcene"
            statusyPol={statusyPol}
            zaznaczone={dane.dodatkoweWymogi.noweSzkolenieZaOcene}
            ustawZaznaczone={(wartosc) =>
              aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, noweSzkolenieZaOcene: wartosc } }), 'dodatkoweWymogi.noweSzkolenieZaOcene')
            }
          />
          <PoleCheckbox
            etykieta="KFS"
            pole="dodatkoweWymogi.kfs"
            statusyPol={statusyPol}
            zaznaczone={dane.dodatkoweWymogi.kfs}
            ustawZaznaczone={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, kfs: wartosc } }), 'dodatkoweWymogi.kfs')}
          />
        </div>
        <PoleLiczbowe
          etykieta="Liczba minut wcześniejszego przyjazdu"
          pole="dodatkoweWymogi.minutyWczesniej"
          statusyPol={statusyPol}
          min={0}
          wartosc={dane.dodatkoweWymogi.minutyWczesniej}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, minutyWczesniej: wartosc } }), 'dodatkoweWymogi.minutyWczesniej')
          }
        />
        <PoleTekstoweWielowierszowe
          etykieta="Uwagi dodatkowe"
          pole="dodatkoweWymogi.uwagi"
          statusyPol={statusyPol}
          wartosc={dane.dodatkoweWymogi.uwagi}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, dodatkoweWymogi: { ...obecne.dodatkoweWymogi, uwagi: wartosc } }), 'dodatkoweWymogi.uwagi')}
        />
      </section>
    </SekcjaFormularza>
  )
}
