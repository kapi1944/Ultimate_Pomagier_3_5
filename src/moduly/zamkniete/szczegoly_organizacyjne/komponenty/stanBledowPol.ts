import { createContext, useContext } from 'react'

export type BledyPolFormularza = Readonly<Record<string, string>>

export const kontekstBledowPol = createContext<BledyPolFormularza>({})

export function useBladPola(pole: string, disabled = false) {
  const bledyPol = useContext(kontekstBledowPol)
  return disabled ? undefined : bledyPol[pole]
}
