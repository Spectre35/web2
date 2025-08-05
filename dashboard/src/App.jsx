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
const Home = lazy(() => import("./pages/Home"));
const CargosAuto = lazy(() => import("./pages/CargosAuto"));
const Caja = lazy(() => import("./pages/Caja"));
const Ventas = lazy(() => import("./pages/Ventas"));
const DashboardRecuperacion = lazy(() => import("./pages/DashboardRecuperacion"));
const VendedorasStatus = lazy(() => import("./pages/VendedorasStatus"));
const SucursalBloque = lazy(() => import("./pages/SucursalBloque"));
const SucursalesAlerta = lazy(() => import("./pages/SucursalesAlerta"));
const Aclaraciones = lazy(() => import("./pages/Aclaraciones"));
const TelefonosDuplicados = lazy(() => import("./pages/TelefonosDuplicados"));
const TarjetasDuplicadas = lazy(() => import("./pages/TarjetasDuplicadas"));
const IngresarAclaraciones = lazy(() => import("./pages/IngresarAclaraciones"));
const ExcelGrid = lazy(() => import("./pages/ExcelGrid"));
const ExcelGridReactDataGrid = lazy(() => import("./pages/ExcelGridReactDataGrid"));
const DashboardAclaraciones = lazy(() => import("./pages/DashboardAclaraciones"));
const BuscadorBin = lazy(() => import("./pages/BuscadorBin"));
const ProcesadorBinsMasivo = lazy(() => import("./pages/ProcesadorBinsMasivo"));
const ProcesadorDistribuido = lazy(() => import("./pages/ProcesadorDistribuido"));
const GestorAPIs = lazy(() => import("./pages/GestorAPIs"));
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white text-xl">Cargando...</div>}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/cargos-auto" element={<CargosAuto />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/panel" element={<PanelAdmin />} />
            <Route path="/dashboard-recuperacion" element={<DashboardRecuperacion />} />
            <Route path="/vendedoras-status" element={<VendedorasStatus />} />
            <Route path="/sucursal-bloque" element={<SucursalBloque />} />
            <Route path="/sucursales-alerta" element={<SucursalesAlerta />} />
            <Route path="/aclaraciones" element={<Aclaraciones />} />
            <Route path="/telefonos-duplicados" element={<TelefonosDuplicados />} />
            <Route path="/tarjetas-duplicadas" element={<TarjetasDuplicadas />} />
            <Route path="/ingresar-aclaraciones" element={<IngresarAclaraciones />} />
            <Route path="/excel-grid" element={<ExcelGrid />} />
            <Route path="/excel-grid-react19" element={<ExcelGridReactDataGrid />} />
            <Route path="/dashboard-aclaraciones" element={<DashboardAclaraciones />} />
            <Route path="/buscador-bin" element={<BuscadorBin />} />
            <Route path="/procesador-bins-masivo" element={<ProcesadorBinsMasivo />} />
            <Route path="/procesador-distribuido" element={<ProcesadorDistribuido />} />
            <Route path="/gestor-apis" element={<GestorAPIs />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
