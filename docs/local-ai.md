# 本機 AI 自由故事

AI 自由故事是首頁獨立的遊戲模式。它讀取自己的故事大綱，玩家以對話框描述角色想做的事，再由本機模型接著寫故事。原作十章不會呼叫 AI，也不會讀取或改動這份 AI 故事；兩邊的進度各自保存。

## 設定本機 API

1. 啟動本機模型服務，確認模型已載入並提供 OpenAI 相容的 Chat Completions API。
2. 在首頁或 AI 自由故事頁按「設定本機 AI」。API Base URL 預設為 `http://127.0.0.1:8686/v1`，也可依你的服務修改。
3. 填入 API 提供的模型名稱。若服務要求驗證，再填 API Key；不需要 Key 時留白。
4. 按「測試連線」，看到模型回覆後按「儲存 AI 設定」。
5. 回到首頁選「開始 AI 自由故事」，設定角色姓名、可選背景和第一個行動。

如果瀏覽器之前保存過其他 API 網址，設定欄會沿用已保存的網址；請改成 `http://127.0.0.1:8686/v1` 後再測試。`127.0.0.1` 指使用瀏覽器的那台電腦。若遊戲由 GitHub Pages 開啟，瀏覽器可能要求允許本機網路存取；本機 AI 服務也要允許遊戲網站的 CORS 來源。

## 遊玩與存檔

### 和朋友共用故事與記事

1. 首頁開啟「多人房間」，用 WebRTC 建房。把邀請連結或六碼房號交給朋友，最多四人同房。
2. 房主進入「故事與記事」，在「房主 AI 設定」儲存模型名稱與 API 位址，再按「開啟 AI」。朋友可直接加入，模型由房主的瀏覽器呼叫。
3. 隊伍出發後，在戰鬥以外輸入角色想做的事。例如「我先去問掌櫃，昨晚有誰來過」。AI 以繁體中文接寫人物反應。正式戰鬥、投票和分隊仍用房間原有的控制。
4. 每次戰鬥提交和結算都有事件紀錄。每個完整回合、重大投票結果和自由行動各進一次過場佇列。AI 背景寫作，失敗時由房主重試。回覆上的事件編號可跳到原始紀錄。

開啟 AI 後，角色名、自由行動和公開房間事件會送至房主設定的模型。隊伍聊天不送進模型。AI 的重點與系統事件分開顯示。房主的 API 位址和金鑰由本機設定管理。

房主瀏覽器另存每個房間的共同記事。房間連線中所有成員都能下載完整 JSON，房主離房後可從開房畫面下載最近一份。重連沿用 WebRTC 房間的原有一分鐘窗口。伺服器連線和同機模式使用各自原有的房間功能。

### 單人故事

AI 大綱放在 [`ai-story-outline.md`](ai-story-outline.md)，只供 AI 自由故事模式使用。玩家每回合輸入角色想做的事，AI 依照大綱、角色背景和最近十二回合對話接續故事。提示詞要求使用清楚、自然的繁體中文白話文，不用文言文或固定選項。

AI 故事存於瀏覽器 `localStorage` 的 `jianghu:aiStory:v1`，本機 API 設定存於 `jianghu:localAI`。它們不會寫進原作存檔或匯出檔。API Key 也只保存在目前瀏覽器；遊戲會直接由瀏覽器連到設定的 API，不經過遊戲伺服器。清除瀏覽器網站資料會移除這些本機資料。

修改大綱可直接編輯 `docs/ai-story-outline.md`。部署網站時，這份 Markdown 會和遊戲程式一起提供，並納入 Service Worker 離線快取。

## 程式呼叫

`src/ai/local-ai.js` 匯出 `callLocalAi(messages)`，使用設定中的網址、模型與 API Key，回傳 `{ content, model, usage }`。`src/ai/interactive-story.js` 匯出獨立存檔函式和 `buildAiStoryMessages()`：

```js
import { callLocalAi } from "./ai/local-ai.js";
import { buildAiStoryMessages } from "./ai/interactive-story.js";

const messages = buildAiStoryMessages({ outline, story, action });
const answer = await callLocalAi(messages);
console.log(answer.content);
```
