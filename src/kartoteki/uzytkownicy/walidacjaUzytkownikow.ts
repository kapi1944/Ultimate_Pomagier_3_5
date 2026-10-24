import { walidujEmail, walidujTelefonMiedzynarodowy } from '../../wspolne/walidacja/walidatoryDanych'
import { odznakiUzytkownikow, organizacjeUzytkownikow, roleUzytkownikow, statusyUzytkownikow, type Uzytkownik } from './typyUzytkownikow'
import { tytulyNaukowe } from './daneUzytkownikow'

export function normalizujKlucz(wartosc: string) { return wartosc.trim().toLocaleLowerCase('pl') }

export function sprawdzStruktureUzytkownika(wartosc: unknown): wartosc is Uzytkownik {
  if (!wartosc || typeof wartosc !== 'object') return false
  const dane = wartosc as Record<string, unknown>
  const teksty = ['id', 'zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'login', 'email', 'kolorProfilu', 'utworzono', 'zaktualizowano']
  if (!teksty.every((pole) => typeof dane[pole] === 'string')) return false
  if (!['emaile', 'odznaki', 'aliasyHistoryczne'].every((pole) => Array.isArray(dane[pole]) && dane[pole].every((element: unknown) => typeof element === 'string'))) return false
  if (!Array.isArray(dane.telefony) || !dane.telefony.every((telefon: unknown) => telefon && typeof telefon === 'object' && typeof (telefon as Record<string, unknown>).numer === 'string' && typeof (telefon as Record<string, unknown>).prefiks === 'string' && ['krajIso2', 'numerE164'].every((pole) => (telefon as Record<string, unknown>)[pole] === undefined || typeof (telefon as Record<string, unknown>)[pole] === 'string'))) return false
  return roleUzytkownikow.some((rola) => rola === dane.rola) && organizacjeUzytkownikow.some((organizacja) => organizacja === dane.organizacja) && statusyUzytkownikow.some((status) => status === dane.status) && (dane.odznaki as string[]).every((odznaka) => odznakiUzytkownikow.some((dozwolona) => dozwolona === odznaka)) && typeof dane.wymagaZmianyHasla === 'boolean' && Number.isInteger(dane.wersjaUprawnien) && Number(dane.wersjaUprawnien) > 0 && (dane.ostatnieLogowanie === null || typeof dane.ostatnieLogowanie === 'string') && ['przypisanyKlientId', 'przypisanyTrenerId'].every((pole) => dane[pole] === undefined || typeof dane[pole] === 'string') && (dane.statusUwierzytelniania === undefined || ['NIESKONFIGUROWANE', 'OCZEKUJE_NA_AKTYWACJE', 'SKONFIGUROWANE'].some((status) => status === dane.statusUwierzytelniania))
}

export function walidujKonto(dane: unknown): string[] {
  if (!sprawdzStruktureUzytkownika(dane)) return ['Nieprawidłowa struktura lub niedozwolona wartość pola konta.']
  const bledy: string[] = []
  if (!dane.id.trim() || !dane.imie.trim() || !dane.nazwisko.trim() || !dane.login.trim()) bledy.push('ID, imię, nazwisko i login są wymagane.')
  if (!['', 'Pan', 'Pani'].includes(dane.zwrot) || !tytulyNaukowe.includes(dane.tytulNaukowy)) bledy.push('Nieprawidłowy zwrot lub tytuł naukowy.')
  if (!dane.emaile.length || dane.emaile.some((email) => !walidujEmail(email)) || dane.email !== dane.emaile[0]) bledy.push('Podaj prawidłowy główny i dodatkowe adresy e-mail.')
  if (dane.telefony.some((telefon) => !walidujTelefonMiedzynarodowy(telefon))) bledy.push('Nieprawidłowy numer telefonu.')
  if (!/^#[0-9a-f]{6}$/i.test(dane.kolorProfilu)) bledy.push('Kolor profilu musi mieć postać #RRGGBB.')
  if (![dane.utworzono, dane.zaktualizowano, ...(dane.ostatnieLogowanie ? [dane.ostatnieLogowanie] : [])].every((data) => Number.isFinite(Date.parse(data)))) bledy.push('Nieprawidłowa data konta.')
  if (dane.rola === 'ARCHITEKT' && dane.id !== 'administrator-kacper-madej') bledy.push('Rola Architekt jest chroniona.')
  if (dane.id === 'administrator-kacper-madej' && (dane.rola !== 'ARCHITEKT' || dane.status !== 'AKTYWNY' || !['SEMPER', 'IIST'].includes(dane.organizacja))) bledy.push('Chronione konto Architekta musi pozostać aktywne i wewnętrzne.')
  return bledy
}

export function walidujUnikalnosc(konta: Uzytkownik[]) {
  const zajete = new Map<string, string>()
  const bledy: string[] = []
  for (const konto of konta) {
    const klucze = [`id:${normalizujKlucz(konto.id)}`, ...[konto.login, ...konto.emaile].filter(Boolean).map((wartosc) => `tozsamosc:${normalizujKlucz(wartosc)}`)]
    for (const klucz of new Set(klucze)) {
      if (zajete.has(klucz) && zajete.get(klucz) !== konto.id) bledy.push(`Powtórzony identyfikator, login, e-mail lub alias: ${klucz.split(':').slice(1).join(':')}.`)
      zajete.set(klucz, konto.id)
    }
  }
  if (new Set(konta.map((konto) => konto.id)).size !== konta.length) bledy.push('Powtórzone ID konta.')
  return bledy
}
