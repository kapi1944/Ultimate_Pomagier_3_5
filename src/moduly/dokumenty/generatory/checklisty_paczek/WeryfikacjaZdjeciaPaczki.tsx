import { useEffect, useRef, useState } from 'react'
import { zatwierdzGotowoscPaczki } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import { czyIlosciPaczkiPotwierdzone, pobierzZdjecieKompletu, type DaneChecklistyPaczki, type PaczkaChecklisty } from './modelChecklistyPaczki'
import { dodajZdjeciePaczki } from './rejestrChecklistPaczek'
import { pobierzPlikZdjeciaPaczki } from './zdjeciaPaczek'

export default function WeryfikacjaZdjeciaPaczki({ dokumentId, dane, paczka, zablokowana, odswiez }: {
  dokumentId: string; dane: DaneChecklistyPaczki; paczka: PaczkaChecklisty; zablokowana: boolean; odswiez: () => void
}) {
  const [trwaOperacja, ustawTrwaOperacja] = useState(false)
  const [blad, ustawBlad] = useState('')
  const [podglad, ustawPodglad] = useState({ id: '', adres: '' })
  const blokada = useRef(false)
  const kompletna = czyIlosciPaczkiPotwierdzone(dane, paczka.id)
  const gotowa = paczka.statusOperacyjny === 'GOTOWA'
  const przygotowane = pobierzZdjecieKompletu(dane, paczka.id)
  const ostatnie = dane.historia.findLast((wpis) => wpis.paczkaId === paczka.id && wpis.potwierdzeniePaczki)
  const zdjecieId = gotowa || paczka.statusOperacyjny === 'WYSŁANA' ? ostatnie?.potwierdzeniePaczki?.zdjecieId : przygotowane?.id
  const odcisk = gotowa || paczka.statusOperacyjny === 'WYSŁANA' ? ostatnie?.potwierdzeniePaczki?.odcisk : przygotowane?.weryfikacjaPaczki?.odcisk
  useEffect(() => {
    if (!zdjecieId || !odcisk) return
    let aktywny = true
    let adres = ''
    void pobierzPlikZdjeciaPaczki([dokumentId, paczka.id, zdjecieId], odcisk).then((plik) => {
      if (!aktywny) return
      adres = plik ? URL.createObjectURL(plik) : ''
      ustawPodglad({ id: zdjecieId, adres })
    }).catch(() => { if (aktywny) ustawPodglad({ id: zdjecieId, adres: '' }) })
    return () => {
      aktywny = false
      if (adres) URL.revokeObjectURL(adres)
    }
  }, [dokumentId, paczka.id, zdjecieId, odcisk])
  const adresPodgladu = podglad.id === zdjecieId ? podglad.adres : ''
  async function wykonaj(operacja: () => Promise<unknown>, komunikat: string) {
    if (blokada.current) return
    blokada.current = true
    ustawTrwaOperacja(true)
    ustawBlad('')
    try {
      if (!await operacja()) throw new Error(komunikat)
      odswiez()
    } catch (blad) { ustawBlad(blad instanceof Error ? blad.message : komunikat) }
    finally { blokada.current = false; ustawTrwaOperacja(false) }
  }
  return <div className="checklista-paczki__zdjecie">
    {!gotowa && <p>Po potwierdzeniu ilości dodaj zdjęcie gotowej paczki.</p>}
    {adresPodgladu && <a href={adresPodgladu} target="_blank" rel="noreferrer">Otwórz zapisane zdjęcie paczki</a>}
    {zdjecieId && podglad.id === zdjecieId && !adresPodgladu && <p role="alert">Plik zdjęcia jest niedostępny w tym profilu przeglądarki.</p>}
    <label>Zdjęcie gotowej paczki<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
      disabled={zablokowana || !kompletna || gotowa || trwaOperacja} onChange={(zdarzenie) => {
        const plik = zdarzenie.currentTarget.files?.[0]
        zdarzenie.currentTarget.value = ''
        if (plik) void wykonaj(() => dodajZdjeciePaczki(dokumentId, paczka.id, plik), 'Nie udało się przypisać zdjęcia do aktualnego kompletu.')
      }} /></label>
    <button type="button" disabled={zablokowana || !kompletna || !adresPodgladu || gotowa || trwaOperacja} onClick={() => void wykonaj(
      () => zatwierdzGotowoscPaczki(dokumentId, paczka.id), 'Zatwierdzenie wymaga zapisanego zdjęcia aktualnej zawartości i uprawnienia wysyłki.')}>Oznacz paczkę jako gotową</button>
    {blad && <p role="alert">{blad}</p>}
  </div>
}
