import express from "express";
import cors from "cors";
import pkg from "pg";
import ExcelJS from "exceljs";
import multer from "multer";
import fs from "fs";
import path from "path";
import QueryStream from "pg-query-stream"; // Agrega arriba
import dotenv from "dotenv";
import moment from "moment";
import { createServer } from "http";
import { Server } from "socket.io";
dotenv.config();

import axios from "axios";
// import { WebAutomator } from "./web-automator.js"; // Comentado temporalmente

// 🗓️ FUNCIÓN PARA FORMATEAR FECHAS SIN CONVERSIÓN DE ZONA HORARIA
const formatearFechaSinZona = (fecha) => {
  if (!fecha) return fecha;
  
  try {
    // Si ya es una fecha de JavaScript
    if (fecha instanceof Date) {
      // Usar UTC para evitar conversión de zona horaria
      const dia = fecha.getUTCDate().toString().padStart(2, '0');
      const mes = (fecha.getUTCMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getUTCFullYear();
      return `${dia}/${mes}/${anio}`;
    }
    
    // Si es una string en formato YYYY-MM-DD
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [anio, mes, dia] = fecha.split('T')[0].split('-');
      return `${dia}/${mes}/${anio}`;
    }
    
    return fecha;
  } catch (error) {
    console.error('Error formateando fecha en servidor:', error);
    return fecha;
  }
};

// 🗓️ FUNCIÓN PARA FORMATEAR TODAS LAS FECHAS EN UN OBJETO
const formatearFechasEnObjeto = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const objFormateado = { ...obj };
  const camposFecha = ['fecha_venta', 'fecha_contrato', 'fecha_de_peticion', 'fecha_de_respuesta', 'fechacompra', 'fecha'];
  
  Object.keys(objFormateado).forEach(key => {
    const esCampoFecha = camposFecha.some(campo => key.toLowerCase().includes(campo.toLowerCase()));
    if (esCampoFecha) {
      objFormateado[key] = formatearFechaSinZona(objFormateado[key]);
    }
  });
  
  return objFormateado;
};

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3001; // Lee el puerto desde .env o usa 3001 por defecto

// 🌐 CONFIGURACIÓN CORS OPTIMIZADA PARA RENDER
const corsOptions = {
  origin: [
    'http://localhost:5173',              // Vite dev server
    'http://localhost:3000',              // React dev alternate
    'http://127.0.0.1:5173',             // Local IP
    'https://cargosfraudes.onrender.com', // Frontend específico en Render
    'https://cargosfraudes-spa.onrender.com', // Frontend SPA (si existe)
    'https://buscadores.onrender.com',    // Por si el backend sirve frontend
    /\.onrender\.com$/                    // Cualquier subdominio de onrender.com
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// 🔍 Logging detallado para debugging CORS en producción
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  console.log(`🌐 Origin: ${req.headers.origin || 'no-origin'}`);
  console.log(`🔄 Referer: ${req.headers.referer || 'no-referer'}`);
  console.log(`🗂️ Headers:`, Object.keys(req.headers));
  next();
});

// Middleware adicional CORS para Render (más permisivo)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Si es de un dominio onrender.com, permitir siempre
  if (origin && origin.includes('onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Para requests directas sin origin
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight por 24 horas
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ Preflight request handled for ${req.path} from ${origin || 'no-origin'}`);
    return res.status(200).end();
  }
  
  next();
});

// 🚦 Middleware específico para manejar todas las requests OPTIONS
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`🚦 OPTIONS request for ${req.path} from ${origin || 'no-origin'}`);
  
  // Headers específicos para OPTIONS
  if (origin && origin.includes('onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-HTTP-Method-Override');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(200).end();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 🔒 RESTRICCIÓN POR IP PARA DATOS CONFIDENCIALES
const IPS_AUTORIZADAS_DATOS = [
  '127.0.0.1', '::1',                    // Localhost (desarrollo)
  '192.168.1.0/24', '192.168.0.0/24',   // Redes locales comunes
  process.env.IP_AUTORIZADA_1 || '',     // IP desde variable de entorno
  process.env.IP_AUTORIZADA_2 || '',     // IP adicional desde variable de entorno
].filter(Boolean); // Remover valores vacíos

// Middleware para proteger endpoints con datos confidenciales
const protegerDatos = (req, res, next) => {
  // En producción (Render), permitir acceso desde el frontend específico
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Permitir si viene desde cargosfraudes.onrender.com o requests internas
    if ((origin && origin.includes('cargosfraudes.onrender.com')) || 
        (referer && referer.includes('cargosfraudes.onrender.com')) ||
        !origin) { // Request directa al backend
      console.log(`✅ Acceso autorizado en producción desde: ${origin || referer || 'directo'}`);
      return next();
    }
    
    // Log para debugging
    console.log(`🔍 Request origin: ${origin}`);
    console.log(`🔍 Request referer: ${referer}`);
  }

  // Obtener IP real considerando proxies (Render usa proxies)
  const forwarded = req.headers['x-forwarded-for'];
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.ip;
  
  const cleanIP = clientIP.replace(/^::ffff:/, '');
  
  console.log(`🔍 Intento de acceso a datos desde IP: ${cleanIP}`);
  console.log(`🔒 IPs autorizadas:`, IPS_AUTORIZADAS_DATOS);
  
  // Verificar si la IP está autorizada
  const isAuthorized = IPS_AUTORIZADAS_DATOS.some(authorizedIP => {
    if (authorizedIP.includes('/')) {
      // Manejo básico de rangos CIDR (192.168.1.0/24)
      const [network, mask] = authorizedIP.split('/');
      const networkBase = network.split('.').slice(0, parseInt(mask) / 8).join('.');
      const clientBase = cleanIP.split('.').slice(0, parseInt(mask) / 8).join('.');
      return networkBase === clientBase;
    }
    return authorizedIP === cleanIP;
  });
  
  if (isAuthorized) {
    console.log(`✅ IP autorizada para datos: ${cleanIP}`);
    next();
  } else {
    console.log(`❌ IP NO autorizada para datos: ${cleanIP}`);
    res.status(403).json({ 
      error: 'Acceso denegado desde esta ubicación',
      message: 'Los datos confidenciales solo son accesibles desde ubicaciones autorizadas',
      ip: cleanIP,
      timestamp: new Date().toISOString()
    });
  }
};

// Configurar Express para confiar en proxies (necesario para Render)
app.set('trust proxy', true);

// ✅ Conexión a la base de datos - optimizada para archivos grandes
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OnhVP53dwERt@ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech:5432/buscadores?sslmode=require",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 50, // ✅ hasta 50 conexiones simultáneas
  idleTimeoutMillis: 60000, // 60 segundos para archivos grandes
  connectionTimeoutMillis: 10000, // 10 segundos timeout de conexión
  statement_timeout: 300000, // 5 minutos para queries largas
  query_timeout: 300000, // 5 minutos para queries
});

// ✅ Configuración de almacenamiento temporal para archivos (optimizado para archivos grandes)
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB por archivo (para archivos muy grandes)
    files: 5 // Máximo 5 archivos por request
  }
});

// Configurar límites de memoria para Node.js
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
  console.log("⚠️ Recomendación: Configura NODE_OPTIONS=--max-old-space-size=4096 para archivos muy grandes");
}

// 🔄 Mapeo de columnas específico para cada tabla
function mapearColumnas(tabla, columnas) {
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
function formatearDatos(tabla, columna, valor) {
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

  const tipoColumna = tiposColumnas[tabla]?.[columna];
  
  // Si el valor es null, undefined o vacío, retornar null
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  try {
    switch (tipoColumna) {
      case 'DATE':
        // ✅ FUNCIÓN DE FECHA MEJORADA Y PROTEGIDA
        if (valor instanceof Date) {
          // Si ya es una fecha válida de Excel
          const año = valor.getFullYear();
          if (año < 1900 || año > 2100) {
            console.log(`⚠️ Fecha con año inválido en ${columna}: ${año} -> null`);
            return null;
          }
          return valor.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (typeof valor === 'number') {
          // Si es un número de Excel (fecha serial)
          if (valor < 1 || valor > 100000) {
            console.log(`⚠️ Número de fecha serial fuera de rango en ${columna}: ${valor} -> null`);
            return null;
          }
          
          // ✅ CONVERSIÓN SEGURA DE FECHA SERIAL DE EXCEL
          try {
            const fecha = new Date((valor - 25569) * 86400 * 1000);
            const año = fecha.getFullYear();
            
            if (isNaN(fecha.getTime()) || año < 1900 || año > 2100) {
              console.log(`⚠️ Fecha serial inválida en ${columna}: ${valor} -> null`);
              return null;
            }
            
            return fecha.toISOString().split('T')[0];
          } catch (error) {
            console.log(`⚠️ Error al convertir fecha serial en ${columna}: ${valor} -> null`);
            return null;
          }
        } else if (typeof valor === 'string') {
          // ✅ PARSEO DE STRING CON VALIDACIONES ESTRICTAS
          const valorLimpio = valor.trim();
          
          // Verificar que no tenga caracteres extraños
          if (!/^[\d\-\/\s\.:]+$/.test(valorLimpio)) {
            console.log(`⚠️ Fecha con caracteres inválidos en ${columna}: ${valorLimpio} -> null`);
            return null;
          }
          
          // Intentar diferentes formatos de fecha
          const formatosFecha = [
            /^\d{4}-\d{2}-\d{2}$/,     // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/,   // DD/MM/YYYY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/, // D/M/YYYY
            /^\d{4}\/\d{2}\/\d{2}$/    // YYYY/MM/DD
          ];
          
          const esFormatoValido = formatosFecha.some(formato => formato.test(valorLimpio));
          
          if (!esFormatoValido) {
            console.log(`⚠️ Formato de fecha no reconocido en ${columna}: ${valorLimpio} -> null`);
            return null;
          }
          
          // Intentar parsear la fecha
          let fecha;
          
          if (/^\d{4}-\d{2}-\d{2}$/.test(valorLimpio)) {
            // Formato YYYY-MM-DD
            fecha = new Date(valorLimpio + 'T00:00:00.000Z');
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorLimpio)) {
            // Formato DD/MM/YYYY
            const [dia, mes, año] = valorLimpio.split('/');
            fecha = new Date(año, mes - 1, dia);
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valorLimpio)) {
            // Formato D/M/YYYY
            const [dia, mes, año] = valorLimpio.split('/');
            fecha = new Date(año, mes - 1, dia);
          } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(valorLimpio)) {
            // Formato YYYY/MM/DD
            const [año, mes, dia] = valorLimpio.split('/');
            fecha = new Date(año, mes - 1, dia);
          } else {
            console.log(`⚠️ No se pudo parsear fecha en ${columna}: ${valorLimpio} -> null`);
            return null;
          }
          
          // Validar que la fecha sea válida
          if (isNaN(fecha.getTime())) {
            console.log(`⚠️ Fecha parseada inválida en ${columna}: ${valorLimpio} -> null`);
            return null;
          }
          
          const año = fecha.getFullYear();
          if (año < 1900 || año > 2100) {
            console.log(`⚠️ Año fuera de rango en ${columna}: ${año} -> null`);
            return null;
          }
          
          return fecha.toISOString().split('T')[0];
        } else {
          console.log(`⚠️ Tipo de fecha no reconocido en ${columna}: ${typeof valor} -> null`);
          return null;
        }

                case 'DECIMAL':
                // ✅ MEJORADO: Solo aplicar normalización de formato europeo/americano a monto_mnx
                if (typeof valor === 'number') {
                  return isNaN(valor) ? null : valor;
                } else if (typeof valor === 'string') {
                  const valorLimpio = valor.trim();
                  
                  // ✅ SOLO aplicar conversión de formato europeo para monto_mnx
                  if (columna === 'monto_mnx') {
                    // Detectar formato europeo vs americano solo para monto_mnx
                    const tieneComaDecimal = valorLimpio.indexOf(',') > -1 && valorLimpio.lastIndexOf(',') > valorLimpio.lastIndexOf('.');
                    
                    let numeroNormalizado;
                    
                    if (tieneComaDecimal) {
                      // Formato europeo (4.000,45) -> normalizar a formato americano
                      console.log(`🔄 Convirtiendo formato europeo en monto_mnx: ${valorLimpio}`);
                      numeroNormalizado = valorLimpio.replace(/\./g, '').replace(',', '.');
                    } else {
                      // Formato americano (4,000.45) o número simple
                      numeroNormalizado = valorLimpio.replace(/,/g, '');
                    }
                    
                    // Eliminar cualquier carácter no numérico excepto punto decimal y signo negativo
                    numeroNormalizado = numeroNormalizado.replace(/[^0-9.-]/g, '');
                    
                    const numero = parseFloat(numeroNormalizado);
                    
                    if (isNaN(numero)) {
                      console.log(`⚠️ No se pudo convertir monto_mnx a número: ${valorLimpio} -> null`);
                      return null;
                    }
                    
                    console.log(`✅ Conversión exitosa en monto_mnx: ${valorLimpio} -> ${numero}`);
                    return numero;
                  } else {
                    // ✅ Para otras columnas DECIMAL, solo limpieza básica (sin conversión de formato)
                    const numeroNormalizado = valorLimpio.replace(/,/g, '');
                    const numero = parseFloat(numeroNormalizado);
                    
                    if (isNaN(numero)) {
                      return null;
                    }
                    
                    return numero;
                  }
                } else {
                  return null;
                }

      case 'VARCHAR':
      case 'TEXT':
        // Para texto, convertir a string y limpiar
        if (columna.includes('tarjeta') && valor != null) {
          // Limpiar números de tarjeta
          return String(valor).replace(/\.0+$/, '').trim();
        } else {
          return String(valor).trim();
        }

      default:
        // Para columnas no definidas, aplicar formato genérico
        if (columna.toLowerCase().includes('tarjeta') && valor != null) {
          return String(valor).replace(/\.0+$/, '');
        } else if (columna.toLowerCase().includes('fecha') && valor instanceof Date) {
          const año = valor.getFullYear();
          if (año < 1900 || año > 2100) {
            console.log(`⚠️ Fecha genérica con año inválido en ${columna}: ${año} -> null`);
            return null;
          }
          return valor.toISOString().split('T')[0];
        } else {
          return valor;
        }
    }
  } catch (error) {
    console.log(`⚠️ Error formateando ${columna}: ${valor} -> null (${error.message})`);
    return null;
  }
}

// =================== 📥 SUBIR Y ACTUALIZAR TABLAS (OPTIMIZADO) ===================
 // Asegúrate de tenerlo importado arriba

let progresoGlobal = {
  tabla: "",
  procesadas: 0,
  total: 0,
  porcentaje: 0,
  tiempoEstimado: 0,
  tiempoTotal: 0,
};

// ✅ Función para insertar múltiples registros de manera eficiente
async function insertarRegistros(client, tabla, registros) {
  if (registros.length === 0) return;

  try {
    const columnas = Object.keys(registros[0]);
    const columnasSQL = columnas.map(col => `"${col}"`).join(', ');
    
    // Construir VALUES para múltiples registros
    const values = [];
    const placeholders = [];
    
    registros.forEach((registro, index) => {
      const registroPlaceholders = columnas.map((col, colIndex) => {
        values.push(registro[col]);
        return `$${index * columnas.length + colIndex + 1}`;
      });
      placeholders.push(`(${registroPlaceholders.join(', ')})`);
    });
    
    const query = `
      INSERT INTO "${tabla}" (${columnasSQL}) 
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;
    
    await client.query(query, values);
    
  } catch (error) {
    console.error(`❌ Error insertando registros en ${tabla}:`, error.message);
    throw error;
  }
}

// ✅ Endpoint SSE para progreso en tiempo real
app.get("/progreso", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(progresoGlobal)}\n\n`);
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

// ✅ Endpoint principal optimizado
app.post("/upload/:tabla", upload.single("archivo"), async (req, res) => {
  const tabla = req.params.tabla;
  const filePath = req.file.path;
  let client;

  try {
    console.log(`📂 Iniciando carga optimizada para tabla: ${tabla}`);
    console.log(`📂 Archivo: ${filePath}, Tamaño: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    // Crear conexión dedicada para esta operación
    client = await pool.connect();
    
    // Configurar timeout más largo para esta conexión
    await client.query('SET statement_timeout = 0'); // Sin timeout
    await client.query('SET idle_in_transaction_session_timeout = 0');

    const workbook = new ExcelJS.Workbook();
    
    // Leer archivo con opciones de streaming optimizadas
    await workbook.xlsx.readFile(filePath, {
      sharedStrings: 'cache', // Optimizar strings compartidos
      hyperlinks: 'ignore',   // Ignorar hyperlinks para ahorrar memoria
      styles: 'ignore'        // Ignorar estilos para ahorrar memoria
    });

    const sheet = workbook.worksheets[0];
    
    // Obtener encabezados sin cargar todas las filas
    const primeraFila = sheet.getRow(1);
    const columnasOriginales = primeraFila.values.slice(1).filter(col => col !== null && col !== undefined && col !== '');
    
    console.log(`🔍 DEBUG - Columnas detectadas:`, columnasOriginales);
    
    if (columnasOriginales.length === 0) {
      throw new Error('No se detectaron columnas en el archivo Excel. Verifica que la primera fila contenga los encabezados.');
    }
    
    const columnas = mapearColumnas(tabla, columnasOriginales);
    console.log(`📋 Columnas mapeadas para ${tabla}:`, columnas);

    // Contar filas de manera más eficiente
    const totalFilas = sheet.rowCount - 1;
    console.log(`📊 Total de filas a procesar: ${totalFilas.toLocaleString()}`);

    // Configurar progreso global
    progresoGlobal = {
      tabla,
      procesadas: 0,
      total: totalFilas,
      porcentaje: 0,
      tiempoEstimado: 0,
      tiempoTotal: 0,
    };

    const inicio = Date.now();
    const BATCH_SIZE = 500; // Tamaño fijo y razonable
    let registros = [];
    
    console.log(`🔄 Procesando archivo: ${totalFilas.toLocaleString()} filas (grupos de ${BATCH_SIZE})`);

    // Iniciar transacción para mejor performance
    await client.query('BEGIN');

    try {
      // Procesar filas agrupándolas
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const obj = {};

        // Mapear datos
        columnas.forEach((col, idx) => {
          let valor = row.values[idx + 1];
          obj[col] = formatearDatos(tabla, col, valor);
        });

        // Filtrar registros vacíos
        const valoresValidos = Object.values(obj).filter(valor => 
          valor !== null && 
          valor !== undefined && 
          valor !== 'null' && 
          valor !== '' && 
          valor !== 'undefined'
        );

        if (valoresValidos.length > 0) {
          registros.push(obj);
        }

        // Procesar cuando tengamos suficientes registros
        if (registros.length >= BATCH_SIZE) {
          await insertarRegistros(client, tabla, registros);
          progresoGlobal.procesadas += registros.length;
          actualizarProgreso(inicio);
          
          if (progresoGlobal.procesadas % 1000 === 0) {
            console.log(`📊 Progreso: ${progresoGlobal.procesadas.toLocaleString()}/${totalFilas.toLocaleString()} (${progresoGlobal.porcentaje.toFixed(1)}%)`);
          }
          
          registros = []; // Limpiar array
        }
      }

      // Procesar registros restantes
      if (registros.length > 0) {
        await insertarRegistros(client, tabla, registros);
        progresoGlobal.procesadas += registros.length;
        actualizarProgreso(inicio);
      }

      // Commit de la transacción
      await client.query('COMMIT');
      
      const tiempoTotal = Math.round((Date.now() - inicio) / 1000);
      progresoGlobal.tiempoTotal = tiempoTotal;

      console.log(`✅ Carga completada: ${progresoGlobal.procesadas.toLocaleString()} registros en ${tiempoTotal}s`);
      
      res.json({
        success: true,
        message: `Archivo cargado exitosamente: ${progresoGlobal.procesadas.toLocaleString()} registros procesados en ${tiempoTotal}s`,
        registrosProcesados: progresoGlobal.procesadas,
        tiempoTotal: tiempoTotal
      });

    } catch (dbError) {
      // Rollback en caso de error
      await client.query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    console.error(`❌ Error cargando archivo en ${tabla}:`, error);
    res.status(500).json({ 
      error: `Error procesando archivo: ${error.message}`,
      memoria: process.memoryUsage(),
      recomendacion: "Para archivos muy grandes, considera aumentar la memoria de Node.js con: NODE_OPTIONS='--max-old-space-size=4096'"
    });
  } finally {
    // Limpiar recursos
    if (client) {
      client.release();
    }
    
    // Eliminar archivo temporal
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
      }
    } catch (cleanupError) {
      console.warn(`⚠️ No se pudo eliminar archivo temporal: ${cleanupError.message}`);
    }
    
    // Forzar garbage collection si está disponible
    if (global.gc) {
      global.gc();
      console.log(`🧹 Memoria liberada después de procesar archivo`);
    }
  }
});

