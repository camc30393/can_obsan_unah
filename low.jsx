/* ============================================================================
   low.jsx · PRIORIDAD BAJA — refinamientos del Tablero CAN 2024
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   - <ValueChainDiagram/> Diagrama simplificado producción → destino
   - <PresentationMode/>  Modo kiosco / pantalla completa
   - useKeyboardNav()     Navegación por teclado (atajos)
   ============================================================================ */
/* global React */
const { useState, useEffect, useMemo } = React;

// ============================================================================
// <ValueChainDiagram /> — Diagrama de cadena de valor simplificado
// ----------------------------------------------------------------------------
// Visualiza la producción agropecuaria del departamento (o nacional) y la
// reparte conceptualmente en destinos: consumo local (autoconsumo + mercado
// interno), agroindustria y exportación.
// Heurísticas: granos básicos → 80% consumo local, 20% mercado;
//              café → 95% exportación, 5% local;
//              bovinos/leche → 90% mercado interno + agroindustria.
// ============================================================================
function ValueChainDiagram({ data, name }) {
  const dep = name ? data.departamentos[name] : data.total;
  if (!dep) return null;

  // Conversión a TM equivalentes (sin unidades cruzadas, solo para visualizar)
  const inputs = [
    { lab: "Maíz",       tm: dep.maiz_produccion_tm || 0,  splits: { "Consumo local": 0.85, "Mercado interno": 0.15, "Exportación": 0 } },
    { lab: "Frijol",     tm: dep.frijol_produccion_tm || 0, splits: { "Consumo local": 0.85, "Mercado interno": 0.15, "Exportación": 0 } },
    { lab: "Arroz",      tm: dep.arroz_produccion_tm || 0,  splits: { "Consumo local": 0.70, "Mercado interno": 0.30, "Exportación": 0 } },
    { lab: "Café",       tm: dep.cafe_produccion || 0,      splits: { "Consumo local": 0.05, "Mercado interno": 0.10, "Exportación": 0.85 } },
  ].filter(i => i.tm > 0);

  const totals = { "Consumo local": 0, "Mercado interno": 0, "Exportación": 0 };
  inputs.forEach(i => {
    for (const [k, w] of Object.entries(i.splits)) totals[k] += i.tm * w;
  });
  const grandTotal = totals["Consumo local"] + totals["Mercado interno"] + totals["Exportación"];
  if (grandTotal === 0) return (
    <div className="vc-empty">
      <em>Sin producción registrada de los rubros de la canasta básica para este territorio.</em>
    </div>
  );

  const SRC_COLORS = {
    "Maíz":   "#C8A415",
    "Frijol": "#7B5A0B",
    "Arroz":  "#E8C76A",
    "Café":   "#3F2A1A",
  };
  const DST_COLORS = {
    "Consumo local":   "#0F766E",
    "Mercado interno": "#1E5A88",
    "Exportación":     "#00213D",
  };

  // SVG layout
  const W = 540, H = 280;
  const colSrc = 110;
  const colDst = W - 110;
  const bandWidth = 24;
  const totalIn = inputs.reduce((s, i) => s + i.tm, 0);

  // Y positions normalizadas
  let yAcc = 30;
  const srcBands = inputs.map(i => {
    const h = (i.tm / totalIn) * (H - 60);
    const band = { lab: i.lab, y: yAcc, h, color: SRC_COLORS[i.lab], tm: i.tm, splits: i.splits };
    yAcc += h + 4;
    return band;
  });
  const dstOrder = ["Consumo local", "Mercado interno", "Exportación"];
  let yAcc2 = 30;
  const dstBands = dstOrder.map(d => {
    const h = (totals[d] / grandTotal) * (H - 60);
    const band = { lab: d, y: yAcc2, h, color: DST_COLORS[d], tm: totals[d] };
    yAcc2 += h + 4;
    return band;
  });

  // Flows
  const flows = [];
  for (const src of srcBands) {
    let srcAccY = src.y;
    for (const d of dstBands) {
      const w = (src.splits[d.lab] || 0);
      if (w === 0) continue;
      const flow_h = src.h * w;
      const srcY = srcAccY + flow_h / 2;
      // Compute proportional destination position
      const dstStart = dstBands.find(x => x.lab === d.lab);
      // Each destination receives multiple flows; pile them up
      flows.push({
        srcY, dstLab: d.lab, srcLab: src.lab, w, flow_h,
        srcEndX: colSrc + bandWidth,
        dstStartX: colDst - bandWidth,
        color: src.color,
        tm: src.tm * w,
      });
      srcAccY += flow_h;
    }
  }
  // Pile flows en destinos
  const dstPiles = {};
  dstBands.forEach(d => dstPiles[d.lab] = d.y);
  for (const f of flows.sort((a, b) => dstOrder.indexOf(a.dstLab) - dstOrder.indexOf(b.dstLab) || a.srcY - b.srcY)) {
    const dY = dstPiles[f.dstLab] + f.flow_h / 2;
    f.dstY = dY;
    dstPiles[f.dstLab] += f.flow_h;
  }

  const path = (f) => {
    const x1 = f.srcEndX, x2 = f.dstStartX;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${f.srcY - f.flow_h/2}
            C ${mid} ${f.srcY - f.flow_h/2}, ${mid} ${f.dstY - f.flow_h/2}, ${x2} ${f.dstY - f.flow_h/2}
            L ${x2} ${f.dstY + f.flow_h/2}
            C ${mid} ${f.dstY + f.flow_h/2}, ${mid} ${f.srcY + f.flow_h/2}, ${x1} ${f.srcY + f.flow_h/2}
            Z`;
  };

  return (
    <div className="value-chain">
      <div className="vc-head">
        <h4>Cadena de valor productivo
          <window.InfoTip text="Diagrama tipo Sankey que distribuye la producción de los rubros de la canasta básica y el café en tres destinos conceptuales. Los porcentajes son heurísticos representativos para Honduras; no son cifras oficiales de comercialización. Útil para visualizar la orientación de la producción del territorio." />
        </h4>
        <div className="vc-sub">Producción → destino económico (heurística OBSAN)</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="vc-svg">
        {/* Flows */}
        {flows.map((f, i) => (
          <path key={i} d={path(f)} fill={f.color} opacity="0.42" />
        ))}
        {/* Source bands */}
        {srcBands.map((b, i) => (
          <g key={"s" + i}>
            <rect x={colSrc} y={b.y} width={bandWidth} height={b.h} fill={b.color} />
            <text x={colSrc - 6} y={b.y + b.h / 2 + 3} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--unah-ink)">
              {b.lab}
            </text>
            <text x={colSrc - 6} y={b.y + b.h / 2 + 16} textAnchor="end" fontSize="9.5" fill="var(--unah-mute)">
              {window.fmtN(b.tm, 0)} TM
            </text>
          </g>
        ))}
        {/* Destination bands */}
        {dstBands.map((b, i) => (
          <g key={"d" + i}>
            <rect x={colDst - bandWidth} y={b.y} width={bandWidth} height={b.h} fill={b.color} />
            <text x={colDst + 4} y={b.y + b.h / 2 + 3} fontSize="11" fontWeight="600" fill="var(--unah-blue)">
              {b.lab}
            </text>
            <text x={colDst + 4} y={b.y + b.h / 2 + 16} fontSize="9.5" fill="var(--unah-mute)">
              {window.fmtN(b.tm, 0)} TM ({((b.tm / grandTotal) * 100).toFixed(0)}%)
            </text>
          </g>
        ))}
      </svg>
      <div className="vc-foot">
        Las proporciones reflejan estimaciones generales para Honduras: granos básicos
        predominantemente al consumo local, café a la exportación. No constituyen
        comercialización oficial.
      </div>
    </div>
  );
}

// ============================================================================
// <PresentationMode /> — Vista a pantalla completa optimizada para proyección
// ============================================================================
function PresentationMode({ data, onClose }) {
  const [idx, setIdx] = useState(0);
  const slides = useMemo(() => buildPresentationSlides(data), [data]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") setIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIdx(i => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose, slides.length]);

  const slide = slides[idx];
  return (
    <div className="presentation-mode">
      <button className="presentation-close" onClick={onClose} aria-label="Salir del modo presentación">×</button>
      <div className="presentation-content">
        <div className="pm-step">{idx + 1} / {slides.length}</div>
        <h1 className="pm-title">{slide.title}</h1>
        {slide.subtitle && <div className="pm-subtitle">{slide.subtitle}</div>}
        <div className="pm-body">{slide.body}</div>
      </div>
      <div className="presentation-nav">
        <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0} aria-label="Anterior">◀</button>
        <div className="pm-dots">
          {slides.map((_, i) => (
            <button key={i} className={i === idx ? "on" : ""} onClick={() => setIdx(i)} aria-label={`Ir a slide ${i + 1}`}></button>
          ))}
        </div>
        <button onClick={() => setIdx(i => Math.min(i + 1, slides.length - 1))} disabled={idx === slides.length - 1} aria-label="Siguiente">▶</button>
      </div>
    </div>
  );
}

function buildPresentationSlides(data) {
  const t = data.total;
  const top = (id, n = 3) => Object.entries(data.departamentos)
    .map(([k, d]) => ({ k, v: d[id] }))
    .filter(x => x.v != null)
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
  const fmt  = window.fmtN;
  const fmtP = window.fmtPct;

  return [
    {
      title: "Censo Agropecuario Nacional 2024",
      subtitle: "Resultados preliminares · OBSAN · Universidad Nacional Autónoma de Honduras",
      body: (
        <div className="pm-cover">
          <div className="pm-cover-bar"></div>
          <p className="pm-cover-lead">
            Una mirada a la estructura productiva de Honduras y sus implicaciones
            para la Seguridad Alimentaria y Nutricional, con énfasis en los pilares
            de <strong>Disponibilidad</strong> y <strong>Acceso</strong>.
          </p>
          <p className="pm-cover-meta">Fuente: Instituto Nacional de Estadística (INE) · 2024</p>
        </div>
      ),
    },
    {
      title: "Estructura nacional del agro",
      subtitle: "Productores, explotaciones, superficie",
      body: (
        <div className="pm-grid-4">
          <PMStat label="Productores" value={fmt(t.productores_total)} sub={`${fmtP(t.pct_mujeres, 1)} mujeres`} />
          <PMStat label="Explotaciones" value={fmt(t.explotaciones)} sub="unidades económicas" />
          <PMStat label="Superficie" value={fmt(t.superficie_total, 0)} sub="hectáreas" />
          <PMStat label="ha por productor" value={fmt(t.superficie_total / t.productores_total, 1)} sub="estructura minifundista" />
        </div>
      ),
    },
    {
      title: "Disponibilidad alimentaria · pilar SAN",
      subtitle: `Razón de Adecuación: ${(t.rar_calorica * 100).toFixed(1)}% calórica · ${(t.rar_proteica * 100).toFixed(1)}% proteica`,
      body: (
        <div className="pm-grid-3">
          <PMStat label="kcal/cap·día" value={fmt(t.kcal_cap_dia, 0)} sub="requerimiento: 2,100" big />
          <PMStat label="Proteína g/cap·día" value={fmt(t.prot_cap_dia, 1)} sub="requerimiento: 50" big />
          <PMStat label="IDAL granos básicos" value={fmt(t.idal_kg_capita, 0) + " kg"} sub="por habitante al año" big />
        </div>
      ),
    },
    {
      title: "Líderes productivos territoriales",
      subtitle: "Concentración del agro hondureño",
      body: (
        <div className="pm-tops">
          <PMTop title="Productores" rows={top("productores_total")} fmt={(v) => fmt(v)} />
          <PMTop title="Maíz (TM)" rows={top("maiz_produccion_tm")} fmt={(v) => fmt(v, 0)} />
          <PMTop title="Café (TM)" rows={top("cafe_produccion")} fmt={(v) => fmt(v, 0)} />
          <PMTop title="Bovinos" rows={top("bovinos_existencias")} fmt={(v) => fmt(v, 0)} />
        </div>
      ),
    },
    {
      title: "Brechas estructurales · pilar Acceso",
      subtitle: "Cobertura de servicios productivos a nivel nacional",
      body: (
        <div className="pm-grid-4">
          <PMStat label="Asistencia técnica" value={fmtP(t.at_pct, 1)} sub={`solo ${fmt(t.at_recibio || 0)} explotaciones`} alert={t.at_pct < 0.2} />
          <PMStat label="Crédito formal" value={fmtP(t.credito_pct, 1)} sub="acceso limitado" alert={t.credito_pct < 0.1} />
          <PMStat label="Maquinaria" value={fmtP(t.maquinaria_pct, 1)} sub="propia o alquilada" alert={t.maquinaria_pct < 0.5} />
          <PMStat label="Riego" value={fmtP(t.riego_superficie / t.superficie_total, 2)} sub="del área total" alert />
        </div>
      ),
    },
    {
      title: "Implicaciones para la política pública SAN",
      subtitle: "Lecturas del CAN 2024 desde el OBSAN-UNAH",
      body: (
        <ul className="pm-bullets">
          <li><strong>Disponibilidad heterogénea:</strong> la producción local cubre solo el {(t.rar_calorica * 100).toFixed(0)}% del requerimiento calórico nacional, con marcadas asimetrías entre Olancho (excedentario) y los departamentos del corredor seco e insulares.</li>
          <li><strong>Acceso restringido a servicios:</strong> nueve de cada diez explotaciones no acceden a crédito formal y ocho de cada diez carecen de asistencia técnica.</li>
          <li><strong>Feminización rural:</strong> {(t.pct_mujeres * 100).toFixed(1)}% de los productores son mujeres, con concentraciones territoriales que demandan políticas con enfoque de género.</li>
          <li><strong>Estructura minifundista:</strong> el tamaño medio de {(t.superficie_total / t.productores_total).toFixed(1)} ha por productor limita la productividad y la resiliencia.</li>
        </ul>
      ),
    },
    {
      title: "OBSAN — Observatorio en Seguridad Alimentaria y Nutricional",
      subtitle: "Instituto de Investigaciones Sociales · FCCSS · UNAH",
      body: (
        <div className="pm-cover">
          <p className="pm-cover-lead">
            El OBSAN genera evidencia académica, investigación aplicada y análisis
            de información estratégica para el debate público sobre seguridad
            alimentaria en Honduras.
          </p>
          <p className="pm-cover-meta">
            Equipo: Christian Manzanares · Fiama García · María García<br/>
            Tegucigalpa, M.D.C., Honduras
          </p>
        </div>
      ),
    },
  ];
}

function PMStat({ label, value, sub, big, alert }) {
  return (
    <div className={`pm-stat ${big ? "pm-stat-big" : ""} ${alert ? "pm-stat-alert" : ""}`}>
      <div className="pm-stat-lab">{label}</div>
      <div className="pm-stat-val">{value}</div>
      {sub && <div className="pm-stat-sub">{sub}</div>}
    </div>
  );
}
function PMTop({ title, rows, fmt }) {
  return (
    <div className="pm-top">
      <div className="pm-top-title">{title}</div>
      {rows.map((r, i) => (
        <div key={i} className="pm-top-row">
          <span className="pm-top-rank">{i + 1}</span>
          <span className="pm-top-name">{r.k}</span>
          <span className="pm-top-val">{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

window.ValueChainDiagram = ValueChainDiagram;
window.PresentationMode = PresentationMode;
