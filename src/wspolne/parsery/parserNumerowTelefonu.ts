const wzorzecNumeruTelefonu = /(?:\+48[\s-]?)?(?:\d[\s-]?){9}/g

function formatujNumerPolski(wartosc: string) {
  const cyfry = wartosc.replace(/\D/g, '')
  const numer = cyfry.startsWith('48') && cyfry.length === 11 ? cyfry.slice(2) : cyfry

  if (!/^\d{9}$/.test(numer)) {
    return ''
  }

  return `+48 ${numer.slice(0, 3)} ${numer.slice(3, 6)} ${numer.slice(6)}`
}

export function parsujNumeryTelefonu(tekst: string) {
  const dopasowania = tekst.match(wzorzecNumeruTelefonu) ?? []
  const numery = dopasowania.map(formatujNumerPolski).filter(Boolean)

  return [...new Set(numery)]
}
