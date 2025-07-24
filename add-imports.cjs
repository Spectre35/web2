const fs = require('fs');
const path = require('path');

function addImportIfNeeded(dir) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      addImportIfNeeded(filePath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Si usa API_BASE_URL pero no tiene el import
      if (content.includes('${API_BASE_URL}') && !content.includes('import { API_BASE_URL }')) {
        const importMatch = content.match(/(import.*?from.*?['"];?\n)+/);
        if (importMatch) {
          const imports = importMatch[0];
          const newImports = imports + 'import { API_BASE_URL } from "../config.js";\n';
          content = content.replace(imports, newImports);
          fs.writeFileSync(filePath, content);
          console.log(`✅ Import agregado a: ${filePath}`);
        }
      }
    }
  });
}

console.log('🔧 Verificando imports...\n');
addImportIfNeeded('./dashboard/src');
console.log('\n✅ Verificación completada!');
