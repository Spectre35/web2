// Sistema de configuración con ofuscación avanzada
class ConfigManager {
  static #seeds = [0x42, 0x73, 0x91, 0x24, 0x65];
  static #table = null;
  
  static #initTable() {
    if (this.#table) return;
    
    // Generar tabla de caracteres rotada
    this.#table = {};
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789.-:/';
    
    for (let i = 0; i < chars.length; i++) {
      const rotated = (i + 13) % chars.length;
      this.#table[chars[i]] = chars[rotated];
      this.#table[chars[rotated]] = chars[i];
    }
  }
  
  static #decode(encoded) {
    this.#initTable();
    
    return encoded.split('').map(char => {
      const lower = char.toLowerCase();
      return this.#table[lower] || char;
    }).join('');
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
    // URL codificada con múltiples técnicas
    const segments = [
      'uggcf',           // https
      '://',             // ://  
      'ohfpnqberf',      // buscadores
      '.baeraqre.pbz'    // .onrender.com
    ];
    
    return segments.map(seg => this.#decode(seg)).join('');
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
    return hostname.includes('onrender.com') || hostname.includes('render.com');
  }
}

export { ConfigManager };
