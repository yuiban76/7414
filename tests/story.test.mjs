import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createWorld, GameEngine } from "../src/core/game-engine.js";
import { STORY_SCENES } from "../src/core/story.js";

const chapters=JSON.parse(fs.readFileSync(new URL("../src/data/chapters.json",import.meta.url),"utf8")).data;

test("chapters two through eight each provide a complete playable scene arc",()=>{
  for(let chapter=2;chapter<=8;chapter++){
    const prefix=`ch${chapter}`;
    assert.equal(STORY_SCENES[`${prefix}_opening`].choices.length,2);
    assert.equal(STORY_SCENES[`${prefix}_split`].choices.length,3);
    assert.equal(STORY_SCENES[`${prefix}_decision`].choices.length,4);
    assert.ok(STORY_SCENES[`${prefix}_confrontation`].choices[0].battle);
  }
});

test("chapter arcs carry quests, choices and scene state through the ending",()=>{
  const world=createWorld({name:"八章測試",startingCountry:"dasheng",ownerCharacterId:"hero",seed:"story"});
  world.chapter=2;world.currentSceneId="ch2_opening";world.quests.quest_chapter_1="completed";world.quests.quest_chapter_2="active";
  const engine=new GameEngine({world,character:{id:"hero"},content:{chapters}});
  for(let chapter=2;chapter<=8;chapter++){
    engine.choose(engine.scene.choices[0].id);
    assert.equal(world.currentSceneId,`ch${chapter}_split`);
    engine.choose(engine.scene.choices[0].id);
    engine.choose(engine.scene.choices[0].id);
    const battleChoice=engine.choose(engine.scene.choices[0].id);
    assert.equal(world.currentSceneId,`ch${chapter}_confrontation`);
    engine.finishBattle(battleChoice,"victory");
    assert.equal(world.currentSceneId,`ch${chapter}_decision`);
    const decision=engine.scene.choices[0];
    engine.choose(decision.id);
    assert.equal(world.flags[`chapter_${chapter}_complete`],true);
    assert.equal(world.quests[`quest_chapter_${chapter}`],"completed");
    if(chapter<8){assert.equal(world.chapter,chapter+1);assert.equal(world.currentSceneId,`ch${chapter+1}_opening`);}
  }
  assert.equal(world.flags.game_complete,true);
  assert.equal(world.currentSceneId,"ending");
});

test("post-chapter-one defeat returns to the current confrontation without losing clues",()=>{
  const world=createWorld({name:"戰敗測試",startingCountry:"dasheng",ownerCharacterId:"hero",seed:"defeat"});
  world.chapter=4;world.currentSceneId="ch4_confrontation";world.clues.push("clue_ch4_swapped");
  const engine=new GameEngine({world,character:{id:"hero"},content:{chapters}});
  const battleChoice=engine.choose(engine.scene.choices[0].id);
  engine.finishBattle(battleChoice,"defeat");
  assert.equal(world.currentSceneId,"ch4_confrontation");
  assert.deepEqual(world.clues,["clue_ch4_swapped"]);
});
