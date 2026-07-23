"use client";
import React, { useState } from 'react';
import { X, Zap, Users, Trophy, RotateCcw, ChevronDown, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface GenerarPartidosModalProps {
  torneoId: string;
  torneo?: any;
  faseActual?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GenerarPartidosModal({
  torneoId, torneo, faseActual, onClose, onSuccess
}: GenerarPartidosModalProps) {
  const fases = (torneo?.configuracion?.fases || []).map((f: any) =>
    typeof f === 'object' ? f : { name: f, type: 'Todos contra Todos' }
  );

  const fasesNames = fases.length > 0
    ? fases.map((f: any) => f.name)
    : ['Fase 1'];

  const [fase, setFase] = useState(faseActual || fasesNames[0] || 'Fase 1');
  const [tipo, setTipo] = useState<'todos_contra_todos' | 'eliminatoria_simple' | 'eliminatoria_doble'>('todos_contra_todos');
  const [idaVuelta, setIdaVuelta] = useState(false);
  const [clasificadosPorGrupo, setClasificadosPorGrupo] = useState(2);
  const [numGrupos, setNumGrupos] = useState(1);
  const [seedFromFase, setSeedFromFase] = useState('');
  const [limpiarFase, setLimpiarFase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('user_session') || '{}');
      return s.access_token || s.token || '';
    } catch { return ''; }
  };

  const handleGenerar = async () => {
    if (!fase.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/generar-partidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          fase,
          tipo,
          ida_vuelta: idaVuelta,
          clasificados_por_grupo: clasificadosPorGrupo,
          num_grupos: numGrupos,
          seed_from_fase: seedFromFase || null,
          limpiar_fase: limpiarFase,
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setResult({ ok: true, message: data.message });
        onSuccess();
      } else {
        setResult({ ok: false, message: data.detail || data.message || 'Error al generar partidos.' });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e.message || 'Error de conexión.' });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-[#191942] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-yellow-400" />
            <span className="font-bold text-lg">Generar Partidos Automáticamente</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Fase selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Fase a generar
            </label>
            <div className="relative">
              <select
                value={fase}
                onChange={e => setFase(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white appearance-none outline-none focus:border-indigo-500 transition pr-10"
              >
                {fasesNames.map((f: string) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Tipo de fase */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Formato de la fase
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { val: 'todos_contra_todos', icon: <Users size={16} />, label: 'Todos contra Todos (Grupos)', desc: 'Round-robin: cada equipo juega contra todos los demás' },
                { val: 'eliminatoria_simple', icon: <Trophy size={16} />, label: 'Eliminatoria (Solo Ida)', desc: 'Llaves de eliminación directa, 1 partido por cruce' },
                { val: 'eliminatoria_doble', icon: <RotateCcw size={16} />, label: 'Eliminatoria (Ida y Vuelta)', desc: 'Llaves de eliminación directa, 2 partidos por cruce' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setTipo(opt.val as any)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${
                    tipo === opt.val
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-slate-50 hover:border-indigo-200'
                  }`}
                >
                  <div className={`mt-0.5 ${tipo === opt.val ? 'text-indigo-600' : 'text-slate-400'}`}>{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${tipo === opt.val ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    tipo === opt.val ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'
                  }`}>
                    {tipo === opt.val && <Check size={10} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Opciones específicas de Todos Contra Todos */}
          {tipo === 'todos_contra_todos' && (
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
              <div>
                <div className="font-semibold text-sm text-slate-700">Ida y Vuelta</div>
                <div className="text-xs text-slate-500">Genera partidos de local y visitante entre cada par</div>
              </div>
              <div
                onClick={() => setIdaVuelta(!idaVuelta)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${idaVuelta ? 'bg-indigo-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${idaVuelta ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
              </div>
            </label>
          )}

          {/* Opciones específicas de Eliminatoria */}
          {(tipo === 'eliminatoria_simple' || tipo === 'eliminatoria_doble') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sembrar clasificados desde fase anterior
                </label>
                <div className="relative">
                  <select
                    value={seedFromFase}
                    onChange={e => setSeedFromFase(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white appearance-none outline-none focus:border-indigo-500 transition pr-10"
                  >
                    <option value="">— Usar todos los equipos del torneo —</option>
                    {fasesNames.filter((f: string) => f !== fase).map((f: string) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {seedFromFase && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Clasificados por grupo</label>
                    <input
                      type="number"
                      min={1} max={8}
                      value={clasificadosPorGrupo}
                      onChange={e => setClasificadosPorGrupo(parseInt(e.target.value) || 2)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Número de grupos</label>
                    <input
                      type="number"
                      min={1} max={16}
                      value={numGrupos}
                      onChange={e => setNumGrupos(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Limpiar fase */}
          <label className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 cursor-pointer hover:bg-red-100 transition">
            <div>
              <div className="font-semibold text-sm text-red-700">Reemplazar partidos existentes</div>
              <div className="text-xs text-red-500">Eliminará todos los partidos actuales de esta fase antes de generar</div>
            </div>
            <div
              onClick={() => setLimpiarFase(!limpiarFase)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${limpiarFase ? 'bg-red-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${limpiarFase ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>

          {/* Result message */}
          {result && (
            <div className={`p-3 rounded-xl text-sm font-semibold border ${
              result.ok
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result.ok ? '✅ ' : '❌ '}{result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="flex-1 bg-[#191942] hover:bg-indigo-900 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <><span className="animate-spin">⚙️</span> Generando...</>
            ) : (
              <><Zap size={16} className="text-yellow-400" /> GENERAR PARTIDOS</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
