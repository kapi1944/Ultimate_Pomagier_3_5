const domyslnyKolor = '#e53935'
const kluczKoloru = (uzytkownik: string) => `ultimatePomagier.prezentacje.kolor.v1.${uzytkownik}`

export function normalizujKolorRoznic(wartosc: string): string | null {
  const tekst = wartosc.trim()
  if (/^#[0-9a-f]{6}$/i.test(tekst)) return tekst.toLowerCase()
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(tekst)
  if (!rgb || rgb.slice(1).some((kanal) => Number(kanal) > 255)) return null
  return '#' + rgb.slice(1).map((kanal) => Number(kanal).toString(16).padStart(2, '0')).join('')
}

export function pobierzKolorRoznic(uzytkownik: string) {
  try {
    const kolor = localStorage.getItem(kluczKoloru(uzytkownik))
    return kolor && /^#[0-9a-f]{6}$/i.test(kolor) ? kolor : domyslnyKolor
  } catch { return domyslnyKolor }
}

export function zapiszKolorRoznic(uzytkownik: string, kolor: string) {
  if (!/^#[0-9a-f]{6}$/i.test(kolor)) return false
  try { localStorage.setItem(kluczKoloru(uzytkownik), kolor); return true }
  catch { return false }
}
