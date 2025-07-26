import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function IngresarAclaraciones() {
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [procesadores, setProcesadores] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [comentarios, setComentarios] = useState([]);

  const columnas = [
    "PROCESADOR", "AÑO", "MES_PETICION", "EUROSKIN", "ID_DEL_COMERCIO_AFILIACION",
    "NOMBRE_DEL_COMERCIO", "ID_DE_TRANSACCION", "FECHA_VENTA", "MONTO", "NUM_DE_TARJETA",
    "AUTORIZACION", "CLIENTE", "VENDEDORA", "SUCURSAL", "FECHA_CONTRATO", "PAQUETE",
    "BLOQUE", "FECHA_DE_PETICION", "FECHA_DE_RESPUESTA", "COMENTARIOS", "CAPTURA_CC"
  ];

  useEffect(() => {
    axios.get(`${API_BASE_URL}/aclaraciones/catalogos`).then(({ data }) => {
      setProcesadores(data.procesadores || []);
      setVendedoras(data.vendedoras || []);
      setSucursales(data.sucursales || []);
      setBloques(data.bloques || []);
      setComentarios(data.comentarios || []);
    });
    setFilas(Array(10).fill().map(() => Object.fromEntries(columnas.map(c => [c, ""]))));
  }, []);

  function normalizarMonto(valor) {
    let v = valor.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    v = v.replace(/(?!^)-/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    v = v.replace(/^-+/, "-");
    if (/^[-.]?$/.test(v)) v = "";
    return v;
  }

  function normalizarFecha(valor) {
    const regex1 = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
    const match1 = valor.match(regex1);
    if (match1) {
      return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
    }
    const regex2 = /^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/;
    const match2 = valor.match(regex2);
    if (match2) {
      return `${match2[1]}-${match2[2]}-${match2[3]}`;
    }
    return valor;
  }

  function manejarPegado(e) {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (!paste) return;
    const rows = paste.split(/\r?\n/).filter(row => row.trim());
    const mapHeaders = {
      'NÚMERO DE AUTORIZACIÓN': 'AUTORIZACION',
      'NUMERO DE AUTORIZACION': 'AUTORIZACION',
      'AUTORIZACION': 'AUTORIZACION',
      'AUTORIZACIÓN': 'AUTORIZACION',
      'FOLIO': 'ID_DE_TRANSACCION',
      'ID': 'ID_DE_TRANSACCION',
      'REFERENCIA': 'ID_DE_TRANSACCION',
      'CLIENTE': 'NOMBRE_DEL_COMERCIO',
      'SUCURSAL': 'SUCURSAL',
      'MARCA DE TARJETA': 'PAQUETE',
      'TIPO DE TARJETA': 'PAQUETE',
      'MÉTODO DE PAGO': 'PROCESADOR',
      'METODO DE PAGO': 'PROCESADOR',
      'FECHA CONTRACARGO': 'FECHA_DE_RESPUESTA',
      'FECHA DE PETICION': 'FECHA_DE_PETICION',
      'FECHA DE RESPUESTA': 'FECHA_DE_RESPUESTA',
      'COMENTARIOS': 'COMENTARIOS',
      'CAPTURA CC': 'CAPTURA_CC',
      'BLOQUE': 'BLOQUE',
      'NÚMERO DE REFERENCIA O LOTE CONTABLE': 'NO_DE_CASO',
      'NUMERO DE REFERENCIA O LOTE CONTABLE': 'NO_DE_CASO',
      'REFERENCIA O LOTE CONTABLE': 'NO_DE_CASO',
      'NO DE CASO': 'NO_DE_CASO',
      'AFILIACION': 'ID_DEL_COMERCIO_AFILIACION',
      'AFILIACIÓN': 'ID_DEL_COMERCIO_AFILIACION',
      'NOMBRE DEL COMERCIO': 'NOMBRE_DEL_COMERCIO',
      'BIN TARJETA': 'NUM_DE_TARJETA',
      'TARJETA': 'NUM_DE_TARJETA',
      'NÚMERO DE TARJETA': 'NUM_DE_TARJETA',
      'NUMERO DE TARJETA': 'NUM_DE_TARJETA',
      'FECHA VENTA': 'FECHA_VENTA',
      'FECHA Y HORA': 'FECHA_VENTA',
      'FECHA': 'FECHA_VENTA',
      'IMPORTE': 'MONTO',
      'MONTO': 'MONTO',
    };

    // --- Vertical Stacked Format ---
    // Detect: first N rows are headers, then values in blocks of N lines
    if (rows.length > 2) {
      const possibleHeaders = rows.slice(0, 12).map(h => h.trim().toUpperCase());
      const isAllHeaders = possibleHeaders.every(h => isNaN(h) && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(h) && !/^\$?\s*[\d,.]+$/.test(h));
      if (isAllHeaders && rows.length > possibleHeaders.length && (rows.length - possibleHeaders.length) % possibleHeaders.length === 0) {
        const numHeaders = possibleHeaders.length;
        const headers = possibleHeaders.map(h => mapHeaders[h] || h);
        const numRecords = (rows.length - numHeaders) / numHeaders;
        const newRows = [];
        for (let i = 0; i < numRecords; i++) {
          const start = numHeaders + i * numHeaders;
          const end = start + numHeaders;
          const values = rows.slice(start, end);
          const reg = {};
          headers.forEach((col, idx) => {
            let value = values[idx] ? values[idx].trim() : "";
            if (col === "MONTO") value = normalizarMonto(value);
            if (col.includes("FECHA") && value) value = normalizarFecha(value);
            reg[col] = value;
          });
          // Fill all columns
          const row = {};
          columnas.forEach(col => row[col] = reg[col] || "");
          newRows.push(row);
        }
        setFilas(prev => [...newRows, ...prev]);
        setMensaje(`✅ Se pegaron ${newRows.length} filas (formato vertical apilado)`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    };
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
        const newRows = registros.map(r => {
          const row = {};
          columnas.forEach(col => row[col] = r[col] || "");
          return row;
        });
        setFilas(prev => [...newRows, ...prev]);
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
      const newRow = {};
      columnas.forEach(col => newRow[col] = obj[col] || "");
      setFilas(prev => [newRow, ...prev]);
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
        const newRow = {};
        columnas.forEach(col => newRow[col] = "");
        mapeoDetectado.forEach((colInterno, i) => {
          if (columnas.includes(colInterno)) {
            let value = cells[i] ? cells[i].trim() : "";
            if (colInterno === "MONTO") value = normalizarMonto(value);
            if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
            newRow[colInterno] = value;
          }
        });
        return newRow;
      });
      setFilas(prev => [...newRows, ...prev]);
      setMensaje(`✅ Se pegaron ${newRows.length} filas y se mapearon los encabezados: ${mapeoDetectado.join(', ')}`);
      setTimeout(() => setMensaje(""), 4000);
      e.target.value = "";
      return;
    }
    setMensaje("❌ No se detectaron encabezados válidos");
    setTimeout(() => setMensaje(""), 4000);
  }

  // Guardar datos
  async function guardarDatos() {
    setGuardando(true);
    try {
      const filasCompletas = filas.filter(fila => Object.values(fila).some(v => v && v.toString().trim() !== ""));
      if (!filasCompletas.length) {
        setMensaje("❌ No hay datos para guardar");
        setGuardando(false);
        return;
      }
      await axios.post(`${API_BASE_URL}/aclaraciones/insertar-multiple`, { datos: filasCompletas });
      setMensaje(`✅ Se guardaron ${filasCompletas.length} registros correctamente`);
      setFilas(Array(10).fill().map(() => Object.fromEntries(columnas.map(c => [c, ""]))));
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
      setFilas(Array(10).fill().map(() => Object.fromEntries(columnas.map(c => [c, ""]))));
      setMensaje("🧹 Datos limpiados");
      setTimeout(() => setMensaje(""), 2000);
    }
  }

  // Actualizar celda
  function actualizarCelda(idx, col, value) {
    setFilas(filas => filas.map((fila, i) => i === idx ? { ...fila, [col]: col === "MONTO" ? normalizarMonto(value) : col.includes("FECHA") ? normalizarFecha(value) : value } : fila));
  }

  // Eliminar fila
  function eliminarFila(idx) {
    setFilas(filas => filas.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 border border-white/20">
        <div className="mb-4">
          <label htmlFor="pasteTableArea" className="block text-sm text-gray-300 mb-1 font-bold">Pega aquí una tabla con encabezados variables (horizontal o vertical):</label>
          <textarea
            id="pasteTableArea"
            rows={6}
            className="w-full bg-gray-800 text-gray-100 p-2 rounded border border-gray-600 focus:border-blue-500 text-xs mb-2"
            placeholder="Pega aquí la tabla completa, incluyendo los encabezados"
            onPaste={manejarPegado}
          />
        </div>
        <div className="flex flex-row gap-2 items-center mb-4">
          <button onClick={guardarDatos} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition font-semibold">
            {guardando ? "💾 Guardando..." : "💾 Guardar Datos"}
          </button>
          <button onClick={limpiarDatos} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition">🧹 Limpiar Todo</button>
          <span className="text-gray-300 px-4 py-2">Total filas: {filas.length}</span>
        </div>
        {mensaje && (
          <div className={`p-3 rounded mb-4 ${mensaje.includes('❌') ? 'bg-red-900/50 border border-red-500 text-red-200' : mensaje.includes('✅') ? 'bg-green-900/50 border border-green-500 text-green-200' : 'bg-blue-900/50 border border-blue-500 text-blue-200'}`}>{mensaje}</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full bg-gray-900/80 shadow-md rounded text-xs">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="p-2 text-gray-100 font-semibold sticky left-0 bg-gray-800">#</th>
                {columnas.map((col, i) => (
                  <th key={i} className="p-2 text-gray-100 font-semibold min-w-[120px] text-center">{col.replace(/_/g, ' ')}</th>
                ))}
                <th className="p-2 text-gray-100 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, filaIndex) => (
                <tr key={filaIndex} className="border-b border-gray-700 hover:bg-gray-800/30">
                  <td className="p-1 text-gray-300 text-center sticky left-0 bg-gray-900/90">{filaIndex + 1}</td>
                  {columnas.map((col, colIndex) => (
                    <td key={colIndex} className="p-1">
                      <input
                        type={col.includes("FECHA") ? "date" : col === "MONTO" ? "number" : "text"}
                        value={fila[col]}
                        onChange={e => actualizarCelda(filaIndex, col, e.target.value)}
                        className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        placeholder={col.replace(/_/g, ' ')}
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <button onClick={() => eliminarFila(filaIndex)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs" title="Eliminar fila">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-400 text-center">
          💡 Tip: Haz doble clic en cualquier celda para editarla | Copia y pega datos directamente desde Excel | Usa Tab/Enter para navegar entre celdas
        </div>
      </div>
    </div>
  );
}