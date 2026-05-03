/* ============================================================================
   app.jsx · Componente raíz del Tablero CAN 2024 · OBSAN-UNAH
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC)
   Rol:   Especialista en Sistemas de Información — OBSAN
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Define el componente <App />, que es el "padre" de todo el tablero.
   Aquí se cargan los datos, se guarda el estado global (departamento
   seleccionado, tweaks del usuario, etc.) y se ensamblan las cuatro piezas
   visuales: cabecera, tira de KPIs, mapa + panel lateral, y pie de página.

   ¿POR QUÉ ESTÁ EN ".jsx" Y NO EN ".js"?
   JSX es una extensión de JavaScript que permite escribir HTML dentro del
   código (ej: <div>hola</div>). El navegador no lo entiende directamente,
   por eso en el HTML cargamos Babel — un compilador en el navegador que
   transforma JSX a JS válido. Para producción real conviene precompilar.

   ESTRUCTURA DE LA APLICACIÓN (árbol de componentes):
       <App>                         ← este archivo
         ├── <Header>                ← map.jsx
         ├── <KPIs>                  ← map.jsx
         ├── <div class="body">
         │     ├── <MapView>         ← map.jsx (mapa MapLibre 3D)
         │     └── <SidePanel>       ← side.jsx (detalle / ranking / etc.)
         ├── <Footer>                ← map.jsx
         └── <TweaksUI>              ← tweaks.jsx (panel de ajustes)
   ============================================================================ */

/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ============================================================================
// CONSTANTES Y FUNCIONES AUXILIARES (HELPERS)
// ----------------------------------------------------------------------------
// Las "helpers" son funciones pequeñas y reutilizables. Aquí: formato numérico.
// ============================================================================

/**
 * Formatea un número al estilo latino-hondureño:
 *   1.234.567,89  (punto = miles · coma = decimales)
 * Usamos Intl.NumberFormat con locale "de-DE" porque alemán usa la misma
 * convención y está soportado en todos los navegadores modernos.
 */
const fmtN = (n, d = 0) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: d, maximumFractionDigits: d
  }).format(n);
};

/** Formatea porcentaje:  0.234  →  "23.4%" */
const fmtPct = (n, d = 1) => (n == null ? "—" : `${(n * 100).toFixed(d)}%`);

/** Formato compacto: 1.500.000 → "1,50 M" · 4.500 → "4,5 mil" */
const fmtCompact = (n) => {
  if (n == null) return "—";
  if (n >= 1e6) return `${fmtN(n / 1e6, 2)} M`;
  if (n >= 1e3) return `${fmtN(n / 1e3, 1)} mil`;
  return fmtN(n);
};

// ============================================================================
// CATÁLOGO DE INDICADORES
// ----------------------------------------------------------------------------
// Cada indicador es una "vista" diferente del CAN 2024 que se puede mostrar
// en el mapa coroplético. El usuario los elige desde el selector flotante o
// desde el panel de Tweaks.
//
// Campos por indicador:
//   id       → llave en data/can_2024.json (ej: "productores_total")
//   g        → grupo (para agrupar en el dropdown)
//   label    → texto largo
//   short    → texto corto (para leyendas y tooltips)
//   unit     → unidad de medida ("ha", "TM", "%", etc.)
//   isPct    → si es porcentaje (afecta el formato)
// ============================================================================
const INDICATORS = [
  { id: "productores_total",     g: "Productor",     label: "Total de productores",                 unit: "productores", short: "Productores" },
  { id: "productores_mujeres",   g: "Productor",     label: "Productoras mujeres",                   unit: "productoras", short: "Mujeres" },
  { id: "pct_mujeres",           g: "Productor",     label: "% de productoras mujeres",              unit: "%",           short: "% Mujeres", isPct: true },
  { id: "explotaciones",         g: "Explotación",   label: "Total de explotaciones",                unit: "expl.",       short: "Explotaciones" },
  { id: "superficie_total",      g: "Explotación",   label: "Superficie total",                      unit: "ha",          short: "Superficie", decimals: 0 },
  { id: "sup_propio",            g: "Explotación",   label: "Superficie propia",                     unit: "ha",          short: "Sup. propia" },
  { id: "sup_arrendada",         g: "Explotación",   label: "Superficie arrendada",                  unit: "ha",          short: "Sup. arrendada" },
  { id: "gb_area_sembrada",      g: "Granos básicos",label: "Área sembrada de granos básicos",      unit: "ha",          short: "Área granos" },
  { id: "maiz_produccion_tm",    g: "Granos básicos",label: "Producción de maíz",                    unit: "TM",          short: "Maíz" },
  { id: "frijol_produccion_tm",  g: "Granos básicos",label: "Producción de frijol",                  unit: "TM",          short: "Frijol" },
  { id: "arroz_produccion_tm",   g: "Granos básicos",label: "Producción de arroz",                   unit: "TM",          short: "Arroz" },
  { id: "cafe_produccion",       g: "Cultivos perm.",label: "Producción de café",                    unit: "TM",          short: "Café" },
  { id: "cafe_area",             g: "Cultivos perm.",label: "Área de café sembrada",                unit: "ha",          short: "Área café" },
  { id: "bovinos_existencias",   g: "Pecuario",      label: "Cabezas de bovino",                     unit: "cabezas",     short: "Bovinos" },
  { id: "porcinos_existencias",  g: "Pecuario",      label: "Cabezas de porcino",                    unit: "cabezas",     short: "Porcinos" },
  { id: "aves_existencias",      g: "Pecuario",      label: "Aves de corral",                        unit: "aves",        short: "Aves" },
  { id: "leche_litros",          g: "Pecuario",      label: "Producción de leche",                   unit: "litros",      short: "Leche" },
  { id: "riego_superficie",      g: "Técnicas",      label: "Superficie con riego",                  unit: "ha",          short: "Riego" },
  { id: "at_pct",                g: "Técnicas",      label: "% explotaciones con asistencia técnica",unit: "%",           short: "% Asist. téc.", isPct: true },
  { id: "credito_pct",           g: "Técnicas",      label: "% explotaciones con crédito",           unit: "%",           short: "% Crédito", isPct: true },
  { id: "maquinaria_pct",        g: "Técnicas",      label: "% explotaciones con maquinaria",        unit: "%",           short: "% Maquinaria", isPct: true },
];

