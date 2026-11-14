import http from 'node:http';
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomController } from '../src/multiplayer/room-controller.js';
import { ROOM_PROTOCOL_VERSION } from '../src/config/network.js';
import { RoomStore } from './room-store.mjs';

const chapters = JSON.parse(readFileSync(new URL('../src/data/chapters.json',import.meta.url),'utf8')).data;
const enemies = JSON.parse(readFileSync(new URL('../src/data/enemies.json',import.meta.url),'utf8')).data;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const COMMANDS = new Set(['ready','start','chat','split','reunite','vote-start','vote','vote-resolve','battle-open','battle-action','battle-resolve']);
const hash = token => createHash('sha256').update(token).digest('hex');
const safeId = value => typeof value==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__','prototype','constructor'].includes(value);
function text(value, fallback, max) { if (value == null) return fallback; if (typeof value!=='string') throw new Error('文字欄位無效'); const clean=value.replace(/[\x00-\x1F\x7F]/g,'').trim(); if (!clean || clean.length>max) throw new Error(`文字長度須為 1～${max} 字`); return clean; }
function assertPacket(value, depth=0) {
  if (depth>12) throw new Error('訊息結構過深');
  if (value && typeof value==='object') for (const key of Object.keys(value)) { if (['__proto__','prototype','constructor'].includes(key)) throw new Error('訊息含不安全欄位'); assertPacket(value[key],depth+1); }
}
function cleanProfile(profile={}) { if (!profile || typeof profile!=='object' || Array.isArray(profile)) throw new Error('人物資料無效'); return {name:text(profile.name,'江湖旅人',30),characterId:null}; }

