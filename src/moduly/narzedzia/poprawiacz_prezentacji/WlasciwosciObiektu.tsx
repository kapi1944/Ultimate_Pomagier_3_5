import type { ObiektSlajdu, SlajdPptx } from './pptx/modelPptx'
import { potomkowieXml } from './pptx/xmlPptx'
import { czyEdytowalny, type ZmianaObiektu } from './operacje/edycjaPrezentacji'
import { tozsamoscObiektu } from './operacje/porownaniePrezentacji'

export default function WlasciwosciObiektu({ slajd, wybrane, zmien, czyZajety }: {
  slajd: SlajdPptx; wybrane: ObiektSlajdu[]; zmien: (zmiany: ZmianaObiektu[], nazwa: string) => void; czyZajety: boolean
}) {
  const pierwszy = wybrane[0]
  const bezpieczne = wybrane.filter(czyEdytowalny)
  const geometria = pierwszy?.geometria
  return <aside className="prezentacja-wlasciwosci" aria-label="Właściwości obiektów">
    <h3>WŁAŚCIWOŚCI</h3>
    <p>Zaznaczono: {wybrane.length}. Ctrl/Shift + kliknięcie dodaje do zaznaczenia.</p>
    {pierwszy && <p>{pierwszy.nazwa} · {pierwszy.typ}</p>}
    {pierwszy && !czyEdytowalny(pierwszy) && <p>Tylko do odczytu: obiekty złożone, wzorce, grupy oraz obroty edytuj w PowerPoint.</p>}
    {pierwszy && !czyEdytowalny(pierwszy) && <div aria-label="Inspekcja obiektu">
      <p>{pierwszy.tekst || 'Obiekt nietekstowy'}</p>
      {geometria && <p>Pozycja: {(geometria.x / 360000).toFixed(2)}, {(geometria.y / 360000).toFixed(2)} cm. Rozmiar: {(geometria.cx / 360000).toFixed(2)} × {(geometria.cy / 360000).toFixed(2)} cm.</p>}
      {pierwszy.tabela && <p>Tabela: {pierwszy.tabela.wiersze} wierszy, {pierwszy.tabela.kolumny} kolumn.</p>}
    </div>}
    {pierwszy && geometria && czyEdytowalny(pierwszy) && <form key={`${slajd.czesc}:${pierwszy.klucz}`} onSubmit={(zdarzenie) => {
      zdarzenie.preventDefault()
      const pola = new FormData(zdarzenie.currentTarget)
      const id = tozsamoscObiektu(slajd, pierwszy)!
      const zmiany: ZmianaObiektu[] = []
      const nowa = { x: Number(pola.get('x')) * 360000, y: Number(pola.get('y')) * 360000, cx: Number(pola.get('cx')) * 360000, cy: Number(pola.get('cy')) * 360000 }
      if (Object.entries(nowa).some(([pole, wartosc]) => Math.abs(wartosc - geometria[pole as keyof typeof geometria]) > 2)) zmiany.push({ id, geometria: nowa })
      potomkowieXml(pierwszy.element, 't').forEach((fragment, indeks) => {
        const tekst = String(pola.get(`tekst${indeks}`) ?? '')
        if (tekst !== fragment.textContent) zmiany.push({ id, fragment: { indeks, tekst } })
      })
      const czcionka = String(pola.get('czcionka') ?? '').trim()
      const rozmiar = String(pola.get('rozmiar') ?? '')
      const kolor = String(pola.get('kolor') ?? '').trim()
      const wyrownanie = String(pola.get('wyrownanie') ?? '')
      const odstep = String(pola.get('odstep') ?? '')
      for (const obiekt of bezpieczne) {
        if (czcionka || rozmiar || kolor || wyrownanie || odstep) zmiany.push({ id: tozsamoscObiektu(slajd, obiekt)!,
          czcionka: czcionka || undefined, rozmiar: rozmiar ? Number(rozmiar) : undefined, kolor: kolor || undefined,
          wyrownanie: ['l', 'ctr', 'r', 'just'].includes(wyrownanie) ? wyrownanie as ZmianaObiektu['wyrownanie'] : undefined,
          odstep: odstep ? Number(odstep) : undefined })
      }
      if (zmiany.length) zmien(zmiany, 'Edycja właściwości')
    }}>
      <fieldset disabled={czyZajety}>
        <legend>Geometria pierwszego obiektu (cm)</legend>
        {(['x', 'y', 'cx', 'cy'] as const).map((pole) => <label key={pole}>{({ x: 'X', y: 'Y', cx: 'Szerokość', cy: 'Wysokość' })[pole]}<input name={pole} type="number" step="any" required defaultValue={geometria[pole] / 360000} /></label>)}
      </fieldset>
      {potomkowieXml(pierwszy.element, 't').map((fragment, indeks) => <label key={indeks}>Fragment tekstu {indeks + 1}<textarea aria-label={`Fragment tekstu ${indeks + 1}`} name={`tekst${indeks}`} defaultValue={fragment.textContent ?? ''} /></label>)}
      <fieldset disabled={czyZajety}>
        <legend>Formatowanie zaznaczonych pól (puste = zachowaj)</legend>
        <label>Czcionka<input name="czcionka" placeholder="Oryginalne czcionki" /></label>
        <label>Rozmiar (pkt)<input name="rozmiar" type="number" min="1" max="400" step="0.1" /></label>
        <label>Kolor tekstu HEX<input name="kolor" placeholder="#000000" pattern="#[0-9a-fA-F]{6}" /></label>
        <label>Wyrównanie tekstu<select name="wyrownanie"><option value="">Zachowaj</option><option value="l">Do lewej</option><option value="ctr">Do środka</option><option value="r">Do prawej</option><option value="just">Wyjustuj</option></select></label>
        <label>Odstęp po akapicie (pkt)<input name="odstep" type="number" min="0" max="400" /></label>
      </fieldset>
      <button type="submit" disabled={czyZajety}>Zastosuj właściwości</button>
    </form>}
    <div className="poprawiacz-prezentacji__akcje">
      {(['przod', 'tyl'] as const).map((warstwa) => <button key={warstwa} type="button" disabled={!bezpieczne.length || czyZajety} onClick={() => zmien(bezpieczne.map((obiekt) => ({ id: tozsamoscObiektu(slajd, obiekt)!, warstwa })), 'Kolejność warstw')}>{warstwa === 'przod' ? 'Na wierzch' : 'Na spód'}</button>)}
      <button type="button" disabled={bezpieczne.length < 2 || czyZajety} onClick={() => zmien(bezpieczne.map((obiekt) => ({ id: tozsamoscObiektu(slajd, obiekt)!, geometria: { ...obiekt.geometria!, x: bezpieczne[0].geometria!.x } })), 'Wyrównanie obiektów')}>Wyrównaj do lewej</button>
      <button type="button" disabled={bezpieczne.length < 3 || czyZajety} onClick={() => {
        const uporzadkowane = [...bezpieczne].sort((a, b) => a.geometria!.x - b.geometria!.x)
        const poczatek = uporzadkowane[0].geometria!.x
        const koniec = uporzadkowane.at(-1)!.geometria!.x
        zmien(uporzadkowane.map((obiekt, indeks) => ({ id: tozsamoscObiektu(slajd, obiekt)!, geometria: { ...obiekt.geometria!, x: poczatek + (koniec - poczatek) * indeks / (uporzadkowane.length - 1) } })), 'Rozłożenie obiektów')
      }}>Rozłóż poziomo</button>
    </div>
    <h4>Obiekty slajdu</h4>
    <p>Wzorzec: {slajd.elementyWzorca.length} elementów tylko do odczytu.</p>
    <ul>{slajd.elementyWzorca.map((obiekt, indeks) => <li key={indeks}>{obiekt.nazwa || obiekt.typ}: {obiekt.tekst || 'Obiekt nietekstowy'}{obiekt.geometria && ` (${(obiekt.geometria.cx / 360000).toFixed(2)} × ${(obiekt.geometria.cy / 360000).toFixed(2)} cm)`}</li>)}</ul>
  </aside>
}
