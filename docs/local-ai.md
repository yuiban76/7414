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
