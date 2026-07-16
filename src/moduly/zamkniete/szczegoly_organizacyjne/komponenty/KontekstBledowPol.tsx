import type { ReactNode } from 'react'
import { kontekstBledowPol, type BledyPolFormularza } from './stanBledowPol'

export function DostawcaBledowPol({ bledyPol, children }: { bledyPol: BledyPolFormularza; children: ReactNode }) {
  return <kontekstBledowPol.Provider value={bledyPol}>{children}</kontekstBledowPol.Provider>
}
