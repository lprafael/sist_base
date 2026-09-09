"use client";
import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Video, 
  Tv, 
  Monitor, 
  Smartphone, 
  Shield, 
  Radio, 
  Info 
} from 'lucide-react';

interface QRTatamisModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  torneoNombre?: string;
  totalTatamis?: number;
}

export default function QRTatamisModal({
  isOpen,
  onClose,
  torneoId,
  torneoNombre = "Torneo Oficial",
  totalTatamis = 3
}: QRTatamisModalProps) {
  const [selectedTatami, setSelectedTatami] = useState<number | 'all'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://micancha.com.py';

  const tatamis = Array.from({ length: Math.max(1, totalTatamis) }, (_, i) => i + 1);

  const getStationCards = (tatamiNum: number) => [
    {
      id: `camara-${tatamiNum}`,
      title: `Cámara Tatami ${tatamiNum}`,
      badge: "Cámara Oficial",
      badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      icon: <Video className="text-sky-400" size={20} />,
      url: `${baseUrl}/torneos/${torneoId}/tatami/${tatamiNum}/camara`,
      ubicacion: "Pegar en el trípode de la cámara (45° a 1.20m)",
      instruccion: "Escanear con el smartphone para iniciar la grabación continua en RAM y buffer de 45 segundos.",
      accent: "border-sky-500"
    },
    {
      id: `marcador-${tatamiNum}`,
      title: `Marcador Público TV ${tatamiNum}`,
      badge: "Pantalla Pública",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: <Tv className="text-emerald-400" size={20} />,
      url: `${baseUrl}/torneos/${torneoId}/tatami/${tatamiNum}`,
      ubicacion: "Conectar por cable HDMI al TV de 43\" a 65\"",
      instruccion: "Escanear o abrir en navegador. Presionar F11 para activar pantalla completa en el tatami.",
      accent: "border-emerald-500"
    },
    {
      id: `mesa-${tatamiNum}`,
      title: `Mesa de Control Tatami ${tatamiNum}`,
      badge: "Anotador / Cronómetro",
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/30",
      icon: <Monitor className="text-red-400" size={20} />,
      url: `${baseUrl}/torneos/${torneoId}/arbitraje/combate`,
      ubicacion: "Laptop principal de la mesa arbitral",
      instruccion: "Control de tiempo oficial (Hajime/Yame), puntos Yuko/Waza-ari/Ippon y solicitud de apelación VR.",
      accent: "border-red-500"
    },
    {
      id: `vr-${tatamiNum}`,
      title: `Tablet Juez VR Tatami ${tatamiNum}`,
      badge: "Video Review WKF",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: <Smartphone className="text-amber-400" size={20} />,
      url: `${baseUrl}/torneos/${torneoId}/vr-station`,
      ubicacion: "Tablet táctil al costado de la mesa arbitral",
      instruccion: "Deliberación de 30s reglamentarios, cámara lenta 0.25x, -6s y veredicto Aceptado / Rechazado / Mienai.",
      accent: "border-amber-500"
    }
  ];

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const tatamisToRender = selectedTatami === 'all' ? tatamis : [selectedTatami];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      
      {/* ─── ESTILOS EXCLUSIVOS DE IMPRESIÓN ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-qr-section, #printable-qr-section * {
            visibility: visible !important;
          }
          #printable-qr-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .qr-print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
            page-break-inside: avoid !important;
          }
          .qr-print-card {
            border: 2px dashed #000000 !important;
            border-radius: 12px !important;
            padding: 16px !important;
            background: #ffffff !important;
            color: #000000 !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            margin-bottom: 12px !important;
          }
          .qr-print-card h3 {
            color: #000000 !important;
            font-size: 16px !important;
            font-weight: 900 !important;
          }
          .qr-print-card p {
            color: #333333 !important;
            font-size: 11px !important;
          }
          .qr-print-card img {
            margin: 8px auto !important;
            border: 1px solid #cccccc !important;
            padding: 4px !important;
            background: #ffffff !important;
          }
        }
      `}} />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden no-print">
        
        {/* MODAL HEADER */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">
              <QrCode size={16} />
              Acceso Rápido del Día D • Modo Estación Fija
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Fichas QR Imprimibles para Tatamis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera y descarga o imprime los códigos QR oficiales para escanear y abrir al instante en las mesas de cada tatami.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Printer size={16} />
              Imprimir Fichas (A4)
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SELECTOR DE TATAMI */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Filtrar:</span>
          
          <button
            onClick={() => setSelectedTatami('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedTatami === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos los Tatamis ({totalTatamis})
          </button>

          {tatamis.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTatami(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedTatami === t
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Tatami {t}
            </button>
          ))}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* BANNER MESA CENTRAL */}
          <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-800/40 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Shield className="text-purple-400" size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Supervisión General</span>
                <h4 className="text-base font-black text-white">Mesa Central (Jefe de Árbitros)</h4>
                <p className="text-xs text-slate-400">Pantalla de control multi-área para validar resultados y bloquear tatamis.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleCopy(`${baseUrl}/torneos/${torneoId}/mesa-central`)}
                className="px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/50 text-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {copiedUrl === `${baseUrl}/torneos/${torneoId}/mesa-central` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedUrl === `${baseUrl}/torneos/${torneoId}/mesa-central` ? "¡Copiado!" : "Copiar URL"}
              </button>

              <a
                href={`${baseUrl}/torneos/${torneoId}/mesa-central`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                Abrir <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* LISTADO POR TATAMI */}
          {tatamisToRender.map(tatamiNum => {
            const cards = getStationCards(tatamiNum);
            return (
              <div key={tatamiNum} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-lg font-black text-white tracking-wide">
                    Estaciones de Combate — Tatami {tatamiNum}
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    4 Fichas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cards.map(card => {
                    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(card.url)}`;
                    const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(card.url)}`;

                    return (
                      <div 
                        key={card.id} 
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition shadow-lg group"
                      >
                        <div>
                          {/* Header de la Tarjeta */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${card.badgeColor}`}>
                              {card.badge}
                            </span>
                            {card.icon}
                          </div>

                          <h4 className="text-sm font-black text-white mb-1 group-hover:text-emerald-400 transition">
                            {card.title}
                          </h4>
                          
                          <p className="text-[11px] text-slate-400 leading-tight mb-3">
                            {card.ubicacion}
                          </p>

                          {/* Imagen del Código QR */}
                          <div className="bg-white p-2.5 rounded-xl flex items-center justify-center my-2 shadow-inner aspect-square">
                            <img 
                              src={qrImgUrl} 
                              alt={`QR ${card.title}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>

                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-2">
                            {card.instruccion}
                          </p>
                        </div>

                        {/* Botones de Acción */}
                        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopy(card.url)}
                            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-800"
                            title="Copiar enlace directo"
                          >
                            {copiedUrl === card.url ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {copiedUrl === card.url ? "¡Copiado!" : "Copiar"}
                          </button>

                          <a
                            href={qrDownloadUrl}
                            download={`QR_${card.id}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] font-bold transition border border-slate-800"
                            title="Descargar imagen PNG de alta resolución"
                          >
                            PNG
                          </a>

                          <a
                            href={card.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-[11px] font-bold transition border border-emerald-500/30"
                            title="Abrir estación en nueva pestaña"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-emerald-400 shrink-0" />
            <span>Las URLs son directas y persistentes durante todo el torneo. No expiran al reiniciar el navegador.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition w-full sm:w-auto"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* ─── SECCIÓN PURA IMPRIMIBLE (OCULTA EN PANTALLA, VISIBLE SOLO AL IMPRIMIR) ─── */}
      <div id="printable-qr-section" className="hidden">
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            {torneoNombre}
          </h1>
          <p style={{ fontSize: '13px', margin: '4px 0 0 0', fontWeight: 600 }}>
            Fichas Oficiales de Estación de Tatami — Mi Cancha Arbitraje & Video Review
          </p>
        </div>

        {tatamisToRender.map(tatamiNum => {
          const cards = getStationCards(tatamiNum);
          return (
            <div key={`print-${tatamiNum}`} style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, borderLeft: '4px solid #000', paddingLeft: '8px', marginBottom: '12px' }}>
                TATAMI NÚMERO {tatamiNum}
              </h2>
              
              <div className="qr-print-grid">
                {cards.map(card => {
                  const printQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(card.url)}`;
                  return (
                    <div key={`print-${card.id}`} className="qr-print-card">
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {card.badge}
                      </div>
                      <h3 style={{ margin: '4px 0' }}>{card.title}</h3>
                      <div style={{ fontSize: '10px', fontStyle: 'italic', marginBottom: '8px' }}>
                        📍 {card.ubicacion}
                      </div>

                      <img 
                        src={printQrUrl} 
                        alt={card.title} 
                        style={{ width: '150px', height: '150px', display: 'block' }}
                      />

                      <p style={{ fontSize: '9px', margin: '6px 0 0 0', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {card.url}
                      </p>
                      <p style={{ fontSize: '9px', color: '#555', marginTop: '4px' }}>
                        {card.instruccion}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
