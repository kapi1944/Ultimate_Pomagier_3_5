import { lazy, Suspense, useState } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyMozeEksportowac } from '../../../../kartoteki/uzytkownicy/uprawnienia'
import type { Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import { PodgladSzczegolow } from '../../../zamkniete/szczegoly_organizacyjne/komponenty/PodgladSzczegolow'
import type { OpublikowaneSzczegolyOrganizacyjne, WersjaRoboczaGeneratora } from '../../../zamkniete/szczegoly_organizacyjne/typy'
import DokumentyWysylki from '../../../zamkniete/pulpit/DokumentyWysylki'
import { zbudujWysylkiMonitora } from '../../../zamkniete/pulpit/logika/monitorWysylek'
import { pobierzDokumentyMonitora } from '../../../zamkniete/pulpit/uslugi/dokumentyMonitora'
import { pobierzZrodloEtykiety, type DokumentChecklistyPaczki } from './rejestrChecklistPaczek'

const PanelPakietu = lazy(() => import('../../../../wspolne/dokumenty/pakietyDoZatwierdzenia/PanelPakietu'))

function przygotujWersjePakietu(rekord: WersjaRoboczaGeneratora | OpublikowaneSzczegolyOrganizacyjne): WersjaRoboczaGeneratora {
  if ('dokumentId' in rekord) return rekord
  return { ...rekord, dokumentId: rekord.id, zrodloOpublikowanegoId: rekord.id, dataZapisu: rekord.dataPublikacji, etykietaWersji: rekord.wersja }
}

export default function CelEtykietyPaczki({ dokument, paczkaId, cel, otworzDokument }: {
  dokument: DokumentChecklistyPaczki; paczkaId: string; cel: 's' | 'm'; otworzDokument: (dokument: Dokument<unknown, unknown>) => void
}) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [czyPakiet, ustawPakiet] = useState(false)
  const [, odswiez] = useState(0)
  const zrodlo = pobierzZrodloEtykiety(dokument.daneDokumentu)
  const grupa = zrodlo?.grupy.find((obecna) => obecna.id === dokument.daneDokumentu.grupaId)
  const paczka = dokument.daneDokumentu.paczki.find((obecna) => obecna.id === paczkaId)
  const rekord = zrodlo && repozytoriumWspolnychDokumentow.pobierzPoId(zrodlo.id)?.daneDokumentu as WersjaRoboczaGeneratora | OpublikowaneSzczegolyOrganizacyjne | undefined
  const powrot = window.location.pathname + window.location.hash
  if (!zrodlo || !grupa || !paczka || !rekord) return <section className="widok"><h1>Cel etykiety niedostępny</h1>
    <p role="alert">Nie znaleziono powiązanych Szczegółów organizacyjnych, grupy lub paczki w tym profilu przeglądarki.</p><a href={powrot}>Wróć do checklisty</a>
  </section>
  if (cel === 's') return <section className="widok"><h1>Szczegóły organizacyjne</h1>
    <PodgladSzczegolow rekord={rekord} grupaId={grupa.id} zamknij={() => window.location.assign(powrot)} />
  </section>
  const wysylka = zbudujWysylkiMonitora([zrodlo], [dokument], {}).find((obecna) => obecna.paczkaId === paczkaId)
  const dokumenty = wysylka ? pobierzDokumentyMonitora([wysylka]).get(wysylka.id) ?? [] : []
  const czyMoznaEksportowac = zalogowanyUzytkownik && czyMozeEksportowac(zalogowanyUzytkownik)
  return <section className="widok checklista-paczki">
    <h1>Materiały paczki</h1>
    <p>{rekord.dane.tytulSzkolenia} · {grupa.nazwa} · {paczka.nazwa}</p>
    <a href={powrot}>Wróć do checklisty</a>
    {wysylka && <DokumentyWysylki wysylka={wysylka} dokumenty={dokumenty} uzytkownikId={zalogowanyUzytkownik?.id ?? null}
      otworzDokument={otworzDokument} czyPonownyDruk />}
    {czyMoznaEksportowac ? <>
      <button type="button" onClick={() => ustawPakiet(true)} disabled={czyPakiet}>Przygotuj zestaw dokumentów</button>
      {czyPakiet && <Suspense fallback={<p role="status">Wczytywanie pakietu PDF…</p>}>
        <PanelPakietu wersja={{ ...przygotujWersjePakietu(rekord), autorId: zalogowanyUzytkownik.id }} grupaEtykietyId={grupa.id}
          otworzDokument={otworzDokument} zamknij={() => ustawPakiet(false)} poUtworzeniu={() => odswiez((wartosc) => wartosc + 1)} />
      </Suspense>}
    </> : <p>Przygotowanie pakietu i ponowny druk wymagają uprawnienia eksportu.</p>}
  </section>
}
