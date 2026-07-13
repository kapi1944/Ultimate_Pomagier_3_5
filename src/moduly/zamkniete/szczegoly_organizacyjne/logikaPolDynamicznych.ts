import type { GrupaSzkoleniowa } from './typy'

export type KluczPolaDynamicznego = 'miejsce' | 'nazwaNiestandardowychGodzin' | 'liczbaMinutNiestandardowychGodzin'

export type ZasadyPolaDynamicznego = {
  maZastosowanie: boolean
  widoczne: boolean
  wymagane: boolean
}

export function pobierzZasadyPolaDynamicznego(grupa: GrupaSzkoleniowa, pole: KluczPolaDynamicznego): ZasadyPolaDynamicznego {
  const maZastosowanie = pole === 'miejsce' ? grupa.formaSzkolenia === 'Stacjonarne' : grupa.rodzajGodzin === 'Niestandardowe'

  return { maZastosowanie, widoczne: maZastosowanie, wymagane: maZastosowanie }
}

export type BladWalidacjiGrupy = {
  idGrupy: string
  pole: KluczPolaDynamicznego
  komunikat: string
}

function czyTekstPusty(wartosc: unknown) {
  return typeof wartosc !== 'string' || !wartosc.trim()
}

export function zbudujBledyDynamicznychPolGrupy(grupa: Partial<GrupaSzkoleniowa>): BladWalidacjiGrupy[] {
  const grupaDoSprawdzenia = grupa as GrupaSzkoleniowa
  const idGrupy = String(grupa.id ?? '')
  const bledy: BladWalidacjiGrupy[] = []

  if (pobierzZasadyPolaDynamicznego(grupaDoSprawdzenia, 'miejsce').wymagane && czyTekstPusty(grupa.miejsce)) {
    bledy.push({ idGrupy, pole: 'miejsce', komunikat: 'Miejsce: wpisz lokalizacje szkolenia' })
  }

  if (pobierzZasadyPolaDynamicznego(grupaDoSprawdzenia, 'nazwaNiestandardowychGodzin').wymagane && czyTekstPusty(grupa.nazwaNiestandardowychGodzin)) {
    bledy.push({ idGrupy, pole: 'nazwaNiestandardowychGodzin', komunikat: 'Nazwa rodzaju: wpisz nazwe godzin niestandardowych' })
  }

  if (
    pobierzZasadyPolaDynamicznego(grupaDoSprawdzenia, 'liczbaMinutNiestandardowychGodzin').wymagane &&
    (!Number.isFinite(grupa.liczbaMinutNiestandardowychGodzin) || Number(grupa.liczbaMinutNiestandardowychGodzin) < 1)
  ) {
    bledy.push({ idGrupy, pole: 'liczbaMinutNiestandardowychGodzin', komunikat: 'Liczba minut trwania: wpisz liczbe minut minimum 1' })
  }

  return bledy
}