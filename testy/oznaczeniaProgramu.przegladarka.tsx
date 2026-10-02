import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import RendererPodgladuProgramu from '../src/moduly/dokumenty/generatory/programy_szkolen/RendererPodgladuProgramu'
import RendererStronProgramu from '../src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu'
import zrodloWidoku from '../src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx?raw'
import { EdytorProgramuWysiwyg } from '../src/moduly/dokumenty/generatory/programy_szkolen/komponenty/EdytorProgramuWysiwyg'
import { pobierzPozycjeOznaczenEdytora, RozszerzenieOznaczenProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/komponenty/rozszerzenieOznaczenProgramu'
import { konwertujHtmlNaWierszeProgramu, konwertujTekstProgramuNaHtml, obsluzWklejenieProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/komponenty/konwersjaProgramuWysiwyg'
import { normalizujProgramSzkolenia, pobierzHtmlProgramuSzkolenia, utworzDokumentProgramuSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia'

function sprawdz(warunek: boolean, komunikat: string) {
  if (!warunek) throw new Error(komunikat)
  document.querySelector('#wynik')?.append(`${komunikat}\n`)
}

const tekst = 'I. Nagłówek\nPierwszy osobny akapit\nII. Kolejny\n7) Punkt\n\ta) Podpunkt\n\tb) Kolejny podpunkt'
const programRegresji = 'I.\nWprowadzenie do zmian w Prawie budowlanym 2026\n• Przegląd najnowszych aktów prawnych...\n• Zmiany...\nII.\nNowe obowiązki inwestora...\n• Obowiązki...'
const obcyHtmlRegresji = `<ol>${programRegresji.split('\n').map((wiersz) => `<li>${wiersz}</li>`).join('')}</ol>`
sprawdz(konwertujHtmlNaWierszeProgramu(obcyHtmlRegresji).tekst !== programRegresji, 'Reprodukcja: obce ol/li zniekształca program przed parserem')
for (const zrodlo of [programRegresji, 'I. Pierwszy\nII. Drugi\nIII. Trzeci', 'I) Pierwszy\nII) Drugi', '1. Pierwszy\n2) Drugi', 'a) Pierwszy\nb. Drugi', '• Pierwszy\n◦ Drugi\n▪ Trzeci\n- Czwarty', '1) Główny\n\ta) Podpunkt\n\t\t▪ Głębiej\n  b. Kolejny', 'Pierwszy akapit\nDrugi akapit\nTrzeci akapit', '<tekst> & treść']) {
  const wyniki = [true, false].map((czyHtml) => {
    const schowek = new DataTransfer()
    schowek.setData('text/plain', zrodlo)
    if (czyHtml) schowek.setData('text/html', zrodlo === programRegresji ? obcyHtmlRegresji : `<ol class="MsoListParagraph"><li>I.</li><li>Obcy tekst<ul><li>Obcy podpunkt</li></ul></li></ol>`)
    const edytorWklejania = new Editor({ extensions: [StarterKit, RozszerzenieOznaczenProgramu], editorProps: { handlePaste: obsluzWklejenieProgramu } })
    edytorWklejania.view.dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: schowek, bubbles: true, cancelable: true }))
    const wiersze = konwertujHtmlNaWierszeProgramu(edytorWklejania.getHTML())
    const oczekiwanyTekst = zrodlo.replace(/^ {2}/gm, '\t')
    sprawdz(wiersze.tekst === oczekiwanyTekst, `Paste ${czyHtml ? 'Ctrl+V' : 'Ctrl+Shift+V'} zachowuje tekst: ${zrodlo.split('\n')[0]}`)
    const dokument = utworzDokumentProgramuSzkolenia(normalizujProgramSzkolenia({ trescProgramu: wiersze.tekst, ustawieniaWierszyProgramu: wiersze.ustawienia }))
    const oczekiwanyDokument = utworzDokumentProgramuSzkolenia(normalizujProgramSzkolenia({ trescProgramu: oczekiwanyTekst }))
    const struktura = (wartosc: typeof dokument) => wartosc.struktura.map((blok) => ({ tresc: blok.tresc, poziom: blok.metadane.poziom, oznaczenie: blok.dane?.oznaczenieWyswietlane }))
    sprawdz(JSON.stringify(struktura(dokument)) === JSON.stringify(struktura(oczekiwanyDokument)), 'Schowek → edytor → parser → dane podglądu zachowuje oznaczenia')
    edytorWklejania.destroy()
    return JSON.stringify({ wiersze, struktura: struktura(dokument) })
  })
  sprawdz(wyniki[0] === wyniki[1], 'Ctrl+V i Ctrl+Shift+V dają równoważną strukturę')
}
for (const zrodlo of [tekst, '7) Pierwszy\n\ta) Podpunkt\n8) Drugi', '• Punkt\n\t◦ Podpunkt\n▪ Następny', '\t\t3) Zagnieżdżony pierwszy wiersz']) {
  let html = konwertujTekstProgramuNaHtml(zrodlo)
  for (let indeks = 0; indeks < 3; indeks += 1) {
    const wiersze = konwertujHtmlNaWierszeProgramu(html)
    sprawdz(wiersze.tekst === zrodlo, `Konwersja ${indeks + 1} zachowuje wiersze i oznaczenia: ${zrodlo.split('\n')[0]}`)
    html = konwertujTekstProgramuNaHtml(wiersze.tekst, wiersze.ustawienia)
  }
}
const bloki = konwertujHtmlNaWierszeProgramu('<div><strong>I. Nagłówek</strong></div><div>Pierwszy akapit</div><div>Drugi akapit</div>')
sprawdz(bloki.tekst === 'I. **Nagłówek**\nPierwszy akapit\nDrugi akapit', 'Wklejanie HTML zachowuje granice akapitów i pogrubienie')
sprawdz(konwertujHtmlNaWierszeProgramu('<div><strong>I.</strong> Nagłówek<div>Kolejny akapit</div></div>').tekst === 'I. Nagłówek\nKolejny akapit', 'Pogrubienie samego prefiksu i zagnieżdżone bloki nie sklejają wierszy')
const lista = konwertujHtmlNaWierszeProgramu('<ol start="7"><li><p>Pierwszy</p><ol type="a"><li><p>Podpunkt</p></li></ol></li><li><p>Drugi</p></li></ol>')
sprawdz(lista.tekst === '7. Pierwszy\n\ta) Podpunkt\n8. Drugi', 'Wklejanie listy zachowuje początek i zagnieżdżenie')

