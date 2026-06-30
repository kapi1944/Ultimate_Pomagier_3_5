import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Obszary oceny:
- organizacja szkolenia
- praca trenera
- materiały szkoleniowe
- przydatność wiedzy w pracy`

function generujDokument(daneWejsciowe: string) {
  return `ANKIETA POSZKOLENIOWA

Dane szkolenia:
${daneWejsciowe.trim() || 'Brak danych szkolenia.'}

Ocena organizacji:
1  2  3  4  5

Ocena trenera:
1  2  3  4  5

Ocena materiałów:
1  2  3  4  5

Uwagi uczestnika:
................................................................................
................................................................................`
}

export default function WidokAnkiet() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Ankiety"
      opis="Generator ankiet. Placeholder pod przyszłą implementację."
      etykietaDanychWejsciowych="Dane ankiety"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.ankiety.szkic"
      generujDokument={generujDokument}
    />
  )
}
