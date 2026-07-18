export type TelefonDoNormalizacji = {
  prefiks: string
  numer: string
  krajIso2?: string
  numerE164?: string
}

export type DefinicjaKrajuTelefonu = {
  iso2: string
  nazwa: string
  flaga: string
  prefiks: string
  minimalnaLiczbaCyfr: number
  maksymalnaLiczbaCyfr: number
  grupy: number[]
}

export const krajeTelefonow: DefinicjaKrajuTelefonu[] = [
  { iso2: 'PL', nazwa: 'Polska', flaga: '🇵🇱', prefiks: '+48', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'DE', nazwa: 'Niemcy', flaga: '🇩🇪', prefiks: '+49', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 11, grupy: [3, 3, 4] },
  { iso2: 'CZ', nazwa: 'Czechy', flaga: '🇨🇿', prefiks: '+420', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'SK', nazwa: 'Słowacja', flaga: '🇸🇰', prefiks: '+421', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'UA', nazwa: 'Ukraina', flaga: '🇺🇦', prefiks: '+380', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'GB', nazwa: 'Wielka Brytania', flaga: '🇬🇧', prefiks: '+44', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 10, grupy: [4, 3, 3] },
  { iso2: 'IE', nazwa: 'Irlandia', flaga: '🇮🇪', prefiks: '+353', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'FR', nazwa: 'Francja', flaga: '🇫🇷', prefiks: '+33', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [1, 2, 2, 2, 2] },
  { iso2: 'ES', nazwa: 'Hiszpania', flaga: '🇪🇸', prefiks: '+34', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'IT', nazwa: 'Włochy', flaga: '🇮🇹', prefiks: '+39', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 10, grupy: [3, 3, 4] },
  { iso2: 'NL', nazwa: 'Holandia', flaga: '🇳🇱', prefiks: '+31', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'BE', nazwa: 'Belgia', flaga: '🇧🇪', prefiks: '+32', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'AT', nazwa: 'Austria', flaga: '🇦🇹', prefiks: '+43', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 13, grupy: [3, 3, 3, 3] },
  { iso2: 'CH', nazwa: 'Szwajcaria', flaga: '🇨🇭', prefiks: '+41', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'NO', nazwa: 'Norwegia', flaga: '🇳🇴', prefiks: '+47', minimalnaLiczbaCyfr: 8, maksymalnaLiczbaCyfr: 8, grupy: [3, 2, 3] },
  { iso2: 'SE', nazwa: 'Szwecja', flaga: '🇸🇪', prefiks: '+46', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'DK', nazwa: 'Dania', flaga: '🇩🇰', prefiks: '+45', minimalnaLiczbaCyfr: 8, maksymalnaLiczbaCyfr: 8, grupy: [2, 2, 2, 2] },
  { iso2: 'US', nazwa: 'Stany Zjednoczone', flaga: '🇺🇸', prefiks: '+1', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 10, grupy: [3, 3, 4] },
  { iso2: 'CA', nazwa: 'Kanada', flaga: '🇨🇦', prefiks: '+1', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 10, grupy: [3, 3, 4] },
  { iso2: 'AU', nazwa: 'Australia', flaga: '🇦🇺', prefiks: '+61', minimalnaLiczbaCyfr: 9, maksymalnaLiczbaCyfr: 9, grupy: [3, 3, 3] },
  { iso2: 'IN', nazwa: 'Indie', flaga: '🇮🇳', prefiks: '+91', minimalnaLiczbaCyfr: 10, maksymalnaLiczbaCyfr: 10, grupy: [5, 5] },
]

export const innyKrajTelefonu: DefinicjaKrajuTelefonu = {
  iso2: 'INNY',
  nazwa: 'Inny kraj',
  flaga: '🌐',
  prefiks: '+',
  minimalnaLiczbaCyfr: 4,
  maksymalnaLiczbaCyfr: 14,
  grupy: [3, 3, 3, 3],
}

export function pobierzCyfry(wartosc: string) {
  return wartosc.replace(/\D/g, '')
}

export function pobierzKrajTelefonu(telefon: TelefonDoNormalizacji) {
  const poIso = krajeTelefonow.find((kraj) => kraj.iso2 === telefon.krajIso2)
  if (poIso) return poIso
  return krajeTelefonow.find((kraj) => kraj.prefiks === telefon.prefiks) ?? innyKrajTelefonu
}

export function formatujNumerKrajowy(numer: string, grupy: number[]) {
  const cyfry = pobierzCyfry(numer)
  if (!cyfry) return ''

  const wynik: string[] = []
  let pozycja = 0
  for (const rozmiar of grupy) {
    if (pozycja >= cyfry.length) break
    wynik.push(cyfry.slice(pozycja, pozycja + rozmiar))
    pozycja += rozmiar
  }
  if (pozycja < cyfry.length) wynik.push(cyfry.slice(pozycja))
  return wynik.join(' ')
}

export function normalizujPrefiks(prefiks: string) {
  const cyfry = pobierzCyfry(prefiks).slice(0, 4)
  return cyfry ? `+${cyfry}` : '+'
}

export function normalizujTelefon<T extends TelefonDoNormalizacji>(telefon: T): T & { krajIso2: string; numerE164: string } {
  const kraj = pobierzKrajTelefonu(telefon)
  const prefiks = kraj.iso2 === 'INNY' ? normalizujPrefiks(telefon.prefiks) : kraj.prefiks
  const cyfry = pobierzCyfry(telefon.numer)
  const numer = formatujNumerKrajowy(cyfry, kraj.grupy)

  return {
    ...telefon,
    krajIso2: kraj.iso2,
    prefiks,
    numer,
    numerE164: prefiks !== '+' && cyfry ? `${prefiks}${cyfry}` : '',
  }
}

export function pobierzBladTelefonu(telefon: TelefonDoNormalizacji, wymagany = true) {
  const kraj = pobierzKrajTelefonu(telefon)
  const cyfry = pobierzCyfry(telefon.numer)
  const prefiks = normalizujPrefiks(telefon.prefiks)

  if (!cyfry) return wymagany ? 'Numer telefonu jest wymagany.' : ''
  if (!/^\+\d{1,4}$/.test(prefiks)) return 'Podaj prefiks w formacie +48.'
  if (cyfry.length < kraj.minimalnaLiczbaCyfr || cyfry.length > kraj.maksymalnaLiczbaCyfr) {
    return kraj.minimalnaLiczbaCyfr === kraj.maksymalnaLiczbaCyfr
      ? `${kraj.nazwa}: wymagane jest dokładnie ${kraj.minimalnaLiczbaCyfr} cyfr.`
      : `${kraj.nazwa}: wymagane jest od ${kraj.minimalnaLiczbaCyfr} do ${kraj.maksymalnaLiczbaCyfr} cyfr.`
  }
  if (pobierzCyfry(prefiks).length + cyfry.length > 15) return 'Numer w formacie międzynarodowym może mieć maksymalnie 15 cyfr.'
  return ''
}

export function czyTelefonMiedzynarodowyPoprawny(telefon: TelefonDoNormalizacji) {
  return pobierzBladTelefonu(telefon, true) === ''
}

export function formatujTelefonDoWyswietlenia(telefon: TelefonDoNormalizacji) {
  const znormalizowany = normalizujTelefon(telefon)
  return `${znormalizowany.prefiks} ${znormalizowany.numer}`.trim()
}
