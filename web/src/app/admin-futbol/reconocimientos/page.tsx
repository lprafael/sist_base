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
  isPortraitTemplate,
  CustomLayoutConfig,
  parsePlantilla
} from '@/components/certificados/CertificateCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Modelos de datos
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
  configuracion?: CustomLayoutConfig;
}

const TEMPLATES_LIST = [
  { id: "pergamino_seigokan", name: "1. Pergamino de Honor con Pluma (Pergamino 2)", desc: "Lienzo ceremonial sobre escritorio de nogal, pluma estilográfica, sello Seigokan y lacre", badge: "Vertical A4", image: "/images/certificados/Pergamino2.png" },
  { id: "pergamino_marcial", name: "2. Pergamino de Honor Enrollado", desc: "Rollo de madera, papiro milenario y sello de lacre rojo", badge: "Vertical A4", image: "/images/certificados/pergamino_raw.jpg" },
  { id: "azul_imperial_oro", name: "3. Azul Marino y Oro 24K", desc: "Lienzo azul noche imperial, filigrana dorada y sellos", badge: "Vertical A4", image: "/images/certificados/azul_oro_raw.jpg" },
  { id: "diploma_marcial_laurel", name: "4. Diploma Clásico Laurel", desc: "Orla renacentista de laurel, sello Hanko y lacre", badge: "Vertical A4", image: "/images/certificados/clasico_laurel_raw.jpg" },
  { id: "placa_madera", name: "5. Placa Nogal y Bronce", desc: "Madera oscura, chapa de latón y tornillos de bronce", badge: "Horizontal" },
  { id: "placa_cristal", name: "6. Placa Cristal y Acero", desc: "Cristal templado flotante y pernos cromados", badge: "Horizontal" },
  { id: "placa_caoba_plata", name: "7. Placa Caoba y Plata", desc: "Madera rojiza, acero cepillado y grabado láser", badge: "Horizontal" },
  { id: "gala_oscura", name: "8. Gala Dark & Gold 24K", desc: "Negro obsidiana y marcos en oro fundido de 24K", badge: "Horizontal" },
  { id: "diploma_clasico", name: "9. Diploma Real de Honor", desc: "Fondo pergamino con orlas florales doradas", badge: "Horizontal" },
  { id: "moderno_esmeralda", name: "10. Certificado Deportivo", desc: "Estética deportiva dinámica azul y esmeralda", badge: "Horizontal" }
];

