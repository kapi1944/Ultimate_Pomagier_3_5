import type { DaneFormularza, StatusyPolImportu } from '../typy'
import { PoleCheckbox, PoleTekstowe, PoleTekstoweWielowierszowe } from './PolaSzczegolow'
import SekcjaFormularza from './SekcjaFormularza'

type WlasciwosciSekcjiDanychKlienta = {
  dane: DaneFormularza
  statusyPol: StatusyPolImportu
  aktualizujDane: (aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) => void
}

export default function SekcjaDanychKlienta({ dane, statusyPol, aktualizujDane }: WlasciwosciSekcjiDanychKlienta) {
  return (
    <SekcjaFormularza id="dane-klienta" tytul="Dane klienta">
      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Nabywca"
          pole="nabywca.nazwa"
          statusyPol={statusyPol}
          wartosc={dane.nabywca.nazwa}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, nabywca: { ...obecne.nabywca, nazwa: wartosc } }), 'nabywca.nazwa')}
        />
        <PoleTekstowe
          etykieta="NIP"
          pole="nabywca.nip"
          statusyPol={statusyPol}
          wartosc={dane.nabywca.nip}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, nabywca: { ...obecne.nabywca, nip: wartosc } }), 'nabywca.nip')}
        />
        <PoleTekstowe
          etykieta="Odbiorca"
          pole="odbiorca.nazwa"
          statusyPol={statusyPol}
          wartosc={dane.odbiorca.nazwa}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, odbiorca: { ...obecne.odbiorca, nazwa: wartosc } }), 'odbiorca.nazwa')}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <PoleTekstoweWielowierszowe
          etykieta="Adres nabywcy"
          pole="nabywca.adres"
          statusyPol={statusyPol}
          wartosc={dane.nabywca.adres}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, nabywca: { ...obecne.nabywca, adres: wartosc } }), 'nabywca.adres')}
        />
        <PoleTekstoweWielowierszowe
          etykieta="Adres odbiorcy"
          pole="odbiorca.adres"
          statusyPol={statusyPol}
          wartosc={dane.odbiorca.adres}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, odbiorca: { ...obecne.odbiorca, adres: wartosc } }), 'odbiorca.adres')}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <PoleCheckbox
          etykieta="Nabywca jest odbiorcą"
          pole="czyNabywcaJestOdbiorca"
          statusyPol={statusyPol}
          zaznaczone={dane.czyNabywcaJestOdbiorca}
          ustawZaznaczone={(wartosc) =>
            aktualizujDane(
              (obecne) => ({
                ...obecne,
                czyNabywcaJestOdbiorca: wartosc,
                odbiorca: wartosc ? { ...obecne.nabywca } : obecne.odbiorca,
              }),
              'czyNabywcaJestOdbiorca',
            )
          }
        />
        <PoleTekstoweWielowierszowe
          etykieta="Adres paczki wspólny dla grup"
          pole="adresPaczkiWspolny"
          statusyPol={statusyPol}
          wartosc={dane.adresPaczkiWspolny}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, adresPaczkiWspolny: wartosc }), 'adresPaczkiWspolny')}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Faktura"
          pole="faktura.sposob"
          statusyPol={statusyPol}
          wartosc={dane.faktura.sposob}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, faktura: { ...obecne.faktura, sposob: wartosc } }), 'faktura.sposob')}
        />
        <PoleTekstowe
          etykieta="E-mail do faktury"
          pole="faktura.email"
          statusyPol={statusyPol}
          typ="email"
          wartosc={dane.faktura.email}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, faktura: { ...obecne.faktura, email: wartosc } }), 'faktura.email')}
        />
        <PoleTekstowe
          etykieta="Termin płatności"
          pole="terminPlatnosci"
          statusyPol={statusyPol}
          wartosc={dane.terminPlatnosci}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, terminPlatnosci: wartosc }), 'terminPlatnosci')}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Raport"
          pole="raport"
          statusyPol={statusyPol}
          wartosc={dane.raport}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, raport: wartosc }), 'raport')}
        />
        <PoleTekstowe
          etykieta="Protokół"
          pole="protokol"
          statusyPol={statusyPol}
          wartosc={dane.protokol}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, protokol: wartosc }), 'protokol')}
        />
        <PoleTekstowe
          etykieta="Data umowy"
          pole="dataUmowy"
          statusyPol={statusyPol}
          typ="date"
          wartosc={dane.dataUmowy}
          ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, dataUmowy: wartosc }), 'dataUmowy')}
        />
      </div>

      <PoleTekstowe
        etykieta="Numer umowy"
        pole="numerUmowy"
        statusyPol={statusyPol}
        wartosc={dane.numerUmowy}
        ustawWartosc={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, numerUmowy: wartosc }), 'numerUmowy')}
      />
    </SekcjaFormularza>
  )
}
