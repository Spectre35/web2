# 🚀 Guía de Deployment - Sistema de Aclaraciones

## 📋 Resumen
- **Frontend**: Render (gratis)
- **Backend**: Railway (gratis)
- **Base de datos**: PostgreSQL en Railway (gratis)

## 🔧 Configuración Previa

### 1. Preparar el repositorio
```bash
git add .
git commit -m "Preparar para deployment"
git push origin main
```

## 🚂 Backend en Railway

### 1. Crear cuenta en Railway
- Ve a [railway.app](https://railway.app)
- Conecta tu cuenta de GitHub
- Selecciona "Deploy from GitHub repo"

### 2. Configurar variables de entorno en Railway
```env
NODE_ENV=production
PORT=3001
```

### 3. Railway automáticamente:
- ✅ Detecta que es un proyecto Node.js
- ✅ Instala dependencias con npm install
- ✅ Crea una base de datos PostgreSQL
- ✅ Ejecuta `node server.js`
- ✅ Te da una URL como: `https://tu-proyecto.up.railway.app`

## 🌐 Frontend en Render

### 1. Crear cuenta en Render
- Ve a [render.com](https://render.com)
- Conecta tu cuenta de GitHub
- Selecciona "New Static Site"

### 2. Configurar el build
```yaml
Build Command: cd dashboard && npm install && npm run build
Publish Directory: dashboard/dist
```

### 3. Variables de entorno en Render
```env
VITE_API_URL=https://tu-backend.up.railway.app
```

### 4. Render automáticamente:
- ✅ Ejecuta el build command
- ✅ Sirve los archivos estáticos
- ✅ Te da una URL como: `https://tu-frontend.onrender.com`

## 🔒 Configuración de Seguridad

### 1. Restricción por IP (en server.js)
```javascript
const IPS_AUTORIZADAS = [
  'TU_IP_PUBLICA_AQUI', // Obtener de whatismyip.com
  '192.168.1.0/24'      // Tu red local
];
```

### 2. CORS Configuration
El servidor ya está configurado para aceptar requests del frontend.

## 🚀 Pasos de Deployment

### 1. Deploy Backend (Railway)
1. Ve a [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Selecciona "Deploy from GitHub repo"
4. Elige tu repositorio
5. Railway detectará automáticamente el servidor Node.js
6. Espera que termine el build (~2-3 minutos)
7. Copia la URL que te da Railway

### 2. Deploy Frontend (Render)
1. Ve a [render.com](https://render.com)
2. Click "New +" → "Static Site"
3. Conecta tu repositorio
4. Configurar:
   - **Build Command**: `cd dashboard && npm install && npm run build`
   - **Publish Directory**: `dashboard/dist`
5. En Environment Variables agregar:
   - `VITE_API_URL`: La URL de Railway (ej: https://tu-backend.up.railway.app)
6. Click "Create Static Site"
7. Espera que termine el build (~3-5 minutos)

### 3. Actualizar configuración
1. Copia la URL del backend de Railway
2. Actualiza `dashboard/src/config.js` con la URL real
3. Actualiza `dashboard/.env.production` con la URL real
4. Haz commit y push para que se actualice automáticamente

## 🧪 Testing

### 1. Verificar Backend
- Ve a: `https://tu-backend.up.railway.app/health`
- Debe mostrar: `{"status":"OK","timestamp":"..."}`

### 2. Verificar Frontend
- Ve a: `https://tu-frontend.onrender.com`
- Verifica que carga la página de aclaraciones
- Prueba los filtros y la carga de datos

## 🔄 Actualizaciones

Ambas plataformas tienen **auto-deploy**:
- Cada `git push` actualiza automáticamente
- Railway redeploys el backend
- Render rebuilds el frontend

## 💰 Costos
- **Railway**: 500 horas gratis/mes + PostgreSQL gratis
- **Render**: 100GB ancho de banda gratis/mes
- **Total**: $0 USD/mes (plan gratuito)

## 🆘 Troubleshooting

### Backend no responde
1. Verifica variables de entorno en Railway
2. Revisa logs en Railway dashboard
3. Verifica que el health check responda

### Frontend no carga datos
1. Revisa Network tab en DevTools
2. Verifica VITE_API_URL en Render
3. Verifica CORS en el backend

### Base de datos no conecta
1. Railway genera automáticamente DATABASE_URL
2. Verifica en Railway dashboard → Database tab
3. La conexión es automática, no necesitas configurar nada

## 📞 URLs Finales
- Backend: `https://[tu-proyecto].up.railway.app`
- Frontend: `https://[tu-proyecto].onrender.com`
- Database: PostgreSQL en Railway (automático)
