import { useEffect, useMemo, useRef, useState, type RefObject, type ChangeEvent } from 'react'
import { pobierzLokalizacjeZMagazynu } from '../../../../kartoteki/lokalizacje/magazynLokalizacji'
import { pobierzTrenerowZKartoteki } from '../../../../kartoteki/trenerzyKartoteki'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { EdytowalnaWarstwaSwobodnychBlokow, PanelEdycjiSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import { pobierzMapeZasobowObrazowDokumentu, zapiszZasobObrazuDokumentu } from '../../../../wspolne/dokumenty/zasobyObrazowDokumentu'
import { zbudujNazweEksportowanegoDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { czyMoznaImportowacDyspozycje, potwierdzIloscDyspozycji, zastosujDyspozycjeMaterialoweChecklisty } from './dyspozycjeChecklistyPaczki'
import { pobierzPostepKompletowaniaPaczki, pobierzStanKompletowaniaPozycji, ustawPotwierdzenieKompletuPozycji, ustawStatusOperacyjnyPaczki, zmienIloscPrzygotowanaPozycji } from './modelChecklistyPaczki'
import { normalizujDaneChecklisty, czyMoznaEksportowacCheckliste, pobierzDaneSzkoleniaChecklisty, przeniesPozycjeWObrebieKategorii, czyMoznaFinalizowacCheckliste, czyPozycjaJestAktywna, duplikujPaczkeChecklisty, formatujDateDoWydruku, formatujIloscPozycji, pobierzIloscPozycji, zastosujSzablonChecklistyPaczki, zastosujWariantMaterialowOnline, utworzBlokiSzablonuChecklistyPaczki, utworzNowaPaczkeChecklisty, utworzNowaPozycjeChecklisty, utworzSzablonChecklistyPaczki, type DaneChecklistyPaczki, type PaczkaChecklisty, type PozycjaChecklisty, type TypZalacznikaChecklisty } from './modelChecklistyPaczki'
import { pobierzSzablonyChecklistPaczek, zapiszNowySzablonChecklisty } from './szablonyChecklistPaczek'
import { utworzRecznaChecklistePaczki, powiazChecklisteZeSzkoleniem, odlaczChecklisteOdSzkolenia, dodajZalacznikChecklisty, otworzPonownieCheckliste, pobierzChecklistePaczki, pobierzSzczegolyDoChecklisty, ustawStatusChecklisty, zarejestrujWydrukChecklisty, zapiszChecklistePaczki, type DaneZrodlaChecklisty } from './rejestrChecklistPaczek'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import { pobierzUzytkownika } from '../../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzNazweWyswietlanaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyJestPracownikiemWewnetrznym } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyMozeWysylac } from '../../../../kartoteki/uzytkownicy/uprawnienia'
import type { Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import PanelEtykietPaczek from './PanelEtykietPaczek'
import PodgladWydrukuPaczki from './PodgladWydrukuPaczki'
import WeryfikacjaZdjeciaPaczki from './WeryfikacjaZdjeciaPaczki'
import CelEtykietyPaczki from './CelEtykietyPaczki'
import { odczytajCelEtykiety, odczytajPaczkeZKotwicy } from './modelEtykietyPaczki'
import './widokChecklistPaczek.css'

type Wlasciwosci = { dokumentIdZTrasy: string | null; otworzDokument: (dokument: Dokument<unknown, unknown>) => void }
// Historia jest dopisywana przez repozytorium, nie stanowi zmiany formularza.
const serializujDaneChecklisty = (dane: DaneChecklistyPaczki | null) => JSON.stringify(dane ? { ...normalizujDaneChecklisty(dane), historia: undefined } : null)
type Zapis = (dane: DaneChecklistyPaczki, opis?: string) => boolean
export const instrukcjaStartowa = 'Przygotuj Checklistę ręcznie lub powiąż ją ze szkoleniem.'
const dni = (dane: DaneChecklistyPaczki) => new Set(pobierzDaneSzkoleniaChecklisty(dane).terminy).size
const otworz = (id: string) => { window.history.pushState({}, '', `/dokumenty/checklisty-paczek/${encodeURIComponent(id)}`); window.dispatchEvent(new PopStateEvent('popstate')) }
const zmienPozycje = (dane: DaneChecklistyPaczki, id: string, zmiana: (pozycja: PozycjaChecklisty) => PozycjaChecklisty) => ({ ...dane, pozycje: dane.pozycje.map((pozycja) => pozycja.id === id ? zmiana(pozycja) : pozycja) })
const pobierzDaneZrodlowe = (szczegoly: ReturnType<typeof pobierzSzczegolyDoChecklisty>[number]): DaneZrodlaChecklisty => ({ opiekunId: szczegoly.opiekunId, finansowanie: szczegoly.dane.dodatkoweWymogi.kfs ? 'KFS' : '', odbiorca: { ...szczegoly.dane.odbiorcaPaczki, zrodloPropozycji: 'Szczegóły organizacyjne' }, logotypy: szczegoly.dane.logotypy.nazwaPliku ? [{ nazwa: szczegoly.dane.logotypy.nazwaPliku, podglad: szczegoly.dane.logotypy.podglad }] : [] })

function IlosciPozycji({ pozycja, uczestnicy, liczbaDni }: { pozycja: PozycjaChecklisty; uczestnicy: number; liczbaDni: number }) {
  if (pozycja.czyOnline) return <span>Online</span>
  return <span className="checklista-paczki__porownanie-ilosci"><strong>{pozycja.iloscPrzygotowana ?? '—'}</strong><small>/ z {formatujIloscPozycji(pozycja, uczestnicy, liczbaDni)}</small></span>
}

function EtykietaDanych({ ikona, tekst }: { ikona: 'szkolenie' | 'osoby' | 'firma' | 'termin' | 'lokalizacja' | 'podpis'; tekst: string }) {
  const sciezki = {
    szkolenie: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
    osoby: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a8 6 0 0 1 16 0v3',
    firma: 'M4 21V3h16v18 M8 7h2 M14 7h2 M8 11h2 M14 11h2 M10 21v-5h4v5',
    termin: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
    lokalizacja: 'M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13 M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    podpis: 'M4 20l1-5L16 4l4 4L9 19z M14 6l4 4 M4 23h16',
  }
  return <><svg className="checklista-paczki__ikona-danych" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={sciezki[ikona]} /></svg>{tekst}</>
}

function opiszDyspozycje(pozycja: PozycjaChecklisty) {
  const dyspozycja = pozycja.importDyspozycji
  if (!dyspozycja) return ''
  return [
    dyspozycja.dyspozycja.formaPrzekazania === 'online' ? 'Materiały online' : '',
    dyspozycja.dyspozycja.sposobPrzygotowania === 'drukuje_klient' ? 'Drukuje klient' : '',
    dyspozycja.dyspozycja.formaPrzekazania === 'papierowa' && dyspozycja.dyspozycja.sposobPrzygotowania !== 'drukuje_klient' && dyspozycja.dyspozycja.terminPrzekazania !== 'po_szkoleniu' ? 'Do wydrukowania' : '',
    dyspozycja.dyspozycja.terminPrzekazania === 'po_szkoleniu' ? dyspozycja.rodzaj === 'certyfikaty' ? 'Certyfikaty po szkoleniu' : 'Po szkoleniu' : '',
  ].filter(Boolean).join(' · ')
}

function InformacjaDyspozycji({ dane, pozycja, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; pozycja: PozycjaChecklisty; zablokowana: boolean; zapisz: Zapis }) {
  const dyspozycja = pozycja.importDyspozycji
  if (!dyspozycja) return null
  const czyNiepewna = dyspozycja.dyspozycja.status === 'niepewne'
  const czyZablokowana = zablokowana || !czyMoznaImportowacDyspozycje(dane)
  const ilosc = pobierzIloscPozycji(pozycja, pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow, dni(dane)).koncowa
  return <>
    <small>{opiszDyspozycje(pozycja)}</small>
    <details className="checklista-paczki__zrodlo-dyspozycji"><summary>Źródło: mail</summary><small>{dyspozycja.dyspozycja.tekstZrodlowy}</small></details>
    {czyNiepewna && <small role="status">Dyspozycja niejednoznaczna — popraw mail lub potwierdź dane w Szczegółach.</small>}
    {dyspozycja.czyKonfliktReczny && <>
      <small role="status">Zachowano ręczne ustawienia. Obecnie: {pozycja.czyNieDotyczy ? 'poza paczką' : pozycja.czyOnline ? 'online' : `druk, ${ilosc} egz.`}. Nowa dyspozycja: {dyspozycja.dyspozycja.tekstZrodlowy}.</small>
      <button type="button" disabled={czyZablokowana || czyNiepewna} onClick={() => {
        if (dane.migawkaZrodla) zapisz(zastosujDyspozycjeMaterialoweChecklisty(dane, dane.migawkaZrodla, { paczkaId: pozycja.paczkaId, pozycjeZeZgoda: [pozycja.id] }).dane, `Użytkownik zaakceptował dyspozycję dla pozycji: ${pozycja.nazwa}.`)
      }}>Zastosuj dyspozycję z maila</button>
    </>}
    {dyspozycja.czyIloscWymagaPotwierdzenia && <>
      <small role="status">Propozycja {dyspozycja.propozycjaIlosci} egz. — ilość wymaga potwierdzenia.</small>
      <button type="button" disabled={czyZablokowana || dyspozycja.czyKonfliktReczny || ilosc <= 0} onClick={() => zapisz(potwierdzIloscDyspozycji(dane, pozycja.id), `Potwierdzono ilość ${ilosc} dla pozycji: ${pozycja.nazwa}.`)}>Potwierdź ilość: {ilosc}</button>
    </>}
  </>
}

function Pozycja({ dane, pozycja, zablokowana, zapisz, przeniesNa }: { dane: DaneChecklistyPaczki; pozycja: PozycjaChecklisty; zablokowana: boolean; zapisz: Zapis; przeniesNa: (id: string, cel: string) => void }) {
  const [szczegoly, ustawSzczegoly] = useState(false)
  const [menu, ustawMenu] = useState(false)
  const stan = pobierzStanKompletowaniaPozycji(dane, pozycja)
  const zmien = (zmiana: (obecna: PozycjaChecklisty) => PozycjaChecklisty) => zapisz(zmienPozycje(dane, pozycja.id, zmiana), 'Zmieniono pozycję checklisty.')
  const pozostale = dane.pozycje.filter((obecna) => obecna.paczkaId === pozycja.paczkaId && obecna.kategoriaId === pozycja.kategoriaId).sort((a, b) => a.kolejnosc - b.kolejnosc)
  const indeks = pozostale.findIndex((obecna) => obecna.id === pozycja.id)
  const przesun = (kierunek: -1 | 1) => zapisz(przeniesPozycjeWObrebieKategorii(dane, pozycja.id, kierunek), 'Zmieniono kolejność pozycji.')
  const ostrzezenie = pozycja.importDyspozycji?.czyIloscWymagaPotwierdzenia ? 'Potwierdź ilość' : pozycja.importDyspozycji?.czyKonfliktReczny ? 'Konflikt z mailem' : pozycja.importDyspozycji?.dyspozycja.status === 'niepewne' ? 'Sprawdź dyspozycję' : ''
  const status = pozycja.czyOnline ? 'Online' : !stan.czyDoPakowania ? 'Poza paczką' : stan.czyGotowa ? 'Komplet' : stan.brakujacaIlosc ? `Brakuje ${stan.brakujacaIlosc}` : 'Potwierdź komplet'
  return <tbody onDragOver={(zdarzenie) => { if (!zablokowana) zdarzenie.preventDefault() }} onDrop={(zdarzenie) => { zdarzenie.preventDefault(); if (!zablokowana) przeniesNa(zdarzenie.dataTransfer.getData('text/x-pozycja-checklisty'), pozycja.id) }}>
    <tr className="checklista-paczki__material" data-gotowa={stan.czyGotowa}>
      <td><button type="button" className="checklista-paczki__uchwyt" draggable={!zablokowana} disabled={zablokowana} aria-label={`Zmień kolejność: ${pozycja.nazwa}`} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" aria-describedby="instrukcja-kolejnosci-materialow" onDragStart={(zdarzenie) => { zdarzenie.dataTransfer.setData('text/x-pozycja-checklisty', pozycja.id); zdarzenie.dataTransfer.effectAllowed = 'move' }} onKeyDown={(zdarzenie) => {
        if (zdarzenie.altKey && ['ArrowUp', 'ArrowDown'].includes(zdarzenie.key)) { zdarzenie.preventDefault(); przesun(zdarzenie.key === 'ArrowUp' ? -1 : 1) }
      }}>↕</button></td>
      <td><input aria-label="Materiał lub element" disabled={zablokowana} value={pozycja.nazwa} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, nazwa: zdarzenie.target.value }))} />
        {ostrzezenie && <button type="button" className="checklista-paczki__sygnal" onClick={() => ustawSzczegoly(true)}>{ostrzezenie}</button>}{opiszDyspozycje(pozycja) && <small>{opiszDyspozycje(pozycja)}</small>}</td>
      <td><input aria-label={`Ilość wymagana: ${pozycja.nazwa}`} disabled={zablokowana || pozycja.czyOnline} min="0" type="number" placeholder={String(stan.wymaganaIlosc)} value={pozycja.nadpisanieReczne ?? ''} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, nadpisanieReczne: zdarzenie.target.value === '' ? null : Math.max(0, Number(zdarzenie.target.value) || 0) }))} /></td>
      <td><input aria-label={`Ilość przygotowana: ${pozycja.nazwa}`} disabled={zablokowana || pozycja.czyOnline} min="0" type="number" value={pozycja.iloscPrzygotowana ?? ''} placeholder="—" onChange={(zdarzenie) => zapisz(zmienIloscPrzygotowanaPozycji(dane, pozycja.id, zdarzenie.target.value === '' ? null : Number(zdarzenie.target.value)), 'Zmieniono przygotowaną ilość pozycji.')} /></td>
      <td><button aria-label={`Oznacz jako gotową: ${pozycja.nazwa}`} aria-describedby={'stan-' + pozycja.id} className="checklista-paczki__status-materialu" aria-pressed={stan.czyGotowa} disabled={zablokowana || (!stan.czyGotowa && !stan.czyMoznaPotwierdzic)} type="button" onClick={() => zapisz(ustawPotwierdzenieKompletuPozycji(dane, pozycja.id, !stan.czyGotowa), 'Zmieniono potwierdzenie kompletu pozycji.')}><span id={'stan-' + pozycja.id}>{status}</span></button></td>
      <td className="checklista-paczki__akcje-materialu"><button type="button" aria-label={`Szczegóły: ${pozycja.nazwa}`} aria-expanded={szczegoly} aria-controls={'szczegoly-' + pozycja.id} onClick={() => ustawSzczegoly(!szczegoly)}>Szczegóły</button>
        <div className="checklista-paczki__menu-materialu" onBlur={(zdarzenie) => { if (!zdarzenie.currentTarget.contains(zdarzenie.relatedTarget)) ustawMenu(false) }} onKeyDown={(zdarzenie) => { if (zdarzenie.key === 'Escape') { ustawMenu(false); zdarzenie.currentTarget.querySelector('button')?.focus() } }}>
          <button type="button" aria-label={`Akcje: ${pozycja.nazwa}`} aria-expanded={menu} aria-controls={'akcje-' + pozycja.id} onClick={() => ustawMenu(!menu)}>⋯</button>
          {menu && <div id={'akcje-' + pozycja.id} className="checklista-paczki__menu-akcje">
            <button type="button" disabled={zablokowana || indeks === 0} aria-label={`W górę: ${pozycja.nazwa}`} onClick={() => przesun(-1)}>Przenieś wyżej</button>
            <button type="button" disabled={zablokowana || indeks === pozostale.length - 1} aria-label={`W dół: ${pozycja.nazwa}`} onClick={() => przesun(1)}>Przenieś niżej</button>
            <button disabled={zablokowana} type="button" aria-label={`Usuń: ${pozycja.nazwa}`} onClick={() => zapisz({ ...dane, pozycje: dane.pozycje.filter((obecna) => obecna.id !== pozycja.id) }, 'Usunięto pozycję.')}>Usuń</button>
          </div>}
        </div>
      </td>
    </tr>
    <tr hidden={!szczegoly} id={'szczegoly-' + pozycja.id}><td colSpan={6}>
      <InformacjaDyspozycji dane={dane} pozycja={pozycja} zablokowana={zablokowana} zapisz={zapisz} />
      <div className="checklista-paczki__pola-szczegolow">
        <label>Status<select disabled={zablokowana} value={pozycja.statusGotowosci} onChange={(zdarzenie) => zdarzenie.target.value === 'GOTOWE' ? zapisz(ustawPotwierdzenieKompletuPozycji(dane, pozycja.id, true), 'Potwierdzono komplet pozycji.') : zmien((obecna) => ({ ...obecna, statusGotowosci: zdarzenie.target.value as PozycjaChecklisty['statusGotowosci'] }))}><option value="NIEGOTOWE">Niegotowe</option><option value="W_TOKU_LUB_PROBLEM">W toku / problem</option><option value="CZESCIOWO_GOTOWE">Częściowo gotowe</option><option value="GOTOWE">Gotowe</option></select></label>
        <label>Wzór klienta<input disabled={zablokowana} value={pozycja.wzorKlienta} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, wzorKlienta: zdarzenie.target.value }))} /></label>
        <label>Uwagi drukowane<textarea disabled={zablokowana} value={pozycja.uwagiDrukowane} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, uwagiDrukowane: zdarzenie.target.value }))} /></label>
        <label>Notatki wewnętrzne<textarea disabled={zablokowana} value={pozycja.notatkiWewnetrzne} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, notatkiWewnetrzne: zdarzenie.target.value }))} /></label>
      </div>
    </td></tr>
  </tbody>
}

