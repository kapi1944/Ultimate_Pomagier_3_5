import { EdytowalnaWarstwaSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import type { BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import { obliczRozmiarTytuluKarty, pobierzDaneRenderowaniaKarty, type KartaNaDrzwi, type UstawieniaSzablonuKartyNaDrzwi } from './modelKartyNaDrzwi'

type Wlasciwosci = { karta: KartaNaDrzwi; ustawieniaSzablonu: UstawieniaSzablonuKartyNaDrzwi; zasobyObrazow: Record<string, string | undefined>; zaznaczonyBlokId?: string | null; trybEdycjiSzablonu?: boolean; edytowalny?: boolean; czyStronaDokumentu?: boolean; onZaznaczBlok?: (id: string | null) => void; onZmienBlok?: (blok: BlokSwobodnyDokumentu) => void }

function czyPokazacBlok(id: string, ustawienia: UstawieniaSzablonuKartyNaDrzwi) {
  const pole: Record<string, keyof typeof ustawienia.widocznoscPol> = { termin: 'termin', 'sala-lokalizacja': 'sala', grupa: 'grupa', trener: 'trener', organizator: 'organizator', 'dodatkowy-tekst': 'dodatkowyTekst' }
  return !pole[id] || ustawienia.widocznoscPol[pole[id]]
}

export default function RendererKartyNaDrzwi({ karta, ustawieniaSzablonu, zasobyObrazow, zaznaczonyBlokId = null, trybEdycjiSzablonu = false, edytowalny = false, czyStronaDokumentu = true, onZaznaczBlok, onZmienBlok }: Wlasciwosci) {
  const szerokosc = ustawieniaSzablonu.orientacja === 'pozioma' ? 297 : 210
  const wysokosc = ustawieniaSzablonu.orientacja === 'pozioma' ? 210 : 297
  const dane = pobierzDaneRenderowaniaKarty(karta)
  const bloki = ustawieniaSzablonu.blokiSwobodne.filter((blok) => czyPokazacBlok(blok.id, ustawieniaSzablonu)).map((blok) => blok.id === 'tytul' && blok.typ === 'tekst' ? { ...blok, dane: { ...blok.dane, rozmiarCzcionkiPt: obliczRozmiarTytuluKarty(karta.tytulSzkolenia, blok.dane.rozmiarCzcionkiPt, 12) } } : blok)
  const logo = karta.organizator.toLocaleUpperCase('pl').includes('IIST') ? '/logo-iist.png' : '/logo-semper.png'
  return <section className={`karta-na-drzwi__strona karta-na-drzwi__strona--${ustawieniaSzablonu.orientacja} karta-na-drzwi__strona--${ustawieniaSzablonu.format}`} {...(czyStronaDokumentu ? { 'data-strona-dokumentu': true } : {})}>
    <RendererSwobodnychBlokow bloki={bloki} numerStrony={1} kontekst={{ dane, zasobyObrazow: { logo_organizatora: logo, ...zasobyObrazow } }} trybRenderowania="roboczy" szerokoscStronyMm={szerokosc} wysokoscStronyMm={wysokosc} />
    {edytowalny && onZaznaczBlok && onZmienBlok && <EdytowalnaWarstwaSwobodnychBlokow bloki={bloki} numerStrony={1} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznacz={onZaznaczBlok} onZmienBlok={onZmienBlok} szerokoscStronyMm={szerokosc} wysokoscStronyMm={wysokosc} />}
  </section>
}
