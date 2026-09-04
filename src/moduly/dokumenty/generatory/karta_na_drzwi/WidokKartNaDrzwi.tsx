import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { PanelEdycjiSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import { zbudujNazweEksportowanegoDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { pobierzMapeZasobowObrazowDokumentu, zapiszZasobObrazuDokumentu } from '../../../../wspolne/dokumenty/zasobyObrazowDokumentu'
import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { pobierzSzczegolyDoGeneratorow, zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { pobierzNazweOpiekuna } from '../../../zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow'
import UkladGeneratoraDokumentu, { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PanelGeneratoraDokumentu, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora, UkladFormularzaIPodgladu } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
import { deserializujDaneKartyNaDrzwi, pobierzDaneKartyNaDrzwi, serializujDaneKartyNaDrzwi, utworzBlokiSzablonuKartyNaDrzwi, utworzDaneKartyNaDrzwiZKontekstu, utworzDomyslneDaneKartyNaDrzwi, type DaneKartyNaDrzwi, type OrientacjaKartyNaDrzwi } from './modelKartyNaDrzwi'
import RendererKartyNaDrzwi from './RendererKartyNaDrzwi'
import './widokKartNaDrzwi.css'

const kluczSzkicu = 'ultimate-pomagier.karta-na-drzwi.szkic'
const kluczId = 'ultimate-pomagier.karta-na-drzwi.dokumentId'

export default function WidokKartNaDrzwi() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [dane, ustawDane] = useState(() => deserializujDaneKartyNaDrzwi(localStorage.getItem(kluczSzkicu)))
  const [idDokumentu, ustawIdDokumentu] = useState<string | null>(() => localStorage.getItem(kluczId))
  const [zaznaczonyBlokId, ustawZaznaczonyBlokId] = useState<string | null>(null)
  const [trybEdycjiSzablonu, ustawTrybEdycjiSzablonu] = useState(false)
  const [zasobyObrazow, ustawZasobyObrazow] = useState(() => pobierzMapeZasobowObrazowDokumentu())
  const [komunikat, ustawKomunikat] = useState<string | null>(null)
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const szczegoly = useMemo(() => pobierzSzczegolyDoGeneratorow(), [])
  const wybraneSzczegoly = szczegoly.find((pozycja) => pozycja.id === dane.szczegolyOrganizacyjneId) ?? null

  const zapiszDane = useCallback((wartosc: DaneKartyNaDrzwi) => {
    const dokument = zapiszDokumentRoboczyGeneratora({
      id: idDokumentu,
      typ: 'KARTA_NA_DRZWI',
      generatorId: 'karta_na_drzwi',
      tytul: `Karta na drzwi — ${pobierzDaneKartyNaDrzwi(wartosc.daneWejsciowe).tytulSzkolenia}`,
      daneDokumentu: { tekst: serializujDaneKartyNaDrzwi(wartosc), kartaNaDrzwi: wartosc },
      ustawieniaDokumentu: { orientacja: wartosc.orientacja, blokiSwobodne: wartosc.blokiSwobodne, szczegolyOrganizacyjneId: wartosc.szczegolyOrganizacyjneId, grupaId: wartosc.grupaId },
      autorId: zalogowanyUzytkownik?.id,
      wlascicielId: zalogowanyUzytkownik?.id,
    })
    if (!dokument) throw new Error('Nie udało się zapisać Karty na drzwi.')
    ustawIdDokumentu(dokument.id)
    localStorage.setItem(kluczId, dokument.id)
  }, [idDokumentu, zalogowanyUzytkownik?.id])

  const stanDokumentu = useStanDokumentu({ dane, zapiszAutomatycznie: zapiszDane })
  useEffect(() => localStorage.setItem(kluczSzkicu, serializujDaneKartyNaDrzwi(dane)), [dane])
  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, () => { void stanDokumentu.zapiszTeraz() })

  const daneNazwyEksportu = { typDokumentu: 'KARTA_NA_DRZWI' as const, ...pobierzDaneKartyNaDrzwi(dane.daneWejsciowe), dataUtworzenia: new Date() }

  async function dodajObraz(plik: File) {
    const klucz = await zapiszZasobObrazuDokumentu(plik)
    ustawZasobyObrazow(pobierzMapeZasobowObrazowDokumentu())
    return klucz
  }

  function wybierzSzczegoly(szczegolyId: string) {
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczId)
    ustawDane((obecne) => ({ ...obecne, szczegolyOrganizacyjneId: szczegolyId || null, grupaId: null }))
  }

  function wybierzGrupe(grupaId: string) {
    if (!wybraneSzczegoly || !grupaId) {
      ustawDane((obecne) => ({ ...obecne, grupaId: null }))
      return
    }
    const kontekst = zbudujKontekstZeSzczegolow(wybraneSzczegoly.zrodloKontekstu)
    const automatyczneDane = utworzDaneKartyNaDrzwiZKontekstu(kontekst, grupaId, pobierzNazweOpiekuna(wybraneSzczegoly.opiekunId))
    if (!automatyczneDane) return
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczId)
    ustawDane(automatyczneDane)
    ustawKomunikat('Utworzono osobną Kartę dla wybranej grupy. Dane możesz ręcznie skorygować.')
  }

  function zmienOrientacje(orientacja: OrientacjaKartyNaDrzwi) {
    ustawDane((obecne) => ({ ...obecne, orientacja, blokiSwobodne: utworzBlokiSzablonuKartyNaDrzwi(orientacja) }))
  }

  function rozpocznijNowaKarte() {
    const nowa = utworzDomyslneDaneKartyNaDrzwi()
    ustawDane(nowa)
    ustawIdDokumentu(null)
    ustawZaznaczonyBlokId(null)
    localStorage.removeItem(kluczId)
    stanDokumentu.oznaczJakoZapisany(nowa)
  }

  const akcje = <PasekAkcjiGeneratora>
    <PrzyciskPaneluGeneratora>Edytuj układ</PrzyciskPaneluGeneratora>
    <StatusZapisuDokumentu stan={stanDokumentu.stanZapisu} />
    <button type="button" onClick={() => void stanDokumentu.zapiszTeraz().then((wynik) => ustawKomunikat(wynik ? 'Kartę zapisano w rejestrze dokumentów.' : 'Nie udało się zapisać Karty.'))}>Zapisz kartę</button>
    <AkcjeEksportuPdf daneNazwyEksportu={daneNazwyEksportu} nazwaPliku={zbudujNazweEksportowanegoDokumentu(daneNazwyEksportu)} obszarDokumentu={obszarPodgladuRef} />
    <button type="button" onClick={rozpocznijNowaKarte}>Nowa karta</button>
  </PasekAkcjiGeneratora>

  return <ObszarZPanelemGeneratora idPanelu="panel-karty-na-drzwi" kluczPrzypiecia="ultimate-pomagier.panel-generatora.karta_na_drzwi.przypiety" kluczWysuwania="ultimate-pomagier.panel-generatora.karta_na_drzwi.wysuwanie" tytulPanelu="Edytor układu Karty">
    <UkladGeneratoraDokumentu tytul="Karta na drzwi" opis="Wybierz Szczegóły i grupę, aby automatycznie przygotować osobną Kartę." akcje={akcje} komunikat={komunikat}>
      <PanelBocznyGeneratora><PanelEdycjiSwobodnychBlokow bloki={dane.blokiSwobodne} blokiSzablonu={utworzBlokiSzablonuKartyNaDrzwi(dane.orientacja)} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZmienTrybEdycjiSzablonu={ustawTrybEdycjiSzablonu} onZmienBloki={(blokiSwobodne) => ustawDane((obecne) => ({ ...obecne, blokiSwobodne }))} onDodajObraz={dodajObraz} liczbaStron={1} szerokoscStronyMm={dane.orientacja === 'pozioma' ? 297 : 210} wysokoscStronyMm={dane.orientacja === 'pozioma' ? 210 : 297} /></PanelBocznyGeneratora>
      <UkladFormularzaIPodgladu>
        <PanelGeneratoraDokumentu tytul="Dane i orientacja" wariant="edycja">
          <div className="karta-na-drzwi__formularz">
            <label>Szczegóły organizacyjne<select value={dane.szczegolyOrganizacyjneId ?? ''} onChange={(zdarzenie) => wybierzSzczegoly(zdarzenie.target.value)}><option value="">Wybierz szkolenie</option>{szczegoly.map((pozycja) => <option key={pozycja.id} value={pozycja.id}>{pozycja.nazwa}{pozycja.czyKopiaRobocza ? ' (kopia robocza)' : ''}</option>)}</select></label>
            <label>Grupa szkoleniowa<select disabled={!wybraneSzczegoly} value={dane.grupaId ?? ''} onChange={(zdarzenie) => wybierzGrupe(zdarzenie.target.value)}><option value="">Wybierz grupę</option>{wybraneSzczegoly?.grupy.map((grupa) => <option key={grupa.id} value={grupa.id}>{grupa.nazwa}</option>)}</select></label>
            <label>Orientacja<select value={dane.orientacja} onChange={(zdarzenie) => zmienOrientacje(zdarzenie.target.value === 'pionowa' ? 'pionowa' : 'pozioma')}><option value="pozioma">Pozioma</option><option value="pionowa">Pionowa</option></select></label>
            <label>Dane szkolenia<textarea rows={11} value={dane.daneWejsciowe} onChange={(zdarzenie) => ustawDane((obecne) => ({ ...obecne, daneWejsciowe: zdarzenie.target.value }))} /></label>
          </div>
        </PanelGeneratoraDokumentu>
        <PanelGeneratoraDokumentu ref={obszarPodgladuRef} tytul="Podgląd Karty" wariant="podglad"><RendererKartyNaDrzwi dane={dane} zasobyObrazow={zasobyObrazow} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznaczBlok={ustawZaznaczonyBlokId} onZmienBlok={(blok) => ustawDane((obecne) => ({ ...obecne, blokiSwobodne: obecne.blokiSwobodne.map((pozycja) => pozycja.id === blok.id ? blok : pozycja) }))} /></PanelGeneratoraDokumentu>
      </UkladFormularzaIPodgladu>
    </UkladGeneratoraDokumentu>
  </ObszarZPanelemGeneratora>
}
