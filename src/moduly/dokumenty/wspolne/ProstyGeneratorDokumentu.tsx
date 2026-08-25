import { useMemo, useRef, useState } from 'react'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../wspolne/dokumenty/AkcjeEksportuPdf'
import type { TypDokumentu } from '../../../wspolne/dokumenty/modelDokumentu'
import { utworzNazwePlikuDokumentu } from '../../../wspolne/dokumenty/nazwyDokumentow'
import UkladGeneratoraDokumentu, {
  PanelGeneratoraDokumentu,
  PasekAkcjiGeneratora,
  UkladPaneliGeneratora,
} from './UkladGeneratoraDokumentu'
import { useStanProstegoGeneratora } from './useStanProstegoGeneratora'
import './prostyGeneratorDokumentu.css'

type KonfiguracjaGeneratora = {
  tytul: string
  opis: string
  etykietaDanychWejsciowych: string
  tekstPrzykladowy: string
  kluczSzkicu: string
  typDokumentu: TypDokumentu
  generatorId: string
  generujDokument: (daneWejsciowe: string) => string
}

export default function ProstyGeneratorDokumentu({
  tytul,
  opis,
  etykietaDanychWejsciowych,
  tekstPrzykladowy,
  kluczSzkicu,
  typDokumentu,
  generatorId,
  generujDokument,
}: KonfiguracjaGeneratora) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [komunikatAkcji, ustawKomunikatAkcji] = useState<string | null>(null)
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const {
    daneWejsciowe,
    komunikatStanu,
    zapiszWRejestr,
    zmienDaneWejsciowe,
    wyczysc,
  } = useStanProstegoGeneratora({
    typDokumentu,
    generatorId,
    tytulDokumentu: tytul,
    kluczSzkicu,
    danePoczatkowe: tekstPrzykladowy,
    uzytkownikId: zalogowanyUzytkownik?.id,
  })
  const wygenerowanyDokument = useMemo(() => generujDokument(daneWejsciowe), [daneWejsciowe, generujDokument])
  const nazwaPliku = utworzNazwePlikuDokumentu(typDokumentu, tytul)

  async function obsluzKopiowanie() {
    if (!wygenerowanyDokument.trim()) {
      ustawKomunikatAkcji('Najpierw wygeneruj dokument.')
      return
    }

    try {
      await navigator.clipboard.writeText(wygenerowanyDokument)
      ustawKomunikatAkcji('Wynik skopiowany do schowka.')
    } catch {
      ustawKomunikatAkcji('Nie udało się skopiować wyniku.')
    }
  }

  function obsluzCzyszczenie() {
    wyczysc()
    ustawKomunikatAkcji('Wyczyszczono generator. Poprzednia kopia pozostaje w rejestrze.')
  }

  const akcje = (
    <PasekAkcjiGeneratora>
      <button type="button" onClick={() => ustawKomunikatAkcji(zapiszWRejestr())}>Generuj i zapisz</button>
      <button type="button" onClick={obsluzKopiowanie}>Kopiuj wynik</button>
      <AkcjeEksportuPdf nazwaPliku={nazwaPliku} obszarDokumentu={obszarPodgladuRef} />
      <button type="button" onClick={obsluzCzyszczenie}>Nowy / wyczyść</button>
    </PasekAkcjiGeneratora>
  )

  return (
    <UkladGeneratoraDokumentu
      akcje={akcje}
      className="prosty-generator"
      komunikat={komunikatAkcji ?? komunikatStanu}
      opis={opis}
      tytul={tytul}
    >
      <UkladPaneliGeneratora>
        <PanelGeneratoraDokumentu wariant="edycja">
          <label className="prosty-generator__etykieta" htmlFor={`${kluczSzkicu}-dane`}>{etykietaDanychWejsciowych}</label>
          <textarea
            className="prosty-generator__textarea"
            id={`${kluczSzkicu}-dane`}
            onChange={(zdarzenie) => zmienDaneWejsciowe(zdarzenie.target.value)}
            value={daneWejsciowe}
          />
        </PanelGeneratoraDokumentu>
        <PanelGeneratoraDokumentu ref={obszarPodgladuRef} tytul="Wygenerowany dokument" wariant="podglad">
          <pre className="prosty-generator__wynik">{wygenerowanyDokument}</pre>
        </PanelGeneratoraDokumentu>
      </UkladPaneliGeneratora>
    </UkladGeneratoraDokumentu>
  )
}
