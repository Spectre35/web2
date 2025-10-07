import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, User, MapPin, FileText, DollarSign, Clock } from 'lucide-react';

export default function Papeleria() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filtros, setFiltros] = useState({
    sucursales: [],
    bloques: [],
    tipos: [],
    usuarios: []
  });

  // Estados para filtros
  const [filtrosActivos, setFiltrosActivos] = useState({
    cliente: '',
    usuario: '',
    sucursal: '',
    bloque: '',
    tipo: '',
    fecha_inicio: '',
    fecha_fin: '',
    search: ''
  });

  // Estados para paginación
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPaginas: 0
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Cargar datos de papelería
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare sanitized params: trim, remove accents, ignore labels like 'todos' or 'seleccione'
      const normalizeClient = (v) => {
        if (v === undefined || v === null) return '';
        let s = String(v).trim();
        if (s === '') return '';
        try {
          s = s.normalize('NFD').replace(/\p{M}/gu, '');
        } catch (e) {
          s = s.replace(/[\u0300-\u036f]/g, '');
        }
        const low = s.toLowerCase();
        if (low === 'todos' || low.includes('todo') || low.includes('todas') || low.includes('seleccione')) return '';
        return s;
      };

      const params = new URLSearchParams();
      params.append('page', paginacion.page);
      params.append('limit', paginacion.limit);
      Object.keys(filtrosActivos).forEach(key => {
        const val = normalizeClient(filtrosActivos[key]);
        if (val) params.append(key, val);
      });

      const response = await fetch(`${API_BASE}/papeleria?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDatos(data.data || []);
        // Detectar usuarios presentes en los registros y agregarlos a los filtros dinámicamente
        try {
          const registros = data.data || [];
          const usuariosDetectados = Array.from(new Set(registros.map(r => r.usuario).filter(Boolean)));
          if (usuariosDetectados.length > 0) {
            setFiltros(prev => {
              const actuales = prev.usuarios || [];
              const combinados = Array.from(new Set([...actuales, ...usuariosDetectados]));
              return { ...prev, usuarios: combinados };
            });
          }
        } catch (e) {
          console.debug('Error detectando usuarios en registros:', e.message);
        }
        setPaginacion(prev => ({
          ...prev,
          ...data.pagination
        }));
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error cargando papelería:', error);
      setError(error.message);
      setDatos([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, paginacion.page, paginacion.limit, filtrosActivos]);

  // Cargar estadísticas
  const cargarEstadisticas = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/papeleria/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [API_BASE]);

  // Cargar filtros disponibles
  const cargarFiltros = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/papeleria/filtros`);
      const data = await response.json();

      if (data.success) {
        // Clean filtros received from server: remove falsy, noisy or pipe-only entries
        const cleanList = (arr) => Array.isArray(arr)
          ? Array.from(new Set(arr.filter(v => {
              if (!v) return false;
              const s = String(v).trim();
              if (s === '') return false;
              if (/^[|\-\s]+$/.test(s)) return false;
              return true;
            }))).sort()
          : [];

        setFiltros({
          sucursales: cleanList(data.filtros.sucursales),
          bloques: cleanList(data.filtros.bloques),
          tipos: cleanList(data.filtros.tipos),
          usuarios: cleanList(data.filtros.usuarios)
        });
      }
    } catch (error) {
      console.error('Error cargando filtros:', error);
    }
  }, [API_BASE]);

  // Efectos
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    cargarEstadisticas();
    cargarFiltros();
  }, [cargarEstadisticas, cargarFiltros]);

  // Handlers
  const handleFiltroChange = (campo, valor) => {
    setFiltrosActivos(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginacion(prev => ({ ...prev, page: 1 }));
  };

  const handleLimpiarFiltros = () => {
    setFiltrosActivos({
      cliente: '',
      usuario: '',
      sucursal: '',
      bloque: '',
      tipo: '',
      fecha_inicio: '',
      fecha_fin: '',
      search: ''
    });
    setPaginacion(prev => ({ ...prev, page: 1 }));
  };

  const handlePaginaChange = (nuevaPagina) => {
    setPaginacion(prev => ({ ...prev, page: nuevaPagina }));
  };

  const formatearMonto = (monto) => {
    if (!monto) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      // Si es string y está en formato YYYY-MM-DD, agregamos T00:00:00 para evitar problemas de zona horaria
      let fechaAFormatear = fecha;
      if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechaAFormatear = fecha + 'T00:00:00';
      }

      const date = new Date(fechaAFormatear);

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.warn(`Fecha inválida recibida:`, fecha);
        return String(fecha) || '-';
      }

      return date.toLocaleDateString('es-MX');
    } catch (error) {
      console.error('Error formateando fecha:', error, fecha);
      return String(fecha) || '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Papelería OCR</h1>
            <p className="text-gray-400">Documentos procesados automáticamente</p>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Registros</p>
                  <p className="text-xl font-bold text-white">{stats.total_registros.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/50 rounded-lg">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Clientes Únicos</p>
                  <p className="text-xl font-bold text-white">{stats.clientes_unicos.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Filtros de Búsqueda</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Búsqueda general */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Búsqueda General
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar en todos los campos..."
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                value={filtrosActivos.search}
                onChange={(e) => handleFiltroChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cliente
            </label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              value={filtrosActivos.cliente}
              onChange={(e) => handleFiltroChange('cliente', e.target.value)}
            />
          </div>

          {/* Sucursal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sucursal
            </label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.sucursal}
              onChange={(e) => handleFiltroChange('sucursal', e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {filtros.sucursales.map((sucursal) => (
                <option key={sucursal} value={sucursal}>
                  {sucursal}
                </option>
              ))}
            </select>
          </div>

          {/* Bloque */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bloque
            </label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.bloque}
              onChange={(e) => handleFiltroChange('bloque', e.target.value)}
            >
              <option value="">Todos los bloques</option>
              {filtros.bloques.map((bloque) => (
                <option key={bloque} value={bloque}>
                  {bloque}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo de Documento
            </label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.tipo}
              onChange={(e) => handleFiltroChange('tipo', e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {filtros.tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.fecha_inicio}
              onChange={(e) => handleFiltroChange('fecha_inicio', e.target.value)}
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.fecha_fin}
              onChange={(e) => handleFiltroChange('fecha_fin', e.target.value)}
            />
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Usuario
            </label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              value={filtrosActivos.usuario}
              onChange={(e) => handleFiltroChange('usuario', e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {filtros.usuarios.map((usuario) => (
                <option key={usuario} value={usuario}>
                  {usuario}
                </option>
              ))}
            </select>
          </div>

          {/* Botón limpiar */}
          <div className="flex items-end">
            <button
              onClick={handleLimpiarFiltros}
              className="w-full px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de datos */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Registros de Papelería
              {paginacion.total > 0 && (
                <span className="text-sm text-gray-400 ml-2">
                  ({paginacion.total.toLocaleString()} total)
                </span>
              )}
            </h2>

            {loading && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-sm">Cargando...</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-l-4 border-red-500">
            <p className="text-red-300">❌ Error: {error}</p>
          </div>
        )}

        {!loading && !error && datos.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-medium text-white">No se encontraron registros</p>
            <p>Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}

        {datos.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Sucursal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Bloque
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      T. Pago
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Caja
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Procesado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {datos.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-white">
                              {registro.cliente || '-'}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {registro.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-200">
                            {registro.sucursal || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                          {registro.bloque || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-200">
                            {formatearFecha(registro.fecha_contrato)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          registro.tipo === 'recibo'
                            ? 'bg-green-900/50 text-green-300 border-green-700'
                            : 'bg-purple-900/50 text-purple-300 border-purple-700'
                        }`}>
                          {registro.tipo ? registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 text-green-400 mr-1" />
                          <span className="text-sm font-medium text-green-300">
                            {formatearMonto(registro.monto)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-200">
                          {registro.t_pago || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-200">
                          {registro.caja || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-200">
                          {registro.usuario || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-xs text-gray-400">
                            {formatearFecha(registro.created_at)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginacion.totalPaginas > 1 && (
              <div className="px-4 py-3 border-t border-gray-700 bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    Mostrando {((paginacion.page - 1) * paginacion.limit) + 1} - {Math.min(paginacion.page * paginacion.limit, paginacion.total)} de {paginacion.total.toLocaleString()} registros
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePaginaChange(paginacion.page - 1)}
                      disabled={!paginacion.hasPrevPage}
                      className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 transition-colors"
                    >
                      Anterior
                    </button>

                    <span className="text-sm text-gray-300">
                      Página {paginacion.page} de {paginacion.totalPaginas}
                    </span>

                    <button
                      onClick={() => handlePaginaChange(paginacion.page + 1)}
                      disabled={!paginacion.hasNextPage}
                      className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
