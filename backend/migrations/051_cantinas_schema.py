"""
Migration 051: Schema Cantinas y Mininegocios Deportivos
=========================================================
Crea el schema `cantinas` con todas las tablas necesarias para el
Módulo 4: Gestión de Cantinas (Buffet, Turnos, Stock, Comandas, Multi-cuentas).

Tablas:
  cantinas.cantinas            — Negocio / Buffet (Multi-tenant)
  cantinas.usuarios_cantina    — Personal de cantina (admin, cajera, despachante, encargado)
  cantinas.cuentas             — Multi-cuentas (Caja Efectivo, Banco 1, Banco 2, Billeteras)
  cantinas.productos           — Catálogo de productos, precios y stock
  cantinas.turnos              — Asignación de turnos, encargados, fecha y horario
  cantinas.chequeos_inventario — Arqueos de stock al iniciar y finalizar turno
  cantinas.pedidos             — Ventas/comandas con estado de pago y estado de entrega
  cantinas.pedido_items        — Detalle de productos vendidos y control de descuento de stock
  cantinas.compras_gastos      — Compras de mercadería (suma stock) y gastos operativos
  cantinas.movimientos_cuenta  — Libro mayor de movimientos por cuenta
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
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no definida en .env")
    sys.exit(1)

migration_sql = """
-- 1. Crear Schema
CREATE SCHEMA IF NOT EXISTS cantinas;

-- 2. Tabla de Cantinas (Tenant)
CREATE TABLE IF NOT EXISTS cantinas.cantinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    logo_url VARCHAR(500),
    moneda VARCHAR(10) DEFAULT 'GS',
    complejo_id INTEGER,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usuarios y Roles de Cantina
CREATE TABLE IF NOT EXISTS cantinas.usuarios_cantina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES sistema.usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    rol VARCHAR(50) NOT NULL DEFAULT 'cajera', -- 'admin', 'cajera', 'despachante', 'encargado'
    pin VARCHAR(10) DEFAULT '1234',            -- PIN rápido para operaciones en mostrador
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Multi-Cuentas (Caja, Banco 1, Banco 2, etc.)
CREATE TABLE IF NOT EXISTS cantinas.cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,              -- Ej: "Caja Efectivo", "Banco Itaú", "Banco Continental", "Zimple QR"
    tipo VARCHAR(50) NOT NULL DEFAULT 'efectivo', -- 'efectivo', 'banco', 'billetera', 'otro'
    numero_cuenta VARCHAR(100),
    saldo_actual NUMERIC(15, 2) DEFAULT 0,
    es_principal BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Catálogo de Productos e Inventario
CREATE TABLE IF NOT EXISTS cantinas.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    codigo_barra VARCHAR(100),
    nombre VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL DEFAULT 'Bebidas', -- 'Bebidas', 'Comidas', 'Snacks', 'Golosinas', 'Helados', 'Otros'
    descripcion TEXT,
    precio_costo NUMERIC(15, 2) DEFAULT 0,
    precio_venta NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(12, 2) NOT NULL DEFAULT 5,
    imagen_url VARCHAR(500),
    disponible_menu_qr BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Turnos de Cantina
CREATE TABLE IF NOT EXISTS cantinas.turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    encargado_id UUID REFERENCES cantinas.usuarios_cantina(id) ON DELETE SET NULL,
    encargado_nombre VARCHAR(150) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio_prog TIME,
    hora_fin_prog TIME,
    hora_inicio_real TIMESTAMP WITH TIME ZONE,
    hora_fin_real TIMESTAMP WITH TIME ZONE,
    estado VARCHAR(30) NOT NULL DEFAULT 'programado', -- 'programado', 'en_curso', 'finalizado', 'cancelado'
    fondo_inicial_caja NUMERIC(15, 2) DEFAULT 0,
    total_ventas NUMERIC(15, 2) DEFAULT 0,
    total_gastos NUMERIC(15, 2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Chequeos de Inventario (Arqueo al Iniciar / Finalizar Turno)
CREATE TABLE IF NOT EXISTS cantinas.chequeos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES cantinas.turnos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL, -- 'inicio' | 'fin'
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    realizado_por VARCHAR(150) NOT NULL,
    items_detalle JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{producto_id, nombre, stock_sistema, conteo_fisico, diferencia, observaciones}]
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Pedidos / Comandas (Ventas en tiempo real)
CREATE TABLE IF NOT EXISTS cantinas.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES cantinas.turnos(id) ON DELETE SET NULL,
    numero_pedido INTEGER NOT NULL,            -- Correlativo diario: #1, #2, #3...
    cliente_nombre VARCHAR(150),
    cuenta_id UUID REFERENCES cantinas.cuentas(id) ON DELETE SET NULL,
    monto_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado_pago VARCHAR(30) NOT NULL DEFAULT 'pagado',      -- 'pagado', 'pendiente'
    estado_entrega VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_preparacion', 'entregado', 'cancelado'
    creado_por VARCHAR(150),                  -- Cajera
    despachado_por VARCHAR(150),              -- Despachante
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    entregado_at TIMESTAMP WITH TIME ZONE
);

