// Configuración de API optimizada para Render
// Detecta automáticamente el entorno y configura la URL base

const getAPIBaseURL = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // En desarrollo local
  if (import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // En Render.com - URL específica del backend
  if (hostname.includes('onrender.com')) {
    return 'https://buscadores.onrender.com';
  }
  
  // Fallback para otros servicios de hosting que usen puerto específico
  return `${protocol}//${hostname}:10000`;
};

export const API_BASE_URL = getAPIBaseURL();

// Debug mejorado - funciona en desarrollo y producción
console.log(`🔧 API Base URL: ${API_BASE_URL}`);
console.log(`📍 Current hostname: ${window.location.hostname}`);
console.log(`🌍 Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}`);
