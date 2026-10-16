import { useState } from 'react'
import { Karta, Przycisk, OdznakaStatusu, PoleFormularza, Zakladki, PustyStan, PanelWysuwany, Komunikat, type StatusInterfejsu } from './ElementyInterfejsu'

const statusy: [StatusInterfejsu, string][] = [['success', 'Poprawne'], ['warning', 'Niekompletne'], ['error', 'Błąd'], ['info', 'Informacja'], ['draft', 'Niezapisane zmiany']]

function PrzykladMotywu({ motyw, tytul }: { motyw: string; tytul: string }) {
  const [zakladka, ustawZakladke] = useState('Formularz')
  const [otwarty, ustawOtwarty] = useState(false)
  return <div className="ui-galeria__motyw" data-ui-paleta={motyw}><Karta tytul={tytul}>
    <div className="ui-galeria__statusy">{statusy.map(([status, etykieta]) => <OdznakaStatusu key={status} status={status}>{etykieta}</OdznakaStatusu>)}</div>
    <Zakladki pozycje={['Formularz', 'Pusta lista']} aktywna={zakladka} wybierz={ustawZakladke}>{zakladka === 'Formularz' ? <PoleFormularza etykieta="Nazwa przykładu" placeholder="Wpisz nazwę" /> : <PustyStan>Brak elementów. Dodaj pierwszy wpis.</PustyStan>}</Zakladki>
    <Komunikat>Podgląd elementów interfejsu.</Komunikat><Komunikat status="error">Przykładowy błąd — popraw wymagane pole.</Komunikat>
    <Przycisk onClick={() => ustawOtwarty(true)}>Otwórz panel</Przycisk>
    <Przycisk disabled>Przycisk niedostępny</Przycisk>
    <PanelWysuwany otwarty={otwarty} zamknij={() => ustawOtwarty(false)} tytul={`Panel — ${tytul}`}><p>Pełne wypełnienie panelu. Escape zamyka panel i przywraca fokus.</p><PoleFormularza etykieta="Pole w panelu" /></PanelWysuwany>
  </Karta></div>
}

export function GaleriaKomponentow() {
  return <div className="ui-galeria"><PrzykladMotywu motyw="EMERALD_DARK" tytul="Emerald Dark" /><PrzykladMotywu motyw="SOFT_GREY" tytul="Soft Grey" /><PrzykladMotywu motyw="DARK_GRAY" tytul="Dark Gray" /></div>
}
