/* ============================================================================
   side.jsx · Panel lateral derecho (Detalle / Ranking / Comparar / Tabla)
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Define el panel lateral derecho del tablero. Cuando el usuario hace clic
   en un departamento del mapa, este panel muestra:
     - Detalle  · perfil de productores, tamaño de explotación, indicadores.
     - Ranking  · barra horizontal con los 18 departamentos ordenados.
     - Comparar · permite poner dos departamentos lado a lado.
     - Tabla    · tabla cruda con todos los valores del indicador activo.

   COMPONENTES INTERNOS:
     <SidePanel>     ← exportado a window.SidePanel
       ├── <DetailTab>      perfil con donas y barras
       ├── <RankingTab>     ranking horizontal
       ├── <CompareTab>     comparación lado a lado
       └── <TableTab>       tabla numérica
     <Donut>         gráfica circular SVG simple (sin librerías externas)

   NOTA TÉCNICA: las gráficas se dibujan con SVG nativo. No se usa D3 ni
   Chart.js — son SVGs hechos a mano con cálculos trigonométricos. Esto
   mantiene el bundle ligero y el código transparente.
   ============================================================================ */
/* global React */
const { useMemo, useState } = React;

// ----------------------------------------------------------------------------
// <SidePanel />  Componente raíz del panel. Maneja la pestaña activa.
// ----------------------------------------------------------------------------
function SidePanel({ data, indicator, minV, maxV, selected, setSelected, compareWith, setCompareWith, tweaks }) {
  const [tab, setTab] = useState("detalle");
  const dep = selected ? data.departamentos[selected] : null;
  const cmp = compareWith ? data.departamentos[compareWith] : null;

  // Ranking sorted by current indicator
  const ranking = useMemo(() => {
    return Object.values(data.departamentos)
      .map(d => ({ name: d.name, value: d[indicator.id] }))
      .filter(d => d.value != null && !isNaN(d.value))
      .sort((a, b) => b.value - a.value);
  }, [data, indicator]);

  const fmtV = (v) => indicator.isPct ? window.fmtPct(v, 1) : window.fmtN(v, 0);

  return (
    <aside className="side">
      <div className="side-section">
        <h3>Vista actual</h3>
        <h2>{selected || "Honduras · Nacional"}</h2>
        <div className="subtitle">
          {selected
            ? `Departamento de ${selected} · datos preliminares CAN 2024`
            : "Selecciona un departamento en el mapa para ver el desglose."}
        </div>
        <div className="compare-toggle">
          {["detalle", "ranking", "comparar", "tabla"].map(t => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t === "detalle" ? "Detalle" : t === "ranking" ? "Ranking" : t === "comparar" ? "Comparar" : "Tabla"}
            </button>
          ))}
        </div>
      </div>

      {tab === "detalle" && <DetailTab dep={dep || data.total} total={data.total} isNational={!selected} indicator={indicator} />}
      {tab === "ranking" && <RankingTab ranking={ranking} indicator={indicator} selected={selected} setSelected={setSelected} fmtV={fmtV} />}
      {tab === "comparar" && <CompareTab data={data} selected={selected} setSelected={setSelected} compareWith={compareWith} setCompareWith={setCompareWith} indicator={indicator} />}
      {tab === "tabla" && <TableTab data={data} indicator={indicator} selected={selected} setSelected={setSelected} fmtV={fmtV} />}
    </aside>
  );
}

