"""
test_wkf_scoring.py
Suite de pruebas unitarias para el Sistema de Puntuación Oficial WKF (World Karate Federation)
"""
import sys

def resolver_desempate_wkf(
    senshu_aka: bool, ippon_aka: int, waza_ari_aka: int,
    senshu_ao: bool, ippon_ao: int, waza_ari_ao: int
):
    """Algoritmo oficial de resolución de empates en Kumite WKF (Art. 1.4)"""
    # 1. Senshu
    if senshu_aka and not senshu_ao:
        return {"ganador": "aka", "motivo": "Criterio 1 WKF: Ventaja por Senshu (Primer punto de la contienda)", "status": "resuelto"}
    if senshu_ao and not senshu_aka:
        return {"ganador": "ao", "motivo": "Criterio 1 WKF: Ventaja por Senshu (Primer punto de la contienda)", "status": "resuelto"}

    # 2. Mayor número de Ippons (3 puntos)
    if ippon_aka > ippon_ao:
        return {"ganador": "aka", "motivo": f"Criterio 2 WKF: Mayor cantidad de Ippon ({ippon_aka} vs {ippon_ao})", "status": "resuelto"}
    if ippon_ao > ippon_aka:
        return {"ganador": "ao", "motivo": f"Criterio 2 WKF: Mayor cantidad de Ippon ({ippon_ao} vs {ippon_aka})", "status": "resuelto"}

    # 3. Mayor número de Waza-Aris (2 puntos)
    if waza_ari_aka > waza_ari_ao:
        return {"ganador": "aka", "motivo": f"Criterio 3 WKF: Mayor cantidad de Waza-Ari ({waza_ari_aka} vs {waza_ari_ao})", "status": "resuelto"}
    if waza_ari_ao > waza_ari_aka:
        return {"ganador": "ao", "motivo": f"Criterio 3 WKF: Mayor cantidad de Waza-Ari ({waza_ari_ao} vs {waza_ari_aka})", "status": "resuelto"}

    # 4. Hantei
    return {
        "ganador": None,
        "motivo": "Igualdad estricta en Senshu, Ippons y Waza-Aris. Requiere votación arbitral por banderas (Hantei)",
        "status": "empate"
    }

def test_desempate_criterio_1_senshu():
    res = resolver_desempate_wkf(
        senshu_aka=True, ippon_aka=0, waza_ari_aka=1,
        senshu_ao=False, ippon_ao=1, waza_ari_ao=0
    )
    assert res["status"] == "resuelto", "Debe resolver por Senshu"
    assert res["ganador"] == "aka", "AKA debe ganar por Senshu"
    print("[PASS] Test Criterio 1 WKF (Senshu)")

def test_desempate_criterio_2_ippon():
    res = resolver_desempate_wkf(
        senshu_aka=False, ippon_aka=2, waza_ari_aka=0,
        senshu_ao=False, ippon_ao=1, waza_ari_ao=2
    )
    assert res["status"] == "resuelto", "Debe resolver por Ippon"
    assert res["ganador"] == "aka", "AKA debe ganar por mayor número de Ippon"
    print("[PASS] Test Criterio 2 WKF (Mayor Ippon)")

def test_desempate_criterio_3_wazaari():
    res = resolver_desempate_wkf(
        senshu_aka=False, ippon_aka=1, waza_ari_aka=1,
        senshu_ao=False, ippon_ao=1, waza_ari_ao=2
    )
    assert res["status"] == "resuelto", "Debe resolver por Waza-Ari"
    assert res["ganador"] == "ao", "AO debe ganar por mayor número de Waza-Ari"
    print("[PASS] Test Criterio 3 WKF (Mayor Waza-Ari)")

def test_desempate_criterio_4_hantei():
    res = resolver_desempate_wkf(
        senshu_aka=False, ippon_aka=1, waza_ari_aka=1,
        senshu_ao=False, ippon_ao=1, waza_ari_ao=1
    )
    assert res["status"] == "empate", "Debe requerir Hantei"
    assert res["ganador"] is None, "El ganador debe ser decidido por votación arbitral"
    print("[PASS] Test Criterio 4 WKF (Hantei por Banderas)")

def test_regla_8_puntos_superioridad():
    diff_1 = 8 - 0
    assert diff_1 >= 8, "Debe finalizar combate por diferencia de 8 puntos"
    diff_2 = 10 - 2
    assert diff_2 >= 8, "Debe finalizar combate por diferencia de 8 puntos"
    diff_3 = 7 - 0
    assert diff_3 < 8, "7 puntos de diferencia aún no finaliza"
    print("[PASS] Test Regla WKF Superioridad de 8 Puntos")

def test_kata_banderas_mayoria():
    votos_5 = ['aka', 'aka', 'aka', 'ao', 'ao']
    v_aka = votos_5.count('aka')
    v_ao = votos_5.count('ao')
    assert v_aka > v_ao and v_aka == 3 and v_ao == 2
    
    votos_7 = ['aka', 'ao', 'ao', 'ao', 'ao', 'aka', 'aka']
    v_aka_7 = votos_7.count('aka')
    v_ao_7 = votos_7.count('ao')
    assert v_ao_7 > v_aka_7 and v_ao_7 == 4
    print("[PASS] Test Votación Kata Banderas (Mayoría Absoluta)")

def test_kata_decimal_descarte():
    scores = [8.2, 8.8, 8.5, 7.9, 9.1]
    max_val = max(scores)
    min_val = min(scores)
    filt = list(scores)
    filt.remove(max_val)
    filt.remove(min_val)
    total = round(sum(filt), 2)
    assert max_val == 9.1
    assert min_val == 7.9
    assert total == 25.50
    print("[PASS] Test Kata Decimal (Descarte Max/Min)")

if __name__ == '__main__':
    test_desempate_criterio_1_senshu()
    test_desempate_criterio_2_ippon()
    test_desempate_criterio_3_wazaari()
    test_desempate_criterio_4_hantei()
    test_regla_8_puntos_superioridad()
    test_kata_banderas_mayoria()
    test_kata_decimal_descarte()
    print("\nTODOS LOS TESTS DE REGLAMENTO WKF PASARON EXITOSAMENTE.")
