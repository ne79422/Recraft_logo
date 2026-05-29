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
    `A single premium logo symbol mark representing: ${b.brandConcept || "a clean, modern, premium brand"}.`,
    `Design approach: ${VARIANTS[key]}.`,
    "Flat vector illustration, bold geometric silhouette, one or two solid colors, generous negative space, centered, crisp clean edges, minimal detail.",
    "Iconic, premium, instantly recognizable as a single mark. No text, no letters, no numbers, no words.",
    b.userPrompt ? `Priority request (follow this above all): ${b.userPrompt}.` : "",
  ].filter(Boolean).join(" ");
}

function buildBody(prompt, brief) {
  const styleId = (process.env.RECRAFT_STYLE_ID || "").trim();

  // ★ 커스텀 스타일(style_id) 사용 시: prompt + style_id 만! (model·style·controls 동시 전송 금지 → 400 에러)
  if (styleId) {
    return { prompt, style_id: styleId, size: "1024x1024", n: 1 };
  }

  // ★ 일반 모드: 벡터 스타일 + 브랜드 색
  const colors = [brief.primaryHex, brief.secondaryHex, ...(brief.refColors || [])]
    .map(hexToRgb)
    .filter(Boolean)
    .slice(0, 3);
  const body = {
    prompt,
    model: "recraftv3",
    style: "vector_illustration",
    size: "1024x1024",
    n: 1,
  };
  if (colors.length) body.controls = { colors };
  return body;
}

async function recraftOne(prompt, brief) {
  const body = buildBody(prompt, brief);
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
    console.error("[recraft error]", r.status, txt);   // ← Render Logs에 에러 표시
    throw new Error("recraft " + r.status + " " + txt);
  }
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

// ── 진단용: 브라우저에서 https://...onrender.com/api/test 접속하면 실제 결과/에러를 JSON으로 보여줌 ──
app.get("/api/test", async (_req, res) => {
  const rawStyleId = process.env.RECRAFT_STYLE_ID || "";
  const styleId = rawStyleId.trim();
  const info = {
    hasToken: !!RECRAFT_TOKEN,
    tokenLength: RECRAFT_TOKEN.length,
    hasStyleId: !!styleId,
    styleIdPreview: styleId ? styleId.slice(0, 8) + "..." : null,
    styleIdLength: styleId.length,
    styleIdHadWhitespace: rawStyleId !== styleId,   // ← 공백/줄바꿈 있었는지
  };

  // ① 먼저 "이 토큰으로 이 스타일에 접근 가능한지" 직접 확인
  if (styleId) {
    try {
      const sr = await fetch("https://external.api.recraft.ai/v1/styles/" + styleId, {
        headers: { "Authorization": `Bearer ${RECRAFT_TOKEN}` },
      });
      const stxt = await sr.text();
      info.styleLookup = {
        httpStatus: sr.status,
        found: sr.ok,
        body: (() => { try { return JSON.parse(stxt); } catch { return stxt; } })(),
      };
    } catch (e) {
      info.styleLookup = { error: String(e) };
    }
  }

  // ② 실제 이미지 생성 테스트
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
