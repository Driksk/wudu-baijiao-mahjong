const seatName=(seat,me)=>['自己','右家','对家','左家'][(seat-me+4)%4];
const glyph=t=>'<i class="river-glyph">'+face(t)+'</i>';

export function riverSummary(game) {
  const latest=(game.plays??game.river).at(-1);
  if(!latest)return '<small>最近出牌</small><strong>等待首张</strong>';
  return glyph(latest.t)+'<span><small>'+seatName(latest.from,game.me)+'刚打出</small><strong>'+name(latest.t)+'</strong></span>';
}

export function riverDetail(game) {
  return '<div class="river-title"><b>桌上牌河</b><button data-action="river-close">收起</button></div>'+ 
    '<small>最近出牌顺序</small><div class="recent-plays">'+(game.plays??game.river).slice(-4).map(x=>'<span>'+seatName(x.from,game.me)+' '+name(x.t)+'</span>').join(' → ')+'</div>'+
    [0,1,2,3].map(offset=>{
      const seat=(game.me+offset)%4,tiles=game.river.filter(x=>x.from===seat);
      return '<section><small>'+seatName(seat,game.me)+' · '+tiles.length+' 张</small><div>'+
        (tiles.length?tiles.map(x=>'<span aria-label="'+name(x.t)+'">'+glyph(x.t)+'</span>').join(''):'尚无弃牌')+
        '</div></section>';
    }).join('');
}

