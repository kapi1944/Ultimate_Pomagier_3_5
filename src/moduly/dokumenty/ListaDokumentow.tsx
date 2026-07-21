import { useCallback, useEffect, useMemo, useState } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyJestAdministratorem } from '../../kartoteki/uzytkownicy/uprawnienia'
import { pobierzKonfiguracjeTypuDokumentu } from '../../wspolne/dokumenty/konfiguracjaDokumentow'
import { filtrujDokumenty, sortujDokumenty, type FiltrDokumentow, type KryteriumSortowaniaDokumentow } from '../../wspolne/dokumenty/filtryDokumentow'
import { statusyDokumentow, typyDokumentow, type Dokument, type StatusDokumentu, type TypDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../wspolne/dokumenty/rejestrDokumentow'
import { opublikujDokument, utworzAktualizacjeDokumentu } from '../../wspolne/dokumenty/wersjonowanieDokumentow'
import KartaDokumentuDyplomu from './KartaDokumentuDyplomu'
import './listaDokumentow.css'

type WlasciwosciListyDokumentow = {
  tytul: string
  opis: string
  filtrPoczatkowy?: FiltrDokumentow
  czyStatusStaly?: boolean
  typyStale?: TypDokumentu[]
  otworzDokument?: (dokument: Dokument<unknown, unknown>) => void
}

type StanLadowania = 'ladowanie' | 'gotowe' | 'blad'

const etykietyStatusow: Record<StatusDokumentu, string> = {
  ROBOCZY: 'Roboczy',
  GOTOWY: 'Gotowy',
  OPUBLIKOWANY: 'Opublikowany',
  KOMPLETNY: 'Kompletny',
  ZARCHIWIZOWANY: 'Zarchiwizowany',
}

function formatujDate(data: string) {
  return new Date(data).toLocaleString('pl-PL')
}

export default function ListaDokumentow({
  tytul,
  opis,
  filtrPoczatkowy = { czyUsunietyMiekko: false },
  czyStatusStaly = false,
  typyStale,
  otworzDokument,
}: WlasciwosciListyDokumentow) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [dokumenty, ustawDokumenty] = useState<Dokument<unknown, unknown>[]>([])
  const [filtr, ustawFiltr] = useState<FiltrDokumentow>(filtrPoczatkowy)
  const [sortowanie, ustawSortowanie] = useState<KryteriumSortowaniaDokumentow>('ZMODYFIKOWANO_MALEJACO')
  const [stanLadowania, ustawStanLadowania] = useState<StanLadowania>('ladowanie')
  const [blad, ustawBlad] = useState<string | null>(null)

  const odswiez = useCallback(() => {
    ustawStanLadowania('ladowanie')
    ustawBlad(null)

    try {
      ustawDokumenty(repozytoriumWspolnychDokumentow.pobierzWszystkie())
      ustawStanLadowania('gotowe')
    } catch {
      ustawStanLadowania('blad')
      ustawBlad('Nie udało się odczytać rejestru dokumentów.')
    }
  }, [])

  useEffect(() => {
    const identyfikator = window.setTimeout(odswiez, 0)
    return () => window.clearTimeout(identyfikator)
  }, [odswiez])

  const wyniki = useMemo(() => {
    const dokumentyWybranegoGeneratora = typyStale?.length
      ? dokumenty.filter((dokument) => typyStale.includes(dokument.typ))
      : dokumenty

    return sortujDokumenty(filtrujDokumenty(dokumentyWybranegoGeneratora, filtr), sortowanie)
  }, [dokumenty, filtr, sortowanie, typyStale])

  function ustawWartoscFiltru<Klucz extends keyof FiltrDokumentow>(klucz: Klucz, wartosc: FiltrDokumentow[Klucz]) {
    ustawFiltr((obecny) => ({ ...obecny, [klucz]: wartosc }))
  }

  function wykonajAkcje(akcja: () => Dokument<unknown, unknown> | null) {
    try {
      akcja()
      odswiez()
    } catch {
      ustawStanLadowania('blad')
      ustawBlad('Nie udało się zapisać zmiany dokumentu.')
    }
  }

  function czyMoznaZarzadzacDokumentem(dokument: Dokument<unknown, unknown>) {
    return Boolean(
      zalogowanyUzytkownik
      && (czyJestAdministratorem(zalogowanyUzytkownik) || dokument.wlascicielId === zalogowanyUzytkownik.id || dokument.autorId === zalogowanyUzytkownik.id),
    )
  }

  return (
    <section className="widok lista-dokumentow">
      <header className="lista-dokumentow__naglowek">
        <div><h1>{tytul}</h1><p>{opis}</p></div>
        <button type="button" onClick={odswiez}>Odśwież</button>
      </header>

      <form className="lista-dokumentow__filtry" onSubmit={(zdarzenie) => zdarzenie.preventDefault()}>
        <label>
          Szukaj
          <input type="search" value={filtr.tekst ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('tekst', zdarzenie.target.value || undefined)} placeholder="Tytuł, identyfikator, szkolenie, klient, trener, właściciel" />
        </label>
        {!typyStale?.length && (
          <label>
            Typ
            <select value={filtr.typ ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('typ', (zdarzenie.target.value || undefined) as FiltrDokumentow['typ'])}>
              <option value="">Wszystkie typy</option>
              {typyDokumentow.map((typ) => <option key={typ} value={typ}>{pobierzKonfiguracjeTypuDokumentu(typ)?.etykieta ?? typ}</option>)}
            </select>
          </label>
        )}
        {!czyStatusStaly && (
          <label>
            Status dokumentu
            <select value={filtr.status ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('status', (zdarzenie.target.value || undefined) as FiltrDokumentow['status'])}>
              <option value="">Wszystkie statusy</option>
              {statusyDokumentow.map((status) => <option key={status} value={status}>{etykietyStatusow[status]}</option>)}
            </select>
          </label>
        )}
        <label>Od daty modyfikacji<input type="date" value={filtr.dataOd ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('dataOd', zdarzenie.target.value || undefined)} /></label>
        <label>Do daty modyfikacji<input type="date" value={filtr.dataDo ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('dataDo', zdarzenie.target.value || undefined)} /></label>
        <label>Właściciel<input value={filtr.wlascicielId ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('wlascicielId', zdarzenie.target.value || undefined)} placeholder="Id właściciela" /></label>
        <label>Powiązane szkolenie<input value={filtr.szkolenieId ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('szkolenieId', zdarzenie.target.value || undefined)} placeholder="Id szkolenia" /></label>
        <label>
          Sortowanie
          <select value={sortowanie} onChange={(zdarzenie) => ustawSortowanie(zdarzenie.target.value as KryteriumSortowaniaDokumentow)}>
            <option value="ZMODYFIKOWANO_MALEJACO">Najnowsze modyfikacje</option>
            <option value="ZMODYFIKOWANO_ROSNACO">Najstarsze modyfikacje</option>
            <option value="TYTUL_ROSNACO">Tytuł A-Z</option>
            <option value="TYTUL_MALEJACO">Tytuł Z-A</option>
          </select>
        </label>
        <label className="lista-dokumentow__przelacznik">
          <input type="checkbox" checked={filtr.czyUsunietyMiekko === true} onChange={(zdarzenie) => ustawWartoscFiltru('czyUsunietyMiekko', zdarzenie.target.checked)} />
          Tylko usunięte
        </label>
        <button type="button" onClick={() => ustawFiltr(filtrPoczatkowy)}>Wyczyść filtry</button>
      </form>

      <p className="lista-dokumentow__licznik" aria-live="polite">Wyniki: {wyniki.length}</p>
      {stanLadowania === 'ladowanie' && <p className="lista-dokumentow__stan">Ładowanie dokumentów...</p>}
      {stanLadowania === 'blad' && <p className="lista-dokumentow__stan lista-dokumentow__stan--blad">{blad}</p>}
      {stanLadowania === 'gotowe' && wyniki.length === 0 && <p className="lista-dokumentow__stan">Brak dokumentów spełniających wybrane kryteria.</p>}

      {stanLadowania === 'gotowe' && wyniki.length > 0 && (
        <div className="lista-dokumentow__wyniki">
          {wyniki.map((dokument) => {
            const konfiguracja = pobierzKonfiguracjeTypuDokumentu(dokument.typ)
            const czyMoznaOtworzyc = Boolean(konfiguracja?.sciezkaGeneratora && otworzDokument)
            const czyMoznaZarzadzac = czyMoznaZarzadzacDokumentem(dokument)

            const akcje = <>
              <button type="button" disabled={!czyMoznaOtworzyc} title={czyMoznaOtworzyc ? 'Otwórz w odpowiednim generatorze' : 'Brak trasy dla tego typu dokumentu'} onClick={() => otworzDokument?.(dokument)}>{dokument.status === 'ROBOCZY' && czyMoznaZarzadzac ? 'Edytuj' : 'Otwórz'}</button>
              {czyMoznaZarzadzac && dokument.status === 'ROBOCZY' && <button type="button" onClick={() => wykonajAkcje(() => opublikujDokument(dokument.id))}>Publikuj</button>}
              {czyMoznaZarzadzac && dokument.status === 'OPUBLIKOWANY' && <button type="button" onClick={() => wykonajAkcje(() => utworzAktualizacjeDokumentu(dokument.id))}>Utwórz aktualizację</button>}
              {czyMoznaZarzadzac && (dokument.czyZarchiwizowany
                ? <button type="button" onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.przywroc(dokument.id))}>Przywróć</button>
                : <button type="button" onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.archiwizuj(dokument.id))}>Archiwizuj</button>)}
              {czyMoznaZarzadzac && <button type="button" disabled={dokument.czyUsunietyMiekko} onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.usunMiekko(dokument.id))}>Usuń miękko</button>}
            </>

            if (['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM'].includes(dokument.typ)) {
              return <KartaDokumentuDyplomu akcje={akcje} dokument={dokument} etykietaStatusu={etykietyStatusow[dokument.status]} etykietaTypu={konfiguracja?.etykieta ?? dokument.typ} formatujDate={formatujDate} key={dokument.id} />
            }

            return (
              <article className="lista-dokumentow__karta" key={dokument.id}>
                <div className="lista-dokumentow__karta-naglowek">
                  <div><p className="lista-dokumentow__typ">{konfiguracja?.etykieta ?? dokument.typ}</p><h2>{dokument.tytul}</h2></div>
                  <strong>{etykietyStatusow[dokument.status]}</strong>
                </div>
                <dl className="lista-dokumentow__metadane">
                  <div><dt>Wersja</dt><dd>v{String(dokument.wersja).padStart(2, '0')}</dd></div>
                  <div><dt>Zmodyfikowano</dt><dd>{formatujDate(dokument.zmodyfikowano)}</dd></div>
                  <div><dt>Właściciel</dt><dd>{dokument.wlascicielId ?? '—'}</dd></div>
                  <div><dt>Szkolenie</dt><dd>{dokument.szkolenieId ?? '—'}</dd></div>
                </dl>
                <div className="lista-dokumentow__akcje">{akcje}</div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
