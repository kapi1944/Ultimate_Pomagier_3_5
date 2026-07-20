import { useContext } from 'react'
import { KontekstUzytkownika } from './stanKontekstuUzytkownika'

export function useKontekstUzytkownika() {
  const kontekst = useContext(KontekstUzytkownika)
  if (!kontekst) throw new Error('useKontekstUzytkownika wymaga DostawcyUzytkownika.')
  return kontekst
}
