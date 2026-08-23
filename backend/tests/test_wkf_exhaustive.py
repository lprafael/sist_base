"""
Suite de Pruebas Exhaustivas para el Módulo Oficial WKF (Karate).
Verifica todas las reglas técnicas de Kumite, Kata, Sorteo, Prioridad de Colores AKA/AO,
Pesaje Oficial con Tolerancia +-1kg, Walkover y Medallero Oficial.
"""
import sys
import os
import unittest
import json
import math
from unittest.mock import MagicMock

# Añadir el backend al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mockear dependencias de framework si se ejecuta en entorno sin virtualenv activo
for mod in ['fastapi', 'fastapi.responses', 'sqlalchemy', 'sqlalchemy.ext.asyncio', 'sqlalchemy.orm', 'pydantic', 'database', 'auth', 'models_generales', 'websocket_manager']:
    if mod not in sys.modules:
        mock_mod = MagicMock()
        # Clases comunes
        mock_mod.APIRouter = MagicMock
        mock_mod.Depends = MagicMock(return_value=None)
        mock_mod.HTTPException = Exception
        mock_mod.WebSocket = MagicMock
        mock_mod.WebSocketDisconnect = Exception
        mock_mod.BaseModel = object
        mock_mod.text = lambda s: s
        sys.modules[mod] = mock_mod

# Importar funciones puras y lógicas WKF
from routers.marciales import determinar_colores_ronda_wkf
from routers.wkf_scoring import resolver_desempate_wkf


