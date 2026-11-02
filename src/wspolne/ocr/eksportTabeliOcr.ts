import JSZip from 'jszip'
import { opisPodpisuDoEksportu, type TabelaOcr } from './modelTabeliOcr'

export function wierszeEksportuOcr(tabele: TabelaOcr[], tylkoZaznaczone = false) {
  return tabele.flatMap((tabela) => [tabela.naglowki, ...tabela.wiersze.filter((_, indeks) => !tylkoZaznaczone || tabela.zaznaczone.includes(indeks)).map((wiersz) => wiersz.map((pole) => pole.podpis ? opisPodpisuDoEksportu(pole.tekst) : pole.tekst))])
}
export function tekstTabeliOcr(tabele: TabelaOcr[], tylkoZaznaczone = false) {
  return wierszeEksportuOcr(tabele, tylkoZaznaczone).map((wiersz) => wiersz.map((tekst) => tekst.replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n')
}
export function csvTabeliOcr(tabele: TabelaOcr[]) {
  return '\uFEFF' + wierszeEksportuOcr(tabele).map((wiersz) => wiersz.map((tekst) => `"${('=+@-'.includes([...tekst].find((znak) => znak.charCodeAt(0) > 32 && znak.trim()) ?? '\uFFFF') ? `'${tekst}` : tekst).replace(/"/g, '""')}"`).join(';')).join('\r\n')
}
function xmlOcr(tekst: string) { return [...tekst].filter((znak) => znak.charCodeAt(0) >= 32 || [9, 10, 13].includes(znak.charCodeAt(0))).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function literyKolumnyOcr(indeks: number): string { return indeks < 26 ? String.fromCharCode(65 + indeks) : literyKolumnyOcr(Math.floor(indeks / 26) - 1) + String.fromCharCode(65 + indeks % 26) }
// Adapter tabeli do OOXML wykorzystuje istniejący JSZip i format inlineStr używany w eksporcie kont.
export async function xlsxTabeliOcr(tabele: TabelaOcr[]) {
  const archiwum = new JSZip()
  archiwum.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  archiwum.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  archiwum.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Wynik OCR" sheetId="1" r:id="rId1"/></sheets></workbook>')
  archiwum.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
  archiwum.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>${wierszeEksportuOcr(tabele).map((wiersz, indeks) => `<row r="${indeks + 1}">${wiersz.map((tekst, kolumna) => `<c r="${literyKolumnyOcr(kolumna)}${indeks + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlOcr(tekst)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`)
  return archiwum.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}

export function czyPoprawnySzkicOcr(dane: unknown): dane is { wersja: 1; tabele: TabelaOcr[] } {
  if (!dane || typeof dane !== 'object' || !('wersja' in dane) || dane.wersja !== 1 || !('tabele' in dane) || !Array.isArray(dane.tabele) || dane.tabele.length > 30) return false
  return dane.tabele.every((tabela: unknown) => {
    if (!tabela || typeof tabela !== 'object' || !('id' in tabela) || typeof tabela.id !== 'string' || !('strona' in tabela) || typeof tabela.strona !== 'number' || !('naglowki' in tabela) || !Array.isArray(tabela.naglowki) || !tabela.naglowki.every((wartosc: unknown) => typeof wartosc === 'string') || !('wiersze' in tabela) || !Array.isArray(tabela.wiersze) || tabela.wiersze.length > 1000 || !('zaznaczone' in tabela) || !Array.isArray(tabela.zaznaczone) || !tabela.zaznaczone.every(Number.isInteger) || !('informacje' in tabela) || typeof tabela.informacje !== 'string' || !('odręczna' in tabela) || typeof tabela.odręczna !== 'boolean') return false
    const liczbaKolumn = tabela.naglowki.length
    return tabela.wiersze.every((wiersz: unknown) => Array.isArray(wiersz) && wiersz.length === liczbaKolumn && wiersz.every((pole: unknown) => pole && typeof pole === 'object' && 'tekst' in pole && typeof pole.tekst === 'string' && 'pewnosc' in pole && typeof pole.pewnosc === 'number' && 'zweryfikowana' in pole && typeof pole.zweryfikowana === 'boolean'))
  })
}
