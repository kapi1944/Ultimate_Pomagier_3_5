import ProstyGeneratorDokumentu from '../../wspolne/ProstyGeneratorDokumentu'

const tekstPrzykladowy = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data od: 2026-07-15
Data do: 2026-07-17
Liczba dni: 3
Miejsce: Warszawa
Tryb listy: pusta
Orientacja: automatyczna
Logotypy projektowe: nie

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

function pobierzLiczbeDni(daneWejsciowe: string) {
  const liczba = Number(pobierzWartosc(daneWejsciowe, 'Liczba dni'))

  if (Number.isNaN(liczba)) {
    return 1
  }

  return Math.min(Math.max(Math.round(liczba), 1), 5)
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

function generujNaglowekPodpisow(liczbaDni: number) {
  return Array.from({ length: liczbaDni }, (_, indeks) => `Podpis dzień ${indeks + 1}`).join(' | ')
}

function generujWierszeUczestnikow(uczestnicy: string[], liczbaDni: number, czyPusta: boolean) {
  const dane = czyPusta ? Array.from({ length: Math.max(uczestnicy.length, 20) }, () => '') : uczestnicy

  return dane
    .map((uczestnik, indeks) => {
      const podpisy = Array.from({ length: liczbaDni }, () => '........................').join(' | ')

      return `${indeks + 1}. ${uczestnik || '........................'} | ${podpisy}`
    })
    .join('\n')
}

function generujDokument(daneWejsciowe: string) {
  const uczestnicy = pobierzUczestnikow(daneWejsciowe)
  const liczbaDni = pobierzLiczbeDni(daneWejsciowe)
  const trybListy = pobierzWartosc(daneWejsciowe, 'Tryb listy').toLowerCase() === 'wypelniona' ? 'wypelniona' : 'pusta'
  const orientacja = pobierzWartosc(daneWejsciowe, 'Orientacja') || (liczbaDni > 3 ? 'pozioma sugerowana' : 'pionowa')
  const logotypyProjektowe = pobierzWartosc(daneWejsciowe, 'Logotypy projektowe').toLowerCase() === 'tak' ? 'tak' : 'nie'
  const ostrzezenie = liczbaDni > 3 ? '\nOSTRZEŻENIE: dla 4-5 dni zalecany jest układ poziomy albo ręczna korekta szerokości kolumn.\n' : ''

  return `LISTA OBECNOŚCI

Dane szkolenia:
${daneWejsciowe.trim() || 'Brak danych szkolenia.'}

Ustawienia listy:
trybListy: ${trybListy}
orientacja: ${orientacja}
pokazLogotypyProjektowe: ${logotypyProjektowe}
liczbaKolumnPodpisu: ${liczbaDni}${ostrzezenie}

Lp. | Imię i nazwisko | ${generujNaglowekPodpisow(liczbaDni)}
${generujWierszeUczestnikow(uczestnicy, liczbaDni, trybListy === 'pusta')}`
}

export default function WidokListObecnosci() {
  return (
    <ProstyGeneratorDokumentu
      tytul="Listy obecności"
      opis="Generator list obecności."
      etykietaDanychWejsciowych="Dane szkolenia i uczestnicy"
      tekstPrzykladowy={tekstPrzykladowy}
      kluczLocalStorage="ultimate-pomagier.listy-obecnosci.szkic"
      generujDokument={generujDokument}
    />
  )
}
