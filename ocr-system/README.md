# 🔍 Sistema OCR Inteligente con Auto-Retroalimentación

Sistema avanzado de reconocimiento óptico de caracteres (OCR) con capacidades de machine learning y auto-mejora basada en retroalimentación del usuario.

## 🚀 Características Principales

### 📋 Funcionalidades Core
- **OCR Multiidioma**: Soporte para español e inglés
- **Procesamiento de Imágenes**: Optimización automática con Sharp
- **Machine Learning**: Aprendizaje automático basado en patrones
- **Auto-Retroalimentación**: Mejora continua mediante correcciones del usuario
- **Análisis de Precisión**: Métricas en tiempo real de rendimiento
- **Historial Completo**: Seguimiento de todos los documentos procesados

### 🧠 Inteligencia Artificial
- **Detección de Patrones**: Identificación automática de tipos de documento
- **Correcciones Inteligentes**: Aplicación de correcciones basadas en historial
- **Entrenamiento Continuo**: Mejora automática del modelo con cada uso
- **Análisis de Confianza**: Scoring de confiabilidad para cada extracción

### 🎯 Casos de Uso
- Digitalización de documentos empresariales
- Extracción de datos de facturas y recibos
- Procesamiento de formularios escaneados
- Conversión de imágenes a texto editable
- Análisis masivo de documentos

## 📦 Instalación

### 1. Clonar y Configurar
```bash
cd ocr-system
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

### 3. Inicializar Base de Datos
```bash
npm run init-db
```

### 4. Iniciar Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔧 Configuración

### Variables de Entorno Principales
```env
# Servidor
OCR_PORT=3001
NODE_ENV=development

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tu_base_de_datos
DB_USER=tu_usuario
DB_PASS=tu_password

# OCR
TESSERACT_LANG=spa+eng
OCR_MAX_FILE_SIZE=10485760
ML_CONFIDENCE_THRESHOLD=0.7
```

### Configuración de Tesseract
- **Idiomas**: Español (spa) + Inglés (eng)
- **PSM**: 6 (bloque de texto uniforme)
- **OEM**: 3 (motor LSTM por defecto)

## 🏗️ Arquitectura del Sistema

### Backend
```
backend/
├── models/
│   └── ocrDatabase.js          # Esquema de base de datos
├── services/
│   └── ocrService.js           # Lógica de procesamiento OCR
├── controllers/
│   └── ocrController.js        # Controladores de API
└── routes/
    └── ocrRoutes.js           # Rutas de la API
```

### Frontend
```
frontend/
└── components/
    └── OCRSystem.jsx          # Interfaz React principal
```

### Base de Datos
- **ocr_documents**: Metadatos de documentos
- **ocr_results**: Resultados de extracción
- **ocr_training_data**: Datos de entrenamiento
- **ocr_patterns**: Patrones detectados
- **ocr_metrics**: Métricas del sistema
- **ocr_ml_models**: Modelos de ML

## 🔍 API Endpoints

### Procesamiento
```http
POST /api/ocr/upload
Content-Type: multipart/form-data

# Subir y procesar documento
```

### Retroalimentación
```http
POST /api/ocr/feedback
Content-Type: application/json

{
  "resultId": "uuid",
  "correctedText": "texto corregido",
  "confidence": 0.95
}
```

### Consultas
```http
GET /api/ocr/documents              # Listar documentos
GET /api/ocr/documents/:id          # Obtener documento
GET /api/ocr/stats                  # Estadísticas del sistema
GET /api/ocr/patterns               # Patrones detectados
```

## 🧪 Uso del Sistema

### 1. Procesamiento Básico
1. Seleccionar archivo de imagen
2. Arrastrar y soltar en la zona de upload
3. Esperar procesamiento automático
4. Revisar resultados extraídos

### 2. Retroalimentación
1. Revisar texto extraído
2. Hacer correcciones necesarias
3. Enviar feedback al sistema
4. El sistema aprende automáticamente

### 3. Análisis de Rendimiento
1. Acceder a estadísticas
2. Revisar métricas de precisión
3. Analizar patrones detectados
4. Monitorear mejoras del modelo

## 🔒 Seguridad

### Medidas Implementadas
- **Rate Limiting**: Protección contra spam
- **Validación de Archivos**: Solo formatos permitidos
- **Sanitización**: Limpieza de datos de entrada
- **CORS**: Configuración de orígenes permitidos
- **Helmet**: Headers de seguridad HTTP

### Límites del Sistema
- Tamaño máximo de archivo: 10MB
- Formatos soportados: JPG, PNG, PDF, TIFF, BMP, WEBP
- Rate limit: 100 requests por 15 minutos

## 📊 Monitoreo y Métricas

### Métricas Automáticas
- **Precisión General**: % de textos correctos
- **Tiempo de Procesamiento**: Latencia promedio
- **Patrones Detectados**: Tipos de documento identificados
- **Mejoras del Modelo**: Evolución de la precisión

### Logs del Sistema
```bash
# Ver logs en tiempo real
tail -f logs/ocr-system.log

# Análisis de errores
grep "ERROR" logs/ocr-system.log
```

## 🔄 Machine Learning

### Proceso de Aprendizaje
1. **Extracción Inicial**: OCR con Tesseract
2. **Aplicación de Patrones**: Correcciones automáticas
3. **Feedback del Usuario**: Correcciones manuales
4. **Actualización del Modelo**: Aprendizaje continuo

### Tipos de Patrones
- **Correcciones Frecuentes**: Errores comunes de OCR
- **Tipos de Documento**: Facturas, recibos, formularios
- **Formatos Específicos**: Fechas, números, códigos
- **Contexto Semántico**: Correcciones basadas en contexto

## 🚨 Troubleshooting

### Problemas Comunes

#### Error de Conexión a BD
```bash
# Verificar conexión
npm run test-db

# Reinicializar tablas
npm run init-db
```

#### OCR No Funciona
```bash
# Verificar instalación de Tesseract
tesseract --version

# Reinstalar dependencias OCR
npm uninstall tesseract.js
npm install tesseract.js@latest
```

#### Memoria Insuficiente
```bash
# Aumentar límite de Node.js
node --max-old-space-size=4096 server.js
```

### Logs de Debug
```javascript
// Activar logs detallados
LOG_LEVEL=debug
```

## 🔮 Roadmap

### Versión 1.1
- [ ] Soporte para más idiomas
- [ ] OCR de documentos PDF multipágina
- [ ] API de procesamiento en lotes
- [ ] Dashboard de administración

### Versión 1.2
- [ ] Integración con servicios cloud OCR
- [ ] Exportación de datos a Excel/CSV
- [ ] Plantillas de documentos personalizadas
- [ ] API de webhooks para notificaciones

### Versión 2.0
- [ ] OCR con Deep Learning personalizado
- [ ] Detección automática de campos
- [ ] Procesamiento en tiempo real
- [ ] Integración con sistemas ERP

## 📧 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio del proyecto principal.

---

**Desarrollado por**: WEB2_DEV Team  
**Versión**: 1.0.0  
**Licencia**: MIT
