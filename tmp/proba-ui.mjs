import {chromium} from 'file:///C:/Users/Kacper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const przegladarka=await chromium.launch({channel:'msedge',headless:true});const strona=await przegladarka.newPage({viewport:{width:1440,height:1000}})
await strona.goto('http://127.0.0.1:5173/dokumenty/ankiety');await strona.waitForTimeout(600);console.log((await strona.locator('body').innerText()).slice(0,6000));await przegladarka.close()
