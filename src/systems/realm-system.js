// Composite training milestone: spare money, chapter and unused cultivation never grant a realm.
export const REALM_THRESHOLDS=[0,80,160,260,380,520];
export function calculateRealm(character){
 const skill=Object.values(character.skills??{}).map(v=>Math.max(0,Math.min(5,v.realm??0))*Math.max(0,Math.min(1,v.completeness??1))*20).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
 const inner=Object.values(character.innerArts??{}).map(v=>Math.max(0,Math.min(5,v.realm??0))*10).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
 const meridians=Object.values(character.meridians??{}).reduce((sum,v)=>sum+Math.max(0,Math.min(10,v))*2,0);
 const score=skill+inner+meridians;
 return {score,realm:REALM_THRESHOLDS.findLastIndex(n=>score>=n)};
}
