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

export function utworzTekstSzczegolow(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const opisGrup = grupy
    .map((grupa, indeks) => {
      const trenerzy = grupa.trenerzy.map((trener) => `${trener.imieNazwisko} (${trener.email})`).join(', ')

      return `GRUPA ${indeks + 1}: ${grupa.nazwa}
Status terminu: ${grupa.statusTerminu}
Termin: ${grupa.dataOd || '-'} - ${grupa.dataDo || '-'}, ${grupa.godzinaRozpoczecia || '-'}-${grupa.godzinaZakonczenia || '-'}
Forma: ${grupa.formaSzkolenia}
Lokalizacja: ${grupa.nazwaLokalizacji || grupa.miejsce || '-'}
Adres: ${grupa.adresLokalizacji || '-'}
Online: ${grupa.platformaOnline}, ${grupa.linkOnline || '-'}
Cena: ${grupa.cenaNetto} netto, VAT ${grupa.vat}, ${grupa.cenaBrutto} brutto (${grupa.trybCeny})
Godziny: ${grupa.liczbaGodzin} ${grupa.rodzajGodzin}
Trenerzy: ${trenerzy || '-'}
Uczestnicy: ${grupa.liczbaUczestnikow}
Uwagi dojazdowe: ${grupa.informacjeDojazdowe || '-'}`
    })
    .join('\n\n')

  return `NOWE SZCZEGÓŁY ORGANIZACYJNE

Tytuł szkolenia: ${dane.tytulSzkolenia || '-'}
Organizator: ${dane.organizator}
Status: ${dane.status}

DANE KLIENTA
Nabywca: ${dane.nabywca.nazwa || '-'}
NIP: ${dane.nabywca.nip || '-'}
Adres nabywcy: ${dane.nabywca.adres || '-'}
Odbiorca: ${dane.czyNabywcaJestOdbiorca ? dane.nabywca.nazwa : dane.odbiorca.nazwa || '-'}
Adres paczki: ${dane.adresPaczkiWspolny || '-'}
Faktura: ${dane.faktura.sposob || '-'}, ${dane.faktura.email || '-'}
Raport: ${dane.raport || '-'}
Protokół: ${dane.protokol || '-'}
Umowa: ${dane.dataUmowy || '-'} ${dane.numerUmowy || '-'}
Termin płatności: ${dane.terminPlatnosci || '-'}

KONTAKT
Koordynator: ${dane.koordynatorKlienta.imieNazwisko || '-'} ${dane.koordynatorKlienta.email || ''}
Odbiorca paczki: ${dane.odbiorcaPaczki.imieNazwisko || '-'} ${dane.odbiorcaPaczki.email || ''}

${opisGrup}

DOKUMENTACJA I MATERIAŁY
Lista obecności: ${formatujTakNie(dane.dokumentacja.listaObecnosci)}
Ankiety: ${formatujTakNie(dane.dokumentacja.ankiety)}
Certyfikaty: ${formatujTakNie(dane.dokumentacja.certyfikaty)}
Program: ${formatujTakNie(dane.dokumentacja.program)}
Materiały: ${dane.materialy || '-'}

LOGOTYPY
Wymagane: ${formatujTakNie(dane.logotypy.czyWymagane)}
Link: ${dane.logotypy.link || '-'}
Finansowanie: ${dane.logotypy.informacjaOFinansowaniu || '-'}

DODATKOWE WYMOGI
Wcześniejszy przyjazd trenera: ${formatujTakNie(dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera)} ${dane.dodatkoweWymogi.minutyWczesniej} min
Dokumentacja zdjęciowa: ${formatujTakNie(dane.dodatkoweWymogi.dokumentacjaZdjęciowa)}
Kary za nieterminowość: ${formatujTakNie(dane.dodatkoweWymogi.karyZaNieterminowosc)}
KFS: ${formatujTakNie(dane.dodatkoweWymogi.kfs)}
Uwagi: ${dane.dodatkoweWymogi.uwagi || '-'}

PROGRAM SZKOLENIA
${dane.programSzkolenia || '-'}

UWAGI
Wewnętrzne: ${dane.uwagi.wewnetrzne || '-'}
Niepewne: ${dane.uwagi.informacjeNiepewne || '-'}
Opiekuna: ${dane.uwagi.opiekuna || '-'}
Dla klienta: ${dane.uwagi.dlaKlienta || '-'}
Dla trenera: ${dane.uwagi.dlaTrenera || '-'}
Dla wysyłaczy: ${dane.uwagi.dlaWysylaczy || '-'}`
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
