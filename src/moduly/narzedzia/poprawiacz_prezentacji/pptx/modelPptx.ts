import type JSZip from 'jszip'

export type GeometriaPptx = { x: number; y: number; cx: number; cy: number }

export type ObiektSlajdu = {
  klucz: string
  id: string
  nazwa: string
  typ: 'ksztalt' | 'obraz' | 'ramka' | 'grupa'
  geometria: GeometriaPptx | null
  tekst: string
  wypelnienie: string | null
  linia: string | null
  ksztalt: string | null
  tabela: { wiersze: number; kolumny: number } | null
  kolejnosc: number
  czyProstaGeometria: boolean
  element: Element
}

export type SlajdPptx = {
  numer: number
  czesc: string
  szerokosc: number
  wysokosc: number
  dokument: Document
  obiekty: ObiektSlajdu[]
}

export type ModelPptx = {
  archiwum: JSZip
  buforZrodlowy: ArrayBuffer
  czesciXml: Map<string, Document>
  slajdy: SlajdPptx[]
}
