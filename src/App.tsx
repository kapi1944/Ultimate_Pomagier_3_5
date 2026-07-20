import UkladAplikacji from './aplikacja/layout/UkladAplikacji'
import { DostawcaUzytkownika } from './aplikacja/logowanie/KontekstUzytkownika'
import PanelLogowania from './aplikacja/logowanie/PanelLogowania'
import { useKontekstUzytkownika } from './aplikacja/logowanie/useKontekstUzytkownika'

function ZawartoscAplikacji() {
  const { zalogowanyUzytkownik, aktywniUzytkownicy, zaloguj } = useKontekstUzytkownika()
  return zalogowanyUzytkownik ? <UkladAplikacji /> : <PanelLogowania aktywniUzytkownicy={aktywniUzytkownicy} zalogujUzytkownika={zaloguj} />
}

export default function App() {
  return <DostawcaUzytkownika><ZawartoscAplikacji /></DostawcaUzytkownika>
}
