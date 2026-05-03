/* ============================================================================
   map.jsx · Mapa coroplético 3D + cabecera, KPIs y pie de página
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Define cuatro componentes:
     - <Header />   Barra superior azul con logo "CAMC" y título institucional.
     - <KPIs />     Tira de 6 indicadores nacionales (productores, café…).
     - <Footer />   Pie con descripción del OBSAN, equipo y recursos.
     - <MapView />  El mapa MapLibre 3D con choropleth y barras extruidas.

   TECNOLOGÍA DEL MAPA: MapLibre GL JS
     Librería open source (fork de Mapbox GL) que renderiza mapas vectoriales
     con WebGL — por eso podemos hacer extrusiones 3D animadas de los
     departamentos. Documentación: https://maplibre.org/

   FLUJO DEL MAPA:
     1. useMemo "augmented" toma cada polígono del GeoJSON y le agrega tres
        propiedades calculadas: value (valor del indicador activo), color
        (hex desde la paleta) y height (altura para la extrusión 3D).
     2. useEffect "init map" crea el mapa, le agrega un fondo y, cuando el
        estilo está listo, llama setupLayers() para meter las capas:
          · deptos-fill   → choropleth 2D
          · deptos-3d     → extrusión 3D
          · deptos-line   → contorno blanco entre departamentos
        Hay un fallback con setInterval por si los eventos load/styledata
        no disparan (ocurre con estilos vacíos).
     3. useEffects posteriores reaccionan a cambios de "augmented" o de
        tweaks (modo oscuro, 2D/3D…) y actualizan el mapa sin recrearlo.
   ============================================================================ */
/* global React, maplibregl */
const { useEffect, useRef, useState, useMemo } = React;

