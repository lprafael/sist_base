"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Trophy, ShieldCheck, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="fixed w-full z-50 bg-[#080808e0] backdrop-blur-md py-6">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-extrabold tracking-tighter flex items-center gap-2">
            <span className="bg-[#bfff00] text-black px-2 py-1 rounded">MI</span>
            <span>CANCHA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium">
             <Link href="/buscar" className="hover:text-[#bfff00] transition-colors">Ver Mapa</Link>
             <Link href="#" className="btn-primary px-6 py-2 rounded-full">Reservar Ahora</Link>
          </div>
        </div>
      </nav>

      <section className="h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
           <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-6xl md:text-8xl font-black mb-8 leading-tight">
             EL JUEGO <br /> <span className="gradient-text">EMPIEZA AQUÍ</span>
           </motion.h1>
           <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
             Encuentra las mejores canchas de Paraguay. Georeferenciadas, con disponibilidad en tiempo real y reserva instantánea.
           </p>
           <div className="flex flex-col md:flex-row gap-4 justify-center">
             <Link href="/buscar" className="btn-primary text-lg flex items-center gap-2">
               <MapPin size={22} /> Explorar Mapa
             </Link>
             <button className="btn-secondary text-lg flex items-center gap-2">
               <Trophy size={22} /> Torneos
             </button>
           </div>
        </div>
      </section>

      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
           <div className="glass-card">
              <h3 className="text-xl font-bold mb-4 text-[#bfff00]">Busca</h3>
              <p className="text-gray-400">Mapa georeferenciado con todos los locales deportivos cercanos a tu ubicación actual.</p>
           </div>
           <div className="glass-card">
              <h3 className="text-xl font-bold mb-4 text-[#bfff00]">Reserva</h3>
              <p className="text-gray-400">Selecciona el horario, paga la seña y recibe tu confirmación al instante.</p>
           </div>
           <div className="glass-card">
              <h3 className="text-xl font-bold mb-4 text-[#bfff00]">Juega</h3>
              <p className="text-gray-400">Presenta tu código de reserva en el local y ¡listo! A disfrutar del partido.</p>
           </div>
        </div>
      </section>
    </div>
  );
}
