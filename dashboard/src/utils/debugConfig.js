// Debug de configuración para verificar URLs
import { ConfigManager } from './configManager.js';

export const debugConfig = () => {
  console.group('🔍 DEBUG CONFIGURACIÓN');
  console.log('🌐 Hostname actual:', window.location.hostname);
  console.log('📍 URL completa:', window.location.href);
  console.log('🔗 API Base URL:', ConfigManager.getEndpoint('production'));
  console.log('🎯 Tipo de entorno detectado:', getEnvironmentType());
  console.groupEnd();
};

const getEnvironmentType = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '🏠 DESARROLLO (localhost)';
  }
  
  if (hostname.includes('render.com') || hostname.includes('render')) {
    return '🚀 PRODUCCIÓN (Render)';
  }
  
  // Verificar red privada
  const parts = hostname.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    if ((first === 192 && second === 168) || 
        (first === 10) || 
        (first === 172 && second >= 16 && second <= 31)) {
      return '🏘️ RED PRIVADA';
    }
  }
  
  return '❓ DESCONOCIDO';
};
