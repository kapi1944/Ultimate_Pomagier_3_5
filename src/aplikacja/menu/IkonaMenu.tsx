export type TypIkonyMenu =
  | 'pulpit'
  | 'szkolenia'
  | 'dokumenty'
  | 'wszystkie'
  | 'nowy'
  | 'kopie'
  | 'programy'
  | 'ankiety'
  | 'dyplomy'
  | 'obecnosc'
  | 'drzwi'
  | 'szczegoly'
  | 'replikator'
  | 'kartoteki'
  | 'ustawienia'

const sciezki: Record<TypIkonyMenu, string[]> = {
  pulpit: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  szkolenia: ['M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5', 'M4 17h16', 'M8 7h8', 'M8 11h6'],
  dokumenty: ['M6 2h8l4 4v16H6z', 'M14 2v5h5', 'M9 12h6', 'M9 16h6'],
  wszystkie: ['M4 4h10l3 3v13H4z', 'M8 2h10l2 2v14', 'M8 11h6', 'M8 15h6'],
  nowy: ['M6 2h8l4 4v16H6z', 'M14 2v5h5', 'M12 11v6', 'M9 14h6'],
  kopie: ['M4 5h6l2 2h8v12H4z', 'M9 12h6', 'M9 15h4', 'M17 3l1 1'],
  programy: ['M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z', 'M20 4h-7a3 3 0 0 0-3 3v13h7a3 3 0 0 1 3 3z'],
  ankiety: ['M6 3h12v18H6z', 'M9 8h6', 'M9 12h6', 'M9 16l1.5 1.5L14 14'],
  dyplomy: ['M12 3l3 5 5 1-3.5 4 1 5-5.5-2-5.5 2 1-5L4 9l5-1z', 'M9 20h6'],
  obecnosc: ['M6 3h12v18H6z', 'M9 8h6', 'M9 12l2 2 4-4', 'M9 17h6'],
  drzwi: ['M6 3h10v18H6z', 'M12 12h.01', 'M16 3h2v18h-2'],
  szczegoly: ['M6 3h12v18H6z', 'M9 8h6', 'M9 12h6', 'M9 16h4', 'M17 17l3 3'],
  replikator: ['M5 4h10l4 4v12H5z', 'M15 4v5h4', 'M8 13h8', 'M12 10v6'],
  kartoteki: ['M4 5h16v14H4z', 'M4 9h16', 'M8 3v4', 'M16 3v4'],
  ustawienia: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M5 5l2 2', 'M17 17l2 2', 'M19 5l-2 2', 'M7 17l-2 2'],
}

export default function IkonaMenu({ typ }: { typ: TypIkonyMenu }) {
  return (
    <svg aria-hidden="true" className="menu-boczne__ikona" fill="none" viewBox="0 0 24 24">
      {sciezki[typ].map((d) => <path d={d} key={d} />)}
    </svg>
  )
}
