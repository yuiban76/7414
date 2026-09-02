# 資料字典

所有資料集均包含 `schemaVersion`、`contentVersion` 與 `data`。跨檔引用一律使用穩定英文 ID；JSON 不保存可執行程式碼。

| 資料集 | 數量 | 核心欄位 |
|---|---:|---|
| skills | 100 | id、name、type、grade、power、innerCost、effects、sources |
| inner-arts | 20 | id、grade、maxInner、effects |
| meridians | 6 | id、maxLevel、perLevel、costs |
| talents | 50 | id、rarity、type、description、effects |
| equipment | 300 | id、slot、weaponType、rarity、stats、effects、sources |
| items | 50 | id、category、stackLimit、battleUsable、effects |
| npcs | 24 | id、role、growthProfile、recruitConditions、aiProfile |
| enemies | 70 | id、chapter、tier、stats、skillIds、phases、aiProfile |
| factions | 12 | id、name、alignment |
| locations | 18 | id、country、type、adjacentIds、facilities、eventPool |
| quests / chapters | 8 / 8 | prerequisites、steps、majorChoices、consumesFlags、nextChapterId |

效果採 `effectId + params`，由 `src/core/effects.js` 白名單驗證。未知效果會阻止內容載入與發布驗證。
