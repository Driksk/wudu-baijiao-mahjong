import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {roomRequest} from '../lib/room-service.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pub=path.join(root,'public'),state=path.join(root,'.local');
fs.mkdirSync(state,{recursive:true});
const sqlite=new DatabaseSync(path.join(state,'rooms.sqlite'));
sqlite.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY,state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,expires INTEGER NOT NULL)');
const db={prepare(sql){
 return {bind(...values){
  return {
   async first(){return sqlite.prepare(sql).get(...values)||null},
   async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}}
  };
 }};
}};
const port=Number(process.env.PORT||5188);
const addresses=()=>Object.entries(os.networkInterfaces()).flatMap(([label,entries])=>entries.filter(x=>x.family==='IPv4'&&!x.internal&&!x.address.startsWith('169.254.')).map(x=>({label,url:`http://${x.address}:${port}/game.html`})));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{try{
 const origin=`http://${req.headers.host}`,url=new URL(req.url,origin);
 if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,service:'wudu-lan',addresses:addresses()}));return}
 if(url.pathname==='/connect'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>手机连接武都摆叫</title><style>body{background:#102923;color:#f7e9cf;font:18px/1.8 system-ui;padding:5vw;max-width:800px;margin:auto}a{color:#f4bccc}li{margin:20px 0}code{word-break:break-all}p{color:#bcd0c4}</style><h1>手机连接武都摆叫</h1><p>电脑和手机连接同一个 Wi-Fi；在手机浏览器输入下面的无线网络地址。电脑需保持开机。</p><ul>${addresses().map(a=>`<li>${a.label}<br><a href="${a.url}">${a.url}</a></li>`).join('')}</ul><p>优先选择 WLAN / Wi-Fi。手机不要输入 127.0.0.1。若仍打不开，检查手机是否连接访客网络、路由器是否禁止设备互访。</p><a href="/game.html">在电脑上进入游戏</a>`);return;
 }
 if(url.pathname==='/api/room'){
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>6000){res.writeHead(413);res.end('Request too large');return}}
  const result=await roomRequest(new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}),db);
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
 }
 const rel=decodeURIComponent(url.pathname==='/'||url.pathname==='/game'?'/game.html':url.pathname);
 const target=path.resolve(pub,'.'+rel);if(!target.startsWith(pub+path.sep)){res.writeHead(403);res.end();return}
 if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return}
 res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(target).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)res.writeHead(500);res.end('本地服务异常，请查看启动日志。')}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'端口5188已被占用，请先关闭旧服务。':e);process.exitCode=1});
server.listen(port,'0.0.0.0',()=>{fs.writeFileSync(path.join(state,'server.pid'),String(process.pid));console.log('武都摆叫局域网服务已启动');console.log(addresses());});
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(()=>{sqlite.close();process.exit(0)}));

