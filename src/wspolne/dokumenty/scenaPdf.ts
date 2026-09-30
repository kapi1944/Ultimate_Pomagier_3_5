export type StylTekstuPdf = 'normal' | 'bold' | 'italic' | 'bolditalic'

export type ElementScenyPdf =
  | { rodzaj: 'poczatek_grupy'; przyciecie?: { x: number; y: number; szerokosc: number; wysokosc: number }; krycie?: number }
  | { rodzaj: 'koniec_grupy' }
  | { rodzaj: 'tekst'; tekst: string; x: number; y: number; szerokosc: number; rozmiar: number; styl: StylTekstuPdf; kolor: string; podkreslenie: boolean }
  | { rodzaj: 'prostokat'; x: number; y: number; szerokosc: number; wysokosc: number; kolor: string }
  | { rodzaj: 'linia'; x: number; y: number; koniecX: number; koniecY: number; grubosc: number; kolor: string; kreski?: number[] }
  | { rodzaj: 'obraz'; zrodlo: string; x: number; y: number; szerokosc: number; wysokosc: number; przyciecie?: { x: number; y: number; szerokosc: number; wysokosc: number } }

export type ScenaPdf = { strony: { elementy: ElementScenyPdf[] }[] }
