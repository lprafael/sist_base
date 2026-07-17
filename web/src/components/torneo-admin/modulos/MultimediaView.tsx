import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Link as LinkIcon, FileText, PlaySquare, Film, Download, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export default function MultimediaView({ torneoId }: { torneoId: string }) {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { token } = JSON.parse(sessionStr);
      
      const res = await fetch(`${API_URL}/multimedia/torneo/${torneoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [torneoId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowDropdown(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('torneo_id', torneoId);
    formData.append('tipo_medio', 'galeria');

    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { token } = JSON.parse(sessionStr);

      const res = await fetch(`${API_URL}/multimedia/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        // Recargar la lista
        fetchMedia();
      } else {
        alert('Error al subir el archivo');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[500px]">
      <div className="flex justify-end mb-6 relative">
        <div className="flex flex-col items-center">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-16 h-8 bg-[#1e40af] hover:bg-blue-900 text-white rounded-t-full flex items-center justify-center transition-colors shadow-sm"
            title="Añadir medio"
          >
            <Plus size={20} />
          </button>
          
          {mediaList.length === 0 && !isLoading && (
             <div className="text-slate-500 text-sm mt-1 font-medium bg-white px-3 py-1 rounded shadow-sm border border-slate-100">Aún no hay medios</div>
          )}

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-10 right-0 bg-[#0f3b7b] text-white rounded-xl shadow-xl w-64 p-3 z-50 animate-in fade-in zoom-in-95 duration-200 border border-blue-800">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium"
              >
                <ImageIcon size={18} /> Galería
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium">
                <LinkIcon size={18} /> Añadir enlace
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium">
                <FileText size={18} /> Crear noticias
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium">
                <PlaySquare size={18} /> Youtube
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium">
                <Film size={18} /> Galería de videos
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium border-t border-white/10 mt-1 pt-3">
                <Download size={18} /> Exportar
              </button>
            </div>
          )}
        </div>
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden" 
          accept="image/*" 
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : isUploading ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-600 font-medium">Subiendo imagen...</p>
        </div>
      ) : mediaList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mediaList.map((media) => (
            <div key={media.id} className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-square bg-slate-200">
              {media.tipo_medio === 'galeria' ? (
                <img src={`${API_URL}${media.url}`} alt="Media" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                  <FileText className="text-slate-400" size={40} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-slate-400 pt-10">
           <ImageIcon size={64} className="mb-4 opacity-20" />
           <p className="text-lg font-medium">La galería está vacía</p>
           <p className="text-sm">Sube fotos desde el botón +</p>
        </div>
      )}
    </div>
  );
}
