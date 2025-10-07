import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expirado o inválido
      console.log('🔒 Token expirado detectado en api.js interceptor');
      
      // Usar el manejador global si está disponible
      if (window.globalTokenExpirationHandler && typeof window.globalTokenExpirationHandler === 'function') {
        window.globalTokenExpirationHandler();
      } else {
        // Fallback al método anterior
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Función para hacer fetch con token automático
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('jwt_token');
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    if (response.status === 401 || response.status === 403) {
      console.log('🔒 Token expirado detectado en authenticatedFetch');
      
      // Usar el manejador global si está disponible
      if (window.globalTokenExpirationHandler && typeof window.globalTokenExpirationHandler === 'function') {
        window.globalTokenExpirationHandler();
      } else {
        // Fallback al método anterior
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error) {
    console.error('Error en fetch autenticado:', error);
    throw error;
  }
};

export default api;
export { API_BASE_URL };