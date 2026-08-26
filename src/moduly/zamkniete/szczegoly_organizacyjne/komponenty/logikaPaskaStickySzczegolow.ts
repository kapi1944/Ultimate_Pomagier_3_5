import type { KluczSekcjiSzczegolow, ModelSekcyjnySzczegolow } from '../typy'

const kluczModeluWedlugIdSekcji: Partial<Record<string, KluczSekcjiSzczegolow>> = {
  'podstawowe-informacje': 'podstawoweInformacje',
  'grupy-szkoleniowe': 'grupySzkoleniowe',
  'dane-klienta': 'klient',
  harmonogram: 'harmonogram',
}

export function pobierzIdKompletnychSekcji(modelSekcyjny: ModelSekcyjnySzczegolow) {
  return new Set(
    Object.entries(kluczModeluWedlugIdSekcji)
      .filter(([, klucz]) => klucz && modelSekcyjny[klucz].wynikWalidacji && modelSekcyjny[klucz].statusKompletnosci === 'kompletna')
      .map(([idSekcji]) => idSekcji),
  )
}
