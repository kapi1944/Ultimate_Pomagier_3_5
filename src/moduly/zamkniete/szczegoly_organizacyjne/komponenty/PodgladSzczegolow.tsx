import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { OknoDialogowe, Przycisk } from '../../../../wspolne/komponenty/ElementyInterfejsu'
import type { DaneAdresatow, DaneDokumentacjiMaterialow, DaneDodatkowychWymogow, DaneFirmy, DaneFormularza, DaneOdbiorcyPaczki, DaneUwag, DyspozycjaMaterialowa, GrupaSzkoleniowa, OpublikowaneSzczegolyOrganizacyjne, StatusyPolImportu, TrenerGrupy, UczestnikGrupy, WersjaRoboczaGeneratora } from '../typy'
import { etykietyStatusowPol } from '../stale'
import { formatujDateRejestru, oznaczeniaStatusowSzczegolow } from '../prezentacjaRejestruSzczegolow'
import { pobierzNazweOpiekuna } from '../uzytkownicySzczegolow'
import './podgladSzczegolow.css'

type KluczPola = Exclude<keyof DaneFormularza | keyof DaneFirmy | keyof DaneOdbiorcyPaczki | keyof DaneDokumentacjiMaterialow | keyof DaneDodatkowychWymogow | keyof DaneUwag | keyof GrupaSzkoleniowa | keyof TrenerGrupy | keyof UczestnikGrupy | keyof DaneAdresatow | keyof DyspozycjaMaterialowa, 'id'>

const etykietyPol: Record<KluczPola, string> = {
  tytulSzkolenia: 'Tytuł szkolenia', nazwaKlienta: 'Klient', organizator: 'Organizator', opiekunId: 'Opiekun', status: 'Status', statusSzkolenia: 'Status szkolenia', powodNiezrealizowania: 'Powód niezrealizowania',
  nabywca: 'Nabywca', odbiorca: 'Odbiorca', czyNabywcaJestOdbiorca: 'Nabywca jest odbiorcą',
  nazwa: 'Nazwa', nip: 'NIP', adres: 'Pełny adres', ulica: 'Ulica', nrBudynku: 'Numer budynku', nrLokalu: 'Numer lokalu', kodPocztowy: 'Kod pocztowy', miasto: 'Miejscowość', kraj: 'Kraj', osobaKontaktowa: 'Osoba kontaktowa klienta', imieNazwiskoOdbiorcy: 'Imię i nazwisko odbiorcy', telefon: 'Telefon', email: 'E-mail', sposobWysylkiRaportu: 'Sposób wysyłki raportu',
  wysylkaNaSiedzibeOdbiorcy: 'Wysyłka na siedzibę odbiorcy', wysylkaPaczkiDotyczy: 'Wysyłka paczki wymagana', odbiorcaPaczki: 'Odbiorca paczki', informacjaNaEtykiecie: 'Dopisek na etykietę', nazwaFirmy: 'Nazwa firmy odbiorcy paczki', imieNazwisko: 'Imię i nazwisko',
  dokumentacja: 'Dokumentacja', logotypy: 'Logotypy', dodatkoweWymogi: 'Wymagania organizacyjne', programSzkolenia: 'Program szkolenia', uwagi: 'Uwagi', dyspozycjeMaterialowe: 'Przygotowanie i dostarczenie materiałów', zrodloImportuMaila: 'Treść źródłowa importu',
  listaObecnosci: 'Lista obecności', ankiety: 'Ankiety', certyfikaty: 'Certyfikaty / zaświadczenia', program: 'Program', kartaInformacyjna: 'Karta informacyjna', podreczniki: 'Podręczniki', materialyDodatkowe: 'Materiały dodatkowe', projektTesty: 'PRE-/POST-TESTY', dostepnoscCyfrowa: 'Dostępność cyfrowa', plusJedenEgzemplarz: 'Dodatkowy egzemplarz', wzoryKlienta: 'Wzory klienta', szczegolyWzorowKlienta: 'Pliki i uwagi do wzorów klienta',
  wczesniejszyPrzyjazdTrenera: 'Wcześniejszy przyjazd trenera', minutyWczesniej: 'Przybycie wcześniej (minuty)', dokumentacjaZdjęciowa: 'Dokumentacja zdjęciowa', karyWHarmonogramie: 'Kary w harmonogramie', opisKarZaNieterminowosc: 'Kary za nieterminowość', noweSzkolenieZaOcene: 'Nowe szkolenie za oceny', kfs: 'KFS', uwagiDodatkowe: 'Dodatkowe ustalenia',
  wewnetrzne: 'Uwagi wewnętrzne', informacjeNiepewne: 'Informacje niepewne', opiekuna: 'Uwagi opiekuna', dlaKlienta: 'Uwagi dla klienta', dlaTrenera: 'Instrukcje dla trenera', dlaWysylaczy: 'Instrukcje wysyłkowe',
  trenerzy: 'Trenerzy i kontakty', uczestnicy: 'Imienna lista uczestników', imie: 'Imię', nazwisko: 'Nazwisko', formaSzkolenia: 'Forma szkolenia', dataOd: 'Termin rozpoczęcia', dataDo: 'Termin zakończenia', liczbaUczestnikow: 'Liczba uczestników', liczbaGodzin: 'Liczba godzin', rodzajGodzin: 'Rodzaj godzin', nazwaNiestandardowychGodzin: 'Niestandardowa formuła godzin / opis harmonogramu', liczbaMinutNiestandardowychGodzin: 'Długość niestandardowej godziny (minuty)', miejsce: 'Miejsce i adres szkolenia', ktoZapewniaSale: 'Kto zapewnia salę', cenaNetto: 'Cena netto', trybCeny: 'Tryb ceny', vat: 'Ustawienie VAT', terminPlatnosci: 'Termin płatności (dni)', protokol: 'Protokół', mechanizmPodzielonejPlatnosci: 'Mechanizm podzielonej płatności', dataUmowy: 'Data umowy (opcjonalna)', numerUmowy: 'Numer umowy (opcjonalny)',
  reczniAdresaci: 'Dodatkowi adresaci', trybTresci: 'Zakres treści wiadomości', czyPodpis: 'Podpis w wiadomości', wiadomoscWlasna: 'Własna wiadomość', formaPrzekazania: 'Forma przekazania', sposobPrzygotowania: 'Sposób przygotowania', terminPrzekazania: 'Termin przekazania', tekstZrodlowy: 'Tekst źródłowy dyspozycji',
}

