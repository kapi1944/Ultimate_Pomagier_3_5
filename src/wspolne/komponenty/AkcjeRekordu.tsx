import './akcjeRekordu.css'

type TypAkcjiRekordu = 'podglad' | 'edycja' | 'duplikuj' | 'usun'

type WlasciwosciAkcjiRekordu = {
  podglad: () => void
  edytuj: () => void
  duplikuj: () => void
  usun: () => void
}

const sciezkiIkon: Record<TypAkcjiRekordu, string[]> = {
  podglad: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  edycja: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z'],
  duplikuj: ['M8 8h12v12H8z', 'M4 16V4h12'],
  usun: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14', 'M10 11v5', 'M14 11v5'],
}

function IkonaAkcjiRekordu({ typ }: { typ: TypAkcjiRekordu }) {
  return <svg aria-hidden="true" className="akcje-rekordu__ikona" fill="none" viewBox="0 0 24 24">{sciezkiIkon[typ].map((sciezka) => <path d={sciezka} key={sciezka} />)}</svg>
}

export function AkcjeRekordu({ podglad, edytuj, duplikuj, usun }: WlasciwosciAkcjiRekordu) {
  return <div className="akcje-rekordu">
    <button className="akcje-rekordu__przycisk" type="button" onClick={podglad}><IkonaAkcjiRekordu typ="podglad" />Podglad</button>
    <button className="akcje-rekordu__przycisk" type="button" onClick={edytuj}><IkonaAkcjiRekordu typ="edycja" />Edytuj</button>
    <button className="akcje-rekordu__przycisk" type="button" onClick={duplikuj}><IkonaAkcjiRekordu typ="duplikuj" />Duplikuj</button>
    <button className="akcje-rekordu__przycisk akcje-rekordu__przycisk--usun" type="button" onClick={usun}><IkonaAkcjiRekordu typ="usun" />Usun</button>
  </div>
}
