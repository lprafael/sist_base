import React, { useState, useEffect } from 'react';
import { X, Shield, ArrowRightLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function SelectTeamsModal({
  torneoId, match, onClose, onSuccess
}: {
  torneoId: string, match: any, onClose: () => void, onSuccess: () => void
}) {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [localId, setLocalId] = useState<string>(match.equipo_local_id || '');
  const [visitanteId, setVisitanteId] = useState<string>(match.equipo_visitante_id || '');
  const [saving, setSaving] = useState(false);

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEquipos(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchEquipos();
  }, [torneoId]);

  const handleSwap = () => {
    const temp = localId;
    setLocalId(visitanteId);
    setVisitanteId(temp);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          equipo_local_id: localId || null,
          equipo_visitante_id: visitanteId || null,
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Error al guardar equipos');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            Seleccionar equipos
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Equipo Local
            </label>
            <select 
              value={localId}
              onChange={e => setLocalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-500 transition"
            >
              <option value="">Seleccione equipo local</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre || eq.equipo_nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleSwap} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-blue-400 border border-slate-700 transition"
              title="Intercambiar local y visitante"
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Equipo Visitante
            </label>
            <select 
              value={visitanteId}
              onChange={e => setVisitanteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-500 transition"
            >
              <option value="">Seleccione equipo visitante</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre || eq.equipo_nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-2 border-t border-slate-800 bg-slate-950/60">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>
    </div>
  );
}
