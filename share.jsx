/* ============================================================================
   share.jsx · URLs compartibles (deep linking) + módulo de compartir
   ----------------------------------------------------------------------------
   Autor: Christian Manzanares (CAMC) · OBSAN-UNAH
   ----------------------------------------------------------------------------
   ¿QUÉ HACE ESTE ARCHIVO?
   Sincroniza el estado relevante del tablero con la URL del navegador
   (parámetros de búsqueda). Esto permite:
     - Compartir un enlace que abra el tablero en un departamento + indicador
       + modo de visualización específicos.
     - Hacer "back/forward" del navegador respetando el estado.
     - Citar hallazgos en publicaciones con URL reproducible.

   ESTADO PERSISTIDO EN URL:
     ?dpto=Olancho&ind=rar_calorica&modo=lisa&tema=dark&paleta=san_green

   EXPORTA:
     - useURLState(state, setters)  → hook para sincronizar
     - <ShareButton/>               → botón con menú (copiar / WhatsApp / X)
   ============================================================================ */
/* global React */
const { useEffect, useRef, useState } = React;

// Mapeo de claves cortas en URL ↔ claves internas largas.
// Mantener URLs cortas mejora la usabilidad y previene problemas en redes sociales.
const URL_KEYS = {
  dpto: "selected",
  ind:  "indicator",
  ind2: "indicator2",
  modo: "viewMode",
  tema: "darkMode",
  paleta: "palette",
};

// Codifica un valor booleano como "1"/"0" para URLs más cortas.
function encodeVal(key, v) {
  if (v == null || v === "") return null;
  if (key === "tema") return v ? "dark" : "light";
  return String(v);
}
function decodeVal(key, raw) {
  if (raw == null) return null;
  if (key === "tema") return raw === "dark" || raw === "1" || raw === "true";
  return raw;
}

/**
 * Hook que sincroniza estado React ↔ URL.
 * @param {object} state — { selected, indicator, viewMode, darkMode, palette, indicator2 }
 * @param {object} setters — { setSelected, setIndicator, setViewMode, ... }
 */
function useURLState(state, setters) {
  // 1) Al MONTAR: leer URL y aplicar a estado interno (si hay params).
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    for (const [shortKey, longKey] of Object.entries(URL_KEYS)) {
      const raw = params.get(shortKey);
      if (raw == null) continue;
      const v = decodeVal(shortKey, raw);
      // Mapear long-key → función set correspondiente
      const setter = setters["set" + longKey.charAt(0).toUpperCase() + longKey.slice(1)];
      if (typeof setter === "function") setter(v);
      else if (longKey === "indicator" || longKey === "indicator2" || longKey === "viewMode" || longKey === "palette" || longKey === "darkMode") {
        // Para tweaks, usar setTweak
        setters.setTweak?.(longKey, v);
      }
    }
  }, []);

  // 2) Cuando el ESTADO cambia, actualizar URL sin recargar.
  useEffect(() => {
    if (!initialized.current) return;
    const params = new URLSearchParams();
    for (const [shortKey, longKey] of Object.entries(URL_KEYS)) {
      const v = state[longKey];
      const enc = encodeVal(shortKey, v);
      if (enc != null && enc !== "") params.set(shortKey, enc);
    }
    const qs = params.toString();
    const newURL = window.location.pathname + (qs ? "?" + qs : "");
    if (window.location.search !== (qs ? "?" + qs : "")) {
      window.history.replaceState({}, "", newURL);
    }
  }, [
    state.selected, state.indicator, state.indicator2,
    state.viewMode, state.darkMode, state.palette,
  ]);
}

/**
 * <ShareButton/> — Botón pequeño con menú desplegable.
 * Acciones: Copiar enlace · WhatsApp · Twitter/X · Compartir nativo (móvil).
 */
function ShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = "Tablero CAN 2024 · OBSAN-UNAH";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    } catch (e) {}
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); setOpen(false); } catch (e) {}
    } else {
      copy();
    }
  };
  const openWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
  const openX  = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");

  return (
    <div className="share-btn-wrap" ref={ref}>
      <button
        className="header-share-btn"
        onClick={() => setOpen(!open)}
        title="Compartir enlace"
        aria-label="Compartir tablero"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>Compartir</span>
      </button>
      {open && (
        <ul className="share-menu" role="menu">
          <li><button onClick={copy}>{copied ? "✓ Copiado" : "🔗 Copiar enlace"}</button></li>
          {typeof navigator !== "undefined" && navigator.share && (
            <li><button onClick={share}>📲 Compartir…</button></li>
          )}
          <li><button onClick={openWA}>💬 WhatsApp</button></li>
          <li><button onClick={openX}>𝕏 Twitter / X</button></li>
        </ul>
      )}
    </div>
  );
}

window.useURLState = useURLState;
window.ShareButton = ShareButton;
