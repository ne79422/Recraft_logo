/* Step 4 — 글꼴 고르기. Depends on globals on window: React, StepRail, Check, shell, footerStyle, CANDIDATES (set by main file before this renders) */

(function(){
const { useState, useMemo, useEffect, useRef } = React;

const FONTS_EN = {
  '기하학체': ['Montserrat', 'Poppins'],
  '제목체':   ['Oswald', 'Bebas Neue', 'Anton', 'Archivo Black', 'Righteous', 'Alfa Slab One', 'Titan One', 'Bungee', 'Bangers', 'Passion One', 'Paytone One', 'Shrikhand'],
  '명조체':   ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Abril Fatface', 'Libre Baskerville'],
  '필기체':   ['Lobster', 'Pacifico'],
};
const FONTS_KR = {
  '고딕체': ['Pretendard', 'IBM Plex Sans KR', 'Gothic A1', 'Noto Sans KR'],
  '기하학체': ['SUIT'],
  '제목체': ['Gmarket Sans', 'Black Han Sans', 'Do Hyeon', 'Gugi', 'Bagel Fat One', 'Gasoek One'],
  '둥근체': ['Jua', 'Yeon Sung'],
  '명조체': ['Nanum Myeongjo', 'Gowun Batang'],
  '손글씨': ['Nanum Pen Script', 'Poor Story', 'Nanum Brush Script', 'Single Day', 'Cute Font', 'Gaegu'],
};

/* 폰트 한글 표시명 (칩 라벨용). 없으면 영문 패밀리명을 그대로 표시 */
const FONT_LABELS = {
  'Pretendard': '프리텐다드',
  'IBM Plex Sans KR': 'IBM Plex Sans KR',
  'Gothic A1': '고딕 A1',
  'Noto Sans KR': '노토 산스',
  'SUIT': '수트 SUIT',
  'Gmarket Sans': '지마켓 산스',
  'Black Han Sans': '검은고딕',
  'Do Hyeon': '도현',
  'Gugi': '구기',
  'Bagel Fat One': '베이글 팻 원',
  'Gasoek One': '가속 원',
  'Jua': '주아',
  'Yeon Sung': '연성',
  'Nanum Myeongjo': '나눔명조',
  'Gowun Batang': '고운바탕',
  'Nanum Pen Script': '나눔손글씨 펜',
  'Poor Story': '푸어 스토리',
  'Nanum Brush Script': '나눔손글씨 붓',
  'Single Day': '싱글데이',
  'Cute Font': '큐트폰트',
  'Gaegu': '개구',
};

/* known font traits for the "굵기" hint */
const SINGLE_WEIGHT_FONTS = new Set([
  'Bebas Neue', 'Anton', 'Archivo Black', 'Righteous', 'Alfa Slab One',
  'Titan One', 'Bungee', 'Bangers', 'Paytone One', 'Shrikhand',
  'DM Serif Display', 'Abril Fatface', 'Lobster', 'Pacifico',
  'Black Han Sans', 'Do Hyeon', 'Jua', 'Nanum Pen Script',
  'Gugi', 'Bagel Fat One', 'Gasoek One', 'Yeon Sung', 'Poor Story',
  'Nanum Brush Script', 'Single Day', 'Cute Font',
]);

const DEFAULT_TWEAKS = {
  weight: 600,
  letterSpacing: 0,     // px, range -5..12
  symbolScale: 100,     // % of brand-name height, 100..250
  symbolGap: 15,        // % of symbol size, -100..30 (negative = overlap)
  fillMode: 'gradient', // 'gradient' | 'solid'
  color: '#003894',
  orientation: 'horizontal', // 'horizontal' | 'stacked'
};

/* ---------- atoms ---------- */
function s4Slider({ value, onChange, min, max, step, suffix }) {
  // unused (component below)
}

function S4Slider({ value, onChange, min, max, step = 1, format }) {
  return (
    <div style={s4.sliderRow}>
      <input
        type="range"
        value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        style={s4.range}
      />
      <span style={s4.sliderValue}>{format ? format(value) : value}</span>
    </div>
  );
}

function S4Segment({ options, value, onChange, size = 'md', wrap = false }) {
  const pad = size === 'sm' ? '6px 14px' : '8px 18px';
  return (
    <div style={{ ...s4.segment, ...(wrap ? { display: 'flex', flexWrap: 'wrap', width: '100%' } : {}) }}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={()=>onChange(v)}
            style={{
              ...s4.segmentBtn,
              padding: pad,
              background: active ? '#fff' : 'transparent',
              borderColor: active ? '#111212' : 'transparent',
              color: active ? '#111212' : '#5a5e5a',
              fontWeight: active ? 600 : 500,
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              ...(wrap ? { flexShrink: 0, whiteSpace: 'nowrap' } : {}),
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

/* ---------- font chip ---------- */
function FontChip({ name, label, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        ...s4.chip,
        borderColor: selected ? '#111212' : '#dcdedb',
        background: selected ? '#fff' : '#fff',
        boxShadow: selected ? '0 0 0 2px #111212 inset' : 'none',
      }}
    >
      <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, fontWeight: 600, color: '#111212' }}>{label}</span>
      <span style={{ fontFamily: `'${name}', sans-serif`, fontSize: 12, color: '#7a7e79', marginLeft: 8 }}>{name}</span>
    </button>
  );
}

/* ---------- preview ---------- */
function PreviewSymbol({ id, solid, color, paths, curve }){
  const item = (window.CANDIDATES || []).find(c => c.id === id);
  if (!item) return null;
  const Logo = item.Logo;
  if (paths && window.isSymbolPathEdited && window.isSymbolPathEdited(id, paths[id])){
    const d = window.symbolBuildD(paths[id], curve);
    const gradId = 'ps_g_' + id;
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {!solid && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
        )}
        <path d={d} fill={solid ? color : `url(#${gradId})`} />
      </svg>
    );
  }
  return <Logo solid={solid} color={color} />;
}

