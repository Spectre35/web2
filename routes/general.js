import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";

const router = express.Router();

// 📅 Endpoint para obtener años únicos de ventas
router.get("/anios", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM "Fecha Venta") as año
      FROM "ventas" 
      WHERE "Fecha Venta" IS NOT NULL
      ORDER BY año DESC
    `);
    
    const anios = result.rows.map(row => parseInt(row.año));
    
    console.log(`✅ Años disponibles: ${anios.length} años encontrados`);
    
    res.json(anios);
  } catch (err) {
    console.error("❌ Error obteniendo años:", err);
    res.status(500).json({ error: "Error al obtener años disponibles" });
  }
});

// 📊 Endpoint para obtener bloques únicos
router.get("/bloques", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT "Bloque" as bloque 
      FROM "ventas" 
      WHERE "Bloque" IS NOT NULL 
      ORDER BY "Bloque"
    `);
    
    const bloques = result.rows.map(row => row.bloque);
    
    console.log(`✅ Bloques disponibles: ${bloques.length} bloques encontrados`);
    
    res.json(bloques);
  } catch (err) {
    console.error("❌ Error obteniendo bloques:", err);
    res.status(500).json({ error: "Error al obtener bloques disponibles" });
  }
});

// 👥 Endpoint para obtener vendedoras únicas
router.get("/vendedoras", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT "Vendedora" as vendedora 
      FROM "ventas" 
      WHERE "Vendedora" IS NOT NULL 
      ORDER BY "Vendedora"
    `);
    
    const vendedoras = result.rows.map(row => row.vendedora);
    
    console.log(`✅ Vendedoras disponibles: ${vendedoras.length} vendedoras encontradas`);
    
    res.json(vendedoras);
  } catch (err) {
    console.error("❌ Error obteniendo vendedoras:", err);
    res.status(500).json({ error: "Error al obtener vendedoras disponibles" });
  }
});

// 📦 Endpoint para obtener paquetes únicos
router.get("/paquetes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT "Paquete" as paquete 
      FROM "ventas" 
      WHERE "Paquete" IS NOT NULL 
      ORDER BY "Paquete"
    `);
    
    const paquetes = result.rows.map(row => row.paquete);
    
    console.log(`✅ Paquetes disponibles: ${paquetes.length} paquetes encontrados`);
    
    res.json(paquetes);
  } catch (err) {
    console.error("❌ Error obteniendo paquetes:", err);
    res.status(500).json({ error: "Error al obtener paquetes disponibles" });
  }
});

