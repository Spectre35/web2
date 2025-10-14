
import express from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../../config/database.js';
const router = express.Router();

// Endpoint para insertar datos validados por el usuario
router.post('/api/ocr/insert-database', async (req, res) => {
  try {
    const datos = req.body;
    if (!datos || !datos.cliente || !datos.sucursal || !datos.bloque) {
      return res.status(400).json({ success: false, error: 'Datos incompletos para inserción' });
    }
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO papeleria (
          cliente,
          sucursal,
          bloque,
          fecha_contrato,
          tipo,
          monto,
          t_pago,
          caja,
          usuario,
          archivo_original,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, cliente, sucursal, bloque, monto, t_pago, created_at
      `;
      const insertValues = [
        datos.cliente,
        datos.sucursal,
        datos.bloque,
        datos.fecha_contrato,
        datos.tipo,
        datos.monto,
        datos.t_pago,
        datos.caja,
        datos.usuario,
        datos.archivo_original
      ];
      const result = await client.query(insertQuery, insertValues);
      const insertedRow = result.rows[0];
      
      // 🗑️ BORRAR ARCHIVO AUTOMÁTICAMENTE DESPUÉS DE GUARDARLO EN BD
      if (datos.archivo_original) {
        try {
          // Buscar el archivo en las carpetas de uploads
          const uploadsPaths = [
            path.join(process.cwd(), 'uploads', datos.archivo_original),
            path.join(process.cwd(), 'ocr-system', 'uploads', datos.archivo_original)
          ];
          
          for (const uploadPath of uploadsPaths) {
            if (fs.existsSync(uploadPath)) {
              await fs.promises.unlink(uploadPath);
              console.log(`🗑️ Archivo borrado automáticamente: ${datos.archivo_original}`);
              break;
            }
          }
          
          // También borrar archivos que coincidan por nombre parcial (archivos procesados)
          const uploadsDir = path.join(process.cwd(), 'uploads');
          const ocrUploadsDir = path.join(process.cwd(), 'ocr-system', 'uploads');
          
          [uploadsDir, ocrUploadsDir].forEach(dir => {
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir);
              const baseFileName = path.parse(datos.archivo_original).name;
              
              files.forEach(file => {
                if (file.includes(baseFileName) || file.startsWith('file-')) {
                  try {
                    fs.unlinkSync(path.join(dir, file));
                    console.log(`🗑️ Archivo relacionado borrado: ${file}`);
                  } catch (err) {
                    console.warn(`⚠️ No se pudo borrar ${file}:`, err.message);
                  }
                }
              });
            }
          });
          
        } catch (fileError) {
          console.warn(`⚠️ Error borrando archivo ${datos.archivo_original}:`, fileError.message);
          // No fallar la inserción por error al borrar archivo
        }
      }
      
      res.json({ 
        success: true, 
        data: insertedRow, 
        message: `Registro insertado exitosamente con ID ${insertedRow.id}. Archivo borrado automáticamente.` 
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error insertando en base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para limpiar archivos antiguos manualmente
router.delete('/api/ocr/cleanup-old-files', async (req, res) => {
  try {
    const { daysOld = 7 } = req.body; // Por defecto, archivos de más de 7 días
    console.log(`🧹 Iniciando limpieza de archivos de más de ${daysOld} días...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const uploadsDirs = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'ocr-system', 'uploads')
    ];
    
    let deletedFiles = 0;
    let totalSizeDeleted = 0;
    
    for (const uploadsDir of uploadsDirs) {
      if (!fs.existsSync(uploadsDir)) continue;
      
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          try {
            totalSizeDeleted += stats.size;
            fs.unlinkSync(filePath);
            deletedFiles++;
            console.log(`🗑️ Archivo antiguo borrado: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          } catch (err) {
            console.warn(`⚠️ Error borrando ${file}:`, err.message);
          }
        }
      }
    }
    
    const sizeMB = (totalSizeDeleted / 1024 / 1024).toFixed(2);
    res.json({ 
      success: true, 
      deletedFiles,
      totalSizeDeleted: `${sizeMB} MB`,
      message: `Limpieza completada: ${deletedFiles} archivos borrados, ${sizeMB} MB liberados` 
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de archivos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para obtener estadísticas de archivos
router.get('/api/ocr/uploads-stats', async (req, res) => {
  try {
    const uploadsDirs = [
      { name: 'Backend', path: path.join(process.cwd(), 'uploads') },
      { name: 'OCR System', path: path.join(process.cwd(), 'ocr-system', 'uploads') }
    ];
    
    const stats = [];
    let totalFiles = 0;
    let totalSize = 0;
    
    for (const dir of uploadsDirs) {
      if (!fs.existsSync(dir.path)) {
        stats.push({ name: dir.name, files: 0, size: '0 MB', path: dir.path });
        continue;
      }
      
      const files = fs.readdirSync(dir.path);
      let dirSize = 0;
      let oldFiles = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      files.forEach(file => {
        const filePath = path.join(dir.path, file);
        const fileStats = fs.statSync(filePath);
        dirSize += fileStats.size;
        if (fileStats.mtime < cutoffDate) oldFiles++;
      });
      
      totalFiles += files.length;
      totalSize += dirSize;
      
      stats.push({
        name: dir.name,
        files: files.length,
        size: (dirSize / 1024 / 1024).toFixed(2) + ' MB',
        oldFiles: oldFiles,
        path: dir.path
      });
    }
    
    res.json({
      success: true,
      directories: stats,
      totals: {
        files: totalFiles,
        size: (totalSize / 1024 / 1024).toFixed(2) + ' MB'
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
