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

  const searchQuery = encodeURIComponent(`${direccion} ${ciudad}`.trim() || 'Paraguay');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <MapPin size={22} className="text-blue-500" />
          Información de la Sede
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda: Formulario */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección o Nombre del Complejo</label>
              <input 
                type="text" 
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Ej. Cancha Central - Complejo Deportivo"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
              <input 
                type="text" 
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Ej. Asunción"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Enlace directo de Google Maps (Opcional)</label>
              <input 
                type="text" 
                value={ubicacionGmaps}
                onChange={e => setUbicacionGmaps(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="https://maps.app.goo.gl/..."
              />
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pega aquí el enlace de Google Maps para que los jugadores puedan abrir la app directamente desde el celular.
              </p>
            </div>

            <div className="pt-4 flex justify-start">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : success ? <Check size={18} /> : <Save size={18} />}
                {saving ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Columna Derecha: Mapa en vivo */}
          <div className="h-full min-h-[300px] flex flex-col">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-end">
              <span>Vista previa del Mapa</span>
              <span className="text-xs font-normal text-slate-400">Ubicación aproximada</span>
            </label>
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">
              {direccion || ciudad ? (
                <iframe
                  width="100%"
                  height="100%"
                  className="absolute inset-0 border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${searchQuery}&output=embed`}
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <MapPin size={48} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Escribe una dirección y ciudad para ver el mapa</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
