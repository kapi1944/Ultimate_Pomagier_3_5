import type { KontekstSwobodnychBlokow } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import type { ModelProgramuSzkolenia } from './modelProgramuSzkolenia'

type ZasobySwobodnychBlokowProgramu = {
  logotypOrganizatora?: string
  mapaOrganizatora?: string
  nazwaOrganizatora: string
  kontaktOrganizatora: string
  stopkaOrganizatora: string
}

export function utworzKontekstSwobodnychBlokowProgramu(
  program: ModelProgramuSzkolenia,
  zasoby: ZasobySwobodnychBlokowProgramu,
): KontekstSwobodnychBlokow {
  return {
    dane: {
      tytulSzkolenia: program.tytulSzkolenia,
      organizator: zasoby.nazwaOrganizatora,
      kontaktOrganizatora: zasoby.kontaktOrganizatora,
      stopkaOrganizatora: zasoby.stopkaOrganizatora,
    },
    zasobyObrazow: {
      logotyp_programu: program.logotypProgramu || undefined,
      logotyp_organizatora: zasoby.logotypOrganizatora,
      mapa_organizatora: zasoby.mapaOrganizatora,
    },
  }
}
