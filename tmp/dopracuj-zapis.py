from pathlib import Path
for katalog,plik,typ,tworz in [('ankiety','WidokAnkiet.tsx','Ankieta','utworzBlokiSzablonuAnkiety()'),('listy_obecnosci','WidokListObecnosci.tsx','Lista obecności','utworzBlokiSzablonuListyObecnosci()')]:
 p=Path('src/moduly/dokumenty/generatory')/katalog/plik;s=p.read_text(encoding='utf8')
 s="import { utworzBlokiWzorcaProjektowego } from '../../wspolne/blokiWzorcaProjektowego'\n"+s
 s=s.replace('<PanelBocznyGeneratora><Wybor', f'''<PanelBocznyGeneratora><label>Oryginalny układ<select value="" onChange={{(zdarzenie) => ustawDane((obecne) => ({{ ...obecne, blokiSwobodne: [...{tworz}, ...(zdarzenie.target.value === 'projekt' ? utworzBlokiWzorcaProjektowego('{typ}') : [])] }}))}}><option value="">Wybierz wariant bazowy…</option><option value="standard">Oryginalny — standard</option><option value="projekt">Oryginalny — oznaczenia projektu ze wzorca</option></select></label><Wybor''')
 p.write_text(s,encoding='utf8')
p=Path('src/moduly/dokumenty/generatory/listy_obecnosci/rejestrListObecnosci.ts');s=p.read_text(encoding='utf8')
s="import type { DaneListyObecnosci } from './modelListyObecnosci'\n"+s
s=s.replace('DaneDokumentuZIntegracji<DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci>', 'DaneDokumentuZIntegracji<DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci> & { listaObecnosci?: DaneListyObecnosci }',1)
s=s.replace('  korektyReczne: KorektyReczneListyObecnosci,\n): DokumentListy', '  korektyReczne: KorektyReczneListyObecnosci,\n  listaObecnosci?: DaneListyObecnosci,\n): DokumentListy')
s=s.replace('      korektyReczne,\n', '      korektyReczne,\n      ...(listaObecnosci ? { listaObecnosci } : {}),\n')
p.write_text(s,encoding='utf8')
p=Path('src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx');s=p.read_text(encoding='utf8')
s=s.replace('utworzDaneListyObecnosciZIntegracji, utworzDomyslne', 'deserializujDaneListyObecnosci, pobierzBladEksportuListy, utworzDaneListyObecnosciZIntegracji, utworzDomyslne')
s=s.replace('dane.uczestnicy.map((uczestnik, indeks)', 'dane.uczestnicy.map((uczestnik)')
s=s.replace(' ?? zrodlowiUczestnicy[indeks]', '')
s=s.replace('id: poprzedni?.id ?? null', 'id: uczestnik.id')
s=s.replace('? utworzDaneListyObecnosciZIntegracji(dokument.daneDokumentu.daneZrodlowe, dokument.daneDokumentu.korektyReczne)', '? dokument.daneDokumentu.listaObecnosci ? deserializujDaneListyObecnosci(JSON.stringify(dokument.daneDokumentu.listaObecnosci)) : utworzDaneListyObecnosciZIntegracji(dokument.daneDokumentu.daneZrodlowe, dokument.daneDokumentu.korektyReczne)')
s=s.replace('tytulDokumentu, korektyDoZapisu)', 'tytulDokumentu, korektyDoZapisu, dane)')
s=s.replace('<AkcjeEksportuPdf daneNazwyEksportu=', '<AkcjeEksportuPdf czyMoznaEksportowac={() => !pobierzBladEksportuListy(dane)} pobierzBladEksportu={() => pobierzBladEksportuListy(dane)} daneNazwyEksportu=')
s=s.replace('<small>Źródło: Szczegóły {dokument.metadaneGeneratora.szczegolyOrganizacyjneId}, odcisk {dokument.metadaneGeneratora.odciskDanych}</small>', '')
p.write_text(s,encoding='utf8')
