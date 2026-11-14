const COMMANDS = new Set(['ready','start','chat','split','reunite','vote-start','vote','vote-resolve','battle-open','battle-action','battle-resolve']);
export const safeId = value => typeof value==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__','prototype','constructor'].includes(value);
export function text(value, fallback, max) { if (value == null) return fallback; if (typeof value!=='string') throw new Error('文字欄位無效'); const clean=value.replace(/[\x00-\x1F\x7F]/g,'').trim(); if (!clean || clean.length>max) throw new Error(`文字長度須為 1～${max} 字`); return clean; }
export function assertPacket(value, depth=0) {
  if (depth>12) throw new Error('訊息結構過深');
  if (value && typeof value==='object') for (const key of Object.keys(value)) { if (['__proto__','prototype','constructor'].includes(key)) throw new Error('訊息含不安全欄位'); assertPacket(value[key],depth+1); }
}
export function cleanProfile(profile={}) { if (!profile || typeof profile!=='object' || Array.isArray(profile)) throw new Error('人物資料無效'); return {name:text(profile.name,'江湖旅人',30),characterId:null}; }

export function normalizeRoomCommand(state,message,{chapters,enemies}) {
    const type=message.type,payload=message.payload??{},context=message.context??{};
    if (!COMMANDS.has(type) || !payload || typeof payload!=='object' || Array.isArray(payload)) throw new Error('房間指令無效');
    if(state.status==='lobby'&&['vote-start','vote','vote-resolve'].includes(type))throw new Error('隊伍出發後才能進行投票');
    let clean={};
    if(type==='ready'){if(typeof payload.ready!=='boolean')throw new Error('準備狀態無效');clean={ready:payload.ready};}
    if(type==='chat')clean={text:text(payload.text,'',300)};
    if(type==='split'){if(!['magistrate','escort'].includes(payload.lineId))throw new Error('行動線無效');clean={lineId:payload.lineId};}
    const chapter=chapters[state.worldSummary.chapter-1];
    if(type==='vote-start')clean={id:`chapter_${chapter.chapter}_major`,choices:chapter.majorChoices.map(c=>c.id),flagKey:`chapter_${chapter.chapter}_room_choice`};
    if(['vote','vote-resolve'].includes(type)) {
      const vote=state.vote;
      if(!vote || context.voteId!==vote.id || context.round!==vote.round)throw new Error('投票已更新，請依最新狀態重新選擇');
      if(type==='vote'){if(!safeId(payload.choiceId))throw new Error('投票選項無效');clean={choiceId:payload.choiceId};}
      else {if(payload.hostTieChoice!=null&&!safeId(payload.hostTieChoice))throw new Error('裁決選項無效');clean={hostTieChoice:payload.hostTieChoice};}
    }
    if(type==='battle-open') {
      const enemy=chapter.keyEnemyIds.map(id=>enemies.find(e=>e.id===id)).find(e=>e?.tier==='major_boss')??enemies.find(e=>e.id===chapter.keyEnemyIds[0]);
      clean={id:`chapter_${chapter.chapter}_room_battle`,enemyName:enemy?.name??'攔路高手',enemyHp:100+chapter.chapter*20};
    }
    if(['battle-action','battle-resolve'].includes(type)) {
      const battle=state.battle;
      if(!battle || context.instanceId!==battle.instanceId || context.round!==battle.round)throw new Error('回合已更新，請依最新戰況出手');
      if(type==='battle-action'){if(!['attack','skill','defend','observe'].includes(payload.action))throw new Error('戰鬥行動無效');clean={action:payload.action};}
    }
    return {type,payload:clean};
  }
