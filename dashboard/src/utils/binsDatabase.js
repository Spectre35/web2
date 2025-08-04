// Base de datos local de BINs más comunes en México
export const BINS_MEXICO = {
  // BBVA México
  '450903': { banco: 'BBVA México', tipo: 'Crédito', marca: 'Visa' },
  '450904': { banco: 'BBVA México', tipo: 'Débito', marca: 'Visa' },
  '450906': { banco: 'BBVA México', tipo: 'Crédito', marca: 'Visa' },
  '450995': { banco: 'BBVA México', tipo: 'Débito', marca: 'Visa' },
  '548740': { banco: 'BBVA México', tipo: 'Crédito', marca: 'MasterCard' },
  '548741': { banco: 'BBVA México', tipo: 'Débito', marca: 'MasterCard' },
  
  // Banamex
  '411205': { banco: 'Banamex', tipo: 'Crédito', marca: 'Visa' },
  '411206': { banco: 'Banamex', tipo: 'Débito', marca: 'Visa' },
  '542417': { banco: 'Banamex', tipo: 'Crédito', marca: 'MasterCard' },
  '542418': { banco: 'Banamex', tipo: 'Débito', marca: 'MasterCard' },
  '450900': { banco: 'Banamex', tipo: 'Crédito', marca: 'Visa' },
  '450901': { banco: 'Banamex', tipo: 'Débito', marca: 'Visa' },
  
  // Santander México
  '404833': { banco: 'Santander México', tipo: 'Crédito', marca: 'Visa' },
  '404834': { banco: 'Santander México', tipo: 'Débito', marca: 'Visa' },
  '548743': { banco: 'Santander México', tipo: 'Crédito', marca: 'MasterCard' },
  '548744': { banco: 'Santander México', tipo: 'Débito', marca: 'MasterCard' },
  '411111': { banco: 'Santander México', tipo: 'Crédito', marca: 'Visa' },
  
  // Banorte
  '491275': { banco: 'Banorte', tipo: 'Crédito', marca: 'Visa' },
  '491276': { banco: 'Banorte', tipo: 'Débito', marca: 'Visa' },
  '542901': { banco: 'Banorte', tipo: 'Crédito', marca: 'MasterCard' },
  '542902': { banco: 'Banorte', tipo: 'Débito', marca: 'MasterCard' },
  '481062': { banco: 'Banorte', tipo: 'Crédito', marca: 'Visa' },
  
  // HSBC México
  '457173': { banco: 'HSBC México', tipo: 'Crédito', marca: 'Visa' },
  '457174': { banco: 'HSBC México', tipo: 'Débito', marca: 'Visa' },
  '548760': { banco: 'HSBC México', tipo: 'Crédito', marca: 'MasterCard' },
  '548761': { banco: 'HSBC México', tipo: 'Débito', marca: 'MasterCard' },
  
  // Scotiabank México
  '411207': { banco: 'Scotiabank México', tipo: 'Crédito', marca: 'Visa' },
  '411208': { banco: 'Scotiabank México', tipo: 'Débito', marca: 'Visa' },
  '548770': { banco: 'Scotiabank México', tipo: 'Crédito', marca: 'MasterCard' },
  '548771': { banco: 'Scotiabank México', tipo: 'Débito', marca: 'MasterCard' },
  
  // Inbursa
  '434107': { banco: 'Inbursa', tipo: 'Crédito', marca: 'Visa' },
  '434108': { banco: 'Inbursa', tipo: 'Débito', marca: 'Visa' },
  '515151': { banco: 'Inbursa', tipo: 'Crédito', marca: 'MasterCard' },
  
  // Azteca
  '627535': { banco: 'Banco Azteca', tipo: 'Débito', marca: 'Maestro' },
  '627536': { banco: 'Banco Azteca', tipo: 'Crédito', marca: 'MasterCard' },
  
  // American Express México
  '376675': { banco: 'American Express México', tipo: 'Crédito', marca: 'AMEX' },
  '376676': { banco: 'American Express México', tipo: 'Crédito', marca: 'AMEX' },
  '377798': { banco: 'American Express México', tipo: 'Crédito', marca: 'AMEX' },
  
  // Liverpool (Tarjeta de tienda)
  '518472': { banco: 'Liverpool', tipo: 'Crédito', marca: 'MasterCard' },
  '520888': { banco: 'Liverpool', tipo: 'Crédito', marca: 'MasterCard' },
  
  // Coppel
  '548747': { banco: 'Coppel', tipo: 'Crédito', marca: 'MasterCard' },
  '627465': { banco: 'Coppel', tipo: 'Débito', marca: 'Maestro' },
  
  // Tarjetas prepagadas comunes
  '516679': { banco: 'Sí Vale (Prepagada)', tipo: 'Prepagada', marca: 'MasterCard' },
  '527678': { banco: 'Edenred (Prepagada)', tipo: 'Prepagada', marca: 'MasterCard' },
  '548380': { banco: 'Sodexo (Prepagada)', tipo: 'Prepagada', marca: 'MasterCard' }
};

// Función para obtener información del BIN
export const obtenerInfoBIN = (bin) => {
  // Primero buscar en base local
  if (BINS_MEXICO[bin]) {
    return {
      ...BINS_MEXICO[bin],
      fuente: 'local',
      pais: 'México'
    };
  }
  
  // Detectar por rangos conocidos
  const binNum = parseInt(bin);
  
  // Visa (4xxxxx)
  if (bin.startsWith('4')) {
    return {
      banco: 'Banco no identificado',
      tipo: 'No disponible',
      marca: 'Visa',
      fuente: 'deteccion',
      pais: 'No disponible'
    };
  }
  
  // MasterCard (5xxxxx)
  if (bin.startsWith('5')) {
    return {
      banco: 'Banco no identificado',
      tipo: 'No disponible',
      marca: 'MasterCard',
      fuente: 'deteccion',
      pais: 'No disponible'
    };
  }
  
  // American Express (3xxxxx)
  if (bin.startsWith('3')) {
    return {
      banco: 'Banco no identificado',
      tipo: 'No disponible',
      marca: 'American Express',
      fuente: 'deteccion',
      pais: 'No disponible'
    };
  }
  
  // Discover (6xxxxx)
  if (bin.startsWith('6')) {
    return {
      banco: 'Banco no identificado',
      tipo: 'No disponible',
      marca: 'Discover/Maestro',
      fuente: 'deteccion',
      pais: 'No disponible'
    };
  }
  
  return {
    banco: 'No identificado',
    tipo: 'No disponible',
    marca: 'No identificado',
    fuente: 'desconocido',
    pais: 'No disponible'
  };
};
