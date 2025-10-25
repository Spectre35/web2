import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function TempPasswordManager() {
  const [status, setStatus] = useState({
    enabled: false,
    tempPassword: null,
    created: null,
    permanentExists: false
  });
  const [newTempPassword, setNewTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE_URL}/api/auth/temp-password/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (err) {
      console.error("Error cargando estado:", err);
      setMensaje("❌ Error cargando estado de contraseña temporal");
    }
  };

  const enableTempPassword = async () => {
    if (!newTempPassword || newTempPassword.length < 4) {
      setMensaje("❌ La contraseña debe tener al menos 4 caracteres");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/temp-password/enable`,
        { tempPassword: newTempPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMensaje("✅ Contraseña temporal activada exitosamente");
      setNewTempPassword("");
      await loadStatus();
    } catch (err) {
      setMensaje(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disableTempPassword = async () => {
    if (!confirm("¿Estás seguro de desactivar la contraseña temporal?")) {
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/temp-password/disable`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMensaje("✅ Contraseña temporal desactivada exitosamente");
      await loadStatus();
    } catch (err) {
      setMensaje(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString('es-ES');
  };

  return (
    <div className="backdrop-blur-lg bg-white/10 p-6 rounded-xl shadow-xl border border-white/20">
      <h2 className="text-xl font-bold mb-4 text-gray-100 drop-shadow flex items-center">
        🔑 Gestión de Contraseña Temporal
      </h2>

      {/* Estado Actual */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-4 border border-gray-600">
        <h3 className="font-semibold text-gray-200 mb-2">📋 Estado Actual</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Contraseña Permanente:</span>
            <span className="text-green-400">
              {status.permanentExists ? "✅ Activa" : "❌ No configurada"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Contraseña Temporal:</span>
            <span className={status.enabled ? "text-green-400" : "text-red-400"}>
              {status.enabled ? "✅ Activa" : "❌ Desactivada"}
            </span>
          </div>
          {status.enabled && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Contraseña:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono bg-gray-900 px-2 py-1 rounded text-yellow-300">
                    {showPassword ? status.tempPassword : "••••••••"}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    {showPassword ? "🙈 Ocultar" : "👁️ Ver"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Creada:</span>
                <span className="text-gray-400">{formatDate(status.created)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controles */}
      {!status.enabled ? (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              🔐 Nueva Contraseña Temporal
            </label>
            <input
              type="password"
              className="w-full p-3 rounded-lg bg-gray-800 text-gray-100 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mínimo 4 caracteres"
              value={newTempPassword}
              onChange={(e) => setNewTempPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enableTempPassword()}
            />
          </div>
          <button
            onClick={enableTempPassword}
            disabled={loading || !newTempPassword}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            {loading ? "⏳ Activando..." : "✅ Activar Contraseña Temporal"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded-lg">
            <p className="text-yellow-200 text-sm">
              ⚠️ <strong>Contraseña temporal activa.</strong> Los usuarios pueden acceder con esta contraseña hasta que la desactives.
            </p>
          </div>
          <button
            onClick={disableTempPassword}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            {loading ? "⏳ Desactivando..." : "🗑️ Desactivar Contraseña Temporal"}
          </button>
        </div>
      )}

      {/* Mensaje de resultado */}
      {mensaje && (
        <div className="mt-4 text-center text-gray-200">
          <div className="text-sm bg-gray-800 border border-gray-600 rounded-lg p-3 whitespace-pre-line">
            {mensaje}
          </div>
        </div>
      )}

      {/* Información */}
      <div className="mt-4 bg-blue-900/30 border border-blue-600 p-3 rounded-lg">
        <p className="text-blue-200 text-xs">
          💡 <strong>Info:</strong> La contraseña permanente (<code>veda0610##</code>) siempre funciona. 
          La temporal es adicional y puedes activarla/desactivarla cuando necesites dar acceso temporal.
        </p>
      </div>
    </div>
  );
}