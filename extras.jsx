/* ============================================================================
   extras.jsx · Componentes auxiliares del Tablero CAN 2024
   ----------------------------------------------------------------------------
   Autor: Christian Alexis Manzanares Cruz (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   Este archivo agrupa los componentes de "valor agregado" que enriquecen el
   producto académico:
     - <InfoTip />            icono "i" con tooltip metodológico
     - <SearchBox />          buscador de departamento (centra el mapa)
     - <MethodologyModal />   ficha técnica del CAN y del tablero
     - <GlossaryModal />      glosario SAN / agropecuario
     - <CitationModal />      generador de cita académica (APA / ISO 690)
     - <ExportMenu />         exportación CSV de la tabla activa
     - <SANAlerts />          alertas SAN por brechas estructurales
     - REGIONES_HONDURAS      agrupamiento de departamentos por región
     - <RegionPicker />       filtro / agrupación regional
     - <Toast />              mensajes efímeros
   ============================================================================ */
/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ============================================================================
// REGIONES DE HONDURAS
// ----------------------------------------------------------------------------
// Agrupamiento estándar utilizado por la planificación territorial hondureña
// (Plan de Nación 2010-2038 — SDP). Útil para análisis subnacionales.
// ============================================================================
const REGIONES_HONDURAS = {
  "Norte":       ["Atlántida", "Colón", "Cortés", "Yoro"],
  "Occidente":   ["Copán", "Lempira", "Ocotepeque"],
  "Centro-Occidente": ["Comayagua", "Intibucá", "La Paz", "Santa Bárbara"],
  "Centro":      ["Francisco Morazán"],
  "Sur":         ["Choluteca", "El Paraíso", "Valle"],
  "Oriente":     ["Olancho"],
  "Insular":     ["Islas de la Bahía"],
  "Mosquitia":   ["Gracias a Dios"],
};

