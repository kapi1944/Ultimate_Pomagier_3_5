import type { GrupaSzkoleniowa } from './typy'

export type KluczPolaDynamicznego = 'miejsce' | 'nazwaNiestandardowychGodzin' | 'liczbaMinutNiestandardowychGodzin'

type ZasadyPolaDynamicznego = {
  maZastosowanie: boolean
  widoczne: boolean
  wymagane: boolean
}

export function pobierzZasadyPolaDynamicznego(grupa: GrupaSzkoleniowa, pole: KluczPolaDynamicznego): ZasadyPolaDynamicznego {
  const maZastosowanie = pole === 'miejsce' ? grupa.formaSzkolenia === 'Stacjonarne' : grupa.rodzajGodzin === 'Niestandardowe'

  return { maZastosowanie, widoczne: maZastosowanie, wymagane: maZastosowanie }
}
