const fs = require('fs');
const path = require('path');

function checkImports(dir) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      checkImports(filePath);
    } else if (file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar si usa API_BASE_URL pero no tiene el import
      if (content.includes('API_BASE_URL') && !content.includes('import { API_BASE_URL }')) {
        console.log(`❌ Falta import en: ${filePath}`);
        
        // Agregar el import
        const importMatch = content.match(/(import.*?from.*?;?\n)+/);
        if (importMatch) {
          const imports = importMatch[0];
          const newImports = imports + 'import { API_BASE_URL } from "../config.js";\n';
          const newContent = content.replace(imports, newImports);
          
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ Import agregado a: ${filePath}`);
        }
      } else if (content.includes('API_BASE_URL') && content.includes('import { API_BASE_URL }')) {
        console.log(`✅ Ya tiene import: ${filePath}`);
      }
    }
  });
}

console.log('🔧 Verificando imports de API_BASE_URL...\n');
checkImports('./dashboard/src');
console.log('\n✅ Verificación completada!');
