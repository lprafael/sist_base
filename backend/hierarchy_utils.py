# hierarchy_utils.py
# Utilidades de jerarquía para control de acceso por rol

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import Usuario, Caudillo


async def get_visible_caudillo_ids(user_id: int, user_role: str, session: AsyncSession) -> list[int]:
    """
    Retorna los IDs de caudillos visibles para el usuario según su rol.

    - admin:      todos los caudillos
    - intendente: su propio caudillo + sus concejales + caudillos de sus concejales
    - concejal:   su propio caudillo + sus caudillos directos
    - caudillo:   solo su propio caudillo
    """
    if user_role == "admin":
        res = await session.execute(select(Caudillo.id).where(Caudillo.activo == True))
        return [r[0] for r in res.all()]

    # Mi propio caudillo
    res_me = await session.execute(
        select(Caudillo.id).where(Caudillo.id_usuario_sistema == user_id)
    )
    my_caudillo_ids = [r[0] for r in res_me.all()]

    if user_role == "caudillo":
        return my_caudillo_ids

    # Subordinados directos (concejales creados por intendente, o caudillos creados por concejal)
    res_direct = await session.execute(
        select(Usuario.id).where(Usuario.creado_por == user_id)
    )
    direct_user_ids = [r[0] for r in res_direct.all()]

    # Caudillos de los subordinados directos
    direct_caudillo_ids = []
    if direct_user_ids:
        res_dc = await session.execute(
            select(Caudillo.id).where(
                Caudillo.id_usuario_sistema.in_(direct_user_ids),
                Caudillo.activo == True
            )
        )
        direct_caudillo_ids = [r[0] for r in res_dc.all()]

    if user_role == "concejal":
        return my_caudillo_ids + direct_caudillo_ids

    if user_role == "intendente":
        # También incluir caudillos de segundo nivel (caudillos de los concejales)
        second_level_ids = []
        if direct_user_ids:
            res_lv2_users = await session.execute(
                select(Usuario.id).where(Usuario.creado_por.in_(direct_user_ids))
            )
            lv2_user_ids = [r[0] for r in res_lv2_users.all()]
            if lv2_user_ids:
                res_lv2 = await session.execute(
                    select(Caudillo.id).where(
                        Caudillo.id_usuario_sistema.in_(lv2_user_ids),
                        Caudillo.activo == True
                    )
                )
                second_level_ids = [r[0] for r in res_lv2.all()]

        return my_caudillo_ids + direct_caudillo_ids + second_level_ids

    # Fallback: solo su propio caudillo
    return my_caudillo_ids


async def get_visible_user_ids(user_id: int, user_role: str, session: AsyncSession) -> list[int]:
    """
    Retorna los IDs de usuarios visibles en el listado según el rol.

    - admin:      todos
    - intendente: sus concejales + sus caudillos directos + caudillos de sus concejales
    - concejal:   sus caudillos directos
    - caudillo:   nadie (no puede ver otros usuarios)
    """
    if user_role == "admin":
        res = await session.execute(select(Usuario.id))
        return [r[0] for r in res.all()]

    if user_role == "caudillo":
        return []

    # Mis subordinados directos
    res_direct = await session.execute(
        select(Usuario.id).where(Usuario.creado_por == user_id)
    )
    direct_ids = [r[0] for r in res_direct.all()]

    if user_role == "concejal":
        return direct_ids

    if user_role == "intendente":
        # Subordinados de segundo nivel (caudillos de mis concejales)
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
    El intendente asigna su territorio a sus concejales y caudillos.
    """
    if target_role in ["concejal", "caudillo"]:
        # Heredar del creador si no se especificó explícitamente
        if not user_data_dict.get("departamento_id"):
            user_data_dict["departamento_id"] = creator_user.get("departamento_id")
        if not user_data_dict.get("distrito_id"):
            user_data_dict["distrito_id"] = creator_user.get("distrito_id")
    return user_data_dict
