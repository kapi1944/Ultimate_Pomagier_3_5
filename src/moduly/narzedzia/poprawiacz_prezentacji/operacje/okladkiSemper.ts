import type { DaneOkladki } from './mapowanieDanych'
import { wartoscPola, zastapTekstObiektu } from './mapowanieDanych'
import { otworzPptx } from '../pptx/otworzPptx'
import { potomkowieXml } from '../pptx/xmlPptx'
import { zapiszZmianyPptx } from '../pptx/zmianyPptx'

export type OrientacjaOkladki = 'pionowa' | 'pozioma'

export async function wypelnijSzablonOkladki(bufor: ArrayBuffer, orientacja: OrientacjaOkladki, dane: DaneOkladki) {
  if (!dane.tytul.trim()) throw new Error('Uzupełnij nazwę szkolenia dla okładki SEMPER.')
  const model = await otworzPptx(bufor)
  const slajd = model.slajdy[0]
  const pola = orientacja === 'pionowa'
    ? { tytul: '6', data: '33', trener: '22' } : { tytul: '29717', data: '33', trener: '22' }
  const trener = orientacja === 'pionowa' ? ['Ekspert Merytoryczny:', dane.trener, dane.emailTrenera].filter(Boolean).join('\n') : wartoscPola('trenerIEmail', dane)
  for (const [id, tekst] of [[pola.tytul, dane.tytul], [pola.data, wartoscPola('dataIMiejscowosc', dane)], [pola.trener, trener]] as const) {
    const obiekt = slajd.obiekty.find((pozycja) => pozycja.id === id)
    if (!obiekt) throw new Error('Szablon SEMPER nie zawiera oczekiwanego pola.')
    zastapTekstObiektu(obiekt, tekst)
  }
  const prezentacja = model.czesciXml.get('ppt/presentation.xml')!
  for (const element of potomkowieXml(prezentacja, 'sldId').slice(1)) element.parentNode?.removeChild(element)
  return zapiszZmianyPptx(model, new Map([[slajd.czesc, slajd.dokument], ['ppt/presentation.xml', prezentacja]]))
}

export async function przygotujOkladkeSemper(orientacja: OrientacjaOkladki, dane: DaneOkladki) {
  const odpowiedz = await fetch(`${import.meta.env.BASE_URL}szablony/prezentacje/semper-${orientacja === 'pionowa' ? 'pion' : 'poziom'}.pptx`)
  if (!odpowiedz.ok) throw new Error('Nie udało się odczytać lokalnego szablonu SEMPER.')
  return wypelnijSzablonOkladki(await odpowiedz.arrayBuffer(), orientacja, dane)
}
