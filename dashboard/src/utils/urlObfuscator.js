// Generador de URLs con ofuscación extrema
class URLObfuscator {
  static generateBackendURL() {
    // Datos fragmentados y ofuscados
    const data = {
      p1: [104, 116, 116, 112, 115],  // "https" con desplazamiento
      p2: [58, 47, 47],               // "://"
      p3: this.rot47("9FD4236CED"),   // "buscadores" ofuscado
      p4: [46],                       // "."
      p5: this.caesarCipher("baeqaqe", -13), // "onrender" con César
      p6: [46, 99, 111, 109]          // ".com"
    };
    
    let url = "";
    
    // Reconstruir parte 1 (https)
    data.p1.forEach(code => url += String.fromCharCode(code));
    
    // Reconstruir parte 2 (:://)
    data.p2.forEach(code => url += String.fromCharCode(code));
    
    // Reconstruir parte 3 (buscadores)
    url += data.p3;
    
    // Reconstruir parte 4 (.)
    data.p4.forEach(code => url += String.fromCharCode(code));
    
    // Reconstruir parte 5 (onrender)
    url += data.p5;
    
    // Reconstruir parte 6 (.com)
    data.p6.forEach(code => url += String.fromCharCode(code));
    
    return url;
  }
  
  static rot47(str) {
    // Implementación ROT47 personalizada
    const mapping = {
      '9': 'b', 'F': 'u', 'D': 's', '4': 'c', '2': 'a', 
      '3': 'd', '6': 'o', 'C': 'r', 'E': 'e', 'D': 's'
    };
    
    return str.split('').map(char => mapping[char] || char).join('');
  }
  
  static caesarCipher(str, shift) {
    return str.split('').map(char => {
      if (char >= 'a' && char <= 'z') {
        return String.fromCharCode(((char.charCodeAt(0) - 97 + shift + 26) % 26) + 97);
      }
      return char;
    }).join('');
  }
  
  static xorDecrypt(data, key = 0x5A) {
    return data.map(byte => byte ^ key);
  }
}

export { URLObfuscator };
