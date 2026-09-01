"use client";
import React, { useState } from 'react';
import { X, Tv, Plus, Trash2, Video, Check, Radio, HelpCircle, ExternalLink, Play } from 'lucide-react';
import YouTubeEmbed, { getYouTubeVideoId, getYouTubeEmbedUrl, StreamChannel } from '@/components/YouTubeEmbed';

interface StreamingSettingsModalProps {
  torneo: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (streamingData: any) => void;
}

export default function StreamingSettingsModal({
  torneo,
  isOpen,
  onClose,
  onSave
}: StreamingSettingsModalProps) {
  const initialStreaming = torneo?.configuracion?.streaming || {};

  const [activo, setActivo] = useState<boolean>(initialStreaming.activo !== false);
  const [urlPrincipal, setUrlPrincipal] = useState<string>(initialStreaming.url_principal || '');
  const [tituloPrincipal, setTituloPrincipal] = useState<string>(initialStreaming.titulo_principal || 'Transmisión Oficial');
  const [estadoPrincipal, setEstadoPrincipal] = useState<'en_vivo' | 'repeticion' | 'programado'>(initialStreaming.estado_principal || 'en_vivo');
  const [mensajeBienvenida, setMensajeBienvenida] = useState<string>(initialStreaming.mensaje_bienvenida || '');
  
  const [canales, setCanales] = useState<StreamChannel[]>(() => {
    if (Array.isArray(initialStreaming.canales) && initialStreaming.canales.length > 0) {
      return initialStreaming.canales;
    }
    return [];
  });

  const [previewChannelUrl, setPreviewChannelUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleAddChannel = () => {
    const isMartial = (torneo?.deporte || '').toLowerCase().includes('karate') || 
                      (torneo?.deporte || '').toLowerCase().includes('asam') || 
                      (torneo?.deporte || '').toLowerCase().includes('marcial') || 
                      (torneo?.deporte || '').toLowerCase().includes('wkf');
    const prefix = isMartial ? 'Tatami' : 'Cancha';
    const nextNum = canales.length + 1;
    
    setCanales([
      ...canales,
      {
        id: `ch-${Date.now()}`,
        nombre: `${prefix} ${nextNum}`,
        url: '',
        estado: 'en_vivo',
        descripcion: ''
      }
    ]);
  };

  const handleUpdateChannel = (index: number, field: keyof StreamChannel, value: any) => {
    const updated = [...canales];
    updated[index] = { ...updated[index], [field]: value };
    setCanales(updated);
  };

  const handleRemoveChannel = (index: number) => {
    setCanales(canales.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const streamingData = {
      activo,
      url_principal: urlPrincipal.trim(),
      titulo_principal: tituloPrincipal.trim(),
      estado_principal: estadoPrincipal,
      mensaje_bienvenida: mensajeBienvenida.trim(),
      canales: canales.filter(c => c.nombre.trim() !== '' || c.url.trim() !== '')
    };
    onSave(streamingData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
              <Tv size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Configuración de Transmisión en Vivo y Videos (YouTube)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Embebe transmisiones de YouTube Live, Tatamis / Canchas múltiples y videos grabados en tu torneo.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* Switch Activar Streaming */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                Habilitar Transmisión en Vivo en la Página Pública
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Al activar esta opción, los espectadores podrán ver el reproductor en vivo y el centro de streaming.
              </p>
            </div>
            <div
              onClick={() => setActivo(!activo)}
              className={`w-14 h-8 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                activo ? 'bg-green-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
            </div>
          </div>

          {/* Transmisión Principal */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-red-600" />
                <h3 className="font-bold text-slate-800 text-base">Señal Principal / Transmisión Oficial</h3>
              </div>
              <select
                value={estadoPrincipal}
                onChange={(e) => setEstadoPrincipal(e.target.value as any)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 outline-none"
              >
                <option value="en_vivo">🔴 EN VIVO</option>
                <option value="repeticion">📼 REPETICIÓN / GRABADO</option>
                <option value="programado">⏰ PROGRAMADO</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Señal</label>
                <input
                  type="text"
                  value={tituloPrincipal}
                  onChange={(e) => setTituloPrincipal(e.target.value)}
                  placeholder="Ej. Transmisión Oficial - Gran Final"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL de YouTube (Video o Transmisión en Directo)
                </label>
                <input
                  type="text"
                  value={urlPrincipal}
                  onChange={(e) => setUrlPrincipal(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {urlPrincipal && (
              <div className="pt-2">
                {getYouTubeVideoId(urlPrincipal) ? (
                  <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Check size={16} /> ID de YouTube detectado correctamente: <strong>{getYouTubeVideoId(urlPrincipal)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewChannelUrl(urlPrincipal)}
                      className="text-green-800 font-bold hover:underline flex items-center gap-1"
                    >
                      <Play size={12} /> Previsualizar
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Asegúrate de pegar un enlace válido de YouTube (ej: https://www.youtube.com/watch?v=... o https://youtube.com/live/...).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Múltiples Tatamis / Canchas */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Video size={18} className="text-blue-600" />
                  Señales Adicionales por Cancha o Tatami ({canales.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ideal para torneos de Artes Marciales (Tatami 1, 2, 3...) o torneos con múltiples canchas en simultáneo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddChannel}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus size={16} /> Añadir Tatami / Cancha
              </button>
            </div>

            {canales.length === 0 ? (
              <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Video size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No hay señales adicionales agregadas.</p>
                <p className="text-xs text-slate-400 mt-0.5">Haz clic en &quot;Añadir Tatami / Cancha&quot; si tienes varias transmisiones en paralelo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {canales.map((canal, idx) => (
                  <div key={canal.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Señal #{idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={canal.estado || 'en_vivo'}
                          onChange={(e) => handleUpdateChannel(idx, 'estado', e.target.value)}
                          className="text-xs font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 outline-none"
                        >
                          <option value="en_vivo">🔴 EN VIVO</option>
                          <option value="repeticion">📼 REPETICIÓN</option>
                          <option value="programado">⏰ PROGRAMADO</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveChannel(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar señal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del Área / Tatami</label>
                        <input
                          type="text"
                          value={canal.nombre}
                          onChange={(e) => handleUpdateChannel(idx, 'nombre', e.target.value)}
                          placeholder="Ej. Tatami 1 (Formas)"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">URL de YouTube Live / Video</label>
                        <input
                          type="text"
                          value={canal.url}
                          onChange={(e) => handleUpdateChannel(idx, 'url', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previsualización en Tiempo Real */}
          {previewChannelUrl && getYouTubeVideoId(previewChannelUrl) && (
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Play size={14} className="text-red-500" />
                  Previsualización del Reproductor
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewChannelUrl('')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Ocultar Previa
                </button>
              </div>
              <YouTubeEmbed url={previewChannelUrl} titulo="Previsualización de transmisión" />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            <Check size={18} />
            Guardar Configuración de Transmisión
          </button>
        </div>

      </div>
    </div>
  );
}