// ✅ Endpoint para borrar registros del año 2025 de una tabla
app.delete("/delete-all/:tabla", protegerDatos, async (req, res) => {
  const tabla = req.params.tabla;
  
  // Validar que solo se pueda borrar de caja y ventas
  if (tabla !== 'caja' && tabla !== 'ventas') {
    return res.status(400).json({ 
      error: "Solo se permite borrar registros de las tablas 'caja' y 'ventas'" 
    });
  }
  
  try {
    console.log(`🗑️ [INICIO] Solicitud de borrado para tabla: ${tabla} - ${new Date().toISOString()}`);
    
    // Determinar la columna de fecha según la tabla
    const columnaFecha = tabla === 'caja' ? 'Fecha' : 'FechaCompra';
    console.log(`📅 Columna de fecha detectada: ${columnaFecha}`);
    
    // PROTECCIÓN 1: Verificar distribución de años ANTES de borrar
    const allYearsResult = await pool.query(`
      SELECT EXTRACT(YEAR FROM "${columnaFecha}") as año, COUNT(*) as total
      FROM "${tabla}"
      GROUP BY EXTRACT(YEAR FROM "${columnaFecha}")
      ORDER BY año
    `);
    
    console.log(`📊 Distribución actual en ${tabla}:`);
    allYearsResult.rows.forEach(row => {
      console.log(`   - Año ${row.año}: ${row.total} registros`);
    });
    
    // PROTECCIÓN 2: Contar específicamente registros del 2025
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM "${tabla}" 
      WHERE EXTRACT(YEAR FROM "${columnaFecha}") = 2025
    `);
    const totalRegistros2025 = parseInt(countResult.rows[0].count);
    
    console.log(`🎯 Registros del 2025 encontrados: ${totalRegistros2025}`);
    
    if (totalRegistros2025 === 0) {
      console.log(`⚠️ No hay registros del 2025 para borrar en ${tabla}`);
      return res.json({ 
        message: `⚠️ No se encontraron registros del año 2025 en ${tabla}`,
        registrosBorrados: 0,
        año: 2025,
        tabla: tabla
      });
    }
    
    // PROTECCIÓN 3: Verificar que el query incluya WHERE antes de ejecutar
    const deleteQuery = `DELETE FROM "${tabla}" WHERE EXTRACT(YEAR FROM "${columnaFecha}") = 2025`;
    console.log(`🔍 Query que se ejecutará: ${deleteQuery}`);
    
    // PROTECCIÓN 4: Verificar que el query contenga WHERE y 2025
    if (!deleteQuery.includes('WHERE') || !deleteQuery.includes('2025')) {
      throw new Error('SEGURIDAD: Query de borrado no contiene protecciones necesarias');
    }
    
    // EJECUTAR BORRADO PROTEGIDO
    const deleteResult = await pool.query(deleteQuery);
    
    console.log(`✅ BORRADO COMPLETADO: ${deleteResult.rowCount} registros del año 2025 borrados de ${tabla}`);
    
    // PROTECCIÓN 5: Verificar estado después del borrado
    const afterResult = await pool.query(`
      SELECT COUNT(*) as total FROM "${tabla}"
    `);
    console.log(`📊 Total de registros restantes en ${tabla}: ${afterResult.rows[0].total}`);
    
    res.json({ 
      message: `✅ ${deleteResult.rowCount} registros del año 2025 borrados exitosamente de ${tabla}`,
      registrosBorrados: deleteResult.rowCount,
      año: 2025,
      tabla: tabla,
      registrosRestantes: afterResult.rows[0].total
    });
    
  } catch (error) {
    console.error(`❌ ERROR CRÍTICO en borrado de ${tabla}:`, error);
    res.status(500).json({ 
      error: `Error al borrar registros: ${error.message}`,
      tabla: tabla,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Endpoint para borrar registros de julio y agosto de cargos_auto
app.delete("/delete-julio-agosto/:tabla", protegerDatos, async (req, res) => {
  const tabla = req.params.tabla;
  
  // Validar que solo se pueda borrar de cargos_auto
  if (tabla !== 'cargos_auto') {
    return res.status(400).json({ 
      error: "Solo se permite borrar registros de julio y agosto de la tabla 'cargos_auto'" 
    });
  }
  
  try {
    console.log(`🗑️ [INICIO] Solicitud de borrado de julio y agosto para tabla: ${tabla} - ${new Date().toISOString()}`);
    
    // Para cargos_auto, la columna de fecha es 'FechaCompra'
    const columnaFecha = 'Fecha';
    console.log(`📅 Columna de fecha detectada: ${columnaFecha}`);
    
    // PROTECCIÓN 1: Verificar distribución por mes ANTES de borrar
    const monthsResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM "${columnaFecha}") as mes, COUNT(*) as total
      FROM "${tabla}"
      WHERE EXTRACT(YEAR FROM "${columnaFecha}") = 2025
      GROUP BY EXTRACT(MONTH FROM "${columnaFecha}")
      ORDER BY mes
    `);
    
    console.log(`📊 Distribución por mes en ${tabla} (año 2025):`);
    monthsResult.rows.forEach(row => {
      const nombreMes = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][row.mes];
      console.log(`   - ${nombreMes}: ${row.total} registros`);
    });
    
    // PROTECCIÓN 2: Contar específicamente registros de julio y agosto 2025
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM "${tabla}" 
      WHERE EXTRACT(YEAR FROM "${columnaFecha}") = 2025 
      AND EXTRACT(MONTH FROM "${columnaFecha}") IN (7, 8)
    `);
    const totalRegistrosJulAgo = parseInt(countResult.rows[0].count);
    
    console.log(`🎯 Registros de julio y agosto 2025 encontrados: ${totalRegistrosJulAgo}`);
    
    if (totalRegistrosJulAgo === 0) {
      console.log(`⚠️ No hay registros de julio y agosto 2025 para borrar en ${tabla}`);
      return res.json({ 
        message: `⚠️ No se encontraron registros de julio y agosto 2025 en ${tabla}`,
        registrosBorrados: 0,
        meses: 'julio y agosto',
        año: 2025,
        tabla: tabla
      });
    }
    
    // PROTECCIÓN 3: Verificar que el query incluya WHERE antes de ejecutar
    const deleteQuery = `DELETE FROM "${tabla}" WHERE EXTRACT(YEAR FROM "${columnaFecha}") = 2025 AND EXTRACT(MONTH FROM "${columnaFecha}") IN (7, 8)`;
    console.log(`🔍 Query que se ejecutará: ${deleteQuery}`);
    
    // PROTECCIÓN 4: Verificar que el query contenga WHERE, 2025, y los meses
    if (!deleteQuery.includes('WHERE') || !deleteQuery.includes('2025') || !deleteQuery.includes('IN (7, 8)')) {
      throw new Error('SEGURIDAD: Query de borrado no contiene protecciones necesarias');
    }
    
    // EJECUTAR BORRADO PROTEGIDO
    const deleteResult = await pool.query(deleteQuery);
    
    console.log(`✅ BORRADO COMPLETADO: ${deleteResult.rowCount} registros de julio y agosto 2025 borrados de ${tabla}`);
    
    // PROTECCIÓN 5: Verificar estado después del borrado
    const afterResult = await pool.query(`
      SELECT COUNT(*) as total FROM "${tabla}"
    `);
    console.log(`📊 Total de registros restantes en ${tabla}: ${afterResult.rows[0].total}`);
    
    res.json({ 
      message: `✅ ${deleteResult.rowCount} registros de julio y agosto 2025 borrados exitosamente de ${tabla}`,
      registrosBorrados: deleteResult.rowCount,
      meses: 'julio y agosto',
      año: 2025,
      tabla: tabla,
      registrosRestantes: afterResult.rows[0].total
    });
    
  } catch (error) {
    console.error(`❌ ERROR CRÍTICO en borrado de julio y agosto de ${tabla}:`, error);
    res.status(500).json({ 
      error: `Error al borrar registros: ${error.message}`,
      tabla: tabla,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Calcular porcentaje y tiempo estimado
function actualizarProgreso(inicio) {
  const tiempoTranscurrido = (Date.now() - inicio) / 1000;
  progresoGlobal.porcentaje = 
    (progresoGlobal.procesadas / progresoGlobal.total) * 100;
  progresoGlobal.tiempoEstimado = 
    (tiempoTranscurrido / progresoGlobal.procesadas) * progresoGlobal.total;
}



/* =============== 🔍 CONSULTAR DATOS (ya con filtros) ================== */
const generarConsulta = (tabla, filtros, pagina, limite) => {
  let columnaFecha = '"Fecha"';
  if (tabla === "ventas") columnaFecha = '"FechaCompra"';
  if (tabla === "aclaraciones") columnaFecha = '"fecha_de_peticion"';
  
  let query = `SELECT * FROM "${tabla}" WHERE 1=1`;
  const values = [];

  if (filtros.cliente) {
    values.push(`%${filtros.cliente}%`);
    if (tabla === "aclaraciones") {
      query += ` AND "cliente" ILIKE $${values.length}`;
    } else {
      query += ` AND "Cliente" ILIKE $${values.length}`;
    }
  }
  if (filtros.sucursal && 
      filtros.sucursal.trim() !== "" && 
      filtros.sucursal !== "Todas las sucursales" &&
      filtros.sucursal !== "-- Todas las sucursales --") {
    values.push(filtros.sucursal);
    if (tabla === "aclaraciones") {
      query += ` AND "sucursal" = $${values.length}`;
    } else {
      query += ` AND "Sucursal" = $${values.length}`;
    }
  }
  if (filtros.fecha_inicio && filtros.fecha_fin) {
    values.push(filtros.fecha_inicio);
    query += ` AND ${columnaFecha} >= $${values.length}`;
    values.push(filtros.fecha_fin);
    query += ` AND ${columnaFecha} <= $${values.length}`;
  }
  if (filtros.monto_min) {
    values.push(parseFloat(filtros.monto_min));
    if (tabla === "aclaraciones") {
      query += ` AND "monto" >= $${values.length}`;
    } else {
      query += ` AND "Total" >= $${values.length}`;
    }
  }
  if (filtros.monto_max) {
    values.push(parseFloat(filtros.monto_max));
    if (tabla === "aclaraciones") {
      query += ` AND "monto" <= $${values.length}`;
    } else {
      query += ` AND "Total" <= $${values.length}`;
    }
  }
  // 🔍 FILTRO POR TARJETA - SÚPER INTELIGENTE
  // Combina BIN + Terminación para búsquedas más precisas
  // • 16 dígitos = Búsqueda exacta de tarjeta completa
  // • 4-15 dígitos = Búsqueda por BIN (inicio de tarjeta)  
  // • 1-3 dígitos = Búsqueda flexible (contiene)
  // • BIN + Terminación = Tarjetas que empiecen con BIN Y terminen con terminación
  
  const tieneTarjeta = filtros.tarjeta && filtros.tarjeta.toString().trim();
  const tieneTerminacion = filtros.terminacion && filtros.terminacion.toString().trim();
  
  if (tieneTarjeta && tieneTerminacion) {
    // 🎯 COMBO: BIN + Terminación (ej: "4123" que termine en "5678")
    const numeroTarjeta = tieneTarjeta;
    const terminacion = tieneTerminacion;
    
    // Crear patrón: BIN% AND %terminación
    values.push(`${numeroTarjeta}%`);
    values.push(`%${terminacion}`);
    
    if (tabla === "aclaraciones") {
      query += ` AND "num_de_tarjeta" LIKE $${values.length - 1} AND "num_de_tarjeta" LIKE $${values.length}`;
    } else {
      query += ` AND "Tarjeta" LIKE $${values.length - 1} AND "Tarjeta" LIKE $${values.length}`;
    }
  } 
  else if (tieneTarjeta) {
    // 🔍 Solo filtro por tarjeta/BIN
    const numeroTarjeta = tieneTarjeta;
    
    // Si tiene 16 dígitos, búsqueda exacta
    if (numeroTarjeta.length === 16) {
      values.push(numeroTarjeta);
      if (tabla === "aclaraciones") {
        query += ` AND "num_de_tarjeta" = $${values.length}`;
      } else {
        query += ` AND "Tarjeta" = $${values.length}`;
      }
    } 
    // Si tiene 4-15 dígitos, búsqueda por BIN (inicio)
    else if (numeroTarjeta.length >= 4 && numeroTarjeta.length < 16) {
      values.push(`${numeroTarjeta}%`);
      if (tabla === "aclaraciones") {
        query += ` AND "num_de_tarjeta" LIKE $${values.length}`;
      } else {
        query += ` AND "Tarjeta" LIKE $${values.length}`;
      }
    }
    // Si tiene 1-3 dígitos, búsqueda flexible (contiene)
    else if (numeroTarjeta.length > 0 && numeroTarjeta.length < 4) {
      values.push(`%${numeroTarjeta}%`);
      if (tabla === "aclaraciones") {
        query += ` AND "num_de_tarjeta" LIKE $${values.length}`;
      } else {
        query += ` AND "Tarjeta" LIKE $${values.length}`;
      }
    }
  }
  else if (tieneTerminacion) {
    // 🎯 Solo filtro por terminación
    values.push(`%${tieneTerminacion}`);
    if (tabla === "aclaraciones") {
      query += ` AND "num_de_tarjeta" LIKE $${values.length}`;
    } else {
      query += ` AND "Tarjeta" LIKE $${values.length}`;
    }
  }
  if (filtros.anio) {
    values.push(filtros.anio);
    query += ` AND EXTRACT(YEAR FROM ${columnaFecha}) = $${values.length}`;
  }
  if (filtros.bloque) {
    values.push(filtros.bloque);
    if (tabla === "aclaraciones") {
      query += ` AND "bloque" = $${values.length}`;
    } else {
      query += ` AND "Bloque" = $${values.length}`;
    }
  }
  if (filtros.vendedora) {
    values.push(`%${filtros.vendedora}%`);
    if (tabla === "aclaraciones") {
      query += ` AND "vendedora" ILIKE $${values.length}`;
    } else {
      query += ` AND "Vendedor" ILIKE $${values.length}`;
    }
  }

  if (filtros.procesadores) {
  if (typeof filtros.procesadores === "string") {
    // Si viene como "KUSHKI,NETPAY", conviértelo a array
    if (filtros.procesadores.includes(",")) {
      filtros.procesadores = filtros.procesadores.split(",").map(p => p.trim());
    } else {
      filtros.procesadores = [filtros.procesadores.trim()];
    }
  } else if (Array.isArray(filtros.procesadores)) {
    filtros.procesadores = filtros.procesadores.map(p => p.trim());
  }
}

if (
  tabla === "cargos_auto" &&
  filtros.procesadores &&
  Array.isArray(filtros.procesadores) &&
  filtros.procesadores.length > 0
) {
  const condiciones = filtros.procesadores.map((p, idx) => {
    values.push(`%${p}%`);
    return `TRIM("Cobrado_Por") ILIKE $${values.length}`;
  });
  query += ` AND (${condiciones.join(" OR ")})`;
}

// Filtros específicos para aclaraciones
if (tabla === "aclaraciones") {
  if (filtros.busqueda) {
    values.push(`%${filtros.busqueda}%`);
    query += ` AND ("cliente" ILIKE $${values.length} OR "num_de_tarjeta" ILIKE $${values.length} OR "id_de_transaccion" ILIKE $${values.length})`;
  }
  if (filtros.procesador) {
    values.push(filtros.procesador);
    query += ` AND "procesador" = $${values.length}`;
  }
}

  // 🎯 FILTRO CARGOS AUTO (BSD, EFEVOO, STRIPE AUTO)
  if (tabla === "cargos_auto" && (filtros.filtro_cargos_auto === "true" || filtros.filtro_cargo_auto === "true")) {
    const procesadoresCargoAuto = ['BSD', 'EFEVOO', 'STRIPE AUTO'];
    const condicionesCargoAuto = procesadoresCargoAuto.map((proc, idx) => {
      values.push(`%${proc}%`);
      return `"Cobrado_Por" ILIKE $${values.length}`;
    });
    query += ` AND (${condicionesCargoAuto.join(' OR ')})`;
  }

  // 🔍 FILTROS DE COLUMNAS TIPO EXCEL
  if (filtros.filtros_columnas) {
    try {
      const filtrosColumnas = JSON.parse(filtros.filtros_columnas);
      Object.entries(filtrosColumnas).forEach(([columna, valores]) => {
        if (valores && valores.length > 0) {
          if (Array.isArray(valores)) {
            // Selección múltiple - exact match para cada valor
            const condiciones = valores.map((v, idx) => {
              values.push(v); // Usar exact match en lugar de LIKE
              return `"${columna}" = $${values.length}`;
            });
            query += ` AND (${condiciones.join(' OR ')})`;
          } else {
            // Filtro simple
            values.push(valores);
            query += ` AND "${columna}" = $${values.length}`;
          }
        }
      });
    } catch (error) {
      console.error('Error parsing filtros_columnas:', error);
    }
  }

  const offset = (pagina - 1) * limite;
  query += ` ORDER BY ${columnaFecha} DESC LIMIT ${limite} OFFSET ${offset}`;
  return { query, values };
};

["caja", "cargos_auto", "ventas", "aclaraciones"].forEach(tabla => {
  app.get(`/${tabla}/ultima-fecha`, async (req, res) => {
    try {
      // Usa la columna correcta para cada tabla
      let columnaFecha = "Fecha";
      if (tabla === "ventas") columnaFecha = "FechaCompra";
      if (tabla === "aclaraciones") columnaFecha = "fecha_de_peticion";
      
      let query;
      if (tabla === "aclaraciones") {
        // Para aclaraciones, mantener filtros por los 13 NULL que dejamos
        query = `SELECT MAX("${columnaFecha}") AS fecha FROM "${tabla}" 
                 WHERE "${columnaFecha}" IS NOT NULL`;
      } else {
        // Para caja, cargos_auto y ventas - fechas limpias, conversión directa
        if (columnaFecha === "FechaCompra") {
          query = `SELECT MAX("${columnaFecha}"::timestamp::date) AS fecha FROM "${tabla}"`;
        } else {
          query = `SELECT MAX("${columnaFecha}"::timestamp::date) AS fecha FROM "${tabla}"`;
        }
      }
      
      const result = await pool.query(query);
      res.json({ fecha: result.rows[0].fecha });
    } catch (err) {
      console.error(`Error al obtener última fecha de ${tabla}:`, err);
      res.json({ fecha: null });
    }
  });
});

["cargos_auto", "caja", "ventas", "aclaraciones"].forEach((tabla) => {
  // 🔒 Proteger endpoints con datos confidenciales
  app.get(`/${tabla}`, protegerDatos, async (req, res) => {
    try {
      const { pagina = 1, limite = 1000, ...filtros } = req.query;
      const { query, values } = generarConsulta(tabla, filtros, pagina, limite);

      // Consulta para el total
      const { query: countQuery, values: countValues } = generarConsulta(tabla, filtros, 1, 1000000000);
      const countResult = await pool.query(
        countQuery.replace(/SELECT \* FROM/, "SELECT COUNT(*) AS total FROM").replace(/ORDER BY[\s\S]*/i, ""),
        countValues
      );
      const total = Number(countResult.rows[0].total);

      const result = await pool.query(query, values);
      
      // 🗓️ Formatear fechas antes de enviar al frontend
      const datosFormateados = result.rows.map(row => formatearFechasEnObjeto(row));
      
      res.json({ datos: datosFormateados, total });
    } catch (error) {
      console.error(`❌ Error en ${tabla}:`, error);
      res.status(500).send(`Error en ${tabla}`);
    }
  });

  // Endpoint para exportar a Excel
  app.get(`/${tabla}/exportar`, async (req, res) => {
    try {
      const { pagina = 1, limite = 100000, ...filtros } = req.query;
      const { query, values } = generarConsulta(tabla, filtros, pagina, limite);

      const client = await pool.connect();
      const queryStream = new QueryStream(query, values, { batchSize: 1000 });
      const stream = client.query(queryStream);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet(tabla);

      let columnsSet = false;

      stream.on("data", (row) => {
        if (!columnsSet) {
          worksheet.columns = Object.keys(row).map((key) => ({
            header: key,
            key,
          }));
          columnsSet = true;
        }
        
        // Convierte números
        if (row.Total !== undefined && row.Total !== null) row.Total = Number(row.Total);
        if (row.TotalMxn !== undefined && row.TotalMxn !== null) row.TotalMxn = Number(row.TotalMxn);
        
        worksheet.addRow(row).commit();
      });

      stream.on("end", async () => {
        await worksheet.commit();
        await workbook.commit();
        client.release();
      });

      stream.on("error", (err) => {
        console.error("Error en stream de exportación:", err);
        client.release();
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${tabla}.xlsx`
      );
    } catch (error) {
      console.error(`❌ Error al exportar ${tabla}:`, error);
      res.status(500).send("Error al exportar datos");
    }
  });
});

app.get("/sucursales", async (req, res) => {
  const { bloque, anio } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT DISTINCT "Sucursal" FROM "ventas" ${whereClause} ORDER BY "Sucursal"`,
      values
    );
    const sucursales = result.rows.map((row) => row.Sucursal).filter(Boolean);
    res.json(sucursales);
  } catch (error) {
    res.status(500).send("Error al obtener sucursales");
  }
});

app.get("/ventas/resumen", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      EXTRACT(MONTH FROM "FechaCompra") AS mes,
      "Bloque",
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal
    FROM "ventas"
    ${whereClause}
    GROUP BY mes, "Bloque"
    ORDER BY mes;
  `;

  try {
    const result = await pool.query(query, values);

    // Convierte todos los montos a MXN según el bloque
    const resumenPorMes = {};
    result.rows.forEach(row => {
      const bloque = row.Bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      const mes = row.mes;

      if (!resumenPorMes[mes]) {
        resumenPorMes[mes] = {
          mes,
          ventas: 0,
          ventasadeudo: 0,
          cantidadpagada: 0,
          anticipo: 0,
          totalpagado: 0,
          ventastotal: 0,
        };
      }
      resumenPorMes[mes].ventas += Number(row.ventas);
      resumenPorMes[mes].ventasadeudo += Number(row.ventasadeudo) * factor;
      resumenPorMes[mes].cantidadpagada += Number(row.cantidadpagada) * factor;
      resumenPorMes[mes].anticipo += Number(row.anticipo) * factor;
      resumenPorMes[mes].totalpagado += Number(row.totalpagado) * factor;
      resumenPorMes[mes].ventastotal += Number(row.ventastotal) * factor;
    });

    res.json(Object.values(resumenPorMes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
});

app.get("/ventas/resumen-vendedora", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // ✅ FECHA LÍMITE: Solo vendedoras activas (últimos 2 meses)
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - 2);
  const fechaLimiteStr = fechaLimite.toISOString().slice(0, 10);
  
  values.push(fechaLimiteStr);
  const fechaLimiteParam = `$${idx++}`;

  // ✅ QUERY PRINCIPAL: Solo vendedoras activas + filtros del dashboard
  const query = `
    WITH vendedoras_activas AS (
      SELECT DISTINCT "Vendedor"
      FROM "ventas"
      WHERE "FechaCompra" >= ${fechaLimiteParam}
    ),
    sucursales_unicas AS (
      SELECT 
        t."Vendedor",
        STRING_AGG(sucursal_unica, ', ' ORDER BY sucursal_unica) AS sucursales
      FROM (
        SELECT DISTINCT v."Vendedor", v."Sucursal" as sucursal_unica
        FROM "ventas" v
        INNER JOIN vendedoras_activas va ON v."Vendedor" = va."Vendedor"
        ${whereClause}
      ) t
      GROUP BY t."Vendedor"
    )
    SELECT 
      v."Vendedor",
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS totalVencido,
      COALESCE(SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN "MontoVencido"::numeric ELSE 0 END),0) AS montoVencido,
      MIN(v."Bloque") AS bloque,
      MAX(v."FechaCompra") AS ultimaVenta,
      s.sucursales
    FROM "ventas" v
    INNER JOIN vendedoras_activas va ON v."Vendedor" = va."Vendedor"
    LEFT JOIN sucursales_unicas s ON v."Vendedor" = s."Vendedor"
    ${whereClause}
    GROUP BY v."Vendedor", s.sucursales
    ORDER BY ventasTotal DESC;
  `;

  try {
    const result = await pool.query(query, values);

    const resumenVendedora = await Promise.all(
      result.rows.map(async (row) => {
        const bloque = row.bloque;
        const factor = TIPO_CAMBIO[BLOQUE_PAIS_MONEDA[bloque]?.moneda] || 1;

        const ventasAdeudo = Number(row.ventasadeudo) * factor;
        const cantidadPagada = Number(row.cantidadpagada) * factor;
        const anticipo = Number(row.anticipo) * factor;
        const totalPagado = Number(row.totalpagado) * factor;
        const ventasTotal = Number(row.ventastotal) * factor;
        const montoVencido = Number(row.montovencido) * factor;

        // ✅ QUERY SEPARADO: Sucursales en el rango de fechas del dashboard
        let sucursalQuery = `
          SELECT 
            "Sucursal",
            COUNT(*) as ventas_sucursal
          FROM "ventas"
          WHERE "Vendedor" = $1
        `;

        const sucursalValues = [row.Vendedor];
        let paramIndex = 2;

        // ✅ SOLO APLICAR FILTROS DE FECHA DEL DASHBOARD (NO bloque ni sucursal específica)
        if (fecha_inicio && fecha_fin) {
          sucursalQuery += ` AND "FechaCompra" >= $${paramIndex++}`;
          sucursalValues.push(fecha_inicio);
          sucursalQuery += ` AND "FechaCompra" <= $${paramIndex++}`;
          sucursalValues.push(fecha_fin);
        }
        // ✅ NO aplicar filtros de año, bloque o sucursal específica

        sucursalQuery += `
          GROUP BY "Sucursal"
          ORDER BY ventas_sucursal DESC
        `;

        const sucursalResult = await pool.query(sucursalQuery, sucursalValues);
        const ventasPorSucursal = sucursalResult.rows.map(s => 
          `${s.Sucursal}: ${s.ventas_sucursal}`
        );

        return {
          vendedora: row.Vendedor,
          ventas: Number(row.ventas),
          ventasAdeudo,
          cantidadPagada,
          anticipo,
          totalPagado,
          ventasTotal,
          totalVencido: Number(row.totalvencido), // ✅ Cantidad de paquetes vencidos
          montoVencido, // ✅ Monto vencido en dinero
          ultimaVenta: row.ultimaventa,
          sucursales: row.sucursales,
          ventasPorSucursal, // ✅ Sucursales del período del dashboard
          porcentajeRecuperado: ventasTotal > 0 
            ? Math.round((totalPagado / ventasTotal) * 100) 
            : 0,
        };
      })
    );

    res.json(
      resumenVendedora.sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen por vendedora" });
  }
});

app.get("/ventas/resumen-sucursal", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "Sucursal",
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS al_corriente,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS liquidado,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS vencido,
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal,
      COALESCE(SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN "MontoVencido"::numeric ELSE 0 END),0) AS montoVencido,
      MIN("Bloque") AS bloque,
      MAX("FechaCompra"::timestamp::date) AS ultima_venta
    FROM "ventas"
    ${whereClause}
    GROUP BY "Sucursal"
    HAVING MAX("FechaCompra"::timestamp::date) >= CURRENT_DATE - INTERVAL '2 months'
  `;

  try {
    const result = await pool.query(query, values);

    const resumenSucursal = result.rows.map(row => {
      const bloque = row.bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      const ventasTotal = Number(row.ventastotal) * factor;
      const totalPagado = Number(row.totalpagado) * factor;
      const porcentajeRecuperado = ventasTotal > 0
        ? Math.round((totalPagado / ventasTotal) * 100)
        : 0;
      return {
        sucursal: row.Sucursal,
        alCorriente: Number(row.al_corriente),
        liquidado: Number(row.liquidado),
        vencido: Number(row.vencido),
        ventas: Number(row.ventas),
        ventasAdeudo: Number(row.ventasadeudo) * factor,
        cantidadPagada: Number(row.cantidadpagada) * factor,
        anticipo: Number(row.anticipo) * factor,
        totalPagado,
        ventasTotal,
        montoVencido: Number(row.montovencido) * factor,
        totalVencido: Number(row.vencido),
        porcentajeRecuperado,
      };
    });

    // Ordena de menor a mayor porcentaje recuperado
    res.json(
      resumenSucursal.sort((a, b) => a.porcentajeRecuperado - b.porcentajeRecuperado)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen por sucursal" });
  }
});

// ✅ Endpoint específico para el gráfico de pastel (incluye TODAS las sucursales)
app.get("/ventas/resumen-sucursal-completo", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "Sucursal",
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS al_corriente,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS liquidado,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS vencido,
      COUNT(*) AS ventas,
      MIN("Bloque") AS bloque
    FROM "ventas"
    ${whereClause}
    GROUP BY "Sucursal"
  `;

  try {
    const result = await pool.query(query, values);

    const resumenSucursalCompleto = result.rows.map(row => ({
      sucursal: row.Sucursal,
      alCorriente: Number(row.al_corriente),
      liquidado: Number(row.liquidado),
      vencido: Number(row.vencido),
      ventas: Number(row.ventas),
    }));

    res.json(resumenSucursalCompleto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen completo por sucursal" });
  }
});

app.get("/anios", async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT EXTRACT(YEAR FROM "FechaCompra") AS anio FROM "ventas" ORDER BY anio DESC');
    const anios = result.rows.map(r => Number(r.anio));
    res.json(anios);
  } catch (error) {
    res.status(500).send("Error al obtener años");
  }
});

app.get("/bloques", async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT "Bloque" FROM "ventas" ORDER BY "Bloque"');
    const bloques = result.rows.map(r => r.Bloque ? r.Bloque.toUpperCase() : '').filter(Boolean);
    res.json(bloques);
  } catch (error) {
    res.status(500).send("Error al obtener bloques");
  }
});

const BLOQUE_PAIS_MONEDA = {
  COL1: { pais: "Colombia", moneda: "COP" },
  COL2: { pais: "Colombia", moneda: "COP" },
  CRI1: { pais: "Costa Rica", moneda: "CRC" },
  CHI:  { pais: "Chile", moneda: "CLP" },
  HON:  { pais: "Honduras", moneda: "HNL" },
  ESP1: { pais: "España", moneda: "EUR" },
  ESP2: { pais: "España", moneda: "EUR" },
  BRA:  { pais: "Brasil", moneda: "BRL" },
  USA1: { pais: "USA", moneda: "USD" },
};

const TIPO_CAMBIO = {
  MXN: 1,
  COP: 0.004573,
  CRC: 0.037,
  CLP: 0.019,
  HNL: 0.71,
  EUR: 21.82,
  BRL: 3.36,
  USD: 18.75,
};

