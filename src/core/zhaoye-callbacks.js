const choice=(w,id)=>w.zhaoye.events[id]?.choice;
export function chapterHandoff(w){
 const s=w.zhaoye;
 const oldCase=s.oldCaseSubmitted
  ?'血河舊案已分卷提交，殷紅袖留下協助受害者；願意查偽案，不等於替舊案求原諒。'
  :choice(w,'2-4')==='B'
   ?'血河舊案仍待青衡公議履行承諾，沒有被新案沖掉。'
   :'血河舊案的提交狀態尚未記錄，抵達前仍須核對卷況。';
 const testimony=choice(w,'4-4')==='B'
  ?'蘇問棠已把證人分船安置；人先安全，正式辨認要等承京逐人補核，不能提前當成定罪。'
  :choice(w,'4-4')==='A'
   ?'自願作證的醫工已在汀州留下可核對的卷頁；沒有到場的人，仍不能由他人代答。'
   :'醫工名冊仍須逐人核對，青衡公議不能把缺席證人當成已作證。';
 const mountain=choice(w,'5-5')==='A'
  ?'顧長纓收回通行牌，你們帶著卷宗離山，不再有青衡門的庇護。'
  :choice(w,'5-5')==='B'
   ?'你們保留調查聯絡，卻沒有交回證人；聽顧把話說完，不等於停止追查。'
   :'青衡公議的證言與卷宗同行；顧長纓邀你們到照夜臺，調查尚未因此結束。';
 const dispatch=choice(w,'6-5')==='A'
  ?'可驗副本已分送，涉案者開始加快部署；抵達後要立刻核對軍令與現場。'
  :choice(w,'6-5')==='B'
   ?'聯署封存多出一項行前準備，但必須守住會盟前解封的約定；封條不能替你們擋下三路警報。'
   :'雙令已封存，行前支援尚未確定；抵達鎖雲關仍要逐項核對三路警報。';
 const reply=({A:'你們已回信「讓活人走」；使者仍被扣在閘後，這句話還得在現場兌現。',B:'你們已回信要求交出主使再談；證據能否逼出讓步，要到照夜臺才知道。',C:'你們已回信要自行進入；不再把等待談判當成救人的辦法。'})[choice(w,'7-5')]??'顧長纓仍扣著使者；密道是眼下唯一已知入口，沒有任何一方答應放人。';
 const handoffs={
  1:`下一程｜赤水埠\n磨坊留下的帳冊只有路線與代號，尚不足以替任何權貴定罪。帶著抄本和交接憑據去核對那張把少年連到十二年前焚村案的通緝榜；殷紅袖願意查偽案，受害者仍有自己的舊帳。`,
  2:`下一程｜雁回城\n赤水的新案與舊罪已分卷。${oldCase}雁回城的軍糧簿上，死人仍領著口糧，活人卻端著空碗；阿史那衡不能再把送人進工坊說成「以為是新兵」。`,
  3:`下一程｜汀州\n雁回城的糧帳與囚工名冊都已留下可查的去向。沿著轉運線南下，下一步要對的是汀州官船與十八張空床；蘇問棠曾簽下「秋前回家」的保證，這次她要親自核對名冊以外的人。`,
  4:`下一程｜青衡山\n${testimony}青衡公議要面對的，是顧長纓如何把失蹤工匠寫成「失船」或「染疫」；救過人，不能替被抹掉的人作答。`,
  5:`下一程｜承京\n${mountain}山上證言能說明誰做過什麼，命令與付款批文才能追到誰下令。帶卷宗去承京，讓簽字者也留下姓名。`,
  6:`下一程｜鎖雲關\n${dispatch}承京留下的雙令，一份寫「留」，另一份卻把「留」改成「除」。到鎖雲關，必須在這道命令變成橋上傷亡之前查明誰在冒用軍令。`,
  7:`下一程｜照夜臺\n${reply}密道能讓你們進場，不能保證使者願意接受任何條件；第一道鐵閘升起前，先讓不在談判桌上的人有退路。`
 };
 return handoffs[w.chapter]??'';
}

