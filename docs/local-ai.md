# 本機 AI 劇情版本

十章主線每個一般閱讀頁都可按「生成 AI 版」，請本機模型改寫當頁正文。頁面上可切換「原作版／AI 版」；原作正文、選項、戰鬥、旗標和結局仍由靜態遊戲內容控制。只有玩家按下生成按鈕時才會呼叫 AI。

## 設定連線

1. 啟動你的本機模型服務，確認已載入模型。
2. 在遊戲設定填入 API Base URL、模型名稱；API Key 視服務需要選填。
3. 按「測試連線」確認模型有回覆，再按「儲存 AI 設定」。
4. 回到十章主線的一般正文頁，按「生成 AI 版」；生成後可在原作與 AI 正文間切換。

Ollama 的常見 Base URL 為 `http://localhost:11434/v1`。模型名稱請填本機已安裝的名稱，例如 `qwen2.5:7b`。Ollama 的 OpenAI 相容介面使用 Chat Completions 格式，文件見 [Ollama OpenAI 相容說明](https://ollama.com/blog/openai-compatibility)。

如果遊戲是從 GitHub Pages 開啟，本機 AI 服務必須允許 `https://yuiban76.github.io` 的瀏覽器來源；若在本機執行遊戲，則要允許 `http://127.0.0.1:4173` 或 `http://localhost:4173`。瀏覽器收到 CORS 錯誤時，請在模型服務端開啟對應來源的 CORS 支援。從公開網站存取本機或區域網路 AI 時，瀏覽器可能另行詢問是否允許本機網路存取；按「測試連線」後請允許該權限。

API Key 與模型設定存在目前瀏覽器的 `localStorage`，不會隨存檔匯出。連線由瀏覽器直接送往你填入的 API 網址。AI 改寫結果只保留在目前頁面的記憶體中，不會寫入遊戲存檔；重新整理後仍可讀原作正文，再按一次生成 AI 版。

## 改寫範圍

AI 只改寫目前頁面已顯示的短正文，並收到玩家已讀的近期故事、章節、地點與已選路線作為連續性背景。提示詞要求模型維持第二人稱、繁體中文與原有事件，不新增人物、線索或結果。AI 不改標題、選項、戰鬥、進度、旗標或存檔；原作全文仍可照常展開閱讀。

## 程式呼叫

`src/ai/local-ai.js` 匯出 `callLocalAi(messages)`。它會讀取設定中的網址、模型與 API Key，回傳 `{ content, model, usage }`；傳入 `config` 可覆寫設定。劇情頁使用 `src/ai/story-rewrite.js` 組合已讀內容與當頁正文：

```js
import { callLocalAi } from "./ai/local-ai.js";

const answer = await callLocalAi([
  { role: "system", content: "你是江湖說書人。" },
  { role: "user", content: "用一句話描述雨夜客棧。" },
]);

console.log(answer.content);
```
