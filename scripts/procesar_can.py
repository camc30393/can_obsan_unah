#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================================
  procesar_can.py · Pipeline reproducible de datos para el OBSAN-UNAH
============================================================================
  Autor: Christian Manzanares (CAMC) · OBSAN-UNAH

  PROPÓSITO
  ---------
  Toma los 7 archivos XLSX del INE (publicación preliminar del CAN 2024) y
  genera el archivo `datos/can_2024.json` consumido por el tablero.

  Sustituye el procesamiento manual: corre este script cada vez que el INE
  publique correcciones o resultados definitivos.

  USO
  ---
      pip install pandas openpyxl  (una sola vez)
      python procesar_can.py

  Entradas esperadas en la subcarpeta `fuentes/`:
      1-CARACTERISTICAS-DEL-PRODUCTOR.xlsx
      2-CARACTERISTICAS-DE-LA-EXPLOTACION.xlsx
      3-CUADROS-GRANOS-BASICOS.xlsx
      4-CUADROS-CULTIVOS-ANUALES.xlsx
      5-CUADROS-CULTIVOS-PERMANENTES.xlsx
      6-CUADROS-EXISTENCIA.xlsx
      7-TECNICAS-Y-PRACTICAS-AGRICOLAS.xlsx

  Salida:
      datos/can_2024.json

  Convención numérica OBSAN: el JSON usa floats nativos. El frontend formatea
  con coma de miles y punto decimal (1,234,567.89).
