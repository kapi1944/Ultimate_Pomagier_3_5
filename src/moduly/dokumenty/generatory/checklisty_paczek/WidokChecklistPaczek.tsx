import { useState, type ChangeEvent } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import { pobierzUzytkownika } from '../../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzNazweWyswietlanaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { przygotujZrodloZOpublikowanychSzczegolow, zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import {
  zastosujWariantMaterialowOnline,
  czyMoznaFinalizowacCheckliste,
  czyPozycjaJestAktywna,
  czyPozycjaZaleznaOdUczestnikow,
  formatujIloscPozycji,
  formatujTerminyZPrzerwami,
  obliczIloscPodstawowa,
  pobierzEtykieteStatusuGotowosci,
  pobierzIloscPozycji,
  przeniesPozycjeWObrebieKategorii,
  utworzNowaKategorieChecklisty,
  utworzNowaPozycjeChecklisty,
  type DaneChecklistyPaczki,
  type DaneOdbiorcyChecklisty,
  type PozycjaChecklisty,
  type StatusGotowosciPozycji,
  type TrybPrePostTestow,
  type TypZalacznikaChecklisty,
  type UwagaZeSzczegolow,
} from './modelChecklistyPaczki'
import { AkcjeRekordu } from '../../../../wspolne/komponenty/AkcjeRekordu'
import {
  dodajZalacznikChecklisty,
  duplikujIstniejacaChecklistePaczki,
  otworzPonownieCheckliste,
  pobierzChecklistePaczki,
  pobierzChecklistyPaczek,
  pobierzOpublikowaneSzczegolyDoChecklisty,
  ustawStatusChecklisty,
  utworzChecklistePaczkiZeZrodla,
  usunChecklistePaczki,
  zarejestrujWydrukChecklisty,
  zapiszChecklistePaczki,
} from './rejestrChecklistPaczek'
import './widokChecklistPaczek.css'

type WlasciwosciWidokuChecklistPaczek = {
  dokumentIdZTrasy: string | null
}

type ZapisChecklisty = (dane: DaneChecklistyPaczki, opis?: string) => void

const statusyGotowosci: StatusGotowosciPozycji[] = ['NIEGOTOWE', 'W_TOKU_LUB_PROBLEM', 'CZESCIOWO_GOTOWE', 'GOTOWE']
const trybyPrePost: Array<{ wartosc: TrybPrePostTestow; etykieta: string }> = [
  { wartosc: 'BRAK', etykieta: 'Brak' },
  { wartosc: 'PRE', etykieta: 'Tylko Pre-test' },
  { wartosc: 'POST', etykieta: 'Tylko Post-test' },
  { wartosc: 'PRE_I_POST', etykieta: 'Pre-test + Post-test' },
]

function liczbaDni(dane: DaneChecklistyPaczki) {
  return dane.migawkaZrodla?.terminy.length ?? 0
}

function zaktualizujPozycje(dane: DaneChecklistyPaczki, pozycjaId: string, aktualizacja: (pozycja: PozycjaChecklisty) => PozycjaChecklisty) {
  return { ...dane, pozycje: dane.pozycje.map((pozycja) => pozycja.id === pozycjaId ? aktualizacja(pozycja) : pozycja) }
}

function formatujAdres(dane: DaneOdbiorcyChecklisty) {
  const ulica = [dane.ulica, dane.nrBudynku && ` ${dane.nrBudynku}`, dane.nrLokalu && `/${dane.nrLokalu}`].filter(Boolean).join('')
  return [dane.nazwaFirmy, dane.imieNazwisko, ulica, [dane.kodPocztowy, dane.miasto].filter(Boolean).join(' '), dane.kraj].filter(Boolean).join(', ')
}

function pobierzNazweUzytkownika(id: string | null | undefined) {
  const uzytkownik = pobierzUzytkownika(id)
  return uzytkownik ? pobierzNazweWyswietlanaUzytkownika(uzytkownik) : id || 'brak'
}

function pobierzKolorStatusu(status: StatusGotowosciPozycji) {
  return `checklista-paczki__status--${status.toLowerCase()}`
}

function pobierzUwagiZeSzczegolow(dane: {
  uwagi: { dlaWysylaczy: string; opiekuna: string; wewnetrzne: string }
  dodatkoweWymogi: { uwagiDodatkowe: string }
  dokumentacja: { szczegolyWzorowKlienta: Record<string, { nazwaPliku: string; uwagi: string }> }
}): UwagaZeSzczegolow[] {
  const uwagi: UwagaZeSzczegolow[] = []
  const dodaj = (etykieta: string, tresc: string) => { if (tresc.trim()) uwagi.push({ etykieta, tresc: tresc.trim() }) }
  dodaj('Uwagi dla wysyĹ‚ajÄ…cych', dane.uwagi.dlaWysylaczy)
  dodaj('Uwagi opiekuna', dane.uwagi.opiekuna)
  dodaj('Uwagi wewnÄ™trzne SzczegĂłĹ‚Ăłw', dane.uwagi.wewnetrzne)
  dodaj('Dodatkowe wymogi', dane.dodatkoweWymogi.uwagiDodatkowe)
  const etykiety: Record<string, string> = { materialyDodatkowe: 'MateriaĹ‚y dodatkowe', certyfikaty: 'Certyfikaty', listaObecnosci: 'Lista obecnoĹ›ci', ankiety: 'Ankiety', podreczniki: 'MateriaĹ‚y szkoleniowe', projektTesty: 'Pre/Post-testy' }
  Object.entries(dane.dokumentacja.szczegolyWzorowKlienta).forEach(([klucz, szczegoly]) => {
    if (!etykiety[klucz]) return
    const tresc = [szczegoly.nazwaPliku, szczegoly.uwagi].filter(Boolean).join(' â€” ')
    dodaj(`WzĂłr klienta: ${etykiety[klucz]}`, tresc)
  })
  return uwagi
}

