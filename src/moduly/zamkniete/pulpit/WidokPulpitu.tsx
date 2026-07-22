import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import { pobierzUzytkownikow } from '../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzNazweUzytkownika, pobierzNazweWyswietlanaUzytkownika, type Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { pobierzChecklistyPaczek, pobierzSzczegolyDoChecklisty } from '../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { czyPozycjaJestAktywna } from '../../dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import { etykietyOsiCzasu, pobierzStanWskaznikaCzasu, pozycjaGodzinyNaOsi } from './logika/czasDnia'
import { czyPaczkaOpozniona, czyPaczkaWidoczna, czyWysylkaWymagaDodatkowegoPotwierdzenia, liczbaDniWidocznosciPaczki, pobierzGotowoscPaczki, pobierzTerminWzglednyPaczki, sortujPaczki } from './logika/paczki'
import { generujZadaniaAutomatyczne } from './logika/zadaniaAutomatyczne'
import { czyMoznaZmienicKontekstPulpitu } from './logika/kontekstPulpitu'
import { obliczLicznikiPulpitu } from './logika/podsumowaniePulpitu'
import { obliczLiczbeAktywnychZapotrzebowanZakupowych, odmienRzeczDoZakupu, pobierzAktywneZapotrzebowaniaZakupowe, pobierzTekstLicznikaZakupow, walidujNoweZapotrzebowanieZakupowe } from './logika/zapotrzebowaniaZakupowe'
import { czyMoznaOznaczycZadanieRecznie, czyMoznaWybracZadaniodawce, czyZadanieDotyczyDnia, czyZadanieOpoznione, czyZadanieWidoczneDlaUzytkownika, pobierzEtykieteStatusuZadania, pobierzKolorZadaniodawcy, pobierzZadaniaDeadline, rozstrzygnijPrzypisanieZadania, sortujZadaniaBezGodziny, walidujPrzypomnienia } from './logika/zadania'
import type { JednostkaPrzypomnienia, PaczkaPulpitu, PrzypomnienieZadania, ZadaniePulpitu, ZapotrzebowanieZakupowe } from './modele/pulpit'
import { oznaczPaczkeJakoWyslana, pobierzStanPulpitu, usunZadanieReczne, zapiszZadanieReczne, zapiszZapotrzebowanieZakupowe } from './uslugi/magazynPulpitu'
import './pulpit.css'

type FiltrPulpitu = 'WSZYSTKIE' | 'DO_ZROBIENIA' | 'PILNE' | 'PACZKI' | 'BLOKADY'

type WlasciwosciPulpitu = {
  otworzRekordZrodlowy?: (idSzkolenia?: string) => void
  otworzPaczke?: (idPaczki: string) => void
}

type FormularzZadania = {
  tytul: string
  data: string
  godzina: string
  priorytet: ZadaniePulpitu['priorytet']
  zadaniodawcaId: string
  zadaniobiorcaId: string
  szkolenieId: string
  przypomnienia: PrzypomnienieZadania[]
}

function dataTekstowa(data: Date) {
  const rok = data.getFullYear()
  const miesiac = String(data.getMonth() + 1).padStart(2, '0')
  const dzien = String(data.getDate()).padStart(2, '0')
  return rok + '-' + miesiac + '-' + dzien
}

function przesunDate(data: string, liczbaDni: number) {
  const wynik = new Date(data + 'T00:00:00')
  wynik.setDate(wynik.getDate() + liczbaDni)
  return dataTekstowa(wynik)
}

function formatujDate(data: string) {
  if (!data) return 'Brak daty'
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(data + 'T00:00:00'))
}

function utworzIdZadania() {
  return 'zadanie-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

function utworzIdPrzypomnienia() {
  return 'przypomnienie-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
}

function pustyFormularz(data: string, uzytkownikId: string): FormularzZadania {
  return {
    tytul: '',
    data,
    godzina: '',
    priorytet: 'ZWYKLE',
    zadaniodawcaId: uzytkownikId,
    zadaniobiorcaId: '',
    szkolenieId: '',
    przypomnienia: [],
  }
}

function pobierzNazweOsoby(uzytkownicy: Uzytkownik[], uzytkownikId: string) {
  const uzytkownik = uzytkownicy.find((osoba) => osoba.id === uzytkownikId)
  return uzytkownik ? pobierzNazweUzytkownika(uzytkownik) || pobierzNazweWyswietlanaUzytkownika(uzytkownik) : 'Nieustalony użytkownik'
}

function etykietaPriorytetu(priorytet: ZadaniePulpitu['priorytet']) {
  if (priorytet === 'ASAP') return 'ASAP'
  return priorytet === 'PILNE' ? 'Pilne' : 'Zwykłe'
}

function etykietaPrzypomnienia(przypomnienie: PrzypomnienieZadania) {
  const jednostki: Record<JednostkaPrzypomnienia, string> = { MINUTY: 'min przed', GODZINY: 'godz. przed', DNI: 'dni przed' }
  return przypomnienie.wartosc + ' ' + jednostki[przypomnienie.jednostka]
}

function pobierzPaczki(wyslanePaczki: Record<string, string>): PaczkaPulpitu[] {
  return pobierzChecklistyPaczek().flatMap((checklista) => {
    const dane = checklista.daneDokumentu
    if (!dane.dataWyslania) return []
    const wymagane = dane.pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && !pozycja.czyOnline && czyPozycjaJestAktywna(pozycja))
    const brakujacePozycje = wymagane.filter((pozycja) => pozycja.statusGotowosci !== 'GOTOWE').map((pozycja) => pozycja.nazwa)
    const brakDanychOdbiorcy = [dane.daneOdbiorcy.imieNazwisko || dane.daneOdbiorcy.nazwaFirmy, dane.daneOdbiorcy.ulica, dane.daneOdbiorcy.nrBudynku, dane.daneOdbiorcy.kodPocztowy, dane.daneOdbiorcy.miasto].some((wartosc) => !wartosc.trim())
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
      brakujaceElementy: brakDanychOdbiorcy ? [...brakujacePozycje, 'dane odbiorcy'] : brakujacePozycje,
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
        tytul: szczegoly.nazwa + ' \u2014 ' + grupa.nazwa,
        wlascicielId: szczegoly.opiekunId,
        data: przesunDate(grupa.dataOd, -7),
        czyMaTrenera: grupa.trenerzy.some((trener) => trener.imieNazwisko.trim()),
        czyDaneKlientaKompletne: Boolean(szczegoly.dane.nazwaKlienta.trim() || szczegoly.dane.nabywca.nazwa.trim()),
        czyMaterialyOdTreneraGotowe: pozycjeMaterialow?.every((pozycja) => pozycja.statusGotowosci === 'GOTOWE'),
      }
    })),
  )
}

