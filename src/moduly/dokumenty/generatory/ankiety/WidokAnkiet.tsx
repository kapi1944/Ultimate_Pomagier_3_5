import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { utworzNazwePlikuDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import RendererAnkiety from './RendererAnkiety'
import {
  deserializujDaneAnkiety,
  domyslnePytaniaOceniane,
  domyslnePytaniaOtwarte,
  etykietyWariantowAnkiety,
  nazwyOrganizatorowAnkiety,
  serializujDaneAnkiety,
  zastosujWariantSzablonu,
  utworzDomyslneDaneAnkiety,
  type DaneAnkiety,
  type SekcjaPytaniaOcenianego,
  type WidocznoscSekcjiAnkiety,
  type WariantSzablonuAnkiety,
} from './modelAnkiety'
import './widokAnkiet.css'

const kluczSzkicu = 'ultimate-pomagier.ankiety.szkic'
const kluczIdDokumentu = `${kluczSzkicu}.dokumentId`
const sekcjePytanOcenianych: Array<{ symbol: SekcjaPytaniaOcenianego; tytul: string }> = [
  { symbol: 'A', tytul: 'Ogólna ocena szkolenia' },
  { symbol: 'B', tytul: 'Ocena trenerów' },
  { symbol: 'C', tytul: 'Ocena organizacji szkolenia' },
]

function utworzIdPytania(prefiks: string) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefiks}-${crypto.randomUUID()}`
    : `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function SekcjaFormularza({ children, domyslnieOtwarta = false, tytul }: { children: ReactNode; domyslnieOtwarta?: boolean; tytul: string }) {
  return <details className="generator-ankiet__sekcja" open={domyslnieOtwarta}><summary>{tytul}</summary><div className="generator-ankiet__zawartosc-sekcji">{children}</div></details>
}

function AkcjePytania({ czyPierwsze, czyOstatnie, opis, przenies, usun }: { czyPierwsze: boolean; czyOstatnie: boolean; opis: string; przenies: (przesuniecie: -1 | 1) => void; usun: () => void }) {
  return <div className="generator-ankiet__akcje-pytania">
    <button aria-label={`Przenieś wyżej: ${opis}`} disabled={czyPierwsze} onClick={() => przenies(-1)} type="button">↑</button>
    <button aria-label={`Przenieś niżej: ${opis}`} disabled={czyOstatnie} onClick={() => przenies(1)} type="button">↓</button>
    <button aria-label={`Usuń: ${opis}`} onClick={usun} type="button">Usuń</button>
  </div>
}

type ZmienDane = (aktualizacja: (obecne: DaneAnkiety) => DaneAnkiety) => void

function EdytorPytanOcenianych({ dane, zmienDane }: { dane: DaneAnkiety; zmienDane: ZmienDane }) {
  function przeniesPytanie(id: string, przesuniecie: -1 | 1) {
    zmienDane((obecne) => {
      const indeksZrodlowy = obecne.pytaniaOceniane.findIndex((pozycja) => pozycja.id === id)
      const pytanie = obecne.pytaniaOceniane[indeksZrodlowy]
      if (!pytanie) return obecne
      const indeksySekcji = obecne.pytaniaOceniane.map((pozycja, indeks) => pozycja.sekcja === pytanie.sekcja ? indeks : -1).filter((indeks) => indeks >= 0)
      const pozycjaWSekcji = indeksySekcji.indexOf(indeksZrodlowy)
      const indeksDocelowy = indeksySekcji[pozycjaWSekcji + przesuniecie]
      if (indeksDocelowy === undefined) return obecne
      const pytaniaOceniane = [...obecne.pytaniaOceniane]
      ;[pytaniaOceniane[indeksZrodlowy], pytaniaOceniane[indeksDocelowy]] = [pytaniaOceniane[indeksDocelowy], pytaniaOceniane[indeksZrodlowy]]
      return { ...obecne, pytaniaOceniane }
    })
  }

  return <>
    {sekcjePytanOcenianych.map((sekcja) => {
      const pytania = dane.pytaniaOceniane.filter((pytanie) => pytanie.sekcja === sekcja.symbol)
      return <div key={sekcja.symbol}><h3>{sekcja.symbol}. {sekcja.tytul}</h3><ol className="generator-ankiet__lista-pytan">
        {pytania.map((pytanie, indeks) => <li className="generator-ankiet__pytanie" key={pytanie.id}>
          <label>Treść pytania {indeks + 1}<textarea value={pytanie.tekst} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, pytaniaOceniane: obecne.pytaniaOceniane.map((pozycja) => pozycja.id === pytanie.id ? { ...pozycja, tekst: zdarzenie.target.value } : pozycja) }))} /></label>
          <AkcjePytania czyOstatnie={indeks === pytania.length - 1} czyPierwsze={indeks === 0} opis={pytanie.tekst} przenies={(przesuniecie) => przeniesPytanie(pytanie.id, przesuniecie)} usun={() => zmienDane((obecne) => ({ ...obecne, pytaniaOceniane: obecne.pytaniaOceniane.filter((pozycja) => pozycja.id !== pytanie.id) }))} />
        </li>)}
      </ol><button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienDane((obecne) => ({ ...obecne, pytaniaOceniane: [...obecne.pytaniaOceniane, { id: utworzIdPytania('ocena'), sekcja: sekcja.symbol, tekst: 'Nowe pytanie oceniane.' }] }))} type="button">Dodaj pytanie do sekcji {sekcja.symbol}</button></div>
    })}
    <button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienDane((obecne) => ({ ...obecne, pytaniaOceniane: domyslnePytaniaOceniane.map((pytanie) => ({ ...pytanie })) }))} type="button">Przywróć domyślne pytania oceniane</button>
  </>
}

