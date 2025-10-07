// Configuración de API con sistema de seguridad avanzado
// import { ConfigManager } from './utils/configManager.js';

// Configuración temporal simplificada
const getAPIBaseURL = () => {
  const hostname = window.location.hostname;

  // Desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Red privada (192.168.x.x)
  if (hostname.startsWith('192.168.')) {
    return `http://${hostname}:3001`;
  }

  // Producción en Render
  if (hostname === 'cargosfraudes.onrender.com') {
    return 'https://buscadores.onrender.com';
  }

  // Producción (por defecto - usar el backend real)
  return 'https://buscadores.onrender.com';
};

// Generar configuración dinámicamente
export const API_BASE_URL = getAPIBaseURL();

// Debug solo en desarrollo
if (import.meta.env.DEV) {
  console.log(`🔧 API configurada desde: ${window.location.hostname}`);
  console.log(`🔗 API_BASE_URL: ${API_BASE_URL}`);
}
