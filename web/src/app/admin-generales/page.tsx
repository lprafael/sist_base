'use client';

import { useState, useEffect } from 'react';
import {
  LogOut, RefreshCw, Layers, Power, 
  Activity, Users, ShieldAlert, Scale,
  Trophy, UserCheck, AlertTriangle, Plus,
  Edit2, Trash2, Calendar, DollarSign
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import BracketViewer from '@/components/BracketViewer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function AdminGeneralesPage() {
  const [activeTab, setActiveTab] = useState('torneos');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [selectedTorneoId, setSelectedTorneoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Formularios Torneo
  const [showForm, setShowForm] = useState(false);
  const [formTorneo, setFormTorneo] = useState({ id: '', nombre: '', lugar: '', fecha_inicio: '', fecha_fin: '', modalidades_permitidas: 'Karate, BJJ' });

  // Checkin state
  const [participanteIdCheckin, setParticipanteIdCheckin] = useState('1'); 
  const [pesoReal, setPesoReal] = useState('');
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<{loading: boolean, success?: boolean, error?: string}>({loading: false});

  // Agrupacion state
  const [agrupacionStatus, setAgrupacionStatus] = useState<{loading: boolean, success?: boolean, error?: string, message?: string}>({loading: false});
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [encuentros, setEncuentros] = useState<any[]>([]);
  const [bracketStatus, setBracketStatus] = useState<{loading: boolean, error?: string}>({loading: false});

  // Veedores state
  const [puntajeRojo, setPuntajeRojo] = useState(0);
  const [puntajeAzul, setPuntajeAzul] = useState(0);

  // Multas state
  const [penalidades, setPenalidades] = useState<any[]>([]);
  const [formPenalidad, setFormPenalidad] = useState({ nombre: '', descripcion: '', monto_gs: '' });
  const [multasSearch, setMultasSearch] = useState('');
  const [multasAtleta, setMultasAtleta] = useState<any>(null);
  const [multasAsignadas, setMultasAsignadas] = useState<any[]>([]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('user_session');
    if (!sessionStr) {
      window.location.href = '/login';
      return;
    }
    const session = JSON.parse(sessionStr);
    if (session.role !== 'super' && session.role !== 'organizador') {
      window.location.href = '/login';
      return;
    }
    setSessionInfo(session);
    fetchTorneos();
  }, []);

  const fetchTorneos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos`);
      const data = await res.json();
      setTorneos(data);
      if (data.length > 0 && !selectedTorneoId) {
        setSelectedTorneoId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTorneoId && activeTab === 'agrupacion') {
      fetchGrupos();
    }
  }, [selectedTorneoId, activeTab]);

  useEffect(() => {
    if (selectedGrupoId) {
      fetchEncuentros();
    } else {
      setEncuentros([]);
    }
  }, [selectedGrupoId]);

  useEffect(() => {
    if (selectedTorneoId && activeTab === 'multas') {
      fetchPenalidades();
    }
  }, [selectedTorneoId, activeTab]);

  const fetchPenalidades = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos/${selectedTorneoId}/penalidades`);
      const data = await res.json();
      setPenalidades(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGrupos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos/${selectedTorneoId}/grupos`);
      const data = await res.json();
      setGrupos(data);
      if (data.length > 0) setSelectedGrupoId(data[0].id);
      else setSelectedGrupoId(null);
    } catch (err) {
      console.error("Error fetching grupos:", err);
    }
  };

  const fetchEncuentros = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marciales/grupos/${selectedGrupoId}/encuentros`);
      const data = await res.json();
      setEncuentros(data);
    } catch (err) {
      console.error("Error fetching encuentros:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    window.location.href = '/login';
  };

  const handleSubmitTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const mods = formTorneo.modalidades_permitidas.split(',').map(m => m.trim());
    try {
      if (formTorneo.id) {
        // Edit
        await fetch(`${API_URL}/api/marciales/torneos/${formTorneo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formTorneo.nombre,
            lugar: formTorneo.lugar,
            fecha_inicio: formTorneo.fecha_inicio,
            fecha_fin: formTorneo.fecha_fin,
            modalidades_permitidas: mods
          })
        });
      } else {
        // Create
        await fetch(`${API_URL}/api/marciales/torneos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formTorneo.nombre,
            lugar: formTorneo.lugar,
            fecha_inicio: formTorneo.fecha_inicio,
            fecha_fin: formTorneo.fecha_fin,
            modalidades_permitidas: mods
          })
        });
      }
      setShowForm(false);
      setFormTorneo({ id: '', nombre: '', lugar: '', fecha_inicio: '', fecha_fin: '', modalidades_permitidas: 'Karate, BJJ' });
      fetchTorneos();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDeleteTorneo = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este torneo?')) return;
    try {
      await fetch(`${API_URL}/api/marciales/torneos/${id}`, { method: 'DELETE' });
      if (selectedTorneoId === id) setSelectedTorneoId(null);
      fetchTorneos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinStatus({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/marciales/participantes/${participanteIdCheckin}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso_verificado: parseFloat(pesoReal),
          estatura_verificada: 0.0,
          pago_confirmado: pagoConfirmado
        })
      });
      if (!res.ok) throw new Error("Error en el check-in");
      setCheckinStatus({ loading: false, success: true });
      setTimeout(() => setCheckinStatus({ loading: false }), 3000);
    } catch (err: any) {
      setCheckinStatus({ loading: false, error: err.message });
    }
  };

  const handleAgrupar = async () => {
    if (!selectedTorneoId) return;
    setAgrupacionStatus({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos/${selectedTorneoId}/agrupacion-dinamica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edades: [[5,10], [11,15], [16,18], [19,99]],
          pesos: [[0,60], [60.1,70], [70.1,80], [80.1,200]]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error agrupando");
      setAgrupacionStatus({ loading: false, success: true, message: data.mensaje || "Agrupación completada" });
      fetchGrupos();
    } catch (err: any) {
      setAgrupacionStatus({ loading: false, error: err.message });
    }
  };

  const handleGenerarLlaves = async () => {
    if (!selectedGrupoId) return;
    setBracketStatus({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/marciales/grupos/${selectedGrupoId}/generar-llaves`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error generando llaves");
      setBracketStatus({ loading: false });
      fetchEncuentros();
    } catch (err: any) {
      setBracketStatus({ loading: false, error: err.message });
    }
  };

  const handleScore = async (color: 'rojo'|'azul', points: number) => {
    if (color === 'rojo') setPuntajeRojo(prev => prev + points);
    else setPuntajeAzul(prev => prev + points);
    
    // Call the actual WS-triggering endpoint
    try {
      // Mocking an encuentro_id and participante_id for now since we don't have the match list built
      const mockEncuentroId = "550e8400-e29b-41d4-a716-446655440000";
      const mockParticipanteId = "110e8400-e29b-41d4-a716-446655440000";
      await fetch(`${API_URL}/api/marciales/encuentros/${mockEncuentroId}/puntuacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participante_id: mockParticipanteId,
          juez_id: sessionInfo.name,
          valor_puntos: points,
          tipo_registro: 'Punto',
          nota: color
        })
      });
    } catch (err) {
      console.error("No se pudo emitir la puntuación al websocket:", err);
    }
  };

  if (!sessionInfo) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      <Nav scrolled={true} />

      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col relative z-10 shadow-2xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> 
              Admin <span className="text-red-500">Marcial</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Torneos Multidisciplinarios</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: 'torneos', icon: Activity, label: 'Mis Torneos' },
              { id: 'checkin', icon: Scale, label: 'Check-in (Pesaje)' },
              { id: 'agrupacion', icon: Layers, label: 'Agrupación (Llaves)' },
              { id: 'veedores', icon: Trophy, label: 'Mesa Veedores' },
              { id: 'multas', icon: DollarSign, label: 'Multas y Pagos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'text-red-500' : 'text-slate-500'} />
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                {sessionInfo.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{sessionInfo.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{sessionInfo.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400 rounded-lg font-bold transition-colors text-sm border border-slate-700 hover:border-red-500/30"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-[#0a0f18] relative overflow-hidden flex flex-col">
          {/* Subtle background gradient */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex-1 overflow-auto p-8 relative z-10">
            {/* Header: Selector de Torneo activo */}
            {activeTab !== 'torneos' && (
              <div className="mb-8 flex items-center gap-4">
                <p className="text-slate-400 font-bold">Torneo Activo:</p>
                <select 
                  value={selectedTorneoId || ''} 
                  onChange={(e) => setSelectedTorneoId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500"
                >
                  <option value="" disabled>Seleccionar Torneo...</option>
                  {torneos.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'torneos' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-2">Mis Torneos</h1>
                    <p className="text-slate-400 font-medium">Administra tus eventos y campeonatos.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setFormTorneo({ id: '', nombre: '', lugar: '', fecha_inicio: '', fecha_fin: '', modalidades_permitidas: 'Karate, BJJ' });
                      setShowForm(true);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Plus size={20} /> Crear Torneo
                  </button>
                </div>

                {showForm ? (
                  <form onSubmit={handleSubmitTorneo} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8">
                    <h2 className="text-xl font-bold text-white mb-6">{formTorneo.id ? 'Editar Torneo' : 'Nuevo Torneo'}</h2>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Nombre del Evento</label>
                        <input type="text" required value={formTorneo.nombre} onChange={e => setFormTorneo({...formTorneo, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Sede / Lugar</label>
                        <input type="text" required value={formTorneo.lugar} onChange={e => setFormTorneo({...formTorneo, lugar: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Fecha Inicio</label>
                        <input type="date" required value={formTorneo.fecha_inicio} onChange={e => setFormTorneo({...formTorneo, fecha_inicio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Fecha Fin</label>
                        <input type="date" required value={formTorneo.fecha_fin} onChange={e => setFormTorneo({...formTorneo, fecha_fin: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-400 mb-2">Modalidades (separadas por coma)</label>
                        <input type="text" required value={formTorneo.modalidades_permitidas} onChange={e => setFormTorneo({...formTorneo, modalidades_permitidas: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl transition-colors">Guardar</button>
                      <button type="button" onClick={() => setShowForm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-8 py-3 rounded-xl transition-colors">Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {torneos.map(t => (
                      <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{t.nombre}</h3>
                            <p className="text-slate-400 text-sm flex items-center gap-1"><Calendar size={14}/> {t.fecha_inicio} al {t.fecha_fin}</p>
                          </div>
                          <span className="bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20">{t.estado}</span>
                        </div>
                        <p className="text-slate-300 text-sm mb-6"><strong>Modalidades:</strong> {Array.isArray(t.modalidades_permitidas) ? t.modalidades_permitidas.join(', ') : t.modalidades_permitidas}</p>
                        
                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                          <button 
                            onClick={() => { setSelectedTorneoId(t.id); setActiveTab('checkin'); }}
                            className="flex-1 bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 font-bold px-4 py-2 rounded-lg transition-colors border border-red-600/30"
                          >
                            Operar
                          </button>
                          <button 
                            onClick={() => { 
                              setFormTorneo({ ...t, modalidades_permitidas: Array.isArray(t.modalidades_permitidas) ? t.modalidades_permitidas.join(', ') : t.modalidades_permitidas }); 
                              setShowForm(true); 
                            }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTorneo(t.id)}
                            className="p-2 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {torneos.length === 0 && !loading && (
                      <div className="col-span-2 text-center p-12 border border-slate-800 border-dashed rounded-3xl">
                        <p className="text-slate-400 mb-4">No tienes torneos creados aún.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'checkin' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                <h1 className="text-3xl font-black text-white mb-2">Check-In / Pesaje</h1>
                <p className="text-slate-400 mb-8 font-medium">Ingresa el peso real y confirma el pago para habilitar al competidor.</p>
                
                <form onSubmit={handleCheckin} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">ID del Competidor (Test: 1, 2 o 3)</label>
                      <input 
                        type="text" 
                        value={participanteIdCheckin}
                        onChange={e => setParticipanteIdCheckin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Peso Real en Báscula (kg)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={pesoReal}
                        onChange={e => setPesoReal(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 text-2xl font-black" 
                        placeholder="Ej. 72.5"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <input 
                        type="checkbox" 
                        id="pago" 
                        checked={pagoConfirmado}
                        onChange={e => setPagoConfirmado(e.target.checked)}
                        className="w-6 h-6 rounded border-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 bg-slate-900"
                      />
                      <label htmlFor="pago" className="text-lg font-bold text-white select-none cursor-pointer">
                        Confirmar Pago de Inscripción
                      </label>
                    </div>

                    {checkinStatus.error && (
                      <div className="p-4 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-sm font-bold">
                        {checkinStatus.error}
                      </div>
                    )}
                    
                    {checkinStatus.success && (
                      <div className="p-4 bg-green-950/50 border border-green-900 text-green-400 rounded-xl text-sm font-bold">
                        ✅ Atleta habilitado correctamente para competir.
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={checkinStatus.loading || !selectedTorneoId}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {checkinStatus.loading ? 'Procesando...' : 'Guardar y Habilitar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'agrupacion' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-3xl font-black text-white mb-2">Agrupación Dinámica</h1>
                <p className="text-slate-400 mb-8 font-medium">Genera las llaves y grupos automáticamente basados en nivel, edad y peso.</p>
                
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 text-center max-w-2xl">
                  <Layers className="text-slate-600 w-20 h-20 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-white mb-2">Generar Grupos</h3>
                  <p className="text-slate-400 mb-8">El algoritmo agrupará a todos los competidores en estado "Habilitado" usando las reglas configuradas del torneo.</p>
                  
                  {agrupacionStatus.error && (
                    <div className="p-4 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-sm font-bold mb-6 text-left">
                      {agrupacionStatus.error}
                    </div>
                  )}
                  {agrupacionStatus.success && (
                    <div className="p-4 bg-green-950/50 border border-green-900 text-green-400 rounded-xl text-sm font-bold mb-6 text-left">
                      ✅ {agrupacionStatus.message}
                    </div>
                  )}

                  <button 
                    onClick={handleAgrupar}
                    disabled={agrupacionStatus.loading || !selectedTorneoId}
                    className="bg-red-600 hover:bg-red-500 text-white font-black text-lg py-4 px-12 rounded-xl shadow-lg shadow-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {agrupacionStatus.loading ? 'Ejecutando algoritmo...' : 'Ejecutar Agrupación Dinámica'}
                  </button>
                </div>

                {/* Brackets / Grupos List */}
                {grupos.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">Llaves del Torneo</h3>
                      <select 
                        value={selectedGrupoId || ''} 
                        onChange={(e) => setSelectedGrupoId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500 max-w-sm"
                      >
                        {grupos.map(g => (
                          <option key={g.id} value={g.id}>{g.nombre_categoria}</option>
                        ))}
                      </select>
                    </div>

                    {bracketStatus.error && (
                      <div className="p-4 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-sm font-bold mb-6 text-left">
                        {bracketStatus.error}
                      </div>
                    )}

                    {encuentros.length > 0 ? (
                      <div className="h-[500px]">
                        <BracketViewer matches={encuentros} />
                      </div>
                    ) : (
                      <div className="text-center py-12 border border-slate-800 border-dashed rounded-2xl">
                        <p className="text-slate-400 mb-6">Este grupo aún no tiene las llaves generadas.</p>
                        <button 
                          onClick={handleGenerarLlaves}
                          disabled={bracketStatus.loading}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {bracketStatus.loading ? 'Generando...' : 'Sortear y Generar Llaves'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'veedores' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-2">Mesa de Veedores</h1>
                    <p className="text-slate-400 font-medium">Transmisión en Vivo: {selectedTorneoId ? 'Conectado al WS' : 'Seleccione un torneo'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                        window.open(`/torneos-generales/tv?torneo=${selectedTorneoId}`, '_blank');
                    }} className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-500 transition-colors mr-2">Abrir Pantalla TV</button>
                    <button onClick={() => {setPuntajeRojo(0); setPuntajeAzul(0);}} className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-lg hover:bg-slate-700">Reiniciar Puntos Locales</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 max-w-5xl">
                  {/* Rojo */}
                  <div className="bg-red-950/30 border border-red-900/50 rounded-3xl p-8 flex flex-col items-center">
                    <div className="w-full bg-red-600 text-white font-black text-center py-2 rounded-lg mb-8 tracking-widest text-lg">ROJO</div>
                    <div className="text-[8rem] font-black text-white leading-none mb-12 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                      {puntajeRojo}
                    </div>
                    <div className="grid grid-cols-3 gap-4 w-full">
                      <button onClick={() => handleScore('rojo', 1)} className="bg-slate-900 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+1</button>
                      <button onClick={() => handleScore('rojo', 2)} className="bg-slate-900 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+2</button>
                      <button onClick={() => handleScore('rojo', 3)} className="bg-slate-900 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+3</button>
                    </div>
                  </div>

                  {/* Azul */}
                  <div className="bg-blue-950/30 border border-blue-900/50 rounded-3xl p-8 flex flex-col items-center">
                    <div className="w-full bg-blue-600 text-white font-black text-center py-2 rounded-lg mb-8 tracking-widest text-lg">AZUL</div>
                    <div className="text-[8rem] font-black text-white leading-none mb-12 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                      {puntajeAzul}
                    </div>
                    <div className="grid grid-cols-3 gap-4 w-full">
                      <button onClick={() => handleScore('azul', 1)} className="bg-slate-900 hover:bg-blue-900/50 border border-slate-700 hover:border-blue-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+1</button>
                      <button onClick={() => handleScore('azul', 2)} className="bg-slate-900 hover:bg-blue-900/50 border border-slate-700 hover:border-blue-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+2</button>
                      <button onClick={() => handleScore('azul', 3)} className="bg-slate-900 hover:bg-blue-900/50 border border-slate-700 hover:border-blue-500 text-white font-black text-2xl py-6 rounded-2xl transition-all">+3</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'multas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-white mb-2">Multas y Pagos</h1>
                  <p className="text-slate-400 font-medium">Gestiona el catálogo de penalizaciones y las deudas de los competidores.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Catalogo de Multas */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Catálogo de Multas</h3>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      await fetch(`${API_URL}/api/marciales/torneos/${selectedTorneoId}/penalidades`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nombre: formPenalidad.nombre,
                          descripcion: formPenalidad.descripcion,
                          monto_gs: parseFloat(formPenalidad.monto_gs)
                        })
                      });
                      setFormPenalidad({ nombre: '', descripcion: '', monto_gs: '' });
                      fetchPenalidades();
                    }} className="mb-8 space-y-4">
                      <input type="text" placeholder="Ej. Cambio de categoría" required value={formPenalidad.nombre} onChange={e => setFormPenalidad({...formPenalidad, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      <input type="number" placeholder="Monto (Gs)" required value={formPenalidad.monto_gs} onChange={e => setFormPenalidad({...formPenalidad, monto_gs: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                      <button type="submit" disabled={!selectedTorneoId} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">Agregar al Catálogo</button>
                    </form>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {penalidades.map(p => (
                        <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="text-white font-bold">{p.nombre}</p>
                            <p className="text-slate-500 text-sm">ID: {p.id.substring(0,8)}</p>
                          </div>
                          <span className="text-red-400 font-bold bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50">
                            Gs. {Number(p.monto_gs).toLocaleString('es-PY')}
                          </span>
                        </div>
                      ))}
                      {penalidades.length === 0 && <p className="text-slate-500 text-center py-4">No hay penalidades configuradas.</p>}
                    </div>
                  </div>

                  {/* Asignacion y Cobro */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><UserCheck className="text-blue-500"/> Cobranza a Atleta</h3>
                    
                    <div className="flex gap-2 mb-8">
                      <input type="text" placeholder="Buscar por Apellido o Documento" value={multasSearch} onChange={e => setMultasSearch(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                      <button onClick={async () => {
                        const res = await fetch(`${API_URL}/api/marciales/torneos/${selectedTorneoId}/participantes/buscar?q=${multasSearch}`);
                        const data = await res.json();
                        if (data.length > 0) {
                          setMultasAtleta(data[0]);
                          const mRes = await fetch(`${API_URL}/api/marciales/participantes/${data[0].id}/multas`);
                          setMultasAsignadas(await mRes.json());
                        } else {
                          setMultasAtleta(null);
                          setMultasAsignadas([]);
                        }
                      }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">Buscar</button>
                    </div>

                    {multasAtleta ? (
                      <div>
                        <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
                          <p className="text-white font-bold text-lg">{multasAtleta.nombre} {multasAtleta.apellido}</p>
                          <p className="text-slate-400 text-sm">Doc: {multasAtleta.documento} | Modalidad: {multasAtleta.modalidad}</p>
                        </div>
                        
                        <div className="mb-6">
                          <p className="text-slate-400 font-bold mb-2">Asignar nueva multa:</p>
                          <div className="flex gap-2">
                            <select id="selMulta" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                              {penalidades.map(p => <option key={p.id} value={p.id}>{p.nombre} (Gs. {Number(p.monto_gs).toLocaleString('es-PY')})</option>)}
                            </select>
                            <button onClick={async () => {
                              const sel = document.getElementById('selMulta') as HTMLSelectElement;
                              if (!sel.value) return;
                              await fetch(`${API_URL}/api/marciales/participantes/${multasAtleta.id}/multas`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ participante_id: multasAtleta.id, penalidad_id: sel.value })
                              });
                              const mRes = await fetch(`${API_URL}/api/marciales/participantes/${multasAtleta.id}/multas`);
                              setMultasAsignadas(await mRes.json());
                            }} className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">Asignar</button>
                          </div>
                        </div>

                        <div>
                          <p className="text-slate-400 font-bold mb-4">Historial de Deudas:</p>
                          <div className="space-y-3">
                            {multasAsignadas.map(m => (
                              <div key={m.multa_id} className={`p-4 rounded-xl border flex justify-between items-center ${m.estado_pago === 'Pagado' ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                                <div>
                                  <p className="text-white font-bold">{m.nombre}</p>
                                  <p className="text-slate-400 text-sm">Gs. {Number(m.monto_gs).toLocaleString('es-PY')}</p>
                                </div>
                                {m.estado_pago === 'Pagado' ? (
                                  <span className="text-green-500 font-bold flex items-center gap-1">Pagado</span>
                                ) : (
                                  <button onClick={async () => {
                                    await fetch(`${API_URL}/api/marciales/multas/${m.multa_id}/pagar`, { method: 'PUT' });
                                    const mRes = await fetch(`${API_URL}/api/marciales/participantes/${multasAtleta.id}/multas`);
                                    setMultasAsignadas(await mRes.json());
                                  }} className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm">Registrar Pago</button>
                                )}
                              </div>
                            ))}
                            {multasAsignadas.length === 0 && <p className="text-slate-500">Sin deudas registradas.</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 border border-slate-800 border-dashed rounded-2xl">
                        <p className="text-slate-500">Busca a un atleta para ver sus multas.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
