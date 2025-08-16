import { memo } from "react";
import { Link } from "react-router-dom";
import { block } from "million/react";
import { useCargosAuto } from "../hooks/useCargosAuto";

// ==================== COMPONENTES AUXILIARES ====================

// Componente de filtro avanzado tipo Excel (memorizado para evitar re-renders)
const FiltroExcelAvanzado = memo(({ 
  columna, 
  valoresUnicos, 
  filtrosColumnas, 
  busquedaFiltros, 
  ordenColumnas, 
  seleccionMultiple, 
  datos,
  onBusquedaChange, 
  onOrdenarChange, 
  onToggleSeleccion, 
  onSeleccionarTodos, 
  onDeseleccionarTodos, 
  onAplicarSeleccion, 
  onLimpiarFiltro, 
  onCerrar,
  obtenerValoresFiltrados
}) => {
  const valoresFiltrados = obtenerValoresFiltrados(columna);
  const seleccionados = seleccionMultiple[columna] || [];
  const busqueda = busquedaFiltros[columna] || '';
  const orden = ordenColumnas[columna] || 'asc';
  
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-gray-800 border border-gray-600/50 rounded-lg shadow-lg min-w-72 max-w-80 max-h-96 flex flex-col backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-200">{columna}</h4>
          <button
            onClick={() => onCerrar(columna)}
            className="text-gray-400 hover:text-gray-200 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700/50"
          >
            ×
          </button>
        </div>
        
        {/* Búsqueda */}
        <div className="relative mb-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(columna, e.target.value)}
            placeholder="Buscar..."
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Controles */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => onOrdenarChange(columna)}
            className="flex-1 px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded transition-colors"
          >
            {orden === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>
          <button
            onClick={() => onSeleccionarTodos(columna)}
            className="flex-1 px-3 py-1.5 text-xs bg-blue-600/50 hover:bg-blue-600/70 text-gray-200 rounded transition-colors"
          >
            ✓ Todos
          </button>
          <button
            onClick={() => onDeseleccionarTodos(columna)}
            className="flex-1 px-3 py-1.5 text-xs bg-red-600/50 hover:bg-red-600/70 text-gray-200 rounded transition-colors"
          >
            ✗ Ninguno
          </button>
        </div>
      </div>

      {/* Lista de valores */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {valoresFiltrados.map(valor => (
          <label key={valor} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-700/30 rounded text-sm cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={seleccionados.includes(valor)}
              onChange={() => onToggleSeleccion(columna, valor)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50 focus:ring-2"
            />
            <span className="text-gray-200 truncate flex-1" title={valor}>
              {valor}
            </span>
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700/50 flex gap-2">
        <button
          onClick={() => onAplicarSeleccion(columna)}
          className="flex-1 px-3 py-2 bg-blue-600/60 hover:bg-blue-600/80 text-gray-200 rounded text-sm transition-colors"
        >
          Aplicar
        </button>
        <button
          onClick={() => onLimpiarFiltro(columna)}
          className="px-3 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded text-sm"
        >
          Limpiar
        </button>
        <button
          onClick={() => onCerrar(columna)}
          className="px-3 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
});

// ==================== COMPONENTE PRINCIPAL ====================

export default function CargosAuto() {
  // 🚀 TODO el estado y lógica ahora viene del hook
  const {
    // Estados
    datos,
    datosFiltrados,
    sucursales,
    procesadores,
    busqueda,
    sucursal,
    fechaInicio,
    fechaFin,
    montoMin,
    montoMax,
    tarjeta,
    terminacion,
    procesadorSeleccionado,
    pagina,
    cargando,
    totalMostrado,
    totalPaginasCalculado,
    fechaUltima,
    dropdownOpen,
    filtrosColumnas,
    dropdownsAbiertos,
    valoresUnicos,
    busquedaFiltros,
    ordenColumnas,
    seleccionMultiple,
    ordenTabla,
    filtroCargoAuto,
    limite,
    columnas,
    
    // Referencias
    dropdownRef,
    mainRef,
    
    // Setters
    setBusqueda,
    setSucursal,
    setFechaInicio,
    setFechaFin,
    setMontoMin,
    setMontoMax,
    setTarjeta,
    setTerminacion,
    setProcesadorSeleccionado,
    setPagina,
    setDropdownOpen,
    setFiltrosColumnas,
    setDropdownsAbiertos,
    setBusquedaFiltros,
    setOrdenColumnas,
    setSeleccionMultiple,
    setOrdenTabla,
    setFiltroCargoAuto,
    setLimite,
    
    // Funciones
    obtenerDatos,
    handlePrevPage,
    handleNextPage,
    handleSearchSubmit,
    exportarExcel,
  } = useCargosAuto();

  // ==================== FUNCIONES AUXILIARES ====================
  
  const obtenerValoresFiltrados = (columna) => {
    const valores = valoresUnicos[columna] || [];
    const busqueda = busquedaFiltros[columna] || '';
    const orden = ordenColumnas[columna] || 'asc';
    
    let filtrados = valores.filter(valor => 
      valor.toString().toLowerCase().includes(busqueda.toLowerCase())
    );
    
    return orden === 'asc' ? filtrados.sort() : filtrados.sort().reverse();
  };

  const handleBusquedaChange = (columna, valor) => {
    setBusquedaFiltros(prev => ({ ...prev, [columna]: valor }));
  };

  const handleOrdenarChange = (columna) => {
    setOrdenColumnas(prev => ({
      ...prev,
      [columna]: prev[columna] === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleToggleSeleccion = (columna, valor) => {
    setSeleccionMultiple(prev => {
      const seleccionados = prev[columna] || [];
      const nuevaSeleccion = seleccionados.includes(valor)
        ? seleccionados.filter(v => v !== valor)
        : [...seleccionados, valor];
      
      return { ...prev, [columna]: nuevaSeleccion };
    });
  };

  const handleSeleccionarTodos = (columna) => {
    const valoresFiltrados = obtenerValoresFiltrados(columna);
    setSeleccionMultiple(prev => ({ ...prev, [columna]: valoresFiltrados }));
  };

  const handleDeseleccionarTodos = (columna) => {
    setSeleccionMultiple(prev => ({ ...prev, [columna]: [] }));
  };

  const handleAplicarSeleccion = (columna) => {
    const seleccionados = seleccionMultiple[columna] || [];
    if (seleccionados.length > 0) {
      setFiltrosColumnas(prev => ({ ...prev, [columna]: seleccionados }));
    }
    setDropdownsAbiertos(prev => ({ ...prev, [columna]: false }));
  };

  const handleLimpiarFiltro = (columna) => {
    setFiltrosColumnas(prev => {
      const nueva = { ...prev };
      delete nueva[columna];
      return nueva;
    });
    setSeleccionMultiple(prev => ({ ...prev, [columna]: [] }));
    setDropdownsAbiertos(prev => ({ ...prev, [columna]: false }));
  };

  const handleCerrarDropdown = (columna) => {
    setDropdownsAbiertos(prev => ({ ...prev, [columna]: false }));
  };

  const handleOrdenamientoTabla = (columna) => {
    setOrdenTabla(prev => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ==================== RENDERIZADO ====================
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Cargos Auto</h1>
            <p className="text-gray-400 mt-1">
              {totalMostrado > 0 
                ? `Filtrados: ${totalMostrado.toLocaleString()} registros | 📊`
                : `${totalMostrado.toLocaleString()} registros | 📊`
              }
            </p>
            {fechaUltima && (
              <p className="text-gray-500 text-sm">Última actualización: {fechaUltima}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={exportarExcel}
              disabled={cargando || datosFiltrados.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              📊 Exportar Excel
            </button>
            
            <Link
              to="/panel"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              🏠 Panel Principal
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
        {/* Primera fila de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {/* Búsqueda por cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">🔍 Cliente</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Sucursal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">🏢 Sucursal</label>
            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((suc) => (
                <option key={suc.nombre} value={suc.nombre}>
                  {suc.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">📅 Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">📅 Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Segunda fila de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          {/* Tarjeta */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">💳 BIN / Tarjeta</label>
            <input
              type="text"
              value={tarjeta}
              onChange={(e) => setTarjeta(e.target.value)}
              placeholder="BIN: 4123, Tarjeta: 4123456789012345"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Terminación de Tarjeta */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">🔢 Terminación</label>
            <input
              type="text"
              value={terminacion}
              onChange={(e) => setTerminacion(e.target.value)}
              placeholder="Ej: 1234"
              maxLength="4"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <div className="text-xs text-gray-400 mt-1">
              💡 Combinar BIN + Terminación para búsquedas precisas
            </div>
          </div>

          {/* Monto Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">💰 Monto Mín.</label>
            <input
              type="number"
              value={montoMin}
              onChange={(e) => setMontoMin(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Monto Máximo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">💰 Monto Máx.</label>
            <input
              type="number"
              value={montoMax}
              onChange={(e) => setMontoMax(e.target.value)}
              placeholder="9999.99"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Botón de búsqueda */}
          <div className="flex items-end">
            <button
              onClick={handleSearchSubmit}
              disabled={cargando}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {cargando ? "🔄 Buscando..." : "🔍 Buscar"}
            </button>
          </div>
        </div>

        {/* Tercera fila - Filtros especiales */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro CargoAuto mejorado */}
          <button
            onClick={() => setFiltroCargoAuto(!filtroCargoAuto)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
              ${filtroCargoAuto 
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500 shadow-lg' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-gray-500 border border-gray-600'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {filtroCargoAuto ? '✅' : '⚡'} 
              Cargos Auto
              {filtroCargoAuto && <span className="text-xs bg-green-800 px-2 py-0.5 rounded">ACTIVO</span>}
            </span>
          </button>

          {/* Indicador de búsqueda inteligente BIN + Terminación */}
          {tarjeta && terminacion && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm">
              <span className="text-blue-300">🎯</span>
              <span className="text-blue-200">
                Búsqueda inteligente: BIN <span className="font-mono text-blue-100">{tarjeta}</span> + Terminación <span className="font-mono text-blue-100">{terminacion}</span>
              </span>
            </div>
          )}

          {/* Indicador de filtros activos */}
          {(busqueda || sucursal || fechaInicio || fechaFin || tarjeta || terminacion || montoMin || montoMax || Object.keys(filtrosColumnas).length > 0) && (
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <span className="animate-pulse">🔵</span>
              <span>Filtros aplicados</span>
              <button
                onClick={() => {
                  setBusqueda('');
                  setSucursal('');
                  setFechaInicio('');
                  setFechaFin('');
                  setTarjeta('');
                  setTerminacion('');
                  setMontoMin('');
                  setMontoMax('');
                  setFiltrosColumnas({});
                  setFiltroCargoAuto(false);
                  setPagina(1);
                }}
                className="ml-2 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-xs transition-colors"
              >
                🗑️ Limpiar todo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Cargando datos...</p>
            </div>
          </div>
        ) : datosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xl text-gray-400">No hay datos disponibles</p>
              <p className="text-gray-500 mt-2">Intenta ajustar los filtros de búsqueda</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr>
                  {columnas.map((columna) => (
                    <th key={columna} className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-700 relative">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrdenamientoTabla(columna)}
                          className="hover:text-white transition-colors"
                        >
                          {columna}
                          {ordenTabla.columna === columna && (
                            <span className="ml-1">
                              {ordenTabla.direccion === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                        
                        <button
                          onClick={() => setDropdownsAbiertos(prev => ({ ...prev, [columna]: !prev[columna] }))}
                          className="text-gray-400 hover:text-white text-xs"
                        >
                          🔽
                        </button>
                        
                        {filtrosColumnas[columna] && (
                          <span className="text-blue-400 text-xs">📍</span>
                        )}
                      </div>
                      
                      {dropdownsAbiertos[columna] && (
                        <FiltroExcelAvanzado
                          columna={columna}
                          valoresUnicos={valoresUnicos}
                          filtrosColumnas={filtrosColumnas}
                          busquedaFiltros={busquedaFiltros}
                          ordenColumnas={ordenColumnas}
                          seleccionMultiple={seleccionMultiple}
                          datos={datos}
                          onBusquedaChange={handleBusquedaChange}
                          onOrdenarChange={handleOrdenarChange}
                          onToggleSeleccion={handleToggleSeleccion}
                          onSeleccionarTodos={handleSeleccionarTodos}
                          onDeseleccionarTodos={handleDeseleccionarTodos}
                          onAplicarSeleccion={handleAplicarSeleccion}
                          onLimpiarFiltro={handleLimpiarFiltro}
                          onCerrar={handleCerrarDropdown}
                          obtenerValoresFiltrados={obtenerValoresFiltrados}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    {columnas.map((columna) => (
                      <td key={columna} className="px-4 py-3 text-gray-300">
                        {fila[columna]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      <div className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Página {pagina} de {totalPaginasCalculado} | 
            Mostrando {datosFiltrados.length} de {totalMostrado.toLocaleString()} registros
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagina === 1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              ← Anterior
            </button>
            
            <span className="px-4 py-2 bg-gray-700 text-white rounded">
              {pagina}
            </span>
            
            <button
              onClick={handleNextPage}
              disabled={pagina === totalPaginasCalculado}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
