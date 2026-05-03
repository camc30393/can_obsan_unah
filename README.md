# Tablero CAN 2024 · OBSAN-UNAH

Tablero interactivo del **Censo Agropecuario Nacional 2024 (CAN 2024)** para Honduras, con mapa coroplético 3D, panel de detalle por departamento, ranking, comparación y tabla cruda.

> **Datos preliminares** · año agrícola 2023–2024
> Fuente: Instituto Nacional de Estadística (INE)

---

## ✦ Demo

Una vez publicado en GitHub Pages, estará disponible en:

`https://camc30393.github.io/can_obsan_unah/`

---

## ✦ Características

- 🗺️ **Mapa coroplético 3D** de los 18 departamentos de Honduras (MapLibre GL JS)
- 📊 **21 indicadores** del CAN 2024: productores, explotaciones, granos básicos, cultivos permanentes, pecuario y técnicas agrícolas
- 🎨 **5 paletas de color** (UNAH azul, oro, divergente, viridis, forest)
- 🌗 **Modo claro / oscuro** institucional
- 📑 **Panel lateral** con cuatro vistas: Detalle · Ranking · Comparar · Tabla
- 🎛️ **Panel de Tweaks** flotante para ajustes en vivo (opcional)

---

## ✦ Stack tecnológico

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Mapa | **MapLibre GL JS 4.7** | Open source, WebGL, soporta extrusiones 3D |
| UI   | **React 18.3** | Componentes reactivos, gestión de estado simple |
| JSX  | **Babel Standalone 7.29** | Compila JSX en el navegador (sin paso de build) |
| Datos | **JSON + GeoJSON** | Estándares abiertos, fáciles de versionar |
| Estilos | **CSS** plano con variables | Sin frameworks, máxima portabilidad |

Todo se carga vía CDN (unpkg). **No requiere `npm install`** ni proceso de build.

---

## ✦ Estructura del proyecto

```
can-dashboard-unah/
├── CAN Dashboard UNAH.html   ← entrada de la aplicación  (renombrar a index.html)
├── styles.css                ← paleta UNAH y layout
├── app.jsx                   ← componente raíz <App />
├── map.jsx                   ← mapa MapLibre + cabecera + KPIs + footer
├── side.jsx                  ← panel lateral (Detalle/Ranking/Comparar/Tabla)
├── tweaks.jsx                ← panel flotante de ajustes
├── data/
│   ├── can_2024.json                     ← indicadores por departamento
│   └── honduras_departamentos.geojson    ← polígonos del mapa
├── README.md                 ← este archivo
```

Cada archivo `.jsx` y `.css` lleva un **encabezado documentado** que explica
su propósito, organización y conceptos clave.

---

## ✦ Cómo correrlo localmente

El tablero **no funciona abriendo el HTML directamente con doble clic**
(porque hace `fetch()` de los datos y los navegadores bloquean fetch en
URLs `file://` por seguridad). Necesitas un servidor HTTP local:

### Opción 1 · Python (más fácil, viene preinstalado en macOS y Linux)

```bash
cd can-dashboard-unah
python3 -m http.server 8000
```

Luego abre `http://localhost:8000/CAN%20Dashboard%20UNAH.html` en tu navegador.

### Opción 2 · Node

```bash
npx serve .
```

### Opción 3 · VS Code

Instala la extensión **Live Server**, clic derecho en el HTML → *Open with Live Server*.

---

## ✦ Cómo agregar un indicador nuevo

1. Edita `data/can_2024.json` y añade el campo a cada departamento.
2. Edita `app.jsx` → arreglo `INDICATORS` y agrega:

   ```js
   { id: "mi_indicador", g: "Grupo", label: "Etiqueta larga", short: "Corto", unit: "ha" }
   ```

3. Listo — aparecerá automáticamente en el dropdown del mapa y en el panel de Tweaks.

## ✦ Cómo cambiar la paleta de colores

Edita el objeto `PALETTES` en `app.jsx`. Cada paleta es un arreglo de 5–7
colores hex que se interpolan linealmente.

---

## ✦ Equipo

**Christian Alexis Manzanares Cruz** (CAMC)
Especialista en Sistemas de Información — OBSAN
ORCID: [0009-0004-7419-0449](https://orcid.org/0009-0004-7419-0449)
Tegucigalpa, M.D.C. · Honduras

---

## ✦ Sobre OBSAN

**Observatorio en Seguridad Alimentaria y Nutricional**
Adscrito al **Instituto de Investigaciones Sociales (IIS)** de la
Facultad de Ciencias Sociales (FCCSS) de la
**Universidad Nacional Autónoma de Honduras (UNAH)**.

El OBSAN tiene como propósito generar evidencia académica, investigación
aplicada y análisis de información estratégica que aporte al debate público
sobre seguridad alimentaria, desarrollo humano y políticas alimentarias en
Honduras.

🔗 [obsan.unah.edu.hn](https://obsan.unah.edu.hn/)

---

## ✦ Fuente de datos

- **Censo Agropecuario Nacional 2024** — Instituto Nacional de Estadística (INE), Honduras.
  Datos preliminares · año agrícola 2023–2024.
  🔗 [ine.gob.hn](https://www.ine.gob.hn/)

Los datos consolidados en `data/can_2024.json` provienen del procesamiento
de las publicaciones preliminares del INE. Cualquier discrepancia con los
documentos oficiales se resuelve a favor de la fuente original.

---

## ✦ Licencia

Código liberado bajo licencia **MIT** — uso académico y profesional libre,
con atribución.

Datos del CAN 2024 son propiedad del INE y se reproducen con fines
educativos y de análisis bajo el principio de acceso a información pública
estadística (Honduras, Decreto 86-2006).

---

## ✦ Cómo citar

> Manzanares Cruz, C. A. (2025). *Tablero del Censo Agropecuario Nacional
> 2024 — OBSAN-UNAH* [Software]. Observatorio en Seguridad Alimentaria y
> Nutricional, Universidad Nacional Autónoma de Honduras.
> https://github.com/<TU-USUARIO>/can-dashboard-unah
