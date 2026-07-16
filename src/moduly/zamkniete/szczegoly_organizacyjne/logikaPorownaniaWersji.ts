import type { DaneAdresatow, DaneFormularza, GrupaSzkoleniowa } from './typy'

export type SnapshotWersjiSzczegolow = Pick<DaneFormularza, never> & {
  dane?: DaneFormularza
  grupy?: GrupaSzkoleniowa[]
  adresaci?: DaneAdresatow
}

export type RoznicaWersjiSzczegolow = {
  sekcja: string
  pole: string
  starszaWartosc: string
  nowszaWartosc: string
}

const etykietyPol: Record<string, string> = {
  tytulSzkolenia: 'Tytuł szkolenia', nazwaKlienta: 'Nazwa klienta', organizator: 'Firma organizatora', opiekunId: 'Opiekun',
  nazwa: 'Nazwa', nazwaFirmy: 'Nazwa firmy odbiorcy', ulica: 'Ulica', nrBudynku: 'Nr budynku', nrLokalu: 'Nr lokalu', kodPocztowy: 'Kod pocztowy', miasto: 'Miasto', kraj: 'Kraj',
  osobaKontaktowa: 'Osoba kontaktowa', imieNazwiskoOdbiorcy: 'Imię i nazwisko odbiorcy', imieNazwisko: 'Imię i nazwisko', telefon: 'Telefon', email: 'Email', sposobWysylkiRaportu: 'Sposób wysyłki raportu',
  dataOd: 'Data od', dataDo: 'Data do', liczbaUczestnikow: 'Liczba uczestników', liczbaGodzin: 'Liczba godzin', rodzajGodzin: 'Rodzaj godzin', nazwaNiestandardowychGodzin: 'Nazwa rodzaju godzin', liczbaMinutNiestandardowychGodzin: 'Liczba minut trwania',
  miejsce: 'Miejsce', ktoZapewniaSale: 'Kto zapewnia salę', cenaNetto: 'Cena netto', trybCeny: 'Sposób naliczania ceny', vat: 'Oświadczenie VAT', terminPlatnosci: 'Termin płatności', dataUmowy: 'Data umowy', numerUmowy: 'Numer umowy', trenerzy: 'Trenerzy', uczestnicy: 'Uczestnicy',
  reczniAdresaci: 'Adresaci', trybTresci: 'Tryb treści', czyPodpis: 'Dodaj podpis', wiadomoscWlasna: 'Wiadomość własna',
  wysylkaPaczkiDotyczy: 'Wysyłka paczki dotyczy', wczesniejszyPrzyjazdTrenera: 'Wcześniejszy przyjazd trenera', minutyWczesniej: 'Minuty wcześniejszego przyjazdu', uwagi: 'Uwagi',
  listaObecnosci: 'Lista obecności', ankiety: 'Ankiety', certyfikaty: 'Certyfikaty', program: 'Program', kartaInformacyjna: 'Karta informacyjna', podreczniki: 'Podręczniki', materialyDodatkowe: 'Materiały dodatkowe', projektTesty: 'PRE-/POST-TESTY', dostepnoscCyfrowa: 'Dostępność cyfrowa', logotypy: 'Logotypy', plusJedenEgzemplarz: 'Dodatkowy egzemplarz',
  dokumentacjaZdjęciowa: 'Dokumentacja zdjęciowa', karyWHarmonogramie: 'Kary w harmonogramie', noweSzkolenieZaOcene: 'Nowe szkolenie za oceny', kfs: 'KFS',
}

const etykietySekcji: Record<string, string> = { dane: 'Dane formularza', grupy: 'Grupy szkoleniowe', adresaci: 'Aktualizacja' }

function formatujWartosc(wartosc: unknown) {
  if (wartosc === undefined || wartosc === null || wartosc === '') return '(puste)'
  if (typeof wartosc === 'boolean') return wartosc ? 'Tak' : 'Nie'
  if (typeof wartosc === 'number') return String(wartosc)
  return String(wartosc)
}

function czyRekord(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc) && typeof wartosc === 'object' && !Array.isArray(wartosc)
}

function pobierzEtykietePola(klucz: string) {
  if (klucz.includes(' ')) return klucz
  return etykietyPol[klucz] ?? klucz.replace(/([A-Z])/g, ' $1').replace(/^./, (znak) => znak.toUpperCase())
}

function podsumujElement(wartosc: unknown) {
  if (!czyRekord(wartosc)) return formatujWartosc(wartosc)
  return [wartosc.nazwa, wartosc.imieNazwisko, wartosc.email].filter((pozycja) => typeof pozycja === 'string' && pozycja).join(', ') || 'element'
}

function porownajWartosc(
  starsza: unknown,
  nowsza: unknown,
  sekcja: string,
  sciezka: string[],
  wynik: RoznicaWersjiSzczegolow[],
) {
  if (Object.is(starsza, nowsza)) return
  const pole = sciezka.map(pobierzEtykietePola).join(' — ')

  if (Array.isArray(starsza) || Array.isArray(nowsza)) {
    const starsze = Array.isArray(starsza) ? starsza : []
    const nowsze = Array.isArray(nowsza) ? nowsza : []
    const czyElementyMajaId = [...starsze, ...nowsze].every((element) => czyRekord(element) && typeof element.id === 'string')
    if (!czyElementyMajaId) {
      wynik.push({ sekcja, pole, starszaWartosc: formatujWartosc(starsze.join(', ')), nowszaWartosc: formatujWartosc(nowsze.join(', ')) })
      return
    }
    const nowszePoId = new Map(nowsze.map((element) => [String((element as Record<string, unknown>).id), element]))
    const starszePoId = new Map(starsze.map((element) => [String((element as Record<string, unknown>).id), element]))
    for (const [id, element] of starszePoId) {
      const odpowiednik = nowszePoId.get(id)
      if (!odpowiednik) wynik.push({ sekcja, pole: `${pole} — ${podsumujElement(element)}`, starszaWartosc: podsumujElement(element), nowszaWartosc: '(puste)' })
      else porownajWartosc(element, odpowiednik, sekcja, [...sciezka, podsumujElement(element)], wynik)
    }
    for (const [id, element] of nowszePoId) {
      if (!starszePoId.has(id)) wynik.push({ sekcja, pole: `${pole} — ${podsumujElement(element)}`, starszaWartosc: '(puste)', nowszaWartosc: podsumujElement(element) })
    }
    return
  }

  if (czyRekord(starsza) || czyRekord(nowsza)) {
    const starszyRekord = czyRekord(starsza) ? starsza : {}
    const nowszyRekord = czyRekord(nowsza) ? nowsza : {}
    for (const klucz of new Set([...Object.keys(starszyRekord), ...Object.keys(nowszyRekord)])) {
      if (klucz !== 'id') porownajWartosc(starszyRekord[klucz], nowszyRekord[klucz], sekcja, [...sciezka, klucz], wynik)
    }
    return
  }

  wynik.push({ sekcja, pole, starszaWartosc: formatujWartosc(starsza), nowszaWartosc: formatujWartosc(nowsza) })
}

export function porownajSnapshotyWersji(starsza: SnapshotWersjiSzczegolow | undefined, nowsza: SnapshotWersjiSzczegolow | undefined) {
  const wynik: RoznicaWersjiSzczegolow[] = []
  for (const klucz of ['dane', 'grupy', 'adresaci'] as const) {
    porownajWartosc(starsza?.[klucz], nowsza?.[klucz], etykietySekcji[klucz], [], wynik)
  }
  return wynik
}
