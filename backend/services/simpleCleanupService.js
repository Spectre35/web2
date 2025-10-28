// ================= 🧹 SERVICIO DE LIMPIEZA SIMPLE PARA SERVIDOR PRINCIPAL =================
import fs from 'fs';
import path from 'path';

class SimpleCleanupService {
    constructor() {
        this.isRunning = false;
        this.cleanupInterval = null;
        
        // Configuración por defecto
        this.config = {
            // Limpiar archivos cada hora
            intervalMinutes: 60,
            
            // Archivos más viejos que esto se eliminan automáticamente
            maxFileAgeHours: 6, // 6 horas
            
            // Máximo espacio permitido para uploads (en MB)
            maxStorageMB: 2000, // 2GB
            
            // Log de actividades
            enableLogging: true
        };
        
        this.uploadsDir = path.join(process.cwd(), 'uploads');
        this.ocrUploadsDir = path.join(process.cwd(), 'ocr-system', 'uploads');
    }

    /**
     * 🚀 Iniciar el servicio de limpieza
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Servicio de limpieza ya está ejecutándose');
            return;
        }

        this.isRunning = true;
        console.log('🧹 Iniciando servicio de limpieza simple...');

        // Ejecutar limpieza inicial
        this.performCleanup();

        // Configurar intervalo de limpieza
        this.cleanupInterval = setInterval(() => {
            if (this.isRunning) {
                this.performCleanup();
            }
        }, this.config.intervalMinutes * 60 * 1000);

        console.log(`✅ Servicio de limpieza iniciado - ejecutándose cada ${this.config.intervalMinutes} minutos`);
    }

    /**
     * 🛑 Detener el servicio
     */
    stop() {
        if (!this.isRunning) return;

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.isRunning = false;
        console.log('🛑 Servicio de limpieza simple detenido');
    }

    /**
     * 🧹 Ejecutar limpieza
     */
    async performCleanup() {
        try {
            this.log('🔄 Ejecutando limpieza automática...');

            const results = await Promise.all([
                this.cleanOldFiles(),
                this.enforceStorageLimit()
            ]);

            const oldFilesResult = results[0];
            const storageLimitResult = results[1];

            const totalDeleted = oldFilesResult.deletedCount + storageLimitResult.deletedCount;
            
            if (totalDeleted > 0) {
                this.log(`✅ Limpieza completada: ${totalDeleted} archivos eliminados (${oldFilesResult.deletedCount} antiguos, ${storageLimitResult.deletedCount} por límite)`);
            }
        } catch (error) {
            console.error('❌ Error en limpieza automática:', error);
        }
    }

    /**
     * 🗓️ Limpiar archivos antiguos
     */
    async cleanOldFiles() {
        const cutoffTime = Date.now() - (this.config.maxFileAgeHours * 60 * 60 * 1000);
        const dirs = [this.uploadsDir, this.ocrUploadsDir];
        
        let deletedCount = 0;
        let totalSize = 0;

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = fs.statSync(filePath);
                        
                        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
                            totalSize += stats.size;
                            fs.unlinkSync(filePath);
                            deletedCount++;
                            
                            this.log(`🗑️ Archivo antiguo eliminado: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                        }
                    } catch (error) {
                        // Error accediendo al archivo específico, continuar
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error accediendo al directorio ${dir}:`, error.message);
            }
        }

        return {
            deletedCount,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * 💾 Aplicar límite de almacenamiento
     */
    async enforceStorageLimit() {
        const dirs = [this.uploadsDir, this.ocrUploadsDir];
        let allFiles = [];
        let totalSize = 0;

        // Recopilar todos los archivos con sus metadatos
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            totalSize += stats.size;
                            allFiles.push({
                                path: filePath,
                                name: file,
                                size: stats.size,
                                mtime: stats.mtime.getTime()
                            });
                        }
                    } catch (error) {
                        // Error accediendo al archivo específico, continuar
                    }
                }
            } catch (error) {
                // Error accediendo al directorio, continuar
            }
        }

        const totalSizeMB = totalSize / 1024 / 1024;
        let deletedCount = 0;

        // Si excede el límite, eliminar archivos más antiguos
        if (totalSizeMB > this.config.maxStorageMB) {
            this.log(`⚠️ Límite de almacenamiento excedido: ${totalSizeMB.toFixed(2)} MB > ${this.config.maxStorageMB} MB`);
            
            // Ordenar por fecha de modificación (más antiguos primero)
            allFiles.sort((a, b) => a.mtime - b.mtime);
            
            let currentSize = totalSize;
            const targetSize = this.config.maxStorageMB * 0.8 * 1024 * 1024; // 80% del límite

            for (const file of allFiles) {
                if (currentSize <= targetSize) break;

                try {
                    fs.unlinkSync(file.path);
                    currentSize -= file.size;
                    deletedCount++;
                    this.log(`🗑️ Archivo eliminado por límite: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (error) {
                    console.warn(`⚠️ Error eliminando ${file.name}:`, error.message);
                }
            }
        }

        return {
            deletedCount,
            currentSizeMB: totalSizeMB.toFixed(2)
        };
    }

    /**
     * 📊 Obtener estadísticas de uso
     */
    getStats() {
        const dirs = [
            { name: 'Backend Uploads', path: this.uploadsDir },
            { name: 'OCR Uploads', path: this.ocrUploadsDir }
        ];

        const stats = {
            totalFiles: 0,
            totalSizeMB: 0,
            directories: [],
            config: this.config
        };

        for (const dir of dirs) {
            let dirStats = {
                name: dir.name,
                path: dir.path,
                fileCount: 0,
                sizeMB: 0,
                exists: false
            };

            try {
                if (fs.existsSync(dir.path)) {
                    dirStats.exists = true;
                    const files = fs.readdirSync(dir.path);
                    let dirSize = 0;

                    for (const file of files) {
                        const filePath = path.join(dir.path, file);
                        try {
                            const fileStats = fs.statSync(filePath);
                            if (fileStats.isFile()) {
                                dirStats.fileCount++;
                                dirSize += fileStats.size;
                            }
                        } catch (error) {
                            // Archivo no accesible, ignorar
                        }
                    }

                    dirStats.sizeMB = (dirSize / 1024 / 1024).toFixed(2);
                    stats.totalFiles += dirStats.fileCount;
                    stats.totalSizeMB += parseFloat(dirStats.sizeMB);
                }
            } catch (error) {
                // Directorio no accesible
            }

            stats.directories.push(dirStats);
        }

        stats.totalSizeMB = stats.totalSizeMB.toFixed(2);
        return stats;
    }

    /**
     * 📝 Función de logging
     */
    log(message) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🧹 SimpleCleanup: ${message}`);
        }
    }

    /**
     * ⚙️ Actualizar configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Si se cambió el intervalo y el servicio está ejecutándose, reiniciar
        if (this.isRunning && newConfig.intervalMinutes && this.cleanupInterval) {
            this.stop();
            this.start();
        }
        
        this.log('⚙️ Configuración actualizada');
    }
}

// Singleton instance
const simpleCleanupService = new SimpleCleanupService();

export default simpleCleanupService;