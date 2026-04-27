--
-- PostgreSQL database dump
--

\restrict 0FE3JCzk7DU2ouIXYdCabOJg0Gk3piuTLHO6UHZKFIcwfCMrmPkBd2JyiqGA9S1

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: playa; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA playa;


ALTER SCHEMA playa OWNER TO postgres;

--
-- Name: sistema; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sistema;


ALTER SCHEMA sistema OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: catalogo_marcas; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.catalogo_marcas (
    id_marca integer NOT NULL,
    nombre character varying(150) NOT NULL,
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.catalogo_marcas OWNER TO postgres;

--
-- Name: catalogo_marcas_id_marca_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.catalogo_marcas_id_marca_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.catalogo_marcas_id_marca_seq OWNER TO postgres;

--
-- Name: catalogo_marcas_id_marca_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.catalogo_marcas_id_marca_seq OWNED BY playa.catalogo_marcas.id_marca;


--
-- Name: catalogo_modelos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.catalogo_modelos (
    id_modelo integer NOT NULL,
    id_marca integer NOT NULL,
    nombre character varying(150) NOT NULL,
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.catalogo_modelos OWNER TO postgres;

--
-- Name: catalogo_modelos_id_modelo_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.catalogo_modelos_id_modelo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.catalogo_modelos_id_modelo_seq OWNER TO postgres;

--
-- Name: catalogo_modelos_id_modelo_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.catalogo_modelos_id_modelo_seq OWNED BY playa.catalogo_modelos.id_modelo;


--
-- Name: catalogo_tipos_vehiculo; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.catalogo_tipos_vehiculo (
    id_tipo integer NOT NULL,
    nombre character varying(150) NOT NULL,
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.catalogo_tipos_vehiculo OWNER TO postgres;

--
-- Name: catalogo_tipos_vehiculo_id_tipo_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.catalogo_tipos_vehiculo_id_tipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.catalogo_tipos_vehiculo_id_tipo_seq OWNER TO postgres;

--
-- Name: catalogo_tipos_vehiculo_id_tipo_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.catalogo_tipos_vehiculo_id_tipo_seq OWNED BY playa.catalogo_tipos_vehiculo.id_tipo;


--
-- Name: categorias_vehiculos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.categorias_vehiculos (
    id_categoria integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    descripcion text
);


ALTER TABLE playa.categorias_vehiculos OWNER TO postgres;

--
-- Name: categorias_vehiculos_id_categoria_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.categorias_vehiculos_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.categorias_vehiculos_id_categoria_seq OWNER TO postgres;

--
-- Name: categorias_vehiculos_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.categorias_vehiculos_id_categoria_seq OWNED BY playa.categorias_vehiculos.id_categoria;


--
-- Name: clientes; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.clientes (
    id_cliente integer NOT NULL,
    id_playa integer,
    tipo_documento character varying(20) NOT NULL,
    numero_documento character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    fecha_nacimiento date,
    telefono character varying(50),
    celular character varying(50),
    email character varying(100),
    direccion text,
    ciudad character varying(100),
    departamento character varying(100),
    codigo_postal character varying(20),
    estado_civil character varying(50),
    profesion character varying(100),
    lugar_trabajo character varying(200),
    telefono_trabajo character varying(50),
    antiguedad_laboral character varying(20),
    direccion_laboral text,
    ingreso_mensual numeric(15,2),
    calificacion_actual character varying(20),
    fecha_calificacion date,
    mora_acumulada numeric(15,2),
    observaciones text,
    fecha_registro timestamp without time zone,
    activo boolean
);


ALTER TABLE playa.clientes OWNER TO postgres;

--
-- Name: clientes_id_cliente_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.clientes_id_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.clientes_id_cliente_seq OWNER TO postgres;

--
-- Name: clientes_id_cliente_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.clientes_id_cliente_seq OWNED BY playa.clientes.id_cliente;


--
-- Name: config_calificaciones; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.config_calificaciones (
    id_config integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    dias_atraso_desde integer NOT NULL,
    dias_atraso_hasta integer,
    calificacion character varying(50) NOT NULL,
    descripcion text,
    activo boolean
);


ALTER TABLE playa.config_calificaciones OWNER TO postgres;

--
-- Name: config_calificaciones_id_config_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.config_calificaciones_id_config_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.config_calificaciones_id_config_seq OWNER TO postgres;

--
-- Name: config_calificaciones_id_config_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.config_calificaciones_id_config_seq OWNED BY playa.config_calificaciones.id_config;


--
-- Name: contratos_venta; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.contratos_venta (
    id_contrato integer NOT NULL,
    id_playa integer,
    id_venta integer,
    numero_contrato character varying(50) NOT NULL,
    fecha_contrato date NOT NULL,
    contenido_contrato text,
    ruta_archivo character varying(500),
    firmado boolean,
    fecha_firma date,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.contratos_venta OWNER TO postgres;

--
-- Name: contratos_venta_id_contrato_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.contratos_venta_id_contrato_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.contratos_venta_id_contrato_seq OWNER TO postgres;

--
-- Name: contratos_venta_id_contrato_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.contratos_venta_id_contrato_seq OWNED BY playa.contratos_venta.id_contrato;


--
-- Name: cuentas; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.cuentas (
    id_cuenta integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    tipo character varying(50),
    banco character varying(100),
    numero_cuenta character varying(100),
    saldo_actual numeric(15,2),
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.cuentas OWNER TO postgres;

--
-- Name: cuentas_id_cuenta_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.cuentas_id_cuenta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.cuentas_id_cuenta_seq OWNER TO postgres;

--
-- Name: cuentas_id_cuenta_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.cuentas_id_cuenta_seq OWNED BY playa.cuentas.id_cuenta;


--
-- Name: detalle_venta; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.detalle_venta (
    id_detalle_venta integer NOT NULL,
    id_playa integer,
    id_venta integer,
    concepto character varying(100) NOT NULL,
    monto_unitario numeric(15,2) NOT NULL,
    cantidad integer,
    subtotal numeric(15,2) NOT NULL,
    observaciones text
);


ALTER TABLE playa.detalle_venta OWNER TO postgres;

--
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.detalle_venta_id_detalle_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.detalle_venta_id_detalle_venta_seq OWNER TO postgres;

--
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.detalle_venta_id_detalle_venta_seq OWNED BY playa.detalle_venta.id_detalle_venta;


--
-- Name: documentos_importacion; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.documentos_importacion (
    nro_despacho character varying(100) NOT NULL,
    id_playa integer,
    fecha_despacho date,
    cantidad_vehiculos integer,
    monto_pagado numeric(15,2),
    pdf_despacho bytea,
    pdf_certificados bytea,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.documentos_importacion OWNER TO postgres;

--
-- Name: documentos_inforconf; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.documentos_inforconf (
    id_documento integer NOT NULL,
    id_playa integer,
    id_cliente integer,
    fecha_consulta date NOT NULL,
    calificacion character varying(50),
    score integer,
    archivo_pdf text,
    ruta_archivo character varying(500),
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.documentos_inforconf OWNER TO postgres;

--
-- Name: documentos_inforconf_id_documento_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.documentos_inforconf_id_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.documentos_inforconf_id_documento_seq OWNER TO postgres;

--
-- Name: documentos_inforconf_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.documentos_inforconf_id_documento_seq OWNED BY playa.documentos_inforconf.id_documento;


--
-- Name: escribanias; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.escribanias (
    id_escribania integer NOT NULL,
    id_playa integer,
    nombre character varying(200) NOT NULL,
    telefono character varying(50),
    email character varying(100),
    direccion text,
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.escribanias OWNER TO postgres;

--
-- Name: escribanias_id_escribania_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.escribanias_id_escribania_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.escribanias_id_escribania_seq OWNER TO postgres;

--
-- Name: escribanias_id_escribania_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.escribanias_id_escribania_seq OWNED BY playa.escribanias.id_escribania;


--
-- Name: estados; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.estados (
    id_estado integer NOT NULL,
    id_playa integer,
    nombre character varying(50) NOT NULL,
    descripcion text,
    color_hex character varying(7),
    activo boolean
);


ALTER TABLE playa.estados OWNER TO postgres;

--
-- Name: estados_id_estado_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.estados_id_estado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.estados_id_estado_seq OWNER TO postgres;

--
-- Name: estados_id_estado_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.estados_id_estado_seq OWNED BY playa.estados.id_estado;


--
-- Name: garantes; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.garantes (
    id_garante integer NOT NULL,
    id_playa integer,
    id_cliente integer,
    tipo_documento character varying(20) NOT NULL,
    numero_documento character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    fecha_nacimiento date,
    telefono character varying(50),
    celular character varying(50),
    email character varying(100),
    direccion text,
    ciudad character varying(100),
    estado_civil character varying(50),
    relacion_cliente character varying(100),
    lugar_trabajo character varying(200),
    telefono_trabajo character varying(50),
    antiguedad_laboral character varying(20),
    direccion_laboral text,
    ingreso_mensual numeric(15,2),
    observaciones text,
    fecha_registro timestamp without time zone,
    activo boolean
);


ALTER TABLE playa.garantes OWNER TO postgres;

--
-- Name: garantes_id_garante_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.garantes_id_garante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.garantes_id_garante_seq OWNER TO postgres;

--
-- Name: garantes_id_garante_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.garantes_id_garante_seq OWNED BY playa.garantes.id_garante;


--
-- Name: gastos_adicionales; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.gastos_adicionales (
    id_gasto_adicional integer NOT NULL,
    id_playa integer,
    tipo character varying(20) NOT NULL,
    monto numeric(15,2) NOT NULL,
    fecha date NOT NULL,
    concepto character varying(200) NOT NULL,
    id_cuenta integer NOT NULL,
    id_movimiento integer,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.gastos_adicionales OWNER TO postgres;

--
-- Name: gastos_adicionales_id_gasto_adicional_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.gastos_adicionales_id_gasto_adicional_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.gastos_adicionales_id_gasto_adicional_seq OWNER TO postgres;

--
-- Name: gastos_adicionales_id_gasto_adicional_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.gastos_adicionales_id_gasto_adicional_seq OWNED BY playa.gastos_adicionales.id_gasto_adicional;


--
-- Name: gastos_empresa; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.gastos_empresa (
    id_gasto_empresa integer NOT NULL,
    id_playa integer,
    id_tipo_gasto_empresa integer,
    descripcion text,
    monto numeric(15,2) NOT NULL,
    fecha_gasto date NOT NULL,
    periodo character varying(50),
    proveedor character varying(200),
    numero_factura character varying(100),
    id_cuenta integer,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.gastos_empresa OWNER TO postgres;

--
-- Name: gastos_empresa_id_gasto_empresa_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.gastos_empresa_id_gasto_empresa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.gastos_empresa_id_gasto_empresa_seq OWNER TO postgres;

--
-- Name: gastos_empresa_id_gasto_empresa_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.gastos_empresa_id_gasto_empresa_seq OWNED BY playa.gastos_empresa.id_gasto_empresa;


--
-- Name: gastos_productos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.gastos_productos (
    id_gasto_producto integer NOT NULL,
    id_playa integer,
    id_producto integer,
    id_tipo_gasto integer,
    descripcion text,
    monto numeric(15,2) NOT NULL,
    fecha_gasto date NOT NULL,
    proveedor character varying(200),
    numero_factura character varying(100),
    id_cuenta integer,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.gastos_productos OWNER TO postgres;

--
-- Name: gastos_productos_id_gasto_producto_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.gastos_productos_id_gasto_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.gastos_productos_id_gasto_producto_seq OWNER TO postgres;

--
-- Name: gastos_productos_id_gasto_producto_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.gastos_productos_id_gasto_producto_seq OWNED BY playa.gastos_productos.id_gasto_producto;


--
-- Name: historial_calificaciones; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.historial_calificaciones (
    id_historial integer NOT NULL,
    id_playa integer,
    id_cliente integer,
    id_venta integer,
    id_pago integer,
    calificacion_anterior character varying(50),
    calificacion_nueva character varying(50) NOT NULL,
    motivo text,
    fecha_calificacion timestamp without time zone
);


ALTER TABLE playa.historial_calificaciones OWNER TO postgres;

--
-- Name: historial_calificaciones_id_historial_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.historial_calificaciones_id_historial_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.historial_calificaciones_id_historial_seq OWNER TO postgres;

--
-- Name: historial_calificaciones_id_historial_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.historial_calificaciones_id_historial_seq OWNED BY playa.historial_calificaciones.id_historial;


--
-- Name: historial_propietarios; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.historial_propietarios (
    id_historial integer NOT NULL,
    id_producto integer,
    nombre_propietario character varying(200) NOT NULL,
    documento character varying(50),
    matricula character varying(20),
    tipo_documentacion character varying(100),
    documentacion_detalle text,
    observaciones text,
    fecha_adquisicion date,
    fecha_venta date,
    activo boolean,
    fecha_registro timestamp without time zone,
    id_playa integer
);


ALTER TABLE playa.historial_propietarios OWNER TO postgres;

--
-- Name: historial_propietarios_id_historial_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.historial_propietarios_id_historial_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.historial_propietarios_id_historial_seq OWNER TO postgres;

--
-- Name: historial_propietarios_id_historial_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.historial_propietarios_id_historial_seq OWNED BY playa.historial_propietarios.id_historial;


--
-- Name: imagenes_productos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.imagenes_productos (
    id_imagen integer NOT NULL,
    id_playa integer,
    id_producto integer,
    nombre_archivo character varying(200),
    ruta_archivo character varying(500),
    imagen bytea,
    imagen_con_marca character varying(500),
    es_principal boolean,
    orden integer,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.imagenes_productos OWNER TO postgres;

--
-- Name: imagenes_productos_id_imagen_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.imagenes_productos_id_imagen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.imagenes_productos_id_imagen_seq OWNER TO postgres;

--
-- Name: imagenes_productos_id_imagen_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.imagenes_productos_id_imagen_seq OWNED BY playa.imagenes_productos.id_imagen;


--
-- Name: movimientos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.movimientos (
    id_movimiento integer NOT NULL,
    id_playa integer,
    id_cuenta_origen integer,
    id_cuenta_destino integer,
    monto numeric(15,2) NOT NULL,
    fecha timestamp without time zone,
    concepto text,
    id_usuario integer,
    referencia character varying(100)
);


ALTER TABLE playa.movimientos OWNER TO postgres;

--
-- Name: movimientos_id_movimiento_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.movimientos_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.movimientos_id_movimiento_seq OWNER TO postgres;

--
-- Name: movimientos_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.movimientos_id_movimiento_seq OWNED BY playa.movimientos.id_movimiento;


--
-- Name: pagares; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.pagares (
    id_pagare integer NOT NULL,
    id_venta integer,
    numero_pagare character varying(50) NOT NULL,
    numero_cuota integer NOT NULL,
    monto_cuota numeric(15,2) NOT NULL,
    fecha_vencimiento date NOT NULL,
    tipo_pagare character varying(50),
    id_estado integer,
    cancelado boolean,
    saldo_pendiente numeric(15,2),
    observaciones text,
    fecha_registro timestamp without time zone,
    id_playa integer
);


ALTER TABLE playa.pagares OWNER TO postgres;

--
-- Name: pagares_id_pagare_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.pagares_id_pagare_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.pagares_id_pagare_seq OWNER TO postgres;

--
-- Name: pagares_id_pagare_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.pagares_id_pagare_seq OWNED BY playa.pagares.id_pagare;


--
-- Name: pagos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.pagos (
    id_pago integer NOT NULL,
    id_pagare integer,
    id_venta integer,
    id_cuenta integer,
    numero_recibo character varying(50) NOT NULL,
    fecha_pago date NOT NULL,
    monto_pagado numeric(15,2) NOT NULL,
    forma_pago character varying(50),
    numero_referencia character varying(100),
    dias_atraso integer,
    mora_aplicada numeric(15,2),
    descuento_aplicado numeric(15,2),
    observaciones text,
    fecha_registro timestamp without time zone,
    id_playa integer
);


ALTER TABLE playa.pagos OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.pagos_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.pagos_id_pago_seq OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.pagos_id_pago_seq OWNED BY playa.pagos.id_pago;


--
-- Name: productos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.productos (
    id_producto integer NOT NULL,
    id_playa integer,
    id_categoria integer,
    codigo_interno character varying(50),
    tipo_vehiculo character varying(50),
    marca character varying(100) NOT NULL,
    modelo character varying(100) NOT NULL,
    "año" integer,
    color character varying(50),
    chasis character varying(100),
    motor character varying(100),
    kilometraje integer,
    combustible character varying(50),
    transmision character varying(50),
    numero_puertas integer,
    capacidad_pasajeros integer,
    estado character varying(50),
    procedencia character varying(100),
    ubicacion_actual character varying(200),
    costo_base numeric(15,2) NOT NULL,
    precio_contado_sugerido numeric(15,2),
    precio_financiado_sugerido numeric(15,2),
    precio_venta_minimo numeric(15,2),
    entrega_inicial_sugerida numeric(15,2),
    estado_disponibilidad character varying(50),
    observaciones text,
    fecha_ingreso date,
    fecha_registro timestamp without time zone,
    activo boolean,
    nro_despacho character varying(100),
    nro_cert_nac character varying(100),
    id_tipo_vehiculo integer,
    id_marca integer,
    id_modelo integer,
    id_usuario integer
);


ALTER TABLE playa.productos OWNER TO postgres;

--
-- Name: productos_id_producto_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.productos_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.productos_id_producto_seq OWNER TO postgres;

--
-- Name: productos_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.productos_id_producto_seq OWNED BY playa.productos.id_producto;


--
-- Name: referencias; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.referencias (
    id_referencia integer NOT NULL,
    id_playa integer,
    id_cliente integer,
    tipo_entidad character varying(20) NOT NULL,
    tipo_referencia character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(100),
    parentesco_cargo character varying(150),
    observaciones text,
    fecha_registro timestamp without time zone,
    activo boolean
);


ALTER TABLE playa.referencias OWNER TO postgres;

--
-- Name: referencias_id_referencia_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.referencias_id_referencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.referencias_id_referencia_seq OWNER TO postgres;

--
-- Name: referencias_id_referencia_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.referencias_id_referencia_seq OWNED BY playa.referencias.id_referencia;


--
-- Name: refuerzos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.refuerzos (
    id_refuerzo integer NOT NULL,
    id_playa integer,
    id_venta integer,
    numero_refuerzo integer NOT NULL,
    monto_refuerzo numeric(15,2) NOT NULL,
    fecha_vencimiento date NOT NULL,
    estado character varying(50),
    id_pagare integer,
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.refuerzos OWNER TO postgres;

--
-- Name: refuerzos_id_refuerzo_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.refuerzos_id_refuerzo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.refuerzos_id_refuerzo_seq OWNER TO postgres;

--
-- Name: refuerzos_id_refuerzo_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.refuerzos_id_refuerzo_seq OWNED BY playa.refuerzos.id_refuerzo;


--
-- Name: tipos_gastos_empresa; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.tipos_gastos_empresa (
    id_tipo_gasto_empresa integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    descripcion text,
    es_fijo boolean,
    activo boolean
);


ALTER TABLE playa.tipos_gastos_empresa OWNER TO postgres;

--
-- Name: tipos_gastos_empresa_id_tipo_gasto_empresa_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.tipos_gastos_empresa_id_tipo_gasto_empresa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.tipos_gastos_empresa_id_tipo_gasto_empresa_seq OWNER TO postgres;

--
-- Name: tipos_gastos_empresa_id_tipo_gasto_empresa_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.tipos_gastos_empresa_id_tipo_gasto_empresa_seq OWNED BY playa.tipos_gastos_empresa.id_tipo_gasto_empresa;


--
-- Name: tipos_gastos_productos; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.tipos_gastos_productos (
    id_tipo_gasto integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean
);


ALTER TABLE playa.tipos_gastos_productos OWNER TO postgres;

--
-- Name: tipos_gastos_productos_id_tipo_gasto_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.tipos_gastos_productos_id_tipo_gasto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.tipos_gastos_productos_id_tipo_gasto_seq OWNER TO postgres;

--
-- Name: tipos_gastos_productos_id_tipo_gasto_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.tipos_gastos_productos_id_tipo_gasto_seq OWNED BY playa.tipos_gastos_productos.id_tipo_gasto;


--
-- Name: ubicaciones_cliente; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.ubicaciones_cliente (
    id_ubicacion integer NOT NULL,
    id_playa integer,
    id_cliente integer,
    nombre_lugar character varying(100) NOT NULL,
    tipo_ubicacion character varying(20),
    latitud numeric(10,8),
    longitud numeric(11,8),
    direccion_texto text,
    referencia text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.ubicaciones_cliente OWNER TO postgres;

--
-- Name: ubicaciones_cliente_id_ubicacion_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.ubicaciones_cliente_id_ubicacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.ubicaciones_cliente_id_ubicacion_seq OWNER TO postgres;

--
-- Name: ubicaciones_cliente_id_ubicacion_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.ubicaciones_cliente_id_ubicacion_seq OWNED BY playa.ubicaciones_cliente.id_ubicacion;


--
-- Name: vendedores; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.vendedores (
    id_vendedor integer NOT NULL,
    id_playa integer,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    telefono character varying(50),
    email character varying(100),
    activo boolean,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.vendedores OWNER TO postgres;

--
-- Name: vendedores_id_vendedor_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.vendedores_id_vendedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.vendedores_id_vendedor_seq OWNER TO postgres;

--
-- Name: vendedores_id_vendedor_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.vendedores_id_vendedor_seq OWNED BY playa.vendedores.id_vendedor;


--
-- Name: ventas; Type: TABLE; Schema: playa; Owner: postgres
--

CREATE TABLE playa.ventas (
    id_venta integer NOT NULL,
    id_playa integer,
    numero_venta character varying(50) NOT NULL,
    id_cliente integer,
    id_producto integer,
    fecha_venta date NOT NULL,
    tipo_venta character varying(50) NOT NULL,
    precio_venta numeric(15,2) NOT NULL,
    descuento numeric(15,2),
    precio_final numeric(15,2) NOT NULL,
    entrega_inicial numeric(15,2),
    saldo_financiar numeric(15,2),
    cantidad_cuotas integer,
    monto_cuota numeric(15,2),
    tasa_interes numeric(5,2),
    tiene_refuerzos boolean,
    periodicidad_refuerzos character varying(50),
    monto_refuerzo numeric(15,2),
    cantidad_refuerzos integer,
    periodo_int_mora character varying(1),
    monto_int_mora numeric(15,2),
    dias_gracia integer,
    estado_venta character varying(50),
    vendedor character varying(200),
    id_vendedor integer,
    id_escribania integer,
    tipo_documento_propiedad character varying(100),
    observaciones text,
    fecha_registro timestamp without time zone
);


ALTER TABLE playa.ventas OWNER TO postgres;

--
-- Name: ventas_id_venta_seq; Type: SEQUENCE; Schema: playa; Owner: postgres
--

CREATE SEQUENCE playa.ventas_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE playa.ventas_id_venta_seq OWNER TO postgres;

--
-- Name: ventas_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: playa; Owner: postgres
--

ALTER SEQUENCE playa.ventas_id_venta_seq OWNED BY playa.ventas.id_venta;


--
-- Name: backups_sistema; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.backups_sistema (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    ruta_archivo character varying(500) NOT NULL,
    tamano_bytes integer,
    tipo character varying(20),
    estado character varying(20),
    fecha_inicio timestamp without time zone,
    fecha_fin timestamp without time zone,
    creado_por integer,
    detalles json
);


ALTER TABLE sistema.backups_sistema OWNER TO postgres;

--
-- Name: backups_sistema_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.backups_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.backups_sistema_id_seq OWNER TO postgres;

--
-- Name: backups_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.backups_sistema_id_seq OWNED BY sistema.backups_sistema.id;


--
-- Name: configuracion_email; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.configuracion_email (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    host character varying(100) NOT NULL,
    puerto integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    from_email character varying(100) NOT NULL,
    use_tls boolean,
    use_ssl boolean,
    activo boolean,
    fecha_creacion timestamp without time zone,
    creado_por integer
);


ALTER TABLE sistema.configuracion_email OWNER TO postgres;

--
-- Name: configuracion_email_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.configuracion_email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.configuracion_email_id_seq OWNER TO postgres;

--
-- Name: configuracion_email_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.configuracion_email_id_seq OWNED BY sistema.configuracion_email.id;


--
-- Name: logs_acceso; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.logs_acceso (
    id integer NOT NULL,
    usuario_id integer,
    username character varying(50) NOT NULL,
    accion character varying(50) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    fecha timestamp without time zone,
    detalles json,
    exitoso boolean
);


ALTER TABLE sistema.logs_acceso OWNER TO postgres;

--
-- Name: logs_acceso_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.logs_acceso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.logs_acceso_id_seq OWNER TO postgres;

--
-- Name: logs_acceso_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.logs_acceso_id_seq OWNED BY sistema.logs_acceso.id;


--
-- Name: logs_auditoria; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.logs_auditoria (
    id integer NOT NULL,
    usuario_id integer,
    username character varying(50) NOT NULL,
    accion character varying(50) NOT NULL,
    tabla character varying(50) NOT NULL,
    registro_id integer,
    datos_anteriores json,
    datos_nuevos json,
    ip_address character varying(45),
    user_agent text,
    fecha timestamp without time zone,
    detalles text
);


ALTER TABLE sistema.logs_auditoria OWNER TO postgres;

--
-- Name: logs_auditoria_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.logs_auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.logs_auditoria_id_seq OWNER TO postgres;

--
-- Name: logs_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.logs_auditoria_id_seq OWNED BY sistema.logs_auditoria.id;


--
-- Name: notificaciones; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.notificaciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    titulo character varying(100) NOT NULL,
    mensaje text NOT NULL,
    tipo character varying(20),
    leida boolean,
    fecha_creacion timestamp without time zone,
    fecha_lectura timestamp without time zone,
    datos_adicionales json
);


ALTER TABLE sistema.notificaciones OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.notificaciones_id_seq OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.notificaciones_id_seq OWNED BY sistema.notificaciones.id;


--
-- Name: parametros_sistema; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.parametros_sistema (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    valor text,
    tipo character varying(20),
    descripcion character varying(200),
    categoria character varying(50),
    editable boolean,
    activo boolean,
    fecha_creacion timestamp without time zone,
    fecha_modificacion timestamp without time zone,
    modificado_por integer
);


ALTER TABLE sistema.parametros_sistema OWNER TO postgres;

--
-- Name: parametros_sistema_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.parametros_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.parametros_sistema_id_seq OWNER TO postgres;

--
-- Name: parametros_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.parametros_sistema_id_seq OWNED BY sistema.parametros_sistema.id;


--
-- Name: password_resets; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.password_resets (
    id integer NOT NULL,
    email character varying(100) NOT NULL,
    token character varying(255) NOT NULL,
    expira_en timestamp without time zone NOT NULL,
    usado boolean,
    fecha_creacion timestamp without time zone
);


ALTER TABLE sistema.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.password_resets_id_seq OWNED BY sistema.password_resets.id;


--
-- Name: permisos; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.permisos (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(200),
    modulo character varying(50),
    accion character varying(50),
    activo boolean,
    fecha_creacion timestamp without time zone
);


ALTER TABLE sistema.permisos OWNER TO postgres;

--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.permisos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.permisos_id_seq OWNER TO postgres;

--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.permisos_id_seq OWNED BY sistema.permisos.id;


--
-- Name: playas; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.playas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    razon_social character varying(200),
    ruc character varying(20),
    direccion text,
    telefono character varying(50),
    email character varying(100),
    activo boolean,
    fecha_creacion timestamp without time zone
);


ALTER TABLE sistema.playas OWNER TO postgres;

--
-- Name: playas_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.playas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.playas_id_seq OWNER TO postgres;

--
-- Name: playas_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.playas_id_seq OWNED BY sistema.playas.id;


--
-- Name: reportes; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.reportes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo character varying(20) NOT NULL,
    parametros json,
    fecha_creacion timestamp without time zone,
    fecha_ejecucion timestamp without time zone,
    estado character varying(20),
    ruta_archivo character varying(500),
    creado_por integer NOT NULL,
    detalles json
);


ALTER TABLE sistema.reportes OWNER TO postgres;

--
-- Name: reportes_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.reportes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.reportes_id_seq OWNER TO postgres;

--
-- Name: reportes_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.reportes_id_seq OWNED BY sistema.reportes.id;


--
-- Name: rol_permiso; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.rol_permiso (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


ALTER TABLE sistema.rol_permiso OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(200),
    activo boolean,
    fecha_creacion timestamp without time zone,
    creado_por integer
);


ALTER TABLE sistema.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.roles_id_seq OWNED BY sistema.roles.id;


--
-- Name: sesiones_usuarios; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.sesiones_usuarios (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    token character varying(500) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    fecha_inicio timestamp without time zone,
    fecha_expiracion timestamp without time zone NOT NULL,
    activa boolean,
    fecha_cierre timestamp without time zone
);


ALTER TABLE sistema.sesiones_usuarios OWNER TO postgres;

--
-- Name: sesiones_usuarios_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.sesiones_usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.sesiones_usuarios_id_seq OWNER TO postgres;

--
-- Name: sesiones_usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.sesiones_usuarios_id_seq OWNED BY sistema.sesiones_usuarios.id;


--
-- Name: usuario_rol; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.usuario_rol (
    usuario_id integer NOT NULL,
    rol_id integer NOT NULL
);


ALTER TABLE sistema.usuario_rol OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: sistema; Owner: postgres
--

CREATE TABLE sistema.usuarios (
    id integer NOT NULL,
    id_playa integer,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    nombre_completo character varying(100) NOT NULL,
    rol character varying(20),
    activo boolean,
    fecha_creacion timestamp without time zone,
    ultimo_acceso timestamp without time zone,
    creado_por integer
);


ALTER TABLE sistema.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: sistema; Owner: postgres
--

CREATE SEQUENCE sistema.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sistema.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: sistema; Owner: postgres
--

ALTER SEQUENCE sistema.usuarios_id_seq OWNED BY sistema.usuarios.id;


--
-- Name: catalogo_marcas id_marca; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_marcas ALTER COLUMN id_marca SET DEFAULT nextval('playa.catalogo_marcas_id_marca_seq'::regclass);


--
-- Name: catalogo_modelos id_modelo; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_modelos ALTER COLUMN id_modelo SET DEFAULT nextval('playa.catalogo_modelos_id_modelo_seq'::regclass);


--
-- Name: catalogo_tipos_vehiculo id_tipo; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_tipos_vehiculo ALTER COLUMN id_tipo SET DEFAULT nextval('playa.catalogo_tipos_vehiculo_id_tipo_seq'::regclass);


--
-- Name: categorias_vehiculos id_categoria; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.categorias_vehiculos ALTER COLUMN id_categoria SET DEFAULT nextval('playa.categorias_vehiculos_id_categoria_seq'::regclass);


--
-- Name: clientes id_cliente; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.clientes ALTER COLUMN id_cliente SET DEFAULT nextval('playa.clientes_id_cliente_seq'::regclass);


--
-- Name: config_calificaciones id_config; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.config_calificaciones ALTER COLUMN id_config SET DEFAULT nextval('playa.config_calificaciones_id_config_seq'::regclass);


--
-- Name: contratos_venta id_contrato; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.contratos_venta ALTER COLUMN id_contrato SET DEFAULT nextval('playa.contratos_venta_id_contrato_seq'::regclass);


--
-- Name: cuentas id_cuenta; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.cuentas ALTER COLUMN id_cuenta SET DEFAULT nextval('playa.cuentas_id_cuenta_seq'::regclass);


--
-- Name: detalle_venta id_detalle_venta; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.detalle_venta ALTER COLUMN id_detalle_venta SET DEFAULT nextval('playa.detalle_venta_id_detalle_venta_seq'::regclass);


--
-- Name: documentos_inforconf id_documento; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.documentos_inforconf ALTER COLUMN id_documento SET DEFAULT nextval('playa.documentos_inforconf_id_documento_seq'::regclass);


--
-- Name: escribanias id_escribania; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.escribanias ALTER COLUMN id_escribania SET DEFAULT nextval('playa.escribanias_id_escribania_seq'::regclass);


--
-- Name: estados id_estado; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.estados ALTER COLUMN id_estado SET DEFAULT nextval('playa.estados_id_estado_seq'::regclass);


--
-- Name: garantes id_garante; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.garantes ALTER COLUMN id_garante SET DEFAULT nextval('playa.garantes_id_garante_seq'::regclass);


--
-- Name: gastos_adicionales id_gasto_adicional; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_adicionales ALTER COLUMN id_gasto_adicional SET DEFAULT nextval('playa.gastos_adicionales_id_gasto_adicional_seq'::regclass);


--
-- Name: gastos_empresa id_gasto_empresa; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_empresa ALTER COLUMN id_gasto_empresa SET DEFAULT nextval('playa.gastos_empresa_id_gasto_empresa_seq'::regclass);


--
-- Name: gastos_productos id_gasto_producto; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_productos ALTER COLUMN id_gasto_producto SET DEFAULT nextval('playa.gastos_productos_id_gasto_producto_seq'::regclass);


--
-- Name: historial_calificaciones id_historial; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_calificaciones ALTER COLUMN id_historial SET DEFAULT nextval('playa.historial_calificaciones_id_historial_seq'::regclass);


--
-- Name: historial_propietarios id_historial; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_propietarios ALTER COLUMN id_historial SET DEFAULT nextval('playa.historial_propietarios_id_historial_seq'::regclass);


--
-- Name: imagenes_productos id_imagen; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.imagenes_productos ALTER COLUMN id_imagen SET DEFAULT nextval('playa.imagenes_productos_id_imagen_seq'::regclass);


--
-- Name: movimientos id_movimiento; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.movimientos ALTER COLUMN id_movimiento SET DEFAULT nextval('playa.movimientos_id_movimiento_seq'::regclass);


--
-- Name: pagares id_pagare; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagares ALTER COLUMN id_pagare SET DEFAULT nextval('playa.pagares_id_pagare_seq'::regclass);


--
-- Name: pagos id_pago; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos ALTER COLUMN id_pago SET DEFAULT nextval('playa.pagos_id_pago_seq'::regclass);


--
-- Name: productos id_producto; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.productos ALTER COLUMN id_producto SET DEFAULT nextval('playa.productos_id_producto_seq'::regclass);


--
-- Name: referencias id_referencia; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.referencias ALTER COLUMN id_referencia SET DEFAULT nextval('playa.referencias_id_referencia_seq'::regclass);


--
-- Name: refuerzos id_refuerzo; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.refuerzos ALTER COLUMN id_refuerzo SET DEFAULT nextval('playa.refuerzos_id_refuerzo_seq'::regclass);


--
-- Name: tipos_gastos_empresa id_tipo_gasto_empresa; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_empresa ALTER COLUMN id_tipo_gasto_empresa SET DEFAULT nextval('playa.tipos_gastos_empresa_id_tipo_gasto_empresa_seq'::regclass);


--
-- Name: tipos_gastos_productos id_tipo_gasto; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_productos ALTER COLUMN id_tipo_gasto SET DEFAULT nextval('playa.tipos_gastos_productos_id_tipo_gasto_seq'::regclass);


--
-- Name: ubicaciones_cliente id_ubicacion; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ubicaciones_cliente ALTER COLUMN id_ubicacion SET DEFAULT nextval('playa.ubicaciones_cliente_id_ubicacion_seq'::regclass);


--
-- Name: vendedores id_vendedor; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.vendedores ALTER COLUMN id_vendedor SET DEFAULT nextval('playa.vendedores_id_vendedor_seq'::regclass);


--
-- Name: ventas id_venta; Type: DEFAULT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas ALTER COLUMN id_venta SET DEFAULT nextval('playa.ventas_id_venta_seq'::regclass);


--
-- Name: backups_sistema id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.backups_sistema ALTER COLUMN id SET DEFAULT nextval('sistema.backups_sistema_id_seq'::regclass);


--
-- Name: configuracion_email id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.configuracion_email ALTER COLUMN id SET DEFAULT nextval('sistema.configuracion_email_id_seq'::regclass);


--
-- Name: logs_acceso id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_acceso ALTER COLUMN id SET DEFAULT nextval('sistema.logs_acceso_id_seq'::regclass);


--
-- Name: logs_auditoria id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_auditoria ALTER COLUMN id SET DEFAULT nextval('sistema.logs_auditoria_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.notificaciones ALTER COLUMN id SET DEFAULT nextval('sistema.notificaciones_id_seq'::regclass);


--
-- Name: parametros_sistema id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.parametros_sistema ALTER COLUMN id SET DEFAULT nextval('sistema.parametros_sistema_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.password_resets ALTER COLUMN id SET DEFAULT nextval('sistema.password_resets_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.permisos ALTER COLUMN id SET DEFAULT nextval('sistema.permisos_id_seq'::regclass);


--
-- Name: playas id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.playas ALTER COLUMN id SET DEFAULT nextval('sistema.playas_id_seq'::regclass);


--
-- Name: reportes id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.reportes ALTER COLUMN id SET DEFAULT nextval('sistema.reportes_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.roles ALTER COLUMN id SET DEFAULT nextval('sistema.roles_id_seq'::regclass);


--
-- Name: sesiones_usuarios id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.sesiones_usuarios ALTER COLUMN id SET DEFAULT nextval('sistema.sesiones_usuarios_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuarios ALTER COLUMN id SET DEFAULT nextval('sistema.usuarios_id_seq'::regclass);


--
-- Data for Name: catalogo_marcas; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.catalogo_marcas (id_marca, nombre, activo, fecha_registro) FROM stdin;
1	JEEP	t	2026-03-28 13:21:06.219543
2	OTRO	t	2026-03-28 13:21:06.219543
3	SEAT	t	\N
4	RENAULT	t	\N
5	PEUGEOT	t	\N
6	DACIA	t	\N
7	CITROËN	t	\N
8	OPEL	t	\N
9	ALFA ROMEO	t	\N
10	ŠKODA	t	\N
11	CHEVROLET	t	\N
12	PORSCHE	t	\N
13	HONDA	t	\N
14	SUBARU	t	\N
15	MAZDA	t	\N
16	MITSUBISHI	t	\N
17	LEXUS	t	\N
18	TOYOTA	t	\N
19	BMW	t	\N
20	VOLKSWAGEN	t	\N
21	SUZUKI	t	\N
22	MERCEDES-BENZ	t	\N
23	SAAB	t	\N
24	AUDI	t	\N
25	KIA	t	\N
26	LAND ROVER	t	\N
27	DODGE	t	\N
28	CHRYSLER	t	\N
29	FORD	t	\N
30	HUMMER	t	\N
31	HYUNDAI	t	\N
32	INFINITI	t	\N
33	JAGUAR	t	\N
34	NISSAN	t	\N
35	VOLVO	t	\N
36	DAEWOO	t	\N
37	FIAT	t	\N
38	MINI	t	\N
39	ROVER	t	\N
40	SMART	t	\N
41	212	t	\N
42	ABARTH	t	\N
43	AC	t	\N
44	ACURA	t	\N
45	ADAM	t	\N
46	ADLER	t	\N
47	GAC AION	t	\N
48	AITO	t	\N
49	AIWAYS	t	\N
50	AIXAM	t	\N
51	ALPINA	t	\N
52	ALPINE	t	\N
53	АМБЕРАВТО	t	\N
54	AMBERTRUCK	t	\N
55	AMC	t	\N
56	AM GENERAL	t	\N
57	APAL	t	\N
58	ARCFOX	t	\N
59	ARIEL	t	\N
60	ARO	t	\N
61	ASIA	t	\N
62	ASTON MARTIN	t	\N
63	АТОМ	t	\N
64	AUBURN	t	\N
65	AURUS	t	\N
66	AUSTIN	t	\N
67	AUSTIN HEALEY	t	\N
68	AUTOBIANCHI	t	\N
69	AUTO UNION	t	\N
70	AVATR	t	\N
71	АВТОКАМ	t	\N
72	BAIC	t	\N
73	BAJAJ	t	\N
74	BALTIJAS DZIPS	t	\N
75	BAOJUN	t	\N
76	BATMOBILE	t	\N
77	BAW	t	\N
78	BELGEE	t	\N
79	BENTLEY	t	\N
80	BERTONE	t	\N
81	BESTUNE	t	\N
82	BILENKIN	t	\N
83	BIO AUTO	t	\N
84	BITTER	t	\N
85	BLAVAL	t	\N
86	BORGWARD	t	\N
87	BRABUS	t	\N
88	BRILLIANCE	t	\N
89	BRISTOL	t	\N
90	BUFORI	t	\N
91	BUGATTI	t	\N
92	BUICK	t	\N
93	BYD	t	\N
94	BYVIN	t	\N
95	CADILLAC	t	\N
96	CALLAWAY	t	\N
97	CARBODIES	t	\N
98	CATERHAM	t	\N
99	CHANA	t	\N
100	CHANGAN	t	\N
101	CHANGFENG	t	\N
102	CHANGHE	t	\N
103	CHERY	t	\N
104	EXEED	t	\N
105	CIIMO (DONGFENG-HONDA)	t	\N
106	CITROEN	t	\N
107	CIZETA	t	\N
108	CODA	t	\N
109	COGGIOLA	t	\N
110	CORD	t	\N
111	COWIN	t	\N
112	CUPRA	t	\N
113	DADI	t	\N
114	DAIHATSU	t	\N
115	DAIMLER	t	\N
116	DALLARA	t	\N
117	DATSUN	t	\N
118	DAYUN	t	\N
119	DECO RIDES	t	\N
120	DEEPAL	t	\N
121	DELAGE	t	\N
122	DELOREAN	t	\N
123	DENZA	t	\N
124	DERWAYS	t	\N
125	DESOTO	t	\N
126	DE TOMASO	t	\N
127	DKW	t	\N
128	DONGFENG	t	\N
129	DONINVEST	t	\N
130	DONKERVOORT	t	\N
131	DR	t	\N
132	DS	t	\N
133	DW HOWER	t	\N
134	EAGLE	t	\N
135	EAGLE CARS	t	\N
136	ENOVATE (ENOREVE)	t	\N
137	EONYX	t	\N
138	EVERUS	t	\N
139	EVOLUTE	t	\N
140	EXCALIBUR	t	\N
141	E-CAR	t	\N
142	Ё-МОБИЛЬ	t	\N
143	FACEL VEGA	t	\N
144	FAW	t	\N
145	FERRARI	t	\N
146	FISKER	t	\N
147	FLANKER	t	\N
148	FORTHING	t	\N
149	FOTON	t	\N
150	FRANKLIN	t	\N
151	FSO	t	\N
152	FSR	t	\N
153	FUQI	t	\N
154	GAC	t	\N
155	ГАЗ	t	\N
156	GEELY	t	\N
157	GENESIS	t	\N
158	GEO	t	\N
159	GMA	t	\N
160	GMC	t	\N
161	GOGGOMOBIL	t	\N
162	GONOW	t	\N
163	GORDON	t	\N
164	GP	t	\N
165	GREAT WALL	t	\N
166	HAFEI	t	\N
167	HAIMA	t	\N
168	HANOMAG	t	\N
169	HANTENG	t	\N
170	HAVAL	t	\N
171	HAWTAI	t	\N
172	HEDMOS	t	\N
173	HEINKEL	t	\N
174	HENNESSEY	t	\N
175	HINDUSTAN	t	\N
176	HIPHI	t	\N
177	HISPANO-SUIZA	t	\N
178	HOLDEN	t	\N
179	HONGQI	t	\N
180	HORCH	t	\N
181	HOZON	t	\N
182	HSV	t	\N
183	HUAIHAI (HOANN)	t	\N
184	HUANGHAI	t	\N
185	HUAZI	t	\N
186	HUDSON	t	\N
187	HUMBER	t	\N
188	HYCAN	t	\N
189	HYPERION	t	\N
190	ICAR	t	\N
191	ICAUR	t	\N
192	ИЖ	t	\N
193	IM MOTORS (ZHIJI)	t	\N
194	INEOS	t	\N
195	INNOCENTI	t	\N
196	INTERNATIONAL HARVESTER	t	\N
197	INVICTA	t	\N
198	IRAN KHODRO	t	\N
199	ISDERA	t	\N
200	ISUZU	t	\N
201	IVECO	t	\N
202	JAC	t	\N
203	JAECOO	t	\N
204	JELAND	t	\N
205	JENSEN	t	\N
206	JETOUR	t	\N
207	JETTA	t	\N
208	JIANGNAN	t	\N
209	JIDU	t	\N
210	JINBEI	t	\N
211	JMC	t	\N
212	JMEV	t	\N
213	JONWAY	t	\N
214	KAIYI	t	\N
215	КАНОНИР	t	\N
216	KARMA	t	\N
217	KAWEI	t	\N
218	KGM	t	\N
219	KNEWSTAR	t	\N
220	KOENIGSEGG	t	\N
221	КОМБАТ	t	\N
222	KTM AG	t	\N
223	KYC	t	\N
224	LAMBORGHINI	t	\N
225	LANCIA	t	\N
226	LANDWIND	t	\N
227	LEAPMOTOR	t	\N
228	LETIN	t	\N
229	LEVC	t	\N
230	LIEBAO MOTOR	t	\N
231	LIFAN	t	\N
232	LIGIER	t	\N
233	LINCOLN	t	\N
234	LINGXI	t	\N
235	LIVAN	t	\N
236	LI AUTO (LIXIANG)	t	\N
237	LOGEM	t	\N
238	LOTUS	t	\N
239	LTI	t	\N
240	ЛУАЗ	t	\N
241	LUCID	t	\N
242	LUXEED	t	\N
243	LUXGEN	t	\N
244	LYNK & CO	t	\N
245	MAEXTRO	t	\N
246	MAHINDRA	t	\N
247	MAPLE	t	\N
248	MARCOS	t	\N
249	MARLIN	t	\N
250	MARUSSIA	t	\N
251	MARUTI	t	\N
252	MASERATI	t	\N
253	MATRA	t	\N
254	MAXUS	t	\N
255	MAYBACH	t	\N
256	MCLAREN	t	\N
257	MEGA	t	\N
258	MERCURY	t	\N
259	MERKUR	t	\N
260	MESSERSCHMITT	t	\N
261	METROCAB	t	\N
262	MG	t	\N
263	MICRO	t	\N
264	MICROCAR	t	\N
265	MINELLI	t	\N
266	MITSUOKA	t	\N
267	MOBILIZE	t	\N
268	MORGAN	t	\N
269	MORRIS	t	\N
270	МОСКВИЧ	t	\N
271	M-HERO	t	\N
272	NASH	t	\N
273	NIO	t	\N
274	NOBLE	t	\N
275	NORDCROSS	t	\N
276	OLDSMOBILE	t	\N
277	OLTCIT	t	\N
278	OMODA	t	\N
279	ORA	t	\N
280	ORANGE	t	\N
281	OSCA	t	\N
282	OSHAN	t	\N
283	OTING	t	\N
284	OVERLAND	t	\N
285	PACKARD	t	\N
286	PAGANI	t	\N
287	PANOZ	t	\N
288	PERODUA	t	\N
289	PGO	t	\N
290	PIAGGIO	t	\N
291	PIERCE-ARROW	t	\N
292	PLYMOUTH	t	\N
293	POLAR STONE (JISHI)	t	\N
294	POLESTAR	t	\N
295	PONTIAC	t	\N
296	PREMIER	t	\N
297	СПОРТИВНЫЕ АВТО И РЕПЛИКИ	t	\N
298	PROTON	t	\N
299	PUCH	t	\N
300	PUMA	t	\N
301	PUNK	t	\N
302	QIANTU	t	\N
303	QINGLING	t	\N
304	QOROS	t	\N
305	QVALE	t	\N
306	RADAR	t	\N
307	RADFORD	t	\N
308	RAM	t	\N
309	RAVON	t	\N
310	RAYTON FISSORE	t	\N
311	RELIANT	t	\N
312	RENAISSANCE	t	\N
313	REZVANI	t	\N
314	RIMAC	t	\N
315	RINSPEED	t	\N
316	RISING AUTO	t	\N
317	RIVIAN	t	\N
318	ROEWE	t	\N
319	ROLLS-ROYCE	t	\N
320	RONART	t	\N
321	ROSSA	t	\N
322	ROX	t	\N
323	РУССО-БАЛТ	t	\N
324	SAIC	t	\N
325	SAIPA	t	\N
326	SALEEN	t	\N
327	RENAULT SAMSUNG	t	\N
328	SANDSTORM	t	\N
329	SANTANA	t	\N
330	SATURN	t	\N
331	SCION	t	\N
332	SCOUT	t	\N
333	SEARS	t	\N
334	SERES	t	\N
335	SHANGHAI MAPLE	t	\N
336	SHUANGHUAN	t	\N
337	SIMCA	t	\N
338	SKODA	t	\N
339	SKYWELL	t	\N
340	SKYWORTH	t	\N
341	СМЗ	t	\N
342	SOLARIS	t	\N
343	SOLLERS	t	\N
344	SOUEAST	t	\N
345	SPECTRE	t	\N
346	SPYKER	t	\N
347	SSANGYONG	t	\N
348	STELATO	t	\N
349	STEYR	t	\N
350	STUDEBAKER	t	\N
351	SWM	t	\N
352	ТАГАЗ	t	\N
353	TALBOT	t	\N
354	TANK	t	\N
355	TATA	t	\N
356	TATRA	t	\N
357	TAZZARI	t	\N
358	TENET	t	\N
359	TESLA	t	\N
360	THAIRUNG	t	\N
361	THINK	t	\N
362	TIANMA	t	\N
363	TIANYE	t	\N
364	TOFAS	t	\N
365	TRABANT	t	\N
366	TRAMONTANA	t	\N
367	TRIUMPH	t	\N
368	GAC TRUMPCHI	t	\N
369	TVR	t	\N
370	УАЗ	t	\N
371	ULTIMA	t	\N
372	UMO	t	\N
373	VAUXHALL	t	\N
374	LADA (ВАЗ)	t	\N
375	VECTOR	t	\N
376	VENTURI	t	\N
377	VENUCIA	t	\N
378	VGV	t	\N
379	VINFAST	t	\N
380	VOLGA	t	\N
381	VORTEX	t	\N
382	VOYAH	t	\N
383	VUHL	t	\N
384	WANDERER	t	\N
385	WARTBURG	t	\N
386	WELTMEISTER	t	\N
387	WESTFIELD	t	\N
388	WEY	t	\N
389	WIESMANN	t	\N
390	WILLYS	t	\N
391	WULING	t	\N
392	W MOTORS	t	\N
393	XCITE	t	\N
394	XEV	t	\N
395	XIAOMI	t	\N
396	XIN KAI	t	\N
397	XPENG	t	\N
398	ЯНДЕКС РОВЕР	t	\N
399	YEMA	t	\N
400	YIPAI	t	\N
401	YUDO	t	\N
402	YULON	t	\N
403	ZASTAVA	t	\N
404	ЗАЗ	t	\N
405	ZEEKR	t	\N
406	ZENOS	t	\N
407	ZENVO	t	\N
408	ZHIDO	t	\N
409	ZIBAR	t	\N
410	ЗИЛ	t	\N
411	ЗИС	t	\N
412	ZOTYE	t	\N
413	ZUBR	t	\N
414	ZX	t	\N
\.


--
-- Data for Name: catalogo_modelos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.catalogo_modelos (id_modelo, id_marca, nombre, activo, fecha_registro) FROM stdin;
427	10	FABIA	t	\N
262	3	ALHAMBRA	t	\N
263	3	ALTEA	t	\N
264	3	ALTEA XL	t	\N
265	3	AROSA	t	\N
266	3	CORDOBA	t	\N
267	3	CORDOBA VARIO	t	\N
268	3	EXEO	t	\N
269	3	IBIZA	t	\N
270	3	IBIZA ST	t	\N
271	3	EXEO ST	t	\N
272	3	LEON	t	\N
273	3	LEON ST	t	\N
274	3	INCA	t	\N
275	3	MII	t	\N
276	3	TOLEDO	t	\N
277	4	CAPTUR	t	\N
278	4	CLIO	t	\N
279	4	CLIO GRANDTOUR	t	\N
280	4	ESPACE	t	\N
281	4	EXPRESS	t	\N
282	4	FLUENCE	t	\N
283	4	GRAND ESPACE	t	\N
284	4	GRAND MODUS	t	\N
285	4	GRAND SCENIC	t	\N
286	4	KADJAR	t	\N
287	4	KANGOO	t	\N
288	4	KANGOO EXPRESS	t	\N
289	4	KOLEOS	t	\N
290	4	LAGUNA	t	\N
291	4	LAGUNA GRANDTOUR	t	\N
292	4	LATITUDE	t	\N
293	4	MASCOTT	t	\N
294	4	MÉGANE	t	\N
295	4	MÉGANE CC	t	\N
296	4	MÉGANE COMBI	t	\N
297	4	MÉGANE GRANDTOUR	t	\N
298	4	MÉGANE COUPÉ	t	\N
299	4	MÉGANE SCÉNIC	t	\N
300	4	SCÉNIC	t	\N
301	4	TALISMAN	t	\N
302	4	TALISMAN GRANDTOUR	t	\N
303	4	THALIA	t	\N
304	4	TWINGO	t	\N
305	4	WIND	t	\N
306	4	ZOÉ	t	\N
307	5	1007	t	\N
308	5	107	t	\N
309	5	106	t	\N
310	5	108	t	\N
311	5	2008	t	\N
312	5	205	t	\N
313	5	205 CABRIO	t	\N
314	5	206	t	\N
315	5	206 CC	t	\N
316	5	206 SW	t	\N
317	5	207	t	\N
318	5	207 CC	t	\N
319	5	207 SW	t	\N
320	5	306	t	\N
321	5	307	t	\N
322	5	307 CC	t	\N
323	5	307 SW	t	\N
324	5	308	t	\N
325	5	308 CC	t	\N
326	5	308 SW	t	\N
327	5	309	t	\N
328	5	4007	t	\N
329	5	4008	t	\N
330	5	405	t	\N
331	5	406	t	\N
332	5	407	t	\N
333	5	407 SW	t	\N
334	5	5008	t	\N
335	5	508	t	\N
336	5	508 SW	t	\N
337	5	605	t	\N
338	5	806	t	\N
339	5	607	t	\N
340	5	807	t	\N
341	5	BIPPER	t	\N
342	5	RCZ	t	\N
343	6	DOKKER	t	\N
344	6	DUSTER	t	\N
345	6	LODGY	t	\N
346	6	LOGAN	t	\N
347	6	LOGAN MCV	t	\N
348	6	LOGAN VAN	t	\N
349	6	SANDERO	t	\N
350	6	SOLENZA	t	\N
351	7	BERLINGO	t	\N
352	7	C-CROSSER	t	\N
353	7	C-ELISSÉE	t	\N
354	7	C-ZERO	t	\N
355	7	C1	t	\N
356	7	C2	t	\N
357	7	C3	t	\N
358	7	C3 PICASSO	t	\N
359	7	C4	t	\N
360	7	C4 AIRCROSS	t	\N
361	7	C4 CACTUS	t	\N
362	7	C4 COUPÉ	t	\N
363	7	C4 GRAND PICASSO	t	\N
364	7	C4 SEDAN	t	\N
365	7	C5	t	\N
366	7	C5 BREAK	t	\N
367	7	C5 TOURER	t	\N
368	7	C6	t	\N
369	7	C8	t	\N
370	7	DS3	t	\N
371	7	DS4	t	\N
372	7	DS5	t	\N
373	7	EVASION	t	\N
374	7	JUMPER	t	\N
375	7	JUMPY	t	\N
376	7	SAXO	t	\N
377	7	NEMO	t	\N
378	7	XANTIA	t	\N
379	7	XSARA	t	\N
380	8	AGILA	t	\N
381	8	AMPERA	t	\N
382	8	ANTARA	t	\N
383	8	ASTRA	t	\N
384	8	ASTRA CABRIO	t	\N
385	8	ASTRA CARAVAN	t	\N
386	8	ASTRA COUPÉ	t	\N
387	8	CALIBRA	t	\N
388	8	CAMPO	t	\N
389	8	CASCADA	t	\N
390	8	CORSA	t	\N
391	8	FRONTERA	t	\N
392	8	INSIGNIA	t	\N
393	8	INSIGNIA KOMBI	t	\N
394	8	KADETT	t	\N
395	8	MERIVA	t	\N
396	8	MOKKA	t	\N
397	8	MOVANO	t	\N
398	8	OMEGA	t	\N
399	8	SIGNUM	t	\N
400	8	VECTRA	t	\N
401	8	VECTRA CARAVAN	t	\N
402	8	VIVARO	t	\N
403	8	VIVARO KOMBI	t	\N
404	8	ZAFIRA	t	\N
405	9	145	t	\N
406	9	146	t	\N
407	9	147	t	\N
408	9	155	t	\N
409	9	156	t	\N
410	9	156 SPORTWAGON	t	\N
411	9	159	t	\N
412	9	159 SPORTWAGON	t	\N
413	9	164	t	\N
414	9	166	t	\N
415	9	4C	t	\N
416	9	BRERA	t	\N
417	9	GTV	t	\N
418	9	MITO	t	\N
419	9	CROSSWAGON	t	\N
420	9	SPIDER	t	\N
421	9	GT	t	\N
422	9	GIULIETTA	t	\N
423	9	GIULIA	t	\N
424	10	FAVORIT	t	\N
425	10	FELICIA	t	\N
426	10	CITIGO	t	\N
428	10	FABIA COMBI	t	\N
429	10	FABIA SEDAN	t	\N
430	10	FELICIA COMBI	t	\N
431	10	OCTAVIA	t	\N
432	10	OCTAVIA COMBI	t	\N
433	10	ROOMSTER	t	\N
434	10	YETI	t	\N
435	10	RAPID	t	\N
436	10	RAPID SPACEBACK	t	\N
437	10	SUPERB	t	\N
438	10	SUPERB COMBI	t	\N
439	11	ALERO	t	\N
440	11	AVEO	t	\N
441	11	CAMARO	t	\N
442	11	CAPTIVA	t	\N
443	11	CORVETTE	t	\N
444	11	CRUZE	t	\N
445	11	CRUZE SW	t	\N
446	11	EPICA	t	\N
447	11	EQUINOX	t	\N
448	11	EVANDA	t	\N
449	11	HHR	t	\N
450	11	KALOS	t	\N
451	11	LACETTI	t	\N
452	11	LACETTI SW	t	\N
453	11	LUMINA	t	\N
454	11	MALIBU	t	\N
455	11	MATIZ	t	\N
456	11	MONTE CARLO	t	\N
457	11	NUBIRA	t	\N
458	11	ORLANDO	t	\N
459	11	SPARK	t	\N
460	11	SUBURBAN	t	\N
461	11	TACUMA	t	\N
462	11	TAHOE	t	\N
463	11	TRAX	t	\N
464	12	911 CARRERA	t	\N
465	12	911 CARRERA CABRIO	t	\N
466	12	911 TARGA	t	\N
467	12	911 TURBO	t	\N
468	12	924	t	\N
469	12	944	t	\N
470	12	997	t	\N
471	12	BOXSTER	t	\N
472	12	CAYENNE	t	\N
473	12	CAYMAN	t	\N
474	12	MACAN	t	\N
475	12	PANAMERA	t	\N
476	13	ACCORD	t	\N
477	13	ACCORD COUPÉ	t	\N
478	13	ACCORD TOURER	t	\N
479	13	CITY	t	\N
480	13	CIVIC	t	\N
481	13	CIVIC AERODECK	t	\N
482	13	CIVIC COUPÉ	t	\N
483	13	CIVIC TOURER	t	\N
484	13	CIVIC TYPE R	t	\N
485	13	CR-V	t	\N
486	13	CR-X	t	\N
487	13	CR-Z	t	\N
488	13	FR-V	t	\N
489	13	HR-V	t	\N
490	13	INSIGHT	t	\N
491	13	INTEGRA	t	\N
492	13	JAZZ	t	\N
493	13	LEGEND	t	\N
494	13	PRELUDE	t	\N
495	14	BRZ	t	\N
496	14	FORESTER	t	\N
497	14	IMPREZA	t	\N
498	14	IMPREZA WAGON	t	\N
499	14	JUSTY	t	\N
500	14	LEGACY	t	\N
501	14	LEGACY WAGON	t	\N
502	14	LEGACY OUTBACK	t	\N
503	14	LEVORG	t	\N
504	14	OUTBACK	t	\N
505	14	SVX	t	\N
506	14	TRIBECA	t	\N
507	14	TRIBECA B9	t	\N
508	14	XV	t	\N
509	15	121	t	\N
510	15	2	t	\N
511	15	3	t	\N
512	15	323	t	\N
513	15	323 COMBI	t	\N
514	15	323 COUPÉ	t	\N
515	15	323 F	t	\N
516	15	5	t	\N
517	15	6	t	\N
518	15	6 COMBI	t	\N
519	15	626	t	\N
520	15	626 COMBI	t	\N
521	15	B-FIGHTER	t	\N
522	15	B2500	t	\N
523	15	BT	t	\N
524	15	CX-3	t	\N
525	15	CX-5	t	\N
526	15	CX-7	t	\N
527	15	CX-9	t	\N
528	15	DEMIO	t	\N
529	15	MPV	t	\N
530	15	MX-3	t	\N
531	15	MX-5	t	\N
532	15	MX-6	t	\N
533	15	PREMACY	t	\N
534	15	RX-7	t	\N
535	15	RX-8	t	\N
536	15	XEDOX 6	t	\N
537	16	3000 GT	t	\N
538	16	ASX	t	\N
539	16	CARISMA	t	\N
540	16	COLT	t	\N
541	16	COLT CC	t	\N
542	16	ECLIPSE	t	\N
543	16	FUSO CANTER	t	\N
544	16	GALANT	t	\N
545	16	GALANT COMBI	t	\N
546	16	GRANDIS	t	\N
547	16	L200	t	\N
548	16	L200 PICK UP	t	\N
549	16	L200 PICK UP ALLRAD	t	\N
550	16	L300	t	\N
551	16	LANCER	t	\N
552	16	LANCER COMBI	t	\N
553	16	LANCER EVO	t	\N
554	16	LANCER SPORTBACK	t	\N
555	16	OUTLANDER	t	\N
556	16	PAJERO	t	\N
557	16	PAJETO PININ	t	\N
558	16	PAJERO PININ WAGON	t	\N
559	16	PAJERO SPORT	t	\N
560	16	PAJERO WAGON	t	\N
561	16	SPACE STAR	t	\N
562	17	CT	t	\N
563	17	GS	t	\N
564	17	GS 300	t	\N
565	17	GX	t	\N
566	17	IS	t	\N
567	17	IS 200	t	\N
568	17	IS 250 C	t	\N
569	17	IS-F	t	\N
570	17	LS	t	\N
571	17	LX	t	\N
572	17	NX	t	\N
573	17	RC F	t	\N
574	17	RX	t	\N
575	17	RX 300	t	\N
576	17	RX 400H	t	\N
577	17	RX 450H	t	\N
578	17	SC 430	t	\N
579	18	4-RUNNER	t	\N
580	18	AURIS	t	\N
581	18	AVENSIS	t	\N
582	18	AVENSIS COMBI	t	\N
583	18	AVENSIS VAN VERSO	t	\N
584	18	AYGO	t	\N
585	18	CAMRY	t	\N
586	18	CARINA	t	\N
587	18	CELICA	t	\N
588	18	COROLLA	t	\N
589	18	COROLLA COMBI	t	\N
590	18	COROLLA SEDAN	t	\N
591	18	COROLLA VERSO	t	\N
592	18	FJ CRUISER	t	\N
593	18	GT86	t	\N
594	18	HIACE	t	\N
595	18	HIACE VAN	t	\N
596	18	HIGHLANDER	t	\N
597	18	HILUX	t	\N
598	18	LAND CRUISER	t	\N
599	18	MR2	t	\N
600	18	PASEO	t	\N
601	18	PICNIC	t	\N
602	18	PRIUS	t	\N
603	18	RAV4	t	\N
604	18	SEQUOIA	t	\N
605	18	STARLET	t	\N
606	18	SUPRA	t	\N
607	18	TUNDRA	t	\N
608	18	URBAN CRUISER	t	\N
609	18	VERSO	t	\N
610	18	YARIS	t	\N
611	18	YARIS VERSO	t	\N
612	19	I3	t	\N
613	19	I8	t	\N
614	19	M3	t	\N
615	19	M4	t	\N
616	19	M5	t	\N
617	19	M6	t	\N
618	19	RAD 1	t	\N
619	19	RAD 1 CABRIO	t	\N
620	19	RAD 1 COUPÉ	t	\N
621	19	RAD 2	t	\N
622	19	RAD 2 ACTIVE TOURER	t	\N
623	19	RAD 2 COUPÉ	t	\N
624	19	RAD 2 GRAN TOURER	t	\N
625	19	RAD 3	t	\N
626	19	RAD 3 CABRIO	t	\N
627	19	RAD 3 COMPACT	t	\N
628	19	RAD 3 COUPÉ	t	\N
629	19	RAD 3 GT	t	\N
630	19	RAD 3 TOURING	t	\N
631	19	RAD 4	t	\N
632	19	RAD 4 CABRIO	t	\N
633	19	RAD 4 GRAN COUPÉ	t	\N
634	19	RAD 5	t	\N
635	19	RAD 5 GT	t	\N
636	19	RAD 5 TOURING	t	\N
637	19	RAD 6	t	\N
638	19	RAD 6 CABRIO	t	\N
639	19	RAD 6 COUPÉ	t	\N
640	19	RAD 6 GRAN COUPÉ	t	\N
641	19	RAD 7	t	\N
642	19	RAD 8 COUPÉ	t	\N
643	19	X1	t	\N
644	19	X3	t	\N
645	19	X4	t	\N
646	19	X5	t	\N
647	19	X6	t	\N
648	19	Z3	t	\N
649	19	Z3 COUPÉ	t	\N
650	19	Z3 ROADSTER	t	\N
651	19	Z4	t	\N
652	19	Z4 ROADSTER	t	\N
653	20	AMAROK	t	\N
654	20	BEETLE	t	\N
655	20	BORA	t	\N
656	20	BORA VARIANT	t	\N
657	20	CADDY	t	\N
658	20	CADDY VAN	t	\N
659	20	LIFE	t	\N
660	20	CALIFORNIA	t	\N
661	20	CARAVELLE	t	\N
662	20	CC	t	\N
663	20	CRAFTER	t	\N
664	20	CRAFTER VAN	t	\N
665	20	CRAFTER KOMBI	t	\N
666	20	CROSSTOURAN	t	\N
667	20	EOS	t	\N
668	20	FOX	t	\N
669	20	GOLF	t	\N
670	20	GOLF CABRIO	t	\N
671	20	GOLF PLUS	t	\N
672	20	GOLF SPORTVAN	t	\N
673	20	GOLF VARIANT	t	\N
674	20	JETTA	t	\N
675	20	LT	t	\N
676	20	LUPO	t	\N
677	20	MULTIVAN	t	\N
678	20	NEW BEETLE	t	\N
679	20	NEW BEETLE CABRIO	t	\N
680	20	PASSAT	t	\N
681	20	PASSAT ALLTRACK	t	\N
682	20	PASSAT CC	t	\N
683	20	PASSAT VARIANT	t	\N
684	20	PASSAT VARIANT VAN	t	\N
685	20	PHAETON	t	\N
686	20	POLO	t	\N
687	20	POLO VAN	t	\N
688	20	POLO VARIANT	t	\N
689	20	SCIROCCO	t	\N
690	20	SHARAN	t	\N
691	20	T4	t	\N
692	20	T4 CARAVELLE	t	\N
693	20	T4 MULTIVAN	t	\N
694	20	T5	t	\N
695	20	T5 CARAVELLE	t	\N
696	20	T5 MULTIVAN	t	\N
697	20	T5 TRANSPORTER SHUTTLE	t	\N
698	20	TIGUAN	t	\N
699	20	TOUAREG	t	\N
700	20	TOURAN	t	\N
701	21	ALTO	t	\N
702	21	BALENO	t	\N
703	21	BALENO KOMBI	t	\N
704	21	GRAND VITARA	t	\N
705	21	GRAND VITARA XL-7	t	\N
706	21	IGNIS	t	\N
707	21	JIMNY	t	\N
708	21	KIZASHI	t	\N
709	21	LIANA	t	\N
710	21	SAMURAI	t	\N
711	21	SPLASH	t	\N
712	21	SWIFT	t	\N
713	21	SX4	t	\N
714	21	SX4 SEDAN	t	\N
715	21	VITARA	t	\N
716	21	WAGON R+	t	\N
717	22	100 D	t	\N
718	22	115	t	\N
719	22	124	t	\N
720	22	126	t	\N
721	22	190	t	\N
722	22	190 D	t	\N
723	22	190 E	t	\N
724	22	200 - 300	t	\N
725	22	200 D	t	\N
726	22	200 E	t	\N
727	22	210 VAN	t	\N
728	22	210 KOMBI	t	\N
729	22	310 VAN	t	\N
730	22	310 KOMBI	t	\N
731	22	230 - 300 CE COUPÉ	t	\N
732	22	260 - 560 SE	t	\N
733	22	260 - 560 SEL	t	\N
734	22	500 - 600 SEC COUPÉ	t	\N
735	22	TRIEDA A	t	\N
736	22	A	t	\N
737	22	A L	t	\N
738	22	AMG GT	t	\N
739	22	TRIEDA B	t	\N
740	22	TRIEDA C	t	\N
741	22	C	t	\N
742	22	C SPORTCOUPÉ	t	\N
743	22	C T	t	\N
744	22	CITAN	t	\N
745	22	CL	t	\N
746	22	CLA	t	\N
747	22	CLC	t	\N
748	22	CLK CABRIO	t	\N
749	22	CLK COUPÉ	t	\N
750	22	CLS	t	\N
751	22	TRIEDA E	t	\N
752	22	E	t	\N
753	22	E CABRIO	t	\N
754	22	E COUPÉ	t	\N
755	22	E T	t	\N
756	22	TRIEDA G	t	\N
757	22	G CABRIO	t	\N
758	22	GL	t	\N
759	22	GLA	t	\N
760	22	GLC	t	\N
761	22	GLE	t	\N
762	22	GLK	t	\N
763	22	TRIEDA M	t	\N
764	22	MB 100	t	\N
765	22	TRIEDA R	t	\N
766	22	TRIEDA S	t	\N
767	22	S	t	\N
768	22	S COUPÉ	t	\N
769	22	SL	t	\N
770	22	SLC	t	\N
771	22	SLK	t	\N
772	22	SLR	t	\N
773	22	SPRINTER	t	\N
774	23	9-3	t	\N
775	23	9-3 CABRIOLET	t	\N
776	23	9-3 COUPÉ	t	\N
777	23	9-3 SPORTCOMBI	t	\N
778	23	9-5	t	\N
779	23	9-5 SPORTCOMBI	t	\N
780	23	900	t	\N
781	23	900 C	t	\N
782	23	900 C TURBO	t	\N
783	23	9000	t	\N
784	24	100	t	\N
785	24	100 AVANT	t	\N
786	24	80	t	\N
787	24	80 AVANT	t	\N
788	24	80 CABRIO	t	\N
789	24	90	t	\N
790	24	A1	t	\N
791	24	A2	t	\N
792	24	A3	t	\N
793	24	A3 CABRIOLET	t	\N
794	24	A3 LIMUZINA	t	\N
795	24	A3 SPORTBACK	t	\N
796	24	A4	t	\N
797	24	A4 ALLROAD	t	\N
798	24	A4 AVANT	t	\N
799	24	A4 CABRIOLET	t	\N
800	24	A5	t	\N
801	24	A5 CABRIOLET	t	\N
802	24	A5 SPORTBACK	t	\N
803	24	A6	t	\N
804	24	A6 ALLROAD	t	\N
805	24	A6 AVANT	t	\N
806	24	A7	t	\N
807	24	A8	t	\N
808	24	A8 LONG	t	\N
809	24	Q3	t	\N
810	24	Q5	t	\N
811	24	Q7	t	\N
812	24	R8	t	\N
813	24	RS4 CABRIOLET	t	\N
814	24	RS4/RS4 AVANT	t	\N
815	24	RS5	t	\N
816	24	RS6 AVANT	t	\N
817	24	RS7	t	\N
818	24	S3/S3 SPORTBACK	t	\N
819	24	S4 CABRIOLET	t	\N
820	24	S4/S4 AVANT	t	\N
821	24	S5/S5 CABRIOLET	t	\N
822	24	S6/RS6	t	\N
823	24	S7	t	\N
824	24	S8	t	\N
825	24	SQ5	t	\N
826	24	TT COUPÉ	t	\N
827	24	TT ROADSTER	t	\N
828	24	TTS	t	\N
829	25	AVELLA	t	\N
830	25	BESTA	t	\N
831	25	CARENS	t	\N
832	25	CARNIVAL	t	\N
833	25	CEE`D	t	\N
834	25	CEE`D SW	t	\N
835	25	CERATO	t	\N
836	25	K 2500	t	\N
837	25	MAGENTIS	t	\N
838	25	OPIRUS	t	\N
839	25	OPTIMA	t	\N
840	25	PICANTO	t	\N
841	25	PREGIO	t	\N
842	25	PRIDE	t	\N
843	25	PRO CEE`D	t	\N
844	25	RIO	t	\N
845	25	RIO COMBI	t	\N
846	25	RIO SEDAN	t	\N
847	25	SEPHIA	t	\N
848	25	SHUMA	t	\N
849	25	SORENTO	t	\N
850	25	SOUL	t	\N
851	25	SPORTAGE	t	\N
852	25	VENGA	t	\N
853	26	109	t	\N
854	26	DEFENDER	t	\N
855	26	DISCOVERY	t	\N
856	26	DISCOVERY SPORT	t	\N
857	26	FREELANDER	t	\N
858	26	RANGE ROVER	t	\N
859	26	RANGE ROVER EVOQUE	t	\N
860	26	RANGE ROVER SPORT	t	\N
861	27	AVENGER	t	\N
862	27	CALIBER	t	\N
863	27	CHALLENGER	t	\N
864	27	CHARGER	t	\N
865	27	GRAND CARAVAN	t	\N
866	27	JOURNEY	t	\N
867	27	MAGNUM	t	\N
868	27	NITRO	t	\N
869	27	RAM	t	\N
870	27	STEALTH	t	\N
871	27	VIPER	t	\N
872	28	300 C	t	\N
873	28	300 C TOURING	t	\N
874	28	300 M	t	\N
875	28	CROSSFIRE	t	\N
876	28	GRAND VOYAGER	t	\N
877	28	LHS	t	\N
878	28	NEON	t	\N
879	28	PACIFICA	t	\N
880	28	PLYMOUTH	t	\N
881	28	PT CRUISER	t	\N
882	28	SEBRING	t	\N
883	28	SEBRING CONVERTIBLE	t	\N
884	28	STRATUS	t	\N
885	28	STRATUS CABRIO	t	\N
886	28	TOWN & COUNTRY	t	\N
887	28	VOYAGER	t	\N
888	29	AEROSTAR	t	\N
889	29	B-MAX	t	\N
890	29	C-MAX	t	\N
891	29	CORTINA	t	\N
892	29	COUGAR	t	\N
893	29	EDGE	t	\N
894	29	ESCORT	t	\N
895	29	ESCORT CABRIO	t	\N
896	29	ESCORT KOMBI	t	\N
897	29	EXPLORER	t	\N
898	29	F-150	t	\N
899	29	F-250	t	\N
900	29	FIESTA	t	\N
901	29	FOCUS	t	\N
902	29	FOCUS C-MAX	t	\N
903	29	FOCUS CC	t	\N
904	29	FOCUS KOMBI	t	\N
905	29	FUSION	t	\N
906	29	GALAXY	t	\N
907	29	GRAND C-MAX	t	\N
908	29	KA	t	\N
909	29	KUGA	t	\N
910	29	MAVERICK	t	\N
911	29	MONDEO	t	\N
912	29	MONDEO COMBI	t	\N
913	29	MUSTANG	t	\N
914	29	ORION	t	\N
915	29	PUMA	t	\N
916	29	RANGER	t	\N
917	29	S-MAX	t	\N
918	29	SIERRA	t	\N
919	29	STREET KA	t	\N
920	29	TOURNEO CONNECT	t	\N
921	29	TOURNEO CUSTOM	t	\N
922	29	TRANSIT	t	\N
923	29	TRANSIT BUS	t	\N
924	29	TRANSIT CONNECT LWB	t	\N
925	29	TRANSIT COURIER	t	\N
926	29	TRANSIT CUSTOM	t	\N
927	29	TRANSIT KOMBI	t	\N
928	29	TRANSIT TOURNEO	t	\N
929	29	TRANSIT VALNIK	t	\N
930	29	TRANSIT VAN	t	\N
931	29	TRANSIT VAN 350	t	\N
932	29	WINDSTAR	t	\N
933	30	H2	t	\N
934	30	H3	t	\N
935	31	ACCENT	t	\N
936	31	ATOS	t	\N
937	31	ATOS PRIME	t	\N
938	31	COUPÉ	t	\N
939	31	ELANTRA	t	\N
940	31	GALLOPER	t	\N
941	31	GENESIS	t	\N
942	31	GETZ	t	\N
943	31	GRANDEUR	t	\N
944	31	H 350	t	\N
945	31	H1	t	\N
946	31	H1 BUS	t	\N
947	31	H1 VAN	t	\N
948	31	H200	t	\N
949	31	I10	t	\N
950	31	I20	t	\N
951	31	I30	t	\N
952	31	I30 CW	t	\N
953	31	I40	t	\N
954	31	I40 CW	t	\N
955	31	IX20	t	\N
956	31	IX35	t	\N
957	31	IX55	t	\N
958	31	LANTRA	t	\N
959	31	MATRIX	t	\N
960	31	SANTA FE	t	\N
961	31	SONATA	t	\N
962	31	TERRACAN	t	\N
963	31	TRAJET	t	\N
964	31	TUCSON	t	\N
965	31	VELOSTER	t	\N
966	32	EX	t	\N
967	32	FX	t	\N
968	32	G	t	\N
969	32	G COUPÉ	t	\N
970	32	M	t	\N
971	32	Q	t	\N
972	32	QX	t	\N
973	33	DAIMLER	t	\N
974	33	F-PACE	t	\N
975	33	F-TYPE	t	\N
976	33	S-TYPE	t	\N
977	33	SOVEREIGN	t	\N
978	33	X-TYPE	t	\N
979	33	X-TYPE ESTATE	t	\N
980	33	XE	t	\N
981	33	XF	t	\N
982	33	XJ	t	\N
983	33	XJ12	t	\N
984	33	XJ6	t	\N
985	33	XJ8	t	\N
986	33	XJR	t	\N
987	33	XK	t	\N
988	33	XK8 CONVERTIBLE	t	\N
989	33	XKR	t	\N
990	33	XKR CONVERTIBLE	t	\N
991	1	CHEROKEE	t	\N
992	1	COMMANDER	t	\N
993	1	COMPASS	t	\N
994	1	GRAND CHEROKEE	t	\N
995	1	PATRIOT	t	\N
996	1	RENEGADE	t	\N
997	1	WRANGLER	t	\N
998	34	100 NX	t	\N
999	34	200 SX	t	\N
1000	34	350 Z	t	\N
1001	34	350 Z ROADSTER	t	\N
1002	34	370 Z	t	\N
1003	34	ALMERA	t	\N
1004	34	ALMERA TINO	t	\N
1005	34	CABSTAR E - T	t	\N
1006	34	CABSTAR TL2 VALNIK	t	\N
1007	34	E-NV200	t	\N
1008	34	GT-R	t	\N
1009	34	INSTERSTAR	t	\N
1010	34	JUKE	t	\N
1011	34	KING CAB	t	\N
1012	34	LEAF	t	\N
1013	34	MAXIMA	t	\N
1014	34	MAXIMA QX	t	\N
1015	34	MICRA	t	\N
1016	34	MURANO	t	\N
1017	34	NAVARA	t	\N
1018	34	NOTE	t	\N
1019	34	NP300 PICKUP	t	\N
1020	34	NV200	t	\N
1021	34	NV400	t	\N
1022	34	PATHFINDER	t	\N
1023	34	PATROL	t	\N
1024	34	PATROL GR	t	\N
1025	34	PICKUP	t	\N
1026	34	PIXO	t	\N
1027	34	PRIMASTAR	t	\N
1028	34	PRIMASTAR COMBI	t	\N
1029	34	PRIMERA	t	\N
1030	34	PRIMERA COMBI	t	\N
1031	34	PULSAR	t	\N
1032	34	QASHQAI	t	\N
1033	34	SERENA	t	\N
1034	34	SUNNY	t	\N
1035	34	TERRANO	t	\N
1036	34	TIIDA	t	\N
1037	34	TRADE	t	\N
1038	34	VANETTE CARGO	t	\N
1039	34	X-TRAIL	t	\N
1040	35	240	t	\N
1041	35	340	t	\N
1042	35	360	t	\N
1043	35	460	t	\N
1044	35	850	t	\N
1045	35	850 KOMBI	t	\N
1046	35	C30	t	\N
1047	35	C70	t	\N
1048	35	C70 CABRIO	t	\N
1049	35	C70 COUPÉ	t	\N
1050	35	S40	t	\N
1051	35	S60	t	\N
1052	35	S70	t	\N
1053	35	S80	t	\N
1054	35	S90	t	\N
1055	35	V40	t	\N
1056	35	V50	t	\N
1057	35	V60	t	\N
1058	35	V70	t	\N
1059	35	V90	t	\N
1060	35	XC60	t	\N
1061	35	XC70	t	\N
1062	35	XC90	t	\N
1063	36	ESPERO	t	\N
1064	36	KALOS	t	\N
1065	36	LACETTI	t	\N
1066	36	LANOS	t	\N
1067	36	LEGANZA	t	\N
1068	36	LUBLIN	t	\N
1069	36	MATIZ	t	\N
1070	36	NEXIA	t	\N
1071	36	NUBIRA	t	\N
1072	36	NUBIRA KOMBI	t	\N
1073	36	RACER	t	\N
1074	36	TACUMA	t	\N
1075	36	TICO	t	\N
1076	37	1100	t	\N
1077	37	126	t	\N
1078	37	500	t	\N
1079	37	500L	t	\N
1080	37	500X	t	\N
1081	37	850	t	\N
1082	37	BARCHETTA	t	\N
1083	37	BRAVA	t	\N
1084	37	CINQUECENTO	t	\N
1085	37	COUPÉ	t	\N
1086	37	CROMA	t	\N
1087	37	DOBLO	t	\N
1088	37	DOBLO CARGO	t	\N
1089	37	DOBLO CARGO COMBI	t	\N
1090	37	DUCATO	t	\N
1091	37	DUCATO VAN	t	\N
1092	37	DUCATO KOMBI	t	\N
1093	37	DUCATO PODVOZOK	t	\N
1094	37	FLORINO	t	\N
1095	37	FLORINO COMBI	t	\N
1096	37	FREEMONT	t	\N
1097	37	GRANDE PUNTO	t	\N
1098	37	IDEA	t	\N
1099	37	LINEA	t	\N
1100	37	MAREA	t	\N
1101	37	MAREA WEEKEND	t	\N
1102	37	MULTIPLA	t	\N
1103	37	PALIO WEEKEND	t	\N
1104	37	PANDA	t	\N
1105	37	PANDA VAN	t	\N
1106	37	PUNTO	t	\N
1107	37	PUNTO CABRIOLET	t	\N
1108	37	PUNTO EVO	t	\N
1109	37	PUNTO VAN	t	\N
1110	37	QUBO	t	\N
1111	37	SCUDO	t	\N
1112	37	SCUDO VAN	t	\N
1113	37	SCUDO KOMBI	t	\N
1114	37	SEDICI	t	\N
1115	37	SEICENTO	t	\N
1116	37	STILO	t	\N
1117	37	STILO MULTIWAGON	t	\N
1118	37	STRADA	t	\N
1119	37	TALENTO	t	\N
1120	37	TIPO	t	\N
1121	37	ULYSSE	t	\N
1122	37	UNO	t	\N
1123	37	X1/9	t	\N
1124	38	COOPER	t	\N
1125	38	COOPER CABRIO	t	\N
1126	38	COOPER CLUBMAN	t	\N
1127	38	COOPER D	t	\N
1128	38	COOPER D CLUBMAN	t	\N
1129	38	COOPER S	t	\N
1130	38	COOPER S CABRIO	t	\N
1131	38	COOPER S CLUBMAN	t	\N
1132	38	COUNTRYMAN	t	\N
1133	38	MINI ONE	t	\N
1134	38	ONE D	t	\N
1135	39	200	t	\N
1136	39	214	t	\N
1137	39	218	t	\N
1138	39	25	t	\N
1139	39	400	t	\N
1140	39	414	t	\N
1141	39	416	t	\N
1142	39	620	t	\N
1143	39	75	t	\N
1144	40	CABRIO	t	\N
1145	40	CITY-COUPÉ	t	\N
1146	40	COMPACT PULSE	t	\N
1147	40	FORFOUR	t	\N
1148	40	FORTWO CABRIO	t	\N
1149	40	FORTWO COUPÉ	t	\N
1150	40	ROADSTER	t	\N
1151	41	T01	t	\N
1152	41	T10	t	\N
1153	42	124 SPIDER	t	\N
1154	42	500	t	\N
1155	42	595	t	\N
1156	42	600E	t	\N
1157	42	695	t	\N
1158	42	FASTBACK	t	\N
1159	42	PULSE	t	\N
1160	43	378 GT ZAGATO	t	\N
1161	43	ACE	t	\N
1162	43	ACECA	t	\N
1163	43	COBRA	t	\N
1164	43	COBRA GT	t	\N
1165	44	ADX	t	\N
1166	44	CDX	t	\N
1167	44	CL	t	\N
1168	44	CSX	t	\N
1169	44	EL	t	\N
1170	44	ILX	t	\N
1171	44	INTEGRA	t	\N
1172	44	LEGEND	t	\N
1173	44	MDX	t	\N
1174	44	NSX	t	\N
1175	44	RDX	t	\N
1176	44	RL	t	\N
1177	44	RLX	t	\N
1178	44	RSX	t	\N
1179	44	SLX	t	\N
1180	44	TL	t	\N
1181	44	TLX	t	\N
1182	44	TSX	t	\N
1183	44	ZDX	t	\N
1184	45	REVO	t	\N
1185	46	DIPLOMAT	t	\N
1186	46	TRUMPF JUNIOR	t	\N
1187	47	HYPTEC GT (HYPER GT)	t	\N
1188	47	HYPTEC HT (HYPER HT)	t	\N
1189	47	HYPTEC SSR (HYPER SSR)	t	\N
1190	47	HYPTEC HL	t	\N
1191	47	I60	t	\N
1192	47	LX	t	\N
1193	47	LX PLUS	t	\N
1194	47	N60	t	\N
1195	47	RT	t	\N
1196	47	S	t	\N
1197	47	S PLUS	t	\N
1198	47	UT	t	\N
1199	47	V	t	\N
1200	47	Y	t	\N
1201	47	Y PLUS	t	\N
1202	48	M5	t	\N
1203	48	M6	t	\N
1204	48	M7	t	\N
1205	48	M8	t	\N
1206	48	M9	t	\N
1207	49	U5	t	\N
1208	49	U6	t	\N
1209	50	500	t	\N
1210	9	105/115	t	\N
1211	9	1900	t	\N
1212	9	2600	t	\N
1213	9	33	t	\N
1214	9	33 STRADALE	t	\N
1215	9	6	t	\N
1216	9	6C	t	\N
1217	9	75	t	\N
1218	9	8C COMPETIZIONE	t	\N
1219	9	90	t	\N
1220	9	ALFASUD	t	\N
1221	9	ALFETTA	t	\N
1222	9	ARNA	t	\N
1223	9	DISCO VOLANTE	t	\N
1224	9	GTA COUPE	t	\N
1225	9	JUNIOR	t	\N
1226	9	MONTREAL	t	\N
1227	9	RZ	t	\N
1228	9	SPRINT	t	\N
1229	9	STELVIO	t	\N
1230	9	SZ	t	\N
1231	9	TONALE	t	\N
1232	51	B10	t	\N
1233	51	B11	t	\N
1234	51	B12	t	\N
1235	51	B3	t	\N
1236	51	B4	t	\N
1237	51	B5	t	\N
1238	51	B6	t	\N
1239	51	B7	t	\N
1240	51	B8	t	\N
1241	51	B9	t	\N
1242	51	C1	t	\N
1243	51	C2	t	\N
1244	51	D10	t	\N
1245	51	D3	t	\N
1246	51	D4	t	\N
1247	51	D5	t	\N
1248	51	ROADSTER	t	\N
1249	51	XB7	t	\N
1250	51	XD3	t	\N
1251	51	XD4	t	\N
1252	52	A110	t	\N
1253	52	A290	t	\N
1254	52	A310	t	\N
1255	52	A390	t	\N
1256	52	A610	t	\N
1257	52	GTA	t	\N
1258	53	А5	t	\N
1259	54	WORK	t	\N
1260	55	EAGLE	t	\N
1261	55	GREMLIN	t	\N
1262	55	HORNET	t	\N
1263	55	MATADOR	t	\N
1264	55	RAMBLER AMBASSADOR	t	\N
1265	55	RAMBLER CLASSIC	t	\N
1266	56	HMMWV (HUMVEE)	t	\N
1267	57	21541 STALKER	t	\N
1268	58	ALPHA S	t	\N
1269	58	ALPHA S5	t	\N
1270	58	ALPHA S6	t	\N
1271	58	ALPHA T	t	\N
1272	58	ALPHA T5	t	\N
1273	58	ALPHA T6	t	\N
1274	58	KAOLA	t	\N
1275	58	LITE	t	\N
1276	58	T1	t	\N
1277	59	ATOM	t	\N
1278	59	NOMAD	t	\N
1279	60	10	t	\N
1280	60	24	t	\N
1281	61	RETONA	t	\N
1282	61	ROCSTA	t	\N
1283	61	TOPIC	t	\N
1284	61	TOWNER	t	\N
1285	62	BULLDOG	t	\N
1286	62	CYGNET	t	\N
1287	62	DB11	t	\N
1288	62	DB12	t	\N
1289	62	DB5	t	\N
1290	62	DB6	t	\N
1291	62	DB7	t	\N
1292	62	DB9	t	\N
1293	62	DBS	t	\N
1294	62	DBX	t	\N
1295	62	DB AR1	t	\N
1296	62	LAGONDA	t	\N
1297	62	LAGONDA TARAF	t	\N
1298	62	ONE-77	t	\N
1299	62	RAPIDE	t	\N
1300	62	TICKFORD CAPRI	t	\N
1301	62	VANQUISH	t	\N
1302	62	V12 SPEEDSTER	t	\N
1303	62	V12 VANTAGE	t	\N
1304	62	V12 ZAGATO	t	\N
1305	62	V8 VANTAGE	t	\N
1306	62	V8 ZAGATO	t	\N
1307	62	VALHALLA	t	\N
1308	62	VALIANT	t	\N
1309	62	VALKYRIE	t	\N
1310	62	VALOUR	t	\N
1311	62	VANQUISH ZAGATO	t	\N
1312	62	VIRAGE	t	\N
1313	62	VULCAN	t	\N
1314	63	01	t	\N
1315	64	SPEEDSTER	t	\N
1316	24	200	t	\N
1317	24	50	t	\N
1318	24	920	t	\N
1319	24	A6 E-TRON	t	\N
1320	24	CABRIOLET	t	\N
1321	24	COUPE	t	\N
1322	24	E5	t	\N
1323	24	E7X	t	\N
1324	24	E-TRON	t	\N
1325	24	E-TRON GT	t	\N
1326	24	E-TRON S	t	\N
1327	24	E-TRON SPORTBACK	t	\N
1328	24	E-TRON S SPORTBACK	t	\N
1329	24	FRONT	t	\N
1330	24	NSU RO 80	t	\N
1331	24	Q2	t	\N
1332	24	Q3 SPORTBACK	t	\N
1333	24	Q4 E-TRON	t	\N
1334	24	Q4 SPORTBACK E-TRON	t	\N
1335	24	Q5 E-TRON	t	\N
1336	24	Q5 SPORTBACK	t	\N
1337	24	Q6	t	\N
1338	24	Q6 E-TRON	t	\N
1339	24	Q6 SPORTBACK E-TRON	t	\N
1340	24	Q8	t	\N
1341	24	Q8 E-TRON	t	\N
1342	24	Q8 SPORTBACK E-TRON	t	\N
1343	24	QUATTRO	t	\N
1344	24	R8 LMP	t	\N
1345	24	RS 2	t	\N
1346	24	RS 3	t	\N
1347	24	RS 4	t	\N
1348	24	RS 5	t	\N
1349	24	RS 6	t	\N
1350	24	RS 7	t	\N
1351	24	RS Q3	t	\N
1352	24	RS E-TRON GT	t	\N
1353	24	RS Q3 SPORTBACK	t	\N
1354	24	RS Q8	t	\N
1355	24	S1	t	\N
1356	24	S2	t	\N
1357	24	S3	t	\N
1358	24	S4	t	\N
1359	24	S5	t	\N
1360	24	S6	t	\N
1361	24	S6 E-TRON	t	\N
1362	24	SQ2	t	\N
1363	24	SQ5 SPORTBACK	t	\N
1364	24	SQ6 E-TRON	t	\N
1365	24	SQ6 SPORTBACK E-TRON	t	\N
1366	24	SQ7	t	\N
1367	24	SQ8	t	\N
1368	24	SQ8 E-TRON	t	\N
1369	24	SQ8 SPORTBACK E-TRON	t	\N
1370	24	S E-TRON GT	t	\N
1371	24	TT	t	\N
1372	24	TT RS	t	\N
1373	24	TYP R	t	\N
1374	24	V8	t	\N
1375	65	KOMENDANT	t	\N
1376	65	LAFET	t	\N
1377	65	SENAT	t	\N
1378	66	ALLEGRO	t	\N
1379	66	AMBASSADOR	t	\N
1380	66	FL2	t	\N
1381	66	FX4	t	\N
1382	66	MAESTRO	t	\N
1383	66	MAXI	t	\N
1384	66	METRO	t	\N
1385	66	MINI	t	\N
1386	66	MONTEGO	t	\N
1387	66	PRINCESS	t	\N
1388	66	SPRITE	t	\N
1389	67	100	t	\N
1390	67	3000	t	\N
1391	68	A 112	t	\N
1392	69	1000 SP	t	\N
1393	70	06	t	\N
1394	70	07	t	\N
1395	70	11	t	\N
1396	70	12	t	\N
1397	71	2160	t	\N
1398	71	2163	t	\N
1399	71	3101	t	\N
1400	72	A1	t	\N
1401	72	BJ2021	t	\N
1402	72	BJ2025F	t	\N
1403	72	BJ2030	t	\N
1404	72	BJ30	t	\N
1405	72	BJ40	t	\N
1406	72	BJ41	t	\N
1407	72	BJ60	t	\N
1408	72	BJ80	t	\N
1409	72	BJ90	t	\N
1410	72	BJ2020	t	\N
1411	72	BJ2026	t	\N
1412	72	BJ212	t	\N
1413	72	EC3	t	\N
1414	72	EU	t	\N
1415	72	EU5	t	\N
1416	72	EU5 PLUS	t	\N
1417	72	EU7	t	\N
1418	72	EX3	t	\N
1419	72	EX5	t	\N
1420	72	JEEP 2500	t	\N
1421	72	KENBO 600	t	\N
1422	72	LUBA (XB624)	t	\N
1423	72	RUIXIANG X3	t	\N
1424	72	RUIXIANG X5	t	\N
1425	72	U5	t	\N
1426	72	U5 PLUS	t	\N
1427	72	U7	t	\N
1428	72	X3	t	\N
1429	72	X35	t	\N
1430	72	X5	t	\N
1431	72	X55	t	\N
1432	72	X7	t	\N
1433	72	X75	t	\N
1434	73	QUTE	t	\N
1435	74	BD-1322	t	\N
1436	75	310	t	\N
1437	75	360	t	\N
1438	75	510	t	\N
1439	75	530	t	\N
1440	75	730	t	\N
1441	75	E100	t	\N
1442	75	E200	t	\N
1443	75	E300	t	\N
1444	75	KIWI EV	t	\N
1445	75	RC-5	t	\N
1446	75	RC-6	t	\N
1447	75	RM-5	t	\N
1448	75	RS-3	t	\N
1449	75	RS-5	t	\N
1450	75	RS-7	t	\N
1451	75	VALLI	t	\N
1452	75	XIANGJING	t	\N
1453	75	YEP	t	\N
1454	75	YEP PLUS	t	\N
1455	75	YUNDUO	t	\N
1456	75	YUNHAI	t	\N
1457	76	1989	t	\N
1458	76	2018	t	\N
1459	77	212	t	\N
1460	77	ACE M7	t	\N
1461	77	CALORIE F7	t	\N
1462	77	JIABAO	t	\N
1463	77	M8	t	\N
1464	77	MPV	t	\N
1465	77	PONY (YUANBAO)	t	\N
1466	78	S50	t	\N
1467	78	X50	t	\N
1468	78	X70	t	\N
1469	78	X80	t	\N
1470	79	ARNAGE	t	\N
1471	79	AZURE	t	\N
1472	79	BENTAYGA	t	\N
1473	79	BROOKLANDS	t	\N
1474	79	CONTINENTAL	t	\N
1475	79	CONTINENTAL FLYING SPUR	t	\N
1476	79	CONTINENTAL GT	t	\N
1477	79	EIGHT	t	\N
1478	79	FLYING SPUR	t	\N
1479	79	MARK VI	t	\N
1480	79	MULLINER BACALAR	t	\N
1481	79	MULLINER BATUR	t	\N
1482	79	MULSANNE	t	\N
1483	79	R TYPE	t	\N
1484	79	S	t	\N
1485	79	TURBO R	t	\N
1486	79	T-SERIES	t	\N
1487	80	FREECLIMBER	t	\N
1488	81	B70	t	\N
1489	81	T55	t	\N
1490	81	T77	t	\N
1491	81	T90	t	\N
1492	82	VINTAGE	t	\N
1493	83	EVA-4	t	\N
1494	84	CD	t	\N
1495	84	TYPE 3	t	\N
1496	85	FH-EQ	t	\N
1497	19	02 (E10)	t	\N
1498	19	1 СЕРИИ	t	\N
1499	19	1M	t	\N
1500	19	2 СЕРИИ ACTIVE TOURER	t	\N
1501	19	2 СЕРИИ	t	\N
1502	19	2 СЕРИИ GRAN TOURER	t	\N
1503	19	315	t	\N
1504	19	3200	t	\N
1505	19	321	t	\N
1506	19	326	t	\N
1507	19	327	t	\N
1508	19	340	t	\N
1509	19	3 СЕРИИ	t	\N
1510	19	3/15	t	\N
1511	19	4 СЕРИИ	t	\N
1512	19	501	t	\N
1513	19	502	t	\N
1514	19	503	t	\N
1515	19	507	t	\N
1516	19	5 СЕРИИ	t	\N
1517	19	600	t	\N
1518	19	6 СЕРИИ	t	\N
1519	19	700	t	\N
1520	19	7 СЕРИИ	t	\N
1521	19	8 СЕРИИ	t	\N
1522	19	E3	t	\N
1523	19	E9	t	\N
1524	19	I4	t	\N
1525	19	I5	t	\N
1526	19	I7	t	\N
1527	19	ISETTA	t	\N
1528	19	IX	t	\N
1529	19	IX1	t	\N
1530	19	IX2	t	\N
1531	19	IX3	t	\N
1532	19	IX5	t	\N
1533	19	M2	t	\N
1534	19	M8	t	\N
1535	19	M1	t	\N
1536	19	NAZCA	t	\N
1537	19	NEW CLASS	t	\N
1538	19	X2	t	\N
1539	19	X3 M	t	\N
1540	19	X4 M	t	\N
1541	19	X5 M	t	\N
1542	19	X6 M	t	\N
1543	19	X7	t	\N
1544	19	XM	t	\N
1545	19	Z1	t	\N
1546	19	Z3 M	t	\N
1547	19	Z4 M	t	\N
1548	19	Z8	t	\N
1549	86	2000	t	\N
1550	86	BX5	t	\N
1551	86	HANSA 1100	t	\N
1552	87	7.3S	t	\N
1553	87	CRAWLER	t	\N
1554	87	E V12	t	\N
1555	87	G V12	t	\N
1556	87	ML 63 BITURBO	t	\N
1557	87	M V12	t	\N
1558	87	ROCKET GTS	t	\N
1559	87	SV12	t	\N
1560	88	FRV (BS2)	t	\N
1561	88	H230	t	\N
1562	88	H530	t	\N
1563	88	M1 (BS6)	t	\N
1564	88	M2 (BS4)	t	\N
1565	88	M3 (BC3)	t	\N
1566	88	V3	t	\N
1567	88	V5	t	\N
1568	89	BLENHEIM	t	\N
1569	89	BLENHEIM SPEEDSTER	t	\N
1570	89	FIGHTER	t	\N
1571	90	GENEVA	t	\N
1572	90	LA JOYA	t	\N
1573	91	BOLIDE	t	\N
1574	91	CENTODIECI	t	\N
1575	91	CHIRON	t	\N
1576	91	DIVO	t	\N
1577	91	EB 110	t	\N
1578	91	EB 112	t	\N
1579	91	EB VEYRON 16.4	t	\N
1580	91	F.K.P. HOMMAGE	t	\N
1581	91	TOURBILLON	t	\N
1582	91	TYPE 55	t	\N
1583	91	W16 MISTRAL	t	\N
1584	92	CASCADA	t	\N
1585	92	CENTURY	t	\N
1586	92	ELECTRA	t	\N
1587	92	ELECTRA E4	t	\N
1588	92	ELECTRA E5	t	\N
1589	92	ELECTRA L7	t	\N
1590	92	ENCLAVE	t	\N
1591	92	ENCORE	t	\N
1592	92	ENCORE GX	t	\N
1593	92	ENCORE PLUS	t	\N
1594	92	ENVISION	t	\N
1595	92	ENVISTA	t	\N
1596	92	ESTATE WAGON	t	\N
1597	92	EXCELLE	t	\N
1598	92	GL6	t	\N
1599	92	GL8	t	\N
1600	92	GS	t	\N
1601	92	LACROSSE	t	\N
1602	92	LESABRE	t	\N
1603	92	LIMITED	t	\N
1604	92	LUCERNE	t	\N
1605	92	PARK AVENUE	t	\N
1606	92	RAINIER	t	\N
1607	92	REATTA	t	\N
1608	92	REGAL	t	\N
1609	92	RENDEZVOUS	t	\N
1610	92	RIVIERA	t	\N
1611	92	ROADMASTER	t	\N
1612	92	SKYHAWK	t	\N
1613	92	SKYLARK	t	\N
1614	92	SPECIAL	t	\N
1615	92	SUPER	t	\N
1616	92	TERRAZA	t	\N
1617	92	VELITE 5	t	\N
1618	92	VELITE 6	t	\N
1619	92	VELITE 7	t	\N
1620	92	VERANO	t	\N
1621	92	WILDCAT	t	\N
1622	93	ATTO 2	t	\N
1623	93	CHAZOR	t	\N
1624	93	D1	t	\N
1625	93	DATANG	t	\N
1626	93	DESTROYER 05	t	\N
1627	93	DOLPHIN	t	\N
1628	93	E1	t	\N
1629	93	E2	t	\N
1630	93	E3	t	\N
1631	93	E5	t	\N
1632	93	E6	t	\N
1633	93	E7	t	\N
1634	93	E9	t	\N
1635	93	F0	t	\N
1636	93	F3	t	\N
1637	93	F5	t	\N
1638	93	F6	t	\N
1639	93	F8 (S8)	t	\N
1640	93	FANGCHENGBAO LEOPARD 5	t	\N
1641	93	FANGCHENGBAO LEOPARD 8	t	\N
1642	93	FANGCHENGBAO TITANIUM 3	t	\N
1643	93	FANGCHENGBAO TITANIUM 7	t	\N
1644	93	FLYER	t	\N
1645	93	FRIGATE 07	t	\N
1646	93	G3	t	\N
1647	93	G6	t	\N
1648	93	HAN	t	\N
1649	93	HAN L	t	\N
1650	93	L3	t	\N
1651	93	M6	t	\N
1652	93	QIN	t	\N
1653	93	RACCO	t	\N
1654	93	S6	t	\N
1655	93	SEAGULL	t	\N
1656	93	SEAL	t	\N
1657	93	SEAL 05	t	\N
1658	93	SEAL 06	t	\N
1659	93	SEAL 06 GT	t	\N
1660	93	SEAL 07	t	\N
1661	93	SEA LION 05	t	\N
1662	93	SEA LION 06	t	\N
1663	93	SEA LION 07	t	\N
1664	93	SHARK (SHARK 6)	t	\N
1665	93	SONG	t	\N
1666	93	SONG EV	t	\N
1667	93	SONG L	t	\N
1668	93	SONG MAX	t	\N
1669	93	SONG PLUS	t	\N
1670	93	SONG PRO	t	\N
1671	93	SONG ULTRA	t	\N
1672	93	TANG	t	\N
1673	93	TANG L	t	\N
1674	93	XIA (M9)	t	\N
1675	93	YANGWANG U7	t	\N
1676	93	YANGWANG U8	t	\N
1677	93	YANGWANG U9	t	\N
1678	93	YUAN	t	\N
1679	93	YUAN PLUS	t	\N
1680	93	YUAN UP	t	\N
1681	94	BD132J (COCO)	t	\N
1682	94	BD326J (MOCA)	t	\N
1683	95	ALLANTE	t	\N
1684	95	ATS	t	\N
1685	95	ATS-V	t	\N
1686	95	BLS	t	\N
1687	95	BROUGHAM	t	\N
1688	95	CATERA	t	\N
1689	95	CELESTIQ	t	\N
1690	95	CT4	t	\N
1691	95	CT4-V	t	\N
1692	95	CT5	t	\N
1693	95	CT5-V	t	\N
1694	95	CT6	t	\N
1695	95	CTS	t	\N
1696	95	CTS-V	t	\N
1697	95	DEVILLE	t	\N
1698	95	DTS	t	\N
1699	95	ELDORADO	t	\N
1700	95	ELR	t	\N
1701	95	ESCALADE	t	\N
1702	95	ESCALADE IQ	t	\N
1703	95	ESCALADE-V	t	\N
1704	95	FLEETWOOD	t	\N
1705	95	GT4	t	\N
1706	95	LYRIQ-V	t	\N
1707	95	LSE	t	\N
1708	95	LYRIQ	t	\N
1709	95	MODEL 30	t	\N
1710	95	OPTIQ	t	\N
1711	95	OPTIQ-V	t	\N
1712	95	SERIES 314	t	\N
1713	95	SERIES 341	t	\N
1714	95	SERIES 62	t	\N
1715	95	SEVILLE	t	\N
1716	95	SIXTY SPECIAL	t	\N
1717	95	SRX	t	\N
1718	95	STS	t	\N
1719	95	STS-V	t	\N
1720	95	VISTIQ	t	\N
1721	95	XLR	t	\N
1722	95	XT4	t	\N
1723	95	XT5	t	\N
1724	95	XT6	t	\N
1725	95	XTS	t	\N
1726	96	C12	t	\N
1727	97	FX4	t	\N
1728	98	21	t	\N
1729	98	CSR	t	\N
1730	98	SEVEN	t	\N
1731	99	BENNI	t	\N
1732	99	SC6390	t	\N
1733	99	TAURUSTAR	t	\N
1734	100	QIYUAN A05	t	\N
1735	100	QIYUAN A06	t	\N
1736	100	QIYUAN A07	t	\N
1737	100	ALSVIN	t	\N
1738	100	ALSVIN V7	t	\N
1739	100	AUCHAN A600 EV	t	\N
1740	100	BENBEN E-STAR	t	\N
1741	100	BENNI	t	\N
1742	100	BENNI EC/EV	t	\N
1743	100	CM-8	t	\N
1744	100	CS15	t	\N
1745	100	CS35	t	\N
1746	100	CS35 MAX	t	\N
1747	100	CS35 PLUS	t	\N
1748	100	CS55	t	\N
1749	100	CS55 PLUS	t	\N
1750	100	CS75	t	\N
1751	100	CS75 PLUS	t	\N
1752	100	CS75 PRO	t	\N
1753	100	CS85	t	\N
1754	100	CS95	t	\N
1755	100	CS95 PLUS	t	\N
1756	100	CX20	t	\N
1757	100	OSHAN CX70	t	\N
1758	100	QIYUAN E07	t	\N
1759	100	EADO	t	\N
1760	100	EADO DT	t	\N
1761	100	EADO PLUS	t	\N
1762	100	LANTUOZHE (EXPLORER)	t	\N
1763	100	HUNTER	t	\N
1764	100	QIYUAN HUNTER K50	t	\N
1765	100	HUNTER PLUS	t	\N
1766	100	KAICENE F70	t	\N
1767	100	LAMORE	t	\N
1768	100	LINMAX	t	\N
1769	100	LUMIN	t	\N
1770	100	OUSHAN CHANGXING	t	\N
1771	100	QIYUAN Q05	t	\N
1772	100	QIYUAN Q07	t	\N
1773	100	RAETON	t	\N
1774	100	RAETON CC	t	\N
1775	100	RAETON PLUS	t	\N
1776	100	UNI-K	t	\N
1777	100	UNI-L	t	\N
1778	100	UNI-S (CS55 PLUS)	t	\N
1779	100	UNI-T	t	\N
1780	100	UNI-V	t	\N
1781	100	UNI-Z	t	\N
1782	100	X5 PLUS	t	\N
1783	100	X7 PLUS	t	\N
1784	100	YIDA	t	\N
1785	100	Z-SHINE	t	\N
1786	101	SUV (CS6)	t	\N
1787	101	FLYING	t	\N
1788	101	LIEBAO LEOPARD	t	\N
1789	102	FREEDOM	t	\N
1790	102	IDEAL	t	\N
1791	103	AMULET (A15)	t	\N
1792	103	ARRIZO 6	t	\N
1793	103	ARRIZO 7	t	\N
1794	103	ARRIZO 3	t	\N
1795	103	ARRIZO 5	t	\N
1796	103	ARRIZO 5 GT	t	\N
1797	103	ARRIZO 5 PLUS	t	\N
1798	103	ARRIZO 8	t	\N
1799	103	ARRIZO 8 PRO	t	\N
1800	103	B13	t	\N
1801	103	BONUS (A13)	t	\N
1802	103	BONUS 3 (E3/A19)	t	\N
1803	103	CROSSEASTAR (B14)	t	\N
1804	103	DOMI	t	\N
1805	103	E5	t	\N
1806	103	EQ1	t	\N
1807	103	EQ5	t	\N
1808	103	EQ7	t	\N
1809	103	EXPLORE 06	t	\N
1810	103	FACE	t	\N
1811	103	FORA (A21)	t	\N
1812	103	FULWIN A8	t	\N
1813	103	FULWIN A9L	t	\N
1814	103	FULWIN T10	t	\N
1815	103	FULWIN T11	t	\N
1816	103	FULWIN T6	t	\N
1817	103	FULWIN T8	t	\N
1818	103	FULWIN T9	t	\N
1819	103	FULWIN X3	t	\N
1820	103	INDIS (S18D)	t	\N
1821	103	KARRY	t	\N
1822	103	KIMO (A1)	t	\N
1823	103	M11 (A3)	t	\N
1824	103	OMODA 5	t	\N
1825	103	ORIENTAL SON (B11)	t	\N
1826	103	Q22	t	\N
1827	103	SWEET (QQ)	t	\N
1828	103	QQ3	t	\N
1829	103	QQ6 (S21)	t	\N
1830	103	QQME	t	\N
1831	103	QQ ICE CREAM	t	\N
1832	103	RELY R08	t	\N
1833	103	TIGGO (T11)	t	\N
1834	103	TIGGO 2	t	\N
1835	103	TIGGO 2 PRO	t	\N
1836	103	TIGGO 3	t	\N
1837	103	TIGGO 3X	t	\N
1838	103	TIGGO 3XE	t	\N
1839	103	TIGGO 4	t	\N
1840	103	TIGGO 4 PRO	t	\N
1841	103	TIGGO 5	t	\N
1842	103	TIGGO 5X	t	\N
1843	103	TIGGO 7	t	\N
1844	103	TIGGO 7L	t	\N
1845	103	TIGGO 7 PLUS	t	\N
1846	103	TIGGO 7 PRO	t	\N
1847	103	TIGGO 7 PRO MAX	t	\N
1848	103	TIGGO 7 PRO PLUG-IN HYBRID	t	\N
1849	103	TIGGO 8	t	\N
1850	103	TIGGO 8L	t	\N
1851	103	TIGGO 8 PLUS	t	\N
1852	103	TIGGO 8 PRO	t	\N
1853	103	TIGGO 8 PRO E+	t	\N
1854	103	TIGGO 8 PRO MAX	t	\N
1855	103	TIGGO 8 PRO PLUG-IN HYBRID	t	\N
1856	103	TIGGO 9	t	\N
1857	103	TIGGO E	t	\N
1858	103	VERY (A13)	t	\N
1859	103	WINDCLOUD (A11)	t	\N
1860	104	STERRA ES	t	\N
1861	104	ET5	t	\N
1862	104	ET8	t	\N
1863	104	EX7	t	\N
1864	104	EXLANTIX ES	t	\N
1865	104	EXLANTIX ET	t	\N
1866	104	LX	t	\N
1867	104	RX	t	\N
1868	104	STERRA ET	t	\N
1869	104	TX	t	\N
1870	104	TXL	t	\N
1871	104	VX	t	\N
1872	104	YAOGUANG	t	\N
1873	11	3000-SERIES	t	\N
1874	11	APACHE	t	\N
1875	11	ASTRA	t	\N
1876	11	ASTRO	t	\N
1877	11	AVALANCHE	t	\N
1878	11	BEL AIR	t	\N
1879	11	BERETTA	t	\N
1880	11	BLAZER	t	\N
1881	11	BLAZER EV	t	\N
1882	11	BOLT	t	\N
1883	11	BOLT EUV	t	\N
1884	11	CAPRICE	t	\N
1885	11	CAPTIVA SPORT	t	\N
1886	11	CAVALIER	t	\N
1887	11	CELEBRITY	t	\N
1888	11	CELTA	t	\N
1889	11	CHEVELLE	t	\N
1890	11	CHEVETTE	t	\N
1891	11	CITATION	t	\N
1892	11	C/K	t	\N
1893	11	CLASSIC	t	\N
1894	11	COBALT	t	\N
1895	11	COLORADO	t	\N
1896	11	CORSA	t	\N
1897	11	CORSICA	t	\N
1898	11	CORVAIR	t	\N
1899	11	CRUZE (HR)	t	\N
1900	11	CSV CR8	t	\N
1901	11	C-10	t	\N
1902	11	DAMAS	t	\N
1903	11	DELUXE	t	\N
1904	11	EL CAMINO	t	\N
1905	11	EQUINOX EV	t	\N
1906	11	EXPRESS	t	\N
1907	11	FLEETMASTER	t	\N
1908	11	GROOVE	t	\N
1909	11	IMPALA	t	\N
1910	11	BLAZER K5	t	\N
1911	11	LANOS	t	\N
1912	11	LUMINA APV	t	\N
1913	11	LUV D-MAX	t	\N
1914	11	MASTER	t	\N
1915	11	MENLO	t	\N
1916	11	METRO	t	\N
1917	11	MONZA	t	\N
1918	11	MW	t	\N
1919	11	NEXIA	t	\N
1920	11	NIVA	t	\N
1921	11	NOVA	t	\N
1922	11	OMEGA	t	\N
1923	11	ONIX	t	\N
1924	11	PRIZM	t	\N
1925	11	REZZO	t	\N
1926	11	SAIL	t	\N
1927	11	SEEKER	t	\N
1928	11	SILVERADO	t	\N
1929	11	SONIC	t	\N
1930	11	SPARK EUV	t	\N
1931	11	SPECIAL DELUXE	t	\N
1932	11	SPIN	t	\N
1933	11	SS	t	\N
1934	11	SSR	t	\N
1935	11	STANDARD	t	\N
1936	11	STARCRAFT	t	\N
1937	11	S-10 PICKUP	t	\N
1938	11	TAVERA	t	\N
1939	11	TRACKER	t	\N
1940	11	TRAILBLAZER	t	\N
1941	11	TRANS SPORT	t	\N
1942	11	TRAVERSE	t	\N
1943	11	UPLANDER	t	\N
1944	11	VAN	t	\N
1945	11	VECTRA	t	\N
1946	11	VENTURE	t	\N
1947	11	VIVA	t	\N
1948	11	VOLT	t	\N
1949	11	ZAFIRA	t	\N
1950	28	180	t	\N
1951	28	200	t	\N
1952	28	300	t	\N
1953	28	300C	t	\N
1954	28	300M	t	\N
1955	28	300 LETTER SERIES	t	\N
1956	28	ASPEN	t	\N
1957	28	CIRRUS	t	\N
1958	28	CONCORDE	t	\N
1959	28	CORDOBA	t	\N
1960	28	DAYTONA	t	\N
1961	28	DYNASTY	t	\N
1962	28	ES	t	\N
1963	28	FIFTH AVENUE	t	\N
1964	28	IMPERIAL	t	\N
1965	28	IMPERIAL CROWN	t	\N
1966	28	INTREPID	t	\N
1967	28	LEBARON	t	\N
1968	28	NASSAU	t	\N
1969	28	NEWPORT	t	\N
1970	28	NEW YORKER	t	\N
1971	28	PROWLER	t	\N
1972	28	SARATOGA	t	\N
1973	28	SIX	t	\N
1974	28	TC BY MASERATI	t	\N
1975	28	VIPER	t	\N
1976	28	VISION	t	\N
1977	28	WINDSOR	t	\N
1978	28	YPSILON	t	\N
1979	105	M-NV	t	\N
1980	105	X-NV	t	\N
1981	106	2 CV	t	\N
1982	106	AMI	t	\N
1983	106	AMI EV	t	\N
1984	106	AX	t	\N
1985	106	BASALT	t	\N
1986	106	BERLINGO	t	\N
1987	106	BX	t	\N
1988	106	C1	t	\N
1989	106	C2	t	\N
1990	106	C3	t	\N
1991	106	C3L	t	\N
1992	106	C3 AIRCROSS	t	\N
1993	106	C3 PICASSO	t	\N
1994	106	C3-XR	t	\N
1995	106	C4	t	\N
1996	106	C4 AIRCROSS	t	\N
1997	106	C4 CACTUS	t	\N
1998	106	C4 PICASSO	t	\N
1999	106	C4 SPACETOURER	t	\N
2000	106	C5	t	\N
2001	106	C5 AIRCROSS	t	\N
2002	106	C5 X	t	\N
2003	106	C6	t	\N
2004	106	C8	t	\N
2005	106	CX	t	\N
2006	106	C-CROSSER	t	\N
2007	106	C-ELYSEE	t	\N
2008	106	C-QUATRE	t	\N
2009	106	C-TRIOMPHE	t	\N
2010	106	C-ZERO	t	\N
2011	106	DS	t	\N
2012	106	DS3	t	\N
2013	106	DS4	t	\N
2014	106	DS5	t	\N
2015	106	DYANE	t	\N
2016	106	EVASION	t	\N
2017	106	E-MEHARI	t	\N
2018	106	GS	t	\N
2019	106	JUMPY	t	\N
2020	106	LN	t	\N
2021	106	NEMO	t	\N
2022	106	SAXO	t	\N
2023	106	SM	t	\N
2024	106	SPACETOURER	t	\N
2025	106	TRACTION AVANT	t	\N
2026	106	VISA	t	\N
2027	106	XANTIA	t	\N
2028	106	XM	t	\N
2029	106	XSARA	t	\N
2030	106	XSARA PICASSO	t	\N
2031	106	ZX	t	\N
2032	107	V16T	t	\N
2033	108	EV	t	\N
2034	109	T REX	t	\N
2035	110	L-29	t	\N
2036	111	SHOWJET	t	\N
2037	112	ATECA	t	\N
2038	112	BORN	t	\N
2039	112	FORMENTOR	t	\N
2040	112	LEON	t	\N
2041	112	TAVASCAN	t	\N
2042	112	TERRAMAR	t	\N
2043	6	1300	t	\N
2044	6	1310	t	\N
2045	6	1410	t	\N
2046	6	BIGSTER	t	\N
2047	6	JOGGER	t	\N
2048	6	NOVA	t	\N
2049	6	PICK-UP	t	\N
2050	6	SPRING	t	\N
2051	6	SUPERNOVA	t	\N
2052	113	CITY LEADING	t	\N
2053	113	SHUTTLE	t	\N
2054	113	SMOOTHING	t	\N
2055	36	ALPHEON	t	\N
2056	36	ARCADIA	t	\N
2057	36	CHAIRMAN	t	\N
2058	36	DAMAS	t	\N
2059	36	EVANDA	t	\N
2060	36	G2X	t	\N
2061	36	GENTRA	t	\N
2062	36	KORANDO	t	\N
2063	36	LACETTI PREMIERE	t	\N
2064	36	LEMANS	t	\N
2065	36	MAGNUS	t	\N
2066	36	MATIZ CREATIVE	t	\N
2067	36	MUSSO	t	\N
2068	36	PRINCE	t	\N
2069	36	REZZO	t	\N
2070	36	ROYALE	t	\N
2071	36	SENS	t	\N
2072	36	TOSCA	t	\N
2073	36	WINSTORM	t	\N
2074	114	ALTIS	t	\N
2075	114	APPLAUSE	t	\N
2076	114	ATRAI	t	\N
2077	114	BEE	t	\N
2078	114	BE-GO	t	\N
2079	114	BOON	t	\N
2080	114	BOON LUMINAS	t	\N
2081	114	CAST	t	\N
2082	114	CERIA	t	\N
2083	114	CHARADE	t	\N
2084	114	CHARMANT	t	\N
2085	114	COO	t	\N
2086	114	COPEN	t	\N
2087	114	CUORE	t	\N
2088	114	DELTA WAGON	t	\N
2089	114	ESSE	t	\N
2090	114	EXTOL	t	\N
2091	114	FELLOW	t	\N
2092	114	FEROZA	t	\N
2093	114	GRAN MOVE	t	\N
2094	114	HIJET	t	\N
2095	114	HIJET CADDIE	t	\N
2096	114	LEEZA	t	\N
2097	114	MATERIA	t	\N
2098	114	MAX	t	\N
2099	114	MEBIUS	t	\N
2100	114	MIDGET	t	\N
2101	114	MIRA	t	\N
2102	114	MIRA COCOA	t	\N
2103	114	MIRA E:S	t	\N
2104	114	MIRA GINO	t	\N
2105	114	MIRA TOCOT	t	\N
2106	114	MOVE	t	\N
2107	114	MOVE CANBUS	t	\N
2108	114	MOVE CONTE	t	\N
2109	114	MOVE LATTE	t	\N
2110	114	NAKED	t	\N
2111	114	OPTI	t	\N
2112	114	PYZAR	t	\N
2113	114	ROCKY	t	\N
2114	114	RUGGER	t	\N
2115	114	SIRION	t	\N
2116	114	SONICA	t	\N
2117	114	STORIA	t	\N
2118	114	TAFT	t	\N
2119	114	TANTO	t	\N
2120	114	TANTO EXE	t	\N
2121	114	TERIOS	t	\N
2122	114	THOR	t	\N
2123	114	TREVIS	t	\N
2124	114	WAKE	t	\N
2125	114	WILDCAT	t	\N
2126	114	XENIA	t	\N
2127	114	YRV	t	\N
2128	115	DS420	t	\N
2129	115	REGENCY	t	\N
2130	115	SOVEREIGN (XJ6)	t	\N
2131	115	SP250	t	\N
2132	115	XJ40	t	\N
2133	115	XJS	t	\N
2134	115	X300	t	\N
2135	115	X308	t	\N
2136	115	X350	t	\N
2137	116	STRADALE	t	\N
2138	117	200/220/260/280C	t	\N
2139	117	240Z	t	\N
2140	117	280Z	t	\N
2141	117	280ZX	t	\N
2142	117	620	t	\N
2143	117	720	t	\N
2144	117	BLUEBIRD	t	\N
2145	117	CHERRY	t	\N
2146	117	GO	t	\N
2147	117	GO+	t	\N
2148	117	LAUREL	t	\N
2149	117	MI-DO	t	\N
2150	117	ON-DO	t	\N
2151	117	STANZA	t	\N
2152	117	SUNNY	t	\N
2153	117	URVAN	t	\N
2154	117	VIOLET	t	\N
2155	118	PICKUP	t	\N
2156	118	YUANZHI M1	t	\N
2157	118	YUEHU	t	\N
2158	119	ZEPHYR	t	\N
2159	120	G318	t	\N
2160	120	L06	t	\N
2161	120	L07	t	\N
2162	120	S05	t	\N
2163	120	S07 (S7)	t	\N
2164	120	S09	t	\N
2165	120	SL03	t	\N
2166	121	D12	t	\N
2167	121	D6	t	\N
2168	121	DI	t	\N
2169	122	DMC-12	t	\N
2170	123	500	t	\N
2171	123	D9	t	\N
2172	123	N7	t	\N
2173	123	N8	t	\N
2174	123	N8L	t	\N
2175	123	N9	t	\N
2176	123	X	t	\N
2177	123	Z9	t	\N
2178	124	ANTELOPE	t	\N
2179	124	AURORA	t	\N
2180	124	COWBOY	t	\N
2181	124	LAND CROWN	t	\N
2182	124	PLUTUS	t	\N
2183	124	SALADIN	t	\N
2184	124	SHUTTLE	t	\N
2185	125	CUSTOM	t	\N
2186	125	DELUXE	t	\N
2187	125	FIREDOME	t	\N
2188	125	FIREFLITE	t	\N
2189	126	BIGUA	t	\N
2190	126	GUARA	t	\N
2191	126	LONGCHAMP	t	\N
2192	126	MANGUSTA	t	\N
2193	126	PANTERA	t	\N
2194	126	VALLELUNGA	t	\N
2195	127	3=6	t	\N
2196	27	600	t	\N
2197	27	ARIES	t	\N
2198	27	CARAVAN	t	\N
2199	27	CHARGER DAYTONA	t	\N
2200	27	COLT	t	\N
2201	27	CORONET	t	\N
2202	27	CUSTOM ROYAL	t	\N
2203	27	D8	t	\N
2204	27	DAKOTA	t	\N
2205	27	DART	t	\N
2206	27	DAYTONA	t	\N
2207	27	DIPLOMAT	t	\N
2208	27	DURANGO	t	\N
2209	27	D/W SERIES	t	\N
2210	27	DYNASTY	t	\N
2211	27	HORNET	t	\N
2212	27	INTREPID	t	\N
2213	27	LANCER	t	\N
2214	27	MAYFAIR	t	\N
2215	27	MONACO	t	\N
2216	27	NEON	t	\N
2217	27	OMNI	t	\N
2218	27	POLARA	t	\N
2219	27	RAIDER	t	\N
2220	27	RAMCHARGER	t	\N
2221	27	RAM VAN	t	\N
2222	27	SHADOW	t	\N
2223	27	SPIRIT	t	\N
2224	27	STRATUS	t	\N
2225	27	SUPER BEE	t	\N
2226	27	WC SERIES	t	\N
2227	128	370	t	\N
2228	128	580	t	\N
2229	128	A30	t	\N
2230	128	A9	t	\N
2231	128	AEOLUS E70	t	\N
2232	128	AEOLUS HAOHAN	t	\N
2233	128	AEOLUS HAOJI	t	\N
2234	128	AEOLUS L7	t	\N
2235	128	AEOLUS L8	t	\N
2236	128	AEOLUS YIXUAN	t	\N
2237	128	AEOLUS YIXUAN MAX	t	\N
2238	128	AX4	t	\N
2239	128	AX7	t	\N
2240	128	BOX	t	\N
2241	128	C36	t	\N
2242	128	DF6	t	\N
2243	128	DFSK 500	t	\N
2244	128	DFSK IX5	t	\N
2245	128	DFSK IX7	t	\N
2246	128	E11K	t	\N
2247	128	EC36	t	\N
2248	128	FENGON 500	t	\N
2249	128	FENGON 560	t	\N
2250	128	FENGON E5	t	\N
2251	128	FENGON IX5	t	\N
2252	128	FENGON IX7	t	\N
2253	128	FUKANG ES600	t	\N
2254	128	H30 CROSS	t	\N
2255	128	HUGE	t	\N
2256	128	MAGE	t	\N
2257	128	MENGSHI M-HERO 800	t	\N
2258	128	MENGSHI M-HERO 817	t	\N
2259	128	MENGSHI M-HERO 917	t	\N
2260	128	MPV	t	\N
2261	128	NAMMI 01	t	\N
2262	128	NAMMI 06	t	\N
2263	128	NANO EX1	t	\N
2264	128	OTING	t	\N
2265	128	PALADIN	t	\N
2266	128	RICH	t	\N
2267	128	RICH 7	t	\N
2268	128	S30	t	\N
2269	128	SHINE	t	\N
2270	128	SHINE GS	t	\N
2271	128	SHINE MAX	t	\N
2272	128	SKY EV01	t	\N
2273	128	AEOLUS YIXUAN GS	t	\N
2274	128	Z9	t	\N
2275	129	ASSOL	t	\N
2276	129	KONDOR	t	\N
2277	129	ORION	t	\N
2278	129	ORION M	t	\N
2279	130	D8	t	\N
2280	130	D8 COSWORTH	t	\N
2281	130	D8 GT	t	\N
2282	130	D8 GTO	t	\N
2283	130	D8 ZETEC	t	\N
2284	130	F22	t	\N
2285	130	P24 RS	t	\N
2286	131	1.0	t	\N
2287	131	3.0	t	\N
2288	131	5.0	t	\N
2289	131	6.0	t	\N
2290	131	7.0	t	\N
2291	131	PK8	t	\N
2292	132	3	t	\N
2293	132	3 CROSSBACK	t	\N
2294	132	4	t	\N
2295	132	5	t	\N
2296	132	7 CROSSBACK	t	\N
2297	132	9	t	\N
2298	132	NO4	t	\N
2299	132	NO8	t	\N
2300	133	H3	t	\N
2301	133	H5	t	\N
2302	134	PREMIER	t	\N
2303	134	SUMMIT	t	\N
2304	134	TALON	t	\N
2305	134	VISION	t	\N
2306	134	VISTA	t	\N
2307	135	SS	t	\N
2308	136	ME5	t	\N
2309	136	ME7	t	\N
2310	137	CITY (M2)	t	\N
2311	138	VE-1	t	\N
2312	139	I-JET	t	\N
2313	139	I-JOY	t	\N
2314	139	I-PRO	t	\N
2315	139	I-SKY	t	\N
2316	139	I-SPACE	t	\N
2317	139	I-VAN	t	\N
2318	140	SERIES IV	t	\N
2319	140	SERIES V	t	\N
2320	141	GD04B	t	\N
2321	142	Ё-КРОССОВЕР	t	\N
2322	143	FV	t	\N
2323	144	BESTUNE B70	t	\N
2324	144	BESTUNE B70S	t	\N
2325	144	BESTUNE M9	t	\N
2326	144	BESTUNE NAT	t	\N
2327	144	BESTUNE PONY	t	\N
2328	144	BESTUNE T33	t	\N
2329	144	BESTUNE T55	t	\N
2330	144	BESTUNE T77	t	\N
2331	144	BESTUNE T90	t	\N
2332	144	BESTUNE T99	t	\N
2333	144	BESTUNE YUEYI 03	t	\N
2334	144	BESTUNE YUEYI 07	t	\N
2335	144	BESTURN B30	t	\N
2336	144	BESTURN B50	t	\N
2337	144	BESTURN B70	t	\N
2338	144	BESTURN X40	t	\N
2339	144	CA6420	t	\N
2340	144	D60	t	\N
2341	144	JINN	t	\N
2342	144	OLEY	t	\N
2343	144	V2	t	\N
2344	144	V5	t	\N
2345	144	VITA	t	\N
2346	144	BESTURN X80	t	\N
2347	145	12CILINDRI	t	\N
2348	145	208/308	t	\N
2349	145	250 GTO	t	\N
2350	145	250 GT BERLINETTA	t	\N
2351	145	288 GTO	t	\N
2352	145	296	t	\N
2353	145	328	t	\N
2354	145	348	t	\N
2355	145	360	t	\N
2356	145	365 GTC	t	\N
2357	145	400	t	\N
2358	145	412	t	\N
2359	145	456	t	\N
2360	145	458	t	\N
2361	145	488	t	\N
2362	145	512 M	t	\N
2363	145	512 BB	t	\N
2364	145	512 TR	t	\N
2365	145	550	t	\N
2366	145	575M	t	\N
2367	145	599	t	\N
2368	145	612	t	\N
2369	145	812	t	\N
2370	145	849 TESTAROSSA	t	\N
2371	145	AMALFI	t	\N
2372	145	CALIFORNIA	t	\N
2373	145	DAYTONA SP3	t	\N
2374	145	DINO 206 GT	t	\N
2375	145	DINO 208/308 GT4	t	\N
2376	145	DINO 246 GT	t	\N
2377	145	ENZO	t	\N
2378	145	F12	t	\N
2379	145	F355	t	\N
2380	145	F40	t	\N
2381	145	F430	t	\N
2382	145	F50	t	\N
2383	145	F80	t	\N
2384	145	F8	t	\N
2385	145	FF	t	\N
2386	145	FXX K	t	\N
2387	145	GTC4LUSSO	t	\N
2388	145	LAFERRARI	t	\N
2389	145	MONDIAL	t	\N
2390	145	MONZA SP	t	\N
2391	145	PORTOFINO	t	\N
2392	145	PUROSANGUE	t	\N
2393	145	ROMA	t	\N
2394	145	SC40	t	\N
2395	145	SF90	t	\N
2396	145	TESTAROSSA	t	\N
2397	37	124	t	\N
2398	37	124 SPIDER	t	\N
2399	37	124 SPORT SPIDER	t	\N
2400	37	125	t	\N
2401	37	127	t	\N
2402	37	128	t	\N
2403	37	130	t	\N
2404	37	131	t	\N
2405	37	132	t	\N
2406	37	1500	t	\N
2407	37	2300	t	\N
2408	37	238	t	\N
2409	37	508	t	\N
2410	37	600	t	\N
2411	37	600E	t	\N
2412	37	900T	t	\N
2413	37	ALBEA	t	\N
2414	37	ARGENTA	t	\N
2415	37	BRAVO	t	\N
2416	37	COUPE	t	\N
2417	37	DUNA	t	\N
2418	37	EGEA	t	\N
2419	37	FASTBACK	t	\N
2420	37	FIORINO	t	\N
2421	37	FULLBACK	t	\N
2422	37	GRANDE PANDA	t	\N
2423	37	PALIO	t	\N
2424	37	PULSE	t	\N
2425	37	REGATA	t	\N
2426	37	RITMO	t	\N
2427	37	SIENA	t	\N
2428	37	TEMPRA	t	\N
2429	37	TOPOLINO	t	\N
2430	37	X 1/9	t	\N
2431	146	KARMA	t	\N
2432	146	OCEAN	t	\N
2433	147	F	t	\N
2434	29	300	t	\N
2435	29	ANGLIA	t	\N
2436	29	ASPIRE	t	\N
2437	29	BRONCO	t	\N
2438	29	BRONCO BASECAMP	t	\N
2439	29	BRONCO-II	t	\N
2440	29	BRONCO SPORT	t	\N
2441	29	CAPRI	t	\N
2442	29	CONSUL	t	\N
2443	29	CONTOUR	t	\N
2444	29	COUNTRY SQUIRE	t	\N
2445	29	CRESTLINE	t	\N
2446	29	CROWN VICTORIA	t	\N
2447	29	CUSTOM	t	\N
2448	29	ECONOLINE	t	\N
2449	29	ECONOVAN	t	\N
2450	29	ECOSPORT	t	\N
2451	29	EQUATOR	t	\N
2452	29	EQUATOR SPORT	t	\N
2453	29	ESCAPE	t	\N
2454	29	ESCORT (NORTH AMERICA)	t	\N
2455	29	EVEREST	t	\N
2456	29	EVOS	t	\N
2457	29	EXCURSION	t	\N
2458	29	EXPEDITION	t	\N
2459	29	EXPLORER EV	t	\N
2460	29	EXPLORER SPORT TRAC	t	\N
2461	29	FAIRLANE	t	\N
2462	29	FAIRMONT	t	\N
2463	29	FALCON	t	\N
2464	29	FESTIVA	t	\N
2465	29	FIESTA ST	t	\N
2466	29	FIGO	t	\N
2467	29	FIVE HUNDRED	t	\N
2468	29	FLEX	t	\N
2469	29	FOCUS RS	t	\N
2470	29	FOCUS ST	t	\N
2471	29	FREDA	t	\N
2472	29	FREESTAR	t	\N
2473	29	FREESTYLE	t	\N
2474	29	FUSION (NORTH AMERICA)	t	\N
2475	29	F-100	t	\N
2476	29	F-2	t	\N
2477	29	GALAXIE	t	\N
2478	29	GPA	t	\N
2479	29	GRANADA	t	\N
2480	29	GRANADA (NORTH AMERICA)	t	\N
2481	29	GT	t	\N
2482	29	GT40	t	\N
2483	29	IKON	t	\N
2484	29	IXION	t	\N
2485	29	LASER	t	\N
2486	29	LTD	t	\N
2487	29	LTD COUNTRY SQUIRE	t	\N
2488	29	LTD CROWN VICTORIA	t	\N
2489	29	M151	t	\N
2490	29	MAINLINE	t	\N
2491	29	MODEL A	t	\N
2492	29	MODEL T	t	\N
2493	29	MONDEO ST	t	\N
2494	29	MUSTANG MACH-E	t	\N
2495	29	PROBE	t	\N
2496	29	PUMA ST	t	\N
2497	29	RANCHERO	t	\N
2498	29	RANGER (NORTH AMERICA)	t	\N
2499	29	SCORPIO	t	\N
2500	29	SPECTRON	t	\N
2501	29	TAUNUS	t	\N
2502	29	TAURUS	t	\N
2503	29	TAURUS X	t	\N
2504	29	TELSTAR	t	\N
2505	29	TEMPO	t	\N
2506	29	TERRITORY	t	\N
2507	29	THUNDERBIRD	t	\N
2508	29	TORINO	t	\N
2509	29	TOURNEO COURIER	t	\N
2510	29	TRANSIT CONNECT	t	\N
2511	29	V8	t	\N
2512	29	ZEPHYR	t	\N
2513	148	CM7	t	\N
2514	148	FRIDAY	t	\N
2515	148	LINGZHI M5	t	\N
2516	148	LINGZHI PLUS	t	\N
2517	148	M7	t	\N
2518	148	T5	t	\N
2519	148	T5L	t	\N
2520	148	T5 EVO	t	\N
2521	148	THUNDER	t	\N
2522	148	U-TOUR M4	t	\N
2523	148	V9	t	\N
2524	148	XINGHAI S7	t	\N
2525	148	YACHT	t	\N
2526	149	CONQUEROR 5	t	\N
2527	149	MARS 7	t	\N
2528	149	MARS 9	t	\N
2529	149	MIDI	t	\N
2530	149	SAUVANA	t	\N
2531	149	TUNLAND	t	\N
2532	149	TUNLAND G7	t	\N
2533	149	TUNLAND G9	t	\N
2534	149	TUNLAND V7	t	\N
2535	149	TUNLAND V9	t	\N
2536	150	SERIES 15	t	\N
2537	151	125P	t	\N
2538	151	126P	t	\N
2539	151	127P	t	\N
2540	151	132P	t	\N
2541	151	LANOS	t	\N
2542	151	POLONEZ	t	\N
2543	151	WARSZAWA	t	\N
2544	152	TARPAN	t	\N
2545	153	6500 (LAND KING)	t	\N
2546	154	EMPOW	t	\N
2547	154	GN8	t	\N
2548	154	GS3	t	\N
2549	154	GS4	t	\N
2550	154	GS5	t	\N
2551	154	GS8	t	\N
2552	154	IA5	t	\N
2553	154	M8	t	\N
2554	154	S7	t	\N
2555	155	12 ЗИМ	t	\N
2556	155	13 «ЧАЙКА»	t	\N
2557	155	14 «ЧАЙКА»	t	\N
2558	155	18	t	\N
2559	155	21 «ВОЛГА»	t	\N
2560	155	22 «ВОЛГА»	t	\N
2561	155	2308 «АТАМАН»	t	\N
2562	155	2330 «ТИГР»	t	\N
2563	155	24 «ВОЛГА»	t	\N
2564	155	25	t	\N
2565	155	3102 «ВОЛГА»	t	\N
2566	155	31022 «ВОЛГА»	t	\N
2567	155	310221 «ВОЛГА»	t	\N
2568	155	31029 «ВОЛГА»	t	\N
2569	155	3103 «ВОЛГА»	t	\N
2570	155	3105 «ВОЛГА»	t	\N
2571	155	3110 «ВОЛГА»	t	\N
2572	155	31105 «ВОЛГА»	t	\N
2573	155	3111 «ВОЛГА»	t	\N
2574	155	46	t	\N
2575	155	61	t	\N
2576	155	64	t	\N
2577	155	ГАЗ 67	t	\N
2578	155	69	t	\N
2579	155	А	t	\N
2580	155	М1	t	\N
2581	155	М-20 «ПОБЕДА»	t	\N
2582	155	М-72	t	\N
2583	155	VOLGA SIBER	t	\N
2584	156	ATLAS	t	\N
2585	156	ATLAS PRO	t	\N
2586	156	AZKARRA	t	\N
2587	156	BEAUTY LEOPARD	t	\N
2588	156	BINRUI	t	\N
2589	156	BINRUI COOL	t	\N
2590	156	BINYUE	t	\N
2591	156	BINYUE COOL	t	\N
2592	156	BINYUE L	t	\N
2593	156	BOYUE	t	\N
2594	156	BOYUE COOL	t	\N
2595	156	BOYUE L	t	\N
2596	156	BOYUE PRO	t	\N
2597	156	BOYUE REV	t	\N
2598	156	CITYRAY	t	\N
2599	156	CK (OTAKA)	t	\N
2600	156	COOLRAY	t	\N
2601	156	COWBOY	t	\N
2602	156	EMGRAND	t	\N
2603	156	EMGRAND 7	t	\N
2604	156	EMGRAND EC8	t	\N
2605	156	EMGRAND EC7	t	\N
2606	156	EMGRAND GL	t	\N
2607	156	EMGRAND GT	t	\N
2608	156	EMGRAND L	t	\N
2609	156	EMGRAND S	t	\N
2610	156	EMGRAND X7	t	\N
2611	156	EX2	t	\N
2612	156	EX5	t	\N
2613	156	EX5 EM-I	t	\N
2614	156	GALAXY A7	t	\N
2615	156	GALAXY E5	t	\N
2616	156	GALAXY E8	t	\N
2617	156	GALAXY L6	t	\N
2618	156	GALAXY L7	t	\N
2619	156	GALAXY LEVC L380	t	\N
2620	156	GALAXY M9	t	\N
2621	156	GALAXY STARSHINE 6	t	\N
2622	156	GALAXY STARSHINE 8	t	\N
2623	156	GALAXY STARSHIP 7	t	\N
2624	156	GALAXY V900	t	\N
2625	156	GC5	t	\N
2626	156	GC6	t	\N
2627	156	GC7	t	\N
2628	156	GC9	t	\N
2629	156	GEOMETRY A	t	\N
2630	156	GEOMETRY C	t	\N
2631	156	GEOMETRY E	t	\N
2632	156	GEOMETRY G6	t	\N
2633	156	GEOMETRY M6	t	\N
2634	156	GEOME XINGYUAN	t	\N
2635	156	GS	t	\N
2636	156	GX3 PRO	t	\N
2637	156	HAOQING	t	\N
2638	156	HAOYUE	t	\N
2639	156	HAOYUE L	t	\N
2640	156	HAOYUE PRO	t	\N
2641	156	FARIZON HAPPINESS	t	\N
2642	156	ICON	t	\N
2643	156	JIAJI	t	\N
2644	156	KANDI EX3	t	\N
2645	156	LC (PANDA)	t	\N
2646	156	LC (PANDA) CROSS	t	\N
2647	156	MK	t	\N
2648	156	MK CROSS	t	\N
2649	156	MONJARO	t	\N
2650	156	MR	t	\N
2651	156	OKAVANGO	t	\N
2652	156	PANDA	t	\N
2653	156	PREFACE	t	\N
2654	156	RADAR KING KONG	t	\N
2655	156	SC7	t	\N
2656	156	TUGELLA	t	\N
2657	156	TX4	t	\N
2658	156	FC (VISION)	t	\N
2659	156	VISION S1	t	\N
2660	156	VISION X3	t	\N
2661	156	VISION X3 PRO	t	\N
2662	156	VISION X6	t	\N
2663	156	VISION X6 PRO	t	\N
2664	156	XINGYUE	t	\N
2665	156	XINGYUE L	t	\N
2666	156	FARIZON FX	t	\N
2667	157	G70	t	\N
2668	157	G80	t	\N
2669	157	G90	t	\N
2670	157	GV60	t	\N
2671	157	GV70	t	\N
2672	157	GV80	t	\N
2673	157	GV80 COUPE	t	\N
2674	158	METRO	t	\N
2675	158	PRIZM	t	\N
2676	158	SPECTRUM	t	\N
2677	158	STORM	t	\N
2678	158	TRACKER	t	\N
2679	159	T.33	t	\N
2680	159	T.50	t	\N
2681	160	100	t	\N
2682	160	ACADIA	t	\N
2683	160	CANYON	t	\N
2684	160	C/K	t	\N
2685	160	ENVOY	t	\N
2686	160	HUMMER EV	t	\N
2687	160	JIMMY	t	\N
2688	160	SAFARI	t	\N
2689	160	SAVANA	t	\N
2690	160	SIERRA	t	\N
2691	160	SONOMA	t	\N
2692	160	SUBURBAN	t	\N
2693	160	SYCLONE	t	\N
2694	160	TERRAIN	t	\N
2695	160	TYPHOON	t	\N
2696	160	VANDURA	t	\N
2697	160	YUKON	t	\N
2698	161	T	t	\N
2699	161	TS	t	\N
2700	162	AOOSED G5	t	\N
2701	162	GX6	t	\N
2702	162	TROY	t	\N
2703	163	ROADSTER	t	\N
2704	164	MADISON	t	\N
2705	165	COOLBEAR	t	\N
2706	165	COWRY (V80)	t	\N
2707	165	DEER	t	\N
2708	165	FLORID	t	\N
2709	165	HOVER H3	t	\N
2710	165	HOVER H5	t	\N
2711	165	HOVER H6	t	\N
2712	165	HOVER	t	\N
2713	165	HOVER M1 (PERI 4X4)	t	\N
2714	165	HOVER M2	t	\N
2715	165	HOVER M4	t	\N
2716	165	HOVER PI	t	\N
2717	165	PEGASUS	t	\N
2718	165	PERI	t	\N
2719	165	POER	t	\N
2720	165	POER KING KONG	t	\N
2721	165	SAFE	t	\N
2722	165	SAILOR	t	\N
2723	165	SHANHAI POER	t	\N
2724	165	SING RUV	t	\N
2725	165	SOCOOL	t	\N
2726	165	VOLEEX C10 (PHENOM)	t	\N
2727	165	VOLEEX C30	t	\N
2728	165	VOLEEX C50	t	\N
2729	165	WINGLE 7	t	\N
2730	165	WINGLE	t	\N
2731	166	BRIO	t	\N
2732	166	MINYI	t	\N
2733	166	PRINCIP	t	\N
2734	166	SAIBAO	t	\N
2735	166	SIGMA	t	\N
2736	166	SIMBO	t	\N
2737	167	2	t	\N
2738	167	3	t	\N
2739	167	6P	t	\N
2740	167	7	t	\N
2741	167	7X	t	\N
2742	167	8S	t	\N
2743	167	AISHANG EV	t	\N
2744	167	E3	t	\N
2745	167	FAMILY	t	\N
2746	167	FAMILY F7	t	\N
2747	167	FREEMA	t	\N
2748	167	M3	t	\N
2749	167	S5	t	\N
2750	167	S5 YOUNG	t	\N
2751	168	REKORD	t	\N
2752	168	TYP 13	t	\N
2753	169	X7	t	\N
2754	170	CHITU	t	\N
2755	170	DAGOU (BIG DOG)	t	\N
2756	170	DARGO	t	\N
2757	170	F5	t	\N
2758	170	F7	t	\N
2759	170	F7X	t	\N
2760	170	H1	t	\N
2761	170	H2	t	\N
2762	170	H2S	t	\N
2763	170	H3	t	\N
2764	170	H4	t	\N
2765	170	H5	t	\N
2766	170	H6	t	\N
2767	170	H6L	t	\N
2768	170	H6S	t	\N
2769	170	H6 COUPE	t	\N
2770	170	H7	t	\N
2771	170	H8	t	\N
2772	170	H9	t	\N
2773	170	JOLION	t	\N
2774	170	KUGOU	t	\N
2775	170	M6	t	\N
2776	170	MENGLONG (RAPTOR)	t	\N
2777	170	SHENSHOU	t	\N
2778	170	XIAOLONG	t	\N
2779	170	XIAOLONG MAX	t	\N
2780	171	BOLIGER	t	\N
2781	171	B21	t	\N
2782	171	LAVILLE	t	\N
2783	172	06	t	\N
2784	173	TYP 154	t	\N
2785	174	VENOM F5	t	\N
2786	174	VENOM GT	t	\N
2787	175	AMBASSADOR	t	\N
2788	175	CONTESSA	t	\N
2789	176	X	t	\N
2790	176	Y	t	\N
2791	176	Z	t	\N
2792	177	K6	t	\N
2793	178	APOLLO	t	\N
2794	178	ASTRA	t	\N
2795	178	BARINA	t	\N
2796	178	CALAIS	t	\N
2797	178	CAPRICE	t	\N
2798	178	COMMODORE	t	\N
2799	178	CRUZE	t	\N
2800	178	FRONTERA	t	\N
2801	178	JACKAROO	t	\N
2802	178	MONARO	t	\N
2803	178	RODEO	t	\N
2804	178	STATESMAN	t	\N
2805	178	UTE	t	\N
2806	178	VECTRA	t	\N
2807	178	ZAFIRA	t	\N
2808	13	145	t	\N
2809	13	ACTY	t	\N
2810	13	AIRWAVE	t	\N
2811	13	ASCOT	t	\N
2812	13	ASCOT INNOVA	t	\N
2813	13	AVANCIER	t	\N
2814	13	BALLADE	t	\N
2815	13	BEAT	t	\N
2816	13	BREEZE	t	\N
2817	13	BRIO	t	\N
2818	13	CAPA	t	\N
2819	13	CIVIC FERIO	t	\N
2820	13	CONCERTO	t	\N
2821	13	CRIDER	t	\N
2822	13	CROSSROAD	t	\N
2823	13	CROSSTOUR	t	\N
2824	13	DOMANI	t	\N
2825	13	E	t	\N
2826	13	EDIX	t	\N
2827	13	ELEMENT	t	\N
2828	13	ELEVATE	t	\N
2829	13	ELYSION	t	\N
2830	13	ENVIX	t	\N
2831	13	E:NP1	t	\N
2832	13	E:NP2	t	\N
2833	13	E:NS1	t	\N
2834	13	E:NS2	t	\N
2835	13	E:NY1	t	\N
2836	13	CLARITY	t	\N
2837	13	FIT	t	\N
2838	13	FIT ARIA	t	\N
2839	13	FIT SHUTTLE	t	\N
2840	13	FREED	t	\N
2841	13	GRACE	t	\N
2842	13	HORIZON	t	\N
2843	13	INSPIRE	t	\N
2844	13	INTEGRA SJ	t	\N
2845	13	JADE	t	\N
2846	13	LAGREAT	t	\N
2847	13	LIFE	t	\N
2848	13	LOGO	t	\N
2849	13	MDX	t	\N
2850	13	MOBILIO	t	\N
2851	13	MOBILIO SPIKE	t	\N
2852	13	N360	t	\N
2853	13	NSX	t	\N
2854	13	N-BOX	t	\N
2855	13	N-BOX+	t	\N
2856	13	N-BOX SLASH	t	\N
2857	13	N-ONE	t	\N
2858	13	N-VAN	t	\N
2859	13	N-WGN	t	\N
2860	13	ODYSSEY	t	\N
2861	13	ODYSSEY (NORTH AMERICA)	t	\N
2862	13	ORTHIA	t	\N
2863	13	PARTNER	t	\N
2864	13	PASSPORT	t	\N
2865	13	PILOT	t	\N
2866	13	PROLOGUE	t	\N
2867	13	QUINT	t	\N
2868	13	RAFAGA	t	\N
2869	13	RIDGELINE	t	\N
2870	13	S2000	t	\N
2871	13	S500	t	\N
2872	13	S600	t	\N
2873	13	S660	t	\N
2874	13	SABER	t	\N
2875	13	SHUTTLE	t	\N
2876	13	STEPWGN	t	\N
2877	13	STREAM	t	\N
2878	13	STREET	t	\N
2879	13	SUPER-ONE	t	\N
2880	13	S-MX	t	\N
2881	13	THAT'S	t	\N
2882	13	TODAY	t	\N
2883	13	TORNEO	t	\N
2884	13	UR-V	t	\N
2885	13	VAMOS	t	\N
2886	13	VEZEL	t	\N
2887	13	VIGOR	t	\N
2888	13	WR-V	t	\N
2889	13	XR-V	t	\N
2890	13	YE P7	t	\N
2891	13	YE S7	t	\N
2892	13	Z	t	\N
2893	13	ZEST	t	\N
2894	13	ZR-V	t	\N
2895	179	EH7	t	\N
2896	179	E-HS3	t	\N
2897	179	E-HS7	t	\N
2898	179	E-HS9	t	\N
2899	179	E-QM5	t	\N
2900	179	H5	t	\N
2901	179	H6	t	\N
2902	179	H7	t	\N
2903	179	H9	t	\N
2904	179	HQ9	t	\N
2905	179	HS3	t	\N
2906	179	HS5	t	\N
2907	179	HS6	t	\N
2908	179	HS7	t	\N
2909	179	L1 (GUOYA)	t	\N
2910	179	L5	t	\N
2911	179	LS7	t	\N
2912	179	TIANGONG 05	t	\N
2913	179	TIANGONG 06	t	\N
2914	179	TIANGONG 08	t	\N
2915	180	830	t	\N
2916	180	853	t	\N
2917	180	901	t	\N
2918	181	NETA GT	t	\N
2919	181	NETA L	t	\N
2920	181	NETA S	t	\N
2921	181	NETA U	t	\N
2922	181	NETA U-II	t	\N
2923	181	NETA V	t	\N
2924	181	NETA X	t	\N
2925	182	MALOO	t	\N
2926	183	EK01	t	\N
2927	184	ANTELOPE	t	\N
2928	184	LANDSCAPE	t	\N
2929	184	N1	t	\N
2930	184	N2	t	\N
2931	184	N7	t	\N
2932	184	PLUTUS	t	\N
2933	185	OMEGA	t	\N
2934	186	CUSTOM EIGHT	t	\N
2935	186	DELUXE EIGHT	t	\N
2936	186	SUPER SIX	t	\N
2937	187	HAWK	t	\N
2938	30	H1	t	\N
2939	188	007	t	\N
2940	188	A06	t	\N
2941	188	V09	t	\N
2942	188	Z03	t	\N
2943	189	XP-1	t	\N
2944	31	ALCAZAR	t	\N
2945	31	ASLAN	t	\N
2946	31	AVANTE	t	\N
2947	31	AVANTE N	t	\N
2948	31	AZERA	t	\N
2949	31	BAYON	t	\N
2950	31	CASPER	t	\N
2951	31	CELESTA	t	\N
2952	31	CENTENNIAL	t	\N
2953	31	CLICK	t	\N
2954	31	COUPE	t	\N
2955	31	CRETA	t	\N
2956	31	CUSTIN	t	\N
2957	31	CUSTO	t	\N
2958	31	DYNASTY	t	\N
2959	31	ELANTRA N	t	\N
2960	31	ELEXIO	t	\N
2961	31	ENCINO	t	\N
2962	31	ENTOURAGE	t	\N
2963	31	EON	t	\N
2964	31	EQUUS	t	\N
2965	31	EXCEL	t	\N
2966	31	EXTER	t	\N
2967	31	GENESIS COUPE	t	\N
2968	31	GRACE	t	\N
2969	31	GRAND STAREX	t	\N
2970	31	HB20	t	\N
2971	31	H-1	t	\N
2972	31	I20 N	t	\N
2973	31	I30 N	t	\N
2974	31	INSTER	t	\N
2975	31	IONIQ	t	\N
2976	31	IONIQ 5	t	\N
2977	31	IONIQ 5 N	t	\N
2978	31	IONIQ 6	t	\N
2979	31	IONIQ 9	t	\N
2980	31	IX25	t	\N
2981	31	KONA	t	\N
2982	31	KONA N	t	\N
2983	31	LAFESTA	t	\N
2984	31	LAVITA	t	\N
2985	31	MARCIA	t	\N
2986	31	MAXCRUZ	t	\N
2987	31	MISTRA	t	\N
2988	31	MUFASA	t	\N
2989	31	NEXO	t	\N
2990	31	PALISADE	t	\N
2991	31	PONY	t	\N
2992	31	REINA	t	\N
2993	31	SANTAMO	t	\N
2994	31	SANTA CRUZ	t	\N
2995	31	SANTRO	t	\N
2996	31	SCOUPE	t	\N
2997	31	SOLARIS	t	\N
2998	31	STAREX	t	\N
2999	31	STARGAZER	t	\N
3000	31	STARIA	t	\N
3001	31	STELLAR	t	\N
3002	31	TIBURON	t	\N
3003	31	TUSCANI	t	\N
3004	31	VENUE	t	\N
3005	31	VERACRUZ	t	\N
3006	31	VERNA	t	\N
3007	31	XG	t	\N
3008	190	03	t	\N
3009	190	V23	t	\N
3010	190	V27	t	\N
3011	191	V27	t	\N
3012	192	2125 «КОМБИ»	t	\N
3013	192	2126 «ОДА»	t	\N
3014	192	21261 «ФАБУЛА»	t	\N
3015	192	2715	t	\N
3016	192	2717	t	\N
3017	192	27175	t	\N
3018	192	МОСКВИЧ-412	t	\N
3019	193	L6	t	\N
3020	193	L7	t	\N
3021	193	LS6	t	\N
3022	193	LS7	t	\N
3023	193	LS8	t	\N
3024	193	LS9	t	\N
3025	194	GRENADIER	t	\N
3026	32	ESQ	t	\N
3027	32	I	t	\N
3028	32	J	t	\N
3029	32	JX	t	\N
3030	32	Q30	t	\N
3031	32	Q40	t	\N
3032	32	Q50	t	\N
3033	32	Q60	t	\N
3034	32	Q70	t	\N
3035	32	QX30	t	\N
3036	32	QX4	t	\N
3037	32	QX50	t	\N
3038	32	QX55	t	\N
3039	32	QX56	t	\N
3040	32	QX60	t	\N
3041	32	QX70	t	\N
3042	32	QX80	t	\N
3043	195	ELBA	t	\N
3044	195	MILLE	t	\N
3045	195	MINI	t	\N
3046	196	SCOUT	t	\N
3047	196	TRAVELALL	t	\N
3048	197	S1	t	\N
3049	198	ARISUN	t	\N
3050	198	DENA	t	\N
3051	198	PAYKAN	t	\N
3052	198	RUNNA	t	\N
3053	198	SAHRA	t	\N
3054	198	SAMAND	t	\N
3055	198	SARIR	t	\N
3056	198	SOREN	t	\N
3057	198	TARA	t	\N
3058	199	COMMENDATORE 112I	t	\N
3059	199	IMPERATOR 108I	t	\N
3060	199	SPYDER	t	\N
3061	200	117	t	\N
3062	200	AMIGO	t	\N
3063	200	ASCENDER	t	\N
3064	200	ASKA	t	\N
3065	200	AXIOM	t	\N
3066	200	BELLETT	t	\N
3067	200	BIGHORN	t	\N
3068	200	D-MAX	t	\N
3069	200	FARGO	t	\N
3070	200	FARGO FILLY	t	\N
3071	200	FLORIAN	t	\N
3072	200	GEMINI	t	\N
3073	200	HOMBRE	t	\N
3074	200	IMPULSE	t	\N
3075	200	KB	t	\N
3076	200	LINGTUO	t	\N
3077	200	MIDI	t	\N
3078	200	MU	t	\N
3079	200	MU-7	t	\N
3080	200	MU-X	t	\N
3081	200	OASIS	t	\N
3082	200	PA NERO	t	\N
3083	200	PIAZZA	t	\N
3084	200	RODEO	t	\N
3085	200	RUIMAI	t	\N
3086	200	STYLUS	t	\N
3087	200	T17	t	\N
3088	200	T30 EXPLORER	t	\N
3089	200	TF (PICKUP)	t	\N
3090	200	TROOPER	t	\N
3091	200	VEHICROSS	t	\N
3092	200	WIZARD	t	\N
3093	201	MASSIF	t	\N
3094	202	A5	t	\N
3095	202	E30X	t	\N
3096	202	HUNTER	t	\N
3097	202	IEV7L	t	\N
3098	202	IEV7S	t	\N
3099	202	IEVA50	t	\N
3100	202	IEVS4	t	\N
3101	202	J2 (YUEYUE)	t	\N
3102	202	J3 (TONGYUE,TOJOY)	t	\N
3103	202	J4 (HEYUE A30)	t	\N
3104	202	J5 (HEYUE)	t	\N
3105	202	J6 (HEYUE RS)	t	\N
3106	202	J7	t	\N
3107	202	J7 (BINYUE)	t	\N
3108	202	JIAYUE X7	t	\N
3109	202	JS2	t	\N
3110	202	JS2 PRO	t	\N
3111	202	JS3	t	\N
3112	202	JS4	t	\N
3113	202	JS5	t	\N
3114	202	JS6	t	\N
3115	202	JS9	t	\N
3116	202	M4	t	\N
3117	202	M5	t	\N
3118	202	M1 (REFINE)	t	\N
3119	202	REFINE L6 MAX	t	\N
3120	202	REFINE M3	t	\N
3121	202	REFINE RF8	t	\N
3122	202	RF8	t	\N
3123	202	S1 (REIN)	t	\N
3124	202	S3 PRO	t	\N
3125	202	S4	t	\N
3126	202	S5 (EAGLE)	t	\N
3127	202	S6	t	\N
3128	202	S7	t	\N
3129	202	SEHOL A5 PLUS	t	\N
3130	202	SEHOL AIPAO	t	\N
3131	202	SEHOL E20X	t	\N
3132	202	SEHOL X6	t	\N
3133	202	SEHOL X8	t	\N
3134	202	SEHOL X8 PLUS	t	\N
3135	202	S2	t	\N
3136	202	S3	t	\N
3137	202	T6	t	\N
3138	202	T8	t	\N
3139	202	T8 PRO	t	\N
3140	202	T9	t	\N
3141	203	EJ6	t	\N
3142	203	J6	t	\N
3143	203	J7	t	\N
3144	203	J8	t	\N
3145	33	E-PACE	t	\N
3146	33	E-TYPE	t	\N
3147	33	I-PACE	t	\N
3148	33	MARK 2	t	\N
3149	33	MARK IX	t	\N
3150	33	XFR	t	\N
3151	33	XJ220	t	\N
3152	33	XJS	t	\N
3153	1	AVENGER	t	\N
3154	1	CJ	t	\N
3155	1	COMANCHE	t	\N
3156	1	GLADIATOR	t	\N
3157	1	GRAND COMMANDER	t	\N
3158	1	WAGONEER	t	\N
3159	1	LIBERTY (NORTH AMERICA)	t	\N
3160	1	LIBERTY (PATRIOT)	t	\N
3161	1	RECON	t	\N
3162	1	WAGONEER S	t	\N
3163	204	J6	t	\N
3164	205	INTERCEPTOR	t	\N
3165	205	S-V8	t	\N
3166	206	DASHING	t	\N
3167	206	FREEDOM	t	\N
3168	206	G700	t	\N
3169	206	REAOLO	t	\N
3170	206	SHANHAI L6	t	\N
3171	206	SHANHAI L7	t	\N
3172	206	SHANHAI L7 PLUS	t	\N
3173	206	SHANHAI L9	t	\N
3174	206	SHANHAI T1	t	\N
3175	206	SHANHAI T2	t	\N
3176	206	T1	t	\N
3177	206	T2	t	\N
3178	206	TRAVELLER	t	\N
3179	206	X50	t	\N
3180	206	X70	t	\N
3181	206	X70L	t	\N
3182	206	X70 PLUS	t	\N
3183	206	X70 PRO	t	\N
3184	206	X90	t	\N
3185	206	X90 PLUS	t	\N
3186	206	X90 PRO	t	\N
3187	206	X95	t	\N
3188	207	VA3	t	\N
3189	207	VA7	t	\N
3190	207	VS5	t	\N
3191	207	VS7	t	\N
3192	207	VS8	t	\N
3193	208	CHUANQI	t	\N
3194	209	01	t	\N
3195	209	07	t	\N
3196	210	HAISE	t	\N
3197	210	HAISE S	t	\N
3198	211	BAODIAN	t	\N
3199	211	DADAO	t	\N
3200	211	VIGUS	t	\N
3201	211	VIGUS WORK	t	\N
3202	211	YUHU 7	t	\N
3203	212	01	t	\N
3204	212	EV3	t	\N
3205	212	GSE (YI)	t	\N
3206	213	UFO A380	t	\N
3207	214	E5	t	\N
3208	214	SHIYUE	t	\N
3209	214	X3	t	\N
3210	214	X3 PRO	t	\N
3211	214	X7 KUNLUN	t	\N
3212	215	2317	t	\N
3213	216	REVERO	t	\N
3214	216	REVERO GT	t	\N
3215	217	K1	t	\N
3216	217	K150	t	\N
3217	217	K150GT	t	\N
3218	218	ACTYON	t	\N
3219	218	KORANDO	t	\N
3220	218	MUSSO	t	\N
3221	218	REXTON	t	\N
3222	218	REXTON SPORTS	t	\N
3223	218	TIVOLI	t	\N
3224	218	TORRES	t	\N
3225	25	BORREGO	t	\N
3226	25	CACHET	t	\N
3227	25	CADENZA	t	\N
3228	25	CAPITAL	t	\N
3229	25	CARSTAR	t	\N
3230	25	CEED	t	\N
3231	25	CEED GT	t	\N
3232	25	CLARUS	t	\N
3233	25	CONCORD	t	\N
3234	25	ELAN	t	\N
3235	25	ENTERPRISE	t	\N
3236	25	EV3	t	\N
3237	25	EV4	t	\N
3238	25	EV5	t	\N
3239	25	EV6	t	\N
3240	25	EV9	t	\N
3241	25	FORTE	t	\N
3242	25	JOICE	t	\N
3243	25	K3	t	\N
3244	25	K4	t	\N
3245	25	K5	t	\N
3246	25	K7	t	\N
3247	25	K8	t	\N
3248	25	K9	t	\N
3249	25	K900	t	\N
3250	25	KX1	t	\N
3251	25	KX3	t	\N
3252	25	KX5	t	\N
3253	25	KX7	t	\N
3254	25	LOTZE	t	\N
3255	25	MENTOR	t	\N
3256	25	MOHAVE	t	\N
3257	25	MORNING	t	\N
3258	25	NIRO	t	\N
3259	25	PEGAS	t	\N
3260	25	POTENTIA	t	\N
3261	25	PROCEED	t	\N
3262	25	PV5	t	\N
3263	25	QUANLIMA	t	\N
3264	25	QUORIS	t	\N
3265	25	RAY	t	\N
3266	25	RETONA	t	\N
3267	25	SEDONA	t	\N
3268	25	SELTOS	t	\N
3269	25	SOLUTO	t	\N
3270	25	SONET	t	\N
3271	25	SOUL EV	t	\N
3272	25	SPECTRA	t	\N
3273	25	SPORTAGE (CHINA)	t	\N
3274	25	STINGER	t	\N
3275	25	STONIC	t	\N
3276	25	SYROS	t	\N
3277	25	TASMAN	t	\N
3278	25	TELLURIDE	t	\N
3279	25	TOWNER	t	\N
3280	25	VISTO	t	\N
3281	25	XCEED	t	\N
3282	25	X-TREK	t	\N
3283	219	001	t	\N
3284	220	AGERA	t	\N
3285	220	CC850	t	\N
3286	220	CC8S	t	\N
3287	220	CCR	t	\N
3288	220	CCX	t	\N
3289	220	GEMERA	t	\N
3290	220	JESKO	t	\N
3291	220	ONE:1	t	\N
3292	220	REGERA	t	\N
3293	221	Т98	t	\N
3294	222	X-BOW	t	\N
3295	223	F3	t	\N
3296	224	350/400 GT	t	\N
3297	224	AVENTADOR	t	\N
3298	224	CENTENARIO	t	\N
3299	224	COUNTACH	t	\N
3300	224	COUNTACH LPI 800-4	t	\N
3301	224	DIABLO	t	\N
3302	224	EGOISTA	t	\N
3303	224	ESPADA	t	\N
3304	224	FENOMENO	t	\N
3305	224	GALLARDO	t	\N
3306	224	HURACÁN	t	\N
3307	224	ISLERO	t	\N
3308	224	JALPA	t	\N
3309	224	JARAMA	t	\N
3310	224	LM001	t	\N
3311	224	LM002	t	\N
3312	224	MIURA	t	\N
3313	224	MURCIELAGO	t	\N
3314	224	REVENTON	t	\N
3315	224	REVUELTO	t	\N
3316	224	SESTO ELEMENTO	t	\N
3317	224	SIÁN	t	\N
3318	224	SILHOUETTE	t	\N
3319	224	TEMERARIO	t	\N
3320	224	URRACO	t	\N
3321	224	URUS	t	\N
3322	224	VENENO	t	\N
3323	225	APPIA	t	\N
3324	225	AURELIA	t	\N
3325	225	A 112	t	\N
3326	225	BETA	t	\N
3327	225	DEDRA	t	\N
3328	225	DELTA	t	\N
3329	225	FLAMINIA	t	\N
3330	225	FLAVIA	t	\N
3331	225	FULVIA	t	\N
3332	225	GAMMA	t	\N
3333	225	HYENA	t	\N
3334	225	KAPPA	t	\N
3335	225	LAMBDA	t	\N
3336	225	LYBRA	t	\N
3337	225	MONTE CARLO	t	\N
3338	225	MUSA	t	\N
3339	225	PHEDRA	t	\N
3340	225	PRISMA	t	\N
3341	225	RALLY 037	t	\N
3342	225	STRATOS	t	\N
3343	225	THEMA	t	\N
3344	225	THESIS	t	\N
3345	225	TREVI	t	\N
3346	225	VOYAGER	t	\N
3347	225	Y10	t	\N
3348	225	YPSILON	t	\N
3349	225	ZETA	t	\N
3350	226	FASHION (CV9)	t	\N
3351	226	FORWARD	t	\N
3352	226	Х9	t	\N
3353	226	X5	t	\N
3354	226	X6	t	\N
3355	226	X7	t	\N
3356	26	RANGE ROVER VELAR	t	\N
3357	26	SERIES I	t	\N
3358	26	SERIES II	t	\N
3359	26	SERIES III	t	\N
3360	227	B01	t	\N
3361	227	B05 (LAFA 5)	t	\N
3362	227	B10	t	\N
3363	227	C01	t	\N
3364	227	C10	t	\N
3365	227	C11	t	\N
3366	227	C16	t	\N
3367	227	D19	t	\N
3368	227	S01	t	\N
3369	227	T03	t	\N
3370	228	MENGO	t	\N
3371	228	MENGO PRO	t	\N
3372	229	L380	t	\N
3373	229	TX	t	\N
3374	17	ES	t	\N
3375	17	GS F	t	\N
3376	17	HS	t	\N
3377	17	IS F	t	\N
3378	17	LBX	t	\N
3379	17	LC	t	\N
3380	17	LFA	t	\N
3381	17	LM	t	\N
3382	17	RC	t	\N
3383	17	RZ	t	\N
3384	17	SC	t	\N
3385	17	TX	t	\N
3386	17	UX	t	\N
3387	230	LEOPARD	t	\N
3388	231	650 EV	t	\N
3389	231	BREEZ (520)	t	\N
3390	231	CEBRIUM (720)	t	\N
3391	231	CELLIYA (530)	t	\N
3392	231	MURMAN (820)	t	\N
3393	231	MYWAY	t	\N
3394	231	SMILY	t	\N
3395	231	SOLANO	t	\N
3396	231	X50	t	\N
3397	231	X60	t	\N
3398	231	X70	t	\N
3399	232	JS 51	t	\N
3400	233	AVIATOR	t	\N
3401	233	BLACKWOOD	t	\N
3402	233	CAPRI	t	\N
3403	233	CONTINENTAL	t	\N
3404	233	CONTINENTAL MARK	t	\N
3405	233	CORSAIR	t	\N
3406	233	LS	t	\N
3407	233	MARK LT	t	\N
3408	233	MARK VII	t	\N
3409	233	MARK VIII	t	\N
3410	233	MKC	t	\N
3411	233	MKS	t	\N
3412	233	MKT	t	\N
3413	233	MKX	t	\N
3414	233	MKZ	t	\N
3415	233	NAUTILUS	t	\N
3416	233	NAVIGATOR	t	\N
3417	233	PREMIERE	t	\N
3418	233	TOWN CAR	t	\N
3419	233	VERSAILLES	t	\N
3420	233	Z	t	\N
3421	233	ZEPHYR	t	\N
3422	234	L	t	\N
3423	235	7	t	\N
3424	235	8	t	\N
3425	235	9	t	\N
3426	235	BLUE BALOON	t	\N
3427	235	S6 PRO	t	\N
3428	235	X3 PRO	t	\N
3429	235	X6 PRO	t	\N
3430	236	I6	t	\N
3431	236	I8	t	\N
3432	236	L6	t	\N
3433	236	L7	t	\N
3434	236	L8	t	\N
3435	236	L9	t	\N
3436	236	MEGA	t	\N
3437	236	ONE	t	\N
3438	237	EC30	t	\N
3439	238	2-ELEVEN	t	\N
3440	238	340R	t	\N
3441	238	3-ELEVEN	t	\N
3442	238	ECLAT	t	\N
3443	238	ELAN	t	\N
3444	238	ELETRE	t	\N
3445	238	ELISE	t	\N
3446	238	ELITE	t	\N
3447	238	EMEYA	t	\N
3448	238	EMIRA	t	\N
3449	238	ESPRIT	t	\N
3450	238	EUROPA	t	\N
3451	238	EUROPA S	t	\N
3452	238	EVIJA	t	\N
3453	238	EVORA	t	\N
3454	238	EXCEL	t	\N
3455	238	EXIGE	t	\N
3456	239	FX4	t	\N
3457	239	TX	t	\N
3458	240	1302 ВОЛЫНЬ	t	\N
3459	240	967	t	\N
3460	240	969	t	\N
3461	241	AIR	t	\N
3462	241	GRAVITY	t	\N
3463	242	R7	t	\N
3464	242	S7	t	\N
3465	243	LUXGEN7 MPV	t	\N
3466	243	LUXGEN7 SUV	t	\N
3467	243	LUXGEN5	t	\N
3468	243	U6 TURBO	t	\N
3469	243	U7 TURBO	t	\N
3470	244	01	t	\N
3471	244	02	t	\N
3472	244	03	t	\N
3473	244	05	t	\N
3474	244	06	t	\N
3475	244	07	t	\N
3476	244	08	t	\N
3477	244	09	t	\N
3478	244	10	t	\N
3479	244	900	t	\N
3480	244	Z10	t	\N
3481	244	Z20	t	\N
3482	245	S800	t	\N
3483	246	ARMADA	t	\N
3484	246	BOLERO	t	\N
3485	246	CJ-3	t	\N
3486	246	CL	t	\N
3487	246	COMMANDER	t	\N
3488	246	MARSHAL	t	\N
3489	246	MM	t	\N
3490	246	NC 640 DP	t	\N
3491	246	SCORPIO	t	\N
3492	246	THAR	t	\N
3493	246	VERITO	t	\N
3494	246	VOYAGER	t	\N
3495	246	XYLO	t	\N
3496	247	30X	t	\N
3497	247	X3 PRO	t	\N
3498	248	GTS	t	\N
3499	248	LM 400	t	\N
3500	248	LM 500	t	\N
3501	248	MANTIS	t	\N
3502	248	MARCASITE	t	\N
3503	249	5EXI	t	\N
3504	249	SPORTSTER	t	\N
3505	250	B1	t	\N
3506	250	B2	t	\N
3507	251	1000	t	\N
3508	251	800	t	\N
3509	251	ALTO	t	\N
3510	251	BALENO	t	\N
3511	251	ESTEEM	t	\N
3512	251	GYPSY	t	\N
3513	251	OMNI	t	\N
3514	251	VERSA	t	\N
3515	251	WAGON R	t	\N
3516	251	ZEN	t	\N
3517	252	228	t	\N
3518	252	3200 GT	t	\N
3519	252	3500 GT	t	\N
3520	252	420	t	\N
3521	252	4200 GT	t	\N
3522	252	BARCHETTA STRADALE	t	\N
3523	252	BITURBO	t	\N
3524	252	BORA	t	\N
3525	252	CHUBASCO	t	\N
3526	252	GHIBLI	t	\N
3527	252	GRANCABRIO	t	\N
3528	252	GRANTURISMO	t	\N
3529	252	GRECALE	t	\N
3530	252	GT2 STRADALE	t	\N
3531	252	INDY	t	\N
3532	252	KARIF	t	\N
3533	252	KHAMSIN	t	\N
3534	252	KYALAMI	t	\N
3535	252	LEVANTE	t	\N
3536	252	MC12	t	\N
3537	252	MC20	t	\N
3538	252	MCPURA	t	\N
3539	252	MERAK	t	\N
3540	252	MEXICO	t	\N
3541	252	QUATTROPORTE	t	\N
3542	252	ROYALE	t	\N
3543	252	SHAMAL	t	\N
3544	253	MURENA	t	\N
3545	254	D60	t	\N
3546	254	D90	t	\N
3547	254	EUNIQ 5	t	\N
3548	254	EUNIQ 6	t	\N
3549	254	G10	t	\N
3550	254	G20	t	\N
3551	254	G50	t	\N
3552	254	G50 MAX	t	\N
3553	254	G50 PLUS	t	\N
3554	254	G70	t	\N
3555	254	G90	t	\N
3556	254	INTERSTELLAR	t	\N
3557	254	MIFA 5	t	\N
3558	254	MIFA 7	t	\N
3559	254	MIFA 9	t	\N
3560	254	T70	t	\N
3561	254	T90	t	\N
3562	254	TERRITORY	t	\N
3563	254	V70	t	\N
3564	255	57	t	\N
3565	255	62	t	\N
3566	255	EXELERO	t	\N
3567	255	SW38	t	\N
3568	15	1000	t	\N
3569	15	1300	t	\N
3570	15	3 MPS	t	\N
3571	15	616	t	\N
3572	15	6E	t	\N
3573	15	6 MPS	t	\N
3574	15	818	t	\N
3575	15	929	t	\N
3576	15	ATENZA	t	\N
3577	15	AUTOZAM AZ-1	t	\N
3578	15	AUTOZAM AZ-3	t	\N
3579	15	AUTOZAM CLEF	t	\N
3580	15	AXELA	t	\N
3581	15	AZ-OFFROAD	t	\N
3582	15	AZ-WAGON	t	\N
3583	15	BIANTE	t	\N
3584	15	BONGO	t	\N
3585	15	BONGO FRIENDEE	t	\N
3586	15	BT-50	t	\N
3587	15	B-SERIES	t	\N
3588	15	CAPELLA	t	\N
3589	15	CAROL	t	\N
3590	15	CHANTEZ	t	\N
3591	15	COSMO	t	\N
3592	15	CRONOS	t	\N
3593	15	CX-90	t	\N
3594	15	CX-30	t	\N
3595	15	CX-4	t	\N
3596	15	CX-50	t	\N
3597	15	CX-60	t	\N
3598	15	CX-6E	t	\N
3599	15	CX-70	t	\N
3600	15	CX-8	t	\N
3601	15	CX-80	t	\N
3602	15	EFINI MS-6	t	\N
3603	15	EFINI MS-8	t	\N
3604	15	EFINI MS-9	t	\N
3605	15	ETUDE	t	\N
3606	15	EUNOS 100	t	\N
3607	15	EUNOS 300	t	\N
3608	15	EUNOS 500	t	\N
3609	15	EUNOS 800	t	\N
3610	15	EUNOS COSMO	t	\N
3611	15	EUNOS PRESSO	t	\N
3612	15	EZ-6	t	\N
3613	15	EZ-60	t	\N
3614	15	E-SERIES	t	\N
3615	15	FAMILIA	t	\N
3616	15	FLAIR	t	\N
3617	15	FLAIR CROSSOVER	t	\N
3618	15	FLAIR WAGON	t	\N
3619	15	LANTIS	t	\N
3620	15	LAPUTA	t	\N
3621	15	LUCE	t	\N
3622	15	MILLENIA	t	\N
3623	15	MX-30	t	\N
3624	15	NAVAJO	t	\N
3625	15	PERSONA	t	\N
3626	15	PROCEED	t	\N
3627	15	PROCEED LEVANTE	t	\N
3628	15	PROCEED MARVIE	t	\N
3629	15	PROTEGE	t	\N
3630	15	REVUE	t	\N
3631	15	ROADSTER	t	\N
3632	15	RX-4	t	\N
3633	15	RX-5	t	\N
3634	15	R360	t	\N
3635	15	SAVANNA RX-7	t	\N
3636	15	SCRUM	t	\N
3637	15	SENTIA	t	\N
3638	15	SPIANO	t	\N
3639	15	TRIBUTE	t	\N
3640	15	VERISA	t	\N
3641	15	XEDOS 6	t	\N
3642	15	XEDOS 9	t	\N
3643	256	MP4-12C	t	\N
3644	256	540C	t	\N
3645	256	570GT	t	\N
3646	256	570S	t	\N
3647	256	600LT	t	\N
3648	256	650S	t	\N
3649	256	675LT	t	\N
3650	256	720S	t	\N
3651	256	750S	t	\N
3652	256	765LT	t	\N
3653	256	ARTURA	t	\N
3654	256	ELVA	t	\N
3655	256	F1	t	\N
3656	256	GT	t	\N
3657	256	GTS	t	\N
3658	256	P1	t	\N
3659	256	SENNA	t	\N
3660	256	W1	t	\N
3661	257	CLUB	t	\N
3662	257	MONTE CARLO	t	\N
3663	257	TRACK	t	\N
3664	22	190 SL	t	\N
3665	22	220 (W187)	t	\N
3666	22	300 SLR	t	\N
3667	22	GLC COUPE AMG	t	\N
3668	22	AMG ONE	t	\N
3669	22	AMG PURESPEED	t	\N
3670	22	A-КЛАСС	t	\N
3671	22	A-КЛАСС AMG	t	\N
3672	22	B-КЛАСС	t	\N
3673	22	CLA AMG	t	\N
3674	22	CLC-КЛАСС	t	\N
3675	22	CLE	t	\N
3676	22	CLE AMG	t	\N
3677	22	CLK AMG GTR	t	\N
3678	22	CLK-КЛАСС	t	\N
3679	22	CLK-КЛАСС AMG	t	\N
3680	22	CLS AMG	t	\N
3681	22	CL-КЛАСС	t	\N
3682	22	CL-КЛАСС AMG	t	\N
3683	22	C-КЛАСС	t	\N
3684	22	C-КЛАСС AMG	t	\N
3685	22	EQA	t	\N
3686	22	EQB	t	\N
3687	22	EQC	t	\N
3688	22	EQE	t	\N
3689	22	EQE AMG	t	\N
3690	22	EQE SUV	t	\N
3691	22	EQE SUV AMG	t	\N
3692	22	EQS	t	\N
3693	22	EQS AMG	t	\N
3694	22	EQS SUV	t	\N
3695	22	EQT	t	\N
3696	22	EQV	t	\N
3697	22	E-КЛАСС	t	\N
3698	22	E-КЛАСС AMG	t	\N
3699	22	GLA AMG	t	\N
3700	22	GLB AMG	t	\N
3701	22	GLB	t	\N
3702	22	GLC COUPE	t	\N
3703	22	GLC AMG	t	\N
3704	22	GLE AMG	t	\N
3705	22	GLE COUPE	t	\N
3706	22	GLE COUPE AMG	t	\N
3707	22	GLK-КЛАСС	t	\N
3708	22	GLS	t	\N
3709	22	GLS AMG	t	\N
3710	22	GL-КЛАСС	t	\N
3711	22	GL-КЛАСС AMG	t	\N
3712	22	G-КЛАСС	t	\N
3713	22	G-КЛАСС AMG	t	\N
3714	22	G-КЛАСС AMG 6X6	t	\N
3715	22	MARCO POLO	t	\N
3716	22	MAYBACH EQS SUV	t	\N
3717	22	MAYBACH GLS	t	\N
3718	22	MAYBACH G 650 LANDAULET	t	\N
3719	22	MAYBACH SL	t	\N
3720	22	METRIS	t	\N
3721	22	M-КЛАСС	t	\N
3722	22	M-КЛАСС AMG	t	\N
3723	22	R-КЛАСС	t	\N
3724	22	R-КЛАСС AMG	t	\N
3725	22	SIMPLEX	t	\N
3726	22	SLC AMG	t	\N
3727	22	SLK-КЛАСС	t	\N
3728	22	SLK-КЛАСС AMG	t	\N
3729	22	SLR MCLAREN	t	\N
3730	22	SLS AMG	t	\N
3731	22	SL-КЛАСС	t	\N
3732	22	SL-КЛАСС AMG	t	\N
3733	22	MAYBACH S-КЛАСС	t	\N
3734	22	S-КЛАСС	t	\N
3735	22	S-КЛАСС AMG	t	\N
3736	22	TYP 630	t	\N
3737	22	T-КЛАСС	t	\N
3738	22	VANEO	t	\N
3739	22	VIANO	t	\N
3740	22	VITO	t	\N
3741	22	V-КЛАСС	t	\N
3742	22	W100	t	\N
3743	22	W105	t	\N
3744	22	W108	t	\N
3745	22	W110	t	\N
3746	22	W111	t	\N
3747	22	W114	t	\N
3748	22	W115	t	\N
3749	22	W120	t	\N
3750	22	W121	t	\N
3751	22	W123	t	\N
3752	22	W124	t	\N
3753	22	W128	t	\N
3754	22	W136	t	\N
3755	22	W138	t	\N
3756	22	W142	t	\N
3757	22	W180	t	\N
3758	22	W186	t	\N
3759	22	W188	t	\N
3760	22	W189	t	\N
3761	22	W191	t	\N
3762	22	190 (W201)	t	\N
3763	22	W21	t	\N
3764	22	W29	t	\N
3765	22	X-КЛАСС	t	\N
3766	258	CAPRI	t	\N
3767	258	COLONY PARK	t	\N
3768	258	COUGAR	t	\N
3769	258	EIGHT	t	\N
3770	258	GRAND MARQUIS	t	\N
3771	258	MARAUDER	t	\N
3772	258	MARINER	t	\N
3773	258	MARQUIS	t	\N
3774	258	MILAN	t	\N
3775	258	MONTEGO	t	\N
3776	258	MONTEREY	t	\N
3777	258	MOUNTAINEER	t	\N
3778	258	MYSTIQUE	t	\N
3779	258	SABLE	t	\N
3780	258	TOPAZ	t	\N
3781	258	TRACER	t	\N
3782	258	VILLAGER	t	\N
3783	259	XR4TI	t	\N
3784	260	KR200	t	\N
3785	261	METROCAB I	t	\N
3786	261	METROCAB II (TTT)	t	\N
3787	262	3	t	\N
3788	262	350	t	\N
3789	262	4 EV	t	\N
3790	262	5	t	\N
3791	262	550	t	\N
3792	262	5 EV	t	\N
3793	262	5 SCORPIO	t	\N
3794	262	6	t	\N
3795	262	6 PRO	t	\N
3796	262	7	t	\N
3797	262	750	t	\N
3798	262	8	t	\N
3799	262	CYBERSTER	t	\N
3800	262	ES5	t	\N
3801	262	F	t	\N
3802	262	GS	t	\N
3803	262	HS	t	\N
3804	262	MAESTRO	t	\N
3805	262	METRO	t	\N
3806	262	MGA	t	\N
3807	262	MGB	t	\N
3808	262	MIDGET	t	\N
3809	262	MONTEGO	t	\N
3810	262	MULAN	t	\N
3811	262	ONE	t	\N
3812	262	PILOT	t	\N
3813	262	RV8	t	\N
3814	262	RX5	t	\N
3815	262	RX8	t	\N
3816	262	RX9	t	\N
3817	262	T60	t	\N
3818	262	TD MIDGET	t	\N
3819	262	TF	t	\N
3820	262	U9	t	\N
3821	262	XPOWER SV	t	\N
3822	262	ZR	t	\N
3823	262	ZS	t	\N
3824	262	ZT	t	\N
3825	263	MICROLINO	t	\N
3826	264	F8C	t	\N
3827	264	M8	t	\N
3828	264	MC	t	\N
3829	264	M.GO	t	\N
3830	264	VIRGO	t	\N
3831	265	TF 1800	t	\N
3832	38	ACEMAN	t	\N
3833	38	CABRIO	t	\N
3834	38	CLUBMAN	t	\N
3835	38	COUPE	t	\N
3836	38	HATCH	t	\N
3837	38	PACEMAN	t	\N
3838	38	ROADSTER	t	\N
3839	16	500	t	\N
3840	16	AIRTREK	t	\N
3841	16	ASPIRE	t	\N
3842	16	ATTRAGE	t	\N
3843	16	BRAVO	t	\N
3844	16	CELESTE	t	\N
3845	16	CHALLENGER	t	\N
3846	16	CHARIOT	t	\N
3847	16	CORDIA	t	\N
3848	16	DEBONAIR	t	\N
3849	16	DELICA	t	\N
3850	16	DELICA D:2	t	\N
3851	16	DELICA D:3	t	\N
3852	16	DELICA D:5	t	\N
3853	16	DELICA MINI	t	\N
3854	16	DESTINATOR	t	\N
3855	16	DIAMANTE	t	\N
3856	16	DIGNITY	t	\N
3857	16	DINGO	t	\N
3858	16	DION	t	\N
3859	16	ECLIPSE CROSS	t	\N
3860	16	EK ACTIVE	t	\N
3861	16	EK CLASSIC	t	\N
3862	16	EK CUSTOM	t	\N
3863	16	EK SPACE	t	\N
3864	16	EK SPORT	t	\N
3865	16	EK WAGON	t	\N
3866	16	EMERAUDE	t	\N
3867	16	ENDEAVOR	t	\N
3868	16	ETERNA	t	\N
3869	16	FREECA	t	\N
3870	16	FTO	t	\N
3871	16	GALANT FORTIS	t	\N
3872	16	GTO	t	\N
3873	16	I	t	\N
3874	16	I-MIEV	t	\N
3875	16	JEEP J	t	\N
3876	16	L400	t	\N
3877	16	LANCER CARGO	t	\N
3878	16	LANCER EVOLUTION	t	\N
3879	16	LANCER RALLIART	t	\N
3880	16	LEGNUM	t	\N
3881	16	LIBERO	t	\N
3882	16	MINICA	t	\N
3883	16	MINICAB	t	\N
3884	16	MIRAGE	t	\N
3885	16	MONTERO	t	\N
3886	16	MONTERO SPORT	t	\N
3887	16	OUTLANDER SPORT	t	\N
3888	16	PAJERO IO	t	\N
3889	16	PAJERO JUNIOR	t	\N
3890	16	PAJERO MINI	t	\N
3891	16	PAJERO PININ	t	\N
3892	16	PISTACHIO	t	\N
3893	16	PROUDIA	t	\N
3894	16	RAIDER	t	\N
3895	16	RVR	t	\N
3896	16	SAPPORO	t	\N
3897	16	SAVRIN	t	\N
3898	16	SIGMA	t	\N
3899	16	SPACE GEAR	t	\N
3900	16	SPACE RUNNER	t	\N
3901	16	SPACE WAGON	t	\N
3902	16	STARION	t	\N
3903	16	STRADA	t	\N
3904	16	TOPPO	t	\N
3905	16	TOWN BOX	t	\N
3906	16	TREDIA	t	\N
3907	16	TRITON	t	\N
3908	16	XFORCE	t	\N
3909	16	XPANDER	t	\N
3910	266	BUBU CLASSIC SSK	t	\N
3911	266	BUDDY	t	\N
3912	266	GALUE	t	\N
3913	266	GALUE 204	t	\N
3914	266	HIMIKO	t	\N
3915	266	LE-SEYDE	t	\N
3916	266	LIKE	t	\N
3917	266	M55	t	\N
3918	266	MC-1	t	\N
3919	266	NOUERA	t	\N
3920	266	OROCHI	t	\N
3921	266	RAY	t	\N
3922	266	ROCK STAR	t	\N
3923	266	RYOGA	t	\N
3924	266	RYUGI	t	\N
3925	266	VIEWT	t	\N
3926	266	YUGA	t	\N
3927	266	ZERO 1	t	\N
3928	267	LIMO	t	\N
3929	268	3 WHEELER	t	\N
3930	268	4/4	t	\N
3931	268	4 SEATER	t	\N
3932	268	AEROMAX	t	\N
3933	268	AERO 8	t	\N
3934	268	AERO COUPE	t	\N
3935	268	AERO SUPERSPORTS	t	\N
3936	268	PLUS 4	t	\N
3937	268	PLUS 8	t	\N
3938	268	PLUS SIX	t	\N
3939	268	ROADSTER	t	\N
3940	268	SUPERSPORT	t	\N
3941	269	EIGHT	t	\N
3942	269	MARINA	t	\N
3943	270	2136	t	\N
3944	270	2137	t	\N
3945	270	2138	t	\N
3946	270	2140	t	\N
3947	270	2141	t	\N
3948	270	2142	t	\N
3949	270	3	t	\N
3950	270	3Е	t	\N
3951	270	400	t	\N
3952	270	401	t	\N
3953	270	402	t	\N
3954	270	403	t	\N
3955	270	407	t	\N
3956	270	408	t	\N
3957	270	410	t	\N
3958	270	411	t	\N
3959	270	412	t	\N
3960	270	423	t	\N
3961	270	424	t	\N
3962	270	426	t	\N
3963	270	427	t	\N
3964	270	430	t	\N
3965	270	434П	t	\N
3966	270	5	t	\N
3967	270	6	t	\N
3968	270	8	t	\N
3969	270	ДУЭТ	t	\N
3970	270	ИВАН КАЛИТА	t	\N
3971	270	КНЯЗЬ ВЛАДИМИР	t	\N
3972	270	М70	t	\N
3973	270	М90	t	\N
3974	270	СВЯТОГОР	t	\N
3975	270	ЮРИЙ ДОЛГОРУКИЙ	t	\N
3976	271	I	t	\N
3977	272	AMBASSADOR	t	\N
3978	273	EC6	t	\N
3979	273	EC7	t	\N
3980	273	EL6	t	\N
3981	273	ES6	t	\N
3982	273	ES7	t	\N
3983	273	ES8	t	\N
3984	273	ES9	t	\N
3985	273	ET5	t	\N
3986	273	ET7	t	\N
3987	273	ET9	t	\N
3988	273	FIREFLY	t	\N
3989	273	ONVO L60	t	\N
3990	273	ONVO L90	t	\N
3991	34	100NX	t	\N
3992	34	180SX	t	\N
3993	34	200SX	t	\N
3994	34	240SX	t	\N
3995	34	280ZX	t	\N
3996	34	300ZX	t	\N
3997	34	350Z	t	\N
3998	34	370Z	t	\N
3999	34	AD	t	\N
4000	34	ALMERA CLASSIC	t	\N
4001	34	ALTIMA	t	\N
4002	34	ARIYA	t	\N
4003	34	ARMADA	t	\N
4004	34	AUSTER	t	\N
4005	34	AUTECH ZAGATO STELVIO AZ1	t	\N
4006	34	AVENIR	t	\N
4007	34	BASSARA	t	\N
4008	34	BE-1	t	\N
4009	34	BLUEBIRD	t	\N
4010	34	BLUEBIRD MAXIMA	t	\N
4011	34	BLUEBIRD SYLPHY	t	\N
4012	34	CARAVAN	t	\N
4013	34	CEDRIC	t	\N
4014	34	CEFIRO	t	\N
4015	34	CHERRY	t	\N
4016	34	CIMA	t	\N
4017	34	NV100 CLIPPER	t	\N
4018	34	CLIPPER RIO	t	\N
4019	34	CREW	t	\N
4020	34	CUBE	t	\N
4021	34	DATSUN	t	\N
4022	34	DAYZ	t	\N
4023	34	DAYZ ROOX	t	\N
4024	34	DUALIS	t	\N
4025	34	ELGRAND	t	\N
4026	34	EXA	t	\N
4027	34	EXPERT	t	\N
4028	34	FAIRLADY Z	t	\N
4029	34	FIGARO	t	\N
4030	34	FRONTIER	t	\N
4031	34	FRONTIER PRO	t	\N
4032	34	FUGA	t	\N
4033	34	GLORIA	t	\N
4034	34	GRAVITE	t	\N
4035	34	HOMY	t	\N
4036	34	HYPERMINI	t	\N
4037	34	JUKE NISMO	t	\N
4038	34	KAIT	t	\N
4039	34	KICKS	t	\N
4040	34	KIX	t	\N
4041	34	KUBISTAR	t	\N
4042	34	LAFESTA	t	\N
4043	34	LANGLEY	t	\N
4044	34	LANNIA	t	\N
4045	34	LARGO	t	\N
4046	34	LATIO	t	\N
4047	34	LAUREL	t	\N
4048	34	LAUREL SPIRIT	t	\N
4049	34	LEOPARD	t	\N
4050	34	LIBERTA VILLA	t	\N
4051	34	LIBERTY	t	\N
4052	34	LIVINA	t	\N
4053	34	LUCINO	t	\N
4054	34	MAGNITE	t	\N
4055	34	MARCH	t	\N
4056	34	MISTRAL	t	\N
4057	34	MOCO	t	\N
4058	34	N6	t	\N
4059	34	N7	t	\N
4060	34	NAVARA (FRONTIER)	t	\N
4061	34	NP200	t	\N
4062	34	NP300	t	\N
4063	34	NV300	t	\N
4064	34	NV350 CARAVAN	t	\N
4065	34	NX8	t	\N
4066	34	NX COUPE	t	\N
4067	34	OTTI	t	\N
4068	34	PAO	t	\N
4069	34	PINO	t	\N
4070	34	PRAIRIE	t	\N
4071	34	PRESAGE	t	\N
4072	34	PRESEA	t	\N
4073	34	PRESIDENT	t	\N
4074	34	QASHQAI+2	t	\N
4075	34	QUEST	t	\N
4076	34	RASHEEN	t	\N
4077	34	R'NESSA	t	\N
4078	34	ROGUE	t	\N
4079	34	ROGUE SPORT	t	\N
4080	34	ROOX	t	\N
4081	34	SAFARI	t	\N
4082	34	SAKURA	t	\N
4083	34	SENTRA	t	\N
4084	34	SILVIA	t	\N
4085	34	SKYLINE	t	\N
4086	34	SKYLINE CROSSOVER	t	\N
4087	34	STAGEA	t	\N
4088	34	STANZA	t	\N
4089	34	SYLPHY	t	\N
4090	34	S-CARGO	t	\N
4091	34	TEANA	t	\N
4092	34	TERRA	t	\N
4093	34	TERRANO REGULUS	t	\N
4094	34	TINO	t	\N
4095	34	TITAN	t	\N
4096	34	URVAN	t	\N
4097	34	VANETTE	t	\N
4098	34	VERSA	t	\N
4099	34	VERSA NOTE	t	\N
4100	34	WINGROAD	t	\N
4101	34	XTERRA	t	\N
4102	34	X-TERRA	t	\N
4103	34	Z	t	\N
4104	274	M12 GTO	t	\N
4105	274	M15	t	\N
4106	274	M600	t	\N
4107	275	001	t	\N
4108	276	442	t	\N
4109	276	ACHIEVA	t	\N
4110	276	ALERO	t	\N
4111	276	AURORA	t	\N
4112	276	BRAVADA	t	\N
4113	276	CUSTOM CRUISER	t	\N
4114	276	CUTLASS	t	\N
4115	276	CUTLASS CALAIS	t	\N
4116	276	CUTLASS CIERA	t	\N
4117	276	CUTLASS SUPREME	t	\N
4118	276	DELTA 88	t	\N
4119	276	EIGHTY-EIGHT	t	\N
4120	276	FIRENZA	t	\N
4121	276	INTRIGUE	t	\N
4122	276	NINETY-EIGHT	t	\N
4123	276	OMEGA	t	\N
4124	276	SERIES 60	t	\N
4125	276	SERIES 70	t	\N
4126	276	SILHOUETTE	t	\N
4127	276	STARFIRE	t	\N
4128	276	TORONADO	t	\N
4129	276	VISTA CRUISER	t	\N
4130	277	CLUB	t	\N
4131	278	C5	t	\N
4132	278	C7	t	\N
4133	278	C9	t	\N
4134	278	E5	t	\N
4135	278	S5	t	\N
4136	278	S5 GT	t	\N
4137	8	4/8 PS	t	\N
4138	8	ADAM	t	\N
4139	8	ADMIRAL	t	\N
4140	8	ASCONA	t	\N
4141	8	ASTRA OPC	t	\N
4142	8	COMBO	t	\N
4143	8	COMMODORE	t	\N
4144	8	CORSA OPC	t	\N
4145	8	CROSSLAND X	t	\N
4146	8	DIPLOMAT	t	\N
4147	8	GRANDLAND	t	\N
4148	8	GT	t	\N
4149	8	INSIGNIA OPC	t	\N
4150	8	KAPITAN	t	\N
4151	8	KARL	t	\N
4152	8	LOTUS OMEGA	t	\N
4153	8	MANTA	t	\N
4154	8	MERIVA OPC	t	\N
4155	8	MONTEREY	t	\N
4156	8	MONZA	t	\N
4157	8	OLYMPIA	t	\N
4158	8	P4	t	\N
4159	8	REKORD	t	\N
4160	8	ROCKS ELECTRIC	t	\N
4161	8	SENATOR	t	\N
4162	8	SINTRA	t	\N
4163	8	SPEEDSTER	t	\N
4164	8	SUPER SIX	t	\N
4165	8	TIGRA	t	\N
4166	8	VECTRA OPC	t	\N
4167	8	VITA	t	\N
4168	8	ZAFIRA LIFE	t	\N
4169	8	ZAFIRA OPC	t	\N
4170	279	03	t	\N
4171	279	5	t	\N
4172	279	BALLET CAT	t	\N
4173	279	BLACK CAT	t	\N
4174	279	GOOD CAT	t	\N
4175	279	IQ	t	\N
4176	279	LIGHTNING CAT	t	\N
4177	279	SAR (SALOON) MECHA DRAGON	t	\N
4178	279	WHITE CAT	t	\N
4179	280	01	t	\N
4180	281	2500 GT	t	\N
4181	282	COS1	t	\N
4182	282	COSMOS	t	\N
4183	282	X5	t	\N
4184	282	X5 PLUS	t	\N
4185	282	X7	t	\N
4186	282	X7 PLUS	t	\N
4187	282	Z6	t	\N
4188	283	PALADIN	t	\N
4189	283	PALASSO	t	\N
4190	283	RICH 7	t	\N
4191	283	Z9	t	\N
4192	284	ROADSTER	t	\N
4193	285	200/250	t	\N
4194	285	CARIBBEAN	t	\N
4195	285	CLIPPER	t	\N
4196	285	CUSTOM EIGHT	t	\N
4197	285	ONE-TEN	t	\N
4198	285	ONE-TWENTY	t	\N
4199	285	SIX	t	\N
4200	285	SUPER EIGHT	t	\N
4201	285	TWELVE	t	\N
4202	286	HUAYRA	t	\N
4203	286	UTOPIA	t	\N
4204	286	ZONDA	t	\N
4205	287	ESPERANTE	t	\N
4206	287	ROADSTER	t	\N
4207	288	ALZA	t	\N
4208	288	KANCIL	t	\N
4209	288	KELISA	t	\N
4210	288	KEMBARA	t	\N
4211	288	KENARI	t	\N
4212	288	MYVI	t	\N
4213	288	NAUTICA	t	\N
4214	288	TRAZ	t	\N
4215	288	VIVA	t	\N
4216	5	104	t	\N
4217	5	201	t	\N
4218	5	202	t	\N
4219	5	203	t	\N
4220	5	204	t	\N
4221	5	205 GTI	t	\N
4222	5	207I (IRAN KHODRO)	t	\N
4223	5	208	t	\N
4224	5	208 GTI	t	\N
4225	5	3008	t	\N
4226	5	301	t	\N
4227	5	304	t	\N
4228	5	305	t	\N
4229	5	308 GTI	t	\N
4230	5	402	t	\N
4231	5	403	t	\N
4232	5	404	t	\N
4233	5	408	t	\N
4234	5	504	t	\N
4235	5	505	t	\N
4236	5	604	t	\N
4237	5	EXPERT	t	\N
4238	5	ION	t	\N
4239	5	LANDTREK	t	\N
4240	5	PARTNER	t	\N
4241	5	PICK UP	t	\N
4242	5	RIFTER	t	\N
4243	5	TRAVELLER	t	\N
4244	289	CEVENNES	t	\N
4245	289	HEMERA	t	\N
4246	289	SPEEDSTER II	t	\N
4247	290	PORTER	t	\N
4248	291	TWELVE	t	\N
4249	292	ACCLAIM	t	\N
4250	292	BARRACUDA	t	\N
4251	292	BREEZE	t	\N
4252	292	CARAVELLE	t	\N
4253	292	COLT VISTA	t	\N
4254	292	CRANBROOK	t	\N
4255	292	DE LUXE	t	\N
4256	292	FURY	t	\N
4257	292	GRAN FURY	t	\N
4258	292	HORIZON	t	\N
4259	292	LASER	t	\N
4260	292	NEON	t	\N
4261	292	PROWLER	t	\N
4262	292	RELIANT	t	\N
4263	292	ROAD RUNNER	t	\N
4264	292	SATELLITE	t	\N
4265	292	SUNDANCE	t	\N
4266	292	TURISMO	t	\N
4267	292	VALIANT	t	\N
4268	292	VOLARE	t	\N
4269	292	VOYAGER	t	\N
4270	293	01	t	\N
4271	294	1	t	\N
4272	294	2	t	\N
4273	294	3	t	\N
4274	294	4	t	\N
4275	294	5	t	\N
4276	295	6000	t	\N
4277	295	AZTEK	t	\N
4278	295	BONNEVILLE	t	\N
4279	295	CATALINA	t	\N
4280	295	FIERO	t	\N
4281	295	FIREBIRD	t	\N
4282	295	FIREFLY	t	\N
4283	295	G4	t	\N
4284	295	G5	t	\N
4285	295	G6	t	\N
4286	295	G8	t	\N
4287	295	GRAND AM	t	\N
4288	295	GRAND PRIX	t	\N
4289	295	GTO	t	\N
4290	295	LAURENTIAN	t	\N
4291	295	LEMANS	t	\N
4292	295	MONTANA	t	\N
4293	295	PARISIENNE	t	\N
4294	295	PHOENIX	t	\N
4295	295	SOLSTICE	t	\N
4296	295	SUNBIRD	t	\N
4297	295	SUNFIRE	t	\N
4298	295	SUNRUNNER	t	\N
4299	295	TEMPEST	t	\N
4300	295	TORPEDO	t	\N
4301	295	TORRENT	t	\N
4302	295	TRANS SPORT	t	\N
4303	295	VIBE	t	\N
4304	295	WAVE	t	\N
4305	12	356	t	\N
4306	12	718 SPYDER	t	\N
4307	12	911	t	\N
4308	12	911 GT2	t	\N
4309	12	911 GT3	t	\N
4310	12	911 R	t	\N
4311	12	911 S/T	t	\N
4312	12	912	t	\N
4313	12	914	t	\N
4314	12	918 SPYDER	t	\N
4315	12	928	t	\N
4316	12	959	t	\N
4317	12	968	t	\N
4318	12	CARRERA GT	t	\N
4319	12	CAYMAN GT4	t	\N
4320	12	TAYCAN	t	\N
4321	296	118NE	t	\N
4322	296	PADMINI	t	\N
4323	297	БАГГИ TYPE 1	t	\N
4324	297	ДРАГСТЕР	t	\N
4325	297	ДРИФТ-КАР	t	\N
4326	297	ФОРМУЛА	t	\N
4327	297	GT & TOURING	t	\N
4328	297	ХОТ-РОД И КАСТОМ	t	\N
4329	297	OFFROAD	t	\N
4330	297	СПОРТПРОТОТИП	t	\N
4331	297	RALLY/CROSS	t	\N
4332	297	САМОДЕЛКИ	t	\N
4333	297	SHORTCUT	t	\N
4334	298	ARENA	t	\N
4335	298	EXORA	t	\N
4336	298	GEN-2	t	\N
4337	298	INSPIRA	t	\N
4338	298	IRIZ	t	\N
4339	298	JUARA	t	\N
4340	298	PERDANA	t	\N
4341	298	PERSONA	t	\N
4342	298	PREVE	t	\N
4343	298	PUTRA	t	\N
4344	298	SAGA	t	\N
4345	298	SATRIA	t	\N
4346	298	SAVVY	t	\N
4347	298	TIARA	t	\N
4348	298	WAJA	t	\N
4349	298	WIRA (400 SERIES)	t	\N
4350	298	X50	t	\N
4351	298	X70	t	\N
4352	299	G-MODELL	t	\N
4353	299	PINZGAUER	t	\N
4354	300	GTB	t	\N
4355	300	GTE	t	\N
4356	301	DUODUO	t	\N
4357	302	K50	t	\N
4358	303	TAGA H	t	\N
4359	304	3	t	\N
4360	304	5	t	\N
4361	305	MANGUSTA	t	\N
4362	306	RD6	t	\N
4363	307	TYPE 62-2	t	\N
4364	308	1500	t	\N
4365	308	DAKOTA	t	\N
4366	308	PROMASTER CITY	t	\N
4367	308	RAMPAGE	t	\N
4368	308	V1000	t	\N
4369	309	GENTRA	t	\N
4370	309	MATIZ	t	\N
4371	309	NEXIA R3	t	\N
4372	309	R2	t	\N
4373	309	R4	t	\N
4374	310	MAGNUM	t	\N
4375	311	SCIMITAR SABRE	t	\N
4376	312	TROPICA ROADSTER	t	\N
4377	4	10	t	\N
4378	4	11	t	\N
4379	4	12	t	\N
4380	4	14	t	\N
4381	4	15	t	\N
4382	4	16	t	\N
4383	4	17	t	\N
4384	4	18	t	\N
4385	4	19	t	\N
4386	4	20	t	\N
4387	4	21	t	\N
4388	4	25	t	\N
4389	4	30	t	\N
4390	4	4	t	\N
4391	4	4CV	t	\N
4392	4	5	t	\N
4393	4	6	t	\N
4394	4	8	t	\N
4395	4	9	t	\N
4396	4	ALASKAN	t	\N
4397	4	ARKANA	t	\N
4398	4	AUSTRAL	t	\N
4399	4	AVANTIME	t	\N
4400	4	BOREAL	t	\N
4401	4	CARAVELLE	t	\N
4402	4	CELTAQUATRE	t	\N
4403	4	CITY K-ZE	t	\N
4404	4	CLIO RS	t	\N
4405	4	SYMBOL	t	\N
4406	4	CLIO V6	t	\N
4407	4	DAUPHINE	t	\N
4408	4	DOKKER	t	\N
4409	4	DUSTER	t	\N
4410	4	FILANTE	t	\N
4411	4	FLORIDE	t	\N
4412	4	FREGATE	t	\N
4413	4	FUEGO	t	\N
4414	4	GRAND KOLEOS	t	\N
4415	4	KAPTUR	t	\N
4416	4	KARDIAN	t	\N
4417	4	KIGER	t	\N
4418	4	KWID	t	\N
4419	4	LODGY	t	\N
4420	4	LOGAN	t	\N
4421	4	LUTECIA	t	\N
4422	4	MEGANE	t	\N
4423	4	MEGANE E-TECH	t	\N
4424	4	MEGANE RS	t	\N
4425	4	MODUS	t	\N
4426	4	QM6	t	\N
4427	4	RAFALE	t	\N
4428	4	RAPID	t	\N
4429	4	RODEO	t	\N
4430	4	SAFRANE	t	\N
4431	4	SANDERO	t	\N
4432	4	SANDERO RS	t	\N
4433	4	SCENIC	t	\N
4434	4	SPORT SPIDER	t	\N
4435	4	SYMBIOZ	t	\N
4436	4	TALIANT	t	\N
4437	4	TRAFIC	t	\N
4438	4	TRIBER	t	\N
4439	4	TWIZY	t	\N
4440	4	VEL SATIS	t	\N
4441	4	VIVASTELLA	t	\N
4442	4	ZOE	t	\N
4443	313	ARSENAL	t	\N
4444	313	BEAST	t	\N
4445	313	TANK	t	\N
4446	314	CONCEPT_ONE	t	\N
4447	314	C TWO	t	\N
4448	314	NEVERA	t	\N
4449	315	CHOPSTER	t	\N
4450	316	F7	t	\N
4451	316	MARVEL R	t	\N
4452	316	R7	t	\N
4453	317	R1S	t	\N
4454	317	R1T	t	\N
4455	318	750	t	\N
4456	318	CLEVER	t	\N
4457	318	D6	t	\N
4458	318	D7	t	\N
4459	318	E50	t	\N
4460	318	I5	t	\N
4461	318	I6	t	\N
4462	318	I6 MAX	t	\N
4463	318	IMAX8	t	\N
4464	318	M7	t	\N
4465	318	MARVEL X	t	\N
4466	318	RX3	t	\N
4467	318	RX3 PRO	t	\N
4468	318	RX5	t	\N
4469	318	RX5 MAX	t	\N
4470	318	RX8	t	\N
4471	318	RX9	t	\N
4472	318	WHALE	t	\N
4473	319	20	t	\N
4474	319	20/25	t	\N
4475	319	BOAT TAIL	t	\N
4476	319	CAMARGUE	t	\N
4477	319	CORNICHE	t	\N
4478	319	CULLINAN	t	\N
4479	319	DAWN	t	\N
4480	319	GHOST	t	\N
4481	319	PARK WARD	t	\N
4482	319	PHANTOM	t	\N
4483	319	SILVER CLOUD	t	\N
4484	319	SILVER GHOST	t	\N
4485	319	SILVER SERAPH	t	\N
4486	319	SILVER SHADOW	t	\N
4487	319	SILVER SPIRIT	t	\N
4488	319	SILVER SPUR	t	\N
4489	319	SILVER WRAITH	t	\N
4490	319	SPECTRE	t	\N
4491	319	WRAITH	t	\N
4492	320	LIGHTNING	t	\N
4493	321	CONCEPT	t	\N
4494	39	100	t	\N
4495	39	14	t	\N
4496	39	45	t	\N
4497	39	600	t	\N
4498	39	800	t	\N
4499	39	MAESTRO	t	\N
4500	39	METRO	t	\N
4501	39	MINI	t	\N
4502	39	MONTEGO	t	\N
4503	39	P3	t	\N
4504	39	P4	t	\N
4505	39	P6	t	\N
4506	39	SD1	t	\N
4507	39	STREETWISE	t	\N
4508	322	01	t	\N
4509	322	ADAMAS	t	\N
4510	323	С24	t	\N
4511	23	600	t	\N
4512	23	90	t	\N
4513	23	93	t	\N
4514	23	95	t	\N
4515	23	96	t	\N
4516	23	99	t	\N
4517	23	9-2X	t	\N
4518	23	9-4X	t	\N
4519	23	9-7X	t	\N
4520	23	SONETT	t	\N
4521	324	H5	t	\N
4522	325	QUICK	t	\N
4523	325	SAINA	t	\N
4524	325	SHAHIN	t	\N
4525	325	TIBA	t	\N
4526	326	S7	t	\N
4527	326	S281	t	\N
4528	327	QM3	t	\N
4529	327	QM5	t	\N
4530	327	QM6	t	\N
4531	327	SM3	t	\N
4532	327	SM5	t	\N
4533	327	SM6	t	\N
4534	327	SM7	t	\N
4535	327	XM3	t	\N
4536	328	ALREEM	t	\N
4537	328	S24	t	\N
4538	329	PS-10	t	\N
4539	330	ASTRA	t	\N
4540	330	AURA	t	\N
4541	330	ION	t	\N
4542	330	LS	t	\N
4543	330	LW	t	\N
4544	330	OUTLOOK	t	\N
4545	330	RELAY	t	\N
4546	330	SC	t	\N
4547	330	SKY	t	\N
4548	330	SL	t	\N
4549	330	SW	t	\N
4550	330	VUE	t	\N
4551	331	FR-S	t	\N
4552	331	IA	t	\N
4553	331	IM	t	\N
4554	331	IQ	t	\N
4555	331	TC	t	\N
4556	331	XA	t	\N
4557	331	XB	t	\N
4558	331	XD	t	\N
4559	332	TERRA	t	\N
4560	332	TRAVELER	t	\N
4561	333	MODEL J	t	\N
4562	3	132	t	\N
4563	3	133	t	\N
4564	3	ARONA	t	\N
4565	3	ATECA	t	\N
4566	3	FURA	t	\N
4567	3	IBIZA CUPRA	t	\N
4568	3	LEON CUPRA	t	\N
4569	3	MALAGA	t	\N
4570	3	MARBELLA	t	\N
4571	3	RONDA	t	\N
4572	3	TARRACO	t	\N
4573	334	M5	t	\N
4574	334	M7	t	\N
4575	334	M9	t	\N
4576	334	SF5	t	\N
4577	335	C31	t	\N
4578	335	C32	t	\N
4579	335	C51	t	\N
4580	335	C52	t	\N
4581	335	C61	t	\N
4582	335	C81	t	\N
4583	336	NOBLE	t	\N
4584	336	SCEO	t	\N
4585	337	1300/1500	t	\N
4586	337	1307	t	\N
4587	338	100 SERIES	t	\N
4588	338	105, 120	t	\N
4589	338	1200	t	\N
4590	338	440	t	\N
4591	338	445	t	\N
4592	338	CITIGO	t	\N
4593	338	ELROQ	t	\N
4594	338	ELROQ RS	t	\N
4595	338	ENYAQ	t	\N
4596	338	ENYAQ COUPE	t	\N
4597	338	ENYAQ COUPE RS	t	\N
4598	338	ENYAQ RS	t	\N
4599	338	FABIA	t	\N
4600	338	FABIA RS	t	\N
4601	338	FAVORIT	t	\N
4602	338	FELICIA	t	\N
4603	338	FORMAN	t	\N
4604	338	KAMIQ	t	\N
4605	338	KAROQ	t	\N
4606	338	KODIAQ	t	\N
4607	338	KODIAQ GT	t	\N
4608	338	KODIAQ RS	t	\N
4609	338	KUSHAQ	t	\N
4610	338	KYLAQ	t	\N
4611	338	OCTAVIA	t	\N
4612	338	OCTAVIA RS	t	\N
4613	338	POPULAR	t	\N
4614	338	RAPID	t	\N
4615	338	ROOMSTER	t	\N
4616	338	SCALA	t	\N
4617	338	SLAVIA	t	\N
4618	338	SUPERB	t	\N
4619	338	YETI	t	\N
4620	339	ET5	t	\N
4621	339	HT-I	t	\N
4622	340	EV6	t	\N
4623	40	FORTWO	t	\N
4624	40	#1	t	\N
4625	40	#3	t	\N
4626	40	#5	t	\N
4627	341	С-1Л	t	\N
4628	341	С-3А	t	\N
4629	341	С-3Д	t	\N
4630	341	С-3Л	t	\N
4631	342	HC	t	\N
4632	342	HS	t	\N
4633	342	KRS	t	\N
4634	342	KRX	t	\N
4635	343	SP7	t	\N
4636	343	ST6	t	\N
4637	343	ST8	t	\N
4638	343	ST9	t	\N
4639	344	A5	t	\N
4640	344	DX3	t	\N
4641	344	DX5	t	\N
4642	344	DX7	t	\N
4643	344	DX8	t	\N
4644	344	DX8S	t	\N
4645	344	LIONCEL	t	\N
4646	344	S06	t	\N
4647	344	S07	t	\N
4648	344	S09	t	\N
4649	344	SOVERAN	t	\N
4650	344	V3	t	\N
4651	344	V5	t	\N
4652	344	V6 CROSS	t	\N
4653	345	R42	t	\N
4654	346	C12	t	\N
4655	346	C8	t	\N
4656	347	ACTYON	t	\N
4657	347	ACTYON SPORTS	t	\N
4658	347	CHAIRMAN	t	\N
4659	347	ISTANA	t	\N
4660	347	KALLISTA	t	\N
4661	347	KORANDO	t	\N
4662	347	KORANDO FAMILY	t	\N
4663	347	KORANDO SPORTS	t	\N
4664	347	KORANDO TURISMO	t	\N
4665	347	KYRON	t	\N
4666	347	MUSSO	t	\N
4667	347	NOMAD	t	\N
4668	347	REXTON	t	\N
4669	347	REXTON SPORTS	t	\N
4670	347	RODIUS	t	\N
4671	347	STAVIC	t	\N
4672	347	TIVOLI	t	\N
4673	347	XLV	t	\N
4674	347	TORRES	t	\N
4675	348	S9	t	\N
4676	349	1500	t	\N
4677	349	HAFLINGER	t	\N
4678	350	GOLDEN HAWK	t	\N
4679	14	1000	t	\N
4680	14	360	t	\N
4681	14	ALCYONE	t	\N
4682	14	ASCENT	t	\N
4683	14	BAJA	t	\N
4684	14	BIGHORN	t	\N
4685	14	BISTRO	t	\N
4686	14	BRAT	t	\N
4687	14	CHIFFON	t	\N
4688	14	CROSSTREK	t	\N
4689	14	DEX	t	\N
4690	14	DIAS WAGON	t	\N
4691	14	DOMINGO	t	\N
4692	14	EXIGA	t	\N
4693	14	IMPREZA WRX	t	\N
4694	14	IMPREZA WRX STI	t	\N
4695	14	LEGACY LANCASTER	t	\N
4696	14	LEONE	t	\N
4697	14	LIBERO	t	\N
4698	14	LUCRA	t	\N
4699	14	PLEO	t	\N
4700	14	PLEO PLUS	t	\N
4701	14	R1	t	\N
4702	14	R2	t	\N
4703	14	REX	t	\N
4704	14	SAMBAR	t	\N
4705	14	SOLTERRA	t	\N
4706	14	STELLA	t	\N
4707	14	TRAILSEEKER	t	\N
4708	14	TRAVIQ	t	\N
4709	14	TREZIA	t	\N
4710	14	UNCHARTED	t	\N
4711	14	VIVIO	t	\N
4712	14	WRX	t	\N
4713	14	WRX STI	t	\N
4714	14	XT	t	\N
4715	21	ACROSS	t	\N
4716	21	AERIO	t	\N
4717	21	ALTO LAPIN	t	\N
4718	21	APV	t	\N
4719	21	BEIDOUXING	t	\N
4720	21	CAPPUCCINO	t	\N
4721	21	CARA	t	\N
4722	21	CARRY	t	\N
4723	21	CELERIO	t	\N
4724	21	CERVO	t	\N
4725	21	CIAZ	t	\N
4726	21	CULTUS	t	\N
4727	21	DZIRE	t	\N
4728	21	EECO	t	\N
4729	21	EQUATOR	t	\N
4730	21	ERTIGA	t	\N
4731	21	ESCUDO	t	\N
4732	21	ESTEEM	t	\N
4733	21	EVERY	t	\N
4734	21	E VITARA	t	\N
4735	21	FORENZA	t	\N
4736	21	FRONTE	t	\N
4737	21	FRONX	t	\N
4738	21	HUSTLER	t	\N
4739	21	INVICTO	t	\N
4740	21	KEI	t	\N
4741	21	LANDY	t	\N
4742	21	MIGHTY BOY	t	\N
4743	21	MR WAGON	t	\N
4744	21	PALETTE	t	\N
4745	21	RENO	t	\N
4746	21	SIDEKICK	t	\N
4747	21	SOLIO	t	\N
4748	21	SPACIA	t	\N
4749	21	SWACE	t	\N
4750	21	S-PRESSO	t	\N
4751	21	TWIN	t	\N
4752	21	VERONA	t	\N
4753	21	VICTORIS	t	\N
4754	21	WAGON R	t	\N
4755	21	WAGON R SMILE	t	\N
4756	21	XBEE	t	\N
4757	21	XL7	t	\N
4758	21	X-90	t	\N
4759	351	G01	t	\N
4760	351	G01F	t	\N
4761	351	G03F	t	\N
4762	351	G05	t	\N
4763	351	G05 PRO	t	\N
4764	351	TIGER	t	\N
4765	351	X3	t	\N
4766	351	SHINERAY X30	t	\N
4767	351	X7	t	\N
4768	352	AQUILA	t	\N
4769	352	C10	t	\N
4770	352	C190	t	\N
4771	352	C-30	t	\N
4772	352	VEGA	t	\N
4773	352	ROAD PARTNER	t	\N
4774	352	TAGER	t	\N
4775	353	1510	t	\N
4776	353	AVENGER	t	\N
4777	353	HORIZON	t	\N
4778	353	RANCHO	t	\N
4779	353	SAMBA	t	\N
4780	353	SOLARA	t	\N
4781	353	TAGORA	t	\N
4782	354	300	t	\N
4783	354	400	t	\N
4784	354	500	t	\N
4785	354	700	t	\N
4786	355	ARIA	t	\N
4787	355	CURVV	t	\N
4788	355	ESTATE	t	\N
4789	355	INDICA	t	\N
4790	355	INDIGO	t	\N
4791	355	NANO	t	\N
4792	355	SAFARI	t	\N
4793	355	SIERRA	t	\N
4794	355	SUMO	t	\N
4795	355	SUMO GRANDE	t	\N
4796	355	TELCOLINE	t	\N
4797	355	XENON	t	\N
4798	356	57	t	\N
4799	356	77	t	\N
4800	356	80	t	\N
4801	356	87	t	\N
4802	356	T600	t	\N
4803	356	T603	t	\N
4804	356	T613	t	\N
4805	356	T700	t	\N
4806	357	ZERO	t	\N
4807	358	T4	t	\N
4808	358	T7	t	\N
4809	358	T8	t	\N
4810	359	CYBERTRUCK	t	\N
4811	359	MODEL 3	t	\N
4812	359	MODEL S	t	\N
4813	359	MODEL X	t	\N
4814	359	MODEL Y	t	\N
4815	359	ROADSTER	t	\N
4816	360	TRANSFORMER	t	\N
4817	361	CITY	t	\N
4818	362	CENTURY	t	\N
4819	362	DRAGON	t	\N
4820	363	ADMIRAL	t	\N
4821	364	KARTAL	t	\N
4822	364	MURAT 124	t	\N
4823	364	MURAT 131	t	\N
4824	364	SAHIN	t	\N
4825	364	SERCE	t	\N
4826	18	2000GT	t	\N
4827	18	4RUNNER	t	\N
4828	18	AGYA	t	\N
4829	18	ALLEX	t	\N
4830	18	ALLION	t	\N
4831	18	ALPHARD	t	\N
4832	18	ALTEZZA	t	\N
4833	18	AQUA	t	\N
4834	18	ARISTO	t	\N
4835	18	AURION	t	\N
4836	18	AVALON	t	\N
4837	18	AVANZA	t	\N
4838	18	AVENSIS VERSO	t	\N
4839	18	AYGO X	t	\N
4840	18	BB	t	\N
4841	18	BELTA	t	\N
4842	18	BLADE	t	\N
4843	18	BLIZZARD	t	\N
4844	18	BREVIS	t	\N
4845	18	BZ	t	\N
4846	18	BZ3	t	\N
4847	18	BZ3C	t	\N
4848	18	BZ3X	t	\N
4849	18	BZ4X	t	\N
4850	18	BZ5	t	\N
4851	18	BZ7	t	\N
4852	18	CALDINA	t	\N
4853	18	CAMI	t	\N
4854	18	CAMRY SOLARA	t	\N
4855	18	CARINA E	t	\N
4856	18	CARINA ED	t	\N
4857	18	CAVALIER	t	\N
4858	18	CELSIOR	t	\N
4859	18	CENTURY	t	\N
4860	18	CHASER	t	\N
4861	18	CLASSIC	t	\N
4862	18	COMFORT	t	\N
4863	18	COMS	t	\N
4864	18	COPEN	t	\N
4865	18	COROLLA CROSS	t	\N
4866	18	COROLLA II	t	\N
4867	18	COROLLA LEVIN	t	\N
4868	18	COROLLA RUMION	t	\N
4869	18	COROLLA SPACIO	t	\N
4870	18	CORONA	t	\N
4871	18	CORONA EXIV	t	\N
4872	18	CORSA	t	\N
4873	18	CRESSIDA	t	\N
4874	18	CRESTA	t	\N
4875	18	CROWN	t	\N
4876	18	CROWN KLUGER	t	\N
4877	18	CROWN MAJESTA	t	\N
4878	18	CURREN	t	\N
4879	18	CYNOS	t	\N
4880	18	C-HR	t	\N
4881	18	C-HR+	t	\N
4882	18	DUET	t	\N
4883	18	ECHO	t	\N
4884	18	ESQUIRE	t	\N
4885	18	ESTIMA	t	\N
4886	18	ETIOS	t	\N
4887	18	FORTUNER	t	\N
4888	18	FRONTLANDER	t	\N
4889	18	FUNCARGO	t	\N
4890	18	GAIA	t	\N
4891	18	GR86	t	\N
4892	18	GRAND HIACE	t	\N
4893	18	GRAND HIGHLANDER	t	\N
4894	18	GRANVIA	t	\N
4895	18	GR GT	t	\N
4896	18	HARRIER	t	\N
4897	18	HILUX CHAMP	t	\N
4898	18	HILUX SURF	t	\N
4899	18	INNOVA	t	\N
4900	18	IPSUM	t	\N
4901	18	IQ	t	\N
4902	18	ISIS	t	\N
4903	18	IST	t	\N
4904	18	IZOA	t	\N
4905	18	JPN TAXI	t	\N
4906	18	KLUGER	t	\N
4907	18	LAND CRUISER FJ	t	\N
4908	18	LAND CRUISER PRADO	t	\N
4909	18	LEVIN	t	\N
4910	18	LITE ACE	t	\N
4911	18	MARK II	t	\N
4912	18	MARK X	t	\N
4913	18	MARK X ZIO	t	\N
4914	18	MASTERACE SURF	t	\N
4915	18	MATRIX	t	\N
4916	18	MEGA CRUISER	t	\N
4917	18	MIRAI	t	\N
4918	18	MODEL F	t	\N
4919	18	MR-S	t	\N
4920	18	NADIA	t	\N
4921	18	NOAH	t	\N
4922	18	OPA	t	\N
4923	18	ORIGIN	t	\N
4924	18	PASSO	t	\N
4925	18	PASSO SETTE	t	\N
4926	18	PIXIS EPOCH	t	\N
4927	18	PIXIS JOY	t	\N
4928	18	PIXIS MEGA	t	\N
4929	18	PIXIS SPACE	t	\N
4930	18	PIXIS VAN	t	\N
4931	18	PLATZ	t	\N
4932	18	PORTE	t	\N
4933	18	PREMIO	t	\N
4934	18	PREVIA	t	\N
4935	18	PRIUS V (+)	t	\N
4936	18	PRIUS ALPHA	t	\N
4937	18	PRIUS C	t	\N
4938	18	PROACE	t	\N
4939	18	PROACE CITY	t	\N
4940	18	PROBOX	t	\N
4941	18	PROGRES	t	\N
4942	18	PRONARD	t	\N
4943	18	PUBLICA	t	\N
4944	18	RACTIS	t	\N
4945	18	RAIZE	t	\N
4946	18	RAUM	t	\N
4947	18	REGIUS	t	\N
4948	18	REGIUSACE	t	\N
4949	18	REIZ	t	\N
4950	18	ROOMY	t	\N
4951	18	RUMION	t	\N
4952	18	RUSH	t	\N
4953	18	SAI	t	\N
4954	18	SCEPTER	t	\N
4955	18	SERA	t	\N
4956	18	SIENNA	t	\N
4957	18	SIENTA	t	\N
4958	18	SOARER	t	\N
4959	18	SOLUNA	t	\N
4960	18	SPADE	t	\N
4961	18	SPARKY	t	\N
4962	18	SPORTS 800	t	\N
4963	18	SPRINTER	t	\N
4964	18	SPRINTER CARIB	t	\N
4965	18	SPRINTER MARINO	t	\N
4966	18	SPRINTER TRUENO	t	\N
4967	18	STARLET CROSS	t	\N
4968	18	SUCCEED	t	\N
4969	18	TACOMA	t	\N
4970	18	TANK	t	\N
4971	18	TERCEL	t	\N
4972	18	TOURING HIACE	t	\N
4973	18	TOWN ACE	t	\N
4974	18	URBAN CRUISER TAISOR	t	\N
4975	18	VANGUARD	t	\N
4976	18	VELLFIRE	t	\N
4977	18	VELOZ	t	\N
4978	18	VENZA	t	\N
4979	18	VEROSSA	t	\N
4980	18	VERSO-S	t	\N
4981	18	VIOS	t	\N
4982	18	VISTA	t	\N
4983	18	VITZ	t	\N
4984	18	VOLTZ	t	\N
4985	18	VOXY	t	\N
4986	18	WIGO	t	\N
4987	18	WILDLANDER	t	\N
4988	18	WILL	t	\N
4989	18	WILL CYPHA	t	\N
4990	18	WINDOM	t	\N
4991	18	WISH	t	\N
4992	18	XA	t	\N
4993	18	YARIS CROSS	t	\N
4994	18	ZELAS	t	\N
4995	365	1.1	t	\N
4996	365	600	t	\N
4997	365	P 601	t	\N
4998	365	P50	t	\N
4999	366	TRAMONTANA	t	\N
5000	367	ACCLAIM	t	\N
5001	367	GT6	t	\N
5002	367	SPITFIRE	t	\N
5003	367	STAG	t	\N
5004	367	TR3	t	\N
5005	367	TR4	t	\N
5006	367	TR6	t	\N
5007	367	TR7	t	\N
5008	367	TR8	t	\N
5009	368	E8	t	\N
5010	368	E9	t	\N
5011	368	EMKOO	t	\N
5012	368	EMPOW	t	\N
5013	368	ES9	t	\N
5014	368	GA4 PLUS	t	\N
5015	368	GA6	t	\N
5016	368	GA8	t	\N
5017	368	GE3	t	\N
5018	368	GM6	t	\N
5019	368	GM8	t	\N
5020	368	GS3	t	\N
5021	368	GS3 POWER	t	\N
5022	368	GS4	t	\N
5023	368	GS4 MAX	t	\N
5024	368	GS4 PLUS	t	\N
5025	368	GS5	t	\N
5026	368	GS8	t	\N
5027	368	M6	t	\N
5028	368	M6 MAX	t	\N
5029	368	M6 PRO	t	\N
5030	368	M8	t	\N
5031	368	S7	t	\N
5032	368	S9	t	\N
5033	369	280	t	\N
5034	369	350	t	\N
5035	369	390	t	\N
5036	369	400	t	\N
5037	369	420	t	\N
5038	369	450	t	\N
5039	369	CERBERA	t	\N
5040	369	CHIMAERA	t	\N
5041	369	GRIFFITH	t	\N
5042	369	SAGARIS	t	\N
5043	369	S-SERIES	t	\N
5044	369	TAIMAR	t	\N
5045	369	TAMORA	t	\N
5046	369	TASMIN	t	\N
5047	369	TUSCAN	t	\N
5048	370	3151	t	\N
5049	370	3153	t	\N
5050	370	3159	t	\N
5051	370	3160	t	\N
5052	370	3162 SIMBIR	t	\N
5053	370	469	t	\N
5054	370	АСТЕРО	t	\N
5055	370	HUNTER	t	\N
5056	370	PATRIOT	t	\N
5057	370	PICKUP	t	\N
5058	371	CAN-AM	t	\N
5059	371	GTR	t	\N
5060	371	RS	t	\N
5061	372	5	t	\N
5062	373	ADAM	t	\N
5063	373	AMPERA	t	\N
5064	373	ASTRA	t	\N
5065	373	CARLTON	t	\N
5066	373	CAVALIER	t	\N
5067	373	CHEVETTE	t	\N
5068	373	COMBO	t	\N
5069	373	CORSA	t	\N
5070	373	FIRENZA	t	\N
5071	373	FRONTERA	t	\N
5072	373	INSIGNIA	t	\N
5073	373	LOTUS CARLTON	t	\N
5074	373	MERIVA	t	\N
5075	373	MOKKA	t	\N
5076	373	MONARO	t	\N
5077	373	OMEGA	t	\N
5078	373	ROYALE	t	\N
5079	373	TIGRA	t	\N
5080	373	VECTRA	t	\N
5081	373	VELOX	t	\N
5082	373	VENTORA	t	\N
5083	373	VICEROY	t	\N
5084	373	VICTOR	t	\N
5085	373	VIVA	t	\N
5086	373	VIVARO	t	\N
5087	373	VXR8	t	\N
5088	373	ZAFIRA	t	\N
5089	374	1111 ОКА	t	\N
5090	374	2101	t	\N
5091	374	2102	t	\N
5092	374	2103	t	\N
5093	374	2104	t	\N
5094	374	2105	t	\N
5095	374	2106	t	\N
5096	374	2107	t	\N
5097	374	2108	t	\N
5098	374	2109	t	\N
5099	374	21099	t	\N
5100	374	2110	t	\N
5101	374	2111	t	\N
5102	374	2112	t	\N
5103	374	2113	t	\N
5104	374	2114	t	\N
5105	374	2115	t	\N
5106	374	2120 НАДЕЖДА	t	\N
5107	374	2121 (4X4)	t	\N
5108	374	2123	t	\N
5109	374	2129	t	\N
5110	374	2131 (4X4)	t	\N
5111	374	PRIORA	t	\N
5112	374	2328	t	\N
5113	374	2329	t	\N
5114	374	AURA	t	\N
5115	374	AZIMUT	t	\N
5116	374	EL LADA	t	\N
5117	374	E-LARGUS	t	\N
5118	374	GRANTA	t	\N
5119	374	ISKRA	t	\N
5120	374	KALINA	t	\N
5121	374	LARGUS	t	\N
5122	374	NIVA	t	\N
5123	374	NIVA LEGEND	t	\N
5124	374	NIVA TRAVEL	t	\N
5125	374	REVOLUTION	t	\N
5126	374	VESTA	t	\N
5127	374	XRAY	t	\N
5128	374	X-CROSS 5	t	\N
5129	375	M12	t	\N
5130	375	W8 TWIN TURBO	t	\N
5131	376	210	t	\N
5132	376	260 LM	t	\N
5133	376	300 ATLANTIQUE	t	\N
5134	376	400 GT	t	\N
5135	377	D60 PLUS	t	\N
5136	377	VX6	t	\N
5137	377	V-ONLINE	t	\N
5138	378	BOLDEN	t	\N
5139	378	U70	t	\N
5140	378	U70 PRO	t	\N
5141	378	U75 PLUS	t	\N
5142	378	VX7	t	\N
5143	379	LUX A2.0	t	\N
5144	379	LUX SA2.0	t	\N
5145	379	VF6	t	\N
5146	379	VF7	t	\N
5147	379	VF8	t	\N
5148	379	VF9	t	\N
5149	380	C50	t	\N
5150	380	K30	t	\N
5151	380	K40	t	\N
5152	380	K50	t	\N
5153	20	181	t	\N
5154	20	ARTEON	t	\N
5155	20	ARTEON R	t	\N
5156	20	ATLAS	t	\N
5157	20	ATLAS CROSS SPORT	t	\N
5158	20	CORRADO	t	\N
5159	20	C-TREK	t	\N
5160	20	DERBY	t	\N
5161	20	EUROVAN	t	\N
5162	20	GOL	t	\N
5163	20	GOLF COUNTRY	t	\N
5164	20	GOLF GTI	t	\N
5165	20	GOLF R	t	\N
5166	20	GOLF R32	t	\N
5167	20	GOLF SPORTSVAN	t	\N
5168	20	ID.3	t	\N
5169	20	ID.4	t	\N
5170	20	ID.5	t	\N
5171	20	ID.6	t	\N
5172	20	ID.7	t	\N
5173	20	ID.BUZZ	t	\N
5174	20	ID.ERA 9X	t	\N
5175	20	ID.UNYX	t	\N
5176	20	ID.UNYX 06	t	\N
5177	20	ID.UNYX 07	t	\N
5178	20	ID.UNYX 08	t	\N
5179	20	ILTIS	t	\N
5180	20	K70	t	\N
5181	20	KARMANN-GHIA	t	\N
5182	20	LAMANDO	t	\N
5183	20	LAVIDA	t	\N
5184	20	LAVIDA XR	t	\N
5185	20	LUPO GTI	t	\N
5186	20	MAGOTAN	t	\N
5187	20	PARATI	t	\N
5188	20	PASSAT (NORTH AMERICA AND CHINA)	t	\N
5189	20	PHIDEON	t	\N
5190	20	POINTER	t	\N
5191	20	POLO GTI	t	\N
5192	20	POLO R WRC	t	\N
5193	20	QUANTUM	t	\N
5194	20	RABBIT	t	\N
5195	20	ROUTAN	t	\N
5196	20	SAGITAR	t	\N
5197	20	SANTANA	t	\N
5198	20	SCIROCCO R	t	\N
5199	20	SPACEFOX	t	\N
5200	20	SP-2	t	\N
5201	20	TACQUA	t	\N
5202	20	TAIGO	t	\N
5203	20	TAIGUN	t	\N
5204	20	TALAGON	t	\N
5205	20	TAOS	t	\N
5206	20	TARO	t	\N
5207	20	TAVENDOR	t	\N
5208	20	TAYRON	t	\N
5209	20	TERAMONT	t	\N
5210	20	THARU	t	\N
5211	20	THARU XR	t	\N
5212	20	TIGUAN R	t	\N
5213	20	TOUAREG R	t	\N
5214	20	TRANSPORTER	t	\N
5215	20	TYPE 1	t	\N
5216	20	TYPE 166	t	\N
5217	20	TYPE 2	t	\N
5218	20	TYPE 3	t	\N
5219	20	TYPE 4	t	\N
5220	20	TYPE 82	t	\N
5221	20	T-CROSS	t	\N
5222	20	T-ROC	t	\N
5223	20	T-ROC R	t	\N
5224	20	UP!	t	\N
5225	20	VENTO	t	\N
5226	20	VILORAN	t	\N
5227	20	VOYAGE	t	\N
5228	20	XL1	t	\N
5229	35	120 SERIES	t	\N
5230	35	140 SERIES	t	\N
5231	35	164	t	\N
5232	35	240 SERIES	t	\N
5233	35	260 SERIES	t	\N
5234	35	300 SERIES	t	\N
5235	35	440	t	\N
5236	35	480	t	\N
5237	35	66	t	\N
5238	35	740	t	\N
5239	35	760	t	\N
5240	35	780	t	\N
5241	35	940	t	\N
5242	35	960	t	\N
5243	35	C40	t	\N
5244	35	EC40	t	\N
5245	35	EM90	t	\N
5246	35	ES90	t	\N
5247	35	EX30	t	\N
5248	35	EX30 CROSS COUNTRY	t	\N
5249	35	EX40	t	\N
5250	35	EX60	t	\N
5251	35	EX90	t	\N
5252	35	LAPLANDER	t	\N
5253	35	P1800	t	\N
5254	35	P1900	t	\N
5255	35	PV444	t	\N
5256	35	PV544	t	\N
5257	35	S60 CROSS COUNTRY	t	\N
5258	35	V40 CROSS COUNTRY	t	\N
5259	35	V60 CROSS COUNTRY	t	\N
5260	35	V90 CROSS COUNTRY	t	\N
5261	35	XC40	t	\N
5262	381	CORDA	t	\N
5263	381	ESTINA	t	\N
5264	381	TINGO	t	\N
5265	382	COURAGE	t	\N
5266	382	DREAM	t	\N
5267	382	FREE	t	\N
5268	382	PASSION	t	\N
5269	382	TAISHAN	t	\N
5270	383	05	t	\N
5271	384	W22	t	\N
5272	384	W23	t	\N
5273	384	W26	t	\N
5274	384	W50	t	\N
5275	385	1.3	t	\N
5276	385	353	t	\N
5277	386	E5	t	\N
5278	386	EX5	t	\N
5279	386	EX6 PLUS	t	\N
5280	386	W6	t	\N
5281	387	SEIGHT	t	\N
5282	387	SEI & SPORT	t	\N
5283	388	05	t	\N
5284	388	07	t	\N
5285	388	80	t	\N
5286	388	COFFEE 01	t	\N
5287	388	GAOSHAN (HIGH MOUNTAIN)	t	\N
5288	388	LANSHAN (BLUE MOUNTAIN)	t	\N
5289	388	LATTE	t	\N
5290	388	MACCHIATO	t	\N
5291	388	MOCCA	t	\N
5292	388	V9X	t	\N
5293	388	VV5	t	\N
5294	388	VV6	t	\N
5295	388	VV7	t	\N
5296	389	GT	t	\N
5297	389	ROADSTER	t	\N
5298	390	CJ	t	\N
5299	390	JEEPSTER	t	\N
5300	390	MB	t	\N
5301	390	KNIGHT MODEL 20	t	\N
5302	391	AISHANG A100C	t	\N
5303	391	BINGUO	t	\N
5304	391	BINGUO S	t	\N
5305	391	HONGGUANG	t	\N
5306	391	HONGGUANG PLUS	t	\N
5307	391	HONGGUANG S	t	\N
5308	391	HONGGUANG V	t	\N
5309	391	JIACHEN	t	\N
5310	391	MINI EV	t	\N
5311	391	NANO EV	t	\N
5312	391	NEBULA	t	\N
5313	391	STARLIGHT	t	\N
5314	391	STARLIGHT 560	t	\N
5315	391	STARLIGHT 730	t	\N
5316	391	STARLIGHT S	t	\N
5317	391	STAR ASTA	t	\N
5318	391	SUNSHINE	t	\N
5319	391	VICTORY	t	\N
5320	391	XINGCHI	t	\N
5321	391	ZHIGUAN EV	t	\N
5322	392	FENYR SUPERSPORT	t	\N
5323	392	LYKAN HYPERSPORT	t	\N
5324	393	X-CROSS 7	t	\N
5325	393	X-CROSS 8	t	\N
5326	394	YOYO	t	\N
5327	395	SU7	t	\N
5328	395	YU7	t	\N
5329	396	PICKUP X3	t	\N
5330	396	SR-V X3	t	\N
5331	396	SUV X3	t	\N
5332	397	G3	t	\N
5333	397	G6	t	\N
5334	397	G7	t	\N
5335	397	G9	t	\N
5336	397	GX	t	\N
5337	397	MONA M03	t	\N
5338	397	P5	t	\N
5339	397	P7	t	\N
5340	397	P7I	t	\N
5341	397	P7+	t	\N
5342	397	X9	t	\N
5343	398	R3	t	\N
5344	399	EC30	t	\N
5345	399	SPICA	t	\N
5346	399	T70	t	\N
5347	400	007	t	\N
5348	400	008	t	\N
5349	401	YUNTU	t	\N
5350	402	FEELING	t	\N
5351	403	10	t	\N
5352	403	FLORIDA	t	\N
5353	403	SKALA	t	\N
5354	403	YUGO	t	\N
5355	404	965	t	\N
5356	404	966	t	\N
5357	404	968	t	\N
5358	404	CHANCE	t	\N
5359	404	1105 «ДАНА»	t	\N
5360	404	FORZA	t	\N
5361	404	SENS	t	\N
5362	404	1103 «СЛАВУТА»	t	\N
5363	404	1102 «ТАВРИЯ»	t	\N
5364	404	VIDA	t	\N
5365	404	LANOS	t	\N
5366	405	001	t	\N
5367	405	007	t	\N
5368	405	009	t	\N
5369	405	7X	t	\N
5370	405	8X	t	\N
5371	405	9X	t	\N
5372	405	MIX	t	\N
5373	405	X	t	\N
5374	406	E10	t	\N
5375	407	AURORA	t	\N
5376	407	ST1	t	\N
5377	407	TSR-S	t	\N
5378	408	RAINBOW	t	\N
5379	409	MK2	t	\N
5380	410	111	t	\N
5381	410	114	t	\N
5382	410	117	t	\N
5383	410	4104	t	\N
5384	411	101	t	\N
5385	411	102	t	\N
5386	411	110	t	\N
5387	412	COUPA	t	\N
5388	412	DOMY X5	t	\N
5389	412	DOMY X7	t	\N
5390	412	E200	t	\N
5391	412	NOMAD (RX6400)	t	\N
5392	412	SR9	t	\N
5393	412	T300	t	\N
5394	412	T500	t	\N
5395	412	T600	t	\N
5396	412	T700	t	\N
5397	412	T800	t	\N
5398	412	Z100	t	\N
5399	412	Z300	t	\N
5400	413	LEGENDA	t	\N
5401	413	RELIKT	t	\N
5402	413	TALISMAN	t	\N
5403	413	VOLAT	t	\N
5404	413	ZORKA	t	\N
5405	414	ADMIRAL	t	\N
5406	414	GRANDLION	t	\N
5407	414	GRAND TIGER	t	\N
5408	414	LANDMARK	t	\N
5409	414	TERRALORD	t	\N
\.


--
-- Data for Name: catalogo_tipos_vehiculo; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.catalogo_tipos_vehiculo (id_tipo, nombre, activo, fecha_registro) FROM stdin;
1	Automóvil	t	\N
2	Camioneta	t	\N
3	SUV	t	\N
4	Camión	t	\N
5	Omnibus	t	\N
6	Motocicleta	t	\N
7	Maquinaria	t	\N
8	Furgón	t	\N
\.


--
-- Data for Name: categorias_vehiculos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.categorias_vehiculos (id_categoria, id_playa, nombre, descripcion) FROM stdin;
1	\N	USADOS IMPORTADOS	Vehículos importados de otros países
2	\N	USADOS LOCALES	Vehículos usados con procedencia local
3	\N	0 KM	Vehículos nuevos sin uso
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.clientes (id_cliente, id_playa, tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, celular, email, direccion, ciudad, departamento, codigo_postal, estado_civil, profesion, lugar_trabajo, telefono_trabajo, antiguedad_laboral, direccion_laboral, ingreso_mensual, calificacion_actual, fecha_calificacion, mora_acumulada, observaciones, fecha_registro, activo) FROM stdin;
\.


--
-- Data for Name: config_calificaciones; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.config_calificaciones (id_config, id_playa, nombre, dias_atraso_desde, dias_atraso_hasta, calificacion, descripcion, activo) FROM stdin;
\.


--
-- Data for Name: contratos_venta; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.contratos_venta (id_contrato, id_playa, id_venta, numero_contrato, fecha_contrato, contenido_contrato, ruta_archivo, firmado, fecha_firma, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: cuentas; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.cuentas (id_cuenta, id_playa, nombre, tipo, banco, numero_cuenta, saldo_actual, activo, fecha_registro) FROM stdin;
\.


--
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.detalle_venta (id_detalle_venta, id_playa, id_venta, concepto, monto_unitario, cantidad, subtotal, observaciones) FROM stdin;
\.


--
-- Data for Name: documentos_importacion; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.documentos_importacion (nro_despacho, id_playa, fecha_despacho, cantidad_vehiculos, monto_pagado, pdf_despacho, pdf_certificados, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: documentos_inforconf; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.documentos_inforconf (id_documento, id_playa, id_cliente, fecha_consulta, calificacion, score, archivo_pdf, ruta_archivo, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: escribanias; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.escribanias (id_escribania, id_playa, nombre, telefono, email, direccion, activo, fecha_registro) FROM stdin;
\.


--
-- Data for Name: estados; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.estados (id_estado, id_playa, nombre, descripcion, color_hex, activo) FROM stdin;
\.


--
-- Data for Name: garantes; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.garantes (id_garante, id_playa, id_cliente, tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, celular, email, direccion, ciudad, estado_civil, relacion_cliente, lugar_trabajo, telefono_trabajo, antiguedad_laboral, direccion_laboral, ingreso_mensual, observaciones, fecha_registro, activo) FROM stdin;
\.


--
-- Data for Name: gastos_adicionales; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.gastos_adicionales (id_gasto_adicional, id_playa, tipo, monto, fecha, concepto, id_cuenta, id_movimiento, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: gastos_empresa; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.gastos_empresa (id_gasto_empresa, id_playa, id_tipo_gasto_empresa, descripcion, monto, fecha_gasto, periodo, proveedor, numero_factura, id_cuenta, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: gastos_productos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.gastos_productos (id_gasto_producto, id_playa, id_producto, id_tipo_gasto, descripcion, monto, fecha_gasto, proveedor, numero_factura, id_cuenta, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: historial_calificaciones; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.historial_calificaciones (id_historial, id_playa, id_cliente, id_venta, id_pago, calificacion_anterior, calificacion_nueva, motivo, fecha_calificacion) FROM stdin;
\.


--
-- Data for Name: historial_propietarios; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.historial_propietarios (id_historial, id_producto, nombre_propietario, documento, matricula, tipo_documentacion, documentacion_detalle, observaciones, fecha_adquisicion, fecha_venta, activo, fecha_registro, id_playa) FROM stdin;
\.


--
-- Data for Name: imagenes_productos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.imagenes_productos (id_imagen, id_playa, id_producto, nombre_archivo, ruta_archivo, imagen, imagen_con_marca, es_principal, orden, fecha_registro) FROM stdin;
\.


--
-- Data for Name: movimientos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.movimientos (id_movimiento, id_playa, id_cuenta_origen, id_cuenta_destino, monto, fecha, concepto, id_usuario, referencia) FROM stdin;
\.


--
-- Data for Name: pagares; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.pagares (id_pagare, id_venta, numero_pagare, numero_cuota, monto_cuota, fecha_vencimiento, tipo_pagare, id_estado, cancelado, saldo_pendiente, observaciones, fecha_registro, id_playa) FROM stdin;
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.pagos (id_pago, id_pagare, id_venta, id_cuenta, numero_recibo, fecha_pago, monto_pagado, forma_pago, numero_referencia, dias_atraso, mora_aplicada, descuento_aplicado, observaciones, fecha_registro, id_playa) FROM stdin;
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.productos (id_producto, id_playa, id_categoria, codigo_interno, tipo_vehiculo, marca, modelo, "año", color, chasis, motor, kilometraje, combustible, transmision, numero_puertas, capacidad_pasajeros, estado, procedencia, ubicacion_actual, costo_base, precio_contado_sugerido, precio_financiado_sugerido, precio_venta_minimo, entrega_inicial_sugerida, estado_disponibilidad, observaciones, fecha_ingreso, fecha_registro, activo, nro_despacho, nro_cert_nac, id_tipo_vehiculo, id_marca, id_modelo, id_usuario) FROM stdin;
322	4	1	\N	Automóvil	VOLKSWAGEN	GOL	2014	PLATEADO		\N	\N	\N	\N	\N	\N	\N	\N	\N	28000000.00	30000000.00	38000000.00	\N	20000000.00	DISPONIBLE	\N	2026-04-24	2026-04-24 17:32:07.441827	t	\N	\N	\N	\N	\N	\N
115	\N	\N	\N	\N	OTRO	VITZ AZUL 2010	2010	AZUL	NCP915325258	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	38	\N
298	\N	\N	\N	\N	OTRO	ALLION Color: NEGRO Año: 2008 Motor: 1800 c.c	2008	NEGRO	ZRT2603039032	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	17	\N
172	\N	\N	\N	\N	OTRO	AURIS Color: AZUL Año: 2007 Motor: 1500 c.c	2007	AZUL	NZE1511008275	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	1	\N
173	\N	\N	\N	\N	OTRO	AURIS Color: AZUL Año: 2007 Motor: 1500 c.c	2007	AZUL	NZE1511011853	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	1	\N
113	\N	\N	\N	\N	OTRO	VITZ ILL Color: AZUL GRIS Año: 2008 Motor: 1300 c.c	2008	AZUL GRIS	NCP91-5222097	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	2	\N
79	\N	\N	\N	\N	OTRO	IST Color: PLATA Año: 2002 Motor: 1300 c.c	2002	PLATA	NCP600046018	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	3	\N
169	\N	\N	\N	\N	OTRO	FIELDER Color: NEGRO Año: 2006 Motor: 1500 c.c	2006	NEGRO	NZE141-9006279	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	4	\N
10	\N	\N	\N	\N	OTRO	SUNNY Color: DORADO Año: 2004 Motor: 1500 c.c	2004	DORADO	FB15402456	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	5	\N
85	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2004 Motor: 1500 c.c	2004	PERLA	NCP81-0032026	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	6	\N
36	\N	\N	\N	\N	OTRO	RACTIS Color: GRIS Año: 2006 Motor: 1500 c.c	2006	GRIS	NCP1000041102	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	7	\N
218	\N	\N	\N	\N	OTRO	PLATZ Color: DORADO Año: 2003 Motor: 1500 c.c	2003	DORADO	SCP110072739	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	8	\N
110	\N	\N	\N	\N	OTRO	VITZ RS MECANICO Color: NEGRO Año: 2006 Motor: 1500 c.c	2006	NEGRO	NCP91-5058534	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	9	\N
264	\N	\N	\N	\N	OTRO	VITZ RS Color: BLANCO Año: 2009 Motor: 1300 c.c	2009	BLANCO	SCP905132540	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	10	\N
315	\N	\N	\N	\N	OTRO	PREMIO Color: PERLA Año: 2003 Motor: 1800 c.c	2003	PERLA	ZZT2405003853	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	11	\N
317	\N	\N	\N	\N	OTRO	PREMIO Color: PERLA Año: 2003 Motor: 1800 c.c	2003	PERLA	ZZT2405015505	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	11	\N
131	\N	\N	\N	\N	OTRO	VITZ Color: ROSADO Año: 2011 Motor: 1300 c.c	2011	ROSADO	NSP1302003092	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	12	\N
51	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2001 Motor: 1300 c.c	2001	GRIS	NCP100110413	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	13	\N
52	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2001 Motor: 1300 c.c	2001	GRIS	NCP100111323	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	13	\N
203	\N	\N	\N	\N	OTRO	RACTIS Color: PLATA Año: 2008 Motor: 1300 c.c	2008	PLATA	SCP1000056742	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	14	\N
171	\N	\N	\N	\N	OTRO	AURIS Color: BORDO Año: 2006 Motor: 1500 c.c	2006	BORDO	NZE1511004914	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	15	\N
314	\N	\N	\N	\N	OTRO	ALLION Color: PERLA Año: 2006 Motor: 1800 c.c	2006	PERLA	ZZT2400122725	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	16	\N
138	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: PLATA Año: 2011 Motor: 1300 c.c	2011	PLATA	NSP1302015586	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	18	\N
151	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: MARRON Año: 2012 Motor: 1300 c.c	2012	MARRON	NSP1302103157	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	19	\N
11	\N	\N	\N	\N	OTRO	CANTER Color: BLANCO Año: 2000 Motor: 0 c.c	2000	BLANCO	FB51AB561937	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	20	\N
25	\N	\N	\N	\N	OTRO	HILUX SURF Color: PLATA METALIZADO Año: 1998 Motor: 3000 c.c	1998	PLATA METALIZADO	KZN1850054938	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	21	\N
295	\N	\N	\N	\N	OTRO	ALLION Color: BLANCO Año: 2007 Motor: 1800 c.c	2007	BLANCO	ZRT260-3003508	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	22	\N
27	\N	\N	\N	\N	OTRO	ATLAS Color: BLANCO Año: 1999 Motor: 2500 c.c	1999	BLANCO	N6F23005908	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	23	\N
248	\N	\N	\N	\N	OTRO	VITZ  Color: PURPURA METALIZADO Año: 2005 Motor: 1300 c.c	2005	PURPURA METALIZADO	SCP905031106	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	24	\N
247	\N	\N	\N	\N	OTRO	VITZ Color: FUCSIA Año: 2005 Motor: 1300 c.c	2005	FUCSIA	SCP905026370	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	25	\N
167	\N	\N	\N	\N	OTRO	AXIO Color: AZUL Año: 2008 Motor: 1500 c.c	2008	AZUL	NZE141-6085602	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	26	\N
278	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2006 Motor: 1800 c.c	2006	PERLA	ZRE1521001639	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	27	\N
279	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2006 Motor: 1800 c.c	2006	PERLA	ZRE1521009141	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	27	\N
156	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: BORDO Año: 2014 Motor: 1300 c.c	2014	BORDO	NSP1302187779	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	28	\N
128	\N	\N	\N	\N	OTRO	TREZIA Color: NEGRO Año: 2010 Motor: 1500 c.c	2010	NEGRO	NSP1206000173	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	29	\N
77	\N	\N	\N	\N	OTRO	FUNCARGO Color: CELESTE Año: 2004 Motor: 1300 c.c	2004	CELESTE	NCP20-0340089	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	30	\N
86	\N	\N	\N	\N	OTRO	SIENTA Color: ROJO Año: 2004 Motor: 1500 c.c	2004	ROJO	NCP810038560	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	31	\N
21	\N	\N	\N	\N	OTRO	SPORTAGE Color: PLATA Año: 2005 Motor: 2000 c.c	2005	PLATA	KNAJE55135K073458	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	32	\N
219	\N	\N	\N	\N	OTRO	VITZ Color: BLANCO Año: 2005 Motor: 1300 c.c	2005	BLANCO	SCP900009690	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	33	\N
221	\N	\N	\N	\N	OTRO	VITZ Color: BLANCO Año: 2005 Motor: 1300 c.c	2005	BLANCO	SCP900018916	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	33	\N
224	\N	\N	\N	\N	OTRO	VITZ Color: BLANCO Año: 2005 Motor: 1300 c.c	2005	BLANCO	SCP900023290	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	33	\N
259	\N	\N	\N	\N	OTRO	VITZ Color: PURPURA Año: 2008 Motor: 1300 c.c	2008	PURPURA	SCP905090551	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	34	\N
164	\N	\N	\N	\N	OTRO	SPACIO Color: BLANCO Año: 2004 Motor: 1500 c.c	2004	BLANCO	NZE121-3251918	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	35	\N
106	\N	\N	\N	\N	OTRO	SIENTA Color: MARRON Año: 2012 Motor: 1500 c.c	2012	MARRON	NCP81-5175100	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	36	\N
87	\N	\N	\N	\N	OTRO	SIENTA Color: AZUL Año: 2005 Motor: 1500 c.c	2005	AZUL	NCP810090349	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	37	\N
15	\N	\N	\N	\N	OTRO	SANTAFE Color: GRIS Año: 2021 Motor: 2000 c.c	2021	GRIS	KMH5281HGMV333958	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	39	\N
245	\N	\N	\N	\N	OTRO	VITZ Color: VERDE Año: 2005 Motor: 1300 c.c	2005	VERDE	SCP905009372	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	40	\N
266	\N	\N	\N	\N	OTRO	VITZ Color: PURPURA Año: 2010 Motor: 1300 c.c	2010	PURPURA	SCP905164021	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	41	\N
201	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2008 Motor: 1300 c.c	2008	PERLA	SCP1000052380	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	42	\N
204	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2008 Motor: 1300 c.c	2008	PERLA	SCP1000059295	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	42	\N
155	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: MARRON Año: 2014 Motor: 1300 c.c	2014	MARRON	NSP1302181907	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	43	\N
100	\N	\N	\N	\N	OTRO	SIENTA Color: PLATA Año: 2008 Motor: 1500 c.c	2008	PLATA	NCP81-5056957	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	44	\N
111	\N	\N	\N	\N	OTRO	VITZ RS MECANICO Color: BLANCO Año: 2006 Motor: 1500 c.c	2006	BLANCO	NCP91-5091996	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	45	\N
67	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2012 Motor: 1500 c.c	2012	GRIS	NCP1312010846	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	46	\N
82	\N	\N	\N	\N	OTRO	IST Color: PERLA Año: 2003 Motor: 1500 c.c	2003	PERLA	NCP650019393	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	47	\N
116	\N	\N	\N	\N	OTRO	IST Color: PERLA Año: 2003 Motor: 1500 c.c	2003	PERLA	NCP95-0021469	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	47	\N
215	\N	\N	\N	\N	OTRO	RACTIS Color: VIOLETA METALIZADO Año: 2009 Motor: 1300 c.c	2009	VIOLETA METALIZADO	SCP1000082806	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	48	\N
297	\N	\N	\N	\N	OTRO	PREMIO Color: BORDO Año: 2008 Motor: 1800 c.c	2008	BORDO	ZRT2603033885	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	49	\N
53	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2010 Motor: 1500 c.c	2010	NEGRO	NCP1002014700	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	50	\N
182	\N	\N	\N	\N	OTRO	AURIS  Color: PLATA Año: 2007 Motor: 1500 c.c	2007	PLATA	NZE151-2001711	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	51	\N
271	\N	\N	\N	\N	OTRO	BELTA Color: PERLA Año: 2007 Motor: 1300 c.c	2007	PERLA	SCP921030360	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	52	\N
158	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2016 Motor: 1300 c.c	2016	AZUL	NSP1302234887	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	53	\N
129	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP130-0003435	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	54	\N
133	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1302007381	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	54	\N
134	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP130-2009672	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	54	\N
137	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1302014954	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	54	\N
145	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1302047102	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	54	\N
275	\N	\N	\N	\N	OTRO	WISH Color: NEGRO Año: 2010 Motor: 1800 c.c	2010	NEGRO	ZGE200085997	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	55	\N
176	\N	\N	\N	\N	OTRO	AURIS Color: BORDO Año: 2008 Motor: 1500 c.c	2008	BORDO	NZE1511037395	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	56	\N
45	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP1000091449	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	57	\N
46	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP1000095977	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	57	\N
48	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP1000098482	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	57	\N
104	\N	\N	\N	\N	OTRO	SIENTA Color: GRIS Año: 2009 Motor: 1500 c.c	2009	GRIS	NCP81-5093532	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	58	\N
157	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2014 Motor: 1300 c.c	2014	AZUL	NSP1302188605	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	59	\N
6	\N	\N	\N	\N	OTRO	PREMIO Color: AZUL Año: 2002 Motor: 2000 c.c	2002	AZUL	AZT2400001889	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	60	\N
251	\N	\N	\N	\N	OTRO	VITZ Color: BLANCO Año: 2006 Motor: 1300 c.c	2006	BLANCO	SCP905037513	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	61	\N
227	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2006 Motor: 1300 c.c	2006	NEGRO	SCP902001249	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	62	\N
30	\N	\N	\N	\N	OTRO	RACTIS c/ techo panoramico Color: NEGRO Año: 2005 Motor: 1500 c.c	2005	NEGRO	NCP100-0012961	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	63	\N
207	\N	\N	\N	\N	OTRO	RACTIS Color: BORDO Año: 2009 Motor: 1300 c.c	2009	BORDO	SCP1000064973	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	64	\N
212	\N	\N	\N	\N	OTRO	RACTIS Color: BORDO Año: 2009 Motor: 1300 c.c	2009	BORDO	SCP1000072853	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	64	\N
214	\N	\N	\N	\N	OTRO	RACTIS Color: BORDO Año: 2009 Motor: 1300 c.c	2009	BORDO	SCP1000081846	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	64	\N
283	\N	\N	\N	\N	OTRO	VOXY Color: PLATA Año: 2007 Motor: 2000 c.c	2007	PLATA	ZRR700016497	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	65	\N
321	\N	\N	\N	\N	OTRO	ALLION Color: CELESTE Año: 2004 Motor: 1800 c.c	2004	CELESTE	ZZT2450022389	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	66	\N
205	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2009 Motor: 1300 c.c	2009	NEGRO	SCP100-0061049	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	67	\N
206	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2009 Motor: 1300 c.c	2009	NEGRO	SCP1000063501	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	67	\N
1	\N	\N	\N	\N	JEEP	GRAND CHEROKEE Color: NEGRO Año: 2013 Motor: 3000 c.c	2013	NEGRO	1C4RJFAM8DC622827	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	1	68	\N
16	\N	\N	\N	\N	OTRO	TUCSON Color: NEGRO Año: 2008 Motor: 2000 c.c	2008	NEGRO	KMHJN81VP8U800484	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	69	\N
210	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL MET Año: 2009 Motor: 1300 c.c	2009	AZUL MET	SCP100-0069882	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	70	\N
243	\N	\N	\N	\N	OTRO	VITZ Color: PLATEADO Año: 2009 Motor: 1300 c.c	2009	PLATEADO	SCP902091126	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	71	\N
270	\N	\N	\N	\N	OTRO	BELTA Color: PLATA Año: 2006 Motor: 1300 c.c	2006	PLATA	SCP921017696	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	72	\N
99	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP815049136	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	73	\N
188	\N	\N	\N	\N	OTRO	ALLION Color: PLATA Año: 2003 Motor: 1500 c.c	2003	PLATA	NZT2400045113	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	74	\N
189	\N	\N	\N	\N	OTRO	ALLION Color: PLATA Año: 2003 Motor: 1500 c.c	2003	PLATA	NZT240004513	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	74	\N
2	\N	\N	\N	\N	OTRO	WISH Color: GRIS Año: 2004 Motor: 2000 c.c	2004	GRIS	ANE11-0023429	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	75	\N
8	\N	\N	\N	\N	OTRO	CALDINA Color: BLANCO Año: 2007 Motor: 2000 c.c	2007	BLANCO	AZT241-0031138	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	76	\N
288	\N	\N	\N	\N	OTRO	NOAH Color: PLATA Año: 2008 Motor: 2000 c.c	2008	PLATA	ZRR700176889	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	77	\N
80	\N	\N	\N	\N	OTRO	IST Color: PLATA Año: 2004 Motor: 1500 c.c	2004	PLATA	NCP600151274	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	78	\N
175	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2008 Motor: 1500 c.c	2008	NEGRO	NZE1511030410	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	79	\N
178	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2008 Motor: 1500 c.c	2008	NEGRO	NZE1511044634	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	79	\N
179	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2008 Motor: 1500 c.c	2008	NEGRO	NZE1511056492	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	79	\N
154	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: ROJO Año: 2013 Motor: 1300 c.c	2013	ROJO	NSP1302145211	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	80	\N
83	\N	\N	\N	\N	OTRO	IST Color: NEGRO Año: 2003 Motor: 1500 c.c	2003	NEGRO	NCP650019444	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	81	\N
240	\N	\N	\N	\N	OTRO	VITZ Color: PERLA Año: 2009 Motor: 1300 c.c	2009	PERLA	SCP902078532	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	82	\N
187	\N	\N	\N	\N	OTRO	ALLION Color: CELESTE Año: 2002 Motor: 1500 c.c	2002	CELESTE	NZT2400034751	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	83	\N
56	\N	\N	\N	\N	OTRO	IST Color: VIOLETA METALIZADO Año: 2008 Motor: 1500 c.c	2008	VIOLETA METALIZADO	NCP1100018407	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	84	\N
37	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2006 Motor: 1500 c.c	2006	PERLA	NCP1000043723	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	85	\N
40	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2006 Motor: 1500 c.c	2006	PERLA	NCP1000062635	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	85	\N
41	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2006 Motor: 1500 c.c	2006	PERLA	NCP1000063034	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	85	\N
42	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2006 Motor: 1500 c.c	2006	PERLA	NCP1000069322	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	85	\N
107	\N	\N	\N	\N	OTRO	SIENTA Color: BORDO Año: 2013 Motor: 1500 c.c	2013	BORDO	NCP81-5205494	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	86	\N
101	\N	\N	\N	\N	OTRO	SIENTA Color: GRIS Año: 2008 Motor: 1500 c.c	2008	GRIS	NCP815057082	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	87	\N
124	\N	\N	\N	\N	OTRO	RACTIS  Color: PERLA Año: 2011 Motor: 1500 c.c	2011	PERLA	NSP1202019319	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	88	\N
280	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2008 Motor: 1800 c.c	2008	PERLA	ZRE1521078170	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	89	\N
71	\N	\N	\N	\N	OTRO	FUNCARGO Color: BLANCO Año: 2000 Motor: 1500 c.c	2000	BLANCO	NCP200125597	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	90	\N
282	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2007 Motor: 1800 c.c	2007	NEGRO	ZRE1522013021	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	91	\N
242	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2009 Motor: 1300 c.c	2009	NEGRO	SCP902088367	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	92	\N
244	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2009 Motor: 1300 c.c	2009	NEGRO	SCP902092569	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	92	\N
238	\N	\N	\N	\N	OTRO	VITZ Color: ROJO Año: 2008 Motor: 1300 c.c	2008	ROJO	SCP902068707	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	93	\N
28	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2005 Motor: 1500 c.c	2005	AZUL METALIZADO	NCP1000008030	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	94	\N
208	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2009 Motor: 1300 c.c	2009	AZUL METALIZADO	SCP1000065662	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	95	\N
209	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2009 Motor: 1300 c.c	2009	AZUL METALIZADO	SCP1000069571	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	95	\N
161	\N	\N	\N	\N	OTRO	COROLLA SPACIO Color: AZUL Año: 2001 Motor: 1500 c.c	2001	AZUL	NZE1213091336	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	96	\N
127	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2012 Motor: 1300 c.c	2012	NEGRO	NSP1203002451	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	97	\N
228	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2006 Motor: 1300 c.c	2006	AZUL	SCP902003842	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	98	\N
231	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2006 Motor: 1300 c.c	2006	AZUL	SCP902014716	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	98	\N
253	\N	\N	\N	\N	OTRO	VITZ Color: VERDE Año: 2007 Motor: 1300 c.c	2007	VERDE	SCP905063342	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	99	\N
166	\N	\N	\N	\N	OTRO	COROLLA AXIO Color: AZUL Año: 2007 Motor: 1500 c.c	2007	AZUL	NZE1416039917	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	100	\N
64	\N	\N	\N	\N	OTRO	VITZ RS Color: NEGRO Año: 2011 Motor: 1500 c.c	2011	NEGRO	NCP1312002945	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	101	\N
287	\N	\N	\N	\N	OTRO	VOXY Color: NEGRO Año: 2008 Motor: 2000 c.c	2008	NEGRO	ZRR700152896	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	102	\N
7	\N	\N	\N	\N	OTRO	ALLION Color: CELESTE Año: 2002 Motor: 2000 c.c	2002	CELESTE	AZT240-0011993	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	103	\N
190	\N	\N	\N	\N	OTRO	PREMIO Color: BLANCO Año: 2004 Motor: 1500 c.c	2004	BLANCO	NZT2400057427	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	104	\N
191	\N	\N	\N	\N	OTRO	ALLION Color: BLANCO Año: 2003 Motor: 1500 c.c	2003	BLANCO	NZT2405009854	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	105	\N
197	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2006 Motor: 1300 c.c	2006	NEGRO	SCP1000017401	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	106	\N
307	\N	\N	\N	\N	OTRO	RUNX Color: PLATA Año: 2001 Motor: 1800 c.c	2001	PLATA	ZZE1235000004	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	107	\N
60	\N	\N	\N	\N	OTRO	PLATZ Color: PERLA Año: 2004 Motor: 1300 c.c	2004	PERLA	NCP120352110	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	108	\N
68	\N	\N	\N	\N	OTRO	PLATZ Color: PERLA Año: 2004 Motor: 1300 c.c	2004	PERLA	NCP160019988	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	108	\N
313	\N	\N	\N	\N	OTRO	PREMIO Color: PLATA Año: 2004 Motor: 1800 c.c	2004	PLATA	ZZT2400077432	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	109	\N
14	\N	\N	\N	\N	OTRO	BEGO Color: AZUL Año: 2006 Motor: 1500 c.c	2006	AZUL	J210G0004820	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	110	\N
3	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2005 Motor: 2000 c.c	2005	PERLA	AZR600423658	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	111	\N
26	\N	\N	\N	\N	OTRO	ATLAS Color: AZUL Año: 1995 Motor: 2500 c.c	1995	AZUL	N4F23000366	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	112	\N
89	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2005 Motor: 1500 c.c	2005	PERLA	NCP810104571	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	113	\N
90	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2005 Motor: 1500 c.c	2005	PERLA	NCP810110438	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	113	\N
91	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2005 Motor: 1500 c.c	2005	PERLA	NCP810126616	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	113	\N
241	\N	\N	\N	\N	OTRO	VITZ Color: BLANCO Año: 2009 Motor: 1300 c.c	2009	BLANCO	SCP902087696	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	114	\N
74	\N	\N	\N	\N	OTRO	FUNCARGO Color: PLATA Año: 2002 Motor: 1300 c.c	2002	PLATA	NCP200253808	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	115	\N
223	\N	\N	\N	\N	OTRO	VITZ Color: ROJO Año: 2005 Motor: 1300 c.c	2005	ROJO	SCP900019953	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	116	\N
143	\N	\N	\N	\N	OTRO	VITZ   Color: PLATA Año: 2011 Motor: 1300 c.c	2011	PLATA	NSP130-2035840	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	117	\N
69	\N	\N	\N	\N	OTRO	FUNCARGO Color: PLATA Año: 2000 Motor: 1300 c.c	2000	PLATA	NCP200068252	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	118	\N
70	\N	\N	\N	\N	OTRO	FUNCARGO Color: PLATA Año: 2000 Motor: 1300 c.c	2000	PLATA	NCP200121892	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	118	\N
72	\N	\N	\N	\N	OTRO	FUNCARGO Color: PLATA Año: 2000 Motor: 1300 c.c	2000	PLATA	NCP20-0131168	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	118	\N
306	\N	\N	\N	\N	OTRO	COROLLA FIELDER Color: NEGRO Año: 2003 Motor: 1800 c.c	2003	NEGRO	ZZE1230016533	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	119	\N
96	\N	\N	\N	\N	OTRO	SIENTA Color: ROJO Año: 2007 Motor: 1500 c.c	2007	ROJO	NCP815038960	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	120	\N
192	\N	\N	\N	\N	OTRO	ALLION Color: PERLA Año: 2003 Motor: 1500 c.c	2003	PERLA	NZT2405017512	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	121	\N
234	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2007 Motor: 1300 c.c	2007	NEGRO	SCP902029451	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	122	\N
236	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2007 Motor: 1300 c.c	2007	NEGRO	SCP902042696	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	122	\N
254	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2007 Motor: 1300 c.c	2007	NEGRO	SCP905065726	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	122	\N
180	\N	\N	\N	\N	OTRO	AURIS Color: PLATA Año: 2009 Motor: 1500 c.c	2009	PLATA	NZE1511063419	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	123	\N
181	\N	\N	\N	\N	OTRO	AURIS Color: PLATA Año: 2009 Motor: 1500 c.c	2009	PLATA	NZE1511066503	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	123	\N
148	\N	\N	\N	\N	OTRO	VITZ Color: PERLA Año: 2012 Motor: 1300 c.c	2012	PERLA	NSP130-2061882	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	124	\N
150	\N	\N	\N	\N	OTRO	VITZ Color: PERLA Año: 2012 Motor: 1300 c.c	2012	PERLA	NSP1302093875	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	124	\N
290	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2009 Motor: 2000 c.c	2009	PERLA	ZRR700204257	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	125	\N
291	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2009 Motor: 2000 c.c	2009	PERLA	ZRR700209565	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	125	\N
293	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2009 Motor: 2000 c.c	2009	PERLA	ZRR700233367	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	125	\N
31	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2005 Motor: 1500 c.c	2005	NEGRO	NCP100002674	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	126	\N
153	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2013 Motor: 1300 c.c	2013	PLATA	NSP1302122257	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	127	\N
199	\N	\N	\N	\N	OTRO	RACTIS Color: ROJO Año: 2007 Motor: 1300 c.c	2007	ROJO	SCP1000038453	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	128	\N
112	\N	\N	\N	\N	OTRO	VITZ Color: GRIS Año: 2007 Motor: 1500 c.c	2007	GRIS	NCP915128613	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	129	\N
239	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2009 Motor: 1300 c.c	2009	AZUL	SCP902077371	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	130	\N
220	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2005 Motor: 1300 c.c	2005	AZUL	SCP900011434	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	131	\N
308	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2014 Motor: 2000 c.c	2014	PERLA	ZZR80-0042536	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	132	\N
103	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2008 Motor: 1500 c.c	2008	PERLA	NCP815082858	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	133	\N
12	\N	\N	\N	\N	OTRO	IMPREZA AUTOMATICO Color: AZUL METALIZADO Año: 2007 Motor: 1500 c.c	2007	AZUL METALIZADO	GH2008550	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	134	\N
152	\N	\N	\N	\N	OTRO	VITZ Color: BORDO Año: 2013 Motor: 1300 c.c	2013	BORDO	NSP1302116544	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	135	\N
185	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2013 Motor: 1500 c.c	2013	NEGRO	NZE1816006143	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	136	\N
122	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2011 Motor: 1300 c.c	2011	PERLA	NSP120-2005357	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	137	\N
265	\N	\N	\N	\N	OTRO	VITZ RS Color: NEGRO Año: 2010 Motor: 1300 c.c	2010	NEGRO	SCP905162173	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	138	\N
121	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2011 Motor: 1500 c.c	2011	PERLA	NSP1202005146	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	139	\N
88	\N	\N	\N	\N	OTRO	SIENTA Color: CELESTE Año: 2005 Motor: 1500 c.c	2005	CELESTE	NCP81-0091601	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	140	\N
33	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2006 Motor: 1500 c.c	2006	AZUL METALIZADO	NCP1000031061	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	141	\N
39	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2006 Motor: 1500 c.c	2006	AZUL METALIZADO	NCP1000051625	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	141	\N
299	\N	\N	\N	\N	OTRO	PREMIO Color: PLATA Año: 2008 Motor: 1800 c.c	2008	PLATA	ZRT2603044420	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	142	\N
252	\N	\N	\N	\N	OTRO	VITZ Color: CELESTE Año: 2006 Motor: 1300 c.c	2006	CELESTE	SCP905053098	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	143	\N
130	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2011 Motor: 1300 c.c	2011	PLATA	NSP1300007274	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	144	\N
142	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2011 Motor: 1300 c.c	2011	PLATA	NSP130-2033995	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	144	\N
93	\N	\N	\N	\N	OTRO	SIENTA Color: PLATA Año: 2006 Motor: 1500 c.c	2006	PLATA	NCP815004671	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	145	\N
94	\N	\N	\N	\N	OTRO	SIENTA Color: PLATA Año: 2006 Motor: 1500 c.c	2006	PLATA	NCP815005662	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	145	\N
61	\N	\N	\N	\N	OTRO	TREZIA Color: PLATA Año: 2011 Motor: 1500 c.c	2011	PLATA	NCP1206001033	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	146	\N
149	\N	\N	\N	\N	OTRO	VITZ Color: PURPURA Año: 2012 Motor: 1300 c.c	2012	PURPURA	NSP1302087554	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	147	\N
123	\N	\N	\N	\N	OTRO	RACTIS  Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1202016373	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	148	\N
32	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2006 Motor: 1500 c.c	2006	NEGRO	NCP1000027349	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	149	\N
183	\N	\N	\N	\N	OTRO	AURIS Color: LILA Año: 2008 Motor: 1500 c.c	2008	LILA	NZE1541004071	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	150	\N
105	\N	\N	\N	\N	OTRO	SIENTA Color: BORDO Año: 2011 Motor: 1500 c.c	2011	BORDO	NCP815160602	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	151	\N
59	\N	\N	\N	\N	OTRO	RACTIS Color: ROJO Año: 2012 Motor: 1500 c.c	2012	ROJO	NCP1202048201	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	152	\N
125	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL Año: 2011 Motor: 1300 c.c	2011	AZUL	NSP120-2026326	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	153	\N
146	\N	\N	\N	\N	OTRO	VITZ Color: CELESTE Año: 2011 Motor: 1300 c.c	2011	CELESTE	NSP130-2051262	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	154	\N
147	\N	\N	\N	\N	OTRO	VITZ Color: CELESTE Año: 2011 Motor: 1300 c.c	2011	CELESTE	NSP130-2056570	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	154	\N
78	\N	\N	\N	\N	OTRO	FUNCARGO Color: NEGRO Año: 2000 Motor: 1500 c.c	2000	NEGRO	NCP210019604	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	155	\N
193	\N	\N	\N	\N	OTRO	PREMIO Color: BORDO Año: 2008 Motor: 1500 c.c	2008	BORDO	NZT260-3028889	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	156	\N
139	\N	\N	\N	\N	OTRO	VITZ  Color: BLANCO Año: 2011 Motor: 1300 c.c	2011	BLANCO	NSP1302019322	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	157	\N
281	\N	\N	\N	\N	OTRO	AURIS Color: PLATA Año: 2008 Motor: 1800 c.c	2008	PLATA	ZRE1521082038	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	158	\N
277	\N	\N	\N	\N	OTRO	COROLLA AXIO LUXEL Color: AZUL Año: 2006 Motor: 1500 c.c	2006	AZUL	ZRE1426001937	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	159	\N
246	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2005 Motor: 1300 c.c	2005	NEGRO	SCP905009551	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	160	\N
249	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2005 Motor: 1300 c.c	2005	NEGRO	SCP905032848	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	160	\N
230	\N	\N	\N	\N	OTRO	VITZ  Color: NEGRO Año: 2006 Motor: 1300 c.c	2006	NEGRO	SCP902010254	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	161	\N
274	\N	\N	\N	\N	OTRO	WISH Color: NEGRO Año: 2009 Motor: 1800 c.c	2009	NEGRO	ZGE200033048	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	162	\N
43	\N	\N	\N	\N	OTRO	RACTIS Color: ROJO Año: 2007 Motor: 1500 c.c	2007	ROJO	NCP1000090281	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	163	\N
250	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2005 Motor: 1300 c.c	2005	PLATA	SCP905033383	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	164	\N
29	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2005 Motor: 1500 c.c	2005	PERLA	NCP100-0009336	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	165	\N
262	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2009 Motor: 1300 c.c	2009	GRIS	SCP905123785	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	166	\N
141	\N	\N	\N	\N	OTRO	VITZ Color: GRIS METALIZADO Año: 2011 Motor: 1300 c.c	2011	GRIS METALIZADO	NSP1302026419	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	167	\N
58	\N	\N	\N	\N	OTRO	RACTIS Color: PLATA Año: 2011 Motor: 1500 c.c	2011	PLATA	NCP1202031798	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	168	\N
309	\N	\N	\N	\N	OTRO	ALLION Color: PLATA Año: 2002 Motor: 1800 c.c	2002	PLATA	ZZT240-0010460	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	169	\N
301	\N	\N	\N	\N	OTRO	IST Color: GRIS Año: 2007 Motor: 1500 c.c	2007	GRIS	ZSP1100002629	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	170	\N
272	\N	\N	\N	\N	OTRO	BELTA Color: AZUL Año: 2007 Motor: 1300 c.c	2007	AZUL	SCP921038897	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	171	\N
24	\N	\N	\N	\N	OTRO	SPORTAGE Color: BLANCO Año: 2012 Motor: 2000 c.c	2012	BLANCO	KNAPC813BCK170619	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	172	\N
310	\N	\N	\N	\N	OTRO	ALLION Color: PERLA Año: 2002 Motor: 1800 c.c	2002	PERLA	ZZT2400025442	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	173	\N
23	\N	\N	\N	\N	OTRO	SPORTAGE Color: GRIS Año: 2012 Motor: 2000 c.c	2012	GRIS	KNAPC813BCK169728	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	174	\N
276	\N	\N	\N	\N	OTRO	WISH Color: GRIS Año: 2003 Motor: 1800 c.c	2003	GRIS	ZNE100019931	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	175	\N
66	\N	\N	\N	\N	OTRO	VITZ RS Color: BLANCO Año: 2011 Motor: 1500 c.c	2011	BLANCO	NCP1312009432	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	176	\N
211	\N	\N	\N	\N	OTRO	RACTIS Color: GRIS Año: 2009 Motor: 1300 c.c	2009	GRIS	SCP1000070305	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	177	\N
195	\N	\N	\N	\N	OTRO	RACTIS Color: GRIS Año: 2005 Motor: 1300 c.c	2005	GRIS	SCP1000003264	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	178	\N
95	\N	\N	\N	\N	OTRO	SIENTA Color: PLATA Año: 2007 Motor: 1500 c.c	2007	PLATA	NCP815028364	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	179	\N
232	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2007 Motor: 1300 c.c	2007	AZUL	SCP902022755	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	180	\N
255	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2007 Motor: 1300 c.c	2007	AZUL	SCP905067962	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	180	\N
256	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2007 Motor: 1300 c.c	2007	AZUL	SCP905073715	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	180	\N
62	\N	\N	\N	\N	OTRO	VITZ RS Color: AZUL Año: 2001 Motor: 1300 c.c	2001	AZUL	NCP130026674	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	181	\N
213	\N	\N	\N	\N	OTRO	RACTIS Color: VIOLETA MET Año: 2009 Motor: 1300 c.c	2009	VIOLETA MET	SCP100-0078692	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	182	\N
217	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2010 Motor: 1300 c.c	2010	PERLA	SCP1002008128	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	183	\N
168	\N	\N	\N	\N	OTRO	COROLLA AXIO Color: BLANCO Año: 2008 Motor: 1500 c.c	2008	BLANCO	NZE1416108567	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	184	\N
65	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2011 Motor: 1500 c.c	2011	GRIS	NCP1312003880	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	185	\N
126	\N	\N	\N	\N	OTRO	RACTIS Color: PLATA Año: 2012 Motor: 1300 c.c	2012	PLATA	NSP1202037901	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	186	\N
84	\N	\N	\N	\N	OTRO	SIENTA Color: BLANCO Año: 2003 Motor: 1500 c.c	2003	BLANCO	NCP810001802	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	187	\N
19	\N	\N	\N	\N	OTRO	TUCSON Color: GRIS Año: 2012 Motor: 2000 c.c	2012	GRIS	KMHJU81VBCU300496	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	188	\N
118	\N	\N	\N	\N	OTRO	AQUA Color: NEGRO Año: 2012 Motor: 1500 c.c	2012	NEGRO	NHP102089215	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	189	\N
235	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2007 Motor: 1300 c.c	2007	PLATA	SCP902038790	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	190	\N
76	\N	\N	\N	\N	OTRO	FUNCARGO Color: PERLA Año: 2004 Motor: 1300 c.c	2004	PERLA	NCP200337514	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	191	\N
108	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2014 Motor: 1500 c.c	2014	PERLA	NCP815208226	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	192	\N
316	\N	\N	\N	\N	OTRO	PREMIO Color: PLATA Año: 2003 Motor: 1800 c.c	2003	PLATA	ZZT2405009426	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	193	\N
268	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2010 Motor: 1300 c.c	2010	GRIS	SCP90-5168606	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	194	\N
75	\N	\N	\N	\N	OTRO	FUNCARGO Color: CELESTE PLATA Año: 2003 Motor: 1300 c.c	2003	CELESTE PLATA	NCP200300725	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	195	\N
296	\N	\N	\N	\N	OTRO	ALLION Color: PLATA Año: 2007 Motor: 1500 c.c	2007	PLATA	ZRT2603020897	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	196	\N
92	\N	\N	\N	\N	OTRO	SIENTA Color: PERLA Año: 2006 Motor: 1500 c.c	2006	PERLA	NCP815001383	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	197	\N
49	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2007 Motor: 1300 c.c	2007	NEGRO	NCP1000100489	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	198	\N
200	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2007 Motor: 1300 c.c	2007	NEGRO	SCP1000042393	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	198	\N
194	\N	\N	\N	\N	OTRO	ALLION Color: PLATA Año: 2009 Motor: 1500 c.c	2009	PLATA	NZT2603058927	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	199	\N
222	\N	\N	\N	\N	OTRO	VITZ Color: CELESTE Año: 2005 Motor: 1300 c.c	2005	CELESTE	SCP900018947	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	200	\N
312	\N	\N	\N	\N	OTRO	ALLION Color: PERLA Año: 2003 Motor: 1800 c.c	2003	PERLA	ZZT2400063308	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	201	\N
318	\N	\N	\N	\N	OTRO	ALLION Color: PERLA Año: 2003 Motor: 1800 c.c	2003	PERLA	ZZT2405016441	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	201	\N
170	\N	\N	\N	\N	OTRO	COROLLA FIELDER Color: NEGRO Año: 2008 Motor: 1500 c.c	2008	NEGRO	NZE1419077389	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	202	\N
73	\N	\N	\N	\N	OTRO	FUNCARGO Color: GRIS Año: 2002 Motor: 1300 c.c	2002	GRIS	NCP20-0249324	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	203	\N
284	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2008 Motor: 2000 c.c	2008	PERLA	ZRR700107058	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	204	\N
285	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2008 Motor: 2000 c.c	2008	PERLA	ZRR700124003	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	204	\N
286	\N	\N	\N	\N	OTRO	VOXY Color: PERLA Año: 2008 Motor: 2000 c.c	2008	PERLA	ZRR700131641	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	204	\N
263	\N	\N	\N	\N	OTRO	VITZ RS Color: NEGRO Año: 2009 Motor: 1300 c.c	2009	NEGRO	SCP905129457	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	205	\N
186	\N	\N	\N	\N	OTRO	PREMIO Color: BLANCO Año: 2002 Motor: 1500 c.c	2002	BLANCO	NZT2400006499	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	206	\N
5	\N	\N	\N	\N	OTRO	PREMIO Color: PLATA Año: 2002 Motor: 2000 c.c	2002	PLATA	AZT240-0001862	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	207	\N
261	\N	\N	\N	\N	OTRO	VITZ Color: AZUL Año: 2008 Motor: 1300 c.c	2008	AZUL	SCP90-5108183	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	208	\N
22	\N	\N	\N	\N	OTRO	SPORTAGE Color: PLATA Año: 2011 Motor: 2000 c.c	2011	PLATA	KNAPC813BBK009445	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	209	\N
225	\N	\N	\N	\N	OTRO	VITZ Color: GRIS Año: 2006 Motor: 1300 c.c	2006	GRIS	SCP900029113	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	210	\N
63	\N	\N	\N	\N	OTRO	VITZ RS Color: TURQUESA Año: 2011 Motor: 1500 c.c	2011	TURQUESA	NCP1312000954	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	211	\N
20	\N	\N	\N	\N	OTRO	SANTA FE Color: AZUL Año: 2014 Motor: 2000 c.c	2014	AZUL	KMHSW81UBEU267729	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	212	\N
267	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2010 Motor: 1300 c.c	2010	NEGRO	SCP905166073	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	213	\N
198	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL METALIZADO Año: 2006 Motor: 1300 c.c	2006	AZUL METALIZADO	SCP1000026313	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	214	\N
13	\N	\N	\N	\N	OTRO	IMPREZA MECANICO Color: LILA Año: 2009 Motor: 1500 c.c	2009	LILA	GH2027933	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	215	\N
160	\N	\N	\N	\N	OTRO	COROLLA RUNX Color: PLATA Año: 2001 Motor: 1500 c.c	2001	PLATA	NZE1210068740	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	216	\N
257	\N	\N	\N	\N	OTRO	VITZ Color: PURPURA Año: 2007 Motor: 1300 c.c	2007	PURPURA	SCP905078725	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	217	\N
302	\N	\N	\N	\N	OTRO	IST Color: VIOLETA METALIZADO Año: 2007 Motor: 1800 c.c	2007	VIOLETA METALIZADO	ZSP1100002832	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	218	\N
258	\N	\N	\N	\N	OTRO	VITZ RS Color: NEGRO Año: 2008 Motor: 1300 c.c	2008	NEGRO	SCP905084596	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	219	\N
260	\N	\N	\N	\N	OTRO	VITZ RS Color: NEGRO Año: 2008 Motor: 1300 c.c	2008	NEGRO	SCP905095641	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	219	\N
311	\N	\N	\N	\N	OTRO	PREMIO Color: PERLA Año: 2002 Motor: 1800 c.c	2002	PERLA	ZZT2400032175	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	220	\N
303	\N	\N	\N	\N	OTRO	IST Color: NEGRO Año: 2008 Motor: 1800 c.c	2008	NEGRO	ZSP1100003783	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	221	\N
97	\N	\N	\N	\N	OTRO	SIENTA Color: GRIS Año: 2007 Motor: 1500 c.c	2007	GRIS	NCP815042530	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	222	\N
98	\N	\N	\N	\N	OTRO	SIENTA Color: GRIS Año: 2007 Motor: 1500 c.c	2007	GRIS	NCP81-5047650	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	222	\N
320	\N	\N	\N	\N	OTRO	CALDINA Color: PLATA Año: 2005 Motor: 1800 c.c	2005	PLATA	ZZT241-0026007	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	223	\N
294	\N	\N	\N	\N	OTRO	VOXY Color: NEGRO Año: 2014 Motor: 2000 c.c	2014	NEGRO	ZRR80-0014931	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	224	\N
102	\N	\N	\N	\N	OTRO	SIENTA  Color: GRIS Año: 2008 Motor: 1500 c.c	2008	GRIS	NCP815081349	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	225	\N
233	\N	\N	\N	\N	OTRO	VITZ Color: PLATEADO Año: 2007 Motor: 1300 c.c	2007	PLATEADO	SCP902026721	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	226	\N
292	\N	\N	\N	\N	OTRO	VOXY Color: AZUL Año: 2009 Motor: 2000 c.c	2009	AZUL	ZRR700224370	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	227	\N
177	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2008 Motor: 1500 c.c	2008	PERLA	NZE1511038328	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	228	\N
54	\N	\N	\N	\N	OTRO	IST Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP1100004157	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	229	\N
55	\N	\N	\N	\N	OTRO	IST Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NCP110-0008535	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	229	\N
305	\N	\N	\N	\N	OTRO	COROLLA SPACIO Color: BORDO Año: 2002 Motor: 1800 c.c	2002	BORDO	ZZE1223043303	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	230	\N
4	\N	\N	\N	\N	OTRO	VOXY Color: NEGRO Año: 2005 Motor: 2000 c.c	2005	NEGRO	AZR600485186	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	231	\N
132	\N	\N	\N	\N	OTRO	VITZ Color: PERLA Año: 2011 Motor: 1300 c.c	2011	PERLA	NSP1302006349	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	232	\N
184	\N	\N	\N	\N	OTRO	AURIS Color: NEGRO Año: 2012 Motor: 1500 c.c	2012	NEGRO	NZE181-6000952	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	233	\N
117	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NE1511019822	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	234	\N
174	\N	\N	\N	\N	OTRO	AURIS Color: PERLA Año: 2007 Motor: 1500 c.c	2007	PERLA	NZE1511021307	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	234	\N
34	\N	\N	\N	\N	OTRO	RACTIS  Color: PLATA Año: 2006 Motor: 1500 c.c	2006	PLATA	NCP100-0038073	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	235	\N
17	\N	\N	\N	\N	OTRO	TUCSON Color: GRIS Año: 2010 Motor: 2000 c.c	2010	GRIS	KMHJU81VBAU037208	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	236	\N
18	\N	\N	\N	\N	OTRO	TUCSON Color: GRIS Año: 2010 Motor: 2000 c.c	2010	GRIS	KMHJU81VBAU054728	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	236	\N
202	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL Año: 2008 Motor: 1300 c.c	2008	AZUL	SCP1000054140	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	237	\N
319	\N	\N	\N	\N	OTRO	CALDINA Color: NEGRO Año: 2005 Motor: 1800 c.c	2005	NEGRO	ZZT2410022868	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	238	\N
165	\N	\N	\N	\N	OTRO	ALLEX Color: BEIGE Año: 2002 Motor: 1500 c.c	2002	BEIGE	NZE1215018002	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	239	\N
35	\N	\N	\N	\N	OTRO	RACTIS Color: ROJO Año: 2006 Motor: 1500 c.c	2006	ROJO	NCP100-0041079	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	240	\N
38	\N	\N	\N	\N	OTRO	RACTIS Color: ROJO Año: 2006 Motor: 1500 c.c	2006	ROJO	NCP100-0050793	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	240	\N
109	\N	\N	\N	\N	OTRO	VITZ RS Color: GRIS Año: 2005 Motor: 1500 c.c	2005	GRIS	NCP915007906	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	241	\N
9	\N	\N	\N	\N	OTRO	NOAH Color: BLANCO Año: 1998 Motor: 2000 c.c	1998	BLANCO	CR400020489	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	242	\N
304	\N	\N	\N	\N	OTRO	COROLLA RUNX Color: PURPURA OSCURO Año: 2002 Motor: 1800 c.c	2002	PURPURA OSCURO	ZZE1222008095	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	243	\N
44	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2007 Motor: 1500 c.c	2007	NEGRO	NCP1000091276	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	244	\N
47	\N	\N	\N	\N	OTRO	RACTIS Color: NEGRO Año: 2007 Motor: 1500 c.c	2007	NEGRO	NCP1000096034	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	244	\N
237	\N	\N	\N	\N	OTRO	VITZ Color: NEGRO Año: 2008 Motor: 1300 c.c	2008	NEGRO	SCP902062113	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	245	\N
300	\N	\N	\N	\N	OTRO	PREMIO Color: PLATA Año: 2009 Motor: 1800 c.c	2009	PLATA	ZRT2603057477	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	246	\N
57	\N	\N	\N	\N	OTRO	PLATZ Color: CHAMPAGNE Año: 2001 Motor: 1500 c.c	2001	CHAMPAGNE	NCP12-0150123	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	247	\N
196	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2006 Motor: 1300 c.c	2006	PERLA	SCP1000016336	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	248	\N
162	\N	\N	\N	\N	OTRO	COROLLA SPACIO Color: PLATA Año: 2003 Motor: 1500 c.c	2003	PLATA	NZE1213175513	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	249	\N
163	\N	\N	\N	\N	OTRO	COROLLA SPACIO Color: PLATA Año: 2003 Motor: 1500 c.c	2003	PLATA	NZE1213204327	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	249	\N
114	\N	\N	\N	\N	OTRO	VITZ RS Color: AZUL Año: 2008 Motor: 1500 c.c	2008	AZUL	NCP915236469	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	250	\N
226	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2006 Motor: 1300 c.c	2006	PLATA	SCP900035984	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	251	\N
229	\N	\N	\N	\N	OTRO	VITZ Color: PLATA Año: 2006 Motor: 1300 c.c	2006	PLATA	SCP902006658	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	251	\N
140	\N	\N	\N	\N	OTRO	VITZ Color: GRIS Año: 2011 Motor: 1300 c.c	2011	GRIS	NSP1302024967	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	252	\N
159	\N	\N	\N	\N	OTRO	VITZ Color: GRIS Año: 2011 Motor: 1300 c.c	2011	GRIS	NSP1352008263	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	252	\N
50	\N	\N	\N	\N	OTRO	RACTIS Color: PERLA Año: 2009 Motor: 1500 c.c	2009	PERLA	NCP1000134847	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	253	\N
135	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1302010884	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	254	\N
136	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: NEGRO Año: 2011 Motor: 1300 c.c	2011	NEGRO	NSP1302012184	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	254	\N
119	\N	\N	\N	\N	OTRO	RACTIS Color: PLATA Año: 2010 Motor: 1300 c.c	2010	PLATA	NSP120-2001666	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	255	\N
273	\N	\N	\N	\N	OTRO	WISH Color: PERLA Año: 2009 Motor: 1800 c.c	2009	PERLA	ZGE200011405	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	256	\N
81	\N	\N	\N	\N	OTRO	IST Color: PLATA Año: 2002 Motor: 1500 c.c	2002	PLATA	NCP650004370	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	257	\N
269	\N	\N	\N	\N	OTRO	BELTA Color: PLATA Año: 2005 Motor: 1300 c.c	2005	PLATA	SCP921000663	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	258	\N
120	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL Año: 2010 Motor: 1300 c.c	2010	AZUL	NSP1202001986	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	259	\N
216	\N	\N	\N	\N	OTRO	RACTIS Color: AZUL Año: 2010 Motor: 1300 c.c	2010	AZUL	SCP100-2005571	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	259	\N
289	\N	\N	\N	\N	OTRO	VOXY Color: NEGRO Año: 2009 Motor: 2000 c.c	2009	NEGRO	ZRR700189000	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	260	\N
144	\N	\N	\N	\N	OTRO	VITZ JEWELLA Color: MARRON Año: 2011 Motor: 1300 c.c	2011	MARRON	NSP1302040627	\N	0	NULL	NULL	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	DISPONIBLE	\N	\N	\N	t	\N	\N	\N	2	261	\N
\.


--
-- Data for Name: referencias; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.referencias (id_referencia, id_playa, id_cliente, tipo_entidad, tipo_referencia, nombre, telefono, parentesco_cargo, observaciones, fecha_registro, activo) FROM stdin;
\.


--
-- Data for Name: refuerzos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.refuerzos (id_refuerzo, id_playa, id_venta, numero_refuerzo, monto_refuerzo, fecha_vencimiento, estado, id_pagare, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: tipos_gastos_empresa; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.tipos_gastos_empresa (id_tipo_gasto_empresa, id_playa, nombre, descripcion, es_fijo, activo) FROM stdin;
\.


--
-- Data for Name: tipos_gastos_productos; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.tipos_gastos_productos (id_tipo_gasto, id_playa, nombre, descripcion, activo) FROM stdin;
\.


--
-- Data for Name: ubicaciones_cliente; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.ubicaciones_cliente (id_ubicacion, id_playa, id_cliente, nombre_lugar, tipo_ubicacion, latitud, longitud, direccion_texto, referencia, fecha_registro) FROM stdin;
\.


--
-- Data for Name: vendedores; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.vendedores (id_vendedor, id_playa, nombre, apellido, telefono, email, activo, fecha_registro) FROM stdin;
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: playa; Owner: postgres
--

COPY playa.ventas (id_venta, id_playa, numero_venta, id_cliente, id_producto, fecha_venta, tipo_venta, precio_venta, descuento, precio_final, entrega_inicial, saldo_financiar, cantidad_cuotas, monto_cuota, tasa_interes, tiene_refuerzos, periodicidad_refuerzos, monto_refuerzo, cantidad_refuerzos, periodo_int_mora, monto_int_mora, dias_gracia, estado_venta, vendedor, id_vendedor, id_escribania, tipo_documento_propiedad, observaciones, fecha_registro) FROM stdin;
\.


--
-- Data for Name: backups_sistema; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.backups_sistema (id, nombre, descripcion, ruta_archivo, tamano_bytes, tipo, estado, fecha_inicio, fecha_fin, creado_por, detalles) FROM stdin;
\.


--
-- Data for Name: configuracion_email; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.configuracion_email (id, nombre, host, puerto, username, password, from_email, use_tls, use_ssl, activo, fecha_creacion, creado_por) FROM stdin;
\.


--
-- Data for Name: logs_acceso; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.logs_acceso (id, usuario_id, username, accion, ip_address, user_agent, fecha, detalles, exitoso) FROM stdin;
1	\N	admin	login	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-27 18:31:03.761549	null	t
2	\N	admin	login	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-27 19:12:25.093566	null	t
3	\N	admin	logout	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-27 19:30:01.677408	null	t
4	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-29 09:42:03.359363	null	t
5	\N	admin	change_password	\N	\N	2026-03-29 09:42:33.249817	null	t
6	\N	admin	update_user	\N	\N	2026-03-29 09:42:33.331318	{"mensaje": "Usuario actualizado: admin"}	t
7	\N	admin	login	192.168.32.2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 08:15:32.642344	null	t
8	\N	admin	login	192.168.32.2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 14:42:33.387007	null	t
9	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:24:23.980988	null	t
10	\N	admin	create_user	\N	\N	2026-04-24 16:25:48.719968	{"mensaje": "Usuario creado: micoche"}	t
11	\N	admin	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:26:13.130096	null	t
12	\N	micoche	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:26:27.223729	null	t
13	\N	micoche	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:27:08.84795	null	t
14	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:27:16.623379	null	t
15	\N	admin	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:27:24.318351	null	t
16	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:27:46.635407	null	t
17	\N	admin	update_user	\N	\N	2026-04-24 16:27:59.089819	{"mensaje": "Usuario actualizado: micoche"}	t
18	\N	admin	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:01.904056	null	t
19	\N	micoche	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:07.869042	null	t
20	\N	micoche	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:25.408556	null	t
21	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:31.031629	null	t
22	\N	admin	update_user	\N	\N	2026-04-24 16:28:47.947928	{"mensaje": "Usuario actualizado: micoche"}	t
23	\N	admin	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:52.116367	null	t
24	\N	micoche	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:28:58.484984	null	t
25	\N	micoche	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:29:08.35569	null	t
26	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:29:15.830918	null	t
27	\N	admin	update_user	\N	\N	2026-04-24 16:29:32.54241	{"mensaje": "Usuario actualizado: micoche"}	t
28	\N	admin	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:29:40.681805	null	t
29	\N	micoche	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:29:48.465418	null	t
30	\N	micoche	logout	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:32:24.278577	null	t
31	\N	admin	login	192.168.32.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:32:30.630678	null	t
32	\N	admin	login	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 16:46:15.168447	null	t
33	1	admin	hard_delete_user	\N	\N	2026-04-24 16:51:38.27444	{"mensaje": "Usuario eliminado f\\u00edsicamente: micoche"}	t
34	\N	admin	create_user	\N	\N	2026-04-24 17:04:36.350234	{"mensaje": "Usuario creado: micoche"}	t
35	\N	admin	logout	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 17:04:59.780825	null	t
36	\N	micoche	login	192.168.32.4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-24 17:05:05.991627	null	t
37	\N	admin	login	192.168.32.2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-27 13:51:26.733	null	t
\.


--
-- Data for Name: logs_auditoria; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.logs_auditoria (id, usuario_id, username, accion, tabla, registro_id, datos_anteriores, datos_nuevos, ip_address, user_agent, fecha, detalles) FROM stdin;
1	1	admin	update	usuarios	1	null	{"email": "admin@miplaya.com", "nombre_completo": "Administrador Sistema", "rol": "admin"}	\N	\N	2026-03-29 12:42:33.343367	Usuario actualizado: admin
2	1	admin	delete	catalogo_modelos	9	{"nombre": "VITZ RS MECANICO Color: NEGRO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:16.946145	Catálogo modelo eliminado: VITZ RS MECANICO Color: NEGRO Año: 2006 Motor: 1500 c.c
3	1	admin	delete	catalogo_modelos	45	{"nombre": "VITZ RS MECANICO Color: BLANCO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:20.302574	Catálogo modelo eliminado: VITZ RS MECANICO Color: BLANCO Año: 2006 Motor: 1500 c.c
4	1	admin	delete	catalogo_modelos	211	{"nombre": "VITZ RS Color: TURQUESA A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:23.168704	Catálogo modelo eliminado: VITZ RS Color: TURQUESA Año: 2011 Motor: 1500 c.c
5	1	admin	delete	catalogo_modelos	101	{"nombre": "VITZ RS Color: NEGRO A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:27.600576	Catálogo modelo eliminado: VITZ RS Color: NEGRO Año: 2011 Motor: 1500 c.c
6	1	admin	delete	catalogo_modelos	185	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:32.247538	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2011 Motor: 1500 c.c
7	1	admin	delete	catalogo_modelos	166	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:34.28663	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2009 Motor: 1300 c.c
8	1	admin	delete	catalogo_modelos	194	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:36.278976	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2010 Motor: 1300 c.c
9	1	admin	delete	catalogo_modelos	46	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2012 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:38.366169	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2012 Motor: 1500 c.c
10	1	admin	delete	catalogo_modelos	219	{"nombre": "VITZ RS Color: NEGRO A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:40.403692	Catálogo modelo eliminado: VITZ RS Color: NEGRO Año: 2008 Motor: 1300 c.c
11	1	admin	delete	catalogo_modelos	205	{"nombre": "VITZ RS Color: NEGRO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:43.043076	Catálogo modelo eliminado: VITZ RS Color: NEGRO Año: 2009 Motor: 1300 c.c
12	1	admin	delete	catalogo_modelos	138	{"nombre": "VITZ RS Color: NEGRO A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:45.232451	Catálogo modelo eliminado: VITZ RS Color: NEGRO Año: 2010 Motor: 1300 c.c
13	1	admin	delete	catalogo_modelos	117	{"nombre": "VITZ   Color: PLATA A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:56.921851	Catálogo modelo eliminado: VITZ   Color: PLATA Año: 2011 Motor: 1300 c.c
14	1	admin	delete	catalogo_modelos	157	{"nombre": "VITZ  Color: BLANCO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:45:59.333041	Catálogo modelo eliminado: VITZ  Color: BLANCO Año: 2011 Motor: 1300 c.c
15	1	admin	delete	catalogo_modelos	161	{"nombre": "VITZ  Color: NEGRO A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:01.309512	Catálogo modelo eliminado: VITZ  Color: NEGRO Año: 2006 Motor: 1300 c.c
16	1	admin	delete	catalogo_modelos	24	{"nombre": "VITZ  Color: PURPURA METALIZADO A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:03.075203	Catálogo modelo eliminado: VITZ  Color: PURPURA METALIZADO Año: 2005 Motor: 1300 c.c
17	1	admin	delete	catalogo_modelos	38	{"nombre": "VITZ AZUL 2010", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:04.708205	Catálogo modelo eliminado: VITZ AZUL 2010
18	1	admin	delete	catalogo_modelos	131	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:06.190082	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2005 Motor: 1300 c.c
19	1	admin	delete	catalogo_modelos	98	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:08.043873	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2006 Motor: 1300 c.c
20	1	admin	delete	catalogo_modelos	180	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:09.827538	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2007 Motor: 1300 c.c
21	1	admin	delete	catalogo_modelos	208	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:11.586868	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2008 Motor: 1300 c.c
22	1	admin	delete	catalogo_modelos	130	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:13.331018	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2009 Motor: 1300 c.c
23	1	admin	delete	catalogo_modelos	59	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2014 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:14.970607	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2014 Motor: 1300 c.c
24	1	admin	delete	catalogo_modelos	53	{"nombre": "VITZ Color: AZUL A\\u00f1o: 2016 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:16.748044	Catálogo modelo eliminado: VITZ Color: AZUL Año: 2016 Motor: 1300 c.c
25	1	admin	delete	catalogo_modelos	33	{"nombre": "VITZ Color: BLANCO A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:18.393278	Catálogo modelo eliminado: VITZ Color: BLANCO Año: 2005 Motor: 1300 c.c
26	1	admin	delete	catalogo_modelos	61	{"nombre": "VITZ Color: BLANCO A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:20.113126	Catálogo modelo eliminado: VITZ Color: BLANCO Año: 2006 Motor: 1300 c.c
27	1	admin	delete	catalogo_modelos	114	{"nombre": "VITZ Color: BLANCO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:22.005844	Catálogo modelo eliminado: VITZ Color: BLANCO Año: 2009 Motor: 1300 c.c
28	1	admin	delete	catalogo_modelos	135	{"nombre": "VITZ Color: BORDO A\\u00f1o: 2013 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:24.993124	Catálogo modelo eliminado: VITZ Color: BORDO Año: 2013 Motor: 1300 c.c
29	1	admin	delete	catalogo_modelos	200	{"nombre": "VITZ Color: CELESTE A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:26.763251	Catálogo modelo eliminado: VITZ Color: CELESTE Año: 2005 Motor: 1300 c.c
30	1	admin	delete	catalogo_modelos	143	{"nombre": "VITZ Color: CELESTE A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:28.434794	Catálogo modelo eliminado: VITZ Color: CELESTE Año: 2006 Motor: 1300 c.c
31	1	admin	delete	catalogo_modelos	154	{"nombre": "VITZ Color: CELESTE A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:30.126483	Catálogo modelo eliminado: VITZ Color: CELESTE Año: 2011 Motor: 1300 c.c
32	1	admin	delete	catalogo_modelos	25	{"nombre": "VITZ Color: FUCSIA A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:31.891457	Catálogo modelo eliminado: VITZ Color: FUCSIA Año: 2005 Motor: 1300 c.c
33	1	admin	delete	catalogo_modelos	210	{"nombre": "VITZ Color: GRIS A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:33.508847	Catálogo modelo eliminado: VITZ Color: GRIS Año: 2006 Motor: 1300 c.c
34	1	admin	delete	catalogo_modelos	129	{"nombre": "VITZ Color: GRIS A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:35.445913	Catálogo modelo eliminado: VITZ Color: GRIS Año: 2007 Motor: 1500 c.c
35	1	admin	delete	catalogo_modelos	252	{"nombre": "VITZ Color: GRIS A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:36.980582	Catálogo modelo eliminado: VITZ Color: GRIS Año: 2011 Motor: 1300 c.c
36	1	admin	delete	catalogo_modelos	167	{"nombre": "VITZ Color: GRIS METALIZADO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:38.47305	Catálogo modelo eliminado: VITZ Color: GRIS METALIZADO Año: 2011 Motor: 1300 c.c
39	1	admin	delete	catalogo_modelos	122	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:43.861324	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2007 Motor: 1300 c.c
40	1	admin	delete	catalogo_modelos	245	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:45.39262	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2008 Motor: 1300 c.c
44	1	admin	delete	catalogo_modelos	82	{"nombre": "VITZ Color: PERLA A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:51.64683	Catálogo modelo eliminado: VITZ Color: PERLA Año: 2009 Motor: 1300 c.c
47	1	admin	delete	catalogo_modelos	164	{"nombre": "VITZ Color: PLATA A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:56.742546	Catálogo modelo eliminado: VITZ Color: PLATA Año: 2005 Motor: 1300 c.c
48	1	admin	delete	catalogo_modelos	251	{"nombre": "VITZ Color: PLATA A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:58.186586	Catálogo modelo eliminado: VITZ Color: PLATA Año: 2006 Motor: 1300 c.c
51	1	admin	delete	catalogo_modelos	127	{"nombre": "VITZ Color: PLATA A\\u00f1o: 2013 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:02.998211	Catálogo modelo eliminado: VITZ Color: PLATA Año: 2013 Motor: 1300 c.c
56	1	admin	delete	catalogo_modelos	41	{"nombre": "VITZ Color: PURPURA A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:10.645594	Catálogo modelo eliminado: VITZ Color: PURPURA Año: 2010 Motor: 1300 c.c
57	1	admin	delete	catalogo_modelos	147	{"nombre": "VITZ Color: PURPURA A\\u00f1o: 2012 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:12.05892	Catálogo modelo eliminado: VITZ Color: PURPURA Año: 2012 Motor: 1300 c.c
60	1	admin	delete	catalogo_modelos	12	{"nombre": "VITZ Color: ROSADO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:16.290268	Catálogo modelo eliminado: VITZ Color: ROSADO Año: 2011 Motor: 1300 c.c
64	1	admin	delete	catalogo_modelos	28	{"nombre": "VITZ JEWELLA Color: BORDO A\\u00f1o: 2014 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:22.553305	Catálogo modelo eliminado: VITZ JEWELLA Color: BORDO Año: 2014 Motor: 1300 c.c
65	1	admin	delete	catalogo_modelos	261	{"nombre": "VITZ JEWELLA Color: MARRON A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:24.06349	Catálogo modelo eliminado: VITZ JEWELLA Color: MARRON Año: 2011 Motor: 1300 c.c
66	1	admin	delete	catalogo_modelos	19	{"nombre": "VITZ JEWELLA Color: MARRON A\\u00f1o: 2012 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:25.590614	Catálogo modelo eliminado: VITZ JEWELLA Color: MARRON Año: 2012 Motor: 1300 c.c
69	1	admin	delete	catalogo_modelos	18	{"nombre": "VITZ JEWELLA Color: PLATA A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:30.209581	Catálogo modelo eliminado: VITZ JEWELLA Color: PLATA Año: 2011 Motor: 1300 c.c
70	1	admin	delete	catalogo_modelos	80	{"nombre": "VITZ JEWELLA Color: ROJO A\\u00f1o: 2013 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:31.6693	Catálogo modelo eliminado: VITZ JEWELLA Color: ROJO Año: 2013 Motor: 1300 c.c
73	1	admin	delete	catalogo_modelos	10	{"nombre": "VITZ RS Color: BLANCO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:36.386524	Catálogo modelo eliminado: VITZ RS Color: BLANCO Año: 2009 Motor: 1300 c.c
75	1	admin	delete	catalogo_modelos	13	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2001 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:39.629485	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2001 Motor: 1300 c.c
76	1	admin	delete	catalogo_modelos	241	{"nombre": "VITZ RS Color: GRIS A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:42.01214	Catálogo modelo eliminado: VITZ RS Color: GRIS Año: 2005 Motor: 1500 c.c
37	1	admin	delete	catalogo_modelos	160	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:40.299304	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2005 Motor: 1300 c.c
38	1	admin	delete	catalogo_modelos	62	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:42.103157	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2006 Motor: 1300 c.c
41	1	admin	delete	catalogo_modelos	92	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:46.990434	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2009 Motor: 1300 c.c
42	1	admin	delete	catalogo_modelos	213	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:48.592892	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2010 Motor: 1300 c.c
43	1	admin	delete	catalogo_modelos	54	{"nombre": "VITZ Color: NEGRO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:50.172398	Catálogo modelo eliminado: VITZ Color: NEGRO Año: 2011 Motor: 1300 c.c
45	1	admin	delete	catalogo_modelos	232	{"nombre": "VITZ Color: PERLA A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:53.652741	Catálogo modelo eliminado: VITZ Color: PERLA Año: 2011 Motor: 1300 c.c
46	1	admin	delete	catalogo_modelos	124	{"nombre": "VITZ Color: PERLA A\\u00f1o: 2012 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:55.228775	Catálogo modelo eliminado: VITZ Color: PERLA Año: 2012 Motor: 1300 c.c
49	1	admin	delete	catalogo_modelos	190	{"nombre": "VITZ Color: PLATA A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:46:59.743185	Catálogo modelo eliminado: VITZ Color: PLATA Año: 2007 Motor: 1300 c.c
50	1	admin	delete	catalogo_modelos	144	{"nombre": "VITZ Color: PLATA A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:01.358508	Catálogo modelo eliminado: VITZ Color: PLATA Año: 2011 Motor: 1300 c.c
52	1	admin	delete	catalogo_modelos	226	{"nombre": "VITZ Color: PLATEADO A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:04.44613	Catálogo modelo eliminado: VITZ Color: PLATEADO Año: 2007 Motor: 1300 c.c
53	1	admin	delete	catalogo_modelos	71	{"nombre": "VITZ Color: PLATEADO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:05.917428	Catálogo modelo eliminado: VITZ Color: PLATEADO Año: 2009 Motor: 1300 c.c
54	1	admin	delete	catalogo_modelos	217	{"nombre": "VITZ Color: PURPURA A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:07.570431	Catálogo modelo eliminado: VITZ Color: PURPURA Año: 2007 Motor: 1300 c.c
55	1	admin	delete	catalogo_modelos	34	{"nombre": "VITZ Color: PURPURA A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:09.201325	Catálogo modelo eliminado: VITZ Color: PURPURA Año: 2008 Motor: 1300 c.c
58	1	admin	delete	catalogo_modelos	116	{"nombre": "VITZ Color: ROJO A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:13.439907	Catálogo modelo eliminado: VITZ Color: ROJO Año: 2005 Motor: 1300 c.c
59	1	admin	delete	catalogo_modelos	93	{"nombre": "VITZ Color: ROJO A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:14.831741	Catálogo modelo eliminado: VITZ Color: ROJO Año: 2008 Motor: 1300 c.c
61	1	admin	delete	catalogo_modelos	40	{"nombre": "VITZ Color: VERDE A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:17.741998	Catálogo modelo eliminado: VITZ Color: VERDE Año: 2005 Motor: 1300 c.c
62	1	admin	delete	catalogo_modelos	99	{"nombre": "VITZ Color: VERDE A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:19.408127	Catálogo modelo eliminado: VITZ Color: VERDE Año: 2007 Motor: 1300 c.c
63	1	admin	delete	catalogo_modelos	2	{"nombre": "VITZ ILL Color: AZUL GRIS A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:20.909774	Catálogo modelo eliminado: VITZ ILL Color: AZUL GRIS Año: 2008 Motor: 1300 c.c
67	1	admin	delete	catalogo_modelos	43	{"nombre": "VITZ JEWELLA Color: MARRON A\\u00f1o: 2014 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:27.086092	Catálogo modelo eliminado: VITZ JEWELLA Color: MARRON Año: 2014 Motor: 1300 c.c
68	1	admin	delete	catalogo_modelos	254	{"nombre": "VITZ JEWELLA Color: NEGRO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:28.664587	Catálogo modelo eliminado: VITZ JEWELLA Color: NEGRO Año: 2011 Motor: 1300 c.c
71	1	admin	delete	catalogo_modelos	181	{"nombre": "VITZ RS Color: AZUL A\\u00f1o: 2001 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:33.291749	Catálogo modelo eliminado: VITZ RS Color: AZUL Año: 2001 Motor: 1300 c.c
72	1	admin	delete	catalogo_modelos	250	{"nombre": "VITZ RS Color: AZUL A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:34.867396	Catálogo modelo eliminado: VITZ RS Color: AZUL Año: 2008 Motor: 1500 c.c
74	1	admin	delete	catalogo_modelos	176	{"nombre": "VITZ RS Color: BLANCO A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:37.968024	Catálogo modelo eliminado: VITZ RS Color: BLANCO Año: 2011 Motor: 1500 c.c
77	1	admin	delete	catalogo_modelos	227	{"nombre": "VOXY Color: AZUL A\\u00f1o: 2009 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:47:58.324374	Catálogo modelo eliminado: VOXY Color: AZUL Año: 2009 Motor: 2000 c.c
78	1	admin	delete	catalogo_modelos	231	{"nombre": "VOXY Color: NEGRO A\\u00f1o: 2005 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:02.493267	Catálogo modelo eliminado: VOXY Color: NEGRO Año: 2005 Motor: 2000 c.c
79	1	admin	delete	catalogo_modelos	102	{"nombre": "VOXY Color: NEGRO A\\u00f1o: 2008 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:05.39207	Catálogo modelo eliminado: VOXY Color: NEGRO Año: 2008 Motor: 2000 c.c
80	1	admin	delete	catalogo_modelos	260	{"nombre": "VOXY Color: NEGRO A\\u00f1o: 2009 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:08.203595	Catálogo modelo eliminado: VOXY Color: NEGRO Año: 2009 Motor: 2000 c.c
81	1	admin	delete	catalogo_modelos	224	{"nombre": "VOXY Color: NEGRO A\\u00f1o: 2014 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:11.745067	Catálogo modelo eliminado: VOXY Color: NEGRO Año: 2014 Motor: 2000 c.c
82	1	admin	delete	catalogo_modelos	111	{"nombre": "VOXY Color: PERLA A\\u00f1o: 2005 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:14.148307	Catálogo modelo eliminado: VOXY Color: PERLA Año: 2005 Motor: 2000 c.c
83	1	admin	delete	catalogo_modelos	204	{"nombre": "VOXY Color: PERLA A\\u00f1o: 2008 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:15.882698	Catálogo modelo eliminado: VOXY Color: PERLA Año: 2008 Motor: 2000 c.c
84	1	admin	delete	catalogo_modelos	125	{"nombre": "VOXY Color: PERLA A\\u00f1o: 2009 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:17.512948	Catálogo modelo eliminado: VOXY Color: PERLA Año: 2009 Motor: 2000 c.c
85	1	admin	delete	catalogo_modelos	132	{"nombre": "VOXY Color: PERLA A\\u00f1o: 2014 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:19.129814	Catálogo modelo eliminado: VOXY Color: PERLA Año: 2014 Motor: 2000 c.c
86	1	admin	delete	catalogo_modelos	65	{"nombre": "VOXY Color: PLATA A\\u00f1o: 2007 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:20.662759	Catálogo modelo eliminado: VOXY Color: PLATA Año: 2007 Motor: 2000 c.c
87	1	admin	delete	catalogo_modelos	175	{"nombre": "WISH Color: GRIS A\\u00f1o: 2003 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:28.382766	Catálogo modelo eliminado: WISH Color: GRIS Año: 2003 Motor: 1800 c.c
90	1	admin	delete	catalogo_modelos	55	{"nombre": "WISH Color: NEGRO A\\u00f1o: 2010 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:33.148542	Catálogo modelo eliminado: WISH Color: NEGRO Año: 2010 Motor: 1800 c.c
91	1	admin	delete	catalogo_modelos	256	{"nombre": "WISH Color: PERLA A\\u00f1o: 2009 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:34.663619	Catálogo modelo eliminado: WISH Color: PERLA Año: 2009 Motor: 1800 c.c
93	1	admin	delete	catalogo_modelos	105	{"nombre": "ALLION Color: BLANCO A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:18.271014	Catálogo modelo eliminado: ALLION Color: BLANCO Año: 2003 Motor: 1500 c.c
95	1	admin	delete	catalogo_modelos	83	{"nombre": "ALLION Color: CELESTE A\\u00f1o: 2002 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:21.737305	Catálogo modelo eliminado: ALLION Color: CELESTE Año: 2002 Motor: 1500 c.c
98	1	admin	delete	catalogo_modelos	17	{"nombre": "ALLION Color: NEGRO A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:26.722317	Catálogo modelo eliminado: ALLION Color: NEGRO Año: 2008 Motor: 1800 c.c
105	1	admin	delete	catalogo_modelos	196	{"nombre": "ALLION Color: PLATA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:40.027206	Catálogo modelo eliminado: ALLION Color: PLATA Año: 2007 Motor: 1500 c.c
107	1	admin	delete	catalogo_modelos	189	{"nombre": "AQUA Color: NEGRO A\\u00f1o: 2012 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:49.932768	Catálogo modelo eliminado: AQUA Color: NEGRO Año: 2012 Motor: 1500 c.c
108	1	admin	delete	catalogo_modelos	112	{"nombre": "ATLAS Color: AZUL A\\u00f1o: 1995 Motor: 2500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:56.034146	Catálogo modelo eliminado: ATLAS Color: AZUL Año: 1995 Motor: 2500 c.c
109	1	admin	delete	catalogo_modelos	23	{"nombre": "ATLAS Color: BLANCO A\\u00f1o: 1999 Motor: 2500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:58.997434	Catálogo modelo eliminado: ATLAS Color: BLANCO Año: 1999 Motor: 2500 c.c
110	1	admin	delete	catalogo_modelos	51	{"nombre": "AURIS  Color: PLATA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:04.470553	Catálogo modelo eliminado: AURIS  Color: PLATA Año: 2007 Motor: 1500 c.c
111	1	admin	delete	catalogo_modelos	1	{"nombre": "AURIS Color: AZUL A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:06.246979	Catálogo modelo eliminado: AURIS Color: AZUL Año: 2007 Motor: 1500 c.c
114	1	admin	delete	catalogo_modelos	150	{"nombre": "AURIS Color: LILA A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:15.44404	Catálogo modelo eliminado: AURIS Color: LILA Año: 2008 Motor: 1500 c.c
116	1	admin	delete	catalogo_modelos	79	{"nombre": "AURIS Color: NEGRO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:18.992134	Catálogo modelo eliminado: AURIS Color: NEGRO Año: 2008 Motor: 1500 c.c
117	1	admin	delete	catalogo_modelos	233	{"nombre": "AURIS Color: NEGRO A\\u00f1o: 2012 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:20.664891	Catálogo modelo eliminado: AURIS Color: NEGRO Año: 2012 Motor: 1500 c.c
118	1	admin	delete	catalogo_modelos	136	{"nombre": "AURIS Color: NEGRO A\\u00f1o: 2013 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:22.461298	Catálogo modelo eliminado: AURIS Color: NEGRO Año: 2013 Motor: 1500 c.c
119	1	admin	delete	catalogo_modelos	27	{"nombre": "AURIS Color: PERLA A\\u00f1o: 2006 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:24.106447	Catálogo modelo eliminado: AURIS Color: PERLA Año: 2006 Motor: 1800 c.c
122	1	admin	delete	catalogo_modelos	89	{"nombre": "AURIS Color: PERLA A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:31.169467	Catálogo modelo eliminado: AURIS Color: PERLA Año: 2008 Motor: 1800 c.c
123	1	admin	delete	catalogo_modelos	158	{"nombre": "AURIS Color: PLATA A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:32.829774	Catálogo modelo eliminado: AURIS Color: PLATA Año: 2008 Motor: 1800 c.c
126	1	admin	delete	catalogo_modelos	110	{"nombre": "BEGO Color: AZUL A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:53.519781	Catálogo modelo eliminado: BEGO Color: AZUL Año: 2006 Motor: 1500 c.c
129	1	admin	delete	catalogo_modelos	258	{"nombre": "BELTA Color: PLATA A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:01.913755	Catálogo modelo eliminado: BELTA Color: PLATA Año: 2005 Motor: 1300 c.c
132	1	admin	delete	catalogo_modelos	238	{"nombre": "CALDINA Color: NEGRO A\\u00f1o: 2005 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:09.248189	Catálogo modelo eliminado: CALDINA Color: NEGRO Año: 2005 Motor: 1800 c.c
133	1	admin	delete	catalogo_modelos	223	{"nombre": "CALDINA Color: PLATA A\\u00f1o: 2005 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:10.896752	Catálogo modelo eliminado: CALDINA Color: PLATA Año: 2005 Motor: 1800 c.c
134	1	admin	delete	catalogo_modelos	20	{"nombre": "CANTER Color: BLANCO A\\u00f1o: 2000 Motor: 0 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:14.312977	Catálogo modelo eliminado: CANTER Color: BLANCO Año: 2000 Motor: 0 c.c
135	1	admin	delete	catalogo_modelos	100	{"nombre": "COROLLA AXIO Color: AZUL A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:22.435349	Catálogo modelo eliminado: COROLLA AXIO Color: AZUL Año: 2007 Motor: 1500 c.c
139	1	admin	delete	catalogo_modelos	202	{"nombre": "COROLLA FIELDER Color: NEGRO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:37.793516	Catálogo modelo eliminado: COROLLA FIELDER Color: NEGRO Año: 2008 Motor: 1500 c.c
142	1	admin	delete	catalogo_modelos	96	{"nombre": "COROLLA SPACIO Color: AZUL A\\u00f1o: 2001 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:49.018883	Catálogo modelo eliminado: COROLLA SPACIO Color: AZUL Año: 2001 Motor: 1500 c.c
143	1	admin	delete	catalogo_modelos	230	{"nombre": "COROLLA SPACIO Color: BORDO A\\u00f1o: 2002 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:51.345145	Catálogo modelo eliminado: COROLLA SPACIO Color: BORDO Año: 2002 Motor: 1800 c.c
88	1	admin	delete	catalogo_modelos	75	{"nombre": "WISH Color: GRIS A\\u00f1o: 2004 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:29.990722	Catálogo modelo eliminado: WISH Color: GRIS Año: 2004 Motor: 2000 c.c
89	1	admin	delete	catalogo_modelos	162	{"nombre": "WISH Color: NEGRO A\\u00f1o: 2009 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:48:31.538268	Catálogo modelo eliminado: WISH Color: NEGRO Año: 2009 Motor: 1800 c.c
92	1	admin	delete	catalogo_modelos	239	{"nombre": "ALLEX Color: BEIGE A\\u00f1o: 2002 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:14.523959	Catálogo modelo eliminado: ALLEX Color: BEIGE Año: 2002 Motor: 1500 c.c
94	1	admin	delete	catalogo_modelos	22	{"nombre": "ALLION Color: BLANCO A\\u00f1o: 2007 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:20.101779	Catálogo modelo eliminado: ALLION Color: BLANCO Año: 2007 Motor: 1800 c.c
96	1	admin	delete	catalogo_modelos	103	{"nombre": "ALLION Color: CELESTE A\\u00f1o: 2002 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:23.305806	Catálogo modelo eliminado: ALLION Color: CELESTE Año: 2002 Motor: 2000 c.c
97	1	admin	delete	catalogo_modelos	66	{"nombre": "ALLION Color: CELESTE A\\u00f1o: 2004 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:24.90297	Catálogo modelo eliminado: ALLION Color: CELESTE Año: 2004 Motor: 1800 c.c
99	1	admin	delete	catalogo_modelos	173	{"nombre": "ALLION Color: PERLA A\\u00f1o: 2002 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:28.443576	Catálogo modelo eliminado: ALLION Color: PERLA Año: 2002 Motor: 1800 c.c
100	1	admin	delete	catalogo_modelos	121	{"nombre": "ALLION Color: PERLA A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:30.149311	Catálogo modelo eliminado: ALLION Color: PERLA Año: 2003 Motor: 1500 c.c
101	1	admin	delete	catalogo_modelos	201	{"nombre": "ALLION Color: PERLA A\\u00f1o: 2003 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:32.063576	Catálogo modelo eliminado: ALLION Color: PERLA Año: 2003 Motor: 1800 c.c
102	1	admin	delete	catalogo_modelos	16	{"nombre": "ALLION Color: PERLA A\\u00f1o: 2006 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:34.052758	Catálogo modelo eliminado: ALLION Color: PERLA Año: 2006 Motor: 1800 c.c
103	1	admin	delete	catalogo_modelos	169	{"nombre": "ALLION Color: PLATA A\\u00f1o: 2002 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:36.20994	Catálogo modelo eliminado: ALLION Color: PLATA Año: 2002 Motor: 1800 c.c
104	1	admin	delete	catalogo_modelos	74	{"nombre": "ALLION Color: PLATA A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:38.270231	Catálogo modelo eliminado: ALLION Color: PLATA Año: 2003 Motor: 1500 c.c
106	1	admin	delete	catalogo_modelos	199	{"nombre": "ALLION Color: PLATA A\\u00f1o: 2009 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:49:41.878816	Catálogo modelo eliminado: ALLION Color: PLATA Año: 2009 Motor: 1500 c.c
112	1	admin	delete	catalogo_modelos	15	{"nombre": "AURIS Color: BORDO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:07.85143	Catálogo modelo eliminado: AURIS Color: BORDO Año: 2006 Motor: 1500 c.c
113	1	admin	delete	catalogo_modelos	56	{"nombre": "AURIS Color: BORDO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:09.391956	Catálogo modelo eliminado: AURIS Color: BORDO Año: 2008 Motor: 1500 c.c
115	1	admin	delete	catalogo_modelos	91	{"nombre": "AURIS Color: NEGRO A\\u00f1o: 2007 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:17.065942	Catálogo modelo eliminado: AURIS Color: NEGRO Año: 2007 Motor: 1800 c.c
120	1	admin	delete	catalogo_modelos	234	{"nombre": "AURIS Color: PERLA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:27.320007	Catálogo modelo eliminado: AURIS Color: PERLA Año: 2007 Motor: 1500 c.c
121	1	admin	delete	catalogo_modelos	228	{"nombre": "AURIS Color: PERLA A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:29.103628	Catálogo modelo eliminado: AURIS Color: PERLA Año: 2008 Motor: 1500 c.c
124	1	admin	delete	catalogo_modelos	123	{"nombre": "AURIS Color: PLATA A\\u00f1o: 2009 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:34.414061	Catálogo modelo eliminado: AURIS Color: PLATA Año: 2009 Motor: 1500 c.c
125	1	admin	delete	catalogo_modelos	26	{"nombre": "AXIO Color: AZUL A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:45.333712	Catálogo modelo eliminado: AXIO Color: AZUL Año: 2008 Motor: 1500 c.c
127	1	admin	delete	catalogo_modelos	171	{"nombre": "BELTA Color: AZUL A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:50:58.676657	Catálogo modelo eliminado: BELTA Color: AZUL Año: 2007 Motor: 1300 c.c
128	1	admin	delete	catalogo_modelos	52	{"nombre": "BELTA Color: PERLA A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:00.438764	Catálogo modelo eliminado: BELTA Color: PERLA Año: 2007 Motor: 1300 c.c
130	1	admin	delete	catalogo_modelos	72	{"nombre": "BELTA Color: PLATA A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:03.414922	Catálogo modelo eliminado: BELTA Color: PLATA Año: 2006 Motor: 1300 c.c
131	1	admin	delete	catalogo_modelos	76	{"nombre": "CALDINA Color: BLANCO A\\u00f1o: 2007 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:07.3031	Catálogo modelo eliminado: CALDINA Color: BLANCO Año: 2007 Motor: 2000 c.c
136	1	admin	delete	catalogo_modelos	184	{"nombre": "COROLLA AXIO Color: BLANCO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:27.440438	Catálogo modelo eliminado: COROLLA AXIO Color: BLANCO Año: 2008 Motor: 1500 c.c
137	1	admin	delete	catalogo_modelos	159	{"nombre": "COROLLA AXIO LUXEL Color: AZUL A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:32.593668	Catálogo modelo eliminado: COROLLA AXIO LUXEL Color: AZUL Año: 2006 Motor: 1500 c.c
138	1	admin	delete	catalogo_modelos	119	{"nombre": "COROLLA FIELDER Color: NEGRO A\\u00f1o: 2003 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:35.830735	Catálogo modelo eliminado: COROLLA FIELDER Color: NEGRO Año: 2003 Motor: 1800 c.c
140	1	admin	delete	catalogo_modelos	216	{"nombre": "COROLLA RUNX Color: PLATA A\\u00f1o: 2001 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:41.287731	Catálogo modelo eliminado: COROLLA RUNX Color: PLATA Año: 2001 Motor: 1500 c.c
141	1	admin	delete	catalogo_modelos	243	{"nombre": "COROLLA RUNX Color: PURPURA OSCURO A\\u00f1o: 2002 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:44.351001	Catálogo modelo eliminado: COROLLA RUNX Color: PURPURA OSCURO Año: 2002 Motor: 1800 c.c
144	1	admin	delete	catalogo_modelos	249	{"nombre": "COROLLA SPACIO Color: PLATA A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:53.346671	Catálogo modelo eliminado: COROLLA SPACIO Color: PLATA Año: 2003 Motor: 1500 c.c
145	1	admin	delete	catalogo_modelos	4	{"nombre": "FIELDER Color: NEGRO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:51:59.261684	Catálogo modelo eliminado: FIELDER Color: NEGRO Año: 2006 Motor: 1500 c.c
146	1	admin	delete	catalogo_modelos	90	{"nombre": "FUNCARGO Color: BLANCO A\\u00f1o: 2000 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:03.733636	Catálogo modelo eliminado: FUNCARGO Color: BLANCO Año: 2000 Motor: 1500 c.c
147	1	admin	delete	catalogo_modelos	30	{"nombre": "FUNCARGO Color: CELESTE A\\u00f1o: 2004 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:05.460624	Catálogo modelo eliminado: FUNCARGO Color: CELESTE Año: 2004 Motor: 1300 c.c
148	1	admin	delete	catalogo_modelos	195	{"nombre": "FUNCARGO Color: CELESTE PLATA A\\u00f1o: 2003 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:07.146233	Catálogo modelo eliminado: FUNCARGO Color: CELESTE PLATA Año: 2003 Motor: 1300 c.c
149	1	admin	delete	catalogo_modelos	203	{"nombre": "FUNCARGO Color: GRIS A\\u00f1o: 2002 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:08.670282	Catálogo modelo eliminado: FUNCARGO Color: GRIS Año: 2002 Motor: 1300 c.c
150	1	admin	delete	catalogo_modelos	155	{"nombre": "FUNCARGO Color: NEGRO A\\u00f1o: 2000 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:10.33815	Catálogo modelo eliminado: FUNCARGO Color: NEGRO Año: 2000 Motor: 1500 c.c
151	1	admin	delete	catalogo_modelos	191	{"nombre": "FUNCARGO Color: PERLA A\\u00f1o: 2004 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:11.967311	Catálogo modelo eliminado: FUNCARGO Color: PERLA Año: 2004 Motor: 1300 c.c
152	1	admin	delete	catalogo_modelos	118	{"nombre": "FUNCARGO Color: PLATA A\\u00f1o: 2000 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:13.474663	Catálogo modelo eliminado: FUNCARGO Color: PLATA Año: 2000 Motor: 1300 c.c
153	1	admin	delete	catalogo_modelos	115	{"nombre": "FUNCARGO Color: PLATA A\\u00f1o: 2002 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:15.544073	Catálogo modelo eliminado: FUNCARGO Color: PLATA Año: 2002 Motor: 1300 c.c
154	1	admin	delete	catalogo_modelos	68	{"nombre": "GRAND CHEROKEE Color: NEGRO A\\u00f1o: 2013 Motor: 3000 c.c", "id_marca": 1}	null	\N	\N	2026-03-29 12:52:33.867195	Catálogo modelo eliminado: GRAND CHEROKEE Color: NEGRO Año: 2013 Motor: 3000 c.c
155	1	admin	delete	catalogo_modelos	21	{"nombre": "HILUX SURF Color: PLATA METALIZADO A\\u00f1o: 1998 Motor: 3000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:38.147738	Catálogo modelo eliminado: HILUX SURF Color: PLATA METALIZADO Año: 1998 Motor: 3000 c.c
156	1	admin	delete	catalogo_modelos	134	{"nombre": "IMPREZA AUTOMATICO Color: AZUL METALIZADO A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:42.62949	Catálogo modelo eliminado: IMPREZA AUTOMATICO Color: AZUL METALIZADO Año: 2007 Motor: 1500 c.c
157	1	admin	delete	catalogo_modelos	215	{"nombre": "IMPREZA MECANICO Color: LILA A\\u00f1o: 2009 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:45.285896	Catálogo modelo eliminado: IMPREZA MECANICO Color: LILA Año: 2009 Motor: 1500 c.c
158	1	admin	delete	catalogo_modelos	170	{"nombre": "IST Color: GRIS A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:49.165823	Catálogo modelo eliminado: IST Color: GRIS Año: 2007 Motor: 1500 c.c
159	1	admin	delete	catalogo_modelos	81	{"nombre": "IST Color: NEGRO A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:51.168731	Catálogo modelo eliminado: IST Color: NEGRO Año: 2003 Motor: 1500 c.c
160	1	admin	delete	catalogo_modelos	221	{"nombre": "IST Color: NEGRO A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:53.175967	Catálogo modelo eliminado: IST Color: NEGRO Año: 2008 Motor: 1800 c.c
161	1	admin	delete	catalogo_modelos	47	{"nombre": "IST Color: PERLA A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:55.380066	Catálogo modelo eliminado: IST Color: PERLA Año: 2003 Motor: 1500 c.c
162	1	admin	delete	catalogo_modelos	229	{"nombre": "IST Color: PERLA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:57.222341	Catálogo modelo eliminado: IST Color: PERLA Año: 2007 Motor: 1500 c.c
163	1	admin	delete	catalogo_modelos	3	{"nombre": "IST Color: PLATA A\\u00f1o: 2002 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:52:59.079344	Catálogo modelo eliminado: IST Color: PLATA Año: 2002 Motor: 1300 c.c
164	1	admin	delete	catalogo_modelos	257	{"nombre": "IST Color: PLATA A\\u00f1o: 2002 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:01.024346	Catálogo modelo eliminado: IST Color: PLATA Año: 2002 Motor: 1500 c.c
165	1	admin	delete	catalogo_modelos	78	{"nombre": "IST Color: PLATA A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:02.904262	Catálogo modelo eliminado: IST Color: PLATA Año: 2004 Motor: 1500 c.c
166	1	admin	delete	catalogo_modelos	218	{"nombre": "IST Color: VIOLETA METALIZADO A\\u00f1o: 2007 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:04.716385	Catálogo modelo eliminado: IST Color: VIOLETA METALIZADO Año: 2007 Motor: 1800 c.c
167	1	admin	delete	catalogo_modelos	84	{"nombre": "IST Color: VIOLETA METALIZADO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:06.947586	Catálogo modelo eliminado: IST Color: VIOLETA METALIZADO Año: 2008 Motor: 1500 c.c
168	1	admin	delete	catalogo_modelos	242	{"nombre": "NOAH Color: BLANCO A\\u00f1o: 1998 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:17.081613	Catálogo modelo eliminado: NOAH Color: BLANCO Año: 1998 Motor: 2000 c.c
169	1	admin	delete	catalogo_modelos	77	{"nombre": "NOAH Color: PLATA A\\u00f1o: 2008 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:19.825178	Catálogo modelo eliminado: NOAH Color: PLATA Año: 2008 Motor: 2000 c.c
170	1	admin	delete	catalogo_modelos	247	{"nombre": "PLATZ Color: CHAMPAGNE A\\u00f1o: 2001 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:25.139769	Catálogo modelo eliminado: PLATZ Color: CHAMPAGNE Año: 2001 Motor: 1500 c.c
171	1	admin	delete	catalogo_modelos	8	{"nombre": "PLATZ Color: DORADO A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:27.186918	Catálogo modelo eliminado: PLATZ Color: DORADO Año: 2003 Motor: 1500 c.c
172	1	admin	delete	catalogo_modelos	108	{"nombre": "PLATZ Color: PERLA A\\u00f1o: 2004 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:29.491351	Catálogo modelo eliminado: PLATZ Color: PERLA Año: 2004 Motor: 1300 c.c
173	1	admin	delete	catalogo_modelos	60	{"nombre": "PREMIO Color: AZUL A\\u00f1o: 2002 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:34.615503	Catálogo modelo eliminado: PREMIO Color: AZUL Año: 2002 Motor: 2000 c.c
174	1	admin	delete	catalogo_modelos	206	{"nombre": "PREMIO Color: BLANCO A\\u00f1o: 2002 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:36.561723	Catálogo modelo eliminado: PREMIO Color: BLANCO Año: 2002 Motor: 1500 c.c
175	1	admin	delete	catalogo_modelos	104	{"nombre": "PREMIO Color: BLANCO A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:38.307599	Catálogo modelo eliminado: PREMIO Color: BLANCO Año: 2004 Motor: 1500 c.c
176	1	admin	delete	catalogo_modelos	156	{"nombre": "PREMIO Color: BORDO A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:40.260648	Catálogo modelo eliminado: PREMIO Color: BORDO Año: 2008 Motor: 1500 c.c
177	1	admin	delete	catalogo_modelos	49	{"nombre": "PREMIO Color: BORDO A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:41.788505	Catálogo modelo eliminado: PREMIO Color: BORDO Año: 2008 Motor: 1800 c.c
178	1	admin	delete	catalogo_modelos	220	{"nombre": "PREMIO Color: PERLA A\\u00f1o: 2002 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:43.351357	Catálogo modelo eliminado: PREMIO Color: PERLA Año: 2002 Motor: 1800 c.c
182	1	admin	delete	catalogo_modelos	109	{"nombre": "PREMIO Color: PLATA A\\u00f1o: 2004 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:50.100154	Catálogo modelo eliminado: PREMIO Color: PLATA Año: 2004 Motor: 1800 c.c
184	1	admin	delete	catalogo_modelos	246	{"nombre": "PREMIO Color: PLATA A\\u00f1o: 2009 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:53.612089	Catálogo modelo eliminado: PREMIO Color: PLATA Año: 2009 Motor: 1800 c.c
185	1	admin	delete	catalogo_modelos	148	{"nombre": "RACTIS  Color: NEGRO A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:58.710274	Catálogo modelo eliminado: RACTIS  Color: NEGRO Año: 2011 Motor: 1300 c.c
194	1	admin	delete	catalogo_modelos	214	{"nombre": "RACTIS Color: AZUL METALIZADO A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:17.282798	Catálogo modelo eliminado: RACTIS Color: AZUL METALIZADO Año: 2006 Motor: 1300 c.c
196	1	admin	delete	catalogo_modelos	95	{"nombre": "RACTIS Color: AZUL METALIZADO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:20.323837	Catálogo modelo eliminado: RACTIS Color: AZUL METALIZADO Año: 2009 Motor: 1300 c.c
197	1	admin	delete	catalogo_modelos	64	{"nombre": "RACTIS Color: BORDO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:21.979231	Catálogo modelo eliminado: RACTIS Color: BORDO Año: 2009 Motor: 1300 c.c
198	1	admin	delete	catalogo_modelos	178	{"nombre": "RACTIS Color: GRIS A\\u00f1o: 2005 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:23.591322	Catálogo modelo eliminado: RACTIS Color: GRIS Año: 2005 Motor: 1300 c.c
203	1	admin	delete	catalogo_modelos	149	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:35.090155	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2006 Motor: 1500 c.c
206	1	admin	delete	catalogo_modelos	67	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:40.085163	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2009 Motor: 1300 c.c
208	1	admin	delete	catalogo_modelos	97	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2012 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:43.256478	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2012 Motor: 1300 c.c
210	1	admin	delete	catalogo_modelos	248	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:46.539728	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2006 Motor: 1300 c.c
211	1	admin	delete	catalogo_modelos	85	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:48.542723	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2006 Motor: 1500 c.c
214	1	admin	delete	catalogo_modelos	253	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2009 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:53.552811	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2009 Motor: 1500 c.c
215	1	admin	delete	catalogo_modelos	183	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:55.204082	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2010 Motor: 1300 c.c
216	1	admin	delete	catalogo_modelos	137	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:56.741895	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2011 Motor: 1300 c.c
179	1	admin	delete	catalogo_modelos	11	{"nombre": "PREMIO Color: PERLA A\\u00f1o: 2003 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:45.137443	Catálogo modelo eliminado: PREMIO Color: PERLA Año: 2003 Motor: 1800 c.c
180	1	admin	delete	catalogo_modelos	207	{"nombre": "PREMIO Color: PLATA A\\u00f1o: 2002 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:46.796733	Catálogo modelo eliminado: PREMIO Color: PLATA Año: 2002 Motor: 2000 c.c
181	1	admin	delete	catalogo_modelos	193	{"nombre": "PREMIO Color: PLATA A\\u00f1o: 2003 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:48.525974	Catálogo modelo eliminado: PREMIO Color: PLATA Año: 2003 Motor: 1800 c.c
183	1	admin	delete	catalogo_modelos	142	{"nombre": "PREMIO Color: PLATA A\\u00f1o: 2008 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:53:51.710466	Catálogo modelo eliminado: PREMIO Color: PLATA Año: 2008 Motor: 1800 c.c
186	1	admin	delete	catalogo_modelos	88	{"nombre": "RACTIS  Color: PERLA A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:02.480142	Catálogo modelo eliminado: RACTIS  Color: PERLA Año: 2011 Motor: 1500 c.c
187	1	admin	delete	catalogo_modelos	235	{"nombre": "RACTIS  Color: PLATA A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:04.271207	Catálogo modelo eliminado: RACTIS  Color: PLATA Año: 2006 Motor: 1500 c.c
188	1	admin	delete	catalogo_modelos	63	{"nombre": "RACTIS c/ techo panoramico Color: NEGRO A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:06.034522	Catálogo modelo eliminado: RACTIS c/ techo panoramico Color: NEGRO Año: 2005 Motor: 1500 c.c
189	1	admin	delete	catalogo_modelos	237	{"nombre": "RACTIS Color: AZUL A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:08.780328	Catálogo modelo eliminado: RACTIS Color: AZUL Año: 2008 Motor: 1300 c.c
190	1	admin	delete	catalogo_modelos	259	{"nombre": "RACTIS Color: AZUL A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:10.475887	Catálogo modelo eliminado: RACTIS Color: AZUL Año: 2010 Motor: 1300 c.c
191	1	admin	delete	catalogo_modelos	153	{"nombre": "RACTIS Color: AZUL A\\u00f1o: 2011 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:12.13561	Catálogo modelo eliminado: RACTIS Color: AZUL Año: 2011 Motor: 1300 c.c
192	1	admin	delete	catalogo_modelos	70	{"nombre": "RACTIS Color: AZUL MET A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:13.735393	Catálogo modelo eliminado: RACTIS Color: AZUL MET Año: 2009 Motor: 1300 c.c
193	1	admin	delete	catalogo_modelos	94	{"nombre": "RACTIS Color: AZUL METALIZADO A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:15.37971	Catálogo modelo eliminado: RACTIS Color: AZUL METALIZADO Año: 2005 Motor: 1500 c.c
195	1	admin	delete	catalogo_modelos	141	{"nombre": "RACTIS Color: AZUL METALIZADO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:18.757974	Catálogo modelo eliminado: RACTIS Color: AZUL METALIZADO Año: 2006 Motor: 1500 c.c
199	1	admin	delete	catalogo_modelos	7	{"nombre": "RACTIS Color: GRIS A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:25.433756	Catálogo modelo eliminado: RACTIS Color: GRIS Año: 2006 Motor: 1500 c.c
200	1	admin	delete	catalogo_modelos	177	{"nombre": "RACTIS Color: GRIS A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:27.246113	Catálogo modelo eliminado: RACTIS Color: GRIS Año: 2009 Motor: 1300 c.c
201	1	admin	delete	catalogo_modelos	126	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:28.860101	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2005 Motor: 1500 c.c
202	1	admin	delete	catalogo_modelos	106	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2006 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:32.713674	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2006 Motor: 1300 c.c
204	1	admin	delete	catalogo_modelos	198	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:36.900954	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2007 Motor: 1300 c.c
205	1	admin	delete	catalogo_modelos	244	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:38.42176	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2007 Motor: 1500 c.c
207	1	admin	delete	catalogo_modelos	50	{"nombre": "RACTIS Color: NEGRO A\\u00f1o: 2010 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:41.685805	Catálogo modelo eliminado: RACTIS Color: NEGRO Año: 2010 Motor: 1500 c.c
209	1	admin	delete	catalogo_modelos	165	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:44.798206	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2005 Motor: 1500 c.c
212	1	admin	delete	catalogo_modelos	57	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:50.246831	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2007 Motor: 1500 c.c
213	1	admin	delete	catalogo_modelos	42	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:51.997282	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2008 Motor: 1300 c.c
217	1	admin	delete	catalogo_modelos	139	{"nombre": "RACTIS Color: PERLA A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:54:58.404512	Catálogo modelo eliminado: RACTIS Color: PERLA Año: 2011 Motor: 1500 c.c
218	1	admin	delete	catalogo_modelos	14	{"nombre": "RACTIS Color: PLATA A\\u00f1o: 2008 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:00.068112	Catálogo modelo eliminado: RACTIS Color: PLATA Año: 2008 Motor: 1300 c.c
219	1	admin	delete	catalogo_modelos	255	{"nombre": "RACTIS Color: PLATA A\\u00f1o: 2010 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:01.671564	Catálogo modelo eliminado: RACTIS Color: PLATA Año: 2010 Motor: 1300 c.c
220	1	admin	delete	catalogo_modelos	168	{"nombre": "RACTIS Color: PLATA A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:03.248981	Catálogo modelo eliminado: RACTIS Color: PLATA Año: 2011 Motor: 1500 c.c
221	1	admin	delete	catalogo_modelos	186	{"nombre": "RACTIS Color: PLATA A\\u00f1o: 2012 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:04.757398	Catálogo modelo eliminado: RACTIS Color: PLATA Año: 2012 Motor: 1300 c.c
222	1	admin	delete	catalogo_modelos	240	{"nombre": "RACTIS Color: ROJO A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:06.227791	Catálogo modelo eliminado: RACTIS Color: ROJO Año: 2006 Motor: 1500 c.c
223	1	admin	delete	catalogo_modelos	128	{"nombre": "RACTIS Color: ROJO A\\u00f1o: 2007 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:07.81785	Catálogo modelo eliminado: RACTIS Color: ROJO Año: 2007 Motor: 1300 c.c
224	1	admin	delete	catalogo_modelos	163	{"nombre": "RACTIS Color: ROJO A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:09.393576	Catálogo modelo eliminado: RACTIS Color: ROJO Año: 2007 Motor: 1500 c.c
225	1	admin	delete	catalogo_modelos	152	{"nombre": "RACTIS Color: ROJO A\\u00f1o: 2012 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:10.766958	Catálogo modelo eliminado: RACTIS Color: ROJO Año: 2012 Motor: 1500 c.c
226	1	admin	delete	catalogo_modelos	182	{"nombre": "RACTIS Color: VIOLETA MET A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:12.517812	Catálogo modelo eliminado: RACTIS Color: VIOLETA MET Año: 2009 Motor: 1300 c.c
227	1	admin	delete	catalogo_modelos	48	{"nombre": "RACTIS Color: VIOLETA METALIZADO A\\u00f1o: 2009 Motor: 1300 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:14.819052	Catálogo modelo eliminado: RACTIS Color: VIOLETA METALIZADO Año: 2009 Motor: 1300 c.c
228	1	admin	delete	catalogo_modelos	107	{"nombre": "RUNX Color: PLATA A\\u00f1o: 2001 Motor: 1800 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:21.806644	Catálogo modelo eliminado: RUNX Color: PLATA Año: 2001 Motor: 1800 c.c
231	1	admin	delete	catalogo_modelos	225	{"nombre": "SIENTA  Color: GRIS A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:37.479034	Catálogo modelo eliminado: SIENTA  Color: GRIS Año: 2008 Motor: 1500 c.c
233	1	admin	delete	catalogo_modelos	187	{"nombre": "SIENTA Color: BLANCO A\\u00f1o: 2003 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:40.785592	Catálogo modelo eliminado: SIENTA Color: BLANCO Año: 2003 Motor: 1500 c.c
234	1	admin	delete	catalogo_modelos	151	{"nombre": "SIENTA Color: BORDO A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:42.266	Catálogo modelo eliminado: SIENTA Color: BORDO Año: 2011 Motor: 1500 c.c
237	1	admin	delete	catalogo_modelos	222	{"nombre": "SIENTA Color: GRIS A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:46.726371	Catálogo modelo eliminado: SIENTA Color: GRIS Año: 2007 Motor: 1500 c.c
240	1	admin	delete	catalogo_modelos	36	{"nombre": "SIENTA Color: MARRON A\\u00f1o: 2012 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:51.370291	Catálogo modelo eliminado: SIENTA Color: MARRON Año: 2012 Motor: 1500 c.c
241	1	admin	delete	catalogo_modelos	6	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:52.86528	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2004 Motor: 1500 c.c
242	1	admin	delete	catalogo_modelos	113	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:54.487614	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2005 Motor: 1500 c.c
243	1	admin	delete	catalogo_modelos	197	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:56.094232	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2006 Motor: 1500 c.c
244	1	admin	delete	catalogo_modelos	73	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:58.939429	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2007 Motor: 1500 c.c
246	1	admin	delete	catalogo_modelos	192	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2014 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:13.915613	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2014 Motor: 1500 c.c
247	1	admin	delete	catalogo_modelos	145	{"nombre": "SIENTA Color: PLATA A\\u00f1o: 2006 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:15.632607	Catálogo modelo eliminado: SIENTA Color: PLATA Año: 2006 Motor: 1500 c.c
248	1	admin	delete	catalogo_modelos	179	{"nombre": "SIENTA Color: PLATA A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:17.151258	Catálogo modelo eliminado: SIENTA Color: PLATA Año: 2007 Motor: 1500 c.c
250	1	admin	delete	catalogo_modelos	31	{"nombre": "SIENTA Color: ROJO A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:20.171626	Catálogo modelo eliminado: SIENTA Color: ROJO Año: 2004 Motor: 1500 c.c
251	1	admin	delete	catalogo_modelos	120	{"nombre": "SIENTA Color: ROJO A\\u00f1o: 2007 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:21.472819	Catálogo modelo eliminado: SIENTA Color: ROJO Año: 2007 Motor: 1500 c.c
255	1	admin	delete	catalogo_modelos	32	{"nombre": "SPORTAGE Color: PLATA A\\u00f1o: 2005 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:37.043493	Catálogo modelo eliminado: SPORTAGE Color: PLATA Año: 2005 Motor: 2000 c.c
259	1	admin	delete	catalogo_modelos	146	{"nombre": "TREZIA Color: PLATA A\\u00f1o: 2011 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:50.096731	Catálogo modelo eliminado: TREZIA Color: PLATA Año: 2011 Motor: 1500 c.c
262	1	admin	delete	catalogo_modelos	69	{"nombre": "TUCSON Color: NEGRO A\\u00f1o: 2008 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:58.531499	Catálogo modelo eliminado: TUCSON Color: NEGRO Año: 2008 Motor: 2000 c.c
229	1	admin	delete	catalogo_modelos	212	{"nombre": "SANTA FE Color: AZUL A\\u00f1o: 2014 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:27.132846	Catálogo modelo eliminado: SANTA FE Color: AZUL Año: 2014 Motor: 2000 c.c
230	1	admin	delete	catalogo_modelos	39	{"nombre": "SANTAFE Color: GRIS A\\u00f1o: 2021 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:30.892265	Catálogo modelo eliminado: SANTAFE Color: GRIS Año: 2021 Motor: 2000 c.c
232	1	admin	delete	catalogo_modelos	37	{"nombre": "SIENTA Color: AZUL A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:39.217002	Catálogo modelo eliminado: SIENTA Color: AZUL Año: 2005 Motor: 1500 c.c
235	1	admin	delete	catalogo_modelos	86	{"nombre": "SIENTA Color: BORDO A\\u00f1o: 2013 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:43.790579	Catálogo modelo eliminado: SIENTA Color: BORDO Año: 2013 Motor: 1500 c.c
236	1	admin	delete	catalogo_modelos	140	{"nombre": "SIENTA Color: CELESTE A\\u00f1o: 2005 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:45.213305	Catálogo modelo eliminado: SIENTA Color: CELESTE Año: 2005 Motor: 1500 c.c
238	1	admin	delete	catalogo_modelos	87	{"nombre": "SIENTA Color: GRIS A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:48.176524	Catálogo modelo eliminado: SIENTA Color: GRIS Año: 2008 Motor: 1500 c.c
239	1	admin	delete	catalogo_modelos	58	{"nombre": "SIENTA Color: GRIS A\\u00f1o: 2009 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:55:49.784362	Catálogo modelo eliminado: SIENTA Color: GRIS Año: 2009 Motor: 1500 c.c
245	1	admin	delete	catalogo_modelos	133	{"nombre": "SIENTA Color: PERLA A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:10.610869	Catálogo modelo eliminado: SIENTA Color: PERLA Año: 2008 Motor: 1500 c.c
249	1	admin	delete	catalogo_modelos	44	{"nombre": "SIENTA Color: PLATA A\\u00f1o: 2008 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:18.613088	Catálogo modelo eliminado: SIENTA Color: PLATA Año: 2008 Motor: 1500 c.c
252	1	admin	delete	catalogo_modelos	35	{"nombre": "SPACIO Color: BLANCO A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:27.182852	Catálogo modelo eliminado: SPACIO Color: BLANCO Año: 2004 Motor: 1500 c.c
253	1	admin	delete	catalogo_modelos	172	{"nombre": "SPORTAGE Color: BLANCO A\\u00f1o: 2012 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:31.915989	Catálogo modelo eliminado: SPORTAGE Color: BLANCO Año: 2012 Motor: 2000 c.c
254	1	admin	delete	catalogo_modelos	174	{"nombre": "SPORTAGE Color: GRIS A\\u00f1o: 2012 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:35.318688	Catálogo modelo eliminado: SPORTAGE Color: GRIS Año: 2012 Motor: 2000 c.c
256	1	admin	delete	catalogo_modelos	209	{"nombre": "SPORTAGE Color: PLATA A\\u00f1o: 2011 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:40.056053	Catálogo modelo eliminado: SPORTAGE Color: PLATA Año: 2011 Motor: 2000 c.c
257	1	admin	delete	catalogo_modelos	5	{"nombre": "SUNNY Color: DORADO A\\u00f1o: 2004 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:44.406699	Catálogo modelo eliminado: SUNNY Color: DORADO Año: 2004 Motor: 1500 c.c
258	1	admin	delete	catalogo_modelos	29	{"nombre": "TREZIA Color: NEGRO A\\u00f1o: 2010 Motor: 1500 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:47.980682	Catálogo modelo eliminado: TREZIA Color: NEGRO Año: 2010 Motor: 1500 c.c
260	1	admin	delete	catalogo_modelos	236	{"nombre": "TUCSON Color: GRIS A\\u00f1o: 2010 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:54.227534	Catálogo modelo eliminado: TUCSON Color: GRIS Año: 2010 Motor: 2000 c.c
261	1	admin	delete	catalogo_modelos	188	{"nombre": "TUCSON Color: GRIS A\\u00f1o: 2012 Motor: 2000 c.c", "id_marca": 2}	null	\N	\N	2026-03-29 12:56:56.259217	Catálogo modelo eliminado: TUCSON Color: GRIS Año: 2012 Motor: 2000 c.c
263	1	admin	create	usuarios	2	null	{"username": "micoche", "email": "lprafael1710@gmail.com", "rol": "user", "activo": true}	\N	\N	2026-04-24 19:25:52.461031	Usuario creado: micoche
264	1	admin	update	usuarios	2	null	{"email": "lprafael1710@gmail.com", "nombre_completo": "Playa de veh\\u00edculos micoche.com.py", "rol": "manager"}	\N	\N	2026-04-24 19:27:59.096114	Usuario actualizado: micoche
265	1	admin	update	usuarios	2	null	{"email": "lprafael1710@gmail.com", "nombre_completo": "Playa de veh\\u00edculos micoche.com.py", "rol": "admin"}	\N	\N	2026-04-24 19:28:47.952468	Usuario actualizado: micoche
266	1	admin	update	usuarios	2	null	{"email": "lprafael1710@gmail.com", "nombre_completo": "Playa de veh\\u00edculos micoche.com.py", "rol": "manager"}	\N	\N	2026-04-24 19:29:32.548034	Usuario actualizado: micoche
267	1	admin	create	playas	4	null	{"nombre": "Mi Coche", "razon_social": "Mi Coche", "ruc": "3558002-0", "direccion": "Platanillo 2650 entre Ingavi y Pirizal\\nCasa 2650", "telefono": "0981165851", "email": "lprafael1710@gmail.com", "activo": true}	\N	\N	2026-04-24 19:52:06.924883	Nueva playa creada: Mi Coche
268	1	admin	create	usuarios	3	null	{"username": "micoche", "email": "lprafael1710@gmail.com", "rol": "manager", "activo": true}	\N	\N	2026-04-24 20:04:40.485011	Usuario creado: micoche
269	3	micoche	create	productos	322	null	{"id_categoria": 1, "tipo_vehiculo": "Autom\\u00f3vil", "marca": "VOLKSWAGEN", "modelo": "GOL", "a\\u00f1o": 2014, "color": "PLATEADO", "chasis": "", "costo_base": 28000000.0, "precio_contado_sugerido": 30000000.0, "precio_financiado_sugerido": 38000000.0, "entrega_inicial_sugerida": 20000000.0, "estado_disponibilidad": "DISPONIBLE", "fecha_ingreso": "2026-04-24"}	\N	\N	2026-04-24 20:32:07.495211	Vehículo registrado: VOLKSWAGEN GOL
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.notificaciones (id, usuario_id, titulo, mensaje, tipo, leida, fecha_creacion, fecha_lectura, datos_adicionales) FROM stdin;
\.


--
-- Data for Name: parametros_sistema; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.parametros_sistema (id, codigo, nombre, valor, tipo, descripcion, categoria, editable, activo, fecha_creacion, fecha_modificacion, modificado_por) FROM stdin;
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.password_resets (id, email, token, expira_en, usado, fecha_creacion) FROM stdin;
\.


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.permisos (id, nombre, descripcion, modulo, accion, activo, fecha_creacion) FROM stdin;
\.


--
-- Data for Name: playas; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.playas (id, nombre, razon_social, ruc, direccion, telefono, email, activo, fecha_creacion) FROM stdin;
3	Playa Central	\N	\N	Asunción, Paraguay	\N	\N	t	2026-03-27 18:11:27.788223
4	Mi Coche	Mi Coche	3558002-0	Platanillo 2650 entre Ingavi y Pirizal\nCasa 2650	0981165851	lprafael1710@gmail.com	t	2026-04-24 16:52:06.90589
\.


--
-- Data for Name: reportes; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.reportes (id, nombre, descripcion, tipo, parametros, fecha_creacion, fecha_ejecucion, estado, ruta_archivo, creado_por, detalles) FROM stdin;
\.


--
-- Data for Name: rol_permiso; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.rol_permiso (rol_id, permiso_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.roles (id, nombre, descripcion, activo, fecha_creacion, creado_por) FROM stdin;
3	admin	Administrador del sistema	t	2026-03-27 18:11:27.788223	\N
\.


--
-- Data for Name: sesiones_usuarios; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.sesiones_usuarios (id, usuario_id, token, ip_address, user_agent, fecha_inicio, fecha_expiracion, activa, fecha_cierre) FROM stdin;
\.


--
-- Data for Name: usuario_rol; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.usuario_rol (usuario_id, rol_id) FROM stdin;
1	3
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: sistema; Owner: postgres
--

COPY sistema.usuarios (id, id_playa, username, email, hashed_password, nombre_completo, rol, activo, fecha_creacion, ultimo_acceso, creado_por) FROM stdin;
3	4	micoche	lprafael1710@gmail.com	$pbkdf2-sha256$29000$tRaCEGLs/X8v5TyHUKr1fg$Whue2K7A6JG7OX0XPrw7KF/OlMiqVaJXKNZOMM7qdx4	Rafael López - Mi Coche	manager	t	2026-04-24 17:04:36.311018	2026-04-24 20:05:05.979934	1
1	3	admin	admin@miplaya.com	$pbkdf2-sha256$29000$LkVIiTGGECKkdI4x5nzvfQ$RWiQYdBfTR6nxJFfjEGDF6ALK0HDRiDSoO305wWE3Tw	Administrador Sistema	admin	t	2026-03-27 18:11:27.788223	2026-04-27 16:51:26.396137	\N
\.


--
-- Name: catalogo_marcas_id_marca_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.catalogo_marcas_id_marca_seq', 414, true);


--
-- Name: catalogo_modelos_id_modelo_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.catalogo_modelos_id_modelo_seq', 5409, true);


--
-- Name: catalogo_tipos_vehiculo_id_tipo_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.catalogo_tipos_vehiculo_id_tipo_seq', 8, true);


--
-- Name: categorias_vehiculos_id_categoria_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.categorias_vehiculos_id_categoria_seq', 3, true);


--
-- Name: clientes_id_cliente_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.clientes_id_cliente_seq', 1, false);


--
-- Name: config_calificaciones_id_config_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.config_calificaciones_id_config_seq', 1, false);


--
-- Name: contratos_venta_id_contrato_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.contratos_venta_id_contrato_seq', 1, false);


--
-- Name: cuentas_id_cuenta_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.cuentas_id_cuenta_seq', 1, false);


--
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.detalle_venta_id_detalle_venta_seq', 1, false);


--
-- Name: documentos_inforconf_id_documento_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.documentos_inforconf_id_documento_seq', 1, false);


--
-- Name: escribanias_id_escribania_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.escribanias_id_escribania_seq', 1, false);


--
-- Name: estados_id_estado_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.estados_id_estado_seq', 1, false);


--
-- Name: garantes_id_garante_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.garantes_id_garante_seq', 1, false);


--
-- Name: gastos_adicionales_id_gasto_adicional_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.gastos_adicionales_id_gasto_adicional_seq', 1, false);


--
-- Name: gastos_empresa_id_gasto_empresa_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.gastos_empresa_id_gasto_empresa_seq', 1, false);


--
-- Name: gastos_productos_id_gasto_producto_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.gastos_productos_id_gasto_producto_seq', 1, false);


--
-- Name: historial_calificaciones_id_historial_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.historial_calificaciones_id_historial_seq', 1, false);


--
-- Name: historial_propietarios_id_historial_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.historial_propietarios_id_historial_seq', 1, false);


--
-- Name: imagenes_productos_id_imagen_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.imagenes_productos_id_imagen_seq', 1, false);


--
-- Name: movimientos_id_movimiento_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.movimientos_id_movimiento_seq', 1, false);


--
-- Name: pagares_id_pagare_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.pagares_id_pagare_seq', 1, false);


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.pagos_id_pago_seq', 1, false);


--
-- Name: productos_id_producto_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.productos_id_producto_seq', 322, true);


--
-- Name: referencias_id_referencia_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.referencias_id_referencia_seq', 1, false);


--
-- Name: refuerzos_id_refuerzo_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.refuerzos_id_refuerzo_seq', 1, false);


--
-- Name: tipos_gastos_empresa_id_tipo_gasto_empresa_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.tipos_gastos_empresa_id_tipo_gasto_empresa_seq', 1, false);


--
-- Name: tipos_gastos_productos_id_tipo_gasto_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.tipos_gastos_productos_id_tipo_gasto_seq', 1, false);


--
-- Name: ubicaciones_cliente_id_ubicacion_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.ubicaciones_cliente_id_ubicacion_seq', 1, false);


--
-- Name: vendedores_id_vendedor_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.vendedores_id_vendedor_seq', 1, false);


--
-- Name: ventas_id_venta_seq; Type: SEQUENCE SET; Schema: playa; Owner: postgres
--

SELECT pg_catalog.setval('playa.ventas_id_venta_seq', 1, false);


--
-- Name: backups_sistema_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.backups_sistema_id_seq', 1, false);


--
-- Name: configuracion_email_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.configuracion_email_id_seq', 1, false);


--
-- Name: logs_acceso_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.logs_acceso_id_seq', 37, true);


--
-- Name: logs_auditoria_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.logs_auditoria_id_seq', 269, true);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.notificaciones_id_seq', 1, false);


--
-- Name: parametros_sistema_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.parametros_sistema_id_seq', 1, false);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.password_resets_id_seq', 1, false);


--
-- Name: permisos_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.permisos_id_seq', 1, false);


--
-- Name: playas_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.playas_id_seq', 4, true);


--
-- Name: reportes_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.reportes_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.roles_id_seq', 3, true);


--
-- Name: sesiones_usuarios_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.sesiones_usuarios_id_seq', 1, false);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: sistema; Owner: postgres
--

SELECT pg_catalog.setval('sistema.usuarios_id_seq', 3, true);


--
-- Name: catalogo_marcas catalogo_marcas_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_marcas
    ADD CONSTRAINT catalogo_marcas_nombre_key UNIQUE (nombre);


--
-- Name: catalogo_marcas catalogo_marcas_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_marcas
    ADD CONSTRAINT catalogo_marcas_pkey PRIMARY KEY (id_marca);


--
-- Name: catalogo_modelos catalogo_modelos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_modelos
    ADD CONSTRAINT catalogo_modelos_pkey PRIMARY KEY (id_modelo);


--
-- Name: catalogo_tipos_vehiculo catalogo_tipos_vehiculo_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_tipos_vehiculo
    ADD CONSTRAINT catalogo_tipos_vehiculo_nombre_key UNIQUE (nombre);


--
-- Name: catalogo_tipos_vehiculo catalogo_tipos_vehiculo_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_tipos_vehiculo
    ADD CONSTRAINT catalogo_tipos_vehiculo_pkey PRIMARY KEY (id_tipo);


--
-- Name: categorias_vehiculos categorias_vehiculos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.categorias_vehiculos
    ADD CONSTRAINT categorias_vehiculos_pkey PRIMARY KEY (id_categoria);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);


--
-- Name: config_calificaciones config_calificaciones_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.config_calificaciones
    ADD CONSTRAINT config_calificaciones_nombre_key UNIQUE (nombre);


--
-- Name: config_calificaciones config_calificaciones_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.config_calificaciones
    ADD CONSTRAINT config_calificaciones_pkey PRIMARY KEY (id_config);


--
-- Name: contratos_venta contratos_venta_numero_contrato_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.contratos_venta
    ADD CONSTRAINT contratos_venta_numero_contrato_key UNIQUE (numero_contrato);


--
-- Name: contratos_venta contratos_venta_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.contratos_venta
    ADD CONSTRAINT contratos_venta_pkey PRIMARY KEY (id_contrato);


--
-- Name: cuentas cuentas_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.cuentas
    ADD CONSTRAINT cuentas_nombre_key UNIQUE (nombre);


--
-- Name: cuentas cuentas_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.cuentas
    ADD CONSTRAINT cuentas_pkey PRIMARY KEY (id_cuenta);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_detalle_venta);


--
-- Name: documentos_importacion documentos_importacion_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.documentos_importacion
    ADD CONSTRAINT documentos_importacion_pkey PRIMARY KEY (nro_despacho);


--
-- Name: documentos_inforconf documentos_inforconf_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.documentos_inforconf
    ADD CONSTRAINT documentos_inforconf_pkey PRIMARY KEY (id_documento);


--
-- Name: escribanias escribanias_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.escribanias
    ADD CONSTRAINT escribanias_pkey PRIMARY KEY (id_escribania);


--
-- Name: estados estados_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.estados
    ADD CONSTRAINT estados_nombre_key UNIQUE (nombre);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id_estado);


--
-- Name: garantes garantes_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.garantes
    ADD CONSTRAINT garantes_pkey PRIMARY KEY (id_garante);


--
-- Name: gastos_adicionales gastos_adicionales_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_adicionales
    ADD CONSTRAINT gastos_adicionales_pkey PRIMARY KEY (id_gasto_adicional);


--
-- Name: gastos_empresa gastos_empresa_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_empresa
    ADD CONSTRAINT gastos_empresa_pkey PRIMARY KEY (id_gasto_empresa);


--
-- Name: gastos_productos gastos_productos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_productos
    ADD CONSTRAINT gastos_productos_pkey PRIMARY KEY (id_gasto_producto);


--
-- Name: historial_calificaciones historial_calificaciones_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_calificaciones
    ADD CONSTRAINT historial_calificaciones_pkey PRIMARY KEY (id_historial);


--
-- Name: historial_propietarios historial_propietarios_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_propietarios
    ADD CONSTRAINT historial_propietarios_pkey PRIMARY KEY (id_historial);


--
-- Name: imagenes_productos imagenes_productos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.imagenes_productos
    ADD CONSTRAINT imagenes_productos_pkey PRIMARY KEY (id_imagen);


--
-- Name: movimientos movimientos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.movimientos
    ADD CONSTRAINT movimientos_pkey PRIMARY KEY (id_movimiento);


--
-- Name: pagares pagares_numero_pagare_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagares
    ADD CONSTRAINT pagares_numero_pagare_key UNIQUE (numero_pagare);


--
-- Name: pagares pagares_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagares
    ADD CONSTRAINT pagares_pkey PRIMARY KEY (id_pagare);


--
-- Name: pagos pagos_numero_recibo_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos
    ADD CONSTRAINT pagos_numero_recibo_key UNIQUE (numero_recibo);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- Name: referencias referencias_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.referencias
    ADD CONSTRAINT referencias_pkey PRIMARY KEY (id_referencia);


--
-- Name: refuerzos refuerzos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.refuerzos
    ADD CONSTRAINT refuerzos_pkey PRIMARY KEY (id_refuerzo);


--
-- Name: tipos_gastos_empresa tipos_gastos_empresa_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_empresa
    ADD CONSTRAINT tipos_gastos_empresa_nombre_key UNIQUE (nombre);


--
-- Name: tipos_gastos_empresa tipos_gastos_empresa_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_empresa
    ADD CONSTRAINT tipos_gastos_empresa_pkey PRIMARY KEY (id_tipo_gasto_empresa);


--
-- Name: tipos_gastos_productos tipos_gastos_productos_nombre_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_productos
    ADD CONSTRAINT tipos_gastos_productos_nombre_key UNIQUE (nombre);


--
-- Name: tipos_gastos_productos tipos_gastos_productos_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.tipos_gastos_productos
    ADD CONSTRAINT tipos_gastos_productos_pkey PRIMARY KEY (id_tipo_gasto);


--
-- Name: ubicaciones_cliente ubicaciones_cliente_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ubicaciones_cliente
    ADD CONSTRAINT ubicaciones_cliente_pkey PRIMARY KEY (id_ubicacion);


--
-- Name: vendedores vendedores_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.vendedores
    ADD CONSTRAINT vendedores_pkey PRIMARY KEY (id_vendedor);


--
-- Name: ventas ventas_numero_venta_key; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_numero_venta_key UNIQUE (numero_venta);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id_venta);


--
-- Name: backups_sistema backups_sistema_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.backups_sistema
    ADD CONSTRAINT backups_sistema_pkey PRIMARY KEY (id);


--
-- Name: configuracion_email configuracion_email_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.configuracion_email
    ADD CONSTRAINT configuracion_email_pkey PRIMARY KEY (id);


--
-- Name: logs_acceso logs_acceso_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_acceso
    ADD CONSTRAINT logs_acceso_pkey PRIMARY KEY (id);


--
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: parametros_sistema parametros_sistema_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.parametros_sistema
    ADD CONSTRAINT parametros_sistema_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: playas playas_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.playas
    ADD CONSTRAINT playas_pkey PRIMARY KEY (id);


--
-- Name: reportes reportes_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.reportes
    ADD CONSTRAINT reportes_pkey PRIMARY KEY (id);


--
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sesiones_usuarios sesiones_usuarios_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.sesiones_usuarios
    ADD CONSTRAINT sesiones_usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (usuario_id, rol_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: ix_playa_catalogo_marcas_id_marca; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_catalogo_marcas_id_marca ON playa.catalogo_marcas USING btree (id_marca);


--
-- Name: ix_playa_catalogo_modelos_id_modelo; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_catalogo_modelos_id_modelo ON playa.catalogo_modelos USING btree (id_modelo);


--
-- Name: ix_playa_catalogo_tipos_vehiculo_id_tipo; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_catalogo_tipos_vehiculo_id_tipo ON playa.catalogo_tipos_vehiculo USING btree (id_tipo);


--
-- Name: ix_playa_categorias_vehiculos_id_categoria; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_categorias_vehiculos_id_categoria ON playa.categorias_vehiculos USING btree (id_categoria);


--
-- Name: ix_playa_categorias_vehiculos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_categorias_vehiculos_id_playa ON playa.categorias_vehiculos USING btree (id_playa);


--
-- Name: ix_playa_clientes_id_cliente; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_clientes_id_cliente ON playa.clientes USING btree (id_cliente);


--
-- Name: ix_playa_clientes_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_clientes_id_playa ON playa.clientes USING btree (id_playa);


--
-- Name: ix_playa_clientes_numero_documento; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE UNIQUE INDEX ix_playa_clientes_numero_documento ON playa.clientes USING btree (numero_documento);


--
-- Name: ix_playa_config_calificaciones_id_config; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_config_calificaciones_id_config ON playa.config_calificaciones USING btree (id_config);


--
-- Name: ix_playa_config_calificaciones_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_config_calificaciones_id_playa ON playa.config_calificaciones USING btree (id_playa);


--
-- Name: ix_playa_contratos_venta_id_contrato; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_contratos_venta_id_contrato ON playa.contratos_venta USING btree (id_contrato);


--
-- Name: ix_playa_contratos_venta_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_contratos_venta_id_playa ON playa.contratos_venta USING btree (id_playa);


--
-- Name: ix_playa_cuentas_id_cuenta; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_cuentas_id_cuenta ON playa.cuentas USING btree (id_cuenta);


--
-- Name: ix_playa_cuentas_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_cuentas_id_playa ON playa.cuentas USING btree (id_playa);


--
-- Name: ix_playa_detalle_venta_id_detalle_venta; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_detalle_venta_id_detalle_venta ON playa.detalle_venta USING btree (id_detalle_venta);


--
-- Name: ix_playa_detalle_venta_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_detalle_venta_id_playa ON playa.detalle_venta USING btree (id_playa);


--
-- Name: ix_playa_documentos_importacion_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_documentos_importacion_id_playa ON playa.documentos_importacion USING btree (id_playa);


--
-- Name: ix_playa_documentos_importacion_nro_despacho; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_documentos_importacion_nro_despacho ON playa.documentos_importacion USING btree (nro_despacho);


--
-- Name: ix_playa_documentos_inforconf_id_documento; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_documentos_inforconf_id_documento ON playa.documentos_inforconf USING btree (id_documento);


--
-- Name: ix_playa_documentos_inforconf_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_documentos_inforconf_id_playa ON playa.documentos_inforconf USING btree (id_playa);


--
-- Name: ix_playa_escribanias_id_escribania; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_escribanias_id_escribania ON playa.escribanias USING btree (id_escribania);


--
-- Name: ix_playa_escribanias_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_escribanias_id_playa ON playa.escribanias USING btree (id_playa);


--
-- Name: ix_playa_estados_id_estado; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_estados_id_estado ON playa.estados USING btree (id_estado);


--
-- Name: ix_playa_estados_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_estados_id_playa ON playa.estados USING btree (id_playa);


--
-- Name: ix_playa_garantes_id_garante; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_garantes_id_garante ON playa.garantes USING btree (id_garante);


--
-- Name: ix_playa_garantes_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_garantes_id_playa ON playa.garantes USING btree (id_playa);


--
-- Name: ix_playa_gastos_adicionales_id_gasto_adicional; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_adicionales_id_gasto_adicional ON playa.gastos_adicionales USING btree (id_gasto_adicional);


--
-- Name: ix_playa_gastos_adicionales_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_adicionales_id_playa ON playa.gastos_adicionales USING btree (id_playa);


--
-- Name: ix_playa_gastos_empresa_id_gasto_empresa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_empresa_id_gasto_empresa ON playa.gastos_empresa USING btree (id_gasto_empresa);


--
-- Name: ix_playa_gastos_empresa_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_empresa_id_playa ON playa.gastos_empresa USING btree (id_playa);


--
-- Name: ix_playa_gastos_productos_id_gasto_producto; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_productos_id_gasto_producto ON playa.gastos_productos USING btree (id_gasto_producto);


--
-- Name: ix_playa_gastos_productos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_gastos_productos_id_playa ON playa.gastos_productos USING btree (id_playa);


--
-- Name: ix_playa_historial_calificaciones_id_historial; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_historial_calificaciones_id_historial ON playa.historial_calificaciones USING btree (id_historial);


--
-- Name: ix_playa_historial_calificaciones_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_historial_calificaciones_id_playa ON playa.historial_calificaciones USING btree (id_playa);


--
-- Name: ix_playa_historial_propietarios_id_historial; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_historial_propietarios_id_historial ON playa.historial_propietarios USING btree (id_historial);


--
-- Name: ix_playa_historial_propietarios_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_historial_propietarios_id_playa ON playa.historial_propietarios USING btree (id_playa);


--
-- Name: ix_playa_imagenes_productos_id_imagen; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_imagenes_productos_id_imagen ON playa.imagenes_productos USING btree (id_imagen);


--
-- Name: ix_playa_imagenes_productos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_imagenes_productos_id_playa ON playa.imagenes_productos USING btree (id_playa);


--
-- Name: ix_playa_movimientos_id_movimiento; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_movimientos_id_movimiento ON playa.movimientos USING btree (id_movimiento);


--
-- Name: ix_playa_movimientos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_movimientos_id_playa ON playa.movimientos USING btree (id_playa);


--
-- Name: ix_playa_pagares_id_pagare; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_pagares_id_pagare ON playa.pagares USING btree (id_pagare);


--
-- Name: ix_playa_pagares_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_pagares_id_playa ON playa.pagares USING btree (id_playa);


--
-- Name: ix_playa_pagos_id_pago; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_pagos_id_pago ON playa.pagos USING btree (id_pago);


--
-- Name: ix_playa_pagos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_pagos_id_playa ON playa.pagos USING btree (id_playa);


--
-- Name: ix_playa_productos_chasis; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE UNIQUE INDEX ix_playa_productos_chasis ON playa.productos USING btree (chasis);


--
-- Name: ix_playa_productos_codigo_interno; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE UNIQUE INDEX ix_playa_productos_codigo_interno ON playa.productos USING btree (codigo_interno);


--
-- Name: ix_playa_productos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_productos_id_playa ON playa.productos USING btree (id_playa);


--
-- Name: ix_playa_productos_id_producto; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_productos_id_producto ON playa.productos USING btree (id_producto);


--
-- Name: ix_playa_productos_nro_cert_nac; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_productos_nro_cert_nac ON playa.productos USING btree (nro_cert_nac);


--
-- Name: ix_playa_productos_nro_despacho; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_productos_nro_despacho ON playa.productos USING btree (nro_despacho);


--
-- Name: ix_playa_referencias_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_referencias_id_playa ON playa.referencias USING btree (id_playa);


--
-- Name: ix_playa_referencias_id_referencia; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_referencias_id_referencia ON playa.referencias USING btree (id_referencia);


--
-- Name: ix_playa_refuerzos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_refuerzos_id_playa ON playa.refuerzos USING btree (id_playa);


--
-- Name: ix_playa_refuerzos_id_refuerzo; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_refuerzos_id_refuerzo ON playa.refuerzos USING btree (id_refuerzo);


--
-- Name: ix_playa_tipos_gastos_empresa_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_tipos_gastos_empresa_id_playa ON playa.tipos_gastos_empresa USING btree (id_playa);


--
-- Name: ix_playa_tipos_gastos_empresa_id_tipo_gasto_empresa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_tipos_gastos_empresa_id_tipo_gasto_empresa ON playa.tipos_gastos_empresa USING btree (id_tipo_gasto_empresa);


--
-- Name: ix_playa_tipos_gastos_productos_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_tipos_gastos_productos_id_playa ON playa.tipos_gastos_productos USING btree (id_playa);


--
-- Name: ix_playa_tipos_gastos_productos_id_tipo_gasto; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_tipos_gastos_productos_id_tipo_gasto ON playa.tipos_gastos_productos USING btree (id_tipo_gasto);


--
-- Name: ix_playa_ubicaciones_cliente_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_ubicaciones_cliente_id_playa ON playa.ubicaciones_cliente USING btree (id_playa);


--
-- Name: ix_playa_ubicaciones_cliente_id_ubicacion; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_ubicaciones_cliente_id_ubicacion ON playa.ubicaciones_cliente USING btree (id_ubicacion);


--
-- Name: ix_playa_vendedores_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_vendedores_id_playa ON playa.vendedores USING btree (id_playa);


--
-- Name: ix_playa_vendedores_id_vendedor; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_vendedores_id_vendedor ON playa.vendedores USING btree (id_vendedor);


--
-- Name: ix_playa_ventas_id_playa; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_ventas_id_playa ON playa.ventas USING btree (id_playa);


--
-- Name: ix_playa_ventas_id_venta; Type: INDEX; Schema: playa; Owner: postgres
--

CREATE INDEX ix_playa_ventas_id_venta ON playa.ventas USING btree (id_venta);


--
-- Name: ix_sistema_backups_sistema_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_backups_sistema_id ON sistema.backups_sistema USING btree (id);


--
-- Name: ix_sistema_configuracion_email_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_configuracion_email_id ON sistema.configuracion_email USING btree (id);


--
-- Name: ix_sistema_logs_acceso_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_logs_acceso_id ON sistema.logs_acceso USING btree (id);


--
-- Name: ix_sistema_logs_auditoria_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_logs_auditoria_id ON sistema.logs_auditoria USING btree (id);


--
-- Name: ix_sistema_notificaciones_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_notificaciones_id ON sistema.notificaciones USING btree (id);


--
-- Name: ix_sistema_parametros_sistema_codigo; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_parametros_sistema_codigo ON sistema.parametros_sistema USING btree (codigo);


--
-- Name: ix_sistema_parametros_sistema_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_parametros_sistema_id ON sistema.parametros_sistema USING btree (id);


--
-- Name: ix_sistema_password_resets_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_password_resets_id ON sistema.password_resets USING btree (id);


--
-- Name: ix_sistema_password_resets_token; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_password_resets_token ON sistema.password_resets USING btree (token);


--
-- Name: ix_sistema_permisos_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_permisos_id ON sistema.permisos USING btree (id);


--
-- Name: ix_sistema_permisos_nombre; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_permisos_nombre ON sistema.permisos USING btree (nombre);


--
-- Name: ix_sistema_playas_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_playas_id ON sistema.playas USING btree (id);


--
-- Name: ix_sistema_playas_nombre; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_playas_nombre ON sistema.playas USING btree (nombre);


--
-- Name: ix_sistema_playas_ruc; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_playas_ruc ON sistema.playas USING btree (ruc);


--
-- Name: ix_sistema_reportes_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_reportes_id ON sistema.reportes USING btree (id);


--
-- Name: ix_sistema_roles_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_roles_id ON sistema.roles USING btree (id);


--
-- Name: ix_sistema_roles_nombre; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_roles_nombre ON sistema.roles USING btree (nombre);


--
-- Name: ix_sistema_sesiones_usuarios_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_sesiones_usuarios_id ON sistema.sesiones_usuarios USING btree (id);


--
-- Name: ix_sistema_sesiones_usuarios_token; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_sesiones_usuarios_token ON sistema.sesiones_usuarios USING btree (token);


--
-- Name: ix_sistema_usuarios_email; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_usuarios_email ON sistema.usuarios USING btree (email);


--
-- Name: ix_sistema_usuarios_id; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE INDEX ix_sistema_usuarios_id ON sistema.usuarios USING btree (id);


--
-- Name: ix_sistema_usuarios_username; Type: INDEX; Schema: sistema; Owner: postgres
--

CREATE UNIQUE INDEX ix_sistema_usuarios_username ON sistema.usuarios USING btree (username);


--
-- Name: catalogo_modelos catalogo_modelos_id_marca_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.catalogo_modelos
    ADD CONSTRAINT catalogo_modelos_id_marca_fkey FOREIGN KEY (id_marca) REFERENCES playa.catalogo_marcas(id_marca);


--
-- Name: contratos_venta contratos_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.contratos_venta
    ADD CONSTRAINT contratos_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta);


--
-- Name: detalle_venta detalle_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.detalle_venta
    ADD CONSTRAINT detalle_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta) ON DELETE CASCADE;


--
-- Name: documentos_inforconf documentos_inforconf_id_cliente_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.documentos_inforconf
    ADD CONSTRAINT documentos_inforconf_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES playa.clientes(id_cliente);


--
-- Name: garantes garantes_id_cliente_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.garantes
    ADD CONSTRAINT garantes_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES playa.clientes(id_cliente);


--
-- Name: gastos_adicionales gastos_adicionales_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_adicionales
    ADD CONSTRAINT gastos_adicionales_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: gastos_adicionales gastos_adicionales_id_movimiento_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_adicionales
    ADD CONSTRAINT gastos_adicionales_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES playa.movimientos(id_movimiento);


--
-- Name: gastos_empresa gastos_empresa_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_empresa
    ADD CONSTRAINT gastos_empresa_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: gastos_empresa gastos_empresa_id_tipo_gasto_empresa_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_empresa
    ADD CONSTRAINT gastos_empresa_id_tipo_gasto_empresa_fkey FOREIGN KEY (id_tipo_gasto_empresa) REFERENCES playa.tipos_gastos_empresa(id_tipo_gasto_empresa);


--
-- Name: gastos_productos gastos_productos_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_productos
    ADD CONSTRAINT gastos_productos_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: gastos_productos gastos_productos_id_producto_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_productos
    ADD CONSTRAINT gastos_productos_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES playa.productos(id_producto);


--
-- Name: gastos_productos gastos_productos_id_tipo_gasto_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.gastos_productos
    ADD CONSTRAINT gastos_productos_id_tipo_gasto_fkey FOREIGN KEY (id_tipo_gasto) REFERENCES playa.tipos_gastos_productos(id_tipo_gasto);


--
-- Name: historial_calificaciones historial_calificaciones_id_cliente_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_calificaciones
    ADD CONSTRAINT historial_calificaciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES playa.clientes(id_cliente);


--
-- Name: historial_calificaciones historial_calificaciones_id_pago_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_calificaciones
    ADD CONSTRAINT historial_calificaciones_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES playa.pagos(id_pago);


--
-- Name: historial_calificaciones historial_calificaciones_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_calificaciones
    ADD CONSTRAINT historial_calificaciones_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta);


--
-- Name: historial_propietarios historial_propietarios_id_producto_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.historial_propietarios
    ADD CONSTRAINT historial_propietarios_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES playa.productos(id_producto);


--
-- Name: imagenes_productos imagenes_productos_id_producto_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.imagenes_productos
    ADD CONSTRAINT imagenes_productos_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES playa.productos(id_producto);


--
-- Name: movimientos movimientos_id_cuenta_destino_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.movimientos
    ADD CONSTRAINT movimientos_id_cuenta_destino_fkey FOREIGN KEY (id_cuenta_destino) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: movimientos movimientos_id_cuenta_origen_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.movimientos
    ADD CONSTRAINT movimientos_id_cuenta_origen_fkey FOREIGN KEY (id_cuenta_origen) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: pagares pagares_id_estado_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagares
    ADD CONSTRAINT pagares_id_estado_fkey FOREIGN KEY (id_estado) REFERENCES playa.estados(id_estado);


--
-- Name: pagares pagares_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagares
    ADD CONSTRAINT pagares_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta);


--
-- Name: pagos pagos_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos
    ADD CONSTRAINT pagos_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES playa.cuentas(id_cuenta);


--
-- Name: pagos pagos_id_pagare_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos
    ADD CONSTRAINT pagos_id_pagare_fkey FOREIGN KEY (id_pagare) REFERENCES playa.pagares(id_pagare);


--
-- Name: pagos pagos_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.pagos
    ADD CONSTRAINT pagos_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta);


--
-- Name: productos productos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.productos
    ADD CONSTRAINT productos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES playa.categorias_vehiculos(id_categoria);


--
-- Name: productos productos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.productos
    ADD CONSTRAINT productos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES sistema.usuarios(id);


--
-- Name: productos productos_nro_despacho_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.productos
    ADD CONSTRAINT productos_nro_despacho_fkey FOREIGN KEY (nro_despacho) REFERENCES playa.documentos_importacion(nro_despacho);


--
-- Name: refuerzos refuerzos_id_pagare_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.refuerzos
    ADD CONSTRAINT refuerzos_id_pagare_fkey FOREIGN KEY (id_pagare) REFERENCES playa.pagares(id_pagare);


--
-- Name: refuerzos refuerzos_id_venta_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.refuerzos
    ADD CONSTRAINT refuerzos_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES playa.ventas(id_venta);


--
-- Name: ubicaciones_cliente ubicaciones_cliente_id_cliente_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ubicaciones_cliente
    ADD CONSTRAINT ubicaciones_cliente_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES playa.clientes(id_cliente);


--
-- Name: ventas ventas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES playa.clientes(id_cliente);


--
-- Name: ventas ventas_id_escribania_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_id_escribania_fkey FOREIGN KEY (id_escribania) REFERENCES playa.escribanias(id_escribania);


--
-- Name: ventas ventas_id_producto_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES playa.productos(id_producto);


--
-- Name: ventas ventas_id_vendedor_fkey; Type: FK CONSTRAINT; Schema: playa; Owner: postgres
--

ALTER TABLE ONLY playa.ventas
    ADD CONSTRAINT ventas_id_vendedor_fkey FOREIGN KEY (id_vendedor) REFERENCES playa.vendedores(id_vendedor);


--
-- Name: backups_sistema backups_sistema_creado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.backups_sistema
    ADD CONSTRAINT backups_sistema_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES sistema.usuarios(id);


--
-- Name: configuracion_email configuracion_email_creado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.configuracion_email
    ADD CONSTRAINT configuracion_email_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES sistema.usuarios(id);


--
-- Name: logs_acceso logs_acceso_usuario_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_acceso
    ADD CONSTRAINT logs_acceso_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES sistema.usuarios(id);


--
-- Name: logs_auditoria logs_auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.logs_auditoria
    ADD CONSTRAINT logs_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES sistema.usuarios(id);


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES sistema.usuarios(id);


--
-- Name: parametros_sistema parametros_sistema_modificado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.parametros_sistema
    ADD CONSTRAINT parametros_sistema_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES sistema.usuarios(id);


--
-- Name: reportes reportes_creado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.reportes
    ADD CONSTRAINT reportes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES sistema.usuarios(id);


--
-- Name: rol_permiso rol_permiso_permiso_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.rol_permiso
    ADD CONSTRAINT rol_permiso_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES sistema.permisos(id);


--
-- Name: rol_permiso rol_permiso_rol_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.rol_permiso
    ADD CONSTRAINT rol_permiso_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES sistema.roles(id);


--
-- Name: roles roles_creado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.roles
    ADD CONSTRAINT roles_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES sistema.usuarios(id);


--
-- Name: sesiones_usuarios sesiones_usuarios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.sesiones_usuarios
    ADD CONSTRAINT sesiones_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES sistema.usuarios(id);


--
-- Name: usuario_rol usuario_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuario_rol
    ADD CONSTRAINT usuario_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES sistema.roles(id);


--
-- Name: usuario_rol usuario_rol_usuario_id_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuario_rol
    ADD CONSTRAINT usuario_rol_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES sistema.usuarios(id);


--
-- Name: usuarios usuarios_creado_por_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuarios
    ADD CONSTRAINT usuarios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES sistema.usuarios(id);


--
-- Name: usuarios usuarios_id_playa_fkey; Type: FK CONSTRAINT; Schema: sistema; Owner: postgres
--

ALTER TABLE ONLY sistema.usuarios
    ADD CONSTRAINT usuarios_id_playa_fkey FOREIGN KEY (id_playa) REFERENCES sistema.playas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 0FE3JCzk7DU2ouIXYdCabOJg0Gk3piuTLHO6UHZKFIcwfCMrmPkBd2JyiqGA9S1

