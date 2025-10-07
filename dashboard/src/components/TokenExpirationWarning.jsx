import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const TokenExpirationWarning = () => {
  const { token, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeLeft = expirationTime - currentTime;

        // Mostrar aviso si quedan menos de 10 minutos
        if (timeLeft > 0 && timeLeft <= 600000) { // 10 minutos
          setShowWarning(true);
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('Error verificando expiración del token:', error);
      }
    };

    // Verificar inmediatamente
    checkTokenExpiration();
    
    // Verificar cada 30 segundos cuando se muestra el aviso
    const interval = setInterval(checkTokenExpiration, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  const handleRefreshSession = () => {
    // Recargar la página para forzar un nuevo login
    window.location.reload();
  };

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white rounded-lg px-4 py-3 shadow-lg border border-orange-400 min-w-80">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-orange-200 flex-shrink-0" />
        
        <div className="flex-1">
          <p className="text-sm font-medium">⚠️ Su sesión expirará pronto</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock size={14} className="text-orange-200" />
            <span className="text-xs">Tiempo restante: {timeRemaining}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRefreshSession}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
            title="Renovar sesión"
          >
            <RefreshCw size={12} />
            Renovar
          </button>
          
          <button
            onClick={() => setShowWarning(false)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors"
            title="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenExpirationWarning;