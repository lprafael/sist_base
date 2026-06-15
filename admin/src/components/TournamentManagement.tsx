'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Users, Calendar, Plus, Save, X, ChevronRight,
  ShieldCheck, Award, Clock, UserCheck, Swords, Star,
  AlertTriangle, CheckCircle, Target, Minus, BarChart2, ScanFace, Edit2, Camera
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Tournament {
  id: string; nombre: string; descripcion: string; deporte: string;
  formato: string; fecha_inicio: string; estado: string;
  max_equipos: number; costo_inscripcion: number;
  pts_victoria?: number; pts_empate?: number; pts_derrota?: number;
  equipos_confirmados?: number;
}

interface Equipo { id: string; nombre: string; logo_url?: string; color_principal?: string; }
interface Jugador {
  id: string; nombre: string; dni: string; numero_camiseta?: number;
  posicion?: string; estado: string; amarillas_acum: number; rojas_acum: number; partidos_jugados: number;
}
interface Gol { id: string; jugador_nombre?: string; equipo_nombre: string; minuto?: number; tipo: string; anulado: boolean; }
interface Tarjeta { id: string; jugador_nombre: string; equipo_nombre: string; minuto?: number; tipo: string; pts_fair_play: number; genera_suspension: boolean; }
interface Posicion { posicion: number; nombre: string; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number; pts: number; pts_fair_play_neg: number; color_principal?: string; }
interface Goleador { player_id: string; nombre: string; equipo_nombre: string; goles: number; penales: number; autogoles: number; foto_url?: string; numero_camiseta?: number; }

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────
export default function TournamentManagement({ complejoId }: { complejoId: string }) {
  const [torneos, setTorneos] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTorneo, setSelectedTorneo] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', deporte: 'Fútbol 5', formato: 'liga',
    fecha_inicio: new Date().toISOString().split('T')[0],
    max_equipos: 16, costo_inscripcion: 0, pts_victoria: 3, pts_empate: 1, pts_derrota: 0,
    reglas: [''] as string[],
    premios: [{ rank: '1er Puesto', reward: '' }] as {rank: string, reward: string}[]
  });

  const loadTorneos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos?complejo_id=${complejoId}`);
      if (res.ok) setTorneos(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (complejoId) loadTorneos(); }, [complejoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/cancha/torneos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, complejo_id: complejoId })
      });
      if (res.ok) {
        setIsModalOpen(false); loadTorneos();
        setFormData({ nombre: '', descripcion: '', deporte: 'Fútbol 5', formato: 'liga',
          fecha_inicio: new Date().toISOString().split('T')[0], max_equipos: 16,
          costo_inscripcion: 0, pts_victoria: 3, pts_empate: 1, pts_derrota: 0,
          reglas: [], premios: [] });
      }
    } catch (e) { console.error(e); }
  };

  if (selectedTorneo) {
    return <TournamentDetails torneo={selectedTorneo} onBack={() => { setSelectedTorneo(null); loadTorneos(); }} />;
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
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
        <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando torneos...</div>
      ) : torneos.length === 0 ? (
        <div className="py-24 bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] text-center max-w-xl mx-auto">
          <Trophy className="text-slate-600 w-8 h-8 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white mb-2">Sin competencias activas</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">Comienza creando tu primer torneo oficial.</p>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 font-extrabold py-3.5 px-8 rounded-xl border border-green-500/20 transition-all">Crear Torneo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {torneos.map(t => (
            <div key={t.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-[2rem] p-8 hover:border-green-500/30 transition-all duration-300 group flex flex-col justify-between h-[400px]">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t.estado}</span>
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">{t.deporte}</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-green-400 transition-colors line-clamp-1">{t.nombre}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">{t.descripcion || 'Sin descripción'}</p>
                <div className="space-y-3 mb-8 border-t border-slate-800/60 pt-6">
                  <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                    <Calendar size={16} className="text-green-400" /> Inicia: {new Date(t.fecha_inicio).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                    <Users size={16} className="text-green-400" />
                    {t.equipos_confirmados ?? '–'} / {t.max_equipos} equipos
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTorneo(t)}
                className="w-full py-4 bg-slate-800 hover:bg-green-500 hover:text-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all duration-300">
                Administrar Panel <ChevronRight size={18} />
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Formato</label>
                  <select className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.formato} onChange={e => setFormData({...formData, formato: e.target.value})}>
                    <option value="liga">Liga (Todos contra todos)</option>
                    <option value="eliminatoria">Eliminación Directa</option>
                    <option value="mixta">Mixta (Grupos + Eliminatoria)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Inicio</label>
                  <input type="date" required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Max Equipos</label>
                  <input type="number" required min={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.max_equipos} onChange={e => setFormData({...formData, max_equipos: parseInt(e.target.value) || 16})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Costo de Inscripción (Gs.)</label>
                <input type="number" min={0} step={50000}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                  placeholder="0 si es gratuito" value={formData.costo_inscripcion}
                  onChange={e => setFormData({...formData, costo_inscripcion: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Puntuación (Victoria / Empate / Derrota)</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['pts_victoria', 'pts_empate', 'pts_derrota'] as const).map((k, i) => (
                    <input key={k} type="number" min={0} max={10}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-bold text-sm text-center"
                      value={formData[k]} onChange={e => setFormData({...formData, [k]: parseInt(e.target.value) || 0})}
                      placeholder={['V','E','D'][i]} />
                  ))}
                </div>
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
    </div>
  );
}

// ─────────────────────────────────────────
// DETALLE DEL TORNEO (tabs)
// ─────────────────────────────────────────
type ActiveTab = 'equipos' | 'jugadores' | 'fixture' | 'acta' | 'posiciones' | 'goleadores';

function TournamentDetails({ torneo, onBack }: { torneo: Tournament; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('equipos');
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [selectedPartido, setSelectedPartido] = useState<any>(null);
  const [isAddingEquipo, setIsAddingEquipo] = useState(false);
  const [newEquipo, setNewEquipo] = useState({ nombre: '', capitan: '', telefono: '' });

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
      body: JSON.stringify({ nombre: newEquipo.nombre, capitan_nombre: newEquipo.capitan, capitan_telefono: newEquipo.telefono })
    });
    if (res.ok) { setIsAddingEquipo(false); setNewEquipo({ nombre: '', capitan: '', telefono: '' }); loadEquipos(); }
  };

  const generarFixture = async () => {
    if (!confirm('¿Generar fixture automático? Se eliminarán los partidos existentes.')) return;
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/fixture`, { method: 'POST' });
    if (res.ok) { alert('¡Fixture generado!'); loadPartidos(); loadPosiciones(); }
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
                className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
                  style={{ background: e.color_principal ? `${e.color_principal}20` : 'rgba(34,197,94,0.1)', color: e.color_principal || '#4ade80' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-white truncate">{e.nombre}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {e.capitan_nombre || 'Sin capitán'}
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  e.estado_inscripcion === 'confirmado'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                  {e.estado_inscripcion}
                </span>
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
            <button onClick={generarFixture}
              className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black border border-green-500/20 px-4 py-2.5 rounded-full transition-all flex items-center gap-2">
              <Award size={14} /> Generar Fixture Auto
            </button>
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
                <button onClick={() => { setSelectedPartido(p); setActiveTab('acta'); }}
                  className="text-green-400 hover:text-green-300 p-2 rounded-xl hover:bg-green-500/10 transition-all" title="Abrir acta">
                  <Swords size={16} />
                </button>
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
  const [form, setForm] = useState({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '' });

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
        fecha_nacimiento: form.fecha_nacimiento || null
      })
    });
    if (res.ok) {
      setIsAdding(false); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '' });
      loadJugadores();
    } else {
      const err = await res.json();
      alert(err.detail || 'Error al agregar jugador');
    }
  };

  const handleEditClick = (j: Jugador) => {
    setForm({ nombre: j.nombre, dni: j.dni, numero_camiseta: j.numero_camiseta ? String(j.numero_camiseta) : '', posicion: j.posicion || '', fecha_nacimiento: '' });
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
      setEditingId(null); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '' });
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
        <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setForm({ nombre: '', dni: '', numero_camiseta: '', posicion: '', fecha_nacimiento: '' }); }} className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black border border-green-500/20 px-4 py-2 rounded-full transition-all flex items-center gap-1.5">
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
          <button type="submit" className="bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all">
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
                    <div className="text-xs text-slate-500 font-semibold">{j.posicion || 'Sin posición'} · DNI: {j.dni}</div>
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
        <button onClick={onClose} className="text-slate-500 hover:text-white flex items-center gap-1.5 text-sm font-bold transition-all">
          <X size={16} /> Cerrar acta
        </button>
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
