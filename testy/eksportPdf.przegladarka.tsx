import { createRoot } from 'react-dom/client'
import { getDocument, GlobalWorkerOptions, OPS } from 'pdfjs-dist'
import adresWorkera from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import RendererStronProgramu from '../src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu'
import { normalizujProgramSzkolenia, utworzDokumentProgramuSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia'
import { konfiguracjePresetowProgramu, type PresetWygladuProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/presetyProgramu'
import { zmierzScenePdf } from '../src/wspolne/dokumenty/semantykaPdf'
import { renderujScenePdf, wczytajFontyPdf, wczytajObrazyPdf } from '../src/wspolne/dokumenty/rendererPdf'
import zrodloWidoku from '../src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx?raw'

GlobalWorkerOptions.workerSrc = adresWorkera
const style = document.createElement('style')
style.textContent = zrodloWidoku.match(/const styleProgramuSzkolenia = `([\s\S]*?)`/)![1]
document.head.append(style)
const wynik = document.querySelector<HTMLPreElement>('#wynik')!
const podglad = document.querySelector<HTMLDivElement>('#podglad')!
const korzen = createRoot(podglad)
const tytul = 'Wprowadzenie do zmian w Prawie budowlanym 2026'
const polskie = 'ą ć ę ł ń ó ś ź ż Ą Ć Ę Ł Ń Ó Ś Ź Ż'
function sprawdz(warunek: boolean, opis: string) {
  if (!warunek) throw new Error(opis)
  wynik.append(`\nOK: ${opis}`)
}

async function wykonajTest() {
  const fonty = await wczytajFontyPdf()
  const przypadki = (Object.keys(konfiguracjePresetowProgramu) as PresetWygladuProgramu[]).map((preset) => ({ preset, surowy: false }))
  przypadki.push({ preset: 'SEMPER_WEDLUG_DNI', surowy: true })
  for (const { preset, surowy } of przypadki) {
    const tekstProgramu = `Dzień 1: ${polskie}\nModuł 1: Wprowadzenie\n` + Array.from({ length: 65 }, (_, indeks) => `${indeks === 20 ? 'Moduł 2: Ćwiczenia\n' : ''}${indeks + 1}) Pozycja ${indeks + 1} – **pogrubienie**, *kursywa*, ++podkreślenie++ oraz polskie znaki: ${polskie}. Przegląd zmian i obowiązków uczestników szkolenia.`).join('\n')
    const dane = normalizujProgramSzkolenia({ tytulSzkolenia: tytul, trescProgramu: tekstProgramu })
    const dokument = utworzDokumentProgramuSzkolenia(dane)
    dokument.blokiSwobodne = [{ id: 'swobodny', rola: 'pole_tekstowe', typ: 'tekst', xMm: 10, yMm: 258, szerokoscMm: 160, wysokoscMm: 8, przypisanieDoStrony: { rodzaj: 'kazda' }, widoczny: true, indeksWarstwy: 20, dane: { zrodlo: { rodzaj: 'statyczne', tekst: `Blok swobodny: ${polskie}` }, rozmiarCzcionkiPt: 9, gruboscCzcionki: 400, wyrownanie: 'lewo', interlinia: 1.2, podkreslenie: true } }]
    const zrodloSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="red"/></svg>')}`
    dokument.blokiSwobodne.push({ id: 'grafika-svg', rola: 'logo', typ: 'obraz', xMm: 185, yMm: 258, szerokoscMm: 10, wysokoscMm: 5, przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 30, dane: { zrodlo: { rodzaj: 'adres', adres: zrodloSvg }, tekstAlternatywny: 'Grafika SVG', zachowajProporcje: true, trybDopasowania: 'contain' } })
    const ustawienia = konfiguracjePresetowProgramu[preset]
    korzen.render(<div className="program-szkolen"><RendererStronProgramu dokument={dokument} preset={preset} profilFirmy="semper" tytul={tytul} czyJustowac={ustawienia.justowanie} szerokoscLogotypu={90} logotypUzytkownika="/logo-semper.png" gruboscObramowaniaTytulu={1} nazwaOrganizatora="SEMPER" kontaktOrganizatora="Kontakt: test" stopkaOrganizatora="Stopka testowa" czyFormatowanieSkryptowe={!surowy} tekstSurowy={tekstProgramu} kontekstSwobodnychBlokow={{ dane: {} }} trybRenderowania="finalny" kolorAkcentu="#de1914" stylDni="pasek" separacjaModulow="ramka" stylPodpunktow="numeracja" stylListyGlownej="numeracja" stylePoziomowListy={['•', '◦', '▪']} czyPogrubiacNaglowkiListyProgramu /></div>)
    for (let proba = 0; proba < 180; proba++) {
      await new Promise(requestAnimationFrame)
      if (podglad.querySelector('[data-strona-dokumentu]') && !podglad.querySelector('.program-strony__oczekiwanie')) break
    }
    await document.fonts.ready
    await Promise.all(Array.from(podglad.querySelectorAll('img')).map((obraz) => obraz.decode()))
    await new Promise(requestAnimationFrame)
    const strony = Array.from(podglad.querySelectorAll<HTMLElement>('[data-strona-dokumentu]'))
    const scena = zmierzScenePdf(strony)
    const obrazy = await wczytajObrazyPdf(scena)
    sprawdz(obrazy[zrodloSvg].startsWith('data:image/png'), `${preset}: adapter SVG przetwarza wyłącznie rzeczywistą grafikę`)
    const pdf = renderujScenePdf(scena, fonty, obrazy)
    const odczyt = await getDocument({ data: new Uint8Array(pdf.output('arraybuffer')) }).promise
    try {
      sprawdz(strony.length > 1 && odczyt.numPages === strony.length, `${preset}: liczba stron odpowiada finalnemu paginatorowi (${strony.length})`)
      let calyTekst = ''
      let liczbaObrazow = 0
      for (let indeks = 0; indeks < odczyt.numPages; indeks++) {
        const strona = await odczyt.getPage(indeks + 1)
        const tresc = await strona.getTextContent()
        const tekst = tresc.items.flatMap((element) => 'str' in element ? [element.str] : []).join(' ')
        calyTekst += tekst
        const modelTekstu = scena.strony[indeks].elementy.flatMap((element) => element.rodzaj === 'tekst' ? [element.tekst] : []).join(' ')
        const pozycje = [...modelTekstu.matchAll(/Pozycja\s+(\d+)/g)].map((dopasowanie) => dopasowanie[1])
        const pozycjePdf = [...tekst.matchAll(/Pozycja\s+(\d+)/g)].map((dopasowanie) => dopasowanie[1])
        if (JSON.stringify(pozycjePdf) !== JSON.stringify(pozycje)) wynik.append(`\nDiagnostyka: model=${JSON.stringify(pozycje)}, PDF=${JSON.stringify(pozycjePdf)}, tekst=${tekst}`)
        sprawdz(JSON.stringify(pozycjePdf) === JSON.stringify(pozycje), `${preset}: strona ${indeks + 1} zachowuje wszystkie pozycje modelu i ich kolejność`)
        sprawdz(tekst.includes('Blok swobodny:'), `${preset}: blok swobodny pozostaje tekstem`)
        const operacje = await strona.getOperatorList()
        liczbaObrazow += operacje.fnArray.filter((operacja) => operacja === OPS.paintImageXObject).length
        if (preset === 'SEMPER_WEDLUG_DNI' && !surowy && indeks === 0) {
          const kanwa = document.createElement('canvas')
          const widok = strona.getViewport({ scale: 1.2 })
          kanwa.width = widok.width
          kanwa.height = widok.height
          await strona.render({ canvasContext: kanwa.getContext('2d')!, canvas: kanwa, viewport: widok }).promise
          document.querySelector('#pdf')!.append(kanwa)
        }
      }
      sprawdz(calyTekst.includes(tytul), `${preset}: referencyjny tytuł jest w warstwie tekstowej PDF`)
      sprawdz(calyTekst.includes(polskie), `${preset}: pełny zestaw polskich znaków`)
      sprawdz(liczbaObrazow > 0, `${preset}: logo i rzeczywiste grafiki pozostają obrazami`)
      if (surowy) sprawdz(calyTekst.includes('Ćwiczenia'), 'Tekst surowy korzysta z tekstowego PDF')
    } finally { await odczyt.cleanup() }
  }
  wynik.append('\nSUKCES: wszystkie regresje przeglądarkowe PDF')
}
void wykonajTest().catch((blad: unknown) => { wynik.append(`\nBŁĄD: ${String(blad)}`) })
