'use client';

import { useState, useEffect } from 'react';
import {
  Users, Plus, Copy, CheckCircle, ExternalLink, ChevronDown,
  ChevronUp, Loader2, Tag, User, Phone, Shield, ShieldCheck,
  Edit3, Trash2, Send, AlertCircle, BarChart3
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

type Jugador = {
  id: string;
  nombre: string;
  dni: string;
  fecha_nacimiento: string | null;
  numero_camiseta: number | null;
  posicion: string | null;
  foto_url: string | null;
  estado: string;
  email: string | null;
  token_jugador: string | null;
  categoria_id: string | null;
  categoria_nombre: string | null;
  peso_verificado: number | null;
  estatura_verificada: number | null;
  biometria_aprobada: boolean;
};

type Categoria = { id: string; nombre: string; descripcion: string };
type Equipo = {
  id: string;
  nombre: string;
  nombre_academia: string;
  logo_url: string | null;
  color_principal: string;
  capitan_nombre: string;
  capitan_email: string;
  capitan_telefono: string;
  estado_inscripcion: string;
  token_jugadores: string;
  categoria_id: string | null;
};
type Torneo = {
  id: string;
  nombre: string;
  deporte: string;
  estado: string;
  imagen_portada: string | null;
  costo_inscripcion: number;
  competicion_por_atleta: boolean;
};
type PanelData = {
  equipo: Equipo;
  torneo: Torneo;
  jugadores: Jugador[];
  categorias: Categoria[];
  enlace_jugadores: string;
};

export default function DelegadosPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [assigningCat, setAssigningCat] = useState<string | null>(null);
  const [expandedJugador, setExpandedJugador] = useState<string | null>(null);

  const [newJugador, setNewJugador] = useState({
    nombre: '', dni: '', fecha_nacimiento: '', email: '',
    numero_camiseta: '', posicion: '', categoria_id: '',
  });

  const fetchPanel = () => {
    setLoading(true);
    fetch(`${API_URL}/cancha/torneos/delegados/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) { setError(d.detail); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Error de conexión'); setLoading(false); });
  };

  useEffect(() => { fetchPanel(); }, [token]);

  const copyLink = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleAddJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      const payload: any = {
        nombre: newJugador.nombre,
        dni: newJugador.dni || 'PENDIENTE',
        fecha_nacimiento: newJugador.fecha_nacimiento || null,
        email: newJugador.email || null,
        numero_camiseta: newJugador.numero_camiseta ? parseInt(newJugador.numero_camiseta) : null,
        posicion: newJugador.posicion || null,
      };
      const res = await fetch(`${API_URL}/cancha/torneos/delegados/${token}/jugadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al agregar');
      setNewJugador({ nombre: '', dni: '', fecha_nacimiento: '', email: '', numero_camiseta: '', posicion: '', categoria_id: '' });
      setShowAddForm(false);
      fetchPanel();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAsignarCategoria = async (jugador_id: string, categoria_id: string) => {
    setAssigningCat(jugador_id);
    try {
      await fetch(`${API_URL}/cancha/torneos/delegados/${token}/jugadores/${jugador_id}/categoria?categoria_id=${categoria_id}`, {
        method: 'PATCH',
      });
      fetchPanel();
    } finally {
      setAssigningCat(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
      <div className="text-center text-white">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p className="font-medium">Cargando panel de delegado...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Enlace no válido</h1>
        <p className="text-slate-500">{error || 'Este enlace de delegado no es válido o ha expirado.'}</p>
      </div>
    </div>
  );

  const { equipo, torneo, jugadores, categorias, enlace_jugadores } = data;
  const porAtleta = torneo.competicion_por_atleta;
  const porcentajeCompleto = jugadores.length > 0
    ? Math.round((jugadores.filter(j => j.dni && j.dni !== 'PENDIENTE').length / jugadores.length) * 100)
    : 0;

  const estadoColor: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700',
    pendiente: 'bg-amber-100 text-amber-700',
    eliminado: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Nav scrolled={true} />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 pt-24 pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl"
              style={{ backgroundColor: equipo.color_principal || '#1e3a8a' }}>
              {equipo.nombre.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">{equipo.nombre}</h1>
              {equipo.nombre_academia && equipo.nombre_academia !== equipo.nombre && (
                <p className="text-blue-300 text-sm">{equipo.nombre_academia}</p>
              )}
              <p className="text-blue-200 text-sm mt-1">{torneo.nombre} · {torneo.deporte}</p>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-white">{jugadores.length}</p>
              <p className="text-blue-200 text-xs font-medium">Jugadores</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-white">{porcentajeCompleto}%</p>
              <p className="text-blue-200 text-xs font-medium">Datos completos</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${estadoColor[equipo.estado_inscripcion] || 'bg-slate-100 text-slate-600'}`}>
                {equipo.estado_inscripcion === 'confirmado' ? 'Confirmado' : equipo.estado_inscripcion === 'pendiente' ? 'Pendiente' : equipo.estado_inscripcion}
              </span>
              <p className="text-blue-200 text-xs font-medium mt-1">Estado</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ENLACE PARA JUGADORES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Send size={18} className="text-purple-500" />
            Enlace de Auto-registro para Jugadores
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Comparte este enlace con tus jugadores para que completen sus datos y se inscriban al torneo.
          </p>
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-sm text-purple-700 font-mono flex-1 truncate">{enlace_jugadores}</p>
            <button onClick={() => copyLink(enlace_jugadores, 'jugadores')}
              className="text-purple-500 hover:text-purple-700 transition flex-shrink-0">
              {copied === 'jugadores' ? <CheckCircle size={20} /> : <Copy size={20} />}
            </button>
            <a href={enlace_jugadores} target="_blank" rel="noopener noreferrer"
              className="text-purple-500 hover:text-purple-700 transition flex-shrink-0">
              <ExternalLink size={20} />
            </a>
          </div>
        </div>

        {/* LISTA DE JUGADORES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              Jugadores ({jugadores.length})
            </h2>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition"
            >
              <Plus size={16} /> Agregar Jugador
            </button>
          </div>

          {/* FORMULARIO AGREGAR */}
          {showAddForm && (
            <form onSubmit={handleAddJugador} className="p-6 bg-blue-50 border-b border-blue-100">
              <h3 className="font-bold text-blue-800 mb-4">Nuevo Jugador</h3>
              {addError && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{addError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
                  <input required type="text" value={newJugador.nombre} onChange={e => setNewJugador({ ...newJugador, nombre: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CI / DNI</label>
                  <input type="text" value={newJugador.dni} onChange={e => setNewJugador({ ...newJugador, dni: e.target.value })}
                    placeholder="Puede completarlo el jugador"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                  <input type="email" value={newJugador.email} onChange={e => setNewJugador({ ...newJugador, email: e.target.value })}
                    placeholder="Para enviarle su enlace"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Nac.</label>
                  <input type="date" value={newJugador.fecha_nacimiento} onChange={e => setNewJugador({ ...newJugador, fecha_nacimiento: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">N° Camiseta</label>
                  <input type="number" value={newJugador.numero_camiseta} onChange={e => setNewJugador({ ...newJugador, numero_camiseta: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Posición / Disciplina</label>
                  <input type="text" value={newJugador.posicion} onChange={e => setNewJugador({ ...newJugador, posicion: e.target.value })}
                    placeholder="Ej: Delantero / BJJ"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                </div>
              </div>
              {/* Categoría si es por atleta */}
              {porAtleta && categorias.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Categoría (opcional, el jugador también puede elegirla)</label>
                  <select value={newJugador.categoria_id} onChange={e => setNewJugador({ ...newJugador, categoria_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="">— Sin categoría asignada —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={addLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition disabled:opacity-50">
                  {addLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Agregar
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="text-slate-500 hover:text-slate-700 font-medium text-sm px-4 py-2 transition">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* LISTA */}
          {jugadores.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Todavía no hay jugadores registrados.</p>
              <p className="text-slate-400 text-sm mt-1">Agrega jugadores manualmente o comparte el enlace de auto-registro.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {jugadores.map(j => {
                const isExpanded = expandedJugador === j.id;
                const datosCompletos = j.dni && j.dni !== 'PENDIENTE';
                const playerLink = j.token_jugador ? `${typeof window !== 'undefined' ? window.location.origin : ''}/jugadores/registro/${j.token_jugador}` : '';

                return (
                  <li key={j.id} className="hover:bg-slate-50 transition">
                    <div
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer"
                      onClick={() => setExpandedJugador(isExpanded ? null : j.id)}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm shadow`}
                        style={{ backgroundColor: equipo.color_principal || '#1e3a8a' }}>
                        {j.numero_camiseta || j.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{j.nombre}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {j.categoria_nombre && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{j.categoria_nombre}</span>
                          )}
                          {!datosCompletos && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Datos pendientes</span>
                          )}
                          {j.biometria_aprobada && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <ShieldCheck size={10} /> Verificado
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>

                    {/* EXPANDIDO */}
                    {isExpanded && (
                      <div className="px-6 pb-5 border-t border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                          <div><p className="text-xs text-slate-400 font-bold mb-0.5">CI / DNI</p><p className="text-slate-700">{j.dni || '—'}</p></div>
                          <div><p className="text-xs text-slate-400 font-bold mb-0.5">Nacimiento</p><p className="text-slate-700">{j.fecha_nacimiento || '—'}</p></div>
                          <div><p className="text-xs text-slate-400 font-bold mb-0.5">Email</p><p className="text-slate-700 truncate">{j.email || '—'}</p></div>
                          <div><p className="text-xs text-slate-400 font-bold mb-0.5">Posición</p><p className="text-slate-700">{j.posicion || '—'}</p></div>
                          {j.peso_verificado && <div><p className="text-xs text-slate-400 font-bold mb-0.5">Peso</p><p className="text-slate-700">{j.peso_verificado} kg</p></div>}
                          {j.estatura_verificada && <div><p className="text-xs text-slate-400 font-bold mb-0.5">Estatura</p><p className="text-slate-700">{j.estatura_verificada} m</p></div>}
                        </div>

                        {/* Asignar categoría (modo por atleta) */}
                        {porAtleta && categorias.length > 0 && (
                          <div className="mt-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                              <Tag size={12} /> Categoría del atleta
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={j.categoria_id || ''}
                                onChange={e => handleAsignarCategoria(j.id, e.target.value)}
                                disabled={assigningCat === j.id}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                              >
                                <option value="">— Sin categoría —</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                              </select>
                              {assigningCat === j.id && <Loader2 size={16} className="animate-spin text-blue-500" />}
                            </div>
                          </div>
                        )}

                        {/* Enlace de auto-registro individual */}
                        {j.token_jugador && (
                          <div className="mt-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                              <Send size={12} /> Enlace personal del jugador
                            </label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                              <p className="text-xs text-slate-500 font-mono flex-1 truncate">{playerLink}</p>
                              <button onClick={() => copyLink(playerLink, j.id)}
                                className="text-slate-400 hover:text-blue-500 transition flex-shrink-0">
                                {copied === j.id ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* INFO DEL TORNEO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Shield size={18} className="text-blue-500" /> Estado de la Inscripción
          </h2>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl font-bold text-sm ${estadoColor[equipo.estado_inscripcion] || 'bg-slate-100 text-slate-600'}`}>
              {equipo.estado_inscripcion === 'confirmado' ? '✓ Inscripción Confirmada' :
               equipo.estado_inscripcion === 'pendiente' ? '⏳ Pendiente de Confirmación' : equipo.estado_inscripcion}
            </div>
          </div>
          {equipo.estado_inscripcion === 'pendiente' && torneo.costo_inscripcion > 0 && (
            <p className="text-sm text-amber-600 mt-3">
              El organizador confirmará tu inscripción una vez verificado el pago de <strong>G. {torneo.costo_inscripcion.toLocaleString()}</strong>.
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500 space-y-1">
            <p><span className="font-bold text-slate-600">Delegado:</span> {equipo.capitan_nombre}</p>
            <p><span className="font-bold text-slate-600">Email:</span> {equipo.capitan_email}</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
