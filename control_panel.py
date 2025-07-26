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
        self.stop_all_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        # Segunda fila de botones para operaciones avanzadas
        quick_buttons_frame2 = tk.Frame(quick_access_frame, bg='#2a2a2a')
        quick_buttons_frame2.pack(fill=tk.X, pady=5)
        
        self.show_processes_btn = tk.Button(quick_buttons_frame2, text="👁️ Ver Procesos Activos", 
                                          command=self.show_active_processes, bg='#0088aa', fg='white', 
                                          font=('Arial', 10, 'bold'), padx=20)
        self.show_processes_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.kill_all_processes_btn = tk.Button(quick_buttons_frame2, text="💀 Matar Todos los Procesos", 
                                              command=self.kill_all_node_processes, bg='#990000', fg='white', 
                                              font=('Arial', 10, 'bold'), padx=20)
        self.kill_all_processes_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.diagnose_btn = tk.Button(quick_buttons_frame2, text="🔧 Diagnóstico", 
                                    command=self.run_diagnostics, bg='#aa8800', fg='white', 
                                    font=('Arial', 10, 'bold'), padx=20)
        self.diagnose_btn.pack(side=tk.LEFT)
        
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
                    # Usar node en Windows y otros sistemas
                    node_command = "node"
                    
                    # Verificar si existe server.js
                    server_js_path = os.path.join(self.project_path, "server.js")
                    if not os.path.exists(server_js_path):
                        raise Exception(f"No se encontró server.js en {self.project_path}")
                    
                    # Verificar si existe package.json y node_modules
                    package_json_path = os.path.join(self.project_path, "package.json")
                    node_modules_path = os.path.join(self.project_path, "node_modules")
                    
                    if os.path.exists(package_json_path) and not os.path.exists(node_modules_path):
                        self.log_message("⚠️ No se encontró node_modules, ejecutando npm install primero...")
                        npm_command = "npm.cmd" if sys.platform == "win32" else "npm"
                        install_process = subprocess.run(
                            [npm_command, "install"],
                            cwd=self.project_path,
                            capture_output=True,
                            text=True
                        )
                        if install_process.returncode != 0:
                            raise Exception(f"Error en npm install: {install_process.stderr}")
                        self.log_message("✅ npm install completado")
                    
                    self.log_message(f"🚀 Ejecutando: {node_command} server.js en {self.project_path}")
                    
                    self.server_process = subprocess.Popen(
                        [node_command, "server.js"],
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
                    # Usar npm.cmd en Windows, npm en otros sistemas
                    npm_command = "npm.cmd" if sys.platform == "win32" else "npm"
                    
                    # Verificar si existe el package.json
                    package_json_path = os.path.join(self.dashboard_path, "package.json")
                    if not os.path.exists(package_json_path):
                        raise Exception(f"No se encontró package.json en {self.dashboard_path}")
                    
                    # Verificar si existe node_modules
                    node_modules_path = os.path.join(self.dashboard_path, "node_modules")
                    if not os.path.exists(node_modules_path):
                        self.log_message("⚠️ No se encontró node_modules, ejecutando npm install primero...")
                        install_process = subprocess.run(
                            [npm_command, "install"],
                            cwd=self.dashboard_path,
                            capture_output=True,
                            text=True
                        )
                        if install_process.returncode != 0:
                            raise Exception(f"Error en npm install: {install_process.stderr}")
                        self.log_message("✅ npm install completado")
                    
                    self.log_message(f"🚀 Ejecutando: {npm_command} run dev -- --host en {self.dashboard_path}")
                    
                    self.dashboard_process = subprocess.Popen(
                        [npm_command, "run", "dev", "--", "--host"],
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
        """Detener servidor y dashboard de forma segura"""
        self.log_message("⛔ Deteniendo todos los servicios de forma segura...")
        
        # Primero intentar detener de forma normal
        self.stop_dashboard()
        time.sleep(1)
        self.stop_server()
        
        # Verificar si quedan procesos ejecutándose
        time.sleep(2)
        remaining_processes = self.get_running_node_processes()
        
        if remaining_processes:
            self.log_message(f"⚠️ Aún quedan {len(remaining_processes)} procesos Node.js ejecutándose")
            
            # Preguntar si quiere forzar la eliminación
            result = messagebox.askyesno(
                "⚠️ Procesos Restantes",
                f"Se detectaron {len(remaining_processes)} procesos Node.js aún ejecutándose.\n\n"
                "¿Quieres forzar su eliminación?\n\n"
                "⚠️ Esto terminará abruptamente cualquier proceso Node.js activo."
            )
            
            if result:
                self.kill_remaining_processes(remaining_processes)
        else:
            self.log_message("✅ Todos los servicios se detuvieron correctamente")
            self.status_bar.config(text="✅ Todos los servicios detenidos")
    
    def kill_remaining_processes(self, processes):
        """Eliminar procesos específicos restantes"""
        try:
            killed_count = 0
            for proc in processes:
                try:
                    if sys.platform == "win32":
                        result = subprocess.run([
                            "taskkill", "/F", "/PID", proc['pid']
                        ], capture_output=True)
                        if result.returncode == 0:
                            killed_count += 1
                            self.log_message(f"✅ Eliminado proceso PID {proc['pid']}")
                        else:
                            self.log_message(f"⚠️ No se pudo eliminar proceso PID {proc['pid']}")
                except Exception as e:
                    self.log_message(f"❌ Error eliminando PID {proc['pid']}: {str(e)}")
            
            if killed_count > 0:
                self.log_message(f"✅ Se eliminaron {killed_count} procesos restantes")
                self.status_bar.config(text=f"✅ {killed_count} procesos eliminados")
            
        except Exception as e:
            self.log_message(f"❌ Error al eliminar procesos restantes: {str(e)}")
    
    def kill_all_node_processes(self):
        """Matar todos los procesos de Node.js, npm y similares"""
        try:
            # Confirmar con el usuario
            result = messagebox.askyesno(
                "⚠️ Confirmación",
                "¿Estás seguro de que quieres MATAR TODOS los procesos de Node.js y npm?\n\n"
                "Esto detendrá:\n"
                "• Todos los servidores Node.js\n"
                "• Todos los procesos npm/npx\n"
                "• Cualquier aplicación Node ejecutándose\n\n"
                "⚠️ Esta acción no se puede deshacer.",
                icon='warning'
            )
            
            if not result:
                self.log_message("❌ Operación cancelada por el usuario")
                return
            
            self.log_message("💀 Iniciando eliminación de todos los procesos Node.js...")
            killed_count = 0
            
            if sys.platform == "win32":
                # En Windows, buscar y matar procesos
                process_names = ["node.exe", "npm.cmd", "npx.cmd", "nodemon.exe"]
                
                for process_name in process_names:
                    try:
                        # Obtener lista de procesos
                        result = subprocess.run(
                            ["tasklist", "/FI", f"IMAGENAME eq {process_name}", "/FO", "CSV"],
                            capture_output=True, text=True
                        )
                        
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:  # Hay procesos (más que solo el header)
                            self.log_message(f"🔍 Encontrados procesos {process_name}:")
                            
                            for line in lines[1:]:  # Saltar header
                                if line.strip():
                                    parts = line.split('","')
                                    if len(parts) >= 2:
                                        pid = parts[1].strip('"')
                                        self.log_message(f"   PID: {pid}")
                            
                            # Matar todos los procesos de este tipo
                            kill_result = subprocess.run(
                                ["taskkill", "/F", "/IM", process_name],
                                capture_output=True, text=True
                            )
                            
                            if kill_result.returncode == 0:
                                lines_killed = len([l for l in lines[1:] if l.strip()])
                                killed_count += lines_killed
                                self.log_message(f"✅ Eliminados {lines_killed} procesos {process_name}")
                            else:
                                self.log_message(f"⚠️ No se encontraron procesos {process_name} para eliminar")
                                
                    except Exception as e:
                        self.log_message(f"❌ Error procesando {process_name}: {str(e)}")
                
                # También buscar procesos específicos por nombre de comando
                try:
                    # Buscar procesos que contengan "server.js" o "vite"
                    wmic_result = subprocess.run([
                        "wmic", "process", "where", 
                        "CommandLine like '%server.js%' or CommandLine like '%vite%' or CommandLine like '%npm run%'",
                        "get", "ProcessId,CommandLine", "/format:csv"
                    ], capture_output=True, text=True)
                    
                    if wmic_result.returncode == 0:
                        lines = wmic_result.stdout.strip().split('\n')
                        for line in lines[1:]:  # Saltar header
                            if line.strip() and ',' in line:
                                parts = line.split(',')
                                if len(parts) >= 3 and parts[2].strip():
                                    pid = parts[2].strip()
                                    command = parts[1].strip()
                                    if pid.isdigit():
                                        self.log_message(f"🎯 Encontrado proceso específico PID {pid}: {command}")
                                        kill_specific = subprocess.run([
                                            "taskkill", "/F", "/PID", pid
                                        ], capture_output=True)
                                        if kill_specific.returncode == 0:
                                            killed_count += 1
                                            self.log_message(f"✅ Eliminado proceso PID {pid}")
                                
                except Exception as e:
                    self.log_message(f"⚠️ Error en búsqueda específica: {str(e)}")
                    
            else:
                # En sistemas Unix-like
                try:
                    result = subprocess.run(["pkill", "-f", "node"], capture_output=True)
                    if result.returncode == 0:
                        self.log_message("✅ Procesos Node.js eliminados en sistema Unix")
                        killed_count += 1
                except Exception as e:
                    self.log_message(f"❌ Error en sistema Unix: {str(e)}")
            
            # Resetear estado interno
            self.server_process = None
            self.dashboard_process = None
            self.server_running = False
            self.dashboard_running = False
            self.update_server_ui(False)
            self.update_dashboard_ui(False)
            
            if killed_count > 0:
                self.log_message(f"💀 ¡COMPLETADO! Se eliminaron {killed_count} procesos en total")
                self.status_bar.config(text=f"💀 {killed_count} procesos eliminados")
                messagebox.showinfo(
                    "✅ Proceso Completado",
                    f"Se eliminaron exitosamente {killed_count} procesos.\n\n"
                    "Todos los servidores Node.js y npm han sido detenidos."
                )
            else:
                self.log_message("ℹ️ No se encontraron procesos Node.js para eliminar")
                self.status_bar.config(text="ℹ️ No hay procesos para eliminar")
                
        except Exception as e:
            self.log_message(f"❌ Error al eliminar procesos: {str(e)}")
            messagebox.showerror("Error", f"Error al eliminar procesos:\n{str(e)}")
    
    def get_running_node_processes(self):
        """Obtener lista de procesos Node.js ejecutándose"""
        processes = []
        try:
            if sys.platform == "win32":
                result = subprocess.run([
                    "wmic", "process", "where", "name='node.exe'",
                    "get", "ProcessId,CommandLine", "/format:csv"
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines[1:]:
                        if line.strip() and ',' in line:
                            parts = line.split(',')
                            if len(parts) >= 3:
                                pid = parts[2].strip()
                                command = parts[1].strip()
                                if pid.isdigit():
                                    processes.append({"pid": pid, "command": command})
            
            return processes
        except Exception as e:
            self.log_message(f"❌ Error obteniendo procesos: {str(e)}")
            return []
    
    def check_server_status(self):
        """Verificar si el servidor está ejecutándose"""
        try:
            response = requests.get("http://localhost:3000/cargos_auto/ultima-fecha", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def check_dashboard_status(self):
        """Verificar si el dashboard está ejecutándose"""
        # Intentar diferentes URLs ya que --host hace que sea accesible desde 0.0.0.0
        urls_to_try = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://0.0.0.0:5173"
        ]
        
        for url in urls_to_try:
            try:
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    return True
            except:
                continue
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
    
    def show_active_processes(self):
        """Mostrar ventana con procesos Node.js activos"""
        try:
            processes = self.get_running_node_processes()
            
            # Crear ventana popup
            process_window = tk.Toplevel(self.root)
            process_window.title("👁️ Procesos Node.js Activos")
            process_window.geometry("900x500")
            process_window.configure(bg='#1a1a1a')
            
            # Frame principal
            main_frame = tk.Frame(process_window, bg='#1a1a1a', padx=20, pady=20)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Título
            title_label = tk.Label(main_frame, text="👁️ Procesos Node.js Activos", 
                                 bg='#1a1a1a', fg='#ffffff', font=('Arial', 16, 'bold'))
            title_label.pack(pady=(0, 20))
            
            if not processes:
                no_process_label = tk.Label(main_frame, text="✅ No se encontraron procesos Node.js ejecutándose", 
                                          bg='#1a1a1a', fg='#00ff00', font=('Arial', 12))
                no_process_label.pack(pady=20)
            else:
                # Crear lista con scrollbar
                list_frame = tk.Frame(main_frame, bg='#2a2a2a')
                list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
                
                # Scrollbar
                scrollbar = tk.Scrollbar(list_frame)
                scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
                
                # Text widget para mostrar procesos
                process_text = tk.Text(list_frame, bg='#1e1e1e', fg='#ffffff', 
                                     font=('Consolas', 10), wrap=tk.WORD,
                                     yscrollcommand=scrollbar.set)
                process_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
                scrollbar.config(command=process_text.yview)
                
                # Agregar información de procesos
                process_text.insert(tk.END, f"🔍 Se encontraron {len(processes)} procesos Node.js:\n\n")
                
                for i, proc in enumerate(processes, 1):
                    process_text.insert(tk.END, f"Proceso #{i}:\n")
                    process_text.insert(tk.END, f"  📋 PID: {proc['pid']}\n")
                    process_text.insert(tk.END, f"  💻 Comando: {proc['command']}\n")
                    process_text.insert(tk.END, f"  {'='*80}\n\n")
                
                process_text.config(state=tk.DISABLED)
            
            # Botones
            button_frame = tk.Frame(main_frame, bg='#1a1a1a')
            button_frame.pack(fill=tk.X, pady=10)
            
            refresh_btn = tk.Button(button_frame, text="🔄 Actualizar", 
                                  command=lambda: self.refresh_process_window(process_window),
                                  bg='#0066aa', fg='white', font=('Arial', 10, 'bold'), padx=20)
            refresh_btn.pack(side=tk.LEFT, padx=(0, 10))
            
            close_btn = tk.Button(button_frame, text="❌ Cerrar", 
                                command=process_window.destroy,
                                bg='#666666', fg='white', font=('Arial', 10, 'bold'), padx=20)
            close_btn.pack(side=tk.RIGHT)
            
            self.log_message(f"👁️ Ventana de procesos abierta - {len(processes)} procesos encontrados")
            
        except Exception as e:
            self.log_message(f"❌ Error al mostrar procesos: {str(e)}")
            messagebox.showerror("Error", f"Error al mostrar procesos:\n{str(e)}")
    
    def refresh_process_window(self, window):
        """Actualizar ventana de procesos"""
        window.destroy()
        self.show_active_processes()
    
    def run_diagnostics(self):
        """Ejecutar diagnósticos del sistema"""
        try:
            # Crear ventana de diagnóstico
            diag_window = tk.Toplevel(self.root)
            diag_window.title("🔧 Diagnóstico del Sistema")
            diag_window.geometry("800x600")
            diag_window.configure(bg='#1a1a1a')
            
            # Frame principal
            main_frame = tk.Frame(diag_window, bg='#1a1a1a', padx=20, pady=20)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Título
            title_label = tk.Label(main_frame, text="🔧 Diagnóstico del Sistema", 
                                 bg='#1a1a1a', fg='#ffffff', font=('Arial', 16, 'bold'))
            title_label.pack(pady=(0, 20))
            
            # Área de texto para resultados
            diag_text = scrolledtext.ScrolledText(main_frame, height=25, bg='#1e1e1e', fg='#ffffff', 
                                                font=('Consolas', 9), wrap=tk.WORD)
            diag_text.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
            
            def run_diag():
                diag_text.insert(tk.END, "🔧 INICIANDO DIAGNÓSTICO DEL SISTEMA\n")
                diag_text.insert(tk.END, "="*60 + "\n\n")
                
                # 1. Verificar Node.js
                diag_text.insert(tk.END, "1. 📦 Verificando Node.js...\n")
                try:
                    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
                    if result.returncode == 0:
                        diag_text.insert(tk.END, f"   ✅ Node.js instalado: {result.stdout.strip()}\n")
                    else:
                        diag_text.insert(tk.END, "   ❌ Node.js no encontrado\n")
                except:
                    diag_text.insert(tk.END, "   ❌ Error al verificar Node.js\n")
                
                # 2. Verificar npm
                diag_text.insert(tk.END, "\n2. 📦 Verificando npm...\n")
                try:
                    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
                    result = subprocess.run([npm_cmd, "--version"], capture_output=True, text=True)
                    if result.returncode == 0:
                        diag_text.insert(tk.END, f"   ✅ npm instalado: {result.stdout.strip()}\n")
                    else:
                        diag_text.insert(tk.END, "   ❌ npm no encontrado\n")
                except:
                    diag_text.insert(tk.END, "   ❌ Error al verificar npm\n")
                
                # 3. Verificar archivos del proyecto
                diag_text.insert(tk.END, "\n3. 📁 Verificando archivos del proyecto...\n")
                files_to_check = [
                    ("server.js", "Servidor backend"),
                    ("package.json", "Configuración del proyecto"),
                    ("dashboard/package.json", "Configuración del dashboard"),
                    ("dashboard/src/App.jsx", "Aplicación principal del dashboard"),
                    ("control_panel.py", "Panel de control")
                ]
                
                for file_path, description in files_to_check:
                    full_path = os.path.join(self.project_path, file_path)
                    if os.path.exists(full_path):
                        size = os.path.getsize(full_path)
                        diag_text.insert(tk.END, f"   ✅ {description}: {file_path} ({size} bytes)\n")
                    else:
                        diag_text.insert(tk.END, f"   ❌ {description}: {file_path} NO ENCONTRADO\n")
                
                # 4. Verificar node_modules
                diag_text.insert(tk.END, "\n4. 📦 Verificando dependencias...\n")
                
                # Backend node_modules
                backend_modules = os.path.join(self.project_path, "node_modules")
                if os.path.exists(backend_modules):
                    modules_count = len([d for d in os.listdir(backend_modules) if os.path.isdir(os.path.join(backend_modules, d))])
                    diag_text.insert(tk.END, f"   ✅ Backend node_modules: {modules_count} paquetes\n")
                else:
                    diag_text.insert(tk.END, "   ⚠️ Backend node_modules no encontrado\n")
                
                # Dashboard node_modules
                dashboard_modules = os.path.join(self.dashboard_path, "node_modules")
                if os.path.exists(dashboard_modules):
                    modules_count = len([d for d in os.listdir(dashboard_modules) if os.path.isdir(os.path.join(dashboard_modules, d))])
                    diag_text.insert(tk.END, f"   ✅ Dashboard node_modules: {modules_count} paquetes\n")
                else:
                    diag_text.insert(tk.END, "   ⚠️ Dashboard node_modules no encontrado\n")
                
                # 5. Verificar puertos
                diag_text.insert(tk.END, "\n5. 🌐 Verificando puertos...\n")
                ports_to_check = [
                    (3000, "Backend API"),
                    (5173, "Dashboard Frontend")
                ]
                
                for port, service in ports_to_check:
                    try:
                        response = requests.get(f"http://localhost:{port}", timeout=3)
                        diag_text.insert(tk.END, f"   ✅ Puerto {port} ({service}): ACTIVO - Status {response.status_code}\n")
                    except requests.exceptions.ConnectionError:
                        diag_text.insert(tk.END, f"   ⚠️ Puerto {port} ({service}): NO RESPONDE\n")
                    except Exception as e:
                        diag_text.insert(tk.END, f"   ❌ Puerto {port} ({service}): Error - {str(e)}\n")
                
                # 6. Verificar procesos Node.js
                diag_text.insert(tk.END, "\n6. ⚙️ Verificando procesos Node.js activos...\n")
                processes = self.get_running_node_processes()
                if processes:
                    diag_text.insert(tk.END, f"   🔍 Se encontraron {len(processes)} procesos Node.js:\n")
                    for i, proc in enumerate(processes, 1):
                        diag_text.insert(tk.END, f"     {i}. PID {proc['pid']}: {proc['command'][:80]}...\n")
                else:
                    diag_text.insert(tk.END, "   ✅ No hay procesos Node.js ejecutándose\n")
                
                # 7. Recomendaciones
                diag_text.insert(tk.END, "\n7. 💡 RECOMENDACIONES:\n")
                diag_text.insert(tk.END, "="*40 + "\n")
                
                if not os.path.exists(backend_modules):
                    diag_text.insert(tk.END, "   🔧 Ejecutar 'npm install' en el directorio raíz del proyecto\n")
                
                if not os.path.exists(dashboard_modules):
                    diag_text.insert(tk.END, "   🔧 Ejecutar 'npm install' en el directorio dashboard/\n")
                
                try:
                    requests.get("http://localhost:3000", timeout=3)
                except:
                    diag_text.insert(tk.END, "   🔧 Iniciar el servidor backend (puerto 3000)\n")
                
                try:
                    requests.get("http://localhost:5173", timeout=3)
                except:
                    diag_text.insert(tk.END, "   🔧 Iniciar el dashboard frontend (puerto 5173)\n")
                
                if len(processes) > 2:
                    diag_text.insert(tk.END, f"   ⚠️ Hay {len(processes)} procesos Node.js ejecutándose, considera usar 'Matar Todos los Procesos'\n")
                
                diag_text.insert(tk.END, "\n✅ DIAGNÓSTICO COMPLETADO\n")
                diag_text.see(tk.END)
            
            # Ejecutar diagnóstico en hilo separado
            threading.Thread(target=run_diag, daemon=True).start()
            
            # Botón para cerrar
            close_btn = tk.Button(main_frame, text="❌ Cerrar", 
                                command=diag_window.destroy,
                                bg='#666666', fg='white', font=('Arial', 10, 'bold'), padx=20)
            close_btn.pack(pady=10)
            
            self.log_message("🔧 Diagnóstico del sistema iniciado")
            
        except Exception as e:
            self.log_message(f"❌ Error al ejecutar diagnóstico: {str(e)}")
            messagebox.showerror("Error", f"Error al ejecutar diagnóstico:\n{str(e)}")

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