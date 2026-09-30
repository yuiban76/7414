import { skillArtName } from './skill-art.js';

const preferenceKey = 'jianghu:combatPresentation';
export function readCombatPreferences(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage?.getItem(preferenceKey) ?? '{}');
    return {speed:value.speed === 2 ? 2 : 1, muted:value.muted === true,
      volume:Number.isFinite(value.volume) ? Math.max(0, Math.min(.5, value.volume)) : .16};
  } catch { return {speed:1, muted:false, volume:.16}; }
}
const preferences = readCombatPreferences();
function savePreferences() {
  try { globalThis.localStorage?.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Private browsing can deny storage. */ }
}

export function combatStage() {
  return `<div class="combat-cinema"><span class="combat-cinema-mark" aria-hidden="true">交鋒</span><p class="combat-cue" aria-live="off">凝神審勢，靜待出手</p><div class="combat-seal" aria-hidden="true"></div></div>
    <div class="combat-playback" role="group" aria-label="戰鬥演出設定">
      <button type="button" class="btn" data-playback="speed" aria-label="切換戰鬥播放速度">${preferences.speed} 倍速</button>
      <button type="button" class="btn" data-playback="mute" aria-pressed="${preferences.muted}">${preferences.muted?'開啟音效':'靜音'}</button>
      <label>音量 <input type="range" min="0" max="50" step="1" value="${Math.round(preferences.volume*100)}" data-playback="volume" aria-label="戰鬥音效音量"></label>
      <button type="button" class="btn" data-playback="skip" disabled>跳過本回合</button>
    </div><p class="combat-announcement combat-visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>`;
}

