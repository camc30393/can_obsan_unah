/* ============================================================================
   views.jsx · Vistas alternativas del tablero
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   <HeatmapView />   matriz departamentos × servicios productivos
   <BivariateLegend /> leyenda 3×3 para el mapa bivariado
   ============================================================================ */
/* global React */
const { useMemo } = React;

// ============================================================================
// <HeatmapView />
// Vista matricial donde filas = departamentos, columnas = brechas/servicios.
// Cada celda colorea la cobertura del servicio (alto = bueno, bajo = brecha).
// ============================================================================
function HeatmapView({ data, setSelected, selected, darkMode }) {
  const COLS = [
    { id: "at_pct",          label: "Asist. técnica",  unit: "%", isPct: true,  good: "high" },
    { id: "credito_pct",     label: "Crédito",          unit: "%", isPct: true,  good: "high" },
    { id: "maquinaria_pct",  label: "Maquinaria",       unit: "%", isPct: true,  good: "high" },
    { id: "pct_riego",       label: "Sup. con riego",   unit: "%", isPct: true,  good: "high", derive: (d) => (d.riego_superficie || 0) / Math.max(d.superficie_total || 1, 1) },
    { id: "pct_mujeres",     label: "Mujeres prod.",   unit: "%", isPct: true,  good: "high" },
    { id: "idal_kg_capita",  label: "IDAL",             unit: "kg/cap", isPct: false, good: "high" },
    { id: "idp_shannon",     label: "Diversificación", unit: "", isPct: true,  good: "high" },
    { id: "ivpd",            label: "Vulnerabilidad",   unit: "", isPct: true,  good: "low" },
  ];

  // Calcular min/max por columna para normalizar el color
  const colStats = useMemo(() => {
    const out = {};
    for (const c of COLS) {
      const vals = Object.values(data.departamentos)
        .map(d => c.derive ? c.derive(d) : d[c.id])
        .filter(v => v != null && !isNaN(v));
      out[c.id] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return out;
  }, [data]);

  const deps = Object.values(data.departamentos).sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Color: bueno → azul UNAH; malo → rojo cálido. Si "good=low", invertir.
  const colorFor = (v, c) => {
    if (v == null || isNaN(v)) return "var(--unah-line-2)";
    const { min, max } = colStats[c.id];
    const t = (v - min) / (max - min || 1);
    const tGood = c.good === "high" ? t : 1 - t;
    // tGood ≈ 0 → rojo; ≈ 1 → azul oscuro UNAH
    if (tGood < 0.33) {
      const k = tGood / 0.33;
      return `rgb(${Math.round(220 - k*100)}, ${Math.round(80 + k*100)}, ${Math.round(80 + k*60)})`;
    } else if (tGood < 0.66) {
      const k = (tGood - 0.33) / 0.33;
      return `rgb(${Math.round(120 - k*40)}, ${Math.round(180 - k*60)}, ${Math.round(140 + k*30)})`;
    } else {
      const k = (tGood - 0.66) / 0.34;
      return `rgb(${Math.round(80 - k*80)}, ${Math.round(120 - k*90)}, ${Math.round(170 + k*40)})`;
    }
  };

  const fmt = (v, c) => {
    if (v == null || isNaN(v)) return "—";
    if (c.isPct) return `${(v * 100).toFixed(1)}%`;
    return window.fmtN(v, 0);
  };

  return (
    <div className="heatmap-view">
      <div className="heatmap-head">
        <div className="heatmap-title">
          Matriz de brechas productivas · departamentos × servicios
          <window.InfoTip text="Cada celda representa la cobertura del servicio en el departamento. Azul oscuro = mejor cobertura, rojo = brecha más severa. Para el IVPD, la escala se invierte: rojo = mayor vulnerabilidad." />
        </div>
        <div className="heatmap-subtitle">
          Clic en una fila para seleccionar el departamento y ver su análisis detallado.
        </div>
      </div>
      <div className="heatmap-wrap">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-corner">Departamento</th>
              {COLS.map(c => (
                <th key={c.id} className="heatmap-col-head">
                  <div className="hm-col-label">{c.label}</div>
                  {c.unit && <div className="hm-col-unit">{c.unit}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deps.map(d => (
              <tr key={d.name} className={selected === d.name ? "active" : ""}
                  onClick={() => setSelected(d.name)}>
                <th className="heatmap-row-head">{d.name}</th>
                {COLS.map(c => {
                  const v = c.derive ? c.derive(d) : d[c.id];
                  return (
                    <td key={c.id}
                        className="heatmap-cell"
                        style={{ background: colorFor(v, c), color: getReadable(colorFor(v, c)) }}
                        title={`${d.name} · ${c.label}: ${fmt(v, c)}`}>
                      {fmt(v, c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap-legend">
        <span>Escala:</span>
        <div className="hm-legend-bar">
          <span style={{background: "rgb(220,80,80)"}}></span>
          <span style={{background: "rgb(180,150,90)"}}></span>
          <span style={{background: "rgb(80,120,170)"}}></span>
          <span style={{background: "rgb(0,46,109)"}}></span>
        </div>
        <span>Brecha mayor → menor</span>
      </div>
    </div>
  );
}

// Devuelve color de texto legible sobre un fondo dado (RGB string)
function getReadable(rgbStr) {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgbStr);
  if (!m) return "#000";
  const r = +m[1], g = +m[2], b = +m[3];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.55 ? "rgba(255,255,255,.95)" : "rgba(14,23,48,.92)";
}

window.HeatmapView = HeatmapView;
window.getReadable = getReadable;
