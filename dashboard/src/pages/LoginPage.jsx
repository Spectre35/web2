import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación extra antes de enviar
    if (!password.trim()) {
      setError('Por favor ingresa una contraseña');
      return;
    }
    
    setLoading(true);
    setError('');

    const result = await login(password);
    
    if (result.success) {
      // Redirigir al dashboard después del login exitoso
      navigate('/', { replace: true });
    } else {
      setError(result.message || 'Error de autenticación');
      setPassword('');
    }
    
    setLoading(false);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Limpiar error cuando el usuario empiece a escribir
    if (error) {
      setError('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (password && password.trim().length > 0 && !loading) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Acceso al Sistema</h1>
          <p className="text-gray-400">Ingresa la contraseña para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700">
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2 flex items-center justify-between">
              Contraseña de Acceso
              {password && password.trim().length > 0 && (
                <span className="text-xs text-green-400 flex items-center">
                  ✅ Listo para ingresar
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyPress}
                className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                placeholder="Ingresa tu contraseña"
                autoFocus
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!password || password.trim().length === 0 || loading}
            className={`w-full font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
              password && password.trim().length > 0 && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verificando...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            🔒 Acceso seguro con autenticación JWT
          </p>
          <p className="text-gray-600 text-xs mt-1">
            La sesión expira en 12 horas
          </p>
        </div>
      </div>
    </div>
  );
}