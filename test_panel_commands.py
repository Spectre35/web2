#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de prueba para verificar comandos npm en Windows
"""

import subprocess
import sys
import os

def test_commands():
    print("🔧 PRUEBA DE COMANDOS PARA EL PANEL DE CONTROL")
    print("="*50)
    
    # Cambiar al directorio del proyecto
    project_path = r"c:\Users\CARGOSAUTO1\OneDrive\Documentos\Web_Consultas_2"
    dashboard_path = os.path.join(project_path, "dashboard")
    
    print(f"📁 Directorio del proyecto: {project_path}")
    print(f"📁 Directorio del dashboard: {dashboard_path}")
    print()
    
    # 1. Probar Node.js
    print("1. 🟢 Probando Node.js...")
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"   ✅ Node.js versión: {result.stdout.strip()}")
        else:
            print(f"   ❌ Error: {result.stderr}")
    except FileNotFoundError:
        print("   ❌ Node.js no encontrado en PATH")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # 2. Probar npm
    print("\n2. 📦 Probando npm...")
    npm_commands = ["npm", "npm.cmd"]
    
    for npm_cmd in npm_commands:
        print(f"\n   Probando comando: {npm_cmd}")
        try:
            result = subprocess.run([npm_cmd, "--version"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"   ✅ {npm_cmd} versión: {result.stdout.strip()}")
                
                # Si funciona, probar más comandos
                print(f"   🔍 Probando '{npm_cmd} run dev -- --host' en dashboard...")
                try:
                    # Solo probar que el comando se puede ejecutar, no esperar que termine
                    dev_process = subprocess.Popen([npm_cmd, "run", "dev", "--", "--host"], 
                                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                                 cwd=dashboard_path)
                    
                    # Esperar 3 segundos y luego terminar
                    import time
                    time.sleep(3)
                    
                    if dev_process.poll() is None:
                        print(f"   ✅ npm run dev -- --host iniciado correctamente")
                        dev_process.terminate()
                        dev_process.wait()
                        print(f"   ✅ Proceso terminado")
                    else:
                        stdout, stderr = dev_process.communicate()
                        print(f"   ⚠️ npm run dev terminó rápidamente: {stderr[:100]}...")
                        
                except Exception as e:
                    print(f"   ❌ Error en npm run dev: {str(e)}")
                
                break
            else:
                print(f"   ❌ Error con {npm_cmd}: {result.stderr}")
        except FileNotFoundError:
            print(f"   ❌ {npm_cmd} no encontrado")
        except Exception as e:
            print(f"   ❌ Error con {npm_cmd}: {str(e)}")
    
    # 3. Verificar directorios
    print("\n3. 📁 Verificando estructura de directorios...")
    
    paths_to_check = [
        (project_path, "Directorio del proyecto"),
        (dashboard_path, "Directorio del dashboard"),
        (os.path.join(project_path, "server.js"), "Archivo server.js"),
        (os.path.join(project_path, "package.json"), "package.json del backend"),
        (os.path.join(dashboard_path, "package.json"), "package.json del dashboard"),
        (os.path.join(project_path, "node_modules"), "node_modules del backend"),
        (os.path.join(dashboard_path, "node_modules"), "node_modules del dashboard"),
    ]
    
    for path, description in paths_to_check:
        if os.path.exists(path):
            if os.path.isfile(path):
                size = os.path.getsize(path)
                print(f"   ✅ {description}: {size} bytes")
            else:
                items = len(os.listdir(path)) if os.path.isdir(path) else 0
                print(f"   ✅ {description}: {items} elementos")
        else:
            print(f"   ❌ {description}: NO ENCONTRADO")
    
    # 4. Probar inicio rápido del servidor
    print("\n4. 🚀 Probando inicio del servidor (5 segundos)...")
    try:
        server_process = subprocess.Popen(
            ["node", "server.js"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=project_path
        )
        
        # Esperar 5 segundos
        import time
        time.sleep(5)
        
        # Verificar si sigue ejecutándose
        if server_process.poll() is None:
            print("   ✅ Servidor iniciado correctamente")
            server_process.terminate()
            server_process.wait()
            print("   ✅ Servidor detenido")
        else:
            stdout, stderr = server_process.communicate()
            print(f"   ❌ Servidor falló: {stderr[:200]}...")
            
    except Exception as e:
        print(f"   ❌ Error al probar servidor: {str(e)}")
    
    print("\n" + "="*50)
    print("🎉 PRUEBA COMPLETADA")
    print("\nSi todos los tests pasaron, el panel de control debería funcionar correctamente.")
    input("\nPresiona Enter para salir...")

if __name__ == "__main__":
    test_commands()
