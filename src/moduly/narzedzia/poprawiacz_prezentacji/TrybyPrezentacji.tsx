import { useEffect, useMemo, useRef, useState, type Dispatch, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { isTauri } from '@tauri-apps/api/core'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import type { AkcjaPoprawiacza, DanePoprawiacza, TrybPrezentacji } from './modele/stanPoprawiacza'
import type { ModelPptx, SlajdPptx } from './pptx/modelPptx'
import { zapiszZmianyPptx } from './pptx/zmianyPptx'
import { analizujUklad } from './analiza/analizujUklad'
import { porownajPrezentacje, tozsamoscObiektu } from './operacje/porownaniePrezentacji'
import { czyEdytowalny, edytujSlajd, type ZmianaObiektu } from './operacje/edycjaPrezentacji'
import { normalizujKolorRoznic, pobierzKolorRoznic, zapiszKolorRoznic } from './modele/preferencjePodgladu'
import { porownajPiksele } from './operacje/porownaniePikseli'
import { otworzPdfPrezentacji, renderujStronePdf, renderujPptxDoPdf, sprawdzPdfPrezentacji } from './eksport/renderowaniePdf'
import PodgladSlajdu, { type PamiecPodgladu } from './PodgladSlajdu'
import PodgladStrukturalny from './PodgladStrukturalny'
import WlasciwosciObiektu from './WlasciwosciObiektu'

export type RenderPodgladu = { model: ModelPptx; bufor: ArrayBuffer; uwagi: string[]; klucz?: number }

export default function TrybyPrezentacji({ dane, wyslij, zapisz, historia, czyZajety, ustawZajety, rendery, odbierzRender }: {
  dane: DanePoprawiacza; wyslij: Dispatch<AkcjaPoprawiacza>; zapisz: (model: ModelPptx, nazwa: string) => Promise<void>
  historia: (kierunek: 'przed' | 'po') => void; czyZajety: boolean; ustawZajety: (wartosc: boolean) => void; rendery: RenderPodgladu[]; odbierzRender: (render: RenderPodgladu) => void
}) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownik = zalogowanyUzytkownik?.id ?? 'anonim'
  const [kolor, ustawKolor] = useState(() => pobierzKolorRoznic(uzytkownik))
  const [wariant, ustawWariant] = useState('obok')
  const [procent, ustawProcent] = useState(50)
  const [kontury, ustawKontury] = useState(false)
  const [problemyWidoczne, ustawProblemyWidoczne] = useState(true)
  const [marginesy, ustawMarginesy] = useState(false)
  const [siatka, ustawSiatke] = useState(false)
  const [czyWiele, ustawCzyWiele] = useState(false)
  const [rozniceWidoczne, ustawRozniceWidoczne] = useState(true)
  const [oryginalWidoczny, ustawOryginalWidoczny] = useState(true)
  const [aktualnyWidoczny, ustawAktualnyWidoczny] = useState(true)
  const [filtr, ustawFiltr] = useState('Wszystkie')
  const [statusy, ustawStatusy] = useState<Record<string, string>>({})
  const [blad, ustawBlad] = useState('')
  const [wynikPikseli, ustawWynikPikseli] = useState<{ rewizja: number; numer: number; pdfOryginalu?: number; pdfAktualny?: number; opis: string } | null>(null)
  const [renderowanie, ustawRenderowanie] = useState(false)
  const [szerokoscMiniatur, ustawSzerokoscMiniatur] = useState(130)
  const [szerokoscWlasciwosci, ustawSzerokoscWlasciwosci] = useState(280)
  const korzen = useRef<HTMLElement>(null)
  const [pamiec] = useState<PamiecPodgladu>(() => new Map())
  const zadania = useRef({ numer: 0 })
  const blokada = useRef(false)
  const przesuwanie = useRef<{ x: number; y: number; poczatekX: number; poczatekY: number; skala: number } | null>(null)
  const slajd = dane.model!.slajdy[dane.indeksSlajdu]
  const oryginal = dane.oryginal?.slajdy.find((stary) => stary.czesc === slajd.czesc)
  const roznice = useMemo(() => dane.oryginal && dane.model ? porownajPrezentacje(dane.oryginal, dane.model) : [], [dane.oryginal, dane.model])
  const uwagi = useMemo(() => analizujUklad(slajd), [slajd])
  const wybrane = slajd.obiekty.filter((obiekt) => dane.zaznaczenie.includes(tozsamoscObiektu(slajd, obiekt) ?? ''))
  const aktualnyPdf = rendery.find((render) => render.model === dane.model)
  const oryginalnyPdf = rendery.find((render) => render.model === dane.oryginal)
  const czyPorownanie = dane.tryb === 'PORÓWNAWCZY'
  const czyPelny = dane.tryb === 'PEŁNOEKRANOWY'
  const czyWiernePorownanie = Boolean(aktualnyPdf && oryginalnyPdf)
  const zajety = czyZajety || renderowanie

  useEffect(() => {
    const zasoby = pamiec
    const kontrola = zadania.current
    return () => { kontrola.numer++; for (const obraz of zasoby.values()) { obraz.width = 0; obraz.height = 0 }; zasoby.clear() }
  }, [pamiec, zadania])
  useEffect(() => {
    const kontrola = zadania.current
    kontrola.numer++
    return () => { kontrola.numer++ }
  }, [dane.model, zadania])
  useEffect(() => {
    if (!czyPelny) return
    const element = korzen.current!
    const poprzedniFokus = document.activeElement as HTMLElement | null
    element.focus()
    if (element.requestFullscreen) void element.requestFullscreen().catch(() => { ustawBlad('Pełny ekran działa wewnątrz aplikacji — środowisko nie udostępniło Fullscreen API.') })
    const zmiana = () => { if (!document.fullscreenElement) wyslij({ typ: 'TRYB', tryb: 'ROBOCZY' }) }
    document.addEventListener('fullscreenchange', zmiana)
    return () => {
      document.removeEventListener('fullscreenchange', zmiana)
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => undefined)
      poprzedniFokus?.focus()
    }
  }, [czyPelny, wyslij])

  async function wykonaj(operacja: () => Promise<void>) {
    if (zajety || blokada.current) return
    blokada.current = true; ustawRenderowanie(true); ustawZajety(true); ustawBlad('')
    try { await operacja() }
    catch (przyczyna) { ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie udało się wykonać operacji.') }
    finally { blokada.current = false; ustawRenderowanie(false); ustawZajety(false) }
  }
  function zmien(zmiany: ZmianaObiektu[], nazwa: string) {
    void wykonaj(async () => {
      await zapisz(await edytujSlajd(dane.model!, slajd, zmiany, oryginal, dane.oryginal ?? undefined), nazwa)
    })
  }
  function wybierz(id: string, wiele: boolean) {
    wyslij({ typ: 'ZAZNACZENIE', identyfikatory: wiele || czyWiele ? dane.zaznaczenie.includes(id) ? dane.zaznaczenie.filter((stary) => stary !== id) : [...dane.zaznaczenie, id] : [id] })
  }
  function zmienTryb(tryb: TrybPrezentacji) { wyslij({ typ: 'TRYB', tryb }); ustawBlad('') }
  function podglad(wersja: SlajdPptx, czyOryginal = false) {
    const render = czyOryginal ? oryginalnyPdf : aktualnyPdf
    const pdf = czyPorownanie && !czyWiernePorownanie ? undefined : render?.bufor
    const podswietleniaRoznic = rozniceWidoczne && (czyOryginal ? oryginalWidoczny : aktualnyWidoczny)
      ? roznice.filter((roznica) => roznica.czesc === slajd.czesc && roznica.tozsamosc).map((roznica) => roznica.tozsamosc!) : []
    const podswietlenia = [...podswietleniaRoznic, ...(!czyOryginal && problemyWidoczne ? slajd.obiekty.filter((obiekt) => uwagi.some((uwaga) => uwaga.obiekt === obiekt.id)).map((obiekt) => tozsamoscObiektu(slajd, obiekt)).filter((id): id is string => Boolean(id)) : [])]
    const obraz = <PodgladSlajdu slajd={wersja} problemy={czyOryginal ? [] : dane.analiza?.problemy ?? []}
      pdf={pdf} kluczRenderu={`${czyOryginal ? 'oryginal' : dane.rewizja}:${render?.klucz ?? 'struktura'}`} pamiec={pamiec}
      zaznaczenie={dane.zaznaczenie} podswietlenia={podswietlenia} kolor={kolor} kontury={kontury} marginesy={marginesy} siatka={siatka && dane.tryb === 'ROBOCZY'}
      wybierz={wybierz} przesun={dane.tryb !== 'ROBOCZY' || zajety ? undefined : (id, geometria) => {
        const obiekt = slajd.obiekty.find((kandydat) => tozsamoscObiektu(slajd, kandydat) === id)
        if (!obiekt?.geometria) return
        const cele = dane.zaznaczenie.includes(id) ? wybrane.filter(czyEdytowalny) : [obiekt]
        const dx = geometria.x - obiekt.geometria.x, dy = geometria.y - obiekt.geometria.y
        const czyRozmiar = geometria.cx !== obiekt.geometria.cx || geometria.cy !== obiekt.geometria.cy
        zmien(cele.map((cel) => ({ id: tozsamoscObiektu(slajd, cel)!, geometria: cel === obiekt ? geometria : czyRozmiar ? cel.geometria! : { ...cel.geometria!, x: cel.geometria!.x + dx, y: cel.geometria!.y + dy } })), czyRozmiar ? 'Zmiana rozmiaru' : 'Przesunięcie obiektów')
      }} />
    if (!czyPorownanie || !oryginal) return obraz
    const szerokosc = Math.max(slajd.szerokosc, oryginal.szerokosc)
    const wysokosc = Math.max(slajd.wysokosc, oryginal.wysokosc)
    return <div className="prezentacja-pole-wersji" style={{ aspectRatio: `${szerokosc}/${wysokosc}` }}><div style={{ width: `${wersja.szerokosc / szerokosc * 100}%` }}>{obraz}</div></div>
  }
  const zawartosc = <section ref={korzen} tabIndex={-1} style={{ '--proporcja-slajdu': slajd.szerokosc / slajd.wysokosc } as CSSProperties} className={`narzedzia prezentacja-tryby${czyPelny ? ' prezentacja-tryby--pelny' : ''}`} aria-label="Tryby prezentacji"
    onKeyDown={(zdarzenie) => {
      if ((zdarzenie.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return
      const klawisz = zdarzenie.key
      if (klawisz === 'Escape') { zdarzenie.preventDefault(); zmienTryb('ROBOCZY'); return }
      if ((zdarzenie.ctrlKey || zdarzenie.metaKey) && ['z', 'y'].includes(klawisz.toLowerCase())) {
        zdarzenie.preventDefault(); if (!zajety) historia(klawisz.toLowerCase() === 'y' || zdarzenie.shiftKey ? 'po' : 'przed'); return
      }
      const indeks = klawisz === 'Home' ? 0 : klawisz === 'End' ? dane.model!.slajdy.length - 1 : ['ArrowRight', 'ArrowDown'].includes(klawisz) ? dane.indeksSlajdu + 1 : ['ArrowLeft', 'ArrowUp'].includes(klawisz) ? dane.indeksSlajdu - 1 : null
      if (indeks !== null) { zdarzenie.preventDefault(); wyslij({ typ: 'SLAJD', indeks }) }
    }}>
    <div className="poprawiacz-prezentacji__akcje" aria-label="Wybór trybu">
      {([['ROBOCZY', 'Roboczy'], ['PEŁNOEKRANOWY', 'Pełnoekranowy'], ['PORÓWNAWCZY', 'Porównawczy']] as const).map(([tryb, nazwa]) => <button type="button" key={tryb} aria-pressed={dane.tryb === tryb} onClick={() => zmienTryb(tryb)}>{nazwa}</button>)}
      <button type="button" disabled={!dane.historia.length || zajety} onClick={() => historia('przed')}>Cofnij</button>
      <button type="button" disabled={!dane.ponawianie.length || zajety} onClick={() => historia('po')}>Ponów</button>
      <button type="button" onClick={() => wyslij({ typ: 'WIDOK', widok: { zoom: 1, x: 0, y: 0 } })}>Dopasuj do okna</button>
      {[100, 150, 200, 400].map((zoom) => <button type="button" key={zoom} onClick={() => wyslij({ typ: 'WIDOK', widok: { ...dane.widok, zoom: zoom / 100 } })}>{zoom}%</button>)}
      <label>Powiększenie<input type="range" min="50" max="400" step="1" value={dane.widok.zoom * 100} onChange={(zdarzenie) => wyslij({ typ: 'WIDOK', widok: { ...dane.widok, zoom: Number(zdarzenie.target.value) / 100 } })} /></label>
    </div>
    <div className="poprawiacz-prezentacji__akcje">
      <button type="button" disabled={!dane.indeksSlajdu} onClick={() => wyslij({ typ: 'SLAJD', indeks: dane.indeksSlajdu - 1 })}>‹ poprzedni</button>
      <label>Slajd<input aria-label="Numer slajdu" type="number" inputMode="numeric" min="1" max={dane.model!.slajdy.length} value={dane.indeksSlajdu + 1} onChange={(zdarzenie) => { if (Number.isFinite(zdarzenie.target.valueAsNumber)) wyslij({ typ: 'SLAJD', indeks: zdarzenie.target.valueAsNumber - 1 }) }} /></label>
      <span aria-live="polite">/ {dane.model!.slajdy.length}</span>
      <button type="button" disabled={dane.indeksSlajdu === dane.model!.slajdy.length - 1} onClick={() => wyslij({ typ: 'SLAJD', indeks: dane.indeksSlajdu + 1 })}>następny ›</button>
      <label><input type="checkbox" checked={kontury} onChange={(zdarzenie) => ustawKontury(zdarzenie.target.checked)} />Kontury obiektów</label>
      <label><input type="checkbox" checked={problemyWidoczne} onChange={(zdarzenie) => ustawProblemyWidoczne(zdarzenie.target.checked)} />Podświetl problemy</label>
      <label><input type="checkbox" checked={marginesy} onChange={(zdarzenie) => ustawMarginesy(zdarzenie.target.checked)} />Bezpieczne marginesy</label>
      <label><input type="checkbox" checked={siatka} onChange={(zdarzenie) => ustawSiatke(zdarzenie.target.checked)} />Siatka i przyciąganie</label>
      {dane.tryb === 'ROBOCZY' && <label><input type="checkbox" checked={czyWiele} onChange={(zdarzenie) => ustawCzyWiele(zdarzenie.target.checked)} />Zaznaczanie wielu obiektów</label>}
    </div>
    {blad && <p role="alert">{blad}</p>}
    <p role="status">{czyPorownanie ? czyWiernePorownanie ? 'Obie wersje: render PDF.' : 'Obie wersje: podgląd strukturalny — wygląd uproszczony. Wczytaj PDF obu wersji do dokładnej inspekcji.' : aktualnyPdf ? 'Wierny podgląd PDF aktualnej wersji.' : 'Podgląd strukturalny: czcionki, obrazy, efekty i wzorce nie są wiernie renderowane. PDF wymaga odświeżenia po zmianach.'} {renderowanie ? 'Przetwarzanie…' : ''}</p>
    {(czyPorownanie ? [oryginalnyPdf, aktualnyPdf] : [aktualnyPdf]).some((render) => render?.uwagi.some((uwaga) => /ręczn/i.test(uwaga))) && <p>PDF wczytano ręcznie: zgodność treści z PPTX nie jest potwierdzona. Do porównania używaj tego samego renderera.</p>}
    {czyPorownanie && <div className="poprawiacz-prezentacji__akcje">
      <label>Wariant<select aria-label="Wariant" value={wariant} onChange={(zdarzenie) => ustawWariant(zdarzenie.target.value)}><option value="obok">Obok siebie</option><option value="przezroczystosc">Nakładka: przezroczystość</option><option value="odslanianie">Nakładka: odsłanianie</option></select></label>
      {wariant !== 'obok' && <label>{wariant === 'odslanianie' ? 'Odsłonięcie oryginału' : 'Przezroczystość oryginału'}<input type="range" min="0" max="100" value={procent} onChange={(zdarzenie) => ustawProcent(Number(zdarzenie.target.value))} /></label>}
      <label><input type="checkbox" checked={oryginalWidoczny} onChange={(zdarzenie) => ustawOryginalWidoczny(zdarzenie.target.checked)} />Podświetlenia oryginału</label>
      <label><input type="checkbox" checked={aktualnyWidoczny} onChange={(zdarzenie) => ustawAktualnyWidoczny(zdarzenie.target.checked)} />Podświetlenia poprawek</label>
      <button type="button" disabled={!czyWiernePorownanie || zajety} onClick={() => void wykonaj(async () => {
        const wyniki = await Promise.allSettled([otworzPdfPrezentacji(oryginalnyPdf!.bufor), otworzPdfPrezentacji(aktualnyPdf!.bufor)])
        const dokumenty = wyniki.flatMap((wynik) => wynik.status === 'fulfilled' ? [wynik.value] : [])
        try {
          const nieudany = wyniki.find((wynik) => wynik.status === 'rejected')
          if (nieudany?.status === 'rejected') throw nieudany.reason
          const obrazy = await Promise.all(dokumenty.map((dokument) => renderujStronePdf(dokument, slajd.numer, 400)))
          if (obrazy[0].height !== obrazy[1].height) throw new Error('Porównanie pikseli wymaga zgodnych proporcji obu slajdów.')
          const piksele = obrazy.map((obraz) => obraz.getContext('2d')!.getImageData(0, 0, obraz.width, obraz.height).data)
          const wynik = porownajPiksele(piksele[0], piksele[1], obrazy[0].width, obrazy[0].height)
          ustawWynikPikseli({ rewizja: dane.rewizja, pdfOryginalu: oryginalnyPdf?.klucz, pdfAktualny: aktualnyPdf?.klucz, numer: slajd.numer, opis: 'Różnice wizualne: ' + wynik.procent.toFixed(2) + '%. Wynik pomocniczy z tolerancją 24/255 i 1 piksela; różnice rendererów mogą wpływać na wynik.' })
        } finally { await Promise.all(dokumenty.map((dokument) => dokument.loadingTask.destroy())) }
      })}>Porównaj piksele</button>
    </div>}
    {czyPorownanie && wynikPikseli?.rewizja === dane.rewizja && wynikPikseli?.pdfOryginalu === oryginalnyPdf?.klucz && wynikPikseli?.pdfAktualny === aktualnyPdf?.klucz && wynikPikseli?.numer === slajd.numer && <p role="status">{wynikPikseli.opis}</p>}
    <div className={`prezentacja-workspace${dane.tryb === 'ROBOCZY' ? ' prezentacja-workspace--roboczy' : ''}`} style={{ '--szerokosc-miniatur': `${szerokoscMiniatur}px`, '--szerokosc-wlasciwosci': `${szerokoscWlasciwosci}px` } as CSSProperties}>
      {dane.tryb === 'ROBOCZY' && <nav className="prezentacja-miniatury" aria-label="Miniatury slajdów">
        <label>Szerokość miniatur<input type="range" min="80" max="240" value={szerokoscMiniatur} onChange={(zdarzenie) => ustawSzerokoscMiniatur(Number(zdarzenie.target.value))} /></label>
        {dane.model!.slajdy.map((pozycja, indeks) => <button type="button" key={pozycja.czesc} aria-current={indeks === dane.indeksSlajdu ? 'page' : undefined} onClick={() => wyslij({ typ: 'SLAJD', indeks })}>
          Slajd {indeks + 1}{Math.abs(indeks - dane.indeksSlajdu) < 4 && <PodgladStrukturalny slajd={pozycja} problemy={[]} kontury={false} />}
        </button>)}
      </nav>}
      <div className="prezentacja-scena" onPointerDown={(zdarzenie) => {
        if (zdarzenie.button !== 0 || (zdarzenie.target as HTMLElement).closest('[data-tozsamosc]') && dane.tryb === 'ROBOCZY') return
        const szerokosc = zdarzenie.currentTarget.getBoundingClientRect().width
        przesuwanie.current = { x: zdarzenie.clientX, y: zdarzenie.clientY, poczatekX: dane.widok.x, poczatekY: dane.widok.y, skala: szerokosc / zdarzenie.currentTarget.clientWidth }
        zdarzenie.currentTarget.setPointerCapture(zdarzenie.pointerId)
      }} onPointerMove={(zdarzenie) => {
        const ruch = przesuwanie.current
        if (ruch) wyslij({ typ: 'WIDOK', widok: { ...dane.widok, x: ruch.poczatekX + (zdarzenie.clientX - ruch.x) / ruch.skala, y: ruch.poczatekY + (zdarzenie.clientY - ruch.y) / ruch.skala } })
      }} onPointerUp={() => { przesuwanie.current = null }} onPointerCancel={() => { przesuwanie.current = null }}>
        <div className={`prezentacja-porownanie${czyPorownanie && wariant === 'obok' ? ' prezentacja-porownanie--obok' : ''}`} style={{ transform: `translate(${dane.widok.x}px, ${dane.widok.y}px) scale(${dane.widok.zoom})` }}>
          {czyPorownanie && oryginal && wariant === 'obok' ? <><div><strong>ORYGINAŁ</strong>{podglad(oryginal, true)}</div><div><strong>PO POPRAWKACH</strong>{podglad(slajd)}</div></> : czyPorownanie && oryginal ? <div className="prezentacja-nakladka">
            <strong>ORYGINAŁ / PO POPRAWKACH</strong>
            {podglad(slajd)}
            <div className="prezentacja-nakladka__oryginal" style={{ opacity: wariant === 'przezroczystosc' ? procent / 100 : 1, clipPath: wariant === 'odslanianie' ? `inset(0 ${100 - procent}% 0 0)` : undefined }}>{podglad(oryginal, true)}</div>
          </div> : podglad(slajd)}
        </div>
      </div>
      {dane.tryb === 'ROBOCZY' && <div>
        <label>Szerokość właściwości<input type="range" min="200" max="420" value={szerokoscWlasciwosci} onChange={(zdarzenie) => ustawSzerokoscWlasciwosci(Number(zdarzenie.target.value))} /></label>
        <WlasciwosciObiektu key={`${dane.rewizja}:${dane.indeksSlajdu}:${dane.zaznaczenie.join(',')}`} slajd={slajd} wybrane={wybrane} zmien={zmien} czyZajety={zajety} />
        <div className="prezentacja-lista-obiektow">{slajd.obiekty.map((obiekt) => <button type="button" key={obiekt.klucz} onClick={(zdarzenie) => { const id = tozsamoscObiektu(slajd, obiekt); if (id) wybierz(id, zdarzenie.ctrlKey || zdarzenie.shiftKey) }}>{obiekt.nazwa || obiekt.typ}{!czyEdytowalny(obiekt) && ' (tylko odczyt)'}</button>)}</div>
      </div>}
    </div>
    {!czyPelny && <>
      <details><summary>Renderowanie podglądu</summary>
        <p>Ręcznie wczytany PDF jest sprawdzany pod kątem liczby stron. Zgodność treści i kolejności wymaga kontroli użytkownika. Porównuj PDF wygenerowane tym samym rendererem.</p>
        {([['oryginal', 'oryginału', dane.oryginal], ['aktualny', 'aktualnej wersji', dane.model]] as const).map(([klucz, etykieta, model]) => model && <div key={klucz}>
          <label>PDF {etykieta}<input type="file" accept=".pdf" disabled={zajety} onChange={(zdarzenie) => {
            const plik = zdarzenie.target.files?.[0]; zdarzenie.target.value = ''
            if (plik) void wykonaj(async () => {
              const zadanie = ++zadania.current.numer
              const bufor = await plik.arrayBuffer(); await sprawdzPdfPrezentacji(bufor, model.slajdy.length)
              if (zadanie === zadania.current.numer) odbierzRender({ model, bufor, uwagi: ['Ręczny PDF: potwierdź zgodność treści i użycie tego samego renderera.'] })
            })
          }} /></label>
          {isTauri() && <button type="button" disabled={zajety} onClick={() => void wykonaj(async () => {
            const zadanie = ++zadania.current.numer
            const wynik = await renderujPptxDoPdf(model)
            if (zadanie === zadania.current.numer) odbierzRender({ model, ...wynik })
          })}>Renderuj PDF {etykieta}</button>}
        </div>)}
        {[oryginalnyPdf, aktualnyPdf].flatMap((render) => render?.uwagi ?? []).map((uwaga, indeks) => <p key={indeks}>{uwaga}</p>)}
      </details>
      <details className="prezentacja-zmiany"><summary>WYKRYTE ZMIANY ({roznice.length})</summary>
        <label><input type="checkbox" checked={rozniceWidoczne} onChange={(zdarzenie) => ustawRozniceWidoczne(zdarzenie.target.checked)} />Podświetl różnice</label>
        <div className="poprawiacz-prezentacji__akcje">
          {['#e53935', '#fdd835', '#1e88e5', '#43a047'].map((barwa, indeks) => <button type="button" key={barwa} aria-label={['Czerwony', 'Żółty', 'Niebieski', 'Zielony'][indeks]} style={{ borderColor: barwa }} onClick={() => { ustawKolor(barwa); if (!zapiszKolorRoznic(uzytkownik, barwa)) ustawBlad('Nie zapisano preferencji koloru. Kolor działa w bieżącej sesji.') }}>{['Czerwony', 'Żółty', 'Niebieski', 'Zielony'][indeks]}</button>)}
          <label>Kolor różnic<input type="color" value={kolor} onChange={(zdarzenie) => { ustawKolor(zdarzenie.target.value); if (!zapiszKolorRoznic(uzytkownik, zdarzenie.target.value)) ustawBlad('Nie zapisano preferencji koloru.') }} /></label>
          <label>HEX/RGB<input aria-label="Kolor różnic HEX/RGB" defaultValue={kolor} key={kolor} onBlur={(zdarzenie) => { const barwa = normalizujKolorRoznic(zdarzenie.target.value); if (barwa) { ustawKolor(barwa); if (!zapiszKolorRoznic(uzytkownik, barwa)) ustawBlad('Nie zapisano preferencji koloru.') } else ustawBlad('Podaj kolor #RRGGBB lub rgb(0, 0, 0).') }} /></label>
          <label>Typ zmiany<select value={filtr} onChange={(zdarzenie) => ustawFiltr(zdarzenie.target.value)}>{['Wszystkie', ...new Set(roznice.map((roznica) => roznica.typ))].map((typ) => <option key={typ}>{typ}</option>)}</select></label>
        </div>
        <div className="prezentacja-zmiany__lista">{roznice.filter((roznica) => filtr === 'Wszystkie' || roznica.typ === filtr).map((roznica) => <article key={`${dane.rewizja}:${roznica.id}`}>
          <button type="button" onClick={() => { wyslij({ typ: 'SLAJD', indeks: roznica.slajd - 1 }); wyslij({ typ: 'ZAZNACZENIE', identyfikatory: roznica.tozsamosc ? [roznica.tozsamosc] : [] }) }}>Slajd {roznica.slajd} · {roznica.typ} · {roznica.nazwa}</button>
          <p>Przed: {roznica.przed} → Po: {roznica.po}</p>
          <p>Lokalizacja (EMU): {JSON.stringify((roznica.aktualny ?? roznica.oryginal)?.geometria)}</p>
          <label>Status<select disabled={roznica.typ === 'Niejednoznaczny'} value={roznica.typ === 'Niejednoznaczny' ? 'Niejednoznaczna' : statusy[`${dane.rewizja}:${roznica.id}`] ?? 'Wymaga kontroli'} onChange={(zdarzenie) => ustawStatusy({ ...statusy, [`${dane.rewizja}:${roznica.id}`]: zdarzenie.target.value })}>{['Zmiana poprawna', 'Wymaga kontroli', 'Problem', 'Niejednoznaczna'].map((status) => <option key={status}>{status}</option>)}</select></label>
          <button type="button" disabled={!roznica.tozsamosc || zajety} onClick={() => {
            const cel = dane.model!.slajdy.find((pozycja) => pozycja.czesc === roznica.czesc)!
            void wykonaj(async () => zapisz(await edytujSlajd(dane.model!, cel, [{ id: roznica.tozsamosc!, przywroc: true }], dane.oryginal?.slajdy.find((pozycja) => pozycja.czesc === cel.czesc), dane.oryginal ?? undefined), 'Przywrócenie obiektu'))
          }}>Przywróć obiekt</button>
        </article>)}</div>
      </details>
      <details><summary>Historia zmian ({dane.historia.length})</summary><p>Limit: 30 operacji / 32 MiB różnic (pojedyncza większa operacja jest zachowana). Oryginał i jeden ręczny punkt kontrolny pozostają w pamięci do usunięcia pliku.</p>
        <button type="button" disabled={zajety} onClick={() => wyslij({ typ: 'PUNKT_KONTROLNY' })}>Utwórz punkt kontrolny</button>
        <button type="button" disabled={!dane.punktKontrolny || zajety} onClick={() => void wykonaj(async () => zapisz(dane.punktKontrolny!, 'Przywrócenie punktu kontrolnego'))}>Przywróć punkt kontrolny</button>
        <ol>{dane.historia.map((operacja, indeks) => <li key={indeks}>{operacja.nazwa}</li>)}</ol>
      </details>
      <div className="poprawiacz-prezentacji__akcje">
        <button type="button" disabled={!dane.zaznaczenie.length || zajety} onClick={() => zmien(dane.zaznaczenie.map((id) => ({ id, przywroc: true })), 'Przywrócenie obiektów')}>Przywróć zaznaczone</button>
        <button type="button" disabled={!oryginal || zajety} onClick={() => void wykonaj(async () => zapisz(await zapiszZmianyPptx(dane.model!, new Map([[slajd.czesc, oryginal!.dokument]])), 'Przywrócenie slajdu'))}>Przywróć slajd</button>
      </div>
      <p className="narzedzia__opis">Przywracanie slajdu obejmuje jego obiekty; wspólne wymiary prezentacji pozostają aktualne.</p>
      {uwagi.length > 0 && <details><summary>Problemy układu ({uwagi.length})</summary>{uwagi.map((uwaga, indeks) => <p key={indeks}>{uwaga.opis}</p>)}</details>}
    </>}
  </section>
  return czyPelny ? createPortal(zawartosc, document.body) : zawartosc
}