// ================= �️ ENDPOINT PARA LIMPIAR REGISTROS CON FECHA NULL =================
// ================= 📊 ENDPOINT PARA VERIFICAR REGISTROS CON FECHA NULL =================
app.get("/verificar-fechas-null", async (req, res) => {
  try {
    // Contar registros con FechaCompra null
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "ventas" 
      WHERE "FechaCompra" IS NULL;
    `;
    
    // Ver algunos ejemplos
    const examplesQuery = `
      SELECT "Vendedor", "Sucursal", "Bloque", "FechaCompra", "ID"
      FROM "ventas" 
      WHERE "FechaCompra" IS NULL
      LIMIT 5;
    `;
    
    const [countResult, examplesResult] = await Promise.all([
      pool.query(countQuery),
      pool.query(examplesQuery)
    ]);
    
    res.json({
      totalRegistrosConFechaNull: countResult.rows[0].total,
      ejemplos: examplesResult.rows,
      mensaje: `Hay ${countResult.rows[0].total} registros con FechaCompra null`
    });
    
  } catch (error) {
    console.error("❌ Error al verificar fechas null:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/limpiar-fechas-null", async (req, res) => {
  try {
    // 1. Primero contar cuántos registros hay
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "ventas" 
      WHERE "FechaCompra" IS NULL;
    `;
    
    const countResult = await pool.query(countQuery);
    const totalRegistros = countResult.rows[0].total;
    
    console.log(`🔍 Encontrados ${totalRegistros} registros con FechaCompra null`);
    
    if (totalRegistros === 0) {
      return res.json({ 
        mensaje: "No hay registros con FechaCompra null para eliminar",
        registrosEliminados: 0 
      });
    }
    
    // 2. Eliminar los registros
    const deleteQuery = `
      DELETE FROM "ventas" 
      WHERE "FechaCompra" IS NULL;
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    
    console.log(`🗑️ Eliminados ${deleteResult.rowCount} registros con FechaCompra null`);
    
    res.json({
      mensaje: `Se eliminaron ${deleteResult.rowCount} registros con FechaCompra null`,
      registrosEliminados: deleteResult.rowCount,
      totalEncontrados: totalRegistros
    });
    
  } catch (error) {
    console.error("❌ Error al limpiar registros con fecha null:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= �🔍 ENDPOINT DEBUG VENDEDORA ESPECÍFICA =================
app.get("/debug-vendedora/:nombre", async (req, res) => {
  const nombre = req.params.nombre;
  
  console.log("🔍 Debug vendedora:", nombre);
  
  try {
    // 1. Buscar todas las ventas de esta vendedora
    const ventasQuery = `
      SELECT "Vendedor", "Sucursal", "Bloque", "FechaCompra", "ID"
      FROM "ventas"
      WHERE "Vendedor" ILIKE $1
      ORDER BY "FechaCompra" DESC
      LIMIT 10;
    `;
    
    const ventas = await pool.query(ventasQuery, [`%${nombre}%`]);
    
    // 2. Buscar la última venta específicamente
    const ultimaVentaQuery = `
      WITH ultima_venta_por_vendedora AS (
        SELECT 
          "Vendedor",
          "Sucursal",
          "Bloque", 
          "FechaCompra",
          ROW_NUMBER() OVER (PARTITION BY "Vendedor" ORDER BY "FechaCompra" DESC, "ID" DESC) as rn
        FROM "ventas"
        WHERE "Vendedor" ILIKE $1
      )
      SELECT *
      FROM ultima_venta_por_vendedora
      WHERE rn = 1;
    `;
    
    const ultimaVenta = await pool.query(ultimaVentaQuery, [`%${nombre}%`]);
    
    // 3. Verificar el endpoint original
    const endpointQuery = `
      WITH ultima_venta_por_vendedora AS (
        SELECT 
          "Vendedor",
          "Sucursal",
          "Bloque", 
          "FechaCompra",
          ROW_NUMBER() OVER (PARTITION BY "Vendedor" ORDER BY "FechaCompra" DESC, "ID" DESC) as rn
        FROM "ventas"
      )
      SELECT
        "Vendedor" AS nombre,
        "Sucursal",
        "Bloque",
        "FechaCompra" AS fechaultima
      FROM ultima_venta_por_vendedora
      WHERE rn = 1 AND "Vendedor" ILIKE $1
      ORDER BY "FechaCompra" DESC NULLS LAST;
    `;
    
    const endpointResult = await pool.query(endpointQuery, [`%${nombre}%`]);
    
    res.json({
      vendedora: nombre,
      todasLasVentas: ventas.rows,
      ultimaVentaEspecifica: ultimaVenta.rows,
      resultadoEndpoint: endpointResult.rows,
      totalVentas: ventas.rows.length
    });
    
  } catch (error) {
    console.error("❌ Error en debug-vendedora:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/vendedoras-status", async (req, res) => {
  const { nombre } = req.query;
  let values = [];
  let idx = 1;

  console.log("🔍 Buscando vendedoras - parámetros:", { nombre });

  // Query mejorada: obtiene la última venta por vendedora con toda la información necesaria
  let whereClause = "";
  if (nombre) {
    whereClause = `WHERE "Vendedor" ILIKE $${idx++}`;
    values.push(`%${nombre}%`);
  }

  const query = `
    WITH ultima_venta_por_vendedora AS (
      SELECT 
        "Vendedor",
        "Sucursal",
        "Bloque", 
        "FechaCompra",
        ROW_NUMBER() OVER (PARTITION BY "Vendedor" ORDER BY "FechaCompra" DESC, "ID" DESC) as rn
      FROM "ventas"
      ${whereClause}
    )
    SELECT
      "Vendedor" AS nombre,
      "Sucursal",
      "Bloque",
      "FechaCompra" AS fechaultima
    FROM ultima_venta_por_vendedora
    WHERE rn = 1
    ORDER BY "FechaCompra" DESC NULLS LAST;
  `;

  try {
    console.log("📊 Ejecutando query vendedoras-status:", query);
    console.log("📊 Valores:", values);
    
    const result = await pool.query(query, values);
    
    console.log(`✅ Encontradas ${result.rows.length} vendedoras`);
    if (result.rows.length > 0) {
      console.log("📄 Primeras 3 vendedoras:", result.rows.slice(0, 3));
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en vendedoras-status:", err);
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// ✅ Endpoint para obtener detalles de sucursales por vendedora
app.get("/vendedoras-detalle-sucursales", async (req, res) => {
  const { nombre } = req.query;
  
  if (!nombre) {
    return res.status(400).json({ error: "Nombre de vendedora requerido" });
  }

  try {
    const query = `
      SELECT 
        "Sucursal" as sucursal,
        "Bloque" as bloque,
        COUNT(*)::integer as "totalRegistros",
        MAX("FechaCompra") as "ultimaFecha"
      FROM "ventas" 
      WHERE "Vendedor" ILIKE $1
      GROUP BY "Sucursal", "Bloque"
      ORDER BY "totalRegistros" DESC, "ultimaFecha" DESC
    `;
    
    const result = await pool.query(query, [`%${nombre}%`]);
    console.log(`Detalles para vendedora "${nombre}":`, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener detalle de sucursales:', err);
    res.status(500).json({ error: "Error al obtener detalle de sucursales" });
  }
});

// ✅ Endpoint para procesadores alerta (BORRA EL LOG INNECESARIO)
app.get("/cargos_auto/procesadores-alerta", async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const grupos = [
      { nombre: "STRIPE", palabras: ["stripe", "strupe"] },
      { nombre: "EFEVOO", palabras: ["efevoo"] },
      { nombre: "KUSHKI", palabras: ["kushki"] },
      { nombre: "NETPAY", palabras: ["netpay"] },
      { nombre: "PAYCODE", palabras: ["paycode"] },
      { nombre: "CLIP", palabras: ["clip"] },
      { nombre: "BANCOLOMBIA", palabras: ["bancolombia"] },
      { nombre: "BSD", palabras: ["bsd"] },
      { nombre: "CREDIBANCO", palabras: ["credibanco"] },
      { nombre: "TRANSBANK", palabras: ["transbank"] },
      { nombre: "MERCADO PAGO", palabras: ["mercado pago"] },
      { nombre: "SISTECREDITO", palabras: ["sistecredito"] },
    ];

    const normalizar = nombre =>
      (nombre || "").replace(/\s+/g, "").toLowerCase();

    // Excluye todos los que contienen "link de pago"
    const procesadoresResult = await pool.query(
      `SELECT "Cobrado_Por", MAX("Fecha"::timestamp::date) AS ultima_fecha
       FROM "cargos_auto"
       WHERE COALESCE("TotalMxn"::numeric, 0) > 0
       GROUP BY "Cobrado_Por"`
    );
    const todosProcesadores = procesadoresResult.rows
      .filter(proc => !normalizar(proc.Cobrado_Por).includes("linkdepago"))
      .map(proc => ({
        ...proc,
        norm: normalizar(proc.Cobrado_Por),
      }));

    // Agrupa procesadores por coincidencia en el nombre
    const gruposProcesadores = grupos.map(grupo => {
      const miembros = todosProcesadores.filter(proc =>
        grupo.palabras.some(palabra =>
          proc.norm.includes(normalizar(palabra))
        )
      );
      let ultima_fecha = null;
      let nombre_mostrar = grupo.nombre;
      if (miembros.length > 0) {
        miembros.forEach(proc => {
          if (!ultima_fecha || (proc.ultima_fecha && proc.ultima_fecha > ultima_fecha)) {
            ultima_fecha = proc.ultima_fecha;
            nombre_mostrar = proc.Cobrado_Por;
          }
        });
      }
      return {
        grupo: grupo.nombre,
        Cobrado_Por: nombre_mostrar,
        ultima_fecha,
      };
    });

    const procesadoresSinGrupo = todosProcesadores.filter(proc =>
      !grupos.some(grupo =>
        grupo.palabras.some(palabra =>
          proc.norm.includes(normalizar(palabra))
        )
      )
    ).map(proc => ({
      grupo: null,
      Cobrado_Por: proc.Cobrado_Por,
      ultima_fecha: proc.ultima_fecha,
    }));

    const todos = [...gruposProcesadores, ...procesadoresSinGrupo];

    // Calcula días sin cobro y filtra los que llevan entre 2 y 30 días sin cobrar
    const alerta = todos
      .map(proc => {
        if (!proc.ultima_fecha) return { ...proc, diasSinCobro: null };
        const fechaUltima = new Date(proc.ultima_fecha);
        const diffDias = Math.floor((hoy - fechaUltima) / (1000 * 60 * 60 * 24));
        return { ...proc, diasSinCobro: diffDias };
      })
      .filter(proc =>
        proc.diasSinCobro !== null &&
        proc.diasSinCobro >= 2 &&
        proc.diasSinCobro <= 30
      );

    res.json(alerta);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores inactivos" });
  }
});

app.get("/sucursal-bloque", async (req, res) => {
  const { bloque } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (bloque) {
    where.push(`v."Bloque" = $${idx++}`);
    values.push(bloque);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        v."Sucursal", 
        v."Bloque",
        COALESCE(us."slack", 'Sin asignar') as "nombre_slack"
      FROM "ventas" v
      LEFT JOIN "usuarios_slack" us ON us."sucursal" = v."Sucursal"
      ${whereClause} 
      ORDER BY v."Sucursal", v."Bloque"
    `, values);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error en sucursal-bloque:", err);
    res.status(500).json({ error: "Error al obtener sucursal-bloque" });
  }
});

app.get("/sucursales-alerta", async (req, res) => {
  try {
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // ✅ CONSULTA ULTRA-OPTIMIZADA: Window functions para mejor rendimiento
    const query = `
      WITH transacciones_filtradas AS (
        SELECT 
          "Sucursal",
          "Fecha",
          "Cobrado_Por",
          ROW_NUMBER() OVER (
            PARTITION BY "Sucursal" 
            ORDER BY "Fecha"::timestamp::date DESC
          ) as rn
        FROM "cargos_auto"
        WHERE "Sucursal" IS NOT NULL 
          AND COALESCE("TotalMxn"::numeric, 0) > 0
          AND "Cobrado_Por" IS NOT NULL
          AND NOT LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%linkdepago%'
          AND (
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%stripe%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%strupe%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%efevoo%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%kushki%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%netpay%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%paycode%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%bsd%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%wompi%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%stripeauto%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%FirstData Mexico%' OR
            LOWER(REPLACE("Cobrado_Por", ' ', '')) LIKE '%prosa%' 
            AND "Cobro" LIKE '%Cargos Automaticos%'
          )
      ),
      ultima_por_sucursal AS (
        SELECT 
          "Sucursal",
          "Fecha" as ultima_fecha,
          "Cobrado_Por" as ultimo_procesador
        FROM transacciones_filtradas
        WHERE rn = 1
      ),
      sucursales_con_alertas AS (
        SELECT 
          ups.*,
          (CURRENT_DATE - ups.ultima_fecha::timestamp::date) as dias_sin_actividad
        FROM ultima_por_sucursal ups
        WHERE (CURRENT_DATE - ups.ultima_fecha::timestamp::date) BETWEEN 2 AND 30
      ),
      ultima_venta_por_sucursal AS (
        SELECT 
          "Sucursal",
          MAX("FechaCompra"::timestamp::date) as ultima_venta
        FROM "ventas"
        WHERE "Sucursal" IS NOT NULL
        GROUP BY "Sucursal"
      )
      SELECT 
        sca."Sucursal",
        COALESCE(us."slack", 'Sin asignar') as nombre_slack,
        sca.ultima_fecha,
        sca.ultimo_procesador,
        sca.dias_sin_actividad,
        uvs.ultima_venta
      FROM sucursales_con_alertas sca
      LEFT JOIN "usuarios_slack" us ON us."sucursal" = sca."Sucursal"
      LEFT JOIN ultima_venta_por_sucursal uvs ON uvs."Sucursal" = sca."Sucursal"
      ORDER BY sca.dias_sin_actividad DESC
    `;

    const result = await pool.query(query);
    console.timeEnd("sucursales-alerta-query"); // 📊 Mostrar tiempo de consulta
    
    const alertas = result.rows.map(row => ({
      Sucursal: row.Sucursal,
      nombre_slack: row.nombre_slack,
      ultima_fecha: row.ultima_fecha,
      ultimo_procesador: row.ultimo_procesador,
      diasSinActividad: parseInt(row.dias_sin_actividad),
      ultima_venta: row.ultima_venta
    }));

    res.json(alertas);
  } catch (err) {
    console.error("Error en sucursales-alerta:", err);
    res.status(500).json({ error: "Error al obtener sucursales con alerta" });
  }
});

// ================= 🏢 DETALLE SUCURSAL - MODAL INFORMACIÓN =================
app.get("/sucursal-detalle/:sucursal", async (req, res) => {
  try {
    const { sucursal } = req.params;
    const { fecha_inicio, fecha_fin, filtro_estatus } = req.query;
    
    console.log(`🔍 Obteniendo detalle para sucursal: ${sucursal}`);
    
    // Configurar fechas por defecto (últimos 30 días) o usar las proporcionadas
    let whereClauseFecha = '';
    let fechaParams = [];
    let paramIndex = 2; // Empezamos en 2 porque $1 será la sucursal
    
    if (fecha_inicio && fecha_fin) {
      whereClauseFecha = `AND "FechaCompra" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      fechaParams = [fecha_inicio, fecha_fin];
      paramIndex += 2;
      console.log(`📅 Usando rango personalizado: ${fecha_inicio} - ${fecha_fin}`);
    } else {
      // Por defecto: últimos 90 días
      const fechaFin = new Date();
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 90);
      
      whereClauseFecha = `AND "FechaCompra" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      fechaParams = [fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]];
      paramIndex += 2;
      console.log(`📅 Usando últimos 90 días: ${fechaParams[0]} - ${fechaParams[1]}`);
    }

    // Configurar filtro de estatus
    let whereClauseEstatus = '';
    let filtroEstatusParams = [];
    const soloVencidos = filtro_estatus === 'vencidos' || !filtro_estatus; // Por defecto solo vencidos

    if (soloVencidos) {
      whereClauseEstatus = `AND "EstatusCobranza" = 'VENCIDO'`;
      console.log(`📊 Filtro: Solo paquetes VENCIDOS`);
    } else {
      console.log(`📊 Filtro: TODOS los paquetes`);
    }

    // Consulta para obtener información de TipoCobranza - CORREGIDA DINÁMICAMENTE
    const queryTipoCobranza = `
      WITH total_filtrado AS (
        SELECT COUNT(*) as total_paquetes_filtrados
        FROM "ventas"
        WHERE TRIM("Sucursal") = TRIM($1) 
          AND "TipoCobranza" IS NOT NULL
          ${whereClauseFecha}
          ${whereClauseEstatus}
      )
      SELECT 
        "TipoCobranza",
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / NULLIF(tf.total_paquetes_filtrados, 0)), 2) as porcentaje
      FROM "ventas", total_filtrado tf
      WHERE TRIM("Sucursal") = TRIM($1) 
        AND "TipoCobranza" IS NOT NULL
        ${whereClauseFecha}
        ${whereClauseEstatus}
      GROUP BY "TipoCobranza", tf.total_paquetes_filtrados
      ORDER BY cantidad DESC
    `;

    // Consulta para obtener comentarios más frecuentes
    const queryComentarios = `
      WITH comentarios_expandidos AS (
        SELECT 
          TRIM(unnest(string_to_array(
            REPLACE(
              REPLACE("Comentarios", '/', ','), 
              'COMPLEMENTAR PAPELERIA:', ''
            ), 
            ','
          ))) as comentario_individual
        FROM "ventas"
        WHERE TRIM("Sucursal") = TRIM($1)
          AND "Comentarios" IS NOT NULL 
          AND "Comentarios" != ''
          ${whereClauseFecha}
          ${whereClauseEstatus}
      ),
      comentarios_limpios AS (
        SELECT 
          REPLACE(comentario_individual, 'REVISION:', '') as comentario_final,
          COUNT(*) as frecuencia
        FROM comentarios_expandidos
        WHERE LENGTH(TRIM(comentario_individual)) > 0
          AND TRIM(comentario_individual) != 'COMPLEMENTAR PAPELERIA'
          AND TRIM(comentario_individual) != 'REVISION'
        GROUP BY REPLACE(comentario_individual, 'REVISION:', '')
      )
      SELECT 
        TRIM(comentario_final) as comentario,
        frecuencia,
        ROUND((frecuencia * 100.0 / SUM(frecuencia) OVER()), 2) as porcentaje
      FROM comentarios_limpios
      WHERE LENGTH(TRIM(comentario_final)) > 0
      ORDER BY frecuencia DESC
    `;    // Consulta para totales generales de la sucursal
    const queryTotales = `
      SELECT 
        COUNT(*) as total_paquetes,
        SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN 1 ELSE 0 END) as total_vencidos,
        SUM(CASE WHEN "EstatusCobranza" = 'LIQUIDADO' THEN 1 ELSE 0 END) as total_liquidados,
        SUM(CASE WHEN "EstatusCobranza" = 'AL CORRIENTE' THEN 1 ELSE 0 END) as total_corriente,
        ROUND((SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as porcentaje_vencidos,
        ROUND((SUM(CASE WHEN "EstatusCobranza" = 'LIQUIDADO' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as porcentaje_liquidados,
        ROUND((SUM(CASE WHEN "EstatusCobranza" = 'AL CORRIENTE' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as porcentaje_corriente
      FROM "ventas"
      WHERE TRIM("Sucursal") = TRIM($1)
        ${whereClauseFecha}
    `;

    // Consulta para obtener las tarjetas más usadas (BINs) - CORREGIDA DINÁMICAMENTE
    const queryTopTarjetas = `
      WITH total_filtrado AS (
        SELECT COUNT(*) as total_paquetes_filtrados
        FROM "ventas"
        WHERE TRIM("Sucursal") = TRIM($1)
          AND "Tarjeta" IS NOT NULL 
          AND "Tarjeta" != ''
          AND LENGTH("Tarjeta") >= 6
          ${whereClauseFecha}
          ${whereClauseEstatus}
      )
      SELECT 
        SUBSTRING("Tarjeta", 1, 6) as bin,
        COUNT(*) as cantidad_paquetes,
        ROUND((COUNT(*) * 100.0 / NULLIF(tf.total_paquetes_filtrados, 0)), 2) as porcentaje
      FROM "ventas", total_filtrado tf
      WHERE TRIM("Sucursal") = TRIM($1)
        AND "Tarjeta" IS NOT NULL 
        AND "Tarjeta" != ''
        AND LENGTH("Tarjeta") >= 6
        ${whereClauseFecha}
        ${whereClauseEstatus}
      GROUP BY SUBSTRING("Tarjeta", 1, 6), tf.total_paquetes_filtrados
      HAVING COUNT(*) >= 1
      ORDER BY cantidad_paquetes DESC
    `;

    // Parámetros para todas las consultas
    const queryParams = [sucursal, ...fechaParams, ...filtroEstatusParams];

    // Debug básico
    console.log(`🔍 [DEBUG] Procesando detalle para ${sucursal} [${filtroEstatusParams.length > 0 ? 'filtrado' : 'todos'}]`);

    // Ejecutar todas las consultas en paralelo
    const [resultTipoCobranza, resultComentarios, resultTotales, resultTopTarjetas] = await Promise.all([
      pool.query(queryTipoCobranza, queryParams),
      pool.query(queryComentarios, queryParams),
      pool.query(queryTotales, queryParams),
      pool.query(queryTopTarjetas, queryParams)
    ]);

    // Buscar información de banco para cada BIN único - OPTIMIZADO
    const binsConBanco = [];
    
    // Si hay resultados de tarjetas, hacer una sola consulta para obtener todos los bancos
    if (resultTopTarjetas.rows.length > 0) {
      const bins = resultTopTarjetas.rows.map(row => row.bin);
      
      // Consulta optimizada para obtener info de banco de múltiples BINs
      const bancosResult = await pool.query(`
        SELECT DISTINCT ON (bins_to_check.target_bin) 
          bins_to_check.target_bin,
          bc.banco,
          bc.tipo,
          bc.marca
        FROM (
          SELECT unnest($1::text[]) as target_bin
        ) bins_to_check
        LEFT JOIN bins_cache bc ON (
          bc.bin = bins_to_check.target_bin
          OR bins_to_check.target_bin LIKE bc.bin || '%'
          OR LEFT(bc.bin, 4) = LEFT(bins_to_check.target_bin, 4)
        )
        ORDER BY bins_to_check.target_bin, 
                 CASE 
                   WHEN bc.bin = bins_to_check.target_bin THEN 1
                   WHEN bins_to_check.target_bin LIKE bc.bin || '%' THEN 2
                   WHEN LEFT(bc.bin, 4) = LEFT(bins_to_check.target_bin, 4) THEN 3
                   ELSE 4
                 END
      `, [bins]);

      // Crear mapa de BINs a info de banco
      const bancoMap = {};
      bancosResult.rows.forEach(row => {
        if (!bancoMap[row.target_bin]) {
          bancoMap[row.target_bin] = {
            banco: row.banco || 'Banco no identificado',
            tipo: row.tipo || 'N/A',
            marca: row.marca || 'N/A'
          };
        }
      });

      // Construir resultado final
      resultTopTarjetas.rows.forEach(row => {
        const bancoInfo = bancoMap[row.bin] || {
          banco: 'Banco no identificado',
          tipo: 'N/A',
          marca: 'N/A'
        };

        binsConBanco.push({
          bin: row.bin,
          cantidadPaquetes: parseInt(row.cantidad_paquetes),
          porcentaje: parseFloat(row.porcentaje),
          banco: bancoInfo.banco,
          tipo: bancoInfo.tipo,
          marca: bancoInfo.marca
        });
      });
    }

    // Debug optimizado
    console.log(`🔍 BINs únicos: ${resultTopTarjetas.rows.length}, Con banco: ${binsConBanco.length}`);

    // Debug para verificar cálculos con consultas de verificación
    const debugQueryTotal = `
      SELECT 
        COUNT(*) as total_general,
        COUNT(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN 1 END) as total_vencidos_general,
        COUNT(CASE WHEN "Tarjeta" IS NOT NULL AND "Tarjeta" != '' AND LENGTH("Tarjeta") >= 6 THEN 1 END) as total_con_tarjeta,
        COUNT(CASE WHEN "EstatusCobranza" = 'VENCIDO' AND "Tarjeta" IS NOT NULL AND "Tarjeta" != '' AND LENGTH("Tarjeta") >= 6 THEN 1 END) as total_vencidos_con_tarjeta
      FROM "ventas"
      WHERE TRIM("Sucursal") = TRIM($1)
        ${whereClauseFecha}
    `;
    
    const debugResult = await pool.query(debugQueryTotal, queryParams);
    const debug = debugResult.rows[0];
    
    console.log(`📊 [DEBUG DETALLADO] Sucursal: ${sucursal}`);
    console.log(`📊 [DEBUG DETALLADO] Filtro aplicado: ${soloVencidos ? 'Solo VENCIDOS' : 'TODOS los paquetes'}`);
    console.log(`📊 [DEBUG DETALLADO] Total general: ${debug.total_general}`);
    console.log(`📊 [DEBUG DETALLADO] Total vencidos: ${debug.total_vencidos_general}`);
    console.log(`📊 [DEBUG DETALLADO] Total con tarjeta: ${debug.total_con_tarjeta}`);
    console.log(`📊 [DEBUG DETALLADO] Total vencidos con tarjeta: ${debug.total_vencidos_con_tarjeta}`);
    
    const totalEsperadoParaCalculo = soloVencidos ? debug.total_vencidos_con_tarjeta : debug.total_con_tarjeta;
    console.log(`📊 [DEBUG DETALLADO] Total esperado para % de BINs: ${totalEsperadoParaCalculo}`);

    const detalleSucursal = {
      sucursal: sucursal,
      periodo: {
        fechaInicio: fechaParams[0],
        fechaFin: fechaParams[1],
        esUltimos90Dias: !fecha_inicio && !fecha_fin
      },
      filtros: {
        soloVencidos: soloVencidos,
        tipoFiltro: soloVencidos ? 'vencidos' : 'todos'
      },
      tipoCobranza: resultTipoCobranza.rows.map(row => ({
        tipo: row.TipoCobranza,
        cantidad: parseInt(row.cantidad),
        porcentaje: parseFloat(row.porcentaje)
      })),
      comentariosFrecuentes: resultComentarios.rows.map(row => ({
        comentario: row.comentario,
        frecuencia: parseInt(row.frecuencia),
        porcentaje: parseFloat(row.porcentaje)
      })),
      topTarjetas: binsConBanco.map(tarjeta => ({
        bin: tarjeta.bin,
        banco: tarjeta.banco,
        tipo: tarjeta.tipo,
        marca: tarjeta.marca,
        cantidadTransacciones: tarjeta.cantidadPaquetes,
        porcentaje: tarjeta.porcentaje
      })),
      totales: {
        totalPaquetes: parseInt(resultTotales.rows[0]?.total_paquetes || 0),
        totalVencidos: parseInt(resultTotales.rows[0]?.total_vencidos || 0),
        totalLiquidados: parseInt(resultTotales.rows[0]?.total_liquidados || 0),
        totalCorriente: parseInt(resultTotales.rows[0]?.total_corriente || 0),
        porcentajeVencidos: parseFloat(resultTotales.rows[0]?.porcentaje_vencidos || 0),
        porcentajeLiquidados: parseFloat(resultTotales.rows[0]?.porcentaje_liquidados || 0),
        porcentajeCorriente: parseFloat(resultTotales.rows[0]?.porcentaje_corriente || 0)
      }
    };

    console.log(`✅ Detalle obtenido para ${sucursal}: ${detalleSucursal.tipoCobranza.length} tipos, ${detalleSucursal.comentariosFrecuentes.length} comentarios, ${binsConBanco.length} tarjetas`);
    res.json(detalleSucursal);

  } catch (err) {
    console.error(`❌ Error obteniendo detalle de sucursal ${req.params.sucursal}:`, err);
    res.status(500).json({ error: "Error al obtener detalle de sucursal" });
  }
});

app.get("/cargos_auto/procesadores", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Cobrado_Por" FROM "cargos_auto" WHERE "Cobrado_Por" IS NOT NULL ORDER BY "Cobrado_Por"`
    );
    res.json(result.rows.map(r => r.Cobrado_Por).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores" });
  }
});

app.get("/aclaraciones/procesadores", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "procesador" FROM "aclaraciones" WHERE "procesador" IS NOT NULL ORDER BY "procesador"`
    );
    res.json(result.rows.map(r => r.procesador).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores de aclaraciones" });
  }
});

app.get("/aclaraciones/sucursales", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "sucursal" FROM "aclaraciones" WHERE "sucursal" IS NOT NULL ORDER BY "sucursal"`
    );
    res.json(result.rows.map(r => r.sucursal).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sucursales de aclaraciones" });
  }
});

// Endpoint para obtener vendedoras desde la tabla ventas
app.get("/aclaraciones/vendedoras", protegerDatos, async (req, res) => {
  try {
    console.log('🔍 Iniciando consulta de vendedoras...');
    
    const result = await pool.query(
      `SELECT DISTINCT UPPER(TRIM("Vendedor")) as vendedor FROM "ventas" 
       WHERE "Vendedor" IS NOT NULL 
       AND TRIM("Vendedor") != ''
       AND LENGTH(TRIM("Vendedor")) > 1
       ORDER BY UPPER(TRIM("Vendedor"))`
    );
    
    console.log(`📊 Registros brutos desde DB: ${result.rows.length}`);
    
    // Filtrar y limpiar los resultados, eliminando duplicados
    const vendedoras = Array.from(new Set(
      result.rows
        .map(r => r.vendedor ? r.vendedor.trim().toUpperCase() : '')
        .filter(v => v && v.length > 1)
    )).sort(); // Ordenar alfabéticamente A-Z
    
    console.log(`✅ Vendedoras únicas procesadas: ${vendedoras.length}`);
    console.log(`📋 Primeras 5: ${JSON.stringify(vendedoras.slice(0, 5))}`);
    console.log(`📋 Últimas 5: ${JSON.stringify(vendedoras.slice(-5))}`);
    
    res.json(vendedoras);
  } catch (err) {
    console.error("❌ Error al obtener vendedoras:", err);
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// Endpoint para obtener bloques desde la tabla ventas
app.get("/aclaraciones/bloques", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Bloque" FROM "ventas" 
       WHERE "Bloque" IS NOT NULL 
       AND "Bloque" != ''
       ORDER BY "Bloque" 
       LIMIT 100`
    );
    res.json(result.rows.map(r => r.Bloque ? r.Bloque.toUpperCase() : '').filter(Boolean));
  } catch (err) {
    console.error("Error al obtener bloques:", err);
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// Endpoint para obtener comentarios comunes desde aclaraciones
app.get("/aclaraciones/comentarios-comunes", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "comentarios", COUNT(*) as frecuencia
       FROM "aclaraciones" 
       WHERE "comentarios" IS NOT NULL 
       AND "comentarios" != '' 
       AND "comentarios" != 'ND'
       GROUP BY "comentarios"
       ORDER BY frecuencia DESC, "comentarios"
       LIMIT 50`
    );
    res.json(result.rows.map(r => r.comentarios).filter(Boolean));
  } catch (err) {
    console.error("Error al obtener comentarios comunes:", err);
    res.status(500).json({ error: "Error al obtener comentarios comunes" });
  }
});

