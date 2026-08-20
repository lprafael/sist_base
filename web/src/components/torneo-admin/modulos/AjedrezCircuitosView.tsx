"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, RefreshCw, Trophy, Check, X, AlertCircle, Award } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const getToken = () => {
  try { const s = JSON.parse(localStorage.getItem('user_session') || '{}'); return s.access_token || s.token || ''; } catch { return ''; }
};
const authHdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

interface Circuito {
  id: string;
  nombre: string;
  anio: number;
  modalidad: string;
  estado: string;
  total_etapas: number;
  min_etapas_para_ranking: number;
  descripcion?: string;
}

interface RankingItem {
  nombre: string;
  apellido: string;
  rating_fide?: number;
  puntos_totales: number;
  etapas_jugadas: number;
  mejor_posicion?: number;
  categoria_base?: string;
  institucion_nombre?: string;
}

interface RankingInst {
  institucion: string;
  tipo: string;
  puntos_institucionales: number;
  total_participantes: number;
}

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'ok' ? <Check size={18} /> : <AlertCircle size={18} />} {msg}
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

export default function AjedrezCircuitosView({ torneoId, organizadorId }: { torneoId: string; organizadorId?: number }) {
  const [circuitos, setCircuitos] = useState<Circuito[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Circuito | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingInst, setRankingInst] = useState<RankingInst[]>([]);
  const [loadingRk, setLoadingRk] = useState(false);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [viewTab, setViewTab] = useState<'ranking' | 'institucional'>('ranking');
  const [crearModal, setCrearModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', anio: new Date().getFullYear(), modalidad: 'presencial', min_etapas_para_ranking: 1, descripcion: '' });
  const [saveBusy, setSaveBusy] = useState(false);
  const [vincBusy, setVincBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const loadRanking = async (circuito: Circuito) => {
    setSelected(circuito);
    setLoadingRk(true);
    try {
      const [rInd, rInst] = await Promise.all([
        fetch(`${API_URL}/api/ajedrez/circuitos/${circuito.id}/ranking`, { headers: authHdrs() }),
        fetch(`${API_URL}/api/ajedrez/circuitos/${circuito.id}/ranking-institucional`, { headers: authHdrs() })
      ]);
      if (rInd.ok) setRanking(await rInd.json());
      if (rInst.ok) setRankingInst(await rInst.json());
    } catch (e: any) {
      console.error(e);
    }
    setLoadingRk(false);
  };

  const loadCircuitos = useCallback(async () => {
    setLoading(true);
    try {
      const url = organizadorId
        ? `${API_URL}/api/ajedrez/circuitos?organizador_id=${organizadorId}`
        : `${API_URL}/api/ajedrez/circuitos`;
      const r = await fetch(url, { headers: authHdrs() });
      if (r.ok) {
        const data: Circuito[] = await r.json();
        setCircuitos(data);
        if (data.length > 0 && !selected) {
          loadRanking(data[0]);
        }
      }
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, [organizadorId]);

  useEffect(() => {
    loadCircuitos();
  }, [loadCircuitos]);

  const recalcular = async () => {
    if (!selected) return;
    setRecalcBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/circuitos/${selected.id}/recalcular-ranking`, { method: 'POST', headers: authHdrs() });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      setToast({ msg: 'Ranking recalculado', type: 'ok' }); loadRanking(selected);
    } catch (e: any) { setToast({ msg: e.message, type: 'err' }); }
    setRecalcBusy(false);
  };

  const crearCircuito = async () => {
    setSaveBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/circuitos`, {
        method: 'POST', headers: authHdrs(),
        body: JSON.stringify({ ...form, organizador_id: organizadorId }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      setToast({ msg: 'Circuito creado', type: 'ok' }); setCrearModal(false); loadCircuitos();
    } catch (e: any) { setToast({ msg: e.message, type: 'err' }); }
    setSaveBusy(false);
  };

  const vincularEtapa = async (circuitoId: string) => {
    setVincBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/circuitos/${circuitoId}/etapas`, {
        method: 'POST', headers: authHdrs(),
        body: JSON.stringify({ torneo_id: torneoId, numero_etapa: 1 }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error al vincular etapa');
      setToast({ msg: 'Torneo vinculado al circuito como etapa', type: 'ok' }); loadCircuitos();
    } catch (e: any) { setToast({ msg: e.message, type: 'err' }); }
    setVincBusy(false);
  };

  const M: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Panel izquierdo: lista de circuitos */}
      <div className="lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">Circuitos</h3>
          <button onClick={() => setCrearModal(true)} className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow">
            <Plus size={14} /> Nuevo
          </button>
        </div>
        {loading
          ? <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={30} /></div>
          : circuitos.length === 0
            ? <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <Trophy size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm font-bold">No hay circuitos creados</p>
              </div>
            : <div className="space-y-2">
                {circuitos.map(c => (
                  <div key={c.id} className={`rounded-xl border-2 p-4 cursor-pointer transition ${selected?.id === c.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'}`}
                    onClick={() => loadRanking(c)}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-sm">{c.nombre}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{c.anio}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{c.total_etapas} etapas · {c.estado}</p>
                    <button onClick={e => { e.stopPropagation(); vincularEtapa(c.id); }} disabled={vincBusy}
                      className="mt-2 text-xs text-amber-600 hover:underline font-bold disabled:opacity-50">
                      + Vincular este torneo como etapa
                    </button>
                  </div>
                ))}
              </div>}
      </div>

      {/* Panel derecho: ranking */}
      <div className="lg:col-span-2">
        {!selected
          ? <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center h-full flex flex-col items-center justify-center">
              <Award size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-400 font-bold">Selecciona un circuito para ver el ranking</p>
            </div>
          : <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selected.nombre} {selected.anio}</h3>
                  <p className="text-sm text-slate-500">{selected.total_etapas} etapas · min. {selected.min_etapas_para_ranking} para ranking</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={recalcular} disabled={recalcBusy}
                    className="flex items-center gap-2 border-2 border-amber-400 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg font-bold text-sm transition">
                    {recalcBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Recalcular
                  </button>
                </div>
              </div>
              <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
                {(['ranking','institucional'] as const).map(t => (
                  <button key={t} onClick={() => setViewTab(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${viewTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                    {t === 'ranking' ? 'Ranking Individual' : 'Ranking Institucional'}
                  </button>
                ))}
              </div>
              {loadingRk
                ? <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={30} /></div>
                : viewTab === 'ranking'
                  ? ranking.length === 0
                    ? <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center"><p className="text-slate-400 font-bold">Sin datos. Recalcula el ranking primero.</p></div>
                    : <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-slate-800 text-white text-xs">
                            {['#','Jugador','ELO','Puntos','Etapas','Mejor Pos.','Categoría','Institución'].map(h => <th key={h} className="px-3 py-3 text-left font-black">{h}</th>)}
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {ranking.map((r, i) => (
                              <tr key={i} className={`hover:bg-amber-50 ${i < 3 ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="px-3 py-3 font-black">{M[i+1] || i+1}</td>
                                <td className="px-3 py-3 font-black text-slate-800">{r.nombre} {r.apellido}</td>
                                <td className="px-3 py-3 font-mono text-slate-600 text-xs">{r.rating_fide || '—'}</td>
                                <td className="px-3 py-3 font-black text-amber-700 text-lg">{r.puntos_totales}</td>
                                <td className="px-3 py-3 text-center text-slate-600">{r.etapas_jugadas}</td>
                                <td className="px-3 py-3 text-center text-slate-600">{r.mejor_posicion || '—'}</td>
                                <td className="px-3 py-3">{r.categoria_base && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{r.categoria_base}</span>}</td>
                                <td className="px-3 py-3 text-xs text-slate-500">{r.institucion_nombre || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  : rankingInst.length === 0
                    ? <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center"><p className="text-slate-400 font-bold">Sin datos institucionales</p></div>
                    : <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-slate-800 text-white text-xs">
                            {['#','Institución','Tipo','Puntos','Participantes'].map(h => <th key={h} className="px-3 py-3 text-left font-black">{h}</th>)}
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {rankingInst.map((r, i) => (
                              <tr key={i} className={`hover:bg-amber-50 ${i < 3 ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="px-3 py-3 font-black">{M[i+1] || i+1}</td>
                                <td className="px-3 py-3 font-black text-slate-800">{r.institucion}</td>
                                <td className="px-3 py-3 text-xs"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{r.tipo}</span></td>
                                <td className="px-3 py-3 font-black text-amber-700 text-lg">{r.puntos_institucionales}</td>
                                <td className="px-3 py-3 text-center text-slate-600">{r.total_participantes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>}
            </>}
      </div>

      {/* Modal crear circuito */}
      {crearModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-6">Nuevo Circuito</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-bold text-slate-600 block mb-1">Nombre</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none" placeholder="Ej: Circuito Escolar 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-slate-600 block mb-1">Año</label>
                  <input type="number" value={form.anio} onChange={e => setForm({...form, anio: +e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none" /></div>
                <div><label className="text-sm font-bold text-slate-600 block mb-1">Min. etapas ranking</label>
                  <input type="number" value={form.min_etapas_para_ranking} onChange={e => setForm({...form, min_etapas_para_ranking: +e.target.value})} min={1}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none" /></div>
              </div>
              <div><label className="text-sm font-bold text-slate-600 block mb-1">Modalidad</label>
                <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="mixto">Mixto</option>
                </select></div>
              <div><label className="text-sm font-bold text-slate-600 block mb-1">Descripcion</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setCrearModal(false)} className="px-5 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold">Cancelar</button>
              <button onClick={crearCircuito} disabled={saveBusy || !form.nombre} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black flex items-center gap-2 disabled:opacity-50">
                {saveBusy && <Loader2 size={16} className="animate-spin" />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