// 📱 Endpoint para validar teléfonos
router.post("/validar-telefono", async (req, res) => {
  const { telefono, pais = 'MX' } = req.body;
  
  if (!telefono) {
    return res.status(400).json({
      error: "Se requiere el número de teléfono",
      formato: "{ telefono: '5551234567', pais: 'MX' }"
    });
  }
  
  try {
    // Limpiar número (solo dígitos)
    const numeroLimpio = telefono.replace(/\D/g, '');
    
    // Patrones de validación por país
    const patrones = {
      'MX': {
        regex: /^52\d{10}$|^\d{10}$/,
        formato: 'XXXXXXXXXX o 52XXXXXXXXXX',
        descripcion: 'México - 10 dígitos o con código de país 52'
      },
      'US': {
        regex: /^1\d{10}$|^\d{10}$/,
        formato: 'XXXXXXXXXX o 1XXXXXXXXXX',
        descripcion: 'Estados Unidos - 10 dígitos o con código de país 1'
      },
      'GT': {
        regex: /^502\d{8}$|^\d{8}$/,
        formato: 'XXXXXXXX o 502XXXXXXXX',
        descripcion: 'Guatemala - 8 dígitos o con código de país 502'
      },
      'CR': {
        regex: /^506\d{8}$|^\d{8}$/,
        formato: 'XXXXXXXX o 506XXXXXXXX',
        descripcion: 'Costa Rica - 8 dígitos o con código de país 506'
      }
    };
    
    const patron = patrones[pais.toUpperCase()];
    
    if (!patron) {
      return res.status(400).json({
        error: "País no soportado",
        paises_disponibles: Object.keys(patrones)
      });
    }
    
    const esValido = patron.regex.test(numeroLimpio);
    
    // Formatear número
    let numeroFormateado = numeroLimpio;
    if (esValido && pais.toUpperCase() === 'MX') {
      if (numeroLimpio.length === 10) {
        numeroFormateado = `${numeroLimpio.slice(0, 3)}-${numeroLimpio.slice(3, 6)}-${numeroLimpio.slice(6)}`;
      } else if (numeroLimpio.length === 12) {
        numeroFormateado = `+${numeroLimpio.slice(0, 2)}-${numeroLimpio.slice(2, 5)}-${numeroLimpio.slice(5, 8)}-${numeroLimpio.slice(8)}`;
      }
    }
    
    console.log(`📱 Validación de teléfono: ${numeroLimpio} (${pais}) - ${esValido ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
    res.json({
      telefono_original: telefono,
      telefono_limpio: numeroLimpio,
      telefono_formateado: numeroFormateado,
      pais: pais.toUpperCase(),
      valido: esValido,
      patron_esperado: patron.formato,
      descripcion: patron.descripcion,
      longitud: numeroLimpio.length
    });
    
  } catch (error) {
    console.error("❌ Error validando teléfono:", error);
    res.status(500).json({
      error: "Error al validar teléfono",
      detalles: error.message
    });
  }
});

// 📧 Endpoint para validar emails
router.post("/validar-email", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      error: "Se requiere el email",
      formato: "{ email: 'usuario@ejemplo.com' }"
    });
  }
  
  try {
    // Expresión regular para validar email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    const esValido = emailRegex.test(email);
    
    // Extraer partes del email
    let partes = { usuario: '', dominio: '', extension: '' };
    if (esValido) {
      const [usuario, dominio] = email.split('@');
      const dominioPartes = dominio.split('.');
      partes = {
        usuario: usuario,
        dominio: dominio,
        extension: dominioPartes[dominioPartes.length - 1],
        subdominio: dominioPartes.length > 2 ? dominioPartes.slice(0, -2).join('.') : null
      };
    }
    
    // Detectar proveedores comunes
    const proveedoresComunes = {
      'gmail.com': 'Google Gmail',
      'outlook.com': 'Microsoft Outlook',
      'hotmail.com': 'Microsoft Hotmail',
      'yahoo.com': 'Yahoo Mail',
      'icloud.com': 'Apple iCloud',
      'protonmail.com': 'ProtonMail'
    };
    
    const proveedor = proveedoresComunes[partes.dominio] || null;
    
    console.log(`📧 Validación de email: ${email} - ${esValido ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
    res.json({
      email_original: email,
      valido: esValido,
      partes: partes,
      proveedor: proveedor,
      longitud: email.length,
      recomendaciones: !esValido ? [
        "Verificar formato: usuario@dominio.com",
        "Revisar caracteres especiales permitidos",
        "Confirmar que el dominio es válido"
      ] : null
    });
    
  } catch (error) {
    console.error("❌ Error validando email:", error);
    res.status(500).json({
      error: "Error al validar email",
      detalles: error.message
    });
  }
});

// 🔢 Endpoint para validar CURP (México)
router.post("/validar-curp", async (req, res) => {
  const { curp } = req.body;
  
  if (!curp) {
    return res.status(400).json({
      error: "Se requiere la CURP",
      formato: "{ curp: 'ABCD123456HDFRRL09' }"
    });
  }
  
  try {
    // Limpiar CURP (mayúsculas, sin espacios)
    const curpLimpia = curp.toUpperCase().replace(/\s/g, '');
    
    // Validar formato CURP
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
    const esValida = curpRegex.test(curpLimpia);
    
    let detalles = {};
    
    if (esValida) {
      // Extraer información de la CURP
      detalles = {
        apellido_paterno: curpLimpia.slice(0, 2),
        apellido_materno: curpLimpia.slice(2, 3),
        nombre: curpLimpia.slice(3, 4),
        fecha_nacimiento: {
          año: '19' + curpLimpia.slice(4, 6),
          mes: curpLimpia.slice(6, 8),
          dia: curpLimpia.slice(8, 10)
        },
        sexo: curpLimpia.slice(10, 11) === 'H' ? 'Hombre' : 'Mujer',
        entidad_nacimiento: curpLimpia.slice(11, 13),
        consonantes: curpLimpia.slice(13, 16),
        homoclave: curpLimpia.slice(16, 17),
        digito_verificador: curpLimpia.slice(17, 18)
      };
    }
    
    console.log(`🔢 Validación de CURP: ${curpLimpia} - ${esValida ? 'VÁLIDA' : 'INVÁLIDA'}`);
    
    res.json({
      curp_original: curp,
      curp_limpia: curpLimpia,
      valida: esValida,
      detalles: esValida ? detalles : null,
      longitud: curpLimpia.length,
      formato_esperado: "AAAA######HAAAAA##",
      descripcion: "4 letras + 6 dígitos + H/M + 5 letras + 1 letra/dígito + 1 dígito"
    });
    
  } catch (error) {
    console.error("❌ Error validando CURP:", error);
    res.status(500).json({
      error: "Error al validar CURP",
      detalles: error.message
    });
  }
});

// 📊 Endpoint para generar reportes básicos
router.get("/reporte-basico", protegerDatos, async (req, res) => {
  try {
    const { tabla = 'ventas', limite = 100 } = req.query;
    
    let query = '';
    let formatoFecha = '';
    
    switch (tabla) {
      case 'ventas':
        query = `
          SELECT 
            "Cliente" as cliente,
            "Vendedora" as vendedora,
            "Sucursal" as sucursal,
            "Monto" as monto,
            TO_CHAR("Fecha Venta", 'DD/MM/YYYY') as fecha_venta
          FROM "ventas"
          ORDER BY "Fecha Venta" DESC
          LIMIT $1
        `;
        break;
      case 'aclaraciones':
        query = `
          SELECT 
            cliente, vendedora, sucursal, 
            monto, procesador, captura_cc,
            TO_CHAR(fecha_venta, 'DD/MM/YYYY') as fecha_venta
          FROM aclaraciones
          ORDER BY created_at DESC
          LIMIT $1
        `;
        break;
      case 'cargos_auto':
        query = `
          SELECT 
            cliente, vendedora, sucursal, bloque,
            monto, paquete,
            TO_CHAR(fecha_venta, 'DD/MM/YYYY') as fecha_venta
          FROM cargos_auto
          ORDER BY created_at DESC
          LIMIT $1
        `;
        break;
      default:
        return res.status(400).json({
          error: "Tabla no válida",
          tablas_disponibles: ['ventas', 'aclaraciones', 'cargos_auto']
        });
    }
    
    const result = await pool.query(query, [parseInt(limite)]);
    const datos = result.rows.map(formatearFechasEnObjeto);
    
    // Calcular estadísticas básicas
    const stats = {
      total_registros: datos.length,
      monto_total: datos.reduce((sum, row) => sum + (parseFloat(row.monto) || 0), 0),
      monto_promedio: datos.length > 0 ? datos.reduce((sum, row) => sum + (parseFloat(row.monto) || 0), 0) / datos.length : 0,
      vendedoras_unicas: [...new Set(datos.map(row => row.vendedora))].length,
      sucursales_unicas: [...new Set(datos.map(row => row.sucursal))].length
    };
    
    console.log(`📊 Reporte básico generado: ${tabla} - ${datos.length} registros`);
    
    res.json({
      tabla: tabla,
      datos: datos,
      estadisticas: {
        ...stats,
        monto_total: Math.round(stats.monto_total * 100) / 100,
        monto_promedio: Math.round(stats.monto_promedio * 100) / 100
      },
      configuracion: {
        limite: parseInt(limite),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ Error generando reporte básico:", error);
    res.status(500).json({
      error: "Error al generar reporte",
      detalles: error.message
    });
  }
});

// 🌐 Endpoint para obtener información de IP
router.get("/ip-info", async (req, res) => {
  try {
    // Obtener IP del cliente
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Información básica del request
    const info = {
      ip_cliente: clientIp,
      user_agent: req.headers['user-agent'],
      headers_relevantes: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'accept-language': req.headers['accept-language']
      },
      metodo: req.method,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🌐 Información de IP solicitada desde: ${clientIp}`);
    
    res.json(info);
    
  } catch (error) {
    console.error("❌ Error obteniendo información de IP:", error);
    res.status(500).json({
      error: "Error al obtener información de IP",
      detalles: error.message
    });
  }
});

// 🔒 Endpoint para verificar permisos (protegido)
router.get("/verificar-permisos", protegerDatos, async (req, res) => {
  try {
    res.json({
      acceso: "autorizado",
      mensaje: "Permisos de administrador verificados",
      timestamp: new Date().toISOString(),
      usuario: "administrador",
      permisos: [
        "lectura_datos",
        "escritura_datos",
        "eliminacion_datos",
        "administracion_sistema",
        "acceso_reportes",
        "configuracion_avanzada"
      ]
    });
    
  } catch (error) {
    console.error("❌ Error verificando permisos:", error);
    res.status(500).json({
      error: "Error al verificar permisos",
      detalles: error.message
    });
  }
});

export default router;
