# 🧠 Sistema RAG Inteligente - Estructura del Proyecto

## 📁 Estructura de Archivos
```
WEB2_DEV/
├── knowledge-base/           # 📚 Base de conocimiento
│   ├── docs/                # 📄 Documentos para entrenar
│   │   ├── manuales/        # 📖 Manuales de usuario
│   │   ├── procedimientos/  # 📋 Procedimientos internos
│   │   ├── faqs/           # ❓ Preguntas frecuentes
│   │   └── politicas/      # 📜 Políticas de la empresa
│   ├── embeddings/         # 🔍 Vectores generados
│   └── chunks/             # 📄 Chunks de texto procesados
├── rag-engine/             # 🤖 Motor RAG
│   ├── ingester.js         # 📥 Ingesta de documentos
│   ├── embeddings.js       # 🔍 Generación de embeddings
│   ├── retriever.js        # 🎯 Búsqueda de contexto
│   ├── generator.js        # 💬 Generación de respuestas
│   └── utils/              # 🛠️ Utilidades
│       ├── similarity.js   # 📐 Cálculo de similitud
│       ├── chunker.js      # ✂️ División de texto
│       └── loader.js       # 📂 Carga de archivos
└── chatbot-rag.js         # 🧠 Integración principal
```

## 🎯 Componentes del Sistema

### 1. **Ingesta Automática**
- 📄 Lee PDFs, TXT, MD, CSV
- 🔗 Extrae datos de la base de datos
- ✂️ División inteligente en chunks
- 🔍 Generación de embeddings con Ollama

### 2. **Búsqueda Inteligente**
- 🎯 Búsqueda por similitud semántica
- 📊 Ranking de relevancia
- 🔄 Actualización en tiempo real
- 📈 Métricas de precisión

### 3. **Generación Contextual**
- 🤖 LLM local con Ollama
- 📚 Contexto específico del negocio
- 🎨 Respuestas personalizadas
- 📝 Citación de fuentes

### 4. **Integración con Dashboard**
- ⚡ API endpoints optimizados
- 🔄 Sincronización automática
- 📊 Métricas de uso
- 🎛️ Panel de administración