class CombatAudio {
  constructor() { this.context = null; this.voices = new Set(); }
  unlock() {
    try {
      const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Audio) return;
      this.context ??= new Audio();
      this.context.resume()?.catch(() => {});
    } catch { /* Audio is optional; combat remains playable. */ }
  }
  play(type) {
    const context = this.context;
    if (preferences.muted || !preferences.volume || !context || context.state !== 'running') return;
    const tones = {action:[220,560,.08],hit:[135,45,.12],break:[420,55,.22],
      defend:[180,320,.1],guard:[180,320,.1],dodge:[600,1000,.07],evade:[600,1000,.07],
      heal:[440,880,.18],buff:[330,660,.16],refund:[440,660,.13],
      follow:[350,850,.08],chase:[450,950,.09],kill:[180,50,.24],victory:[523,1046,.4],defeat:[220,110,.4]};
    const tone = tones[type];
    if (!tone) return;
    try {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const now = context.currentTime, duration = tone[2] / preferences.speed;
      oscillator.type = ['hit','break','kill'].includes(type) ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(tone[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(tone[1], now+duration);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(preferences.volume*.28, now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001, now+duration);
      oscillator.connect(gain); gain.connect(context.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now+duration);
    } catch { /* Unsupported/suspended audio never blocks playback. */ }
  }
  stop() { for (const voice of this.voices) { try { voice.stop(); } catch {} } this.voices.clear(); }
}
const audio = new CombatAudio();
if (globalThis.document) {
  document.addEventListener('pointerdown', () => audio.unlock(), {passive:true});
  document.addEventListener('keydown', () => audio.unlock());
}

export class CombatDirector {
  constructor() {
    this.root = null; this.run = null;
    this.motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.click = event => this.control(event);
    this.input = event => this.control(event);
    this.hide = () => { if (document.hidden) this.cancel(); };
    this.motionChange = () => { if (this.motion.matches) this.cancel(); };
    globalThis.document?.addEventListener('visibilitychange', this.hide);
    this.motion?.addEventListener?.('change', this.motionChange);
  }
  get busy() { return Boolean(this.run); }
  mount(root) {
    if (root === this.root) {this.syncControls();return;}
    this.cancel();
    this.root?.removeEventListener('click', this.click);
    this.root?.removeEventListener('input', this.input);
    this.observer?.disconnect();
    this.root = root;
    root?.addEventListener('click', this.click);
    root?.addEventListener('input', this.input);
    this.syncControls();
    if (root && globalThis.MutationObserver) {
      this.observer = new MutationObserver(() => { if (!root.isConnected) this.cancel(); });
      this.observer.observe(document.body, {childList:true, subtree:true});
    }
  }
  control(event) {
    const target = event.target.closest?.('[data-playback]');
    if (!target || !this.root?.contains(target)) return;
    const action = target.dataset.playback;
    if (action === 'volume' && event.type === 'input') preferences.volume = Number(target.value)/100;
    else if (event.type !== 'click') return;
    else if (action === 'speed') {
      preferences.speed = preferences.speed === 1 ? 2 : 1;
      for (const animation of this.run?.animations ?? []) animation.playbackRate = preferences.speed;
    } else if (action === 'mute') { preferences.muted = !preferences.muted; if (preferences.muted) audio.stop(); }
    else if (action === 'skip') this.cancel();
    savePreferences(); this.syncControls();
  }
  syncControls() {
    if (!this.root) return;
    const speed=this.root.querySelector('[data-playback="speed"]'), mute=this.root.querySelector('[data-playback="mute"]');
    if (speed) speed.textContent=`${preferences.speed} 倍速`;
    if (mute) { mute.textContent=preferences.muted?'開啟音效':'靜音'; mute.setAttribute('aria-pressed', String(preferences.muted)); }
    const skip=this.root.querySelector('[data-playback="skip"]'); if(skip)skip.disabled=!this.busy;
  }
  card(id) { return [...(this.root?.querySelectorAll('[data-combatant-id]') ?? [])].find(card => card.dataset.combatantId === id); }
  update(actors, immediate = false) {
    for (const actor of actors ?? []) {
      const card = this.card(actor.id); if (!card) continue;
      card.classList.toggle('is-broken', Boolean(actor.vulnerableTurns));
      card.classList.toggle('is-defeated', actor.hp <= 0);
      card.classList.toggle('is-guarding', Boolean(actor.defended));
      const condition = card.querySelector('[data-combat-condition]');
      if (condition) condition.textContent = actor.hp<=0?'已倒下':actor.vulnerableTurns?'破綻':actor.defended?'守勢':'';
      for (const type of ['hp','inner','posture']) {
        if (!Number.isFinite(actor[type])) continue;
        const max = actor[{hp:'maxHp',inner:'maxInner',posture:'maxPosture'}[type]];
        const meter = card.querySelector(`.meter.${type}`); if(!meter)continue;
        const value = max ? Math.max(0,Math.min(1,actor[type]/max)) : 0;
        const old = Number(meter.dataset.fill ?? value);
        meter.setAttribute('aria-valuemax',String(max)); meter.setAttribute('aria-valuenow',String(actor[type]));
        meter.dataset.fill=String(value);
        const text=meter.closest('.resource')?.querySelector('.number'); if(text)text.textContent=`${Math.round(actor[type])}／${Math.round(max)}`;
        const fill=meter.querySelector('.meter-fill')??meter.querySelector('span');
        const ghost=meter.querySelector('.meter-ghost');
        if (fill) {
          fill.style.width='100%'; fill.style.transformOrigin='left';
          fill.style.transform=`scaleX(${value})`;
          if(!immediate&&!this.motion?.matches&&old!==value)this.animate(fill,[{transform:`scaleX(${old})`},{transform:`scaleX(${value})`}],240);
        }
        if (ghost) {
          ghost.style.transform=`scaleX(${value})`;
          if (!immediate && old>value && !this.motion?.matches)this.animate(ghost,[{transform:`scaleX(${old})`},{transform:`scaleX(${old})`,offset:.4},{transform:`scaleX(${value})`}],520);
        }
      }
      const buffs = card.querySelector('[data-combat-buffs]');
      if(buffs)buffs.textContent=(actor.buffs??[]).map(buff=>`${({damage:'傷害',posture:'削勢',defense:'減傷',speed:'速度'})[buff.stat]??buff.stat} +${Math.round(buff.value*100)}% · ${buff.remaining} 回合`).join('　')||'目前無增益';
      // Intent nodes are matched by ID without placing user-controlled IDs in selectors.
      const ownIntent=[...(this.root?.querySelectorAll('[data-intent-id]')??[])].find(node=>node.dataset.intentId===actor.id);
      if(ownIntent)ownIntent.textContent=actor.hp>0?`預告 ${actor.intent?.label??'不明'} · 觀察 ${actor.observed??0}／3`:'敵手已退';
    }
  }
  animate(node, frames, duration) {
    if (!node?.animate || !this.run || this.motion?.matches) return;
    const animation=node.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.2,1)'});
    animation.playbackRate=preferences.speed;
    this.run.animations.add(animation);
    animation.onfinish=()=>this.run?.animations.delete(animation);
    return animation;
  }
  wait(duration, run) {
    if (run.cancelled || this.motion?.matches) return Promise.resolve();
    return new Promise(resolve => {
      const started=performance.now(); let elapsed=0,last=started,timer;
      const finish=()=>{clearTimeout(timer);run.release=null;resolve();};
      run.release=finish;
      const tick=()=>{const now=performance.now();elapsed+=(now-last)*preferences.speed;last=now;
        if(run.cancelled||!this.root?.isConnected||elapsed>=duration)finish();else timer=setTimeout(tick,24);};
      tick();
    });
  }
  cancel() {
    const run=this.run;if(!run)return;
    run.cancelled=true;run.release?.();
    for(const animation of run.animations)animation.cancel();
    run.animations.clear(); audio.stop();
    for(const node of run.nodes)node.remove();run.nodes.clear();
    this.update(run.batch.after,true);
  }
  effect(card, kind, text, art = 'qi') {
    if(!card||!this.run||this.motion?.matches)return;
    const node=document.createElement('span');node.className=`combat-effect effect-${kind} art-${art}`;
    node.setAttribute('aria-hidden','true');node.textContent=text??'';card.append(node);this.run.nodes.add(node);
    this.animate(node,kind==='number'?[{opacity:0,transform:'translate(-50%,8px) scale(.7)'},{opacity:1,transform:'translate(-50%,-8px) scale(1.1)',offset:.22},{opacity:0,transform:'translate(-50%,-42px) scale(1)'}]:
      [{opacity:0,transform:'translate(-50%,-50%) scale(.4) rotate(-12deg)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.05) rotate(0deg)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.25) rotate(5deg)'}],kind==='number'?850:600);
  }
  async play(batch) {
    if (!this.root || !batch?.after) return;
    this.cancel();
    // A previous cancelled run must finish before a new one can own this DOM.
    if(this.run)await this.run.done;
    if(!this.root?.isConnected)return;
    const root=this.root;
    const run={batch,cancelled:false,animations:new Set(),nodes:new Set(),release:null};
    run.done=new Promise(resolve=>run.complete=resolve);this.run=run;
    const commands=[...root.querySelectorAll('[data-combat-action],[data-room-battle-action],[data-action="room-battle-resolve"],[data-action="finish-battle"]')];
    const disabled=commands.map(node=>node.disabled);commands.forEach(node=>node.disabled=true);
    root.classList.add('is-playing');root.setAttribute('aria-busy','true');this.syncControls();
    // On narrow screens commands sit below the arena. Bring the performance and
    // its skip control into view once, without scrolling during individual hits.
    const stage=root.querySelector('.combat-cinema');
    if(stage && !this.motion?.matches && stage.getBoundingClientRect().top<0)
      stage.scrollIntoView({block:'start',behavior:'instant'});
    const cue=root.querySelector('.combat-cue'), seal=root.querySelector('.combat-seal');
    if(seal){seal.textContent='';seal.className='combat-seal';}
    try {
      this.update(batch.before,true);
      if (document.hidden || this.motion?.matches) run.cancelled=true;
      for (const event of batch.events ?? []) {
        if(run.cancelled||!root.isConnected)break;
        const source=this.card(event.actorId),target=this.card(event.targetId)??source;
        const name=(event.actors??batch.before).find(actor=>actor.id===event.actorId)?.name??'';
        const art=event.skill?skillArtName(event.skill):event.art??'fist';
        const labels={break:'架勢崩解',kill:'擊倒',follow:'破勢連攻',chase:'乘勢追擊',dodge:'閃避',defend:'守勢',guard:'護衛',evade:'身法',observe:'審勢',objective:'場景行動',heal:`氣血 +${event.amount??0}`,refund:`內力 +${event.amount??0}`,buff:'氣機增強'};
        if(cue&&event.type!=='state')cue.textContent=event.type==='action'?`${name} · ${event.label}`:`${name} · ${labels[event.type]??event.label??'交鋒'}`;
        if(event.type==='action') {
          if(source){source.classList.add('is-striking');this.animate(source,[{transform:'translateX(0)'},{transform:`translateX(${source.dataset.side==='enemy'?'-':'+'}8px)`,offset:.45},{transform:'translateX(0)'}],300);}
          if(cue)this.animate(cue,[{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],180);
          audio.play('action');await this.wait(180,run);
          if(event.attack)this.effect(target,'strike','',art);
          await this.wait(80,run);source?.classList.remove('is-striking');
        } else if(event.type==='hit') {
          this.effect(target,'number',`氣血 −${event.hpDamage}${event.postureDamage?` · 架勢 −${event.postureDamage}`:''}`);
          if(event.blocked)this.effect(target,'defend','化勁');
          this.animate(target,[{transform:'translateX(0)'},{transform:'translateX(-5px)',offset:.2},{transform:'translateX(5px)',offset:.4},{transform:'translateX(-3px)',offset:.65},{transform:'translateX(0)'}],180);
          audio.play(event.blocked?'defend':'hit');
        } else if(event.type==='state'&&event.label) {
          if(cue)cue.textContent=event.label;
          let recovered=false;
          for(const actor of event.actors??[]) {
            const card=this.card(actor.id),gains=[];
            for(const [type,label] of [['hp','氣血'],['inner','內力'],['posture','架勢']]) {
              const meter=card?.querySelector(`.meter.${type}`);
              const gain=meter?actor[type]-Number(meter.getAttribute('aria-valuenow')):0;
              if(gain>0)gains.push(`${label} +${Math.round(gain)}`);
            }
            if(gains.length){this.effect(card,'refund',gains.join(' · '));recovered=true;}
          }
          if(recovered)audio.play('refund');
        } else if(event.type!=='state') {
          this.effect(target,event.type,labels[event.type]??event.label??'');audio.play(event.type);
          if(['break','kill'].includes(event.type)) {
            this.effect(target,'crack','');
            for(let i=0;i<6;i++){
              const mote=document.createElement('i');mote.className='combat-mote';mote.setAttribute('aria-hidden','true');target?.append(mote);run.nodes.add(mote);
              const angle=i*Math.PI/3;this.animate(mote,[{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:`translate(calc(-50% + ${Math.cos(angle)*48}px),calc(-50% + ${Math.sin(angle)*48}px)) scale(.2)`}],420);
            }
            await this.wait(40,run);
            const frozen=[...run.animations].filter(animation=>animation.playState==='running');
            frozen.forEach(animation=>animation.pause());
            await this.wait(80,run);
            if(!run.cancelled)frozen.forEach(animation=>{animation.playbackRate=preferences.speed;animation.play();});
          }
        }
        if(!run.cancelled)this.update(event.actors);
        await this.wait(event.type==='action'?0:['break','kill'].includes(event.type)?220:event.type==='state'?(event.label?280:0):event.type==='hit'?190:160,run);
        // Bound transient nodes even for long rounds.
        for(const node of run.nodes)if(node.getAnimations?.().every(animation=>animation.playState==='finished')){node.remove();run.nodes.delete(node);}
      }
      if(!run.cancelled && batch.finished) {
        if(seal){seal.textContent=batch.finished==='victory'?'勝':'退';seal.classList.add(`seal-${batch.finished}`);this.animate(seal,[{opacity:0,transform:'scale(1.8) rotate(-15deg)'},{opacity:1,transform:'scale(1) rotate(-8deg)'}],380);}
        audio.play(batch.finished);await this.wait(500,run);
      }
    } finally {
      for(const animation of run.animations)animation.cancel();
      for(const node of run.nodes)node.remove();
      root.querySelectorAll('.is-striking').forEach(node=>node.classList.remove('is-striking'));
      if(this.root===root)this.update(batch.after,true);
      if(cue)cue.textContent=batch.finished?(batch.finished==='victory'?'敵手盡退，此戰告捷。':'暫退整備，再尋勝機。'):'回合已定，審勢再出招。';
      if(seal&&batch.finished){seal.textContent=batch.finished==='victory'?'勝':'退';seal.classList.add(`seal-${batch.finished}`);}
      const announcement=root.querySelector('.combat-announcement');if(announcement)announcement.textContent=batch.summary??`第 ${batch.round} 回合已結算。`;
      commands.forEach((node,index)=>{if(node.isConnected)node.disabled=disabled[index];});
      root.classList.remove('is-playing');root.removeAttribute('aria-busy');
      if(this.run===run)this.run=null;
      this.syncControls();run.complete();
    }
  }
}
