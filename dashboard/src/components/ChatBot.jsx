import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader, Search, Lightbulb, HelpCircle, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../utils/configManager';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '¡Hola! Soy tu asistente inteligente. Puedo ayudarte con preguntas sobre el sistema, procedimientos, ventas, aclaraciones y más. ¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState({ available: false, loading: true });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Verificar estado del RAG al abrir
  useEffect(() => {
    if (isOpen) {
      checkRagStatus();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Verificar estado del sistema RAG
  const checkRagStatus = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/rag-status`);
      const data = await response.json();
      
      setRagStatus({
        available: data.ragAvailable,
        loading: false,
        vectorStoreSize: data.stats?.vectorStoreSize || 0,
        lastIngestTime: data.stats?.lastIngestTime
      });
    } catch (error) {
      console.error('Error verificando estado RAG:', error);
      setRagStatus({
        available: false,
        loading: false,
        error: 'No se pudo conectar con el sistema'
      });
    }
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.text,
          options: {
            k: 4,
            responseFormat: 'conversational'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.response,
          timestamp: new Date(),
          metadata: data.metadata
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Error en la respuesta');
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Lo siento, hubo un error procesando tu consulta. Por favor, inténtalo de nuevo o contacta al administrador.',
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Manejar Enter para enviar
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Sugerencias rápidas
  const quickSuggestions = [
    "¿Cómo registro una nueva venta?",
    "¿Qué hago si hay un error en una transacción?",
    "¿Cómo genero un reporte de ventas?",
    "¿Cuál es el procedimiento para aclaraciones?",
    "¿Cómo funciona el módulo de sucursales?"
  ];

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Formatear timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Abrir chatbot"
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>

      {/* Ventana del chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-40 flex flex-col">
          
          {/* Header */}
          <div className="bg-blue-500 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lightbulb size={20} />
              <div>
                <h3 className="font-semibold">Asistente Inteligente</h3>
                <p className="text-xs opacity-90">
                  {ragStatus.loading ? 'Conectando...' : 
                   ragStatus.available ? `${ragStatus.vectorStoreSize} documentos disponibles` : 
                   'Modo básico'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-600 rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Estado del sistema */}
          {!ragStatus.loading && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b">
              <div className="flex items-center space-x-2 text-xs">
                {ragStatus.available ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 dark:text-green-400">Sistema inteligente activo</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-600 dark:text-yellow-400">Modo básico</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isError
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                    {message.metadata?.contextUsed > 0 && (
                      <span className="ml-2">
                        📚 {message.metadata.contextUsed} fuentes
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {/* Indicador de escritura */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2">
                  <Loader className="animate-spin" size={16} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pensando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias rápidas */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Sugerencias:</p>
              <div className="space-y-1">
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="block w-full text-left text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 px-2 py-1 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;