function DetailTab({ dep, total, isNational, indicator }) {
  const sexoTotal = dep.productores_total || 1;
  const tamaño = isNational ? null : {
    propia: (dep.sup_propio || 0),
    arrendada: (dep.sup_arrendada || 0),
    otra: (dep.sup_nacional || 0) + (dep.sup_ejidal || 0) + (dep.sup_consejo || 0) + (dep.sup_otra_tenencia || 0),
  };

  return (
    <>
      <div className="side-section">
        <h3>Productores · perfil</h3>
        <Donut data={[
          { label: "Hombres", val: dep.productores_hombres, color: "#002E6D" },
          { label: "Mujeres", val: dep.productores_mujeres, color: "#C9A227" },
          { label: "Organizaciones", val: dep.productores_orgs, color: "#0072CE" },
        ]} total={sexoTotal} />
      </div>

      <div className="side-section">
        <h3>Tenencia de la tierra</h3>
        <div className="metric-row"><span className="l">Superficie total</span><span className="v">{window.fmtN(dep.superficie_total, 0)}<small>ha</small></span></div>
        <div className="metric-row"><span className="l">Superficie propia</span><span className="v">{window.fmtN(dep.sup_propio, 0)}<small>ha</small></span></div>
        <div className="metric-row"><span className="l">Superficie arrendada</span><span className="v">{window.fmtN(dep.sup_arrendada, 0)}<small>ha</small></span></div>
        <div className="metric-row"><span className="l">Otras tenencias</span><span className="v">{window.fmtN((dep.sup_nacional||0)+(dep.sup_ejidal||0)+(dep.sup_consejo||0)+(dep.sup_otra_tenencia||0), 0)}<small>ha</small></span></div>
      </div>

      <div className="side-section">
        <h3>Producción agrícola</h3>
        <div className="metric-row"><span className="l">Maíz</span><span className="v">{window.fmtN(dep.maiz_produccion_tm, 0)}<small>TM</small></span></div>
        <div className="metric-row"><span className="l">Frijol</span><span className="v">{window.fmtN(dep.frijol_produccion_tm, 0)}<small>TM</small></span></div>
        <div className="metric-row"><span className="l">Arroz</span><span className="v">{window.fmtN(dep.arroz_produccion_tm, 0)}<small>TM</small></span></div>
        <div className="metric-row"><span className="l">Café</span><span className="v">{window.fmtN(dep.cafe_produccion, 0)}<small>TM</small></span></div>
      </div>

      <div className="side-section">
        <h3>Existencia pecuaria</h3>
        <div className="metric-row"><span className="l">Bovinos</span><span className="v">{window.fmtN(dep.bovinos_existencias, 0)}<small>cab.</small></span></div>
        <div className="metric-row"><span className="l">Porcinos</span><span className="v">{window.fmtN(dep.porcinos_existencias, 0)}<small>cab.</small></span></div>
        <div className="metric-row"><span className="l">Aves de corral</span><span className="v">{window.fmtN(dep.aves_existencias, 0)}<small>aves</small></span></div>
        <div className="metric-row"><span className="l">Producción de leche</span><span className="v">{window.fmtN(dep.leche_litros, 0)}<small>L</small></span></div>
      </div>

      <div className="side-section">
        <h3>Técnicas y prácticas</h3>
        <div className="metric-row"><span className="l">Sup. con riego</span><span className="v">{window.fmtN(dep.riego_superficie, 0)}<small>ha</small></span></div>
        <div className="metric-row"><span className="l">% con asist. técnica</span><span className="v">{window.fmtPct(dep.at_pct, 1)}</span></div>
        <div className="metric-row"><span className="l">% con crédito</span><span className="v">{window.fmtPct(dep.credito_pct, 1)}</span></div>
        <div className="metric-row"><span className="l">% con maquinaria</span><span className="v">{window.fmtPct(dep.maquinaria_pct, 1)}</span></div>
      </div>

      {!isNational && <NationalCompare dep={dep} total={total} />}
    </>
  );
}

