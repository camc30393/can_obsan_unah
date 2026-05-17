# Tablero CAN 2024 · OBSAN-UNAH

Tablero interactivo del **Censo Agropecuario Nacional 2024 (CAN 2024)** para Honduras, con mapa coroplético 3D, panel de detalle por departamento, análisis estadístico avanzado y módulos específicos para Seguridad Alimentaria y Nutricional (SAN).

> **Datos preliminares** · año agrícola 2023–2024
> Fuente: Instituto Nacional de Estadística (INE)

---

## ✦ Demo

Una vez publicado en GitHub Pages, estará disponible en:

`https://<TU-USUARIO>.github.io/can-dashboard-unah/`

Para publicarlo, sigue las instrucciones de **`COMO_SUBIR_A_GITHUB.txt`**.

---

## ✦ Características principales

### Visualizaciones (5 modos)
- 🗺️ **Mapa coroplético 3D** con extrusiones MapLibre GL
- 🟦 **Mapa bivariado** 3×3 (combina dos indicadores)
- 🔥 **Heatmap matricial** de brechas (departamentos × servicios)
- 📍 **Clusters espaciales LISA** (Anselin) con I de Moran global
- 📈 **Explorador de correlaciones** (scatter X-Y + regresión OLS)

### Indicadores (28 indicadores en 6 grupos)
- **Nutrición · Disponibilidad** — kcal/cap·día, proteína g/cap·día, RAR calórica, RAR proteica, diversidad de rubros
- **Equidad · Acceso** — escala productiva (ha/prod), ratio M/H
- **Índices SAN compuestos** — IDAL, IDP (Shannon), IVPD, Autosuficiencia, Densidad productiva
- **Productor, Explotación, Granos básicos, Cultivos permanentes, Pecuario, Técnicas**

### Análisis y producto académico
- 📊 **Análisis contextual narrativo** con recomendaciones de política pública
- 🚦 **Score Card SAN** — semáforo de 6 indicadores con nota global
- 👥 **Brechas de género** — visualización M/H con ratios
- 🎚️ **Simulador "qué pasaría si..."** — proyecta cambios en IVPD
- 🌾 **Cadena de valor** — diagrama Sankey producción → destino
- ⚠️ **Alertas SAN automáticas** cuando se superan umbrales críticos
- 🗺️ **Análisis por región** (8 regiones del Plan de Nación)

### Producto investigativo
- 📐 **Metodología** documentada (fuentes, definiciones, fórmulas)
- 📖 **Glosario** SAN/agropecuario (16 términos)
- 📑 **Citación** APA 7, ISO 690 y BibTeX con copia al portapapeles
- 📥 **Exportación CSV** completa (28 indicadores × 18 departamentos)
- 🖨️ **Modo impresión** A4 optimizado
- 🎬 **Modo presentación** kiosco a pantalla completa con 7 slides
- 🔍 **Buscador** de departamento con normalización de tildes

### Accesibilidad y UX
- 🌗 **Modo claro / oscuro** institucional
- 🎓 **Tour guiado** al primer ingreso
- ♿ **Focus visible**, **skip-link**, soporte `prefers-reduced-motion`
- 📱 **Responsive** completo (móvil/tablet/laptop/escritorio)
- 🎛️ **Panel Tweaks** flotante para ajustes en vivo

---

## ✦ Stack tecnológico

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Mapa | **MapLibre GL JS 4.7** | Open source, WebGL, soporta extrusiones 3D |
| UI   | **React 18.3** | Componentes reactivos, gestión de estado simple |
| JSX  | **Babel Standalone 7.29** | Compila JSX en el navegador (sin paso de build) |
| Análisis | JavaScript puro | Moran, Shannon, regresión OLS, Pearson r |
| Datos | **JSON + GeoJSON** | Estándares abiertos, fáciles de versionar |
| Estilos | **CSS** plano con variables | Sin frameworks, máxima portabilidad |

Todo se carga vía CDN (unpkg). **No requiere `npm install`** ni proceso de build.

---

## ✦ Estructura del proyecto

