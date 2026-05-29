/* Step 5 — 제안서 만들기 (고객 발송용). Renders above the mockup section.
   Depends on globals: React, CANDIDATES, symbolBuildD, isSymbolPathEdited */

(function(){
const { useState, useEffect } = React;

/* render the symbol mark for a candidate, honoring edited polygon paths + fill */
function MarkSVG({ id, color, fillMode, symbolPaths, symbolCurve }){
  const item = (window.CANDIDATES || []).find(c => c.id === id);
  if (!item) return null;
  const Logo = item.Logo;
  if (symbolPaths && window.isSymbolPathEdited && window.isSymbolPathEdited(id, symbolPaths[id])){
    const d = window.symbolBuildD(symbolPaths[id], symbolCurve);
    const gid = 'pr_g_' + id;
    const useGrad = fillMode !== 'solid';
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {useGrad && (
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
        )}
        <path d={d} fill={useGrad ? `url(#${gid})` : color} />
      </svg>
    );
  }
  return <Logo solid={fillMode === 'solid'} color={color} />;
}

function ProposalSection({ picked, color, fillMode, font, brandText, weight, letterSpacing, symbolColor, symbolPaths, symbolCurve, onEditSymbol }){
  const { CANDIDATES } = window;
  const items = (picked || []).map(id => CANDIDATES.find(c => c.id === id)).filter(Boolean);
  const primaryItem = items[0];
  const symColor = fillMode === 'solid' ? (symbolColor || color) : color;

  const [building, setBuilding] = useState(false);
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState(picked && picked[0] || null);
  const [seed, setSeed] = useState(0);

  /* keep chosen valid as picks change */
  useEffect(() => {
    if (picked && picked.length && !picked.includes(chosen)) setChosen(picked[0]);
  }, [picked, chosen]);

  const buildProposal = () => {
    setBuilding(true);
    setReady(false);
    const t = setTimeout(() => { setBuilding(false); setReady(true); }, 2200);
    return () => clearTimeout(t);
  };
  const remake = () => { setReady(false); buildProposal(); };

  if (!primaryItem) return null;

  return (
    <section style={pr.section}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={pr.h2}>제안서 만들기 <span style={{ color:'#7a7e79', fontWeight:600, fontSize:14 }}>(고객 발송용)</span></h2>
        <p style={pr.sub}>
          고른 1개 시안으로 제안서를 만들어 고객에게 보내세요. 고객이 한 시안을 정하면, 아래에서 그 시안을 골라
          최종 납품(글자 합치기·원본 파일)으로 진행됩니다.
        </p>
      </header>

      {/* 시안 previews — every picked 시안 (1~3), each with label + edit button inside its box */}
      <div style={pr.previewRow}>
        {items.map((it) => (
          <div key={it.id} style={pr.previewCard}>
            <div style={pr.previewArt}>
              <div style={{ width: '60%', height: '60%' }}>
                <MarkSVG id={it.id} color={symColor} fillMode={fillMode} symbolPaths={symbolPaths} symbolCurve={symbolCurve} />
              </div>
            </div>
            <div style={pr.previewMeta}>
              <div style={pr.previewLabel}>시안 {it.id} ({it.id})</div>
              <button type="button" onClick={()=>onEditSymbol && onEditSymbol(it.id)} style={pr.editBtn}>
                <span aria-hidden style={{ marginRight: 6 }}>✎</span>심볼 다듬기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* actions */}
      <div style={pr.actionRow}>
        {building ? (
          <span style={pr.loadingPill}>
            <span style={pr.spinner} />
            제안서 만드는 중… (약 30초)
          </span>
        ) : (
          <button type="button" onClick={buildProposal} style={pr.pdfBtn}>
            <span aria-hidden style={{ marginRight: 8 }}>▦</span>
            {ready ? '제안서 내려받기 (PDF)' : '제안서 만들기 (PDF)'}
          </button>
        )}
        <button type="button" onClick={remake} disabled={building}
          style={{ ...pr.ghostBtn, opacity: building ? 0.5 : 1, cursor: building ? 'not-allowed' : 'pointer' }}>
          다시 만들기
        </button>
        <span style={pr.helper}>
          이 제안서를 그대로 고객에게 보내세요. 시안 회차·분기는 자동으로 늘어납니다.
        </span>
      </div>

      {/* customer-chosen 시안 */}
      <div style={{ marginTop: 26 }}>
        <h3 style={pr.h3}>고객이 고른 시안 <span style={{ color:'#7a7e79', fontWeight:600 }}>(납품 진행)</span></h3>
        <div style={pr.chooseGrid}>
          {items.map(it => {
            const active = chosen === it.id;
            return (
              <button key={it.id} type="button" onClick={()=>setChosen(it.id)}
                style={{ ...pr.chooseCard, borderColor: active ? '#111212' : '#dcdedb', boxShadow: active ? '0 0 0 1px #111212 inset' : 'none', background: active ? '#fff' : '#fafaf8' }}>
                <div style={pr.chooseTitle}>시안 {it.id} ({it.id})</div>
                <div style={pr.chooseDesc}>{(it.desc || '').replace(/\n/g, ' ')}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const pr = {
  section: {
    border: '1px solid #e2e4e0', borderRadius: 14, background: '#fff',
    padding: '20px 22px 22px', marginBottom: 22,
  },
  h2: { margin: 0, fontSize: 18, fontWeight: 700, color: '#111212', letterSpacing: '-0.005em' },
  sub: { margin: '6px 0 0', fontSize: 13, color: '#6b6f6e', lineHeight: 1.6 },

  previewRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  previewCard: {
    width: 190, border: '1px solid #e2e4e0', borderRadius: 12, overflow: 'hidden',
    background: '#fff', display: 'flex', flexDirection: 'column',
  },
  previewArt: {
    colorScheme: 'light',
    width: '100%', aspectRatio: '1.1 / 1', background: '#f4f6f4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  previewMeta: { padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  previewLabel: { fontSize: 13, fontWeight: 600, color: '#2a2c2c' },
  editBtn: {
    alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center',
    padding: '6px 11px', borderRadius: 8, border: '1px solid #d3d6d2', background: '#fff',
    fontSize: 12, color: '#2a2c2c', cursor: 'pointer', fontFamily: 'inherit',
  },

  actionRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' },
  pdfBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '10px 16px',
    background: '#111212', color: '#fff', border: '1px solid #111212', borderRadius: 8,
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  ghostBtn: {
    padding: '10px 16px', background: '#fff', border: '1px solid #d3d6d2', borderRadius: 8,
    fontSize: 13, color: '#2a2c2c', fontFamily: 'inherit',
  },
  loadingPill: {
    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 16px',
    borderRadius: 8, background: '#f1f2ef', border: '1px solid #e2e4e0',
    fontSize: 13, color: '#5a5e5a',
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
    border: '2px solid #d3d6d2', borderTopColor: '#5a5e5a', animation: 'spin 0.8s linear infinite',
  },
  helper: { fontSize: 12, color: '#9a9d97', lineHeight: 1.5, flex: 1, minWidth: 180 },

  h3: { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#2a2c2c' },
  chooseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  chooseCard: {
    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
    border: '1px solid #dcdedb', borderRadius: 12, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'border-color 100ms ease, box-shadow 100ms ease, background 100ms ease',
  },
  chooseTitle: { fontSize: 13, fontWeight: 700, color: '#111212' },
  chooseDesc: { fontSize: 12, color: '#6b6f6e', lineHeight: 1.55 },
};

window.ProposalSection = ProposalSection;
})();
