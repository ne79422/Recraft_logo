// 로고 이미지 생성 백엔드 (Recraft) — 그대로 배포하면 됩니다.
// 필요한 환경변수: RECRAFT_API_TOKEN  (Recraft에서 발급한 토큰)
//
// 로컬 실행:  RECRAFT_API_TOKEN=토큰값 node server.js
// 배포 시:    호스팅(예: Render)의 Environment에 RECRAFT_API_TOKEN 등록

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());                       // 운영 시 origin을 본인 도메인으로 제한 권장
app.use(express.json({ limit: "8mb" }));

const RECRAFT_TOKEN = process.env.RECRAFT_API_TOKEN;

// 4개 시안의 "모티프 결합 방식"
const VARIANTS = {
  A: "direct motif combination — take the core motif literally and combine with brand concept",
  B: "pure geometric abstraction — reduce the concept to basic shapes, lines, and proportions only",
  C: "adjacent motif substitution — use a related or implied motif that hints at the concept indirectly",
  D: "multi-concept compression — compress multiple brand values into a single unified form",
};

function buildPrompt(b, key) {
  const colors = [b.primaryHex, b.secondaryHex, ...(b.refColors || [])]
    .filter(Boolean).slice(0, 3).join(", ");
  return [
    // 역할 + 절대 규칙
    "You are a luxury brand symbol designer. Design a SYMBOL MARK ONLY — absolutely NO text, NO letters, NO numbers, NO wordmarks, NO captions anywhere in the image.",

    // 브랜드 입력
    `Brand concept: ${b.brandConcept || "a clean, modern, premium brand"}.`,

    // 시안별 모티프 결합 방식
    `Design approach for variant ${key}: ${VARIANTS[key]}.`,

    // 색상
    `Colors (use 1–2 only, avoid gradients): ${colors || "#003894"}. No rainbow, no neon, no metallic shine.`,

    // 핵심 원칙
    "Core principles: (1) Meaning first — derive form from a single compressed concept, not from aesthetics. (2) Color restraint — 1–2 colors maximum. (3) Generous whitespace — do not fill the frame. (4) Vector precision — clean edges that hold at any size. (5) Silhouette readability — the form must be instantly identifiable without color.",

    // 스타일 방향
    "Style: Choose ONE direction — painterly mark (simplified silhouette of motif), geometric abstraction (pure shapes and proportion), or negative space (second meaning hidden in whitespace). Keep detail minimal within the chosen direction.",

    // 금지
    "Strictly avoid: all text or glyphs, gradient overuse, 3D effects, metallic gloss, photo realism, clipart clichés, over-detail, neon/rainbow colors.",

    // 품질 기준
    "Quality check before finalizing: Does the form convey its meaning without text? Is it readable at 16px icon size? Does it retain identity in single color? Can you explain the form's reason in one sentence? Does it feel premium and desirable?",

    // 사용자 추가 요청
    b.userPrompt ? `USER PRIORITY REQUEST (override all above if conflicting): ${b.userPrompt}.` : "",
  ].filter(Boolean).join(" ");
}

async function recraftOne(prompt) {
  const r = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RECRAFT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model: "recraftv4_vector",
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!r.ok) throw new Error("recraft " + r.status + " " + (await r.text()));
  const j = await r.json();
  return j.data?.[0]?.image_url || null;
}

// 프론트(brand brief.html)가 호출하는 단일 엔드포인트
app.post("/api/generate-logos", async (req, res) => {
  try {
    const brief = req.body || {};
    const keys = ["A", "B", "C", "D"];
    const urls = await Promise.all(
      keys.map((k) => recraftOne(buildPrompt(brief, k)).catch(() => null))
    );
    res.json({ images: { A: urls[0], B: urls[1], C: urls[2], D: urls[3] } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/", (_req, res) => res.send("logo-gen backend OK"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("logo gen on :" + PORT));
