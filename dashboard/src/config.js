// Configuración de API optimizada para Render
// Detecta automáticamente el entorno y configura la URL base

const getAPIBaseURL = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // En desarrollo local
  if (import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // En Render.com - patrón: frontend = app-spa.onrender.com, backend = app-backend.onrender.com
  if (hostname.includes('onrender.com')) {
    // Si estamos en el frontend (-spa), apuntar al backend (-backend)
    if (hostname.includes('-spa')) {
      const backendHost = hostname.replace('-spa', '-backend');
      return `${protocol}//${backendHost}`;
    }
    // Si por alguna razón no tiene -spa, asumir que es el patrón estándar
    else {
      const backendHost = hostname.replace(/^([^.]+)/, '$1-backend');
      return `${protocol}//${backendHost}`;
    }
  }
  
  // Fallback para otros servicios de hosting que usen puerto específico
  return `${protocol}//${hostname}:10000`;
};

export const API_BASE_URL = getAPIBaseURL();

// Debug mejorado - funciona en desarrollo y producción
console.log(`🔧 API Base URL: ${API_BASE_URL}`);
console.log(`📍 Current hostname: ${window.location.hostname}`);
console.log(`🌍 Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}`);
