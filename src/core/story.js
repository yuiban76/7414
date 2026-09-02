export const CLUE_LABELS = {
  clue_palm_wound:"掌力才是真正死因，刀傷是事後偽造。", clue_blood_river_mark:"血河紋的染料太新，像刻意留下。", clue_escort_roster:"鏢隊原有二十三人，另二十二人生死未卜。", clue_government_route:"路引顯示車隊曾被官差放行。", clue_city_rumor:"有人連夜收購軍械材料。", clue_ledger:"帳冊證明走私橫跨三國，已持續半年。",
  clue_ch2_customs:"三座城的關稅簿使用同一枚偽造驗印。", clue_ch2_barges:"軍械材料藏在四海商盟的藥材駁船底艙。", clue_ch2_wumen:"無門會握有失蹤腳夫名冊，卻要求交換帳冊抄本。",
  clue_ch3_seals:"嫁禍三派的密信紙墨相同，門派印信卻全是拓印。", clue_ch3_disciples:"失蹤弟子被迫替商路看守私庫，並非彼此殘殺。", clue_ch3_mediator:"三派長老中各有人收受同一名掮客的銀票。",
  clue_ch4_swapped:"大晟與北朔軍械的批號被人整箱互換。", clue_ch4_signal:"邊境誤射命令來自一套仿製軍旗暗號。", clue_ch4_refugees:"撤離路線被故意封死，百姓被當作逼迫開戰的籌碼。",
  clue_ch5_forgery:"多樁血河門罪案使用相同的新染料偽造血紋。", clue_ch5_factions:"激進、守舊、改革三派都藏有被夜梟勒索的把柄。", clue_ch5_prisoners:"被囚者證實血河門既犯過舊罪，也替近期假案背鍋。",
  clue_ch6_council:"三國密使在同一夜收到內容互相矛盾的盟約草案。", clue_ch6_finance:"商盟銀票同時資助主戰派與反戰派，所求只是壟斷。", clue_ch6_manifesto:"幕後集團內部有統一、削權、門派掌權與逐利四種立場。",
  clue_ch7_border:"雁關若失守，北境援軍將無法在三日內抵達。", clue_ch7_assassination:"刺殺名單的真正目標是讓三國談判席位全部空缺。", clue_ch7_supply:"商路車隊載的不只是貨物，還有兩城百姓的冬糧。",
  clue_ch8_allies:"願意赴最後一役的盟友，完全由前七章的承諾決定。", clue_ch8_enemy:"最後的阻路者不是固定魔頭，而是最害怕你所選秩序的人。", clue_ch8_cost:"任何新秩序都有人付出代價；差別只在代價是否被看見。"
};

