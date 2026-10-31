import * as T from 'three';

function surface(draw,size=768) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const map=new T.CanvasTexture(canvas);
  map.wrapS=map.wrapT=T.RepeatWrapping;
  map.colorSpace=T.SRGBColorSpace;
  return map;
}

export const baize=surface((ctx,n)=>{
  ctx.fillStyle='#a7b4a9';ctx.fillRect(0,0,n,n);
  for(let i=0;i<100000;i++){
    const x=Math.random()*n,y=Math.random()*n;
    ctx.strokeStyle=i%3?'rgba(42,63,53,.23)':'rgba(237,239,219,.43)';
    ctx.lineWidth=.5+Math.random()*1.3;ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+1+Math.random()*4,y-1-Math.random()*4);ctx.stroke();
  }
});
baize.repeat.set(3,3);

export const walnut=surface((ctx,n)=>{
  ctx.fillStyle='#9f7250';ctx.fillRect(0,0,n,n);
  for(let i=0;i<1800;i++){
    const y=Math.random()*n,bend=Math.sin(y/69)*13;
    ctx.strokeStyle=i%3?'rgba(62,36,25,.14)':'rgba(235,194,144,.20)';
    ctx.lineWidth=.6+Math.random()*2;ctx.beginPath();ctx.moveTo(0,y);
    ctx.bezierCurveTo(n*.33,y+bend,n*.58,y-bend,n,y);ctx.stroke();
  }
});
walnut.repeat.set(2,2);

// Broad window reflections give polished resin and glazed porcelain a soft edge highlight.
export function studioLight(renderer) {
  const strip=surface((c,n)=>{
    c.fillStyle='#303238';c.fillRect(0,0,n,n);
    const top=c.createLinearGradient(0,0,0,n);top.addColorStop(0,'#a5acb0');top.addColorStop(.58,'#56524d');top.addColorStop(1,'#17211c');c.fillStyle=top;c.fillRect(0,0,n,n);
    c.fillStyle='#ffeed2';c.fillRect(n*.08,n*.24,n*.18,n*.16);c.fillStyle='#d7edef';c.fillRect(n*.66,n*.28,n*.09,n*.18);
  },256);
  strip.mapping=T.EquirectangularReflectionMapping;
  const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(strip);pmrem.dispose();strip.dispose();return env;
}

