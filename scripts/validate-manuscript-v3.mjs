import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CHAPTERS, FLAGS, FORESHADOWS, PROJECT } from '../docs/manuscript-v3/scene-map.mjs';

const root=new URL('../docs/manuscript-v3/',import.meta.url);
const han=text=>(text.match(/\p{Script=Han}/gu)??[]).length;
const invariant=(value,message)=>{if(!value)throw new Error(message);};

export function readChapter(text){
  text=text.replace(/\r\n?/g,'\n');
  const headings=[...text.matchAll(/^## (\d{2}-\d{2}[a-z]?)[ \t\u3000]+([^\r\n]+)$/gm)];
  return headings.map((m,i)=>({id:m[1],title:m[2].trim(),body:text.slice(m.index+m[0].length,headings[i+1]?.index??text.length).trim()}));
}
export function renderScene(body,flags){
  let include=true;
  return body.split(/\r?\n/).flatMap(line=>{
    const gate=line.match(/^### \[([a-z0-9_]+)=([a-z]+)\]$/);
    if(gate){include=flags[gate[1]]===gate[2];return [];}
    if(line==='### 共通'){include=true;return [];}
    if(line.startsWith('>')||line.startsWith('#'))return [];
    return include?[line]:[];
  }).join('\n').trim();
}
function paths(entries=Object.entries(FLAGS),index=0,flags={}){
  if(index===entries.length)return [flags];
  const [key,values]=entries[index];return values.flatMap(value=>paths(entries,index+1,{...flags,[key]:value}));
}

export function audit(){
  invariant(CHAPTERS.length===10,'必須有十章');
  invariant(CHAPTERS.reduce((n,c)=>n+c.targetMinutes,0)===PROJECT.targetMinutes,'章節分鐘總和與目標不符');
  const seen=new Set(),all=[],available=new Set(),paragraphs=new Map(),duplicates=[];
  for(const [i,c]of CHAPTERS.entries()){
    invariant(c.chapter===i+1,'章節必須連續');
    const text=fs.readFileSync(new URL(c.file,root),'utf8'),actual=readChapter(text);
    invariant(!text.includes('謝無咎'),`${c.file} 尚未更新反派姓名為謝欣達`);
    invariant(!/TODO|待補正文|待寫正文|此處省略|示意正文/.test(text),`${c.file} 有未寫正文標記`);
    invariant(actual.length===c.scenes.length,`${c.file} 分場數量不符`);
    for(const [j,s]of c.scenes.entries()){
      invariant(!seen.has(s.id),`場景 ID 重複：${s.id}`);seen.add(s.id);
      invariant(s.id===actual[j]?.id&&s.title===actual[j]?.title,`${c.file} 第 ${j+1} 場與分場表不符`);
      for(const key of ['intent','obstacle','result'])invariant(s[key]?.trim(),`${s.id} 缺少 ${key}`);
      if(s.choice){
        const {flag,options}=s.choice;invariant(FLAGS[flag],`${s.id} 未定義選擇旗標`);
        invariant(!available.has(flag),`${s.id} 重複設定選擇`);available.add(flag);
        invariant(options.length===FLAGS[flag].length&&new Set(options.map(o=>o.value)).size===options.length,`${s.id} 選擇結果重複或不齊`);
        for(const o of options)invariant(FLAGS[flag].includes(o.value)&&o.label,`${s.id} 無效選項`);
      }
      for(const [key,value]of Object.entries(s.when??{}))invariant(available.has(key)&&FLAGS[key].includes(value),`${s.id} 引用尚未選擇或無效的條件`);
      const body=actual[j].body;
      for(const gate of body.matchAll(/^### \[([a-z0-9_]+)=([a-z]+)\]$/gm))invariant(available.has(gate[1])&&FLAGS[gate[1]].includes(gate[2]),`${s.id} 正文引用尚未取得的分支 ${gate[1]}=${gate[2]}`);
      for(const p of body.split(/\r?\n\r?\n/).filter(p=>!p.startsWith('>')&&!p.startsWith('#')&&han(p)>45)){
        const normalized=p.replace(/\s+/g,'');if(paragraphs.has(normalized))duplicates.push([paragraphs.get(normalized),s.id]);else paragraphs.set(normalized,s.id);
      }
      all.push({...s,chapter:c.chapter,body});
    }
  }
  invariant(available.size===Object.keys(FLAGS).length,'有旗標從未由選擇建立');
  invariant(duplicates.length===0,`出現重複正文段落：${JSON.stringify(duplicates)}`);
  const order=new Map(all.map((s,i)=>[s.id,i]));
  for(const f of FORESHADOWS){
    invariant(order.has(f.payoff)&&f.seeds.length>=2,`${f.id} 缺少回收或兩處伏筆`);
    for(const id of f.seeds)invariant(order.has(id)&&order.get(id)<order.get(f.payoff),`${f.id} 有無效或過晚的伏筆 ${id}`);
  }
  const variants=paths();let shortest=Infinity,longest=0,minScenes=Infinity,maxScenes=0,minEncounters=Infinity,maxEncounters=0;
  const byChapter=CHAPTERS.map(c=>({chapter:c.chapter,title:c.title,targetMinutes:c.targetMinutes,minHan:Infinity,maxHan:0}));
  for(const flags of variants){
    const route=all.filter(s=>Object.entries(s.when??{}).every(([k,v])=>flags[k]===v));
    invariant(route.at(-1).id==='10-08','有路徑未到結局');
    const encounters=new Set(route.map(s=>s.encounter).filter(Boolean));
    minEncounters=Math.min(minEncounters,encounters.size);maxEncounters=Math.max(maxEncounters,encounters.size);
    let total=0;
    for(const c of CHAPTERS){
      const texts=route.filter(s=>s.chapter===c.chapter).map(s=>renderScene(s.body,flags));
      invariant(texts.length&&texts.every(t=>han(t)>=70),`第 ${c.chapter} 章有路線正文不足`);
      const n=texts.reduce((sum,t)=>sum+han(t),0);total+=n;
      byChapter[c.chapter-1].minHan=Math.min(byChapter[c.chapter-1].minHan,n);byChapter[c.chapter-1].maxHan=Math.max(byChapter[c.chapter-1].maxHan,n);
    }
    const joined=route.map(s=>renderScene(s.body,flags)).join('\n');
    if(flags.cheng==='leave'){
      invariant(!joined.includes('程渡留在渡口協助撤離'),'離隊者錯誤參與終章');
      invariant(joined.includes('閔石留在渡口修最後一輛傷車'),'離隊路線缺少接應替代');
      invariant(joined.includes('到巡檢處投案'),'離隊路線缺少個人結尾');
    }else{
      invariant(joined.includes('程渡留在渡口協助撤離'),'留隊路線缺少終章');
      invariant(!joined.includes('到巡檢處投案'),'兩種程渡結尾同時出現');
    }
    shortest=Math.min(shortest,total);longest=Math.max(longest,total);minScenes=Math.min(minScenes,route.length);maxScenes=Math.max(maxScenes,route.length);
  }
  const volumeReady=shortest>=PROJECT.targetPathHan[0];
  const playtimeVerified=PROJECT.runtimeIntegrated&&Number.isFinite(PROJECT.measuredPlayMinutes)&&PROJECT.measuredPlayMinutes>=1080&&PROJECT.measuredPlayMinutes<=1320;
  const playtestDeferred=PROJECT.playtestDeferred===true;
  return {stage:PROJECT.stage,chapters:CHAPTERS.length,authoredScenes:all.length,branchPaths:variants.length,pathScenes:[minScenes,maxScenes],pathHan:[shortest,longest],targetPathHan:PROJECT.targetPathHan,pathEncounters:[minEncounters,maxEncounters],targetMinutes:PROJECT.targetMinutes,measuredPlayMinutes:PROJECT.measuredPlayMinutes,runtimeIntegrated:PROJECT.runtimeIntegrated,volumeReady,playtimeVerified,playtestDeferred,releaseReady:volumeReady&&PROJECT.runtimeIntegrated&&(playtimeVerified||playtestDeferred),byChapter};
}

function report(r){
  const number=n=>n.toLocaleString('en-US');
  const volume=r.volumeReady
    ? '正文最短路徑已達十四萬漢字的下限；這是篇幅檢查，不代表已通過二十小時遊玩驗收。'
    : '正文量尚未達到十四至十八萬字預算，距最低預算尚差 '+number(Math.max(0,140000-r.pathHan[0]))+' 漢字。';
  return [
    '# 十章新稿：作者稿與實測狀態',
    '此表由 `npm run manuscript:v3:report` 重算。漢字數排除作者註記、標題及未選分支；重複輸出的閱讀版不納入份量。',
    '## 作者稿',
    '- 十章從山門日常寫至謝欣達終戰、善後與重返山門，共 '+r.authoredScenes+' 場。',
    '- '+r.branchPaths+' 種選擇組合結構走查，每條路徑 '+r.pathScenes[0]+'～'+r.pathScenes[1]+' 場。',
    '- 單一路徑正文 **'+number(r.pathHan[0])+'～'+number(r.pathHan[1])+' 漢字**。',
    '- 每條路徑交鋒 '+r.pathEncounters[0]+'～'+r.pathEncounters[1]+' 組，同一交鋒分段只計一次；已接入戰鬥、救援操作與快照續戰。',
    '- 十章各有一項選擇與分支後果；程渡留隊／離隊有各自接應與結尾。六條主要伏筆具有較早鋪墊與回收。',
    '- '+volume,
    '## 遊玩時長與本輪界線',
    '- 二十小時是十章主線的設計目標，掛機、刷怪、戰敗重試與支線不計。目前未取得主線實測時長。',
    '- 依使用者「二十小時實測先不用，先接入遊戲並推送」的指示，本輪完成遊戲接入並暫緩時長實測。playtestDeferred=true 不等同 playtimeVerified=true。',
    '- 遊戲版本 0.7.0／故事修訂 3／存檔格式 5：十章正文、選擇、交鋒及結尾已接入；舊資料保留，但必須重新創角。測試與限制見 [整合驗收](../revenge-integration-status.md)。',
    '## 各章份量',
    '| 章 | 章名 | 單路徑漢字 | 目標分鐘（未實測） |\n|---|---|---:|---:|\n'+r.byChapter.map(c=>'| '+c.chapter+' | '+c.title+' | '+number(c.minHan)+'～'+number(c.maxHan)+' | '+c.targetMinutes+' |').join('\n'),
    '## 檢查指令',
    '- `npm run manuscript:v3:check`：正文、分場、分支、條件、重複段落、伏筆及最低篇幅檢查。\n- `npm run manuscript:v3:report`：重算份量並輸出兩套閱讀版。\n- `npm run manuscript:v3:release-check`：要求篇幅與遊戲接入；時長須已實測或由使用者明確暫緩。本輪採暫緩，不證明二十小時已達成。',
  ].join('\n\n')+'\n';
}
export function readingEdition(cheng){
  invariant(FLAGS.cheng.includes(cheng),'未知程渡路線');
  const flags={c1_route:'warn',c2_bait:'yan',c3_entry:'winch',c4_reveal:'public',c5_plan:'evacuate',c6_exit:'ice',c7_training:'steady',cheng,c9_attack:'bolts',c10_approach:'inside'};
  const output=[`# 《照夜行》十章作者稿・${cheng==='stay'?'程渡留隊':'程渡離隊'}閱讀版`,`此版從分場原稿整理，只保留一組選擇的正文，移除作者註記。它是閱讀校稿用的路徑，不代表所有玩家必經。實際內容份量與驗收界線見 [交付狀態](status.md)。`,`所選路線：警告鐵匠、阿硯在接應下帶路、先破絞盤、周懷公開、先撤居民、另鋪冰道、穩練落腳、程渡${cheng==='stay'?'留隊':'離隊'}、斷弩補給、搶入槍尾。`];
  for(const chapter of CHAPTERS){
    output.push(`## 第${chapter.chapter}章　${chapter.title}`);
    const parsed=readChapter(fs.readFileSync(new URL(chapter.file,root),'utf8'));
    for(const s of chapter.scenes){
      if(!Object.entries(s.when??{}).every(([k,v])=>flags[k]===v))continue;
      output.push(`### ${s.title}`,renderScene(parsed.find(p=>p.id===s.id).body,flags));
    }
  }
  return output.join('\n\n')+'\n';
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  try{
    const result=audit();
    if(process.argv.includes('--report')){
      fs.writeFileSync(new URL('status.md',root),report(result));
      for(const cheng of FLAGS.cheng)fs.writeFileSync(new URL(`reading-${cheng}.md`,root),readingEdition(cheng));
    }
    console.log(JSON.stringify(result,null,2));
    if(process.argv.includes('--require-volume')&&!result.volumeReady){console.error('作者稿未達十四萬漢字的單路徑最低預算。');process.exitCode=2;}
    if(process.argv.includes('--release')&&!result.releaseReady){
      const missing=[];
      if(!result.volumeReady)missing.push('正文預算');
      if(!result.runtimeIntegrated)missing.push('遊戲接入');
      if(!result.playtimeVerified&&!result.playtestDeferred)missing.push('二十小時實測或明確暫緩指示');
      console.error(`尚未完成${missing.join('、')}；不可宣稱遊戲發布就緒。`);process.exitCode=2;
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