export function storyCallbacks(w,id){
 const s=w.zhaoye,lines=[];
 if(id==='2-1')lines.push(({government:'官府調走原帳，收件案號與抄本仍在。赤水差役請你按交接紀錄補驗。',escort:'鏢盟帶來救援公銀的收條，家屬代表保管公帳，不把它算進你的私款。',self:'共管卷箱的封記完好，原帳與赤水通緝榜可以當面對照。'})[s.ledger]);
 if(id==='2-3'&&choice(w,'1-2B')==='C')lines.push('磨坊外記下的地窖回路與鹽倉相連，接應者已找到較穩的撤離口。');
 if(id==='3-1'&&choice(w,'2-3B')==='A')lines.push('安置囚工後北上的商隊已先走。外堂送來住宿名單，先前的耽擱沒有被寫成白費。');
 if(id==='5-2'){
  const meeting=choice(w,'4-2A');if(meeting)lines.push(({A:'有人拿孟的片面紀錄指你封口，同隊共同記錄逐句指出未曾接受的條件。',B:'分工筆記補齊了孟刻意省去的條件，主談者並未代全隊答應停查。',C:'廊席目擊者確認孟答應放人，卻未曾取得你停止追資金的承諾。'})[meeting]);
 }
 if(id==='5-3')lines.push(({government:'調卷抄號引到鏢盟與裴府往來，原帳待承京追回。',escort:'原帳夾頁多了顧的批示，葉停舟握緊當時保管收條，逐項核對取回。',self:'你打開共管原帳，对照墨色與代號，確認前後記法一致。'})[s.ledger]);
 if(id==='6-1'&&choice(w,'1-0A')==='B')lines.push('出發前約好的交接紀錄一直保留，案卷來歷不用靠誰記性好來補。');
 if(id==='6-1B'&&s.ledger==='escort')lines.push(`救援公帳另存：尚餘 ${s.publicFunds} 文。這不是角色私領的酬金，說明時必須區分。`);
 if(id==='7-2'){
  if(s.escortOutcome?.backup==='delivered')lines.push('第二路信使的回執已到，證據沒有失落；封街延誤仍列在案，官府暫縮一部分前哨護送。');
  lines.push(choice(w,'3-4')==='A'?'開倉時登記的車戶回來接人，仍逐車確認載量。':'查糧官送來軍用通行令，備糧核驗留下的協作現在用來開路。');
  lines.push(choice(w,'4-4')==='A'?'汀州自願作證的船工帶来班表，愿協助一段航程。':'庇護所的聯絡人帶來安全渡船，證人住址仍不公開。');
  const siblings=choice(w,'3-2B');if(siblings)lines.push(({A:'阿拓從冬棚寄來平安信，尚不願隨軍，哥哥沒有替他改口。',B:'軍令出現衝突，阿史那衡先核人員和交接，不再叫普通兵只管服從。',C:'阿拓寄来修車師傅畫的輪軸，願協助的是民間車隊，不是再領軍籍。'})[siblings]);
 }
 if(id==='8-1'&&choice(w,'7-4B'))lines.push(({A:'夜營已約好先救人，接應者指向下層鐵閘。',B:'夜營已約好先拆殺使安排，側樓的階道留在圖上；人質由場外接應守護。',C:'試談先問能確認的放人動作。守衛帶出部分侍役後，殷才在名單上畫記。'})[choice(w,'7-4B')]);
 if(id==='8-4'&&choice(w,'5-2C'))lines.push(({A:'葉停舟仍記得顧救過師父，卻指著主鎖問他親自下的是哪一道命令。',B:'葉停舟把改寫的失船紀錄放下，不用猜測替自己相信過的人定罪。',C:'葉停舟念出自己寫的新規矩：「讓委託人知道人在哪裡。」說完，再問顧開門。'})[choice(w,'5-2C')]);
 return lines.filter(Boolean).join('\n\n');
}

export function storyBattleModifiers(w){
 const id=w.currentSceneId,c=(event,value)=>choice(w,event)===value;
 let incoming=1,hp=1,grace=0;const reasons=[];
 const add=(condition,kind,value,reason)=>{if(!condition)return;if(kind==='incoming')incoming+=value;if(kind==='hp')hp+=value;if(kind==='grace')grace+=value;reasons.push(reason);};
 if(id==='1-3'){
  add(c('1-0A','A'),'grace',1,'舊約先救人：火場多一回合容錯');
  add(c('1-2B','A'),'hp',-.1,'截下望哨交接，守備較薄');
  add(c('1-2B','B'),'hp',.1,'追蹤耗時，守備已警覺');
  add(c('1-2B','C'),'incoming',-.1,'地窖撤退口可用');
 }
 if(id==='3-3'){add(c('3-2A','B'),'hp',.1,'牧道撤離較長，盾列已加固');add(c('3-2C','A'),'incoming',-.1,'掌握西門輪班');add(c('3-2C','C'),'incoming',-.1,'核實囚工後，倉卒不射傷者');}
 if(id==='4-3'){add(c('4-2C','A'),'grace',1,'有限停搬換得一回合準備');add(c('4-2C','A'),'hp',.1,'停搬驚動护衛');add(c('4-2D','B'),'grace',1,'封漏工具使操作更從容');add(c('4-2D','A'),'incoming',-.1,'雙接應船保護撤離');}
 if(id==='5-4'){add(c('5-3B','A'),'incoming',-.1,'補水並核值夜牌');add(c('5-2D','C'),'hp',.1,'共同分工費時，正面守備已集結');add(c('5-3B','B'),'incoming',-.1,'證人提前集中，護送路較穩');}
 if(id==='6-4'){add(c('6-3B','A'),'hp',.1,'原件證人同行，敵方集中堵截');add(c('6-2D','A'),'incoming',-.1,'受限授權的正式陪同');}
 if(id==='7-3'){add(w.zhaoye.preparations.includes('B'),'incoming',-.1,'事先查驗騎隊');add(c('7-2C','B'),'hp',-.1,'監督交信截去側翼');add(c('7-2D','B'),'incoming',.05,'保留烽火，騎隊較近才交戰');}
 if(id==='8-4'){add(c('8-3A','C'),'hp',.1,'現場詳細對照，顧已调整站位');add(c('8-3B','B'),'incoming',-.15,'普通護衛閱令離場');}
 if(id==='7-3')add(w.zhaoye.escortOutcome?.governmentTrustPenalty>0,'incoming',.05,'封街送達延誤，官府前哨護送暫縮');
 return {incoming:Math.max(.7,incoming),hp:Math.max(.7,hp),grace,reasons};
}

export function scaleStoryEncounter(enemy,world,partySize){
 const mods=storyBattleModifiers(world),size=Math.max(1,Math.min(4,partySize));
 const hpScale=[0,.65,1,1.2,1.4][size],damageScale=[0,.7,1,1.1,1.18][size];
 enemy.maxHp=Math.round(enemy.maxHp*mods.hp*hpScale);enemy.hp=enemy.maxHp;
 enemy.damageMultiplier=(enemy.damageMultiplier??1)*mods.incoming*damageScale*(size===1&&world.currentSceneId==='1-3'?.94:1);
 return [...mods.reasons,...(size===1?['單人接應牽制外圍守備：正面敌群與來襲壓力減少，機關仍由你逐項處理。']:[])];
}
