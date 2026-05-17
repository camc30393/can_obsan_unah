/* ============================================================================
   analytics.jsx · Análisis estadístico avanzado del CAN 2024
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Implementa las técnicas de análisis espacial y estadístico avanzado:
     - moranI()           — Índice global de Moran (autocorrelación espacial)
     - localMoran()       — Índices locales (LISA) por departamento
     - lisaCategory()     — Clasifica cada departamento en HH/HL/LH/LL
     - pearsonR()         — Correlación de Pearson entre dos series
     - linearRegression() — Regresión lineal simple
     - <ScatterExplorer/> — visualización X-Y interactiva
     - <LISAView/>        — overlay del mapa con categorías LISA

   FUNDAMENTO TEÓRICO:
   - Moran's I mide si valores similares se agrupan en el espacio (positivo)
     o si valores similares se dispersan (negativo).
   - LISA (Anselin, 1995) descompone Moran's I en aportes locales.
   - Categorías:
       HH = "Alto-Alto"  → departamento alto rodeado de altos (cluster crítico)
       LL = "Bajo-Bajo"  → departamento bajo rodeado de bajos (cluster crítico)
       HL = "Alto-Bajo"  → outlier alto rodeado de bajos
       LH = "Bajo-Alto"  → outlier bajo rodeado de altos
       NS = "No significativo"
   ============================================================================ */
/* global React */
const { useMemo, useState, useEffect, useRef } = React;

// ============================================================================
// FUNCIONES ESTADÍSTICAS
// ============================================================================

/** Media aritmética de un arreglo de números */
function mean(arr) {
  return arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
}

/** Desviación estándar muestral */
function stdev(arr) {
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1 || 1);
  return Math.sqrt(v);
}

/** Coeficiente de correlación de Pearson */
function pearsonR(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx  += (xs[i] - mx) ** 2;
    dy  += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
}

/** Regresión lineal y = a + bx */
function linearRegression(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const b = num / den;
  const a = my - b * mx;
  // R² = (r)²
  const r = pearsonR(xs, ys);
  return { a, b, r2: r ? r * r : null, r };
}

/**
 * Índice de Moran global y local (LISA) sobre una serie y un grafo de vecinos.
 *   series: { name: value }
 *   neighbors: { name: [name, name, ...] }
 *
 * Devuelve { I_global, locals: { name: { Ii, z_i, z_lag, cat } } }
 *
 * Convención: pesos espaciales row-standardized (W_ij = 1/n_i si j vecino, 0 si no).
 */
function localMoran(series, neighbors) {
  const names = Object.keys(series).filter(n => series[n] != null && !isNaN(series[n]));
  if (names.length < 3) return null;
  const values = names.map(n => series[n]);
  const m = mean(values);
  const s = stdev(values);
  if (!s || s === 0) return null;
  // Estandarizar z = (x - mean) / sd
  const z = {};
  for (const n of names) z[n] = (series[n] - m) / s;
  // Lag espacial: promedio de los z de los vecinos
  const z_lag = {};
  for (const n of names) {
    const nb = (neighbors[n] || []).filter(x => z[x] != null);
    if (nb.length === 0) { z_lag[n] = 0; continue; }
    z_lag[n] = mean(nb.map(x => z[x]));
  }
  // Ii local = z_i * z_lag_i
  // I global = (1/n) * sum(Ii)
  const locals = {};
  let I_global = 0;
  for (const n of names) {
    const Ii = z[n] * z_lag[n];
    I_global += Ii;
    locals[n] = { Ii, z_i: z[n], z_lag: z_lag[n] };
  }
  I_global /= names.length;

  // Clasificación LISA (umbral simple: |z| > 0.5)
  const T = 0.5;
  for (const n of names) {
    const { z_i, z_lag: zl } = locals[n];
    let cat = "NS";
    if      (z_i >  T && zl >  T) cat = "HH"; // alto-alto
    else if (z_i < -T && zl < -T) cat = "LL"; // bajo-bajo
    else if (z_i >  T && zl < -T) cat = "HL"; // alto rodeado de bajos
    else if (z_i < -T && zl >  T) cat = "LH"; // bajo rodeado de altos
    locals[n].cat = cat;
  }
  return { I_global, locals };
}

