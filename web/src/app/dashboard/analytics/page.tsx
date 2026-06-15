"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsDashboard() {
  const [data, setData] = useState({
    ingresos_hoy: 1250000,
    total_reservas_hoy: 15,
    tendencia_ingresos: [
      { semana: '2026-05-01', ingresos: 5000000 },
      { semana: '2026-05-08', ingresos: 6200000 },
      { semana: '2026-05-15', ingresos: 5800000 },
      { semana: '2026-05-22', ingresos: 7100000 },
      { semana: '2026-05-29', ingresos: 8500000 },
    ]
  });

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
        <p className="text-gray-400">Análisis y rendimiento de tu complejo deportivo.</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-surface rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Ingresos (Hoy)</h3>
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">Gs. {data.ingresos_hoy.toLocaleString()}</p>
          <p className="text-sm text-accent mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> +12% vs ayer</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-surface rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Reservas</h3>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{data.total_reservas_hoy}</p>
          <p className="text-sm text-gray-400 mt-2">Canchas ocupadas hoy</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="bg-surface rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Nuevos Jugadores</h3>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">24</p>
          <p className="text-sm text-gray-400 mt-2">Registrados este mes</p>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} transition={{delay: 0.4}} className="bg-surface rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-6">Evolución de Ingresos</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.tendencia_ingresos}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="semana" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Gs. ${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} transition={{delay: 0.5}} className="bg-surface rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-6">Reservas por Cancha</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Cancha 1', reservas: 45 },
                { name: 'Cancha 2', reservas: 32 },
                { name: 'Padel 1', reservas: 58 },
                { name: 'Padel 2', reservas: 41 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#374151', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#374151', borderRadius: '8px' }}
                />
                <Bar dataKey="reservas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
