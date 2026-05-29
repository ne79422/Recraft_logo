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

const RECRAFT_TOKEN = (process.env.RECRAFT_API_TOKEN || "").trim();

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
    `A single minimalist line-art logo symbol mark representing: ${b.brandConcept || "a clean, modern, premium brand"}.`,
    b.motif ? `Core motif: ${b.motif}.` : "",
    b.direction ? `Direction: ${b.direction}.` : "",
    `Design approach: ${VARIANTS[key]}.`,
    // ★ 라인아트 지향 (채움형 금지)
    "Style: minimalist single continuous line art, clean rounded outlines, uniform thick stroke, OUTLINE ONLY with no fill, one solid dark color on white background, generous negative space, centered, friendly and warm.",
    "Iconic, premium, instantly recognizable as a single mark. No text, no letters, no numbers, no words. Not a filled blocky shape, not 3D, not a mascot illustration.",
    b.userPrompt ? `Priority request (follow this above all): ${b.userPrompt}.` : "",
  ].filter(Boolean).join(" ");
}

function buildBody(prompt, brief) {
  // ★ V4/V4.1은 style 파라미터 미지원 → 벡터는 모델명(recraftv4_1_vector)으로 선택.
  //   style/style_id 보내지 않음 (보내면 구형 V3로 폴백되거나 거부됨).
  //   controls(색상)는 전 모델 지원 → 브랜드 주색 1색만 (참고이미지 색 오염 방지).
  const colors = [brief.primaryHex]
    .map(hexToRgb)
    .filter(Boolean)
    .slice(0, 1);
  const body = {
    prompt,
    model: (process.env.RECRAFT_MODEL || "recraftv4_1_vector").trim(),
    size: "1024x1024",
    n: 1,
  };
  if (colors.length) body.controls = { colors };
  return body;
}

// Recraft 호출 (실패 시 에러 throw)
async function callRecraft(body) {
  const r = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RECRAFT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    const err = new Error("recraft " + r.status + " " + txt);
    err.status = r.status;
    err.bodyText = txt;
    console.error("[recraft error]", r.status, txt);
    throw err;
  }
  const j = await r.json();
  return j.data?.[0]?.image_url || j.data?.[0]?.url || null;
}

async function recraftOne(prompt, brief) {
  return await callRecraft(buildBody(prompt, brief));
}

app.post("/api/generate-logos", async (req, res) => {
  try {
    const brief = req.body || {};
    // variantKeys 가 넘어오면 그것만, 없으면 기본 4개
    const keys = (brief.variantKeys && brief.variantKeys.length)
      ? brief.variantKeys.filter(k => ["A","B","C","D"].includes(k))
      : ["A", "B", "C", "D"];
    const results = await Promise.all(
      keys.map(async (k) => {
        try { return [k, await recraftOne(buildPrompt(brief, k), brief)]; }
        catch { return [k, null]; }
      })
    );
    const images = Object.fromEntries(results);
    res.json({ images });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/", (_req, res) => res.send("logo-gen backend OK"));

// ── 진단용: 브라우저에서 https://...onrender.com/api/test 접속하면 실제 결과/에러를 JSON으로 보여줌 ──
app.get("/api/test", async (_req, res) => {
  const info = {
    hasToken: !!RECRAFT_TOKEN,
    tokenLength: RECRAFT_TOKEN.length,
    activeModel: (process.env.RECRAFT_MODEL || "recraftv4_1_vector").trim(),
  };

  // 실제 이미지 생성 테스트
  try {
    const body = buildBody(
      "A single premium logo symbol mark of a friendly bear, flat vector, bold silhouette.",
      { primaryHex: "#C2632C" }
    );
    info.requestBody = { ...body, prompt: body.prompt.slice(0, 40) + "..." };
    const r = await fetch("https://external.api.recraft.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RECRAFT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    info.httpStatus = r.status;
    const txt = await r.text();
    try { info.response = JSON.parse(txt); } catch { info.response = txt; }
    info.result = r.ok ? "✅ 성공 — Recraft 호출 정상" : "❌ 실패 — 아래 response의 에러 메시지 확인";
  } catch (e) {
    info.result = "❌ 네트워크/예외 오류";
    info.error = String(e);
  }
  res.json(info);
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("logo gen on :" + PORT));