function EdytorPytanOtwartych({ dane, zmienDane }: { dane: DaneAnkiety; zmienDane: ZmienDane }) {
  function przeniesPytanie(indeks: number, przesuniecie: -1 | 1) {
    zmienDane((obecne) => {
      const indeksDocelowy = indeks + przesuniecie
      if (indeksDocelowy < 0 || indeksDocelowy >= obecne.pytaniaOtwarte.length) return obecne
      const pytaniaOtwarte = [...obecne.pytaniaOtwarte]
      ;[pytaniaOtwarte[indeks], pytaniaOtwarte[indeksDocelowy]] = [pytaniaOtwarte[indeksDocelowy], pytaniaOtwarte[indeks]]
      return { ...obecne, pytaniaOtwarte }
    })
  }

  return <><ol className="generator-ankiet__lista-pytan">
    {dane.pytaniaOtwarte.map((pytanie, indeks) => <li className="generator-ankiet__pytanie" key={pytanie.id}>
      <label>Treść pytania {indeks + 1}<textarea value={pytanie.tekst} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, pytaniaOtwarte: obecne.pytaniaOtwarte.map((pozycja) => pozycja.id === pytanie.id ? { ...pozycja, tekst: zdarzenie.target.value } : pozycja) }))} /></label>
      <AkcjePytania czyOstatnie={indeks === dane.pytaniaOtwarte.length - 1} czyPierwsze={indeks === 0} opis={pytanie.tekst} przenies={(przesuniecie) => przeniesPytanie(indeks, przesuniecie)} usun={() => zmienDane((obecne) => ({ ...obecne, pytaniaOtwarte: obecne.pytaniaOtwarte.filter((pozycja) => pozycja.id !== pytanie.id) }))} />
    </li>)}
  </ol>
    <button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienDane((obecne) => ({ ...obecne, pytaniaOtwarte: [...obecne.pytaniaOtwarte, { id: utworzIdPytania('otwarte'), tekst: 'Nowe pytanie otwarte.' }] }))} type="button">Dodaj pytanie otwarte</button>
    <button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienDane((obecne) => ({ ...obecne, pytaniaOtwarte: domyslnePytaniaOtwarte.map((pytanie) => ({ ...pytanie })) }))} type="button">Przywróć domyślne pytania otwarte</button>
  </>
}

