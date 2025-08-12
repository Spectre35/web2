import multer from "multer";

// 🔄 Mapeo de columnas específico para cada tabla
export function mapearColumnas(tabla, columnas) {
  const mapeosEspecificos = {
    aclaraciones: {
      "PROCESADOR": "procesador",
      "AÑO": "año", 
      "MES PETICIÓN": "mes_peticion",
      "EUROSKIN": "euroskin",
      "ID DEL COMERCIO / AFILIACIÓN": "id_del_comercio_afiliacion",
      "NOMBRE DEL COMERCIO": "nombre_del_comercio",
      "ID DE TRANSACCION": "id_de_transaccion",
      "FECHA VENTA": "fecha_venta",
      "MONTO": "monto",
      "NUM. DE TARJETA": "num_de_tarjeta",
      "AUTORIZACION": "autorizacion",
      "CLIENTE": "cliente",
      "VENDEDORA": "vendedora",
      "SUCURSAL": "sucursal",
      "FECHA CONTRATO": "fecha_contrato",
      "PAQUETE": "paquete",
      "BLOQUE": "bloque",
      "FECHA DE PETICION": "fecha_de_peticion",
      "FECHA DE RESPUESTA": "fecha_de_respuesta",
      "COMENTARIOS": "comentarios",
      "CAPTURA CC": "captura_cc",
      "MONTO MNX": "monto_mnx"
    }
  };

  if (mapeosEspecificos[tabla]) {
    return columnas.map(col => {
      const colOriginal = col.toString().trim();
      return mapeosEspecificos[tabla][colOriginal] || col.replace(/\s+/g, "_");
    });
  }
  
  // Para otras tablas, usar mapeo genérico
  return columnas.map(col =>
    typeof col === "string" ? col.replace(/\s+/g, "_") : col
  );
}

// ✅ Función para formatear y validar datos según el tipo de columna
export function formatearDatos(tabla, columna, valor) {
  // Definición de tipos de columnas por tabla
  const tiposColumnas = {
    aclaraciones: {
      procesador: 'VARCHAR',
      año: 'VARCHAR',
      mes_peticion: 'VARCHAR',
      euroskin: 'VARCHAR',
      id_del_comercio_afiliacion: 'VARCHAR',
      nombre_del_comercio: 'VARCHAR',
      id_de_transaccion: 'VARCHAR',
      fecha_venta: 'DATE',
      monto: 'DECIMAL',
      num_de_tarjeta: 'VARCHAR',
      autorizacion: 'VARCHAR',
      cliente: 'VARCHAR',
      vendedora: 'VARCHAR',
      sucursal: 'VARCHAR',
      fecha_contrato: 'DATE',
      paquete: 'VARCHAR',
      bloque: 'VARCHAR',
      fecha_de_peticion: 'DATE',
      fecha_de_respuesta: 'DATE',
      comentarios: 'TEXT',
      captura_cc: 'VARCHAR',
      monto_mnx: 'DECIMAL'
    }
  };

  const tipoColumna = tiposColumnas[tabla]?.[columna] || 'VARCHAR';

  // Si valor es null, undefined o string vacía, retornar null
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  switch (tipoColumna) {
    case 'DATE':
      // Formatear fechas
      if (typeof valor === 'string' && valor.trim() !== '') {
        try {
          // Intentar parsear diferentes formatos de fecha
          let fecha = new Date(valor);
          if (isNaN(fecha.getTime())) {
            // Intentar formato DD/MM/YYYY
            const parts = valor.split('/');
            if (parts.length === 3) {
              fecha = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          }
          return isNaN(fecha.getTime()) ? null : fecha.toISOString().split('T')[0];
        } catch (error) {
          return null;
        }
      }
      return null;

    case 'DECIMAL':
      // Formatear números decimales
      if (typeof valor === 'number') return valor;
      if (typeof valor === 'string') {
        const numero = parseFloat(valor.replace(/[^0-9.-]/g, ''));
        return isNaN(numero) ? null : numero;
      }
      return null;

    case 'INTEGER':
      // Formatear enteros
      if (typeof valor === 'number') return Math.floor(valor);
      if (typeof valor === 'string') {
        const numero = parseInt(valor.replace(/[^0-9-]/g, ''));
        return isNaN(numero) ? null : numero;
      }
      return null;

    case 'BOOLEAN':
      // Formatear booleanos
      if (typeof valor === 'boolean') return valor;
      if (typeof valor === 'string') {
        const valorLower = valor.toLowerCase().trim();
        return valorLower === 'true' || valorLower === '1' || valorLower === 'si' || valorLower === 'sí';
      }
      return false;

    case 'VARCHAR':
    case 'TEXT':
    default:
      // Formatear strings
      return typeof valor === 'string' ? valor.trim() : String(valor);
  }
}

// ✅ Configuración de almacenamiento temporal para archivos (optimizado para archivos 50k+ filas)
export const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB por archivo (para archivos 50k+ filas)
    files: 5 // Máximo 5 archivos por request
  }
});

// 📊 Estado del progreso de carga
export let progresoCarga = {
  enProgreso: false,
  porcentaje: 0,
  tabla: "",
  mensaje: "",
  filasProcesadas: 0,
  totalFilas: 0,
  errores: []
};
