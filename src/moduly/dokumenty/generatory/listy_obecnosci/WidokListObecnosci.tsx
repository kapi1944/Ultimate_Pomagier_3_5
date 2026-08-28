import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { utworzNazwePlikuDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import RendererListyObecnosci from './RendererListyObecnosci'
import {
  deserializujDaneListyObecnosci,
  serializujDaneListyObecnosci,
  utworzDomyslneDaneListyObecnosci,
  type DaneListyObecnosci,
} from './modelListyObecnosci'
import './widokListObecnosci.css'

const kluczSzkicu = 'ultimate-pomagier.listy-obecnosci.szkic'
const kluczIdDokumentu = `${kluczSzkicu}.dokumentId`

function utworzIdUczestnika() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `uczestnik-${crypto.randomUUID()}`
    : `uczestnik-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function SekcjaFormularza({ children, domyslnieOtwarta = false, tytul }: { children: ReactNode; domyslnieOtwarta?: boolean; tytul: string }) {
  return <details className="generator-list-obecnosci__sekcja" open={domyslnieOtwarta}><summary>{tytul}</summary><div className="generator-list-obecnosci__zawartosc-sekcji">{children}</div></details>
}

export function FormularzListyObecnosci({
  czyPokazacOrganizatora = true,
  czyPokazacTryb = true,
  dane,
  prefiksId,
  ustawDane,
}: {
  czyPokazacOrganizatora?: boolean
  czyPokazacTryb?: boolean
  dane: DaneListyObecnosci
  prefiksId: string
  ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>>
}) {
  function ustawDaty(daty: string[]) {
    ustawDane((obecne) => ({ ...obecne, daty: daty.slice(0, 5) }))
  }

  function ustawTekstUczestnikow(tekst: string) {
    const nazwy = tekst.split(/\r?\n/)
    ustawDane((obecne) => ({
      ...obecne,
      uczestnicy: nazwy.map((imieINazwisko, indeks) => ({
        id: obecne.uczestnicy[indeks]?.id ?? utworzIdUczestnika(),
        imieINazwisko,
      })).filter((uczestnik) => uczestnik.imieINazwisko.trim()),
    }))
  }

  return <div className="generator-list-obecnosci__formularz">
    <SekcjaFormularza domyslnieOtwarta tytul="Dane szkolenia"><div className="generator-list-obecnosci__siatka-pol">
      <label className="generator-list-obecnosci__pole-szerokie" htmlFor={`${prefiksId}-tytul`}>Tytuł szkolenia<input id={`${prefiksId}-tytul`} value={dane.tytulSzkolenia} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, tytulSzkolenia: zdarzenie.target.value }))} /></label>
      <label className="generator-list-obecnosci__pole-szerokie" htmlFor={`${prefiksId}-miejsce`}>Miejsce<input id={`${prefiksId}-miejsce`} value={dane.miejsce} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, miejsce: zdarzenie.target.value }))} /></label>
      {czyPokazacOrganizatora && <label htmlFor={`${prefiksId}-organizator`}>Organizator<select id={`${prefiksId}-organizator`} value={dane.organizator} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, organizator: zdarzenie.target.value === 'IIST' ? 'IIST' : 'SEMPER' }))}><option value="SEMPER">SEMPER</option><option value="IIST">IIST</option></select></label>}
    </div></SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Dni szkolenia">
      <div className="generator-list-obecnosci__daty">{dane.daty.map((data, indeks) => <div key={indeks}>
        <label htmlFor={`${prefiksId}-data-${indeks}`}>Dzień {indeks + 1}<input id={`${prefiksId}-data-${indeks}`} type="date" value={data} onChange={(zdarzenie) => ustawDaty(dane.daty.map((obecna, pozycja) => pozycja === indeks ? zdarzenie.target.value : obecna))} /></label>
        <button aria-label={`Usuń dzień ${indeks + 1}`} onClick={() => ustawDaty(dane.daty.filter((_, pozycja) => pozycja !== indeks))} type="button">Usuń</button>
      </div>)}</div>
      {dane.daty.length < 5 && <button className="generator-list-obecnosci__przycisk-pomocniczy" onClick={() => ustawDaty([...dane.daty, ''])} type="button">Dodaj dzień szkolenia</button>}
      {!dane.daty.length && <p className="generator-list-obecnosci__opis">Dodaj co najmniej jeden dzień, aby nagłówek kolumny podpisu zawierał datę.</p>}
    </SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Uczestnicy">
      {czyPokazacTryb && <label htmlFor={`${prefiksId}-tryb`}>Tryb listy<select id={`${prefiksId}-tryb`} value={dane.trybListy} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, trybListy: zdarzenie.target.value === 'PUSTA' ? 'PUSTA' : 'WYPELNIONA' }))}><option value="WYPELNIONA">Z nazwiskami uczestników</option><option value="PUSTA">Pusta lista do ręcznego wypełnienia</option></select></label>}
      {dane.trybListy === 'PUSTA' && czyPokazacTryb
        ? <label htmlFor={`${prefiksId}-liczba-wierszy`}>Liczba pustych wierszy<input id={`${prefiksId}-liczba-wierszy`} max="200" min="1" type="number" value={dane.liczbaPustychWierszy} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, liczbaPustychWierszy: Math.min(Math.max(Number(zdarzenie.target.value) || 1, 1), 200) }))} /></label>
        : <label htmlFor={`${prefiksId}-uczestnicy`}>Uczestnicy - jedna osoba w wierszu<textarea id={`${prefiksId}-uczestnicy`} rows={12} value={dane.uczestnicy.map((uczestnik) => uczestnik.imieINazwisko).join('\n')} onChange={(zdarzenie) => ustawTekstUczestnikow(zdarzenie.target.value)} /></label>}
    </SekcjaFormularza>
    <SekcjaFormularza tytul="Wygląd dokumentu"><p className="generator-list-obecnosci__opis">Układ A4, logo, nagłówek, kolor tytułu, tabela i podział po 28 uczestników na stronę odpowiadają oryginalnej liście SEMPER. Kolejne strony kontynuują numerację tabeli.</p></SekcjaFormularza>
  </div>
}

export default function WidokListObecnosci() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [dane, ustawDane] = useState(() => deserializujDaneListyObecnosci(localStorage.getItem(kluczSzkicu)))
  const [idDokumentu, ustawIdDokumentu] = useState<string | null>(() => localStorage.getItem(kluczIdDokumentu))
  const [komunikat, ustawKomunikat] = useState<string | null>(null)
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const zapiszDane = useCallback((zapisywaneDane: DaneListyObecnosci) => {
    const tekst = serializujDaneListyObecnosci(zapisywaneDane)
    const dokument = zapiszDokumentRoboczyGeneratora({
      id: idDokumentu,
      typ: 'LISTA_OBECNOSCI',
      generatorId: 'listy_obecnosci',
      tytul: `Lista obecności - ${zapisywaneDane.tytulSzkolenia || 'bez tytułu szkolenia'}`,
      daneDokumentu: { tekst, listaObecnosci: zapisywaneDane },
      ustawieniaDokumentu: { organizator: zapisywaneDane.organizator, trybListy: zapisywaneDane.trybListy },
      autorId: zalogowanyUzytkownik?.id,
      wlascicielId: zalogowanyUzytkownik?.id,
    })
    if (!dokument) throw new Error('Nie udało się zapisać Listy obecności.')
    ustawIdDokumentu(dokument.id)
    localStorage.setItem(kluczIdDokumentu, dokument.id)
  }, [idDokumentu, zalogowanyUzytkownik?.id])
  const stanDokumentu = useStanDokumentu({ dane, zapiszAutomatycznie: zapiszDane })

  useEffect(() => { localStorage.setItem(kluczSzkicu, serializujDaneListyObecnosci(dane)) }, [dane])
  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, () => { void stanDokumentu.zapiszTeraz() })

  async function zapiszWRejestrze() {
    ustawKomunikat(await stanDokumentu.zapiszTeraz() ? 'Listę obecności zapisano w rejestrze dokumentów.' : 'Nie udało się zapisać Listy obecności w rejestrze.')
  }

  function rozpocznijNowaListe() {
    const daneDomyslne = utworzDomyslneDaneListyObecnosci()
    ustawDane(daneDomyslne)
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczIdDokumentu)
    localStorage.setItem(kluczSzkicu, serializujDaneListyObecnosci(daneDomyslne))
    stanDokumentu.oznaczJakoZapisany(daneDomyslne)
    ustawKomunikat('Przywrócono nową Listę obecności.')
  }

  const akcje = <PasekAkcjiGeneratora><PrzyciskPaneluGeneratora>Edytuj listę</PrzyciskPaneluGeneratora><StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} /><button onClick={() => void zapiszWRejestrze()} type="button">Zapisz listę</button><AkcjeEksportuPdf nazwaPliku={utworzNazwePlikuDokumentu('LISTA_OBECNOSCI', dane.tytulSzkolenia || 'szkolenie')} obszarDokumentu={obszarPodgladuRef} /><button onClick={rozpocznijNowaListe} type="button">Nowa lista</button></PasekAkcjiGeneratora>

  return <ObszarZPanelemGeneratora idPanelu="panel-danych-listy-obecnosci" kluczPrzypiecia="ultimate-pomagier.panel-generatora.listy-obecnosci.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.listy-obecnosci.wysuwanie" tytulPanelu="Ustawienia Listy obecności">
    <section className="generator-list-obecnosci"><div className="generator-dokumentu widok"><header className="generator-dokumentu__naglowek"><div><h1>Listy obecności</h1><p>Lista w oryginalnym układzie SEMPER, z automatycznym podziałem stron A4.</p></div>{akcje}{komunikat && <div aria-live="polite" className="generator-dokumentu__komunikat">{komunikat}</div>}</header>
      <PanelBocznyGeneratora><FormularzListyObecnosci dane={dane} prefiksId="panel-listy-obecnosci" ustawDane={ustawDane} /></PanelBocznyGeneratora>
      <UkladFormularzaIPodgladu><PanelGeneratoraDokumentu tytul="Ustawienia Listy obecności" wariant="edycja"><FormularzListyObecnosci dane={dane} prefiksId="formularz-listy-obecnosci" ustawDane={ustawDane} /></PanelGeneratoraDokumentu><PanelGeneratoraDokumentu className="generator-list-obecnosci__podglad" ref={obszarPodgladuRef} tytul="Podgląd A4" wariant="podglad"><RendererListyObecnosci dane={dane} /></PanelGeneratoraDokumentu></UkladFormularzaIPodgladu>
    </div></section>
  </ObszarZPanelemGeneratora>
}
