import { useMemo, useState } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import { pobierzNazweWyswietlanaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { przygotujZrodloZOpublikowanychSzczegolow, zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { pobierzOpublikowaneSzczegoly } from '../../../zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych'
import {
  czyMoznaFinalizowacCheckliste,
  formatujIloscPozycji,
  formatujTerminyZPrzerwami,
  pobierzEtykieteStatusuGotowosci,
  type DaneChecklistyPaczki,
  type PozycjaChecklisty,
  type StatusGotowosciPozycji,
  type TypZalacznikaChecklisty,
} from './modelChecklistyPaczki'
import {
  dodajZalacznikChecklisty,
  otworzPonownieCheckliste,
  pobierzChecklistePaczki,
  pobierzChecklistyPaczek,
  ustawStatusChecklisty,
  utworzChecklistePaczkiZeZrodla,
  zarejestrujWydrukChecklisty,
  zapiszChecklistePaczki,
} from './rejestrChecklistPaczek'
import './widokChecklistPaczek.css'

type WlasciwosciWidokuChecklistPaczek = {
  dokumentIdZTrasy: string | null
}

const statusyGotowosci: StatusGotowosciPozycji[] = ['NIEGOTOWE', 'W_TOKU_LUB_PROBLEM', 'CZESCIOWO_GOTOWE', 'GOTOWE']

function liczbaDni(dane: DaneChecklistyPaczki) {
  return dane.migawkaZrodla?.terminy.length ?? 0
}

function zaktualizujPozycje(dane: DaneChecklistyPaczki, pozycjaId: string, aktualizacja: (pozycja: PozycjaChecklisty) => PozycjaChecklisty) {
  return { ...dane, pozycje: dane.pozycje.map((pozycja) => pozycja.id === pozycjaId ? aktualizacja(pozycja) : pozycja) }
}

function DrukChecklisty({ dane }: { dane: DaneChecklistyPaczki }) {
  const migawka = dane.migawkaZrodla
  const grupy = dane.kategorie.map((kategoria) => ({ kategoria, pozycje: dane.pozycje.filter((pozycja) => pozycja.kategoriaId === kategoria.id && !pozycja.czyNieDotyczy) }))
  const uczestnicy = migawka?.liczbaUczestnikow ?? 0
  return (
    <section className="checklista-paczki__wydruk" id="wydruk-checklisty">
      <header><h1>Checklista paczki</h1><p>{dane.identyfikator}</p><p>{migawka?.tytulSzkolenia || 'Brak wskazanego szkolenia'} · {formatujTerminyZPrzerwami(migawka?.terminy ?? []) || 'brak terminu'}</p><p>Klient: {dane.klient || 'brak'} · Opiekun: {dane.opiekunId || 'brak'}</p></header>
      <p>Logotypy: {migawka?.logotypy.length ? migawka.logotypy.map((logo) => logo.nazwa).join(', ') : 'brak'} · Finansowanie: {migawka?.finansowanie || 'brak'}</p>
      {grupy.map(({ kategoria, pozycje }) => (
        <section key={kategoria.id}><h2>{kategoria.nazwa}</h2><table><thead><tr><th>Pozycja</th><th>Ilość</th><th>Uwagi</th><th>Podpis Opiekuna</th></tr></thead><tbody>
          {pozycje.map((pozycja) => <tr key={pozycja.id}><td>{pozycja.nazwa}{pozycja.czyOnline ? ' (online)' : ''}</td><td>{formatujIloscPozycji(pozycja, uczestnicy, liczbaDni(dane))}</td><td>{pozycja.uwagiDrukowane}</td><td /></tr>)}
          {kategoria.nazwa === 'Inne' && Array.from({ length: 2 }, (_, indeks) => <tr key={`pusty-${indeks}`}><td>&nbsp;</td><td /><td /><td /></tr>)}
        </tbody></table></section>
      ))}
      <footer><p>Wysyłacz / pakujący: ________________________________</p><p>Data wysłania: ____________________</p></footer>
    </section>
  )
}

export default function WidokChecklistPaczek({ dokumentIdZTrasy }: WlasciwosciWidokuChecklistPaczek) {
  const { zalogowanyUzytkownik, aktywniUzytkownicy } = useKontekstUzytkownika()
  const [, ustawOdswiezacz] = useState(0)
  const [wybraneSzczegolyId, ustawWybraneSzczegolyId] = useState('')
  const [wybranaGrupaId, ustawWybranaGrupeId] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const dokument = dokumentIdZTrasy ? pobierzChecklistePaczki(dokumentIdZTrasy) : null
  const checklisty = pobierzChecklistyPaczek()
  const szczegoly = useMemo(() => pobierzOpublikowaneSzczegoly(), [])
  const wybraneSzczegoly = szczegoly.find((pozycja) => pozycja.id === wybraneSzczegolyId)
  const aktorId = zalogowanyUzytkownik?.id ?? null

  function odswiez(tekst: string) { ustawKomunikat(tekst); ustawOdswiezacz((obecny) => obecny + 1) }
  function zapisz(dane: DaneChecklistyPaczki, opis?: string) { if (dokument && zapiszChecklistePaczki(dokument.id, dane, aktorId, opis)) odswiez('Zapisano checklistę.') }

  function utworzZeSzczegolow() {
    if (!wybraneSzczegoly || !wybranaGrupaId) return
    const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZOpublikowanychSzczegolow(wybraneSzczegoly))
    const odbiorca = wybraneSzczegoly.dane.odbiorcaPaczki
    const wynik = utworzChecklistePaczkiZeZrodla(kontekst, wybranaGrupaId, {
      opiekunId: wybraneSzczegoly.opiekunId,
      finansowanie: wybraneSzczegoly.dane.dodatkoweWymogi.uwagiDodatkowe,
      odbiorca: { ...odbiorca, zrodloPropozycji: null },
    }, aktorId)
    if (!wynik) { ustawKomunikat('Nie odnaleziono wybranej grupy.'); return }
    window.history.pushState({}, '', `/dokumenty/checklisty-paczek/${encodeURIComponent(wynik.id)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  async function dodajPlik(zdarzenie: React.ChangeEvent<HTMLInputElement>, typ: TypZalacznikaChecklisty) {
    const plik = zdarzenie.target.files?.[0]
    if (!plik || !dokument) return
    const dane = await new Promise<string>((resolve, reject) => { const czytnik = new FileReader(); czytnik.onload = () => resolve(String(czytnik.result)); czytnik.onerror = () => reject(czytnik.error); czytnik.readAsDataURL(plik) })
    if (dodajZalacznikChecklisty(dokument.id, { nazwa: plik.name, typ, dane, typMime: plik.type || 'application/octet-stream', autorId: aktorId, wersjaWydruku: dokument.daneDokumentu.wersjeWydruku.at(-1)?.wersja ?? null }, aktorId)) odswiez('Dodano załącznik.')
  }

  if (!dokument) {
    return <section className="widok checklista-paczki"><h1>Checklisty paczek</h1><p>{komunikat}</p><section><h2>Nowa checklista paczki</h2><label>Szczegóły organizacyjne<select value={wybraneSzczegolyId} onChange={(zdarzenie) => { ustawWybraneSzczegolyId(zdarzenie.target.value); ustawWybranaGrupeId('') }}><option value="">Wybierz szczegóły</option>{szczegoly.map((pozycja) => <option key={pozycja.id} value={pozycja.id}>{pozycja.nazwa}</option>)}</select></label>{wybraneSzczegoly && <label>Grupa<select value={wybranaGrupaId} onChange={(zdarzenie) => ustawWybranaGrupeId(zdarzenie.target.value)}><option value="">Wybierz grupę</option>{wybraneSzczegoly.grupy.map((grupa) => <option key={grupa.id} value={grupa.id}>{grupa.nazwa}</option>)}</select></label>}<button disabled={!wybranaGrupaId} type="button" onClick={utworzZeSzczegolow}>Utwórz Checklistę paczki</button></section><section><h2>Istniejące checklisty</h2>{!checklisty.length && <p>Brak checklist.</p>}{checklisty.map((pozycja) => <article key={pozycja.id}><strong>{pozycja.daneDokumentu.identyfikator}</strong><span> {pozycja.tytul}</span><span> · {pozycja.daneDokumentu.statusChecklisty}</span><span> · Pilna: {pozycja.daneDokumentu.pilna ? 'tak' : 'nie'}</span><span> · Skan: {pozycja.daneDokumentu.zalaczniki.some((zalacznik) => zalacznik.typ === 'SKAN_PODPISANEJ_CHECKLISTY') ? 'dołączony' : 'brak'}</span><button type="button" onClick={() => { window.history.pushState({}, '', `/dokumenty/checklisty-paczek/${encodeURIComponent(pozycja.id)}`); window.dispatchEvent(new PopStateEvent('popstate')) }}>Otwórz</button></article>)}</section></section>
  }

  const dane = dokument.daneDokumentu
  const migawka = dane.migawkaZrodla
  const uczestnicy = migawka?.liczbaUczestnikow ?? 0
  const finalizacja = czyMoznaFinalizowacCheckliste(dane)
  const czyZablokowana = dane.statusChecklisty === 'ZARCHIWIZOWANA'
  return <section className="widok checklista-paczki"><header><h1>Checklista paczki</h1><p>{dane.identyfikator} · {dane.statusChecklisty}</p>{komunikat && <p aria-live="polite">{komunikat}</p>}</header>{dane.czyDaneZrodloweNowsze && <p role="alert">Dane źródłowe zmieniły się po ostatnim wydruku.</p>}<section><h2>Dane grupy</h2><p>{migawka?.tytulSzkolenia || 'Brak powiązania ze źródłową grupą'} · {formatujTerminyZPrzerwami(migawka?.terminy ?? []) || 'brak terminu'} · {uczestnicy} uczestników</p><p>Trenerzy: {migawka?.trenerzy.join(', ') || 'brak'} · Miejsce: {migawka?.miejsce || 'brak'}</p><label>Klient<input disabled={czyZablokowana} value={dane.klient} onChange={(zdarzenie) => zapisz({ ...dane, klient: zdarzenie.target.value, czyKlientNadpisany: zdarzenie.target.value !== (migawka?.klient ?? '') })} /></label>{dane.czyKlientNadpisany && <span>Zmieniono ręcznie</span>}<label><input checked={dane.pilna} disabled={czyZablokowana} type="checkbox" onChange={(zdarzenie) => zapisz({ ...dane, pilna: zdarzenie.target.checked })} /> Pilna</label><label>Wysyłacz<select disabled={czyZablokowana} value={dane.wysylaczId ?? ''} onChange={(zdarzenie) => zapisz({ ...dane, wysylaczId: zdarzenie.target.value || null })}><option value="">Nieprzypisany</option>{aktywniUzytkownicy.filter((uzytkownik) => uzytkownik.odznaki.includes('WYSYLACZ')).map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</option>)}</select></label></section><section><h2>Pozycje</h2>{dane.kategorie.map((kategoria) => <section key={kategoria.id}><h3>{kategoria.nazwa}</h3>{dane.pozycje.filter((pozycja) => pozycja.kategoriaId === kategoria.id).sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc).map((pozycja) => <article key={pozycja.id}><strong>{pozycja.nazwa}</strong> <span>{pozycja.czyOnline ? 'online' : formatujIloscPozycji(pozycja, uczestnicy, liczbaDni(dane))}</span><label>Status<select aria-label={`Status gotowości: ${pozycja.nazwa}`} disabled={czyZablokowana} value={pozycja.statusGotowosci} onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, statusGotowosci: zdarzenie.target.value as StatusGotowosciPozycji })), 'Zmieniono status gotowości.')}>{statusyGotowosci.map((status) => <option key={status} value={status}>{pobierzEtykieteStatusuGotowosci(status)}</option>)}</select></label><label><input checked={pozycja.czyNieDotyczy} disabled={czyZablokowana} type="checkbox" onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, czyNieDotyczy: zdarzenie.target.checked }))) } /> Nie dotyczy</label><label><input checked={pozycja.czyOpcjonalna} disabled={czyZablokowana} type="checkbox" onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, czyOpcjonalna: zdarzenie.target.checked }))) } /> Opcjonalna</label><label>Uwagi drukowane<input disabled={czyZablokowana} value={pozycja.uwagiDrukowane} onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, uwagiDrukowane: zdarzenie.target.value }))) } /></label><label>Notatki wewnętrzne<input disabled={czyZablokowana} value={pozycja.notatkiWewnetrzne} onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, notatkiWewnetrzne: zdarzenie.target.value }))) } /></label><label>Ilość ręczna<input disabled={czyZablokowana} min="0" type="number" value={pozycja.nadpisanieReczne ?? ''} onChange={(zdarzenie) => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, nadpisanieReczne: zdarzenie.target.value === '' ? null : Number(zdarzenie.target.value) })), 'Zmieniono ilość ręcznie.')}/></label>{pozycja.nadpisanieReczne !== null && <button type="button" onClick={() => zapisz(zaktualizujPozycje(dane, pozycja.id, (obecna) => ({ ...obecna, nadpisanieReczne: null })), 'Przywrócono ilość automatyczną.')}>Przywróć wartość automatyczną</button>}</article>)}</section>)}</section><section><h2>Wysyłka i załączniki</h2><label>Waga<input disabled={czyZablokowana} value={dane.waga} onChange={(zdarzenie) => zapisz({ ...dane, waga: zdarzenie.target.value }, 'Zmieniono wagę paczki.')} /></label><label>Wysokość<input disabled={czyZablokowana} value={dane.wysokosc} onChange={(zdarzenie) => zapisz({ ...dane, wysokosc: zdarzenie.target.value }, 'Zmieniono wysokość paczki.')} /></label><label>Skan podpisanej checklisty<input disabled={czyZablokowana} accept=".pdf,.jpg,.jpeg,.png" type="file" onChange={(zdarzenie) => void dodajPlik(zdarzenie, 'SKAN_PODPISANEJ_CHECKLISTY')} /></label>{dane.zalaczniki.map((zalacznik) => <p key={zalacznik.id}>{zalacznik.nazwa} — {zalacznik.typ}</p>)}</section><section><h2>Finalizacja</h2><p>{finalizacja.czyMozna ? 'Wymagane pozycje i dane wysyłkowe są kompletne.' : `Braki: ${finalizacja.brakujacePozycje.length} pozycji${finalizacja.czyBrakujeDanychWysylkowych ? ', dane wysyłkowe' : ''}.`}</p><button disabled={czyZablokowana || !finalizacja.czyMozna} type="button" onClick={() => { if (ustawStatusChecklisty(dokument.id, 'GOTOWA_DO_WYDRUKU', aktorId, 'Oznaczono checklistę jako gotową do wydruku.')) odswiez('Checklista jest gotowa do wydruku.') }}>Gotowa do wydruku</button><button disabled={czyZablokowana} type="button" onClick={() => { if (zarejestrujWydrukChecklisty(dokument.id, aktorId)) { odswiez('Zapisano wersję wydruku.'); window.print() } }}>Drukuj / PDF</button><button disabled={czyZablokowana} type="button" onClick={() => { if (ustawStatusChecklisty(dokument.id, 'ZARCHIWIZOWANA', aktorId, 'Zarchiwizowano checklistę.')) odswiez('Zarchiwizowano checklistę.') }}>Archiwizuj</button>{czyZablokowana && zalogowanyUzytkownik?.rola === 'ADMINISTRATOR' && <button type="button" onClick={() => { if (otworzPonownieCheckliste(dokument.id, 'ADMINISTRATOR', aktorId)) odswiez('Administrator ponownie otworzył checklistę.') }}>Otwórz ponownie</button>}</section><DrukChecklisty dane={dane} /></section>
}
