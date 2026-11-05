import { useId, useRef, useState } from 'react'
import type { Dokument } from '../../../wspolne/dokumenty/modelDokumentu'
import { czyMozeEksportowac, czyMozeWysylac } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { pobierzUzytkownika } from '../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzNazweUzytkownika } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { podsumujDokumentyWysylki, type StanDokumentuWysylki } from './logika/dokumentyWysylki'
import type { WysylkaMonitora } from './logika/monitorWysylek'
import { potwierdzAktualnoscDokumentuMonitora, skorygujWydrukMonitora, zapiszWymaganieMonitora, zarejestrujWydrukMonitora } from './uslugi/dokumentyMonitora'
import { przygotujPrzejscieDoWydruku } from '../../../wspolne/dokumenty/zlecenieWydrukuGeneratora'

const etykietyStatusow: Record<StanDokumentuWysylki['status'], string> = {
  brak: 'Nie utworzono', przygotowany: 'Do wydrukowania', wydrukowany: 'Wydruk potwierdzony', nie_dotyczy: 'Nie dotyczy', niepewny: 'Wymaga sprawdzenia',
}

type WlasciwosciAkcji = {
  wysylka: WysylkaMonitora
  stan: StanDokumentuWysylki
  uzytkownikId: string | null
  otworzDokument?: (dokument: Dokument<unknown, unknown>) => void
}

function KafelekDokumentuWysylki({ stan, otwarty, panelId, otworz }: { stan: StanDokumentuWysylki; otwarty: boolean; panelId: string; otworz: () => void }) {
  return <button type="button" className="monitor-dokument__kafelek" data-stan={stan.status} aria-expanded={otwarty} aria-controls={otwarty ? panelId : undefined} onClick={otworz}>
    <strong><span aria-hidden="true">{stan.ikona}</span> {stan.nazwa}</strong>
    <span>{etykietyStatusow[stan.status]}</span>
    <span>Wydrukowano: <b>{stan.wydrukowane} / {stan.wymagane}</b></span>
    <span>{stan.nieDotyczy ? 'Bez wydruków w tej paczce' : `Brakuje: ${stan.brakujace} egz.`}</span>
    {stan.wymagaAktualizacji && <strong>⚠ Wymaga aktualizacji</strong>}
    {stan.ostrzezenia.length > 0 && <span>⚠ Sprawdź dane</span>}
  </button>
}

