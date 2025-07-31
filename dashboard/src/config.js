// Configuración automática de API con ofuscación avanzada
function detectarIPLocal() {
  const hostname = window.location.hostname;
  
  // Desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:3001";
  }
  
  // Red local
  if (hostname === '192.168.1.245') {
    return "http://192.168.1.245:3001";
  }
  
  // Producción - URL ofuscada con algoritmo personalizado
  if (hostname.includes('onrender.com') || hostname.includes('render.com')) {
    // Datos fragmentados y transformados
    const parts = [
      [104,116,116,112,115,58,47,47], // https://
      [98,117,115,99,97,100,111,114,101,115], // buscadores
      [46,111,110,114,101,110,100,101,114,46,99,111,109] // .onrender.com
    ];
    
    // Aplicar transformación XOR con clave rotativa
    const keys = [0x05, 0x0A, 0x03];
    let result = "";
    
    parts.forEach((part, partIndex) => {
      const key = keys[partIndex];
      part.forEach(byte => {
        result += String.fromCharCode(byte ^ key ^ 0x05);
      });
    });
    
    return result;
  }
  
  return "http://localhost:3001";
}

export const API_BASE_URL = detectarIPLocal();

// Solo mostrar logs en desarrollo
if (import.meta.env.DEV) {
  console.log(`🔧 API configurada para: ${API_BASE_URL} (desde ${window.location.hostname})`);
}
