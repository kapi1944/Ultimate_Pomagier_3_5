import JSZip from 'jszip'
import type { TypPoprawki } from '../modele/modelPrezentacji'
import type { ModelPptx } from '../pptx/modelPptx'
import { otworzPptx } from '../pptx/otworzPptx'
import { analizujPrezentacje } from '../analiza/analizujPrezentacje'
import { parsujXmlPptx } from '../pptx/xmlPptx'
import { odczytajObiektySlajdu } from '../pptx/slajdyPptx'

export type RaportPoprawek = { paski: number; numery: number; slajdy: number[] }

export async function zastosujPoprawki(model: ModelPptx, wybrane: TypPoprawki[]): Promise<{ model: ModelPptx; raport: RaportPoprawek }> {
  const analiza = analizujPrezentacje(model)
  const trafienia = analiza.problemy.filter((problem) => wybrane.includes(problem.typ))
  if (!trafienia.length) throw new Error('Brak zaznaczonych poprawek do zastosowania.')
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  const slajdy = [...new Set(trafienia.map((problem) => problem.numerSlajdu))]
  for (const numer of slajdy) {
    const slajd = model.slajdy.find((pozycja) => pozycja.numer === numer)!
    const plik = archiwum.file(slajd.czesc)
    if (!plik) throw new Error(`Brak części ${slajd.czesc}.`)
    const dokument = parsujXmlPptx(await plik.async('string'), slajd.czesc)
    const obiekty = odczytajObiektySlajdu(dokument)
    for (const problem of trafienia.filter((pozycja) => pozycja.numerSlajdu === numer)) {
      const obiekt = obiekty.find((pozycja) => pozycja.klucz === problem.kluczObiektu)
      if (!obiekt?.element.parentNode) throw new Error('Nie odnaleziono wskazanego obiektu slajdu.')
      const wezly = Array.from(dokument.getElementsByTagName('*'))
      if (obiekt.id && wezly.some((element) => Array.from(element.attributes).some((atrybut) =>
        (['spid', 'spId'].includes(atrybut.localName) || (['stCxn', 'endCxn'].includes(element.localName) && atrybut.localName === 'id')) && atrybut.value === obiekt.id))) {
        throw new Error(`Obiekt na slajdzie ${numer} jest używany przez animację lub połączenie. Nie zmieniono pliku.`)
      }
      obiekt.element.parentNode.removeChild(obiekt.element)
    }
    archiwum.file(slajd.czesc, new XMLSerializer().serializeToString(dokument))
  }
  const poprawiony = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }))
  const poZmianie = analizujPrezentacje(poprawiony)
  for (const typ of ['GÓRNY_PASEK', 'NUMERACJA'] as const) {
    const przed = analiza.problemy.filter((problem) => problem.typ === typ).length
    const usuniete = trafienia.filter((problem) => problem.typ === typ).length
    const po = poZmianie.problemy.filter((problem) => problem.typ === typ).length
    if (po !== przed - usuniete) throw new Error('Weryfikacja poprawek nie powiodła się. Oryginalny plik pozostał bez zmian.')
  }
  return { model: poprawiony, raport: {
    paski: trafienia.filter((problem) => problem.typ === 'GÓRNY_PASEK').length,
    numery: trafienia.filter((problem) => problem.typ === 'NUMERACJA').length,
    slajdy,
  } }
}
