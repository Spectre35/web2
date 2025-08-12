import React, { createContext, useContext } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext.jsx";

// Contexto para exponer el mainRef globalmente
const MainScrollContext = createContext(null);
export function useMainScroll() {
  return useContext(MainScrollContext);
}


function DashboardLayoutInner() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const mainRef = React.useRef(null);

  // Scroll al top al cambiar de ruta
  React.useEffect(() => {
    // Forzar scroll global
    window.scrollTo(0, 0);

    // Forzar scroll de todos los contenedores con overflow-y-auto dentro de <main>
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      // Buscar todos los divs con overflow-y-auto y resetear su scroll
      const scrollables = mainRef.current.querySelectorAll('[class*=\"overflow-y-auto\"]');
      scrollables.forEach(el => { el.scrollTop = 0; });
    }
  }, [location.pathname]);

  // Scroll al top si el contenido cambia (por ejemplo, después de cargar datos)
  React.useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const observer = new MutationObserver(() => {
      main.scrollTop = 0;
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <MainScrollContext.Provider value={mainRef}>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Sidebar />
        <button
          className="fixed top-4 left-4 z-50 bg-gray-800 text-white rounded-full p-2 shadow-lg hover:bg-gray-700 focus:outline-none transition-all duration-500 ease-in-out"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
        >
          {sidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
        <main 
          ref={mainRef} 
          key={location.pathname} 
          className={`flex-1 p-4 md:p-8 w-full overflow-y-auto layout-transition
            ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'}`}
        >
          <div className="layout-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </MainScrollContext.Provider>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardLayoutInner />
    </SidebarProvider>
  );
}
