/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, User, Eye, EyeOff, UtensilsCrossed, 
  ChefHat, Store, ArrowRight, ShieldCheck, 
  Users, Sparkles, CheckCircle2, Clock, Calendar,
  AlertTriangle, PlusCircle, X, HelpCircle, Phone, Mail
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '584709457333-pc1r7el5ic8ap3539dqvuj5v5bqs203r.apps.googleusercontent.com';

export default function CantinaLoginPage() {
  const [modo, setModo] = useState<'admin' | 'personal'>('admin');
  
  // Login Admin State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login Personal State
  const [cantinaSlug, setCantinaSlug] = useState('');
  const [rolPersonal, setRolPersonal] = useState<'cajera' | 'despachante' | 'encargado'>('cajera');
  const [pin, setPin] = useState('');

  // General States
  const [cantinas, setCantinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Modal Solicitud de Cantina
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [solForm, setSolForm] = useState({
    nombre: '',
    evento_nombre: '',
    tipo_temporalidad: 'fin_de_semana',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    solicitante_nombre: '',
    solicitante_email: '',
    solicitante_telefono: '',
    password: '',
    descripcion: ''
  });

  // Cargar cantinas disponibles
  useEffect(() => {
    fetch(`${API_URL}/cantina/lista`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCantinas(data);
          setCantinaSlug(data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  // Manejar Login Tradicional
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const payload: any = {
        rol: modo === 'admin' ? 'admin' : rolPersonal,
        cantina_slug: cantinaSlug || undefined
      };

      if (modo === 'admin') {
        payload.email = adminEmail.trim();
        payload.password = adminPassword;
      } else {
        payload.pin = pin.trim();
      }

      const res = await fetch(`${API_URL}/cantina/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.authorized) {
        const session = {
          access_token: data.token,
          role: 'cantina',
          rol_cantina: data.user.rol,
          cantina_id: data.cantina_id,
          cantina_nombre: data.cantina_nombre,
          cantina_slug: data.cantina_slug,
          evento_nombre: data.evento_nombre,
          name: data.user.nombre,
          email: data.user.email,
          vigencia: data.vigencia,
          authorized: true
        };
        localStorage.setItem('user_session', JSON.stringify(session));
        localStorage.setItem('cantina_session', JSON.stringify(session));
        window.location.href = '/cantina-panel';
      } else {
        setError(data.detail || 'No se pudo iniciar sesión. Verifique los datos.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar Login con Google OAuth
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/cantina/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'aprobada' && data.authorized) {
          const session = {
            access_token: data.token,
            role: 'cantina',
            rol_cantina: data.user.rol,
            cantina_id: data.cantina_id,
            cantina_nombre: data.cantina_nombre,
            cantina_slug: data.cantina_slug,
            evento_nombre: data.evento_nombre,
            mis_cantinas: data.mis_cantinas || [],
            name: data.user.nombre,
            email: data.user.email,
            vigencia: data.vigencia,
            authorized: true
          };
          localStorage.setItem('user_session', JSON.stringify(session));
          localStorage.setItem('cantina_session', JSON.stringify(session));
          window.location.href = '/cantina-panel';
        } else if (data.status === 'pendiente') {
          setInfoMessage(data.message || 'Tu solicitud de cantina está pendiente de habilitación por el Administrador de la Plataforma.');
        } else if (data.status === 'no_registrado') {
          // Pre-llenar modal de solicitud con su Google
          setSolForm(prev => ({
            ...prev,
            solicitante_email: data.email || '',
            solicitante_nombre: data.nombre || ''
          }));
          setModalSolicitud(true);
          setInfoMessage('No tienes una cantina activa con esta cuenta de Google. Puedes solicitar la creación de tu cantina temporal completando el formulario.');
        }
      } else {
        setError(data.detail || 'No se pudo verificar la cuenta de Google.');
      }
    } catch {
      setError('Error al procesar la autenticación de Google.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar Solicitud de Cantina al Super Admin
  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/cantina/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solForm)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSolicitudEnviada(true);
      } else {
        alert(data.detail || 'Error al enviar la solicitud. Verifique los campos.');
      }
    } catch {
      alert('Error de conexión al enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <Link href="/" className="flex items-center justify-center gap-3 text-decoration-none mb-6 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white block">
                Mi<span className="text-orange-500">Cancha</span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400/80 -mt-1 block">
                Módulo Cantinas & Buffet
              </span>
            </div>
          </Link>

          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
            Portal de Cantina
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Ingreso para Administradores de Concesión y Personal de Mostrador
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl">
            
            {/* TABS DE MODO DE INGRESO */}
            <div className="flex rounded-2xl bg-slate-950/60 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => { setModo('admin'); setError(''); setInfoMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  modo === 'admin' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Administrador de Cantina
              </button>
              <button
                type="button"
                onClick={() => { setModo('personal'); setError(''); setInfoMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  modo === 'personal' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-4 h-4" />
                Personal / Mostrador (PIN)
              </button>
            </div>

            {/* ALERTA DE INFORMACIÓN / ESTADO */}
            {infoMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start gap-3">
                <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <h5 className="font-bold text-amber-200">Aviso de Estado</h5>
                  <p className="mt-0.5 text-amber-300/90">{infoMessage}</p>
                </div>
              </div>
            )}

            {/* ALERTA DE ERROR */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <h5 className="font-bold text-rose-200">Error de Acceso</h5>
                  <p className="mt-0.5 text-rose-300/90">{error}</p>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* FORMULARIO MODO: ADMINISTRADOR DE CANTINA */}
            {/* ============================================================== */}
            {modo === 'admin' ? (
              <div>
                {/* Botón de Google OAuth para Administradores */}
                <div className="mb-6 text-center">
                  <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">
                    Acceso Rápido con Google
                  </p>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Error de conexión con Google OAuth')}
                      theme="filled_black"
                      shape="pill"
                      text="signin_with"
                      locale="es"
                    />
                  </div>
                </div>

                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative bg-slate-900 px-3 text-xs text-slate-500 font-medium uppercase tracking-wider">
                    O con email y contraseña
                  </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Selector de Cantina (si hay más de una) */}
                  {cantinas.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Cantina a Gestionar
                      </label>
                      <select
                        value={cantinaSlug}
                        onChange={e => setCantinaSlug(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                      >
                        {cantinas.map(c => (
                          <option key={c.slug} value={c.slug}>
                            {c.nombre} {c.evento_nombre ? `(${c.evento_nombre})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Correo Electrónico del Administrador
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="tu-email@ejemplo.com"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Tu contraseña..."
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar como Administrador'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* BOTÓN SOLICITAR CANTINA */}
                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-2">
                    ¿Vas a coordinar el buffet de un nuevo torneo o jornada deportiva?
                  </p>
                  <button
                    type="button"
                    onClick={() => { setModalSolicitud(true); setSolicitudEnviada(false); }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Solicitar Habilitación de Cantina al Administrador
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================== */
              /* FORMULARIO MODO: PERSONAL / MOSTRADOR (PIN RÁPIDO) */
              /* ============================================================== */
              <div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      1. Cantina / Concesión Activa
                    </label>
                    <select
                      value={cantinaSlug}
                      onChange={e => setCantinaSlug(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                    >
                      {cantinas.map(c => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre} {c.evento_nombre ? `• ${c.evento_nombre}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      2. Puesto en este Turno
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cajera', titulo: 'Cajera / POS', icon: Store },
                        { id: 'despachante', titulo: 'Despacho', icon: ChefHat },
                        { id: 'encargado', titulo: 'Encargado', icon: Users }
                      ].map(r => {
                        const Icon = r.icon;
                        const isSel = rolPersonal === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRolPersonal(r.id as any)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                              isSel 
                                ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold' 
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs">{r.titulo}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        3. PIN de 4 Dígitos
                      </label>
                      <span className="text-[11px] text-slate-500">Asignado por el Administrador</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        placeholder="Ej: 1234"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-lg text-slate-100 placeholder-slate-700 focus:outline-none focus:border-orange-500 tracking-widest font-mono text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar al Mostrador'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-6 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>
                    Los perfiles de cajeros y despachantes son cargados exclusivamente por el Administrador de la Cantina desde su panel de control.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            ¿Querés ver el menú público disponible?{' '}
            <Link href={`/cantina/menu/${cantinaSlug || 'cantina-central'}`} className="text-orange-400 hover:underline font-semibold">
              Abrir Menú Digital QR
            </Link>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MODAL: SOLICITAR NUEVA CANTINA TEMPORAL */}
        {/* ================================================================ */}
        {modalSolicitud && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
              <button
                onClick={() => setModalSolicitud(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {!solicitudEnviada ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Solicitar Cantina Temporal
                      </h3>
                      <p className="text-xs text-slate-400">
                        El Administrador de la Plataforma habilitará tu concesión
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleEnviarSolicitud} className="space-y-3.5 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nombre de la Cantina / Buffet *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Cantina Club Sol de América"
                        value={solForm.nombre}
                        onChange={e => setSolForm({ ...solForm, nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Torneo o Evento Deportivo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Torneo Clausura Sub 16"
                        value={solForm.evento_nombre}
                        onChange={e => setSolForm({ ...solForm, evento_nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Duración / Tipo de Temporalidad *
                      </label>
                      <select
                        value={solForm.tipo_temporalidad}
                        onChange={e => setSolForm({ ...solForm, tipo_temporalidad: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                      >
                        <option value="dia">1 Solo Día (Jornada única de evento)</option>
                        <option value="fin_de_semana">Fines de Semana (Sábados y Domingos)</option>
                        <option value="semana">1 Semana (Torneo semanal continuo)</option>
                        <option value="personalizado">Rango de Fechas Personalizado</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Fecha Inicio *
                        </label>
                        <input
                          type="date"
                          required
                          value={solForm.fecha_inicio}
                          onChange={e => setSolForm({ ...solForm, fecha_inicio: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Fecha Fin *
                        </label>
                        <input
                          type="date"
                          required
                          value={solForm.fecha_fin}
                          onChange={e => setSolForm({ ...solForm, fecha_fin: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                        Datos del Administrador de la Cantina
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Nombre del Responsable *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nombre y apellido"
                            value={solForm.solicitante_nombre}
                            onChange={e => setSolForm({ ...solForm, solicitante_nombre: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Email de Ingreso *
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="admin@cantina.com"
                              value={solForm.solicitante_email}
                              onChange={e => setSolForm({ ...solForm, solicitante_email: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Teléfono / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="0981-123-456"
                              value={solForm.solicitante_telefono}
                              onChange={e => setSolForm({ ...solForm, solicitante_telefono: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Contraseña para ingresar
                          </label>
                          <input
                            type="password"
                            placeholder="Opcional si vas a ingresar con Google"
                            value={solForm.password}
                            onChange={e => setSolForm({ ...solForm, password: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Enviando solicitud...' : 'Enviar Solicitud de Habilitación'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    ¡Solicitud Enviada con Éxito!
                  </h3>
                  <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Tu solicitud para <strong className="text-orange-400">{solForm.nombre}</strong> fue recibida.
                    El Administrador de la Plataforma habilitará tu cantina para las fechas solicitadas.
                  </p>
                  <div className="mt-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-left">
                    <p className="font-semibold text-slate-200 mb-1">Próximos pasos:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>El administrador habilita tu cantina en el sistema.</li>
                      <li>Inicias sesión con tu email o Google como Administrador de la Cantina.</li>
                      <li>Cargas a tus cajeras y despachantes con sus PINs rápidos.</li>
                    </ol>
                  </div>
                  <button
                    onClick={() => { setModalSolicitud(false); setSolicitudEnviada(false); }}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    Entendido, cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
