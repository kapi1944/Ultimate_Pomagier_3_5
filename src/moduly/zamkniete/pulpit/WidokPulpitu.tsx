import { useEffect, useMemo, useState } from 'react'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import { pobierzNazweWyswietlanaUzytkownika } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { pobierzChecklistyPaczek, pobierzSzczegolyDoChecklisty } from '../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { czyPozycjaJestAktywna } from '../../dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import { obliczPostepCzasuDnia, etykietyOsiCzasu, pozycjaGodzinyNaOsi } from './logika/czasDnia'
import { czyPaczkaOpozniona, czyPaczkaWidoczna, czyWysylkaWymagaDodatkowegoPotwierdzenia, liczbaDniWidocznosciPaczki, pobierzGotowoscPaczki, pobierzTerminWzglednyPaczki, sortujPaczki } from './logika/paczki'
import { generujZadaniaAutomatyczne } from './logika/zadaniaAutomatyczne'
import { czyMoznaZmienicKontekstPulpitu } from './logika/kontekstPulpitu'
import { obliczLicznikiPulpitu } from './logika/podsumowaniePulpitu'
import { czyMoznaOznaczycZadanieRecznie, czyZadanieDotyczyDnia, czyZadanieOpoznione, pobierzEtykieteStatusuZadania, sortujZadaniaBezGodziny } from './logika/zadania'
import type { PaczkaPulpitu, ZadaniePulpitu } from './modele/pulpit'
import { oznaczPaczkeJakoWyslana, pobierzStanPulpitu, zapiszZadanieReczne } from './uslugi/magazynPulpitu'
import './pulpit.css'

type FiltrPulpitu = 'WSZYSTKIE' | 'DO_ZROBIENIA' | 'PILNE' | 'PACZKI' | 'BLOKADY'

type WlasciwosciPulpitu = {
  otworzRekordZrodlowy?: (idSzkolenia?: string) => void
  otworzPaczke?: (idPaczki: string) => void
}

function dataTekstowa(data: Date) {
  const rok = data.getFullYear()
  const miesiac = String(data.getMonth() + 1).padStart(2, '0')
  const dzien = String(data.getDate()).padStart(2, '0')
  return `${rok}-${miesiac}-${dzien}`
}

function przesunDate(data: string, liczbaDni: number) {
  const wynik = new Date(`${data}T00:00:00`)
  wynik.setDate(wynik.getDate() + liczbaDni)
  return dataTekstowa(wynik)
}

function formatujDate(data: string) {
  if (!data) return 'Brak daty'
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${data}T00:00:00`))
}

function utworzIdZadania() {
  return `zadanie-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pobierzPaczki(wyslanePaczki: Record<string, string>): PaczkaPulpitu[] {
  return pobierzChecklistyPaczek().flatMap((checklista) => {
    const dane = checklista.daneDokumentu
    if (!dane.dataWyslania) return []
    const wymagane = dane.pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && !pozycja.czyOnline && czyPozycjaJestAktywna(pozycja))
    const brakujacePozycje = wymagane.filter((pozycja) => pozycja.statusGotowosci !== 'GOTOWE').map((pozycja) => pozycja.nazwa)
    const brakDanychOdbiorcy = [dane.daneOdbiorcy.imieNazwisko || dane.daneOdbiorcy.nazwaFirmy, dane.daneOdbiorcy.ulica, dane.daneOdbiorcy.nrBudynku, dane.daneOdbiorcy.kodPocztowy, dane.daneOdbiorcy.miasto].some((wartosc) => !wartosc.trim())
    const brakujaceElementy = brakDanychOdbiorcy ? [...brakujacePozycje, 'dane odbiorcy'] : brakujacePozycje
    return [{
      id: checklista.id,
      nazwaSzkolenia: dane.migawkaZrodla?.tytulSzkolenia || checklista.tytul,
      miasto: dane.migawkaZrodla?.miejsce || dane.daneOdbiorcy.miasto || 'Brak miasta',
      terminySzkolenia: dane.migawkaZrodla?.terminy ?? [],
      trenerzy: dane.migawkaZrodla?.trenerzy ?? [],
      planowanaDataWysylki: dane.dataWyslania,
      wlascicielId: dane.wysylaczId || dane.opiekunId || checklista.wlascicielId || '',
      liczbaGotowych: wymagane.length - brakujacePozycje.length,
      liczbaWymaganych: wymagane.length,
      brakujaceElementy,
      czyWyslana: Boolean(wyslanePaczki[checklista.id]),
    }]
  })
}