function KartaZadania({ zadanie, teraz, uzytkownicy, otworz, wykonaj, zmienGodzine, odloz }: {
  zadanie: ZadaniePulpitu
  teraz: Date
  uzytkownicy: Uzytkownik[]
  otworz: () => void
  wykonaj?: () => void
  zmienGodzine?: (godzina: string) => void
  odloz?: (data: string) => void
}) {
  const status = pobierzEtykieteStatusuZadania(zadanie, teraz)
  const czyOpoznione = status === 'Opóźnione'
  return <article className={'pulpit-zadanie' + (czyOpoznione ? ' pulpit-zadanie--opoznione' : '') + (zadanie.status === 'WYKONANE' ? ' pulpit-zadanie--wykonane' : '')}>
    <button className="pulpit-zadanie__tresc" onClick={otworz} type="button">
      <span className="pulpit-zadanie__etykieta">{zadanie.czyAutomatyczne ? 'Automatyczne' : 'Ręczne'} &middot; {zadanie.typZadania}</span>
      <strong>{zadanie.tytul}</strong>
      {zadanie.opis && <span>{zadanie.opis}</span>}
      <small>Zadaniodawca: {pobierzNazweOsoby(uzytkownicy, zadanie.zadaniodawcaId)}</small>
      <small>Zadaniobiorca: {pobierzNazweOsoby(uzytkownicy, zadanie.zadaniobiorcaId)}</small>
    </button>
    <div className="pulpit-zadanie__meta">
      {zadanie.godzina && <span>{zadanie.godzina}</span>}
      <span className={'pulpit-status' + (czyOpoznione ? ' pulpit-status--czerwony' : zadanie.status === 'WYKONANE' ? ' pulpit-status--zielony' : '')}>{status}</span>
      {zadanie.priorytet !== 'ZWYKLE' && zadanie.status !== 'WYKONANE' && <span className={'pulpit-status ' + (zadanie.priorytet === 'ASAP' ? 'pulpit-status--asap' : 'pulpit-status--zolty')}>{zadanie.priorytet === 'ASAP' ? '\u{1F525} ASAP' : 'Pilne'}</span>}
    </div>
    {czyMoznaOznaczycZadanieRecznie(zadanie) && <div className="pulpit-zadanie__akcje">
      {zmienGodzine && <label htmlFor={'godzina-' + zadanie.id}>Godzina<input id={'godzina-' + zadanie.id} onChange={(zdarzenie) => zmienGodzine(zdarzenie.target.value)} type="time" value={zadanie.godzina ?? ''} /></label>}
      {odloz && <button onClick={() => odloz(dataTekstowa(new Date(Date.now() + 86_400_000)))} type="button">Jutro</button>}
      {odloz && <button onClick={() => odloz(dataTekstowa(new Date(Date.now() + 3 * 86_400_000)))} type="button">Za 3 dni</button>}
      {wykonaj && <button className="pulpit-przycisk-glowny" onClick={wykonaj} type="button">{'\u2713'} Wykonane</button>}
    </div>}
  </article>
}

function MarkerDeadline({ zadanie, uzytkownicy, otworz }: { zadanie: ZadaniePulpitu; uzytkownicy: Uzytkownik[]; otworz: () => void }) {
  const zadaniodawca = uzytkownicy.find((uzytkownik) => uzytkownik.id === zadanie.zadaniodawcaId)
  const kolor = pobierzKolorZadaniodawcy(zadanie.zadaniodawcaId, zadaniodawca?.kolorProfilu)
  const identyfikatorTooltipa = 'deadline-tooltip-' + zadanie.id
  const pozycja = pozycjaGodzinyNaOsi(zadanie.godzina!)
  const klasaKrawedzi = pozycja <= 5 ? ' pulpit-deadline--lewo' : pozycja >= 95 ? ' pulpit-deadline--prawo' : ''
  return <div className={'pulpit-deadline' + klasaKrawedzi} style={{ left: pozycja + '%', '--kolor-zadaniodawcy': kolor } as CSSProperties}>
    <button aria-describedby={identyfikatorTooltipa} aria-label={'Deadline: ' + zadanie.tytul + ', ' + zadanie.godzina} className="pulpit-deadline__przycisk" onClick={otworz} type="button">
      {zadanie.priorytet === 'ASAP' && <span aria-hidden="true" className="pulpit-deadline__plomien">{'\u{1F525}'}</span>}
      <span aria-hidden="true" className="pulpit-deadline__romb"><span /></span>
      <span className="pulpit-deadline__etykieta">DEADLINE: {zadanie.tytul}</span>
    </button>
    <span className="pulpit-deadline__tooltip" id={identyfikatorTooltipa} role="tooltip">
      <strong>{zadanie.tytul}</strong>
      <span>Deadline: {formatujDate(zadanie.data)}, {zadanie.godzina}</span>
      <span>Priorytet: {etykietaPriorytetu(zadanie.priorytet)}</span>
      <span>Zadaniodawca: {pobierzNazweOsoby(uzytkownicy, zadanie.zadaniodawcaId)}</span>
      <span>Zadaniobiorca: {pobierzNazweOsoby(uzytkownicy, zadanie.zadaniobiorcaId)}</span>
    </span>
  </div>
}

