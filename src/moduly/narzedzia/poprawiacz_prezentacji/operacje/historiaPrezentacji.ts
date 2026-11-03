import JSZip from 'jszip'
import type { ModelPptx } from '../pptx/modelPptx'
import { otworzPptx } from '../pptx/otworzPptx'

export type TransakcjaPrezentacji = {
  nazwa: string
  czesci: { nazwa: string; przed: Uint8Array | null; po: Uint8Array | null }[]
}

export async function utworzTransakcje(przed: ModelPptx, po: ModelPptx, nazwa: string): Promise<TransakcjaPrezentacji> {
  const czesci: TransakcjaPrezentacji['czesci'] = []
  for (const sciezka of new Set([...Object.keys(przed.archiwum.files), ...Object.keys(po.archiwum.files)])) {
    if (przed.archiwum.files[sciezka]?.dir || po.archiwum.files[sciezka]?.dir) continue
    const [stara, nowa] = await Promise.all([przed.archiwum.file(sciezka)?.async('uint8array') ?? null, po.archiwum.file(sciezka)?.async('uint8array') ?? null])
    if (stara?.length === nowa?.length && stara?.every((bajt, indeks) => bajt === nowa?.[indeks])) continue
    czesci.push({ nazwa: sciezka, przed: stara, po: nowa })
  }
  return { nazwa, czesci }
}

export function ograniczHistorie(historia: TransakcjaPrezentacji[]) {
  let rozmiar = 0
  return historia.slice(-30).reverse().filter((transakcja, indeks) => {
    rozmiar += transakcja.czesci.reduce((suma, czesc) => suma + (czesc.przed?.byteLength ?? 0) + (czesc.po?.byteLength ?? 0), 0)
    return indeks === 0 || rozmiar <= 32 * 1024 * 1024
  }).reverse()
}

export async function odtworzTransakcje(model: ModelPptx, transakcja: TransakcjaPrezentacji, kierunek: 'przed' | 'po') {
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  for (const czesc of transakcja.czesci) {
    const dane = czesc[kierunek]
    if (dane) archiwum.file(czesc.nazwa, dane)
    else archiwum.remove(czesc.nazwa)
  }
  return otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }))
}
