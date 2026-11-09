import { useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react'

export default function PodgladWydrukuPaczki({ children, tytul, szerokoscMm, wysokoscMm }: PropsWithChildren<{
  tytul: string; szerokoscMm: number; wysokoscMm?: number
}>) {
  const obszar = useRef<HTMLDivElement>(null)
  const tresc = useRef<HTMLDivElement>(null)
  const [tryb, ustawTryb] = useState<'szerokosc' | 'strona' | 'reczny'>(wysokoscMm ? 'strona' : 'szerokosc')
  const [powiekszenie, ustawPowiekszenie] = useState(1)
  const [dopasowanie, ustawDopasowanie] = useState({ szerokosc: 1, strona: 1 })
  useLayoutEffect(() => {
    const kontener = obszar.current
    const dokument = tresc.current
    if (!kontener || !dokument) return
    const zmierz = () => {
      const szerokosc = Math.max(1, szerokoscMm) * 96 / 25.4
      const wysokosc = Math.max(1, wysokoscMm ? wysokoscMm * 96 / 25.4 : dokument.offsetHeight)
      const szerokoscDostepna = Math.max(1, kontener.clientWidth - 16)
      const wysokoscDostepna = Math.max(1, kontener.clientHeight - 16)
      const doSzerokosci = szerokoscDostepna / szerokosc
      const doStrony = Math.min(doSzerokosci, wysokoscDostepna / wysokosc)
      ustawDopasowanie((obecne) => Math.abs(obecne.szerokosc - doSzerokosci) < .001 && Math.abs(obecne.strona - doStrony) < .001 ? obecne : { szerokosc: doSzerokosci, strona: doStrony })
    }
    const obserwator = new ResizeObserver(zmierz)
    obserwator.observe(kontener)
    obserwator.observe(dokument)
    zmierz()
    return () => obserwator.disconnect()
  }, [szerokoscMm, wysokoscMm])
  const skala = tryb === 'reczny' ? powiekszenie : dopasowanie[tryb]
  const zmienSkale = (zmiana: number) => { ustawPowiekszenie(Math.min(2, Math.max(.25, skala + zmiana))); ustawTryb('reczny') }
  return <section className="paczki-podglad" aria-label={tytul}>
    <div className="paczki-podglad__pasek"><h2>{tytul}</h2><div role="group" aria-label={`Skala: ${tytul}`}>
      <button type="button" aria-pressed={tryb === 'szerokosc'} onClick={() => ustawTryb('szerokosc')}>Do szerokości</button>
      <button type="button" aria-pressed={tryb === 'strona'} onClick={() => ustawTryb('strona')}>Cała strona</button>
      <button type="button" aria-label={`Pomniejsz: ${tytul}`} disabled={skala <= .25} onClick={() => zmienSkale(-.1)}>−</button>
      <output aria-label="Powiększenie">{Math.round(skala * 100)}%</output>
      <button type="button" aria-label={`Powiększ: ${tytul}`} disabled={skala >= 2} onClick={() => zmienSkale(.1)}>+</button>
    </div></div>
    <div className="paczki-podglad__przewijanie" ref={obszar} tabIndex={0} aria-label={`Przewijanie: ${tytul}`}>
      <div ref={tresc} className="paczki-podglad__strona" style={{ width: `${szerokoscMm}mm`, zoom: skala }}>{children}</div>
    </div>
  </section>
}
