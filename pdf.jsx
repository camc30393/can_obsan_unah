/* ============================================================================
   pdf.jsx · Exportación a PDF nativa con jsPDF
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Genera fichas PDF de una página por departamento, con KPIs, análisis
   narrativo, score card y referencia bibliográfica. A diferencia del modo
   impresión del navegador, este PDF tiene layout reproducible.

   DEPENDENCIA: jsPDF (cargada vía CDN en el HTML principal).

   EXPORTA:
     - exportDepartmentPDF(data, depName)   → genera y descarga el PDF
     - exportNationalPDF(data)              → ficha nacional consolidada
     - <PDFExportButton/>                   → botón en menú herramientas
   ============================================================================ */
/* global jspdf */
const { useState } = React;

// ── Constantes UNAH ─────────────────────────────────────────────────────
const COLORS = {
  blue:    [0, 33, 61],
  gold:    [200, 164, 21],
  green:   [15, 118, 110],
  ink:     [10, 23, 48],
  mute:    [107, 117, 147],
  line:    [217, 217, 206],
  paper:   [255, 255, 255],
};

// Formateo de números (sistema OBSAN: coma miles, punto decimal)
const fmtN  = (n, d = 0) => n == null || isNaN(n) ? "—" : new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const fmtPct= (n, d = 1) => n == null || isNaN(n) ? "—" : `${(new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n * 100))}%`;

function getRanking(deps, indId) {
  const arr = Object.entries(deps).map(([name, d]) => ({ name, v: d[indId] })).filter(o => o.v != null && !isNaN(o.v));
  arr.sort((a, b) => b.v - a.v);
  return arr;
}
function rankOf(deps, name, indId) {
  const arr = getRanking(deps, indId);
  return { rank: arr.findIndex(o => o.name === name) + 1, total: arr.length };
}

