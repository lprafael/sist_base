"use client";
import React, { useState, useEffect } from 'react';
import { Tv, Radio, Video, Play, Calendar, Share2, Info, CheckCircle2 } from 'lucide-react';
import YouTubeEmbed, { StreamChannel } from '@/components/YouTubeEmbed';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface StreamingViewProps {
  torneoId: string;
  torneo: any;
  isPublicView?: boolean;
}

export default function StreamingView({ torneoId, torneo, isPublicView = false }: StreamingViewProps) {
  const streamingConfig = torneo?.configuracion?.streaming || {};
  const isActivo = streamingConfig.activo !== false && (streamingConfig.url_principal || (streamingConfig.canales && streamingConfig.canales.length > 0));

  // Canales configurados
  const channels: StreamChannel[] = React.useMemo(() => {
    const list: StreamChannel[] = [];
    if (streamingConfig.url_principal) {
      list.push({
        id: 'principal',
        nombre: streamingConfig.titulo_principal || 'Transmisión Oficial',
        url: streamingConfig.url_principal,
        estado: streamingConfig.estado_principal || 'en_vivo',
        descripcion: streamingConfig.descripcion_principal || 'Señal principal del campeonato'
      });
    }
    if (Array.isArray(streamingConfig.canales)) {
      streamingConfig.canales.forEach((ch: any, idx: number) => {
        if (ch.url) {
          list.push({
            id: ch.id || `ch-${idx}`,
            nombre: ch.nombre || `Tatami / Cancha ${idx + 1}`,
            url: ch.url,
            estado: ch.estado || 'en_vivo',
            descripcion: ch.descripcion || ''
          });
        }
      });
    }
    return list;
  }, [streamingConfig]);

  // Si no hay configuración de streaming pero hay videos de YouTube en la galería multimedia, podemos mostrarlos como repeticiones
  const [mediaVideos, setMediaVideos] = useState<any[]>([]);

  useEffect(() => {
    if (torneoId) {
      fetch(`${API_URL}/multimedia/torneo/${torneoId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const ytVideos = data.filter((m: any) => m.tipo_medio === 'youtube');
            setMediaVideos(ytVideos);
          }
        })
        .catch(err => console.error(err));
    }
  }, [torneoId]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Header informativo */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/30 text-red-400 border border-red-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Centro de Transmisión
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {torneo?.deporte || 'Deporte General'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {torneo?.nombre || 'Transmisión del Campeonato'}
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {streamingConfig.mensaje_bienvenida || 'Sigue las transmisiones en directo por tatami, cancha o señal general, y revive los mejores combates y partidos grabados.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {channels.length > 0 && (
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-center">
              <span className="block text-xl font-black text-blue-400">{channels.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Señales Activas</span>
            </div>
          )}
        </div>
      </div>

      {/* Reproductor Principal con Selector de Canales */}
      {channels.length > 0 ? (
        <YouTubeEmbed 
          channels={channels} 
          titulo={torneo?.nombre}
          subtitulo="Transmisión oficial en alta definición"
          className="shadow-2xl"
        />
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tv size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No hay señal en directo configurada en este momento</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            El organizador aún no ha añadido un enlace de YouTube Live o video principal para este evento.
          </p>
          {!isPublicView && (
            <p className="text-xs text-blue-600 font-medium bg-blue-50 py-2 px-4 rounded-lg inline-block">
              👉 Puedes configurar las transmisiones desde la pestaña <strong>Configuración &gt; 🎥 Transmisión en Vivo y Videos</strong>.
            </p>
          )}
        </div>
      )}

      {/* Galería de Videos y Repeticiones Adicionales */}
      {mediaVideos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Video size={20} className="text-blue-600" />
              Repeticiones y Resúmenes Guardados ({mediaVideos.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaVideos.map((video) => (
              <div key={video.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md flex flex-col">
                <YouTubeEmbed url={video.url} titulo={video.etiquetas || "Video del Torneo"} showChannelSelector={false} autoplay={false} />
                {video.etiquetas && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-600" />
                    {video.etiquetas}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
