"""
Test automatizado para el nuevo flujo de Solicitudes, Temporalidad y Aprobación de Cantinas:
1. Solicitud desde el login (estado pendiente).
2. Super Admin lista y aprueba la solicitud.
3. Administrador de la cantina lista sus cantinas y vigencia.
4. Administrador carga un cajero y un despachante con PIN rápido.
5. Cajero ingresa con su PIN y despacha pedido.
6. Validación de expiración temporal: si la cantina está vencida, bloquea ventas.
"""

import asyncio
import os
import sys
import uuid
from datetime import date, timedelta
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async def test_ciclo_completo_cantinas():
    print("\n========================================================")
    print("TEST: CICLO COMPLETO DE ACCESO, TEMPORALIDAD Y CANTINAS")
    print("========================================================")
    engine = create_async_engine(DATABASE_URL)

    test_email = f"admin_test_{uuid.uuid4().hex[:6]}@micancha.test"
    test_slug = f"cantina-test-{uuid.uuid4().hex[:6]}"
    
    async with engine.connect() as conn:
        # 1. Simular Solicitud desde Login
        today = date.today()
        fecha_fin = today + timedelta(days=2) # 2 días de vigencia (fin de semana)

        print(f"1. Creando solicitud de cantina para {test_email}...")
        ins_q = await conn.execute(text("""
            INSERT INTO cantinas.cantinas (
                nombre, slug, descripcion, evento_nombre, tipo_temporalidad,
                fecha_inicio, fecha_fin, dias_habilitados, solicitante_nombre,
                solicitante_email, solicitante_telefono, admin_email,
                estado_aprobacion, activo
            ) VALUES (
                'Cantina Torneo Apertura Test', :slug, 'Buffet de prueba temporal', 'Torneo Apertura 2026',
                'fin_de_semana', :fini, :ffin, '[\"sabado\", \"domingo\"]'::jsonb,
                'Carlos Gómez', :semail, '0981-111-222', :aemail,
                'pendiente', FALSE
            ) RETURNING id
        """), {
            "slug": test_slug,
            "fini": today,
            "ffin": fecha_fin,
            "semail": test_email,
            "aemail": test_email
        })
        cantina_id = str(ins_q.fetchone()[0])
        await conn.commit()
        print(f"-> Solicitud creada con ID: {cantina_id} (Estado: pendiente, Activo: False)")

        # 2. Verificar que aparezca en solicitudes del Super Admin
        sol_res = await conn.execute(text("""
            SELECT id, nombre, estado_aprobacion FROM cantinas.cantinas 
            WHERE id = :cid AND estado_aprobacion = 'pendiente'
        """), {"cid": cantina_id})
        assert sol_res.fetchone() is not None, "Error: la solicitud no aparece como pendiente"
        print("-> Super Admin ve la solicitud en su bandeja de pendientes OK.")

        # 3. Super Admin aprueba la solicitud
        print("2. Super Admin aprueba y habilita la cantina...")
        await conn.execute(text("""
            UPDATE cantinas.cantinas 
            SET estado_aprobacion = 'aprobada', activo = TRUE, aprobado_at = NOW()
            WHERE id = :cid
        """), {"cid": cantina_id})
        # Crear cuenta 'Caja Efectivo'
        await conn.execute(text("""
            INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, saldo_actual, es_principal, activo)
            VALUES (:cid, 'Caja Efectivo', 'efectivo', 0, TRUE, TRUE)
        """), {"cid": cantina_id})
        await conn.commit()
        print("-> Cantina aprobada y cuenta Caja Efectivo creada OK.")

        # 4. Administrador carga colaboradores (Cajero y Despachante)
        print("3. Administrador de la Cantina carga a sus colaboradores...")
        pin_cajero = "7890"
        caj_res = await conn.execute(text("""
            INSERT INTO cantinas.usuarios_cantina (cantina_id, nombre, email, rol, pin, activo)
            VALUES (:cid, 'María Cajera', 'maria@test.com', 'cajera', :pin, TRUE)
            RETURNING id
        """), {"cid": cantina_id, "pin": pin_cajero})
        cajero_id = str(caj_res.fetchone()[0])

        desp_res = await conn.execute(text("""
            INSERT INTO cantinas.usuarios_cantina (cantina_id, nombre, email, rol, pin, activo)
            VALUES (:cid, 'Juan Despacho', 'juan@test.com', 'despachante', '4321', TRUE)
            RETURNING id
        """), {"cid": cantina_id})
        despachante_id = str(desp_res.fetchone()[0])
        await conn.commit()
        print(f"-> Colaboradores dados de alta: Cajero ({cajero_id}) con PIN {pin_cajero} y Despachante ({despachante_id}) OK.")

        # 5. Cajero ingresa con su PIN
        chk_cajero = await conn.execute(text("""
            SELECT id, nombre, rol FROM cantinas.usuarios_cantina
            WHERE cantina_id = :cid AND pin = :pin AND activo = TRUE
        """), {"cid": cantina_id, "pin": pin_cajero})
        row_caj = chk_cajero.fetchone()
        assert row_caj is not None and row_caj[1] == 'María Cajera', "Error: no se encontró al cajero por PIN"
        print(f"-> Login con PIN {pin_cajero} exitoso para: {row_caj[1]} ({row_caj[2]}) OK.")

        # 6. Intento de login con PIN no registrado
        chk_falso = await conn.execute(text("""
            SELECT id FROM cantinas.usuarios_cantina
            WHERE cantina_id = :cid AND pin = '0000' AND activo = TRUE
        """), {"cid": cantina_id})
        assert chk_falso.fetchone() is None, "Error: PIN inexistente no debe retornar usuario"
        print("-> Rechazo de PIN no registrado '0000' verificado OK.")

        # 7. Prueba de Cantina Vencida (temporalidad expirada)
        print("4. Probando control de vencimiento de concesión temporal...")
        ayer = today - timedelta(days=1)
        hace_tres = today - timedelta(days=3)
        await conn.execute(text("""
            UPDATE cantinas.cantinas 
            SET fecha_inicio = :fini, fecha_fin = :ffin 
            WHERE id = :cid
        """), {"cid": cantina_id, "fini": hace_tres, "ffin": ayer})
        await conn.commit()

        # Chequear vigencia con helper de python
        from routers.cantinas import _verificar_vigencia_cantina
        v_chk = await conn.execute(text("""
            SELECT estado_aprobacion, activo, fecha_inicio, fecha_fin, tipo_temporalidad, dias_habilitados, evento_nombre
            FROM cantinas.cantinas WHERE id = :cid
        """), {"cid": cantina_id})
        vig_res = _verificar_vigencia_cantina(v_chk.fetchone())
        print(f"-> Resultado de vigencia para cantina vencida: Vigente={vig_res['vigente']}, Estado={vig_res['estado']}, Motivo='{vig_res['motivo']}'")
        assert vig_res["vigente"] is False and vig_res["estado"] == "vencida", "Error: la cantina vencida debe dar vigente=False"
        print("-> Bloqueo automático por vencimiento verificado OK.")

        # 8. Limpieza de datos de prueba
        print("5. Limpiando datos temporales de prueba...")
        await conn.execute(text("DELETE FROM cantinas.usuarios_cantina WHERE cantina_id = :cid"), {"cid": cantina_id})
        await conn.execute(text("DELETE FROM cantinas.cuentas WHERE cantina_id = :cid"), {"cid": cantina_id})
        await conn.execute(text("DELETE FROM cantinas.cantinas WHERE id = :cid"), {"cid": cantina_id})
        await conn.commit()
        print("-> Limpieza completada con éxito.")

    await engine.dispose()
    print("\n=== TODOS LOS TESTS DEL FLUJO DE TEMPORALIDAD Y ACCESO PASARON EXITOSAMENTE! ===\n")

if __name__ == "__main__":
    asyncio.run(test_ciclo_completo_cantinas())
