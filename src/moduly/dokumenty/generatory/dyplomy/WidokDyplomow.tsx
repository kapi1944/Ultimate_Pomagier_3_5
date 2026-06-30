import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tryb tytułu: certyfikat
Tekst tytułu: CERTYFIKAT
Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15
Druga strona: tak
Typ drugiej strony: program
Treść drugiej strony: Cele, korzyści i program szkolenia.

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

function generujStroneGlowna(uczestnik: string, tekstTytulu: string, tytulSzkolenia: string, dataSzkolenia: string, numer: number) {
  return `${tekstTytulu}

Nr z rejestru: ${String(numer).padStart(4, '0')}/2026

${uczestnik}

ukończył/a szkolenie:
${tytulSzkolenia}

Data: ${dataSzkolenia}
Podpis: ....................................`
}

function generujDrugaStrone(uczestnik: string, typDrugiejStrony: string, trescDrugiejStrony: string) {
  return `DRUGA STRONA DYPLOMU
Uczestnik: ${uczestnik}
Typ treści: ${typDrugiejStrony}

${trescDrugiejStrony || 'Cele, korzyści, program albo efekty uczenia się.'}`
}

function generujDokument(daneWejsciowe: string) {
  const tekstTytulu = pobierzWartosc(daneWejsciowe, 'Tekst tytułu') || 'CERTYFIKAT'
  const tytulSzkolenia = pobierzWartosc(daneWejsciowe, 'Tytuł szkolenia') || 'wskazanego szkolenia'
  const dataSzkolenia = pobierzWartosc(daneWejsciowe, 'Data') || '....................................'
  const drugaStronaAktywna = pobierzWartosc(daneWejsciowe, 'Druga strona').toLowerCase() === 'tak'
  const typDrugiejStrony = pobierzWartosc(daneWejsciowe, 'Typ drugiej strony') || 'inne'
  const trescDrugiejStrony = pobierzWartosc(daneWejsciowe, 'Treść drugiej strony')
  const uczestnicy = pobierzUczestnikow(daneWejsciowe)

  if (!uczestnicy.length) {
    return `${tekstTytulu}

Brak uczestników do wygenerowania dyplomów.`
  }

  return uczestnicy
    .flatMap((uczestnik, indeks) => {
      const stronaGlowna = generujStroneGlowna(uczestnik, tekstTytulu, tytulSzkolenia, dataSzkolenia, indeks + 1)

      return drugaStronaAktywna
        ? [stronaGlowna, generujDrugaStrone(uczestnik, typDrugiejStrony, trescDrugiejStrony)]
        : [stronaGlowna]
    })
    .join('\n\n----------------------------------------\n\n')
}

export default function WidokDyplomow() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Dyplomy"
      opis="Generator certyfikatów, zaświadczeń i dyplomów."
      etykietaDanychWejsciowych="Dane szkolenia i uczestnicy"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.dyplomy.szkic"
      generujDokument={generujDokument}
    />
  )
}
