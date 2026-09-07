import {chromium} from 'file:///C:/Users/Kacper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const przegladarka=await chromium.launch({channel:'msedge',headless:true})
const strona=await przegladarka.newPage({viewport:{width:1100,height:1200}})
strona.on('pageerror',e=>console.log('BLAD',e.message))
for(const [nazwa,query] of [['oryginalna',''],['nowoczesna','?nowa=1'],['dluga','?nowa=1&dluga=1'],['lista','?lista=1']]){
 await strona.goto('http://127.0.0.1:5173/tmp/proba-generatorow.html'+query);await strona.waitForSelector('[data-strona-dokumentu]');await strona.waitForTimeout(500)
 console.log(nazwa,await strona.locator('[data-strona-dokumentu]').evaluateAll(es=>es.map(e=>({h:e.clientHeight,scroll:e.scrollHeight,bottom:Math.max(...[...e.querySelectorAll('main,table')].map(x=>x.getBoundingClientRect().bottom-e.getBoundingClientRect().top))}))))
 await strona.screenshot({path:'tmp/pdfs/test-'+nazwa+'.png',fullPage:true})
}
await przegladarka.close()

