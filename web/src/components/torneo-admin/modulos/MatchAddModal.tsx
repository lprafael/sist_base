import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface MatchAddModalProps {
  torneoId: string;
  deporte?: string;
  fases?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function MatchAddModal({ torneoId, deporte, fases = ['Fase 1'], onClose, onSuccess }: MatchAddModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipos, setEquipos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    equipo_local_id: '',
    equipo_visitante_id: '',
    jugador_local_id: '',
    jugador_visitante_id: '',
    fase: fases[0] || 'Fase 1',
    fecha_hora: ''
  });

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  useEffect(() => {
    fetchEquipos();
  }, []);

  const fetchEquipos = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('user_session') || '{}')?.access_token || '';
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEquipos(await res.json());
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipo_local_id || !formData.equipo_visitante_id) {
      alert("Debes seleccionar ambos contrincantes");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...formData,
        jugador_local_id: formData.jugador_local_id || null,
        jugador_visitante_id: formData.jugador_visitante_id || null,
        fecha_hora: formData.fecha_hora || null
      };

      const token = JSON.parse(localStorage.getItem('user_session') || '{}')?.access_token || '';
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.detail || "Error al guardar el partido");
      }
    } catch(err) {
      console.error(err);
      alert("Error de conexión");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Agregar Partido Manual</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition shadow-sm">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Fase del Partido</label>
              <select 
                value={formData.fase} 
                onChange={e => setFormData({...formData, fase: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              >
                {fases.map(fase => (
                  <option key={fase} value={fase}>{fase}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Local (Rincón Rojo)</label>
                <select 
                  required
                  value={formData.equipo_local_id} 
                  onChange={e => setFormData({...formData, equipo_local_id: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none bg-red-50"
                >
                  <option value="">Seleccionar...</option>
                  {equipos.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Visitante (Rincón Azul)</label>
                <select 
                  required
                  value={formData.equipo_visitante_id} 
                  onChange={e => setFormData({...formData, equipo_visitante_id: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none bg-blue-50"
                >
                  <option value="">Seleccionar...</option>
                  {equipos.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Fecha y Hora (Opcional)</label>
              <input 
                type="datetime-local" 
                value={formData.fecha_hora} 
                onChange={e => setFormData({...formData, fecha_hora: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="px-4 py-2 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar Partido
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