function KategoriaMaterialow({ dane, paczkaId, kategoria, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; paczkaId: string; kategoria: DaneChecklistyPaczki['kategorie'][number]; zablokowana: boolean; zapisz: Zapis }) {
  const [nazwa, ustawNazwe] = useState('')
  const [dodawanie, ustawDodawanie] = useState(false)
  const [komunikat, ustawKomunikat] = useState('')
  const pozycje = dane.pozycje.filter((pozycja) => pozycja.paczkaId === paczkaId && pozycja.kategoriaId === kategoria.id).sort((a, b) => a.kolejnosc - b.kolejnosc)
  const przeniesNa = (id: string, cel: string) => {
    const poczatek = pozycje.findIndex((pozycja) => pozycja.id === id)
    const koniec = pozycje.findIndex((pozycja) => pozycja.id === cel)
    if (poczatek < 0 || koniec < 0 || poczatek === koniec) return
    let wynik = dane
    const kierunek = poczatek < koniec ? 1 : -1
    for (let krok = 0; krok < Math.abs(koniec - poczatek); krok++) wynik = przeniesPozycjeWObrebieKategorii(wynik, id, kierunek)
    zapisz(wynik, 'Zmieniono kolejność pozycji.')
    ustawKomunikat(`Przeniesiono materiał na pozycję ${koniec + 1}.`)
  }
  const dodaj = () => {
    const nowa = utworzNowaPozycjeChecklisty(kategoria.id, nazwa, dane.pozycje, paczkaId)
    if (nowa) { zapisz({ ...dane, pozycje: [...dane.pozycje, nowa] }, 'Dodano pozycję do paczki.'); ustawNazwe('') }
  }
  return <section className="checklista-paczki__kategoria checklista-paczki__kategoria-edycji">
    <div className="checklista-paczki__dodaj-w-kategorii"><button type="button" disabled={zablokowana} aria-label={`Dodaj materiał: ${kategoria.nazwa}`} onClick={() => ustawDodawanie(!dodawanie)}>+ Dodaj</button></div>
    <details open><summary>{kategoria.nazwa} ({pozycje.length})</summary>
      {dodawanie && <div className="checklista-paczki__dodawanie"><label>Nowa pozycja w kategorii {kategoria.nazwa}<input autoFocus disabled={zablokowana} value={nazwa} onChange={(zdarzenie) => ustawNazwe(zdarzenie.target.value)} onKeyDown={(zdarzenie) => { if (zdarzenie.key === 'Enter') { zdarzenie.preventDefault(); dodaj() } }} /></label><button type="button" disabled={zablokowana || !nazwa.trim()} onClick={dodaj}>Dodaj pozycję do kategorii</button></div>}
      <div className="checklista-paczki__kontener-tabeli"><table className="checklista-paczki__tabela-materialow" aria-label={`Materiały: ${kategoria.nazwa}`}>
        <thead><tr><th scope="col"><span className="checklista-paczki__tylko-czytnik">Kolejność</span></th><th scope="col">Nazwa</th><th scope="col">Wymagane</th><th scope="col">Przygot.</th><th scope="col">Stan</th><th scope="col">Akcje</th></tr></thead>
        {pozycje.map((pozycja) => <Pozycja key={pozycja.id} dane={dane} pozycja={pozycja} zablokowana={zablokowana} zapisz={zapisz} przeniesNa={przeniesNa} />)}
      </table></div>
    </details><span role="status" className="checklista-paczki__tylko-czytnik">{komunikat}</span>
  </section>
}

