import fs from 'node:fs';
import assert from 'node:assert/strict';
import {TenChapterEngine,createTenChapterState,renderRevengeText} from '../src/core/revenge-engine.js';
const story=JSON.parse(fs.readFileSync(new URL('../src/data/revenge-story.json',import.meta.url),'utf8'));
assert.equal(story.presentation?.edition,'paced');
const han=text=>(text.match(/\p{Script=Han}/gu)??[]).length;
const flags=Object.entries(story.flags).reduce((paths,[key,values])=>paths.flatMap(path=>values.map(value=>({...path,[key]:value}))),[{}]);
const totals=flags.map(choices=>story.chapters.flatMap(c=>c.scenes).filter(s=>Object.entries(s.when??{}).every(([key,value])=>choices[key]===value)).reduce((sum,s)=>{
  assert.ok(typeof s.playText==='string'&&s.playText.trim());
  return sum+han(renderRevengeText(s.playText,choices));
},0));
const routes=[];
for(const variant of [0,1]){
  const world={chapter:1,flags:{},quests:{},clock:{day:1,segment:'morning'},visitedLocations:[],party:{playerIds:['hero'],npcIds:[]},npcStates:{},zhaoye:createTenChapterState(story)};
  const character={id:'hero',moneyWen:0,cultivation:0};
  const engine=new TenChapterEngine({world,character,content:{revengeStory:story}});
  const chapters=story.chapters.map(c=>({chapter:c.chapter,title:c.title,pages:0,han:0,fullHan:0,largestPage:0}));
  for(let steps=0;!world.flags.game_complete;steps++){
    assert.ok(steps<600);
    const view=engine.sceneView(),row=chapters[world.chapter-1];
    const action=view.choices[view.choices.length>1?variant:0];
    if(view.sceneIds){
      const length=han(view.text);row.pages++;row.han+=length;row.fullHan+=han(view.fullText);row.largestPage=Math.max(row.largestPage,length);
      assert.ok(length<=600);
      assert.ok(view.sceneIds.length<=4);
    }
    const result=engine.choose(action.id);
    if(result.battle)engine.finishBattle(result,'victory');
  }
  const sum=key=>chapters.reduce((total,c)=>total+c[key],0);
  assert.ok(sum('pages')<170);
  assert.ok(sum('han')<sum('fullHan')*.5);
  routes.push({route:variant===0?'first-options':'second-options',pages:sum('pages'),han:sum('han'),fullHan:sum('fullHan'),chapters});
}
const report={edition:'paced',originalRouteScenes:397,branchTextPaths:flags.length,routeTextHan:[Math.min(...totals),Math.max(...totals)],routes};
if(process.argv.includes('--report'))fs.writeFileSync(new URL('../docs/play-edition/status.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
