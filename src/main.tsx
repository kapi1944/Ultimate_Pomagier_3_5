import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { przygotujDaneDesktop } from './aplikacja/logowanie/daneDesktop'
import './wspolne/komponenty/tokeny.css'
import { pobierzUstawieniaAplikacji, zastosujUstawieniaAplikacji } from './aplikacja/ustawienia/magazynUstawienAplikacji'
import { zastosujSkaleInterfejsu, zarejestrujSkrotySkaliInterfejsu } from './aplikacja/ustawienia/skalaInterfejsu'

async function uruchomAplikacje() {
  await przygotujDaneDesktop()
  const { default: App } = await import('./App.tsx')
  const ustawienia = pobierzUstawieniaAplikacji()
  zastosujUstawieniaAplikacji(ustawienia)
  await zastosujSkaleInterfejsu(ustawienia.wyglad.skalaInterfejsu)
  const usunSkroty = zarejestrujSkrotySkaliInterfejsu()
  import.meta.hot?.dispose(usunSkroty)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void uruchomAplikacje().catch((blad: unknown) => {
  const korzen = document.getElementById('root')
  if (korzen) { korzen.setAttribute('role', 'alert'); korzen.textContent = `Nie udało się bezpiecznie uruchomić danych konta. ${blad instanceof Error ? blad.message : 'Zamknij aplikację i spróbuj ponownie.'}` }
})
