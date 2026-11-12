import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import type { Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyMozeEdytowacMapeMagazynu } from '../../../kartoteki/uzytkownicy/uprawnienia'
import type { LokalizacjaMapy, ProstokatMapy, StanZakupow } from '../modele/zakupy'
import { pobierzLokalizacjeMagazynowe, zapiszLokalizacjeMagazynowe } from '../uslugi/magazynLokalizacji'
import { dodajPolki, duplikujStruktureLokalizacji, normalizujLokalizacjeMapy, pobierzSciezkeLokalizacji, przeniesLokalizacje, typyLokalizacji, utworzStruktureLokalizacji, wyszukajLokalizacje, zmienKolejnoscLokalizacji, znajdzMiejscaProduktu, type NowaStrukturaLokalizacji } from '../logika/mapaMagazynu'
import { przypiszProduktDoLokalizacji, type PrzypisanieMagazynowe } from '../logika/przypisaniaMagazynowe'
import { ustawObslugeNiezapisanegoDokumentu } from '../../dokumenty/wspolne/strzeznikNiezapisanegoDokumentu'
import PlanMagazynu from './PlanMagazynu'
import EdytorLokalizacji from './EdytorLokalizacji'
import DrzewoLokalizacji from './DrzewoLokalizacji'
import KreatorLokalizacji from './KreatorLokalizacji'
import FormularzPrzypisania from './FormularzPrzypisania'
import './mapaMagazynu.css'

