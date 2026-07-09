import { useMemo, useState } from 'react'
import PanelKontroliJakosciDokumentu from '../../wspolne/dokumenty/PanelKontroliJakosciDokumentu'
import type { BlokDokumentu, ProblemDokumentu } from '../../wspolne/dokumenty/modelBlokowy'
import { opiszPoziomZgodnosci } from '../../moduly/dokumenty/replikator_dokumentow/raportReplikacji'
import { filtrujSzablonyDokumentow } from './filtrujSzablonyDokumentow'
import {
  aktywujSzablonDokumentu,
  archiwizujSzablonDokumentu,
  pobierzSzablonyDokumentowZKartoteki,
  przywrocWersjeJakoRobocza,
  ukryjOznaczenieWersjiTestowej,
  utworzNowaWersjeNaPodstawieObecnej,
} from './magazynSzablonowDokumentow'
import type {
  FiltrySzablonowDokumentow,
  OrganizatorSzablonuDokumentu,
  PoziomZgodnosciReplikatora,
  PorownanieWersjiSzablonu,
  StatusSzablonuDokumentu,
  SzablonDokumentuKartoteki,
  TypSzablonuDokumentu,
  WersjaSzablonuDokumentu,
  ZrodloSzablonuDokumentu,
} from './typySzablonowDokumentow'
import { porownajMetadaneWersji } from './wersjeSzablonowDokumentow'
import './szablonyDokumentow.css'

const typyDokumentow: (TypSzablonuDokumentu | 'Wszystkie')[] = [
  'Wszystkie',
  'Program szkolenia',
  'Dyplom',
  'Certyfikat',
  'Zaświadczenie',
  'Lista obecności',
  'Ankieta',
  'Protokół',
  'Materiał dodatkowy',
  'Inny',
]
const organizatorzy: (OrganizatorSzablonuDokumentu | 'Wszystkie')[] = ['Wszystkie', 'SEMPER', 'IIST', 'Inny']
const statusy: (StatusSzablonuDokumentu | 'Wszystkie')[] = ['Wszystkie', 'Roboczy', 'Aktywny', 'Archiwalny']
const poziomyZgodnosci: (PoziomZgodnosciReplikatora | 'Wszystkie')[] = [
  'Wszystkie',
  'bardzo_dobra_zgodnosc',
  'dobra_zgodnosc',
  'wymaga_sprawdzenia',
  'tylko_wersja_robocza',
]
const zrodla: (ZrodloSzablonuDokumentu | 'Wszystkie')[] = ['Wszystkie', 'DOCX', 'PDF', 'TEKST', 'RECZNY']

const filtryPoczatkowe: FiltrySzablonowDokumentow = {
  typDokumentu: 'Wszystkie',
  organizator: 'Wszystkie',
  status: 'Wszystkie',
  poziomZgodnosci: 'Wszystkie',
  zrodlo: 'Wszystkie',
  szukanaFraza: '',
}

function pobierzNazweUzytkownika() {
  try {
    const zapisSesji = localStorage.getItem('ultimate-pomagier.zalogowany-uzytkownik')
    const daneSesji = zapisSesji ? JSON.parse(zapisSesji) : null

    return typeof daneSesji?.nazwa === 'string' ? daneSesji.nazwa : 'Architekt'
  } catch {
    return 'Architekt'
  }
}

function sformatujDate(data: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data))
}

function pobierzBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...pobierzBloki(blok.dzieci)])
}

function policzBloki(szablon: SzablonDokumentuKartoteki) {
  return pobierzBloki(szablon.dokumentBlokowy.struktura).length
}

function pobierzProblemy(szablon: SzablonDokumentuKartoteki): ProblemDokumentu[] {
  return [
    ...szablon.dokumentBlokowy.problemy,
    ...(szablon.raportReplikacji?.problemyJakosci ?? []),
  ]
}

function opiszPoziom(poziom: PoziomZgodnosciReplikatora) {
  return opiszPoziomZgodnosci(poziom)
}

