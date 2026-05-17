"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Search, Navigation, Filter } from "lucide-react";
import { motion } from "framer-motion";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export default function SearchPage() {
  return (
    <div className="h-screen flex flex-col bg-[#080808]">
      <header className="p-4 border-b border-white/10 z-50 bg-[#080808]">
        <div className="container mx-auto flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por zona, ciudad o nombre del local..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 outline-none focus:border-[#bfff00] transition-colors"
            />
          </div>
          <button className="bg-[#bfff00] text-black px-6 py-2.5 rounded-full font-bold text-sm">FILTRAR</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-80 bg-[#0a0a0a] border-r border-white/10 overflow-y-auto p-6 hidden md:block">
           <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
             <Navigation size={18} className="text-[#bfff00]" /> Locales en el área
           </h2>
           <div className="space-y-6">
             {[
               { name: "Sintético Central", dist: "800m", price: "150.000" },
               { name: "Padel Mania", dist: "1.2km", price: "120.000" },
               { name: "Estadio El Sol", dist: "2.5km", price: "180.000" }
             ].map((l, i) => (
               <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-4">
                 <div className="font-bold mb-1">{l.name}</div>
                 <div className="text-xs text-gray-500 mb-4">{l.dist} • Gs. {l.price}/h</div>
                 <Link href={`/reservar?id=${i}`} className="block w-full text-center text-xs font-bold py-2 bg-white/5 border border-white/10 rounded-lg hover:border-[#bfff00] text-gray-400 hover:text-[#bfff00] transition-colors">
                    VER HORARIOS
                 </Link>
               </motion.div>
             ))}
           </div>
        </aside>

        <section className="flex-1 relative min-h-[400px]">
           <MapComponent />
        </section>
      </main>
    </div>
  );
}
