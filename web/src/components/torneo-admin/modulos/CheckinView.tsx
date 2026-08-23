"use client";
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Scale, DollarSign, Loader2, Zap } from 'lucide-react';
import PesajeOficialWKFModal from './PesajeOficialWKFModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CheckinView({ torneoId }: { torneoId: string }) {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPesajeWkfModal, setShowPesajeWkfModal] = useState(false);
  
  // Modal states
  const [selectedJugador, setSelectedJugador] = useState<any>(null);
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');
  const [pago, setPago] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJugadores();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const fetchJugadores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/checkin-list`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) {
        setJugadores(await res.json());
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJugador) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/futbol/jugadores/${selectedJugador.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          peso_verificado: peso ? parseFloat(peso) : null,
          estatura_verificada: estatura ? parseFloat(estatura) : null,
          pago_confirmado: pago
        })
      });
      if(res.ok) {
        setSelectedJugador(null);
        fetchJugadores();
      }
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  const filtered = jugadores.filter(j => 
    j.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (j.dni && j.dni.includes(search)) ||
    (j.equipo_nombre && j.equipo_nombre.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Scale size={20} className="text-blue-500"/>
          Check-in (Pesaje y Pagos)
        </h3>

        <button
          onClick={() => setShowPesajeWkfModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm"
        >
          <Scale size={16} /> Báscula Oficial WKF (±1kg / Walkover)
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar atleta por nombre, DNI o equipo..." 
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Atleta</th>
              <th className="px-4 py-3">Equipo / Academia</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3 text-center">Pesaje</th>
              <th className="px-4 py-3 text-center">Pago</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No se encontraron atletas</td></tr>
            ) : (
              filtered.map(j => (
                <tr key={j.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-semibold text-slate-800">{j.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{j.equipo_nombre || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{j.dni}</td>
                  <td className="px-4 py-3 text-center">
                    {j.peso_verificado ? (
                      <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full text-xs border border-green-200">{j.peso_verificado} kg</span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {j.pago_confirmado ? (
                      <CheckCircle size={16} className="text-green-500 mx-auto" />
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => {
                        setSelectedJugador(j);
                        setPeso(j.peso_verificado || '');
                        setEstatura(j.estatura_verificada || '');
                        setPago(j.pago_confirmado || false);
                      }}
                      className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded font-medium text-xs border border-blue-200 bg-white"
                    >
                      Hacer Check-in
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedJugador && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">Check-in: {selectedJugador.nombre}</h3>
            </div>
            <form onSubmit={handleCheckin} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Peso Verificado (kg)</label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" step="0.01" required value={peso} onChange={e => setPeso(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: 70.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Estatura Verificada (cm) <span className="font-normal text-slate-500">(Opcional)</span></label>
                <input type="number" step="0.1" value={estatura} onChange={e => setEstatura(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: 175.5" />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} className="w-5 h-5 text-green-500 rounded focus:ring-green-500" />
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <DollarSign size={18} className={pago ? "text-green-600" : "text-slate-400"} />
                    Pago Confirmado
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setSelectedJugador(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pesaje Oficial WKF */}
      {showPesajeWkfModal && (
        <PesajeOficialWKFModal
          torneoId={torneoId}
          onClose={() => setShowPesajeWkfModal(false)}
          onUpdated={fetchJugadores}
        />
      )}
    </div>
  );
}
