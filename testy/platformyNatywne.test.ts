import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks'
import { czyLogowanieDesktopowe, czyLogowanieNatywne, otworzObszarKonta, wrocDoLogowaniaDesktopowego, przygotujDaneDesktop, przeniesDaneDoKonta } from '../src/aplikacja/logowanie/daneDesktop'
import { odswiezPotwierdzonaSesje, zakonczPotwierdzonaSesje, wyczyscPotwierdzonaSesje } from '../src/aplikacja/logowanie/klientTozsamosci'
import { pobierzProjekcjeKont } from '../src/aplikacja/logowanie/projekcjaKont'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow'

test('Android zachowuje natywne logowanie i nie wywołuje profili ani migracji Windows', async () => {
  const poprzednieOkno = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const poprzedniAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis })
  Object.defineProperty(globalThis, 'isTauri', { configurable: true, value: true, writable: true })
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 15)' })
  const operacje: string[] = []
  mockWindows('main')
  mockIPC((polecenie) => { operacje.push(polecenie) })
  try {
    assert.equal(czyLogowanieNatywne(), true)
    assert.equal(czyLogowanieDesktopowe(), false)
    assert.equal(await otworzObszarKonta(), false)
    await wrocDoLogowaniaDesktopowego()
    await przygotujDaneDesktop()
    await assert.rejects(przeniesDaneDoKonta({}), /konta Windows/)
    assert.deepEqual(operacje, [])
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    assert.equal(czyLogowanieDesktopowe(), true)
    assert.equal(await otworzObszarKonta(), true)
    assert.deepEqual(operacje, ['otworz_obszar_konta'])

    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 15)' })
    const konto = { ...daneStartoweUzytkownikow[0], id: 'konto-testowe-android', login: 'osoba-testowa', imie: 'Osoba', nazwisko: 'Testowa', rola: 'PRACOWNIK' as const }
    operacje.length = 0
    mockIPC((polecenie, argumenty) => {
      assert.equal(polecenie, 'operacja_konta')
      const operacja = argumenty?.operacja
      assert.equal(typeof operacja, 'string')
      operacje.push(String(operacja))
      if (operacja === 'sesja') return konto
      if (operacja === 'katalog') return [konto]
      if (operacja === 'wyloguj') return null
      throw new Error('Nieoczekiwana operacja konta Android.')
    })
    assert.deepEqual(await odswiezPotwierdzonaSesje(), konto)
    assert.deepEqual(pobierzProjekcjeKont(), { konta: [konto], historia: [], tozsamosc: konto })
    await zakonczPotwierdzonaSesje()
    assert.deepEqual(pobierzProjekcjeKont(), { konta: [], historia: [], tozsamosc: null })
    assert.deepEqual(operacje, ['sesja', 'katalog', 'wyloguj'])
  } finally {
    wyczyscPotwierdzonaSesje()
    clearMocks()
    Reflect.deleteProperty(globalThis, 'isTauri')
    if (poprzednieOkno) Object.defineProperty(globalThis, 'window', poprzednieOkno)
    else Reflect.deleteProperty(globalThis, 'window')
    if (poprzedniAgent) Object.defineProperty(navigator, 'userAgent', poprzedniAgent)
    else Reflect.deleteProperty(navigator, 'userAgent')
  }
})
