            {/* Vista Análisis por Día - OPTIMIZADA */}
            {vistaActual === 'diario' && (
              <div className="space-y-6">
                {/* Panel de controles optimizado */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-100 mb-4">🎛️ Controles de Vista</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filtro por días */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">📅 Período</label>
                      <select 
                        value={filtroFechaDias} 
                        onChange={(e) => {
                          setFiltroFechaDias(parseInt(e.target.value));
                          setPaginaActual(1);
                        }}
                        className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-2 rounded-lg text-sm"
                      >
                        <option value={3}>Últimos 3 días</option>
                        <option value={7}>Últimos 7 días</option>
                        <option value={15}>Últimos 15 días</option>
                        <option value={30}>Últimos 30 días</option>
                        <option value={90}>Últimos 3 meses</option>
                      </select>
                    </div>

                    {/* Búsqueda por sucursal */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">🏢 Buscar Sucursal</label>
                      <input
                        type="text"
                        value={busquedaSucursal}
                        onChange={(e) => {
                          setBusquedaSucursal(e.target.value);
                          setPaginaActual(1);
                        }}
                        placeholder="Nombre de sucursal..."
                        className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-2 rounded-lg text-sm"
                      />
                    </div>

                    {/* Selector de procesador */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">💳 Procesador</label>
                      <select 
                        value={procesadorExpandido} 
                        onChange={(e) => {
                          setProcesadorExpandido(e.target.value);
                          setPaginaActual(1);
                        }}
                        className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-2 rounded-lg text-sm"
                      >
                        <option value="consolidado">📊 Vista Consolidada</option>
                        <option value="BSD">🔵 Solo BSD</option>
                        <option value="EFEVOO">🟢 Solo EFEVOO</option>
                        <option value="STRIPE AUTO">🟡 Solo STRIPE AUTO</option>
                      </select>
                    </div>

                    {/* Tipo de vista */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">👁️ Modo de Vista</label>
                      <button
                        onClick={() => setVistaCompacta(!vistaCompacta)}
                        className={`w-full p-2 rounded-lg text-sm transition-all ${
                          vistaCompacta 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        {vistaCompacta ? '📋 Vista Compacta' : '📊 Vista Detallada'}
                      </button>
                    </div>
                  </div>

                  {/* Información del estado actual */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400">Datos mostrados</p>
                      <p className="text-sm font-bold text-gray-200">
                        {(() => {
                          const datos = prepararDatosDiarios();
                          return procesadorExpandido === 'consolidado' ? datos.consolidado.length : datos.detallado.length;
                        })()} registros
                      </p>
                    </div>
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400">Período activo</p>
                      <p className="text-sm font-bold text-gray-200">
                        {filtroFechaDias === 1 ? 'Hoy' : `${filtroFechaDias} días`}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400">Procesador</p>
                      <p className="text-sm font-bold text-gray-200">
                        {procesadorExpandido === 'consolidado' ? 'Todos' : procesadorExpandido}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400">Página actual</p>
                      <p className="text-sm font-bold text-gray-200">
                        {paginaActual} de {(() => {
                          const datos = prepararDatosDiarios();
                          const totalDatos = procesadorExpandido === 'consolidado' ? datos.consolidado : datos.detallado;
                          return calcularTotalPaginas(totalDatos, registrosPorPagina);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla principal optimizada */}
                {(() => {
                  const datosPreprados = prepararDatosDiarios();
                  const datosParaMostrar = procesadorExpandido === 'consolidado' 
                    ? datosPreprados.consolidado 
                    : datosPreprados.detallado;
                  const datosPaginados = paginarDatos(datosParaMostrar, paginaActual, registrosPorPagina);
                  const totalPaginas = calcularTotalPaginas(datosParaMostrar, registrosPorPagina);

                  return (
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-100">
                          {procesadorExpandido === 'consolidado' 
                            ? '📊 Resumen Consolidado por Día' 
                            : `💳 ${procesadorExpandido} - Desglose por Día y Sucursal`
                          }
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          Mostrando {datosPaginados.length} de {datosParaMostrar.length} registros
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-gray-200 font-semibold">Fecha</th>
                              {procesadorExpandido !== 'consolidado' && (
                                <th className="px-4 py-3 text-left text-gray-200 font-semibold">Sucursal</th>
                              )}
                              {procesadorExpandido === 'consolidado' && vistaCompacta && (
                                <th className="px-4 py-3 text-right text-gray-200 font-semibold">Sucursales</th>
                              )}
                              <th className="px-4 py-3 text-right text-gray-200 font-semibold">Registros</th>
                              <th className="px-4 py-3 text-right text-gray-200 font-semibold">Monto Total</th>
                              {!vistaCompacta && (
                                <th className="px-4 py-3 text-right text-gray-200 font-semibold">Promedio</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {datosPaginados.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                      procesadorExpandido === 'consolidado' 
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                        : procesadorExpandido === 'BSD' ? 'bg-blue-500'
                                        : procesadorExpandido === 'EFEVOO' ? 'bg-green-500'
                                        : 'bg-yellow-500'
                                    }`}></div>
                                    <span className="text-gray-100 font-medium">
                                      {vistaCompacta ? formatFechaCorta(item.fecha) : formatFecha(item.fecha)}
                                    </span>
                                  </span>
                                </td>
                                {procesadorExpandido !== 'consolidado' && (
                                  <td className="px-4 py-3 text-gray-100">
                                    {item.Sucursal || item.sucursal}
                                  </td>
                                )}
                                {procesadorExpandido === 'consolidado' && vistaCompacta && (
                                  <td className="px-4 py-3 text-right text-gray-200">
                                    {item.sucursales_activas || '-'}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-right text-gray-200 font-semibold">
                                  {formatNumber(item.total_registros)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-200 font-semibold">
                                  {formatCurrency(item.monto_total)}
                                </td>
                                {!vistaCompacta && (
                                  <td className="px-4 py-3 text-right text-gray-200">
                                    {item.total_registros > 0 
                                      ? formatCurrency(item.monto_total / item.total_registros)
                                      : '$0.00'
                                    }
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Controles de paginación */}
                      {totalPaginas > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            Página {paginaActual} de {totalPaginas} ({datosParaMostrar.length} registros totales)
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                              disabled={paginaActual === 1}
                              className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm transition-all"
                            >
                              ← Anterior
                            </button>
                            
                            {/* Números de página */}
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                              const pageNum = Math.max(1, Math.min(totalPaginas - 4, paginaActual - 2)) + i;
                              if (pageNum <= totalPaginas) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setPaginaActual(pageNum)}
                                    className={`px-3 py-1 rounded text-sm transition-all ${
                                      paginaActual === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                              return null;
                            })}

                            <button
                              onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                              disabled={paginaActual === totalPaginas}
                              className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm transition-all"
                            >
                              Siguiente →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Resumen estadístico rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                    <p className="text-xs text-gray-400 mb-1">Total en Período</p>
                    <p className="text-lg font-bold text-gray-200">
                      {(() => {
                        const datos = prepararDatosDiarios();
                        const totalRegistros = (procesadorExpandido === 'consolidado' ? datos.consolidado : datos.detallado)
                          .reduce((acc, item) => acc + parseInt(item.total_registros || 0), 0);
                        return formatNumber(totalRegistros);
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">registros</p>
                  </div>
                  <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                    <p className="text-xs text-gray-400 mb-1">Monto Total</p>
                    <p className="text-lg font-bold text-gray-200">
                      {(() => {
                        const datos = prepararDatosDiarios();
                        const montoTotal = (procesadorExpandido === 'consolidado' ? datos.consolidado : datos.detallado)
                          .reduce((acc, item) => acc + parseFloat(item.monto_total || 0), 0);
                        return formatCurrency(montoTotal);
                      })()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                    <p className="text-xs text-gray-400 mb-1">Promedio Diario</p>
                    <p className="text-lg font-bold text-gray-200">
                      {(() => {
                        const datos = prepararDatosDiarios();
                        const datosRelevantes = procesadorExpandido === 'consolidado' ? datos.consolidado : datos.detallado;
                        if (datosRelevantes.length === 0) return '$0.00';
                        
                        const montoTotal = datosRelevantes.reduce((acc, item) => acc + parseFloat(item.monto_total || 0), 0);
                        const diasUnicos = procesadorExpandido === 'consolidado' 
                          ? datosRelevantes.length 
                          : [...new Set(datosRelevantes.map(item => item.fecha))].length;
                        
                        return formatCurrency(montoTotal / Math.max(1, diasUnicos));
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
