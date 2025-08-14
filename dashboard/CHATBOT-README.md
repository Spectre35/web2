# Integración del Chatbot CargosAuto

## Descripción
Este chatbot está integrado usando la librería oficial de Botpress Webchat React, diseñado para proporcionar soporte técnico a los usuarios de la aplicación CargosAuto.

## Características

### ✨ Funcionalidades
- **Icono flotante**: Siempre visible en la esquina inferior derecha
- **Diseño consistente**: Sigue el tema de colores de la aplicación
- **Animaciones suaves**: Transiciones elegantes al abrir/cerrar
- **Responsive**: Se adapta a diferentes tamaños de pantalla
- **Z-index optimizado**: No interfiere con otros elementos de la UI

### 🎨 Diseño
- **Colores**: Azul principal (#2563EB) y gris oscuro (#1F2937)
- **Efectos**: Gradientes, sombras y animaciones CSS
- **Iconos**: SVG optimizados para mejor rendimiento
- **Tipografía**: Hereda la fuente de la aplicación

### 🔧 Configuración

#### Archivos principales:
- `src/components/ChatBot.jsx` - Componente principal del chatbot
- `src/config/chatbot.js` - Configuración centralizada
- `src/layouts/DashboardLayout.jsx` - Integración en el layout global

#### Client ID actual:
```
6b5a110c-1e98-47a1-b5e8-bdfeb897476c
```

### 📱 Uso
1. El icono del chatbot aparece automáticamente en todas las páginas
2. Click en el icono para abrir/cerrar el chat
3. El chat mantiene el estado durante la navegación
4. Indicador visual cuando el soporte está disponible

### 🛠️ Personalización

#### Para cambiar el Client ID:
1. Ve a tu dashboard de Botpress
2. Selecciona tu bot
3. Ve a Webchat > Advanced Settings
4. Copia el nuevo Client ID
5. Actualiza `src/config/chatbot.js`

#### Para personalizar colores:
Modifica las variables en `CHATBOT_CONFIG.theme` en `src/config/chatbot.js`

#### Para cambiar posición:
Ajusta `CHATBOT_CONFIG.window.position` en `src/config/chatbot.js`

### 🚀 Instalación
```bash
npm install @botpress/webchat
```

### 📋 Dependencias
- React 18+
- @botpress/webchat
- Tailwind CSS (para estilos)

### 🔍 Troubleshooting

#### El chatbot no aparece:
1. Verifica que el Client ID esté configurado correctamente
2. Revisa la consola del navegador para errores
3. Asegúrate de que el bot esté publicado en Botpress

#### Problemas de estilos:
1. Verifica que Tailwind CSS esté funcionando
2. Revisa que los estilos personalizados estén en `index.css`
3. Comprueba el z-index si hay problemas de superposición

### 📞 Soporte
Para problemas técnicos con el chatbot, contacta al administrador del sistema o revisa la documentación de Botpress.
