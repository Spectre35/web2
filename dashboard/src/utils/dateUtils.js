// Función para formatear fechas a formato dd/mm/aaaa
export const formatearFecha = (fecha) => {
  if (!fecha) return '';
  
  try {
    const date = new Date(fecha);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) return fecha;
    
    // Formatear a dd/mm/aaaa
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();
    
    return `${dia}/${mes}/${anio}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
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
