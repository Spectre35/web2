import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect } from "react";

// Debug - solo en producción para diagnosticar
if (typeof window !== 'undefined') {
  console.log('🚀 APP DEBUG:');
  console.log('📍 Current URL:', window.location.href);
  console.log('🌐 Hostname:', window.location.hostname);
  console.log('📁 Pathname:', window.location.pathname);
}
const PanelAdmin = lazy(() => import("./pages/PanelAdmin"));
const CargosAuto = lazy(() => import("./pages/CargosAuto"));
const Caja = lazy(() => import("./pages/Caja"));
const Ventas = lazy(() => import("./pages/Ventas"));
// const Home = lazy(() => import("./pages/Home")); // Eliminado - ya no se usa
const Recuperacion = lazy(() => import("./pages/Recuperacion"));
const DashboardRecuperacion = lazy(() => import("./pages/DashboardRecuperacion"));
const VendedorasStatus = lazy(() => import("./pages/VendedorasStatus"));
const SucursalBloque = lazy(() => import("./pages/SucursalBloque"));
const SucursalesAlerta = lazy(() => import("./pages/SucursalesAlerta"));
const Aclaraciones = lazy(() => import("./pages/Aclaraciones"));
const ValidadorTelefonos = lazy(() => import("./pages/ValidadorTelefonos"));
const DashboardSucursales = lazy(() => import("./pages/DashboardSucursales"));
const IngresarAclaraciones = lazy(() => import("./pages/IngresarAclaraciones"));
const DashboardAclaraciones = lazy(() => import("./pages/DashboardAclaraciones"));
const DiagnosticPage = lazy(() => import("./pages/DiagnosticPage"));
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white text-xl">Cargando...</div>}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/recuperacion" replace />} />
            <Route path="/cargos-auto" element={<CargosAuto />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/panel" element={<PanelAdmin />} />
            <Route path="/recuperacion" element={<Recuperacion />} />
            <Route path="/dashboard-recuperacion" element={<DashboardRecuperacion />} />
            <Route path="/vendedoras-status" element={<VendedorasStatus />} />
            <Route path="/sucursal-bloque" element={<SucursalBloque />} />
            <Route path="/sucursales-alerta" element={<SucursalesAlerta />} />
            <Route path="/aclaraciones" element={<Aclaraciones />} />
            <Route path="/validador-telefonos" element={<ValidadorTelefonos />} />
            <Route path="/dashboard-sucursales" element={<DashboardSucursales />} />
            <Route path="/ingresar-aclaraciones" element={<IngresarAclaraciones />} />
            <Route path="/dashboard-aclaraciones" element={<DashboardAclaraciones />} />
            {/* Ruta de diagnóstico para debugging */}
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            {/* Catch-all route para rutas no encontradas */}
            <Route path="*" element={<DiagnosticPage />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