-- 9. Detalle de Items del Pedido
CREATE TABLE IF NOT EXISTS cantinas.pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES cantinas.pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES cantinas.productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stock_descontado BOOLEAN DEFAULT FALSE
);

-- 10. Compras de Insumos y Gastos Operativos (Mininegocio de padres)
CREATE TABLE IF NOT EXISTS cantinas.compras_gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cantina_id UUID NOT NULL REFERENCES cantinas.cantinas(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES cantinas.turnos(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'compra_mercaderia', -- 'compra_mercaderia', 'gasto_operativo'
    cuenta_id UUID REFERENCES cantinas.cuentas(id) ON DELETE SET NULL,
    monto_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    concepto_proveedor VARCHAR(250) NOT NULL,
    comprobante_nro VARCHAR(100),
    items_comprados JSONB DEFAULT '[]'::jsonb, -- [{producto_id, cantidad, costo_unitario}]
    registrado_por VARCHAR(150),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observaciones TEXT
);

-- 11. Movimientos de Cuentas (Libro Diario de Caja/Bancos)
CREATE TABLE IF NOT EXISTS cantinas.movimientos_cuenta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES cantinas.cuentas(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,                 -- 'ingreso', 'egreso', 'transferencia'
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0,
    saldo_posterior NUMERIC(15, 2) NOT NULL DEFAULT 0,
    concepto VARCHAR(250) NOT NULL,
    referencia_tipo VARCHAR(50),              -- 'pedido', 'compra_gasto', 'ajuste', 'transferencia'
    referencia_id UUID,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de búsqueda y rendimiento
CREATE INDEX IF NOT EXISTS idx_cantinas_slug ON cantinas.cantinas(slug);
CREATE INDEX IF NOT EXISTS idx_cantinas_productos_cantina ON cantinas.productos(cantina_id);
CREATE INDEX IF NOT EXISTS idx_cantinas_turnos_cantina_fecha ON cantinas.turnos(cantina_id, fecha);
CREATE INDEX IF NOT EXISTS idx_cantinas_pedidos_cantina_estado ON cantinas.pedidos(cantina_id, estado_entrega);
CREATE INDEX IF NOT EXISTS idx_cantinas_pedidos_fecha ON cantinas.pedidos(created_at);

-- ============================================================
-- SEED DATA DE DEMOSTRACIÓN
-- ============================================================
DO $$
DECLARE
    v_cantina_id UUID;
    v_cuenta_caja_id UUID;
    v_cuenta_banco1_id UUID;
    v_cuenta_banco2_id UUID;
    v_user_admin_id UUID;
    v_user_cajera_id UUID;
    v_user_despacho_id UUID;
    v_turno_id UUID;
    v_prod_empanada UUID;
    v_prod_coca UUID;
    v_prod_agua UUID;
    v_prod_lomito UUID;
    v_prod_papas UUID;
    v_prod_alfajor UUID;
    v_pedido1_id UUID;
    v_pedido2_id UUID;
BEGIN
    -- Crear o encontrar cantina demo
    IF NOT EXISTS (SELECT 1 FROM cantinas.cantinas WHERE slug = 'cantina-central') THEN
        INSERT INTO cantinas.cantinas (nombre, slug, descripcion, moneda, activo)
        VALUES ('Cantina Deportiva MiCancha', 'cantina-central', 'Cantina oficial de socios y comisiones de padres', 'GS', TRUE)
        RETURNING id INTO v_cantina_id;

        -- Cuentas Financieras
        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, saldo_actual, es_principal)
        VALUES (v_cantina_id, 'Caja Efectivo', 'efectivo', 450000, TRUE)
        RETURNING id INTO v_cuenta_caja_id;

        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, numero_cuenta, saldo_actual)
        VALUES (v_cantina_id, 'Banco Itaú (Transferencia)', 'banco', '01-445892-0', 1250000)
        RETURNING id INTO v_cuenta_banco1_id;

        INSERT INTO cantinas.cuentas (cantina_id, nombre, tipo, numero_cuenta, saldo_actual)
        VALUES (v_cantina_id, 'Banco Continental (QR)', 'banco', '02-887410-3', 820000)
        RETURNING id INTO v_cuenta_banco2_id;

        -- Usuarios de la cantina
        INSERT INTO cantinas.usuarios_cantina (cantina_id, nombre, email, rol, pin)
        VALUES (v_cantina_id, 'Coordinadora General (Mamá de Lucas)', 'admin@cantina.com', 'admin', '1111')
        RETURNING id INTO v_user_admin_id;

        INSERT INTO cantinas.usuarios_cantina (cantina_id, nombre, email, rol, pin)
        VALUES (v_cantina_id, 'Cajera 1 - Mañana (Mamá de Mateo)', 'cajera@cantina.com', 'cajera', '2222')
        RETURNING id INTO v_user_cajera_id;

        INSERT INTO cantinas.usuarios_cantina (cantina_id, nombre, email, rol, pin)
        VALUES (v_cantina_id, 'Despachante 1 - Parrilla y Buffet', 'despacho@cantina.com', 'despachante', '3333')
        RETURNING id INTO v_user_despacho_id;

        -- Productos y Stock
        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Empanada de Carne al Horno', 'Comidas', 'Receta casera jugosa', 4000, 7000, 45, 10, TRUE)
        RETURNING id INTO v_prod_empanada;

        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Sándwich de Lomito Completo', 'Comidas', 'Lomito vacuno, lechuga, tomate y huevo', 12000, 22000, 20, 5, TRUE)
        RETURNING id INTO v_prod_lomito;

        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Coca Cola 500ml', 'Bebidas', 'Bien fría', 4500, 8000, 60, 15, TRUE)
        RETURNING id INTO v_prod_coca;

        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Agua Mineral 500ml', 'Bebidas', 'Con o sin gas', 2500, 5000, 40, 10, TRUE)
        RETURNING id INTO v_prod_agua;

        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Papas Fritas Cono', 'Snacks', 'Porción individual recién frita', 5000, 10000, 30, 8, TRUE)
        RETURNING id INTO v_prod_papas;

        INSERT INTO cantinas.productos (cantina_id, nombre, categoria, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, disponible_menu_qr)
        VALUES (v_cantina_id, 'Alfajor Triple Tatakua', 'Golosinas', 'Dulce de leche bañado en chocolate', 4000, 8000, 35, 10, TRUE)
        RETURNING id INTO v_prod_alfajor;

        -- Turno en curso de ejemplo
        INSERT INTO cantinas.turnos (cantina_id, encargado_id, encargado_nombre, fecha, hora_inicio_prog, hora_fin_prog, hora_inicio_real, estado, fondo_inicial_caja, total_ventas, total_gastos, observaciones)
        VALUES (
            v_cantina_id,
            v_user_cajera_id,
            'Sra. Carmen López (Mamá de Mateo)',
            CURRENT_DATE,
            '08:00',
            '13:00',
            NOW() - INTERVAL '2 hours',
            'en_curso',
            200000,
            145000,
            30000,
            'Turno matutino de torneo de inferiores. Buen movimiento.'
        ) RETURNING id INTO v_turno_id;

        -- Chequeo inicial de turno
        INSERT INTO cantinas.chequeos_inventario (turno_id, tipo, realizado_por, items_detalle, observaciones)
        VALUES (
            v_turno_id,
            'inicio',
            'Carmen López',
            json_build_array(
                json_build_object('producto_id', v_prod_empanada, 'nombre', 'Empanada de Carne al Horno', 'stock_sistema', 45, 'conteo_fisico', 45, 'diferencia', 0),
                json_build_object('producto_id', v_prod_coca, 'nombre', 'Coca Cola 500ml', 'stock_sistema', 60, 'conteo_fisico', 60, 'diferencia', 0),
                json_build_object('producto_id', v_prod_lomito, 'nombre', 'Sándwich de Lomito Completo', 'stock_sistema', 20, 'conteo_fisico', 20, 'diferencia', 0)
            )::jsonb,
            'Apertura conforme. Fondo de caja verificado: 200.000 Gs.'
        );

        -- Pedido de ejemplo 1 (entregado)
        INSERT INTO cantinas.pedidos (cantina_id, turno_id, numero_pedido, cliente_nombre, cuenta_id, monto_total, estado_pago, estado_entrega, creado_por, despachado_por, created_at, entregado_at)
        VALUES (v_cantina_id, v_turno_id, 1, 'Prof. González', v_cuenta_caja_id, 22000, 'pagado', 'entregado', 'Carmen López', 'Carlos Despacho', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '50 minutes')
        RETURNING id INTO v_pedido1_id;

        INSERT INTO cantinas.pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal, stock_descontado)
        VALUES (v_pedido1_id, v_prod_lomito, 1, 22000, 22000, TRUE);

        -- Pedido de ejemplo 2 (pendiente en cocina para despachante)
        INSERT INTO cantinas.pedidos (cantina_id, turno_id, numero_pedido, cliente_nombre, cuenta_id, monto_total, estado_pago, estado_entrega, creado_por, created_at, observaciones)
        VALUES (v_cantina_id, v_turno_id, 2, 'Papá de Lucas (Sub 10)', v_cuenta_banco1_id, 35000, 'pagado', 'pendiente', 'Carmen López', NOW() - INTERVAL '5 minutes', 'Lomito sin cebolla, Coca bien fría')
        RETURNING id INTO v_pedido2_id;

        INSERT INTO cantinas.pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal, stock_descontado)
        VALUES 
        (v_pedido2_id, v_prod_lomito, 1, 22000, 22000, FALSE),
        (v_pedido2_id, v_prod_coca, 1, 8000, 8000, FALSE),
        (v_pedido2_id, v_prod_agua, 1, 5000, 5000, FALSE);

    END IF;
END $$;
"""

async def run_migration():
    print("Iniciando migración 051: Schema Cantinas...")
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        raw_conn = await conn.get_raw_connection()
        await raw_conn.driver_connection.execute(migration_sql)
    await engine.dispose()
    print("Migración 051 completada con éxito.")

if __name__ == "__main__":
    asyncio.run(run_migration())
