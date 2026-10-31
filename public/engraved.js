// The same plate artwork is used for the hand, the 3D face map and the discard loupe.
face = function engravedFace(tileId) {
  const n=tileId%9+1, suit=Math.floor(tileId/9);
  const ink='#142e36',jade='#116147',red='#9d211f',blue='#164563';
  const rows=(groups)=>groups.flatMap((row,y)=>row.map((x)=>[24+x,31+(y-(groups.length-1)/2)*17]));
  const layouts=[null,[[24,31]],[[24,17],[24,45]],[[13,14],[24,31],[35,48]],
    rows([[-10,10],[-10,10]]),[[12,13],[36,13],[24,31],[12,49],[36,49]],
    rows([[-11,11],[-11,11],[-11,11]]),[[10,10],[24,15],[38,20],[13,34],[35,34],[13,51],[35,51]],
    rows([[-11,11],[-11,11],[-11,11],[-11,11]]).map(([x,y])=>[x,31+(y-31)*.86]),rows([[-13,0,13],[-13,0,13],[-13,0,13]])];
  let art='';
  if(suit===0){
    art='<g font-family="KaiTi, STKaiti, SimSun, serif" font-weight="bold" text-anchor="middle"><text x="24" y="28" font-size="29" fill="'+ink+'">'+'一二三四五六七八九'[n-1]+'</text><text x="24" y="56" font-size="28" fill="'+red+'">萬</text></g>';
  }else if(suit===2){
    for(const [i,[x,y]] of layouts[n].entries()){
      const r=n===1?19:n===2?10:n===9?6:7, color=n===1?jade:(n===5&&i===2)||n===7&&i<3?red:i%2?jade:blue;
      art+='<g transform="translate('+x+' '+y+') scale('+r/12+')"><circle r="11" fill="#f8f3e6" stroke="'+color+'" stroke-width="2.4"/><circle r="7.8" fill="none" stroke="'+color+'" stroke-width="2.5"/><circle r="4.5" fill="'+(n===1?red:color)+'"/><circle r="1.3" fill="#f6efdf"/></g>';
    }
  }else if(n===1){
    art='<path fill="'+jade+'" d="M7 51q1-13 9-24 1-12 13-17 6-2 9 3l6 2-7 3q-1 10-11 15l-9 16-2-9-8 14z"/><path fill="#194759" d="M13 44q4-17 17-23-6 13-17 23z"/><path fill="none" stroke="#e1c99a" stroke-width="1.6" d="M15 40l13-16m-9 15 9-10"/><circle cx="33" cy="13" r="1.5" fill="'+red+'"/><path stroke="'+red+'" stroke-width="2" d="M24 35l4 14m-7 3 8-4 5 2"/></svg>'.replace('</svg>','');
  }else{
    const bamboo=n===8?rows([[-14,-5,5,14],[-14,-5,5,14]]):layouts[n];
    for(const [i,[x,y]] of bamboo.entries()){
      const color=(n===7&&i<3)||n===5&&i===2?red:jade;
      art+='<g transform="translate('+x+' '+y+')"><path d="M-2.1-6.9q2.1-1.1 4.2 0l-.5 5.7.9.7-.6 1.2.2 5.8q-2 .9-4.1 0l.5-5.8-.8-.9.8-1z" stroke="'+color+'" stroke-width="1.35" fill="'+color+'"/><path stroke="#b2bd91" stroke-width=".85" d="M-.75-5.8l-.3 4.3M-.6 1.5l-.4 4M-2.6 0l5-.4"/></g>';
    }
  }
  return '<svg width="48" height="62" viewBox="0 0 48 62" aria-hidden="true">'+art+'</svg>';
};

