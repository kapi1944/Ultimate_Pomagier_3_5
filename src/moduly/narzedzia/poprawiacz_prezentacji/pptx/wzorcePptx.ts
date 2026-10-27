import type { ModelPptx, ObiektSlajdu, SlajdPptx } from './modelPptx'
import { odczytajRelacje } from './relacjePptx'
import { odczytajObiektySlajdu } from './slajdyPptx'

export function znajdzPowiazanaCzesc(model: Pick<ModelPptx, 'czesciXml'>, czesc: string, typ: string) {
  const segmenty = czesc.split('/')
  const nazwa = segmenty.pop()!
  const relacje = model.czesciXml.get(`${segmenty.join('/')}/_rels/${nazwa}.rels`)
  return relacje ? odczytajRelacje(relacje, czesc).find((relacja) => relacja.typ.endsWith(`/${typ}`))?.cel ?? null : null
}

export function uzupelnijWzorceSlajdu(model: Pick<ModelPptx, 'czesciXml'>, slajd: SlajdPptx) {
  slajd.czescUkladu = znajdzPowiazanaCzesc(model, slajd.czesc, 'slideLayout')
  slajd.czescWzorca = slajd.czescUkladu ? znajdzPowiazanaCzesc(model, slajd.czescUkladu, 'slideMaster') : null
  const odczytaj = (czesc: string | null) => {
    const dokument = czesc ? model.czesciXml.get(czesc) : null
    return dokument ? odczytajObiektySlajdu(dokument) : []
  }
  const uklad = odczytaj(slajd.czescUkladu)
  const wzorzec = odczytaj(slajd.czescWzorca)
  const odpowiednik = (obiekt: ObiektSlajdu, obiekty: ObiektSlajdu[]) => {
    if (!obiekt.pole) return undefined
    const dokladny = obiekty.find((kandydat) => kandydat.pole?.indeks === obiekt.pole?.indeks && kandydat.pole?.typ === obiekt.pole?.typ)
    const tegoTypu = obiekty.filter((kandydat) => kandydat.pole?.typ === obiekt.pole?.typ)
    return dokladny ?? (tegoTypu.length === 1 ? tegoTypu[0] : undefined)
  }
  for (const obiekt of [...uklad, ...slajd.obiekty]) {
    if (!obiekt.geometria && obiekt.pole) {
      const odziedziczony = odpowiednik(obiekt, uklad.filter((pozycja) => pozycja !== obiekt)) ?? odpowiednik(obiekt, wzorzec)
      if (odziedziczony?.geometria) obiekt.geometria = { ...odziedziczony.geometria }
    }
  }
  const dokumentUkladu = slajd.czescUkladu ? model.czesciXml.get(slajd.czescUkladu) : null
  const czyWidocznyWzorzec = ![slajd.dokument, dokumentUkladu].some((dokument) => ['0', 'false'].includes(dokument?.documentElement.getAttribute('showMasterSp') ?? ''))
  slajd.elementyWzorca = [...(czyWidocznyWzorzec ? wzorzec : []), ...uklad]
    .filter((obiekt) => !obiekt.pole || ['sldNum', 'ftr', 'dt'].includes(obiekt.pole.typ))
}

export function czyNumeracjaWzorca(slajd: SlajdPptx) {
  return slajd.elementyWzorca.some((obiekt) => obiekt.pole?.typ === 'sldNum'
    || /slidenum/i.test(obiekt.element.textContent ?? '') || /‹#›|<#>/.test(obiekt.tekst))
}
