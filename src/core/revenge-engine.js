// Runtime adapter for the ten-chapter manuscript. Content is injected by the
// browser loader; this module deliberately has no dependency on authoring tools.
const CAST = ['npc_001', 'npc_002', 'npc_003'];
const ENEMY_NAMES = {
  'well-lesson':'溫守拙 · 井邊試步', courtyard:'黑甲兵', 'hook-road':'封路軍官',
  'constable-chase':'追捕官差', 'dye-house':'暗巷弩手', 'bian-jiu':'卞九',
  'hong-furnace':'洪百川', 'yue-ash-guard':'守窯弟子', 'terrace-practice':'庭院試步',
  'yue-duel':'岳承義', 'river-borrow-fire':'河亭伏兵', 'xie-banquet':'謝府近衛',
  'han-corridor':'韓逐鹿', 'river-escape':'追船弩手', 'wei-siege':'衛峻',
  'xie-escape':'謝欣達', 'xu-needles':'許問針', 'convoy-bridge':'軍運護衛',
  'dong-convoy':'董綸', 'gate-preparation':'關外巡兵', 'gate-entry-stay':'柴門守軍',
  'gate-entry-leave':'柴門守軍', 'gate-machines':'關城機關守軍', 'wei-final':'衛峻',
  'capital-street':'定京親衛', 'capital-relay':'傳令親衛',
  'xie-side-crossbow':'側院弩手', 'xie-gates':'謝府近衛', 'xie-final':'謝欣達',
};

export function createTenChapterState(story) {
  const first = story?.chapters?.[0]?.scenes?.[0];
  if (story?.revision !== 3 || !first) throw new Error('十章故事資料尚未載入');
  return {
    version:3, storyRevision:3, cursor:first.id, choices:{}, history:[], readSceneIds:[],
    completedEncounters:[], rewards:[], events:{}, battle:null, chapterSafe:false,
    // Compatibility containers are intentionally empty: no old campaign quest,
    // evidence, fate or optional encounter is imported into this campaign.
    sidequests:{}, sidequestRewards:[], sidequestNotes:[], fates:{}, evidence:{},
    sources:{}, support:{}, losses:[], promises:{}, facilities:{}, publicFunds:0,
    preparations:[], custody:{}, assignments:{},
    journey:{completed:[], declined:false, stage:0, notes:[]},
  };
}

/** Render exactly the selected manuscript blocks, omitting author-only notes.
 * A choice's unresolved local blocks stop the preview at its first gate; common
 * text after that gate belongs to the selected result, not its preview. */
