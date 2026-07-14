'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, Loader2, AlertCircle, ShieldCheck, Tag,
  User, Scale, Trophy
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

type PageData = {
  jugador: {
    id: string;
    nombre: string | null;
    dni: string | null;
    fecha_nacimiento: string | null;
    numero_camiseta: number | null;
    posicion: string | null;
    foto_url: string | null;
    estado: string;
    email: string | null;
    peso_verificado: number | null;
    estatura_verificada: number | null;
    categoria_id: string | null;
  };
  equipo: { nombre: string; nombre_academia: string; color_principal: string };
  torneo: { id: string; nombre: string; deporte: string; imagen_portada: string | null; competicion_por_atleta: boolean };
  categorias: { id: string; nombre: string; descripcion: string }[];
};

export default function JugadorRegistroPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');

  const [form, setForm] = useState({
    nombre: '', dni: '', fecha_nacimiento: '', email: '',
    numero_camiseta: '', posicion: '', peso_declarado: '',
    estatura_declarada: '', categoria_id: '',
  });

  useEffect(() => {
    fetch(`${API_URL}/cancha/torneos/jugadores/token/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) { setPageError(d.detail); setLoading(false); return; }
        setData(d);
        setForm({
          nombre: d.jugador.nombre || '',
          dni: (d.jugador.dni && d.jugador.dni !== 'PENDIENTE') ? d.jugador.dni : '',
          fecha_nacimiento: d.jugador.fecha_nacimiento || '',
          email: d.jugador.email || '',
          numero_camiseta: d.jugador.numero_camiseta ? String(d.jugador.numero_camiseta) : '',
          posicion: d.jugador.posicion || '',
          peso_declarado: d.jugador.peso_verificado ? String(d.jugador.peso_verificado) : '',
          estatura_declarada: d.jugador.estatura_verificada ? String(d.jugador.estatura_verificada) : '',
          categoria_id: d.jugador.categoria_id || '',
        });
        setLoading(false);
      })
      .catch(() => { setPageError('Error de conexión'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: any = {
        nombre: form.nombre || undefined,
        dni: form.dni || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        email: form.email || undefined,
        numero_camiseta: form.numero_camiseta ? parseInt(form.numero_camiseta) : undefined,
        posicion: form.posicion || undefined,
        peso_declarado: form.peso_declarado ? parseFloat(form.peso_declarado) : undefined,
        estatura_declarada: form.estatura_declarada ? parseFloat(form.estatura_declarada) : undefined,
        categoria_id: form.categoria_id || undefined,
      };
      const res = await fetch(`${API_URL}/cancha/torneos/jugadores/token/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al guardar');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-blue-500" />
    </div>
  );

  if (pageError || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Enlace no válido</h1>
        <p className="text-slate-500">{pageError || 'Tu enlace de registro no es válido o ha expirado.'}</p>
      </div>
    </div>
  );

  const { jugador, equipo, torneo, categorias } = data;
  const porAtleta = torneo.competicion_por_atleta;
  const color = equipo.color_principal || '#1e3a8a';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Nav scrolled={true} />

      {/* BANNER */}
      <div className="relative pt-20 pb-10 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color} 0%, #0f172a 100%)` }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          {torneo.imagen_portada && (
            <img src={torneo.imagen_portada} alt="" className="w-14 h-14 rounded-full border-2 border-white/40 mx-auto mb-3 object-cover shadow-lg" />
          )}
          <p className="text-white/60 text-sm font-medium mb-1">{equipo.nombre_academia || equipo.nombre}</p>
          <h1 className="text-2xl md:text-3xl font-black text-white">{torneo.nombre}</h1>
          <p className="text-white/70 text-sm mt-2">{torneo.deporte} · Formulario de Inscripción del Atleta</p>
        </div>
      </div>

      <div className="flex-1 pb-16">
        <div className="max-w-2xl mx-auto px-4 -mt-5">

          {done ? (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-400" />
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">¡Registro Completado!</h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                  Tus datos han sido registrados correctamente. El día del evento, preséntate con tu documento de identidad para el check-in.
                </p>
                <div className="mt-6 bg-slate-50 rounded-2xl p-5 inline-block text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Atleta registrado:</p>
                  <p className="text-xl font-black text-slate-900">{form.nombre || jugador.nombre}</p>
                  <p className="text-sm text-slate-500 mt-1">{equipo.nombre_academia || equipo.nombre}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-2" style={{ background: `linear-gradient(to right, ${color}, #6366f1)` }} />
              <div className="p-6 md:p-10">
                <h2 className="text-xl font-black text-slate-900 mb-1">Completa tus Datos</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Estás registrándote como atleta de <strong>{equipo.nombre_academia || equipo.nombre}</strong>.
                  Completa todos tus datos para confirmar tu participación.
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 mb-6 text-sm font-medium">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* DATOS PERSONALES */}
                  <div>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <User size={15} className="text-blue-500" /> Datos Personales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nombre completo *</label>
                        <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">CI / DNI *</label>
                        <input required type="text" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Fecha de Nacimiento *</label>
                        <input required type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                    </div>
                  </div>

                  {/* DATOS FÍSICOS */}
                  <div>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <Scale size={15} className="text-blue-500" /> Datos Físicos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Peso declarado (kg) *</label>
                        <input required type="number" step="0.1" placeholder="Ej: 75.5" value={form.peso_declarado}
                          onChange={e => setForm({ ...form, peso_declarado: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Estatura (m)</label>
                        <input type="number" step="0.01" placeholder="Ej: 1.75" value={form.estatura_declarada}
                          onChange={e => setForm({ ...form, estatura_declarada: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                    </div>
                  </div>

                  {/* DATOS DEPORTIVOS */}
                  <div>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <Trophy size={15} className="text-blue-500" /> Datos Deportivos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">N° / Dorsal</label>
                        <input type="number" value={form.numero_camiseta} onChange={e => setForm({ ...form, numero_camiseta: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Posición / Disciplina</label>
                        <input type="text" placeholder="Ej: Karate, BJJ..." value={form.posicion}
                          onChange={e => setForm({ ...form, posicion: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50" />
                      </div>
                    </div>
                  </div>

                  {/* CATEGORÍA */}
                  {porAtleta && categorias.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                        <Tag size={15} className="text-indigo-500" /> Tu Categoría *
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categorias.map(cat => (
                          <label key={cat.id}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.categoria_id === cat.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                            <input type="radio" name="categoria" value={cat.id}
                              checked={form.categoria_id === cat.id}
                              onChange={() => setForm({ ...form, categoria_id: cat.id })}
                              className="hidden" />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.categoria_id === cat.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                              {form.categoria_id === cat.id && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{cat.nombre}</p>
                              {cat.descripcion && <p className="text-xs text-slate-500">{cat.descripcion}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !form.nombre || !form.dni || !form.fecha_nacimiento || !form.peso_declarado || (porAtleta && categorias.length > 0 && !form.categoria_id)}
                    className="w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-base"
                    style={{ background: `linear-gradient(to right, ${color}, #4f46e5)` }}
                  >
                    {submitting
                      ? <><Loader2 size={20} className="animate-spin" /> Guardando...</>
                      : <><CheckCircle size={20} /> Confirmar mi Inscripción</>
                    }
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Al confirmar, aceptas el reglamento del torneo y te comprometes a presentar tu documento original en el check-in.
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
