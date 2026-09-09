"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Plus, Search, Filter, Printer, Download, Edit3, Trash2, Copy, 
  Eye, X, Upload, Check, RefreshCw, Sparkles, ChevronRight, Shield, 
  Calendar, MapPin, User, Building, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export interface Reconocimiento {
  id?: number;
  usuario_id?: number;
  torneo_id?: string | null;
  titulo: string;
  subtitulo?: string | null;
  destinatario: string;
  texto_agradecimiento: string;
  otorgado_por?: string | null;
  ciudad_fecha?: string | null;
  plantilla?: string | null; // "placa_madera" | "diploma_clasico" | "gala_oscura" | "moderno_esmeralda"
  logo_url?: string | null;
  firma_url?: string | null;
  cargo_firmante?: string | null;
  nombre_firmante?: string | null;
  created_at?: string;
  updated_at?: string;
}

const PRESETS_TEXTO = [
  {
    nombre: "Placa Conmemorativa y Agradecimiento (Autoridad / Patrocinador)",
    titulo: "PLACA CONMEMORATIVA Y DE AGRADECIMIENTO",
    subtitulo: "Por su inestimable compromiso y contribución",
    texto: "Los integrantes del Comité Directivo y la Organización le saludan en esta fecha tan especial y le extienden su más sincero agradecimiento por su inquebrantable apoyo, su visión inspiradora y la oportunidad de crecimiento brindada a nuestros deportistas, valores fundamentales para el fortalecimiento del deporte y el desarrollo de nuestra comunidad.",
    otorgado_por: "EL COMITÉ ORGANIZADOR",
    cargo_firmante: "Presidente del Comité",
    plantilla: "placa_madera"
  },
  {
    nombre: "Diploma de Honor al Mérito Deportivo (Campeón / MVP)",
    titulo: "DIPLOMA DE HONOR AL MÉRITO",
    subtitulo: "En reconocimiento a la excelencia, disciplina y entrega",
    texto: "Por haber demostrado un desempeño sobresaliente, liderazgo en el campo de juego y un intachable espíritu competitivo, consagrándose como referente ejemplar a lo largo de todo el Campeonato.",
    otorgado_por: "ASOCIACIÓN Y LIGA DE TORNEOS",
    cargo_firmante: "Director de Competición",
    plantilla: "diploma_clasico"
  },
  {
    nombre: "Premio Fair Play y Espíritu Deportivo",
    titulo: "RECONOCIMIENTO AL ESPÍRITU DEPORTIVO Y FAIR PLAY",
    subtitulo: "Copa Juego Limpio y Compañerismo",
    texto: "En homenaje a su ejemplar conducta deportiva, caballerosidad dentro y fuera de la cancha, y respeto irrestricto hacia rivales, árbitros y espectadores, engrandeciendo la verdadera esencia del deporte.",
    otorgado_por: "TRIBUNAL DE DISCIPLINA Y ORGANIZACIÓN",
    cargo_firmante: "Coordinador General",
    plantilla: "gala_oscura"
  },
  {
    nombre: "Homenaje a la Trayectoria Deportiva y Dirigencial",
    titulo: "RECONOCIMIENTO A LA TRAYECTORIA",
    subtitulo: "Una vida dedicada a la pasión deportiva",
    texto: "En testimonio de profunda gratitud y admiración por sus años de entrega incondicional, esfuerzo incansable y liderazgo dirigencial, dejando una huella imborrable en el corazón de nuestra institución deportiva.",
    otorgado_por: "LA COMISIÓN DIRECTIVA Y CLUBES AFILIADOS",
    cargo_firmante: "Secretario General",
    plantilla: "placa_madera"
  },
  {
    nombre: "Agradecimiento a Patrocinador Oficial",
    titulo: "DISTINCIÓN DE GRATITUD INSTITUCIONAL",
    subtitulo: "Alianza Estratégica y Apoyo al Deporte",
    texto: "Nuestro sincero agradecimiento por creer en el talento y la juventud, haciendo posible con su valioso patrocinio la realización exitosa de este gran certamen deportivo.",
    otorgado_por: "COMITÉ EJECUTIVO DEL CAMPEONATO",
    cargo_firmante: "Área de Marketing y Alianzas",
    plantilla: "moderno_esmeralda"
  }
];

interface TorneoReconocimientosViewProps {
  torneoId: string;
  torneo?: any;
  isOrganizer?: boolean;
  isPublicView?: boolean;
}

