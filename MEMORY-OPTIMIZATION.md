# 🚀 Optimizaciones para Archivos Grandes - Prevención de Fraudes

## ❌ Problema Original
El servidor se quedaba sin memoria (heap out of memory) al procesar archivos grandes de prevención de fraudes, especialmente archivos con más de 50,000 filas.

## ✅ Soluciones Implementadas

### 1. **Optimización de Memoria Node.js**
```bash
# Windows
start-server-optimized.bat

# Linux/Mac  
./start-server-optimized.sh
```

**Configuraciones aplicadas:**
- `--max-old-space-size=4096`: Aumenta memoria heap a 4GB
- `--expose-gc`: Habilita garbage collection manual

### 2. **Streaming de Archivos Excel**
- **Antes**: Cargaba todo el archivo en memoria
- **Ahora**: Procesa fila por fila con streaming optimizado
- **Opciones de lectura optimizadas**:
  - `sharedStrings: 'cache'`
  - `hyperlinks: 'ignore'`
  - `styles: 'ignore'`

### 3. **Batch Processing Inteligente**
- **Archivos pequeños** (<10k filas): Batch de 1000
- **Archivos medianos** (10k-50k): Batch de 750  
- **Archivos grandes** (>50k): Batch de 500
- **Transacciones de base de datos** para mejor performance

### 4. **Gestión de Memoria Automática**
- **Monitoreo cada 5000 filas**
- **Garbage collection forzado** cuando memoria > 1.5GB
- **Liberación inmediata de batches** procesados
- **Limpieza automática** de archivos temporales

### 5. **Conexiones de BD Optimizadas**
- **Conexión dedicada** por upload
- **Sin timeouts** durante procesamiento
- **Rollback automático** en caso de error
- **Pool de conexiones** mejorado

## 📊 Límites Recomendados

| Tamaño Archivo | Filas Aprox. | Memoria Usada | Tiempo Est. |
|---------------|--------------|---------------|-------------|
| 50 MB         | 50,000       | 1 GB          | 2-5 min     |
| 100 MB        | 100,000      | 2 GB          | 5-10 min    |
| 200 MB        | 200,000      | 3-4 GB        | 10-20 min   |

## 🔧 Configuración de Render

Para producción en Render, asegúrate de configurar:

```bash
# Variables de entorno en Render
NODE_OPTIONS=--max-old-space-size=4096 --expose-gc
```

## 🚨 Troubleshooting

### Si sigues viendo errores de memoria:

1. **Reduce el tamaño del archivo**:
   - Dividir en múltiples archivos más pequeños
   - Procesar por lotes de 25,000-50,000 filas

2. **Aumentar memoria**:
   ```bash
   # Para archivos extremadamente grandes
   NODE_OPTIONS=--max-old-space-size=8192 --expose-gc
   ```

3. **Verificar formato del archivo**:
   - Eliminar columnas innecesarias
   - Convertir a CSV si es muy grande
   - Verificar que no haya fórmulas complejas

### Monitoreo en tiempo real:
- Los logs muestran uso de memoria cada 10 batches
- El endpoint `/progreso` muestra avance en tiempo real
- Alertas automáticas si memoria > 1.5GB

## 🎯 Resultados Esperados

Con estas optimizaciones deberías poder procesar:
- ✅ Archivos de hasta 200MB sin problemas
- ✅ Más de 100,000 filas de datos
- ✅ Tiempo de procesamiento reducido 50-70%
- ✅ Uso de memoria estable y controlado

## 📞 Soporte

Si continúas experimentando problemas:
1. Revisa los logs del servidor para detalles específicos
2. Verifica el tamaño y formato del archivo
3. Considera dividir archivos muy grandes en partes más pequeñas
