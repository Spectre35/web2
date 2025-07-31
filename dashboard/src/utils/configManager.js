// Sistema de configuración con ofuscación avanzada
class ConfigManager {
  static #seeds = [0x42, 0x73, 0x91, 0x24, 0x65];
  
  // Método de decodificación simple y efectivo
  static #decode(str) {
    return str.replace(/[a-zA-Z]/g, char => 
      String.fromCharCode(
        (char <= 'Z' ? 65 : 97) + (char.charCodeAt(0) - (char <= 'Z' ? 65 : 97) + 13) % 26
      )
    );
  }
  
  static #getTimeSeed() {
    const now = new Date();
    return (now.getHours() + now.getMinutes()) % this.#seeds.length;
  }
  
  static getEndpoint(context) {
    const hostname = window.location.hostname;
    
    // Desarrollo
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return this.#buildLocal();
    }
    
    // Red privada
    if (this.#isPrivateNetwork(hostname)) {
      return this.#buildPrivate(hostname);
    }
    
    // Producción
    if (this.#isProduction(hostname)) {
      return this.#buildProduction();
    }
    
    return this.#buildLocal();
  }
  
  static #buildLocal() {
    return 'http://localhost:3001';
  }
  
  static #buildPrivate(hostname) {
    return `http://${hostname}:3001`;
  }
  
  static #buildProduction() {
    // URL codificada con ROT13 - mantiene números y símbolos intactos
    const encoded = 'uggcf://ohfpnqberf-obbg-jro2.baeraqre.pbz';
    return this.#decode(encoded);
  }
  
  static #isPrivateNetwork(hostname) {
    // Verificar rangos privados sin exponerlos
    const parts = hostname.split('.');
    if (parts.length !== 4) return false;
    
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    return (first === 192 && second === 168) || 
           (first === 10) || 
           (first === 172 && second >= 16 && second <= 31);
  }
  
  static #isProduction(hostname) {
    // Verificar si es render usando fragmentos codificados
    const renderFragment = this.#decode('eraqre');
    return hostname.includes(renderFragment);
  }
}

export { ConfigManager };
