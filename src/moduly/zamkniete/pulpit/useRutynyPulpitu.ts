import { useEffect, useState } from 'react'
import { pobierzRutyny } from './uslugi/rutynyPulpitu'
import type { StanRutyn } from './logika/rutyny'

function odczytajRutyny(): { stan: StanRutyn; blad: string } {
  try { return { stan: pobierzRutyny(), blad: '' } }
  catch (wyjatek) { return { stan: { rutyny: [], wykonania: [], historia: [] }, blad: wyjatek instanceof Error ? wyjatek.message : 'Nie udało się odczytać rutyn.' } }
}

export function useRutynyPulpitu() {
  const [odczyt, ustawOdczyt] = useState(odczytajRutyny)
  function odswiez() { ustawOdczyt(odczytajRutyny()) }
  useEffect(() => {
    const zegar = window.setInterval(odswiez, 60_000)
    window.addEventListener('focus', odswiez)
    window.addEventListener('storage', odswiez)
    return () => { window.clearInterval(zegar); window.removeEventListener('focus', odswiez); window.removeEventListener('storage', odswiez) }
  }, [])
  return { ...odczyt, odswiez }
}
