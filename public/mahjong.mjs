export const tileName=t=>(t%9+1)+['万','条','筒'][Math.floor(t/9)];
export const defaults={minFan:1,base:1,long:1,edge:2,single:3,triplet:4,tripletSingle:5,pure:7,seven:11,dragon:12,gang:1,cap:100,seconds:30};
export function config(raw={}){
 const c={...defaults};
 for(const k of Object.keys(c))if(raw[k]!==undefined){if(!Number.isInteger(raw[k])||raw[k]<(k==='pure'||k==='gang'?0:1)||raw[k]>100)throw Error('番值必须为允许范围内的整数');c[k]=raw[k]}
 if(c.seconds<15||c.seconds>90)throw Error('出牌时间为15至90秒');
 return c;
}
export function counts(a){const c=Array(27).fill(0);for(const t of a){if(!Number.isInteger(t)||t<0||t>=27)throw Error('非法牌');c[t]++}return c}
function splits(c){
 const i=c.findIndex(n=>n>0);if(i<0)return [[]];let out=[];
 if(c[i]>=3){c[i]-=3;out.push(...splits(c).map(r=>[[i,i,i],...r]));c[i]+=3}
 if(i%9<7&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;out.push(...splits(c).map(r=>[[i,i+1,i+2],...r]));c[i]++;c[i+1]++;c[i+2]++}
 return out;
}
export function arrangements(h,m=[]){
 if(h.length!==14-3*m.length)return [];
 const all=[...h,...m.flatMap(g=>g.tiles)],c=counts(h);
 if(counts(all).some(n=>n>4)||new Set(all.map(t=>Math.floor(t/9))).size>2)return [];
 const r=[];
 if(!m.length&&c.every(n=>n%2===0))r.push({kind:c.some(n=>n===4)?'dragon':'seven',parts:[]});
 for(let i=0;i<27;i++)if(c[i]>=2){c[i]-=2;for(const g of splits(c))r.push({kind:'normal',parts:[[i,i],...g]});c[i]+=2}
 return r;
}
export function score(h,m=[],winning,c=defaults){
 let best=null;
 for(const a of arrangements(h,m)){
  let fan=0,label='',parts=a.parts;
  if(a.kind!=='normal'){fan=c[a.kind];label=a.kind==='seven'?'七对':'龙七对'}
  else{
   const big=parts.slice(1).every(g=>g[0]===g[1]);
   const possibilities=[];
   if(parts[0][0]===winning)possibilities.push({fan:big?c.tripletSingle:c.single,label:big?'大对子单钓':'单钓'});
   for(const g of parts.slice(1))if(g.includes(winning)){
    if(g[0]===g[1])possibilities.push({fan:big?c.triplet:c.edge,label:big?'大对子':'对倒'});
    else{let n=winning%9,edge=g[1]===winning||(g[0]%9===0&&n===2)||(g[0]%9===6&&n===6);possibilities.push({fan:edge?c.edge:c.long,label:g[1]===winning?'卡张':edge?'边张':'长叫'})}
   }
   // A tile can participate in multiple valid decompositions; use the highest configured value.
   let b=possibilities.sort((x,y)=>y.fan-x.fan)[0];if(!b)continue;fan=b.fan;label=b.label;
  }
  let all=[...h,...m.flatMap(g=>g.tiles)],pure=new Set(all.map(t=>Math.floor(t/9))).size===1;
  if(pure){fan+=c.pure;label='清一色·'+label}
  const gangs=m.filter(g=>g.kind==='gang').length;
  fan+=gangs*c.gang;if(gangs)label+=`·${gangs}杠`;
  fan=Math.min(c.cap,fan);
  if(!best||fan>best.fan)best={fan,points:fan*c.base,label,parts};
 }
 return best;
}
export function waits(h,m=[],c=defaults){
 if(h.length!==13-3*m.length)return [];
 const used=counts([...h,...m.flatMap(g=>g.tiles)]);
 return Array.from({length:27},(_,t)=>t).filter(t=>used[t]<4&&(score([...h,t],m,t,c)?.fan||0)>=c.minFan);
}
function random(n){const x=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(x)}while(x[0]>=limit);return x[0]%n}
export function shuffle(){let a=Array.from({length:108},(_,i)=>Math.floor(i/4));for(let i=107;i>0;i--){let j=random(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export function player(name,token,bot=false){return {name,token,bot,h:[],meld:[],called:false,waits:[],done:false,score:0,drawn:null,blocked:false}}
function record(g,text){g.log.unshift(text);g.log=g.log.slice(0,100)}
function equal(a,b){return a.length===b.length&&a.every((t,i)=>t===b[i])}
function remove(h,t,n=1){for(let i=0;i<n;i++){let at=h.indexOf(t);if(at<0)throw Error('没有这张牌');h.splice(at,1)}}
function complete(g){return g.p.filter(p=>p.done).length>=3}
function deadline(g,now){g.deadline=now+g.rules.seconds*1000}
function finish(g,reason){g.phase='ended';g.pending=null;record(g,reason)}
function pay(g,winner,payers,result,reason){for(const i of payers){g.p[i].score-=result.points;g.p[winner].score+=result.points;g.transfers.push({from:i,to:winner,points:result.points,reason})}g.p[winner].lastWin=result;record(g,`${g.p[winner].name}${reason}：${result.label} ${result.fan}番，${result.points}分/家`)}
function settle(g){
 const active=g.p.map((p,i)=>i).filter(i=>!g.p[i].done);
 const ready=[],not=[];
 for(const i of active){
  const p=g.p[i],len=13-p.meld.length*3;
  let hands=p.h.length===len?[p.h]:p.h.map((_,k)=>p.h.filter((_,j)=>j!==k));
  // A trapped player can only be ready after a legal discard; cannot invent an illegal discard at settlement.
  if(p.h.length===len+1)hands=p.h.map((t,k)=>({t,h:p.h.filter((_,j)=>j!==k)})).filter(x=>legalDiscard(g,i,x.t)).map(x=>x.h);
  let best=null;
  for(const h of hands)for(const t of waits(h,p.meld,g.rules)){let s=score([...h,t],p.meld,t,g.rules);if(!best||s.fan>best.fan)best=s}
  if(best)ready.push([i,best]);else not.push(i);
 }
 for(const [i,s] of ready)pay(g,i,not,s,'查叫');
 finish(g,`牌墙摸完。${not.length}家无叫，${ready.length}家有叫；按各有叫牌型的最高番赔付。`);
}
function draw(g,i,now){
 const p=g.p[i];g.turn=i;g.phase='discard';deadline(g,now);
 // Trapped hands retain the drawn tile and skip drawing until a discard becomes legal.
 if(p.h.length===14-3*p.meld.length){p.blocked=!legalTiles(g,i).length;return}
 if(!g.wall.length){settle(g);return}
 const t=g.wall.pop();p.h.push(t);p.h.sort((a,b)=>a-b);p.drawn=t;p.blocked=false;
}
function next(g,i,now){if(complete(g))return finish(g,'三家已胡，本局结束。');let n=(i+1)%4;while(g.p[n].done)n=(n+1)%4;draw(g,n,now)}
export function startGame(g,now=Date.now()){
 if(g.p.length!==4)throw Error('需要四个座位');if(g.phase!=='lobby'&&g.phase!=='ended')throw Error('牌局已经开始');
 g.wall=shuffle();g.river=[];g.plays=[];g.log=[];g.transfers=[];g.pending=null;
 for(const p of g.p){Object.assign(p,{h:g.wall.splice(0,13).sort((a,b)=>a-b),meld:[],called:false,waits:[],done:false,drawn:null,blocked:false,lastWin:null,score:0})}
 record(g,'开局。无暗杠，摆叫后不可改叫；线性计分。');draw(g,0,now);return g;
}
export function legalDiscard(g,i,t){
 const p=g.p[i];if(!p.h.includes(t))return false;
 if(p.called)return t===p.drawn;
 return !g.p.some((q,j)=>j!==i&&!q.done&&q.called&&q.waits.includes(t));
}
export function legalTiles(g,i){return [...new Set(g.p[i].h)].filter(t=>legalDiscard(g,i,t))}
export function gangAllowed(g,i,t,kind){
 const p=g.p[i],h=[...p.h],m=p.meld.map(x=>({...x,tiles:[...x.tiles]}));
 if(kind==='add'){const at=m.findIndex(x=>x.kind==='peng'&&x.tiles[0]===t);if(at<0||!h.includes(t))return false;remove(h,t);m[at]={kind:'gang',tiles:[t,t,t,t],from:m[at].from}}
 else{if(counts(h)[t]!==3)return false;remove(h,t,3);m.push({kind:'gang',tiles:[t,t,t,t],from:g.pending?.from})}
 return !p.called||equal(waits(h,m,g.rules),p.waits);
}
export function available(g,i){
 const p=g.p[i];if(!p||p.done)return {};
 if(g.phase==='claim')return g.pending.offers[i]&&!g.pending.responses[i]?g.pending.offers[i]:{};
 if(g.phase!=='discard'||g.turn!==i)return {};
 const s=score(p.h,p.meld,p.drawn,g.rules);
 return {discard:legalTiles(g,i),hu:!!s&&s.fan>=g.rules.minFan,add:p.meld.filter(m=>m.kind==='peng'&&gangAllowed(g,i,m.tiles[0],'add')).map(m=>m.tiles[0]),skip:!legalTiles(g,i).length};
}
function declare(g,p){if(!p.called){let w=waits(p.h,p.meld,g.rules);if(w.length){p.called=true;p.waits=w;record(g,`${p.name}摆叫：${w.map(tileName).join('、')}`)}}}
function resolve(g,now){
 const d=g.pending;if(!d)return;
 if(Object.keys(d.offers).some(i=>!d.responses[i]))return;
 const winners=Object.keys(d.responses).map(Number).filter(i=>d.responses[i]==='hu');
 if(winners.length){
  // The discarded / rob-kong tile is shared virtually by winners, never duplicated in their hands.
  for(const i of winners){let p=g.p[i],s=score([...p.h,d.tile],p.meld,d.tile,g.rules);p.done=true;pay(g,i,[d.from],s,d.kind==='add'?'抢杠胡':'点炮胡')}
  if(d.kind==='add'){remove(g.p[d.from].h,d.tile);g.river.push({t:d.tile,from:d.from,won:true})}
  else g.river[g.river.length-1].won=true;
  g.pending=null;next(g,d.from,now);return;
 }
 if(d.kind==='add'){g.pending=null;completeAdd(g,d.from,d.tile,now);return}
 let claims=Object.keys(d.responses).map(Number).filter(i=>['gang','peng'].includes(d.responses[i])).sort((a,b)=>(a-d.from+4)%4-(b-d.from+4)%4);
 if(claims.length){
  const i=claims[0],kind=d.responses[i],p=g.p[i],n=kind==='gang'?3:2;
  remove(p.h,d.tile,n);p.meld.push({kind,tiles:Array(n+1).fill(d.tile),from:d.from});g.river.pop();g.pending=null;p.drawn=null;record(g,`${p.name}${kind==='gang'?'明杠':'碰'}${tileName(d.tile)}`);
  if(kind==='gang')draw(g,i,now);else{g.turn=i;g.phase='discard';deadline(g,now)}
  return;
 }
 g.pending=null;next(g,d.from,now);
}
function openClaims(g,from,t,kind,now){
 const offers={};
 for(let i=0;i<4;i++)if(i!==from&&!g.p[i].done){
  const p=g.p[i],s=score([...p.h,t],p.meld,t,g.rules),hu=kind==='discard'&&p.called&&p.waits.includes(t)&&!!s&&s.fan>=g.rules.minFan;
  let peng=kind==='discard'&&!p.called&&counts(p.h)[t]>=2&&p.h.length===13-p.meld.length*3;
  let gang=kind==='discard'&&p.h.length===13-p.meld.length*3&&gangAllowed(g,i,t,'open');
  if(hu||peng||gang)offers[i]={hu,peng,gang,pass:true};
 }
 if(Object.keys(offers).length){g.pending={from,tile:t,kind,offers,responses:{}};g.phase='claim';deadline(g,now)}
 else if(kind==='add')completeAdd(g,from,t,now);else next(g,from,now);
}
function completeAdd(g,i,t,now){let p=g.p[i],at=p.meld.findIndex(m=>m.kind==='peng'&&m.tiles[0]===t);remove(p.h,t);p.meld[at]={...p.meld[at],kind:'gang',tiles:[t,t,t,t]};record(g,`${p.name}补杠${tileName(t)}`);draw(g,i,now)}
export function act(g,i,action,now=Date.now()){
 const p=g.p[i];if(!p)throw Error('不在房间中');
 const a=available(g,i),type=action.type;
 if(g.phase==='claim'){
  if(!['hu','peng','gang','pass'].includes(type)||!a[type])throw Error('当前不能执行这个操作');
  g.pending.responses[i]=type;resolve(g,now);return;
 }
 if(g.phase!=='discard'||g.turn!==i||p.done)throw Error('尚未轮到你');
 if(type==='hu'&&a.hu){p.done=true;pay(g,i,g.p.map((q,j)=>j).filter(j=>j!==i&&!g.p[j].done),score(p.h,p.meld,p.drawn,g.rules),'自摸');next(g,i,now);return}
 if(type==='add'&&a.add.includes(action.tile)){openClaims(g,i,action.tile,'add',now);return}
 if(type==='skip'&&a.skip){p.blocked=true;record(g,`${p.name}被关，保留手牌并跳过，等待其他玩家继续。`);next(g,i,now);return}
 if(type!=='discard'||!a.discard.includes(action.tile))throw Error('这张牌不能打');
 remove(p.h,action.tile);g.river.push({t:action.tile,from:i});(g.plays??=[]).push({t:action.tile,from:i});p.drawn=null;p.blocked=false;declare(g,p);record(g,`${p.name}打出${tileName(action.tile)}`);openClaims(g,i,action.tile,'discard',now);
}
function botAction(g,i){
 const a=available(g,i);if(a.hu)return {type:'hu'};
 if(g.phase==='claim')return {type:a.gang?'gang':a.peng?'peng':'pass'};
 if(a.add.length)return {type:'add',tile:a.add[0]};
 if(a.skip)return {type:'skip'};
 const p=g.p[i];let best=a.discard[0],bestValue=-Infinity;
 for(const t of a.discard){let h=[...p.h];remove(h,t);let c=counts(h),v=waits(h,p.meld,g.rules).length*100-new Set([...h,...p.meld.flatMap(x=>x.tiles)].map(x=>Math.floor(x/9))).size*12;
  v+=c.reduce((s,n,k)=>s+(n>=2?4:0)+(n&&k%9<8&&c[k+1]?2:0)+(n&&k%9<7&&c[k+2]?1:0),0);
  if(v>bestValue){bestValue=v;best=t}
 }
 return {type:'discard',tile:best};
}
export function tick(g,now=Date.now()){
 let changed=false;
 for(let guard=0;guard<250&&g.phase!=='ended'&&g.phase!=='lobby';guard++){
  if(g.phase==='claim'){
   let did=false;
   for(const key of Object.keys(g.pending.offers)){const i=+key;if(!g.pending.responses[i]&&(g.p[i].bot||now>=g.deadline)){g.pending.responses[i]=g.pending.offers[i].hu?'hu':g.p[i].bot?botAction(g,i).type:'pass';did=true}}
   if(!did)break;resolve(g,now);changed=true;
  }else{if(!g.p[g.turn].bot&&now<g.deadline)break;act(g,g.turn,botAction(g,g.turn),now);changed=true}
 }
 return changed;
}
export function view(g,i){
 return {phase:g.phase,turn:g.turn,deadline:g.deadline,remaining:g.wall?.length||0,rules:g.rules,river:g.river||[],plays:g.plays??g.river??[],log:g.log||[],transfers:g.transfers||[],me:i,available:available(g,i),pending:g.pending?{tile:g.pending.tile,from:g.pending.from,kind:g.pending.kind}:null,
 p:g.p.map((p,j)=>({name:p.name,bot:p.bot,hand:j===i?p.h:undefined,count:p.h.length,meld:p.meld,called:p.called,waits:p.called?p.waits:[],done:p.done,score:p.score,blocked:p.blocked,lastWin:p.lastWin}))};
}

