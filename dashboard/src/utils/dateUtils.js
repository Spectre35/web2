// Función para formatear fechas a formato dd/mm/aaaa SIN conversión de zona horaria
export const formatearFecha = (fecha) => {
  if (!fecha) return '';
  
  try {
    // Si ya viene en formato DD/MM/YYYY, devolverla tal como está
    if (typeof fecha === 'string' && fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fecha;
    }
    
    // Si viene en formato YYYY-MM-DD, convertir directamente sin crear Date object
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    
    // Para otros formatos, usar Date pero con ajuste de zona horaria
    const date = new Date(fecha);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) return fecha;
    
    // Usar getUTCDate(), getUTCMonth(), getUTCFullYear() para evitar conversión de zona horaria
    const dia = date.getUTCDate().toString().padStart(2, '0');
    const mes = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const anio = date.getUTCFullYear();
    
    return `${dia}/${mes}/${anio}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return fecha;
  }
};

// Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD para inputs sin conversión de zona horaria
export const convertirFechaParaInput = (fecha) => {
  if (!fecha) return '';
  
  try {
    // Si ya viene en formato YYYY-MM-DD, devolverla tal como está
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    
    // Si viene en formato DD/MM/YYYY, convertir directamente
    if (typeof fecha === 'string' && fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, anio] = fecha.split('/');
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error convirtiendo fecha para input:', error);
    return '';
  }
};

// Función para convertir fecha YYYY-MM-DD a DD/MM/YYYY sin conversión de zona horaria
export const convertirFechaDesdeInput = (fecha) => {
  if (!fecha) return '';
  
  try {
    // Si ya viene en formato DD/MM/YYYY, devolverla tal como está
    if (typeof fecha === 'string' && fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fecha;
    }
    
    // Si viene en formato YYYY-MM-DD, convertir directamente
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    
    return fecha;
  } catch (error) {
    console.error('Error convirtiendo fecha desde input:', error);
    return fecha;
  }
};

// Función para identificar si una columna es de fecha
export const esFecha = (nombreColumna, valor) => {
  const columnasFecha = [
    'fecha', 'fechacompra', 'fecha_venta', 'fecha_contrato', 
    'fecha_de_peticion', 'fecha_de_respuesta', 'fechaultima',
    'ultimaventa'
  ];
  
  const nombre = nombreColumna.toLowerCase();
  const esColumnaFecha = columnasFecha.some(col => nombre.includes(col));
  
  // También verificar si el valor parece una fecha
  if (esColumnaFecha || (valor && typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/))) {
    return true;
  }
  
  return false;
};

// Función para formatear todas las fechas en un objeto
export const formatearFechasEnObjeto = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const objFormateado = { ...obj };
  
  Object.keys(objFormateado).forEach(key => {
    const valor = objFormateado[key];
    if (esFecha(key, valor)) {
      objFormateado[key] = formatearFecha(valor);
    }
  });
  
  return objFormateado;
};
