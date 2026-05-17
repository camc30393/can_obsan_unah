/* ============================================================================
   tipologias.jsx · Análisis Multivariado (PCA + K-means)
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Implementa Análisis de Componentes Principales (PCA) y agrupamiento
   K-means para construir TIPOLOGÍAS de departamentos a partir de los
   indicadores SAN principales.

   FUNDAMENTO TEÓRICO:
   - PCA (Pearson, 1901; Hotelling, 1933) reduce un conjunto de variables
     correlacionadas a unos pocos "componentes" ortogonales. Permite
     visualizar 18 departamentos en 28 dimensiones sobre un plano 2D.
   - K-means (MacQueen, 1967) agrupa observaciones en k clusters
     minimizando la varianza intra-cluster.
   - El resultado son "perfiles productivos" — agrupaciones de
     departamentos que comparten patrones similares en SAN.

   VARIABLES UTILIZADAS (z-estandarizadas):
     - rar_calorica         (Disponibilidad calórica)
     - rar_proteica         (Disponibilidad proteica)
     - idp_shannon          (Diversificación)
     - ivpd                 (Vulnerabilidad productiva)
     - at_pct               (Asistencia técnica)
     - credito_pct          (Crédito)
     - maquinaria_pct       (Maquinaria)
     - pct_mujeres          (Equidad de género)
     - ha_por_productor     (Escala productiva)

   PROCEDIMIENTO:
     1. Estandarizar variables (z-score)
     2. Calcular matriz de covarianza
     3. Eigenvalores/vectores por método de iteración de potencia (power iteration)
     4. Proyectar departamentos sobre PC1 y PC2
     5. K-means sobre los puntos PC1-PC2 (k=4)
     6. Renderizar scatter con departamentos coloreados por cluster
   ============================================================================ */
/* global React */
const { useMemo, useState } = React;

// ─── Helpers algebraicos ────────────────────────────────────────────────
function mean(arr) { return arr.reduce((s, x) => s + x, 0) / arr.length; }
function stdev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}
function zScoreMatrix(X) {
  const n = X.length, p = X[0].length;
  const Z = Array.from({ length: n }, () => new Array(p));
  for (let j = 0; j < p; j++) {
    const col = X.map(row => row[j]);
    const m = mean(col);
    const s = stdev(col);
    for (let i = 0; i < n; i++) Z[i][j] = s > 0 ? (X[i][j] - m) / s : 0;
  }
  return Z;
}
// Matriz de covarianza de las filas de Z (estandarizada → matriz de correlación)
function covMatrix(Z) {
  const n = Z.length, p = Z[0].length;
  const C = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += Z[k][i] * Z[k][j];
      C[i][j] = s / (n - 1);
    }
  }
  return C;
}
// Multiplicación matriz·vector
function matVec(A, v) {
  const n = A.length, m = A[0].length;
  const r = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) r[i] += A[i][j] * v[j];
  }
  return r;
}
function vecNorm(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); }
function normalize(v) {
  const n = vecNorm(v);
  return n > 0 ? v.map(x => x / n) : v;
}
function dot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }

// Power iteration para encontrar el eigenvector dominante
function powerIteration(A, iters = 100) {
  const n = A.length;
  let v = new Array(n).fill(0).map(() => Math.random());
  v = normalize(v);
  for (let i = 0; i < iters; i++) v = normalize(matVec(A, v));
  const lambda = dot(v, matVec(A, v));
  return { vector: v, value: lambda };
}
// Deflación: remover componente del eigenvector dominante
function deflate(A, v, lambda) {
  const n = A.length;
  const B = A.map(row => row.slice());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i][j] -= lambda * v[i] * v[j];
    }
  }
  return B;
}

/**
 * PCA simple: devuelve los k primeros componentes principales.
 */
function pca(X, k = 2) {
  const Z = zScoreMatrix(X);
  const C = covMatrix(Z);
  const components = [];
  let Mk = C.map(r => r.slice());
  for (let i = 0; i < k; i++) {
    const { vector, value } = powerIteration(Mk);
    components.push({ vector, value });
    Mk = deflate(Mk, vector, value);
  }
  // Varianza total = traza de C (suma de la diagonal)
  const totalVar = C.reduce((s, row, i) => s + row[i], 0);
  // Proyectar cada observación
  const scores = Z.map(row => components.map(c => dot(row, c.vector)));
  return {
    components,
    scores,
    explainedRatio: components.map(c => c.value / totalVar),
  };
}

