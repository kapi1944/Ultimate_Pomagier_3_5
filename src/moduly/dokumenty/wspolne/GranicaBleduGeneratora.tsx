import { Component, Fragment, type ReactNode } from 'react'

type Wlasciwosci = { children: ReactNode; nazwaGeneratora: string; wrocDoDokumentow: () => void }
type Stan = { czyBlad: boolean; proba: number }

export default class GranicaBleduGeneratora extends Component<Wlasciwosci, Stan> {
  state: Stan = { czyBlad: false, proba: 0 }

  static getDerivedStateFromError() { return { czyBlad: true } }

  render() {
    if (this.state.czyBlad) return <section className="widok" role="alert">
      <h1>{this.props.nazwaGeneratora}</h1>
      <p>Nie udało się otworzyć generatora. Zapisane dokumenty pozostają zachowane.</p>
      <button type="button" onClick={() => this.setState(({ proba }) => ({ czyBlad: false, proba: proba + 1 }))}>Ponów próbę</button>
      <button type="button" onClick={this.props.wrocDoDokumentow}>Wróć do Dokumentów</button>
    </section>
    return <Fragment key={this.state.proba}>{this.props.children}</Fragment>
  }
}
