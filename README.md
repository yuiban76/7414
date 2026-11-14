# 照夜行

純 HTML、CSS 與 JavaScript ES Modules 製作的原創高武俠文字 RPG，可直接部署至 GitHub Pages。單人核心不依賴伺服器、資料庫、付費 API 或建置工具。

0.6.0 新增可部署的跨裝置連線服務（部署說明見下方）。單人部分已接入故事修訂 2：八章主線重寫與十二條完整支線（四條跨章），包含救援交鋒、人物永久命運與後續回應。存檔格式為 4，必須重新創角開局；舊本機資料與備份保留，但無法繼續或沿用角色。作者稿見 [新版作者稿](docs/照夜行_新版主線與十二支線作者稿.md)，本次驗收見 [主線與支線驗收](docs/narrative-revision-2-status.md)。既有拳譜奇遇仍可遊玩，葉停舟永久缺席時由鏢路教習程野接手。

## 本機執行

使用 Node 20+：

```sh
npm ci --ignore-scripts
npm run serve
```

開啟 `http://127.0.0.1:4173`。請勿直接以 `file://` 開啟，因瀏覽器會阻擋 ES Modules 與 JSON 載入。

## 驗證

```sh
npm run validate
npm test
npm run balance
npm run balance:campaign
npm run balance:zhaoye
npm run balance:journey
npm run balance:sidequests
npm run manuscript
npm run test:network
```

- `validate`：檢查資料數量、分布、ID、效果白名單、來源與跨檔引用。
- `test`：檢查戰鬥、破綻生命週期、創角、背包裝備、城市經濟、七階官職、修煉經脈、旅行、隊伍上限、重大投票、匯入匯出與原型污染防護。
- `balance`：每個起始武功執行 80 次教學戰與第一章 Boss 模擬；最佳化配置最低勝率需達 55%，選項差距不得超過 40 個百分點。
- `balance:campaign`：以六身份全部 18 種起始武功橫跨八章、每組 80 次，共 11,520 場模擬；合理成長配置最低勝率 45%，同章差距不得超過 45 個百分點。
- `balance:zhaoye`：新版十場主線交鋒、18 起始武功、1～4 人隊伍、各 40 個隨機種子，共 28,800 場。納入救援操作的行動成本，不使用章節直接贈送的境界或支線準備加成。這是戰鬥可行性檢查，不代表所有劇情分支已完整驗收。
- `balance:journey`：固定 40 組種子對照破勢連攻四個成長階段，檢查木樁試招與成名戰的勝率、回合數與成形後壓制差異。

- `balance:sidequests`：十六場新增交鋒、18 起始武功、1～4 人隊伍、各 40 個種子，共 46,080 場；計入救援操作回合，不加裝備或支線強化。
- `manuscript`：從作者資料重新輸出八章主線與十二條支線稿。

## GitHub Pages

將倉庫根目錄直接設為 Pages 來源即可。`404.html`、相對路徑與 Service Worker 都可在子路徑部署。

## 多人說明

新增 WebSocket 連線服務，支援不同裝置的 1～4 人大廳、邀請連結、準備、聊天、投票、分隊與同步演武，由伺服器核對身分及結算。支援心跳、60 秒重連、重複指令去重，以及選配磁碟快照恢復。八章主線仍使用原本的單人存檔；連線活動獨立於單人進度。

本機測試請在第二個終端執行：

```sh
npm start
```

遊戲入口使用 `http://127.0.0.1:4173`，連線服務預設 `ws://127.0.0.1:8787/rooms`。兩個不同瀏覽器或裝置只要能連到同一服務，即可輸入六碼房號加入。外網需要將服務部署到支援 WebSocket 的主機，提供 HTTPS／WSS；GitHub Pages 繼續負責遊戲網頁。

提供 [部署與驗收說明](docs/multiplayer-connection.md)、`Dockerfile`、`render.yaml` 與 `server/.env.example`。尚未建立公開服務網址；部署後可在多人房間填入網址，或設定 `src/config/network.js` 的 `ROOM_SERVER_URL`。

保留「同機多分頁測試」模式，使用既有 BroadcastChannel，無須啟動伺服器。

## 已實作系統

八章主線與後日談、十二條獨立支線、永久命運與已知線索記事、架勢／破綻回合戰鬥、角色與固定裝備、30 格堆疊背包、城市商店／客棧與七階官職、武功／內功／六經脈修煉、節點旅行與時間推進、NPC 招募與四人隊伍上限、重大選擇投票、IndexedDB 存檔及安全 JSON 備份。