function PanelAkcjiDokumentu({ wysylka, stan, uzytkownikId, otworzDokument }: WlasciwosciAkcji) {
  const [ilosc, ustawIlosc] = useState(String(stan.brakujace || stan.wymagane || 1))
  const [wymagane, ustawWymagane] = useState(String(stan.wymagane))
  const [nieDotyczy, ustawNieDotyczy] = useState(stan.nieDotyczy)
  const [blad, ustawBlad] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const [trwaZapis, ustawTrwaZapis] = useState(false)
  const [korygowanaId, ustawKorygowanaId] = useState('')
  const [korektaIlosci, ustawKorekteIlosci] = useState('')
  const [powod, ustawPowod] = useState('')
  const [czyPotwierdzenie, ustawCzyPotwierdzenie] = useState(false)
  const [czySprawdzonoAktualnosc, ustawCzySprawdzonoAktualnosc] = useState(false)
  const operacjaId = useRef(crypto.randomUUID())
  const uzytkownik = uzytkownikId ? pobierzUzytkownika(uzytkownikId) : null
  const mozePotwierdzac = czyMozeWysylac(uzytkownik) && Boolean(wysylka.checklistaId && wysylka.paczkaId)
  const mozeDrukowac = czyMozeEksportowac(uzytkownik)
  const zablokowane = !stan.dokument || stan.nieDotyczy || stan.wymagaAktualizacji || stan.ostrzezenia.length > 0
  const zastapione = new Set(stan.operacje.map((operacja) => operacja.korygowanaOperacjaId))

  async function wykonaj(akcja: (id: string) => Promise<unknown>, opis: string) {
    if (trwaZapis) return
    ustawTrwaZapis(true); ustawBlad(''); ustawKomunikat('')
    try {
      await akcja(operacjaId.current)
      operacjaId.current = crypto.randomUUID()
      ustawKomunikat(opis); ustawCzyPotwierdzenie(false)
    } catch (blad) { ustawBlad(blad instanceof Error ? blad.message : 'Nie udało się zapisać operacji. Spróbuj ponownie.') }
    finally { ustawTrwaZapis(false) }
  }

  function sprawdzIlosc(tekst: string) {
    if (!tekst.trim()) throw new Error('Podaj liczbę egzemplarzy.')
    return Number(tekst)
  }

  function przejdzDoGeneratora(czyDruk: boolean) {
    const dokument = stan.dokument
    if (!dokument || !otworzDokument) return
    if (!czyDruk) { otworzDokument(dokument); return }
    void wykonaj(async (id) => {
      const operacja = await zarejestrujWydrukMonitora(wysylka, stan, { operacjaId: id, status: 'ZLECONY', liczbaEgzemplarzy: stan.brakujace }, uzytkownikId)
      przygotujPrzejscieDoWydruku(operacja)
      otworzDokument(dokument)
    }, 'Przygotowano zlecenie druku. Potwierdź dopiero odebrane egzemplarze.')
  }

  return <div className="monitor-dokument__panel">
    <h4>{stan.nazwa}</h4>
    <p>{stan.zrodloIlosci}. Ilości wydruków dotyczą tej grupy i paczki.</p>
    {stan.wymagaAktualizacji && <p role="alert">Dokument wymaga aktualizacji ze Szczegółów organizacyjnych. Otwórz generator i zapisz aktualną treść przed drukiem.</p>}
    {stan.wymagaAktualizacji && mozeDrukowac && <fieldset disabled={trwaZapis}><legend>Sprawdzenie aktualności dokumentu</legend>
      <label><input type="checkbox" checked={czySprawdzonoAktualnosc} onChange={(zdarzenie) => ustawCzySprawdzonoAktualnosc(zdarzenie.target.checked)} />Sprawdziłem treść w generatorze i jej zgodność z aktualnymi Szczegółami organizacyjnymi.</label>
      <button type="button" disabled={!czySprawdzonoAktualnosc} onClick={() => void wykonaj(() => potwierdzAktualnoscDokumentuMonitora(wysylka, stan, uzytkownikId), 'Zapisano sprawdzenie aktualności dokumentu.')}>Potwierdź sprawdzenie aktualności</button>
    </fieldset>}
    {stan.ostrzezenia.length > 0 && <ul>{stan.ostrzezenia.map((ostrzezenie) => <li key={ostrzezenie}>{ostrzezenie}</li>)}</ul>}
    {!stan.dokument && <p>Utwórz dokument w sekcji „Przygotuj dokumenty” Szczegółów organizacyjnych.</p>}
    <div className="monitor-dokument__akcje">
      <button type="button" disabled={!stan.dokument || !otworzDokument || trwaZapis} onClick={() => przejdzDoGeneratora(false)}>Otwórz dokument</button>
      <button type="button" disabled={!stan.dokument || !otworzDokument || trwaZapis} onClick={() => {
        if (stan.dokument && otworzDokument) { przygotujPrzejscieDoWydruku(null, stan.dokument.id); otworzDokument(stan.dokument) }
      }}>Podgląd dokumentu</button>
      <button type="button" disabled={!mozeDrukowac || zablokowane || !stan.brakujace || !otworzDokument || trwaZapis} onClick={() => przejdzDoGeneratora(true)}>Drukuj brakujące egzemplarze ({stan.brakujace})</button>
    </div>
    <fieldset disabled={!mozePotwierdzac || trwaZapis}>
      <legend>Wymagania wydruków</legend>
      <label>Wymagana liczba egzemplarzy<input type="number" min="0" step="1" value={wymagane} onChange={(zdarzenie) => ustawWymagane(zdarzenie.target.value)} /></label>
      <button type="button" role="switch" aria-checked={nieDotyczy} onClick={() => ustawNieDotyczy(!nieDotyczy)}>Nie dotyczy: {nieDotyczy ? 'tak' : 'nie'}</button>
      <button type="button" onClick={() => void wykonaj((id) => zapiszWymaganieMonitora(wysylka, stan, { liczbaEgzemplarzy: sprawdzIlosc(wymagane), nieDotyczy }, id, uzytkownikId), 'Zapisano wymagania wydruków.')}>Zatwierdź wymagania</button>
      <button type="button" disabled={!stan.wymaganieReczne || trwaZapis} onClick={() => void wykonaj((id) => zapiszWymaganieMonitora(wysylka, stan, { liczbaEgzemplarzy: null, nieDotyczy: null }, id, uzytkownikId), 'Przywrócono ilości z dyspozycji lub wartości domyślne.')}>Przywróć dyspozycje</button>
    </fieldset>
    <fieldset disabled={!mozePotwierdzac || zablokowane || trwaZapis}>
      <legend>Potwierdź rzeczywiście odebrane wydruki</legend>
      <label>Liczba nowych wydrukowanych egzemplarzy<input type="number" min="1" step="1" value={ilosc} onChange={(zdarzenie) => { ustawIlosc(zdarzenie.target.value); ustawCzyPotwierdzenie(false) }} /></label>
      <label><input type="checkbox" checked={czyPotwierdzenie} onChange={(zdarzenie) => ustawCzyPotwierdzenie(zdarzenie.target.checked)} />Potwierdzam odbiór wskazanej liczby egzemplarzy aktualnej wersji.</label>
      <button type="button" disabled={!czyPotwierdzenie || trwaZapis} onClick={() => void wykonaj((id) => zarejestrujWydrukMonitora(wysylka, stan, { operacjaId: id, status: 'POTWIERDZONY', liczbaEgzemplarzy: sprawdzIlosc(ilosc) }, uzytkownikId), 'Zapisano potwierdzenie wydruku.')}>Potwierdź wydruk</button>
    </fieldset>
    {(!wysylka.checklistaId || !wysylka.paczkaId) && <p>Najpierw utwórz checklistę paczki, aby zapisywać jej wymagania i wydruki.</p>}
    {!czyMozeWysylac(uzytkownik) && <p>Potwierdzanie, korekty i wymagania są dostępne dla użytkowników z uprawnieniem wysyłki.</p>}
    {!mozeDrukowac && <p>Druk wymaga uprawnienia eksportu.</p>}
    {blad && <p role="alert">{blad}</p>}{komunikat && <p role="status">{komunikat}</p>}
    <details className="monitor-dokument__historia"><summary>Historia wydruków ({stan.operacje.length})</summary>
      {!stan.operacje.length && <p>Brak zarejestrowanych operacji. Eksport PDF i okno drukowania nie potwierdzają wydruku.</p>}
      <ol>{stan.operacje.map((operacja) => <li key={operacja.operacjaId}>
        <strong>{operacja.status === 'ZLECONY' ? 'Zlecenie' : operacja.status === 'KOREKTA' ? 'Korekta' : 'Potwierdzony wydruk'}: {operacja.liczbaEgzemplarzy} egz.</strong>
        <span> · {new Date(operacja.data).toLocaleString('pl-PL')} · {pobierzNazweUzytkownika(pobierzUzytkownika(operacja.uzytkownikId) ?? { imie: 'Usunięty', nazwisko: 'użytkownik' })}</span>
        <span> · {operacja.wersjaDokumentuId === stan.wersjaDokumentuId ? 'Aktualna wersja' : 'Poprzednia wersja'}</span>
        {zastapione.has(operacja.operacjaId) && <span> · Skorygowany</span>}
        {operacja.powod && <p>Powód: {operacja.powod}</p>}
        {mozePotwierdzac && operacja.status !== 'ZLECONY' && !zastapione.has(operacja.operacjaId) && <button type="button" disabled={trwaZapis} onClick={() => { ustawKorygowanaId(operacja.operacjaId); ustawKorekteIlosci(String(operacja.liczbaEgzemplarzy)); ustawPowod('') }}>Skoryguj ilość</button>}
      </li>)}</ol>
      {korygowanaId && <fieldset disabled={!mozePotwierdzac || trwaZapis}><legend>Korekta wybranego wpisu</legend>
        <label>Poprawna liczba egzemplarzy<input type="number" min="0" step="1" value={korektaIlosci} onChange={(zdarzenie) => ustawKorekteIlosci(zdarzenie.target.value)} /></label>
        <label>Powód korekty<input value={powod} onChange={(zdarzenie) => ustawPowod(zdarzenie.target.value)} /></label>
        <button type="button" onClick={() => void wykonaj(async (id) => {
          const poprzednia = stan.operacje.find((operacja) => operacja.operacjaId === korygowanaId)
          if (!poprzednia) throw new Error('Odśwież historię wydruków.')
          await skorygujWydrukMonitora(wysylka, stan, poprzednia, sprawdzIlosc(korektaIlosci), powod, id, uzytkownikId)
          ustawKorygowanaId('')
        }, 'Zapisano korektę z zachowaniem poprzedniego wpisu.')}>Zapisz korektę</button>
      </fieldset>}
    </details>
  </div>
}

