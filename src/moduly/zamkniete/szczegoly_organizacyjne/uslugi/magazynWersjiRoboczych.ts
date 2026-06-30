import type {
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  KopiaRoboczaSzkolenia,
  StatusyPolImportu,
  WersjaRoboczaGeneratora,
} from '../typy'

const kluczAktualnejWersji = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'
const kluczKopiiRoboczych = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze'
export const wersjaEksportuSzczegolow = 'ultimate-pomagier-3.5-szczegoly-organizacyjne'

function bezpiecznieParsuj<Typ>(wartosc: string | null, fallback: Typ): Typ {
  if (!wartosc) {
    return fallback
  }

  try {
    return JSON.parse(wartosc) as Typ
  } catch {
    return fallback
  }
}

export function pobierzAktualnaWersjeRobocza() {
  return bezpiecznieParsuj<WersjaRoboczaGeneratora | null>(localStorage.getItem(kluczAktualnejWersji), null)
}

export function pobierzKopieRobocze() {
  return bezpiecznieParsuj<KopiaRoboczaSzkolenia[]>(localStorage.getItem(kluczKopiiRoboczych), [])
}

export function utworzNazweKopiiRoboczej(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const data = new Date().toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const tytul = dane.tytulSzkolenia.trim() || 'Bez tytułu'
  const klient = dane.nazwaKlienta.trim() || 'Bez klienta'
  const trener = grupy[0]?.trenerzy[0]?.imieNazwisko || 'Bez trenera'

  return `[Kopia robocza] ${data} – "${tytul}", ${trener} (${klient})`
}

export function zbudujWersjeRobocza(
  dane: DaneFormularza,
  grupy: GrupaSzkoleniowa[],
  adresaci: DaneAdresatow,
  statusyPol: StatusyPolImportu,
): WersjaRoboczaGeneratora {
  return {
    id: `wersja-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
    nazwa: utworzNazweKopiiRoboczej(dane, grupy),
    dataZapisu: new Date().toISOString(),
    dane,
    grupy,
    adresaci,
    statusyPol,
  }
}

export function zapiszWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  localStorage.setItem(kluczAktualnejWersji, JSON.stringify(wersja))

  const kopie = pobierzKopieRobocze()
  const noweKopie = [wersja, ...kopie].slice(0, 20)
  localStorage.setItem(kluczKopiiRoboczych, JSON.stringify(noweKopie))
}

export function wyczyscAktualnaWersjeRobocza() {
  localStorage.removeItem(kluczAktualnejWersji)
}
