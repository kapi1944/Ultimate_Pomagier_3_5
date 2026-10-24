import { register } from 'node:module'
import { pobierzInformacjeOWersji } from '../skrypty/informacjeOWersji.mjs'
import { pathToFileURL } from 'node:url'

globalThis.__INFORMACJE_O_WERSJI__ = pobierzInformacjeOWersji()

register('./loaderTs.mjs', pathToFileURL('./testy/'))