// Endpoint para obtener opciones de captura CC desde aclaraciones
app.get("/aclaraciones/captura-cc", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "captura_cc" FROM "aclaraciones" 
       WHERE "captura_cc" IS NOT NULL 
       AND "captura_cc" != ''
       ORDER BY "captura_cc"
       LIMIT 20`
    );
    res.json(result.rows.map(r => r.captura_cc).filter(Boolean));
  } catch (err) {
    console.error("Error al obtener opciones de captura CC:", err);
    res.status(500).json({ error: "Error al obtener opciones de captura CC" });
  }
});

// Endpoint para estadísticas generales del dashboard
app.get("/estadisticas-generales", protegerDatos, async (req, res) => {
  try {
    const [aclaracionesResult, cargosResult, cajaResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM "aclaraciones"'),
      pool.query('SELECT COUNT(*) as total FROM "cargos_auto"'),
      pool.query('SELECT COUNT(*) as total FROM "caja"')
    ]);

    const estadisticas = {
      totalAclaraciones: parseInt(aclaracionesResult.rows[0]?.total || 0),
      totalRecuperacion: 0, // Este valor puede calcularse según tus necesidades
      totalCargosAuto: parseInt(cargosResult.rows[0]?.total || 0),
      totalCaja: parseInt(cajaResult.rows[0]?.total || 0)
    };

    res.json(estadisticas);
  } catch (err) {
    console.error("Error al obtener estadísticas generales:", err);
    res.status(500).json({ 
      error: "Error al obtener estadísticas",
      totalAclaraciones: 0, 
      totalRecuperacion: 0, 
      totalCargosAuto: 0, 
      totalCaja: 0 
    });
  }
});

// Endpoint para obtener sucursales desde la tabla ventas  
app.get("/aclaraciones/sucursales-ventas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Sucursal" FROM "ventas" WHERE "Sucursal" IS NOT NULL ORDER BY "Sucursal"`
    );
    res.json(result.rows.map(r => r.Sucursal ? r.Sucursal.toUpperCase() : '').filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sucursales desde ventas" });
  }
});

// Endpoint para obtener bloques desde la tabla ventas
app.get("/aclaraciones/bloques", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Bloque" FROM "ventas" WHERE "Bloque" IS NOT NULL ORDER BY "Bloque"`
    );
    res.json(result.rows.map(r => r.Bloque ? r.Bloque.toUpperCase() : '').filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// Endpoint para obtener comentarios únicos desde la tabla aclaraciones
app.get("/aclaraciones/comentarios", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "comentarios" FROM "aclaraciones" WHERE "comentarios" IS NOT NULL AND "comentarios" != '' ORDER BY "comentarios"`
    );
    res.json(result.rows.map(r => r.comentarios).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});

// Endpoint para obtener valores únicos de captura_cc desde la tabla aclaraciones
app.get("/aclaraciones/captura-cc", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "captura_cc" FROM "aclaraciones" WHERE "captura_cc" IS NOT NULL AND "captura_cc" != '' ORDER BY "captura_cc"`
    );
    res.json(result.rows.map(r => r.captura_cc).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener valores de captura CC" });
  }
});

// Endpoint para actualizar registros de aclaraciones
app.put("/aclaraciones/actualizar", protegerDatos, async (req, res) => {
  try {
    const { registros } = req.body;
    
    console.log("🔄 Recibida solicitud de actualización de aclaraciones");
    console.log("📊 Número de registros a actualizar:", registros?.length || 0);
    
    if (!registros || !Array.isArray(registros)) {
      return res.status(400).json({ error: "Se requiere un array de registros" });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log("✅ Transacción iniciada");
      
      const resultados = [];
      
      for (const registro of registros) {
        const { id_original, datos_nuevos } = registro;
        
        console.log("🔍 Procesando registro:", {
          id_transaccion: id_original?.id_de_transaccion,
          num_tarjeta: id_original?.num_de_tarjeta,
          campos_a_actualizar: Object.keys(datos_nuevos || {})
        });
        
        if (!id_original || !datos_nuevos) {
          console.log("⚠️ Registro omitido: falta id_original o datos_nuevos");
          continue;
        }
        
        // Construir la query de UPDATE dinámicamente
        const camposActualizar = [];
        const valores = [];
        let contador = 1;
        
        // Recorrer los campos que se van a actualizar
        for (const [campo, valor] of Object.entries(datos_nuevos)) {
          if (valor !== null && valor !== undefined) {
            // Validar y formatear campos especiales
            let valorFormateado = valor;
            
            // Campos de fecha: si están vacíos, establecer como NULL
            const camposFecha = ['fecha_venta', 'fecha_contrato', 'fecha_de_peticion', 'fecha_de_respuesta'];
            if (camposFecha.includes(campo)) {
              if (valor === '' || valor === null || valor === undefined) {
                valorFormateado = null;
              } else {
                // 🗓️ Manejo especial para fechas formato DD/MM/YYYY
                if (typeof valor === 'string' && valor.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                  // Convertir DD/MM/YYYY a YYYY-MM-DD para PostgreSQL
                  const [dia, mes, anio] = valor.split('/');
                  valorFormateado = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                  console.log(`📅 Fecha convertida: ${valor} -> ${valorFormateado}`);
                } else {
                  // Validar formato de fecha
                  const fechaValida = new Date(valor);
                  if (isNaN(fechaValida.getTime())) {
                    console.warn(`Fecha inválida para campo ${campo}: ${valor}`);
                    continue; // Saltar este campo si la fecha no es válida
                  }
                  valorFormateado = valor;
                }
              }
            }
            
            // Campos numéricos: convertir strings vacíos a NULL
            const camposNumericos = ['monto', 'monto_mnx', 'año'];
            if (camposNumericos.includes(campo)) {
              if (valor === '' || valor === null || valor === undefined) {
                valorFormateado = null;
              } else {
                // Validar que sea un número
                const numeroValido = parseFloat(valor);
                if (isNaN(numeroValido)) {
                  console.warn(`Número inválido para campo ${campo}: ${valor}`);
                  continue; // Saltar este campo si no es un número válido
                }
                valorFormateado = valor;
              }
            }
            
            // Campos booleanos para EUROSKIN
            if (campo === 'euroskin') {
              if (valor === '' || valor === null || valor === undefined) {
                valorFormateado = null;
              } else {
                valorFormateado = valor;
              }
            }
            
            camposActualizar.push(`"${campo}" = $${contador}`);
            valores.push(valorFormateado);
            contador++;
          }
        }
        
        if (camposActualizar.length === 0) {
          continue;
        }
        
        // Agregar el ID original para la condición WHERE
        valores.push(id_original.id_de_transaccion);
        valores.push(id_original.num_de_tarjeta);
        
        const updateQuery = `
          UPDATE "aclaraciones" 
          SET ${camposActualizar.join(', ')}
          WHERE "id_de_transaccion" = $${contador} 
          AND "num_de_tarjeta" = $${contador + 1}
        `;
        
        console.log("🔧 Query a ejecutar:", updateQuery);
        console.log("📝 Valores:", valores);
        
        // Debug: Verificar si el registro existe
        const debugQuery = `
          SELECT COUNT(*) as count
          FROM "aclaraciones" 
          WHERE "id_de_transaccion" = $1 
          AND "num_de_tarjeta" = $2
        `;
        const debugResult = await client.query(debugQuery, [
          id_original.id_de_transaccion,
          id_original.num_de_tarjeta
        ]);
        console.log("🔍 Debug - Registro encontrado:", debugResult.rows[0]);
        
        // Debug adicional: buscar registros similares
        if (debugResult.rows[0].count === 0) {
          console.log("🔍 No se encontró registro exacto. Buscando similares...");
          
          // Buscar por ID de transacción únicamente
          const similarQuery = `
            SELECT "id_de_transaccion", "num_de_tarjeta", "fecha_venta"
            FROM "aclaraciones" 
            WHERE "id_de_transaccion" = $1 
            LIMIT 3
          `;
          const similarResult = await client.query(similarQuery, [id_original.id_de_transaccion]);
          console.log("🔍 Debug - Registros con mismo ID transacción:", similarResult.rows);
          
          // Buscar por número de tarjeta
          const tarjetaQuery = `
            SELECT "id_de_transaccion", "num_de_tarjeta", "fecha_venta"
            FROM "aclaraciones" 
            WHERE "num_de_tarjeta" = $1 
            LIMIT 3
          `;
          const tarjetaResult = await client.query(tarjetaQuery, [id_original.num_de_tarjeta]);
          console.log("🔍 Debug - Registros con mismo num tarjeta:", tarjetaResult.rows);
        }
        
        const result = await client.query(updateQuery, valores);
        
        console.log("✅ Query ejecutada. Filas afectadas:", result.rowCount);
        
        resultados.push({
          id_original,
          actualizado: result.rowCount > 0,
          filas_afectadas: result.rowCount
        });
      }
      
      await client.query('COMMIT');
      console.log("💾 Transacción confirmada (COMMIT)");
      
      res.json({
        success: true,
        registros_procesados: resultados.length,
        resultados
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("❌ Error al actualizar aclaraciones:", error);
    res.status(500).json({ error: "Error al actualizar registros" });
  }
});

// ===== ENDPOINTS PARA GESTIÓN DE USUARIOS SLACK =====

// Obtener todos los usuarios slack
app.get("/usuarios-slack", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM "usuarios_slack" 
      ORDER BY "sucursal"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener usuarios slack:", err);
    res.status(500).json({ error: "Error al obtener usuarios slack" });
  }
});

// Crear o actualizar usuario slack
app.post("/usuarios-slack", async (req, res) => {
  try {
    const { sucursal, slack } = req.body;
    
    if (!sucursal || !slack) {
      return res.status(400).json({ error: "Sucursal y slack son requeridos" });
    }
    
    const result = await pool.query(`
      INSERT INTO "usuarios_slack" ("sucursal", "slack")
      VALUES ($1, $2)
      ON CONFLICT ("sucursal") 
      DO UPDATE SET 
        "slack" = EXCLUDED."slack"
      RETURNING *
    `, [sucursal, slack]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al crear/actualizar usuario slack:", err);
    res.status(500).json({ error: "Error al crear/actualizar usuario slack" });
  }
});

// Insertar múltiples usuarios slack desde Excel
app.post("/usuarios-slack/bulk", async (req, res) => {
  try {
    const { usuarios } = req.body;
    
    if (!usuarios || !Array.isArray(usuarios)) {
      return res.status(400).json({ error: "Se requiere un array de usuarios" });
    }

    const results = [];
    for (const usuario of usuarios) {
      const { sucursal, slack } = usuario;
      
      if (!sucursal || !slack) {
        console.log(`Saltando usuario sin datos completos:`, usuario);
        continue;
      }
      
      const result = await pool.query(`
        INSERT INTO "usuarios_slack" ("sucursal", "slack")
        VALUES ($1, $2)
        ON CONFLICT ("sucursal") 
        DO UPDATE SET 
          "slack" = EXCLUDED."slack"
        RETURNING *
      `, [sucursal, slack]);
      
      results.push(result.rows[0]);
    }
    
    res.json({ 
      message: `${results.length} usuarios procesados correctamente`,
      usuarios: results 
    });
  } catch (err) {
    console.error("Error en inserción masiva usuarios slack:", err);
    res.status(500).json({ error: "Error en inserción masiva" });
  }
});

// Eliminar usuario slack
app.delete("/usuarios-slack/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM "usuarios_slack" WHERE "id" = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar usuario slack:", err);
    res.status(500).json({ error: "Error al eliminar usuario slack" });
  }
});

// ===== FIN ENDPOINTS USUARIOS SLACK =====

// Configuración de validaciones por tipo de tabla
const validacionesPorTipo = {
  EFEVOO: {
    nombre: "EFEVOO",
    camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION"],
    validaciones: {
      ID_DE_TRANSACCION: { tipo: "numerico", minLength: 8, maxLength: 20 },
      AUTORIZACION: { tipo: "alfanumerico", minLength: 6, maxLength: 12 },
      MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
      NUM_DE_TARJETA: { tipo: "numerico", exactLength: [4, 6, 16] }
    }
  },
  BSD: {
    nombre: "BSD",
    camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "NUM_DE_TARJETA"],
    validaciones: {
      ID_DE_TRANSACCION: { tipo: "alfanumerico", minLength: 10, maxLength: 25 },
      NUM_DE_TARJETA: { tipo: "numerico", exactLength: [16] },
      MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
      CAPTURA_CC: { tipo: "boolean" }
    }
  },
  CREDOMATIC: {
    nombre: "CREDOMATIC",
    camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION", "NUM_DE_TARJETA"],
    validaciones: {
      ID_DE_TRANSACCION: { tipo: "alfanumerico", minLength: 12, maxLength: 30 },
      AUTORIZACION: { tipo: "numerico", exactLength: [6, 8] },
      NUM_DE_TARJETA: { tipo: "numerico", exactLength: [16] },
      MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
      NO_DE_CASO: { tipo: "alfanumerico", minLength: 8, maxLength: 20 }
    }
  }
};

// Función para validar campo según tipo de tabla en el backend
function validarCampoBackend(campo, valor, tipoTabla) {
  if (!valor || valor.toString().trim() === "") return null;
  
  const config = validacionesPorTipo[tipoTabla];
  if (!config || !config.validaciones[campo]) return null;
  
  const validacion = config.validaciones[campo];
  const valorStr = valor.toString().trim();
  
  switch (validacion.tipo) {
    case "numerico":
      if (!/^\d+$/.test(valorStr)) {
        return `${campo}: Debe contener solo números`;
      }
      if (validacion.exactLength) {
        if (!validacion.exactLength.includes(valorStr.length)) {
          return `${campo}: Debe tener ${validacion.exactLength.join(" o ")} dígitos`;
        }
      }
      if (validacion.minLength && valorStr.length < validacion.minLength) {
        return `${campo}: Mínimo ${validacion.minLength} dígitos`;
      }
      if (validacion.maxLength && valorStr.length > validacion.maxLength) {
        return `${campo}: Máximo ${validacion.maxLength} dígitos`;
      }
      break;
      
    case "alfanumerico":
      if (!/^[a-zA-Z0-9]+$/.test(valorStr)) {
        return `${campo}: Solo se permiten letras y números`;
      }
      if (validacion.minLength && valorStr.length < validacion.minLength) {
        return `${campo}: Mínimo ${validacion.minLength} caracteres`;
      }
      if (validacion.maxLength && valorStr.length > validacion.maxLength) {
        return `${campo}: Máximo ${validacion.maxLength} caracteres`;
      }
      break;
      
    case "decimal":
      const num = parseFloat(valorStr);
      if (isNaN(num)) {
        return `${campo}: Debe ser un número válido`;
      }
      if (validacion.min && num < validacion.min) {
        return `${campo}: Mínimo ${validacion.min}`;
      }
      if (validacion.max && num > validacion.max) {
        return `${campo}: Máximo ${validacion.max}`;
      }
      break;
      
    case "boolean":
      if (!["true", "false", "sí", "no", "si", "1", "0"].includes(valorStr.toLowerCase())) {
        return `${campo}: Debe ser Sí o No`;
      }
      break;
  }
  
  return null;
}

// Endpoint para insertar múltiples registros de aclaraciones con validación por tipo



