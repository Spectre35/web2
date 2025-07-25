import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PanelAdmin from "./pages/PanelAdmin";
import CargosAuto from "./pages/CargosAuto";
import Caja from "./pages/Caja";
import Ventas from "./pages/Ventas";
import Home from "./pages/Home";
import Recuperacion from "./pages/Recuperacion"; // Agrega esta línea
import DashboardRecuperacion from "./pages/DashboardRecuperacion";
import VendedorasStatus from "./pages/VendedorasStatus";
import SucursalBloque from "./pages/SucursalBloque";
import SucursalesAlerta from "./pages/SucursalesAlerta";
import Aclaraciones from "./pages/Aclaraciones";
import IngresarAclaraciones from "./pages/IngresarAclaraciones";
import ValidadorTelefonos from "./pages/ValidadorTelefonos";
import DashboardSucursales from "./pages/DashboardSucursales";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cargos-auto" element={<CargosAuto />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/panel" element={<PanelAdmin />} />
        <Route path="/recuperacion" element={<Recuperacion />} /> {/* <-- Agrega esta línea */}
        <Route path="/dashboard-recuperacion" element={<DashboardRecuperacion />} />
        <Route path="/vendedoras-status" element={<VendedorasStatus />} />
        <Route path="/sucursal-bloque" element={<SucursalBloque />} />
        <Route path="/sucursales-alerta" element={<SucursalesAlerta />} />
        <Route path="/aclaraciones" element={<Aclaraciones />} />
        <Route path="/ingresar-aclaraciones" element={<IngresarAclaraciones />} />
        <Route path="/validador-telefonos" element={<ValidadorTelefonos />} />
        <Route path="/dashboard-sucursales" element={<DashboardSucursales />} />
      </Routes>
    </Router>
  );
}

export default App;
