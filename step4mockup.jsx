/* Step 4-3 — 목업 적용하기. Depends on globals: React, CANDIDATES, LogoA-D */

(function(){
const { useState, useMemo, useEffect, useRef } = React;

/* Mockup templates — each card has bg renderer + logo placement transform */
const MOCKUPS = [
  { id: 'biz_card_1',   name: 'Business_Card_1', kind: 'biz_card' },
  { id: 'signboard_4',  name: 'signboard_4',     kind: 'window'   },
  { id: 'signboard_3',  name: 'signboard_3',     kind: 'wall_sign', primary: true },
  { id: 'papar_3',      name: 'papar-3',         kind: 'paper_card_3' },
  { id: 'papar_2',      name: 'papar-2',         kind: 'black_paper'  },
  { id: 'papar_1',      name: 'papar-1',         kind: 'folded_paper' },
  { id: 'cement',       name: '_기본목업_시멘트벽_로고', kind: 'cement_wall' },
  { id: 'paper',        name: 'paper',           kind: 'paper'        },
];

/* mock saved logos */
const SAVED_LOGOS = [
  { id: 'boot',  name: '부트캠프',     step: '6/6', date: '2026. 5. 18. PM 3:22', isCurrent: true },
  { id: 'root1', name: '루트스터디카페', step: '6/6', date: '2026. 5. 18. PM 2:13' },
  { id: 'root2', name: '루트스터디카페', step: '6/6', date: '2026. 5. 18. PM 1:58' },
];

/* Mockup backgrounds — simple SVG illustrations.
   Each takes a viewBox of 100x100 and renders just the SCENE (no logo). */
function MockupBg({ kind }){
  if (kind === 'biz_card') return <BizCardBg />;
  if (kind === 'window')   return <WindowBg />;
  if (kind === 'wall_sign')return <WallSignBg />;
  if (kind === 'paper_card_3') return <PaperCard3Bg />;
  if (kind === 'black_paper')  return <BlackPaperBg />;
  if (kind === 'folded_paper') return <FoldedPaperBg />;
  if (kind === 'cement_wall')  return <CementWallBg />;
  if (kind === 'paper') return <PaperBg />;
  return null;
}

const noiseFilter = (id) => (
  <filter id={id} x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
    <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.18 0" />
    <feComposite in2="SourceGraphic" operator="in" />
  </filter>
);

function BizCardBg(){
  return (
    <g>
      <rect width="100" height="100" fill="#e8e6e1" />
      {/* scattered cards */}
      {[
        { x: 8,  y: 18, r: -12, w: 38, h: 22 },
        { x: 56, y: 8,  r:   6, w: 36, h: 22 },
        { x: 22, y: 52, r:   4, w: 44, h: 26 },
        { x: 64, y: 64, r: -10, w: 30, h: 22 },
      ].map((c, i) => (
        <g key={i} transform={`rotate(${c.r} ${c.x+c.w/2} ${c.y+c.h/2})`}>
          <rect x={c.x+0.5} y={c.y+0.8} width={c.w} height={c.h} fill="#000" opacity="0.10" />
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="#f8f7f4" />
        </g>
      ))}
    </g>
  );
}

function WindowBg(){
  return (
    <g>
      <defs>
        <linearGradient id="winG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3d40" />
          <stop offset="100%" stopColor="#1a1c1e" />
        </linearGradient>
        <linearGradient id="winReflect" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#fff" stopOpacity="0.18" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#winG)" />
      <rect width="100" height="100" fill="url(#winReflect)" />
      {/* window frame */}
      <rect x="6" y="6" width="88" height="88" fill="none" stroke="#0a0a0b" strokeWidth="1.5" />
      {/* sign on dark glass */}
      <rect x="20" y="34" width="60" height="32" fill="#f1ecdf" opacity="0.92" />
    </g>
  );
}

function WallSignBg(){
  return (
    <g>
      <defs>
        <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3a098" />
          <stop offset="100%" stopColor="#777570" />
        </linearGradient>
        {noiseFilter('wallNoise')}
      </defs>
      <rect width="100" height="100" fill="url(#wallG)" />
      <rect width="100" height="100" fill="#9c9990" filter="url(#wallNoise)" />
      {/* sign — angled white rectangle as if attached to wall, viewed from right */}
      <g transform="translate(28 30)">
        <polygon points="0,0 48,4 48,40 0,44" fill="#000" opacity="0.18" transform="translate(2 3)" />
        <polygon points="0,0 48,4 48,40 0,44" fill="#fff" />
        <polygon points="0,0 4,2 4,42 0,44" fill="#e5e3df" />
      </g>
    </g>
  );
}

function PaperCard3Bg(){
  return (
    <g>
      <rect width="100" height="100" fill="#e2dfd7" />
      <g transform="rotate(-4 50 50)">
        <rect x="20" y="22" width="62" height="56" fill="#000" opacity="0.12" transform="translate(2 3)" />
        <rect x="20" y="22" width="62" height="56" fill="#f5f2ec" />
      </g>
    </g>
  );
}

function BlackPaperBg(){
  return (
    <g>
      <rect width="100" height="100" fill="#0d0e10" />
      {/* subtle fold */}
      <path d="M0 60 L100 50 L100 100 L0 100 Z" fill="#1a1b1d" />
      <path d="M0 60 L100 50" stroke="#2a2c2e" strokeWidth="0.4" />
    </g>
  );
}

function FoldedPaperBg(){
  return (
    <g>
      <rect width="100" height="100" fill="#e9e6df" />
      <path d="M10 14 L70 8 L92 24 L94 86 L40 92 L8 78 Z" fill="#f8f6f0" />
      <path d="M70 8 L72 30 L94 24" fill="none" stroke="#d8d4ca" strokeWidth="0.4" />
      <path d="M40 92 L42 50 L8 44" fill="none" stroke="#d8d4ca" strokeWidth="0.4" />
    </g>
  );
}

function CementWallBg(){
  return (
    <g>
      <defs>
        {noiseFilter('cementNoise')}
        <linearGradient id="cementG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdc9bf" />
          <stop offset="100%" stopColor="#a8a59d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#cementG)" />
      <rect width="100" height="100" fill="#b8b5ad" filter="url(#cementNoise)" />
    </g>
  );
}

function PaperBg(){
  return (
    <g>
      <defs>
        <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fafaf6" />
          <stop offset="100%" stopColor="#e8e6df" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#paperG)" />
      <path d="M0 60 L100 70 L100 100 L0 100 Z" fill="#000" opacity="0.04" />
    </g>
  );
}

/* Logo placement per mockup — CSS transforms applied to the logo overlay div.
   Each returns { box, transform, blend, lockSymbol } */
function getPlacement(kind){
  switch(kind){
    case 'biz_card':     return { left:'24%', top:'56%', width:'18%', height:'18%', transform:'rotate(4deg)' };
    case 'window':       return { left:'27%', top:'42%', width:'46%', height:'18%', transform:'perspective(400px) rotateY(-2deg)' };
    case 'wall_sign':    return { left:'31%', top:'33%', width:'40%', height:'30%', transform:'perspective(500px) rotateY(8deg) rotateX(-2deg) skewY(-3deg)' };
    case 'paper_card_3': return { left:'27%', top:'33%', width:'42%', height:'32%', transform:'rotate(-4deg)' };
    case 'black_paper':  return { left:'25%', top:'34%', width:'48%', height:'24%', transform:'rotate(0deg)', invert:true };
    case 'folded_paper': return { left:'26%', top:'30%', width:'48%', height:'34%', transform:'rotate(0deg)' };
    case 'cement_wall':  return { left:'22%', top:'30%', width:'56%', height:'30%', transform:'rotate(0deg)' };
    case 'paper':        return { left:'24%', top:'34%', width:'52%', height:'28%', transform:'rotate(0deg)' };
    default:             return { left:'30%', top:'40%', width:'40%', height:'20%', transform:'none' };
  }
}

/* Composited logo = symbol + (optional) brand text. layout depends on `mode`:
   - 'symbol' : only the symbol
   - 'both'   : symbol + brand text (horizontal)
   - 'text'   : only text
*/
/* Render either the original Logo SVG or the edited polygon path (when user has
   pulled handles in 4-2 단계 심볼 다듬기) — keeps look consistent across previews/mockups */
function SymbolMark({ logo, color, fillMode, symbolPaths, symbolCurve }){
  if (!logo) return null;
  const id = logo.id;
  const Logo = logo.Logo;
  if (symbolPaths && window.isSymbolPathEdited && window.isSymbolPathEdited(id, symbolPaths[id])){
    const d = window.symbolBuildD(symbolPaths[id], symbolCurve);
    const gradId = 'sm_g_' + id + '_' + Math.abs(color.charCodeAt(1)||0);
    const useGradient = fillMode !== 'solid';
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {useGradient && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
        )}
        <path d={d} fill={useGradient ? `url(#${gradId})` : color} />
      </svg>
    );
  }
  if (!Logo) return null;
  return <Logo solid={fillMode==='solid'} color={color} />;
}

