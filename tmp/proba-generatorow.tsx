import React from 'react'
import { createRoot } from 'react-dom/client'
import RendererAnkiety from '../src/moduly/dokumenty/generatory/ankiety/RendererAnkiety'
import RendererListy from '../src/moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci'
import {utworzDomyslneDaneAnkiety} from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety'
import {utworzDomyslneDaneListyObecnosci} from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci'
import '../src/moduly/dokumenty/generatory/ankiety/widokAnkiet.css'
import '../src/moduly/dokumenty/generatory/listy_obecnosci/widokListObecnosci.css'
const parametry=new URLSearchParams(location.search)
const ankieta={...utworzDomyslneDaneAnkiety(parametry.get('nowa')?'NOWOCZESNA_SEMPER':undefined),tytulSzkolenia:'Szkolenie testowe',trener:'Anna Nowak'}
if(parametry.has('dluga')) {ankieta.preset='WLASNA'; ankieta.sekcje=[{id:'test',nazwa:'Test pytań',widoczna:true,pytania:Array.from({length:12},(_,i)=>({id:String(i),typ:i%2?'OTWARTE':'SKALA',tekst:'Długie pytanie o jakość szkolenia i doświadczenia uczestnika. '.repeat(8),skala:{liczbaStopni:10,etykiety:Array.from({length:10},(_,j)=>String(j+1))}}))}]}
const lista={...utworzDomyslneDaneListyObecnosci(),tytulSzkolenia:'Szkolenie testowe',uczestnicy:Array.from({length:57},(_,i)=>({id:'uuid-'+i,imieINazwisko:'Uczestnik '+i})),daty:['2026-09-07','2026-09-08','2026-09-09']}
createRoot(document.getElementById('root')!).render(<div style={{width:794}}>{parametry.has('lista')?<RendererListy dane={lista}/>:<RendererAnkiety dane={ankieta}/>}</div>)
