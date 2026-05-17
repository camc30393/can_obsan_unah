/* ============================================================================
   tweaks.jsx · Panel flotante de ajustes (Tweaks)
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Renderiza un panel flotante (arrastrable) con controles para:
     - Cambiar el indicador mostrado en el mapa
     - Cambiar la paleta de colores (azul UNAH, oro, divergente, viridis…)
     - Alternar 2D / 3D
     - Alternar tema claro / oscuro
     - Ajustar la altura de las extrusiones 3D

   El panel solo se muestra cuando la plataforma editora envía un mensaje
   __activate_edit_mode (ver app.jsx). En despliegue normal en GitHub Pages,
   los Tweaks no aparecen — el tablero se muestra con los valores por
   defecto definidos en TWEAK_DEFAULTS (app.jsx).

   PARA UN PRINCIPIANTE: este componente es opcional. Es útil para autores
   que iteran sobre el diseño. El usuario final del tablero no lo necesita.
   ============================================================================ */
/* global React */
const { useState } = React;

function TweaksUI({ tweaks, setTweak, onClose }) {
  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: 96 });
  const [drag, setDrag] = useState(null);

  const onMouseDown = (e) => {
    setDrag({ ox: e.clientX - pos.x, oy: e.clientY - pos.y });
  };
  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => setPos({ x: e.clientX - drag.ox, y: e.clientY - drag.oy });
    const up = () => setDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [drag]);

  const indicatorOptions = window.INDICATORS;
  const groups = {};
  indicatorOptions.forEach(i => { groups[i.g] = groups[i.g] || []; groups[i.g].push(i); });

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, width: 280,
      background: "var(--unah-paper)", border: "1px solid var(--unah-line)",
      borderRadius: 10, boxShadow: "0 18px 48px -12px rgba(0,30,109,.35)",
      zIndex: 1000, fontSize: 12, color: "var(--unah-ink)", overflow: "hidden",
      borderTop: "3px solid var(--unah-gold)"
    }}>
      <div style={{
        background: "var(--unah-blue)", color: "#fff",
        padding: "10px 14px", display: "flex", justifyContent: "space-between",
        alignItems: "center", cursor: "grab", userSelect: "none",
        letterSpacing: ".05em", fontSize: 11, fontWeight: 600, textTransform: "uppercase"
      }} onMouseDown={onMouseDown}>
        <span>Tweaks · CAN UNAH</span>
        <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: "14px" }}>
        <Section title="Modo de visualización">
          <select value={tweaks.viewMode || "map3d"} onChange={e => setTweak("viewMode", e.target.value)} style={selectStyle}>
            <option value="map3d">Mapa coroplético 3D</option>
            <option value="bivariate">Mapa bivariado (2 indicadores)</option>
            <option value="heatmap">Heatmap matricial de brechas</option>
            <option value="lisa">Clusters espaciales LISA</option>
            <option value="scatter">Explorador de correlaciones (scatter)</option>
            <option value="tipologias">Tipologías PCA + K-means</option>
          </select>
        </Section>

        <Section title="Indicador del mapa">
          <select value={tweaks.indicator} onChange={e => setTweak("indicator", e.target.value)} style={selectStyle}>
            {Object.entries(groups).map(([g, items]) => (
              <optgroup label={g} key={g}>
                {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Section>

        {tweaks.viewMode === "bivariate" && (
          <Section title="Segundo indicador (eje Y)">
            <select value={tweaks.indicator2 || "pct_mujeres"} onChange={e => setTweak("indicator2", e.target.value)} style={selectStyle}>
              {Object.entries(groups).map(([g, items]) => (
                <optgroup label={g} key={g}>
                  {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </optgroup>
              ))}
            </select>
          </Section>
        )}

        <Section title="Paleta de colores">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.keys(window.PALETTES).map(p => (
              <button key={p} onClick={() => setTweak("palette", p)}
                style={{
                  padding: "6px 8px", fontSize: 10, fontFamily: "inherit",
                  background: tweaks.palette === p ? "var(--unah-blue)" : "var(--unah-paper)",
                  color: tweaks.palette === p ? "#fff" : "var(--unah-ink)",
                  border: "1px solid var(--unah-line)", borderRadius: 6, cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 4, alignItems: "stretch"
                }}>
                <span style={{ textAlign: "left", textTransform: "capitalize" }}>{p.replace("_", " ")}</span>
                <span style={{ height: 6, borderRadius: 2, background: `linear-gradient(to right, ${window.PALETTES[p].join(",")})` }}></span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Vista 2D / 3D">
          <div style={{ display: "flex", gap: 6 }}>
            {[[true, "3D extrusión"], [false, "2D plano"]].map(([v, lab]) => (
              <button key={lab} onClick={() => setTweak("is3D", v)}
                style={{ ...segBtn, ...(tweaks.is3D === v ? segActive : {}) }}>{lab}</button>
            ))}
          </div>
        </Section>

        <Section title={`Altura de extrusión: ${tweaks.extrusionScale.toFixed(1)}×`}>
          <input type="range" min={0.2} max={3} step={0.1} value={tweaks.extrusionScale}
            onChange={e => setTweak("extrusionScale", parseFloat(e.target.value))}
            style={{ width: "100%" }} disabled={!tweaks.is3D} />
        </Section>

        <Section title="Tema">
          <div style={{ display: "flex", gap: 6 }}>
            {[[false, "Claro"], [true, "Oscuro"]].map(([v, lab]) => (
              <button key={lab} onClick={() => setTweak("darkMode", v)}
                style={{ ...segBtn, ...(tweaks.darkMode === v ? segActive : {}) }}>{lab}</button>
            ))}
          </div>
        </Section>

        <Section title="Etiquetas de departamentos">
          <div style={{ display: "flex", gap: 6 }}>
            {[[true, "Mostrar"], [false, "Ocultar"]].map(([v, lab]) => (
              <button key={lab} onClick={() => setTweak("showLabels", v)}
                style={{ ...segBtn, ...(tweaks.showLabels === v ? segActive : {}) }}>{lab}</button>
            ))}
          </div>
        </Section>

        <div style={{ fontSize: 10, color: "var(--unah-mute)", marginTop: 6, lineHeight: 1.4 }}>
          Los cambios se guardan automáticamente en el archivo.
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  width: "100%", padding: "6px 8px",
  border: "1px solid var(--unah-line)", borderRadius: 6,
  background: "var(--unah-paper)", color: "var(--unah-ink)",
  fontFamily: "inherit", fontSize: 12, outline: "none"
};
const segBtn = {
  flex: 1, padding: "6px 8px", fontSize: 11,
  background: "var(--unah-paper)", border: "1px solid var(--unah-line)",
  borderRadius: 6, cursor: "pointer", color: "var(--unah-ink-2)",
  fontFamily: "inherit"
};
const segActive = {
  background: "var(--unah-blue)", color: "#fff", borderColor: "var(--unah-blue)"
};

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--unah-mute)", marginBottom: 6, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

window.TweaksUI = TweaksUI;