// ============================================================================
// <InfoTip /> — icono "i" con tooltip al hacer hover/focus
// ============================================================================
function InfoTip({ text, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);
  return (
    <span className="info-tip" ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
      <button
        className="info-tip-btn"
        aria-label={label || "Más información"}
        type="button"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >i</button>
      {open && (
        <span className="info-tip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

// ============================================================================
// <SearchBox /> — buscador de departamento
// ============================================================================
function SearchBox({ data, setSelected }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const items = useMemo(() => {
    const all = Object.keys(data.departamentos).sort();
    if (!q.trim()) return all;
    const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const Q = norm(q);
    return all.filter(n => norm(n).includes(Q));
  }, [data, q]);
  return (
    <div className="search-box" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.6" y2="16.6"></line>
      </svg>
      <input
        type="text"
        placeholder="Buscar departamento…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        aria-label="Buscar departamento"
      />
      {open && items.length > 0 && (
        <ul className="search-results" role="listbox">
          {items.slice(0, 10).map(name => (
            <li key={name}>
              <button
                onClick={() => { setSelected(name); setQ(name); setOpen(false); }}
                role="option"
                aria-selected="false"
              >{name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// <Modal /> — contenedor genérico
// ============================================================================
function Modal({ title, onClose, children, width = 760 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// <MethodologyModal /> — ficha técnica
// ============================================================================
function MethodologyModal({ onClose }) {
  return (
    <Modal title="Metodología y notas técnicas" onClose={onClose}>
      <p><strong>Fuente primaria.</strong> Censo Agropecuario Nacional (CAN) 2024, Instituto Nacional de Estadística (INE) de Honduras. Resultados preliminares del año agrícola 2023–2024, publicados en julio de 2025.</p>
      <p><strong>Unidades estadísticas.</strong> Las dos unidades básicas del CAN son el <em>productor</em> (persona natural u organización que dirige técnica y económicamente la actividad) y la <em>explotación</em> (unidad económica bajo dirección única). Un productor puede operar más de una explotación.</p>
      <p><strong>Fecha de referencia.</strong> Las existencias pecuarias se levantaron al 1 de septiembre de 2024. Los cultivos refieren al ciclo agrícola 2023–2024 (primera + postrera).</p>
      <p><strong>Población departamental.</strong> Las cifras per cápita (IDAL, densidad productiva) utilizan proyecciones de población a mitad de año 2024 del INE, con base en el Censo de Población y Vivienda 2013. Total nacional utilizado: 9,169,441 hab.</p>
      <p><strong>Cobertura geográfica.</strong> 18 departamentos de Honduras. Los polígonos de los departamentos provienen de OpenStreetMap (recuperados vía Nominatim, mayo 2025) y se redibujaron con un nivel de simplificación moderado para optimizar el desempeño del mapa 3D.</p>
      <p><strong>Cobertura del CAN 2024 e Islas de la Bahía.</strong> El INE no reportó información agropecuaria desagregada para el departamento insular de <em>Islas de la Bahía</em> en la publicación preliminar del CAN 2024. En consecuencia, este territorio se representa como <em>"Sin dato registrado"</em> en el mapa y se excluye de los rankings, índices compuestos, regresiones y análisis LISA. Una vez se publiquen los resultados definitivos del INE el campo se actualizará en <code>datos/can_2024.json</code>.</p>
      <p><strong>Balance real de disponibilidad nacional.</strong> Las RAR calculadas a partir de la producción local capturan únicamente la <em>oferta agropecuaria interna</em>. El balance alimentario completo requiere sumar las importaciones netas. Según estimaciones del Banco Central de Honduras (BCH) y SICA para 2023–2024, Honduras importa aproximadamente <strong>750,000 TM</strong> de maíz, <strong>35,000 TM</strong> de frijol y <strong>95,000 TM</strong> de arroz al año. Al incorporar estas importaciones, la disponibilidad efectiva nacional asciende a una RAR calórica del <strong>~87%</strong>, con una <strong>dependencia de importaciones cercana al 52%</strong> de las calorías suministradas por granos básicos. Esta lectura cambia la interpretación de política pública: el déficit no es absoluto sino estructural, derivado de la baja productividad local.</p>
      <p><strong>Índices compuestos.</strong></p>
      <ul>
        <li><strong>IDAL · Disponibilidad alimentaria local</strong>: (maíz_TM + frijol_TM) × 1,000 ÷ población.</li>
        <li><strong>IDP · Diversificación productiva</strong>: índice de Shannon-Weaver normalizado sobre cinco categorías de uso del suelo (granos, anuales, permanentes, café, descanso).</li>
        <li><strong>IVPD · Vulnerabilidad productiva</strong>: promedio simple de cuatro brechas: <em>1 − % asist. téc.</em>, <em>1 − % crédito</em>, <em>1 − % maquinaria</em>, <em>1 − % riego</em>.</li>
        <li><strong>Autosuficiencia</strong>: superficie de granos básicos ÷ superficie agropecuaria total.</li>
        <li><strong>CR₃ (concentración territorial)</strong>: suma de los tres mayores departamentos respecto al total nacional del indicador activo.</li>
      </ul>
      <p><strong>Advertencias.</strong> Los datos del CAN 2024 son <em>preliminares</em>; los totales pueden ajustarse en publicaciones definitivas del INE. Las cifras de subtotal pueden no sumar exactamente al total nacional por redondeos. Los polígonos geográficos no constituyen fronteras oficiales — para uso cartográfico legal consúltense los mapas del Instituto Geográfico Nacional (IGN).</p>
      <p><strong>Marco SAN.</strong> El tablero adopta el marco de los cuatro pilares de Seguridad Alimentaria y Nutricional (FAO/CFS): <em>disponibilidad, acceso, utilización y estabilidad</em>. El análisis enfatiza disponibilidad (oferta agregada y per cápita) y acceso (cobertura de servicios productivos institucionales).</p>
    </Modal>
  );
}

// ============================================================================
// <GlossaryModal /> — glosario
// ============================================================================
function GlossaryModal({ onClose }) {
  const items = [
    ["Productor", "Persona natural u organización que ejerce la dirección técnica y económica de una o varias explotaciones agropecuarias."],
    ["Explotación", "Unidad económica que realiza actividades agropecuarias bajo una única dirección, independientemente del régimen de tenencia."],
    ["Hectárea (ha)", "Unidad de superficie equivalente a 10,000 m² (100 m × 100 m)."],
    ["Tonelada métrica (TM)", "1,000 kilogramos."],
    ["Granos básicos", "En Honduras: maíz, frijol, arroz y sorgo/maicillo. Núcleo de la dieta nacional."],
    ["Cultivos permanentes", "Cultivos cuyo ciclo productivo supera el año (café, cacao, palma africana, frutales, etc.)."],
    ["Tenencia", "Régimen jurídico bajo el cual el productor accede a la tierra: propia, nacional, ejidal, consejo territorial, arrendada u otra."],
    ["Asistencia técnica", "Servicios de extensión agrícola provistos por instituciones públicas, privadas u ONG."],
    ["Crédito formal", "Financiamiento productivo otorgado por bancos, cajas rurales o fondos institucionales."],
    ["SAN", "Seguridad Alimentaria y Nutricional: situación en la que toda persona tiene, en todo momento, acceso físico, económico y social a alimentos suficientes, inocuos y nutritivos."],
    ["Disponibilidad", "Pilar SAN. Oferta agregada de alimentos en un territorio (producción local, importaciones, ayudas)."],
    ["Acceso", "Pilar SAN. Capacidad de los hogares para obtener los alimentos disponibles (recursos, ingresos, mercados)."],
    ["Utilización", "Pilar SAN. Aprovechamiento biológico de los alimentos (agua, salud, prácticas, sanidad)."],
    ["Estabilidad", "Pilar SAN. Sostenimiento en el tiempo de los otros tres pilares ante shocks."],
    ["Shannon-Weaver", "Medida de diversidad ecológica adaptada al análisis productivo. H = −Σ pᵢ ln(pᵢ); normalizada como H/H_máx."],
    ["CR₃", "Concentración territorial: aporte conjunto de los tres principales departamentos al total nacional de un indicador."],
  ];
  return (
    <Modal title="Glosario · términos SAN y agropecuarios" onClose={onClose} width={680}>
      <dl className="glossary">
        {items.map(([term, def]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{def}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

// ============================================================================
// <CitationModal /> — generador de citas
// ============================================================================
function CitationModal({ onClose }) {
  const year = new Date().getFullYear();
  const url = typeof location !== 'undefined' ? location.href.replace(/[?#].*$/, '') : '';
  const apa = `Observatorio en Seguridad Alimentaria y Nutricional [OBSAN]. (${year}). Tablero del Censo Agropecuario Nacional 2024 — OBSAN-UNAH [Software]. Equipo: C. Manzanares, F. García & M. García. Universidad Nacional Autónoma de Honduras. ${url}`;
  const iso = `OBSERVATORIO EN SEGURIDAD ALIMENTARIA Y NUTRICIONAL (OBSAN). Tablero del Censo Agropecuario Nacional 2024 — OBSAN-UNAH [en línea]. Equipo: Christian Manzanares, Fiama García, María García. Tegucigalpa: Universidad Nacional Autónoma de Honduras, ${year} [consultado el ${new Date().toLocaleDateString("es-HN", {year:"numeric", month:"long", day:"numeric"})}]. Disponible en: ${url}`;
  const bibtex = `@misc{obsan_can_${year},
  author = {{Observatorio en Seguridad Alimentaria y Nutricional (OBSAN)} and Manzanares, Christian and García, Fiama and García, María},
  title  = {Tablero del Censo Agropecuario Nacional 2024 — OBSAN-UNAH},
  year   = {${year}},
  publisher = {Universidad Nacional Autónoma de Honduras},
  url    = {${url}}
}`;
  const [copied, setCopied] = useState(null);
  const copy = (txt, key) => {
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };
  return (
    <Modal title="Cómo citar este tablero" onClose={onClose} width={720}>
      <p>Si utiliza este tablero en un trabajo académico, agradeceremos la siguiente cita. La autoría corresponde al <strong>OBSAN</strong> como unidad institucional, con el equipo técnico responsable.</p>
      <CitationBlock label="APA 7" onCopy={() => copy(apa, "apa")} copied={copied === "apa"}>{apa}</CitationBlock>
      <CitationBlock label="ISO 690" onCopy={() => copy(iso, "iso")} copied={copied === "iso"}>{iso}</CitationBlock>
      <CitationBlock label="BibTeX" onCopy={() => copy(bibtex, "bib")} copied={copied === "bib"} mono>{bibtex}</CitationBlock>
    </Modal>
  );
}
function CitationBlock({ label, children, onCopy, copied, mono }) {
  return (
    <div className="citation-block">
      <div className="citation-head">
        <span className="citation-label">{label}</span>
        <button onClick={onCopy} className="citation-copy">
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre className={mono ? "mono" : ""}>{children}</pre>
    </div>
  );
}

// ============================================================================
// Exportación CSV
// ============================================================================
function exportCSV(data, indicators) {
  const rows = [];
  const headers = ["departamento", ...indicators.map(i => i.id)];
  rows.push(headers.join(","));
  for (const [name, d] of Object.entries(data.departamentos)) {
    const row = [`"${name}"`];
    for (const i of indicators) {
      const v = d[i.id];
      row.push(v == null ? "" : v);
    }
    rows.push(row.join(","));
  }
  // total
  const totalRow = ['"Total nacional"'];
  for (const i of indicators) {
    const v = data.total[i.id];
    totalRow.push(v == null ? "" : v);
  }
  rows.push(totalRow.join(","));
  const csv = "\ufeff" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CAN-2024-OBSAN_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// <ToolMenu /> — menú con acciones (descargar, citar, métodos, glosario, imprimir)
// ============================================================================
function ToolMenu({ data, onOpenMethodology, onOpenGlossary, onOpenCitation, onOpenPresentation, selected }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);
  const handle = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="tool-menu" ref={ref}>
      <button className="tool-menu-btn" onClick={() => setOpen(!open)} aria-label="Menú de herramientas" aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="1.5"></circle>
          <circle cx="19" cy="12" r="1.5"></circle>
          <circle cx="5"  cy="12" r="1.5"></circle>
        </svg>
        <span>Herramientas</span>
      </button>
      {open && (
        <ul className="tool-menu-list" role="menu">
          <li><button onClick={handle(() => exportCSV(data, window.INDICATORS))}>📥 Descargar CSV</button></li>
          <li><button onClick={handle(() => window.exportDepartmentPDF?.(data, selected))}>📄 Descargar ficha PDF</button></li>
          <li><button onClick={handle(onOpenCitation)}>📑 Cómo citar</button></li>
          <li><button onClick={handle(onOpenMethodology)}>📐 Metodología</button></li>
          <li><button onClick={handle(onOpenGlossary)}>📖 Glosario</button></li>
          <li><button onClick={handle(onOpenPresentation)}>🎬 Modo presentación</button></li>
          <li><button onClick={handle(() => window.print())}>🖨 Imprimir tablero</button></li>
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// <SANAlerts /> — banderas SAN por brechas estructurales del departamento
// ============================================================================
function SANAlerts({ dep, total }) {
  if (!dep) return null;
  const alerts = [];
  // umbrales relativos al promedio nacional
  if ((dep.at_pct ?? 0) < (total.at_pct ?? 0) * 0.8)
    alerts.push({ level: "alta", text: "Asistencia técnica significativamente por debajo del promedio nacional." });
  if ((dep.credito_pct ?? 0) < (total.credito_pct ?? 0) * 0.6)
    alerts.push({ level: "alta", text: "Acceso a crédito formal crítico — < 60 % del promedio nacional." });
  if ((dep.maquinaria_pct ?? 0) < (total.maquinaria_pct ?? 0) * 0.7)
    alerts.push({ level: "media", text: "Cobertura de maquinaria por debajo del estándar nacional." });
  if (dep.poblacion > 0 && dep.idal_kg_capita != null && dep.idal_kg_capita < 50)
    alerts.push({ level: "alta", text: "Disponibilidad local de granos básicos crítica — < 50 kg/hab·año." });
  if ((dep.ivpd ?? 0) > 0.85)
    alerts.push({ level: "alta", text: "Índice de Vulnerabilidad Productiva elevado (> 0.85)." });
  if ((dep.riego_superficie ?? 0) / Math.max(dep.superficie_total ?? 1, 1) < 0.005)
    alerts.push({ level: "media", text: "Superficie con riego marginal — < 0.5 % del área agropecuaria." });
  if (alerts.length === 0) return null;
  return (
    <div className="san-alerts">
      <div className="san-alerts-head">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>Alertas SAN ({alerts.length})</span>
      </div>
      <ul>
        {alerts.map((a, i) => (
          <li key={i} className={`san-alert san-${a.level}`}>{a.text}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Exposición global
// ============================================================================
window.InfoTip = InfoTip;
window.SearchBox = SearchBox;
window.MethodologyModal = MethodologyModal;
window.GlossaryModal = GlossaryModal;
window.CitationModal = CitationModal;
window.ToolMenu = ToolMenu;
window.SANAlerts = SANAlerts;
window.REGIONES_HONDURAS = REGIONES_HONDURAS;
window.exportCSV = exportCSV;

// ============================================================================
// <Tour /> — guía de bienvenida (3 pasos) que se muestra solo en el
//            primer ingreso. La marca de visita se guarda en localStorage.
// ============================================================================
const TOUR_KEY = "can_obsan_tour_v1";
function Tour({ onFinish }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Bienvenido al tablero del CAN 2024",
      body: <>
        <p>Este tablero presenta los resultados preliminares del <strong>Censo Agropecuario Nacional 2024</strong> con énfasis en los pilares de Seguridad Alimentaria y Nutricional <em>disponibilidad</em> y <em>acceso</em>.</p>
        <p>Está orientado a investigadores, autoridades y estudiantes. Te mostraré rápidamente las funciones clave.</p>
      </>
    },
    {
      title: "Explora el mapa 3D",
      body: <>
        <p>El mapa coroplético muestra los 18 departamentos coloreados según el indicador seleccionado. Pasa el cursor para ver el valor, haz <strong>clic</strong> para abrir el análisis detallado.</p>
        <p>Cambia el indicador desde el selector del mapa o desde <em>Ajustes</em>. Cada indicador trae un <strong>icono "i"</strong> con su descripción metodológica.</p>
      </>
    },
    {
      title: "Análisis, indicadores SAN y exportación",
      body: <>
        <p>El <strong>cuadro de análisis</strong> junto al mapa contextualiza los hallazgos a nivel nacional o departamental, con implicaciones de política pública.</p>
        <p>Encuentra herramientas para <strong>citar</strong>, <strong>exportar a CSV</strong>, consultar la <strong>metodología</strong> y el <strong>glosario</strong> en el menú <em>Herramientas</em> del encabezado.</p>
      </>
    },
  ];
  const cur = steps[step];
  const next = () => step < steps.length - 1 ? setStep(step + 1) : finish();
  const finish = () => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch (e) {}
    onFinish();
  };
  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenida al tablero">
      <div className="tour-card">
        <div className="tour-step">Paso {step + 1} de {steps.length}</div>
        <h2>{cur.title}</h2>
        <div>{cur.body}</div>
        <div className="tour-actions">
          <div className="tour-dots">
            {steps.map((_, i) => <span key={i} className={i === step ? "on" : ""} />)}
          </div>
          <div style={{display:"flex", gap:8}}>
            <button className="tour-btn ghost" onClick={finish}>Omitir</button>
            <button className="tour-btn" onClick={next}>{step < steps.length - 1 ? "Siguiente" : "Comenzar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function shouldShowTour() {
  try { return !localStorage.getItem(TOUR_KEY); } catch (e) { return false; }
}
window.Tour = Tour;
window.shouldShowTour = shouldShowTour;