export default function DokumentyWysylki({ wysylka, dokumenty, uzytkownikId, otworzDokument }: Omit<WlasciwosciAkcji, 'stan'> & { dokumenty: StanDokumentuWysylki[] }) {
  const [wybranyRodzaj, ustawWybranyRodzaj] = useState<StanDokumentuWysylki['rodzaj'] | null>(null)
  const panelId = useId()
  const podsumowanie = podsumujDokumentyWysylki(dokumenty)
  const wybrany = dokumenty.find((stan) => stan.rodzaj === wybranyRodzaj)
  return <section className="monitor-dokumenty" aria-label="Dokumenty i wydruki">
    <h4>DOKUMENTY I WYDRUKI</h4>
    <p aria-live="polite">DOKUMENTY GOTOWE: {podsumowanie.gotowe}/{podsumowanie.wymagane}</p>
    <progress aria-label="Kompletność dokumentów" value={podsumowanie.procent} max="100">{podsumowanie.procent}%</progress>
    <p>Zawartość fizyczna: {wysylka.liczbaGotowych}/{wysylka.liczbaWymaganych} pozycji · Wysyłka: {wysylka.statusPrzesylki}</p>
    <div className="monitor-dokumenty__siatka">{dokumenty.map((stan) => <KafelekDokumentuWysylki key={stan.rodzaj} stan={stan} otwarty={wybranyRodzaj === stan.rodzaj} panelId={panelId} otworz={() => ustawWybranyRodzaj(wybranyRodzaj === stan.rodzaj ? null : stan.rodzaj)} />)}</div>
    {wybrany && <div id={panelId}><PanelAkcjiDokumentu key={`${wybrany.rodzaj}:${wybrany.wersjaDokumentuId ?? 'brak'}`} wysylka={wysylka} stan={wybrany} uzytkownikId={uzytkownikId} otworzDokument={otworzDokument} /></div>}
  </section>
}
