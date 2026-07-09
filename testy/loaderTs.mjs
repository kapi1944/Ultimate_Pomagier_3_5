import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

function czyLokalnyImport(specifier) {
  return specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:')
}

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve)
  } catch (blad) {
    if (!czyLokalnyImport(specifier) || path.extname(specifier)) {
      throw blad
    }

    const katalogRodzica = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd()
    const sciezka = specifier.startsWith('file:')
      ? fileURLToPath(specifier)
      : path.resolve(katalogRodzica, specifier)
    const sciezkaTs = `${sciezka}.ts`

    if (!existsSync(sciezkaTs)) {
      throw blad
    }

    return defaultResolve(pathToFileURL(sciezkaTs).href, context, defaultResolve)
  }
}
