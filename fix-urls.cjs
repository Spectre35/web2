const fs = require('fs');
const path = require('path');

const pagesDir = './dashboard/src/pages';
const componentsDir = './dashboard/src/components';

const urlPattern = /http:\/\/192\.168\.1\.111:300[01]/g;

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Verificar si ya tiene la importación
  if (!content.includes('import { API_BASE_URL }') && content.includes('192.168.1.111:300')) {
    // Agregar import después de los otros imports
    const importMatch = content.match(/(import.*?from.*?;?\n)+/);
    if (importMatch) {
      const imports = importMatch[0];
      const newImports = imports + 'import { API_BASE_URL } from "../config.js";\n';
      content = content.replace(imports, newImports);
      hasChanges = true;
    }
  }
  
  // Reemplazar URLs hardcodeadas
  if (content.match(urlPattern)) {
    content = content.replace(urlPattern, '${API_BASE_URL}');
    // Arreglar template literals
    content = content.replace(/get\("(\$\{API_BASE_URL\})/g, 'get(`$1');
    content = content.replace(/new EventSource\("(\$\{API_BASE_URL\})/g, 'new EventSource(`$1');
    content = content.replace(/fetch\("(\$\{API_BASE_URL\})/g, 'fetch(`$1');
    content = content.replace(/fetch\(`(\$\{API_BASE_URL\}.*?)"\)/g, 'fetch(`$1`)');
    content = content.replace(/get\(`(\$\{API_BASE_URL\}.*?)"\)/g, 'get(`$1`)');
    content = content.replace(/new EventSource\(`(\$\{API_BASE_URL\}.*?)"\)/g, 'new EventSource(`$1`)');
    content = content.replace(/location\.href = `(\$\{API_BASE_URL\}.*?)"\)/g, 'location.href = `$1`)');
    hasChanges = true;
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Actualizado: ${filePath}`);
  }
}

// Procesar archivos
console.log('🔧 Actualizando URLs en archivos...\n');

// Archivos de páginas
if (fs.existsSync(pagesDir)) {
  fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.jsx')) {
      processFile(path.join(pagesDir, file));
    }
  });
}

// Archivos de componentes
if (fs.existsSync(componentsDir)) {
  fs.readdirSync(componentsDir).forEach(file => {
    if (file.endsWith('.jsx')) {
      processFile(path.join(componentsDir, file));
    }
  });
}

console.log('\n✅ Proceso completado. Todas las URLs ahora usan la configuración automática.');
