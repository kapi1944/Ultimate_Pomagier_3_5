from pathlib import Path
p=Path('src/moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci.tsx');s=p.read_text(encoding='utf8').replace('<TabelaListy dane={dane}', '<TabelaListy dane={{ ...dane, daty: strona.datyPodpisow }}')
p.write_text(s,encoding='utf8')
p=Path('src/moduly/dokumenty/generatory/ankiety/RendererAnkiety.tsx');s=p.read_text(encoding='utf8')
s=s.replace('const sekcjeOcen = strona.sekcje.filter', "const blokiStrony = strona.numer > 2 ? dane.blokiSwobodne.map((blok) => blok.przypisanieDoStrony.rodzaj === 'strona' && blok.przypisanieDoStrony.numer === 2 && blok.id.startsWith('szablon-') ? { ...blok, przypisanieDoStrony: { rodzaj: 'strona' as const, numer: strona.numer }, ...(blok.typ === 'tekst' && blok.id.startsWith('szablon-numer') ? { dane: { ...blok.dane, zrodlo: { rodzaj: 'pole_danych' as const, sciezka: 'numerStrony' } } } : {}) } : blok) : dane.blokiSwodne\n    const sekcjeOcen = strona.sekcje.filter".replace('blokiSwodne','blokiSwobodne'))
s=s.replace('<RendererSwobodnychBlokow bloki={dane.blokiSwobodne}', '<RendererSwobodnychBlokow bloki={blokiStrony}')
p.write_text(s,encoding='utf8')
p=Path('testy/modelListyObecnosci.test.ts');s=p.read_text(encoding='utf8').replace('assert.equal(domyslne.uczestnicy.length, 3)', 'assert.equal(domyslne.uczestnicy.length, 0)');p.write_text(s,encoding='utf8')
