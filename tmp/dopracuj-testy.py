from pathlib import Path
p=Path('package.json');s=p.read_text(encoding='utf8').replace('testy/wspolnyStandardGeneratorow.test.ts"', 'testy/wspolnyStandardGeneratorow.test.ts && node --import ./testy/rejestrujLoaderTs.mjs testy/generatoryOperacyjne.test.ts"');p.write_text(s,encoding='utf8')
p=Path('testy/generowanieListObecnosciZeSzczegolow.test.ts');s=p.read_text(encoding='utf8');s="import { utworzDomyslneDaneListyObecnosci } from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts'\n"+s;s+='''

test('zapis i ponowne otwarcie zachowują konfigurację operacyjną Listy', () => {
  wyczyscRepozytorium()
  const wynik = utworzListeObecnosciZeSzczegolow(utworzKontekst(), 'grupa-a')
  const dane = { ...utworzDomyslneDaneListyObecnosci(), trybListy: 'PUSTA' as const, liczbaPustychWierszy: 15, wariantWielodniowy: 'OSOBNE_STRONY' as const, czyPokazacPodpisTrenera: true, czyPokazacPodpisOrganizatora: true }
  zapiszKorektyListyObecnosci(wynik.dokument!.id, 'Lista', {}, dane)
  assert.deepEqual(pobierzListeObecnosciPoId(wynik.dokument!.id)?.daneDokumentu.listaObecnosci, dane)
})
''';p.write_text(s,encoding='utf8')
