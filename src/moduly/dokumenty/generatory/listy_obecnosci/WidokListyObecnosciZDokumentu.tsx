import { useState } from 'react'
import type { KorektyReczneListyObecnosci } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import WidokListObecnosci from './WidokListObecnosci'
import UkladGeneratoraDokumentu, {
  ObszarZPanelemGeneratora,
  PanelBocznyGeneratora,
  PanelGeneratoraDokumentu,
  PasekAkcjiGeneratora,
  PrzyciskPaneluGeneratora,
  UkladFormularzaIPodgladu,
} from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
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
  const stanFormularza = { tekstUczestnikow, tytulDokumentu, tytulSzkolenia }
  const stanDokumentu = useStanDokumentu({ dane: stanFormularza, czyAutosaveAktywny: false })

  function zapiszDokument() {
    if (!dokument) {
      return
    }

    stanDokumentu.rozpocznijZapis()
    const korektyDoZapisu: KorektyReczneListyObecnosci = {
      ...dokument.daneDokumentu.korektyReczne,
      tytulSzkolenia,
      uczestnicy: utworzKorekteUczestnikow(dokument, tekstUczestnikow),
    }
    const zaktualizowany = zapiszKorektyListyObecnosci(dokument.id, tytulDokumentu, korektyDoZapisu)

    if (!zaktualizowany) {
      stanDokumentu.oznaczBladZapisu()
      ustawKomunikat('Nie udało się zapisać Listy obecności.')
      return
    }

    ustawDokument(zaktualizowany)
    stanDokumentu.oznaczJakoZapisany(stanFormularza)
    ustawKomunikat('Zapisano ręczne korekty dokumentu.')
  }

  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, zapiszDokument)

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

  return (
    <ObszarZPanelemGeneratora
      idPanelu="panel-edycji-listy-obecnosci"
      kluczPrzypiecia="ultimate-pomagier.panel-generatora.listy-obecnosci.przypiety"
      kluczWysuwania="ultimate-pomagier.panel-generatora.listy-obecnosci.wysuwanie"
      tytulPanelu="Edycja listy obecności"
    >
    <UkladGeneratoraDokumentu
      akcje={<PasekAkcjiGeneratora><StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} /><PrzyciskPaneluGeneratora>Edytuj dane</PrzyciskPaneluGeneratora><button type="button" onClick={zapiszDokument}>Zapisz</button></PasekAkcjiGeneratora>}
      komunikat={komunikat}
      opis="Dokument roboczy utworzony ze Szczegółów organizacyjnych."
      tytul="Lista obecności"
    >
      <PanelBocznyGeneratora>
        <FormularzListyObecnosci
          tekstUczestnikow={tekstUczestnikow}
          tytulDokumentu={tytulDokumentu}
          tytulSzkolenia={tytulSzkolenia}
          zmienTekstUczestnikow={ustawTekstUczestnikow}
          zmienTytulDokumentu={ustawTytulDokumentu}
          zmienTytulSzkolenia={ustawTytulSzkolenia}
        />
      </PanelBocznyGeneratora>
      <UkladFormularzaIPodgladu>
        <PanelGeneratoraDokumentu tytul="Edycja" wariant="edycja">
          <FormularzListyObecnosci
            tekstUczestnikow={tekstUczestnikow}
            tytulDokumentu={tytulDokumentu}
            tytulSzkolenia={tytulSzkolenia}
            zmienTekstUczestnikow={ustawTekstUczestnikow}
            zmienTytulDokumentu={ustawTytulDokumentu}
            zmienTytulSzkolenia={ustawTytulSzkolenia}
          />
        </PanelGeneratoraDokumentu>
        <PanelGeneratoraDokumentu tytul="Podgląd" wariant="podglad">
          <h2>{tytulSzkolenia || 'Bez tytułu szkolenia'}</h2>
          <p><strong>Grupa:</strong> {daneZrodlowe.nazwaGrupy}</p>
          <p><strong>Terminy:</strong> {daneZrodlowe.daty.join(', ')}</p>
          <p><strong>Tryb:</strong> {daneZrodlowe.trybSzkolenia ?? 'brak danych'}</p>
          <p><strong>Trenerzy:</strong> {daneZrodlowe.trenerzy.map((trener) => trener.imieINazwisko).join(', ') || 'brak danych'}</p>
          <h3>Uczestnicy</h3>
          <ol>{uczestnicyDoPodgladu.map((uczestnik, indeks) => <li key={uczestnik.id ?? `${uczestnik.nazwaPelna}-${indeks}`}>{uczestnik.nazwaPelna}</li>)}</ol>
          <small>Źródło: Szczegóły {dokument.metadaneGeneratora.szczegolyOrganizacyjneId}, odcisk {dokument.metadaneGeneratora.odciskDanych}</small>
        </PanelGeneratoraDokumentu>
      </UkladFormularzaIPodgladu>
    </UkladGeneratoraDokumentu>
    </ObszarZPanelemGeneratora>
  )
}

type WlasciwosciFormularzaListyObecnosci = {
  tekstUczestnikow: string
  tytulDokumentu: string
  tytulSzkolenia: string
  zmienTekstUczestnikow: (wartosc: string) => void
  zmienTytulDokumentu: (wartosc: string) => void
  zmienTytulSzkolenia: (wartosc: string) => void
}

function FormularzListyObecnosci({
  tekstUczestnikow,
  tytulDokumentu,
  tytulSzkolenia,
  zmienTekstUczestnikow,
  zmienTytulDokumentu,
  zmienTytulSzkolenia,
}: WlasciwosciFormularzaListyObecnosci) {
  return (
    <>
      <label><span>Tytuł dokumentu</span><input value={tytulDokumentu} onChange={(zdarzenie) => zmienTytulDokumentu(zdarzenie.target.value)} /></label>
      <label><span>Tytuł szkolenia (korekta ręczna)</span><input value={tytulSzkolenia} onChange={(zdarzenie) => zmienTytulSzkolenia(zdarzenie.target.value)} /></label>
      <label><span>Uczestnicy (korekta ręczna)</span><textarea rows={10} value={tekstUczestnikow} onChange={(zdarzenie) => zmienTekstUczestnikow(zdarzenie.target.value)} /></label>
    </>
  )
}

export default function WidokListyObecnosciZDokumentu({ dokumentIdZTrasy }: WlasciwosciWidokuListyObecnosciZDokumentu) {
  if (!dokumentIdZTrasy) {
    return <WidokListObecnosci />
  }

  return <EdytorListyObecnosci key={dokumentIdZTrasy} dokumentId={dokumentIdZTrasy} />
}
