// 📊 RUTAS PARA ONLYOFFICE DOCUMENT SERVER
// Endpoint para servir documentos de ejemplo
app.get('/api/documents/sample.xlsx', (req, res) => {
  const samplePath = path.join(__dirname, 'public', 'sample.xlsx');
  
  // Si no existe, crear un archivo de ejemplo
  if (!fs.existsSync(samplePath)) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hoja Colaborativa');
    
    // Agregar algunos datos de ejemplo
    worksheet.addRow(['Nombre', 'Apellido', 'Email', 'Teléfono']);
    worksheet.addRow(['Juan', 'Pérez', 'juan@email.com', '555-0123']);
    worksheet.addRow(['María', 'García', 'maria@email.com', '555-0456']);
    worksheet.addRow(['Carlos', 'López', 'carlos@email.com', '555-0789']);
    
    // Formatear encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Crear directorio si no existe
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    workbook.xlsx.writeFile(samplePath).then(() => {
      console.log('📄 Archivo de ejemplo creado:', samplePath);
    });
  }
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.sendFile(samplePath);
});

// Callback para recibir cambios de ONLYOFFICE
app.post('/api/documents/callback', (req, res) => {
  const { status, url, key, users } = req.body;
  
  console.log('📝 ONLYOFFICE Callback:', {
    status,
    key,
    users: users?.length || 0,
    url: url ? 'provided' : 'none'
  });
  
  // Status codes:
  // 1 - document is being edited
  // 2 - document is ready for saving
  // 3 - document saving error has occurred
  // 4 - document is closed with no changes
  // 6 - document is being edited, but the current document state is saved
  // 7 - error has occurred while force saving the document
  
  if (status === 2 || status === 3 || status === 6 || status === 7) {
    // Documento listo para guardar o error
    if (url && status === 2) {
      // Descargar y guardar el documento actualizado
      // En producción, aquí guardarías en tu sistema de archivos o base de datos
      console.log('💾 Documento listo para guardar desde:', url);
    }
  }
  
  res.json({ error: 0 });
});

// Crear servidor HTTP
const server = createServer(app);

// Configurar Socket.IO para colaboración en tiempo real
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:3001", "http://192.168.1.245:5174", "http://192.168.1.245:3001"],
    methods: ["GET", "POST"]
  }
});

// Manejar conexiones de WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado:', socket.id);

  // Usuario se desconecta
  socket.on('disconnect', () => {
    console.log(`🔌 Usuario desconectado: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`🌐 También disponible en http://192.168.1.111:${PORT}`);
  console.log(`🔌 WebSocket habilitado`);
  console.log(`📊 ONLYOFFICE endpoints:`);
  console.log(`   - Sample doc: http://localhost:${PORT}/api/documents/sample.xlsx`);
  console.log(`   - Callback: http://localhost:${PORT}/api/documents/callback`);
});
