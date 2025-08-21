console.log('Probando patrones de monto...');
const texto = 'la cantidad de $ 1,009.01 (UN MIL NUEVE PESOS 01/100 MN)';

const montoPatterns = [
  /\$\s*([0-9,]+\.?[0-9]*)/g,
  /\$\s*([0-9,]+\.[0-9]{2})/
];

for (const pattern of montoPatterns) {
  const matches = texto.match(pattern);
  if (matches) {
    console.log('Matches encontrados:', matches);
    for (const match of matches) {
      console.log('Match completo:', match);
      // Extraer solo el número
      const numeroMatch = match.match(/([0-9,]+\.?[0-9]*)/);
      if (numeroMatch) {
        const montoStr = numeroMatch[1].replace(/,/g, '');
        const monto = parseFloat(montoStr);
        console.log('Monto extraído:', monto);
      }
    }
    break;
  }
}