app.post("/aclaraciones/insertar-multiple", async (req, res) => {
  try {
    const { datos, tipoTabla } = req.body;

    console.log(`🔍 DEBUG - Datos recibidos:`, {
      cantidadDatos: datos ? datos.length : 0,
      tipoTabla,
      primeraFila: datos && datos.length > 0 ? datos[0] : null
    });

    if (!datos || !Array.isArray(datos) || datos.length === 0) {
     
 
      return res.status(400).json({ error: "No se proporcionaron datos válidos" });
    }

    const datosValidos = datos.filter(fila =>
      Object.values(fila).some(valor => {
        if (valor === null || valor === undefined) return false;
        if (typeof valor === "string" && valor.trim() === "") return false;
        return true;
      })
    );

    if (datosValidos.length === 0) {
      return res.status(400).json({ error: "No hay datos válidos para insertar" });
    }

    let registrosInsertados = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const errores = [];

      for (const fila of datosValidos) {
        try {
          const montoOriginal = fila.MONTO ? parseFloat(fila.MONTO) : null;
          const bloque = fila.BLOQUE ? fila.BLOQUE.toUpperCase() : "";

          const tiposCambio = {
            "COL1": 0.004573,
            "COL2": 0.004573,
            "CRI1": 0.037,
            "CHI": 0.019,
            "HON": 0.71,
            "ESP1": 21.82,
            "ESP2": 21.82,
            "BRA": 3.36,
            "USA1": 18.75
          };

          let montoMnx = null;
          if (montoOriginal !== null) {
            if (bloque === "MEX" || bloque.includes("SIN") || bloque.includes("MTY")) {
              montoMnx = montoOriginal;
            } else {
              const tipoCambio = tiposCambio[bloque] || 1;
              montoMnx = montoOriginal * tipoCambio;
            }
          }

          const formatearFecha = fecha => {
            if (!fecha) return null;
            const f = moment(fecha, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
            return f.isValid() ? f.format("YYYY-MM-DD") : null;
          };

          const valores = {
            procesador: fila.PROCESADOR || null,
            año: fila.AÑO || null,
            mes_peticion: fila.MES_PETICION || null,
            euroskin: String(fila.EUROSKIN).toLowerCase() === "true",
            id_del_comercio_afiliacion: fila.ID_DEL_COMERCIO_AFILIACION || null,
            nombre_del_comercio: fila.NOMBRE_DEL_COMERCIO || null,
            id_de_transaccion: fila.ID_DE_TRANSACCION || null,
            fecha_venta: formatearFecha(fila.FECHA_VENTA),
            monto: montoOriginal ?? null,
            num_de_tarjeta: fila.NUM_DE_TARJETA || null,
            autorizacion: fila.AUTORIZACION || null,
            cliente: fila.CLIENTE || null,
            vendedora: fila.VENDEDORA || null,
            sucursal: fila.SUCURSAL || null,
            fecha_contrato: formatearFecha(fila.FECHA_CONTRATO),
            paquete: fila.PAQUETE || null,
            bloque: fila.BLOQUE || null,
            fecha_de_peticion: formatearFecha(fila.FECHA_DE_PETICION),
            fecha_de_respuesta: formatearFecha(fila.FECHA_DE_RESPUESTA),
            comentarios: fila.COMENTARIOS || null,
            captura_cc: fila.CAPTURA_CC || null,
            monto_mnx: montoMnx
          };

          await client.query(`
            INSERT INTO aclaraciones (
              procesador, año, mes_peticion, euroskin,
              id_del_comercio_afiliacion, nombre_del_comercio,
              id_de_transaccion, fecha_venta, monto, num_de_tarjeta,
              autorizacion, cliente, vendedora, sucursal,
              fecha_contrato, paquete, bloque, fecha_de_peticion,
              fecha_de_respuesta, comentarios, captura_cc, monto_mnx
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18,
              $19, $20, $21, $22
            )
          `, [
            valores.procesador, valores.año, valores.mes_peticion, valores.euroskin,
            valores.id_del_comercio_afiliacion, valores.nombre_del_comercio,
            valores.id_de_transaccion, valores.fecha_venta, valores.monto, valores.num_de_tarjeta,
            valores.autorizacion, valores.cliente, valores.vendedora, valores.sucursal,
            valores.fecha_contrato, valores.paquete, valores.bloque, valores.fecha_de_peticion,
            valores.fecha_de_respuesta, valores.comentarios, valores.captura_cc, valores.monto_mnx
          ]);

          registrosInsertados++;
        } catch (error) {
          errores.push({ fila: fila, mensaje: error.message });
        }
      }

      await client.query('COMMIT');

      if (errores.length > 0) {
        return res.status(207).json({
          mensaje: `${registrosInsertados} registros insertados con éxito, ${errores.length} errores`,
          errores
        });
      } else {
        res.json({ mensaje: `${registrosInsertados} registros insertados correctamente.` });
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ Error general en la transacción:", err.message);
      res.status(500).json({ error: "Error general al insertar los datos", detalle: err.message });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error en el servidor:", error.message);
    res.status(500).json({ error: "Error del servidor", detalle: error.message });
  }
});


// Endpoint para obtener tipos de tabla disponibles
app.get("/aclaraciones/tipos-tabla", async (req, res) => {
  try {
    const tipos = Object.keys(validacionesPorTipo).map(key => ({
      codigo: key,
      nombre: validacionesPorTipo[key].nombre,
      camposObligatorios: validacionesPorTipo[key].camposObligatorios
    }));
    
    res.json(tipos);
  } catch (err) {
    console.error("Error al obtener tipos de tabla:", err);
    res.status(500).json({ error: "Error al obtener tipos de tabla" });
  }
});

// Endpoint para buscar cliente automáticamente por terminación y fecha
app.post("/aclaraciones/buscar-cliente", async (req, res) => {
  try {
    const { terminacion, fecha, monto, sucursal, es_euroskin } = req.body;

    console.log('🔍 Búsqueda automática - datos recibidos:', { 
      terminacion, 
      fecha: typeof fecha, 
      fechaOriginal: fecha,
      monto,
      sucursal,
      es_euroskin
    });

    if (!terminacion || !fecha) {
      return res.status(400).json({ 
        error: "Terminación de tarjeta y fecha son requeridos" 
      });
    }

    // Limpiar fecha - asegurar formato YYYY-MM-DD
    let fechaLimpia = fecha;
    
    // Si la fecha contiene caracteres no válidos, intentar limpiarla
    if (typeof fecha === 'string') {
      // Buscar patrón YYYY-MM-DD en la cadena
      const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        fechaLimpia = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        // Si no encuentra el patrón, devolver error
        console.log('❌ Formato de fecha no reconocido:', fecha);
        return res.status(400).json({ 
          error: `Formato de fecha no válido: ${fecha}. Se esperaba YYYY-MM-DD` 
        });
      }
    }

    console.log('🔍 Fecha limpiada:', fechaLimpia);

    // Construir la consulta base
    let query = `
      SELECT 
        "Cliente" as nombre_completo,
        "Tarjeta" as referencia,
        "Total" as monto,
        "Fecha" as fecha,
        "Sucursal" as sucursal,
        "Es_euroskin" as es_euroskin,
        TO_CHAR("Fecha"::timestamp, 'DD/MM/YYYY') as fecha_formato,
        RIGHT("Tarjeta"::text, 4) as terminacion_ref
      FROM "cargos_auto" 
      WHERE RIGHT("Tarjeta"::text, 4) = $1
      AND DATE("Fecha"::timestamp) = DATE($2::timestamp)
    `;
    
    let params = [terminacion, fechaLimpia];

    // Si se proporciona sucursal, agregar filtro
    if (sucursal && sucursal.trim() !== '') {
      query += ` AND "Sucursal" = $${params.length + 1}`;
      params.push(sucursal);
    }

    // Si se proporciona es_euroskin, agregar filtro
    if (es_euroskin !== undefined && es_euroskin !== null) {
      if (es_euroskin === true || es_euroskin === 'true' || es_euroskin === 'Euroskin') {
        query += ` AND "Es_euroskin" = 'Euroskin'`;
      } else {
        query += ` AND ("Es_euroskin" IS NULL OR "Es_euroskin" = '' OR "Es_euroskin" != 'Euroskin')`;
      }
    }

    // Si se proporciona monto, agregar tolerancia
    if (monto && !isNaN(parseFloat(monto))) {
      const montoNum = parseFloat(monto);
      const tolerancia = montoNum * 0.05; // 5% de tolerancia
      
      query += ` AND ABS("Total"::numeric - $${params.length + 1}) <= $${params.length + 2}`;
      params.push(montoNum, tolerancia);
    }

    query += ` ORDER BY "Total"::numeric DESC`;

    console.log('🔍 Query SQL:', query);
    console.log('🔍 Parámetros:', params);

    const result = await pool.query(query, params);

    console.log(`🔍 Resultados encontrados: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('🔍 Primer resultado:', result.rows[0]);
    }

    if (result.rows.length === 0) {
      const response = {
        tipo: 'sin_coincidencias',
        coincidencias: []
      };
      console.log('📤 Enviando respuesta (sin coincidencias):', response);
      return res.json(response);
    }
    
    // Agrupar por cliente para verificar si hay un único cliente con diferentes montos
    const clientesUnicos = {};
    result.rows.forEach(row => {
      const cliente = row.nombre_completo;
      if (!clientesUnicos[cliente]) {
        clientesUnicos[cliente] = [];
      }
      clientesUnicos[cliente].push(row);
    });
    
    const nombresClientes = Object.keys(clientesUnicos);
    console.log(`👥 Clientes únicos encontrados: ${nombresClientes.length}`);
    console.log(`👥 Nombres de clientes:`, nombresClientes);
    
    if (nombresClientes.length === 1) {
      // Solo hay un cliente único, aunque tenga múltiples movimientos con montos diferentes
      const clienteNombre = nombresClientes[0];
      const movimientos = clientesUnicos[clienteNombre];
      
      console.log(`✅ Cliente único encontrado: ${clienteNombre} con ${movimientos.length} movimiento(s)`);
      
      const response = {
        tipo: 'unica',
        cliente: movimientos[0], // Retornamos el primer movimiento como referencia
        totalMovimientos: movimientos.length,
        todosLosMovimientos: movimientos
      };
      console.log('📤 Enviando respuesta (única por cliente):', response);
      return res.json(response);
    } else {
      // Múltiples clientes diferentes
      const response = {
        tipo: 'multiple',
        coincidencias: result.rows,
        clientesUnicos: nombresClientes.length
      };
      console.log('📤 Enviando respuesta (múltiples clientes):', response);
      return res.json(response);
    }

  } catch (error) {
    console.error('❌ Error buscando cliente:', error);
    res.status(500).json({ 
      error: "Error al buscar cliente", 
      detalle: error.message 
    });
  }
});

// Endpoint para automatización web - buscar cliente en páginas externas
app.post("/aclaraciones/buscar-cliente-web", async (req, res) => {
  try {
    const { 
      nombreCliente, 
      urlBusqueda = "https://www.google.com", 
      selectorBusqueda = 'input[name="q"]',
      selectorBoton = 'input[type="submit"], button[type="submit"]',
      selectorResultados = 'a[href]',
      busquedaPersonalizada = null,
      tomarScreenshot = false,
      headless = true
    } = req.body;

    console.log('🤖 Automatización web - datos recibidos:', { 
      nombreCliente, 
      urlBusqueda,
      selectorBusqueda,
      tomarScreenshot,
      headless
    });

    if (!nombreCliente || nombreCliente.trim() === '') {
      return res.status(400).json({ 
        error: "Nombre del cliente es requerido para la búsqueda web" 
      });
    }

    // Inicializar el automatizador web
    const automator = new WebAutomator();
    
    try {
      await automator.init({ headless });
      
      let resultado;
      
      if (busquedaPersonalizada && typeof busquedaPersonalizada === 'function') {
        // Usar búsqueda personalizada si se proporciona
        resultado = await automator._ejecutarBusquedaPersonalizada(
          nombreCliente, 
          urlBusqueda, 
          busquedaPersonalizada
        );
      } else {
        // Usar búsqueda estándar
        resultado = await automator.buscarClienteEnPagina(
          nombreCliente,
          urlBusqueda,
          {
            selectorBusqueda,
            selectorBoton,
            selectorResultados,
            tomarScreenshot
          }
        );
      }

      console.log('🤖 Resultado de automatización web:', {
        exito: resultado.exito,
        totalLinks: resultado.links ? resultado.links.length : 0,
        tieneScreenshot: !!resultado.screenshot
      });

      res.json({
        exito: true,
        cliente: nombreCliente,
        urlBusqueda,
        ...resultado
      });

    } catch (automationError) {
      console.error('❌ Error en automatización web:', automationError);
      res.status(500).json({
        error: "Error durante la automatización web",
        detalle: automationError.message,
        cliente: nombreCliente
      });
    } finally {
      // Siempre cerrar el navegador
      await automator.cerrar();
    }

  } catch (error) {
    console.error('❌ Error general en búsqueda web:', error);
    res.status(500).json({ 
      error: "Error al procesar búsqueda web", 
      detalle: error.message 
    });
  }
});

// Endpoint para búsqueda web en lote
app.post("/aclaraciones/buscar-clientes-web-lote", async (req, res) => {
  try {
    const { 
      clientes, 
      urlBusqueda = "https://www.google.com",
      configuracion = {},
      tomarScreenshots = false,
      headless = true
    } = req.body;

    console.log('🤖 Automatización web en lote - datos recibidos:', { 
      totalClientes: clientes ? clientes.length : 0,
      urlBusqueda,
      tomarScreenshots,
      headless
    });

    if (!clientes || !Array.isArray(clientes) || clientes.length === 0) {
      return res.status(400).json({ 
        error: "Lista de clientes es requerida para la búsqueda web en lote" 
      });
    }

    const automator = new WebAutomator();
    
    try {
      await automator.init({ headless });
      
      const resultados = await automator.buscarClientesEnLote(
        clientes,
        urlBusqueda,
        {
          ...configuracion,
          tomarScreenshots
        }
      );

      console.log('🤖 Resultados de automatización web en lote:', {
        totalProcesados: resultados.length,
        exitosos: resultados.filter(r => r.exito).length,
        conErrores: resultados.filter(r => !r.exito).length
      });

      res.json({
        exito: true,
        totalClientes: clientes.length,
        resultados
      });

    } catch (automationError) {
      console.error('❌ Error en automatización web en lote:', automationError);
      res.status(500).json({
        error: "Error durante la automatización web en lote",
        detalle: automationError.message
      });
    } finally {
      await automator.cerrar();
    }

  } catch (error) {
    console.error('❌ Error general en búsqueda web en lote:', error);
    res.status(500).json({ 
      error: "Error al procesar búsqueda web en lote", 
      detalle: error.message 
    });
  }
});

// Endpoint específico para búsqueda en Sinergia Europiel
app.post("/aclaraciones/buscar-cliente-sinergia", async (req, res) => {
  try {
    const { 
      nombreCliente,
      credenciales,
      tomarScreenshot = true,
      headless = true,
      mantenerSesion = true
    } = req.body;

    console.log('🤖 Búsqueda en Sinergia - datos recibidos:', { 
      nombreCliente,
      tieneCredenciales: !!credenciales,
      tomarScreenshot,
      headless,
      mantenerSesion
    });

    if (!nombreCliente || nombreCliente.trim() === '') {
      return res.status(400).json({ 
        error: "Nombre del cliente es requerido para la búsqueda en Sinergia" 
      });
    }

    if (!credenciales || !credenciales.usuario || !credenciales.contraseña) {
      return res.status(400).json({ 
        error: "Credenciales de Sinergia son requeridas (usuario y contraseña)" 
      });
    }

    // Directorio para mantener sesión si se solicita
    const userDataDir = mantenerSesion ? './sinergia-session' : null;

    const automator = new WebAutomator();
    
    try {
      // Inicializar navegador con datos de sesión si es necesario
      await automator.init({ headless, userDataDir });
      
      // Autenticar en Sinergia
      console.log('🔐 Iniciando autenticación en Sinergia...');
      const authResult = await automator.autenticarSinergia(credenciales);
      
      if (!authResult.success) {
        return res.status(401).json({
          error: "Error en autenticación de Sinergia",
          detalle: authResult.error,
          screenshot: authResult.screenshot
        });
      }

      // Buscar cliente en Sinergia
      console.log('🔍 Buscando cliente en Sinergia...');
      const resultado = await automator.buscarClienteEnSinergia(nombreCliente);

      console.log('🤖 Resultado de búsqueda en Sinergia:', {
        exito: resultado.exito,
        cliente: resultado.cliente,
        totalEncontrados: resultado.totalEncontrados
      });

      res.json({
        exito: true,
        cliente: nombreCliente,
        autenticacion: authResult,
        busqueda: resultado
      });

    } catch (automationError) {
      console.error('❌ Error en automatización de Sinergia:', automationError);
      res.status(500).json({
        error: "Error durante la automatización de Sinergia",
        detalle: automationError.message,
        cliente: nombreCliente
      });
    } finally {
      // Siempre cerrar el navegador
      await automator.cerrar();
    }

  } catch (error) {
    console.error('❌ Error general en búsqueda Sinergia:', error);
    res.status(500).json({ 
      error: "Error al procesar búsqueda en Sinergia", 
      detalle: error.message 
    });
  }
});

// Endpoint para buscar múltiples clientes en Sinergia
app.post("/aclaraciones/buscar-clientes-sinergia-lote", async (req, res) => {
  try {
    const { 
      clientes,
      credenciales,
      tomarScreenshots = false,
      headless = true,
      mantenerSesion = true
    } = req.body;

    console.log('🤖 Búsqueda en lote Sinergia - datos recibidos:', { 
      totalClientes: clientes ? clientes.length : 0,
      tieneCredenciales: !!credenciales,
      tomarScreenshots,
      headless,
      mantenerSesion
    });

    if (!clientes || !Array.isArray(clientes) || clientes.length === 0) {
      return res.status(400).json({ 
        error: "Lista de clientes es requerida para la búsqueda en lote en Sinergia" 
      });
    }

    if (!credenciales || !credenciales.usuario || !credenciales.contraseña) {
      return res.status(400).json({ 
        error: "Credenciales de Sinergia son requeridas (usuario y contraseña)" 
      });
    }

    const userDataDir = mantenerSesion ? './sinergia-session' : null;
    const automator = new WebAutomator();
    
    try {
      await automator.init({ headless, userDataDir });
      
      // Autenticar una sola vez
      console.log('🔐 Autenticando en Sinergia para búsqueda en lote...');
      const authResult = await automator.autenticarSinergia(credenciales);
      
      if (!authResult.success) {
        return res.status(401).json({
          error: "Error en autenticación de Sinergia",
          detalle: authResult.error
        });
      }

      // Buscar cada cliente
      const resultados = [];
      for (let i = 0; i < clientes.length; i++) {
        const cliente = clientes[i];
        console.log(`🔍 Buscando cliente ${i + 1}/${clientes.length}: ${cliente}`);
        
        try {
          const resultado = await automator.buscarClienteEnSinergia(cliente);
          resultados.push(resultado);
          
          // Pausa entre búsquedas para no sobrecargar el servidor
          if (i < clientes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          resultados.push({
            exito: false,
            cliente,
            error: error.message
          });
        }
      }

      console.log('🤖 Resultados de búsqueda en lote Sinergia:', {
        totalProcesados: resultados.length,
        exitosos: resultados.filter(r => r.exito).length,
        conErrores: resultados.filter(r => !r.exito).length
      });

      res.json({
        exito: true,
        totalClientes: clientes.length,
        autenticacion: authResult,
        resultados
      });

    } catch (automationError) {
      console.error('❌ Error en automatización en lote Sinergia:', automationError);
      res.status(500).json({
        error: "Error durante la automatización en lote de Sinergia",
        detalle: automationError.message
      });
    } finally {
      await automator.cerrar();
    }

  } catch (error) {
    console.error('❌ Error general en búsqueda en lote Sinergia:', error);
    res.status(500).json({ 
      error: "Error al procesar búsqueda en lote en Sinergia", 
      detalle: error.message 
    });
  }
});


app.get("/cobranza/estatus", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "EstatusCobranza" FROM "ventas" WHERE "EstatusCobranza" IS NOT NULL ORDER BY "EstatusCobranza"`
    );
    res.json(result.rows.map(r => r.EstatusCobranza).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estatus de cobranza" });
  }
});

app.get("/cobranza/resumen", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "EstatusCobranza",
      COUNT(*) AS total,
      COALESCE(SUM("MontoVencido"::numeric),0) AS totalAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS totalPagado,
      COALESCE(SUM("Anticipo"::numeric),0) AS totalAnticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalRecuperado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS totalVentas
    FROM "ventas"
    ${whereClause}
    GROUP BY "EstatusCobranza"
    ORDER BY "EstatusCobranza";
  `;

  try {
    const result = await pool.query(query, values);

    // Convierte todos los montos a MXN según el bloque
    const resumenEstatus = result.rows.map(row => {
      const bloque = row.bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      return {
        estatus: row.EstatusCobranza,
        total: Number(row.total),
        totalAdeudo: Number(row.totaladeudo) * factor,
        totalPagado: Number(row.totalpagado) * factor,
        totalAnticipo: Number(row.totalanticipo) * factor,
        totalRecuperado: Number(row.totalrecuperado) * factor,
        totalVentas: Number(row.totalventas) * factor,
      };
    });

    res.json(resumenEstatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen de cobranza" });
  }
});

// 🔍 Endpoint para buscar clientes automáticamente por terminación de tarjeta, fecha y monto
app.post("/cargos_auto/buscar-clientes", protegerDatos, async (req, res) => {
  try {
    const { terminacion_tarjeta, fecha_venta, monto } = req.body;

    console.log(`🔍 Búsqueda recibida:`, { terminacion_tarjeta, fecha_venta, monto });

    // Validar que tenemos los parámetros necesarios
    if (!fecha_venta || !monto) {
      return res.status(400).json({
        error: "Faltan parámetros requeridos",
        requeridos: ["fecha_venta", "monto"]
      });
    }

    // PASO 1: Buscar primero solo por fecha y monto
    const queryPaso1 = `
      SELECT 
        "Cliente" as nombre_completo,
        "Folio_Recibo",
        "Fecha",
        "Total",
        "Concepto",
        "Sucursal",
        "Cobro",
        "Bloque",
        "Tarjeta",
        "Es_euroskin" as es_euroskin
      FROM "cargos_auto" 
      WHERE 
        "Fecha"::DATE = $1::DATE
        AND "Total"::NUMERIC = $2::NUMERIC
      ORDER BY "Fecha" DESC
      LIMIT 20
    `;

    const parametrosPaso1 = [fecha_venta, monto];

    console.log(`🔍 PASO 1 - Búsqueda por fecha y monto:`, queryPaso1);
    console.log(`🔍 PASO 1 - Parámetros:`, parametrosPaso1);

    const resultadoPaso1 = await pool.query(queryPaso1, parametrosPaso1);

    console.log(`🔍 PASO 1 - Resultados encontrados: ${resultadoPaso1.rows.length}`);

    let clientesFinales = resultadoPaso1.rows;

    // PASO 2: Si hay múltiples resultados Y tenemos terminación de tarjeta, filtrar por tarjeta
    if (resultadoPaso1.rows.length > 1 && terminacion_tarjeta) {
      console.log(`🔍 PASO 2 - Filtrando por terminación de tarjeta: ${terminacion_tarjeta}`);
      
      clientesFinales = resultadoPaso1.rows.filter(row => {
        const tarjetaBD = row.Tarjeta ? row.Tarjeta.toString() : '';
        console.log(`🔍 PASO 2 - Comparando tarjeta BD: "${tarjetaBD}" con terminación: "${terminacion_tarjeta}"`);
        
        // Extraer todos los dígitos de la tarjeta en BD
        const digitosTarjetaBD = tarjetaBD.replace(/\D/g, ''); // Remover no-dígitos
        
        // Validar que tenemos al menos 4 dígitos y que la terminación buscada tiene 4 dígitos
        if (digitosTarjetaBD.length < 4 || terminacion_tarjeta.length !== 4) {
          console.log(`🔍 PASO 2 - Tarjeta inválida o terminación incorrecta. Dígitos BD: ${digitosTarjetaBD.length}, Terminación: ${terminacion_tarjeta.length}`);
          return false;
        }
        
        // Obtener últimos 4 dígitos
        const terminacionBD = digitosTarjetaBD.slice(-4);
        
        console.log(`🔍 PASO 2 - Tarjeta BD: "${tarjetaBD}", dígitos: "${digitosTarjetaBD}", terminación BD: "${terminacionBD}", terminación buscada: "${terminacion_tarjeta}"`);
        
        // Solo comparar terminaciones exactas (últimos 4 dígitos)
        const coincide = terminacionBD === terminacion_tarjeta;
        console.log(`🔍 PASO 2 - ¿Coincide? ${coincide}`);
        
        return coincide;
      });

      console.log(`🔍 PASO 2 - Resultados después de filtrar por tarjeta: ${clientesFinales.length}`);
      
      // Si el filtro por tarjeta no encuentra nada, devolver todos los resultados del paso 1
      if (clientesFinales.length === 0) {
        console.log(`⚠️ PASO 2 - Filtro por tarjeta no encontró coincidencias, devolviendo todos los resultados de fecha+monto`);
        clientesFinales = resultadoPaso1.rows;
      }
    } else if (resultadoPaso1.rows.length === 1) {
      console.log(`🔍 Solo 1 resultado encontrado, no necesita filtrar por tarjeta`);
    } else if (!terminacion_tarjeta) {
      console.log(`🔍 No se proporcionó terminación de tarjeta, usando solo fecha y monto`);
    }

    const clientesEncontrados = clientesFinales.map(row => {
      const tarjetaBD = row.Tarjeta ? row.Tarjeta.toString() : '';
      const digitosTarjetaBD = tarjetaBD.replace(/\D/g, '');
      const terminacionReal = digitosTarjetaBD.slice(-4);
      
      console.log(`🔍 Mapeando cliente:`, {
        nombre: row.nombre_completo,
        sucursal: row.Sucursal,
        bloque: row.Bloque,
        es_euroskin: row.es_euroskin,
        folio: row.Folio_Recibo,
        tarjeta_original: tarjetaBD,
        terminacion_real: terminacionReal
      });
      
      return {
        nombre_completo: row.nombre_completo ? row.nombre_completo.toUpperCase() : '',
        folio_recibo: row.Folio_Recibo,
        fecha_venta: row.Fecha,
        monto: row.Total,
        concepto: row.Concepto ? row.Concepto.toUpperCase() : '',
        sucursal: row.Sucursal ? row.Sucursal.toUpperCase() : '',
        cobro: row.Cobro ? row.Cobro.toUpperCase() : '',
        bloque: row.Bloque ? row.Bloque.toUpperCase() : '',
        numero_tarjeta: row.Tarjeta,
        terminacion_real: terminacionReal, // Terminación real de la BD
        terminacion_buscada: terminacion_tarjeta, // Terminación que se buscó
        es_euroskin: row.es_euroskin
      };
    });

    res.json({
      clientes: clientesEncontrados,
      total: clientesEncontrados.length,
      criterios: {
        terminacion_tarjeta,
        fecha_venta,
        monto
      }
    });

  } catch (error) {
    console.error("❌ Error buscando clientes:", error);
    res.status(500).json({ 
      error: "Error al buscar clientes",
      detalles: error.message 
    });
  }
});

// ✅ Endpoint principal de cargos_auto (BORRA LOGS INNECESARIOS)
app.get("/cargos_auto", async (req, res) => {
  const { pagina = 1, limite = 1000, solo_count = false, ...filtros } = req.query;
  const { query, values } = generarConsulta("cargos_auto", filtros, pagina, limite);

  // Consulta para el total
  const { query: countQuery, values: countValues } = generarConsulta("cargos_auto", filtros, 1, 1000000000);
  const countResult = await pool.query(
    countQuery.replace(/SELECT \* FROM/, "SELECT COUNT(*) AS total FROM").replace(/ORDER BY[\s\S]*/i, ""),
    countValues
  );
  const total = Number(countResult.rows[0].total);

  try {
    // Si solo queremos el count y hay muchos datos, devolver solo eso para evitar overhead
    if (solo_count === 'true' && limite > 500000) {
      // Para consultas de solo count con límite muy alto, devolver datos vacíos
      res.json({ datos: [], total });
      return;
    }

    const result = await pool.query(query, values);
    
    // 🗓️ Formatear fechas antes de enviar al frontend
    const datosFormateados = result.rows.map(row => formatearFechasEnObjeto(row));
    
    res.json({ datos: datosFormateados, total });
  } catch (error) {
    console.error(`❌ Error en cargos_auto:`, error); // <-- Mantén solo logs de error
    res.status(500).send(`Error en cargos_auto`);
  }
});

app.get(`/cargos_auto/exportar`, async (req, res) => {
  try {
    const { pagina = 1, limite = 100000, ...filtros } = req.query;
    const { query, values } = generarConsulta("cargos_auto", filtros, pagina, limite);

    // LOGS DE DEPURACIÓN
    console.log("EXPORT - Procesadores recibidos:", req.query.procesadores);
    console.log("EXPORT - Query:", query);
    console.log("EXPORT - Values:", values);

    // Headers ANTES del stream
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=cargos_auto.xlsx`
    );

    const client = await pool.connect();
    const queryStream = new QueryStream(query, values, { batchSize: 1000 });
    const stream = client.query(queryStream);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const worksheet = workbook.addWorksheet("cargos_auto");

    let columnsSet = false;

    stream.on("data", (row) => {
      if (!columnsSet) {
        worksheet.columns = Object.keys(row).map((key) => ({
          header: key,
          key,
        }));
        columnsSet = true;
      }
      
      // Convierte números
      if (row.Total !== undefined && row.Total !== null) row.Total = Number(row.Total);
      if (row.TotalMxn !== undefined && row.TotalMxn !== null) row.TotalMxn = Number(row.TotalMxn);
      
      worksheet.addRow(row).commit();
    });

    stream.on("end", async () => {
      await worksheet.commit();
      await workbook.commit();
      client.release();
    });

    stream.on("error", (err) => {
      console.error("Error en stream de exportación:", err);
      client.release();
    });

  } catch (error) {
    console.error(`❌ Error al exportar cargos_auto:`, error);
    if (!res.headersSent) {
      res.status(500).send("Error al exportar datos");
    }
  }
});

// ================= 📱 VALIDADOR DE TELÉFONOS DUPLICADOS MEJORADO =================
app.get("/validar-telefonos", async (req, res) => {
  try {
    console.log("🔍 Iniciando validación de teléfonos individuales...");
    
    // Query corregida - eliminando el JOIN problemático
    const query = `
      WITH telefonos_expandidos AS (
        -- Expandir números con barras a registros individuales
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              -- Si tiene barra, crear una fila para cada número
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          'primer_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
        
        UNION ALL
        
        -- Segunda parte de números con barra
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          'segundo_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT SIMILAR TO '^0+$'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
      ),
      telefonos_duplicados AS (
        SELECT 
          telefono_individual,
          COUNT(DISTINCT cliente) as clientes_distintos,
          COUNT(*) as veces_usado,
          STRING_AGG(DISTINCT cliente, ' | ') as lista_clientes,
          STRING_AGG(DISTINCT sucursal, ' | ') as sucursales,
          STRING_AGG(DISTINCT telefono_original, ' | ') as telefonos_originales,
          MAX("FechaCompra") as ultima_fecha_registro,
          MIN("FechaCompra") as primera_fecha_registro,
          COUNT(DISTINCT sucursal) as cantidad_sucursales,
          COUNT(CASE WHEN "FechaCompra" >= '2025-01-01' THEN 1 END) as registros_2025,
          COUNT(CASE WHEN "FechaCompra" >= '2024-01-01' AND "FechaCompra" < '2025-01-01' THEN 1 END) as registros_2024
        FROM telefonos_expandidos
        WHERE telefono_individual IS NOT NULL 
          AND telefono_individual != ''
          AND telefono_individual != '0'
          AND telefono_individual NOT SIMILAR TO '^0+$'
          AND telefono_individual NOT SIMILAR TO '^[0]*$'
          AND LENGTH(telefono_individual) >= 4
          AND telefono_individual ~ '[1-9]'
        GROUP BY telefono_individual
        HAVING COUNT(DISTINCT cliente) > 1
      )
      SELECT 
        telefono_individual,
        clientes_distintos,
        veces_usado,
        lista_clientes,
        sucursales,
        telefonos_originales,
        ultima_fecha_registro,
        primera_fecha_registro,
        cantidad_sucursales,
        registros_2025,
        registros_2024,
        CASE 
          WHEN ultima_fecha_registro >= '2025-01-01' THEN 'Con fechas 2025'
          WHEN ultima_fecha_registro >= '2024-01-01' THEN 'Solo fechas 2024'
          ELSE 'Fechas anteriores'
        END as categoria_fecha
      FROM telefonos_duplicados
      ORDER BY ultima_fecha_registro DESC, clientes_distintos DESC, veces_usado DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Encontrados ${result.rows.length} números individuales con clientes duplicados`);
    
    // Estadísticas de depuración
    const con2025 = result.rows.filter(row => row.categoria_fecha === 'Con fechas 2025').length;
    const solo2024 = result.rows.filter(row => row.categoria_fecha === 'Solo fechas 2024').length;
    const anteriores = result.rows.filter(row => row.categoria_fecha === 'Fechas anteriores').length;
    
    console.log(`📊 Distribución por fechas:`);
    console.log(`- Con fechas 2025: ${con2025}`);
    console.log(`- Solo fechas 2024: ${solo2024}`);
    console.log(`- Fechas anteriores: ${anteriores}`);
    
    // Procesar los resultados para mejor formato
    const telefonosDuplicados = result.rows.map(row => ({
      telefono: row.telefono_individual,
      clientesDistintos: row.clientes_distintos,
      vecesUsado: row.veces_usado,
      clientes: row.lista_clientes.split(' | '),
      sucursales: row.sucursales.split(' | '),
      telefonosOriginales: row.telefonos_originales.split(' | '),
      ultimaFechaRegistro: row.ultima_fecha_registro,
      primeraFechaRegistro: row.primera_fecha_registro,
      cantidadSucursales: row.cantidad_sucursales,
      registros2025: row.registros_2025,
      registros2024: row.registros_2024,
      categoriaFecha: row.categoria_fecha,
      riesgo: row.clientes_distintos > 4 ? 'Alto' : 
              row.clientes_distintos > 2 ? 'Medio' : 'Bajo'
    }));

    // Estadísticas adicionales
    const estadisticas = {
      alto_riesgo: telefonosDuplicados.filter(t => t.riesgo === 'Alto').length,
      medio_riesgo: telefonosDuplicados.filter(t => t.riesgo === 'Medio').length,
      bajo_riesgo: telefonosDuplicados.filter(t => t.riesgo === 'Bajo').length,
      con_fechas_2025: con2025,
      solo_fechas_2024: solo2024,
      fechas_anteriores: anteriores
    };

    res.json({
      total: telefonosDuplicados.length,
      estadisticas: estadisticas,
      datos: telefonosDuplicados
    });

  } catch (error) {
    console.error("❌ Error al validar teléfonos:", error);
    res.status(500).json({ 
      error: "Error al validar teléfonos duplicados",
      message: error.message 
    });
  }
});

// 🆕 Endpoint para obtener teléfonos duplicados de una sucursal específica
app.get("/validar-telefonos/sucursal/:sucursal", async (req, res) => {
  try {
    const { sucursal } = req.params;
    console.log(`🔍 Obteniendo teléfonos duplicados para la sucursal: ${sucursal}`);
    
    const query = `
      WITH telefonos_expandidos AS (
        -- Expandir números con barras a registros individuales
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          'primer_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
          AND TRIM("Sucursal") = $1
        
        UNION ALL
        
        -- Segunda parte de números con barra
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          'segundo_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT SIMILAR TO '^0+$'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
          AND TRIM("Sucursal") = $1
      ),
      telefonos_duplicados AS (
        SELECT 
          telefono_individual,
          COUNT(DISTINCT cliente) as clientes_distintos,
          COUNT(*) as veces_usado,
          STRING_AGG(DISTINCT cliente, ' | ') as lista_clientes,
          STRING_AGG(DISTINCT sucursal, ' | ') as sucursales,
          STRING_AGG(DISTINCT telefono_original, ' | ') as telefonos_originales,
          MAX("FechaCompra") as ultima_fecha_registro,
          MIN("FechaCompra") as primera_fecha_registro,
          COUNT(DISTINCT sucursal) as cantidad_sucursales
        FROM telefonos_expandidos
        WHERE telefono_individual IS NOT NULL 
          AND telefono_individual != ''
          AND telefono_individual != '0'
          AND telefono_individual NOT SIMILAR TO '^0+$'
          AND telefono_individual NOT SIMILAR TO '^[0]*$'
          AND LENGTH(telefono_individual) >= 4
          AND telefono_individual ~ '[1-9]'
        GROUP BY telefono_individual
        HAVING COUNT(DISTINCT cliente) > 1
      )
      SELECT 
        telefono_individual,
        clientes_distintos,
        veces_usado,
        lista_clientes,
        sucursales,
        telefonos_originales,
        ultima_fecha_registro,
        primera_fecha_registro,
        cantidad_sucursales
      FROM telefonos_duplicados
      ORDER BY ultima_fecha_registro DESC, clientes_distintos DESC, veces_usado DESC
    `;

    const result = await pool.query(query, [sucursal]);
    
    console.log(`✅ Encontrados ${result.rows.length} teléfonos duplicados para ${sucursal}`);
    
    // Procesar los resultados
    const telefonosDuplicados = result.rows.map(row => ({
      telefono: row.telefono_individual,
      clientesDistintos: row.clientes_distintos,
      vecesUsado: row.veces_usado,
      clientes: row.lista_clientes.split(' | '),
      sucursales: row.sucursales.split(' | '),
      telefonosOriginales: row.telefonos_originales.split(' | '),
      ultimaFechaRegistro: row.ultima_fecha_registro,
      primeraFechaRegistro: row.primera_fecha_registro,
      cantidadSucursales: row.cantidad_sucursales,
      riesgo: row.clientes_distintos >= 4 ? 'Alto' : 
              row.clientes_distintos === 3 ? 'Medio' : 'Bajo'
    }));

    res.json({
      sucursal: sucursal,
      total: telefonosDuplicados.length,
      datos: telefonosDuplicados
    });

  } catch (error) {
    console.error("❌ Error al obtener teléfonos de la sucursal:", error);
    res.status(500).json({ 
      error: "Error al obtener teléfonos duplicados de la sucursal",
      message: error.message 
    });
  }
});

