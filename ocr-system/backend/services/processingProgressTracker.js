import EventEmitter from 'events';

/**
 * 🎯 SISTEMA MEJORADO DE PROGRESO OCR
 * Proporciona seguimiento detallado del procesamiento con estimaciones de tiempo precisas
 */
class ProcessingProgressTracker extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map(); // Seguimiento por sesión
        this.historicalData = new Map(); // Datos históricos para estimaciones
        this.averageProcessingTimes = {
            imagePreprocessing: 2000,    // 2 segundos promedio
            ocrExtraction: 5000,         // 5 segundos promedio
            textClassification: 500,     // 0.5 segundos promedio
            fieldExtraction: 300,        // 0.3 segundos promedio
            validation: 200              // 0.2 segundos promedio
        };
    }

    /**
     * Inicia una nueva sesión de procesamiento
     * @param {string} sessionId - ID único de la sesión
     * @param {number} totalFiles - Total de archivos a procesar
     * @param {Array} fileSizes - Tamaños de archivos para estimaciones mejores
     */
    startSession(sessionId, totalFiles, fileSizes = []) {
        const session = {
            sessionId,
            startTime: Date.now(),
            totalFiles,
            processedFiles: 0,
            currentFileIndex: 0,
            fileSizes,
            stages: {
                upload: { completed: 0, total: totalFiles, avgTime: 1000 },
                preprocessing: { completed: 0, total: totalFiles, avgTime: this.averageProcessingTimes.imagePreprocessing },
                ocr: { completed: 0, total: totalFiles, avgTime: this.averageProcessingTimes.ocrExtraction },
                classification: { completed: 0, total: totalFiles, avgTime: this.averageProcessingTimes.textClassification },
                extraction: { completed: 0, total: totalFiles, avgTime: this.averageProcessingTimes.fieldExtraction },
                validation: { completed: 0, total: totalFiles, avgTime: this.averageProcessingTimes.validation }
            },
            errors: [],
            processingTimes: [],
            estimatedCompletion: null
        };

        // Calcular estimación inicial
        session.estimatedCompletion = this.calculateEstimatedTime(session);
        
        this.sessions.set(sessionId, session);
        
        console.log(`🚀 Sesión de procesamiento iniciada: ${sessionId} con ${totalFiles} archivos`);
        
        this.emitProgress(sessionId);
        return session;
    }

    /**
     * Actualiza el progreso de una etapa específica
     * @param {string} sessionId - ID de la sesión
     * @param {string} stage - Etapa actual (upload, preprocessing, ocr, classification, extraction, validation)
     * @param {number} fileIndex - Índice del archivo actual
     * @param {object} options - Opciones adicionales
     */
    updateStageProgress(sessionId, stage, fileIndex, options = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`⚠️ Sesión no encontrada: ${sessionId}`);
            return;
        }

        const { fileName = '', error = null, stageStartTime = Date.now() } = options;
        
        // Actualizar etapa actual
        if (session.stages[stage]) {
            session.stages[stage].completed = Math.min(fileIndex + 1, session.stages[stage].total);
            
            // Calcular tiempo real para esta etapa si se proporciona
            if (stageStartTime) {
                const realTime = Date.now() - stageStartTime;
                session.stages[stage].lastRealTime = realTime;
                
                // Actualizar promedio basado en datos reales
                this.updateAverageTime(stage, realTime);
            }
        }

        // Actualizar archivo actual
        session.currentFileIndex = fileIndex;
        session.currentFileName = fileName;

        // Manejar errores
        if (error) {
            session.errors.push({
                fileIndex,
                fileName,
                stage,
                error: error.toString(),
                timestamp: Date.now()
            });
        }

        // Recalcular estimación
        session.estimatedCompletion = this.calculateEstimatedTime(session);
        
        console.log(`📊 Progreso actualizado [${sessionId}]: ${stage} - Archivo ${fileIndex + 1}/${session.totalFiles} ${fileName ? `(${fileName})` : ''}`);
        
        this.emitProgress(sessionId);
    }

    /**
     * Marca un archivo como completamente procesado
     * @param {string} sessionId - ID de la sesión
     * @param {number} fileIndex - Índice del archivo
     * @param {number} processingTime - Tiempo total de procesamiento en ms
     * @param {boolean} success - Si el procesamiento fue exitoso
     */
    completeFile(sessionId, fileIndex, processingTime, success = true) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.processedFiles++;
        session.processingTimes.push({
            fileIndex,
            time: processingTime,
            success,
            timestamp: Date.now()
        });

        // Actualizar todas las etapas como completadas para este archivo
        Object.keys(session.stages).forEach(stage => {
            session.stages[stage].completed = Math.max(session.stages[stage].completed, fileIndex + 1);
        });

        // Recalcular estimación basada en datos reales
        session.estimatedCompletion = this.calculateEstimatedTime(session);
        
        console.log(`✅ Archivo completado [${sessionId}]: ${fileIndex + 1}/${session.totalFiles} en ${processingTime}ms`);
        
        this.emitProgress(sessionId);

        // Si es el último archivo, finalizar sesión
        if (session.processedFiles >= session.totalFiles) {
            this.completeSession(sessionId);
        }
    }

    /**
     * Finaliza una sesión de procesamiento
     * @param {string} sessionId - ID de la sesión
     */
    completeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const totalTime = Date.now() - session.startTime;
        session.completedTime = totalTime;

        console.log(`🎉 Sesión completada [${sessionId}]: ${session.processedFiles}/${session.totalFiles} archivos en ${totalTime}ms`);
        
        // Almacenar datos históricos para futuras estimaciones
        this.storeHistoricalData(session);
        
        this.emitProgress(sessionId, true);
    }

    /**
     * Calcula el tiempo estimado de finalización
     * @param {object} session - Sesión actual
     * @returns {number} Tiempo estimado en ms
     */
    calculateEstimatedTime(session) {
        if (session.processedFiles === 0) {
            // Estimación inicial basada en promedios
            const filesRemaining = session.totalFiles;
            const avgTimePerFile = Object.values(session.stages).reduce((sum, stage) => sum + stage.avgTime, 0);
            return avgTimePerFile * filesRemaining;
        }

        // Estimación basada en rendimiento actual
        const avgTimePerFileReal = session.processingTimes.reduce((sum, pt) => sum + pt.time, 0) / session.processingTimes.length;
        const filesRemaining = session.totalFiles - session.processedFiles;
        
        return avgTimePerFileReal * filesRemaining;
    }

    /**
     * Calcula el porcentaje total de progreso
     * @param {object} session - Sesión actual
     * @returns {number} Porcentaje de 0-100
     */
    calculateOverallProgress(session) {
        const totalSteps = session.totalFiles * Object.keys(session.stages).length;
        const completedSteps = Object.values(session.stages).reduce((sum, stage) => sum + stage.completed, 0);
        
        return Math.min(100, (completedSteps / totalSteps) * 100);
    }

    /**
     * Obtiene estadísticas detalladas de progreso
     * @param {string} sessionId - ID de la sesión
     * @returns {object} Estadísticas completas
     */
    getProgressStats(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const elapsedTime = Date.now() - session.startTime;
        const overallProgress = this.calculateOverallProgress(session);
        
        return {
            sessionId,
            overallProgress: Math.round(overallProgress),
            filesProcessed: session.processedFiles,
            totalFiles: session.totalFiles,
            currentFile: session.currentFileIndex + 1,
            currentFileName: session.currentFileName || '',
            elapsedTime,
            estimatedRemaining: session.estimatedCompletion || 0,
            estimatedTotal: elapsedTime + (session.estimatedCompletion || 0),
            stages: Object.entries(session.stages).map(([name, stage]) => ({
                name,
                progress: Math.round((stage.completed / stage.total) * 100),
                completed: stage.completed,
                total: stage.total,
                avgTime: stage.avgTime,
                lastRealTime: stage.lastRealTime || null
            })),
            errors: session.errors,
            processingRate: session.processedFiles > 0 ? (elapsedTime / session.processedFiles) : 0,
            success: session.errors.length === 0,
            isComplete: session.processedFiles >= session.totalFiles
        };
    }

    /**
     * Emite evento de progreso
     * @param {string} sessionId - ID de la sesión
     * @param {boolean} isComplete - Si la sesión está completa
     */
    emitProgress(sessionId, isComplete = false) {
        const stats = this.getProgressStats(sessionId);
        if (stats) {
            this.emit('progress', { sessionId, stats, isComplete });
        }
    }

    /**
     * Actualiza tiempo promedio para una etapa
     * @param {string} stage - Nombre de la etapa
     * @param {number} realTime - Tiempo real medido
     */
    updateAverageTime(stage, realTime) {
        if (this.averageProcessingTimes[stage]) {
            // Promedio ponderado: 80% histórico, 20% nuevo
            this.averageProcessingTimes[stage] = 
                (this.averageProcessingTimes[stage] * 0.8) + (realTime * 0.2);
        }
    }

    /**
     * Almacena datos históricos para mejores estimaciones futuras
     * @param {object} session - Sesión completada
     */
    storeHistoricalData(session) {
        const key = `files_${session.totalFiles}`;
        const avgTime = session.processingTimes.reduce((sum, pt) => sum + pt.time, 0) / session.processingTimes.length;
        
        if (!this.historicalData.has(key)) {
            this.historicalData.set(key, []);
        }
        
        this.historicalData.get(key).push({
            totalTime: session.completedTime,
            avgTimePerFile: avgTime,
            successRate: session.processingTimes.filter(pt => pt.success).length / session.processingTimes.length,
            timestamp: Date.now()
        });

        // Mantener solo los últimos 50 registros
        if (this.historicalData.get(key).length > 50) {
            this.historicalData.get(key).shift();
        }
    }

    /**
     * Obtiene sesión activa o null
     * @param {string} sessionId - ID de la sesión
     * @returns {object|null} Sesión o null
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Limpia sesión completada
     * @param {string} sessionId - ID de la sesión
     */
    cleanupSession(sessionId) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Sesión limpiada: ${sessionId}`);
    }
}

export default ProcessingProgressTracker;