export default function TorneoReconocimientosView({
  torneoId,
  torneo,
  isOrganizer = true,
  isPublicView = false
}: TorneoReconocimientosViewProps) {
  const [reconocimientos, setReconocimientos] = useState<Reconocimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterPlantilla, setFilterPlantilla] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [saving, setSaving] = useState(false);

  // Print Preview Modal State
  const [printItem, setPrintItem] = useState<Reconocimiento | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Form State pre-populated with Tournament data
  const defaultFormData: Reconocimiento = {
    torneo_id: torneoId,
    titulo: "PLACA CONMEMORATIVA Y DE AGRADECIMIENTO",
    subtitulo: torneo?.nombre ? `Torneo ${torneo.nombre}` : "Por su inquebrantable apoyo al deporte",
    destinatario: "",
    texto_agradecimiento: "Los integrantes del Comité Directivo y la Comisión Organizadora le extienden su sincero agradecimiento por su inquebrantable apoyo, su visión inspiradora y la oportunidad brindada para el desarrollo del campeonato.",
    otorgado_por: "EL COMITÉ ORGANIZADOR",
    ciudad_fecha: `${torneo?.ciudad || 'Asunción, Paraguay'}, ${new Date().getFullYear()}`,
    plantilla: "placa_madera",
    logo_url: torneo?.imagen_portada || "",
    firma_url: "",
    cargo_firmante: "Presidente del Torneo",
    nombre_firmante: ""
  };

  const [formData, setFormData] = useState<Reconocimiento>(defaultFormData);
  const printRef = useRef<HTMLDivElement>(null);

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('user_session') || '{}');
      return s.access_token || s.token || localStorage.getItem('token') || '';
    } catch {
      return localStorage.getItem('token') || '';
    }
  };

  // Cargar reconocimientos de este torneo
  const fetchReconocimientos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/reconocimientos?torneo_id=${torneoId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReconocimientos(data);
        localStorage.setItem(`reconocimientos_torneo_${torneoId}`, JSON.stringify(data));
      } else {
        throw new Error("Respuesta no OK");
      }
    } catch (e) {
      console.warn("Cargando desde caché local:", e);
      const cached = localStorage.getItem(`reconocimientos_torneo_${torneoId}`);
      if (cached) {
        try {
          setReconocimientos(JSON.parse(cached));
        } catch {}
      } else {
        // Datos demo si es la primera vez
        const initialDemo: Reconocimiento[] = [
          {
            id: 1,
            torneo_id: torneoId,
            titulo: "PLACA CONMEMORATIVA Y DE AGRADECIMIENTO",
            subtitulo: `Campeonato ${torneo?.nombre || 'Oficial'}`,
            destinatario: "Lic. Carlos Benítez",
            texto_agradecimiento: "Los integrantes del Cuadro de Honor y la Organización le saludan en esta fecha tan especial y le extienden su sincero agradecimiento por su inquebrantable apoyo, su visión inspiradora y la oportunidad de crecimiento brindada, fundamentales para el éxito del certamen.",
            otorgado_por: "EL COMITÉ ORGANIZADOR",
            ciudad_fecha: `${torneo?.ciudad || 'Asunción, Paraguay'}, ${new Date().getFullYear()}`,
            plantilla: "placa_madera",
            logo_url: torneo?.imagen_portada || "",
            nombre_firmante: "Comisión Directiva",
            cargo_firmante: "Presidente del Torneo"
          },
          {
            id: 2,
            torneo_id: torneoId,
            titulo: "DIPLOMA DE HONOR AL MÉRITO",
            subtitulo: "Goleador y Jugador Más Valioso (MVP)",
            destinatario: "Santiago Giménez",
            texto_agradecimiento: "En testimonio de su entrega deportiva, compañerismo y destacada actuación como figura estelar y máximo artillero del campeonato.",
            otorgado_por: "LIGA DE FÚTBOL Y COMPETICIONES",
            ciudad_fecha: `${torneo?.ciudad || 'Asunción, Paraguay'}, ${new Date().getFullYear()}`,
            plantilla: "diploma_clasico",
            logo_url: torneo?.imagen_portada || "",
            nombre_firmante: "Prof. Marcos Duarte",
            cargo_firmante: "Director Técnico del Torneo"
          }
        ];
        setReconocimientos(initialDemo);
        localStorage.setItem(`reconocimientos_torneo_${torneoId}`, JSON.stringify(initialDemo));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconocimientos();
  }, [torneoId]);

  // Subir imagen de logo
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/organizador/perfil/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, logo_url: data.url }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      ...defaultFormData,
      torneo_id: torneoId,
      logo_url: torneo?.imagen_portada || ""
    });
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: Reconocimiento) => {
    setModalMode("edit");
    setEditingId(rec.id || null);
    setFormData({ ...rec });
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleDuplicate = (rec: Reconocimiento) => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      ...rec,
      id: undefined,
      destinatario: `${rec.destinatario} (Copia)`
    });
    setActiveTab("form");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destinatario.trim()) {
      alert("Por favor indique el nombre del destinatario / homenajeado");
      return;
    }
    if (!formData.titulo.trim()) {
      alert("Por favor ingrese el título del reconocimiento");
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const method = modalMode === "edit" ? "PUT" : "POST";
      const url = modalMode === "edit" 
        ? `${API_URL}/api/reconocimientos/${editingId}`
        : `${API_URL}/api/reconocimientos`;

      const payload = {
        ...formData,
        torneo_id: String(torneoId)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchReconocimientos();
        setModalOpen(false);
      } else {
        throw new Error();
      }
    } catch {
      if (modalMode === "edit" && editingId) {
        const updated = reconocimientos.map(r => r.id === editingId ? { ...formData, id: editingId } : r);
        setReconocimientos(updated);
        localStorage.setItem(`reconocimientos_torneo_${torneoId}`, JSON.stringify(updated));
      } else {
        const newRec: Reconocimiento = {
          ...formData,
          id: Date.now()
        };
        const updated = [newRec, ...reconocimientos];
        setReconocimientos(updated);
        localStorage.setItem(`reconocimientos_torneo_${torneoId}`, JSON.stringify(updated));
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("¿Está seguro de que desea eliminar este reconocimiento?")) return;

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/reconocimientos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchReconocimientos();
      } else {
        throw new Error();
      }
    } catch {
      const filtered = reconocimientos.filter(r => r.id !== id);
      setReconocimientos(filtered);
      localStorage.setItem(`reconocimientos_torneo_${torneoId}`, JSON.stringify(filtered));
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS_TEXTO[0]) => {
    setFormData(prev => ({
      ...prev,
      titulo: preset.titulo,
      subtitulo: preset.subtitulo,
      texto_agradecimiento: preset.texto,
      otorgado_por: preset.otorgado_por,
      cargo_firmante: preset.cargo_firmante,
      plantilla: preset.plantilla
    }));
  };

  const handlePrint = (rec: Reconocimiento) => {
    setPrintItem(rec);
    setPrintModalOpen(true);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  const filteredReconocimientos = reconocimientos.filter(item => {
    if (filterPlantilla !== "all" && item.plantilla !== filterPlantilla) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDest = item.destinatario?.toLowerCase().includes(q);
      const matchTit = item.titulo?.toLowerCase().includes(q);
      const matchSub = item.subtitulo?.toLowerCase().includes(q);
      return matchDest || matchTit || matchSub;
    }
    return true;
  });

  return (
    <div className="w-full">
      {/* ============================================================
          HEADER DE LA SECCIÓN DENTRO DEL TORNEO
          ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
              <Award className="text-amber-500" size={26} />
              Menciones y Reconocimientos
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Imprimibles A4
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Entrega placas conmemorativas de madera y bronce, diplomas y distinciones oficiales a dirigentes, patrocinadores, jugadores y clubes de este torneo.
          </p>
        </div>

        {isOrganizer && !isPublicView && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Nueva Mención / Placa
          </button>
        )}
      </div>

      {/* ============================================================
          BARRA DE BÚSQUEDA Y FILTRO DE PLANTILLAS
          ============================================================ */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por persona, club, motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>

        <select
          value={filterPlantilla}
          onChange={(e) => setFilterPlantilla(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
        >
          <option value="all">Todas las Plantillas (6 Disponibles)</option>
          <option value="placa_madera">Placa Madera de Nogal y Bronce</option>
          <option value="placa_cristal">Placa de Cristal Templado y Acero</option>
          <option value="placa_caoba_plata">Placa de Caoba y Acero Cepillado</option>
          <option value="gala_oscura">Gala Dark & Gold 24K</option>
          <option value="diploma_clasico">Diploma Real de Honor</option>
          <option value="moderno_esmeralda">Certificado Deportivo Dinámico</option>
        </select>
      </div>

      {/* ============================================================
          GRID DE RECONOCIMIENTOS DEL TORNEO
          ============================================================ */}
      <div className="print:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-medium">Cargando reconocimientos...</p>
          </div>
        ) : filteredReconocimientos.length === 0 ? (
          <div className="text-center py-14 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Award size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-800">No hay menciones registradas para este torneo</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Crea placas de agradecimiento o diplomas para premiar a los homenajeados en la final.
            </p>
            {isOrganizer && !isPublicView && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
              >
                <Plus size={16} /> Crear primer reconocimiento
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReconocimientos.map((item) => (
              <div 
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Miniatura visual del estilo */}
                <div 
                  onClick={() => handlePrint(item)}
                  className="h-40 w-full p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-transform duration-300 group-hover:scale-[1.01] relative overflow-hidden"
                  style={getTemplatePreviewStyle(item.plantilla || 'placa_madera')}
                >
                  <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md bg-black/40 text-amber-200 border border-amber-400/30">
                    {getPlantillaLabel(item.plantilla)}
                  </span>

                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                    <Printer size={15} /> Ver e Imprimir
                  </div>

                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5 opacity-80" style={{ color: getTextColor(item.plantilla) }}>
                    {item.titulo}
                  </p>
                  <h4 className="text-sm font-black line-clamp-1" style={{ color: getTextColor(item.plantilla) }}>
                    {item.destinatario}
                  </h4>
                  <p className="text-[10px] mt-1 line-clamp-2 italic px-2 opacity-90" style={{ color: getTextColor(item.plantilla) }}>
                    "{item.texto_agradecimiento}"
                  </p>
                </div>

                {/* Info Card */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>{item.ciudad_fecha || 'Fecha actual'}</span>
                      {item.otorgado_por && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 truncate max-w-[130px]">
                          {item.otorgado_por}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm line-clamp-1">{item.destinatario}</h5>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.subtitulo || item.titulo}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handlePrint(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      title="Imprimir o Exportar en PDF"
                    >
                      <Printer size={14} />
                      Imprimir
                    </button>

                    {isOrganizer && !isPublicView && (
                      <>
                        <button
                          onClick={() => handleDuplicate(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL DE CREACIÓN / EDICIÓN CON VISTA PREVIA EN VIVO
          ============================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">
                    {modalMode === "create" ? `Nueva Mención / Placa: ${torneo?.nombre || ''}` : "Editar Mención o Reconocimiento"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Personaliza textos, plantillas y logos listos para imprimir en A4.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-1 rounded-xl flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "form" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Formulario
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === "preview" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye size={13} />
                    Vista Previa
                  </button>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "preview" ? (
                <div className="flex flex-col items-center">
                  <div className="mb-4 text-xs font-medium bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-600" />
                    Vista previa a escala real. Al imprimir se adaptará perfectamente en hoja A4 apaisada.
                  </div>

                  <div className="w-full max-w-3xl aspect-[1.414/1] shadow-2xl rounded-lg overflow-hidden border border-slate-300">
                    <CertificateCard data={formData} torneo={torneo} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-5">
                  
                  {/* Presets */}
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                      <Sparkles size={15} className="text-amber-600" />
                      Plantilla de Texto Rápido (1 Clic)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS_TEXTO.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className="text-xs font-medium bg-white hover:bg-amber-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-amber-200 transition shadow-2xs cursor-pointer text-left"
                        >
                          {p.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector Visual de Plantilla */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Estilo de Plantilla Imprimible (6 Opciones Disponibles)
                      </label>
                      <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {formData.plantilla === 'placa_madera' ? 'Placa Nogal y Bronce' :
                         formData.plantilla === 'placa_cristal' ? 'Placa Cristal y Acero' :
                         formData.plantilla === 'placa_caoba_plata' ? 'Placa Caoba y Plata' :
                         formData.plantilla === 'gala_oscura' ? 'Gala Dark & Gold 24K' :
                         formData.plantilla === 'diploma_clasico' ? 'Diploma Real de Honor' : 'Certificado Deportivo Dinámico'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: "placa_madera", name: "1. Placa Nogal y Bronce", desc: "Madera oscura, chapa de latón y tornillos de bronce" },
                        { id: "placa_cristal", name: "2. Placa Cristal y Acero", desc: "Cristal templado flotante y pernos cromados" },
                        { id: "placa_caoba_plata", name: "3. Placa Caoba y Plata", desc: "Madera rojiza, acero cepillado y grabado láser" },
                        { id: "gala_oscura", name: "4. Gala Dark & Gold 24K", desc: "Negro obsidiana y marcos en oro fundido de 24K" },
                        { id: "diploma_clasico", name: "5. Diploma Real de Honor", desc: "Fondo pergamino con orlas florales doradas" },
                        { id: "moderno_esmeralda", name: "6. Certificado Deportivo", desc: "Estética deportiva dinámica azul y esmeralda" }
                      ].map(tmpl => (
                        <div
                          key={tmpl.id}
                          onClick={() => setFormData(prev => ({ ...prev, plantilla: tmpl.id }))}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between ${
                            formData.plantilla === tmpl.id
                              ? "border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div>
                            <span className="block font-bold text-xs text-slate-900">{tmpl.name}</span>
                            <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">{tmpl.desc}</span>
                          </div>
                          {formData.plantilla === tmpl.id && (
                            <span className="self-end mt-2 text-amber-600">
                              <CheckCircle2 size={16} />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campos Principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Destinatario / Homenajeado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lic. Horacio Cartes / Club Libertad"
                        value={formData.destinatario}
                        onChange={(e) => setFormData(prev => ({ ...prev, destinatario: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título de la Mención o Placa *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: PLACA CONMEMORATIVA Y DE AGRADECIMIENTO"
                        value={formData.titulo}
                        onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm uppercase tracking-wide focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo o Motivo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Por su inestimable apoyo al deporte y a los jóvenes"
                        value={formData.subtitulo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, subtitulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                  </div>

                  {/* Texto Dedicatoria */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Texto de Agradecimiento / Grabado *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Escribe el texto de la dedicatoria que se grabará en la placa o se imprimirá en el diploma..."
                      value={formData.texto_agradecimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, texto_agradecimiento: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Firmante, fecha y logo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Otorgado Por</label>
                      <input
                        type="text"
                        value={formData.otorgado_por || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, otorgado_por: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad y Fecha</label>
                      <input
                        type="text"
                        value={formData.ciudad_fecha || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, ciudad_fecha: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Cargo Firmante</label>
                      <input
                        type="text"
                        placeholder="Ej: Directiva del Torneo"
                        value={formData.nombre_firmante || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre_firmante: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Logo o Escudo Institucional</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="URL del logo o escudo..."
                            value={formData.logo_url || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <label className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 transition">
                            <Upload size={13} /> Subir
                            <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {formData.logo_url && (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                          <img src={formData.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logo_url: "" }))}
                            className="text-red-500 hover:text-red-700 p-0.5"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Eye size={14} /> Ver Vista Previa
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Guardar Reconocimiento
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL DE IMPRESIÓN A4
          ============================================================ */}
      {printModalOpen && printItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none">
            
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={18} />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Impresión en Calidad de Gala</h4>
                  <p className="text-[10px] text-slate-400">Orientación horizontal (Landscape) A4 lista para impresora o exportar en PDF.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerBrowserPrint}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={15} /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 bg-slate-200/70 flex items-center justify-center overflow-auto print:p-0 print:bg-transparent">
              <div 
                ref={printRef}
                className="w-full max-w-4xl aspect-[1.414/1] bg-white shadow-2xl rounded-xl overflow-hidden print:w-screen print:h-screen print:max-w-none print:aspect-auto print:rounded-none print:shadow-none"
              >
                <CertificateCard data={printItem} isPrintMode={true} torneo={torneo} />
              </div>
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between print:hidden">
              <span>💡 Recuerda marcar <b>"Gráficos de fondo"</b> y orientación <b>Horizontal</b> en tu ventana de impresión.</span>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reglas de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, aside, header, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// =========================================================================
// TARJETA DE RECONOCIMIENTO / DIPLOMA / PLACA CONMEMORATIVA
// =========================================================================
interface CertificateCardProps {
  data: Reconocimiento;
  isPrintMode?: boolean;
  torneo?: any;
}

function CertificateCard({ data, isPrintMode = false, torneo }: CertificateCardProps) {
  const plantilla = data.plantilla || "placa_madera";

  // 1. PLACA DE MADERA Y BRONCE (RÉPLICA FIEL DE LA FOTO)
  if (plantilla === "placa_madera") {
    return (
      <div 
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #572e12 0%, #381a08 60%, #200e04 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 40px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.5)",
          border: "8px solid #281306"
        }}
      >
        <div 
          className="absolute inset-[2.5%] pointer-events-none rounded-sm"
          style={{
            border: "2px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)"
          }}
        />

        {/* Chapa de bronce dorado */}
        <div 
          className="w-full h-full relative rounded-sm p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #dfc26a 0%, #f6e28d 25%, #d1ae47 50%, #f3da82 75%, #caa135 100%)",
            boxShadow: "inset 0 0 35px rgba(135, 95, 20, 0.45), 0 10px 25px rgba(0,0,0,0.7)",
            border: "1px solid #997728"
          }}
        >
          {/* Filete grabado */}
          <div 
            className="absolute inset-[3.5%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid #6b4e12",
              boxShadow: "inset 0 0 0 3px rgba(255, 245, 180, 0.4), inset 0 0 0 4.5px #7a5a16"
            }}
          />

          {/* 4 Tornillos de bronce en esquinas */}
          <Screw corner="top-left" />
          <Screw corner="top-right" />
          <Screw corner="bottom-left" />
          <Screw corner="bottom-right" />

          {/* Contenido */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <h2 
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase"
                style={{
                  color: "#181207",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,255,255,0.4)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p 
                  className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider uppercase mt-0.5 opacity-90"
                  style={{ color: "#2e210a" }}
                >
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3 
                  className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wide mb-2"
                  style={{
                    color: "#120c04",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 1px 0 rgba(255,255,255,0.3)"
                  }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p 
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed font-serif italic text-justify px-4"
                style={{
                  color: "#1f1708",
                  fontFamily: "Georgia, 'Times New Roman', serif"
                }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            {/* Pie de placa: Ciudad, Fecha y Entidad Firmante */}
            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p 
                  className="text-[10px] sm:text-xs md:text-sm font-medium italic mb-1"
                  style={{ color: "#2a1e08" }}
                >
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p 
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.15em] uppercase"
                  style={{
                    color: "#140e04",
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-amber-950/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold" style={{ color: "#201607" }}>
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] opacity-80" style={{ color: "#36260c" }}>
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* DUAL LOGOS: Logo del Organizador (Izquierda) y Logo de Mi Cancha (Derecha) */}
            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img 
                    src={data.logo_url} 
                    alt="Logo Organizador" 
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] mix-blend-multiply" 
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-[#2a1e08] uppercase border-b border-[#2a1e08]/40 pb-0.5 opacity-80">
                    {torneo?.nombre || "Comité Organizador"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="bronce" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PLANTILLA 2: PLACA DE CRISTAL TEMPLADO Y ACERO FLOTANTE
  // -------------------------------------------------------------
  if (plantilla === "placa_cristal") {
    return (
      <div 
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 60%, #020617 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 50px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.6)",
          border: "8px solid #0b0f19"
        }}
      >
        <div 
          className="w-full h-full relative rounded-md p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.12) 100%)",
            backdropFilter: "blur(16px)",
            border: "2px solid rgba(255, 255, 255, 0.45)",
            boxShadow: "inset 0 0 30px rgba(255, 255, 255, 0.12), 0 15px 35px rgba(0, 0, 0, 0.7)"
          }}
        >
          <div 
            className="absolute inset-[3%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "inset 0 0 15px rgba(255,255,255,0.05)"
            }}
          />

          <ChromeBolt corner="top-left" />
          <ChromeBolt corner="top-right" />
          <ChromeBolt corner="bottom-left" />
          <ChromeBolt corner="bottom-right" />

          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-cyan-200 font-bold block mb-1 drop-shadow">
                Distinción de Excelencia
              </span>
              <h2 
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase text-white"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p className="text-[10px] sm:text-xs md:text-sm font-medium tracking-wider text-slate-300 mt-1 drop-shadow">
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3 
                  className="text-xl sm:text-3xl md:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-100 mb-2 drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p 
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed italic text-slate-200 text-justify px-4 font-serif drop-shadow"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p className="text-[10px] sm:text-xs md:text-sm text-cyan-200/90 font-medium italic mb-1 drop-shadow">
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p 
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.18em] uppercase text-white drop-shadow"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-slate-300/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold text-slate-100 drop-shadow">
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] text-slate-300 drop-shadow">
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* DUAL LOGOS: Logo del Organizador (Izquierda) y Logo de Mi Cancha (Derecha) */}
            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img 
                    src={data.logo_url} 
                    alt="Logo Organizador" 
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" 
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-200 uppercase border-b border-white/40 pb-0.5 drop-shadow">
                    {torneo?.nombre || "Comisión Organizadora"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="cristal" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PLANTILLA 3: PLACA DE CAOBA ROJIZA Y ACERO CEPILLADO
  // -------------------------------------------------------------
  if (plantilla === "placa_caoba_plata") {
    return (
      <div 
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #54160d 0%, #300a04 60%, #170402 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 45px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.55)",
          border: "8px solid #200603"
        }}
      >
        <div 
          className="absolute inset-[2.5%] pointer-events-none rounded-sm"
          style={{
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)"
          }}
        />

        <div 
          className="w-full h-full relative rounded-sm p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 25%, #e2e8f0 50%, #94a3b8 75%, #f8fafc 100%)",
            boxShadow: "inset 0 0 30px rgba(71, 85, 105, 0.35), 0 10px 25px rgba(0,0,0,0.7)",
            border: "1.5px solid #64748b"
          }}
        >
          <div 
            className="absolute inset-[3.5%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid #334155",
              boxShadow: "inset 0 0 0 3px rgba(255, 255, 255, 0.7), inset 0 0 0 4.5px #475569"
            }}
          />

          <ChromeBolt corner="top-left" />
          <ChromeBolt corner="top-right" />
          <ChromeBolt corner="bottom-left" />
          <ChromeBolt corner="bottom-right" />

          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <h2 
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase"
                style={{
                  color: "#0f172a",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,255,255,0.6)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p 
                  className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider uppercase mt-0.5 opacity-90"
                  style={{ color: "#334155" }}
                >
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3 
                  className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wide mb-2"
                  style={{
                    color: "#020617",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 1px 0 rgba(255,255,255,0.5)"
                  }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p 
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed font-serif italic text-justify px-4"
                style={{
                  color: "#1e293b",
                  fontFamily: "Georgia, 'Times New Roman', serif"
                }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p className="text-[10px] sm:text-xs md:text-sm font-medium italic mb-1" style={{ color: "#334155" }}>
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p 
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.15em] uppercase"
                  style={{
                    color: "#0f172a",
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-slate-700/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold" style={{ color: "#0f172a" }}>
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] opacity-80" style={{ color: "#475569" }}>
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* DUAL LOGOS: Logo del Organizador (Izquierda) y Logo de Mi Cancha (Derecha) */}
            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img 
                    src={data.logo_url} 
                    alt="Logo Organizador" 
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] mix-blend-multiply" 
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase border-b border-slate-700/40 pb-0.5">
                    {torneo?.nombre || "Comité Organizador"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="acero" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PLANTILLA 4: DIPLOMA REAL DE HONOR AL MÉRITO
  // -------------------------------------------------------------
  if (plantilla === "diploma_clasico") {
    return (
      <div 
        className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none bg-[#fdfbf7]"
        style={{
          boxShadow: isPrintMode ? "none" : "0 10px 30px rgba(0,0,0,0.15)"
        }}
      >
        <div className="absolute inset-[2%] border-4 border-[#b89758] rounded pointer-events-none" />
        <div className="absolute inset-[3%] border border-[#7a5e2c] pointer-events-none" />
        
        <div className="absolute top-[2.5%] left-[2.5%] w-8 h-8 border-t-2 border-l-2 border-[#b89758]" />
        <div className="absolute top-[2.5%] right-[2.5%] w-8 h-8 border-t-2 border-r-2 border-[#b89758]" />
        <div className="absolute bottom-[2.5%] left-[2.5%] w-8 h-8 border-b-2 border-l-2 border-[#b89758]" />
        <div className="absolute bottom-[2.5%] right-[2.5%] w-8 h-8 border-b-2 border-r-2 border-[#b89758]" />

        <div className="relative z-10 flex flex-col justify-between h-full py-2">
          {/* Cabecera con DUAL LOGOS: Organizador (Izq) y Mi Cancha (Der) */}
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo Organizador" className="h-10 sm:h-12 object-contain" />
              ) : (
                <div className="w-10" />
              )}
            </div>

            <div className="text-center">
              <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-amber-800 font-bold mb-0.5">
                Certificación Oficial del Campeonato
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-slate-900 tracking-wider font-serif">
                {data.titulo}
              </h2>
              {data.subtitulo && (
                <p className="text-xs sm:text-sm text-slate-600 font-medium italic mt-0.5">
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <MiCanchaBadge theme="diploma" />
            </div>
          </div>

          <div className="my-auto py-2">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-slate-500 mb-1">
              Se otorga el presente reconocimiento a:
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#947632] font-serif tracking-wide border-b-2 border-[#e6d5aa] inline-block px-8 pb-2 mb-3">
              {data.destinatario}
            </h3>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-700 max-w-2xl mx-auto px-4 font-serif">
              {data.texto_agradecimiento}
            </p>
          </div>

          <div className="pt-2 border-t border-[#e2d5b6] flex items-end justify-between px-6">
            <div className="text-left text-[10px] sm:text-xs text-slate-600">
              <p className="font-semibold text-slate-800">{data.ciudad_fecha}</p>
              <p className="text-[10px] text-slate-500">{data.otorgado_por || "Registro Oficial"}</p>
            </div>

            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-[#b89758] flex items-center justify-center text-[#b89758] text-[10px] font-bold uppercase rotate-[-12deg]">
              ★ HONOR ★
            </div>

            <div className="text-center text-[10px] sm:text-xs">
              <div className="w-36 sm:w-48 border-b border-slate-400 mb-1 mx-auto" />
              <p className="font-bold text-slate-900">{data.nombre_firmante || data.otorgado_por || "Comité Organizador"}</p>
              <p className="text-slate-500 text-[10px]">{data.cargo_firmante || "Autoridad Competente"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PLANTILLA 5: RECONOCIMIENTO DE GALA DARK & 24K GOLD
  // -------------------------------------------------------------
  if (plantilla === "gala_oscura") {
    return (
      <div 
        className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none text-white"
        style={{
          background: "radial-gradient(ellipse at center, #1a202c 0%, #0d1117 70%, #05070a 100%)",
          boxShadow: isPrintMode ? "none" : "0 15px 35px rgba(0,0,0,0.4)"
        }}
      >
        <div className="absolute inset-[2.5%] border-2 border-[#d4af37]/60 pointer-events-none" />
        <div className="absolute inset-[3.5%] border border-[#d4af37]/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full py-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles size={12} /> Noche de Campeones
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-serif">
              {data.titulo}
            </h2>
            {data.subtitulo && (
              <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide mt-1">
                {data.subtitulo}
              </p>
            )}
          </div>

          <div className="my-auto py-2">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">
              Distingue y Condecora a:
            </p>
            <h3 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wide text-white font-serif my-2 drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
              {data.destinatario}
            </h3>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 max-w-2xl mx-auto px-4 font-light">
              {data.texto_agradecimiento}
            </p>
          </div>

          {/* Pie con DUAL LOGOS: Organizador (Izq) y Mi Cancha (Der) */}
          <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between px-6 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {data.logo_url && (
                <img src={data.logo_url} alt="Logo Organizador" className="h-9 sm:h-11 object-contain opacity-90" />
              )}
              <div className="text-left">
                <p className="font-medium text-amber-200">{data.ciudad_fecha}</p>
                <p className="text-[10px] text-slate-500">{data.otorgado_por}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-32 border-b border-amber-400/40 mb-1 mx-auto" />
              <p className="font-bold text-amber-200">{data.nombre_firmante || "Directiva General"}</p>
              <p className="text-[10px] text-slate-400">{data.cargo_firmante || "Comisión Organizadora"}</p>
            </div>

            <div className="flex items-center">
              <MiCanchaBadge theme="gala" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PLANTILLA 6: CERTIFICADO DEPORTIVO DINÁMICO & HERITAGE
  // -------------------------------------------------------------
  return (
    <div 
      className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none bg-white border-8 border-slate-900"
      style={{
        boxShadow: isPrintMode ? "none" : "0 10px 25px rgba(0,0,0,0.1)"
      }}
    >
      <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-blue-900 to-emerald-600 opacity-15 -rotate-45 -translate-x-16 -translate-y-16 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-36 h-36 bg-gradient-to-tl from-blue-900 to-emerald-600 opacity-15 -rotate-45 translate-x-16 translate-y-16 pointer-events-none" />
      <div className="absolute inset-[2%] border border-slate-200 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full py-2">
        {/* Cabecera con DUAL LOGOS: Organizador (Izq) y Mi Cancha (Der) */}
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3">
          <div className="flex items-center gap-3">
            {data.logo_url ? (
              <img src={data.logo_url} alt="Logo Organizador" className="h-10 sm:h-12 object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-700 text-xs">
                {torneo?.nombre ? torneo.nombre.charAt(0) : 'T'}
              </div>
            )}
            <div className="text-left">
              <h4 className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-center gap-1">
                <Shield size={14} className="text-emerald-600" /> Certificación Deportiva Oficial
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">{torneo?.nombre || "Competición y Torneo"}</p>
            </div>
          </div>

          <div className="flex items-center">
            <MiCanchaBadge theme="moderno" />
          </div>
        </div>

        <div className="my-auto py-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-wide uppercase">
            {data.titulo}
          </h2>
          {data.subtitulo && (
            <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-1 uppercase tracking-wider">
              {data.subtitulo}
            </p>
          )}

          <div className="my-4">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Se concede la presente distinción a:</span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-950 mt-1">
              {data.destinatario}
            </h3>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-slate-700 max-w-2xl mx-auto px-4 leading-relaxed font-medium">
            {data.texto_agradecimiento}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-4 text-xs">
          <div className="text-left text-slate-600">
            <p className="font-bold text-slate-900">{data.ciudad_fecha}</p>
            <p className="text-[10px] text-slate-400 font-medium">{data.otorgado_por}</p>
          </div>

          <div className="text-right">
            <div className="w-36 border-b-2 border-slate-900 mb-1 ml-auto" />
            <p className="font-black text-slate-900">{data.nombre_firmante || "Comité Organizador"}</p>
            <p className="text-[10px] text-slate-500 font-medium">{data.cargo_firmante || "Dirección de Torneo"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tornillo de bronce con hendidura en cruz
function Screw({ corner }: { corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionClasses = {
    "top-left": "top-2 left-2 sm:top-3 sm:left-3",
    "top-right": "top-2 right-2 sm:top-3 sm:right-3",
    "bottom-left": "bottom-2 left-2 sm:bottom-3 sm:left-3",
    "bottom-right": "bottom-2 right-2 sm:bottom-3 sm:right-3"
  }[corner];

  return (
    <div 
      className={`absolute ${positionClasses} w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center pointer-events-none z-20`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #fff5c0 0%, #c9a33e 50%, #634710 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.7)",
        border: "1px solid #573e0e"
      }}
    >
      <div 
        className="w-2.5 sm:w-3.5 h-[1.5px] sm:h-[2px] bg-[#3a2707] rounded-xs"
        style={{
          boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.3)",
          transform: "rotate(45deg)"
        }}
      />
    </div>
  );
}

// Perno / Separador cromado de acero inoxidable
function ChromeBolt({ corner }: { corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionClasses = {
    "top-left": "top-2.5 left-2.5 sm:top-3.5 sm:left-3.5",
    "top-right": "top-2.5 right-2.5 sm:top-3.5 sm:right-3.5",
    "bottom-left": "bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5",
    "bottom-right": "bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5"
  }[corner];

  return (
    <div 
      className={`absolute ${positionClasses} w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center pointer-events-none z-20`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #ffffff 0%, #cbd5e1 50%, #475569 100%)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.8)",
        border: "1px solid #64748b"
      }}
    >
      <div 
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#1e293b]"
        style={{
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.4)"
        }}
      />
    </div>
  );
}

// Logo Oficial de Mi Cancha para plantillas
function MiCanchaBadge({ theme }: { theme: 'bronce' | 'cristal' | 'acero' | 'diploma' | 'gala' | 'moderno' }) {
  if (theme === 'bronce') {
    return (
      <div className="flex items-center gap-1.5 select-none opacity-90">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none" className="drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
          <circle cx="13" cy="13" r="12" stroke="#2a1e08" strokeWidth="1.8" fill="rgba(60,40,10,0.08)"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#2a1e08" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#2a1e08" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="text-left leading-none">
          <span className="text-xs sm:text-sm font-black tracking-tight" style={{ color: '#1a1306', textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>
            Mi<span style={{ color: '#3d280a' }}>Cancha</span>
          </span>
          <span className="block text-[8px] font-bold tracking-widest uppercase opacity-75" style={{ color: '#2a1e08' }}>
            Oficial
          </span>
        </div>
      </div>
    );
  }

  if (theme === 'cristal') {
    return (
      <div className="flex items-center gap-1.5 select-none opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="12" stroke="#e2e8f0" strokeWidth="1.8" fill="rgba(255,255,255,0.1)"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#e2e8f0" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="text-left leading-none">
          <span className="text-xs sm:text-sm font-black tracking-tight text-white drop-shadow">
            Mi<span className="text-cyan-200">Cancha</span>
          </span>
          <span className="block text-[8px] font-bold tracking-widest uppercase text-slate-300">
            Certified
          </span>
        </div>
      </div>
    );
  }

  if (theme === 'acero') {
    return (
      <div className="flex items-center gap-1.5 select-none opacity-90">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="12" stroke="#0f172a" strokeWidth="1.8" fill="rgba(15,23,42,0.05)"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#0f172a" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="text-left leading-none">
          <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
            Mi<span className="text-slate-700">Cancha</span>
          </span>
          <span className="block text-[8px] font-bold tracking-widest uppercase text-slate-600">
            Oficial
          </span>
        </div>
      </div>
    );
  }

  if (theme === 'diploma') {
    return (
      <div className="flex items-center gap-1.5 select-none bg-[#f5efe2] px-2.5 py-1 rounded-md border border-[#d8c7a2]">
        <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="12" stroke="#947632" strokeWidth="1.6" fill="rgba(184,151,88,0.15)"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#947632" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#947632" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="text-left leading-none">
          <span className="text-xs font-black tracking-tight text-slate-900 font-sans">
            Mi<span className="text-[#947632]">Cancha</span>
          </span>
          <span className="block text-[8px] font-bold tracking-wider uppercase text-amber-900">
            Certificación
          </span>
        </div>
      </div>
    );
  }

  if (theme === 'gala') {
    return (
      <div className="flex items-center gap-1.5 select-none px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
        <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="12" stroke="#facc15" strokeWidth="1.6" fill="rgba(250,204,21,0.15)"/>
          <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#facc15" strokeWidth="1.5"/>
          <path d="M9 13h8M13 9v8" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="text-left leading-none">
          <span className="text-xs font-black tracking-tight text-amber-300 font-sans">
            Mi<span className="text-yellow-400">Cancha</span>
          </span>
          <span className="block text-[8px] font-bold tracking-wider uppercase text-amber-400/80">
            Gala Oficial
          </span>
        </div>
      </div>
    );
  }

  // Moderno
  return (
    <div className="flex items-center gap-1.5 select-none bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
      <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="12" fill="#16a34a" opacity="0.15"/>
        <path d="M6 13C6 9.134 9.134 6 13 6s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7z" stroke="#16a34a" strokeWidth="1.5"/>
        <path d="M9 13h8M13 9v8" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div className="text-left leading-none">
        <span className="text-xs font-black tracking-tight text-slate-900 font-sans">
          Mi<span className="text-emerald-600">Cancha</span>
        </span>
        <span className="block text-[8px] font-bold tracking-wider uppercase text-slate-500">
          Torneos
        </span>
      </div>
    </div>
  );
}

function getTemplatePreviewStyle(plantilla?: string | null): React.CSSProperties {
  switch (plantilla) {
    case "placa_madera":
      return {
        background: "radial-gradient(circle, #572e12 0%, #200e04 100%)",
        border: "4px solid #381a08"
      };
    case "placa_cristal":
      return {
        background: "radial-gradient(circle, #1e293b 0%, #020617 100%)",
        border: "4px solid #64748b"
      };
    case "placa_caoba_plata":
      return {
        background: "radial-gradient(circle, #54160d 0%, #170402 100%)",
        border: "4px solid #300a04"
      };
    case "diploma_clasico":
      return {
        background: "#fbf9f4",
        border: "4px solid #b89758"
      };
    case "gala_oscura":
      return {
        background: "radial-gradient(circle, #1a202c 0%, #05070a 100%)",
        border: "4px solid #d4af37"
      };
    case "moderno_esmeralda":
    default:
      return {
        background: "#ffffff",
        border: "4px solid #0f172a"
      };
  }
}

function getTextColor(plantilla?: string | null): string {
  switch (plantilla) {
    case "placa_madera":
      return "#ffd97a";
    case "placa_cristal":
      return "#e2e8f0";
    case "placa_caoba_plata":
      return "#f1f5f9";
    case "diploma_clasico":
      return "#1e293b";
    case "gala_oscura":
      return "#facc15";
    case "moderno_esmeralda":
    default:
      return "#0f172a";
  }
}

function getPlantillaLabel(plantilla?: string | null): string {
  switch (plantilla) {
    case "placa_madera":
      return "Placa Nogal y Bronce";
    case "placa_cristal":
      return "Placa Cristal y Acero";
    case "placa_caoba_plata":
      return "Placa Caoba y Plata";
    case "diploma_clasico":
      return "Diploma Real de Honor";
    case "gala_oscura":
      return "Gala Dark & Gold 24K";
    case "moderno_esmeralda":
      return "Certificado Deportivo";
    default:
      return "Placa Personalizada";
  }
}
