import { useEffect, useState } from 'react'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import { pobierzIdRozwijalnychPozycji } from '../menu/pozycjeMenu'
import {
  kluczPrzypieciaMenu,
  kluczWysuwaniaZKrawedzi,
  pobierzPreferencjeDrzewaMenu,
  zapiszPreferencjeDrzewaMenu,
  zglosZmianePreferencjiMenu,
  type TrybWidokuMenu,
} from '../menu/preferencjeMenu'
import {
  domyslneUstawieniaAplikacji,
  paletyInterfejsu,
  type PaletaInterfejsu,
  type UstawieniaAplikacji,
} from './modelUstawienAplikacji'
import {
  eksportujUstawieniaAplikacji,
  importujUstawieniaAplikacji,
  pobierzUstawieniaAplikacji,
  zastosujUstawieniaAplikacji,
  zapiszUstawieniaAplikacji,
} from './magazynUstawienAplikacji'
import './widokUstawien.css'

const kluczPrzypieciaPaneluJakosci = 'ultimatePomagier.panelJakosciPrzypiety'
const kluczWysuwaniaPaneluJakosci = 'ultimatePomagier.panelJakosciWysuwanieZKrawedzi'
const zdarzenieZmianyPreferencjiPaneluJakosci = 'ultimatePomagier:zmianaPreferencjiPaneluJakosci'

type ZakladkaUstawien = 'OGOLNE' | 'WYGLAD' | 'PULPIT' | 'DOSTEPNOSC'

const etykietyPalet: Record<PaletaInterfejsu, string> = {
  DOMYSLNA: 'Domyślna',
  CRM: 'CRM',
  DDP: 'DDP',
  SEMPER: 'SEMPER',
  EVENTIS: 'Eventis',
  ARKUSZE_GOOGLE: 'Arkusze Google',
}

function pobierzBoolean(klucz: string, wartoscDomyslna: boolean) {
  try {
    const wartosc = localStorage.getItem(klucz)
    return wartosc === null ? wartoscDomyslna : wartosc === 'true'
  } catch {
    return wartoscDomyslna
  }
}

function pobierzPlikJson(nazwa: string, zawartosc: string) {
  const plik = new Blob([zawartosc], { type: 'application/json' })
  const adres = URL.createObjectURL(plik)
  const lacze = document.createElement('a')
  lacze.href = adres
  lacze.download = nazwa
  lacze.click()
  URL.revokeObjectURL(adres)
}

