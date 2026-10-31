import {defaults as baseRules,waits as ruleWaits,score as ruleScore,available as ruleActions,player as rulePlayer,gangAllowed} from './mahjong.mjs';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let online=null,credential=null,pollTimer=null,busy=false,chosenTile=null,connectionMessage='',polling=false;
let roomRules={...baseRules};
try{roomRules={...roomRules,...JSON.parse(localStorage.getItem('wd-rules')||'{}')}}catch{}
const fanFields={minFan:'起摆/起胡番',base:'每番分值',long:'长叫',edge:'边张/卡张/对倒',single:'单钓',triplet:'大对子',tripletSingle:'大对子单钓',pure:'清一色加番',seven:'七对',dragon:'龙七对',gang:'每个杠加番',cap:'封顶番',seconds:'每步秒数'};
function saveCredential(){try{localStorage.setItem('wd-current-room',JSON.stringify(credential));localStorage.setItem('wd-room-'+credential.code,JSON.stringify(credential))}catch{}}
function authHeaders(){return credential?{Authorization:'Bearer '+credential.token}:{}}
async function request(body){
 const res=await fetch('/api/room',{method:'POST',headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Error(data.error||'服务器暂时不可用');return data;
}
function stopPolling(){clearTimeout(pollTimer);pollTimer=null}
function schedule(){stopPolling();pollTimer=setTimeout(refresh,1500)}
async function refresh(){
 if(!credential||screen!=='online')return;
 if(busy||polling){schedule();return}polling=true;
 try{let res=await fetch('/api/room?code='+credential.code,{headers:authHeaders(),cache:'no-store'}),data=await res.json();
  if(!res.ok)throw Error(data.error||'同步失败');
  connectionMessage='';if(!online||online.version!==data.version){online=data;chosenTile=null;onlineTable()}
  else updateConnection();
 }catch(e){connectionMessage='连接暂时中断，正在重连：'+e.message;updateConnection()}
 finally{polling=false;schedule()}
}
function updateConnection(){let el=document.querySelector('#connection');if(el)el.textContent=connectionMessage||'房间已同步 · '+online.code}
function enter(data){online=data;if(data.token){credential={code:data.code,token:data.token};saveCredential()}screen='online';chosenTile=null;onlineTable();schedule()}
async function perform(op,extra={}){
 if(busy)return;busy=true;
 try{let data=await request({op,code:credential.code,version:online.version,...extra});online=data;chosenTile=null;connectionMessage='';onlineTable()}
 catch(e){connectionMessage=e.message;updateConnection()}
 finally{busy=false;schedule()}
}
window.roomAct=(type,tile)=>perform('action',{action:{type,tile}});
window.roomOp=op=>perform(op);
window.roomEmote=kind=>perform('emote',{kind});
let lastTap=null;
window.selectOnlineTile=(t,index)=>{
 if(busy||!online?.game.available.discard?.includes(t))return;
 const now=performance.now(),key=String(index??t);
 if(lastTap&&lastTap.key===key&&lastTap.t===t&&lastTap.version===online.version&&now-lastTap.at<420){lastTap=null;window.roomAct('discard',t);return}
 lastTap={key,t,at:now,version:online.version};chosenTile=t;
 document.querySelectorAll('.player-zone>.tiles>.tile').forEach((el,i)=>el.classList.toggle('sel',index===undefined?el.getAttribute('aria-label')===name(t):i===index));
 const b=Array.from(document.querySelectorAll('.player-zone .actions button')).find(el=>(el.getAttribute('onclick')||'').startsWith("roomAct('discard'"));if(b){b.disabled=false;b.textContent='打出 '+name(t);b.setAttribute('onclick',"roomAct('discard',"+t+")")}
};
window.copyInvite=async()=>{const url=location.origin+'/game.html?room='+credential.code;try{await navigator.clipboard.writeText(url);document.querySelector('#invite-result').textContent='邀请链接已复制，发给朋友即可。'}catch{document.querySelector('#invite-result').textContent=url}};
window.shareInvite=async()=>{const url=location.origin+'/game.html?room='+credential.code;if(navigator.share){try{await navigator.share({title:'来一起玩武都摆叫',text:'房间码 '+credential.code,url})}catch{}}else window.copyInvite()};
window.resumeRoom=async()=>{try{credential=JSON.parse(localStorage.getItem('wd-current-room'));if(!credential)throw Error('没有可恢复的房间');screen='online';await refresh()}catch(e){alert(e.message)}};
const originalGo=go;
go=function(s){stopPolling();if(s==='play')return roomForm(true);if(s==='rules')return onlineRules();originalGo(s)};
friends=function(){roomForm(false)};
const previousHome=home;
home=function(){previousHome();document.querySelectorAll('.mode-card').forEach((el,i)=>{if(i===1)el.innerHTML='<em>02 / 服务端裁判</em><b>单人实战</b><p>与三位电脑对局，碰、明杠、补杠、<br>摆叫、查叫与按牌型计分。</p>';if(i===2)el.innerHTML='<em>03 / 好友同桌</em><b>好友房间</b><p>创建房间，发链接邀请朋友。<br>支持断线返回与电脑补位。</p>'});const draft=document.querySelector('.draft');if(draft)draft.innerHTML='已采用你确认的桌规；默认番值可调整。补杠抢胡及被关细节见“桌规”。';try{if(localStorage.getItem('wd-current-room'))document.querySelector('#app').insertAdjacentHTML('beforeend','<p><button onclick="resumeRoom()">返回上次房间</button></p>')}catch{}};
function roomForm(practice){
 screen='friends';nav();const invited=new URLSearchParams(location.search).get('room')||'';
 document.querySelector('#app').innerHTML=`<div class="card"><span class="small-label">武都摆叫 · ${practice?'单人实战':'好友房间'}</span><h2>${practice?'与三位电脑开一桌':'和朋友坐到同一桌'}</h2><label>本桌局数 <input id="round-count" type="number" min="1" max="32" step="1" value="4" style="width:5em"></label>　<label>你的昵称 <input id="nickname" maxlength="12" value="玩家" autocomplete="nickname"></label>${practice?'':`<div class="row" style="margin:15px 0"><input id="room-code" aria-label="房间码" maxlength="8" placeholder="输入8位房间码" value="${escapeHTML(invited.toUpperCase())}"><button onclick="joinRoom()">加入房间</button></div>`}<details ${practice?'':'open'}><summary>开房番数与节奏（房主设置，开局锁定）</summary><p class="muted">分数＝番数×每番分值，不翻倍。清一色和杠为加番；七对与龙七对取对应牌型，不重复叠加。</p><div class="fan-grid">${Object.entries(fanFields).map(([k,n])=>`<label>${n}<input id="fan-${k}" type="number" value="${roomRules[k]}" min="${k==='pure'||k==='gang'?0:1}" max="100"></label>`).join('')}</div></details><p class="note">禁止暗杠；摆叫后不能碰、不能换叫口。明杠/补杠需保持叫口。未叫不可打别人叫口，被关跳过，牌墙空查叫。默认不抢补杠胡（你尚未确认此项）。</p><button onclick="createRoom(${practice})">${practice?'开始实战':'创建好友房间'}</button><p id="form-error" class="note" aria-live="polite">好友房间有效期24小时。邀请链接只包含房间码，不包含你的玩家身份。</p></div>`}
window.createRoom=async practice=>{
 if(busy)return;busy=true;try{const rules={};for(const k in fanFields)rules[k]=Number(document.querySelector('#fan-'+k).value);
 const data=await request({op:'create',practice,rounds:Number(document.querySelector('#round-count').value),character:window.wuduCharacter?.(),name:document.querySelector('#nickname').value,rules});
 roomRules={...rules};safeSave('wd-rules',roomRules);enter(data);
 }catch(e){document.querySelector('#form-error').textContent=e.message}finally{busy=false}
};
window.joinRoom=async()=>{
 if(busy)return;busy=true;try{const code=document.querySelector('#room-code').value.trim().toUpperCase();let saved=null;try{saved=JSON.parse(localStorage.getItem('wd-room-'+code))}catch{}
 if(saved){credential=saved;screen='online';busy=false;await refresh();return}
 const data=await request({op:'join',code,character:window.wuduCharacter?.(),name:document.querySelector('#nickname').value});enter(data);
 }catch(e){document.querySelector('#form-error').textContent=e.message}finally{busy=false}
};
function meldHTML(p){return p.meld.map(m=>'<span class="meld-group">'+m.tiles.map(t=>tile(t)).join('')+'</span>').join('')}
function seat(g,j,pos){const p=g.p[j];return `<div class="opponent ${pos}"><div class="avatar ${g.turn===j&&g.phase==='discard'?'turn':''}">${['东','南','西','北'][j]}</div><div class="nameplate"><b>${escapeHTML(p.name)}</b> · ${p.score}分<br>${p.done?'已胡退出':p.blocked?'被关，等待轮转':p.called?'<span class="wait-tag">'+p.waits.map(name).join('、')+'</span>':'未摆叫'}</div><div class="backs">${Array.from({length:p.count},()=>'<span class="back"></span>').join('')}</div><div class="seat-meld">${p.meld.map(m=>m.tiles.map(name).join('')+' '+(m.kind==='gang'?'杠':'碰')).join('<br>')}</div></div>`}
function ruleSummary(r){return `<div class="rule-summary">${Object.entries(fanFields).map(([k,n])=>`<span>${n} <b>${r[k]}</b></span>`).join('')}</div>`}
function onlineTable(){
 const g=online.game;window.wuduGame=g;screen='online';nav();const me=g.me,p=g.p[me],a=g.available;
 if(g.phase==='lobby'){
 document.querySelector('#app').innerHTML=`<div class="card"><h2>房间 ${online.code}</h2><p id="connection" aria-live="polite"></p><div class="row">${g.p.map((p,i)=>`<div class="card">${i===0?'房主':'座位'+(i+1)} · ${escapeHTML(p.name)}</div>`).join('')}</div><p>${g.series?'本桌 '+g.series.total+' 局 · ':''}${g.p.length}/4 人就座</p><div class="row"><button onclick="shareInvite()">邀请朋友</button><button onclick="copyInvite()">复制链接</button>${me===0?`<button onclick="roomOp('fill')" ${g.p.length===4?'disabled':''}>电脑补齐空位</button><button onclick="roomOp('start')" ${g.p.length!==4?'disabled':''}>开始对局</button>`:''}</div><p id="invite-result" class="note"></p><details open><summary>本桌番数</summary>${ruleSummary(g.rules)}</details></div>`;updateConnection();return}
 const buttons=[];
 if(a.hu)buttons.push('<button class="win-button" onclick="roomAct(\'hu\')">胡</button>');
 if(a.peng)buttons.push('<button onclick="roomAct(\'peng\')">碰</button>');
 if(a.gang)buttons.push('<button onclick="roomAct(\'gang\')">明杠</button>');
 for(const t of a.add||[])buttons.push(`<button onclick="roomAct('add',${t})">补杠 ${name(t)}</button>`);
 if(a.pass)buttons.push('<button onclick="roomAct(\'pass\')">过</button>');
 if(a.skip)buttons.push('<button onclick="roomAct(\'skip\')">被关，跳过</button>');
 if(a.discard)buttons.push(`<button onclick="roomAct('discard',${chosenTile})" ${chosenTile===null||!a.discard.includes(chosenTile)?'disabled':''}>${chosenTile===null?'选牌后出牌':'打出 '+name(chosenTile)}</button>`);
 const recent=g.river.slice(-24);
 document.querySelector('#app').innerHTML=`${settings()}<div class="room-top"><span>${g.series?'第 '+g.series.round+' / '+g.series.total+' 局　':''}房间 ${online.code}</span><span id="connection" aria-live="polite"></span><button onclick="copyInvite()">复制邀请</button></div><div class="table-shell">${seat(g,(me+1)%4,'right')}${seat(g,(me+2)%4,'top')}${seat(g,(me+3)%4,'left')}<div class="table-center"><div class="compass">${g.phase==='ended'?'结 算':'武 都'}</div><b>摆叫</b><small>余牌 ${g.remaining} 张</small></div><div class="river">${recent.map(x=>tile(x.t)).join('')}</div><div class="player-zone"><div class="player-label">${escapeHTML(p.name)} · ${p.score}分 · ${p.done?'已胡退出':p.called?'已摆叫 '+p.waits.map(name).join('、'):'未摆叫'}</div><div class="own-meld">${meldHTML(p)}</div><div class="tiles">${p.hand.map((t,index)=>tile(t,a.discard?.includes(t)?`selectOnlineTile(${t},${index})`:null,chosenTile===t)).join('')}</div><div class="row actions">${buttons.join('')}</div></div></div><p class="status-line">${g.phase==='ended'?'本局结束':g.phase==='claim'?'正在响应 '+escapeHTML(g.p[g.pending.from].name)+' 的 '+name(g.pending.tile):escapeHTML(g.p[g.turn].name)+' 的回合'} · <span id="turn-clock"></span></p><p id="invite-result" class="muted"></p>${g.phase==='ended'?`<div class="card"><h2>${g.series?.final?'整桌总成绩':'本局结算'}</h2>${g.p.map((p,i)=>`<p>${escapeHTML(p.name)}　 本局 ${p.score} 分　累计 ${g.series?.totals[i]??p.score} 分 ${p.lastWin?escapeHTML(p.lastWin.label):''}</p>`).join('')}${g.series?'<details><summary>逐局成绩</summary>'+g.series.history.map((scores,j)=>'<p>第 '+(j+1)+' 局 · '+scores.map((v,i)=>escapeHTML(g.p[i].name)+' '+v).join(' / ')+'</p>').join('')+'</details>':''}${me===0&&!g.series?.final?'<button onclick="roomOp(\'start\')">开始下一局</button>':''}<p class="muted">纯练习积分，无充值或提现。</p></div>`:''}<details><summary>本桌番数与流水</summary>${ruleSummary(g.rules)}<div class="card">${g.transfers.map(x=>`<p>${escapeHTML(g.p[x.from].name)} → ${escapeHTML(g.p[x.to].name)}：${x.points}分（${escapeHTML(x.reason)}）</p>`).join('')||'暂无分数变动'}</div></details><div class="card log">${g.log.map(s=>'<div>'+escapeHTML(s)+'</div>').join('')}</div>`;
 updateConnection();
}
setInterval(()=>{if(screen!=='online'||!online)return;const el=document.querySelector('#turn-clock');if(el)el.textContent=online.game.phase==='ended'?'':Math.max(0,Math.ceil((online.game.deadline-Date.now())/1000))+'秒 · 超时自动托管'},1000);
function onlineRules(){screen='rules';nav();document.querySelector('#app').innerHTML=`<div class="card"><h2>你确认的武都摆叫桌规</h2><ul><li>万条筒108张，和牌缺一门；没有吃牌和暗杠。</li><li>一番起摆、起胡，达到听牌后自动公开叫口。</li><li>摆叫后不换叫口、不碰牌；明杠与补杠必须保持原叫口。</li><li>未摆叫者不可打出他人的叫口；被关后继续轮转。</li><li>允许一炮多响；点炮者付款，自摸由仍在局中的其他玩家付款。</li><li>牌墙摸完，没叫赔有叫。每个人胡一次，三家胡后结束。</li><li>番数线性计算，分数＝牌型番数×每番分值，不按2的幂翻倍。</li></ul><h3>可配置番值</h3>${ruleSummary(roomRules)}<p>这些是初始建议值，不声称所有武都牌桌通用；房主创建房间时可修改，房间内全员可查看，开局后不可修改。</p><h3>已明示的实现约定</h3><p>你尚未给出抢杠胡规则，因此当前不抢补杠胡。被关者保留已摸牌并暂停摸打，轮到时若仍无合法出牌则跳过，直到可出牌或查叫。查叫按有叫者可胡的最高番赔付；不按已见牌张扣除死叫。龙七对采用独立牌型番值，清一色与已开杠另加。牌型有多种合法拆分时取最高配置番。</p><p>这些细节如与你平时玩法不同，需要调整后才能称为与你的牌桌完全一致。</p><h3>好友玩法</h3><p>创建房间→复制邀请链接→朋友输入昵称加入→房主开局。未满四人可用电脑补齐。相同浏览器可返回原房间，清除数据后玩家身份无法恢复。房间24小时到期。超时自动托管，页面重新打开继续同步。</p></div>`}
// Training and analysis share the same structural rule engine as the server.
waits=function(h){return ruleWaits(h,[],{...baseRules,...roomRules})};
const baseChapters=chapters;
const advancedNames=['第六章 · 碰杠取舍','第七章 · 公开叫口与被关','第八章 · 牌型算分'];
chapters=function(){baseChapters();document.querySelector('#app .chapter-grid').insertAdjacentHTML('beforeend',advancedNames.map((n,j)=>{let i=j+5;return `<button ${stars[i-1]===3?`onclick="beginAdvanced(${i})"`:'disabled'}><small>第${i+1}章 · 实战情境</small><b>${n.split(' · ')[1]}</b><small>${i===5?'按叫口与杠牌权限选择操作':i===6?'辨别出牌限制与跳过时机':'按当前配置的牌型番数算分'}</small><p>${'★'.repeat(stars[i]||0)}${'☆'.repeat(3-(stars[i]||0))}</p></button>`}).join(''));document.querySelector('.draft').textContent='8章共24关。前5章练叫口，后3章使用同一规则引擎练操作和计分。'};
let advanced=null;
function scenario(id,j){
 let g={phase:'discard',turn:0,rules:{...baseRules,...roomRules},p:Array.from({length:4},(_,i)=>rulePlayer('玩家'+i,''))},p=g.p[0],h=[0,0,0,9,10,11,12,13,14,15,16,17,4];p.h=[...h];p.called=true;p.waits=[4];
 if(id===5){
  if(j===0){g.phase='claim';g.pending={from:1};return {hand:h,text:'你已摆叫5万，右家打出1万。杠后叫口仍为5万，哪种取牌操作允许？',choices:['碰1万','明杠1万','暗杠1万'],correct:gangAllowed(g,0,0,'open')?1:-1,explanation:'摆叫后禁止碰牌，但允许不改变叫口的明杠。'}}
  if(j===1){p.h=[0,9,10,11,12,13,14,15,16,17,4];p.drawn=0;p.meld=[{kind:'peng',tiles:[0,0,0],from:1}];const a=ruleActions(g,0);return {hand:p.h,text:'你已碰1万、摆叫5万，现在摸到第4张1万，叫口保持不变。哪种杠允许？',choices:['暗杠','补杠','所有杠都禁止'],correct:a.add.includes(0)?1:2,explanation:'已碰的刻子加第4张为补杠；使用规则引擎检查叫口不变。'}}
  p.h=[0,...h];p.drawn=0;return {hand:p.h,text:'摆叫5万后摸到第4张1万，之前没有碰1万。这桌禁止暗杠，应怎样处理？',choices:['暗杠并补牌','打出摸入的1万','改叫1万'],correct:1,explanation:'没有碰出的刻子不能补杠；本桌禁止暗杠，也禁止改叫。'};
 }
 if(id===6){
  if(j===0){p.called=false;p.h=[0,1,2,3,4,5,6,7,8,9,10,11,13,14];g.p[1].called=true;g.p[1].waits=[4];return {hand:p.h,text:'你还没摆叫，对家已摆叫5万。下列哪张不能打？',choices:['5万','6条','1条'],correct:ruleActions(g,0).discard.includes(4)?-1:0,explanation:'未摆叫者不能打出仍在局中已叫玩家的叫口。'}}
  if(j===1){p.h=[...h,12];p.drawn=12;return {hand:p.h,text:'你已摆叫5万，现在摸入4条。你没有胡牌或合法杠的机会，应打哪张？',choices:['5万','1万','4条'],correct:ruleActions(g,0).discard[0]===12?2:-1,explanation:'摆叫后锁定叫口，普通出牌只允许打摸入的牌。'}}
  return {hand:[...h,13],text:'未摆叫者的所有牌都被其他玩家叫口限制，当前没有合法出牌。按本桌约定怎么办？',choices:['立即判输，结束全局','丢掉一张暗牌继续摸','保留牌、跳过，继续轮转'],correct:2,explanation:'被关不结束牌局。保留手牌暂停摸打；牌墙摸完再查叫赔付。'};
 }
 const hands=[
 [0,1,2,3,4,5,6,7,8,9,10,11,13,13],
 [0,0,2,2,4,4,9,9,11,11,13,13,16,16],
 [0,0,0,0,2,2,4,4,9,9,11,11,13,13]
 ],tilesWin=[13,16,13],s=ruleScore(hands[j],[],tilesWin[j],g.rules);
 const choices=[s.points,s.points+g.rules.base,Math.max(0,s.points-g.rules.base)];
 return {hand:hands[j],text:`这手牌以${name(tilesWin[j])}胡牌，按当前番表，每位付款者付多少分？`,choices:choices.map(n=>n+'分'),correct:0,explanation:`引擎判定：${s.label}，${s.fan}番 × ${g.rules.base}分/番＝${s.points}分。点炮由放炮者付，自摸由仍在局中的其他玩家付。`};
}
window.beginAdvanced=id=>{if(stars[id-1]!==3)return;advanced={id,step:0,correct:0,answered:false};renderAdvanced()};
function renderAdvanced(){let s=scenario(advanced.id,advanced.step);document.querySelector('#app').innerHTML=`<div class="training-head"><h2>${advancedNames[advanced.id-5]}</h2><span>${advanced.step+1}/3</span></div>${settings()}<div class="table-shell training-table">${tiles(s.hand)}<p>${escapeHTML(s.text)}</p></div><div class="card"><div class="row">${s.choices.map((c,i)=>`<button onclick="answerAdvanced(${i})">${escapeHTML(c)}</button>`).join('')}</div><p id="advanced-result" class="note">观察桌况后作答。</p><button onclick="nextAdvanced()">下一关</button></div>`}
window.answerAdvanced=i=>{if(advanced.answered)return;advanced.answered=true;const s=scenario(advanced.id,advanced.step);advanced.correct+=+(i===s.correct);document.querySelector('#advanced-result').textContent=(i===s.correct?'答对了！':'正确答案：'+s.choices[s.correct])+'\n'+s.explanation};
window.nextAdvanced=()=>{if(!advanced.answered){document.querySelector('#advanced-result').textContent='请先作答。';return}if(++advanced.step<3){advanced.answered=false;renderAdvanced();return}stars[advanced.id]=Math.max(stars[advanced.id]||0,advanced.correct);safeSave('wd-chapters',stars);document.querySelector('#app').innerHTML=`<div class="card"><h2>本章答对${advanced.correct}/3</h2><p>全部答对可获得三星。</p><button onclick="beginAdvanced(${advanced.id})">重新挑战</button><button onclick="go('chapters')">章节地图</button></div>`};
const baseNav=nav;
nav=function(){baseNav();for(const b of document.querySelectorAll('#nav button'))if(b.textContent==='体验牌桌')b.textContent='实战牌桌'};
const enhancedHome=home;
home=function(){enhancedHome();const first=document.querySelector('.mode-card p');if(first)first.innerHTML='8章 · 24道关卡<br>叫口、碰杠、被关与计分。'};
home();
if(new URLSearchParams(location.search).has('room'))roomForm(false);


