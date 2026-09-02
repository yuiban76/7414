# 江湖歸處

純 HTML、CSS 與 JavaScript ES Modules 製作的原創高武俠文字 RPG，可直接部署至 GitHub Pages。單人核心不依賴伺服器、資料庫、付費 API 或建置工具。

## 本機執行

使用 Node 20+：

```sh
npm run serve
```

開啟 `http://127.0.0.1:4173`。請勿直接以 `file://` 開啟，因瀏覽器會阻擋 ES Modules 與 JSON 載入。

## 驗證

```sh
npm run validate
npm test
npm run balance
```

- `validate`：檢查資料數量、分布、ID、效果白名單、來源與跨檔引用。
- `test`：檢查戰鬥、破綻生命週期、創角、背包裝備、修煉經脈、旅行、隊伍上限、重大投票、匯入匯出與原型污染防護。
- `balance`：每個起始武功執行 80 次教學戰與第一章 Boss 模擬；最佳化配置最低勝率需達 55%，選項差距不得超過 40 個百分點。

## GitHub Pages

將倉庫根目錄直接設為 Pages 來源即可。`404.html`、相對路徑與 Service Worker 都可在子路徑部署。

## 多人說明

內建 `LocalRoomTransport` 使用 BroadcastChannel，供同一裝置多分頁測試 1～4 人大廳。正式匿名多人服務只需實作 `RoomTransport`，核心規則與永久存檔不依賴供應商。

## 已實作系統

八章主線與後日談、架勢／破綻回合戰鬥、角色與固定裝備、30 格堆疊背包、武功／內功／六經脈修煉、節點旅行與時間推進、NPC 招募與四人隊伍上限、重大選擇投票、IndexedDB 存檔及安全 JSON 備份。
