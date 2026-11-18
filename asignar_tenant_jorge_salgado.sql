-- ==============================================================================
-- SCRIPT OFICIAL: ASIGNAR EL XIII TORNEO SEIGOKAN AL TENANT DE JORGE SALGADO
-- ==============================================================================

DO $$
DECLARE
    v_torneo_id UUID := '2ed2f229-6e67-400b-adc4-b6a7371ebcf3'::UUID;
    v_user_id INTEGER;
    v_org_id INTEGER;
    v_cat_id UUID;
BEGIN
    -- 1. Buscar o registrar al usuario Jorge Salgado en la tabla de usuarios
    SELECT id INTO v_user_id 
    FROM auth.usuarios 
    WHERE email ILIKE '%contacto@seigokanpy.com%' 
       OR email ILIKE '%jorge%salgado%'
       OR nombre ILIKE '%Jorge Salgado%'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        -- Si no existe, lo insertamos como organizador
        INSERT INTO auth.usuarios (username, email, password_hash, nombre, rol, activo, creado_en)
        VALUES (
            'jorgesalgado',
            'contacto@seigokanpy.com',
            '$2b$12$e80yvYm7K8w.5x8a.1b8cOUyQy1n8y4w7b4c6e7f8g9h0i1j2k3l4', -- hash temporal
            'Jorge Salgado Castillo',
            'organizador',
            TRUE,
            NOW()
        )
        RETURNING id INTO v_user_id;
        RAISE NOTICE 'Usuario Jorge Salgado creado con ID %', v_user_id;
    ELSE
        RAISE NOTICE 'Usuario Jorge Salgado encontrado con ID %', v_user_id;
    END IF;

    -- 2. Buscar o registrar su Tenant en cancha.organizadores
    SELECT id INTO v_org_id 
    FROM cancha.organizadores 
    WHERE usuario_id = v_user_id 
       OR nombre ILIKE '%Jorge Salgado%'
       OR nombre ILIKE '%Seigokan%'
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO cancha.organizadores (usuario_id, nombre, plan, max_torneos, telefono, email, activo, creado_en)
        VALUES (
            v_user_id,
            'Jorge Salgado Castillo (Seigokan Paraguay)',
            'pro',
            50,
            '+595 994 849 555',
            'contacto@seigokanpy.com',
            TRUE,
            NOW()
        )
        RETURNING id INTO v_org_id;
        RAISE NOTICE 'Organizador (Tenant) creado con ID %', v_org_id;
    ELSE
        UPDATE cancha.organizadores 
        SET usuario_id = COALESCE(usuario_id, v_user_id),
            activo = TRUE
        WHERE id = v_org_id;
        RAISE NOTICE 'Organizador (Tenant) existente con ID %', v_org_id;
    END IF;

    -- 3. Crear o actualizar el Torneo asignándolo DIRECTAMENTE a su Tenant
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

    -- También asegurar en caso de existir en torneos_generales o torneos.eventos
    UPDATE torneos.torneos SET organizador_id = v_org_id WHERE id = v_torneo_id;

    RAISE NOTICE '¡Torneo 2ed2f229 exitosamente asignado al Tenant de Jorge Salgado (ID: %)!', v_org_id;
END $$;
