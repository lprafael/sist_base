import React, { useState } from 'react';
import { MapPin, Save, Loader2, Check } from 'lucide-react';

export default function SitiosView({ torneoId, torneo, onUpdate }: { torneoId: string, torneo: any, onUpdate: (data: any) => void }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [direccion, setDireccion] = useState(torneo?.direccion || '');
  const [ciudad, setCiudad] = useState(torneo?.ciudad || '');
  const [ubicacionGmaps, setUbicacionGmaps] = useState(torneo?.ubicacion_gmaps || '');

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    await onUpdate({
      direccion,
      ciudad,
      ubicacion_gmaps: ubicacionGmaps
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-blue-500" />
          Información de la Sede
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección / Complejo</label>
            <input 
              type="text" 
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
              placeholder="Ej. Cancha Central - Complejo Deportivo"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
            <input 
              type="text" 
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
              placeholder="Ej. Asunción"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Enlace de Google Maps</label>
            <input 
              type="text" 
              value={ubicacionGmaps}
              onChange={e => setUbicacionGmaps(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="text-xs text-slate-500 mt-1">Este enlace se mostrará a los jugadores para que puedan llegar al lugar del torneo.</p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : success ? <Check size={18} /> : <Save size={18} />}
              {saving ? 'Guardando...' : success ? 'Guardado' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
