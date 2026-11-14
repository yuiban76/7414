import { ROOM_PROTOCOL_VERSION } from '../config/network.js';
import { normalizeRoomServer } from './network-config.js';

export class WebSocketRoomTransport {
  constructor({url,socketFactory=value=>new WebSocket(value),onEvent=()=>{},now=()=>Date.now(),reconnectWindowMs=60000,initialWindowMs=75000,retryBaseMs=500,requestTimeoutMs=60000,connectTimeoutMs=10000,heartbeatMs=15000}={}) {
    this.url=normalizeRoomServer(url);this.socketFactory=socketFactory;this.onEvent=onEvent;this.now=now;
    Object.assign(this,{reconnectWindowMs,initialWindowMs,retryBaseMs,requestTimeoutMs,connectTimeoutMs,heartbeatMs});
    this.pending=new Map();this.status='idle';this.message='';this.session=null;this.socket=null;this.closed=false;this.attempt=0;this.counter=0;
  }
  notify(status,message='') { this.status=status;this.message=message;this.onEvent({kind:'connection',status,message}); }
  async connect() {
    this.closed=false;this.initialConnecting=true;const deadline=this.now()+this.initialWindowMs;let attempt=0;
    try{
      while(!this.closed){
        try{await this.open(false,Math.max(1,Math.min(this.connectTimeoutMs,deadline-this.now())));return;}
        catch(error){
          if(this.closed)throw error;
          if(this.now()>=deadline){this.stop(error.message);throw error;}
          this.notify('connecting','連線服務可能正在啟動，正在重試；也可以取消後檢查網址。');
          await new Promise(resolve=>{this.initialRetryResolve=resolve;this.initialRetryTimer=setTimeout(resolve,Math.min(this.retryBaseMs*2**Math.min(attempt++,4),5000,deadline-this.now()));});
          this.initialRetryResolve=null;
        }
      }
      throw new Error('連線已取消');
    }finally{this.initialConnecting=false;}
  }
  open(reconnecting,timeoutMs=this.connectTimeoutMs) {
    return new Promise((resolve,reject)=>{
      if(this.closed){reject(new Error('連線已關閉'));return;}
      this.openReject=reject;
      this.notify(reconnecting?'reconnecting':'connecting',reconnecting?'連線中斷，正在重新連線…':'正在連接房間服務…');
      let socket;
      try{socket=this.socketFactory(this.url);}catch(error){reject(error);return;}
      this.socket=socket;
      let opened=false;
      const timer=setTimeout(()=>{if(this.socket===socket)socket.close();reject(new Error('服務尚未回應。若主機正在喚醒，請稍後重試；也請確認服務網址'));},timeoutMs);timer.unref?.();
      socket.addEventListener('open',async()=>{
        opened=true;clearTimeout(timer);
        try{
          if(reconnecting){
            const result=await this.request('resume',this.session,{internal:true,timeoutMs:Math.max(1,this.reconnectDeadline-this.now())});
            this.session=result.session;this.onEvent({kind:'session',...result});
            for(const [id,item]of this.pending)if(item.packet.kind==='command')socket.send(JSON.stringify({...item.packet,id}));
          }
          this.attempt=0;this.openReject=null;this.notify('connected','已連線');this.startHeartbeat();resolve();
        }catch(error){this.stop(error.message);reject(error);}
      });
      socket.addEventListener('message',event=>{
        if(this.socket!==socket)return;
        try{
          if(typeof event.data!=='string'||event.data.length>1024*1024)throw new Error('房間訊息過大或無效');
          const packet=JSON.parse(event.data);
          if(packet.kind==='response'){
            const request=this.pending.get(packet.id);if(!request)return;
            this.pending.delete(packet.id);clearTimeout(request.timer);
            if(packet.ok)request.resolve(packet.result);else request.reject(new Error(packet.error||'房間操作未完成'));
          }else if(packet.kind==='state')this.onEvent(packet);
          else if(packet.kind==='room-closed'){this.onEvent(packet);this.stop(packet.message||'房間已結束');}
        }catch(error){this.stop(error.message);}
      });
      socket.addEventListener('error',()=>{});
      socket.addEventListener('close',event=>{
        clearTimeout(timer);if(this.socket!==socket)return;
        clearInterval(this.heartbeatTimer);
        if(this.closed){if(!opened)reject(new Error('連線已取消'));return;}
        if(event.code===4001){this.stop('房間已在另一個分頁恢復，這個分頁已離線');return;}
        if(!this.session){
          const message='無法連上房間服務。若主機正在喚醒，請稍後重試，或確認服務網址';
          if(!opened&&this.initialConnecting){reject(new Error(message));return;}
          this.stop(message);if(!opened)reject(new Error(this.message));return;
        }
        if(this.status!=='reconnecting')this.reconnectDeadline=this.now()+this.reconnectWindowMs;
        this.scheduleReconnect();
        if(!opened)reject(new Error('重新連線失敗'));
      });
    });
  }
  scheduleReconnect() {
    clearTimeout(this.retryTimer);
    if(this.now()>=this.reconnectDeadline){this.stop('重連等待已結束，請重新建立或加入房間');return;}
    this.notify('reconnecting','連線中斷，正在重連；世界操作暫停，最長等待 60 秒。');
    const delay=Math.min(this.retryBaseMs*2**Math.min(this.attempt++,4),5000,this.reconnectDeadline-this.now());
    this.retryTimer=setTimeout(()=>{this.open(true).catch(()=>{if(!this.closed&&this.status==='reconnecting')this.scheduleReconnect();});},delay);this.retryTimer.unref?.();
  }
  startHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer=setInterval(()=>{
      if(this.status!=='connected'||!this.session)return;
      this.request('ping',{}, {timeoutMs:5000}).catch(()=>{if(!this.closed)this.socket?.close();});
    },this.heartbeatMs);this.heartbeatTimer.unref?.();
  }
  request(kind,values={}, {internal=false,timeoutMs=this.requestTimeoutMs,id}={}) {
    if(this.closed||this.socket?.readyState!==1||(!internal&&this.status!=='connected'))return Promise.reject(new Error('目前正在重連，請等恢復連線後再操作'));
    const requestId=id??`r_${globalThis.crypto?.randomUUID?.()??`${this.now()}_${++this.counter}`}`;
    if(this.pending.has(requestId))return Promise.reject(new Error('此操作尚在處理中'));
    const packet={...values,kind,id:requestId,protocolVersion:ROOM_PROTOCOL_VERSION};
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('未收到操作回覆，請查看最新房間狀態後重試'));},timeoutMs);timer.unref?.();
      this.pending.set(requestId,{packet,resolve,reject,timer});
      try{this.socket.send(JSON.stringify(packet));}catch(error){clearTimeout(timer);this.pending.delete(requestId);reject(error);}
    });
  }
  stop(message='已離開房間') {
    this.closed=true;clearTimeout(this.retryTimer);clearInterval(this.heartbeatTimer);
    clearTimeout(this.initialRetryTimer);this.initialRetryResolve?.();this.initialRetryResolve=null;
    this.openReject?.(new Error(message));this.openReject=null;
    for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(new Error(message));}this.pending.clear();
    this.socket?.close();this.notify('disconnected',message);
  }
  async close() { this.session=null;this.stop('已離開房間'); }
}
