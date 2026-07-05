'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Users, Calendar, Plus, Save, X, ChevronRight,
  ShieldCheck, Award, Clock, UserCheck, Swords, Star,
  AlertTriangle, CheckCircle, Target, Minus, BarChart2, ScanFace, Edit2, Camera,
  Copy, FileSpreadsheet, Download, Loader2, Banknote, Newspaper
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Tournament {
  id: string; nombre: string; descripcion: string; deporte: string;
  formato: string; fecha_inicio: string; estado: string;
  max_equipos: number; costo_inscripcion: number;
  pts_victoria?: number; pts_empate?: number; pts_derrota?: number;
  equipos_confirmados?: number;
}

interface Equipo { id: string; nombre: string; logo_url?: string; color_principal?: string; foto_equipo_url?: string; token_jugadores?: string; }
interface Jugador {
  id: string; nombre: string; dni: string; numero_camiseta?: number;
  posicion?: string; estado: string; amarillas_acum: number; rojas_acum: number; partidos_jugados: number;
  fecha_nacimiento?: string; egreso_ano?: number; es_exalumno?: boolean;
}
interface Gol { id: string; jugador_nombre?: string; equipo_nombre: string; minuto?: number; tipo: string; anulado: boolean; }
interface Tarjeta { id: string; jugador_nombre: string; equipo_nombre: string; minuto?: number; tipo: string; pts_fair_play: number; genera_suspension: boolean; }
interface Posicion { posicion: number; nombre: string; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number; pts: number; pts_fair_play_neg: number; color_principal?: string; }
interface Goleador { player_id: string; nombre: string; equipo_nombre: string; goles: number; penales: number; autogoles: number; foto_url?: string; numero_camiseta?: number; }

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────
export default function TournamentManagement({ complejoId }: { complejoId: string }) {
  const [tipoTorneo, setTipoTorneo] = useState<'futbol' | 'general'>('futbol');
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTorneo, setSelectedTorneo] = useState<Tournament | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<any>(null);

  // ── Estado para Clonar Torneo
  const [clonarModal, setClonarModal] = useState<{ open: boolean; eventoId: string; nombreOrigen: string }>(
    { open: false, eventoId: '', nombreOrigen: '' }
  );
  const [clonarForm, setClonarForm] = useState({ nuevo_nombre: '', incluir_equipos: false });
  const [clonarLoading, setClonarLoading] = useState(false);
  const [clonarMsg, setClonarMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Estado para Exportar XLSX
  const [xlsxLoading, setXlsxLoading] = useState<string | null>(null); // stores eventoId being downloaded

  const handleClonarTorneo = async () => {
    if (!clonarModal.eventoId) return;
    setClonarLoading(true);
    setClonarMsg(null);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${clonarModal.eventoId}/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevo_nombre: clonarForm.nuevo_nombre || undefined,
          incluir_equipos: clonarForm.incluir_equipos,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setClonarMsg({ type: 'ok', text: `✅ ${data.message}` });
        loadEventos();
        setTimeout(() => { setClonarModal({ open: false, eventoId: '', nombreOrigen: '' }); setClonarMsg(null); }, 2200);
      } else {
        setClonarMsg({ type: 'err', text: `❌ ${data.detail || 'Error al clonar'}` });
      }
    } catch {
      setClonarMsg({ type: 'err', text: '❌ Error de conexión con el servidor.' });
    } finally {
      setClonarLoading(false);
    }
  };

  const handleExportarXLSX = async (eventoId: string, eventoNombre: string) => {
    setXlsxLoading(eventoId);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${eventoId}/exportar/xlsx`);
      if (!res.ok) { alert('Error al generar el archivo Excel'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Torneo_${eventoNombre.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Error de conexión al exportar'); }
    finally { setXlsxLoading(null); }
  };

  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', deporte: 'Fútbol 5',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    reglas: [''] as string[],
    premios: [{ rank: '1er Puesto', reward: '' }] as {rank: string, reward: string}[],
    categorias: [
      { id: Date.now(), nombre: 'Categoría Libre', formato: 'liga', max_equipos: 16, costo_inscripcion: 0, pts_victoria: 3, pts_empate: 1, pts_derrota: 0, configuracion: { a_dos_vueltas: false, tipo_sorteo_playoffs: 'random', rondas_suizo: 4 } }
    ]
  });

  const loadEventos = async () => {
    setLoading(true);
    try {
      if (tipoTorneo === 'futbol') {
        const res = await fetch(`${API_URL}/cancha/torneos/eventos?complejo_id=${complejoId}`);
        if (res.ok) setEventos(await res.json());
      } else {
        const res = await fetch(`${API_URL}/cancha/torneos_generales/`);
        if (res.ok) setEventos(await res.json());
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (complejoId) loadEventos(); }, [complejoId, tipoTorneo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        complejo_id: complejoId,
        fecha_fin: formData.fecha_fin || null,
        categorias: formData.categorias.map(c => ({
            nombre: c.nombre, formato: c.formato, max_equipos: c.max_equipos,
            costo_inscripcion: c.costo_inscripcion, pts_victoria: c.pts_victoria,
            pts_empate: c.pts_empate, pts_derrota: c.pts_derrota, configuracion: c.configuracion
        }))
      };
      const res = await fetch(`${API_URL}/cancha/torneos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false); loadEventos();
        setFormData({ nombre: '', descripcion: '', deporte: 'Fútbol 5',
          fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '', reglas: [], premios: [],
          categorias: [{ id: Date.now(), nombre: 'Categoría Libre', formato: 'liga', max_equipos: 16, costo_inscripcion: 0, pts_victoria: 3, pts_empate: 1, pts_derrota: 0, configuracion: { a_dos_vueltas: false, tipo_sorteo_playoffs: 'random', rondas_suizo: 4 } }]
        });
      }
    } catch (e) { console.error(e); }
  };

  if (selectedTorneo) {
    return <TournamentDetails torneo={selectedTorneo} onBack={() => { setSelectedTorneo(null); }} />;
  }

  if (selectedEvento && !selectedTorneo) {
    return (
      <div className="p-6 h-full overflow-y-auto">
        <button onClick={() => setSelectedEvento(null)} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"><ChevronRight className="rotate-180" size={16}/> Volver a Eventos</button>
        <div className="mb-10">
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">{selectedEvento.nombre}</h2>
            <p className="text-slate-400">{selectedEvento.descripcion || 'Sin descripción'}</p>
            <div className="flex items-center gap-4 mt-4">
                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold"><Calendar size={14} className="inline mr-1"/> {new Date(selectedEvento.fecha_inicio).toLocaleDateString()}</span>
                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase">{selectedEvento.estado}</span>
            </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-6">Categorías del Evento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {selectedEvento.categorias?.map((c: any) => (
             <div key={c.id} className="bg-slate-900/60 border border-slate-800/80 rounded-[2rem] p-6 hover:border-green-500/30 transition-all group flex flex-col justify-between h-[250px]">
                <div>
                    <h4 className="text-2xl font-black text-white group-hover:text-green-400 transition-colors">{c.categoria}</h4>
                    <p className="text-slate-400 text-sm mt-3 uppercase tracking-wider font-bold">Mod: {c.formato}</p>
                </div>
                <button onClick={() => setSelectedTorneo({...c, deporte: 'Fútbol 5', max_equipos: 16, costo_inscripcion: 0, estado: selectedEvento.estado, fecha_inicio: selectedEvento.fecha_inicio, nombre: `${selectedEvento.nombre} - ${c.categoria}`})} className="w-full py-4 bg-slate-800 hover:bg-green-500 hover:text-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all duration-300">
                   Administrar Categoría <ChevronRight size={18} />
                </button>
             </div>
          ))}
          {(!selectedEvento.categorias || selectedEvento.categorias.length === 0) && (
              <div className="col-span-full py-12 text-center text-slate-500 font-bold">No hay categorías configuradas para este evento.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTipoTorneo('futbol')}
          className={`px-6 py-2 rounded-full font-bold transition-all ${tipoTorneo === 'futbol' ? 'bg-green-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        >
          Torneos de Fútbol
        </button>
        <button
          onClick={() => setTipoTorneo('general')}
          className={`px-6 py-2 rounded-full font-bold transition-all ${tipoTorneo === 'general' ? 'bg-green-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        >
          Torneos Generales
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={14} /> Complejo Autorizado
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Trophy className="text-yellow-500 w-10 h-10" /> Gestión de Torneos
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Crea y administra torneos, equipos, jugadores y resultados en tiempo real.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-400 text-black font-extrabold py-4 px-8 rounded-2xl flex items-center gap-2 transition-all hover:scale-[1.02]">
          <Plus size={20} className="stroke-[3]" /> Crear Torneo
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando eventos...</div>
      ) : eventos.length === 0 ? (
        <div className="py-24 bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] text-center max-w-xl mx-auto">
          <Trophy className="text-slate-600 w-8 h-8 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white mb-2">Sin competencias activas</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">Comienza creando tu primer torneo oficial.</p>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 font-extrabold py-3.5 px-8 rounded-xl border border-green-500/20 transition-all">Crear Evento</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {eventos.map(e => (
            <div key={e.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-[2rem] p-8 hover:border-green-500/30 transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{e.estado}</span>
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">{e.categorias?.length || 0} Categorías</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-green-400 transition-colors line-clamp-1">{e.nombre}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">{e.descripcion || 'Sin descripción'}</p>
                <div className="space-y-3 mb-4 border-t border-slate-800/60 pt-4">
                  <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                    <Calendar size={16} className="text-green-400" /> Inicia: {new Date(e.fecha_inicio).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {/* Acciones secundarias: Clonar + Exportar */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setClonarModal({ open: true, eventoId: e.id, nombreOrigen: e.nombre });
                    setClonarForm({ nuevo_nombre: `${e.nombre} [COPIA]`, incluir_equipos: false });
                    setClonarMsg(null);
                  }}
                  title="Clonar este torneo para nueva temporada"
                  className="flex-1 py-2.5 bg-slate-800/70 hover:bg-blue-500/20 hover:border-blue-500/40 text-slate-400 hover:text-blue-400 border border-slate-700/50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Copy size={13} /> Clonar
                </button>
                <button
                  onClick={() => handleExportarXLSX(e.id, e.nombre)}
                  disabled={xlsxLoading === e.id}
                  title="Exportar a Excel (.xlsx)"
                  className="flex-1 py-2.5 bg-slate-800/70 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 border border-slate-700/50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {xlsxLoading === e.id
                    ? <><Loader2 size={13} className="animate-spin" /> Generando...</>
                    : <><FileSpreadsheet size={13} /> Excel</>}
                </button>
              </div>
              <button onClick={() => setSelectedEvento(e)}
                className="w-full py-4 bg-slate-800 hover:bg-green-500 hover:text-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all duration-300">
                Ver Categorías <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-start justify-center p-4 pt-20 md:pt-24 overflow-y-auto">
          <button onClick={() => setIsModalOpen(false)} className="fixed top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-white bg-slate-900/80 p-3 rounded-full backdrop-blur border border-slate-800 z-[80] shadow-xl transition-colors">
            <X size={24} />
          </button>
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-lg rounded-[2.5rem] p-8 relative mb-12 mt-4 md:mt-0 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20"><Trophy size={28} /></div>
              <h2 className="text-3xl font-black text-white tracking-tight">Nuevo Torneo Oficial</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre del Torneo</label>
                <input type="text" required placeholder="Ej. Torneo Apertura Fútbol 5"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                <textarea placeholder="Bases del torneo, premios, horarios..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm h-24 resize-none"
                  value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Deporte</label>
                  <select className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.deporte} onChange={e => setFormData({...formData, deporte: e.target.value})}>
                    <option>Fútbol 5</option><option>Fútbol 7</option><option>Fútbol 11</option><option>Pádel</option><option>Vóley</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Inicio</label>
                  <input type="date" required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 border-t border-slate-800 pt-6 space-y-6">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold uppercase tracking-wider text-green-400">Categorías del Evento</label>
                    <button type="button" onClick={() => setFormData({...formData, categorias: [...formData.categorias, { id: Date.now(), nombre: '', formato: 'liga', max_equipos: 16, costo_inscripcion: 0, pts_victoria: 3, pts_empate: 1, pts_derrota: 0, configuracion: { a_dos_vueltas: false, tipo_sorteo_playoffs: 'random', rondas_suizo: 4 } }]})} className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg font-bold">+ Agregar Categoría</button>
                </div>
                {formData.categorias.map((cat, cIdx) => (
                    <div key={cat.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4 relative">
                        {formData.categorias.length > 1 && (
                            <button type="button" onClick={() => setFormData({...formData, categorias: formData.categorias.filter(c => c.id !== cat.id)})} className="absolute top-4 right-4 text-slate-500 hover:text-red-500"><X size={18}/></button>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre (Ej. Senior)</label>
                                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm" value={cat.nombre} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].nombre = e.target.value; setFormData({...formData, categorias: nc})}} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Modalidad</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm" value={cat.formato} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].formato = e.target.value; setFormData({...formData, categorias: nc})}}>
                                    <option value="liga">Acumulación de Puntos (Liga)</option>
                                    <option value="eliminatoria">Eliminación Directa (Playoffs)</option>
                                    <option value="mixta">Mixta (Grupos + Playoffs)</option>
                                    <option value="suizo">Sistema Suizo</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Max Eq.</label>
                                <input type="number" required min={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" value={cat.max_equipos} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].max_equipos = parseInt(e.target.value)||16; setFormData({...formData, categorias: nc})}} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Costo Gs.</label>
                                <input type="number" min={0} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" value={cat.costo_inscripcion} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].costo_inscripcion = parseFloat(e.target.value)||0; setFormData({...formData, categorias: nc})}} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Pts (V-E-D)</label>
                                <div className="flex gap-1">
                                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-md px-1 py-2 text-white text-xs text-center" value={cat.pts_victoria} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].pts_victoria = parseInt(e.target.value)||0; setFormData({...formData, categorias: nc})}} />
                                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-md px-1 py-2 text-white text-xs text-center" value={cat.pts_empate} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].pts_empate = parseInt(e.target.value)||0; setFormData({...formData, categorias: nc})}} />
                                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-md px-1 py-2 text-white text-xs text-center" value={cat.pts_derrota} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].pts_derrota = parseInt(e.target.value)||0; setFormData({...formData, categorias: nc})}} />
                                </div>
                            </div>
                        </div>
                        {cat.formato === 'liga' && (
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                                <input type="checkbox" checked={cat.configuracion.a_dos_vueltas} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].configuracion.a_dos_vueltas = e.target.checked; setFormData({...formData, categorias: nc})}} />
                                Jugar a dos vueltas (Ida y Vuelta)
                            </label>
                        )}
                        {cat.formato === 'suizo' && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-300">Total de Rondas:</label>
                                <input type="number" min={1} className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-white text-xs w-16" value={cat.configuracion.rondas_suizo} onChange={e => { const nc = [...formData.categorias]; nc[cIdx].configuracion.rondas_suizo = parseInt(e.target.value)||4; setFormData({...formData, categorias: nc})}} />
                            </div>
                        )}
                    </div>
                ))}
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Reglas del Torneo</label>
                {formData.reglas.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm" placeholder={`Regla ${i+1}`} value={r} onChange={e => { const newReglas = [...formData.reglas]; newReglas[i] = e.target.value; setFormData({...formData, reglas: newReglas}); }} />
                    <button type="button" onClick={() => { const newReglas = formData.reglas.filter((_, idx) => idx !== i); setFormData({...formData, reglas: newReglas}); }} className="px-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({...formData, reglas: [...formData.reglas, '']})} className="text-xs text-green-400 font-bold hover:underline">+ Añadir Regla</button>
              </div>
              <div className="space-y-4 mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Premios</label>
                {formData.premios.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" className="w-1/3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm" placeholder="Puesto (ej. 1er)" value={p.rank} onChange={e => { const newPremios = [...formData.premios]; newPremios[i].rank = e.target.value; setFormData({...formData, premios: newPremios}); }} />
                    <input type="text" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm" placeholder="Premio (ej. Trofeo + $50)" value={p.reward} onChange={e => { const newPremios = [...formData.premios]; newPremios[i].reward = e.target.value; setFormData({...formData, premios: newPremios}); }} />
                    <button type="button" onClick={() => { const newPremios = formData.premios.filter((_, idx) => idx !== i); setFormData({...formData, premios: newPremios}); }} className="px-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({...formData, premios: [...formData.premios, {rank: '', reward: ''}]})} className="text-xs text-green-400 font-bold hover:underline">+ Añadir Premio</button>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all uppercase">
                  <Save size={20} className="stroke-[3]" /> Crear y Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE CLONAR TORNEO ── */}
      {clonarModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-blue-500/30 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                <Copy size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Clonar Torneo</h2>
                <p className="text-xs text-slate-400 mt-0.5">Nueva temporada desde <span className="text-blue-400 font-bold">{clonarModal.nombreOrigen}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Nombre del nuevo torneo
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 font-semibold text-sm transition-colors"
                  value={clonarForm.nuevo_nombre}
                  onChange={e => setClonarForm({ ...clonarForm, nuevo_nombre: e.target.value })}
                  placeholder="Ej. Torneo Clausura 2026"
                />
              </div>

              <label className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-4 cursor-pointer hover:border-blue-500/30 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-500"
                  checked={clonarForm.incluir_equipos}
                  onChange={e => setClonarForm({ ...clonarForm, incluir_equipos: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-white">Incluir equipos del torneo original</span>
                  <p className="text-xs text-slate-400 mt-0.5">Se copian los equipos sin jugadores ni historial de pagos</p>
                </div>
              </label>

              {clonarMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${clonarMsg.type === 'ok' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {clonarMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setClonarModal({ open: false, eventoId: '', nombreOrigen: '' })}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClonarTorneo}
                  disabled={clonarLoading}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {clonarLoading ? <><Loader2 size={16} className="animate-spin" /> Clonando...</> : <><Copy size={16} /> Clonar Torneo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────
// DETALLE DEL TORNEO (tabs)
// ─────────────────────────────────────────
// ─────────────────────────────────────────
type ActiveTab = 'equipos' | 'jugadores' | 'fixture' | 'acta' | 'posiciones' | 'goleadores' | 'finanzas' | 'noticias';

function TournamentDetails({ torneo, onBack }: { torneo: Tournament; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('equipos');
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [selectedPartido, setSelectedPartido] = useState<any>(null);
  const [isAddingEquipo, setIsAddingEquipo] = useState(false);
  const [newEquipo, setNewEquipo] = useState({ nombre: '', capitan: '', telefono: '', promocion: '' });
  
  // Finanzas states
  const [selectedEquipoFinanzas, setSelectedEquipoFinanzas] = useState<string>('');
  const [finanzasData, setFinanzasData] = useState<any>(null);

  // Noticias states
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loadingNoticias, setLoadingNoticias] = useState(false);
  const [contextoIA, setContextoIA] = useState('');
  const [cargoConcepto, setCargoConcepto] = useState('');
  const [cargoMonto, setCargoMonto] = useState('');

  // States for Payment Management
  const [isPayingCash, setIsPayingCash] = useState(false);
  const [paymentTeam, setPaymentTeam] = useState<any>(null);
  const [cashReceiver, setCashReceiver] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handlePayCashClick = (team: any) => {
    setPaymentTeam(team);
    setCashReceiver('');
    setIsPayingCash(true);
  };

  const handleGenerateLinkClick = async (team: any, provider: 'mercadopago' | 'stripe') => {
    setPaymentTeam(team);
    setIsGeneratingLink(true);
    setGeneratedLink('');
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/api/pagos/inscripcion/${team.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          setGeneratedLink(data.checkout_url);
        } else {
          alert('No se pudo obtener la URL de pago.');
        }
      } else {
        const err = await res.json();
        alert(err.detail || 'Error al generar link de pago.');
      }
    } catch (e) {
      alert('Error de red al generar link de pago.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleConfirmCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTeam) return;
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/api/pagos/manual/${paymentTeam.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tournament_team_id: paymentTeam.id,
          amount: torneo.costo_inscripcion,
          received_by: cashReceiver || 'Administrador',
          notes: 'Pago en efectivo registrado por administrador'
        })
      });
      if (res.ok) {
        alert('Pago en efectivo registrado con éxito. El equipo ha sido confirmado.');
        setIsPayingCash(false);
        setPaymentTeam(null);
        loadEquipos();
      } else {
        const err = await res.json();
        alert(err.detail || 'Error al registrar pago en efectivo.');
      }
    } catch (e) {
      alert('Error de red al registrar pago.');
    }
  };

  const loadFinanzas = async (equipoId: string) => {
    if (!equipoId) {
      setFinanzasData(null);
      return;
    }
    const res = await fetch(`${API_URL}/cancha/torneos/equipos/${equipoId}/cuenta_corriente`);
    if (res.ok) {
      setFinanzasData(await res.json());
    }
  };

  useEffect(() => {
    if (activeTab === 'finanzas' && selectedEquipoFinanzas) {
      loadFinanzas(selectedEquipoFinanzas);
    }
  }, [activeTab, selectedEquipoFinanzas]);

  const handleAddCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipoFinanzas || !cargoConcepto || !cargoMonto) return;
    const res = await fetch(`${API_URL}/cancha/torneos/equipos/${selectedEquipoFinanzas}/cuenta_corriente/cargos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        torneo_id: torneo.id,
        concepto: cargoConcepto,
        monto: parseFloat(cargoMonto)
      })
    });
    if (res.ok) {
      setCargoConcepto('');
      setCargoMonto('');
      loadFinanzas(selectedEquipoFinanzas);
    }
  };

  const handlePagarCargo = async (cargoId: string) => {
    if (!confirm('¿Marcar este cargo como pagado?')) return;
    const res = await fetch(`${API_URL}/cancha/torneos/equipos/${selectedEquipoFinanzas}/cuenta_corriente/${cargoId}/pagar`, {
      method: 'POST'
    });
    if (res.ok) {
      loadFinanzas(selectedEquipoFinanzas);
    }
  };

  const loadNoticias = async () => {
    setLoadingNoticias(true);
    try {
      const res = await fetch(`${API_URL}/api/noticias/torneo/${torneo.id}`);
      if (res.ok) setNoticias(await res.json());
    } finally {
      setLoadingNoticias(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'noticias') {
      loadNoticias();
    }
  }, [activeTab]);

  const handleGenerarIA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextoIA) return;
    const res = await fetch(`${API_URL}/api/noticias/generar-ia`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torneo_id: torneo.id, contexto: contextoIA })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      // Publicar noticia mock
      const pubRes = await fetch(`${API_URL}/api/noticias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneo_id: torneo.id, titulo: data.titulo, contenido: data.contenido, autor: 'Gemini IA', es_ia: true, prompt_usado: contextoIA })
      });
      if (pubRes.ok) {
        setContextoIA('');
        loadNoticias();
      }
    }
  };

  const handleDeleteNoticia = async (id: string) => {
    if (!confirm('¿Eliminar noticia?')) return;
    const res = await fetch(`${API_URL}/api/noticias/${id}`, { method: 'DELETE' });
    if (res.ok) loadNoticias();
  };

  const loadEquipos = async () => {
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos`);
    if (res.ok) setEquipos(await res.json());
  };
  const loadPartidos = async () => {
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/partidos`);
    if (res.ok) setPartidos(await res.json());
  };
  const loadPosiciones = async () => {
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/posiciones`);
    if (res.ok) setPosiciones(await res.json());
  };
  const loadGoleadores = async () => {
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/goleadores`);
    if (res.ok) setGoleadores(await res.json());
  };

  useEffect(() => {
    loadEquipos(); loadPartidos(); loadPosiciones(); loadGoleadores();
  }, [torneo.id]);

  const handleAddEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: newEquipo.nombre,
        capitan_nombre: newEquipo.capitan,
        capitan_telefono: newEquipo.telefono,
        promocion: newEquipo.promocion ? parseInt(newEquipo.promocion) : 0
      })
    });
    if (res.ok) { setIsAddingEquipo(false); setNewEquipo({ nombre: '', capitan: '', telefono: '', promocion: '' }); loadEquipos(); }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>, equipoId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${equipoId}/logo`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        loadEquipos();
      } else {
        alert("Error subiendo el logo");
      }
    } catch (err) {
      alert("Error subiendo el logo");
    }
  };

  const handleUploadFotoEquipo = async (e: React.ChangeEvent<HTMLInputElement>, equipoId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${equipoId}/foto`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        loadEquipos();
      } else {
        alert("Error subiendo la foto del equipo");
      }
    } catch (err) {
      alert("Error subiendo la foto del equipo");
    }
  };

  const generarFixture = async () => {
    if (!confirm('¿Generar fixture automático? Se eliminarán los partidos existentes.')) return;
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/fixture`, { method: 'POST' });
    if (res.ok) { alert('¡Fixture generado!'); loadPartidos(); loadPosiciones(); }
    else { const d = await res.json(); alert('Error: ' + (d.detail || 'No se pudo generar')); }
  };

  const generarSiguienteRondaSuizo = async () => {
    if (!confirm('¿Generar la siguiente ronda del Sistema Suizo?')) return;
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/fixture/suizo/siguiente`, { method: 'POST' });
    if (res.ok) { alert('¡Siguiente ronda generada!'); loadPartidos(); loadPosiciones(); }
    else { const d = await res.json(); alert('Error: ' + (d.detail || 'No se pudo generar')); }
  };

  const updateResultado = async (partidoId: string, gl: number, gv: number) => {
    await fetch(`${API_URL}/cancha/torneos/partidos/${partidoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goles_local: gl, goles_visitante: gv, estado: 'finalizado' })
    });
    loadPartidos(); loadPosiciones();
  };

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'equipos',     label: 'Equipos',    icon: <Users size={14} /> },
    { key: 'jugadores',   label: 'Jugadores',  icon: <UserCheck size={14} /> },
    { key: 'fixture',     label: 'Fixture',    icon: <Calendar size={14} /> },
    { key: 'acta',        label: 'Acta en Vivo', icon: <Swords size={14} /> },
    { key: 'posiciones',  label: 'Posiciones', icon: <BarChart2 size={14} /> },
    { key: 'goleadores',  label: 'Goleadores', icon: <Star size={14} /> },
    { key: 'finanzas',    label: 'Finanzas',   icon: <Banknote size={14} /> },
    { key: 'noticias',    label: 'Noticias IA', icon: <Newspaper size={14} /> },
  ];

  return (
    <div className="space-y-8 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl hover:border-slate-700 transition-all"><X size={20} /></button>
        <div>
          <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {torneo.deporte} • {torneo.formato}
          </span>
          <h2 className="text-3xl font-black text-white mt-2 tracking-tight">{torneo.nombre}</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800/80 pb-px overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-4 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key ? 'border-green-500 text-green-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: EQUIPOS */}
      {activeTab === 'equipos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><Users size={20} className="text-green-400" /> Equipos ({equipos.length}/{torneo.max_equipos})</h3>
            <button onClick={() => setIsAddingEquipo(true)} disabled={equipos.length >= torneo.max_equipos}
              className="bg-green-500 hover:bg-green-400 text-black font-extrabold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-40">
              <Plus size={16} className="stroke-[3]" /> Agregar Equipo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {equipos.length === 0 ? (
              <div className="col-span-full py-16 bg-slate-900/20 border border-slate-800/60 rounded-[2rem] text-center text-slate-500 font-bold text-xs uppercase tracking-widest">Sin equipos inscritos.</div>
            ) : equipos.map((e, idx) => (
              <div key={e.id} style={{ borderColor: e.color_principal ? `${e.color_principal}40` : undefined }}
                className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl flex flex-col gap-4 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 cursor-pointer overflow-hidden relative group/logo"
                    title="Subir Logo (Click)"
                    style={{ background: e.color_principal ? `${e.color_principal}20` : 'rgba(34,197,94,0.1)', color: e.color_principal || '#4ade80' }}
                    onClick={() => document.getElementById(`logo-upload-${e.id}`)?.click()}>
                    {e.logo_url ? <img src={`${API_URL.replace('/api', '')}${e.logo_url}`} alt={e.nombre} className="w-full h-full object-cover" /> : idx + 1}
                    <div className="absolute inset-0 bg-black/60 items-center justify-center hidden group-hover/logo:flex">
                      <Plus size={16} className="text-white" />
                    </div>
                    <input type="file" id={`logo-upload-${e.id}`} accept="image/*" className="hidden" onChange={(evt) => handleUploadLogo(evt, e.id)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-white truncate">{e.nombre}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {e.capitan_nombre || 'Sin capitán'}
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border flex-shrink-0 ${
                    e.estado_inscripcion === 'confirmado'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                    {e.estado_inscripcion}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 w-full mt-2 border-t border-slate-800/40 pt-4">
                  <div className="flex justify-between items-center bg-slate-950/50 rounded-xl p-3 border border-slate-800/40 cursor-pointer hover:border-slate-700 transition-all group/foto"
                       onClick={() => document.getElementById(`foto-upload-${e.id}`)?.click()}>
                     <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Foto del Equipo</span>
                     {e.foto_equipo_url ? 
                        <span className="text-xs text-green-400 font-bold">Subida ✓</span> : 
                        <span className="text-xs text-slate-500 font-bold group-hover/foto:text-white">Subir Imagen +</span>}
                     <input type="file" id={`foto-upload-${e.id}`} accept="image/*" className="hidden" onChange={(evt) => handleUploadFotoEquipo(evt, e.id)} />
                  </div>

                  {e.token_jugadores && (
                    <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/20 flex flex-col gap-1.5">
                      <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Enlace de Registro de Jugadores</span>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${window.location.origin}/jugadores/registro/${e.token_jugadores}`} className="bg-transparent text-xs text-slate-300 w-full outline-none" />
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/jugadores/registro/${e.token_jugadores}`); alert("Enlace copiado!"); }} className="text-blue-400 hover:text-white transition-colors">Copiar</button>
                      </div>
                    </div>
                  )}
                </div>
                
                {torneo.costo_inscripcion > 0 && e.estado_inscripcion === 'pendiente' && (
                  <div className="border-t border-slate-800/40 pt-4 flex flex-wrap gap-2 justify-end w-full">
                    <button onClick={() => handlePayCashClick(e)}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1">
                      💵 Efectivo
                    </button>
                    <button onClick={() => handleGenerateLinkClick(e, 'mercadopago')}
                      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1">
                      🔗 Link MP
                    </button>
                    <button onClick={() => handleGenerateLinkClick(e, 'stripe')}
                      className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1">
                      💳 Stripe
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: JUGADORES */}
      {activeTab === 'jugadores' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <UserCheck size={20} className="text-green-400" /> Plantel por Equipo
            </h3>
            <a 
              href="http://localhost:3000/jugadores/test-facial" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg"
            >
              <ScanFace size={16} /> Test de Reconocimiento
            </a>
          </div>
          {equipos.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-bold text-xs uppercase">Primero agrega equipos.</div>
          ) : (
            <div className="space-y-6">
              {equipos.map(eq => (
                <EquipoJugadoresPanel key={eq.id} torneo={torneo} equipo={eq} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FIXTURE */}
      {activeTab === 'fixture' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><Calendar size={20} className="text-green-400" /> Partidos Programados</h3>
            <div className="flex gap-2">
              <button onClick={generarFixture}
                className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black border border-green-500/20 px-4 py-2.5 rounded-full transition-all flex items-center gap-2">
                <Award size={14} /> Generar Fixture Auto
              </button>
              {torneo.formato === 'suizo' && (
                <button onClick={generarSiguienteRondaSuizo}
                  className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-black border border-blue-500/20 px-4 py-2.5 rounded-full transition-all flex items-center gap-2">
                  <Award size={14} /> Siguiente Ronda Suiza
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {partidos.length === 0 ? (
              <div className="col-span-full py-20 bg-slate-900/20 border border-slate-800/60 rounded-[2rem] text-center text-slate-500 font-bold text-xs uppercase">Sin partidos. Haz clic en "Generar Fixture Auto".</div>
            ) : partidos.map(p => (
              <div key={p.id} className={`bg-slate-900/50 border rounded-3xl p-6 flex items-center justify-between gap-4 transition-all ${p.es_wo ? 'border-red-500/30' : 'border-slate-800/80 hover:border-slate-800'}`}>
                <div className="flex-1 text-right">
                  <div className="font-black text-white text-base line-clamp-1">{p.local_nombre}</div>
                  {p.jornada && <div className="text-xs text-slate-500 font-semibold">Jornada {p.jornada}</div>}
                </div>
                <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800/80">
                  <input type="number" min={0}
                    className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-xl text-center font-black text-white text-lg focus:outline-none focus:border-green-500"
                    defaultValue={p.goles_local ?? 0}
                    onBlur={ev => updateResultado(p.id, parseInt(ev.target.value) || 0, p.goles_visitante ?? 0)} />
                  <div className="text-slate-600 font-black text-xs">VS</div>
                  <input type="number" min={0}
                    className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-xl text-center font-black text-white text-lg focus:outline-none focus:border-green-500"
                    defaultValue={p.goles_visitante ?? 0}
                    onBlur={ev => updateResultado(p.id, p.goles_local ?? 0, parseInt(ev.target.value) || 0)} />
                </div>
                <div className="flex-1">
                  <div className="font-black text-white text-base line-clamp-1">{p.visitante_nombre}</div>
                  {p.es_wo && <div className="text-[9px] text-red-400 font-black uppercase">W.O.</div>}
                </div>
                <div className="flex gap-2">
                  <a href={`${API_URL}/cancha/torneos/${torneo.id}/partidos/${p.id}/planilla-pdf`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 p-2 rounded-xl hover:bg-blue-500/10 transition-all flex items-center" title="Descargar Planilla PDF">
                    <Download size={16} />
                  </a>
                  <button onClick={() => { setSelectedPartido(p); setActiveTab('acta'); }}
                    className="text-green-400 hover:text-green-300 p-2 rounded-xl hover:bg-green-500/10 transition-all flex items-center" title="Abrir acta digital">
                    <Swords size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ACTA EN VIVO */}
      {activeTab === 'acta' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><Swords size={20} className="text-green-400" /> Acta de Partido en Vivo</h3>
          {!selectedPartido ? (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">Seleccioná un partido para abrir su acta:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partidos.map(p => (
                  <button key={p.id} onClick={() => setSelectedPartido(p)}
                    className="bg-slate-900/50 border border-slate-800 hover:border-green-500/40 rounded-2xl p-5 text-left transition-all group">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-sm">{p.local_nombre}</span>
                      <span className="text-slate-500 font-black text-xs mx-3">VS</span>
                      <span className="font-extrabold text-white text-sm">{p.visitante_nombre}</span>
                    </div>
                    {p.jornada && <div className="text-xs text-green-400/70 font-semibold mt-1">Jornada {p.jornada} · {p.estado}</div>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ActaPanel
              partido={selectedPartido}
              torneo={torneo}
              equipos={equipos}
              onClose={() => { setSelectedPartido(null); loadPartidos(); loadPosiciones(); loadGoleadores(); }}
            />
          )}
        </div>
      )}

      {/* TAB: POSICIONES */}
      {activeTab === 'posiciones' && (
        <div className="animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><BarChart2 size={20} className="text-green-400" /> Tabla de Posiciones</h3>
            <button onClick={() => { loadPosiciones(); }} className="text-xs text-slate-500 hover:text-green-400 border border-slate-800 hover:border-green-500/30 px-4 py-2 rounded-full transition-all flex items-center gap-1.5">
              <Clock size={12} /> Actualizar
            </button>
          </div>
          {posiciones.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-bold text-xs uppercase">Sin datos aún. Carga resultados en la pestaña Acta o Fixture.</div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-[2rem] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-800">
                    <th className="px-6 py-4">Pos</th><th className="px-6 py-4">Equipo</th>
                    <th className="px-4 py-4 text-center">PJ</th><th className="px-4 py-4 text-center">PG</th>
                    <th className="px-4 py-4 text-center">PE</th><th className="px-4 py-4 text-center">PP</th>
                    <th className="px-4 py-4 text-center">GF</th><th className="px-4 py-4 text-center">GC</th>
                    <th className="px-4 py-4 text-center">DG</th><th className="px-4 py-4 text-center text-white">PTS</th>
                    <th className="px-4 py-4 text-center" title="Fair Play">FP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {posiciones.map((p) => (
                    <tr key={p.nombre} className={`hover:bg-white/5 transition-colors ${p.posicion === 1 ? 'bg-yellow-500/5' : ''}`}>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-black ${p.posicion === 1 ? 'text-yellow-400' : p.posicion === 2 ? 'text-slate-300' : 'text-slate-500'}`}>{p.posicion}</span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-white">{p.nombre}</td>
                      <td className="px-4 py-4 text-center text-slate-400 text-sm">{p.pj}</td>
                      <td className="px-4 py-4 text-center text-green-400 font-bold text-sm">{p.pg}</td>
                      <td className="px-4 py-4 text-center text-slate-400 text-sm">{p.pe}</td>
                      <td className="px-4 py-4 text-center text-red-400/70 text-sm">{p.pp}</td>
                      <td className="px-4 py-4 text-center text-slate-300 text-sm">{p.gf}</td>
                      <td className="px-4 py-4 text-center text-slate-400 text-sm">{p.gc}</td>
                      <td className="px-4 py-4 text-center font-bold text-sm text-slate-400">{p.dg > 0 ? `+${p.dg}` : p.dg}</td>
                      <td className="px-4 py-4 text-center font-black text-green-400 text-xl">{p.pts}</td>
                      <td className="px-4 py-4 text-center text-xs text-slate-500 font-bold">{p.pts_fair_play_neg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: GOLEADORES */}
      {activeTab === 'goleadores' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2"><Star size={20} className="text-yellow-400" /> Tabla de Goleadores</h3>
          {goleadores.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-bold text-xs uppercase">Sin goles registrados aún.</div>
          ) : (
            <div className="space-y-3">
              {goleadores.map((g, idx) => (
                <div key={g.player_id} className="bg-slate-900/50 border border-slate-800/60 rounded-2xl px-6 py-4 flex items-center gap-5 hover:border-slate-700 transition-all">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-800 text-slate-500'}`}>{idx + 1}</div>
                  <div className="flex-1">
                    <div className="font-extrabold text-white">{g.nombre}</div>
                    <div className="text-xs text-slate-400 font-semibold">{g.equipo_nombre} {g.numero_camiseta ? `· #${g.numero_camiseta}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400">{g.goles}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">Goles</div>
                    </div>
                    {g.penales > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-black text-slate-400">{g.penales}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Penales</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FINANZAS */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Banknote size={20} className="text-emerald-400" /> Cuenta Corriente
          </h3>
          <div className="flex gap-4">
            <select
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
              value={selectedEquipoFinanzas}
              onChange={(e) => setSelectedEquipoFinanzas(e.target.value)}
            >
              <option value="">Seleccione un equipo...</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre}</option>
              ))}
            </select>
          </div>

          {selectedEquipoFinanzas && finanzasData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resumen */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6">
                <div className="text-sm font-bold text-slate-400 mb-2 uppercase">Deuda Total</div>
                <div className={`text-4xl font-black ${finanzasData.bloqueado ? 'text-red-500' : finanzasData.deuda_total > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  ${finanzasData.deuda_total.toLocaleString()}
                </div>
                {finanzasData.limite_habilitado && (
                  <div className="text-xs text-slate-500 mt-2">
                    Límite: ${finanzasData.limite_monto.toLocaleString()}
                  </div>
                )}
                {finanzasData.bloqueado && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                    <AlertTriangle size={16} /> Equipo Bloqueado Financieramente
                  </div>
                )}
              </div>

              {/* Formulario Cargo */}
              <div className="md:col-span-2 bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6">
                <div className="text-sm font-bold text-slate-400 mb-4 uppercase">Agregar Cargo Manual</div>
                <form onSubmit={handleAddCargo} className="flex gap-3">
                  <input type="text" placeholder="Concepto (Ej. Multa)" required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                    value={cargoConcepto} onChange={e => setCargoConcepto(e.target.value)} />
                  <input type="number" placeholder="Monto" required min={1}
                    className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                    value={cargoMonto} onChange={e => setCargoMonto(e.target.value)} />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors">
                    + Cargo
                  </button>
                </form>

                {/* Movimientos */}
                <div className="mt-6">
                  <div className="text-sm font-bold text-slate-400 mb-4 uppercase">Movimientos</div>
                  {finanzasData.movimientos.length === 0 ? (
                    <div className="text-slate-500 text-sm">Sin movimientos registrados.</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {finanzasData.movimientos.map((m: any) => (
                        <div key={m.id} className="bg-slate-950 rounded-xl p-4 flex items-center justify-between border border-slate-800">
                          <div>
                            <div className="font-bold text-white text-sm">{m.concepto}</div>
                            <div className="text-xs text-slate-500">{new Date(m.creado_en).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`font-black text-lg ${m.estado === 'pendiente' ? 'text-red-400' : 'text-emerald-400'}`}>
                              ${m.monto.toLocaleString()}
                            </div>
                            {m.estado === 'pendiente' ? (
                              <button onClick={() => handlePagarCargo(m.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                Pagar
                              </button>
                            ) : (
                              <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-500/10 flex items-center gap-1">
                                <CheckCircle size={12} /> Pagado
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: NOTICIAS IA */}
      {activeTab === 'noticias' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Newspaper className="text-green-500" />
                Centro de Noticias IA
              </h2>
              <p className="text-slate-400 mt-1">Genera crónicas y resúmenes automáticos usando Gemini.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-3xl h-fit">
              <h3 className="text-lg font-bold text-white mb-4">Generar Nueva Noticia</h3>
              <form onSubmit={handleGenerarIA} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contexto del Partido/Evento</label>
                  <textarea 
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-green-500 focus:outline-none"
                    placeholder="Ej: El partido entre Lazio y Milan finalizó 3-2 en un encuentro emocionante con gol a último minuto..."
                    value={contextoIA}
                    onChange={(e) => setContextoIA(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" disabled={!contextoIA} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                  <Star size={18} />
                  Generar con Gemini IA
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-white">Noticias Publicadas</h3>
              {loadingNoticias ? (
                <div className="text-center text-slate-500 py-8">Cargando noticias...</div>
              ) : noticias.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                  <Newspaper className="mx-auto text-slate-700 mb-4" size={48} />
                  <p className="text-slate-400">No hay noticias publicadas aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {noticias.map((n: any) => (
                    <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group overflow-hidden">
                      {n.es_ia && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                          <Star size={10} /> Escrito por IA
                        </div>
                      )}
                      <h4 className="text-xl font-black text-white mb-2 pr-24">{n.titulo}</h4>
                      <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap">{n.contenido}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <UserCheck size={14} /> {n.autor}
                          <span className="mx-2">•</span>
                          <Calendar size={14} /> {new Date(n.fecha_publicacion).toLocaleDateString()}
                        </div>
                        <button onClick={() => handleDeleteNoticia(n.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar equipo */}
      {isAddingEquipo && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setIsAddingEquipo(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-black text-white mb-6">Inscribir Equipo</h3>
            <form onSubmit={handleAddEquipo} className="space-y-4">
              <input placeholder="Nombre del Equipo" required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.nombre} onChange={e => setNewEquipo({...newEquipo, nombre: e.target.value})} />
              <input type="number" placeholder="Año de Promoción / Egreso" required min={1900} max={2100}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.promocion} onChange={e => setNewEquipo({...newEquipo, promocion: e.target.value})} />
              <input placeholder="Nombre del Capitán"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.capitan} onChange={e => setNewEquipo({...newEquipo, capitan: e.target.value})} />
              <input placeholder="Teléfono de contacto"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.telefono} onChange={e => setNewEquipo({...newEquipo, telefono: e.target.value})} />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingEquipo(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-extrabold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-green-500 text-black rounded-2xl font-extrabold text-sm hover:bg-green-400">Inscribir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar pago efectivo */}
      {isPayingCash && paymentTeam && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-in zoom-in duration-200">
            <button onClick={() => setIsPayingCash(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-black text-white mb-2">Registrar Pago</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Equipo: {paymentTeam.nombre}</p>
            <form onSubmit={handleConfirmCashPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Monto a cobrar</label>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-green-400 font-black text-lg">
                  {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(torneo.costo_inscripcion)}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Nombre del Receptor</label>
                <input placeholder="Nombre de quien recibe el dinero" required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                  value={cashReceiver} onChange={e => setCashReceiver(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPayingCash(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-extrabold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-green-500 text-black rounded-2xl font-extrabold text-sm hover:bg-green-400">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal generar link de pago */}
      {(isGeneratingLink || generatedLink) && paymentTeam && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative animate-in zoom-in duration-200">
            <button onClick={() => { setGeneratedLink(''); setPaymentTeam(null); }} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-black text-white mb-2">Link de Pago</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Equipo: {paymentTeam.nombre}</p>
            
            {isGeneratingLink ? (
              <div className="py-12 text-center text-slate-400 font-bold text-sm">Generando preferencia de pago...</div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Copia este link y envíaselo al capitán o delegado:</p>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-slate-300 font-mono text-xs break-all select-all">
                  {generatedLink}
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    alert('¡Link copiado al portapapeles!');
                  }} className="flex-1 py-4 bg-green-500 text-black rounded-2xl font-extrabold text-sm hover:bg-green-400">Copiar Link</button>
                  <button type="button" onClick={() => { setGeneratedLink(''); setPaymentTeam(null); }} className="py-4 bg-slate-800 text-white rounded-2xl px-6 font-extrabold text-sm">Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// PANEL DE JUGADORES POR EQUIPO
// ─────────────────────────────────────────
function EquipoJugadoresPanel({ torneo, equipo }: { torneo: Tournament; equipo: any }) {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '', egreso_ano: '', es_exalumno: true });

  const loadJugadores = async () => {
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${equipo.id}/jugadores`);
    if (res.ok) setJugadores(await res.json());
  };

  useEffect(() => { loadJugadores(); }, [equipo.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${equipo.id}/jugadores`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre, dni: form.dni,
        numero_camiseta: form.numero_camiseta ? parseInt(form.numero_camiseta) : null,
        posicion: form.posicion || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        egreso_ano: form.es_exalumno && form.egreso_ano ? parseInt(form.egreso_ano) : null,
        es_exalumno: form.es_exalumno
      })
    });
    if (res.ok) {
      setIsAdding(false); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '', egreso_ano: '', es_exalumno: true });
      loadJugadores();
    } else {
      const err = await res.json();
      alert(err.detail || 'Error al agregar jugador');
    }
  };

  const handleEditClick = (j: Jugador) => {
    setForm({ nombre: j.nombre, dni: j.dni, numero_camiseta: j.numero_camiseta ? String(j.numero_camiseta) : '', posicion: j.posicion || '', fecha_nacimiento: '', egreso_ano: j.egreso_ano ? String(j.egreso_ano) : '', es_exalumno: j.es_exalumno ?? true });
    setEditingId(j.id);
    setIsAdding(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${equipo.id}/jugadores/${editingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        numero_camiseta: form.numero_camiseta ? parseInt(form.numero_camiseta) : null,
        posicion: form.posicion || null
      })
    });
    if (res.ok) {
      setEditingId(null); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '', egreso_ano: '', es_exalumno: true });
      loadJugadores();
    } else {
      const err = await res.json();
      alert(err.detail || 'Error al editar jugador');
    }
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: equipo.color_principal ? `${equipo.color_principal}20` : 'rgba(34,197,94,0.1)', color: equipo.color_principal || '#4ade80' }}>
            {equipo.nombre[0]}
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">{equipo.nombre}</div>
            <div className="text-xs text-slate-500 font-semibold">{jugadores.length} jugadores registrados</div>
          </div>
        </div>
        <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '', egreso_ano: '', es_exalumno: true }); }} className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black border border-green-500/20 px-4 py-2 rounded-full transition-all flex items-center gap-1.5">
          {isAdding ? <X size={12} /> : <Plus size={12} />} {isAdding ? 'Cancelar' : 'Agregar'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="px-6 py-5 bg-slate-950/50 border-b border-slate-800/40 grid grid-cols-2 md:grid-cols-3 gap-3">
          <input placeholder="Nombre completo*" required
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
          <input placeholder="DNI / Cédula*" required
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} />
          <input type="number" placeholder="N° Camiseta" min={1}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.numero_camiseta} onChange={e => setForm({...form, numero_camiseta: e.target.value})} />
          <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.posicion} onChange={e => setForm({...form, posicion: e.target.value})}>
            <option value="">Posición</option><option>arquero</option><option>defensor</option><option>mediocampista</option><option>delantero</option>
          </select>
          <input type="date" placeholder="Fecha nacimiento"
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} />
          <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
            value={form.es_exalumno ? "exalumno" : "refuerzo"} 
            onChange={e => setForm({...form, es_exalumno: e.target.value === "exalumno"})}>
            <option value="exalumno">Exalumno</option>
            <option value="refuerzo">Refuerzo</option>
          </select>
          {form.es_exalumno && (
            <input type="number" placeholder="Año de Egreso" min={1900} max={2100}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
              value={form.egreso_ano} onChange={e => setForm({...form, egreso_ano: e.target.value})} />
          )}
          <button type="submit" className="bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all col-span-2 md:col-span-1">
            <CheckCircle size={16} /> Agregar
          </button>
        </form>
      )}

      {jugadores.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-600 font-bold text-xs uppercase">Sin jugadores registrados.</div>
      ) : (
        <div className="divide-y divide-slate-800/30">
          {jugadores.map(j => (
            <div key={j.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all">
              <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-slate-400">
                {j.numero_camiseta ?? '–'}
              </div>
              <div className="flex-1 min-w-0">
                {editingId === j.id ? (
                  <form onSubmit={handleSaveEdit} className="flex flex-wrap gap-2 items-center">
                    <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre" required />
                    <input type="number" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-16" value={form.numero_camiseta} onChange={e => setForm({...form, numero_camiseta: e.target.value})} placeholder="N°" />
                    <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={form.posicion} onChange={e => setForm({...form, posicion: e.target.value})}>
                      <option value="">Posición</option><option>arquero</option><option>defensor</option><option>mediocampista</option><option>delantero</option>
                    </select>
                    <button type="submit" className="bg-green-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Save size={12} /> Guardar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="bg-slate-700 text-white px-2 py-1 rounded text-xs font-bold">Cancelar</button>
                  </form>
                ) : (
                  <>
                    <div className="font-extrabold text-white text-sm truncate">{j.nombre}</div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {j.posicion || 'Sin posición'} · DNI: {j.dni}
                      {j.es_exalumno ? ` · Exalumno (${j.egreso_ano || 'Sin año'})` : ' · Refuerzo'}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleEditClick(j)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors" title="Editar Jugador">
                  <Edit2 size={14} />
                </button>
                <a href={`http://localhost:3000/jugadores/test-facial`} target="_blank" rel="noopener noreferrer" className="bg-blue-600/20 text-blue-400 hover:text-blue-300 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors border border-blue-500/20" title="Probar si el sistema lo reconoce">
                  <ScanFace size={12} /> Test Facial
                </a>
                <a href={`http://localhost:3000/jugadores/registro-facial?jugadorId=${j.id}`} target="_blank" rel="noopener noreferrer" className="bg-slate-800/80 text-green-400 hover:text-green-300 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors border border-slate-700/50" title="Escanear y Guardar Rostro">
                  <Camera size={12} /> Guardar Rostro
                </a>
                {j.amarillas_acum > 0 && (
                  <span className="w-6 h-6 rounded-md bg-yellow-400 flex items-center justify-center text-black font-black text-xs">{j.amarillas_acum}</span>
                )}
                {j.rojas_acum > 0 && (
                  <span className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center text-white font-black text-xs">{j.rojas_acum}</span>
                )}
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${j.estado === 'habilitado' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {j.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// PANEL ACTA EN VIVO
// ─────────────────────────────────────────
function ActaPanel({ partido, torneo, equipos, onClose }: { partido: any; torneo: Tournament; equipos: any[]; onClose: () => void }) {
  const [goles, setGoles] = useState<Gol[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [jugadoresLocal, setJugadoresLocal] = useState<Jugador[]>([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState<Jugador[]>([]);
  const [formGol, setFormGol] = useState({ player_id: '', equipo_id: partido.equipo_local_id, minuto: '', tipo: 'normal' });
  const [formTarjeta, setFormTarjeta] = useState({ player_id: '', equipo_id: partido.equipo_local_id, minuto: '', tipo: 'amarilla' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [g, t] = await Promise.all([
      fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/goles`).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/tarjetas`).then(r => r.ok ? r.json() : [])
    ]);
    setGoles(g); setTarjetas(t);
  };

  const loadJugadores = async () => {
    const [jl, jv] = await Promise.all([
      fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${partido.equipo_local_id}/jugadores`).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos/${partido.equipo_visitante_id}/jugadores`).then(r => r.ok ? r.json() : [])
    ]);
    setJugadoresLocal(jl); setJugadoresVisitante(jv);
  };

  const iniciarPartido = async () => {
    // Verificar estado financiero de ambos equipos
    const [finLocal, finVis] = await Promise.all([
      fetch(`${API_URL}/cancha/torneos/equipos/${partido.equipo_local_id}/cuenta_corriente`).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/cancha/torneos/equipos/${partido.equipo_visitante_id}/cuenta_corriente`).then(r => r.ok ? r.json() : null)
    ]);
    
    let advertencia = '';
    if (finLocal?.bloqueado) advertencia += `- ${partido.local_nombre} tiene deudas que superan el límite permitido.\n`;
    if (finVis?.bloqueado) advertencia += `- ${partido.visitante_nombre} tiene deudas que superan el límite permitido.\n`;
    
    if (advertencia) {
      if (!confirm(`ADVERTENCIA FINANCIERA\n\n${advertencia}\n¿Desea iniciar el partido bajo su propio riesgo?`)) return;
    } else {
      if (!confirm('¿Iniciar este partido?')) return;
    }
    
    const res = await fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/iniciar`, { method: 'POST' });
    if (res.ok) {
      alert('Partido Iniciado exitosamente');
      window.location.reload();
    }
  };

  useEffect(() => { loadData(); loadJugadores(); }, [partido.id]);

  const allJugadores = [...jugadoresLocal, ...jugadoresVisitante];
  const jugadoresDelEquipo = (eqId: string) => eqId === partido.equipo_local_id ? jugadoresLocal : jugadoresVisitante;

  const addGol = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/goles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formGol, player_id: formGol.player_id || null, minuto: formGol.minuto ? parseInt(formGol.minuto) : null })
    });
    setSaving(false);
    if (res.ok) { setFormGol({ player_id: '', equipo_id: partido.equipo_local_id, minuto: '', tipo: 'normal' }); loadData(); }
    else { const err = await res.json(); alert(err.detail || 'Error'); }
  };

  const addTarjeta = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/tarjetas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formTarjeta, minuto: formTarjeta.minuto ? parseInt(formTarjeta.minuto) : null })
    });
    setSaving(false);
    if (res.ok) { setFormTarjeta({ player_id: '', equipo_id: partido.equipo_local_id, minuto: '', tipo: 'amarilla' }); loadData(); }
    else { const err = await res.json(); alert(err.detail || 'Error'); }
  };

  const anularGol = async (golId: string) => {
    if (!confirm('¿Anular este gol?')) return;
    await fetch(`${API_URL}/cancha/torneos/partidos/${partido.id}/goles/${golId}`, { method: 'DELETE' });
    loadData();
  };

  const activeGoles = goles.filter(g => !g.anulado);
  const golesLocal = activeGoles.filter(g => {
    const eq = equipos.find(e => e.nombre === g.equipo_nombre);
    return g.tipo === 'autogol' ? eq?.id === partido.equipo_visitante_id : eq?.id === partido.equipo_local_id;
  }).length;
  const golesVisitante = activeGoles.length - golesLocal;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2">
          <button onClick={onClose} className="text-slate-500 hover:text-white flex items-center gap-1.5 text-sm font-bold transition-all">
            <X size={16} /> Cerrar acta
          </button>
          {partido.estado === 'programado' && (
            <button onClick={iniciarPartido} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all">
              <Swords size={16} /> Iniciar Partido
            </button>
          )}
        </div>
        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-8 py-5 flex items-center justify-center gap-8">
          <div className="text-right flex-1">
            <div className="font-black text-white text-lg">{partido.local_nombre}</div>
            <div className="text-xs text-slate-500 font-semibold">Local</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-black text-green-400">{golesLocal}</div>
            <div className="text-slate-600 font-black">–</div>
            <div className="text-5xl font-black text-green-400">{golesVisitante}</div>
          </div>
          <div className="text-left flex-1">
            <div className="font-black text-white text-lg">{partido.visitante_nombre}</div>
            <div className="text-xs text-slate-500 font-semibold">Visitante</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrar Gol */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
          <h4 className="font-extrabold text-white mb-5 flex items-center gap-2"><Target size={18} className="text-green-400" /> Registrar Gol</h4>
          <form onSubmit={addGol} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select required className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formGol.equipo_id} onChange={e => setFormGol({...formGol, equipo_id: e.target.value, player_id: ''})}>
                <option value={partido.equipo_local_id}>{partido.local_nombre}</option>
                <option value={partido.equipo_visitante_id}>{partido.visitante_nombre}</option>
              </select>
              <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formGol.tipo} onChange={e => setFormGol({...formGol, tipo: e.target.value})}>
                <option value="normal">Gol Normal</option><option value="penal">Penal</option><option value="autogol">Autogol</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formGol.player_id} onChange={e => setFormGol({...formGol, player_id: e.target.value})}>
                <option value="">Jugador (opcional)</option>
                {jugadoresDelEquipo(formGol.equipo_id).map(j => (
                  <option key={j.id} value={j.id}>{j.numero_camiseta ? `#${j.numero_camiseta} ` : ''}{j.nombre}</option>
                ))}
              </select>
              <input type="number" min={0} max={200} placeholder="Minuto"
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formGol.minuto} onChange={e => setFormGol({...formGol, minuto: e.target.value})} />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-3.5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
              <Plus size={16} className="stroke-[3]" /> {saving ? 'Guardando...' : 'Confirmar Gol'}
            </button>
          </form>
        </div>

        {/* Registrar Tarjeta */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
          <h4 className="font-extrabold text-white mb-5 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-400" /> Registrar Tarjeta</h4>
          <form onSubmit={addTarjeta} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select required className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formTarjeta.equipo_id} onChange={e => setFormTarjeta({...formTarjeta, equipo_id: e.target.value, player_id: ''})}>
                <option value={partido.equipo_local_id}>{partido.local_nombre}</option>
                <option value={partido.equipo_visitante_id}>{partido.visitante_nombre}</option>
              </select>
              <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formTarjeta.tipo} onChange={e => setFormTarjeta({...formTarjeta, tipo: e.target.value})}>
                <option value="amarilla">🟡 Amarilla (1 pt FP)</option>
                <option value="roja_segunda">🟠 Roja por 2ª Amarilla (3 pts)</option>
                <option value="roja_directa">🔴 Roja Directa (4 pts)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select required className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formTarjeta.player_id} onChange={e => setFormTarjeta({...formTarjeta, player_id: e.target.value})}>
                <option value="">Seleccionar jugador*</option>
                {jugadoresDelEquipo(formTarjeta.equipo_id).map(j => (
                  <option key={j.id} value={j.id}>{j.numero_camiseta ? `#${j.numero_camiseta} ` : ''}{j.nombre}</option>
                ))}
              </select>
              <input type="number" min={0} max={200} placeholder="Minuto"
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={formTarjeta.minuto} onChange={e => setFormTarjeta({...formTarjeta, minuto: e.target.value})} />
            </div>
            <button type="submit" disabled={saving || !formTarjeta.player_id}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
              <AlertTriangle size={16} /> {saving ? 'Guardando...' : 'Aplicar Tarjeta'}
            </button>
          </form>
        </div>
      </div>

      {/* Línea de eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-extrabold text-white mb-4 text-sm uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-green-400" /> Goles ({activeGoles.length})</h4>
          <div className="space-y-2">
            {goles.length === 0 && <div className="text-slate-600 text-xs font-semibold py-4 text-center">Sin goles registrados.</div>}
            {goles.map(g => (
              <div key={g.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${g.anulado ? 'opacity-40 border-slate-800/30 bg-slate-900/20 line-through' : 'border-slate-800/60 bg-slate-900/40'}`}>
                <span className="text-green-400 font-black text-sm w-8 text-center">{g.minuto ?? '–'}'</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{g.jugador_nombre || 'Sin nombre'}</div>
                  <div className="text-xs text-slate-500">{g.equipo_nombre} · {g.tipo}</div>
                </div>
                {!g.anulado && (
                  <button onClick={() => anularGol(g.id)} className="text-red-400/60 hover:text-red-400 transition-colors p-1" title="Anular gol">
                    <Minus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-extrabold text-white mb-4 text-sm uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-400" /> Tarjetas ({tarjetas.length})</h4>
          <div className="space-y-2">
            {tarjetas.length === 0 && <div className="text-slate-600 text-xs font-semibold py-4 text-center">Sin tarjetas registradas.</div>}
            {tarjetas.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/60 bg-slate-900/40">
                <span className="font-black text-sm w-8 text-center text-slate-400">{t.minuto ?? '–'}'</span>
                <div className={`w-5 h-6 rounded-sm flex-shrink-0 ${t.tipo === 'amarilla' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{t.jugador_nombre}</div>
                  <div className="text-xs text-slate-500">{t.equipo_nombre}</div>
                </div>
                {t.genera_suspension && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black uppercase">+{t.tipo === 'roja_directa' ? 2 : 1} Susp.</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
