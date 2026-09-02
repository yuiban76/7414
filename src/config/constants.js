export const GAME_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;
export const CONTENT_VERSION = "1.0.0";
export const DB_NAME = "jianghu-rpg";
export const DB_VERSION = 1;
export const MAX_PARTY = 4;
export const MAX_EQUIPPED_SKILLS = 6;
export const SAVE_FORMAT = "jianghu-save";

export const REALMS = ["初入江湖", "小有所成", "登堂入室", "爐火純青", "登峰造極", "一代宗師"];
export const SKILL_REALMS = ["初窺門徑", "略有小成", "融會貫通", "爐火純青", "登峰造極", "返璞歸真"];
export const COUNTRIES = {
  dasheng: { name: "大晟", opening: "洛川暮雨，城門將閉。你與陸小川才踏入城中，遠處便傳來驚馬與人群的尖叫。" },
  beishuo: { name: "北朔", opening: "雁關風急。你護送一封邊報南下，與陸小川在三河驛換馬，卻被一紙急令引向洛川。" },
  nanli: { name: "南黎", opening: "赤水渡潮聲未歇。你與陸小川隨商船北上，貨單上一筆被抹去的軍械材料，把你們帶到洛川。" }
};

export const IDENTITIES = [
  { id: "identity_constable", name: "捕快", ability: "查驗", description: "調查屍體、現場與可疑物品時取得額外線索。", skills: ["衙門刀法", "鎖拿手", "八方拳"] },
  { id: "identity_escort", name: "鏢師", ability: "護行", description: "護衛行動更穩定，境界提升後逐步取得護衛減傷。", skills: ["開山刀", "長風劍", "鐵臂架"] },
  { id: "identity_healer", name: "醫者", ability: "診脈", description: "查看氣血、中毒、內傷、經脈與特殊狀態。", skills: ["銀針封穴", "截脈手", "養身掌"] },
  { id: "identity_hunter", name: "獵戶", ability: "尋跡", description: "發現足跡、血跡、遺留物、行進方向與埋伏。", skills: ["獵刀術", "山行拳", "踏草步"] },
  { id: "identity_beggar", name: "乞丐", ability: "市井耳目", description: "城鎮中額外取得傳聞、黑市、幫派、通緝與行蹤。", skills: ["街頭短打", "游身步", "竹杖破陣"] },
  { id: "identity_wanderer", name: "浪人", ability: "江湖閱歷", description: "初遇江湖人物、門派、武功或特殊敵人時取得識別資訊。", skills: ["流雲劍", "斷風刀", "通背拳"] }
];

export const STAT_LABELS = { strength: "臂力", constitution: "根骨", agility: "身法", comprehension: "悟性", willpower: "定力" };
export const DEFAULT_STATS = { strength: 20, constitution: 20, agility: 20, comprehension: 20, willpower: 20 };
