import { useState } from 'react'
import type { KorektyReczneListyObecnosci } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import WidokListObecnosci from './WidokListObecnosci'
import {
  pobierzListeObecnosciPoId,
  zapiszKorektyListyObecnosci,
  type DokumentListyObecnosci,
} from './rejestrListObecnosci'

type WlasciwosciWidokuListyObecnosciZDokumentu = {
  dokumentIdZTrasy: string | null
}

function utworzKorekteUczestnikow(dokument: DokumentListyObecnosci, tekst: string): KorektyReczneListyObecnosci['uczestnicy'] {
  const zrodlowiUczestnicy = dokument.daneDokumentu.daneZrodlowe.uczestnicy

  return tekst
    .split('\n')
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
    .map((nazwaPelna, indeks) => {
      const [imie = '', ...resztaNazwiska] = nazwaPelna.split(/\s+/)
      const poprzedni = zrodlowiUczestnicy[indeks]
      return {
        id: poprzedni?.id ?? null,
        imie,
        nazwisko: resztaNazwiska.join(' '),
        nazwaPelna,
        email: poprzedni?.email ?? null,
        stanowisko: poprzedni?.stanowisko ?? null,
      }
    })
}

function EdytorListyObecnosci({ dokumentId }: { dokumentId: string }) {
  const [dokument, ustawDokument] = useState<DokumentListyObecnosci | null>(() => pobierzListeObecnosciPoId(dokumentId))
  const [tytulDokumentu, ustawTytulDokumentu] = useState(() => dokument?.tytul ?? '')
  const [tytulSzkolenia, ustawTytulSzkolenia] = useState(() => dokument?.daneDokumentu.korektyReczne.tytulSzkolenia ?? dokument?.daneDokumentu.daneZrodlowe.tytulSzkolenia ?? '')
  const [tekstUczestnikow, ustawTekstUczestnikow] = useState(() => {
    const uczestnicy = dokument?.daneDokumentu.korektyReczne.uczestnicy ?? dokument?.daneDokumentu.daneZrodlowe.uczestnicy ?? []
    return uczestnicy.map((uczestnik) => uczestnik.nazwaPelna).join('\n')
  })
  const [komunikat, ustawKomunikat] = useState('')

  if (!dokument) {
    return <section className="widok"><p>Nie odnaleziono Listy obecności.</p></section>
  }

  const dokumentDoEdycji = dokument
  const daneZrodlowe = dokumentDoEdycji.daneDokumentu.daneZrodlowe
  const korekty: KorektyReczneListyObecnosci = {
    ...dokumentDoEdycji.daneDokumentu.korektyReczne,
    tytulSzkolenia,
    uczestnicy: utworzKorekteUczestnikow(dokumentDoEdycji, tekstUczestnikow),
  }
  const uczestnicyDoPodgladu = korekty.uczestnicy ?? daneZrodlowe.uczestnicy

  function zapiszDokument() {
    const zaktualizowany = zapiszKorektyListyObecnosci(dokumentDoEdycji.id, tytulDokumentu, korekty)

    if (!zaktualizowany) {
      ustawKomunikat('Nie udało się zapisać Listy obecności.')
      return
    }

    ustawDokument(zaktualizowany)
    ustawKomunikat('Zapisano ręczne korekty dokumentu.')
  }

  return (
    <section className="widok prosty-generator-dokumentu">
      <header className="prosty-generator-dokumentu__naglowek">
        <p>Dokument roboczy</p>
        <h1>Lista obecności</h1>
        <span>{komunikat}</span>
      </header>
      <div className="prosty-generator-dokumentu__kolumny">
        <section className="prosty-generator-dokumentu__panel">
          <label>
            <span>Tytuł dokumentu</span>
            <input value={tytulDokumentu} onChange={(zdarzenie) => ustawTytulDokumentu(zdarzenie.target.value)} />
          </label>
          <label>
            <span>Tytuł szkolenia (korekta ręczna)</span>
            <input value={tytulSzkolenia} onChange={(zdarzenie) => ustawTytulSzkolenia(zdarzenie.target.value)} />
          </label>
          <label>
            <span>Uczestnicy (korekta ręczna)</span>
            <textarea rows={10} value={tekstUczestnikow} onChange={(zdarzenie) => ustawTekstUczestnikow(zdarzenie.target.value)} />
          </label>
          <button type="button" onClick={zapiszDokument}>Zapisz</button>
        </section>
        <article className="prosty-generator-dokumentu__podglad">
          <h2>{tytulSzkolenia || 'Bez tytułu szkolenia'}</h2>
          <p><strong>Grupa:</strong> {daneZrodlowe.nazwaGrupy}</p>
          <p><strong>Terminy:</strong> {daneZrodlowe.daty.join(', ')}</p>
          <p><strong>Tryb:</strong> {daneZrodlowe.trybSzkolenia ?? 'brak danych'}</p>
          <p><strong>Trenerzy:</strong> {daneZrodlowe.trenerzy.map((trener) => trener.imieINazwisko).join(', ') || 'brak danych'}</p>
          <h3>Uczestnicy</h3>
          <ol>{uczestnicyDoPodgladu.map((uczestnik, indeks) => <li key={uczestnik.id ?? `${uczestnik.nazwaPelna}-${indeks}`}>{uczestnik.nazwaPelna}</li>)}</ol>
          <small>Źródło: Szczegóły {dokument.metadaneGeneratora.szczegolyOrganizacyjneId}, odcisk {dokument.metadaneGeneratora.odciskDanych}</small>
        </article>
      </div>
    </section>
  )
}

export default function WidokListyObecnosciZDokumentu({ dokumentIdZTrasy }: WlasciwosciWidokuListyObecnosciZDokumentu) {
  if (!dokumentIdZTrasy) {
    return <WidokListObecnosci />
  }

  return <EdytorListyObecnosci key={dokumentIdZTrasy} dokumentId={dokumentIdZTrasy} />
}