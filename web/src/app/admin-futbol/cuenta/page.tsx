"use client";
import React, { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, FileText, CheckCircle, Loader2 } from 'lucide-react';

export default function CuentaEquipoPage() {
  const [deudas, setDeudas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null); // id de deuda procesando
  
  // MOCK: ID del equipo del delegado logueado
  const equipoId = "equipo_demo_123";

  useEffect(() => {
    fetchDeudas();
  }, []);

  const fetchDeudas = async () => {
    try {
      const res = await fetch(`http://localhost:8001/futbol/cuenta-corriente/${equipoId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeudas(data.deudas);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePay = async (deudaId: string) => {
    setProcesando(deudaId);
    try {
      const res = await fetch("http://localhost:8001/futbol/pagos/procesar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ deuda_id: deudaId, metodo: 'MercadoPago' })
      });
      if (res.ok) {
        // Actualizar UI
        setDeudas(deudas.map(d => d.id === deudaId ? { ...d, estado: 'Pagado' } : d));
      }
    } catch(e) {
      console.error(e);
    }
    setProcesando(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <CreditCard size={32} className="text-[#1b264f]" />
        <div>
          <h1 className="text-3xl font-black text-[#1b264f]">Estado de Cuenta</h1>
          <p className="text-gray-500">Multas, inscripciones y arbitrajes del equipo.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* RESUMEN */}
        <div className="p-8 bg-[#1b264f] text-white flex justify-between items-center">
          <div>
            <p className="text-blue-300 font-bold mb-1">Total a Pagar (Deuda Activa)</p>
            <h2 className="text-5xl font-black">
              ${deudas.filter(d => d.estado === 'Pendiente').reduce((acc, d) => acc + d.monto, 0).toFixed(2)}
            </h2>
          </div>
          <div className="hidden md:block">
            <AlertTriangle size={64} className="text-yellow-400 opacity-20" />
          </div>
        </div>

        {/* LISTADO DE DEUDAS */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText size={20}/> Movimientos Recientes
          </h3>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
          ) : deudas.length === 0 ? (
            <div className="text-center p-8 text-gray-400 font-bold">
              No hay movimientos registrados.
            </div>
          ) : (
            <div className="space-y-4">
              {deudas.map((d) => (
                <div key={d.id} className={`p-4 rounded-2xl border flex items-center justify-between transition ${d.estado === 'Pagado' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-red-100 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${d.estado === 'Pagado' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {d.estado === 'Pagado' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{d.concepto}</p>
                      <p className="text-sm text-gray-500">Fecha: {d.fecha.substring(0, 10)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-black text-gray-800">${d.monto.toFixed(2)}</span>
                    
                    {d.estado === 'Pendiente' ? (
                      <button 
                        onClick={() => handlePay(d.id)}
                        disabled={procesando === d.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition flex items-center gap-2"
                      >
                        {procesando === d.id ? <Loader2 size={18} className="animate-spin" /> : 'Pagar Ahora'}
                      </button>
                    ) : (
                      <span className="text-green-600 font-bold px-6 py-2 bg-green-50 rounded-xl">Cancelado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
