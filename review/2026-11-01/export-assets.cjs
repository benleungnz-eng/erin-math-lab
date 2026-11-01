// Deterministic atlas extraction only: no drawing or AI substitutes.
const sharp=require('./tooling/node_modules/sharp');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
const root=path.join(__dirname,'resources'), assets=JSON.parse(await fs.readFile(path.join(root,'generation-prompts.json'),'utf8'));
const states=['idle_default','greet','thinking','hint_light','hint_step','correct_small','correct_big','wrong_soft','wrong_retry','complete'];
const manifest={version:1,generatedBy:'built-in image_gen',type:'10 distinct still poses per partner; not frame-by-frame animation',states,partners:[],eventMap:{greet:'greet',thinking:'thinking',hint_light:'hint_light',hint_step:'hint_step',correct:'correct_small',excellent:'correct_big',wrong:'wrong_soft',retry:'wrong_retry',complete:'complete',unlock:'complete',bonus:'correct_big',solution:'hint_step',end:'idle_default',streak3:'correct_big',streak5:'complete'},limitations:['15 application states map onto 10 unique visual poses; unlock, bonus, full-solution, streak3, streak5 do not have separate dedicated art.','Some source atlas extremities touch outer image edges. Inspect in preview before accepting for production.','Newly generated interpretations; prior approved source image files were not available.']};
const thumbs=[];
for(let row=0;row<assets.length;row++){
 const a=assets[row], source=path.join(root,a.id+'-atlas.png'),meta=await sharp(source).metadata();
 const partner={id:a.id,name:a.name,atlas:a.id+'-atlas.png',sourceSize:[meta.width,meta.height],alpha:meta.hasAlpha,poses:{}};
 await fs.mkdir(path.join(root,a.id),{recursive:true});
 for(let i=0;i<10;i++){
  const col=i%5,r=Math.floor(i/5),left=Math.round(col*meta.width/5),top=Math.round(r*meta.height/2),width=Math.round((col+1)*meta.width/5)-left,height=Math.round((r+1)*meta.height/2)-top;
  const filename=a.id+'/'+states[i]+'.png';
  await sharp(source).extract({left,top,width,height}).resize(384,384,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).png().toFile(path.join(root,filename));
  const stats=await sharp(path.join(root,filename)).stats();
  partner.poses[states[i]]={file:filename,width:416,height:416,rect:[left,top,width,height],alphaMin:stats.channels[3]?.min,alphaMax:stats.channels[3]?.max};
 }
 manifest.partners.push(partner);
 const thumb=await sharp(source).resize(800,320,{fit:'contain',background:'#f1eee7'}).flatten({background:'#f1eee7'}).png().toBuffer();
 thumbs.push({input:thumb,left:0,top:row*350+30});
 const label=Buffer.from(`<svg width="800" height="30"><rect width="800" height="30" fill="#202b38"/><text x="12" y="23" fill="white" font-size="20">${a.id} — 10 poses</text></svg>`);thumbs.push({input:label,left:0,top:row*350});
}
await sharp({create:{width:800,height:assets.length*350,channels:4,background:'#f1eee7'}}).composite(thumbs).png().toFile(path.join(root,'all-partners-preview.png'));
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(root,'preview.html'),`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Erin 搭档资源验收预览</title><style>body{background:#eee9e1;color:#223;font:18px system-ui;max-width:1000px;margin:auto;padding:24px}button,select{font:inherit;padding:12px;margin:4px}img{width:min(80vw,416px);height:auto;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 50%/30px 30px;display:block;margin:20px auto}.grid{display:flex;flex-wrap:wrap}button[aria-pressed=true]{background:#8dd5b6}</style><h1>12位搭档 · 每位10种真实姿势</h1><p>独立资源预览，不连接学习存档。静态立绘按事件切换；不是十段逐帧动画。</p><select id="partner">${assets.map(a=>`<option value="${a.id}">${a.name} (${a.id})</option>`).join('')}</select><div class="grid">${states.map(s=>`<button data-state="${s}">${s}</button>`).join('')}</div><img id="art" alt="搭档动作预览"><p id="caption"></p><script>let state='idle_default';function render(){art.src=partner.value+'/'+state+'.png';caption.textContent=partner.options[partner.selectedIndex].text+' / '+state;document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.state===state))}partner.onchange=render;document.querySelectorAll('button').forEach(b=>b.onclick=()=>{state=b.dataset.state;render()});render();</script></html>`);
console.log(JSON.stringify({partners:manifest.partners.length,poses:manifest.partners.reduce((n,p)=>n+Object.keys(p.poses).length,0),alpha:manifest.partners.every(p=>p.alpha)},null,2));
})();
