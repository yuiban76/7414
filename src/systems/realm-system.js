// Composite training milestone: spare money, chapter and unused cultivation never grant a realm or level.
import { INNER_REFINEMENTS, INNER_REFINEMENT_CAP } from "../config/inner-refinement.js";
export const REALM_THRESHOLDS=[0,80,160,260,380,520];
export const CHARACTER_LEVEL_CAP=100;
export const TRAINING_SCORE_CAP=1020;

export function levelProgressFromTrainingScore(score){
 const trainingScore=Number.isFinite(score)?Math.max(0,Math.min(TRAINING_SCORE_CAP,Math.floor(score))):0;
 const level=Math.min(CHARACTER_LEVEL_CAP,1+Math.floor(trainingScore*(CHARACTER_LEVEL_CAP-1)/TRAINING_SCORE_CAP));
 const levelStart=level===1?0:Math.ceil((level-1)*TRAINING_SCORE_CAP/(CHARACTER_LEVEL_CAP-1));
 const nextLevel=level===CHARACTER_LEVEL_CAP?TRAINING_SCORE_CAP:Math.ceil(level*TRAINING_SCORE_CAP/(CHARACTER_LEVEL_CAP-1));
 const progressRequired=level===CHARACTER_LEVEL_CAP?1:Math.max(1,nextLevel-levelStart);
 const progress=level===CHARACTER_LEVEL_CAP?1:trainingScore-levelStart;
 return {level,trainingScore,progress,progressRequired,progressPercent:Math.floor(progress/progressRequired*100)};
}

export function calculateRealm(character){
 const skillMasteries=Object.values(character.skills??{}).map(value=>{
  const realm=Math.max(0,Math.min(5,Number.isFinite(value.realm)?value.realm:0));
  const completeness=Math.max(0,Math.min(1,Number.isFinite(value.completeness)?value.completeness:1));
  const proficiency=Math.max(0,Math.min(100,Number.isFinite(value.proficiency)?value.proficiency:0));
  return {realmScore:realm*completeness*20,trainingScore:(realm===5?5:realm+proficiency/100)*completeness*20};
 });
 const topSix=values=>values.sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
 const skill=topSix(skillMasteries.map(value=>value.realmScore));
 const skillTraining=topSix(skillMasteries.map(value=>value.trainingScore));
 const innerArts=Object.values(character.innerArts??{});
 const innerRealm=Math.min(300,innerArts.map(v=>Math.max(0,Math.min(5,v.realm??0))*10).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0)+Math.max(0,character.legacyInnerRealmCredit??0));
 const innerStudy=Math.min(300,Math.min(6,innerArts.filter(value=>!value.legacyMeridianOnly).length)*50+Math.max(0,character.legacyInnerStudyCredit??0));
 const innerRefinement=Object.entries(character.innerArts??{}).reduce((sum,[id,value])=>sum+(INNER_REFINEMENTS[id]?Math.max(0,Math.min(INNER_REFINEMENT_CAP,Math.floor(Number(value.refinement)||0)))*2:0),0);
 const score=skill+innerRealm+innerRefinement;
 const trainingScore=skillTraining+innerStudy+innerRefinement;
 return {score,realm:REALM_THRESHOLDS.findLastIndex(n=>score>=n),...levelProgressFromTrainingScore(trainingScore)};
}
