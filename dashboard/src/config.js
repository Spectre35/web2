// Configuración de API con sistema de seguridad avanzado
import { ConfigManager } from './utils/configManager.js';
import { debugConfig } from './utils/debugConfig.js';

// Generar configuración dinámicamente
export const API_BASE_URL = ConfigManager.getEndpoint('production');

// Debug solo en desarrollo
if (import.meta.env.DEV) {
  console.log(`🔧 API configurada desde: ${window.location.hostname}`);
  debugConfig();
}
