import { useEffect, useRef, useState, type RefObject, type ChangeEvent } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { EdytowalnaWarstwaSwobodnychBlokow, PanelEdycjiSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import { pobierzMapeZasobowObrazowDokumentu, zapiszZasobObrazuDokumentu } from '../../../../wspolne/dokumenty/zasobyObrazowDokumentu'
import { zbudujNazweEksportowanegoDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { czyMoznaEksportowacCheckliste, pobierzDaneSzkoleniaChecklisty, przeniesPozycjeWObrebieKategorii, czyMoznaFinalizowacCheckliste, czyPozycjaJestAktywna, duplikujPaczkeChecklisty, formatujDateDoWydruku, formatujIloscPozycji, pobierzIloscPozycji, zastosujSzablonChecklistyPaczki, zastosujWariantMaterialowOnline, utworzBlokiSzablonuChecklistyPaczki, utworzNowaPaczkeChecklisty, utworzNowaPozycjeChecklisty, utworzSzablonChecklistyPaczki, type DaneChecklistyPaczki, type PaczkaChecklisty, type PozycjaChecklisty, type TypZalacznikaChecklisty } from './modelChecklistyPaczki'
import { pobierzSzablonyChecklistPaczek, zapiszNowySzablonChecklisty } from './szablonyChecklistPaczek'
import { utworzRecznaChecklistePaczki, powiazChecklisteZeSzkoleniem, odlaczChecklisteOdSzkolenia, dodajZalacznikChecklisty, otworzPonownieCheckliste, pobierzChecklistePaczki, pobierzSzczegolyDoChecklisty, ustawStatusChecklisty, zarejestrujWydrukChecklisty, zapiszChecklistePaczki, type DaneZrodlaChecklisty } from './rejestrChecklistPaczek'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import { pobierzUzytkownika } from '../../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzNazweWyswietlanaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import './widokChecklistPaczek.css'

type Wlasciwosci = { dokumentIdZTrasy: string | null }
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

function Pozycja({ dane, pozycja, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; pozycja: PozycjaChecklisty; zablokowana: boolean; zapisz: Zapis }) {
  const ilosc = pobierzIloscPozycji(pozycja, pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow, dni(dane)); const zmien = (f: (obecna: PozycjaChecklisty) => PozycjaChecklisty) => zapisz(zmienPozycje(dane, pozycja.id, f), 'Zmieniono pozycję checklisty.')
  return <article className="checklista-paczki__wiersz"><button aria-label={`Oznacz jako gotową: ${pozycja.nazwa}`} className="checklista-paczki__przycisk-gotowosci" disabled={zablokowana || pozycja.czyOnline} type="button" onClick={() => zmien((obecna) => ({ ...obecna, statusGotowosci: obecna.statusGotowosci === 'GOTOWE' ? 'NIEGOTOWE' : 'GOTOWE', iloscPrzygotowana: obecna.statusGotowosci === 'GOTOWE' ? obecna.iloscPrzygotowana : obecna.iloscPrzygotowana ?? ilosc.koncowa }))}>{pozycja.statusGotowosci === 'GOTOWE' ? '✓' : '○'}</button><input aria-label="Materiał lub element" disabled={zablokowana} value={pozycja.nazwa} onChange={(e) => zmien((obecna) => ({ ...obecna, nazwa: e.target.value }))} /><div className="checklista-paczki__ilosci"><IlosciPozycji pozycja={pozycja} uczestnicy={pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow} liczbaDni={dni(dane)} /><small>{pozycja.czyOnline ? '' : pozycja.iloscPrzygotowana === null ? 'nie policzono' : pozycja.iloscPrzygotowana >= ilosc.koncowa ? 'komplet' : `brakuje ${ilosc.koncowa - pozycja.iloscPrzygotowana}`}</small></div><input aria-label={`Ilość przygotowana: ${pozycja.nazwa}`} disabled={zablokowana || pozycja.czyOnline} min="0" type="number" value={pozycja.iloscPrzygotowana ?? ''} onChange={(e) => zmien((obecna) => ({ ...obecna, iloscPrzygotowana: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) }))} /><button disabled={zablokowana} type="button" aria-label={`Usuń: ${pozycja.nazwa}`} onClick={() => zapisz({ ...dane, pozycje: dane.pozycje.filter((obecna) => obecna.id !== pozycja.id) }, 'Usunięto pozycję.')}>Usuń</button><div className="checklista-paczki__kolejnosc-pozycji">{([-1, 1] as const).map((kierunek) => <button key={kierunek} disabled={zablokowana} type="button" aria-label={`${kierunek === -1 ? 'W górę' : 'W dół'}: ${pozycja.nazwa}`} onClick={() => zapisz(przeniesPozycjeWObrebieKategorii(dane, pozycja.id, kierunek))}>{kierunek === -1 ? '↑' : '↓'}</button>)}</div><details className="checklista-paczki__szczegoly-pozycji"><summary>Szczegóły</summary><div className="checklista-paczki__pola-szczegolow"><label>Ilość wymagana (ręcznie)<input disabled={zablokowana} min="0" type="number" value={pozycja.nadpisanieReczne ?? ''} onChange={(e) => zmien((obecna) => ({ ...obecna, nadpisanieReczne: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) }))} /></label><label>Status<select disabled={zablokowana} value={pozycja.statusGotowosci} onChange={(e) => zmien((obecna) => ({ ...obecna, statusGotowosci: e.target.value as PozycjaChecklisty['statusGotowosci'] }))}><option value="NIEGOTOWE">Niegotowe</option><option value="W_TOKU_LUB_PROBLEM">W toku / problem</option><option value="CZESCIOWO_GOTOWE">Częściowo gotowe</option><option value="GOTOWE">Gotowe</option></select></label><label>Wzór klienta<input disabled={zablokowana} value={pozycja.wzorKlienta} onChange={(e) => zmien((obecna) => ({ ...obecna, wzorKlienta: e.target.value }))} /></label><label>Uwagi drukowane<textarea disabled={zablokowana} value={pozycja.uwagiDrukowane} onChange={(e) => zmien((obecna) => ({ ...obecna, uwagiDrukowane: e.target.value }))} /></label><label>Notatki wewnętrzne<textarea disabled={zablokowana} value={pozycja.notatkiWewnetrzne} onChange={(e) => zmien((obecna) => ({ ...obecna, notatkiWewnetrzne: e.target.value }))} /></label></div></details></article>
}

