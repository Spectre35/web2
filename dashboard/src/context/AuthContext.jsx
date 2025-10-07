import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Usar la misma configuración que el resto de la app
  const API_BASE = import.meta.env.VITE_API_URL || (() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    if (hostname.startsWith('192.168.')) {
      return `http://${hostname}:3001`;
    }
    if (hostname === 'cargosfraudes.onrender.com') {
      return 'https://buscadores.onrender.com';
    }
    return 'http://localhost:3001';
  })();

  // 🔥 NUEVO: Función centralizada para manejar expiración de token
  const handleTokenExpiration = useCallback(() => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setIsAuthenticated(false);
    console.log('🔒 Token expirado - sesión cerrada automáticamente');
    
    // Redirigir al login si no estamos ya ahí
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  // Verificar token al cargar la app y registrar manejador global
  useEffect(() => {
    checkAuth();
    
    // Registrar el manejador global para interceptores
    if (typeof window.setGlobalTokenExpirationHandler === 'function') {
      window.setGlobalTokenExpirationHandler(handleTokenExpiration);
    }
  }, [handleTokenExpiration]);

  // 🔥 NUEVO: Verificar expiración del token automáticamente
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        
        // Si el token está cerca de expirar (1 segundo antes) o ya expiró - TESTING
        if (currentTime >= expirationTime - 1000) {
          console.log('⏰ Token expirado o por expirar, cerrando sesión');
          handleTokenExpiration();
        }
      } catch (error) {
        console.error('Error verificando expiración del token:', error);
        handleTokenExpiration();
      }
    };

    // Verificar inmediatamente
    checkTokenExpiration();
    
    // Verificar cada segundo durante testing
    const interval = setInterval(checkTokenExpiration, 1000);
    
    return () => clearInterval(interval);
  }, [token, handleTokenExpiration]);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('jwt_token');
      
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Verificar si el token es válido
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (response.ok) {
        setToken(storedToken);
        setIsAuthenticated(true);
        console.log('✅ Usuario autenticado correctamente');
      } else {
        // Token inválido, limpiar
        localStorage.removeItem('jwt_token');
        console.log('❌ Token inválido, redirigiendo a login');
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      localStorage.removeItem('jwt_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('jwt_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        console.log('✅ Login exitoso');
        return { success: true };
      } else {
        console.log('❌ Login fallido:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error de conexión' };
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setIsAuthenticated(false);
    console.log('👋 Sesión cerrada manualmente');
  };

  const value = {
    isAuthenticated,
    token,
    loading,
    login,
    logout,
    checkAuth,
    handleTokenExpiration // 🔥 NUEVO: Exponer función para uso global
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};