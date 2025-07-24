const fs = require('fs');
const path = require('path');

function fixQuotes(dir) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixQuotes(filePath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;
      
      // Agregar import si no existe pero se usa API_BASE_URL
      if (!content.includes('import { API_BASE_URL }') && content.includes('${API_BASE_URL}')) {
        const importMatch = content.match(/(import.*?from.*?;?\n)+/);
        if (importMatch) {
          const imports = importMatch[0];
          const newImports = imports + 'import { API_BASE_URL } from "../config.js";\n';
          content = content.replace(imports, newImports);
          hasChanges = true;
        }
      }
      
      // Arreglar comillas mixtas - patrón específico
      content = content.replace(/`\$\{API_BASE_URL\}([^`"]*)", \{/g, '`${API_BASE_URL}$1`, {');
      content = content.replace(/`\$\{API_BASE_URL\}([^`"]*)", \[/g, '`${API_BASE_URL}$1`, [');
      content = content.replace(/`\$\{API_BASE_URL\}([^`"]*)"([^`]*)\)/g, '`${API_BASE_URL}$1`$2)');
      content = content.replace(/"\$\{API_BASE_URL\}([^"]*)", \{/g, '`${API_BASE_URL}$1`, {');
      content = content.replace(/"\$\{API_BASE_URL\}([^"]*)"([^"]*)\)/g, '`${API_BASE_URL}$1`$2)');
      
      // Verificar si hubo cambios comparando el contenido original
      const originalContent = fs.readFileSync(filePath, 'utf8');
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Corregido: ${filePath}`);
        hasChanges = true;
      }
    }
  });
}

console.log('🔧 Corrigiendo comillas en archivos JSX...\n');
fixQuotes('./dashboard/src');
console.log('\n✅ Corrección completada!');