export default function WidokUstawien() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownikId = zalogowanyUzytkownik?.id ?? 'anonim'
  const preferencje = pobierzPreferencjeDrzewaMenu(uzytkownikId)

  const [aktywnaZakladka, ustawAktywnaZakladke] = useState<ZakladkaUstawien>('OGOLNE')
  const [zapisaneUstawienia, ustawZapisaneUstawienia] = useState(pobierzUstawieniaAplikacji)
  const [roboczeUstawienia, ustawRoboczeUstawienia] = useState(pobierzUstawieniaAplikacji)

  const [czyPrzypiete, ustawCzyPrzypiete] = useState(() => pobierzBoolean(kluczPrzypieciaMenu, false))
  const [czyWysuwanie, ustawCzyWysuwanie] = useState(() => pobierzBoolean(kluczWysuwaniaZKrawedzi, true))
  const [czyPanelJakosciPrzypiety, ustawCzyPanelJakosciPrzypiety] = useState(() => pobierzBoolean(kluczPrzypieciaPaneluJakosci, true))
  const [czyWysuwaniePaneluJakosci, ustawCzyWysuwaniePaneluJakosci] = useState(() => pobierzBoolean(kluczWysuwaniaPaneluJakosci, true))
  const [trybMenu, ustawTrybMenu] = useState<TrybWidokuMenu>(preferencje.tryb)
  const [komunikat, ustawKomunikat] = useState('')

  const czyMozeEdytowacSystemowe =
    zalogowanyUzytkownik?.rola === 'ADMINISTRATOR'
    || zalogowanyUzytkownik?.rola === 'ARCHITEKT'

  const czySaNiezapisaneZmiany =
    JSON.stringify(zapisaneUstawienia) !== JSON.stringify(roboczeUstawienia)

  useEffect(() => {
    zastosujUstawieniaAplikacji(roboczeUstawienia)
  }, [roboczeUstawienia])

  useEffect(() => {
    return () => zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji())
  }, [])

  function zmienWyglad<K extends keyof UstawieniaAplikacji['wyglad']>(
    pole: K,
    wartosc: UstawieniaAplikacji['wyglad'][K],
  ) {
    ustawRoboczeUstawienia((obecne) => ({
      ...obecne,
      wyglad: { ...obecne.wyglad, [pole]: wartosc },
    }))
  }

  function zmienPulpit<K extends keyof Omit<UstawieniaAplikacji['pulpit'], 'deadline'>>(
    pole: K,
    wartosc: UstawieniaAplikacji['pulpit'][K],
  ) {
    ustawRoboczeUstawienia((obecne) => ({
      ...obecne,
      pulpit: { ...obecne.pulpit, [pole]: wartosc },
    }))
  }

  function zmienDeadline<K extends keyof UstawieniaAplikacji['pulpit']['deadline']>(
    pole: K,
    wartosc: UstawieniaAplikacji['pulpit']['deadline'][K],
  ) {
    ustawRoboczeUstawienia((obecne) => ({
      ...obecne,
      pulpit: {
        ...obecne.pulpit,
        deadline: { ...obecne.pulpit.deadline, [pole]: wartosc },
      },
    }))
  }

  function zapiszBoolean(klucz: string, wartosc: boolean) {
    localStorage.setItem(klucz, String(wartosc))
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zapisano ustawienia menu.')
  }

  function zmienPrzypiecie(wartosc: boolean) {
    ustawCzyPrzypiete(wartosc)
    zapiszBoolean(kluczPrzypieciaMenu, wartosc)
  }

  function zmienWysuwanie(wartosc: boolean) {
    ustawCzyWysuwanie(wartosc)
    zapiszBoolean(kluczWysuwaniaZKrawedzi, wartosc)
  }

  function zapiszPreferencjePaneluJakosci(klucz: string, wartosc: boolean) {
    localStorage.setItem(klucz, String(wartosc))
    window.dispatchEvent(new Event(zdarzenieZmianyPreferencjiPaneluJakosci))
    ustawKomunikat('Zapisano ustawienia prawego panelu.')
  }

  function zmienPrzypieciePaneluJakosci(wartosc: boolean) {
    ustawCzyPanelJakosciPrzypiety(wartosc)
    zapiszPreferencjePaneluJakosci(kluczPrzypieciaPaneluJakosci, wartosc)
  }

  function zmienWysuwaniePaneluJakosci(wartosc: boolean) {
    ustawCzyWysuwaniePaneluJakosci(wartosc)
    zapiszPreferencjePaneluJakosci(kluczWysuwaniaPaneluJakosci, wartosc)
  }

  function zmienTrybMenu(wartosc: TrybWidokuMenu) {
    ustawTrybMenu(wartosc)
    zapiszPreferencjeDrzewaMenu(uzytkownikId, {
      tryb: wartosc,
      rozwiniete: wartosc === 'zwijane'
        ? {}
        : Object.fromEntries(pobierzIdRozwijalnychPozycji().map((id) => [id, true])),
    })
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zapisano domyślny widok drzewa menu.')
  }

  function resetujDrzewo() {
    zapiszPreferencjeDrzewaMenu(uzytkownikId, { tryb: 'zwijane', rozwiniete: {} })
    ustawTrybMenu('zwijane')
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zwinięto i zresetowano drzewo menu.')
  }

  function zapiszSystemowe() {
    if (!czyMozeEdytowacSystemowe) return

    if (!zapiszUstawieniaAplikacji(roboczeUstawienia)) {
      ustawKomunikat('Nie udało się zapisać ustawień systemowych.')
      return
    }

    const zapisane = pobierzUstawieniaAplikacji()
    ustawZapisaneUstawienia(zapisane)
    ustawRoboczeUstawienia(zapisane)
    ustawKomunikat('Zapisano ustawienia systemowe.')
  }

  function resetujSekcje() {
    if (!czyMozeEdytowacSystemowe) return

    if (aktywnaZakladka === 'WYGLAD') {
      ustawRoboczeUstawienia((obecne) => ({
        ...obecne,
        wyglad: { ...domyslneUstawieniaAplikacji.wyglad },
      }))
    }

    if (aktywnaZakladka === 'PULPIT') {
      ustawRoboczeUstawienia((obecne) => ({
        ...obecne,
        pulpit: {
          ...domyslneUstawieniaAplikacji.pulpit,
          deadline: { ...domyslneUstawieniaAplikacji.pulpit.deadline },
        },
      }))
    }

    if (aktywnaZakladka === 'DOSTEPNOSC') {
      ustawRoboczeUstawienia((obecne) => ({
        ...obecne,
        dostepnosc: { ...domyslneUstawieniaAplikacji.dostepnosc },
      }))
    }

    ustawKomunikat('Przywrócono wartości domyślne bieżącej sekcji w podglądzie.')
  }

  function resetujWszystkieSystemowe() {
    if (!czyMozeEdytowacSystemowe) return

    ustawRoboczeUstawienia({
      ...domyslneUstawieniaAplikacji,
      wyglad: { ...domyslneUstawieniaAplikacji.wyglad },
      pulpit: {
        ...domyslneUstawieniaAplikacji.pulpit,
        deadline: { ...domyslneUstawieniaAplikacji.pulpit.deadline },
      },
      dostepnosc: { ...domyslneUstawieniaAplikacji.dostepnosc },
    })

    ustawKomunikat('Przywrócono wszystkie wartości domyślne w podglądzie. Zapisz, aby je utrwalić.')
  }

  function eksportujUstawieniaSystemowe() {
    pobierzPlikJson(
      'ultimate-pomagier-ustawienia-' + new Date().toISOString().slice(0, 10) + '.json',
      eksportujUstawieniaAplikacji(zapisaneUstawienia),
    )
    ustawKomunikat('Wyeksportowano ustawienia systemowe.')
  }

  async function importujUstawieniaSystemowe(plik: File | undefined) {
    if (!plik || !czyMozeEdytowacSystemowe) return

    const wynik = importujUstawieniaAplikacji(await plik.text())

    if (!wynik.ok) {
      ustawKomunikat(wynik.blad)
      return
    }

    ustawRoboczeUstawienia(wynik.ustawienia)
    ustawKomunikat('Wczytano ustawienia do podglądu. Użyj „Zapisz ustawienia”, aby je utrwalić.')
  }

  function eksportujDaneLokalne() {
    const dane = Object.fromEntries(Array.from({ length: localStorage.length }, (_, indeks) => {
      const klucz = localStorage.key(indeks) ?? ''
      return [klucz, localStorage.getItem(klucz)]
    }).filter(([klucz]) => klucz))

    pobierzPlikJson(
      'ultimate-pomagier-kopia-' + new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(dane, null, 2),
    )

    ustawKomunikat('Przygotowano kopię danych lokalnych.')
  }

  return (
    <section className="widok ustawienia">
      <header className="ustawienia__naglowek">
        <div>
          <h1>Ustawienia</h1>
          <p>Preferencje użytkownika oraz centralna konfiguracja interfejsu Ultimate Pomagiera.</p>
        </div>
        {czySaNiezapisaneZmiany && <span className="ustawienia__niezapisane">Niezapisane zmiany</span>}
      </header>

      <nav aria-label="Kategorie ustawień" className="ustawienia__zakladki">
        {([
          ['OGOLNE', 'Ogólne'],
          ['WYGLAD', 'Wygląd'],
          ['PULPIT', 'Pulpit'],
          ['DOSTEPNOSC', 'Dostępność'],
        ] as Array<[ZakladkaUstawien, string]>).map(([id, etykieta]) => (
          <button
            aria-selected={aktywnaZakladka === id}
            className={aktywnaZakladka === id ? 'ustawienia__zakladka ustawienia__zakladka--aktywna' : 'ustawienia__zakladka'}
            key={id}
            onClick={() => ustawAktywnaZakladke(id)}
            role="tab"
            type="button"
          >
            {etykieta}
          </button>
        ))}
      </nav>

      {aktywnaZakladka === 'OGOLNE' && <>
        <section className="ustawienia__karta">
          <h2>Menu boczne</h2>

          <label className="ustawienia__wiersz">
            <span><strong>Przypięte menu</strong><small>Menu pozostaje stale widoczne na szerokim ekranie.</small></span>
            <input checked={czyPrzypiete} onChange={(zdarzenie) => zmienPrzypiecie(zdarzenie.target.checked)} type="checkbox" />
          </label>

          <label className="ustawienia__wiersz">
            <span><strong>Wysuwanie z lewej krawędzi</strong><small>Pozwala otworzyć odpięte menu przez najechanie na krawędź.</small></span>
            <input checked={czyWysuwanie} onChange={(zdarzenie) => zmienWysuwanie(zdarzenie.target.checked)} type="checkbox" />
          </label>

          <label className="ustawienia__pole">
            Domyślny widok drzewa
            <select value={trybMenu} onChange={(zdarzenie) => zmienTrybMenu(zdarzenie.target.value as TrybWidokuMenu)}>
              <option value="zwijane">Zwijane</option>
              <option value="pelne">Pełne</option>
            </select>
          </label>

          <button type="button" onClick={resetujDrzewo}>Zresetuj rozwinięte sekcje</button>
        </section>

        <section className="ustawienia__karta">
          <h2>Prawy panel</h2>

          <label className="ustawienia__wiersz">
            <span><strong>Przypięty panel kontroli jakości</strong><small>Panel jest stale widoczny w generatorze szczegółów organizacyjnych.</small></span>
            <input checked={czyPanelJakosciPrzypiety} onChange={(zdarzenie) => zmienPrzypieciePaneluJakosci(zdarzenie.target.checked)} type="checkbox" />
          </label>

          <label className="ustawienia__wiersz">
            <span><strong>Wysuwanie z prawej krawędzi</strong><small>Gdy panel nie jest przypięty, otwiera się po najechaniu na prawą krawędź ekranu.</small></span>
            <input checked={czyWysuwaniePaneluJakosci} onChange={(zdarzenie) => zmienWysuwaniePaneluJakosci(zdarzenie.target.checked)} type="checkbox" />
          </label>
        </section>

        <section className="ustawienia__karta">
          <h2>Konfiguracja systemowa</h2>
          <p>Eksport obejmuje centralny model ustawień interfejsu, Pulpitu i dostępności.</p>

          <div className="ustawienia__akcje">
            <button type="button" onClick={eksportujUstawieniaSystemowe}>Eksportuj ustawienia JSON</button>

            <label className={czyMozeEdytowacSystemowe ? 'ustawienia__import' : 'ustawienia__import ustawienia__import--wylaczony'}>
              Importuj ustawienia JSON
              <input
                accept="application/json,.json"
                disabled={!czyMozeEdytowacSystemowe}
                onChange={(zdarzenie) => {
                  void importujUstawieniaSystemowe(zdarzenie.target.files?.[0])
                  zdarzenie.target.value = ''
                }}
                type="file"
              />
            </label>
          </div>

          {!czyMozeEdytowacSystemowe && <p className="ustawienia__informacja">Zmiana ustawień systemowych wymaga roli Administratora lub Architekta.</p>}
        </section>

        <section className="ustawienia__karta">
          <h2>Dane lokalne</h2>
          <p>Aplikacja nadal działa w lokalnym modelu danych przeglądarki. Eksport tworzy kopię wszystkich kluczy używanych na tym urządzeniu.</p>
          <button type="button" onClick={eksportujDaneLokalne}>Eksportuj pełną kopię JSON</button>
        </section>
      </>}

      {aktywnaZakladka === 'WYGLAD' && <>
        <fieldset className="ustawienia__globalne" disabled={!czyMozeEdytowacSystemowe}>
          <section className="ustawienia__karta">
            <h2>Paleta</h2>
            <div className="ustawienia__palety">
              {paletyInterfejsu.map((paleta) => (
                <button
                  className={roboczeUstawienia.wyglad.paleta === paleta ? 'ustawienia__paleta ustawienia__paleta--aktywna' : 'ustawienia__paleta'}
                  key={paleta}
                  onClick={() => zmienWyglad('paleta', paleta)}
                  type="button"
                >
                  {etykietyPalet[paleta]}
                </button>
              ))}
            </div>
          </section>

          <section className="ustawienia__karta ustawienia__siatka">
            <h2>Geometria i reakcje</h2>

            <label className="ustawienia__pole">
              Gęstość interfejsu
              <select value={roboczeUstawienia.wyglad.gestosc} onChange={(zdarzenie) => zmienWyglad('gestosc', zdarzenie.target.value as UstawieniaAplikacji['wyglad']['gestosc'])}>
                <option value="KOMPAKTOWA">Kompaktowa</option>
                <option value="STANDARDOWA">Standardowa</option>
                <option value="PRZESTRONNA">Przestronna</option>
              </select>
            </label>

            <label className="ustawienia__pole">
              Promień kart (px)
              <input min="0" max="32" onChange={(zdarzenie) => zmienWyglad('promienKart', Number(zdarzenie.target.value))} type="number" value={roboczeUstawienia.wyglad.promienKart} />
            </label>

            <label className="ustawienia__pole">
              Promień pól (px)
              <input min="0" max="24" onChange={(zdarzenie) => zmienWyglad('promienPol', Number(zdarzenie.target.value))} type="number" value={roboczeUstawienia.wyglad.promienPol} />
            </label>

            <label className="ustawienia__pole">
              Skala hover
              <input min="1" max="1.1" step="0.01" onChange={(zdarzenie) => zmienWyglad('skalaHover', Number(zdarzenie.target.value))} type="number" value={roboczeUstawienia.wyglad.skalaHover} />
            </label>

            <label className="ustawienia__pole">
              Czas przejścia (ms)
              <input min="0" max="600" step="10" onChange={(zdarzenie) => zmienWyglad('czasPrzejsciaMs', Number(zdarzenie.target.value))} type="number" value={roboczeUstawienia.wyglad.czasPrzejsciaMs} />
            </label>
          </section>
        </fieldset>

        <PodgladUstawien />
      </>}

      {aktywnaZakladka === 'PULPIT' && <>
        <fieldset className="ustawienia__globalne" disabled={!czyMozeEdytowacSystemowe}>
          <section className="ustawienia__karta ustawienia__siatka">
            <h2>Godziny pracy</h2>

            <label className="ustawienia__pole">
              Początek dnia
              <input type="time" value={roboczeUstawienia.pulpit.poczatekDnia} onChange={(zdarzenie) => zmienPulpit('poczatekDnia', zdarzenie.target.value)} />
            </label>

            <label className="ustawienia__pole">
              Koniec dnia
              <input type="time" value={roboczeUstawienia.pulpit.koniecDnia} onChange={(zdarzenie) => zmienPulpit('koniecDnia', zdarzenie.target.value)} />
            </label>
          </section>

          <section className="ustawienia__karta ustawienia__siatka">
            <h2>Marker deadline</h2>

            <label className="ustawienia__pole">
              Rozmiar rombu (18–48 px)
              <input min="18" max="48" type="number" value={roboczeUstawienia.pulpit.deadline.rozmiarRombu} onChange={(zdarzenie) => zmienDeadline('rozmiarRombu', Number(zdarzenie.target.value))} />
            </label>

            <label className="ustawienia__pole">
              Grubość obramowania (1–8 px)
              <input min="1" max="8" type="number" value={roboczeUstawienia.pulpit.deadline.gruboscObramowania} onChange={(zdarzenie) => zmienDeadline('gruboscObramowania', Number(zdarzenie.target.value))} />
            </label>

            <label className="ustawienia__pole">
              Kropka Zadaniodawcy (6–24 px)
              <input min="6" max="24" type="number" value={roboczeUstawienia.pulpit.deadline.rozmiarKropki} onChange={(zdarzenie) => zmienDeadline('rozmiarKropki', Number(zdarzenie.target.value))} />
            </label>

            <label className="ustawienia__pole">
              Poświata
              <select value={roboczeUstawienia.pulpit.deadline.poswiata} onChange={(zdarzenie) => zmienDeadline('poswiata', zdarzenie.target.value as UstawieniaAplikacji['pulpit']['deadline']['poswiata'])}>
                <option value="BRAK">Brak</option>
                <option value="SUBTELNA">Subtelna</option>
                <option value="STANDARDOWA">Standardowa</option>
                <option value="MOCNA">Mocna</option>
              </select>
            </label>

            <label className="ustawienia__wiersz ustawienia__wiersz--pelny">
              <span><strong>Płomień ASAP</strong><small>Pokazuje animowany płomień nad markerem zadania ASAP.</small></span>
              <input checked={roboczeUstawienia.pulpit.deadline.pokazPlomienAsap} onChange={(zdarzenie) => zmienDeadline('pokazPlomienAsap', zdarzenie.target.checked)} type="checkbox" />
            </label>
          </section>
        </fieldset>

        <PodgladUstawien />
      </>}

      {aktywnaZakladka === 'DOSTEPNOSC' && <>
        <fieldset className="ustawienia__globalne" disabled={!czyMozeEdytowacSystemowe}>
          <section className="ustawienia__karta">
            <h2>Ruch i animacje</h2>

            <label className="ustawienia__wiersz">
              <span><strong>Ogranicz animacje</strong><small>Wyłącza dekoracyjne animacje i skraca przejścia interfejsu.</small></span>
              <input
                checked={roboczeUstawienia.dostepnosc.ograniczAnimacje}
                onChange={(zdarzenie) => ustawRoboczeUstawienia((obecne) => ({
                  ...obecne,
                  dostepnosc: {
                    ...obecne.dostepnosc,
                    ograniczAnimacje: zdarzenie.target.checked,
                  },
                }))}
                type="checkbox"
              />
            </label>

            <p>Preferencja systemowa <code>prefers-reduced-motion</code> nadal ma pierwszeństwo.</p>
          </section>
        </fieldset>

        <PodgladUstawien />
      </>}

      {aktywnaZakladka !== 'OGOLNE' && <div className="ustawienia__pasek-zapisu">
        {!czyMozeEdytowacSystemowe && <span>Tylko Administrator lub Architekt może zmieniać ustawienia systemowe.</span>}

        <button disabled={!czyMozeEdytowacSystemowe} onClick={resetujSekcje} type="button">Przywróć tę sekcję</button>
        <button disabled={!czyMozeEdytowacSystemowe} onClick={resetujWszystkieSystemowe} type="button">Przywróć domyślne</button>
        <button className="ustawienia__zapisz" disabled={!czyMozeEdytowacSystemowe || !czySaNiezapisaneZmiany} onClick={zapiszSystemowe} type="button">Zapisz ustawienia</button>
      </div>}

      {komunikat && <p aria-live="polite" className="ustawienia__komunikat">{komunikat}</p>}
    </section>
  )
}

function PodgladUstawien() {
  return (
    <section className="ustawienia__karta">
      <h2>Podgląd na żywo</h2>

      <div className="ustawienia-podglad">
        <article className="ustawienia-podglad__karta">
          <strong>Przykładowa karta</strong>
          <span>Zmiany geometrii i palety są widoczne bez zapisywania.</span>
        </article>

        <label className="ustawienia__pole">
          Przykładowe pole
          <input defaultValue="Ultimate Pomagier" readOnly />
        </label>

        <button type="button">Test interakcji</button>

        <div className="ustawienia-podglad__deadline" aria-label="Podgląd markera deadline">
          <span className="ustawienia-podglad__romb"><span /></span>
          <small>obramowanie = Zadaniobiorca · kropka = Zadaniodawca</small>
        </div>
      </div>
    </section>
  )
}