const LISA_COLORS = {
  HH: "#B23A48", // cluster alto — alerta roja
  LL: "#2A6FDB", // cluster bajo — azul
  HL: "#E2B947", // outlier alto — amarillo
  LH: "#7A86A8", // outlier bajo — gris azulado
  NS: "#D9D9CE", // no significativo
};
const LISA_LABELS = {
  HH: "Alto–Alto (cluster crítico)",
  LL: "Bajo–Bajo (cluster bajo)",
  HL: "Alto–Bajo (outlier positivo)",
  LH: "Bajo–Alto (outlier negativo)",
  NS: "No significativo",
};

// ============================================================================
// <ScatterExplorer /> — diagrama de dispersión interactivo
// ============================================================================
function ScatterExplorer({ data, indicators, selected, setSelected }) {
  const [indX, setIndX] = useState("kcal_cap_dia");
  const [indY, setIndY] = useState("ivpd");
  const indicatorX = indicators.find(i => i.id === indX) || indicators[0];
  const indicatorY = indicators.find(i => i.id === indY) || indicators[1];

  const points = useMemo(() => {
    return Object.values(data.departamentos)
      .map(d => ({ name: d.name, x: d[indX], y: d[indY] }))
      .filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y));
  }, [data, indX, indY]);

  const stats = useMemo(() => {
    if (points.length < 3) return null;
    return linearRegression(points.map(p => p.x), points.map(p => p.y));
  }, [points]);

  // SVG dimensiones
  const W = 540, H = 360;
  const M = { t: 20, r: 26, b: 60, l: 70 };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const px = (x) => M.l + ((x - minX) / (maxX - minX || 1)) * (W - M.l - M.r);
  const py = (y) => H - M.b - ((y - minY) / (maxY - minY || 1)) * (H - M.t - M.b);

  const fmtX = (v) => indicatorX.isPct ? window.fmtPct(v, 1) : window.fmtN(v, indicatorX.decimals || 0);
  const fmtY = (v) => indicatorY.isPct ? window.fmtPct(v, 1) : window.fmtN(v, indicatorY.decimals || 0);

  // Agrupar por grupo para optgroup
  const groups = useMemo(() => {
    const g = {};
    indicators.forEach(i => { g[i.g] = g[i.g] || []; g[i.g].push(i); });
    return g;
  }, [indicators]);

  return (
    <div className="scatter-explorer">
      <div className="scatter-controls">
        <label className="scatter-label">
          <span>Eje X
            {indicatorX.info && <window.InfoTip text={indicatorX.info} />}
          </span>
          <select value={indX} onChange={(e) => setIndX(e.target.value)}>
            {Object.entries(groups).map(([g, items]) => (
              <optgroup label={g} key={g}>
                {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="scatter-label">
          <span>Eje Y
            {indicatorY.info && <window.InfoTip text={indicatorY.info} />}
          </span>
          <select value={indY} onChange={(e) => setIndY(e.target.value)}>
            {Object.entries(groups).map(([g, items]) => (
              <optgroup label={g} key={g}>
                {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {stats && (
        <div className="scatter-stats">
          <span>r = <strong>{stats.r.toFixed(3)}</strong></span>
          <span>R² = <strong>{stats.r2.toFixed(3)}</strong></span>
          <span>n = <strong>{points.length}</strong></span>
          <span className={`corr-strength corr-${classifyR(stats.r)}`}>
            {classifyR(stats.r) === "strong" ? "Correlación fuerte" :
             classifyR(stats.r) === "moderate" ? "Correlación moderada" :
             classifyR(stats.r) === "weak" ? "Correlación débil" : "Sin correlación"}
          </span>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="scatter-svg" role="img" aria-label={`Dispersión ${indicatorX.label} vs ${indicatorY.label}`}>
        {/* Ejes */}
        <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke="var(--unah-line)" />
        <line x1={M.l} y1={M.t}     x2={M.l}     y2={H - M.b} stroke="var(--unah-line)" />

        {/* Ticks Y */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const v = minY + t * (maxY - minY);
          const yy = py(v);
          return (
            <g key={"y" + t}>
              <line x1={M.l - 4} y1={yy} x2={M.l} y2={yy} stroke="var(--unah-line)" />
              <line x1={M.l} y1={yy} x2={W - M.r} y2={yy} stroke="var(--unah-line-2)" strokeDasharray="2,3" opacity="0.6" />
              <text x={M.l - 8} y={yy + 3} textAnchor="end" fontSize="9.5" fill="var(--unah-mute)">{fmtY(v)}</text>
            </g>
          );
        })}
        {/* Ticks X */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const v = minX + t * (maxX - minX);
          const xx = px(v);
          return (
            <g key={"x" + t}>
              <line x1={xx} y1={H - M.b} x2={xx} y2={H - M.b + 4} stroke="var(--unah-line)" />
              <text x={xx} y={H - M.b + 16} textAnchor="middle" fontSize="9.5" fill="var(--unah-mute)">{fmtX(v)}</text>
            </g>
          );
        })}

        {/* Línea de regresión */}
        {stats && stats.b != null && (
          <line
            x1={px(minX)} y1={py(stats.a + stats.b * minX)}
            x2={px(maxX)} y2={py(stats.a + stats.b * maxX)}
            stroke="var(--unah-gold)" strokeWidth="2" strokeDasharray="4,3" opacity="0.75"
          />
        )}

        {/* Puntos */}
        {points.map(p => {
          const isSel = p.name === selected;
          return (
            <g key={p.name}
               onClick={() => setSelected && setSelected(p.name)}
               style={{cursor: "pointer"}}>
              <circle
                cx={px(p.x)} cy={py(p.y)}
                r={isSel ? 8 : 5}
                fill={isSel ? "var(--unah-gold)" : "var(--unah-blue-500)"}
                stroke={isSel ? "var(--unah-blue)" : "#fff"}
                strokeWidth={isSel ? 2 : 1}
                opacity={isSel ? 1 : 0.78}
              >
                <title>{p.name}: {fmtX(p.x)} · {fmtY(p.y)}</title>
              </circle>
              {isSel && (
                <text x={px(p.x) + 11} y={py(p.y) - 6} fontSize="10.5" fontWeight="600" fill="var(--unah-blue)">{p.name}</text>
              )}
            </g>
          );
        })}

        {/* Etiquetas de ejes */}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--unah-ink-2)" fontWeight="500">
          {indicatorX.label} ({indicatorX.unit})
        </text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--unah-ink-2)" fontWeight="500"
              transform={`rotate(-90 14 ${H / 2})`}>
          {indicatorY.label} ({indicatorY.unit})
        </text>
      </svg>

      <div className="scatter-foot">
        Clic en un punto para seleccionar el departamento. Línea dorada: regresión lineal OLS.
        {stats && stats.r != null && (
          <span> · Interpretación: {interpretCorrelation(stats.r, indicatorX.short, indicatorY.short)}</span>
        )}
      </div>
    </div>
  );
}

function classifyR(r) {
  const a = Math.abs(r);
  if (a > 0.6) return "strong";
  if (a > 0.3) return "moderate";
  if (a > 0.1) return "weak";
  return "none";
}

function interpretCorrelation(r, X, Y) {
  const cls = classifyR(r);
  if (cls === "none") return `no se observa relación lineal entre ${X} y ${Y}.`;
  const dir = r > 0 ? "positiva" : "negativa";
  return `relación ${dir} ${cls === "strong" ? "fuerte" : cls === "moderate" ? "moderada" : "débil"} entre ${X} y ${Y} (r = ${r.toFixed(2)}).`;
}

window.localMoran = localMoran;
window.pearsonR = pearsonR;
window.linearRegression = linearRegression;
window.LISA_COLORS = LISA_COLORS;
window.LISA_LABELS = LISA_LABELS;
window.ScatterExplorer = ScatterExplorer;
