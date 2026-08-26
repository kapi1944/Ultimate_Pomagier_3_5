import type { Dokument, TypDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'


const otworzGeneratorDokumentu = (nazwy: readonly string[]) => {
  const normalizuj = (wartosc: string) =>
    wartosc
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("pl");

  const oczekiwane = nazwy.map(normalizuj);
  const elementy = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a, button, [role="button"], [data-nav], [data-view], [data-route]'
    ),
  );

  const trafienie = elementy.find((element) => {
    const tekst = normalizuj(element.textContent ?? "");
    return oczekiwane.some(
      (nazwa) => tekst === nazwa || tekst.includes(nazwa),
    );
  });

  if (trafienie) {
    trafienie.click();
    return;
  }

  console.error(
    "Nie znaleziono istniejącej pozycji nawigacji generatora:",
    nazwy,
  );
};

const szybkieDokumenty = [
  {
    etykieta: "Nowy program",
    nazwyNawigacji: ["Programy szkoleń", "Program szkolenia", "Programy"],
  },
  {
    etykieta: "Nowa lista obecności",
    nazwyNawigacji: ["Listy obecności", "Lista obecności"],
  },
  {
    etykieta: "Nowa ankieta",
    nazwyNawigacji: ["Ankiety", "Ankieta"],
  },
  {
    etykieta: "Nowy dyplom",
    nazwyNawigacji: ["Dyplomy", "Dyplom"],
  },
  {
    etykieta: "Karta na drzwi",
    nazwyNawigacji: ["Karty na drzwi", "Karta na drzwi", "Karta informacyjna"],
  },
  {
    etykieta: "Nowa checklista wysyłki paczek",
    nazwyNawigacji: [
      "Checklisty wysyłki paczek",
      "Checklista wysyłki paczek",
      "Checklista wysyłki",
    ],
  },
] as const;


type WlasciwosciWidokuWszystkichDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
  typyStale?: TypDokumentu[]
  tytul?: string
  opis?: string
  czyKosz?: boolean
}

export default function WidokWszystkichDokumentow({
  otworzDokument,
  typyStale,
  tytul = 'Wszystkie dokumenty',
  opis = 'Wspólny rejestr dokumentów zapisanych przez generatory.',


      <div
        className="dokumenty-szybkie-akcje"
        aria-label="Utwórz nowy dokument"
      >
        {szybkieDokumenty.map((dokument) => (
          <button
            key={dokument.etykieta}
            type="button"
            className="dokumenty-szybka-akcja"
            onClick={() => otworzGeneratorDokumentu(dokument.nazwyNawigacji)}
          >
            <span className="dokumenty-szybka-akcja-plus" aria-hidden="true">
              +
            </span>
            <span className="dokumenty-szybka-akcja-etykieta">
              {dokument.etykieta}
            </span>
          </button>
        ))}
      </div>
  czyKosz = false,
}: WlasciwosciWidokuWszystkichDokumentow) {
  return <ListaDokumentow czyKosz={czyKosz} filtrPoczatkowy={{ czyUsunietyMiekko: czyKosz }} opis={opis} otworzDokument={otworzDokument} tytul={tytul} typyStale={typyStale} />
}
