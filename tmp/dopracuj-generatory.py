from pathlib import Path
p=Path('src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts')
s=p.read_text(encoding='utf-8').replace("if (sekcje.length) return sekcje", "return sekcje")
s=s.replace("return { wersjaSchematu: 3, tytulSzkolenia: tekst(rekord", "return { wersjaSchematu: 3, szczegolyId: tekst(rekord, 'szczegolyId'), grupaId: tekst(rekord, 'grupaId'), nazwaGrupy: tekst(rekord, 'nazwaGrupy'), tytulSzkolenia: tekst(rekord")
s=s.replace("blokiSwobodne: bloki.length ? bloki : utworzBlokiSzablonuAnkiety(wariantSzablonu)", "blokiSwobodne: Array.isArray(rekord.blokiSwobodne) ? bloki : utworzBlokiSzablonuAnkiety(wariantSzablonu)")
s=s.replace("return { ...dane, tytulSzkolenia: kontekst.szkolenie.tytul", "return { ...dane, szczegolyId: kontekst.zrodlo.szczegolyOrganizacyjneId, grupaId: grupa?.id, nazwaGrupy: grupa?.nazwa, tytulSzkolenia: kontekst.szkolenie.tytul")
s=s.replace("pozycja.nazwa || pozycja.adres)", "pozycja.nazwa || pozycja.adres || pozycja.trybOnline)")
s=s.replace("tytulSzkolenia: 'Skuteczna komunikacja w zespole'", "tytulSzkolenia: ''")
p.write_text(s,encoding='utf-8')
p=Path('src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts')
s=p.read_text(encoding='utf-8').replace('  wersjaSchematu: 2\n', '  wersjaSchematu: 2\n  szczegolyId?: string\n  grupaId?: string\n  trener?: string\n',1)
s=s.replace("tytulSzkolenia: 'Skuteczna komunikacja w zespole'", "tytulSzkolenia: ''")
s=s.replace("uczestnicy: [{ id: 'uczestnik-1', imieINazwisko: 'Anna Kowalska' }, { id: 'uczestnik-2', imieINazwisko: 'Piotr Nowak' }, { id: 'uczestnik-3', imieINazwisko: 'Maria Zielińska' }]", "uczestnicy: []")
s=s.replace("      wersjaSchematu: 2,", "      wersjaSchematu: 2,\n      szczegolyId: pobierzTekst(dane, 'szczegolyId'),\n      grupaId: pobierzTekst(dane, 'grupaId'),\n      trener: pobierzTekst(dane, 'trener'),")
s=s.replace("blokiSwobodne: bloki.length ? bloki : daneDomyslne.blokiSwobodne", "blokiSwobodne: Array.isArray(dane.blokiSwobodne) ? bloki : daneDomyslne.blokiSwobodne")
s=s.replace("return { wersjaSchematu: 2, tytulSzkolenia: dane.tytulSzkolenia", "return { wersjaSchematu: 2, trener: dane.trenerzy.map((trener) => trener.imieINazwisko).join(', '), szczegolyId: dane.daneZrodlowe.szczegolyOrganizacyjneId, tytulSzkolenia: dane.tytulSzkolenia")
s=s.replace("trybListy: uczestnicy.length ? 'WYPELNIONA' : 'PUSTA'", "trybListy: 'WYPELNIONA'")
s=s.replace("  return kolumny.length ? [...new Set(kolumny)] : [...domyslneKolumny]", "  return kolumny.length ? dozwolone.filter((kolumna) => kolumny.includes(kolumna)) : [...domyslneKolumny]")
s += '''
export function pobierzBladEksportuListy(dane: DaneListyObecnosci): string | null {
  if (!dane.kolumny.length) return 'Wybierz co najmniej jedną kolumnę.'
  if (dane.trybListy === 'PUSTA') return Number.isInteger(dane.liczbaPustychWierszy) && dane.liczbaPustychWierszy >= 1 && dane.liczbaPustychWierszy <= 200 ? null : 'Wybierz od 1 do 200 pustych wierszy.'
  if (!dane.uczestnicy.length) return 'Dodaj uczestników albo wybierz tryb „Pusta lista do ręcznego wypełnienia”.'
  if (dane.uczestnicy.some((uczestnik) => !uczestnik.imieINazwisko.trim())) return 'Uzupełnij imiona i nazwiska uczestników.'
  return null
}
'''
p.write_text(s,encoding='utf-8')
