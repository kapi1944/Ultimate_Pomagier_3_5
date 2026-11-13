import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { useOchronaNiezapisanegoDokumentu } from '../src/moduly/dokumenty/wspolne/useStanDokumentu.ts'

function Formularz({ dane, zapisz, odrzuc }) {
  useOchronaNiezapisanegoDokumentu(Boolean(dane), () => zapisz(dane), { odrzucZmiany: odrzuc })
  return createElement('output', null, dane)
}

export function zamontujFormularze(element) {
  const korzen = createRoot(element)
  return {
    renderuj(formularze) {
      korzen.render(createElement(StrictMode, null, Object.entries(formularze).map(([id, formularz]) => createElement(Formularz, { key: id, ...formularz }))))
    },
    odmontuj: () => korzen.unmount(),
  }
}
