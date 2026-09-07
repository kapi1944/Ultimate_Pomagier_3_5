from pathlib import Path
p=Path('src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts');s=p.read_text(encoding='utf8')
s=s.replace("| 'ORYGINALNA_SKROCONA' | 'NOWOCZESNA_SEMPER'", "| 'ORYGINALNA_SKROCONA' | 'ORYGINALNA_IIST_SKROCONA' | 'NOWOCZESNA_SEMPER'")
s=s.replace("ORYGINALNA_SKROCONA: 'Oryginalna — skrócona', NOWOCZESNA_SEMPER", "ORYGINALNA_SKROCONA: 'Oryginalna SEMPER — skrócona', ORYGINALNA_IIST_SKROCONA: 'Oryginalna IIST — skrócona (wzorzec)', NOWOCZESNA_SEMPER")
s=s.replace("  if (preset === 'ORYGINALNA_SKROCONA')", "  if (preset === 'ORYGINALNA_IIST_SKROCONA') return { organizator: 'IIST' as const, wariant: 'ORYGINALNA_SKROCONA' as const, pelna: false }\n  if (preset === 'ORYGINALNA_SKROCONA')")
p.write_text(s,encoding='utf8')
for katalog,plik in [('ankiety','WidokAnkiet.tsx'),('listy_obecnosci','WidokListObecnosci.tsx')]:
 p=Path('src/moduly/dokumenty/generatory')/katalog/plik;s=p.read_text(encoding='utf8')
 s=s.replace("const szczegoly = useMemo(() => pobierzSzczegolyDoGeneratorow(), [])", "const [szczegoly, ustawSzczegoly] = useState(pobierzSzczegolyDoGeneratorow)")
 s=s.replace('<PrzyciskPaneluGeneratora>Edytuj układ', '<button type="button" onClick={() => { ustawSzczegoly(pobierzSzczegolyDoGeneratorow()); ustawKomunikat(\'Odświeżono dane źródłowe. Lokalne dane dokumentu pozostały bez zmian.\') }}>Odśwież źródło szkolenia</button><PrzyciskPaneluGeneratora>Edytuj układ')
 if katalog=='ankiety':
  s=s.replace('useMemo, ', '')
  s=s.replace("split(/\\r?\\n/).filter(Boolean)", "split(/\\r?\\n/).slice(0, 12)")
  s=s.replace('...obecne, blokiSwobodne: [...utworzBlokiSzablonuAnkiety()', "...obecne, wariantSzablonu: 'ORYGINALNA_PELNA', blokiSwobodne: [...utworzBlokiSzablonuAnkiety()")
 p.write_text(s,encoding='utf8')
