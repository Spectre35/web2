import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // ✅ MUY IMPORTANTE
import { verificarIPAutorizada } from "./utils/ipSecurity.js";

// Verificar IP antes de cargar la aplicación
verificarIPAutorizada().then(autorizado => {
  if (autorizado) {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
  // Si no está autorizado, ipSecurity.js ya mostró la página de error
});
