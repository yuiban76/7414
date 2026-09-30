import fs from 'node:fs';
import { createWorld } from '../src/core/game-engine.js';
import { createZhaoyeState } from '../src/core/zhaoye-engine.js';
import { createCharacter } from '../src/systems/progression-system.js';
import { chooseSidequest,settleSidequestBattle,sidequestBattleAction } from '../src/systems/sidequest-system.js';
import { createExportBundle } from '../src/persistence/import-export.js';
import { sha256 } from '../src/persistence/checksum.js';
const skills=JSON.parse(fs.readFileSync('src/data/skills.json','utf8')).data;
const character=createCharacter({name:'風火驗收',gender:'unspecified',identityId:'identity_constable',stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName:'衙門刀法'},[{id:'talent_001'},{id:'talent_002'},{id:'talent_003'}],skills);
const world=createWorld({name:'支線風險驗收',startingCountry:'dasheng',ownerCharacterId:character.id,seed:'narrative-ui'});
character.homeWorldId=world.id;world.zhaoye=createZhaoyeState();world.chapter=2;world.currentSceneId='2-1';world.currentLocationId='location_017';world.party.npcIds.push('npc_003');
chooseSidequest(world,character,'sq03','accept');
for(const chapter of [2,5]){
 if(chapter===5){world.chapter=5;world.currentLocationId='location_004';world.currentSceneId='5-1';}
 const c=chooseSidequest(world,character,'sq03','battle');sidequestBattleAction(world,c);settleSidequestBattle(world,c,{finished:'victory'});
 if(chapter===2)chooseSidequest(world,character,'sq03','continue');
}
world.zhaoye.selectedSidequest='sq03';
const bundle=await createExportBundle({worlds:[world],characters:[character]});
fs.mkdirSync('docs/narrative-qa',{recursive:true});fs.writeFileSync('docs/narrative-qa/risk-fixture.json',JSON.stringify(bundle));
const {checksum,...old}=bundle;old.schemaVersion=3;fs.writeFileSync('docs/narrative-qa/old-fixture.json',JSON.stringify({...old,checksum:await sha256(old)}));