function Paczki({ dane, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; zablokowana: boolean; zapisz: Zapis }) {
  const [nazwa, ustawNazwe] = useState(''); const [pozycja, ustawPozycje] = useState(''); const [nazwaSzablonu, ustawNazweSzablonu] = useState(''); const [szablony, ustawSzablony] = useState(pobierzSzablonyChecklistPaczek); const kategorie = [...dane.kategorie].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const zmienPaczke = (id: string, f: (paczka: PaczkaChecklisty) => PaczkaChecklisty) => zapisz({ ...dane, paczki: dane.paczki.map((paczka) => paczka.id === id ? f(paczka) : paczka) }, 'Zmieniono paczkę.')
  return <section className="checklista-paczki__karta"><h2>Paczki</h2><p>Paczka → Kategorie → Pozycje</p><label>Nowa paczka<input disabled={zablokowana} value={nazwa} onChange={(e) => ustawNazwe(e.target.value)} /></label><button disabled={zablokowana} type="button" onClick={() => { zapisz({ ...dane, paczki: [...dane.paczki, utworzNowaPaczkeChecklisty(dane.paczki, nazwa)] }, 'Dodano paczkę.'); ustawNazwe('') }}>Dodaj paczkę</button><details><summary>Szablony checklist</summary><label>Nazwa szablonu<input disabled={zablokowana} value={nazwaSzablonu} onChange={(e) => ustawNazweSzablonu(e.target.value)} /></label><button disabled={zablokowana || !nazwaSzablonu.trim()} type="button" onClick={() => { const szablon = utworzSzablonChecklistyPaczki(dane, nazwaSzablonu); if (szablon && zapiszNowySzablonChecklisty(szablon)) { ustawSzablony(pobierzSzablonyChecklistPaczek()); ustawNazweSzablonu('') } }}>Zapisz szablon</button><select defaultValue="" onChange={(e) => { const szablon = szablony.find((x) => x.id === e.target.value); if (szablon) zapisz(zastosujSzablonChecklistyPaczki(dane, szablon), 'Zastosowano szablon.') }}><option value="">Wczytaj szablon…</option>{szablony.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></details>{[...dane.paczki].sort((a, b) => a.kolejnosc - b.kolejnosc).map((paczka) => <details className="checklista-paczki__paczka" key={paczka.id} open><summary>{paczka.nazwa} · {paczka.statusOperacyjny}</summary><label>Nazwa<input disabled={zablokowana} value={paczka.nazwa} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, nazwa: e.target.value }))} /></label><label>Status<select disabled={zablokowana} value={paczka.statusOperacyjny} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, statusOperacyjny: e.target.value as PaczkaChecklisty['statusOperacyjny'] }))}><option value="ROBOCZA">Robocza</option><option value="W_PRZYGOTOWANIU">W przygotowaniu</option><option value="GOTOWA">Gotowa</option><option value="WYSŁANA">Wysłana</option></select></label><button disabled={zablokowana} type="button" onClick={() => zapisz(duplikujPaczkeChecklisty(dane, paczka.id), 'Duplikowano paczkę.')}>Duplikuj paczkę</button>{(['przewoznik', 'numerPrzesylki', 'waga', 'wysokosc'] as const).map((pole) => <label key={pole}>{pole}<input disabled={zablokowana} value={paczka.parametryLogistyczne[pole]} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, parametryLogistyczne: { ...x.parametryLogistyczne, [pole]: e.target.value } }))} /></label>)}<label>Data wysłania<input disabled={zablokowana} type="date" value={paczka.parametryLogistyczne.dataWyslania} onChange={(e) => zmienPaczke(paczka.id, (x) => ({ ...x, parametryLogistyczne: { ...x.parametryLogistyczne, dataWyslania: e.target.value } }))} /></label><label>Nowa pozycja<input disabled={zablokowana} value={pozycja} onChange={(e) => ustawPozycje(e.target.value)} /></label><button disabled={zablokowana} type="button" onClick={() => { const nowa = utworzNowaPozycjeChecklisty(kategorie[0]?.id ?? '', pozycja, dane.pozycje, paczka.id); if (nowa) { zapisz({ ...dane, pozycje: [...dane.pozycje, nowa] }, 'Dodano pozycję do paczki.'); ustawPozycje('') } }}>Dodaj pozycję</button>{kategorie.map((kategoria) => <section className="checklista-paczki__kategoria" key={kategoria.id}><h3>{kategoria.nazwa}</h3>{dane.pozycje.filter((x) => x.paczkaId === paczka.id && x.kategoriaId === kategoria.id).sort((a, b) => a.kolejnosc - b.kolejnosc).map((x) => <Pozycja dane={dane} key={x.id} pozycja={x} zablokowana={zablokowana} zapisz={zapisz} />)}</section>)}</details>)}</section>
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

