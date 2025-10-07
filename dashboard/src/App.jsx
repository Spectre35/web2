import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";

// Debug - solo en producción para diagnosticar
if (typeof window !== 'undefined') {
  // Debug info removed
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
const DashboardAclaraciones = lazy(() => import("./pages/DashboardAclaraciones"));
const ValidadorEstatusStripe = lazy(() => import("./pages/ValidadorEstatusStripe"));
const DashboardCargosAuto = lazy(() => import("./pages/DashboardCargosAuto"));
// const DashboardCargosAutoTest = lazy(() => import("./pages/DashboardCargosAutoTest"));
const BuscadorBin = lazy(() => import("./pages/BuscadorBin"));
const ProcesadorBinsMasivo = lazy(() => import("./pages/ProcesadorBinsMasivo"));
const ProcesadorDistribuido = lazy(() => import("./pages/ProcesadorDistribuido"));
const GestorAPIs = lazy(() => import("./pages/GestorAPIs"));
const ActualizacionMasiva = lazy(() => import("./pages/ActualizacionMasiva"));
const AnalisisComentarios = lazy(() => import("./pages/AnalisisComentarios"));
const ProcesarDocumentos = lazy(() => import("./pages/ProcesarDocumentos"));
const Papeleria = lazy(() => import("./pages/Papeleria"));
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white text-xl">Cargando...</div>}>
          <Routes>
            {/* Ruta pública para login */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rutas protegidas */}
            <Route path="/*" element={
              <ProtectedRoute>
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
                    <Route path="/dashboard-aclaraciones" element={<DashboardAclaraciones />} />
                    <Route path="/validador-estatus-stripe" element={<ValidadorEstatusStripe />} />
                    <Route path="/dashboard-cargos-auto" element={<DashboardCargosAuto />} />
                    <Route path="/buscador-bin" element={<BuscadorBin />} />
                    <Route path="/procesador-bins-masivo" element={<ProcesadorBinsMasivo />} />
                    <Route path="/procesador-distribuido" element={<ProcesadorDistribuido />} />
                    <Route path="/gestor-apis" element={<GestorAPIs />} />
                    <Route path="/actualizacion-masiva" element={<ActualizacionMasiva />} />
                    <Route path="/analisis-comentarios" element={<AnalisisComentarios />} />
                    <Route path="/procesar-documentos" element={<ProcesarDocumentos />} />
                    <Route path="/papeleria" element={<Papeleria />} />
                  </Route>
                </Routes>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