const etykietyWartosci: Record<string, string> = {
  online: 'Online', papierowa: 'Papierowa', drukuje_klient: 'Drukuje klient', drukuje_organizator: 'Drukuje organizator', przed_szkoleniem: 'Przed szkoleniem', po_szkoleniu: 'Po szkoleniu',
}

function etykietaPola(klucz: string) {
  if (Object.hasOwn(etykietyPol, klucz)) return etykietyPol[klucz as KluczPola]
  if (klucz === 'nazwaPliku') return 'Nazwa pliku'
  if (klucz === 'materialySzkoleniowe') return 'Materiały szkoleniowe'
  return klucz
}

function PolaPodgladu({ dane, sciezka = '', statusy }: { dane: object; sciezka?: string; statusy: StatusyPolImportu }) {
  return <dl className="podglad-szczegolow__pola">{Object.entries(dane).filter(([klucz]) => klucz !== 'id' && klucz !== 'podglad').map(([klucz, wartosc]) => {
    const pole = sciezka ? `${sciezka}.${klucz}` : klucz
    const status = statusy[pole]
    const czyZlozone = wartosc !== null && typeof wartosc === 'object'
    const czyDlugiOpis = typeof wartosc === 'string' && (wartosc.length > 140 || wartosc.includes('\n'))
    return <div key={klucz} className={czyZlozone || czyDlugiOpis || ['programSzkolenia', 'nazwaNiestandardowychGodzin', 'zrodloImportuMaila', 'tekstZrodlowy'].includes(klucz) ? 'podglad-szczegolow__szerokie' : undefined} data-pole={pole}>
      <dt>{etykietaPola(klucz)}{status && <small className="podglad-szczegolow__pewnosc"> · {etykietyStatusowPol[status]}</small>}</dt>
      <dd>{czyZlozone ? (Array.isArray(wartosc)
        ? wartosc.length ? <ol>{wartosc.map((element, indeks) => <li key={element.id || indeks}><PolaPodgladu dane={element} sciezka={`${pole}.${indeks}`} statusy={statusy} /></li>)}</ol> : '—'
        : Object.keys(wartosc).length ? ['wzoryKlienta', 'szczegolyWzorowKlienta'].includes(klucz)
          ? <details><summary>Pokaż szczegóły</summary><PolaPodgladu dane={wartosc} sciezka={pole} statusy={statusy} /></details>
          : <PolaPodgladu dane={wartosc} sciezka={pole} statusy={statusy} /> : '—')
        : typeof wartosc === 'boolean' ? wartosc ? 'Tak' : 'Nie'
          : typeof wartosc === 'number' ? klucz === 'cenaNetto' ? wartosc.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' }) : wartosc
            : typeof wartosc === 'string' && wartosc.trim() ? klucz === 'status' && Object.hasOwn(etykietyStatusowPol, wartosc) ? etykietyStatusowPol[wartosc as keyof typeof etykietyStatusowPol] : etykietyWartosci[wartosc] ?? wartosc : '—'}</dd>
    </div>
  })}</dl>
}

