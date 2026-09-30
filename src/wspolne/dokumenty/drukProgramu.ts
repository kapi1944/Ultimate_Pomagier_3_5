export async function drukujProgram(obszar: HTMLElement) {
  const renderer = obszar.querySelector<HTMLElement>('.program-strony[data-tryb-renderowania="finalny"]')
  if (!renderer || renderer.querySelector('.program-strony__oczekiwanie')) throw new Error('Program nie jest gotowy do druku.')
  await document.fonts?.ready
  await Promise.all(Array.from(renderer.querySelectorAll<HTMLImageElement>('article[data-strona-dokumentu] img')).map((obraz) => obraz.decode()))
  await new Promise<void>((rozwiaz) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => rozwiaz())))
  if (!renderer.querySelector('article[data-strona-dokumentu]') || renderer.querySelector('.program-strony__oczekiwanie')) throw new Error('Program nie jest gotowy do druku.')

  const przodkowie: HTMLElement[] = []
  for (let element = renderer.parentElement; element; element = element.parentElement) przodkowie.push(element)
  renderer.setAttribute('data-cel-druku-programu', '')
  przodkowie.forEach((element) => element.setAttribute('data-przodek-druku-programu', ''))
  try {
    await new Promise<void>((rozwiaz, odrzuc) => {
      function zakoncz() {
        window.removeEventListener('afterprint', zakoncz)
        rozwiaz()
      }
      window.addEventListener('afterprint', zakoncz)
      try {
        window.print()
      } catch (blad) {
        window.removeEventListener('afterprint', zakoncz)
        odrzuc(blad)
      }
    })
  } finally {
    renderer.removeAttribute('data-cel-druku-programu')
    przodkowie.forEach((element) => element.removeAttribute('data-przodek-druku-programu'))
  }
}
