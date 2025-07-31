// Sistema de seguridad IP avanzado para frontend
function verificarIPAutorizada() {
  // IPs autorizadas con múltiples capas de ofuscación
  const authorizedIPs = [
    // Para agregar tu IP: 
    // 1. Obtén tu IP de https://ipinfo.io/ip
    // 2. Conviértela usando: btoa(tuIP).split('').reverse().join('')
    // 3. Agrégala aquí
    
    // Agrega aquí tus IPs ofuscadas (reemplaza el ejemplo):
    "==QM3EjLxEjL2kjL2gTM", // Tu IP ofuscada - REEMPLAZA CON LA TUYA
  ];

  // En desarrollo, permitir acceso
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '192.168.1.245') {
    return Promise.resolve(true);
  }

  // Verificar IP en producción
  return new Promise((resolve) => {
    // Usar múltiples servicios para obtener IP (redundancia)
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    Promise.any(
      ipServices.map(service => 
        fetch(service).then(r => r.json()).then(data => 
          data.ip || data.origin || data.query
        )
      )
    ).then(userIP => {
      // Verificar si la IP está autorizada
      const isAuthorized = authorizedIPs.some(encodedIP => {
        try {
          // Deofuscar: invertir string y decodificar base64
          const reversedEncoded = encodedIP.split('').reverse().join('');
          const decodedIP = atob(reversedEncoded);
          return decodedIP === userIP;
        } catch {
          return false;
        }
      });
      
      if (!isAuthorized) {
        showAccessDenied(userIP);
        resolve(false);
      } else {
        resolve(true);
      }
    }).catch(() => {
      // Si no se puede obtener la IP, denegar por seguridad
      showAccessDenied("desconocida");
      resolve(false);
    });
  });
}

function showAccessDenied(userIP) {
  // Crear página de acceso denegado profesional
  document.body.innerHTML = `
    <div style="
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #ffffff; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="
        text-align: center;
        max-width: 500px;
        padding: 40px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
        <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">
          Acceso Restringido
        </h1>
        <p style="margin: 0 0 15px 0; font-size: 16px; opacity: 0.9;">
          Sistema de seguridad activado
        </p>
        <p style="margin: 0 0 30px 0; font-size: 14px; opacity: 0.7;">
          IP: <span style="font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px;">${userIP}</span>
        </p>
        <div style="
          font-size: 12px; 
          opacity: 0.6; 
          border-top: 1px solid rgba(255, 255, 255, 0.1); 
          padding-top: 20px;
          margin-top: 20px;
        ">
          Contacta al administrador para obtener acceso autorizado
        </div>
      </div>
    </div>
  `;
}

export { verificarIPAutorizada };
