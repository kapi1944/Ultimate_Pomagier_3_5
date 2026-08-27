import type { ReactNode } from 'react'
import { czyPokazacElementyPomocniczeEdytora, type TrybRenderowaniaDokumentu } from './trybRenderowaniaDokumentu'

type WlasciwosciElementuPomocniczegoEdytora = {
  children: ReactNode
  trybRenderowania: TrybRenderowaniaDokumentu
}

export default function ElementPomocniczyEdytora({ children, trybRenderowania }: WlasciwosciElementuPomocniczegoEdytora) {
  if (!czyPokazacElementyPomocniczeEdytora(trybRenderowania)) return null

  return <div data-element-pomocniczy-edytora>{children}</div>
}
