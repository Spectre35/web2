// Configuración de API simplificada
// Detecta automáticamente el entorno y configura la URL base

const getAPIBaseURL = () => {
  // En desarrollo
  if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  
  // En producción (Render o cualquier otro hosting)
  // Usa la misma URL del frontend pero en puerto 3000
  return `${window.location.protocol}//${window.location.hostname}:3000`;
};

export const API_BASE_URL = getAPIBaseURL();

// Debug solo en desarrollo
if (import.meta.env.DEV) {
  console.log(`🔧 API configurada: ${API_BASE_URL}`);
  console.log(`📍 Hostname actual: ${window.location.hostname}`);
}
