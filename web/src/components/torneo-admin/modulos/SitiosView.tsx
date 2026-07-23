import React, { useState } from 'react';
import { MapPin, Save, Loader2, Check, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('../../LocationPickerMap'), { ssr: false, loading: () => <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin mb-2" /><p className="text-sm">Cargando mapa interactivo...</p></div> });

export default function SitiosView({ torneoId, torneo, onUpdate, onClose }: { torneoId: string, torneo: any, onUpdate: (data: any) => void, onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Try to load from configuracion if exists, else top level (legacy)
  const conf = torneo?.configuracion || {};
  const [direccion, setDireccion] = useState(conf.direccion || torneo?.direccion || '');
  const [ciudad, setCiudad] = useState(conf.ciudad || torneo?.ciudad || '');
  const [ubicacionGmaps, setUbicacionGmaps] = useState(conf.ubicacion_gmaps || torneo?.ubicacion_gmaps || '');
  
  // Default coordinates or loaded
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(
    conf.latitud && conf.longitud ? { lat: parseFloat(conf.latitud), lng: parseFloat(conf.longitud) } : null
  );

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    
    // Save inside configuracion to avoid schema issues, but keep backward compatibility
    const updatedConfiguracion = {
      ...(torneo.configuracion || {}),
      direccion,
      ciudad,
      ubicacion_gmaps: ubicacionGmaps,
      latitud: locationCoords?.lat,
      longitud: locationCoords?.lng,
    };

    await onUpdate({
      configuracion: updatedConfiguracion
    });
    
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={24} className="text-blue-500" />
            Configurar Sede y Mapa
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Formulario */}
            <div className="space-y-5">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                <strong>Ubica tu torneo en el mapa:</strong> Si no encuentras el complejo por su nombre, puedes mover el mapa y colocar el marcador exactamente donde se jugará.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Complejo o Dirección</label>
                <input 
                  type="text" 
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Ej. Complejo Los Arrayanes"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Enlace de invitación (Opcional)</label>
                <input 
                  type="text" 
                  value={ubicacionGmaps}
                  onChange={e => setUbicacionGmaps(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="https://maps.app.goo.gl/..."
                />
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Si tienes un link corto de Google Maps para compartir en WhatsApp, puedes pegarlo aquí.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Mapa Interactivo Leaflet */}
            <div className="h-[400px] lg:h-full min-h-[400px] flex flex-col relative rounded-xl overflow-hidden border-2 border-slate-200">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={14} className="text-blue-500" />
                Haz clic en el mapa para colocar el marcador
              </div>
              <LocationPickerMap
                defaultLocation={locationCoords || undefined}
                onLocationSelect={(loc) => setLocationCoords(loc)}
                readOnly={false}
              />
            </div>

          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 shadow-sm"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : success ? <Check size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar y Cerrar'}
          </button>
        </div>

      </div>
    </div>
  );
}
