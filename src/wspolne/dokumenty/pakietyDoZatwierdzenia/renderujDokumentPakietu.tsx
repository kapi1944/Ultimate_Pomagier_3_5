import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import type { Dokument } from '../modelDokumentu'
import { renderujPdfDokumentu, type UstawieniaEksportuPdf } from '../eksportPdf'
import { pobierzMapeZasobowObrazowDokumentu } from '../zasobyObrazowDokumentu'
import type { KonfiguracjaPakietu } from './modelPakietu'

export type WynikEksportuDokumentu = { dokumentId: string; wersja: number; nazwa: string; pdfBytes: Uint8Array; liczbaStron: number; grupaId: string | null }
function obiekt(wartosc: unknown): Record<string, unknown> {
  if (!wartosc || typeof wartosc !== 'object' || Array.isArray(wartosc)) throw new Error('Brak zapisanych danych dokumentu.')
  return wartosc as Record<string, unknown>
}

async function przygotujRenderer(dokument: Dokument<unknown, unknown>, konfiguracja: KonfiguracjaPakietu): Promise<{ zawartosc: ReactNode; ustawienia: Partial<UstawieniaEksportuPdf>; sprawdz?: (obszar: HTMLElement) => string | null }> {
  const dane = obiekt(dokument.daneDokumentu)
  const zasoby = pobierzMapeZasobowObrazowDokumentu()
  switch (dokument.typ) {
    case 'PROGRAM_SZKOLENIA': {
      const [{ RendererProgramuDoPakietu }, { polaczProgram }] = await Promise.all([import('../../../moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen'), import('../../../moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen')])
      return { zawartosc: <RendererProgramuDoPakietu zapis={polaczProgram(dokument)} zasobyObrazow={zasoby} />, ustawienia: { silnikPdf: 'raster_legacy' }, sprawdz: (obszar) => obszar.querySelector('.program-strony__problemy')?.textContent || null }
    }
    case 'LISTA_OBECNOSCI': {
      const [{ default: Renderer }, model, { pobierzBladPrzepelnieniaListy }] = await Promise.all([import('../../../moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci'), import('../../../moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci'), import('../../../moduly/dokumenty/generatory/listy_obecnosci/wygladTabeliListy'), import('../../../moduly/dokumenty/generatory/listy_obecnosci/widokListObecnosci.css')])
      let lista
      if (dane.listaObecnosci) lista = model.deserializujDaneListyObecnosci(JSON.stringify(dane.listaObecnosci))
      else if (dane.daneZrodlowe && dane.korektyReczne) {
        const { pobierzListeObecnosciPoId } = await import('../../../moduly/dokumenty/generatory/listy_obecnosci/rejestrListObecnosci')
        const zapisana = pobierzListeObecnosciPoId(dokument.id)
        if (!zapisana) throw new Error('Nie można odczytać powiązanej listy obecności.')
        lista = model.utworzDaneListyObecnosciZIntegracji(zapisana.daneDokumentu.daneZrodlowe, zapisana.daneDokumentu.korektyReczne)
      } else if (typeof dane.tekst === 'string') lista = model.deserializujDaneListyObecnosci(dane.tekst)
      else throw new Error('Brak danych listy obecności.')
      const blad = model.pobierzBladEksportuListy(lista)
      if (blad) throw new Error(blad)
      return { zawartosc: <Renderer dane={lista} zasobyObrazow={zasoby} />, ustawienia: {}, sprawdz: pobierzBladPrzepelnieniaListy }
    }
    case 'ANKIETA': {
      const [{ default: Renderer }, { deserializujDaneAnkiety }] = await Promise.all([import('../../../moduly/dokumenty/generatory/ankiety/RendererAnkiety'), import('../../../moduly/dokumenty/generatory/ankiety/modelAnkiety'), import('../../../moduly/dokumenty/generatory/ankiety/widokAnkiet.css')])
      if (!dane.ankieta && typeof dane.tekst !== 'string') throw new Error('Brak zapisanej ankiety.')
      const ankieta = deserializujDaneAnkiety(dane.ankieta ? JSON.stringify(dane.ankieta) : String(dane.tekst))
      return { zawartosc: <div className="generator-ankiet"><Renderer dane={ankieta} zasobyObrazow={zasoby} /></div>, ustawienia: {} }
    }
    case 'CERTYFIKAT': case 'ZASWIADCZENIE': case 'DYPLOM': {
      const { RendererDyplomowDoPakietu } = await import('../../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow')
      return { zawartosc: <RendererDyplomowDoPakietu daneDokumentu={dane} tryb={konfiguracja.trybCertyfikatow} />, ustawienia: {} }
    }
    case 'KARTA_NA_DRZWI': {
      const [{ RenderujZestawEksportu }, { deserializujDaneKartyNaDrzwi }] = await Promise.all([import('../../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'), import('../../../moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi')])
      if (!dane.kartaNaDrzwi && typeof dane.tekst !== 'string') throw new Error('Brak zapisanych kart na drzwi.')
      const karty = deserializujDaneKartyNaDrzwi(dane.kartaNaDrzwi ? JSON.stringify(dane.kartaNaDrzwi) : String(dane.tekst))
      if (konfiguracja.grupyId) karty.karty = karty.karty.filter((karta) => !karta.grupaId || konfiguracja.grupyId!.includes(karta.grupaId))
      if (!karty.karty.length) throw new Error('Brak kart dla wybranych grup.')
      const ustawienia = karty.ustawieniaSzablonu
      return { zawartosc: <RenderujZestawEksportu dane={karty} zasobyObrazow={zasoby} />, ustawienia: { format: ustawienia.kilkaKartNaArkuszuA4 ? 'a4' : ustawienia.format, orientacja: ustawienia.kilkaKartNaArkuszuA4 && ustawienia.format === 'a5' ? (ustawienia.orientacja === 'pionowa' ? 'pozioma' : 'pionowa') : ustawienia.orientacja } }
    }
    case 'CHECKLISTA_PACZKI': {
      const [{ Druk }, { czyMoznaEksportowacCheckliste }] = await Promise.all([import('../../../moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek'), import('../../../moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki')])
      if (!Array.isArray(dane.pozycje) || !Array.isArray(dane.paczki) || !Array.isArray(dane.kategorie) || typeof dane.identyfikator !== 'string') throw new Error('Nieprawidłowe dane checklisty.')
      const { pobierzChecklistePaczki } = await import('../../../moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek')
      const checklista = pobierzChecklistePaczki(dokument.id)?.daneDokumentu
      if (!checklista) throw new Error('Nie można odczytać checklisty po ID.')
      if (!czyMoznaEksportowacCheckliste(checklista)) throw new Error('Checklista jest zarchiwizowana.')
      return { zawartosc: <div className="checklista-paczki"><Druk obszar={{ current: null }} dane={checklista} zasoby={zasoby} blokId={null} tryb={false} ustawBlok={() => undefined} zmienBlok={() => undefined} /></div>, ustawienia: {} }
    }
    default: throw new Error('Brak adaptera eksportu tego typu dokumentu.')
  }
}

