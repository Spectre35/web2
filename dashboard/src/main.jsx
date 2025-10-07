import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // ✅ MUY IMPORTANTE
import { verificarIPAutorizada } from "./utils/ipSecurity.js";
import { keepAliveService } from "./utils/keepAlive.js";
import { API_BASE_URL } from "./config.js";
import axios from "axios";

// Variable global para manejar la expiración del token
window.globalTokenExpirationHandler = null;

// Función para establecer el manejador global
window.setGlobalTokenExpirationHandler = (handler) => {
  window.globalTokenExpirationHandler = handler;
};

// Configurar interceptor global de axios para JWT
axios.interceptors.request.use(
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

// Interceptor para manejar respuestas no autorizadas
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔒 Token expirado detectado en axios interceptor');
      
      // Usar el manejador global si está disponible
      if (window.globalTokenExpirationHandler) {
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

// Interceptar fetch globalmente para agregar JWT automáticamente
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const token = localStorage.getItem('jwt_token');
  
  // Si hay token, agregarlo a los headers
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  return originalFetch(url, options).then(response => {
    // Si hay error de autorización, usar el manejador global
    if (response.status === 401 || response.status === 403) {
      console.log('🔒 Token expirado detectado en fetch interceptor');
      
      // Usar el manejador global si está disponible
      if (window.globalTokenExpirationHandler) {
        window.globalTokenExpirationHandler();
      } else {
        // Fallback al método anterior
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
      }
    }
    return response;
  });
};

// Verificar IP antes de cargar la aplicación
verificarIPAutorizada().then(autorizado => {
  if (autorizado) {
    // Inicializar keep-alive para mantener servicios activos
    keepAliveService.init(API_BASE_URL);
    
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
  // Si no está autorizado, ipSecurity.js ya mostró la página de error
});
