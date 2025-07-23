// Configuración dinámica según el entorno
const isDevelopment = import.meta.env.MODE === 'development';

// URL base del API
export const API_BASE_URL = isDevelopment 
  ? import.meta.env.VITE_API_URL || "http://192.168.1.111:3001"  // Desarrollo
  : "http://192.168.1.111:3000";  // Producción

// Otras configuraciones que pueden cambiar
export const CONFIG = {
  isDevelopment,
  showDebugInfo: isDevelopment,
  apiTimeout: isDevelopment ? 10000 : 5000,
  logLevel: isDevelopment ? 'debug' : 'error'
};

console.log(`🔧 Configuración cargada:`, {
  entorno: isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN',
  apiUrl: API_BASE_URL,
  puerto: window.location.port
});
