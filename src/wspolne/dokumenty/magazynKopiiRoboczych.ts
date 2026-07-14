export type TypGeneratoraKopiiRoboczej = 'programy_szkolen' | 'szczegoly_organizacyjne'

export type KopiaRobocza<TypDanych = unknown> = {
  id: string
  typGeneratora: TypGeneratoraKopiiRoboczej
  tytul: string
  status: string
  utworzono: string
  zaktualizowano: string
  daneDokumentu: TypDanych
  wersjaFormatu?: string
}

type DaneKopiiRoboczej<TypDanych> = {
  id?: string
  typGeneratora: TypGeneratoraKopiiRoboczej
  tytul: string
  status: string
  daneDokumentu: TypDanych
  wersjaFormatu?: string
}

const kluczWspolnychKopiiRoboczych = 'ultimatePomagier.kopieRobocze'

function bezpiecznieParsuj(wartosc: string | null): unknown[] {
  if (!wartosc) {
    return []
  }

  try {
    const dane = JSON.parse(wartosc)

    return Array.isArray(dane) ? dane : []
  } catch {
    return []
  }
}

function czyRekord(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function normalizujKopieRobocza(wartosc: unknown): KopiaRobocza | null {
  if (!czyRekord(wartosc) || typeof wartosc.id !== 'string') {
    return null
  }

  const typGeneratora = wartosc.typGeneratora

  if (typGeneratora !== 'programy_szkolen' && typGeneratora !== 'szczegoly_organizacyjne') {
    return null
  }

  const dataZapisu = typeof wartosc.dataZapisu === 'string' ? wartosc.dataZapisu : new Date().toISOString()
  const utworzono = typeof wartosc.utworzono === 'string' ? wartosc.utworzono : dataZapisu
  const zaktualizowano = typeof wartosc.zaktualizowano === 'string' ? wartosc.zaktualizowano : dataZapisu

  return {
    id: wartosc.id,
    typGeneratora,
    tytul: typeof wartosc.tytul === 'string' ? wartosc.tytul : typeof wartosc.nazwa === 'string' ? wartosc.nazwa : 'Bez tytułu',
    status: typeof wartosc.status === 'string' ? wartosc.status : 'robocza',
    utworzono,
    zaktualizowano,
    daneDokumentu: 'daneDokumentu' in wartosc ? wartosc.daneDokumentu : wartosc.dane,
    wersjaFormatu: typeof wartosc.wersjaFormatu === 'string' ? wartosc.wersjaFormatu : typeof wartosc.wersja === 'string' ? wartosc.wersja : undefined,
  }
}

function zapiszWszystkieKopieRobocze(kopie: KopiaRobocza[]) {
  localStorage.setItem(kluczWspolnychKopiiRoboczych, JSON.stringify(kopie))
}

function utworzId(typGeneratora: TypGeneratoraKopiiRoboczej) {
  return `${typGeneratora}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function pobierzWszystkieKopieRobocze() {
  return bezpiecznieParsuj(localStorage.getItem(kluczWspolnychKopiiRoboczych))
    .map(normalizujKopieRobocza)
    .filter((kopia): kopia is KopiaRobocza => Boolean(kopia))
}

export function pobierzKopieRoboczeGeneratora<TypDanych>(typGeneratora: TypGeneratoraKopiiRoboczej) {
  return pobierzWszystkieKopieRobocze()
    .filter((kopia) => kopia.typGeneratora === typGeneratora)
    .sort((pierwsza, druga) => new Date(druga.zaktualizowano).getTime() - new Date(pierwsza.zaktualizowano).getTime()) as KopiaRobocza<TypDanych>[]
}

export function zapiszKopieRobocza<TypDanych>(dane: DaneKopiiRoboczej<TypDanych>) {
  const kopie = pobierzWszystkieKopieRobocze()
  const poprzedniaKopia = dane.id ? kopie.find((kopia) => kopia.id === dane.id && kopia.typGeneratora === dane.typGeneratora) : undefined
  const teraz = new Date().toISOString()
  const kopia: KopiaRobocza<TypDanych> = {
    id: poprzedniaKopia?.id ?? dane.id ?? utworzId(dane.typGeneratora),
    typGeneratora: dane.typGeneratora,
    tytul: dane.tytul.trim() || 'Bez tytułu',
    status: dane.status,
    utworzono: poprzedniaKopia?.utworzono ?? teraz,
    zaktualizowano: teraz,
    daneDokumentu: dane.daneDokumentu,
    wersjaFormatu: dane.wersjaFormatu,
  }

  zapiszWszystkieKopieRobocze([kopia, ...kopie.filter((istniejaca) => istniejaca.id !== kopia.id)])

  return kopia
}

export function usunKopieRobocza(typGeneratora: TypGeneratoraKopiiRoboczej, id: string) {
  zapiszWszystkieKopieRobocze(
    pobierzWszystkieKopieRobocze().filter((kopia) => kopia.id !== id || kopia.typGeneratora !== typGeneratora),
  )
}
