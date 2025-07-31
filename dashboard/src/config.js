// Configuración automática de API
function detectarIPLocal() {
  // Priorizar variable de entorno si existe
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  
  // Si estamos en localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:3001";
  }
  
  // Si estamos en la IP de la red, usar la IP de la red
  if (hostname === '192.168.1.245') {
    return "http://192.168.1.245:3001";
  }
  
  // Si estamos en producción (Render), usar la URL del backend en Render
  if (hostname.includes('onrender.com') || hostname.includes('render.com')) {
    return "https://sistema-aclaraciones-backend.onrender.com";
  }
  
  // Por defecto usar localhost
  return "http://localhost:3001";
}

export const API_BASE_URL = detectarIPLocal();

console.log(`🔧 API configurada para: ${API_BASE_URL} (desde ${window.location.hostname})`);
console.log(`📊 Variables de entorno:`, {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV
});
