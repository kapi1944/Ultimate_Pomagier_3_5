import { useState } from 'react'
import { AkcjeRekordu } from '../../../../wspolne/komponenty/AkcjeRekordu'
import { duplikujIstniejacaChecklistePaczki, pobierzChecklistyPaczek, usunChecklistePaczki } from './rejestrChecklistPaczek'

function otworzCheckliste(id: string) {
  window.history.pushState({}, '', `/dokumenty/checklisty-paczek/${encodeURIComponent(id)}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function WidokKopiiRoboczychChecklistPaczek() {
  const [, ustawOdswiezacz] = useState(0)
  const [podgladId, ustawPodgladId] = useState<string | null>(null)
  const kopie = pobierzChecklistyPaczek().filter((checklista) => checklista.daneDokumentu.statusChecklisty === 'KOPIA_ROBOCZA')
  const odswiez = () => ustawOdswiezacz((obecny) => obecny + 1)

  return <section className="widok checklista-paczki checklista-paczki--start">
    <header><h1>Kopie robocze Checklist paczek</h1></header>
    <section className="checklista-paczki__karta">
      {!kopie.length && <p>Brak kopii roboczych checklist.</p>}
      <div className="checklista-paczki__lista">
        {kopie.map((checklista) => {
          const migawka = checklista.daneDokumentu.migawkaZrodla
          return <article key={checklista.id}>
            <div><strong>{checklista.daneDokumentu.identyfikator}</strong><span>{migawka?.tytulSzkolenia || 'Brak szkolenia'} - {migawka?.nazwaGrupy || 'Brak grupy'}</span></div>
            <AkcjeRekordu podglad={() => ustawPodgladId(checklista.id)} edytuj={() => otworzCheckliste(checklista.id)} duplikuj={() => { if (duplikujIstniejacaChecklistePaczki(checklista.id, null)) odswiez() }} usun={() => { if (window.confirm('Usunac kopie robocza checklisty?') && usunChecklistePaczki(checklista.id)) odswiez() }} />
            {podgladId === checklista.id && <p className="checklista-paczki__opis-pomocniczy">Podglad: {migawka?.tytulSzkolenia || 'Brak szkolenia'} - {migawka?.nazwaGrupy || 'Brak grupy'}</p>}
          </article>
        })}
      </div>
    </section>
  </section>
}
