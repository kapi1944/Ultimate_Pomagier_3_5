import JSZip from 'jszip'

export const przestrzenPrezentacji = 'http://schemas.openxmlformats.org/presentationml/2006/main'
export const przestrzenRysunku = 'http://schemas.openxmlformats.org/drawingml/2006/main'
export const przestrzenRelacji = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const przestrzenPakietu = 'http://schemas.openxmlformats.org/package/2006/relationships'

export function ksztaltTestowy(id: number, x: number, y: number, cx: number, cy: number, tekst = '', kolor = '087F8C') {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Obiekt ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${kolor}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${tekst}</a:t></a:r></a:p></p:txBody></p:sp>`
}

export function xmlSlajdu(obiekty: string, dodatkowe = '') {
  return `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="${przestrzenPrezentacji}" xmlns:a="${przestrzenRysunku}" xmlns:r="${przestrzenRelacji}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${obiekty}</p:spTree></p:cSld>${dodatkowe}</p:sld>`
}

export async function utworzFixturePptx(dodatkowePierwszegoSlajdu = '') {
  const archiwum = new JSZip()
  archiwum.comment = 'Fixture PPTX – zachować komentarz'
  archiwum.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${[1, 2, 3].map((numer) => `<Override PartName="/ppt/slides/slide${numer}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`)
  archiwum.file('_rels/.rels', `<Relationships xmlns="${przestrzenPakietu}"><Relationship Id="rId1" Type="${przestrzenRelacji}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`)
  archiwum.file('ppt/presentation.xml', `<p:presentation xmlns:p="${przestrzenPrezentacji}" xmlns:r="${przestrzenRelacji}"><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId1"/><p:sldId id="258" r:id="rId2"/></p:sldIdLst><p:sldSz cx="10000000" cy="6000000"/></p:presentation>`)
  archiwum.file('ppt/_rels/presentation.xml.rels', `<Relationships xmlns="${przestrzenPakietu}">${[1, 2, 3].map((numer) => `<Relationship Id="rId${numer}" Type="${przestrzenRelacji}/slide" Target="slides/slide${numer}.xml"/>`).join('')}</Relationships>`)
  for (const numer of [1, 3]) {
    archiwum.file(`ppt/slides/slide${numer}.xml`, xmlSlajdu(
      ksztaltTestowy(2, 0, 0, 10000000, 120000)
      + ksztaltTestowy(3, 8800000, 5400000, 600000, 300000, String(numer), 'FFFFFF')
      + ksztaltTestowy(4, 0, 3000000, 10000000, 120000, '', '087F8C')
      + ksztaltTestowy(5, 8800000, 5400000, 600000, 300000, 'Rok 2026', 'FFFFFF'), numer === 3 ? dodatkowePierwszegoSlajdu : ''))
    archiwum.file(`ppt/slides/_rels/slide${numer}.xml.rels`, `<Relationships xmlns="${przestrzenPakietu}"><Relationship Id="rId1" Type="${przestrzenRelacji}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`)
  }
  archiwum.file('ppt/slides/slide2.xml', xmlSlajdu(ksztaltTestowy(2, 2000000, 2000000, 1000000, 1000000, 'Treść')))
  archiwum.file('ppt/slideLayouts/slideLayout1.xml', `<p:sldLayout xmlns:p="${przestrzenPrezentacji}" xmlns:a="${przestrzenRysunku}"><p:cSld><p:spTree>${ksztaltTestowy(8, 0, 0, 10000000, 120000)}</p:spTree></p:cSld></p:sldLayout>`)
  archiwum.file('ppt/slideMasters/slideMaster1.xml', `<p:sldMaster xmlns:p="${przestrzenPrezentacji}" xmlns:a="${przestrzenRysunku}"><p:cSld><p:spTree>${ksztaltTestowy(9, 8800000, 5400000, 600000, 300000, '99')}</p:spTree></p:cSld></p:sldMaster>`)
  archiwum.file('ppt/theme/theme1.xml', `<a:theme xmlns:a="${przestrzenRysunku}" name="Fixture"/>`)
  archiwum.file('ppt/media/image1.bin', new Uint8Array([0, 255, 16, 24]))
  archiwum.file('ppt/embeddings/oleObject1.bin', new Uint8Array([17, 32, 0, 255]))
  archiwum.file('docProps/custom.xml', '<custom>pozostawić dokładnie</custom>')
  return archiwum.generateAsync({ type: 'arraybuffer' })
}
