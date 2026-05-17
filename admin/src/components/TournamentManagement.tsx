'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Plus, Save, X, ChevronRight, Medal } from 'lucide-react';

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
          nombre: '', descripcion: '', deporte: 'Fútbol 5', 
          formato: 'liga', fecha_inicio: new Date().toISOString().split('T')[0],
          max_equipos: 16, costo_inscripcion: 0
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
          onBack={() => setSelectedTorneo(null)} 
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="text-yellow-500 w-8 h-8" />
                Gestión de Torneos
              </h1>
              <p className="text-slate-400 mt-1">Crea y gestiona las competencias de tu complejo</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
            >
              <Plus size={20} />
              Crear Torneo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center text-slate-500">Cargando torneos...</div>
            ) : torneos.length === 0 ? (
              <div className="col-span-full py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                <Trophy className="mx-auto text-slate-700 w-16 h-16 mb-4" />
                <h3 className="text-xl font-medium text-slate-400">No hay torneos creados</h3>
                <p className="text-slate-600">Comienza creando el primero para atraer a más jugadores</p>
              </div>
            ) : torneos.map(t => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-green-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {t.estado}
                  </div>
                  <span className="text-slate-600 text-sm">{t.deporte}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t.nombre}</h3>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2">{t.descripcion || 'Sin descripción'}</p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <Calendar size={16} />
                    Inicia el {new Date(t.fecha_inicio).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <Users size={16} />
                    Máximo {t.max_equipos} equipos
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedTorneo(t)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  Administrar <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Creación ... */}

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Nuevo Torneo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre del Torneo</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción</label>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 h-24"
                  value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Deporte</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    value={formData.deporte} onChange={e => setFormData({...formData, deporte: e.target.value})}
                  >
                    <option>Fútbol 5</option>
                    <option>Pádel</option>
                    <option>Vóley</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Formato</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    value={formData.formato} onChange={e => setFormData({...formData, formato: e.target.value})}
                  >
                    <option value="liga">Liga (Todos contra todos)</option>
                    <option value="eliminacion_simple">Eliminación Directa</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Inicio</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Max Equipos</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    value={formData.max_equipos} onChange={e => setFormData({...formData, max_equipos: parseInt(e.target.value)})} required
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-4 bg-green-500 hover:bg-green-600 text-black font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all">
                  <Save size={20} />
                  Crear Torneo
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
    
    // Inicializar tabla con todos los equipos
    equipos.forEach(e => {
      table[e.id] = { 
        nombre: e.nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 
      };
    });

    // Procesar partidos finalizados
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
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
          <X size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">{torneo.nombre}</h2>
          <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mt-1">{torneo.deporte} • {torneo.formato}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-px">
        {(['equipos', 'fixture', 'posiciones'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-sm font-bold capitalize transition-all border-b-2 ${
              activeTab === tab ? 'border-green-500 text-green-500' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'equipos' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Equipos Inscritos ({equipos.length}/{torneo.max_equipos})</h3>
            <button 
              onClick={() => setIsAddingEquipo(true)}
              disabled={equipos.length >= torneo.max_equipos}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <Plus size={16} /> Agregar Equipo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipos.map((e, idx) => (
              <div key={e.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold text-white">{e.nombre}</div>
                  <div className="text-xs text-slate-500">{e.capitan_nombre || 'Sin capitán'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fixture' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Partidos Programados</h3>
            <button className="text-xs bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-bold">Generar Fixture Auto</button>
          </div>

          <div className="space-y-3">
            {partidos.length === 0 ? (
              <div className="py-20 text-center text-slate-600 italic">No hay partidos programados aún.</div>
            ) : partidos.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between gap-8">
                <div className="flex-1 text-right font-bold text-white">{p.local_nombre}</div>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-white text-xl"
                    defaultValue={p.goles_local || 0}
                    onBlur={(e) => updateResultado(p.id, parseInt(e.target.value), p.goles_visitante || 0)}
                  />
                  <div className="text-slate-700 font-bold">VS</div>
                  <input 
                    type="number" 
                    className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-white text-xl"
                    defaultValue={p.goles_visitante || 0}
                    onBlur={(e) => updateResultado(p.id, p.goles_local || 0, parseInt(e.target.value))}
                  />
                </div>
                <div className="flex-1 text-left font-bold text-white">{p.visitante_nombre}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'posiciones' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Pos</th>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4 text-center">PJ</th>
                <th className="px-6 py-4 text-center">PG</th>
                <th className="px-6 py-4 text-center">PE</th>
                <th className="px-6 py-4 text-center">PP</th>
                <th className="px-6 py-4 text-center">GF</th>
                <th className="px-6 py-4 text-center">GC</th>
                <th className="px-6 py-4 text-center">DG</th>
                <th className="px-6 py-4 text-center text-white">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {posiciones.map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-white">{p.nombre}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.pj}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.pg}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.pe}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.pp}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.gf}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.gc}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.dg > 0 ? `+${p.dg}` : p.dg}</td>
                  <td className="px-6 py-4 text-center font-black text-green-500 text-lg">{p.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddingEquipo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Inscribir Equipo</h3>
            <form onSubmit={handleAddEquipo} className="space-y-4">
              <input 
                placeholder="Nombre del Equipo"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                value={newEquipo.nombre} onChange={e => setNewEquipo({...newEquipo, nombre: e.target.value})} required
              />
              <input 
                placeholder="Nombre del Capitán"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                value={newEquipo.capitan} onChange={e => setNewEquipo({...newEquipo, capitan: e.target.value})}
              />
              <input 
                placeholder="Teléfono de contacto"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                value={newEquipo.telefono} onChange={e => setNewEquipo({...newEquipo, telefono: e.target.value})}
              />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingEquipo(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-green-500 text-black rounded-xl font-bold">Inscribir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
