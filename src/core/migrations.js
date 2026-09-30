import { INNER_REFINEMENTS, INNER_REFINEMENT_CAP, LEGACY_INNER_MERGES } from "../config/inner-refinement.js";
import { validateSidequests } from '../systems/sidequest-system.js';

const MERGED_ART_INNER = { inner_008:35, inner_010:30, inner_011:30, inner_003:20, inner_009:45, inner_012:35, inner_015:60, inner_016:55 };

function mergeInnerProgress(character) {
  character.innerArts??={};
  const priorArts=Object.values(character.innerArts);
  const priorStudy=Math.min(6,priorArts.length)*50;
  const priorRealm=priorArts.map(value=>Math.max(0,Math.min(5,value.realm??0))*10).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
  for(const [oldId,newId] of Object.entries(LEGACY_INNER_MERGES)){
    const old=character.innerArts[oldId];if(!old)continue;
    const current=character.innerArts[newId];
    if(current)character.cultivation=(character.cultivation??0)+100;
    character.innerArts[newId]={realm:Math.max(old.realm??0,current?.realm??0),proficiency:Math.max(old.proficiency??0,current?.proficiency??0),active:Boolean(old.active||current?.active),maxInner:Math.max(MERGED_ART_INNER[newId],old.maxInner??0,current?.maxInner??0),refinement:current?.refinement??0};
    delete character.innerArts[oldId];
  }
  const mergedArts=Object.values(character.innerArts);
  const mergedStudy=Math.min(6,mergedArts.length)*50;
  const mergedRealm=mergedArts.map(value=>Math.max(0,Math.min(5,value.realm??0))*10).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
  character.legacyInnerStudyCredit=(character.legacyInnerStudyCredit??0)+Math.max(0,priorStudy-mergedStudy);
  character.legacyInnerRealmCredit=(character.legacyInnerRealmCredit??0)+Math.max(0,priorRealm-mergedRealm);
  for(const [artId,definition] of Object.entries(INNER_REFINEMENTS)){
    const level=Math.max(0,Math.min(INNER_REFINEMENT_CAP,Math.floor(Number(character.meridians?.[definition.legacyId])||0)));
    if(!level)continue;
    const art=character.innerArts[artId]??={realm:0,proficiency:0,active:true,maxInner:0,refinement:0,legacyMeridianOnly:true};
    art.refinement=Math.max(art.refinement??0,level);
    art.active=true;
  }
  delete character.meridians;
}

export function migrateSave(bundle) {
  const migrated=structuredClone(bundle); const warnings=[];
  if(!Number.isInteger(migrated.schemaVersion))throw new Error('存檔版本無效。');
  if(migrated.schemaVersion<4)throw new Error('故事版本已更新，舊存檔無法使用。請重新創角開局；原有備份仍保留。');
  if(migrated.schemaVersion>4)throw new Error("這份存檔來自較新的遊戲版本，無法安全匯入。");
  if(migrated.schemaVersion<1)throw new Error("不支援的存檔版本。");
  if(migrated.schemaVersion===1){migrated.schemaVersion=2;warnings.push('已升級探索存檔格式；新奇遇尚未完成。');}
  if(migrated.schemaVersion===2){for(const character of migrated.characters??[])mergeInnerProgress(character);migrated.schemaVersion=3;warnings.push('已將經脈修為與相近內功併入內功精修。');}
  for(const world of migrated.worlds??[]){if(world.zhaoye?.storyRevision!==2)throw new Error('故事版本已更新，請重新創角開局。');validateSidequests(world);}
  return { bundle:migrated, warnings };
}