export function renderRevengeText(text, flags = {}, { pendingFlag = null } = {}) {
  let include = true;
  const lines = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const gate = line.match(/^### \[([a-z0-9_]+)=([a-z]+)\]\s*$/);
    if (gate) {
      if (gate[1] === pendingFlag && flags[gate[1]] == null) break;
      include = flags[gate[1]] === gate[2];
      continue;
    }
    if (/^### 共通\s*$/.test(line)) { include = true; continue; }
    if (/^\s*>/.test(line) || /^\s*#/.test(line)) continue;
    if (include) lines.push(line);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const matches = (scene, flags) => Object.entries(scene.when ?? {}).every(([key, value]) => flags[key] === value);
const stamp = world => { world.updatedAt = new Date().toISOString(); };

export class TenChapterEngine {
  constructor({ world, character, content }) {
    const story = content?.revengeStory;
    if (story?.revision !== 3 || !story.chapters?.length) throw new Error('十章故事資料尚未載入');
    if (world.zhaoye && world.zhaoye.storyRevision !== 3) throw new Error('故事版本不同，請重新開啟十章旅程');
    this.world = world;
    this.character = character;
    this.content = content;
    this.story = story;
    this.rows = story.chapters.flatMap(chapter => chapter.scenes.map(scene => ({ ...scene, chapter:chapter.chapter })));
    this.byId = new Map(this.rows.map((scene, index) => [scene.id, { scene, index }]));
    this.encounters = new Map();
    for (const scene of this.rows) if (scene.encounter) {
      const group = this.encounters.get(scene.encounter) ?? [];
      group.push(scene);
      this.encounters.set(scene.encounter, group);
    }
    world.zhaoye ??= createTenChapterState(story);
    const s = world.zhaoye;
    s.history ??= [...(s.readSceneIds ?? [])];
    s.readSceneIds ??= [...s.history];
    s.events ??= {};
    s.battle ??= null;
    if (!this.byId.has(s.cursor) || !matches(this.byId.get(s.cursor).scene, s.choices)) throw new Error('十章場景游標無效，請載入備份');
    const current = this.byId.get(s.cursor).scene;
    world.currentSceneId = current.id;
    world.chapter = current.chapter;
    world.flags ??= {};
    world.quests ??= {};
    world.clock ??= { day:1, segment:'evening' };
    world.visitedLocations ??= [];
    world.party ??= { playerIds:[world.ownerCharacterId ?? character.id], npcIds:[] };
    world.npcStates ??= {};
    if (!s.history.length && current.id === this.rows[0].id) this.setChapterLocation();
    if (!s.chapterSafe) s.events[current.id] ??= { status:'active' };
    this.syncCast();
  }

  get state() { return this.world.zhaoye; }
  get current() { return this.byId.get(this.state.cursor).scene; }
  get chapter() { return this.story.chapters.find(chapter => chapter.chapter === this.world.chapter); }
  get scene() { return this.sceneView(); }

  setChapterLocation() {
    const locationId = this.chapter?.locationId;
    if (!locationId) return;
    this.world.currentLocationId = locationId;
    if (!this.world.visitedLocations.includes(locationId)) this.world.visitedLocations.push(locationId);
  }

  syncCast() {
    const w = this.world, s = this.state, index = this.byId.get(s.cursor).index;
    const reached = id => this.byId.has(id) && index >= this.byId.get(id).index;
    const joined = {
      npc_001:reached('01-03'),
      npc_002:s.readSceneIds.includes('02-02'),
      npc_003:reached('02-04') && s.choices.cheng !== 'leave',
    };
    w.party.npcIds = CAST.filter(id => joined[id]);
    for (const id of CAST) {
      if (id === 'npc_003' && s.choices.cheng === 'leave') {
        s.fates[id] = { status:'departed', reason:'cheng-leave', questId:'revenge-main' };
        w.npcStates[id] = { availability:'departed', permanent:true };
        w.flags.revenge_cheng_leave = true;
      } else {
        w.npcStates[id] = {
          ...(w.npcStates[id] ?? {}), availability:joined[id] ? 'party' : 'unavailable',
          permanent:!joined[id], relationshipState:joined[id] ? '同行' : '尚未同行',
        };
      }
    }
    // The old campaign's remaining companions are never recruitable here.
    for (const id of Object.keys(w.npcStates)) if (!CAST.includes(id)) w.npcStates[id] = { availability:'unavailable', permanent:true };
  }

  needsBattle(scene = this.current) {
    if (!scene.encounter || this.state.completedEncounters.includes(scene.encounter)) return false;
    const visible = this.encounters.get(scene.encounter).filter(row => matches(row, this.state.choices));
    return (scene.encounter==='xie-final'?visible.at(-1):visible[0])?.id === scene.id;
  }

  readingPage() {
    const first=this.current, flags=this.state.choices;
    if(!this.story.presentation || first.choice&&flags[first.choice.flag]==null || this.needsBattle(first))return [first];
    const page=[],start=this.byId.get(first.id).index;
    let size=0;
    for(const row of this.rows.slice(start)){
      if(row.chapter!==first.chapter)break;
      if(!matches(row,flags))continue;
      if(page.length&&(row.choice||this.needsBattle(row)||/^\d{2}-\d{2}$/.test(row.id)))break;
      const length=(renderRevengeText(row.playText??row.text,flags).match(/\p{Script=Han}/gu)??[]).length;
      if(page.length&&(page.length>=4||size+length>600))break;
      page.push(row);size+=length;
    }
    return page;
  }

  sceneView() {
    const w = this.world, s = this.state, scene = this.current;
    if (s.chapterSafe) {
      const next = this.story.chapters.find(chapter => chapter.chapter > w.chapter);
      return {
        id:scene.id, chapter:w.chapter,
        title:w.flags.game_complete ? '照夜而行 · 全篇完' : `${this.chapter.title} · 章後休整`,
        text:w.flags.game_complete
          ? '十章旅程已完成。你可以回讀親歷的記事，或保存這段旅程。'
          : `《${this.chapter.title}》已讀完。可先整備，再啟程前往${next?.place ?? next?.title ?? '下一站'}。`,
        choices:next ? [{ id:`next-chapter:${w.chapter}`, label:'結束休整，啟程下一章' }] : [],
        safe:true,
      };
    }
    if (this.chapter.locationId && w.currentLocationId !== this.chapter.locationId) {
      return { id:scene.id, title:`主線現場：${this.chapter.place ?? this.chapter.title}`,
        text:'你已離開本章現場。返回後可接續原來那一頁，閱讀與交鋒進度都會保留。',
        choices:[{ id:`return-to-story:${scene.id}`, label:'返回主線現場' }], locationLocked:true };
    }
    const choice = scene.choice;
    if (choice && s.choices[choice.flag] == null) {
      const text = this.needsBattle(scene) ? '眼前需要作出決定。選定路線後，再處理這一場交鋒。'
        : renderRevengeText(scene.playText??scene.text, s.choices, { pendingFlag:choice.flag });
      return { id:scene.id, title:scene.title, chapter:scene.chapter, text:text || '先決定接下來的路線。',
        fullText:this.needsBattle(scene)?null:renderRevengeText(scene.text,s.choices,{pendingFlag:choice.flag}),
        choices:choice.options.map(option => ({ id:`pick:${scene.id}:${choice.flag}:${option.value}`, label:option.label, major:true })) };
    }
    if (this.needsBattle(scene)) {
      const battle = s.battle;
      const action = battle?.status === 'active' ? `resume:${battle.attempt}` : battle?.status === 'defeated' ? `retry:${battle.attempt}` : 'start';
      return {
        id:scene.id, title:scene.title, chapter:scene.chapter, danger:true,
        text:battle?.status === 'defeated'
          ? '這次交鋒未能完成。進度停在原處，場景結果尚未發生；可整備後重試。'
          : this.story.battleLeads?.[scene.encounter]??'前方的交鋒尚未解決。先應戰，完成後再讀這一段經過。',
        choices:[{ id:`battle:${scene.id}:${action}`, label:battle?.status === 'defeated' ? '重新應戰' : battle?.status === 'active' ? '繼續交鋒' : '開始交鋒' }],
      };
    }
    const phase = scene.encounter && s.completedEncounters.includes(scene.encounter) ? 'won' : choice ? 'chosen' : 'read';
    const page=this.readingPage();
    return { id:scene.id, title:scene.title, chapter:scene.chapter,
      text:page.map(row=>renderRevengeText(row.playText??row.text,s.choices)).join('\n\n'),
      fullText:page.map(row=>renderRevengeText(row.text,s.choices)).join('\n\n'),
      sceneIds:page.map(row=>row.id),
      choices:[{ id:`continue:${scene.id}:${phase}`, label:'繼續' }],
    };
  }

  choose(id) {
    if (typeof id !== 'string' || !this.sceneView().choices.some(choice => choice.id === id && !choice.disabled)) throw new Error('場景已變更或選項無效');
    const w = this.world, s = this.state, scene = this.current;
    if (id.startsWith('return-to-story:')) {
      this.setChapterLocation();
      stamp(w);
      return { id, returned:true };
    }
    if (id.startsWith('next-chapter:')) {
      const next = this.story.chapters.find(chapter => chapter.chapter > w.chapter);
      if (!next) throw new Error('旅程已完成');
      const entry = next.scenes.find(row => matches(row, s.choices));
      if (!entry) throw new Error('下一章沒有可讀場景');
      s.chapterSafe = false;
      s.cursor = entry.id;
      w.currentSceneId = entry.id;
      w.chapter = next.chapter;
      w.clock.day += next.chapter === 8 ? 43 : 1;
      w.quests[`quest_chapter_${next.chapter}`] = 'active';
      s.events[entry.id] ??= { status:'active' };
      this.setChapterLocation();
      this.syncCast();
      stamp(w);
      return { id };
    }
    if (id.startsWith('pick:')) {
      const option = scene.choice.options.find(option => id === `pick:${scene.id}:${scene.choice.flag}:${option.value}`);
      s.choices[scene.choice.flag] = option.value;
      s.events[scene.id] = { ...(s.events[scene.id] ?? {}), status:'choice-made', choice:option.value };
      this.syncCast();
      stamp(w);
      return { id, eventId:scene.id, selected:true };
    }
    if (id.startsWith('battle:')) {
      if (s.battle?.status !== 'active') {
        const event = s.events[scene.id] ??= { status:'active' };
        event.attempts = (event.attempts ?? 0) + 1;
        s.battle = { eventId:scene.id, encounter:scene.encounter, status:'active', attempt:event.attempts, actions:0, lastRound:0 };
      }
      stamp(w);
      return this.battleChoice();
    }
    return this.advance(id);
  }

  advance(id) {
    const w = this.world, s = this.state, scene = this.current;
    const page=this.readingPage();
    for(const row of page){
      s.events[row.id] = { ...(s.events[row.id] ?? {}), status:'completed' };
      if (!s.readSceneIds.includes(row.id)) s.readSceneIds.push(row.id);
      if (!s.history.includes(row.id)) s.history.push(row.id);
    }
    const index = this.byId.get(page.at(-1).id).index;
    const next = this.rows.slice(index + 1).find(row => matches(row, s.choices));
    let result = { id, eventId:scene.id };
    if (!next || next.chapter !== w.chapter) {
      s.cursor=page.at(-1).id;
      w.currentSceneId=s.cursor;
      s.chapterSafe = true;
      w.flags[`chapter_${w.chapter}_complete`] = true;
      w.quests[`quest_chapter_${w.chapter}`] = 'completed';
      if (!s.rewards.includes(w.chapter)) {
        s.rewards.push(w.chapter);
        this.character.moneyWen = (this.character.moneyWen ?? 0) + w.chapter * 250;
        this.character.cultivation = (this.character.cultivation ?? 0) + w.chapter * 100;
        result = { ...result, complete:true, rewardGranted:true, completedChapter:w.chapter };
      }
      if (!next) w.flags.game_complete = true;
    } else {
      s.cursor = next.id;
      w.currentSceneId = next.id;
      s.events[next.id] ??= { status:'active' };
    }
    this.syncCast();
    stamp(w);
    return result;
  }

  battleChoice() {
    const scene = this.current, battle = this.state.battle;
    return { id:`battle:${scene.id}`, battle:'revenge', eventId:scene.id,
      enemyName:ENEMY_NAMES[scene.encounter] ?? '攔路對手', revengeEncounter:scene.encounter,
      revengeAttempt:battle.attempt, next:scene.id };
  }

  battleDefinition(id = this.state.cursor) {
    const scene = this.byId.get(id)?.scene;
    if (!scene?.encounter || !this.needsBattle(scene)) return null;
    return { name:ENEMY_NAMES[scene.encounter] ?? '攔路對手', encounter:scene.encounter,
      objectives:['看清攻勢，穩住退路'], limit:null };
  }

  battleProgress() {
    const definition = this.battleDefinition();
    if (!definition) return null;
    return { ...definition, done:this.state.battle?.actions ?? 0, limit:Infinity };
  }

  battleAction(type, round) {
    const battle = this.state.battle;
    if (battle?.status !== 'active' || type !== 'objective' || !Number.isInteger(round) || round <= battle.lastRound) return false;
    battle.actions = Math.min(1, battle.actions + 1);
    battle.lastRound = round;
    stamp(this.world);
    return true;
  }

  resolveBattle(choice, result) {
    const s = this.state, battle = s.battle;
    if (choice?.battle !== 'revenge' || choice.eventId !== s.cursor || choice.revengeEncounter !== this.current.encounter) throw new Error('交鋒與當前場景不符');
    if (s.completedEncounters.includes(choice.revengeEncounter)) return { duplicate:true };
    if (!battle || choice.revengeAttempt !== battle.attempt) throw new Error('這次交鋒已變更，不能重複結算');
    if (battle.status !== 'active') return { duplicate:true };
    if (!['victory', 'defeat', 'escape'].includes(result)) throw new Error('交鋒尚未結束');
    if (result === 'victory') {
      s.completedEncounters.push(choice.revengeEncounter);
      s.battle = null;
      delete s.activeBattle;
      stamp(this.world);
      return { victory:true, eventId:choice.eventId };
    }
    battle.status = 'defeated';
    this.world.flags.last_defeat_scene = choice.eventId;
    delete s.activeBattle;
    stamp(this.world);
    return { retry:true, eventId:choice.eventId };
  }

  finishBattle(choice, result, scenario) { return this.resolveBattle(choice, result, scenario); }
}
