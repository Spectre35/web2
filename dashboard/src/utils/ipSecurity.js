// Sistema de seguridad IP simplificado (temporal)
function verificarIPAutorizada() {
  // En desarrollo, siempre permitir acceso
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '192.168.1.245') {
    return Promise.resolve(true);
  }

  // En producción, permitir acceso temporalmente para testing
  // TODO: Implementar verificación IP real después de que funcione
  console.log('🔓 Acceso permitido temporalmente para testing');
  return Promise.resolve(true);
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
