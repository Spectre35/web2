import React, { createContext, useContext, useState } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
