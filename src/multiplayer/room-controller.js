import { castVote, createVote, resolveVote } from "../systems/vote-system.js";

const MAX_PLAYERS = 4;
const RECONNECT_WINDOW_MS = 60_000;

export class RoomController {
  constructor({transport,isHost=false,playerId,now=()=>Date.now()}){
    this.transport=transport;
    this.isHost=isHost;
    this.playerId=playerId;
    this.now=now;
    this.state=null;
    this.subscribers=new Set();
  }

  async create({worldId,worldName="未命名江湖",country="dasheng",chapter=1,visibility="private",profile={}}){
    const roomId=Math.random().toString(36).slice(2,7).toUpperCase();
    this.state={
      roomId,protocolVersion:1,hostPlayerId:this.playerId,status:"lobby",visibility,
      players:{[this.playerId]:playerRecord(this.playerId,{name:"房主",...profile},this.now())},
      worldSummary:{worldId,worldName,country,chapter,sceneId:"opening"},revision:0,
      pendingCommands:{},authoritativeState:{},vote:null,battle:null,chat:[],actionLines:{together:[this.playerId]},
      reconnectDeadline:null,history:[]
    };
    await this.transport.connect(roomId,message=>this.receive(message));
    this.emit();
    return this.state;
  }

  async join(roomId,profile={}){
    await this.transport.connect(roomId,message=>this.receive(message));
    await this.transport.send({type:"join",playerId:this.playerId,payload:{profile}});
  }

  async command(type,payload={}){
    const command={type,playerId:this.playerId,payload,baseRevision:this.state?.revision??0};
    if(this.isHost){
      this.apply(command);
      await this.broadcastState();
      return command;
    }
    return this.transport.send(command);
  }

  async receive(command){
    if(this.isHost){
      if(command.type==="join"){this.acceptJoin(command);await this.broadcastState();return;}
      if(command.type==="reconnect"){this.acceptReconnect(command);await this.broadcastState();return;}
      if(command.baseRevision!==this.state.revision){await this.broadcastState();return;}
      this.apply(command);
      await this.broadcastState();
      return;
    }
    if(command.type==="state"&&(!this.state||command.payload.revision>=this.state.revision)){
      this.state=structuredClone(command.payload);
      this.emit();
    }
  }

  acceptJoin(command){
    if(this.state.status!=="lobby")return;
    const existing=this.state.players[command.playerId];
    if(existing){this.acceptReconnect(command);return;}
    if(Object.keys(this.state.players).length>=MAX_PLAYERS)return;
    this.state.players[command.playerId]=playerRecord(command.playerId,command.payload?.profile,this.now());
    this.state.actionLines.together.push(command.playerId);
    this.bump("join",command.playerId);
  }

  acceptReconnect(command){
    const player=this.state.players[command.playerId];
    if(!player)return;
    player.connected=true;
    player.reconnectDeadline=null;
    player.lastSeenAt=this.now();
    if(command.playerId===this.state.hostPlayerId&&this.state.status==="paused")this.state.status="playing";
    this.bump("reconnect",command.playerId);
  }

  apply(command){
    const player=this.state.players[command.playerId];
    if(!player)throw new Error("玩家不在房間中");
    if(command.type==="ready")player.ready=Boolean(command.payload.ready);
    else if(command.type==="start")this.start(command.playerId);
    else if(command.type==="chat")this.addChat(command.playerId,command.payload.text);
    else if(command.type==="disconnect")this.disconnect(command.playerId);
    else if(command.type==="split")this.split(command.playerId,command.payload.lineId);
    else if(command.type==="reunite")this.reunite(command.playerId);
    else if(command.type==="vote-start")this.startVote(command.playerId,command.payload);
    else if(command.type==="vote")this.vote(command.playerId,command.payload.choiceId);
    else if(command.type==="vote-resolve")this.resolveCurrentVote(command.playerId,command.payload.hostTieChoice);
    else if(command.type==="battle-open")this.openBattle(command.playerId,command.payload);
    else if(command.type==="battle-action")this.submitBattleAction(command.playerId,command.payload.action);
    else if(command.type==="battle-resolve")this.resolveBattleRound(command.playerId);
    else throw new Error("未知房間指令");
    player.lastSeenAt=this.now();
    this.bump(command.type,command.playerId);
  }

  start(playerId){
    if(playerId!==this.state.hostPlayerId)throw new Error("只有房主可以開始");
    const players=Object.values(this.state.players);
    if(players.some(item=>!item.connected||!item.ready))throw new Error("所有在線玩家都必須準備");
    this.state.status="playing";
  }

  addChat(playerId,text){
    const clean=String(text??"").trim().slice(0,300);
    if(!clean)throw new Error("聊天內容不可為空");
    this.state.chat.push({id:`chat_${this.state.revision+1}`,playerId,text:clean,sentAt:this.now()});
    this.state.chat=this.state.chat.slice(-50);
  }

  disconnect(playerId){
    const player=this.state.players[playerId];
    player.connected=false;
    player.ready=false;
    player.reconnectDeadline=this.now()+RECONNECT_WINDOW_MS;
    if(playerId===this.state.hostPlayerId){
      this.state.status="paused";
      this.state.reconnectDeadline=player.reconnectDeadline;
    }
  }

