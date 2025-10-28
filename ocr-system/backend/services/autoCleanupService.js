// ================= 🧹 SERVICIO DE LIMPIEZA AUTOMÁTICA =================
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoCleanupService {
    constructor() {
        this.isRunning = false;
        this.intervals = [];
        this.uploadsDir = path.join(__dirname, '../../uploads');
        this.mainUploadsDir = path.join(__dirname, '../../../uploads');
        
        // Configuración por defecto
        this.config = {
            // Limpiar archivos inmediatamente después del procesamiento
            immediateCleanup: true,
            
            // Limpiar archivos antiguos cada 30 minutos
            periodicCleanupInterval: 30 * 60 * 1000,
            
            // Archivos más viejos que esto se eliminan automáticamente
            maxFileAge: 2 * 60 * 60 * 1000, // 2 horas
            
            // Limpiar archivos huérfanos (no en BD) cada hora
            orphanCleanupInterval: 60 * 60 * 1000,
            
            // Archivos huérfanos más viejos que esto se eliminan
            maxOrphanAge: 30 * 60 * 1000, // 30 minutos
            
            // Máximo espacio permitido para uploads (en MB)
            maxStorageSize: 1000, // 1GB
            
            // Log de actividades de limpieza
            enableLogging: true
        };
    }

    /**
     * 🚀 Iniciar el servicio de limpieza automática
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Servicio de limpieza ya está ejecutándose');
            return;
        }

        this.isRunning = true;
        console.log('🧹 Iniciando servicio de limpieza automática...');

        // Crear directorios si no existen
        await this.ensureDirectoriesExist();

        // Limpieza inicial
        await this.performInitialCleanup();

        // Configurar intervalos de limpieza
        this.setupPeriodicCleanup();
        this.setupOrphanCleanup();

        console.log('✅ Servicio de limpieza automática iniciado exitosamente');
    }

    /**
     * 🛑 Detener el servicio de limpieza
     */
    stop() {
        if (!this.isRunning) return;

        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isRunning = false;
        console.log('🛑 Servicio de limpieza automática detenido');
    }

    /**
     * 🗂️ Asegurar que los directorios existen
     */
    async ensureDirectoriesExist() {
        const dirs = [this.uploadsDir, this.mainUploadsDir];
        
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.log(`📁 Directorio creado: ${dir}`);
            }
        }
    }

    /**
     * 🧹 Limpieza inicial al arrancar
     */
    async performInitialCleanup() {
        this.log('🔄 Ejecutando limpieza inicial...');
        
        const results = await this.cleanOldFiles();
        const storageResults = await this.enforceStorageLimit();
        
        this.log(`✅ Limpieza inicial completada: ${results.deletedCount} archivos antiguos, ${storageResults.deletedCount} por límite de espacio`);
    }

    /**
     * ⏰ Configurar limpieza periódica de archivos antiguos
     */
    setupPeriodicCleanup() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            this.log('⏰ Ejecutando limpieza periódica...');
            const results = await this.cleanOldFiles();
            
            if (results.deletedCount > 0) {
                this.log(`🗑️ Limpieza periódica: ${results.deletedCount} archivos eliminados`);
            }
        }, this.config.periodicCleanupInterval);

        this.intervals.push(interval);
    }

    /**
     * 🔍 Configurar limpieza de archivos huérfanos
     */
    setupOrphanCleanup() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            this.log('🔍 Ejecutando limpieza de huérfanos...');
            const results = await this.cleanOrphanFiles();
            
            if (results.deletedCount > 0) {
                this.log(`🗑️ Huérfanos eliminados: ${results.deletedCount} archivos`);
            }
        }, this.config.orphanCleanupInterval);

        this.intervals.push(interval);
    }

    /**
     * 🧹 Limpiar archivos inmediatamente después del procesamiento
     * @param {string|Array<string>} filePaths - Archivo(s) a eliminar
     * @param {string} source - Origen de la limpieza para logs
     */
    async cleanupImmediately(filePaths, source = 'immediate') {
        if (!this.config.immediateCleanup) return { cleaned: [], errors: [] };

        const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const cleaned = [];
        const errors = [];

        for (const filePath of paths) {
            try {
                const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
                
                // Verificar que el archivo existe antes de intentar eliminarlo
                try {
                    await fs.access(fullPath);
                } catch {
                    this.log(`⚠️ Archivo no encontrado para eliminar: ${path.basename(fullPath)}`);
                    continue;
                }

                await fs.unlink(fullPath);
                cleaned.push(fullPath);
                this.log(`🗑️ [${source}] Archivo eliminado inmediatamente: ${path.basename(fullPath)}`);

            } catch (error) {
                errors.push({ file: filePath, error: error.message });
                this.log(`❌ [${source}] Error eliminando archivo ${path.basename(filePath)}: ${error.message}`);
            }
        }

        return { cleaned, errors };
    }

    /**
     * 🗓️ Limpiar archivos antiguos basados en fecha
     */
    async cleanOldFiles() {
        const dirs = [this.uploadsDir, this.mainUploadsDir];
        const cutoffTime = Date.now() - this.config.maxFileAge;
        
        let deletedCount = 0;
        let totalSize = 0;
        const errors = [];

        for (const dir of dirs) {
            try {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = await fs.stat(filePath);
                        
                        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
                            totalSize += stats.size;
                            await fs.unlink(filePath);
                            deletedCount++;
                            
                            this.log(`🗑️ Archivo antiguo eliminado: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                        }
                    } catch (error) {
                        errors.push({ file, error: error.message });
                    }
                }
            } catch (error) {
                console.error(`❌ Error accediendo al directorio ${dir}:`, error.message);
            }
        }

        return {
            deletedCount,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            errors
        };
    }

    /**
     * 🔍 Limpiar archivos huérfanos (no referenciados en BD)
     */
    async cleanOrphanFiles() {
        // Por ahora, considera huérfanos los archivos temporales muy antiguos
        const dirs = [this.uploadsDir, this.mainUploadsDir];
        const cutoffTime = Date.now() - this.config.maxOrphanAge;
        
        let deletedCount = 0;
        const errors = [];

        for (const dir of dirs) {
            try {
                const files = await fs.readdir(dir);
                
                // Buscar archivos con patrones temporales comunes
                const tempFiles = files.filter(file => 
                    file.includes('-') && 
                    (file.startsWith('file-') || 
                     file.includes('upload') || 
                     /^\d+-.+/.test(file))
                );

                for (const file of tempFiles) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = await fs.stat(filePath);
                        
                        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
                            await fs.unlink(filePath);
                            deletedCount++;
                            this.log(`🗑️ Archivo huérfano eliminado: ${file}`);
                        }
                    } catch (error) {
                        errors.push({ file, error: error.message });
                    }
                }
            } catch (error) {
                console.error(`❌ Error en limpieza de huérfanos en ${dir}:`, error.message);
            }
        }

        return { deletedCount, errors };
    }

    /**
     * 💾 Aplicar límite de almacenamiento
     */
    async enforceStorageLimit() {
        const dirs = [this.uploadsDir, this.mainUploadsDir];
        let totalSize = 0;
        let allFiles = [];

        // Calcular tamaño total y recopilar archivos
        for (const dir of dirs) {
            try {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = await fs.stat(filePath);
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
                        // Archivo no accesible, ignorar
                    }
                }
            } catch (error) {
                // Directorio no accesible, ignorar
            }
        }

        const totalSizeMB = totalSize / 1024 / 1024;
        let deletedCount = 0;

        // Si excede el límite, eliminar archivos más antiguos
        if (totalSizeMB > this.config.maxStorageSize) {
            // Ordenar por fecha de modificación (más antiguos primero)
            allFiles.sort((a, b) => a.mtime - b.mtime);
            
            let currentSize = totalSize;
            const targetSize = this.config.maxStorageSize * 0.8 * 1024 * 1024; // 80% del límite

            for (const file of allFiles) {
                if (currentSize <= targetSize) break;

                try {
                    await fs.unlink(file.path);
                    currentSize -= file.size;
                    deletedCount++;
                    this.log(`🗑️ Archivo eliminado por límite de espacio: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (error) {
                    console.error(`❌ Error eliminando ${file.name}:`, error.message);
                }
            }

            this.log(`💾 Límite de almacenamiento aplicado: ${deletedCount} archivos eliminados`);
        }

        return { deletedCount, currentSizeMB: totalSizeMB.toFixed(2) };
    }

    /**
     * 📊 Obtener estadísticas de uploads
     */
    async getStats() {
        const dirs = [
            { name: 'OCR Uploads', path: this.uploadsDir },
            { name: 'Main Uploads', path: this.mainUploadsDir }
        ];

        const stats = {
            totalFiles: 0,
            totalSizeMB: 0,
            directories: [],
            oldestFile: null,
            newestFile: null
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
                await fs.access(dir.path);
                dirStats.exists = true;
                
                const files = await fs.readdir(dir.path);
                let dirSize = 0;
                let oldestTime = Infinity;
                let newestTime = 0;

                for (const file of files) {
                    const filePath = path.join(dir.path, file);
                    
                    try {
                        const fileStats = await fs.stat(filePath);
                        if (fileStats.isFile()) {
                            dirStats.fileCount++;
                            dirSize += fileStats.size;
                            
                            const mtime = fileStats.mtime.getTime();
                            if (mtime < oldestTime) {
                                oldestTime = mtime;
                                stats.oldestFile = { name: file, date: fileStats.mtime };
                            }
                            if (mtime > newestTime) {
                                newestTime = mtime;
                                stats.newestFile = { name: file, date: fileStats.mtime };
                            }
                        }
                    } catch (error) {
                        // Archivo no accesible, ignorar
                    }
                }

                dirStats.sizeMB = (dirSize / 1024 / 1024).toFixed(2);
                stats.totalFiles += dirStats.fileCount;
                stats.totalSizeMB += parseFloat(dirStats.sizeMB);
            } catch (error) {
                // Directorio no existe o no es accesible
            }

            stats.directories.push(dirStats);
        }

        stats.totalSizeMB = stats.totalSizeMB.toFixed(2);
        return stats;
    }

    /**
     * 🧹 Limpieza manual completa
     */
    async manualCleanup(options = {}) {
        const {
            forceAll = false,
            maxAge = this.config.maxFileAge,
            cleanOrphans = true
        } = options;

        this.log('🧹 Iniciando limpieza manual...');

        const results = {
            oldFiles: { deletedCount: 0, errors: [] },
            orphans: { deletedCount: 0, errors: [] },
            storage: { deletedCount: 0, currentSizeMB: 0 }
        };

        // Limpiar archivos antiguos
        if (forceAll) {
            // Eliminar todos los archivos
            results.oldFiles = await this.deleteAllFiles();
        } else {
            // Usar configuración de edad
            const originalMaxAge = this.config.maxFileAge;
            this.config.maxFileAge = maxAge;
            results.oldFiles = await this.cleanOldFiles();
            this.config.maxFileAge = originalMaxAge;
        }

        // Limpiar huérfanos
        if (cleanOrphans) {
            results.orphans = await this.cleanOrphanFiles();
        }

        // Aplicar límite de almacenamiento
        results.storage = await this.enforceStorageLimit();

        this.log('✅ Limpieza manual completada');
        return results;
    }

    /**
     * 🗑️ Eliminar todos los archivos (úsalo con cuidado)
     */
    async deleteAllFiles() {
        const dirs = [this.uploadsDir, this.mainUploadsDir];
        let deletedCount = 0;
        const errors = [];

        for (const dir of dirs) {
            try {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stats = await fs.stat(filePath);
                        if (stats.isFile()) {
                            await fs.unlink(filePath);
                            deletedCount++;
                            this.log(`🗑️ Archivo eliminado (limpieza total): ${file}`);
                        }
                    } catch (error) {
                        errors.push({ file, error: error.message });
                    }
                }
            } catch (error) {
                console.error(`❌ Error en limpieza total de ${dir}:`, error.message);
            }
        }

        return { deletedCount, errors };
    }

    /**
     * 📝 Función de logging
     */
    log(message) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🧹 AutoCleanup: ${message}`);
        }
    }

    /**
     * ⚙️ Actualizar configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuración actualizada');
    }

    /**
     * 📊 Obtener configuración actual
     */
    getConfig() {
        return { ...this.config };
    }
}

// Singleton instance
const autoCleanupService = new AutoCleanupService();

export default autoCleanupService;