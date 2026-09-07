from pathlib import Path
p=Path('src/moduly/dokumenty/generatory/ankiety/RendererAnkiety.tsx');s=p.read_text(encoding='utf8');a=s.index('    const blokiStrony =');b=s.index('\n    const sekcjeOcen',a)
s=s[:a]+'''    const blokiStrony = dane.blokiSwobodne.map((blok): BlokSwobodnyDokumentu => {
      if (strona.numer <= 2 || blok.przypisanieDoStrony.rodzaj !== 'strona' || blok.przypisanieDoStrony.numer !== 2 || !blok.id.startsWith('szablon-')) return blok
      const przypisanieDoStrony = { rodzaj: 'strona' as const, numer: strona.numer }
      if (blok.typ === 'tekst' && blok.id.startsWith('szablon-numer')) return { ...blok, przypisanieDoStrony, dane: { ...blok.dane, zrodlo: { rodzaj: 'pole_danych', sciezka: 'numerStrony' } } }
      return { ...blok, przypisanieDoStrony }
    })'''+s[b:];p.write_text(s,encoding='utf8')
p=Path('src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts');s=p.read_text(encoding='utf8').replace('export function pobierzWierszeListyObecnosci(dane: DaneListyObecnosci) {','export function pobierzWierszeListyObecnosci(dane: DaneListyObecnosci): UczestnikListyObecnosci[] {');p.write_text(s,encoding='utf8')
