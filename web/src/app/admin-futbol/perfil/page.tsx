"use client";
import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Link as LinkIcon, Palette, ArrowLeft, Loader2, ExternalLink, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PerfilOrganizadorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [perfil, setPerfil] = useState({
    enlace_sitio: "",
    logo_url: "",
    banner_url: "",
    color_primario: "#1e3a8a",
    texto_1: "",
    texto_2: "",
    visibilidad: "publico",
    tipo_sede: "fisico"
  });

  useEffect(() => {
    cargarPerfil();
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
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between">
            <div className="flex gap-4">
               <button type="button" className="text-gray-500 hover:text-gray-800"><LinkIcon size={20}/></button>
               <button type="button" className="text-gray-500 hover:text-gray-800"><ImageIcon size={20}/></button>
            </div>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
              Guardar
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* SECCION IMAGENES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
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
                   <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
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
                  <input type="text" value={perfil.texto_1} onChange={e => setPerfil({...perfil, texto_1: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500" placeholder="Ej. Bienvenido a nuestra liga" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1 flex justify-between">
                    <span>Información del organizador (Texto 2)</span>
                    <span className="text-xs">{perfil.texto_2.length}/70</span>
                  </label>
                  <input type="text" maxLength={70} value={perfil.texto_2} onChange={e => setPerfil({...perfil, texto_2: e.target.value})} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500" placeholder="Ej. Liga oficial de la ciudad..." />
                </div>
              </div>
            </div>

            <hr />

            {/* ENLACES Y PRIVACIDAD */}
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-blue-600 mb-2">Enlace de tu Página Pública</h3>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex flex-1 items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                    <span className="text-gray-500 pl-4 py-3 whitespace-nowrap font-mono text-sm bg-gray-200">micancha.com.py/organizador/</span>
                    <input 
                      type="text" 
                      value={perfil.enlace_sitio} 
                      onChange={e => setPerfil({...perfil, enlace_sitio: e.target.value})}
                      className="flex-1 px-2 py-3 bg-gray-100 focus:outline-none focus:bg-white text-blue-700 font-bold" 
                      placeholder="mi-liga-2027" 
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
                        onClick={() => window.open(`/organizador/${perfil.enlace_sitio}`, '_blank')}
                        className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold transition flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={20} /> Visitar Página
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Este es el enlace que compartirás con jugadores y público para que vean tus torneos.</p>
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
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
