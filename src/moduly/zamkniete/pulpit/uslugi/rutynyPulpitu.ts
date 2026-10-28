import { czyJestPracownikiemWewnetrznym, type Uzytkownik } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyJestAdministratorem } from '../../../../kartoteki/uzytkownicy/uprawnienia'
import { pobierzUzytkownikow } from '../../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { dataWarszawska, poczatekTygodnia, wersjaNaDzien, wystapieniaDnia, wystapieniaTygodnia, wlascicielWystapienia, type Rutyna, type StanRutyn, type WystapienieRutyny } from '../logika/rutyny'
import { pobierzStanPulpitu, zapiszStanPulpitu } from './magazynPulpitu'

export function pobierzRutyny(): StanRutyn {
  const surowy = localStorage.getItem('ultimatePomagier.pulpit.v1')
  if (surowy !== null) {
    try { const dane: unknown = JSON.parse(surowy); if (!dane || typeof dane !== 'object' || Array.isArray(dane)) throw new Error() } catch { throw new Error('Dane pulpitu są uszkodzone. Zapis rutyn został zablokowany.') }
  }
  const stan = pobierzStanPulpitu().rutyny
  if (stan === undefined) return { rutyny: [], wykonania: [], historia: [] }
  if (!stan || !Array.isArray(stan.rutyny) || !Array.isArray(stan.wykonania) || !Array.isArray(stan.historia)) throw new Error('Nie można odczytać danych rutyn. Zapis został zablokowany.')
  if (stan.rutyny.some((rutyna) => !rutyna || typeof rutyna.id !== 'string' || typeof rutyna.tytul !== 'string' || typeof rutyna.wlascicielId !== 'string' || !Array.isArray(rutyna.wersje) || !rutyna.wersje.length || rutyna.wersje.some((wersja) => !wersja || !czyPoprawnaData(wersja.od) || typeof wersja.aktywna !== 'boolean' || !wersja.harmonogram || !['CODZIENNIE', 'DNI_TYGODNIA', 'CEL_TYGODNIOWY'].includes(wersja.harmonogram.rodzaj))) || stan.wykonania.some((wpis) => !wpis || typeof wpis.rutynaId !== 'string' || !czyPoprawnaData(wpis.okres) || !Number.isInteger(wpis.numer) || typeof wpis.wykonane !== 'boolean') || stan.historia.some((wpis) => !wpis || typeof wpis.czas !== 'string' || typeof wpis.rutynaId !== 'string' || typeof wpis.uzytkownikId !== 'string' || typeof wpis.opis !== 'string')) throw new Error('Dane rutyn są uszkodzone. Zapis został zablokowany.')
  if (stan.rutyny.some((rutyna) => rutyna.wersje.some((wersja) => (wersja.harmonogram.rodzaj === 'DNI_TYGODNIA' && (!Array.isArray(wersja.harmonogram.dni) || wersja.harmonogram.dni.some((dzien) => !Number.isInteger(dzien) || dzien < 0 || dzien > 6))) || (wersja.harmonogram.rodzaj === 'CEL_TYGODNIOWY' && (!Number.isInteger(wersja.harmonogram.liczba) || wersja.harmonogram.liczba < 1 || wersja.harmonogram.liczba > 50))))) throw new Error('Harmonogram rutyny jest uszkodzony. Zapis został zablokowany.')
  return stan
}

function czyPoprawnaData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const czas = Date.parse(data + 'T00:00:00Z')
  return Number.isFinite(czas) && new Date(czas).toISOString().slice(0, 10) === data
}

function zapisz(stan: StanRutyn) {
  if (!zapiszStanPulpitu({ ...pobierzStanPulpitu(), rutyny: stan })) throw new Error('Nie udało się zapisać rutyn. Sprawdź dostępne miejsce.')
}

