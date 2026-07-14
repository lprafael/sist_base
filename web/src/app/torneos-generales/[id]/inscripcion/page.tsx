'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Trophy, Calendar, ChevronRight, ChevronLeft, Loader2, CheckCircle, Copy, ExternalLink, Tag, User, Phone, Mail, Palette } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

type Torneo = {
  id: string;
  nombre: string;
  descripcion: string;
  deporte: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  costo_inscripcion: number;
  max_equipos: number;
  imagen_portada: string;
  imagen_banner: string;
  organizador_nombre: string;
  competicion_por_atleta: boolean;
  categorias: { id: string; nombre: string; descripcion: string }[];
  equipos_inscritos: number;
  reglas: string[];
};

type FormData = {
  nombre_equipo: string;
  nombre_academia: string;
  capitan_nombre: string;
  capitan_email: string;
  capitan_telefono: string;
  color_principal: string;
  categoria_id: string;
};

type ResultData = {
  equipo_id: string;
  token_delegado: string;
  token_jugadores: string;
  estado_inscripcion: string;
  enlace_delegado: string;
  enlace_jugadores: string;
};

export default function InscripcionPage({ params }: { params: { id: string } }) {
  const torneoId = params.id;
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    nombre_equipo: '',
    nombre_academia: '',
    capitan_nombre: '',
    capitan_email: '',
    capitan_telefono: '',
    color_principal: '#1e3a8a',
    categoria_id: '',
  });

  useEffect(() => {
    fetch(`${API_URL}/cancha/torneos/${torneoId}/info-publica`)
      .then(r => r.json())
      .then(data => { setTorneo(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [torneoId]);

  const totalSteps = torneo?.competicion_por_atleta === false && (torneo?.categorias?.length ?? 0) > 1 ? 2 : 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: any = {
        nombre_equipo: form.nombre_equipo,
        nombre_academia: form.nombre_academia || form.nombre_equipo,
        capitan_nombre: form.capitan_nombre,
        capitan_email: form.capitan_email,
        capitan_telefono: form.capitan_telefono,
        color_principal: form.color_principal,
      };
      if (!torneo?.competicion_por_atleta && form.categoria_id) {
        payload.categoria_id = form.categoria_id;
      }
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/inscripcion-publica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en la inscripción');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <Loader2 className="animate-spin text-white" size={48} />
    </div>
  );

  if (!torneo) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Torneo no encontrado</h1>
        <p className="text-slate-500">El enlace de inscripción no es válido.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Nav scrolled={true} />

      {/* HERO */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {torneo.imagen_banner
          ? <img src={torneo.imagen_banner} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900" />
        }
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-4">
          {torneo.imagen_portada && (
            <img src={torneo.imagen_portada} alt={torneo.nombre}
              className="w-16 h-16 rounded-full border-2 border-white/60 object-cover mb-3 shadow-xl" />
          )}
          <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{torneo.nombre}</h1>
          <p className="text-blue-200 mt-1 font-medium">{torneo.deporte} · Organizado por {torneo.organizador_nombre}</p>
          <div className="flex gap-3 mt-3 flex-wrap justify-center">
            {torneo.fecha_inicio && (
              <span className="flex items-center gap-1 bg-white/10 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                <Calendar size={12} /> {new Date(torneo.fecha_inicio).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1 bg-white/10 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              <Users size={12} /> {torneo.equipos_inscritos} / {torneo.max_equipos} inscritos
            </span>
            {torneo.costo_inscripcion > 0
              ? <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">G. {torneo.costo_inscripcion.toLocaleString()}</span>
              : <span className="bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full">Inscripción Gratuita</span>
            }
          </div>
        </div>
      </div>

      <div className="flex-1 pt-8 pb-16">
        <div className="container max-w-3xl mx-auto px-4">

          {result ? (
            /* RESULTADO EXITOSO */
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-400" />
              <div className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">¡Inscripción Exitosa!</h2>
                <p className="text-slate-500 mb-8">
                  {form.nombre_equipo} ha sido inscrito correctamente. Guarda los siguientes enlaces — son tu acceso al panel de gestión.
                </p>

                <div className="space-y-4 text-left max-w-lg mx-auto">
                  {/* Enlace Delegado */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">D</div>
                      <div>
                        <p className="font-bold text-blue-900 text-sm">Panel del Delegado</p>
                        <p className="text-xs text-blue-600">Gestiona tu equipo, agrega jugadores y asigna categorías</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-200 p-3">
                      <p className="text-xs text-blue-700 font-mono flex-1 truncate">{result.enlace_delegado}</p>
                      <button onClick={() => copyToClipboard(result.enlace_delegado, 'delegado')}
                        className="text-blue-500 hover:text-blue-700 transition flex-shrink-0">
                        {copied === 'delegado' ? <CheckCircle size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <a href={result.enlace_delegado} target="_blank" rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-sm">
                      <ExternalLink size={16} /> Ir al Panel de Delegado
                    </a>
                  </div>

                  {/* Enlace Jugadores */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">J</div>
                      <div>
                        <p className="font-bold text-purple-900 text-sm">Enlace para Jugadores</p>
                        <p className="text-xs text-purple-600">Comparte este enlace para que tus jugadores completen su registro</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-purple-200 p-3">
                      <p className="text-xs text-purple-700 font-mono flex-1 truncate">{result.enlace_jugadores}</p>
                      <button onClick={() => copyToClipboard(result.enlace_jugadores, 'jugadores')}
                        className="text-purple-500 hover:text-purple-700 transition flex-shrink-0">
                        {copied === 'jugadores' ? <CheckCircle size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  {result.estado_inscripcion === 'pendiente' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="text-sm text-amber-800 font-medium">
                        ⚠️ Tu inscripción está <strong>pendiente de confirmación</strong>. El organizador deberá confirmar tu pago para activarla.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* FORMULARIO MULTI-PASO */
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

              {/* Progress */}
              {totalSteps > 1 && (
                <div className="px-8 pt-6 pb-0">
                  <div className="flex items-center gap-3">
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <div key={i} className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > i ? 'bg-blue-600 text-white' : step === i + 1 ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {step > i ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        {i < totalSteps - 1 && (
                          <div className={`h-1 flex-1 rounded-full transition-all ${step > i + 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-8 md:p-10">
                <h2 className="text-2xl font-black text-slate-900 mb-1">Formulario de Inscripción</h2>
                <p className="text-slate-500 mb-8 text-sm">
                  {step === 1 ? 'Completa los datos de tu equipo o academia.' : 'Elige la categoría en la que competirá tu equipo.'}
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 font-medium text-sm">
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Nombre del Equipo / Club *
                        </label>
                        <input
                          required type="text" value={form.nombre_equipo}
                          onChange={e => setForm({ ...form, nombre_equipo: e.target.value })}
                          placeholder="Ej: Cobras FC"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Nombre de la Academia / Dojo (opcional)
                        </label>
                        <input
                          type="text" value={form.nombre_academia}
                          onChange={e => setForm({ ...form, nombre_academia: e.target.value })}
                          placeholder="Ej: Cobra Kai Dojo"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <User size={14} /> Datos del Delegado / Capitán
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Nombre completo *</label>
                          <input
                            required type="text" value={form.capitan_nombre}
                            onChange={e => setForm({ ...form, capitan_nombre: e.target.value })}
                            placeholder="Tu nombre y apellido"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Email *</label>
                          <input
                            required type="email" value={form.capitan_email}
                            onChange={e => setForm({ ...form, capitan_email: e.target.value })}
                            placeholder="tu@email.com"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Teléfono / WhatsApp</label>
                          <input
                            type="tel" value={form.capitan_telefono}
                            onChange={e => setForm({ ...form, capitan_telefono: e.target.value })}
                            placeholder="+595 9xx xxxxxx"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Color del equipo</label>
                          <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <input
                              type="color" value={form.color_principal}
                              onChange={e => setForm({ ...form, color_principal: e.target.value })}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0"
                            />
                            <span className="text-sm text-slate-500 font-mono">{form.color_principal}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Categoría si es por equipo Y hay categorías */}
                    {!torneo.competicion_por_atleta && torneo.categorias.length > 0 && (
                      <div className="border-t border-slate-100 pt-5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Tag size={14} /> Categoría *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {torneo.categorias.map(cat => (
                            <label key={cat.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.categoria_id === cat.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                              <input
                                type="radio" name="categoria" value={cat.id}
                                checked={form.categoria_id === cat.id}
                                onChange={() => setForm({ ...form, categoria_id: cat.id })}
                                className="hidden"
                              />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.categoria_id === cat.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
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

                    {torneo.competicion_por_atleta && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-purple-800 font-medium flex items-center gap-2">
                          <Users size={16} />
                          Este torneo es <strong>por atleta</strong>. Podrás asignar la categoría a cada jugador individualmente desde tu panel de delegado.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* BOTONES */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  {step > 1 && (
                    <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition">
                      <ChevronLeft size={18} /> Volver
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.nombre_equipo || !form.capitan_nombre || !form.capitan_email || (!torneo.competicion_por_atleta && torneo.categorias.length > 1 && !form.categoria_id)}
                    className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all text-sm"
                  >
                    {submitting ? <><Loader2 size={18} className="animate-spin" /> Inscribiendo...</> : <>Confirmar Inscripción <ChevronRight size={18} /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info del torneo */}
          {torneo.reglas.length > 0 && !result && (
            <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Reglamento</h3>
              <ul className="space-y-1">
                {torneo.reglas.map((regla, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 font-bold mt-0.5">{i + 1}.</span>
                    {regla}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
