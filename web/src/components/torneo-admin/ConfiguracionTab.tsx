"use client";
import React, { useState, useRef } from 'react';
import { Calendar, Image as ImageIcon, MapPin, Users, Activity, Trophy, Scale, Shield, BarChart2, CheckSquare, Eye, Printer, FileText, Loader2, GitMerge, ArrowLeft, Plus, MinusCircle, User, List, Layers, HelpCircle } from 'lucide-react';
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

  const [uploadingImage, setUploadingImage] = useState<'portada' | 'banner' | null>(null);
  const [cropImageState, setCropImageState] = useState<{ src: string, type: 'portada' | 'banner' } | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [targetImageType, setTargetImageType] = useState<'portada' | 'banner' | null>(null);
  const [activeDeporteTab, setActiveDeporteTab] = useState<string>('playa');

  // Patrocinios state (mocked for now)
  const [sponsorsCampeonato, setSponsorsCampeonato] = useState([{ id: 1, nombre: 'Patrocinio 1' }]);
  const [sponsorsCuenta, setSponsorsCuenta] = useState<any[]>([]);

  // Exportar Equipos state
  const [columnasEquipos, setColumnasEquipos] = useState({
    nombre: true, escudo: true, entrenador: true, enlace: false, puntos: false,
    juegos: false, ganados: false, empates: false, perdido: false, golesFavor: false,
    golesContra: false, diferenciaGoles: false, promedioGoles: false, aprovechamiento: false,
    puntosExtras: false, tarjetaRoja: false, tarjetaAmarilla: false, tarjetaAzul: false,
    todasTarjetas: false, juegoLimpio: false, indexTechnique: false
  });

  const columnasEquiposLabels: Record<string, string> = {
    nombre: 'Nombre', escudo: 'Escudo', entrenador: 'Entrenador', enlace: 'Enlace para editar el equipo',
    puntos: 'Puntos', juegos: 'Juegos', ganados: 'Ganados', empates: 'Empates',
    perdido: 'Perdido', golesFavor: 'Goles a Favor', golesContra: 'Goles Contra',
    diferenciaGoles: 'Diferencia de Goles', promedioGoles: 'Promedio de goles',
    aprovechamiento: 'Aprovechamiento', puntosExtras: 'Puntos Extras',
    tarjetaRoja: 'Tarjeta roja', tarjetaAmarilla: 'Tarjeta amarilla', tarjetaAzul: 'Tarjeta azul',
    todasTarjetas: 'Todas las tarjetas', juegoLimpio: 'Juego Limpio', indexTechnique: 'Index technique'
  };

  // Exportar Jugadores state
  const [columnasJugadores, setColumnasJugadores] = useState({
    equipo: true, nombre: true, dni: true, camiseta: true, posicion: true,
    estado: true, partidosJugados: true, goles: true, amarillas: true, rojas: true, foto: true
  });

  const columnasJugadoresLabels: Record<string, string> = {
    equipo: 'Equipo', nombre: 'Nombre', dni: 'DNI', camiseta: 'Camiseta',
    posicion: 'Posición', estado: 'Estado', partidosJugados: 'Partidos Jugados',
    goles: 'Goles', amarillas: 'Amarillas', rojas: 'Rojas', foto: 'Foto / Enlace'
  };

  // Carnet state
  const [carnetConfig, setCarnetConfig] = useState({
    titulo: torneo.nombre || '',
    subtitulo: '',
    color: '#0b5cd5',
    incluirEscudo: true,
    espacio1: 'numero_camiseta',
    espacio2: 'nombre_abreviado',
    espacio3: 'posicion',
    tamano: '86x59',
    modo: 'multiple' // multiple o ajuste_tamano
  });
  const [carnetEquiposSeleccionados, setCarnetEquiposSeleccionados] = useState<string[]>([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([]);

  // Hardcoded predefined images for the demo
  const PREDEFINED_IMAGES: Record<string, string[]> = {
    playa: ['/images/deportes/playa/1.jpg', '/images/deportes/playa/2.jpg', '/images/deportes/playa/3.jpg'],
    futbol: ['/images/deportes/futbol/1.jpg', '/images/deportes/futbol/2.jpg', '/images/deportes/futbol/3.jpg'],
    futbol_sala: ['/images/deportes/futbol_sala/1.jpg', '/images/deportes/futbol_sala/2.jpg', '/images/deportes/futbol_sala/3.jpg'],
    baloncesto: ['/images/deportes/baloncesto/1.jpg', '/images/deportes/baloncesto/2.jpg', '/images/deportes/baloncesto/3.jpg'],
    voleibol: ['/images/deportes/voleibol/1.jpg', '/images/deportes/voleibol/2.jpg', '/images/deportes/voleibol/3.jpg'],
  };

  // States for modals
  const [contactoData, setContactoData] = useState({
    telefono1: torneo.configuracion?.contacto?.telefono1 || '',
    telefono2: torneo.configuracion?.contacto?.telefono2 || '',
    email: torneo.configuracion?.contacto?.email || ''
  });
  const [colorSidebar, setColorSidebar] = useState<string>(torneo.configuracion?.color_sidebar || '#1e293b');
  const [ubicacionTexto, setUbicacionTexto] = useState(torneo.configuracion?.ubicacion_texto || '');
  const [ubicacionCoords, setUbicacionCoords] = useState<{ lat: number, lng: number } | null>(
    torneo.configuracion?.ubicacion_lat ? { lat: torneo.configuracion.ubicacion_lat, lng: torneo.configuracion.ubicacion_lng } : null
  );
  const [reglasData, setReglasData] = useState<string>(
    (torneo.reglas && torneo.reglas.length > 0)
      ? (torneo.reglas.length === 1 && torneo.reglas[0].includes('<') ? torneo.reglas[0] : torneo.reglas.join('<br>'))
      : ''
  );
  const [premiosData, setPremiosData] = useState({
    puesto1: torneo.premios?.find((p: any) => p.puesto === 1)?.desc || '',
    puesto2: torneo.premios?.find((p: any) => p.puesto === 2)?.desc || '',
    puesto3: torneo.premios?.find((p: any) => p.puesto === 3)?.desc || '',
    otros: torneo.premios?.find((p: any) => p.puesto === 'otros')?.desc || '',
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

  const handleExportarExcel = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/reportes/equipos/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(columnasEquipos)
      });

      if (!res.ok) {
        throw new Error('Error al generar el reporte');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Equipos_${torneo.nombre.replace(/ /g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al exportar el archivo excel.');
    }
  };

  const handleImprimirPdfJugadores = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/reportes/jugadores/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(columnasJugadores)
      });

      if (!res.ok) throw new Error('Error al generar el PDF de jugadores');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Jugadores_${torneo.nombre.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar el archivo PDF de jugadores.');
    }
  };

  const handleExportarExcelJugadores = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/reportes/jugadores/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(columnasJugadores)
      });

      if (!res.ok) throw new Error('Error al generar el Excel de jugadores');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Jugadores_${torneo.nombre.replace(/ /g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al exportar el archivo Excel de jugadores.');
    }
  };

  const openCarnetModal = async () => {
    setActiveModal('configurar_carnet');
    if (equiposDisponibles.length === 0) {
      try {
        const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = sessionData.access_token || sessionData.token || '';
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/equipos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEquiposDisponibles(data);
          setCarnetEquiposSeleccionados(data.map((e: any) => e.id));
        }
      } catch (e) {
        console.error("Error fetching teams for carnets", e);
      }
    }
  };

  const handleImprimirCarnets = async () => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
      const token = sessionData.access_token || sessionData.token || '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const payload = {
        titulo: carnetConfig.titulo,
        subtitulo: carnetConfig.subtitulo,
        color: carnetConfig.color,
        incluirEscudo: carnetConfig.incluirEscudo,
        espacio1: carnetConfig.espacio1,
        espacio2: carnetConfig.espacio2,
        espacio3: carnetConfig.espacio3,
        tamano: carnetConfig.tamano,
        modo: carnetConfig.modo,
        equipo_ids: carnetEquiposSeleccionados
      };

      const res = await fetch(`${API_URL}/cancha/torneos/${torneo.id}/reportes/carnets/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al generar el PDF de carnets');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Carnets_${torneo.nombre.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar los carnets.');
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
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 gap-2">
                      <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded cursor-pointer relative overflow-hidden">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={(e) => onSelectFile(e, 'portada')}
                          disabled={!!uploadingImage}
                        />
                        Cambiar Logo
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTargetImageType('portada'); setActiveModal('seleccionar_imagen'); }}
                        className="text-white font-bold text-sm flex items-center gap-1 bg-black/50 hover:bg-black/70 px-3 py-1 rounded transition"
                      >
                        <ImageIcon size={14} /> Galería
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} className="mb-2" />
                    <span className="text-sm font-bold">Logo (Circular)</span>
                    <span className="text-xs mb-2">Proporción 1:1</span>
                    <span className="text-xs text-blue-500 hover:underline cursor-pointer relative z-10">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*"
                        onChange={(e) => onSelectFile(e, 'portada')}
                        disabled={!!uploadingImage}
                      />
                      Click para subir
                    </span>
                    <div className="flex items-center gap-2 mt-2 relative z-10">
                      <span className="text-xs text-slate-400">o</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTargetImageType('portada'); setActiveModal('seleccionar_imagen'); }}
                        className="text-xs flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition"
                      >
                        <ImageIcon size={12} /> Galería
                      </button>
                    </div>
                  </>
                )}
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
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 gap-2">
                      <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded cursor-pointer relative overflow-hidden">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={(e) => onSelectFile(e, 'banner')}
                          disabled={!!uploadingImage}
                        />
                        Cambiar Banner
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTargetImageType('banner'); setActiveModal('seleccionar_imagen'); }}
                        className="text-white font-bold text-sm flex items-center gap-1 bg-black/50 hover:bg-black/70 px-3 py-1 rounded transition"
                      >
                        <ImageIcon size={14} /> Galería
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} className="mb-2" />
                    <span className="text-sm font-bold">Banner (Fondo)</span>
                    <span className="text-xs mb-2">Proporción 16:9</span>
                    <span className="text-xs text-blue-500 hover:underline cursor-pointer relative z-10">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*"
                        onChange={(e) => onSelectFile(e, 'banner')}
                        disabled={!!uploadingImage}
                      />
                      Click para subir
                    </span>
                    <div className="flex items-center gap-2 mt-2 relative z-10">
                      <span className="text-xs text-slate-400">o</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTargetImageType('banner'); setActiveModal('seleccionar_imagen'); }}
                        className="text-xs flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition"
                      >
                        <ImageIcon size={12} /> Galería
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1 group relative w-max">
                  Título
                  <HelpCircle size={14} className="text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                    El nombre principal del torneo que verán todos los usuarios (ej. Copa Verano 2024).
                  </div>
                </label>
                <input
                  type="text" name="nombre" value={formData.nombre} onChange={handleChange} onBlur={handleBlur}
                  className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1 group relative w-max">
                  Subtítulo
                  <HelpCircle size={14} className="text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                    Una frase corta para darle más contexto o slogan (ej. "La revancha de los campeones").
                  </div>
                </label>
                <input
                  type="text" name="subtitulo" value={formData.subtitulo} onChange={handleChange} onBlur={handleBlur}
                  className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1 group relative w-max">
                  Descripción
                  <HelpCircle size={14} className="text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                    Los detalles completos del torneo, quién lo organiza, costos y cualquier otra info relevante.
                  </div>
                </label>
                <textarea
                  name="descripcion" value={formData.descripcion} onChange={handleChange} onBlur={handleBlur} rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Acá va la Descripción"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1 group relative w-max">
                    Fecha de inicio
                    <HelpCircle size={14} className="text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                      Cuándo empieza el primer partido del campeonato.
                    </div>
                  </label>
                  <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                    <Calendar size={16} className="text-slate-400" />
                    <input type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} onBlur={handleBlur} className="w-full outline-none text-sm text-slate-700 bg-transparent" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1 group relative w-max">
                    Fecha de finalización
                    <HelpCircle size={14} className="text-slate-400 cursor-help" />
                    <div className="absolute bottom-full right-0 md:left-0 md:right-auto mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                      La fecha estimada del último partido o final.
                    </div>
                  </label>
                  <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                    <Calendar size={16} className="text-slate-400" />
                    <input type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} onBlur={handleBlur} className="w-full outline-none text-sm text-slate-700 bg-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-sm text-slate-700">
            <div className="flex gap-2 items-center"><Users size={16} className="text-slate-400" /> Contacto <button onClick={() => setActiveModal('contacto')} className="text-blue-500 hover:underline">Editar</button></div>
            <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorSidebar }}></div> Color <button onClick={() => setActiveModal('color')} className="text-blue-500 hover:underline">Editar</button></div>
            <div className="flex gap-2 items-center"><FileText size={16} className="text-slate-400" /> Reglas del campeonato <button onClick={() => setActiveModal('reglas')} className="text-blue-500 hover:underline">Editar</button></div>
            <div className="flex gap-2 items-center"><Trophy size={16} className="text-slate-400" /> Premios <button onClick={() => setActiveModal('premios')} className="text-blue-500 hover:underline">Editar</button></div>
          </div>
        </div>

        {/* UBICACIÓN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Ubicación</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group relative w-max">
              <input
                type="radio" name="tipo_ubicacion" value="internet"
                checked={formData.tipo_ubicacion === 'internet'}
                onChange={(e) => {
                  handleChange(e);
                  onUpdate({ tipo_ubicacion: 'internet' });
                }}
                className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-700 flex items-center gap-1">
                Campeonato jugado en internet
                <HelpCircle size={14} className="text-slate-400 cursor-help" />
              </span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                Para torneos de eSports, ajedrez online, o modalidades virtuales.
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group relative w-max">
              <input
                type="radio" name="tipo_ubicacion" value="persona"
                checked={formData.tipo_ubicacion === 'persona'}
                onChange={(e) => {
                  handleChange(e);
                  onUpdate({ tipo_ubicacion: 'persona' });
                }}
                className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-700 flex items-center gap-1">
                Campeonato jugado en persona
                <HelpCircle size={14} className="text-slate-400 cursor-help" />
              </span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                Eventos físicos. Podrás establecer la dirección exacta o punto en el mapa.
              </div>
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
          <h3 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2 group relative w-max">
            Modalidad de Inscripción
            <HelpCircle size={16} className="text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
              Define cómo los participantes se registran en el torneo.
            </div>
          </h3>
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 group relative w-max">
              <h3 className="font-bold text-blue-600">Campeonato</h3>
              <HelpCircle size={14} className="text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                Configuraciones específicas de la competencia: llaves, grupos, árbitros y clasificaciones.
              </div>
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
              <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2 group relative w-max">
                Divulgación
                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                  Controla la visibilidad de tu torneo y quiénes pueden encontrarlo.
                </div>
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-800 font-medium flex items-center gap-2 group relative w-max">
                      <Eye size={18} className="text-slate-400" />
                      Campeonato privado
                      <HelpCircle size={14} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                        Si se activa, el torneo no aparecerá en búsquedas públicas y solo se podrá acceder con un enlace directo.
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">Accesible solo con el enlace</div>
                  </div>
                  {/* Switch */}
                  <div
                    onClick={() => {
                      const newPriv = formData.privacidad === 'privado' ? 'publico' : 'privado';
                      setFormData({ ...formData, privacidad: newPriv });
                      onUpdate({ privacidad: newPriv });
                    }}
                    className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition ${formData.privacidad === 'privado' ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-slate-800 font-medium flex items-center gap-2 group relative w-max">
                    Estado del campeonato
                    <HelpCircle size={14} className="text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                      Permite indicar en qué etapa se encuentra el evento.
                    </div>
                  </div>
                  <select
                    name="estado" value={formData.estado} onChange={(e) => { handleChange(e); onUpdate({ estado: e.target.value }); }}
                    className={`rounded-full px-3 py-1 text-sm font-bold outline-none border ${formData.estado === 'en_curso' ? 'bg-green-50 text-green-600 border-green-200' :
                      formData.estado === 'finalizado' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                        formData.estado === 'cancelado' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'
                      }`}
                  >
                    <option value="abierto">En preparación / Abierto</option>
                    <option value="en_curso">En curso / Iniciado</option>
                    <option value="finalizado">Finalizado / Cerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span>Patrocinios y Apoyos</span>
                  <button onClick={() => setActiveModal('patrocinios')} className="text-blue-500 hover:underline text-sm font-medium">Editar</button>
                </div>
              </div>
            </div>

            {/* CONTROL DE USUARIOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2 group relative w-max">
                Control de usuarios
                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                  Gestiona los organizadores, árbitros y mira las estadísticas de visitas.
                </div>
              </h3>
              <ul className="space-y-4 text-slate-700 text-sm">
                <li className="flex justify-between items-center">
                  <div className="flex items-center gap-2"><Shield size={16} className="text-slate-400" /> Moderadores</div>
                  <button className="text-blue-500 hover:underline font-medium">Editar</button>
                </li>
                <li className="flex justify-between items-center">
                  <div className="flex items-center gap-2"><BarChart2 size={16} className="text-slate-400" /> Vistas</div>
                  <button className="text-blue-500 hover:underline font-medium">Mostrar</button>
                </li>
              </ul>
            </div>

            {/* IMPRIMIR REPORTES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2 group relative w-max">
                Imprimir Reportes
                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs font-normal rounded shadow-lg z-50 whitespace-normal">
                  Genera PDFs descargables para actas, carnets y reportes de clasificaciones.
                </div>
              </h3>
              <ul className="space-y-3 text-slate-700 text-sm">
                {['Equipos', 'Jugadores', 'Carnet', 'Acta', 'Partidos', 'Clasificación'].map(rep => (
                  <li key={rep} className="flex justify-between items-center">
                    <div className="flex items-center gap-2"><Printer size={16} className="text-slate-400" /> {rep}</div>
                    <button onClick={() => { 
                      if (rep === 'Equipos') setActiveModal('exportar_equipos'); 
                      if (rep === 'Jugadores') setActiveModal('exportar_jugadores'); 
                      if (rep === 'Carnet') openCarnetModal();
                    }} className="text-blue-500 hover:underline font-medium">Imprimir</button>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* Ubicación */}
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
      {/* Contacto */}
      {activeModal === 'contacto' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full">
            <h3 className="font-bold text-lg mb-4">Contacto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Teléfono 1</label>
                <input type="text" value={contactoData.telefono1} onChange={e => setContactoData({ ...contactoData, telefono1: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Teléfono 2</label>
                <input type="text" value={contactoData.telefono2} onChange={e => setContactoData({ ...contactoData, telefono2: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input type="email" value={contactoData.email} onChange={e => setContactoData({ ...contactoData, email: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
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
      {/* Color del Sidebar */}
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
      {/* Reglas del Campeonato */}
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
      {/* Premios del Campeonato */}
      {activeModal === 'premios' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] max-w-full">
            <h3 className="font-bold text-lg mb-4">Premios del Campeonato</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">1er Puesto</label>
                <input type="text" value={premiosData.puesto1} onChange={e => setPremiosData({ ...premiosData, puesto1: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">2do Puesto</label>
                <input type="text" value={premiosData.puesto2} onChange={e => setPremiosData({ ...premiosData, puesto2: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">3er Puesto</label>
                <input type="text" value={premiosData.puesto3} onChange={e => setPremiosData({ ...premiosData, puesto3: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Otros Premios</label>
                <input type="text" value={premiosData.otros} onChange={e => setPremiosData({ ...premiosData, otros: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2" />
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

      {/* Imprimir Reportes */}
      {activeModal === 'seleccionar_imagen' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-[900px] max-w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ImageIcon size={20} className="text-slate-500" />
                Seleccionar imagen
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>

            <div className="p-4 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar bg-white">
              {[
                { id: 'playa', label: 'Playa' },
                { id: 'futbol', label: 'Fútbol' },
                { id: 'futbol_sala', label: 'Fútbol Sala' },
                { id: 'baloncesto', label: 'Baloncesto' },
                { id: 'voleibol', label: 'Voleibol' },
                { id: 'artes_marciales', label: 'Artes Marciales' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDeporteTab(tab.id)}
                  className={`px-5 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap border ${activeDeporteTab === tab.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(PREDEFINED_IMAGES[activeDeporteTab] || []).map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (targetImageType) {
                        const field = targetImageType === 'portada' ? 'imagen_portada' : 'imagen_banner';
                        setFormData(prev => ({ ...prev, [field]: imgUrl }));
                        onUpdate({ [field]: imgUrl });
                        setActiveModal(null);
                      }
                    }}
                    className={`relative rounded-xl overflow-hidden cursor-pointer group shadow-sm border-2 transition-all ${(targetImageType === 'portada' ? formData.imagen_portada : formData.imagen_banner) === imgUrl
                      ? 'border-blue-500 shadow-md scale-[1.02]'
                      : 'border-transparent hover:border-slate-300'
                      }`}
                  >
                    <div className="aspect-video bg-slate-200 flex items-center justify-center text-slate-400 relative">
                      {/* In a real app the src would just be imgUrl, for demo we handle missing images gracefully */}
                      <img
                        src={imgUrl}
                        alt="Predefinida"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback placeholder if image doesn't exist yet
                          e.currentTarget.src = `https://placehold.co/600x400/e2e8f0/64748b?text=${tab.label || activeDeporteTab}+${idx + 1}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-800 text-sm font-bold px-4 py-2 rounded-lg shadow-sm backdrop-blur-sm transition-all transform scale-95 group-hover:scale-100">
                          Usar esta imagen
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
              <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {/* Patrocinios y Apoyos */}
      {activeModal === 'patrocinios' && (
        <div className="fixed inset-0 bg-[#f0f0f0] flex flex-col z-[100]">
          <div className="bg-[#0b5cd5] text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveModal(null)} className="text-white hover:bg-blue-700 p-1 rounded-full transition">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-medium">Patrocinios y Apoyos</h2>
            </div>
            <button className="text-white hover:bg-blue-700 p-1 rounded-full transition">
              <Plus size={24} />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-w-2xl mx-auto w-full mt-2">
            <div className="bg-[#fcfafc] rounded-lg border border-slate-300 overflow-hidden shadow-sm">
              <div className="bg-[#e4e9f7] p-3 flex items-center justify-between border-b border-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#c4d0ee] rounded-md flex items-center justify-center text-[#0b5cd5]">
                    <Trophy size={16} />
                  </div>
                  <span className="text-[#0b5cd5] font-bold text-sm">Registrados en el campeonato</span>
                </div>
                <div className="w-6 h-6 bg-[#0b5cd5] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {sponsorsCampeonato.length}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {sponsorsCampeonato.length === 0 ? (
                  <div className="p-4 text-center text-slate-800 text-sm bg-[#fcfafc]">vacío</div>
                ) : (
                  sponsorsCampeonato.map(sp => (
                    <div key={sp.id} className="p-4 flex items-center justify-between bg-white">
                      <span className="text-slate-800 text-[15px]">{sp.nombre}</span>
                      <button
                        onClick={() => {
                          setSponsorsCampeonato(sponsorsCampeonato.filter(s => s.id !== sp.id));
                          setSponsorsCuenta([...sponsorsCuenta, sp]);
                        }}
                        className="text-slate-700 hover:text-slate-900 transition"
                      >
                        <MinusCircle size={24} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#fcfafc] rounded-lg border border-slate-300 overflow-hidden shadow-sm mt-4">
              <div className="bg-[#e2e4e9] p-3 flex items-center justify-between border-b border-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ccced3] rounded-md flex items-center justify-center text-slate-600">
                    <User size={16} />
                  </div>
                  <span className="text-[#3b4b5c] font-bold text-sm">Registrados en tu cuenta</span>
                </div>
                <div className="w-6 h-6 bg-[#475b6d] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {sponsorsCuenta.length}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {sponsorsCuenta.length === 0 ? (
                  <div className="p-4 text-center text-slate-800 text-sm bg-[#fcfafc]">vacío</div>
                ) : (
                  sponsorsCuenta.map(sp => (
                    <div key={sp.id} className="p-4 flex items-center justify-between bg-white">
                      <span className="text-slate-800 text-[15px]">{sp.nombre}</span>
                      <button
                        onClick={() => {
                          setSponsorsCuenta(sponsorsCuenta.filter(s => s.id !== sp.id));
                          setSponsorsCampeonato([...sponsorsCampeonato, sp]);
                        }}
                        className="text-[#0b5cd5] hover:text-blue-800 font-medium text-2xl leading-none transition"
                      >
                        +
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'exportar_equipos' && (
        <div className="fixed inset-0 bg-black/30 flex flex-col items-center justify-center z-[100] p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[#f3f0f5] rounded-xl w-full max-w-xs overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 pb-2 flex justify-between items-center">
              <h2 className="text-[22px] text-slate-800 font-normal">Exportar</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
            </div>
            <div className="flex-1 mt-4">
              <div
                onClick={() => setActiveModal('seleccionar_columnas_equipos')}
                className="flex items-center gap-4 px-5 py-4 border-b border-t border-slate-200 cursor-pointer hover:bg-slate-200/50 transition"
              >
                <List size={22} className="text-slate-600" />
                <span className="text-lg text-slate-800">Seleccionar columnas</span>
              </div>
              <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200/50 transition">
                <Layers size={22} className="text-slate-600" />
                <span className="text-lg text-slate-800">Seleccionar Fase</span>
              </div>
            </div>
            <div className="p-5 pt-8 flex justify-end gap-6">
              <button onClick={handleExportarExcel} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Excel</button>
              <button onClick={() => setActiveModal(null)} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Imprimir</button>
            </div>
          </div>
        </div>
      )}
      {/* TODO: Implementar la lógica de impresión de equipos */}
      {activeModal === 'seleccionar_columnas_equipos' && (
        <div className="fixed inset-0 bg-[#f3f0f5] flex flex-col z-[100]">
          <div className="p-4 bg-[#f3f0f5] flex justify-between items-center">
            <h2 className="text-[22px] text-slate-800 font-normal">Lista de equipos</h2>
            <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            {Object.entries(columnasEquiposLabels).map(([key, label]) => (
              <label key={key} className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-200/30 transition ${columnasEquipos[key as keyof typeof columnasEquipos] ? 'bg-[#e5e1e8]' : 'bg-[#f3f0f5]'}`}>
                <span className="text-[17px] text-slate-800">{label}</span>
                <input
                  type="checkbox"
                  checked={columnasEquipos[key as keyof typeof columnasEquipos]}
                  onChange={(e) => setColumnasEquipos({ ...columnasEquipos, [key]: e.target.checked })}
                  className="w-[22px] h-[22px] rounded border-gray-400 text-[#0ea5e9] focus:ring-[#0ea5e9] bg-transparent"
                />
              </label>
            ))}
          </div>
          <div className="p-5 flex justify-end bg-[#f3f0f5]">
            <button onClick={() => setActiveModal('exportar_equipos')} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600 mr-2">Guardar</button>
          </div>
        </div>
      )}

      {activeModal === 'exportar_jugadores' && (
        <div className="fixed inset-0 bg-black/30 flex flex-col items-center justify-center z-[100] p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[#f3f0f5] rounded-xl w-full max-w-xs overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 pb-2 flex justify-between items-center">
              <h2 className="text-[22px] text-slate-800 font-normal">Exportar Jugadores</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
            </div>
            <div className="flex-1 mt-4">
              <div
                onClick={() => setActiveModal('seleccionar_columnas_jugadores')}
                className="flex items-center gap-4 px-5 py-4 border-b border-t border-slate-200 cursor-pointer hover:bg-slate-200/50 transition"
              >
                <List size={22} className="text-slate-600" />
                <span className="text-lg text-slate-800">Seleccionar columnas</span>
              </div>
            </div>
            <div className="p-5 pt-8 flex justify-end gap-6">
              <button onClick={handleExportarExcelJugadores} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Excel</button>
              <button onClick={handleImprimirPdfJugadores} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Imprimir</button>
            </div>
          </div>
        </div>
      )}


      {activeModal === 'configurar_carnet' && (
        <div className="fixed inset-0 bg-[#f3f0f5] flex flex-col z-[100]">
          <div className="p-5 pb-3 flex justify-between items-center">
            <h2 className="text-[26px] text-slate-800 font-normal">Carnet</h2>
            <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 space-y-5">
            <div>
              <label className="text-sm text-slate-600 block mb-1">Nombre del campeonato</label>
              <input 
                type="text" 
                value={carnetConfig.titulo} 
                onChange={e => setCarnetConfig({ ...carnetConfig, titulo: e.target.value })} 
                placeholder="Acá va el Título..." 
                className="w-full border-b border-slate-400 bg-transparent py-1 text-lg text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Subtítulo</label>
              <input 
                type="text" 
                value={carnetConfig.subtitulo} 
                onChange={e => setCarnetConfig({ ...carnetConfig, subtitulo: e.target.value })} 
                placeholder="Acá va el subtítulo..." 
                className="w-full border-b border-slate-400 bg-transparent py-1 text-lg text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 size={18} className="text-slate-600" />
                <span className="text-lg text-slate-800">Color</span>
                <div className="flex items-center ml-2 relative overflow-hidden rounded">
                  <input 
                    type="color" 
                    value={carnetConfig.color}
                    onChange={e => setCarnetConfig({ ...carnetConfig, color: e.target.value })}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <button className="text-blue-500 font-medium text-lg">Editar</button>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-300" style={{ backgroundColor: carnetConfig.color }}></div>
            </div>

            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-lg text-slate-800">Incluir escudo del equipo</span>
              <input 
                type="checkbox" 
                checked={carnetConfig.incluirEscudo}
                onChange={e => setCarnetConfig({ ...carnetConfig, incluirEscudo: e.target.checked })}
                className="w-[22px] h-[22px] rounded border-gray-400 text-[#0ea5e9] focus:ring-[#0ea5e9] bg-transparent"
              />
            </label>

            {[
              { id: 'espacio1', label: 'Espacio 1' },
              { id: 'espacio2', label: 'Espacio 2' },
              { id: 'espacio3', label: 'Espacio 3' }
            ].map((esp, i) => (
              <div key={esp.id} className="flex justify-between items-center py-2">
                <span className="text-lg text-slate-600">{esp.label}</span>
                <select 
                  className="bg-transparent text-slate-800 text-lg outline-none border-none cursor-pointer appearance-none text-right pr-6 relative"
                  value={(carnetConfig as any)[esp.id]}
                  onChange={e => setCarnetConfig({ ...carnetConfig, [esp.id]: e.target.value })}
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '12px' }}
                >
                  <option value="numero_camiseta">N° de camiseta/Registro</option>
                  <option value="nombre_abreviado">Nombre abreviado</option>
                  <option value="documento">Documento</option>
                  <option value="posicion">Posición de jugador</option>
                  <option value="telefono">Teléfono</option>
                  <option value="vacio">vacío</option>
                </select>
              </div>
            ))}
          </div>
          <div className="p-5 flex justify-end bg-[#f3f0f5]">
            <button onClick={() => setActiveModal('seleccionar_equipos_carnet')} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Continuar</button>
          </div>
        </div>
      )}

      {activeModal === 'seleccionar_equipos_carnet' && (
        <div className="fixed inset-0 bg-[#f3f0f5] flex flex-col z-[100]">
          <div className="p-5 pb-3 flex justify-between items-center">
            <h2 className="text-[26px] text-slate-800 font-normal">Seleccionar equipos</h2>
            <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            {equiposDisponibles.length === 0 ? (
              <div className="p-5 text-slate-600">No hay equipos disponibles.</div>
            ) : (
              equiposDisponibles.map(equipo => (
                <label key={equipo.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-200/30 transition">
                  <span className="text-[17px] text-slate-800">{equipo.nombre}</span>
                  <input
                    type="checkbox"
                    checked={carnetEquiposSeleccionados.includes(equipo.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCarnetEquiposSeleccionados([...carnetEquiposSeleccionados, equipo.id]);
                      } else {
                        setCarnetEquiposSeleccionados(carnetEquiposSeleccionados.filter(id => id !== equipo.id));
                      }
                    }}
                    className="w-[22px] h-[22px] rounded border-gray-400 text-[#0ea5e9] focus:ring-[#0ea5e9] bg-transparent"
                  />
                </label>
              ))
            )}
          </div>
          <div className="p-5 flex justify-end bg-[#f3f0f5]">
            <button onClick={() => setActiveModal('seleccionar_tamano_carnet')} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Continuar</button>
          </div>
        </div>
      )}

      {activeModal === 'seleccionar_tamano_carnet' && (
        <div className="fixed inset-0 bg-[#f3f0f5] flex flex-col z-[100]">
          <div className="p-5 pb-3 flex justify-between items-center">
            <h2 className="text-[26px] text-slate-800 font-normal">Tamaño y Formato</h2>
            <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-slate-800 transition text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4 divide-y divide-slate-200">
            <div className="px-5 py-4 space-y-4">
              <h3 className="text-lg font-medium text-slate-700">Modo de impresión</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="modo_impresion" 
                  value="multiple" 
                  checked={carnetConfig.modo === 'multiple'}
                  onChange={() => setCarnetConfig({ ...carnetConfig, modo: 'multiple' })}
                  className="w-5 h-5 text-[#0ea5e9] border-gray-400 focus:ring-[#0ea5e9]"
                />
                <span className="text-slate-800 text-lg">Múltiples carnets por hoja (A4)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="modo_impresion" 
                  value="ajuste_tamano" 
                  checked={carnetConfig.modo === 'ajuste_tamano'}
                  onChange={() => setCarnetConfig({ ...carnetConfig, modo: 'ajuste_tamano' })}
                  className="w-5 h-5 text-[#0ea5e9] border-gray-400 focus:ring-[#0ea5e9]"
                />
                <span className="text-slate-800 text-lg">Ajustar al tamaño (Impresora de PVC)</span>
              </label>
            </div>
            
            <div className="px-5 py-4">
              <h3 className="text-lg font-medium text-slate-700 mb-4">Dimensiones</h3>
              {[
                { id: '86x59', label: 'Opción 1', desc: '86mmx59mm' },
                { id: '85x54', label: 'Opción 2', desc: '(Tamaño Tarjeta de crédito)' },
              ].map(opt => (
                <label key={opt.id} className="block py-3 cursor-pointer hover:bg-slate-200/30 transition">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="tamano_carnet" 
                      value={opt.id} 
                      checked={carnetConfig.tamano === opt.id}
                      onChange={() => setCarnetConfig({ ...carnetConfig, tamano: opt.id })}
                      className="w-5 h-5 text-[#0ea5e9] border-gray-400 focus:ring-[#0ea5e9]"
                    />
                    <div>
                      <div className="text-[17px] text-slate-800">{opt.label}</div>
                      <div className="text-sm text-slate-500">{opt.desc}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="p-5 flex justify-end bg-[#f3f0f5]">
            <button onClick={handleImprimirCarnets} className="text-[#0ea5e9] font-bold text-lg hover:text-blue-600">Imprimir</button>
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