function LogoComposite({ logo, color, fillMode, font, brandText, weight, letterSpacing, mode='both', invert=false, symbolPaths, symbolCurve }){
  const text = brandText;
  const finalColor = invert ? '#fff' : color;
  if (mode === 'symbol'){
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'80%', height:'80%' }}>
          <SymbolMark logo={logo} color={finalColor} fillMode={fillMode} symbolPaths={symbolPaths} symbolCurve={symbolCurve} />
        </div>
      </div>
    );
  }
  if (mode === 'text'){
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <span style={{ fontFamily:`'${font}', sans-serif`, fontWeight: weight, letterSpacing: letterSpacing+'px',
          color: finalColor, fontSize:'min(40cqw, 40cqh)', lineHeight:1, whiteSpace:'nowrap' }}>{text}</span>
      </div>
    );
  }
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'4%', overflow:'hidden' }}>
      <div style={{ width:'22%', height:'70%', flexShrink:0 }}>
        <SymbolMark logo={logo} color={finalColor} fillMode={fillMode} symbolPaths={symbolPaths} symbolCurve={symbolCurve} />
      </div>
      <span style={{ fontFamily:`'${font}', sans-serif`, fontWeight: weight, letterSpacing: letterSpacing+'px',
        color: finalColor, fontSize:'min(22cqw, 30cqh)', lineHeight:1, whiteSpace:'nowrap' }}>{text}</span>
    </div>
  );
}