function Druk({ obszar, dane, zasoby, blokId, tryb, ustawBlok, zmienBlok }: { obszar: RefObject<HTMLElement | null>; dane: DaneChecklistyPaczki; zasoby: Record<string, string | undefined>; blokId: string | null; tryb: boolean; ustawBlok: (id: string | null) => void; zmienBlok: (blok: DaneChecklistyPaczki['blokiSwobodne'][number]) => void }) { const szkolenie = pobierzDaneSzkoleniaChecklisty(dane); const opiekun = pobierzUzytkownika(dane.opiekunId); const uczestnicy = szkolenie.liczbaUczestnikow; const kategorie = [...dane.kategorie].sort((a, b) => a.kolejnosc - b.kolejnosc); return <section ref={obszar} aria-label="Podgląd wydruku Checklisty paczki" className="checklista-paczki__wydruk" id="wydruk-checklisty"><div className="checklista-paczki__wydruk-naglowek"><RendererSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} kontekst={{ dane, zasobyObrazow: zasoby }} trybRenderowania="roboczy" /><EdytowalnaWarstwaSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} zaznaczonyBlokId={blokId} trybEdycjiSzablonu={tryb} onZaznacz={ustawBlok} onZmienBlok={zmienBlok} /></div><h1>Checklista paczek</h1>
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
  <colgroup><col style={{ width: '18%' }} /><col style={{ width: '34%' }} /><col style={{ width: '24%' }} /><col style={{ width: '24%' }} /></colgroup>
  <thead><tr><th scope="col">Kategoria</th><th scope="col">Pozycja</th><th scope="col">Przygotowane / wymagane</th><th scope="col">Uwagi</th></tr></thead>
  {kategorie.map((kategoria) => {
    const aktywnePozycje = dane.pozycje.filter((pozycja) => pozycja.paczkaId === paczka.id && pozycja.kategoriaId === kategoria.id && czyPozycjaJestAktywna(pozycja))
    if (!aktywnePozycje.length) return null
    return <tbody key={kategoria.id} className={pobierzKlaseKoloruKategorii(kategoria.nazwa)}>
      {aktywnePozycje.map((pozycja, indeks) => <tr key={pozycja.id}>
        {indeks === 0 && <th scope="rowgroup" rowSpan={aktywnePozycje.length} className="checklista-paczki__wydruk-kategoria">{kategoria.nazwa}</th>}
        <td>{pozycja.nazwa}</td>
        <td className="checklista-paczki__wydruk-ilosc"><IlosciPozycji pozycja={pozycja} uczestnicy={uczestnicy} liczbaDni={dni(dane)} /></td>
        <td>{pozycja.uwagiDrukowane}</td>
      </tr>)}
    </tbody>
  })}
