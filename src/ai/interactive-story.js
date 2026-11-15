const STORAGE_KEY = "jianghu:aiStory:v1";

export function loadAiStory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return saved?.version === 1 && saved.character && Array.isArray(saved.turns) ? saved : null;
  } catch {
    return null;
  }
}

export function saveAiStory(story) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
}

export function buildAiStoryMessages({ outline, story, action }) {
  const recentTurns = story.turns.slice(-12);
  return [
    {
      role: "system",
      content: [
        "你是互動武俠故事的說書人。請先讀完下面的故事大綱，並依大綱的世界、原則與故事節奏創作。",
        "使用繁體中文和白話文，像現代人自然說話；句子清楚、直接，不用文言文、古腔或艱深詞語。避免「遂、乃、焉、汝、吾、此乃」等古文腔。",
        "玩家每回合會用自己的話描述角色想做的事。讓角色照這個意圖行動，寫出具體結果、人物反應和新的眼前情況。不要替玩家改成別的行動，也不要列出固定選項。",
        "每次接續寫 2 到 5 段，每段不要太長。結尾用白話問玩家接下來想做什麼，留出自由行動空間。只輸出故事正文，不要分析、規則說明、標題或 markdown。",
        "記住對話已建立的角色、人物關係、地點與承諾，不得無故推翻。故事有阻力和代價，但不能無預警地替主角做重大決定或安排死亡。",
        `角色資料：\n姓名：${story.character.name}\n背景：${story.character.background || "尚未設定"}`,
        `故事大綱（AI 版專用）：\n${outline}`,
      ].join("\n\n"),
    },
    ...recentTurns.flatMap(turn => [
      { role: "user", content: turn.action },
      { role: "assistant", content: turn.story },
    ]),
    { role: "user", content: action },
  ];
}
