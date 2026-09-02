export class RoomController {
  constructor({transport,isHost=false,playerId}){this.transport=transport;this.isHost=isHost;this.playerId=playerId;this.state=null;this.subscribers=new Set();}
  async create({worldId,chapter=1}){const roomId=Math.random().toString(36).slice(2,7).toUpperCase();this.state={roomId,protocolVersion:1,hostPlayerId:this.playerId,status:"lobby",players:{[this.playerId]:{id:this.playerId,ready:false,connected:true}},worldSummary:{worldId,chapter,sceneId:"opening"},revision:0,pendingCommands:{},authoritativeState:{},vote:null,reconnectDeadline:null};await this.transport.connect(roomId,msg=>this.receive(msg));return this.state;}
  async join(roomId){await this.transport.connect(roomId,msg=>this.receive(msg));await this.transport.send({type:"join",playerId:this.playerId});}
  async command(type,payload={}){return this.transport.send({type,playerId:this.playerId,payload,baseRevision:this.state?.revision??0});}
  receive(command){if(this.isHost){if(command.type==="join"&&Object.keys(this.state.players).length<4){this.state.players[command.playerId]={id:command.playerId,ready:false,connected:true};this.broadcastState();}else if(command.baseRevision===this.state.revision){this.apply(command);this.broadcastState();}}else if(command.type==="state"&&(!this.state||command.payload.revision>this.state.revision)){this.state=command.payload;this.emit();}}
  apply(command){if(command.type==="ready")this.state.players[command.playerId].ready=Boolean(command.payload.ready);if(command.type==="vote"&&this.state.vote)this.state.vote.ballots[command.playerId]=command.payload.choiceId;this.state.revision++;this.emit();}
  broadcastState(){this.transport.send({type:"state",playerId:this.playerId,payload:structuredClone(this.state)});this.emit();}
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn);}
  emit(){for(const fn of this.subscribers)fn(this.state);}
}
