// Presentation only. Game actions still go through the server-authoritative room API.
const app=document.querySelector('#app');
let lastHandCount=null,lastRiverCount=null,gestureTimer=null;
const handMarkup='<div class="gesture-hand" aria-hidden="true"><span class="finger f1"></span><span class="finger f2"></span><span class="finger f3"></span><span class="finger f4"></span><span class="palm"></span><span class="thumb"></span><span class="cuff"></span></div>';
function mountScene(){
 const shell=app.querySelector('.table-shell');if(!shell||shell.querySelector('.cinematic-layer'))return;
 const live=!!app.querySelector('.room-top');if(!live)return;
 shell.insertAdjacentHTML('beforeend',`<div class="cinematic-social" aria-label="桌边动作"><button type="button" data-scene="tea" title="喝茶"><span>🍵</span>喝茶</button><button type="button" data-scene="smoke" title="抽烟"><span>🚬</span>抽烟</button><button type="button" data-scene="zoom" title="放大手牌">放大牌面</button></div><span class="mobile-swipe">左右滑动查看手牌 →</span><div class="cinematic-layer" aria-hidden="true">${handMarkup}<div class="action-tile"></div><div class="cup-scene"><div class="steam"></div><div class="steam b"></div><div class="cup"></div></div><div class="smoke-scene"><div class="steam"></div><div class="steam b"></div><div class="cigarette"></div></div></div>`);
 if(localStorage.getItem('wd-hand-zoom')==='1')shell.classList.add('zoom-hand');
 const handCount=shell.querySelectorAll('.player-zone > .tiles .tile').length;
 const riverCount=shell.querySelectorAll('.river .tile').length;
 if(lastHandCount!==null&&handCount>lastHandCount)animateHand('pick',shell);
 lastHandCount=handCount;lastRiverCount=riverCount;
}
function animateHand(type,shell=app.querySelector('.table-shell')){
 if(!shell||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const hand=shell.querySelector('.gesture-hand'),tile=shell.querySelector('.action-tile');if(!hand)return;
 hand.classList.remove('pick','throw');if(tile)tile.classList.remove('throw');void hand.offsetWidth;
 hand.classList.add(type);if(type==='throw'&&tile)tile.classList.add('throw');
}
function showScene(type){const shell=app.querySelector('.table-shell');if(!shell)return;const item=shell.querySelector(type==='tea'?'.cup-scene':'.smoke-scene');if(!item)return;item.classList.remove('show');void item.offsetWidth;item.classList.add('show')}
app.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.scene==='zoom'){
  const shell=app.querySelector('.table-shell');shell.classList.toggle('zoom-hand');const on=shell.classList.contains('zoom-hand');b.textContent=on?'缩小牌面':'放大牌面';localStorage.setItem('wd-hand-zoom',on?'1':'0');return;
 }
 if(b.dataset.scene==='tea'||b.dataset.scene==='smoke'){showScene(b.dataset.scene);return}
 if(b.closest('.player-zone > .tiles'))requestAnimationFrame(()=>animateHand('pick'));
});
const gameAction=window.roomAct;
window.roomAct=(type,tile)=>{
 if(type==='discard'||type==='peng'||type==='gang'||type==='add'){
  animateHand('throw');clearTimeout(gestureTimer);gestureTimer=setTimeout(()=>gameAction(type,tile),620);
  return;
 }
 gameAction(type,tile);
};
let scheduled=false;
const watch=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mountScene()})});
watch.observe(app,{childList:true,subtree:true});
mountScene();