const edytor = new Editor({ extensions: [StarterKit, RozszerzenieOznaczenProgramu], content: konwertujTekstProgramuNaHtml(tekst) })
sprawdz(konwertujHtmlNaWierszeProgramu(edytor.getHTML()).tekst === tekst, 'Tiptap zachowuje oryginalne oznaczenia')
edytor.commands.setTextSelection(3)
edytor.commands.updateAttributes('listItem', { stylOznaczenia: 'brak' })
const wynik = konwertujHtmlNaWierszeProgramu(edytor.getHTML())
sprawdz(wynik.ustawienia[0].styl === 'brak', 'Zmiana pojedynczej pozycji jest serializowana')
const model = normalizujProgramSzkolenia({ trescProgramu: wynik.tekst, ustawieniaWierszyProgramu: wynik.ustawienia })
const ponownyEdytor = new Editor({ extensions: [StarterKit, RozszerzenieOznaczenProgramu], content: pobierzHtmlProgramuSzkolenia(model) })
sprawdz(konwertujHtmlNaWierszeProgramu(ponownyEdytor.getHTML()).ustawienia[0].styl === 'brak', 'Ponowne otwarcie zachowuje styl pozycji')
sprawdz(utworzDokumentProgramuSzkolenia(model).struktura[1].dane?.oznaczenieWyswietlane === '', 'Podgląd i eksport respektują styl pozycji')
edytor.destroy()
ponownyEdytor.destroy()

