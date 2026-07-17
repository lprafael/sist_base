import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Link as LinkIcon, FileText, PlaySquare, Film, Download, Loader2, Edit2, Maximize, X, Trash2, Save, Send } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function MultimediaView({ torneoId, isPublicView = false, torneo }: { torneoId: string, isPublicView?: boolean, torneo?: any }) {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Modals state
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Edit & Comment states
  const [editTag, setEditTag] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Upload watermark checkbox
  const [applyWatermark, setApplyWatermark] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    try {
      const sessionStr = localStorage.getItem('user_session');
      let headers: any = {};
      
      if (sessionStr) {
        const { access_token } = JSON.parse(sessionStr);
        if (access_token) {
          headers['Authorization'] = `Bearer ${access_token}`;
        }
      }
      
      const res = await fetch(`${API_URL}/multimedia/torneo/${torneoId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
        
        // Update selectedMedia if open
        if (selectedMedia) {
          const updated = data.find((m: any) => m.id === selectedMedia.id);
          if (updated) setSelectedMedia(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [torneoId, selectedMedia?.id]); // Re-fetch on mount and if needed

  const applyWatermarkToImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Check if tournament has a logo
        const logoUrl = torneo?.configuracion?.logo;
        if (!logoUrl) {
          return resolve(file); // No logo to apply
        }

        const logo = new Image();
        logo.crossOrigin = "Anonymous";
        logo.onload = () => {
          // Calculate logo size (e.g., 15% of image width, max 200px)
          const logoWidth = Math.min(canvas.width * 0.15, 200);
          const logoHeight = (logo.height / logo.width) * logoWidth;
          
          // Position bottom right with padding
          const padding = 20;
          const x = canvas.width - logoWidth - padding;
          const y = canvas.height - logoHeight - padding;

          // Draw logo
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          }, file.type);
        };
        logo.onerror = () => {
          resolve(file); // Logo failed to load
        };
        logo.src = logoUrl.startsWith('http') ? logoUrl : `${API_URL}${logoUrl}`;
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowDropdown(false);

    let fileToUpload: Blob | File = file;
    
    if (applyWatermark && torneo?.configuracion?.logo) {
      fileToUpload = await applyWatermarkToImage(file);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload, file.name);
    if (torneoId && torneoId !== 'undefined') {
      formData.append('torneo_id', torneoId);
    }
    formData.append('tipo_medio', 'galeria');

    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { access_token } = JSON.parse(sessionStr);

      const res = await fetch(`${API_URL}/multimedia/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`
        },
        body: formData
      });

      if (res.ok) {
        fetchMedia();
      } else {
        alert('Error al subir el archivo');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) return;
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { access_token } = JSON.parse(sessionStr);

      const res = await fetch(`${API_URL}/multimedia/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      if (res.ok) {
        setShowEditModal(false);
        setShowDetailModal(false);
        fetchMedia();
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTag = async () => {
    if (!selectedMedia) return;
    setIsUpdating(true);
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { access_token } = JSON.parse(sessionStr);

      const res = await fetch(`${API_URL}/multimedia/${selectedMedia.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etiquetas: editTag })
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchMedia();
      } else {
        alert("Error al actualizar etiqueta");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedMedia) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/multimedia/${selectedMedia.id}/comentarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texto: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchMedia(); // Recarga y actualiza el selectedMedia
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetail = (media: any) => {
    setSelectedMedia(media);
    setShowDetailModal(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[500px] relative">
      <div className="flex justify-between items-center mb-6 relative">
        <div>
          {!isPublicView && torneo?.configuracion?.logo && (
            <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50">
              <input 
                type="checkbox" 
                checked={applyWatermark} 
                onChange={(e) => setApplyWatermark(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Aplicar escudo del torneo al subir
            </label>
          )}
        </div>
        {!isPublicView && (
          <div className="flex flex-col items-end">
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

            {showDropdown && (
            <div className="absolute top-10 right-0 bg-[#0f3b7b] text-white rounded-xl shadow-xl w-64 p-3 z-50 animate-in fade-in zoom-in-95 duration-200 border border-blue-800">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium"
              >
                <ImageIcon size={18} /> Galería
              </button>
              {/* Other options */}
            </div>
          )}
        </div>
        )}
        
        {!isPublicView && (
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden" 
            accept="image/*" 
          />
        )}
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
            <div 
              key={media.id} 
              className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-square bg-slate-200 cursor-pointer"
              onClick={() => openDetail(media)}
            >
              {media.tipo_medio === 'galeria' ? (
                <img src={`${API_URL}${media.url}`} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <FileText className="text-slate-400" size={40} />
                </div>
              )}
              {media.etiquetas && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">
                  {media.etiquetas}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>No hay archivos multimedia</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f4f6]/95 backdrop-blur-sm p-4">
          
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10">
              <div className="flex gap-2">
                {!isPublicView && (
                  <button 
                    onClick={() => {
                      setEditTag(selectedMedia.etiquetas || '');
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.open(`${API_URL}${selectedMedia.url}`, '_blank')}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                >
                  <Maximize size={20} />
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Image Content */}
            <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50 items-center justify-start p-4">
              <div className="relative max-w-full">
                <img 
                  src={`${API_URL}${selectedMedia.url}`} 
                  alt="Full Media" 
                  className="max-h-[60vh] object-contain shadow-md rounded border border-slate-200 bg-black"
                />
                {selectedMedia.etiquetas && (
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {selectedMedia.etiquetas}
                    </span>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="w-full max-w-lg mt-8 mb-4">
                {selectedMedia.comentarios && selectedMedia.comentarios.length > 0 ? (
                  <div className="flex flex-col gap-3 mb-6">
                    {selectedMedia.comentarios.map((c: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                        <p className="text-slate-800">{c.texto}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(c.fecha).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 mb-6">Sin comentarios aún</p>
                )}

                <form onSubmit={handleAddComment} className="flex gap-2 bg-white p-2 rounded-full shadow-sm border border-slate-200">
                  <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Deja un comentario"
                    className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 outline-none text-slate-700"
                    disabled={isUpdating}
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isUpdating}
                    className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-50 transition"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Edit Tag Modal (Overlay inside Detail) */}
          {showEditModal && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-[#f0edf5] rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
                <h3 className="text-2xl font-semibold text-slate-800 mb-6">Editar</h3>
                <div className="mb-8">
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    placeholder="Etiqueta"
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-blue-500 focus:ring-0 px-0 py-2 text-lg text-slate-700 placeholder-slate-400"
                  />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button 
                    onClick={() => handleDelete(selectedMedia.id)}
                    className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded transition"
                  >
                    Quitar
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowEditModal(false)}
                      className="text-slate-500 font-bold hover:bg-slate-100 px-4 py-2 rounded transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdateTag}
                      disabled={isUpdating}
                      className="text-[#1da1f2] font-bold hover:bg-blue-50 px-4 py-2 rounded transition"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
