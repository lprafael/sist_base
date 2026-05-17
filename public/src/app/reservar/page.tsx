"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, Check, CreditCard, Shield, Info, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function BookingPage() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Select, 2: Info, 3: Deposit
  const [countdown, setCountdown] = useState(1200); // 20 mins

  const slots = [
    { time: "18:00", status: "available" },
    { time: "19:00", status: "booked" },
    { time: "20:00", status: "available" },
    { time: "21:00", status: "available" },
    { time: "22:00", status: "available" },
    { time: "23:00", status: "available" },
    { time: "00:00", status: "available" },
    { time: "01:00", status: "available" },
  ];

  useEffect(() => {
    if (step === 3 && countdown > 0) {
      const timer = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 pt-24">
      <div className="container mx-auto max-w-4xl">
        <Link href="/buscar" className="flex items-center gap-2 text-gray-500 hover:text-[#bfff00] mb-8 transition-colors">
          <ArrowLeft size={20} /> Volver al mapa
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-black mb-2 uppercase">Sintético Central</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Info size={16} /> Fútbol 7 • Pasto Pro • Iluminación LED
              </p>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Calendar size={20} className="text-[#bfff00]" /> Selecciona Horario Disponibles
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {slots.map((s, i) => (
                      <button
                        key={i}
                        disabled={s.status === 'booked'}
                        onClick={() => setSelectedSlot(s.time)}
                        className={`py-4 rounded-xl font-black transition-all border ${
                          s.status === 'booked' 
                            ? 'bg-transparent border-white/5 text-gray-800 cursor-not-allowed'
                            : selectedSlot === s.time
                              ? 'bg-[#bfff00] text-black border-[#bfff00] shadow-[0_0_20px_rgba(191,255,0,0.4)]'
                              : 'bg-white/5 border-white/10 hover:border-[#bfff00]'
                        }`}
                      >
                        {s.time}
                        {s.status === 'booked' && <span className="block text-[10px] opacity-40">OCUPADO</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h2 className="text-xl font-bold mb-6">Tus Datos</h2>
                  <div className="space-y-4">
                    <input className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#bfff00]" placeholder="Nombre Completo" />
                    <input className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#bfff00]" placeholder="Teléfono de Contacto" />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border-[#bfff00]/30">
                  <div className="text-center py-6">
                    <div className="text-5xl font-black text-[#bfff00] mb-2">{formatTime(countdown)}</div>
                    <p className="text-gray-500 text-sm uppercase tracking-widest">Tiempo para enviar seña</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Monto Seña</span>
                      <span className="font-bold">Gs. 50.000</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Transferencia Banco Itaú</span>
                      <div className="flex justify-between">
                        <span className="font-mono">724018593</span>
                        <button className="text-[#bfff00] text-xs font-bold uppercase">Copiar</button>
                      </div>
                    </div>
                  </div>
                  <button className="w-full btn-primary mt-6 py-4">SUBIR COMPROBANTE</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Checkout Info Sidebar */}
          <aside>
            <div className="glass-card sticky top-24">
              <h3 className="text-lg font-bold mb-6">Detalle de Reserva</h3>
              <div className="space-y-4 mb-8">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Horario</span>
                   <span className="font-bold text-[#bfff00]">{selectedSlot || '--:--'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Precio Total</span>
                   <span className="font-bold">Gs. 150.000</span>
                 </div>
              </div>
              
              {step < 3 && (
                <button 
                  disabled={!selectedSlot}
                  onClick={() => setStep(step + 1)}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                >
                  Continuar <Check size={20} />
                </button>
              )}
              
              <div className="mt-6 flex gap-3 text-xs text-gray-500">
                <Shield size={20} className="text-[#bfff00] shrink-0" />
                <p>Tu reserva está garantizada por Mi Cancha. El local recibirá la notificación al confirmar tu seña.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
