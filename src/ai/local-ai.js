const STORAGE_KEY = "jianghu:localAI";

const DEFAULT_CONFIG = Object.freeze({
  baseUrl: "http://localhost:11434/v1",
  model: "",
  apiKey: "",
});

export function getLocalAiConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveLocalAiConfig(config) {
  const normalized = normalizeConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function callLocalAi(messages, { config = getLocalAiConfig(), timeoutMs = 90_000 } = {}) {
  const settings = normalizeConfig(config);
  if (!settings.model) throw new Error("請先填入本機 AI 的模型名稱。");
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("請提供至少一則對話訊息。");

  const url = chatCompletionsUrl(settings.baseUrl);
  const headers = { "Content-Type": "application/json" };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const request = {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({ model: settings.model, messages, stream: false }),
    };
    const targetAddressSpace = localAddressSpace(url);
    if (targetAddressSpace) request.targetAddressSpace = targetAddressSpace;
    const response = await fetch(url, request);
    const responseText = await response.text();
    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(response.ok ? "AI API 回傳的內容不是有效 JSON。" : `AI API 回應 ${response.status}：${responseText.slice(0, 500)}`);
    }
    if (!response.ok) {
      const detail = payload?.error?.message ?? payload?.message ?? responseText;
      throw new Error(`AI API 回應 ${response.status}：${String(detail).slice(0, 500)}`);
    }
    if (!payload || typeof payload !== "object") throw new Error("AI API 回傳格式不符，預期收到 JSON 物件。");

    const content = messageText(payload.choices?.[0]?.message?.content);
    if (!content.trim()) throw new Error("模型沒有回傳文字內容，請確認模型名稱與 API 相容性。");
    return { content, model: payload.model ?? settings.model, usage: payload.usage ?? null };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("等待本機 AI 回應逾時，請確認服務已啟動或延長等待時間。");
    if (error instanceof TypeError) throw new Error("連不上本機 AI。請確認瀏覽器本機網路權限、服務網址、服務狀態及 CORS 設定。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function testLocalAiConnection(config, prompt) {
  return callLocalAi([
    { role: "system", content: "請以簡短、清楚的方式回答使用者。" },
    { role: "user", content: String(prompt ?? "請簡短回覆：本機 AI 連線成功。") },
  ], { config });
}

function normalizeConfig(config = {}) {
  const baseUrl = String(config.baseUrl ?? "").trim().replace(/\/+$/, "");
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("API Base URL 格式不正確，請填入完整網址，例如 http://localhost:11434/v1。");
  }
  if (!(["http:", "https:"].includes(url.protocol)) || url.search || url.hash) {
    throw new Error("API Base URL 請使用 http 或 https 網址，且不要附上查詢參數。");
  }
  return {
    baseUrl,
    model: String(config.model ?? "").trim(),
    apiKey: String(config.apiKey ?? "").trim(),
  };
}

function chatCompletionsUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (!url.pathname.replace(/\/+$/, "").endsWith("/chat/completions")) {
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/chat/completions`.replace(/\/{2,}/g, "/");
  }
  return url.toString();
}

function localAddressSpace(url) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(host) || host === "::1") return "loopback";
  if (host.endsWith(".local") || /^(10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) || /^(?:fc|fd|fe80):/i.test(host)) return "local";
  return undefined;
}

function messageText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => typeof part === "string" ? part : part?.text ?? "").join("");
}