============================================================================
"""

from __future__ import annotations
import json
import math
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas no instalado. Ejecuta: pip install pandas openpyxl")
    sys.exit(1)

# ── Configuración ───────────────────────────────────────────────────────
FUENTES = Path(__file__).parent / "fuentes"
SALIDA  = Path(__file__).parent.parent / "datos" / "can_2024.json"

DEPTOS = [
    "Atlántida", "Colón", "Comayagua", "Copán", "Cortés", "Choluteca",
    "El Paraíso", "Francisco Morazán", "Gracias a Dios", "Intibucá",
    "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho",
    "Santa Bárbara", "Valle", "Yoro"
]

# Proyecciones de población departamental INE 2024 (mid-year, base Censo 2013)
POBLACION = {
    "Atlántida": 533830, "Colón": 344099, "Comayagua": 531059, "Copán": 417343,
    "Cortés": 1705724, "Choluteca": 466668, "El Paraíso": 510668,
    "Francisco Morazán": 1617944, "Gracias a Dios": 107956,
    "Intibucá": 252664, "Islas de la Bahía": 85098, "La Paz": 227158,
    "Lempira": 370054, "Ocotepeque": 162944, "Olancho": 582344,
    "Santa Bárbara": 451386, "Valle": 187164, "Yoro": 615338,
}
POBLACION_TOTAL = sum(POBLACION.values())

# Factores nutricionales (INCAP/OPS 2012)
NUTR = {
    "maiz":   {"kcal": 365, "prot": 9.4},
    "frijol": {"kcal": 333, "prot": 22.0},
    "arroz":  {"kcal": 360, "prot": 7.0},
}
REQ_KCAL_DIA = 2100  # FAO/OMS/UNU 2004
REQ_PROT_DIA = 50
DIAS = 365


def read_section(xlsx_path: Path, sheet_name: str, depto_col: int = 0) -> dict:
    """Lee una hoja XLSX y devuelve un dict {depto: dict_de_cols}."""
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=None)
    rows = {}
    for _, row in df.iterrows():
        key = str(row.iloc[depto_col]).strip()
        if key in DEPTOS or key == "Total":
            rows[key] = list(row.values)
    return rows


def safe_num(x):
    """Convierte a float, devolviendo None si es NaN o no numérico."""
    try:
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except (TypeError, ValueError):
        return None


def procesar():
    data = {"total": {}, "departamentos": {}}
    for d in DEPTOS:
        data["departamentos"][d] = {"name": d, "poblacion": POBLACION.get(d, 0)}
    data["total"]["poblacion"] = POBLACION_TOTAL

    # ─── 1. Productor: sexo, nivel educativo ────────────────────────────
    wb1 = FUENTES / "1-CARACTERISTICAS-DEL-PRODUCTOR.xlsx"
    sexo = read_section(wb1, "SEXO")
    for k, r in sexo.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target.update({
            "productores_total":    safe_num(r[1]),
            "productores_hombres":  safe_num(r[2]),
            "pct_hombres":          safe_num(r[3]),
            "productores_mujeres":  safe_num(r[4]),
            "pct_mujeres":          safe_num(r[5]),
            "productores_orgs":     safe_num(r[6]),
        })

    # ─── 2. Explotación: tenencia, uso, totales ─────────────────────────
    wb2 = FUENTES / "2-CARACTERISTICAS-DE-LA-EXPLOTACION.xlsx"
    expl = read_section(wb2, "EXPLOTACIONES ")
    for k, r in expl.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["explotaciones"] = safe_num(r[1])

    ten = read_section(wb2, "TENENCIA")
    for k, r in ten.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target.update({
            "sup_propio":         safe_num(r[1]),
            "sup_nacional":       safe_num(r[2]),
            "sup_ejidal":         safe_num(r[3]),
            "sup_consejo":        safe_num(r[4]),
            "sup_arrendada":      safe_num(r[5]),
            "sup_otra_tenencia":  safe_num(r[6]),
            "superficie_total":   safe_num(r[9]),
        })

    uso = read_section(wb2, "USO")
    for k, r in uso.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target.update({
            "sup_granos":      safe_num(r[1]),
            "sup_anuales":     safe_num(r[2]),
            "sup_permanentes": safe_num(r[3]),
        })

    # ─── 3. Granos básicos ──────────────────────────────────────────────
    wb3 = FUENTES / "3-CUADROS-GRANOS-BASICOS.xlsx"
    gb = read_section(wb3, "Granos básicos")
    for k, r in gb.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target.update({
            "gb_productores":     safe_num(r[1]),
            "gb_explotaciones":   safe_num(r[2]),
            "gb_area_sembrada":   safe_num(r[3]),
            "gb_area_cosechada":  safe_num(r[4]),
        })

    # Maíz (primera sección de la hoja "Maiz")
    df_maiz = pd.read_excel(wb3, sheet_name="Maiz", header=None)
    for i, row in df_maiz.iloc[:25].iterrows():
        key = str(row.iloc[0]).strip()
        if key in DEPTOS or key == "Total":
            target = data["total"] if key == "Total" else data["departamentos"][key]
            target["maiz_produccion_tm"] = safe_num(row.iloc[5])
            target["maiz_rendimiento"] = safe_num(row.iloc[6])

    df_fri = pd.read_excel(wb3, sheet_name="Frijoles", header=None)
    for i, row in df_fri.iloc[:25].iterrows():
        key = str(row.iloc[0]).strip()
        if key in DEPTOS or key == "Total":
            target = data["total"] if key == "Total" else data["departamentos"][key]
            target["frijol_produccion_tm"] = safe_num(row.iloc[5])

    df_arroz = pd.read_excel(wb3, sheet_name="Arroz", header=None)
    for i, row in df_arroz.iloc[:25].iterrows():
        key = str(row.iloc[0]).strip()
        if key in ("Total", "Total Nacional"):
            data["total"]["arroz_produccion_tm"] = safe_num(row.iloc[5])

    # ─── 5. Cultivos permanentes — Café ──────────────────────────────────
    wb5 = FUENTES / "5-CUADROS-CULTIVOS-PERMANENTES.xlsx"
    cafe = read_section(wb5, "CAFE")
    for k, r in cafe.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["cafe_produccion"] = safe_num(r[5])
        target["cafe_area"] = safe_num(r[3])

    # ─── 6. Existencia pecuaria ─────────────────────────────────────────
    wb6 = FUENTES / "6-CUADROS-EXISTENCIA.xlsx"
    df_bov = pd.read_excel(wb6, sheet_name="BOVINOS", header=None)
    in_section = False
    for _, row in df_bov.iterrows():
        key = str(row.iloc[0]).strip()
        if "NÚMERO DE EXPLOTACIONES, EXISTENCIA Y PROMEDIO" in key:
            in_section = True
            continue
        if "VACAS EN ORDEÑO" in key:
            in_section = False
        if not in_section:
            continue
        if key in DEPTOS or key == "Total":
            target = data["total"] if key == "Total" else data["departamentos"][key]
            target["bovinos_existencias"] = safe_num(row.iloc[1])
            target["bovinos_explotaciones"] = safe_num(row.iloc[2])

    in_section = False
    for _, row in df_bov.iterrows():
        key = str(row.iloc[0]).strip()
        if "VACAS EN ORDEÑO Y PRODUCCIÓN DE LECHE" in key:
            in_section = True
            continue
        if not in_section:
            continue
        if key in DEPTOS or key == "Total":
            target = data["total"] if key == "Total" else data["departamentos"][key]
            target["leche_litros"] = safe_num(row.iloc[3])
            target["vacas_ordeno"] = safe_num(row.iloc[2])

    porc = read_section(wb6, "PORCINOS")
    for k, r in porc.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["porcinos_explotaciones"] = safe_num(r[1])
        target["porcinos_existencias"] = safe_num(r[2])

    aves = read_section(wb6, "AVES DE CORRAL")
    for k, r in aves.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["aves_explotaciones"] = safe_num(r[1])
        target["aves_existencias"] = safe_num(r[2])

    # ─── 7. Técnicas y prácticas ────────────────────────────────────────
    wb7 = FUENTES / "7-TECNICAS-Y-PRACTICAS-AGRICOLAS.xlsx"
    rie = read_section(wb7, "SISTEMA DE RIEGO")
    for k, r in rie.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["riego_explotaciones"] = safe_num(r[1])
        target["riego_superficie"] = safe_num(r[2])

    at = read_section(wb7, "ASISTENCIA TÉCNICA")
    for k, r in at.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["at_recibio"] = safe_num(r[1])
        target["at_pct"] = safe_num(r[2])

    cre = read_section(wb7, "ASISTENCIA CREDITICIA")
    for k, r in cre.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["credito_utilizo"] = safe_num(r[1])
        target["credito_pct"] = safe_num(r[2])

    maq = read_section(wb7, "MAQUINARIA")
    for k, r in maq.items():
        target = data["total"] if k == "Total" else data["departamentos"][k]
        target["maquinaria_si"] = safe_num(r[1])
        target["maquinaria_pct"] = safe_num(r[2])

    # ─── INDICADORES COMPUESTOS Y DERIVADOS ─────────────────────────────
    def compute_indices(d, pob):
        """Calcula los índices SAN derivados in-place."""
        if pob and pob > 0:
            # IDAL
            granos = (d.get("maiz_produccion_tm") or 0) + (d.get("frijol_produccion_tm") or 0)
            d["idal_kg_capita"] = granos * 1000 / pob
            d["productores_por_mil_hab"] = (d.get("productores_total") or 0) * 1000 / pob
            # Disponibilidad nutricional
            kcal = sum(
                (d.get(f"{r}_produccion_tm") or 0) * 10000 * NUTR[r]["kcal"]
                for r in ("maiz", "frijol", "arroz")
            )
            prot = sum(
                (d.get(f"{r}_produccion_tm") or 0) * 10000 * NUTR[r]["prot"]
                for r in ("maiz", "frijol", "arroz")
            )
            d["kcal_cap_dia"] = kcal / pob / DIAS
            d["prot_cap_dia"] = prot / pob / DIAS
            d["rar_calorica"] = d["kcal_cap_dia"] / REQ_KCAL_DIA
            d["rar_proteica"] = d["prot_cap_dia"] / REQ_PROT_DIA
        else:
            for k in ("idal_kg_capita", "productores_por_mil_hab",
                     "kcal_cap_dia", "prot_cap_dia", "rar_calorica", "rar_proteica"):
                d[k] = None
        # IDP Shannon
        areas = {
            "granos":      d.get("gb_area_sembrada") or 0,
            "anuales":     d.get("sup_anuales") or 0,
            "permanentes": d.get("sup_permanentes") or 0,
            "cafe":        d.get("cafe_area") or 0,
            "descanso":    0,
        }
        total_a = sum(areas.values())
        if total_a > 0:
            H = -sum((a / total_a) * math.log(a / total_a) for a in areas.values() if a > 0)
            Hmax = math.log(sum(1 for a in areas.values() if a > 0) or 1)
            d["idp_shannon"] = H / Hmax if Hmax > 0 else 0
        else:
            d["idp_shannon"] = None
        # IVPD
        brechas = [
            1 - (d.get("at_pct") or 0),
            1 - (d.get("credito_pct") or 0),
            1 - (d.get("maquinaria_pct") or 0),
            1 - ((d.get("riego_superficie") or 0) / max(d.get("superficie_total") or 1, 1)),
        ]
        d["ivpd"] = sum(brechas) / len(brechas)
        # Autosuficiencia
        d["autosuficiencia"] = (
            (d.get("gb_area_sembrada") or 0) / d["superficie_total"]
            if d.get("superficie_total", 0) else 0
        )
        # Diversidad de rubros
        count = sum([
            (d.get("gb_area_sembrada") or 0) > 100,
            (d.get("sup_anuales") or 0) > 100,
            (d.get("sup_permanentes") or 0) > 100,
            (d.get("cafe_area") or 0) > 100,
            (d.get("bovinos_existencias") or 0) > 1000,
        ])
        d["diversidad_rubros"] = count
        # Escala productiva
        if d.get("productores_total", 0):
            d["ha_por_productor"] = (d.get("superficie_total") or 0) / d["productores_total"]
            d["ratio_mujeres_hombres"] = (
                (d.get("productores_mujeres") or 0) / d["productores_hombres"]
                if d.get("productores_hombres", 0) else 0
            )

    for name, dep in data["departamentos"].items():
        compute_indices(dep, dep.get("poblacion") or POBLACION.get(name, 0))
    compute_indices(data["total"], POBLACION_TOTAL)

    # ─── Tratamiento académico: departamentos sin datos en el CAN ───────
    # Si un departamento no tiene productores ni explotaciones (no fue
    # incluido en el censo), marcar TODOS los campos como null.
    for name, dep in data["departamentos"].items():
        if not dep.get("productores_total"):
            keep = {"name": dep["name"], "poblacion": dep["poblacion"], "_sin_datos_can": True}
            # Marcar todo como null
            for k in list(dep.keys()):
                if k not in ("name", "poblacion", "_sin_datos_can"):
                    keep[k] = None
            data["departamentos"][name] = keep
            print(f"⚠ {name}: marcado como SIN DATOS del CAN 2024")

    # Matriz de vecindarios para LISA — copiada del JSON existente si lo hay
    if SALIDA.exists():
        try:
            old = json.loads(SALIDA.read_text(encoding="utf-8"))
            if "neighbors" in old:
                data["neighbors"] = old["neighbors"]
        except Exception:
            pass

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Generado: {SALIDA}")
    print(f"  Total productores: {data['total'].get('productores_total'):,.0f}")
    print(f"  RAR calórica nac.: {(data['total'].get('rar_calorica') or 0) * 100:.1f}%")
    print(f"  Departamentos con datos: "
          f"{sum(1 for d in data['departamentos'].values() if not d.get('_sin_datos_can'))}/18")


if __name__ == "__main__":
    procesar()
