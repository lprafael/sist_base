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
    if user_role == "admin":
        res = await session.execute(select(Referente.id).where(Referente.activo == True))
        return [r[0] for r in res.all()]

    # Mi propio referente
    res_me = await session.execute(
        select(Referente.id).where(Referente.id_usuario_sistema == user_id)
    )
    my_referente_ids = [r[0] for r in res_me.all()]

    if user_role == "referente":
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

    if user_role == "concejal":
        return my_referente_ids + direct_referente_ids

    if user_role == "intendente":
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
    Retorna los IDs de usuarios visibles en el listado según el rol.

    - admin:      todos
    - intendente: sus concejales + sus referentes directos + referentes de sus concejales
    - concejal:   sus referentes directos
    - referente:   nadie (no puede ver otros usuarios)
    """
    if user_role == "admin":
        res = await session.execute(select(Usuario.id))
        return [r[0] for r in res.all()]

    if user_role == "referente":
        return []

    # Mis subordinados directos
    res_direct = await session.execute(
        select(Usuario.id).where(Usuario.creado_por == user_id)
    )
    direct_ids = [r[0] for r in res_direct.all()]

    if user_role == "concejal":
        return direct_ids

    if user_role == "intendente":
        # Subordinados de segundo nivel (referentes de mis concejales)
        lv2_ids = []
        if direct_ids:
            res_lv2 = await session.execute(
                select(Usuario.id).where(Usuario.creado_por.in_(direct_ids))
            )
            lv2_ids = [r[0] for r in res_lv2.all()]
        return direct_ids + lv2_ids

    return direct_ids


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
