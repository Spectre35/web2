import React from "react";
import { Link, useLocation } from "react-router-dom";
import CeciCursed from "../assets/ceci cursed.png";
import DetonArturo from "../assets/detonarturo.png";
import { useSidebar } from "../context/SidebarContext.jsx";

const sidebarLinks = [
  // Inicio - Home
  { to: "/", label: "🏠 Inicio", section: "inicio" },
  
  // Panel de control
  { to: "/panel", label: "⚙️ Panel de Control", section: "panel" },
  
  // Buscadores principales
  { to: "/cargos-auto", label: "🔍 Cargos Auto", section: "buscadores" },
  { to: "/caja", label: "💵 Caja", section: "buscadores" },
  { to: "/ventas", label: "🔍 Reporte de Prevención", section: "buscadores" },
  { to: "/aclaraciones", label: "💳 Aclaraciones", section: "buscadores" },
  { to: "/ingresar-aclaraciones", label: "📝 Ingresar Aclaraciones", section: "buscadores" },
  { to: "/excel-grid-react19", label: "🚀 Excel Grid (React 19)", section: "buscadores" },
  { to: "/vendedoras-status", label: "👩‍💼 Vendedoras Status", section: "buscadores" },
  { to: "/sucursal-bloque", label: "🏢 Sucursal-Bloque", section: "buscadores" },
  { to: "/buscador-bin", label: "🔍 Buscador de BINs", section: "buscadores" },
  // { to: "/procesador-bins-masivo", label: "⚡ Procesador BINs Masivo", section: "buscadores" },
  // { to: "/procesador-distribuido", label: "🚀 Procesador Distribuido", section: "buscadores" },
  // { to: "/gestor-apis", label: "🔧 Gestor de APIs", section: "buscadores" },
  
  // Análisis y dashboards
  { to: "/sucursales-alerta", label: "🚨 Alertas Sucursales", section: "analisis" },
  { to: "/telefonos-duplicados", label: "📱 Teléfonos Duplicados", section: "analisis" },
  { to: "/tarjetas-duplicadas", label: "💳 Tarjetas Duplicadas", section: "analisis" },
  { to: "/dashboard-recuperacion", label: "📊 Recuperación", section: "analisis" },  
  { to: "/dashboard-aclaraciones", label: "📈 Dashboard Aclaraciones", section: "analisis" },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen } = useSidebar();
  return (
    <aside
      className={`bg-gradient-to-b from-slate-900 via-gray-900 to-slate-800 h-screen flex flex-col shadow-2xl z-40 border-r border-gray-700/30
        md:sticky md:top-0 md:self-start
        fixed top-0 left-0
        transition-all duration-500 ease-in-out overflow-hidden
        ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0'}
        ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ height: '100vh' }}
    >
      {/* Header del Sidebar */}
      <div className={`pt-8 pb-6 px-6 flex flex-col items-center border-b border-gray-700/30 transition-all duration-500 ease-in-out
        ${sidebarOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="relative mb-4">
          <img 
            src={CeciCursed} 
            alt="Ceci Cursed" 
            className="w-14 h-14 rounded-full shadow-lg object-cover ring-2 ring-blue-400/20" 
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
        </div>
        <h2 className="text-lg font-bold text-gray-100 text-center mb-1">Panel de Control</h2>
        <p className="text-xs text-gray-400 text-center">Sistema de Análisis</p>
      </div>

      {/* Navegación */}
      <nav className={`flex flex-col py-4 px-3 flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ease-in-out
        ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Sección de Inicio */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inicio</span>
          </div>
          <Link
            to="/"
            className={`group flex items-center w-full p-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2
              ${location.pathname === '/' 
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600/30'
              }`}
          >
            <span className="text-lg mr-3">🏠</span>
            <span className="truncate">Inicio</span>
            {location.pathname === '/' && (
              <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
            )}
          </Link>
        </div>

        {/* Sección de Panel de Control */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Panel</span>
          </div>
          {sidebarLinks.filter(link => link.section === 'panel').map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex items-center w-full p-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2
                ${location.pathname === link.to 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600/30'
                }`}
            >
              <span className="text-lg mr-3">{link.label.split(' ')[0]}</span>
              <span className="truncate">{link.label.substring(link.label.indexOf(' ') + 1)}</span>
              {location.pathname === link.to && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
              )}
            </Link>
          ))}
        </div>

        {/* Sección de Buscadores */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Buscadores</span>
          </div>
          {sidebarLinks.filter(link => link.section === 'buscadores').map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex items-center w-full p-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2
                ${location.pathname === link.to 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600/30'
                }`}
            >
              <span className="text-lg mr-3">{link.label.split(' ')[0]}</span>
              <span className="truncate">{link.label.substring(link.label.indexOf(' ') + 1)}</span>
              {location.pathname === link.to && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
              )}
            </Link>
          ))}
        </div>

        {/* Sección de Dashboards */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Análisis</span>
          </div>
          {sidebarLinks.filter(link => link.section === 'analisis').map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex items-center w-full p-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2
                ${location.pathname === link.to 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600/30'
                }`}
            >
              <span className="text-lg mr-3">{link.label.split(' ')[0]}</span>
              <span className="truncate">{link.label.substring(link.label.indexOf(' ') + 1)}</span>
              {location.pathname === link.to && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
              )}
            </Link>
          ))}
        </div>

        {/* Footer del Sidebar */}
        <div className="mt-auto pt-4 border-t border-gray-700/30">
          <div className="px-3 py-2">
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span>Sistema Activo</span>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
