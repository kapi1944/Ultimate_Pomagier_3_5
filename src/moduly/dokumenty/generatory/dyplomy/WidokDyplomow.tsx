import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15

Uczestnicy:
Anna Kowalska
Piotr Nowak
Maria Zielińska`

function pobierzWartosc(daneWejsciowe: string, etykieta: string) {
  const wiersz = daneWejsciowe
    .split('\n')
    .find((linia) => linia.toLowerCase().startsWith(`${etykieta.toLowerCase()}:`))

  return wiersz?.split(':').slice(1).join(':').trim() || ''
}

function pobierzUczestnikow(daneWejsciowe: string) {
  const wiersze = daneWejsciowe
    .split('\n')
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
  const indeksSekcji = wiersze.findIndex((wiersz) => wiersz.toLowerCase().startsWith('uczestnicy'))

  if (indeksSekcji === -1) {
    return wiersze.filter((wiersz) => !wiersz.includes(':'))
  }

  return wiersze.slice(indeksSekcji + 1)
}

function generujDokument(daneWejsciowe: string) {
  const tytulSzkolenia = pobierzWartosc(daneWejsciowe, 'Tytuł szkolenia') || 'wskazanego szkolenia'
  const dataSzkolenia = pobierzWartosc(daneWejsciowe, 'Data') || '....................................'
  const uczestnicy = pobierzUczestnikow(daneWejsciowe)

  if (!uczestnicy.length) {
    return `ZAŚWIADCZENIE / DYPLOM

Brak uczestników do wygenerowania dyplomów.`
  }

  return uczestnicy
    .map(
      (uczestnik) => `ZAŚWIADCZENIE / DYPLOM

${uczestnik}

ukończył(a) szkolenie:
${tytulSzkolenia}

Data: ${dataSzkolenia}
Podpis: ....................................`,
    )
    .join('\n\n----------------------------------------\n\n')
}

export default function WidokDyplomow() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Dyplomy"
      opis="Generator dyplomów. Placeholder pod przyszłą implementację."
      etykietaDanychWejsciowych="Dane szkolenia i uczestnicy"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.dyplomy.szkic"
      generujDokument={generujDokument}
    />
  )
}
