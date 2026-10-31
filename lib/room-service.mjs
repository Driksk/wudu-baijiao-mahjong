
import { config,player,act,tick,view } from "./mahjong.mjs";
import {newSeries,startRound,seriesView} from "./match-series.mjs";
export async function roomRequest(req, db) {
const json=(v,status=200)=>Response.json(v,{status,headers:{"Cache-Control":"no-store"}});
async function digest(s){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("")}
function randomToken(){return crypto.randomUUID()+crypto.randomUUID()}
function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",a=crypto.getRandomValues(new Uint8Array(8));return Array.from(a,n=>chars[n%32]).join("")}
function database(){if(!db)throw Error("房间数据库未连接，请稍后再试");return db}
async function ensureSchema(){
 if(!db)throw Error("房间数据库未连接，请稍后再试");
 await db.prepare("CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL)").bind().run();
 return db;
}
function sameOrigin(req){
 const origin=req.headers.get("origin");
 if(!origin)return true;
 try{
  const incoming=new URL(origin);
  const forwarded=(req.headers.get("x-forwarded-host")||req.headers.get("host")||"").split(",")[0].trim();
  const requestHost=new URL(req.url).host;
  return incoming.host===forwarded||incoming.host===requestHost||origin===new URL(req.url).origin;
 }catch{return false}
}
async function getRoom(code){if(!/^[A-Z2-9]{8}$/.test(code))throw Error("房间码为8位字母或数字");const row=await database().prepare("SELECT * FROM rooms WHERE code = ? AND expires > ?").bind(code,Date.now()).first();if(!row)throw Error("房间不存在或已过期（有效期24小时）");return row}
function packet(row,g,i){const v=view(g,i);v.p.forEach((p,j)=>{p.character=g.p[j].character||['yan','ning','yue'][j%3]});return {code:row.code,version:row.version,expires:row.expires,game:{...v,series:seriesView(g),emote:g.emote||null}}}
async function save(row,g){const r=await database().prepare("UPDATE rooms SET state = ?, version = version + 1 WHERE code = ? AND version = ?").bind(JSON.stringify(g),row.code,row.version).run();if(r.meta.changes!==1)return false;row.version++;return true}
async function identity(req,g){const token=req.headers.get("authorization")?.replace(/^Bearer /,"")||"";if(!token)throw Error("请先加入房间");const hash=await digest(token),i=g.p.findIndex((p)=>p.token===hash&&!p.bot);if(i<0)throw Error("没有此房间的玩家身份");return i}
async function GET(req){try{
 await ensureSchema();
 const row=await getRoom(new URL(req.url).searchParams.get("code")?.toUpperCase()||""),g=JSON.parse(row.state),i=await identity(req,g);
 if(tick(g)&&!await save(row,g))return json({error:"牌局已更新，请刷新",conflict:true},409);
 return json(packet(row,g,i));
 }catch(e){return json({error:e instanceof Error?e.message:"读取失败"},400)}}
async function POST(req){try{
 await ensureSchema();
 if(!sameOrigin(req))return json({error:"请求来源不符"},403);
 const text=await req.text();if(text.length>6000)return json({error:"请求过大"},413);const b=JSON.parse(text);
 if(b.op==="create"){
  const token=randomToken(),rules=config(b.rules),name=String(b.name||"玩家").trim().slice(0,12)||"玩家";
  const g={phase:"lobby",rules,series:newSeries(b.rounds),p:[player(name,await digest(token))]};
  g.p[0].character=['yan','ning','yue'].includes(b.character)?b.character:'yan';
  if(b.practice){for(let i=1;i<4;i++)g.p.push(player("电脑"+i,"",true));startRound(g);tick(g)}
  const code=roomCode(),expires=Date.now()+86400000;
  await database().prepare("INSERT INTO rooms (code,state,version,expires) VALUES (?,?,0,?)").bind(code,JSON.stringify(g),expires).run();
  try{await database().prepare("DELETE FROM rooms WHERE expires < ?").bind(Date.now()-86400000).run()}catch{}
  return json({...packet({code,version:0,expires},g,0),token});
 }
 const row=await getRoom(String(b.code||"").toUpperCase()),g=JSON.parse(row.state);
 if(b.op==="join"){
  if(g.phase!=="lobby"||g.p.length>=4)throw Error("房间已开局或已满");
  const token=randomToken();g.p.push(player(String(b.name||"好友").trim().slice(0,12)||"好友",await digest(token)));
  g.p[g.p.length-1].character=['yan','ning','yue'].includes(b.character)?b.character:'yan';
  if(!await save(row,g))return json({error:"有人同时加入，请重试",conflict:true},409);
  return json({...packet(row,g,g.p.length-1),token});
 }
 const i=await identity(req,g);
 if(b.version!==row.version)return json({error:"牌局已更新，本次操作未提交，请重试",conflict:true},409);
 if(b.op==="start"){if(i!==0)throw Error("只有房主可开局");startRound(g)}
 else if(b.op==="fill"){if(i!==0||g.phase!=="lobby")throw Error("只有房主能在开局前补电脑");while(g.p.length<4)g.p.push(player("电脑"+g.p.length,"",true))}
 else if(b.op==="action")act(g,i,b.action||{});
 else if(b.op==="emote"){
  if(!['tea','smoke','talk0','talk1','talk2','talk3'].includes(b.kind))throw Error('未知桌边动作');
  if(g.emote?.seat===i&&Date.now()-g.emote.at<2000)throw Error('稍等两秒再发');
  g.emote={id:crypto.randomUUID(),seat:i,kind:b.kind,at:Date.now()};
 }
 else throw Error("未知操作");
 tick(g);if(!await save(row,g))return json({error:"牌局已更新，本次操作未提交，请重试",conflict:true},409);
 return json(packet(row,g,i));
 }catch(e){return json({error:e instanceof Error?e.message:"操作失败"},400)}}

return req.method==='GET'?GET(req):req.method==='POST'?POST(req):json({error:'不支持的请求'},405);
}



