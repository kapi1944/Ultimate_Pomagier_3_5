import { useEffect, useRef, useState } from 'react'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { wykonajOperacjeTozsamosci } from '../../aplikacja/logowanie/klientTozsamosci'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyMozeResetowacHaslo, czyMozeZarzadzacUzytkownikami } from './uprawnienia'
import type { Uzytkownik } from './typyUzytkownikow'
import './resetowanieHasel.css'

type WynikResetu = { id: string; kod?: string; wygasa?: string; blad?: string }
function czyWynikResetu(wynik: unknown): wynik is WynikResetu {
  return Boolean(wynik && typeof wynik === 'object' && 'id' in wynik && typeof wynik.id === 'string' && ['kod', 'wygasa', 'blad'].every((pole) => !(pole in wynik) || typeof Reflect.get(wynik, pole) === 'string'))
}
export function StatusResetowaniaHasla({ konto }: { konto: Uzytkownik }) {
  if (konto.stanResetowaniaHasla === 'RESET_OCZEKUJACY') return <small>🟠 Reset hasła oczekuje</small>
  if (konto.stanResetowaniaHasla === 'RESET_WYGASLY') return <small>🔴 Kod wygasł lub został unieważniony</small>
  if (konto.stanResetowaniaHasla === 'RESET_WYMAGANY') return <small>🔒 Wymagany nowy kod resetowania</small>
  return null
}
export default function PanelResetowaniaHasel({ konta, zbiorczy = false, poZmianie }: { konta: Uzytkownik[]; zbiorczy?: boolean; poZmianie?: () => void }) {
  const { zalogowanyUzytkownik, odswiezUzytkownika } = useKontekstUzytkownika()
  const [operacja, ustawOperacje] = useState<'resetuj' | 'anuluj-reset' | null>(null)
  const [wyniki, ustawWyniki] = useState<WynikResetu[] | null>(null)
  const [blad, ustawBlad] = useState('')
  const [zajety, ustawZajety] = useState(false)
  const [skopiowano, ustawSkopiowano] = useState('')
  const okno = useRef<HTMLDialogElement>(null)
  const blokada = useRef(false)
  const [wybrane, ustawWybrane] = useState<Uzytkownik[]>([])
  useEffect(() => { if (operacja) okno.current?.showModal(); else okno.current?.close() }, [operacja])
  if (czyTrybDemonstracyjny || !czyMozeZarzadzacUzytkownikami(zalogowanyUzytkownik)) return null
  const dostepne = konta.filter((konto) => czyMozeResetowacHaslo(zalogowanyUzytkownik, konto))
  if (!zbiorczy && !dostepne.length) return null
  function otworz(nowa: 'resetuj' | 'anuluj-reset') { ustawWybrane([...konta]); ustawOperacje(nowa); ustawWyniki(null); ustawBlad(''); ustawSkopiowano('') }
  function zamknij() { if (blokada.current) return; ustawOperacje(null); ustawWyniki(null); ustawBlad(''); ustawSkopiowano(''); ustawWybrane([]) }
  async function potwierdz() {
    if (blokada.current || !operacja) return
    blokada.current = true; ustawZajety(true); ustawBlad('')
    try {
      const wynik = await wykonajOperacjeTozsamosci(operacja, { identyfikatory: wybrane.map((konto) => konto.id) })
      if (!Array.isArray(wynik) || !wynik.every(czyWynikResetu)) throw new Error('Nieprawidłowa odpowiedź usługi kont. Nie powtarzaj operacji bez sprawdzenia stanu.')
      ustawWyniki(wynik)
      await odswiezUzytkownika(); poZmianie?.()
    } catch (blad) { ustawBlad(blad instanceof Error ? blad.message : 'Nie udało się zresetować hasła. Sprawdź stan przed ponowieniem.') }
    finally { blokada.current = false; ustawZajety(false) }
  }
  const konto = konta[0]
  return <section aria-label={zbiorczy ? 'Resetowanie haseł zaznaczonych' : 'Resetowanie hasła'}>
    {!zbiorczy && <><h2>Resetowanie hasła</h2><StatusResetowaniaHasla konto={konto} />{konto.resetZainicjowano && <p>Zainicjowano: {new Date(konto.resetZainicjowano).toLocaleString('pl-PL')}</p>}<p>Nowe hasło ustala właściciel konta za pomocą poufnego kodu.</p></>}
    <button type="button" disabled={!dostepne.length} onClick={() => otworz('resetuj')}>{zbiorczy ? '🔑 Resetuj hasła zaznaczonych' : konto.wymagaZmianyHasla ? '🔑 Wygeneruj nowy kod' : '🔑 Resetuj hasło'}</button>
    {!zbiorczy && konto.resetZainicjowano && <button type="button" onClick={() => otworz('anuluj-reset')}>Anuluj niezakończony reset</button>}
    <dialog className="resetowanie-hasel" ref={okno} aria-labelledby={zbiorczy ? 'tytul-resetu-zbiorczego' : 'tytul-resetu'} onCancel={(zdarzenie) => { zdarzenie.preventDefault(); zamknij() }}>
      <h2 id={zbiorczy ? 'tytul-resetu-zbiorczego' : 'tytul-resetu'}>{wyniki ? 'Wynik operacji' : operacja === 'anuluj-reset' ? 'Anulowanie resetowania' : 'Potwierdź resetowanie haseł'}</h2>
      <p>{operacja === 'anuluj-reset' ? 'Kod i rozpoczęte ustawianie hasła zostaną unieważnione. Stare hasło pozostanie zablokowane. Dostęp wymaga wygenerowania nowego kodu.' : 'Dotychczasowe hasło i sesje zostaną zablokowane. Poprzednie kody stracą ważność. Nowy kod będzie ważny 24 godziny. Hasło ustali właściciel konta.'}</p>
      <ul>{wybrane.map((konto) => <li key={konto.id}>{konto.imie} {konto.nazwisko} · {konto.login}{!czyMozeResetowacHaslo(zalogowanyUzytkownik, konto) && ' — brak uprawnień; konto zostanie pominięte'}</li>)}</ul>
      {blad && <p role="alert">{blad}</p>}
      {wyniki && <><p>Kody są widoczne tylko w tym oknie. Traktuj je jak poufne dane uwierzytelniające. Przekaż je właściwym osobom bezpiecznym kanałem. Po zamknięciu nie będzie można odczytać ich ponownie.</p><ul>{wyniki.map((wynik) => {
        const konto = wybrane.find((konto) => konto.id === wynik.id)
        return <li key={wynik.id}><strong>{konto?.imie} {konto?.nazwisko} · {konto?.login}</strong>{wynik.blad ? <p>{wynik.blad}</p> : wynik.kod ? <><p><code className="resetowanie-hasel__kod">{wynik.kod}</code></p><p>Ważny do: {new Date(wynik.wygasa ?? '').toLocaleString('pl-PL')}</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(wynik.kod ?? ''); ustawSkopiowano(wynik.id); ustawBlad('') } catch { ustawBlad('Nie udało się skopiować kodu. Zaznacz i skopiuj go ręcznie.') } }}>Kopiuj kod dla {konto?.login}</button>{skopiowano === wynik.id && <span role="status"> Skopiowano — usuń kod ze schowka po przekazaniu.</span>}</> : <p>Anulowano kod. Stare hasło pozostaje zablokowane.</p>}</li>
      })}</ul></>}
      <div className="resetowanie-hasel__akcje"><button type="button" disabled={zajety} onClick={zamknij}>{wyniki ? 'Zamknij i ukryj kody' : 'Anuluj'}</button>{!wyniki && <button type="button" disabled={zajety} onClick={() => { void potwierdz() }}>{zajety ? 'Trwa operacja…' : operacja === 'anuluj-reset' ? 'Potwierdź anulowanie' : 'Potwierdź reset'}</button>}</div>
    </dialog>
  </section>
}
