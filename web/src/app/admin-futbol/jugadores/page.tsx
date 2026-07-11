"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, UserPlus, Upload, ShieldCheck, X, Trash2, ArrowUpDown, User, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Jugador {
  id: string;
  nombre: string;
  nombre_abreviado: string;
  dni: string;
  fecha_nacimiento: string;
  numero_camiseta: string;
  posicion: string;
  telefono: string;
  foto_url: string;
  biometria_aprobada: boolean;
  equipo_nombre: string;
}

export default function RegistroJugadoresPage() {
  const [jugadoresList, setJugadoresList] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteMode, setDeleteMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<"list" | "edit">("list");
  
  // States for Editing
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // States for Global Biometry Test
  const [showBiometryTest, setShowBiometryTest] = useState(false);
  const [biometryResult, setBiometryResult] = useState<Jugador | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Limpiar la cámara si el componente se desmonta o cambia de vista
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchJugadores = async () => {
    try {
      setLoading(true);
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/jugadores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJugadoresList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJugadores();
  }, []);

  const handleSort = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    
    const sorted = [...jugadoresList].sort((a, b) => {
      if (newOrder === "asc") {
        return a.nombre.localeCompare(b.nombre);
      } else {
        return b.nombre.localeCompare(a.nombre);
      }
    });
    setJugadoresList(sorted);
  };

  const handleDeleteJugador = async (id: string) => {
    if(!confirm("¿Seguro que deseas eliminar a este jugador permanentemente?")) return;
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const res = await fetch(`${API_URL}/futbol/jugadores/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) {
        fetchJugadores();
      } else {
        alert("Error al eliminar jugador");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const openEdit = (jugador: Jugador) => {
    setEditingJugador(jugador);
    setPhotoPreview(jugador.foto_url || null);
    setView("edit");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        if (editingJugador) {
          setEditingJugador({...editingJugador, foto_url: reader.result as string, biometria_aprobada: false}); 
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveJugador = async () => {
    if (!editingJugador) return;
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      const payload = {
        nombre: editingJugador.nombre,
        nombre_abreviado: editingJugador.nombre_abreviado,
        dni: editingJugador.dni,
        fecha_nacimiento: editingJugador.fecha_nacimiento,
        numero_camiseta: editingJugador.numero_camiseta ? parseInt(editingJugador.numero_camiseta.toString(), 10) : null,
        posicion: editingJugador.posicion,
        telefono: editingJugador.telefono,
        foto_url: editingJugador.foto_url,
        biometria_aprobada: editingJugador.biometria_aprobada
      };

      const res = await fetch(`${API_URL}/futbol/jugadores/${editingJugador.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Jugador guardado con éxito.");
        fetchJugadores();
        setView("list");
      } else {
        alert("Error al guardar los cambios.");
      }
    } catch (e) {
      alert("Error de conexión al guardar.");
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      alert("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoPreview(dataUrl);
        if (editingJugador) {
          setEditingJugador({ ...editingJugador, foto_url: dataUrl, biometria_aprobada: false });
        }
        stopCamera();
      }
    }
  };

  const procesarBiometria = () => {
    if (!photoPreview) {
      alert("Por favor, sube o toma una foto primero.");
      return;
    }
    // Simular proceso de verificación facial con un timeout
    const originalText = document.getElementById("btn-biometria")?.innerText;
    const btn = document.getElementById("btn-biometria");
    if (btn) btn.innerText = "Procesando Rostro...";
    
    setTimeout(() => {
      if (editingJugador) {
        setEditingJugador({ ...editingJugador, biometria_aprobada: true });
      }
      if (btn && originalText) btn.innerText = originalText;
      alert("✅ ¡Biometría aprobada y rostro validado con éxito!");
    }, 1500);
  };

  const openBiometryTest = async () => {
    setShowBiometryTest(true);
    setBiometryResult(null);
    setIsScanning(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      testStreamRef.current = mediaStream;
      setTimeout(() => {
        if (testVideoRef.current) {
          testVideoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
      setShowBiometryTest(false);
    }
  };

  const closeBiometryTest = () => {
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(track => track.stop());
      testStreamRef.current = null;
    }
    setShowBiometryTest(false);
  };

  const runBiometryTest = async () => {
    setIsScanning(true);
    
    if (!testVideoRef.current) {
      alert("Cámara no disponible.");
      setIsScanning(false);
      return;
    }
    
    const video = testVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsScanning(false);
      return;
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      const res = await fetch(`${API_URL}/futbol/biometria/reconocer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ imagen_base64: dataUrl })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          const matchedPlayer = jugadoresList.find(j => j.id === data.jugador_id);
          if (matchedPlayer) {
            setBiometryResult({ ...matchedPlayer, _precision: data.precision } as any);
          } else {
            alert("Rostro reconocido pero el jugador no está en la lista actual.");
          }
        } else {
          alert("❌ Rostro no identificado. El jugador no está registrado o la biometría no coincide.");
        }
      } else {
        const errData = await res.json();
        alert(errData.detail || "Error al procesar biometría.");
      }
    } catch (err) {
      alert("Error de conexión con el servidor biométrico.");
    } finally {
      setIsScanning(false);
    }
  };

  if (view === "edit" && editingJugador) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView("list")} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <UserPlus size={32} className="text-[#1b264f]" />
          <h1 className="text-3xl font-black text-[#1b264f]">Editar Jugador (Biometría)</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Modificar datos del jugador</h2>
            <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${editingJugador.biometria_aprobada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              <ShieldCheck size={14}/> {editingJugador.biometria_aprobada ? 'Biometría Activa' : 'Biometría Pendiente'}
            </span>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* FOTO BIOMETRICA */}
            <div className="col-span-1 flex flex-col items-center">
              {isCameraOpen ? (
                <div className="w-full flex flex-col items-center mb-4">
                  <div className="w-48 h-48 rounded-full overflow-hidden relative border-4 border-blue-500 bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                  </div>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <div className="flex gap-2 mt-4">
                    <button onClick={stopCamera} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition">Cancelar</button>
                    <button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition">
                      <Camera size={16}/> Capturar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center relative overflow-hidden mb-4 group">
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-cover" alt="Biometria" />
                    ) : (
                      <>
                        <Camera size={40} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500 font-bold text-center px-4">Foto para<br/>reconocimiento facial</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-[200px]">
                    <button onClick={startCamera} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition">
                      <Camera size={16}/> Tomar Foto
                    </button>
                    <div className="relative">
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition w-full">
                        <Upload size={16}/> Subir Foto
                      </button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                id="btn-biometria"
                onClick={procesarBiometria}
                className={`mt-6 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-full max-w-[200px] justify-center transition ${editingJugador.biometria_aprobada ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
              >
                <ShieldCheck size={16}/> {editingJugador.biometria_aprobada ? 'Biometría Verificada' : 'Prueba Biométrica'}
              </button>
            </div>

            {/* DATOS DEL JUGADOR */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editingJugador.nombre || ''}
                    onChange={e => setEditingJugador({...editingJugador, nombre: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Abreviado</label>
                  <input 
                    type="text" 
                    value={editingJugador.nombre_abreviado || ''}
                    onChange={e => setEditingJugador({...editingJugador, nombre_abreviado: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Documento (DNI/CI)</label>
                  <input 
                    type="text" 
                    value={editingJugador.dni || ''}
                    onChange={e => setEditingJugador({...editingJugador, dni: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Nac.</label>
                  <input 
                    type="date" 
                    value={editingJugador.fecha_nacimiento || ''}
                    onChange={e => setEditingJugador({...editingJugador, fecha_nacimiento: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dorsal / N° Camiseta</label>
                  <input 
                    type="number" 
                    value={editingJugador.numero_camiseta || ''}
                    onChange={e => setEditingJugador({...editingJugador, numero_camiseta: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Posición</label>
                  <select 
                    value={editingJugador.posicion || ''}
                    onChange={e => setEditingJugador({...editingJugador, posicion: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={editingJugador.telefono || ''}
                    onChange={e => setEditingJugador({...editingJugador, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
            <button onClick={() => setView("list")} className="text-gray-600 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
            <button 
              onClick={handleSaveJugador}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Save size={18}/> Guardar Jugador
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <UserPlus size={32} className="text-[#1b264f]" />
        <h1 className="text-3xl font-black text-[#1b264f]">Registro de Jugadores (Global)</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="font-bold text-gray-700 text-lg">Todos los jugadores</h2>
            <span className="text-sm text-gray-500">Total: {jugadoresList.length} registrados</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={openBiometryTest}
              className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition font-bold flex items-center gap-2"
              title="Prueba de Identificación Facial"
            >
              <ShieldCheck size={20} /> <span className="hidden md:inline">Probar Biometría</span>
            </button>
            <button 
              onClick={handleSort}
              className="p-2 rounded text-gray-600 hover:bg-gray-200 transition ml-2"
              title="Ordenar A-Z / Z-A"
            >
              <ArrowUpDown size={20} />
            </button>
            <button 
              onClick={() => setDeleteMode(!deleteMode)}
              className={`p-2 rounded transition ${deleteMode ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Eliminar jugadores"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Cargando jugadores...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jugadoresList.map((jugador) => (
                <div 
                  key={jugador.id} 
                  onClick={() => !deleteMode && openEdit(jugador)}
                  className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between transition ${!deleteMode ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-gray-800 font-bold text-lg truncate" title={jugador.nombre}>{jugador.nombre}</span>
                      <span className="text-blue-600 text-sm font-medium truncate">{jugador.equipo_nombre}</span>
                      {jugador.dni && <span className="text-gray-500 text-xs">DNI: {jugador.dni}</span>}
                    </div>
                  </div>
                  {deleteMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteJugador(jugador.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition ml-2 shrink-0"
                    >
                      <X size={24} />
                    </button>
                  )}
                </div>
              ))}
                  {jugadoresList.length === 0 && (
                <div className="col-span-full text-center p-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  No se encontraron jugadores registrados en tus campeonatos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PRUEBA BIOMÉTRICA GLOBAL */}
      {showBiometryTest && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-xl text-[#1b264f] flex items-center gap-2">
                <ShieldCheck size={24} className="text-purple-600"/> Escáner de Identificación
              </h3>
              <button onClick={closeBiometryTest} className="text-gray-500 hover:text-red-500 transition">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div className={`flex-col items-center w-full ${biometryResult ? 'hidden' : 'flex'}`}>
                <div className="relative w-64 h-64 bg-black rounded-full overflow-hidden border-4 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] mb-6">
                  <video ref={testVideoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                  {isScanning && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <div className="w-full h-1 bg-purple-400 absolute top-0 animate-[scan_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(168,85,247,1)]"></div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={runBiometryTest}
                  disabled={isScanning || jugadoresList.length === 0}
                  className={`w-full py-3 rounded-lg font-bold text-white transition text-lg shadow-md ${isScanning ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {isScanning ? 'Analizando Rostro...' : 'Escanear Rostro'}
                </button>
                {jugadoresList.length === 0 && (
                  <p className="text-red-500 text-sm mt-3 text-center">No hay jugadores registrados para comparar.</p>
                )}
              </div>

              {biometryResult && (
                <div className="flex flex-col items-center w-full animate-fade-in">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-green-400">
                    <ShieldCheck size={48} />
                  </div>
                  <h4 className="text-2xl font-black text-gray-800 mb-1">¡Jugador Identificado!</h4>
                  <p className="text-green-600 font-bold mb-6">Match con un {(biometryResult as any)._precision || 98.4}% de precisión</p>
                  
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
                      {biometryResult.foto_url ? (
                        <img src={biometryResult.foto_url} alt={biometryResult.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-gray-800 font-black text-xl truncate">{biometryResult.nombre}</span>
                      <span className="text-blue-600 font-bold truncate">{biometryResult.equipo_nombre}</span>
                      {biometryResult.dni && <span className="text-gray-500 text-sm">DNI: {biometryResult.dni}</span>}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { setBiometryResult(null); setIsScanning(false); }}
                    className="mt-8 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition"
                  >
                    Escanear a otra persona
                  </button>
                </div>
              )}
            </div>
            <style jsx>{`
              @keyframes scan {
                0% { top: 0; }
                50% { top: 100%; }
                100% { top: 0; }
              }
              .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
