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
  A: "literal, direct combination of the motifs",
  B: "pure geometric abstraction of the concept",
  C: "an adjacent or substitute motif that implies the concept",
  D: "compound — multiple concepts compressed into one mark",
};

function buildPrompt(b, key) {
  const colors = [b.primaryHex, b.secondaryHex, ...(b.refColors || [])]
    .filter(Boolean).slice(0, 3).join(", ");
  return [
    "Minimal, premium brand SYMBOL mark only. Absolutely no text, no letters, no numbers.",
    `Concept: ${b.brandConcept || "a clean modern brand"}.`,
    `Combination approach for this variant: ${VARIANTS[key]}.`,
    `Use only these colors: ${colors || "#003894"}.`,
    "Flat clean vector, smooth curves, balanced proportions, generous whitespace,",
    "no gradient overuse, no 3D, no photo, no mockup, single centered icon, square.",
    b.userPrompt ? `User priority request (follow first): ${b.userPrompt}.` : "",
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
      style: "vector_illustration",
      model: "recraftv3",
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
