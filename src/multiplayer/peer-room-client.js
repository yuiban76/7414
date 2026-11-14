import { RoomController } from './room-controller.js';
import { commandContext } from './network-config.js';
import { safeId,text,assertPacket,cleanProfile,normalizeRoomCommand } from './room-protocol.js';

export const PEER_SESSION_KEY='zhaoye:peer-room:v3';
export const PEER_PROTOCOL=3;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomHex=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const digest=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),n=>n.toString(16).padStart(2,'0')).join('');
const brokerId=code=>'zhaoye-v3-'+code;
let sdkPromise;
export async function loadPeerSdk(){
  if(globalThis.Peer)return globalThis.Peer;
  sdkPromise??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('../../assets/vendor/peerjs-1.5.5.min.js',import.meta.url).href;
    script.onload=()=>globalThis.Peer?resolve(globalThis.Peer):reject(new Error('PeerJS 載入失敗'));
    script.onerror=()=>{script.remove();sdkPromise=null;reject(new Error('連線元件載入失敗，請重新整理後再試'));};document.head.append(script);
  });
  return sdkPromise;
}

// The host browser is authoritative in this mode. The signalling service never
// receives room state, player commands or session tokens.
export class PeerRoomClient {
  constructor({catalog,storage=globalThis.sessionStorage,Peer,peerOptions={},now=()=>Date.now(),timeoutMs=15000,retryBaseMs=500,reconnectWindowMs=60000,heartbeatMs=10000}={}){
    Object.assign(this,{catalog,storage,Peer,peerOptions,now,timeoutMs,retryBaseMs,reconnectWindowMs,heartbeatMs});
    this.mode='peer';this.state=null;this.playerId=null;this.isHost=false;this.connectionStatus='idle';this.connectionMessage='';
    this.subscribers=new Set();this.pending=new Map();this.sessions=new Map();this.channels=new Map();this.incoming=new Set();this.queue=Promise.resolve();this.closed=false;
    this.transport={close:()=>this.close()};this.hide=()=>this.suspend();globalThis.addEventListener?.('pagehide',this.hide);
  }
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn);}
  emit(){for(const fn of this.subscribers)fn(this.state);}
  notify(status,message){this.connectionStatus=status;this.connectionMessage=message;this.emit();}
  static savedSession(storage=globalThis.sessionStorage){try{const s=JSON.parse(storage?.getItem(PEER_SESSION_KEY)??'null');return s?.protocolVersion===3&&/^[A-Z2-9]{6}$/.test(s.roomId)&&['host','guest'].includes(s.role)?s:null;}catch{return null;}}
  forget(){try{this.storage?.removeItem(PEER_SESSION_KEY);}catch{}}
  save(){
    if(!this.state||this.state.status==='closed')return;
    const value={protocolVersion:3,role:this.isHost?'host':'guest',roomId:this.state.roomId,playerId:this.playerId,savedAt:this.now()};
    if(this.isHost){value.state=this.authority.state;value.sessions=[...this.sessions];}else value.token=this.token;
    try{this.storage?.setItem(PEER_SESSION_KEY,JSON.stringify(value));}catch{}
  }
  async openPeer(id){
    const Peer=this.Peer??await loadPeerSdk();if(this.closed)throw new Error('連線已取消');
    this.notify('connecting','正在連接免費接應服務…');
    return new Promise((resolve,reject)=>{
      const peer=new Peer(id,{secure:true,debug:0,...this.peerOptions});this.peer=peer;
      const timer=setTimeout(()=>reject(new Error('無法連上接應服務，請稍後重試或更換網路')),this.timeoutMs);this.openTimer=timer;timer.unref?.();
      this.openReject=reject;
      peer.on('open',()=>{clearTimeout(timer);this.openReject=null;resolve();});
      peer.on('connection',connection=>{if(this.isHost&&!this.closed)this.acceptChannel(connection);else connection.close();});
      peer.on('disconnected',()=>{if(!this.closed)this.reconnectSignal();});
      peer.on('error',error=>{
        const message=error.type==='unavailable-id'?'房號仍在使用中，請關閉舊房主分頁或重新開房':error.type==='peer-unavailable'?'找不到房間，請確認房號與房主分頁是否仍開啟':'連線失敗；請稍後重試、改用其他網路，或檢查防火牆與 TURN 設定';
        if(this.openReject){clearTimeout(timer);this.openReject(new Error(message));this.openReject=null;}
        else if(this.dialReject)this.dialReject(new Error(message));
        else if(!this.closed&&peer.disconnected)this.reconnectSignal();
      });
      peer.on('close',()=>{if(!this.closed){if(this.isHost)this.notify('disconnected','房主連線已中斷，請重連或重新開房');else this.scheduleReconnect();}});
    });
  }
  reconnectSignal(){
    if(this.signalTimer||this.closed||this.peer?.destroyed)return;
    this.signalTimer=setTimeout(()=>{this.signalTimer=null;if(this.closed)return;try{if(this.peer.disconnected)this.peer.reconnect();}catch{}if(this.peer.disconnected)this.reconnectSignal();},2000);this.signalTimer.unref?.();
  }
  async create(options={}){
    this.isHost=true;const bytes=crypto.getRandomValues(new Uint8Array(6));this.code=Array.from(bytes,n=>alphabet[n%alphabet.length]).join('');
    try{
      await this.openPeer(brokerId(this.code));
      const chapter=options.chapter??1,country=options.country??'dasheng';if(!Number.isInteger(chapter)||chapter<1||chapter>8||!['dasheng','beishuo','nanli'].includes(country))throw new Error('房間章節或國別無效');
      this.playerId='p_'+randomHex(12);this.authority=new RoomController({transport:{connect:async()=>{},send:async()=>{}},isHost:true,playerId:this.playerId,now:this.now});
      await this.authority.create({...options,worldName:text(options.worldName,'連線江湖',40),country,chapter,profile:cleanProfile(options.profile)});
      this.authority.state.roomId=this.code;this.authority.state.protocolVersion=3;this.sessions.set(this.playerId,{receipts:[]});
      this.publish();this.startTimers();this.notify('connected','WebRTC 已連線，房主分頁請保持開啟');return this.state;
    }catch(error){this.shutdown(error.message);throw error;}
  }
  async join(code,profile={}){
    this.code=code;if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('請輸入六碼房號');
    try{await this.openPeer();await this.dial();const result=await this.request('join',{profile:cleanProfile(profile)});this.acceptSession(result);this.startTimers();this.notify('connected','WebRTC 已連線');return this.state;}
    catch(error){this.shutdown(error.message);throw error;}
  }
  async resume(saved){
    this.code=saved.roomId;
    try{
      if(saved.role==='host'){
        if(this.now()-saved.savedAt>this.reconnectWindowMs||saved.state?.protocolVersion!==3||saved.state.hostPlayerId!==saved.playerId||saved.state.roomId!==saved.roomId)throw new Error('房主重連時限已過，請重新建立房間');
        this.isHost=true;this.playerId=saved.playerId;await this.openPeer(brokerId(this.code));
        this.authority=new RoomController({transport:{send:async()=>{}},isHost:true,playerId:this.playerId,now:this.now});this.authority.state=structuredClone(saved.state);this.sessions=new Map(saved.sessions);
        const s=this.authority.state;if(s.status==='closed')throw new Error('房間已結束');
        if(s.status==='paused'){s.status=s.resumeStatus??'playing';s.reconnectDeadline=null;delete s.resumeStatus;}
        for(const player of Object.values(s.players))if(player.id!==this.playerId){player.connected=false;player.ready=false;player.reconnectDeadline=this.now()+Math.max(0,this.reconnectWindowMs-(this.now()-saved.savedAt));}
        s.players[this.playerId].connected=true;s.players[this.playerId].reconnectDeadline=null;this.authority.bump('reconnect',this.playerId);this.publish();
      }else{
        this.playerId=saved.playerId;this.token=saved.token;await this.openPeer();await this.dial();this.acceptSession(await this.request('resume',{playerId:this.playerId,token:this.token}));
      }
      this.startTimers();this.notify('connected','WebRTC 已恢復連線');return this.state;
    }catch(error){this.forget();this.shutdown(error.message);throw error;}
  }
  acceptState(state){
    if(state?.protocolVersion!==3||state.roomId!==this.code||!Number.isInteger(state.revision)||!state.players)throw new Error('房間資料無效');
    if(!this.state||state.revision>=this.state.revision){this.state=structuredClone(state);this.emit();}
  }
  acceptSession({room,playerId,token}){this.playerId=playerId;this.token=token;this.acceptState(room);this.save();}
  publish(){this.state=structuredClone(this.authority.state);this.save();for(const connection of this.channels.values())this.send(connection,{kind:'state',room:this.state});this.emit();}
  send(connection,message){if(connection?.open){if((connection.bufferSize??0)>256){connection.close();return;}try{connection.send({...message,protocolVersion:3})?.catch?.(()=>connection.close());}catch{connection.close();}}}
  dial(){
    return new Promise((resolve,reject)=>{
      if(this.closed){reject(new Error('連線已取消'));return;}
      const connection=this.peer.connect(brokerId(this.code),{reliable:true,label:'zhaoye-v3',serialization:'binary'});this.connection=connection;this.dialReject=reject;
      const timer=setTimeout(()=>{connection.close();reject(new Error('無法與房主建立直連；請確認房號、保持房主分頁開啟，或更換網路／設定 TURN'));},this.timeoutMs);timer.unref?.();
      connection.on('open',()=>{clearTimeout(timer);this.dialReject=null;resolve();});
      connection.on('data',packet=>{if(this.connection===connection)this.receive(packet);});
      connection.on('error',()=>{clearTimeout(timer);reject(new Error('與房主連線失敗，請更換網路或檢查 TURN 設定'));});
      connection.on('close',()=>{clearTimeout(timer);if(this.connection!==connection||this.closed)return;if(this.token)this.scheduleReconnect();else reject(new Error('房主連線已關閉，請重新加入'));});
    });
  }
  receive(packet){
    try{
      if(!packet||packet.protocolVersion!==3||JSON.stringify(packet).length>1024*1024)throw new Error('房間訊息無效');assertPacket(packet);
      if(packet.kind==='response'){
        const pending=this.pending.get(packet.id);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(packet.id);
        if(packet.ok)pending.resolve(packet.result);else pending.reject(new Error(packet.error||'房間操作失敗'));
      }else if(packet.kind==='state'){if(this.playerId)this.acceptState(packet.room);}
      else if(packet.kind==='probe')this.send(this.connection,{kind:'pong',id:'pong_'+randomHex(8)});
      else if(packet.kind==='room-closed'){
        this.send(this.connection,{kind:'closed-ack',id:'ack_'+randomHex(8)});if(this.state)this.state.status='closed';if(this.state)this.state.closedReason=packet.message;
        this.forget();this.notify('disconnected',packet.message);this.closed=true;setTimeout(()=>this.shutdown(packet.message),200);
      }
    }catch(error){this.shutdown(error.message);}
  }
  request(kind,values={},id='r_'+randomHex(16)){
    if(!this.connection?.open||this.closed)return Promise.reject(new Error('目前連線中斷，請等待重連'));
    const packet={...values,kind,id,protocolVersion:3};
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('房主尚未回覆，請查看連線狀態後重試'));},kind==='command'?this.reconnectWindowMs:this.timeoutMs);timer.unref?.();
      this.pending.set(id,{packet,resolve,reject,timer});this.send(this.connection,packet);
    });
  }
  acceptChannel(connection){
    if(this.incoming.size>=8){connection.close();return;}this.incoming.add(connection);
    const meta={playerId:null,lastSeen:this.now(),count:0,start:this.now()};connection.roomMeta=meta;
    const timer=setTimeout(()=>{if(!meta.playerId)connection.close();},this.timeoutMs);timer.unref?.();
    connection.on('data',packet=>{
      this.queue=this.queue.then(async()=>{
        try{
          if(this.closed||!connection.open)return;
          if(this.now()-meta.start>1000){meta.count=0;meta.start=this.now();}if(++meta.count>25){connection.close();return;}
          if(!packet||packet.protocolVersion!==3||!safeId(packet.id)||JSON.stringify(packet).length>16384)throw new Error('連線訊息或版本無效');assertPacket(packet);meta.lastSeen=this.now();
          if(packet.kind==='pong')return;if(packet.kind==='closed-ack'){meta.ack?.();return;}
          const result=await this.hostRequest(connection,packet);this.send(connection,{kind:'response',id:packet.id,ok:true,result});
          if(meta.playerId)clearTimeout(timer);
        }catch(error){this.send(connection,{kind:'response',id:typeof packet?.id==='string'?packet.id:null,ok:false,error:error.message});}
      });
    });
    connection.on('error',()=>{});
    connection.on('close',()=>{
      clearTimeout(timer);this.incoming.delete(connection);meta.ack?.();
      if(!this.closed&&meta.playerId&&this.channels.get(meta.playerId)===connection){this.channels.delete(meta.playerId);this.authority.disconnect(meta.playerId);this.authority.bump('disconnect',meta.playerId);this.publish();}
    });
  }
  async hostRequest(connection,packet){
    const s=this.authority.state,meta=connection.roomMeta;
    if(['join','resume'].includes(packet.kind)){
      if(meta.playerId)throw new Error('已加入房間');this.authority.expireConnections();if(s.status==='closed')throw new Error('房間已結束');
      let playerId,token;
      if(packet.kind==='join'){
        if(s.status!=='lobby')throw new Error('隊伍已出發，僅原成員可以重連');if(Object.keys(s.players).length>=4)throw new Error('房間已滿（最多四人）');
        playerId='p_'+randomHex(12);token=randomHex(32);const tokenHash=await digest(token);
        this.authority.acceptJoin({playerId,payload:{profile:cleanProfile(packet.profile)}});this.sessions.set(playerId,{tokenHash,receipts:[]});
      }else{
        playerId=packet.playerId;token=packet.token;const session=this.sessions.get(playerId);
        if(playerId===s.hostPlayerId||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!session||await digest(token)!==session.tokenHash)throw new Error('重連憑證無效');
        this.authority.acceptReconnect({playerId});
      }
      const previous=this.channels.get(playerId);this.channels.set(playerId,connection);meta.playerId=playerId;previous?.close();this.publish();
      return {room:this.state,playerId,token};
    }
    if(!meta.playerId||!s.players[meta.playerId]||this.channels.get(meta.playerId)!==connection)throw new Error('請先加入房間');
    if(packet.kind==='ping')return {time:this.now()};
    if(packet.kind==='leave'){
      this.authority.leave(meta.playerId);this.sessions.delete(meta.playerId);this.channels.delete(meta.playerId);meta.playerId=null;this.publish();return {left:true};
    }
    if(packet.kind!=='command')throw new Error('不支援的房間訊息');
    return this.apply(meta.playerId,packet);
  }
  apply(playerId,packet){
    const session=this.sessions.get(playerId);if(!session)throw new Error('玩家不在房間中');
    const prior=session.receipts.find(r=>r.id===packet.id);if(prior){if(prior.error)throw new Error(prior.error);return {duplicate:true,revision:prior.revision};}
    const before=structuredClone(this.authority.state);
    try{
      const command=normalizeRoomCommand(this.authority.state,packet,this.catalog);this.authority.apply({...command,playerId});
      session.receipts.push({id:packet.id,revision:this.authority.state.revision});session.receipts=session.receipts.slice(-128);this.publish();return {revision:this.state.revision};
    }catch(error){this.authority.state=before;session.receipts.push({id:packet.id,error:error.message});session.receipts=session.receipts.slice(-128);this.save();throw error;}
  }
  async command(type,payload={}){
    if(this.closed||this.connectionStatus!=='connected')throw new Error('正在重連，請等連線恢復後再操作');
    const packet={kind:'command',id:'r_'+randomHex(16),type,payload,context:commandContext(this.state,type)};
    if(this.isHost)return this.apply(this.playerId,packet);return this.request('command',packet,packet.id);
  }
  startTimers(){
    clearInterval(this.heartbeatTimer);this.heartbeatTimer=setInterval(()=>{
      if(this.closed)return;
      if(this.isHost){
        const revision=this.authority.state.revision;this.authority.expireConnections();if(this.authority.state.status==='closed'){this.leave();return;}
        for(const [id,connection]of this.channels){if(this.now()-connection.roomMeta.lastSeen>this.heartbeatMs*3)connection.close();else this.send(connection,{kind:'probe'});}
        for(const id of this.sessions.keys())if(!this.authority.state.players[id])this.sessions.delete(id);
        if(revision!==this.authority.state.revision)this.publish();else this.save();
      }else if(this.connectionStatus==='connected')this.request('ping').catch(()=>{if(!this.closed)this.connection?.close();});
    },this.heartbeatMs);this.heartbeatTimer.unref?.();
  }
  scheduleReconnect(){
    if(this.closed||this.retryTimer)return;
    if(this.connectionStatus!=='reconnecting')this.reconnectDeadline=this.now()+this.reconnectWindowMs;
    if(this.now()>=this.reconnectDeadline){this.shutdown('重連等待已結束，請房主重新開房');return;}
    this.notify('reconnecting','與房主暫時失聯，正在重連；請保持房主分頁開啟。');
    const delay=Math.min(this.retryBaseMs*2**Math.min(this.retryAttempt??0,4),5000,this.reconnectDeadline-this.now());this.retryAttempt=(this.retryAttempt??0)+1;
    this.retryTimer=setTimeout(async()=>{
      this.retryTimer=null;
      try{
        if(this.closed)return;if(this.peer.destroyed)throw new Error('接應連線已關閉');await this.dial();this.acceptSession(await this.request('resume',{playerId:this.playerId,token:this.token}));
        this.retryAttempt=0;this.notify('connected','WebRTC 已恢復連線');for(const pending of this.pending.values())if(pending.packet.kind==='command')this.send(this.connection,pending.packet);
      }catch{this.scheduleReconnect();}
    },delay);this.retryTimer.unref?.();
  }
  async leave(){
    try{
      if(this.isHost&&this.authority){
        this.authority.leave(this.playerId);this.state=structuredClone(this.authority.state);
        await Promise.all([...this.channels.values()].map(connection=>new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();connection.roomMeta.ack=()=>{clearTimeout(timer);resolve();};this.send(connection,{kind:'room-closed',message:'房主已結束房間'});}))); 
      }else if(this.connection?.open&&!this.closed)await this.request('leave');
    }finally{this.forget();this.shutdown('已離開房間');}
  }
  suspend(){this.save();this.shutdown('分頁已離開，可在一分鐘內重連');}
  shutdown(message){
    this.closed=true;clearInterval(this.heartbeatTimer);clearTimeout(this.retryTimer);clearTimeout(this.signalTimer);clearTimeout(this.openTimer);this.retryTimer=null;
    this.openReject?.(new Error(message));this.openReject=null;this.dialReject?.(new Error(message));this.dialReject=null;
    for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error(message));}this.pending.clear();
    this.peer?.destroy();globalThis.removeEventListener?.('pagehide',this.hide);this.notify('disconnected',message);
  }
  async close(){this.save();this.shutdown('已離開房間');}
}