function pobierzZadaniaAutomatyczne() {
  const checklisty = pobierzChecklistyPaczek()
  return generujZadaniaAutomatyczne(
    pobierzSzczegolyDoChecklisty().flatMap((szczegoly) => szczegoly.grupy.filter((grupa) => Boolean(grupa.dataOd)).map((grupa) => {
      const checklista = checklisty.find((pozycja) => pozycja.daneDokumentu.szczegolyOrganizacyjneId === szczegoly.id && pozycja.daneDokumentu.grupaId === grupa.id)
      const pozycjeMaterialow = checklista?.daneDokumentu.pozycje.filter((pozycja) => /materiał|prezentac/i.test(pozycja.nazwa) && pozycja.czyWymagana && czyPozycjaJestAktywna(pozycja))
      return {
        id: szczegoly.id,
        tytul: `${szczegoly.nazwa} — ${grupa.nazwa}`,
        wlascicielId: szczegoly.opiekunId,
        data: przesunDate(grupa.dataOd, -7),
        czyMaTrenera: grupa.trenerzy.some((trener) => trener.imieNazwisko.trim()),
        czyDaneKlientaKompletne: Boolean(szczegoly.dane.nazwaKlienta.trim() || szczegoly.dane.nabywca.nazwa.trim()),
        czyMaterialyOdTreneraGotowe: pozycjeMaterialow?.every((pozycja) => pozycja.statusGotowosci === 'GOTOWE'),
      }
    })),
  )
}

function KartaZadania({ zadanie, teraz, otworz, wykonaj, zmienGodzine, odloz }: {
  zadanie: ZadaniePulpitu
  teraz: Date
  otworz: () => void
  wykonaj?: () => void
  zmienGodzine?: (godzina: string) => void
  odloz?: (data: string) => void
}) {
  const status = pobierzEtykieteStatusuZadania(zadanie, teraz)
  const czyOpoznione = status === 'Opóźnione'
  return (
    <article className={`pulpit-zadanie${czyOpoznione ? ' pulpit-zadanie--opoznione' : ''}${zadanie.status === 'WYKONANE' ? ' pulpit-zadanie--wykonane' : ''}`}>
      <button className="pulpit-zadanie__tresc" onClick={otworz} type="button">
        <span className="pulpit-zadanie__etykieta">{zadanie.czyAutomatyczne ? 'Automatyczne' : 'Ręczne'} · {zadanie.typZadania}</span>
        <strong>{zadanie.tytul}</strong>
        {zadanie.opis && <span>{zadanie.opis}</span>}
      </button>
      <div className="pulpit-zadanie__meta">
        {zadanie.godzina && <span>{zadanie.godzina}</span>}
        <span className={`pulpit-status${czyOpoznione ? ' pulpit-status--czerwony' : zadanie.status === 'WYKONANE' ? ' pulpit-status--zielony' : ''}`}>{status}</span>
        {zadanie.priorytet === 'PILNE' && zadanie.status !== 'WYKONANE' && <span className="pulpit-status pulpit-status--zolty">Pilne</span>}
      </div>
      {czyMoznaOznaczycZadanieRecznie(zadanie) && <div className="pulpit-zadanie__akcje">
        {zmienGodzine && <label>Godzina <input aria-label={`Godzina zadania ${zadanie.tytul}`} onChange={(zdarzenie) => zmienGodzine(zdarzenie.target.value)} type="time" value={zadanie.godzina ?? ''} /></label>}
        {odloz && <button onClick={() => odloz(dataTekstowa(new Date(Date.now() + 86_400_000)))} type="button">Jutro</button>}
        {odloz && <button onClick={() => odloz(dataTekstowa(new Date(Date.now() + 3 * 86_400_000)))} type="button">Za 3 dni</button>}
        {odloz && <label>Wybierz datę <input aria-label={`Odłóż zadanie ${zadanie.tytul} na datę`} onChange={(zdarzenie) => { if (zdarzenie.target.value) odloz(zdarzenie.target.value) }} type="date" /></label>}
        {wykonaj && <button className="pulpit-przycisk-glowny" onClick={wykonaj} type="button">✓ Wykonane</button>}
      </div>}
    </article>
  )
}

