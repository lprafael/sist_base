"use client";

import { useState } from "react";
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
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function TournamentDetailPage() {
  const [activeTab, setActiveTab] = useState("info");
  const [isInscribed, setIsInscribed] = useState(false);

  // Mock data for the tournament
  const tournament = {
    id: 1,
    name: "Copa de Verano 2026",
    club: "La Quinta Sports",
    sport: "Fútbol 7 Masculino",
    date: "15 de Mayo - 30 de Junio",
    location: "Asunción, Paraguay",
    prize: "G. 10.000.000",
    teamsRegistered: 24,
    maxTeams: 32,
    fee: "G. 500.000 por equipo",
    description: "El torneo amateur más grande del país. Categoría libre para mayores de 18 años. Formato fase de grupos seguido de eliminación directa (Playoffs).",
    rules: [
      "Mínimo 7 jugadores, máximo 12.",
      "Carnet de identidad obligatorio.",
      "Duración: 2 tiempos de 25 minutos.",
      "Árbitros profesionales certificados."
    ],
    prizes: [
      { rank: "1er Puesto", reward: "G. 7.000.000 + Trofeo + Medallas" },
      { rank: "2do Puesto", reward: "G. 3.000.000 + Medallas" },
      { rank: "Goleador", reward: "Botines Nike + Voucher G. 500.000" }
    ],
    brackets: [
      { round: "Cuartos de Final", matches: [
        { team1: "Los Galácticos", team2: "Dptivo. Luque", score1: 3, score2: 1, winner: "Los Galácticos" },
        { team1: "Águilas Doradas", team2: "Team Padel/Fut", score1: 0, score2: 2, winner: "Team Padel/Fut" },
        { team1: "Branca FC", team2: "Los Amigos", score1: 1, score2: 1, winner: "Branca FC", penalty: true },
        { team1: "Villarreal PY", team2: "Cancha Libre", score1: 4, score2: 2, winner: "Villarreal PY" }
      ]},
      { round: "Semifinales", matches: [
        { team1: "Los Galácticos", team2: "Team Padel/Fut", score1: null, score2: null, winner: null },
        { team1: "Branca FC", team2: "Villarreal PY", score1: null, score2: null, winner: null }
      ]}
    ]
  };

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
                   {tournament.sport}
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                  {tournament.name}
                </h1>
                <div className="flex flex-wrap gap-6 text-slate-300 font-semibold text-sm">
                  <span className="flex items-center gap-2"><MapPin size={18} className="text-primary" /> {tournament.club}</span>
                  <span className="flex items-center gap-2"><Calendar size={18} className="text-primary" /> {tournament.date}</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button className="p-4 rounded-2xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md">
                   <Share2 size={24} />
                </button>
                <button 
                  onClick={() => setIsInscribed(true)}
                  disabled={isInscribed}
                  className={`btn px-10 py-5 rounded-[2rem] text-lg ${isInscribed ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'btn-primary'}`}
                >
                  {isInscribed ? 'ESTÁS INSCRITO' : 'INSCRIBIR EQUIPO'}
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
            { label: "Equipos", val: `${tournament.teamsRegistered}/${tournament.maxTeams}`, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Premio Mayor", val: tournament.prize, icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50" },
            { label: "Inscripción", val: tournament.fee, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
            { label: "Cierre", val: "10 de Mayo", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
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
            <div className="flex border-b border-slate-200">
              {["Información", "Bracket / Llaves", "Reglas"].map((tab) => (
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
                    <p className="text-slate-500 text-lg leading-relaxed">{tournament.description}</p>
                  </section>

                  <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                      <Trophy size={24} className="text-yellow-500" /> Bolsa de Premios
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {tournament.prizes.map((p, i) => (
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

              {activeTab === "bracket / llaves" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex flex-col md:flex-row gap-8 overflow-x-auto pb-8 scrollbar-hide"
                >
                  {tournament.brackets.map((round, i) => (
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
                   {tournament.rules.map((rule, i) => (
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
                  onClick={() => setIsInscribed(true)}
                  disabled={isInscribed}
                  className={`w-full py-5 rounded-[2rem] font-extrabold text-lg transition-all shadow-xl ${isInscribed ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-secondary hover:bg-slate-100'}`}
                >
                  {isInscribed ? 'COMPLETADO' : 'UNIRME AHORA'}
                </button>
              </div>
            </div>

            {/* Organizer Card */}
            <div className="card">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Organizador</h4>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-subtle border border-slate-100 flex items-center justify-center font-extrabold text-2xl text-primary">LQ</div>
                <div>
                  <div className="font-extrabold text-xl text-slate-900 leading-none mb-2">La Quinta Sports</div>
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
    </div>
  );
}

