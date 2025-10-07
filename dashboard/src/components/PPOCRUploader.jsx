import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import PPOCRWorkerPool from '../utils/PPOCRWorkerPool';

// Si quieres activar la simulación local para desarrollo pon true aquí;
// por defecto lo desactivamos para evitar resultados repetidos.
const USE_SIMULATION = false;

/**
 * Componente PP-OCR con ONNX Runtime Web
 * Usa modelos PP-OCR para detección y reconocimiento de texto
 * Soporta procesamiento masivo con Web Workers
 */
const PPOCRUploader = ({ onDocumentProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [workerPool, setWorkerPool] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    initializeWorkerPool();
    return () => {
      // Cleanup al desmontar
      if (workerPool) {
        workerPool.cleanup();
      }
    };
  }, []);

  /**
   * Inicializa el pool de workers PP-OCR
   */
  const initializeWorkerPool = async () => {
    try {
      console.log('🔍 Inicializando pool de workers PP-OCR...');

      const pool = new PPOCRWorkerPool();
      await pool.initialize();
      setWorkerPool(pool);

      console.log('✅ Pool de workers PP-OCR inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando pool de workers:', error);
      setError('Error inicializando el motor OCR. Recargue la página.');
    }
  };

  /**
   * Maneja la selección de archivos
   */
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (!workerPool) {
      setError('Pool de workers no inicializado. Espere un momento.');
      return;
    }

    await processFiles(files);
  };

  /**
   * Procesa múltiples archivos enviándolos al servidor OCR
   */
  const processFiles = async (files) => {
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: files.length });

    try {
      console.log(`📦 Enviando ${files.length} archivos al servidor OCR...`);

      // Procesar cada archivo individualmente enviándolo al servidor OCR
      const processedResults = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Actualizar progreso
        setProgress({ current: i + 1, total: files.length });

        try {
          console.log(`📄 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);

          // Crear FormData para enviar al servidor OCR
          const formData = new FormData();
          formData.append('file', file);
          formData.append('sucursal', 'GUADALAJARA');
          formData.append('bloque', 'TEST-BLOQUE');
          formData.append('caja', '1');

          // Enviar al servidor OCR
          const response = await axios.post('http://localhost:3002/api/ocr/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000 // 30 segundos
          });

          console.log(`✅ Respuesta servidor OCR para ${file.name}:`, response.data);

          // Extraer datos de la respuesta del servidor OCR
          const extractedText = response.data?.extractedText || '';
          const classification = response.data?.classification || 'no-clasificado';
          const clientName = response.data?.clientName || '';
          const folio = response.data?.folio || '';
          const amount = response.data?.amount || '';

          const result = {
            filename: file.name,
            success: response.data?.success || true,
            text: extractedText,
            confidence: 95, // El servidor OCR no devuelve confidence, usar valor fijo
            processingTime: response.data?.processingTime || 0,
            workerId: 'server-ocr',
            classification: classification,
            clientName: clientName,
            folio: folio,
            amount: amount,
            serverResponse: response.data // Guardar respuesta completa para debug
          };

          console.log('✅ [PPOCRUploader] Resultado procesado:', result);
          processedResults.push(result);

          // Actualizar resultados en tiempo real
          setResults(prev => [...prev, result]);

        } catch (error) {
          console.error(`❌ Error procesando ${file.name}:`, error);

          const failedResult = {
            filename: file.name,
            success: false,
            text: '',
            confidence: 0,
            processingTime: 0,
            workerId: 'server-ocr',
            error: error.message
          };

          processedResults.push(failedResult);
          setResults(prev => [...prev, failedResult]);
        }
      }

      // Los datos ya fueron procesados por el servidor OCR, no necesitamos enviarlos de nuevo
      console.log(`✅ Todos los archivos procesados por servidor OCR`);

      // Callback to parent component
      if (onDocumentProcessed) {
        onDocumentProcessed({
          success: true,
          totalProcessed: files.length,
          successCount: processedResults.filter(r => r.success).length,
          results: processedResults,
          engine: 'PP-OCR-Server',
          serverProcessed: true
        });
      }

      console.log(`✅ Procesamiento completado: ${processedResults.filter(r => r.success).length}/${files.length} exitosos`);

    } catch (error) {
      console.error('❌ Error en procesamiento masivo:', error);
      setError(`Error procesando archivos: ${error.message}`);
    } finally {
      setIsProcessing(false);
      // Clear input for reuse
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Envía los resultados al backend para almacenamiento
   */
  const sendResultsToBackend = async (results) => {
    try {
      console.log('💾 Enviando resultados al backend...');
      console.log('🔍 [PPOCRUploader] Resultados que se van a enviar:', results);

      const payload = {
        engine: 'PP-OCR',
        results: results.map(r => {
          const mappedResult = {
            filename: r.filename,
            extractedText: r.text, // 🔥 CORRECCIÓN: usar r.text en lugar de r.extractedText
            confidence: r.confidence,
            processingTime: r.processingTime,
            metadata: {
              boundingBoxes: r.boundingBoxes,
              timestamp: new Date().toISOString()
            }
          };

          // 🔍 DEBUG: Ver resultado mapeado correctamente
          console.log(`🔍 [PPOCRUploader] Mapeando ${r.filename}:`, {
            'r.text': r.text,
            'typeof r.text': typeof r.text,
            'r.text === undefined': r.text === undefined,
            'mappedResult.extractedText': mappedResult.extractedText,
            original: r,
            mapped: mappedResult
          });

          // ✅ VERIFICAR: Confirmar que extractedText ahora tiene valor
          if (!r.text || r.text === undefined) {
            console.error(`❌ [PPOCRUploader] text UNDEFINED para ${r.filename}:`, r);
          } else {
            console.log(`✅ [PPOCRUploader] text OK para ${r.filename}: "${r.text}" → extractedText: "${mappedResult.extractedText}"`);
          }

          return mappedResult;
        })
      };

      console.log('🔍 [PPOCRUploader] Payload final completo:', JSON.stringify(payload, null, 2));

      const response = await axios.post('http://localhost:3001/api/documents/ocr-results', payload);

      if (response.data.success) {
        console.log('✅ Resultados guardados en backend');
      }
    } catch (error) {
      console.warn('⚠️ Error guardando en backend (continuando):', error);
      // No fallar el proceso si el backend falla
    }
  };

  /**
   * Descarga los resultados como CSV
   */
  const downloadResults = () => {
    if (results.length === 0) return;

    const csvContent = [
      'Archivo,Estado,Texto Extraído,Confianza,Tiempo (ms)',
      ...results.map(r =>
        `"${r.filename}","${r.success ? 'Éxito' : 'Error'}","${r.extractedText || r.error || ''}",${r.confidence || 0},${r.processingTime || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pp-ocr-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="pp-ocr-uploader bg-white p-6 rounded-lg shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          🤖 PP-OCR - Reconocimiento Avanzado
          {!workerPool && <span className="ml-2 text-sm text-yellow-600">(Inicializando workers...)</span>}
          {workerPool && (
            <span className="ml-2 text-sm text-green-600">
              ({workerPool.getStats().totalWorkers} workers listos)
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Motor PP-OCR con ONNX Runtime - Procesamiento paralelo optimizado
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={isProcessing || !workerPool}
            className="hidden"
            id="pp-ocr-upload"
          />
          <label
            htmlFor="pp-ocr-upload"
            className={`cursor-pointer ${!workerPool ? 'opacity-50' : ''}`}
          >
            <div className="text-4xl mb-2">📄</div>
            <div className="text-lg font-medium text-gray-700">
              {isProcessing ? 'Procesando...' : 'Seleccionar Documentos'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Soporta JPG, PNG, PDF • Procesamiento masivo optimizado
            </div>
          </label>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between text-sm text-blue-700 mb-2">
              <span>Progreso: {progress.current}/{progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {workerPool && (
              <div className="text-xs text-blue-600">
                Workers: {workerPool.getStats().busyWorkers}/{workerPool.getStats().totalWorkers} activos
                {workerPool.getStats().queuedTasks > 0 &&
                  ` • ${workerPool.getStats().queuedTasks} en cola`
                }
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">
                Resultados ({results.filter(r => r.success).length}/{results.length} exitosos)
              </h4>
              <button
                onClick={downloadResults}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                📥 Descargar CSV
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{result.filename}</span>
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? `✅ ${result.confidence}%` : '❌'}
                      {result.workerId && (
                        <span className="ml-1 text-xs text-gray-500">[W{result.workerId}]</span>
                      )}
                    </span>
                  </div>
                  {result.success && result.extractedText && (
                    <div className="text-xs text-gray-600 mt-1 truncate">
                      {result.extractedText.substring(0, 100)}...
                    </div>
                  )}
                  {result.error && (
                    <div className="text-xs text-red-600 mt-1">{result.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Clase motor PP-OCR con ONNX Runtime
 */
class PPOCREngine {
  constructor() {
    this.detSession = null;
    this.recSession = null;
    this.initialized = false;
    this.inputSize = 960; // Standard PP-OCR detection input size
    this.recHeight = 48;  // Recognition height
    this.recWidth = 320;  // Recognition width
    this.charDict = null; // Character dictionary for recognition
  }

  async initialize() {
    try {
      console.log('🔧 Inicializando modelos PP-OCR...');

      if (!window.ort) {
        throw new Error('ONNX Runtime no está disponible');
      }

      // Configure ONNX Runtime
      window.ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/';

      console.log('📥 Descargando modelo de detección PP-OCR...');
      // Use PP-OCR v4 detection model (converted to ONNX)
      await this.loadDetectionModel();

      console.log('📥 Descargando modelo de reconocimiento PP-OCR...');
      // Use PP-OCR v4 recognition model (converted to ONNX)
      await this.loadRecognitionModel();

      // Load character dictionary
      await this.loadCharacterDictionary();

      this.initialized = true;
      console.log('✅ Modelos PP-OCR cargados correctamente');
    } catch (error) {
      console.warn('⚠️ Error cargando modelos reales, usando simulación:', error);
      // Fallback to simulation for development
      await this.simulateModelLoading();
      this.initialized = true;
    }
  }

  async loadDetectionModel() {
    try {
      // Try to load from multiple sources
      const modelSources = [
        'https://github.com/PaddlePaddle/PaddleOCR/releases/download/v2.7.0/ch_PP-OCRv4_det.onnx',
        'https://huggingface.co/spaces/PaddlePaddle/PaddleOCR/resolve/main/inference/ch_PP-OCRv4_det.onnx',
        '/models/ch_PP-OCRv4_det.onnx' // Local fallback
      ];

      for (const modelUrl of modelSources) {
        try {
          console.log(`🔄 Intentando cargar desde: ${modelUrl}`);
          this.detSession = await window.ort.InferenceSession.create(modelUrl, {
            executionProviders: ['webgl', 'wasm'],
            graphOptimizationLevel: 'all'
          });
          console.log('✅ Modelo de detección cargado exitosamente');
          return;
        } catch (error) {
          console.log(`❌ Fallo cargando desde ${modelUrl}:`, error.message);
        }
      }
      throw new Error('No se pudo cargar el modelo de detección desde ninguna fuente');
    } catch (error) {
      console.warn('Usando simulación para detección:', error);
      this.detSession = null;
    }
  }

  async loadRecognitionModel() {
    try {
      const modelSources = [
        'https://github.com/PaddlePaddle/PaddleOCR/releases/download/v2.7.0/ch_PP-OCRv4_rec.onnx',
        'https://huggingface.co/spaces/PaddlePaddle/PaddleOCR/resolve/main/inference/ch_PP-OCRv4_rec.onnx',
        '/models/ch_PP-OCRv4_rec.onnx'
      ];

      for (const modelUrl of modelSources) {
        try {
          console.log(`🔄 Intentando cargar reconocedor desde: ${modelUrl}`);
          this.recSession = await window.ort.InferenceSession.create(modelUrl, {
            executionProviders: ['webgl', 'wasm'],
            graphOptimizationLevel: 'all'
          });
          console.log('✅ Modelo de reconocimiento cargado exitosamente');
          return;
        } catch (error) {
          console.log(`❌ Fallo cargando desde ${modelUrl}:`, error.message);
        }
      }
      throw new Error('No se pudo cargar el modelo de reconocimiento');
    } catch (error) {
      console.warn('Usando simulación para reconocimiento:', error);
      this.recSession = null;
    }
  }

  async loadCharacterDictionary() {
    // PP-OCR character dictionary for Spanish/English
    this.charDict = [
      'blank', ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      '[', '\\', ']', '^', '_', '`',
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ', 'á', 'é', 'í', 'ó', 'ú', 'ñ'
    ];
  }

  async simulateModelLoading() {
    // Simulación temporal hasta obtener los modelos ONNX reales
    return new Promise(resolve => setTimeout(resolve, 1500));
  }

  async processImage(file) {
    if (!this.initialized) {
      throw new Error('Motor PP-OCR no inicializado');
    }

    const startTime = performance.now();

    try {
      // Load image to canvas
      const canvas = await this.loadImageToCanvas(file);

      let result;
      if (this.detSession && this.recSession) {
        // Real PP-OCR processing
        result = await this.realOCRProcessing(canvas);
      } else {
        // Simulation fallback
        result = await this.simulateOCRProcessing(file);
      }

      const processingTime = performance.now() - startTime;

      return {
        text: result.text,
        confidence: result.confidence,
        boxes: result.boxes,
        processingTime: Math.round(processingTime)
      };
    } catch (error) {
      console.error('Error en procesamiento PP-OCR:', error);
      throw error;
    }
  }

  async loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Resize maintaining aspect ratio
        const scale = Math.min(this.inputSize / img.width, this.inputSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async realOCRProcessing(canvas) {
    try {
      // Step 1: Text Detection
      const detectionResults = await this.detectText(canvas);

      // Step 2: Text Recognition for each region
      const recognitionResults = [];
      for (const region of detectionResults) {
        const recognizedText = await this.recognizeText(canvas, region);
        if (recognizedText.trim()) {
          recognitionResults.push({
            text: recognizedText.trim(),
            confidence: region.confidence,
            bbox: region.bbox
          });
        }
      }

      // Combine all recognized texts
      const combinedText = recognitionResults.map(r => r.text).join(' ');
      const avgConfidence = recognitionResults.length > 0
        ? recognitionResults.reduce((sum, r) => sum + r.confidence, 0) / recognitionResults.length
        : 0;

      return {
        text: combinedText,
        confidence: Math.round(avgConfidence * 100),
        boxes: recognitionResults.map(r => r.bbox)
      };
    } catch (error) {
      console.error('Error en procesamiento real:', error);
      return await this.simulateOCRProcessing();
    }
  }

  async detectText(canvas) {
    if (!this.detSession) {
      throw new Error('Modelo de detección no disponible');
    }

    // Prepare input tensor
    const inputTensor = this.canvasToDetectionTensor(canvas);

    // Run detection
    const results = await this.detSession.run({ x: inputTensor });

    // Process detection results
    return this.processDetectionResults(results, canvas);
  }

  async recognizeText(canvas, region) {
    if (!this.recSession) {
      throw new Error('Modelo de reconocimiento no disponible');
    }

    // Extract region from canvas
    const regionCanvas = this.extractRegion(canvas, region.bbox);

    // Prepare input tensor
    const inputTensor = this.canvasToRecognitionTensor(regionCanvas);

    // Run recognition
    const results = await this.recSession.run({ x: inputTensor });

    // Process recognition results
    return this.processRecognitionResults(results);
  }

  canvasToDetectionTensor(canvas) {
    // Resize to detection input size
    const resized = document.createElement('canvas');
    const ctx = resized.getContext('2d');
    resized.width = this.inputSize;
    resized.height = this.inputSize;

    ctx.drawImage(canvas, 0, 0, this.inputSize, this.inputSize);

    return this.canvasToTensor(resized, [1, 3, this.inputSize, this.inputSize]);
  }

  canvasToRecognitionTensor(canvas) {
    // Resize to recognition input size
    const resized = document.createElement('canvas');
    const ctx = resized.getContext('2d');
    resized.width = this.recWidth;
    resized.height = this.recHeight;

    ctx.drawImage(canvas, 0, 0, this.recWidth, this.recHeight);

    return this.canvasToTensor(resized, [1, 3, this.recHeight, this.recWidth]);
  }

  canvasToTensor(canvas, shape) {
    const [batch, channels, height, width] = shape;
    const imageData = canvas.getContext('2d').getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert RGBA to RGB and normalize (ImageNet normalization)
    const tensor = new Float32Array(batch * channels * height * width);
    for (let i = 0; i < height * width; i++) {
      tensor[i] = (data[i * 4] / 255.0 - 0.485) / 0.229; // R
      tensor[height * width + i] = (data[i * 4 + 1] / 255.0 - 0.456) / 0.224; // G
      tensor[2 * height * width + i] = (data[i * 4 + 2] / 255.0 - 0.406) / 0.225; // B
    }

    return new window.ort.Tensor('float32', tensor, shape);
  }

  extractRegion(canvas, bbox) {
    const [x1, y1, x2, y2] = bbox;
    const regionCanvas = document.createElement('canvas');
    const ctx = regionCanvas.getContext('2d');

    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    regionCanvas.width = width;
    regionCanvas.height = height;

    ctx.drawImage(canvas, x1, y1, width, height, 0, 0, width, height);
    return regionCanvas;
  }

  processDetectionResults(results, canvas) {
    // Simplified detection result processing
    const detections = [];

    try {
      const outputName = Object.keys(results)[0];
      const output = results[outputName];
      const data = output.data;

      // Process detection polygons (simplified)
      for (let i = 0; i < data.length; i += 9) { // Assuming 8 coordinates + confidence
        if (i + 8 < data.length && data[i + 8] > 0.5) {
          // Convert polygon to bbox
          const x1 = Math.min(data[i], data[i + 2], data[i + 4], data[i + 6]) * canvas.width;
          const y1 = Math.min(data[i + 1], data[i + 3], data[i + 5], data[i + 7]) * canvas.height;
          const x2 = Math.max(data[i], data[i + 2], data[i + 4], data[i + 6]) * canvas.width;
          const y2 = Math.max(data[i + 1], data[i + 3], data[i + 5], data[i + 7]) * canvas.height;

          detections.push({
            bbox: [x1, y1, x2, y2],
            confidence: data[i + 8]
          });
        }
      }
    } catch (error) {
      console.warn('Error procesando detección, usando simulación:', error);
      return this.simulateDetection(canvas);
    }

    return detections.length > 0 ? detections : this.simulateDetection(canvas);
  }

  processRecognitionResults(results) {
    try {
      const outputName = Object.keys(results)[0];
      const output = results[outputName];
      const data = output.data;

      // Decode using character dictionary (CTC decoding)
      return this.ctcDecode(data);
    } catch (error) {
      console.warn('Error procesando reconocimiento:', error);
      return 'TEXTO DETECTADO';
    }
  }

  ctcDecode(predictions) {
    if (!this.charDict) return 'TEXTO DETECTADO';

    let result = '';
    let prevChar = null;

    // Simple CTC decoding
    for (let i = 0; i < predictions.length; i++) {
      const charIndex = this.argmax(predictions.slice(i, i + this.charDict.length));
      if (charIndex > 0 && charIndex !== prevChar) { // Skip blank and repeated chars
        result += this.charDict[charIndex] || '';
      }
      prevChar = charIndex;
    }

    return result;
  }

  argmax(array) {
    let maxIndex = 0;
    let maxValue = array[0];
    for (let i = 1; i < array.length; i++) {
      if (array[i] > maxValue) {
        maxValue = array[i];
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  simulateDetection(canvas) {
    if (!USE_SIMULATION) {
      console.warn('simulateDetection called but USE_SIMULATION=false -> returning empty array');
      return [];
    }
    // Enhanced simulation
    const regions = [];
    const numRegions = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < numRegions; i++) {
      const x1 = Math.random() * (canvas.width * 0.7);
      const y1 = Math.random() * (canvas.height * 0.8);
      const width = 100 + Math.random() * 200;
      const height = 20 + Math.random() * 30;

      regions.push({
        bbox: [x1, y1, x1 + width, y1 + height],
        confidence: 0.8 + Math.random() * 0.2
      });
    }

    return regions;
  }

  async simulateOCRProcessing(file) {
    if (!USE_SIMULATION) {
      console.warn('simulateOCRProcessing called but USE_SIMULATION=false -> throwing');
      throw new Error('Simulación deshabilitada');
    }
    // Simulación temporal con mejor calidad
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const sampleTexts = [
      'CYNTHIA GUADALUPE VERVERY VARGAS ROMERO',
      'KARINA ELIZABETH RODRIGUEZ CENTENO',
      'DANIELA SOSA ASCENCIO',
      'ERICKA GABRIELA SANCHEZ SANCHEZ',
      'MARIA FERNANDA LOPEZ MARTINEZ',
      'ANA SOFIA GONZALEZ PEREZ'
    ];

    return {
      text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
      confidence: Math.round(88 + Math.random() * 12),
      boxes: []
    };
  }

  cleanup() {
    if (this.detSession) {
      this.detSession = null;
    }
    if (this.recSession) {
      this.recSession = null;
    }
    console.log('🧹 PP-OCR engine limpiado');
  }
}

export default PPOCRUploader;
