"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Plus, Search, Filter, Printer, Download, Edit3, Trash2, Copy, 
  Eye, X, Upload, Check, RefreshCw, Sparkles, ChevronRight, Shield, 
  Calendar, MapPin, User, Building, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import CertificateCard, {
  PRESETS_TEXTO,
  getTemplatePreviewStyle,
  getTextColor,
  getPlantillaLabel,
  isPortraitTemplate
} from '@/components/certificados/CertificateCard';

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
  plantilla?: string | null;
  logo_url?: string | null;
  firma_url?: string | null;
  cargo_firmante?: string | null;
  nombre_firmante?: string | null;
  created_at?: string;
  updated_at?: string;
}

const TEMPLATES_LIST = [
  { id: "pergamino_marcial", name: "1. Pergamino de Honor", desc: "Rollo con madera, papiro envejecido y sello de lacre", badge: "Vertical A4" },
  { id: "azul_imperial_oro", name: "2. Azul Marino y Oro 24K", desc: "Fondo azul noche imperial, filigrana de oro y sello de lacre", badge: "Vertical A4" },
  { id: "diploma_marcial_laurel", name: "3. Diploma Clásico Laurel", desc: "Orla renacentista de laurel, sello Hanko y lacre", badge: "Vertical A4" },
  { id: "placa_madera", name: "4. Placa Nogal y Bronce", desc: "Madera oscura, chapa de latón y tornillos de bronce", badge: "Horizontal" },
  { id: "placa_cristal", name: "5. Placa Cristal y Acero", desc: "Cristal templado flotante y pernos cromados", badge: "Horizontal" },
  { id: "placa_caoba_plata", name: "6. Placa Caoba y Plata", desc: "Madera rojiza, acero cepillado y grabado láser", badge: "Horizontal" },
  { id: "gala_oscura", name: "7. Gala Dark & Gold 24K", desc: "Negro obsidiana y marcos en oro fundido de 24K", badge: "Horizontal" },
  { id: "diploma_clasico", name: "8. Diploma Real de Honor", desc: "Fondo pergamino con orlas florales doradas", badge: "Horizontal" },
  { id: "moderno_esmeralda", name: "9. Certificado Deportivo", desc: "Estética deportiva dinámica azul y esmeralda", badge: "Horizontal" }
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
    plantilla: "pergamino_marcial",
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
        // Datos demo iniciales
        const initialDemo: Reconocimiento[] = [
          {
            id: 1,
            torneo_id: torneoId,
            titulo: "Reconocimiento y Honor a",
            subtitulo: "KARATE DO GO JU RYU",
            destinatario: "Sensei ROBERTO TAKESHI FUKOCHI",
            texto_agradecimiento: "Por sus incontables años de dedicación inquebrantable, pasión y sabiduría en la enseñanza y difusión del KARATE DO GO JU RYU, como pilar fundamental de la ASOCIACIÓN SEIGOKAN DE KARATE DO. Este pergamino certifica la gratitud profunda de sus estudiantes y la comunidad marcial. Su legado de rectitud y maestría perdurará.",
            otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Dada en Ciudad del Este, Paraguay. Noviembre 2026.",
            plantilla: "pergamino_marcial",
            logo_url: torneo?.imagen_portada || "",
            nombre_firmante: "Sensei Jorge Salgado Castillo",
            cargo_firmante: "Representación Seigokan Paraguay"
          },
          {
            id: 2,
            torneo_id: torneoId,
            titulo: "CERTIFICADO DE PARTICIPACIÓN",
            subtitulo: "XIII Torneo Seigokan Go Ju Ryu Karate Do",
            destinatario: "Sensei Jorge Salgado Castillo",
            texto_agradecimiento: "La Escuela Seigokan otorga este presente Certificado por su valiosa participación en el XIII Torneo Seigokan Go Ju Ryu Karate Do realizado en noviembre de 2026.",
            otorgado_por: "ESCUELA SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Dado en Ciudad del Este, a los 15 días del mes de noviembre de 2026.",
            plantilla: "azul_imperial_oro",
            logo_url: torneo?.imagen_portada || "",
            nombre_firmante: "Jorge Salgado Castillo",
            cargo_firmante: "Representación de Seigokan Paraguay"
          },
          {
            id: 3,
            torneo_id: torneoId,
            titulo: "CERTIFICADO DE AGRADECIMIENTO",
            subtitulo: "XIII TORNEO SUDAMERICANO SEIGOKAN",
            destinatario: "Sensei JORGE SALGADO CASTILLO",
            texto_agradecimiento: "La Asociación Seigokan, con profundo respeto y gratitud, otorga el presente Certificado en reconocimiento y sincera gratitud por su invaluable aporte y dedicación en la organización y éxito del XIII TORNEO SUDAMERICANO SEIGOKAN. Este evento, gracias a su apoyo, ha fortalecido los lazos de fraternidad y el espíritu del Karate Do.",
            otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Realizado en la Ciudad del Este, Paraguay, en el mes de noviembre del año 2026.",
            plantilla: "diploma_marcial_laurel",
            logo_url: torneo?.imagen_portada || "",
            nombre_firmante: "Sensei JORGE SALGADO CASTILLO.",
            cargo_firmante: "Seigokan Paraguay"
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
      ciudad_fecha: preset.ciudad_fecha || prev.ciudad_fecha,
      nombre_firmante: preset.nombre_firmante || prev.nombre_firmante,
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
              Menciones, Diplomas y Reconocimientos
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Imprimibles A4
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Entrega pergaminos de honor marcial, diplomas reales, placas de bronce y distinciones oficiales a maestros, dirigentes, patrocinadores, atletas y clubes.
          </p>
        </div>

        {isOrganizer && !isPublicView && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Nueva Mención / Diploma
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
          <option value="all">Todas las Plantillas (9 Disponibles)</option>
          <option value="pergamino_marcial">Pergamino Antiguo de Honor (Vertical A4)</option>
          <option value="azul_imperial_oro">Azul Marino y Oro 24K (Vertical A4)</option>
          <option value="diploma_marcial_laurel">Diploma Clásico Laurel (Vertical A4)</option>
          <option value="placa_madera">Placa Madera de Nogal y Bronce (Horizontal)</option>
          <option value="placa_cristal">Placa de Cristal Templado y Acero (Horizontal)</option>
          <option value="placa_caoba_plata">Placa de Caoba y Acero Cepillado (Horizontal)</option>
          <option value="gala_oscura">Gala Dark & Gold 24K (Horizontal)</option>
          <option value="diploma_clasico">Diploma Real de Honor (Horizontal)</option>
          <option value="moderno_esmeralda">Certificado Deportivo Dinámico (Horizontal)</option>
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
              Crea pergaminos conmemorativos, diplomas de honor o placas para premiar en las ceremonias.
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
                  className="h-44 w-full p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-transform duration-300 group-hover:scale-[1.01] relative overflow-hidden"
                  style={getTemplatePreviewStyle(item.plantilla || 'pergamino_marcial')}
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
                    {modalMode === "create" ? `Nueva Mención / Diploma: ${torneo?.nombre || ''}` : "Editar Mención o Reconocimiento"}
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
                    Vista previa a escala real. Al imprimir se adaptará perfectamente en hoja A4 (
                    {isPortraitTemplate(formData.plantilla) ? "Vertical" : "Horizontal"}).
                  </div>

                  <div
                    className={`w-full ${
                      isPortraitTemplate(formData.plantilla)
                        ? "max-w-md md:max-w-lg aspect-[1/1.414]"
                        : "max-w-3xl aspect-[1.414/1]"
                    } shadow-2xl rounded-lg overflow-hidden border border-slate-300 mx-auto transition-all`}
                  >
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

                  {/* Selector Visual de Plantilla (9 Opciones) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Estilo de Plantilla Imprimible (9 Opciones Disponibles)
                      </label>
                      <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {getPlantillaLabel(formData.plantilla)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TEMPLATES_LIST.map(tmpl => (
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
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="block font-bold text-xs text-slate-900">{tmpl.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {tmpl.badge}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 leading-tight block">{tmpl.desc}</span>
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
                        placeholder="Ej: Sensei ROBERTO TAKESHI FUKOCHI"
                        value={formData.destinatario}
                        onChange={(e) => setFormData(prev => ({ ...prev, destinatario: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título de la Mención o Certificado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Reconocimiento y Honor a / CERTIFICADO DE PARTICIPACIÓN"
                        value={formData.titulo}
                        onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm uppercase tracking-wide focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo, Disciplina o Evento
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: KARATE DO GO JU RYU / XIII Torneo Seigokan"
                        value={formData.subtitulo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, subtitulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                  </div>

                  {/* Texto Dedicatoria */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Texto de Agradecimiento / Certificación *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Escribe el texto de la dedicatoria o certificación..."
                      value={formData.texto_agradecimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, texto_agradecimiento: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Firmante, fecha y entidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Otorgado Por</label>
                      <input
                        type="text"
                        placeholder="Ej: ASOCIACIÓN SEIGOKAN DE KARATE DO"
                        value={formData.otorgado_por || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, otorgado_por: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad y Fecha</label>
                      <input
                        type="text"
                        placeholder="Ej: Dada en Ciudad del Este, Paraguay. Noviembre 2026."
                        value={formData.ciudad_fecha || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, ciudad_fecha: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Firmante</label>
                      <input
                        type="text"
                        placeholder="Ej: Sensei Jorge Salgado Castillo"
                        value={formData.nombre_firmante || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre_firmante: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cargo o Representación del Firmante</label>
                      <input
                        type="text"
                        placeholder="Ej: Representación Seigokan Paraguay"
                        value={formData.cargo_firmante || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, cargo_firmante: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Logo o Escudo Personalizado (Opcional)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="URL del logo (si se deja vacío se muestra el emblema oficial Seigokan)..."
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
          MODAL DE IMPRESIÓN A4 INTELIGENTE
          ============================================================ */}
      {printModalOpen && printItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none">
            
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={18} />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                    Impresión en Calidad de Gala
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {isPortraitTemplate(printItem.plantilla) ? "Formato Vertical A4" : "Formato Horizontal A4"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isPortraitTemplate(printItem.plantilla)
                      ? "Orientación vertical A4 con encuadre exacto para impresora o exportar en PDF."
                      : "Orientación horizontal (Landscape) A4 lista para impresora o exportar en PDF."}
                  </p>
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
                className={`w-full ${
                  isPortraitTemplate(printItem.plantilla)
                    ? 'max-w-md md:max-w-lg aspect-[1/1.414]'
                    : 'max-w-4xl aspect-[1.414/1]'
                } bg-white shadow-2xl rounded-xl overflow-hidden print:w-screen print:h-screen print:max-w-none print:aspect-auto print:rounded-none print:shadow-none mx-auto`}
              >
                <CertificateCard data={printItem} isPrintMode={true} torneo={torneo} />
              </div>
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between print:hidden">
              <span>
                💡 Recuerda marcar <b>"Gráficos de fondo"</b> y orientación{" "}
                <b>{isPortraitTemplate(printItem.plantilla) ? "Vertical" : "Horizontal"}</b> en tu ventana de impresión.
              </span>
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

      {/* Reglas de impresión adaptativas */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printItem && isPortraitTemplate(printItem.plantilla) ? 'portrait' : 'landscape'};
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
