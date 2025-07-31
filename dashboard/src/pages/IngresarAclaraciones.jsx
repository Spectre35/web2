import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../scrollbar-styles.css";

const SelectEditor = React.memo(({ value, onChange, options, className = "" }) => {
  return (
    <select
      className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Selecciona...</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
});

export default function IngresarAclaraciones() {
  // Configuración de tipos de tabla con sus validaciones específicas
  const tiposTabla = {
    EFEVOO: {
      nombre: "EFEVOO",
      camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION"],
      validaciones: {
        ID_DE_TRANSACCION: { tipo: "numerico", minLength: 8, maxLength: 50 },
        AUTORIZACION: { tipo: "alfanumerico", minLength: 6, maxLength: 12 },
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [4, 6, 16] }
      }
    },
    BSD: {
      nombre: "BSD",
      camposObligatorios: ["PROCESADOR", "ID_DEL_COMERCIO_AFILIACION", "NOMBRE_DEL_COMERCIO", "NUM_DE_TARJETA", "FECHA_VENTA", "MONTO", "AUTORIZACION", "FECHA_DE_RESPUESTA"],
      validaciones: {
        ID_DEL_COMERCIO_AFILIACION: { tipo: "numerico", minLength: 6, maxLength: 10 },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [4] }, // BIN de 4 dígitos
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
        AUTORIZACION: { tipo: "numerico", exactLength: [6] }
      }
    },
    CREDOMATIC: {
      nombre: "CREDOMATIC",
      camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION", "NUM_DE_TARJETA"],
      validaciones: {
        ID_DE_TRANSACCION: { tipo: "alfanumerico", minLength: 12, maxLength: 30 },
        AUTORIZACION: { tipo: "numerico", exactLength: [6, 8] },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [16] },
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 }
      }
    }
  };

  // Definición de columnas base para la tabla de aclaraciones (siempre fijas)
  const columnas = [
    "PROCESADOR",
    "AÑO",
    "MES_PETICION",
    "EUROSKIN",
    "ID_DEL_COMERCIO_AFILIACION",
    "NOMBRE_DEL_COMERCIO",
    "ID_DE_TRANSACCION",
    "FECHA_VENTA",
    "MONTO",
    "NUM_DE_TARJETA",
    "AUTORIZACION",
    "CLIENTE",
    "VENDEDORA",
    "SUCURSAL",
    "FECHA_CONTRATO",
    "PAQUETE",
    "BLOQUE",
    "FECHA_DE_PETICION",
    "FECHA_DE_RESPUESTA",
    "COMENTARIOS",
    "CAPTURA_CC"
  ];

  // Hook de navegación
  const navigate = useNavigate();

  // Estados
  const [tipoTablaSeleccionada, setTipoTablaSeleccionada] = useState("EFEVOO");
  const [filas, setFilas] = useState(
    Array(1).fill().map(() => {
      const base = Object.fromEntries(columnas.map(c => [c, ""]));
      base["EUROSKIN"] = "false";
      // Obtener año y mes actual en nombre
      const fechaActual = new Date();
      const anioActual = fechaActual.getFullYear().toString();
      const meses = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const mesActualNombre = meses[fechaActual.getMonth()];
      base["AÑO"] = anioActual;
      base["MES_PETICION"] = mesActualNombre;
      return base;
    })
  );
  const [erroresValidacion, setErroresValidacion] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [procesadores, setProcesadores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [comentariosComunes, setComentariosComunes] = useState([]);
  const [capturaCC, setCapturaCC] = useState([]);

  // Función para validar campo según tipo de tabla
  function validarCampo(campo, valor, tipoTabla) {
    if (!valor || valor.toString().trim() === "") return null;
    
    const config = tiposTabla[tipoTabla];
    if (!config || !config.validaciones[campo]) return null;
    
    const validacion = config.validaciones[campo];
    const valorStr = valor.toString().trim();
    
    switch (validacion.tipo) {
      case "numerico":
        if (!/^\d+$/.test(valorStr)) {
          return "Debe contener solo números";
        }
        if (validacion.exactLength) {
          if (!validacion.exactLength.includes(valorStr.length)) {
            return `Debe tener ${validacion.exactLength.join(" o ")} dígitos`;
          }
        }
        if (validacion.minLength && valorStr.length < validacion.minLength) {
          return `Mínimo ${validacion.minLength} dígitos`;
        }
        if (validacion.maxLength && valorStr.length > validacion.maxLength) {
          return `Máximo ${validacion.maxLength} dígitos`;
        }
        break;
        
      case "alfanumerico":
        if (!/^[a-zA-Z0-9]+$/.test(valorStr)) {
          return "Solo se permiten letras y números";
        }
        if (validacion.minLength && valorStr.length < validacion.minLength) {
          return `Mínimo ${validacion.minLength} caracteres`;
        }
        if (validacion.maxLength && valorStr.length > validacion.maxLength) {
          return `Máximo ${validacion.maxLength} caracteres`;
        }
        break;
        
      case "decimal":
        const num = parseFloat(valorStr);
        if (isNaN(num)) {
          return "Debe ser un número válido";
        }
        if (validacion.min && num < validacion.min) {
          return `Mínimo ${validacion.min}`;
        }
        if (validacion.max && num > validacion.max) {
          return `Máximo ${validacion.max}`;
        }
        break;
        
      case "boolean":
        if (!["true", "false", "sí", "no", "si", "1", "0"].includes(valorStr.toLowerCase())) {
          return "Debe ser Sí o No";
        }
        break;
    }
    
    return null;
  }

  // Función para verificar campos obligatorios
  function verificarCamposObligatorios(fila, tipoTabla) {
    const config = tiposTabla[tipoTabla];
    if (!config) return [];
    
    const faltantes = [];
    config.camposObligatorios.forEach(campo => {
      if (!fila[campo] || fila[campo].toString().trim() === "") {
        faltantes.push(campo);
      }
    });
    
    return faltantes;
  }

  // Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      try {
        // Cargar datos básicos primero
        const [resProcesadores, resSucursales, resBloques, resVendedoras, resComentarios] = await Promise.all([
          axios.get(`${API_BASE_URL}/aclaraciones/procesadores`),
          axios.get(`${API_BASE_URL}/aclaraciones/sucursales-ventas`),
          axios.get(`${API_BASE_URL}/aclaraciones/bloques`),
          axios.get(`${API_BASE_URL}/aclaraciones/vendedoras`),
          axios.get(`${API_BASE_URL}/aclaraciones/comentarios`)
        ]);
        
        setProcesadores(resProcesadores.data);
        setSucursales(resSucursales.data);
        setBloques(resBloques.data);
        setVendedoras(resVendedoras.data);
        setComentariosComunes(resComentarios.data);

        // Intentar cargar captura-cc por separado (puede no existir)
        try {
          const resCapturaCC = await axios.get(`${API_BASE_URL}/aclaraciones/captura-cc`);
          setCapturaCC(resCapturaCC.data);
        } catch (capturaError) {
          console.warn("Endpoint captura-cc no disponible, usando valores por defecto");
          // Valores por defecto para CAPTURA_CC
          setCapturaCC(["EN PROCESO", "GANADA", "PERDIDA"]);
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        setMensaje("❌ Error al cargar datos de referencia");
        // Valores por defecto en caso de error total
        setCapturaCC(["Manual", "Automática", "Mixta", "No Aplica"]);
      }
    }
    
    cargarDatos();
  }, []);

  // Limpiar errores cuando cambia el tipo de tabla
  useEffect(() => {
    setErroresValidacion({});
  }, [tipoTablaSeleccionada]);

  // Función para normalizar fechas
  function normalizarFecha(valor) {
    if (!valor) return "";
    
    const regex1 = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
    const match1 = valor.toString().match(regex1);
    if (match1) {
      return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
    }
    
    const regex2 = /^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/;
    const match2 = valor.toString().match(regex2);
    if (match2) {
      return `${match2[1]}-${match2[2]}-${match2[3]}`;
    }
    
    return valor;
  }

  // Función para normalizar montos
  function normalizarMonto(valor) {
    if (!valor) return "";
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
      let limpio = valor.replace(/[$€£¥\s]/g, '');
      // Quitar separadores de miles si hay más de un punto o coma
      if ((limpio.match(/\./g) || []).length > 1 || (limpio.match(/,/g) || []).length > 1) {
        limpio = limpio.replace(/\.(?=\d{3,})/g, '').replace(/,(?=\d{3,})/g, '');
      }
      // Si hay coma y no punto, la coma es decimal
      if (limpio.includes(',') && !limpio.includes('.')) {
        limpio = limpio.replace(',', '.');
      }
      // Si hay ambos, dejar solo el punto como decimal
      if (limpio.includes('.') && limpio.includes(',')) {
        if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
          limpio = limpio.replace('.', '').replace(',', '.');
        } else {
          limpio = limpio.replace(/,/g, '');
        }
      }
      const numero = parseFloat(limpio);
      return isNaN(numero) ? "" : numero;
    }
    return "";
  }

  // Función para obtener el nombre del mes en español en mayúsculas
  function obtenerNombreMes(fechaStr) {
    if (!fechaStr) return "";
    // Acepta formatos YYYY-MM-DD, DD/MM/YYYY, etc.
    let partes = null;
    let mes = null;
    let anio = null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      partes = fechaStr.split("-");
      anio = partes[0];
      mes = partes[1];
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(fechaStr)) {
      // DD/MM/YYYY o DD-MM-YYYY
      partes = fechaStr.split(/[\/\-]/);
      anio = partes[2];
      mes = partes[1].padStart(2, '0');
    } else {
      return { anio: "", mesNombre: "" };
    }
    const meses = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];
    const mesIdx = parseInt(mes, 10) - 1;
    const mesNombre = meses[mesIdx] || "";
    return { anio, mesNombre };
  }

  // Función para manejar pegado de datos
  function manejarPegado(e) {
    // --- EFEVOO horizontal ---
    // Encabezados típicos EFEVOO
    const efevooHeaders = [
      "ID", "FOLIO", "CLIENTE", "SUCURSAL", "NÚMERO DE TARJETA", "MARCA DE TARJETA", "TIPO DE TARJETA", "MÉTODO DE PAGO", "FECHA Y HORA", "MONTO", "NÚMERO DE AUTORIZACIÓN", "AFILIACIÓN"
    ];
    // Mapeo EFEVOO -> columnas internas
    const efevooToCol = {
      "ID": "ID_DE_TRANSACCION",
      "FOLIO": "ID_DE_TRANSACCION",
      "CLIENTE": "NOMBRE_DEL_COMERCIO",
      "SUCURSAL": "SUCURSAL",
      "NÚMERO DE TARJETA": "NUM_DE_TARJETA",
      "MÉTODO DE PAGO": "PROCESADOR",
      "FECHA Y HORA": "FECHA_VENTA",
      "MONTO": "MONTO",
      "NÚMERO DE AUTORIZACIÓN": "AUTORIZACION",
      "AFILIACIÓN": "ID_DEL_COMERCIO_AFILIACION",
      "AFILIACION": "ID_DEL_COMERCIO_AFILIACION"
    };

    // Mapeo general para todos los formatos
    const mapHeaders = {
      ...efevooToCol,
      "AÑO": "AÑO",
      "MES PETICIÓN": "MES_PETICION",
      "MES_PETICION": "MES_PETICION",
      "EUROSKIN": "EUROSKIN",
      "ID DEL COMERCIO / AFILIACIÓN": "ID_DEL_COMERCIO_AFILIACION",
      "ID DEL COMERCIO": "ID_DEL_COMERCIO_AFILIACION",
      "ID_DE_TRANSACCION": "ID_DE_TRANSACCION",
      "NOMBRE DEL COMERCIO": "NOMBRE_DEL_COMERCIO",
      "FECHA VENTA": "FECHA_VENTA",
      "MONTO": "MONTO",
      "NUM. DE TARJETA": "NUM_DE_TARJETA",
      "NUM_DE_TARJETA": "NUM_DE_TARJETA",
      "AUTORIZACION": "AUTORIZACION",
      "CLIENTE": "CLIENTE",
      "VENDEDORA": "VENDEDORA",
      "SUCURSAL": "SUCURSAL",
      "FECHA CONTRATO": "FECHA_CONTRATO",
      "PAQUETE": "PAQUETE",
      "BLOQUE": "BLOQUE",
      "FECHA DE PETICION": "FECHA_DE_PETICION",
      "FECHA DE RESPUESTA": "FECHA_DE_RESPUESTA",
      "COMENTARIOS": "COMENTARIOS",
      "CAPTURA CC": "CAPTURA_CC",
      "CAPTURA_CC": "CAPTURA_CC"
    };

    // Detectar formato EFEVOO horizontal
    // (rows se define después del paste)

    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (!paste) return;
    const rows = paste.split(/\r?\n/).filter(row => row.trim());

    // Detectar formato CREDOMATIC (formato específico con "DATOS DE LA TRANSACCIÓN")
    if (paste.includes("DATOS DE LA TRANSACCIÓN") || paste.includes("No. caso:") || paste.includes("Afiliado Pagador:")) {
      const obj = {};
      
      // Extraer información específica de CREDOMATIC
      const fechaMatch = paste.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/);
      const nombreComercioMatch = paste.match(/Señores:\s*([^\n\r]+)/);
      const montoMatch = paste.match(/Monto de la Transacción:\s*([\d,.]+)/);
      const tarjetaMatch = paste.match(/Número de Tarjeta:\s*(\d+X+\d+)/);
      const autorizacionMatch = paste.match(/Código de Autorización:\s*(\d+)/);
      const casoMatch = paste.match(/No\.\s*caso:\s*([^\n\r]+)/);
      const afiliadoMatch = paste.match(/No. Afiliado:\s*(\d+)/);
      
      if (fechaMatch) obj["FECHA_VENTA"] = normalizarFecha(fechaMatch[1]);
      if (nombreComercioMatch) obj["NOMBRE_DEL_COMERCIO"] = nombreComercioMatch[1].trim();
      if (montoMatch) obj["MONTO"] = normalizarMonto(montoMatch[1]);
      if (tarjetaMatch) obj["NUM_DE_TARJETA"] = tarjetaMatch[1];
      if (autorizacionMatch) obj["AUTORIZACION"] = autorizacionMatch[1];
      if (casoMatch) obj["ID_DE_TRANSACCION"] = casoMatch[1].trim();
      if (afiliadoMatch) obj["ID_DEL_COMERCIO_AFILIACION"] = afiliadoMatch[1];
      
      // Solo las columnas base, nunca más ni menos
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      newRow["PROCESADOR"] = "CREDOMATIC";
      // Detectar año y mes
      if (newRow["FECHA_VENTA"]) {
        const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
        newRow["AÑO"] = anio || "";
        newRow["MES_PETICION"] = mesNombre || "";
      }
      // Llenar las filas existentes primero, solo agregar nuevas si es necesario
      setFilas(prev => {
        const filasVacias = prev.filter(fila => {
          const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
            if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
            if (key === "AÑO") return false;
            if (key === "MES_PETICION") return false;
            return value !== "" && value !== null && value !== undefined;
          });
          return valoresConDatos.length === 0;
        }).length;
        
        if (filasVacias > 0) {
          // Reemplazar la primera fila vacía
          const nuevasFilas = [...prev];
          const indiceVacia = prev.findIndex(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          });
          if (indiceVacia !== -1) {
            nuevasFilas[indiceVacia] = newRow;
          }
          return nuevasFilas;
        } else {
          // Si no hay filas vacías, agregar al principio
          return [newRow, ...prev];
        }
      });
      setMensaje("✅ Se detectó formato CREDOMATIC y se pegó 1 fila.");
      setTimeout(() => setMensaje(""), 4000);
      e.target.value = "";
      return;
    }

    // Detectar formato EFEVOO horizontal (debe ir después de obtener rows)
    if (rows.length >= 2) {
      const headers = rows[0].split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
      if (headers.every(h => efevooHeaders.includes(h))) {
        const dataRows = rows.slice(1);
        const mapeoDetectado = headers.map(h => efevooToCol[h] || h);
        const newRows = dataRows.map(row => {
          const cells = row.split(/\t|\s{2,}/);
          // Solo las columnas base, nunca más ni menos
        const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
        mapeoDetectado.forEach((colInterno, i) => {
          let value = cells[i] ? cells[i].trim() : "";
          if (colInterno === "MONTO") value = normalizarMonto(value);
          if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
          if (columnas.includes(colInterno)) newRow[colInterno] = value;
        });
        newRow["PROCESADOR"] = "EFEVOO";
        // Detectar año y mes
        if (newRow["FECHA_VENTA"]) {
          const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
          newRow["AÑO"] = anio || "";
          newRow["MES_PETICION"] = mesNombre || "";
        }
        return newRow;
        });
        // Llenar las filas existentes primero, solo agregar nuevas si es necesario
        setFilas(prev => {
          const filasVacias = prev.filter(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          }).length;
          
          if (newRows.length <= filasVacias) {
            // Si hay suficientes filas vacías, llenarlas
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            return nuevasFilas;
          } else {
            // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            
            // Llenar las filas vacías existentes
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            
            // Agregar las filas restantes al principio
            const filasRestantes = newRows.slice(contadorLlenado);
            return [...filasRestantes, ...nuevasFilas];
          }
        });
        setMensaje(`✅ Se pegaron ${newRows.length} filas EFEVOO (horizontal)`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    }

    // Encabezados BSD verticales (orden esperado)
    const bsdHeaders = [
      "AFILIACION",
      "NOMBRE DEL COMERCIO",
      "BIN TARJETA",
      "TARJETA",
      "FECHA VENTA",
      "HORA",
      "IMPORTE",
      "AUTORIZACION",
      "FECHA CONTRACARGO",
      "REFERENCIA"
    ];

    // Mapeo BSD -> columnas internas
    const bsdToCol = {
      "AFILIACION": "ID_DEL_COMERCIO_AFILIACION",
      "NOMBRE DEL COMERCIO": "NOMBRE_DEL_COMERCIO",
      "TARJETA": "NUM_DE_TARJETA",
      "FECHA VENTA": "FECHA_VENTA",
      "HORA": "HORA",
      "IMPORTE": "MONTO",
      "AUTORIZACION": "AUTORIZACION",
      "REFERENCIA": "ID_DE_TRANSACCION"
    };

    // Detectar formato BSD vertical
    if (rows.length > 10 && bsdHeaders.every((h, i) => rows[i]?.trim().toUpperCase() === h)) {
      const numHeaders = bsdHeaders.length;
      const numRecords = Math.floor((rows.length - numHeaders) / numHeaders);
      const newRows = [];
      for (let i = 0; i < numRecords; i++) {
        const start = numHeaders + i * numHeaders;
        const end = start + numHeaders;
        const values = rows.slice(start, end);
        const reg = {};
        bsdHeaders.forEach((h, idx) => {
          let value = values[idx] ? values[idx].trim() : "";
          const col = bsdToCol[h];
          if (col === "MONTO") value = normalizarMonto(value);
          if (col && col.includes("FECHA") && value) value = normalizarFecha(value);
          reg[col] = value;
        });
        // Solo las columnas base, nunca más ni menos
        const row = Object.fromEntries(columnas.map(col => [col, reg[col] || ""]));
        row["PROCESADOR"] = "BSD";
        // Detectar año y mes
        if (row["FECHA_VENTA"]) {
          const { anio, mesNombre } = obtenerNombreMes(row["FECHA_VENTA"]);
          row["AÑO"] = anio || "";
          row["MES_PETICION"] = mesNombre || "";
        }
        newRows.push(row);
      }
      // Llenar las filas existentes primero, solo agregar nuevas si es necesario
      setFilas(prev => {
        const filasVacias = prev.filter(fila => {
          const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
            if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
            if (key === "AÑO") return false;
            if (key === "MES_PETICION") return false;
            return value !== "" && value !== null && value !== undefined;
          });
          return valoresConDatos.length === 0;
        }).length;
        
        if (newRows.length <= filasVacias) {
          // Si hay suficientes filas vacías, llenarlas
          const nuevasFilas = [...prev];
          let contadorLlenado = 0;
          for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
            const fila = nuevasFilas[i];
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            if (valoresConDatos.length === 0) {
              nuevasFilas[i] = newRows[contadorLlenado];
              contadorLlenado++;
            }
          }
          return nuevasFilas;
        } else {
          // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
          const nuevasFilas = [...prev];
          let contadorLlenado = 0;
          
          // Llenar las filas vacías existentes
          for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
            const fila = nuevasFilas[i];
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            if (valoresConDatos.length === 0) {
              nuevasFilas[i] = newRows[contadorLlenado];
              contadorLlenado++;
            }
          }
          
          // Agregar las filas restantes al principio
          const filasRestantes = newRows.slice(contadorLlenado);
          return [...filasRestantes, ...nuevasFilas];
        }
      });
      setMensaje(`✅ Se pegaron ${newRows.length} filas BSD (vertical)`);
      setTimeout(() => setMensaje(""), 4000);
      e.target.value = "";
      return;
    }
    // ...resto de la función (otros formatos)...

    // Formato transpuesto
    if (rows.length > 2 && rows.every(r => r.split(/\t|\s{2,}/).length === 1)) {
      let headerIndices = [];
      for (let i = 0; i < rows.length; i++) {
        const val = rows[i].trim();
        if (isNaN(val) && !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(val) && !/^\$?\s*[\d,.]+$/.test(val)) {
          headerIndices.push(i);
        }
      }
      if (headerIndices.length >= 2) {
        const headers = headerIndices.map(i => rows[i].trim().toUpperCase());
        const dataBlocks = headerIndices.map((start, idx) => {
          const end = headerIndices[idx + 1] || rows.length;
          return rows.slice(start + 1, end);
        });
        const numRegistros = Math.max(...dataBlocks.map(b => b.length));
        const registros = [];
        for (let i = 0; i < numRegistros; i++) {
          const reg = {};
          headers.forEach((h, j) => {
            const col = mapHeaders[h] || h;
            reg[col] = dataBlocks[j][i] ? dataBlocks[j][i].trim() : "";
          });
          if (reg['MONTO']) reg['MONTO'] = normalizarMonto(reg['MONTO']);
          Object.keys(reg).forEach(col => {
            if (col.includes("FECHA")) reg[col] = normalizarFecha(reg[col]);
          });
          registros.push(reg);
        }
        // Solo las columnas base, nunca más ni menos
        const newRows = registros.map(r => {
          const row = Object.fromEntries(columnas.map(col => [col, r[col] || ""]));
          // Detectar año y mes
          if (row["FECHA_VENTA"]) {
            const { anio, mesNombre } = obtenerNombreMes(row["FECHA_VENTA"]);
            row["AÑO"] = anio || "";
            row["MES_PETICION"] = mesNombre || "";
          }
          return row;
        });
        setFilas(prev => {
          const nuevas = [...newRows];
          if (nuevas.length <= prev.length) {
            return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
          } else {
            return [
              ...nuevas.slice(0, prev.length),
              ...nuevas.slice(prev.length)
            ];
          }
        });
        setFilas(prev => {
          const nuevas = [...newRows];
          if (nuevas.length <= prev.length) {
            // Sobrescribe solo las primeras N filas
            return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
          } else {
            // Sobrescribe y agrega las que falten
            return [
              ...nuevas.slice(0, prev.length),
              ...nuevas.slice(prev.length)
            ];
          }
        });
      setFilas(prev => {
        const nuevas = [...newRows];
        if (nuevas.length <= prev.length) {
          return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
        } else {
          return [
            ...nuevas.slice(0, prev.length),
            ...nuevas.slice(prev.length)
          ];
        }
      });
        setMensaje(`✅ Se pegaron ${newRows.length} filas (formato transpuesto)`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    }

    // Vertical
    if (rows.length > 2 && rows.every(r => r.split(/\t|\s{2,}/).length === 2)) {
      const obj = {};
      rows.forEach(line => {
        const [key, value] = line.split(/\t|\s{2,}/);
        if (key && value) {
          const colInterno = mapHeaders[key.trim().toUpperCase()] || key.trim().toUpperCase();
          obj[colInterno] = value.trim();
        }
      });
      if (obj['MONTO']) obj['MONTO'] = normalizarMonto(obj['MONTO']);
      Object.keys(obj).forEach(col => {
        if (col.includes("FECHA")) obj[col] = normalizarFecha(obj[col]);
      });
      // Solo las columnas base, nunca más ni menos
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      // Detectar año y mes
      if (newRow["FECHA_VENTA"]) {
        const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
        newRow["AÑO"] = anio || "";
        newRow["MES_PETICION"] = mesNombre || "";
      }
      // Llenar las filas existentes primero, solo agregar nuevas si es necesario
      setFilas(prev => {
        const filasVacias = prev.filter(fila => {
          const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
            if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
            if (key === "AÑO") return false;
            if (key === "MES_PETICION") return false;
            return value !== "" && value !== null && value !== undefined;
          });
          return valoresConDatos.length === 0;
        }).length;
        
        if (filasVacias > 0) {
          // Reemplazar la primera fila vacía
          const nuevasFilas = [...prev];
          const indiceVacia = prev.findIndex(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          });
          if (indiceVacia !== -1) {
            nuevasFilas[indiceVacia] = newRow;
          }
          return nuevasFilas;
        } else {
          // Si no hay filas vacías, agregar al principio
          return [newRow, ...prev];
        }
      });
      setMensaje("✅ Se detectó formato vertical y se pegó 1 fila.");
      setTimeout(() => setMensaje(""), 4000);
      e.target.value = "";
      return;
    }

      // Horizontal
      if (rows.length >= 2) {
        const headers = rows[0].split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
        const dataRows = rows.slice(1);
        const mapeoDetectado = headers.map(h => mapHeaders[h] || h);
        const newRows = dataRows.map(row => {
          const cells = row.split(/\t|\s{2,}/);
          // Solo las columnas base, nunca más ni menos
          const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
          mapeoDetectado.forEach((colInterno, i) => {
            if (columnas.includes(colInterno)) {
              let value = cells[i] ? cells[i].trim() : "";
              if (colInterno === "MONTO") value = normalizarMonto(value);
              if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
              newRow[colInterno] = value;
            }
          });
          // Detectar año y mes
          if (newRow["FECHA_VENTA"]) {
            const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
            newRow["AÑO"] = anio || "";
            newRow["MES_PETICION"] = mesNombre || "";
          }
          return newRow;
        });
        setFilas(prev => {
          // Si los datos previos son las 10 filas vacías iniciales, reemplazarlas
          const todasVacias = prev.every(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              // Excluir campos que tienen valores por defecto
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false; // Ignorar AÑO ya que siempre tiene valor por defecto
              if (key === "MES_PETICION") return false; // Ignorar MES_PETICION ya que siempre tiene valor por defecto
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          });
          
          if (todasVacias) {
            return newRows;
          }
          
          // Si hay datos previos, llenar filas vacías primero
          const filasVacias = prev.filter(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          }).length;
          
          if (newRows.length <= filasVacias) {
            // Si hay suficientes filas vacías, llenarlas
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            return nuevasFilas;
          } else {
            // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            
            // Llenar las filas vacías existentes
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            
            // Agregar las filas restantes al principio
            const filasRestantes = newRows.slice(contadorLlenado);
            return [...filasRestantes, ...nuevasFilas];
          }
        });
        setMensaje(`✅ Se pegaron ${newRows.length} filas y se mapearon los encabezados: ${mapeoDetectado.join(', ')}`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    
    setMensaje("❌ No se detectaron encabezados válidos");
    setTimeout(() => setMensaje(""), 4000);
  }

  // Guardar datos con validación completa
  async function guardarDatos() {
    setGuardando(true);
    try {
      const filasCompletas = filas.filter(fila => Object.values(fila).some(v => v && v.toString().trim() !== ""));
      
      if (!filasCompletas.length) {
        setMensaje("❌ No hay datos para guardar");
        setGuardando(false);
        return;
      }
      
      // Validar todas las filas
      let erroresEncontrados = false;
      const nuevosErrores = {};
      
      filasCompletas.forEach((fila, idx) => {
        // Verificar campos obligatorios
        const faltantes = verificarCamposObligatorios(fila, tipoTablaSeleccionada);
        faltantes.forEach(campo => {
          nuevosErrores[`${idx}-${campo}`] = "Campo obligatorio";
          erroresEncontrados = true;
        });
        
        // Validar formato de campos
        Object.keys(fila).forEach(campo => {
          if (fila[campo] && fila[campo].toString().trim() !== "") {
            const error = validarCampo(campo, fila[campo], tipoTablaSeleccionada);
            if (error) {
              nuevosErrores[`${idx}-${campo}`] = error;
              erroresEncontrados = true;
            }
          }
        });
      });
      
      if (erroresEncontrados) {
        setErroresValidacion(nuevosErrores);
        setMensaje("❌ Hay errores de validación. Revisa los campos marcados en rojo.");
        setGuardando(false);
        setTimeout(() => setMensaje(""), 5000);
        return;
      }
      
      // Agregar el tipo de tabla a los datos
      const datosConTipo = filasCompletas.map(fila => ({
        ...fila,
        TIPO_TABLA: tipoTablaSeleccionada
      }));
      
      await axios.post(`${API_BASE_URL}/aclaraciones/insertar-multiple`, { 
        datos: datosConTipo,
        tipoTabla: tipoTablaSeleccionada 
      });
      
      setMensaje(`✅ Se guardaron ${filasCompletas.length} registros de ${tipoTablaSeleccionada} correctamente`);
      setFilas(Array(1).fill().map(() => Object.fromEntries(columnas.map(c => [c, ""]))));
      setErroresValidacion({});
    } catch (error) {
      setMensaje("❌ Error al guardar los datos: " + (error.response?.data?.message || error.message));
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }

  // Limpiar datos
  function limpiarDatos() {
    if (window.confirm("¿Estás seguro de que quieres limpiar todos los datos?")) {
      setFilas(Array(1).fill().map(() => Object.fromEntries(columnas.map(c => [c, ""]))));
      setMensaje("🧹 Datos limpiados");
      setTimeout(() => setMensaje(""), 2000);
    }
  }

  // Función simple y rápida para actualizar celda
  const handleCellChange = useCallback((idx, col, value) => {
    setFilas(prev => prev.map((fila, i) => 
      i === idx ? { ...fila, [col]: value } : fila
    ));
  }, []);

  // Eliminar fila
  function eliminarFila(idx) {
    setFilas(filas => filas.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-4 bg-gray-900 text-gray-200 min-h-screen">
      <div className="w-full max-w-none mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Ingresar Aclaraciones</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={limpiarDatos}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
              disabled={guardando}
            >
              🧹 Limpiar
            </button>
            <button
              onClick={guardarDatos}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "💾 Guardar"}
            </button>
          </div>
        </div>


        {mensaje && (
          <div className={`mb-4 p-3 rounded ${mensaje.startsWith('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {mensaje}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Pegar datos (detecta automáticamente el formato):
          </label>
          <textarea
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            onPaste={manejarPegado}
            placeholder="Pega aquí los datos de aclaraciones..."
          />
        </div>

        <div className="bg-gray-800 rounded-lg shadow overflow-hidden mb-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-700 z-10 w-10">#</th>
                  {columnas.map(col => {
                    const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                    
                    // Definir anchos específicos para columnas importantes
                    let anchoColumna = "";
                    if (col === "NOMBRE_DEL_COMERCIO") anchoColumna = "min-w-[300px]";
                    else if (col === "CLIENTE") anchoColumna = "min-w-[200px]";
                    else if (col === "MONTO") anchoColumna = "min-w-[120px]";
                    else if (col === "NUM_DE_TARJETA") anchoColumna = "min-w-[150px]";
                    else if (col === "AÑO") anchoColumna = "min-w-[80px]";
                    
                    return (
                      <th key={col} className={`px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider relative ${anchoColumna}`}>
                        {col.replace(/_/g, ' ')}
                        {esObligatorio && (
                          <span className="text-yellow-400 ml-1" title="Campo obligatorio">*</span>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-10">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filas.map((fila, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 sticky left-0 bg-inherit z-10">
                      {idx + 1}
                    </td>
                    {columnas.map(col => {
                      const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                      const tieneError = erroresValidacion[`${idx}-${col}`];
                      const estiloError = tieneError ? "border-red-500 bg-red-900/20" : "border-gray-700";
                      const estiloObligatorio = esObligatorio ? "border-yellow-500/50" : "";
                      
                      return (
                        <td key={`${idx}-${col}`} className="px-1 py-1 relative">
                          {col === 'PROCESADOR' && procesadores.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={procesadores}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'SUCURSAL' && sucursales.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={sucursales}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'BLOQUE' && bloques.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={bloques}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'VENDEDORA' && vendedoras.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={vendedoras}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'COMENTARIOS' && comentariosComunes.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={comentariosComunes}
                              className={`min-w-[250px] ${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col.includes('FECHA') ? (
                            <input
                              type="date"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          ) : col === 'MONTO' ? (
                            <input
                              type="number"
                              step="0.01"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          ) : col === 'EUROSKIN' ? (
                            <select
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            >
                              <option value="">Selecciona...</option>
                              <option value="true">Sí</option>
                              <option value="false">No</option>
                            </select>
                          ) : col === 'CAPTURA_CC' && capturaCC.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={capturaCC}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : (
                            <input
                              type="text"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          )}
                          
                          {/* Indicador de campo obligatorio */}
                          {esObligatorio && (
                            <span className="absolute -top-1 -right-1 text-yellow-400 text-xs" title="Campo obligatorio">
                              *
                            </span>
                          )}
                          
                          {/* Tooltip de error */}
                          {tieneError && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-red-800 text-red-200 text-xs rounded shadow-lg z-50 whitespace-nowrap">
                              {tieneError}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => eliminarFila(idx)}
                        className="text-red-400 hover:text-red-300"
                        title="Eliminar fila"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => {
              const nueva = Object.fromEntries(columnas.map(c => [c, ""]));
              nueva["EUROSKIN"] = "false";
              // Obtener año y mes actual en nombre
              const fechaActual = new Date();
              const anioActual = fechaActual.getFullYear().toString();
              const meses = [
                "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
              ];
              const mesActualNombre = meses[fechaActual.getMonth()];
              nueva["AÑO"] = anioActual;
              nueva["MES_PETICION"] = mesActualNombre;
              setFilas([...filas, nueva]);
            }}
          >
            + Agregar fila
          </button>
          <div className="text-sm text-gray-400">
            {filas.filter(f => Object.values(f).some(v => v && v.toString().trim() !== "")).length} filas con datos
          </div>
        </div>
      </div>
    </div>
  );
}
