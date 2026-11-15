// Authoring metadata only. Not imported by the game or its service worker.
import fs from 'node:fs';
export const PROJECT = {
  id:'zhaoye-ten-chapters', revision:3, stage:'integrated-game', runtimeIntegrated:true,
  targetMinutes:1200, targetPathHan:[140000,180000], measuredPlayMinutes:null, playtestDeferred:true,
  timingBasis:'首次正常閱讀及必經行動；排除掛機、重試、刷怪與支線',
};
export const FLAGS = {
  c1_route:['warn','track'], c2_bait:['self','yan'], c3_entry:['winch','coop'],
  c4_reveal:['public','challenge'], c5_plan:['evacuate','bridge'],
  c6_exit:['hold','ice'], c7_training:['steady','turn'], cheng:['stay','leave'], c9_attack:['bolts','stones'], c10_approach:['inside','outside'],
};
const scene=(title,intent,obstacle,result,extra={})=>({title,intent,obstacle,result,...extra});
const choice=(flag,labels)=>({flag,options:FLAGS[flag].map((value,i)=>({value,label:labels[i]}))});
const BASE_CHAPTERS = [
  {chapter:1,title:'山門血夜',targetMinutes:90,scenes:[
    scene('多出來的一副筷子','認識師門生活與庇護者','柴米不足、陌生人害怕兵器','建立溫守拙與藍邊碗的具體記憶'),
    scene('接住，再走','練習接碗與收步','急追會失衡','學會基本動作，尚不能破解謝欣達',{encounter:'well-lesson'}),
    scene('兩尺棉布','採買並察覺軍隊收械','門房與軍官阻撓','選警告居民或跟車偵察',{choice:choice('c1_route',['先警告鐵匠','立即跟車'])}),
    scene('路上的腳印','幫傷者後趕回師門','軍隊繞後、鐘聲消失','由車轍與煙味確認危機'),
    scene('回家','找同門與保護阿硯','院中黑甲與火場','羅嫂死亡、後廊成為撤離方向',{encounter:'courtyard'}),
    scene('門柱倒下的時候','放出庇護者','衛峻攻堂，周讓守廊','目睹師父戰死，帶人後撤'),
    scene('偏了的箭','突破山道','鉤鐮封路與弓手','封路解除，偏箭伏筆出現',{encounter:'hook-road'}),
    scene('等不到的人','等待同門並決定去向','無人歸來，糧食耗盡','跟著載鐘軍車前往柳橋'),
  ]},
  {chapter:2,title:'雨巷追魂',targetMinutes:105,scenes:[
    scene('鐘進城了','混入柳橋','入城盤查','薛姨接應，鐵鋪反應依第一章分支'),
    scene('陸見霜','取回師父的劍','官差追捕','殺手攻擊迫使雙方合作',{encounter:'constable-chase'}),
    scene('鈴在後面','擺脫弩手','鈴聲誘導錯判方向','發現鈴與射擊時間差',{encounter:'dye-house'}),
    scene('會收錢的好心人','另找藏身處','追蹤暗線與軍靴引疑','程渡入隊，繫弦習慣第二次埋線'),
    scene('誰去引鈴','安排反伏擊','敵人逼近藏身處','選誘餌與阿硯參與方式',{choice:choice('c2_bait',['主角做餌，阿硯留守','阿硯在接應視線內帶路'])}),
    scene('卞九不走近','破除殺手安全距離','鈴索與弩位','卞九死亡，鋼簧指向洪家莊',{encounter:'bian-jiu'}),
    scene('各欠一筆','出城並決定同行','排水道、傷者與民眾','陸見霜追查軍令，程渡繼續帶路'),
    scene('半張床','安頓並面對第一次殺人','阿硯的追問與主角不知如何回答','得知洪家莊夜間軍運，前往河梁'),
  ]},
  {chapter:3,title:'血債山莊',targetMinutes:115,scenes:[
    scene('回來取工錢的人','查訪工匠','門房毆打討薪者','薪條手印與傷殘矛盾引出工棚'),
    scene('爐裡有人','混入山莊','活人試弩與東門陷阱','閔石提供現場幫助'),
    scene('開哪一道門','安排救援與進攻','雙線需分配人手','依順序決定閔石或陸見霜的新增傷勢',{choice:choice('c3_entry',['先破絞盤','先開工棚'])}),
    scene('洪家莊不缺刀','牽制洪百川','雙刀與翻爐','阿硯在後方實際組織撤出',{encounter:'hong-furnace'}),
    scene('一步以外','擊敗洪百川','油地誘追','利用收步殺死仇敵',{encounter:'hong-furnace'}),
    scene('他也有女兒','面對報仇後果','洪女恐懼、工匠家屬團聚','奶娘帶洪女離開；主角不獲得所有人感謝'),
    scene('撤走的旗','確認山莊與圍山關係','須從現場與見聞判斷','閔石指出岳字援軍曾撤離'),
    scene('別替我擦','處理阿硯想學殺人的要求','主角仍想封住話題','同伴矛盾留到第七章解決'),
  ]},
  {chapter:4,title:'義旗藏刃',targetMinutes:115,scenes:[
    scene('紙做的山門','接近岳承義','紀念儀式與名望','倖存者被當成維持名聲的籌碼'),
    scene('不許帶劍的人','查實援軍是否曾出發','客房監視','發現焚旗與原備物資'),
    scene('不願先跪的人','聽周懷經過','揭露將損及其門內地位','選公開其證言或保護身分',{choice:choice('c4_reveal',['周懷自行公開，保護他說完','主角先挑戰，保護周懷身分'])}),
    scene('夜訪','要求岳承義親口說明','以門人安危與續香火交易','決定次日公開決鬥'),
    scene('臺上無香','在實力與名望前站穩','借力封路與舊傷','制伏岳承義而非必須殺死',{encounter:'yue-duel'}),
    scene('讓他自己念','還原撤援','人群辯護與岳的推諉','撤援公開，周懷命運依選擇回應'),
    scene('出名的價錢','察覺相助者暴露','軍吏追查與說書單傳播','立即回白石，敵人有可追溯情報來源'),
    scene('沒有拆的信','應對謝欣達邀宴','點名接應戶受威脅','決定赴槐州，不誤信仇人'),
  ]},
  {chapter:5,title:'權門赴宴',targetMinutes:120,scenes:[
    scene('仇人的門','觀察槐州與謝府','賑濟與徵兵同時存在','主角明白敵人有真實支持'),
    scene('等的人也有事做','安排外援','時間與人手不足','選先撤白石或先破浮橋',{choice:choice('c5_plan',['先撤點名居民，備妥藥車','先破浮橋，延緩軍隊'])}),
    scene('他認得鞋','進府','韓逐鹿識出程渡軍中習慣','程渡身分第三處線索'),
    scene('四個人的飯','面對下令者','對方直接承認且不懼兵器','主角克制立即拔劍，保留外援時間'),
    scene('替誰活下去','拒絕招攬','重建師門須承認師父謀反','主角知道謝要用倖存者收服江湖'),
    scene('紙落進火裡','破壞軍符後撤','近衛與謝的掌勢','調度確實被延誤，見其近衛主動讓位',{encounter:'xie-banquet'}),
    scene('韓逐鹿的第三隻手','登船','換手短刃與河邊弩手','近衛統領重傷，不再參戰',{encounter:'han-corridor'}),
    scene('晚了一個時辰','確認白石點名者安置','肩傷與追兵','敵方視角顯示謝預判其回白石；主角尚未知'),
  ]},
  {chapter:6,title:'斷岳壓城',targetMinutes:125,scenes:[
    scene('沒有開張的餛飩攤','返回接應處','店鋪異常與伏兵','主角察覺時伏擊已開始'),
    scene('回來接人的人','找新撤退線','南口陷坑與街道封鎖','阿硯提供灶房舊水渠'),
    scene('左肩先沉','阻住衛峻','刀勢結合盾陣','主角看到只靠硬打不能護住出口',{encounter:'wei-siege'}),
    scene('哪一邊先過','送出慢行者','單塊門板、物資與增援','先前準備生效，選守巷或另鋪冰道',{choice:choice('c6_exit',['主角守巷保門板與藥','另鋪冰道加快撤出'])}),
    scene('他自己選的路','阿硯主動完成撤離','曬被架、冰渠與追兵','阿硯有自主判斷，謝親自截路'),
    scene('三步','撐住連壓並倒牆','謝的內力遠勝，主角傷重','完成撤離即勝利，實見換氣破綻',{encounter:'xie-escape'}),
    scene('別回頭找劍','離開斷牆','主角欲回取師父的劍','阿硯以鑰匙留下活人的聯繫'),
    scene('剩下來的人','送傷者到西嶺','腿傷或藥材不足','客棧毀壞，主角需真正療傷'),
  ]},
  {chapter:7,title:'殘招再起',targetMinutes:115,scenes:[
    scene('門前不治死人','治療重傷','疼痛、無力與死亡恐懼','瞿遠接手，主角承認自己可能死'),
    scene('另一只碗','日常照顧','主角仍拒絕師弟成長','阿硯爆發等待與無力的怨氣'),
    scene('把話說完','重新約定師兄弟關係','主角不知道如何判斷準備好','共同練退步，互相允許害怕'),
    scene('沒人替她交刀','陸見霜選擇責任','回衙可將違令全推給主角','她自行燒信並聯絡仍願幫忙的舊識'),
    scene('停得住','復盤三掌並練習','內力不足、步法與傷勢','四十餘日練出能真正停止的身法',{choice:choice('c7_training',['多練落腳，以穩定承受壓力','多練轉向，以判勢避開鋒線'])}),
    scene('討藥的人','辨別追來的醫者','許問針封脈誘追','同伴先幫主角擋住首輪殺招'),
    scene('這次輪到他走近','協力破針陣','針槽、麻痺、近身掌','收步在實戰有效但未超越謝內力',{encounter:'xu-needles'}),
    scene('等雪化','恢復與準備北上','傷口未全好、盤纏有限','決定截軍運，從逃亡轉為主動'),
  ]},
  {chapter:8,title:'千里索命',targetMinutes:130,scenes:[
    scene('換我們等','誘軍運改路','空車與探路騎士','主角開始讓敵人依自己安排行動'),
    scene('工匠的手','用木楔停車','董綸可捨棄兵器避險','工匠實際幫助但敵人也能看穿圈套'),
    scene('讓他救自己的東西','逼近火藥軍運','董綸轉射阿硯離間同伴','阿硯自救；程渡軍號被喊出'),
    scene('那一箭','聽程渡坦白','放箭之恩與隱瞞同時存在','第一章偏箭等三線回收，暫不替玩家原諒'),
    scene('先過今天','阻止炸車並制伏董綸','燃線、人質與親衛','軍運去向實際查明，主角能救人並停步',{encounter:'dong-convoy'}),
    scene('衛峻不會退的地方','練習對付斷岳刀','重甲、鎖步與壓迫','戰例與現場經驗支持第九章解法'),
    scene('留下，或走','決定能否繼續並肩','信任無法由救命之恩直接換回','程渡留隊或離隊，後者改由閔石接應',{choice:choice('cheng',['留下，戰後親自交代','請他離隊，另改進關路線'])}),
    scene('有人先把名字報了','安排非軍事支援','村民也受禁武軍屯壓迫','各人自願承擔能力內工作，望見師父佩劍'),
  ]},
  {chapter:9,title:'黑甲終局',targetMinutes:140,scenes:[
    scene('誰都看得見那柄劍','觀察關城','佩劍是誘餌、村民受監視','先理解城防與柴門'),
    scene('先拆他的手','組織攻關準備','三道不同防線','選斷弩補給或奪左石槽',{choice:choice('c9_attack',['斷弩機補給','奪左側石槽'])}),
    scene('留隊：別學我的壞習慣','用軍牌開柴門','程渡試圖獨自冒險','重新預留撤路，兩人並肩突破',{when:{cheng:'stay'},encounter:'gate-entry-stay'}),
    scene('離隊：工匠走的門','以修輪車卡門','閔石不懂軍號且不能擋刀','合作開門後讓工匠依計畫退走',{when:{cheng:'leave'},encounter:'gate-entry-leave'}),
    scene('不要再送一個人去','解除右側落石與側弩','衛峻連民夫也納入打擊','各人分工，主角能抵達決鬥位置',{encounter:'gate-machines'}),
    scene('斷岳','正面討回血債','刀勢、鎖步、近身重甲','衛峻死亡，師父的劍取回',{encounter:'wei-final'}),
    scene('只剩風聲','經歷報仇後的空白','期待的痛快沒有立刻到來','同伴處理傷者，主角仍知道最後一人未除'),
    scene('把名字帶進去','安排入京','謝急令清理接應戶','段承與許垣接應，主角帶著故人名字入城'),
  ]},
  {chapter:10,title:'照夜而行',targetMinutes:145,scenes:[
    scene('城裡仍有人賣早飯','混入定京並打開民戶後路','軍符混亂與清剿','從百姓的日常接近決戰'),
    scene('先斷命令','拆弩、截傳令旗','不能放任身後清剿','親衛失去街道協同，撤離窗口成立',{encounter:'capital-street'}),
    scene('他選的崗位','阿硯自行承擔北渡接應','主角仍擔心失去他','師弟有實際任務；程渡或閔石依結果出演'),
    scene('謝府沒有宴席','突破謝府外圍','近衛交叉掩護','主角與陸見霜抵達最終敵人',{encounter:'xie-gates'}),
    scene('他還在找你的退路','破場地連壓','掌力與視線誘導','主角首度迫使謝改招',{encounter:'xie-final'}),
    scene('收步','逼重掌後近身破勢','內力仍弱於謝','以真實練過的動作刺穿左肋',{encounter:'xie-final'}),
    scene('這一次由你說完','報故人姓名，結束血仇','謝仍問誰統治眾人','謝欣達死亡，沒有悔悟換赦免'),
    scene('門開著','善後、分別、回山','傷病、軍務與失去家園','依程渡結果收尾；師門重新為路人添碗'),
  ]},
].map(c=>({...c,file:`${String(c.chapter).padStart(2,'0')}-${c.title}.md`,scenes:c.scenes.map((s,i)=>({...s,id:`${String(c.chapter).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`}))}));

export const CHAPTERS=BASE_CHAPTERS.map(chapter=>{
  const url=new URL(`./metadata-${String(chapter.chapter).padStart(2,'0')}.json`,import.meta.url);
  if(!fs.existsSync(url))return chapter;
  const original=new Map(chapter.scenes.map(scene=>[scene.id,scene]));
  const expanded=JSON.parse(fs.readFileSync(url,'utf8'));
  return {...chapter,scenes:expanded.map(scene=>({...original.get(scene.id),...scene}))};
});

export const FORESHADOWS = [
  {id:'arrow',seeds:['01-07','02-04','02-06','05-03'],payoff:'08-04'},
  {id:'stop-step',seeds:['01-02','03-05','06-06','07-05','07-07'],payoff:'10-06'},
  {id:'wei-footwork',seeds:['01-06','06-03','08-06'],payoff:'09-06'},
  {id:'xie-countermove',seeds:['04-07','05-05','05-08'],payoff:'06-02'},
  {id:'yan-map',seeds:['01-03','02-07','06-05'],payoff:'10-03'},
  {id:'blue-bowl',seeds:['01-01','07-02'],payoff:'10-08'},
];
