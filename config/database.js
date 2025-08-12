import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// ✅ Conexión a la base de datos - optimizada para archivos grandes
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OnhVP53dwERt@ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech:5432/buscadores?sslmode=require",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 50, // ✅ hasta 50 conexiones simultáneas
  idleTimeoutMillis: 60000, // 60 segundos para archivos grandes
  connectionTimeoutMillis: 10000, // 10 segundos timeout de conexión
  statement_timeout: 300000, // 5 minutos para queries largas
  query_timeout: 300000, // 5 minutos para queries
});

// 🗓️ FUNCIÓN PARA FORMATEAR FECHAS SIN CONVERSIÓN DE ZONA HORARIA
export const formatearFechaSinZona = (fecha) => {
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
export const formatearFechasEnObjeto = (obj) => {
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

// 🔒 RESTRICCIÓN POR IP PARA DATOS CONFIDENCIALES
const IPS_AUTORIZADAS_DATOS = [
  '127.0.0.1', '::1',                    // Localhost (desarrollo)
  '192.168.1.0/24', '192.168.0.0/24',   // Redes locales comunes
  process.env.IP_AUTORIZADA_1 || '',     // IP desde variable de entorno
  process.env.IP_AUTORIZADA_2 || '',     // IP adicional desde variable de entorno
].filter(Boolean); // Remover valores vacíos

// Middleware para proteger endpoints con datos confidenciales
export const protegerDatos = (req, res, next) => {
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
