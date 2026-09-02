export const CLUE_LABELS = {
  clue_palm_wound:"掌力才是真正死因，刀傷是事後偽造。", clue_blood_river_mark:"血河紋的染料太新，像刻意留下。", clue_escort_roster:"鏢隊原有二十三人，另二十二人生死未卜。", clue_government_route:"路引顯示車隊曾被官差放行。", clue_city_rumor:"有人連夜收購軍械材料。", clue_ledger:"帳冊證明走私橫跨三國，已持續半年。"
};

export const CHAPTER_ONE_SCENES = {
  opening: { title:"雨夜驚馬", text:({countryOpening})=>`${countryOpening}\n\n一匹驚馬拖著染血的破鏢車闖入長街。車上只剩一具屍體，掌心卻緊攥著半枚木牌。陸小川按住劍柄：「這不像尋常劫鏢。」`, choices:[{id:"inspect",label:"上前查驗鏢車",next:"cart",effects:[{effectId:"add_clue",params:{clueId:"clue_escort_roster"}}]},{id:"crowd",label:"先問四周目擊者",next:"cart",effects:[{effectId:"add_clue",params:{clueId:"clue_city_rumor"}}]}] },
  cart: { title:"染血鏢車", text:"屍身衣上有血河紋，胸前刀口駭人，手臂卻有一圈不自然的青紫。你正要細看，屋脊上忽然落下三名黑巾客，直取屍身。", choices:[{id:"battle_tutorial",label:"攔住黑巾客",battle:"tutorial",next:"split"}] },
  split: { title:"三線查案", text:"黑巾客退走後，鏢盟與巡武司先後趕到。線索互相矛盾，正適合分頭追查。你們約定入夜前在客棧集合，共享所得。", choices:[{id:"escort",label:"前往天下鏢盟查名冊",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_escort_roster"}}]},{id:"office",label:"去巡武司查路引",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_government_route"}}]},{id:"streets",label:"沿市井傳聞追查買家",next:"regroup",effects:[{effectId:"add_clue",params:{clueId:"clue_city_rumor"}}]}] },
  regroup: { title:"客棧合卷", text:"三路情報在桌上攤開：失蹤人數、異常路引、軍械材料。再看屍傷，嫁禍的痕跡已藏不住。城外廢貨棧，是所有線索唯一的交點。", choices:[{id:"inspect_body",label:"重新比對屍傷",next:"warehouse",effects:[{effectId:"add_clue",params:{clueId:"clue_palm_wound"}},{effectId:"add_clue",params:{clueId:"clue_blood_river_mark"}}]},{id:"go",label:"立刻趕往城外貨棧",next:"warehouse"}] },
  warehouse: { title:"城外貨棧", text:"貨棧暗門後，失蹤鏢師被分批囚禁。鐵掌・嚴震擋在帳房前，雙掌泛起不正常的赤色。他低聲道：「查到這裡，便別想再回洛川。」", choices:[{id:"battle_boss",label:"迎戰鐵掌・嚴震",battle:"boss",next:"ledger"},{id:"observe_first",label:"先觀察他的呼吸與站姿",battle:"boss_observed",next:"ledger"}] },
  ledger: { title:"半載暗流", text:"帳房密格裡不是金銀，而是跨越三國的軍械帳冊。這樁案子沒有單一真兇：鏢局、商盟、官差與不明買家都在鏈上。你只能決定，先把真相交到誰手中。", choices:[{id:"government",label:"將帳冊交給巡武司",major:true,complete:true},{id:"escort_alliance",label:"將帳冊交給天下鏢盟",major:true,complete:true},{id:"publish",label:"抄錄後公諸於眾",major:true,complete:true},{id:"keep",label:"自行保留，暗中追查",major:true,complete:true}] }
};
