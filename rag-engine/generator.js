// 🤖 Generator - Sistema de Generación de Respuestas con RAG
// Genera respuestas inteligentes usando contexto recuperado y Ollama

export class ResponseGenerator {
  
  constructor(options = {}) {
    this.ollamaEndpoint = options.ollamaEndpoint || 'http://localhost:11434';
    this.model = options.model || 'llama3.2:1b';
    this.maxTokens = options.maxTokens || 200; // Reducido para respuestas más rápidas
    this.temperature = options.temperature || 0.3; // Reducido para respuestas más directas
    this.contextLimit = options.contextLimit || 2000; // Reducido para procesar menos contexto
    this.enableStreaming = options.enableStreaming !== false;
    
    // Configuración de prompts
    this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
    this.responseFormat = options.responseFormat || 'conversational';
    this.language = options.language || 'es';
    
    // Control de calidad
    this.enableFactChecking = options.enableFactChecking !== false;
    this.minContextRelevance = options.minContextRelevance || 0.2; // Reducido para incluir más contexto relevante
    this.maxResponseLength = options.maxResponseLength || 800; // Reducido para respuestas más concisas
    
    console.log(`🤖 Generator iniciado con modelo: ${this.model}`);
  }
  
  // 🎯 Generar respuesta principal con RAG
  async generateResponse(query, contextResults, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Generando respuesta para: "${query.slice(0, 80)}${query.length > 80 ? '...' : ''}"`);
      
      // 1. Validar contexto
      const relevantContext = this.filterRelevantContext(contextResults, options);
      
      // 2. Preparar contexto optimizado
      const contextString = this.prepareContextString(relevantContext);
      
      // 3. Construir prompt
      const prompt = this.buildPrompt(query, contextString, options);
      
      // 4. Generar respuesta con Ollama
      const response = await this.callOllama(prompt, {
        ...options,
        temperature: options.temperature || this.temperature,
        maxTokens: options.maxTokens || this.maxTokens
      });
      
      // 5. Post-procesar respuesta
      const processedResponse = this.postProcessResponse(response, relevantContext);
      
      const generationTime = Date.now() - startTime;
      
      console.log(`✅ Respuesta generada (${generationTime}ms): ${processedResponse.response.length} caracteres`);
      
      return {
        response: processedResponse.response,
        metadata: {
          query,
          generationTime,
          contextUsed: relevantContext.length,
          contextSources: relevantContext.map(ctx => ({
            similarity: ctx.similarity,
            source: ctx.metadata?.fileName || 'unknown',
            contentType: ctx.metadata?.contentType || 'unknown'
          })),
          model: this.model,
          temperature: options.temperature || this.temperature,
          promptLength: prompt.length,
          responseLength: processedResponse.response.length,
          citations: processedResponse.citations || []
        }
      };
      
    } catch (error) {
      console.error('❌ Error generando respuesta:', error);
      throw error;
    }
  }
  
  // 🔍 Filtrar contexto relevante
  filterRelevantContext(contextResults, options = {}) {
    if (!contextResults || contextResults.length === 0) {
      return [];
    }
    
    const minRelevance = options.minContextRelevance || this.minContextRelevance;
    
    return contextResults
      .filter(ctx => ctx.similarity >= minRelevance)
      .slice(0, options.maxContextChunks || 5)
      .sort((a, b) => b.similarity - a.similarity);
  }
  
  // 📝 Preparar string de contexto
  prepareContextString(contextResults) {
    if (contextResults.length === 0) {
      return "No hay información específica disponible en la base de conocimientos.";
    }
    
    let contextString = "=== CONTEXTO DISPONIBLE ===\n\n";
    
    contextResults.forEach((ctx, index) => {
      const source = ctx.metadata?.fileName || `Documento ${index + 1}`;
      const contentType = ctx.metadata?.contentType || 'general';
      const similarity = (ctx.similarity * 100).toFixed(1);
      
      contextString += `[FUENTE ${index + 1}] ${source} (${contentType}, relevancia: ${similarity}%)\n`;
      contextString += `${ctx.content.trim()}\n\n`;
    });
    
    // Limitar longitud de contexto
    if (contextString.length > this.contextLimit) {
      contextString = contextString.substring(0, this.contextLimit) + "\n... [contexto truncado]";
    }
    
    return contextString;
  }
  
  // 🏗️ Construir prompt optimizado
  buildPrompt(query, contextString, options = {}) {
    const format = options.responseFormat || this.responseFormat;
    
    let prompt = this.systemPrompt + "\n\n";
    
    // Agregar contexto
    prompt += contextString + "\n\n";
    
    // Instrucciones específicas basadas en el formato
    switch (format) {
      case 'technical':
        prompt += "Responde de manera técnica y precisa, incluyendo detalles específicos.\n";
        break;
      case 'brief':
        prompt += "Proporciona una respuesta concisa y directa.\n";
        break;
      case 'detailed':
        prompt += "Proporciona una explicación detallada y completa.\n";
        break;
      default: // conversational
        prompt += "Responde de manera conversacional pero informativa.\n";
    }
    
    // Instrucciones para citas
    if (this.enableFactChecking) {
      prompt += "Si usas información del contexto, menciona la fuente correspondiente.\n";
    }
    
    prompt += `\nPREGUNTA DEL USUARIO: ${query}\n\nRESPUESTA:`;
    
    return prompt;
  }
  
  // 🔗 Llamar a Ollama
  async callOllama(prompt, options = {}) {
    try {
      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || this.temperature,
          num_predict: options.maxTokens || this.maxTokens,
          top_k: options.topK || 10, // Más agresivo para velocidad
          top_p: options.topP || 0.7, // Más enfocado
          repeat_penalty: options.repeatPenalty || 1.1,
          num_ctx: 512, // Contexto aún más pequeño
          num_batch: 4, // Batch más pequeño
          num_gpu: 1, // Usar GPU si está disponible
          low_vram: true, // Optimización para menos memoria
          stop: ["\n\n", "RESPUESTA:", "PREGUNTA:"] // Parar en ciertos tokens
        }
      };
      
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(8000) // Timeout de 8 segundos más agresivo
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.response) {
        throw new Error('No response from Ollama');
      }
      
      return data.response;
      
    } catch (error) {
      console.error('❌ Error llamando a Ollama:', error);
      
      // Si es timeout, usar respuesta rápida predefinida
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        console.log('⚡ Timeout detectado, usando respuesta rápida...');
        return this.getQuickResponse(prompt);
      }
      
      throw error;
    }
  }
  
  // ⚡ Obtener respuesta rápida predefinida
  getQuickResponse(prompt) {
    const promptLower = prompt.toLowerCase();
    
    // Respuestas específicas sobre fraudes
    if (promptLower.includes('tarjetas duplicadas') || (promptLower.includes('tarjeta') && promptLower.includes('duplicada'))) {
      return "Las tarjetas duplicadas deben investigarse para saber en qué otros paquetes se usaron.";
    }
    
    if (promptLower.includes('tarjetas inválidas') || (promptLower.includes('tarjeta') && promptLower.includes('inválida')) || promptLower.includes('no se reportan')) {
      return "Las tarjetas inválidas no se reportan si son casos aislados (una o dos). Si todas las tarjetas de una sucursal son inválidas, sí se reporta.";
    }
    
    if (promptLower.includes('fraude') && !promptLower.includes('tarjeta')) {
      return "Se considera fraude: tarjetas duplicadas, inválidas o de terceros (otras personas, vendedoras o enfermeras). Se debe realizar investigación previa, marcar en rojo la sucursal y reportar por correo y Slack.";
    }
    
    if (promptLower.includes('ventas sospechosas') || promptLower.includes('venta sospechosa')) {
      return "Una venta es sospechosa si: teléfono inválido, sin documentos firmados, sin aplicación registrada, varias ventas en el mismo mes, anticipos muy bajos, sin sesiones agendadas. Enviar correo a sucursal y gerente, reportar en Slack.";
    }
    
    // Respuestas predefinidas para preguntas comunes
    if (promptLower.includes('registro') && promptLower.includes('venta')) {
      return "Para registrar una nueva venta: 1) Ve al módulo 'Ventas' en el dashboard, 2) Completa los campos obligatorios (vendedora, sucursal, producto, cantidad, precio), 3) Selecciona método de pago, 4) Haz clic en 'Registrar Venta'. El sistema generará un número de confirmación.";
    }
    
    if (promptLower.includes('sistema') && promptLower.includes('funciona')) {
      return "El sistema funciona mediante un dashboard web que permite gestionar ventas, caja, sucursales y aclaraciones. Accede desde http://localhost:5175 con IP autorizada.";
    }
    
    if (promptLower.includes('acceso') || promptLower.includes('login')) {
      return "Accede al sistema desde http://localhost:5175. El sistema verifica automáticamente que tu IP esté autorizada (127.0.0.1, 192.168.1.0/24, 192.168.0.0/24).";
    }
    
    if (promptLower.includes('caja')) {
      return "Para registrar movimientos de caja: selecciona ingreso/egreso, ingresa monto y concepto. Para cierre diario: ve a 'Caja' → 'Cierre Diario' y confirma.";
    }
    
    if (promptLower.includes('chatbot') || promptLower.includes('asistente')) {
      return "El chatbot usa inteligencia artificial (RAG con Ollama) para responder preguntas sobre el sistema, procedimientos y resolver dudas basándose en la documentación.";
    }
    
    // Respuesta genérica
    return "Para más información específica, consulta la documentación del sistema o contacta al administrador.";
  }
  
  // ⚡ Generar respuesta con streaming
  async generateStreamingResponse(query, contextResults, options = {}) {
    const relevantContext = this.filterRelevantContext(contextResults, options);
    const contextString = this.prepareContextString(relevantContext);
    const prompt = this.buildPrompt(query, contextString, options);
    
    try {
      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: options.temperature || this.temperature,
          num_predict: options.maxTokens || this.maxTokens
        }
      };
      
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      return response.body; // Retorna ReadableStream
      
    } catch (error) {
      console.error('❌ Error en streaming:', error);
      throw error;
    }
  }
  
  // ✨ Post-procesar respuesta
  postProcessResponse(response, contextUsed) {
    let processedResponse = response.trim();
    
    // Eliminar repeticiones obvias
    processedResponse = this.removeRepetitions(processedResponse);
    
    // Limitar longitud
    if (processedResponse.length > this.maxResponseLength) {
      const truncateIndex = processedResponse.lastIndexOf('.', this.maxResponseLength);
      processedResponse = truncateIndex > this.maxResponseLength * 0.8 
        ? processedResponse.substring(0, truncateIndex + 1)
        : processedResponse.substring(0, this.maxResponseLength) + '...';
    }
    
    // Detectar y formatear citas
    const citations = this.extractCitations(processedResponse, contextUsed);
    
    // Mejorar formato
    processedResponse = this.improveFormatting(processedResponse);
    
    return {
      response: processedResponse,
      citations
    };
  }
  
  // 🔄 Eliminar repeticiones
  removeRepetitions(text) {
    // Eliminar líneas duplicadas consecutivas
    const lines = text.split('\n');
    const filtered = lines.filter((line, index) => {
      if (index === 0) return true;
      return line.trim() !== lines[index - 1].trim();
    });
    
    return filtered.join('\n');
  }
  
  // 📚 Extraer citas
  extractCitations(response, contextUsed) {
    const citations = [];
    
    // Buscar referencias a fuentes en la respuesta
    contextUsed.forEach((ctx, index) => {
      const sourcePattern = new RegExp(`\\[FUENTE ${index + 1}\\]|fuente ${index + 1}|documento ${index + 1}`, 'gi');
      if (sourcePattern.test(response)) {
        citations.push({
          index: index + 1,
          source: ctx.metadata?.fileName || `Documento ${index + 1}`,
          contentType: ctx.metadata?.contentType,
          similarity: ctx.similarity
        });
      }
    });
    
    return citations;
  }
  
  // 💅 Mejorar formato
  improveFormatting(text) {
    return text
      // Mejorar espaciado
      .replace(/\n{3,}/g, '\n\n')
      // Formatear listas
      .replace(/^\s*[-*]\s+/gm, '• ')
      // Mejorar puntuación
      .replace(/\s+([,.!?])/g, '$1')
      .trim();
  }
  
  // 🧠 Respuesta sin contexto (fallback)
  async generateFallbackResponse(query, options = {}) {
    try {
      console.log('🔄 Generando respuesta sin contexto específico');
      
      const fallbackPrompt = `${this.systemPrompt}

El usuario pregunta: "${query}"

No tienes información específica en tu base de conocimientos sobre este tema, pero puedes ofrecer una respuesta general útil basada en tu conocimiento general. Sé honesto sobre las limitaciones.

RESPUESTA:`;
      
      const response = await this.callOllama(fallbackPrompt, options);
      
      return {
        response: this.postProcessResponse(response, []).response,
        metadata: {
          query,
          type: 'fallback',
          model: this.model,
          hasContext: false
        }
      };
      
    } catch (error) {
      console.error('❌ Error en respuesta fallback:', error);
      return {
        response: "Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo o reformula tu pregunta.",
        metadata: {
          query,
          type: 'error',
          error: error.message
        }
      };
    }
  }
  
  // 📋 Prompt del sistema por defecto
  getDefaultSystemPrompt() {
    return `Eres un asistente especializado en sistemas empresariales. Responde de forma BREVE y DIRECTA.

REGLAS:
1. Usa SOLO información del contexto proporcionado
2. Respuestas máximo 3-4 líneas
3. Si no hay contexto relevante, di "No tengo información específica sobre eso"
4. Sé conciso y práctico
5. Ve directo al punto

FORMATO:
- Respuesta directa sin introducción larga
- Pasos numerados si es necesario
- Sin explicaciones adicionales innecesarias`;
  }
  
  // 🎛️ Configurar parámetros de generación
  updateGenerationConfig(config) {
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    if (config.contextLimit !== undefined) this.contextLimit = config.contextLimit;
    if (config.systemPrompt !== undefined) this.systemPrompt = config.systemPrompt;
    if (config.responseFormat !== undefined) this.responseFormat = config.responseFormat;
    
    console.log('⚙️ Configuración de generación actualizada');
  }
  
  // 🏥 Verificar salud de Ollama
  async checkHealth() {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      const hasModel = data.models?.some(model => model.name === this.model);
      
      return {
        online: true,
        endpoint: this.ollamaEndpoint,
        modelAvailable: hasModel,
        availableModels: data.models?.map(m => m.name) || []
      };
      
    } catch (error) {
      return {
        online: false,
        error: error.message,
        endpoint: this.ollamaEndpoint
      };
    }
  }
  
  // 🧪 Probar generación
  async testGeneration(testQuery = "¿Cómo funciona el sistema?") {
    try {
      const start = Date.now();
      
      // Simular contexto básico para prueba
      const mockContext = [{
        content: "El sistema funciona mediante una interfaz web que permite gestionar diferentes procesos empresariales.",
        similarity: 0.85,
        metadata: { fileName: 'test.md', contentType: 'manual' }
      }];
      
      const result = await this.generateResponse(testQuery, mockContext);
      const duration = Date.now() - start;
      
      return {
        success: true,
        testQuery,
        duration,
        responseLength: result.response.length,
        responsePreview: result.response.slice(0, 200) + '...',
        metadata: result.metadata
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        testQuery
      };
    }
  }
  
  // 📊 Estadísticas del generador
  getGeneratorStats() {
    return {
      config: {
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        contextLimit: this.contextLimit,
        responseFormat: this.responseFormat,
        language: this.language
      },
      features: {
        enableStreaming: this.enableStreaming,
        enableFactChecking: this.enableFactChecking,
        minContextRelevance: this.minContextRelevance,
        maxResponseLength: this.maxResponseLength
      },
      endpoints: {
        ollama: this.ollamaEndpoint
      }
    };
  }
}

export default ResponseGenerator;
