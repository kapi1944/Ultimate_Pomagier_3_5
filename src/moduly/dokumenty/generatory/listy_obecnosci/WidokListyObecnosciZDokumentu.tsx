import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { utworzNazwePlikuDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import type { KorektyReczneListyObecnosci } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
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
import RendererListyObecnosci from './RendererListyObecnosci'
import WidokListObecnosci, { FormularzListyObecnosci } from './WidokListObecnosci'
import { utworzDaneListyObecnosciZIntegracji, type DaneListyObecnosci } from './modelListyObecnosci'
import {
  pobierzListeObecnosciPoId,
  zapiszKorektyListyObecnosci,
  type DokumentListyObecnosci,
} from './rejestrListObecnosci'

type WlasciwosciWidokuListyObecnosciZDokumentu = {
  dokumentIdZTrasy: string | null
}

function utworzKorekteUczestnikow(dokument: DokumentListyObecnosci, dane: DaneListyObecnosci): KorektyReczneListyObecnosci['uczestnicy'] {
  const zrodlowiUczestnicy = dokument.daneDokumentu.daneZrodlowe.uczestnicy

  return dane.uczestnicy.map((uczestnik, indeks) => {
    const [imie = '', ...resztaNazwiska] = uczestnik.imieINazwisko.trim().split(/\s+/)
    const poprzedni = zrodlowiUczestnicy.find((pozycja) => pozycja.id === uczestnik.id) ?? zrodlowiUczestnicy[indeks]
    return {
      id: poprzedni?.id ?? null,
      imie,
      nazwisko: resztaNazwiska.join(' '),
      nazwaPelna: uczestnik.imieINazwisko.trim(),
      email: poprzedni?.email ?? null,
      stanowisko: poprzedni?.stanowisko ?? null,
    }
  })
}

function FormularzEdycjiListy({ dane, prefiksId, tytulDokumentu, ustawDane, ustawTytulDokumentu }: {
  dane: DaneListyObecnosci
  prefiksId: string
  tytulDokumentu: string
  ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>>
  ustawTytulDokumentu: (wartosc: string) => void
}) {
  return <>
    <label className="generator-list-obecnosci__tytul-dokumentu" htmlFor={`${prefiksId}-tytul-dokumentu`}>Tytuł dokumentu<input id={`${prefiksId}-tytul-dokumentu`} value={tytulDokumentu} onChange={(zdarzenie) => ustawTytulDokumentu(zdarzenie.target.value)} /></label>
    <FormularzListyObecnosci czyPokazacOrganizatora={false} czyPokazacTryb={false} dane={dane} prefiksId={prefiksId} ustawDane={ustawDane} />
  </>
}

function EdytorListyObecnosci({ dokumentId }: { dokumentId: string }) {
  const [dokument, ustawDokument] = useState<DokumentListyObecnosci | null>(() => pobierzListeObecnosciPoId(dokumentId))
  const [tytulDokumentu, ustawTytulDokumentu] = useState(() => dokument?.tytul ?? '')
  const [dane, ustawDane] = useState<DaneListyObecnosci>(() => dokument
    ? utworzDaneListyObecnosciZIntegracji(dokument.daneDokumentu.daneZrodlowe, dokument.daneDokumentu.korektyReczne)
    : { wersjaSchematu: 1, tytulSzkolenia: '', miejsce: '', daty: [], organizator: 'SEMPER', trybListy: 'WYPELNIONA', liczbaPustychWierszy: 20, uczestnicy: [] })
  const [komunikat, ustawKomunikat] = useState('')
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const stanFormularza = { dane, tytulDokumentu }
  const stanDokumentu = useStanDokumentu({ dane: stanFormularza, czyAutosaveAktywny: false })

  function zapiszDokument() {
    if (!dokument) return

    stanDokumentu.rozpocznijZapis()
    const danePrzedEdycja = utworzDaneListyObecnosciZIntegracji(dokument.daneDokumentu.daneZrodlowe, dokument.daneDokumentu.korektyReczne)
    const korektyDoZapisu: KorektyReczneListyObecnosci = {
      ...dokument.daneDokumentu.korektyReczne,
      tytulSzkolenia: dane.tytulSzkolenia,
      daty: dane.daty,
      uczestnicy: utworzKorekteUczestnikow(dokument, dane),
      liczbaUczestnikow: dane.uczestnicy.length,
    }

    if (dane.miejsce !== danePrzedEdycja.miejsce) {
      korektyDoZapisu.lokalizacje = [{
        data: dane.daty[0] ?? null,
        lokalizacjaId: null,
        nazwa: dane.miejsce || null,
        adres: null,
        sala: null,
        trybOnline: dane.miejsce.trim().toLocaleLowerCase('pl') === 'online',
      }]
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

  if (!dokument) return <section className="widok"><p>Nie odnaleziono Listy obecności.</p></section>

  const akcje = <PasekAkcjiGeneratora><StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} /><PrzyciskPaneluGeneratora>Edytuj dane</PrzyciskPaneluGeneratora><button type="button" onClick={zapiszDokument}>Zapisz</button><AkcjeEksportuPdf nazwaPliku={utworzNazwePlikuDokumentu('LISTA_OBECNOSCI', dane.tytulSzkolenia || 'szkolenie')} obszarDokumentu={obszarPodgladuRef} /></PasekAkcjiGeneratora>

  return <ObszarZPanelemGeneratora idPanelu="panel-edycji-listy-obecnosci" kluczPrzypiecia="ultimate-pomagier.panel-generatora.listy-obecnosci.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.listy-obecnosci.wysuwanie" tytulPanelu="Edycja Listy obecności">
    <UkladGeneratoraDokumentu akcje={akcje} className="generator-list-obecnosci" komunikat={komunikat} opis="Dokument roboczy utworzony ze Szczegółów organizacyjnych." tytul="Lista obecności">
      <PanelBocznyGeneratora><FormularzEdycjiListy dane={dane} prefiksId="panel-edycji-listy" tytulDokumentu={tytulDokumentu} ustawDane={ustawDane} ustawTytulDokumentu={ustawTytulDokumentu} /></PanelBocznyGeneratora>
      <UkladFormularzaIPodgladu>
        <PanelGeneratoraDokumentu tytul="Edycja" wariant="edycja"><FormularzEdycjiListy dane={dane} prefiksId="formularz-edycji-listy" tytulDokumentu={tytulDokumentu} ustawDane={ustawDane} ustawTytulDokumentu={ustawTytulDokumentu} /></PanelGeneratoraDokumentu>
        <PanelGeneratoraDokumentu className="generator-list-obecnosci__podglad" ref={obszarPodgladuRef} tytul="Podgląd A4" wariant="podglad"><RendererListyObecnosci dane={dane} /><small>Źródło: Szczegóły {dokument.metadaneGeneratora.szczegolyOrganizacyjneId}, odcisk {dokument.metadaneGeneratora.odciskDanych}</small></PanelGeneratoraDokumentu>
      </UkladFormularzaIPodgladu>
    </UkladGeneratoraDokumentu>
  </ObszarZPanelemGeneratora>
}

export default function WidokListyObecnosciZDokumentu({ dokumentIdZTrasy }: WlasciwosciWidokuListyObecnosciZDokumentu) {
  if (!dokumentIdZTrasy) return <WidokListObecnosci />
  return <EdytorListyObecnosci key={dokumentIdZTrasy} dokumentId={dokumentIdZTrasy} />
}
