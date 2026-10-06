"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Tv,
  Video,
  Scale,
  RefreshCw,
  Loader2,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import KarateWKFController from "@/components/torneo-admin/modulos/KarateWKFController";

const getApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://api.micancha.com.py";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
};
const API_URL = getApiUrl();

export default function ArbitrajeCombatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const torneoId = params.id;

  const urlTatami = searchParams?.get("tatami") || searchParams?.get("area") || "1";
  const [selectedTatami, setSelectedTatami] = useState<number>(Number(urlTatami) || 1);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [torneoInfo, setTorneoInfo] = useState<any | null>(null);

  // Lista de tatamis disponibles (1..6)
  const tatamis = [1, 2, 3, 4, 5, 6];

  // Cargar información del torneo y partidos
  const fetchData = useCallback(async () => {
    try {
      // 1. Torneo info
      try {
        const tRes = await fetch(`${API_URL}/cancha/torneos/${torneoId}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          setTorneoInfo(tData);
        }
      } catch {}

      // 2. Partidos
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPartidos(data);
        }
      }
    } catch (err) {
      console.error("Error loading tournament matches:", err);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actualizar el combate seleccionado cuando cambia el tatami o los partidos
  useEffect(() => {
    if (partidos.length === 0) {
      // Si aún no hay partidos creados en DB, proveer combate base para el tatami
      setSelectedMatch({
        id: `tatami-${selectedTatami}-combate`,
        torneo_id: torneoId,
        area: selectedTatami,
        estado: 'programado',
        fase: `Tatami ${selectedTatami} — Combate Oficial`,
        local_nombre: 'Competidor AKA (Rojo)',
        visitante_nombre: 'Competidor AO (Azul)',
        goles_local: 0,
        goles_visitante: 0,
        estadisticas: {
          tipo_reglamento: 'WKF',
          area: selectedTatami,
          local: { puntos: 0, yuko: 0, waza_ari: 0, ippon: 0, senshu: false, jogai: 0, penalizaciones: 0, video_review: 'ACTIVE' },
          visitante: { puntos: 0, yuko: 0, waza_ari: 0, ippon: 0, senshu: false, jogai: 0, penalizaciones: 0, video_review: 'ACTIVE' }
        }
      });
      return;
    }

    // Filtrar partidos asignados a este tatami
    const targetArea = String(selectedTatami);
    const matchTatami = partidos.find((p: any) => String(p.area) === targetArea && ['en_juego', 'en_curso', 'pausado'].includes(p.estado))
      || partidos.find((p: any) => String(p.area) === targetArea && p.estado === 'programado')
      || partidos.find((p: any) => String(p.area) === targetArea && p.estado === 'finalizado')
      || partidos.find((p: any) => String(p.area) === targetArea)
      || partidos[0];

    if (matchTatami) {
      // Asegurar estructura de área
      setSelectedMatch({ ...matchTatami, area: selectedTatami });
    }
  }, [partidos, selectedTatami, torneoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="animate-spin text-red-500" size={36} />
        <p className="text-sm font-bold tracking-wide">Cargando Mesa de Control Oficial WKF...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ─── BARRA SUPERIOR DE NAVEGACIÓN Y TATAMIS ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg z-20">
        
        {/* Izquierda: Volver y Torneo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin-torneo/${torneoId}`)}
            className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white"
            title="Volver a Administración del Torneo"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-red-500 tracking-wider">
              {torneoInfo?.nombre || "Torneo Oficial"}
            </span>
            <span className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Mesa de Control Oficial WKF</span>
              <span className="text-xs bg-red-600/30 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                Tatami {selectedTatami}
              </span>
            </span>
          </div>
        </div>

        {/* Centro: Selector de Tatamis Dinámico */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 px-2 uppercase hidden sm:inline">
            Tatami:
          </span>
          {tatamis.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTatami(t)}
              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                selectedTatami === t
                  ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>

        {/* Derecha: Estaciones Vinculadas del Tatami Activo */}
        <div className="flex items-center gap-2">
          {/* Selector de combate si hay varios en este tatami */}
          {partidos.filter((p: any) => String(p.area) === String(selectedTatami)).length > 1 && (
            <div className="relative">
              <select
                value={selectedMatch?.id || ""}
                onChange={(e) => {
                  const m = partidos.find((p: any) => p.id === e.target.value);
                  if (m) setSelectedMatch({ ...m, area: selectedTatami });
                }}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl appearance-none pr-8 cursor-pointer hover:bg-slate-700 transition"
              >
                {partidos
                  .filter((p: any) => String(p.area) === String(selectedTatami))
                  .map((p: any, idx: number) => (
                    <option key={p.id} value={p.id}>
                      Combate #{idx + 1} — {p.jugador_local_nombre || p.local_nombre || 'AKA'} vs {p.jugador_visitante_nombre || p.visitante_nombre || 'AO'}
                    </option>
                  ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Marcador Público TV */}
          <a
            href={`/torneos/${torneoId}/tatami/${selectedTatami}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition shadow-sm"
            title="Abrir Marcador Público para la pantalla de Tatami (TV / Monitor)"
          >
            <Tv size={14} />
            <span className="hidden md:inline">Marcador TV {selectedTatami}</span>
          </a>

          {/* Cámara de Tatami */}
          <a
            href={`/torneos/${torneoId}/tatami/${selectedTatami}/camara?matchId=${selectedMatch?.id || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-black transition shadow-sm"
            title="Abrir Cámara del Tatami (Celular / Webcam)"
          >
            <Video size={14} />
            <span className="hidden md:inline">Cámara {selectedTatami}</span>
          </a>

          {/* Tablet Juez VR */}
          <a
            href={`/torneos/${torneoId}/vr-station`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition shadow-sm"
            title="Abrir Tablet del Juez VR para deliberación"
          >
            <Scale size={14} />
            <span className="hidden md:inline">Juez VR</span>
          </a>

          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition"
            title="Refrescar datos"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ─── ARENA PRINCIPAL: KARATE WKF CONTROLLER (DISEÑO OFICIAL) ─── */}
      <div className="flex-1 flex flex-col justify-center p-2 sm:p-4 max-w-7xl mx-auto w-full">
        {selectedMatch ? (
          <KarateWKFController
            match={selectedMatch}
            onClose={() => router.push(`/admin-torneo/${torneoId}`)}
            onSaved={fetchData}
            onUpdate={fetchData}
          />
        ) : (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <AlertCircle size={40} className="text-amber-500" />
            <p className="font-bold">No se encontró combate asignado para este Tatami.</p>
          </div>
        )}
      </div>
    </div>
  );
}