export const CHAPTER_ONE_SCENES = {
  opening: { title:"雨夜驚馬", text:({countryOpening})=>`${countryOpening}\n\n一匹驚馬拖著染血的破鏢車闖入長街。車上只剩一具屍體，掌心卻緊攥著半枚木牌。陸小川按住劍柄：「這不像尋常劫鏢。」`, choices:[{id:"inspect",label:"上前查驗鏢車",next:"cart",effects:[{effectId:"add_clue",params:{clueId:"clue_escort_roster"}}]},{id:"crowd",label:"先問四周目擊者",next:"cart",effects:[{effectId:"add_clue",params:{clueId:"clue_city_rumor"}}]}] },
  cart: { title:"染血鏢車", text:"屍身衣上有血河紋，胸前刀口駭人，手臂卻有一圈不自然的青紫。你正要細看，屋脊上忽然落下三名黑巾客，直取屍身。", choices:[{id:"battle_tutorial",label:"攔住黑巾客",battle:"tutorial",next:"split"}] },
  split: { title:"三線查案", text:"黑巾客退走後，鏢盟與巡武司先後趕到。線索互相矛盾，正適合分頭追查。你們約定入夜前在客棧集合，共享所得。", choices:[{id:"escort",label:"前往天下鏢盟查名冊",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_escort_roster"}}]},{id:"office",label:"去巡武司查路引",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_government_route"}}]},{id:"streets",label:"沿市井傳聞追查買家",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_city_rumor"}}]}] },
  regroup: { title:"客棧合卷", text:"三路情報在桌上攤開：失蹤人數、異常路引、軍械材料。再看屍傷，嫁禍的痕跡已藏不住。城外廢貨棧，是所有線索唯一的交點。", choices:[{id:"inspect_body",label:"重新比對屍傷",next:"warehouse",effects:[{effectId:"add_clue",params:{clueId:"clue_palm_wound"}},{effectId:"add_clue",params:{clueId:"clue_blood_river_mark"}}]},{id:"go",label:"立刻趕往城外貨棧",next:"warehouse"}] },
  warehouse: { title:"城外貨棧", text:"貨棧暗門後，失蹤鏢師被分批囚禁。鐵掌・嚴震擋在帳房前，雙掌泛起不正常的赤色。他低聲道：「查到這裡，便別想再回洛川。」", choices:[{id:"battle_boss",label:"迎戰鐵掌・嚴震",battle:"boss",next:"ledger"},{id:"observe_first",label:"先觀察他的呼吸與站姿",battle:"boss_observed",next:"ledger"}] },
  ledger: { title:"半載暗流", text:"帳房密格裡不是金銀，而是跨越三國的軍械帳冊。這樁案子沒有單一真兇：鏢局、商盟、官差與不明買家都在鏈上。你只能決定，先把真相交到誰手中。", choices:[{id:"government",label:"將帳冊交給巡武司",major:true,complete:true},{id:"escort_alliance",label:"將帳冊交給天下鏢盟",major:true,complete:true},{id:"publish",label:"抄錄後公諸於眾",major:true,complete:true},{id:"keep",label:"自行保留，暗中追查",major:true,complete:true}] }
};