const tekstModulow = '\uFEFFNagłówek A\n\u200E• Punkt A\n\n\u200BNagłówek B\n• Punkt B'
const edytorModulow = new Editor({ extensions: [StarterKit, RozszerzenieOznaczenProgramu], content: konwertujTekstProgramuNaHtml(tekstModulow) })
const pozycjeModulow = pobierzPozycjeOznaczenEdytora(edytorModulow.state.doc)
sprawdz(JSON.stringify(pozycjeModulow.map((pozycja) => pozycja.poziom)) === '[0,1,0,1]', 'WYSIWYG rozdziela poziomy modułów i punktów przez istniejący parser')
sprawdz(JSON.stringify(Array.from(edytorModulow.view.dom.querySelectorAll('p[data-wyswietlane-oznaczenie]')).map((element) => element.getAttribute('data-wyswietlane-oznaczenie'))) === '["1.","2."]', 'WYSIWYG automatycznie numeruje rozpoznane nagłówki 1 i 2')
edytorModulow.destroy()
const edytorOryginalny = new Editor({ extensions: [StarterKit, RozszerzenieOznaczenProgramu.configure({ stylePoziomow: ['oryginalne'] })], content: konwertujTekstProgramuNaHtml(tekstModulow) })
sprawdz(Array.from(edytorOryginalny.view.dom.querySelectorAll('p[data-wyswietlane-oznaczenie]')).every((element) => element.getAttribute('data-wyswietlane-oznaczenie') === ''), 'Świadomie zapisane Oryginalne zachowuje nienumerowane nagłówki WYSIWYG')
edytorOryginalny.destroy()

function PodgladTestowyPaginacji() {
  useEffect(() => {
    document.body.dataset.wynik = 'pomiar'
    const obszar = document.querySelector('#edytor')!
    const obserwator = new MutationObserver(sprawdzPaginacje)
    function sprawdzPaginacje() {
      const strony = Array.from(obszar.querySelectorAll<HTMLElement>('[data-strona-dokumentu]'))
      if (strony.length < 2 || !obszar.querySelector('[role="alert"]')) return
      obserwator.disconnect()
      const wycinki = Array.from(obszar.querySelectorAll<HTMLElement>('[data-strona-dokumentu] [style*="overflow: hidden"]'))
      let koniec = 0
      for (const wycinek of wycinki) {
        const przesuniecie = Math.abs(Number.parseFloat((wycinek.firstElementChild as HTMLElement).style.transform.replace('translateY(', '')))
        sprawdz(Math.abs(przesuniecie - koniec) < 0.1, 'Wycinki DOM zachowują ciągłość treści bez duplikacji widocznych wierszy')
        koniec += wycinek.getBoundingClientRect().height
        const tresc = wycinek.closest('main')!
        sprawdz(wycinek.getBoundingClientRect().bottom <= tresc.getBoundingClientRect().bottom + 0.1, 'Awaryjny fragment mieści się w rzeczywistym obszarze strony')
      }
      sprawdz(Math.abs(koniec - wycinki[0].firstElementChild!.getBoundingClientRect().height) < 0.1, 'Suma wycinków obejmuje całą zmierzoną wysokość punktu')
      sprawdz(strony.every((strona) => strona.querySelector('.program-kartka-a4__pozycja')), 'Brak pustych stron w awaryjnej paginacji DOM')
      sprawdz(strony.flatMap((strona) => Array.from(strona.querySelectorAll('.program-kartka-a4__pozycja'))).filter((punkt) => punkt.textContent?.includes('Ostatni punkt programu.')).length === 1, 'Punkt po gigantycznym elemencie występuje dokładnie raz')
      document.body.dataset.wynik = 'OK'
    }
    obserwator.observe(obszar, { childList: true, subtree: true })
    sprawdzPaginacje()
    return () => obserwator.disconnect()
  }, [])
  const dane = normalizujProgramSzkolenia({ trescProgramu: `Nagłówek modułu\n• ${Array.from({ length: 250 }, (_, indeks) => `Fragment ${indeks + 1}: szczegółowe omówienie metody wartościowania stanowisk i praktycznego zastosowania wyniku. `).join('')}\n• Ostatni punkt programu.` })
  const style = zrodloWidoku.match(/const styleProgramuSzkolenia = `([\s\S]*?)`/)?.[1]
  if (!style) throw new Error('Brak rzeczywistych stylów generatora w teście paginacji.')
  return <>
    <style>{style}</style>
    <RendererStronProgramu dokument={utworzDokumentProgramuSzkolenia(dane)} preset="SEMPER_KOMPAKTOWY" profilFirmy="semper"
      tytul="Test gigantycznego punktu" czyJustowac={false} szerokoscLogotypu={90} gruboscObramowaniaTytulu={1}
      nazwaOrganizatora="SEMPER" kontaktOrganizatora="Test" stopkaOrganizatora="Test" czyFormatowanieSkryptowe
      tekstSurowy={dane.trescProgramu} kontekstSwobodnychBlokow={{ dane: {}, zasobyObrazow: {} }} trybRenderowania="finalny"
      kolorAkcentu="#DE1914" stylDni="naglowek" separacjaModulow="brak" stylPodpunktow="punktory" stylListyGlownej="numeracja"
      stylePoziomowListy={dane.ustawienia.stylePoziomowListy} czyPogrubiacNaglowkiListyProgramu />
  </>
}

