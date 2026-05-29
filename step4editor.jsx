/* Step 4 — 심볼 다듬기 (점 편집 + 자유 변형). Depends on globals: React, CANDIDATES, LogoA-D, Check */

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  /* Initial polygons in viewBox 0..120 — simplified silhouettes */
  const INITIAL_PATHS = {
    A: [{ x: 60, y: 14 }, { x: 74, y: 30 }, { x: 78, y: 50 }, { x: 74, y: 72 }, { x: 78, y: 90 }, { x: 60, y: 82 }, { x: 42, y: 90 }, { x: 46, y: 72 }, { x: 42, y: 50 }, { x: 46, y: 30 }],
    B: [{ x: 96, y: 22 }, { x: 88, y: 44 }, { x: 74, y: 60 }, { x: 58, y: 76 }, { x: 36, y: 92 }, { x: 22, y: 96 }, { x: 30, y: 76 }, { x: 42, y: 60 }, { x: 58, y: 44 }, { x: 74, y: 30 }],
    C: [{ x: 98, y: 22 }, { x: 98, y: 46 }, { x: 82, y: 46 }, { x: 82, y: 62 }, { x: 60, y: 62 }, { x: 60, y: 80 }, { x: 34, y: 80 }, { x: 34, y: 62 }, { x: 76, y: 22 }],
    D: [{ x: 60, y: 12 }, { x: 78, y: 34 }, { x: 90, y: 56 }, { x: 88, y: 78 }, { x: 74, y: 92 }, { x: 60, y: 98 }, { x: 46, y: 92 }, { x: 32, y: 78 }, { x: 30, y: 56 }, { x: 42, y: 34 }]
  };
  const deepClone = (o) => JSON.parse(JSON.stringify(o));

  /* check whether a path differs from its initial — used by mockups/previews
     to decide between rendering the original Logo SVG and the edited polygon */
  function isPathEdited(id, nodes) {
    const init = INITIAL_PATHS[id];
    if (!init || !nodes || init.length !== nodes.length) return Boolean(nodes);
    for (let i = 0; i < init.length; i++) {
      if (init[i].x !== nodes[i].x || init[i].y !== nodes[i].y) return true;
    }
    return false;
  }

  /* expose to other modules (Preview cards, mockup composites) */
  window.SYMBOL_INITIAL_PATHS = INITIAL_PATHS;
  window.isSymbolPathEdited = isPathEdited;

  /* Build SVG path d from polygon nodes — curve mode uses Catmull-Rom→Bezier */
  function buildD(nodes, curve) {
    if (!nodes || nodes.length < 3) return '';
    if (!curve) {
      return 'M ' + nodes.map((n) => `${n.x} ${n.y}`).join(' L ') + ' Z';
    }
    const n = nodes.length;
    let d = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 0; i < n; i++) {
      const p0 = nodes[(i - 1 + n) % n];
      const p1 = nodes[i];
      const p2 = nodes[(i + 1) % n];
      const p3 = nodes[(i + 2) % n];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x} ${p2.y}`;
    }
    return d + ' Z';
  }
  window.symbolBuildD = buildD;

  function getBBox(nodes) {
    if (!nodes || !nodes.length) return null;
    let minX = Infinity,minY = Infinity,maxX = -Infinity,maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;if (n.y > maxY) maxY = n.y;
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /* ---------- canvas pieces ---------- */
  function CheckerBg() {
    return (
      <g>
      <defs>
        <pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#fff" />
          <rect width="8" height="8" fill="#f1f2ef" />
          <rect x="8" y="8" width="8" height="8" fill="#f1f2ef" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="120" height="120" fill="url(#checker)" />
    </g>);

  }
  function Grid({ count }) {
    const step = 120 / count;
    const lines = [];
    for (let i = 1; i < count; i++) {
      const v = i * step;
      lines.push(<line key={'v' + i} x1={v} y1={0} x2={v} y2={120} stroke="#dde0d8" strokeWidth="0.15" />);
      lines.push(<line key={'h' + i} x1={0} y1={v} x2={120} y2={v} stroke="#dde0d8" strokeWidth="0.15" />);
    }
    return <g pointerEvents="none">{lines}</g>;
  }

  /* ---------- main ---------- */
  function SymbolEditor({ picked, initialId, color, fillMode, onClose, pathsState, setPathsState, curveState, setCurveState }) {
    const { CANDIDATES } = window;
    const pickedItems = (picked || []).map((id) => CANDIDATES.find((c) => c.id === id)).filter(Boolean);

    const [selectedId, setSelectedId] = useState((initialId && (picked || []).includes(initialId)) ? initialId : (picked && picked[0] || 'A'));
    const [mode, setMode] = useState('points'); // 'select' | 'points' | 'transform'
    /* fall back to internal state when uncontrolled (keeps standalone usage working) */
    const [internalCurve, setInternalCurve] = useState(true);
    const [internalPaths, setInternalPaths] = useState(() => deepClone(INITIAL_PATHS));
    const curve = curveState !== undefined ? curveState : internalCurve;
    const setCurve = setCurveState || setInternalCurve;
    const paths = pathsState || internalPaths;
    const setPaths = setPathsState || setInternalPaths;

    const [snap, setSnap] = useState(true);
    const [mirror, setMirror] = useState(false);
    const [gridCount, setGridCount] = useState(30);
    const [selectedNode, setSelectedNode] = useState(null);
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    /* keep selected within range if picked array shrinks */
    useEffect(() => {
      if (picked && picked.length && !picked.includes(selectedId)) {
        setSelectedId(picked[0]);
        setSelectedNode(null);
      }
    }, [picked, selectedId]);

    const currentNodes = paths[selectedId] || [];

    const pushHistory = useCallback(() => {
      setHistory((h) => [...h, deepClone(paths)]);
      setFuture([]);
    }, [paths]);

    const undo = () => {
      if (!history.length) return;
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setFuture((f) => [deepClone(paths), ...f]);
      setPaths(prev);
    };
    const redo = () => {
      if (!future.length) return;
      const next = future[0];
      setFuture(future.slice(1));
      setHistory((h) => [...h, deepClone(paths)]);
      setPaths(next);
    };
    const reset = () => {
      pushHistory();
      /* reset ONLY the symbol currently being viewed — keep other picked 시안 edits intact */
      setPaths((p) => ({ ...p, [selectedId]: deepClone(INITIAL_PATHS[selectedId]) }));
      setSelectedNode(null);
    };

    /* svg <-> screen coords */
    const svgRef = useRef(null);
    const ev2svg = (e) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 120;
      const y = (e.clientY - r.top) / r.height * 120;
      return { x, y };
    };
    const snapVal = (v) => {
      if (!snap) return Math.round(v * 100) / 100;
      const step = 120 / gridCount;
      return Math.round(v / step) * step;
    };
    const clamp = (v) => Math.max(0, Math.min(120, v));

    /* drag state ref for smoothness */
    const dragRef = useRef(null);
    const rafRef = useRef(null);

    const onPointerDownNode = (e, idx) => {
      e.stopPropagation();
      try {e.currentTarget.setPointerCapture(e.pointerId);} catch {}
      pushHistory();
      setSelectedNode(idx);
      dragRef.current = { kind: 'node', idx };
    };

    const onPointerDownBBoxHandle = (e, handle) => {
      e.stopPropagation();
      try {e.currentTarget.setPointerCapture(e.pointerId);} catch {}
      pushHistory();
      const bb = getBBox(currentNodes);
      const start = ev2svg(e);
      dragRef.current = { kind: 'bbox', handle, bb, startNodes: currentNodes.map((n) => ({ ...n })), startX: start.x, startY: start.y };
    };

    const onPointerDownBBoxMove = (e) => {
      e.stopPropagation();
      try {e.currentTarget.setPointerCapture(e.pointerId);} catch {}
      pushHistory();
      const start = ev2svg(e);
      dragRef.current = { kind: 'move', startNodes: currentNodes.map((n) => ({ ...n })), startX: start.x, startY: start.y };
    };

    const applyDrag = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cur = ev2svg(e);

      if (drag.kind === 'node') {
        let x = snapVal(clamp(cur.x));
        let y = snapVal(clamp(cur.y));
        const nodes = currentNodes.map((n) => ({ ...n }));
        nodes[drag.idx] = { x, y };
        if (mirror) {
          // mirror across vertical center (60)
          const mirX = clamp(120 - x);
          // find node with closest mirrored position in original
          const orig = INITIAL_PATHS[selectedId];
          if (orig && orig[drag.idx]) {
            let bestIdx = -1,bestDist = Infinity;
            orig.forEach((p, i) => {
              if (i === drag.idx) return;
              const tx = 120 - orig[drag.idx].x;
              const ty = orig[drag.idx].y;
              const d2 = (p.x - tx) * (p.x - tx) + (p.y - ty) * (p.y - ty);
              if (d2 < bestDist) {bestDist = d2;bestIdx = i;}
            });
            if (bestIdx >= 0 && bestDist < 400) {
              nodes[bestIdx] = { x: mirX, y };
            }
          }
        }
        setPaths((p) => ({ ...p, [selectedId]: nodes }));
      } else if (drag.kind === 'move') {
        const dx = cur.x - drag.startX;
        const dy = cur.y - drag.startY;
        const nodes = drag.startNodes.map((n) => ({ x: clamp(snapVal(n.x + dx)), y: clamp(snapVal(n.y + dy)) }));
        setPaths((p) => ({ ...p, [selectedId]: nodes }));
      } else if (drag.kind === 'bbox') {
        const { handle, bb, startNodes, startX, startY } = drag;
        // determine new bbox by adjusting one side
        let nx = bb.x,ny = bb.y,nw = bb.w,nh = bb.h;
        const dx = cur.x - startX;
        const dy = cur.y - startY;
        // handle codes: nw, n, ne, e, se, s, sw, w
        if (handle.includes('w')) {nx = bb.x + dx;nw = bb.w - dx;}
        if (handle.includes('e')) {nw = bb.w + dx;}
        if (handle.includes('n')) {ny = bb.y + dy;nh = bb.h - dy;}
        if (handle.includes('s')) {nh = bb.h + dy;}
        if (nw < 8) {nw = 8;if (handle.includes('w')) nx = bb.x + bb.w - 8;}
        if (nh < 8) {nh = 8;if (handle.includes('n')) ny = bb.y + bb.h - 8;}
        // map original nodes from old bbox to new bbox
        const sx = nw / bb.w;
        const sy = nh / bb.h;
        const nodes = startNodes.map((n) => ({
          x: clamp(snapVal(nx + (n.x - bb.x) * sx)),
          y: clamp(snapVal(ny + (n.y - bb.y) * sy))
        }));
        setPaths((p) => ({ ...p, [selectedId]: nodes }));
      }
    };

    const onPointerMove = (e) => {
      if (!dragRef.current) return;
      applyDrag({ clientX: e.clientX, clientY: e.clientY });
    };
    const onPointerUp = () => {
      dragRef.current = null;
      if (rafRef.current) {cancelAnimationFrame(rafRef.current);rafRef.current = null;}
    };

    /* add / delete point (between selected and next) */
    const addPoint = () => {
      if (!currentNodes.length) return;
      const idx = selectedNode != null ? selectedNode : 0;
      const next = (idx + 1) % currentNodes.length;
      const a = currentNodes[idx],b = currentNodes[next];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pushHistory();
      const nodes = [...currentNodes.slice(0, idx + 1), mid, ...currentNodes.slice(idx + 1)];
      setPaths((p) => ({ ...p, [selectedId]: nodes }));
      setSelectedNode(idx + 1);
    };
    const deletePoint = () => {
      if (selectedNode == null || currentNodes.length <= 3) return;
      pushHistory();
      const nodes = currentNodes.filter((_, i) => i !== selectedNode);
      setPaths((p) => ({ ...p, [selectedId]: nodes }));
      setSelectedNode(null);
    };
    const simplify = () => {
      if (currentNodes.length <= 6) return;
      pushHistory();
      // keep every other node
      const nodes = currentNodes.filter((_, i) => i % 2 === 0);
      setPaths((p) => ({ ...p, [selectedId]: nodes }));
      setSelectedNode(null);
    };

    /* coord edit */
    const setNodeCoord = (axis, val) => {
      if (selectedNode == null) return;
      pushHistory();
      const nodes = currentNodes.map((n, i) => i === selectedNode ? { ...n, [axis]: clamp(Number(val)) } : n);
      setPaths((p) => ({ ...p, [selectedId]: nodes }));
    };

    const bbox = useMemo(() => getBBox(currentNodes), [currentNodes]);
    const isPointMode = mode === 'points';
    const isFreeMode = mode === 'transform';
    const isSelectMode = mode === 'select';

    const selNode = selectedNode != null ? currentNodes[selectedNode] : null;

    return (
      <section style={ed.section}>
      <header style={ed.header}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={ed.title}>시안 {selectedId} · 심볼 다듬기</h2>
          <span style={ed.subtitle}>(재생성 없이 형태까지 수정 · 원본 보존)</span>
        </div>
      </header>

      <div style={ed.tabBar}>
        <div style={ed.tabs}>
          {[
            { v: 'select', label: '선택·색' },
            { v: 'points', label: '점 편집(형태)' },
            { v: 'transform', label: '자유 변형' }].
            map((t) =>
            <button key={t.v} type="button" onClick={() => {setMode(t.v);setSelectedNode(null);}}
            style={{
              ...ed.tabBtn,
              background: mode === t.v ? '#fff' : 'transparent',
              borderColor: mode === t.v ? '#111212' : 'transparent',
              color: mode === t.v ? '#111212' : '#5a5e5a',
              fontWeight: mode === t.v ? 600 : 500
            }}>{t.label}</button>
            )}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={undo} disabled={!history.length} style={ed.iconBtn} title="실행 취소">↶</button>
        <button type="button" onClick={redo} disabled={!future.length} style={ed.iconBtn} title="다시 실행">↷</button>
        <button type="button" onClick={reset} style={ed.iconBtnText}>↺ 초기화</button>
      </div>

      <div style={ed.body}>
        {/* canvas column */}
        <div style={ed.canvasCol}>
          <div style={ed.canvasWrap}>
            <svg
                ref={svgRef}
                viewBox="0 0 120 120"
                preserveAspectRatio="xMidYMid meet"
                style={ed.canvas}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onPointerDown={(e) => {if (isPointMode) setSelectedNode(null);}}>
                
              <CheckerBg />
              {(isPointMode || isFreeMode) && <Grid count={gridCount} />}

              {/* shape */}
              <defs>
                <linearGradient id="edFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a5dc7" />
                  <stop offset="100%" stopColor={color} />
                </linearGradient>
              </defs>
              <path
                  d={buildD(currentNodes, curve)}
                  fill={fillMode === 'solid' ? color : 'url(#edFill)'}
                  stroke="none" />
                

              {/* free-transform bbox + handles */}
              {isFreeMode && bbox &&
                <FreeBox bbox={bbox} onMove={onPointerDownBBoxMove} onHandle={onPointerDownBBoxHandle} />
                }

              {/* point handles */}
              {isPointMode && currentNodes.map((n, i) =>
                <g key={i}>
                  <circle
                    cx={n.x} cy={n.y} r={selectedNode === i ? 2 : 1.5}
                    fill={selectedNode === i ? '#003894' : '#fff'}
                    stroke="#003894" strokeWidth={0.5}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    onPointerDown={(e) => onPointerDownNode(e, i)} />
                  
                </g>
                )}

              {/* mirror axis indicator */}
              {isPointMode && mirror &&
                <line x1="60" y1="0" x2="60" y2="120" stroke="#e94545" strokeWidth="0.25" strokeDasharray="2,2" pointerEvents="none" />
                }
            </svg>
          </div>

          {/* thumb row */}
          <div style={ed.thumbRow}>
            {pickedItems.map((it) => {
                const isActive = selectedId === it.id;
                const Logo = it.Logo;
                return (
                  <button key={it.id} type="button" onClick={() => {setSelectedId(it.id);setSelectedNode(null);}}
                  style={{ ...ed.thumb, borderColor: isActive ? '#111212' : '#dcdedb', boxShadow: isActive ? '0 0 0 2px #111212 inset' : 'none' }}>
                  <span style={ed.thumbBadge}>{it.id}</span>
                  <div style={{ width: 28, height: 28 }}>
                    <svg viewBox="0 0 120 120" width="100%" height="100%">
                      <path d={buildD(paths[it.id], curve)} fill={color} />
                    </svg>
                  </div>
                </button>);

              })}
          </div>
        </div>

        {/* controls column */}
        <aside style={ed.ctrlCol}>
          {isPointMode &&
            <div style={ed.ctrlGroup}>
              <div style={ed.ctrlIntro}>점 편집 — 점/핸들을 끌어 형태를 바꿉니다</div>
              <div style={ed.btnRow}>
                <button type="button" onClick={addPoint} style={ed.smBtn}><span style={ed.plus}>＋</span> 점 추가</button>
                <button type="button" onClick={deletePoint} disabled={selectedNode == null || currentNodes.length <= 3} style={ed.smBtn}><span style={ed.minus}>－</span> 점 삭제</button>
              </div>
              <div style={ed.btnRow}>
                <button type="button" onClick={() => {pushHistory();setCurve((c) => !c);}} style={ed.smBtn}>{curve ? '↪ 곡선/직선' : '⤴ 곡선/직선'}</button>
                <button type="button" onClick={simplify} style={ed.smBtn}>노드 줄이기</button>
              </div>
              <div style={ed.btnRow}>
                <button type="button" onClick={() => setSnap((s) => !s)} style={{ ...ed.toggleBtn, ...(snap ? ed.toggleOn : {}) }}>
                  <span style={{ marginRight: 6 }}>▦</span>그리드 스냅
                </button>
                <button type="button" onClick={() => setMirror((m) => !m)} style={{ ...ed.toggleBtn, ...(mirror ? ed.toggleOn : {}) }}>
                  <span style={{ marginRight: 6 }}>⇿</span>좌우 대칭
                </button>
              </div>

              <div style={{ ...ed.fieldRow, marginTop: 4 }}>
                <div style={ed.field}>
                  <label style={ed.fieldLabel}>X</label>
                  <input type="number" value={selNode ? Math.round(selNode.x) : ''} disabled={!selNode}
                  onChange={(e) => setNodeCoord('x', e.target.value)} style={ed.fieldInput} />
                </div>
                <div style={ed.field}>
                  <label style={ed.fieldLabel}>Y</label>
                  <input type="number" value={selNode ? Math.round(selNode.y) : ''} disabled={!selNode}
                  onChange={(e) => setNodeCoord('y', e.target.value)} style={ed.fieldInput} />
                </div>
              </div>

              <div style={ed.ctrlGroup2}>
                <div style={ed.ctrlRow}>
                  <span style={ed.ctrlLabel}>그리드 칸 수</span>
                  <span style={ed.ctrlValue}>{gridCount}칸</span>
                </div>
                <input type="range" min={20} max={60} step={1} value={gridCount}
                onChange={(e) => setGridCount(Number(e.target.value))} className="ed-range" />
              </div>

              <p style={ed.helpText}>
                점을 클릭하면 곡선 핸들(파란 사각점)이 보입니다. 점/핸들을 끌면 형태가 바뀝니다. Shift(또는 Ctrl/⌘)+클릭으로 여러 점을 골라 정렬·등분할 수 있고, 수치 칸으로 좌표를 직접 입력합니다. "좌우 대칭"은 켜진 한 쪽이 늘 반대편으로 따라옵니다. 다른 점·중심선·그리드에 가까워지면 분홍 가이드와 함께 딱 달라붙어요.
              </p>
            </div>
            }

          {isFreeMode &&
            <div style={ed.ctrlGroup}>
              <div style={ed.ctrlIntro}>자유 변형 — 모서리/변을 끌어 비율·크기를 바꿉니다</div>
              <div style={ed.btnRow}>
                <button type="button" onClick={() => setSnap((s) => !s)} style={{ ...ed.toggleBtn, ...(snap ? ed.toggleOn : {}) }}>
                  <span style={{ marginRight: 6 }}>▦</span>그리드 스냅
                </button>
              </div>
              {bbox &&
              <div style={ed.fieldRow}>
                  <div style={ed.field}>
                    <label style={ed.fieldLabel}>너비</label>
                    <input type="number" value={Math.round(bbox.w)} readOnly style={ed.fieldInput} />
                  </div>
                  <div style={ed.field}>
                    <label style={ed.fieldLabel}>높이</label>
                    <input type="number" value={Math.round(bbox.h)} readOnly style={ed.fieldInput} />
                  </div>
                </div>
              }
              <div style={ed.ctrlGroup2}>
                <div style={ed.ctrlRow}>
                  <span style={ed.ctrlLabel}>그리드 칸 수</span>
                  <span style={ed.ctrlValue}>{gridCount}칸</span>
                </div>
                <input type="range" min={20} max={60} step={1} value={gridCount}
                onChange={(e) => setGridCount(Number(e.target.value))} className="ed-range" />
              </div>
              <p style={ed.helpText}>
                모서리(■)를 끌면 모양 비율을 자유롭게, 변(▭)을 끌면 한 방향만 늘립니다. 캔버스 중앙을 끌면 위치만 옮깁니다. 그리드 스냅이 켜져 있으면 격자에 딱 맞춰서 움직입니다.
              </p>
            </div>
            }

          {isSelectMode &&
            <div style={ed.ctrlGroup}>
              <div style={ed.ctrlIntro}>선택·색 — 색을 바꾸거나 그대로 둡니다</div>
              <p style={ed.helpText}>
                색은 윗쪽 <strong>글자 색</strong>과 항상 한 묶음으로 움직입니다. 여기서 바꾸면 글자 색도 함께 바뀝니다. (윗쪽에서 바꾸세요.)
              </p>
              <div style={{ ...ed.colorPreview, background: color }}>
                <span style={{
                  color: '#fff', mixBlendMode: 'difference', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12
                }}>{color}</span>
              </div>
            </div>
            }
        </aside>
      </div>
    </section>);

  }

  /* ---------- free-transform bbox ---------- */
  function FreeBox({ bbox, onMove, onHandle }) {
    const { x, y, w, h } = bbox;
    const handles = [
    { id: 'nw', cx: x, cy: y, cursor: 'nwse-resize' },
    { id: 'n', cx: x + w / 2, cy: y, cursor: 'ns-resize' },
    { id: 'ne', cx: x + w, cy: y, cursor: 'nesw-resize' },
    { id: 'e', cx: x + w, cy: y + h / 2, cursor: 'ew-resize' },
    { id: 'se', cx: x + w, cy: y + h, cursor: 'nwse-resize' },
    { id: 's', cx: x + w / 2, cy: y + h, cursor: 'ns-resize' },
    { id: 'sw', cx: x, cy: y + h, cursor: 'nesw-resize' },
    { id: 'w', cx: x, cy: y + h / 2, cursor: 'ew-resize' }];

    return (
      <g>
      <rect x={x} y={y} width={w} height={h} fill="rgba(0,56,148,0.06)" stroke="#003894" strokeWidth="0.4" strokeDasharray="1.5,1.2"
        style={{ cursor: 'move', touchAction: 'none' }} onPointerDown={onMove} />
      {handles.map((h) => {
          const isCorner = h.id.length === 2;
          return (
            <rect key={h.id} x={h.cx - 1.8} y={h.cy - 1.8} width={3.6} height={3.6}
            fill="#fff" stroke="#003894" strokeWidth={0.5}
            rx={isCorner ? 0 : 0.6}
            style={{ cursor: h.cursor, touchAction: 'none' }}
            onPointerDown={(e) => onHandle(e, h.id)} />);

        })}
    </g>);

  }

  /* ---------- styles ---------- */
  const ed = {
    section: {
      marginTop: 36,
      border: '1px solid #e2e4e0',
      borderRadius: 14,
      background: '#fff',
      overflow: 'hidden'
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px 12px'
    },
    title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#111212', letterSpacing: '-0.005em' },
    subtitle: { fontSize: 12, color: '#7a7e79' },
    closeBtn: {
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: '#6b6f6e', fontSize: 13, padding: '4px 6px'
    },

    tabBar: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      borderTop: '1px solid #f0f1ee', borderBottom: '1px solid #f0f1ee',
      background: '#fafaf8'
    },
    tabs: {
      display: 'inline-flex', gap: 3,
      padding: 3,
      background: '#eef0eb',
      borderRadius: 8,
      border: '1px solid #e2e4e0'
    },
    tabBtn: {
      padding: '7px 14px', fontSize: 13, cursor: 'pointer',
      border: '1px solid transparent', borderRadius: 6,
      fontFamily: 'inherit',
      transition: 'background 80ms ease, color 80ms ease'
    },
    iconBtn: {
      background: '#fff', border: '1px solid #d3d6d2', borderRadius: 6,
      padding: '5px 9px', cursor: 'pointer', fontSize: 14, color: '#2a2c2c'
    },
    iconBtnText: {
      background: '#fff', border: '1px solid #d3d6d2', borderRadius: 6,
      padding: '5px 10px', cursor: 'pointer', fontSize: 13, color: '#2a2c2c',
      display: 'inline-flex', alignItems: 'center', gap: 4
    },

    body: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 260px',
      gap: 18,
      padding: 18
    },
    canvasCol: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 },
    canvasWrap: {
      colorScheme: 'light',
      background: '#fff',
      border: '1px solid #e6e8e4',
      borderRadius: 10,
      overflow: 'hidden',
      aspectRatio: '1 / 1',
      maxWidth: 520
    },
    canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
    thumbRow: { display: 'flex', gap: 8 },
    thumb: {
      position: 'relative',
      width: 44, height: 44,
      border: '1px solid #dcdedb', borderRadius: 8,
      background: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 0
    },
    thumbBadge: {
      position: 'absolute', top: -6, left: -6,
      width: 16, height: 16, borderRadius: '50%',
      background: '#111212', color: '#fff', fontSize: 9, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    },

    ctrlCol: { display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 2 },
    ctrlGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
    ctrlGroup2: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
    ctrlIntro: { fontSize: 12.5, color: '#6b6f6e', lineHeight: 1.5 },
    ctrlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
    ctrlLabel: { fontSize: 13, fontWeight: 600, color: '#2a2c2c' },
    ctrlValue: { fontSize: 12.5, color: '#7a7e79', fontVariantNumeric: 'tabular-nums' },

    btnRow: { display: 'flex', gap: 6 },
    smBtn: {
      flex: 1, padding: '7px 10px',
      background: '#fff', border: '1px solid #d3d6d2', borderRadius: 7,
      fontSize: 12.5, color: '#2a2c2c', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontFamily: 'inherit'
    },
    toggleBtn: {
      flex: 1, padding: '7px 10px',
      background: '#fff', border: '1px solid #d3d6d2', borderRadius: 7,
      fontSize: 12.5, color: '#5a5e5a', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit'
    },
    toggleOn: {
      background: '#111212', color: '#fff', borderColor: '#111212'
    },
    plus: { fontWeight: 600 },
    minus: { fontWeight: 600 },

    fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
    field: { display: 'flex', alignItems: 'center', gap: 6 },
    fieldLabel: { fontSize: 12, color: '#7a7e79', width: 14 },
    fieldInput: {
      flex: 1, minWidth: 0,
      padding: '5px 8px', borderRadius: 6,
      border: '1px solid #d3d6d2', background: '#fff',
      fontSize: 13, color: '#2a2c2c', outline: 'none',
      fontFamily: 'ui-monospace,Menlo,monospace'
    },

    helpText: {
      margin: '8px 0 0', fontSize: 11.5, color: '#9a9d97', lineHeight: 1.55
    },
    colorPreview: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 56, borderRadius: 8,
      border: '1px solid rgba(0,0,0,0.05)'
    },

    footerBar: {
      borderTop: '1px solid #f0f1ee',
      display: 'flex', justifyContent: 'space-between',
      padding: '12px 18px',
      background: '#fff'
    },
    footerGhost: {
      padding: '8px 14px', background: '#fff', border: '1px solid #d3d6d2', borderRadius: 7,
      fontSize: 13, color: '#2a2c2c', cursor: 'pointer', fontFamily: 'inherit'
    },
    footerPrimary: {
      padding: '8px 16px', background: '#111212', color: '#fff', border: '1px solid #111212', borderRadius: 7,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center'
    }
  };

  /* range styling specific to editor (same look as step 4) */
  if (!document.getElementById('__ed_range_css')) {
    const css = document.createElement('style');
    css.id = '__ed_range_css';
    css.textContent = `
    .ed-range { -webkit-appearance:none; appearance:none; background:#d3d6d2; height:4px; border-radius:999px; cursor:pointer; }
    .ed-range::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#fff; border:1.5px solid #111212; box-shadow:0 1px 2px rgba(0,0,0,0.12); cursor:pointer; }
    .ed-range::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#fff; border:1.5px solid #111212; box-shadow:0 1px 2px rgba(0,0,0,0.12); cursor:pointer; }
  `;
    document.head.appendChild(css);
  }

  window.SymbolEditor = SymbolEditor;
})();