function FormularzDodawaniaZadania({ formularz, ustawFormularz, uzytkownicy, szkolenia, czyWyborZadaniodawcy, blad, zapisz }: {
  formularz: FormularzZadania
  ustawFormularz: (formularz: FormularzZadania) => void
  uzytkownicy: Uzytkownik[]
  szkolenia: Array<{ id: string; nazwa: string }>
  czyWyborZadaniodawcy: boolean
  blad: string
  zapisz: () => void
}) {
  function dodajPrzypomnienie() {
    const propozycje: Array<Omit<PrzypomnienieZadania, 'id'>> = [
      { wartosc: 15, jednostka: 'MINUTY' },
      { wartosc: 1, jednostka: 'GODZINY' },
      { wartosc: 1, jednostka: 'DNI' },
    ]
    const propozycja = propozycje.find((kandydat) => !formularz.przypomnienia.some((obecne) => obecne.wartosc === kandydat.wartosc && obecne.jednostka === kandydat.jednostka)) ?? { wartosc: formularz.przypomnienia.length + 2, jednostka: 'GODZINY' as const }
    ustawFormularz({ ...formularz, przypomnienia: [...formularz.przypomnienia, { id: utworzIdPrzypomnienia(), ...propozycja }] })
  }

  function zmienPrzypomnienie(id: string, zmiana: Partial<PrzypomnienieZadania>) {
    ustawFormularz({ ...formularz, przypomnienia: formularz.przypomnienia.map((przypomnienie) => przypomnienie.id === id ? { ...przypomnienie, ...zmiana } : przypomnienie) })
  }

  return <form className="pulpit-formularz-zadania" onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); zapisz() }}>
    <label className="pulpit-formularz-zadania__nazwa" htmlFor="pulpit-nazwa-zadania">Nazwa zadania<input id="pulpit-nazwa-zadania" onChange={(zdarzenie) => ustawFormularz({ ...formularz, tytul: zdarzenie.target.value })} placeholder="Np. wysłać dokumenty" value={formularz.tytul} /></label>
    <label htmlFor="pulpit-termin-zadania">Termin wykonania<input id="pulpit-termin-zadania" onChange={(zdarzenie) => ustawFormularz({ ...formularz, data: zdarzenie.target.value })} type="date" value={formularz.data} /></label>
    <label htmlFor="pulpit-godzina-zadania">Godzina wykonania<input id="pulpit-godzina-zadania" onChange={(zdarzenie) => ustawFormularz({ ...formularz, godzina: zdarzenie.target.value })} type="time" value={formularz.godzina} /></label>
    <label htmlFor="pulpit-priorytet-zadania">Priorytet<select id="pulpit-priorytet-zadania" onChange={(zdarzenie) => ustawFormularz({ ...formularz, priorytet: zdarzenie.target.value as ZadaniePulpitu['priorytet'] })} value={formularz.priorytet}><option value="ZWYKLE">Zwykłe</option><option value="PILNE">Pilne</option><option value="ASAP">ASAP</option></select></label>
    {czyWyborZadaniodawcy && <label htmlFor="pulpit-zadaniodawca">Zadaniodawca<select id="pulpit-zadaniodawca" onChange={(zdarzenie) => ustawFormularz({ ...formularz, zadaniodawcaId: zdarzenie.target.value })} value={formularz.zadaniodawcaId}>{uzytkownicy.map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweUzytkownika(uzytkownik)}</option>)}</select></label>}
    <label htmlFor="pulpit-zadaniobiorca">Zadaniobiorca<select id="pulpit-zadaniobiorca" onChange={(zdarzenie) => ustawFormularz({ ...formularz, zadaniobiorcaId: zdarzenie.target.value })} value={formularz.zadaniobiorcaId}><option value="">Ja &mdash; {pobierzNazweOsoby(uzytkownicy, formularz.zadaniodawcaId)}</option>{uzytkownicy.filter((uzytkownik) => uzytkownik.id !== formularz.zadaniodawcaId).map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweUzytkownika(uzytkownik)}</option>)}</select></label>
    <label htmlFor="pulpit-powiazanie-zadania">Powiązanie<select id="pulpit-powiazanie-zadania" onChange={(zdarzenie) => ustawFormularz({ ...formularz, szkolenieId: zdarzenie.target.value })} value={formularz.szkolenieId}><option value="">Bez powiązania</option>{szkolenia.map((szczegoly) => <option key={szczegoly.id} value={szczegoly.id}>{szczegoly.nazwa}</option>)}</select></label>
    <fieldset className="pulpit-przypomnienia">
      <legend>Przypomnienia</legend>
      {formularz.przypomnienia.map((przypomnienie, indeks) => <div className="pulpit-przypomnienie" key={przypomnienie.id}>
        <label htmlFor={'pulpit-przypomnienie-wartosc-' + indeks}>Wartość<input id={'pulpit-przypomnienie-wartosc-' + indeks} min="1" onChange={(zdarzenie) => zmienPrzypomnienie(przypomnienie.id, { wartosc: Number(zdarzenie.target.value) })} type="number" value={przypomnienie.wartosc} /></label>
        <label htmlFor={'pulpit-przypomnienie-jednostka-' + indeks}>Jednostka<select id={'pulpit-przypomnienie-jednostka-' + indeks} onChange={(zdarzenie) => zmienPrzypomnienie(przypomnienie.id, { jednostka: zdarzenie.target.value as JednostkaPrzypomnienia })} value={przypomnienie.jednostka}><option value="MINUTY">minut przed</option><option value="GODZINY">godzin przed</option><option value="DNI">dni przed</option></select></label>
        <button onClick={() => ustawFormularz({ ...formularz, przypomnienia: formularz.przypomnienia.filter((obecne) => obecne.id !== przypomnienie.id) })} type="button">Usuń</button>
      </div>)}
      <button onClick={dodajPrzypomnienie} type="button">+ Dodaj przypomnienie</button>
    </fieldset>
    {blad && <p className="pulpit-formularz-zadania__blad" role="alert">{blad}</p>}
    <button className="pulpit-przycisk-glowny pulpit-formularz-zadania__zapisz" type="submit">Zapisz</button>
  </form>
}