// ============================================================================
// PALETAS DE COLORES PARA EL CHOROPLETH
// ----------------------------------------------------------------------------
// Una "paleta secuencial" va de un color claro a uno oscuro y se usa cuando
// los valores van de menor a mayor (ej: pocos productores → muchos).
// Una "paleta divergente" tiene un color neutro al medio y dos extremos
// distintos (útil si quisiéramos comparar contra una media).
// ============================================================================
const PALETTES = {
  unah_blue: ["#E6EDF7", "#BFD0E8", "#7AA4D1", "#3672B4", "#0B4894", "#002E6D"], // Azul institucional UNAH
  unah_gold: ["#FBF4DD", "#F2DD92", "#E2B947", "#B98718", "#7E5C0E", "#4A3608"], // Oro académico
  divergent: ["#0B4894", "#5C8AC2", "#BFD0E8", "#F2EFE0", "#F2DD92", "#C9A227", "#7E5C0E"],
  viridis:   ["#440154","#3b528b","#21918c","#5ec962","#fde725"],
  forest:    ["#EAF2EA", "#B5D4B8", "#79B086", "#3F8754", "#1A5B30", "#0A3E1F"],
};

// ============================================================================
// VALORES POR DEFECTO DE LOS "TWEAKS"
// ----------------------------------------------------------------------------
// Los marcadores /*EDITMODE-BEGIN*/ y /*EDITMODE-END*/ permiten que el editor
// de la plataforma reescriba estos defaults cuando el usuario los cambie.
// Para uso normal en GitHub puedes ignorar esos comentarios — son JSON válido.
// ============================================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "indicator": "productores_total",  // indicador inicial mostrado en el mapa
  "palette": "unah_blue",            // paleta de color por defecto
  "is3D": true,                      // si las extrusiones 3D están activas
  "darkMode": false,                 // tema claro u oscuro
  "showLabels": true,                // (reservado) etiquetas de departamento
  "extrusionScale": 1.0              // multiplicador de altura de las barras 3D
}/*EDITMODE-END*/;

// ============================================================================
// HOOK: useData()
// ----------------------------------------------------------------------------
// Un "hook" en React es una función que permite que un componente "se acuerde"
// de cosas (estado) o ejecute efectos (peticiones, suscripciones, etc.).
//
// useData carga en paralelo:
//   - data/can_2024.json              (datos tabulares por departamento)
//   - data/honduras_departamentos.geojson (polígonos del mapa)
// y los devuelve como { data, geo }. Mientras carga, ambos son null.
// ============================================================================
function useData() {
  const [data, setData] = useState(null);
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    Promise.all([
      fetch("data/can_2024.json").then(r => r.json()),
      fetch("data/honduras_departamentos.geojson").then(r => r.json()),
    ]).then(([d, g]) => { setData(d); setGeo(g); });
  }, []); // [] = correr solo una vez al montar el componente
  return { data, geo };
}

