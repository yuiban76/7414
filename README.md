# 照夜行

純 HTML、CSS 與 JavaScript ES Modules 製作的原創高武俠文字 RPG，可直接部署至 GitHub Pages。單人核心不依賴伺服器、資料庫、付費 API 或建置工具。

0.7.0 已接入十章復仇主線，以謝欣達為最終敵人。402 場原創正文依選擇呈現，每條路徑有 397 場、十四萬字以上正文及 28 組交鋒，包含救援操作、戰敗重試、程渡留隊／離隊與不同結尾。故事修訂為 3、存檔格式為 5，必須重新創角開局；舊本機資料與備份保留，但無法繼續或沿用角色。依使用者指示先接入並推送，二十小時實測暫緩，未宣稱已達成此時長。見 [整合驗收與限制](docs/revenge-integration-status.md)。

## 十章正文與作者資料

[十章復仇主線完整作者稿](docs/manuscript-v3/README.md) 是目前遊戲正文來源，保留分場資料、選擇後果與兩套校稿閱讀版。`npm run story:export` 產生遊戲使用的 `src/data/revenge-story.json`；`npm run manuscript:v3:check` 檢查正文、分支與伏筆。實際份量見 [交付狀態](docs/manuscript-v3/status.md)。舊版八章、十二支線與拳譜奇遇保留在原始資料及舊作者稿，未混入本次十章人物與時間線；舊版 `npm run manuscript` 維持原用途。

跨裝置連線沿用 PeerJS／WebRTC，透過 PeerServer Cloud 接應，無須自架常駐主機；另保留可部署的 WebSocket 服務。

## 本機執行

使用 Node 24+：

```sh
npm ci --ignore-scripts
npm run serve
```

開啟 `http://127.0.0.1:4173`。請勿直接以 `file://` 開啟，因瀏覽器會阻擋 ES Modules 與 JSON 載入。

## 驗證

```sh
npm run validate
npm run manuscript:v3:release-check
npm run story:export
npm test
npm run balance:revenge
npm run balance
npm run balance:campaign
npm run balance:zhaoye
npm run balance:journey
npm run balance:sidequests
npm run manuscript
npm run test:network
npm run test:peer
```

- `validate`：檢查資料數量、分布、ID、效果白名單、來源與跨檔引用。
- `manuscript:v3:release-check`：十章正文、1,024 組分支結構、伏筆與篇幅檢查，記錄遊戲接入及使用者明確暫緩的時長實測。
- `balance:revenge`：十章共 29 種交鋒配置（含互斥分支），18 起始武功、1～4 人、三組種子，共 6,264 場；驗證救援、非致命訓練、突圍及謝欣達終戰。
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

開啟 [遊戲網頁](https://yuiban76.github.io/7414/)，進入「多人房間」，預設選擇「WebRTC 直連（免自架主機）」。房主輸入名字建立房間，再把邀請連結或六碼房號交給朋友。全員準備後由房主出發，支援 1～4 人聊天、投票、分隊及同步演武。

PeerJS 使用免費官方接應服務建立 WebRTC DataChannel，房主瀏覽器負責身分核對與結算；不需要 Render 帳號或付費主機。房主分頁須保持開啟，重整後可於一分鐘內按「重連上次房間」，訪客暫時斷線會自動重連。房主正式結束或無法恢復時需重新開房，未提供自動換房主。部分公司網路、NAT 或防火牆可能阻擋連線，需更換網路或另設 TURN；免費服務不保證可用性。十章主線使用獨立的單人存檔，連線活動獨立於單人進度。

另保留伺服器連線模式，由獨立 Node WebSocket 服務核對與結算，支援選配磁碟快照。本機測試時切換「伺服器連線（需服務網址）」，並在第二個終端執行：

```sh
npm start
```

遊戲入口使用 `http://127.0.0.1:4173`，連線服務預設 `ws://127.0.0.1:8787/rooms`。兩個不同瀏覽器或裝置只要能連到同一服務，即可輸入六碼房號加入。外網需要將服務部署到支援 WebSocket 的主機，提供 HTTPS／WSS；GitHub Pages 繼續負責遊戲網頁。

提供 [連線、部署與驗收說明](docs/multiplayer-connection.md)、`Dockerfile`、`render.yaml` 與 `server/.env.example`。未開設公開 WebSocket 主機；使用預設 WebRTC 模式無須部署這些服務。

保留「同機多分頁測試」模式，使用既有 BroadcastChannel，無須啟動伺服器。

## 已實作系統

十章主線與後日談、條件正文與選擇後果、同行人物與離隊記事、架勢／破綻回合戰鬥及救援操作、角色與固定裝備、30 格堆疊背包、商店／客棧、武功／內功／六經脈修煉、節點旅行與時間推進、四人隊伍上限、多人房間與投票、IndexedDB 存檔及安全 JSON 備份。舊版官職、支線與奇遇來源保留，但十章主線不開啟舊故事入口。
