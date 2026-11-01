const {chromium}=require('../repo/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const root=__dirname, out=path.join(root,'screenshots');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
 await context.addInitScript(()=>{const D=Date;window.__clock='2026-11-01T06:00:00Z';window.Date=class extends D{constructor(...a){super(...(a.length?a:[window.__clock]));}static now(){return new D(window.__clock).valueOf();}};});
 const page=await context.newPage(),errors=[],result={base:'https://benleungnz-eng.github.io/erin-math-lab/',clock:'synthetic dates 2026-11-01 through 2026-11-08 in isolated context',topics:[],events:[],errors};
 page.on('pageerror',e=>errors.push(e.message));
 const get=()=>page.evaluate(async()=>{const {db}=await import('./src/app.js');await db.serial.catch(()=>{});return db.state;});
 const save=async(name)=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
 const nav=async(v)=>{await page.locator(`[data-view="${v}"]`).tap();await get();};
 const cur=async(sub)=>{const d=await get();return d.academy.science.sessions[d.academy.science.active[sub]];};
 await page.goto(result.base);await page.waitForSelector('#start');await save('B01-home');
 await page.locator('#bounceHome').scrollIntoViewIfNeeded();
 const before=await page.evaluate(()=>({scroll:scrollY,stage:document.querySelector('#partnerStage').getBoundingClientRect().toJSON()}));
 await page.locator('#bounceHome').tap();await get();
 result.events.push({welcome:{before,after:await page.evaluate(()=>({scroll:scrollY,state:document.querySelector('#partnerStage').dataset.state,animation:getComputedStyle(document.querySelector('#partnerStage .partner-art')).animationName,stage:document.querySelector('#partnerStage').getBoundingClientRect().toJSON()}))}});
 await page.screenshot({path:path.join(out,'B05-welcome-button-viewport.png')});
 for(let day=0;day<7;day++){
  await page.evaluate(day=>window.__clock=`2026-11-${String(day+1).padStart(2,'0')}T06:00:00Z`,day);
  for(const sub of ['biology','geography']){
   await nav('home');await page.locator(sub==='biology'?'#startBiology':'#startGeography').tap();await page.waitForSelector('[data-science-choice]');await get();
   let s=await cur(sub);const q=s.questions[s.index];const topic={sub,day:day+1,topic:q.topic,visual:q.visual,regions:[],questions:[]};
   const ids=await page.locator('[data-region]').evaluateAll(bs=>bs.map(b=>b.dataset.region));
   for(const id of ids){
    const selector=`[data-region="${id}"]`;await page.locator(selector).tap();await get();
    topic.regions.push({id,caption:await page.locator('.diagram-caption').innerText(),highlight:await page.locator('.science-diagram svg g[stroke="#dd8a30"]').count(),svg:await page.locator('.science-diagram svg').innerHTML()});
    await save(`topic-${sub}-${day+1}-${id}`);
   }
   if(q.visual==='rotation'){
    const a=await page.locator('.science-diagram svg').innerHTML();await page.locator('#rotateEarth').tap();topic.rotationChanged=a!==await page.locator('.science-diagram svg').innerHTML();await save('earth-spin');await page.locator('#earthMode').tap();await save('earth-orbit');
   }
   // Check every question's help targets using user-visible controls.
   for(let stage=0;stage<2;stage++){
    if(stage){await page.locator('#scienceBonus').tap();await page.waitForSelector('[data-science-choice]');await get();}
    s=await cur(sub);
    while(!s.completed){
     const question=s.questions[s.index];
     await page.locator('#scienceHint1').tap();await get();
     await page.locator('#scienceHint2').tap();await get();
     const guide=await page.locator('.step').allTextContents();
     topic.questions.push({stage,index:s.index,prompt:question.prompt,hint:question.hint,guide});
     if(day===0&&sub==='biology'&&s.index===2&&stage===0)await save('B06-stimulus-guide-unrelated');
     await page.locator('[data-science-choice]').filter({hasText:question.answer}).tap();await get();
     await page.locator('#scienceSubmit').tap();await page.waitForSelector('#scienceNext:not([hidden])');await get();
     await page.locator('#scienceNext').tap();await get();s=await cur(sub);
    }
    await save(`summary-${sub}-${day+1}-${stage}`);
   }
   result.topics.push(topic);console.log('SURVEY',sub,day+1);
  }
 }
 await nav('collection');await page.locator('summary').tap();await save('B07-state-gallery');
 await nav('progress');await save('B08-progress-history');
 await nav('home');const d=await get();result.final={unlocked:d.academy.unlocked,stars:d.academy.stars,nextDay:d.academy.science.nextDay};
 fs.writeFileSync(path.join(root,'survey-results.json'),JSON.stringify(result,null,2));
 await page.evaluate(()=>window.__clock='2026-11-08T06:00:00Z');await nav('home');await page.locator('#startBiology').tap();await get();await save('week-exhausted');
 await nav('reports');await page.locator('#studentReport').tap();await page.locator('summary').tap();await save('report-preview');
 const dl=page.waitForEvent('download');await page.locator('#downloadReport').tap();const download=await dl;await download.saveAs(path.join(root,'synthetic-report.json'));await page.locator('#closeDialog').tap();
 await page.locator('#importReport').setInputFiles(path.join(root,'synthetic-report.json'));await page.waitForFunction(()=>document.querySelector('#parentStatus').textContent.includes('已导入'));await page.locator('#reportSubject').selectOption('biology');await save('report-biology');
 await page.locator('#importReport').setInputFiles(path.join(root,'synthetic-report.json'));await page.waitForFunction(()=>document.querySelector('#parentStatus').textContent.includes('已导入'));result.events.push({reportDedupMetrics:await page.locator('.report-metrics').innerText()});
 await page.locator('#reportSubject').selectOption('geography');await save('report-geography');
 await context.setOffline(true);await page.reload();await nav('home');result.events.push({offline:await page.locator('#offline').innerText(),restoredUnlocked:(await get()).academy.unlocked.length});await save('offline-restored');
 fs.writeFileSync(path.join(root,'survey-results.json'),JSON.stringify(result,null,2));await context.close();await browser.close();console.log('DONE',result.final,errors);
})().catch(e=>{console.error(e);process.exitCode=1;});