const CHAPTER_ARCS = [
  {chapter:2,name:"暗流",opening:"帳冊上的第一條線，把你帶到河陽水陸交會處。四海商盟封了倉，巡武司扣了關稅簿，無門會則先一步帶走三名腳夫。每一方都只肯說半句真話。",approaches:["以帳冊批號查貨物流向","先找失蹤腳夫的家人"],leads:[["查三城關稅簿","clue_ch2_customs"],["潛入藥材駁船","clue_ch2_barges"],["與無門會接頭","clue_ch2_wumen"]],regroup:"三條線在河陽舊船塢交會：偽印讓貨物過關，駁船負責轉運，無門會則保留了被滅口者的名字。這不是一筆生意，而是一套能自行更換節點的利益鏈。",foe:"商路的守門人已帶死士封住船塢，想把人證與簿冊一起沉進河底。",decision:"船塢火勢熄滅後，整條商路短暫暴露。你只能選擇先斬斷哪一環。",choices:[["ch2_choice_1","截斷商路"],["ch2_choice_2","追查官線"],["ch2_choice_3","與無門會交換情報"],["ch2_choice_4","放長線釣大魚"]]},
  {chapter:3,name:"裂盟",opening:"軍械證據被刻意送入三大門派。太岳弟子指控青虛盜印，金剛寺則收到一車染血兵刃。山門之間劍拔弩張，失蹤弟子反而無人追問。",approaches:["先驗三派密信與印信","要求各派交出失蹤名冊"],leads:[["比對密信紙墨","clue_ch3_seals"],["尋找失蹤弟子","clue_ch3_disciples"],["追查長老銀票","clue_ch3_mediator"]],regroup:"證據證明三派都被同一批拓印與銀票操弄。被救出的弟子說，他們被迫看守私庫，行兇者卻穿著彼此門派的衣服。",foe:"掮客放出假死訊，三派先鋒已在斷橋開戰。你必須先擊倒煽動者，才有機會讓眾人聽見證詞。",decision:"刀劍暫歇，三派卻都要求你決定證據如何處置。這個選擇將改變門派是否仍願相信外人。",choices:[["ch3_choice_1","調停三派"],["ch3_choice_2","公開證據"],["ch3_choice_3","支持門派自治"],["ch3_choice_4","保持中立"]]},
  {chapter:4,name:"北境風雷",opening:"雁關外同時出現大晟箭簇與北朔甲片，兩軍都認定對方越境備戰。第一支試探箭已上弦，關下百姓卻仍困在封路的村鎮。",approaches:["登關檢查軍械批號","先護送村民離開交戰線"],leads:[["核對兩軍庫號","clue_ch4_swapped"],["拆解仿製軍旗暗號","clue_ch4_signal"],["重開百姓撤離道","clue_ch4_refugees"]],regroup:"軍械不是走私給敵國，而是被整批互換；仿製暗號會在同一刻命令兩軍誤射。有人想要的不是勝負，而是讓戰爭必然發生。",foe:"主戰將領拒絕停箭，旗下死士已控制烽燧。只要狼煙升起，兩軍便再無退路。",decision:"烽火被壓下，但關城、百姓、軍械與真相無法同時保全。你必須決定小隊先守住什麼。",choices:[["ch4_choice_1","守住雁關"],["ch4_choice_2","救援百姓"],["ch4_choice_3","奪回軍械"],["ch4_choice_4","揭破換械陰謀"]]},
  {chapter:5,name:"血河真相",opening:"你循假血紋深入赤水谷。血河門確曾以酷刑立威，近年的許多血案卻有太新的染料、太乾淨的刀口。門內三派也正為誰該背負舊罪互相殘殺。",approaches:["驗看歷年血案卷宗","先進地牢尋找活證"],leads:[["追查血紋染料","clue_ch5_forgery"],["探查三派把柄","clue_ch5_factions"],["救出地牢證人","clue_ch5_prisoners"]],regroup:"真相並不替血河門洗白：舊罪確鑿，近期嫁禍也確鑿。夜梟同時勒索三派，要他們把內鬥變成一場無人能翻案的滅門。",foe:"激進派打開禁地血池，準備殺盡證人後嫁禍中原諸派。改革派與守舊派都被堵在石門外。",decision:"禁地之戰結束，血河門仍可能改革、復舊、被剿滅或分裂。每條路都會決定最後一戰是否多一支援軍。",choices:[["ch5_choice_1","支持改革派"],["ch5_choice_2","協助守舊派"],["ch5_choice_3","剿滅激進派"],["ch5_choice_4","迫使血河分裂"]]},
  {chapter:6,name:"三國棋局",opening:"三國密使在洛京秘密會面，手中卻各有一份不同的盟約。有人承諾統一天下，有人要削弱朝廷，有人只在合約背面計算戰後商利。",approaches:["比對三份盟約原稿","追查會盟資金來源"],leads:[["旁聽三國密議","clue_ch6_council"],["追索商盟銀票","clue_ch6_finance"],["奪取幕後宣言","clue_ch6_manifesto"]],regroup:"所謂幕後集團從來不是一人一令。統一派、削權派、門派派與逐利派暫時共用一張桌，只因混亂能讓每一方都先得利。",foe:"四派代表決定焚毀會盟證據，再讓刺客扮成敵國使節。議堂門外已被高手封鎖。",decision:"證據足以擊碎這次會盟，卻不足以一次消滅所有立場。你要先限制誰的力量，並承擔其餘派系坐大的風險。",choices:[["ch6_choice_1","維持三國制衡"],["ch6_choice_2","削弱朝廷"],["ch6_choice_3","限制商盟"],["ch6_choice_4","聯合江湖"]]},
  {chapter:7,name:"天下將亂",opening:"雁關告急、三派再起衝突、三國使節遭刺、兩城冬糧被劫，四封急報在同一刻抵達。你曾結下的盟友能分擔其中一些，卻絕不可能救下全部。",approaches:["先盤點各地盟友與欠下的承諾","查明四起危機是否共用時刻表"],leads:[["確認雁關援軍時限","clue_ch7_border"],["截下刺殺名單","clue_ch7_assassination"],["核對冬糧車隊","clue_ch7_supply"]],regroup:"四場危機共享同一份時刻表，目的就是逼你分兵。前六章留下的信任、敵意與通緝，現在決定哪些地方能自行撐住，哪些會因你缺席而失守。",foe:"夜梟主力守著傳令中樞，不斷把假命令送往各地。先奪下中樞，才能把有限的人手送到真正的危局。",decision:"傳令中樞被奪回，你仍只來得及親赴一處。其餘事件將由過去結下的盟友與敵人自行決定。",choices:[["ch7_choice_1","先救邊境"],["ch7_choice_2","先止門派衝突"],["ch7_choice_3","阻止刺殺"],["ch7_choice_4","保住商路"]]},
  {chapter:8,name:"江湖歸處",opening:"各地結果匯成最後一張局勢圖。站到你身後的人、守在對面的人，以及缺席的人，都由前七章的承諾與代價決定。此役爭的已不是帳冊，而是亂世後誰有權制定規則。",approaches:["逐一確認盟友願付出的代價","先辨明最後阻路者的真正訴求"],leads:[["清點最後盟友","clue_ch8_allies"],["查明最終敵手","clue_ch8_enemy"],["記錄新秩序代價","clue_ch8_cost"]],regroup:"你終於看清：最終敵手不是固定的魔頭，而是最害怕你所選秩序的人。有人要保住舊位，有人相信強權才能止亂，也有人寧願讓天下永遠無主。",foe:"最後的阻路者帶著由你過往選擇所催生的同盟現身。這一戰無法證明哪種秩序完美，只能證明你願意為何種代價負責。",decision:"兵刃落地，所有人等待你寫下最後一條原則。它不會讓江湖從此太平，卻會決定下一場衝突由誰說話。",choices:[["ch8_choice_1","維持舊秩序"],["ch8_choice_2","推動改革"],["ch8_choice_3","擁立單一勢力"],["ch8_choice_4","江湖自主"]]}
];

