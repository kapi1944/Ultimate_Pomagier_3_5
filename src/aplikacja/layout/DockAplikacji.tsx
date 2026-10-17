import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzDostepneSkroty } from '../menu/preferencjeMenu'
import IkonaMenu from '../menu/IkonaMenu'
import { pobierzTypIkonyMenu } from '../menu/ikonyPozycjiMenu'
import { Przycisk } from '../../wspolne/komponenty/ElementyInterfejsu'

export default function DockAplikacji({ skroty, aktywnyWidok, ustawWidok, edytuj, ukryj }: { skroty: WidokNawigacji[]; aktywnyWidok: WidokNawigacji; ustawWidok: (widok: WidokNawigacji) => void; edytuj: () => void; ukryj: () => void }) {
  const dostepne = pobierzDostepneSkroty()
  return <footer className="dock-aplikacji"><nav aria-label="Szybki dostęp">{skroty.map((widok) => <Przycisk key={widok} title={dostepne.find((pozycja) => pozycja.widok === widok)?.opis} aria-current={widok === aktywnyWidok ? 'page' : undefined} onClick={() => ustawWidok(widok)}><IkonaMenu typ={pobierzTypIkonyMenu(widok)} />{dostepne.find((pozycja) => pozycja.widok === widok)?.etykieta}</Przycisk>)}</nav><div className="dock-aplikacji__akcje"><Przycisk onClick={edytuj}>Skróty</Przycisk><Przycisk onClick={ukryj} aria-label="Ukryj dock">×</Przycisk></div></footer>
}
