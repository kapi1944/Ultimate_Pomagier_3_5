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

export function zapiszKopieUkladuSwobodnychBlokow(dane: {
  nazwa: string
  organizator: 'SEMPER' | 'IIST' | 'klient'
  autor: string
  bloki: BlokSwobodnyDokumentu[]
  tytulSzkolenia?: string
}) {
  const teraz = new Date().toISOString()
  const dokumentPodgladu = utworzDokumentZTekstu(dane.nazwa, dane.tytulSzkolenia ?? dane.nazwa)
  const strona = utworzModelStronyA4(dane.organizator)
  const szablon: SzablonRoboczyReplikatora = {
    id: `uklad-blokow-${Date.now()}`,
    nazwa: dane.nazwa,
    typDokumentu: 'Ankieta',
    pewnoscTypuDokumentu: 1,
    organizator: dane.organizator,
    status: 'Roboczy',
    zrodloImportu: 'TEKST',
    dataImportu: teraz,
    uzytkownik: dane.autor,
    wersja: 1,
    procentZgodnosci: 100,
    poziomZgodnosci: 'bardzo_dobra_zgodnosc',
    raportImportu: { id: `raport-${Date.now()}`, zrodloImportu: 'TEKST', dataImportu: teraz, odtworzono: ['Układ swobodnych bloków'], nieOdtworzono: [], wymagaPoprawy: [], ograniczenia: [], procentZgodnosci: 100, poziomZgodnosci: 'bardzo_dobra_zgodnosc', opisHeurystyki: 'Kopia układu zapisana z generatora dokumentu.', problemyJakosci: [] },
    dokumentBlokowy: {
      id: `dokument-blokowy-${Date.now()}`,
      typ: 'inny',
      dane: { tytulSzkolenia: dane.tytulSzkolenia, organizator: dane.organizator },
      struktura: [{ id: 'uklad-swobodnych-blokow', typ: 'Sekcja', tresc: dane.nazwa, dzieci: [], metadane: { zrodlo: 'uzytkownik' }, stylLokalny: {}, statusDiagnostyczny: 'poprawny' }],
      strona,
      wyglad: { marginesy: strona.marginesy, styleBlokow: {} },
      problemy: [],
      raportyEksportu: [],
      blokiSwobodne: dane.bloki,
      metadane: { wersjaModelu: 1, zrodlo: 'uzytkownik', zatwierdzonyPrzezUzytkownika: true },
    },
    dokumentPodgladu,
    placeholdery: [],
    elementyNiepewne: [],
    elementyNieobslugiwane: [],
    historiaDecyzji: [],
    czyPokazacZnakWodnyWersjiTestowej: false,
  }
  return zapiszSzablon(szablon, dokumentPodgladu, dane.autor, dane.nazwa)
}
import { zapiszNowySzablonZReplikatora as zapiszSzablon } from '../../kartoteki/szablony_dokumentow/magazynSzablonowDokumentow'
import type { SzablonRoboczyReplikatora } from '../../moduly/dokumenty/replikator_dokumentow/typyReplikatora'
import { utworzModelStronyA4 } from './modelBlokowy'
import type { BlokSwobodnyDokumentu } from './modelSwobodnychBlokow'
import { utworzDokumentZTekstu } from './utworzDokumentZTekstu'
