import React from 'react';
import { Brain, MessageSquare, Lightbulb } from 'lucide-react';
import ChatBotStats from '../components/ChatBotStats';

const ChatBotAdmin = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Brain className="text-blue-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Administración del Chatbot Inteligente
              </h1>
              <p className="text-blue-200 mt-2">
                Panel de control y monitoreo del sistema RAG (Retrieval-Augmented Generation)
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <MessageSquare className="text-blue-400" size={20} />
                <span className="text-blue-200 font-medium">Respuestas Inteligentes</span>
              </div>
              <p className="text-white text-sm mt-2">
                Utiliza documentos indexados para proporcionar respuestas precisas y contextuales
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Lightbulb className="text-green-400" size={20} />
                <span className="text-green-200 font-medium">Aprendizaje Continuo</span>
              </div>
              <p className="text-white text-sm mt-2">
                Se actualiza automáticamente con nuevos documentos y procedimientos
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Brain className="text-purple-400" size={20} />
                <span className="text-purple-200 font-medium">IA Avanzada</span>
              </div>
              <p className="text-white text-sm mt-2">
                Powered by Ollama y modelos de lenguaje locales para máxima privacidad
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas y controles del chatbot */}
        <ChatBotStats />
        
        {/* Información técnica */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Información Técnica
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">
                ¿Cómo funciona el sistema RAG?
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>
                  <strong>1. Ingesta de Documentos:</strong> Los documentos se cargan, procesan y dividen en chunks semánticos.
                </p>
                <p>
                  <strong>2. Generación de Embeddings:</strong> Cada chunk se convierte en un vector numérico usando modelos de embeddings.
                </p>
                <p>
                  <strong>3. Búsqueda Semántica:</strong> Cuando haces una pregunta, se buscan los chunks más relevantes usando similitud coseno.
                </p>
                <p>
                  <strong>4. Generación de Respuesta:</strong> El contexto relevante se combina con tu pregunta para generar una respuesta precisa.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-green-300 mb-3">
                Tipos de Documentos Soportados
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>• <strong>Manuales (.md, .txt):</strong> Documentación técnica y guías de usuario</p>
                <p>• <strong>Procedimientos (.md):</strong> Procesos operativos y workflows</p>
                <p>• <strong>FAQs (.md):</strong> Preguntas frecuentes y respuestas</p>
                <p>• <strong>Datos estructurados (.csv, .json):</strong> Información tabular y configuraciones</p>
                <p>• <strong>Auto-detección:</strong> El sistema identifica automáticamente el tipo de contenido</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guía de uso */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Guía de Uso
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-orange-300 mb-3">
                Para Usuarios
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>• Haz clic en el botón flotante del chatbot en cualquier página</p>
                <p>• Escribe tu pregunta en lenguaje natural</p>
                <p>• El sistema buscará automáticamente información relevante</p>
                <p>• Recibirás respuestas basadas en la documentación oficial</p>
                <p>• Puedes hacer preguntas de seguimiento para aclarar dudas</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-red-300 mb-3">
                Para Administradores
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>• Agrega nuevos documentos a la carpeta <code className="bg-black/20 px-1 rounded">knowledge-base</code></p>
                <p>• Usa el botón "Reindexar Documentos" para actualizar la base</p>
                <p>• Monitorea el estado del sistema en esta página</p>
                <p>• Ejecuta tests periódicos para verificar funcionamiento</p>
                <p>• Verifica que Ollama esté ejecutándose correctamente</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatBotAdmin;
