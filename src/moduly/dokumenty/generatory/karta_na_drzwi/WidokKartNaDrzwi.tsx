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
    />
  )
}
