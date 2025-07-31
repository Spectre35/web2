class ConfigManager {
  static decode(str) {
    return str.replace(/[a-zA-Z]/g, char => 
      String.fromCharCode(
        (char <= 'Z' ? 65 : 97) + (char.charCodeAt(0) - (char <= 'Z' ? 65 : 97) + 13) % 26
      )
    );
  }
  static buildProduction() {
    const encoded = 'uggcf://ohfpnqberf-obbg-jro2.baeraqre.pbz';
    return this.decode(encoded);
  }
}

console.log(ConfigManager.buildProduction());
