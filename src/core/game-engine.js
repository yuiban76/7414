import { COUNTRIES, CONTENT_VERSION } from "../config/constants.js";
import { STORY_SCENES } from "./story.js";
import { applyOutcome, chooseMajorPath } from "../systems/quest-system.js";
import { applyIdentitySceneBonus } from "../systems/identity-system.js";

export function createWorld({ name, startingCountry, ownerCharacterId, seed }) {
  return { id:globalThis.crypto?.randomUUID?.()??`world_${Date.now()}`, name:name.trim()||"風起江湖", schemaVersion:1, contentVersion:CONTENT_VERSION, ownerCharacterId, startingCountry, chapter:1, currentSceneId:"opening", currentLocationId:"location_002", clock:{day:1,segment:"evening"}, party:{playerIds:[ownerCharacterId],npcIds:["npc_001"]}, partyMoney:0, quests:{quest_chapter_1:"active"}, flags:{}, clues:[], npcStates:{npc_001:{availability:"party"}}, bossStates:{}, cityStates:{}, factionRelations:{}, wantedLevels:{dasheng:0,beishuo:0,nanli:0}, officeState:null, visitedLocations:["location_002"], worldEvents:[], participantHistory:[ownerCharacterId], rng:{seed,counter:0}, updatedAt:new Date().toISOString() };
}

export class GameEngine {
  constructor({ world, character, content }) { this.world=world; this.character=character; this.content=content; }
  get scene() { return STORY_SCENES[this.world.currentSceneId]; }
  sceneView() { const scene=this.scene; if(!scene)return null; return { ...scene, text:typeof scene.text==="function"?scene.text({countryOpening:COUNTRIES[this.world.startingCountry].opening,world:this.world}):scene.text } }
  choose(choiceId) {
    const choice=this.scene?.choices.find(item=>item.id===choiceId); if(!choice)throw new Error("場景選項不存在");
    for(const effect of choice.effects??[])applyOutcome(this.world,effect);
    applyIdentitySceneBonus(this.world,this.character,choice.id);
    if(choice.complete){const chapter=this.content.chapters.find(item=>item.chapter===this.world.chapter);const index=this.scene.choices.filter(c=>c.complete).findIndex(c=>c.id===choice.id);const mapped=chapter.majorChoices.find(item=>item.id===choice.majorChoiceId)??chapter.majorChoices[index];chooseMajorPath(this.world,chapter,mapped);this.world.quests[chapter.mainQuestId]="completed";if(chapter.nextChapterId){this.world.chapter++;this.world.quests[`quest_chapter_${this.world.chapter}`]="active";this.world.currentSceneId=`ch${this.world.chapter}_opening`;}else{this.world.flags.game_complete=true;this.world.currentSceneId="ending";}}
    else if(!choice.battle)this.world.currentSceneId=choice.next;
    this.world.updatedAt=new Date().toISOString(); return choice;
  }
  finishBattle(choice, result){if(result==="victory"){this.world.currentSceneId=choice.next;if(this.world.chapter===1&&choice.battle.includes("boss"))this.world.flags.boss_yanzhen_defeated=true;}else{this.world.currentSceneId=this.world.chapter===1?(choice.battle.includes("boss")?"warehouse":"cart"):`ch${this.world.chapter}_confrontation`;this.world.flags.last_defeat_scene=choice.battle;}this.world.updatedAt=new Date().toISOString();}
  continueChapter(choiceId){const chapter=this.content.chapters.find(c=>c.chapter===this.world.chapter);if(!chapter)return;const choice=chapter.majorChoices.find(c=>c.id===choiceId);if(!choice)throw new Error("章節選項不存在");chooseMajorPath(this.world,chapter,choice);this.world.quests[chapter.mainQuestId]="completed";if(chapter.nextChapterId){this.world.chapter++;this.world.quests[`quest_chapter_${this.world.chapter}`]="active";}else this.world.flags.game_complete=true;this.world.updatedAt=new Date().toISOString();}
}