</table>
<table className="checklista-paczki__wydruk-tabela-wysylki" aria-label={`Dane wysyłkowe: ${paczka.nazwa}`}>
  <thead><tr><th scope="col">Przewoźnik</th><th scope="col">Numer przesyłki</th><th scope="col">Waga</th><th scope="col">Wysłano</th></tr></thead>
  <tbody><tr><td>{paczka.parametryLogistyczne.przewoznik || '—'}</td><td>{paczka.parametryLogistyczne.numerPrzesylki || '—'}</td><td>{paczka.parametryLogistyczne.waga || '—'}</td><td>{formatujDateDoWydruku(paczka.parametryLogistyczne.dataWyslania) || '—'}</td></tr></tbody>
</table></section>)}</section> }

export default function WidokChecklistPaczek({ dokumentIdZTrasy }: Wlasciwosci) {
  const [dokumentId, ustawDokumentId] = useState(dokumentIdZTrasy)
  const [trybZrodla, ustawTrybZrodla] = useState<'reczny' | 'powiazany'>('reczny')
  const [niezapisaneDane, ustawNiezapisaneDane] = useState<{ id: string; dane: DaneChecklistyPaczki } | null>(null)
  const tworzenieRozpoczete = useRef(false)
  useEffect(() => {
    const odczytajTrase = () => {
      const dopasowanie = window.location.pathname.match(/^\/dokumenty\/checklisty-paczek\/([^/]+)$/)
      const id = dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
      if (!id) { tworzenieRozpoczete.current = false; ustawTrybZrodla('reczny') }
      ustawDokumentId(id)
    }
    window.addEventListener('popstate', odczytajTrase)
    return () => window.removeEventListener('popstate', odczytajTrase)
  }, [])
  const { zalogowanyUzytkownik } = useKontekstUzytkownika(); const [, odswiezWidok] = useState(0); const [szczegolyId, ustawSzczegoly] = useState(''); const [grupaId, ustawGrupe] = useState(''); const [blokId, ustawBlok] = useState<string | null>(null); const [tryb, ustawTryb] = useState(false); const [zasoby, ustawZasoby] = useState(() => pobierzMapeZasobowObrazowDokumentu()); const podglad = useRef<HTMLElement>(null); const dokument = dokumentId ? pobierzChecklistePaczki(dokumentId) : null; const stan = useStanDokumentu({ dane: dokument?.daneDokumentu ?? null, czyAutosaveAktywny: false }); const szczegoly = pobierzSzczegolyDoChecklisty(); const wybrane = szczegoly.find((x) => x.id === szczegolyId); const aktorId = zalogowanyUzytkownik?.id ?? null
  const odswiez = () => odswiezWidok((x) => x + 1)
  const potwierdzZapis = (wynik: ReturnType<typeof zapiszChecklistePaczki>) => {
    if (!wynik) { stan.oznaczBladZapisu(); return false }
    stan.oznaczJakoZapisany(wynik.daneDokumentu)
    odswiez()
    return true
  }
  const zapisz: Zapis = (dane, opis) => {
    if (!dokument) return false
    stan.rozpocznijZapis()
    ustawNiezapisaneDane({ id: dokument.id, dane })
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
  const daneDoPonowienia = niezapisaneDane?.id === dokumentId ? niezapisaneDane.dane : null
  useOchronaNiezapisanegoDokumentu(Boolean(daneDoPonowienia), () => daneDoPonowienia ? zapisz(daneDoPonowienia) : true)
  const oznaczJakoZapisany = stan.oznaczJakoZapisany
  useEffect(() => {
    const otwarta = dokumentId ? pobierzChecklistePaczki(dokumentId) : null
    oznaczJakoZapisany(otwarta?.daneDokumentu ?? null)
  }, [dokumentId, oznaczJakoZapisany])

  const dodajPlik = async (e: ChangeEvent<HTMLInputElement>, typ: TypZalacznikaChecklisty) => { const plik = e.target.files?.[0]; if (!plik || !dokument) return; const dane = await new Promise<string>((ok, blad) => { const czytnik = new FileReader(); czytnik.onload = () => ok(String(czytnik.result)); czytnik.onerror = () => blad(czytnik.error); czytnik.readAsDataURL(plik) }); if (dodajZalacznikChecklisty(dokument.id, { nazwa: plik.name, typ, dane, typMime: plik.type || 'application/octet-stream', autorId: aktorId, wersjaWydruku: dokument.daneDokumentu.wersjeWydruku.at(-1)?.wersja ?? null }, aktorId)) odswiez() }
  useEffect(() => {
    if (dokumentId || tworzenieRozpoczete.current) return
    tworzenieRozpoczete.current = true
    const nowa = utworzRecznaChecklistePaczki(aktorId)
    otworz(nowa.id)
  }, [dokumentId, aktorId])
  if (!dokument) return <section className="widok checklista-paczki"><h1>Nowa checklista paczki</h1><p>{dokumentId ? 'Nie znaleziono checklisty.' : 'Otwieranie formularza…'}</p></section>
  const dane = daneDoPonowienia ?? dokument.daneDokumentu; const daneSzkolenia = pobierzDaneSzkoleniaChecklisty(dane); const zablokowana = dane.statusChecklisty === 'ZARCHIWIZOWANA'; const finalizacja = czyMoznaFinalizowacCheckliste(dane); const nazwa = { typDokumentu: 'CHECKLISTA_PACZKI' as const, terminy: daneSzkolenia.terminy, klient: dane.klient, tytulSzkolenia: daneSzkolenia.tytulSzkolenia, organizator: daneSzkolenia.organizator, miejsce: daneSzkolenia.miejsce, grupa: daneSzkolenia.nazwaGrupy, dataUtworzenia: dokument.utworzono, wersja: dokument.wersja }
  return <ObszarZPanelemGeneratora idPanelu="panel-ukladu-checklisty" kluczPrzypiecia="ultimate-pomagier.panel-generatora.checklisty-paczek.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.checklisty-paczek.wysuwanie" tytulPanelu="Edytuj układ"><section className="widok checklista-paczki"><header><h1>Checklista paczek</h1><p>Status: {dane.statusChecklisty}</p><PasekAkcjiGeneratora><PrzyciskPaneluGeneratora>Edytuj układ</PrzyciskPaneluGeneratora><StatusZapisuDokumentu stan={stan.stanZapisu} /><AkcjeEksportuPdf pobierzBladEksportu={() => 'Najpierw ponów zapis zmian checklisty.'} obszarDokumentu={podglad} czyMoznaEksportowac={() => !daneDoPonowienia && czyMoznaEksportowacCheckliste(dane)} daneNazwyEksportu={nazwa} nazwaPliku={zbudujNazweEksportowanegoDokumentu(nazwa)} przygotujEksport={() => { const wynik = zarejestrujWydrukChecklisty(dokument.id, aktorId); if (!wynik) throw new Error('Nie udało się zapisać wydruku.'); stan.oznaczJakoZapisany(wynik.daneDokumentu); odswiez() }} /></PasekAkcjiGeneratora></header>{daneDoPonowienia && <div role="alert"><p>Nie udało się zapisać zmian. Wpisane dane pozostają w formularzu. Magazyn przeglądarki może być pełny lub niedostępny. Przed zamknięciem widoku ponów zapis.</p><button type="button" onClick={() => zapisz(daneDoPonowienia)}>Ponów zapis</button></div>}{dane.czyDaneZrodloweNowsze && <p role="alert">Dane źródłowe zmieniły się po ostatnim wydruku.</p>}<UkladFormularzaIPodgladu><PanelGeneratoraDokumentu wariant="edycja"><section className="checklista-paczki__karta"><h2>Dane Checklisty</h2>
<label>Źródło danych<select disabled={zablokowana} value={dane.szczegolyOrganizacyjneId ? 'powiazany' : trybZrodla} onChange={(e) => { if (e.target.value === 'reczny' && dane.szczegolyOrganizacyjneId) { potwierdzZapis(odlaczChecklisteOdSzkolenia(dokument.id, aktorId)) } ustawTrybZrodla(e.target.value === 'powiazany' ? 'powiazany' : 'reczny') }}><option value="reczny">Uzupełnij ręcznie</option><option value="powiazany">Wybierz istniejące szkolenie</option></select></label>
{(trybZrodla === 'powiazany' || dane.szczegolyOrganizacyjneId) && <><p>Powiązane szkolenie: {dane.migawkaZrodla?.tytulSzkolenia || '—'}</p><label>Szkolenie / Szczegóły organizacyjne<select disabled={zablokowana} value={szczegolyId} onChange={(e) => { ustawSzczegoly(e.target.value); ustawGrupe('') }}><option value="">Wybierz szkolenie</option>{szczegoly.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></label><label>Grupa szkoleniowa<select disabled={zablokowana || !wybrane} value={grupaId} onChange={(e) => ustawGrupe(e.target.value)}><option value="">Wybierz grupę</option>{wybrane?.grupy.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select></label><p>Powiązanie uzupełnia puste pola. Wpisane dane i pozycje pozostają zachowane.</p><button disabled={zablokowana || !wybrane || !grupaId} type="button" onClick={() => { if (wybrane) potwierdzZapis(powiazChecklisteZeSzkoleniem(dokument.id, zbudujKontekstZeSzczegolow(wybrane.zrodloKontekstu), grupaId, pobierzDaneZrodlowe(wybrane), aktorId)) }}>Powiąż ze szkoleniem</button></>}
{dane.szczegolyOrganizacyjneId && <button disabled={zablokowana} type="button" onClick={() => { if (potwierdzZapis(odlaczChecklisteOdSzkolenia(dokument.id, aktorId))) ustawTrybZrodla('reczny') }}>Odłącz od szkolenia</button>}
<p>Wszystkie pola opisowe są opcjonalne. Lokalne nadpisania zmieniają tylko Checklistę, nie dane szkolenia.</p>
{([['tytulSzkolenia', 'Tytuł szkolenia'], ['miejsce', 'Miejsce / tryb'], ['organizator', 'Organizator'], ['nazwaGrupy', 'Grupa / oznaczenie grupy']] as const).map(([pole, etykieta]) => <label key={pole}>{etykieta}<input disabled={zablokowana} value={daneSzkolenia[pole]} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, [pole]: e.target.value } })} /></label>)}
<label>Terminy / daty (oddziel przecinkiem)<input disabled={zablokowana} value={daneSzkolenia.terminy.join(',')} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, terminy: e.target.value ? e.target.value.split(',') : [] } })} /></label>
<label>Trenerzy (oddziel przecinkiem)<input disabled={zablokowana} value={daneSzkolenia.trenerzy.join(',')} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, trenerzy: e.target.value ? e.target.value.split(',') : [] } })} /></label>
<label>Klient / firma<input disabled={zablokowana} value={dane.klient} onChange={(e) => zapisz({ ...dane, klient: e.target.value, czyKlientNadpisany: true })} /></label>
<label>Liczba uczestników<input disabled={zablokowana} min="0" type="number" value={daneSzkolenia.liczbaUczestnikow} onChange={(e) => zapisz({ ...dane, daneSzkolenia: { ...daneSzkolenia, liczbaUczestnikow: Math.max(0, Number(e.target.value) || 0) } })} /></label>
<button disabled={zablokowana} type="button" onClick={() => zapisz({ ...dane, statusChecklisty: 'KOPIA_ROBOCZA' }, 'Zapisano kopię roboczą.')}>Zapisz jako roboczą</button>
</section><section className="checklista-paczki__karta"><h2>Odbiorca i wysyłka</h2><label>Odbiorca<input disabled={zablokowana} value={dane.daneOdbiorcy.imieNazwisko} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, imieNazwisko: e.target.value } })} /></label><label>Firma<input disabled={zablokowana} value={dane.daneOdbiorcy.nazwaFirmy} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, nazwaFirmy: e.target.value } })} /></label><label>Ulica<input disabled={zablokowana} value={dane.daneOdbiorcy.ulica} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, ulica: e.target.value } })} /></label><label>Miasto<input disabled={zablokowana} value={dane.daneOdbiorcy.miasto} onChange={(e) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, miasto: e.target.value } })} /></label></section><Paczki dane={dane} zablokowana={zablokowana} zapisz={zapisz} /><details className="checklista-paczki__karta"><summary>Uwagi / wymagania / weryfikacja</summary><p>{dane.migawkaZrodla?.uwagiZeSzczegolow.map((x) => `${x.etykieta}: ${x.tresc}`).join(' · ') || 'Brak uwag źródłowych.'}</p><button disabled={zablokowana} type="button" onClick={() => zapisz(zastosujWariantMaterialowOnline(dane), 'Zastosowano wariant materiałów online.')}>Materiały szkoleniowe online</button><p>{finalizacja.czyMozna ? 'Wymagane pozycje są kompletne.' : `Braki: ${finalizacja.brakujacePozycje.length}.`}</p><button disabled={zablokowana || !finalizacja.czyMozna} type="button" onClick={() => { ustawStatusChecklisty(dokument.id, 'GOTOWA_DO_WYDRUKU', aktorId, 'Oznaczono checklistę jako gotową do wydruku.'); odswiez() }}>Gotowa do wydruku</button><button disabled={zablokowana} type="button" onClick={() => { ustawStatusChecklisty(dokument.id, 'ZARCHIWIZOWANA', aktorId, 'Zarchiwizowano checklistę.'); odswiez() }}>Archiwizuj</button>{zablokowana && (zalogowanyUzytkownik?.rola === 'ADMINISTRATOR' || zalogowanyUzytkownik?.rola === 'ARCHITEKT') && <button type="button" onClick={() => { otworzPonownieCheckliste(dokument.id, zalogowanyUzytkownik.rola, aktorId); odswiez() }}>Otwórz ponownie</button>}</details><details className="checklista-paczki__karta"><summary>Załączniki i historia</summary><label>Skan podpisanej checklisty<input accept=".pdf,.jpg,.jpeg,.png" disabled={zablokowana} type="file" onChange={(e) => void dodajPlik(e, 'SKAN_PODPISANEJ_CHECKLISTY')} /></label>{dane.zalaczniki.map((x) => <p key={x.id}>{x.nazwa} — {x.typ}</p>)}{dane.wersjeWydruku.map((x) => <p key={x.wersja}>Wydruk v{x.wersja}: {x.utworzono}</p>)}</details></PanelGeneratoraDokumentu><PanelGeneratoraDokumentu wariant="podglad"><Druk obszar={podglad} dane={dane} zasoby={zasoby} blokId={blokId} tryb={tryb} ustawBlok={ustawBlok} zmienBlok={(blok) => zapisz({ ...dane, blokiSwobodne: dane.blokiSwobodne.map((x) => x.id === blok.id ? blok : x) }, 'Zmieniono układ dokumentu.')} /></PanelGeneratoraDokumentu></UkladFormularzaIPodgladu><PanelBocznyGeneratora><PanelEdycjiSwobodnychBlokow bloki={dane.blokiSwobodne} blokiSzablonu={utworzBlokiSzablonuChecklistyPaczki()} liczbaStron={1} zaznaczonyBlokId={blokId} trybEdycjiSzablonu={tryb} onDodajObraz={async (plik) => { const klucz = await zapiszZasobObrazuDokumentu(plik); ustawZasoby(pobierzMapeZasobowObrazowDokumentu()); return klucz }} onZmienBloki={(blokiSwobodne) => zapisz({ ...dane, blokiSwobodne }, 'Zmieniono układ dokumentu.')} onZmienTrybEdycjiSzablonu={ustawTryb} /></PanelBocznyGeneratora></section></ObszarZPanelemGeneratora>
}
