#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import easyocr
import cv2
import numpy as np
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import tempfile
import logging
from PIL import Image
import io

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Inicializar EasyOCR con español e inglés
logger.info("Inicializando EasyOCR...")
reader = easyocr.Reader(['es', 'en'], gpu=False)  # Cambiar a True si tienes GPU
logger.info("EasyOCR inicializado correctamente")

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path):
    """
    Preprocesa la imagen para mejorar la detección OCR
    """
    try:
        # Leer imagen
        image = cv2.imread(image_path)
        
        # Convertir a escala de grises
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Aplicar filtro de desenfoque para reducir ruido
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Aplicar threshold adaptativo para mejorar contraste
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Guardar imagen procesada temporalmente
        temp_path = image_path.replace('.', '_processed.')
        cv2.imwrite(temp_path, thresh)
        
        return temp_path
    except Exception as e:
        logger.error(f"Error en preprocesamiento: {e}")
        return image_path  # Devolver imagen original si falla

def extract_text_easyocr(image_path):
    """
    Extrae texto usando EasyOCR con preprocesamiento
    """
    try:
        logger.info(f"Procesando imagen: {image_path}")
        
        # Preprocesar imagen
        processed_path = preprocess_image(image_path)
        
        # Extraer texto con EasyOCR
        results = reader.readtext(processed_path, detail=1, paragraph=True)
        
        # Procesar resultados
        extracted_text = ""
        confidence_scores = []
        
        for (bbox, text, confidence) in results:
            if confidence > 0.3:  # Filtrar texto con baja confianza
                extracted_text += text + " "
                confidence_scores.append(confidence)
                logger.info(f"Texto detectado: '{text}' (confianza: {confidence:.2f})")
        
        # Limpiar archivo temporal si existe
        if processed_path != image_path and os.path.exists(processed_path):
            os.remove(processed_path)
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
        return {
            'text': extracted_text.strip(),
            'confidence': avg_confidence,
            'word_count': len(extracted_text.split()),
            'success': True
        }
        
    except Exception as e:
        logger.error(f"Error en EasyOCR: {e}")
        return {
            'text': '',
            'confidence': 0,
            'word_count': 0,
            'success': False,
            'error': str(e)
        }

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'OCR Service with EasyOCR',
        'languages': ['es', 'en']
    })

@app.route('/extract-text', methods=['POST'])
def extract_text():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.' + file.filename.rsplit('.', 1)[1].lower()) as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        try:
            # Extraer texto
            result = extract_text_easyocr(temp_path)
            
            # Limpiar archivo temporal
            os.unlink(temp_path)
            
            return jsonify(result)
            
        except Exception as e:
            # Limpiar archivo temporal en caso de error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error en /extract-text: {e}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/extract-text-batch', methods=['POST'])
def extract_text_batch():
    try:
        files = request.files.getlist('files')
        
        if not files:
            return jsonify({'error': 'No files provided'}), 400
        
        results = []
        
        for i, file in enumerate(files):
            if file.filename == '' or not allowed_file(file.filename):
                results.append({
                    'index': i,
                    'filename': file.filename,
                    'success': False,
                    'error': 'Invalid file'
                })
                continue
            
            # Guardar archivo temporalmente
            with tempfile.NamedTemporaryFile(delete=False, suffix='.' + file.filename.rsplit('.', 1)[1].lower()) as tmp_file:
                file.save(tmp_file.name)
                temp_path = tmp_file.name
            
            try:
                # Extraer texto
                result = extract_text_easyocr(temp_path)
                result['index'] = i
                result['filename'] = file.filename
                results.append(result)
                
                # Limpiar archivo temporal
                os.unlink(temp_path)
                
            except Exception as e:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                
                results.append({
                    'index': i,
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'results': results,
            'total_processed': len(results),
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error en /extract-text-batch: {e}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
