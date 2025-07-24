// Configuración automática de API
function detectarIPLocal() {
  const hostname = window.location.hostname;
  
  // Si estamos en localhost, intentar primero localhost, luego IP de la red
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:3000";
  }
  
  // Si estamos en la IP de la red, usar localhost
  if (hostname === '192.168.1.111') {
    return "http://localhost:3000";
  }
  
  // Por defecto usar localhost (más universal)
  return "http://localhost:3000";
}

export const API_BASE_URL = detectarIPLocal();

console.log(`🔧 API configurada para: ${API_BASE_URL} (desde ${window.location.hostname})`);
