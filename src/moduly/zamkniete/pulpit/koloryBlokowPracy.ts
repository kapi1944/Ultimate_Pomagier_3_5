import type { CSSProperties } from 'react'
import type { BlokPracy } from './logika/harmonogramPracy'
import type { WystapienieRutyny } from './logika/rutyny'

type StylBlokuPracy = CSSProperties & { '--pulpit-kolor-bloku': string; '--pulpit-tlo-bloku': string }

export function pobierzStylBlokuPracy(blok: BlokPracy, blokiDnia: BlokPracy[]): StylBlokuPracy {
  // Brak własnego koloru zachowuje dotychczasowe, naprzemienne odcienie motywu osi.
  const kolor = blok.kolor
  const wariant = blokiDnia.indexOf(blok) % 3
  const barwa = kolor ?? (wariant === 1 ? 'var(--ui-info)' : 'var(--ui-akcent)')
  return {
    '--pulpit-kolor-bloku': barwa,
    '--pulpit-tlo-bloku': `color-mix(in srgb, ${barwa} ${kolor ? 24 : wariant === 2 ? 32 : 18}%, var(--ui-panel))`,
  }
}

export function pobierzStylRutyny(wpis: Pick<WystapienieRutyny, 'godzina' | 'blokPracyId'>, blokiDnia: BlokPracy[]): StylBlokuPracy | undefined {
  const pasujace = blokiDnia.filter((blok) => blok.wlaczony && (wpis.blokPracyId
    ? blok.id === wpis.blokPracyId && (!wpis.godzina || (blok.poczatek <= wpis.godzina && wpis.godzina < blok.koniec))
    : wpis.godzina && blok.poczatek <= wpis.godzina && wpis.godzina < blok.koniec))
  return pasujace.length === 1 ? pobierzStylBlokuPracy(pasujace[0], blokiDnia) : undefined
}
