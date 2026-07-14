import {
  pobierzKopieRoboczeGeneratora,
  usunKopieRobocza,
  zapiszKopieRobocza,
  type KopiaRobocza,
} from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'

const kluczProgramuRoboczego = 'ultimate-pomagier-program-szkolenia-roboczy'
const kluczAktywnejKopiiProgramu = 'ultimatePomagier.programySzkolen.aktywnaKopiaRobocza'
const kluczMigracjiKopiiProgramu = 'ultimatePomagier.programySzkolen.kopieRobocze.wspolnyMagazyn.v1'

function pobierzStarszyZapisProgramu() {
  try {
    const zapis = localStorage.getItem(kluczProgramuRoboczego)

    return zapis ? (JSON.parse(zapis) as unknown) : null
  } catch {
    return null
  }
}

function czyStarszyZapisZawieraDane(dane: unknown) {
  return Boolean(dane && typeof dane === 'object' && Object.keys(dane).length)
}

export function pobierzIdAktywnejKopiiProgramu() {
  try {
    return localStorage.getItem(kluczAktywnejKopiiProgramu)
  } catch {
    return null
  }
}

export function ustawAktywnaKopieProgramu(id: string) {
  localStorage.setItem(kluczAktywnejKopiiProgramu, id)
  localStorage.setItem(kluczMigracjiKopiiProgramu, 'true')
}

export function wyczyscAktywnaKopieProgramu() {
  localStorage.removeItem(kluczAktywnejKopiiProgramu)
  localStorage.removeItem(kluczProgramuRoboczego)
}

export function pobierzKopieRoboczeProgramu() {
  const wspolneKopie = pobierzKopieRoboczeGeneratora('programy_szkolen')

  try {
    if (wspolneKopie.length || localStorage.getItem(kluczMigracjiKopiiProgramu) === 'true') {
      return wspolneKopie
    }

    const starszyZapis = pobierzStarszyZapisProgramu()

    if (!czyStarszyZapisZawieraDane(starszyZapis)) {
      return wspolneKopie
    }

    const dane = starszyZapis as { tytulSzkolenia?: string; czyWynikParsowaniaZatwierdzony?: boolean }
    const kopia = zapiszKopieRobocza({
      typGeneratora: 'programy_szkolen',
      tytul: dane.tytulSzkolenia ?? '',
      status: dane.czyWynikParsowaniaZatwierdzony ? 'zatwierdzona' : 'robocza',
      daneDokumentu: starszyZapis,
      wersjaFormatu: 'programy-szkolen-v1',
    })
    ustawAktywnaKopieProgramu(kopia.id)

    return [kopia]
  } catch {
    return wspolneKopie
  }
}

export function otworzKopieRoboczaProgramu(kopia: KopiaRobocza) {
  ustawAktywnaKopieProgramu(kopia.id)
  localStorage.setItem(kluczProgramuRoboczego, JSON.stringify(kopia.daneDokumentu))
}

export function usunKopieRoboczaProgramu(kopia: KopiaRobocza) {
  usunKopieRobocza('programy_szkolen', kopia.id)

  if (pobierzIdAktywnejKopiiProgramu() === kopia.id) {
    wyczyscAktywnaKopieProgramu()
  }
}
