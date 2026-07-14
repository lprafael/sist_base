"use client";
import React, { useState } from 'react';
import { Calendar, Image as ImageIcon, MapPin, Users, Activity, Trophy, Scale, Shield, BarChart2, CheckSquare, Eye, Printer, FileText, Loader2, GitMerge } from 'lucide-react';
import dynamic from 'next/dynamic';
import ImageCropperModal from '../ui/ImageCropperModal';

const LocationPickerMap = dynamic(() => import('../LocationPickerMap'), { ssr: false, loading: () => <div className="h-64 w-full bg-slate-100 flex items-center justify-center text-slate-400">Cargando mapa...</div> });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const MiniEditor = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (command: string, val: string | null = null) => {
    document.execCommand(command, false, val || undefined);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="border border-slate-300 rounded overflow-hidden flex flex-col">
       <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 items-center flex-wrap">
         <button type="button" onClick={() => exec('bold')} className="p-1.5 hover:bg-slate-200 rounded font-bold w-8 h-8 flex justify-center items-center" title="Negrita">B</button>
         <button type="button" onClick={() => exec('italic')} className="p-1.5 hover:bg-slate-200 rounded italic w-8 h-8 flex justify-center items-center" title="Cursiva">I</button>
         <button type="button" onClick={() => exec('underline')} className="p-1.5 hover:bg-slate-200 rounded underline w-8 h-8 flex justify-center items-center" title="Subrayado">U</button>
         <div className="w-px h-5 bg-slate-300 mx-1"></div>
         <button type="button" onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-slate-200 rounded text-sm w-8 h-8 flex justify-center items-center" title="Alinear Izquierda">⇤</button>
         <button type="button" onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-slate-200 rounded text-sm w-8 h-8 flex justify-center items-center" title="Centrar">↔</button>
         <button type="button" onClick={() => exec('justifyRight')} className="p-1.5 hover:bg-slate-200 rounded text-sm w-8 h-8 flex justify-center items-center" title="Alinear Derecha">⇥</button>
         <button type="button" onClick={() => exec('justifyFull')} className="p-1.5 hover:bg-slate-200 rounded text-sm w-8 h-8 flex justify-center items-center" title="Justificar">≡</button>
         <div className="w-px h-5 bg-slate-300 mx-1"></div>
         <select onChange={(e) => exec('fontSize', e.target.value)} className="text-sm bg-transparent border border-slate-300 rounded px-1 outline-none h-8">
           <option value="">Tamaño</option>
           <option value="1">Muy Pequeño</option>
           <option value="3">Normal</option>
           <option value="5">Grande</option>
           <option value="7">Muy Grande</option>
         </select>
       </div>
       <div 
         ref={editorRef}
         contentEditable 
         onInput={(e) => onChange(e.currentTarget.innerHTML)}
         className="p-3 min-h-[200px] outline-none max-h-[300px] overflow-y-auto"
         style={{ whiteSpace: 'pre-wrap' }}
         dangerouslySetInnerHTML={{ __html: value }}
       />
    </div>
  );
};