export function EdytorTestowy() {
  const [model, ustawModel] = useState(() => normalizujProgramSzkolenia({ trescProgramu: tekst }))
  const dokument = utworzDokumentProgramuSzkolenia(model)
  return <>
    <EdytorProgramuWysiwyg wartoscHtml={pobierzHtmlProgramuSzkolenia(model)} stylePoziomow={model.ustawienia.oznaczeniaPoziomow} onZmianaTekstuProgramu={() => undefined}
      onZmianaHtml={(html) => { const wynik = konwertujHtmlNaWierszeProgramu(html); ustawModel((aktualny) => ({ ...aktualny, trescProgramu: wynik.tekst, ustawieniaWierszyProgramu: wynik.ustawienia })) }}
      onZmianaStyluPoziomu={(poziom, styl) => ustawModel((aktualny) => { const style = [...(aktualny.ustawienia.oznaczeniaPoziomow ?? [])]; while (style.length <= poziom) style.push('oryginalne'); style[poziom] = styl; return { ...aktualny, ustawienia: { ...aktualny.ustawienia, oznaczeniaPoziomow: style } } })} />
    <pre id="model">{JSON.stringify(model)}</pre>
    <pre id="oznaczenia">{JSON.stringify(dokument.struktura.slice(1).map((blok) => ({ tresc: blok.tresc, poziom: blok.metadane.poziom, oznaczenie: blok.dane?.oznaczenieWyswietlane })))}</pre>
    <RendererPodgladuProgramu dokument={dokument} trybRenderowania="finalny" kolorAkcentu="#000000" stylDni="naglowek" separacjaModulow="brak" stylPodpunktow={model.ustawienia.stylPodpunktow} stylListyGlownej={model.ustawienia.stylListyGlownej} stylePoziomowListy={model.ustawienia.stylePoziomowListy} czyPogrubiacNaglowkiListyProgramu />
  </>
}
createRoot(document.querySelector('#edytor')!).render(new URLSearchParams(window.location.search).has('paginacja') ? <PodgladTestowyPaginacji /> : <EdytorTestowy />)
document.body.dataset.wynik = 'OK'
