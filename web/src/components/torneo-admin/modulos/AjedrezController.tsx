"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Check, X,
  Shuffle, BarChart2, ListOrdered,
  RefreshCw, Zap, Flag, Crown, AlertCircle,
  PlayCircle, CheckCircle2, Edit3, Trash2, ArrowLeftRight, RotateCcw,
  ExternalLink, Globe, Sparkles
} from 'lucide-react';
import LichessBoardModal, { extraerLichessId } from './LichessBoardModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Ronda {
  id: string;
  numero_ronda: number;
  estado: 'pendiente' | 'en_curso' | 'finalizada';
  fecha_hora?: string;
  modo_emparejamiento: string;
  total_partidas?: number;
  partidas_finalizadas?: number;
}

interface Partida {
  id: string;
  tablero_numero?: number;
  blancas_nombre?: string;
  blancas_apellido?: string;
  blancas_rating?: number;
  negras_nombre?: string;
  negras_apellido?: string;
  negras_rating?: number;
  resultado?: string;
  estado: string;
  url_partida?: string;
  modalidad_partida?: string;
}

interface Posicion {
  posicion: number;
  participante_id: string;
  nombre: string;
  apellido: string;
  rating_fide?: number;
  codigo_fide?: string;
  categoria_base?: string;
  institucion_nombre?: string;
  puntos: number;
  partidas_jugadas: number;
  victorias: number;
  empates: number;
  derrotas: number;
  byes: number;
  bucholz_cut1: number;
  bucholz_total: number;
  sonneborn_berger: number;
}

const getToken = () => {
  try {
    const s = JSON.parse(localStorage.getItem('user_session') || '{}');
    return s.access_token || s.token || '';
  } catch { return ''; }
};

const authHdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const RES_LABEL: Record<string, { l: string; cls: string }> = {
  '1-0':     { l: '1 – 0',    cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  '0.5-0.5': { l: '½ – ½',   cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  '0-1':     { l: '0 – 1',   cls: 'bg-slate-200 text-slate-800 border-slate-400' },
  'BYE':     { l: 'BYE',     cls: 'bg-blue-100 text-blue-700 border-blue-300'  },
  'FF':      { l: 'Forfeit', cls: 'bg-red-100 text-red-700 border-red-300'    },
};

const ST: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'text-slate-400'   },
  en_curso:   { label: 'En curso',   color: 'text-amber-500'   },
  finalizada: { label: 'Finalizada', color: 'text-emerald-500' },
};

/* ─── Toast ─── */
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'ok' ? <Check size={18} /> : <AlertCircle size={18} />} {msg}
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

