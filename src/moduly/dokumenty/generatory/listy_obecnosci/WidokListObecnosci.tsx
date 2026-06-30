import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15
Miejsce: Warszawa

Uczestnicy:
Anna Kowalska
Piotr Nowak
Maria Zielińska`

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
  const uczestnicy = pobierzUczestnikow(daneWejsciowe)
  const listaUczestnikow = uczestnicy.length
    ? uczestnicy.map((uczestnik, indeks) => `${indeks + 1}. ${uczestnik}    ....................................`).join('\n')
    : 'Brak uczestników.'

  return `LISTA OBECNOŚCI

Dane szkolenia:
${daneWejsciowe.trim() || 'Brak danych szkolenia.'}

Uczestnicy
${listaUczestnikow}`
}

export default function WidokListObecnosci() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Listy obecności"
      opis="Generator list obecności. Placeholder pod przyszłą implementację."
      etykietaDanychWejsciowych="Dane szkolenia i uczestnicy"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.listy-obecnosci.szkic"
      generujDokument={generujDokument}
    />
  )
}