function ListaProsta({ tytul, pozycje }: { tytul: string; pozycje: string[] }) {
  return (
    <section className="szablony-dokumentow__sekcja">
      <h3>{tytul}</h3>
      {pozycje.length ? (
        <ul>
          {pozycje.map((pozycja) => (
            <li key={pozycja}>{pozycja}</li>
          ))}
        </ul>
      ) : (
        <p>Brak pozycji.</p>
      )}
    </section>
  )
}

function PodgladBlokow({ bloki }: { bloki: BlokDokumentu[] }) {
  return (
    <div className="szablony-dokumentow__podglad-blokow">
      {bloki.map((blok) => (
        <article className={`szablony-dokumentow__blok szablony-dokumentow__blok--${blok.statusDiagnostyczny}`} key={blok.id}>
          <strong>{blok.typ}</strong>
          <span>{blok.tresc || blok.metadane.opisDiagnostyczny || 'Brak treści tekstowej.'}</span>
          {blok.dzieci.length > 0 && <PodgladBlokow bloki={blok.dzieci} />}
        </article>
      ))}
    </div>
  )
}

function TabelaPorownania({ porownanie }: { porownanie: PorownanieWersjiSzablonu[] }) {
  if (!porownanie.length) {
    return <p>Wybierz dwie wersje do porównania.</p>
  }

  return (
    <table className="szablony-dokumentow__tabela">
      <thead>
        <tr>
          <th>Pole</th>
          <th>Wersja A</th>
          <th>Wersja B</th>
        </tr>
      </thead>
      <tbody>
        {porownanie.map((pozycja) => (
          <tr className={pozycja.czyRozne ? 'szablony-dokumentow__wiersz-roznicy' : undefined} key={pozycja.pole}>
            <td>{pozycja.pole}</td>
            <td>{pozycja.wartoscPierwsza}</td>
            <td>{pozycja.wartoscDruga}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SzczegolySzablonu({
  szablon,
  odswiez,
  pokazKomunikat,
}: {
  szablon: SzablonDokumentuKartoteki
  odswiez: (idSzablonu?: string) => void
  pokazKomunikat: (komunikat: string) => void
}) {
  const uzytkownik = pobierzNazweUzytkownika()
  const [pierwszaWersja, ustawPierwszaWersje] = useState(String(szablon.historiaWersji.at(0)?.numerWersji ?? ''))
  const [drugaWersja, ustawDrugaWersje] = useState(String(szablon.historiaWersji.at(-1)?.numerWersji ?? ''))
  const problemy = pobierzProblemy(szablon)
  const wersjaA = szablon.historiaWersji.find((wersja) => String(wersja.numerWersji) === pierwszaWersja)
  const wersjaB = szablon.historiaWersji.find((wersja) => String(wersja.numerWersji) === drugaWersja)
  const porownanie = wersjaA && wersjaB ? porownajMetadaneWersji(wersjaA, wersjaB) : []

  function aktywuj() {
    const komentarz = szablon.procentZgodnosci <= 70
      ? window.prompt('Podaj komentarz świadomej aktywacji przy zgodności <= 70%.') ?? ''
      : 'Aktywowano z kartoteki szablonów.'

    try {
      aktywujSzablonDokumentu(szablon.id, uzytkownik, komentarz)
      pokazKomunikat('Aktywowano szablon dokumentu.')
      odswiez(szablon.id)
    } catch (blad) {
      pokazKomunikat(blad instanceof Error ? blad.message : 'Nie udało się aktywować szablonu.')
    }
  }

  function archiwizuj() {
    archiwizujSzablonDokumentu(szablon.id, uzytkownik)
    pokazKomunikat('Ustawiono status Archiwalny.')
    odswiez(szablon.id)
  }

  function utworzWersje() {
    utworzNowaWersjeNaPodstawieObecnej(szablon.id, uzytkownik)
    pokazKomunikat('Utworzono nową wersję roboczą na podstawie obecnej.')
    odswiez(szablon.id)
  }

  function przywrocWersje(wersja: WersjaSzablonuDokumentu) {
    przywrocWersjeJakoRobocza(szablon.id, wersja.numerWersji, uzytkownik)
    pokazKomunikat(`Przywrócono wersję ${wersja.numerWersji} jako nową wersję roboczą.`)
    odswiez(szablon.id)
  }

  function ukryjWersjeTestowa() {
    ukryjOznaczenieWersjiTestowej(szablon.id, uzytkownik)
    pokazKomunikat('Ukryto oznaczenie wersji testowej i zapisano decyzję.')
    odswiez(szablon.id)
  }

  return (
    <section className="szablony-dokumentow__szczegoly">
      <header className="szablony-dokumentow__naglowek-szczegolow">
        <div>
          <h2>{szablon.nazwa}</h2>
          <p>{szablon.typDokumentu} | {szablon.organizator} | wersja {szablon.wersja} | {szablon.status}</p>
        </div>
        <div className="kartoteki__akcje">
          <button className="kartoteki__przycisk" disabled={szablon.status === 'Aktywny'} type="button" onClick={aktywuj}>
            Aktywuj
          </button>
          <button className="kartoteki__przycisk" disabled={szablon.status === 'Archiwalny'} type="button" onClick={archiwizuj}>
            Archiwizuj
          </button>
          <button className="kartoteki__przycisk" type="button" onClick={utworzWersje}>
            Nowa wersja
          </button>
          {szablon.czyWersjaTestowa && (
            <button className="kartoteki__przycisk" type="button" onClick={ukryjWersjeTestowa}>
              Ukryj wersję testową
            </button>
          )}
        </div>
      </header>

      <section className="szablony-dokumentow__metryki">
        <span>Status: {szablon.status}</span>
        <span>Zgodność: {szablon.procentZgodnosci}%</span>
        <span>Poziom: {opiszPoziom(szablon.poziomZgodnosci)}</span>
        <span>Źródło: {szablon.zrodlo}</span>
        <span>Autor: {szablon.autor}</span>
        <span>Modyfikacja: {sformatujDate(szablon.dataModyfikacji)}</span>
        <span>Niepewne: {szablon.elementyNiepewne.length}</span>
        <span>Nieobsługiwane: {szablon.elementyNieobslugiwane.length}</span>
        <span>{szablon.czyWersjaTestowa ? 'wersja testowa' : 'bez oznaczenia testowego'}</span>
      </section>

      <PanelKontroliJakosciDokumentu
        problemy={problemy}
        czyZatwierdzony={szablon.dokumentBlokowy.metadane.zatwierdzonyPrzezUzytkownika}
        liczbaBlokow={policzBloki(szablon)}
        raportReplikacji={szablon.raportReplikacji ? {
          procentZgodnosci: szablon.raportReplikacji.procentZgodnosci,
          poziomZgodnosci: opiszPoziom(szablon.raportReplikacji.poziomZgodnosci),
          odtworzono: szablon.raportReplikacji.odtworzono,
          nieOdtworzono: szablon.raportReplikacji.nieOdtworzono,
          wymagaPoprawy: szablon.raportReplikacji.wymagaPoprawy,
          ograniczenia: szablon.raportReplikacji.ograniczenia,
        } : undefined}
        statusSzablonu={szablon.status}
      />

      <section className="szablony-dokumentow__siatka">
        <section className="szablony-dokumentow__sekcja">
          <h3>DokumentBlokowy</h3>
          <dl>
            <div><dt>Id</dt><dd>{szablon.dokumentBlokowy.id}</dd></div>
            <div><dt>Typ modelu</dt><dd>{szablon.dokumentBlokowy.typ}</dd></div>
            <div><dt>Źródło</dt><dd>{szablon.dokumentBlokowy.metadane.zrodlo}</dd></div>
            <div><dt>Wersja modelu</dt><dd>{szablon.dokumentBlokowy.metadane.wersjaModelu}</dd></div>
          </dl>
        </section>
        <ListaProsta tytul="Placeholdery" pozycje={szablon.placeholdery.map((placeholder) => `{{${placeholder.nazwa}}} | ${placeholder.rodzaj} | ${placeholder.status}`)} />
        <ListaProsta tytul="Elementy niepewne" pozycje={szablon.elementyNiepewne} />
        <ListaProsta tytul="Elementy nieobsługiwane" pozycje={szablon.elementyNieobslugiwane} />
      </section>

      <section className="szablony-dokumentow__sekcja">
        <h3>Podgląd struktury</h3>
        <PodgladBlokow bloki={szablon.dokumentBlokowy.struktura} />
      </section>

      <section className="szablony-dokumentow__sekcja">
        <h3>Historia wersji</h3>
        <div className="szablony-dokumentow__porownanie">
          <select value={pierwszaWersja} onChange={(zdarzenie) => ustawPierwszaWersje(zdarzenie.target.value)}>
            {szablon.historiaWersji.map((wersja) => (
              <option key={wersja.numerWersji} value={wersja.numerWersji}>
                Wersja {wersja.numerWersji}
              </option>
            ))}
          </select>
          <select value={drugaWersja} onChange={(zdarzenie) => ustawDrugaWersje(zdarzenie.target.value)}>
            {szablon.historiaWersji.map((wersja) => (
              <option key={wersja.numerWersji} value={wersja.numerWersji}>
                Wersja {wersja.numerWersji}
              </option>
            ))}
          </select>
        </div>
        <TabelaPorownania porownanie={porownanie} />
        <div className="szablony-dokumentow__lista-wersji">
          {szablon.historiaWersji.map((wersja) => (
            <article className="szablony-dokumentow__wersja" key={wersja.numerWersji}>
              <strong>v{wersja.numerWersji} | {sformatujDate(wersja.data)}</strong>
              <span>{wersja.autor} | {wersja.zrodloZmiany} | {wersja.procentZgodnosci}%</span>
              <p>{wersja.komentarz}</p>
              <button className="kartoteki__przycisk" type="button" onClick={() => przywrocWersje(wersja)}>
                Przywróć jako roboczą
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="szablony-dokumentow__sekcja">
        <h3>Historia decyzji</h3>
        {szablon.historiaDecyzji.length ? (
          <ul>
            {szablon.historiaDecyzji.map((decyzja) => (
              <li key={decyzja.id}>
                <strong>{decyzja.typ}</strong> | {sformatujDate(decyzja.data)} | {decyzja.uzytkownik}: {decyzja.komentarz}
              </li>
            ))}
          </ul>
        ) : (
          <p>Brak zapisanych decyzji.</p>
        )}
      </section>
    </section>
  )
}

export default function WidokSzablonowDokumentow() {
  const [szablony, ustawSzablony] = useState<SzablonDokumentuKartoteki[]>(pobierzSzablonyDokumentowZKartoteki)
  const [wybranySzablonId, ustawWybranySzablonId] = useState(szablony[0]?.id ?? '')
  const [komunikat, ustawKomunikat] = useState('Kartoteka działa lokalnie i jest gotowa pod przyszły magazyn bazodanowy.')
  const [filtry, ustawFiltry] = useState<FiltrySzablonowDokumentow>(filtryPoczatkowe)
  const szablonyFiltrowane = useMemo(() => filtrujSzablonyDokumentow(szablony, filtry), [filtry, szablony])
  const wybranySzablon = szablony.find((szablon) => szablon.id === wybranySzablonId) ?? szablonyFiltrowane[0] ?? null

  function odswiez(idSzablonu?: string) {
    const aktualneSzablony = pobierzSzablonyDokumentowZKartoteki()

    ustawSzablony(aktualneSzablony)
    ustawWybranySzablonId(idSzablonu ?? aktualneSzablony[0]?.id ?? '')
  }

  function zmienFiltr<K extends keyof FiltrySzablonowDokumentow>(klucz: K, wartosc: FiltrySzablonowDokumentow[K]) {
    ustawFiltry((obecne) => ({ ...obecne, [klucz]: wartosc }))
  }

  return (
    <section className="kartoteki__widok szablony-dokumentow">
      <header className="kartoteki__naglowek">
        <div className="kartoteki__tytul">
          <span className="kartoteki__ikona" aria-hidden="true">
            §
          </span>
          <div>
            <h1>Szablony dokumentów</h1>
            <p>Kartoteka roboczych i aktywnych szablonów oparta o DokumentBlokowy.</p>
          </div>
        </div>
        <button className="kartoteki__przycisk" type="button" onClick={() => odswiez(wybranySzablon?.id)}>
          Odśwież
        </button>
      </header>

      <p className="kartoteki__komunikat">{komunikat}</p>

      <section className="kartoteki__panel">
        <div className="kartoteki__formularz kartoteki__formularz--trzy">
          <input
            className="kartoteki__pole-szerokie"
            placeholder="Szukaj po nazwie"
            value={filtry.szukanaFraza}
            onChange={(zdarzenie) => zmienFiltr('szukanaFraza', zdarzenie.target.value)}
          />
          <select value={filtry.typDokumentu} onChange={(zdarzenie) => zmienFiltr('typDokumentu', zdarzenie.target.value as FiltrySzablonowDokumentow['typDokumentu'])}>
            {typyDokumentow.map((typ) => <option key={typ} value={typ}>{typ}</option>)}
          </select>
          <select value={filtry.organizator} onChange={(zdarzenie) => zmienFiltr('organizator', zdarzenie.target.value as FiltrySzablonowDokumentow['organizator'])}>
            {organizatorzy.map((organizator) => <option key={organizator} value={organizator}>{organizator}</option>)}
          </select>
          <select value={filtry.status} onChange={(zdarzenie) => zmienFiltr('status', zdarzenie.target.value as FiltrySzablonowDokumentow['status'])}>
            {statusy.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={filtry.poziomZgodnosci} onChange={(zdarzenie) => zmienFiltr('poziomZgodnosci', zdarzenie.target.value as FiltrySzablonowDokumentow['poziomZgodnosci'])}>
            {poziomyZgodnosci.map((poziom) => <option key={poziom} value={poziom}>{poziom === 'Wszystkie' ? poziom : opiszPoziom(poziom)}</option>)}
          </select>
          <select value={filtry.zrodlo} onChange={(zdarzenie) => zmienFiltr('zrodlo', zdarzenie.target.value as FiltrySzablonowDokumentow['zrodlo'])}>
            {zrodla.map((zrodlo) => <option key={zrodlo} value={zrodlo}>{zrodlo}</option>)}
          </select>
        </div>
        <span className="szablony-dokumentow__licznik">
          Widoczne {szablonyFiltrowane.length} z {szablony.length}. Archiwalne pozostają dostępne przez filtr statusu.
        </span>
      </section>

      <div className="kartoteki__tabela-opakowanie">
        <table className="kartoteki__tabela szablony-dokumentow__tabela-listy">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Typ</th>
              <th>Organizator</th>
              <th>Status</th>
              <th>Wersja</th>
              <th>Zgodność</th>
              <th>Poziom</th>
              <th>Modyfikacja</th>
              <th>Autor</th>
              <th>Ryzyka</th>
              <th>Testowa</th>
            </tr>
          </thead>
          <tbody>
            {szablonyFiltrowane.map((szablon) => (
              <tr
                className={szablon.id === wybranySzablon?.id ? 'szablony-dokumentow__wiersz-aktywny' : undefined}
                key={szablon.id}
                onClick={() => ustawWybranySzablonId(szablon.id)}
              >
                <td>{szablon.nazwa}</td>
                <td>{szablon.typDokumentu}</td>
                <td>{szablon.organizator}</td>
                <td>{szablon.status}</td>
                <td>v{szablon.wersja}</td>
                <td>{szablon.procentZgodnosci}%</td>
                <td>{opiszPoziom(szablon.poziomZgodnosci)}</td>
                <td>{sformatujDate(szablon.dataModyfikacji)}</td>
                <td>{szablon.autor}</td>
                <td>Niepewne: {szablon.elementyNiepewne.length} | Nieobsługiwane: {szablon.elementyNieobslugiwane.length}</td>
                <td>{szablon.czyWersjaTestowa ? 'Tak' : 'Nie'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!szablonyFiltrowane.length && (
        <section className="kartoteki__panel">
          <p>Brak szablonów spełniających obecne filtry.</p>
        </section>
      )}

      {wybranySzablon && (
        <SzczegolySzablonu
          szablon={wybranySzablon}
          odswiez={odswiez}
          pokazKomunikat={ustawKomunikat}
        />
      )}
    </section>
  )
}