function Paczki({ dane, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; zablokowana: boolean; zapisz: Zapis }) {
  const [nazwa, ustawNazwe] = useState(''); const [pozycja, ustawPozycje] = useState(''); const [nazwaSzablonu, ustawNazweSzablonu] = useState(''); const [szablony, ustawSzablony] = useState(pobierzSzablonyChecklistPaczek); const kategorie = [...dane.kategorie].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const zmienPaczke = (id: string, f: (paczka: PaczkaChecklisty) => PaczkaChecklisty) => zapisz({ ...dane, paczki: dane.paczki.map((paczka) => paczka.id === id ? f(paczka) : paczka) }, 'Zmieniono paczkę.')
  return <section className="checklista-paczki__karta"><h2>Paczki</h2><p id="instrukcja-kolejnosci-materialow" className="checklista-paczki__tylko-czytnik">Przeciągnij uchwyt lub użyj Alt i strzałki w górę / w dół. Zmiana kolejności jest też dostępna w menu Akcje.</p><div className="checklista-paczki__dodawanie"><label>Nowa paczka<input disabled={zablokowana} value={nazwa} onChange={(e) => ustawNazwe(e.target.value)} /></label><button disabled={zablokowana} type="button" onClick={() => { zapisz({ ...dane, paczki: [...dane.paczki, utworzNowaPaczkeChecklisty(dane.paczki, nazwa)] }, 'Dodano paczkę.'); ustawNazwe('') }}>Dodaj paczkę</button></div><details><summary>Szablony checklist</summary><label>Nazwa szablonu<input disabled={zablokowana} value={nazwaSzablonu} onChange={(e) => ustawNazweSzablonu(e.target.value)} /></label><button disabled={zablokowana || !nazwaSzablonu.trim()} type="button" onClick={() => { const szablon = utworzSzablonChecklistyPaczki(dane, nazwaSzablonu); if (szablon && zapiszNowySzablonChecklisty(szablon)) { ustawSzablony(pobierzSzablonyChecklistPaczek()); ustawNazweSzablonu('') } }}>Zapisz szablon</button><select defaultValue="" onChange={(e) => { const szablon = szablony.find((x) => x.id === e.target.value); if (szablon) zapisz(zastosujSzablonChecklistyPaczki(dane, szablon), 'Zastosowano szablon.') }}><option value="">Wczytaj szablon…</option>{szablony.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></details>{[...dane.paczki].sort((a, b) => a.kolejnosc - b.kolejnosc).map((paczka) => <details className="checklista-paczki__paczka" id={'paczka-' + paczka.id} key={paczka.id} open><summary>{paczka.nazwa} · {paczka.statusOperacyjny}</summary><div className="checklista-paczki__ustawienia-paczki"><label>Nazwa<input disabled={zablokowana} value={paczka.nazwa} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, nazwa: e.target.value }))} /></label><label>Status<select disabled={zablokowana} value={paczka.statusOperacyjny} onChange={(e) => zapisz(ustawStatusOperacyjnyPaczki(dane, paczka.id, e.target.value as PaczkaChecklisty['statusOperacyjny']), 'Zmieniono status operacyjny paczki.')}><option value="ROBOCZA">Robocza</option><option value="W_PRZYGOTOWANIU">W przygotowaniu</option><option value="GOTOWA" disabled={paczka.statusOperacyjny !== 'GOTOWA'}>Gotowa — zatwierdź w kompletowaniu</option><option value="WYSŁANA">Wysłana</option></select></label><button disabled={zablokowana} type="button" onClick={() => zapisz(duplikujPaczkeChecklisty(dane, paczka.id), 'Duplikowano paczkę.')}>Duplikuj paczkę</button></div><details className="checklista-paczki__logistyka"><summary>Parametry logistyczne</summary><div className="checklista-paczki__formularz-danych">{(['przewoznik', 'numerPrzesylki', 'waga', 'wysokosc'] as const).map((pole) => <label key={pole}>{pole}<input disabled={zablokowana} value={paczka.parametryLogistyczne[pole]} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, parametryLogistyczne: { ...x.parametryLogistyczne, [pole]: e.target.value } }))} /></label>)}<label>Data wysłania<input disabled={zablokowana} type="date" value={paczka.parametryLogistyczne.dataWyslania} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, parametryLogistyczne: { ...x.parametryLogistyczne, dataWyslania: e.target.value } }))} /></label></div></details><div className="checklista-paczki__dodawanie"><label>Nowa pozycja<input disabled={zablokowana} value={pozycja} onChange={(e) => ustawPozycje(e.target.value)} /></label><button disabled={zablokowana} type="button" onClick={() => { const nowa = utworzNowaPozycjeChecklisty(kategorie[0]?.id ?? '', pozycja, dane.pozycje, paczka.id); if (nowa) { zapisz({ ...dane, pozycje: [...dane.pozycje, nowa] }, 'Dodano pozycję do paczki.'); ustawPozycje('') } }}>Dodaj pozycję</button></div>{kategorie.map((kategoria) => <KategoriaMaterialow key={kategoria.id} dane={dane} paczkaId={paczka.id} kategoria={kategoria} zablokowana={zablokowana} zapisz={zapisz} />)}</details>)}</section>
}

