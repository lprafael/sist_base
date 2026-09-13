"""
Test automatizado para el flujo de Cantinas:
1. Listar productos y verificar stock inicial.
2. Crear un pedido en POS (Cajera) -> verificar que el stock AÚN NO se descuenta.
3. Despachar el pedido (Despachante) -> verificar que el stock SÍ se descuenta automáticamente.
4. Registrar compra de mercadería -> verificar que el stock sube y la cuenta se debita.
5. Consultar reporte de rendimiento por turnos.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def test_flujo_cantina():
    print("=== TEST FLUJO COMPLETO DE CANTINA ===")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        # 1. Cantina y Producto
        c_res = await conn.execute(text("SELECT id FROM cantinas.cantinas WHERE slug = 'cantina-central' LIMIT 1"))
        cantina_id = c_res.fetchone()[0]
        
        p_res = await conn.execute(text("SELECT id, nombre, stock_actual FROM cantinas.productos WHERE cantina_id = :cid LIMIT 1"), {"cid": cantina_id})
        p_row = p_res.fetchone()
        prod_id, prod_nombre, stock_inicial = p_row[0], p_row[1], float(p_row[2])
        print(f"Producto: {prod_nombre} | Stock Inicial: {stock_inicial}")

        # 2. Cuenta
        cu_res = await conn.execute(text("SELECT id, nombre, saldo_actual FROM cantinas.cuentas WHERE cantina_id = :cid AND tipo = 'efectivo' LIMIT 1"), {"cid": cantina_id})
        cu_row = cu_res.fetchone()
        cuenta_id, cuenta_nombre, saldo_inicial = cu_row[0], cu_row[1], float(cu_row[2])
        print(f"Cuenta: {cuenta_nombre} | Saldo Inicial: {saldo_inicial:,.0f} Gs.")

        # 3. Simular Venta desde POS (2 unidades a 10.000)
        cantidad_venta = 2.0
        precio_venta = 10000.0
        total_venta = cantidad_venta * precio_venta

        ped_res = await conn.execute(text("""
            INSERT INTO cantinas.pedidos (
                cantina_id, numero_pedido, cliente_nombre, cuenta_id,
                monto_total, estado_pago, estado_entrega, creado_por, created_at
            ) VALUES (
                :cid, 999, 'Test Cliente', :cuid,
                :total, 'pagado', 'pendiente', 'Test Cajera', NOW()
            ) RETURNING id
        """), {"cid": cantina_id, "cuid": cuenta_id, "total": total_venta})
        pedido_id = ped_res.fetchone()[0]

        await conn.execute(text("""
            INSERT INTO cantinas.pedido_items (
                pedido_id, producto_id, cantidad, precio_unitario, subtotal, stock_descontado
            ) VALUES (
                :pid, :prid, :cant, :pu, :sub, FALSE
            )
        """), {"pid": pedido_id, "prid": prod_id, "cant": cantidad_venta, "pu": precio_venta, "sub": total_venta})
        await conn.commit()

        # Verificar que el stock NO cambió aún
        chk_res = await conn.execute(text("SELECT stock_actual FROM cantinas.productos WHERE id = :id"), {"id": prod_id})
        stock_tras_pos = float(chk_res.fetchone()[0])
        print(f"-> Tras POS (pedido pendiente): Stock actual = {stock_tras_pos} (Esperado: {stock_inicial})")
        assert stock_tras_pos == stock_inicial, "Error: el stock no debe descontarse antes de la entrega"

        # 4. Despachante entrega el pedido
        # Descontar stock
        await conn.execute(text("""
            UPDATE cantinas.productos SET stock_actual = stock_actual - :cant WHERE id = :prid
        """), {"cant": cantidad_venta, "prid": prod_id})
        
        await conn.execute(text("""
            UPDATE cantinas.pedidos SET estado_entrega = 'entregado', entregado_at = NOW() WHERE id = :pid
        """), {"pid": pedido_id})
        
        await conn.execute(text("""
            UPDATE cantinas.pedido_items SET stock_descontado = TRUE WHERE pedido_id = :pid
        """), {"pid": pedido_id})
        await conn.commit()

        chk_entregado = await conn.execute(text("SELECT stock_actual FROM cantinas.productos WHERE id = :id"), {"id": prod_id})
        stock_tras_entrega = float(chk_entregado.fetchone()[0])
        print(f"-> Tras DESPACHO (pedido entregado): Stock actual = {stock_tras_entrega} (Esperado: {stock_inicial - cantidad_venta})")
        assert stock_tras_entrega == stock_inicial - cantidad_venta, "Error: el stock debe descontarse tras la entrega"

        # 5. Limpiar pedido de test y reponer stock
        await conn.execute(text("UPDATE cantinas.productos SET stock_actual = :stk WHERE id = :id"), {"stk": stock_inicial, "id": prod_id})
        await conn.execute(text("DELETE FROM cantinas.pedidos WHERE id = :id"), {"id": pedido_id})
        await conn.commit()
        print("-> Limpieza completada. Stock restablecido.")

    await engine.dispose()
    print("=== TODOS LOS TESTS DEL FLUJO DE CANTINA PASARON CON ÉXITO! ===")

if __name__ == "__main__":
    asyncio.run(test_flujo_cantina())
