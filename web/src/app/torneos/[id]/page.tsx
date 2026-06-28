"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  ChevronLeft, 
  Share2, 
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [activeTab, setActiveTab] = useState("información");
  const [isInscribed, setIsInscribed] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollData, setEnrollData] = useState({
    nombre: "",
    capitan_nombre: "",
    capitan_telefono: "",
    capitan_email: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch tournament details
      const tRes = await fetch(`${API_URL}/cancha/torneos/${id}`);
      if (tRes.ok) {
        const found = await tRes.json();
        setTournament(found);
      }

      // 2. Fetch enrolled teams
      const eRes = await fetch(`${API_URL}/cancha/torneos/${id}/equipos`);
      if (eRes.ok) {
        const eqData = await eRes.json();
        setEquipos(eqData);
        // Check if user is already inscribed locally
        const localInscribed = localStorage.getItem(`inscribed_${id}`);
        if (localInscribed) {
          setIsInscribed(true);
        }
      }

      // 3. Fetch matches
      const mRes = await fetch(`${API_URL}/cancha/torneos/${id}/partidos`);
      if (mRes.ok) {
        setPartidos(await mRes.json());
      }

      // 4. Fetch standings
      const pRes = await fetch(`${API_URL}/cancha/torneos/${id}/posiciones`);
      if (pRes.ok) {
        setPosiciones(await pRes.json());
      }
    } catch (e) {
      console.error("Error loading tournament details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Enroll the team in backend
      const res = await fetch(`${API_URL}/cancha/torneos/${id}/equipos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollData)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al inscribir equipo");
      }
      
      const team = await res.json();
      
      // Save enrollment locally
      localStorage.setItem(`inscribed_${id}`, team.id);
      
      // 2. If it requires payment, redirect to real checkout
      if (tournament?.costo_inscripcion > 0) {
        const payRes = await fetch(`${API_URL}/api/pagos/inscripcion/${team.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "mercadopago" })
        });
        if (payRes.ok) {
          const payData = await payRes.json();
          if (payData.checkout_url) {
            window.location.href = payData.checkout_url;
            return;
          }
        }
      }
      
      // 3. Otherwise confirm directly
      alert("¡Tu equipo se ha inscrito con éxito!");
      setIsInscribed(true);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Error al inscribir equipo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Trophy className="w-16 h-16 text-primary animate-bounce mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Torneo...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <Trophy className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Torneo no encontrado</h2>
        <p className="text-slate-500 mb-8 max-w-sm">La competencia que buscas no existe o fue dada de baja por el complejo.</p>
        <Link href="/buscar" className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-4 rounded-[2rem] transition-colors">
          Volver a Buscar
        </Link>
      </div>
    );
  }

  const getFixturesByRound = () => {
    const rounds: Record<string, any[]> = {};
    partidos.forEach(p => {
      const roundName = p.fase || "Fase de Grupos";
      if (!rounds[roundName]) {
        rounds[roundName] = [];
      }
      rounds[roundName].push(p);
    });
    return Object.entries(rounds).map(([roundName, matches]) => ({
      round: roundName,
      matches: matches.map(m => ({
        team1: m.local_nombre,
        team2: m.visitante_nombre,
        score1: m.goles_local,
        score2: m.goles_visitante,
        winner: m.goles_local > m.goles_visitante ? m.local_nombre : (m.goles_visitante > m.goles_local ? m.visitante_nombre : null)
      }))
    }));
  };

  const roundsData = getFixturesByRound();

  // Extract dynamic rules and prizes with fallbacks
  const rules = tournament?.reglas?.length > 0 ? tournament.reglas : [
    "No hay reglas definidas para este torneo aún."
  ];

  const prizes = tournament?.premios?.length > 0 ? tournament.premios : [
    { rank: "-", reward: "Premios a confirmar" }
  ];

  return (
    <div className="min-h-screen bg-subtle">
      {/* Hero Banner */}
      <div className="relative h-[450px] w-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-10">
          <img 
            src="https://images.unsplash.com/photo-1526232759583-02f2969744b7?auto=format&fit=crop&q=80&w=1200" 
            alt="Tournament Banner" 
            className="w-full h-full object-cover opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        </div>
        
        <div className="container relative h-full flex items-end pb-12 z-20">
          <div className="w-full">
            <Link href="/buscar" className="inline-flex items-center gap-2 text-slate-300 hover:text-primary transition-colors mb-8 text-xs font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Volver a Torneos
            </Link>
            
            <div className="flex flex-col lg:flex-row justify-between items-end gap-10">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                   {tournament.deporte} • {tournament.formato === 'liga' ? 'Liga' : 'Eliminación Directa'}
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                  {tournament.nombre}
                </h1>
                <div className="flex flex-wrap gap-6 text-slate-300 font-semibold text-sm">
                  <span className="flex items-center gap-2"><MapPin size={18} className="text-primary" /> {tournament.complejo_nombre}</span>
                  <span className="flex items-center gap-2"><Calendar size={18} className="text-primary" /> {new Date(tournament.fecha_inicio).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button className="p-4 rounded-2xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md">
                   <Share2 size={24} />
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={isInscribed || equipos.length >= tournament.max_equipos}
                  className={`btn px-10 py-5 rounded-[2rem] text-lg transition-all ${isInscribed ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'btn-primary'}`}
                >
                  {isInscribed ? 'ESTÁS INSCRITO' : (equipos.length >= tournament.max_equipos ? 'COMPLETO' : 'INSCRIBIR EQUIPO')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Equipos", val: `${equipos.length}/${tournament.max_equipos}`, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Premio Mayor", val: "Copa + Medallas", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50" },
            { label: "Inscripción", val: tournament.costo_inscripcion > 0 ? `G. ${tournament.costo_inscripcion.toLocaleString()}` : "Gratuito", icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
            { label: "Cierre", val: "Faltan pocos días", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
          ].map((stat, i) => (
            <div key={i} className="card !p-6 flex items-center gap-5 hover:!translate-y-0">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shrink-0`}>
                <stat.icon size={28} />
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">{stat.label}</div>
                <div className="text-xl font-extrabold text-slate-900 leading-none">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Info Area */}
          <div className="lg:col-span-2 space-y-12">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap">
              {["Información", "Equipos", "Fixture", "Posiciones", "Reglas"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-8 py-5 text-sm font-bold tracking-widest uppercase transition-all relative ${activeTab === tab.toLowerCase() ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "información" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <section>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
                      <Zap className="text-primary" /> Detalles del Evento
                    </h3>
                    <p className="text-slate-500 text-lg leading-relaxed">{tournament.descripcion || "¡Prepárate para la competencia! Un espacio ideal para demostrar todo el talento de tu equipo y competir por grandes premios."}</p>
                  </section>

                  <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                      <Trophy size={24} className="text-yellow-500" /> Bolsa de Premios
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {prizes.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-6 bg-subtle rounded-2xl border border-slate-50 group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-slate-400 border border-slate-100 group-hover:text-primary group-hover:border-primary/20">{i+1}</div>
                             <span className="font-bold text-slate-700 text-lg">{p.rank}</span>
                          </div>
                          <span className="font-extrabold text-primary text-lg">{p.reward}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === "equipos" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {equipos.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-500 italic">No hay equipos inscritos todavía. ¡Sé el primero en sumarte!</div>
                  ) : equipos.map((e, idx) => (
                    <div key={e.id} className="card !p-6 flex items-center gap-5 group hover:border-primary/30 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-lg overflow-hidden">
                        {e.logo_url ? <img src={`${API_URL.replace('/api', '')}${e.logo_url}`} alt={e.nombre} className="w-full h-full object-cover" /> : idx + 1}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{e.nombre}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Capitán: {e.capitan_nombre || "Sin Capitán"}</p>
                      </div>
                      {e.estado_inscripcion === 'confirmado' && (
                        <span className="ml-auto bg-green-100 text-green-700 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">CONFIRMADO</span>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "posiciones" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-200">
                          <th className="p-4 font-bold text-center w-12">Pos</th>
                          <th className="p-4 font-bold">Equipo</th>
                          <th className="p-4 font-bold text-center" title="Partidos Jugados">PJ</th>
                          <th className="p-4 font-bold text-center" title="Partidos Ganados">G</th>
                          <th className="p-4 font-bold text-center" title="Partidos Empatados">E</th>
                          <th className="p-4 font-bold text-center" title="Partidos Perdidos">P</th>
                          <th className="p-4 font-bold text-center hidden md:table-cell" title="Goles a Favor">GF</th>
                          <th className="p-4 font-bold text-center hidden md:table-cell" title="Goles en Contra">GC</th>
                          <th className="p-4 font-bold text-center" title="Diferencia de Goles">DIF</th>
                          <th className="p-4 font-bold text-center text-primary text-sm">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posiciones.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-12 text-center text-slate-500 italic">No hay resultados todavía.</td>
                          </tr>
                        ) : posiciones.map((pos, idx) => (
                          <tr key={pos.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold overflow-hidden">
                                {pos.logo_url ? <img src={`${API_URL.replace('/api', '')}${pos.logo_url}`} alt={pos.nombre} className="w-full h-full object-cover" /> : pos.nombre.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-800">{pos.nombre}</span>
                            </td>
                            <td className="p-4 text-center font-semibold text-slate-600">{pos.pj}</td>
                            <td className="p-4 text-center text-slate-600">{pos.pg}</td>
                            <td className="p-4 text-center text-slate-600">{pos.pe}</td>
                            <td className="p-4 text-center text-slate-600">{pos.pp}</td>
                            <td className="p-4 text-center text-slate-500 hidden md:table-cell">{pos.gf}</td>
                            <td className="p-4 text-center text-slate-500 hidden md:table-cell">{pos.gc}</td>
                            <td className="p-4 text-center font-semibold text-slate-600">{pos.dif > 0 ? `+${pos.dif}` : pos.dif}</td>
                            <td className="p-4 text-center font-extrabold text-primary text-lg">{pos.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "fixture" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex flex-col md:flex-row gap-8 overflow-x-auto pb-8 scrollbar-hide w-full"
                >
                  {roundsData.length === 0 ? (
                    <div className="w-full py-20 bg-white border border-slate-100 rounded-[2rem] text-center">
                      <Trophy className="mx-auto text-slate-300 w-16 h-16 mb-4 animate-bounce" />
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Fixture en Preparación</h4>
                      <p className="text-slate-500 max-w-sm mx-auto text-sm">El organizador realizará el sorteo una vez que se completen los cupos de inscripción y estén todos confirmados.</p>
                    </div>
                  ) : roundsData.map((round, i) => (
                    <div key={i} className="flex-1 min-w-[320px]">
                      <h4 className="text-center font-bold text-xs uppercase tracking-[0.2em] text-slate-400 mb-8 py-3 bg-white rounded-xl border border-slate-100 italic">
                        {round.round}
                      </h4>
                      <div className="space-y-6">
                        {round.matches.map((match, mi) => (
                          <div key={mi} className="card !p-0 overflow-hidden !border-slate-100">
                            <div className={`p-4 flex justify-between items-center border-b border-slate-50 ${match.winner === match.team1 ? 'bg-primary/5' : ''}`}>
                              <span className={`font-bold text-sm ${match.winner === match.team1 ? 'text-primary' : 'text-slate-600'}`}>{match.team1}</span>
                              <span className="font-extrabold text-lg text-slate-900">{match.score1 ?? "-"}</span>
                            </div>
                            <div className={`p-4 flex justify-between items-center ${match.winner === match.team2 ? 'bg-primary/5' : ''}`}>
                              <span className={`font-bold text-sm ${match.winner === match.team2 ? 'text-primary' : 'text-slate-600'}`}>{match.team2}</span>
                              <span className="font-extrabold text-lg text-slate-900">{match.score2 ?? "-"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "reglas" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {rules.map((rule, i) => (
                      <div key={i} className="card !p-8 flex items-start gap-4">
                        <CheckCircle2 size={24} className="text-primary shrink-0" />
                        <span className="text-slate-600 font-medium leading-relaxed">{rule}</span>
                      </div>
                   ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Registration Card */}
            <div className="bg-secondary rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                    <Clock size={20} />
                  </div>
                  <span className="font-bold tracking-widest uppercase text-[10px]">Cierre de Inscripción</span>
                </div>
                
                <div className="flex justify-between mb-10">
                  {['05', '12', '45'].map((v, i) => (
                     <div key={i} className="text-center">
                       <div className="text-5xl font-extrabold leading-none mb-1">{v}</div>
                       <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest">{['Días', 'Horas', 'Min'][i]}</div>
                     </div>
                  ))}
                </div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={isInscribed || equipos.length >= tournament.max_equipos}
                  className={`w-full py-5 rounded-[2rem] font-extrabold text-lg transition-all shadow-xl ${isInscribed ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-secondary hover:bg-slate-100'}`}
                >
                  {isInscribed ? 'ESTÁS INSCRITO' : 'UNIRME AHORA'}
                </button>
              </div>
            </div>

            {/* Organizer Card */}
            <div className="card">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Organizador</h4>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-subtle border border-slate-100 flex items-center justify-center font-extrabold text-2xl text-primary">LQ</div>
                <div>
                  <div className="font-extrabold text-xl text-slate-900 leading-none mb-2">{tournament.complejo_nombre}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase">
                    <ShieldCheck size={14} /> Club Verificado
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                 <button className="w-full btn btn-white py-4 rounded-2xl text-sm lowercase">contactar organizador</button>
                 <button className="w-full flex items-center justify-center gap-2 text-primary font-bold text-sm hover:translate-x-1 transition-transform">
                    Ver otros torneos <ArrowRight size={16} />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Trophy size={32} />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Inscribir Equipo</h3>
              <p className="text-slate-400 text-sm mt-1">Completa los datos de tu plantel para el torneo</p>
            </div>
            
            <form onSubmit={handleEnrollSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre del Equipo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Real Canchita FC"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  value={enrollData.nombre}
                  onChange={e => setEnrollData({ ...enrollData, nombre: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre del Capitán</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  value={enrollData.capitan_nombre}
                  onChange={e => setEnrollData({ ...enrollData, capitan_nombre: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Teléfono</label>
                  <input 
                    type="tel"
                    required
                    placeholder="Ej. 0981123456"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                    value={enrollData.capitan_telefono}
                    onChange={e => setEnrollData({ ...enrollData, capitan_telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="capitan@gmail.com"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                    value={enrollData.capitan_email}
                    onChange={e => setEnrollData({ ...enrollData, capitan_email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-5 bg-primary hover:bg-primary/90 text-black font-extrabold rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all text-base uppercase"
                >
                  {submitting ? 'Procesando...' : (tournament?.costo_inscripcion > 0 ? `Proceder al Pago (G. ${tournament.costo_inscripcion.toLocaleString()})` : 'Confirmar Registro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
