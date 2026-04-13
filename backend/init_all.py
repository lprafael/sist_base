#!/usr/bin/env python3
"""
init_all.py
Inicialización completa de la base de datos SGS.
Ejecuta todos los scripts de init en orden correcto.

Uso:
    docker exec -it sgs-backend-local python init_all.py
"""

import asyncio
import os
import sys

async def run_script(name: str, module_name: str):
    print(f"\n{'='*60}")
    print(f"  Iniciando: {name}")
    print(f"{'='*60}")
    try:
        mod = __import__(module_name)
        # Buscar el punto de entrada (main, init_database o init_surtidor)
        entry_points = ['main', 'init_database', 'init_surtidor']
        found = False
        for ep in entry_points:
            if hasattr(mod, ep):
                await getattr(mod, ep)()
                found = True
                print(f"  ✅  {name} — OK")
                break
        
        if not found:
            print(f"  ⚠️  {module_name} no tiene un punto de entrada conocido (main, init_database, init_surtidor)")
            return False
            
    except Exception as e:
        print(f"  ❌  Error en {name}: {e}")
        return False
    return True

async def main():
    print("\n" + "🛢️ " * 20)
    print("  SGS — Sistema de Gestión de Surtidor")
    print("  Inicialización completa de la base de datos")
    print("🛢️ " * 20 + "\n")

    scripts = [
        ("Base del Sistema",     "init_database"),
        ("Schema Surtidor",      "init_surtidor"),
        ("Módulo de Mejoras",    "init_mejoras"),
    ]

    ok = 0
    for nombre, modulo in scripts:
        resultado = await run_script(nombre, modulo)
        if resultado:
            ok += 1

    print(f"\n{'='*60}")
    print(f"  Resultado: {ok}/{len(scripts)} módulos inicializados")
    print(f"{'='*60}\n")

    if ok == len(scripts):
        print("✅  Base de datos lista. El sistema puede iniciarse.")
        print("\n📋  Próximos pasos:")
        print("     1. Crear usuario admin:")
        print("        python create_admin.py")
        print("     2. El sistema está disponible en:")
        print("        Frontend: http://localhost:3002")
        print("        API docs: http://localhost:8002/docs")
    else:
        print("⚠️  Algunos módulos fallaron. Revise los errores arriba.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
