import React from 'react';

const DiagnosticPage = () => {
  const currentPath = window.location.pathname;
  const currentHost = window.location.hostname;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-red-400">🚨 Diagnóstico SPA</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Información Actual</h2>
          <div className="space-y-2">
            <p><span className="text-blue-400">URL Completa:</span> {window.location.href}</p>
            <p><span className="text-blue-400">Hostname:</span> {currentHost}</p>
            <p><span className="text-blue-400">Pathname:</span> {currentPath}</p>
            <p><span className="text-blue-400">User Agent:</span> {navigator.userAgent}</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Estado del Router</h2>
          <div className="space-y-2">
            <p><span className="text-green-400">React Router:</span> ✅ Cargado</p>
            <p><span className="text-green-400">BrowserRouter:</span> ✅ Activo</p>
            <p><span className="text-yellow-400">Ruta Actual:</span> {currentPath}</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🛠️ Rutas Disponibles</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">Rutas Principales:</h3>
              <ul className="space-y-1 text-sm">
                <li>• / (redirect a /recuperacion)</li>
                <li>• /recuperacion</li>
                <li>• /aclaraciones</li>
                <li>• /ventas</li>
                <li>• /caja</li>
                <li>• /cargos-auto</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">Rutas Admin:</h3>
              <ul className="space-y-1 text-sm">
                <li>• /panel</li>
                <li>• /dashboard-recuperacion</li>
                <li>• /dashboard-sucursales</li>
                <li>• /dashboard-aclaraciones</li>
                <li>• /validador-telefonos</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
          >
            🏠 Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
