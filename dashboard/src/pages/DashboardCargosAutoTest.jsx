import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

// Utilidades para formateo
function formatCurrency(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0.00';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatNumber(numero) {
  if (numero === null || numero === undefined || isNaN(numero)) return '0';
  const num = typeof numero === 'string' ? parseFloat(numero) : numero;
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-MX');
}

export default function DashboardCargosAutoTest() {

  // Estados básicos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState(null);
  const [contador, setContador] = useState(0);

  // Effect básico para simular carga de datos
  useEffect(() => {
    setLoading(true);

    // Simular llamada async
    setTimeout(() => {
      setDatos({ mensaje: 'Datos de prueba cargados', timestamp: new Date().toISOString() });
      setLoading(false);
      setContador(prev => prev + 1);
    }, 1000);
  }, []);

  // Probar las funciones de formateo
  const testMonto = formatCurrency(1234.56);
  const testNumero = formatNumber(9876);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        <h1 className="text-4xl font-bold text-gray-100 drop-shadow-lg mb-2">
          🚗 Dashboard de Cargos Auto
        </h1>
        <p className="text-gray-300 text-lg">
          Versión de prueba del dashboard - con hooks React
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <p className="text-green-300">✅ Componente cargado exitosamente</p>
            <p className="text-blue-300 text-sm mt-2">🔗 API URL: {API_BASE_URL}</p>
            <p className="text-yellow-300 text-sm mt-1">💰 Test formateo: {testMonto}</p>
            <p className="text-purple-300 text-sm mt-1">🔢 Test número: {testNumero}</p>
          </div>

          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300">⚡ Estados React:</p>
            <p className="text-sm mt-1">📊 Loading: {loading ? 'Sí' : 'No'}</p>
            <p className="text-sm mt-1">❌ Error: {error || 'Ninguno'}</p>
            <p className="text-sm mt-1">📈 Contador: {contador}</p>
            <p className="text-sm mt-1">📦 Datos: {datos ? 'Cargados' : 'Pendientes'}</p>
          </div>
        </div>

        {datos && (
          <div className="mt-4 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <p className="text-purple-300">🎯 Datos simulados:</p>
            <p className="text-sm mt-1">{datos.mensaje}</p>
            <p className="text-xs text-gray-400 mt-1">Timestamp: {datos.timestamp}</p>
          </div>
        )}
      </div>
    </div>
  );
}
