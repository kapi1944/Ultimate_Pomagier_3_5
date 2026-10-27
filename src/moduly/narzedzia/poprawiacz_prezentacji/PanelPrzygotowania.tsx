import { useMemo, useState } from 'react'
import type { ModelPptx } from './pptx/modelPptx'
import { korygujUklad } from './operacje/korygujUklad'
import { analizujUklad } from './analiza/analizujUklad'
import { zastosujMapowanie, daneOkladkiZeSzczegolow, etykietyPol, wartoscPola, zaproponujMapowanie } from './operacje/mapowanieDanych'
import type { DaneOkladki, MapowaniePola, PolePrezentacji } from './operacje/mapowanieDanych'
import { pobierzSzczegolyDoGeneratorow } from '../../../wspolne/integracje/szczegolyDoDokumentow/pobierzSzczegolyDoGeneratorow'

type Wlasciwosci = { model: ModelPptx | null; czyZajety: boolean; ustawZajety: (wartosc: boolean) => void; zmienModel: (model: ModelPptx) => void; daneOkladki: DaneOkladki; ustawDaneOkladki: (dane: DaneOkladki) => void }

export default function PanelPrzygotowania({ model, czyZajety, ustawZajety, zmienModel, daneOkladki, ustawDaneOkladki }: Wlasciwosci) {
  const [szerokosc, ustawSzerokosc] = useState(model ? model.slajdy[0].szerokosc / 360000 : 33.867)
  const [wysokosc, ustawWysokosc] = useState(model ? model.slajdy[0].wysokosc / 360000 : 19.05)
  const [czyKorekta, ustawCzyKorekta] = useState(true)
  const [czyDuplikaty, ustawCzyDuplikaty] = useState(true)
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState('')
  const [szczegoly, ustawSzczegoly] = useState(pobierzSzczegolyDoGeneratorow)
  const [szczegolyId, ustawSzczegolyId] = useState('')
  const [grupaId, ustawGrupeId] = useState('')
  const [mapowanie, ustawMapowanie] = useState<MapowaniePola[]>([])
  const uwagi = useMemo(() => model?.slajdy.flatMap(analizujUklad) ?? [], [model])
  const zrodlo = szczegoly.find((pozycja) => pozycja.id === szczegolyId)
  const pola = model?.slajdy[0].obiekty.filter((obiekt) => obiekt.typ === 'ksztalt' && obiekt.tekst.trim() && obiekt.id) ?? []
  const mapa = pola.map((obiekt) => mapowanie.find((pozycja) => pozycja.idObiektu === obiekt.id) ?? { idObiektu: obiekt.id, pole: zaproponujMapowanie(obiekt) })
  const liczbaWybranych = mapa.filter((pozycja) => pozycja.pole || pozycja.wartoscReczna !== undefined).length

  async function wykonaj(operacja: () => Promise<void>) {
    if (czyZajety) return
    ustawZajety(true); ustawBlad(''); ustawKomunikat('')
    try { await operacja() }
    catch (bladOperacji) { ustawBlad(bladOperacji instanceof Error ? bladOperacji.message : 'Nie udało się przygotować prezentacji.') }
    finally { ustawZajety(false) }
  }

  return <>
    {model && <section className="narzedzia__panel" aria-labelledby="poprawiacz-uklad">
      <h2 id="poprawiacz-uklad">Wymiary i korekta układu</h2>
      <p>Aktualny slajd: {(model.slajdy[0].szerokosc / 360000).toLocaleString('pl-PL', { maximumFractionDigits: 3 })} × {(model.slajdy[0].wysokosc / 360000).toLocaleString('pl-PL', { maximumFractionDigits: 3 })} cm.</p>
      <fieldset disabled={czyZajety} className="poprawiacz-prezentacji__pola">
        <legend>Docelowe wymiary slajdu</legend>
        <label>Szerokość (cm)<input type="number" min="5" max="100" step="0.01" value={szerokosc} onChange={(zdarzenie) => ustawSzerokosc(zdarzenie.target.valueAsNumber)} /></label>
        <label>Wysokość (cm)<input type="number" min="5" max="100" step="0.01" value={wysokosc} onChange={(zdarzenie) => ustawWysokosc(zdarzenie.target.valueAsNumber)} /></label>
        <button type="button" onClick={() => ustawWysokosc(20.5)}>Profil SEMPER: wysokość 20,5 cm</button>
        <label className="poprawiacz-prezentacji__wybor"><input type="checkbox" role="switch" checked={czyKorekta} onChange={(zdarzenie) => ustawCzyKorekta(zdarzenie.target.checked)} />Koryguj kolizje z nagłówkiem, separatorami i stopką</label>
        <label className="poprawiacz-prezentacji__wybor"><input type="checkbox" role="switch" checked={czyDuplikaty} onChange={(zdarzenie) => ustawCzyDuplikaty(zdarzenie.target.checked)} />Usuń dodatkowe numery, jeśli wzorzec zapewnia numerację</label>
        <button type="button" onClick={() => void wykonaj(async () => {
          const wynik = await korygujUklad(model, { szerokoscCm: szerokosc, wysokoscCm: wysokosc, czyKorygowacUklad: czyKorekta, czyUsuwacDuplikaty: czyDuplikaty })
          zmienModel(wynik.model)
          ustawKomunikat(`Zastosowano wymiary. Zmienione obiekty: ${wynik.zmienione}; usunięte duplikaty: ${wynik.duplikaty}; uwagi do kontroli: ${wynik.uwagi.length}. Sprawdź wygląd po renderowaniu PDF.`)
        })}>Zastosuj wymiary i korektę</button>
      </fieldset>
      <p className="narzedzia__opis">Korekta geometryczna zachowuje obiekty edytowalne. Złożone transformacje i przepełnienia wymagają kontroli w renderowanym PDF.</p>
      <details><summary>Uwagi do układu ({uwagi.length})</summary><ul className="poprawiacz-prezentacji__lista">{uwagi.slice(0, 200).map((uwaga, indeks) => <li key={indeks}>Slajd {uwaga.numerSlajdu}, obiekt {uwaga.obiekt}: {uwaga.opis}</li>)}</ul>{uwagi.length > 200 && <p>Pokazano pierwszych 200 uwag.</p>}</details>
    </section>}
    <section className="narzedzia__panel" aria-labelledby="poprawiacz-dane">
      <h2 id="poprawiacz-dane">Dane szkolenia i mapowanie pierwszego slajdu</h2>
      <fieldset disabled={czyZajety} className="poprawiacz-prezentacji__pola">
        <legend>Źródło danych organizacyjnych</legend>
        <label>Szczegóły organizacyjne<select value={szczegolyId} onChange={(zdarzenie) => { ustawSzczegolyId(zdarzenie.target.value); ustawGrupeId('') }}><option value="">Wybierz szkolenie</option>{szczegoly.map((pozycja) => <option key={pozycja.id} value={pozycja.id}>{pozycja.nazwa}{pozycja.czyKopiaRobocza ? ' (kopia robocza)' : ''}</option>)}</select></label>
        <label>Grupa / termin<select value={grupaId} onChange={(zdarzenie) => ustawGrupeId(zdarzenie.target.value)}><option value="">Wybierz grupę</option>{zrodlo?.grupy.map((grupa) => <option key={grupa.id} value={grupa.id}>{grupa.nazwa} — {grupa.dataOd}</option>)}</select></label>
        <div className="poprawiacz-prezentacji__akcje"><button type="button" onClick={() => ustawSzczegoly(pobierzSzczegolyDoGeneratorow())}>Odśwież źródła</button><button type="button" disabled={!zrodlo || !grupaId} onClick={() => { if (zrodlo) ustawDaneOkladki(daneOkladkiZeSzczegolow(zrodlo, grupaId)) }}>Wczytaj dane wybranej grupy</button></div>
        {(Object.keys(daneOkladki) as (keyof DaneOkladki)[]).map((klucz) => <label key={klucz}>{etykietyPol[klucz]}<input type="text" value={daneOkladki[klucz]} onChange={(zdarzenie) => ustawDaneOkladki({ ...daneOkladki, [klucz]: zdarzenie.target.value })} /></label>)}
      </fieldset>
      {model && <details><summary>Zatwierdź mapowanie pól ({liczbaWybranych} wybranych)</summary>
        <p>Sprawdź proponowane zamiany. Pola bez mapowania pozostaną bez zmian. Możesz wskazać dowolne dodatkowe pole ręcznie.</p>
        <fieldset disabled={czyZajety} className="poprawiacz-prezentacji__pola"><legend>Pola tekstowe pierwszego slajdu</legend>
          {pola.map((obiekt, indeks) => { const pozycja = mapa[indeks]; return <div key={obiekt.id}>
            <p><strong>{obiekt.nazwa}</strong>: {obiekt.tekst.slice(0, 160)}</p>
            <label>Źródło nowej wartości<select value={pozycja.wartoscReczna !== undefined ? 'reczna' : pozycja.pole} onChange={(zdarzenie) => {
              const wartosc = zdarzenie.target.value
              ustawMapowanie([...mapa.filter((element) => element.idObiektu !== obiekt.id), { idObiektu: obiekt.id, pole: wartosc === 'reczna' ? '' : wartosc as PolePrezentacji | '', ...(wartosc === 'reczna' ? { wartoscReczna: '' } : {}) }])
            }}><option value="">Pomiń pole</option>{Object.entries(etykietyPol).map(([klucz, etykieta]) => <option key={klucz} value={klucz}>{etykieta}</option>)}<option value="reczna">Wartość ręczna</option></select></label>
            {pozycja.wartoscReczna !== undefined ? <label>Nowa wartość<input value={pozycja.wartoscReczna} onChange={(zdarzenie) => ustawMapowanie(mapa.map((element) => element.idObiektu === obiekt.id ? { ...element, wartoscReczna: zdarzenie.target.value } : element))} /></label> : pozycja.pole && <p>Nowa wartość: {wartoscPola(pozycja.pole, daneOkladki) || '(brak danych)'}</p>}
          </div> })}
          <button type="button" disabled={!liczbaWybranych} onClick={() => void wykonaj(async () => { zmienModel(await zastosujMapowanie(model, daneOkladki, mapa)); ustawKomunikat('Uzupełniono wyłącznie zatwierdzone pola pierwszego slajdu.') })}>Zastosuj zatwierdzone mapowanie</button>
        </fieldset>
      </details>}
    </section>
    {blad && <p role="alert">{blad}</p>}{komunikat && <p role="status">{komunikat}</p>}
  </>
}