function SekcjaPodgladu({ tytul, children, rozwinieta = true }: { tytul: string; children: ReactNode; rozwinieta?: boolean }) {
  return <details className="podglad-szczegolow__sekcja" open={rozwinieta}><summary>{tytul}</summary>{children}</details>
}

export function PodgladSzczegolow({ rekord, zamknij }: { rekord: OpublikowaneSzczegolyOrganizacyjne | WersjaRoboczaGeneratora; zamknij: () => void }) {
  const zawartosc = useRef<HTMLDivElement>(null)
  const dane = rekord.dane
  const statusy = rekord.statusyPol
  const czyOpublikowany = 'numerWersji' in rekord
  const wersja = czyOpublikowany ? `Wersja ${rekord.numerWersji}` : `Kopia robocza ${rekord.etykietaWersji}`
  const pola = (wartosci: object, sciezka = '') => <PolaPodgladu dane={wartosci} sciezka={sciezka} statusy={statusy} />

  function ustawRozwiniecie(rozwiniete: boolean) {
    zawartosc.current?.querySelectorAll('details').forEach((sekcja) => { sekcja.open = rozwiniete })
  }

  function zatrzymajFokus(zdarzenie: KeyboardEvent<HTMLDivElement>) {
    if (zdarzenie.key !== 'Tab') return
    const okno = zdarzenie.currentTarget.querySelector('dialog')
    const elementy = Array.from(okno?.querySelectorAll<HTMLElement>('button, summary, [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length > 0)
    const pierwszy = elementy[0]
    const ostatni = elementy.at(-1)
    if (zdarzenie.shiftKey && document.activeElement === pierwszy) {
      zdarzenie.preventDefault()
      ostatni?.focus()
    } else if (!zdarzenie.shiftKey && document.activeElement === ostatni) {
      zdarzenie.preventDefault()
      pierwszy?.focus()
    }
  }

  return <div className="podglad-szczegolow" onKeyDown={zatrzymajFokus}><OknoDialogowe otwarty zamknij={zamknij} tytul={`Szczegóły organizacyjne — ${dane.tytulSzkolenia || rekord.nazwa} · ${wersja}`}>
    <div className="podglad-szczegolow__tresc" ref={zawartosc}>
      <div className="podglad-szczegolow__akcje"><Przycisk onClick={() => ustawRozwiniecie(true)}>Rozwiń wszystkie</Przycisk><Przycisk onClick={() => ustawRozwiniecie(false)}>Zwiń wszystkie</Przycisk></div>
      <SekcjaPodgladu tytul="Informacje podstawowe">{pola({ tytulSzkolenia: dane.tytulSzkolenia, organizator: dane.organizator, nazwaKlienta: dane.nazwaKlienta })}<dl className="podglad-szczegolow__pola">
        <div><dt>Opiekun</dt><dd>{pobierzNazweOpiekuna(czyOpublikowany ? rekord.opiekunId : dane.opiekunId)}</dd></div>
        <div><dt>Autor szczegółów</dt><dd>{rekord.autorNazwa || '—'}</dd></div>
        <div><dt>Status szkolenia</dt><dd>{czyOpublikowany ? rekord.statusSzkolenia : dane.statusSzkolenia}</dd></div>
        <div><dt>Status akceptacji / szczegółów</dt><dd>{oznaczeniaStatusowSzczegolow[czyOpublikowany ? rekord.status : dane.status]?.etykieta || '—'}</dd></div>
        <div><dt>Status publikacji</dt><dd>{czyOpublikowany ? 'Opublikowane' : 'Kopia robocza'}</dd></div>
        <div><dt>{czyOpublikowany ? 'Data publikacji' : 'Data zapisu'}</dt><dd>{formatujDateRejestru(czyOpublikowany ? rekord.dataPublikacji : rekord.dataZapisu)}</dd></div>
        <div><dt>Przeglądana wersja</dt><dd>{wersja}</dd></div>
        {czyOpublikowany && <><div><dt>Pierwsza publikacja</dt><dd>{formatujDateRejestru(rekord.dataPierwszejPublikacji)}</dd></div><div><dt>Ostatnia publikacja</dt><dd>{formatujDateRejestru(rekord.dataOstatniejPublikacji)}</dd></div></>}
      </dl>{pola({ powodNiezrealizowania: dane.powodNiezrealizowania })}</SekcjaPodgladu>
      <SekcjaPodgladu tytul="Dane klienta">{pola({ czyNabywcaJestOdbiorca: dane.czyNabywcaJestOdbiorca, nabywca: dane.nabywca, odbiorca: dane.odbiorca })}</SekcjaPodgladu>
      {rekord.grupy.length === 0 && <SekcjaPodgladu tytul="Grupy szkoleniowe">Nie podano</SekcjaPodgladu>}
      {rekord.grupy.map((grupa, indeks) => {
        const { id, trenerzy, cenaNetto, trybCeny, vat, terminPlatnosci, protokol, mechanizmPodzielonejPlatnosci, dataUmowy, numerUmowy, liczbaGodzin, rodzajGodzin, nazwaNiestandardowychGodzin, liczbaMinutNiestandardowychGodzin, ...organizacja } = grupa
        const sciezka = `grupy.${indeks}`
        return <SekcjaPodgladu key={id} tytul={`Grupa ${indeks + 1} — ${grupa.nazwa || 'Bez nazwy'}`}>
          {pola({ ...organizacja, uczestnicy: grupa.uczestnicy ?? [], liczbaGodzin, rodzajGodzin }, sciezka)}
          <h3>Trenerzy i organizacja</h3>{pola({ trenerzy }, sciezka)}
          <h3>Rozliczenia</h3>{pola({ cenaNetto, trybCeny, vat, terminPlatnosci, protokol, mechanizmPodzielonejPlatnosci, dataUmowy, numerUmowy }, sciezka)}
          <SekcjaPodgladu tytul="Harmonogram" rozwinieta={false}>{pola({ nazwaNiestandardowychGodzin, liczbaMinutNiestandardowychGodzin }, sciezka)}</SekcjaPodgladu>
        </SekcjaPodgladu>
      })}
      <SekcjaPodgladu tytul="Wymagania organizacyjne i instrukcje dla trenerów">{pola(dane.dodatkoweWymogi, 'dodatkoweWymogi')}</SekcjaPodgladu>
      <SekcjaPodgladu tytul="Materiały i dokumentacja">{pola(dane.dokumentacja, 'dokumentacja')}{pola({ dyspozycjeMaterialowe: dane.dyspozycjeMaterialowe ?? {} })}{pola({ nazwaPliku: dane.logotypy.nazwaPliku }, 'logotypy')}
        {/^data:image\/(png|jpeg|webp|gif);base64,/.test(dane.logotypy.podglad) && <img className="podglad-szczegolow__logo" src={dane.logotypy.podglad} alt="Zapisane logotypy dokumentu" />}
      </SekcjaPodgladu>
      <SekcjaPodgladu tytul="Wysyłka paczki">{pola({ wysylkaPaczkiDotyczy: dane.wysylkaPaczkiDotyczy, wysylkaNaSiedzibeOdbiorcy: dane.wysylkaNaSiedzibeOdbiorcy, odbiorcaPaczki: { ...dane.odbiorcaPaczki, informacjaNaEtykiecie: dane.odbiorcaPaczki.informacjaNaEtykiecie ?? '' } })}</SekcjaPodgladu>
      <SekcjaPodgladu tytul="Program szkolenia" rozwinieta={false}>{pola({ programSzkolenia: dane.programSzkolenia })}</SekcjaPodgladu>
      <SekcjaPodgladu tytul="Uwagi i informacje dodatkowe" rozwinieta={false}>{pola(dane.uwagi, 'uwagi')}{pola(rekord.adresaci, 'adresaci')}</SekcjaPodgladu>
      {dane.zrodloImportuMaila && <SekcjaPodgladu tytul="Źródło importu" rozwinieta={false}>{pola({ zrodloImportuMaila: dane.zrodloImportuMaila })}</SekcjaPodgladu>}
    </div>
  </OknoDialogowe></div>
}