// 🆕 Endpoint para obtener análisis de teléfonos duplicados por meses
app.get("/dashboard-telefonos-meses", async (req, res) => {
  try {
    console.log("📊 Obteniendo análisis de teléfonos duplicados por meses");
    
    const query = `
      WITH telefonos_expandidos AS (
        -- Expandir números con barras a registros individuales
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          TO_CHAR("FechaCompra", 'YYYY-MM') as mes_anio
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          TO_CHAR("FechaCompra", 'YYYY-MM') as mes_anio
        FROM "ventas"
        WHERE "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT LIKE '0%'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
      ),
      telefonos_duplicados AS (
        SELECT 
          te.mes_anio,
          te.telefono_individual,
          COUNT(DISTINCT te.cliente) as clientes_distintos,
          COUNT(*) as veces_usado,
          STRING_AGG(DISTINCT te.cliente, ' | ' ORDER BY te.cliente) as lista_clientes,
          STRING_AGG(DISTINCT te.sucursal, ' | ' ORDER BY te.sucursal) as sucursales,
          STRING_AGG(DISTINCT te.telefono_original, ' | ') as telefonos_originales,
          MAX(te."FechaCompra") as ultima_fecha_registro,
          MIN(te."FechaCompra") as primera_fecha_registro,
          COUNT(DISTINCT te.sucursal) as cantidad_sucursales
        FROM telefonos_expandidos te
        GROUP BY te.mes_anio, te.telefono_individual
        HAVING COUNT(DISTINCT te.cliente) > 1
      )
      SELECT 
        mes_anio,
        telefono_individual,
        clientes_distintos,
        veces_usado,
        lista_clientes,
        sucursales,
        telefonos_originales,
        ultima_fecha_registro,
        primera_fecha_registro,
        cantidad_sucursales
      FROM telefonos_duplicados
      ORDER BY mes_anio DESC, clientes_distintos DESC, veces_usado DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Encontrados ${result.rows.length} registros de análisis por meses`);
    
    // Procesar los resultados agrupados por mes
    const analysisByMonth = {};
    
    result.rows.forEach(row => {
      const mesAnio = row.mes_anio;
      if (!analysisByMonth[mesAnio]) {
        // Extraer año y mes del formato "YYYY-MM"
        const [anio, mesNumero] = mesAnio.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMes = meses[parseInt(mesNumero) - 1];
        
        analysisByMonth[mesAnio] = {
          mes_anio: mesAnio,
          mes: nombreMes,
          anio: parseInt(anio),
          mes_numero: parseInt(mesNumero),
          totalTelefonosDuplicados: 0,
          telefonos: []
        };
      }
      
      analysisByMonth[mesAnio].totalTelefonosDuplicados++;
      analysisByMonth[mesAnio].telefonos.push({
        telefono: row.telefono_individual,
        clientesDistintos: row.clientes_distintos,
        vecesUsado: row.veces_usado,
        clientes: row.lista_clientes.split(' | '),
        sucursales: row.sucursales.split(' | '),
        telefonosOriginales: row.telefonos_originales.split(' | '),
        ultimaFechaRegistro: row.ultima_fecha_registro,
        primeraFechaRegistro: row.primera_fecha_registro,
        cantidadSucursales: row.cantidad_sucursales,
        riesgo: row.clientes_distintos >= 4 ? 'Alto' : 
                row.clientes_distintos === 3 ? 'Medio' : 'Bajo'
      });
    });

    const monthsArray = Object.values(analysisByMonth).sort((a, b) => b.mes_anio.localeCompare(a.mes_anio));

    // Calcular estadísticas para cada mes
    const monthsWithStats = monthsArray.map(month => {
      const totalClientesAfectados = [...new Set(month.telefonos.flatMap(t => t.clientes))].length;
      const totalRegistros = month.telefonos.reduce((sum, t) => sum + t.vecesUsado, 0);
      const sucursalesAfectadas = [...new Set(month.telefonos.flatMap(t => t.sucursales))].length;
      const promedioDiario = Math.round(totalRegistros / 30 * 10) / 10; // Asumiendo 30 días por mes
      
      // Determinar nivel de riesgo del mes
      const telefonosAltoRiesgo = month.telefonos.filter(t => t.riesgo === 'Alto').length;
      const nivelRiesgo = telefonosAltoRiesgo > 5 ? 'Alto' : 
                         telefonosAltoRiesgo > 2 ? 'Medio' : 'Bajo';
      
      return {
        ...month,
        total_telefonos_duplicados: month.totalTelefonosDuplicados,
        total_clientes_afectados: totalClientesAfectados,
        total_registros: totalRegistros,
        promedio_diario: promedioDiario,
        sucursales_afectadas: sucursalesAfectadas,
        nivel_riesgo: nivelRiesgo
      };
    });

    // Estadísticas generales
    const estadisticasGenerales = {
      total_registros: monthsWithStats.length,
      total_telefonos_duplicados: monthsWithStats.reduce((sum, m) => sum + m.total_telefonos_duplicados, 0),
      total_clientes_afectados: monthsWithStats.reduce((sum, m) => sum + m.total_clientes_afectados, 0),
      promedio_mensual: Math.round(monthsWithStats.reduce((sum, m) => sum + m.total_telefonos_duplicados, 0) / monthsWithStats.length * 10) / 10
    };

    res.json({
      total: monthsWithStats.length,
      datos: monthsWithStats,
      estadisticas_generales: estadisticasGenerales
    });

  } catch (error) {
    console.error("❌ Error al obtener análisis por meses:", error);
    res.status(500).json({ 
      error: "Error al obtener análisis de teléfonos por meses",
      message: error.message 
    });
  }
});

// 🆕 Endpoint para obtener análisis de teléfonos duplicados por días
app.get("/dashboard-telefonos-dias", async (req, res) => {
  try {
    console.log("📊 Obteniendo análisis de teléfonos duplicados por días");
    
    const query = `
      WITH telefonos_expandidos AS (
        -- Expandir números con barras a registros individuales
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          TO_CHAR("FechaCompra", 'YYYY-MM-DD') as fecha_dia
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
          AND "FechaCompra" >= CURRENT_DATE - INTERVAL '30 days'  -- Solo últimos 30 días
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          TO_CHAR("FechaCompra", 'YYYY-MM-DD') as fecha_dia
        FROM "ventas"
        WHERE "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT LIKE '0%'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "FechaCompra" IS NOT NULL
          AND "FechaCompra" >= CURRENT_DATE - INTERVAL '30 days'  -- Solo últimos 30 días
      ),
      telefonos_duplicados AS (
        SELECT 
          te.fecha_dia,
          te.telefono_individual,
          COUNT(DISTINCT te.cliente) as clientes_distintos,
          COUNT(*) as veces_usado,
          STRING_AGG(DISTINCT te.cliente, ' | ' ORDER BY te.cliente) as lista_clientes,
          STRING_AGG(DISTINCT te.sucursal, ' | ' ORDER BY te.sucursal) as sucursales,
          STRING_AGG(DISTINCT te.telefono_original, ' | ') as telefonos_originales,
          MAX(te."FechaCompra") as ultima_fecha_registro,
          MIN(te."FechaCompra") as primera_fecha_registro,
          COUNT(DISTINCT te.sucursal) as cantidad_sucursales
        FROM telefonos_expandidos te
        GROUP BY te.fecha_dia, te.telefono_individual
        HAVING COUNT(DISTINCT te.cliente) > 1
      )
      SELECT 
        fecha_dia,
        telefono_individual,
        clientes_distintos,
        veces_usado,
        lista_clientes,
        sucursales,
        telefonos_originales,
        ultima_fecha_registro,
        primera_fecha_registro,
        cantidad_sucursales
      FROM telefonos_duplicados
      ORDER BY fecha_dia DESC, clientes_distintos DESC, veces_usado DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Encontrados ${result.rows.length} registros de análisis por días`);
    
    // Procesar los resultados agrupados por día
    const analysisByDay = {};
    
    result.rows.forEach(row => {
      const fechaDia = row.fecha_dia;
      if (!analysisByDay[fechaDia]) {
        // Obtener el día de la semana en español
        const fecha = new Date(fechaDia);
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diaSemana = diasSemana[fecha.getDay()];
        
        analysisByDay[fechaDia] = {
          fecha: fechaDia,
          dia_semana: diaSemana,
          totalTelefonosDuplicados: 0,
          telefonos: []
        };
      }
      
      analysisByDay[fechaDia].totalTelefonosDuplicados++;
      analysisByDay[fechaDia].telefonos.push({
        telefono: row.telefono_individual,
        clientesDistintos: row.clientes_distintos,
        vecesUsado: row.veces_usado,
        clientes: row.lista_clientes.split(' | '),
        sucursales: row.sucursales.split(' | '),
        telefonosOriginales: row.telefonos_originales.split(' | '),
        ultimaFechaRegistro: row.ultima_fecha_registro,
        primeraFechaRegistro: row.primera_fecha_registro,
        cantidadSucursales: row.cantidad_sucursales,
        riesgo: row.clientes_distintos >= 4 ? 'Alto' : 
                row.clientes_distintos === 3 ? 'Medio' : 'Bajo'
      });
    });

    const daysArray = Object.values(analysisByDay).sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Calcular estadísticas para cada día
    const daysWithStats = daysArray.map(day => {
      const totalClientesAfectados = [...new Set(day.telefonos.flatMap(t => t.clientes))].length;
      const totalRegistros = day.telefonos.reduce((sum, t) => sum + t.vecesUsado, 0);
      const sucursalesAfectadas = [...new Set(day.telefonos.flatMap(t => t.sucursales))].length;
      
      // Determinar nivel de riesgo del día
      const telefonosAltoRiesgo = day.telefonos.filter(t => t.riesgo === 'Alto').length;
      const nivelRiesgo = telefonosAltoRiesgo > 3 ? 'Alto' : 
                         telefonosAltoRiesgo > 1 ? 'Medio' : 'Bajo';
      
      return {
        ...day,
        total_telefonos_duplicados: day.totalTelefonosDuplicados,
        total_clientes_afectados: totalClientesAfectados,
        total_registros: totalRegistros,
        sucursales_afectadas: sucursalesAfectadas,
        nivel_riesgo: nivelRiesgo
      };
    });

    // Estadísticas generales
    const estadisticasGenerales = {
      total_registros: daysWithStats.length,
      total_telefonos_duplicados: daysWithStats.reduce((sum, d) => sum + d.total_telefonos_duplicados, 0),
      total_clientes_afectados: daysWithStats.reduce((sum, d) => sum + d.total_clientes_afectados, 0),
      promedio_diario: Math.round(daysWithStats.reduce((sum, d) => sum + d.total_telefonos_duplicados, 0) / daysWithStats.length * 10) / 10
    };

    res.json({
      total: daysWithStats.length,
      datos: daysWithStats,
      estadisticas_generales: estadisticasGenerales
    });

  } catch (error) {
    console.error("❌ Error al obtener análisis por días:", error);
    res.status(500).json({ 
      error: "Error al obtener análisis de teléfonos por días",
      message: error.message 
    });
  }
});

// Endpoint para obtener estadísticas de teléfonos
app.get("/estadisticas-telefonos", async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT "Telefono") as telefonos_unicos,
        COUNT(DISTINCT "Cliente") as clientes_unicos,
        COUNT(*) - COUNT(DISTINCT "Telefono") as telefonos_duplicados
      FROM "ventas"
      WHERE "Telefono" IS NOT NULL 
        AND "Telefono" != '' 
        AND "Telefono" != 'null'
        AND "Telefono" != '/'
        AND "Telefono" NOT LIKE '%/ 0%'
        AND "Telefono" NOT LIKE '0%'
        AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
        AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
        AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
        AND "Cliente" IS NOT NULL 
        AND "Cliente" != '' 
        AND "Cliente" != 'null'
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// ================= 📊 DASHBOARD SUCURSALES TELÉFONOS DUPLICADOS =================
app.get("/dashboard-sucursales-duplicados", async (req, res) => {
  try {
    console.log("🔍 Obteniendo estadísticas de sucursales con teléfonos duplicados...");
    
    const query = `
      WITH telefonos_expandidos AS (
        -- Expandir números con barras a registros individuales
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      ),
      telefonos_duplicados_por_sucursal AS (
        SELECT 
          sucursal,
          telefono_individual,
          COUNT(DISTINCT cliente) as clientes_distintos_por_telefono,
          COUNT(*) as registros_telefono,
          STRING_AGG(DISTINCT cliente, ' | ') as clientes_del_telefono
        FROM telefonos_expandidos
        WHERE telefono_individual IS NOT NULL 
          AND telefono_individual != ''
          AND telefono_individual != '0'
          AND LENGTH(telefono_individual) >= 4
          AND telefono_individual ~ '[1-9]'
        GROUP BY sucursal, telefono_individual
        HAVING COUNT(DISTINCT cliente) > 1
      ),
      resumen_sucursales AS (
        SELECT 
          sucursal,
          COUNT(*) as total_telefonos_duplicados,
          SUM(clientes_distintos_por_telefono) as total_clientes_afectados,
          SUM(registros_telefono) as total_registros_problema,
          AVG(clientes_distintos_por_telefono) as promedio_clientes_por_telefono,
          MAX(clientes_distintos_por_telefono) as max_clientes_en_un_telefono,
          COUNT(CASE WHEN clientes_distintos_por_telefono >= 4 THEN 1 END) as telefonos_alto_riesgo,
          COUNT(CASE WHEN clientes_distintos_por_telefono = 3 THEN 1 END) as telefonos_medio_riesgo,
          COUNT(CASE WHEN clientes_distintos_por_telefono = 2 THEN 1 END) as telefonos_bajo_riesgo
        FROM telefonos_duplicados_por_sucursal
        GROUP BY sucursal
      )
      SELECT 
        sucursal,
        total_telefonos_duplicados,
        total_clientes_afectados,
        total_registros_problema,
        ROUND(promedio_clientes_por_telefono, 2) as promedio_clientes_por_telefono,
        max_clientes_en_un_telefono,
        telefonos_alto_riesgo,
        telefonos_medio_riesgo,
        telefonos_bajo_riesgo,
        CASE 
          WHEN telefonos_alto_riesgo > 0 THEN 'Alto'
          WHEN telefonos_medio_riesgo > 0 THEN 'Medio'
          ELSE 'Bajo'
        END as nivel_riesgo_sucursal
      FROM resumen_sucursales
      ORDER BY total_telefonos_duplicados DESC, total_clientes_afectados DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Procesadas ${result.rows.length} sucursales con teléfonos duplicados`);
    
    // Calcular estadísticas generales
    const totalTelefonosDuplicados = result.rows.reduce((sum, row) => sum + parseInt(row.total_telefonos_duplicados), 0);
    const totalClientesAfectados = result.rows.reduce((sum, row) => sum + parseInt(row.total_clientes_afectados), 0);
    const sucursalesAltoRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Alto').length;
    const sucursalesMedioRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Medio').length;
    const sucursalesBajoRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Bajo').length;

    const estadisticasGenerales = {
      total_sucursales: result.rows.length,
      total_telefonos_duplicados: totalTelefonosDuplicados,
      total_clientes_afectados: totalClientesAfectados,
      sucursales_alto_riesgo: sucursalesAltoRiesgo,
      sucursales_medio_riesgo: sucursalesMedioRiesgo,
      sucursales_bajo_riesgo: sucursalesBajoRiesgo,
      promedio_telefonos_por_sucursal: Math.round(totalTelefonosDuplicados / result.rows.length)
    };

    res.json({
      estadisticas_generales: estadisticasGenerales,
      sucursales: result.rows
    });

  } catch (error) {
    console.error("❌ Error al obtener dashboard de sucursales:", error);
    res.status(500).json({ 
      error: "Error al obtener estadísticas de sucursales",
      message: error.message 
    });
  }
});

// ================= 🔍 ENDPOINT TEMPORAL PARA VERIFICAR FECHAS =================
app.get("/verificar-fechas", async (req, res) => {
  try {
    console.log("🔍 Verificando rango de fechas en la base de datos...");
    
    const query = `
      SELECT 
        MIN("FechaCompra") as fecha_minima,
        MAX("FechaCompra") as fecha_maxima,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN "FechaCompra" >= '2025-01-01' THEN 1 END) as registros_2025,
        COUNT(CASE WHEN "FechaCompra" >= '2024-01-01' AND "FechaCompra" < '2025-01-01' THEN 1 END) as registros_2024,
        COUNT(CASE WHEN "FechaCompra" < '2024-01-01' THEN 1 END) as registros_anteriores
      FROM "ventas" 
      WHERE "FechaCompra" IS NOT NULL
    `;

    const result = await pool.query(query);
    
    // Consulta adicional para ver ejemplos de fechas recientes
    const fechasRecientes = await pool.query(`
      SELECT "FechaCompra", COUNT(*) as cantidad
      FROM "ventas" 
      WHERE "FechaCompra" IS NOT NULL
      GROUP BY "FechaCompra"
      ORDER BY "FechaCompra" DESC
      LIMIT 15
    `);

    const estadisticas = result.rows[0];
    
    console.log("📅 Análisis completado:");
    console.log(`- Fecha mínima: ${estadisticas.fecha_minima}`);
    console.log(`- Fecha máxima: ${estadisticas.fecha_maxima}`);
    console.log(`- Total registros: ${estadisticas.total_registros}`);
    console.log(`- Registros 2025: ${estadisticas.registros_2025}`);
    console.log(`- Registros 2024: ${estadisticas.registros_2024}`);

    res.json({
      rango_fechas: {
        fecha_minima: estadisticas.fecha_minima,
        fecha_maxima: estadisticas.fecha_maxima,
        total_registros: estadisticas.total_registros,
        registros_2025: estadisticas.registros_2025,
        registros_2024: estadisticas.registros_2024,
        registros_anteriores: estadisticas.registros_anteriores
      },
      fechas_recientes: fechasRecientes.rows
    });

  } catch (error) {
    console.error("❌ Error al verificar fechas:", error);
    res.status(500).json({ 
      error: "Error al verificar fechas",
      message: error.message 
    });
  }
});

// ================= 🔍 ENDPOINT PARA VERIFICAR FECHAS DE TELÉFONOS DUPLICADOS =================
app.get("/verificar-fechas-telefonos", async (req, res) => {
  try {
    console.log("🔍 Verificando fechas de teléfonos duplicados...");
    
    const query = `
      WITH telefonos_expandidos AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      ),
      telefonos_con_fechas AS (
        SELECT 
          te.telefono_individual,
          COUNT(DISTINCT te.cliente) as clientes_distintos,
          MAX(v."FechaCompra") as ultima_fecha_registro,
          MIN(v."FechaCompra") as primera_fecha_registro,
          COUNT(CASE WHEN v."FechaCompra" >= '2025-01-01' THEN 1 END) as registros_2025,
          COUNT(CASE WHEN v."FechaCompra" >= '2024-01-01' AND v."FechaCompra" < '2025-01-01' THEN 1 END) as registros_2024
        FROM telefonos_expandidos te
        JOIN "ventas" v ON te."ID" = v."ID"
        WHERE te.telefono_individual IS NOT NULL 
          AND te.telefono_individual != ''
          AND te.telefono_individual != '0'
          AND LENGTH(te.telefono_individual) >= 4
          AND te.telefono_individual ~ '[1-9]'
        GROUP BY te.telefono_individual
        HAVING COUNT(DISTINCT te.cliente) > 1
      )
      SELECT 
        telefono_individual,
        clientes_distintos,
        ultima_fecha_registro,
        primera_fecha_registro,
        registros_2025,
        registros_2024,
        CASE 
          WHEN ultima_fecha_registro >= '2025-01-01' THEN 'Con fechas 2025'
          WHEN ultima_fecha_registro >= '2024-01-01' THEN 'Solo fechas 2024'
          ELSE 'Fechas anteriores'
        END as categoria_fecha
      FROM telefonos_con_fechas
      ORDER BY ultima_fecha_registro DESC
      LIMIT 20
    `;

    const result = await pool.query(query);
    
    // Estadísticas de categorías
    const estadisticasQuery = `
      WITH telefonos_expandidos AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      ),
      telefonos_categorias AS (
        SELECT 
          te.telefono_individual,
          COUNT(DISTINCT te.cliente) as clientes_distintos,
          MAX(v."FechaCompra") as ultima_fecha_registro
        FROM telefonos_expandidos te
        JOIN "ventas" v ON te."ID" = v."ID"
        WHERE te.telefono_individual IS NOT NULL 
          AND te.telefono_individual != ''
          AND te.telefono_individual != '0'
          AND LENGTH(te.telefono_individual) >= 4
          AND te.telefono_individual ~ '[1-9]'
        GROUP BY te.telefono_individual
        HAVING COUNT(DISTINCT te.cliente) > 1
      )
      SELECT 
        COUNT(CASE WHEN ultima_fecha_registro >= '2025-01-01' THEN 1 END) as telefonos_con_2025,
        COUNT(CASE WHEN ultima_fecha_registro >= '2024-01-01' AND ultima_fecha_registro < '2025-01-01' THEN 1 END) as telefonos_solo_2024,
        COUNT(CASE WHEN ultima_fecha_registro < '2024-01-01' THEN 1 END) as telefonos_anteriores,
        COUNT(*) as total_telefonos_duplicados
      FROM telefonos_categorias
    `;

    const estadisticas = await pool.query(estadisticasQuery);
    
    console.log("📅 Análisis de fechas en teléfonos duplicados completado");
    
    res.json({
      ejemplos_telefonos: result.rows,
      estadisticas_fechas: estadisticas.rows[0]
    });

  } catch (error) {
    console.error("❌ Error al verificar fechas de teléfonos:", error);
    res.status(500).json({ 
      error: "Error al verificar fechas de teléfonos",
      message: error.message 
    });
  }
});

