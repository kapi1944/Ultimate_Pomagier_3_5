import { pobierzLogoOrganizatora } from '../../../../wspolne/dokumenty/logoOrganizatora'
import { EdytowalnaWarstwaSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import { czyBlokWidocznyNaStronie, type BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import { obliczRozmiarTytuluKarty, pobierzDaneRenderowaniaKarty, pobierzUstawieniaKarty, pobierzWymiaryKartyNaDrzwi, type KartaNaDrzwi, type UstawieniaSzablonuKartyNaDrzwi } from './modelKartyNaDrzwi'

type Wlasciwosci = { karta: KartaNaDrzwi; ustawieniaSzablonu: UstawieniaSzablonuKartyNaDrzwi; zasobyObrazow: Record<string, string | undefined>; zaznaczonyBlokId?: string | null; trybEdycjiSzablonu?: boolean; edytowalny?: boolean; czyStronaDokumentu?: boolean; onZaznaczBlok?: (id: string | null) => void; onZmienBlok?: (blok: BlokSwobodnyDokumentu) => void }

function czyPokazacBlok(id: string, ustawienia: UstawieniaSzablonuKartyNaDrzwi) {
  if (id === 'termin') return ustawienia.widocznoscPol.termin || ustawienia.widocznoscPol.godziny
  if (id === 'sala-lokalizacja') return ustawienia.widocznoscPol.sala || ustawienia.widocznoscPol.miejsce
  const pole: Record<string, keyof typeof ustawienia.widocznoscPol> = { grupa: 'grupa', trener: 'trener', organizator: 'organizator', 'dodatkowy-tekst': 'dodatkowyTekst' }
  return !pole[id] || ustawienia.widocznoscPol[pole[id]]
}

export default function RendererKartyNaDrzwi({ karta, ustawieniaSzablonu: ustawieniaZestawu, zasobyObrazow, zaznaczonyBlokId = null, trybEdycjiSzablonu = false, edytowalny = false, czyStronaDokumentu = true, onZaznaczBlok, onZmienBlok }: Wlasciwosci) {
  const ustawieniaSzablonu = pobierzUstawieniaKarty(karta, ustawieniaZestawu)
  const stronaRef = useRef<HTMLElement>(null)
  const ostrzezenieRef = useRef<HTMLParagraphElement>(null)
  const { szerokoscMm: szerokosc, wysokoscMm: wysokosc } = pobierzWymiaryKartyNaDrzwi(ustawieniaSzablonu.format, ustawieniaSzablonu.orientacja)
  const dane = pobierzDaneRenderowaniaKarty(karta, ustawieniaSzablonu.widocznoscPol)
  const bloki = useMemo(() => (karta.ukladKarty?.blokiSwobodne ?? ustawieniaZestawu.blokiSwobodne).filter((blok) => czyBlokWidocznyNaStronie(blok, 1) && czyPokazacBlok(blok.id, ustawieniaZestawu)), [karta.ukladKarty, ustawieniaZestawu])
  const styleBlokow: Record<string, CSSProperties> = Object.fromEntries(bloki.filter((blok) => blok.typ === 'tekst').map((blok) => [blok.id, blok.typ === 'tekst' ? {
    fontSize: `${blok.dane.rozmiarCzcionkiPt * 100 * 25.4 / 72 / szerokosc}cqw`,
    padding: `${(blok.dane.marginesWewnetrznyMm ?? 0) * 100 / szerokosc}cqw`,
    ...(blok.id === 'tytul' ? { whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal', overflow: 'visible' } : {}),
  } : {}]))

  useLayoutEffect(() => {
    const strona = stronaRef.current
    if (!strona) return
    let anulowano = false
    function dopasuj() {
      if (!strona || anulowano) return
      const tytul = bloki.find((blok) => blok.id === 'tytul' && blok.typ === 'tekst')
      const element = strona.querySelector<HTMLElement>('[data-blok-swobodny="tytul"]')
      if (!element || !tytul || tytul.typ !== 'tekst') {
        if (ostrzezenieRef.current) ostrzezenieRef.current.hidden = true
        return
      }
      // Pomiar w pełnym formacie fizycznym uniezależnia wynik od powiększenia podglądu.
      const kopia = strona.cloneNode(true) as HTMLElement
      Object.assign(kopia.style, { position: 'fixed', left: '-100000px', top: '0', width: `${szerokosc}mm`, height: `${wysokosc}mm`, maxWidth: 'none', visibility: 'hidden' })
      kopia.removeAttribute('data-strona-dokumentu')
      document.body.append(kopia)
      try {
        const pomiar = kopia.querySelector<HTMLElement>('[data-blok-swobodny="tytul"]')!
        const granicaDolna = Math.min(wysokosc - 3, tytul.yMm + tytul.wysokoscMm, ...bloki.filter((blok) => blok.id !== tytul.id && blok.widoczny && blok.xMm < tytul.xMm + tytul.szerokoscMm && blok.xMm + blok.szerokoscMm > tytul.xMm && blok.yMm >= tytul.yMm).map((blok) => blok.yMm - 2))
        const dostepnaWysokoscPx = Math.max(0, granicaDolna - tytul.yMm) * 96 / 25.4
        const kolizja = bloki.some((blok) => blok.id !== tytul.id && blok.widoczny && blok.xMm < tytul.xMm + tytul.szerokoscMm && blok.xMm + blok.szerokoscMm > tytul.xMm && blok.yMm < tytul.yMm && blok.yMm + blok.wysokoscMm > tytul.yMm)
        const wynik = obliczRozmiarTytuluKarty(tytul.dane.rozmiarCzcionkiPt, (rozmiarPt) => {
          pomiar.style.fontSize = `${rozmiarPt}pt`
          pomiar.style.height = 'auto'
          const zakres = document.createRange()
          zakres.selectNodeContents(pomiar)
          const ramka = pomiar.getBoundingClientRect()
          const tresc = zakres.getBoundingClientRect()
          return !kolizja && tytul.yMm >= 0 && tytul.xMm >= 0 && tytul.xMm + tytul.szerokoscMm <= szerokosc && ramka.height <= dostepnaWysokoscPx + 0.1 && tresc.right <= ramka.right + 0.1 && tresc.left >= ramka.left - 0.1
        }, ustawieniaSzablonu.automatyczneDopasowanieTytulu !== false)
        element.style.fontSize = `${wynik.rozmiarPt * 100 * 25.4 / 72 / szerokosc}cqw`
        element.dataset.rozmiarPt = String(wynik.rozmiarPt)
        element.dataset.przepelnienie = String(wynik.przepelnienie)
        if (ostrzezenieRef.current) ostrzezenieRef.current.hidden = !wynik.przepelnienie
      } finally { kopia.remove() }
    }
    dopasuj()
    if (document.fonts.status === 'loading') void document.fonts.ready.then(dopasuj)
    return () => { anulowano = true }
  }, [bloki, szerokosc, wysokosc, karta, ustawieniaSzablonu.automatyczneDopasowanieTytulu])
  const logo = pobierzLogoOrganizatora(karta.organizator.toLocaleUpperCase('pl').includes('IIST') ? 'IIST' : 'SEMPER')
  return <><p ref={ostrzezenieRef} hidden role="status" className="karta-na-drzwi__ostrzezenie" data-pomin-w-eksporcie>Pełny tytuł przekracza dostępne miejsce. Zwiększ blok, zmień szerokość lub rozmiar czcionki i popraw położenie sąsiednich elementów.</p><section ref={stronaRef} className={`karta-na-drzwi__strona karta-na-drzwi__strona--${ustawieniaSzablonu.orientacja} karta-na-drzwi__strona--${ustawieniaSzablonu.format}`} style={{ '--proporcje-karty': `${szerokosc} / ${wysokosc}`, '--szerokosc-karty-mm': `${szerokosc}mm`, '--wysokosc-karty-mm': `${wysokosc}mm` } as CSSProperties} {...(czyStronaDokumentu ? { 'data-strona-dokumentu': true } : {})}>
    <RendererSwobodnychBlokow styleBlokow={styleBlokow} bloki={bloki} numerStrony={1} kontekst={{ dane, zasobyObrazow: { logo_organizatora: logo, ...zasobyObrazow } }} trybRenderowania="roboczy" szerokoscStronyMm={szerokosc} wysokoscStronyMm={wysokosc} />
    {edytowalny && onZaznaczBlok && onZmienBlok && <EdytowalnaWarstwaSwobodnychBlokow bloki={ustawieniaSzablonu.blokiSwobodne.filter((blok) => czyPokazacBlok(blok.id, ustawieniaSzablonu))} numerStrony={1} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznacz={onZaznaczBlok} onZmienBlok={onZmienBlok} szerokoscStronyMm={szerokosc} wysokoscStronyMm={wysokosc} />}
  </section></>
}
