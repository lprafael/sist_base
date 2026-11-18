-- SCRIPT OFICIAL: XIII TORNEO INTERNACIONAL DE KARATE DO SEIGOKAN
-- ASIGNADO DIRECTAMENTE AL TENANT DE JORGE SALGADO

DO $$
DECLARE
    v_torneo_id UUID := '2ed2f229-6e67-400b-adc4-b6a7371ebcf3'::UUID;
    v_user_id INTEGER;
    v_org_id INTEGER;
    v_cat_id UUID;
BEGIN
    -- 1. Buscar o crear usuario de Jorge Salgado
    SELECT id INTO v_user_id 
    FROM auth.usuarios 
    WHERE email ILIKE '%contacto@seigokanpy.com%' 
       OR email ILIKE '%jorge%salgado%'
       OR nombre ILIKE '%Jorge Salgado%'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        INSERT INTO auth.usuarios (username, email, password_hash, nombre, rol, activo, creado_en)
        VALUES ('jorgesalgado', 'contacto@seigokanpy.com', '.5x8a.1b8cOUyQy1n8y4w7b4c6e7f8g9h0i1j2k3l4', 'Jorge Salgado Castillo', 'organizador', TRUE, NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- 2. Buscar o crear Tenant en cancha.organizadores
    SELECT id INTO v_org_id 
    FROM cancha.organizadores 
    WHERE usuario_id = v_user_id 
       OR nombre ILIKE '%Jorge Salgado%'
       OR nombre ILIKE '%Seigokan%'
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO cancha.organizadores (usuario_id, nombre, plan, max_torneos, telefono, email, activo, creado_en)
        VALUES (v_user_id, 'Jorge Salgado Castillo (Seigokan Paraguay)', 'pro', 50, '+595 994 849 555', 'contacto@seigokanpy.com', TRUE, NOW())
        RETURNING id INTO v_org_id;
    ELSE
        UPDATE cancha.organizadores 
        SET usuario_id = COALESCE(usuario_id, v_user_id), activo = TRUE
        WHERE id = v_org_id;
    END IF;

    -- 3. Crear o actualizar el Torneo con el organizador_id correcto
    INSERT INTO torneos.torneos (
        id, nombre, tipo_campeonato, organizador_id, deporte, formato, estado, creado_en,
        fecha_inicio, fecha_fin, tipo_ubicacion, configuracion, reglas, premios
    ) VALUES (
        v_torneo_id,
        'XIII Torneo Internacional de Karate Do Seigokan',
        'categorias',
        v_org_id,
        'Karate',
        'eliminatoria_directa',
        'abierto',
        NOW(),
        '2026-11-28'::DATE,
        '2026-11-28'::DATE,
        'persona',
        jsonb_build_object(
            'ubicacion_texto', 'Ciudad del Este, Paraguay',
            'modalidad_inscripcion', 'por_atleta',
            'tatamis', 4,
            'tolerancia_peso_kg', 1.0,
            'duracion_combate_segundos', 120,
            'video_review_habilitado', true,
            'contacto', jsonb_build_object(
                'director', 'Sensei Jorge Salgado Castillo (4° Dan Go Ju Ryu)',
                'telefono_1', '+595 994 849 555',
                'telefono_2', '+595 982 484 088',
                'email', 'contacto@seigokanpy.com'
            ),
            'aranceles', jsonb_build_object(
                'kata_o_kumite', '150.000 Gs',
                'ambas_modalidades', '200.000 Gs'
            ),
            'cuentas_pago', jsonb_build_object(
                'banco', 'Banco Atlas',
                'cuenta_corriente', '1701840',
                'titular', 'Jorge Salgado Castillo',
                'ci', '2.466.522'
            )
        ),
        jsonb_build_object(
            'reglamento', 'World Karate Federation (WKF)',
            'sistema_arbitraje', 'WKF 2024 + Video Review Oficial',
            'pesaje_oficial', 'Tolerancia ±1.0 kg (Descalificación y Walkover por sobrepeso)',
            'criterios_desempate', jsonb_build_array('Senshu', 'Mayor Ippon', 'Mayor Waza-Ari', 'Hantei'),
            'superioridad_tecnica', '8 puntos de diferencia (Finalización automática)'
        ),
        jsonb_build_object(
            'trofeo_principal', 'Copa Sensei Takeshi Fukochi',
            'premiacion', '1°, 2° y 3° puestos por división y medallero general por dojo'
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        organizador_id = v_org_id,
        nombre = EXCLUDED.nombre,
        tipo_campeonato = EXCLUDED.tipo_campeonato,
        fecha_inicio = EXCLUDED.fecha_inicio,
        fecha_fin = EXCLUDED.fecha_fin,
        configuracion = EXCLUDED.configuracion,
        reglas = EXCLUDED.reglas,
        premios = EXCLUDED.premios;

    -- 4. Dojos Invitados Oficiales
    INSERT INTO torneos.equipos (id, torneo_id, nombre, nombre_academia, creado_en)
    VALUES
        (gen_random_uuid(), v_torneo_id, 'Seigokan Paraguay (Dojo Central)', 'Seigokan Paraguay', NOW()),
        (gen_random_uuid(), v_torneo_id, 'Asociación Seigokan Argentina', 'Seigokan Argentina', NOW()),
        (gen_random_uuid(), v_torneo_id, 'Federación Paulista de Karate (Brasil)', 'Dojos Brasil', NOW()),
        (gen_random_uuid(), v_torneo_id, 'Club Deportivo Seigokan Chile', 'Seigokan Chile', NOW()),
        (gen_random_uuid(), v_torneo_id, 'Delegación Karate Do Venezuela', 'Karate Venezuela', NOW()),
        (gen_random_uuid(), v_torneo_id, 'Dojo Bushido Ciudad del Este', 'Bushido CDE', NOW())
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante Hasta 5 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante Hasta 5 años Femenino', 'Oficial WKF - Kata Principiante Hasta 5 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante Hasta 5 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante Hasta 5 años Masculino', 'Oficial WKF - Kata Principiante Hasta 5 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 8 y 9 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 8 y 9 años Femenino', 'Oficial WKF - Kata Principiante 8 y 9 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 8 y 9 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 8 y 9 años Masculino', 'Oficial WKF - Kata Principiante 8 y 9 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 10 y 11 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 10 y 11 años Femenino', 'Oficial WKF - Kata Principiante 10 y 11 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 10 y 11 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 10 y 11 años Masculino', 'Oficial WKF - Kata Principiante 10 y 11 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 12 y 13 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 12 y 13 años Femenino', 'Oficial WKF - Kata Principiante 12 y 13 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 12 y 13 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 12 y 13 años Masculino', 'Oficial WKF - Kata Principiante 12 y 13 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 14 y 15 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 14 y 15 años Femenino', 'Oficial WKF - Kata Principiante 14 y 15 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 14 y 15 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 14 y 15 años Masculino', 'Oficial WKF - Kata Principiante 14 y 15 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 16 y 17 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 16 y 17 años Femenino', 'Oficial WKF - Kata Principiante 16 y 17 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Principiante 16 y 17 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Principiante 16 y 17 años Masculino', 'Oficial WKF - Kata Principiante 16 y 17 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Intermedio 6 y 7 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Intermedio 6 y 7 años Femenino', 'Oficial WKF - Kata Intermedio 6 y 7 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Intermedio 6 y 7 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Intermedio 6 y 7 años Masculino', 'Oficial WKF - Kata Intermedio 6 y 7 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Intermedio 8 y 9 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Intermedio 8 y 9 años Femenino', 'Oficial WKF - Kata Intermedio 8 y 9 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Intermedio 8 y 9 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Intermedio 8 y 9 años Masculino', 'Oficial WKF - Kata Intermedio 8 y 9 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Senior Femenino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Senior Femenino (Menos de marrón)', 'Oficial WKF - Kata Senior Femenino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Kyus menores') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Kyus menores');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Senior Masculino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Senior Masculino (Menos de marrón)', 'Oficial WKF - Kata Senior Masculino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Kyus menores') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Kyus menores');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Oficial WKF 10 y 11 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Oficial WKF 10 y 11 años Femenino', 'Oficial WKF - Kata Oficial WKF 10 y 11 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Oficial WKF 10 y 11 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Oficial WKF 10 y 11 años Masculino', 'Oficial WKF - Kata Oficial WKF 10 y 11 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Oficial WKF 12 y 13 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Oficial WKF 12 y 13 años Femenino', 'Oficial WKF - Kata Oficial WKF 12 y 13 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Oficial WKF 12 y 13 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Oficial WKF 12 y 13 años Masculino', 'Oficial WKF - Kata Oficial WKF 12 y 13 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Cadete Oficial WKF (14-15 años) Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Cadete Oficial WKF (14-15 años) Femenino', 'Oficial WKF - Kata Cadete Oficial WKF (14-15 años) Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Cadete Oficial WKF (14-15 años) Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Cadete Oficial WKF (14-15 años) Masculino', 'Oficial WKF - Kata Cadete Oficial WKF (14-15 años) Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Junior Oficial WKF (16-17 años) Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Junior Oficial WKF (16-17 años) Femenino', 'Oficial WKF - Kata Junior Oficial WKF (16-17 años) Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Junior Oficial WKF (16-17 años) Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Junior Oficial WKF (16-17 años) Masculino', 'Oficial WKF - Kata Junior Oficial WKF (16-17 años) Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Under 21 Oficial WKF Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Under 21 Oficial WKF Femenino', 'Oficial WKF - Kata Under 21 Oficial WKF Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Under 21 Oficial WKF Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Under 21 Oficial WKF Masculino', 'Oficial WKF - Kata Under 21 Oficial WKF Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Senior Oficial WKF Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Senior Oficial WKF Femenino', 'Oficial WKF - Kata Senior Oficial WKF Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Senior Oficial WKF Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Senior Oficial WKF Masculino', 'Oficial WKF - Kata Senior Oficial WKF Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Oficial W.K.F.') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Oficial W.K.F.');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Master Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Master Femenino', 'Oficial WKF - Kata Master Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kata Master Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kata Master Masculino', 'Oficial WKF - Kata Master Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional Hasta 5 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional Hasta 5 años Femenino', 'Oficial WKF - Kumite Promocional Hasta 5 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional Hasta 5 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional Hasta 5 años Masculino', 'Oficial WKF - Kumite Promocional Hasta 5 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional 6 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional 6 años Femenino', 'Oficial WKF - Kumite Promocional 6 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional 6 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional 6 años Masculino', 'Oficial WKF - Kumite Promocional 6 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional 7 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional 7 años Femenino', 'Oficial WKF - Kumite Promocional 7 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Promocional 7 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Promocional 7 años Masculino', 'Oficial WKF - Kumite Promocional 7 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 8 y 9 años Femenino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 8 y 9 años Femenino Principiante', 'Oficial WKF - Kumite 8 y 9 años Femenino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 8 y 9 años Masculino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 8 y 9 años Masculino Principiante', 'Oficial WKF - Kumite 8 y 9 años Masculino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 8 y 9 años Femenino Libre';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 8 y 9 años Femenino Libre', 'Oficial WKF - Kumite 8 y 9 años Femenino Libre');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 8 y 9 años Masculino Libre';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 8 y 9 años Masculino Libre', 'Oficial WKF - Kumite 8 y 9 años Masculino Libre');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Libre') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Libre');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 10 y 11 años Femenino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 10 y 11 años Femenino Principiante', 'Oficial WKF - Kumite 10 y 11 años Femenino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 10 y 11 años Masculino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 10 y 11 años Masculino Principiante', 'Oficial WKF - Kumite 10 y 11 años Masculino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 12 y 13 años Femenino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 12 y 13 años Femenino Principiante', 'Oficial WKF - Kumite 12 y 13 años Femenino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 12 y 13 años Masculino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 12 y 13 años Masculino Principiante', 'Oficial WKF - Kumite 12 y 13 años Masculino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 14 y 15 años Femenino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 14 y 15 años Femenino Principiante', 'Oficial WKF - Kumite 14 y 15 años Femenino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 14 y 15 años Masculino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 14 y 15 años Masculino Principiante', 'Oficial WKF - Kumite 14 y 15 años Masculino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 16 y 17 años Femenino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 16 y 17 años Femenino Principiante', 'Oficial WKF - Kumite 16 y 17 años Femenino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite 16 y 17 años Masculino Principiante';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite 16 y 17 años Masculino Principiante', 'Oficial WKF - Kumite 16 y 17 años Masculino Principiante');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Principiante') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Principiante');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Senior Femenino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Senior Femenino (Menos de marrón)', 'Oficial WKF - Kumite Senior Femenino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Senior Masculino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Senior Masculino (Menos de marrón)', 'Oficial WKF - Kumite Senior Masculino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Master +35 años Femenino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Master +35 años Femenino (Menos de marrón)', 'Oficial WKF - Kumite Master +35 años Femenino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Master +35 años Masculino (Menos de marrón)';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Master +35 años Masculino (Menos de marrón)', 'Oficial WKF - Kumite Master +35 años Masculino (Menos de marrón)');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = 'Open') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, 'Open');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Infantil 10 y 11 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Infantil 10 y 11 años Femenino', 'Oficial WKF - Kumite Infantil 10 y 11 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-42 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-42 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-40 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-40 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Infantil 10 y 11 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Infantil 10 y 11 años Masculino', 'Oficial WKF - Kumite Infantil 10 y 11 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+42 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+42 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+40 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+40 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Infantil 12 y 13 años Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Infantil 12 y 13 años Femenino', 'Oficial WKF - Kumite Infantil 12 y 13 años Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-47 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-47 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-50 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-50 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Infantil 12 y 13 años Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Infantil 12 y 13 años Masculino', 'Oficial WKF - Kumite Infantil 12 y 13 años Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+47 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+47 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+50 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+50 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Cadete Oficial WKF (14-15 años) Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Cadete Oficial WKF (14-15 años) Femenino', 'Oficial WKF - Kumite Cadete Oficial WKF (14-15 años) Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-54 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-54 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+54 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+54 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Cadete Oficial WKF (14-15 años) Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Cadete Oficial WKF (14-15 años) Masculino', 'Oficial WKF - Kumite Cadete Oficial WKF (14-15 años) Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-63 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-63 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+63 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+63 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Junior Oficial WKF (16-17 años) Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Junior Oficial WKF (16-17 años) Femenino', 'Oficial WKF - Kumite Junior Oficial WKF (16-17 años) Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-59 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-59 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+59 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+59 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Junior Oficial WKF (16-17 años) Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Junior Oficial WKF (16-17 años) Masculino', 'Oficial WKF - Kumite Junior Oficial WKF (16-17 años) Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-68 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-68 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+68 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+68 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Under 21 Oficial WKF Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Under 21 Oficial WKF Femenino', 'Oficial WKF - Kumite Under 21 Oficial WKF Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-61 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-61 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+61 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+61 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Under 21 Oficial WKF Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Under 21 Oficial WKF Masculino', 'Oficial WKF - Kumite Under 21 Oficial WKF Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-75 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-75 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+75 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+75 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Senior Oficial WKF (+18 años) Femenino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Senior Oficial WKF (+18 años) Femenino', 'Oficial WKF - Kumite Senior Oficial WKF (+18 años) Femenino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-61 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-61 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+61 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+61 kg');
    END IF;

    SELECT id INTO v_cat_id FROM torneos.categorias WHERE torneo_id = v_torneo_id AND nombre = 'Kumite Senior Oficial WKF (+18 años) Masculino';
    IF v_cat_id IS NULL THEN
        v_cat_id := gen_random_uuid();
        INSERT INTO torneos.categorias (id, torneo_id, nombre, descripcion)
        VALUES (v_cat_id, v_torneo_id, 'Kumite Senior Oficial WKF (+18 años) Masculino', 'Oficial WKF - Kumite Senior Oficial WKF (+18 años) Masculino');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '-75 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '-75 kg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM torneos.divisiones WHERE categoria_id = v_cat_id AND nombre = '+75 kg') THEN
        INSERT INTO torneos.divisiones (id, categoria_id, nombre)
        VALUES (gen_random_uuid(), v_cat_id, '+75 kg');
    END IF;

    RAISE NOTICE '¡Torneo creado exitosamente en el Tenant de Jorge Salgado (Org ID: %)!', v_org_id;
END $$;
