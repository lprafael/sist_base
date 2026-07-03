'use client';

import { useState, useEffect } from 'react';
import {
  LogOut, RefreshCw, Layers, Power, 
  Activity, Users, ShieldAlert, Scale,
  Trophy, UserCheck, AlertTriangle
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
// Hardcoded tournament ID for testing purposes (created by temp script)
const TORNEO_ID = 'e600c29d-f547-460a-85ec-6dff9c221f41';

export default function AdminGeneralesPage() {
  const [activeTab, setActiveTab] = useState('checkin');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  // Checkin state
  const [participanteIdCheckin, setParticipanteIdCheckin] = useState('1'); // Mock ID for testing
  const [pesoReal, setPesoReal] = useState('');
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<{loading: boolean, success?: boolean, error?: string}>({loading: false});

  // Agrupacion state
  const [agrupacionStatus, setAgrupacionStatus] = useState<{loading: boolean, success?: boolean, error?: string, message?: string}>({loading: false});

  // Veedores state
  const [puntajeRojo, setPuntajeRojo] = useState(0);
  const [puntajeAzul, setPuntajeAzul] = useState(0);

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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    window.location.href = '/login';
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinStatus({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/marciales/participantes/${participanteIdCheckin}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso_real: parseFloat(pesoReal),
          pago_confirmado: pagoConfirmado,
          observaciones: "Check-in presencial"
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
    setAgrupacionStatus({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos/${TORNEO_ID}/agrupacion-dinamica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reglas: {
            diferencia_peso_maxima: 5.0,
            diferencia_edad_maxima: 2
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error agrupando");
      setAgrupacionStatus({ loading: false, success: true, message: data.mensaje || "Agrupación completada" });
    } catch (err: any) {
      setAgrupacionStatus({ loading: false, error: err.message });
    }
  };

  const handleScore = (color: 'rojo'|'azul', points: number) => {
    if (color === 'rojo') setPuntajeRojo(prev => prev + points);
    else setPuntajeAzul(prev => prev + points);
    // Here we would call POST /encuentros/{id}/puntuacion
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
              { id: 'dashboard', icon: Activity, label: 'Resumen Torneo' },
              { id: 'checkin', icon: Scale, label: 'Check-in (Pesaje)' },
              { id: 'agrupacion', icon: Layers, label: 'Agrupación (Llaves)' },
              { id: 'veedores', icon: Trophy, label: 'Mesa Veedores' },
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
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-3xl font-black text-white mb-2">Resumen del Torneo</h1>
                <p className="text-slate-400 mb-8 font-medium">Estadísticas y estado actual del evento.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Mock Stats */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <Users className="text-red-500 mb-4" size={28} />
                    <p className="text-slate-400 text-sm font-bold mb-1">Competidores Inscritos</p>
                    <p className="text-4xl font-black text-white">142</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <UserCheck className="text-green-500 mb-4" size={28} />
                    <p className="text-slate-400 text-sm font-bold mb-1">Check-in Completado</p>
                    <p className="text-4xl font-black text-white">89</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <Activity className="text-blue-500 mb-4" size={28} />
                    <p className="text-slate-400 text-sm font-bold mb-1">Encuentros en Curso</p>
                    <p className="text-4xl font-black text-white">4</p>
                  </div>
                </div>
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
                      disabled={checkinStatus.loading}
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
                    disabled={agrupacionStatus.loading}
                    className="bg-red-600 hover:bg-red-500 text-white font-black text-lg py-4 px-12 rounded-xl shadow-lg shadow-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {agrupacionStatus.loading ? 'Ejecutando algoritmo...' : 'Generar Llaves Ahora'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'veedores' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-2">Mesa de Veedores</h1>
                    <p className="text-slate-400 font-medium">Tatami 1: Semifinal Karate (Hasta 75kg)</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setPuntajeRojo(0); setPuntajeAzul(0);}} className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-lg hover:bg-slate-700">Reiniciar</button>
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
          </div>
        </main>
      </div>
    </div>
  );
}
