"use client";
import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Link as LinkIcon, Palette, ArrowLeft, Loader2, ExternalLink, Copy, MapPin, Share2, Globe, Layout, CheckCircle2, QrCode, Download, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PerfilOrganizadorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [perfil, setPerfil] = useState({
    enlace_sitio: "",
    logo_url: "",
    banner_url: "",
    color_primario: "#1e3a8a",
    texto_1: "",
    texto_2: "",
    visibilidad: "publico",
    tipo_sede: "fisico",
    acerca_de: "",
    idioma: "Spanish; Castilian",
    pais: "Paraguay",
    departamento: "Departamento Central",
    ciudad: "",
    ubicacion_exacta: "",
    facebook: "",
    instagram: "",
    youtube: "",
    twitch: "",
    twitter: "",
    whatsapp: "",
    email: "",
    telefono: "",
    opcion_chat: false,
    opcion_publicidad: "ninguno",
    posicion_banner: "inferior_flotante",
    plantilla: "clasica"
  });

  useEffect(() => {
    cargarPerfil();
    try {
      const sessionStr = localStorage.getItem('user_session') || '{}';
      const sessionData = JSON.parse(sessionStr);
      const adminBackup = localStorage.getItem('admin_session_backup');
      
      let isUserAdmin = (
        sessionData.role === 'admin' || 
        sessionData.role === 'super' ||
        sessionData.rol === 'admin' || 
        sessionData.rol === 'super' ||
        sessionData.user?.rol === 'admin' ||
        sessionData.user?.rol === 'super' ||
        sessionData.is_impersonating === true ||
        sessionData.impersonator_role === 'admin'
      );
      
      if (adminBackup) {
        try {
          const backupData = JSON.parse(adminBackup);
          if (
            backupData.role === 'admin' || 
            backupData.role === 'super' || 
            backupData.rol === 'admin' || 
            backupData.rol === 'super'
          ) {
            isUserAdmin = true;
          }
        } catch (e) {}
      }

      setIsAdmin(!!isUserAdmin);
    } catch (e) {}
  }, []);

  const API_URL = "https://api.micancha.com.py";

  const getToken = () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      return sessionData.access_token || sessionData.token || localStorage.getItem('token') || '';
    } catch (e) {
      return localStorage.getItem('token') || '';
    }
  };

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/organizador/perfil`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) {
        const data = await res.json();
        setPerfil(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    let payload = { ...perfil };
    if (!payload.enlace_sitio) {
      payload.enlace_sitio = "org-" + Math.random().toString(36).substring(2, 8);
      setPerfil(payload);
    }

    try {
      const res = await fetch(`${API_URL}/organizador/perfil`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(res.ok) {
        setMessage("✅ Perfil guardado exitosamente.");
      } else {
        setMessage("❌ " + data.detail);
      }
    } catch(e) {
      setMessage("❌ Error de conexión al guardar.");
    }
    setSaving(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 5MB.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API_URL}/organizador/perfil/logo`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil({...perfil, logo_url: data.url});
      } else {
        alert("Error al subir el logo");
      }
    } catch(err) {
      alert("Error de conexión al subir imagen");
    }
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 5MB.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API_URL}/organizador/perfil/banner`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil({...perfil, banner_url: data.url});
      } else {
        alert("Error al subir el banner");
      }
    } catch(err) {
      alert("Error de conexión al subir imagen");
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <div className="bg-blue-900 text-white p-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-blue-800 rounded-full transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Página del organizador</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 px-4">
        {message && (
          <div className={`p-4 mb-6 rounded-lg font-bold ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={guardarPerfil} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* HEADER: ENLACES Y VISIBILIDAD */}
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex gap-2">
               <button 
                 type="button" 
                 title="Ver y descargar Código QR"
                 onClick={() => {
                   if (!perfil.enlace_sitio) return;
                   setShowQrModal(true);
                 }}
                 className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-sm transition border border-blue-200 shadow-sm"
               >
                 <QrCode size={18}/> Código QR
               </button>
               <button 
                 type="button" 
                 title="Compartir página"
                 onClick={() => {
                   if (!perfil.enlace_sitio) return;
                   setShowQrModal(true);
                 }}
                 className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 bg-white transition shadow-sm"
               >
                 <Share2 size={18}/>
               </button>
               <button 
                 type="button" 
                 title="Ver perfil público"
                 onClick={() => {
                   if(perfil.enlace_sitio) window.open(`/organizador/${perfil.enlace_sitio}`, '_blank');
                 }}
                 className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 bg-white transition shadow-sm"
               >
                 <Globe size={18}/>
               </button>
            </div>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-sm">
              {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
              Guardar
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* SECCION IMAGENES */}
            <div id="seccion-imagenes" className="grid grid-cols-1 md:grid-cols-4 gap-6 scroll-mt-24">
              <div className="col-span-1">
                <label className="block text-sm text-gray-500 mb-1">Organización del campeonato</label>
                <div className="w-full aspect-[4/5] bg-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 transition overflow-hidden relative group">
                  {perfil.logo_url ? (
                    <img src={perfil.logo_url} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <>
                      <span className="text-4xl text-gray-400 mb-2">+</span>
                      <span className="text-xs text-gray-500">200x240</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="w-11/12 text-white text-xs"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs text-white">o pega una URL:</span>
                    <input 
                      type="text" 
                      placeholder="URL del Logo" 
                      value={perfil.logo_url}
                      onChange={e => setPerfil({...perfil, logo_url: e.target.value})}
                      className="w-11/12 text-black px-2 py-1 text-xs rounded"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-3">
                <div className="w-full aspect-[21/9] bg-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 transition overflow-hidden relative group">
                  {perfil.banner_url ? (
                    <img src={perfil.banner_url} className="w-full h-full object-cover" alt="Banner" />
                  ) : (
                    <>
                      <span className="text-4xl text-gray-400 mb-2">+</span>
                      <span className="text-xs text-gray-500">1440x482</span>
                    </>
                  )}
                   <div className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleUploadBanner}
                      className="w-8/12 text-white text-sm"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-sm text-white">o pega una URL:</span>
                    <input 
                      type="text" 
                      placeholder="URL del Banner" 
                      value={perfil.banner_url}
                      onChange={e => setPerfil({...perfil, banner_url: e.target.value})}
                      className="w-8/12 text-black px-4 py-2 text-sm rounded"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCION PLANTILLAS */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layout size={22} className="text-blue-600"/>
                <h3 className="text-lg font-bold text-gray-800">Elige la Plantilla de tu Página</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Selecciona el diseño y estilo visual de tu sitio público. Todas tus características y contenidos se adaptan automáticamente a la plantilla seleccionada.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* PLANTILLA 1: CLASICA */}
                <div 
                  onClick={() => setPerfil({...perfil, plantilla: 'clasica'})}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition relative bg-white flex flex-col justify-between hover:shadow-md ${
                    (perfil.plantilla || 'clasica') === 'clasica' ? 'border-blue-600 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {(perfil.plantilla || 'clasica') === 'clasica' && (
                    <div className="absolute top-2 right-2 text-blue-600 bg-blue-50 rounded-full p-1 shadow-sm">
                      <CheckCircle2 size={20}/>
                    </div>
                  )}
                  <div>
                    <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden relative mb-3 border border-gray-200 shadow-inner">
                      <div className="w-full h-10 bg-blue-800"></div>
                      <div className="absolute top-6 left-3 w-8 h-8 rounded-full bg-white border-2 border-white shadow flex items-center justify-center text-[7px] font-bold text-blue-900">LOGO</div>
                      <div className="p-2 pt-5 flex gap-1.5">
                        <div className="w-1/3 h-5 bg-white rounded border border-gray-200"></div>
                        <div className="w-2/3 h-5 bg-blue-50 rounded border border-blue-100"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Opción 1</span>
                      <h4 className="font-bold text-sm text-gray-800">Clásica</h4>
                    </div>
                    <p className="text-xs text-gray-500">Diseño equilibrado con banner superior completo, logo superpuesto y barra lateral.</p>
                  </div>
                  <button 
                    type="button"
                    className={`mt-4 w-full py-1.5 rounded-lg text-xs font-bold transition ${
                      (perfil.plantilla || 'clasica') === 'clasica' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {(perfil.plantilla || 'clasica') === 'clasica' ? '✓ Plantilla Activa' : 'Seleccionar Clásica'}
                  </button>
                </div>

                {/* PLANTILLA 2: DEPORTIVA / ARENA PRO */}
                <div 
                  onClick={() => setPerfil({...perfil, plantilla: 'deportiva'})}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition relative bg-white flex flex-col justify-between hover:shadow-md ${
                    perfil.plantilla === 'deportiva' ? 'border-blue-600 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {perfil.plantilla === 'deportiva' && (
                    <div className="absolute top-2 right-2 text-blue-600 bg-blue-50 rounded-full p-1 shadow-sm">
                      <CheckCircle2 size={20}/>
                    </div>
                  )}
                  <div>
                    <div className="w-full h-24 bg-slate-900 rounded-lg overflow-hidden relative mb-3 border border-slate-800 p-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 border border-white/50 flex items-center justify-center text-[7px] text-white font-black shadow">FC</div>
                        <div className="h-1.5 w-16 bg-white/30 rounded"></div>
                      </div>
                      <div className="w-full h-5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded flex items-center justify-around px-1 text-[6px] text-white font-bold tracking-wider">
                        <span>TORNEOS</span>
                        <span>MÉTRICAS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Opción 2</span>
                      <h4 className="font-bold text-sm text-gray-800">Deportiva Arena</h4>
                    </div>
                    <p className="text-xs text-gray-500">Header estilo hero con temática stadium dark, insignias glowing y resumen de estadísticas.</p>
                  </div>
                  <button 
                    type="button"
                    className={`mt-4 w-full py-1.5 rounded-lg text-xs font-bold transition ${
                      perfil.plantilla === 'deportiva' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {perfil.plantilla === 'deportiva' ? '✓ Plantilla Activa' : 'Seleccionar Deportiva'}
                  </button>
                </div>

                {/* PLANTILLA 3: MINIMALISTA / EDITORIAL */}
                <div 
                  onClick={() => setPerfil({...perfil, plantilla: 'minimalista'})}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition relative bg-white flex flex-col justify-between hover:shadow-md ${
                    perfil.plantilla === 'minimalista' ? 'border-blue-600 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {perfil.plantilla === 'minimalista' && (
                    <div className="absolute top-2 right-2 text-blue-600 bg-blue-50 rounded-full p-1 shadow-sm">
                      <CheckCircle2 size={20}/>
                    </div>
                  )}
                  <div>
                    <div className="w-full h-24 bg-stone-50 rounded-lg overflow-hidden relative mb-3 border border-stone-200 p-2 flex gap-2">
                      <div className="w-1/3 bg-white border border-stone-200 rounded p-1 flex flex-col items-center justify-center">
                        <div className="w-6 h-6 rounded border border-stone-300 bg-stone-100 mb-1 flex items-center justify-center text-[6px] font-serif">M</div>
                        <div className="w-full h-1 bg-stone-400 rounded"></div>
                      </div>
                      <div className="w-2/3 space-y-1.5 flex flex-col justify-center">
                        <div className="w-full h-3 bg-white border border-stone-200 rounded"></div>
                        <div className="w-full h-3 bg-white border border-stone-200 rounded"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">Opción 3</span>
                      <h4 className="font-bold text-sm text-gray-800">Minimalista Editorial</h4>
                    </div>
                    <p className="text-xs text-gray-500">Estilo sobrio y limpio, encabezado tipográfico, tarjetas horizontales estilizadas y máxima claridad.</p>
                  </div>
                  <button 
                    type="button"
                    className={`mt-4 w-full py-1.5 rounded-lg text-xs font-bold transition ${
                      perfil.plantilla === 'minimalista' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {perfil.plantilla === 'minimalista' ? '✓ Plantilla Activa' : 'Seleccionar Minimalista'}
                  </button>
                </div>

              </div>
            </div>

            <hr />

            {/* COLOR Y TEXTOS */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Palette size={20} className="text-gray-500"/>
                <span className="font-bold text-gray-700">Color Primario</span>
                <input 
                  type="color" 
                  value={perfil.color_primario} 
                  onChange={e => setPerfil({...perfil, color_primario: e.target.value})}
                  className="w-10 h-10 border-0 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Texto 1</label>
                  <input type="text" value={perfil.texto_1 || ''} onChange={e => setPerfil({...perfil, texto_1: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500" placeholder="Ej. Bienvenido a nuestra liga" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1 flex justify-between">
                    <span>Información del organizador (Texto 2)</span>
                    <span className="text-xs">{(perfil.texto_2 || '').length}/180</span>
                  </label>
                  <input type="text" maxLength={180} value={perfil.texto_2 || ''} onChange={e => setPerfil({...perfil, texto_2: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500" placeholder="Ej. Liga oficial de la ciudad..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Acerca de</label>
                  <textarea 
                    rows={4} 
                    value={perfil.acerca_de || ''} 
                    onChange={e => setPerfil({...perfil, acerca_de: e.target.value})} 
                    className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500" 
                    placeholder="Acá va acerca de...."
                  ></textarea>
                </div>
              </div>
            </div>

            <hr />

            {/* ENLACES Y PRIVACIDAD */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-blue-600">Enlace de tu Página Pública</h3>
                  {isAdmin ? (
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-300 shadow-sm">
                      🛡️ Administrador: Enlace Editable
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-gray-200">
                      🔒 Enlace Fijo (Asignado por Administrador)
                    </span>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className={`flex flex-1 items-center rounded-lg overflow-hidden border transition-all ${isAdmin ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-gray-300 bg-gray-100'}`}>
                    <span className={`pl-4 py-3 whitespace-nowrap font-mono text-sm ${isAdmin ? 'bg-blue-50 text-blue-900 font-semibold' : 'bg-gray-200 text-gray-500'}`}>
                      micancha.com.py/organizador/
                    </span>
                    <input 
                      type="text" 
                      value={perfil.enlace_sitio} 
                      onChange={e => {
                        if (!isAdmin) return;
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
                        setPerfil({...perfil, enlace_sitio: val});
                      }}
                      className={`flex-1 px-3 py-3 font-bold focus:outline-none ${isAdmin ? 'bg-white text-blue-700 focus:bg-white cursor-text' : 'bg-gray-100 text-gray-500 cursor-not-allowed select-none'}`}
                      placeholder="mi-liga" 
                      readOnly={!isAdmin}
                    />
                  </div>
                  {perfil.enlace_sitio && (
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/organizador/${perfil.enlace_sitio}`;
                          navigator.clipboard.writeText(url);
                          alert("Enlace copiado: " + url);
                        }}
                        className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition flex items-center justify-center"
                        title="Copiar enlace"
                      >
                        <Copy size={20} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="px-3.5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold transition flex items-center justify-center gap-1.5 border border-blue-200"
                        title="Ver y descargar Código QR"
                      >
                        <QrCode size={20} /> QR
                      </button>
                      <button 
                        type="button"
                        onClick={() => window.open(`/organizador/${perfil.enlace_sitio}`, '_blank')}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <ExternalLink size={20} /> Visitar Página
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {isAdmin 
                    ? "✨ Modo Administrador: Puedes modificar libremente el nombre de la URL de este organizador."
                    : "Este es el enlace que compartirás con jugadores y público para que vean tus torneos. (Solo modificable por el administrador del sistema)."
                  }
                </p>
              </div>

              <div>
                <h3 className="font-bold text-blue-600 mb-3">¿Quién puede ver?</h3>
                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input type="radio" name="visibilidad" value="privado" checked={perfil.visibilidad === 'privado'} onChange={e => setPerfil({...perfil, visibilidad: e.target.value})} className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">Privado</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="visibilidad" value="publico" checked={perfil.visibilidad === 'publico'} onChange={e => setPerfil({...perfil, visibilidad: e.target.value})} className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">Público</p>
                    <p className="text-sm text-gray-500">Cada uno puede buscar y ver</p>
                  </div>
                </label>
              </div>

              <div>
                <h3 className="font-bold text-blue-600 mb-3">¿Dónde se llevan a cabo los campeonatos?</h3>
                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input type="radio" name="sede" value="fisico" checked={perfil.tipo_sede === 'fisico'} onChange={e => setPerfil({...perfil, tipo_sede: e.target.value})} className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-gray-800">Campeonato jugado en persona</p>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="sede" value="internet" checked={perfil.tipo_sede === 'internet'} onChange={e => setPerfil({...perfil, tipo_sede: e.target.value})} className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-gray-800">Campeonato jugado en internet</p>
                </label>
              </div>

              <div>
                <h3 className="font-bold text-blue-600 mb-2">Idioma</h3>
                <select value={perfil.idioma} onChange={e => setPerfil({...perfil, idioma: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500 bg-transparent">
                  <option value="Spanish; Castilian">Spanish; Castilian</option>
                  <option value="English">English</option>
                  <option value="Portuguese">Portuguese</option>
                </select>
              </div>

              {perfil.tipo_sede === 'fisico' && (
                <div>
                  <h3 className="font-bold text-blue-600 mb-3">Ubicación de la sede</h3>
                  <div className="space-y-4">
                    <select value={perfil.pais} onChange={e => setPerfil({...perfil, pais: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500 bg-transparent">
                      <option value="Paraguay">Paraguay</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Brasil">Brasil</option>
                    </select>
                    <select value={perfil.departamento} onChange={e => setPerfil({...perfil, departamento: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500 bg-transparent">
                      <option value="Departamento Central">Departamento Central</option>
                      <option value="Asunción">Asunción</option>
                      <option value="Alto Paraná">Alto Paraná</option>
                    </select>
                    <div className="flex items-center gap-2 border-b border-gray-300 py-2">
                      <MapPin size={20} className="text-gray-500" />
                      <input type="text" value={perfil.ubicacion_exacta || ''} onChange={e => setPerfil({...perfil, ubicacion_exacta: e.target.value})} placeholder="Ubicación" className="flex-1 focus:outline-none focus:border-blue-500 bg-transparent" />
                      <span className="text-blue-500 cursor-pointer text-sm font-medium">Editar</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <hr />

            {/* REDES SOCIALES Y CONTACTO */}
            <div>
               <h3 className="font-bold text-blue-600 mb-4">Redes sociales y contactos</h3>
               <div className="space-y-4">
                 {[
                   { name: 'facebook', label: 'facebook' },
                   { name: 'instagram', label: 'instagram' },
                   { name: 'youtube', label: 'youtube' },
                   { name: 'twitch', label: 'twitch' },
                   { name: 'twitter', label: 'twitter' },
                   { name: 'whatsapp', label: 'whatsapp' },
                 ].map(red => (
                   <div key={red.name} className="relative">
                     <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-gray-500">{red.label}</label>
                     <input 
                       type="text" 
                       value={(perfil as any)[red.name] || ''} 
                       onChange={e => setPerfil({...perfil, [red.name]: e.target.value})} 
                       placeholder="Pega el enlace aquí" 
                       className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500"
                     />
                   </div>
                 ))}
                 
                 <div className="relative mt-6">
                   <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-gray-500">Email</label>
                   <input 
                     type="email" 
                     value={perfil.email || ''} 
                     onChange={e => setPerfil({...perfil, email: e.target.value})} 
                     className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500"
                   />
                 </div>

                 <div className="relative mt-4">
                   <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-gray-500">Teléfono</label>
                   <input 
                     type="tel" 
                     value={perfil.telefono || ''} 
                     onChange={e => setPerfil({...perfil, telefono: e.target.value})} 
                     className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500"
                   />
                 </div>

                 <div className="mt-6 flex items-center gap-3">
                   <input 
                     type="checkbox" 
                     id="opcion_chat" 
                     checked={perfil.opcion_chat} 
                     onChange={e => setPerfil({...perfil, opcion_chat: e.target.checked})} 
                     className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                   />
                   <label htmlFor="opcion_chat" className="text-gray-700 font-medium cursor-pointer">
                     Opción de chat de la aplicación
                   </label>
                 </div>

                 <div className="mt-6 pt-4 border-t border-gray-100">
                    <h3 className="font-bold text-blue-600 mb-4">Patrocinios y Apoyos</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mostrar publicidad en:</label>
                        <select 
                          value={perfil.opcion_publicidad} 
                          onChange={e => setPerfil({...perfil, opcion_publicidad: e.target.value})} 
                          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="ninguno">Sin publicidad</option>
                          <option value="organizador">Página del organizador</option>
                          <option value="torneo">Página del torneo</option>
                          <option value="ambos">En ambos</option>
                        </select>
                      </div>

                      {perfil.opcion_publicidad !== 'ninguno' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Posición de los Banners:</label>
                          <select 
                            value={perfil.posicion_banner} 
                            onChange={e => setPerfil({...perfil, posicion_banner: e.target.value})} 
                            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="inferior_flotante">Carrusel Inferior Flotante</option>
                            <option value="cabecera">Cabecera (Arriba)</option>
                            <option value="lateral">Columna Lateral</option>
                          </select>
                        </div>
                      )}
                    </div>
                 </div>

               </div>
            </div>

          </div>
        </form>
      </div>

      {/* MODAL CÓDIGO QR Y COMPARTIR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
                <QrCode size={30} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Código QR del Organizador</h3>
              <p className="text-sm text-gray-500 mt-1">
                {(perfil as any).nombre_liga || perfil.texto_1 || "Página Pública Oficial"}
              </p>
            </div>

            {/* QR Code Container con fondo blanco puro y marco nítido para máximo contraste */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=12&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${perfil.enlace_sitio}`)}`}
                  alt="Código QR de la Liga"
                  className="w-52 h-52 object-contain"
                />
              </div>
              <p className="text-xs font-mono text-blue-600 font-bold mt-2.5 break-all text-center">
                micancha.com.py/organizador/{perfil.enlace_sitio}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/organizador/${perfil.enlace_sitio}`;
                  navigator.clipboard.writeText(url);
                  alert("✅ Enlace copiado al portapapeles: " + url);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition"
              >
                <Copy size={16} /> Copiar Enlace
              </button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${perfil.enlace_sitio}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                download={`QR_${perfil.enlace_sitio || 'organizador'}.png`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition border border-blue-200 text-center"
              >
                <Download size={16} /> Descargar QR
              </a>
            </div>

            <div className="space-y-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`🏆 ¡Visita nuestra página oficial de torneos en Mi Cancha!\n${typeof window !== 'undefined' ? window.location.origin : 'https://micancha.com.py'}/organizador/${perfil.enlace_sitio}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-sm"
              >
                📱 Compartir por WhatsApp
              </a>
              <button
                type="button"
                onClick={() => window.open(`/organizador/${perfil.enlace_sitio}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-semibold text-xs transition"
              >
                <ExternalLink size={14} /> Abrir página en el navegador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