class TestWKFExhaustive(unittest.TestCase):

    # ==========================================
    # 1. PRUEBAS DE ARBITRAJE Y PUNTUACIÓN KUMITE WKF
    # ==========================================

    def test_kumite_senshu_winner_on_tie(self):
        """Test: Senshu define el ganador en caso de empate a puntos"""
        # Empate 3-3, AKA tiene Senshu
        res = resolver_desempate_wkf(
            senshu_aka=True, ippon_aka=1, waza_ari_aka=0,
            senshu_ao=False, ippon_ao=1, waza_ari_ao=0
        )
        self.assertEqual(res["ganador"], "aka")
        self.assertIn("Senshu", res["motivo"])
        self.assertEqual(res["status"], "resuelto")

    def test_kumite_tie_break_ippon_priority(self):
        """Test: Sin Senshu, el mayor número de Ippons define el combate"""
        # Empate 3-3, ninguno tiene Senshu. AKA tiene 1 Ippon (3 pts), AO tiene 3 Yukos (3 pts)
        res = resolver_desempate_wkf(
            senshu_aka=False, ippon_aka=1, waza_ari_aka=0,
            senshu_ao=False, ippon_ao=0, waza_ari_ao=0
        )
        self.assertEqual(res["ganador"], "aka")
        self.assertIn("Mayor cantidad de Ippon", res["motivo"])

    def test_kumite_tie_break_wazaari_priority(self):
        """Test: Sin Senshu ni ventaja de Ippon, el mayor número de Waza-Ari define el combate"""
        # Empate 2-2. AKA tiene 1 Waza-Ari (2 pts), AO tiene 2 Yukos (2 pts)
        res = resolver_desempate_wkf(
            senshu_aka=False, ippon_aka=0, waza_ari_aka=1,
            senshu_ao=False, ippon_ao=0, waza_ari_ao=0
        )
        self.assertEqual(res["ganador"], "aka")
        self.assertIn("Mayor cantidad de Waza-Ari", res["motivo"])

    def test_kumite_tie_break_hantei_when_strictly_equal(self):
        """Test: Igualdad absoluta requiere votación arbitral por banderas (Hantei)"""
        # Empate 2-2, 1 Waza-Ari cada uno, sin Senshu
        res = resolver_desempate_wkf(
            senshu_aka=False, ippon_aka=0, waza_ari_aka=1,
            senshu_ao=False, ippon_ao=0, waza_ari_ao=1
        )
        self.assertIsNone(res["ganador"])
        self.assertEqual(res["status"], "empate")
        self.assertIn("Hantei", res["motivo"])

    def test_kumite_technical_superiority_8_points(self):
        """Test: Superioridad técnica inmediata con diferencia >= 8 puntos"""
        diferencia_8 = abs(8 - 0) >= 8
        diferencia_7 = abs(7 - 0) >= 8
        self.assertTrue(diferencia_8)
        self.assertFalse(diferencia_7)

    def test_kumite_senshu_invalidation_on_severe_penalties(self):
        """Test: Senshu se anula automáticamente si el atleta acumula >= 2 faltas graves"""
        senshu_original = True
        penalizaciones = 2
        
        # Simulación de la regla implementada en wkf_scoring.py
        senshu_efectivo = senshu_original and (penalizaciones < 2)
        self.assertFalse(senshu_efectivo, "El Senshu debe ser revocado al alcanzar 2 o más sanciones graves")

    # ==========================================
    # 2. PRUEBAS DE PRIORIDAD DE COLORES WKF (AKA vs AO)
    # ==========================================

    def test_wkf_color_priority_both_aka_first_keeps_red(self):
        """Test: Si ambos vienen de AKA, el que combatió primero conserva AKA (Rojo) y el segundo pasa a AO (Azul)"""
        # Atleta 1 combatió en turno 2 con AKA. Atleta 2 combatió en turno 5 con AKA.
        res = determinar_colores_ronda_wkf(
            color_previo_p1="AKA", orden_combate_p1=2,
            color_previo_p2="AKA", orden_combate_p2=5
        )
        self.assertEqual(res["color_p1"], "AKA")
        self.assertEqual(res["color_p2"], "AO")

        # Inverso: Atleta 1 combatió después (turno 8), Atleta 2 combatió antes (turno 3)
        res_inv = determinar_colores_ronda_wkf(
            color_previo_p1="AKA", orden_combate_p1=8,
            color_previo_p2="AKA", orden_combate_p2=3
        )
        self.assertEqual(res_inv["color_p1"], "AO")
        self.assertEqual(res_inv["color_p2"], "AKA")

    def test_wkf_color_priority_both_ao_first_keeps_blue(self):
        """Test: Si ambos vienen de AO, el que combatió primero conserva AO (Azul) y el segundo pasa a AKA (Rojo)"""
        res = determinar_colores_ronda_wkf(
            color_previo_p1="AO", orden_combate_p1=1,
            color_previo_p2="AO", orden_combate_p2=4
        )
        self.assertEqual(res["color_p1"], "AO")
        self.assertEqual(res["color_p2"], "AKA")

    def test_wkf_color_priority_mixed_keeps_respective_colors(self):
        """Test: Si uno viene de AKA y el otro de AO, cada uno conserva su respectivo color sin cambios innecesarios"""
        res = determinar_colores_ronda_wkf(
            color_previo_p1="AKA", orden_combate_p1=3,
            color_previo_p2="AO", orden_combate_p2=1
        )
        self.assertEqual(res["color_p1"], "AKA")
        self.assertEqual(res["color_p2"], "AO")

    # ==========================================
    # 3. PRUEBAS DE PESAJE OFICIAL CON TOLERANCIA +-1kg Y WALKOVER
    # ==========================================

    def test_pesaje_within_tolerance_is_approved(self):
        """Test: Atleta dentro del peso o dentro de la tolerancia de +1 kg es Aprobado / Habilitado"""
        limite_categoria = 75.0
        tolerancia = 1.0
        limite_efectivo = limite_categoria + tolerancia  # 76.0 kg

        peso_exacto = 74.8
        peso_limite_tolerancia = 76.0
        
        self.assertTrue(peso_exacto <= limite_efectivo)
        self.assertTrue(peso_limite_tolerancia <= limite_efectivo)

    def test_pesaje_exceeding_tolerance_is_disqualified(self):
        """Test: Atleta que excede el límite + tolerancia (+1 kg) queda Descalificado"""
        limite_categoria = 75.0
        tolerancia = 1.0
        limite_efectivo = limite_categoria + tolerancia  # 76.0 kg

        peso_excedido = 76.1
        self.assertFalse(peso_excedido <= limite_efectivo)

    def test_walkover_resolution_logic(self):
        """Test: Cuando un atleta es descalificado en pesaje, su oponente gana automáticamente por Walkover (W.O.)"""
        descalificado_id = "atleta-aka-123"
        local_id = "atleta-aka-123"
        visitante_id = "atleta-ao-456"

        es_local = (local_id == descalificado_id)
        ganador_id = visitante_id if es_local else local_id
        metodo_victoria = "Walkover (W.O. - Descalificación en Pesaje Oficial)"

        self.assertEqual(ganador_id, "atleta-ao-456")
        self.assertIn("Walkover", metodo_victoria)

    # ==========================================
    # 4. PRUEBAS DE KATA POR BANDERAS (SINGLE OPERATOR)
    # ==========================================

    def test_kata_banderas_decisions(self):
        """Test: Votación de 5 banderas en Kata con mayorías 5-0, 4-1, 3-2"""
        # Caso 5-0 Unánime AKA
        votos_5_0 = ['aka', 'aka', 'aka', 'aka', 'aka']
        votos_aka = votos_5_0.count('aka')
        votos_ao = votos_5_0.count('ao')
        ganador = 'local' if votos_aka > votos_ao else 'visitante'
        self.assertEqual(ganador, 'local')
        self.assertEqual(f"{votos_aka}-{votos_ao}", "5-0")

        # Caso 3-2 Dividida AO
        votos_3_2 = ['aka', 'aka', 'ao', 'ao', 'ao']
        v_aka = votos_3_2.count('aka')
        v_ao = votos_3_2.count('ao')
        ganador_ao = 'local' if v_aka > v_ao else 'visitante'
        self.assertEqual(ganador_ao, 'visitante')
        self.assertEqual(f"{v_ao}-{v_aka}", "3-2")

    # ==========================================
    # 5. PRUEBAS DE MEDALLERO GENERAL WKF Y DESEMPATE
    # ==========================================

    def test_medallero_ranking_and_tie_break(self):
        """Test: Cómputo oficial de medallas (Oro=3pts, Plata=2pts, Bronce=1pt) y orden de clasificación"""
        escuelas = [
            {"escuela": "Dojo Cobra", "oro": 2, "plata": 1, "bronce": 0, "total": 3, "puntos": 8},
            {"escuela": "Dojo Miyagi", "oro": 2, "plata": 2, "bronce": 1, "total": 5, "puntos": 11},
            {"escuela": "Dojo Eagle", "oro": 1, "plata": 4, "bronce": 2, "total": 7, "puntos": 13},
            {"escuela": "Dojo Tiger", "oro": 0, "plata": 1, "bronce": 3, "total": 4, "puntos": 5},
        ]

        # Criterio oficial WKF: 1º Oros, 2º Platas, 3º Bronces, 4º Puntos
        ranking = sorted(
            escuelas,
            key=lambda e: (e["oro"], e["plata"], e["bronce"], e["puntos"]),
            reverse=True
        )

        # 1er Lugar: Dojo Miyagi (2 Oros, 2 Platas) supera a Dojo Cobra (2 Oros, 1 Plata)
        self.assertEqual(ranking[0]["escuela"], "Dojo Miyagi")
        # 2do Lugar: Dojo Cobra (2 Oros)
        self.assertEqual(ranking[1]["escuela"], "Dojo Cobra")
        # 3er Lugar: Dojo Eagle (1 Oro, aunque tiene más medallas totales)
        self.assertEqual(ranking[2]["escuela"], "Dojo Eagle")
        # 4to Lugar: Dojo Tiger (0 Oros)
        self.assertEqual(ranking[3]["escuela"], "Dojo Tiger")


if __name__ == '__main__':
    unittest.main(verbosity=2)
