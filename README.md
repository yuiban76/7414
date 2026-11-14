# 照夜行

純 HTML、CSS 與 JavaScript ES Modules 製作的原創高武俠文字 RPG，可直接部署至 GitHub Pages。單人核心不依賴伺服器、資料庫、付費 API 或建置工具。

0.6.1 預設使用 PeerJS／WebRTC 跨裝置連線，透過免費 PeerServer Cloud 接應，無須自架常駐主機；另保留可部署的 WebSocket 服務。單人部分已接入故事修訂 2：八章主線重寫與十二條完整支線（四條跨章），包含救援交鋒、人物永久命運與後續回應。存檔格式為 4，必須重新創角開局；舊本機資料與備份保留，但無法繼續或沿用角色。作者稿見 [新版作者稿](docs/照夜行_新版主線與十二支線作者稿.md)，本次驗收見 [主線與支線驗收](docs/narrative-revision-2-status.md)。既有拳譜奇遇仍可遊玩，葉停舟永久缺席時由鏢路教習程野接手。

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
npm run test:peer
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

開啟 [遊戲網頁](https://yuiban76.github.io/7414/)，進入「多人房間」，預設選擇「WebRTC 直連（免自架主機）」。房主輸入名字建立房間，再把邀請連結或六碼房號交給朋友。全員準備後由房主出發，支援 1～4 人聊天、投票、分隊及同步演武。

PeerJS 使用免費官方接應服務建立 WebRTC DataChannel，房主瀏覽器負責身分核對與結算；不需要 Render 帳號或付費主機。房主分頁須保持開啟，重整後可於一分鐘內按「重連上次房間」，訪客暫時斷線會自動重連。房主正式結束或無法恢復時需重新開房，未提供自動換房主。部分公司網路、NAT 或防火牆可能阻擋連線，需更換網路或另設 TURN；免費服務不保證可用性。八章主線仍使用原本的單人存檔，連線活動獨立於單人進度。

另保留伺服器連線模式，由獨立 Node WebSocket 服務核對與結算，支援選配磁碟快照。本機測試時切換「伺服器連線（需服務網址）」，並在第二個終端執行：

```sh
npm start
```

遊戲入口使用 `http://127.0.0.1:4173`，連線服務預設 `ws://127.0.0.1:8787/rooms`。兩個不同瀏覽器或裝置只要能連到同一服務，即可輸入六碼房號加入。外網需要將服務部署到支援 WebSocket 的主機，提供 HTTPS／WSS；GitHub Pages 繼續負責遊戲網頁。

提供 [連線、部署與驗收說明](docs/multiplayer-connection.md)、`Dockerfile`、`render.yaml` 與 `server/.env.example`。未開設公開 WebSocket 主機；使用預設 WebRTC 模式無須部署這些服務。

保留「同機多分頁測試」模式，使用既有 BroadcastChannel，無須啟動伺服器。

## 已實作系統

八章主線與後日談、十二條獨立支線、永久命運與已知線索記事、架勢／破綻回合戰鬥、角色與固定裝備、30 格堆疊背包、城市商店／客棧與七階官職、武功／內功／六經脈修煉、節點旅行與時間推進、NPC 招募與四人隊伍上限、重大選擇投票、IndexedDB 存檔及安全 JSON 備份。
