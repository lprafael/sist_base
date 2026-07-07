"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Trophy, 
  UploadCloud, 
  Users, 
  User, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  FileText, 
  ShieldAlert,
  Loader2,
  Trash2,
  Calendar,
  CreditCard,
  Mail,
  UserPlus,
  Share2,
  Copy,
  CheckCheck,
  QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export default function DelegadoPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null); // { equipo, torneo, jugadores }
  const [inviteCopied, setInviteCopied] = useState(false);
  const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Estados para la carga de logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Estados para el registro de jugador
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingPlayer, setSubmittingPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState({
    nombre: "",
    dni: "",
    email: "",
    fecha_nacimiento: "",
    numero_camiseta: "",
    posicion: "Defensor",
    es_exalumno: true,
    egreso_ano: "",
    foto_url: "",
    documento_firmado_url: "",
    cedula_anverso_url: "",
    cedula_reverso_url: ""
  });

  // Estados de carga individual de archivos de documentación
  const [fileLoading, setFileLoading] = useState({
    foto: false,
    doc_firmado: false,
    ced_anverso: false,
    ced_reverso: false
  });

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/cancha/torneos/equipos/token/${token}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Enlace no válido o expirado.");
      }
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar la información del delegado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setUploadingLogo(true);
      const res = await fetch(`${API_URL}/cancha/torneos/equipos/token/${token}/logo`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al subir el logo");
      }
      const resData = await res.json();
      setData((prev: any) => ({
        ...prev,
        equipo: { ...prev.equipo, logo_url: resData.logo_url }
      }));
      alert("Logo de equipo actualizado con éxito.");
    } catch (err: any) {
      alert(err.message || "Error al subir logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "foto" | "doc_firmado" | "ced_anverso" | "ced_reverso") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setFileLoading(prev => ({ ...prev, [fieldName]: true }));
      const res = await fetch(`${API_URL}/cancha/torneos/documentacion/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al subir archivo");
      }
      const resData = await res.json();
      
      // Mapear el campo cargado al formulario
      let formField = "";
      if (fieldName === "foto") formField = "foto_url";
      else if (fieldName === "doc_firmado") formField = "documento_firmado_url";
      else if (fieldName === "ced_anverso") formField = "cedula_anverso_url";
      else if (fieldName === "ced_reverso") formField = "cedula_reverso_url";

      setPlayerForm(prev => ({ ...prev, [formField]: resData.url }));
    } catch (err: any) {
      alert(err.message || "Error al subir el documento.");
    } finally {
      setFileLoading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar carga de documentación requerida obligatoriamente
    if (!playerForm.foto_url) {
      alert("Es obligatoria la foto del jugador para el reconocimiento facial.");
      return;
    }
    if (!playerForm.cedula_anverso_url || !playerForm.cedula_reverso_url) {
      alert("Es obligatorio alzar las fotos de la cédula (anverso y reverso) del jugador.");
      return;
    }
    if (!playerForm.documento_firmado_url) {
      alert("Es obligatorio alzar el documento firmado por el jugador.");
      return;
    }

    try {
      setSubmittingPlayer(true);
      const payload = {
        ...playerForm,
        numero_camiseta: playerForm.numero_camiseta ? parseInt(playerForm.numero_camiseta) : null,
        egreso_ano: playerForm.egreso_ano ? parseInt(playerForm.egreso_ano) : null,
      };

      const res = await fetch(`${API_URL}/cancha/torneos/equipos/token/${token}/jugadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al agregar jugador.");
      }

      // Reiniciar formulario y cerrar modal
      setPlayerForm({
        nombre: "",
        dni: "",
        email: "",
        fecha_nacimiento: "",
        numero_camiseta: "",
        posicion: "Defensor",
        es_exalumno: true,
        egreso_ano: "",
        foto_url: "",
        documento_firmado_url: "",
        cedula_anverso_url: "",
        cedula_reverso_url: ""
      });
      setIsModalOpen(false);
      await loadData();
      alert("¡Jugador agregado al plantel exitosamente!");
    } catch (err: any) {
      alert(err.message || "Error al procesar registro.");
    } finally {
      setSubmittingPlayer(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Trophy className="w-16 h-16 text-emerald-500 animate-bounce mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Panel de Delegado...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black mb-2 text-white">Acceso no Autorizado</h2>
        <p className="text-slate-400 max-w-md mb-6">{error || "El enlace provisto es inválido o el torneo ha sido finalizado."}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 transition rounded-full text-sm font-semibold border border-slate-700">
          Reintentar Cargar
        </button>
      </div>
    );
  }

  const { equipo, torneo, jugadores } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
      
      {/* HEADER DE BIENVENIDA */}
      <header className="relative py-12 px-6 overflow-hidden border-b border-slate-900 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center group-hover:border-emerald-500 transition-colors duration-300">
                {equipo.logo_url ? (
                  <img src={`${API_URL}${equipo.logo_url}`} alt={equipo.nombre} className="w-full h-full object-contain p-2" />
                ) : (
                  <Trophy className="w-10 h-10 text-slate-700 group-hover:text-emerald-500 transition-colors" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105 duration-200">
                <UploadCloud className="w-4 h-4" />
                <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" />
              </label>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Delegado Oficial
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                  Promo {equipo.promocion}
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">{equipo.nombre}</h1>
              <p className="text-sm text-slate-400">Torneo: <span className="text-slate-200 font-semibold">{torneo.nombre} ({torneo.deporte})</span></p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full font-bold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Inscribir Jugador
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto py-12 px-6">
        
        {/* RESUMEN DEL EQUIPO */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-md flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Plantel Registrado</p>
              <p className="text-2xl font-black text-white">{jugadores.length} Jugadores</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-md flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Delegado a Cargo</p>
              <p className="text-sm font-bold text-white">{equipo.capitan_nombre || "Sin Asignar"}</p>
              <p className="text-xs text-slate-400">{equipo.capitan_email}</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-md flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Formato del Torneo</p>
              <p className="text-sm font-bold text-white capitalize">{torneo.formato}</p>
              <p className="text-xs text-slate-400">Categoría: {torneo.estado}</p>
            </div>
          </div>
        </section>

        {/* INVITAR JUGADORES */}
        {equipo.token_jugadores && (
          <section className="mb-10 p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/20">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 flex justify-center">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(SITE_URL + '/jugadores/registro/' + equipo.token_jugadores)}`}
                    alt="QR Jugadores"
                    className="w-32 h-32"
                  />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-black text-white mb-1">Invitar Jugadores al Plantel</h3>
                <p className="text-slate-400 text-sm mb-4">Compartí este link o QR a tus jugadores para que se registren solos desde su celular.</p>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mb-3">
                  <span className="text-slate-400 text-xs truncate flex-1">{SITE_URL}/jugadores/registro/{equipo.token_jugadores}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(SITE_URL + '/jugadores/registro/' + equipo.token_jugadores); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
                    className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                  >
                    {inviteCopied ? <CheckCheck size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Registrate en el plantel de ' + equipo.nombre + ' aqui: ' + SITE_URL + '/jugadores/registro/' + equipo.token_jugadores)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5c] text-black font-bold py-2 px-5 rounded-xl text-sm transition-all"
                >
                  📱 Enviar por WhatsApp
                </a>
              </div>
            </div>
          </section>
        )}

        {/* PLANTEL DE JUGADORES */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Plantel de Jugadores
            </h2>
            <span className="text-xs text-slate-400">Total: {jugadores.length}</span>
          </div>

          {jugadores.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/20 border border-slate-900 border-dashed">
              <User className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-300 mb-1">Plantel Vacío</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Aún no has registrado ningún jugador. Comienza cargando los integrantes utilizando el botón de arriba.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 transition rounded-full font-bold text-slate-200 border border-slate-800 text-sm"
              >
                Registrar Primer Jugador
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jugadores.map((player: any) => (
                <div key={player.id} className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 transition duration-300 flex flex-col justify-between">
                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700 shrink-0">
                      {player.foto_url ? (
                        <img src={`${API_URL}${player.foto_url}`} alt={player.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 text-xs font-black flex items-center justify-center border border-slate-700 shrink-0">
                          {player.numero_camiseta || "-"}
                        </span>
                        <h3 className="font-bold text-white truncate max-w-[150px]">{player.nombre}</h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{player.posicion} • DNI: {player.dni}</p>
                      {player.email && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" />{player.email}</p>}
                    </div>
                  </div>

                  {/* Estado de Documentación */}
                  <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      {player.documento_firmado_url ? (
                        <a href={`${API_URL}${player.documento_firmado_url}`} target="_blank" rel="noreferrer" title="Ver Deslinde Firmado" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition border border-emerald-500/20">
                          <FileText className="w-4 h-4" />
                        </a>
                      ) : (
                        <span title="Falta Deslinde" className="p-2 rounded-lg bg-slate-800 text-slate-600 border border-slate-700 opacity-50">
                          <FileText className="w-4 h-4" />
                        </span>
                      )}

                      {player.cedula_anverso_url ? (
                        <a href={`${API_URL}${player.cedula_anverso_url}`} target="_blank" rel="noreferrer" title="Ver Cédula Anverso" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition border border-emerald-500/20">
                          <CreditCard className="w-4 h-4" />
                        </a>
                      ) : (
                        <span title="Falta Cédula Anverso" className="p-2 rounded-lg bg-slate-800 text-slate-600 border border-slate-700 opacity-50">
                          <CreditCard className="w-4 h-4" />
                        </span>
                      )}

                      {player.cedula_reverso_url ? (
                        <a href={`${API_URL}${player.cedula_reverso_url}`} target="_blank" rel="noreferrer" title="Ver Cédula Reverso" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition border border-emerald-500/20">
                          <CreditCard className="w-4 h-4" />
                        </a>
                      ) : (
                        <span title="Falta Cédula Reverso" className="p-2 rounded-lg bg-slate-800 text-slate-600 border border-slate-700 opacity-50">
                          <CreditCard className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                      player.estado === 'habilitado' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {player.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MODAL PARA AGREGAR JUGADOR */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  Inscribir Nuevo Jugador
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition"
                >
                  <Users className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddPlayer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Completo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Rodrigo Ortiz"
                      value={playerForm.nombre}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">N° Documento (DNI/Cédula)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: 1234567"
                      value={playerForm.dni}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, dni: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico (Para Login)</label>
                    <input 
                      type="email"
                      required
                      placeholder="Ej: jugador@correo.com"
                      value={playerForm.email}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha de Nacimiento</label>
                    <input 
                      type="date" 
                      value={playerForm.fecha_nacimiento}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">N° de Camiseta</label>
                    <input 
                      type="number" 
                      placeholder="Ej: 10"
                      value={playerForm.numero_camiseta}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, numero_camiseta: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Posición</label>
                    <select
                      value={playerForm.posicion}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, posicion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="Arquero">Arquero</option>
                      <option value="Defensor">Defensor</option>
                      <option value="Mediocampista">Mediocampista</option>
                      <option value="Delantero">Delantero</option>
                    </select>
                  </div>
                </div>

                {/* Exalumnos y Promocion */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="es_exalumno"
                      checked={playerForm.es_exalumno}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, es_exalumno: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <label htmlFor="es_exalumno" className="text-sm font-bold text-slate-300 cursor-pointer">¿Es exalumno del colegio?</label>
                  </div>
                  {playerForm.es_exalumno && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Año de Egreso</label>
                      <input 
                        type="number" 
                        required
                        placeholder="Ej: 2018"
                        value={playerForm.egreso_ano}
                        onChange={(e) => setPlayerForm(prev => ({ ...prev, egreso_ano: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  )}
                </div>

                {/* ALZAR DOCUMENTOS */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Documentación Obligatoria</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* FOTO RECONOCIMIENTO */}
                    <div className="p-4 rounded-2xl border border-slate-850 bg-slate-950 flex flex-col justify-between items-center text-center">
                      <div className="mb-2">
                        <User className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-slate-300 block">Retrato de Perfil</span>
                        <span className="text-[10px] text-slate-500">Para Reconocimiento Facial</span>
                      </div>
                      {playerForm.foto_url ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Alza exitosa</span>
                      ) : (
                        <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 transition rounded-lg text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                          {fileLoading.foto ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                          Subir Foto
                          <input type="file" onChange={(e) => handleFileUpload(e, "foto")} accept="image/*" className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* DESLINDE FIRMADO */}
                    <div className="p-4 rounded-2xl border border-slate-850 bg-slate-950 flex flex-col justify-between items-center text-center">
                      <div className="mb-2">
                        <FileText className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-slate-300 block">Documento Firmado</span>
                        <span className="text-[10px] text-slate-500">Deslinde / Ficha escaneada</span>
                      </div>
                      {playerForm.documento_firmado_url ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Alza exitosa</span>
                      ) : (
                        <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 transition rounded-lg text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                          {fileLoading.doc_firmado ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                          Subir Documento
                          <input type="file" onChange={(e) => handleFileUpload(e, "doc_firmado")} accept="image/*,application/pdf" className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* CEDULA ANVERSO */}
                    <div className="p-4 rounded-2xl border border-slate-850 bg-slate-950 flex flex-col justify-between items-center text-center">
                      <div className="mb-2">
                        <CreditCard className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-slate-300 block">Cédula (Anverso)</span>
                        <span className="text-[10px] text-slate-500">Frente del documento</span>
                      </div>
                      {playerForm.cedula_anverso_url ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Alza exitosa</span>
                      ) : (
                        <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 transition rounded-lg text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                          {fileLoading.ced_anverso ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                          Subir Foto
                          <input type="file" onChange={(e) => handleFileUpload(e, "ced_anverso")} accept="image/*" className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* CEDULA REVERSO */}
                    <div className="p-4 rounded-2xl border border-slate-850 bg-slate-950 flex flex-col justify-between items-center text-center">
                      <div className="mb-2">
                        <CreditCard className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-slate-300 block">Cédula (Reverso)</span>
                        <span className="text-[10px] text-slate-500">Dorso del documento</span>
                      </div>
                      {playerForm.cedula_reverso_url ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Alza exitosa</span>
                      ) : (
                        <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 transition rounded-lg text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                          {fileLoading.ced_reverso ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                          Subir Foto
                          <input type="file" onChange={(e) => handleFileUpload(e, "ced_reverso")} accept="image/*" className="hidden" />
                        </label>
                      )}
                    </div>

                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-850">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 transition rounded-xl font-bold text-slate-200 text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingPlayer}
                    className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                  >
                    {submittingPlayer && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Inscripción
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
