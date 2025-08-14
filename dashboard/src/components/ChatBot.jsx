import { Fab, Webchat } from '@botpress/webchat';
import { useState, useEffect } from 'react';
import chatbotIcon from '../assets/detonarturo.png'; // Importar la imagen para el botón
import avatarIcon from '../assets/Lic Virtual.png'; // Importar la imagen personalizada para el avatar

const ChatBot = () => {
  const [isWebchatOpen, setIsWebchatOpen] = useState(false);

  const toggleWebchat = () => {
    setIsWebchatOpen((prevState) => !prevState);
  };

  // Configuración personalizada para el bot
  const webchatConfig = {
    botName: "Lic Virtual",
    botAvatar: avatarIcon, // Usar la imagen importada como avatar
    botDescription: "Asistente Virtual de Prevencion de Fraudes",
    welcomeMessage: "¡Hola! Soy Lic Virtual, tu asistente de Prevencion de Fraudes. ¿En qué puedo ayudarte?",
    theme: {
      primaryColor: "#2563EB",           // Color principal (botones, enlaces)
      backgroundColor: "#1F2937",        // Fondo del chat
      textColor: "#FFFFFF",              // Color del texto general (BLANCO)
      headerBackgroundColor: "#374151",  // Fondo del header
      headerTextColor: "#FFFFFF",        // Color del texto del header (BLANCO)
      userMessageBackground: "#2563EB",  // Fondo de mensajes del usuario
      userMessageTextColor: "#FFFFFF",   // Color texto mensajes usuario
      botMessageBackground: "#374151",   // Fondo de mensajes del bot
      botMessageTextColor: "#FFFFFF",    // Color texto mensajes del bot
    },
    enableVoice: false,
    enableEmojis: true,
    enableAttachments: false,
    showCloseButton: true,
    showConversationListToggle: false,
    showUserName: false,
    showUserAvatar: false,
    enableConversationDeletion: false,
    enableTranscriptDownload: false,
    enableResetConversation: true,
    enablePoweredBy: false,
  };

  // Efecto para cambiar el nombre del bot después de que se monte
  useEffect(() => {
    if (isWebchatOpen) {
      const changeBotName = () => {
        // Intentar cambiar el nombre en varios elementos posibles
        const selectors = [
          '.bp-webchat .bp-header-name',
          '.bp-webchat .bp-bot-name', 
          '.bp-webchat [data-testid="bot-name"]',
          '.bp-webchat .bp-header-title',
          '.bp-webchat .bp-typing-indicator-name'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && (el.textContent === 'Bot' || el.textContent.includes('Bot'))) {
              el.textContent = 'Lic Virtual';
            }
          });
        });
        
        // También buscar en elementos que contengan "Bot"
        const allElements = document.querySelectorAll('.bp-webchat *');
        allElements.forEach(el => {
          if (el.textContent === 'Bot') {
            el.textContent = 'Lic Virtual';
          }
        });
      };

      // Ejecutar inmediatamente y después con intervalos
      changeBotName();
      const interval = setInterval(changeBotName, 1000);
      
      // Limpiar el intervalo cuando el componente se desmonte o el chat se cierre
      return () => clearInterval(interval);
    }
  }, [isWebchatOpen]);

  return (
    <>
      {/* Webchat Component */}
      <Webchat
        clientId="6b5a110c-1e98-47a1-b5e8-bdfeb897476c" // Tu Client ID de Botpress
        configuration={webchatConfig}
        style={{
          width: '400px',
          height: '600px',
          display: isWebchatOpen ? 'flex' : 'none',
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          zIndex: 1000,
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          border: '1px solid #4B5563', // gray-600 para mantener consistencia
          backgroundColor: '#1F2937', // gray-800 para coincidir con el tema
        }}
      />
      
      {/* Floating Action Button personalizado */}
      <button
        onClick={toggleWebchat}
        className={`fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-[1001] flex items-center justify-center ${
          isWebchatOpen 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        style={{
          background: isWebchatOpen 
            ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' 
            : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        }}
        title={isWebchatOpen ? 'Cerrar chat' : 'Abrir chat de soporte'}
      >
        {isWebchatOpen ? (
          // Icono de X para cerrar
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        ) : (
          // Imagen personalizada para el chatbot
          // Icono de mensaje
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        )}
      </button>

      {/* Estilos CSS adicionales */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        /* Personalización específica para cambiar el nombre del bot */
        [data-cy="botpress-webchat"] .bp-header-name,
        [data-cy="botpress-webchat"] .bp-bot-name,
        .bp-webchat .bp-header-name,
        .bp-webchat .bp-bot-name,
        .bp-webchat [data-testid="bot-name"],
        .bp-webchat .bp-typing-indicator-name {
          display: none !important;
        }
        
        [data-cy="botpress-webchat"] .bp-header-name::after,
        [data-cy="botpress-webchat"] .bp-bot-name::after,
        .bp-webchat .bp-header-name::after,
        .bp-webchat .bp-bot-name::after {
          content: "Lic Virtual" !important;
          display: inline !important;
        }
        
        /* Cambiar cualquier texto "Bot" por "Lic Virtual" */
        .bp-webchat *:not(script):not(style) {
          text-replace: "Bot" "Lic Virtual";
        }
        
        /* Forzar el cambio de texto en elementos específicos */
        .bp-webchat .bp-header-title {
          font-size: 0 !important;
        }
        
        .bp-webchat .bp-header-title::before {
          content: "Lic Virtual" !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #F9FAFB !important;
        }
        
        /* Personalizar el elemento marquee title con texto blanco */
        .bpMessageListMarqueeTitle,
        .bp-webchat .bpMessageListMarqueeTitle {
          color: #FFFFFF !important;
          font-size: 14px !important;
          background: transparent !important;
        }
      `}</style>
    </>
  );
};

export default ChatBot;
