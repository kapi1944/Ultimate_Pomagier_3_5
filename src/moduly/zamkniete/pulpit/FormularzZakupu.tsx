import { maksymalnaLiczbaZalacznikowZakupu, maksymalnyRozmiarZalacznikaZakupu } from './logika/zapotrzebowaniaZakupowe'
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { ZalacznikZakupu } from './modele/pulpit'

export type DaneFormularzaZakupu = { nazwa: string; ilosc: string; uwagi: string; linkiProduktow: string[]; zalaczniki: ZalacznikZakupu[] }

export default function FormularzZakupu({ formularz, ustawFormularz, blad, zapisz, anuluj, czyZamawiacz }: {
  formularz: DaneFormularzaZakupu; ustawFormularz: Dispatch<SetStateAction<DaneFormularzaZakupu>>; blad: string; zapisz: () => void; anuluj: () => void; czyZamawiacz: boolean
}) {
  const [bladZalacznikow, ustawBladZalacznikow] = useState('')
  const [czyWczytywanie, ustawCzyWczytywanie] = useState(false)
  const czyTrwaWczytywanie = useRef(false)
  async function dodajPliki(pliki: File[]) {
    if (czyTrwaWczytywanie.current || !pliki.length) return
    if (formularz.zalaczniki.length + pliki.length > maksymalnaLiczbaZalacznikowZakupu) { ustawBladZalacznikow('Można dodać maksymalnie 5 załączników.'); return }
    czyTrwaWczytywanie.current = true
    ustawCzyWczytywanie(true)
    ustawBladZalacznikow('')
    try {
      const zalaczniki = await Promise.all(pliki.map(async (plik): Promise<ZalacznikZakupu> => {
        if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(plik.type) || plik.size > maksymalnyRozmiarZalacznikaZakupu) throw new Error('Wybierz PNG, JPEG, WebP lub PDF do 1 MB.')
        const daneUrl = await new Promise<string>((rozwiaz, odrzuc) => {
          const czytnik = new FileReader()
          czytnik.onload = () => typeof czytnik.result === 'string' ? rozwiaz(czytnik.result) : odrzuc(new Error('Nie udało się odczytać załącznika.'))
          czytnik.onerror = () => odrzuc(new Error('Nie udało się odczytać załącznika.'))
          czytnik.readAsDataURL(plik)
        })
        return { id: crypto.randomUUID(), nazwa: plik.name || 'Obraz ze schowka', daneUrl }
      }))
      ustawFormularz((obecny) => ({ ...obecny, zalaczniki: [...obecny.zalaczniki, ...zalaczniki] }))
    } catch (blad) { ustawBladZalacznikow(blad instanceof Error ? blad.message : 'Nie udało się dodać załączników.') }
    finally { czyTrwaWczytywanie.current = false; ustawCzyWczytywanie(false) }
  }
  return <form className="pulpit-formularz-zakupu" onPaste={(zdarzenie) => {
    const pliki = Array.from(zdarzenie.clipboardData.items).filter((element) => element.kind === 'file').map((element) => element.getAsFile()).filter((plik): plik is File => plik !== null)
    if (pliki.length) { zdarzenie.preventDefault(); void dodajPliki(pliki) }
  }} onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); if (!czyTrwaWczytywanie.current) zapisz() }}>
    <label htmlFor="pulpit-zakup-nazwa">Co jest potrzebne?<input autoFocus required id="pulpit-zakup-nazwa" onChange={(zdarzenie) => ustawFormularz({ ...formularz, nazwa: zdarzenie.target.value })} value={formularz.nazwa} /></label>
    <label htmlFor="pulpit-zakup-ilosc">Ilość<input id="pulpit-zakup-ilosc" min="0.000001" onChange={(zdarzenie) => ustawFormularz({ ...formularz, ilosc: zdarzenie.target.value })} required step="any" type="number" value={formularz.ilosc} /></label>
    <div><label htmlFor="pulpit-zakup-uwagi">Uwagi</label><textarea id="pulpit-zakup-uwagi" onChange={(zdarzenie) => ustawFormularz({ ...formularz, uwagi: zdarzenie.target.value })} value={formularz.uwagi} /></div>
    {czyZamawiacz && <fieldset><legend>Linki do produktu — tylko dla Zamawiaczy</legend>{formularz.linkiProduktow.map((link, indeks) => <div className="pulpit-zakup__link" key={indeks}>
      <input aria-label={'Link do produktu ' + (indeks + 1)} type="url" placeholder="https://" value={link} onChange={(zdarzenie) => ustawFormularz({ ...formularz, linkiProduktow: formularz.linkiProduktow.map((obecny, pozycja) => pozycja === indeks ? zdarzenie.target.value : obecny) })} />
      <button type="button" aria-label="Dodaj kolejny link" onClick={() => ustawFormularz({ ...formularz, linkiProduktow: [...formularz.linkiProduktow, ''] })}>+</button>
      {formularz.linkiProduktow.length > 1 && <button type="button" aria-label={'Usuń link ' + (indeks + 1)} onClick={() => ustawFormularz({ ...formularz, linkiProduktow: formularz.linkiProduktow.filter((_, pozycja) => pozycja !== indeks) })}>×</button>}
    </div>)}</fieldset>}
    <label htmlFor="pulpit-zakup-pliki">Załączniki (PNG, JPEG, WebP, PDF; do 1 MB, maks. 5)<input id="pulpit-zakup-pliki" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" disabled={czyWczytywanie} onChange={(zdarzenie) => { void dodajPliki(Array.from(zdarzenie.target.files ?? [])); zdarzenie.target.value = '' }} /></label>
    <p>Możesz wkleić screenshot ze schowka (Ctrl+V) w formularzu.</p>
    <ul className="pulpit-zakup__zalaczniki">{formularz.zalaczniki.map((zalacznik) => <li key={zalacznik.id}>{zalacznik.daneUrl.startsWith('data:image/') && <img src={zalacznik.daneUrl} alt={zalacznik.nazwa} />}<span>{zalacznik.nazwa}</span><button type="button" disabled={czyWczytywanie} onClick={() => ustawFormularz({ ...formularz, zalaczniki: formularz.zalaczniki.filter((obecny) => obecny.id !== zalacznik.id) })} aria-label={'Usuń załącznik ' + zalacznik.nazwa}>×</button></li>)}</ul>
    {(blad || bladZalacznikow) && <p className="pulpit-formularz-zakupu__blad" role="alert">{blad || bladZalacznikow}</p>}
    <div className="pulpit-modal__akcje"><button onClick={anuluj} disabled={czyWczytywanie} type="button">Anuluj</button><button disabled={czyWczytywanie} className="pulpit-przycisk-glowny" type="submit">{czyWczytywanie ? 'Wczytywanie…' : 'Zapisz'}</button></div>
  </form>
}
