import { krajeTelefonow, pobierzBladTelefonu } from '../../../wspolne/telefon/telefon'
import { walidujEmail } from '../../../wspolne/walidacja/walidatoryDanych'

export function pobierzBladKontaktu(typ: 'email' | 'telefon', wartosc: string) {
  if (!wartosc.trim()) return ''
  if (typ === 'email') return walidujEmail(wartosc) ? '' : 'Nieprawidłowy adres e-mail. Sprawdź wpisaną wartość.'
  const blad = 'Nieprawidłowy numer telefonu. Sprawdź wpisaną wartość.'
  if (!/^\+?[\d\s()-]+$/.test(wartosc.trim())) return blad
  const cyfry = wartosc.replace(/[\s()-]/g, '')
  const kraj = cyfry.startsWith('+')
    ? [...krajeTelefonow].sort((pierwszy, drugi) => drugi.prefiks.length - pierwszy.prefiks.length).find((pozycja) => cyfry.startsWith(pozycja.prefiks))
    : krajeTelefonow[0]
  const prefiks = kraj?.prefiks ?? cyfry.match(/^\+\d{1,3}/)?.[0] ?? '+'
  const numer = cyfry.startsWith('+') ? cyfry.slice(prefiks.length) : cyfry
  return pobierzBladTelefonu({ prefiks, numer, krajIso2: kraj?.iso2 }, true) ? blad : ''
}
