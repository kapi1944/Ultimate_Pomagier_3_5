import { potomkowieXml, przestrzeniePptx } from './xmlPptx'

export function rozwiazSciezkeCzesci(czesc: string, cel: string): string {
  const segmenty = cel.startsWith('/') ? [] : czesc.split('/').slice(0, -1)
  for (const segment of cel.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (!segmenty.length) throw new Error('Relacja PPTX wychodzi poza archiwum.')
      segmenty.pop()
    } else segmenty.push(segment)
  }
  return segmenty.join('/')
}

export function odczytajRelacje(dokument: Document, czesc: string) {
  return potomkowieXml(dokument, 'Relationship').filter((element) => element.getAttribute('TargetMode') !== 'External').map((element) => ({
    id: element.getAttribute('Id') ?? '',
    typ: element.getAttribute('Type') ?? '',
    cel: rozwiazSciezkeCzesci(czesc, element.getAttribute('Target') ?? ''),
  }))
}

export function ustalKolejnoscSlajdow(prezentacja: Document, relacje: Document): string[] {
  const listaRelacji = odczytajRelacje(relacje, 'ppt/presentation.xml')
  return potomkowieXml(prezentacja, 'sldId').map((element) => {
    const id = przestrzeniePptx.relacje.map((przestrzen) => element.getAttributeNS(przestrzen, 'id')).find(Boolean)
    const relacja = listaRelacji.find((pozycja) => pozycja.id === id && pozycja.typ.endsWith('/slide'))
    if (!relacja || !relacja.cel.startsWith('ppt/slides/')) throw new Error('Nie można ustalić kolejności slajdów z relacji PPTX.')
    return relacja.cel
  })
}
