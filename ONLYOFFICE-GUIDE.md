# 📊 ONLYOFFICE Document Server - Guía de Despliegue

## 🚀 Despliegue Rápido

### 1. Levantar ONLYOFFICE con Docker Compose

```bash
# En Windows (PowerShell)
.\start-onlyoffice.bat

# En Linux/Mac
./start-onlyoffice.sh
```

### 2. Verificar que esté funcionando

Abre tu navegador en:
- **Direct**: http://localhost:8080
- **Via Nginx**: http://localhost  
- **Health Check**: http://localhost/healthcheck

### 3. Iniciar tu aplicación

```bash
# Backend (en una terminal)
cd c:\Users\Cargosauto 1\Documents\WEB2_DEV
npm start

# Frontend (en otra terminal)
cd c:\Users\Cargosauto 1\Documents\WEB2_DEV\dashboard
npm run dev
```

### 4. Acceder al editor

- Ve a: http://localhost:5174/onlyoffice
- ¡Ya tienes colaboración en tiempo real! 🎉

## 🔧 Configuración Avanzada

### Variables de entorno importantes

```env
# JWT para seguridad
JWT_SECRET=tu_secreto_jwt_muy_seguro_2024
JWT_ENABLED=true

# Performance
NODE_OPTIONS=--max-old-space-size=2048

# WOPI (para integración avanzada)
WOPI_ENABLED=true
```

### Configuración de memoria

En `docker-compose.yml`, ajusta según tus recursos:

```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096  # Para 8GB+ RAM
  - NODE_OPTIONS=--max-old-space-size=2048  # Para 4GB RAM
  - NODE_OPTIONS=--max-old-space-size=1024  # Para 2GB RAM
```

## 🌐 Configuración de Producción

### SSL/HTTPS

1. Obtén certificados SSL (Let's Encrypt, Cloudflare, etc.)
2. Colócalos en `./nginx/ssl/`
3. Descomenta la configuración HTTPS en `nginx/nginx.conf`
4. Actualiza las URLs en el frontend

### Dominio personalizado

1. Actualiza `nginx/nginx.conf`:
```nginx
server_name tu-dominio.com;
```

2. Actualiza las URLs en `OnlyOfficeEditor.jsx`:
```javascript
script.src = 'https://tu-dominio.com/web-apps/apps/api/documents/api.js';
```

## 📊 Características Disponibles

### ✅ Funciones Implementadas
- ✅ Edición colaborativa en tiempo real
- ✅ Autoguardado cada 10 segundos  
- ✅ Comentarios y revisiones
- ✅ Compatibilidad completa con Excel (.xlsx)
- ✅ Formatos, fórmulas y gráficos
- ✅ Multi-usuario simultáneo
- ✅ JWT Security

### 🔄 En desarrollo
- 🔄 Gestión de documentos personalizados
- 🔄 Integración con base de datos
- 🔄 Historial de versiones
- 🔄 Permisos granulares por usuario

## 🐛 Troubleshooting

### Error: Cannot load ONLYOFFICE API
**Solución**: Verifica que ONLYOFFICE esté ejecutándose:
```bash
docker-compose ps
```

### Error: JWT validation failed
**Solución**: Verifica que JWT_SECRET sea el mismo en Docker y aplicación.

### Documento no se guarda
**Solución**: Verifica que el callback endpoint esté accesible:
```bash
curl -X POST http://localhost:3001/api/documents/callback
```

### Performance lento
**Solución**: 
1. Aumenta memoria: `NODE_OPTIONS=--max-old-space-size=4096`
2. Activa Redis cache
3. Configura PostgreSQL para metadatos

## 📈 Monitoreo

### Health Check
```bash
# Verificar estado
curl http://localhost/healthcheck

# Ver logs
docker-compose logs -f onlyoffice
```

### Métricas básicas
- CPU usage: `docker stats`
- Memory usage: Monitorea container `onlyoffice-docs`
- Network: Verifica latencia WebSocket

## 🔒 Seguridad

### JWT Configuration
```javascript
// En producción, usa un secret fuerte
JWT_SECRET=un_secreto_muy_seguro_de_al_menos_32_caracteres
```

### CORS Setup
```javascript
// Actualiza para producción
origin: ["https://tu-dominio.com", "https://www.tu-dominio.com"]
```

### File Upload Limits
```javascript
// En nginx.conf
client_max_body_size 100M;  // Ajustar según necesidades
```

## 📚 Recursos Adicionales

- [ONLYOFFICE API Documentation](https://api.onlyoffice.com/)
- [Docker Hub - ONLYOFFICE](https://hub.docker.com/r/onlyoffice/documentserver)
- [GitHub - ONLYOFFICE DocumentServer](https://github.com/ONLYOFFICE/DocumentServer)
