import { createRoot } from 'react-dom/client'
import RendererAnkiety from '../src/moduly/dokumenty/generatory/ankiety/RendererAnkiety'
import { utworzDomyslneDaneAnkiety, serializujDaneAnkiety } from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety'
import { pobierzLogoOrganizatora } from '../src/wspolne/dokumenty/logoOrganizatora'
import { pobierzStronyDokumentu, pobierzPdfDokumentu } from '../src/wspolne/dokumenty/eksportPdf'
import '../src/moduly/dokumenty/generatory/ankiety/widokAnkiet.css'

const podglad = document.querySelector<HTMLDivElement>('#podglad')!
const wynik = document.querySelector<HTMLPreElement>('#wynik')!
const dane = { ...utworzDomyslneDaneAnkiety(), tytulSzkolenia: '„Negocjacje Biznesowe”', miejsce: 'Warszawa', dataOd: '2026-10-07', dataDo: '2026-10-08', trener: 'Grzegorz Kryjom' }
const zapis = serializujDaneAnkiety(dane)
const korzen = createRoot(podglad)
function sprawdz(warunek: boolean, opis: string) {
  if (!warunek) throw new Error(opis)
  wynik.append(`\nOK: ${opis}`)
}
function wymaganyElement(rodzic: Element, selektor: string) {
  const element = rodzic.querySelector<HTMLElement>(selektor)
  if (!element) throw new Error(`Brak elementu: ${selektor}`)
  return element
}
async function sprawdzUklad() {
  const strony = pobierzStronyDokumentu(podglad)
  sprawdz(strony.length === 2, 'Podgląd i eksport wybierają te same dwie strony A4')
  for (const strona of strony) {
    const logo = strona.querySelector<HTMLImageElement>('img[data-blok-swobodny^="szablon-logo-"]')!
    await logo.decode()
    sprawdz(logo.getAttribute('src') === pobierzLogoOrganizatora('SEMPER'), 'Wspólny asset SEMPER Programów i List')
    sprawdz(getComputedStyle(logo).objectFit === 'contain', 'Logo zachowuje proporcje')
    const wymiary = logo.getBoundingClientRect()
    sprawdz(Math.abs(wymiary.width / strona.getBoundingClientRect().width * 210 - 32) < .1, 'Logo ma szerokość 32 mm niezależnie od skali')
    sprawdz(wymiary.left >= wymaganyElement(strona, '[data-blok-swobodny^="szablon-tytul-"]').getBoundingClientRect().right, 'Logo nie nachodzi na tytuł')
    for (const selektor of ['.ankieta-a4__naglowek', '.ankieta-a4__tytul-naglowka']) sprawdz(getComputedStyle(wymaganyElement(strona, selektor)).borderRightWidth === '0px', 'Brak starej ramki i pionowego separatora nagłówka')
    sprawdz(getComputedStyle(wymaganyElement(strona, '.ankieta-a4__numer-strony')).backgroundColor === 'rgb(198, 83, 79)', 'Czerwony blok numeru pozostaje')
    sprawdz(wymaganyElement(strona, 'main').getBoundingClientRect().bottom < wymaganyElement(strona, 'footer').getBoundingClientRect().top, 'Treść mieści się na A4 przed stopką')
  }
  const druga = strony[1]
  const opis = wymaganyElement(druga, '.ankieta-a4__opis-email').getBoundingClientRect()
  const pole = wymaganyElement(druga, '.ankieta-a4__sekcja-email').getBoundingClientRect()
  const poprzednie = druga.querySelectorAll('.ankieta-a4__pytanie-otwarte')[2].getBoundingClientRect()
  sprawdz(opis.top - poprzednie.bottom > pole.top - opis.bottom, 'Opis e-mail oddzielony od poprzedniego pytania i bliżej pola')
  sprawdz(pole.height >= parseFloat(getComputedStyle(wymaganyElement(druga, 'main')).fontSize) * 11 - 1, 'Duże pole e-mail zachowuje wysokość')
  const pytania = [...druga.querySelectorAll('.ankieta-a4__uwagi > p')].map((element) => element.textContent)
  sprawdz(pytania[0] === '* Czy ewentualne uwagi, sugestie zgłosił/a Pan/i Organizatorowi podczas szkolenia?', 'Pierwsze pytanie ma gwiazdkę w treści')
  sprawdz(pytania[1] === '* Czy Organizator zareagował i znalazł rozwiązanie dla zgłoszonych uwag, sugestii?', 'Drugie pytanie ma gwiazdkę w treści')
  sprawdz(druga.querySelectorAll('.ankieta-a4__odpowiedzi-tak-nie i').length === 6, 'Pozostają oba zestawy TAK / NIE / NIE DOTYCZY')
  sprawdz(serializujDaneAnkiety(dane) === zapis, 'Renderer nie zmienia pytań ani zapisanych bloków')
}
declare global {
  interface Window { sprawdzUkladAnkiety: typeof sprawdzUklad }
}
window.sprawdzUkladAnkiety = sprawdzUklad
async function wykonajTest() {
  korzen.render(<RendererAnkiety dane={dane} />)
  await new Promise<void>((rozwiaz) => requestAnimationFrame(() => requestAnimationFrame(() => rozwiaz())))
  for (const szerokosc of ['210mm', '500px', '350px']) {
    podglad.style.width = szerokosc
    await sprawdzUklad()
  }
  podglad.style.width = '210mm'
  const przycisk = document.createElement('button')
  przycisk.textContent = 'Eksportuj PDF do porównania'
  przycisk.onclick = () => { void pobierzPdfDokumentu({ obszarDokumentu: podglad, nazwaPliku: 'Ankieta-regresja.pdf' }) }
  wynik.after(przycisk)
  wynik.append('\nSUKCES')
}
void wykonajTest().catch((blad: unknown) => { wynik.append(`\nBŁĄD: ${String(blad)}`); throw blad })
