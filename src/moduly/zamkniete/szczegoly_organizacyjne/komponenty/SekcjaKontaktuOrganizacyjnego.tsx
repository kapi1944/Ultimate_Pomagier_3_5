import type { DaneFormularza, StatusyPolImportu } from '../typy'
import { PoleCheckbox, PoleTekstowe } from './PolaSzczegolow'
import SekcjaFormularza from './SekcjaFormularza'

type WlasciwosciSekcjiKontaktu = {
  dane: DaneFormularza
  statusyPol: StatusyPolImportu
  aktualizujDane: (aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) => void
}

export default function SekcjaKontaktuOrganizacyjnego({ dane, statusyPol, aktualizujDane }: WlasciwosciSekcjiKontaktu) {
  return (
    <SekcjaFormularza id="kontakt-organizacyjny" tytul="Kontakt organizacyjny">
      <PoleCheckbox
        etykieta="Kontakt wspólny dla wszystkich grup"
        pole="kontaktWspolnyDlaGrup"
        statusyPol={statusyPol}
        zaznaczone={dane.kontaktWspolnyDlaGrup}
        ustawZaznaczone={(wartosc) => aktualizujDane((obecne) => ({ ...obecne, kontaktWspolnyDlaGrup: wartosc }), 'kontaktWspolnyDlaGrup')}
      />

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Koordynator klienta"
          pole="koordynatorKlienta.imieNazwisko"
          statusyPol={statusyPol}
          wartosc={dane.koordynatorKlienta.imieNazwisko}
          ustawWartosc={(wartosc) =>
            aktualizujDane(
              (obecne) => ({ ...obecne, koordynatorKlienta: { ...obecne.koordynatorKlienta, imieNazwisko: wartosc } }),
              'koordynatorKlienta.imieNazwisko',
            )
          }
        />
        <PoleTekstowe
          etykieta="E-mail koordynatora"
          pole="koordynatorKlienta.email"
          statusyPol={statusyPol}
          typ="email"
          wartosc={dane.koordynatorKlienta.email}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, koordynatorKlienta: { ...obecne.koordynatorKlienta, email: wartosc } }), 'koordynatorKlienta.email')
          }
        />
        <PoleTekstowe
          etykieta="Telefon koordynatora"
          pole="koordynatorKlienta.telefon"
          statusyPol={statusyPol}
          typ="tel"
          wartosc={dane.koordynatorKlienta.telefon}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, koordynatorKlienta: { ...obecne.koordynatorKlienta, telefon: wartosc } }), 'koordynatorKlienta.telefon')
          }
        />
      </div>

      <PoleCheckbox
        etykieta="Koordynator jest odbiorcą paczek"
        pole="czyKoordynatorOdbieraPaczki"
        statusyPol={statusyPol}
        zaznaczone={dane.czyKoordynatorOdbieraPaczki}
        ustawZaznaczone={(wartosc) =>
          aktualizujDane(
            (obecne) => ({
              ...obecne,
              czyKoordynatorOdbieraPaczki: wartosc,
              odbiorcaPaczki: wartosc ? { ...obecne.koordynatorKlienta } : obecne.odbiorcaPaczki,
            }),
            'czyKoordynatorOdbieraPaczki',
          )
        }
      />

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Odbiorca paczki"
          pole="odbiorcaPaczki.imieNazwisko"
          statusyPol={statusyPol}
          wartosc={dane.odbiorcaPaczki.imieNazwisko}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, odbiorcaPaczki: { ...obecne.odbiorcaPaczki, imieNazwisko: wartosc } }), 'odbiorcaPaczki.imieNazwisko')
          }
        />
        <PoleTekstowe
          etykieta="E-mail odbiorcy paczki"
          pole="odbiorcaPaczki.email"
          statusyPol={statusyPol}
          typ="email"
          wartosc={dane.odbiorcaPaczki.email}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, odbiorcaPaczki: { ...obecne.odbiorcaPaczki, email: wartosc } }), 'odbiorcaPaczki.email')
          }
        />
        <PoleTekstowe
          etykieta="Telefon odbiorcy paczki"
          pole="odbiorcaPaczki.telefon"
          statusyPol={statusyPol}
          typ="tel"
          wartosc={dane.odbiorcaPaczki.telefon}
          ustawWartosc={(wartosc) =>
            aktualizujDane((obecne) => ({ ...obecne, odbiorcaPaczki: { ...obecne.odbiorcaPaczki, telefon: wartosc } }), 'odbiorcaPaczki.telefon')
          }
        />
      </div>
    </SekcjaFormularza>
  )
}
