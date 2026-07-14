import React, { useState, useEffect } from 'react';

interface Patrocinador {
  titulo: string;
  logo_url: string;
  banner_app_url: string;
  banner_sitio_url: string;
  tiempo_banner: number;
  sitio_web: string;
  telefono: string;
}

interface Props {
  patrocinadores: Patrocinador[];
  posicion: 'inferior_flotante' | 'cabecera' | 'lateral';
  esApp?: boolean;
}

export default function PatrocinadoresCarousel({ patrocinadores, posicion, esApp = false }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!patrocinadores || patrocinadores.length <= 1) return;

    const current = patrocinadores[currentIndex];
    const tiempoMs = (current.tiempo_banner || 7) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % patrocinadores.length);
    }, tiempoMs);

    return () => clearTimeout(timer);
  }, [currentIndex, patrocinadores]);

  if (!patrocinadores || patrocinadores.length === 0) return null;

  const current = patrocinadores[currentIndex];
  // Select which banner to show based on if it's app or site, fallback to whichever is available
  const bannerUrl = (esApp ? current.banner_app_url : current.banner_sitio_url) || 
                    current.banner_sitio_url || 
                    current.banner_app_url;

  if (!bannerUrl && !current.logo_url) return null;

  const renderContent = () => (
    <div className="w-full h-full relative group bg-white">
      {bannerUrl ? (
        <img src={bannerUrl} alt={current.titulo} className="w-full h-full object-cover transition-opacity duration-500" />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4">
          {current.logo_url && <img src={current.logo_url} alt={current.titulo} className="h-16 w-16 object-contain" />}
          <span className="ml-4 font-bold text-gray-700">{current.titulo}</span>
        </div>
      )}
      {current.sitio_web && (
        <a href={current.sitio_web} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Visitar sitio de ${current.titulo}`}></a>
      )}
    </div>
  );

  if (posicion === 'inferior_flotante') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.2)]">
        <div className="w-full h-16 md:h-24 relative overflow-hidden">
          {renderContent()}
        </div>
      </div>
    );
  }

  if (posicion === 'lateral') {
    return (
      <div className="w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 h-64 md:h-[600px] relative mb-6">
        {renderContent()}
      </div>
    );
  }

  // cabecera
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 h-24 md:h-32 relative mb-6">
      {renderContent()}
    </div>
  );
}