// ----------------------------------------------------------------------------
// <Header />  Barra superior con marca CAMC y título OBSAN.
// ----------------------------------------------------------------------------
function Header({ total }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">CAMC</div>
        <div className="brand-text">
          <div className="t1">UNAH · Observatorio en Seguridad Alimentaria y Nutricional (OBSAN)</div>
          <div className="t2">Censo Agropecuario Nacional · CAN 2024</div>
        </div>
      </div>
      <div className="header-meta">
        <div><strong>Datos preliminares</strong> · año agrícola 2023–2024</div>
        <div>Fuente: Instituto Nacional de Estadística (INE)</div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------------------
// <KPIs />  Seis cifras nacionales en una tira horizontal bajo el header.
// ----------------------------------------------------------------------------
function KPIs({ total }) {
  const items = [
    { lab: "Productores", val: window.fmtN(total.productores_total), sub: `${window.fmtPct(total.pct_hombres,1)} H · ${window.fmtPct(total.pct_mujeres,1)} M` },
    { lab: "Explotaciones", val: window.fmtN(total.explotaciones), sub: "a nivel nacional" },
    { lab: "Superficie total", val: window.fmtN(total.superficie_total, 0), sub: "hectáreas" },
    { lab: "Maíz · producción", val: window.fmtN(total.maiz_produccion_tm, 0), sub: "toneladas métricas" },
    { lab: "Café · producción", val: window.fmtN(total.cafe_produccion, 0), sub: "TM · cultivo permanente" },
    { lab: "Bovinos", val: window.fmtN(total.bovinos_existencias, 0), sub: "cabezas (sept · 2024)" },
  ];
  return (
    <div className="kpi-strip">
      {items.map((it, i) => (
        <div className="kpi" key={i}>
          <div className="kpi-label">{it.lab}</div>
          <div className="kpi-value">{it.val}</div>
          <div className="kpi-sub">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

window.Header = Header;
window.KPIs = KPIs;

// ----------------------------------------------------------------------------
// <Footer />  Pie de sistema con la descripción del OBSAN, equipo y recursos.
// ----------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        <div className="footer-col">
          <div className="footer-title">Observatorio en Seguridad Alimentaria y Nutricional</div>
          <p className="footer-text">
            Adscrito al <strong>Instituto de Investigaciones Sociales (IIS)</strong> de la Facultad de Ciencias Sociales (FCCSS) de la Universidad Nacional Autónoma de Honduras (UNAH).
          </p>
          <p className="footer-text">
            El OBSAN tiene como propósito generar evidencia académica, investigación aplicada y análisis de información estratégica que aporte al debate público sobre seguridad alimentaria, desarrollo humano y políticas alimentarias en Honduras.
          </p>
        </div>
        <div className="footer-col">
          <div className="footer-title">Equipo</div>
          <div className="footer-author">
            <div className="footer-author-name">Christian Alexis Manzanares Cruz</div>
            <div className="footer-author-meta">Especialista en Sistemas de Información · OBSAN</div>
            <div className="footer-author-meta">
              ORCID <a href="https://orcid.org/0009-0004-7419-0449" target="_blank" rel="noopener">0009-0004-7419-0449</a>
            </div>
            <div className="footer-author-meta">Tegucigalpa, M.D.C. · Honduras</div>
          </div>
        </div>
        <div className="footer-col">
          <div className="footer-title">Recursos</div>
          <ul className="footer-links">
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); }}>Volver al inicio del tablero</a></li>
            <li><a href="https://obsan.unah.edu.hn/" target="_blank" rel="noopener">OBSAN — UNAH ↗</a></li>
            <li><a href="https://www.ine.gob.hn/" target="_blank" rel="noopener">CAN 2024 (INE) ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bar">
        <div>© 2024 OBSAN · UNAH · Datos: Censo Agropecuario Nacional 2024 (INE)</div>
        <div>Tablero v1.0 · Actualizado mayo 2025</div>
      </div>
    </footer>
  );
}
window.Footer = Footer;

// ============================================================================
// <MapView />  Mapa MapLibre 3D + selector de indicador + leyenda + tooltip
// ============================================================================
function MapView({ geo, data, indicator, minV, maxV, tweaks, selected, setSelected, compareWith, setHover, hover }) {
  const mapRef = useRef(null);          // referencia al objeto maplibregl.Map
  const containerRef = useRef(null);    // <div> donde se monta el canvas WebGL
  const [ready, setReady] = useState(false); // true cuando las capas ya cargaron

  // --------------------------------------------------------------------------
  // PASO 1 · "augmented": para cada polígono del GeoJSON, calcular el valor
  // del indicador activo, su color en la paleta y la altura de la extrusión.
  // useMemo evita recalcular si las dependencias no cambiaron.
  // --------------------------------------------------------------------------
  const augmented = useMemo(() => {
    const features = geo.features.map(f => {
      const name = f.properties.name;
      const dep = data.departamentos[name];
      const v = dep ? dep[indicator.id] : null;
      const t = v == null ? 0 : Math.max(0, Math.min(1, (v - minV) / (maxV - minV || 1)));
      const color = window.valueToColor(v, minV, maxV, tweaks.palette) || "#cccccc";
      const height = tweaks.is3D ? Math.max(2000, t * 80000 * (tweaks.extrusionScale || 1)) : 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          value: v == null ? -1 : v,
          tNorm: t,
          color: String(color),
          height: Number.isFinite(height) ? height : 0,
        }
      };
    });
    return { type: "FeatureCollection", features };
  }, [geo, data, indicator, minV, maxV, tweaks.palette, tweaks.is3D, tweaks.extrusionScale]);

  // init map
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          { id: "bg", type: "background", paint: { "background-color": tweaks.darkMode ? "#060E22" : "#E8E5D6" } }
        ],
      },
      center: [-86.5, 14.7],
      zoom: 6.4,
      pitch: tweaks.is3D ? 50 : 0,
      bearing: tweaks.is3D ? -15 : 0,
      antialias: true,
      attributionControl: false,
    });
    mapRef.current = map;
    if (typeof window !== 'undefined') window.__map = map;
    const setupLayers = () => {
      if (map.getSource("deptos")) return;
      map.addSource("deptos", { type: "geojson", data: augmented });
      // base fill (2D choropleth)
      map.addLayer({
        id: "deptos-fill",
        type: "fill",
        source: "deptos",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": tweaks.is3D ? 0.0 : 0.92,
        }
      });
      // 3D extrusion
      map.addLayer({
        id: "deptos-3d",
        type: "fill-extrusion",
        source: "deptos",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.92,
        }
      });
      // outline
      map.addLayer({
        id: "deptos-line",
        type: "line",
        source: "deptos",
        paint: {
          "line-color": tweaks.darkMode ? "#0A1430" : "#FFFFFF",
          "line-width": 0.6,
        }
      });

      // hover
      map.on("mousemove", "deptos-fill", (e) => onHover(e));
      map.on("mousemove", "deptos-3d", (e) => onHover(e));
      function onHover(e) {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "pointer";
        const f = e.features[0];
        setHover({ name: f.properties.name, value: f.properties.value, x: e.point.x, y: e.point.y });
      }
      const onLeave = () => { map.getCanvas().style.cursor = ""; setHover(null); };
      map.on("mouseleave", "deptos-fill", onLeave);
      map.on("mouseleave", "deptos-3d", onLeave);

      // click
      const onClick = (e) => {
        if (!e.features?.length) return;
        setSelected(e.features[0].properties.name);
      };
      map.on("click", "deptos-fill", onClick);
      map.on("click", "deptos-3d", onClick);

      setReady(true);
    };
    const trySetup = () => {
      if (map.getSource("deptos")) return;
      if (!map.isStyleLoaded()) return;
      setupLayers();
    };
    map.on("load", trySetup);
    map.on("styledata", trySetup);
    if (map.isStyleLoaded()) trySetup();
    // polling fallback — events sometimes don't fire for empty styles
    const pollId = setInterval(() => {
      if (map.getSource("deptos")) { clearInterval(pollId); return; }
      if (map.isStyleLoaded()) {
        try { setupLayers(); } catch (e) { /* ignore */ }
      }
    }, 100);
    setTimeout(() => clearInterval(pollId), 5000);

    return () => { clearInterval(pollId); map.remove(); };
  }, []); // init once

  // update data
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    const src = map.getSource("deptos");
    if (src) src.setData(augmented);
  }, [augmented, ready]);

  // update style based on tweaks
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    map.setPaintProperty("bg", "background-color", tweaks.darkMode ? "#060E22" : "#E8E5D6");
    map.setPaintProperty("deptos-line", "line-color", tweaks.darkMode ? "#0A1430" : "#FFFFFF");
    map.setPaintProperty("deptos-fill", "fill-opacity", tweaks.is3D ? 0.0 : 0.92);
    map.easeTo({ pitch: tweaks.is3D ? 50 : 0, bearing: tweaks.is3D ? -15 : 0, duration: 700 });
  }, [tweaks.darkMode, tweaks.showLabels, tweaks.is3D, ready]);

  // selected outline
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    map.setPaintProperty("deptos-line", "line-width",
      ["case", ["==", ["get", "name"], selected || ""], 2.5, 0.6]);
  }, [selected, ready]);

  const indicatorOptions = useMemo(() => {
    const groups = {};
    window.INDICATORS.forEach(i => { groups[i.g] = groups[i.g] || []; groups[i.g].push(i); });
    return groups;
  }, []);

  const fmt = (v) => {
    if (v == null) return "—";
    if (indicator.isPct) return window.fmtPct(v, 1);
    return window.fmtN(v, 0);
  };

  return (
    <div className="map-wrap">
      <div ref={containerRef} style={{position:"absolute", inset:0}} />

      <div className="map-controls">
        <div className="indicator-pill">
          <div className="label">Indicador en el mapa</div>
          <select value={indicator.id} onChange={e => window.__setIndicator?.(e.target.value)}>
            {Object.entries(indicatorOptions).map(([g, items]) => (
              <optgroup label={g} key={g}>
                {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="compass">
        <button onClick={() => mapRef.current?.zoomIn()} title="Acercar">+</button>
        <button onClick={() => mapRef.current?.zoomOut()} title="Alejar">−</button>
        <button onClick={() => mapRef.current?.easeTo({ center:[-86.5,14.7], zoom:6.4, pitch:tweaks.is3D?50:0, bearing:tweaks.is3D?-15:0 })} title="Restablecer">⌖</button>
      </div>

      <div className="legend">
        <div className="legend-title">{indicator.short} · {indicator.unit}</div>
        <div className="legend-bar" style={{
          "--lg-stops": window.PALETTES[tweaks.palette].join(", ")
        }}></div>
        <div className="legend-axis">
          <span>{fmt(minV)}</span>
          <span>{fmt((minV+maxV)/2)}</span>
          <span>{fmt(maxV)}</span>
        </div>
      </div>

      {hover && (
        <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="name">{hover.name}</div>
          <div className="val">{fmt(hover.value)}</div>
          <div className="sub">{indicator.unit}</div>
        </div>
      )}
    </div>
  );
}

window.MapView = MapView;
