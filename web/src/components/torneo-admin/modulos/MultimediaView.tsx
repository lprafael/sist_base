"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Link as LinkIcon, FileText, PlaySquare, Film, Download, Loader2, Edit2, Maximize, X, Trash2, Save, Send, Video, Play, Tv } from 'lucide-react';
import YouTubeEmbed, { getYouTubeThumbnail, getYouTubeVideoId } from '@/components/YouTubeEmbed';

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
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  
  // Video input state
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTagInput, setVideoTagInput] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);

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
  }, [torneoId, selectedMedia?.id]);

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
          const logoWidth = Math.min(canvas.width * 0.15, 200);
          const logoHeight = (logo.height / logo.width) * logoWidth;
          
          const padding = 20;
          const x = canvas.width - logoWidth - padding;
          const y = canvas.height - logoHeight - padding;

          ctx.drawImage(logo, x, y, logoWidth, logoHeight);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          }, file.type);
        };
        logo.onerror = () => {
          resolve(file);
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

  const handleAddYouTubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;

    const vidId = getYouTubeVideoId(videoUrlInput);
    if (!vidId) {
      alert("Por favor ingresa una URL válida de YouTube.");
      return;
    }

    setIsSavingVideo(true);
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;
      const { access_token } = JSON.parse(sessionStr);

      const res = await fetch(`${API_URL}/multimedia/link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: videoUrlInput.trim(),
          torneo_id: torneoId,
          tipo_medio: 'youtube',
          etiquetas: videoTagInput.trim()
        })
      });

      if (res.ok) {
        setVideoUrlInput('');
        setVideoTagInput('');
        setShowAddVideoModal(false);
        fetchMedia();
      } else {
        alert('Error al guardar el enlace de video');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setIsSavingVideo(false);
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
        fetchMedia();
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
              Aplicar escudo del torneo al subir fotos
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
              <div className="absolute top-10 right-0 bg-[#0f3b7b] text-white rounded-xl shadow-xl w-64 p-3 z-50 animate-in fade-in zoom-in-95 duration-200 border border-blue-800 space-y-1">
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium text-sm"
                >
                  <ImageIcon size={18} className="text-blue-300" /> Subir Fotos
                </button>
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    setShowAddVideoModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors font-medium text-sm"
                >
                  <Video size={18} className="text-red-400" /> Añadir Video de YouTube
                </button>
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
              className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-square bg-slate-900 cursor-pointer"
              onClick={() => openDetail(media)}
            >
              {media.tipo_medio === 'youtube' ? (
                <>
                  <img 
                    src={getYouTubeThumbnail(media.url)} 
                    alt="YouTube Video" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100" 
                  />
                  {/* Play badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-600 transition-all border border-white/30">
                      <Play size={22} className="ml-1 fill-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                    YOUTUBE
                  </div>
                </>
              ) : media.tipo_medio === 'galeria' ? (
                <img 
                  src={`${API_URL}${media.url}`} 
                  alt="Media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <FileText className="text-slate-400" size={40} />
                </div>
              )}

              {media.etiquetas && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded truncate max-w-[90%] backdrop-blur-sm">
                  {media.etiquetas}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Video size={28} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-600">No hay fotos ni videos subidos aún</p>
          <p className="text-xs text-slate-400 mt-1">Sube fotos o añade enlaces de YouTube de las repeticiones.</p>
        </div>
      )}

      {/* Modal para Añadir Video de YouTube */}
      {showAddVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600/20 text-red-500 rounded-lg border border-red-500/30">
                  <Video size={20} />
                </div>
                <h3 className="font-bold text-lg text-white">Añadir Video o Repetición de YouTube</h3>
              </div>
              <button 
                onClick={() => setShowAddVideoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddYouTubeVideo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enlace de YouTube *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título o Etiquetas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Final Kumite Masculino - Tatami 1"
                  value={videoTagInput}
                  onChange={(e) => setVideoTagInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {videoUrlInput && getYouTubeVideoId(videoUrlInput) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <img
                    src={getYouTubeThumbnail(videoUrlInput)}
                    alt="Preview"
                    className="w-20 h-12 object-cover rounded-lg bg-black shrink-0"
                  />
                  <div className="text-xs text-slate-600 truncate">
                    <span className="font-bold text-green-700 block">Video Detectado</span>
                    ID: {getYouTubeVideoId(videoUrlInput)}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingVideo || !videoUrlInput.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-red-600/30 disabled:opacity-50"
                >
                  {isSavingVideo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Guardar Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
                  {selectedMedia.tipo_medio === 'youtube' ? '🎥 Video de YouTube' : '🖼️ Foto'}
                </span>
                {!isPublicView && (
                  <button 
                    onClick={() => {
                      setEditTag(selectedMedia.etiquetas || '');
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="Editar etiqueta"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (selectedMedia.tipo_medio === 'youtube') {
                      window.open(selectedMedia.url, '_blank');
                    } else {
                      window.open(`${API_URL}${selectedMedia.url}`, '_blank');
                    }
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                  title="Abrir en ventana nueva"
                >
                  <Maximize size={18} />
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50 items-center justify-start p-4">
              <div className="relative w-full max-w-3xl">
                {selectedMedia.tipo_medio === 'youtube' ? (
                  <YouTubeEmbed 
                    url={selectedMedia.url} 
                    titulo={selectedMedia.etiquetas || "Video del Torneo"} 
                    showChannelSelector={false}
                  />
                ) : (
                  <img 
                    src={`${API_URL}${selectedMedia.url}`} 
                    alt="Full Media" 
                    className="max-h-[60vh] mx-auto object-contain shadow-md rounded-xl border border-slate-200 bg-black"
                  />
                )}
                
                {selectedMedia.etiquetas && selectedMedia.tipo_medio !== 'youtube' && (
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {selectedMedia.etiquetas}
                    </span>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="w-full max-w-xl mt-6 mb-4">
                <h4 className="font-bold text-slate-700 text-sm mb-3">Comentarios</h4>
                {selectedMedia.comentarios && selectedMedia.comentarios.length > 0 ? (
                  <div className="flex flex-col gap-2.5 mb-4">
                    {selectedMedia.comentarios.map((c: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-800 text-sm">{c.texto}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(c.fecha).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 text-xs mb-4">Aún no hay comentarios.</p>
                )}

                <form onSubmit={handleAddComment} className="flex gap-2 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                  <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Deja un comentario..."
                    className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-1.5 outline-none text-slate-700 text-sm"
                    disabled={isUpdating}
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isUpdating}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 transition"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Edit Tag Modal (Overlay inside Detail) */}
          {showEditModal && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Editar Etiqueta</h3>
                <div className="mb-6">
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    placeholder="Título o Etiqueta"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => handleDelete(selectedMedia.id)}
                    className="text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition"
                  >
                    Eliminar
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowEditModal(false)}
                      className="text-slate-500 font-semibold hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdateTag}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition shadow"
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