export default function WidokPulpitu({ otworzRekordZrodlowy, otworzPaczke }: WlasciwosciPulpitu) {
  const { zalogowanyUzytkownik, aktywniUzytkownicy } = useKontekstUzytkownika()
  const [teraz, ustawTeraz] = useState(() => new Date())
  const [data, ustawDate] = useState(() => dataTekstowa(new Date()))
  const [filtr, ustawFiltr] = useState<FiltrPulpitu>('WSZYSTKIE')
  const [stan, ustawStan] = useState(pobierzStanPulpitu)
  const [wybranyUzytkownikId, ustawWybranegoUzytkownikaId] = useState(zalogowanyUzytkownik?.id ?? '')
  const [wybraneZadanie, ustawWybraneZadanie] = useState<ZadaniePulpitu | null>(null)
  const [paczkaDoPotwierdzenia, ustawPaczkeDoPotwierdzenia] = useState<PaczkaPulpitu | null>(null)
  const [czyDodawanieZadania, ustawCzyDodawanieZadania] = useState(false)
  const [noweZadanie, ustawNoweZadanie] = useState({ tytul: '', data: dataTekstowa(new Date()), godzina: '', priorytet: 'ZWYKLE' as ZadaniePulpitu['priorytet'], szkolenieId: '' })

  useEffect(() => {
    const identyfikator = window.setInterval(() => ustawTeraz(new Date()), 60_000)
    return () => window.clearInterval(identyfikator)
  }, [])

  const czyArchitekt = czyMoznaZmienicKontekstPulpitu(zalogowanyUzytkownik?.rola)
  const zadania = useMemo(() => [...stan.zadaniaReczne, ...pobierzZadaniaAutomatyczne()].filter((zadanie) => zadanie.wlascicielId === wybranyUzytkownikId), [stan.zadaniaReczne, wybranyUzytkownikId])
  const paczki = useMemo(() => pobierzPaczki(stan.wyslanePaczki).filter((paczka) => paczka.wlascicielId === wybranyUzytkownikId), [stan.wyslanePaczki, wybranyUzytkownikId])
  const zadaniaAktywneDnia = zadania.filter((zadanie) => zadanie.status === 'OTWARTE' && czyZadanieDotyczyDnia(zadanie, data))
  const zadaniaGodzinowe = zadaniaAktywneDnia.filter((zadanie) => zadanie.godzina)
  const zadaniaBezGodziny = sortujZadaniaBezGodziny(zadaniaAktywneDnia.filter((zadanie) => !zadanie.godzina), teraz)
  const zadaniaWykonane = zadania.filter((zadanie) => zadanie.status === 'WYKONANE' && czyZadanieDotyczyDnia(zadanie, data))
  const paczkiWidoczne = sortujPaczki(paczki.filter((paczka) => czyPaczkaWidoczna(paczka, teraz)), teraz)
  const pilne = zadania.filter((zadanie) => zadanie.status === 'OTWARTE' && (zadanie.priorytet === 'PILNE' || czyZadanieOpoznione(zadanie, teraz)))
  const liczniki = obliczLicznikiPulpitu(zadania, paczki, teraz, data)
  const szkoleniaDostepne = useMemo(() => pobierzSzczegolyDoChecklisty(), [])
  const czyObserwowanyJestZalogowanym = wybranyUzytkownikId === zalogowanyUzytkownik?.id
  const postepCzasu = obliczPostepCzasuDnia(teraz)

  function odswiezStan() { ustawStan(pobierzStanPulpitu()) }
  function zmienZadanie(zadanie: ZadaniePulpitu) { zapiszZadanieReczne(zadanie); odswiezStan() }
  function oznaczWykonane(zadanie: ZadaniePulpitu) { zmienZadanie({ ...zadanie, status: 'WYKONANE', wykonano: new Date().toISOString() }) }
  function zmienGodzine(zadanie: ZadaniePulpitu, godzina: string) { zmienZadanie({ ...zadanie, godzina: godzina || undefined }) }
  function odlozZadanie(zadanie: ZadaniePulpitu, nowaData: string) { zmienZadanie({ ...zadanie, data: nowaData, odlozonoDo: nowaData }) }
  function przelaczFiltr(nowyFiltr: FiltrPulpitu) { ustawFiltr((obecny) => obecny === nowyFiltr ? 'WSZYSTKIE' : nowyFiltr) }
  function potwierdzWysylke() {
    if (!paczkaDoPotwierdzenia) return
    oznaczPaczkeJakoWyslana(paczkaDoPotwierdzenia.id)
    ustawPaczkeDoPotwierdzenia(null)
    odswiezStan()
  }
  function dodajZadanie() {
    if (!noweZadanie.tytul.trim() || !zalogowanyUzytkownik) return
    zmienZadanie({ id: utworzIdZadania(), tytul: noweZadanie.tytul.trim(), data: noweZadanie.data, godzina: noweZadanie.godzina || undefined, utworzono: new Date().toISOString(), status: 'OTWARTE', priorytet: noweZadanie.priorytet, typZrodla: 'RECZNE', typZadania: 'ZADANIE_WLASNE', wlascicielId: wybranyUzytkownikId, powiazaneSzkolenieId: noweZadanie.szkolenieId || undefined, czyAutomatyczne: false, czyTerminKrytyczny: false })
    ustawNoweZadanie({ tytul: '', data, godzina: '', priorytet: 'ZWYKLE', szkolenieId: '' })
    ustawCzyDodawanieZadania(false)
  }

  const pokazZadania = filtr !== 'PACZKI'
  const pokazPaczki = filtr === 'WSZYSTKIE' || filtr === 'PACZKI'
  const zadaniaDoPokazania = filtr === 'PILNE' ? zadaniaBezGodziny.filter((zadanie) => zadanie.priorytet === 'PILNE' || czyZadanieOpoznione(zadanie, teraz)) : filtr === 'BLOKADY' ? zadaniaBezGodziny.filter((zadanie) => zadanie.czyAutomatyczne) : zadaniaBezGodziny

  return <section className="widok pulpit" aria-label="Pulpit bieżącej pracy">
    <header className="pulpit__naglowek">
      <div><h1>Pulpit</h1><p>Centrum bieżącej pracy: zadania, blokady i nadchodzące wysyłki.</p></div>
      {czyArchitekt && <label className="pulpit__wybor-kontekstu">Kontekst użytkownika<select onChange={(zdarzenie) => ustawWybranegoUzytkownikaId(zdarzenie.target.value)} value={wybranyUzytkownikId}>{aktywniUzytkownicy.map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</option>)}</select></label>}
    </header>

    <section aria-label="Podsumowanie" className="pulpit-kafelki">
      <button className={filtr === 'DO_ZROBIENIA' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('DO_ZROBIENIA')} type="button"><strong>{liczniki.doZrobienia}</strong><span>DO ZROBIENIA</span><small>na wybrany dzień</small></button>
      <button className={filtr === 'PILNE' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('PILNE')} type="button"><strong>{liczniki.pilne}</strong><span>PILNE</span><small>{pilne.filter((zadanie) => czyZadanieOpoznione(zadanie, teraz)).length} opóźnione</small></button>
      <button className={filtr === 'PACZKI' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('PACZKI')} type="button"><strong>{liczniki.paczki}</strong><span>PACZKI</span><small>w ciągu {liczbaDniWidocznosciPaczki} dni</small></button>
      <button className={filtr === 'BLOKADY' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('BLOKADY')} type="button"><strong>{liczniki.blokady}</strong><span>BLOKADY</span><small>wymagają uwagi</small></button>
    </section>

    {pokazZadania && <section className="pulpit-sekcja" aria-labelledby="plan-dnia">
      <div className="pulpit-sekcja__naglowek"><div><h2 id="plan-dnia">Plan dnia</h2><p>{formatujDate(data)}</p></div><div className="pulpit-nawigacja-daty"><button aria-label="Poprzedni dzień" onClick={() => ustawDate(przesunDate(data, -1))} type="button">‹</button><button onClick={() => ustawDate(dataTekstowa(new Date()))} type="button">Dziś</button><button aria-label="Następny dzień" onClick={() => ustawDate(przesunDate(data, 1))} type="button">›</button><input aria-label="Wybierz datę planu" onChange={(zdarzenie) => ustawDate(zdarzenie.target.value)} type="date" value={data} /></div></div>
      <div className="pulpit-os-czasu" aria-label="Oś czasu od 07:45 do 16:00"><div className="pulpit-os-czasu__linia"><div className="pulpit-os-czasu__postep" style={{ width: `${postepCzasu}%` }} />{data === dataTekstowa(teraz) && <span className="pulpit-os-czasu__teraz" style={{ left: `${postepCzasu}%` }}>TERAZ</span>}</div><div className="pulpit-os-czasu__etykiety">{etykietyOsiCzasu.map((etykieta) => <span key={etykieta}>{etykieta}</span>)}</div><div className="pulpit-os-czasu__zadania">{zadaniaGodzinowe.map((zadanie) => <div className="pulpit-os-czasu__zadanie" key={zadanie.id} style={{ left: `${pozycjaGodzinyNaOsi(zadanie.godzina!)}%` }}><KartaZadania zadanie={zadanie} teraz={teraz} otworz={() => ustawWybraneZadanie(zadanie)} wykonaj={zadanie.czyAutomatyczne || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : () => oznaczWykonane(zadanie)} zmienGodzine={zadanie.czyAutomatyczne || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : (godzina) => zmienGodzine(zadanie, godzina)} odloz={zadanie.czyAutomatyczne || zadanie.czyTerminKrytyczny || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : (nowaData) => odlozZadanie(zadanie, nowaData)} /></div>)}</div></div>
      <div className="pulpit-podsekcja"><div className="pulpit-podsekcja__naglowek"><h3>Do wykonania dzisiaj</h3>{czyObserwowanyJestZalogowanym && <button onClick={() => ustawCzyDodawanieZadania((obecnie) => !obecnie)} type="button">+ Dodaj zadanie</button>}</div>{czyDodawanieZadania && czyObserwowanyJestZalogowanym && <form className="pulpit-formularz-zadania" onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); dodajZadanie() }}><input aria-label="Nazwa zadania" onChange={(zdarzenie) => ustawNoweZadanie({ ...noweZadanie, tytul: zdarzenie.target.value })} placeholder="Nazwa zadania" value={noweZadanie.tytul} /><input aria-label="Data zadania" onChange={(zdarzenie) => ustawNoweZadanie({ ...noweZadanie, data: zdarzenie.target.value })} type="date" value={noweZadanie.data} /><input aria-label="Godzina zadania" onChange={(zdarzenie) => ustawNoweZadanie({ ...noweZadanie, godzina: zdarzenie.target.value })} type="time" value={noweZadanie.godzina} /><select aria-label="Priorytet zadania" onChange={(zdarzenie) => ustawNoweZadanie({ ...noweZadanie, priorytet: zdarzenie.target.value as ZadaniePulpitu['priorytet'] })} value={noweZadanie.priorytet}><option value="ZWYKLE">Zwykłe</option><option value="PILNE">Pilne</option></select><select aria-label="Powiązane szkolenie" onChange={(zdarzenie) => ustawNoweZadanie({ ...noweZadanie, szkolenieId: zdarzenie.target.value })} value={noweZadanie.szkolenieId}><option value="">Bez powiązania</option>{szkoleniaDostepne.map((szczegoly) => <option key={szczegoly.id} value={szczegoly.id}>{szczegoly.nazwa}</option>)}</select><button className="pulpit-przycisk-glowny" type="submit">Zapisz</button></form>}{zadaniaDoPokazania.length ? <div className="pulpit-lista-zadan">{zadaniaDoPokazania.map((zadanie) => <KartaZadania key={zadanie.id} zadanie={zadanie} teraz={teraz} otworz={() => ustawWybraneZadanie(zadanie)} wykonaj={zadanie.czyAutomatyczne || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : () => oznaczWykonane(zadanie)} zmienGodzine={zadanie.czyAutomatyczne || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : (godzina) => zmienGodzine(zadanie, godzina)} odloz={zadanie.czyAutomatyczne || zadanie.czyTerminKrytyczny || zadanie.wlascicielId !== zalogowanyUzytkownik?.id ? undefined : (nowaData) => odlozZadanie(zadanie, nowaData)} />)}</div> : <p className="pulpit-pusty">Brak zadań bez przypisanej godziny.</p>}</div>
      {zadaniaWykonane.length > 0 && <details className="pulpit-wykonane"><summary>Wykonane ({zadaniaWykonane.length})</summary>{zadaniaWykonane.map((zadanie) => <KartaZadania key={zadanie.id} zadanie={zadanie} teraz={teraz} otworz={() => ustawWybraneZadanie(zadanie)} />)}</details>}
    </section>}

    {pokazPaczki && <section className="pulpit-sekcja" aria-labelledby="nadchodzace-paczki"><div className="pulpit-sekcja__naglowek"><div><h2 id="nadchodzace-paczki">Nadchodzące paczki</h2><p>Widoczne od 7 dni przed planowaną wysyłką.</p></div></div>{paczkiWidoczne.length ? <div className="pulpit-paczki">{paczkiWidoczne.map((paczka) => { const gotowosc = pobierzGotowoscPaczki(paczka); const opozniona = czyPaczkaOpozniona(paczka, teraz); return <article className={`pulpit-paczka${opozniona ? ' pulpit-paczka--opozniona' : ''}`} key={paczka.id}><div><span className={`pulpit-status${opozniona ? ' pulpit-status--czerwony' : gotowosc.czyGotowa ? ' pulpit-status--zielony' : ''}`}>{opozniona ? 'OPÓŹNIONA' : gotowosc.czyGotowa ? 'GOTOWA' : pobierzTerminWzglednyPaczki(paczka, teraz)}</span><h3>{paczka.nazwaSzkolenia}</h3><p>{paczka.miasto} · {paczka.terminySzkolenia.map(formatujDate).join(', ') || 'brak terminu'}</p><p>Trener: {paczka.trenerzy.join(', ') || 'brak'}</p><p>Planowana wysyłka: <strong>{formatujDate(paczka.planowanaDataWysylki)} · {pobierzTerminWzglednyPaczki(paczka, teraz)}</strong></p></div><div className="pulpit-paczka__gotowosc"><strong>{gotowosc.tekst}</strong><span>Gotowość paczki</span>{paczka.brakujaceElementy.length > 0 && <div><b>Brakuje:</b><ul>{paczka.brakujaceElementy.map((brak) => <li key={brak}>{brak}</li>)}</ul></div>}<div className="pulpit-paczka__akcje"><button onClick={() => otworzPaczke?.(paczka.id)} type="button">Otwórz checklistę</button><button className="pulpit-przycisk-glowny" onClick={() => ustawPaczkeDoPotwierdzenia(paczka)} type="button">Oznacz jako wysłaną</button></div></div></article> })}</div> : <p className="pulpit-pusty">Brak paczek w oknie wysyłki.</p>}</section>}

    {wybraneZadanie && <aside aria-label="Szczegóły zadania" className="pulpit-drawer"><button aria-label="Zamknij szczegóły zadania" className="pulpit-drawer__zamknij" onClick={() => ustawWybraneZadanie(null)} type="button">×</button><span className="pulpit-status">{pobierzEtykieteStatusuZadania(wybraneZadanie, teraz)}</span><h2>{wybraneZadanie.tytul}</h2>{wybraneZadanie.opis && <p>{wybraneZadanie.opis}</p>}<dl><div><dt>Termin</dt><dd>{formatujDate(wybraneZadanie.data)}</dd></div><div><dt>Godzina</dt><dd>{wybraneZadanie.godzina || 'Bez godziny'}</dd></div><div><dt>Źródło</dt><dd>{wybraneZadanie.czyAutomatyczne ? 'Automatyczna reguła szkolenia' : 'Ręczne zadanie'}</dd></div><div><dt>Powiązane szkolenie</dt><dd>{wybraneZadanie.powiazaneSzkolenieId || 'Brak'}</dd></div></dl>{wybraneZadanie.powiazaneSzkolenieId && <button className="pulpit-przycisk-glowny" onClick={() => otworzRekordZrodlowy?.(wybraneZadanie.powiazaneSzkolenieId)} type="button">Przejdź do rekordu źródłowego</button>}</aside>}
    {paczkaDoPotwierdzenia && <section aria-label="Potwierdzenie wysyłki" aria-modal="true" className="pulpit-modal" role="dialog"><div><h2>Potwierdź wysyłkę paczki</h2>{czyWysylkaWymagaDodatkowegoPotwierdzenia(paczkaDoPotwierdzenia) && <p>Paczka nie jest oznaczona jako w pełni gotowa. Nadal brakuje: {paczkaDoPotwierdzenia.brakujaceElementy.join(', ')}. Czy na pewno oznaczyć jako wysłaną?</p>}<div className="pulpit-modal__akcje"><button onClick={() => ustawPaczkeDoPotwierdzenia(null)} type="button">Wróć</button><button className="pulpit-przycisk-glowny" onClick={potwierdzWysylke} type="button">Potwierdzam wysyłkę</button></div></div></section>}
  </section>
}
