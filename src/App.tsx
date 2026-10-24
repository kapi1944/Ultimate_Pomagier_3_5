import OchronaKartotekiUzytkownikow from './kartoteki/uzytkownicy/OchronaKartotekiUzytkownikow'
import UkladAplikacji from './aplikacja/layout/UkladAplikacji'
import { DostawcaUzytkownika } from './aplikacja/logowanie/KontekstUzytkownika'
import PanelLogowania from './aplikacja/logowanie/PanelLogowania'
import { useKontekstUzytkownika } from './aplikacja/logowanie/useKontekstUzytkownika'

function ZawartoscAplikacji() {
  const { zalogowanyUzytkownik, zaloguj } = useKontekstUzytkownika()
  return zalogowanyUzytkownik ? <UkladAplikacji /> : <PanelLogowania otworzDemonstracje={() => zaloguj('administrator-kacper-madej')} />
}

export default function App() {
  return <OchronaKartotekiUzytkownikow><DostawcaUzytkownika><ZawartoscAplikacji /></DostawcaUzytkownika></OchronaKartotekiUzytkownikow>
}
