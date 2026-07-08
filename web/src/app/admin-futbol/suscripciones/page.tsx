"use client";
import React, { useState } from 'react';
import { Check, Star, Zap, Shield, Loader2 } from 'lucide-react';

export default function SuscripcionesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8001/futbol/suscripciones/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        setMessage(`¡Felicidades! Te has suscrito al plan ${plan}.`);
      } else {
        setMessage("Error al actualizar la suscripción.");
      }
    } catch (e) {
      setMessage("Error de conexión.");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-[#1b264f] mb-4">Mejora tu Plan de Organizador</h1>
        <p className="text-gray-500 text-lg">Desbloquea herramientas profesionales y eleva el nivel de tus campeonatos.</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center mb-8 font-bold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FREE */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col shadow-sm">
          <div className="mb-4 text-gray-500">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Básico</h2>
          <p className="text-gray-500 text-sm mb-6">Para pequeños torneos amateurs.</p>
          <div className="mb-6">
            <span className="text-4xl font-black text-gray-900">$0</span>
            <span className="text-gray-500">/mes</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Hasta 1 torneo activo</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Página web estándar</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> App para jugadores</li>
          </ul>
          <button 
            onClick={() => handleSubscribe('Free')}
            className="w-full py-3 rounded-xl border border-[#1b264f] text-[#1b264f] font-bold hover:bg-gray-50 transition"
          >
            Plan Actual
          </button>
        </div>

        {/* PRO */}
        <div className="bg-[#1b264f] rounded-3xl p-8 flex flex-col shadow-xl transform md:-translate-y-4 relative">
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Recomendado
            </span>
          </div>
          <div className="mb-4 text-blue-400">
            <Zap size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Profesional</h2>
          <p className="text-gray-300 text-sm mb-6">El estándar para ligas en crecimiento.</p>
          <div className="mb-6 text-white">
            <span className="text-4xl font-black">$29</span>
            <span className="text-gray-400">/mes</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-300">
            <li className="flex items-center gap-2"><Check size={16} className="text-blue-400"/> Torneos ilimitados</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-blue-400"/> Dominio personalizado</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-blue-400"/> Veedores ilimitados</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-blue-400"/> Biometría (hasta 500 jug.)</li>
          </ul>
          <button 
            disabled={loading}
            onClick={() => handleSubscribe('Pro')}
            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Elegir Pro'}
          </button>
        </div>

        {/* PREMIUM */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col shadow-sm">
          <div className="mb-4 text-yellow-500">
            <Star size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Premium</h2>
          <p className="text-gray-500 text-sm mb-6">Para franquicias y múltiples sedes.</p>
          <div className="mb-6">
            <span className="text-4xl font-black text-gray-900">$99</span>
            <span className="text-gray-500">/mes</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Todo lo de Pro</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Gestión Financiera (Multas)</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Integración AWS Rekognition</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500"/> Soporte 24/7</li>
          </ul>
          <button 
            disabled={loading}
            onClick={() => handleSubscribe('Premium')}
            className="w-full py-3 rounded-xl border border-[#1b264f] text-[#1b264f] font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Elegir Premium'}
          </button>
        </div>

      </div>
    </div>
  );
}