function PozycjaKompletowania({ dane, pozycja, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; pozycja: PozycjaChecklisty; zablokowana: boolean; zapisz: Zapis }) {
  const stan = pobierzStanKompletowaniaPozycji(dane, pozycja)
  const zmienIlosc = (ilosc: number | null) => zapisz(zmienIloscPrzygotowanaPozycji(dane, pozycja.id, ilosc), `Paczka ${dane.paczki.find((paczka) => paczka.id === pozycja.paczkaId)?.nazwa}: ${pozycja.nazwa} — przygotowano ${ilosc ?? 'nie policzono'} egz.`)
  return <article className="checklista-paczki__pozycja-kompletowania" aria-label={pozycja.nazwa} data-gotowa={stan.czyGotowa}>
    <div><h4>{pozycja.nazwa}</h4>{!stan.czyDoPakowania && <p>{pozycja.czyOnline ? 'Online — poza kompletowaniem wydruków' : 'Poza paczką'}</p>}<small>{opiszDyspozycje(pozycja)}</small>
      {(!pozycja.czyWymagana || pozycja.czyOpcjonalna) && <small>Pozycja niewymagana</small>}
      {pozycja.importDyspozycji && <><span className="checklista-paczki__sygnal">{pozycja.importDyspozycji.czyIloscWymagaPotwierdzenia ? 'Potwierdź ilość' : pozycja.importDyspozycji.czyKonfliktReczny ? 'Konflikt z mailem' : pozycja.importDyspozycji.dyspozycja.status === 'niepewne' ? 'Sprawdź dyspozycję' : 'Dyspozycja z maila'}</span><details><summary>Szczegóły dyspozycji</summary><InformacjaDyspozycji dane={dane} pozycja={pozycja} zablokowana={zablokowana} zapisz={zapisz} /></details></>}
    </div>
    {stan.czyDoPakowania && <>
      <div className="checklista-paczki__wymagane-kompletowanie"><span className="checklista-paczki__tylko-czytnik">Wymagane</span><strong>{stan.wymaganaIlosc}</strong></div>
      <div className="checklista-paczki__liczenie">
        <button type="button" aria-label={`Zmniejsz ilość: ${pozycja.nazwa}`} disabled={zablokowana || !pozycja.iloscPrzygotowana} onClick={() => zmienIlosc((pozycja.iloscPrzygotowana ?? 0) - 1)}>−</button>
        <label><span className="checklista-paczki__tylko-czytnik">Przygotowano</span><input aria-label={`Ilość przygotowana: ${pozycja.nazwa}`} type="number" min="0" step="1" disabled={zablokowana} value={pozycja.iloscPrzygotowana ?? ''} placeholder="0" onChange={(zdarzenie) => zmienIlosc(zdarzenie.target.value === '' ? null : Number(zdarzenie.target.value))} /></label>
        <button type="button" aria-label={`Zwiększ ilość: ${pozycja.nazwa}`} disabled={zablokowana} onClick={() => zmienIlosc((pozycja.iloscPrzygotowana ?? 0) + 1)}>+</button>
      </div>
      <div className="checklista-paczki__potwierdzenie-pozycji">
        <p role="status">{stan.brakujacaIlosc ? `Brakuje ${stan.brakujacaIlosc} egz.` : stan.czyGotowa ? 'Komplet potwierdzony' : 'Ilość przygotowana'}</p>
        <button type="button" aria-pressed={stan.czyGotowa} disabled={zablokowana || (!stan.czyGotowa && !stan.czyMoznaPotwierdzic)} onClick={() => zapisz(ustawPotwierdzenieKompletuPozycji(dane, pozycja.id, !stan.czyGotowa), `${stan.czyGotowa ? 'Cofnięto' : 'Zapisano'} potwierdzenie kompletu: ${pozycja.nazwa} (${dane.paczki.find((paczka) => paczka.id === pozycja.paczkaId)?.nazwa}).`)} aria-label={stan.czyGotowa ? 'Cofnij potwierdzenie kompletu' : 'Potwierdź pełny komplet'}>{stan.czyGotowa ? 'Komplet ✓' : 'Potwierdź'}</button>
      </div>
    </>}
  </article>
}

