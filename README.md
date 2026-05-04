# 🇭🇳 SIDH — Sistema de Información de la Dieta Hondureña
 
[![Licencia: CC BY-NC-SA 4.0](https://img.shields.io/badge/Licencia-CC%20BY--NC--SA%204.0-blue.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![UNAH-OBSAN](https://img.shields.io/badge/UNAH-OBSAN-002F87?style=flat&labelColor=F4B71A)](https://obsan.unah.edu.hn)
[![Estado](https://img.shields.io/badge/Estado-Prototipo%20v1.1-C8102E)](https://github.com/)
[![Idiomas](https://img.shields.io/badge/Idiomas-es--HN%20%7C%20EN-green)](https://github.com/)
 
> **Proyecto de Innovación** — Implementación de un sistema informático para el análisis de la dieta hondureña mediante la aplicación del Recordatorio de 24 Horas de Múltiples Pasos.
 
---
 
## 📋 Contenido
 
- [Descripción](#-descripción)
- [Contexto institucional](#-contexto-institucional)
- [Características principales](#-características-principales)
- [Arquitectura y stack tecnológico](#-arquitectura-y-stack-tecnológico)
- [Estructura del sistema](#-estructura-del-sistema)
- [Modelo de datos](#-modelo-de-datos)
- [Instalación y uso](#-instalación-y-uso)
- [Datos del prototipo](#-datos-del-prototipo)
- [Equipo del proyecto](#-equipo-del-proyecto)
- [Etapas del proyecto](#-etapas-del-proyecto)
- [Licencia](#-licencia)
- [Contacto](#-contacto)
---
 
## 📌 Descripción
 
El **SIDH** es un sistema informático diseñado a la medida para registrar, procesar y analizar la ingesta alimentaria de la población hondureña a través del **Recordatorio de 24 Horas de Múltiples Pasos** (metodología de cinco pasos iterativos). Su propósito es generar evidencia nutricional actualizada, sistemática y comparable para apoyar la vigilancia alimentaria, la investigación científica y la formulación de políticas públicas en seguridad alimentaria y nutricional en Honduras.
 
El sistema permite registrar **más de un recordatorio por persona en distintos momentos del tiempo**, habilitando tanto análisis transversales como seguimiento **longitudinal** de trayectorias dietéticas individuales, desde lactantes hasta adultos mayores.
 
---
 
## 🏛️ Contexto institucional
 
| | |
|---|---|
| **Institución** | Universidad Nacional Autónoma de Honduras (UNAH) |
| **Unidad ejecutora** | Observatorio de Seguridad Alimentaria y Nutricional (OBSAN-UNAH) |
| **Carrera** | Carrera de Nutrición — Facultad de Ciencias Médicas |
| **Registro** | Dirección de Investigación Científica, Humanística y Tecnológica (DICIHT) |
| **Infraestructura digital** | Gestionada ante la DICITH-UNAH |
| **Instrumento de datos** | Práctica Institucional Supervisada (PIS) y Servicio Social Comunitario (SSC) |
| **País** | 🇭🇳 Honduras — Tegucigalpa, M.D.C. |
| **Año de inicio** | 2026 |
 
El sistema surge ante la **brecha de información estratégica** en el sistema nacional de Honduras: la ENCOVI 2004 está desactualizada, la EPHPM se orienta al mercado laboral y la ENDESA/MICS 2019 cubre grupos poblacionales específicos. El SIDH busca llenar ese vacío con metodología estandarizada internacionalmente.
 
---
 
## ✨ Características principales
 
### Funcionalidades del sistema
- 📝 **Recordatorio de 24 horas de múltiples pasos** — flujo de 5 pasos iterativos
- 👥 **Cobertura de todos los grupos de edad** — lactantes, preescolares, escolares, adolescentes, adultos (19–59), adultos mayores (60+) y embarazadas
- 🔄 **Seguimiento longitudinal** — múltiples recordatorios por persona a lo largo del tiempo
- 🧮 **Motor de cálculo nutricional automático** — energía, macronutrientes y micronutrientes con base en tablas INCAP
- 🗺️ **Cobertura geográfica** — 18 departamentos y 81 municipios de Honduras con mapas GeoJSON reales
- 🍽️ **Catálogo hondureño** — 2,469 alimentos INCAP + ~30 recetas y preparaciones típicas
- 📊 **Indicadores dietéticos** — diversidad dietética, adecuación nutricional, patrones de consumo
- 🔒 **Seguridad y trazabilidad** — control de acceso por roles, auditoría WORM, cifrado de PII
### Características técnicas
- 📱 **Responsive completo** — móvil, tablet, escritorio y pizarras 4K
- 🌐 **Bilingüe** — Español (es-HN) e Inglés (EN)
- 👶 **PersonPicker con tutor** — registro de menores con tutor responsable
- 🆔 **Identificador longitudinal** — DNI de 13 dígitos + alternativo para extranjeros
- 📏 **Antropometría** — estándares OMS 2006 (0–5 años), 2007 (5–19 años) y adultos
- 🩺 **Mini Nutritional Assessment (MNA)** — tamizaje de adultos mayores
---
 
## 🛠️ Arquitectura y stack tecnológico
 
```
Frontend (Prototipo v1.1)
├── React 18          — componentes de interfaz
├── Tailwind CSS      — sistema de diseño y utilidades
├── Recharts          — visualizaciones y gráficas nutricionales
├── Leaflet.js        — mapas coropletas (departamentos/municipios)
└── Babel CDN         — transpilación sin proceso de compilación
 
Backend (Producción — propuesta)
├── PostgreSQL 15+    — base de datos relacional principal
├── PostGIS           — extensión geoespacial
├── pgcrypto          — cifrado de datos sensibles (PII)
└── Row Level Security (RLS) — seguridad por rol a nivel de base de datos
```
 
**Paleta institucional UNAH:**
 
| Color | Hex | Uso |
|-------|-----|-----|
| Azul UNAH | `#002F87` | Primario, headers, navegación |
| Amarillo UNAH | `#F4B71A` | Acentos, alertas, destacados |
| Rojo UNAH | `#C8102E` | Acciones críticas, errores |
 
---
 
## 📐 Estructura del sistema
 
El SIDH está organizado en **7 módulos funcionales** con **22 pantallas implementadas**:
 
```
SIDH v1.1
├── 📊 Dashboard
│   ├── KPIs globales con filtro por período
│   ├── Gráficas de distribución nutricional
│   └── Indicadores de cobertura por departamento
│
├── 👥 Encuestados
│   ├── Listado con búsqueda por DNI
│   ├── Registro nuevo (PersonPicker + tutor para menores)
│   ├── Perfil completo del encuestado
│   └── Edición / baja lógica (soft-delete)
│
├── 🔍 Buscar por DNI
│   ├── Historial de R24 por persona
│   └── CRUD completo de recordatorios
│
├── 💰 Socioeconómico
│   └── Formulario con departamento condicional
│
├── 📏 Antropometría
│   ├── PersonPicker + fecha de nacimiento
│   ├── Estándares OMS 2006/2007/adultos
│   └── Modal MNA (adultos mayores)
│
├── 🍽️ R24 — Recordatorio de 24 Horas
│   ├── PersonPicker + calendario de fecha
│   ├── Flujo de 5 pasos iterativos
│   └── CRUD de alimentos por tiempo de comida
│
└── 🗺️ Mapa
    ├── Coropletas a nivel departamental
    ├── Coropletas a nivel municipal
    └── GeoJSON realista 18 departamentos / 81 municipios
```
 
---
 
## 🗄️ Modelo de datos
 
El modelo relacional (`MODELO_DATOS_SIDH`) sigue los estándares:
 
- **Forma Normal**: 3FN
- **Nomenclatura**: `snake_case`
- **Claves primarias**: UUID v4
- **Borrado lógico**: campo `deleted_at` (soft-delete)
- **Fechas**: `TIMESTAMPTZ` (zona horaria Honduras UTC-6)
**8 dominios funcionales:**
 
| Dominio | Tablas principales |
|---------|-------------------|
| Identidad y RBAC | `usuarios`, `roles`, `permisos` |
| Cohortes (multi-tenancy) | `cohortes`, `participantes_cohorte` |
| Encuestados + tutores | `encuestados`, `tutores`, `relaciones_tutor` |
| R24 | `r24_cabecera`, `r24_detalle`, `r24_pasos` |
| Antropometría + MNA | `antropometria`, `mna_evaluacion` |
| Catálogos INCAP / recetas | `alimentos`, `recetas`, `ingredientes_receta` |
| Geografía PostGIS | `departamentos`, `municipios`, `geometrias` |
| Auditoría WORM | `auditoria_log` (append-only) |
 
---
 
## 🚀 Instalación y uso
 
> El prototipo v1.1 funciona directamente en el navegador sin proceso de compilación.
 
### Requisitos
- Navegador moderno (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- No requiere Node.js ni instalación de dependencias para el prototipo
### Ejecutar el prototipo
 
```bash
# Clonar el repositorio
git clone https://camc30393.github.io/sidh_obsan_unah/
cd SIDH-OBSAN
 
# Abrir en el navegador (sin servidor)
open index.html
# o en Windows:
start index.html
```
 
### Con servidor local (recomendado)
 
```bash
# Con Python
python -m http.server 8080
 
# Con Node.js
npx serve .
 
# Navegar a
http://localhost:8080
```
 
---
 
## 📦 Datos del prototipo
 
El prototipo incluye datos sintéticos del **estudio C24 (OBSAN)**:
 
| Parámetro | Valor |
|-----------|-------|
| Encuestados válidos | 4,573 |
| Grupo de edad (base) | 19–59 años |
| Registros R24 | 53,287 |
| Alimentos en catálogo | 2,469 (INCAP) |
| Cobertura departamental | 18 departamentos |
| Identificador | DNI 13 dígitos + alternativo |
 
> ⚠️ **Nota:** Los datos del prototipo son sintéticos y coherentes con la realidad hondureña. Los grupos no cubiertos (lactantes, preescolares, escolares, adolescentes, adultos mayores 60+, embarazadas) serán generados e integrados en etapas posteriores del proyecto.
 
---
 
## 👩‍🔬 Equipo del proyecto
 
| Nombre | Grado | Rol |
|--------|-------|-----|
| Elizabeth León | Ph.D. | Investigadora principal |
| Patricia Ochoa | Dra. | Co-investigadora |
| Elena Rivera | Lic. | Investigadora |
| María Luisa García | M.Sc. | Investigadora |
| Christian Manzanares | M.Sc. | Integración TI / Desarrollo SIDH |
| Fiama García | Lic. | Investigadora |
 
**Institución:** UNAH — Observatorio de Seguridad Alimentaria y Nutricional (OBSAN)
 
---
 
## 🗓️ Etapas del proyecto
 
El proyecto de innovación se desarrolla en tres etapas secuenciales, cada una registrada de manera independiente ante la DICIHT-UNAH:
 
```
Etapa 1 ✅ (en curso)
└── Desarrollo del sistema informático SIDH
    └── Prototipo v1.1 entregado
 
Etapa 2 ⏳ (siguiente)
└── Implementación con estudiantes PIS/SSC
    └── Recolección de datos reales en campo
    └── Todos los grupos de edad y departamentos
 
Etapa 3 📄 (futura)
└── Publicación de artículos científicos
    └── Análisis de la dieta de la población hondureña
```
 
---
 
## 🔬 Metodología
 
El sistema implementa el **Recordatorio de 24 Horas de Múltiples Pasos** conforme a los lineamientos INCAP/FAO-INFOODS, con el siguiente flujo de 5 pasos iterativos:
 
1. **Lista rápida** — enumeración libre de todos los alimentos consumidos el día anterior
2. **Alimentos olvidados** — sondeo de categorías frecuentemente omitidas
3. **Tiempo y ocasión** — ubicación temporal de cada consumo en el día
4. **Detalle y cuantificación** — cantidades, preparaciones, recetas y porciones
5. **Revisión final** — verificación completa del día alimentario
> El registro de múltiples R24 por persona en diferentes fechas permite capturar la **variabilidad intraindividual** y aproximarse a la ingesta usual, superando las limitaciones de un único recordatorio.
 
---
 
## 📄 Licencia
 
Este proyecto está publicado bajo la licencia **Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)**.
 
```
Copyright (c) 2026 UNAH-OBSAN
Ph.D. Elizabeth León, Dra. Patricia Ochoa, Lic. Elena Rivera,
M.Sc. María Luisa García, M.Sc. Christian Manzanares, Lic. Fiama García
```
 
Consulta el archivo [`LICENSE`](./LICENSE) para los términos completos.
 
[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
 
---
 
## 📬 Contacto
 
**OBSAN — Observatorio de Seguridad Alimentaria y Nutricional**  
Universidad Nacional Autónoma de Honduras  
Tegucigalda, M.D.C., Honduras
 
- 🌐 [obsan.unah.edu.hn](https://obsan.unah.edu.hn)
- ✉️ obsan@unah.edu.hn
- 🔬 ORCID Christian Manzanares: [0009-0004-7419-0449](https://orcid.org/0009-0004-7419-0449)
---
 
<div align="center">
  <sub>Desarrollado con ❤️ para Honduras · UNAH-OBSAN 2026</sub>
</div>
