import type { DaneFormularza, GrupaSzkoleniowa } from '../typy'

function zabezpieczHtml(tekst: string) {
  return tekst
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatujTakNie(wartosc: boolean) {
  return wartosc ? 'Tak' : 'Nie'
}

function formatujKwote(wartosc: number) {
  if (!Number.isFinite(wartosc)) {
    return '-'
  }

  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(wartosc)
}

export function utworzTekstSzczegolow(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const opisGrup = grupy
    .map((grupa, indeks) => {
      const trenerzy = grupa.trenerzy.map((trener) => `${trener.imieNazwisko}${trener.email ? ` (${trener.email})` : ''}`).join(', ')

      return `GRUPA ${indeks + 1}: ${grupa.nazwa}
Trener: ${trenerzy || '-'}
Termin: ${grupa.dataOd || '-'} - ${grupa.dataDo || '-'}
Forma: ${grupa.formaSzkolenia}
Miejsce: ${grupa.miejsce || '-'}
Kto zapewnia ${grupa.formaSzkolenia === 'Online' ? 'łącze' : 'salę'}: ${grupa.ktoZapewniaSale || '-'}
Uczestnicy: ${grupa.liczbaUczestnikow || '-'}
Godziny: ${grupa.liczbaGodzin || '-'} ${grupa.rodzajGodzin}
Cena netto: ${formatujKwote(grupa.cenaNetto)} zł (${grupa.trybCeny})
Oświadczenie VAT: ${grupa.vat}
Termin płatności: ${grupa.terminPlatnosci || '-'} dni
Protokół: ${formatujTakNie(grupa.protokol)}
MPP: ${formatujTakNie(grupa.mechanizmPodzielonejPlatnosci)}
Umowa: ${grupa.dataUmowy || '-'} ${grupa.numerUmowy || '-'}`
    })
    .join('\n\n')

  return `NOWE SZCZEGÓŁY ORGANIZACYJNE

Tytuł szkolenia: ${dane.tytulSzkolenia || '-'}
Nazwa klienta: ${dane.nazwaKlienta || '-'}
Firma organizatora: ${dane.organizator}
Status: ${dane.status}

${opisGrup}

DANE KLIENTA
Nabywca: ${dane.nabywca.nazwa || '-'}
Adres nabywcy: ${dane.nabywca.ulica || '-'} ${dane.nabywca.nrBudynku || ''}${dane.nabywca.nrLokalu ? `/${dane.nabywca.nrLokalu}` : ''}, ${dane.nabywca.kodPocztowy || '-'} ${dane.nabywca.miasto || '-'}, ${dane.nabywca.kraj || '-'}
Odbiorca: ${dane.czyNabywcaJestOdbiorca ? dane.nabywca.nazwa || '-' : dane.odbiorca.nazwa || '-'}

PAKIET I MATERIAŁY
Lista obecności: ${formatujTakNie(dane.dokumentacja.listaObecnosci)}
Ankiety: ${formatujTakNie(dane.dokumentacja.ankiety)}
Certyfikaty: ${formatujTakNie(dane.dokumentacja.certyfikaty)}
Program: ${formatujTakNie(dane.dokumentacja.program)}
Karta informacyjna: ${formatujTakNie(dane.dokumentacja.kartaInformacyjna)}
Podręczniki: ${formatujTakNie(dane.dokumentacja.podreczniki)}
Materiały dodatkowe: ${formatujTakNie(dane.dokumentacja.materialyDodatkowe)}
Projekt testy: ${formatujTakNie(dane.dokumentacja.projektTesty)}
Dostępność cyfrowa: ${formatujTakNie(dane.dokumentacja.dostepnoscCyfrowa)}
Plik źródłowy: ${formatujTakNie(dane.dokumentacja.plikZrodlowy)}
Logotypy: ${dane.dokumentacja.logotypy}
Plik logotypu: ${dane.logotypy.nazwaPliku || '-'}
Plus jeden egzemplarz: ${formatujTakNie(dane.dokumentacja.plusJedenEgzemplarz)}

DODATKOWE WYMOGI
Wcześniejszy przyjazd trenera: ${formatujTakNie(dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera)} ${dane.dodatkoweWymogi.minutyWczesniej} min
Dokumentacja zdjęciowa: ${formatujTakNie(dane.dodatkoweWymogi.dokumentacjaZdjęciowa)}
Kary w harmonogramie: ${formatujTakNie(dane.dodatkoweWymogi.karyWHarmonogramie)}
Nowe szkolenie za oceny: ${formatujTakNie(dane.dodatkoweWymogi.noweSzkolenieZaOcene)}
KFS: ${formatujTakNie(dane.dodatkoweWymogi.kfs)}
Uwagi dodatkowe: ${dane.dodatkoweWymogi.uwagi || '-'}

WYSYŁKA PACZKI
Dotyczy: ${formatujTakNie(dane.wysylkaPaczkiDotyczy)}
Odbiorca: ${dane.odbiorcaPaczki.nazwaFirmy || '-'}, ${dane.odbiorcaPaczki.imieNazwisko || '-'}, ${dane.odbiorcaPaczki.email || '-'}

PROGRAM SZKOLENIA
${dane.programSzkolenia || '-'}`
}

export function pobierzNazwePlikuSzczegolow(dane: DaneFormularza) {
  const rdzen = dane.tytulSzkolenia
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${rdzen || 'szczegoly-organizacyjne'}.doc`
}

export function pobierzDokumentSzczegolow(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const tekst = utworzTekstSzczegolow(dane, grupy)
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8" /></head><body><pre>${zabezpieczHtml(
    tekst,
  )}</pre></body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const adres = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = adres
  link.download = pobierzNazwePlikuSzczegolow(dane)
  link.click()
  URL.revokeObjectURL(adres)
}