  split(playerId,lineId){
    if(this.state.status!=="playing")throw new Error("遊戲開始後才能分頭");
    const clean=String(lineId??"").trim();
    if(!clean||clean==="together")throw new Error("行動線無效");
    removeFromLines(this.state.actionLines,playerId);
    (this.state.actionLines[clean]??=[]).push(playerId);
  }

  reunite(playerId){
    removeFromLines(this.state.actionLines,playerId);
    (this.state.actionLines.together??=[]).push(playerId);
  }

  startVote(playerId,{id,choices,flagKey}){
    if(playerId!==this.state.hostPlayerId)throw new Error("只有房主可以發起重大投票");
    if(this.state.vote?.status==="open")throw new Error("已有進行中的投票");
    const eligible=Object.values(this.state.players).filter(item=>item.connected).map(item=>item.id);
    this.state.vote={...createVote({id,choices,playerIds:eligible,hostPlayerId:this.state.hostPlayerId}),flagKey};
  }

  vote(playerId,choiceId){
    if(!this.state.vote)throw new Error("目前沒有投票");
    castVote(this.state.vote,playerId,choiceId);
  }

  resolveCurrentVote(playerId,hostTieChoice){
    if(playerId!==this.state.hostPlayerId)throw new Error("只有房主可以結算投票");
    if(!this.state.vote)throw new Error("目前沒有投票");
    const outcome=resolveVote(this.state.vote,hostTieChoice);
    if(outcome.status==="resolved"&&this.state.vote.flagKey){
      this.state.authoritativeState.flags??={};
      this.state.authoritativeState.flags[this.state.vote.flagKey]=outcome.result;
    }
    return outcome;
  }

  openBattle(playerId,{id="room_battle",enemyName="攔路高手",enemyHp=120}={}){
    if(playerId!==this.state.hostPlayerId)throw new Error("只有房主可以開始同步戰鬥");
    if(this.state.status!=="playing")throw new Error("房間尚未開始遊戲");
    const eligible=Object.values(this.state.players).filter(item=>item.connected).map(item=>item.id);
    this.state.battle={id,enemyName:String(enemyName).slice(0,50),enemyHp,maxEnemyHp:enemyHp,round:1,status:"active",eligiblePlayerIds:eligible,partyHp:Object.fromEntries(eligible.map(id=>[id,100])),submissions:{},log:["眾人同時拔出兵刃。"]};
  }

  submitBattleAction(playerId,action){
    const battle=this.state.battle;if(!battle||battle.status!=="active")throw new Error("目前沒有同步戰鬥");
    if(!battle.eligiblePlayerIds.includes(playerId)||battle.partyHp[playerId]<=0)throw new Error("玩家目前不能提交行動");
    if(!["attack","skill","defend","observe"].includes(action))throw new Error("戰鬥行動無效");
    battle.submissions[playerId]=action;
  }

  resolveBattleRound(playerId){
    if(playerId!==this.state.hostPlayerId)throw new Error("只有房主可以結算同步戰鬥");
    const battle=this.state.battle;if(!battle||battle.status!=="active")throw new Error("目前沒有同步戰鬥");
    const living=battle.eligiblePlayerIds.filter(id=>battle.partyHp[id]>0);if(living.some(id=>!battle.submissions[id]))throw new Error("仍有玩家尚未提交行動");
    const damageByAction={attack:20,skill:30,defend:0,observe:8};const damage=living.reduce((sum,id)=>sum+damageByAction[battle.submissions[id]],0);battle.enemyHp=Math.max(0,battle.enemyHp-damage);battle.log.push(`第 ${battle.round} 回合，隊伍造成 ${damage} 點傷害。`);
    if(battle.enemyHp===0){battle.status="victory";battle.log.push(`${battle.enemyName}敗退。`);return;}
    for(const id of living){const incoming=battle.submissions[id]==="defend"?8:16;battle.partyHp[id]=Math.max(0,battle.partyHp[id]-incoming);}
    if(living.every(id=>battle.partyHp[id]===0)){battle.status="defeat";battle.log.push("隊伍暫時撤退，保留本次所得情報。");return;}
    battle.round++;battle.submissions={};
  }

  async broadcastState(){
    await this.transport.send({type:"state",playerId:this.playerId,payload:structuredClone(this.state)});
    this.emit();
  }

  bump(type,playerId){
    this.state.revision++;
    this.state.history.push({revision:this.state.revision,type,playerId,at:this.now()});
    this.state.history=this.state.history.slice(-100);
  }

  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn);}
  emit(){for(const fn of this.subscribers)fn(this.state);}
}

function playerRecord(id,profile={},now){return{id,name:String(profile?.name??id).slice(0,30),characterId:profile?.characterId??null,ready:false,connected:true,lastSeenAt:now,reconnectDeadline:null};}
function removeFromLines(lines,playerId){for(const [key,members] of Object.entries(lines)){lines[key]=members.filter(id=>id!==playerId);if(key!=="together"&&!lines[key].length)delete lines[key];}}