// ─────────────────────────────────────────────────────────────────────────
// Generador principal: ficha departamental
// ─────────────────────────────────────────────────────────────────────────
function exportDepartmentPDF(data, depName) {
  if (!window.jspdf?.jsPDF) {
    alert("jsPDF no se cargó. Verifica la conexión a Internet.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = 595.28, H = 841.89;
  const M = 42;
  let y = M;

  const dep = depName ? data.departamentos[depName] : null;
  const isNational = !dep;
  const target = dep || data.total;
  const name = depName || "Honduras (Nacional)";

  // Si el departamento no tiene datos del CAN
  if (dep && dep._sin_datos_can) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.blue);
    doc.text(name, M, y + 20);
    y += 50;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    const lines = doc.splitTextToSize(
      "El INE no reportó información agropecuaria desagregada para este departamento en la publicación preliminar del CAN 2024. Una vez se publiquen los resultados definitivos, este informe se actualizará automáticamente desde datos/can_2024.json.",
      W - 2 * M
    );
    doc.text(lines, M, y);
    doc.save(`OBSAN-CAN2024_${name.replace(/\s/g, "_")}.pdf`);
    return;
  }

  // ── 1. HEADER azul ────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 0, W, 72, "F");
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 72, W, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(232, 199, 106);
  doc.text("UNAH · Observatorio en Seguridad Alimentaria y Nutricional (OBSAN)", M, 30);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Censo Agropecuario Nacional 2024", M, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 230);
  doc.text(isNational ? "Ficha consolidada nacional" : `Ficha del departamento de ${name}`, M, 64);

  y = 105;

  // ── 2. TÍTULO ─────────────────────────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.blue);
  doc.text(name, M, y);
  y += 16;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mute);
  doc.text("Datos preliminares · año agrícola 2023–2024 · fuente: INE Honduras", M, y);
  y += 20;

  // ── 3. KPIs (4 en fila) ───────────────────────────────────────────────
  const kpis = isNational ? [
    { lab: "Productores",    val: fmtN(target.productores_total),                              sub: `${fmtPct(target.pct_mujeres, 1)} mujeres` },
    { lab: "Explotaciones",  val: fmtN(target.explotaciones),                                  sub: "unidades económicas" },
    { lab: "Superficie",     val: fmtN(target.superficie_total, 0) + " ha",                    sub: `${fmtN(target.superficie_total / target.productores_total, 1)} ha/prod.` },
    { lab: "RAR calórica",   val: fmtPct(target.rar_calorica, 1),                              sub: "vs. 2,100 kcal/día" },
  ] : [
    { lab: "Productores",    val: fmtN(target.productores_total),                              sub: `${fmtPct(target.pct_mujeres, 1)} mujeres` },
    { lab: "Superficie",     val: fmtN(target.superficie_total, 0) + " ha",                    sub: `pos. ${rankOf(data.departamentos, name, "superficie_total").rank}/${rankOf(data.departamentos, name, "superficie_total").total}` },
    { lab: "RAR calórica",   val: fmtPct(target.rar_calorica, 1),                              sub: "vs. 2,100 kcal/día" },
    { lab: "IVPD",           val: fmtPct(target.ivpd, 1),                                      sub: "vulnerabilidad productiva" },
  ];

  const kpiW = (W - 2 * M - 12) / 4;
  for (let i = 0; i < kpis.length; i++) {
    const x = M + i * (kpiW + 4);
    doc.setFillColor(245, 244, 238);
    doc.rect(x, y, kpiW, 56, "F");
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(2);
    doc.line(x, y, x, y + 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mute);
    doc.text(kpis[i].lab.toUpperCase(), x + 8, y + 14);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.ink);
    doc.text(kpis[i].val, x + 8, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mute);
    doc.text(kpis[i].sub, x + 8, y + 48);
  }
  y += 70;

  // ── 4. ANÁLISIS NARRATIVO ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.blue);
  doc.text("ANÁLISIS", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.ink);

  const narr = isNational
    ? buildNarrativeNational(data)
    : buildNarrativeDept(data, name);
  for (const p of narr) {
    const lines = doc.splitTextToSize(p, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 11 + 6;
    if (y > H - 200) break;
  }
  y += 4;

  // ── 5. SCORE CARD SAN ─────────────────────────────────────────────────
  if (y < H - 180) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.blue);
    doc.text("SCORE CARD · INDICADORES SAN CLAVE", M, y);
    y += 14;
    const score = buildScoreCard(target);
    const cellH = 22;
    for (const s of score) {
      doc.setFillColor(245, 244, 238);
      doc.rect(M, y, W - 2 * M, cellH, "F");
      const color = s.status === "ok" ? COLORS.green : s.status === "warn" ? COLORS.gold : COLORS.line;
      doc.setFillColor(...color);
      doc.rect(M, y, 4, cellH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.ink);
      doc.text(s.label, M + 12, y + 14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.blue);
      doc.text(s.value, W - M - 12, y + 14, { align: "right" });
      y += cellH + 2;
    }
  }

  // ── 6. FOOTER ─────────────────────────────────────────────────────────
  const footY = H - 32;
  doc.setDrawColor(...COLORS.line);
  doc.line(M, footY - 6, W - M, footY - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.mute);
  doc.text(`OBSAN-UNAH · Generado el ${new Date().toLocaleDateString("es-HN", { year:"numeric", month:"long", day:"numeric" })}`, M, footY);
  doc.text(`Página 1/1`, W - M, footY, { align: "right" });
  doc.text("Cita: OBSAN (2025). Tablero del CAN 2024. UNAH. https://obsan.unah.edu.hn", M, footY + 8);

  doc.save(`OBSAN-CAN2024_${name.replace(/\s/g, "_")}.pdf`);
}