export function createRoomServer({origins=['http://localhost:4173','http://127.0.0.1:4173','https://yuiban76.github.io'],dataDirectory=null,now=()=>Date.now(),maxRooms=100,maxConnections=500,heartbeatMs=15000,sweepMs=1000,handshakeMs=10000,roomTtlMs=6*60*60*1000}={}) {
  const allowedOrigins=new Set(origins),rooms=new Map(),store=new RoomStore(dataDirectory);
  let stopping=false;
  const server=http.createServer((req,res)=>{
    const health=req.method==='GET'&&req.url==='/healthz';
    res.writeHead(health?200:404,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(health?{ok:true,protocolVersion:ROOM_PROTOCOL_VERSION}:{error:'Not found'}));
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    if (stopping || req.url!=='/rooms' || !allowedOrigins.has(req.headers.origin) || wss.clients.size>=maxConnections) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  function send(ws,message) {
    if (ws.readyState!==WebSocket.OPEN) return;
    if (ws.bufferedAmount>1024*1024) { ws.terminate(); return; }
    ws.send(JSON.stringify(message));
  }
  function roomObject(code,state=null,sessions=[]) {
    const controller=new RoomController({transport:{send:async()=>{}},isHost:true,playerId:state?.hostPlayerId,now});
    controller.state=state;
    return {code,controller,sessions:new Map(sessions),peers:new Map(),touchedAt:now()};
  }
  function broadcast(room) { for(const ws of room.peers.values())send(ws,{kind:'state',room:room.controller.state}); }
  function dispose(room,reason) {
    if (!rooms.has(room.code)) return;
    rooms.delete(room.code);store.remove(room.code);
    for(const ws of room.peers.values()){ws.room=null;send(ws,{kind:'room-closed',message:reason});ws.close(4000,'Room closed');}
  }
  function save(room) { store.write(room); }
  for(const saved of store.readAll()) {
    if (saved.version!==2 || !/^[A-Z2-9]{6}$/.test(saved.code) || saved.state?.protocolVersion!==2 || saved.state.status==='closed' || now()-saved.touchedAt>roomTtlMs) { if (/^[A-Z2-9]{6}$/.test(saved.code))store.remove(saved.code); continue; }
    const room=roomObject(saved.code,saved.state,saved.sessions);room.touchedAt=saved.touchedAt;
    for(const player of Object.values(room.controller.state.players)) if(player.connected)room.controller.disconnect(player.id);
    rooms.set(room.code,room);save(room);
  }
  function attach(ws,room,playerId) {
    const previous=room.peers.get(playerId);
    if (previous && previous!==ws) { previous.room=null;previous.close(4001,'Session replaced'); }
    ws.room=room;ws.playerId=playerId;room.peers.set(playerId,ws);clearTimeout(ws.handshakeTimer);
  }
  function sessionResult(room,playerId,token) { return {room:room.controller.state,session:{roomId:room.code,playerId,token,protocolVersion:ROOM_PROTOCOL_VERSION}}; }
  function normalizeCommand(room,message) {
    const type=message.type,payload=message.payload??{},context=message.context??{};
    if (!COMMANDS.has(type) || !payload || typeof payload!=='object' || Array.isArray(payload)) throw new Error('房間指令無效');
    if(room.controller.state.status==='lobby'&&['vote-start','vote','vote-resolve'].includes(type))throw new Error('隊伍出發後才能進行投票');
    let clean={};
    if(type==='ready'){if(typeof payload.ready!=='boolean')throw new Error('準備狀態無效');clean={ready:payload.ready};}
    if(type==='chat')clean={text:text(payload.text,'',300)};
    if(type==='split'){if(!['magistrate','escort'].includes(payload.lineId))throw new Error('行動線無效');clean={lineId:payload.lineId};}
    const chapter=chapters[room.controller.state.worldSummary.chapter-1];
    if(type==='vote-start')clean={id:`chapter_${chapter.chapter}_major`,choices:chapter.majorChoices.map(c=>c.id),flagKey:`chapter_${chapter.chapter}_room_choice`};
    if(['vote','vote-resolve'].includes(type)) {
      const vote=room.controller.state.vote;
      if(!vote || context.voteId!==vote.id || context.round!==vote.round)throw new Error('投票已更新，請依最新狀態重新選擇');
      if(type==='vote'){if(!safeId(payload.choiceId))throw new Error('投票選項無效');clean={choiceId:payload.choiceId};}
      else {if(payload.hostTieChoice!=null&&!safeId(payload.hostTieChoice))throw new Error('裁決選項無效');clean={hostTieChoice:payload.hostTieChoice};}
    }
    if(type==='battle-open') {
      const enemy=chapter.keyEnemyIds.map(id=>enemies.find(e=>e.id===id)).find(e=>e?.tier==='major_boss')??enemies.find(e=>e.id===chapter.keyEnemyIds[0]);
      clean={id:`chapter_${chapter.chapter}_room_battle`,enemyName:enemy?.name??'攔路高手',enemyHp:100+chapter.chapter*20};
    }
    if(['battle-action','battle-resolve'].includes(type)) {
      const battle=room.controller.state.battle;
      if(!battle || context.instanceId!==battle.instanceId || context.round!==battle.round)throw new Error('回合已更新，請依最新戰況出手');
      if(type==='battle-action'){if(!['attack','skill','defend','observe'].includes(payload.action))throw new Error('戰鬥行動無效');clean={action:payload.action};}
    }
    return {type,payload:clean};
  }
  function execute(ws,message) {
    if(message.protocolVersion!==ROOM_PROTOCOL_VERSION)throw new Error('連線版本不同，請重新整理遊戲');
    if(['create','join','resume'].includes(message.kind)) {
      if(ws.room)throw new Error('已在房間中，請先離房');
      let room,playerId,token;
      if(message.kind==='create') {
        if(rooms.size>=maxRooms)throw new Error('服務房間已滿，請稍後再試');
        let code;do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(rooms.has(code));
        playerId='p_'+randomBytes(12).toString('hex');token=randomBytes(32).toString('base64url');
        room=roomObject(code);room.controller.playerId=playerId;
        const chapter=message.chapter??1;if(!Number.isInteger(chapter)||chapter<1||chapter>8)throw new Error('章節無效');
        const country=message.country??'dasheng';if(!['dasheng','beishuo','nanli'].includes(country))throw new Error('國別無效');
        room.controller.state={roomId:code,protocolVersion:2,hostPlayerId:playerId,status:'lobby',visibility:'private',players:{[playerId]:{id:playerId,...cleanProfile(message.profile),ready:false,connected:true,lastSeenAt:now(),reconnectDeadline:null}},worldSummary:{worldId:null,worldName:text(message.worldName,'連線江湖',40),country,chapter,sceneId:'room_lobby'},revision:0,pendingCommands:{},authoritativeState:{},vote:null,battle:null,chat:[],actionLines:{together:[playerId]},reconnectDeadline:null,history:[]};
        room.sessions.set(playerId,{tokenHash:hash(token),receipts:[]});save(room);rooms.set(code,room);
      } else {
        if(typeof message.roomId!=='string'||!/^[A-Z2-9]{6}$/.test(message.roomId))throw new Error('請輸入六碼房號');
        room=rooms.get(message.roomId);if(!room)throw new Error('找不到房間，請確認房號或請房主重新開房');
        room.controller.expireConnections();if(room.controller.state.status==='closed'){dispose(room,room.controller.state.closedReason);throw new Error('房間已結束，請重新開房');}
        if(message.kind==='join') {
          if(room.controller.state.status!=='lobby')throw new Error('隊伍已出發，僅原成員可以重連');
          if(Object.keys(room.controller.state.players).length>=4)throw new Error('房間已滿（最多四人）');
          playerId='p_'+randomBytes(12).toString('hex');token=randomBytes(32).toString('base64url');
          room.controller.acceptJoin({playerId,payload:{profile:cleanProfile(message.profile)}});room.sessions.set(playerId,{tokenHash:hash(token),receipts:[]});save(room);
        } else {
          playerId=message.playerId;token=message.token;
          const session=room.sessions.get(playerId);
          if(typeof token!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(token)||!session||!timingSafeEqual(Buffer.from(hash(token),'hex'),Buffer.from(session.tokenHash,'hex')))throw new Error('重連憑證無效，請重新加入房間');
          room.controller.acceptReconnect({playerId});save(room);
        }
      }
      attach(ws,room,playerId);room.touchedAt=now();broadcast(room);
      return sessionResult(room,playerId,token);
    }
    const room=ws.room;if(!room||!rooms.has(room.code))throw new Error('請先建立或加入房間');
    if(message.kind==='ping')return {serverTime:now()};
    if(message.kind==='leave') {
      room.controller.leave(ws.playerId);room.sessions.delete(ws.playerId);room.peers.delete(ws.playerId);ws.room=null;broadcast(room);
      if(room.controller.state.status==='closed')dispose(room,room.controller.state.closedReason);else save(room);
      return {left:true};
    }
    if(message.kind==='sync')return {room:room.controller.state};
    if(message.kind!=='command')throw new Error('不支援的連線訊息');
    const session=room.sessions.get(ws.playerId),previous=session.receipts.find(r=>r.id===message.id);
    if(previous){if(previous.error)throw new Error(previous.error);return {revision:previous.revision,duplicate:true};}
    const before=structuredClone(room.controller.state);
    try{
      const command=normalizeCommand(room,message);
      room.controller.apply({...command,playerId:ws.playerId});
      session.receipts.push({id:message.id,revision:room.controller.state.revision});session.receipts=session.receipts.slice(-128);
      room.touchedAt=now();save(room);broadcast(room);
      return {revision:room.controller.state.revision};
    }catch(error){room.controller.state=before;session.receipts.push({id:message.id,error:error.message});session.receipts=session.receipts.slice(-128);save(room);throw error;}
  }
  wss.on('connection',ws=>{
    ws.alive=true;ws.room=null;ws.rate={count:0,start:now()};
    ws.handshakeTimer=setTimeout(()=>ws.close(4003,'Handshake timeout'),handshakeMs);ws.handshakeTimer.unref?.();
    ws.on('pong',()=>{ws.alive=true;});
    ws.on('error',()=>{});
    ws.on('message',(data,binary)=>{
      if(binary){ws.close(1003,'Text messages only');return;}
      if(now()-ws.rate.start>=1000)ws.rate={count:0,start:now()};
      if(++ws.rate.count>25){ws.close(4008,'Too many requests');return;}
      let message;
      try{message=JSON.parse(data.toString());assertPacket(message);if(!message||Array.isArray(message)||!safeId(message.id))throw new Error('訊息編號無效');
        const result=execute(ws,message);send(ws,{kind:'response',id:message.id,ok:true,result});
      }catch(error){send(ws,{kind:'response',id:typeof message?.id==='string'?message.id:null,ok:false,error:error.message});}
    });
    ws.on('close',()=>{
      clearTimeout(ws.handshakeTimer);const room=ws.room;
      if(room && rooms.has(room.code) && room.peers.get(ws.playerId)===ws){room.peers.delete(ws.playerId);room.controller.disconnect(ws.playerId);room.touchedAt=now();save(room);broadcast(room);}
    });
  });
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},heartbeatMs);heartbeat.unref?.();
  const sweep=setInterval(()=>{
    for(const room of rooms.values()){
      const revision=room.controller.state.revision;room.controller.expireConnections();
      if(room.controller.state.status==='closed'||now()-room.touchedAt>roomTtlMs){dispose(room,room.controller.state.closedReason??'房間已逾時');continue;}
      if(revision!==room.controller.state.revision){for(const id of room.sessions.keys())if(!room.controller.state.players[id])room.sessions.delete(id);save(room);broadcast(room);}
    }
  },sweepMs);sweep.unref?.();
  return {server,wss,rooms,
    listen:(port=8787,host='0.0.0.0')=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),
    close:async()=>{stopping=true;clearInterval(heartbeat);clearInterval(sweep);for(const ws of wss.clients){ws.close(1012,'Service restarting');ws.terminate();}await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}
  };
}
