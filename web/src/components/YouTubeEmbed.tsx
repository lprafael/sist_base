"use client";
import React, { useState, useMemo } from 'react';
import { Play, Tv, Radio, ExternalLink, RefreshCw, Volume2, Maximize2, Video } from 'lucide-react';

export interface StreamChannel {
  id: string;
  nombre: string;
  url: string;
  estado?: 'en_vivo' | 'repeticion' | 'programado';
  descripcion?: string;
}

export interface YouTubeEmbedProps {
  url?: string;
  channels?: StreamChannel[];
  titulo?: string;
  subtitulo?: string;
  defaultChannelId?: string;
  className?: string;
  autoplay?: boolean;
  showChannelSelector?: boolean;
}

/**
 * Extrae el ID de 11 caracteres de cualquier formato de URL de YouTube
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const cleanUrl = url.trim();
  
  // Soporta:
  // - youtube.com/watch?v=XXXXXXXXXXX
  // - youtu.be/XXXXXXXXXXX
  // - youtube.com/live/XXXXXXXXXXX
  // - youtube.com/embed/XXXXXXXXXXX
  // - youtube.com/v/XXXXXXXXXXX
  // - youtube.com/shorts/XXXXXXXXXXX
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /^([\w-]{11})$/ // Por si pasan directamente el ID
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Genera la URL de Embed segura con parámetros optimizados
 */
export function getYouTubeEmbedUrl(url: string, autoplay: boolean = true): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  const autoParam = autoplay ? '1' : '0';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoParam}&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
}

/**
 * Obtiene la miniatura de alta calidad de un video de YouTube
 */
export function getYouTubeThumbnail(url: string): string {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return '/images/video-placeholder.jpg';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function YouTubeEmbed({
  url,
  channels = [],
  titulo,
  subtitulo,
  defaultChannelId,
  className = "",
  autoplay = true,
  showChannelSelector = true
}: YouTubeEmbedProps) {
  // Canales disponibles o el canal único
  const availableChannels: StreamChannel[] = useMemo(() => {
    if (channels && channels.length > 0) {
      return channels;
    }
    if (url) {
      return [{
        id: 'main',
        nombre: 'Transmisión Principal',
        url: url,
        estado: 'en_vivo'
      }];
    }
    return [];
  }, [channels, url]);

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    if (defaultChannelId && availableChannels.some(c => c.id === defaultChannelId)) {
      return defaultChannelId;
    }
    return availableChannels[0]?.id || '';
  });

  // Mantener actualizado si cambian los canales
  React.useEffect(() => {
    if (availableChannels.length > 0 && !availableChannels.some(c => c.id === activeChannelId)) {
      setActiveChannelId(availableChannels[0].id);
    }
  }, [availableChannels, activeChannelId]);

  const activeChannel = useMemo(() => {
    return availableChannels.find(c => c.id === activeChannelId) || availableChannels[0];
  }, [availableChannels, activeChannelId]);

  const currentEmbedUrl = useMemo(() => {
    if (!activeChannel?.url) return null;
    return getYouTubeEmbedUrl(activeChannel.url, autoplay);
  }, [activeChannel, autoplay]);

  const isLive = activeChannel?.estado === 'en_vivo';

  if (!activeChannel || !activeChannel.url) {
    return (
      <div className={`w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 ${className}`}>
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Tv size={32} />
        </div>
        <h4 className="text-lg font-bold text-white mb-1">Sin transmisión activa</h4>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          La transmisión en vivo o repetición de este torneo aún no ha comenzado o no ha sido configurada.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${className}`}>
      {/* Barra superior de estado y título */}
      <div className="bg-slate-900/90 backdrop-blur-md px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 text-red-500 rounded-lg border border-red-500/30">
            <Radio size={18} className={isLive ? "animate-pulse" : ""} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-snug flex items-center gap-2">
              {titulo || activeChannel.nombre}
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white tracking-wider animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  EN VIVO
                </span>
              ) : activeChannel.estado === 'repeticion' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  📼 REPETICIÓN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ⏰ PROGRAMADO
                </span>
              )}
            </h3>
            {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeChannel.url && (
            <a
              href={activeChannel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
              title="Abrir directamente en YouTube"
            >
              <ExternalLink size={14} />
              <span>Ver en YouTube</span>
            </a>
          )}
        </div>
      </div>

      {/* Selector de Canchas / Tatamis (Si hay más de 1 canal) */}
      {showChannelSelector && availableChannels.length > 1 && (
        <div className="bg-slate-900/60 px-5 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Video size={13} className="text-blue-400" />
            Señales:
          </span>
          <div className="flex items-center gap-2">
            {availableChannels.map((ch) => {
              const isSelected = ch.id === activeChannel.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-2 ring-blue-400/50'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-500'}`} />
                  {ch.nombre}
                  {ch.estado === 'en_vivo' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenedor del Reproductor 16:9 */}
      <div className="relative w-full pb-[56.25%] h-0 bg-black">
        {currentEmbedUrl ? (
          <iframe
            src={currentEmbedUrl}
            title={activeChannel.nombre || titulo || "Transmisión del torneo"}
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <Tv size={48} className="text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Enlace de video inválido o no reconocido</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Verifique que la URL de YouTube sea válida (ej: https://www.youtube.com/watch?v=... o https://youtu.be/...)
            </p>
          </div>
        )}
      </div>

      {/* Pie del reproductor si hay descripción de la señal */}
      {activeChannel.descripcion && (
        <div className="px-5 py-3 bg-slate-900/90 text-xs text-slate-300 border-t border-slate-800">
          {activeChannel.descripcion}
        </div>
      )}
    </div>
  );
}