function PanelKompletowania({ dokumentId, dane, zablokowana, zapisz, odswiez, moznaZatwierdzic }: {
  dokumentId: string; dane: DaneChecklistyPaczki; zablokowana: boolean; zapisz: Zapis; odswiez: () => void; moznaZatwierdzic: boolean
}) {
  const [wybranaPaczkaId, ustawWybranaPaczke] = useState(() => odczytajPaczkeZKotwicy(window.location.hash))
  const paczki = [...dane.paczki].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
  const paczka = paczki.find((obecna) => obecna.id === wybranaPaczkaId) ?? paczki[0]
  const postep = pobierzPostepKompletowaniaPaczki(dane, paczka.id)
  const brakujace = new Set(postep.brakujacePozycje.map((pozycja) => pozycja.id))
  const czyZablokowana = zablokowana || paczka.statusOperacyjny === 'WYSŁANA'
  const pozycje = dane.pozycje.filter((pozycja) => pozycja.paczkaId === paczka.id && (czyPozycjaJestAktywna(pozycja) || pozycja.importDyspozycji))
  return <section className="checklista-paczki__karta checklista-paczki__kompletowanie" aria-label="Panel kompletowania">
    <div className="checklista-paczki__wybor-paczki" role="group" aria-label="Wybierz paczkę">{paczki.map((obecna) => {
      const wynik = pobierzPostepKompletowaniaPaczki(dane, obecna.id)
      return <button type="button" key={obecna.id} aria-pressed={obecna.id === paczka.id} onClick={() => {
        ustawWybranaPaczke(obecna.id)
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#paczka-' + encodeURIComponent(obecna.id))
      }}>{obecna.nazwa} · {wynik.liczbaGotowych}/{wynik.liczbaWymaganych}</button>
    })}</div>
    <section id={'paczka-' + paczka.id} aria-label={`Kompletowanie: ${paczka.nazwa}`}>
      <div className="checklista-paczki__postep-naglowek"><h3>{paczka.nazwa}</h3><p role="status">{postep.liczbaGotowych}/{postep.liczbaWymaganych} pozycji · {postep.procent}%</p></div><progress aria-label={`Postęp: ${paczka.nazwa}`} max="100" value={postep.procent} /><p>Status operacyjny: {({ ROBOCZA: 'Wymaga przygotowania', W_PRZYGOTOWANIU: 'W trakcie kompletowania', GOTOWA: 'Gotowa', WYSŁANA: 'Wysłana' })[paczka.statusOperacyjny]}</p>
      <p>Po przeliczeniu egzemplarzy potwierdź komplet przyciskiem w wierszu.</p>
      {[...dane.kategorie].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc).map((kategoria) => {
        const nalezace = pozycje.filter((pozycja) => pozycja.kategoriaId === kategoria.id).sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
        return <details className="checklista-paczki__kategoria-kompletowania" key={paczka.id + kategoria.id} open>
          <summary>{kategoria.nazwa} · do przygotowania: {nalezace.filter((pozycja) => brakujace.has(pozycja.id)).length}</summary>
          <div className="checklista-paczki__naglowek-kompletowania" aria-hidden="true"><span>Materiał</span><span>Wymagane</span><span>Przygotowano</span><span>Stan</span></div>
          {nalezace.length ? nalezace.map((pozycja) => <PozycjaKompletowania key={pozycja.id} dane={dane} pozycja={pozycja} zablokowana={czyZablokowana} zapisz={zapisz} />) : <p>Brak aktywnych pozycji.</p>}
        </details>
      })}
      <div className="checklista-paczki__podsumowanie-kompletowania" aria-label="Podsumowanie kompletowania">
        <h3>{postep.czyMozna ? 'Paczka kompletna' : 'Pozostało do przygotowania'}</h3>
        {postep.brakujacePozycje.length > 0 && <ul>{postep.brakujacePozycje.map((pozycja) => <li key={pozycja.id}>{pozycja.nazwa}{pobierzStanKompletowaniaPozycji(dane, pozycja).brakujacaIlosc ? ` — brakuje ${pobierzStanKompletowaniaPozycji(dane, pozycja).brakujacaIlosc} egz.` : ' — wymaga potwierdzenia lub weryfikacji'}</li>)}</ul>}
        {postep.czyBrakujeDanychWysylkowych && <p role="status">Brakuje kompletnego adresu odbiorcy. Uzupełnij go w edycji checklisty.</p>}
        <WeryfikacjaZdjeciaPaczki key={paczka.id} dokumentId={dokumentId} dane={dane} paczka={paczka}
          zablokowana={czyZablokowana || !moznaZatwierdzic} odswiez={odswiez} />
        {!moznaZatwierdzic && <p>Zapis zdjęcia i zatwierdzenie kompletności wymagają uprawnienia wysyłki oraz zapisanej checklisty.</p>}
      </div>
      <details><summary>Parametry logistyczne i historia paczki</summary>
        <p>{[paczka.parametryLogistyczne.przewoznik, paczka.parametryLogistyczne.numerPrzesylki, paczka.parametryLogistyczne.dataWyslania].filter(Boolean).join(' · ') || 'Brak parametrów logistycznych.'}</p>
        <ul>{dane.historia.filter((wpis) => wpis.paczkaId === paczka.id || wpis.zmianyDyspozycji?.some((zmiana) => zmiana.paczkaId === paczka.id)).map((wpis) => <li key={wpis.id}>{wpis.data} · {wpis.opis}</li>)}</ul>
        <p>Starsze wpisy bez powiązania z paczką pozostają w historii checklisty.</p>
      </details>
    </section>
  </section>
}

function pobierzKlaseKoloruKategorii(nazwa: string): string {
  const nazwaZnormalizowana = nazwa.trim().toLocaleLowerCase('pl').replace(/\s+/g, ' ')
  switch (nazwaZnormalizowana) {
    case 'materiały': return 'checklista-paczki__wydruk-tabela--materialy'
    case 'teczki':
    case 'program':
    case 'teczki / program': return 'checklista-paczki__wydruk-tabela--teczki'
    case 'pakiet crm': return 'checklista-paczki__wydruk-tabela--pakiet-crm'
    case 'gadżety': return 'checklista-paczki__wydruk-tabela--gadzety'
    case 'inne': return 'checklista-paczki__wydruk-tabela--inne'
    default: return 'checklista-paczki__wydruk-tabela--niestandardowa'
  }
}

export function Druk({ obszar, dane, zasoby, blokId, tryb, ustawBlok, zmienBlok }: { obszar: RefObject<HTMLElement | null>; dane: DaneChecklistyPaczki; zasoby: Record<string, string | undefined>; blokId: string | null; tryb: boolean; ustawBlok: (id: string | null) => void; zmienBlok: (blok: DaneChecklistyPaczki['blokiSwobodne'][number]) => void }) { const szkolenie = pobierzDaneSzkoleniaChecklisty(dane); const opiekun = pobierzUzytkownika(dane.opiekunId); const uczestnicy = szkolenie.liczbaUczestnikow; const kategorie = [...dane.kategorie].sort((a, b) => a.kolejnosc - b.kolejnosc); return <section ref={obszar} aria-label="Podgląd wydruku Checklisty paczki" className="checklista-paczki__wydruk" id="wydruk-checklisty"><div className="checklista-paczki__wydruk-naglowek"><RendererSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} wysokoscStronyMm={18} kontekst={{ dane, zasobyObrazow: zasoby }} trybRenderowania="roboczy" /><EdytowalnaWarstwaSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} wysokoscStronyMm={18} zaznaczonyBlokId={blokId} trybEdycjiSzablonu={tryb} onZaznacz={ustawBlok} onZmienBlok={zmienBlok} /></div><h1>Checklista paczek</h1>
<table className="checklista-paczki__wydruk-tabela-danych" aria-label="Dane szkolenia">
  <tbody>
    <tr><th scope="row"><EtykietaDanych ikona="szkolenie" tekst="Nazwa szkolenia:" /></th><td>{szkolenie.tytulSzkolenia || '—'}</td><th scope="row"><EtykietaDanych ikona="osoby" tekst="Liczba osób:" /></th><td>{uczestnicy}</td></tr>
    <tr><th scope="row"><EtykietaDanych ikona="firma" tekst="Klient:" /></th><td>{dane.klient || '—'}</td><th scope="row"><EtykietaDanych ikona="osoby" tekst="Trener:" /></th><td>{szkolenie.trenerzy.join(', ') || '—'}</td></tr>
    <tr><th scope="row"><EtykietaDanych ikona="termin" tekst="Termin:" /></th><td>{szkolenie.terminy.map(formatujDateDoWydruku).join(', ') || '—'}</td><th scope="row"><EtykietaDanych ikona="osoby" tekst="Opiekun:" /></th><td>{opiekun ? pobierzNazweWyswietlanaUzytkownika(opiekun) : '—'}</td></tr>
    <tr><th scope="row"><EtykietaDanych ikona="lokalizacja" tekst="Lokalizacja:" /></th><td>{szkolenie.miejsce || '—'}</td><th scope="row"><EtykietaDanych ikona="osoby" tekst="Grupa:" /></th><td>{szkolenie.nazwaGrupy || '—'}</td></tr>
    <tr><th scope="row"><EtykietaDanych ikona="firma" tekst="Organizator:" /></th><td>{szkolenie.organizator || '—'}</td><th scope="row"><EtykietaDanych ikona="podpis" tekst="Podpis opiekuna:" /></th><td /></tr>
  </tbody>