// ================= 🔍 ENDPOINT PARA ANALIZAR TELÉFONO ESPECÍFICO =================
app.get("/analizar-telefono/:numero", async (req, res) => {
  try {
    const numeroTelefono = req.params.numero;
    console.log(`🔍 Analizando teléfono específico: ${numeroTelefono}`);
    
    const query = `
      SELECT 
        "ID",
        "Cliente",
        "Sucursal", 
        "Telefono",
        "FechaCompra",
        EXTRACT(YEAR FROM "FechaCompra") as año,
        EXTRACT(MONTH FROM "FechaCompra") as mes,
        EXTRACT(DAY FROM "FechaCompra") as dia
      FROM "ventas"
      WHERE "Telefono" LIKE '%${numeroTelefono}%'
        OR "Telefono" = '${numeroTelefono}'
      ORDER BY "FechaCompra" DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    console.log(`📊 Encontrados ${result.rows.length} registros para el teléfono ${numeroTelefono}`);
    
    // Agrupar por cliente
    const porCliente = {};
    result.rows.forEach(row => {
      const cliente = row.Cliente;
      if (!porCliente[cliente]) {
        porCliente[cliente] = [];
      }
      porCliente[cliente].push({
        fecha: row.FechaCompra,
        sucursal: row.Sucursal,
        telefono_original: row.Telefono,
        año: row.año,
        mes: row.mes,
        dia: row.dia
      });
    });

    // Estadísticas
    const clientesDistintos = Object.keys(porCliente).length;
    const fechas2025 = result.rows.filter(row => row.año >= 2025).length;
    const fechas2024 = result.rows.filter(row => row.año >= 2024 && row.año < 2025).length;
    const fechaMinima = result.rows.length > 0 ? result.rows[result.rows.length - 1].FechaCompra : null;
    const fechaMaxima = result.rows.length > 0 ? result.rows[0].FechaCompra : null;

    console.log(`📅 Análisis de fechas:`);
    console.log(`- Clientes distintos: ${clientesDistintos}`);
    console.log(`- Registros 2025: ${fechas2025}`);
    console.log(`- Registros 2024: ${fechas2024}`);
    console.log(`- Fecha más antigua: ${fechaMinima}`);
    console.log(`- Fecha más reciente: ${fechaMaxima}`);

    res.json({
      numero_analizado: numeroTelefono,
      total_registros: result.rows.length,
      clientes_distintos: clientesDistintos,
      estadisticas: {
        registros_2025: fechas2025,
        registros_2024: fechas2024,
        fecha_minima: fechaMinima,
        fecha_maxima: fechaMaxima
      },
      por_cliente: porCliente,
      todos_los_registros: result.rows
    });

  } catch (error) {
    console.error("❌ Error al analizar teléfono:", error);
    res.status(500).json({ 
      error: "Error al analizar teléfono",
      message: error.message 
    });
  }
});

// ================= 🔍 ENDPOINT PARA DEPURAR CONSULTA DEL VALIDADOR =================
app.get("/debug-validador/:numero", async (req, res) => {
  try {
    const numeroTelefono = req.params.numero;
    console.log(`🔍 Depurando por qué ${numeroTelefono} no aparece en el validador...`);
    
    // Paso 1: Ver si está en telefonos_expandidos
    const paso1 = await pool.query(`
      WITH telefonos_expandidos AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          'primer_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          'segundo_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT SIMILAR TO '^0+$'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      )
      SELECT * FROM telefonos_expandidos 
      WHERE telefono_individual = '${numeroTelefono}'
      ORDER BY cliente
    `);

    // Paso 2: Ver si pasa los filtros finales
    const paso2 = await pool.query(`
      WITH telefonos_expandidos AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          'primer_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          'segundo_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT SIMILAR TO '^0+$'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      )
      SELECT 
        te.*,
        v."FechaCompra"
      FROM telefonos_expandidos te
      JOIN "ventas" v ON te."ID" = v."ID"
      WHERE te.telefono_individual = '${numeroTelefono}'
        AND te.telefono_individual IS NOT NULL 
        AND te.telefono_individual != ''
        AND te.telefono_individual != '0'
        AND te.telefono_individual NOT SIMILAR TO '^0+$'
        AND te.telefono_individual NOT SIMILAR TO '^[0]*$'
        AND LENGTH(te.telefono_individual) >= 4
        AND te.telefono_individual ~ '[1-9]'
      ORDER BY v."FechaCompra" DESC
    `);

    // Paso 3: Ver el resultado agrupado

    // Paso 3: Ver el resultado agrupado
    const paso3 = await pool.query(`
      WITH telefonos_expandidos AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          CASE 
            WHEN "Telefono" LIKE '%/%' THEN
              TRIM(SPLIT_PART("Telefono", '/', 1))
            ELSE 
              TRIM("Telefono")
          END as telefono_individual,
          "Telefono" as telefono_original,
          'primer_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" != '' 
          AND "Telefono" != 'null'
          AND "Telefono" != '/'
          AND "Telefono" NOT LIKE '%/ 0%'
          AND "Telefono" NOT LIKE '0%'
          AND TRIM("Telefono") NOT SIMILAR TO '^0+$'
          AND TRIM("Telefono") NOT SIMILAR TO '^[/\s]*0+[/\s]*$'
          AND LENGTH(REPLACE(REPLACE(TRIM("Telefono"), '/', ''), ' ', '')) > 3
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
        
        UNION ALL
        
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          TRIM(SPLIT_PART("Telefono", '/', 2)) as telefono_individual,
          "Telefono" as telefono_original,
          'segundo_numero' as tipo_numero
        FROM "ventas"
        WHERE "Telefono" IS NOT NULL 
          AND "Telefono" LIKE '%/%'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != ''
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) != '0'
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) NOT SIMILAR TO '^0+$'
          AND LENGTH(TRIM(SPLIT_PART("Telefono", '/', 2))) >= 4
          AND TRIM(SPLIT_PART("Telefono", '/', 2)) ~ '[1-9]'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
      )
      SELECT 
        telefono_individual,
        COUNT(DISTINCT cliente) as clientes_distintos,
        COUNT(*) as veces_usado,
        STRING_AGG(DISTINCT cliente, ' | ') as lista_clientes,
        MAX(v."FechaCompra") as ultima_fecha_registro
      FROM telefonos_expandidos te
      JOIN "ventas" v ON te."ID" = v."ID"
      WHERE te.telefono_individual = '${numeroTelefono}'
        AND te.telefono_individual IS NOT NULL 
        AND te.telefono_individual != ''
        AND te.telefono_individual != '0'
        AND te.telefono_individual NOT SIMILAR TO '^0+$'
        AND te.telefono_individual NOT SIMILAR TO '^[0]*$'
        AND LENGTH(te.telefono_individual) >= 4
        AND te.telefono_individual ~ '[1-9]'
      GROUP BY telefono_individual
      HAVING COUNT(DISTINCT cliente) > 1
    `);

    console.log(`📊 Resultados de depuración:`);
    console.log(`- Paso 1 (telefonos_expandidos): ${paso1.rows.length} registros`);
    console.log(`- Paso 2 (con JOIN y filtros): ${paso2.rows.length} registros`);
    console.log(`- Paso 3 (agrupado final): ${paso3.rows.length} registros`);

    res.json({
      numero_analizado: numeroTelefono,
      paso1_telefonos_expandidos: {
        cantidad: paso1.rows.length,
        datos: paso1.rows
      },
      paso2_con_join_y_filtros: {
        cantidad: paso2.rows.length,
        datos: paso2.rows
      },
      paso3_agrupado_final: {
        cantidad: paso3.rows.length,
        datos: paso3.rows
      }
    });

  } catch (error) {
    console.error("❌ Error en depuración:", error);
    res.status(500).json({ 
      error: "Error en depuración",
      message: error.message 
    });
  }
});

app.get("/aclaraciones/dashboard", protegerDatos, async (req, res) => {
  try {
    const { anio, bloque, mes } = req.query;
    let where = [];
    let values = [];
    let idx = 1;

    if (anio && anio !== "") {
      where.push(`"año" = $${idx++}`);
      values.push(anio);
    }
    if (bloque && bloque !== "") {
      where.push(`"bloque" = $${idx++}`);
      values.push(bloque);
    }
    if (mes && mes !== "") {
      where.push(`"mes_peticion" = $${idx++}`);
      values.push(mes);
    }
    
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // 1. ✅ CORREGIDO: Total de aclaraciones, monto en disputa, ganadas y monto ganado
    const totalQuery = `
      SELECT 
        COUNT(*) AS total_aclaraciones,
        COALESCE(SUM("monto_mnx"),0) AS total_monto_general,
        COALESCE(SUM(CASE 
          WHEN LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida') 
          OR LOWER(COALESCE("captura_cc",'')) = 'en proceso'
          THEN "monto_mnx" 
          ELSE 0 
        END),0) AS total_monto_en_disputa,
        COUNT(CASE 
          WHEN LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida') 
          OR LOWER(COALESCE("captura_cc",'')) = 'en proceso'
          THEN 1 
        END) AS aclaraciones_en_proceso,
        COUNT(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'ganada' THEN 1 END) AS aclaraciones_ganadas,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'ganada' THEN "monto_mnx" ELSE 0 END),0) AS monto_ganado
      FROM aclaraciones
      ${whereClause}
    `;
    const totalResult = await pool.query(totalQuery, values);

    // 2. Aclaraciones por mes
    const aclaracionesPorMesQuery = `
      SELECT "mes_peticion" as mes, COUNT(*) as cantidad, COALESCE(SUM("monto_mnx"),0) as monto
      FROM aclaraciones
      ${whereClause}
      GROUP BY "mes_peticion"
      ORDER BY 
        CASE "mes_peticion"
          WHEN 'ENERO' THEN 1 WHEN 'FEBRERO' THEN 2 WHEN 'MARZO' THEN 3
          WHEN 'ABRIL' THEN 4 WHEN 'MAYO' THEN 5 WHEN 'JUNIO' THEN 6
          WHEN 'JULIO' THEN 7 WHEN 'AGOSTO' THEN 8 WHEN 'SEPTIEMBRE' THEN 9
          WHEN 'OCTUBRE' THEN 10 WHEN 'NOVIEMBRE' THEN 11 WHEN 'DICIEMBRE' THEN 12
          ELSE 13 END
    `;
    const aclaracionesPorMes = (await pool.query(aclaracionesPorMesQuery, values)).rows;

    // 3. Estatus de documentación (por comentario)
    const estatusDocQuery = `
      SELECT 
        COALESCE("comentarios",'SIN COMENTARIO') as comentario, 
        COUNT(*) as cantidad
      FROM aclaraciones
      ${whereClause}
      GROUP BY comentario
      ORDER BY cantidad DESC
    `;
    const estatusDocRows = (await pool.query(estatusDocQuery, values)).rows;
    const totalDoc = estatusDocRows.reduce((acc, r) => acc + Number(r.cantidad), 0);
    const estatusDocumentacion = estatusDocRows.map(r => ({
      comentario: r.comentario,
      cantidad: Number(r.cantidad),
      porcentaje: totalDoc ? Math.round((Number(r.cantidad) / totalDoc) * 100) : 0
    }));

    // 4. Top 10 bloques por aclaraciones
    const topBloquesQuery = `
      SELECT "bloque", COUNT(*) as cantidad 
      FROM aclaraciones 
      ${whereClause} 
      GROUP BY "bloque" 
      ORDER BY cantidad DESC  
      LIMIT 10
    `;
    const topBloques = (await pool.query(topBloquesQuery, values)).rows;

    // 5. Top 10 sucursales por aclaraciones
    const topSucursalesQuery = `
      SELECT "sucursal", COUNT(*) as cantidad 
      FROM aclaraciones 
      ${whereClause} 
      GROUP BY "sucursal" 
      ORDER BY cantidad DESC 
      LIMIT 10
    `;
    const topSucursales = (await pool.query(topSucursalesQuery, values)).rows;

    // 6. Top 10 bloques por monto
    const topBloquesMonto = (await pool.query(
      `SELECT "bloque", COALESCE(SUM("monto_mnx"),0) as monto FROM aclaraciones ${whereClause} GROUP BY "bloque" ORDER BY monto DESC LIMIT 10`, values
    )).rows;

    // 7. Top 10 sucursales por monto
    const topSucursalesMonto = (await pool.query(
      `SELECT "sucursal", COALESCE(SUM("monto_mnx"),0) as monto FROM aclaraciones ${whereClause} GROUP BY "sucursal" ORDER BY monto DESC LIMIT 10`, values
    )).rows;

    // 8. Top 10 vendedoras por aclaraciones
    const topVendedoras = (await pool.query(
      `SELECT "vendedora", COUNT(*) as cantidad FROM aclaraciones ${whereClause} GROUP BY "vendedora" ORDER BY cantidad DESC LIMIT 10`, values
    )).rows;

    // 9. Top 10 vendedoras por monto
    const topVendedorasMonto = (await pool.query(
      `SELECT "vendedora", COUNT(*) as cantidad, COALESCE(SUM("monto_mnx"),0) as monto FROM aclaraciones ${whereClause} GROUP BY "vendedora" ORDER BY monto DESC LIMIT 10`, values
    )).rows;

    // 10. Vendedores con documentación incompleta
    let whereIncompletos = [...where];
    let valuesIncompletos = [...values];
    
    whereIncompletos.push(`LOWER(COALESCE("comentarios",'')) <> 'completo'`);
    const whereClauseIncompletos = whereIncompletos.length ? `WHERE ${whereIncompletos.join(" AND ")}` : "";
    
    const vendedoresIncompletos = (await pool.query(
      `SELECT "vendedora", COUNT(*) as cantidad FROM aclaraciones ${whereClauseIncompletos} GROUP BY "vendedora" ORDER BY cantidad DESC LIMIT 10`, 
      valuesIncompletos
    )).rows;

    // 11. Resolución por mes
    const resolucionPorMes = (await pool.query(`
      SELECT 
        "mes_peticion" as mes,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) = 'ganada') as ganadas,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) = 'perdida') as perdidas,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida')) as "enProceso",
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida') THEN "monto_mnx" ELSE 0 END),0) as "montoEnDisputa",
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'ganada' THEN "monto_mnx" ELSE 0 END),0) as "montoDefendido",
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'perdida' THEN "monto_mnx" ELSE 0 END),0) as "montoPerdido"
      FROM aclaraciones
      ${whereClause}
      GROUP BY "mes_peticion"
      ORDER BY 
        CASE "mes_peticion"
          WHEN 'ENERO' THEN 1 WHEN 'FEBRERO' THEN 2 WHEN 'MARZO' THEN 3
          WHEN 'ABRIL' THEN 4 WHEN 'MAYO' THEN 5 WHEN 'JUNIO' THEN 6
          WHEN 'JULIO' THEN 7 WHEN 'AGOSTO' THEN 8 WHEN 'SEPTIEMBRE' THEN 9
          WHEN 'OCTUBRE' THEN 10 WHEN 'NOVIEMBRE' THEN 11 WHEN 'DICIEMBRE' THEN 12
          ELSE 13 END
    `, values)).rows;

    // 12. Top 10 sucursales que han perdido más dinero
    let wherePerdidas = [...where];
    let valuesPerdidas = [...values];
    
    wherePerdidas.push(`LOWER(COALESCE("captura_cc",'')) = 'perdida'`);
    const whereClausePerdidas = wherePerdidas.length ? `WHERE ${wherePerdidas.join(" AND ")}` : "";
    
    const topSucursalesPerdidas = (await pool.query(
      `SELECT "sucursal", COALESCE(SUM("monto_mnx"),0) as monto_perdido FROM aclaraciones ${whereClausePerdidas} GROUP BY "sucursal" ORDER BY monto_perdido DESC LIMIT 10`, 
      valuesPerdidas
    )).rows;

    // 13. 📊 NUEVO: Aclaraciones por procesador con estado (En proceso, Ganadas, Perdidas)
    const aclaracionesPorProcesadorQuery = `
      SELECT 
        "procesador",
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) = 'ganada') as ganadas,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) = 'perdida') as perdidas,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida') 
                        OR LOWER(COALESCE("captura_cc",'')) = 'en proceso') as "enProceso",
        COALESCE(SUM("monto_mnx"),0) as monto_total,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'ganada' THEN "monto_mnx" ELSE 0 END),0) as monto_ganado,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) = 'perdida' THEN "monto_mnx" ELSE 0 END),0) as monto_perdido,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE("captura_cc",'')) NOT IN ('ganada','perdida') 
                         OR LOWER(COALESCE("captura_cc",'')) = 'en proceso' THEN "monto_mnx" ELSE 0 END),0) as monto_en_proceso
      FROM aclaraciones
      ${whereClause}
      GROUP BY "procesador"
      ORDER BY total DESC
    `;
    const aclaracionesPorProcesador = (await pool.query(aclaracionesPorProcesadorQuery, values)).rows;

    // ✅ RESPUESTA CORREGIDA: Devolver datos estructurados correctamente
    res.json({
      total: {
        totalAclaraciones: Number(totalResult.rows[0].total_aclaraciones),
        totalMontoGeneral: Number(totalResult.rows[0].total_monto_general),
        totalMontoEnDisputa: Number(totalResult.rows[0].total_monto_en_disputa),
        aclaracionesEnProceso: Number(totalResult.rows[0].aclaraciones_en_proceso),
        aclaracionesGanadas: Number(totalResult.rows[0].aclaraciones_ganadas),
        montoGanado: Number(totalResult.rows[0].monto_ganado)
      },
      aclaracionesPorMes,
      estatusDocumentacion,
      topBloques,
      topSucursales,
      topBloquesMonto,
      topSucursalesMonto,
      topVendedoras,
      topVendedorasMonto,
      vendedoresIncompletos,
      resolucionPorMes,
      topSucursalesPerdidas,
      aclaracionesPorProcesador
    });
  } catch (error) {
    console.error("Error en dashboard de aclaraciones:", error);
    res.status(500).json({ error: "Error al obtener datos del dashboard de aclaraciones" });
  }
});

// ================= 💳 DASHBOARD SUCURSALES TARJETAS DUPLICADAS =================
app.get("/dashboard-tarjetas-duplicadas", async (req, res) => {
  try {
    console.log("🔍 Obteniendo estadísticas de sucursales con tarjetas duplicadas...");
    console.log("📝 Query params recibidos:", req.query);
    
    const { fechaInicio, fechaFin } = req.query;
    
    // Construir la condición de fecha si se proporcionan los parámetros
    let fechaCondicion = '';
    if (fechaInicio && fechaFin) {
      fechaCondicion = `AND "FechaCompra" BETWEEN '${fechaInicio}' AND '${fechaFin}'`;
      console.log(`📅 Filtrando por fechas: ${fechaInicio} - ${fechaFin}`);
    } else if (fechaInicio) {
      fechaCondicion = `AND "FechaCompra" >= '${fechaInicio}'`;
      console.log(`📅 Filtrando desde: ${fechaInicio}`);
    } else if (fechaFin) {
      fechaCondicion = `AND "FechaCompra" <= '${fechaFin}'`;
      console.log(`📅 Filtrando hasta: ${fechaFin}`);
    }
    
    console.log('🔍 Condición de fecha construida:', fechaCondicion);
    
    const query = `
      WITH tarjetas_limpias AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM("Tarjeta") as Tarjeta
        FROM "ventas"
        WHERE "Tarjeta" IS NOT NULL 
          AND "Tarjeta" != '' 
          AND "Tarjeta" != 'null'
          AND LENGTH(TRIM("Tarjeta")) >= 12
          AND TRIM("Tarjeta") ~ '^[0-9]+$'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND "Sucursal" IS NOT NULL 
          AND "Sucursal" != '' 
          AND "Sucursal" != 'null'
          ${fechaCondicion}
      ),
      tarjetas_duplicadas_por_sucursal AS (
        SELECT 
          sucursal,
          tarjeta,
          COUNT(DISTINCT cliente) as clientes_distintos_por_tarjeta,
          COUNT(*) as registros_tarjeta,
          STRING_AGG(DISTINCT cliente, ' | ') as clientes_de_tarjeta,
          MAX("FechaCompra") as ultima_fecha_uso
        FROM tarjetas_limpias
        GROUP BY sucursal, tarjeta
        HAVING COUNT(DISTINCT cliente) > 1
      ),
      resumen_sucursales AS (
        SELECT 
          sucursal,
          COUNT(*) as total_tarjetas_duplicadas,
          SUM(clientes_distintos_por_tarjeta) as total_clientes_afectados,
          SUM(registros_tarjeta) as total_registros_problema,
          AVG(clientes_distintos_por_tarjeta) as promedio_clientes_por_tarjeta,
          MAX(clientes_distintos_por_tarjeta) as max_clientes_en_una_tarjeta,
          COUNT(CASE WHEN clientes_distintos_por_tarjeta >= 4 THEN 1 END) as tarjetas_alto_riesgo,
          COUNT(CASE WHEN clientes_distintos_por_tarjeta = 3 THEN 1 END) as tarjetas_medio_riesgo,
          COUNT(CASE WHEN clientes_distintos_por_tarjeta = 2 THEN 1 END) as tarjetas_bajo_riesgo
        FROM tarjetas_duplicadas_por_sucursal
        GROUP BY sucursal
      )
      SELECT 
        sucursal,
        total_tarjetas_duplicadas as tarjetas_duplicadas,
        total_clientes_afectados as clientes_afectados,
        total_registros_problema,
        ROUND(promedio_clientes_por_tarjeta, 2) as promedio_clientes_por_tarjeta,
        max_clientes_en_una_tarjeta,
        tarjetas_alto_riesgo,
        tarjetas_medio_riesgo,
        tarjetas_bajo_riesgo,
        CASE 
          WHEN tarjetas_alto_riesgo > 0 THEN 'Alto'
          WHEN tarjetas_medio_riesgo > 0 THEN 'Medio'
          ELSE 'Bajo'
        END as nivel_riesgo_sucursal
      FROM resumen_sucursales
      ORDER BY total_tarjetas_duplicadas DESC, total_clientes_afectados DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Procesadas ${result.rows.length} sucursales con tarjetas duplicadas`);
    
    // Calcular estadísticas generales
    const totalTarjetasDuplicadas = result.rows.reduce((sum, row) => sum + parseInt(row.tarjetas_duplicadas), 0);
    const totalClientesAfectados = result.rows.reduce((sum, row) => sum + parseInt(row.clientes_afectados), 0);
    const sucursalesAltoRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Alto').length;
    const sucursalesMedioRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Medio').length;
    const sucursalesBajoRiesgo = result.rows.filter(row => row.nivel_riesgo_sucursal === 'Bajo').length;

    const estadisticasGenerales = {
      total_sucursales: result.rows.length,
      total_tarjetas_duplicadas: totalTarjetasDuplicadas,
      total_clientes_afectados: totalClientesAfectados,
      sucursales_alto_riesgo: sucursalesAltoRiesgo,
      sucursales_medio_riesgo: sucursalesMedioRiesgo,
      sucursales_bajo_riesgo: sucursalesBajoRiesgo,
      promedio_tarjetas_por_sucursal: Math.round(totalTarjetasDuplicadas / result.rows.length)
    };

    res.json({
      estadisticas_generales: estadisticasGenerales,
      sucursales: result.rows
    });

  } catch (error) {
    console.error("❌ Error al obtener dashboard de tarjetas duplicadas:", error);
    res.status(500).json({ 
      error: "Error al obtener estadísticas de tarjetas duplicadas",
      message: error.message 
    });
  }
});

// 💳 Endpoint para obtener tarjetas duplicadas de una sucursal específica
app.get("/validar-tarjetas/sucursal/:sucursal", async (req, res) => {
  try {
    const { sucursal } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    console.log(`🔍 Obteniendo tarjetas duplicadas para la sucursal: ${sucursal}`);
    
    // Construir la condición de fecha si se proporcionan los parámetros
    let fechaCondicion = '';
    if (fechaInicio && fechaFin) {
      fechaCondicion = `AND "FechaCompra" BETWEEN '${fechaInicio}' AND '${fechaFin}'`;
      console.log(`📅 Filtrando por fechas: ${fechaInicio} - ${fechaFin}`);
    } else if (fechaInicio) {
      fechaCondicion = `AND "FechaCompra" >= '${fechaInicio}'`;
      console.log(`📅 Filtrando desde: ${fechaInicio}`);
    } else if (fechaFin) {
      fechaCondicion = `AND "FechaCompra" <= '${fechaFin}'`;
      console.log(`📅 Filtrando hasta: ${fechaFin}`);
    }
    
    const query = `
      WITH tarjetas_limpias AS (
        SELECT 
          "ID",
          TRIM("Cliente") as cliente,
          TRIM("Sucursal") as sucursal,
          "FechaCompra",
          TRIM("Tarjeta") as tarjeta
        FROM "ventas"
        WHERE "Tarjeta" IS NOT NULL 
          AND "Tarjeta" != '' 
          AND "Tarjeta" != 'null'
          AND LENGTH(TRIM("Tarjeta")) >= 12
          AND TRIM("Tarjeta") ~ '^[0-9]+$'
          AND "Cliente" IS NOT NULL 
          AND "Cliente" != '' 
          AND "Cliente" != 'null'
          AND TRIM("Sucursal") = $1
          ${fechaCondicion}
      ),
      tarjetas_duplicadas AS (
        SELECT 
          tarjeta,
          COUNT(DISTINCT cliente) as clientesDistintos,
          COUNT(*) as vecesUsado,
          MAX("FechaCompra") as ultimaFechaRegistro,
          STRING_AGG(DISTINCT cliente, ' | ' ORDER BY cliente) as clientes
        FROM tarjetas_limpias
        GROUP BY tarjeta
        HAVING COUNT(DISTINCT cliente) > 1
      )
      SELECT 
        tarjeta,
        clientesDistintos,
        vecesUsado,
        ultimaFechaRegistro,
        clientes
      FROM tarjetas_duplicadas
      ORDER BY clientesDistintos DESC, vecesUsado DESC, tarjeta
    `;

    const result = await pool.query(query, [sucursal]);
    
    console.log(`✅ Encontradas ${result.rows.length} tarjetas duplicadas en ${sucursal}`);
    
    // Formatear los datos para mejor legibilidad
    const datosProcesados = result.rows.map(row => ({
      ...row,
      tarjeta: row.tarjeta,
      clientesDistintos: parseInt(row.clientesdistintos),
      vecesUsado: parseInt(row.vecesusado),
      ultimaFechaRegistro: row.ultimafecharegistro,
      clientes: row.clientes ? row.clientes.split(' | ') : []
    }));

    res.json({
      sucursal: sucursal,
      total_tarjetas_duplicadas: datosProcesados.length,
      datos: datosProcesados
    });

  } catch (error) {
    console.error(`❌ Error al obtener tarjetas duplicadas de ${req.params.sucursal}:`, error);
    res.status(500).json({ 
      error: "Error al obtener tarjetas duplicadas de la sucursal",
      message: error.message 
    });
  }
});

// ====================  HEALTH CHECK PARA RENDER/RAILWAY ====================
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    
    // Información de la request para debugging CORS
    requestInfo: {
      origin: req.headers.origin || 'no-origin',
      referer: req.headers.referer || 'no-referer',
      userAgent: req.headers['user-agent'] || 'no-user-agent',
      host: req.headers.host || 'no-host',
      method: req.method
    },
    
    // Headers CORS aplicados
    corsHeaders: {
      'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
      'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      'access-control-allow-methods': res.getHeader('access-control-allow-methods')
    },
    
    // Configuración de base de datos
    database: {
      connected: !!pool,
      host: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT CONFIGURED]'
    }
  };
  
  console.log('🩺 Health check request from:', healthInfo.requestInfo.origin);
  
  res.status(200).json(healthInfo);
});

// 🔍 Endpoint específico para testing CORS desde cargosfraudes.onrender.com
app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS Test request from:', req.headers.origin);
  res.json({
    success: true,
    message: 'CORS está funcionando correctamente',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    allowedOrigin: res.getHeader('access-control-allow-origin'),
    allHeaders: Object.keys(req.headers)
  });
});

// ====================  HEALTH CHECK ENDPOINT ====================
// Endpoint para keep-alive (mantener el servicio activo)
app.get('/health-check', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    service: 'Backend API',
    message: 'Servicio funcionando correctamente'
  };
  
  console.log(`🏓 Health check realizado - Uptime: ${Math.floor(process.uptime() / 60)}m`);
  res.status(200).json(healthStatus);
});

// ==================== GESTIÓN DE BINs ====================

// Función para inicializar la tabla de BINs
async function inicializarTablaBins() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bins_cache (
        id SERIAL PRIMARY KEY,
        bin VARCHAR(8) UNIQUE NOT NULL,
        banco VARCHAR(255),
        tipo VARCHAR(100),
        marca VARCHAR(100),
        pais VARCHAR(100),
        fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fuente VARCHAR(50) DEFAULT 'binlookup'
      )
    `);
    
    // Agregar columna fecha_consulta si no existe
    try {
      await pool.query(`
        ALTER TABLE bins_cache 
        ADD COLUMN IF NOT EXISTS fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (alterError) {
      console.log('Columna fecha_consulta ya existe o error:', alterError.message);
    }

    // Actualizar el tipo de dato de varios campos si es necesario
    try {
      await pool.query(`
        ALTER TABLE bins_cache 
        ALTER COLUMN banco TYPE VARCHAR(255),
        ALTER COLUMN tipo TYPE VARCHAR(100),
        ALTER COLUMN marca TYPE VARCHAR(100),
        ALTER COLUMN pais TYPE VARCHAR(100)
      `);
      console.log('✅ Campos de bins_cache actualizados correctamente');
    } catch (alterError) {
      console.log('Campos ya tienen el tipo correcto o error:', alterError.message);
    }

    // Agregar columna fuente si no existe
    try {
      await pool.query(`
        ALTER TABLE bins_cache 
        ADD COLUMN IF NOT EXISTS fuente VARCHAR(50) DEFAULT 'binlookup'
      `);
    } catch (alterError) {
      // Ignorar error si la columna ya existe
      console.log("📝 Columna fecha_consulta ya existe o no se pudo agregar");
    }
    
    console.log("✅ Tabla bins_cache inicializada correctamente");
  } catch (error) {
    console.error("❌ Error inicializando tabla bins_cache:", error);
  }
}

// Función para buscar BIN en base de datos
async function buscarBinEnBD(bin) {
  try {
    // Primero intentar búsqueda exacta
    let result = await pool.query(
      'SELECT * FROM bins_cache WHERE bin = $1',
      [bin]
    );
    
    if (result.rows[0]) {
      console.log(`✅ BIN ${bin} encontrado con coincidencia exacta`);
      return result.rows[0];
    }
    
    // Si no hay coincidencia exacta, buscar por los primeros 6 dígitos
    const bin6 = bin.substring(0, 6);
    result = await pool.query(
      'SELECT * FROM bins_cache WHERE bin LIKE $1',
      [bin6 + '%']
    );
    
    if (result.rows[0]) {
      console.log(`✅ BIN ${bin} encontrado con coincidencia parcial (${bin6}...)`);
      return result.rows[0];
    }
    
    // Si aún no hay coincidencia, buscar BINs que empiecen con este patrón
    if (bin.length >= 6) {
      result = await pool.query(
        'SELECT * FROM bins_cache WHERE $1 LIKE bin || \'%\'',
        [bin]
      );
      
      if (result.rows[0]) {
        console.log(`✅ BIN ${bin} encontrado con patrón de inicio`);
        return result.rows[0];
      }
    }
    
    console.log(`❌ BIN ${bin} no encontrado en ningún patrón de búsqueda`);
    return null;
  } catch (error) {
    console.error("❌ Error buscando BIN en BD:", error);
    return null;
  }
}

// Endpoint para reinicializar la tabla bins_cache
app.post('/api/reinicializar-tabla-bins', async (req, res) => {
  try {
    // Eliminar la tabla existente
    await pool.query(`DROP TABLE IF EXISTS bins_cache`);
    console.log('🗑️ Tabla bins_cache eliminada');
    
    // Crear la tabla con la estructura correcta
    await pool.query(`
      CREATE TABLE bins_cache (
        id SERIAL PRIMARY KEY,
        bin VARCHAR(8) UNIQUE NOT NULL,
        banco VARCHAR(255),
        tipo VARCHAR(100),
        marca VARCHAR(100),
        pais VARCHAR(100),
        fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fuente VARCHAR(50) DEFAULT 'binlookup'
      )
    `);
    console.log('✅ Tabla bins_cache creada con estructura correcta');
    
    res.json({ 
      success: true, 
      message: 'Tabla bins_cache reinicializada correctamente' 
    });
  } catch (error) {
    console.error('❌ Error reinicializando tabla:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error reinicializando tabla: ' + error.message 
    });
  }
});

// Configuración de múltiples APIs para BINs
const APIS_CONFIG = {
  rapidapi1: {
    name: 'RapidAPI BIN Checker #1',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '6ad4c5cf02mshf5745757f190968p162676jsnd766f7b32def'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi2: {
    name: 'RapidAPI BIN Checker #2',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '6342e9a39emsh9d543435adb3677p12e586jsndf6fe804ffba'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi3: {
    name: 'RapidAPI BIN Checker #3',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '7bdad0b057mshba8dca97f24372fp196d01jsnee1979384c24'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi4: {
    name: 'RapidAPI BIN Checker #4',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '6e827ed6b3mshfe180f297e89e62p198964jsn48b4879a920a'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi5: {
    name: 'RapidAPI BIN Checker #5',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': 'cbff016dd9msh2828672cd97d7b3p1c6bc9jsn9d68f70cdd48'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi6: {
    name: 'RapidAPI BIN Checker #6',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '99a9a534a8msh5b7ac5c5521b5abp18822ajsn3821f0b1aabf'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi7: {
    name: 'RapidAPI BIN Checker #7',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '1ac7a93f04msh60471f41841327bp11110ajsnaaf26667e628'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi8: {
    name: 'RapidAPI BIN Checker #8',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': '0b3d4fbdc8mshc4c891c0a55ad25p168f45jsnd8f320f5a2db'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  rapidapi9: {
    name: 'RapidAPI BIN Checker #9',
    url: 'https://bin-ip-checker.p.rapidapi.com/',
    headers: {
      'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
      'x-rapidapi-key': 'e0e0c84115msha59dbb538655099p1a59dajsn1839c29d1b99'
    },
    rateLimitPerHour: 500,
    enabled: true
  },
  binlist: {
    name: 'BinList.net (Fallback)',
    url: 'https://lookup.binlist.net/',
    headers: {
      'Accept-Version': '3',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    rateLimitPerHour: 5,
    enabled: true
  }
};

// Sistema de seguimiento de rate limits por API
const API_RATE_LIMITS = {};

// Función para buscar BIN usando múltiples APIs
async function buscarBinEnMultiplesAPIs(bin) {
  const apisDisponibles = Object.entries(APIS_CONFIG)
    .filter(([key, config]) => config.enabled)
    .sort((a, b) => (b[1].rateLimitPerHour || 0) - (a[1].rateLimitPerHour || 0)); // Ordenar por rate limit

  console.log(`🔍 Iniciando búsqueda de BIN ${bin} en ${apisDisponibles.length} APIs disponibles`);

  for (const [apiKey, apiConfig] of apisDisponibles) {
    try {
      console.log(`🌐 Intentando con ${apiConfig.name}...`);
      
      // Verificar rate limit de esta API
      if (await verificarRateLimit(apiKey)) {
        console.log(`⏰ Rate limit alcanzado para ${apiConfig.name}, saltando...`);
        continue;
      }

      const resultado = await consultarAPI(apiKey, bin);
      if (resultado) {
        console.log(`✅ BIN ${bin} encontrado exitosamente en ${apiConfig.name}`);
        await registrarUsoAPI(apiKey);
        return resultado;
      }
    } catch (error) {
      console.log(`❌ Error con ${apiConfig.name}: ${error.message}`);
      continue;
    }
  }

  console.log(`❌ BIN ${bin} no encontrado en ninguna API disponible`);
  return null;
}

// Función para consultar una API específica
async function consultarAPI(apiKey, bin) {
  const config = APIS_CONFIG[apiKey];
  
  if (apiKey.startsWith('rapidapi')) {
    return await consultarRapidAPI(bin, config);
  } else if (apiKey === 'binlist') {
    return await consultarBinList(bin);
  } else {
    throw new Error(`API ${apiKey} no implementada`);
  }
}

// Función específica para RapidAPI (acepta config personalizada)
async function consultarRapidAPI(bin, config = APIS_CONFIG.rapidapi1) {
  const response = await axios.get(`https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`, {
    timeout: 15000,
    headers: config.headers
  });

  if (response.data && response.data.BIN) {
    const apiData = response.data.BIN;
    
    let bancoNombre = 'Desconocido';
    if (apiData.issuer && typeof apiData.issuer === 'object' && apiData.issuer.name) {
      bancoNombre = apiData.issuer.name;
    } else if (typeof apiData.issuer === 'string') {
      bancoNombre = apiData.issuer;
    } else if (apiData.bank && typeof apiData.bank === 'object' && apiData.bank.name) {
      bancoNombre = apiData.bank.name;
    } else if (typeof apiData.bank === 'string') {
      bancoNombre = apiData.bank;
    }
    
    bancoNombre = String(bancoNombre);
    
    return {
      bin: bin,
      banco: bancoNombre.substring(0, 255),
      tipo: apiData.type || 'Desconocido',
      marca: apiData.brand || apiData.scheme || 'Desconocido',
      pais: apiData.country?.name || apiData.country_name || 'Desconocido',
      fuente: `rapidapi_${config.name.split('#')[1] || '1'}`
    };
  }
  return null;
}

// Función específica para BinList
async function consultarBinList(bin) {
  const response = await axios.get(`https://lookup.binlist.net/${bin}`, {
    timeout: 10000,
    headers: APIS_CONFIG.binlist.headers
  });

  if (response.data) {
    return {
      bin: bin,
      banco: response.data.bank?.name || 'Desconocido',
      tipo: response.data.type || 'Desconocido',
      marca: response.data.brand || response.data.scheme || 'Desconocido',
      pais: response.data.country?.name || 'Desconocido',
      fuente: 'binlist'
    };
  }
  return null;
}

