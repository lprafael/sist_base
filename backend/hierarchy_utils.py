# hierarchy_utils.py
# Utilidades de jerarquía para control de acceso por rol

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario, Referente


async def get_visible_referente_ids(user_id: int, user_role: str, session: AsyncSession) -> list[int]:
    """
    Retorna los IDs de referentes visibles para el usuario según su rol.

    - admin:      todos los referentes
    - intendente: su propio referente + sus concejales + referentes de sus concejales
    - concejal:   su propio referente + sus referentes directos
    - referente:   solo su propio referente
    """
    # Sanitizar el rol para comparación robusta
    clean_role = user_role.lower().strip() if user_role else ""

    if clean_role == "admin":
        res = await session.execute(select(Referente.id).where(Referente.activo == True))
        return [r[0] for r in res.all()]

    # Mi propio referente
    res_me = await session.execute(
        select(Referente.id).where(Referente.id_usuario_sistema == user_id)
    )
    my_referente_ids = [r[0] for r in res_me.all()]

    if clean_role == "referente":
        return my_referente_ids

    # Subordinados directos (concejales creados por intendente, o referentes creados por concejal)
    res_direct = await session.execute(
        select(Usuario.id).where(Usuario.creado_por == user_id)
    )
    direct_user_ids = [r[0] for r in res_direct.all()]

    # Referentes de los subordinados directos
    direct_referente_ids = []
    if direct_user_ids:
        res_dc = await session.execute(
            select(Referente.id).where(
                Referente.id_usuario_sistema.in_(direct_user_ids),
                Referente.activo == True
            )
        )
        direct_referente_ids = [r[0] for r in res_dc.all()]

    if clean_role == "concejal":
        return my_referente_ids + direct_referente_ids

    if clean_role == "intendente":
        # También incluir referentes de segundo nivel (referentes de los concejales)
        second_level_ids = []
        if direct_user_ids:
            res_lv2_users = await session.execute(
                select(Usuario.id).where(Usuario.creado_por.in_(direct_user_ids))
            )
            lv2_user_ids = [r[0] for r in res_lv2_users.all()]
            if lv2_user_ids:
                res_lv2 = await session.execute(
                    select(Referente.id).where(
                        Referente.id_usuario_sistema.in_(lv2_user_ids),
                        Referente.activo == True
                    )
                )
                second_level_ids = [r[0] for r in res_lv2.all()]

        return my_referente_ids + direct_referente_ids + second_level_ids

    # Fallback: solo su propio referente
    return my_referente_ids


async def get_visible_user_ids(user_id: int, user_role: str, session: AsyncSession) -> list[int]:
    """
    Retorna los IDs de usuarios visibles en el listado según el rol y la jerarquía política (tabla Referente).
    """
    clean_role = user_role.lower().strip() if user_role else ""
    
    if clean_role == "admin":
        res = await session.execute(select(Usuario.id))
        return [r[0] for r in res.all()]

    if clean_role == "referente":
        return []

    # 1. Obtener mi ID en la tabla de referentes
    res_me = await session.execute(
        select(Referente.id).where(Referente.id_usuario_sistema == user_id)
    )
    my_ref_id = res_me.scalar_one_or_none()

    # 2. Obtener subordinados directos por Referente (jerarquía política)
    direct_ids = []
    if my_ref_id:
        res_direct = await session.execute(
            select(Usuario.id).where(
                Usuario.id == Referente.id_usuario_sistema,
                Referente.id_superior == my_ref_id
            )
        )
        direct_ids = [r[0] for r in res_direct.all()]
    
    # 3. Fallback/Complemento: Subordinados por creado_por (jerarquía de sistema)
    res_system = await session.execute(
        select(Usuario.id).where(Usuario.creado_por == user_id)
    )
    system_ids = [r[0] for r in res_system.all()]
    
    # Combinar ambas listas (evitando duplicados)
    all_direct_ids = list(set(direct_ids + system_ids))

    if clean_role == "concejal":
        return all_direct_ids

    if clean_role == "intendente":
        # Para el intendente, también incluimos el segundo nivel (referentes de sus concejales)
        lv2_ids = []
        
        # Primero por jerarquía de referentes
        if my_ref_id:
            # Usuarios cuyo superior tiene como superior a mí (Nivel 2 político)
            # Buscamos referentes cuyo superior_id esté en la lista de IDs de referentes de mis subordinados directos
            res_sub_refs = await session.execute(
                select(Referente.id).where(Referente.id_usuario_sistema.in_(all_direct_ids))
            )
            sub_ref_ids = [r[0] for r in res_sub_refs.all()]
            
            if sub_ref_ids:
                res_lv2_pol = await session.execute(
                    select(Usuario.id).where(
                        Usuario.id == Referente.id_usuario_sistema,
                        Referente.id_superior.in_(sub_ref_ids)
                    )
                )
                lv2_ids += [r[0] for r in res_lv2_pol.all()]

        # También por jerarquía de sistema (creado_por de mis subordinados)
        if all_direct_ids:
            res_lv2_sys = await session.execute(
                select(Usuario.id).where(Usuario.creado_por.in_(all_direct_ids))
            )
            lv2_ids += [r[0] for r in res_lv2_sys.all()]
            
        return list(set(all_direct_ids + lv2_ids))

    return all_direct_ids


def inherit_territory(creator_user: dict, target_role: str, user_data_dict: dict) -> dict:
    """
    Propaga el territorio (distrito/departamento) del creador al nuevo usuario.
    El intendente asigna su territorio a sus concejales y referentes.
    """
    if target_role in ["concejal", "referente"]:
        # Heredar del creador si no se especificó explícitamente
        if not user_data_dict.get("departamento_id"):
            user_data_dict["departamento_id"] = creator_user.get("departamento_id")
        if not user_data_dict.get("distrito_id"):
            user_data_dict["distrito_id"] = creator_user.get("distrito_id")
    return user_data_dict
