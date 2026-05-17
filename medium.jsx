/* ============================================================================
   medium.jsx · PRIORIDAD MEDIA — funcionalidades del Tablero CAN 2024
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   Implementa:
     - <ScoreCardSAN/>   Semáforo de 6 indicadores SAN para un departamento
     - <GenderGaps/>     Brechas de género en producción agropecuaria
     - <SimulatorWhatIf/> Slider de simulación "qué pasaría si..."
   ============================================================================ */
/* global React */
const { useState, useMemo } = React;

// ============================================================================
// <ScoreCardSAN /> — Tarjeta-resumen tipo semáforo para un departamento
// ============================================================================
function ScoreCardSAN({ data, name }) {
  const dep = name ? data.departamentos[name] : data.total;
  if (!dep) return null;
  const t = data.total;

  // 6 indicadores clave SAN evaluados contra umbrales
  const items = [
    {
      label: "Disponibilidad calórica (RAR)",
      pillar: "Disponibilidad",
      value: dep.rar_calorica,
      fmt: (v) => v == null ? "—" : (v * 100).toFixed(0) + "%",
      // Umbrales: ≥100% verde · 50-100% amarillo · <50% rojo
      score: (v) => v == null ? "x" : v >= 1.0 ? "ok" : v >= 0.5 ? "warn" : "alert",
      info: "Producción local cubre el requerimiento calórico FAO (2,100 kcal/cap·día)."
    },
    {
      label: "Disponibilidad proteica (RAR)",
      pillar: "Disponibilidad",
      value: dep.rar_proteica,
      fmt: (v) => v == null ? "—" : (v * 100).toFixed(0) + "%",
      score: (v) => v == null ? "x" : v >= 1.0 ? "ok" : v >= 0.5 ? "warn" : "alert",
      info: "Producción local cubre el requerimiento proteico FAO (50 g/cap·día)."
    },
    {
      label: "Diversificación productiva (IDP)",
      pillar: "Estabilidad",
      value: dep.idp_shannon,
      fmt: (v) => v == null ? "—" : v.toFixed(2),
      score: (v) => v == null ? "x" : v >= 0.7 ? "ok" : v >= 0.5 ? "warn" : "alert",
      info: "Índice de Shannon normalizado sobre los rubros productivos."
    },
    {
      label: "Cobertura asistencia técnica",
      pillar: "Acceso",
      value: dep.at_pct,
      fmt: (v) => v == null ? "—" : (v * 100).toFixed(1) + "%",
      score: (v) => v == null ? "x" : v >= 0.20 ? "ok" : v >= 0.10 ? "warn" : "alert",
      info: "% de explotaciones que reciben asistencia técnica formal."
    },
    {
      label: "Acceso a crédito formal",
      pillar: "Acceso",
      value: dep.credito_pct,
      fmt: (v) => v == null ? "—" : (v * 100).toFixed(1) + "%",
      score: (v) => v == null ? "x" : v >= 0.08 ? "ok" : v >= 0.04 ? "warn" : "alert",
      info: "% de explotaciones que utilizan crédito formal."
    },
    {
      label: "Vulnerabilidad productiva (IVPD)",
      pillar: "Acceso",
      value: dep.ivpd,
      fmt: (v) => v == null ? "—" : (v * 100).toFixed(1) + "%",
      // Invertido: bajo IVPD = bueno
      score: (v) => v == null ? "x" : v <= 0.70 ? "ok" : v <= 0.85 ? "warn" : "alert",
      info: "Índice compuesto de cuatro brechas: asist. técnica, crédito, maquinaria y riego."
    },
  ];

  // Score global: contar verdes / amarillos / rojos
  const counts = { ok: 0, warn: 0, alert: 0, x: 0 };
  items.forEach(it => counts[it.score(it.value)]++);

  // Nota general (0..10)
  const grade = ((counts.ok * 2 + counts.warn * 1) / (items.length * 2)) * 10;
  let gradeLabel, gradeClass;
  if (grade >= 8)      { gradeLabel = "Favorable";       gradeClass = "ok"; }
  else if (grade >= 5) { gradeLabel = "Mixto";           gradeClass = "warn"; }
  else                 { gradeLabel = "Crítico";         gradeClass = "alert"; }

  return (
    <div className="scorecard">
      <div className="scorecard-head">
        <div>
          <div className="scorecard-eyebrow">Score Card SAN</div>
          <h3 className="scorecard-name">{name || "Honduras · Nacional"}</h3>
        </div>
        <div className={`scorecard-grade scorecard-grade-${gradeClass}`}>
          <div className="scorecard-grade-num">{grade.toFixed(1)}</div>
          <div className="scorecard-grade-lab">{gradeLabel}</div>
        </div>
      </div>
      <div className="scorecard-grid">
        {items.map((it, i) => {
          const s = it.score(it.value);
          return (
            <div key={i} className={`scorecard-cell sc-${s}`}>
              <div className="sc-light"></div>
              <div className="sc-text">
                <div className="sc-pillar">{it.pillar}</div>
                <div className="sc-label">{it.label}
                  {it.info && <window.InfoTip text={it.info} />}
                </div>
                <div className="sc-value">{it.fmt(it.value)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="scorecard-summary">
        <span className="sc-summary-item ok">
          <span className="sc-dot sc-light-ok"></span> {counts.ok} favorables
        </span>
        <span className="sc-summary-item warn">
          <span className="sc-dot sc-light-warn"></span> {counts.warn} en alerta
        </span>
        <span className="sc-summary-item alert">
          <span className="sc-dot sc-light-alert"></span> {counts.alert} críticos
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// <GenderGaps /> — Brechas de género en producción
// ============================================================================
function GenderGaps({ data, name }) {
  const dep = name ? data.departamentos[name] : data.total;
  if (!dep) return null;

  // Filas: comparamos lo que se puede comparar
  // Como el CAN no desagregó todos los indicadores por sexo, mostramos los
  // proxies disponibles: # de productores, % en organizaciones
  const totalProd = (dep.productores_hombres || 0) + (dep.productores_mujeres || 0);
  const totalNac  = (data.total.productores_hombres || 0) + (data.total.productores_mujeres || 0);

  const rows = [
    {
      label: "Productores totales",
      m: dep.productores_mujeres,
      h: dep.productores_hombres,
      fmt: (v) => window.fmtN(v, 0),
    },
    {
      label: "Participación % del territorio",
      m: dep.productores_mujeres / (totalProd || 1),
      h: dep.productores_hombres / (totalProd || 1),
      isPct: true,
    },
    {
      label: "Participación nacional (por sexo)",
      m: dep.productores_mujeres / (data.total.productores_mujeres || 1),
      h: dep.productores_hombres / (data.total.productores_hombres || 1),
      isPct: true,
    },
  ];

  // Comparativa rápida nacional
  const ratioDep = dep.productores_hombres > 0
    ? dep.productores_mujeres / dep.productores_hombres : 0;
  const ratioNac = data.total.productores_hombres > 0
    ? data.total.productores_mujeres / data.total.productores_hombres : 0;
  const dif = ratioDep - ratioNac;

  return (
    <div className="gender-gaps">
      <div className="gg-head">
        <h4>Brechas de género en producción
          <window.InfoTip text="Comparación de la participación de mujeres y hombres como productores principales. El CAN 2024 no desagregó todos los indicadores productivos por sexo; se muestran los disponibles. Aporta al pilar Acceso de la SAN con enfoque de género." />
        </h4>
        <div className="gg-ratio">
          Ratio M/H: <strong>{ratioDep.toFixed(2)}</strong>
          <span className={dif >= 0 ? "gg-diff-pos" : "gg-diff-neg"}>
            {dif >= 0 ? " +" : " "}{(dif * 100).toFixed(1)} pp vs. país
          </span>
        </div>
      </div>
      <div className="gg-rows">
        {rows.map((r, i) => {
          const sumKnown = (r.m || 0) + (r.h || 0);
          const pctM = sumKnown > 0 ? r.m / sumKnown : 0;
          const fmtFn = r.isPct ? ((v) => `${(v * 100).toFixed(1)}%`) : r.fmt;
          return (
            <div key={i} className="gg-row">
              <div className="gg-label">{r.label}</div>
              <div className="gg-bar-wrap">
                <div className="gg-bar gg-bar-m" style={{ width: (pctM * 100) + "%" }}>
                  <span className="gg-bar-val">M · {fmtFn(r.m)}</span>
                </div>
                <div className="gg-bar gg-bar-h" style={{ width: ((1 - pctM) * 100) + "%" }}>
                  <span className="gg-bar-val">H · {fmtFn(r.h)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// <SimulatorWhatIf /> — Simulador hipotético sobre el IVPD
// ============================================================================
function SimulatorWhatIf({ data, name }) {
  const dep = name ? data.departamentos[name] : null;
  const baseAT   = dep ? dep.at_pct       : data.total.at_pct;
  const baseCre  = dep ? dep.credito_pct  : data.total.credito_pct;
  const baseMaq  = dep ? dep.maquinaria_pct : data.total.maquinaria_pct;
  const baseRiego= dep ? ((dep.riego_superficie || 0) / Math.max(dep.superficie_total || 1, 1))
                        : ((data.total.riego_superficie || 0) / Math.max(data.total.superficie_total || 1, 1));
  const baseIVPD = dep ? dep.ivpd : data.total.ivpd;

  const [at, setAt]     = useState(null);
  const [cre, setCre]   = useState(null);
  const [maq, setMaq]   = useState(null);
  const [riego, setRiego] = useState(null);

  // Reset cuando cambia el departamento
  React.useEffect(() => {
    setAt(null); setCre(null); setMaq(null); setRiego(null);
  }, [name]);

  const cur = {
    at:    at    !== null ? at    : baseAT,
    cre:   cre   !== null ? cre   : baseCre,
    maq:   maq   !== null ? maq   : baseMaq,
    riego: riego !== null ? riego : baseRiego,
  };
  const newIVPD = ((1 - cur.at) + (1 - cur.cre) + (1 - cur.maq) + (1 - cur.riego)) / 4;
  const delta = newIVPD - baseIVPD;

  const slider = (label, v, set, base, info, unit = "%") => (
    <div className="sim-slider">
      <div className="sim-slider-head">
        <span className="sim-slider-label">{label}
          {info && <window.InfoTip text={info} />}
        </span>
        <span className="sim-slider-value">{(v * 100).toFixed(1)}{unit}
          {v !== base && (
            <span className={v > base ? "sim-delta-up" : "sim-delta-dn"}>
              {" "}({v > base ? "+" : ""}{((v - base) * 100).toFixed(1)} pp)
            </span>
          )}
        </span>
      </div>
      <input type="range" min={0} max={1} step={0.005}
        value={v}
        onChange={(e) => set(parseFloat(e.target.value))} />
    </div>
  );

  const resetAll = () => { setAt(null); setCre(null); setMaq(null); setRiego(null); };

  return (
    <div className="sim-whatif">
      <div className="sim-head">
        <h4>Simulador "¿Qué pasaría si…?"
          <window.InfoTip text="Permite explorar el impacto hipotético en el IVPD (Índice de Vulnerabilidad Productiva) si se modificara la cobertura de servicios productivos. Útil para análisis de costo-efectividad de políticas. No constituye una proyección causal." />
        </h4>
        <button className="sim-reset" onClick={resetAll}>Restablecer</button>
      </div>
      <div className="sim-subtitle">
        Mueve los sliders para simular cambios en la cobertura de servicios productivos
        {dep ? <> en <strong>{name}</strong></> : <> a nivel nacional</>}.
      </div>
      <div className="sim-sliders">
        {slider("Asistencia técnica", cur.at, setAt, baseAT, "% de explotaciones que reciben asistencia técnica.")}
        {slider("Crédito formal", cur.cre, setCre, baseCre, "% de explotaciones con crédito formal.")}
        {slider("Maquinaria", cur.maq, setMaq, baseMaq, "% de explotaciones con maquinaria propia.")}
        {slider("Cobertura riego", cur.riego, setRiego, baseRiego, "Superficie con riego como % de la superficie agropecuaria total.")}
      </div>
      <div className="sim-result">
        <div className="sim-result-row">
          <span>IVPD base</span>
          <strong>{(baseIVPD * 100).toFixed(1)}%</strong>
        </div>
        <div className="sim-result-row">
          <span>IVPD simulado</span>
          <strong className={delta < -0.05 ? "sim-delta-strong-dn" : delta > 0.05 ? "sim-delta-strong-up" : ""}>
            {(newIVPD * 100).toFixed(1)}%
          </strong>
        </div>
        <div className="sim-result-row sim-result-delta">
          <span>Cambio</span>
          <strong className={delta < 0 ? "sim-delta-dn" : delta > 0 ? "sim-delta-up" : ""}>
            {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)} pp
            {Math.abs(delta) > 0.001 && (
              <span className="sim-interpretation">
                {delta < 0 ? " ↓ menos vulnerable" : " ↑ más vulnerable"}
              </span>
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}

window.ScoreCardSAN = ScoreCardSAN;
window.GenderGaps = GenderGaps;
window.SimulatorWhatIf = SimulatorWhatIf;
