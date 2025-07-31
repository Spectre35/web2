// Sistema de Keep-Alive para mantener servicios activos
class KeepAliveService {
  constructor() {
    this.backendUrl = null;
    this.pingInterval = null;
    this.isActive = false;
  }

  // Inicializar el servicio de keep-alive
  init(backendUrl) {
    this.backendUrl = backendUrl;
    
    // Solo activar en producción
    if (window.location.hostname.includes('onrender.com')) {
      this.startKeepAlive();
      console.log('🔄 Keep-Alive activado para servicios Render');
    }
  }

  // Iniciar el sistema de ping automático
  startKeepAlive() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Ping cada 10 minutos (600,000 ms)
    this.pingInterval = setInterval(() => {
      this.pingBackend();
    }, 10 * 60 * 1000);

    // Ping inicial después de 30 segundos
    setTimeout(() => {
      this.pingBackend();
    }, 30000);
  }

  // Hacer ping al backend para mantenerlo despierto
  async pingBackend() {
    if (!this.backendUrl) return;

    try {
      console.log('🏓 Ping al backend para mantenerlo activo...');
      
      // Usar un endpoint simple para el ping
      const response = await fetch(`${this.backendUrl}/health-check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Backend respondió correctamente');
      } else {
        console.log('⚠️ Backend respondió con error:', response.status);
      }
    } catch (error) {
      console.log('❌ Error en ping al backend:', error.message);
    }
  }

  // Detener el keep-alive
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      this.isActive = false;
      console.log('🛑 Keep-Alive detenido');
    }
  }

  // Ping manual para testing
  async testPing() {
    console.log('🧪 Realizando ping de prueba...');
    await this.pingBackend();
  }
}

// Instancia global del servicio
const keepAliveService = new KeepAliveService();

export { keepAliveService };