export default function WidokMapyMagazynu({ dane, uzytkownik, odswiez }: { dane: StanZakupow; uzytkownik: Uzytkownik | null; odswiez: () => void }) {
  const [konfiguracja, ustawKonfiguracje] = useState(pobierzLokalizacjeMagazynowe)
  const [lokalizacje, ustawLokalizacje] = useState(konfiguracja.lokalizacje)
  const [daneMagazynowe, ustawDaneMagazynowe] = useState(konfiguracja.daneMagazynowe)
  const [frazaLokalizacji, ustawFrazeLokalizacji] = useState('')
  const [kreator, ustawKreator] = useState<{ rodzicId?: string } | null>(null)
  const [liczbaPolek, ustawLiczbePolek] = useState(5)
  const [czyPolaNiezapisane, ustawNiezapisanePola] = useState(false)
  const [rodzicId, ustawRodzica] = useState<string | null>(null)
  const [wybranaId, wybierz] = useState<string | null>(null)
  const [czyEdycja, ustawEdycje] = useState(false)
  const [fraza, ustawFraze] = useState('')
  const [produktId, ustawProdukt] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState<string | null>(konfiguracja.blad)
  const [czyWczytywanie, ustawWczytywanie] = useState(false)
  const czyMozeEdytowac = czyMozeEdytowacMapeMagazynu(uzytkownik)
  const czyNiezapisane = lokalizacje !== konfiguracja.lokalizacje || daneMagazynowe !== konfiguracja.daneMagazynowe
  const wybrana = lokalizacje.find((lokalizacja) => lokalizacja.id === wybranaId)
  const daneMapy = { ...dane, ...daneMagazynowe, lokalizacjeMagazynowe: lokalizacje }
  const znalezione = znajdzMiejscaProduktu(daneMapy, produktId)
  const wybranyProdukt = daneMagazynowe.produkty.find((produkt) => produkt.id === produktId)
  const zawartosc = daneMagazynowe.stanyWLokalizacjach.filter((stan) => wybranaId && pobierzSciezkeLokalizacji(lokalizacje, stan.lokalizacjaId).includes(wybranaId))
  const trafienia = new Set(wyszukajLokalizacje(lokalizacje, frazaLokalizacji).flatMap((lokalizacja) => pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id)))
  const podswietlone = frazaLokalizacji ? new Set([...trafienia].filter((id) => !produktId || znalezione.podswietloneId.has(id))) : znalezione.podswietloneId

  const zapisz = useCallback(() => {
    if (czyPolaNiezapisane) { ustawBlad('Najpierw zastosuj edycję lokalizacji. Zachowano wpisane pola.'); return false }
    if (czyWczytywanie) { ustawBlad('Poczekaj na wczytanie zdjęcia.'); return false }
    const wynik = zapiszLokalizacjeMagazynowe(lokalizacje, konfiguracja.zapisBazowy, uzytkownik, daneMagazynowe)
    ustawBlad(wynik.blad)
    if (wynik.blad) return false
    ustawKonfiguracje(wynik)
    ustawLokalizacje(wynik.lokalizacje)
    ustawDaneMagazynowe(wynik.daneMagazynowe)
    odswiez()
    ustawKomunikat('Zapisano konfigurację magazynu i przypisania produktów.')
    ustawEdycje(false)
    return true
  }, [lokalizacje, daneMagazynowe, konfiguracja.zapisBazowy, uzytkownik, czyWczytywanie, czyPolaNiezapisane, odswiez])

  useEffect(() => ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => czyNiezapisane || czyWczytywanie || czyPolaNiezapisane, zapiszPrzedWyjsciem: zapisz }), [czyNiezapisane, czyWczytywanie, czyPolaNiezapisane, zapisz])
  useEffect(() => {
    function ostrzez(zdarzenie: BeforeUnloadEvent) { if (czyNiezapisane || czyWczytywanie || czyPolaNiezapisane) zdarzenie.preventDefault() }
    window.addEventListener('beforeunload', ostrzez)
    return () => window.removeEventListener('beforeunload', ostrzez)
  }, [czyNiezapisane, czyWczytywanie, czyPolaNiezapisane])

  function zmien(lokalizacja: LokalizacjaMapy) {
    if (!czyEdycja || !czyMozeEdytowac) return false
    try {
      const obecna = lokalizacje.find((obecna) => obecna.id === lokalizacja.id)
      const zmienione = lokalizacje.map((obecna) => obecna.id === lokalizacja.id ? lokalizacja : obecna)
      ustawLokalizacje(obecna?.nadrzednaLokalizacjaId !== lokalizacja.nadrzednaLokalizacjaId ? przeniesLokalizacje(zmienione, lokalizacja.id, lokalizacja.nadrzednaLokalizacjaId) : normalizujLokalizacjeMapy(zmienione, 2))
      if (obecna?.nadrzednaLokalizacjaId !== lokalizacja.nadrzednaLokalizacjaId) ustawRodzica(lokalizacja.nadrzednaLokalizacjaId ?? null)
      ustawBlad(null); ustawKomunikat('')
      return true
    } catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie zmieniono lokalizacji.'); return false }
  }
  function zmienProstokat(id: string, prostokat: ProstokatMapy) {
    if (!czyEdycja || !czyMozeEdytowac) return
    ustawLokalizacje((obecne) => obecne.map((obecna) => obecna.id === id ? { ...obecna, polozenieNaMapie: prostokat } : obecna))
    ustawKomunikat('')
  }
  function dodaj() {
    if (!czyEdycja || !czyMozeEdytowac) return
    ustawKreator({ rodzicId: rodzicId ?? undefined })
  }
  function wybierzLokalizacje(id: string) {
    if (czyPolaNiezapisane) { ustawBlad('Najpierw zastosuj edycję lokalizacji. Zachowano wpisane pola.'); return }
    const lokalizacja = lokalizacje.find((obecna) => obecna.id === id)
    ustawRodzica(lokalizacja?.nadrzednaLokalizacjaId ?? null); wybierz(id || null)
  }
  function utworz(dane: NowaStrukturaLokalizacji) {
    if (!czyEdycja || !czyMozeEdytowac) return false
    if (czyPolaNiezapisane) { ustawBlad('Najpierw zastosuj edycję lokalizacji.'); return false }
    try {
      const wynik = utworzStruktureLokalizacji(lokalizacje, dane)
      ustawLokalizacje(wynik.lokalizacje); ustawRodzica(dane.rodzicId ?? null); wybierz(wynik.id); ustawBlad(null)
      return true
    } catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie utworzono struktury.'); return false }
  }
  function operacjaStruktury(czyDuplikacja: boolean) {
    if (!wybranaId || !czyEdycja || !czyMozeEdytowac) return
    if (czyPolaNiezapisane) { ustawBlad('Najpierw zastosuj edycję lokalizacji.'); return }
    try {
      if (czyDuplikacja) { const wynik = duplikujStruktureLokalizacji(lokalizacje, wybranaId); ustawLokalizacje(wynik.lokalizacje); wybierz(wynik.id) }
      else ustawLokalizacje(dodajPolki(lokalizacje, wybranaId, liczbaPolek))
      ustawBlad(null)
    } catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie zmieniono struktury.') }
  }
  function przypisz(operacja: PrzypisanieMagazynowe) {
    if (!czyEdycja || !czyMozeEdytowac || !uzytkownik) return false
    try { ustawDaneMagazynowe(przypiszProduktDoLokalizacji(daneMagazynowe, lokalizacje, operacja, uzytkownik.id)); ustawBlad(null); return true }
    catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie przypisano produktu.'); return false }
  }
  function dodajProdukt(nazwa: string, jednostka: string) {
    if (!czyEdycja || !czyMozeEdytowac) return null
    if (!nazwa.trim() || !jednostka.trim() || daneMagazynowe.produkty.some((produkt) => produkt.nazwa.toLocaleLowerCase('pl').trim() === nazwa.toLocaleLowerCase('pl').trim())) { ustawBlad('Podaj nazwę nieistniejącego produktu i jednostkę miary.'); return null }
    const id = crypto.randomUUID()
    ustawDaneMagazynowe({ ...daneMagazynowe, produkty: [...daneMagazynowe.produkty, { id, nazwa: nazwa.trim(), jednostkaMiary: jednostka.trim(), czyAktywny: true, rodzaj: 'MATERIAL_ZUZYWALNY', sposobEwidencji: 'ILOSCIOWY' }] })
    ustawBlad(null)
    return id
  }
  function wczytajPlan() {
    if ((czyNiezapisane || czyWczytywanie || czyPolaNiezapisane) && !window.confirm('Odrzucić niezapisane zmiany mapy i wczytać zapisany plan?')) return
    if (czyWczytywanie) return
    const wynik = pobierzLokalizacjeMagazynowe()
    ustawKonfiguracje(wynik); ustawLokalizacje(wynik.lokalizacje); ustawBlad(wynik.blad)
    ustawDaneMagazynowe(wynik.daneMagazynowe); ustawKreator(null); odswiez()
    ustawNiezapisanePola(false)
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
      {czyEdycja && <><button type="button" onClick={zapisz} disabled={czyWczytywanie}>Zapisz konfigurację</button><button type="button" onClick={wczytajPlan} disabled={czyWczytywanie}>Anuluj edycję</button><button type="button" disabled={czyWczytywanie} onClick={dodaj}>Dodaj lokalizację w tym planie</button></>}
      <button type="button" onClick={wczytajPlan} disabled={czyWczytywanie}>Wczytaj zapisany plan</button>
    </div>
    {czyEdycja && <p>Przeciągnij element lub uchwyt ↘. Strzałki przesuwają zaznaczony obiekt. Pozycja na mapie nie zmienia adresu. Edycję pól zatwierdź przyciskiem „Zastosuj edycję lokalizacji”, a następnie zapisz konfigurację.</p>}
    {czyEdycja && kreator && <KreatorLokalizacji key={kreator.rodzicId ?? 'korzen'} lokalizacje={lokalizacje} rodzicId={kreator.rodzicId} utworz={utworz} zamknij={() => ustawKreator(null)} />}
    {!czyMozeEdytowac && <p>Edycja planu jest dostępna dla aktywnych pracowników wewnętrznych.</p>}
    <div className="mapa-magazynu__wyszukiwanie">
      <label>Gdzie to leży?<input type="search" value={fraza} placeholder="Wpisz nazwę produktu" onChange={(zdarzenie) => ustawFraze(zdarzenie.target.value)} /></label>
      <label>Wskaż produkt<select value={produktId} onChange={(zdarzenie) => ustawProdukt(zdarzenie.target.value)}>
        <option value="">Wszystkie lokalizacje</option>
        {daneMagazynowe.produkty.filter((produkt) => produkt.id === produktId || produkt.nazwa.toLocaleLowerCase('pl-PL').includes(fraza.toLocaleLowerCase('pl-PL').trim())).map((produkt) => <option key={produkt.id} value={produkt.id}>{produkt.nazwa}</option>)}
      </select></label>
    </div>
    {produktId && <div role="status"><p>{wybranyProdukt?.nazwa}: razem {znalezione.razem} {wybranyProdukt?.jednostkaMiary}</p>
      {!znalezione.miejsca.length && <p>Brak dodatniego zapasu tego produktu.</p>}
      <ul>{znalezione.miejsca.map((miejsce) => <li key={miejsce.id}><button type="button" onClick={() => wybierzLokalizacje(miejsce.id)}>{lokalizacje.find((lokalizacja) => lokalizacja.id === miejsce.id)?.pelnyKod ?? 'Nieznana lokalizacja'} — {miejsce.nazwa}: {miejsce.ilosc} {wybranyProdukt?.jednostkaMiary}</button></li>)}</ul>
    </div>}
    <nav className="zakupy__nawigacja" aria-label="Ścieżka planu magazynu">
      <button type="button" disabled={czyPolaNiezapisane} onClick={() => { ustawRodzica(null); wybierz(null) }}>Obiekty</button>
      {(rodzicId ? pobierzSciezkeLokalizacji(lokalizacje, rodzicId) : []).map((id) => <button key={id} type="button" disabled={czyPolaNiezapisane} aria-current={rodzicId === id ? 'location' : undefined} onClick={() => { ustawRodzica(id); wybierz(null) }}>{lokalizacje.find((lokalizacja) => lokalizacja.id === id)?.nazwa}</button>)}
    </nav>
    <div className="mapa-magazynu__uklad">
      <DrzewoLokalizacji lokalizacje={lokalizacje} stany={daneMagazynowe.stanyWLokalizacjach} wybranaId={wybranaId} fraza={frazaLokalizacji} ustawFraze={ustawFrazeLokalizacji} wybierz={wybierzLokalizacje} dodaj={(id) => ustawKreator({ rodzicId: id })} czyEdycja={czyEdycja && czyMozeEdytowac && !czyWczytywanie} />
      <div className="mapa-magazynu__obszar"><PlanMagazynu dane={daneMapy} rodzicId={rodzicId} wybranaId={wybranaId} podswietloneId={podswietlone} czyFiltr={Boolean(produktId || frazaLokalizacji)} czyEdycja={czyEdycja && czyMozeEdytowac && !czyWczytywanie && !czyPolaNiezapisane} wybierz={wybierzLokalizacje} zmienProstokat={zmienProstokat} /></div>
      <aside className="mapa-magazynu__szczegoly" aria-label="Szczegóły lokalizacji">
        {wybrana ? <>
          <h3>{wybrana.pelnyKod} — {wybrana.nazwa}</h3>
          <p>{typyLokalizacji.find(({ typ }) => typ === wybrana.typ)?.etykieta} · {wybrana.czyAktywna ? 'Aktywna' : 'Nieaktywna'}</p>
          {wybrana.opis && <p>{wybrana.opis}</p>}
          {wybrana.zdjecie && <img className="mapa-magazynu__zdjecie" src={wybrana.zdjecie} alt={`Zdjęcie referencyjne: ${wybrana.nazwa}`} onError={() => ustawBlad('Nie można wyświetlić zdjęcia referencyjnego. Wybierz poprawny obraz.')} />}
          <button type="button" disabled={czyPolaNiezapisane} onClick={() => { ustawRodzica(wybrana.id); wybierz(null) }}>Otwórz plan lokalizacji</button>
          <h4>Zawartość wraz z lokalizacjami podrzędnymi</h4>
          {zawartosc.length ? <ul>{zawartosc.map((stan) => { const produkt = daneMagazynowe.produkty.find((obecny) => obecny.id === stan.produktId); return <li key={stan.id}>{produkt?.nazwa ?? 'Nieznany produkt'}{stan.wariantProduktuId && ` (${daneMagazynowe.wariantyProduktow.find((wariant) => wariant.id === stan.wariantProduktuId)?.nazwa ?? 'nieznany wariant'})`} — {lokalizacje.find((lokalizacja) => lokalizacja.id === stan.lokalizacjaId)?.pelnyKod}: {stan.ilosc} {produkt?.jednostkaMiary}</li> })}</ul> : <p>Brak przypisanych stanów.</p>}
          {czyEdycja && czyMozeEdytowac && <>
            <div className="zakupy__nawigacja"><button type="button" disabled={czyWczytywanie} onClick={() => ustawKreator({ rodzicId: wybrana.id })}>Dodaj element podrzędny</button><button type="button" disabled={czyWczytywanie} onClick={() => operacjaStruktury(true)}>Duplikuj strukturę</button></div>
            <div className="zakupy__nawigacja">{([-1, 1] as const).map((kierunek) => <button key={kierunek} type="button" disabled={czyWczytywanie || czyPolaNiezapisane} onClick={() => ustawLokalizacje(zmienKolejnoscLokalizacji(lokalizacje, wybrana.id, kierunek))}>{kierunek === -1 ? 'Przenieś wyżej' : 'Przenieś niżej'}</button>)}</div>
            <label>Liczba dodawanych półek<input type="number" min={1} max={500} value={liczbaPolek} onChange={(zdarzenie) => ustawLiczbePolek(zdarzenie.target.valueAsNumber)} /></label><button type="button" disabled={czyWczytywanie} onClick={() => operacjaStruktury(false)}>Dodaj półki jednocześnie</button>
            <EdytorLokalizacji key={wybrana.id + JSON.stringify([wybrana.kod, wybrana.nazwa, wybrana.nadrzednaLokalizacjaId, wybrana.typ, wybrana.kolejnosc, wybrana.opis, wybrana.czyAktywna])} lokalizacja={wybrana} lokalizacje={lokalizacje} zmien={zmien} wczytajZdjecie={wczytajZdjecie} czyWczytywanie={czyWczytywanie} ustawNiezapisanePola={ustawNiezapisanePola} />
          </>}
        </> : <p>Kliknij strefę lub regał, aby zobaczyć zawartość i szczegóły.</p>}
      </aside>
    </div>
    {czyEdycja && czyMozeEdytowac && <fieldset disabled={czyWczytywanie} className="mapa-magazynu__formularz"><legend>Produkty i stany</legend><FormularzPrzypisania dane={daneMagazynowe} lokalizacje={lokalizacje} lokalizacjaId={wybranaId ?? ''} wybierz={wybierzLokalizacje} utworzLokalizacje={() => ustawKreator({ rodzicId: wybranaId ?? undefined })} przypisz={przypisz} dodajProdukt={dodajProdukt} /></fieldset>}
    <details><summary>Historia operacji magazynowych ({daneMagazynowe.ruchyMagazynowe.length})</summary><ul>{daneMagazynowe.ruchyMagazynowe.map((ruch) => <li key={ruch.id}>{ruch.wykonano} · {ruch.rodzaj} · {daneMagazynowe.produkty.find((produkt) => produkt.id === ruch.produktId)?.nazwa} · {ruch.ilosc} · {lokalizacje.find((lokalizacja) => lokalizacja.id === ruch.lokalizacjaZrodlowaId)?.pelnyKod ?? 'Przyjęcie'} → {lokalizacje.find((lokalizacja) => lokalizacja.id === ruch.lokalizacjaDocelowaId)?.pelnyKod}</li>)}</ul></details>
  </section>
}