```
can-dashboard-unah/
├── index.html                ← entrada (redirige a CAN Dashboard UNAH.html)
├── CAN Dashboard UNAH.html   ← tablero principal
├── styles.css                ← todos los estilos
├── app.jsx                   ← componente raíz <App />
├── map.jsx                   ← mapa MapLibre + cabecera + KPIs + footer
├── side.jsx                  ← panel lateral (Detalle/Score SAN/...)
├── analysis.jsx              ← cuadro de análisis contextual
├── views.jsx                 ← heatmap matricial
├── analytics.jsx             ← LISA, Moran, regresión, scatter
├── medium.jsx                ← Score Card, género, simulador
├── low.jsx                   ← cadena de valor, modo presentación
├── extras.jsx                ← buscador, modales, exportación, tour
├── tweaks.jsx                ← panel flotante de ajustes
├── data/
│   ├── can_2024.json                     ← 28 indicadores × 18 deptos + total
│   └── honduras_departamentos.geojson    ← polígonos del mapa
├── README.md                 ← este archivo
└── COMO_SUBIR_A_GITHUB.txt   ← guía paso a paso para publicar
```

---

## ✦ Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Esc` | Cerrar modal / salir del modo presentación |
| `→` / `Espacio` | Siguiente slide (modo presentación) |
| `←` | Slide anterior (modo presentación) |
| `Tab` | Navegar entre controles (focus visible) |

---

## ✦ Cómo correrlo localmente

El tablero **no funciona abriendo el HTML directamente con doble clic**
(porque hace `fetch()` de los datos y los navegadores bloquean fetch en
URLs `file://` por seguridad). Necesitas un servidor HTTP local:

```bash
cd can-dashboard-unah
python3 -m http.server 8000      # opción 1
# o
npx serve .                       # opción 2
```

Luego abre `http://localhost:8000/` en tu navegador.

---

## ✦ API de datos (consumo programático)

El archivo `data/can_2024.json` está disponible como endpoint público.

```python
import pandas as pd, json, urllib.request
URL = "https://<TU-USUARIO>.github.io/can-dashboard-unah/data/can_2024.json"
data = json.loads(urllib.request.urlopen(URL).read())
df = pd.DataFrame.from_dict(data["departamentos"], orient="index")
print(df[["productores_total", "rar_calorica", "ivpd"]].sort_values("ivpd"))
```

```r
library(jsonlite)
URL <- "https://<TU-USUARIO>.github.io/can-dashboard-unah/data/can_2024.json"
data <- fromJSON(URL)
```

Catálogo completo de indicadores en `app.jsx` → `INDICATORS`.

---

## ✦ DOI y citación reproducible

Para investigación publicada formalmente:

1. Crear un release en GitHub: *Releases* → *Create a new release* (ej. `v1.0.0`).
2. Conectar el repositorio a **[Zenodo](https://zenodo.org)** vía OAuth (gratis).
3. Cada release generará un DOI citable.
4. Actualizar la cita BibTeX en el modal "Cómo citar" del tablero con ese DOI.

---

## ✦ Equipo

**OBSAN** — Observatorio en Seguridad Alimentaria y Nutricional
Instituto de Investigaciones Sociales (IIS) · FCCSS · UNAH

| Miembro | Rol | ORCID |
|---------|-----|-------|
| Christian Manzanares | Especialista en Sistemas de Información | [0009-0004-7419-0449](https://orcid.org/0009-0004-7419-0449) |
| Fiama García         | Especialista en SAN | [0009-0009-0254-2683](https://orcid.org/0009-0009-0254-2683) |
| María García         | Coordinadora | [0009-0003-3775-1449](https://orcid.org/0009-0003-3775-1449) |

Tegucigalpa, M.D.C. · Honduras

---

## ✦ Sobre OBSAN

El OBSAN tiene como propósito generar evidencia académica, investigación aplicada y análisis de información estratégica que aporte al debate público sobre seguridad alimentaria, desarrollo humano y políticas alimentarias en Honduras.

🔗 [obsan.unah.edu.hn](https://obsan.unah.edu.hn/)

---

## ✦ Fuente de datos

- **Censo Agropecuario Nacional 2024** — INE Honduras. Datos preliminares 2023–2024.
- **Población departamental** — proyecciones INE 2024 (base Censo 2013).
- **Polígonos geográficos** — OpenStreetMap vía Nominatim.
- **Factores nutricionales** — INCAP/OPS 2012; requerimientos FAO/OMS/UNU 2004.

---

## ✦ Licencia

Código liberado bajo **licencia MIT**. Datos del CAN 2024 son propiedad del INE y se reproducen con fines educativos y de análisis bajo el Decreto 86-2006 (Honduras).

---

## ✦ Cómo citar

> Observatorio en Seguridad Alimentaria y Nutricional [OBSAN]. (2025). *Tablero del Censo Agropecuario Nacional 2024 — OBSAN-UNAH* [Software]. Equipo: C. Manzanares, F. García & M. García. Universidad Nacional Autónoma de Honduras. https://github.com/<TU-USUARIO>/can-dashboard-unah
