import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import os
import sys
import time
import requests
from datetime import datetime
import json

class ControlPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Control Panel - Web Consultas 2.0")
        self.root.geometry("800x600")
        self.root.configure(bg='#1a1a1a')
        
        # Variables para los procesos
        self.server_process = None
        self.dashboard_process = None
        
        # Rutas del proyecto
        self.project_path = r"c:\Users\CARGOSAUTO1\OneDrive\Documentos\Web_Consultas_2"
        self.dashboard_path = os.path.join(self.project_path, "dashboard")
        
        # Estado de los servicios
        self.server_running = False
        self.dashboard_running = False
        
        self.setup_ui()
        self.start_status_check()
    
    def setup_ui(self):
        # Estilo moderno
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'), background='#1a1a1a', foreground='#ffffff')
        style.configure('Status.TLabel', font=('Arial', 12), background='#1a1a1a')
        style.configure('Success.TLabel', foreground='#00ff00', background='#1a1a1a')
        style.configure('Error.TLabel', foreground='#ff0000', background='#1a1a1a')
        style.configure('Warning.TLabel', foreground='#ffaa00', background='#1a1a1a')
        
        # Frame principal
        main_frame = tk.Frame(self.root, bg='#1a1a1a', padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        title_label = ttk.Label(main_frame, text="🚀 Control Panel - Web Consultas 2.0", style='Title.TLabel')
        title_label.pack(pady=(0, 20))
        
        # Frame de control
        control_frame = tk.Frame(main_frame, bg='#2a2a2a', relief=tk.RAISED, bd=2)
        control_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Sección del Servidor
        server_section = tk.LabelFrame(control_frame, text="🖥️ Servidor Backend (Puerto 3000)", 
                                     bg='#2a2a2a', fg='#ffffff', font=('Arial', 12, 'bold'), padx=10, pady=10)
        server_section.pack(fill=tk.X, padx=10, pady=10)
        
        self.server_status_label = ttk.Label(server_section, text="⚫ Detenido", style='Error.TLabel')
        self.server_status_label.pack(anchor=tk.W)
        
        server_buttons_frame = tk.Frame(server_section, bg='#2a2a2a')
        server_buttons_frame.pack(fill=tk.X, pady=5)
        
        self.start_server_btn = tk.Button(server_buttons_frame, text="▶️ Iniciar Servidor", 
                                        command=self.start_server, bg='#00aa00', fg='white', 
                                        font=('Arial', 10, 'bold'), padx=20)
        self.start_server_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.stop_server_btn = tk.Button(server_buttons_frame, text="⏹️ Detener Servidor", 
                                       command=self.stop_server, bg='#aa0000', fg='white', 
                                       font=('Arial', 10, 'bold'), padx=20, state=tk.DISABLED)
        self.stop_server_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.restart_server_btn = tk.Button(server_buttons_frame, text="🔄 Reiniciar Servidor", 
                                          command=self.restart_server, bg='#0066aa', fg='white', 
                                          font=('Arial', 10, 'bold'), padx=20)
        self.restart_server_btn.pack(side=tk.LEFT)
        
        # Sección del Dashboard
        dashboard_section = tk.LabelFrame(control_frame, text="🎨 Dashboard Frontend (Puerto 5173)", 
                                        bg='#2a2a2a', fg='#ffffff', font=('Arial', 12, 'bold'), padx=10, pady=10)
        dashboard_section.pack(fill=tk.X, padx=10, pady=10)
        
        self.dashboard_status_label = ttk.Label(dashboard_section, text="⚫ Detenido", style='Error.TLabel')
        self.dashboard_status_label.pack(anchor=tk.W)
        
        dashboard_buttons_frame = tk.Frame(dashboard_section, bg='#2a2a2a')
        dashboard_buttons_frame.pack(fill=tk.X, pady=5)
        
        self.start_dashboard_btn = tk.Button(dashboard_buttons_frame, text="▶️ Iniciar Dashboard", 
                                           command=self.start_dashboard, bg='#00aa00', fg='white', 
                                           font=('Arial', 10, 'bold'), padx=20)
        self.start_dashboard_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.stop_dashboard_btn = tk.Button(dashboard_buttons_frame, text="⏹️ Detener Dashboard", 
                                          command=self.stop_dashboard, bg='#aa0000', fg='white', 
                                          font=('Arial', 10, 'bold'), padx=20, state=tk.DISABLED)
        self.stop_dashboard_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.restart_dashboard_btn = tk.Button(dashboard_buttons_frame, text="🔄 Reiniciar Dashboard", 
                                             command=self.restart_dashboard, bg='#0066aa', fg='white', 
                                             font=('Arial', 10, 'bold'), padx=20)
        self.restart_dashboard_btn.pack(side=tk.LEFT)
        
        # Botones de acceso rápido
        quick_access_frame = tk.LabelFrame(main_frame, text="🔗 Acceso Rápido", 
                                         bg='#2a2a2a', fg='#ffffff', font=('Arial', 12, 'bold'), padx=10, pady=10)
        quick_access_frame.pack(fill=tk.X, pady=(0, 20))
        
        quick_buttons_frame = tk.Frame(quick_access_frame, bg='#2a2a2a')
        quick_buttons_frame.pack(fill=tk.X, pady=5)
        
        self.open_dashboard_btn = tk.Button(quick_buttons_frame, text="🌐 Abrir Dashboard", 
                                          command=self.open_dashboard_browser, bg='#6600aa', fg='white', 
                                          font=('Arial', 10, 'bold'), padx=20)
        self.open_dashboard_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.open_api_btn = tk.Button(quick_buttons_frame, text="🔧 Test API", 
                                    command=self.test_api, bg='#aa6600', fg='white', 
                                    font=('Arial', 10, 'bold'), padx=20)
        self.open_api_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.start_all_btn = tk.Button(quick_buttons_frame, text="🚀 Iniciar Todo", 
                                     command=self.start_all, bg='#006600', fg='white', 
                                     font=('Arial', 10, 'bold'), padx=20)
        self.start_all_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.stop_all_btn = tk.Button(quick_buttons_frame, text="⛔ Detener Todo", 
                                    command=self.stop_all, bg='#660000', fg='white', 
                                    font=('Arial', 10, 'bold'), padx=20)
        self.stop_all_btn.pack(side=tk.LEFT)
        
        # Logs en tiempo real
        log_frame = tk.LabelFrame(main_frame, text="📋 Logs en Tiempo Real", 
                                bg='#2a2a2a', fg='#ffffff', font=('Arial', 12, 'bold'), padx=10, pady=10)
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, bg='#1e1e1e', fg='#00ff00', 
                                                font=('Consolas', 9), wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Botón para limpiar logs
        clear_log_btn = tk.Button(log_frame, text="🗑️ Limpiar Logs", 
                                command=self.clear_logs, bg='#555555', fg='white', 
                                font=('Arial', 9), padx=15)
        clear_log_btn.pack(pady=5)
        
        # Status bar
        self.status_bar = tk.Label(self.root, text="💤 Sistema en espera", bd=1, relief=tk.SUNKEN, 
                                 anchor=tk.W, bg='#1a1a1a', fg='#ffffff', font=('Arial', 9))
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Log inicial
        self.log_message("🎯 Control Panel iniciado correctamente")
        self.log_message(f"📁 Ruta del proyecto: {self.project_path}")
        self.log_message(f"📁 Ruta del dashboard: {self.dashboard_path}")
    
    def log_message(self, message):
        """Agregar mensaje al log con timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        self.root.update()
    
    def clear_logs(self):
        """Limpiar el área de logs"""
        self.log_text.delete(1.0, tk.END)
        self.log_message("🗑️ Logs limpiados")
    
    def start_server(self):
        """Iniciar el servidor backend"""
        if self.server_running:
            self.log_message("⚠️ El servidor ya está ejecutándose")
            return
            
        try:
            self.log_message("🔄 Iniciando servidor backend...")
            self.status_bar.config(text="🔄 Iniciando servidor...")
            
            # Cambiar al directorio del proyecto
            os.chdir(self.project_path)
            
            # Iniciar el servidor en un hilo separado
            def run_server():
                try:
                    self.server_process = subprocess.Popen(
                        ["node", "server.js"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        cwd=self.project_path,
                        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
                    )
                    
                    # Leer output del servidor
                    for line in iter(self.server_process.stdout.readline, ''):
                        if line:
                            self.log_message(f"🖥️ SERVER: {line.strip()}")
                            
                except Exception as e:
                    self.log_message(f"❌ Error al iniciar servidor: {str(e)}")
            
            threading.Thread(target=run_server, daemon=True).start()
            
            # Esperar un poco y verificar si se inició correctamente
            time.sleep(2)
            if self.check_server_status():
                self.server_running = True
                self.update_server_ui(True)
                self.log_message("✅ Servidor backend iniciado correctamente en puerto 3000")
                self.status_bar.config(text="✅ Servidor ejecutándose")
            else:
                self.log_message("❌ Error al iniciar el servidor")
                self.status_bar.config(text="❌ Error al iniciar servidor")
                
        except Exception as e:
            self.log_message(f"❌ Error: {str(e)}")
            self.status_bar.config(text="❌ Error al iniciar servidor")
    
    def stop_server(self):
        """Detener el servidor backend"""
        if not self.server_running:
            self.log_message("⚠️ El servidor no está ejecutándose")
            return
            
        try:
            self.log_message("🔄 Deteniendo servidor backend...")
            self.status_bar.config(text="🔄 Deteniendo servidor...")
            
            if self.server_process:
                if sys.platform == "win32":
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.server_process.pid)], 
                                 capture_output=True)
                else:
                    self.server_process.terminate()
                    self.server_process.wait()
                
                self.server_process = None
            
            self.server_running = False
            self.update_server_ui(False)
            self.log_message("✅ Servidor backend detenido")
            self.status_bar.config(text="⏹️ Servidor detenido")
            
        except Exception as e:
            self.log_message(f"❌ Error al detener servidor: {str(e)}")
    
    def restart_server(self):
        """Reiniciar el servidor backend"""
        self.log_message("🔄 Reiniciando servidor backend...")
        self.stop_server()
        time.sleep(1)
        self.start_server()
    
    def start_dashboard(self):
        """Iniciar el dashboard frontend"""
        if self.dashboard_running:
            self.log_message("⚠️ El dashboard ya está ejecutándose")
            return
            
        try:
            self.log_message("🔄 Iniciando dashboard frontend...")
            self.status_bar.config(text="🔄 Iniciando dashboard...")
            
            def run_dashboard():
                try:
                    self.dashboard_process = subprocess.Popen(
                        ["npm", "run", "dev"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        cwd=self.dashboard_path,
                        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
                    )
                    
                    # Leer output del dashboard
                    for line in iter(self.dashboard_process.stdout.readline, ''):
                        if line:
                            self.log_message(f"🎨 DASHBOARD: {line.strip()}")
                            
                except Exception as e:
                    self.log_message(f"❌ Error al iniciar dashboard: {str(e)}")
            
            threading.Thread(target=run_dashboard, daemon=True).start()
            
            # Esperar y verificar si se inició correctamente
            time.sleep(3)
            if self.check_dashboard_status():
                self.dashboard_running = True
                self.update_dashboard_ui(True)
                self.log_message("✅ Dashboard frontend iniciado correctamente en puerto 5173")
                self.status_bar.config(text="✅ Dashboard ejecutándose")
            else:
                self.log_message("❌ Error al iniciar el dashboard")
                self.status_bar.config(text="❌ Error al iniciar dashboard")
                
        except Exception as e:
            self.log_message(f"❌ Error: {str(e)}")
            self.status_bar.config(text="❌ Error al iniciar dashboard")
    
    def stop_dashboard(self):
        """Detener el dashboard frontend"""
        if not self.dashboard_running:
            self.log_message("⚠️ El dashboard no está ejecutándose")
            return
            
        try:
            self.log_message("🔄 Deteniendo dashboard frontend...")
            self.status_bar.config(text="🔄 Deteniendo dashboard...")
            
            if self.dashboard_process:
                if sys.platform == "win32":
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.dashboard_process.pid)], 
                                 capture_output=True)
                else:
                    self.dashboard_process.terminate()
                    self.dashboard_process.wait()
                
                self.dashboard_process = None
            
            self.dashboard_running = False
            self.update_dashboard_ui(False)
            self.log_message("✅ Dashboard frontend detenido")
            self.status_bar.config(text="⏹️ Dashboard detenido")
            
        except Exception as e:
            self.log_message(f"❌ Error al detener dashboard: {str(e)}")
    
    def restart_dashboard(self):
        """Reiniciar el dashboard frontend"""
        self.log_message("🔄 Reiniciando dashboard frontend...")
        self.stop_dashboard()
        time.sleep(1)
        self.start_dashboard()
    
    def start_all(self):
        """Iniciar servidor y dashboard"""
        self.log_message("🚀 Iniciando todos los servicios...")
        self.start_server()
        time.sleep(3)  # Esperar a que el servidor se inicie completamente
        self.start_dashboard()
    
    def stop_all(self):
        """Detener servidor y dashboard"""
        self.log_message("⛔ Deteniendo todos los servicios...")
        self.stop_dashboard()
        time.sleep(1)
        self.stop_server()
    
    def check_server_status(self):
        """Verificar si el servidor está ejecutándose"""
        try:
            response = requests.get("http://localhost:3000/cargos_auto/ultima-fecha", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def check_dashboard_status(self):
        """Verificar si el dashboard está ejecutándose"""
        try:
            response = requests.get("http://localhost:5173", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def update_server_ui(self, running):
        """Actualizar UI del servidor"""
        if running:
            self.server_status_label.config(text="🟢 Ejecutándose", style='Success.TLabel')
            self.start_server_btn.config(state=tk.DISABLED)
            self.stop_server_btn.config(state=tk.NORMAL)
        else:
            self.server_status_label.config(text="⚫ Detenido", style='Error.TLabel')
            self.start_server_btn.config(state=tk.NORMAL)
            self.stop_server_btn.config(state=tk.DISABLED)
    
    def update_dashboard_ui(self, running):
        """Actualizar UI del dashboard"""
        if running:
            self.dashboard_status_label.config(text="🟢 Ejecutándose", style='Success.TLabel')
            self.start_dashboard_btn.config(state=tk.DISABLED)
            self.stop_dashboard_btn.config(state=tk.NORMAL)
        else:
            self.dashboard_status_label.config(text="⚫ Detenido", style='Error.TLabel')
            self.start_dashboard_btn.config(state=tk.NORMAL)
            self.stop_dashboard_btn.config(state=tk.DISABLED)
    
    def open_dashboard_browser(self):
        """Abrir el dashboard en el navegador"""
        if self.dashboard_running:
            import webbrowser
            webbrowser.open("http://localhost:5173")
            self.log_message("🌐 Abriendo dashboard en el navegador")
        else:
            messagebox.showwarning("Advertencia", "El dashboard no está ejecutándose.\nInicia el dashboard primero.")
    
    def test_api(self):
        """Probar la API del servidor"""
        if self.server_running:
            try:
                response = requests.get("http://localhost:3000/cargos_auto/ultima-fecha", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_message(f"✅ API funcionando correctamente: {data}")
                    messagebox.showinfo("Test API", f"✅ API funcionando correctamente\nRespuesta: {data}")
                else:
                    self.log_message(f"⚠️ API respondió con código: {response.status_code}")
                    messagebox.showwarning("Test API", f"⚠️ API respondió con código: {response.status_code}")
            except Exception as e:
                self.log_message(f"❌ Error al probar API: {str(e)}")
                messagebox.showerror("Test API", f"❌ Error al probar API:\n{str(e)}")
        else:
            messagebox.showwarning("Advertencia", "El servidor no está ejecutándose.\nInicia el servidor primero.")
    
    def start_status_check(self):
        """Iniciar verificación periódica del estado"""
        def check_status():
            while True:
                try:
                    # Verificar servidor
                    server_status = self.check_server_status()
                    if server_status != self.server_running:
                        self.server_running = server_status
                        self.root.after(0, lambda: self.update_server_ui(server_status))
                    
                    # Verificar dashboard
                    dashboard_status = self.check_dashboard_status()
                    if dashboard_status != self.dashboard_running:
                        self.dashboard_running = dashboard_status
                        self.root.after(0, lambda: self.update_dashboard_ui(dashboard_status))
                    
                    time.sleep(10)  # Verificar cada 10 segundos
                except:
                    pass
        
        threading.Thread(target=check_status, daemon=True).start()

if __name__ == "__main__":
    root = tk.Tk()
    app = ControlPanel(root)
    
    # Manejar cierre de la aplicación
    def on_closing():
        if messagebox.askokcancel("Salir", "¿Quieres detener todos los servicios y salir?"):
            app.stop_all()
            time.sleep(2)
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()