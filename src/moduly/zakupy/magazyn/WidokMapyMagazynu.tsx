import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import type { Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyMozeEdytowacMapeMagazynu } from '../../../kartoteki/uzytkownicy/uprawnienia'
import type { LokalizacjaMapy, ProstokatMapy, StanZakupow } from '../modele/zakupy'
import { pobierzLokalizacjeMagazynowe, zapiszLokalizacjeMagazynowe } from '../uslugi/magazynLokalizacji'
import { pobierzSciezkeLokalizacji, typyLokalizacji, znajdzMiejscaProduktu } from '../logika/mapaMagazynu'
import { ustawObslugeNiezapisanegoDokumentu } from '../../dokumenty/wspolne/strzeznikNiezapisanegoDokumentu'
import PlanMagazynu from './PlanMagazynu'
import EdytorLokalizacji from './EdytorLokalizacji'
import './mapaMagazynu.css'

export default function WidokMapyMagazynu({ dane, uzytkownik }: { dane: StanZakupow; uzytkownik: Uzytkownik | null }) {
  const [konfiguracja, ustawKonfiguracje] = useState(pobierzLokalizacjeMagazynowe)
  const [lokalizacje, ustawLokalizacje] = useState(konfiguracja.lokalizacje)
  const [rodzicId, ustawRodzica] = useState<string | null>(null)
  const [wybranaId, wybierz] = useState<string | null>(null)
  const [czyEdycja, ustawEdycje] = useState(false)
  const [fraza, ustawFraze] = useState('')
  const [produktId, ustawProdukt] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState<string | null>(konfiguracja.blad)
  const [czyWczytywanie, ustawWczytywanie] = useState(false)
  const czyMozeEdytowac = czyMozeEdytowacMapeMagazynu(uzytkownik)
  const czyNiezapisane = lokalizacje !== konfiguracja.lokalizacje
  const wybrana = lokalizacje.find((lokalizacja) => lokalizacja.id === wybranaId)
  const rodzic = lokalizacje.find((lokalizacja) => lokalizacja.id === rodzicId)
  const daneMapy = { ...dane, lokalizacjeMagazynowe: lokalizacje }
  const znalezione = znajdzMiejscaProduktu(daneMapy, produktId)
  const wybranyProdukt = dane.produkty.find((produkt) => produkt.id === produktId)
  const zawartosc = dane.stanyWLokalizacjach.filter((stan) => wybranaId && pobierzSciezkeLokalizacji(lokalizacje, stan.lokalizacjaId).includes(wybranaId))

  const zapisz = useCallback(() => {
    if (czyWczytywanie) { ustawBlad('Poczekaj na wczytanie zdjęcia.'); return false }
    const wynik = zapiszLokalizacjeMagazynowe(lokalizacje, konfiguracja.zapisBazowy, uzytkownik)
    ustawBlad(wynik.blad)
    if (wynik.blad) return false
    ustawKonfiguracje(wynik)
    ustawLokalizacje(wynik.lokalizacje)
    ustawKomunikat('Zapisano konfigurację mapy.')
    ustawEdycje(false)
    return true
  }, [lokalizacje, konfiguracja.zapisBazowy, uzytkownik, czyWczytywanie])

  useEffect(() => ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => czyNiezapisane || czyWczytywanie, zapiszPrzedWyjsciem: zapisz }), [czyNiezapisane, czyWczytywanie, zapisz])
  useEffect(() => {
    function ostrzez(zdarzenie: BeforeUnloadEvent) { if (czyNiezapisane || czyWczytywanie) zdarzenie.preventDefault() }
    window.addEventListener('beforeunload', ostrzez)
    return () => window.removeEventListener('beforeunload', ostrzez)
  }, [czyNiezapisane, czyWczytywanie])

  function zmien(lokalizacja: LokalizacjaMapy) {
    if (!czyEdycja || !czyMozeEdytowac) return
    ustawLokalizacje((obecne) => obecne.map((obecna) => obecna.id === lokalizacja.id ? lokalizacja : obecna))
    ustawKomunikat('')
  }
  function zmienProstokat(id: string, prostokat: ProstokatMapy) {
    if (!czyEdycja || !czyMozeEdytowac) return
    ustawLokalizacje((obecne) => obecne.map((obecna) => obecna.id === id ? { ...obecna, polozenieNaMapie: prostokat } : obecna))
    ustawKomunikat('')
  }
  function dodaj() {
    if (!czyEdycja || !czyMozeEdytowac) return
    const poziom = rodzic ? typyLokalizacji.findIndex(({ typ }) => typ === rodzic.typ) + 1 : 0
    if (poziom > 4) return
    const typ = typyLokalizacji[poziom]
    let numer = 1
    while (lokalizacje.some((lokalizacja) => lokalizacja.kod === `${typ.typ}-${numer}`)) numer++
    const liczbaDzieci = lokalizacje.filter((lokalizacja) => (lokalizacja.nadrzednaLokalizacjaId ?? null) === rodzicId).length
    const lokalizacja: LokalizacjaMapy = { id: crypto.randomUUID(), kod: `${typ.typ}-${numer}`, nazwa: typ.etykieta, typ: typ.typ, nadrzednaLokalizacjaId: rodzicId ?? undefined, czyAktywna: true, polozenieNaMapie: { x: 5 + (liczbaDzieci % 3) * 30, y: 5 + (Math.floor(liczbaDzieci / 3) % 3) * 30, szerokosc: 25, wysokosc: 20 } }
    ustawLokalizacje((obecne) => [...obecne, lokalizacja])
    wybierz(lokalizacja.id)
    ustawKomunikat('')
  }
  function wczytajPlan() {
    if ((czyNiezapisane || czyWczytywanie) && !window.confirm('Odrzucić niezapisane zmiany mapy i wczytać zapisany plan?')) return
    if (czyWczytywanie) return
    const wynik = pobierzLokalizacjeMagazynowe()
    ustawKonfiguracje(wynik); ustawLokalizacje(wynik.lokalizacje); ustawBlad(wynik.blad)
    ustawRodzica(null); wybierz(null); ustawEdycje(false); ustawKomunikat('Wczytano zapisany plan.')
  }
  async function wczytajZdjecie(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]
    zdarzenie.target.value = ''
    if (!plik || !wybrana || !czyEdycja || !czyMozeEdytowac) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(plik.type) || plik.size > 512 * 1024) { ustawBlad('Wybierz obraz PNG, JPEG lub WebP do 512 KB.'); return }
    const id = wybrana.id
    ustawWczytywanie(true)
    try {
      const zdjecie = await new Promise<string>((rozwiaz, odrzuc) => {
        const czytnik = new FileReader()
        czytnik.onload = () => typeof czytnik.result === 'string' ? rozwiaz(czytnik.result) : odrzuc(new Error('Nie udało się odczytać zdjęcia.'))
        czytnik.onerror = () => odrzuc(new Error('Nie udało się odczytać zdjęcia.'))
        czytnik.readAsDataURL(plik)
      })
      ustawLokalizacje((obecne) => obecne.map((lokalizacja) => lokalizacja.id === id ? { ...lokalizacja, zdjecie } : lokalizacja))
      ustawKomunikat(''); ustawBlad(null)
    } catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie udało się wczytać zdjęcia.') }
    finally { ustawWczytywanie(false) }
  }

  return <section className="mapa-magazynu" aria-labelledby="mapa-magazynu-tytul">
    <h2 id="mapa-magazynu-tytul">Mapa magazynu</h2>
    {blad && <p role="alert">{blad}</p>}
    <p role="status">{czyWczytywanie ? 'Wczytywanie zdjęcia…' : czyNiezapisane ? 'Niezapisane zmiany mapy.' : komunikat}</p>
    <div className="zakupy__nawigacja">
      {czyMozeEdytowac && !czyEdycja && <button type="button" disabled={Boolean(konfiguracja.blad)} onClick={() => ustawEdycje(true)}>Edytuj plan</button>}
      {czyEdycja && <><button type="button" onClick={zapisz} disabled={czyWczytywanie}>Zapisz konfigurację</button><button type="button" onClick={wczytajPlan} disabled={czyWczytywanie}>Anuluj edycję</button><button type="button" disabled={rodzic?.typ === 'POZYCJA' || czyWczytywanie} onClick={dodaj}>Dodaj lokalizację w tym planie</button></>}
      <button type="button" onClick={wczytajPlan} disabled={czyWczytywanie}>Wczytaj zapisany plan</button>
    </div>
    {czyEdycja && <p>Przeciągnij element, aby go przenieść, lub uchwyt ↘, aby zmienić rozmiar. Współrzędne i wymiary możesz też wpisać w formularzu. Nakładanie elementów jest dozwolone.</p>}
    {!czyMozeEdytowac && <p>Edycja planu jest dostępna dla aktywnych pracowników wewnętrznych.</p>}
    <div className="mapa-magazynu__wyszukiwanie">
      <label>Gdzie to leży?<input type="search" value={fraza} placeholder="Wpisz nazwę produktu" onChange={(zdarzenie) => ustawFraze(zdarzenie.target.value)} /></label>
      <label>Wskaż produkt<select value={produktId} onChange={(zdarzenie) => ustawProdukt(zdarzenie.target.value)}>
        <option value="">Wszystkie lokalizacje</option>
        {dane.produkty.filter((produkt) => produkt.id === produktId || produkt.nazwa.toLocaleLowerCase('pl-PL').includes(fraza.toLocaleLowerCase('pl-PL').trim())).map((produkt) => <option key={produkt.id} value={produkt.id}>{produkt.nazwa}</option>)}
      </select></label>
    </div>
    {produktId && <div role="status"><p>{wybranyProdukt?.nazwa}: razem {znalezione.razem} {wybranyProdukt?.jednostkaMiary}</p>
      {!znalezione.miejsca.length && <p>Brak dodatniego zapasu tego produktu.</p>}
      <ul>{znalezione.miejsca.map((miejsce) => <li key={miejsce.id}><button type="button" onClick={() => { const lokalizacja = lokalizacje.find((obecna) => obecna.id === miejsce.id); ustawRodzica(lokalizacja?.nadrzednaLokalizacjaId ?? null); wybierz(miejsce.id) }}>{lokalizacje.find((lokalizacja) => lokalizacja.id === miejsce.id)?.kod ?? 'Nieznana lokalizacja'} — {miejsce.nazwa}: {miejsce.ilosc} {wybranyProdukt?.jednostkaMiary}</button></li>)}</ul>
    </div>}
    <nav className="zakupy__nawigacja" aria-label="Ścieżka planu magazynu">
      <button type="button" onClick={() => { ustawRodzica(null); wybierz(null) }}>Obiekty</button>
      {(rodzicId ? pobierzSciezkeLokalizacji(lokalizacje, rodzicId) : []).map((id) => <button key={id} type="button" aria-current={rodzicId === id ? 'location' : undefined} onClick={() => { ustawRodzica(id); wybierz(null) }}>{lokalizacje.find((lokalizacja) => lokalizacja.id === id)?.nazwa}</button>)}
    </nav>
    <div className="mapa-magazynu__uklad">
      <div className="mapa-magazynu__obszar"><PlanMagazynu dane={daneMapy} rodzicId={rodzicId} wybranaId={wybranaId} podswietloneId={znalezione.podswietloneId} czyFiltr={Boolean(produktId)} czyEdycja={czyEdycja && czyMozeEdytowac} wybierz={wybierz} zmienProstokat={zmienProstokat} /></div>
      <aside className="mapa-magazynu__szczegoly" aria-label="Szczegóły lokalizacji">
        {wybrana ? <>
          <h3>{wybrana.kod} — {wybrana.nazwa}</h3>
          <p>{typyLokalizacji.find(({ typ }) => typ === wybrana.typ)?.etykieta} · {wybrana.czyAktywna ? 'Aktywna' : 'Nieaktywna'}</p>
          {wybrana.opis && <p>{wybrana.opis}</p>}
          {wybrana.zdjecie && <img className="mapa-magazynu__zdjecie" src={wybrana.zdjecie} alt={`Zdjęcie referencyjne: ${wybrana.nazwa}`} onError={() => ustawBlad('Nie można wyświetlić zdjęcia referencyjnego. Wybierz poprawny obraz.')} />}
          {wybrana.typ !== 'POZYCJA' && <button type="button" onClick={() => { ustawRodzica(wybrana.id); wybierz(null) }}>Otwórz plan lokalizacji</button>}
          <h4>Zawartość wraz z lokalizacjami podrzędnymi</h4>
          {zawartosc.length ? <ul>{zawartosc.map((stan) => { const produkt = dane.produkty.find((obecny) => obecny.id === stan.produktId); return <li key={stan.id}>{produkt?.nazwa ?? 'Nieznany produkt'}{stan.wariantProduktuId && ` (${dane.wariantyProduktow.find((wariant) => wariant.id === stan.wariantProduktuId)?.nazwa ?? 'nieznany wariant'})`} — {lokalizacje.find((lokalizacja) => lokalizacja.id === stan.lokalizacjaId)?.kod}: {stan.ilosc} {produkt?.jednostkaMiary}</li> })}</ul> : <p>Brak przypisanych stanów.</p>}
          {czyEdycja && czyMozeEdytowac && <EdytorLokalizacji lokalizacja={wybrana} lokalizacje={lokalizacje} zmien={zmien} wczytajZdjecie={wczytajZdjecie} czyWczytywanie={czyWczytywanie} />}
        </> : <p>Kliknij strefę lub regał, aby zobaczyć zawartość i szczegóły.</p>}
      </aside>
    </div>
  </section>
}
