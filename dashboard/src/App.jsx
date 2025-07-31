import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";
const PanelAdmin = lazy(() => import("./pages/PanelAdmin"));
const CargosAuto = lazy(() => import("./pages/CargosAuto"));
const Caja = lazy(() => import("./pages/Caja"));
const Ventas = lazy(() => import("./pages/Ventas"));
const Home = lazy(() => import("./pages/Home"));
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
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