export async function renderujDokumentPakietu(dokument: Dokument<unknown, unknown>, konfiguracja: KonfiguracjaPakietu, sygnal: AbortSignal): Promise<WynikEksportuDokumentu> {
  sygnal.throwIfAborted()
  const renderer = await przygotujRenderer(dokument, konfiguracja)
  sygnal.throwIfAborted()
  // Osobny dokument izoluje viewport, zoom, kontenery i style formularza.
  const ramka = document.createElement('iframe')
  ramka.title = 'Renderowanie eksportowe dokumentu'
  ramka.setAttribute('aria-hidden', 'true')
  ramka.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:960px;border:0;pointer-events:none;'
  document.body.append(ramka)
  const dokumentRamki = ramka.contentDocument!
  dokumentRamki.head.innerHTML = '<meta charset="UTF-8">'
  const baza = dokumentRamki.createElement('base')
  baza.href = document.baseURI
  dokumentRamki.head.append(baza)
  document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach((styl) => dokumentRamki.head.append(styl.cloneNode(true)))
  dokumentRamki.documentElement.style.setProperty('--ui-skala-przegladarki', '1')
  dokumentRamki.documentElement.style.zoom = '1'
  dokumentRamki.body.style.cssText = 'margin:0;width:1280px;background:white;'
  const obszar = dokumentRamki.createElement('div')
  obszar.style.cssText = 'width:1100px;min-width:1100px;'
  dokumentRamki.body.append(obszar)
  let bladRenderowania: unknown
  const korzen = createRoot(obszar, { onUncaughtError: (blad) => { bladRenderowania = blad } })
  try {
    korzen.render(renderer.zawartosc)
    const poczatek = performance.now()
    let stabilneKlatki = 0
    let poprzedni = ''
    while (stabilneKlatki < 5) {
      sygnal.throwIfAborted()
      if (bladRenderowania) throw bladRenderowania
      if (performance.now() - poczatek > 30000) throw new Error('Przekroczono czas przygotowania stron dokumentu.')
      await new Promise<void>((rozwiaz) => requestAnimationFrame(() => rozwiaz()))
      const strony = obszar.querySelectorAll<HTMLElement>('[data-strona-dokumentu]')
      const jestChecklista = obszar.querySelector('.checklista-paczki__wydruk')
      const gotowy = (strony.length || jestChecklista) && !obszar.querySelector('.program-strony__oczekiwanie')
      const sygnatura = gotowy ? Array.from(strony).map((strona) => [strona.scrollHeight, strona.scrollWidth, strona.textContent?.length].join(':')).join('|') + (jestChecklista?.scrollHeight ?? '') : ''
      stabilneKlatki = sygnatura && sygnatura === poprzedni ? stabilneKlatki + 1 : 0
      poprzedni = sygnatura
    }
    await dokumentRamki.fonts.ready
    await Promise.all(Array.from(obszar.querySelectorAll('img')).map((obraz) => obraz.decode()))
    sygnal.throwIfAborted()
    const blad = renderer.sprawdz?.(obszar)
    if (blad) throw new Error(blad)
    const pdf = await renderujPdfDokumentu({ obszarDokumentu: (obszar.querySelector('.checklista-paczki__wydruk') as HTMLElement | null) ?? obszar, nazwaPliku: dokument.tytul, ...renderer.ustawienia })
    sygnal.throwIfAborted()
    return { dokumentId: dokument.id, wersja: dokument.wersja, nazwa: dokument.tytul, pdfBytes: new Uint8Array(pdf.output('arraybuffer')), liczbaStron: pdf.getNumberOfPages(), grupaId: dokument.powiazania.grupaId }
  } finally {
    korzen.unmount()
    ramka.remove()
  }
}
