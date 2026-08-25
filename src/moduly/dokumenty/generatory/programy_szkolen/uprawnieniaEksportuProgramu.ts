import { czyJestArchitektem, type Uzytkownik } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'

export function czyUzytkownikMozeWymusicEksportProgramu(uzytkownik: Pick<Uzytkownik, 'rola'> | null | undefined) {
  return czyJestArchitektem(uzytkownik)
}
