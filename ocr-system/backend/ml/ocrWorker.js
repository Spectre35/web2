import { parentPort } from 'worker_threads';
import { createWorker } from 'tesseract.js';

let worker = null;

async function initializeWorker() {
    if (worker) return;

    worker = await createWorker({
        logger: m => console.log(m)
    });

    await worker.loadLanguage('eng+spa');
    await worker.initialize('eng+spa');
    console.log('✅ Worker OCR inicializado');
}

// Procesar mensaje recibido del pool
parentPort.on('message', async (data) => {
    try {
        if (!worker) {
            await initializeWorker();
        }

        const { imagePath } = data;
        console.log(`📑 Procesando imagen: ${imagePath}`);

        const startTime = Date.now();
        const result = await worker.recognize(imagePath);
        const processingTime = Date.now() - startTime;

        parentPort.postMessage({
            success: true,
            text: result.data.text,
            confidence: result.data.confidence,
            processingTime,
            words: result.data.words
        });
    } catch (error) {
        console.error('❌ Error en procesamiento OCR:', error);
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
});
