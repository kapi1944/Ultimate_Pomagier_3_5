import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15
Miejsce: Sala szkoleniowa A
Ekspert merytoryczny: Jan Nowak
Opiekun szkolenia: Anna Kowalska
Telefon opiekuna: +48 501 234 567
Marka: SEMPER
QR: stały obraz do wymiany`

function pobierzWartosc(daneWejsciowe: string, etykieta: string) {
  const wiersz = daneWejsciowe
    .split('\n')
    .find((linia) => linia.toLowerCase().startsWith(`${etykieta.toLowerCase()}:`))

  return wiersz?.split(':').slice(1).join(':').trim() || ''
}

function generujDokument(daneWejsciowe: string) {
  const tytulSzkolenia = pobierzWartosc(daneWejsciowe, 'Tytuł szkolenia') || 'Tytuł szkolenia'
  const data = pobierzWartosc(daneWejsciowe, 'Data') || 'Data'
  const miejsce = pobierzWartosc(daneWejsciowe, 'Miejsce') || 'Miejsce'
  const ekspert = pobierzWartosc(daneWejsciowe, 'Ekspert merytoryczny') || 'Ekspert merytoryczny'
  const opiekun = pobierzWartosc(daneWejsciowe, 'Opiekun szkolenia') || 'Opiekun szkolenia'
  const telefon = pobierzWartosc(daneWejsciowe, 'Telefon opiekuna') || 'Telefon opiekuna'
  const marka = pobierzWartosc(daneWejsciowe, 'Marka') || 'SEMPER'

  return `${marka}

==============================================
${tytulSzkolenia}
==============================================

Data: ${data}
Miejsce: ${miejsce}

Ekspert merytoryczny:
${ekspert}

Kontakt do opiekuna szkolenia:
${opiekun}
${telefon}

QR / grafika dekoracyjna:
do podmiany w szablonie`
}

export default function WidokKartNaDrzwi() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Karta na drzwi"
      opis="Generator karty na drzwi dla szkolenia zamkniętego."
      etykietaDanychWejsciowych="Dane szkolenia"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.karta-na-drzwi.szkic"
      generujDokument={generujDokument}
      statusPanelu={({ daneWejsciowe }) => {
        const tytul = pobierzWartosc(daneWejsciowe, 'Tytuł szkolenia')
        const data = pobierzWartosc(daneWejsciowe, 'Data')
        const miejsce = pobierzWartosc(daneWejsciowe, 'Miejsce')
        return tytul && data && miejsce ? 'Dane szkolenia są kompletne roboczo.' : 'Uzupełnij tytuł, termin i miejsce.'
      }}
      licznikProblemowPanelu={({ daneWejsciowe }) => {
        const wymagane = ['Tytuł szkolenia', 'Data', 'Miejsce']
        return wymagane.filter((etykieta) => !pobierzWartosc(daneWejsciowe, etykieta)).length
      }}
      pozycjeJakosciPanelu={({ daneWejsciowe, wygenerowanyDokument }) => {
        const wymagane = ['Tytuł szkolenia', 'Data', 'Miejsce']
        const brakujace = wymagane.filter((etykieta) => !pobierzWartosc(daneWejsciowe, etykieta))
        const opiekun = pobierzWartosc(daneWejsciowe, 'Opiekun szkolenia')
        const trener = pobierzWartosc(daneWejsciowe, 'Ekspert merytoryczny')
        const qr = pobierzWartosc(daneWejsciowe, 'QR')

        return [
          {
            id: 'dane-szkolenia-karta',
            tytul: brakujace.length ? `Brakuje: ${brakujace.join(', ')}` : 'Tytuł, termin i miejsce są uzupełnione',
            poziom: brakujace.length ? 'krytyczne' : 'poprawne',
            grupa: 'Dane wejściowe',
            zakladka: 'Dane wejściowe',
            idPola: 'ultimate-pomagier.karta-na-drzwi.szkic-dane',
            czyBlokujePublikacje: brakujace.length > 0,
            czyBlokujeEksport: brakujace.length > 0,
            kolejnosc: 1,
          },
          {
            id: 'opiekun-karta',
            tytul: opiekun ? `Opiekun: ${opiekun}` : 'Brak opiekuna',
            poziom: opiekun ? 'poprawne' : 'sugestia',
            grupa: 'Dane wejściowe',
            zakladka: 'Dane wejściowe',
            idPola: 'ultimate-pomagier.karta-na-drzwi.szkic-dane',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 2,
          },
          {
            id: 'trener-karta',
            tytul: trener ? `Trener: ${trener}` : 'Brak danych trenera',
            poziom: trener ? 'poprawne' : 'sugestia',
            grupa: 'Dane wejściowe',
            zakladka: 'Dane wejściowe',
            idPola: 'ultimate-pomagier.karta-na-drzwi.szkic-dane',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 3,
          },
          {
            id: 'qr-karta',
            tytul: qr ? `QR / grafika: ${qr}` : 'QR / grafika do uzupełnienia',
            opis: qr ? undefined : 'Do wdrożenia później.',
            poziom: qr ? 'podpowiedz' : 'sugestia',
            grupa: 'Ustawienia',
            zakladka: 'Ustawienia',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 4,
          },
          {
            id: 'wynik-karty',
            tytul: wygenerowanyDokument.trim() ? 'Karta jest wygenerowana' : 'Brak wygenerowanej karty',
            poziom: wygenerowanyDokument.trim() ? 'poprawne' : 'ostrzezenie',
            grupa: 'Podgląd',
            zakladka: 'Podgląd',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: !wygenerowanyDokument.trim(),
            kolejnosc: 5,
          },
        ]
      }}
    />
  )
}
