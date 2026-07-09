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

function pobierzObszaryOceny(daneWejsciowe: string) {
  const wiersze = daneWejsciowe.split('\n')
  const indeksSekcji = wiersze.findIndex((wiersz) => wiersz.toLowerCase().startsWith('obszary oceny'))

  if (indeksSekcji === -1) {
    return []
  }

  return wiersze
    .slice(indeksSekcji + 1)
    .map((wiersz) => wiersz.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
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
      statusPanelu={({ daneWejsciowe }) => {
        const marka = pobierzWartosc(daneWejsciowe, 'Marka') || 'SEMPER'
        return `Ankieta robocza dla profilu ${marka}.`
      }}
      pozycjeJakosciPanelu={({ daneWejsciowe, wygenerowanyDokument }) => {
        const marka = pobierzWartosc(daneWejsciowe, 'Marka') || 'SEMPER'
        const obszaryOceny = pobierzObszaryOceny(daneWejsciowe)
        const trybCheckboxow = pobierzWartosc(daneWejsciowe, 'Tryb checkboxów') || 'drukowany'

        return [
          {
            id: 'profil-ankiety',
            tytul: `Profil organizatora: ${marka}`,
            poziom: marka ? 'poprawne' : 'ostrzezenie',
            grupa: 'Dokument',
            zakladka: 'Dokument',
            idPola: 'ultimate-pomagier.ankiety.szkic-dane',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 1,
          },
          {
            id: 'obszary-oceny',
            tytul: obszaryOceny.length ? `Obszary oceny: ${obszaryOceny.length}` : 'Brak obszarów oceny',
            opis: obszaryOceny.length ? obszaryOceny.join(', ') : 'Dodaj obszary oceny w danych wejściowych.',
            poziom: obszaryOceny.length ? 'poprawne' : 'sugestia',
            grupa: 'Dane wejściowe',
            zakladka: 'Dane wejściowe',
            idPola: 'ultimate-pomagier.ankiety.szkic-dane',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 2,
          },
          {
            id: 'tryb-checkboxow',
            tytul: `Tryb checkboxów: ${trybCheckboxow}`,
            poziom: 'podpowiedz',
            grupa: 'Ustawienia',
            zakladka: 'Ustawienia',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 3,
          },
          {
            id: 'wynik-ankiety',
            tytul: wygenerowanyDokument.trim() ? 'Ankieta jest wygenerowana' : 'Brak wygenerowanej ankiety',
            poziom: wygenerowanyDokument.trim() ? 'poprawne' : 'ostrzezenie',
            grupa: 'Podgląd',
            zakladka: 'Podgląd',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: !wygenerowanyDokument.trim(),
            kolejnosc: 4,
          },
          {
            id: 'wersje-klienta',
            tytul: 'Dedykowane profile klienta',
            opis: 'Do wdrożenia później.',
            poziom: 'podpowiedz',
            grupa: 'Ustawienia',
            zakladka: 'Ustawienia',
            czyBlokujePublikacje: false,
            czyBlokujeEksport: false,
            kolejnosc: 5,
          },
        ]
      }}
    />
  )
}
