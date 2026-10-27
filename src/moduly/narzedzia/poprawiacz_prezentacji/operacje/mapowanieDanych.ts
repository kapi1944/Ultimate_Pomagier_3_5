import type { SzczegolyDoGeneratoraDokumentu } from '../../../../wspolne/integracje/szczegolyDoDokumentow/pobierzSzczegolyDoGeneratorow'
import type { ModelPptx, ObiektSlajdu } from '../pptx/modelPptx'
import { otworzPptx } from '../pptx/otworzPptx'
import { dzieckoXml, dzieciXml, potomkowieXml, przestrzeniePptx } from '../pptx/xmlPptx'
import { dopasujTekstDoPola, zapiszZmianyPptx } from '../pptx/zmianyPptx'

export type DaneOkladki = { tytul: string; data: string; miejscowosc: string; trener: string; emailTrenera: string; klient: string }
export type PolePrezentacji = keyof DaneOkladki | 'dataIMiejscowosc' | 'trenerIEmail'
export type MapowaniePola = { idObiektu: string; pole: PolePrezentacji | ''; wartoscReczna?: string }
export const pusteDaneOkladki: DaneOkladki = { tytul: '', data: '', miejscowosc: '', trener: '', emailTrenera: '', klient: '' }
export const etykietyPol: Record<PolePrezentacji, string> = { tytul: 'Nazwa szkolenia', data: 'Data szkolenia', miejscowosc: 'Miejscowość', trener: 'Trener', emailTrenera: 'E-mail trenera', klient: 'Klient', dataIMiejscowosc: 'Data i miejscowość', trenerIEmail: 'Trener i e-mail' }

export function daneOkladkiZeSzczegolow(szczegoly: SzczegolyDoGeneratoraDokumentu, grupaId: string): DaneOkladki {
  const grupa = szczegoly.grupy.find((pozycja) => pozycja.id === grupaId)
  if (!grupa) throw new Error('Wybierz grupę szkoleniową, aby ustalić właściwy termin i trenera.')
  const formatuj = (data: string) => /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : data
  return {
    tytul: szczegoly.dane.tytulSzkolenia, klient: szczegoly.dane.nazwaKlienta || szczegoly.dane.nabywca.nazwa,
    data: [grupa.dataOd, grupa.dataDo !== grupa.dataOd ? grupa.dataDo : ''].filter(Boolean).map(formatuj).join(' – '),
    miejscowosc: grupa.formaSzkolenia === 'Online' ? 'Online' : grupa.miejsce,
    trener: grupa.trenerzy.map((trener) => trener.imieNazwisko).filter(Boolean).join(', '),
    emailTrenera: grupa.trenerzy.map((trener) => trener.email).filter(Boolean).join(', '),
  }
}

export function wartoscPola(pole: PolePrezentacji, dane: DaneOkladki) {
  if (pole === 'dataIMiejscowosc') return [dane.data, dane.miejscowosc].filter(Boolean).join(' | ')
  if (pole === 'trenerIEmail') return [`Ekspert Merytoryczny: ${dane.trener}`, dane.emailTrenera].filter(Boolean).join('\n')
  return dane[pole]
}

export function zaproponujMapowanie(obiekt: ObiektSlajdu): PolePrezentacji | '' {
  const tekst = obiekt.tekst.trim()
  const znacznik = /^\{\{(\w+)\}\}$/.exec(tekst)?.[1]
  if (znacznik && znacznik in etykietyPol) return znacznik as PolePrezentacji
  if (/^Ekspert Merytoryczny:/i.test(tekst)) return 'trenerIEmail'
  if (/^[„“].*[””]$/s.test(tekst)) return 'tytul'
  // Sam placeholder body/title nie identyfikuje znaczenia pola w obcym szablonie.
  return ''
}

export function zastapTekstObiektu(obiekt: ObiektSlajdu, tekst: string) {
  const pole = dzieckoXml(obiekt.element, 'txBody')
  if (!pole) throw new Error('Wybrany obiekt nie jest edytowalnym polem tekstowym.')
  const dokument = obiekt.element.ownerDocument
  const akapity = dzieciXml(pole, 'p')
  const wzory = akapity.map((akapit) => akapit.cloneNode(true) as Element)
  for (const akapit of akapity) pole.removeChild(akapit)
  for (const [indeks, wiersz] of tekst.split('\n').entries()) {
    const wzor = wzory[Math.min(indeks, wzory.length - 1)]
    const akapit = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:p')
    const wlasciwosci = wzor && dzieckoXml(wzor, 'pPr')
    if (wlasciwosci) akapit.appendChild(wlasciwosci.cloneNode(true))
    const fragment = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:r')
    const styl = wzor && potomkowieXml(wzor, 'rPr')[0]
    if (styl) {
      const kopia = styl.cloneNode(true) as Element
      for (const lacze of [...potomkowieXml(kopia, 'hlinkClick'), ...potomkowieXml(kopia, 'hlinkMouseOver')]) lacze.parentNode?.removeChild(lacze)
      fragment.appendChild(kopia)
    }
    const tresc = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:t')
    tresc.textContent = wiersz
    fragment.appendChild(tresc); akapit.appendChild(fragment); pole.appendChild(akapit)
  }
  dopasujTekstDoPola(obiekt, tekst)
}

export async function zastosujMapowanie(model: ModelPptx, dane: DaneOkladki, mapowanie: MapowaniePola[]) {
  const kopia = await otworzPptx(model.buforZrodlowy)
  const slajd = kopia.slajdy[0]
  const wybrane = mapowanie.filter((pozycja) => pozycja.pole || pozycja.wartoscReczna !== undefined)
  if (!wybrane.length) throw new Error('Wybierz przynajmniej jedno pole do uzupełnienia.')
  if (new Set(wybrane.map((pozycja) => pozycja.idObiektu)).size !== wybrane.length) throw new Error('To samo pole wskazano kilkakrotnie.')
  for (const pozycja of wybrane) {
    const obiekt = slajd.obiekty.find((kandydat) => kandydat.id === pozycja.idObiektu)
    if (!obiekt) throw new Error('Nie odnaleziono pola pierwszego slajdu.')
    const wartosc = pozycja.wartoscReczna ?? (pozycja.pole ? wartoscPola(pozycja.pole, dane) : '')
    if (!wartosc.trim()) throw new Error(`Brak wartości dla pola „${pozycja.pole ? etykietyPol[pozycja.pole] : obiekt.nazwa}”. Wpisz ją lub pomiń pole.`)
    zastapTekstObiektu(obiekt, wartosc)
  }
  return zapiszZmianyPptx(kopia, new Map([[slajd.czesc, slajd.dokument]]))
}