// ============================================================================
// FUNCIÓN: valueToColor()
// ----------------------------------------------------------------------------
// Convierte un valor numérico a un color de la paleta, interpolando
// linealmente entre los "stops" (paradas) de color.
//
//   Ej: si la paleta tiene 6 colores y el valor está al 50% del rango,
//       devuelve la mezcla del color 3 con el color 4.
// ============================================================================
function valueToColor(v, min, max, palette) {
  if (v == null || isNaN(v)) return "#cccccc";
  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1))); // normalizar 0..1
  const colors = PALETTES[palette];
  const i = t * (colors.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  const f = i - lo;
  // interpolación lineal entre dos colores hex
  const lerp = (a, b) => Math.round(a + (b - a) * f);
  const parse = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = parse(colors[lo]);
  const [r2,g2,b2] = parse(colors[hi]);
  return `rgb(${lerp(r1,r2)},${lerp(g1,g2)},${lerp(b1,b2)})`;
}

// ============================================================================
// COMPONENTE PRINCIPAL: <App />
// ----------------------------------------------------------------------------
// Orquesta TODO. Maneja:
//   1) Carga de datos                              (useData)
//   2) Estado de tweaks (indicador, paleta, 3D…)   (useState)
//   3) Selección del usuario (departamento, hover) (useState)
//   4) Comunicación con el panel de Tweaks         (postMessage)
//   5) Render del árbol completo
// ============================================================================
function App() {
  // 1) Datos
  const { data, geo } = useData();

  // 2) Tweaks (ajustes del usuario)
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS);
  const setTweak = (k, v) => setTweaksState(s => ({ ...s, [k]: v }));

  // 2.b) Persistir cambios de tweaks hacia el "host" (la plataforma editora).
  //      En despliegue normal en GitHub Pages, el host no existe y postMessage
  //      no hace nada — es seguro dejarlo.
  useEffect(() => {
    window.parent?.postMessage?.({ type: "__edit_mode_set_keys", edits: tweaks }, "*");
  }, [tweaks]);

  // 2.c) Puente: el dropdown del mapa dispara un CustomEvent que aquí se
  //      traduce a setTweak("indicator", ...). Evita acoplar componentes.
  useEffect(() => {
    const onSet = (e) => setTweak("indicator", e.detail);
    window.addEventListener("set-indicator", onSet);
    return () => window.removeEventListener("set-indicator", onSet);
  }, []);

  // 2.d) Toggle del panel de Tweaks (comunicación con la plataforma editora)
  const [tweaksOpen, setTweaksOpen] = useState(false);
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage?.({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // 3) Selección del usuario en el mapa
  const [selected, setSelected]   = useState(null); // departamento seleccionado
  const [compareWith, setCompareWith] = useState(null); // departamento a comparar
  const [hover, setHover]         = useState(null); // {name,value,x,y} del cursor

  // 4) Aplicar tema claro/oscuro al <html> (variables CSS)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.darkMode ? "dark" : "light");
  }, [tweaks.darkMode]);

  // 5) Pantalla de carga mientras los datos llegan
  if (!data || !geo) {
    return <div style={{padding:40, color:"var(--unah-mute)"}}>Cargando datos del Censo Agropecuario…</div>;
  }

  // 6) Calcular min/max del indicador activo (para escalar la paleta)
  const ind = INDICATORS.find(i => i.id === tweaks.indicator) || INDICATORS[0];
  const values = Object.values(data.departamentos).map(d => d[ind.id]).filter(v => v != null && !isNaN(v));
  const minV = Math.min(...values), maxV = Math.max(...values);

  // 7) Render del árbol
  return (
    <div className="app">
      <Header total={data.total} />
      <KPIs total={data.total} />
      <div className="body">
        <MapView
          geo={geo} data={data} indicator={ind}
          minV={minV} maxV={maxV}
          tweaks={tweaks} setTweak={setTweak}
          selected={selected} setSelected={setSelected}
          compareWith={compareWith}
          setHover={setHover} hover={hover}
        />
        <SidePanel
          data={data} indicator={ind}
          minV={minV} maxV={maxV}
          selected={selected} setSelected={setSelected}
          compareWith={compareWith} setCompareWith={setCompareWith}
          tweaks={tweaks}
        />
      </div>
      <Footer />
      {tweaksOpen && (
        <TweaksUI
          tweaks={tweaks} setTweak={setTweak}
          onClose={() => {
            setTweaksOpen(false);
            window.parent?.postMessage?.({ type: "__edit_mode_dismissed" }, "*");
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS GLOBALES
// ----------------------------------------------------------------------------
// Como cada <script type="text/babel"> tiene su propio scope, exponemos las
// funciones y constantes en `window` para que map.jsx, side.jsx y tweaks.jsx
// puedan usarlas (window.fmtN, window.INDICATORS, etc.).
// ============================================================================
window.App           = App;
window.INDICATORS    = INDICATORS;
window.PALETTES      = PALETTES;
window.fmtN          = fmtN;
window.fmtPct        = fmtPct;
window.fmtCompact    = fmtCompact;
window.valueToColor  = valueToColor;
