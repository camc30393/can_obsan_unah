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
 * Formato numérico para Honduras / Latinoamérica solicitado por el autor:
 *   1,234,567.89   (coma = miles · punto = decimales)
 * Se usa el locale "en-US" porque sigue exactamente esa convención,
 * que es la oficialmente adoptada por el OBSAN-UNAH para sus tableros.
 */
const fmtN = (n, d = 0) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d, maximumFractionDigits: d
  }).format(n);
};

/** Formatea porcentaje:  0.234  →  "23.4%" (punto decimal estilo en-US) */
const fmtPct = (n, d = 1) => {
  if (n == null || isNaN(n)) return "—";
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n * 100)}%`;
};

/** Formato compacto: 1,500,000 → "1.50 M" · 4,500 → "4.5 mil" */
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
//   id       → llave en datos/can_2024.json (ej: "productores_total")
//   g        → grupo (para agrupar en el dropdown)
//   label    → texto largo
//   short    → texto corto (para leyendas y tooltips)
//   unit     → unidad de medida ("ha", "TM", "%", etc.)
//   isPct    → si es porcentaje (afecta el formato)
//   info     → descripción metodológica (mostrada en el icono "i")
//   pillar   → pilar SAN al que aporta (Disponibilidad / Acceso / Estabilidad / Utilización)
// ============================================================================
const INDICATORS = [
  // ── INDICADORES NUTRICIONALES (Disponibilidad alimentaria efectiva) ──
  { id: "kcal_cap_dia", g: "Nutrición · Disponibilidad", label: "Calorías per cápita por día", unit: "kcal/día", short: "kcal/cap·día", decimals: 0,
    info: "Aporte calórico per cápita diario derivado de la producción local de granos básicos (maíz + frijol + arroz). Calculado con factores nutricionales INCAP. Requerimiento mínimo FAO/OMS: 2,100 kcal/día. Aporta al pilar Disponibilidad de la SAN.",
    pillar: "Disponibilidad" },
  { id: "prot_cap_dia", g: "Nutrición · Disponibilidad", label: "Proteína per cápita por día", unit: "g/día", short: "Proteína/cap·día", decimals: 1,
    info: "Aporte proteico per cápita diario derivado de la producción local de granos básicos. Requerimiento FAO: 50 g/día. Indicador clave para detectar déficits proteicos en territorios deficitarios.",
    pillar: "Disponibilidad" },
  { id: "rar_calorica", g: "Nutrición · Disponibilidad", label: "RAR calórica · razón de adecuación", unit: "razón", short: "RAR cal.", isPct: true,
    info: "Razón de Adecuación de Requerimientos calóricos: producción local en kcal/cap·día ÷ requerimiento mínimo (2,100 kcal). RAR > 1.0 indica autosuficiencia calórica; RAR < 1.0 indica déficit que debe cubrirse con importaciones, ayudas o producción no censada. Indicador robusto para mapear vulnerabilidad alimentaria.",
    pillar: "Disponibilidad" },
  { id: "rar_proteica", g: "Nutrición · Disponibilidad", label: "RAR proteica", unit: "razón", short: "RAR prot.", isPct: true,
    info: "Razón de Adecuación de Requerimientos proteicos: producción local en g proteína/cap·día ÷ requerimiento mínimo (50 g). Aporta a Disponibilidad con énfasis en calidad nutricional del aporte alimentario local.",
    pillar: "Disponibilidad" },
  { id: "diversidad_rubros", g: "Nutrición · Disponibilidad", label: "Diversidad de rubros productivos", unit: "rubros", short: "Diversidad", decimals: 0,
    info: "Número de grandes rubros con producción significativa en el departamento (granos básicos, anuales, permanentes, café, ganadería bovina). Mayor diversidad implica mayor resiliencia ante shocks. Aporta a Estabilidad.",
    pillar: "Estabilidad" },
  { id: "ha_por_productor", g: "Equidad · Acceso", label: "Escala productiva (ha/productor)", unit: "ha/prod.", short: "ha/prod.", decimals: 1,
    info: "Hectáreas promedio por productor. Indicador de la estructura agraria: valores bajos sugieren minifundio (acceso restringido a la tierra); valores altos, concentración.",
    pillar: "Acceso" },
  { id: "ratio_mujeres_hombres", g: "Equidad · Acceso", label: "Ratio productoras mujeres/hombres", unit: "ratio", short: "Ratio M/H", decimals: 2,
    info: "Productoras mujeres dividido productores hombres. Métrica de feminización rural; valores cercanos a 1 = paridad.",
    pillar: "Acceso" },

  // ── ÍNDICES COMPUESTOS SAN ──
  { id: "idal_kg_capita", g: "Índices SAN", label: "IDAL · Disponibilidad alimentaria local", unit: "kg/hab·año", short: "IDAL", decimals: 0,
    info: "Índice de Disponibilidad Alimentaria Local. Producción anual de granos básicos (maíz + frijol) dividida por la población departamental, expresada en kilogramos por habitante al año. Aporta al pilar SAN de Disponibilidad. Fuente: CAN 2024 + proyecciones de población INE 2024.",
    pillar: "Disponibilidad" },
  { id: "idp_shannon", g: "Índices SAN", label: "IDP · Diversificación productiva", unit: "0–1", short: "IDP", isPct: true,
    info: "Índice de Diversificación Productiva (Shannon-Weaver normalizado, 0 = monocultivo, 1 = máxima diversificación). Calculado sobre la proporción de área dedicada a 5 rubros: granos básicos, anuales, permanentes, café y descanso. Aporta a la Estabilidad del sistema alimentario.",
    pillar: "Estabilidad" },
  { id: "ivpd", g: "Índices SAN", label: "IVPD · Vulnerabilidad productiva", unit: "0–1", short: "IVPD", isPct: true,
    info: "Índice de Vulnerabilidad Productiva Departamental. Promedio simple de cuatro brechas: % sin asistencia técnica, % sin crédito, % sin maquinaria, % sin riego. Valores altos (cercanos a 1) indican mayor vulnerabilidad. Aporta al pilar SAN de Acceso (a medios de producción).",
    pillar: "Acceso" },
  { id: "autosuficiencia", g: "Índices SAN", label: "Autosuficiencia · ratio granos / superficie", unit: "0–1", short: "Autosufic.", isPct: true,
    info: "Ratio de Autosuficiencia. Proporción de la superficie agropecuaria del departamento dedicada a granos básicos. Valores altos sugieren orientación a la subsistencia familiar; valores bajos, especialización hacia cultivos comerciales. Aporta a Disponibilidad y Estabilidad.",
    pillar: "Disponibilidad" },
  { id: "productores_por_mil_hab", g: "Índices SAN", label: "Densidad productiva · prod./1,000 hab", unit: "prod/1k hab", short: "Densidad prod.", decimals: 1,
    info: "Productores agropecuarios por cada 1,000 habitantes. Aproximación a la ruralidad y dependencia económica del sector primario en el departamento.",
    pillar: "Acceso" },

  // ── Indicadores base del CAN ──
  { id: "productores_total",     g: "Productor",     label: "Total de productores",                 unit: "productores", short: "Productores",
    info: "Total de personas naturales u organizaciones que ejercen la dirección técnica y económica de una o más explotaciones agropecuarias en el departamento." },
  { id: "productores_mujeres",   g: "Productor",     label: "Productoras mujeres",                   unit: "productoras", short: "Mujeres",
    info: "Mujeres registradas como productoras principales de la explotación. Indicador de feminización rural." },
  { id: "pct_mujeres",           g: "Productor",     label: "% de productoras mujeres",              unit: "%",           short: "% Mujeres", isPct: true,
    info: "Proporción de mujeres dentro del total de productores. Métrica clave de equidad de género en el agro." },
  { id: "explotaciones",         g: "Explotación",   label: "Total de explotaciones",                unit: "expl.",       short: "Explotaciones",
    info: "Unidad económica dedicada a actividades agropecuarias bajo una única dirección técnica y económica, sin importar régimen de tenencia." },
  { id: "superficie_total",      g: "Explotación",   label: "Superficie total",                      unit: "ha",          short: "Superficie", decimals: 0,
    info: "Superficie total bajo manejo agropecuario en el departamento, en hectáreas (1 ha = 10,000 m²)." },
  { id: "sup_propio",            g: "Explotación",   label: "Superficie propia",                     unit: "ha",          short: "Sup. propia",
    info: "Superficie agropecuaria en régimen de propiedad privada del productor." },
  { id: "sup_arrendada",         g: "Explotación",   label: "Superficie arrendada",                  unit: "ha",          short: "Sup. arrendada",
    info: "Superficie agropecuaria obtenida mediante contrato de arrendamiento o aparcería." },
  { id: "gb_area_sembrada",      g: "Granos básicos",label: "Área sembrada de granos básicos",      unit: "ha",          short: "Área granos",
    info: "Hectáreas sembradas con maíz, frijol, arroz y sorgo/maicillo en el ciclo agrícola 2023–2024." },
  { id: "maiz_produccion_tm",    g: "Granos básicos",label: "Producción de maíz",                    unit: "TM",          short: "Maíz",
    info: "Producción de maíz en grano (incluye primera y postrera). 1 tonelada métrica = 1,000 kg." },
  { id: "frijol_produccion_tm",  g: "Granos básicos",label: "Producción de frijol",                  unit: "TM",          short: "Frijol",
    info: "Producción total de frijol en el departamento, en toneladas métricas." },
  { id: "arroz_produccion_tm",   g: "Granos básicos",label: "Producción de arroz",                   unit: "TM",          short: "Arroz",
    info: "Producción de arroz oro (equivalente, factor de conversión 65 lb/100 lb)." },
  { id: "cafe_produccion",       g: "Cultivos perm.",label: "Producción de café",                    unit: "TM",          short: "Café",
    info: "Producción anual de café — principal cultivo permanente y rubro de exportación." },
  { id: "cafe_area",             g: "Cultivos perm.",label: "Área de café sembrada",                unit: "ha",          short: "Área café",
    info: "Hectáreas con plantaciones de café, en producción y plantillo." },
  { id: "bovinos_existencias",   g: "Pecuario",      label: "Cabezas de bovino",                     unit: "cabezas",     short: "Bovinos",
    info: "Número de cabezas de ganado bovino registradas en la fecha de referencia (1 de septiembre 2024)." },
  { id: "porcinos_existencias",  g: "Pecuario",      label: "Cabezas de porcino",                    unit: "cabezas",     short: "Porcinos",
    info: "Número de cabezas de ganado porcino registradas en la explotación." },
  { id: "aves_existencias",      g: "Pecuario",      label: "Aves de corral",                        unit: "aves",        short: "Aves",
    info: "Total de aves de corral (gallinas, pollos, pavos, etc.) en la fecha de referencia." },
  { id: "leche_litros",          g: "Pecuario",      label: "Producción de leche",                   unit: "litros",      short: "Leche",
    info: "Producción promedio diaria de leche, expresada en litros (consultar nota técnica para periodo de referencia)." },
  { id: "riego_superficie",      g: "Técnicas",      label: "Superficie con riego",                  unit: "ha",          short: "Riego",
    info: "Hectáreas bajo cualquier sistema de riego (aspersión, goteo, gravedad, pivote, cañón)." },
  { id: "at_pct",                g: "Técnicas",      label: "% explotaciones con asistencia técnica",unit: "%",           short: "% Asist. téc.", isPct: true,
    info: "Proporción de explotaciones que recibieron asistencia técnica de cualquier proveedor (público, privado, ONG)." },
  { id: "credito_pct",           g: "Técnicas",      label: "% explotaciones con crédito",           unit: "%",           short: "% Crédito", isPct: true,
    info: "Proporción de explotaciones que utilizaron crédito formal para la actividad productiva." },
  { id: "maquinaria_pct",        g: "Técnicas",      label: "% explotaciones con maquinaria",        unit: "%",           short: "% Maquinaria", isPct: true,
    info: "Proporción de explotaciones que poseían maquinaria propia (tractores, motocultores, etc.)." },
];

// ============================================================================
// PALETAS DE COLORES PARA EL CHOROPLETH
// ----------------------------------------------------------------------------
// Paleta institucional UNAH/OBSAN:
//   - Azul institucional   #00213D
//   - Dorado académico     #C8A415
//   - Verde SAN            #0F766E  (Pilar SAN, indicadores favorables)
// ============================================================================
const PALETTES = {
  unah_blue: ["#E8EEF5", "#B5C5D8", "#7A95B6", "#3E6991", "#1A4063", "#00213D"], // Azul institucional UNAH
  unah_gold: ["#FBF4DD", "#F1DD86", "#DDB840", "#B58614", "#7B5A0B", "#42310A"], // Dorado académico
  san_green: ["#E7F2F0", "#B5DAD3", "#7BBFB3", "#3D9A8C", "#0F766E", "#06433D"], // Verde SAN (pilar de utilización)
  divergent: ["#1A4063", "#5C8AC2", "#C7D5E6", "#F2EFE0", "#EDD68A", "#C8A415", "#7B5A0B"],
  viridis:   ["#440154","#3b528b","#21918c","#5ec962","#fde725"],
  forest:    ["#EAF2EA", "#B5D4B8", "#79B086", "#3F8754", "#1A5B30", "#0A3E1F"],
};

// ============================================================================
// PALETA BIVARIADA (3×3) — combina dos indicadores en una sola dimensión
// ----------------------------------------------------------------------------
// Estándar en visualización de mapas bivariados: cada celda representa una
// combinación de tercil de X (eje horizontal) y tercil de Y (eje vertical).
// Esquema: azul UNAH (X) × oro académico (Y) → púrpura/marrón en la diagonal.
// Índices [0..8] = fila * 3 + columna, fila 0 = Y bajo, fila 2 = Y alto.
// ============================================================================
// Paleta bivariada actualizada con la nueva identidad (azul × dorado × verde)
const BIVARIATE_PALETTE = [
  "#E8E5D6", "#B5C5D8", "#3E6991",
  "#EDD68A", "#9B9B82", "#3D5577",
  "#C8A415", "#7E704A", "#243F58",
];
// ----------------------------------------------------------------------------
// Los marcadores /*EDITMODE-BEGIN*/ y /*EDITMODE-END*/ permiten que el editor
// de la plataforma reescriba estos defaults cuando el usuario los cambie.
// Para uso normal en GitHub puedes ignorar esos comentarios — son JSON válido.
// ============================================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "indicator": "productores_total",
  "indicator2": "pct_mujeres",
  "viewMode": "map3d",
  "palette": "unah_blue",
  "is3D": true,
  "darkMode": false,
  "showLabels": true,
  "extrusionScale": 1.0
}/*EDITMODE-END*/;
// indicator       → indicador principal (mapa coroplético)
// indicator2      → segundo indicador (solo para viewMode "bivariate")
// viewMode        → "map3d" | "bivariate" | "heatmap"
// palette         → paleta de color secuencial (ver PALETTES arriba)
// is3D            → extrusiones 3D activas
// darkMode        → tema oscuro
// showLabels      → (reservado) etiquetas de departamento
// extrusionScale  → multiplicador de altura de las barras 3D

// ============================================================================
// HOOK: useData()
// ----------------------------------------------------------------------------
// Un "hook" en React es una función que permite que un componente "se acuerde"
// de cosas (estado) o ejecute efectos (peticiones, suscripciones, etc.).
//
// useData carga en paralelo:
//   - datos/can_2024.json              (datos tabulares por departamento)
//   - datos/honduras_departamentos.geojson (polígonos del mapa)
// y los devuelve como { data, geo }. Mientras carga, ambos son null.
// ============================================================================
function useData() {
  const [data, setData] = useState(null);
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    Promise.all([
      fetch("datos/can_2024.json").then(r => r.json()),
      fetch("datos/honduras_departamentos.geojson").then(r => r.json()),
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
    const onSet  = (e) => setTweak("indicator",  e.detail);
    const onSet2 = (e) => setTweak("indicator2", e.detail);
    window.addEventListener("set-indicator",  onSet);
    window.addEventListener("set-indicator2", onSet2);
    return () => {
      window.removeEventListener("set-indicator",  onSet);
      window.removeEventListener("set-indicator2", onSet2);
    };
  }, []);

  // 2.d) Toggle del panel de Tweaks. Antes solo se abría vía toolbar de la
  //      plataforma editora. Ahora hay un botón flotante «Ajustes» (ver abajo)
  //      que también abre el panel — garantiza que en GitHub Pages siempre
  //      sea accesible para el usuario final.
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

  // 2.e) Modales académicos (metodología, glosario, cita)
  const [modal, setModal] = useState(null); // "methodology" | "glossary" | "citation" | null

  // 2.f) Tour de bienvenida (primer ingreso). Se memoriza en localStorage.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (window.shouldShowTour?.()) {
      const t = setTimeout(() => setTourOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // 2.g) Modo presentación / kiosco
  const [presentationOpen, setPresentationOpen] = useState(false);

  // 2.h) Sincronización con URL (deep linking)
  //      Lee al montar y escribe en cada cambio relevante.
  if (window.useURLState) {
    window.useURLState(
      {
        selected,
        indicator: tweaks.indicator,
        indicator2: tweaks.indicator2,
        viewMode: tweaks.viewMode,
        darkMode: tweaks.darkMode,
        palette: tweaks.palette,
      },
      { setSelected, setTweak }
    );
  }

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
      <Header
        total={data.total}
        data={data}
        setSelected={setSelected}
        selected={selected}
        onOpenTweaks={() => setTweaksOpen(true)}
        onOpenModal={setModal}
        onOpenPresentation={() => setPresentationOpen(true)}
      />
      <KPIs total={data.total} />
      <div className="body">
        <div className="map-column">
          <MapView
            geo={geo} data={data} indicator={ind}
            minV={minV} maxV={maxV}
            tweaks={tweaks} setTweak={setTweak}
            selected={selected} setSelected={setSelected}
            compareWith={compareWith}
            setHover={setHover} hover={hover}
          />
          <window.AnalysisBox
            data={data} indicator={ind}
            selected={selected}
          />
        </div>
        <SidePanel
          data={data} indicator={ind}
          minV={minV} maxV={maxV}
          selected={selected} setSelected={setSelected}
          compareWith={compareWith} setCompareWith={setCompareWith}
          tweaks={tweaks}
        />
      </div>
      <Footer />

      {/* Botón flotante de Ajustes — siempre visible para el usuario final.
          Aparece arriba a la derecha del viewport y abre el panel <TweaksUI/>. */}
      {!tweaksOpen && (
        <button
          className="tweaks-fab"
          onClick={() => setTweaksOpen(true)}
          title="Ajustes del tablero"
          aria-label="Abrir panel de ajustes"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Ajustes</span>
        </button>
      )}

      {tweaksOpen && (
        <TweaksUI
          tweaks={tweaks} setTweak={setTweak}
          onClose={() => {
            setTweaksOpen(false);
            window.parent?.postMessage?.({ type: "__edit_mode_dismissed" }, "*");
          }}
        />
      )}

      {/* Modales académicos */}
      {modal === "methodology" && <window.MethodologyModal onClose={() => setModal(null)} />}
      {modal === "glossary"    && <window.GlossaryModal    onClose={() => setModal(null)} />}
      {modal === "citation"    && <window.CitationModal    onClose={() => setModal(null)} />}

      {/* Tour de bienvenida */}
      {tourOpen && window.Tour && <window.Tour onFinish={() => setTourOpen(false)} />}

      {/* Modo presentación / kiosco */}
      {presentationOpen && window.PresentationMode && (
        <window.PresentationMode data={data} onClose={() => setPresentationOpen(false)} />
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
window.BIVARIATE_PALETTE = BIVARIATE_PALETTE;
window.fmtN          = fmtN;
window.fmtPct        = fmtPct;
window.fmtCompact    = fmtCompact;
window.valueToColor  = valueToColor;
