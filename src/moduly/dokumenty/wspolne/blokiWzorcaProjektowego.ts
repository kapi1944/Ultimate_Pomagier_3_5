import type { BlokSwobodnyDokumentu } from '../../../wspolne/dokumenty/modelSwobodnychBlokow'

export function utworzBlokiWzorcaProjektowego(typ: 'Ankieta' | 'Lista obecności'): BlokSwobodnyDokumentu[] {
  return [
    { id: 'projekt-oznaczenia', nazwa: 'Oznaczenia projektu ze wzorca', xMm: typ === 'Ankieta' ? 45 : 57, yMm: typ === 'Ankieta' ? 3 : 14, szerokoscMm: typ === 'Ankieta' ? 121 : 145, wysokoscMm: 14, adres: '/wzorce-generatorow/oznaczenia-projektu.png' },
    { id: 'projekt-stopka', nazwa: 'Stopka projektu ze wzorca', xMm: 17, yMm: typ === 'Ankieta' ? 246 : 270, szerokoscMm: 184, wysokoscMm: 24, adres: '/wzorce-generatorow/stopka-projektu.png' },
  ].map(({ adres, ...blok }) => ({ ...blok, typ: 'obraz', rola: 'element_staly_szablonu', pochodzenie: 'szablon', zablokowany: true, widoczny: true, indeksWarstwy: 10, przypisanieDoStrony: { rodzaj: 'kazda' }, dane: { zrodlo: { rodzaj: 'adres', adres }, tekstAlternatywny: blok.nazwa, zachowajProporcje: true, trybDopasowania: 'contain' } }))
}