function FormularzAnkiety({ dane, prefiksId, ustawDane }: { dane: DaneAnkiety; prefiksId: string; ustawDane: Dispatch<SetStateAction<DaneAnkiety>> }) {
  const zmienDane: ZmienDane = (aktualizacja) => ustawDane(aktualizacja)
  const zmienWidocznosc = (klucz: keyof WidocznoscSekcjiAnkiety, wartosc: boolean) => zmienDane((obecne) => ({ ...obecne, widocznoscSekcji: { ...obecne.widocznoscSekcji, [klucz]: wartosc } }))

  return <div className="generator-ankiet__formularz">
    <SekcjaFormularza domyslnieOtwarta tytul="Dane szkolenia"><div className="generator-ankiet__siatka-pol">
      <label className="generator-ankiet__pole-szerokie" htmlFor={`${prefiksId}-tytul`}>Tytuł szkolenia<input id={`${prefiksId}-tytul`} value={dane.tytulSzkolenia} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, tytulSzkolenia: zdarzenie.target.value }))} /></label>
      <label htmlFor={`${prefiksId}-data-od`}>Data od<input id={`${prefiksId}-data-od`} type="date" value={dane.dataOd} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, dataOd: zdarzenie.target.value }))} /></label>
      <label htmlFor={`${prefiksId}-data-do`}>Data do<input id={`${prefiksId}-data-do`} type="date" value={dane.dataDo} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, dataDo: zdarzenie.target.value }))} /></label>
      <label className="generator-ankiet__pole-szerokie" htmlFor={`${prefiksId}-miejsce`}>Miejsce<input id={`${prefiksId}-miejsce`} value={dane.miejsce} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, miejsce: zdarzenie.target.value }))} /></label>
    </div></SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Organizator i prowadzący">
      <label htmlFor={`${prefiksId}-organizator`}>Organizator<select id={`${prefiksId}-organizator`} value={dane.organizator} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, organizator: zdarzenie.target.value === 'IIST' ? 'IIST' : 'SEMPER' }))}>{Object.entries(nazwyOrganizatorowAnkiety).map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></label>
      <label htmlFor={`${prefiksId}-trener`}>Trener / ekspert<input id={`${prefiksId}-trener`} value={dane.trener} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, trener: zdarzenie.target.value }))} /></label>
    </SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Treść ankiety"><label htmlFor={`${prefiksId}-wariant`}>Wariant szablonu<select id={`${prefiksId}-wariant`} value={dane.wariantSzablonu} onChange={(zdarzenie) => zmienDane((obecne) => zastosujWariantSzablonu(obecne, zdarzenie.target.value as WariantSzablonuAnkiety))}>{Object.entries(etykietyWariantowAnkiety).map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></label><p className="generator-ankiet__opis-wygladu">Wariant pełny zawiera końcową sekcję uwag i reakcji Organizatora. Wariant skrócony pozostawia ją wyłączoną.</p></SekcjaFormularza>
    <SekcjaFormularza tytul="Pytania oceniane"><EdytorPytanOcenianych dane={dane} zmienDane={zmienDane} /></SekcjaFormularza>
    <SekcjaFormularza tytul="Pytania otwarte"><EdytorPytanOtwartych dane={dane} zmienDane={zmienDane} /></SekcjaFormularza>
    <SekcjaFormularza tytul="Sekcje dodatkowe"><div className="generator-ankiet__przelaczniki">{([
      ['ocenaOgolna', 'Ogólna ocena szkolenia'], ['ocenaTrenerow', 'Ocena trenerów'], ['ocenaOrganizacji', 'Ocena organizacji szkolenia'], ['pytaniaOtwarte', 'Pytania otwarte'], ['poleEmail', 'Informacja i pole e-mail'], ['uwagiISugestie', 'Uwagi, sugestie i reakcja Organizatora'],
    ] as Array<[keyof WidocznoscSekcjiAnkiety, string]>).map(([klucz, etykieta]) => <label key={klucz}><input checked={dane.widocznoscSekcji[klucz]} type="checkbox" onChange={(zdarzenie) => zmienWidocznosc(klucz, zdarzenie.target.checked)} /> {etykieta}</label>)}</div></SekcjaFormularza>
    <SekcjaFormularza tytul="Wygląd dokumentu"><p className="generator-ankiet__opis-wygladu">Układ A4, skala ocen, fizyczne pola do zaznaczania, numeracja stron i logo są zgodne z oryginalnymi ankietami. Branding zmienia się automatycznie wraz z Organizatorem.</p></SekcjaFormularza>
  </div>
}

