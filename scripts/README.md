# Scripts del OBSAN-UNAH

## `procesar_can.py` — Pipeline de datos

Toma los 7 archivos XLSX preliminares del INE y genera `datos/can_2024.json`.

### Uso

```bash
# 1. Crea la subcarpeta y coloca los XLSX del INE allí:
mkdir -p scripts/fuentes/
# Copia los 7 archivos del INE: 1-CARACTERISTICAS-DEL-PRODUCTOR.xlsx, etc.

# 2. Instala dependencias (una sola vez):
pip install pandas openpyxl

# 3. Ejecuta el pipeline:
python scripts/procesar_can.py
```

### Salida esperada

```
✓ Generado: datos/can_2024.json
  Total productores: 408,965
  RAR calórica nac.: 38.8%
  Departamentos con datos: 17/18
```

### Cuando el INE publique resultados definitivos

1. Descarga los nuevos archivos XLSX en `scripts/fuentes/`.
2. Re-ejecuta `python scripts/procesar_can.py`.
3. El archivo `datos/can_2024.json` se actualiza automáticamente.
4. Si hay nuevos departamentos con datos (ej. Islas de la Bahía), el flag
   `_sin_datos_can: true` desaparecerá y el tablero los incluirá en
   rankings, LISA, scatter, PCA, etc.

### Reproducibilidad

El pipeline es **idempotente y determinista**: la misma entrada produce
exactamente la misma salida. Esto garantiza que cualquier persona pueda
reproducir el `datos/can_2024.json` desde los archivos oficiales del INE.

Los factores nutricionales (INCAP) y los requerimientos energéticos (FAO/OMS)
están explícitos en las constantes `NUTR`, `REQ_KCAL_DIA`, `REQ_PROT_DIA` al
inicio del archivo. Para revisar la metodología completa, consultar el modal
"Metodología" del tablero.
