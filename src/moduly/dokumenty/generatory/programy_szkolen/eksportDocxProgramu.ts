import { strToU8, zipSync } from 'fflate'
import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import { geometriaStronyProgramu } from './geometriaStronyProgramu'
import { normalizujWciecieProgramu } from './oznaczeniaProgramu'

const przestrzenWord = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const przestrzenRelacji = 'http://schemas.openxmlformats.org/package/2006/relationships'
const typDokumentu = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const naglowekXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

function zabezpieczXml(tekst: string) {
  return tekst.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function formatujTekst(tekst: string, pogrubienie: boolean) {
  function fragment(tresc: string, format = '') {
    return `<w:r><w:rPr>${format}${pogrubienie && format !== '<w:b/>' ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${zabezpieczXml(tresc)}</w:t></w:r>`
  }
  let poczatek = 0
  const fragmenty: string[] = []
  for (const dopasowanie of tekst.matchAll(/(\*\*([^*]+)\*\*|\+\+([^+]+)\+\+|\*([^*\n]+)\*)/g)) {
    fragmenty.push(fragment(tekst.slice(poczatek, dopasowanie.index)))
    fragmenty.push(fragment(dopasowanie[2] ?? dopasowanie[3] ?? dopasowanie[4], dopasowanie[2] ? '<w:b/>' : dopasowanie[3] ? '<w:u w:val="single"/>' : '<w:i/>'))
    poczatek = dopasowanie.index + dopasowanie[0].length
  }
  fragmenty.push(fragment(tekst.slice(poczatek)))
  return fragmenty.join('')
}

function naDwudziestePunktu(mm: number) {
  return Math.round(mm * 1440 / 25.4)
}

function akapit(tekst: string, wciecieMm: number, naglowek = false) {
  return `<w:p><w:pPr>${naglowek ? '<w:keepNext/>' : ''}<w:ind w:left="${naDwudziestePunktu(wciecieMm)}"/></w:pPr>${formatujTekst(tekst, naglowek)}</w:p>`
}

function renderujBlok(blok: BlokDokumentu, pokazDni: boolean): string {
  const czyPunkt = blok.typ === 'Punkt' || blok.typ === 'Podpunkt'
  const oznaczenie = typeof blok.dane?.oznaczenieWyswietlane === 'string' ? blok.dane.oznaczenieWyswietlane : ''
  const wciecie = normalizujWciecieProgramu(blok.dane?.wciecieMm) ?? 0
  const baza = czyPunkt ? Math.max(0, Math.min(8, blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0)) * 22 * 25.4 / 96 : 0
  const tresc = blok.tresc && (pokazDni || blok.typ !== 'Dzien')
    ? akapit(`${oznaczenie ? `${oznaczenie} ` : ''}${blok.tresc}`, baza + wciecie, blok.typ === 'Dzien' || blok.typ === 'Modul')
    : ''
  return tresc + blok.dzieci.map((dziecko) => renderujBlok(dziecko, pokazDni)).join('')
}

export function utworzDocxProgramu(dokument: DokumentBlokowy, tytul: string, pokazDni: boolean, surowyProgram?: { tekst: string; wciecia: (number | undefined)[] }) {
  const geometria = geometriaStronyProgramu
  const marginesBoczny = naDwudziestePunktu(geometria.odstepPoziomyMm)
  const marginesPionowy = naDwudziestePunktu(geometria.odstepGornyMm)
  const akapity = surowyProgram
    ? surowyProgram.tekst.split('\n').map((wiersz, indeks) => akapit(wiersz, surowyProgram.wciecia[indeks] ?? 0)).join('')
    : dokument.struktura.map((blok) => renderujBlok(blok, pokazDni)).join('')
  const tresc = akapit(tytul, 0, true) + akapity
  return zipSync({
    '[Content_Types].xml': strToU8(`${naglowekXml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="${typDokumentu}.main+xml"/></Types>`),
    '_rels/.rels': strToU8(`${naglowekXml}<Relationships xmlns="${przestrzenRelacji}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    'word/document.xml': strToU8(`${naglowekXml}<w:document xmlns:w="${przestrzenWord}"><w:body>${tresc}<w:sectPr><w:pgSz w:w="${naDwudziestePunktu(geometria.szerokoscMm)}" w:h="${naDwudziestePunktu(geometria.wysokoscMm)}"/><w:pgMar w:top="${marginesPionowy}" w:right="${marginesBoczny}" w:bottom="${marginesPionowy}" w:left="${marginesBoczny}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`),
  })
}

export function pobierzDocxProgramu(dokument: DokumentBlokowy, tytul: string, nazwaPliku: string, pokazDni: boolean, surowyProgram?: Parameters<typeof utworzDocxProgramu>[3]) {
  const bajty = new Uint8Array(utworzDocxProgramu(dokument, tytul, pokazDni, surowyProgram))
  const adres = URL.createObjectURL(new Blob([bajty], { type: typDokumentu }))
  const link = document.createElement('a')
  link.href = adres
  link.download = nazwaPliku.replace(/\.pdf$/i, '') + '.docx'
  link.click()
  setTimeout(() => URL.revokeObjectURL(adres), 1000)
}
