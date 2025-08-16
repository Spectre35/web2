import React, { useEffect, useRef, useState } from 'react';

const OnlyOfficeEditor = () => {
  const docEditorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cargar el script de ONLYOFFICE
    const script = document.createElement('script');
    script.src = 'http://localhost:8080/web-apps/apps/api/documents/api.js';
    script.async = true;
    script.onload = () => {
      initializeEditor();
    };
    script.onerror = () => {
      setError('Error cargando ONLYOFFICE Document Server');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Limpiar el script al desmontar
      document.head.removeChild(script);
    };
  }, []);

  const initializeEditor = () => {
    if (!window.DocsAPI) {
      setError('ONLYOFFICE API no disponible');
      setIsLoading(false);
      return;
    }

    const config = {
      document: {
        fileType: 'xlsx',
        key: 'demo-key-' + Date.now(),
        title: 'Hoja de Cálculo Colaborativa',
        url: 'http://localhost:3001/api/documents/sample.xlsx', // URL del documento
        permissions: {
          comment: true,
          copy: true,
          download: true,
          edit: true,
          fillForms: true,
          modifyFilter: true,
          modifyContentControl: true,
          review: true,
          print: true
        }
      },
      documentType: 'cell', // 'word', 'cell', 'slide'
      editorConfig: {
        mode: 'edit', // 'view' o 'edit'
        lang: 'es',
        callbackUrl: 'http://localhost:3001/api/documents/callback',
        user: {
          id: 'user-' + Date.now(),
          name: 'Usuario Demo',
          group: 'visitors'
        },
        customization: {
          autosave: true,
          forcesave: false,
          comments: true,
          zoom: 100,
          compactToolbar: false,
          leftMenu: true,
          rightMenu: true,
          toolbar: true,
          statusBar: true,
          autosaveTimeout: 10000 // 10 segundos
        },
        plugins: {
          autostart: [],
          pluginsData: []
        }
      },
      token: generateJWT(), // JWT Token para seguridad
      type: 'desktop',
      width: '100%',
      height: '600px',
      events: {
        onAppReady: () => {
          console.log('ONLYOFFICE está listo');
          setIsLoading(false);
        },
        onDocumentStateChange: (event) => {
          console.log('Estado del documento cambió:', event);
        },
        onRequestSaveAs: (event) => {
          console.log('Solicitud de guardar como:', event);
        },
        onError: (event) => {
          console.error('Error en ONLYOFFICE:', event);
          setError('Error en el editor: ' + event.data);
        }
      }
    };

    // Inicializar el editor
    window.DocEditor = new window.DocsAPI.DocEditor('onlyoffice-editor', config);
  };

  const generateJWT = () => {
    // En producción, esto debería generarse en el backend
    // Por ahora, retornamos una cadena vacía para desarrollo
    return '';
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onlyoffice-container">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-xl font-bold text-blue-800 mb-2">
          📊 Editor de Hojas de Cálculo Colaborativo
        </h2>
        <p className="text-blue-600">
          Powered by ONLYOFFICE Document Server - Colaboración en tiempo real
        </p>
        {isLoading && (
          <div className="mt-2 text-blue-600">
            <span className="inline-block animate-spin mr-2">⏳</span>
            Cargando editor...
          </div>
        )}
      </div>
      
      <div 
        id="onlyoffice-editor"
        ref={docEditorRef}
        style={{ 
          width: '100%', 
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}
      />
      
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
        <h4 className="font-semibold mb-2">💡 Funciones Disponibles:</h4>
        <ul className="list-disc list-inside text-gray-600">
          <li>Edición colaborativa en tiempo real</li>
          <li>Comentarios y revisiones</li>
          <li>Autoguardado cada 10 segundos</li>
          <li>Compatibilidad completa con Excel (.xlsx)</li>
          <li>Formatos, fórmulas y gráficos</li>
        </ul>
      </div>
    </div>
  );
};

export default OnlyOfficeEditor;
