import React, { useState, useEffect } from 'react';
import { MapPin, Save, Loader2, Check, X, ArrowLeft, Plus, Minus, Trophy, User, PlusCircle, MinusCircle, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('../../LocationPickerMap'), { ssr: false, loading: () => <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin mb-2" /><p className="text-sm">Cargando mapa interactivo...</p></div> });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface Sitio {
  id: string;
  nombre: string;
  ciudad: string;
  ubicacionGmaps?: string;
  latitud?: number;
  longitud?: number;
}

export default function SitiosView({ 
  torneoId, 
  torneo, 
  onUpdate, 
  onClose 
}: { 
  torneoId?: string, 
  torneo?: any, 
  onUpdate?: (data: any) => void, 
  onClose: () => void 
}) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Modal for creating a new site
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Arrays of sites
  const [sitiosCampeonato, setSitiosCampeonato] = useState<Sitio[]>([]);
  const [sitiosCuenta, setSitiosCuenta] = useState<Sitio[]>([]);

  // New site form state
  const [nuevoSitio, setNuevoSitio] = useState<Partial<Sitio>>({ nombre: '', ciudad: '', ubicacionGmaps: '' });
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);

  const isTournamentMode = Boolean(torneo && onUpdate);

  useEffect(() => {
    // Fetch account sites from API
    const fetchAccountSites = async () => {
      try {
        const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = sessionData.access_token || sessionData.token || '';
        
        const res = await fetch(`${API_URL}/organizador/sitios`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setSitiosCuenta(data);
        }
      } catch (err) {
        console.error("Error fetching account sites", err);
      }
    };
    
    fetchAccountSites();

    if (isTournamentMode) {
      // Load championship sites from tournament config
      const conf = torneo?.configuracion || {};
      let campParsed: Sitio[] = conf.sitios || [];
      
      // Migration for legacy single site
      if (campParsed.length === 0 && (conf.direccion || conf.latitud)) {
        campParsed = [{
          id: 'legacy-1',
          nombre: conf.direccion || torneo?.direccion || 'Sede Principal',
          ciudad: conf.ciudad || torneo?.ciudad || '',
          ubicacionGmaps: conf.ubicacion_gmaps || torneo?.ubicacion_gmaps || '',
          latitud: conf.latitud ? parseFloat(conf.latitud) : undefined,
          longitud: conf.longitud ? parseFloat(conf.longitud) : undefined,
        }];
      }
      setSitiosCampeonato(campParsed);
    }
  }, [torneo, isTournamentMode]);

  const saveToAccount = async (newSite: Sitio) => {
    // Optimistic update
    setSitiosCuenta(prev => [newSite, ...prev]);
    
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      const res = await fetch(`${API_URL}/organizador/sitios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSite)
      });
      
      if (!res.ok) {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.error("Error saving site to account", err);
      // Revert if error
      setSitiosCuenta(prev => prev.filter(s => s.id !== newSite.id));
      alert("No se pudo guardar el sitio en la base de datos.");
    }
  };

  const deleteSiteFromAccount = async (siteId: string) => {
    if (!confirm('¿Estás seguro de eliminar este complejo/sitio de tu cuenta?')) return;
    
    setSitiosCuenta(prev => prev.filter(s => s.id !== siteId));
    if (isTournamentMode) {
      removeSiteFromTournament(siteId);
    }

    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      await fetch(`${API_URL}/organizador/sitios/${siteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error deleting site from account", err);
    }
  };

  const handleCreateSite = () => {
    if (!nuevoSitio.nombre) return alert('El nombre del complejo es requerido');
    
    const site: Sitio = {
      id: 'sitio-' + Date.now(),
      nombre: nuevoSitio.nombre,
      ciudad: nuevoSitio.ciudad || '',
      ubicacionGmaps: nuevoSitio.ubicacionGmaps,
      latitud: locationCoords?.lat,
      longitud: locationCoords?.lng,
    };

    // Save to account
    saveToAccount(site);
    
    // Reset form
    setNuevoSitio({ nombre: '', ciudad: '', ubicacionGmaps: '' });
    setLocationCoords(null);
    setShowCreateModal(false);
  };

  const addSiteToTournament = (site: Sitio) => {
    if (!sitiosCampeonato.find(s => s.id === site.id)) {
      setSitiosCampeonato([...sitiosCampeonato, site]);
    }
  };

  const removeSiteFromTournament = (siteId: string) => {
    setSitiosCampeonato(sitiosCampeonato.filter(s => s.id !== siteId));
  };

  const handleSave = async () => {
    if (!onUpdate || !torneo) return;
    setSaving(true);
    setSuccess(false);
    
    const updatedConfiguracion = {
      ...(torneo.configuracion || {}),
      sitios: sitiosCampeonato,
      direccion: sitiosCampeonato.length > 0 ? sitiosCampeonato[0].nombre : '',
      ciudad: sitiosCampeonato.length > 0 ? sitiosCampeonato[0].ciudad : '',
      ubicacion_gmaps: sitiosCampeonato.length > 0 ? sitiosCampeonato[0].ubicacionGmaps : '',
      latitud: sitiosCampeonato.length > 0 ? sitiosCampeonato[0].latitud : null,
      longitud: sitiosCampeonato.length > 0 ? sitiosCampeonato[0].longitud : null,
    };

    await onUpdate({
      configuracion: updatedConfiguracion
    });
    
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#f3f4f6] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* Header */}
        <div className="bg-[#0b1035] text-white flex items-center justify-between px-5 py-4 shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <MapPin size={22} className="text-blue-400" />
            <h1 className="text-lg font-bold">
              {isTournamentMode ? 'Sitios del Campeonato' : 'Mis Sitios y Complejos'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isTournamentMode && sitiosCampeonato.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mr-2 text-sm font-semibold hover:text-blue-300 transition flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Save size={16} />}
                {saving ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar en Torneo'}
              </button>
            )}
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full transition flex items-center justify-center text-white"
              title="Registrar nuevo sitio"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition ml-1"
              title="Cerrar modal"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Registrados en el campeonato (only in tournament mode) */}
        {isTournamentMode && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-[#edeef4] px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#cfd1df] rounded-lg flex items-center justify-center text-[#0b1035]">
                  <Trophy size={20} />
                </div>
                <h2 className="font-semibold text-[#0b1035]">Registrados en el campeonato</h2>
              </div>
              <div className="bg-[#0b1035] text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                {sitiosCampeonato.length}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {sitiosCampeonato.length === 0 ? (
                <div className="px-4 py-4 text-center text-slate-600 text-sm">
                  Aún no hay datos
                </div>
              ) : (
                sitiosCampeonato.map((sitio) => (
                  <div key={sitio.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <span className="text-slate-800 font-medium block">{sitio.nombre}</span>
                      {sitio.ciudad && <span className="text-xs text-slate-500">{sitio.ciudad}</span>}
                    </div>
                    <button 
                      onClick={() => removeSiteFromTournament(sitio.id)}
                      className="p-1 text-slate-500 hover:text-red-500 transition"
                      title="Quitar del campeonato"
                    >
                      <MinusCircle size={22} strokeWidth={1.5} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Registrados en tu cuenta */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-[#edeef4] px-4 py-3 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#cfd1df] rounded-lg flex items-center justify-center text-[#0b1035]">
                <User size={20} />
              </div>
              <h2 className="font-semibold text-[#0b1035]">Registrados en tu cuenta</h2>
            </div>
            <div className="bg-[#4b5563] text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
              {sitiosCuenta.length}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {sitiosCuenta.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No tienes sitios guardados en tu cuenta. Usa el botón "+" para registrar uno.
              </div>
            ) : (
              sitiosCuenta.map((sitio) => {
                const isAdded = isTournamentMode && sitiosCampeonato.some(s => s.id === sitio.id);
                return (
                  <div key={sitio.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <span className="text-slate-800 font-medium block">{sitio.nombre}</span>
                      {sitio.ciudad && <span className="text-xs text-slate-500">{sitio.ciudad}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {isTournamentMode ? (
                        !isAdded ? (
                          <button 
                            onClick={() => addSiteToTournament(sitio)}
                            className="p-1 text-slate-500 hover:text-blue-600 transition"
                            title="Añadir al campeonato"
                          >
                            <PlusCircle size={22} strokeWidth={1.5} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider px-2 py-1 bg-green-50 rounded-full">Añadido</span>
                        )
                      ) : null}
                      <button 
                        onClick={() => deleteSiteFromAccount(sitio.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar de la cuenta"
                      >
                        <Trash2 size={20} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Sub-modal Create Site */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={24} className="text-blue-500" />
                Registrar Nuevo Local
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Columna Izquierda: Formulario */}
                <div className="space-y-5">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                    <strong>Ubica tu local en el mapa:</strong> Si no lo encuentras por su nombre, puedes mover el mapa y colocar el marcador exactamente donde se encuentra.
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Complejo o Dirección *</label>
                    <input 
                      type="text" 
                      value={nuevoSitio.nombre}
                      onChange={e => setNuevoSitio({...nuevoSitio, nombre: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      placeholder="Ej. Complejo Los Arrayanes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
                    <input 
                      type="text" 
                      value={nuevoSitio.ciudad}
                      onChange={e => setNuevoSitio({...nuevoSitio, ciudad: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      placeholder="Ej. Asunción"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Enlace de invitación (Opcional)</label>
                    <input 
                      type="text" 
                      value={nuevoSitio.ubicacionGmaps}
                      onChange={e => setNuevoSitio({...nuevoSitio, ubicacionGmaps: e.target.value})}
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
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSite}
                disabled={!nuevoSitio.nombre}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                Registrar en Cuenta
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
