import type { FiltrySzablonowDokumentow, SzablonDokumentuKartoteki } from './typySzablonowDokumentow'

function normalizujTekst(tekst: string) {
  return tekst
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function czySzablonPasujeDoFiltrow(
  szablon: SzablonDokumentuKartoteki,
  filtry: FiltrySzablonowDokumentow,
) {
  const fraza = normalizujTekst(filtry.szukanaFraza.trim())
  const czyPasujeDoFrazy = !fraza || normalizujTekst(szablon.nazwa).includes(fraza)

  return (
    czyPasujeDoFrazy &&
    (filtry.typDokumentu === 'Wszystkie' || szablon.typDokumentu === filtry.typDokumentu) &&
    (filtry.organizator === 'Wszystkie' || szablon.organizator === filtry.organizator) &&
    (filtry.status === 'Wszystkie' || szablon.status === filtry.status) &&
    (filtry.poziomZgodnosci === 'Wszystkie' || szablon.poziomZgodnosci === filtry.poziomZgodnosci) &&
    (filtry.zrodlo === 'Wszystkie' || szablon.zrodlo === filtry.zrodlo)
  )
}

export function filtrujSzablonyDokumentow(
  szablony: SzablonDokumentuKartoteki[],
  filtry: FiltrySzablonowDokumentow,
) {
  return szablony
    .filter((szablon) => czySzablonPasujeDoFiltrow(szablon, filtry))
    .sort((pierwszy, drugi) => drugi.dataModyfikacji.localeCompare(pierwszy.dataModyfikacji))
}
