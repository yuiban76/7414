import { renderRevengeText } from "../core/revenge-engine.js";

export function buildStoryRewriteMessages({ sourceText, playerName, chapter, sceneTitle, location, choices, story, readSceneIds }) {
  const scenesById = new Map((story?.chapters ?? []).flatMap(row => row.scenes ?? []).map(row => [row.id, row]));
  const recentHistory = (readSceneIds ?? []).slice(-3).map(id => {
    const scene = scenesById.get(id);
    if (!scene) return null;
    const text = renderRevengeText(scene.playText ?? scene.text, choices ?? {}).slice(0, 650);
    return text ? `${scene.title}：${text}` : null;
  }).filter(Boolean);
  const decisions = Object.entries(choices ?? {}).map(([key, value]) => `${key}=${value}`);

  return [
    {
      role: "system",
      content: [
        "你是《照夜行》的劇情正文改寫助手。你只改寫目前頁面已經寫好的正文，不創作新劇情。",
        "使用繁體中文和第二人稱「你」，保留原文的事實、人物關係、事件順序、情緒因果與人物聲音；讓句子自然、有畫面，篇幅接近原文。",
        "不得增加新人物、行動、物件、線索、對話、設定或結果；不得替玩家作選擇、推進時間、改寫選項、戰鬥與旗標，也不得透露未發生或未揭露的劇情。",
        "前情只供維持連續性，不可拿前情補寫原文沒有發生的事情。只輸出改寫後的正文，不加標題、說明、版本標記或 markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `目前為第 ${chapter} 章「${sceneTitle || "未命名場景"}」，地點是「${location || "未知"}」。主角名為「${playerName}」。`,
        decisions.length ? `已確定的路線：${decisions.join("、")}。` : "目前尚未確定章節路線。",
        recentHistory.length ? `此前玩家已讀內容：\n${recentHistory.join("\n\n")}` : "這是目前已知的前情。",
        `請改寫以下本頁原作正文，保留原有資訊與篇幅，不新增情節：\n\n${sourceText}`,
      ].join("\n\n"),
    },
  ];
}