function pobierzWzoryKlienta(dane: {
  dokumentacja: { wzoryKlienta: Record<string, boolean>; szczegolyWzorowKlienta: Record<string, { nazwaPliku: string; uwagi: string }> }
  dodatkoweWymogi: { wzoryKlienta: Record<string, boolean>; szczegolyWzorowKlienta: Record<string, { nazwaPliku: string; uwagi: string }> }
}) {
  const klucze = new Set([...Object.keys(dane.dokumentacja.wzoryKlienta), ...Object.keys(dane.dodatkoweWymogi.wzoryKlienta)])
  return Object.fromEntries([...klucze].map((klucz) => {
    const szczegoly = dane.dodatkoweWymogi.szczegolyWzorowKlienta[klucz] ?? dane.dokumentacja.szczegolyWzorowKlienta[klucz]
    const czyWymagany = dane.dokumentacja.wzoryKlienta[klucz] || dane.dodatkoweWymogi.wzoryKlienta[klucz]
    return [klucz, szczegoly?.nazwaPliku || szczegoly?.uwagi || (czyWymagany ? 'Wymagany wzĂłr klienta' : '')]
  }))
}

function pobierzFinansowanie(dane: { dodatkoweWymogi: { kfs: boolean } }) {
  return dane.dodatkoweWymogi.kfs ? 'KFS' : ''
}