function Preview({ index, picked, brandText, tweaks }) {
  const baseFontSize = 36;
  const symbolPx = baseFontSize * (tweaks.symbolScale / 100);
  const symbolBox = symbolPx * 1.2;
  /* gap is proportional to symbol size; supports negative values (overlap) via margin */
  const gapPx = symbolBox * (tweaks.symbolGap / 100);
  const horizontal = tweaks.orientation === 'horizontal';
  const flexDir = horizontal ? 'row' : 'column';
  const symbolColor = tweaks.fillMode === 'solid' ? (tweaks.symbolColor || tweaks.color) : tweaks.color;

  return (
    <div style={s4.previewCard}>
      <div style={s4.previewTag}>시안 {picked.id}</div>
      <div style={s4.previewInner}>
        <div style={{
          display: 'flex',
          flexDirection: flexDir,
          alignItems: 'center',
        }}>
          <div style={{
            width: symbolBox,
            height: symbolBox,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'width 90ms linear, height 90ms linear',
          }}>
            <PreviewSymbol id={picked.id} solid={tweaks.fillMode === 'solid'} color={symbolColor} paths={tweaks.symbolPaths} curve={tweaks.symbolCurve} />
          </div>
          <div style={{
            fontFamily: `'${tweaks.font}', sans-serif`,
            fontWeight: tweaks.weight,
            letterSpacing: tweaks.letterSpacing + 'px',
            fontSize: baseFontSize,
            color: tweaks.color,
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
            [horizontal ? 'marginLeft' : 'marginTop']: gapPx,
            transition: 'letter-spacing 60ms linear, margin 90ms linear',
          }}>{brandText}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- main ---------- */
function Step4View({ onBack, onNext, onSelectStep, picked, brandKo, brandEn, primary, onDesign, symbolPaths, setSymbolPaths, symbolCurve, setSymbolCurve }) {
  /* pull shared components/styles from main file (set on window before this renders) */
  const { StepRail, Check, shell, footerStyle, CANDIDATES } = window;

  /* lazy-load all Google Fonts the first time step 4 mounts */
  useEffect(() => {
    if (document.getElementById('__s4_fonts')) return;
    const l1 = document.createElement('link');
    l1.id = '__s4_fonts';
    l1.rel = 'stylesheet';
    l1.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Anton&family=Archivo+Black&family=Righteous&family=Alfa+Slab+One&family=Titan+One&family=Bungee&family=Bangers&family=Passion+One:wght@400;700&family=Paytone+One&family=Shrikhand&family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Serif+Display&family=Abril+Fatface&family=Libre+Baskerville:wght@400;700&family=Lobster&family=Pacifico&display=swap';
    document.head.appendChild(l1);
    const l2 = document.createElement('link');
    l2.id = '__s4_fonts_kr';
    l2.rel = 'stylesheet';
    l2.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Sunflower:wght@300;500;700&family=Nanum+Myeongjo:wght@400;700&family=Gowun+Batang:wght@400;700&family=Nanum+Pen+Script&family=Gaegu:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Gothic+A1:wght@400;500;700&family=Gugi&family=Bagel+Fat+One&family=Gasoek+One&family=Yeon+Sung&family=Poor+Story&family=Nanum+Brush+Script&family=Single+Day&family=Cute+Font&display=swap';
    document.head.appendChild(l2);
    /* fonts not on Google Fonts — load from public CDNs with matching family names */
    if (!document.getElementById('__s4_fonts_cdn')) {
      const l3 = document.createElement('link');
      l3.id = '__s4_fonts_cdn'; l3.rel = 'stylesheet';
      l3.href = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css';
      document.head.appendChild(l3);
      const st = document.createElement('style');
      st.id = '__s4_fonts_facecdn';
      st.textContent = `
        @font-face{font-family:'SUIT';src:url('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Regular.woff2') format('woff2');font-weight:400;font-display:swap;}
        @font-face{font-family:'SUIT';src:url('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Bold.woff2') format('woff2');font-weight:700;font-display:swap;}
        @font-face{font-family:'Gmarket Sans';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');font-weight:500;font-display:swap;}
        @font-face{font-family:'Gmarket Sans';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');font-weight:700;font-display:swap;}
      `;
      document.head.appendChild(st);
    }
  }, []);

  const [mode, setMode] = useState(() => {
    /* prefer KR if Korean is the only filled brand */
    if (brandKo && !brandEn) return 'kr';
    return 'en';
  }); // 'kr' | 'en'
  const [font, setFont] = useState('Montserrat');
  const [weight, setWeight] = useState(DEFAULT_TWEAKS.weight);
  const [letterSpacing, setLetterSpacing] = useState(DEFAULT_TWEAKS.letterSpacing);
  const [symbolScale, setSymbolScale] = useState(DEFAULT_TWEAKS.symbolScale);
  const [symbolGap, setSymbolGap] = useState(DEFAULT_TWEAKS.symbolGap);
  const [fillMode, setFillMode] = useState(DEFAULT_TWEAKS.fillMode);
  const [color, setColor] = useState(primary?.hex || DEFAULT_TWEAKS.color);
  const [orientation, setOrientation] = useState(DEFAULT_TWEAKS.orientation);
  const [colorDirty, setColorDirty] = useState(false);
  /* symbol color — only used in 단색(solid) mode; independent of 글자 색 once user touches it */
  const [symbolColor, setSymbolColor] = useState(primary?.hex || DEFAULT_TWEAKS.color);
  const [symbolColorDirty, setSymbolColorDirty] = useState(false);
  const setSymbolColorUser = (c) => { setSymbolColor(c); setSymbolColorDirty(true); };

  /* shared symbol-edit state is owned by App (editor lives on step 5) and passed in as props */

  /* sync color from step 2 주요 색상 — only if user hasn't manually changed it */
  useEffect(() => {
    if (!colorDirty && primary?.hex) setColor(primary.hex);
    if (!symbolColorDirty && primary?.hex) setSymbolColor(primary.hex);
  }, [primary?.hex, colorDirty, symbolColorDirty]);
  const setColorUser = (c) => { setColor(c); setColorDirty(true); };

  /* mode switch -> jump to a sensible default */
  React.useEffect(() => {
    if (mode === 'en' && !Object.values(FONTS_EN).flat().includes(font)) {
      setFont('Montserrat');
    }
    if (mode === 'kr' && !Object.values(FONTS_KR).flat().includes(font)) {
      setFont('Black Han Sans');
    }
    // eslint-disable-next-line
  }, [mode]);

  const brandText = mode === 'en' ? (brandEn || brandKo || 'Boot Camp') : (brandKo || brandEn || '부트캠프');
  const fontMap = mode === 'en' ? FONTS_EN : FONTS_KR;
  const isSingleWeight = SINGLE_WEIGHT_FONTS.has(font);
  const CAND_ORDER = CANDIDATES.map(c => c.id);
  const pickedItems = (picked || [])
    .map(id => CANDIDATES.find(c => c.id === id))
    .filter(Boolean)
    .sort((a, b) => CAND_ORDER.indexOf(a.id) - CAND_ORDER.indexOf(b.id));
  const hasPicks = pickedItems.length > 0;

  const tweaks = { font, weight, letterSpacing, symbolScale, symbolGap, fillMode, color, symbolColor, orientation, symbolPaths, symbolCurve };

  /* surface the current design up to App so step 5 (목업 적용) can render it.
     fires only when a design field changes — no polling. */
  useEffect(() => {
    if (typeof onDesign === 'function') {
      onDesign({
        color, fillMode, font, brandText, weight, letterSpacing,
        symbolColor: fillMode === 'solid' ? symbolColor : color,
        symbolPaths, symbolCurve,
      });
    }
  }, [color, fillMode, font, brandText, weight, letterSpacing, symbolColor, symbolPaths, symbolCurve]);

  const reset = () => {
    setWeight(DEFAULT_TWEAKS.weight);
    setLetterSpacing(DEFAULT_TWEAKS.letterSpacing);
    setSymbolScale(DEFAULT_TWEAKS.symbolScale);
    setSymbolGap(DEFAULT_TWEAKS.symbolGap);
    setFillMode(DEFAULT_TWEAKS.fillMode);
    setColor(primary?.hex || DEFAULT_TWEAKS.color);
    setColorDirty(false);
    setSymbolColor(primary?.hex || DEFAULT_TWEAKS.color);
    setSymbolColorDirty(false);
    setOrientation(DEFAULT_TWEAKS.orientation);
    setFont(mode === 'en' ? 'Montserrat' : 'Black Han Sans');
  };

  return (
    <div style={shell.page}>
      <div style={shell.frame}>
        <StepRail current={4} onSelect={onSelectStep} />
        <main style={shell.content}>
          <div style={shell.scroll}>
            {/* header */}
            <header style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
                4단계 — 글꼴 고르기
              </h1>
              <p style={{ margin: '8px 0 0', color: '#6b6f6e', fontSize: 13.5, lineHeight: 1.65 }}>
                심볼에 브랜드명 글자를 붙인 모습을 직접 맞춥니다. 글꼴·굵기·글자 간격·심볼 크기·간격·글자색은 고른 두 시안에 똑같이 적용되고, 아래에 2개가 같은 설정으로 나란히 미리보기됩니다. 이대로 제안서에 들어갑니다. (제안서는 가로형)
              </p>
            </header>

            {/* brand label toggle */}
            <div style={s4.brandRow}>
              <span style={s4.brandRowLabel}>브랜드명 표기</span>
              <S4Segment
                options={[
                  { value: 'kr', label: `국문 · ${brandKo || '(미입력)'}` },
                  { value: 'en', label: `영문 · ${brandEn || '(미입력)'}` },
                ]}
                value={mode}
                onChange={setMode}
                size="sm"
              />
              <span style={s4.brandRowNote}>「」 칸을 바꾸면 글꼴 목록이 그 글자에 맞게 다시 채워집니다.</span>
            </div>

            {/* font categories */}
            <section style={{ marginTop: 14 }}>
              {Object.entries(fontMap).map(([category, list]) => (
                <div key={category} style={{ marginBottom: 10 }}>
                  <div style={s4.catLabel}>{category}</div>
                  <div style={s4.chipWrap}>
                    {list.map(name => (
                      <FontChip
                        key={name}
                        name={name}
                        label={FONT_LABELS[name] || name}
                        selected={font === name}
                        onSelect={()=>setFont(name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* preview + controls */}
            <section style={s4.previewSection}>
              <div style={s4.previewCol}>
                {hasPicks ? (
                  <div style={s4.previewGrid}>
                    {pickedItems.map((it, i) => (
                      <Preview key={it.id} index={i} picked={it} brandText={brandText} tweaks={tweaks} />
                    ))}
                  </div>
                ) : (
                  <div style={s4.noPicks}>
                    3단계에서 시안을 한 개 이상 「담기」 해주세요.
                  </div>
                )}

                {/* orientation + reset (below previews, same column) */}
                <div style={s4.orientRow}>
                  <S4Segment
                    options={[
                      { value: 'horizontal', label: '가로형' },
                      { value: 'stacked',    label: '적층형' },
                    ]}
                    value={orientation}
                    onChange={setOrientation}
                    size="sm"
                  />
                  <button type="button" onClick={reset} style={s4.resetBtn}>
                    <span style={{ marginRight: 6 }}>↺</span> 초기화
                  </button>
                </div>
              </div>

              {/* right column: controls */}
              <aside style={s4.ctrlCol}>
                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlLabel}>굵기</div>
                  {isSingleWeight ? (
                    <div style={s4.ctrlSingle}>Regular (이 글꼴은 굵기 한 종류)</div>
                  ) : (
                    <S4Segment
                      options={[
                        { value: 400, label: 'Regular' },
                        { value: 500, label: 'Medium' },
                        { value: 600, label: 'SemiBold' },
                        { value: 700, label: 'Bold' },
                      ]}
                      value={weight}
                      onChange={setWeight}
                      size="sm"
                      wrap
                    />
                  )}
                </div>

                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlRow}>
                    <span style={s4.ctrlLabel}>글자 간격</span>
                    <span style={s4.ctrlValue}>{letterSpacing}px</span>
                  </div>
                  <S4Slider value={letterSpacing} onChange={setLetterSpacing} min={-5} max={12} step={0.5} format={(v)=>`${v}px`} />
                </div>

                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlRow}>
                    <span style={s4.ctrlLabel}>심볼 크기 <span style={{ color:'#9a9d97', fontWeight:400 }}>(브랜드명 대비)</span></span>
                    <span style={s4.ctrlValue}>{symbolScale}%</span>
                  </div>
                  <S4Slider value={symbolScale} onChange={setSymbolScale} min={100} max={250} step={1} format={(v)=>`${v}%`} />
                </div>

                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlRow}>
                    <span style={s4.ctrlLabel}>심볼·글자 간격</span>
                    <span style={s4.ctrlValue}>{symbolGap}%</span>
                  </div>
                  <S4Slider value={symbolGap} onChange={setSymbolGap} min={-130} max={15} step={1} format={(v)=>`${v}%`} />
                </div>

                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlLabel}>심볼 채움</div>
                  <S4Segment
                    options={[
                      { value: 'gradient', label: '그라데이션' },
                      { value: 'solid',    label: '단색' },
                    ]}
                    value={fillMode}
                    onChange={setFillMode}
                    size="sm"
                  />
                  <div style={s4.ctrlHint}>
                    {fillMode === 'gradient'
                      ? '단색 심볼은 같은 색 그라데이션으로 완성도를 높입니다.'
                      : '단색일 때 심볼 색은 글자 색과 따로 정할 수 있어요.'}
                  </div>
                </div>

                {fillMode === 'solid' && (
                  <div style={s4.ctrlGroup}>
                    <div style={s4.ctrlLabel}>심볼 색 <span style={{ color:'#9a9d97', fontWeight:400 }}>(단색)</span></div>
                    <div style={s4.colorInput}>
                      <label style={{ position: 'relative', cursor: 'pointer' }}>
                        <span aria-hidden style={{
                          display:'inline-block', width: 22, height: 22, borderRadius: 5,
                          background: symbolColor, border: '1px solid rgba(0,0,0,0.1)',
                        }} />
                        <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(symbolColor||'') ? symbolColor : '#000000'}
                          onChange={(e)=>setSymbolColorUser(e.target.value.toUpperCase())}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                      </label>
                      <input
                        value={symbolColor}
                        onChange={(e)=>{
                          let v = e.target.value.toUpperCase();
                          if (v && !v.startsWith('#')) v = '#' + v.replace(/^#+/, '');
                          setSymbolColorUser(v);
                        }}
                        style={s4.colorHex}
                      />
                    </div>
                    <button type="button" onClick={()=>setSymbolColorUser(color)} style={s4.linkBtn}>글자 색과 동일하게</button>
                  </div>
                )}

                <div style={s4.ctrlGroup}>
                  <div style={s4.ctrlLabel}>글자 색</div>
                  <div style={s4.colorInput}>
                    <label style={{ position: 'relative', cursor: 'pointer' }}>
                      <span aria-hidden style={{
                        display:'inline-block', width: 22, height: 22, borderRadius: 5,
                        background: color, border: '1px solid rgba(0,0,0,0.1)',
                      }} />
                      <input type="color" value={color} onChange={(e)=>setColorUser(e.target.value.toUpperCase())}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </label>
                    <input
                      value={color}
                      onChange={(e)=>{
                        let v = e.target.value.toUpperCase();
                        if (v && !v.startsWith('#')) v = '#' + v.replace(/^#+/, '');
                        setColorUser(v);
                      }}
                      style={s4.colorHex}
                    />
                  </div>
                </div>
              </aside>
            </section>

            {/* (4-2 심볼 다듬기 편집기는 5단계로 이동됨) */}

            {/* (4-3 목업 적용은 5단계로 이동됨) */}

            <div style={{ height: 32 }} />
          </div>

          <footer style={footerStyle.bar}>
            <button type="button" style={footerStyle.ghost} onClick={onBack}>이전</button>
            <button type="button" onClick={onNext}
              disabled={!hasPicks}
              style={{
                ...footerStyle.primary,
                opacity: hasPicks ? 1 : 0.5,
                cursor: hasPicks ? 'pointer' : 'not-allowed',
              }}>
              <Check size={12} />
              <span style={{ margin: '0 6px 0 6px' }}>이 설정으로 제안서 만들기</span>
              <span aria-hidden>→</span>
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

const s4 = {
  brandRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: '#f6f7f4',
    padding: '8px 12px',
    borderRadius: 10,
    flexWrap: 'wrap',
  },
  brandRowLabel: { fontSize: 13, fontWeight: 600, color: '#2a2c2c' },
  brandRowNote: { fontSize: 12, color: '#7a7e79' },

  catLabel: { fontSize: 11.5, color: '#7a7e79', marginBottom: 5, fontWeight: 500 },
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  chip: {
    display: 'inline-flex', alignItems: 'baseline',
    padding: '5px 10px',
    border: '1px solid #dcdedb',
    borderRadius: 7,
    background: '#fff',
    cursor: 'pointer',
    transition: 'box-shadow 80ms ease, border-color 80ms ease',
  },

  previewSection: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 280px',
    gap: 22,
    marginTop: 12,
    alignItems: 'start',
  },
  previewCol: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 14,
  },
  previewCard: {
    colorScheme: 'light',
    position: 'relative',
    background: '#fff',
    border: '1px solid #e2e4e0',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 150,
  },
  previewTag: {
    position: 'absolute', top: 10, left: 12,
    fontSize: 11.5, color: '#7a7e79', fontWeight: 500, letterSpacing: 0,
  },
  previewInner: {
    padding: '36px 22px 28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 150,
  },
  noPicks: {
    padding: '40px 16px',
    background: '#fff5f5',
    border: '2px dashed #e94545',
    borderRadius: 12,
    textAlign: 'center',
    color: '#e94545',
    fontSize: 13,
    fontWeight: 600,
  },

  orientRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginTop: 4,
  },
  resetBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#5a5e5a', fontSize: 13,
    display: 'inline-flex', alignItems: 'center',
    padding: '6px 10px',
  },

  ctrlCol: {
    display: 'flex', flexDirection: 'column', gap: 18,
    paddingLeft: 6,
  },
  ctrlGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  ctrlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  ctrlLabel: { fontSize: 13, fontWeight: 600, color: '#2a2c2c' },
  ctrlValue: { fontSize: 12.5, color: '#7a7e79', fontVariantNumeric: 'tabular-nums' },
  ctrlSingle: { fontSize: 12.5, color: '#7a7e79' },
  ctrlHint: { fontSize: 11.5, color: '#9a9d97', lineHeight: 1.5, marginTop: 4 },

  sliderRow: { display: 'flex', alignItems: 'center', gap: 0 },
  range: {
    flex: 1, height: 4, appearance: 'none', WebkitAppearance: 'none',
    background: 'transparent', cursor: 'pointer', margin: 0,
  },
  sliderValue: { display: 'none' },

  segment: {
    display: 'inline-flex', gap: 4,
    padding: 3,
    background: '#eef0eb',
    borderRadius: 8,
    border: '1px solid #e2e4e0',
  },
  segmentBtn: {
    border: '1px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13,
    transition: 'background 80ms ease, color 80ms ease, border-color 80ms ease',
  },

  colorInput: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid #d3d6d2', borderRadius: 8,
    padding: '7px 10px', background: '#fff',
  },
  colorHex: {
    flex: 1, minWidth: 0,
    border: 'none', outline: 'none', background: 'transparent',
    fontSize: 13.5, color: '#2a2c2c',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  linkBtn: {
    alignSelf: 'flex-start', marginTop: 2,
    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
    color: '#6b6f6e', fontSize: 11.5, textDecoration: 'underline',
    textDecorationColor: '#c9ccc7', textUnderlineOffset: 3, fontFamily: 'inherit',
  },
};

/* range thumb styles (injected once) */
if (!document.getElementById('__s4_range_css')) {
  const css = document.createElement('style');
  css.id = '__s4_range_css';
  css.textContent = `
    input[type=range]{ background: linear-gradient(to right, #111212 0%, #111212 var(--p,50%), #d3d6d2 var(--p,50%), #d3d6d2 100%); height:4px; border-radius:999px; }
    input[type=range]::-webkit-slider-runnable-track{ height:4px; background: transparent; border-radius:999px; }
    input[type=range]::-moz-range-track{ height:4px; background: transparent; border-radius:999px; }
    input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:50%; background:#fff; border:1.5px solid #111212; margin-top:-7px; box-shadow:0 1px 2px rgba(0,0,0,0.12); cursor:pointer; }
    input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; background:#fff; border:1.5px solid #111212; box-shadow:0 1px 2px rgba(0,0,0,0.12); cursor:pointer; }
  `;
  document.head.appendChild(css);
}

/* paint slider fill via JS (CSS custom prop) — runs whenever range value changes */
document.addEventListener('input', (e) => {
  if (e.target && e.target.matches && e.target.matches('input[type=range]')) {
    const min = Number(e.target.min || 0);
    const max = Number(e.target.max || 100);
    const v = Number(e.target.value);
    const p = ((v - min) / (max - min)) * 100;
    e.target.style.setProperty('--p', p + '%');
  }
}, true);
/* also paint on initial mount via MutationObserver */
const __s4Obs = new MutationObserver(() => {
  document.querySelectorAll('input[type=range]').forEach(el => {
    if (!el.dataset.__painted) {
      el.dataset.__painted = '1';
      const min = Number(el.min || 0), max = Number(el.max || 100), v = Number(el.value);
      const p = ((v - min) / (max - min)) * 100;
      el.style.setProperty('--p', p + '%');
    }
  });
});
__s4Obs.observe(document.body, { childList: true, subtree: true });

window.Step4View = Step4View;
})();
