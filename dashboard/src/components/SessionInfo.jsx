import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Clock, User } from 'lucide-react';

const SessionInfo = () => {
  const { token } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!token) return;

    const updateTimer = () => {
      try {
        // Decodificar JWT para obtener tiempo de expiración
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convertir a ms
        const currentTime = Date.now();
        const timeLeft = expirationTime - currentTime;

        if (timeLeft <= 0) {
          setTimeRemaining('Expirado');
          return;
        }

        // Formatear tiempo restante
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining(`${hours}h ${minutes}m`);
      } catch (error) {
        setTimeRemaining('N/A');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Actualizar cada segundo para testing

    return () => clearInterval(interval);
  }, [token]);

  if (!token) return null;

  return (
    <div className="fixed top-4 right-20 z-40 bg-gray-800 text-white rounded-lg px-3 py-2 shadow-lg border border-gray-600">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Shield size={14} className="text-green-400" />
          <span className="text-green-400">Conectado</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} className="text-blue-400" />
          <span className="text-gray-300">{timeRemaining}</span>
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;