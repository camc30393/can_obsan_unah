/* ============================================================================
   analysis.jsx · Cuadro de Análisis Contextual debajo del mapa
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Renderiza un cuadro narrativo debajo del mapa con los hallazgos más
   relevantes del Censo Agropecuario Nacional 2024:
     - Si el usuario hace clic en un departamento → análisis del departamento
       seleccionado (posición en rankings, % nacional, perfiles destacados).
     - Si NO hay departamento seleccionado → análisis a nivel nacional con los
       indicadores más relevantes y los líderes departamentales.

   El texto se construye dinámicamente a partir de los datos en
   data/can_2024.json — no hay textos hard-coded por departamento; el
   análisis se adapta automáticamente si los datos cambian.

   PARA UN PRINCIPIANTE:
   Este componente NO consulta una IA. Toda la "inteligencia" son cálculos
   simples (rankings, porcentajes, máximos, mínimos) hechos en JavaScript
   y presentados con plantillas de texto. Es transparente, reproducible y
   no depende de servicios externos.
   ============================================================================ */
/* global React */
const { useMemo } = React;

// ----------------------------------------------------------------------------
// Helper: ordena departamentos por un indicador y devuelve el top-N.
// ----------------------------------------------------------------------------
function topN(deps, indId, n = 3, asc = false) {
  const arr = Object.entries(deps)
    .map(([name, d]) => ({ name, v: d[indId] }))
    .filter(o => o.v != null && !isNaN(o.v));
  arr.sort((a, b) => asc ? a.v - b.v : b.v - a.v);
  return arr.slice(0, n);
}

// ----------------------------------------------------------------------------
// Helper: posición (1..N) de un departamento dentro del ranking.
// ----------------------------------------------------------------------------
function rankOf(deps, name, indId, asc = false) {
  const arr = Object.entries(deps)
    .map(([n, d]) => ({ name: n, v: d[indId] }))
    .filter(o => o.v != null && !isNaN(o.v));
  arr.sort((a, b) => asc ? a.v - b.v : b.v - a.v);
  const i = arr.findIndex(o => o.name === name);
  return { rank: i + 1, total: arr.length };
}