export default function ConfiguracionTab({ torneo, onUpdate, onSubSectionSelect }: { torneo: any, onUpdate: (data: any) => void, onSubSectionSelect: (section: string) => void }) {
  // Local state for basic fields to allow typing before saving (or we can save on blur)
  const [formData, setFormData] = useState({
    nombre: torneo.nombre || '',
    subtitulo: torneo.subtitulo || '',
    descripcion: torneo.descripcion || '',
    tipo_ubicacion: torneo.tipo_ubicacion || 'persona',
    privacidad: torneo.privacidad || 'publico',
    estado: torneo.estado || 'preparacion',
    fecha_inicio: torneo.fecha_inicio ? torneo.fecha_inicio.split('T')[0] : '',
    fecha_fin: torneo.fecha_fin ? torneo.fecha_fin.split('T')[0] : '',
    imagen_portada: torneo.imagen_portada || '',
    imagen_banner: torneo.imagen_banner || ''
  });
  
  const [uploadingImage, setUploadingImage] = useState<'portada'|'banner'|null>(null);
  const [cropImageState, setCropImageState] = useState<{ src: string, type: 'portada'|'banner' } | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // States for modals
  const [contactoData, setContactoData] = useState({
    telefono1: torneo.configuracion?.contacto?.telefono1 || '',
    telefono2: torneo.configuracion?.contacto?.telefono2 || '',
    email: torneo.configuracion?.contacto?.email || ''
  });
  const [colorSidebar, setColorSidebar] = useState<string>(torneo.configuracion?.color_sidebar || '#1e293b');
  const [ubicacionTexto, setUbicacionTexto] = useState(torneo.configuracion?.ubicacion_texto || '');
  const [ubicacionCoords, setUbicacionCoords] = useState<{lat: number, lng: number} | null>(
    torneo.configuracion?.ubicacion_lat ? { lat: torneo.configuracion.ubicacion_lat, lng: torneo.configuracion.ubicacion_lng } : null
  );
  const [reglasData, setReglasData] = useState<string>(
    (torneo.reglas && torneo.reglas.length > 0)
      ? (torneo.reglas.length === 1 && torneo.reglas[0].includes('<') ? torneo.reglas[0] : torneo.reglas.join('<br>'))
      : ''
  );
  const [premiosData, setPremiosData] = useState({
    puesto1: torneo.premios?.find((p:any) => p.puesto === 1)?.desc || '',
    puesto2: torneo.premios?.find((p:any) => p.puesto === 2)?.desc || '',
    puesto3: torneo.premios?.find((p:any) => p.puesto === 3)?.desc || '',
    otros: torneo.premios?.find((p:any) => p.puesto === 'otros')?.desc || '',
  });

  // Keep local state in sync if parent updates it (e.g. after a save)
  React.useEffect(() => {
    setFormData({
      nombre: torneo.nombre || '',
      subtitulo: torneo.subtitulo || '',
      descripcion: torneo.descripcion || '',
      tipo_ubicacion: torneo.tipo_ubicacion || 'persona',
      privacidad: torneo.privacidad || 'publico',
      estado: torneo.estado || 'preparacion',
      fecha_inicio: torneo.fecha_inicio ? torneo.fecha_inicio.split('T')[0] : '',
      fecha_fin: torneo.fecha_fin ? torneo.fecha_fin.split('T')[0] : '',
      imagen_portada: torneo.imagen_portada || '',
      imagen_banner: torneo.imagen_banner || ''
    });
  }, [torneo]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (e: any) => {
    onUpdate({ [e.target.name]: e.target.value });
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'portada' | 'banner') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageState({
          src: reader.result as string,
          type,
        });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCroppedImageUpload = async (file: File) => {
    if (!cropImageState) return;
    const type = cropImageState.type;
    setUploadingImage(type);
    setCropImageState(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      
      const res = await fetch(`${API_URL}/organizador/perfil/banner`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        const field = type === 'portada' ? 'imagen_portada' : 'imagen_banner';
        setFormData(prev => ({ ...prev, [field]: data.url }));
        onUpdate({ [field]: data.url });
      } else {
        alert('Error al subir la imagen.');
      }
    } catch (err) {
      alert('Error de conexión al subir imagen.');
    } finally {
      setUploadingImage(null);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* DATOS BÁSICOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-blue-600">Datos básicos</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 relative hover:bg-slate-100 transition overflow-hidden">
              {uploadingImage === 'portada' ? (
                <div className="flex flex-col items-center justify-center text-blue-500">
                  <Loader2 size={32} className="animate-spin mb-2" />
                  <span className="text-sm font-bold">Subiendo Logo...</span>
                </div>
              ) : formData.imagen_portada ? (
                <>
                  <img src={formData.imagen_portada} alt="Logo" className="w-full h-full object-cover absolute inset-0" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-sm">Cambiar Logo</span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-sm font-bold">Logo (Circular)</span>
                  <span className="text-xs mb-2">Proporción 1:1</span>
                  <span className="text-xs text-blue-500 hover:underline">Click para subir</span>
                </>
              )}
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="image/*"
                onChange={(e) => onSelectFile(e, 'portada')}
                disabled={!!uploadingImage}
              />
            </div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 relative hover:bg-slate-100 transition overflow-hidden">
              {uploadingImage === 'banner' ? (
                <div className="flex flex-col items-center justify-center text-blue-500">
                  <Loader2 size={32} className="animate-spin mb-2" />
                  <span className="text-sm font-bold">Subiendo Banner...</span>
                </div>
              ) : formData.imagen_banner ? (
                <>
                  <img src={formData.imagen_banner} alt="Banner" className="w-full h-full object-cover absolute inset-0" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-sm">Cambiar Banner</span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-sm font-bold">Banner (Fondo)</span>
                  <span className="text-xs mb-2">Proporción 16:9</span>
                  <span className="text-xs text-blue-500 hover:underline">Click para subir</span>
                </>
              )}
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="image/*"
                onChange={(e) => onSelectFile(e, 'banner')}
                disabled={!!uploadingImage}
              />
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
              <input 
                type="text" name="nombre" value={formData.nombre} onChange={handleChange} onBlur={handleBlur}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Subtítulo</label>
              <input 
                type="text" name="subtitulo" value={formData.subtitulo} onChange={handleChange} onBlur={handleBlur}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
              <textarea 
                name="descripcion" value={formData.descripcion} onChange={handleChange} onBlur={handleBlur} rows={3}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Acá va la Descripción"
              ></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de inicio</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} onBlur={handleBlur} className="w-full outline-none text-sm text-slate-700 bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de finalización</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} onBlur={handleBlur} className="w-full outline-none text-sm text-slate-700 bg-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-sm text-slate-700">
          <div className="flex gap-2 items-center"><Users size={16} className="text-slate-400"/> Contacto <button onClick={() => setActiveModal('contacto')} className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full" style={{backgroundColor: colorSidebar}}></div> Color <button onClick={() => setActiveModal('color')} className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><FileText size={16} className="text-slate-400"/> Reglas del campeonato <button onClick={() => setActiveModal('reglas')} className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><Trophy size={16} className="text-slate-400"/> Premios <button onClick={() => setActiveModal('premios')} className="text-blue-500 hover:underline">Editar</button></div>
        </div>
      </div>

      {/* UBICACIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 text-lg">Ubicación</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="radio" name="tipo_ubicacion" value="internet" 
              checked={formData.tipo_ubicacion === 'internet'} 
              onChange={(e) => {
                handleChange(e);
                onUpdate({ tipo_ubicacion: 'internet' });
              }}
              className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <span className="text-slate-700">Campeonato jugado en internet</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="radio" name="tipo_ubicacion" value="persona" 
              checked={formData.tipo_ubicacion === 'persona'} 
              onChange={(e) => {
                handleChange(e);
                onUpdate({ tipo_ubicacion: 'persona' });
              }}
              className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <span className="text-slate-700">Campeonato jugado en persona</span>
          </label>
          {formData.tipo_ubicacion === 'persona' && (
            <div className="ml-8 mt-2">
              <button 
                onClick={() => setActiveModal('ubicacion')} 
                className="text-blue-500 hover:underline font-medium"
              >
                {torneo.configuracion?.ubicacion_texto ? `Localización: ${torneo.configuracion.ubicacion_texto}` : 'Establecer localización'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALIDAD DE INSCRIPCIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 text-lg">Modalidad de Inscripción</h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="radio" name="competicion_por_atleta" value="false" 
              checked={torneo.configuracion?.competicion_por_atleta !== true} 
              onChange={() => {
                onUpdate({ configuracion: { ...(torneo.configuracion || {}), competicion_por_atleta: false } });
              }}
              className="w-5 h-5 mt-0.5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <div>
               <span className="text-slate-700 font-medium block">Por equipo</span>
               <span className="text-slate-500 text-sm">El equipo completo se inscribe a una sola categoría.</span>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="radio" name="competicion_por_atleta" value="true" 
              checked={torneo.configuracion?.competicion_por_atleta === true} 
              onChange={() => {
                onUpdate({ configuracion: { ...(torneo.configuracion || {}), competicion_por_atleta: true } });
              }}
              className="w-5 h-5 mt-0.5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <div>
               <span className="text-slate-700 font-medium block">Por atleta</span>
               <span className="text-slate-500 text-sm">Una academia o equipo puede inscribir a sus jugadores en categorías diferentes (Ej: Artes Marciales).</span>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CAMPEONATO (LISTA) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-blue-600">Campeonato</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {[
              { id: 'categorias', icon: Activity, label: 'Categorías y Divisiones' },
              { id: 'participantes', icon: Users, label: 'Participantes / Equipos' },
              { id: 'checkin', icon: Scale, label: 'Check-in (Pesaje)' },
              { id: 'config_grupos', icon: Activity, label: 'Grupos (Configuración)' },
              { id: 'grupos', icon: Users, label: 'Grupos (Asignar Equipos/Atletas)' },
              { id: 'config_fases', icon: Trophy, label: 'Fases (Configuración)' },
              { id: 'agrupacion', icon: GitMerge, label: 'Llaves / Combates (Programación)' },
              { id: 'arbitraje', icon: Shield, label: 'Arbitraje (Mesa Veedores)' },
              { id: 'sitios', icon: MapPin, label: 'Sitios' },
              { id: 'config_clasificacion', icon: BarChart2, label: 'Criterios de clasificación' },
            ].map(item => (
              <li key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 text-slate-700">
                  <item.icon size={18} className="text-slate-400" />
                  <span>{item.label}</span>
                </div>
                <button 
                  onClick={() => onSubSectionSelect(item.id)} 
                  className="text-blue-500 hover:underline text-sm font-medium"
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          {/* DIVULGACIÓN */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Divulgación</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-800 font-medium flex items-center gap-2">
                    <Eye size={18} className="text-slate-400" />
                    Campeonato privado
                  </div>
                  <div className="text-xs text-slate-500">Accesible solo con el enlace</div>
                </div>
                {/* Switch */}
                <div 
                  onClick={() => {
                    const newPriv = formData.privacidad === 'privado' ? 'publico' : 'privado';
                    setFormData({...formData, privacidad: newPriv});
                    onUpdate({ privacidad: newPriv });
                  }}
                  className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition ${formData.privacidad === 'privado' ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-slate-800 font-medium">Estado del campeonato</div>
                <select 
                  name="estado" value={formData.estado} onChange={(e) => { handleChange(e); onUpdate({estado: e.target.value}); }}
                  className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 text-sm font-bold outline-none"
                >
                  <option value="abierto">En preparación / Abierto</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span>Patrocinios y Apoyos</span>
                <button className="text-blue-500 hover:underline text-sm font-medium">Editar</button>
              </div>
            </div>
          </div>

          {/* CONTROL DE USUARIOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Control de usuarios</h3>
            <ul className="space-y-4 text-slate-700 text-sm">
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Shield size={16} className="text-slate-400"/> Moderadores</div>
                <button className="text-blue-500 hover:underline font-medium">Editar</button>
              </li>
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-2"><BarChart2 size={16} className="text-slate-400"/> Vistas</div>
                <button className="text-blue-500 hover:underline font-medium">Mostrar</button>
              </li>
            </ul>
          </div>
          
          {/* IMPRIMIR REPORTES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Imprimir Reportes</h3>
            <ul className="space-y-3 text-slate-700 text-sm">
              {['Equipos', 'Jugadores', 'Carnet', 'Acta', 'Partidos', 'Clasificación'].map(rep => (
                <li key={rep} className="flex justify-between items-center">
                  <div className="flex items-center gap-2"><Printer size={16} className="text-slate-400"/> {rep}</div>
                  <button className="text-blue-500 hover:underline font-medium">Imprimir</button>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
      
      {/* MODALS */}
      {activeModal === 'ubicacion' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-[800px] max-w-full max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-lg mb-4">Localización del Torneo</h3>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nombre del Lugar o Dirección (público)</label>
                <input 
                  type="text" 
                  value={ubicacionTexto} 
                  onChange={e => setUbicacionTexto(e.target.value)} 
                  placeholder="Ej: Cancha Los Álamos, Calle Falsa 123"
                  className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500" 
                />
              </div>
              <div className="w-full h-[400px] shrink-0 border border-slate-300 rounded overflow-hidden relative z-0">
                 <LocationPickerMap 
                   defaultLocation={ubicacionCoords || undefined} 
                   onLocationSelect={(loc, name) => {
                     setUbicacionCoords(loc);
                     if (name) {
                       // Format the long Nominatim string to a shorter version
                       const shortName = name.split(',').slice(0, 3).join(',');
                       setUbicacionTexto(shortName.trim());
                     }
                   }} 
                 />
              </div>
              <p className="text-xs text-slate-500 text-center">Puedes buscar un lugar o hacer clic en el mapa para ajustar la ubicación exacta.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3 shrink-0">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => {
                const conf = { 
                  ...torneo.configuracion, 
                  ubicacion_texto: ubicacionTexto,
                  ubicacion_lat: ubicacionCoords?.lat,
                  ubicacion_lng: ubicacionCoords?.lng
                };
                onUpdate({ configuracion: conf });
                setActiveModal(null);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'contacto' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full">
            <h3 className="font-bold text-lg mb-4">Contacto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Teléfono 1</label>
                <input type="text" value={contactoData.telefono1} onChange={e => setContactoData({...contactoData, telefono1: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Teléfono 2</label>
                <input type="text" value={contactoData.telefono2} onChange={e => setContactoData({...contactoData, telefono2: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input type="email" value={contactoData.email} onChange={e => setContactoData({...contactoData, email: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => {
                const conf = { ...torneo.configuracion, contacto: contactoData };
                onUpdate({ configuracion: conf });
                setActiveModal(null);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'color' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full">
            <h3 className="font-bold text-lg mb-4">Color del Sidebar</h3>
            <div className="space-y-4 text-center">
              <input type="color" value={colorSidebar} onChange={e => setColorSidebar(e.target.value)} className="w-24 h-24 p-1 rounded cursor-pointer" />
              <div className="text-slate-600 font-mono">{colorSidebar}</div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => {
                const conf = { ...torneo.configuracion, color_sidebar: colorSidebar };
                onUpdate({ configuracion: conf });
                setActiveModal(null);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'reglas' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[800px] max-w-full">
            <h3 className="font-bold text-lg mb-4">Reglas del Campeonato</h3>
            <div className="space-y-4">
              <MiniEditor value={reglasData} onChange={setReglasData} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => {
                onUpdate({ reglas: [reglasData] });
                setActiveModal(null);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'premios' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] max-w-full">
            <h3 className="font-bold text-lg mb-4">Premios del Campeonato</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">1er Puesto</label>
                <input type="text" value={premiosData.puesto1} onChange={e => setPremiosData({...premiosData, puesto1: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">2do Puesto</label>
                <input type="text" value={premiosData.puesto2} onChange={e => setPremiosData({...premiosData, puesto2: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">3er Puesto</label>
                <input type="text" value={premiosData.puesto3} onChange={e => setPremiosData({...premiosData, puesto3: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Otros Premios</label>
                <input type="text" value={premiosData.otros} onChange={e => setPremiosData({...premiosData, otros: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => {
                const premiosArr = [];
                if (premiosData.puesto1) premiosArr.push({ puesto: 1, desc: premiosData.puesto1 });
                if (premiosData.puesto2) premiosArr.push({ puesto: 2, desc: premiosData.puesto2 });
                if (premiosData.puesto3) premiosArr.push({ puesto: 3, desc: premiosData.puesto3 });
                if (premiosData.otros) premiosArr.push({ puesto: 'otros', desc: premiosData.otros });
                onUpdate({ premios: premiosArr });
                setActiveModal(null);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {cropImageState && (
        <ImageCropperModal
          imageSrc={cropImageState.src}
          aspectRatio={cropImageState.type === 'portada' ? 1 : 16 / 9}
          isCircular={cropImageState.type === 'portada'}
          onCropComplete={(croppedFile) => handleCroppedImageUpload(croppedFile)}
          onClose={() => setCropImageState(null)}
        />
      )}
    </>
  );
}
