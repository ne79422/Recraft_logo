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
  A: "direct motif combination — take the core motif literally and merge it with the brand concept",
  B: "pure geometric abstraction — reduce the concept to basic shapes, lines and proportions only",
  C: "adjacent motif substitution — use a related or implied motif that hints at the concept indirectly",
  D: "multi-concept compression — compress multiple brand values into a single unified form",
};

// ── 색상: hex → Recraft controls.colors 구조 (RGB 배열) ──
// ★ 개선 #3: 색을 프롬프트 텍스트가 아니라 구조화 파라미터로 전달 → 색이 탁해지지 않음
function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
}

// ── 프롬프트: 짧고 긍정적으로 ──
// ★ 개선 #5: 부정문 범벅 긴 단락 대신, style이 벡터 룩을 책임지고 프롬프트는 핵심 의미만
function buildPrompt(b, key) {
  return [
    `A single premium logo symbol mark representing: ${b.brandConcept || "a clean, modern, premium brand"}.`,
    `Design approach: ${VARIANTS[key]}.`,
    "Flat vector illustration, bold geometric silhouette, one or two solid colors, generous negative space, centered, crisp clean edges, minimal detail.",
    "Iconic, premium, instantly recognizable as a single mark. No text, no letters, no numbers, no words.",
    b.userPrompt ? `Priority request (follow this above all): ${b.userPrompt}.` : "",
  ].filter(Boolean).join(" ");
}

async function recraftOne(prompt, brief) {
  // ★ 개선 #3: 브랜드 색을 controls.colors 로 (최대 3색)
  const colors = [brief.primaryHex, brief.secondaryHex, ...(brief.refColors || [])]
    .map(hexToRgb)
    .filter(Boolean)
    .slice(0, 3);

  const body = {
    prompt,
    model: "recraftv3",            // ★ 개선 #2: 유효한 모델명 (이전 "recraftv4_vector"는 존재하지 않음)
    style: "vector_illustration",  // ★ 개선 #1: 벡터 스타일 = 웹앱 고퀄의 핵심
    size: "1024x1024",
    n: 1,
  };
  if (colors.length) body.controls = { colors };

  // ★ 개선 #4(선택): 참고이미지로 만든 커스텀 스타일이 있으면 style_id 우선 적용
  //   (RECRAFT_STYLE_ID 환경변수에 넣으면 style 대신 그 스타일을 사용)
  if (process.env.RECRAFT_STYLE_ID) {
    delete body.style;
    body.style_id = process.env.RECRAFT_STYLE_ID;
  }

  const r = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RECRAFT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
      keys.map((k) => recraftOne(buildPrompt(brief, k), brief).catch(() => null))
    );
    res.json({ images: { A: urls[0], B: urls[1], C: urls[2], D: urls[3] } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/", (_req, res) => res.send("logo-gen backend OK"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("logo gen on :" + PORT));
