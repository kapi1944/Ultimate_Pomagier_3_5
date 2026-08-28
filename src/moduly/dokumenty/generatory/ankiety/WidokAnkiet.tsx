import { useCallback, useEffect, useRef, useState, type Dispatch, type DragEvent, type ReactNode, type SetStateAction } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { PanelEdycjiSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import { utworzNazwePlikuDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { zapiszKopieUkladuSwobodnychBlokow } from '../../../../wspolne/dokumenty/szablonyDokumentow'
import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { pobierzMapeZasobowObrazowDokumentu, zapiszZasobObrazuDokumentu } from '../../../../wspolne/dokumenty/zasobyObrazowDokumentu'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import RendererAnkiety from './RendererAnkiety'
import {
  deserializujDaneAnkiety,
  etykietyPresetowAnkiety,
  etykietyTypowPytanAnkiety,
  nazwyOrganizatorowAnkiety,
  podzielAnkieteNaStrony,
  serializujDaneAnkiety,
  utworzBlokiSzablonuAnkiety,
  utworzDomyslneDaneAnkiety,
  zastosujPresetAnkiety,
  type DaneAnkiety,
  type PresetAnkiety,
  type SekcjaAnkiety,
  type TypPytaniaAnkiety,
} from './modelAnkiety'
import './widokAnkiet.css'

const kluczSzkicu = 'ultimate-pomagier.ankiety.szkic'
const kluczIdDokumentu = `${kluczSzkicu}.dokumentId`

function utworzId(prefiks: string) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? `${prefiks}-${crypto.randomUUID()}` : `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function SekcjaFormularza({ children, domyslnieOtwarta = false, tytul }: { children: ReactNode; domyslnieOtwarta?: boolean; tytul: string }) {
  return <details className="generator-ankiet__sekcja" open={domyslnieOtwarta}><summary>{tytul}</summary><div className="generator-ankiet__zawartosc-sekcji">{children}</div></details>
}

type ZmienDane = (aktualizacja: (obecne: DaneAnkiety) => DaneAnkiety) => void

function EdytorSekcjiAnkiety({ dane, zmienDane }: { dane: DaneAnkiety; zmienDane: ZmienDane }) {
  const [przeciaganePytanie, ustawPrzeciaganePytanie] = useState<{ sekcjaId: string; pytanieId: string } | null>(null)
  const zmienSekcje = (id: string, aktualizacja: (sekcja: SekcjaAnkiety) => SekcjaAnkiety) => zmienDane((obecne) => ({ ...obecne, sekcje: obecne.sekcje.map((sekcja) => sekcja.id === id ? aktualizacja(sekcja) : sekcja) }))

  function upuscPytanie(zdarzenie: DragEvent, sekcjaId: string, pytanieDoceloweId: string) {
    zdarzenie.preventDefault()
    if (!przeciaganePytanie || przeciaganePytanie.sekcjaId !== sekcjaId || przeciaganePytanie.pytanieId === pytanieDoceloweId) return
    zmienSekcje(sekcjaId, (sekcja) => {
      const pytania = [...sekcja.pytania]
      const zrodlo = pytania.findIndex((pytanie) => pytanie.id === przeciaganePytanie.pytanieId)
      const cel = pytania.findIndex((pytanie) => pytanie.id === pytanieDoceloweId)
      if (zrodlo < 0 || cel < 0) return sekcja
      const [pytanie] = pytania.splice(zrodlo, 1)
      pytania.splice(cel, 0, pytanie)
      return { ...sekcja, pytania }
    })
    ustawPrzeciaganePytanie(null)
  }

  function przeniesSekcje(indeks: number, przesuniecie: -1 | 1) {
    zmienDane((obecne) => {
      const cel = indeks + przesuniecie
      if (cel < 0 || cel >= obecne.sekcje.length) return obecne
      const sekcje = [...obecne.sekcje]
      ;[sekcje[indeks], sekcje[cel]] = [sekcje[cel], sekcje[indeks]]
      return { ...obecne, sekcje }
    })
  }

  return <div className="generator-ankiet__edytor-sekcji">
    {dane.sekcje.map((sekcja, indeksSekcji) => <article className="generator-ankiet__karta-sekcji" key={sekcja.id}>
      <header><label className="generator-ankiet__widocznosc-sekcji"><input checked={sekcja.widoczna} type="checkbox" onChange={(zdarzenie) => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, widoczna: zdarzenie.target.checked }))} /> Włączona</label><div className="generator-ankiet__kolejnosc-sekcji"><button aria-label={`Przenieś sekcję wyżej: ${sekcja.nazwa}`} disabled={indeksSekcji === 0} onClick={() => przeniesSekcje(indeksSekcji, -1)} type="button">↑</button><button aria-label={`Przenieś sekcję niżej: ${sekcja.nazwa}`} disabled={indeksSekcji === dane.sekcje.length - 1} onClick={() => przeniesSekcje(indeksSekcji, 1)} type="button">↓</button></div></header>
      <label>Nazwa sekcji<input value={sekcja.nazwa} onChange={(zdarzenie) => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, nazwa: zdarzenie.target.value }))} /></label>
      <label>Opis opcjonalny<input value={sekcja.opis ?? ''} onChange={(zdarzenie) => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, opis: zdarzenie.target.value }))} /></label>
      <ol className="generator-ankiet__lista-pytan">{sekcja.pytania.map((pytanie) => <li className="generator-ankiet__pytanie" draggable key={pytanie.id} onDragStart={() => ustawPrzeciaganePytanie({ sekcjaId: sekcja.id, pytanieId: pytanie.id })} onDragOver={(zdarzenie) => zdarzenie.preventDefault()} onDrop={(zdarzenie) => upuscPytanie(zdarzenie, sekcja.id, pytanie.id)}>
        <span aria-hidden="true" className="generator-ankiet__uchwyt-pytania">⋮⋮</span><div><input aria-label="Treść pytania" value={pytanie.tekst} onChange={(zdarzenie) => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, pytania: obecna.pytania.map((pozycja) => pozycja.id === pytanie.id ? { ...pozycja, tekst: zdarzenie.target.value } : pozycja) }))} /><select aria-label="Typ pytania" value={pytanie.typ} onChange={(zdarzenie) => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, pytania: obecna.pytania.map((pozycja) => pozycja.id === pytanie.id ? { ...pozycja, typ: zdarzenie.target.value as TypPytaniaAnkiety } : pozycja) }))}>{Object.entries(etykietyTypowPytanAnkiety).map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></div><div className="generator-ankiet__akcje-pytania"><button onClick={() => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, pytania: [...obecna.pytania, { ...pytanie, id: utworzId('pytanie'), tekst: `${pytanie.tekst} — kopia` }] }))} type="button">Duplikuj</button><button className="generator-ankiet__akcja-usun" onClick={() => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, pytania: obecna.pytania.filter((pozycja) => pozycja.id !== pytanie.id) }))} type="button">Usuń</button></div>
      </li>)}</ol>
      <button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienSekcje(sekcja.id, (obecna) => ({ ...obecna, pytania: [...obecna.pytania, { id: utworzId('pytanie'), typ: 'OCENA_4', tekst: 'Nowe pytanie' }] }))} type="button">Dodaj pytanie</button>
    </article>)}
    <button className="generator-ankiet__przycisk-pomocniczy" onClick={() => zmienDane((obecne) => ({ ...obecne, sekcje: [...obecne.sekcje, { id: utworzId('sekcja'), nazwa: 'Nowa sekcja', widoczna: true, pytania: [] }] }))} type="button">Dodaj sekcję</button>
  </div>
}

function FormularzAnkiety({ dane, prefiksId, ustawDane }: { dane: DaneAnkiety; prefiksId: string; ustawDane: Dispatch<SetStateAction<DaneAnkiety>> }) {
  const zmienDane: ZmienDane = (aktualizacja) => ustawDane(aktualizacja)
  const utworzKopie = () => ustawDane((obecne) => zastosujPresetAnkiety(obecne, 'WLASNA'))
  return <div className="generator-ankiet__formularz">
    <SekcjaFormularza domyslnieOtwarta tytul="Dane szkolenia"><div className="generator-ankiet__siatka-pol"><label className="generator-ankiet__pole-szerokie" htmlFor={`${prefiksId}-tytul`}>Tytuł szkolenia<input id={`${prefiksId}-tytul`} value={dane.tytulSzkolenia} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, tytulSzkolenia: zdarzenie.target.value }))} /></label><label htmlFor={`${prefiksId}-data-od`}>Data od<input id={`${prefiksId}-data-od`} type="date" value={dane.dataOd} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, dataOd: zdarzenie.target.value }))} /></label><label htmlFor={`${prefiksId}-data-do`}>Data do<input id={`${prefiksId}-data-do`} type="date" value={dane.dataDo} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, dataDo: zdarzenie.target.value }))} /></label><label className="generator-ankiet__pole-szerokie" htmlFor={`${prefiksId}-miejsce`}>Miejsce<input id={`${prefiksId}-miejsce`} value={dane.miejsce} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, miejsce: zdarzenie.target.value }))} /></label><label className="generator-ankiet__pole-szerokie" htmlFor={`${prefiksId}-trener`}>Trener / ekspert<input id={`${prefiksId}-trener`} value={dane.trener} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, trener: zdarzenie.target.value }))} /></label></div></SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Szablon i organizator"><label htmlFor={`${prefiksId}-preset`}>Aktywny preset<select id={`${prefiksId}-preset`} value={dane.preset} onChange={(zdarzenie) => ustawDane((obecne) => zastosujPresetAnkiety(obecne, zdarzenie.target.value as PresetAnkiety))}>{Object.entries(etykietyPresetowAnkiety).map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></label><p className="generator-ankiet__aktywny-preset">Aktywny: <strong>{etykietyPresetowAnkiety[dane.preset]}</strong></p><label htmlFor={`${prefiksId}-organizator`}>Organizator<select id={`${prefiksId}-organizator`} value={dane.organizator} onChange={(zdarzenie) => zmienDane((obecne) => ({ ...obecne, preset: 'WLASNA', organizator: zdarzenie.target.value === 'IIST' ? 'IIST' : 'SEMPER' }))}>{Object.entries(nazwyOrganizatorowAnkiety).map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></label></SekcjaFormularza>
    <SekcjaFormularza domyslnieOtwarta tytul="Treść ankiety">{dane.preset === 'WLASNA' ? <EdytorSekcjiAnkiety dane={dane} zmienDane={zmienDane} /> : <div className="generator-ankiet__ochrona-presets"><p>Treść firmowego presetu jest chroniona przed przypadkową zmianą.</p><button className="generator-ankiet__przycisk-pomocniczy" onClick={utworzKopie} type="button">Utwórz własną kopię do edycji</button></div>}</SekcjaFormularza>
    <SekcjaFormularza tytul="Wygląd dokumentu"><p className="generator-ankiet__opis-wygladu">Logo, tytuł, numer strony i własne napisy edytujesz bezpośrednio na podglądzie po otwarciu wspólnego panelu. Geometria jest zapisywana w milimetrach i nie zależy od skali podglądu.</p></SekcjaFormularza>
  </div>
}

export default function WidokAnkiet() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [dane, ustawDane] = useState(() => deserializujDaneAnkiety(localStorage.getItem(kluczSzkicu)))
  const [idDokumentu, ustawIdDokumentu] = useState<string | null>(() => localStorage.getItem(kluczIdDokumentu))
  const [komunikat, ustawKomunikat] = useState<string | null>(null)
  const [zaznaczonyBlokId, ustawZaznaczonyBlokId] = useState<string | null>(null)
  const [trybEdycjiSzablonu, ustawTrybEdycjiSzablonu] = useState(false)
  const [zasobyObrazow, ustawZasobyObrazow] = useState(() => pobierzMapeZasobowObrazowDokumentu())
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const liczbaStron = podzielAnkieteNaStrony(dane).length
  const zapiszDane = useCallback((zapisywaneDane: DaneAnkiety) => {
    const tekst = serializujDaneAnkiety(zapisywaneDane)
    const dokument = zapiszDokumentRoboczyGeneratora({ id: idDokumentu, typ: 'ANKIETA', generatorId: 'ankiety', tytul: `Ankieta — ${zapisywaneDane.tytulSzkolenia || 'bez tytułu szkolenia'}`, daneDokumentu: { tekst, ankieta: zapisywaneDane }, ustawieniaDokumentu: { wariantSzablonu: zapisywaneDane.wariantSzablonu, preset: zapisywaneDane.preset }, autorId: zalogowanyUzytkownik?.id, wlascicielId: zalogowanyUzytkownik?.id })
    if (!dokument) throw new Error('Nie udało się zapisać ankiety.')
    ustawIdDokumentu(dokument.id); localStorage.setItem(kluczIdDokumentu, dokument.id)
  }, [idDokumentu, zalogowanyUzytkownik?.id])
  const stanDokumentu = useStanDokumentu({ dane, zapiszAutomatycznie: zapiszDane })
  useEffect(() => { localStorage.setItem(kluczSzkicu, serializujDaneAnkiety(dane)) }, [dane])
  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, () => { void stanDokumentu.zapiszTeraz() })

  async function dodajObraz(plik: File) { const klucz = await zapiszZasobObrazuDokumentu(plik); ustawZasobyObrazow(pobierzMapeZasobowObrazowDokumentu()); ustawKomunikat('Obraz zapisano raz we wspólnych zasobach dokumentów.'); return klucz }
  function rozpocznijNowaAnkiete() { const nowe = utworzDomyslneDaneAnkiety(); ustawDane(nowe); ustawIdDokumentu(null); ustawZaznaczonyBlokId(null); localStorage.removeItem(kluczIdDokumentu); localStorage.setItem(kluczSzkicu, serializujDaneAnkiety(nowe)); stanDokumentu.oznaczJakoZapisany(nowe); ustawKomunikat('Przywrócono nową ankietę z pełnym presetem oryginalnym.') }
  function zapiszKopieUkladu() { const nazwa = `Ankieta ${dane.organizator} — układ ${new Date().toLocaleDateString('pl-PL')}`; const szablon = zapiszKopieUkladuSwobodnychBlokow({ nazwa, organizator: dane.organizator, autor: zalogowanyUzytkownik?.id ?? 'Użytkownik', bloki: dane.blokiSwobodne, tytulSzkolenia: dane.tytulSzkolenia }); ustawKomunikat(`Zapisano kopię układu w kartotece szablonów: ${szablon.nazwa}.`) }
  const akcje = <PasekAkcjiGeneratora><PrzyciskPaneluGeneratora>Edytuj układ</PrzyciskPaneluGeneratora><StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} /><button onClick={() => void stanDokumentu.zapiszTeraz().then((wynik) => ustawKomunikat(wynik ? 'Ankietę zapisano w rejestrze dokumentów.' : 'Nie udało się zapisać ankiety.'))} type="button">Zapisz ankietę</button><AkcjeEksportuPdf nazwaPliku={utworzNazwePlikuDokumentu('ANKIETA', dane.tytulSzkolenia || 'ewaluacyjna')} obszarDokumentu={obszarPodgladuRef} /><button onClick={rozpocznijNowaAnkiete} type="button">Nowa ankieta</button></PasekAkcjiGeneratora>

  return <ObszarZPanelemGeneratora idPanelu="panel-danych-ankiety" kluczPrzypiecia="ultimate-pomagier.panel-generatora.ankiety.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.ankiety.wysuwanie" tytulPanelu="Ustawienia układu ankiety"><section className="generator-ankiet"><div className="generator-dokumentu widok"><header className="generator-dokumentu__naglowek"><div><h1>Ankiety</h1><p>{etykietyPresetowAnkiety[dane.preset]} · {liczbaStron} {liczbaStron === 1 ? 'strona' : 'strony'} A4</p></div>{akcje}{komunikat && <div aria-live="polite" className="generator-dokumentu__komunikat">{komunikat}</div>}</header>
    <PanelBocznyGeneratora><PanelEdycjiSwobodnychBlokow bloki={dane.blokiSwobodne} blokiSzablonu={utworzBlokiSzablonuAnkiety(dane.wariantSzablonu)} liczbaStron={liczbaStron} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onDodajObraz={dodajObraz} onZmienBloki={(blokiSwobodne) => ustawDane((obecne) => ({ ...obecne, blokiSwobodne }))} onZmienTrybEdycjiSzablonu={ustawTrybEdycjiSzablonu} /><button className="generator-ankiet__przycisk-pomocniczy" onClick={zapiszKopieUkladu} type="button">Zapisz układ jako kopię szablonu</button></PanelBocznyGeneratora>
    <UkladFormularzaIPodgladu><PanelGeneratoraDokumentu tytul="Ustawienia ankiety" wariant="edycja"><FormularzAnkiety dane={dane} prefiksId="formularz-ankiety" ustawDane={ustawDane} /></PanelGeneratoraDokumentu><PanelGeneratoraDokumentu className="generator-ankiet__podglad" ref={obszarPodgladuRef} tytul={`Podgląd A4 — ${liczbaStron} str.`} wariant="podglad"><RendererAnkiety dane={dane} zasobyObrazow={zasobyObrazow} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznaczBlok={ustawZaznaczonyBlokId} onZmienBlok={(blok) => ustawDane((obecne) => ({ ...obecne, blokiSwobodne: obecne.blokiSwobodne.map((pozycja) => pozycja.id === blok.id ? blok : pozycja) }))} /></PanelGeneratoraDokumentu></UkladFormularzaIPodgladu>
  </div></section></ObszarZPanelemGeneratora>
}
