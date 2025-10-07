import { useAuth } from '../context/AuthContext';
import { useEffect, useCallback } from 'react';

export const useAuthenticatedFetch = () => {
  const { token, logout } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    // Agregar token a las headers automáticamente
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers
      });

      // Si el token expiró o es inválido, usar el manejador global
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Token expirado detectado en useAuthenticatedFetch');
        
        // Usar el manejador global si está disponible
        if (window.globalTokenExpirationHandler && typeof window.globalTokenExpirationHandler === 'function') {
          window.globalTokenExpirationHandler();
        } else {
          // Fallback al logout local
          logout();
        }
        return response;
      }

      return response;
    } catch (error) {
      console.error('Error en fetch autenticado:', error);
      throw error;
    }
  }, [token, logout, API_BASE]);

  return authenticatedFetch;
};