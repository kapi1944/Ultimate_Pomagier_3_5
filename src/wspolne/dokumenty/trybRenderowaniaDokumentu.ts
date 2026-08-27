export type TrybRenderowaniaDokumentu = 'roboczy' | 'finalny'

export function czyPokazacElementyPomocniczeEdytora(trybRenderowania: TrybRenderowaniaDokumentu) {
  return trybRenderowania === 'roboczy'
}