// Sistema de rate limiting
async function verificarRateLimit(apiKey) {
  const now = Date.now();
  const hora = Math.floor(now / (1000 * 60 * 60)); // Hora actual
  
  if (!API_RATE_LIMITS[apiKey]) {
    API_RATE_LIMITS[apiKey] = {};
  }
  
  const usos = API_RATE_LIMITS[apiKey][hora] || 0;
  const limite = APIS_CONFIG[apiKey].rateLimitPerHour || 1000;
  
  return usos >= limite;
}

async function registrarUsoAPI(apiKey) {
  const now = Date.now();
  const hora = Math.floor(now / (1000 * 60 * 60));
  
  if (!API_RATE_LIMITS[apiKey]) {
    API_RATE_LIMITS[apiKey] = {};
  }
  
  API_RATE_LIMITS[apiKey][hora] = (API_RATE_LIMITS[apiKey][hora] || 0) + 1;
  
  // Limpiar datos antiguos (más de 2 horas)
  Object.keys(API_RATE_LIMITS[apiKey]).forEach(h => {
    if (parseInt(h) < hora - 2) {
      delete API_RATE_LIMITS[apiKey][h];
    }
  });
}

// Endpoint para obtener información de APIs disponibles
app.get('/api/apis-info', async (req, res) => {
  try {
    const apisInfo = Object.entries(APIS_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      enabled: config.enabled,
      rateLimitPerHour: config.rateLimitPerHour,
      usosActuales: obtenerUsosActuales(key)
    }));

    res.json({
      success: true,
      data: apisInfo,
      totalAPIs: apisInfo.length,
      apisHabilitadas: apisInfo.filter(api => api.enabled).length
    });
  } catch (error) {
    console.error('❌ Error obteniendo info de APIs:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información de APIs'
    });
  }
});

// Endpoint para configurar APIs
app.post('/api/configurar-api', async (req, res) => {
  try {
    const { apiKey, config } = req.body;
    
    if (!APIS_CONFIG[apiKey]) {
      return res.status(404).json({
        success: false,
        message: 'API no encontrada'
      });
    }

    // Actualizar configuración
    APIS_CONFIG[apiKey] = { ...APIS_CONFIG[apiKey], ...config };
    
    console.log(`⚙️ API ${apiKey} configurada:`, config);
    
    res.json({
      success: true,
      message: `API ${apiKey} configurada correctamente`,
      data: APIS_CONFIG[apiKey]
    });
  } catch (error) {
    console.error('❌ Error configurando API:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error configurando API'
    });
  }
});

function obtenerUsosActuales(apiKey) {
  const now = Date.now();
  const hora = Math.floor(now / (1000 * 60 * 60));
  return API_RATE_LIMITS[apiKey]?.[hora] || 0;
}

// Endpoint para buscar BIN usando una API específica
app.post('/api/buscar-bin-api-especifica', async (req, res) => {
  try {
    const { bin, apiKey } = req.body;

    if (!bin || bin.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'El BIN debe tener al menos 6 dígitos'
      });
    }

    if (!APIS_CONFIG[apiKey] || !APIS_CONFIG[apiKey].enabled) {
      return res.status(400).json({
        success: false,
        message: 'API no disponible o no habilitada'
      });
    }

    const binLimpio = bin.toString().substring(0, 8);
    console.log(`🔍 Buscando BIN ${binLimpio} específicamente en ${APIS_CONFIG[apiKey].name}`);

    const resultado = await consultarAPI(apiKey, binLimpio);

    if (resultado) {
      // Guardar en base de datos
      await pool.query(`
        INSERT INTO bins_cache (bin, banco, tipo, marca, pais, fuente)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (bin) DO UPDATE SET
          banco = EXCLUDED.banco,
          tipo = EXCLUDED.tipo,
          marca = EXCLUDED.marca,
          pais = EXCLUDED.pais
      `, [resultado.bin, resultado.banco, resultado.tipo, resultado.marca, resultado.pais, resultado.fuente]);

      await registrarUsoAPI(apiKey);

      res.json({
        success: true,
        data: resultado,
        api_utilizada: APIS_CONFIG[apiKey].name
      });
    } else {
      res.status(404).json({
        success: false,
        message: `BIN no encontrado en ${APIS_CONFIG[apiKey].name}`
      });
    }
  } catch (error) {
    console.error(`❌ Error buscando en API específica:`, error);
    res.status(500).json({
      success: false,
      message: 'Error consultando API específica'
    });
  }
});

// Función para buscar BIN en API externa (RapidAPI)
async function buscarBinEnAPI(bin) {
  try {
    console.log(`🔍 Consultando RapidAPI para BIN: ${bin}`);
    const response = await axios.get(`https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`, {
      timeout: 15000,
      headers: {
        'x-rapidapi-host': 'bin-ip-checker.p.rapidapi.com',
        'x-rapidapi-key': '6ad4c5cf02mshf5745757f190968p162676jsnd766f7b32def'
      }
    });

    console.log(`📊 Respuesta de RapidAPI:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.BIN) {
      const apiData = response.data.BIN;
      
      // Extraer el nombre del banco correctamente
      let bancoNombre = 'Desconocido';
      if (apiData.issuer && typeof apiData.issuer === 'object' && apiData.issuer.name) {
        bancoNombre = apiData.issuer.name;
      } else if (typeof apiData.issuer === 'string') {
        bancoNombre = apiData.issuer;
      } else if (apiData.bank && typeof apiData.bank === 'object' && apiData.bank.name) {
        bancoNombre = apiData.bank.name;
      } else if (typeof apiData.bank === 'string') {
        bancoNombre = apiData.bank;
      }
      
      // Asegurar que bancoNombre sea una cadena antes de usar substring
      bancoNombre = String(bancoNombre);
      
      const binData = {
        bin: bin,
        banco: bancoNombre.substring(0, 255), // Truncar a 255 caracteres por seguridad
        tipo: apiData.type || 'Desconocido',
        marca: apiData.brand || apiData.scheme || 'Desconocido',
        pais: apiData.country?.name || apiData.country_name || 'Desconocido',
        fuente: 'rapidapi'
      };

      console.log(`📋 Datos procesados:`, JSON.stringify(binData, null, 2));

      // Guardar en base de datos
      await pool.query(`
        INSERT INTO bins_cache (bin, banco, tipo, marca, pais, fuente)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (bin) DO UPDATE SET
          banco = EXCLUDED.banco,
          tipo = EXCLUDED.tipo,
          marca = EXCLUDED.marca,
          pais = EXCLUDED.pais
      `, [binData.bin, binData.banco, binData.tipo, binData.marca, binData.pais, binData.fuente]);

      console.log(`✅ BIN ${bin} consultado y guardado exitosamente desde RapidAPI`);
      return binData;
    }
  } catch (error) {
    console.error(`❌ Error consultando RapidAPI para BIN ${bin}:`, error.message);
    
    // Si hay error de rate limit (429), devolver información específica
    if (error.response?.status === 429) {
      console.log(`🚫 Rate limit alcanzado en RapidAPI para BIN ${bin}`);
      return {
        bin: bin,
        banco: 'Rate limit alcanzado',
        tipo: 'Consultar más tarde',
        marca: 'Límite de API',
        pais: 'Desconocido',
        fuente: 'rate_limit'
      };
    }
    
    // Si es error 404, el BIN no existe
    if (error.response?.status === 404) {
      console.log(`❓ BIN ${bin} no encontrado en RapidAPI`);
      return {
        bin: bin,
        banco: 'BIN no encontrado',
        tipo: 'No disponible',
        marca: 'No disponible',
        pais: 'No disponible',
        fuente: 'not_found'
      };
    }

    // Si hay otros errores, intentar con binlist.net como fallback
    try {
      console.log(`🔄 Intentando API de fallback (binlist.net) para BIN: ${bin}`);
      const fallbackResponse = await axios.get(`https://lookup.binlist.net/${bin}`, {
        timeout: 10000,
        headers: {
          'Accept-Version': '3',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log(`📊 Respuesta de API fallback:`, JSON.stringify(fallbackResponse.data, null, 2));

      if (fallbackResponse.data) {
        const binData = {
          bin: bin,
          banco: fallbackResponse.data.bank?.name || 'Desconocido',
          tipo: fallbackResponse.data.type || 'Desconocido',
          marca: fallbackResponse.data.brand || fallbackResponse.data.scheme || 'Desconocido',
          pais: fallbackResponse.data.country?.name || 'Desconocido',
          fuente: 'binlookup_fallback'
        };

        console.log(`📋 Datos procesados (fallback):`, JSON.stringify(binData, null, 2));

        // Guardar en base de datos
        await pool.query(`
          INSERT INTO bins_cache (bin, banco, tipo, marca, pais, fuente)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (bin) DO UPDATE SET
            banco = EXCLUDED.banco,
            tipo = EXCLUDED.tipo,
            marca = EXCLUDED.marca,
            pais = EXCLUDED.pais
        `, [binData.bin, binData.banco, binData.tipo, binData.marca, binData.pais, binData.fuente]);

        console.log(`✅ BIN ${bin} consultado con API fallback y guardado`);
        return binData;
      }
    } catch (fallbackError) {
      console.error(`❌ Error con API fallback para BIN ${bin}:`, fallbackError.message);
    }
    
    return null;
  }
}

// Endpoint para buscar un BIN específico
app.post('/api/buscar-bin', async (req, res) => {
  try {
    const { bin } = req.body;

    if (!bin || bin.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'El BIN debe tener al menos 6 dígitos'
      });
    }

    // Limpiar el BIN (tomar solo los primeros 6-8 dígitos)
    const binLimpio = bin.toString().substring(0, 8);

    console.log(`🔍 Buscando información para BIN: ${binLimpio} (solo en base de datos)`);

    // Buscar solo en la base de datos local
    let resultado = await buscarBinEnBD(binLimpio);
    
    if (resultado) {
      console.log(`✅ BIN ${binLimpio} encontrado en base de datos`);
      return res.json({
        success: true,
        data: resultado,
        fuente: 'base_de_datos'
      });
    }

    // Si no está en BD, no buscar en API - solo devolver que no se encontró
    console.log(`❌ BIN ${binLimpio} no encontrado en base de datos local`);
    return res.status(404).json({
      success: false,
      message: 'BIN no encontrado en base de datos local. Use el procesador masivo para obtener información de nuevos BINs.',
      bin: binLimpio,
      sugerencia: 'Utilice el "Procesador BINs Masivo" para consultar este BIN en las APIs externas'
    });

  } catch (error) {
    console.error("❌ Error en endpoint buscar-bin:", error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Endpoint para obtener estadísticas de BINs
app.get('/api/bins-stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_bins,
        COUNT(CASE WHEN banco != 'Desconocido' AND banco != 'Rate limit alcanzado (5/hora)' AND banco != 'BIN no encontrado' THEN 1 END) as bins_identificados,
        COUNT(DISTINCT banco) as bancos_unicos
      FROM bins_cache
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

// Endpoint para obtener los BINs más utilizados desde la tabla ventas
app.get('/api/bins-mas-utilizados', async (req, res) => {
  try {
    const { limit = 500 } = req.query;
    console.log(`🔍 Extrayendo los ${limit} BINs más utilizados de la base de datos...`);

    const query = `
      SELECT 
        LEFT(TRIM("Tarjeta"), 8) as bin,
        COUNT(*) as frecuencia,
        COUNT(DISTINCT "Cliente") as clientes_distintos,
        MAX("FechaCompra") as ultima_fecha,
        MIN("FechaCompra") as primera_fecha
      FROM "ventas"
      WHERE "Tarjeta" IS NOT NULL 
        AND "Tarjeta" != '' 
        AND "Tarjeta" != 'null'
        AND LENGTH(TRIM("Tarjeta")) >= 6
        AND TRIM("Tarjeta") ~ '^[0-9]+'
      GROUP BY LEFT(TRIM("Tarjeta"), 8)
      HAVING COUNT(*) >= 2
      ORDER BY frecuencia DESC, clientes_distintos DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    
    console.log(`✅ Encontrados ${result.rows.length} BINs únicos más utilizados`);
    
    // Verificar cuáles ya están en cache
    const binsEncontrados = result.rows.map(row => row.bin);
    const yaEnCache = await pool.query(`
      SELECT bin FROM bins_cache WHERE bin = ANY($1::text[])
    `, [binsEncontrados]);
    
    const binsYaEnCache = yaEnCache.rows.map(row => row.bin);
    const binsPendientes = result.rows.filter(row => !binsYaEnCache.includes(row.bin));
    
    console.log(`📊 Estadísticas de BINs:`);
    console.log(`- Total BINs encontrados: ${result.rows.length}`);
    console.log(`- Ya en cache: ${binsYaEnCache.length}`);
    console.log(`- Pendientes por consultar: ${binsPendientes.length}`);

    res.json({
      success: true,
      total_bins: result.rows.length,
      ya_en_cache: binsYaEnCache.length,
      pendientes_consulta: binsPendientes.length,
      bins_mas_utilizados: result.rows,
      bins_pendientes: binsPendientes
    });

  } catch (error) {
    console.error("❌ Error obteniendo BINs más utilizados:", error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo BINs más utilizados',
      error: error.message
    });
  }
});

// Endpoint para procesar BINs masivamente (con rate limiting inteligente)
// Endpoint para procesamiento distribuido paralelo entre múltiples APIs
app.post('/api/procesar-bins-distribuido', async (req, res) => {
  try {
    const { limit = 500, delayEntreLotes = 2000, soloFaltantes = true } = req.body;

    console.log(`🚀 Iniciando procesamiento distribuido de hasta ${limit} BINs`);

    // 1. Obtener BINs más utilizados
    const binsResult = await pool.query(`
      SELECT SUBSTRING("Tarjeta", 1, 8) as bin, COUNT(*) as frecuencia
      FROM ventas 
      WHERE "Tarjeta" IS NOT NULL AND LENGTH("Tarjeta") >= 6
      GROUP BY SUBSTRING("Tarjeta", 1, 8)
      ORDER BY frecuencia DESC
      LIMIT $1
    `, [limit]);

    const todosLosBins = binsResult.rows;

    let bins = todosLosBins;
    if (soloFaltantes) {
      // Filtrar solo los que no están en cache
      const binsEnCache = await pool.query(`
        SELECT bin FROM bins_cache 
        WHERE bin = ANY($1)
      `, [todosLosBins.map(b => b.bin)]);
      
      const binsExistentes = new Set(binsEnCache.rows.map(b => b.bin));
      bins = todosLosBins.filter(b => !binsExistentes.has(b.bin));
    }

    if (bins.length === 0) {
      return res.json({
        success: true,
        message: 'Todos los BINs ya están procesados',
        totalBins: 0
      });
    }

    // 2. Obtener APIs habilitadas
    const apisHabilitadas = Object.entries(APIS_CONFIG)
      .filter(([key, config]) => config.enabled)
      .map(([key]) => key);

    console.log(`📊 APIs habilitadas: ${apisHabilitadas.length}`);
    console.log(`📊 BINs a procesar: ${bins.length}`);

    // 3. Distribuir BINs entre APIs
    const binsDistribuidos = distribuirBinsEntreAPIs(bins, apisHabilitadas);

    // 4. Iniciar procesamiento en paralelo
    const resultados = await procesarEnParalelo(binsDistribuidos, delayEntreLotes);

    res.json({
      success: true,
      message: 'Procesamiento distribuido completado',
      resultados: resultados,
      estadisticas: calcularEstadisticas(resultados)
    });

  } catch (error) {
    console.error('❌ Error en procesamiento distribuido:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error en procesamiento distribuido: ' + error.message
    });
  }
});

// Función para distribuir BINs entre APIs de manera equitativa
function distribuirBinsEntreAPIs(bins, apis) {
  const distribucion = {};
  
  // Inicializar arrays para cada API
  apis.forEach(api => {
    distribucion[api] = [];
  });
  
  // Distribuir BINs de manera round-robin
  bins.forEach((bin, index) => {
    const apiIndex = index % apis.length;
    const apiKey = apis[apiIndex];
    distribucion[apiKey].push(bin);
  });
  
  // Log de la distribución
  console.log('📊 Distribución de BINs:');
  Object.entries(distribucion).forEach(([api, binsList]) => {
    console.log(`  ${APIS_CONFIG[api].name}: ${binsList.length} BINs`);
  });
  
  return distribucion;
}

// Función para procesar BINs en paralelo
async function procesarEnParalelo(distribucion, delayEntreLotes) {
  const promesasAPI = [];
  
  // Crear una promesa para cada API
  Object.entries(distribucion).forEach(([apiKey, bins]) => {
    if (bins.length > 0) {
      promesasAPI.push(procesarBinsConAPI(apiKey, bins, delayEntreLotes));
    }
  });
  
  console.log(`🚀 Iniciando ${promesasAPI.length} procesos en paralelo...`);
  
  // Ejecutar todas las APIs en paralelo
  const resultados = await Promise.all(promesasAPI);
  
  return resultados;
}

// Función para procesar una lista de BINs con una API específica
async function procesarBinsConAPI(apiKey, bins, delay) {
  const apiName = APIS_CONFIG[apiKey].name;
  const resultados = {
    api: apiName,
    apiKey: apiKey,
    totalBins: bins.length,
    exitosos: 0,
    errores: 0,
    rateLimited: 0,
    detalles: []
  };
  
  console.log(`🔄 [${apiName}] Iniciando procesamiento de ${bins.length} BINs`);
  
  for (let i = 0; i < bins.length; i++) {
    const binData = bins[i];
    const bin = binData.bin;
    
    try {
      console.log(`📤 [${apiName}] Procesando BIN ${bin} (${i + 1}/${bins.length})...`);
      
      // Verificar rate limit antes de procesar
      if (await verificarRateLimit(apiKey)) {
        console.log(`⏰ [${apiName}] Rate limit alcanzado, deteniendo procesamiento`);
        resultados.rateLimited = bins.length - i;
        break;
      }
      
      // Consultar la API específica
      const resultado = await consultarAPI(apiKey, bin);
      
      if (resultado) {
        // Guardar en base de datos
        await pool.query(`
          INSERT INTO bins_cache (bin, banco, tipo, marca, pais, fuente)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (bin) DO UPDATE SET
            banco = EXCLUDED.banco,
            tipo = EXCLUDED.tipo,
            marca = EXCLUDED.marca,
            pais = EXCLUDED.pais
        `, [resultado.bin, resultado.banco, resultado.tipo, resultado.marca, resultado.pais, resultado.fuente]);
        
        await registrarUsoAPI(apiKey);
        resultados.exitosos++;
        resultados.detalles.push({ bin, status: 'exitoso', banco: resultado.banco });
        console.log(`✅ [${apiName}] BIN ${bin} procesado exitosamente`);
      } else {
        resultados.errores++;
        resultados.detalles.push({ bin, status: 'no_encontrado' });
        console.log(`❌ [${apiName}] BIN ${bin} no encontrado`);
      }
      
      // Delay entre requests para evitar rate limiting
      if (i < bins.length - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`❌ [${apiName}] Error procesando BIN ${bin}:`, error.message);
      
      if (error.response?.status === 429) {
        console.log(`⏰ [${apiName}] Rate limit alcanzado en BIN ${bin}`);
        resultados.rateLimited = bins.length - i;
        break;
      }
      
      resultados.errores++;
      resultados.detalles.push({ bin, status: 'error', error: error.message });
    }
  }
  
  console.log(`🏁 [${apiName}] Completado: ${resultados.exitosos} exitosos, ${resultados.errores} errores, ${resultados.rateLimited} rate limited`);
  return resultados;
}

// Función para calcular estadísticas del procesamiento
function calcularEstadisticas(resultados) {
  const stats = {
    totalAPIsUsadas: resultados.length,
    totalBinsIntentados: resultados.reduce((sum, r) => sum + r.totalBins, 0),
    totalExitosos: resultados.reduce((sum, r) => sum + r.exitosos, 0),
    totalErrores: resultados.reduce((sum, r) => sum + r.errores, 0),
    totalRateLimited: resultados.reduce((sum, r) => sum + r.rateLimited, 0),
    tasaExito: 0,
    apisDetail: resultados.map(r => ({
      api: r.api,
      exitosos: r.exitosos,
      errores: r.errores,
      rateLimited: r.rateLimited,
      tasaExito: r.totalBins > 0 ? (r.exitosos / r.totalBins * 100).toFixed(1) + '%' : '0%'
    }))
  };
  
  if (stats.totalBinsIntentados > 0) {
    stats.tasaExito = (stats.totalExitosos / stats.totalBinsIntentados * 100).toFixed(1) + '%';
  }
  
  return stats;
}

// Endpoint para procesamiento masivo (mantener compatibilidad)
app.post('/api/procesar-bins-masivo', async (req, res) => {
  try {
    const { bins, delay = 3600 } = req.body; // delay por defecto de 1 hora (3600 segundos)
    
    if (!bins || !Array.isArray(bins)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de BINs'
      });
    }

    console.log(`🚀 Iniciando procesamiento masivo de ${bins.length} BINs con delay de ${delay} segundos...`);
    
    let procesados = 0;
    let exitosos = 0;
    let errores = 0;
    let rateLimited = 0;

    // Función para procesar un BIN individual
    const procesarBin = async (binData) => {
      try {
        const bin = binData.bin;
        console.log(`📤 Procesando BIN ${bin} (${procesados + 1}/${bins.length})...`);
        
        // Verificar si ya está en cache
        const yaExiste = await buscarBinEnBD(bin);
        if (yaExiste) {
          console.log(`⚡ BIN ${bin} ya existe en cache, saltando...`);
          return { bin, status: 'ya_existe', data: yaExiste };
        }

        // Consultar múltiples APIs externas
        const resultado = await buscarBinEnMultiplesAPIs(bin);
        
        if (resultado) {
          if (resultado.fuente === 'rate_limit') {
            rateLimited++;
            return { bin, status: 'rate_limit', data: resultado };
          } else {
            exitosos++;
            return { bin, status: 'exitoso', data: resultado };
          }
        } else {
          errores++;
          return { bin, status: 'error', data: null };
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error procesando BIN ${binData.bin}:`, error.message);
        return { bin: binData.bin, status: 'error', error: error.message };
      } finally {
        procesados++;
      }
    };

    // Procesar BINs uno por uno con delay
    const resultados = [];
    
    for (let i = 0; i < bins.length; i++) {
      const resultado = await procesarBin(bins[i]);
      resultados.push(resultado);
      
      // Si llegamos al rate limit, detener el procesamiento
      if (resultado.status === 'rate_limit') {
        console.log(`🛑 Rate limit alcanzado después de procesar ${i + 1} BINs. Deteniendo procesamiento.`);
        break;
      }
      
      // Delay entre peticiones (excepto en la última)
      if (i < bins.length - 1 && resultado.status === 'exitoso') {
        console.log(`⏳ Esperando ${delay} segundos antes de la siguiente consulta...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(`✅ Procesamiento completado:`);
    console.log(`- Total procesados: ${procesados}`);
    console.log(`- Exitosos: ${exitosos}`);
    console.log(`- Rate limited: ${rateLimited}`);
    console.log(`- Errores: ${errores}`);

    res.json({
      success: true,
      resumen: {
        total_procesados: procesados,
        exitosos,
        rate_limited: rateLimited,
        errores,
        total_bins: bins.length
      },
      resultados
    });

  } catch (error) {
    console.error("❌ Error en procesamiento masivo:", error);
    res.status(500).json({
      success: false,
      message: 'Error en procesamiento masivo',
      error: error.message
    });
  }
});

// Endpoint para obtener lista de BINs en cache
app.get('/api/bins-cache', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const binsQuery = await pool.query(`
      SELECT bin, banco, tipo, marca, pais, fuente, fecha_consulta
      FROM bins_cache
      ORDER BY fecha_consulta DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countQuery = await pool.query('SELECT COUNT(*) as total FROM bins_cache');

    res.json({
      success: true,
      data: binsQuery.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countQuery.rows[0].total / limit),
        total_records: parseInt(countQuery.rows[0].total),
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("❌ Error obteniendo BINs en cache:", error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo BINs en cache'
    });
  }
});

// Inicializar tabla al arrancar el servidor
inicializarTablaBins();

// Endpoint temporal para verificar columnas de la tabla ventas
app.get('/api/test-columns-ventas', async (req, res) => {
  try {
    // Consulta para obtener las columnas de la tabla ventas
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ventas' 
      ORDER BY ordinal_position;
    `);
    
    res.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo columnas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo columnas de la tabla ventas',
      error: error.message
    });
  }
});

// ==================== INICIO DEL SERVIDOR ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 ========== SERVIDOR BUSCADORES ==========
  ✅ Puerto: ${PORT}
  🌐 Entorno: ${process.env.NODE_ENV || 'development'}
  🔗 Local: http://localhost:${PORT}
  🔗 Red: http://192.168.1.111:${PORT}
  ${process.env.NODE_ENV === 'production' ? '🔗 Render: https://buscadores.onrender.com' : ''}
  
  📡 CORS configurado para:
     - http://localhost:5173 (Vite dev)
     - http://localhost:3000 (React dev)
     - https://cargosfraudes.onrender.com (Frontend prod)
     - *.onrender.com (Cualquier subdomain Render)
  
  🩺 Endpoints de diagnóstico:
     - GET /health (Status + CORS info)
     - GET /test-cors (Prueba específica CORS)
  
  ⏰ Iniciado: ${new Date().toLocaleString()}
  ===========================================
  `);
});
