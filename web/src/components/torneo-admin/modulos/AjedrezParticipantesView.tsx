"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Edit3, Check, X, AlertCircle, User, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const getToken = () => {
  try { const s = JSON.parse(localStorage.getItem('user_session') || '{}'); return s.access_token || s.token || ''; } catch { return ''; }
};
const authHdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

interface Participante {
  id: string;
  nombre: string;
  apellido: string;
  estado: string;
  rating_fide?: number;
  codigo_fide?: string;
  rating_nacional?: number;
  usuario_lichess?: string;
  usuario_chess_com?: string;
  categoria_base?: string;
  categoria_jugada?: string;
  institucion_id?: string;
  institucion_nombre?: string;
}

interface Institucion { id: string; nombre: string; tipo: string; }

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'ok' ? <Check size={18} /> : <AlertCircle size={18} />} {msg}
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

export default function AjedrezParticipantesView({ torneoId }: { torneoId: string }) {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Participante | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [historial, setHistorial] = useState<any[] | null>(null);
  const [historialNombre, setHistorialNombre] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);



  useEffect(() => { load(); }, [load]);

  const openEdit = (p: Participante) => {
    setEditing(p);
    setEditData({
      rating_fide: p.rating_fide || 0,
      codigo_fide: p.codigo_fide || '',
      rating_nacional: p.rating_nacional || 0,
      usuario_lichess: p.usuario_lichess || '',
      usuario_chess_com: p.usuario_chess_com || '',
      institucion_id: p.institucion_id || '',
      categoria_base: p.categoria_base || '',
      categoria_jugada: p.categoria_jugada || '',
    });
  };

  const saveRating = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/participantes/${editing.id}/rating`, {
        method: 'PATCH', headers: authHdrs(), body: JSON.stringify(editData),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      setToast({ msg: 'Datos actualizados', type: 'ok' }); setEditing(null); load();
    } catch (e: any) { setToast({ msg: e.message, type: 'err' }); }
    setSaving(false);
  };

  const loadHistorial = async (p: Participante) => {
    setHistorialNombre(`${p.nombre} ${p.apellido}`);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/participantes/${p.id}/historial`);
      if (r.ok) setHistorial(await r.json());
    } catch { setHistorial([]); }
  };

  const filtered = participantes.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-black text-slate-800">Participantes — Datos Ajedrez</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..."
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-amber-400 outline-none w-56" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={36} /></div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <User size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-bold">No hay participantes</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                {['Jugador','ELO FIDE','Cod. FIDE','ELO Nac.','Lichess','Chess.com','Institución','Categoría',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-black whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p, i) => (
                <tr key={p.id} className={`hover:bg-amber-50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">{p.nombre} {p.apellido}</td>
                  <td className="px-4 py-3 font-mono text-center text-slate-700">{p.rating_fide || '—'}</td>
                  <td className="px-4 py-3 font-mono text-center text-slate-500 text-xs">{p.codigo_fide || '—'}</td>
                  <td className="px-4 py-3 font-mono text-center text-slate-700">{p.rating_nacional || '—'}</td>
                  <td className="px-4 py-3 text-center text-blue-600 text-xs">{p.usuario_lichess || '—'}</td>
                  <td className="px-4 py-3 text-center text-green-700 text-xs">{p.usuario_chess_com || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.institucion_nombre || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {p.categoria_base && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{p.categoria_base}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} title="Editar datos ajedrez"
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition"><Edit3 size={14} /></button>
                      <button onClick={() => loadHistorial(p)} title="Ver historial"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"><Clock size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-6">Editar datos de ajedrez — {editing.nombre} {editing.apellido}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'rating_fide', label: 'Rating FIDE', type: 'number' },
                { key: 'codigo_fide', label: 'Código FIDE', type: 'text' },
                { key: 'rating_nacional', label: 'Rating Nacional', type: 'number' },
                { key: 'usuario_lichess', label: 'Usuario Lichess', type: 'text' },
                { key: 'usuario_chess_com', label: 'Chess.com', type: 'text' },
                { key: 'categoria_base', label: 'Categoría Base', type: 'text' },
                { key: 'categoria_jugada', label: 'Categoría Jugada', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{f.label}</label>
                  <input type={f.type} value={editData[f.key] || ''} onChange={e => setEditData({ ...editData, [f.key]: f.type === 'number' ? +e.target.value : e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none text-sm" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Institución</label>
                <select value={editData.institucion_id || ''} onChange={e => setEditData({ ...editData, institucion_id: e.target.value || null })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none text-sm">
                  <option value="">Sin institución</option>
                  {instituciones.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.tipo})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEditing(null)} className="px-5 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold">Cancelar</button>
              <button onClick={saveRating} disabled={saving} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial modal */}
      {historial !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">Historial — {historialNombre}</h3>
              <button onClick={() => setHistorial(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            {historial.length === 0
              ? <p className="text-slate-400 text-center py-8">Sin partidas registradas</p>
              : <table className="w-full text-sm">
                  <thead><tr className="bg-slate-100 text-slate-600 text-xs">
                    {['Torneo','Ronda','Color','Rival','Rating Rival','Resultado'].map(h => <th key={h} className="px-3 py-2 text-left font-black">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {historial.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 font-bold text-xs">{h.torneo_nombre}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{h.numero_ronda}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.color === 'Blancas' ? 'bg-amber-100 text-amber-800' : 'bg-slate-800 text-white'}`}>{h.color}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{h.rival_nombre}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-500 text-xs">{h.rival_rating || '—'}</td>
                        <td className="px-3 py-2 text-center font-black text-slate-800">{h.resultado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}
    </div>
  );
}