export default function WidokAnkiet() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [dane, ustawDane] = useState(() => deserializujDaneAnkiety(localStorage.getItem(kluczSzkicu)))
  const [idDokumentu, ustawIdDokumentu] = useState<string | null>(() => localStorage.getItem(kluczIdDokumentu))
  const [komunikat, ustawKomunikat] = useState<string | null>(null)
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const zapiszDane = useCallback((zapisywaneDane: DaneAnkiety) => {
    const tekst = serializujDaneAnkiety(zapisywaneDane)
    const dokument = zapiszDokumentRoboczyGeneratora({ id: idDokumentu, typ: 'ANKIETA', generatorId: 'ankiety', tytul: `Ankieta — ${zapisywaneDane.tytulSzkolenia || 'bez tytułu szkolenia'}`, daneDokumentu: { tekst, ankieta: zapisywaneDane }, ustawieniaDokumentu: { wariantSzablonu: zapisywaneDane.wariantSzablonu }, autorId: zalogowanyUzytkownik?.id, wlascicielId: zalogowanyUzytkownik?.id })
    if (!dokument) throw new Error('Nie udało się zapisać ankiety.')
    ustawIdDokumentu(dokument.id)
    localStorage.setItem(kluczIdDokumentu, dokument.id)
  }, [idDokumentu, zalogowanyUzytkownik?.id])
  const stanDokumentu = useStanDokumentu({ dane, zapiszAutomatycznie: zapiszDane })

  useEffect(() => { localStorage.setItem(kluczSzkicu, serializujDaneAnkiety(dane)) }, [dane])
  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, () => { void stanDokumentu.zapiszTeraz() })

  async function zapiszWRejestrze() {
    ustawKomunikat(await stanDokumentu.zapiszTeraz() ? 'Ankietę zapisano w rejestrze dokumentów.' : 'Nie udało się zapisać ankiety w rejestrze.')
  }

  function rozpocznijNowaAnkiete() {
    const daneDomyslne = utworzDomyslneDaneAnkiety()
    ustawDane(daneDomyslne)
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczIdDokumentu)
    localStorage.setItem(kluczSzkicu, serializujDaneAnkiety(daneDomyslne))
    stanDokumentu.oznaczJakoZapisany(daneDomyslne)
    ustawKomunikat('Przywrócono nową ankietę z pełną treścią oryginalnego szablonu.')
  }

  const akcje = <PasekAkcjiGeneratora><PrzyciskPaneluGeneratora>Edytuj ankietę</PrzyciskPaneluGeneratora><StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} /><button onClick={() => void zapiszWRejestrze()} type="button">Zapisz ankietę</button><AkcjeEksportuPdf nazwaPliku={utworzNazwePlikuDokumentu('ANKIETA', dane.tytulSzkolenia || 'ewaluacyjna')} obszarDokumentu={obszarPodgladuRef} /><button onClick={rozpocznijNowaAnkiete} type="button">Nowa ankieta</button></PasekAkcjiGeneratora>

  return <ObszarZPanelemGeneratora idPanelu="panel-danych-ankiety" kluczPrzypiecia="ultimate-pomagier.panel-generatora.ankiety.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.ankiety.wysuwanie" tytulPanelu="Ustawienia ankiety">
    <section className="generator-ankiet"><div className="generator-dokumentu widok"><header className="generator-dokumentu__naglowek"><div><h1>Ankiety</h1><p>Oryginalne ankiety ewaluacyjne SEMPER i IIST w układzie dwóch stron A4.</p></div>{akcje}{komunikat && <div aria-live="polite" className="generator-dokumentu__komunikat">{komunikat}</div>}</header>
      <PanelBocznyGeneratora><FormularzAnkiety dane={dane} prefiksId="panel-ankiety" ustawDane={ustawDane} /></PanelBocznyGeneratora>
      <UkladFormularzaIPodgladu><PanelGeneratoraDokumentu tytul="Ustawienia ankiety" wariant="edycja"><FormularzAnkiety dane={dane} prefiksId="formularz-ankiety" ustawDane={ustawDane} /></PanelGeneratoraDokumentu><PanelGeneratoraDokumentu className="generator-ankiet__podglad" ref={obszarPodgladuRef} tytul="Podgląd A4" wariant="podglad"><RendererAnkiety dane={dane} /></PanelGeneratoraDokumentu></UkladFormularzaIPodgladu>
    </div></section>
  </ObszarZPanelemGeneratora>
}
