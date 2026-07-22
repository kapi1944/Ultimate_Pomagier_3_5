import type { StanPulpitu, ZadaniePulpitu } from '../modele/pulpit'

const kluczStanuPulpitu = 'ultimatePomagier.pulpit.v1'
const pustyStan: StanPulpitu = { zadaniaReczne: [], wyslanePaczki: {} }

export function pobierzStanPulpitu(): StanPulpitu {
  try {
    const zapis = localStorage.getItem(kluczStanuPulpitu)
    if (!zapis) return pustyStan
    const stan = JSON.parse(zapis) as Partial<StanPulpitu>
    return { zadaniaReczne: Array.isArray(stan.zadaniaReczne) ? stan.zadaniaReczne : [], wyslanePaczki: stan.wyslanePaczki ?? {} }
  } catch {
    return pustyStan
  }
}

export function zapiszStanPulpitu(stan: StanPulpitu) {
  try { localStorage.setItem(kluczStanuPulpitu, JSON.stringify(stan)) } catch { return false }
  return true
}

export function zapiszZadanieReczne(zadanie: ZadaniePulpitu) {
  const stan = pobierzStanPulpitu()
  const istnieje = stan.zadaniaReczne.some((obecne) => obecne.id === zadanie.id)
  return zapiszStanPulpitu({ ...stan, zadaniaReczne: istnieje ? stan.zadaniaReczne.map((obecne) => obecne.id === zadanie.id ? zadanie : obecne) : [...stan.zadaniaReczne, zadanie] })
}

export function oznaczPaczkeJakoWyslana(idPaczki: string) {
  const stan = pobierzStanPulpitu()
  return zapiszStanPulpitu({ ...stan, wyslanePaczki: { ...stan.wyslanePaczki, [idPaczki]: new Date().toISOString() } })
}
