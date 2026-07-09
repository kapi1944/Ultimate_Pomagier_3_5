export {
  kluczMagazynuSzablonowDokumentow as kluczSzablonowDokumentow,
  pobierzSzablonyDokumentowZKartoteki as pobierzSzablonyDokumentow,
  zapiszSzablonyDokumentowWKartotece as zapiszSzablonyDokumentow,
  pobierzSzablonDokumentuPoId,
  wykryjKonfliktNazwySzablonu,
  utworzNazweSzablonuZDopiskiem,
  utworzSzablonKartotekiZReplikatora,
  zapiszNowySzablonZReplikatora,
  zapiszNowaWersjeSzablonu,
  aktywujSzablonDokumentu,
  archiwizujSzablonDokumentu,
  przywrocWersjeJakoRobocza,
} from '../../kartoteki/szablony_dokumentow/magazynSzablonowDokumentow'
export type {
  DecyzjaSzablonuDokumentu,
  FiltrySzablonowDokumentow,
  OrganizatorSzablonuDokumentu,
  StatusSzablonuDokumentu,
  SzablonDokumentuKartoteki as SzablonDokumentu,
  TypSzablonuDokumentu,
  WersjaSzablonuDokumentu,
  ZrodloSzablonuDokumentu,
} from '../../kartoteki/szablony_dokumentow/typySzablonowDokumentow'
