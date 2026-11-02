import * as T from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const axis = new T.Vector3(0, 0, 1);
const turn = new T.Quaternion();
const delta = new T.Vector3();
const clamp = T.MathUtils.clamp;
function ease(t){t=clamp(t,0,1);return t*t*(3-2*t)}
function part(parent, geometry, material, x=0, y=0, z=0){
  const m=new T.Mesh(geometry,material);m.position.set(x,y,z);
  m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
const ceramic=new T.MeshPhysicalMaterial({color:0xe8ecdf,roughness:.22,clearcoat:.7,side:T.DoubleSide});
const glaze=new T.MeshStandardMaterial({color:0x316879,roughness:.35});
function cup(){
  const g=new T.Group();
  const profile=[[.06,0],[.23,0],[.23,.045],[.21,.075],[.26,.19],[.31,.46],[.32,.49],[.303,.49],[.28,.43],[.22,.17],[.15,.08],[0,.08]].map(([x,y])=>new T.Vector2(x,y));
  part(g,new T.LatheGeometry(profile,48),ceramic);
  for(const [r,y] of [[.313,.475],[.237,.112]]){
    part(g,new T.TorusGeometry(r,.009,8,48),glaze,0,y).rotation.x=Math.PI/2;
  }
  part(g,new T.CylinderGeometry(.287,.287,.008,40),new T.MeshPhysicalMaterial({color:0x885123,roughness:.14,clearcoat:1}),0,.415);
  const handle=part(g,new T.TorusGeometry(.146,.032,10,32),ceramic,.30,.25);
  handle.scale.set(.82,1.1,1);
  return g;
}
function cigarette(){
  const g=new T.Group();
  const cylinder=(r,h,color,z)=>part(g,new T.CylinderGeometry(r,r,h,16),new T.MeshStandardMaterial({color,roughness:.8}),0,0,z).rotation.x=Math.PI/2;
  cylinder(.033,.62,0xece8dd,-.10);cylinder(.034,.2,0xb28657,.31);cylinder(.034,.065,0x79736b,-.438);
  g.ember=part(g,new T.SphereGeometry(.034,12,8),new T.MeshStandardMaterial({color:0x963f27,emissive:0xda542c}),0,0,-.425);
  return g;
}
function haze(){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,1,32,32,31);gradient.addColorStop(0,'rgba(220,222,216,.72)');gradient.addColorStop(.45,'rgba(224,227,219,.32)');gradient.addColorStop(1,'rgba(230,228,224,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(c);
}

export class TableGestures {
  constructor(scene, makeTile){
    this.makeTile=makeTile;
    this.seat=new T.Group();this.arm=new T.Group();this.seat.add(this.arm);scene.add(this.seat);this.seat.visible=false;
    this.hand=new T.Group();this.arm.add(this.hand);
    const skin=new T.MeshPhysicalMaterial({color:0xc49479,roughness:.64,clearcoat:.04});
    const fabric=new T.MeshStandardMaterial({color:0x34434b,roughness:.91});
    const sleeve=part(this.arm,new T.CylinderGeometry(.245,.33,1.7,24),fabric,0,-.03,.90);
    sleeve.rotation.x=-Math.PI/2;
    part(this.arm,new T.CylinderGeometry(.244,.256,.14,24),new T.MeshStandardMaterial({color:0xc5bcb0}),0,-.025,.12).rotation.x=-Math.PI/2;
    this.chains=[];this.ready=false;
    this.nailMaterial=new T.MeshPhysicalMaterial({color:0xd8ac96,roughness:.43,clearcoat:.22});
    new GLTFLoader().load('/assets/hand-right.glb',({scene:model})=>{
      const bones=new Map();model.traverse(o=>{if(o.isMesh){o.material=skin;o.castShadow=o.receiveShadow=true}if(o.isBone)bones.set(o.name,o)});
      // The XR rig stores joints as siblings. Rotate downstream joints about each knuckle.
      for(const prefix of ['thumb','index-finger','middle-finger','ring-finger','pinky-finger']){
        const joints=['phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'].map(s=>bones.get(prefix+'-'+s)).filter(Boolean);
        const chain={prefix,joints:joints.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}))};
        if(prefix!=='thumb'&&joints.length>1){const tip=joints.at(-1);const nail=part(tip.parent,new T.SphereGeometry(1,14,9),this.nailMaterial);nail.scale.set(.0017,.005,.0038);chain.nail=nail;}
        this.chains.push(chain);
      }
      model.scale.setScalar(10);model.position.copy(bones.get('wrist').position).multiplyScalar(-10);
      this.hand.add(model);this.hand.quaternion.setFromAxisAngle(new T.Vector3(1,1,1).normalize(),2*Math.PI/3);
      this.ready=true;
    },undefined,()=>this.buildFallbackHand(skin));
    this.cup=cup();this.cig=cigarette();this.seat.add(this.cup,this.cig);
    this.puffs=Array.from({length:12},(_,i)=>{
      if(i===0)this.haze=haze();
      const puff=new T.Sprite(new T.SpriteMaterial({map:this.haze,depthWrite:false,transparent:true}));this.seat.add(puff);return puff;
    });
  }
  buildFallbackHand(skin){
    // Production-safe fallback when the optional GLB hand is unavailable.
    const palm=part(this.hand,new T.SphereGeometry(.30,20,14),skin,0,-.03,-.10);
    palm.scale.set(.78,.32,1.14);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.14;
      const finger=part(this.hand,new T.CapsuleGeometry(.065,.24,8,12),skin,x,.02,-.40);
      finger.rotation.x=-.20; finger.scale.z=1-(i===0?.10:0);
    }
    const thumb=part(this.hand,new T.CapsuleGeometry(.075,.22,8,12),skin,-.28,-.02,-.12);
    thumb.rotation.set(.35,.15,-.82);
    this.hand.quaternion.setFromEuler(new T.Euler(-.15,.05,.05));
    this.ready=true;
  }
  play(kind,seat,tile){
    if(!['tea','smoke','discard'].includes(kind))return;
    if(this.held){this.arm.remove(this.held);this.held=null}
    this.action={kind,seat,start:performance.now(),duration:kind==='discard'?800:kind==='tea'?4100:4600};
    this.seat.rotation.y=seat*Math.PI/2;
    this.seat.position.set(Math.sin(this.seat.rotation.y)*-.58,0,Math.cos(this.seat.rotation.y)*-.58);
    this.cup.visible=kind==='tea';this.cig.visible=kind==='smoke';
    if(kind==='discard'){this.held=this.makeTile(tile);this.arm.add(this.held);this.held.position.set(-.19,-.22,-1.22);this.held.rotation.x=-Math.PI/2}
  }
  pose(grip,kind){
    for(const {prefix,joints,nail} of this.chains){
      const pinch=kind==='smoke'&&['index-finger','middle-finger'].includes(prefix);
      const angle=grip*(prefix==='thumb'?.38:pinch?-.21:-.79);
      const rotation=new T.Quaternion();const pivot=new T.Vector3();let previous;
      for(const j of joints){
        if(!previous)pivot.copy(j.p);
        else pivot.add(delta.copy(j.p).sub(previous).applyQuaternion(rotation));
        turn.setFromAxisAngle(axis,angle);rotation.multiply(turn);
        j.b.position.copy(pivot);j.b.quaternion.copy(rotation).multiply(j.q);previous=j.p;
      }
      if(nail){nail.position.copy(pivot).add(delta.set(.0045,.006,0).applyQuaternion(rotation));nail.quaternion.copy(rotation);}
    }
  }
  step(now){
    const a=this.action;if(!a)return;
    const p=(now-a.start)/a.duration;if(p>=1){this.seat.visible=false;this.action=null;return}
    this.seat.visible=this.ready;
    const reach=ease(p/.20)*(1-ease((p-.82)/.18));
    const lift=ease((p-.18)/.22)*(1-ease((p-.62)/.20));
    const held=p>=.18&&p<.82, smoke=a.kind==='smoke';
    const grip=ease((p-.10)/.095)*(1-ease((p-.78)/.08));
    this.pose(grip,a.kind);
    const x=2.8+(1-reach)*1.25-.94*lift;
    if(a.kind==='discard'){
      const cast=Math.sin(Math.PI*p);this.arm.position.set(2.4-1.8*cast,.52+.35*cast,6.2-3.05*cast);this.arm.rotation.set(-.08,0,0);this.held.visible=p<.53;
    }else{
      this.arm.position.set(x,.54+(1-reach)*.20+lift*2.55,5.8-reach*2.35+lift*1.38);
      this.arm.rotation.set(-.06-lift*.37,-.12,smoke?-.40*lift:-.24*lift);
      const prop=smoke?this.cig:this.cup;
      // Transform the grip point through the wrist, keeping the object in the fingers.
      const anchor=smoke?new T.Vector3(-.14,-.27,-1.43):new T.Vector3(-.48,-.43,-1.15);
      if(held){prop.position.copy(anchor.applyQuaternion(this.arm.quaternion)).add(this.arm.position);prop.quaternion.copy(this.arm.quaternion)}
      else{prop.position.copy(anchor).add(new T.Vector3(2.8,.54,3.45));prop.rotation.set(-.06,-.12,0)}
      if(smoke){prop.rotation.y-=1.18;prop.ember.material.emissiveIntensity=.4+lift*2.4}
    }
    for(let i=0;i<this.puffs.length;i++){
      const puff=this.puffs[i];puff.visible=a.kind!=='discard';if(!puff.visible)continue;
      const age=(p*2+i/this.puffs.length)%1;
      const origin=smoke?new T.Vector3(0,0,-.45).applyQuaternion(this.cig.quaternion).add(this.cig.position):this.cup.position.clone().add(new T.Vector3(0,.45,0));
      puff.position.copy(origin);puff.position.y+=age*.98;puff.position.x+=Math.sin(age*7+p*6)*age*.16;
      puff.scale.setScalar(.09+.30*age);puff.material.opacity=(1-age)*(smoke?.40:.18);
    }
  }
}

