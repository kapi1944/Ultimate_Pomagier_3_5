export type StanPaneluGeneratora = {
  czyOtwarty: boolean
  czyPrzypiety: boolean
  czyWysuwanieWlaczone: boolean
}

export type AkcjaPaneluGeneratora =
  | 'OTWORZ'
  | 'ZAMKNIJ'
  | 'PRZELACZ'
  | 'PRZELACZ_PRZYPIECIE'
  | 'PRZELACZ_WYSUWANIE'
  | 'SCHOWAJ_JESLI_ODPIETY'

export function zredukujStanPaneluGeneratora(stan: StanPaneluGeneratora, akcja: AkcjaPaneluGeneratora): StanPaneluGeneratora {
  switch (akcja) {
    case 'OTWORZ':
      return { ...stan, czyOtwarty: true }
    case 'ZAMKNIJ':
      return { ...stan, czyOtwarty: false, czyPrzypiety: false }
    case 'PRZELACZ':
      return { ...stan, czyOtwarty: !stan.czyOtwarty }
    case 'PRZELACZ_PRZYPIECIE': {
      const czyPrzypiac = !stan.czyPrzypiety
      return { ...stan, czyOtwarty: czyPrzypiac, czyPrzypiety: czyPrzypiac }
    }
    case 'PRZELACZ_WYSUWANIE':
      return { ...stan, czyWysuwanieWlaczone: !stan.czyWysuwanieWlaczone }
    case 'SCHOWAJ_JESLI_ODPIETY':
      return stan.czyPrzypiety ? stan : { ...stan, czyOtwarty: false }
  }
}