export function zapiszRutyne(rutyna: Rutyna, uzytkownik: Uzytkownik | null, data: string = dataWarszawska(new Date())) {
  if (!czyJestPracownikiemWewnetrznym(uzytkownik) || !uzytkownik) throw new Error('Brak uprawnień do zarządzania rutynami.')
  const stan = pobierzRutyny()
  const poprzednia = stan.rutyny.find((wpis) => wpis.id === rutyna.id)
  if ((!czyJestAdministratorem(uzytkownik) && ((poprzednia && poprzednia.wlascicielId !== uzytkownik.id) || rutyna.wlascicielId !== uzytkownik.id))) throw new Error('Możesz zarządzać tylko swoimi rutynami.')
  if (rutyna.wlascicielId !== uzytkownik.id && !pobierzUzytkownikow().some((osoba) => osoba.id === rutyna.wlascicielId && czyJestPracownikiemWewnetrznym(osoba))) throw new Error('Wybierz aktywnego pracownika.')
  const wersja = rutyna.wersje.at(-1)
  if (!rutyna.id || !rutyna.tytul.trim() || !rutyna.wlascicielId || !wersja || !czyPoprawnaData(wersja.od) || wersja.od < data) throw new Error('Podaj nazwę, użytkownika i poprawną datę nie wcześniejszą niż dzisiaj.')
  if (rutyna.link) { try { const adres = new URL(rutyna.link); if (!['http:', 'https:'].includes(adres.protocol)) throw new Error() } catch { throw new Error('Link musi być adresem HTTP lub HTTPS.') } }
  const harmonogram = wersja.harmonogram
  if (harmonogram.rodzaj === 'DNI_TYGODNIA' && (!harmonogram.dni.length || harmonogram.dni.some((dzien) => !Number.isInteger(dzien) || dzien < 0 || dzien > 6))) throw new Error('Wybierz co najmniej jeden dzień tygodnia.')
  if (harmonogram.rodzaj === 'CEL_TYGODNIOWY' && (!Number.isInteger(harmonogram.liczba) || harmonogram.liczba < 1 || harmonogram.liczba > 50)) throw new Error('Cel tygodniowy musi wynosić od 1 do 50.')
  if (poprzednia) {
    const aktualna = wersjaNaDzien(poprzednia, wersja.od)
    const czyZmiana = JSON.stringify(aktualna?.harmonogram) !== JSON.stringify(harmonogram) || aktualna?.aktywna !== wersja.aktywna || (aktualna?.wlascicielId ?? poprzednia.wlascicielId) !== rutyna.wlascicielId
    if (czyZmiana && wersja.od <= data) throw new Error('Zmiana harmonogramu lub przypisania może obowiązywać najwcześniej od jutra.')
    if (czyZmiana && (aktualna?.harmonogram.rodzaj === 'CEL_TYGODNIOWY' || harmonogram.rodzaj === 'CEL_TYGODNIOWY') && wersja.od !== poczatekTygodnia(wersja.od)) throw new Error('Zmiana celu tygodniowego obowiązuje od poniedziałku, aby nie zmieniać rozpoczętego tygodnia.')
    if (!czyZmiana) {
      zapisz({ ...stan, rutyny: stan.rutyny.map((wpis) => wpis.id === rutyna.id ? { ...rutyna, tytul: rutyna.tytul.trim(), wersje: poprzednia.wersje } : wpis), historia: [...stan.historia, { czas: new Date().toISOString(), uzytkownikId: uzytkownik.id, rutynaId: rutyna.id, opis: 'Zmieniono dane rutyny' }] })
      return
    }
  }
  const noweWersje = poprzednia ? [...poprzednia.wersje.filter((wpis) => wpis.od !== wersja.od), { ...wersja, wlascicielId: rutyna.wlascicielId }].sort((pierwsza, druga) => pierwsza.od.localeCompare(druga.od)) : [{ ...wersja, wlascicielId: rutyna.wlascicielId }]
  const nowa = { ...rutyna, tytul: rutyna.tytul.trim(), wersje: noweWersje }
  zapisz({ ...stan, rutyny: [...stan.rutyny.filter((wpis) => wpis.id !== rutyna.id), nowa], historia: [...stan.historia, { czas: new Date().toISOString(), uzytkownikId: uzytkownik.id, rutynaId: rutyna.id, opis: poprzednia ? 'Zmieniono rutynę od ' + wersja.od : 'Utworzono rutynę od ' + wersja.od }] })
}

export function zmienWykonanieRutyny(wystapienie: WystapienieRutyny, wykonane: boolean, uzytkownik: Uzytkownik | null, dzisiaj = dataWarszawska(new Date())) {
  if (!uzytkownik || !czyJestPracownikiemWewnetrznym(uzytkownik)) throw new Error('Brak uprawnień do wykonania rutyny.')
  const stan = pobierzRutyny()
  const rutyna = stan.rutyny.find((wpis) => wpis.id === wystapienie.rutynaId)
  if (!rutyna || (wlascicielWystapienia(rutyna, wystapienie) !== uzytkownik.id && !czyJestAdministratorem(uzytkownik))) throw new Error('Brak uprawnień do tego wystąpienia.')
  const dostepne = wystapienie.numer ? wystapieniaTygodnia([rutyna], stan.wykonania, wystapienie.okres) : wystapieniaDnia([rutyna], stan.wykonania, wystapienie.okres)
  const wersjaDzisiaj = wersjaNaDzien(rutyna, dzisiaj)
  if (wystapienie.okres > dzisiaj || (wystapienie.numer > 0 && wystapienie.okres === poczatekTygodnia(dzisiaj) && (!wersjaDzisiaj?.aktywna || wersjaDzisiaj.harmonogram.rodzaj !== 'CEL_TYGODNIOWY')) || !dostepne.some((wpis) => wpis.okres === wystapienie.okres && wpis.numer === wystapienie.numer)) throw new Error('Wystąpienie nie jest dostępne.')
  const poprzednie = stan.wykonania.find((wpis) => wpis.rutynaId === rutyna.id && wpis.okres === wystapienie.okres && wpis.numer === wystapienie.numer)
  if (Boolean(poprzednie?.wykonane) === wykonane) return
  const czas = new Date().toISOString()
  zapisz({ ...stan, wykonania: [...stan.wykonania.filter((wpis) => !(wpis.rutynaId === rutyna.id && wpis.okres === wystapienie.okres && wpis.numer === wystapienie.numer)), { rutynaId: rutyna.id, okres: wystapienie.okres, numer: wystapienie.numer, wykonane, zmieniono: czas, zmienilId: uzytkownik.id }], historia: [...stan.historia, { czas, uzytkownikId: uzytkownik.id, rutynaId: rutyna.id, opis: (wykonane ? 'Wykonano' : 'Cofnięto wykonanie') + ' — ' + wystapienie.okres + (wystapienie.numer ? ', część ' + wystapienie.numer : '') }] })
}