// ─── K-means clustering ──────────────────────────────────────────────────
function kmeans(points, k = 4, maxIter = 50) {
  const n = points.length, d = points[0].length;
  // Inicialización k-means++ simplificada
  let centroids = [points[Math.floor(Math.random() * n)].slice()];
  for (let i = 1; i < k; i++) {
    const dists = points.map(p => Math.min(...centroids.map(c =>
      c.reduce((s, x, idx) => s + (x - p[idx]) ** 2, 0))));
    const total = dists.reduce((s, d) => s + d, 0);
    let r = Math.random() * total;
    let pick = 0;
    for (let j = 0; j < n; j++) {
      r -= dists[j];
      if (r <= 0) { pick = j; break; }
    }
    centroids.push(points[pick].slice());
  }
  // Iterar
  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dd = points[i].reduce((s, x, j) => s + (x - centroids[c][j]) ** 2, 0);
        if (dd < bestD) { bestD = dd; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;
    // Recomputar centroides
    centroids = centroids.map((_, c) => {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length === 0) return centroids[c];
      return new Array(d).fill(0).map((_, j) =>
        members.reduce((s, p) => s + p[j], 0) / members.length);
    });
  }
  return { assignments, centroids };
}

// ─── Variables a usar ─────────────────────────────────────────────────────
const PCA_VARS = [
  { id: "rar_calorica",     label: "RAR cal." },
  { id: "rar_proteica",     label: "RAR prot." },
  { id: "idp_shannon",      label: "IDP" },
  { id: "ivpd",             label: "IVPD" },
  { id: "at_pct",           label: "Asist. téc." },
  { id: "credito_pct",      label: "Crédito" },
  { id: "maquinaria_pct",   label: "Maquinaria" },
  { id: "pct_mujeres",      label: "% Mujeres" },
  { id: "ha_por_productor", label: "ha/prod." },
];

const CLUSTER_COLORS = [
  "#00213D", // azul UNAH
  "#C8A415", // dorado
  "#0F766E", // verde SAN
  "#B23A48", // rojo SAN (vulnerabilidad)
];
const CLUSTER_NAMES = [
  "Tipología I",
  "Tipología II",
  "Tipología III",
  "Tipología IV",
];