function otworzCheckliste(id: string) {
  window.history.pushState({}, '', `/dokumenty/checklisty-paczek/${encodeURIComponent(id)}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function EdytorPozycji({ dane, pozycja, zablokowana, zapisz }: { dane: DaneChecklistyPaczki; pozycja: PozycjaChecklisty; zablokowana: boolean; zapisz: ZapisChecklisty }) {
  const uczestnicy = dane.migawkaZrodla?.liczbaUczestnikow ?? 0
  const dni = liczbaDni(dane)
  const ilosc = pobierzIloscPozycji(pozycja, uczestnicy, dni)
  const podstawa = obliczIloscPodstawowa(pozycja, uczestnicy, dni)
  const czyTesty = pozycja.trybPrePost !== null
  const zmien = (aktualizacja: (obecna: PozycjaChecklisty) => PozycjaChecklisty, opis = 'Zmieniono pozycjÄ™ checklisty.') => zapisz(zaktualizujPozycje(dane, pozycja.id, aktualizacja), opis)
  const przenies = (przesuniecie: -1 | 1) => zapisz(przeniesPozycjeWObrebieKategorii(dane, pozycja.id, przesuniecie), 'Zmieniono kolejnoĹ›Ä‡ pozycji.')
  const usun = () => zapisz({ ...dane, pozycje: dane.pozycje.filter((obecna) => obecna.id !== pozycja.id) }, 'UsuniÄ™to pozycjÄ™ checklisty.')

  return <article className="checklista-paczki__wiersz">
    <div className="checklista-paczki__kolumna-status">
      <span aria-hidden="true" className={`checklista-paczki__kropka ${pobierzKolorStatusu(pozycja.statusGotowosci)}`} />
      <select aria-label={`Status gotowoĹ›ci: ${pozycja.nazwa}`} disabled={zablokowana} value={pozycja.statusGotowosci} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, statusGotowosci: zdarzenie.target.value as StatusGotowosciPozycji }), 'Zmieniono status gotowoĹ›ci.')}>{statusyGotowosci.map((status) => <option key={status} value={status}>{pobierzEtykieteStatusuGotowosci(status)}</option>)}</select>
    </div>
    <div className="checklista-paczki__kolumna-material">
      <input aria-label="MateriaĹ‚ lub element" disabled={zablokowana} value={pozycja.nazwa} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, nazwa: zdarzenie.target.value }))} />
      <div className="checklista-paczki__flagi">
        <label><input checked={pozycja.czyNieDotyczy} disabled={zablokowana} type="checkbox" onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, czyNieDotyczy: zdarzenie.target.checked }))} /> Nie dotyczy</label>
        <label><input checked={pozycja.czyOpcjonalna} disabled={zablokowana} type="checkbox" onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, czyOpcjonalna: zdarzenie.target.checked }))} /> Opcjonalne</label>
        <label><input checked={pozycja.czyOnline} disabled={zablokowana} type="checkbox" onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, czyOnline: zdarzenie.target.checked }))} /> Online</label>
      </div>
      <label className="checklista-paczki__zmiana-kategorii">Kategoria<select disabled={zablokowana} value={pozycja.kategoriaId} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, kategoriaId: zdarzenie.target.value, kolejnosc: Math.max(-1, ...dane.pozycje.filter((inna) => inna.kategoriaId === zdarzenie.target.value).map((inna) => inna.kolejnosc)) + 1 }), 'Przeniesiono pozycjÄ™ do kategorii.')}>{dane.kategorie.sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc).map((kategoria) => <option key={kategoria.id} value={kategoria.id}>{kategoria.nazwa}</option>)}</select></label>
    </div>
    <div className="checklista-paczki__kolumna-ilosc">
      <strong>{formatujIloscPozycji(pozycja, uczestnicy, dni)}</strong>
      {!pozycja.czyOnline && <small>Podstawa: {czyTesty && pozycja.trybPrePost === 'PRE_I_POST' ? `2x ${uczestnicy}` : podstawa}</small>}
      {czyTesty && <label>Tryb testĂłw<select disabled={zablokowana} value={pozycja.trybPrePost ?? 'BRAK'} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, trybPrePost: zdarzenie.target.value as TrybPrePostTestow, czyWymagana: zdarzenie.target.value !== 'BRAK' }))}>{trybyPrePost.map((tryb) => <option key={tryb.wartosc} value={tryb.wartosc}>{tryb.etykieta}</option>)}</select></label>}
      {czyPozycjaZaleznaOdUczestnikow(pozycja) && pozycja.trybPrePost !== 'BRAK' && <><button disabled={zablokowana} type="button" onClick={() => zmien((obecna) => ({ ...obecna, dodatkoweEgzemplarze: [...obecna.dodatkoweEgzemplarze, { wartosc: 0, opis: '' }] }), 'Dodano dodatkowe egzemplarze.')}>Dodaj dodatkowe egzemplarze</button>{pozycja.dodatkoweEgzemplarze.map((dodatek, indeks) => <div className="checklista-paczki__dodatek" key={`${pozycja.id}-dodatek-${indeks}`}><label>+<input aria-label={`Dodatkowe egzemplarze ${indeks + 1}`} disabled={zablokowana} min="0" type="number" value={dodatek.wartosc || ''} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, dodatkoweEgzemplarze: obecna.dodatkoweEgzemplarze.map((obecny, obecnyIndeks) => obecnyIndeks === indeks ? { ...obecny, wartosc: Math.max(0, Number(zdarzenie.target.value) || 0) } : obecny) }), 'Zmieniono dodatkowe egzemplarze.')} /></label><input aria-label={`Opis dodatkowych egzemplarzy ${indeks + 1}`} disabled={zablokowana} placeholder="np. puste" value={dodatek.opis} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, dodatkoweEgzemplarze: obecna.dodatkoweEgzemplarze.map((obecny, obecnyIndeks) => obecnyIndeks === indeks ? { ...obecny, opis: zdarzenie.target.value } : obecny) }))} /><button aria-label="UsuĹ„ dodatkowe egzemplarze" disabled={zablokowana} type="button" onClick={() => zmien((obecna) => ({ ...obecna, dodatkoweEgzemplarze: obecna.dodatkoweEgzemplarze.filter((_, obecnyIndeks) => obecnyIndeks !== indeks) }))}>UsuĹ„</button></div>)}</>}
      <label>IloĹ›Ä‡ rÄ™czna<input aria-label={`IloĹ›Ä‡ rÄ™czna: ${pozycja.nazwa}`} disabled={zablokowana} min="0" type="number" value={pozycja.nadpisanieReczne ?? ''} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, nadpisanieReczne: zdarzenie.target.value === '' ? null : Math.max(0, Number(zdarzenie.target.value) || 0) }), 'Zmieniono iloĹ›Ä‡ rÄ™cznie.')} /></label>
      {ilosc.czyNadpisanaRecznie && <div className="checklista-paczki__nadpisanie"><span>Zmieniono rÄ™cznie Â· automatycznie: {ilosc.automatyczna} Â· rĂłĹĽnica: {ilosc.koncowa - ilosc.automatyczna > 0 ? '+' : ''}{ilosc.koncowa - ilosc.automatyczna}</span><button disabled={zablokowana} type="button" onClick={() => zmien((obecna) => ({ ...obecna, nadpisanieReczne: null }), 'PrzywrĂłcono wartoĹ›Ä‡ automatycznÄ….')}>PrzywrĂłÄ‡ wartoĹ›Ä‡ automatycznÄ…</button></div>}
    </div>
    <label className="checklista-paczki__kolumna-wzor">WzĂłr klienta<input disabled={zablokowana} placeholder="brak" value={pozycja.wzorKlienta} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, wzorKlienta: zdarzenie.target.value }))} /></label>
    <div className="checklista-paczki__kolumna-uwagi"><label>Uwagi dodatkowe<textarea disabled={zablokowana} value={pozycja.uwagiDrukowane} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, uwagiDrukowane: zdarzenie.target.value }))} /></label><label className="checklista-paczki__notatka-wewnetrzna">Notatka wewnÄ™trzna <small>nie trafi na wydruk</small><textarea disabled={zablokowana} value={pozycja.notatkiWewnetrzne} onChange={(zdarzenie) => zmien((obecna) => ({ ...obecna, notatkiWewnetrzne: zdarzenie.target.value }))} /></label></div>
    <div className="checklista-paczki__akcje-wiersza"><button aria-label="PrzenieĹ› pozycjÄ™ wyĹĽej" disabled={zablokowana} type="button" onClick={() => przenies(-1)}>â†‘</button><button aria-label="PrzenieĹ› pozycjÄ™ niĹĽej" disabled={zablokowana} type="button" onClick={() => przenies(1)}>â†“</button><button aria-label={`UsuĹ„ pozycjÄ™ ${pozycja.nazwa}`} disabled={zablokowana} type="button" onClick={usun}>UsuĹ„</button></div>
  </article>
}

function DrukChecklisty({ dane, nazwaOpiekuna, nazwaWysylacza }: { dane: DaneChecklistyPaczki; nazwaOpiekuna: string; nazwaWysylacza: string }) {
  const migawka = dane.migawkaZrodla
  const uczestnicy = migawka?.liczbaUczestnikow ?? 0
  const dni = liczbaDni(dane)
  const kategorie = [...dane.kategorie].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
  return <section aria-label="PodglÄ…d wydruku Checklisty paczki" className="checklista-paczki__wydruk" id="wydruk-checklisty">
    <header className="checklista-paczki__wydruk-naglowek"><div><p>SZKOLENIE ZAMKNIÄTE â€“ CHECKLISTA</p><h2>{migawka?.tytulSzkolenia || 'Brak wskazanego szkolenia'}</h2></div><strong>{dane.identyfikator}</strong></header>
    <section className="checklista-paczki__wydruk-dane"><p><strong>Liczba osĂłb:</strong> {uczestnicy}</p><p><strong>Klient:</strong> {dane.klient || 'brak'}</p><p><strong>Grupa:</strong> {migawka?.nazwaGrupy || 'brak'}</p><p><strong>Trener / trenerzy:</strong> {migawka?.trenerzy.join(', ') || 'brak'}</p><p><strong>Data i miejsce:</strong> {formatujTerminyZPrzerwami(migawka?.terminy ?? []) || 'brak'} Â· {migawka?.miejsce || 'brak'}</p><p><strong>Opiekun:</strong> {nazwaOpiekuna}</p></section>
    <section className="checklista-paczki__wydruk-logotypy"><strong>Logotypy:</strong>{migawka?.logotypy.length ? <div>{migawka.logotypy.map((logo) => logo.podglad ? <img alt={logo.nazwa} key={logo.nazwa} src={logo.podglad} /> : <span key={logo.nazwa}>{logo.nazwa}</span>)}</div> : <span>brak</span>}<strong>Finansowanie:</strong><span>{migawka?.finansowanie || 'brak'}</span></section>
    {kategorie.map((kategoria) => {
      const pozycje = dane.pozycje.filter((pozycja) => pozycja.kategoriaId === kategoria.id && czyPozycjaJestAktywna(pozycja)).sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
      return <table key={kategoria.id}><thead><tr><th colSpan={5}>{kategoria.nazwa}</th></tr><tr><th>MateriaĹ‚</th><th>IloĹ›Ä‡</th><th>WzĂłr klienta</th><th>Uwagi dodatkowe</th><th>Podpis Opiekuna</th></tr></thead><tbody>{pozycje.map((pozycja) => <tr key={pozycja.id}><td>{pozycja.nazwa}{pozycja.czyOnline ? ' (online)' : ''}</td><td>{formatujIloscPozycji(pozycja, uczestnicy, dni)}</td><td>{pozycja.wzorKlienta || 'brak'}</td><td>{pozycja.uwagiDrukowane}</td><td /></tr>)}{kategoria.nazwa === 'Inne' && Array.from({ length: 2 }, (_, indeks) => <tr key={`pusty-${indeks}`}><td>&nbsp;</td><td /><td /><td /><td /></tr>)}</tbody></table>
    })}
    <section className="checklista-paczki__wydruk-uwagi"><h3>Uwagi ze SzczegĂłĹ‚Ăłw</h3>{migawka?.uwagiZeSzczegolow.length ? migawka.uwagiZeSzczegolow.map((uwaga) => <p key={`${uwaga.etykieta}-${uwaga.tresc}`}><strong>{uwaga.etykieta}:</strong> {uwaga.tresc}</p>) : <p>brak</p>}</section>
    <section className="checklista-paczki__wydruk-wysylka"><h3>WysyĹ‚ka paczki</h3><p><strong>Adres do wysyĹ‚ki paczki:</strong> {formatujAdres(dane.daneOdbiorcy) || 'brak'}</p><p><strong>Odbiorca paczki:</strong> {dane.daneOdbiorcy.imieNazwisko || dane.daneOdbiorcy.nazwaFirmy || 'brak'}</p><p><strong>Waga paczki:</strong> {dane.waga || 'â€”'} Â· <strong>WysokoĹ›Ä‡ paczki:</strong> {dane.wysokosc || 'â€”'} Â· <strong>Data wysĹ‚ania:</strong> {dane.dataWyslania || 'â€”'}</p><p><strong>WysyĹ‚acz / pakujÄ…cy:</strong> {dane.osobaPakujaca || nazwaWysylacza || '_______________________________'}</p><p><strong>Podpis pakujÄ…cego:</strong> _________________________________________________</p></section>
  </section>
}

export default function WidokChecklistPaczek({ dokumentIdZTrasy }: WlasciwosciWidokuChecklistPaczek) {
  const { zalogowanyUzytkownik, aktywniUzytkownicy } = useKontekstUzytkownika()
  const [, ustawOdswiezacz] = useState(0)
  const [wybraneSzczegolyId, ustawWybraneSzczegolyId] = useState('')
  const [wybranaGrupaId, ustawWybranaGrupeId] = useState('')
  const [nazwaNowejKategorii, ustawNazweNowejKategorii] = useState('')
  const [nazwaNowejPozycji, ustawNazweNowejPozycji] = useState('')
  const [kategoriaNowejPozycji, ustawKategorieNowejPozycji] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const [podgladChecklistyId, ustawPodgladChecklistyId] = useState<string | null>(null)
  const dokument = dokumentIdZTrasy ? pobierzChecklistePaczki(dokumentIdZTrasy) : null
  const checklisty = pobierzChecklistyPaczek()
  const szczegoly = pobierzOpublikowaneSzczegolyDoChecklisty()
  const wybraneSzczegoly = szczegoly.find((pozycja) => pozycja.id === wybraneSzczegolyId)
  const aktorId = zalogowanyUzytkownik?.id ?? null

  function odswiez(tekst: string) { ustawKomunikat(tekst); ustawOdswiezacz((obecny) => obecny + 1) }
  function zapisz(dane: DaneChecklistyPaczki, opis?: string) { if (dokument && zapiszChecklistePaczki(dokument.id, dane, aktorId, opis)) odswiez('Zapisano checklistÄ™.') }

  function duplikujCheckliste(id: string) {
    const wynik = duplikujIstniejacaChecklistePaczki(id, aktorId)
    if (wynik) otworzCheckliste(wynik.id)
  }

  function usunCheckliste(id: string) {
    if (window.confirm('Usunac checkliste paczki?') && usunChecklistePaczki(id)) odswiez('Usunieto checkliste.')
  }

  function utworzZeSzczegolow() {
    if (!wybraneSzczegoly || !wybranaGrupaId) return
    const daneZrodlowe = wybraneSzczegoly.dane
    const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZOpublikowanychSzczegolow(wybraneSzczegoly))
    const wynik = utworzChecklistePaczkiZeZrodla(kontekst, wybranaGrupaId, {
      opiekunId: wybraneSzczegoly.opiekunId,
      finansowanie: pobierzFinansowanie(daneZrodlowe),
      logotypy: daneZrodlowe.logotypy.nazwaPliku ? [{ nazwa: daneZrodlowe.logotypy.nazwaPliku, podglad: daneZrodlowe.logotypy.podglad }] : [],
      uwagiZeSzczegolow: pobierzUwagiZeSzczegolow(daneZrodlowe),
      wzoryKlienta: pobierzWzoryKlienta(daneZrodlowe),
      odbiorca: { ...daneZrodlowe.odbiorcaPaczki, zrodloPropozycji: 'SzczegĂłĹ‚y organizacyjne' },
    }, aktorId)
    if (!wynik) { ustawKomunikat('Nie odnaleziono wybranej grupy.'); return }
    otworzCheckliste(wynik.id)
  }

  async function dodajPlik(zdarzenie: ChangeEvent<HTMLInputElement>, typ: TypZalacznikaChecklisty) {
    const plik = zdarzenie.target.files?.[0]
    if (!plik || !dokument) return
    const danePliku = await new Promise<string>((resolve, reject) => { const czytnik = new FileReader(); czytnik.onload = () => resolve(String(czytnik.result)); czytnik.onerror = () => reject(czytnik.error); czytnik.readAsDataURL(plik) })
    if (dodajZalacznikChecklisty(dokument.id, { nazwa: plik.name, typ, dane: danePliku, typMime: plik.type || 'application/octet-stream', autorId: aktorId, wersjaWydruku: dokument.daneDokumentu.wersjeWydruku.at(-1)?.wersja ?? null }, aktorId)) odswiez('Dodano zaĹ‚Ä…cznik.')
  }

  if (!dokument) {
    const liczbaDlaWybranejGrupy = wybraneSzczegoly && wybranaGrupaId ? checklisty.filter((pozycja) => pozycja.daneDokumentu.szczegolyOrganizacyjneId === wybraneSzczegoly.id && pozycja.daneDokumentu.grupaId === wybranaGrupaId).length : 0
    return <section className="widok checklista-paczki checklista-paczki--start"><header><h1>Checklisty paczek</h1><p>Przygotuj roboczÄ… ChecklistÄ™ dla konkretnej grupy szkoleniowej.</p>{komunikat && <p aria-live="polite" className="checklista-paczki__komunikat">{komunikat}</p>}</header><section className="checklista-paczki__karta"><h2>Nowa checklista paczki</h2><ol className="checklista-paczki__kroki"><li><label><strong>Krok 1. SzczegĂłĹ‚y organizacyjne</strong><select value={wybraneSzczegolyId} onChange={(zdarzenie) => { ustawWybraneSzczegolyId(zdarzenie.target.value); ustawWybranaGrupeId('') }}><option value="">Wybierz SzczegĂłĹ‚y organizacyjne</option>{szczegoly.map((pozycja) => <option key={pozycja.id} value={pozycja.id}>{pozycja.nazwa}</option>)}</select></label></li><li><label><strong>Krok 2. Grupa szkoleniowa</strong><select disabled={!wybraneSzczegoly} value={wybranaGrupaId} onChange={(zdarzenie) => ustawWybranaGrupeId(zdarzenie.target.value)}><option value="">Wybierz grupÄ™</option>{wybraneSzczegoly?.grupy.map((grupa) => <option key={grupa.id} value={grupa.id}>{grupa.nazwa} Â· {grupa.liczbaUczestnikow} uczestnikĂłw</option>)}</select></label></li><li><strong>Krok 3. UtwĂłrz ChecklistÄ™</strong>{liczbaDlaWybranejGrupy > 0 && <p>Dla tej grupy istnieje juĹĽ {liczbaDlaWybranejGrupy} {liczbaDlaWybranejGrupy === 1 ? 'Checklista paczki' : 'Checklisty paczek'}.</p>}<button disabled={!wybraneSzczegolyId || !wybranaGrupaId} type="button" onClick={utworzZeSzczegolow}>{liczbaDlaWybranejGrupy ? 'UtwĂłrz kolejnÄ… ChecklistÄ™' : 'UtwĂłrz ChecklistÄ™ paczki'}</button></li></ol></section><section className="checklista-paczki__karta"><h2>IstniejÄ…ce checklisty</h2>{!checklisty.length && <p>Brak checklist.</p>}<div className="checklista-paczki__lista">{checklisty.map((pozycja) => { const migawka = pozycja.daneDokumentu.migawkaZrodla; return <article key={pozycja.id}><div><strong>{pozycja.daneDokumentu.identyfikator}</strong><span>{migawka?.tytulSzkolenia || 'Brak szkolenia'} Â· {migawka?.nazwaGrupy || 'Brak grupy'}</span><span>{formatujTerminyZPrzerwami(migawka?.terminy ?? []) || 'brak terminu'} Â· {pozycja.daneDokumentu.statusChecklisty}</span></div><div><span>Skan: {pozycja.daneDokumentu.zalaczniki.some((zalacznik) => zalacznik.typ === 'SKAN_PODPISANEJ_CHECKLISTY') ? 'doĹ‚Ä…czony' : 'brak'}</span>{pozycja.daneDokumentu.pilna && <strong className="checklista-paczki__pilna">Pilna</strong>}<AkcjeRekordu podglad={() => ustawPodgladChecklistyId(pozycja.id)} edytuj={() => otworzCheckliste(pozycja.id)} duplikuj={() => duplikujCheckliste(pozycja.id)} usun={() => usunCheckliste(pozycja.id)} /></div>{podgladChecklistyId === pozycja.id && <p className="checklista-paczki__opis-pomocniczy">Podglad: {migawka?.tytulSzkolenia || 'Brak szkolenia'} · {migawka?.nazwaGrupy || 'Brak grupy'} · {pozycja.daneDokumentu.statusChecklisty}</p>}</article> })}</div></section></section>
  }

  const dane = dokument.daneDokumentu
  const migawka = dane.migawkaZrodla
  const uczestnicy = migawka?.liczbaUczestnikow ?? 0
  const finalizacja = czyMoznaFinalizowacCheckliste(dane)
  const czyZablokowana = dane.statusChecklisty === 'ZARCHIWIZOWANA'
  const nazwaOpiekuna = pobierzNazweUzytkownika(dane.opiekunId)
  const nazwaWysylacza = pobierzNazweUzytkownika(dane.wysylaczId)
  const kategorie = [...dane.kategorie].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)

  function dodajKategorie() {
    const kategoria = utworzNowaKategorieChecklisty(dane.kategorie, nazwaNowejKategorii)
    if (!kategoria) { ustawKomunikat('Podaj niepowtarzalnÄ… nazwÄ™ kategorii.'); return }
    zapisz({ ...dane, kategorie: [...dane.kategorie, kategoria] }, 'Dodano wĹ‚asnÄ… kategoriÄ™.')
    ustawNazweNowejKategorii('')
  }

  function dodajPozycje() {
    const pozycja = utworzNowaPozycjeChecklisty(kategoriaNowejPozycji || dane.kategorie[0]?.id || '', nazwaNowejPozycji, dane.pozycje)
    if (!pozycja) { ustawKomunikat('Wybierz kategoriÄ™ i podaj nazwÄ™ pozycji.'); return }
    zapisz({ ...dane, pozycje: [...dane.pozycje, pozycja] }, 'Dodano wĹ‚asnÄ… pozycjÄ™.')
    ustawNazweNowejPozycji('')
  }

  return <section className="widok checklista-paczki">
    <header className="checklista-paczki__naglowek"><div><h1>Checklista paczki</h1><p>{dane.identyfikator} Â· <strong>{dane.statusChecklisty}</strong></p></div><div className="checklista-paczki__akcje-glowne"><button disabled={czyZablokowana} type="button" onClick={() => zapisz({ ...dane, statusChecklisty: 'KOPIA_ROBOCZA' }, 'Zapisano kopiÄ™ roboczÄ….')}>Zapisz kopiÄ™ roboczÄ…</button><button type="button" onClick={() => document.getElementById('wydruk-checklisty')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>PodglÄ…d wydruku</button><button disabled={czyZablokowana} type="button" onClick={() => { if (zarejestrujWydrukChecklisty(dokument.id, aktorId)) { odswiez('Zapisano wersjÄ™ wydruku.'); window.print() } }}>Drukuj</button></div>{komunikat && <p aria-live="polite" className="checklista-paczki__komunikat">{komunikat}</p>}</header>
    {dane.czyDaneZrodloweNowsze && <p role="alert" className="checklista-paczki__ostrzezenie">Dane ĹşrĂłdĹ‚owe zmieniĹ‚y siÄ™ po ostatnim wydruku.</p>}
    <div className="checklista-paczki__uklad-roboczy"><div className="checklista-paczki__formularz">
      <section className="checklista-paczki__karta"><h2>Dane szkolenia</h2><div className="checklista-paczki__dane-szkolenia"><p><strong>Nazwa szkolenia:</strong> {migawka?.tytulSzkolenia || 'brak'}</p><p><strong>Grupa:</strong> {migawka?.nazwaGrupy || 'brak'}</p><p><strong>Klient:</strong> <input disabled={czyZablokowana} value={dane.klient} onChange={(zdarzenie) => zapisz({ ...dane, klient: zdarzenie.target.value, czyKlientNadpisany: zdarzenie.target.value !== (migawka?.klient ?? '') })} /></p>{dane.czyKlientNadpisany && <small>Zmieniono rÄ™cznie</small>}<p><strong>Liczba uczestnikĂłw:</strong> {uczestnicy}</p><p><strong>Trener / trenerzy:</strong> {migawka?.trenerzy.join(', ') || 'brak'}</p><p><strong>Data / terminy:</strong> {formatujTerminyZPrzerwami(migawka?.terminy ?? []) || 'brak'}</p><p><strong>Miejsce:</strong> {migawka?.miejsce || 'brak'}</p><p><strong>Opiekun:</strong> {nazwaOpiekuna}</p><label><input checked={dane.pilna} disabled={czyZablokowana} type="checkbox" onChange={(zdarzenie) => zapisz({ ...dane, pilna: zdarzenie.target.checked })} /> Pilna</label><label>WysyĹ‚acz<select disabled={czyZablokowana} value={dane.wysylaczId ?? ''} onChange={(zdarzenie) => zapisz({ ...dane, wysylaczId: zdarzenie.target.value || null })}><option value="">Nieprzypisany</option>{aktywniUzytkownicy.filter((uzytkownik) => uzytkownik.odznaki.includes('WYSYLACZ')).map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</option>)}</select></label></div></section>
      <section className="checklista-paczki__karta"><h2>Logotypy i finansowanie</h2><div className="checklista-paczki__logotypy"><div><h3>Logotypy</h3>{migawka?.logotypy.length ? <div className="checklista-paczki__miniatury-logotypow">{migawka.logotypy.map((logo) => logo.podglad ? <img alt={logo.nazwa} key={logo.nazwa} src={logo.podglad} /> : <span key={logo.nazwa}>{logo.nazwa}</span>)}</div> : <p>brak</p>}</div><div><h3>Finansowanie</h3><p>{migawka?.finansowanie || 'brak'}</p>{dane.wariantyMaterialow.length ? dane.wariantyMaterialow.map((wariant) => <p key={wariant.id}>{wariant.nazwa}: {wariant.liczbaUczestnikow} osĂłb</p>) : <p className="checklista-paczki__opis-pomocniczy">Brak danych ĹşrĂłdĹ‚owych o wariantach wydrukĂłw.</p>}</div></div></section>
      <section className="checklista-paczki__karta"><div className="checklista-paczki__naglowek-sekcji"><div><h2>Pozycje paczki</h2><p>Zmiany sÄ… widoczne od razu w podglÄ…dzie wydruku.</p></div><button disabled={czyZablokowana} type="button" onClick={() => zapisz(zastosujWariantMaterialowOnline(dane), 'Zastosowano wariant MateriaĹ‚y szkoleniowe online.')}>Zastosuj wariant â€žMateriaĹ‚y szkoleniowe onlineâ€ť</button></div><div className="checklista-paczki__dodawanie"><label>Nowa kategoria<input disabled={czyZablokowana} value={nazwaNowejKategorii} onChange={(zdarzenie) => ustawNazweNowejKategorii(zdarzenie.target.value)} /></label><button disabled={czyZablokowana} type="button" onClick={dodajKategorie}>Dodaj kategoriÄ™</button><label>Nowa pozycja<input disabled={czyZablokowana} value={nazwaNowejPozycji} onChange={(zdarzenie) => ustawNazweNowejPozycji(zdarzenie.target.value)} /></label><label>Kategoria<select disabled={czyZablokowana} value={kategoriaNowejPozycji || dane.kategorie[0]?.id || ''} onChange={(zdarzenie) => ustawKategorieNowejPozycji(zdarzenie.target.value)}>{kategorie.map((kategoria) => <option key={kategoria.id} value={kategoria.id}>{kategoria.nazwa}</option>)}</select></label><button disabled={czyZablokowana} type="button" onClick={dodajPozycje}>Dodaj pozycjÄ™</button></div><div className="checklista-paczki__naglowki-tabeli"><span>Status</span><span>MateriaĹ‚ / element</span><span>IloĹ›Ä‡</span><span>WzĂłr klienta</span><span>Uwagi dodatkowe</span></div>{kategorie.map((kategoria) => <section className="checklista-paczki__kategoria" key={kategoria.id}><h3>{kategoria.nazwa}</h3>{dane.pozycje.filter((pozycja) => pozycja.kategoriaId === kategoria.id).sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc).map((pozycja) => <EdytorPozycji dane={dane} key={pozycja.id} pozycja={pozycja} zablokowana={czyZablokowana} zapisz={zapisz} />)}{!dane.pozycje.some((pozycja) => pozycja.kategoriaId === kategoria.id) && <p className="checklista-paczki__pusta-kategoria">Brak pozycji w tej kategorii.</p>}</section>)}</section>
      <section className="checklista-paczki__karta"><h2>Uwagi ze SzczegĂłĹ‚Ăłw</h2>{migawka?.uwagiZeSzczegolow.length ? <div className="checklista-paczki__uwagi-zrodlowe">{migawka.uwagiZeSzczegolow.map((uwaga) => <p key={`${uwaga.etykieta}-${uwaga.tresc}`}><strong>{uwaga.etykieta}:</strong> {uwaga.tresc}</p>)}</div> : <p>Brak dostÄ™pnych uwag ĹşrĂłdĹ‚owych.</p>}</section>
      <section className="checklista-paczki__karta"><h2>WysyĹ‚ka paczki</h2><div className="checklista-paczki__siatka-wysylki"><label>Odbiorca paczki<input disabled={czyZablokowana} value={dane.daneOdbiorcy.imieNazwisko} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, imieNazwisko: zdarzenie.target.value } })} /></label><label>Nazwa firmy<input disabled={czyZablokowana} value={dane.daneOdbiorcy.nazwaFirmy} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, nazwaFirmy: zdarzenie.target.value } })} /></label><fieldset><legend>Adres do wysyĹ‚ki paczki</legend><label>Ulica<input disabled={czyZablokowana} value={dane.daneOdbiorcy.ulica} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, ulica: zdarzenie.target.value } })} /></label><label>Nr budynku<input disabled={czyZablokowana} value={dane.daneOdbiorcy.nrBudynku} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, nrBudynku: zdarzenie.target.value } })} /></label><label>Nr lokalu<input disabled={czyZablokowana} value={dane.daneOdbiorcy.nrLokalu} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, nrLokalu: zdarzenie.target.value } })} /></label><label>Kod pocztowy<input disabled={czyZablokowana} value={dane.daneOdbiorcy.kodPocztowy} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, kodPocztowy: zdarzenie.target.value } })} /></label><label>Miasto<input disabled={czyZablokowana} value={dane.daneOdbiorcy.miasto} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, miasto: zdarzenie.target.value } })} /></label><label>Kraj<input disabled={czyZablokowana} value={dane.daneOdbiorcy.kraj} onChange={(zdarzenie) => zapisz({ ...dane, daneOdbiorcy: { ...dane.daneOdbiorcy, kraj: zdarzenie.target.value } })} /></label></fieldset><label>Waga paczki<input disabled={czyZablokowana} placeholder="opcjonalnie" value={dane.waga} onChange={(zdarzenie) => zapisz({ ...dane, waga: zdarzenie.target.value }, 'Zmieniono wagÄ™ paczki.')} /></label><label>WysokoĹ›Ä‡ paczki<input disabled={czyZablokowana} placeholder="opcjonalnie" value={dane.wysokosc} onChange={(zdarzenie) => zapisz({ ...dane, wysokosc: zdarzenie.target.value }, 'Zmieniono wysokoĹ›Ä‡ paczki.')} /></label><label>Data wysĹ‚ania<input disabled={czyZablokowana} type="date" value={dane.dataWyslania} onChange={(zdarzenie) => zapisz({ ...dane, dataWyslania: zdarzenie.target.value }, 'Zmieniono datÄ™ wysĹ‚ania.')} /></label><label>Osoba pakujÄ…ca / WysyĹ‚acz<input disabled={czyZablokowana} value={dane.osobaPakujaca} onChange={(zdarzenie) => zapisz({ ...dane, osobaPakujaca: zdarzenie.target.value })} /></label><label>Skan podpisanej checklisty<input accept=".pdf,.jpg,.jpeg,.png" disabled={czyZablokowana} type="file" onChange={(zdarzenie) => void dodajPlik(zdarzenie, 'SKAN_PODPISANEJ_CHECKLISTY')} /></label></div>{dane.zalaczniki.map((zalacznik) => <p className="checklista-paczki__zalacznik" key={zalacznik.id}>{zalacznik.nazwa} â€” {zalacznik.typ}</p>)}</section>
      <section className="checklista-paczki__karta checklista-paczki__finalizacja"><h2>GotowoĹ›Ä‡</h2><p>{finalizacja.czyMozna ? 'Wymagane pozycje i dane wysyĹ‚kowe sÄ… kompletne.' : `Braki: ${finalizacja.brakujacePozycje.length} pozycji${finalizacja.czyBrakujeDanychWysylkowych ? ', dane wysyĹ‚kowe' : ''}.`}</p><button disabled={czyZablokowana || !finalizacja.czyMozna} type="button" onClick={() => { if (ustawStatusChecklisty(dokument.id, 'GOTOWA_DO_WYDRUKU', aktorId, 'Oznaczono checklistÄ™ jako gotowÄ… do wydruku.')) odswiez('Checklista jest gotowa do wydruku.') }}>Gotowa do wydruku</button><button disabled={czyZablokowana} type="button" onClick={() => { if (ustawStatusChecklisty(dokument.id, 'ZARCHIWIZOWANA', aktorId, 'Zarchiwizowano checklistÄ™.')) odswiez('Zarchiwizowano checklistÄ™.') }}>Archiwizuj</button>{czyZablokowana && (zalogowanyUzytkownik?.rola === 'ADMINISTRATOR' || zalogowanyUzytkownik?.rola === 'ARCHITEKT') && <button type="button" onClick={() => { if (otworzPonownieCheckliste(dokument.id, zalogowanyUzytkownik.rola, aktorId)) odswiez('Ponownie otwarto checklistÄ™.') }}>OtwĂłrz ponownie</button>}</section>
    </div><aside className="checklista-paczki__panel-podgladu"><h2>PodglÄ…d wydruku</h2><DrukChecklisty dane={dane} nazwaOpiekuna={nazwaOpiekuna} nazwaWysylacza={nazwaWysylacza} /></aside></div>
  </section>
}
