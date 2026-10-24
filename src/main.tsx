import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './wspolne/komponenty/tokeny.css'
import { pobierzUstawieniaAplikacji, zastosujUstawieniaAplikacji } from './aplikacja/ustawienia/magazynUstawienAplikacji'
import { zastosujSkaleInterfejsu, zarejestrujSkrotySkaliInterfejsu } from './aplikacja/ustawienia/skalaInterfejsu'

async function uruchomAplikacje() {
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

void uruchomAplikacje()
