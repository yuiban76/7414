import { WebSocketRoomTransport } from './websocket-transport.js';
import { commandContext } from './network-config.js';
import { ROOM_PROTOCOL_VERSION } from '../config/network.js';

export const ROOM_SESSION_KEY='zhaoye:room-session:v2';
export class RemoteRoomClient {
  constructor({url,storage=globalThis.sessionStorage,transportOptions={}}) {
    this.storage=storage;this.state=null;this.playerId=null;this.isHost=false;this.mode='online';this.subscribers=new Set();
    this.transport=new WebSocketRoomTransport({...transportOptions,url,onEvent:packet=>this.receive(packet)});
  }
  get connectionStatus(){return this.transport.status;}
  get connectionMessage(){return this.transport.message;}
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn);}
  emit(){for(const fn of this.subscribers)fn(this.state);}
  async create(options={}){await this.transport.connect();try{const result=await this.transport.request('create',options);this.acceptSession(result);return this.state;}catch(error){this.transport.stop(error.message);throw error;}}
  async join(roomId,profile={}){await this.transport.connect();try{const result=await this.transport.request('join',{roomId,profile});this.acceptSession(result);return this.state;}catch(error){this.transport.stop(error.message);throw error;}}
  async resume(session){await this.transport.connect();try{const result=await this.transport.request('resume',session);this.acceptSession(result);return this.state;}catch(error){this.forget();this.transport.stop(error.message);throw error;}}
  acceptSession({room,session}){
    this.playerId=session.playerId;this.transport.session=session;
    try{this.storage?.setItem(ROOM_SESSION_KEY,JSON.stringify({...session,serverUrl:this.transport.url}));}catch{}
    this.acceptState(room);this.isHost=room.hostPlayerId===this.playerId;this.emit();
  }
  acceptState(room){
    if(room?.protocolVersion!==ROOM_PROTOCOL_VERSION||!Number.isInteger(room.revision)||!room.players||!['lobby','playing','paused','closed'].includes(room.status))throw new Error('服務回傳的房間資料無效');
    if(this.state&&room.roomId!==this.state.roomId)throw new Error('房間資料不符');
    if(!this.state||room.revision>=this.state.revision){this.state=room;this.isHost=room.hostPlayerId===this.playerId;this.emit();}
  }
  receive(packet){
    if(packet.kind==='state'){if(this.playerId)this.acceptState(packet.room);}
    else if(packet.kind==='session')this.acceptSession(packet);
    else if(packet.kind==='room-closed'){if(this.state){this.state.status='closed';this.state.closedReason=packet.message;}this.forget();this.emit();}
    else if(packet.kind==='connection')this.emit();
  }
  async command(type,payload={}){
    if(!this.state)throw new Error('尚未加入房間');
    return this.transport.request('command',{type,payload,context:commandContext(this.state,type)});
  }
  forget(){try{this.storage?.removeItem(ROOM_SESSION_KEY);}catch{}}
  async leave(){try{if(this.connectionStatus==='connected')await this.transport.request('leave');}finally{this.forget();await this.transport.close();}}
  async close(){await this.transport.close();}
  static savedSession(storage=globalThis.sessionStorage){try{const value=JSON.parse(storage?.getItem(ROOM_SESSION_KEY)??'null');return value?.protocolVersion===ROOM_PROTOCOL_VERSION&&typeof value.token==='string'&&typeof value.serverUrl==='string'?value:null;}catch{return null;}}
}
