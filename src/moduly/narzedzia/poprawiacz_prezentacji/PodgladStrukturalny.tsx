import type { ProblemPrezentacji } from './modele/modelPrezentacji'
import type { SlajdPptx } from './pptx/modelPptx'
import { emuNaProcent } from './pptx/geometriaPptx'

export default function PodgladStrukturalny({ slajd, problemy }: { slajd: SlajdPptx; problemy: ProblemPrezentacji[] }) {
  const kandydaci = new Set(problemy.filter((problem) => problem.numerSlajdu === slajd.numer).map((problem) => problem.kluczObiektu))
  return (
    <>
      <p className="narzedzia__opis">Podgląd strukturalny. Czcionki, efekty, obiekty wzorca i obrócone elementy nie są wiernie renderowane.</p>
      <div className="poprawiacz-prezentacji__slajd" style={{ aspectRatio: `${slajd.szerokosc} / ${slajd.wysokosc}` }} aria-label={`Struktura slajdu ${slajd.numer}`}>
        {slajd.obiekty.map((obiekt) => {
          const geometria = obiekt.geometria
          if (!geometria) return null
          return (
            <div key={obiekt.klucz}
              className={`poprawiacz-prezentacji__obiekt${kandydaci.has(obiekt.klucz) ? ' poprawiacz-prezentacji__obiekt--kandydat' : ''}`}
              title={`${obiekt.nazwa || obiekt.typ}${kandydaci.has(obiekt.klucz) ? ' – kandydat do usunięcia' : ''}: ${obiekt.tekst}`}
              style={{
                left: `${emuNaProcent(geometria.x, slajd.szerokosc)}%`, top: `${emuNaProcent(geometria.y, slajd.wysokosc)}%`,
                width: `${emuNaProcent(geometria.cx, slajd.szerokosc)}%`, height: `${emuNaProcent(geometria.cy, slajd.wysokosc)}%`,
                zIndex: obiekt.kolejnosc, background: obiekt.typ === 'grupa' ? 'transparent' : obiekt.wypelnienie ?? undefined,
                borderColor: obiekt.linia ?? undefined,
              }}>
              {obiekt.typ === 'obraz' ? 'Obraz' : obiekt.tabela ? `Tabela ${obiekt.tabela.wiersze} × ${obiekt.tabela.kolumny}` : obiekt.tekst.slice(0, 90)}
            </div>
          )
        })}
      </div>
      <p className="narzedzia__opis">Pomarańczowa ramka oznacza kandydata do usunięcia. Obiekty bez jawnej geometrii nie są nanoszone.</p>
    </>
  )
}