/* Mockup card (thumb or composite preview) */
function MockupCard({ mockup, logo, color, fillMode, font, brandText, weight, letterSpacing, mode='both', showLogo=false, symbolPaths, symbolCurve }){
  const placement = getPlacement(mockup.kind);
  return (
    <div style={{
      position:'relative', width:'100%', aspectRatio:'1/1',
      borderRadius:8, overflow:'hidden', background:'#f5f3ee',
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display:'block' }}>
        <MockupBg kind={mockup.kind} />
      </svg>
      {showLogo && logo && (
        <div style={{
          position:'absolute',
          left: placement.left, top: placement.top,
          width: placement.width, height: placement.height,
          transform: placement.transform,
          transformOrigin: 'center',
          containerType: 'size',
        }}>
          <LogoComposite logo={logo} color={color} fillMode={fillMode}
            font={font} brandText={brandText} weight={weight} letterSpacing={letterSpacing}
            mode={mode} invert={placement.invert}
            symbolPaths={symbolPaths} symbolCurve={symbolCurve} />
        </div>
      )}
    </div>
  );
}

/* ---------- main section ---------- */
function MockupSection({ picked, color, fillMode, font, brandText, weight, letterSpacing, symbolPaths, symbolCurve }){
  const { CANDIDATES } = window;
  const pickedItems = (picked||[]).map(id => CANDIDATES.find(c=>c.id===id)).filter(Boolean);
  const currentLogo = pickedItems[0]; // primary logo from step 3

  const [selectedMockups, setSelectedMockups] = useState(new Set(['signboard_3', 'cement']));
  const [selectedLogos, setSelectedLogos]     = useState(new Set(['boot']));
  const [mockupOptions, setMockupOptions]     = useState({}); // per-id: { mode, color, position }
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // [{mockupId, logoId, checked}]
  const [resultChecked, setResultChecked] = useState(new Set());

  const toggleMockup = (id) => {
    const next = new Set(selectedMockups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMockups(next);
  };
  const toggleLogo = (id) => {
    const next = new Set(selectedLogos);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedLogos(next);
  };

  const getOpt = (id, key, def) => (mockupOptions[id]||{})[key] ?? def;
  const setOpt = (id, key, val) => setMockupOptions(o => ({ ...o, [id]: { ...(o[id]||{}), [key]: val } }));

  const applyCount = selectedMockups.size * selectedLogos.size;
  const canApply = applyCount > 0 && !loading;

  const onApply = () => {
    setLoading(true);
    setResults([]);
    setResultChecked(new Set());
    const list = [];
    selectedMockups.forEach(mId => selectedLogos.forEach(lId => list.push({ mockupId: mId, logoId: lId })));
    setTimeout(() => {
      setResults(list);
      setResultChecked(new Set(list.map((_, i) => i)));
      setLoading(false);
    }, 1800);
  };

  return (
    <section style={mk.section}>
      <header style={mk.header}>
        <h2 style={mk.h2}>목업 적용하기</h2>
        <p style={mk.sub}>아카이브에서 목업 템플릿을 고르고, 완성된 로고에 적용해 실제 적용 모습을 만듭니다.</p>
      </header>

      {/* 1. 목업 템플릿 고르기 */}
      <div style={mk.block}>
        <div style={mk.blockHeader}>
          <span style={mk.blockNum}>1.</span>
          <span style={mk.blockTitle}>목업 템플릿 고르기 <span style={{ color:'#9a9d97', fontWeight:500 }}>(아카이브)</span></span>
        </div>
        <p style={mk.blockSub}>적용할 템플릿을 선택하세요. 선택한 개수만큼 렌더됩니다 (렌더당 크레딧 차감, 같은 로고·같은 선택 재적용은 무료).</p>

        <div style={mk.tplGrid}>
          {MOCKUPS.map(m => {
            const selected = selectedMockups.has(m.id);
            return (
              <div key={m.id} style={{
                ...mk.tplCard,
                borderColor: selected ? '#111212' : '#e2e4e0',
                boxShadow: selected ? '0 0 0 1px #111212 inset' : 'none',
              }}>
                <button type="button" onClick={()=>toggleMockup(m.id)} style={mk.tplBtn}>
                  <MockupCard mockup={m} />
                  {selected && (
                    <span style={mk.checkBadge}><svg viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.4L6.6 11.5L12.5 4.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  )}
                </button>
                <div style={mk.tplName}>{m.name}</div>
                {selected && (
                  <div style={mk.tplOptions}>
                    <div style={mk.optSeg}>
                      {[
                        { v:'symbol', label:'심볼' },
                        { v:'both',   label:'심볼+텍스트' },
                        { v:'text',   label:'텍스트만' },
                      ].map(o => {
                        const cur = getOpt(m.id,'mode','both');
                        return (
                          <button key={o.v} type="button" onClick={()=>setOpt(m.id,'mode',o.v)}
                            style={{
                              ...mk.optSegBtn,
                              background: cur===o.v ? '#111212' : 'transparent',
                              color: cur===o.v ? '#fff' : '#5a5e5a',
                              fontWeight: cur===o.v ? 600 : 500,
                            }}>{o.label}</button>
                        );
                      })}
                    </div>
                    <div style={mk.optBtnRow}>
                      <button type="button" style={mk.optMiniBtn}><span aria-hidden style={{marginRight:4}}>☀</span>컬러</button>
                      <button type="button" style={mk.optMiniBtn}><span aria-hidden style={{marginRight:4}}>⛶</span>위치</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 적용할 로고 고르기 */}
      <div style={mk.block}>
        <div style={mk.blockHeader}>
          <span style={mk.blockNum}>2.</span>
          <span style={mk.blockTitle}>적용할 로고 고르기</span>
        </div>
        <p style={mk.blockSub}>시안을 확정한(5단계 이상) 완성 로고만 표시됩니다.</p>

        <div style={mk.logoGrid}>
          {SAVED_LOGOS.map(L => {
            const selected = selectedLogos.has(L.id);
            return (
              <button key={L.id} type="button" onClick={()=>toggleLogo(L.id)}
                style={{
                  ...mk.logoCard,
                  borderColor: selected ? '#111212' : '#e2e4e0',
                  boxShadow: selected ? '0 0 0 1px #111212 inset' : 'none',
                }}>
                <div style={mk.logoMark}>
                  {(() => {
                    if (L.isCurrent && currentLogo){
                      return <SymbolMark logo={currentLogo} color={color} fillMode={fillMode}
                        symbolPaths={symbolPaths} symbolCurve={symbolCurve} />;
                    }
                    return <DummyLogoMark seed={L.id} />;
                  })()}
                </div>
                <div style={mk.logoMeta}>
                  <div style={mk.logoName}>{L.name}</div>
                  <div style={mk.logoDate}>단계 {L.step} · {L.date}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Apply CTA */}
      <div style={{ marginTop: 16, display:'flex', alignItems:'center', gap:14 }}>
        <button type="button" onClick={onApply} disabled={!canApply}
          style={{
            ...mk.applyBtn,
            opacity: canApply ? 1 : 0.45,
            cursor: canApply ? 'pointer' : 'not-allowed',
          }}>
          <span aria-hidden style={{marginRight:8}}>✦</span>
          {loading ? '적용 중…' : `선택한 ${applyCount}개 템플릿 적용`}
        </button>
        {loading && (
          <span style={mk.loadingPill}>
            <span style={mk.spinner} />
            적용 중… (템플릿당 약 20초)
          </span>
        )}
      </div>

      {/* 적용 결과 */}
      {(loading || results.length > 0) && (
        <div style={{...mk.block, opacity: loading ? 0.45 : 1, transition:'opacity 200ms ease'}}>
          <div style={mk.resultHeader}>
            <span style={mk.blockTitle}>적용 결과</span>
            {results.length > 0 && !loading && (
              <div style={{display:'flex', gap:8}}>
                <button type="button" onClick={()=>setResultChecked(new Set())} style={mk.smGhost}>전체 해제</button>
                <button type="button" style={mk.smDark}>
                  <span style={{marginRight:6}}>↓</span> 선택 {resultChecked.size}개 ZIP 다운로드
                </button>
              </div>
            )}
          </div>
          {!loading && results.length > 0 && (
            <div style={mk.resultGrid}>
              {results.map((r, i) => {
                const m = MOCKUPS.find(x => x.id === r.mockupId);
                const L = SAVED_LOGOS.find(x => x.id === r.logoId);
                const logo = L.isCurrent ? currentLogo : { Logo: () => <DummyLogoMark seed={L.id} /> };
                const checked = resultChecked.has(i);
                const mode = getOpt(m.id, 'mode', 'both');
                return (
                  <div key={i} style={mk.resultCard}>
                    <label style={mk.resultCheck}>
                      <input type="checkbox" checked={checked}
                        onChange={()=>{
                          const nx = new Set(resultChecked);
                          if (checked) nx.delete(i); else nx.add(i);
                          setResultChecked(nx);
                        }} />
                    </label>
                    <MockupCard mockup={m} logo={logo}
                      color={color} fillMode={fillMode}
                      font={font} brandText={brandText}
                      weight={weight} letterSpacing={letterSpacing}
                      mode={mode} showLogo={true}
                      symbolPaths={symbolPaths} symbolCurve={symbolCurve} />
                    <div style={mk.resultFoot}>
                      <span style={{ fontSize:12, color:'#5a5e5a' }}>{m.name}</span>
                      <button type="button" style={mk.pngBtn}>↓ PNG</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* simple placeholder for non-current saved logos */
function DummyLogoMark({ seed }){
  const isCafe = seed.startsWith('root');
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%">
      {isCafe ? (
        <g>
          <path d="M30 60 L60 30 L90 60 L60 90 Z" fill="none" stroke="#2a2c2e" strokeWidth="3" />
          <path d="M40 60 L60 40 L80 60" fill="none" stroke="#2a2c2e" strokeWidth="3" />
          <line x1="30" y1="92" x2="90" y2="92" stroke="#2a2c2e" strokeWidth="3" />
        </g>
      ) : (
        <circle cx="60" cy="60" r="32" fill="#2a2c2e" />
      )}
    </svg>
  );
}

const mk = {
  section: {
    colorScheme: 'light',
    marginTop: 36,
    border: '1px solid #e2e4e0',
    borderRadius: 14,
    background: '#fff',
    padding: '20px 22px 22px',
  },
  header: { marginBottom: 18 },
  h2: { margin:0, fontSize:18, fontWeight:700, color:'#111212', letterSpacing:'-0.005em' },
  sub: { margin:'6px 0 0', fontSize:13, color:'#6b6f6e', lineHeight:1.55 },

  block: {
    marginTop: 22, padding: '16px 16px 18px',
    background:'#fafaf8', border:'1px solid #f0f1ee', borderRadius:12,
  },
  blockHeader: { display:'flex', alignItems:'baseline', gap:6 },
  blockNum: { fontSize:14, fontWeight:700, color:'#111212' },
  blockTitle: { fontSize:14, fontWeight:700, color:'#111212' },
  blockSub: { margin:'4px 0 14px', fontSize:12.5, color:'#7a7e79' },

  tplGrid: {
    display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14,
  },
  tplCard: {
    background:'#fff', border:'1px solid #e2e4e0', borderRadius:10,
    padding:8, transition:'box-shadow 80ms ease, border-color 80ms ease',
  },
  tplBtn: {
    position:'relative', background:'none', border:'none', padding:0, cursor:'pointer',
    width:'100%', display:'block',
  },
  checkBadge: {
    position:'absolute', top:6, right:6,
    width:18, height:18, borderRadius:'50%',
    background:'#111212', display:'inline-flex', alignItems:'center', justifyContent:'center',
  },
  tplName: { marginTop:8, fontSize:12, color:'#3a3c3a', textAlign:'left', paddingLeft:2 },
  tplOptions: { marginTop:8, display:'flex', flexDirection:'column', gap:6 },
  optSeg: {
    display:'inline-flex', gap:2, padding:2,
    background:'#f1f2ef', borderRadius:6, border:'1px solid #e2e4e0',
  },
  optSegBtn: {
    flex:1, padding:'3px 6px', fontSize:10.5, border:'none', borderRadius:4,
    cursor:'pointer', fontFamily:'inherit',
  },
  optBtnRow: { display:'flex', gap:4 },
  optMiniBtn: {
    flex:1, padding:'4px 6px', fontSize:10.5,
    background:'#fff', border:'1px solid #e2e4e0', borderRadius:5,
    color:'#5a5e5a', cursor:'pointer', fontFamily:'inherit',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
  },

  logoGrid: {
    display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10,
  },
  logoCard: {
    display:'flex', alignItems:'center', gap:14,
    padding:'12px 14px', background:'#fff',
    border:'1px solid #e2e4e0', borderRadius:10,
    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
    transition:'box-shadow 80ms ease, border-color 80ms ease',
  },
  logoMark: { width:28, height:28, flexShrink:0 },
  logoMeta: { display:'flex', flexDirection:'column', gap:2 },
  logoName: { fontSize:13, fontWeight:600, color:'#111212' },
  logoDate: { fontSize:11.5, color:'#7a7e79' },

  applyBtn: {
    background:'#111212', color:'#fff', border:'none',
    padding:'10px 18px', borderRadius:8,
    fontSize:13.5, fontWeight:600, cursor:'pointer',
    display:'inline-flex', alignItems:'center', fontFamily:'inherit',
  },
  loadingPill: {
    display:'inline-flex', alignItems:'center', gap:10,
    padding:'7px 14px', borderRadius:999,
    background:'#fff', border:'1px solid #e2e4e0',
    fontSize:12.5, color:'#5a5e5a',
  },
  spinner: {
    display:'inline-block', width:14, height:14,
    border:'2px solid #d3d6d2', borderTopColor:'#5a5e5a', borderRadius:'50%',
    animation:'spin 0.8s linear infinite',
  },

  resultHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  resultGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 },
  resultCard: {
    position:'relative', background:'#fff', border:'1px solid #e2e4e0', borderRadius:10,
    padding:8,
  },
  resultCheck: {
    position:'absolute', top:10, left:10, zIndex:2,
    background:'#fff', borderRadius:4, padding:'1px 3px', border:'1px solid #d3d6d2',
    display:'inline-flex', alignItems:'center',
  },
  resultFoot: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    paddingTop:8,
  },
  pngBtn: {
    background:'transparent', border:'none', color:'#5a5e5a',
    fontSize:11.5, cursor:'pointer', fontFamily:'inherit',
  },
  smGhost: {
    background:'#fff', border:'1px solid #d3d6d2', borderRadius:6,
    padding:'5px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
    color:'#2a2c2c',
  },
  smDark: {
    background:'#111212', color:'#fff', border:'1px solid #111212',
    borderRadius:6, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
    display:'inline-flex', alignItems:'center', fontWeight:500,
  },
};

window.MockupSection = MockupSection;
})();
