export function pobierzGruboscTekstuPozycjiListyProgramu(poziom: number, czyPogrubiacNaglowki: boolean) {
  return czyPogrubiacNaglowki && poziom === 0 ? 700 : 400
}