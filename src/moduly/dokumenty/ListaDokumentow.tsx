import { useCallback, useEffect, useMemo, useState } from 'react'
import { pobierzKonfiguracjeTypuDokumentu } from '../../wspolne/dokumenty/konfiguracjaDokumentow'
import { filtrujDokumenty, sortujDokumenty, type FiltrDokumentow, type KryteriumSortowaniaDokumentow } from '../../wspolne/dokumenty/filtryDokumentow'
import { statusyDokumentow, typyDokumentow, type Dokument, type StatusDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../wspolne/dokumenty/rejestrDokumentow'
import { opublikujDokument, utworzAktualizacjeDokumentu } from '../../wspolne/dokumenty/wersjonowanieDokumentow'
import './listaDokumentow.css'

type WlasciwosciListyDokumentow = {
  tytul: string
  opis: string
  filtrPoczatkowy?: FiltrDokumentow
  czyStatusStaly?: boolean
  otworzDokument?: (dokument: Dokument<unknown, unknown>) => void
}

type StanLadowania = 'ladowanie' | 'gotowe' | 'blad'

const etykietyStatusow: Record<StatusDokumentu, string> = {
  ROBOCZY: 'Roboczy',
  GOTOWY: 'Gotowy',
  OPUBLIKOWANY: 'Opublikowany',
  ZARCHIWIZOWANY: 'Zarchiwizowany',
}

function formatujDate(data: string) {
  return new Date(data).toLocaleString('pl-PL')
}

export default function ListaDokumentow({ tytul, opis, filtrPoczatkowy = { czyZarchiwizowany: false, czyUsunietyMiekko: false }, czyStatusStaly = false, otworzDokument }: WlasciwosciListyDokumentow) {
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
      ustawBlad('Nie udalo sie odczytac rejestru dokumentow.')
    }
  }, [])

  useEffect(() => {
    const identyfikator = window.setTimeout(odswiez, 0)

    return () => window.clearTimeout(identyfikator)
  }, [odswiez])

  const wyniki = useMemo(() => sortujDokumenty(filtrujDokumenty(dokumenty, filtr), sortowanie), [dokumenty, filtr, sortowanie])

  function ustawWartoscFiltru<Klucz extends keyof FiltrDokumentow>(klucz: Klucz, wartosc: FiltrDokumentow[Klucz]) {
    ustawFiltr((obecny) => ({ ...obecny, [klucz]: wartosc }))
  }

  function wykonajAkcje(akcja: () => Dokument<unknown, unknown> | null) {
    try {
      akcja()
      odswiez()
    } catch {
      ustawStanLadowania('blad')
      ustawBlad('Nie udalo sie zapisac zmiany dokumentu.')
    }
  }

  return (
    <section className="widok lista-dokumentow">
      <header className="lista-dokumentow__naglowek">
        <div>
          <h1>{tytul}</h1>
          <p>{opis}</p>
        </div>
        <button type="button" onClick={odswiez}>Odswiez</button>
      </header>

      <form className="lista-dokumentow__filtry" onSubmit={(zdarzenie) => zdarzenie.preventDefault()}>
        <label>
          Szukaj
          <input type="search" value={filtr.tekst ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('tekst', zdarzenie.target.value || undefined)} placeholder="Tytul, identyfikator, generator" />
        </label>
        <label>
          Typ
          <select value={filtr.typ ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('typ', (zdarzenie.target.value || undefined) as FiltrDokumentow['typ'])}>
            <option value="">Wszystkie</option>
            {typyDokumentow.map((typ) => <option key={typ} value={typ}>{pobierzKonfiguracjeTypuDokumentu(typ)?.etykieta ?? typ}</option>)}
          </select>
        </label>
        {!czyStatusStaly && (
          <label>
            Status
            <select value={filtr.status ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('status', (zdarzenie.target.value || undefined) as FiltrDokumentow['status'])}>
              <option value="">Wszystkie</option>
              {statusyDokumentow.map((status) => <option key={status} value={status}>{etykietyStatusow[status]}</option>)}
            </select>
          </label>
        )}
        <label>
          Od daty modyfikacji
          <input type="date" value={filtr.dataOd ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('dataOd', zdarzenie.target.value || undefined)} />
        </label>
        <label>
          Do daty modyfikacji
          <input type="date" value={filtr.dataDo ?? ''} onChange={(zdarzenie) => ustawWartoscFiltru('dataDo', zdarzenie.target.value || undefined)} />
        </label>
        <label>
          Sortowanie
          <select value={sortowanie} onChange={(zdarzenie) => ustawSortowanie(zdarzenie.target.value as KryteriumSortowaniaDokumentow)}>
            <option value="ZMODYFIKOWANO_MALEJACO">Najnowsze modyfikacje</option>
            <option value="ZMODYFIKOWANO_ROSNACO">Najstarsze modyfikacje</option>
            <option value="TYTUL_ROSNACO">Tytul A-Z</option>
            <option value="TYTUL_MALEJACO">Tytul Z-A</option>
          </select>
        </label>
        <label className="lista-dokumentow__przelacznik">
          <input type="checkbox" checked={filtr.czyZarchiwizowany === true} onChange={(zdarzenie) => ustawWartoscFiltru('czyZarchiwizowany', zdarzenie.target.checked ? true : false)} />
          Tylko zarchiwizowane
        </label>
        <label className="lista-dokumentow__przelacznik">
          <input type="checkbox" checked={filtr.czyUsunietyMiekko === true} onChange={(zdarzenie) => ustawWartoscFiltru('czyUsunietyMiekko', zdarzenie.target.checked ? true : false)} />
          Tylko usuniete
        </label>
        <button type="button" onClick={() => ustawFiltr(filtrPoczatkowy)}>Wyczysc filtry</button>
      </form>

      <p className="lista-dokumentow__licznik" aria-live="polite">Wyniki: {wyniki.length}</p>

      {stanLadowania === 'ladowanie' && <p className="lista-dokumentow__stan">Ladowanie dokumentow...</p>}
      {stanLadowania === 'blad' && <p className="lista-dokumentow__stan lista-dokumentow__stan--blad">{blad}</p>}
      {stanLadowania === 'gotowe' && wyniki.length === 0 && <p className="lista-dokumentow__stan">Brak dokumentow spelniajacych wybrane kryteria.</p>}

      {stanLadowania === 'gotowe' && wyniki.length > 0 && (
        <div className="lista-dokumentow__wyniki">
          {wyniki.map((dokument) => {
            const konfiguracja = pobierzKonfiguracjeTypuDokumentu(dokument.typ)
            const czyMoznaOtworzyc = Boolean(konfiguracja?.sciezkaGeneratora && otworzDokument)

            return (
              <article className="lista-dokumentow__karta" key={dokument.id}>
                <div className="lista-dokumentow__karta-naglowek">
                  <div>
                    <p className="lista-dokumentow__typ">{konfiguracja?.etykieta ?? dokument.typ}</p>
                    <h2>{dokument.tytul}</h2>
                  </div>
                  <strong>{etykietyStatusow[dokument.status]}</strong>
                </div>
                <dl className="lista-dokumentow__metadane">
                  <div><dt>Wersja</dt><dd>{dokument.wersja}</dd></div>
                  <div><dt>Zmodyfikowano</dt><dd>{formatujDate(dokument.zmodyfikowano)}</dd></div>
                  <div><dt>Wlasciciel</dt><dd>{dokument.wlascicielId ?? 'Uzytkownik lokalny'}</dd></div>
                  <div><dt>Szkolenie</dt><dd>{dokument.szkolenieId ?? '—'}</dd></div>
                </dl>
                <div className="lista-dokumentow__akcje">
                  <button type="button" disabled={!czyMoznaOtworzyc} title={czyMoznaOtworzyc ? 'Otworz w odpowiednim generatorze' : 'Brak trasy dla tego typu dokumentu'} onClick={() => otworzDokument?.(dokument)}>Otworz</button>
                  {dokument.status === 'ROBOCZY' && <button type="button" onClick={() => wykonajAkcje(() => opublikujDokument(dokument.id))}>Publikuj</button>}
                  {dokument.status === 'OPUBLIKOWANY' && <button type="button" onClick={() => wykonajAkcje(() => utworzAktualizacjeDokumentu(dokument.id))}>Utworz aktualizacje</button>}
                  {dokument.czyZarchiwizowany ? (
                    <button type="button" onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.przywroc(dokument.id))}>Przywroc</button>
                  ) : (
                    <button type="button" onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.archiwizuj(dokument.id))}>Archiwizuj</button>
                  )}
                  <button type="button" disabled={dokument.czyUsunietyMiekko} onClick={() => wykonajAkcje(() => repozytoriumWspolnychDokumentow.usunMiekko(dokument.id))}>Usun miekko</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
