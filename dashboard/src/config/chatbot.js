// Configuración del chatbot
export const CHATBOT_CONFIG = {
  // Client ID de tu bot de Botpress
  clientId: "6b5a110c-1e98-47a1-b5e8-bdfeb897476c",
  
  // Configuración de apariencia
  theme: {
    primaryColor: "#2563EB", // Azul principal
    secondaryColor: "#1F2937", // Gris oscuro para mantener consistencia
    textColor: "#FFFFFF",
    backgroundColor: "#1F2937",
    borderColor: "#4B5563",
  },
  
  // Configuración del bot
  bot: {
    name: "Lic Virtual",
    avatar: "https://cdn.botpress.cloud/bot-avatar.png", // Puedes usar tu propio avatar
    description: "Asistente Virtual de CargosAuto",
  },
  
  // Mensajes personalizados
  messages: {
    welcomeMessage: "¡Hola! Soy Lic Virtual, tu asistente de CargosAuto. ¿En qué puedo ayudarte?",
    offlineMessage: "El chat no está disponible en este momento. Inténtalo más tarde.",
    placeholder: "Escribe tu mensaje aquí...",
  },
  
  // Configuración de la ventana
  window: {
    width: "400px",
    height: "600px",
    position: {
      bottom: "90px",
      right: "20px",
    },
  },
};

// Función para validar si el Client ID está configurado
export const isChatbotConfigured = () => {
  return CHATBOT_CONFIG.clientId !== "TU_CLIENT_ID_AQUI" && CHATBOT_CONFIG.clientId.length > 0;
};