// ─── Componente principal ────────────────────────────────────────────────
function TipologiasView({ data, selected, setSelected }) {
  const [k, setK] = useState(4);

  const result = useMemo(() => {
    // Filtrar departamentos con datos completos para todas las variables
    const validDeps = Object.entries(data.departamentos)
      .filter(([_, d]) =>
        PCA_VARS.every(v => d[v.id] != null && !isNaN(d[v.id])));
    if (validDeps.length < 4) return null;
    const names = validDeps.map(([n]) => n);
    const X = validDeps.map(([_, d]) => PCA_VARS.map(v => d[v.id]));
    const pcaRes = pca(X, 2);
    const km = kmeans(pcaRes.scores, k);

    // Caracterizar tipologías: para cada cluster, calcular las medias
    // estandarizadas y identificar las variables más distintivas.
    const Z = zScoreMatrix(X);
    const clusterProfiles = [];
    for (let c = 0; c < k; c++) {
      const members = names.filter((_, i) => km.assignments[i] === c);
      const memberRows = Z.filter((_, i) => km.assignments[i] === c);
      const profile = PCA_VARS.map((v, j) => ({
        var: v.label,
        avg: memberRows.length > 0
          ? memberRows.reduce((s, r) => s + r[j], 0) / memberRows.length : 0,
      })).sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));
      clusterProfiles.push({ members, profile: profile.slice(0, 3) });
    }

    return {
      names,
      scores: pcaRes.scores,
      assignments: km.assignments,
      explained: pcaRes.explainedRatio,
      components: pcaRes.components,
      clusterProfiles,
    };
  }, [data, k]);

  if (!result) return (
    <div style={{padding: 20, textAlign: "center", color: "var(--unah-mute)"}}>
      <em>Datos insuficientes para el análisis multivariado.</em>
    </div>
  );

  // SVG dimensiones
  const W = 540, H = 400;
  const M = { t: 24, r: 28, b: 70, l: 60 };
  const xs = result.scores.map(s => s[0]);
  const ys = result.scores.map(s => s[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  const px = (x) => M.l + ((x - minX + padX) / (maxX - minX + 2 * padX)) * (W - M.l - M.r);
  const py = (y) => H - M.b - ((y - minY + padY) / (maxY - minY + 2 * padY)) * (H - M.t - M.b);

  return (
    <div className="tipologias-wrap">
      <div className="tipologias-head">
        <div className="scatter-title">
          Análisis multivariado · tipologías de departamentos
          <window.InfoTip text="Reducción de dimensionalidad por Análisis de Componentes Principales (PCA) y agrupamiento por K-means sobre los 9 indicadores SAN principales. Cada punto es un departamento; departamentos similares se ubican cerca y comparten color (tipología). Útil para política diferenciada por tipología." />
        </div>
        <div className="scatter-subtitle">
          Cada punto es un departamento proyectado sobre los dos primeros componentes principales (CP1 y CP2).
          Los colores agrupan departamentos similares (clustering K-means).
        </div>
      </div>

      <div className="tipologias-controls">
        <label>Número de tipologías (k):</label>
        <select value={k} onChange={e => setK(+e.target.value)}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
        <span className="tip-explained">
          Varianza explicada: CP1 = <strong>{(result.explained[0] * 100).toFixed(1)}%</strong>
          · CP2 = <strong>{(result.explained[1] * 100).toFixed(1)}%</strong>
          · Total = <strong>{((result.explained[0] + result.explained[1]) * 100).toFixed(1)}%</strong>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="scatter-svg" role="img" aria-label="Tipologías PCA">
        {/* Ejes */}
        <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke="var(--unah-line)" />
        <line x1={M.l} y1={M.t}     x2={M.l}     y2={H - M.b} stroke="var(--unah-line)" />
        {/* Cero refs */}
        <line x1={px(0)} y1={M.t} x2={px(0)} y2={H - M.b} stroke="var(--unah-line-2)" strokeDasharray="3,3" />
        <line x1={M.l}   y1={py(0)} x2={W - M.r} y2={py(0)} stroke="var(--unah-line-2)" strokeDasharray="3,3" />

        {/* Puntos */}
        {result.names.map((name, i) => {
          const isSel = name === selected;
          const cl = result.assignments[i];
          const color = CLUSTER_COLORS[cl] || "#888";
          return (
            <g key={name} onClick={() => setSelected && setSelected(name)} style={{cursor: "pointer"}}>
              <circle
                cx={px(result.scores[i][0])} cy={py(result.scores[i][1])}
                r={isSel ? 9 : 6}
                fill={color}
                stroke={isSel ? "var(--unah-gold)" : "#fff"}
                strokeWidth={isSel ? 2.5 : 1}
                opacity={isSel ? 1 : 0.85}
              >
                <title>{name} · Tipología {cl + 1}</title>
              </circle>
              <text
                x={px(result.scores[i][0]) + 10}
                y={py(result.scores[i][1]) + 4}
                fontSize="9.5"
                fontWeight={isSel ? 700 : 500}
                fill={isSel ? "var(--text-accent)" : "var(--unah-ink-2)"}
              >{name}</text>
            </g>
          );
        })}

        {/* Etiquetas ejes */}
        <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--unah-ink-2)" fontWeight="500">
          CP1 ({(result.explained[0] * 100).toFixed(1)}% varianza)
        </text>
        <text x={16} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--unah-ink-2)" fontWeight="500"
              transform={`rotate(-90 16 ${H / 2})`}>
          CP2 ({(result.explained[1] * 100).toFixed(1)}% varianza)
        </text>
      </svg>

      <div className="tipologias-profiles">
        <div className="tip-profiles-title">Caracterización de las tipologías</div>
        {result.clusterProfiles.map((cp, i) => cp.members.length > 0 && (
          <div key={i} className="tip-profile">
            <div className="tip-profile-head">
              <span className="tip-profile-dot" style={{background: CLUSTER_COLORS[i]}}></span>
              <strong>{CLUSTER_NAMES[i]}</strong>
              <span className="tip-profile-count">({cp.members.length} deptos.)</span>
            </div>
            <div className="tip-profile-members">{cp.members.join(", ")}</div>
            <div className="tip-profile-vars">
              Variables más distintivas:
              {cp.profile.map((p, j) => (
                <span key={j} className={p.avg >= 0 ? "tip-var-up" : "tip-var-dn"}>
                  {" "}{p.var} {p.avg >= 0 ? "↑" : "↓"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="scatter-foot">
        PCA y K-means se ejecutan en el navegador. Las tipologías son <em>sugerentes</em>; no constituyen
        una clasificación oficial. Útiles como insumo para diseño de políticas diferenciadas.
      </div>
    </div>
  );
}

window.TipologiasView = TipologiasView;
window.pca = pca;
window.kmeans = kmeans;