// ----------------------------------------------------------------------------
// <AnalysisBox /> — cuadro principal
// ----------------------------------------------------------------------------
function AnalysisBox({ data, indicator, selected }) {
  const fmt  = window.fmtN;
  const fmtP = window.fmtPct;

  // Construir el texto narrativo (memoizado para no recalcular en cada render)
  const content = useMemo(() => {
    if (!selected || !data.departamentos[selected]) {
      return buildNational(data, indicator, fmt, fmtP);
    }
    return buildDepartmental(data, indicator, selected, fmt, fmtP);
  }, [data, indicator, selected]);

  return (
    <section className="analysis-box" aria-live="polite">
      <header className="analysis-head">
        <div className="analysis-eyebrow">
          {selected ? "Análisis del departamento" : "Análisis a nivel nacional"}
        </div>
        <h3 className="analysis-title">{content.title}</h3>
        <div className="analysis-sub">{content.subtitle}</div>
      </header>
      <div className="analysis-body">
        {content.paragraphs.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
        ))}
      </div>
      {content.highlights && content.highlights.length > 0 && (
        <div className="analysis-highlights">
          {content.highlights.map((h, i) => (
            <div key={i} className="analysis-chip">
              <div className="chip-label">{h.label}</div>
              <div className="chip-value">{h.value}</div>
              {h.sub && <div className="chip-sub">{h.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// ANÁLISIS NACIONAL (cuando NO hay departamento seleccionado)
// ----------------------------------------------------------------------------
// Redacción de nivel académico: caracteriza la estructura agropecuaria
// nacional, identifica concentraciones territoriales, brechas estructurales
// y deriva implicaciones de política pública sustentadas en la evidencia
// censal.
// ============================================================================
function buildNational(data, indicator, fmt, fmtP) {
  const t = data.total;
  const deps = data.departamentos;

  // Líderes territoriales por indicador
  const topProd  = topN(deps, "productores_total", 3);
  const topMaiz  = topN(deps, "maiz_produccion_tm", 3);
  const topCafe  = topN(deps, "cafe_produccion", 3);
  const topBov   = topN(deps, "bovinos_existencias", 3);
  const topMuj   = topN(deps, "pct_mujeres", 1);
  const topInd   = topN(deps, indicator.id, 3);

  // Concentración territorial (índice CR3): porcentaje del indicador activo
  // explicado por los tres principales departamentos. Es una medida
  // estándar de la economía industrial aplicada al territorio.
  const totalIndicador = Object.values(deps)
    .reduce((s, d) => s + (d[indicator.id] || 0), 0);
  const cr3 = totalIndicador > 0
    ? topInd.slice(0, 3).reduce((s, x) => s + (x.v || 0), 0) / totalIndicador
    : 0;
  const liderInd = topInd[0];

  // Indicadores derivados de eficiencia y cobertura
  const haPorProductor = t.productores_total
    ? t.superficie_total / t.productores_total : 0;
  const rendMaiz = t.gb_area_cosechada
    ? t.maiz_produccion_tm / t.gb_area_cosechada : 0;
  const pctRiego = t.superficie_total
    ? t.riego_superficie / t.superficie_total : 0;

  return {
    title: "Caracterización agropecuaria nacional · CAN 2024",
    subtitle: `Indicador territorializado: ${indicator.label.toLowerCase()}`,
    paragraphs: [
      `El Censo Agropecuario Nacional 2024 documenta una estructura productiva conformada por <strong>${fmt(t.productores_total)} productores</strong> y <strong>${fmt(t.explotaciones)} explotaciones</strong>, distribuidos sobre <strong>${fmt(t.superficie_total, 0)} hectáreas</strong>. El promedio de <strong>${fmt(haPorProductor, 1)} ha por productor</strong> revela una estructura agraria predominantemente campesina y minifundista, característica de economías centroamericanas con alta presión sobre la tierra. La participación femenina alcanza el <strong>${fmtP(t.pct_mujeres, 1)}</strong> del padrón productor${topMuj[0] ? `, con su expresión territorial más alta en <strong>${topMuj[0].name}</strong> (${fmtP(topMuj[0].v, 1)})` : ""}, lo que confirma una feminización rural creciente que demanda instrumentos de política específicos.`,
      `La estructura productiva muestra una clara especialización: los granos básicos abarcan <strong>${fmt(t.gb_area_sembrada, 0)} ha sembradas</strong> con producciones de <strong>${fmt(t.maiz_produccion_tm, 0)} TM de maíz</strong> y <strong>${fmt(t.frijol_produccion_tm, 0)} TM de frijol</strong>; el café —principal cultivo permanente y eje exportador— concentra <strong>${fmt(t.cafe_area, 0)} ha</strong> con una producción de <strong>${fmt(t.cafe_produccion, 0)} TM</strong>; y el hato bovino se estima en <strong>${fmt(t.bovinos_existencias, 0)} cabezas</strong>, con una producción láctea de <strong>${fmt(t.leche_litros, 0)} litros</strong>. Estos resultados configuran un patrón productivo dual: subsistencia familiar en granos básicos y orientación a mercados en café y ganadería.`,
      `La evidencia censal expone <em>brechas estructurales persistentes</em> en el acceso a servicios productivos: apenas <strong>${fmtP(t.at_pct, 1)}</strong> de las explotaciones recibieron asistencia técnica, <strong>${fmtP(t.credito_pct, 1)}</strong> accedieron a crédito formal y <strong>${fmtP(t.maquinaria_pct, 1)}</strong> dispusieron de maquinaria. La superficie bajo riego representa solo el <strong>${fmtP(pctRiego, 2)}</strong> del área agropecuaria total, una limitación crítica frente a la creciente variabilidad climática. Estas brechas, leídas en conjunto, indican una <strong>baja densidad institucional</strong> de los servicios de extensión y financiamiento rural, condición que restringe la productividad y la resiliencia del sector.`,
      (function () {
        if (!liderInd) return "";
        const seg2 = topInd[1] ? `, seguido por <em>${topInd[1].name}</em>` : "";
        const seg3 = topInd[2] ? ` y <em>${topInd[2].name}</em>` : "";
        const lect = cr3 > 0.5
          ? "<strong>evidencia una elevada concentración geográfica</strong> en pocos departamentos y sugiere oportunidades de diversificación territorial"
          : cr3 > 0.3
            ? "indica una concentración moderada compatible con ventajas comparativas regionales"
            : "refleja una distribución territorial relativamente equilibrada";
        return `Sobre el indicador territorializado en pantalla, <strong>${liderInd.name}</strong> encabeza el ordenamiento nacional con <strong>${fmt(liderInd.v, indicator.decimals || 0)} ${indicator.unit}</strong>${seg2}${seg3}. La concentración territorial (CR₃) se sitúa en <strong>${fmtP(cr3, 1)}</strong>, lo que ${lect}. La coexistencia de polos productivos consolidados con territorios rezagados respalda la pertinencia de políticas <em>diferenciadas por vocación</em> antes que de instrumentos uniformes a escala nacional.`;
      })(),
    ].filter(Boolean),
    highlights: [
      { label: "Productores",     value: topProd[0]?.name || "—", sub: `${fmt(topProd[0]?.v)} prod.` },
      { label: "Maíz (TM)",       value: topMaiz[0]?.name || "—", sub: `${fmt(topMaiz[0]?.v, 0)} TM` },
      { label: "Café (TM)",       value: topCafe[0]?.name || "—", sub: `${fmt(topCafe[0]?.v, 0)} TM` },
      { label: "Hato bovino",     value: topBov[0]?.name || "—",  sub: `${fmt(topBov[0]?.v, 0)} cab.` },
    ],
  };
}

// ============================================================================
// ANÁLISIS DEPARTAMENTAL (cuando SÍ hay departamento seleccionado)
// ----------------------------------------------------------------------------
// Redacción académica que contextualiza el departamento dentro del
// ordenamiento territorial nacional, identifica su vocación productiva
// principal, contrasta su desempeño con el promedio país y deriva
// implicaciones de política pública sustentadas en la evidencia censal.
// ============================================================================
function buildDepartmental(data, indicator, name, fmt, fmtP) {
  const d = data.departamentos[name];
  const t = data.total;
  const deps = data.departamentos;

  // Posiciones en rankings clave
  const rIndic = rankOf(deps, name, indicator.id);
  const rProd  = rankOf(deps, name, "productores_total");
  const rSup   = rankOf(deps, name, "superficie_total");
  const rMaiz  = rankOf(deps, name, "maiz_produccion_tm");
  const rCafe  = rankOf(deps, name, "cafe_produccion");
  const rBov   = rankOf(deps, name, "bovinos_existencias");
  const rMuj   = rankOf(deps, name, "pct_mujeres");

  // Aportes al total nacional
  const aporteProd = t.productores_total ? d.productores_total / t.productores_total : 0;
  const aporteSup  = t.superficie_total  ? d.superficie_total  / t.superficie_total  : 0;
  const aporteMaiz = t.maiz_produccion_tm ? d.maiz_produccion_tm / t.maiz_produccion_tm : 0;
  const aporteCafe = t.cafe_produccion    ? d.cafe_produccion    / t.cafe_produccion    : 0;
  const aporteBov  = t.bovinos_existencias ? d.bovinos_existencias / t.bovinos_existencias : 0;

  // Vocación productiva — aporte territorial al total nacional por rubro
  const vocaciones = [
    { lab: "granos básicos",      aporte: t.gb_area_sembrada    ? (d.gb_area_sembrada    || 0) / t.gb_area_sembrada    : 0 },
    { lab: "caficultura",         aporte: aporteCafe },
    { lab: "ganadería bovina",    aporte: aporteBov },
    { lab: "producción de maíz",  aporte: aporteMaiz },
    { lab: "producción de frijol",aporte: t.frijol_produccion_tm ? (d.frijol_produccion_tm || 0) / t.frijol_produccion_tm : 0 },
  ].sort((a, b) => b.aporte - a.aporte);
  const vocacion = vocaciones[0];
  const vocSecundaria = vocaciones[1];

  // Indicadores derivados (eficiencia / cobertura)
  const haPorProductor = d.productores_total ? d.superficie_total / d.productores_total : 0;
  const haPorProdNac   = t.productores_total ? t.superficie_total / t.productores_total : 0;
  const escalaRel      = haPorProdNac ? haPorProductor / haPorProdNac : 1;

  // Diferenciales en servicios productivos vs. promedio nacional
  const dAt   = (d.at_pct ?? 0) - (t.at_pct ?? 0);
  const dCred = (d.credito_pct ?? 0) - (t.credito_pct ?? 0);
  const dMaq  = (d.maquinaria_pct ?? 0) - (t.maquinaria_pct ?? 0);
  const sumaBrechas = dAt + dCred + dMaq;

  // Caracterización jerárquica para el ¶1
  const cuartil = (rank, total) => {
    const q = rank / total;
    if (q <= 0.25) return "se ubica en el cuartil superior";
    if (q <= 0.50) return "se sitúa en la mitad superior";
    if (q <= 0.75) return "se posiciona en la mitad inferior";
    return "se localiza en el cuartil inferior";
  };

  const ordinal = (n) => {
    const ords = ["primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo"];
    return ords[n - 1] || `${n}.º`;
  };

  const indicValor = d[indicator.id];
  const indicFmt = indicator.isPct
    ? fmtP(indicValor, 1)
    : `${fmt(indicValor, indicator.decimals || 0)} ${indicator.unit}`;

  // Recomendación de política coherente con el perfil
  const recomendacion = (() => {
    if (sumaBrechas < -0.05) {
      return `El cierre simultáneo de las brechas en asistencia técnica, crédito y mecanización debe constituir la <strong>prioridad de intervención</strong> en el departamento, idealmente articulado a la vocación ${vocacion.lab}.`;
    }
    if (vocacion.aporte > 0.15) {
      return `Dada su contribución estratégica en <strong>${vocacion.lab}</strong>, las intervenciones más costo-efectivas son aquellas que <em>profundizan</em> esa especialización: extensión técnica focalizada, encadenamientos productivos y certificación de calidad.`;
    }
    return `El perfil mixto del departamento sugiere instrumentos <em>diversificados</em> que combinen el fortalecimiento de la ${vocacion.lab} con el desarrollo complementario de la ${vocSecundaria.lab}.`;
  })();

  return {
    title: name,
    subtitle: `Perfil agropecuario departamental · CAN 2024`,
    paragraphs: [
      `<strong>${name}</strong> ${cuartil(rIndic.rank, rIndic.total)} del país en <em>${indicator.label.toLowerCase()}</em>, ocupando la posición <strong>${ordinal(rIndic.rank)}</strong> entre ${rIndic.total} departamentos con un valor de <strong>${indicFmt}</strong>${aporteFor(indicator.id, d, t) ? ` (${fmtP(aporteFor(indicator.id, d, t), 1)} del agregado nacional)` : ""}. Concentra <strong>${fmt(d.productores_total)} productores</strong> —el ${fmtP(aporteProd, 1)} del padrón nacional— sobre <strong>${fmt(d.superficie_total, 0)} ha</strong> de superficie agropecuaria, lo que arroja una escala media de <strong>${fmt(haPorProductor, 1)} ha por productor</strong> ${escalaRel > 1.2 ? "<strong>superior</strong> al promedio nacional, indicativo de unidades productivas de mayor tamaño" : escalaRel < 0.8 ? "<strong>inferior</strong> al promedio nacional, característico de una estructura minifundista intensa" : "comparable al promedio nacional"}.`,
      `La estructura productiva del departamento se articula principalmente en torno a la <strong>${vocacion.lab}</strong>, con un aporte de <strong>${fmtP(vocacion.aporte, 1)}</strong> al total nacional del rubro, complementada por la ${vocSecundaria.lab} (${fmtP(vocSecundaria.aporte, 1)}). En cultivos clave registra <strong>${fmt(d.maiz_produccion_tm, 0)} TM de maíz</strong> (posición ${rMaiz.rank} de ${rMaiz.total}), <strong>${fmt(d.cafe_produccion, 0)} TM de café</strong> (posición ${rCafe.rank}) y un hato bovino de <strong>${fmt(d.bovinos_existencias, 0)} cabezas</strong> (posición ${rBov.rank}). La participación femenina en la jefatura productiva alcanza el <strong>${fmtP(d.pct_mujeres, 1)}</strong>, ubicándose en el lugar <strong>${rMuj.rank}</strong> del país y constituyendo un dato relevante para el diseño de políticas con enfoque de género.`,
      `En materia de servicios productivos, <strong>${fmtP(d.at_pct, 1)}</strong> de las explotaciones recibió asistencia técnica (${dAt >= 0 ? `<em>+${fmtP(Math.abs(dAt), 1)}</em> respecto al promedio nacional` : `<em>−${fmtP(Math.abs(dAt), 1)}</em> bajo el promedio nacional`}), <strong>${fmtP(d.credito_pct, 1)}</strong> accedió a crédito formal (${dCred >= 0 ? "<em>por encima</em>" : "<em>por debajo</em>"} del país) y <strong>${fmtP(d.maquinaria_pct, 1)}</strong> empleó maquinaria (${dMaq >= 0 ? "<em>superior</em>" : "<em>inferior</em>"} al referente nacional). Estas tres dimensiones —extensión, financiamiento y mecanización— operan como los principales <strong>determinantes institucionales</strong> de la productividad agropecuaria, y su lectura conjunta permite identificar palancas de política específicas para el territorio.`,
      `<strong>Implicaciones para la toma de decisiones.</strong> ${recomendacion} Cualquier intervención debe considerar la coherencia entre la escala productiva, la vocación territorial y la densidad institucional documentada por el censo, evitando trasladar mecánicamente instrumentos diseñados para otras realidades departamentales.`,
    ],
    highlights: [
      { label: "Productores",  value: fmt(d.productores_total),                sub: `${fmtP(aporteProd, 1)} país · pos. ${rProd.rank}` },
      { label: "Superficie",   value: `${fmt(d.superficie_total, 0)} ha`,      sub: `${fmt(haPorProductor, 1)} ha/prod.` },
      { label: "Vocación",     value: vocacion.lab,                            sub: `${fmtP(vocacion.aporte, 1)} aporte nac.` },
      { label: "Brechas serv.", value: `${dAt >= 0 ? "+" : "−"}${fmtP(Math.abs(dAt), 1)} A·T`, sub: `vs. promedio país` },
    ],
  };
}

// helper interno: aporte porcentual respecto al total nacional para un indicador
function aporteFor(id, d, t) {
  const v = d[id];
  const sum = t[id];
  if (v == null || sum == null || sum === 0) return null;
  return v / sum;
}

window.AnalysisBox = AnalysisBox;