/* ─── Confirm Modal ─── */
function Confirm({
  title,
  body,
  onOk,
  onCancel,
  busy,
}: {
  title: string;
  body: string;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [internalBusy, setInternalBusy] = useState(false);

  const handleOk = async () => {
    setInternalBusy(true);
    try {
      await onOk();
      onCancel();
    } catch (err) {
      console.error(err);
      onCancel();
    } finally {
      setInternalBusy(false);
    }
  };

  const isSpinning = busy || internalBusy;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 mb-6 text-sm">{body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isSpinning}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleOk}
            disabled={isSpinning}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center gap-2 shadow transition disabled:opacity-50"
          >
            {isSpinning && <Loader2 size={16} className="animate-spin" />} Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Rondas ─── */
function TabRondas({ torneoId, rondas = [], loading, onRefresh, onSelect, activa, isPublic }: {
  torneoId: string; rondas?: Ronda[]; loading: boolean;
  onRefresh: () => void; onSelect: (r: Ronda) => void; activa?: Ronda | null; isPublic?: boolean;
}) {
  const listaRondas = Array.isArray(rondas) ? rondas : [];
  const [modal, setModal] = useState(false);
  const [num, setNum] = useState(1);
  const [fh, setFh] = useState('');
  const [modo, setModo] = useState('automatico');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [cfm, setCfm] = useState<{ title: string; body: string; fn: () => void } | null>(null);

  useEffect(() => {
    setNum(listaRondas.length + 1);
  }, [listaRondas.length]);

  const crear = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas`, {
        method: 'POST', headers: authHdrs(),
        body: JSON.stringify({ numero_ronda: num, fecha_hora: fh || null, modo_emparejamiento: modo }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: 'Error al crear la ronda' }));
        throw new Error(err.detail || 'Error');
      }
      setModal(false);
      setToast({ msg: 'Ronda creada', type: 'ok' });
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
  };

  const borrarRonda = async (rondaId: string, numero: number) => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas/${rondaId}`, {
        method: 'DELETE',
        headers: authHdrs(),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al eliminar la ronda');
      }
      setToast({ msg: `Ronda ${numero} eliminada correctamente`, type: 'ok' });
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
    setCfm(null);
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {cfm && <Confirm title={cfm.title} body={cfm.body} onOk={() => cfm.fn()} onCancel={() => setCfm(null)} busy={busy} />}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-800">Rondas del Torneo</h3>
        {!isPublic && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">
            <Plus size={16} /> Nueva Ronda
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={36} /></div>
      ) : listaRondas.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <div className="text-6xl mb-4">♟️</div>
          <p className="text-slate-500 font-bold">No hay rondas. Crea la primera para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listaRondas.map(r => {
            const st = ST[r.estado] || ST.pendiente;
            const pct = r.total_partidas ? Math.round(((r.partidas_finalizadas || 0) / r.total_partidas) * 100) : 0;
            const isA = activa?.id === r.id;
            return (
              <div key={r.id} className="flex items-center gap-2">
                <button onClick={() => onSelect(r)}
                  className={`flex-1 text-left flex items-center gap-5 p-5 rounded-2xl border-2 transition group ${isA ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${isA ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{r.numero_ronda}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-slate-800">Ronda {r.numero_ronda}</span>
                      <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                    </div>
                    {r.total_partidas ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs text-slate-500 font-bold">{r.partidas_finalizadas}/{r.total_partidas}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin emparejamiento</span>
                    )}
                  </div>
                  <span className="text-slate-300 group-hover:text-amber-400">›</span>
                </button>

                {!isPublic && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCfm({
                        title: `Eliminar Ronda ${r.numero_ronda}`,
                        body: `¿Estás seguro de eliminar la Ronda ${r.numero_ronda}? Se eliminarán todas sus partidas, emparejamientos y resultados cargados.`,
                        fn: () => borrarRonda(r.id, r.numero_ronda)
                      });
                    }}
                    className="p-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl border-2 border-slate-200 hover:border-red-200 transition shadow-sm"
                    title={`Eliminar Ronda ${r.numero_ronda}`}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-6">Nueva Ronda</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">Numero de ronda</label>
                <input type="number" value={num} onChange={e => setNum(+e.target.value)} min={1}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">Modo de emparejamiento</label>
                <select value={modo} onChange={e => setModo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none">
                  <option value="automatico">Automatico (Sistema Suizo)</option>
                  <option value="drag_drop">Drag and Drop</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-1">Fecha y hora (opcional)</label>
                <input type="datetime-local" value={fh} onChange={e => setFh(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:border-amber-400 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(false)} className="px-5 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold">Cancelar</button>
              <button onClick={crear} disabled={busy} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black flex items-center gap-2">
                {busy && <Loader2 size={16} className="animate-spin" />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Modal Emparejamiento Manual ─── */
interface ParManual {
  blancas_id: string;
  negras_id: string | null;
  tablero_numero: number;
}

function ModalEmparejamientoManual({
  torneoId,
  ronda,
  partidasActuales,
  onClose,
  onSave,
}: {
  torneoId: string;
  ronda: Ronda;
  partidasActuales: Partida[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pares, setPares] = useState<ParManual[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/participantes`);
        if (r.ok) {
          const list = await r.json();
          const pList = Array.isArray(list) ? list : [];
          setParticipantes(pList);

          if (partidasActuales.length > 0) {
            setPares(
              partidasActuales.map((p, idx) => ({
                blancas_id: p.blancas_id || '',
                negras_id: p.negras_id || null,
                tablero_numero: p.tablero_numero || idx + 1,
              }))
            );
          } else if (pList.length > 0) {
            const initial: ParManual[] = [];
            for (let i = 0; i < Math.ceil(pList.length / 2); i++) {
              initial.push({
                blancas_id: pList[i * 2]?.id || '',
                negras_id: pList[i * 2 + 1]?.id || null,
                tablero_numero: i + 1,
              });
            }
            setPares(initial);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchParts();
  }, [torneoId, ronda.id, partidasActuales]);

  const agregarFila = () => {
    setPares(prev => [
      ...prev,
      { blancas_id: '', negras_id: null, tablero_numero: prev.length + 1 },
    ]);
  };

  const eliminarFila = (index: number) => {
    setPares(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, tablero_numero: i + 1 })));
  };

  const invertirColores = (index: number) => {
    setPares(prev =>
      prev.map((p, i) => {
        if (i !== index) return p;
        return {
          ...p,
          blancas_id: p.negras_id || '',
          negras_id: p.blancas_id || null,
        };
      })
    );
  };

  const actualizarBlancas = (index: number, pid: string) => {
    setPares(prev => prev.map((p, i) => (i === index ? { ...p, blancas_id: pid } : p)));
  };

  const actualizarNegras = (index: number, pid: string) => {
    setPares(prev =>
      prev.map((p, i) => (i === index ? { ...p, negras_id: pid === 'BYE' || !pid ? null : pid } : p))
    );
  };

  const guardar = async () => {
    setErr(null);
    for (let i = 0; i < pares.length; i++) {
      if (!pares[i].blancas_id) {
        setErr(`El Tablero ${i + 1} debe tener al menos un jugador de Blancas seleccionado.`);
        return;
      }
    }

    const elegidos = new Set<string>();
    for (const p of pares) {
      if (p.blancas_id) {
        if (elegidos.has(p.blancas_id)) {
          setErr('Hay jugadores asignados más de una vez en distintos tableros. Verifica los pares.');
          return;
        }
        elegidos.add(p.blancas_id);
      }
      if (p.negras_id) {
        if (elegidos.has(p.negras_id)) {
          setErr('Hay jugadores asignados más de una vez en distintos tableros. Verifica los pares.');
          return;
        }
        elegidos.add(p.negras_id);
      }
    }

    setBusy(true);
    try {
      const payload = {
        partidas: pares.map((p, idx) => ({
          blancas_id: p.blancas_id,
          negras_id: p.negras_id,
          tablero_numero: idx + 1,
          modalidad_partida: 'presencial',
        })),
      };

      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas/${ronda.id}/emparejamiento`, {
        method: 'PUT',
        headers: authHdrs(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar emparejamiento manual');
      }
      onSave();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Edit3 size={18} className="text-amber-500" />
              Emparejamiento Manual — Ronda {ronda.numero_ronda}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Asigna los jugadores por tablero y define quién juega con Blancas, Negras o recibe BYE.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
            <X size={20} />
          </button>
        </div>

        {err && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {err}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : (
            <div className="space-y-3">
              {pares.map((par, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    T{idx + 1}
                  </div>

                  {/* Selector Blancas */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                      <span>♔ Blancas</span>
                    </label>
                    <select
                      value={par.blancas_id}
                      onChange={e => actualizarBlancas(idx, e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-amber-400 outline-none"
                    >
                      <option value="">-- Seleccionar Jugador --</option>
                      {participantes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellido} {p.rating_fide ? `(ELO ${p.rating_fide})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón Invertir Colores */}
                  <button
                    type="button"
                    onClick={() => invertirColores(idx)}
                    title="Invertir Blancas y Negras"
                    className="mt-4 p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
                  >
                    <ArrowLeftRight size={16} />
                  </button>

                  {/* Selector Negras */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                      <span>♚ Negras</span>
                    </label>
                    <select
                      value={par.negras_id || 'BYE'}
                      onChange={e => actualizarNegras(idx, e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-amber-400 outline-none"
                    >
                      <option value="BYE">⭐ BYE (Punto libre / Sin Rival)</option>
                      {participantes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellido} {p.rating_fide ? `(ELO ${p.rating_fide})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón Eliminar Tablero */}
                  <button
                    type="button"
                    onClick={() => eliminarFila(idx)}
                    title="Eliminar Tablero"
                    className="mt-4 p-2 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarFila}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-700 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Agregar Otro Tablero
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={busy || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow transition disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Guardar y Aplicar Emparejamiento
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Emparejamiento ─── */
function TabEmparejamiento({ torneoId, ronda, onRefresh, isPublic }: { torneoId: string; ronda: Ronda; onRefresh: () => void; isPublic?: boolean }) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalManual, setModalManual] = useState(false);
  const [lichessPartida, setLichessPartida] = useState<Partida | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [cfm, setCfm] = useState<{ title: string; body: string; fn: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/rondas/${ronda.id}/partidas`);
      if (r.ok) {
        const data = await r.json();
        setPartidas(Array.isArray(data) ? data : []);
      } else {
        setPartidas([]);
      }
    } catch {
      setPartidas([]);
    }
    setLoading(false);
  }, [ronda.id]);

  useEffect(() => { load(); }, [load]);

  const generar = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas/${ronda.id}/emparejar`, { method: 'POST', headers: authHdrs() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || 'Error');
      setToast({ msg: 'Emparejamiento generado (Sistema Suizo)', type: 'ok' });
      load();
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
  };

  const confirmar = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/rondas/${ronda.id}/confirmar`, { method: 'POST', headers: authHdrs() });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Error');
      }
      setToast({ msg: 'Ronda confirmada y publicada', type: 'ok' });
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
    setCfm(null);
  };

  const cambiarEstado = async (partidaId: string, nuevoEstado: string) => {
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/estado`, {
        method: 'PATCH',
        headers: authHdrs(),
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar estado');
      }
      setToast({ msg: `Partida marcada como ${nuevoEstado === 'en_curso' ? 'Iniciada' : nuevoEstado === 'pendiente' ? 'Programada' : 'Finalizada'}`, type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
  };

  const iniciarTodas = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/rondas/${ronda.id}/iniciar-partidas`, {
        method: 'POST',
        headers: authHdrs(),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error');
      }
      setToast({ msg: 'Todas las partidas pendientes han sido iniciadas', type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
  };

  const listaPartidas = Array.isArray(partidas) ? partidas : [];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {cfm && <Confirm title={cfm.title} body={cfm.body} onOk={() => cfm.fn()} onCancel={() => setCfm(null)} busy={busy} />}
      
      {modalManual && (
        <ModalEmparejamientoManual
          torneoId={torneoId}
          ronda={ronda}
          partidasActuales={listaPartidas}
          onClose={() => setModalManual(false)}
          onSave={() => {
            setToast({ msg: 'Emparejamiento manual guardado con éxito', type: 'ok' });
            load();
            onRefresh();
          }}
        />
      )}

      {lichessPartida && (
        <LichessBoardModal
          isOpen={Boolean(lichessPartida)}
          onClose={() => setLichessPartida(null)}
          gameUrlOrId={lichessPartida.url_partida || ''}
          partidaId={lichessPartida.id}
          blancasNombre={lichessPartida.blancas_nombre ? `${lichessPartida.blancas_nombre} ${lichessPartida.blancas_apellido || ''}` : 'Blancas'}
          negrasNombre={lichessPartida.negras_nombre ? `${lichessPartida.negras_nombre} ${lichessPartida.negras_apellido || ''}` : 'Negras'}
          tableroNumero={lichessPartida.tablero_numero}
          resultadoActual={lichessPartida.resultado}
          onResultadoSincronizado={() => {
            load();
            onRefresh();
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-800">Emparejamiento — Ronda {ronda.numero_ronda}</h3>
          <p className="text-slate-400 text-xs font-semibold">Modo: {ronda.modo_emparejamiento} · Estado: {ronda.estado}</p>
        </div>
        {!isPublic && (
          <div className="flex gap-2 flex-wrap">
            {ronda.estado !== 'finalizada' && (
              <>
                {listaPartidas.length > 0 && (
                  <button onClick={iniciarTodas} disabled={busy}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow"
                    title="Marcar todas las partidas pendientes como iniciadas">
                    <Zap size={14} /> Iniciar Todas
                  </button>
                )}
                <button onClick={() => setModalManual(true)} disabled={busy}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow"
                  title="Editar o armar los pares y tableros manualmente">
                  <Edit3 size={14} /> Emparejamiento Manual
                </button>
                <button onClick={generar} disabled={busy}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
                  {listaPartidas.length === 0 ? 'Generar Suizo' : 'Re-Emparejar'}
                </button>
                {ronda.estado === 'pendiente' && listaPartidas.length > 0 && (
                  <button onClick={() => setCfm({ title: 'Confirmar Ronda', body: 'Se publicara la ronda para comenzar a cargar resultados.', fn: confirmar })} disabled={busy}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">
                    <Check size={16} /> Confirmar Ronda
                  </button>
                )}
                <button
                  onClick={() => setCfm({
                    title: `Eliminar Ronda ${ronda.numero_ronda}`,
                    body: `¿Estás seguro de eliminar la Ronda ${ronda.numero_ronda}? Se eliminarán todas sus partidas, emparejamientos y resultados cargados.`,
                    fn: async () => {
                      await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas/${ronda.id}`, { method: 'DELETE', headers: authHdrs() });
                      onRefresh();
                    }
                  })}
                  disabled={busy}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold text-xs shadow-sm transition"
                  title="Eliminar esta ronda por completo"
                >
                  <Trash2 size={14} /> Eliminar Ronda
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={36} /></div>
      ) : listaPartidas.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <Shuffle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold mb-4">No hay partidas generadas para esta ronda</p>
          {!isPublic && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={generar} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow">
                Generar Emparejamiento Suizo
              </button>
              <button onClick={() => setModalManual(true)} disabled={busy} className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow">
                ✍️ Emparejar Manualmente
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                <th className="px-4 py-3 text-center w-12 font-black">Tab.</th>
                <th className="px-5 py-3 text-left font-black">Blancas</th>
                <th className="px-3 py-3 text-center font-black">ELO</th>
                <th className="px-4 py-3 text-center font-black">Res.</th>
                <th className="px-3 py-3 text-center font-black">ELO</th>
                <th className="px-5 py-3 text-right font-black">Negras</th>
                <th className="px-4 py-3 text-center font-black">Estado</th>
                <th className="px-4 py-3 text-center font-black">Tablero / Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listaPartidas.map((p, idx) => {
                const isFin = Boolean(p.resultado) || p.estado === 'finalizada' || p.estado === 'finalizado';
                const isLive = !isFin && (p.estado === 'en_curso' || p.estado === 'iniciado');
                const lichessId = extraerLichessId(p.url_partida);
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-3 text-center font-black text-slate-400">{p.tablero_numero ?? idx + 1}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">
                      <span className="inline-block w-3 h-3 rounded-full bg-slate-100 border border-slate-400 mr-2" />
                      {p.blancas_nombre ? `${p.blancas_nombre} ${p.blancas_apellido || ''}` : <span className="text-slate-400 italic">BYE</span>}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">{p.blancas_rating || '—'}</td>
                    <td className="px-4 py-3 text-center font-black">
                      {p.resultado ? (
                        <span className={`px-2.5 py-1 rounded-md text-xs border ${RES_LABEL[p.resultado]?.cls || 'bg-slate-100'}`}>{RES_LABEL[p.resultado]?.l || p.resultado}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">vs</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">{p.negras_rating || '—'}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">
                      {p.negras_nombre ? `${p.negras_nombre} ${p.negras_apellido || ''}` : <span className="text-slate-400 italic">BYE</span>}
                      <span className="inline-block w-3 h-3 rounded-full bg-slate-800 mr-0 ml-2" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                        isFin
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isLive
                          ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {isFin ? '● Finalizado' : isLive ? '🔴 En Juego' : '⏳ Programado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {lichessId && (
                          <button
                            onClick={() => setLichessPartida(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition shadow-sm"
                            title="Abrir visor interactivo de tablero Lichess"
                          >
                            <span>♟️</span> Tablero
                          </button>
                        )}

                        {!isPublic && !isFin && (
                          <button
                            onClick={() => cambiarEstado(p.id, isLive ? 'pendiente' : 'en_curso')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                              isLive
                                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                : 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                            }`}
                            title={isLive ? 'Poner en espera / programado' : 'Iniciar partida en vivo'}
                          >
                            {isLive ? '⏸ Pausar' : '▶ Iniciar'}
                          </button>
                        )}

                        {!isPublic && isFin && !ronda.estado.includes('finalizada') && (
                          <button
                            onClick={() => setCfm({
                              title: 'Reiniciar Partida',
                              body: `Se borrará el resultado del Tablero ${p.tablero_numero ?? idx + 1} y volverá a estar pendiente. Las posiciones se recalcularán automáticamente.`,
                              fn: async () => {
                                await fetch(`${API_URL}/api/ajedrez/partidas/${p.id}/reiniciar`, { method: 'POST', headers: authHdrs() });
                                setToast({ msg: 'Partida reiniciada', type: 'ok' });
                                load();
                              }
                            })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition"
                            title="Reiniciar y borrar resultado"
                          >
                            🔄 Reiniciar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Resultados ─── */
function TabResultados({ torneoId, ronda, onRefresh }: { torneoId: string; ronda: Ronda; onRefresh: () => void }) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finBusy, setFinBusy] = useState(false);
  const [lichessModalPartida, setLichessModalPartida] = useState<Partida | null>(null);
  const [syncingLichessId, setSyncingLichessId] = useState<string | null>(null);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [cfm, setCfm] = useState<{ title: string; body: string; fn: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/rondas/${ronda.id}/partidas`);
      if (r.ok) {
        const data = await r.json();
        setPartidas(Array.isArray(data) ? data : []);
      } else {
        setPartidas([]);
      }
    } catch {
      setPartidas([]);
    }
    setLoading(false);
  }, [ronda.id]);

  useEffect(() => { load(); }, [load]);

  const cambiarEstado = async (partidaId: string, nuevoEstado: string) => {
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/estado`, {
        method: 'PATCH',
        headers: authHdrs(),
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar estado');
      }
      setToast({ msg: `Estado actualizado a ${nuevoEstado === 'en_curso' ? 'Iniciado' : 'Programado'}`, type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
  };

  const reiniciar = async (id: string) => {
    setSavingId(id);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${id}/reiniciar`, {
        method: 'POST',
        headers: authHdrs(),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al reiniciar partida');
      }
      setToast({ msg: 'Partida reiniciada. Se han recalculado las posiciones.', type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setSavingId(null);
  };

  const iniciarTodas = async () => {
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/rondas/${ronda.id}/iniciar-partidas`, {
        method: 'POST',
        headers: authHdrs(),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error');
      }
      setToast({ msg: 'Todas las partidas pendientes han sido iniciadas', type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
  };

  const guardar = async (id: string, res: string) => {
    setSavingId(id);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${id}/resultado`, {
        method: 'PATCH', headers: authHdrs(), body: JSON.stringify({ resultado: res }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error');
      }
      setToast({ msg: 'Resultado guardado y partida finalizada', type: 'ok' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setSavingId(null);
  };

  const guardarUrlLichess = async (partidaId: string, url: string) => {
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${partidaId}/sincronizar-lichess`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify({ url_partida: url }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Error al conectar con Lichess');
      setToast({
        msg: d.resultado ? `Partida finalizada (${d.resultado}) y sincronizada` : 'Enlace de Lichess guardado',
        type: 'ok',
      });
      setEditingUrlId(null);
      setInputUrl('');
      load();
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
  };

  const autoSincronizarLichess = async (p: Partida) => {
    if (!p.url_partida) return;
    setSyncingLichessId(p.id);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/partidas/${p.id}/sincronizar-lichess`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify({ url_partida: p.url_partida }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Error');
      if (d.resultado) {
        setToast({ msg: `¡Resultado obtenido de Lichess: ${d.resultado}! Posiciones actualizadas.`, type: 'ok' });
      } else {
        setToast({ msg: d.mensaje || 'Partida aún en curso en Lichess.', type: 'ok' });
      }
      load();
      onRefresh();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    } finally {
      setSyncingLichessId(null);
    }
  };

  const finRonda = async () => {
    setFinBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas/${ronda.numero_ronda}/finalizar`, { method: 'POST', headers: authHdrs() });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error');
      }
      setToast({ msg: `Ronda ${ronda.numero_ronda} finalizada`, type: 'ok' });
      onRefresh();
      load();
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setFinBusy(false);
    setCfm(null);
  };

  const listaPartidas = Array.isArray(partidas) ? partidas : [];
  const completadas = listaPartidas.filter(p => p.resultado).length;
  const total = listaPartidas.length;
  const yaFin = ronda.estado === 'finalizada';

  const BTNS = [
    { r: '1-0',     l: '1 - 0',     c: 'bg-amber-400 hover:bg-amber-500 text-slate-900' },
    { r: '0.5-0.5', l: '1/2 - 1/2', c: 'bg-slate-200 hover:bg-slate-300 text-slate-800' },
    { r: '0-1',     l: '0 - 1',     c: 'bg-slate-700 hover:bg-slate-800 text-white' },
    { r: 'BYE',     l: 'BYE',       c: 'bg-blue-100 hover:bg-blue-200 text-blue-800' },
    { r: 'FF',      l: 'FF',        c: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {cfm && <Confirm title={cfm.title} body={cfm.body} onOk={() => cfm.fn()} onCancel={() => setCfm(null)} busy={finBusy} />}

      {lichessModalPartida && (
        <LichessBoardModal
          isOpen={Boolean(lichessModalPartida)}
          onClose={() => setLichessModalPartida(null)}
          gameUrlOrId={lichessModalPartida.url_partida || ''}
          partidaId={lichessModalPartida.id}
          blancasNombre={lichessModalPartida.blancas_nombre ? `${lichessModalPartida.blancas_nombre} ${lichessModalPartida.blancas_apellido || ''}` : 'Blancas'}
          negrasNombre={lichessModalPartida.negras_nombre ? `${lichessModalPartida.negras_nombre} ${lichessModalPartida.negras_apellido || ''}` : 'Negras'}
          tableroNumero={lichessModalPartida.tablero_numero}
          resultadoActual={lichessModalPartida.resultado}
          onResultadoSincronizado={() => {
            load();
            onRefresh();
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-800">Ronda {ronda.numero_ronda} — Resultados</h3>
          {total > 0 && (
            <div className="flex items-center gap-3 mt-1">
              <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${total > 0 ? (completadas / total) * 100 : 0}%` }} />
              </div>
              <span className="text-sm text-slate-500 font-bold">{completadas}/{total} finalizadas</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!yaFin && total > 0 && (
            <button onClick={iniciarTodas}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow">
              <Zap size={14} /> Iniciar Todas
            </button>
          )}
          {!yaFin && completadas === total && total > 0 && (
            <button onClick={() => setCfm({ title: 'Finalizar Ronda', body: 'Se cerrara la ronda y se calcularan las posiciones.', fn: finRonda })} disabled={finBusy}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-black text-sm shadow">
              {finBusy ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} Finalizar Ronda
            </button>
          )}
        </div>
        {yaFin && <span className="flex items-center gap-2 text-emerald-600 font-black text-sm"><CheckCircle2 size={18} /> Ronda Finalizada</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={36} /></div>
      ) : listaPartidas.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"><p className="text-slate-400 font-bold">Genera el emparejamiento primero</p></div>
      ) : (
        <div className="space-y-3">
          {listaPartidas.map((p, i) => {
            const isSv = savingId === p.id;
            const isFin = Boolean(p.resultado) || p.estado === 'finalizada' || p.estado === 'finalizado';
            const isLive = !isFin && (p.estado === 'en_curso' || p.estado === 'iniciado');
            const lichessId = extraerLichessId(p.url_partida);

            return (
              <div key={p.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${p.resultado ? 'border-emerald-200 shadow-sm' : isLive ? 'border-red-300 shadow-sm' : 'border-slate-200 hover:border-amber-200'}`}>
                <div className="flex items-center px-5 py-4 gap-4 flex-wrap sm:flex-nowrap">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-black text-sm flex items-center justify-center flex-shrink-0">{p.tablero_numero ?? i + 1}</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-lg">♔</span>
                    <span className="font-bold text-slate-800 truncate flex-1">{p.blancas_nombre ? `${p.blancas_nombre} ${p.blancas_apellido || ''}` : '—'}{p.blancas_rating ? ` (${p.blancas_rating})` : ''}</span>
                    <span className="text-slate-300 font-bold text-sm flex-shrink-0">vs</span>
                    <span className="font-bold text-slate-800 truncate flex-1 text-right">{p.negras_nombre ? `${p.negras_nombre} ${p.negras_apellido || ''}` : '—'}{p.negras_rating ? ` (${p.negras_rating})` : ''}</span>
                    <span className="text-lg">♚</span>
                  </div>
                  
                  {/* Badge de Estado */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black flex-shrink-0 ${
                    isFin
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isLive
                      ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}>
                    {isFin ? (p.resultado ? `Final: ${p.resultado}` : 'Finalizado') : isLive ? '🔴 En Juego' : '⏳ Programado'}
                  </span>

                  {/* Botón rápido de iniciar/pausar estado individual */}
                  {!yaFin && !isFin && (
                    <button
                      onClick={() => cambiarEstado(p.id, isLive ? 'pendiente' : 'en_curso')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 ${
                        isLive
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                      }`}
                    >
                      {isLive ? '⏸ Poner Programado' : '▶ Iniciar Partida'}
                    </button>
                  )}
                </div>

                {/* Barra de Integración Lichess */}
                <div className="border-t border-slate-100 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <span>♟️</span> Lichess:
                    </span>
                    {p.url_partida ? (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        <span className="font-mono text-indigo-700 font-bold">
                          {lichessId || p.url_partida}
                        </span>
                        <button
                          onClick={() => {
                            setEditingUrlId(p.id);
                            setInputUrl(p.url_partida || '');
                          }}
                          className="text-slate-400 hover:text-slate-600 ml-1"
                          title="Cambiar enlace de Lichess"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    ) : editingUrlId === p.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={inputUrl}
                          onChange={e => setInputUrl(e.target.value)}
                          placeholder="Pegar link de Lichess (ej: https://lichess.org/qa7x6Y4w)"
                          className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-amber-400 w-64 bg-white text-slate-800 font-mono"
                          autoFocus
                        />
                        <button
                          onClick={() => guardarUrlLichess(p.id, inputUrl)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditingUrlId(null);
                            setInputUrl('');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingUrlId(p.id);
                          setInputUrl('');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>+ Enlazar partida de Lichess</span>
                      </button>
                    )}
                  </div>

                  {p.url_partida && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLichessModalPartida(p)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-black rounded-lg transition flex items-center gap-1.5 shadow-sm"
                        title="Ver tablero embebido interactivo de Lichess"
                      >
                        <span>♟️</span> Ver Tablero
                      </button>
                      {!yaFin && (
                        <button
                          onClick={() => autoSincronizarLichess(p)}
                          disabled={syncingLichessId === p.id}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          title="Capturar resultado automático desde Lichess"
                        >
                          {syncingLichessId === p.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          Auto-completar desde Lichess
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!yaFin && !p.resultado && (
                  <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-2 items-center bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-bold mr-1">Cargar Resultado Manual:</span>
                    {BTNS.map(b => (
                      <button key={b.r} onClick={() => guardar(p.id, b.r)} disabled={isSv}
                        className={`px-4 py-1.5 rounded-lg font-black text-sm transition ${b.c} ${isSv ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isSv ? <Loader2 size={14} className="animate-spin" /> : b.l}
                      </button>
                    ))}
                  </div>
                )}

                {!yaFin && p.resultado && (
                  <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-3 items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 font-bold">Cambiar resultado:</span>
                      {BTNS.map(b => (
                        <button
                          key={b.r}
                          onClick={() => guardar(p.id, b.r)}
                          disabled={isSv}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                            b.r === p.resultado
                              ? 'ring-2 ring-emerald-500 ring-offset-1 shadow-sm ' + b.c
                              : 'opacity-60 hover:opacity-100 ' + b.c
                          }`}
                        >
                          {b.l}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCfm({
                        title: 'Reiniciar Partida',
                        body: `Se borrará el resultado del Tablero ${p.tablero_numero ?? i + 1} y volverá a estado pendiente. Las posiciones del torneo se recalcularán automáticamente.`,
                        fn: () => reiniciar(p.id)
                      })}
                      disabled={isSv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                      title="Borrar resultado y reiniciar la partida"
                    >
                      <RotateCcw size={13} /> Reiniciar Partida
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Tab Posiciones ─── */
function TabPosiciones({ torneoId, rondas = [], finalizable, isPublic }: { torneoId: string; rondas?: Ronda[]; finalizable: boolean; isPublic?: boolean }) {
  const listaRondas = Array.isArray(rondas) ? rondas : [];
  const [pos, setPos] = useState<Posicion[]>([]);
  const [loading, setLoading] = useState(false);
  const [rv, setRv] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [cfm, setCfm] = useState(false);

  const load = useCallback(async (r: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/posiciones?ronda=${r}`);
      if (res.ok) {
        const data = await res.json();
        setPos(Array.isArray(data) ? data : []);
      } else {
        setPos([]);
      }
    } catch {
      setPos([]);
    }
    setLoading(false);
  }, [torneoId]);

  useEffect(() => { load(rv); }, [load, rv]);

  const finTorneo = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/finalizar`, { method: 'POST', headers: authHdrs() });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || 'Error');
      }
      setToast({ msg: 'Torneo finalizado. Posiciones definitivas guardadas.', type: 'ok' });
      load(0);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'err' });
    }
    setBusy(false);
    setCfm(false);
  };

  const listaPos = Array.isArray(pos) ? pos : [];
  const M: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {cfm && <Confirm title="Finalizar Torneo" body="Se calcularan las posiciones definitivas. Esta accion es irreversible." onOk={finTorneo} onCancel={() => setCfm(false)} busy={busy} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-black text-slate-800">Tabla de Posiciones</h3>
        <div className="flex items-center gap-3">
          <select value={rv} onChange={e => setRv(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-amber-400 outline-none">
            <option value={0}>Ultima calculada</option>
            {listaRondas.filter(r => r.estado !== 'pendiente').map(r => <option key={r.numero_ronda} value={r.numero_ronda}>Despues de Ronda {r.numero_ronda}</option>)}
          </select>
          {!isPublic && finalizable && (
            <button onClick={() => setCfm(true)} disabled={busy} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-black text-sm shadow">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />} Finalizar Torneo
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={36} /></div>
      ) : listaPos.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <BarChart2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-400 font-bold">Las posiciones se calculan al finalizar cada ronda</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                {['#','Jugador','ELO','PTS','PJ','V','E','D','BY','BC1','BT','SB'].map((h,i) => (
                  <th key={h} className={`px-4 py-3 font-black ${i === 0 ? 'text-left' : i === 1 ? 'text-left' : 'text-center'} ${h === 'PTS' ? 'bg-amber-600' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listaPos.map((p, idx) => (
                <tr key={p.participante_id} className={`hover:bg-amber-50 transition ${p.posicion <= 3 ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-black text-slate-700">{M[p.posicion] || p.posicion}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">{p.nombre} {p.apellido}</p>
                    <div className="flex gap-2 flex-wrap mt-0.5">
                      {p.categoria_base && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{p.categoria_base}</span>}
                      {p.institucion_nombre && <span className="text-xs text-slate-400 font-bold">{p.institucion_nombre}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{p.rating_fide || '—'}</td>
                  <td className="px-4 py-3 text-center font-black text-xl text-amber-700">{p.puntos}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600">{p.partidas_jugadas}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600">{p.victorias}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-500">{p.empates}</td>
                  <td className="px-4 py-3 text-center font-bold text-red-500">{p.derrotas}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-500">{p.byes}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{Number(p.bucholz_cut1).toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{Number(p.bucholz_total).toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{Number(p.sonneborn_berger).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex flex-wrap gap-3 text-xs text-slate-500">
            <span><strong className="text-amber-600">PTS</strong> Puntos</span>
            <span><strong>PJ</strong> Partidas Jugadas</span>
            <span><strong className="text-amber-500">BC1</strong> Bucholz Cut-1</span>
            <span><strong className="text-amber-400">BT</strong> Bucholz Total</span>
            <span><strong className="text-purple-600">SB</strong> Sonneborn-Berger</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN EXPORT ─── */
export default function AjedrezController({ torneoId, torneo, isPublic = false }: { torneoId: string; torneo?: any; isPublic?: boolean }) {
  const [tab, setTab] = useState<'rondas' | 'emparejamiento' | 'resultados' | 'posiciones'>('rondas');
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [loadingR, setLoadingR] = useState(true);
  const [rondaSel, setRondaSel] = useState<Ronda | null>(null);

  const fetchRondas = useCallback(async () => {
    setLoadingR(true);
    try {
      const r = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/rondas`);
      if (r.ok) {
        const data = await r.json();
        const arr: Ronda[] = Array.isArray(data) ? data : [];
        setRondas(arr);
        if (rondaSel) {
          const u = arr.find(x => x.id === rondaSel.id);
          if (u) {
            setRondaSel(u);
          } else {
            setRondaSel(null);
            setTab('rondas');
          }
        }
      } else {
        setRondas([]);
        setRondaSel(null);
      }
    } catch {
      setRondas([]);
    }
    setLoadingR(false);
  }, [torneoId, rondaSel?.id]);

  useEffect(() => { fetchRondas(); }, [torneoId]);

  const listaRondas = Array.isArray(rondas) ? rondas : [];
  const seleccionar = (r: Ronda) => { setRondaSel(r); setTab('emparejamiento'); };
  const finalizable = listaRondas.length > 0 && listaRondas.every(r => r.estado === 'finalizada');

  const TABS = isPublic ? [
    { id: 'rondas',         label: 'Rondas',               icon: <ListOrdered size={16} />, off: false         },
    { id: 'emparejamiento', label: 'Partidas y Resultados',icon: <Shuffle size={16} />,     off: !rondaSel     },
    { id: 'posiciones',     label: 'Tabla de Posiciones',  icon: <BarChart2 size={16} />,   off: false         },
  ] : [
    { id: 'rondas',         label: 'Rondas',         icon: <ListOrdered size={16} />, off: false         },
    { id: 'emparejamiento', label: 'Emparejamiento', icon: <Shuffle size={16} />,     off: !rondaSel     },
    { id: 'resultados',     label: 'Resultados',     icon: <Zap size={16} />,         off: !rondaSel     },
    { id: 'posiciones',     label: 'Posiciones',     icon: <BarChart2 size={16} />,   off: false         },
  ];

  return (
    <div className="min-h-96">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 p-8" style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-conic-gradient(#fff 0% 25%,transparent 0% 50%)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2"><span className="text-4xl">♟️</span><h2 className="text-2xl font-black text-white">Torneo de Ajedrez</h2></div>
            <p className="text-slate-400 text-sm">Sistema Suizo · Desempates: Bucholz · Sonneborn-Berger</p>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-2xl font-black text-white">{listaRondas.length}</p><p className="text-xs text-slate-400 font-bold">Rondas</p></div>
            <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-2xl font-black text-amber-400">{listaRondas.filter(r => r.estado === 'finalizada').length}</p><p className="text-xs text-slate-400 font-bold">Finalizadas</p></div>
          </div>
        </div>
      </div>

      {rondaSel && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-600 font-bold text-sm">Ronda activa:</span>
          <span className="bg-amber-500 text-white font-black text-sm px-3 py-0.5 rounded-full">Ronda {rondaSel.numero_ronda}</span>
          <span className={`text-xs font-bold ${ST[rondaSel.estado]?.color}`}>{ST[rondaSel.estado]?.label}</span>
          <button onClick={() => { setRondaSel(null); setTab('rondas'); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 font-bold">Cambiar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => !t.off && setTab(t.id as any)} disabled={t.off}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition
              ${tab === t.id ? 'bg-slate-800 text-white shadow-sm' : ''}
              ${tab !== t.id && !t.off ? 'text-slate-600 hover:bg-slate-100' : ''}
              ${t.off ? 'text-slate-300 cursor-not-allowed' : ''}`}>
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {tab === 'rondas'         && <TabRondas torneoId={torneoId} rondas={listaRondas} loading={loadingR} onRefresh={fetchRondas} onSelect={seleccionar} activa={rondaSel} isPublic={isPublic} />}
        {tab === 'emparejamiento' && rondaSel && <TabEmparejamiento torneoId={torneoId} ronda={rondaSel} onRefresh={fetchRondas} isPublic={isPublic} />}
        {!isPublic && tab === 'resultados' && rondaSel && <TabResultados torneoId={torneoId} ronda={rondaSel} onRefresh={fetchRondas} />}
        {tab === 'posiciones'     && <TabPosiciones torneoId={torneoId} rondas={listaRondas} finalizable={finalizable} isPublic={isPublic} />}
        {(tab === 'emparejamiento' || tab === 'resultados') && !rondaSel && (
          <div className="text-center py-16">
            <Shuffle size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Selecciona una ronda desde la pestana "Rondas"</p>
            <button onClick={() => setTab('rondas')} className="mt-4 text-amber-600 font-black hover:underline text-sm">Ir a Rondas</button>
          </div>
        )}
      </div>
    </div>
  );
}

