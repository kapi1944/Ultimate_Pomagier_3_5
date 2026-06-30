import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Marka: SEMPER
Tytuł szkolenia: Skuteczna komunikacja w zespole
Pytania stałe: tak
Tryb checkboxów: drukowany
Obszary oceny:
- organizacja szkolenia
- praca trenera
- materiały szkoleniowe
- przydatność wiedzy w pracy`

function pobierzWartosc(daneWejsciowe: string, etykieta: string) {
  const wiersz = daneWejsciowe
    .split('\n')
    .find((linia) => linia.toLowerCase().startsWith(`${etykieta.toLowerCase()}:`))

  return wiersz?.split(':').slice(1).join(':').trim() || ''
}

function generujDokument(daneWejsciowe: string) {
  const marka = pobierzWartosc(daneWejsciowe, 'Marka') || 'SEMPER'
  const trybCheckboxow = pobierzWartosc(daneWejsciowe, 'Tryb checkboxów') || 'drukowany'

  return `${marka}
ANKIETA EWALUACYJNA

Dane szkolenia:
${daneWejsciowe.trim() || 'Brak danych szkolenia.'}

PYTANIA/OCENA

Ocena organizacji:
[ ] bardzo dobrze  [ ] dobrze  [ ] do udoskonalenia

Ocena trenera:
[ ] bardzo dobrze  [ ] dobrze  [ ] do udoskonalenia

Ocena materiałów:
[ ] bardzo dobrze  [ ] dobrze  [ ] do udoskonalenia

Uwagi uczestnika:
................................................................................
................................................................................

ElementCheckbox.tryb: ${trybCheckboxow}`
}

export default function WidokAnkiet() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Ankiety"
      opis="Wspólny generator ankiet dla SEMPER, IIST i klienta."
      etykietaDanychWejsciowych="Dane ankiety"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.ankiety.szkic"
      generujDokument={generujDokument}
    />
  )
}