</table>
{[...dane.paczki].sort((a, b) => a.kolejnosc - b.kolejnosc).map((paczka) => <section className="checklista-paczki__wydruk-paczka" key={paczka.id}><h2>{paczka.nazwa}</h2><table className="checklista-paczki__wydruk-tabela-materialow">
  <colgroup><col style={{ width: '18%' }} /><col style={{ width: '32%' }} /><col style={{ width: '19%' }} /><col style={{ width: '31%' }} /></colgroup>
  <thead><tr><th scope="col">Kategoria</th><th scope="col">Pozycja</th><th scope="col">Przygotowane / wymagane</th><th scope="col">Uwagi</th></tr></thead>
  {kategorie.map((kategoria) => {
    const aktywnePozycje = dane.pozycje.filter((pozycja) => pozycja.paczkaId === paczka.id && pozycja.kategoriaId === kategoria.id && czyPozycjaJestAktywna(pozycja))
    if (!aktywnePozycje.length) return null
    return <tbody key={kategoria.id} className={pobierzKlaseKoloruKategorii(kategoria.nazwa)}>
      {aktywnePozycje.map((pozycja, indeks) => <tr key={pozycja.id}>
        {indeks === 0
          ? <th scope="rowgroup" className="checklista-paczki__wydruk-kategoria">{kategoria.nazwa}</th>
          : <td className="checklista-paczki__wydruk-kategoria" />}
        <td>{pozycja.nazwa}</td>
        <td className="checklista-paczki__wydruk-ilosc"><IlosciPozycji pozycja={pozycja} uczestnicy={uczestnicy} liczbaDni={dni(dane)} /></td>
        <td className="checklista-paczki__wydruk-uwagi">{pozycja.uwagiDrukowane}</td>
      </tr>)}
    </tbody>
  })}
</table>
<table className="checklista-paczki__wydruk-tabela-wysylki" aria-label={`Dane wysyłkowe: ${paczka.nazwa}`}>
  <thead><tr><th scope="col">Przewoźnik</th><th scope="col">Numer przesyłki</th><th scope="col">Waga</th><th scope="col">Wysłano</th></tr></thead>
  <tbody><tr><td>{paczka.parametryLogistyczne.przewoznik || '—'}</td><td>{paczka.parametryLogistyczne.numerPrzesylki || '—'}</td><td>{paczka.parametryLogistyczne.waga || '—'}</td><td>{formatujDateDoWydruku(paczka.parametryLogistyczne.dataWyslania) || '—'}</td></tr></tbody>
</table></section>)}</section> }

