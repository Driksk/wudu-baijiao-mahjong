import * as T from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const loader=new GLTFLoader(),textureLoader=new T.TextureLoader();
const palette=()=>{let p={table:'jade',tile:'pink'};try{p={...p,...JSON.parse(localStorage.getItem('wd-skins')||'{}')}}catch{}return p};
const materials=new Map(),faceTextures=new Map();
const rounded=(w,h,d,r=.08)=>new RoundedBoxGeometry(w,h,d,3,r);
const smooth=x=>x*x*(3-2*x);
function textureCanvas(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
const grain=textureCanvas((ctx,n)=>{ctx.fillStyle='#77563b';ctx.fillRect(0,0,n,n);for(let i=0;i<1400;i++){const x=Math.random()*n;ctx.strokeStyle=`rgba(${Math.random()>.5?'15,7,0':'220,185,125'},${.03+Math.random()*.09})`;ctx.lineWidth=.4+Math.random()*2;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+20,150,x-12,330,x+6,n);ctx.stroke()}});grain.wrapS=grain.wrapT=T.RepeatWrapping;
const cloth=textureCanvas((ctx,n)=>{ctx.fillStyle='#bbc9b1';ctx.fillRect(0,0,n,n);for(let y=0;y<n;y+=3){ctx.strokeStyle=y%2?'#a6b39b':'#d4dcc7';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(n,y);ctx.stroke()}for(let x=0;x<n;x+=3){ctx.strokeStyle='#788d6933';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,n);ctx.stroke()}});cloth.wrapS=cloth.wrapT=T.RepeatWrapping;cloth.repeat.set(7,7);
const skinNoise=textureCanvas((ctx,n)=>{ctx.fillStyle='#b7957e';ctx.fillRect(0,0,n,n);for(let i=0;i<22000;i++){ctx.fillStyle=`rgba(75,30,20,${Math.random()*.15})`;ctx.fillRect(Math.random()*n,Math.random()*n,1,1)}});skinNoise.colorSpace=T.NoColorSpace;
function mat(key,opts){if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial(opts));return materials.get(key)}
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function label(text,color='#d1b97e',size=256){return textureCanvas((c,n)=>{c.clearRect(0,0,n,n);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`${n*.31}px serif`;c.fillText(text,n/2,n/2)},size)}
function faceMaps(t){if(faceTextures.has(t))return faceTextures.get(t);const c=document.createElement('canvas');c.width=192;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#fffbf1';ctx.fillRect(0,0,192,256);const bump=c.cloneNode(),bc=bump.getContext('2d');bc.fillStyle='#fff';bc.fillRect(0,0,192,256);const map=new T.CanvasTexture(c),bumpMap=new T.CanvasTexture(bump);map.colorSpace=T.SRGBColorSpace;
 const image=new Image();image.onload=()=>{ctx.drawImage(image,10,8,172,240);bc.drawImage(image,10,8,172,240);const data=bc.getImageData(0,0,192,256);for(let i=0;i<data.data.length;i+=4){const v=Math.min(data.data[i],data.data[i+1],data.data[i+2]);data.data[i]=data.data[i+1]=data.data[i+2]=v>210?255:35}bc.putImageData(data,0,0);map.needsUpdate=true;bumpMap.needsUpdate=true};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(face(t).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
 const result={map,bumpMap};faceTextures.set(t,result);return result;
}
const tileGeo=rounded(.48,.68,.30,.055),backGeo=rounded(.465,.665,.10,.045),faceGeo=new T.PlaneGeometry(.41,.59);
export class MahjongScene{
 constructor(){
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.canvas=this.renderer.domElement;this.canvas.setAttribute('aria-label','第一视角三维麻将牌桌');this.canvas.setAttribute('role','img');this.scene=new T.Scene();this.scene.background=new T.Color('#14251d');this.scene.fog=new T.Fog('#1e3023',23,65);
  this.camera=new T.PerspectiveCamera(42,1,.1,90);this.angle=0;this.view='close';this.camera.position.set(0,8,10.5);this.target=new T.Vector3(0,0,0);this.motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;try{this.motion=this.motion&&localStorage.getItem('wd-motion')!=='0'}catch{}
  this.scene.add(new T.HemisphereLight('#eee8d6','#242b17',2.2));const sun=new T.DirectionalLight('#ffdfac',3.6);sun.position.set(-7,13,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:35});sun.shadow.bias=-.0008;sun.shadow.normalBias=.035;this.scene.add(sun);const fill=new T.DirectionalLight('#b6d8ed',1.5);fill.position.set(8,7,-8);this.scene.add(fill);
  this.tableGroup=new T.Group();this.scene.add(this.tableGroup);this.tilesGroup=new T.Group();this.scene.add(this.tilesGroup);this.hands=[];this.people=[];this.playable=[];this.animations=[];this.lastData='';this.lastRiver=0;this.clock=new T.Clock();this.active=false;this.skinKey='';this.buildRoom();this.buildTable();this.buildPeople();this.reskin();
  this.canvas.addEventListener('pointerdown',e=>{this.pointer={x:e.clientX,y:e.clientY,angle:this.angle};this.canvas.setPointerCapture(e.pointerId)});
  this.canvas.addEventListener('pointermove',e=>{if(this.pointer)this.angle=Math.max(-.34,Math.min(.34,this.pointer.angle+(e.clientX-this.pointer.x)*.0025))});
  this.canvas.addEventListener('pointerup',e=>{if(this.pointer&&Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)<8)this.pick(e);this.pointer=null});this.canvas.addEventListener('pointercancel',()=>this.pointer=null);
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause();const note=document.createElement('p');note.className='scene-error';note.textContent='三维渲染已暂停，请刷新恢复。下方手牌仍可操作。';this.host?.append(note)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&this.host?.isConnected)this.resume()});this.resizeObserver=new ResizeObserver(()=>this.resize());
 }
 attach(host){this.host=host;host.prepend(this.canvas);this.resizeObserver.disconnect();this.resizeObserver.observe(host);this.resize();this.resume()}
 resume(){if(this.active)return;this.active=true;this.clock.getDelta();this.loop()}
 pause(){this.active=false;cancelAnimationFrame(this.frame)}
 resize(){if(!this.host)return;const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
 setView(){this.view='close';this.resume()}
 toggleMotion(){this.motion=!this.motion;localStorage.setItem('wd-motion',this.motion?'1':'0');if(!this.motion)this.animations=[]}
 buildRoom(){
  const wood=mat('roomWood',{color:'#59422d',map:grain,roughness:.6});mesh(new T.BoxGeometry(42,.25,42),wood,this.scene,0,-3.15,0);
  const wall=mat('wall',{color:'#7c8168',roughness:.95});mesh(new T.BoxGeometry(34,14,.5),wall,this.scene,0,3,-10);
  for(let x=-14;x<=14;x+=3.5){mesh(new T.BoxGeometry(.16,12,.22),wood,this.scene,x,3,-9.65);mesh(new T.BoxGeometry(3.2,.16,.3),wood,this.scene,x,4,-9.5)}
  const art=textureLoader.load('/assets/wudu-xiguan-real.png');art.colorSpace=T.SRGBColorSpace;art.wrapS=art.wrapT=T.ClampToEdgeWrapping;mesh(new T.PlaneGeometry(12.2,15.35),new T.MeshBasicMaterial({map:art,color:'#b6c5ad'}),this.scene,0,4.6,-9.4);
  for(let x=-12;x<=12;x+=3){mesh(new T.BoxGeometry(.11,11,.15),wood,this.scene,x,3,-9.15)}
  for(const y of [0,2.8,6])mesh(new T.BoxGeometry(25,.12,.2),wood,this.scene,0,y,-9.1);
  const brass=mat('brass',{color:'#bb9b53',metalness:.7,roughness:.3});
  for(const x of [-8,8]){mesh(new T.CylinderGeometry(.055,.055,6,12),brass,this.scene,x,0,1);mesh(new T.CylinderGeometry(.65,.95,1.1,28,1,true),mat('lamp',{color:'#e3c692',emissive:'#b27d36',emissiveIntensity:.3,side:T.DoubleSide}),this.scene,x,3,1);const l=new T.PointLight('#ffcc82',7,8,2);l.position.set(x,2.8,1);this.scene.add(l)}
  // Olive leaf screen: a local landscape motif, not a claim of a specific building.
  const leafMat=mat('olive',{color:'#62734e',roughness:.8});for(let i=0;i<35;i++){const x=-9+Math.sin(i*1.2)*.65,y=-1+i*.12,z=-2+Math.cos(i)*.4;const leaf=mesh(new T.SphereGeometry(.2,8,6),leafMat,this.scene,x,y,z);leaf.scale.set(.4,1.5,.15);leaf.rotation.z=i%2?.7:-.7}
 }
 buildTable(){
  const wood=mat('tableWood',{color:'#755034',map:grain,roughness:.37,metalness:.05});this.rim=mesh(rounded(12.7,.65,9.5,.32),wood,this.tableGroup,0,-.42,0);this.felt=mesh(rounded(11.65,.15,8.5,.23),new T.MeshStandardMaterial({color:'#315d44',roughness:.94,map:cloth,bumpMap:cloth,bumpScale:.012}),this.tableGroup,0,-.04,0);
  mesh(rounded(12.2,.09,9,.2),mat('tableTrim',{color:'#b19a61',roughness:.36,metalness:.65}),this.tableGroup,0,-.27,0);
  for(const x of [-4.7,4.7])for(const z of [-3.3,3.3])mesh(rounded(.45,2.4,.45,.07),wood,this.tableGroup,x,-1.9,z);
  const center=mesh(rounded(1.9,.12,1.8,.15),mat('center',{color:'#193d30',roughness:.65}),this.tableGroup,0,.10,0);
  const badge=mesh(new T.PlaneGeometry(1.4,1.4),new T.MeshBasicMaterial({map:label('武都'),transparent:true,depthWrite:false}),this.tableGroup,0,.168,0);badge.rotation.x=-Math.PI/2;
  for(let s=0;s<4;s++){const cup=this.cup();cup.position.set(s%2?5.65:-5.65,.06,s<2?3.7:-3.7);this.tableGroup.add(cup)}
  const ash=mesh(new T.CylinderGeometry(.28,.25,.09,24),mat('ash',{color:'#c1a99a',metalness:.15,roughness:.25}),this.tableGroup,5.6,.06,2.7);mesh(new T.CylinderGeometry(.20,.20,.015,24),mat('ashInside',{color:'#49443a',roughness:.8}),ash,0,.05,0);
 }
 cup(){const group=new T.Group(),porcelain=mat('cup',{color:'#e8e1c9',metalness:.05,roughness:.23});mesh(new T.CylinderGeometry(.25,.27,.035,28),porcelain,group,0,.02,0);mesh(new T.CylinderGeometry(.23,.14,.27,28,1,true),porcelain,group,0,.18,0);mesh(new T.CylinderGeometry(.215,.215,.012,28),mat('tea',{color:'#784c17',roughness:.14,metalness:.05}),group,0,.27,0);mesh(new T.TorusGeometry(.23,.015,8,28),mat('cupGold',{color:'#ae8d4d',metalness:.6,roughness:.26}),group,0,.32,0).rotation.x=Math.PI/2;return group}
 buildPeople(){
  for(let i=0;i<4;i++){
   const person=new T.Group();person.rotation.y=-i*Math.PI/2;this.scene.add(person);this.people.push(person);
   const clothMat=mat('jacket'+i,{color:['#464c45','#5a6a64','#6d574a','#3f5063'][i],roughness:.88,bumpMap:cloth,bumpScale:.018});
   mesh(rounded(2.8,2.1,1.25,.43),clothMat,person,0,-.12,5.75);
   const collarMat=mat('collar'+i,{color:['#ddd8c5','#c1c7bd','#c9bca8','#b4bfca'][i],roughness:.9});
   for(const side of [-1,1]){const collar=mesh(rounded(.55,.62,.12,.04),collarMat,person,side*.36,.85,5.06);collar.rotation.z=side*.35;
    const from=new T.Vector3(side*1.18,.50,5.55),to=new T.Vector3(side*3.40,.10,4.67),delta=to.clone().sub(from);const upper=mesh(new T.CylinderGeometry(.33,.42,delta.length(),18),clothMat,person);upper.position.copy(from).add(to).multiplyScalar(.5);upper.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
   }
   for(let j=0;j<3;j++)mesh(new T.SphereGeometry(.035,8,6),mat('button',{color:'#302d25',roughness:.45}),person,0,.4-j*.3,5.1);
   mesh(rounded(3.1,2.1,.22,.15),mat('chair',{color:'#493724',map:grain,roughness:.47}),person,0,-.35,6.52);
   const headPivot=new T.Group();headPivot.position.set(0,1.68,5.70);headPivot.rotation.y=Math.PI;person.add(headPivot);this.people[i].userData.head=headPivot;
   const fallback=mesh(new T.SphereGeometry(.42,24,20),mat('headFallback',{color:'#bd947e',roughness:.65}),headPivot);fallback.scale.set(.8,1.15,.87);
   loader.load('/assets/head/LeePerrySmith.glb',g=>{headPivot.remove(fallback);const model=g.scene,box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());model.position.sub(center);const norm=new T.Group();norm.add(model);norm.scale.setScalar(1.8/size.y);headPivot.add(norm);model.traverse(m=>{if(m.isMesh){m.castShadow=true;m.material=new T.MeshStandardMaterial({map:textureLoader.load('/assets/head/Map-COL.jpg',t=>{t.colorSpace=T.SRGBColorSpace}),normalMap:textureLoader.load('/assets/head/Infinite-Level_02_Tangent_SmoothUV.jpg'),roughness:.67,metalness:0})}})},undefined,()=>{});
   // Sleeves connect to a real skinned hand asset; fingers articulate for grasping.
   for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*3.4,.26,3.7);person.add(arm);
    const sleeve=mesh(new T.CylinderGeometry(.29,.36,1.45,20),clothMat,arm,0,-.06,.72);sleeve.rotation.x=Math.PI/2;
    const wrist=new T.Group();arm.add(wrist);const state={arm,wrist,side,seat:i,rest:arm.position.clone(),bones:[],props:new T.Group()};arm.add(state.props);this.hands.push(state);
    const path=side===1?'right':'left';loader.load('/assets/hand-'+path+'.glb',g=>{
     const model=g.scene;model.scale.setScalar(8);model.quaternion.setFromAxisAngle(new T.Vector3(1,1,1).normalize(),Math.PI*2/3);model.position.set(-.15,-.24,-.30);wrist.add(model);
     model.traverse(m=>{if(m.isMesh){m.material=new T.MeshPhysicalMaterial({color:['#c39a80','#c19b86','#b68c73','#c7a087'][i],roughness:.58,metalness:0,bumpMap:skinNoise,bumpScale:.003,clearcoat:.08,clearcoatRoughness:.7});m.castShadow=true;m.receiveShadow=true}if(m.isBone&&/phalanx/.test(m.name))state.bones.push({bone:m,q:m.quaternion.clone()})});
     state.loaded=true;
    },undefined,()=>{});
    const cup=this.cup();cup.position.set(0,.13,-.45);cup.visible=false;state.props.add(cup);state.cup=cup;
    const cig=new T.Group();mesh(new T.CylinderGeometry(.025,.025,.58,10),mat('cigPaper',{color:'#eee5cf',roughness:.8}),cig,0,0,0).rotation.x=Math.PI/2;mesh(new T.CylinderGeometry(.027,.027,.14,10),mat('cigFilter',{color:'#b4814c',roughness:.85}),cig,0,0,.22).rotation.x=Math.PI/2;mesh(new T.SphereGeometry(.026,8,6),mat('ember',{color:'#d86435',emissive:'#d64a16',emissiveIntensity:.9}),cig,0,0,-.30);cig.position.set(.14,.04,-.69);cig.visible=false;state.props.add(cig);state.cig=cig;
   }
  }
  this.smokeGeo=new T.BufferGeometry();this.smokePositions=new Float32Array(24*3);this.smokeGeo.setAttribute('position',new T.BufferAttribute(this.smokePositions,3));const sprite=textureCanvas((ctx,n)=>{const g=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'#ffffff88');g.addColorStop(.3,'#ffffff33');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,n,n)},64);this.smoke=new T.Points(this.smokeGeo,new T.PointsMaterial({map:sprite,color:'#e5e4d5',size:.27,transparent:true,opacity:.4,depthWrite:false}));this.smoke.visible=false;this.scene.add(this.smoke);
 }
 tile(t,hidden=false){const group=new T.Group();mesh(tileGeo,this.tileMat,group);mesh(backGeo,this.backMat,group,0,0,-.119);if(!hidden){let m=materials.get('face'+palette().tile+t);if(!m){m=new T.MeshPhysicalMaterial({...faceMaps(t),color:palette().tile==='pink'?'#ffe3ec':'#ffffff',roughness:.25,metalness:0,clearcoat:.45,clearcoatRoughness:.18,bumpScale:.045});materials.set('face'+palette().tile+t,m)}mesh(faceGeo,m,group,0,0,.152)}return group}
 reskin(){const p=palette();this.tileMat=mat('ivory'+p.tile,{color:p.tile==='pink'?'#f4c9d7':p.tile==='bamboo'?'#e5e9c3':p.tile==='porcelain'?'#e5eef3':'#fff5da',roughness:.24,metalness:.02});this.backMat=mat('back'+p.tile,{color:{pink:'#b86687',ivory:'#176346',bamboo:'#658259',porcelain:'#2f5f8d'}[p.tile]||'#b86687',roughness:.3,metalness:.03});this.felt.material.color.set({jade:'#2a6048',blue:'#284e6a',wine:'#6e3544'}[p.table]||'#2a6048');this.lastData='';if(this.game)this.update(this.game)}
  update(g){this.game=g;const chosen=document.querySelector('.player-zone>.tiles>.sel')?.getAttribute('aria-label');const key=JSON.stringify([g.p.map(p=>[p.hand,p.count,p.meld,p.done]),g.river,g.remaining,chosen,palette()]);if(key===this.lastData)return;this.lastData=key;
  this.tilesGroup.clear();this.playable=[];
  for(let s=0;s<4;s++){const p=g.p[(g.me+s)%4],count=s===0?p.hand.length:p.count,seat=new T.Group();seat.rotation.y=-s*Math.PI/2;this.tilesGroup.add(seat);
   for(let i=0;i<count;i++){const t=s===0?p.hand[i]:0,obj=this.tile(t,s!==0);obj.position.set((i-(count-1)/2)*.515,.39,3.60);if(s===0&&name(t)===chosen){obj.position.y+=.23;obj.position.z+=.15}obj.userData.tile=t;seat.add(obj);if(s===0&&g.available.discard?.includes(t))this.playable.push(obj)}
   let k=0;for(const meld of p.meld){for(const t of meld.tiles){const obj=this.tile(t);obj.rotation.x=-Math.PI/2;obj.position.set(-3.6+k*.5,.18,2.3);seat.add(obj);k++}}
  }
  const visibleRiver=g.river.slice(-48);visibleRiver.forEach((r,i)=>{const obj=this.tile(r.t);obj.rotation.x=-Math.PI/2;obj.position.set(((i%8)-3.5)*.51,.18,(Math.floor(i/8)-2.5)*.72);if(i===visibleRiver.length-1){obj.position.y=.27;obj.scale.setScalar(1.08)}obj.userData.river=true;this.tilesGroup.add(obj)});
  // Hidden wall tiles are instanced; never render opponents' concealed values.
  const n=Math.max(0,g.remaining),walls=new T.InstancedMesh(tileGeo,this.tileMat,n),backs=new T.InstancedMesh(backGeo,this.backMat,n),dummy=new T.Object3D();walls.castShadow=true;walls.receiveShadow=true;backs.castShadow=true;
  for(let i=0;i<n;i++){const slot=Math.floor(i/2),side=Math.floor(slot/14)%4,j=slot%14,angle=-side*Math.PI/2,x=(j-6.5)*.48,z=2.85;dummy.position.set(x*Math.cos(angle)+z*Math.sin(angle),.18+(i%2)*.32,-x*Math.sin(angle)+z*Math.cos(angle));dummy.rotation.set(Math.PI/2,0,-angle);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);dummy.translateZ(-.119);dummy.updateMatrix();backs.setMatrixAt(i,dummy.matrix)}this.tilesGroup.add(walls,backs);
  if(g.river.length>this.lastRiver&&this.lastRiver>0){const r=g.river.at(-1),seat=(r.from-g.me+4)%4;if(seat!==0&&Number.isFinite(seat))this.emote('discard',seat,r.t)}this.lastRiver=g.river.length;
  this.resume();
 }
 pick(e){const r=this.canvas.getBoundingClientRect(),pointer=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new T.Raycaster();ray.setFromCamera(pointer,this.camera);const hit=ray.intersectObjects(this.playable,true)[0];if(hit){let obj=hit.object;while(obj&&!Object.hasOwn(obj.userData,'tile'))obj=obj.parent;if(obj)window.selectOnlineTile(obj.userData.tile)}}
 emote(kind,seat=0,tile=0){if(!this.motion||kind.startsWith('talk'))return;const h=this.hands.find(h=>h.seat===seat&&h.side===1);if(!h)return;this.animations=this.animations.filter(a=>a.h!==h);this.animations.push({h,kind,start:performance.now(),duration:kind==='discard'?1500:4800,tile});if(kind==='discard'){if(h.held)h.props.remove(h.held);h.held=this.tile(tile||0);h.held.scale.setScalar(.85);h.held.position.set(.05,.05,-.55);h.held.rotation.x=-Math.PI/2;h.props.add(h.held)}}
 loop=()=>{if(!this.active||!this.host?.isConnected||document.hidden){this.active=false;return}this.frame=requestAnimationFrame(this.loop);const dt=Math.min(this.clock.getDelta(),.05),time=performance.now();
  const portrait=this.camera.aspect<1,dist=this.view==='close'?(portrait?16:10.5):(portrait?21:15),height=this.view==='close'?(portrait?13:8):(portrait?19:13);
  const desired=new T.Vector3(Math.sin(this.angle)*dist,height,Math.cos(this.angle)*dist);this.camera.position.lerp(desired,1-Math.exp(-dt*4));this.target.lerp(new T.Vector3(0,this.view==='close'?.25:0,this.view==='close'?1.1:0),1-Math.exp(-dt*4));this.camera.lookAt(this.target);
  this.smoke.visible=false;
  for(const h of this.hands){h.arm.position.copy(h.rest);h.arm.rotation.set(0,0,0);h.cup.visible=false;h.cig.visible=false;if(h.held)h.held.visible=false;for(const b of h.bones)b.bone.quaternion.copy(b.q);if(this.motion)h.arm.position.y+=Math.sin(time*.001+h.seat)*.012}
  this.animations=this.animations.filter(a=>time-a.start<a.duration);
  for(const a of this.animations){const p=(time-a.start)/a.duration,h=a.h;
   if(a.kind==='discard'){const reach=Math.sin(p*Math.PI);h.arm.position.z-=reach*1.8;h.arm.position.x-=reach*1.0;h.arm.position.y+=reach*.36;h.arm.rotation.x=-reach*.15;if(h.held)h.held.visible=p<.55}
   else {const lift=p<.3?smooth(p/.3):p<.68?1:1-smooth((p-.68)/.32);h.arm.position.set(h.rest.x-lift*2.8,h.rest.y+lift*1.52,h.rest.z+lift*1.15);h.arm.rotation.x=-lift*.6;h.arm.rotation.z=lift*.3;h.cup.visible=a.kind==='tea';h.cig.visible=a.kind==='smoke';
    const emitter=new T.Vector3();(a.kind==='tea'?h.cup:h.cig).getWorldPosition(emitter);this.smoke.visible=true;for(let i=0;i<24;i++){const age=((time*.0003+i/24)%1);this.smokePositions[i*3]=emitter.x+Math.sin(age*7+i)*.1;this.smokePositions[i*3+1]=emitter.y+.3+age*1.1;this.smokePositions[i*3+2]=emitter.z+Math.cos(age*5+i)*.08}this.smokeGeo.attributes.position.needsUpdate=true;
   }
   const flex=Math.sin(Math.min(1,p*3)*Math.PI/2)*.18;for(const b of h.bones)if(!/thumb/.test(b.bone.name))b.bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),flex));
  }
  this.renderer.render(this.scene,this.camera);
 };
}