export default function ReconocimientosPage() {
  const [reconocimientos, setReconocimientos] = useState<Reconocimiento[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTorneo, setFilterTorneo] = useState<string>("all");
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

  // Form State
  const [formData, setFormData] = useState<Reconocimiento>({
    torneo_id: "",
    titulo: "Reconocimiento y Honor a",
    subtitulo: "KARATE DO GO JU RYU",
    destinatario: "Sensei ROBERTO TAKESHI FUKOCHI",
    texto_agradecimiento: "Por sus incontables años de dedicación inquebrantable, pasión y sabiduría en la enseñanza y difusión del KARATE DO GO JU RYU, como pilar fundamental de la ASOCIACIÓN SEIGOKAN DE KARATE DO.\n\nEste pergamino certifica la gratitud profunda de sus estudiantes y la comunidad marcial. Su legado de rectitud y maestría perdurará.",
    otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
    ciudad_fecha: "Dada en Ciudad del Este, Paraguay. Noviembre 2026.",
    plantilla: "pergamino_seigokan",
    logo_url: "",
    firma_url: "",
    cargo_firmante: "Representación Seigokan Paraguay",
    nombre_firmante: "Sensei Jorge Salgado Castillo",
    configuracion: {
      pos_firma: 'linea',
      tipo_firma: 'caligrafica',
      align_texto: 'center',
      pos_vertical_texto: 0,
      pos_firma_x: 0,
      pos_firma_y: 0,
      tamano_texto: 'md',
      color_tinta: '#241e19',
      mostrar_linea_firma: false
    }
  });

  const printRef = useRef<HTMLDivElement>(null);

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('user_session') || '{}');
      return s.access_token || s.token || localStorage.getItem('token') || '';
    } catch {
      return localStorage.getItem('token') || '';
    }
  };

  // Cargar lista de torneos del organizador
  const fetchTorneos = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/futbol/torneos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTorneos(data);
      }
    } catch (e) {
      console.warn("No se pudieron cargar torneos vía API:", e);
    }
  };

  // Cargar reconocimientos desde el backend o localStorage de respaldo
  const fetchReconocimientos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/reconocimientos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReconocimientos(data);
        localStorage.setItem('cached_reconocimientos', JSON.stringify(data));
      } else {
        throw new Error("Respuesta no OK del servidor");
      }
    } catch (e) {
      console.warn("Usando almacenamiento local de respaldo para reconocimientos:", e);
      const cached = localStorage.getItem('cached_reconocimientos');
      if (cached) {
        try {
          setReconocimientos(JSON.parse(cached));
        } catch {}
      } else {
        const demoItems: Reconocimiento[] = [
          {
            id: 1,
            torneo_id: null,
            titulo: "Reconocimiento y Honor a",
            subtitulo: "KARATE DO GO JU RYU",
            destinatario: "Sensei ROBERTO TAKESHI FUKOCHI",
            texto_agradecimiento: "Por sus incontables años de dedicación inquebrantable, pasión y sabiduría en la enseñanza y difusión del KARATE DO GO JU RYU, como pilar fundamental de la ASOCIACIÓN SEIGOKAN DE KARATE DO.\n\nEste pergamino certifica la gratitud profunda de sus estudiantes y la comunidad marcial. Su legado de rectitud y maestría perdurará.",
            otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Dada en Ciudad del Este, Paraguay. Noviembre 2026.",
            plantilla: "pergamino_seigokan",
            nombre_firmante: "Sensei Jorge Salgado Castillo",
            cargo_firmante: "Representación Seigokan Paraguay",
            configuracion: {
              pos_firma: 'linea',
              tipo_firma: 'caligrafica',
              align_texto: 'center',
              pos_vertical_texto: 0,
              pos_firma_x: 0,
              pos_firma_y: 0,
              tamano_texto: 'md',
              color_tinta: '#241e19'
            }
          },
          {
            id: 2,
            torneo_id: null,
            titulo: "CERTIFICADO DE PARTICIPACIÓN",
            subtitulo: "XIII Torneo Seigokan Go Ju Ryu Karate Do",
            destinatario: "Sensei Jorge Salgado Castillo",
            texto_agradecimiento: "La Escuela Seigokan otorga este presente Certificado por su valiosa participación en el XIII Torneo Seigokan Go Ju Ryu Karate Do realizado en noviembre de 2026.",
            otorgado_por: "ESCUELA SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Dado en Ciudad del Este, a los 15 días del mes de noviembre de 2026.",
            plantilla: "azul_imperial_oro",
            nombre_firmante: "Jorge Salgado Castillo",
            cargo_firmante: "Representación de Seigokan Paraguay"
          },
          {
            id: 3,
            torneo_id: null,
            titulo: "CERTIFICADO DE AGRADECIMIENTO",
            subtitulo: "XIII TORNEO SUDAMERICANO SEIGOKAN",
            destinatario: "Sensei JORGE SALGADO CASTILLO",
            texto_agradecimiento: "La Asociación Seigokan, con profundo respeto y gratitud, otorga el presente Certificado en reconocimiento y sincera gratitud por su invaluable aporte y dedicación en la organización y éxito del XIII TORNEO SUDAMERICANO SEIGOKAN. Este evento, gracias a su apoyo, ha fortalecido los lazos de fraternidad y el espíritu del Karate Do.",
            otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
            ciudad_fecha: "Realizado en la Ciudad del Este, Paraguay, en el mes de noviembre del año 2026.",
            plantilla: "diploma_marcial_laurel",
            nombre_firmante: "Sensei JORGE SALGADO CASTILLO.",
            cargo_firmante: "Seigokan Paraguay"
          }
        ];
        setReconocimientos(demoItems);
        localStorage.setItem('cached_reconocimientos', JSON.stringify(demoItems));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTorneos();
    fetchReconocimientos();
  }, []);

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

  // Subir imagen de firma escaneada / transparente
  const handleUploadFirma = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormData(prev => ({
          ...prev,
          firma_url: data.url,
          configuracion: { ...prev.configuracion, tipo_firma: 'imagen' }
        }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            firma_url: reader.result as string,
            configuracion: { ...prev.configuracion, tipo_firma: 'imagen' }
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          firma_url: reader.result as string,
          configuracion: { ...prev.configuracion, tipo_firma: 'imagen' }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS_TEXTO[0]) => {
    const { plantillaId, config } = parsePlantilla(preset.plantilla);
    setFormData(prev => ({
      ...prev,
      titulo: preset.titulo,
      subtitulo: preset.subtitulo,
      destinatario: preset.destinatario || prev.destinatario,
      texto_agradecimiento: preset.texto,
      otorgado_por: preset.otorgado_por,
      ciudad_fecha: preset.ciudad_fecha,
      nombre_firmante: preset.nombre_firmante || prev.nombre_firmante,
      cargo_firmante: preset.cargo_firmante || prev.cargo_firmante,
      plantilla: plantillaId,
      configuracion: {
        ...(prev.configuracion || {}),
        ...config
      }
    }));
  };

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      torneo_id: filterTorneo !== "all" ? filterTorneo : "",
      titulo: "Reconocimiento y Honor a",
      subtitulo: "KARATE DO GO JU RYU",
      destinatario: "",
      texto_agradecimiento: "Por sus incontables años de dedicación inquebrantable, pasión y sabiduría en la enseñanza y difusión del KARATE DO GO JU RYU, como pilar fundamental de la ASOCIACIÓN SEIGOKAN DE KARATE DO.\n\nEste pergamino certifica la gratitud profunda de sus estudiantes y la comunidad marcial.",
      otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
      ciudad_fecha: "Dada en Ciudad del Este, Paraguay. Noviembre 2026.",
      plantilla: "pergamino_seigokan",
      logo_url: "",
      firma_url: "",
      cargo_firmante: "Representación Seigokan Paraguay",
      nombre_firmante: "Sensei Jorge Salgado Castillo",
      configuracion: {
        pos_firma: 'linea',
        tipo_firma: 'caligrafica',
        align_texto: 'center',
        pos_vertical_texto: 0,
        pos_firma_x: 0,
        pos_firma_y: 0,
        tamano_texto: 'md',
        color_tinta: '#241e19',
        mostrar_linea_firma: false
      }
    });
    setActiveTab("form");
    setModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (rec: Reconocimiento) => {
    setModalMode("edit");
    setEditingId(rec.id || null);
    const { plantillaId, config } = parsePlantilla(rec.plantilla);
    setFormData({
      ...rec,
      plantilla: plantillaId,
      configuracion: {
        pos_firma: 'linea',
        tipo_firma: 'caligrafica',
        align_texto: 'center',
        pos_vertical_texto: 0,
        pos_firma_x: 0,
        pos_firma_y: 0,
        tamano_texto: 'md',
        color_tinta: '#241e19',
        ...config,
        ...(rec.configuracion || {})
      }
    });
    setActiveTab("form");
    setModalOpen(true);
  };

  // Duplicar reconocimiento
  const handleDuplicate = (rec: Reconocimiento) => {
    setModalMode("create");
    setEditingId(null);
    const { plantillaId, config } = parsePlantilla(rec.plantilla);
    setFormData({
      ...rec,
      id: undefined,
      plantilla: plantillaId,
      destinatario: `${rec.destinatario} (Copia)`,
      titulo: rec.titulo,
      configuracion: {
        ...config,
        ...(rec.configuracion || {})
      }
    });
    setActiveTab("form");
    setModalOpen(true);
  };

  // Guardar en base de datos y actualizar estado
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

      const basePlantilla = formData.plantilla?.split('|')[0] || 'pergamino_seigokan';
      const fullPlantilla = formData.configuracion && Object.keys(formData.configuracion).length > 0
        ? `${basePlantilla}|${JSON.stringify(formData.configuracion)}`
        : basePlantilla;

      const payload = {
        ...formData,
        plantilla: fullPlantilla,
        torneo_id: formData.torneo_id || null
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
        throw new Error("Error en respuesta HTTP");
      }
    } catch (err) {
      console.warn("Fallo el guardado en servidor, guardando localmente:", err);
      const basePlantilla = formData.plantilla?.split('|')[0] || 'pergamino_seigokan';
      const fullPlantilla = formData.configuracion && Object.keys(formData.configuracion).length > 0
        ? `${basePlantilla}|${JSON.stringify(formData.configuracion)}`
        : basePlantilla;

      const itemToSave = {
        ...formData,
        plantilla: fullPlantilla
      };

      if (modalMode === "edit" && editingId) {
        const updated = reconocimientos.map(r => r.id === editingId ? { ...itemToSave, id: editingId } : r);
        setReconocimientos(updated);
        localStorage.setItem('cached_reconocimientos', JSON.stringify(updated));
      } else {
        const newRec: Reconocimiento = {
          ...itemToSave,
          id: Date.now()
        };
        const updated = [newRec, ...reconocimientos];
        setReconocimientos(updated);
        localStorage.setItem('cached_reconocimientos', JSON.stringify(updated));
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar
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
      localStorage.setItem('cached_reconocimientos', JSON.stringify(filtered));
    }
  };


  // Abrir modal de impresión rápida
  const handlePrint = (rec: Reconocimiento) => {
    setPrintItem(rec);
    setPrintModalOpen(true);
  };

  // Disparar ventana de impresión del navegador
  const triggerBrowserPrint = () => {
    window.print();
  };

  // Filtros
  const filteredReconocimientos = reconocimientos.filter(item => {
    if (filterTorneo !== "all") {
      if (filterTorneo === "general" && item.torneo_id) return false;
      if (filterTorneo !== "general" && String(item.torneo_id) !== String(filterTorneo)) return false;
    }
    const itemPlantilla = item.plantilla?.split('|')[0];
    if (filterPlantilla !== "all" && itemPlantilla !== filterPlantilla) return false;
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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      {/* ============================================================
          ENCABEZADO DE PÁGINA
          ============================================================ */}
      <div className="max-w-7xl mx-auto mb-8 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Award size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                Menciones, Diplomas y Reconocimientos
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Imprimibles A4
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Genera pergaminos tradicionales con sello de lacre, diplomas de gala en oro, placas conmemorativas de madera y diplomas oficiales listos para imprimir.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            <Plus size={20} />
            Nueva Mención / Diploma
          </button>
        </div>

        {/* ============================================================
            BARRA DE BÚSQUEDA Y FILTROS
            ============================================================ */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por homenajeado, club, motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterTorneo}
              onChange={(e) => setFilterTorneo(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700 shadow-sm cursor-pointer"
            >
              <option value="all">Todos los Torneos</option>
              <option value="general">Menciones Generales / Institucionales</option>
              {torneos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre || `Torneo #${t.id}`}</option>
              ))}
            </select>

            <select
              value={filterPlantilla}
              onChange={(e) => setFilterPlantilla(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700 shadow-sm cursor-pointer"
            >
              <option value="all">Todas las Plantillas (10 Disponibles)</option>
              <option value="pergamino_seigokan">Pergamino de Honor con Pluma - Pergamino 2 (Vertical A4)</option>
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
        </div>
      </div>

      {/* ============================================================
          LISTADO / GRID DE MENCIONES
          ============================================================ */}
      <div className="max-w-7xl mx-auto print:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-medium">Cargando reconocimientos y placas...</p>
          </div>
        ) : filteredReconocimientos.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Award size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Aún no hay reconocimientos creados</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-6">
              Crea pergaminos conmemorativos, diplomas en oro y placas de honor para premiar en las finales y galas.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 shadow transition-all cursor-pointer"
            >
              <Plus size={18} />
              Crear primer reconocimiento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md bg-black/40 text-amber-200 border border-amber-400/30">
                    {getPlantillaLabel(item.plantilla)}
                  </span>

                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs">
                    <Printer size={16} /> Ver e Imprimir
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80" style={{ color: getTextColor(item.plantilla) }}>
                    {item.titulo}
                  </p>
                  <h3 className="text-base font-extrabold line-clamp-1" style={{ color: getTextColor(item.plantilla) }}>
                    {item.destinatario}
                  </h3>
                  <p className="text-[11px] mt-1 line-clamp-2 italic px-3 opacity-90" style={{ color: getTextColor(item.plantilla) }}>
                    "{item.texto_agradecimiento}"
                  </p>
                </div>

                {/* Datos del reconocimiento */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">
                        {item.ciudad_fecha || 'Fecha no especificada'}
                      </span>
                      {item.otorgado_por && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600 font-semibold truncate max-w-[150px]">
                          {item.otorgado_por}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.destinatario}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.subtitulo || item.titulo}</p>
                  </div>

                  {/* Barra de Acciones */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handlePrint(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      title="Imprimir o Exportar en PDF"
                    >
                      <Printer size={15} />
                      Imprimir
                    </button>

                    <button
                      onClick={() => handleDuplicate(item)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Duplicar mención"
                    >
                      <Copy size={16} />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar contenido"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar mención"
                    >
                      <Trash2 size={16} />
                    </button>
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
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg">
                    {modalMode === "create" ? "Nueva Mención o Placa Conmemorativa" : "Editar Mención o Reconocimiento"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Personaliza textos, homenajes, logos y plantillas para impresión de alta calidad.
                  </p>
                </div>
              </div>

              {/* Tabs Form / Live Preview */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 p-1 rounded-xl flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "form" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Formulario
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === "preview" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye size={14} />
                    Vista Previa
                  </button>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "preview" ? (
                <div className="flex flex-col items-center">
                  <div className="mb-4 text-xs font-medium text-slate-500 flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">
                    <Sparkles size={16} className="text-amber-600" />
                    Vista previa a escala real. El diseño se adaptará perfectamente al imprimir en hoja A4 (
                    {isPortraitTemplate(formData.plantilla) ? "Vertical" : "Horizontal"}).
                  </div>

                  {/* Renderizado de la plantilla en vivo */}
                  <div 
                    className={`w-full ${
                      isPortraitTemplate(formData.plantilla)
                        ? 'max-w-md md:max-w-lg aspect-[1/1.414]'
                        : 'max-w-3xl aspect-[1.414/1]'
                    } shadow-2xl rounded-lg overflow-hidden border border-slate-300 mx-auto transition-all`}
                  >
                    <CertificateCard data={formData} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  
                  {/* Selector de Texto Rápido / Presets */}
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/70">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                      <Sparkles size={16} className="text-amber-600" />
                      Cargar Plantilla de Texto Rápido (1 Clic)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS_TEXTO.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className="text-xs font-medium bg-white hover:bg-amber-100 text-slate-700 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors shadow-2xs cursor-pointer text-left"
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
                        Selecciona la Plantilla de Impresión (9 Opciones)
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
                            {/* Miniatura visual de la plantilla */}
                            {tmpl.image ? (
                              <div className="w-full h-24 mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 relative shadow-inner">
                                <img src={tmpl.image} alt={tmpl.name} className="w-full h-full object-cover object-top" />
                              </div>
                            ) : (
                              <div
                                className="w-full h-12 mb-2 rounded-lg border border-slate-200 shadow-inner"
                                style={getTemplatePreviewStyle(tmpl.id)}
                              />
                            )}

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
                        Torneo o Competencia Vinculada
                      </label>
                      <select
                        value={formData.torneo_id || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, torneo_id: e.target.value || null }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      >
                        <option value="">General / Reconocimiento Institucional</option>
                        {torneos.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre || `Torneo #${t.id}`}</option>
                        ))}
                      </select>
                    </div>

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
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título de la Placa / Diploma *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Reconocimiento y Honor a / CERTIFICADO DE PARTICIPACIÓN"
                        value={formData.titulo}
                        onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm uppercase tracking-wide focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo, Disciplina o Evento
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: KARATE DO GO JU RYU / XIII Torneo Sudamericano"
                        value={formData.subtitulo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, subtitulo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  {/* Firmante, fecha y entidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Otorgado Por</label>
                      <input
                        type="text"
                        placeholder="Ej: ASOCIACIÓN SEIGOKAN DE KARATE DO"
                        value={formData.otorgado_por || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, otorgado_por: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad y Fecha</label>
                      <input
                        type="text"
                        placeholder="Ej: Dada en Ciudad del Este, Paraguay. Noviembre 2026."
                        value={formData.ciudad_fecha || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, ciudad_fecha: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Firmante</label>
                      <input
                        type="text"
                        placeholder="Ej: Sensei Jorge Salgado Castillo"
                        value={formData.nombre_firmante || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre_firmante: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cargo o Representación del Firmante</label>
                      <input
                        type="text"
                        placeholder="Ej: Representación Seigokan Paraguay"
                        value={formData.cargo_firmante || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, cargo_firmante: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
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
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 transition">
                            <Upload size={14} /> Subir
                            <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {formData.logo_url && (
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <img src={formData.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logo_url: "" }))}
                            className="text-red-500 hover:text-red-700 p-0.5"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ============================================================
                      PANEL DE PERSONALIZACIÓN: TEXTO Y FIRMA SEGÚN MI CONVENIENCIA
                      ============================================================ */}
                  <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/50 p-4 rounded-xl border border-amber-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                            Personalización de Texto y Firma (A tu Conveniencia)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Ajusta la posición exacta, alineación, tipo de firma y estilo visual con vista previa en vivo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* COLUMNA 1: CONVENIENCIA DEL TEXTO */}
                      <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs space-y-3">
                        <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-amber-600" /> Formato y Posición del Texto
                        </span>

                        {/* Alineación */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Alineación del Contenido</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { id: 'left', label: 'Izquierda' },
                              { id: 'center', label: 'Centro' },
                              { id: 'justify', label: 'Justificado' },
                              { id: 'right', label: 'Derecha' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  configuracion: { ...(prev.configuracion || {}), align_texto: opt.id as any }
                                }))}
                                className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                                  (formData.configuracion?.align_texto || 'center') === opt.id
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Posición Vertical (Subir / Bajar) */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                            <span>Posición Vertical del Texto</span>
                            <span className="font-bold text-amber-700">
                              {(formData.configuracion?.pos_vertical_texto || 0) > 0 ? `+${formData.configuracion?.pos_vertical_texto}%` : `${formData.configuracion?.pos_vertical_texto || 0}%`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                configuracion: { ...(prev.configuracion || {}), pos_vertical_texto: Math.max(-15, (prev.configuracion?.pos_vertical_texto || 0) - 2) }
                              }))}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 cursor-pointer"
                              title="Subir texto"
                            >
                              Subir ▲
                            </button>
                            <input
                              type="range"
                              min="-15"
                              max="15"
                              step="1"
                              value={formData.configuracion?.pos_vertical_texto || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                configuracion: { ...(prev.configuracion || {}), pos_vertical_texto: Number(e.target.value) }
                              }))}
                              className="flex-1 accent-amber-600 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                configuracion: { ...(prev.configuracion || {}), pos_vertical_texto: Math.min(15, (prev.configuracion?.pos_vertical_texto || 0) + 2) }
                              }))}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 cursor-pointer"
                              title="Bajar texto"
                            >
                              Bajar ▼
                            </button>
                            {(formData.configuracion?.pos_vertical_texto || 0) !== 0 && (
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  configuracion: { ...(prev.configuracion || {}), pos_vertical_texto: 0 }
                                }))}
                                className="text-[10px] text-slate-500 hover:text-red-500 underline cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tamaño y Color de Tinta */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Tamaño de Letra</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: 'sm', label: 'Compacto' },
                                { id: 'md', label: 'Estándar' },
                                { id: 'lg', label: 'Grande' }
                              ].map(sz => (
                                <button
                                  key={sz.id}
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    configuracion: { ...(prev.configuracion || {}), tamano_texto: sz.id as any }
                                  }))}
                                  className={`py-1 text-[11px] font-semibold rounded border transition cursor-pointer ${
                                    (formData.configuracion?.tamano_texto || 'md') === sz.id
                                      ? 'bg-amber-600 text-white border-amber-600'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {sz.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Color de Tinta</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: '#241e19', label: 'Sepia' },
                                { id: '#111111', label: 'Negro' },
                                { id: '#6e4c1f', label: 'Bronce' }
                              ].map(cl => (
                                <button
                                  key={cl.id}
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    configuracion: { ...(prev.configuracion || {}), color_tinta: cl.id }
                                  }))}
                                  className={`py-1 text-[11px] font-semibold rounded border flex items-center justify-center gap-1 transition cursor-pointer ${
                                    (formData.configuracion?.color_tinta || '#241e19') === cl.id
                                      ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-400'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: cl.id }} />
                                  <span>{cl.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COLUMNA 2: CONVENIENCIA DE LA FIRMA */}
                      <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs space-y-3">
                        <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 size={14} className="text-amber-600" /> Posición y Estilo de la Firma
                        </span>

                        {/* Ubicación de la Firma */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Ubicación de la Firma</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: 'linea', label: 'En línea (Izq.)' },
                              { id: 'centro', label: 'Centro' },
                              { id: 'derecha', label: 'Derecha' },
                              { id: 'custom', label: 'Libre (X/Y)' }
                            ].map(pos => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  configuracion: { ...(prev.configuracion || {}), pos_firma: pos.id as any }
                                }))}
                                className={`py-1.5 px-1 text-[11px] font-semibold rounded-lg border text-center transition cursor-pointer ${
                                  (formData.configuracion?.pos_firma || 'linea') === pos.id
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tipo de Firma */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Firma</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: 'caligrafica', label: '✍️ Caligráfica' },
                              { id: 'imagen', label: '📤 Imagen PNG' },
                              { id: 'manual', label: '✒️ Firmar en vivo' },
                              { id: 'ninguna', label: '🚫 Sin Firma' }
                            ].map(tp => (
                              <button
                                key={tp.id}
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  configuracion: { ...(prev.configuracion || {}), tipo_firma: tp.id as any }
                                }))}
                                className={`py-1.5 px-1 text-[11px] font-semibold rounded-lg border text-center transition cursor-pointer ${
                                  (formData.configuracion?.tipo_firma || 'caligrafica') === tp.id
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {tp.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subir firma si es tipo imagen */}
                        {formData.configuracion?.tipo_firma === 'imagen' && (
                          <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 space-y-2">
                            <label className="block text-[11px] font-bold text-amber-900">
                              Subir Imagen de Firma Escaneada (Fondo Transparente PNG)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="URL de la firma..."
                                value={formData.firma_url || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, firma_url: e.target.value }))}
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                              />
                              <label className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1">
                                <Upload size={13} /> Subir PNG
                                <input type="file" accept="image/*" onChange={handleUploadFirma} className="hidden" />
                              </label>
                            </div>
                            {formData.firma_url && (
                              <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-slate-200">
                                <img src={formData.firma_url} alt="Firma" className="h-8 max-w-[120px] object-contain mix-blend-multiply" />
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, firma_url: "" }))}
                                  className="text-red-500 hover:text-red-700 text-xs ml-auto cursor-pointer"
                                >
                                  Quitar
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ajuste fino de desplazamiento X / Y */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>Desplazamiento Horizontal (X): <b>{(formData.configuracion?.pos_firma_x || 0)}%</b></span>
                            <span>Desplazamiento Vertical (Y): <b>{(formData.configuracion?.pos_firma_y || 0)}%</b></span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              step="1"
                              value={formData.configuracion?.pos_firma_x || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                configuracion: { ...(prev.configuracion || {}), pos_firma_x: Number(e.target.value) }
                              }))}
                              className="accent-amber-600 cursor-pointer"
                              title="Mover firma izquierda/derecha"
                            />
                            <input
                              type="range"
                              min="-15"
                              max="15"
                              step="1"
                              value={formData.configuracion?.pos_firma_y || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                configuracion: { ...(prev.configuracion || {}), pos_firma_y: Number(e.target.value) }
                              }))}
                              className="accent-amber-600 cursor-pointer"
                              title="Mover firma arriba/abajo"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={15} /> Guardar Reconocimiento
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
          MODAL DE IMPRESIÓN Y EXPORTACIÓN A4 INTELIGENTE
          ============================================================ */}
      {printModalOpen && printItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none">
            
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={20} />
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    Vista de Impresión Lista
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {isPortraitTemplate(printItem.plantilla) ? "Formato Vertical A4" : "Formato Horizontal A4"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {isPortraitTemplate(printItem.plantilla)
                      ? "Configurada automáticamente para formato vertical A4 lista para impresora o exportar en PDF."
                      : "Configurada automáticamente para formato horizontal (Landscape) A4 lista para impresora o exportar en PDF."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerBrowserPrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <Printer size={16} /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={20} />
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
                <CertificateCard data={printItem} isPrintMode={true} />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between print:hidden">
              <span>
                💡 Consejo: En la ventana de impresión, asegúrate de seleccionar orientación{" "}
                <b>{isPortraitTemplate(printItem.plantilla) ? "Vertical" : "Horizontal"}</b> y activar <b>"Gráficos de fondo"</b>.
              </span>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ESTILOS GLOBALES DE IMPRESIÓN PARA PÁGINA A4
          ============================================================ */}
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
