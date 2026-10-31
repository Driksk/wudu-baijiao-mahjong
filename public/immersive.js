import {MahjongScene} from './tabletop.js';
import {riverDetail,riverSummary} from './river-view.js';
let riverOpen=false;
const app=document.querySelector('#app');
const phrases=['快点撒 散面饭都干了哎','着一着 我在思考噶','个nia nia 这牌谁都不了 走','咋们的 牌难得很吗 思考着'];
let scene=null,lastEmote=null,captionTimer,voice=true,trackerOpen=false;
const characters=[{id:'yan',name:'阿彦',note:'沉稳 · 男'},{id:'ning',name:'阿宁',note:'温柔 · 女'},{id:'yue',name:'阿玥',note:'利落 · 女'}];
let character='yan';try{character=localStorage.getItem('wd-character')||'yan'}catch{}
window.wuduCharacter=()=>characters.some(c=>c.id===character)?character:'yan';
window.chooseCharacter=id=>{if(!characters.some(c=>c.id===id))return;character=id;try{localStorage.setItem('wd-character',id)}catch{}document.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===id)));};
function characterPicker(){if(app.querySelector('.character-picker'))return;const target=app.querySelector('#nickname')?.closest('.card')||app.querySelector('.hero');if(!target)return;const box=document.createElement('section');box.className='character-picker';box.innerHTML='<div class="character-heading">选择人物 <small>一男两女 · 自由切换</small></div><div class="character-options">'+characters.map((c,i)=>`<button type="button" data-character="${c.id}" aria-pressed="${character===c.id}" onclick="chooseCharacter('${c.id}')"><i class="portrait portrait-${i}"></i><span><b>${c.name}</b><small>${c.note}</small></span><em>✓</em></button>`).join('')+'</div>';target.after(box);}
try{voice=localStorage.getItem('wd-voice')!=='0'}catch{}
document.querySelector('header').innerHTML='<h1>武都摆叫</h1><div>白龙江畔 · 一桌乡情</div>';
const homeBefore=home;
home=function(){homeBefore();const hero=app.querySelector('.hero');
 if(hero)hero.innerHTML=`<div><span class="eyebrow">陇南 · 西关</span><h2>武都摆叫</h2><p>一桌好牌，几个老友。</p><div class="hero-actions"><button onclick="go('play')">入座 · 开一局</button><button class="secondary" onclick="friends()">邀朋友同桌</button></div></div><span class="hero-caption">武都 · 西关城楼</span>`;
 if(hero)hero.insertAdjacentHTML('afterend','<div class="hall-strip"><strong>壹番起摆 · 叫口不换 · 闲时品茶</strong><span>按你确认的桌规 · 纯练习积分</span></div>');
 const grid=app.querySelector('.mode-grid');if(grid)grid.insertAdjacentHTML('beforebegin','<div class="hall-title"><h3>今日，怎么摆？</h3><small>选一张桌，慢慢练</small></div>');
 const modeCards=app.querySelectorAll('.mode-card');if(modeCards[1])modeCards[1].innerHTML='<em>02 / 白龙江畔茶室</em><b>单人实战</b><p>三维牌桌，粉玉刻纹麻将。<br>与三位电脑练摸打、碰杠和查叫。</p>';
 const draft=app.querySelector('.draft');if(draft)draft.remove();
 app.insertAdjacentHTML('beforeend',`<div class="hall-bottom"><p><b>武都的味道，留在桌边。</b><br>山谷、江水、木窗和一盏热茶。可换桌布与牌面，桌边动作可关闭。${location.hostname==='127.0.0.1'||/^192\.168\./.test(location.hostname)?'<br><a href="/connect">查看手机连接地址</a>':''}</p><a href="/credits.html" target="_blank" rel="noopener">素材鸣谢</a></div>`);
};
function say(text){const el=app.querySelector('.scene-caption');if(el){el.textContent=text;el.classList.add('visible');clearTimeout(captionTimer);captionTimer=setTimeout(()=>el.classList.remove('visible'),4200)}}
function trackerHTML(g){const counts=Array.from({length:27},()=>0);for(const r of g.river||[]){if(Number.isInteger(r.t)&&r.t>=0&&r.t<27)counts[r.t]++}const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const chips=counts.map((count,t)=>`<span class="tracker-chip ${count?'seen':''}"><b>${safe(name(t))}</b><em>${count||'·'}</em></span>`).join('');return `<div class="tracker-head"><b>记牌器</b><span>已出 ${counts.reduce((a,b)=>a+b,0)} 张</span></div><div class="tracker-grid">${chips}</div><small>只统计牌河已亮出的牌，手牌与暗牌不会泄露。</small>`}
let audioDb;
async function recordings(){if(audioDb)return audioDb;return audioDb=await new Promise((resolve,reject)=>{const r=indexedDB.open('wudu-dialect',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function speak(id){if(!voice)return;try{const db=await recordings();const blob=await new Promise((resolve,reject)=>{const r=db.transaction('clips').objectStore('clips').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(blob){const url=URL.createObjectURL(blob),audio=new Audio(url);audio.onended=()=>URL.revokeObjectURL(url);audio.onerror=()=>URL.revokeObjectURL(url);await audio.play();return}}catch{}
 if('speechSynthesis' in window){speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(phrases[id]);s.lang='zh-CN';s.rate=.9;s.volume=.8;speechSynthesis.speak(s)}
}
window.wuduTalk=id=>window.roomEmote('talk'+id);
function mount(){
 characterPicker();
 const shell=app.querySelector('.table-shell'),live=!!app.querySelector('.room-top');
 document.body.classList.toggle('in-match',!!shell&&live&&window.wuduGame?.phase!=='lobby');
 if(!shell||!live||!window.wuduGame||window.wuduGame.phase==='lobby'){scene?.pause();return}
 if(!shell.classList.contains('scene-3d')){
  shell.classList.add('scene-3d');if(localStorage.getItem('wd-hand-zoom')==='1')shell.classList.add('zoom-hand');
  const wrap=document.createElement('div');wrap.className='scene-viewport';
  wrap.innerHTML=`<div class="scene-toolbar"><div><span class="scene-view-chip">武都摆叫 <small>· 实战桌</small></span></div><div><button data-action="zoom">放大牌面</button><button data-action="tracker">记牌器</button><button data-action="voice">${voice?'声音开':'声音关'}</button></div></div><div class="scene-seats"></div><aside class="scene-tracker ${trackerOpen?'':'is-collapsed'}" aria-label="牌河记牌器"></aside><div class="scene-caption" role="status"></div><span class="scene-hint">单击选牌 · 双击出牌</span><button class="last-discard" data-action="river" aria-label="查看四家牌河"></button><div class="river-detail" hidden></div><div class="scene-social"><button data-emote="tea">喝茶</button><button data-emote="smoke">抽烟</button><button data-action="talk">方言</button></div><div class="voice-panel" hidden><b>说两句家乡话</b>${phrases.map((p,i)=>`<button onclick="wuduTalk(${i})">${p}</button>`).join('')}<p>文案按你提供的武都口语录入。默认使用系统普通话朗读；上传自己的录音后，本机优先播放录音。</p><label>替换第1句为你的方言录音<input type="file" accept="audio/*" id="dialect-audio"></label><p>录音只保存在本浏览器；同桌玩家各自使用本机语音。</p></div>`;
  shell.prepend(wrap);
  try{if(!scene)scene=new MahjongScene();scene.attach(wrap)}catch(e){console.error(e);wrap.insertAdjacentHTML('beforeend','<p class="scene-error">此浏览器无法开启三维画面。下方手牌与对局操作仍可使用，请用支持 WebGL 的浏览器。</p>')}
  app.querySelector('#dialect-audio')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){say('录音请小于5MB');return}try{const db=await recordings();await new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put(file,0);tx.oncomplete=resolve;tx.onerror=reject});say('方言录音已保存，点击第一句话试听')}catch{say('无法保存录音，请检查浏览器存储权限')}});
 }
 const g=window.wuduGame;scene?.update(g);const tracker=app.querySelector('.scene-tracker');if(tracker)tracker.innerHTML=trackerHTML(g);
 const last=app.querySelector('.last-discard'),drawer=app.querySelector('.river-detail');last.innerHTML=riverSummary(g);drawer.hidden=!riverOpen;if(riverOpen)drawer.innerHTML=riverDetail(g);
 const seats=app.querySelector('.scene-seats');if(seats){seats.replaceChildren();[3,2,1].forEach(offset=>{const p=g.p[(g.me+offset)%4],s=document.createElement('span'),pic=document.createElement('i'),info=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');const idx=Math.max(0,characters.findIndex(c=>c.id===p.character));pic.className='portrait portrait-'+idx;s.className='seat-'+offset+(g.turn===(g.me+offset)%4?' is-turn':'');info.append(document.createTextNode(p.name+' · '+p.score+'分'),b,small);s.append(pic,info);b.textContent=p.done?'已胡':p.called?'叫 '+p.waits.map(name).join('、'):'未摆叫';small.textContent=g.turn===(g.me+offset)%4?'● 出牌中':'';seats.append(s)})}
 if(g.emote&&g.emote.id!==lastEmote){lastEmote=g.emote.id;if(Date.now()-g.emote.at<7000){const index=(g.emote.seat-g.me+4)%4,kind=g.emote.kind;scene?.emote(kind,index);if(kind.startsWith('talk')){const id=Number(kind.slice(4));say(g.p[g.emote.seat].name+'：'+phrases[id]);speak(id)}else say(g.p[g.emote.seat].name+(kind==='tea'?'端起茶碗，歇一口气。':'点了支烟，慢慢看牌。'))}}
}
app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.action==='river'||b.dataset.action==='river-close'){riverOpen=b.dataset.action==='river';const drawer=app.querySelector('.river-detail');drawer.hidden=!riverOpen;if(riverOpen)drawer.innerHTML=riverDetail(window.wuduGame)}
 if(b.dataset.view)scene?.setView(b.dataset.view);
 if(b.dataset.emote)window.roomEmote(b.dataset.emote);
 if(b.dataset.action==='zoom'){const shell=app.querySelector('.scene-3d');shell.classList.toggle('zoom-hand');localStorage.setItem('wd-hand-zoom',shell.classList.contains('zoom-hand')?'1':'0');scene?.setView('close')}
 if(b.dataset.action==='tracker'){const panel=app.querySelector('.scene-tracker');trackerOpen=!trackerOpen;panel?.classList.toggle('is-collapsed',!trackerOpen);say(panel?.classList.contains('is-collapsed')?'记牌器已收起':'记牌器已展开')}
 if(b.dataset.action==='motion'){scene?.toggleMotion();say(scene?.motion?'桌边动作已开启':'桌边动作已关闭')}
 if(b.dataset.action==='voice'){voice=!voice;localStorage.setItem('wd-voice',voice?'1':'0');b.textContent=voice?'声音开':'声音关';if(!voice&&'speechSynthesis'in window)speechSynthesis.cancel()}
 if(b.dataset.action==='talk'){const panel=app.querySelector('.voice-panel');panel.hidden=!panel.hidden}
});
const realAction=window.roomAct;window.roomAct=(type,t)=>{if(type==='discard')scene?.emote('discard',0,t);return realAction(type,t)};
let scheduled=false;new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('.scene-viewport')))return;if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount()})}).observe(app,{childList:true,subtree:true});
window.addEventListener('wudu-skin',()=>scene?.reskin());
if(!new URLSearchParams(location.search).has('room'))home();mount();

