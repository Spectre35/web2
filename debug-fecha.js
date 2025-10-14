// Función de prueba para depurar extracciones de fecha
// Copia este código en la consola del navegador para probar

function debugFechaExtraccion(textoOCR) {
  console.log('=== DEBUG FECHA EXTRACCION ===');
  console.log('Texto de entrada:', textoOCR);
  
  // Simulamos la función extractPattern
  function extractPattern(text, regex) {
    const match = text.match(regex);
    return match ? match[1] || match[0] : null;
  }

  let fechaTextoRecibo = null;

  // Los mismos patrones que usa el código
  const fechaRegexes = [
    /Fecha[:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}\s+[0-9]{1,2}:[0-9]{2}:[0-9]{2})/i,
    /Fecha[:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}\s+[0-9]{1,2}:[0-9]{2})/i,
    /Fecha[:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
    /Fech[ao4][:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
    /Fecna[:\s]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/,
    /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(El \d{1,2} de \w+ de \d{4})/i
  ];

  console.log('Probando patrones...');
  
  for (let i = 0; i < fechaRegexes.length; i++) {
    const regex = fechaRegexes[i];
    fechaTextoRecibo = extractPattern(textoOCR, regex);
    console.log(`Patrón ${i + 1}: ${regex} -> "${fechaTextoRecibo}"`);
    if (fechaTextoRecibo) break;
  }

  // Fallback
  if (!fechaTextoRecibo) {
    const fallbackDate = textoOCR.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (fallbackDate) {
      fechaTextoRecibo = fallbackDate[0];
      console.log(`Fallback encontrado: "${fechaTextoRecibo}"`);
    }
  }

  if (fechaTextoRecibo) {
    console.log(`✅ FECHA EXTRAÍDA: "${fechaTextoRecibo}"`);
    
    // Probar conversión
    console.log('Probando conversión...');
    const match = fechaTextoRecibo.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const dia = match[1];
      const mes = match[2];
      const ano = match[3];
      console.log(`Día: ${dia}, Mes: ${mes}, Año: ${ano}`);
      
      const diaNum = parseInt(dia, 10);
      const mesNum = parseInt(mes, 10);
      const anoNum = parseInt(ano, 10);
      
      if (diaNum >= 1 && diaNum <= 31 && mesNum >= 1 && mesNum <= 12 && anoNum >= 2020 && anoNum <= 2050) {
        const fechaFormateada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        console.log(`✅ FECHA CONVERTIDA: "${fechaFormateada}"`);
      } else {
        console.log(`❌ Fecha fuera de rango válido`);
      }
    }
  } else {
    console.log('❌ NO SE ENCONTRÓ FECHA');
    
    // Análisis detallado del texto
    console.log('--- ANÁLISIS DEL TEXTO ---');
    console.log('Busca "fecha" (case insensitive):', textoOCR.toLowerCase().includes('fecha'));
    console.log('Busca patrones DD/MM/AAAA:', textoOCR.match(/\d{1,2}\/\d{1,2}\/\d{4}/g));
    console.log('Busca patrones de números:', textoOCR.match(/\d+/g));
    console.log('Primeros 200 caracteres:', textoOCR.substring(0, 200));
  }
}

// Ejemplo de uso:
// debugFechaExtraccion("Tu texto OCR aquí");