import type { TrybTytuluDyplomu } from '../../../../wspolne/dokumenty/typyDokumentu'
import { wyodrebnijTekstPdf } from '../../../../wspolne/import/odczytTekstuPdf'

export type DaneImportuDyplomu = {
  imieNazwisko: string
  numerRejestru: string
  tytulSzkolenia: string
  wybraneDaty: string[]
  liczbaGodzin: string
  rodzajGodzin: string
  miejsceSzkolenia: string
  trybSzkolenia: 'stacjonarne' | 'online'
  trener: string
  motywKoloru: 'semper' | 'iist'
  trybTytulu: TrybTytuluDyplomu
}

export const etykietyImportuDyplomu: Record<keyof DaneImportuDyplomu, string> = {
  imieNazwisko: 'Uczestnik', numerRejestru: 'Numer rejestru', tytulSzkolenia: 'Tytuł szkolenia',
  wybraneDaty: 'Termin szkolenia', liczbaGodzin: 'Liczba godzin', rodzajGodzin: 'Rodzaj godzin',
  miejsceSzkolenia: 'Miejsce szkolenia', trybSzkolenia: 'Tryb szkolenia', trener: 'Ekspert / trener',
  motywKoloru: 'Organizator', trybTytulu: 'Typ dokumentu',
}

export type WynikImportuDyplomu = {
  pola: Partial<DaneImportuDyplomu>
  ostrzezenia: string[]
}

function parsujDateImportu(wartosc: string) {
  const wynik = /^(\d{2})[.-](\d{2})[.-](\d{4})$/.exec(wartosc)
  if (!wynik) return null
  const iso = `${wynik[3]}-${wynik[2]}-${wynik[1]}`
  const data = new Date(`${iso}T00:00:00Z`)
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : null
}

export function parsujTekstDyplomu(tekst: string): WynikImportuDyplomu {
  const tresc = tekst.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  const pola: Partial<DaneImportuDyplomu> = {}
  const uczestnicy = [...tresc.matchAll(/Pan\s*\/\s*Pani\s+(.+?)\s+ukończył(?:\s*\/\s*a|a)?\s+szkolenie\s*:/giu)]
  if (uczestnicy.length > 1) throw new Error('Plik zawiera kilka dyplomów. Wybierz plik z jednym dyplomem wzorcowym.')
  if (uczestnicy[0]) pola.imieNazwisko = uczestnicy[0][1].trim()
  const numer = /Nr\s+(?:z\s+)?rejestru\s*:\s*([\p{L}\d]+(?:[/.-][\p{L}\d]+)*)/iu.exec(tresc)
  if (numer) pola.numerRejestru = numer[1]
  const tytul = /ukończył(?:\s*\/\s*a|a)?\s+szkolenie\s*:\s*(.+?)\s+zrealizowane\s+w\s+terminie\s*:/iu.exec(tresc)
  if (tytul) pola.tytulSzkolenia = tytul[1].replace(/^["„“]|["”]$/g, '').trim()
  const termin = /zrealizowane\s+w\s+terminie\s*:\s*(.+?)\s+w\s+wymiarze/iu.exec(tresc)
  if (termin) {
    const datyTekstu = termin[1].match(/\d{2}[.-]\d{2}[.-]\d{4}/g) ?? []
    const daty = datyTekstu.map(parsujDateImportu)
    if (daty.length && daty.every((data) => data !== null)) {
      if (/\bod\b.+\bdo\b/iu.test(termin[1]) && daty.length === 2) {
        const poczatek = Date.parse(daty[0])
        const koniec = Date.parse(daty[1])
        const liczbaDni = (koniec - poczatek) / 86400000 + 1
        if (liczbaDni > 0 && liczbaDni <= 366) {
          pola.wybraneDaty = Array.from({ length: liczbaDni }, (_, indeks) => new Date(poczatek + indeks * 86400000).toISOString().slice(0, 10))
        }
      } else pola.wybraneDaty = [...new Set(daty)].sort()
    }
  }
  const godziny = /w\s+wymiarze\s+(\d+(?:[.,]\d+)?)\s*(?:h|godzin(?:y)?)\s+([\p{L}]+)/iu.exec(tresc)
  if (godziny && Number(godziny[1].replace(',', '.')) > 0) {
    pola.liczbaGodzin = godziny[1].replace(',', '.')
    pola.rodzajGodzin = godziny[2].toLocaleLowerCase('pl')
  }
  const miejsce = /Miejsce\s+szkolenia\s*:\s*(.+?)(?:\.(?=\s|$)|$)/iu.exec(tresc)
  if (miejsce) {
    pola.miejsceSzkolenia = miejsce[1].trim()
    pola.trybSzkolenia = /online|on-line|zdaln/iu.test(miejsce[1]) ? 'online' : 'stacjonarne'
  }
  const trener = /Ekspert\s*(?:merytoryczny)?\s*:\s*(.+?)(?=\s+Serdecznie|\s+Pieczęć|\s+Nr\s|$)/iu.exec(tresc)
  if (trener && /\p{L}/u.test(trener[1])) pola.trener = trener[1].trim()
  if (/\bIIST\b/u.test(tresc)) pola.motywKoloru = 'iist'
  else if (/\bSEMPER\b/u.test(tresc)) pola.motywKoloru = 'semper'
  const typ = /(?:^|\s)(CERTYFIKAT|ZAŚWIADCZENIE|DYPLOM)(?=\s|$)/u.exec(tresc)
  if (typ) pola.trybTytulu = typ[1] === 'CERTYFIKAT' ? 'certyfikat' : typ[1] === 'DYPLOM' ? 'dyplom' : 'zaswiadczenie'
  if (!pola.imieNazwisko && !pola.tytulSzkolenia) throw new Error('Nie rozpoznano danych dyplomu. Wybierz PDF z warstwą tekstową albo TXT z treścią dyplomu.')
  const brakujace = (Object.keys(etykietyImportuDyplomu) as Array<keyof DaneImportuDyplomu>).filter((pole) => pola[pole] === undefined)
  return { pola, ostrzezenia: brakujace.length ? [`Nie rozpoznano: ${brakujace.map((pole) => etykietyImportuDyplomu[pole]).join(', ')}. Uzupełnij lub sprawdź te pola ręcznie.`] : [] }
}

export async function importujPlikDyplomu(plik: File): Promise<WynikImportuDyplomu> {
  if (!/\.(pdf|txt)$/i.test(plik.name)) throw new Error('Wybierz plik PDF albo TXT.')
  try {
    return parsujTekstDyplomu(/\.pdf$/i.test(plik.name) ? await wyodrebnijTekstPdf(plik) : await plik.text())
  } catch (blad) {
    if (blad instanceof Error && blad.message === 'PDF_BEZ_TEKSTU') {
      throw new Error('PDF nie zawiera warstwy tekstowej. Import skanów wymaga OCR; wybierz tekstowy PDF albo TXT.', { cause: blad })
    }
    throw blad
  }
}