function buildChapterScenes(arc){
  const prefix=`ch${arc.chapter}`;
  return {
    [`${prefix}_opening`]:{title:`${arc.name} · 入局`,text:arc.opening,choices:arc.approaches.map((label,index)=>({id:`${prefix}_approach_${index+1}`,label,next:`${prefix}_split`,effects:[{effectId:"set_flag",params:{key:`${prefix}_approach`,value:index+1}}]}))},
    [`${prefix}_split`]:{title:`${arc.name} · 分頭查探`,text:"眼前線索無法靠一條路查清。你們約定時辰與集合地點，各自帶回能被交叉驗證的證據。",choices:arc.leads.map(([label,clueId],index)=>({id:`${prefix}_lead_${index+1}`,label,next:`${prefix}_regroup`,effects:[{effectId:"add_clue",params:{clueId}}]}))},
    [`${prefix}_regroup`]:{title:`${arc.name} · 情報合卷`,text:arc.regroup,choices:[{id:`${prefix}_prepare`,label:"整理證據，安排正面交涉",next:`${prefix}_confrontation`,effects:[{effectId:"set_flag",params:{key:`${prefix}_prepared`,value:true}}]},{id:`${prefix}_rush`,label:"趁對方尚未轉移，立刻出發",next:`${prefix}_confrontation`}]},
    [`${prefix}_confrontation`]:{title:`${arc.name} · 關鍵一戰`,text:arc.foe,choices:[{id:`${prefix}_battle`,label:"迎戰，奪回主動",battle:`${prefix}_boss`,next:`${prefix}_decision`}]},
    [`${prefix}_decision`]:{title:`${arc.name} · 重大選擇`,text:arc.decision,choices:arc.choices.map(([majorChoiceId,label])=>({id:`${majorChoiceId}_scene`,majorChoiceId,label,major:true,complete:true}))}
  };
}

export const STORY_SCENES={...CHAPTER_ONE_SCENES,...Object.assign({},...CHAPTER_ARCS.map(buildChapterScenes))};