export default function WidokChecklistPaczek({ dokumentIdZTrasy, otworzDokument }: Wlasciwosci) {
  const [dokumentId, ustawDokumentId] = useState(dokumentIdZTrasy)
  const [celEtykiety, ustawCelEtykiety] = useState(() => odczytajCelEtykiety(window.location.search, window.location.hash))
  const [czyKompletowanie, ustawKompletowanie] = useState(celEtykiety?.cel === 'k')
  const [czyEtykiety, ustawEtykiety] = useState(false)
  const [wersjaOdczytu, odswiezWidok] = useState(0)
  useEffect(() => {
    if (!czyEtykiety && !celEtykiety) return
    const odczytaj = () => odswiezWidok((wersja) => wersja + 1)
    window.addEventListener('storage', odczytaj)
    window.addEventListener('focus', odczytaj)
    return () => { window.removeEventListener('storage', odczytaj); window.removeEventListener('focus', odczytaj) }
  }, [czyEtykiety, celEtykiety])
  useEffect(() => {
    const paczkaId = odczytajPaczkeZKotwicy(window.location.hash)
    if (!paczkaId) return
    const identyfikator = window.requestAnimationFrame(() => document.getElementById('paczka-' + paczkaId)?.scrollIntoView({ block: 'start' }))
    return () => window.cancelAnimationFrame(identyfikator)
  }, [dokumentId])
  const [trybZrodla, ustawTrybZrodla] = useState<'reczny' | 'powiazany'>('reczny')
  const [niezapisaneDane, ustawNiezapisaneDane] = useState<{ id: string; dane: DaneChecklistyPaczki } | null>(null)
  const tworzenieRozpoczete = useRef(false)
  useEffect(() => {
    const odczytajTrase = () => {
      const dopasowanie = window.location.pathname.match(/^\/dokumenty\/checklisty-paczek\/([^/]+)$/)
      const id = dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
      if (!id) { tworzenieRozpoczete.current = false; ustawTrybZrodla('reczny') }
      ustawDokumentId(id)
      const cel = odczytajCelEtykiety(window.location.search, window.location.hash)
      ustawCelEtykiety(cel)
      ustawKompletowanie(cel?.cel === 'k')
      ustawEtykiety(false)
    }
    window.addEventListener('popstate', odczytajTrase)
    return () => window.removeEventListener('popstate', odczytajTrase)
  }, [])
  const { zalogowanyUzytkownik } = useKontekstUzytkownika(); const [szczegolyId, ustawSzczegoly] = useState(''); const [grupaId, ustawGrupe] = useState(''); const [blokId, ustawBlok] = useState<string | null>(null); const [tryb, ustawTryb] = useState(false); const [zasoby, ustawZasoby] = useState(() => pobierzMapeZasobowObrazowDokumentu()); const podglad = useRef<HTMLElement>(null);
  // Odczyt rejestru ponawiamy po operacji zapisu, zamiast przy każdym znaku.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dokument = useMemo(() => dokumentId ? pobierzChecklistePaczki(dokumentId) : null, [dokumentId, wersjaOdczytu]);
  const daneDoPonowienia = niezapisaneDane?.id === dokumentId ? niezapisaneDane.dane : null
  const stan = useStanDokumentu({
    dane: daneDoPonowienia ?? dokument?.daneDokumentu ?? null,
    serializuj: serializujDaneChecklisty,
    czyAutosaveAktywny: Boolean(daneDoPonowienia),
    zapiszAutomatycznie: (dane) => {
      if (dane && !zapisz(dane, 'Zapisano zmiany checklisty.')) throw new Error('Nie udało się zapisać checklisty.')
    },
  })
  const [szczegoly] = useState(pobierzSzczegolyDoChecklisty); const wybrane = szczegoly.find((x) => x.id === szczegolyId); const aktorId = zalogowanyUzytkownik?.id ?? null
  const odswiez = () => odswiezWidok((x) => x + 1)
  const potwierdzZapis = (wynik: ReturnType<typeof zapiszChecklistePaczki>) => {
    if (!wynik) { stan.oznaczBladZapisu(); return false }
    stan.oznaczJakoZapisany(wynik.daneDokumentu)
    odswiez()
    return true
  }
  const zapisz: Zapis = (dane, opis) => {
    if (!dokument) return false
    ustawNiezapisaneDane({ id: dokument.id, dane })
    if (!opis) return true
    stan.rozpocznijZapis()
    try {
      if (potwierdzZapis(zapiszChecklistePaczki(dokument.id, dane, aktorId, opis))) {
        ustawNiezapisaneDane(null)
        return true
      }
    } catch {
      stan.oznaczBladZapisu()
    }
    return false
  }
  useOchronaNiezapisanegoDokumentu(Boolean(daneDoPonowienia), () => daneDoPonowienia ? zapisz(daneDoPonowienia, 'Zapisano zmiany przed wyjściem.') : true)
  const oznaczJakoZapisany = stan.oznaczJakoZapisany
  useEffect(() => {
    const otwarta = dokumentId ? pobierzChecklistePaczki(dokumentId) : null
    oznaczJakoZapisany(otwarta?.daneDokumentu ?? null)
  }, [dokumentId, oznaczJakoZapisany])

  const dodajPlik = async (e: ChangeEvent<HTMLInputElement>, typ: TypZalacznikaChecklisty) => { const plik = e.target.files?.[0]; if (!plik || !dokument) return; const dane = await new Promise<string>((ok, blad) => { const czytnik = new FileReader(); czytnik.onload = () => ok(String(czytnik.result)); czytnik.onerror = () => blad(czytnik.error); czytnik.readAsDataURL(plik) }); if (dodajZalacznikChecklisty(dokument.id, { nazwa: plik.name, typ, dane, typMime: plik.type || 'application/octet-stream', autorId: aktorId, wersjaWydruku: dokument.daneDokumentu.wersjeWydruku.at(-1)?.wersja ?? null }, aktorId)) odswiez() }
  useEffect(() => {
    if (dokumentId || celEtykiety || tworzenieRozpoczete.current) return
    tworzenieRozpoczete.current = true
    const nowa = utworzRecznaChecklistePaczki(aktorId)
    otworz(nowa.id)
  }, [dokumentId, aktorId, celEtykiety])
  const miejscowosci = useMemo(() => [...new Set(pobierzLokalizacjeZMagazynu().map((lokalizacja) => lokalizacja.nazwa))].sort((pierwsza, druga) => pierwsza.localeCompare(druga, 'pl')), [])
  const trenerzy = useMemo(() => pobierzTrenerowZKartoteki(), [])
  if (celEtykiety && !czyJestPracownikiemWewnetrznym(zalogowanyUzytkownik)) return <section className="widok"><h1>Cel etykiety niedostępny</h1><p role="alert">Brak uprawnienia do otwarcia celu etykiety.</p></section>
  if (!dokument || dokument.czyUsunietyMiekko) return <section className="widok checklista-paczki"><h1>{celEtykiety ? 'Cel etykiety niedostępny' : 'Nowa checklista paczki'}</h1><p>{dokumentId || celEtykiety ? 'Nie znaleziono checklisty w tym profilu przeglądarki.' : 'Otwieranie formularza…'}</p></section>
  if (celEtykiety && !dokument.daneDokumentu.paczki.some((paczka) => paczka.id === celEtykiety.paczkaId)) {
    return <section className="widok"><h1>Cel etykiety niedostępny</h1><p role="alert">Nie znaleziono paczki wskazanej na etykiecie.</p></section>
  }
  if (celEtykiety && celEtykiety.cel !== 'k') return <CelEtykietyPaczki key={dokument.id + celEtykiety.paczkaId + celEtykiety.cel}
    dokument={dokument} paczkaId={celEtykiety.paczkaId} cel={celEtykiety.cel} otworzDokument={otworzDokument} />
  const dane = daneDoPonowienia ?? dokument.daneDokumentu; const daneSzkolenia = pobierzDaneSzkoleniaChecklisty(dane); const zablokowana = dane.statusChecklisty === 'ZARCHIWIZOWANA'; const finalizacja = czyMoznaFinalizowacCheckliste(dane); const nazwa = { typDokumentu: 'CHECKLISTA_PACZKI' as const, terminy: daneSzkolenia.terminy, klient: dane.klient, tytulSzkolenia: daneSzkolenia.tytulSzkolenia, organizator: daneSzkolenia.organizator, miejsce: daneSzkolenia.miejsce, grupa: daneSzkolenia.nazwaGrupy, dataUtworzenia: dokument.utworzono, wersja: dokument.wersja }
  const podpowiedziMiejscowosci = (wartosc: string) => miejscowosci.filter((miejscowosc) => miejscowosc.toLocaleLowerCase('pl').includes(wartosc.trim().toLocaleLowerCase('pl'))).slice(0, 50)
  const poprzedniTrenerzy = daneSzkolenia.trenerzy.slice(0, -1)
  function zapiszWersjeWydruku(rodzaj: 'pdf' | 'wydruk') {
    if (!dokument) return
    const wynik = zarejestrujWydrukChecklisty(dokument.id, aktorId, rodzaj)
    if (!wynik) throw new Error('Nie udało się zapisać wersji checklisty.')
    stan.oznaczJakoZapisany(wynik.daneDokumentu)
    odswiez()
  }

  return <ObszarZPanelemGeneratora idPanelu="panel-ukladu-checklisty" kluczPrzypiecia="ultimate-pomagier.panel-generatora.checklisty-paczek.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.checklisty-paczek.wysuwanie" tytulPanelu="Edytuj układ"><section className="widok checklista-paczki" onBlurCapture={() => { if (daneDoPonowienia) zapisz(daneDoPonowienia, 'Zapisano zmiany checklisty.') }}><header className="checklista-paczki__naglowek-pracy"><div><h1>Checklista paczek</h1><p>{daneSzkolenia.tytulSzkolenia || 'Szkolenie bez tytułu'} · {daneSzkolenia.nazwaGrupy || 'Grupa bez nazwy'} · {dane.identyfikator}</p></div><p className="checklista-paczki__status-checklisty">Status: {dane.statusChecklisty.replaceAll('_', ' ')}</p><PasekAkcjiGeneratora>{!czyKompletowanie && !czyEtykiety && <PrzyciskPaneluGeneratora>Edytuj układ</PrzyciskPaneluGeneratora>}<StatusZapisuDokumentu stan={stan.stanZapisu} />{!czyEtykiety && <AkcjeEksportuPdf dokumentId={dokument.id} odciskFormularza={JSON.stringify(dane)} pobierzBladEksportu={() => 'Najpierw ponów zapis zmian checklisty.'} obszarDokumentu={podglad} czyMoznaEksportowac={() => !daneDoPonowienia && czyMoznaEksportowacCheckliste(dane)} daneNazwyEksportu={nazwa} nazwaPliku={zbudujNazweEksportowanegoDokumentu(nazwa)} plynnyUklad przedPobraniemPdf={() => zapiszWersjeWydruku('pdf')} poZamknieciuDruku={() => { if (window.confirm('Czy checklista została fizycznie wydrukowana?')) zapiszWersjeWydruku('wydruk') }} />}</PasekAkcjiGeneratora><div className="checklista-paczki__tryby" role="group" aria-label="Tryb pracy checklisty"><button type="button" aria-pressed={!czyKompletowanie && !czyEtykiety} onClick={() => { ustawKompletowanie(false); ustawEtykiety(false) }}>Edycja checklisty</button><button type="button" aria-pressed={czyKompletowanie && !czyEtykiety} onClick={() => { ustawKompletowanie(true); ustawEtykiety(false) }}>Kompletowanie paczki</button><button type="button" aria-pressed={czyEtykiety} onClick={() => { ustawKompletowanie(false); ustawEtykiety(true) }}>Etykiety paczek</button></div></header>{daneDoPonowienia && stan.stanZapisu === 'blad' && <div role="alert"><p>Nie udało się zapisać zmian. Wpisane dane pozostają w formularzu. Magazyn przeglądarki może być pełny lub niedostępny. Przed zamknięciem widoku ponów zapis.</p><button type="button" onClick={() => zapisz(daneDoPonowienia, 'Ponowiono zapis checklisty.')}>Ponów zapis</button></div>}{dane.czyDaneZrodloweNowsze && <p role="alert">Dane źródłowe zmieniły się po ostatnim wydruku.</p>}{czyEtykiety ? <PanelEtykietPaczek key={dokument.id} dokument={{ ...dokument, daneDokumentu: dane }} moznaZapisywac={!zablokowana && !daneDoPonowienia && czyMozeWysylac(zalogowanyUzytkownik)} zapisz={zapisz} odswiez={odswiez} /> : <UkladFormularzaIPodgladu className="checklista-paczki__obszar-pracy"><PanelGeneratoraDokumentu wariant="edycja">{czyKompletowanie ? <PanelKompletowania key={dokument.id + (celEtykiety?.paczkaId ?? '')} dokumentId={dokument.id} dane={dane} zablokowana={zablokowana} zapisz={zapisz} odswiez={odswiez} moznaZatwierdzic={!daneDoPonowienia && czyMozeWysylac(zalogowanyUzytkownik)} /> : <><Paczki dane={dane} zablokowana={zablokowana} zapisz={zapisz} /><section className="checklista-paczki__karta checklista-paczki__formularz-danych"><h2>Dane Checklisty</h2>
<label>Źródło danych<select disabled={zablokowana} value={dane.szczegolyOrganizacyjneId ? 'powiazany' : trybZrodla} onChange={(e) => { if (e.target.value === 'reczny' && dane.szczegolyOrganizacyjneId) { potwierdzZapis(odlaczChecklisteOdSzkolenia(dokument.id, aktorId)) } ustawTrybZrodla(e.target.value === 'powiazany' ? 'powiazany' : 'reczny') }}><option value="reczny">Uzupełnij ręcznie</option><option value="powiazany">Wybierz istniejące szkolenie</option></select></label>
{(trybZrodla === 'powiazany' || dane.szczegolyOrganizacyjneId) && <><p>Powiązane szkolenie: {dane.migawkaZrodla?.tytulSzkolenia || '—'}</p><label>Szkolenie / Szczegóły organizacyjne<select disabled={zablokowana} value={szczegolyId} onChange={(e) => { ustawSzczegoly(e.target.value); ustawGrupe('') }}><option value="">Wybierz szkolenie</option>{szczegoly.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></label><label>Grupa szkoleniowa<select disabled={zablokowana || !wybrane} value={grupaId} onChange={(e) => ustawGrupe(e.target.value)}><option value="">Wybierz grupę</option>{wybrane?.grupy.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></label><p>Powiązanie uzupełnia puste pola. Wpisane dane i pozycje pozostają zachowane.</p><button disabled={zablokowana || !wybrane || !grupaId} type="button" onClick={() => { if (wybrane) potwierdzZapis(powiazChecklisteZeSzkoleniem(dokument.id, zbudujKontekstZeSzczegolow(wybrane.zrodloKontekstu), grupaId, pobierzDaneZrodlowe(wybrane), aktorId)) }}>Powiąż ze szkoleniem</button></>}
{dane.szczegolyOrganizacyjneId && <button disabled={zablokowana} type="button" onClick={() => { if (potwierdzZapis(odlaczChecklisteOdSzkolenia(dokument.id, aktorId))) ustawTrybZrodla('reczny') }}>Odłącz od szkolenia</button>}
<p>Wszystkie pola opisowe są opcjonalne. Lokalne nadpisania zmieniają tylko Checklistę, nie dane szkolenia.</p>
{([['tytulSzkolenia', 'Tytuł szkolenia'], ['miejsce', 'Miejsce / tryb'], ['organizator', 'Organizator'], ['nazwaGrupy', 'Grupa / oznaczenie grupy']] as const).map(([pole, etykieta]) => <label key={pole}>{etykieta}<input list={pole === 'miejsce' ? 'checklista-miejscowosci' : undefined} disabled={zablokowana} value={daneSzkolenia[pole]} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, [pole]: e.target.value } })} /></label>)}
<label>Terminy / daty (oddziel przecinkiem)<input disabled={zablokowana} value={daneSzkolenia.terminy.join(',')} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, terminy: e.target.value ? e.target.value.split(',') : [] } })} /></label>
<label>Trenerzy (oddziel przecinkiem)<input list="checklista-trenerzy" disabled={zablokowana} value={daneSzkolenia.trenerzy.join(',')} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, trenerzy: e.target.value ? e.target.value.split(',') : [] } })} /></label>
<datalist id="checklista-miejscowosci">{podpowiedziMiejscowosci(daneSzkolenia.miejsce).map((miejscowosc) => <option key={miejscowosc} value={miejscowosc} />)}</datalist>
<datalist id="checklista-trenerzy">{trenerzy.map((trener) => <option key={trener.id} value={[...poprzedniTrenerzy, trener.imieNazwisko].join(',')} />)}</datalist>
<label>Klient / firma<input disabled={zablokowana} value={dane.klient} onChange={(e) => zapisz({ ...dane, klient: e.target.value, czyKlientNadpisany: true })} /></label>
<label>Liczba uczestników<input disabled={zablokowana} min="0" type="number" value={daneSzkolenia.liczbaUczestnikow} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, liczbaUczestnikow: Math.max(0, Number(e.target.value) || 0) } })} /></label>
<button disabled={zablokowana} type="button" onClick={() => zapisz({ ...dane, statusChecklisty: 'KOPIA_ROBOCZA' }, 'Zapisano kopię roboczą.')}>Zapisz jako roboczą</button>
</section><section className="checklista-paczki__karta checklista-paczki__formularz-danych"><h2>Odbiorca i wysyłka</h2><label>Odbiorca<input disabled={zablokowana} value={dane.daneOdbiorcy.imieNazwisko} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, imieNazwisko: e.target.value } })} /></label><label>Firma<input disabled={zablokowana} value={dane.daneOdbiorcy.nazwaFirmy} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, nazwaFirmy: e.target.value } })} /></label><label>Ulica<input disabled={zablokowana} value={dane.daneOdbiorcy.ulica} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, ulica: e.target.value } })} /></label>{([['nrBudynku', 'Numer budynku'], ['nrLokalu', 'Numer lokalu'], ['kodPocztowy', 'Kod pocztowy'], ['kraj', 'Kraj']] as const).map(([pole, etykieta]) => <label key={pole}>{etykieta}<input disabled={zablokowana} value={dane.daneOdbiorcy[pole]} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, [pole]: zdarzenie.target.value } })} /></label>)}<label>Miasto<input list="checklista-miasta-odbiorcy" disabled={zablokowana} value={dane.daneOdbiorcy.miasto} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, miasto: e.target.value } })} /></label><datalist id="checklista-miasta-odbiorcy">{podpowiedziMiejscowosci(dane.daneOdbiorcy.miasto).map((miejscowosc) => <option key={miejscowosc} value={miejscowosc} />)}</datalist></section><details className="checklista-paczki__karta"><summary>Uwagi / wymagania / weryfikacja</summary><p>{dane.migawkaZrodla?.uwagiZeSzczegolow.map((x) => `${x.etykieta}: ${x.tresc}`).join(' · ') || 'Brak uwag źródłowych.'}</p><button disabled={zablokowana} type="button" onClick={() => zapisz(zastosujWariantMaterialowOnline(dane), 'Zastosowano wariant materiałów online.')}>Materiały szkoleniowe online</button><p>{finalizacja.czyMozna ? 'Wymagane pozycje są kompletne.' : `Braki: ${finalizacja.brakujacePozycje.length}.`}</p><button disabled={zablokowana || !finalizacja.czyMozna} type="button" onClick={() => { ustawStatusChecklisty(dokument.id, 'GOTOWA_DO_WYDRUKU', aktorId, 'Oznaczono checklistę jako gotową do wydruku.'); odswiez() }}>Gotowa do wydruku</button><button disabled={zablokowana} type="button" onClick={() => { ustawStatusChecklisty(dokument.id, 'ZARCHIWIZOWANA', aktorId, 'Zarchiwizowano checklistę.'); odswiez() }}>Archiwizuj</button>{zablokowana && (zalogowanyUzytkownik?.rola === 'ADMINISTRATOR' || zalogowanyUzytkownik?.rola === 'ARCHITEKT') && <button type="button" onClick={() => { otworzPonownieCheckliste(dokument.id, zalogowanyUzytkownik.rola, aktorId); odswiez() }}>Otwórz ponownie</button>}</details><details className="checklista-paczki__karta"><summary>Załączniki i historia</summary><label>Skan podpisanej checklisty<input accept=".pdf,.jpg,.jpeg,.png" disabled={zablokowana} type="file" onChange={(e) => void dodajPlik(e, 'SKAN_PODPISANEJ_CHECKLISTY')} /></label>{dane.zalaczniki.map((x) => <p key={x.id}>{x.nazwa} — {x.typ}</p>)}{dane.wersjeWydruku.map((x) => <p key={x.wersja}>Wydruk v{x.wersja}: {x.utworzono}</p>)}<ul>{dane.historia.map((wpis) => <li key={wpis.id}>{wpis.data} · {wpis.opis}</li>)}</ul></details></>}</PanelGeneratoraDokumentu><PanelGeneratoraDokumentu wariant="podglad"><PodgladWydrukuPaczki tytul="Podgląd checklisty" szerokoscMm={210}><Druk obszar={podglad} dane={dane} zasoby={zasoby} blokId={blokId} tryb={tryb && !czyKompletowanie} ustawBlok={ustawBlok} zmienBlok={(blok) => zapisz({ ...dane, blokiSwobodne: dane.blokiSwobodne.map((x) => x.id === blok.id ? blok : x) }, 'Zmieniono układ dokumentu.')} /></PodgladWydrukuPaczki></PanelGeneratoraDokumentu></UkladFormularzaIPodgladu>}{!czyKompletowanie && !czyEtykiety && <PanelBocznyGeneratora><PanelEdycjiSwobodnychBlokow bloki={dane.blokiSwobodne} blokiSzablonu={utworzBlokiSzablonuChecklistyPaczki()} liczbaStron={1} wysokoscStronyMm={18} zaznaczonyBlokId={blokId} trybEdycjiSzablonu={tryb} onDodajObraz={async (plik) => { const klucz = await zapiszZasobObrazuDokumentu(plik); ustawZasoby(pobierzMapeZasobowObrazowDokumentu()); return klucz }} onZmienBloki={(blokiSwobodne) => zapisz({ ...dane, blokiSwobodne }, 'Zmieniono układ dokumentu.')} onZmienTrybEdycjiSzablonu={ustawTryb} /></PanelBocznyGeneratora>}</section></ObszarZPanelemGeneratora>
}
