import React from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";


function DashboardLayoutInner() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  return (
    <div className="flex min-h-screen sticky bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-all duration-300">
      <Sidebar />
      <button
        className="fixed top-4 left-4 z-50 bg-gray-800 text-white rounded-full p-2 shadow-lg hover:bg-gray-700 focus:outline-none"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
        style={{ transition: 'left 0.3s' }}
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>
      <main className={`transition-all duration-300 flex-1 p-4 md:p-8 overflow-y-auto w-full ${sidebarOpen ? 'ml-0': 'ml-0'}`}> 
        <Outlet />
      </main>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardLayoutInner />
    </SidebarProvider>
  );
}
