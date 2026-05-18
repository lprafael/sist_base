'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Plus, 
  Save, 
  X, 
  ChevronRight, 
  Medal, 
  DollarSign, 
  ShieldCheck, 
  Award,
  Clock
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Tournament {
  id: string;
  nombre: string;
  descripcion: string;
  deporte: string;
  formato: string;
  fecha_inicio: string;
  estado: string;
  max_equipos: number;
  costo_inscripcion: number;
}

export default function TournamentManagement({ complejoId }: { complejoId: string }) {
  const [torneos, setTorneos] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTorneo, setSelectedTorneo] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    deporte: 'Fútbol 5',
    formato: 'liga',
    fecha_inicio: new Date().toISOString().split('T')[0],
    max_equipos: 16,
    costo_inscripcion: 0
  });

  const loadTorneos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos?complejo_id=${complejoId}`);
      if (res.ok) {
        const data = await res.json();
        setTorneos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complejoId) loadTorneos();
  }, [complejoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/cancha/torneos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, complejo_id: complejoId })
      });
      if (res.ok) {
        setIsModalOpen(false);
        loadTorneos();
        setFormData({
          nombre: '', 
          descripcion: '', 
          deporte: 'Fútbol 5', 
          formato: 'liga', 
          fecha_inicio: new Date().toISOString().split('T')[0],
          max_equipos: 16, 
          costo_inscripcion: 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6">
      {selectedTorneo ? (
        <TournamentDetails 
          torneo={selectedTorneo} 
          onBack={() => {
            setSelectedTorneo(null);
            loadTorneos();
          }} 
        />
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Complejo Autorizado
                </span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Trophy className="text-yellow-500 w-10 h-10 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse" />
                Gestión de Torneos
              </h1>
              <p className="text-slate-400 text-sm mt-1.5">Como complejo deportivo verificado, tienes la facultad exclusiva de organizar torneos y ligas competitivas.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 hover:bg-green-400 text-black font-extrabold py-4 px-8 rounded-2xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
            >
              <Plus size={20} className="stroke-[3]" />
              Crear Torneo
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando torneos...</div>
          ) : torneos.length === 0 ? (
            <div className="py-24 bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] text-center max-w-xl mx-auto">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="text-slate-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Sin competencias activas</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
                Comienza creando tu primer torneo oficial. Atrae a más equipos, genera reservas automáticas y posiciona tu complejo.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-green-500/10 hover:bg-green-500/20 text-green-400 font-extrabold py-3.5 px-8 rounded-xl border border-green-500/20 transition-all"
              >
                Crear Torneo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {torneos.map(t => (
                <div key={t.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-[2rem] p-8 hover:border-green-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.05)] group flex flex-col justify-between h-[380px]">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {t.estado}
                      </span>
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">{t.deporte}</span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-green-400 transition-colors line-clamp-1">{t.nombre}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">{t.descripcion || 'Sin descripción'}</p>
                    
                    <div className="space-y-3 mb-8 border-t border-slate-800/60 pt-6">
                      <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                        <Calendar size={16} className="text-green-400" />
                        Inicia: {new Date(t.fecha_inicio).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                        <Users size={16} className="text-green-400" />
                        Límite: {t.max_equipos} equipos
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
                        <DollarSign size={16} className="text-green-400" />
                        Inscripción: {t.costo_inscripcion > 0 ? `G. ${t.costo_inscripcion.toLocaleString()}` : 'Gratuito'}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedTorneo(t)}
                    className="w-full py-4 bg-slate-800 hover:bg-green-500 hover:text-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
                  >
                    Administrar Panel <ChevronRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-8 relative my-8">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <Trophy size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Nuevo Torneo Oficial</h2>
              <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                Define las bases del campeonato. Solo los complejos autorizados pueden crear ligas en la plataforma.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre del Torneo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Torneo Apertura Fútbol 5"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-semibold transition-all text-sm"
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                <textarea 
                  placeholder="Bases del torneo, premios especiales, horarios..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-semibold transition-all text-sm h-24 resize-none"
                  value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Deporte</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold transition-all text-sm cursor-pointer"
                    value={formData.deporte} onChange={e => setFormData({...formData, deporte: e.target.value})}
                  >
                    <option>Fútbol 5</option>
                    <option>Pádel</option>
                    <option>Vóley</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Formato</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold transition-all text-sm cursor-pointer"
                    value={formData.formato} onChange={e => setFormData({...formData, formato: e.target.value})}
                  >
                    <option value="liga">Liga (Todos contra todos)</option>
                    <option value="eliminacion_simple">Eliminación Directa</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Inicio</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold transition-all text-sm cursor-pointer"
                    value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Max Equipos</label>
                  <input 
                    type="number"
                    required
                    min={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold transition-all text-sm"
                    value={formData.max_equipos} onChange={e => setFormData({...formData, max_equipos: parseInt(e.target.value) || 16})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Costo de Inscripción (Gs.)</label>
                <input 
                  type="number"
                  min={0}
                  step={50000}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold transition-all text-sm"
                  placeholder="Dejar en 0 si es gratuito"
                  value={formData.costo_inscripcion} onChange={e => setFormData({...formData, costo_inscripcion: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="pt-4">
                <button type="submit" className="w-full py-5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-base uppercase">
                  <Save size={20} className="stroke-[3]" />
                  Crear y Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentDetails({ torneo, onBack }: { torneo: any, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'equipos' | 'fixture' | 'posiciones'>('equipos');
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
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

  useEffect(() => {
    loadEquipos();
    loadPartidos();
  }, [torneo.id]);

  const handleAddEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: newEquipo.nombre,
        capitan_nombre: newEquipo.capitan,
        capitan_telefono: newEquipo.telefono
      })
    });
    if (res.ok) {
      setIsAddingEquipo(false);
      setNewEquipo({ nombre: '', capitan: '', telefono: '' });
      loadEquipos();
    }
  };

  const updateResultado = async (partidoId: string, gl: number, gv: number) => {
    const res = await fetch(`${API_URL}/cancha/torneos/partidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goles_local: gl, goles_visitante: gv, estado: 'finalizado' })
    });
    if (res.ok) loadPartidos();
  };

  const getPosiciones = () => {
    const table: Record<string, any> = {};
    
    equipos.forEach(e => {
      table[e.id] = { 
        nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 
      };
    });

    partidos.filter(p => p.estado === 'finalizado').forEach(p => {
      const el = table[p.equipo_local_id];
      const ev = table[p.equipo_visitante_id];
      
      if (!el || !ev) return;

      el.pj++; ev.pj++;
      el.gf += p.goles_local; el.gc += p.goles_visitante;
      ev.gf += p.goles_visitante; ev.gc += p.goles_local;

      if (p.goles_local > p.goles_visitante) {
        el.pg++; el.pts += 3; ev.pp++;
      } else if (p.goles_visitante > p.goles_local) {
        ev.pg++; ev.pts += 3; el.pp++;
      } else {
        el.pe++; ev.pe++; el.pts += 1; ev.pts += 1;
      }
      el.dg = el.gf - el.gc;
      ev.dg = ev.gf - ev.gc;
    });

    return Object.values(table).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });
  };

  const posiciones = getPosiciones();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl hover:border-slate-700 transition-all shadow-sm">
          <X size={20} />
        </button>
        <div>
          <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {torneo.deporte} • {torneo.formato === 'liga' ? 'Liga' : 'Eliminación Directa'}
          </span>
          <h2 className="text-3xl font-black text-white mt-2 tracking-tight">{torneo.nombre}</h2>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-800/80 pb-px">
        {(['equipos', 'fixture', 'posiciones'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-5 text-sm font-extrabold uppercase tracking-wider transition-all border-b-3 -mb-px ${
              activeTab === tab 
                ? 'border-green-500 text-green-400 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'equipos' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Users size={20} className="text-green-400" />
              Equipos Inscritos ({equipos.length}/{torneo.max_equipos})
            </h3>
            <button 
              onClick={() => setIsAddingEquipo(true)}
              disabled={equipos.length >= torneo.max_equipos}
              className="bg-green-500 hover:bg-green-400 text-black font-extrabold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all"
            >
              <Plus size={16} className="stroke-[3]" /> Agregar Equipo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipos.length === 0 ? (
              <div className="col-span-full py-16 bg-slate-900/20 border border-slate-800/60 rounded-[2rem] text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                No hay equipos inscritos todavía.
              </div>
            ) : equipos.map((e, idx) => (
              <div key={e.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-all">
                <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center font-black text-lg">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-extrabold text-white text-lg">{e.nombre}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Capitán: {e.capitan_nombre || 'Sin capitán'}</div>
                </div>
                {e.estado_inscripcion === 'confirmado' && (
                  <span className="ml-auto bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">CONFIRMADO</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fixture' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Calendar size={20} className="text-green-400" />
              Partidos Programados
            </h3>
            <button 
              onClick={async () => {
                if (confirm('¿Estás seguro de que deseas generar el fixture automático? Esto eliminará cualquier partido programado existente.')) {
                  try {
                    const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/fixture`, { method: 'POST' });
                    if (res.ok) {
                      alert('¡Fixture generado exitosamente!');
                      loadPartidos();
                    } else {
                      const data = await res.json();
                      alert('Error: ' + (data.detail || 'No se pudo generar el fixture.'));
                    }
                  } catch (err) {
                    alert('Error de conexión al generar el fixture.');
                  }
                }
              }}
              className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black border border-green-500/20 px-4 py-2 rounded-full transition-all"
            >
              Generar Fixture Auto
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {partidos.length === 0 ? (
              <div className="col-span-full py-20 bg-slate-900/20 border border-slate-800/60 rounded-[2rem] text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                No hay partidos programados aún. Haz clic en "Generar Fixture Auto".
              </div>
            ) : partidos.map(p => (
              <div key={p.id} className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-3xl flex items-center justify-between gap-6 hover:border-slate-800 transition-all">
                <div className="flex-1 text-right font-black text-white text-lg line-clamp-1">{p.local_nombre}</div>
                <div className="flex items-center gap-4 bg-slate-950 p-2.5 rounded-2xl border border-slate-800/80 shadow-inner">
                  <input 
                    type="number" 
                    min={0}
                    className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl text-center font-black text-white text-xl focus:outline-none focus:border-green-500"
                    defaultValue={p.goles_local || 0}
                    onBlur={(e) => updateResultado(p.id, parseInt(e.target.value) || 0, p.goles_visitante || 0)}
                  />
                  <div className="text-slate-600 font-black text-xs uppercase tracking-widest">VS</div>
                  <input 
                    type="number" 
                    min={0}
                    className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl text-center font-black text-white text-xl focus:outline-none focus:border-green-500"
                    defaultValue={p.goles_visitante || 0}
                    onBlur={(e) => updateResultado(p.id, p.goles_local || 0, parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex-1 text-left font-black text-white text-lg line-clamp-1">{p.visitante_nombre}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'posiciones' && (
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-850">
                <th className="px-8 py-5">Pos</th>
                <th className="px-8 py-5">Equipo</th>
                <th className="px-8 py-5 text-center">PJ</th>
                <th className="px-8 py-5 text-center">PG</th>
                <th className="px-8 py-5 text-center">PE</th>
                <th className="px-8 py-5 text-center">PP</th>
                <th className="px-8 py-5 text-center">GF</th>
                <th className="px-8 py-5 text-center">GC</th>
                <th className="px-8 py-5 text-center">DG</th>
                <th className="px-8 py-5 text-center text-white">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {posiciones.map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-4 font-black text-slate-500">{idx + 1}</td>
                  <td className="px-8 py-4 font-black text-white">{p.nombre}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.pj}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.pg}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.pe}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.pp}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.gf}</td>
                  <td className="px-8 py-4 text-center text-slate-400">{p.gc}</td>
                  <td className="px-8 py-4 text-center font-bold text-slate-400">{p.dg > 0 ? `+${p.dg}` : p.dg}</td>
                  <td className="px-8 py-4 text-center font-black text-green-400 text-xl">{p.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddingEquipo && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsAddingEquipo(false)} 
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Inscribir Equipo</h3>
            <form onSubmit={handleAddEquipo} className="space-y-4">
              <input 
                placeholder="Nombre del Equipo"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.nombre} onChange={e => setNewEquipo({...newEquipo, nombre: e.target.value})} required
              />
              <input 
                placeholder="Nombre del Capitán"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.capitan} onChange={e => setNewEquipo({...newEquipo, capitan: e.target.value})}
              />
              <input 
                placeholder="Teléfono de contacto"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                value={newEquipo.telefono} onChange={e => setNewEquipo({...newEquipo, telefono: e.target.value})}
              />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingEquipo(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-extrabold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-green-500 text-black rounded-2xl font-extrabold text-sm hover:bg-green-400 transition-colors">Inscribir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
