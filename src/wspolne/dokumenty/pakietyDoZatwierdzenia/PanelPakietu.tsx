import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dokument } from '../modelDokumentu'
import type { WersjaRoboczaGeneratora } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import { czyDokumentJestGrupowy, etykietyDokumentowZeSzczegolow, pobierzStanDokumentuZeSzczegolow, rodzajeWszystkichDokumentow, utworzDokumentZeSzczegolow, type RodzajDokumentuZeSzczegolow } from '../../integracje/szczegolyDoDokumentow'
import { odczytajKonfiguracjePakietu, pobierzDokumentyPakietu, pobierzMetadanePakietu, przeniesDokument, sprawdzStanDokumentu, sygnaturaZrodel, utworzDomyslnaKonfiguracje, zapiszKonfiguracjePakietu, type KonfiguracjaPakietu } from './modelPakietu'
import { pobierzGotowyPakiet, przygotujPakiet, type GotowyPakiet, type PostepPakietu } from './przygotujPakiet'
import PodgladPakietu from './PodgladPakietu'
import './pakietPdf.css'

type Wlasciwosci = { wersja: WersjaRoboczaGeneratora; otworzDokument: (dokument: Dokument<unknown, unknown>) => void; zamknij: () => void; poUtworzeniu: () => void; grupaEtykietyId?: string }
export default function PanelPakietu({ wersja, otworzDokument, zamknij, poUtworzeniu, grupaEtykietyId }: Wlasciwosci) {
  const metadane = pobierzMetadanePakietu(wersja)
  const dokumenty = pobierzDokumentyPakietu(wersja)
  const [poczatkowy] = useState(() => {
    if (grupaEtykietyId) {
      const nalezace = dokumenty.filter((dokument) => !dokument.powiazania.grupaId || dokument.powiazania.grupaId === grupaEtykietyId)
      return { konfiguracja: { ...utworzDomyslnaKonfiguracje(nalezace), grupyId: [grupaEtykietyId] }, blad: '' }
    }
    try { return { konfiguracja: odczytajKonfiguracjePakietu(metadane.szkolenieId, dokumenty), blad: '' } }
    catch (blad) { return { konfiguracja: utworzDomyslnaKonfiguracje(dokumenty), blad: String(blad) } }
  })
  const [konfiguracja, ustawKonfiguracje] = useState(poczatkowy.konfiguracja)
  const [blad, ustawBlad] = useState(poczatkowy.blad)
  const [komunikat, ustawKomunikat] = useState('')
  const [pakiet, ustawPakiet] = useState<GotowyPakiet | null>(null)
  const [postep, ustawPostep] = useState<PostepPakietu | null>(null)
  const [czyPracuje, ustawCzyPracuje] = useState(false)
  const [, odswiez] = useState(0)
  const blokada = useRef(false)
  const kontroler = useRef<AbortController | null>(null)
  const naglowek = useRef<HTMLHeadingElement>(null)
  const aktualneDane = useRef({ wersja, konfiguracja })
  useLayoutEffect(() => { aktualneDane.current = { wersja, konfiguracja } }, [wersja, konfiguracja])
  useEffect(() => {
    naglowek.current?.focus()
    const odswiezZrodla = () => odswiez((wartosc) => wartosc + 1)
    window.addEventListener('storage', odswiezZrodla)
    window.addEventListener('focus', odswiezZrodla)
    return () => { kontroler.current?.abort(); window.removeEventListener('storage', odswiezZrodla); window.removeEventListener('focus', odswiezZrodla) }
  }, [])
  const kolejnosc = [...new Set([...konfiguracja.kolejnosc, ...dokumenty.map((dokument) => dokument.id)])]
  const widoczneId = kolejnosc.filter((id) => {
    const dokument = dokumenty.find((pozycja) => pozycja.id === id)
    return !dokument || !konfiguracja.grupyId || !dokument.powiazania.grupaId || konfiguracja.grupyId.includes(dokument.powiazania.grupaId)
  })
  let aktualnyPodglad: boolean
  try { aktualnyPodglad = Boolean(pakiet && pakiet.sygnatura === sygnaturaZrodel(wersja, konfiguracja)) } catch { aktualnyPodglad = false }

  function zmienKonfiguracje(zmiany: Partial<KonfiguracjaPakietu>) {
    if (blokada.current) return
    const nowa = { ...konfiguracja, kolejnosc, ...zmiany }
    ustawKonfiguracje(nowa)
    ustawPakiet(null)
    ustawKomunikat('')
    try { if (!grupaEtykietyId) zapiszKonfiguracjePakietu(metadane.szkolenieId, nowa); ustawBlad('') }
    catch (blad) { ustawBlad('Wybór jest aktywny, ale nie udało się go zapamiętać: ' + String(blad)) }
  }
  function przesun(id: string, celId: string) { zmienKonfiguracje({ kolejnosc: przeniesDokument(kolejnosc, id, celId) }) }
  function zmienGrupy(grupyId: string[] | null) {
    const wybraneId = konfiguracja.wybraneId.filter((id) => {
      const dokument = dokumenty.find((pozycja) => pozycja.id === id)
      return !dokument || !grupyId || !dokument.powiazania.grupaId || grupyId.includes(dokument.powiazania.grupaId)
    })
    zmienKonfiguracje({ grupyId, wybraneId })
  }
  async function generuj() {
    if (blokada.current) return
    blokada.current = true
    kontroler.current = new AbortController()
    ustawCzyPracuje(true); ustawBlad(''); ustawPakiet(null); ustawKomunikat('')
    try {
      if (!grupaEtykietyId) zapiszKonfiguracjePakietu(metadane.szkolenieId, { ...konfiguracja, kolejnosc })
      const wynik = await przygotujPakiet(wersja, konfiguracja, kontroler.current.signal, ustawPostep)
      if (wynik.sygnatura !== sygnaturaZrodel(aktualneDane.current.wersja, aktualneDane.current.konfiguracja)) throw new Error('Szczegóły zmieniły się. Wygeneruj pakiet ponownie.')
      ustawPakiet(wynik)
    } catch (blad) { ustawBlad(kontroler.current.signal.aborted ? 'Anulowano przygotowywanie pakietu. Nie zapisano częściowego pliku.' : String(blad instanceof Error ? blad.message : blad)) }
    finally { blokada.current = false; ustawCzyPracuje(false); ustawPostep(null) }
  }
  async function pobierz() {
    if (blokada.current || !pakiet) return
    blokada.current = true; ustawCzyPracuje(true); ustawBlad('')
    try { ustawKomunikat(await pobierzGotowyPakiet(pakiet, wersja, konfiguracja)) }
    catch (blad) { ustawBlad(String(blad instanceof Error ? blad.message : blad)) }
    finally { blokada.current = false; ustawCzyPracuje(false) }
  }
  function utworzBrakujacy(rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null) {
    try {
      const wynik = utworzDokumentZeSzczegolow(wersja, rodzaj, grupaId, wersja.autorId)
      if (!wynik.dokument) throw new Error(wynik.komunikat)
      ustawKomunikat('Utworzono dokument. Wybierz go na liście i sprawdź w generatorze.')
      odswiez((wartosc) => wartosc + 1); poUtworzeniu()
    } catch (blad) { ustawBlad(String(blad)) }
  }
  const brakujace = rodzajeWszystkichDokumentow.flatMap((rodzaj) => (czyDokumentJestGrupowy(rodzaj) ? wersja.grupy.filter((grupa) => !konfiguracja.grupyId || konfiguracja.grupyId.includes(grupa.id)).map((grupa) => grupa.id) : [null]).flatMap((grupaId) => pobierzStanDokumentuZeSzczegolow(wersja, rodzaj, grupaId).dokument ? [] : [{ rodzaj, grupaId }]))
  return <section className="pakiet-pdf" aria-label="Dokumenty do zatwierdzenia" aria-busy={czyPracuje}>
    <header><h3 tabIndex={-1} ref={naglowek}>📄 Dokumenty do zatwierdzenia</h3><dl className="pakiet-pdf__metadane">
      {Object.entries({ Szkolenie: metadane.tytul, Klient: metadane.klient, Termin: metadane.termin, Organizator: metadane.organizator, Opiekun: metadane.opiekun }).map(([etykieta, wartosc]) => <div key={etykieta}><dt>{etykieta}</dt><dd>{wartosc}</dd></div>)}
    </dl><p>Odnaleziono dokumentów: {dokumenty.length}</p></header>
    {grupaEtykietyId ? <p>Grupa z etykiety: {wersja.grupy.find((grupa) => grupa.id === grupaEtykietyId)?.nazwa}</p> : <fieldset disabled={czyPracuje}><legend>Grupy szkoleniowe</legend>
      <label><input type="checkbox" checked={konfiguracja.grupyId === null} onChange={(zdarzenie) => zmienGrupy(zdarzenie.target.checked ? null : [])} />Wszystkie grupy</label>
      {wersja.grupy.map((grupa) => <label key={grupa.id}><input type="checkbox" checked={konfiguracja.grupyId === null || konfiguracja.grupyId.includes(grupa.id)} onChange={(zdarzenie) => zmienGrupy(zdarzenie.target.checked ? [...(konfiguracja.grupyId ?? wersja.grupy.map((pozycja) => pozycja.id)), grupa.id] : (konfiguracja.grupyId ?? wersja.grupy.map((pozycja) => pozycja.id)).filter((id) => id !== grupa.id))} />{grupa.nazwa}</label>)}
      <small>Wyłączenie grupy odznacza jej dokumenty. Dokumenty wspólne występują jeden raz.</small>
    </fieldset>}
    <fieldset disabled={czyPracuje}><legend>Wybierz dokumenty</legend>
      <div className="pakiet-pdf__akcje"><button type="button" onClick={() => zmienKonfiguracje({ wybraneId: widoczneId.filter((id) => !sprawdzStanDokumentu(dokumenty.find((dokument) => dokument.id === id), wersja).blokuje) })}>Zaznacz wszystkie</button><button type="button" onClick={() => zmienKonfiguracje({ wybraneId: [] })}>Odznacz wszystkie</button><button type="button" onClick={() => odswiez((wartosc) => wartosc + 1)}>Odśwież dokumenty</button></div>
      <ol className="pakiet-pdf__lista">{widoczneId.map((id, indeks) => {
        const dokument = dokumenty.find((pozycja) => pozycja.id === id)
        const stan = sprawdzStanDokumentu(dokument, wersja)
        const nazwa = dokument?.tytul ?? 'Usunięty dokument z zapisanego wyboru'
        const grupa = dokument?.powiazania.grupaId ? wersja.grupy.find((grupa) => grupa.id === dokument.powiazania.grupaId)?.nazwa : 'Wspólny dla szkolenia'
        return <li key={id} className="szczegoly-dokument-karta" draggable={!czyPracuje} onDragStart={(zdarzenie) => zdarzenie.dataTransfer.setData('text/plain', id)} onDragOver={(zdarzenie) => zdarzenie.preventDefault()} onDrop={(zdarzenie) => { zdarzenie.preventDefault(); przesun(zdarzenie.dataTransfer.getData('text/plain'), id) }}>
          <label><input type="checkbox" checked={konfiguracja.wybraneId.includes(id)} onChange={(zdarzenie) => zmienKonfiguracje({ wybraneId: zdarzenie.target.checked ? [...konfiguracja.wybraneId, id] : konfiguracja.wybraneId.filter((pozycja) => pozycja !== id) })} /><strong>{nazwa}</strong></label>
          <span>{grupa}</span><span data-stan-pakietu={stan.stan}>{stan.komunikat}</span>
          <div className="pakiet-pdf__akcje"><button type="button" disabled={indeks === 0} aria-label={'Przenieś wyżej: ' + nazwa} onClick={() => przesun(id, widoczneId[indeks - 1])}>↑</button><button type="button" disabled={indeks === widoczneId.length - 1} aria-label={'Przenieś niżej: ' + nazwa} onClick={() => przesun(id, widoczneId[indeks + 1])}>↓</button>{dokument && <button type="button" onClick={() => otworzDokument(dokument)}>Otwórz generator</button>}</div>
        </li>
      })}</ol>
    </fieldset>
    {brakujace.length > 0 && <details><summary>Brakujące dokumenty — utwórz świadomie ({brakujace.length})</summary><div className="pakiet-pdf__akcje">{brakujace.map(({ rodzaj, grupaId }) => <button disabled={czyPracuje} key={rodzaj + (grupaId ?? '')} type="button" onClick={() => utworzBrakujacy(rodzaj, grupaId)}>Utwórz: {etykietyDokumentowZeSzczegolow[rodzaj]}{grupaId ? ' — ' + wersja.grupy.find((grupa) => grupa.id === grupaId)?.nazwa : ''}</button>)}</div></details>}
    <fieldset disabled={czyPracuje}><legend>Ustawienia pakietu</legend>
      {(['stronaTytulowa', 'spisDokumentow', 'podzialNaGrupy', 'oznaczenie'] as const).map((klucz) => <label key={klucz}><input type="checkbox" checked={konfiguracja[klucz]} onChange={(zdarzenie) => zmienKonfiguracje({ [klucz]: zdarzenie.target.checked })} />{{ stronaTytulowa: 'Strona tytułowa', spisDokumentow: 'Spis dokumentów', podzialNaGrupy: 'Podział na grupy szkoleniowe', oznaczenie: 'Oznaczenie „DO ZATWIERDZENIA”' }[klucz]}</label>)}
      <label>Tryb dołączania certyfikatów<select value={konfiguracja.trybCertyfikatow} onChange={(zdarzenie) => zmienKonfiguracje({ trybCertyfikatow: zdarzenie.target.value === 'wszyscy' ? 'wszyscy' : 'wzor' })}><option value="wzor">Jeden dokument wzorcowy</option><option value="wszyscy">Wszystkie dokumenty uczestników</option></select></label>
    </fieldset>
    {postep && <div role="status"><p>Przygotowywanie pakietu… {postep.procent}%</p><progress max={100} value={postep.procent} /><p>{postep.komunikat}</p></div>}
    {blad && <p role="alert" className="pakiet-pdf__blad">{blad}</p>}
    {komunikat && <p role="status">{komunikat}</p>}
    {pakiet && !aktualnyPodglad && <p role="alert">Podgląd jest nieaktualny. Wygeneruj pakiet ponownie.</p>}
    <footer className="pakiet-pdf__stopka"><strong>Wybrano: {konfiguracja.wybraneId.length} dokumentów{aktualnyPodglad && pakiet ? ' · Łącznie: ' + pakiet.liczbaStron + ' stron' : ''}</strong><div className="pakiet-pdf__akcje">
      <button type="button" onClick={() => { if (czyPracuje) kontroler.current?.abort(); else zamknij() }}>Anuluj</button>
      <button type="button" disabled={czyPracuje || !konfiguracja.wybraneId.length} onClick={() => void generuj()}>👁 Podgląd pakietu PDF</button>
      <button type="button" disabled={czyPracuje || !aktualnyPodglad} onClick={() => void pobierz()}>⬇ Pobierz zbiorczy PDF</button>
    </div></footer>
    {pakiet && <PodgladPakietu pakiet={pakiet} />}
  </section>
}