// Narrativas adaptadas para PDF (versiones más concisas que las del tablero)
function buildNarrativeNational(data) {
  const t = data.total;
  const haProd = t.superficie_total / t.productores_total;
  return [
    `El CAN 2024 documenta ${fmtN(t.productores_total)} productores y ${fmtN(t.explotaciones)} explotaciones distribuidos sobre ${fmtN(t.superficie_total, 0)} hectáreas. La escala media de ${fmtN(haProd, 1)} ha por productor revela una estructura agraria predominantemente campesina y minifundista. La participación femenina alcanza el ${fmtPct(t.pct_mujeres, 1)} del padrón productor.`,
    `En cultivos básicos, la producción agregada es de ${fmtN(t.maiz_produccion_tm, 0)} TM de maíz y ${fmtN(t.frijol_produccion_tm, 0)} TM de frijol. La producción de café —principal cultivo permanente y rubro exportador— alcanza ${fmtN(t.cafe_produccion, 0)} TM en ${fmtN(t.cafe_area, 0)} ha. El hato bovino se estima en ${fmtN(t.bovinos_existencias, 0)} cabezas.`,
    `La disponibilidad alimentaria local cubre el ${fmtPct(t.rar_calorica, 1)} del requerimiento calórico nacional (2,100 kcal/cap·día) y el ${fmtPct(t.rar_proteica, 1)} del proteico. Los servicios productivos muestran brechas estructurales persistentes: ${fmtPct(t.at_pct, 1)} con asistencia técnica, ${fmtPct(t.credito_pct, 1)} con crédito formal, ${fmtPct(t.maquinaria_pct, 1)} con maquinaria.`,
  ];
}
function buildNarrativeDept(data, name) {
  const d = data.departamentos[name];
  const t = data.total;
  const haProd = d.productores_total > 0 ? d.superficie_total / d.productores_total : 0;
  const rIVPD = rankOf(data.departamentos, name, "ivpd");
  const rRAR  = rankOf(data.departamentos, name, "rar_calorica");
  const aporteProd = t.productores_total ? d.productores_total / t.productores_total : 0;
  return [
    `${name} concentra ${fmtN(d.productores_total)} productores (${fmtPct(aporteProd, 1)} del país) en una superficie agropecuaria de ${fmtN(d.superficie_total, 0)} ha, con una escala media de ${fmtN(haProd, 1)} ha por productor. La participación femenina es del ${fmtPct(d.pct_mujeres, 1)}.`,
    `En disponibilidad alimentaria, la producción local cubre el ${fmtPct(d.rar_calorica, 1)} del requerimiento calórico (posición ${rRAR.rank} de ${rRAR.total} departamentos). La producción es de ${fmtN(d.maiz_produccion_tm || 0, 0)} TM de maíz, ${fmtN(d.frijol_produccion_tm || 0, 0)} TM de frijol y ${fmtN(d.cafe_produccion || 0, 0)} TM de café.`,
    `El Índice de Vulnerabilidad Productiva Departamental (IVPD) es ${fmtPct(d.ivpd, 1)} (posición ${rIVPD.rank} de ${rIVPD.total}). En cobertura de servicios: ${fmtPct(d.at_pct, 1)} con asistencia técnica, ${fmtPct(d.credito_pct, 1)} con crédito formal, ${fmtPct(d.maquinaria_pct, 1)} con maquinaria. Estas brechas demandan políticas focalizadas según vocación productiva.`,
  ];
}
function buildScoreCard(target) {
  const status = (v, ok, warn) => v == null ? "x" : v >= ok ? "ok" : v >= warn ? "warn" : "alert";
  return [
    { label: "RAR calórica (disponibilidad alimentaria)",  value: fmtPct(target.rar_calorica, 1), status: status(target.rar_calorica, 1.0, 0.5) },
    { label: "RAR proteica (calidad nutricional)",          value: fmtPct(target.rar_proteica, 1), status: status(target.rar_proteica, 1.0, 0.5) },
    { label: "IDP · Diversificación productiva",            value: target.idp_shannon ? target.idp_shannon.toFixed(2) : "—", status: status(target.idp_shannon, 0.7, 0.5) },
    { label: "% explotaciones con asistencia técnica",     value: fmtPct(target.at_pct, 1), status: status(target.at_pct, 0.20, 0.10) },
    { label: "% explotaciones con crédito formal",         value: fmtPct(target.credito_pct, 1), status: status(target.credito_pct, 0.08, 0.04) },
    { label: "IVPD · Vulnerabilidad productiva",           value: fmtPct(target.ivpd, 1), status: target.ivpd == null ? "x" : target.ivpd <= 0.70 ? "ok" : target.ivpd <= 0.85 ? "warn" : "alert" },
  ];
}

window.exportDepartmentPDF = exportDepartmentPDF;