type FormularzZakupu = {
  nazwa: string
  ilosc: string
  uwagi: string
}

function pustyFormularzZakupu(): FormularzZakupu {
  return { nazwa: '', ilosc: '1', uwagi: '' }
}

function utworzIdZapotrzebowaniaZakupowego() {
  return 'zapotrzebowanie-zakupowe-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

function formatujDateGodzine(data: string) {
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(data))
}

function IkonaZakupow() {
  return <svg aria-hidden="true" className="pulpit-kafelek__ikona" fill="none" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><circle cx="10" cy="19" fill="currentColor" r="1.3" /><circle cx="17" cy="19" fill="currentColor" r="1.3" /></svg>
}

function FormularzZakupu({ formularz, ustawFormularz, blad, zapisz, anuluj }: { formularz: FormularzZakupu; ustawFormularz: (formularz: FormularzZakupu) => void; blad: string; zapisz: () => void; anuluj: () => void }) {
  return <form className="pulpit-formularz-zakupu" onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); zapisz() }}>
    <label htmlFor="pulpit-zakup-nazwa">Co jest potrzebne?<input aria-invalid={Boolean(blad)} id="pulpit-zakup-nazwa" onChange={(zdarzenie) => ustawFormularz({ ...formularz, nazwa: zdarzenie.target.value })} value={formularz.nazwa} /></label>
    <label htmlFor="pulpit-zakup-ilosc">{'Ilo\u{15b}\u{107}'}<input id="pulpit-zakup-ilosc" min="0.000001" onChange={(zdarzenie) => ustawFormularz({ ...formularz, ilosc: zdarzenie.target.value })} required step="any" type="number" value={formularz.ilosc} /></label>
    <label htmlFor="pulpit-zakup-uwagi">Uwagi<textarea id="pulpit-zakup-uwagi" onChange={(zdarzenie) => ustawFormularz({ ...formularz, uwagi: zdarzenie.target.value })} value={formularz.uwagi} /></label>
    {blad && <p className="pulpit-formularz-zakupu__blad" role="alert">{blad}</p>}
    <div className="pulpit-modal__akcje"><button onClick={anuluj} type="button">Anuluj</button><button className="pulpit-przycisk-glowny" type="submit">{'Zg\u{142}o\u{15b}'}</button></div>
  </form>
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
  const [czyWykazZakupowOtwarty, ustawCzyWykazZakupowOtwarty] = useState(false)
  const [czyDodawanieZakupu, ustawCzyDodawanieZakupu] = useState(false)
  const [bladFormularza, ustawBladFormularza] = useState('')
  const [bladFormularzaZakupu, ustawBladFormularzaZakupu] = useState('')
  const [noweZadanie, ustawNoweZadanie] = useState(() => pustyFormularz(dataTekstowa(new Date()), zalogowanyUzytkownik?.id ?? ''))
  const [nowyZakup, ustawNowyZakup] = useState<FormularzZakupu>(pustyFormularzZakupu)
  const uzytkownicy = pobierzUzytkownikow()
  const szkoleniaDostepne = useMemo(() => pobierzSzczegolyDoChecklisty().map((szczegoly) => ({ id: szczegoly.id, nazwa: szczegoly.nazwa })), [])

  useEffect(() => {
    const identyfikator = window.setInterval(() => ustawTeraz(new Date()), 60_000)
    return () => window.clearInterval(identyfikator)
  }, [])

  const czyArchitekt = czyMoznaZmienicKontekstPulpitu(zalogowanyUzytkownik?.rola)
  const czyWyborZadaniodawcy = czyMoznaWybracZadaniodawce(zalogowanyUzytkownik?.rola)
  const zadania = useMemo(() => [...stan.zadaniaReczne, ...pobierzZadaniaAutomatyczne()].filter((zadanie) => czyZadanieWidoczneDlaUzytkownika(zadanie, wybranyUzytkownikId)), [stan.zadaniaReczne, wybranyUzytkownikId])
  const paczki = useMemo(() => pobierzPaczki(stan.wyslanePaczki).filter((paczka) => paczka.wlascicielId === wybranyUzytkownikId), [stan.wyslanePaczki, wybranyUzytkownikId])
  const zadaniaAktywneDnia = zadania.filter((zadanie) => zadanie.status === 'OTWARTE' && czyZadanieDotyczyDnia(zadanie, data))
  const zadaniaGodzinowe = pobierzZadaniaDeadline(zadaniaAktywneDnia, data, teraz)
  const zadaniaBezGodziny = sortujZadaniaBezGodziny(zadaniaAktywneDnia.filter((zadanie) => !zadanie.godzina), teraz)
  const zadaniaWykonane = zadania.filter((zadanie) => zadanie.status === 'WYKONANE' && czyZadanieDotyczyDnia(zadanie, data))
  const paczkiWidoczne = sortujPaczki(paczki.filter((paczka) => czyPaczkaWidoczna(paczka, teraz)), teraz)
  const pilne = zadania.filter((zadanie) => zadanie.status === 'OTWARTE' && (zadanie.priorytet === 'PILNE' || zadanie.priorytet === 'ASAP' || czyZadanieOpoznione(zadanie, teraz)))
  const liczniki = obliczLicznikiPulpitu(zadania, paczki, teraz, data)
  const aktywneZapotrzebowaniaZakupowe = useMemo(() => pobierzAktywneZapotrzebowaniaZakupowe(stan.zapotrzebowaniaZakupowe), [stan.zapotrzebowaniaZakupowe])
  const liczbaAktywnychZapotrzebowanZakupowych = obliczLiczbeAktywnychZapotrzebowanZakupowych(stan.zapotrzebowaniaZakupowe)
  const czyObserwowanyJestZalogowanym = wybranyUzytkownikId === zalogowanyUzytkownik?.id
  const wskaznikCzasu = pobierzStanWskaznikaCzasu(teraz)

  function odswiezStan() { ustawStan(pobierzStanPulpitu()) }
  function zmienZadanie(zadanie: ZadaniePulpitu) { zapiszZadanieReczne(zadanie); ustawWybraneZadanie((obecne) => obecne?.id === zadanie.id ? zadanie : obecne); odswiezStan() }
  function oznaczWykonane(zadanie: ZadaniePulpitu) { zmienZadanie({ ...zadanie, status: 'WYKONANE', wykonano: new Date().toISOString() }) }
  function zmienGodzine(zadanie: ZadaniePulpitu, godzina: string) { zmienZadanie({ ...zadanie, godzina: godzina || undefined }) }
  function odlozZadanie(zadanie: ZadaniePulpitu, nowaData: string) { zmienZadanie({ ...zadanie, data: nowaData, odlozonoDo: nowaData }) }
  function przelaczFiltr(nowyFiltr: FiltrPulpitu) { ustawFiltr((obecny) => obecny === nowyFiltr ? 'WSZYSTKIE' : nowyFiltr) }
  function otworzDodawanie() {
    ustawNoweZadanie(pustyFormularz(data, zalogowanyUzytkownik?.id ?? ''))
    ustawBladFormularza('')
    ustawCzyDodawanieZadania((obecnie) => !obecnie)
  }
  function potwierdzWysylke() {
    if (!paczkaDoPotwierdzenia) return
    oznaczPaczkeJakoWyslana(paczkaDoPotwierdzenia.id)
    ustawPaczkeDoPotwierdzenia(null)
    odswiezStan()
  }
  function dodajZadanie() {
    if (!noweZadanie.tytul.trim() || !zalogowanyUzytkownik) {
      ustawBladFormularza('Nazwa zadania jest wymagana.')
      return
    }
    const blad = walidujPrzypomnienia(noweZadanie.przypomnienia)
    if (blad) {
      ustawBladFormularza(blad)
      return
    }
    const wybranyZadaniodawcaId = aktywniUzytkownicy.some((uzytkownik) => uzytkownik.id === noweZadanie.zadaniodawcaId) ? noweZadanie.zadaniodawcaId : ''
    const wybranyZadaniobiorcaId = aktywniUzytkownicy.some((uzytkownik) => uzytkownik.id === noweZadanie.zadaniobiorcaId) ? noweZadanie.zadaniobiorcaId : ''
    const przypisanie = rozstrzygnijPrzypisanieZadania(zalogowanyUzytkownik.id, zalogowanyUzytkownik.rola, wybranyZadaniodawcaId, wybranyZadaniobiorcaId)
    zmienZadanie({
      id: utworzIdZadania(),
      tytul: noweZadanie.tytul.trim(),
      data: noweZadanie.data,
      godzina: noweZadanie.godzina || undefined,
      utworzono: new Date().toISOString(),
      status: 'OTWARTE',
      priorytet: noweZadanie.priorytet,
      typZrodla: 'RECZNE',
      typZadania: 'ZADANIE_WLASNE',
      wlascicielId: przypisanie.zadaniobiorcaId,
      ...przypisanie,
      przypomnienia: noweZadanie.przypomnienia,
      powiazaneSzkolenieId: noweZadanie.szkolenieId || undefined,
      czyAutomatyczne: false,
      czyTerminKrytyczny: false,
    })
    ustawNoweZadanie(pustyFormularz(data, zalogowanyUzytkownik.id))
    ustawBladFormularza('')
    ustawCzyDodawanieZadania(false)
  }

  function otworzDodawanieZakupu() {
    ustawNowyZakup(pustyFormularzZakupu())
    ustawBladFormularzaZakupu('')
    ustawCzyDodawanieZakupu(true)
  }
  function dodajZapotrzebowanieZakupowe() {
    if (!zalogowanyUzytkownik) return
    const ilosc = Number(nowyZakup.ilosc)
    const blad = walidujNoweZapotrzebowanieZakupowe(nowyZakup.nazwa, ilosc)
    if (blad) {
      ustawBladFormularzaZakupu(blad)
      return
    }
    zapiszZapotrzebowanieZakupowe({
      id: utworzIdZapotrzebowaniaZakupowego(),
      nazwa: nowyZakup.nazwa.trim(),
      ilosc,
      status: 'ZGLOSZONE',
      uwagi: nowyZakup.uwagi.trim() || undefined,
      utworzonePrzezId: zalogowanyUzytkownik.id,
      utworzonoAt: new Date().toISOString(),
    })
    ustawCzyDodawanieZakupu(false)
    ustawNowyZakup(pustyFormularzZakupu())
    ustawBladFormularzaZakupu('')
    odswiezStan()
  }
  function zmienStatusZapotrzebowaniaZakupowego(zapotrzebowanie: ZapotrzebowanieZakupowe, status: ZapotrzebowanieZakupowe['status']) {
    zapiszZapotrzebowanieZakupowe({ ...zapotrzebowanie, status })
    odswiezStan()
  }
  const pokazZadania = filtr !== 'PACZKI'
  const pokazPaczki = filtr === 'WSZYSTKIE' || filtr === 'PACZKI'
  const zadaniaDoPokazania = filtr === 'PILNE' ? zadaniaBezGodziny.filter((zadanie) => zadanie.priorytet === 'PILNE' || zadanie.priorytet === 'ASAP' || czyZadanieOpoznione(zadanie, teraz)) : filtr === 'BLOKADY' ? zadaniaBezGodziny.filter((zadanie) => zadanie.czyAutomatyczne) : zadaniaBezGodziny
  const czyMoznaModyfikowacWybrane = Boolean(wybraneZadanie && !wybraneZadanie.czyAutomatyczne && wybraneZadanie.zadaniobiorcaId === zalogowanyUzytkownik?.id)
  const czyMoznaUsunacWybrane = Boolean(wybraneZadanie && !wybraneZadanie.czyAutomatyczne && wybraneZadanie.zadaniodawcaId === zalogowanyUzytkownik?.id)

  return <section className="widok pulpit" aria-label="Pulpit bieżącej pracy">
    <header className="pulpit__naglowek">
      <div><h1>Pulpit</h1><p>Centrum bieżącej pracy: zadania, blokady i nadchodzące wysyłki.</p></div>
      {czyArchitekt && <label className="pulpit__wybor-kontekstu" htmlFor="pulpit-kontekst-uzytkownika">Kontekst użytkownika<select id="pulpit-kontekst-uzytkownika" onChange={(zdarzenie) => ustawWybranegoUzytkownikaId(zdarzenie.target.value)} value={wybranyUzytkownikId}>{aktywniUzytkownicy.map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</option>)}</select></label>}
    </header>

    <section aria-label="Podsumowanie" className="pulpit-kafelki">
      <button className={filtr === 'DO_ZROBIENIA' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('DO_ZROBIENIA')} type="button"><strong>{liczniki.doZrobienia}</strong><span>DO ZROBIENIA</span><small>na wybrany dzień</small></button>
      <button className={filtr === 'PILNE' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('PILNE')} type="button"><strong>{liczniki.pilne}</strong><span>PILNE</span><small>{pilne.filter((zadanie) => czyZadanieOpoznione(zadanie, teraz)).length} opóźnione</small></button>
      <button className={filtr === 'PACZKI' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('PACZKI')} type="button"><strong>{liczniki.paczki}</strong><span>PACZKI</span><small>w ciągu {liczbaDniWidocznosciPaczki} dni</small></button>
      <button className={filtr === 'BLOKADY' ? 'pulpit-kafelek pulpit-kafelek--aktywny' : 'pulpit-kafelek'} onClick={() => przelaczFiltr('BLOKADY')} type="button"><strong>{liczniki.blokady}</strong><span>BLOKADY</span><small>wymagają uwagi</small></button>
      <button aria-label={'Zakupy: ' + liczbaAktywnychZapotrzebowanZakupowych + ' ' + odmienRzeczDoZakupu(liczbaAktywnychZapotrzebowanZakupowych)} className="pulpit-kafelek pulpit-kafelek--zakupy" onClick={() => ustawCzyWykazZakupowOtwarty(true)} type="button"><span className="pulpit-kafelek__naglowek"><IkonaZakupow />ZAKUPY</span><strong>{pobierzTekstLicznikaZakupow(liczbaAktywnychZapotrzebowanZakupowych)}</strong><small>{odmienRzeczDoZakupu(liczbaAktywnychZapotrzebowanZakupowych)}</small><em>{'+ Zg\u{142}o\u{15b} zakup'}</em></button>
    </section>

    {pokazZadania && <section className="pulpit-sekcja" aria-labelledby="plan-dnia">
      <div className="pulpit-sekcja__naglowek pulpit-sekcja__naglowek--plan">
        <div><h2 id="plan-dnia">Plan dnia</h2><p>{formatujDate(data)}</p></div>
        <div className="pulpit-nawigacja-daty">
          <button className="pulpit-nawigacja-daty__strzalka" aria-label="Poprzedni dzień" onClick={() => ustawDate(przesunDate(data, -1))} type="button">&lsaquo;</button>
          <button className="pulpit-nawigacja-daty__dzisiaj" onClick={() => ustawDate(dataTekstowa(new Date()))} type="button">Dzisiaj</button>
          <button className="pulpit-nawigacja-daty__strzalka" aria-label="Następny dzień" onClick={() => ustawDate(przesunDate(data, 1))} type="button">&rsaquo;</button>
          <input aria-label="Wybierz datę planu" onChange={(zdarzenie) => ustawDate(zdarzenie.target.value)} type="date" value={data} />
        </div>
      </div>
      <div className="pulpit-os-czasu" aria-label="Oś czasu od 07:45 do 16:00">
        <div className="pulpit-os-czasu__linia">
          <div className="pulpit-os-czasu__postep" style={{ width: wskaznikCzasu.pozycja + '%' }} />
          {data === dataTekstowa(teraz) && <div className="pulpit-os-czasu__wskaznik" style={{ left: wskaznikCzasu.pozycja + '%' }}>
            <span className={'pulpit-os-czasu__etykieta-teraz pulpit-os-czasu__etykieta-teraz--' + wskaznikCzasu.wyrownanieEtykiety.toLocaleLowerCase('pl')}>{wskaznikCzasu.etykieta}</span>
          </div>}
        </div>
        <div className="pulpit-os-czasu__etykiety">{etykietyOsiCzasu.map((etykieta) => <span key={etykieta}>{etykieta}</span>)}</div>
        <div className="pulpit-os-czasu__zadania">{zadaniaGodzinowe.map((zadanie) => <MarkerDeadline key={zadanie.id} otworz={() => ustawWybraneZadanie(zadanie)} uzytkownicy={uzytkownicy} zadanie={zadanie} />)}</div>
      </div>

      <div className="pulpit-podsekcja">
        <div className="pulpit-podsekcja__naglowek"><h3>Do wykonania dzisiaj</h3>{czyObserwowanyJestZalogowanym && <button onClick={otworzDodawanie} type="button">+ Dodaj zadanie</button>}</div>
        {czyDodawanieZadania && czyObserwowanyJestZalogowanym && <FormularzDodawaniaZadania blad={bladFormularza} czyWyborZadaniodawcy={czyWyborZadaniodawcy} formularz={noweZadanie} szkolenia={szkoleniaDostepne} ustawFormularz={ustawNoweZadanie} uzytkownicy={aktywniUzytkownicy} zapisz={dodajZadanie} />}
        {zadaniaDoPokazania.length ? <div className="pulpit-lista-zadan">{zadaniaDoPokazania.map((zadanie) => {
          const czyWykonawca = zadanie.zadaniobiorcaId === zalogowanyUzytkownik?.id
          return <KartaZadania key={zadanie.id} zadanie={zadanie} teraz={teraz} uzytkownicy={uzytkownicy} otworz={() => ustawWybraneZadanie(zadanie)} wykonaj={zadanie.czyAutomatyczne || !czyWykonawca ? undefined : () => oznaczWykonane(zadanie)} zmienGodzine={zadanie.czyAutomatyczne || !czyWykonawca ? undefined : (godzina) => zmienGodzine(zadanie, godzina)} odloz={zadanie.czyAutomatyczne || zadanie.czyTerminKrytyczny || !czyWykonawca ? undefined : (nowaData) => odlozZadanie(zadanie, nowaData)} />
        })}</div> : <p className="pulpit-pusty">Brak zadań bez przypisanej godziny.</p>}
      </div>
      {zadaniaWykonane.length > 0 && <details className="pulpit-wykonane"><summary>Wykonane ({zadaniaWykonane.length})</summary>{zadaniaWykonane.map((zadanie) => <KartaZadania key={zadanie.id} zadanie={zadanie} teraz={teraz} uzytkownicy={uzytkownicy} otworz={() => ustawWybraneZadanie(zadanie)} />)}</details>}
    </section>}

    {pokazPaczki && <section className="pulpit-sekcja" aria-labelledby="nadchodzace-paczki">
      <div className="pulpit-sekcja__naglowek"><div><h2 id="nadchodzace-paczki">Nadchodzące paczki</h2><p>Widoczne od 7 dni przed planowaną wysyłką.</p></div></div>
      {paczkiWidoczne.length ? <div className="pulpit-paczki">{paczkiWidoczne.map((paczka) => {
        const gotowosc = pobierzGotowoscPaczki(paczka)
        const opozniona = czyPaczkaOpozniona(paczka, teraz)
        return <article className={'pulpit-paczka' + (opozniona ? ' pulpit-paczka--opozniona' : '')} key={paczka.id}>
          <div><span className={'pulpit-status' + (opozniona ? ' pulpit-status--czerwony' : gotowosc.czyGotowa ? ' pulpit-status--zielony' : '')}>{opozniona ? 'OPÓŹNIONA' : gotowosc.czyGotowa ? 'GOTOWA' : pobierzTerminWzglednyPaczki(paczka, teraz)}</span><h3>{paczka.nazwaSzkolenia}</h3><p>{paczka.miasto} &middot; {paczka.terminySzkolenia.map(formatujDate).join(', ') || 'brak terminu'}</p><p>Trener: {paczka.trenerzy.join(', ') || 'brak'}</p><p>Planowana wysyłka: <strong>{formatujDate(paczka.planowanaDataWysylki)} &middot; {pobierzTerminWzglednyPaczki(paczka, teraz)}</strong></p></div>
          <div className="pulpit-paczka__gotowosc"><strong>{gotowosc.tekst}</strong><span>Gotowość paczki</span>{paczka.brakujaceElementy.length > 0 && <div><b>Brakuje:</b><ul>{paczka.brakujaceElementy.map((brak) => <li key={brak}>{brak}</li>)}</ul></div>}<div className="pulpit-paczka__akcje"><button onClick={() => otworzPaczke?.(paczka.id)} type="button">Otwórz checklistę</button><button className="pulpit-przycisk-glowny" onClick={() => ustawPaczkeDoPotwierdzenia(paczka)} type="button">Oznacz jako wysłaną</button></div></div>
        </article>
      })}</div> : <p className="pulpit-pusty">Brak paczek w oknie wysyłki.</p>}
    </section>}

    {czyWykazZakupowOtwarty && <aside aria-label="Aktualne zapotrzebowania zakupowe" className="pulpit-drawer pulpit-drawer--zakupy">
      <button aria-label={'Zamknij wykaz zakup\u{f3}w'} className="pulpit-drawer__zamknij" onClick={() => ustawCzyWykazZakupowOtwarty(false)} type="button">x</button>
      <div className="pulpit-drawer__naglowek"><div><h2>Zakupy</h2><p>{'Aktywne zapotrzebowania ca\u{142}ej organizacji.'}</p></div><button className="pulpit-przycisk-glowny" onClick={otworzDodawanieZakupu} type="button">{'+ Zg\u{142}o\u{15b} zakup'}</button></div>
      {aktywneZapotrzebowaniaZakupowe.length ? <div className="pulpit-zapotrzebowania">{aktywneZapotrzebowaniaZakupowe.map((zapotrzebowanie) => <article className="pulpit-zapotrzebowanie" key={zapotrzebowanie.id}>
        <span className="pulpit-status">{zapotrzebowanie.status}</span>
        <h3>{zapotrzebowanie.nazwa}</h3>
        <p>{'Ilo\u{15b}\u{107}'}: {zapotrzebowanie.ilosc}</p>
        <p>{'Zg\u{142}osi\u{142}'}: {pobierzNazweOsoby(uzytkownicy, zapotrzebowanie.utworzonePrzezId)}</p>
        <p>{formatujDateGodzine(zapotrzebowanie.utworzonoAt)}</p>
        {zapotrzebowanie.uwagi && <p>Uwagi: {zapotrzebowanie.uwagi}</p>}
        <div className="pulpit-zapotrzebowanie__akcje"><button onClick={() => zmienStatusZapotrzebowaniaZakupowego(zapotrzebowanie, 'KUPIONE')} type="button">Oznacz jako kupione</button><button className="pulpit-przycisk-niebezpieczny" onClick={() => zmienStatusZapotrzebowaniaZakupowego(zapotrzebowanie, 'ANULOWANE')} type="button">Anuluj</button></div>
      </article>)}</div> : <p className="pulpit-pusty">{'Brak aktywnych zapotrzebowa\u{144} zakupowych.'}</p>}
    </aside>}

    {czyDodawanieZakupu && <section aria-label={'Zg\u{142}oszenie zakupu'} aria-modal="true" className="pulpit-modal" role="dialog"><div>
      <h2>{'Zg\u{142}o\u{15b} zakup'}</h2>
      <FormularzZakupu anuluj={() => ustawCzyDodawanieZakupu(false)} blad={bladFormularzaZakupu} formularz={nowyZakup} ustawFormularz={ustawNowyZakup} zapisz={dodajZapotrzebowanieZakupowe} />
    </div></section>}
    {wybraneZadanie && <aside aria-label="Szczegóły zadania" className="pulpit-drawer">
      <button aria-label="Zamknij szczegóły zadania" className="pulpit-drawer__zamknij" onClick={() => ustawWybraneZadanie(null)} type="button">×</button>
      <span className="pulpit-status">{pobierzEtykieteStatusuZadania(wybraneZadanie, teraz)}</span>
      <h2>{wybraneZadanie.tytul}</h2>
      {wybraneZadanie.opis && <p>{wybraneZadanie.opis}</p>}
      <dl>
        <div><dt>Termin</dt><dd>{formatujDate(wybraneZadanie.data)}</dd></div>
        <div><dt>Godzina</dt><dd>{wybraneZadanie.godzina || 'Bez godziny'}</dd></div>
        <div><dt>Priorytet</dt><dd>{etykietaPriorytetu(wybraneZadanie.priorytet)}</dd></div>
        <div><dt>Zadaniodawca</dt><dd>{pobierzNazweOsoby(uzytkownicy, wybraneZadanie.zadaniodawcaId)}</dd></div>
        <div><dt>Zadaniobiorca</dt><dd>{pobierzNazweOsoby(uzytkownicy, wybraneZadanie.zadaniobiorcaId)}</dd></div>
        <div><dt>Przypomnienia</dt><dd>{wybraneZadanie.przypomnienia.length ? wybraneZadanie.przypomnienia.map(etykietaPrzypomnienia).join(', ') : 'Brak'}</dd></div>
        <div><dt>Źródło</dt><dd>{wybraneZadanie.czyAutomatyczne ? 'Automatyczna reguła szkolenia' : 'Ręczne zadanie'}</dd></div>
        <div><dt>Powiązane szkolenie</dt><dd>{wybraneZadanie.powiazaneSzkolenieId || 'Brak'}</dd></div>
      </dl>
      {czyMoznaModyfikowacWybrane && <div className="pulpit-drawer__akcje">
        <label htmlFor="pulpit-drawer-godzina">Godzina deadline<input id="pulpit-drawer-godzina" onChange={(zdarzenie) => zmienGodzine(wybraneZadanie, zdarzenie.target.value)} type="time" value={wybraneZadanie.godzina ?? ''} /></label>
        <button onClick={() => odlozZadanie(wybraneZadanie, przesunDate(wybraneZadanie.data, 1))} type="button">Odłóż o dzień</button>
        <button className="pulpit-przycisk-glowny" onClick={() => oznaczWykonane(wybraneZadanie)} type="button">{'\u2713'} Wykonane</button>
      </div>}
      {czyMoznaUsunacWybrane && <button className="pulpit-przycisk-niebezpieczny" onClick={() => { usunZadanieReczne(wybraneZadanie.id); ustawWybraneZadanie(null); odswiezStan() }} type="button">Usuń zadanie</button>}
      {wybraneZadanie.powiazaneSzkolenieId && <button className="pulpit-przycisk-glowny" onClick={() => otworzRekordZrodlowy?.(wybraneZadanie.powiazaneSzkolenieId)} type="button">Przejdź do rekordu źródłowego</button>}
    </aside>}

    {paczkaDoPotwierdzenia && <section aria-label="Potwierdzenie wysyłki" aria-modal="true" className="pulpit-modal" role="dialog"><div>
      <h2>Potwierdź wysyłkę paczki</h2>
      {czyWysylkaWymagaDodatkowegoPotwierdzenia(paczkaDoPotwierdzenia) && <p>Paczka nie jest oznaczona jako w pełni gotowa. Nadal brakuje: {paczkaDoPotwierdzenia.brakujaceElementy.join(', ')}. Czy na pewno oznaczyć jako wysłaną?</p>}
      <div className="pulpit-modal__akcje"><button onClick={() => ustawPaczkeDoPotwierdzenia(null)} type="button">Wróć</button><button className="pulpit-przycisk-glowny" onClick={potwierdzWysylke} type="button">Potwierdzam wysyłkę</button></div>
    </div></section>}
  </section>
}
