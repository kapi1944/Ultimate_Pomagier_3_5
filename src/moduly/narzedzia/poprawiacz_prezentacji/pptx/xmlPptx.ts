export const przestrzeniePptx = {
  prezentacja: ['http://schemas.openxmlformats.org/presentationml/2006/main', 'http://purl.oclc.org/ooxml/presentationml/main'],
  rysunek: ['http://schemas.openxmlformats.org/drawingml/2006/main', 'http://purl.oclc.org/ooxml/drawingml/main'],
  relacje: ['http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'http://purl.oclc.org/ooxml/officeDocument/relationships'],
}

export function parsujXmlPptx(tekst: string, nazwa: string): Document {
  if (/<!DOCTYPE/i.test(tekst)) throw new Error(`Niedozwolona deklaracja DTD w ${nazwa}.`)
  const dokument = new DOMParser().parseFromString(tekst, 'application/xml')
  if (!dokument.documentElement || dokument.getElementsByTagNameNS('*', 'parsererror').length) {
    throw new Error(`Niepoprawny XML: ${nazwa}.`)
  }
  return dokument
}

export function dzieciXml(element: Node, nazwa?: string): Element[] {
  return Array.from(element.childNodes).filter((wezel): wezel is Element =>
    wezel.nodeType === 1 && (!nazwa || (wezel as Element).localName === nazwa))
}

export function potomkowieXml(element: Element | Document, nazwa: string): Element[] {
  return Array.from(element.getElementsByTagNameNS('*', nazwa))
}

export function dzieckoXml(element: Node | undefined, nazwa: string): Element | undefined {
  return element ? dzieciXml(element, nazwa)[0] : undefined
}

export function liczbaXml(element: Element | undefined, atrybut: string): number | null {
  const wartosc = element?.getAttribute(atrybut)
  if (wartosc === null || wartosc === undefined || wartosc.trim() === '') return null
  const liczba = Number(wartosc)
  return Number.isFinite(liczba) ? liczba : null
}
