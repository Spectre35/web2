# 🚀 Guía de Configuración del Proyecto en Nueva PC

## 📋 Prerrequisitos

### Instalar Software Requerido:
1. **Node.js** (v18+): https://nodejs.org/
2. **Git**: https://git-scm.com/
3. **VS Code** (recomendado): https://code.visualstudio.com/

## 🔄 Pasos de Instalación

### 1. Clonar el Repositorio
```bash
# Opción A: HTTPS (más fácil)
git clone https://github.com/Spectre35/web2.git

# Opción B: SSH (si tienes SSH configurado)
git clone git@github.com:Spectre35/web2.git
```

### 2. Navegar al Proyecto
```bash
cd web2/web2
```

### 3. Instalar Dependencias del Backend
```bash
npm install
```

### 4. Instalar Dependencias del Frontend
```bash
cd dashboard
npm install
cd ..
```

### 5. Configurar Variables de Entorno

#### Crear archivo `.env` en la raíz del proyecto:
```env
# Base de datos Neon
DATABASE_URL=postgresql://neondb_owner:XXXXXXXX@ep-crimson-paper-a5d6xzxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Puerto del servidor
PORT=3000

# Configuración de desarrollo
NODE_ENV=development
```

#### Crear archivo `dashboard/.env` para el frontend:
```env
# URL del API (ajustar según tu configuración)
VITE_API_URL=http://localhost:3000

# Configuración de desarrollo
NODE_ENV=development
```

## ⚙️ Configuración de Red

### Opción 1: Desarrollo Local (Misma PC)
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

### Opción 2: Red Local (Acceso desde otras PCs)
1. **Obtener IP local:**
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. **Actualizar configuración:**
   - Cambiar `localhost` por tu IP local (ej: `192.168.1.100`)
   - Actualizar `dashboard/src/config.js` y `dashboard/src/config-dev.js`

## 🚀 Iniciar el Proyecto

### Terminal 1 - Backend:
```bash
# En la raíz del proyecto (web2/web2/)
npm start
```

### Terminal 2 - Frontend:
```bash
# En el directorio dashboard
cd dashboard
npm run dev
```

## 🔧 Comandos Útiles

### Verificar Estado del Proyecto:
```bash
git status
git log --oneline -5
```

### Actualizar desde GitHub:
```bash
git pull origin main
```

### Instalar Nueva Dependencia:
```bash
# Backend
npm install nombre-paquete

# Frontend
cd dashboard
npm install nombre-paquete
```

## 🌐 Acceso desde Otras PCs en la Red

### 1. Configurar Firewall (Windows)
```bash
# Permitir puerto 3000 (backend)
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=3000

# Permitir puerto 5173 (frontend)
netsh advfirewall firewall add rule name="Vite Frontend" dir=in action=allow protocol=TCP localport=5173
```

### 2. Iniciar con Host 0.0.0.0
```bash
# Backend con acceso externo
npm start -- --host 0.0.0.0

# Frontend con acceso externo
cd dashboard
npm run dev -- --host 0.0.0.0
```

### 3. Acceder desde otra PC
```
# Reemplazar 192.168.1.100 con la IP real
http://192.168.1.100:5173  (Frontend)
http://192.168.1.100:3000  (Backend API)
```

## 🔒 Base de Datos

La base de datos está en **Neon.tech** (PostgreSQL en la nube), por lo que:
- ✅ **NO necesitas instalar PostgreSQL local**
- ✅ **NO necesitas configurar base de datos**
- ✅ **Automáticamente conecta con las credenciales en .env**

## 📱 Funcionalidades Disponibles

### ✨ Páginas Principales:
- **Home**: Dashboard principal
- **Recuperación**: Tablas con ordenamiento clickeable
- **SucursalesAlerta**: Monitoreo de sucursales optimizado
- **Ventas**: Gestión de ventas
- **Aclaraciones**: Sistema de aclaraciones
- **CargosAuto**: Cargos automáticos

### 🎯 Características Especiales:
- **Tablas Ordenables**: Click en columnas para ordenar
- **Diseño Responsive**: Funciona en móviles y tablets
- **Optimización de Rendimiento**: Consultas SQL optimizadas
- **UI Moderna**: Glassmorphism y efectos backdrop-blur

## 🆘 Solución de Problemas

### Error de Puerto Ocupado:
```bash
# Cambiar puerto en package.json o usar:
npx kill-port 3000
npx kill-port 5173
```

### Error de Dependencias:
```bash
# Limpiar e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

### Error de Conexión a Base de Datos:
- Verificar que el `.env` tenga la URL correcta
- Verificar conexión a internet
- Contactar al administrador si persiste

## 📞 Contacto

Si tienes problemas con la configuración, verifica:
1. ✅ Node.js instalado correctamente
2. ✅ Dependencias instaladas sin errores
3. ✅ Archivo .env configurado
4. ✅ Puertos no ocupados por otras aplicaciones
