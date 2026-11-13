import OchronaKartotekiUzytkownikow from './kartoteki/uzytkownicy/OchronaKartotekiUzytkownikow'
import UkladAplikacji from './aplikacja/layout/UkladAplikacji'
import { DostawcaUzytkownika } from './aplikacja/logowanie/KontekstUzytkownika'
import PanelLogowania from './aplikacja/logowanie/PanelLogowania'
import { useKontekstUzytkownika } from './aplikacja/logowanie/useKontekstUzytkownika'
import EkranInicjalizacji from './aplikacja/logowanie/EkranInicjalizacji'

function ZawartoscAplikacji() {
  const { zalogowanyUzytkownik, inicjalizacja, zaloguj, odswiezUzytkownika } = useKontekstUzytkownika()
  if (inicjalizacja.aktywna) return <EkranInicjalizacji etap={inicjalizacja.etap} />
  return zalogowanyUzytkownik ? <UkladAplikacji /> : <PanelLogowania otworzDemonstracje={() => zaloguj('administrator-kacper-madej')} poUwierzytelnieniu={() => odswiezUzytkownika(true)} />
}

export default function App() {
  return <OchronaKartotekiUzytkownikow><DostawcaUzytkownika><ZawartoscAplikacji /></DostawcaUzytkownika></OchronaKartotekiUzytkownikow>
}