function NationalCompare({ dep, total }) {
  const items = [
    { lab: "Productores", d: dep.productores_total, n: total.productores_total },
    { lab: "Explotaciones", d: dep.explotaciones, n: total.explotaciones },
    { lab: "Superficie (ha)", d: dep.superficie_total, n: total.superficie_total },
    { lab: "Maíz (TM)", d: dep.maiz_produccion_tm, n: total.maiz_produccion_tm },
    { lab: "Café (TM)", d: dep.cafe_produccion, n: total.cafe_produccion },
    { lab: "Bovinos", d: dep.bovinos_existencias, n: total.bovinos_existencias },
  ];
  return (
    <div className="side-section">
      <h3>Participación nacional</h3>
      {items.map((it, i) => {
        const pct = it.n ? it.d / it.n : 0;
        return (
          <div className="compare-bar" key={i}>
            <div className="lab"><span>{it.lab}</span><span>{window.fmtPct(pct, 1)}</span></div>
            <div className="track">
              <div className="bar-nat" style={{ width: "100%" }}></div>
              <div className="bar-dep" style={{ width: `${Math.min(100, pct*100)}%` }}></div>
              <div className="v">{window.fmtN(it.d, 0)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingTab({ ranking, indicator, selected, setSelected, fmtV }) {
  const max = ranking[0]?.value || 1;
  return (
    <div className="side-section">
      <h3>Ranking · {indicator.short}</h3>
      <div className="subtitle">Departamentos ordenados por {indicator.label.toLowerCase()}.</div>
      {ranking.map((r, i) => (
        <div key={r.name} className={`ranking-row ${selected === r.name ? "active" : ""}`} onClick={() => setSelected(r.name)}>
          <span className="rank">{String(i+1).padStart(2,"0")}</span>
          <span className="name">{r.name}</span>
          <span className="val">{fmtV(r.value)}</span>
          <div className="bar-wrap"><div className="bar" style={{ width: `${(r.value / max) * 100}%` }}></div></div>
        </div>
      ))}
    </div>
  );
}

function CompareTab({ data, selected, setSelected, compareWith, setCompareWith, indicator }) {
  const dpts = Object.keys(data.departamentos).sort();
  const a = selected ? data.departamentos[selected] : null;
  const b = compareWith ? data.departamentos[compareWith] : null;

  const rows = [
    ["Productores", "productores_total"],
    ["% Mujeres", "pct_mujeres", true],
    ["Explotaciones", "explotaciones"],
    ["Superficie (ha)", "superficie_total"],
    ["Maíz (TM)", "maiz_produccion_tm"],
    ["Frijol (TM)", "frijol_produccion_tm"],
    ["Café (TM)", "cafe_produccion"],
    ["Bovinos", "bovinos_existencias"],
    ["Porcinos", "porcinos_existencias"],
    ["Aves", "aves_existencias"],
    ["Riego (ha)", "riego_superficie"],
    ["% Maquinaria", "maquinaria_pct", true],
  ];

  return (
    <div className="side-section">
      <h3>Comparativa entre departamentos</h3>
      <div className="compare-pickers">
        <select value={selected || ""} onChange={e => setSelected(e.target.value || null)}>
          <option value="">— Departamento A —</option>
          {dpts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={compareWith || ""} onChange={e => setCompareWith(e.target.value || null)}>
          <option value="">— Departamento B —</option>
          {dpts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {(!a || !b) && <div className="subtitle">Selecciona dos departamentos para ver la comparación lado a lado.</div>}
      {a && b && (
        <table className="data-table">
          <thead><tr><th>Indicador</th><th style={{textAlign:"right"}}>{a.name}</th><th style={{textAlign:"right"}}>{b.name}</th></tr></thead>
          <tbody>
            {rows.map(([lab, key, isPct]) => {
              const va = a[key], vb = b[key];
              const winner = (va == null || vb == null) ? null : (va > vb ? "a" : (vb > va ? "b" : null));
              const fmt = isPct ? (v) => window.fmtPct(v, 1) : (v) => window.fmtN(v, 0);
              return (
                <tr key={key}>
                  <td>{lab}</td>
                  <td className="num" style={{ color: winner==="a" ? "var(--unah-blue)" : "", fontWeight: winner==="a" ? 600 : 400 }}>{fmt(va)}</td>
                  <td className="num" style={{ color: winner==="b" ? "var(--unah-blue)" : "", fontWeight: winner==="b" ? 600 : 400 }}>{fmt(vb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TableTab({ data, indicator, selected, setSelected, fmtV }) {
  const rows = Object.values(data.departamentos)
    .map(d => ({ name: d.name, ...d }))
    .sort((a, b) => (b[indicator.id] || 0) - (a[indicator.id] || 0));
  return (
    <div className="side-section">
      <h3>Tabla detallada · {indicator.short}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Depto.</th>
            <th style={{textAlign:"right"}}>{indicator.short}</th>
            <th style={{textAlign:"right"}}>Productores</th>
            <th style={{textAlign:"right"}}>Sup. (ha)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className={selected === r.name ? "active" : ""} onClick={() => setSelected(r.name)}>
              <td>{r.name}</td>
              <td className="num">{fmtV(r[indicator.id])}</td>
              <td className="num">{window.fmtN(r.productores_total, 0)}</td>
              <td className="num">{window.fmtN(r.superficie_total, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// DONUT
// ============================================================
function Donut({ data, total }) {
  const r = 36, sw = 14, c = 50;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--unah-line-2)" strokeWidth={sw} />
        {data.map((d, i) => {
          const frac = (d.val || 0) / total;
          const dash = frac * circ;
          const off = -acc * circ;
          acc += frac;
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={d.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={off}
              transform={`rotate(-90 ${c} ${c})`} />
          );
        })}
        <text x={c} y={c-2} textAnchor="middle" fontSize="10" fill="var(--unah-mute)">total</text>
        <text x={c} y={c+10} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--unah-ink)" fontFamily="inherit">{window.fmtCompact(total)}</text>
      </svg>
      <div className="donut-legend" style={{ flex: 1 }}>
        {data.map((d, i) => (
          <div className="item" key={i}>
            <span className="sw" style={{ background: d.color }}></span>
            <span>{d.label}</span>
            <span className="num">{window.fmtN(d.val, 0)}</span>
            <span className="pct">{window.fmtPct((d.val||0)/total, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.SidePanel = SidePanel;
