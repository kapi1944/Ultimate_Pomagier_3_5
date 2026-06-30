const wzorzecMaila = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function parsujMaile(tekst: string) {
  const dopasowania = tekst.match(wzorzecMaila) ?? []

  return [...new Set(dopasowania.map((email) => email.toLowerCase()))]
}
