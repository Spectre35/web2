# 🔍 Sistema de Consultas Web 2.0

Sistema integral de consultas y administración de datos para múltiples tablas con funcionalidades avanzadas de búsqueda, filtrado y gestión de datos.

## 🚀 Características Principales

- **Dashboard Interactivo**: Interfaz moderna con React.js y Tailwind CSS
- **Múltiples Módulos**: Cargos Auto, Caja, Ventas, Aclaraciones y más
- **Búsqueda Avanzada**: Filtros por fecha, monto, sucursal, procesador, etc.
- **Carga Masiva**: Sistema de subida de archivos Excel con validación
- **Integración Slack**: Mapeo de sucursales con usuarios de Slack
- **Control de Versiones**: Integración completa con Git

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** con Express.js
- **PostgreSQL** (Base de datos principal)
- **ExcelJS** para procesamiento de archivos Excel
- **Multer** para carga de archivos
- **CORS** para manejo de peticiones cruzadas

### Frontend
- **React.js 19** con Hooks
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Axios** para peticiones HTTP
- **React Router** para navegación
- **Recharts** para gráficos
- **React Dropzone** para carga de archivos

### Herramientas
- **ESLint** para calidad de código
- **Git** para control de versiones

## 📂 Estructura del Proyecto

```
Web_Consultas_2/
├── 📁 dashboard/          # Frontend React
│   ├── 📁 src/
│   │   ├── 📁 components/ # Componentes reutilizables
│   │   ├── 📁 pages/      # Páginas principales
│   │   ├── 📁 utils/      # Utilidades (formateo de fechas, etc.)
│   │   └── 📁 assets/     # Recursos estáticos
│   ├── package.json      # Dependencias del frontend
│   └── vite.config.js     # Configuración de Vite
├── 📄 server.js           # Servidor backend principal
├── 📄 migrar.js           # Script de migración de datos
├── 📄 procesar-slack.js   # Procesador de usuarios Slack
├── 📄 package.json        # Dependencias del backend
└── 📄 .gitignore          # Archivos excluidos de Git
```

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd Web_Consultas_2
```

### 2. Instalar dependencias del backend
```bash
npm install
```

### 3. Instalar dependencias del frontend
```bash
cd dashboard
npm install
cd ..
```

### 4. Configurar base de datos
- Asegurar conexión a PostgreSQL en `server.js`
- Ejecutar migraciones si es necesario: `node migrar.js`

### 5. Iniciar servicios

#### Backend (Puerto 3000)
```bash
npm start
# o
node server.js
```

#### Frontend (Puerto 5173)
```bash
cd dashboard
npm run dev
```

## 📋 Módulos Disponibles

### 🏢 Sucursal-Bloque
- Búsqueda de sucursales por bloque
- Integración con usuarios de Slack
- Filtros dinámicos

### 💳 Cargos Auto
- Consulta de transacciones automáticas
- Filtros por procesador, fecha, monto
- Exportación a Excel

### 💰 Caja
- Gestión de movimientos de caja
- Búsqueda por sucursal y fecha
- Análisis de montos

### 🛒 Ventas
- Consulta de ventas por sucursal
- Filtros avanzados por fecha y monto
- Exportación de reportes

### 🔄 Aclaraciones
- **Consulta**: Búsqueda de aclaraciones existentes
- **Ingreso Masivo**: Sistema tipo Excel para captura rápida
- Validaciones automáticas
- Conversión de monedas automática

### 📊 Dashboard Recuperación
- Visualización de gráficos interactivos
- Análisis por bloques y sucursales
- Métricas de recuperación

### 👥 Panel de Administración
- Carga masiva de archivos Excel
- Actualización de tablas
- Progreso en tiempo real

## 🔐 Características de Seguridad

- Validación de archivos Excel
- Sanitización de datos de entrada
- Control de acceso por contraseña en panel admin
- Manejo seguro de conexiones a base de datos

## 🎨 Interfaz de Usuario

- **Diseño Moderno**: Gradientes glassmorphism y animaciones CSS
- **Responsivo**: Adaptable a dispositivos móviles y desktop
- **Tema Oscuro**: Colores optimizados para reducir fatiga visual
- **Navegación Intuitiva**: Menús claros y accesibles

## 🔄 Integración Slack

- Mapeo automático de sucursales con usuarios Slack
- Procesamiento de archivos Excel con usuarios
- Formato automático (@usuario en minúsculas)
- Base de datos dedicada `usuarios_slack`

## 📈 Funcionalidades Avanzadas

### Sistema de Formateo de Fechas
- Conversión automática a formato dd/mm/aaaa
- Detección inteligente de columnas de fecha
- Aplicación consistente en todas las tablas

### Carga Masiva de Datos
- Interfaz tipo Excel para ingreso rápido
- Validaciones en tiempo real
- Autocompletado de campos
- Conversión automática de monedas

### Búsqueda y Filtrado
- Filtros múltiples simultáneos
- Búsqueda en tiempo real
- Paginación eficiente
- Exportación de resultados

## 🐛 Scripts de Utilidad

- `analizar-aclaraciones.js`: Análisis de estructura de tabla
- `diagnosticar-excel.js`: Diagnóstico de archivos Excel
- `eliminar-nulls-caja.js`: Limpieza de datos nulos
- `check-columns.js`: Verificación de columnas de BD

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Changelog

### v2.0.0 - Actual
- ✅ Sistema completo de aclaraciones con ingreso masivo
- ✅ Integración Slack para sucursales
- ✅ Formateo automático de fechas dd/mm/aaaa
- ✅ Sistema de control de versiones Git
- ✅ Interfaz moderna con React 19
- ✅ Validaciones y conversiones automáticas

### v1.0.0 - Inicial
- ✅ Módulos básicos de consulta
- ✅ Conexión a base de datos PostgreSQL
- ✅ Interfaz básica con React

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ para optimizar la gestión de datos empresariales**
