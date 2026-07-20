import { pobierzIdPola } from './identyfikatoryPol'

type SzczegolyOtwieranegoPola = {
  pole: string
}

const timeryPodswietlen = new WeakMap<HTMLElement, number>()

function znajdzElementDocelowy(pole: string, idSekcjiFormularza: string, idDocelowy?: string) {
  return document.getElementById(idDocelowy ?? pobierzIdPola(pole)) ?? document.getElementById(idSekcjiFormularza)
}

function podswietlPole(element: HTMLElement) {
  const poprzedniTimer = timeryPodswietlen.get(element)
  if (poprzedniTimer !== undefined) window.clearTimeout(poprzedniTimer)

  element.classList.add('szczegoly-pole--wskazane')
  const timer = window.setTimeout(() => {
    element.classList.remove('szczegoly-pole--wskazane')
    timeryPodswietlen.delete(element)
  }, 1300)
  timeryPodswietlen.set(element, timer)
}

export function przejdzDoPolaFormularza(pole: string, idSekcjiFormularza: string, idDocelowy?: string) {
  window.dispatchEvent(new CustomEvent<SzczegolyOtwieranegoPola>('szczegoly:otworz-pole', { detail: { pole } }))

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const element = znajdzElementDocelowy(pole, idSekcjiFormularza, idDocelowy)
      if (!element) return

      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || element instanceof HTMLButtonElement) {
        element.focus({ preventScroll: true })
        podswietlPole(element)
      }
    })
  })
}
