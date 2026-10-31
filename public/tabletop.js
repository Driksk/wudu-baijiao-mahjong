import * as T from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

import {TableGestures} from './table-gestures.js';
const prefs=()=>{try{return JSON.parse(localStorage.getItem('wd-skins'))||{}}catch{return {}}};
const round=(w,h,d,r=.045)=>new RoundedBoxGeometry(w,h,d,5,r);
function texture(draw,w=512,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
import {baize as fabric,walnut,studioLight} from './table-finishes.js';
const tileGeometry=round(.46,.65,.31),backGeometry=round(.454,.644,.095,.034),faceGeometry=new T.PlaneGeometry(.395,.568);
const faces=new Map();
let textureRevision=0;
const discardRing=new T.RingGeometry(.23,.27,32),ringMaterial=new T.MeshBasicMaterial({color:'#e5bc65',side:T.DoubleSide});
function maps(t){if(faces.has(t))return faces.get(t);const canvas=document.createElement('canvas');canvas.width=288;canvas.height=384;const c=canvas.getContext('2d');c.fillStyle='#faf7ed';c.fillRect(0,0,288,384);const bump=canvas.cloneNode(),b=bump.getContext('2d');b.fillStyle='white';b.fillRect(0,0,288,384);const map=new T.CanvasTexture(canvas),bumpMap=new T.CanvasTexture(bump);map.colorSpace=T.SRGBColorSpace;map.anisotropy=bumpMap.anisotropy=8;const img=new Image();img.onload=()=>{c.drawImage(img,8,8,272,368);b.drawImage(img,8,8,272,368);const d=b.getImageData(0,0,288,384);for(let i=0;i<d.data.length;i+=4){const v=Math.min(d.data[i],d.data[i+1],d.data[i+2]);d.data[i]=d.data[i+1]=d.data[i+2]=v<190?110:255}b.putImageData(d,0,0);map.needsUpdate=bumpMap.needsUpdate=true;textureRevision++};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(face(t).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));const value={map,bumpMap};faces.set(t,value);return value}
export class MahjongScene{
 constructor(){
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2.2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.97;this.canvas=this.renderer.domElement;this.canvas.setAttribute('aria-label','三维麻将桌面，四家弃牌分区显示');
  this.scene=new T.Scene();this.lightStudio=studioLight(this.renderer);this.scene.environment=this.lightStudio.texture;this.scene.environmentIntensity=.40;this.scene.background=new T.Color('#101b20');this.camera=new T.PerspectiveCamera(43,1,.1,80);this.scene.add(new T.HemisphereLight('#f1f2ee','#26332e',1.55));const key=new T.DirectionalLight('#fff2db',2.7);key.position.set(-5,12,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:35});key.shadow.normalBias=.018;this.scene.add(key);const fill=new T.DirectionalLight('#cee4ee',.95);fill.position.set(5,6,-4);this.scene.add(fill);
  this.tiles=new T.Group();this.scene.add(this.tiles);this.animations=[];this.lastKey='';this.lastRiver=null;this.active=false;this.motion=!matchMedia('(prefers-reduced-motion:reduce)').matches;this.faceMaterials=new Map();
  this.buildTable();this.reskin();this.gestures=new TableGestures(this.scene,t=>this.tile(t));this.observer=new ResizeObserver(()=>this.resize());document.addEventListener('visibilitychange',()=>{if(!document.hidden&&this.host?.isConnected)this.resume()});
 }
 mesh(geo,material,x=0,y=0,z=0,parent=this.scene){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 buildTable(){
  const rim=new T.MeshStandardMaterial({color:'#ad8468',map:walnut,bumpMap:walnut,bumpScale:.018,roughness:.36,metalness:.04});this.mesh(round(13.8,.65,13.8,.3),rim,0,-.36);this.mesh(round(13.35,.10,13.35,.2),new T.MeshStandardMaterial({color:'#8b8061',roughness:.38,metalness:.65}),0,-.07);this.felt=this.mesh(round(12.65,.12,12.65,.18),new T.MeshStandardMaterial({color:'#195c53',map:fabric,bumpMap:fabric,bumpScale:.008,roughness:.95}),0,0);
  const seam=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-6.25,.069,-6.25),new T.Vector3(6.25,.069,-6.25),new T.Vector3(6.25,.069,6.25),new T.Vector3(-6.25,.069,6.25)]),new T.LineBasicMaterial({color:'#a8b79d',transparent:true,opacity:.22}));this.scene.add(seam);
  this.mesh(round(1.8,.13,1.8,.12),new T.MeshStandardMaterial({color:'#142d2d',roughness:.45,metalness:.25}),0,.13);
  this.centerMap=texture((c,w)=>{c.clearRect(0,0,w,w)});this.center=this.mesh(new T.PlaneGeometry(1.65,1.65),new T.MeshBasicMaterial({map:this.centerMap,transparent:true}),0,.201);this.center.rotation.x=-Math.PI/2;
 }
 tile(t,hidden=false){const group=new T.Group();this.mesh(tileGeometry,this.body,0,0,0,group);this.mesh(backGeometry,this.back,0,0,-.122,group);if(!hidden){const key=t;let material=this.faceMaterials.get(key);if(!material){material=new T.MeshPhysicalMaterial({...maps(t),color:'#fffdf7',roughness:.42,clearcoat:.16,clearcoatRoughness:.28,bumpScale:.018});this.faceMaterials.set(key,material)}this.mesh(faceGeometry,material,0,0,.156,group)}return group}
 reskin(){const p=prefs();this.body?.dispose();this.back?.dispose();this.body=new T.MeshPhysicalMaterial({color:'#f6f2e7',roughness:.26,clearcoat:.4,clearcoatRoughness:.26});this.back=new T.MeshPhysicalMaterial({color:{pink:'#c67e97',bamboo:'#657d4c',porcelain:'#427a9c',ivory:'#28795e'}[p.tile]||'#c67e97',roughness:.23,clearcoat:.5});this.felt.material.color.set({jade:'#245c52',blue:'#284c65',wine:'#623d50'}[p.table]||'#245c52');this.lastKey='';if(this.game)this.update(this.game)}
 attach(host){this.host=host;host.prepend(this.canvas);this.observer.disconnect();this.observer.observe(host);this.resize();this.resume()}
 resize(){if(!this.host)return;this.dirty=true;const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=this.camera.aspect<.8?54:43;const d=this.camera.aspect<.8?14.8:11.9;this.camera.position.set(0,d*.74,d*.66);this.camera.lookAt(0,0,.4);this.camera.updateProjectionMatrix()}
 setView(){this.resize()}
 toggleMotion(){this.motion=!this.motion}
 update(g){this.game=g;const k=JSON.stringify([g.river,g.remaining,g.p.map(p=>[p.count,p.meld,p.done]),g.turn]);if(k===this.lastKey)return;this.lastKey=k;this.dirty=true;for(const mesh of this.tiles.children)if(mesh.isInstancedMesh)mesh.dispose();this.tiles.clear();this.animations=[];
  for(let s=0;s<4;s++){const p=g.p[(g.me+s)%4],group=new T.Group();group.rotation.y=s*Math.PI/2;this.tiles.add(group);
   if(s!==0)for(let i=0;i<p.count;i++){const t=this.tile(0,true);t.position.set((i-(p.count-1)/2)*.48,.4,5.1);group.add(t)}
   let n=0;for(const m of p.meld)for(const v of m.tiles){const t=this.tile(v);t.rotation.x=-Math.PI/2;t.position.set(-3+n*.48,.225,4.35);group.add(t);n++}
  }
  const lanes=[0,0,0,0];g.river.forEach((r,i)=>{const s=(r.from-g.me+4)%4,j=lanes[s]++,group=new T.Group();group.rotation.y=s*Math.PI/2;const t=this.tile(r.t);const rows=Math.ceil(g.river.filter(x=>x.from===r.from).length/6);const scale=Math.min(1.23,3.07/(Math.max(1,rows)*.67));t.scale.setScalar(scale);t.rotation.x=-Math.PI/2;t.position.set((j%6-2.5)*.49*scale+.74,.07+.172*scale,1.62+Math.floor(j/6)*.69*scale);group.add(t);this.tiles.add(group);
   if(i===g.river.length-1){const marker=this.mesh(discardRing,ringMaterial,t.position.x,.073,t.position.z,group);marker.rotation.x=-Math.PI/2;
    if(this.motion&&this.lastRiver!==null&&g.river.length>this.lastRiver){this.animations.push({obj:t,to:t.position.clone(),start:performance.now()});t.position.z+=1.5;t.position.y+=.6}}
  });
  if(this.motion && this.lastRiver!==null && g.river.length>this.lastRiver && !this.gestures.action){
    const last=g.river.at(-1);if(last.from!==g.me)this.gestures.play('discard',(last.from-g.me+4)%4,last.t);
  }
  this.lastRiver=g.river.length;
  const n=g.remaining,wall=new T.InstancedMesh(tileGeometry,this.body,n),back=new T.InstancedMesh(backGeometry,this.back,n),dummy=new T.Object3D();wall.castShadow=wall.receiveShadow=true;back.castShadow=true;for(let i=0;i<n;i++){const slot=Math.floor(i/2),s=Math.floor(slot/14),j=slot%14,a=-s*Math.PI/2,x=(j-6.5)*.48,z=4.19;dummy.position.set(x*Math.cos(a)+z*Math.sin(a),.23+(i%2)*.32,-x*Math.sin(a)+z*Math.cos(a));dummy.rotation.set(Math.PI/2,0,-a);dummy.updateMatrix();wall.setMatrixAt(i,dummy.matrix);dummy.translateZ(-.122);dummy.updateMatrix();back.setMatrixAt(i,dummy.matrix)}this.tiles.add(wall,back);
  const c=this.centerMap.image.getContext('2d');c.clearRect(0,0,512,512);c.strokeStyle='#849887';c.lineWidth=3;c.strokeRect(18,18,476,476);c.textAlign='center';c.fillStyle='#c4b792';c.font='30px serif';c.fillText('武 都 摆 叫',256,165);c.font='bold 110px sans-serif';c.fillStyle='#f2eedc';c.fillText(g.remaining,256,295);c.font='25px sans-serif';c.fillStyle='#a9bfb7';c.fillText(g.phase==='ended'?'本 局 结 束':'余 牌',256,349);this.centerMap.needsUpdate=true;this.resume();
 }
 emote(kind,seat=0,tile=0){if(this.motion)this.gestures.play(kind,seat,tile)}
 pause(){this.active=false;cancelAnimationFrame(this.frame)}
 resume(){if(this.active)return;this.active=true;this.loop()}
 loop=()=>{if(!this.active||!this.host?.isConnected||document.hidden){this.active=false;return}const now=performance.now();if(!this.dirty && !this.animations.length && !this.gestures.action && this.textureRevision===textureRevision){this.frame=requestAnimationFrame(this.loop);return}this.textureRevision=textureRevision;this.dirty=false;for(const a of this.animations){const p=Math.min(1,(now-a.start)/360),q=1-Math.pow(1-p,3);a.obj.position.copy(a.to);a.obj.position.z+=(1-q)*1.5;a.obj.position.y+=Math.sin((1-q)*Math.PI/2)*.6}this.animations=this.animations.filter(a=>now-a.start<360);this.gestures.step(now);this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.loop)};
}

