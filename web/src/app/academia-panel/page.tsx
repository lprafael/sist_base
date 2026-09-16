/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Building2, Users, CreditCard, ClipboardList,
  Settings, LogOut, Plus, Pencil, Trash2, Check, X, Upload,
  ChevronRight, AlertCircle, Save, Eye, RefreshCw, UserPlus,
  Calendar, TrendingUp, TrendingDown, DollarSign, BookOpen, BarChart3, Link as LinkIcon,
  MessageSquare, FileText, Tag, Printer, QrCode, PhoneCall, Sparkles, Search, Image as ImageIcon, ShieldCheck, Lock,
  Wallet, ArrowUpRight, ArrowDownRight, Clock, Activity, Receipt, Sun, Moon, Menu,
  ShoppingBag, Trophy, PauseCircle, PlayCircle, FileSpreadsheet, Layers, Award, Package, Shirt, Filter, CheckCircle2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

// ─── Temas (Oscuro y Claro) ───────────────────────────────
const darkTheme = {
  bg: '#0f172a', surface: '#1e293b', border: '#334155',
  primary: '#3b82f6', primaryHover: '#2563eb',
  text: '#f1f5f9', muted: '#94a3b8', faint: '#64748b',
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', purple: '#8b5cf6',
  sidebarBg: '#0b1120', inputBg: '#0f172a',
};

const lightTheme = {
  bg: '#f8fafc', surface: '#ffffff', border: '#cbd5e1',
  primary: '#2563eb', primaryHover: '#1d4ed8',
  text: '#0f172a', muted: '#475569', faint: '#64748b',
  green: '#059669', red: '#dc2626', yellow: '#d97706', purple: '#7c3aed',
  sidebarBg: '#ffffff', inputBg: '#f1f5f9',
};

const C: Record<string, string> = { ...darkTheme };

const sportColors: Record<string, string> = {
  'Fútbol': '#10B981', 'Fútbol 5': '#10B981', 'Fútbol 7': '#10B981',
  'Básquet': '#F59E0B', 'Basketball': '#F59E0B',
  'Tenis': '#EF4444', 'Pádel': '#8B5CF6',
  'Natación': '#06B6D4', 'Vóley': '#F97316',
  'Atletismo': '#EC4899', 'Artes Marciales': '#6366F1',
};

// ─── Estilos comunes ────────────────────────────────────────
const card = (extra?: any): any => ({
  background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
  padding: 24, ...extra,
});
const btn = (color = C.primary, ghost = false): any => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 9, border: ghost ? `1px solid ${color}` : 'none',
  background: ghost ? 'transparent' : color,
  color: ghost ? color : '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'all .15s',
});
const input = (extra?: any): any => ({
  width: '100%', padding: '10px 14px', borderRadius: 9,
  background: C.inputBg || C.bg, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' as any, ...extra,
});
const label = (extra?: any): any => ({
  display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, ...extra,
});
const badge = (color: string): any => ({
  padding: '3px 10px', borderRadius: 999,
  background: `${color}18`, border: `1px solid ${color}44`,
  color, fontSize: 11, fontWeight: 700,
});

// ─── Tipos ──────────────────────────────────────────────────
type Tab = 'dashboard' | 'perfil' | 'sucursales' | 'categorias' | 'horarios_practica' | 'tarifas_costos' | 'alumnos' | 'tutores' | 'inscripciones' | 'cuotas' | 'tesoreria' | 'tienda' | 'competencias' | 'reportes' | 'sifen' | 'asistencias' | 'noticias' | 'feedback' | 'staff' | 'config';

interface Stat { label: string; value: string | number; icon: any; color: string; }

// ─────────────────────────────────────────────────────────────
export default function AcademiaPanel() {
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [notif, setNotif] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Tema del panel (Oscuro vs Claro)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('academia_theme_mode');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeMode(savedTheme);
      Object.assign(C, savedTheme === 'light' ? lightTheme : darkTheme);
    }
  }, []);

  const toggleTheme = (newMode?: 'dark' | 'light') => {
    const next = newMode || (themeMode === 'dark' ? 'light' : 'dark');
    setThemeMode(next);
    localStorage.setItem('academia_theme_mode', next);
    Object.assign(C, next === 'light' ? lightTheme : darkTheme);
  };

  useEffect(() => {
    const handleNavSifen = () => setActiveTab('sifen');
    window.addEventListener('nav-sifen', handleNavSifen);
    return () => window.removeEventListener('nav-sifen', handleNavSifen);
  }, []);

  // Data
  const [perfil, setPerfil] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [tutores, setTutores] = useState<any[]>([]);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<string[]>([]);
  const [configCuotas, setConfigCuotas] = useState<any>(null);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);

  // Modals
  const [modalSucursal, setModalSucursal] = useState<any>(null); // null | {} | {existing}
  const [modalAlumno, setModalAlumno] = useState<any>(null);
  const [modalStaff, setModalStaff] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [modalInscripcion, setModalInscripcion] = useState<any>(null);
  const [modalFactura, setModalFactura] = useState<any>(null);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileBannerRef = useRef<HTMLInputElement>(null);

  // ── Auth ────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user_session');
    if (!raw) { setLoading(false); return; }
    try {
      const s = JSON.parse(raw);
      // Sincronizar academia_id desde URL query parameter si existe
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlAcadId = urlParams.get('academia_id');
        if (urlAcadId && urlAcadId !== s.academia_id) {
          s.academia_id = urlAcadId;
          localStorage.setItem('user_session', JSON.stringify(s));
        }
      }
      setSession(s);
      const effectiveToken = s.access_token || s.token || '';
      setToken(effectiveToken);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const apiFetch = async (endpoint: string, opts: any = {}) => {
    let currentToken = token;
    let acadId = session?.academia_id || session?.id || '';

    // Fallback robusto directo desde localStorage si el estado de React aún no cargó
    if (typeof window !== 'undefined') {
      if (!currentToken || !acadId) {
        try {
          const raw = localStorage.getItem('user_session');
          if (raw) {
            const s = JSON.parse(raw);
            if (!currentToken) currentToken = s.access_token || s.token || '';
            if (!acadId) acadId = s.academia_id || s.id || '';
          }
        } catch (e) {}
      }
      if (!acadId) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('academia_id');
        if (urlId) acadId = urlId;
      }
    }

    const headers: any = {
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(acadId ? { 'X-Academia-Id': acadId } : {}),
      ...opts.headers,
    };
    if (!(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...opts,
      headers,
    });
    if (res.status === 401) {
      const adminBackup = localStorage.getItem('admin_session_backup');
      if (adminBackup) {
        // Si venía de administración, restaurar sesión de admin para no perder credenciales
        localStorage.setItem('user_session', adminBackup);
        localStorage.removeItem('admin_session_backup');
        window.location.href = '/admin';
        throw new Error('Sesión de academia no autorizada o expirada. Retornando a la Consola de Administrador...');
      } else {
        localStorage.removeItem('user_session');
        window.location.href = '/login';
        throw new Error('Sesión expirada.');
      }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Error en la petición.');
    return data;
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  const abrirFactura = async (docId: string) => {
    if (!docId) return;
    setLoadingFactura(true);
    try {
      const data = await apiFetch(`/academia/facturacion/documentos/${docId}/imprimir?formato=json`);
      if (data && data.numero_documento) {
        setModalFactura(data);
      } else {
        notify('No se pudo cargar la factura electrónica', 'err');
      }
    } catch (err: any) {
      notify(err.message || 'Error al cargar la factura electrónica', 'err');
    } finally {
      setLoadingFactura(false);
    }
  };

  const fetchAll = async () => {
    try {
      const [p, s, cat, d, mod] = await Promise.all([
        apiFetch('/academia/perfil').catch(() => null),
        apiFetch('/academia/sucursales').catch(() => []),
        apiFetch('/academia/categorias').catch(() => []),
        apiFetch('/api/deportes').catch(() => []),
        apiFetch('/academia/modalidades').catch(() => []),
      ]);
      setPerfil(p);
      setSucursales(s || []);
      setCategorias(cat || []);
      setDeportes(d || []);
      setModalidades(mod || []);

      // Cargas opcionales según tab
      apiFetch('/academia/alumnos').then(setAlumnos).catch(() => {});
      apiFetch('/academia/tutores').then(setTutores).catch(() => {});
      apiFetch('/academia/inscripciones').then(setInscripciones).catch(() => {});
      apiFetch('/academia/cuotas').then(setCuotas).catch(() => {});
      apiFetch('/academia/miembros').then(setStaff).catch(() => {});
      apiFetch('/academia/config-cuotas').then(setConfigCuotas).catch(() => {});
      apiFetch('/academia/cuentas').then(setCuentas).catch(() => {});
      apiFetch('/academia/metodos-pago').then(setMetodosPago).catch(() => {});
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  // ─── Guard ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
        <p>Cargando panel de academia...</p>
      </div>
    </div>
  );

  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>Tenés que iniciar sesión como Academia.</p>
        <a href="/login" style={btn()}>Ir al login</a>
      </div>
    </div>
  );

  // ─── Stats para dashboard ────────────────────────────────────
  const stats: Stat[] = [
    { label: 'Alumnos activos', value: alumnos.filter(a => a.estado === 'activo').length, icon: Users, color: C.green },
    { label: 'Sucursales', value: sucursales.filter(s => s.activa).length, icon: Building2, color: C.primary },
    { label: 'Inscripciones activas', value: inscripciones.filter(i => i.estado === 'activa').length, icon: BookOpen, color: C.purple },
    { label: 'Cuotas pendientes', value: cuotas.filter(q => q.estado === 'pendiente').length, icon: CreditCard, color: C.yellow },
  ];

  const cuotasPendientesGs = cuotas.filter(q => q.estado === 'pendiente').reduce((s, q) => s + (q.monto_final || 0), 0);

  const rolInterno = session.rol_academia || (session.role === 'academia' ? 'dueño' : 'invitado');
  const isDueno = rolInterno === 'dueño';
  const isAdmin = isDueno || rolInterno === 'administrador';
  const isTesorero = isDueno || rolInterno === 'administrador' || rolInterno === 'tesorero';

  // ─── Render principal ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text, position: 'relative' }}>
      {/* Estilos responsivos globales para móviles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-header-bar { display: none; }
        .sidebar-close-btn { display: none; }
        .sidebar-drawer-backdrop { display: none; }

        .academia-modal-box { box-sizing: border-box; }

        /* Dispositivos Móviles (Teléfonos <= 768px) */
        @media (max-width: 768px) {
          .mobile-header-bar { display: flex !important; }
          .sidebar-close-btn { display: flex !important; }
          .sidebar-drawer-backdrop { display: block !important; }
          .sidebar-drawer {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            z-index: 10000 !important;
            transform: translateX(-100%);
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 25px rgba(0,0,0,0.5) !important;
          }
          .sidebar-drawer.mobile-open {
            transform: translateX(0) !important;
          }
          .main-content-area {
            padding: 14px 10px !important;
          }

          /* Adaptación automática de Modales en Móvil */
          .academia-modal-box,
          div[style*="position: fixed"] > div[style*="maxWidth"],
          div[style*="position:fixed"] > div[style*="max-width"] {
            width: 96vw !important;
            max-width: 96vw !important;
            padding: 16px 12px !important;
            max-height: 88vh !important;
            border-radius: 14px !important;
            margin: 0 auto !important;
          }

          /* Adaptación de Botones de Acción en Modales */
          .academia-modal-actions,
          div[style*="justifyContent: 'flex-end'"],
          div[style*="justify-content: flex-end"] {
            display: flex !important;
            flex-direction: column-reverse !important;
            width: 100% !important;
            gap: 8px !important;
            margin-top: 16px !important;
          }
          .academia-modal-actions button,
          div[style*="justifyContent: 'flex-end'"] > button {
            width: 100% !important;
            justify-content: center !important;
            padding: 12px !important;
          }

          /* Desplazamiento Horizontal de Tablas sin romper layout */
          div:has(> table),
          .responsive-table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            margin-bottom: 12px !important;
            border-radius: 10px !important;
          }
          table {
            min-width: 520px !important;
          }
          th, td {
            white-space: nowrap !important;
            padding: 10px 12px !important;
          }

          /* Grillas de 2 y 3 columnas a 1 sola columna en Móvil */
          div[style*="gridTemplateColumns: '1fr 1fr'"],
          div[style*="gridTemplateColumns: '1fr 1fr 1fr'"],
          div[style*="gridTemplateColumns: '1fr 1fr 1fr 1fr'"],
          div[style*='gridTemplateColumns: "1fr 1fr"'],
          div[style*='gridTemplateColumns: "1fr 1fr 1fr"'],
          div[style*="grid-template-columns: 1fr 1fr"],
          div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          /* Tarjetas KPI en Dashboard: 2 por fila */
          div[style*="repeat(auto-fit, minmax(210px, 1fr))"],
          div[style*="repeat(auto-fit, minmax(220px, 1fr))"],
          div[style*="repeat(auto-fit, minmax(240px, 1fr))"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }

          /* Ajuste de Botones y Filtros de Cabeceras */
          div[style*="justifyContent: 'space-between'"],
          div[style*="justify-content: space-between"] {
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          input[placeholder*="Buscar"],
          input[type="search"],
          select {
            max-width: 100% !important;
            width: 100% !important;
          }

          /* Títulos y Subtítulos */
          h1 { font-size: 20px !important; }
          h2 { font-size: 17px !important; }
        }

        /* Dispositivos Tablets (769px a 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .main-content-area {
            padding: 20px 16px !important;
            max-width: 100% !important;
          }
          .academia-modal-box {
            max-width: 90vw !important;
            max-height: 88vh !important;
            padding: 22px 20px !important;
          }
          div[style*="repeat(auto-fit, minmax(210px, 1fr))"],
          div[style*="repeat(auto-fit, minmax(220px, 1fr))"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          div:has(> table) {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }
      ` }} />

      {/* ── Sidebar ── */}
      <Sidebar 
        activeTab={activeTab} 
        setTab={setActiveTab} 
        perfil={perfil} 
        rolInterno={rolInterno} 
        session={session} 
        themeMode={themeMode} 
        toggleTheme={toggleTheme} 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setShowPasswordModal={setShowPasswordModal}
      />

      {/* ── Main ── */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Super Admin Impersonation Alert Banner */}
        {Boolean(session?.is_impersonating || (typeof window !== 'undefined' && localStorage.getItem('admin_session_backup'))) && (
          <div style={{
            background: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)',
            color: '#fff', padding: '12px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)', flexWrap: 'wrap', gap: 12,
            position: 'sticky', top: 0, zIndex: 1000
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck style={{ width: 22, height: 22, color: '#93c5fd' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>👑 Modo Super Administrador Activo</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Estás visualizando y administrando la academia: <strong>{perfil?.nombre || session?.nombre || session?.academia_nombre || 'esta academia'}</strong>.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const backup = localStorage.getItem('admin_session_backup');
                if (backup) {
                  localStorage.setItem('user_session', backup);
                  localStorage.removeItem('admin_session_backup');
                }
                window.location.href = '/admin';
              }}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all .2s'
              }}
            >
              ⬅️ Volver a Consola de Administrador
            </button>
          </div>
        )}

        {/* Header Superior Móvil */}
        <div className="mobile-header-bar" style={{
          alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, zIndex: 900
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.text, borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Menu size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: C.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <GraduationCap size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, lineHeight: 1.2 }}>Panel Academia</div>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'capitalize' }}>{perfil?.nombre || rolInterno}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleTheme()}
            style={{
              background: `${C.primary}20`, border: `1px solid ${C.border}`,
              color: C.text, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
            }}
          >
            {themeMode === 'dark' ? <Moon size={14} color={C.primary} /> : <Sun size={14} color={C.yellow} />}
          </button>
        </div>

        {/* Notificación flotante */}
        {notif && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            padding: '12px 20px', borderRadius: 10,
            background: notif.type === 'ok' ? C.green : C.red,
            color: '#fff',
            fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {notif.type === 'ok' ? <Check size={18} /> : <AlertCircle size={18} />} {notif.msg}
          </div>
        )}

        <div className="main-content-area" style={{ padding: '32px 28px', maxWidth: 1100 }}>
          {/* ──────────────── DASHBOARD ──────────────── */}
          {activeTab === 'dashboard' && (
            <DashboardTab 
              perfil={perfil} sucursales={sucursales} alumnos={alumnos}
              inscripciones={inscripciones} cuotas={cuotas} cuentas={cuentas}
              categorias={categorias} setTab={setActiveTab} apiFetch={apiFetch}
            />
          )}

          {/* ──────────────── PERFIL ──────────────── */}
          {activeTab === 'perfil' && (
            <PerfilTab
              perfil={perfil} setPerfil={setPerfil} token={token}
              fileLogoRef={fileLogoRef} fileBannerRef={fileBannerRef}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} fetchAll={fetchAll}
              themeMode={themeMode} toggleTheme={toggleTheme}
            />
          )}

          {/* ──────────────── SUCURSALES ──────────────── */}
          {activeTab === 'sucursales' && (
            <SucursalesTab
              sucursales={sucursales} setSucursales={setSucursales}
              deportes={deportes} modal={modalSucursal} setModal={setModalSucursal}
              modalCategoria={modalCategoria} setModalCategoria={setModalCategoria}
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin} isDueno={isDueno}
              categorias={categorias} fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── CATEGORÍAS & MODALIDADES ──────────────── */}
          {activeTab === 'categorias' && (
            <CategoriasTab
              categorias={categorias} sucursales={sucursales} modalidades={modalidades}
              deportes={deportes}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} isAdmin={isAdmin}
              fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── HORARIOS DE PRÁCTICA ──────────────── */}
          {activeTab === 'horarios_practica' && (
            <HorariosPracticaTab
              categorias={categorias} sucursales={sucursales}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno}
            />
          )}

          {/* ──────────────── TARIFAS Y COSTOS ──────────────── */}
          {activeTab === 'tarifas_costos' && (
            <TarifasCostosTab
              categorias={categorias}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} isTesorero={isTesorero}
            />
          )}

          {/* ──────────────── ALUMNOS ──────────────── */}
          {activeTab === 'alumnos' && (
            <AlumnosTab
              alumnos={alumnos} setAlumnos={setAlumnos}
              sucursales={sucursales} tutores={tutores} categorias={categorias} inscripciones={inscripciones}
              modal={modalAlumno} setModal={setModalAlumno}
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin}
              fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── TUTORES / PADRES ──────────────── */}
          {activeTab === 'tutores' && (
            <TutoresTab
              tutores={tutores} alumnos={alumnos}
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin}
              fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── INSCRIPCIONES ──────────────── */}
          {activeTab === 'inscripciones' && (
            <InscripcionesTab
              inscripciones={inscripciones} alumnos={alumnos} categorias={categorias}
              modal={modalInscripcion} setModal={setModalInscripcion}
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin} isTesorero={isTesorero}
              fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── CUOTAS ──────────────── */}
          {activeTab === 'cuotas' && (
            <CuotasTab
              cuotas={cuotas} notify={notify} apiFetch={apiFetch}
              isTesorero={isTesorero} isDueno={isDueno} fetchAll={fetchAll}
              cuentas={cuentas} metodosPago={metodosPago}
              abrirFactura={abrirFactura}
            />
          )}

          {/* ────────────────── TESORERÍA ────────────────── */}
          {activeTab === 'tesoreria' && (
            <TesoreriaTab
              notify={notify} apiFetch={apiFetch}
              isDueno={isDueno} isTesorero={isTesorero}
              cuentas={cuentas} setCuentas={setCuentas}
              metodosPago={metodosPago} setMetodosPago={setMetodosPago}
              fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── UNIFORMES Y ACCESORIOS ──────────────── */}
          {activeTab === 'tienda' && (
            <TiendaTab
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin} isTesorero={isTesorero}
              alumnos={alumnos} cuentas={cuentas} metodosPago={metodosPago}
            />
          )}

          {/* ──────────────── COMPETENCIAS Y TORNEOS ──────────────── */}
          {activeTab === 'competencias' && (
            <CompetenciasTab
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin} isTesorero={isTesorero}
              alumnos={alumnos}
            />
          )}

          {/* ──────────────── REPORTES Y CARNETS ──────────────── */}
          {activeTab === 'reportes' && (
            <ReportesTab
              perfil={perfil} sucursales={sucursales} categorias={categorias}
              notify={notify} apiFetch={apiFetch}
            />
          )}

          {/* ──────────────── FACTURACIÓN SIFEN / .P12 ──────────────── */}
          {activeTab === 'sifen' && (
            <SifenTab
              perfil={perfil} notify={notify} apiFetch={apiFetch}
              abrirFactura={abrirFactura}
            />
          )}

          {/* ──────────────── STAFF ──────────────── */}
          {activeTab === 'staff' && (
            <StaffTab
              staff={staff} sucursales={sucursales}
              modal={modalStaff} setModal={setModalStaff}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── ASISTENCIAS ──────────────── */}
          {activeTab === 'asistencias' && (
            <AsistenciasTab
              notify={notify} apiFetch={apiFetch} 
              categorias={categorias} fetchAll={fetchAll}
            />
          )}

          {/* ──────────────── NOTICIAS ──────────────── */}
          {activeTab === 'noticias' && (
            <NoticiasTab
              notify={notify} apiFetch={apiFetch}
            />
          )}

          {/* ──────────────── FEEDBACK ──────────────── */}
          {activeTab === 'feedback' && (
            <FeedbackTab
              notify={notify} apiFetch={apiFetch}
            />
          )}

          {/* ──────────────── CONFIG ──────────────── */}
          {activeTab === 'config' && (
            <ConfigTab
              configCuotas={configCuotas} setConfigCuotas={setConfigCuotas}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} isTesorero={isTesorero}
            />
          )}
        </div>
      </div>
      
      {showPasswordModal && (
        <ChangePasswordModal 
          onClose={() => setShowPasswordModal(false)} 
          apiFetch={apiFetch} 
          notify={notify} 
        />
      )}

      {modalFactura && (
        <FacturaKuDEModal
          factura={modalFactura}
          onClose={() => setModalFactura(null)}
          apiFetch={apiFetch}
          notify={notify}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ═══════════════════════════════════════════════════════════
function ChangePasswordModal({ onClose, apiFetch, notify }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validations = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const strength = Object.values(validations).filter(Boolean).length;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (strength < 4) {
      notify('La contraseña no cumple con los requisitos de seguridad', 'err');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Las contraseñas nuevas no coinciden', 'err');
      return;
    }
    setLoading(true);
    try {
      const sessionStr = localStorage.getItem('user_session');
      const token = sessionStr ? JSON.parse(sessionStr).access_token : '';
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      if (res.ok) {
        notify('Contraseña cambiada exitosamente', 'ok');
        onClose();
      } else {
        const err = await res.json();
        notify(err.detail || 'Error al cambiar contraseña', 'err');
      }
    } catch (e: any) {
      notify('Error de red al cambiar contraseña', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div style={{ background: C.surface, padding: 24, borderRadius: 12, width: '90%', maxWidth: 400, border: `1px solid ${C.border}` }}>
        <h3 style={{ margin: '0 0 16px 0', color: C.text }}>Cambiar Contraseña</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={label()}>Contraseña Actual</label>
            <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={input()} />
          </div>
          <div>
            <label style={label()}>Nueva Contraseña</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={input()} />
            {newPassword.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: strength >= level 
                        ? (strength === 4 ? C.green : strength >= 3 ? C.yellow : C.red) 
                        : (C.border || '#cbd5e1')
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: validations.length ? C.green : C.muted }}>{validations.length ? '✓' : '○'} Mínimo 8 caracteres</span>
                  <span style={{ color: validations.upper ? C.green : C.muted }}>{validations.upper ? '✓' : '○'} Al menos 1 mayúscula</span>
                  <span style={{ color: validations.lower ? C.green : C.muted }}>{validations.lower ? '✓' : '○'} Al menos 1 minúscula</span>
                  <span style={{ color: validations.number ? C.green : C.muted }}>{validations.number ? '✓' : '○'} Al menos 1 número</span>
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={label()}>Confirmar Nueva Contraseña</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={input()} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btn(C.muted, true)}>Cancelar</button>
            <button type="submit" disabled={loading} style={btn(C.primary)}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FACTURA ELECTRÓNICA SIFEN / KuDE MODAL
// ═══════════════════════════════════════════════════════════
function FacturaKuDEModal({ factura, onClose, apiFetch, notify }: any) {
  if (!factura) return null;
  const em = factura.emisor || {};
  const rec = factura.receptor || {};
  const lineas = factura.lineas || [];

  const handleImprimir = () => {
    window.print();
  };

  const handleAbrirVentana = () => {
    window.open(`${API_URL}/academia/facturacion/documentos/${factura.id}/imprimir?formato=html&autoprint=1`, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 99999,
        overflowY: 'auto',
        padding: '20px 10px',
      }}
    >
      {/* ── ESTILOS DE IMPRESIÓN PARA AISLAR EL KUDE EN HOJA A4 ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-factura-kude, #printable-factura-kude * {
            visibility: visible !important;
          }
          #printable-factura-kude {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ── BARRA DE ACCIONES SUPERIOR (no se imprime) ── */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: 820,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          border: '1px solid #334155',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#2563eb22', color: '#60a5fa', padding: 8, borderRadius: 8 }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              Factura Electrónica {factura.numero_documento_formateado}
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  background: factura.estado === 'firmado' ? '#05966922' : factura.estado === 'anulado' || factura.cancelado ? '#dc262622' : '#d9770622',
                  color: factura.estado === 'firmado' ? '#34d399' : factura.estado === 'anulado' || factura.cancelado ? '#f87171' : '#fbbf24',
                  border: `1px solid ${factura.estado === 'firmado' ? '#05966944' : factura.estado === 'anulado' || factura.cancelado ? '#dc262644' : '#d9770644'}`,
                }}
              >
                {factura.cancelado ? 'ANULADO' : factura.estado?.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              KuDE Oficial SIFEN — {em.razon_social}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleImprimir}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            }}
          >
            <Printer size={15} /> Imprimir Factura
          </button>
          <button
            onClick={handleAbrirVentana}
            style={{
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Abrir página imprimible en pestaña independiente"
          >
            <ArrowUpRight size={14} /> Abrir en Ventana
          </button>
          <a
            href={`${API_URL}/academia/facturacion/documentos/${factura.id}/xml`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #475569',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileText size={14} /> XML
          </a>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── CUERPO DEL COMPROBANTE KUDE (Hoja blanca imprimible) ── */}
      <div
        id="printable-factura-kude"
        style={{
          width: '100%',
          maxWidth: 820,
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: 10,
          padding: '24px 28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          fontSize: 11,
          lineHeight: 1.35,
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        {/* Marca de agua si cancelado */}
        {Boolean(factura.cancelado) && (
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '10%',
              right: '10%',
              textAlign: 'center',
              transform: 'rotate(-25deg)',
              fontSize: 46,
              fontWeight: 900,
              color: 'rgba(239, 68, 68, 0.28)',
              border: '5px solid rgba(239, 68, 68, 0.28)',
              borderRadius: 12,
              padding: 12,
              pointerEvents: 'none',
              letterSpacing: 3,
            }}
          >
            DOCUMENTO ANULADO / CANCELADO
          </div>
        )}

        {/* 1. CABECERA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          {/* Lado izquierdo: Datos del Emisor */}
          <div style={{ flex: 1 }}>
            {em.logo_url && (
              <img
                src={em.logo_url}
                alt="Logo Academia"
                style={{ maxHeight: 54, maxWidth: 160, objectFit: 'contain', marginBottom: 6 }}
              />
            )}
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '-0.02em' }}>
              {em.razon_social}
            </div>
            {em.nombre_fantasia && (
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>
                {em.nombre_fantasia}
              </div>
            )}
            <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.4 }}>
              <div><strong>Actividad Económica:</strong> {em.actividad_economica}</div>
              <div><strong>Casa Central / Dirección:</strong> {em.direccion} N° {em.num_casa}</div>
              {em.ciudad_departamento && <div><strong>Ciudad / Dpto:</strong> {em.ciudad_departamento}</div>}
              <div><strong>Teléfono:</strong> {em.telefono || '—'} {em.email ? ` | Email: ${em.email}` : ''}</div>
            </div>
          </div>

          {/* Lado derecho: Recuadro Fiscal Timbrado / Factura */}
          <div
            style={{
              width: 290,
              border: '2px solid #0f172a',
              borderRadius: 8,
              padding: '12px 14px',
              textAlign: 'center',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
              TIMBRADO N°: <strong style={{ color: '#0f172a' }}>{em.num_timbrado}</strong>
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '3px 0' }}>
              RUC: {em.ruc_con_dv}
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1d4ed8', letterSpacing: '0.5px', margin: '4px 0' }}>
              FACTURA ELECTRÓNICA
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
              N° {factura.numero_documento_formateado}
            </div>
          </div>
        </div>

        {/* 2. DATOS DE OPERACIÓN Y RECEPTOR */}
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px', fontSize: 11 }}>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                Fecha y Hora de Emisión:
              </span>
              <strong style={{ color: '#0f172a' }}>{factura.fecha_emision_formateada}</strong>
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                Condición de Venta:
              </span>
              <strong style={{ color: '#1d4ed8' }}>{factura.condicion_venta}</strong>
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                Nombre / Razón Social:
              </span>
              <strong style={{ color: '#0f172a' }}>{rec.nombre}</strong>
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                RUC / Doc. Identidad:
              </span>
              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{rec.ruc_con_dv}</strong>
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                Dirección del Receptor:
              </span>
              <span style={{ color: '#334155' }}>{rec.direccion}</span>
            </div>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
                Teléfono / Contacto:
              </span>
              <span style={{ color: '#334155' }}>{rec.telefono || '—'}</span>
            </div>
          </div>
        </div>

        {/* 3. TABLA DE ÍTEMS / SERVICIOS */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 12,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: 9.5, color: '#334155' }}>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: '12%', borderRight: '1px solid #cbd5e1' }}>CÓDIGO</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: '8%', borderRight: '1px solid #cbd5e1' }}>CANT.</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', width: '44%', borderRight: '1px solid #cbd5e1' }}>DESCRIPCIÓN DEL BIEN O SERVICIO</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', width: '12%', borderRight: '1px solid #cbd5e1' }}>P. UNITARIO</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', width: '8%', borderRight: '1px solid #cbd5e1' }}>EXENTAS</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', width: '8%', borderRight: '1px solid #cbd5e1' }}>IVA 5%</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', width: '8%' }}>IVA 10%</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((ln: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: 10.5 }}>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e2e8f0' }}>
                  {ln.codigo}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                  {ln.cantidad}
                </td>
                <td style={{ padding: '6px 8px', borderRight: '1px solid #e2e8f0', color: '#0f172a' }}>
                  {ln.descripcion}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #e2e8f0' }}>
                  {new Intl.NumberFormat('es-PY').format(ln.precio_unitario || 0)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #e2e8f0' }}>
                  {ln.monto_exenta > 0 ? new Intl.NumberFormat('es-PY').format(ln.monto_exenta) : '0'}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #e2e8f0' }}>
                  {ln.monto_5 > 0 ? new Intl.NumberFormat('es-PY').format(ln.monto_5) : '0'}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                  {ln.monto_10 > 0 ? new Intl.NumberFormat('es-PY').format(ln.monto_10) : '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. TOTALES Y LIQUIDACIÓN */}
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            background: '#f8fafc',
          }}
        >
          {/* Subtotales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            <span style={{ fontWeight: 700, color: '#475569' }}>SUBTOTALES:</span>
            <span>Exentas: <strong style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat('es-PY').format(factura.subtotal_exenta || 0)}</strong> Gs.</span>
            <span>IVA 5%: <strong style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat('es-PY').format(factura.subtotal_5 || 0)}</strong> Gs.</span>
            <span>IVA 10%: <strong style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat('es-PY').format(factura.subtotal_10 || 0)}</strong> Gs.</span>
          </div>

          {/* Total a pagar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>TOTAL A PAGAR:</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
              Gs. {new Intl.NumberFormat('es-PY').format(factura.total_gral || 0)}
            </span>
          </div>

          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            <strong>SON:</strong> {factura.total_en_letras}
          </div>

          {/* Liquidación del IVA */}
          <div
            style={{
              borderTop: '1px dashed #cbd5e1',
              paddingTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: '#475569',
            }}
          >
            <span style={{ fontWeight: 800 }}>LIQUIDACIÓN DEL IVA:</span>
            <span>(IVA 5%): <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>Gs. {new Intl.NumberFormat('es-PY').format(factura.liq_iva_5 || 0)}</strong></span>
            <span>(IVA 10%): <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>Gs. {new Intl.NumberFormat('es-PY').format(factura.liq_iva_10 || 0)}</strong></span>
            <span>TOTAL IVA: <strong style={{ fontFamily: 'monospace', color: '#059669' }}>Gs. {new Intl.NumberFormat('es-PY').format(factura.total_iva || 0)}</strong></span>
          </div>
        </div>

        {/* 5. PIE SIFEN / KuDE */}
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: '#ffffff',
          }}
        >
          {factura.qr_image_base64 && (
            <img
              src={factura.qr_image_base64}
              alt="Código QR SIFEN"
              style={{ width: 105, height: 105, border: '1px solid #cbd5e1', borderRadius: 6, padding: 3, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, fontSize: 10, color: '#334155', lineHeight: 1.45 }}>
            <div style={{ fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', fontSize: 10, marginBottom: 2 }}>
              KuDE — Representación Gráfica de Documento Electrónico (SIFEN)
            </div>
            <div style={{ color: '#475569' }}>Código de Control (CDC):</div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 10.5,
                fontWeight: 800,
                color: '#1d4ed8',
                letterSpacing: 0.5,
                background: '#f1f5f9',
                padding: '3px 6px',
                borderRadius: 4,
                display: 'inline-block',
                margin: '4px 0',
                wordBreak: 'break-all',
              }}
            >
              {factura.cdc_formateado || factura.cdc}
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b' }}>
              Consulte la validez de esta Factura Electrónica con el número de CDC impreso o escaneando el código QR en{' '}
              <a href="https://ekuatia.set.gov.py/consultas" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
                https://ekuatia.set.gov.py/consultas
              </a>.
              Si su documento electrónico no se encuentra registrado en el sistema de la SET/DNIT, por favor consulte nuevamente en 24 horas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════
function Sidebar({ activeTab, setTab, perfil, rolInterno, session, themeMode, toggleTheme, mobileMenuOpen, setMobileMenuOpen, setShowPasswordModal }: any) {
  const navItems: { id: Tab; label: string; icon: any; roles?: string[] }[] = [
    { id: 'dashboard',         label: 'Dashboard',             icon: BarChart3 },
    { id: 'perfil',            label: 'Mi Academia',            icon: GraduationCap, roles: ['dueño','administrador'] },
    { id: 'sucursales',        label: 'Sedes y Canchas',        icon: Building2 },
    { id: 'categorias',        label: 'Categorías y Modalidades', icon: Tag, roles: ['dueño','administrador'] },
    { id: 'horarios_practica', label: 'Horarios de Práctica',    icon: Calendar, roles: ['dueño','administrador'] },
    { id: 'tarifas_costos',    label: 'Costos e Indumentaria',  icon: DollarSign, roles: ['dueño','administrador','tesorero'] },
    { id: 'alumnos',           label: 'Alumnos',                icon: Users },
    { id: 'tutores',           label: 'Tutores / Padres',       icon: Users, roles: ['dueño','administrador','tesorero'] },
    { id: 'inscripciones',     label: 'Inscripciones',          icon: BookOpen },
    { id: 'cuotas',            label: 'Cuotas / Pagos',         icon: CreditCard, roles: ['dueño','administrador','tesorero'] },
    { id: 'tesoreria',         label: 'Tesorería & Gastos',     icon: DollarSign, roles: ['dueño','administrador','tesorero'] },
    { id: 'tienda',            label: 'Uniformes y Accesorios', icon: ShoppingBag, roles: ['dueño','administrador','tesorero'] },
    { id: 'competencias',      label: 'Competencias / Torneos', icon: Trophy, roles: ['dueño','administrador','tesorero','profesor'] },
    { id: 'reportes',          label: 'Reportes y Carnets',     icon: ClipboardList, roles: ['dueño','administrador','tesorero','profesor'] },
    { id: 'sifen',             label: 'Facturación SIFEN / .P12', icon: ShieldCheck, roles: ['dueño','administrador','tesorero'] },
    { id: 'asistencias',       label: 'Asistencias',            icon: Calendar, roles: ['dueño','administrador','profesor'] },
    { id: 'noticias',          label: 'Noticias CMS',           icon: FileText, roles: ['dueño','administrador'] },
    { id: 'feedback',          label: 'Feedback Socios',        icon: MessageSquare, roles: ['dueño','administrador'] },
    { id: 'staff',             label: 'Mi Equipo',              icon: UserPlus, roles: ['dueño'] },
    { id: 'config',            label: 'Configuración',          icon: Settings, roles: ['dueño','tesorero'] },
  ];

  const visible = navItems.filter(n => !n.roles || n.roles.includes(rolInterno));

  return (
    <>
      {/* Fondo oscuro overlay en celular cuando el menú está abierto */}
      {mobileMenuOpen && (
        <div
          className="sidebar-drawer-backdrop"
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)', zIndex: 9999
          }}
        />
      )}

      <div className={`sidebar-drawer ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{
        width: 250, background: C.sidebarBg || C.surface, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
      }}>
        {/* Logo y Botón Cerrar en Móvil */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Panel Academia</div>
              <div style={{ fontSize: 11, color: C.faint, textTransform: 'capitalize' }}>{rolInterno}</div>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
            style={{
              background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {visible.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setTab(item.id); if (setMobileMenuOpen) setMobileMenuOpen(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                background: active ? `${C.primary}22` : 'transparent',
                border: active ? `1px solid ${C.primary}44` : '1px solid transparent',
                color: active ? C.primary : C.muted,
                fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer',
                transition: 'all .15s', textAlign: 'left',
              }}>
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar con Switch de Tema */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={() => toggleTheme()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 8, marginBottom: 8,
              background: themeMode === 'light' ? `${C.primary}12` : `${C.primary}18`,
              border: `1px solid ${C.border}`,
              color: C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all .15s'
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {themeMode === 'dark' ? <Moon size={14} color={C.primary} /> : <Sun size={14} color={C.yellow} />}
              {themeMode === 'dark' ? 'Tema Oscuro' : 'Tema Claro'}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: C.primary, color: '#fff', fontWeight: 800 }}>
              {themeMode === 'dark' ? '🌙' : '☀️'}
            </span>
          </button>

          {perfil?.enlace_sitio && (
            <a href={`/academia/${perfil.enlace_sitio}`} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, marginBottom: 6,
              background: `${C.green}18`, color: C.green,
              fontSize: 12, fontWeight: 600, textDecoration: 'none',
            }}>
              <Eye size={14} /> Ver página pública
            </a>
          )}
          <button onClick={() => { if (setShowPasswordModal) setShowPasswordModal(true); if (setMobileMenuOpen) setMobileMenuOpen(false); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, background: 'transparent',
            border: 'none', color: C.text, fontSize: 12, cursor: 'pointer', marginBottom: 6,
          }}>
            <Lock size={14} /> Cambiar contraseña
          </button>
          {typeof window !== 'undefined' && Boolean(localStorage.getItem('admin_session_backup')) && (
            <button
              onClick={() => {
                const backup = localStorage.getItem('admin_session_backup');
                if (backup) {
                  localStorage.setItem('user_session', backup);
                  localStorage.removeItem('admin_session_backup');
                }
                window.location.href = '/admin';
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, background: '#1d4ed822',
                border: '1px solid #1d4ed844', color: '#60a5fa', fontSize: 12,
                fontWeight: 700, cursor: 'pointer', marginBottom: 6,
              }}
            >
              <ShieldCheck size={14} /> Volver al Admin
            </button>
          )}
          <button onClick={() => {
            const backup = localStorage.getItem('admin_session_backup');
            if (backup) {
              localStorage.setItem('user_session', backup);
              localStorage.removeItem('admin_session_backup');
              window.location.href = '/admin';
            } else {
              localStorage.removeItem('user_session');
              window.location.href = 'https://micancha.com.py';
            }
          }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, background: 'transparent',
            border: 'none', color: C.faint, fontSize: 12, cursor: 'pointer',
          }}>
            <LogOut size={14} /> {typeof window !== 'undefined' && localStorage.getItem('admin_session_backup') ? 'Salir al Admin' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function DashboardTab({
  stats: propStats,
  cuotasPendientesGs: propCuotasPendientes,
  cuotas = [],
  alumnos = [],
  sucursales = [],
  perfil,
  inscripciones = [],
  cuentas = [],
  categorias = [],
  setTab,
  apiFetch,
}: any) {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loadingMovs, setLoadingMovs] = useState<boolean>(false);
  const [activeSubView, setActiveSubView] = useState<'cuotas' | 'movimientos'>('cuotas');
  const [periodoFiltro, setPeriodoFiltro] = useState<'mes' | 'todos'>('mes');

  useEffect(() => {
    if (apiFetch) {
      setLoadingMovs(true);
      apiFetch('/academia/caja/movimientos?limit=100')
        .then((data: any) => setMovimientos(Array.isArray(data) ? data : []))
        .catch(() => setMovimientos([]))
        .finally(() => setLoadingMovs(false));
    }
  }, [apiFetch]);

  // Filtrado por fecha (mes actual vs todos)
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const movsFiltrados = movimientos.filter((m: any) => {
    if (periodoFiltro === 'mes' && m.fecha) {
      return new Date(m.fecha) >= primerDiaMes;
    }
    return true;
  });

  const cuotasFiltradas = cuotas.filter((q: any) => {
    if (periodoFiltro === 'mes' && q.fecha_pago) {
      return new Date(q.fecha_pago) >= primerDiaMes;
    }
    return true;
  });

  // Calculos financieros
  const ingresosMovs = movsFiltrados
    .filter((m: any) => m.tipo === 'ingreso' && !m.anulado)
    .reduce((s: number, m: any) => s + (m.monto || 0), 0);

  const egresosMovs = movsFiltrados
    .filter((m: any) => m.tipo === 'egreso' && !m.anulado)
    .reduce((s: number, m: any) => s + (m.monto || 0), 0);

  // Fallback si no hay movimientos de ingresos registrados, calcular desde cuotas pagadas
  const cuotasPagadasGs = cuotasFiltradas
    .filter((q: any) => q.estado === 'pagada')
    .reduce((s: number, q: any) => s + (q.monto_final || 0), 0);

  const totalIngresos = ingresosMovs > 0 ? ingresosMovs : cuotasPagadasGs;
  const totalEgresos = egresosMovs;
  const balanceNeto = totalIngresos - totalEgresos;

  const cuotasPendientesCount = cuotas.filter((q: any) => q.estado === 'pendiente').length;
  const cuotasPendientesGs = propCuotasPendientes ?? cuotas.filter((q: any) => q.estado === 'pendiente').reduce((s: number, q: any) => s + (q.monto_final || 0), 0);

  const cuotasPagadasCount = cuotas.filter((q: any) => q.estado === 'pagada').length;
  const totalCuotasCount = cuotas.length;
  const tasaCobranza = totalCuotasCount > 0 ? Math.round((cuotasPagadasCount / totalCuotasCount) * 100) : 0;

  const alumnosActivos = alumnos.filter((a: any) => a.estado === 'activo').length;
  const sucursalesActivas = sucursales.filter((s: any) => s.activa).length;
  const inscripcionesActivas = inscripciones.filter((i: any) => i.estado === 'activa').length;

  const saldoTotalCuentas = cuentas.reduce((s: number, c: any) => s + (c.saldo_actual || 0), 0);

  const cuotasRecientes = cuotas.slice(0, 7);
  const movsRecientes = movimientos.slice(0, 7);

  return (
    <div>
      {/* Header con título, filtro de periodo y botones rápidos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={28} color={C.primary} /> Dashboard Financiero & Operativo
          </h1>
          <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Resumen de ingresos, egresos, cobros y estado general de la academia</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Selector de periodo */}
          <div style={{ display: 'inline-flex', background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setPeriodoFiltro('mes')}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: periodoFiltro === 'mes' ? C.primary : 'transparent',
                color: periodoFiltro === 'mes' ? '#fff' : C.muted,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s'
              }}>
              Este Mes
            </button>
            <button
              onClick={() => setPeriodoFiltro('todos')}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: periodoFiltro === 'todos' ? C.primary : 'transparent',
                color: periodoFiltro === 'todos' ? '#fff' : C.muted,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s'
              }}>
              Histórico
            </button>
          </div>

          {/* Botones de acción rápida */}
          {setTab && (
            <>
              <button onClick={() => setTab('cuotas')} style={btn(C.green)}>
                <CreditCard size={15} /> Cobrar Cuota
              </button>
              <button onClick={() => setTab('tesoreria')} style={btn(C.red)}>
                <Receipt size={15} /> ➕ Registrar Gasto / Compra
              </button>
              <button onClick={() => setTab('tesoreria')} style={btn(C.surface, true)}>
                <Wallet size={15} /> Tesorería
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Grid de Tarjetas KPI (Financieras y Operativas) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Ingresos Totales */}
        <div style={{
          ...card(),
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(16, 185, 129, 0.08) 100%)`,
          border: `1px solid ${C.green}33`, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Ingresos Totales ({periodoFiltro === 'mes' ? 'Mes' : 'Total'})</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>Gs. {totalIngresos.toLocaleString('es-PY')}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowUpRight size={12} color={C.green} /> Cobros y entradas registradas
              </div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.green}18` }}>
              <TrendingUp size={22} color={C.green} />
            </div>
          </div>
        </div>

        {/* Egresos Totales */}
        <div style={{
          ...card(),
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(239, 68, 68, 0.08) 100%)`,
          border: `1px solid ${C.red}33`, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Egresos / Gastos Totales</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>Gs. {totalEgresos.toLocaleString('es-PY')}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowDownRight size={12} color={C.red} /> Gastos operativos y salidas
              </div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.red}18` }}>
              <TrendingDown size={22} color={C.red} />
            </div>
          </div>
        </div>

        {/* Balance Neto */}
        <div style={{
          ...card(),
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(59, 130, 246, 0.08) 100%)`,
          border: `1px solid ${C.primary}33`, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Balance Neto (Flujo)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: balanceNeto >= 0 ? C.primary : C.red }}>
                Gs. {balanceNeto.toLocaleString('es-PY')}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                Ingresos menos egresos
              </div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.primary}18` }}>
              <Wallet size={22} color={C.primary} />
            </div>
          </div>
        </div>

        {/* Pendiente de Cobro */}
        <div style={{
          ...card(),
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(245, 158, 11, 0.08) 100%)`,
          border: `1px solid ${C.yellow}33`, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Pendiente de Cobro</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.yellow }}>Gs. {cuotasPendientesGs.toLocaleString('es-PY')}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {cuotasPendientesCount} cuotas impagas
              </div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.yellow}18` }}>
              <Clock size={22} color={C.yellow} />
            </div>
          </div>
        </div>

        {/* Alumnos Activos */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Alumnos Activos</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{alumnosActivos}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>de {alumnos.length} inscritos en total</div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.green}18` }}>
              <Users size={22} color={C.green} />
            </div>
          </div>
        </div>

        {/* Inscripciones Activas */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Inscripciones Activas</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.purple }}>{inscripcionesActivas}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>en {sucursalesActivas} sucursales</div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.purple}18` }}>
              <BookOpen size={22} color={C.purple} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sección Central: Análisis Financiero + Cuentas de Tesorería ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        
        {/* Panel Izquierdo: Resumen de Rendimiento y Tasa de Cobranza */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color={C.primary} /> Resumen de Flujo & Cobranza
            </h3>
            <span style={badge(C.primary)}>{periodoFiltro === 'mes' ? 'Este Mes' : 'Histórico'}</span>
          </div>

          {/* Comparativo Ingresos vs Egresos */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: C.muted }}>Relación Ingresos / Egresos</span>
              <span style={{ fontWeight: 700, color: C.text }}>
                {totalIngresos + totalEgresos > 0 ? Math.round((totalEgresos / (totalIngresos + totalEgresos)) * 100) || 0 : 0}% egresos
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: C.bg, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${totalIngresos + totalEgresos > 0 ? (totalIngresos / (totalIngresos + totalEgresos)) * 100 : 100}%`, background: C.green, transition: 'width .3s' }} />
              <div style={{ width: `${totalIngresos + totalEgresos > 0 ? (totalEgresos / (totalIngresos + totalEgresos)) * 100 : 0}%`, background: C.red, transition: 'width .3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 6 }}>
              <span style={{ color: C.green, fontWeight: 600 }}>● Ingresos: Gs. {totalIngresos.toLocaleString('es-PY')}</span>
              <span style={{ color: C.red, fontWeight: 600 }}>● Egresos: Gs. {totalEgresos.toLocaleString('es-PY')}</span>
            </div>
          </div>

          {/* Progress bar de Cobranza */}
          <div style={{ padding: 14, borderRadius: 10, background: `${C.bg}`, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Tasa de Cobranza de Cuotas</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: tasaCobranza > 70 ? C.green : tasaCobranza > 40 ? C.yellow : C.red }}>
                {tasaCobranza}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: C.border, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                width: `${tasaCobranza}%`,
                background: tasaCobranza > 70 ? C.green : tasaCobranza > 40 ? C.yellow : C.red,
                height: '100%', borderRadius: 999, transition: 'width .4s'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted }}>
              <span>{cuotasPagadasCount} cuotas cobradas</span>
              <span>{cuotasPendientesCount} pendientes</span>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Saldos por Cuenta de Tesorería */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color={C.green} /> Cuentas & Tesorería
            </h3>
            {setTab && (
              <button onClick={() => setTab('tesoreria')} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Gestionar →
              </button>
            )}
          </div>

          {cuentas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <Building2 size={32} color={C.muted} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No tenés cuentas registradas</div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px' }}>Creá tu Caja Chica o Cuenta Bancaria para organizar tus cobros y saldos.</p>
              {setTab && (
                <button onClick={() => setTab('tesoreria')} style={btn(C.primary)}>
                  <Plus size={14} /> Crear primera cuenta
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
                {cuentas.map((c: any) => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ padding: 6, borderRadius: 6, background: c.tipo === 'banco' ? `${C.primary}20` : `${C.green}20` }}>
                        {c.tipo === 'banco' ? <Building2 size={16} color={C.primary} /> : <Wallet size={16} color={C.green} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.nombre}</div>
                        <div style={{ fontSize: 11, color: C.muted, textTransform: 'capitalize' }}>{c.tipo} {c.numero_cuenta ? `• ${c.numero_cuenta}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: c.saldo_actual >= 0 ? C.text : C.red }}>
                        Gs. {(c.saldo_actual || 0).toLocaleString('es-PY')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total acumulado */}
              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Saldo Total en Cuentas</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>Gs. {saldoTotalCuentas.toLocaleString('es-PY')}</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ─── Alerta de cuotas pendientes ─── */}
      {cuotasPendientesGs > 0 && (
        <div style={{
          ...card(), marginBottom: 24,
          border: `1px solid ${C.yellow}55`, background: `linear-gradient(90deg, ${C.yellow}12 0%, ${C.surface} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, borderRadius: 10, background: `${C.yellow}22` }}>
              <AlertCircle size={24} color={C.yellow} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.yellow }}>Cuotas pendientes por cobranza</div>
              <div style={{ color: C.muted, fontSize: 13 }}>
                Tenés <strong style={{ color: C.text }}>{cuotasPendientesCount} cuotas sin cobrar</strong> por un total de{' '}
                <strong style={{ color: C.yellow, fontSize: 14 }}>Gs. {cuotasPendientesGs.toLocaleString('es-PY')}</strong>.
              </div>
            </div>
          </div>
          {setTab && (
            <button onClick={() => setTab('cuotas')} style={btn(C.yellow)}>
              Ir a Cobranzas →
            </button>
          )}
        </div>
      )}

      {/* ─── Tabla con Sub-pestañas: Cuotas Recientes vs Movimientos de Caja ─── */}
      <div style={card()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setActiveSubView('cuotas')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: activeSubView === 'cuotas' ? `${C.primary}25` : 'transparent',
                color: activeSubView === 'cuotas' ? C.primary : C.muted,
                fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}>
              <CreditCard size={15} /> Últimas Cuotas ({cuotasRecientes.length})
            </button>
            <button
              onClick={() => setActiveSubView('movimientos')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: activeSubView === 'movimientos' ? `${C.primary}25` : 'transparent',
                color: activeSubView === 'movimientos' ? C.primary : C.muted,
                fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}>
              <Receipt size={15} /> Últimos Movimientos ({movsRecientes.length})
            </button>
          </div>

          {setTab && (
            <button onClick={() => setTab(activeSubView === 'cuotas' ? 'cuotas' : 'tesoreria')} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Ver todos →
            </button>
          )}
        </div>

        {activeSubView === 'cuotas' ? (
          cuotasRecientes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Alumno</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Período</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Monto</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuotasRecientes.map((q: any) => (
                    <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{q.alumno}</td>
                      <td style={{ padding: '10px 8px', color: C.muted }}>{q.periodo}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>Gs. {(q.monto_final || 0).toLocaleString('es-PY')}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={badge(q.estado === 'pagada' ? C.green : q.estado === 'pendiente' ? C.yellow : C.red)}>
                          {q.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted }}>No hay cuotas registradas.</div>
          )
        ) : (
          loadingMovs ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted }}>Cargando movimientos...</div>
          ) : movsRecientes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Fecha</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Concepto</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Cuenta</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movsRecientes.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                      <td style={{ padding: '10px 8px', color: C.muted }}>{m.fecha || '—'}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={badge(m.tipo === 'ingreso' ? C.green : C.red)}>
                          {m.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{m.concepto}</td>
                      <td style={{ padding: '10px 8px', color: C.muted }}>{m.cuenta_nombre}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: m.tipo === 'ingreso' ? C.green : C.red }}>
                        {m.tipo === 'ingreso' ? '+' : '-'} Gs. {(m.monto || 0).toLocaleString('es-PY')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted }}>No hay movimientos de caja registrados.</div>
          )
        )}
      </div>

      {/* ─── Aviso si no está configurada la página pública ─── */}
      {!perfil?.enlace_sitio && (
        <div style={{ ...card(), marginTop: 24, border: `1px solid ${C.primary}44`, background: `${C.primary}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LinkIcon size={22} color={C.primary} />
            <div>
              <div style={{ fontWeight: 700, color: C.primary, fontSize: 14 }}>Tu página pública aún no está configurada</div>
              <div style={{ color: C.muted, fontSize: 13 }}>
                Configurá tu enlace en la sección "Mi Academia" para que los alumnos encuentren tu academia en{' '}
                <strong>micancha.com.py/academia/TU-NOMBRE</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HorariosOficinaEditor({ perfil, notify, apiFetch }: any) {
  const [items, setItems] = useState<any[]>(perfil?.horarios_oficina || []);
  const [dia, setDia] = useState('Lunes');
  const [inicio, setInicio] = useState('17:00');
  const [fin, setFin] = useState('20:00');

  useEffect(() => {
    if (perfil?.horarios_oficina) {
      setItems(perfil.horarios_oficina);
    }
  }, [perfil]);

  const agregar = () => {
    const nuevo = { dia, hora_inicio: inicio, hora_fin: fin };
    const filtrados = items.filter(i => i.dia !== dia);
    const updated = [...filtrados, nuevo];
    setItems(updated);
    if (perfil) perfil.horarios_oficina = updated;
    guardar(updated);
  };

  const quitar = (diaQuitar: string) => {
    const updated = items.filter(i => i.dia !== diaQuitar);
    setItems(updated);
    if (perfil) perfil.horarios_oficina = updated;
    guardar(updated);
  };

  const guardar = async (lista: any[]) => {
    try {
      await apiFetch('/academia/horarios-oficina', {
        method: 'PUT',
        body: JSON.stringify({ horarios: lista }),
      });
      notify('Horarios de oficina guardados');
    } catch (e: any) { notify(e.message, 'err'); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <select value={dia} onChange={e => setDia(e.target.value)} style={input()}>
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input value={inicio} onChange={e => setInicio(e.target.value)} placeholder="17:00" style={input()} />
        <input value={fin} onChange={e => setFin(e.target.value)} placeholder="20:00" style={input()} />
        <button onClick={agregar} style={btn(C.primary)}><Plus size={14} /> Agregar</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(h => (
          <div key={h.dia} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{h.dia}</span>
            <span style={{ color: C.primary, fontWeight: 700, fontSize: 13 }}>{h.hora_inicio} a {h.hora_fin}</span>
            <button onClick={() => quitar(h.dia)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PERFIL (Mi Academia)
// ═══════════════════════════════════════════════════════════
function PerfilTab({ perfil, setPerfil, token, fileLogoRef, fileBannerRef, notify, apiFetch, isDueno, themeMode, toggleTheme }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // WhatsApp Gateway states
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [modalWaQr, setModalWaQr] = useState(false);
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [forzandoQr, setForzandoQr] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestSending, setWaTestSending] = useState(false);

  useEffect(() => { if (perfil) setForm({ ...perfil }); }, [perfil]);
  useEffect(() => { verificarEstadoWa(); }, []);

  const verificarEstadoWa = async () => {
    try {
      const res = await apiFetch('/academia/whatsapp/status');
      setWaConnected(res.connected === true);
    } catch {
      setWaConnected(false);
    }
  };

  const abrirModalQrWa = async () => {
    setWaLoading(true);
    setModalWaQr(true);
    try {
      const res = await apiFetch('/academia/whatsapp/qr');
      if (res.qr) {
        setWaQrCode(res.qr);
      } else {
        setWaQrCode(null);
        verificarEstadoWa();
      }
    } catch (e: any) {
      notify(e.message || 'Error al obtener código QR de WhatsApp', 'err');
    }
    setWaLoading(false);
  };

  const forzarNuevoQrWa = async () => {
    if (!confirm('¿Deseas desvincular la sesión actual de WhatsApp para generar un nuevo código QR?')) return;
    setForzandoQr(true);
    setWaLoading(true);
    setModalWaQr(true);
    setWaQrCode(null);
    try {
      await apiFetch('/academia/whatsapp/disconnect', { method: 'POST' });
      setWaConnected(false);
      const res = await apiFetch('/academia/whatsapp/qr');
      if (res.qr) {
        setWaQrCode(res.qr);
        notify('✅ Nuevo código QR generado. Escanealo con tu teléfono.', 'ok');
      } else {
        notify('Respuesta del servidor sin QR. Revisa la conexión.', 'err');
      }
    } catch (e: any) {
      notify(e.message || 'Error al reiniciar sesión de WhatsApp', 'err');
    }
    setWaLoading(false);
    setForzandoQr(false);
  };

  const enviarWaTest = async () => {
    if (!waTestPhone.trim()) { notify('Ingresá un número de teléfono', 'err'); return; }
    setWaTestSending(true);
    try {
      const res = await apiFetch('/academia/whatsapp/send-test', {
        method: 'POST',
        body: JSON.stringify({
          phone: waTestPhone.trim(),
          message: `✅ *Prueba de WhatsApp Bot — ${perfil?.nombre || 'Tu Academia'}*\n\n¡El bot de recordatorios está funcionando correctamente! 🎉\n\nEste mensaje fue enviado desde el panel de administración de micancha.com.py`
        })
      });
      notify('✅ Mensaje de prueba enviado por WhatsApp');
    } catch (e: any) {
      notify(e.message || 'Error al enviar mensaje de prueba', 'err');
    }
    setWaTestSending(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/academia/perfil', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setPerfil((p: any) => ({ ...p, ...form }));
      notify('Perfil guardado correctamente');
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const uploadFile = async (file: File, type: 'logo' | 'banner') => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/academia/perfil/${type}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error subiendo archivo');
    setForm((f: any) => ({ ...f, [`${type}_url`]: data.url }));
    notify(`${type === 'logo' ? 'Logo' : 'Banner'} actualizado`);
  };

  const field = (key: string, lbl: string, placeholder = '', multiline = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={label()}>{lbl}</label>
      {multiline
        ? <textarea value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} rows={4}
            style={{ ...input(), resize: 'vertical' }} />
        : <input value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} style={input()} />
      }
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Mi Academia</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Configurá tu página pública en{' '}
            <strong>micancha.com.py/academia/{form?.enlace_sitio || 'TU-ENLACE'}</strong>
          </p>
        </div>
        {isDueno && (
          <button onClick={save} disabled={saving} style={btn()}>
            <Save size={15} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Columna izquierda */}
        <div>
          <div style={card({ marginBottom: 16 })}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.primary }}>Información general</h3>
            {field('nombre', 'Nombre de la academia *', 'Academia Deportiva...')}
            {field('descripcion', 'Descripción corta', 'Breve descripción...')}
            {field('acerca_de', 'Acerca de', 'Historia, filosofía, misión...', true)}
            <div style={{ marginBottom: 16 }}>
              <label style={label()}>Enlace de página pública *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{
                  padding: '10px 12px', background: '#1e293b', border: `1px solid ${C.border}`,
                  borderRight: 'none', borderRadius: '9px 0 0 9px', color: C.faint, fontSize: 12, whiteSpace: 'nowrap',
                }}>
                  micancha.com.py/academia/
                </span>
                <input value={form.enlace_sitio || ''} onChange={e => setForm((f: any) => ({ ...f, enlace_sitio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  placeholder="mi-academia-fc" style={{ ...input(), borderRadius: '0 9px 9px 0', flex: 1 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label()}>Color primario</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="color" value={form.color_primario || '#1e3a8a'} onChange={e => setForm((f: any) => ({ ...f, color_primario: e.target.value }))}
                    style={{ width: 44, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                  <input value={form.color_primario || '#1e3a8a'} onChange={e => setForm((f: any) => ({ ...f, color_primario: e.target.value }))}
                    style={{ ...input(), flex: 1 }} />
                </div>
              </div>
            </div>

            {/* ── Apariencia y Tema del Panel ── */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <label style={label()}>Apariencia del Panel (Diseño visual)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => toggleTheme && toggleTheme('dark')}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: '#0f172a', border: themeMode === 'dark' ? `2px solid ${C.primary}` : '1px solid #334155',
                    color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 700, fontSize: 13, transition: 'all .15s'
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🌙 Tema Oscuro</span>
                  {themeMode === 'dark' && <Check size={16} color={C.primary} />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleTheme && toggleTheme('light')}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: '#ffffff', border: themeMode === 'light' ? `2px solid ${C.primary}` : '1px solid #cbd5e1',
                    color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 700, fontSize: 13, transition: 'all .15s'
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>☀️ Tema Claro</span>
                  {themeMode === 'light' && <Check size={16} color={C.primary} />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={!!form.canal_comunicacion_habilitado} 
                  onChange={e => setForm((f: any) => ({ ...f, canal_comunicacion_habilitado: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Habilitar canal de comunicación</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Muestra el buzón / chat público en tu portal de academia.</div>
                </div>
              </label>
            </div>
          </div>

          <div style={card({ marginTop: 16 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.primary }}>Horarios de Oficina</h3>
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 12 }}>
              Días y horarios de atención al cliente / oficina que aparecerán en tu página pública.
            </p>
            {isDueno && (
              <HorariosOficinaEditor perfil={perfil} notify={notify} apiFetch={apiFetch} />
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div>
          <div style={card({ marginBottom: 16 })}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.primary }}>Imagen de marca</h3>

            {/* Logo */}
            <div style={{ marginBottom: 16 }}>
              <label style={label()}>Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 12,
                  border: `2px dashed ${C.border}`, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0f172a',
                }}>
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <GraduationCap size={28} color={C.faint} />
                  }
                </div>
                {isDueno && (
                  <>
                    <button onClick={() => fileLogoRef.current?.click()} style={btn(C.primary, true)}>
                      <Upload size={14} /> Subir logo
                    </button>
                    <input ref={fileLogoRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'logo').catch(e => notify(e.message, 'err')); }} />
                  </>
                )}
              </div>
            </div>

            {/* Banner */}
            <div>
              <label style={label()}>Banner</label>
              <div style={{
                height: 120, borderRadius: 10, border: `2px dashed ${C.border}`,
                overflow: 'hidden', background: '#0f172a', marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {form.banner_url
                  ? <img src={form.banner_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ color: C.faint, fontSize: 12 }}>Sin banner</div>
                }
              </div>
              {isDueno && (
                <>
                  <button onClick={() => fileBannerRef.current?.click()} style={btn(C.primary, true)}>
                    <Upload size={14} /> Subir banner
                  </button>
                  <input ref={fileBannerRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'banner').catch(e => notify(e.message, 'err')); }} />
                </>
              )}
            </div>
          </div>

          <div style={card()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.primary }}>Contacto y redes</h3>
            {field('telefono', 'Teléfono', '0981-123-456')}
            {field('email', 'Email', 'info@academia.com')}
            {field('whatsapp', 'WhatsApp', '595981123456')}
            {field('instagram', 'Instagram', '@academia')}
            {field('facebook', 'Facebook', 'https://facebook.com/...')}
            {field('youtube', 'YouTube', 'https://youtube.com/@...')}
          </div>

          {/* ── Panel de Integración y Vinculación WhatsApp ── */}
          {isDueno && (
            <div style={{ ...card({ marginTop: 16 }), border: `1px solid ${C.purple}55`, background: `linear-gradient(135deg, ${C.surface} 0%, #1a0f2e 100%)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.purple}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} color={C.purple} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>WhatsApp Bot</h3>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Gateway automatizado para envío de recordatorios y avisos</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={badge(waConnected === true ? C.green : C.yellow)}>
                    {waConnected === true ? '🟢 Conectado' : waConnected === false ? '🔴 Desconectado' : '🟡 Verificando...'}
                  </span>
                  <button onClick={verificarEstadoWa} title="Refrescar estado" style={{ ...btn(C.faint, true), padding: '6px 8px' }}>
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              {/* Botones de acción del bot */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, background: `${C.bg}bb`, padding: 12, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <button onClick={abrirModalQrWa} style={btn(C.green, true)}>
                  <PhoneCall size={14} /> Vincular / Ver QR
                </button>
                <button onClick={forzarNuevoQrWa} disabled={forzandoQr} style={btn(C.yellow, true)}>
                  <RefreshCw size={14} /> Forzar Nuevo QR (Re-vincular)
                </button>
              </div>

              {/* Formulario de Mensaje de Prueba */}
              <div style={{ borderTop: `1px solid ${C.border}66`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Enviar mensaje de prueba</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={label()}>Número de WhatsApp (con 595)</label>
                    <input
                      type="tel"
                      placeholder="Ej: 595981123456"
                      value={waTestPhone}
                      onChange={e => setWaTestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      style={input()}
                    />
                  </div>
                  <button
                    onClick={enviarWaTest}
                    disabled={waTestSending}
                    style={{ ...btn(C.purple), padding: '10px 16px', flexShrink: 0 }}
                  >
                    <PhoneCall size={14} />
                    {waTestSending ? 'Enviando...' : 'Enviar prueba'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: QR WhatsApp Gateway ── */}
      {modalWaQr && (
        <Modal title="Vinculación de Bot WhatsApp (Evolution API)" onClose={() => setModalWaQr(null)}>
          <div style={{ textAlign: 'center', padding: 10 }}>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Escaneá este código QR desde tu teléfono WhatsApp (<strong>Dispositivos vinculados ➔ Vincular un dispositivo</strong>) para autorizar los envíos automáticos.
            </p>
            {waLoading ? (
              <div style={{ padding: 40, color: C.primary, fontSize: 14 }}>
                <RefreshCw size={24} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando o generando código QR...
              </div>
            ) : waQrCode ? (
              <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
                <img
                  src={waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`}
                  alt="Código QR WhatsApp"
                  style={{ width: 240, height: 240, display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ padding: 20, background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 6 }}>
                  ✓ WhatsApp ya se encuentra vinculado y listo
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  Tu número ya está conectado a la plataforma. Si necesitás vincular una cuenta distinta, usá el botón "Forzar Nuevo QR".
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={forzarNuevoQrWa} disabled={forzandoQr} style={btn(C.yellow, true)}>
                <RefreshCw size={13} /> Forzar Nuevo QR (Re-vincular)
              </button>
              <button onClick={verificarEstadoWa} style={btn(C.primary, true)}>
                Verificar Estado
              </button>
              <button onClick={() => setModalWaQr(null)} style={btn(C.faint, true)}>
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUCURSALES
// ═══════════════════════════════════════════════════════════
function SucursalesTab({ sucursales, setSucursales, deportes, modal, setModal, notify, apiFetch, isAdmin, isDueno, categorias, fetchAll }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    const firstSport = deportes[0] ? (typeof deportes[0] === 'object' ? deportes[0].nombre : deportes[0]) : '';
    setForm({ nombre: '', deporte: firstSport, ciudad: '', departamento: '', direccion: '', telefono: '', email: '' });
    setModal('new');
  };
  const openEdit = (s: any) => { setForm({ ...s }); setModal(s.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'new') {
        await apiFetch('/academia/sucursales', { method: 'POST', body: JSON.stringify(form) });
        notify('Sucursal creada exitosamente');
      } else {
        await apiFetch(`/academia/sucursales/${modal}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Sucursal actualizada');
      }
      await fetchAll();
      setModal(null);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    if (!confirm('¿Desactivar esta sucursal?')) return;
    try {
      await apiFetch(`/academia/sucursales/${id}`, { method: 'DELETE' });
      notify('Sucursal desactivada');
      await fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Sucursales</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Sedes de tu academia, cada una con su deporte</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} style={btn()}>
            <Plus size={15} /> Nueva sucursal
          </button>
        )}
      </div>

      {sucursales.length === 0 && (
        <div style={{ ...card(), textAlign: 'center', padding: 60 }}>
          <Building2 size={40} color={C.faint} style={{ marginBottom: 12 }} />
          <p style={{ color: C.muted }}>No hay sucursales creadas aún.</p>
          {isAdmin && <button onClick={openNew} style={{ ...btn(), marginTop: 10 }}><Plus size={14} /> Crear la primera sucursal</button>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {sucursales.map((s: any) => {
          const deporteNombre = typeof s.deporte === 'object' ? (s.deporte?.nombre || '') : (s.deporte || '');
          const dcolor = sportColors[deporteNombre] || C.primary;
          const cats = categorias.filter((c: any) => c.sucursal_id === s.id);
          return (
            <div key={s.id} style={{ ...card(), border: `1px solid ${dcolor}33`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={badge(dcolor)}>{deporteNombre}</span>
                {!s.activa && <span style={badge(C.faint)}>Inactiva</span>}
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{s.nombre}</h3>
              {(s.ciudad || s.departamento) && (
                <p style={{ margin: '0 0 4px', color: C.muted, fontSize: 13 }}>📍 {[s.ciudad, s.departamento].filter(Boolean).join(', ')}</p>
              )}
              {s.direccion && <p style={{ margin: '0 0 8px', color: C.faint, fontSize: 12 }}>{s.direccion}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: C.muted }}>
                <span>🏷 {cats.length} categoría{cats.length !== 1 ? 's' : ''}</span>
                <span>👥 {s.total_alumnos ?? 0} alumnos</span>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => openEdit(s)} style={{ ...btn(C.primary, true), fontSize: 12, padding: '6px 12px' }}>
                    <Pencil size={12} /> Editar
                  </button>
                  {isDueno && (
                    <button onClick={() => deactivate(s.id)} style={{ ...btn(C.red, true), fontSize: 12, padding: '6px 12px' }}>
                      <Trash2 size={12} /> Desactivar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal sucursal */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nueva Sucursal' : 'Editar Sucursal'} onClose={() => setModal(null)}>
          <FormField label="Nombre *" value={form.nombre} onChange={v => setForm((f: any) => ({ ...f, nombre: v }))} placeholder="Sede Central" />
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Deporte *</label>
            <select value={typeof form.deporte === 'object' ? form.deporte?.nombre || '' : form.deporte || ''} onChange={e => setForm((f: any) => ({ ...f, deporte: e.target.value }))}
              style={{ ...input() }}>
              {deportes.map((d: any) => {
                const name = typeof d === 'object' ? d.nombre : d;
                const key = typeof d === 'object' ? d.id || name : d;
                return <option key={key} value={name}>{name}</option>;
              })}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Ciudad" value={form.ciudad} onChange={v => setForm((f: any) => ({ ...f, ciudad: v }))} placeholder="Asunción" />
            <FormField label="Departamento" value={form.departamento} onChange={v => setForm((f: any) => ({ ...f, departamento: v }))} placeholder="Central" />
          </div>
          <FormField label="Dirección" value={form.direccion} onChange={v => setForm((f: any) => ({ ...f, direccion: v }))} placeholder="Av. España 1234" />
          <FormField label="Teléfono" value={form.telefono} onChange={v => setForm((f: any) => ({ ...f, telefono: v }))} placeholder="0981-123-456" />
          <FormField label="Email" value={form.email} onChange={v => setForm((f: any) => ({ ...f, email: v }))} placeholder="sede@academia.com" />
          <ModalActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ALUMNOS
// ═══════════════════════════════════════════════════════════
function AlumnosTab({ alumnos, setAlumnos, sucursales, tutores = [], categorias = [], inscripciones = [], modal, setModal, notify, apiFetch, isAdmin, fetchAll }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const fileFotoRef = useRef<HTMLInputElement>(null);

  // Selector de facturación (Alumno, Tutor, Tercero)
  const [tipoFacturacion, setTipoFacturacion] = useState<'alumno' | 'tutor' | 'tercero'>('alumno');
  const [tutorFacturacionId, setTutorFacturacionId] = useState('');

  // Modales adicionales requeridos
  const [modalCursos, setModalCursos] = useState<any>(null);
  const [modalEstadoCuenta, setModalEstadoCuenta] = useState<any>(null);
  const [estadoCuentaData, setEstadoCuentaData] = useState<any>(null);
  const [loadingEstadoCuenta, setLoadingEstadoCuenta] = useState(false);
  const [modalSuspension, setModalSuspension] = useState<any>(null);
  const [suspensionesAlumno, setSuspensionesAlumno] = useState<any[]>([]);
  const [suspensionForm, setSuspensionForm] = useState<any>({ fecha_inicio: '', fecha_fin_estimada: '', motivo: '' });
  const [savingSuspension, setSavingSuspension] = useState(false);

  const filtered = alumnos.filter((a: any) => {
    const matchesSearch = `${a.nombre} ${a.apellido}`.toLowerCase().includes(search.toLowerCase());
    const matchesEstado = !filtroEstado || a.estado === filtroEstado;
    return matchesSearch && matchesEstado;
  });

  const openNew = () => {
    setForm({ nombre: '', apellido: '', estado: 'activo', foto_perfil: '', facturacion_ruc: '', facturacion_nombre: '', facturacion_email: '' });
    setTipoFacturacion('alumno');
    setTutorFacturacionId('');
    setModal('new');
  };

  const openEdit = async (a: any) => {
    setForm({ ...a, facturacion_ruc: '', facturacion_nombre: '', facturacion_email: '' });
    setTipoFacturacion('alumno');
    setTutorFacturacionId('');
    setModal(a.id);
    try {
      const df = await apiFetch(`/academia/facturacion/datos-facturacion/alumno/${a.id}`).catch(() => null);
      if (df) {
        setForm((f: any) => ({
          ...f,
          facturacion_ruc: df.receptor_ruc ? (df.receptor_dv ? `${df.receptor_ruc}-${df.receptor_dv}` : df.receptor_ruc) : '',
          facturacion_nombre: df.receptor_nombre || '',
          facturacion_email: df.receptor_email || '',
        }));
        // Deducir si coincide con algún tutor
        const matchingTutor = tutores.find((t: any) =>
          (t.ci && df.receptor_ruc && t.ci.includes(df.receptor_ruc)) ||
          (t.email && df.receptor_email && t.email.toLowerCase() === df.receptor_email.toLowerCase())
        );
        if (matchingTutor) {
          setTipoFacturacion('tutor');
          setTutorFacturacionId(matchingTutor.id);
        } else if (df.receptor_nombre && df.receptor_nombre !== `${a.nombre} ${a.apellido || ''}`.trim()) {
          setTipoFacturacion('tercero');
        } else {
          setTipoFacturacion('alumno');
        }
      }
    } catch (err) {
      console.error('Error al cargar datos facturación alumno:', err);
    }
  };

  const handleTipoFacturacionChange = (tipo: 'alumno' | 'tutor' | 'tercero') => {
    setTipoFacturacion(tipo);
    if (tipo === 'alumno') {
      setForm((f: any) => ({
        ...f,
        facturacion_nombre: `${f.nombre || ''} ${f.apellido || ''}`.trim(),
      }));
    } else if (tipo === 'tutor' && tutorFacturacionId) {
      const t = tutores.find((tut: any) => tut.id === tutorFacturacionId);
      if (t) {
        setForm((f: any) => ({
          ...f,
          facturacion_nombre: `${t.nombre} ${t.apellido || ''}`.trim(),
          facturacion_ruc: t.ci || t.documento || '',
          facturacion_email: t.email || '',
        }));
      }
    }
  };

  const handleSelectTutorFacturacion = (tutorId: string) => {
    setTutorFacturacionId(tutorId);
    const t = tutores.find((tut: any) => tut.id === tutorId);
    if (t) {
      setForm((f: any) => ({
        ...f,
        facturacion_nombre: `${t.nombre} ${t.apellido || ''}`.trim(),
        facturacion_ruc: t.ci || t.documento || '',
        facturacion_email: t.email || '',
      }));
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (modal && modal !== 'new') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch(`/academia/alumnos/${modal}/foto`, {
          method: 'POST',
          body: formData,
        });
        if (res.url) {
          setForm((f: any) => ({ ...f, foto_perfil: res.url }));
          notify('Foto subida exitosamente');
          return;
        }
      } catch (err: any) {
        console.error('Error al subir foto directamente:', err);
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f: any) => ({ ...f, foto_perfil: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      let alumnoId = modal;
      if (modal === 'new') {
        const res = await apiFetch('/academia/alumnos', { method: 'POST', body: JSON.stringify(form) });
        alumnoId = res.id;
        notify('Alumno registrado');
      } else {
        await apiFetch(`/academia/alumnos/${modal}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Alumno actualizado');
      }

      if (form.facturacion_nombre || form.facturacion_ruc) {
        let ruc = form.facturacion_ruc ? form.facturacion_ruc.trim() : '0000000';
        let dv = undefined;
        if (ruc.includes('-')) {
          const parts = ruc.split('-');
          ruc = parts[0];
          dv = parts[1];
        }
        await apiFetch('/academia/facturacion/datos-facturacion', {
          method: 'POST',
          body: JSON.stringify({
            alumno_id: alumnoId,
            receptor_ruc: ruc,
            receptor_dv: dv,
            receptor_nombre: form.facturacion_nombre || `${form.nombre} ${form.apellido || ''}`.trim(),
            receptor_email: form.facturacion_email || null,
          }),
        }).catch(err => console.error('Error al guardar datos de facturación:', err));
      }

      await fetchAll();
      setModal(null);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  // Abrir Cursos del Alumno
  const abrirCursos = (a: any) => {
    setModalCursos(a);
  };

  // Abrir Estado de Cuenta Consolidado
  const abrirEstadoCuenta = async (a: any) => {
    setModalEstadoCuenta(a);
    setLoadingEstadoCuenta(true);
    try {
      const data = await apiFetch(`/academia/alumnos/${a.id}/estado-cuenta`);
      setEstadoCuentaData(data);
    } catch (err: any) {
      notify(err.message || 'Error al cargar estado de cuenta', 'err');
    } finally {
      setLoadingEstadoCuenta(false);
    }
  };

  // Abrir Modal de Baja Temporal / Suspensión
  const abrirSuspension = async (a: any) => {
    setModalSuspension(a);
    const hoyStr = new Date().toISOString().slice(0, 10);
    const fechaFinSug = new Date();
    fechaFinSug.setMonth(fechaFinSug.getMonth() + 2);
    setSuspensionForm({ fecha_inicio: hoyStr, fecha_fin_estimada: fechaFinSug.toISOString().slice(0, 10), motivo: '' });
    try {
      const list = await apiFetch(`/academia/alumnos/${a.id}/suspensiones`);
      setSuspensionesAlumno(Array.isArray(list) ? list : []);
    } catch {
      setSuspensionesAlumno([]);
    }
  };

  // Guardar Baja Temporal
  const registrarBajaTemporal = async () => {
    if (!modalSuspension) return;
    if (!suspensionForm.fecha_inicio) {
      notify('Ingresá la fecha de inicio de la suspensión', 'err');
      return;
    }
    setSavingSuspension(true);
    try {
      await apiFetch(`/academia/alumnos/${modalSuspension.id}/suspension`, {
        method: 'POST',
        body: JSON.stringify(suspensionForm),
      });
      notify('Baja temporal registrada exitosamente. El alumno no generará cuotas en los meses de suspensión.');
      await fetchAll();
      setModalSuspension(null);
    } catch (err: any) {
      notify(err.message || 'Error al registrar baja temporal', 'err');
    } finally {
      setSavingSuspension(false);
    }
  };

  // Reactivar Alumno Suspendido
  const reactivarAlumno = async (suspensionId: string) => {
    try {
      await apiFetch(`/academia/alumnos/suspensiones/${suspensionId}/reactivar`, {
        method: 'PUT',
      });
      notify('Alumno reactivado exitosamente');
      await fetchAll();
      setModalSuspension(null);
    } catch (err: any) {
      notify(err.message || 'Error al reactivar alumno', 'err');
    }
  };

  const estadoColor: Record<string, string> = {
    activo: C.green,
    inactivo: C.faint,
    prueba: C.yellow,
    suspendido: '#f97316',
    baja_temporal: '#f97316'
  };

  // Cursos del alumno activo
  const cursosDelAlumno = modalCursos
    ? inscripciones.filter((i: any) => i.alumno_id === modalCursos.id && i.estado === 'activa')
    : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Alumnos</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>{alumnos.length} alumnos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...input({ width: 170 }) }}>
            <option value="">Todos los estados</option>
            <option value="activo">Solo Activos</option>
            <option value="suspendido">En Baja Temporal</option>
            <option value="prueba">En Prueba</option>
            <option value="inactivo">Inactivos</option>
          </select>
          {isAdmin && <button onClick={openNew} style={btn()}><Plus size={15} /> Nuevo alumno</button>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar alumno por nombre o apellido..." style={input({ maxWidth: 360 })} />
      </div>

      <div style={card({ padding: 0 })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Alumno', 'Sucursal', 'Edad', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.faint }}>No hay alumnos registrados con ese filtro.</td></tr>
            )}
            {filtered.map((a: any) => {
              const edad = a.fecha_nacimiento ? Math.floor((Date.now() - new Date(a.fecha_nacimiento).getTime()) / 31557600000) : null;
              const isSuspendido = a.estado === 'suspendido' || a.estado === 'baja_temporal';
              return (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', background: C.border, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: `1px solid ${C.border}`
                      }}>
                        {a.foto_perfil ? <img src={a.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={20} color={C.muted} />}
                      </div>
                      <div>
                        <div>{a.nombre} {a.apellido}</div>
                        {isSuspendido && <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700 }}>⏸️ Baja Temporal Activa</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', color: C.muted }}>{a.sucursal_nombre || '—'}</td>
                  <td style={{ padding: '11px 16px', color: C.muted }}>{edad != null ? `${edad} años` : '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={badge(estadoColor[a.estado] || C.faint)}>
                      {isSuspendido ? 'Baja Temporal' : a.estado}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isAdmin && (
                        <button onClick={() => openEdit(a)} style={{ ...btn(C.primary, true), fontSize: 11, padding: '5px 9px' }} title="Editar Alumno">
                          <Pencil size={11} /> Editar
                        </button>
                      )}
                      <button onClick={() => abrirCursos(a)} style={{ ...btn(C.purple, true), fontSize: 11, padding: '5px 9px' }} title="Ver cursos que toma">
                        <BookOpen size={11} /> Cursos
                      </button>
                      <button onClick={() => abrirEstadoCuenta(a)} style={{ ...btn(C.green, true), fontSize: 11, padding: '5px 9px' }} title="Consultar Estado de Cuenta">
                        <Receipt size={11} /> Estado de Cuenta
                      </button>
                      <button onClick={() => abrirSuspension(a)} style={{ ...btn(isSuspendido ? '#f97316' : C.faint, true), fontSize: 11, padding: '5px 9px' }} title="Dar de baja temporal por unos meses">
                        <PauseCircle size={11} /> {isSuspendido ? 'En Baja' : 'Baja Temporal'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════ MODAL ALUMNO (Creación / Edición) ════ */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo Alumno' : 'Editar Alumno'} onClose={() => setModal(null)} wide>
          {/* Subida de foto de perfil */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, background: `${C.bg}88`, padding: 14, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: C.border, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.primary}`, flexShrink: 0
            }}>
              {form.foto_perfil ? <img src={form.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={32} color={C.muted} />}
            </div>
            <div>
              <label style={{ ...label(), marginBottom: 4 }}>Foto para Carnet / Perfil</label>
              <input type="file" ref={fileFotoRef} accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => fileFotoRef.current?.click()} style={btn(C.primary, true)}>
                  <Upload size={13} /> Subir Foto
                </button>
                {form.foto_perfil && (
                  <button type="button" onClick={() => setForm((f: any) => ({ ...f, foto_perfil: '' }))} style={btn(C.red, true)}>
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Nombre *" value={form.nombre} onChange={v => setForm((f: any) => ({ ...f, nombre: v }))} placeholder="Juan" />
            <FormField label="Apellido" value={form.apellido} onChange={v => setForm((f: any) => ({ ...f, apellido: v }))} placeholder="Pérez" />
          </div>
          <FormField label="Fecha de nacimiento" value={form.fecha_nacimiento || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_nacimiento: v }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Sucursal</label>
            <select value={form.sucursal_id || ''} onChange={e => setForm((f: any) => ({ ...f, sucursal_id: e.target.value }))} style={input()}>
              <option value="">Sin asignar</option>
              {sucursales.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} — {s.deporte}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Estado</label>
            <select value={form.estado || 'activo'} onChange={e => setForm((f: any) => ({ ...f, estado: e.target.value }))} style={input()}>
              <option value="activo">Activo</option>
              <option value="prueba">En prueba</option>
              <option value="suspendido">Baja Temporal / Suspendido</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '12px 0' }} />
          <p style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 10 }}>FICHA MÉDICA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tipo de sangre" value={form.tipo_sangre} onChange={v => setForm((f: any) => ({ ...f, tipo_sangre: v }))} placeholder="O+" />
            <FormField label="Seguro médico" value={form.seguro_medico} onChange={v => setForm((f: any) => ({ ...f, seguro_medico: v }))} placeholder="IPS / Seguro Privado" />
          </div>
          <FormField label="Alergias" value={form.alergias} onChange={v => setForm((f: any) => ({ ...f, alergias: v }))} placeholder="Ninguna conocida" />
          <FormField label="Condiciones médicas" value={form.condiciones_medicas} onChange={v => setForm((f: any) => ({ ...f, condiciones_medicas: v }))} placeholder="Asma, diabetes, etc." />
          <FormField label="Contacto de emergencia" value={form.contacto_emergencia} onChange={v => setForm((f: any) => ({ ...f, contacto_emergencia: v }))} placeholder="Mamá: 0981-123-456" />

          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />

          {/* DATOS DE FACTURACIÓN CON SELECTOR EXPLICITO: ALUMNO / PAPA/MAMA / TERCERO */}
          <div style={{ background: `${C.bg}88`, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 13, color: C.yellow, fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} /> DATOS PARA FACTURACIÓN ELECTRÓNICA SIFEN
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px' }}>
              ¿A nombre de quién debe emitirse la factura de las cuotas y uniformes?
            </p>

            {/* Botones selectores de tipo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'alumno', label: '👤 Alumno' },
                { id: 'tutor', label: '👨‍👩‍👦 Papá / Mamá (Tutor)' },
                { id: 'tercero', label: '🏢 Otro / RUC particular' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTipoFacturacionChange(t.id as any)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all .15s',
                    background: tipoFacturacion === t.id ? `${C.primary}25` : 'transparent',
                    border: `1px solid ${tipoFacturacion === t.id ? C.primary : C.border}`,
                    color: tipoFacturacion === t.id ? C.primary : C.muted,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dropdown de tutores si se seleccionó Papá/Mamá */}
            {tipoFacturacion === 'tutor' && (
              <div style={{ marginBottom: 12 }}>
                <label style={label()}>Seleccionar Tutor / Padre *</label>
                {tutores.length > 0 ? (
                  <select
                    value={tutorFacturacionId}
                    onChange={e => handleSelectTutorFacturacion(e.target.value)}
                    style={input()}
                  >
                    <option value="">— Elegir tutor registrado —</option>
                    {tutores.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.apellido || ''} {t.ci ? `(CI: ${t.ci})` : ''} {t.email ? `— ${t.email}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: C.yellow, padding: 8, borderRadius: 6, background: `${C.yellow}15` }}>
                    ⚠️ No hay tutores registrados aún en la academia. Podés escribir los datos manualmente abajo.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField
                label="RUC o C.I. (con DV si aplica)"
                value={form.facturacion_ruc || ''}
                onChange={v => setForm((f: any) => ({ ...f, facturacion_ruc: v }))}
                placeholder="Ej: 1234567-8"
              />
              <FormField
                label="Razón Social / Nombre en Factura"
                value={form.facturacion_nombre || ''}
                onChange={v => setForm((f: any) => ({ ...f, facturacion_nombre: v }))}
                placeholder="Ej: Juan Pérez o María González"
              />
            </div>
            <FormField
              label="Email para envío de Factura Electrónica SIFEN"
              value={form.facturacion_email || ''}
              onChange={v => setForm((f: any) => ({ ...f, facturacion_email: v }))}
              placeholder="facturas@email.com"
            />
          </div>

          <ModalActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}

      {/* ════ MODAL: CURSOS QUE TOMA EL ALUMNO ════ */}
      {modalCursos && (
        <Modal title={`Cursos de ${modalCursos.nombre} ${modalCursos.apellido}`} onClose={() => setModalCursos(null)} wide>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Cursos y categorías en las que este alumno se encuentra formalmente inscripto:
            </p>
          </div>

          {cursosDelAlumno.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: C.faint, background: `${C.bg}88`, borderRadius: 10 }}>
              <BookOpen size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>El alumno no está inscripto en ningún curso activo.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cursosDelAlumno.map((i: any) => {
                const catObj = categorias.find((c: any) => c.id === i.categoria_id);
                return (
                  <div key={i.id} style={{
                    background: `${C.bg}bb`, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚽</span> {i.categoria || catObj?.nombre || 'Curso'}
                        <span style={badge(C.green)}>Activo</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        {i.sucursal || catObj?.sucursal_nombre} · {i.deporte || catObj?.deporte}
                      </div>
                      {catObj?.horario && (
                        <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
                          ⏰ Horarios: {catObj.horario}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Cuota Mensual</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>
                        Gs. {(i.cuota_mensual || 0).toLocaleString('es-PY')}
                      </div>
                      {i.descuento_aplicado > 0 && (
                        <div style={{ fontSize: 11, color: C.green }}>-{i.descuento_aplicado}% desc.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setModalCursos(null)} style={btn(C.primary)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {/* ════ MODAL: ESTADO DE CUENTA CONSOLIDADO ════ */}
      {modalEstadoCuenta && (
        <Modal title={`Estado de Cuenta — ${modalEstadoCuenta.nombre} ${modalEstadoCuenta.apellido}`} onClose={() => setModalEstadoCuenta(null)} wide>
          {loadingEstadoCuenta ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <p>Generando extracto financiero consolidado...</p>
            </div>
          ) : estadoCuentaData ? (
            <div>
              {/* Tarjetas Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                <div style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>TOTAL CARGOS</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 4 }}>
                    Gs. {(estadoCuentaData.resumen?.total_cargos || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>TOTAL PAGADO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.green, marginTop: 4 }}>
                    Gs. {(estadoCuentaData.resumen?.total_pagado || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                <div style={{ background: `${estadoCuentaData.resumen?.saldo_deudor > 0 ? C.red : C.green}15`, border: `1px solid ${estadoCuentaData.resumen?.saldo_deudor > 0 ? C.red : C.green}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>SALDO PENDIENTE</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: estadoCuentaData.resumen?.saldo_deudor > 0 ? C.red : C.green, marginTop: 4 }}>
                    Gs. {(estadoCuentaData.resumen?.saldo_deudor || 0).toLocaleString('es-PY')}
                  </div>
                </div>
              </div>

              {/* Detalle de Cuotas */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: C.text, fontWeight: 800 }}>CUOTAS MENSUALES</h4>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: `${C.bg}aa`, borderBottom: `1px solid ${C.border}` }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Período</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Monto</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Pagado</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Saldo</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(estadoCuentaData.cuotas || []).length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: C.faint }}>No registra cuotas.</td></tr>
                      ) : (
                        estadoCuentaData.cuotas.map((c: any) => (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{c.periodo}</td>
                            <td style={{ padding: '7px 10px' }}>Gs. {(c.monto_final || 0).toLocaleString('es-PY')}</td>
                            <td style={{ padding: '7px 10px', color: C.green }}>Gs. {(c.monto_pagado || 0).toLocaleString('es-PY')}</td>
                            <td style={{ padding: '7px 10px', color: c.saldo > 0 ? C.red : C.muted, fontWeight: c.saldo > 0 ? 700 : 400 }}>
                              Gs. {(c.saldo || 0).toLocaleString('es-PY')}
                            </td>
                            <td style={{ padding: '7px 10px' }}><span style={badge(estadoColor[c.estado] || C.faint)}>{c.estado}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detalle de Compras de Uniformes / Accesorios */}
              {estadoCuentaData.compras_productos && estadoCuentaData.compras_productos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, color: C.text, fontWeight: 800 }}>UNIFORMES Y ACCESORIOS ADQUIRIDOS</h4>
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: `${C.bg}aa`, borderBottom: `1px solid ${C.border}` }}>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Artículo</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Cant.</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Total</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Fecha</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted }}>Entrega</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadoCuentaData.compras_productos.map((cp: any) => (
                          <tr key={cp.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{cp.producto_nombre}</td>
                            <td style={{ padding: '7px 10px' }}>{cp.cantidad}</td>
                            <td style={{ padding: '7px 10px' }}>Gs. {(cp.precio_total || 0).toLocaleString('es-PY')}</td>
                            <td style={{ padding: '7px 10px', color: C.muted }}>{cp.fecha_venta?.slice(0, 10)}</td>
                            <td style={{ padding: '7px 10px' }}>
                              <span style={badge(cp.entregado ? C.green : C.yellow)}>{cp.entregado ? 'Entregado' : 'Pendiente'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botones de acción del extracto */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button
                  onClick={() => window.print()}
                  style={{ ...btn(C.purple, true), display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={15} /> Imprimir Estado de Cuenta
                </button>
                <button onClick={() => setModalEstadoCuenta(null)} style={btn(C.primary)}>
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: C.muted }}>No se pudo obtener el estado de cuenta.</div>
          )}
        </Modal>
      )}

      {/* ════ MODAL: BAJA TEMPORAL / SUSPENSIÓN ════ */}
      {modalSuspension && (
        <Modal title={`Baja Temporal — ${modalSuspension.nombre} ${modalSuspension.apellido}`} onClose={() => setModalSuspension(null)}>
          <div style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.yellow, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} /> Suspensión Temporal por unos meses
            </div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4, lineHeight: 1.4 }}>
              Durante el lapso de baja temporal, el alumno <strong>no generará cuotas mensuales</strong> en los procesos de facturación automática mensual.
            </div>
          </div>

          {/* Suspensiones activas o históricas */}
          {suspensionesAlumno.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>HISTORIAL DE SUSPENSIONES:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suspensionesAlumno.map((s: any) => (
                  <div key={s.id} style={{ background: `${C.bg}bb`, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>Desde {s.fecha_inicio} {s.fecha_fin_estimada ? `hasta ${s.fecha_fin_estimada}` : '(indefinida)'}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Motivo: {s.motivo || 'No especificado'}</div>
                    </div>
                    <div>
                      {s.activa ? (
                        <button
                          onClick={() => reactivarAlumno(s.id)}
                          style={{ ...btn(C.green), fontSize: 11, padding: '4px 8px' }}
                        >
                          <PlayCircle size={12} /> Reactivar Alumno
                        </button>
                      ) : (
                        <span style={badge(C.faint)}>Finalizada</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario para registrar nueva baja temporal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Fecha de Inicio *" type="date" value={suspensionForm.fecha_inicio} onChange={v => setSuspensionForm((f: any) => ({ ...f, fecha_inicio: v }))} />
            <FormField label="Fecha de Fin Estimada" type="date" value={suspensionForm.fecha_fin_estimada} onChange={v => setSuspensionForm((f: any) => ({ ...f, fecha_fin_estimada: v }))} />
          </div>
          <FormField
            label="Motivo de la Baja Temporal"
            value={suspensionForm.motivo}
            onChange={v => setSuspensionForm((f: any) => ({ ...f, motivo: v }))}
            placeholder="Ej: Viaje familiar por 3 meses, lesión médica, receso escolar..."
          />

          <ModalActions
            onCancel={() => setModalSuspension(null)}
            onSave={registrarBajaTemporal}
            saving={savingSuspension}
            saveLabel="Confirmar Baja Temporal"
          />
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// INSCRIPCIONES
// ═══════════════════════════════════════════════════════════
function InscripcionesTab({ inscripciones, alumnos, categorias, modal, setModal, notify, apiFetch, isAdmin, isTesorero, fetchAll }: any) {
  const [form, setForm] = useState<any>({ dias_por_semana: 3, cuota_mensual: 0, descuento_aplicado: 0, beca: false, fecha_inicio: '', fecha_fin: '', notas: '', estado: 'activa' });
  const [modoMultiple, setModoMultiple] = useState(false);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroVigencia, setFiltroVigencia] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredInscripciones = inscripciones.filter((i: any) => {
    const matchesCat = !filtroCategoria || i.categoria_id === filtroCategoria;
    const matchesBusqueda = !busqueda ||
      (i.alumno_nombre && i.alumno_nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (i.categoria && i.categoria.toLowerCase().includes(busqueda.toLowerCase()));

    const esVigente = (i.sigue_inscripto !== undefined ? i.sigue_inscripto : (i.estado === 'activa' && (!i.fecha_fin || i.fecha_fin >= todayStr)));
    const esFinalizada = i.estado === 'finalizada' || (i.fecha_fin && i.fecha_fin < todayStr);
    const esSuspendida = i.estado === 'suspendida';

    let matchesVigencia = true;
    if (filtroVigencia === 'vigentes') matchesVigencia = esVigente;
    else if (filtroVigencia === 'finalizadas') matchesVigencia = esFinalizada;
    else if (filtroVigencia === 'suspendidas') matchesVigencia = esSuspendida;

    return matchesCat && matchesBusqueda && matchesVigencia;
  });

  const toggleCategoriaMultiple = (catId: string) => {
    setCategoriasSeleccionadas(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const abrirNuevo = () => {
    setForm({
      dias_por_semana: 3,
      cuota_mensual: 0,
      descuento_aplicado: 0,
      beca: false,
      fecha_inicio: todayStr,
      fecha_fin: '',
      notas: '',
      estado: 'activa'
    });
    setModoMultiple(false);
    setCategoriasSeleccionadas([]);
    setModal('new');
  };

  const abrirEditar = (i: any) => {
    setForm({
      id: i.id,
      alumno_id: i.alumno_id,
      alumno_nombre: i.alumno_nombre,
      categoria_id: i.categoria_id,
      fecha_inicio: i.fecha_inicio || '',
      fecha_fin: i.fecha_fin || '',
      dias_por_semana: i.dias_por_semana || 3,
      cuota_mensual: i.cuota_mensual || 0,
      descuento_aplicado: i.descuento_aplicado || 0,
      beca: Boolean(i.beca),
      notas: i.notas || '',
      estado: i.estado || 'activa',
    });
    setModoMultiple(false);
    setModal('edit');
  };

  const finalizarInscripcion = async (i: any) => {
    if (!confirm(`¿Finalizar el período de inscripción de ${i.alumno_nombre} en ${i.categoria}?`)) return;
    try {
      await apiFetch(`/academia/inscripciones/${i.id}`, { method: 'DELETE' });
      notify('Período de inscripción finalizado');
      await fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const save = async () => {
    if (modal === 'edit') {
      if (!form.id) return;
      setSaving(true);
      try {
        await apiFetch(`/academia/inscripciones/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            alumno_id: form.alumno_id,
            categoria_id: form.categoria_id,
            fecha_inicio: form.fecha_inicio || undefined,
            fecha_fin: form.fecha_fin ? form.fecha_fin : null,
            cuota_mensual: Number(form.cuota_mensual || 0),
            dias_por_semana: Number(form.dias_por_semana || 3),
            descuento_aplicado: Number(form.descuento_aplicado || 0),
            beca: Boolean(form.beca),
            notas: form.notas || null,
            estado: form.estado || 'activa',
          })
        });
        notify('Inscripción actualizada correctamente');
        await fetchAll();
        setModal(null);
      } catch (e: any) {
        notify(e.message, 'err');
      }
      setSaving(false);
      return;
    }

    if (!form.alumno_id) {
      notify('Seleccioná un alumno', 'err');
      return;
    }

    setSaving(true);
    try {
      if (modoMultiple) {
        if (categoriasSeleccionadas.length === 0) {
          notify('Seleccioná al menos un curso o categoría', 'err');
          setSaving(false);
          return;
        }
        const res = await apiFetch('/academia/inscripciones/multiples', {
          method: 'POST',
          body: JSON.stringify({
            alumno_id: form.alumno_id,
            categoria_ids: categoriasSeleccionadas,
            fecha_inicio: form.fecha_inicio || undefined,
            fecha_fin: form.fecha_fin ? form.fecha_fin : null,
            cuota_mensual: form.cuota_mensual ? Number(form.cuota_mensual) : undefined,
            descuento_aplicado: form.descuento_aplicado ? Number(form.descuento_aplicado) : undefined,
            beca: Boolean(form.beca),
            notas: form.notas || undefined,
          })
        });
        notify(res.message || 'Inscripción múltiple realizada exitosamente');
      } else {
        if (!form.categoria_id) {
          notify('Seleccioná una categoría', 'err');
          setSaving(false);
          return;
        }
        await apiFetch('/academia/inscripciones', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            fecha_fin: form.fecha_fin ? form.fecha_fin : null,
          })
        });
        notify('Alumno inscripto correctamente');
      }

      await fetchAll();
      setModal(null);
      setCategoriasSeleccionadas([]);
      setModoMultiple(false);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const cantVigentes = inscripciones.filter((i: any) => i.sigue_inscripto || (i.estado === 'activa' && (!i.fecha_fin || i.fecha_fin >= todayStr))).length;
  const cantFinalizadas = inscripciones.filter((i: any) => i.estado === 'finalizada' || (i.fecha_fin && i.fecha_fin < todayStr)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Inscripciones</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span><strong style={{ color: C.green }}>🟢 {cantVigentes}</strong> alumnos que siguen inscriptos (vigentes)</span>
            {cantFinalizadas > 0 && <span style={{ color: C.muted }}>· ⏳ {cantFinalizadas} períodos concluidos</span>}
          </p>
        </div>
        {(isAdmin || isTesorero) && (
          <button onClick={abrirNuevo} style={btn()}>
            <Plus size={15} /> Inscribir alumno
          </button>
        )}
      </div>

      {/* Barra de Filtros y Consulta de Alumnos por Curso */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por alumno o curso..."
          style={input({ maxWidth: 260 })}
        />

        {/* Consulta Alumnos por Curso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...label({ marginBottom: 0 }), fontSize: 12 }}>Curso:</label>
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ ...input({ width: 220 }), fontWeight: filtroCategoria ? 700 : 400 }}
          >
            <option value="">Todos los Cursos / Categorías</option>
            {categorias.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.modalidad_nombre ? `[${c.modalidad_nombre}]` : ''} {c.deporte ? `(${c.deporte})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Vigencia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...label({ marginBottom: 0 }), fontSize: 12 }}>Vigencia:</label>
          <select
            value={filtroVigencia}
            onChange={e => setFiltroVigencia(e.target.value)}
            style={{ ...input({ width: 210 }), fontWeight: filtroVigencia !== 'todas' ? 700 : 400 }}
          >
            <option value="todas">📋 Todas ({inscripciones.length})</option>
            <option value="vigentes">🟢 Sigue inscripto ({cantVigentes})</option>
            <option value="finalizadas">⏳ Períodos finalizados ({cantFinalizadas})</option>
            <option value="suspendidas">⚠️ Suspendidas ({inscripciones.filter((i: any) => i.estado === 'suspendida').length})</option>
          </select>
        </div>

        {filtroCategoria && (
          <div style={{ fontSize: 12, color: C.green, fontWeight: 700, background: `${C.green}18`, padding: '6px 12px', borderRadius: 8 }}>
            👥 {filteredInscripciones.length} alumnos inscriptos en este curso
          </div>
        )}
      </div>

      <div style={card({ padding: 0 })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Alumno', 'Categoría / Modalidad', 'Período de Inscripción', 'Vigencia', 'Cuota mensual', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredInscripciones.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.faint }}>No hay inscripciones para este filtro o búsqueda.</td></tr>
            )}
            {filteredInscripciones.map((i: any) => {
              const esVigente = (i.sigue_inscripto !== undefined ? i.sigue_inscripto : (i.estado === 'activa' && (!i.fecha_fin || i.fecha_fin >= todayStr)));
              const esFinalizada = i.estado === 'finalizada' || (i.fecha_fin && i.fecha_fin < todayStr);
              const esSuspendida = i.estado === 'suspendida';

              return (
                <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}44`, opacity: esFinalizada ? 0.78 : 1 }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <div>{i.alumno_nombre}</div>
                    {i.beca && <span style={{ ...badge(C.purple), fontSize: 10, marginTop: 4, display: 'inline-block' }}>Beca 100%</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{i.categoria}</span>
                      {i.modalidad_nombre && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${i.modalidad_color || C.purple}22`, color: i.modalidad_color || C.purple }}>
                          {i.modalidad_nombre}
                        </span>
                      )}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{i.sucursal} · {i.deporte}</div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.text }}>
                      <span style={{ color: C.muted, fontSize: 11 }}>Desde:</span>
                      <strong>{i.fecha_inicio || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span style={{ color: C.muted, fontSize: 11 }}>Hasta:</span>
                      {i.fecha_fin ? (
                        <span style={{ color: esFinalizada ? C.red : C.text, fontWeight: 600 }}>{i.fecha_fin}</span>
                      ) : (
                        <span style={{ color: C.green, fontWeight: 600 }}>Indefinido</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {esVigente ? (
                      <span style={badge(C.green)}>🟢 Sigue inscripto</span>
                    ) : esSuspendida ? (
                      <span style={badge(C.yellow)}>⚠️ Suspendida</span>
                    ) : (
                      <span style={badge(C.faint)}>⏳ Período finalizado</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div>Gs. {(i.cuota_mensual || 0).toLocaleString('es-PY')}</div>
                    {i.descuento_aplicado > 0 && (
                      <div style={{ color: C.green, fontSize: 11 }}>-{i.descuento_aplicado}% desc.</div>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(isAdmin || isTesorero) && (
                        <button
                          onClick={() => abrirEditar(i)}
                          title="Editar inscripción y período"
                          style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {isAdmin && esVigente && (
                        <button
                          onClick={() => finalizarInscripcion(i)}
                          title="Finalizar este período de inscripción"
                          style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: `${C.red}15`, color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════ MODAL CREAR / EDITAR INSCRIPCIÓN ════ */}
      {modal === 'new' && (
        <Modal title="Inscribir Alumno a Cursos" onClose={() => setModal(null)} wide>
          {/* Selector de Modo: Simple o Varios Cursos */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, background: `${C.bg}88`, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => setModoMultiple(false)}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: !modoMultiple ? C.primary : 'transparent',
                color: !modoMultiple ? '#fff' : C.muted
              }}
            >
              1️⃣ Inscripción Individual (1 Curso)
            </button>
            <button
              type="button"
              onClick={() => setModoMultiple(true)}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: modoMultiple ? C.primary : 'transparent',
                color: modoMultiple ? '#fff' : C.muted
              }}
            >
              📚 Inscripción Múltiple (Varios Cursos a la vez)
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Alumno *</label>
            <select value={form.alumno_id || ''} onChange={e => setForm((f: any) => ({ ...f, alumno_id: e.target.value }))} style={input()}>
              <option value="">Seleccionar alumno...</option>
              {alumnos.map((a: any) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
            </select>
          </div>

          {!modoMultiple ? (
            /* Modo 1 Curso */
            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Categoría / Curso *</label>
              <select value={form.categoria_id || ''} onChange={e => setForm((f: any) => ({ ...f, categoria_id: e.target.value }))} style={input()}>
                <option value="">Seleccionar categoría...</option>
                {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} {c.modalidad_nombre ? `[${c.modalidad_nombre}] ` : ''}— {c.sucursal_nombre} {c.deporte ? `(${c.deporte})` : ''}</option>)}
              </select>
            </div>
          ) : (
            /* Modo Múltiples Cursos */
            <div style={{ marginBottom: 16 }}>
              <label style={label()}>Seleccioná todos los cursos a los que se inscribe simultáneamente *</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categorias.map((c: any) => {
                  const isChecked = categoriasSeleccionadas.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCategoriaMultiple(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 8, cursor: 'pointer',
                        background: isChecked ? `${C.primary}20` : 'transparent',
                        border: `1px solid ${isChecked ? C.primary : 'transparent'}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                          {c.nombre} {c.modalidad_nombre && <span style={{ color: C.purple, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>[{c.modalidad_nombre}]</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.sucursal_nombre} · {c.deporte} {c.horario ? `· ⏰ ${c.horario}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>
                        Gs. {(c.cuota_mensual || 0).toLocaleString('es-PY')}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                {categoriasSeleccionadas.length} cursos seleccionados
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FormField label="Fecha de inicio *" value={form.fecha_inicio || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_inicio: v }))} />
            <div>
              <FormField label="Fecha de fin (opcional)" value={form.fecha_fin || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_fin: v }))} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 10 }}>
                💡 Dejar vacío si el alumno continúa inscripto (sigue inscripto).
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: modoMultiple ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Cuota mensual (Gs.) (0 = usar tarifa del curso)" value={form.cuota_mensual} type="number" onChange={v => setForm((f: any) => ({ ...f, cuota_mensual: Number(v) }))} />
            {!modoMultiple && (
              <FormField label="Días por semana" value={form.dias_por_semana} type="number" onChange={v => setForm((f: any) => ({ ...f, dias_por_semana: Number(v) }))} />
            )}
            <FormField label="Descuento aplicado (%)" value={form.descuento_aplicado} type="number" onChange={v => setForm((f: any) => ({ ...f, descuento_aplicado: Number(v) }))} />
          </div>

          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="beca" checked={form.beca} onChange={e => setForm((f: any) => ({ ...f, beca: e.target.checked }))} />
            <label htmlFor="beca" style={{ color: C.text, fontSize: 13, cursor: 'pointer' }}>Beca completa (cuota Gs. 0)</label>
          </div>

          <ModalActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal title={`Editar Inscripción — ${form.alumno_nombre || ''}`} onClose={() => setModal(null)} wide>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Categoría / Curso</label>
            <select value={form.categoria_id || ''} onChange={e => setForm((f: any) => ({ ...f, categoria_id: e.target.value }))} style={input()}>
              {categorias.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.modalidad_nombre ? `[${c.modalidad_nombre}] ` : ''}— {c.sucursal_nombre} {c.deporte ? `(${c.deporte})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FormField label="Fecha de inicio *" value={form.fecha_inicio || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_inicio: v }))} />
            <div>
              <FormField label="Fecha de fin (opcional)" value={form.fecha_fin || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_fin: v }))} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 10 }}>
                💡 Dejar vacío si el alumno continúa inscripto (sigue inscripto).
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Estado de la inscripción</label>
            <select value={form.estado || 'activa'} onChange={e => setForm((f: any) => ({ ...f, estado: e.target.value }))} style={input()}>
              <option value="activa">🟢 Activa (Vigente)</option>
              <option value="suspendida">⚠️ Suspendida (Baja temporal)</option>
              <option value="finalizada">⏹️ Finalizada (Período concluido)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Cuota mensual (Gs.)" value={form.cuota_mensual} type="number" onChange={v => setForm((f: any) => ({ ...f, cuota_mensual: Number(v) }))} />
            <FormField label="Días por semana" value={form.dias_por_semana} type="number" onChange={v => setForm((f: any) => ({ ...f, dias_por_semana: Number(v) }))} />
            <FormField label="Descuento aplicado (%)" value={form.descuento_aplicado} type="number" onChange={v => setForm((f: any) => ({ ...f, descuento_aplicado: Number(v) }))} />
          </div>

          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="beca_edit" checked={form.beca} onChange={e => setForm((f: any) => ({ ...f, beca: e.target.checked }))} />
            <label htmlFor="beca_edit" style={{ color: C.text, fontSize: 13, cursor: 'pointer' }}>Beca completa (cuota Gs. 0)</label>
          </div>

          <ModalActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// CUOTAS
// ═══════════════════════════════════════════════════════════
function CuotasTab({ cuotas, notify, apiFetch, isTesorero, isDueno, fetchAll, cuentas = [], metodosPago = [], abrirFactura }: any) {
  const [subTab, setSubTab] = useState<'cuotas' | 'matriculas'>('cuotas');
  const [generando, setGenerando] = useState(false);
  const [generandoMat, setGenerandoMat] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modals
  const [modalPago, setModalPago] = useState<any>(null);
  const [modalHistorial, setModalHistorial] = useState<any>(null);
  const [modalEditar, setModalEditar] = useState<any>(null);
  const [modalAnular, setModalAnular] = useState<any>(null);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [filtroMatEstado, setFiltroMatEstado] = useState('');

  // Form states
  const [pagoForm, setPagoForm] = useState<any>({
    cuenta_id: '',
    metodo_pago_id: '',
    metodo_pago: '',       // texto libre (fallback)
    monto: '',
    fecha_pago: '',
    generar_factura: false,
    notas: ''
  });
  const [editarForm, setEditarForm] = useState<any>({ monto_final: '', descuento: '', notas: '' });
  const [anularMotivo, setAnularMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const estadoColor: Record<string, string> = {
    pendiente: C.yellow, pagada: C.green, vencida: C.red,
    becada: C.purple, anulada: C.faint, parcial: '#f97316',
  };

  const filtered = cuotas.filter((q: any) =>
    (!filtroEstado || q.estado === filtroEstado) &&
    (!filtroPeriodo || q.periodo === filtroPeriodo) &&
    (!busqueda || q.alumno?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const totalFiltrado = filtered.reduce((s: number, q: any) => s + (q.monto_final || 0), 0);
  const pendienteGs = filtered.filter((q: any) => ['pendiente', 'parcial', 'vencida'].includes(q.estado))
    .reduce((s: number, q: any) => s + (q.monto_final || 0) - (q.monto_pagado || 0), 0);

  const generar = async () => {
    setGenerando(true);
    try {
      const data = await apiFetch(`/academia/cuotas/generar?periodo=${periodoActual}`, { method: 'POST' });
      notify(`${data.generadas} cuotas generadas para ${periodoActual}`);
      await fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
    setGenerando(false);
  };

  const generarMatriculas = async () => {
    setGenerandoMat(true);
    try {
      const data = await apiFetch(`/academia/matriculas/generar?anio=${hoy.getFullYear()}`, { method: 'POST' });
      notify(`${data.generadas} matrículas generadas — Gs. ${(data.monto_por_alumno || 0).toLocaleString('es-PY')} c/u`);
      cargarMatriculas();
    } catch (e: any) { notify(e.message, 'err'); }
    setGenerandoMat(false);
  };

  const filtMatriculas = matriculas.filter((m: any) => !filtroMatEstado || m.estado === filtroMatEstado);

  const cargarMatriculas = async () => {
    try {
      const data = await apiFetch('/academia/matriculas');
      setMatriculas(data || []);
    } catch (e: any) {
      notify(e.message || 'Error al cargar matrículas', 'err');
    }
  };

  const registrarPago = async () => {
    if (!modalPago) return;
    const saldoOriginal = (modalPago.monto_final || 0) - (modalPago.monto_pagado || 0);

    let descuentoGs = 0;
    if (pagoForm.aplicar_descuento) {
      if (pagoForm.tipo_descuento === 'quincena') {
        descuentoGs = Math.round(saldoOriginal * 0.5);
      } else if (pagoForm.tipo_descuento === 'semana') {
        descuentoGs = Math.round(saldoOriginal * 0.75);
      } else if (pagoForm.tipo_descuento === 'porcentaje') {
        const pct = Math.max(0, Math.min(100, Number(pagoForm.descuento_valor || 0)));
        descuentoGs = Math.round(saldoOriginal * (pct / 100));
      } else if (pagoForm.tipo_descuento === 'monto') {
        descuentoGs = Math.max(0, Math.min(saldoOriginal, Number(pagoForm.descuento_valor || 0)));
      }
    }

    const saldoPendiente = Math.max(0, saldoOriginal - descuentoGs);
    const montoEfectivo = pagoForm.monto !== '' ? Number(pagoForm.monto) : saldoPendiente;

    if (montoEfectivo <= 0 && saldoPendiente > 0) {
      notify('Ingresá un monto válido', 'err');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        monto: montoEfectivo,
        fecha_pago: pagoForm.fecha_pago || undefined,
        generar_factura: Boolean(pagoForm.generar_factura),
        notas: pagoForm.notas || undefined,
        descuento_adicional: descuentoGs > 0 ? descuentoGs : undefined,
        motivo_descuento: (descuentoGs > 0 && pagoForm.motivo_descuento) ? pagoForm.motivo_descuento : undefined,
      };
      // Cuenta destino
      if (pagoForm.cuenta_id) body.cuenta_id = pagoForm.cuenta_id;
      // Método de pago estructurado (FK) tiene prioridad
      if (pagoForm.metodo_pago_id) {
        body.metodo_pago_id = pagoForm.metodo_pago_id;
      } else if (pagoForm.metodo_pago) {
        body.metodo_pago = pagoForm.metodo_pago;
      }
      const res = await apiFetch(`/academia/cuotas/${modalPago.id}/pagar`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      notify(res.message || 'Pago registrado exitosamente');
      setModalPago(null);
      if (res.factura && res.factura.id && abrirFactura) {
        abrirFactura(res.factura.id);
      }
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al registrar pago', 'err');
    } finally {
      setSaving(false);
    }
  };

  const editarCuota = async () => {
    if (!modalEditar) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/academia/cuotas/${modalEditar.id}/editar`, {
        method: 'PUT',
        body: JSON.stringify({
          monto_final: Number(editarForm.monto_final),
          descuento: Number(editarForm.descuento || 0),
          motivo_descuento: editarForm.motivo_descuento || undefined,
          notas: editarForm.notas || undefined
        })
      });
      notify(res.message || 'Cuota actualizada');
      setModalEditar(null);
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al editar cuota', 'err');
    } finally {
      setSaving(false);
    }
  };

  const anularCuota = async (cuotaId: string) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/academia/cuotas/${cuotaId}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo_anulacion: anularMotivo })
      });
      notify(res.message || 'Cuota anulada exitosamente');
      setModalAnular(null);
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al anular cuota', 'err');
    } finally {
      setSaving(false);
    }
  };

  const anularPago = async (pagoId: string) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/academia/pagos/${pagoId}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo_anulacion: anularMotivo })
      });
      notify(res.message || 'Pago anulado exitosamente');
      if (modalHistorial) {
        await cargarHistorial(modalHistorial.id);
      }
      setModalAnular(null);
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al anular pago', 'err');
    } finally {
      setSaving(false);
    }
  };

  const pagarMatricula = async (matriculaId: string) => {
    try {
      const res = await apiFetch(`/academia/matriculas/${matriculaId}/pagar`, {
        method: 'PUT'
      });
      notify(res.message || 'Matrícula pagada exitosamente');
      if (res.factura && res.factura.id && abrirFactura) {
        abrirFactura(res.factura.id);
      }
      cargarMatriculas();
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al pagar matrícula', 'err');
    }
  };

  const anularMatricula = async (matriculaId: string) => {
    const motivo = prompt('Motivo de anulación de la matrícula:');
    if (motivo === null) return;
    try {
      const res = await apiFetch(`/academia/matriculas/${matriculaId}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo })
      });
      notify(res.message || 'Matrícula anulada');
      cargarMatriculas();
      if (fetchAll) await fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al anular matrícula', 'err');
    }
  };

  // WhatsApp Gateway States
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [modalWaQr, setModalWaQr] = useState(false);
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waSendingId, setWaSendingId] = useState<string | null>(null);
  const [waSendingMasivo, setWaSendingMasivo] = useState(false);

  useEffect(() => {
    verificarEstadoWa();
  }, []);

  const verificarEstadoWa = async () => {
    try {
      const res = await apiFetch('/academia/whatsapp/status');
      setWaConnected(res.connected === true);
    } catch {
      setWaConnected(false);
    }
  };

  const abrirModalQrWa = async () => {
    setWaLoading(true);
    setModalWaQr(true);
    try {
      const res = await apiFetch('/academia/whatsapp/qr');
      if (res.qr) {
        setWaQrCode(res.qr);
      } else {
        notify('El bot ya está conectado o generando código...', 'ok');
      }
    } catch (e: any) {
      notify(e.message || 'Error al obtener código QR de WhatsApp', 'err');
    }
    setWaLoading(false);
  };

  const enviarRecordatorioWa = async (cuotaId: string) => {
    setWaSendingId(cuotaId);
    try {
      const res = await apiFetch(`/academia/whatsapp/recordatorio-cuota/${cuotaId}`, { method: 'POST' });
      notify(res.message || 'Recordatorio enviado por WhatsApp');
    } catch (e: any) {
      notify(e.message || 'Error al enviar por WhatsApp', 'err');
    }
    setWaSendingId(null);
  };

  const enviarMasivoWa = async () => {
    if (!confirm('¿Deseas enviar recordatorios por WhatsApp a todos los tutores con cuotas pendientes/vencidas?')) return;
    setWaSendingMasivo(true);
    try {
      const res = await apiFetch('/academia/whatsapp/recordatorio-masivo', {
        method: 'POST',
        body: JSON.stringify({ periodo: filtroPeriodo || undefined, estado_filtro: filtroEstado || 'pendiente' })
      });
      notify(res.message || 'Proceso de envío masivo finalizado');
    } catch (e: any) {
      notify(e.message || 'Error en envío masivo WhatsApp', 'err');
    }
    setWaSendingMasivo(false);
  };

  const cargarHistorial = async (cuotaId: string) => {
    setHistorialPagos([]);
    try {
      const data = await apiFetch(`/academia/cuotas/${cuotaId}/pagos`);
      setHistorialPagos(data || []);
    } catch (e: any) {
      notify(e.message || 'Error al cargar historial de pagos', 'err');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Cuotas y Pagos</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Gestión financiera integral de la academia</p>
        </div>
        {(isDueno || isTesorero) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={abrirModalQrWa} style={btn(waConnected ? C.green : C.yellow, true)}>
              <MessageSquare size={14} />
              {waConnected === true ? '🟢 WA Bot Conectado' : '📲 Conectar WhatsApp QR'}
            </button>
            <button onClick={enviarMasivoWa} disabled={waSendingMasivo} style={btn(C.purple, true)}>
              <PhoneCall size={14} />
              {waSendingMasivo ? 'Enviando...' : '📲 Recordatorio Masivo WA'}
            </button>
            <button onClick={generar} disabled={generando} style={btn(C.green)}>
              <RefreshCw size={14} /> {generando ? 'Generando...' : `Generar cuotas ${periodoActual}`}
            </button>
          </div>
        )}
      </div>

      {/* KPIs resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total cuotas', value: cuotas.length, color: C.primary },
          { label: 'Pendiente/Parcial', value: `Gs. ${pendienteGs.toLocaleString('es-PY')}`, color: C.yellow },
          { label: 'Cobrado este mes', value: `Gs. ${cuotas.filter((q: any) => q.estado === 'pagada' && q.periodo === periodoActual).reduce((s: number, q: any) => s + (q.monto_final || 0), 0).toLocaleString('es-PY')}`, color: C.green },
          { label: 'Vencidas', value: cuotas.filter((q: any) => q.estado === 'vencida').length, color: C.red },
        ].map(k => (
          <div key={k.label} style={{ ...card({ padding: 16 }), borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['cuotas', 'matriculas'] as const).map(t => (
          <button key={t} onClick={() => { setSubTab(t); if (t === 'matriculas') cargarMatriculas(); }}
            style={{ ...btn(C.primary, subTab !== t), textTransform: 'capitalize' }}>
            {t === 'cuotas' ? '📋 Cuotas Mensuales' : '🎓 Matrículas Anuales'}
          </button>
        ))}
      </div>

      {/* ═══ SUB-TAB: CUOTAS ═══ */}
      {subTab === 'cuotas' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
              <input placeholder="Buscar alumno..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ ...input({ paddingLeft: 30 }) }} />
            </div>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...input({ width: 'auto', minWidth: 150 }) }}>
              <option value="">Todos los estados</option>
              {['pendiente', 'parcial', 'pagada', 'vencida', 'becada', 'anulada'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} style={{ ...input({ width: 160 }) }} />
            <div style={{ color: C.muted, fontSize: 13, whiteSpace: 'nowrap' }}>
              Filtrado: <strong style={{ color: C.text }}>Gs. {totalFiltrado.toLocaleString('es-PY')}</strong>
            </div>
          </div>

          <div style={card({ padding: 0 })}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Alumno', 'Período', 'Original', 'Descuento', 'Total', 'Pagado', 'Estado', 'Vence', 'Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: C.faint }}>
                    No hay cuotas con los filtros seleccionados. Generá las del mes con el botón de arriba.
                  </td></tr>
                )}
                {filtered.map((q: any) => {
                  const saldo = (q.monto_final || 0) - (q.monto_pagado || 0);
                  const canPay = (isDueno || isTesorero) && ['pendiente', 'vencida', 'parcial'].includes(q.estado);
                  const canEdit = (isDueno || isTesorero) && ['pendiente', 'vencida', 'parcial'].includes(q.estado);
                  const canCancel = isDueno && q.estado !== 'anulada';
                  return (
                    <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{q.alumno}</td>
                      <td style={{ padding: '9px 14px', color: C.muted, fontFamily: 'monospace' }}>{q.periodo}</td>
                      <td style={{ padding: '9px 14px', color: C.faint }}>Gs. {(q.monto_original || 0).toLocaleString('es-PY')}</td>
                      <td style={{ padding: '9px 14px', color: q.descuento > 0 ? C.purple : C.faint }}>
                        {q.descuento > 0 ? (
                          <div>
                            <span style={{ fontWeight: 700, color: C.purple }}>- Gs. {(q.descuento || 0).toLocaleString('es-PY')}</span>
                            {q.notas && q.notas.includes('Descuento') && (
                              <div style={{ fontSize: 10, color: C.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.notas}>
                                {q.notas.split('\n').filter((l: string) => l.includes('Descuento')).pop()}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>Gs. {(q.monto_final || 0).toLocaleString('es-PY')}</td>
                      <td style={{ padding: '9px 14px', color: q.monto_pagado > 0 ? C.green : C.faint, fontSize: 12 }}>
                        {q.monto_pagado > 0 ? `Gs. ${(q.monto_pagado || 0).toLocaleString('es-PY')}` : '—'}
                        {saldo > 0 && q.estado === 'parcial' && (
                          <div style={{ color: C.yellow, fontSize: 10 }}>Saldo: Gs. {saldo.toLocaleString('es-PY')}</div>
                        )}
                      </td>
                      <td style={{ padding: '9px 14px' }}><span style={badge(estadoColor[q.estado] || C.faint)}>{q.estado}</span></td>
                      <td style={{ padding: '9px 14px', color: C.muted, fontSize: 11 }}>{q.fecha_vencimiento}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {canPay && (
                            <button onClick={() => {
                              setModalPago(q);
                              setPagoForm({
                                cuenta_id: '',
                                metodo_pago_id: '',
                                metodo_pago: '',
                                monto: saldo > 0 ? String(saldo) : '',
                                fecha_pago: '',
                                generar_factura: false,
                                notas: '',
                                aplicar_descuento: false,
                                tipo_descuento: 'quincena',
                                descuento_valor: 50,
                                motivo_descuento: 'Iniciación tardía (ingreso a mitad de mes)',
                              });
                            }} style={{ ...btn(C.green, true), fontSize: 11, padding: '4px 9px' }}>
                              <DollarSign size={11} /> Pagar
                            </button>
                          )}
                          {['pendiente', 'vencida', 'parcial'].includes(q.estado) && (
                            <button onClick={() => enviarRecordatorioWa(q.id)} disabled={waSendingId === q.id}
                              style={{ ...btn(C.purple, true), fontSize: 11, padding: '4px 9px' }} title="Enviar recordatorio por WhatsApp">
                              <PhoneCall size={11} /> {waSendingId === q.id ? '...' : 'WA'}
                            </button>
                          )}
                          <button onClick={async () => {
                            setModalHistorial(q);
                            await cargarHistorial(q.id);
                          }} style={{ ...btn(C.primary, true), fontSize: 11, padding: '4px 9px' }} title="Ver historial de pagos">
                            <Eye size={11} />
                          </button>
                          {q.documento_electronico_id && (
                            <button
                              onClick={() => abrirFactura && abrirFactura(q.documento_electronico_id)}
                              style={{ ...btn(C.primary, true), fontSize: 11, padding: '4px 9px', background: `${C.purple}22`, color: C.purple, borderColor: `${C.purple}55` }}
                              title="Imprimir Factura Electrónica (KuDE)"
                            >
                              <Printer size={11} /> Factura
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => {
                              setModalEditar(q);
                              setEditarForm({ monto_final: q.monto_final, descuento: q.descuento || 0, notas: q.notas || '' });
                            }} style={{ ...btn(C.yellow, true), fontSize: 11, padding: '4px 9px' }} title="Editar cuota">
                              <Pencil size={11} />
                            </button>
                          )}
                          {canCancel && (
                            <button onClick={() => { setModalAnular({ type: 'cuota', id: q.id }); setAnularMotivo(''); }}
                              style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 9px' }} title="Anular cuota">
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════ MODAL: QR WhatsApp Gateway ════ */}
      {modalWaQr && (
        <Modal title="Vinculación de Bot WhatsApp (Evolution API)" onClose={() => setModalWaQr(null)}>
          <div style={{ textAlign: 'center', padding: 10 }}>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Escaneá este código QR desde tu teléfono WhatsApp (**Dispositivos vinculados → Vincular un dispositivo**) para que tu academia pueda enviar mensajes automáticos.
            </p>
            {waLoading ? (
              <div style={{ padding: 40, color: C.primary }}>Cargando código QR...</div>
            ) : waQrCode ? (
              <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
                <img src={waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`}
                  alt="WhatsApp QR" style={{ width: 240, height: 240 }} />
              </div>
            ) : (
              <div style={{ padding: 20, background: `${C.green}18`, color: C.green, borderRadius: 10, marginBottom: 16 }}>
                ✅ El bot ya se encuentra enlazado y listo para enviar mensajes.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
              <button onClick={verificarEstadoWa} style={btn(C.primary, true)}>
                <RefreshCw size={14} /> Verificar Estado
              </button>
              <button onClick={() => setModalWaQr(false)} style={btn(C.muted)}>Cerrar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ SUB-TAB: MATRÍCULAS ═══ */}
      {subTab === 'matriculas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <select value={filtroMatEstado} onChange={e => setFiltroMatEstado(e.target.value)} style={{ ...input({ width: 180 }) }}>
              <option value="">Todos los estados</option>
              {['pendiente', 'pagada', 'anulada', 'becada'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {(isDueno || isTesorero) && (
              <button onClick={generarMatriculas} disabled={generandoMat} style={btn(C.green)}>
                <RefreshCw size={14} /> {generandoMat ? 'Generando...' : `Generar matrículas ${hoy.getFullYear()}`}
              </button>
            )}
          </div>
          {filtMatriculas.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 50, color: C.faint }}>
              <GraduationCap size={40} style={{ marginBottom: 12 }} />
              <p>No hay matrículas generadas. Usá el botón para generar las de este año.</p>
            </div>
          ) : (
            <div style={card({ padding: 0 })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Alumno', 'Año', 'Monto', 'Estado', 'Vence', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtMatriculas.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{m.alumno}</td>
                      <td style={{ padding: '9px 14px', color: C.muted }}>{m.anio}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>Gs. {(m.monto || 0).toLocaleString('es-PY')}</td>
                      <td style={{ padding: '9px 14px' }}><span style={badge(estadoColor[m.estado] || C.faint)}>{m.estado}</span></td>
                      <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12 }}>{m.fecha_vencimiento}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(isDueno || isTesorero) && m.estado === 'pendiente' && (
                            <button onClick={() => pagarMatricula(m.id)} style={{ ...btn(C.green, true), fontSize: 11, padding: '4px 9px' }}>
                              <DollarSign size={11} /> Pagar
                            </button>
                          )}
                          {m.documento_electronico_id && (
                            <button
                              onClick={() => abrirFactura && abrirFactura(m.documento_electronico_id)}
                              style={{ ...btn(C.primary, true), fontSize: 11, padding: '4px 9px', background: `${C.purple}22`, color: C.purple, borderColor: `${C.purple}55` }}
                              title="Imprimir Factura Electrónica (KuDE)"
                            >
                              <Printer size={11} /> Factura
                            </button>
                          )}
                          {isDueno && m.estado !== 'anulada' && (
                            <button onClick={() => anularMatricula(m.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 9px' }}>
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════ MODAL: Registrar Pago ════ */}
      {modalPago && (() => {
        const saldoOriginal = Math.max(0, (modalPago.monto_final || 0) - (modalPago.monto_pagado || 0));
        let descuentoCalculado = 0;
        if (pagoForm.aplicar_descuento) {
          if (pagoForm.tipo_descuento === 'quincena') {
            descuentoCalculado = Math.round(saldoOriginal * 0.5);
          } else if (pagoForm.tipo_descuento === 'semana') {
            descuentoCalculado = Math.round(saldoOriginal * 0.75);
          } else if (pagoForm.tipo_descuento === 'porcentaje') {
            const pct = Math.max(0, Math.min(100, Number(pagoForm.descuento_valor || 0)));
            descuentoCalculado = Math.round(saldoOriginal * (pct / 100));
          } else if (pagoForm.tipo_descuento === 'monto') {
            descuentoCalculado = Math.max(0, Math.min(saldoOriginal, Number(pagoForm.descuento_valor || 0)));
          }
        }
        const saldoConDescuento = Math.max(0, saldoOriginal - descuentoCalculado);

        return (
          <Modal title={`Registrar Cobro — ${modalPago.alumno}`} onClose={() => setModalPago(null)}>
            {/* Tarjeta Resumen */}
            <div style={{ background: `${C.primary}11`, border: `1px solid ${C.primary}33`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted }}>Cuota {modalPago.periodo}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
                    Gs. {(modalPago.monto_final || 0).toLocaleString('es-PY')}
                  </div>
                </div>
                {modalPago.descuento > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ ...badge(C.purple), fontSize: 11 }}>
                      Desc. inicial: Gs. {(modalPago.descuento || 0).toLocaleString('es-PY')}
                    </span>
                  </div>
                )}
              </div>
              {modalPago.monto_pagado > 0 && (
                <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 600 }}>
                  Ya pagado: Gs. {(modalPago.monto_pagado || 0).toLocaleString('es-PY')} —
                  Saldo pendiente: Gs. {saldoOriginal.toLocaleString('es-PY')}
                </div>
              )}
            </div>

            {/* Bloque Descuento por Iniciación Tardía / Motivo Especial */}
            <div style={{
              marginBottom: 16,
              borderRadius: 10,
              border: `1px solid ${pagoForm.aplicar_descuento ? C.purple : C.border}`,
              background: pagoForm.aplicar_descuento ? `${C.purple}12` : `${C.surface}`,
              padding: 12,
              transition: 'all 0.2s ease'
            }}>
              <div
                onClick={() => {
                  const nuevoAplicar = !pagoForm.aplicar_descuento;
                  let nuevoDesc = 0;
                  if (nuevoAplicar) {
                    nuevoDesc = Math.round(saldoOriginal * 0.5);
                  }
                  const nuevoSaldo = Math.max(0, saldoOriginal - nuevoDesc);
                  setPagoForm((f: any) => ({
                    ...f,
                    aplicar_descuento: nuevoAplicar,
                    tipo_descuento: f.tipo_descuento || 'quincena',
                    descuento_valor: f.descuento_valor || 50,
                    motivo_descuento: f.motivo_descuento || 'Iniciación tardía (ingreso a mitad de mes)',
                    monto: String(nuevoSaldo)
                  }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={pagoForm.aplicar_descuento || false}
                    onChange={() => {}}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.purple }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: pagoForm.aplicar_descuento ? C.purple : C.text }}>
                    🏷️ Aplicar Descuento (Iniciación tardía / Motivo especial)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: C.muted }}>
                  {pagoForm.aplicar_descuento ? '▲ Ocultar' : '▼ Habilitar descuento'}
                </span>
              </div>

              {pagoForm.aplicar_descuento && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}55` }}>
                  <label style={{ ...label(), fontSize: 11, marginBottom: 6 }}>Presets rápidos por inicio tardío:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                    {[
                      { id: 'quincena', label: '🌗 Quincena (-50%)', descVal: 50, motivo: 'Iniciación tardía (ingreso a mitad de mes)' },
                      { id: 'semana', label: '📅 Última sem. (-75%)', descVal: 75, motivo: 'Iniciación tardía (ingreso en última semana)' },
                      { id: 'porcentaje', label: '🔢 Porcentaje (%)', descVal: 25, motivo: 'Iniciación tardía proporcional' },
                      { id: 'monto', label: '💵 Monto fijo (Gs.)', descVal: Math.round(saldoOriginal * 0.3), motivo: 'Descuento especial' },
                    ].map(p => {
                      const active = pagoForm.tipo_descuento === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            let descGs = 0;
                            if (p.id === 'quincena') descGs = Math.round(saldoOriginal * 0.5);
                            else if (p.id === 'semana') descGs = Math.round(saldoOriginal * 0.75);
                            else if (p.id === 'porcentaje') descGs = Math.round(saldoOriginal * (p.descVal / 100));
                            else descGs = p.descVal;

                            const nuevoSaldo = Math.max(0, saldoOriginal - descGs);
                            setPagoForm((f: any) => ({
                              ...f,
                              tipo_descuento: p.id,
                              descuento_valor: p.descVal,
                              motivo_descuento: p.motivo,
                              monto: String(nuevoSaldo)
                            }));
                          }}
                          style={{
                            padding: '7px 8px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: active ? C.purple : C.surface,
                            color: active ? '#fff' : C.text,
                            border: `1px solid ${active ? C.purple : C.border}`,
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Input de porcentaje o monto libre */}
                  {(pagoForm.tipo_descuento === 'porcentaje' || pagoForm.tipo_descuento === 'monto') && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ ...label(), fontSize: 11 }}>
                        {pagoForm.tipo_descuento === 'porcentaje' ? 'Porcentaje de descuento (%) *' : 'Monto de descuento en Guaraníes (Gs.) *'}
                      </label>
                      <input
                        type="number"
                        value={pagoForm.descuento_valor}
                        onChange={e => {
                          const val = Number(e.target.value);
                          let descGs = 0;
                          if (pagoForm.tipo_descuento === 'porcentaje') {
                            descGs = Math.round(saldoOriginal * (Math.min(100, Math.max(0, val)) / 100));
                          } else {
                            descGs = Math.min(saldoOriginal, Math.max(0, val));
                          }
                          const nuevoSaldo = Math.max(0, saldoOriginal - descGs);
                          setPagoForm((f: any) => ({
                            ...f,
                            descuento_valor: e.target.value,
                            monto: String(nuevoSaldo)
                          }));
                        }}
                        style={input()}
                        placeholder={pagoForm.tipo_descuento === 'porcentaje' ? 'Ej: 35' : 'Ej: 100000'}
                      />
                    </div>
                  )}

                  {/* Motivo del Descuento */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ ...label(), fontSize: 11 }}>Motivo / Justificación del descuento *</label>
                    <input
                      value={pagoForm.motivo_descuento || ''}
                      onChange={e => setPagoForm((f: any) => ({ ...f, motivo_descuento: e.target.value }))}
                      style={input()}
                      placeholder="Ej: Iniciación tardía (ingreso el 16/09), Quincena, etc."
                    />
                  </div>

                  {/* Resumen de cálculo del descuento */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: C.bg,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    marginTop: 6
                  }}>
                    <span style={{ color: C.muted }}>Saldo cuota: Gs. {saldoOriginal.toLocaleString('es-PY')}</span>
                    <span style={{ color: C.purple, fontWeight: 700 }}>- Descuento: Gs. {descuentoCalculado.toLocaleString('es-PY')}</span>
                    <span style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>
                      Neto a cobrar: Gs. {saldoConDescuento.toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Pago Total / Parcial */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setPagoForm((f: any) => ({ ...f, monto: String(saldoConDescuento) }))}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', background: `${C.green}20`, border: `1px solid ${C.green}66`, color: C.green
                  }}
                >
                  💰 Pago Total (Gs. {saldoConDescuento.toLocaleString('es-PY')})
                </button>
                <button
                  type="button"
                  onClick={() => setPagoForm((f: any) => ({ ...f, monto: '' }))}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', background: `${C.yellow}20`, border: `1px solid ${C.yellow}66`, color: C.yellow
                  }}
                >
                  💵 Pago Parcial
                </button>
              </div>
              <label style={label()}>Monto a pagar (Gs.) <span style={{ color: C.faint, fontWeight: 400 }}>— vacío = pago total</span></label>
              <input
                type="number"
                placeholder={`${saldoConDescuento}`}
                value={pagoForm.monto}
                onChange={e => setPagoForm((f: any) => ({ ...f, monto: e.target.value }))}
                style={input()}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Cuenta destino {cuentas.length > 0 ? '*' : <span style={{ color: C.faint, fontWeight: 400 }}>(configurá cuentas en Tesorería)</span>}</label>
              {cuentas.length > 0 ? (
                <select value={pagoForm.cuenta_id} onChange={e => setPagoForm((f: any) => ({ ...f, cuenta_id: e.target.value }))} style={input()}>
                  <option value="">— Sin especificar cuenta —</option>
                  {cuentas.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.tipo === 'efectivo' ? '💵' : c.tipo === 'banco' ? '🏦' : '📱'} {c.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ ...input(), color: C.faint, display: 'flex', alignItems: 'center' }}>No hay cuentas configuradas</div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Método de pago {metodosPago.length > 0 ? '*' : <span style={{ color: C.faint, fontWeight: 400 }}>(configurá métodos en Tesorería)</span>}</label>
              {metodosPago.length > 0 ? (
                <select value={pagoForm.metodo_pago_id} onChange={e => setPagoForm((f: any) => ({ ...f, metodo_pago_id: e.target.value, metodo_pago: '' }))} style={input()}>
                  <option value="">— Sin especificar método —</option>
                  {metodosPago.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              ) : (
                <select value={pagoForm.metodo_pago} onChange={e => setPagoForm((f: any) => ({ ...f, metodo_pago: e.target.value }))} style={input()}>
                  {['Efectivo', 'Transferencia', 'Tarjeta', 'QR', 'Débito', 'Otro'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Fecha de pago (opcional — por defecto hoy)</label>
              <input type="date" value={pagoForm.fecha_pago} onChange={e => setPagoForm((f: any) => ({ ...f, fecha_pago: e.target.value }))} style={input()} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Notas</label>
              <input value={pagoForm.notas} onChange={e => setPagoForm((f: any) => ({ ...f, notas: e.target.value }))} style={input()} placeholder="Observaciones opcionales" />
            </div>

            <div style={{ marginBottom: 14, background: `${C.yellow}11`, border: `1px solid ${C.yellow}33`, padding: 10, borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.text }}>
                <input
                  type="checkbox"
                  checked={pagoForm.generar_factura || false}
                  onChange={e => setPagoForm((f: any) => ({ ...f, generar_factura: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.yellow }}
                />
                📄 Emitir Factura Electrónica SIFEN para este pago
              </label>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginLeft: 26 }}>
                Marque esta casilla solo si el tutor o alumno solicita factura oficial para este cobro.
              </div>
            </div>

            <ModalActions
              onCancel={() => setModalPago(null)}
              onSave={registrarPago}
              saving={saving}
              saveLabel={
                pagoForm.monto && parseFloat(pagoForm.monto) < saldoConDescuento
                  ? '💰 Registrar pago parcial'
                  : '✅ Registrar pago total'
              }
            />
          </Modal>
        );
      })()}

      {/* ════ MODAL: Historial de pagos ════ */}
      {modalHistorial && (
        <Modal title={`Historial de pagos — ${modalHistorial.alumno} (${modalHistorial.periodo})`} onClose={() => setModalHistorial(null)}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              Total: <strong style={{ color: C.text }}>Gs. {(modalHistorial.monto_final || 0).toLocaleString('es-PY')}</strong>
              {' '} · Pagado: <strong style={{ color: C.green }}>Gs. {(modalHistorial.monto_pagado || 0).toLocaleString('es-PY')}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {modalHistorial.documento_electronico_id && (
                <button
                  onClick={() => abrirFactura && abrirFactura(modalHistorial.documento_electronico_id)}
                  style={{ ...btn(C.primary, true), fontSize: 11, padding: '4px 10px', background: `${C.purple}22`, color: C.purple, borderColor: `${C.purple}55` }}
                  title="Ver e Imprimir Factura Electrónica (KuDE)"
                >
                  <Printer size={12} /> Factura KuDE
                </button>
              )}
              <span style={badge(estadoColor[modalHistorial.estado] || C.faint)}>{modalHistorial.estado}</span>
            </div>
          </div>
          {historialPagos.length === 0 ? (
            <p style={{ color: C.faint, textAlign: 'center', padding: 24 }}>No hay pagos registrados para esta cuota.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historialPagos.map((p: any) => (
                <div key={p.id} style={{
                  border: `1px solid ${p.anulado ? C.red + '44' : C.border}`,
                  borderRadius: 8, padding: '10px 14px',
                  background: p.anulado ? `${C.red}08` : 'transparent',
                  opacity: p.anulado ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Gs. {(p.monto || 0).toLocaleString('es-PY')}</span>
                      <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{p.metodo_pago}</span>
                      <span style={{ color: C.faint, fontSize: 11, marginLeft: 8 }}>{p.fecha_pago}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {p.anulado && <span style={badge(C.red)}>Anulado</span>}
                      {!p.anulado && isDueno && (
                        <button onClick={() => { setModalAnular({ type: 'pago', id: p.id }); setAnularMotivo(''); }}
                          style={{ ...btn(C.red, true), fontSize: 11, padding: '3px 8px' }}>
                          <Trash2 size={11} /> Anular
                        </button>
                      )}
                    </div>
                  </div>
                  {p.notas && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{p.notas}</div>}
                  {p.anulado && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>Motivo: {p.motivo_anulacion || '—'}</div>}
                  {p.registrado_por && <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>Por: {p.registrado_por}</div>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ════ MODAL: Editar Cuota ════ */}
      {modalEditar && (
        <Modal title={`Editar Cuota — ${modalEditar.alumno} (${modalEditar.periodo})`} onClose={() => setModalEditar(null)}>
          <div style={{ background: `${C.surface}`, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Presets rápidos por inicio tardío:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const orig = Number(modalEditar.monto_original || modalEditar.monto_final || 0);
                  const desc = Math.round(orig * 0.5);
                  setEditarForm((f: any) => ({
                    ...f,
                    descuento: desc,
                    monto_final: Math.max(0, orig - desc),
                    motivo_descuento: 'Iniciación tardía (quincena / mitad de mes)'
                  }));
                }}
                style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: `${C.purple}20`, border: `1px solid ${C.purple}66`, color: C.purple }}
              >
                🌗 Quincena (-50%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const orig = Number(modalEditar.monto_original || modalEditar.monto_final || 0);
                  const desc = Math.round(orig * 0.75);
                  setEditarForm((f: any) => ({
                    ...f,
                    descuento: desc,
                    monto_final: Math.max(0, orig - desc),
                    motivo_descuento: 'Iniciación tardía (última semana)'
                  }));
                }}
                style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: `${C.purple}20`, border: `1px solid ${C.purple}66`, color: C.purple }}
              >
                📅 Última semana (-75%)
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Monto final a cobrar (Gs.) *</label>
            <input type="number" value={editarForm.monto_final} onChange={e => setEditarForm((f: any) => ({ ...f, monto_final: e.target.value }))} style={input()} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Descuento (Gs.)</label>
            <input type="number" value={editarForm.descuento} onChange={e => setEditarForm((f: any) => ({ ...f, descuento: e.target.value }))} style={input()} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Motivo del descuento (opcional)</label>
            <input value={editarForm.motivo_descuento || ''} onChange={e => setEditarForm((f: any) => ({ ...f, motivo_descuento: e.target.value }))} style={input()} placeholder="Ej: Iniciación tardía, Quincena, etc." />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Notas</label>
            <input value={editarForm.notas} onChange={e => setEditarForm((f: any) => ({ ...f, notas: e.target.value }))} style={input()} />
          </div>
          <ModalActions onCancel={() => setModalEditar(null)} onSave={editarCuota} saving={saving} saveLabel="Guardar cambios" />
        </Modal>
      )}

      {/* ════ MODAL: Anular ════ */}
      {modalAnular && (
        <Modal title={`Anular ${modalAnular.type === 'cuota' ? 'Cuota' : 'Pago'}`} onClose={() => setModalAnular(null)}>
          <div style={{ background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <AlertCircle size={16} color={C.red} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            <span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>
              Esta acción {modalAnular.type === 'cuota' ? 'anula la cuota completa y revierte todos sus pagos' : 'revierte el monto al saldo pendiente de la cuota'}.
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Motivo de anulación</label>
            <input value={anularMotivo} onChange={e => setAnularMotivo(e.target.value)} style={input()} placeholder="Ej: Error de carga, devolución..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModalAnular(null)} style={btn(C.faint, true)}>Cancelar</button>
            <button disabled={saving} style={btn(C.red)} onClick={() => {
              if (modalAnular.type === 'cuota') anularCuota(modalAnular.id);
              else anularPago(modalAnular.id);
            }}>
              {saving ? 'Anulando...' : '⚠️ Confirmar anulación'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════════════════════
function StaffTab({ staff, sucursales, modal, setModal, notify, apiFetch, isDueno, fetchAll }: any) {
  const [form, setForm] = useState<any>({ rol: 'profesor' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/academia/miembros', { method: 'POST', body: JSON.stringify(form) });
      notify('Miembro agregado al equipo');
      await fetchAll();
      setModal(false);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const revocar = async (id: string) => {
    if (!confirm('¿Revocar acceso de este miembro?')) return;
    try {
      await apiFetch(`/academia/miembros/${id}`, { method: 'DELETE' });
      notify('Acceso revocado');
      await fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  const rolColor: Record<string, string> = { administrador: C.primary, tesorero: C.yellow, profesor: C.green };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Mi Equipo</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Administradores, tesoreros y profesores de la academia</p>
        </div>
        {isDueno && <button onClick={() => { setForm({ rol: 'profesor' }); setModal(true); }} style={btn()}><UserPlus size={15} /> Agregar miembro</button>}
      </div>

      {staff.length === 0 && (
        <div style={{ ...card(), textAlign: 'center', padding: 60 }}>
          <Users size={40} color={C.faint} style={{ marginBottom: 12 }} />
          <p style={{ color: C.muted }}>Aún no hay miembros del equipo.</p>
          {isDueno && <button onClick={() => { setForm({ rol: 'profesor' }); setModal(true); }} style={{ ...btn(), marginTop: 10 }}><UserPlus size={14} /> Invitar miembro</button>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {staff.map((m: any) => (
          <div key={m.id} style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={badge(rolColor[m.rol] || C.faint)}>{m.rol}</span>
              {!m.activo && <span style={badge(C.faint)}>Inactivo</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{m.nombre_completo || m.username}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{m.email}</div>
            {m.sucursal_nombre && <div style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>📍 {m.sucursal_nombre}</div>}
            {isDueno && m.activo && (
              <button onClick={() => revocar(m.id)} style={{ ...btn(C.red, true), marginTop: 12, fontSize: 12, padding: '6px 12px' }}>
                <Trash2 size={12} /> Revocar acceso
              </button>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Agregar Miembro al Equipo" onClose={() => setModal(false)}>
          <FormField label="ID de usuario del sistema *" value={form.usuario_id || ''} type="number"
            onChange={v => setForm((f: any) => ({ ...f, usuario_id: Number(v) }))} placeholder="Buscá el ID en el panel admin" />
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Rol interno *</label>
            <select value={form.rol} onChange={e => setForm((f: any) => ({ ...f, rol: e.target.value }))} style={input()}>
              <option value="administrador">Administrador</option>
              <option value="tesorero">Tesorero</option>
              <option value="profesor">Profesor</option>
            </select>
          </div>
          {form.rol === 'profesor' && (
            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Sucursal asignada (opcional)</label>
              <select value={form.sucursal_id || ''} onChange={e => setForm((f: any) => ({ ...f, sucursal_id: e.target.value || null }))} style={input()}>
                <option value="">Todas las sucursales</option>
                {sucursales.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} — {s.deporte}</option>)}
              </select>
              <p style={{ fontSize: 11, color: C.faint, margin: '4px 0 0' }}>Si asignás una sucursal, el profesor solo verá los alumnos y podrá tomar asistencia en esa sede.</p>
            </div>
          )}
          <ModalActions onCancel={() => setModal(false)} onSave={save} saving={saving} saveLabel="Agregar al equipo" />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONFIG CUOTAS
// ═══════════════════════════════════════════════════════════
function ConfigTab({ configCuotas, setConfigCuotas, notify, apiFetch, isDueno, isTesorero }: any) {
  const [form, setForm] = useState<any>({
    descuento_2_hermanos: 0, descuento_3_hermanos: 0,
    permite_pago_anual: false, descuento_pago_anual: 0,
    dia_vencimiento: 10, matricula_anual: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (configCuotas) setForm({ ...configCuotas }); }, [configCuotas]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/academia/config-cuotas', { method: 'PUT', body: JSON.stringify(form) });
      setConfigCuotas(form);
      notify('Configuración guardada');
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const numField = (key: string, lbl: string, min = 0, max = 100, suffix = '') => (
    <div>
      <label style={label()}>{lbl}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" value={form[key] ?? 0} min={min} max={max}
          onChange={e => setForm((f: any) => ({ ...f, [key]: Number(e.target.value) }))}
          style={{ ...input(), width: 120 }} />
        {suffix && <span style={{ color: C.muted, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Configuración</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Motor de descuentos y parámetros financieros</p>
        </div>
        {isDueno && <button onClick={save} disabled={saving} style={btn()}><Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card()}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.primary }}>Descuentos por familia</h3>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>Se aplican automáticamente al generar cuotas cuando el tutor principal tiene más de un hijo inscrito.</p>
          <div style={{ display: 'grid', gap: 16 }}>
            {numField('descuento_2_hermanos', 'Descuento 2º hijo (%)', 0, 100, '% de descuento')}
            {numField('descuento_3_hermanos', 'Descuento 3º hijo y siguientes (%)', 0, 100, '% de descuento')}
          </div>
        </div>

        <div style={card()}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.primary }}>Parámetros de cobro</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {numField('dia_vencimiento', 'Día de vencimiento de cuota', 1, 28, 'de cada mes')}
            {numField('matricula_anual', 'Matrícula anual (Gs.)', 0, 99999999, 'Gs.')}
            <div>
              <label style={label()}>Descuento pago anual</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.permite_pago_anual} onChange={e => setForm((f: any) => ({ ...f, permite_pago_anual: e.target.checked }))} id="pago_anual" />
                <label htmlFor="pago_anual" style={{ color: C.text, fontSize: 13, cursor: 'pointer' }}>Permitir pago anual con descuento</label>
              </div>
              {form.permite_pago_anual && (
                <div style={{ marginTop: 8 }}>
                  {numField('descuento_pago_anual', 'Descuento al pagar 12 meses (%)', 0, 100, '%')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function Modal({ title, children, onClose, wide }: any) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9000, padding: 12,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="academia-modal-box" style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: 28, width: '100%', maxWidth: wide ? 680 : 460,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label: lbl, value, onChange, placeholder = '', type = 'text' }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={label()}>{lbl}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={input()} />
    </div>
  );
}

function ModalActions({ onCancel, onSave, saving, saveLabel = 'Guardar' }: any) {
  return (
    <div className="academia-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} style={btn(C.faint, true)}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={btn()}>
        {saving ? 'Guardando...' : saveLabel}
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <GraduationCap size={48} style={{ opacity: .3, marginBottom: 12 }} />
        <p>Cargando panel...</p>
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <AlertCircle size={48} color={C.red} style={{ marginBottom: 12 }} />
        <h2 style={{ color: C.text }}>Acceso requerido</h2>
        <p>Necesitás iniciar sesión con una cuenta de academia.</p>
        <a href="/login" style={{ ...btn(), textDecoration: 'none', display: 'inline-flex', marginTop: 12 }}>Iniciar sesión</a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TABS ADICIONALES (ASISTENCIAS, NOTICIAS, FEEDBACK)
// ═══════════════════════════════════════════════════════════

function AsistenciasTab({ notify, apiFetch, categorias = [], fetchAll }: any) {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modal Tomar Asistencia
  const [showModal, setShowModal] = useState(false);
  const [tCatId, setTCatId] = useState('');
  const [tFecha, setTFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [alumnosCat, setAlumnosCat] = useState<any[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [estadosMap, setEstadosMap] = useState<Record<string, { estado: string; obs: string }>>({});
  const [saving, setSaving] = useState(false);

  const listCategorias = Array.isArray(categorias) ? categorias : [];

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterCat) q.append('categoria_id', filterCat);
      if (fechaDesde) q.append('fecha_desde', fechaDesde);
      if (fechaHasta) q.append('fecha_hasta', fechaHasta);

      const data = await apiFetch(`/academia/asistencias?${q.toString()}`);
      setAsistencias(data);
    } catch (e: any) {
      notify(e.message, 'err');
    }
    setLoading(false);
  };

  const abrirTomarAsistencia = () => {
    const initialCat = listCategorias[0]?.id || '';
    setTCatId(initialCat);
    setTFecha(new Date().toISOString().split('T')[0]);
    setShowModal(true);
    if (initialCat) {
      cargarAlumnosCat(initialCat);
    }
  };

  const cargarAlumnosCat = async (catId: str) => {
    if (!catId) return;
    setLoadingAlumnos(true);
    try {
      const data = await apiFetch(`/academia/alumnos?categoria_id=${catId}&estado=activo`);
      const list = Array.isArray(data) ? data : [];
      setAlumnosCat(list);
      
      const initialMap: Record<string, { estado: string; obs: string }> = {};
      list.forEach((a: any) => {
        initialMap[a.id] = { estado: 'presente', obs: '' };
      });
      setEstadosMap(initialMap);
    } catch (e: any) {
      notify(e.message, 'err');
    }
    setLoadingAlumnos(false);
  };

  const setEstadoAlumno = (alumnoId: string, estado: string) => {
    setEstadosMap(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], estado }
    }));
  };

  const setObsAlumno = (alumnoId: string, obs: string) => {
    setEstadosMap(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], obs }
    }));
  };

  const marcarTodos = (estado: string) => {
    setEstadosMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], estado };
      });
      return updated;
    });
  };

  const guardarAsistencia = async () => {
    if (!tCatId) return notify('Seleccioná una categoría', 'err');
    if (!tFecha) return notify('Seleccioná la fecha', 'err');
    if (alumnosCat.length === 0) return notify('No hay alumnos inscritos en esta categoría', 'err');

    setSaving(true);
    try {
      const listAsistencias = alumnosCat.map((a: any) => ({
        alumno_id: a.id,
        estado: estadosMap[a.id]?.estado || 'presente',
        observaciones: estadosMap[a.id]?.obs || '',
      }));

      await apiFetch('/academia/asistencias', {
        method: 'POST',
        body: JSON.stringify({
          categoria_id: tCatId,
          fecha: tFecha,
          asistencias: listAsistencias,
        }),
      });

      notify(`Asistencia guardada para ${listAsistencias.length} alumnos.`);
      setShowModal(false);
      loadHistory();
    } catch (e: any) {
      notify(e.message, 'err');
    }
    setSaving(false);
  };

  const getBadgeStyle = (est: string) => {
    switch (est) {
      case 'presente': return badge(C.green);
      case 'tarde': return badge(C.yellow);
      case 'justificado': return badge(C.purple);
      default: return badge(C.red);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Control y Historial de Asistencias</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Tomá la asistencia diaria de tus alumnos por categoría y consultá el historial.
          </p>
        </div>
        <button onClick={abrirTomarAsistencia} style={btn(C.primary)}>
          <Calendar size={16} /> Tomar Asistencia
        </button>
      </div>

      {/* Filtros */}
      <div style={{ ...card(), marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={label()}>Categoría</label>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={input()}>
              <option value="">Todas las categorías</option>
              {listCategorias.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal_nombre})</option>
              ))}
            </select>
          </div>
          <div style={{ width: 150 }}>
            <label style={label()}>Fecha Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={input()} />
          </div>
          <div style={{ width: 150 }}>
            <label style={label()}>Fecha Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={input()} />
          </div>
          <button onClick={loadHistory} style={btn(C.primary, true)}>
            <Search size={15} /> Filtrar
          </button>
          {(filterCat || fechaDesde || fechaHasta) && (
            <button onClick={() => { setFilterCat(''); setFechaDesde(''); setFechaHasta(''); setTimeout(loadHistory, 0); }} style={btn(C.faint, true)}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Historial */}
      <div style={card()}>
        {loading ? <p style={{ padding: 20, textAlign: 'center', color: C.muted }}>Cargando asistencias...</p> : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 12 }}>
                <th style={{ padding: 12 }}>FECHA</th>
                <th style={{ padding: 12 }}>ALUMNO</th>
                <th style={{ padding: 12 }}>CATEGORÍA</th>
                <th style={{ padding: 12 }}>ESTADO</th>
                <th style={{ padding: 12 }}>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{a.fecha?.split('T')[0] || a.fecha}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: C.text }}>{a.alumno}</td>
                  <td style={{ padding: 12, color: C.muted }}>{a.categoria}</td>
                  <td style={{ padding: 12 }}>
                    <span style={getBadgeStyle(a.estado)}>
                      {a.estado ? a.estado.replace('_', ' ').toUpperCase() : 'PRESENTE'}
                    </span>
                  </td>
                  <td style={{ padding: 12, color: C.muted }}>{a.observaciones || '—'}</td>
                </tr>
              ))}
              {asistencias.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: C.muted }}>
                    No hay registros de asistencia que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tomar Asistencia */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, width: 620, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Tomar Asistencia</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Seleccioná la categoría, fecha y marcá el estado de los alumnos.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={label()}>Categoría *</label>
                  <select value={tCatId} onChange={e => { setTCatId(e.target.value); cargarAlumnosCat(e.target.value); }} style={input()}>
                    {listCategorias.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal_nombre})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label()}>Fecha *</label>
                  <input type="date" value={tFecha} onChange={e => setTFecha(e.target.value)} style={input()} />
                </div>
              </div>

              {loadingAlumnos ? (
                <p style={{ textAlign: 'center', color: C.muted, padding: 30 }}>Cargando alumnos de la categoría...</p>
              ) : alumnosCat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: C.muted, background: C.bg, borderRadius: 10 }}>
                  <AlertCircle size={32} color={C.yellow} style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No hay alumnos inscritos en esta categoría.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>Inscribí alumnos desde el módulo de Alumnos para tomarles asistencia.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                      Alumnos ({alumnosCat.length})
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => marcarTodos('presente')} style={{ ...btn(C.green, true), padding: '4px 8px', fontSize: 11 }}>
                        Todos Presentes
                      </button>
                      <button onClick={() => marcarTodos('ausente')} style={{ ...btn(C.red, true), padding: '4px 8px', fontSize: 11 }}>
                        Todos Ausentes
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alumnosCat.map((a: any) => {
                      const cur = estadosMap[a.id] || { estado: 'presente', obs: '' };
                      return (
                        <div key={a.id} style={{ background: C.bg, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                              {a.nombre} {a.apellido}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[
                                { id: 'presente', label: 'Presente', color: C.green },
                                { id: 'tarde', label: 'Tarde', color: C.yellow },
                                { id: 'ausente', label: 'Ausente', color: C.red },
                                { id: 'justificado', label: 'Justificado', color: C.purple },
                              ].map(st => {
                                const active = cur.estado === st.id;
                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setEstadoAlumno(a.id, st.id)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: active ? 700 : 500,
                                      border: `1px solid ${active ? st.color : C.border}`,
                                      background: active ? st.color : 'transparent',
                                      color: active ? '#fff' : C.muted,
                                      cursor: 'pointer',
                                      transition: 'all .15s',
                                    }}
                                  >
                                    {st.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Observación (opcional)..."
                            value={cur.obs}
                            onChange={e => setObsAlumno(a.id, e.target.value)}
                            style={{ ...input(), padding: '6px 10px', fontSize: 12, background: C.surface }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: C.surface }}>
              <button onClick={() => setShowModal(false)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardarAsistencia} disabled={saving || alumnosCat.length === 0} style={btn(C.primary)}>
                {saving ? 'Guardando...' : `Guardar Asistencia (${alumnosCat.length})`}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function NoticiasTab({ notify, apiFetch }: any) {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null); // null | 'new' | noticia object
  const [previewNoticia, setPreviewNoticia] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [modalIA, setModalIA] = useState(false);
  const [promptIA, setPromptIA] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  
  const [form, setForm] = useState({ titulo: '', contenido: '', imagen_url: '', activa: true });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activas' | 'inactivas'>('todos');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/academias/noticias');
      setNoticias(Array.isArray(data) ? data : []);
    } catch (e: any) {
      notify(e.message || 'Error al cargar noticias', 'err');
    }
    setLoading(false);
  };

  const openNew = () => {
    setForm({ titulo: '', contenido: '', imagen_url: '', activa: true });
    setModal('new');
  };

  const openEdit = (n: any) => {
    setForm({
      titulo: n.titulo || '',
      contenido: n.contenido || '',
      imagen_url: n.imagen_url || '',
      activa: n.activa ?? true,
    });
    setModal(n);
  };

  const save = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) {
      return notify('El título y contenido son obligatorios', 'err');
    }
    setSaving(true);
    try {
      if (modal === 'new') {
        await apiFetch('/academias/noticias', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        notify('Noticia publicada exitosamente');
      } else {
        await apiFetch(`/academias/noticias/${modal.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        notify('Noticia actualizada exitosamente');
      }
      setModal(null);
      load();
    } catch (e: any) {
      notify(e.message || 'Error al guardar la noticia', 'err');
    }
    setSaving(false);
  };

  const toggleActiva = async (n: any) => {
    try {
      const nuevoEstado = !n.activa;
      await apiFetch(`/academias/noticias/${n.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: n.titulo,
          contenido: n.contenido,
          imagen_url: n.imagen_url,
          activa: nuevoEstado,
        }),
      });
      notify(nuevoEstado ? 'Noticia activada' : 'Noticia ocultada/desactivada');
      load();
    } catch (e: any) {
      notify(e.message || 'Error al cambiar estado', 'err');
    }
  };

  const removeNoticia = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/academias/noticias/${deleteConfirm.id}`, { method: 'DELETE' });
      notify('Noticia eliminada correctamente');
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      notify(e.message || 'Error al eliminar la noticia', 'err');
    }
  };

  const generarConIA = async () => {
    if (!promptIA.trim()) return notify('Ingresa detalles para la IA', 'err');
    setLoadingIA(true);
    try {
      const res = await apiFetch('/academias/noticias/generar-ia', {
        method: 'POST',
        body: JSON.stringify({ contexto: promptIA }),
      });
      setForm(f => ({
        ...f,
        titulo: res.titulo || f.titulo,
        contenido: res.contenido || f.contenido,
      }));
      setModalIA(false);
      setPromptIA('');
      notify('Borrador redactado por IA aplicado al formulario');
      if (!modal) setModal('new');
    } catch (e: any) {
      notify(e.message || 'Error al generar borrador', 'err');
    }
    setLoadingIA(false);
  };

  const compartirNoticiaWa = (n: any) => {
    const texto = `📢 *${n.titulo}*\n\n${n.contenido}\n\nEnviado desde el Portal de la Academia`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const filtered = noticias.filter((n: any) => {
    const matchSearch =
      (n.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.contenido || '').toLowerCase().includes(search.toLowerCase());
    if (filtroEstado === 'activas') return matchSearch && n.activa;
    if (filtroEstado === 'inactivas') return matchSearch && !n.activa;
    return matchSearch;
  });

  return (
    <div>
      {/* Header y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>CMS de Noticias y Anuncios</h2>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Publica novedades, avisos de partidos, horarios y logros para la comunidad de la academia.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setModalIA(true)} style={btn(C.purple, true)}>
            <Sparkles size={16} /> Generar con IA
          </button>
          <button onClick={openNew} style={btn(C.primary)}>
            <Plus size={16} /> Nueva Noticia
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{ ...card(), padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            type="text"
            placeholder="Buscar noticias por título o texto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...input(), paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Estado:</span>
          {(['todos', 'activas', 'inactivas'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: filtroEstado === st ? C.primary : C.bg,
                color: filtroEstado === st ? '#fff' : C.muted,
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>
        <button onClick={load} title="Recargar listado" style={{ ...btn(C.faint, true), padding: '8px 12px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Listado de Noticias */}
      {loading ? (
        <div style={{ ...card(), textAlign: 'center', padding: 40, color: C.muted }}>
          <RefreshCw size={24} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando noticias...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card(), textAlign: 'center', padding: 48 }}>
          <FileText size={40} color={C.faint} style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: C.text }}>No se encontraron noticias</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            {search ? 'Intenta modificar el término de búsqueda o el filtro seleccionado.' : 'Aún no hay noticias creadas en el CMS. ¡Comienza redactando tu primera publicación!'}
          </p>
          {!search && (
            <button onClick={openNew} style={btn(C.primary)}>
              <Plus size={16} /> Publicar Primera Noticia
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map((n: any) => (
            <div key={n.id} style={{ ...card({ padding: 0 }), overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s' }}>
              {/* Cover Image */}
              <div style={{ height: 160, background: '#090d16', position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${C.border}` }}>
                {n.imagen_url ? (
                  <img
                    src={n.imagen_url}
                    alt={n.titulo}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.surface} 0%, #0f172a 100%)` }}>
                    <ImageIcon size={44} color={C.border} />
                  </div>
                )}
                {/* Badges */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                  <span style={badge(n.activa ? C.green : C.yellow)}>
                    {n.activa ? 'Publicada' : 'Borrador / Oculta'}
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, color: C.muted, backdropFilter: 'blur(4px)' }}>
                  <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />
                  {n.fecha_publicacion ? n.fecha_publicacion.split('T')[0] : 'Hoy'}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: C.text, lineHeight: 1.3 }}>
                  {n.titulo}
                </h3>
                <p style={{
                  fontSize: 13, color: C.muted, margin: '0 0 16px', lineHeight: 1.5, flex: 1,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {n.contenido}
                </p>

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}44` }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setPreviewNoticia(n)} title="Ver vista previa" style={{ ...btn(C.faint, true), padding: '6px 10px', fontSize: 12 }}>
                      <Eye size={13} />
                    </button>
                    <button onClick={() => toggleActiva(n)} title={n.activa ? 'Ocultar Noticia' : 'Mostrar Noticia'} style={{ ...btn(n.activa ? C.yellow : C.green, true), padding: '6px 10px', fontSize: 12 }}>
                      {n.activa ? <X size={13} /> : <Check size={13} />}
                    </button>
                    <button
                      title="Compartir por WhatsApp"
                      onClick={() => compartirNoticiaWa(n)}
                      style={{ ...btn(C.purple, true), padding: '6px 10px', fontSize: 12 }}
                    >
                      <PhoneCall size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(n)} style={{ ...btn(C.primary, true), padding: '6px 12px', fontSize: 12 }}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button onClick={() => setDeleteConfirm(n)} style={{ ...btn(C.red, true), padding: '6px 10px', fontSize: 12 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR NOTICIA ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, width: 560, maxWidth: '100%', padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>
                {modal === 'new' ? 'Nueva Noticia' : 'Editar Noticia'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={label()}>Título de la Noticia *</label>
                <input
                  type="text"
                  placeholder="Ej: Gran triunfo de la categoría Sub-15 en el torneo..."
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  style={input()}
                />
              </div>

              <div>
                <label style={label()}>URL de Imagen de Portada (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={form.imagen_url}
                  onChange={e => setForm({ ...form, imagen_url: e.target.value })}
                  style={input()}
                />
                {form.imagen_url && (
                  <div style={{ marginTop: 8, height: 100, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, background: '#000' }}>
                    <img src={form.imagen_url} alt="Vista Previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Visibilidad de la Noticia</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Si está activa, se mostrará públicamente a alumnos y tutores.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activa: !form.activa })}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: form.activa ? `${C.green}22` : `${C.yellow}22`,
                    color: form.activa ? C.green : C.yellow,
                    border: `1px solid ${form.activa ? C.green : C.yellow}`
                  }}
                >
                  {form.activa ? '✓ Visible / Activa' : '✕ Oculta / Borrador'}
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={label({ marginBottom: 0 })}>Contenido de la Noticia *</label>
                  <button
                    type="button"
                    onClick={() => setModalIA(true)}
                    style={{ background: 'transparent', border: 'none', color: C.purple, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Sparkles size={12} /> Redactar con IA
                  </button>
                </div>
                <textarea
                  rows={6}
                  placeholder="Escribe aquí los detalles del anuncio, resultados o comunicado..."
                  value={form.contenido}
                  onChange={e => setForm({ ...form, contenido: e.target.value })}
                  style={{ ...input(), resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btn(C.primary)}>
                {saving ? 'Guardando...' : modal === 'new' ? 'Publicar Noticia' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASISTENTE DE IA ── */}
      {modalIA && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.purple}66`, width: 500, maxWidth: '100%', padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.purple}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color={C.purple} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Asistente de Redacción IA</h3>
              </div>
              <button onClick={() => setModalIA(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px', lineHeight: 1.4 }}>
              Ingresa viñetas, notas o el resultado del evento. La Inteligencia Artificial redactará un comunicado claro y entusiasta para la academia.
            </p>

            {/* Quick Prompt Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.faint, display: 'block', width: '100%', fontWeight: 600 }}>Sugerencias rápidas:</span>
              {[
                'Resultado: Victoria Sub-15 3-1 contra Olimpia. Destacados Juan y Lucas.',
                'Aviso: Este viernes no habrá entrenamientos por mantenimiento de cancha.',
                'Convocatoria: Inicio de inscripciones para el Torneo de Verano.'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromptIA(chip)}
                  style={{ padding: '4px 10px', borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
                >
                  {chip.substring(0, 38)}...
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Ej: La categoría 2012 salió campeona del torneo clausura. Felicitaciones al profe Mario y a todos los padres..."
              value={promptIA}
              onChange={e => setPromptIA(e.target.value)}
              style={{ ...input(), marginBottom: 20 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalIA(false)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={generarConIA} disabled={loadingIA} style={btn(C.purple)}>
                {loadingIA ? 'Redactando con IA...' : 'Generar y Aplicar Borrador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VISTA PREVIA DE NOTICIA ── */}
      {previewNoticia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, width: 600, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={badge(previewNoticia.activa ? C.green : C.yellow)}>
                {previewNoticia.activa ? 'Publicada en Portal' : 'Borrador Oculto'}
              </span>
              <button onClick={() => setPreviewNoticia(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {previewNoticia.imagen_url && (
              <div style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 20, border: `1px solid ${C.border}` }}>
                <img src={previewNoticia.imagen_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => e.target.style.display = 'none'} />
              </div>
            )}

            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
              {previewNoticia.fecha_publicacion ? previewNoticia.fecha_publicacion.split('T')[0] : 'Fecha no especificada'}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 16px', lineHeight: 1.3 }}>
              {previewNoticia.titulo}
            </h2>

            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whitespace: 'pre-line', borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {previewNoticia.contenido}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setPreviewNoticia(null)} style={btn(C.primary)}>Cerrar Vista Previa</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMACION ELIMINAR ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.red}66`, width: 420, maxWidth: '100%', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.red}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={24} color={C.red} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: C.text }}>¿Eliminar esta noticia?</h3>
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px' }}>
              «<strong>{deleteConfirm.titulo}</strong>» será eliminada permanentemente y dejará de estar visible en el portal.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={removeNoticia} style={btn(C.red)}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackTab({ notify, apiFetch }: any) {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/academias/feedback/listar');
      setFeedback(res);
    } catch(e:any){ notify(e.message, 'err'); }
    setLoading(false);
  }

  const marcarLeido = async (id: string) => {
    try {
      await apiFetch(`/academias/feedback/${id}/leer`, { method: 'PUT' });
      load();
    } catch(e:any){ notify(e.message, 'err'); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Buzón y Sugerencias</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {loading ? <p>Cargando...</p> : feedback.map((f:any) => (
          <div key={f.id} style={{ ...card(), borderLeft: f.leido ? `1px solid ${C.border}` : `4px solid ${C.primary}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={badge(C.purple)}>{f.tipo.toUpperCase()}</span>
                <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{f.creado_en?.split('T')[0]}</span>
              </div>
              {!f.leido && <button onClick={() => marcarLeido(f.id)} style={btn(C.primary, true)}>Marcar leído</button>}
            </div>
            <h4 style={{ margin: '0 0 5px 0' }}>{f.asunto}</h4>
            <p style={{ margin: '0 0 10px 0', fontSize: 14, color: '#ccc' }}>{f.mensaje}</p>
            <div style={{ fontSize: 12, color: C.faint }}>
              {f.tutor_nombre && <span>Tutor: {f.tutor_nombre} </span>}
              {f.alumno_nombre && <span>| Alumno: {f.alumno_nombre}</span>}
            </div>
          </div>
        ))}
        {!loading && feedback.length === 0 && <p style={{ color: C.muted }}>No hay sugerencias por el momento.</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HORARIOS DE PRÁCTICA TAB
// ═══════════════════════════════════════════════════════════
function HorariosPracticaTab({ categorias = [], sucursales = [], notify, apiFetch, isDueno }: any) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const listCategorias = Array.isArray(categorias) ? categorias : [];
  const listSucursales = Array.isArray(sucursales) ? sucursales : [];
  const [form, setForm] = useState({
    categoria_id: '',
    sub_categoria: '',
    sucursal_id: '',
    cancha_nombre: '',
    dia_semana: 'Lunes',
    hora_inicio: '17:00',
    hora_fin: '18:15',
    mes_inicio_vigencia: 1,
    anio_inicio_vigencia: 2026,
    mes_fin_vigencia: 12,
    anio_fin_vigencia: 2026,
    periodo_vigencia: '2026',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/academia/horarios-practica');
      setHorarios(Array.isArray(res) ? res : []);
    } catch (e: any) { notify(e.message, 'err'); }
    setLoading(false);
  };

  const guardar = async () => {
    if (!form.dia_semana || !form.hora_inicio || !form.hora_fin) {
      return notify('Completa el día y los horarios de inicio y fin.', 'err');
    }
    try {
      await apiFetch('/academia/horarios-practica', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Horario de práctica registrado exitosamente.');
      setModal(false);
      load();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;
    try {
      await apiFetch(`/academia/horarios-practica/${id}`, { method: 'DELETE' });
      notify('Horario eliminado.');
      load();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Horarios de Práctica por Categoría</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>Configura las clases, días, sedes y rangos de vigencia.</p>
        </div>
        <button onClick={() => setModal(true)} style={btn(C.primary)}>
          <Plus size={16} /> Agregar Horario
        </button>
      </div>

      <div style={card()}>
        {loading ? <p style={{ color: C.muted }}>Cargando horarios...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: 'left', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>DÍA</th>
                <th style={{ padding: '10px 12px' }}>CATEGORÍA</th>
                <th style={{ padding: '10px 12px' }}>SUB-CATEGORÍA</th>
                <th style={{ padding: '10px 12px' }}>CANCHA / LOCAL</th>
                <th style={{ padding: '10px 12px' }}>HORARIO</th>
                <th style={{ padding: '10px 12px' }}>PERIODO VIGENCIA</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(horarios) ? horarios : []).map(h => (
                <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>{h.dia_semana}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={badge(h.categoria_color || C.primary)}>
                      {h.categoria_nombre || 'Todas'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: C.muted }}>{h.sub_categoria || '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: C.primary }}>{h.cancha_nombre || 'Sede principal'}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>{h.hora_inicio} - {h.hora_fin}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#0f172a', border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>
                      Vigencia {h.periodo_vigencia || '2026'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button onClick={() => eliminar(h.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!Array.isArray(horarios) || horarios.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: C.muted }}>
                    No hay horarios registrados. Haz clic en "Agregar Horario" para crear uno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 500, padding: 26 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>Nuevo Horario de Práctica</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} style={input()}>
                  <option value="">Seleccionar Categoría</option>
                  {listCategorias.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label()}>Sub-Categoría (opcional)</label>
                <input value={form.sub_categoria} onChange={e => setForm({ ...form, sub_categoria: e.target.value })} placeholder="Ej: 2017" style={input()} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Local / Cancha (opcional)</label>
                <input value={form.cancha_nombre} onChange={e => setForm({ ...form, cancha_nombre: e.target.value })} placeholder="Ej: Cancha María Auxiliadora" style={input()} />
              </div>
              <div>
                <label style={label()}>Día de la Semana</label>
                <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: e.target.value })} style={input()}>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Hora Inicio</label>
                <input value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} placeholder="17:00" style={input()} />
              </div>
              <div>
                <label style={label()}>Hora Fin</label>
                <input value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} placeholder="18:15" style={input()} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label()}>Año Vigencia</label>
                <input type="number" value={form.anio_inicio_vigencia} onChange={e => setForm({ ...form, anio_inicio_vigencia: parseInt(e.target.value), anio_fin_vigencia: parseInt(e.target.value), periodo_vigencia: e.target.value })} style={input()} />
              </div>
              <div>
                <label style={label()}>Etiqueta Vigencia</label>
                <input value={form.periodo_vigencia} onChange={e => setForm({ ...form, periodo_vigencia: e.target.value })} placeholder="2026" style={input()} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardar} style={btn(C.primary)}>Guardar Horario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TARIFAS Y COSTOS TAB
// ═══════════════════════════════════════════════════════════
function TarifasCostosTab({ categorias = [], notify, apiFetch, isDueno, isTesorero }: any) {
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const listCategorias = Array.isArray(categorias) ? categorias : [];
  const [form, setForm] = useState({
    concepto: '',
    tipo_costo: 'cuota_mensual',
    categoria_id: '',
    monto: 180000,
    moneda: 'GS',
    descripcion: '',
    mes_inicio_vigencia: 1,
    anio_inicio_vigencia: 2026,
    mes_fin_vigencia: 12,
    anio_fin_vigencia: 2026,
    periodo_vigencia: '2026',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/academia/tarifas-costos');
      setTarifas(Array.isArray(res) ? res : []);
    } catch (e: any) { notify(e.message, 'err'); }
    setLoading(false);
  };

  const guardar = async () => {
    if (!form.concepto || !form.monto) {
      return notify('Ingresa el concepto y el monto.', 'err');
    }
    try {
      await apiFetch('/academia/tarifas-costos', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Tarifa / costo guardado exitosamente.');
      setModal(false);
      load();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este concepto de costo?')) return;
    try {
      await apiFetch(`/academia/tarifas-costos/${id}`, { method: 'DELETE' });
      notify('Tarifa eliminada.');
      load();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  const formatMonto = (val: number) => new Intl.NumberFormat('es-PY').format(val) + ' GS';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tarifario de Costos e Indumentaria</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>Matrículas, cuotas por categoría e indumentarias publicadas.</p>
        </div>
        <button onClick={() => setModal(true)} style={btn(C.primary)}>
          <Plus size={16} /> Agregar Costo / Tarifa
        </button>
      </div>

      <div style={card()}>
        {loading ? <p style={{ color: C.muted }}>Cargando tarifario...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: 'left', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>CONCEPTO</th>
                <th style={{ padding: '10px 12px' }}>TIPO</th>
                <th style={{ padding: '10px 12px' }}>CATEGORÍA</th>
                <th style={{ padding: '10px 12px' }}>MONTO</th>
                <th style={{ padding: '10px 12px' }}>PERIODO VIGENCIA</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(tarifas) ? tarifas : []).map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: C.text }}>
                    {t.concepto}
                    {t.descripcion && <div style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{t.descripcion}</div>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={badge(t.tipo_costo === 'matricula' ? C.yellow : t.tipo_costo === 'cuota_mensual' ? C.primary : C.purple)}>
                      {t.tipo_costo.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: C.muted }}>{t.categoria_nombre || '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 800, color: C.green, fontSize: 16 }}>{formatMonto(t.monto)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#0f172a', border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>
                      Vigencia {t.periodo_vigencia || '2026'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button onClick={() => eliminar(t.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!Array.isArray(tarifas) || tarifas.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: C.muted }}>
                    No hay tarifas registradas. Haz clic en "Agregar Costo / Tarifa" para crear una.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 480, padding: 26 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>Nuevo Concepto de Costo</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={label()}>Concepto (Ej: Matrícula Inicial, Indumentaria)</label>
              <input value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} placeholder="Ej: Indumentaria Oficial 2026" style={input()} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Tipo de Costo</label>
                <select value={form.tipo_costo} onChange={e => setForm({ ...form, tipo_costo: e.target.value })} style={input()}>
                  <option value="matricula">Matrícula</option>
                  <option value="cuota_mensual">Cuota Mensual</option>
                  <option value="indumentaria">Indumentaria</option>
                  <option value="otro">Otro Gasto</option>
                </select>
              </div>
              <div>
                <label style={label()}>Categoría Asociada (opcional)</label>
                <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} style={input()}>
                  <option value="">Ninguna / General</option>
                  {listCategorias.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.modalidad_nombre ? `[${c.modalidad_nombre}]` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Monto en Guaraníes (GS)</label>
                <input type="number" value={form.monto} onChange={e => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })} style={input()} />
              </div>
              <div>
                <label style={label()}>Año Vigencia</label>
                <input type="number" value={form.anio_inicio_vigencia} onChange={e => setForm({ ...form, anio_inicio_vigencia: parseInt(e.target.value), anio_fin_vigencia: parseInt(e.target.value), periodo_vigencia: e.target.value })} style={input()} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label()}>Descripción breve (opcional)</label>
              <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Kit completo con remera y short" style={input()} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardar} style={btn(C.primary)}>Guardar Concepto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CATEGORÍAS & MODALIDADES TAB
// ═══════════════════════════════════════════════════════════
function CategoriasTab({ categorias = [], sucursales = [], modalidades = [], deportes = [], notify, apiFetch, isAdmin, isDueno, fetchAll }: any) {
  const listCategorias = Array.isArray(categorias) ? categorias : [];
  const listSucursales = Array.isArray(sucursales) ? sucursales : [];
  const listModalidades = Array.isArray(modalidades) ? modalidades : [];

  const [subTab, setSubTab] = useState<'categorias' | 'modalidades'>('categorias');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');

  // Modales
  const [modal, setModal] = useState<any>(null);
  const [modalModalidad, setModalModalidad] = useState<any>(null);

  // Handlers para Categorías
  const abrirNuevo = () => {
    setModal({
      nombre: '',
      edad_min: 5,
      edad_max: 17,
      descripcion: '',
      color: '#3b82f6',
      sucursal_id: listSucursales[0]?.id || '',
      modalidad_id: filtroModalidad && filtroModalidad !== 'sin_modalidad' ? filtroModalidad : '',
    });
  };

  const guardar = async () => {
    if (!modal.nombre || !modal.nombre.trim()) {
      return notify('Ingresá el nombre de la categoría', 'err');
    }
    try {
      if (modal.id) {
        await apiFetch(`/academia/categorias/${modal.id}`, {
          method: 'PUT',
          body: JSON.stringify(modal),
        });
        notify('Categoría actualizada exitosamente.');
      } else {
        await apiFetch('/academia/categorias', {
          method: 'POST',
          body: JSON.stringify(modal),
        });
        notify('Categoría creada exitosamente.');
      }
      setModal(null);
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await apiFetch(`/academia/categorias/${id}`, { method: 'DELETE' });
      notify('Categoría desactivada.');
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  // Handlers para Modalidades
  const abrirNuevaModalidad = () => {
    setModalModalidad({
      nombre: '',
      deporte: listSucursales[0]?.deporte || (deportes && deportes[0]) || '',
      descripcion: '',
      color: '#8b5cf6',
    });
  };

  const guardarModalidad = async () => {
    if (!modalModalidad.nombre || !modalModalidad.nombre.trim()) {
      return notify('Ingresá el nombre de la modalidad', 'err');
    }
    try {
      if (modalModalidad.id) {
        await apiFetch(`/academia/modalidades/${modalModalidad.id}`, {
          method: 'PUT',
          body: JSON.stringify(modalModalidad),
        });
        notify('Modalidad actualizada exitosamente.');
      } else {
        await apiFetch('/academia/modalidades', {
          method: 'POST',
          body: JSON.stringify(modalModalidad),
        });
        notify('Modalidad creada exitosamente.');
      }
      setModalModalidad(null);
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const eliminarModalidad = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta modalidad? Las categorías asignadas seguirán existiendo como independientes.')) return;
    try {
      await apiFetch(`/academia/modalidades/${id}`, { method: 'DELETE' });
      notify('Modalidad desactivada.');
      fetchAll();
    } catch (e: any) {
      notify(e.message, 'err');
    }
  };

  const categoriasFiltradas = listCategorias.filter((cat: any) => {
    if (filtroSucursal && cat.sucursal_id !== filtroSucursal) return false;
    if (filtroModalidad === 'sin_modalidad') return !cat.modalidad_id;
    if (filtroModalidad && cat.modalidad_id !== filtroModalidad) return false;
    return true;
  });

  return (
    <div>
      {/* Selector de Sub-Pestañas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={22} color={C.primary} /> Categorías y Modalidades
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Gestioná las modalidades de práctica (ej: Formas o Combate en Karate, Danza o Libre en Patinaje) y sus categorías asociadas.
          </p>
        </div>

        {/* Switcher de SubTabs */}
        <div style={{ display: 'flex', background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, gap: 4 }}>
          <button
            onClick={() => setSubTab('categorias')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: subTab === 'categorias' ? C.primary : 'transparent',
              color: subTab === 'categorias' ? '#fff' : C.muted,
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
          >
            <Tag size={15} /> Categorías ({listCategorias.length})
          </button>
          <button
            onClick={() => setSubTab('modalidades')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: subTab === 'modalidades' ? C.purple || '#8b5cf6' : 'transparent',
              color: subTab === 'modalidades' ? '#fff' : C.muted,
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
          >
            <Layers size={15} /> Modalidades ({listModalidades.length})
          </button>
        </div>
      </div>

      {/* ════ SUB-TAB: CATEGORÍAS ════ */}
      {subTab === 'categorias' && (
        <>
          {/* Barra de Filtros y Botón Crear */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filtro por Modalidad */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Modalidad:</span>
                <select
                  value={filtroModalidad}
                  onChange={e => setFiltroModalidad(e.target.value)}
                  style={{ ...input(), width: 'auto', minWidth: 170, fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="">Todas las modalidades</option>
                  {listModalidades.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      🥋 {m.nombre} {m.deporte ? `(${m.deporte})` : ''}
                    </option>
                  ))}
                  <option value="sin_modalidad">— Sin modalidad asignada —</option>
                </select>
              </div>

              {/* Filtro por Sucursal */}
              {listSucursales.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Sede:</span>
                  <select
                    value={filtroSucursal}
                    onChange={e => setFiltroSucursal(e.target.value)}
                    style={{ ...input(), width: 'auto', minWidth: 150, fontSize: 12, padding: '6px 10px' }}
                  >
                    <option value="">Todas las sedes</option>
                    {listSucursales.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isAdmin && (
              <button onClick={abrirNuevo} style={btn(C.primary)}>
                <Plus size={16} /> Crear Categoría
              </button>
            )}
          </div>

          {/* Grilla de Categorías */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {categoriasFiltradas.map((cat: any) => (
              <div key={cat.id} style={card({ borderLeft: `6px solid ${cat.color || C.primary}` })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                      <span style={badge(cat.color || C.primary)}>
                        {cat.sucursal_nombre || 'General'}
                      </span>
                      {cat.modalidad_nombre && (
                        <span style={{
                          ...badge(cat.modalidad_color || '#8b5cf6'),
                          background: `${cat.modalidad_color || '#8b5cf6'}20`,
                          border: `1px solid ${cat.modalidad_color || '#8b5cf6'}55`,
                          color: cat.modalidad_color || '#a78bfa',
                          fontWeight: 700
                        }}>
                          🥋 {cat.modalidad_nombre}
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '4px 0', fontSize: 18, fontWeight: 800, color: C.text }}>
                      {cat.nombre}
                    </h3>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModal({ ...cat })} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }} title="Editar categoría">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => eliminar(cat.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }} title="Eliminar categoría">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
                  <div>👥 <strong>Rango de edad:</strong> {cat.edad_min || 0} a {cat.edad_max || 99} años</div>
                  {cat.descripcion && <div style={{ marginTop: 6, fontStyle: 'italic', color: C.faint }}>{cat.descripcion}</div>}
                </div>
              </div>
            ))}

            {categoriasFiltradas.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, color: C.muted }}>
                <Tag size={40} color={C.faint} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No hay categorías {filtroModalidad || filtroSucursal ? 'con los filtros seleccionados' : 'creadas en tu academia'}.</p>
                <p style={{ margin: '6px 0 16px', fontSize: 13, color: C.faint }}>
                  Creá tus categorías para organizar los horarios de práctica, alumnos y cobros.
                </p>
                {isAdmin && (
                  <button onClick={abrirNuevo} style={btn(C.primary)}>
                    <Plus size={16} /> Crear Categoría
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════ SUB-TAB: MODALIDADES (CRUD) ════ */}
      {subTab === 'modalidades' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>
                Modalidades de la Academia ({listModalidades.length})
              </h3>
              <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                Creá las modalidades que correspondan a tus disciplinas (ej: Formas vs. Combate, Libre vs. Danza).
              </p>
            </div>
            {isAdmin && (
              <button onClick={abrirNuevaModalidad} style={btn(C.purple || '#8b5cf6')}>
                <Plus size={16} /> Crear Modalidad
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {listModalidades.map((modItem: any) => (
              <div key={modItem.id} style={card({ borderLeft: `6px solid ${modItem.color || '#8b5cf6'}` })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        ...badge(modItem.color || '#8b5cf6'),
                        background: `${modItem.color || '#8b5cf6'}22`,
                        border: `1px solid ${modItem.color || '#8b5cf6'}55`,
                        color: modItem.color || '#a78bfa',
                        fontWeight: 800
                      }}>
                        🥋 Modalidad
                      </span>
                      {modItem.deporte && (
                        <span style={badge(C.surface)}>
                          {modItem.deporte}
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '4px 0', fontSize: 19, fontWeight: 800, color: C.text }}>
                      {modItem.nombre}
                    </h3>
                  </div>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModalModalidad({ ...modItem })} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }} title="Editar modalidad">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => eliminarModalidad(modItem.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }} title="Desactivar modalidad">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: C.text }}>
                    🏷️ <strong>{modItem.total_categorias || 0}</strong> categorías asociadas
                  </div>
                  {modItem.descripcion && (
                    <div style={{ marginTop: 6, fontStyle: 'italic', color: C.faint, lineHeight: 1.4 }}>
                      {modItem.descripcion}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.border}33`, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setFiltroModalidad(modItem.id);
                      setSubTab('categorias');
                    }}
                    style={{ ...btn(C.surface, true), fontSize: 11, padding: '4px 10px' }}
                  >
                    Ver categorías ({modItem.total_categorias || 0}) →
                  </button>
                </div>
              </div>
            ))}

            {listModalidades.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, color: C.muted }}>
                <Layers size={40} color={C.faint} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No tenés modalidades configuradas todavía.</p>
                <p style={{ margin: '6px 0 16px', fontSize: 13, color: C.faint }}>
                  Creá modalidades como "Formas" o "Combate" para Karate, "Escuela", "Danza" o "Libre" para Patinaje, etc.
                </p>
                {isAdmin && (
                  <button onClick={abrirNuevaModalidad} style={btn(C.purple || '#8b5cf6')}>
                    <Plus size={16} /> Crear primera modalidad
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════ MODAL CREAR / EDITAR CATEGORÍA ════ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 440, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>
              {modal.id ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Nombre de la Categoría *</label>
              <input
                value={modal.nombre}
                onChange={e => setModal({ ...modal, nombre: e.target.value })}
                placeholder="Ej: Categoría 2020 / 2021, Sub-15, Formativa"
                style={input()}
              />
            </div>

            {/* Modalidad Asociada */}
            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Modalidad Deportiva (opcional)</label>
              <select
                value={modal.modalidad_id || ''}
                onChange={e => setModal({ ...modal, modalidad_id: e.target.value })}
                style={input()}
              >
                <option value="">— Ninguna / General —</option>
                {listModalidades.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    🥋 {m.nombre} {m.deporte ? `(${m.deporte})` : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                Asigná esta categoría a una modalidad (ej: Formas, Combate, Danza, Libre, etc.).
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label()}>Edad Mínima</label>
                <input
                  type="number"
                  value={modal.edad_min}
                  onChange={e => setModal({ ...modal, edad_min: parseInt(e.target.value) || 0 })}
                  style={input()}
                />
              </div>
              <div>
                <label style={label()}>Edad Máxima</label>
                <input
                  type="number"
                  value={modal.edad_max}
                  onChange={e => setModal({ ...modal, edad_max: parseInt(e.target.value) || 99 })}
                  style={input()}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label()}>Sede / Sucursal Asociada</label>
                <select
                  value={modal.sucursal_id || ''}
                  onChange={e => setModal({ ...modal, sucursal_id: e.target.value })}
                  style={input()}
                >
                  <option value="">Todas / General</option>
                  {listSucursales.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label()}>Color</label>
                <input
                  type="color"
                  value={modal.color || '#3b82f6'}
                  onChange={e => setModal({ ...modal, color: e.target.value })}
                  style={{ width: '100%', height: 42, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label()}>Descripción (opcional)</label>
              <input
                value={modal.descripcion || ''}
                onChange={e => setModal({ ...modal, descripcion: e.target.value })}
                placeholder="Ej: Niños de 4 a 6 años - Iniciación deportiva"
                style={input()}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardar} style={btn(C.primary)}>Guardar Categoría</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL CREAR / EDITAR MODALIDAD ════ */}
      {modalModalidad && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 440, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>
              {modalModalidad.id ? 'Editar Modalidad Deportiva' : 'Nueva Modalidad Deportiva'}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={label()}>Nombre de la Modalidad *</label>
              <input
                value={modalModalidad.nombre}
                onChange={e => setModalModalidad({ ...modalModalidad, nombre: e.target.value })}
                placeholder="Ej: Formas, Combate, Danza, Libre, Escuela, etc."
                style={input()}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label()}>Deporte / Disciplina (opcional)</label>
                <input
                  value={modalModalidad.deporte || ''}
                  onChange={e => setModalModalidad({ ...modalModalidad, deporte: e.target.value })}
                  placeholder="Ej: Karate, Patinaje, etc."
                  style={input()}
                />
              </div>
              <div>
                <label style={label()}>Color Distintivo</label>
                <input
                  type="color"
                  value={modalModalidad.color || '#8b5cf6'}
                  onChange={e => setModalModalidad({ ...modalModalidad, color: e.target.value })}
                  style={{ width: '100%', height: 42, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label()}>Descripción breve (opcional)</label>
              <input
                value={modalModalidad.descripcion || ''}
                onChange={e => setModalModalidad({ ...modalModalidad, descripcion: e.target.value })}
                placeholder="Ej: Katas y técnicas tradicionales de Karate"
                style={input()}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalModalidad(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardarModalidad} style={btn(C.purple || '#8b5cf6')}>
                {modalModalidad.id ? 'Actualizar Modalidad' : 'Guardar Modalidad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TUTORES / PADRES TAB
// ═══════════════════════════════════════════════════════════
function TutoresTab({ tutores = [], alumnos = [], notify, apiFetch, isAdmin, fetchAll }: any) {
  const listTutores = Array.isArray(tutores) ? tutores : [];
  const listAlumnos = Array.isArray(alumnos) ? alumnos : [];
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const abrirNuevo = () => {
    setModal({
      id: 'new',
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      vinculo: 'Padre',
      es_pagador: true,
      alumno_id: listAlumnos[0]?.id || '',
    });
  };

  const openEdit = (t: any) => {
    setModal({
      id: t.id,
      nombre: t.nombre || '',
      apellido: t.apellido || '',
      telefono: t.telefono || '',
      email: t.email || '',
      vinculo: t.vinculo || 'Padre',
      es_pagador: t.es_pagador !== false,
      alumno_id: '',
    });
  };

  const guardar = async () => {
    if (!modal.nombre || !modal.nombre.trim()) {
      return notify('Ingresá el nombre del tutor', 'err');
    }
    setSaving(true);
    try {
      if (modal.id === 'new') {
        await apiFetch('/academia/tutores', {
          method: 'POST',
          body: JSON.stringify(modal),
        });
        notify('Tutor registrado exitosamente.');
      } else {
        await apiFetch(`/academia/tutores/${modal.id}`, {
          method: 'PUT',
          body: JSON.stringify(modal),
        });
        notify('Tutor actualizado exitosamente.');
      }
      setModal(null);
      fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const removeTutor = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/academia/tutores/${deleteConfirm.id}`, { method: 'DELETE' });
      notify('Tutor eliminado exitosamente.');
      setDeleteConfirm(null);
      fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tutores y Padres de Familia</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Registro de padres o responsables de los alumnos para contacto y facturación de cuotas.
          </p>
        </div>
        {isAdmin && (
          <button onClick={abrirNuevo} style={btn(C.primary)}>
            <Plus size={16} /> Registrar Tutor
          </button>
        )}
      </div>

      <div style={card()}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: 'left', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>NOMBRE COMPLETO</th>
              <th style={{ padding: '10px 12px' }}>VÍNCULO</th>
              <th style={{ padding: '10px 12px' }}>TELÉFONO</th>
              <th style={{ padding: '10px 12px' }}>EMAIL</th>
              <th style={{ padding: '10px 12px' }}>ALUMNOS A CARGO</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {listTutores.map(t => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>
                  {t.nombre} {t.apellido}
                  {t.es_pagador && <span style={{ marginLeft: 6, ...badge(C.green) }}>Pagador Principal</span>}
                </td>
                <td style={{ padding: '12px' }}><span style={badge(C.primary)}>{t.vinculo || 'Tutor'}</span></td>
                <td style={{ padding: '12px', fontWeight: 600, color: C.text }}>
                  {t.telefono ? (
                    <a href={`https://wa.me/${t.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ color: C.green, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PhoneCall size={14} /> {t.telefono}
                    </a>
                  ) : '—'}
                </td>
{/* ... */}
                <td style={{ padding: '12px', color: C.muted }}>{t.email || '—'}</td>
                <td style={{ padding: '12px', fontWeight: 600, color: C.text }}>{t.alumnos_vinculados || 'Sin alumnos'}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {t.telefono && (
                      <a href={`https://wa.me/${t.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(C.green, true), padding: '6px 10px', fontSize: 12 }}>
                        WhatsApp
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(t)} title="Editar tutor" style={{ ...btn(C.primary, true), padding: '6px 10px', fontSize: 12 }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteConfirm(t)} title="Eliminar tutor" style={{ ...btn(C.red, true), padding: '6px 10px', fontSize: 12 }}>
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {listTutores.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: C.muted }}>
                  No hay tutores registrados. Hacé clic en "Registrar Tutor" para agregar uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 460, padding: 26 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>
              {modal.id === 'new' ? 'Registrar Tutor / Padre' : 'Editar Tutor / Padre'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Nombre *</label>
                <input value={modal.nombre} onChange={e => setModal({ ...modal, nombre: e.target.value })} placeholder="Ej: Juan" style={input()} />
              </div>
              <div>
                <label style={label()}>Apellido</label>
                <input value={modal.apellido} onChange={e => setModal({ ...modal, apellido: e.target.value })} placeholder="Ej: Pérez" style={input()} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label()}>Teléfono / WhatsApp *</label>
                <input value={modal.telefono} onChange={e => setModal({ ...modal, telefono: e.target.value })} placeholder="0981 123456" style={input()} />
              </div>
              <div>
                <label style={label()}>Vínculo</label>
                <select value={modal.vinculo} onChange={e => setModal({ ...modal, vinculo: e.target.value })} style={input()}>
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Tutor Legal">Tutor Legal</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label()}>Email (opcional)</label>
              <input value={modal.email} onChange={e => setModal({ ...modal, email: e.target.value })} placeholder="tutor@ejemplo.com" style={input()} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label()}>{modal.id === 'new' ? 'Asignar Alumno Inicial (opcional)' : 'Vincular a Alumno (opcional)'}</label>
              <select value={modal.alumno_id} onChange={e => setModal({ ...modal, alumno_id: e.target.value })} style={input()}>
                <option value="">Ninguno por ahora</option>
                {listAlumnos.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={btn(C.primary)}>
                {saving ? 'Guardando...' : modal.id === 'new' ? 'Guardar Tutor' : 'Actualizar Tutor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.red}66`, width: 420, maxWidth: '100%', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.red}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={24} color={C.red} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: C.text }}>¿Eliminar este tutor?</h3>
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px' }}>
              «<strong>{deleteConfirm.nombre} {deleteConfirm.apellido}</strong>» será eliminado permanentemente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn(C.faint, true)}>Cancelar</button>
              <button onClick={removeTutor} style={btn(C.red)}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REPORTES Y CARNETS TAB
// ═══════════════════════════════════════════════════════════
function ReportesTab({ perfil, sucursales = [], categorias = [], notify, apiFetch }: any) {
  const [subTab, setSubTab] = useState<'alumnos' | 'deudores' | 'carnets' | 'cobranzas'>('alumnos');
  const [reporteAlumnos, setReporteAlumnos] = useState<any[]>([]);
  const [deudores, setDeudores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [modalCarnet, setModalCarnet] = useState<any>(null);
  const carnetFotoRef = useRef<HTMLInputElement>(null);

  // Estados de Cobranzas Mensuales y Anuales
  const [anioCobranzas, setAnioCobranzas] = useState(new Date().getFullYear());
  const [reporteCobranzas, setReporteCobranzas] = useState<any>(null);
  const [loadingCobranzas, setLoadingCobranzas] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [al, de] = await Promise.all([
        apiFetch('/academia/reportes/alumnos').catch(() => []),
        apiFetch('/academia/reportes/deudores').catch(() => []),
      ]);
      setReporteAlumnos(Array.isArray(al) ? al : []);
      setDeudores(Array.isArray(de) ? de : []);
    } catch (e: any) { notify(e.message, 'err'); }
    setLoading(false);
  };

  const cargarCobranzas = async (anio: number) => {
    setLoadingCobranzas(true);
    try {
      const data = await apiFetch(`/academia/reportes/cobranzas-anuales?anio=${anio}`);
      setReporteCobranzas(data);
    } catch (err: any) {
      notify(err.message || 'Error al cargar reporte de cobranzas', 'err');
    } finally {
      setLoadingCobranzas(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const imprimirReporte = (tipo: string) => {
    if (tipo === 'alumnos') {
      setSubTab('alumnos');
      setTimeout(() => window.print(), 250);
    } else if (tipo === 'deudores') {
      setSubTab('deudores');
      setTimeout(() => window.print(), 250);
    } else if (tipo === 'carnets') {
      setSubTab('carnets');
    } else if (tipo === 'cobranzas') {
      setSubTab('cobranzas');
      cargarCobranzas(anioCobranzas);
      setTimeout(() => window.print(), 350);
    } else if (tipo === 'asistencias') {
      setSubTab('alumnos');
      setTimeout(() => window.print(), 250);
    } else {
      window.print();
    }
  };

  const handleCarnetFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modalCarnet) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch(`/academia/alumnos/${modalCarnet.id}/foto`, {
        method: 'POST',
        body: formData,
      });
      const photoUrl = res.url || (await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }));

      setModalCarnet((prev: any) => ({ ...prev, foto_perfil: photoUrl }));
      setReporteAlumnos((prev: any[]) => prev.map((a: any) => a.id === modalCarnet.id ? { ...a, foto_perfil: photoUrl } : a));
      notify('Foto del carnet actualizada exitosamente');
    } catch (err: any) {
      notify(err.message || 'Error al guardar la foto del carnet', 'err');
    }
  };

  const reclamarWhatsApp = (d: any) => {
    if (!d.tutor_telefono) {
      return notify('El alumno/tutor no tiene número de teléfono registrado.', 'err');
    }
    const tel = d.tutor_telefono.replace(/\D/g, '');
    const msg = `Estimado/a ${d.tutor_nombre || 'Tutor'},\nLe saludamos de la academia *${perfil?.nombre || 'Academia'}*.\nLe recordamos que cuenta con un saldo pendiente de *${new Intl.NumberFormat('es-PY').format(d.monto)} GS* correspondiente al concepto de *${d.concepto}* para el alumno *${d.alumno_nombre}*.\n\nQuedamos a su disposición para coordinar el pago.\nMuchas gracias!`;
    window.open(`https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const totalMorosoGs = deudores.reduce((acc, d) => acc + (d.monto || 0), 0);
  const alumnosFiltrados = reporteAlumnos.filter(a => !filtroSucursal || a.sucursal_nombre === filtroSucursal);

  return (
    <div>
      {/* ── SECTOR CABECERA / SUBTABS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Centro de Reportes y Credenciales</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Reporte de alumnos, control de cartera morosa, cobranzas anuales y emisión de carnets impresos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={imprimir} style={btn(C.surface, true)}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ── TARJETA: MÓDULO DE IMPRESIÓN DE REPORTES ── */}
      <div style={{ ...card(), marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Printer size={18} color={C.primary} /> Impresión de Reportes Oficiales
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              Generación de planillas impresas, reportes contables y credenciales descargables en PDF.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            { id: 'alumnos', label: 'Planilla Consolidada de Alumnos', desc: 'Listado por sede, categoría y contactos de emergencia', icon: ClipboardList, color: C.primary },
            { id: 'cobranzas', label: 'Balance Anual de Cobranzas', desc: 'Comparativa mes a mes de facturado vs recaudado', icon: BarChart3, color: C.green },
            { id: 'deudores', label: 'Informe de Cartera Morosa', desc: 'Detalle de cuotas vencidas y saldos pendientes por cobro', icon: AlertCircle, color: C.red },
            { id: 'carnets', label: 'Carnets y Credenciales Oficiales', desc: 'Emisión e impresión masiva de carnets con QR de alumnos', icon: QrCode, color: C.purple },
          ].map(rep => (
            <div key={rep.id} style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, borderRadius: 8, background: `${rep.color}15`, color: rep.color, display: 'flex' }}>
                  <rep.icon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{rep.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{rep.desc}</div>
                </div>
              </div>
              <button onClick={() => imprimirReporte(rep.id)} style={{ ...btn(rep.color, true), padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                <Printer size={13} /> Imprimir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subtabs Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('alumnos')}
          style={{ ...btn(subTab === 'alumnos' ? C.primary : 'transparent', subTab !== 'alumnos'), borderRadius: 20 }}
        >
          📋 Listado de Alumnos ({alumnosFiltrados.length})
        </button>

        <button
          onClick={() => { setSubTab('cobranzas'); cargarCobranzas(anioCobranzas); }}
          style={{ ...btn(subTab === 'cobranzas' ? C.green : 'transparent', subTab !== 'cobranzas'), borderRadius: 20 }}
        >
          📊 Cobranzas Mensuales y Anuales
        </button>

        <button
          onClick={() => setSubTab('deudores')}
          style={{ ...btn(subTab === 'deudores' ? C.red : 'transparent', subTab !== 'deudores'), borderRadius: 20 }}
        >
          ⚠️ Reporte de Deudores ({deudores.length})
        </button>

        <button
          onClick={() => setSubTab('carnets')}
          style={{ ...btn(subTab === 'carnets' ? C.purple : 'transparent', subTab !== 'carnets'), borderRadius: 20 }}
        >
          🪪 Emisión de Carnets ({reporteAlumnos.length})
        </button>
      </div>

      {/* ── SECCIÓN 1: LISTADO DE ALUMNOS ── */}
      {subTab === 'alumnos' && (
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Planilla Consolidada de Alumnos</h3>
            <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)} style={{ ...input(), width: 220 }}>
              <option value="">Todas las Sedes</option>
              {sucursales.map((s: any) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: 'left', fontSize: 12 }}>
                <th style={{ padding: '10px' }}>ALUMNO</th>
                <th style={{ padding: '10px' }}>SEDE</th>
                <th style={{ padding: '10px' }}>CATEGORÍA</th>
                <th style={{ padding: '10px' }}>TUTOR RESPONSABLE</th>
                <th style={{ padding: '10px' }}>TELÉFONO CONTACTO</th>
                <th style={{ padding: '10px' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: C.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', background: C.border, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {a.foto_perfil ? <img src={a.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={18} color={C.muted} />}
                      </div>
                      <div>{a.nombre_completo}</div>
                    </div>
                  </td>
                  <td style={{ padding: '10px', color: C.muted }}>{a.sucursal_nombre}</td>
                  <td style={{ padding: '10px' }}><span style={badge(a.categoria_color)}>{a.categoria_nombre}</span></td>
                  <td style={{ padding: '10px', color: C.text }}>{a.tutor_nombre}</td>
                  <td style={{ padding: '10px', color: C.green, fontWeight: 600 }}>{a.tutor_telefono || a.contacto_emergencia}</td>
                  <td style={{ padding: '10px' }}><span style={badge(a.estado === 'activo' ? C.green : C.red)}>{a.estado.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECCIÓN 2: LISTADO DE DEUDORES / MOROSOS ── */}
      {subTab === 'deudores' && (
        <div>
          <div style={{ ...card(), marginBottom: 16, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted }}>Total Cartera Pendiente / Morosa:</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{new Intl.NumberFormat('es-PY').format(totalMorosoGs)} GS</div>
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{deudores.length} concepto(s) por cobrar</div>
          </div>

          <div style={card()}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '10px' }}>ALUMNO</th>
                  <th style={{ padding: '10px' }}>CATEGORÍA</th>
                  <th style={{ padding: '10px' }}>CONCEPTO PENDIENTE</th>
                  <th style={{ padding: '10px' }}>MONTO</th>
                  <th style={{ padding: '10px' }}>TUTOR RESPONSABLE</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>ACCIÓN RECLAMO</th>
                </tr>
              </thead>
              <tbody>
                {deudores.map(d => (
                  <tr key={d.cuota_id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <td style={{ padding: '10px', fontWeight: 800, color: C.text }}>{d.alumno_nombre}</td>
                    <td style={{ padding: '10px' }}><span style={badge(C.primary)}>{d.categoria_nombre}</span></td>
                    <td style={{ padding: '10px', color: C.yellow, fontWeight: 700 }}>{d.concepto}</td>
                    <td style={{ padding: '10px', fontWeight: 900, color: C.red, fontSize: 15 }}>{new Intl.NumberFormat('es-PY').format(d.monto)} GS</td>
                    <td style={{ padding: '10px', color: C.text }}>{d.tutor_nombre}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button onClick={() => reclamarWhatsApp(d)} style={btn(C.green)}>
                        📲 Reclamar Pago
                      </button>
                    </td>
                  </tr>
                ))}
                {deudores.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: C.muted }}>
                      🎉 ¡Excelente! No hay cuotas ni saldos pendientes de cobro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECCIÓN 3: EMISIÓN DE CARNETS DEPORTIVOS ── */}
      {subTab === 'carnets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {reporteAlumnos.map(a => (
            <div key={a.id} style={card({ textAlign: 'center', position: 'relative' })}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: C.border, margin: '0 auto 10px',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `3px solid ${perfil?.color_primario || C.primary}`,
              }}>
                {a.foto_perfil ? <img src={a.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={32} color={C.muted} />}
              </div>

              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: C.text }}>{a.nombre_completo}</h4>
              <span style={badge(a.categoria_color)}>{a.categoria_nombre}</span>

              <div style={{ margin: '14px 0 0' }}>
                <button onClick={() => setModalCarnet(a)} style={{ ...btn(C.purple), width: '100%', justifyContent: 'center' }}>
                  <QrCode size={15} /> Ver & Imprimir Carnet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}



      {/* ── MODAL VER E IMPRIMIR CARNET ── */}
      {modalCarnet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ background: '#090d16', borderRadius: 24, border: `2px solid ${perfil?.color_primario || C.primary}`, width: 420, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.8)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Carnet Oficial de Alumno</h3>
              <button onClick={() => setModalCarnet(null)} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Credencial Impresa Design */}
            <div style={{
              background: `linear-gradient(135deg, ${perfil?.color_primario || C.primary} 0%, #090d16 100%)`,
              borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden',
            }}>
              {/* Header Carnet */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {perfil?.logo_url ? <img src={perfil.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={24} color="#000" />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>{perfil?.nombre || 'Academia'}</h4>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>CREDENCIAL DEPORTIVA OFICIAL</div>
                </div>
              </div>

              {/* Body Carnet */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 90, height: 90, borderRadius: 14, background: '#000', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {modalCarnet.foto_perfil ? <img src={modalCarnet.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={44} color="#fff" />}
                  </div>
                  <input type="file" ref={carnetFotoRef} accept="image/*" onChange={handleCarnetFotoChange} style={{ display: 'none' }} />
                  <button onClick={() => carnetFotoRef.current?.click()} style={{ position: 'absolute', bottom: -6, right: -6, background: C.primary, border: '1px solid #fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }} title="Subir / Cambiar foto del alumno">
                    <Upload size={12} />
                  </button>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{modalCarnet.nombre_completo}</div>
                  <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 4 }}>Categoría: {modalCarnet.categoria_nombre}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>Sede: {modalCarnet.sucursal_nombre}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>Grupo Sanguíneo: <strong>{modalCarnet.tipo_sangre || 'O+'}</strong></div>
                </div>
              </div>

              {/* Footer Carnet QR */}
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
                <div>ID: {modalCarnet.id.substring(0,8).toUpperCase()}</div>
                <div>Emergencias: {modalCarnet.tutor_telefono || modalCarnet.contacto_emergencia}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalCarnet(null)} style={btn(C.faint, true)}>Cerrar</button>
              <button onClick={imprimir} style={btn(C.green)}>
                <Printer size={16} /> Imprimir Credencial (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SECCIÓN 4: INFORMES MENSUALES Y ANUALES DE COBRANZAS ── */}
      {subTab === 'cobranzas' && (
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>
                📊 Balance Anual y Mensual de Cobranzas
              </h3>
              <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
                Resumen comparativo mes a mes de cuotas emitidas vs efectivamente cobradas y tasa de efectividad.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ ...label({ marginBottom: 0 }), fontSize: 12 }}>Año fiscal:</label>
              <select
                value={anioCobranzas}
                onChange={e => {
                  const val = Number(e.target.value);
                  setAnioCobranzas(val);
                  cargarCobranzas(val);
                }}
                style={{ ...input({ width: 120 }), fontWeight: 700 }}
              >
                {[2027, 2026, 2025, 2024].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button onClick={() => cargarCobranzas(anioCobranzas)} style={{ ...btn(C.primary, true), padding: '8px 12px' }}>
                <RefreshCw size={14} /> Recargar
              </button>
            </div>
          </div>

          {loadingCobranzas ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <p>Consolidando cobranzas del año {anioCobranzas}...</p>
            </div>
          ) : reporteCobranzas ? (
            <div>
              {/* Tarjetas KPI Anuales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}33`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>TOTAL FACTURADO / EMITIDO</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 4 }}>
                    Gs. {(reporteCobranzas.totales_anuales?.total_facturado || 0).toLocaleString('es-PY')}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {reporteCobranzas.totales_anuales?.cuotas_emitidas || 0} cuotas emitidas en el año
                  </div>
                </div>

                <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}33`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>TOTAL COBRADO / RECAUDADO</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.green, marginTop: 4 }}>
                    Gs. {(reporteCobranzas.totales_anuales?.total_cobrado || 0).toLocaleString('es-PY')}
                  </div>
                  <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>
                    {reporteCobranzas.totales_anuales?.cuotas_cobradas || 0} cuotas cobradas
                  </div>
                </div>

                <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>SALDO PENDIENTE / MOROSO</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.red, marginTop: 4 }}>
                    Gs. {(reporteCobranzas.totales_anuales?.total_pendiente || 0).toLocaleString('es-PY')}
                  </div>
                  <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>
                    Por cobrar en el ejercicio
                  </div>
                </div>

                <div style={{ background: `${C.purple}15`, border: `1px solid ${C.purple}33`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>EFECTIVIDAD DE COBRANZA</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.purple, marginTop: 4 }}>
                    {reporteCobranzas.totales_anuales?.porcentaje_efectividad || 0}%
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    Ratio cobrado vs facturado
                  </div>
                </div>
              </div>

              {/* Tabla Comparativa Mes a Mes (12 meses) */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>
                  EVOLUCIÓN MENSUAL ({anioCobranzas})
                </h4>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: `${C.bg}bb`, borderBottom: `1px solid ${C.border}` }}>
                        {['Mes', 'Cuotas Emitidas', 'Facturado (Gs.)', 'Cuotas Cobradas', 'Cobrado (Gs.)', 'Pendiente (Gs.)', '% Efectividad'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 700, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reporteCobranzas.meses || []).map((m: any) => {
                        const efect = m.porcentaje_efectividad || 0;
                        const efectColor = efect >= 80 ? C.green : efect >= 50 ? C.yellow : m.total_facturado > 0 ? C.red : C.faint;
                        return (
                          <tr key={m.mes} style={{ borderBottom: `1px solid ${C.border}33` }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>{m.nombre_mes}</td>
                            <td style={{ padding: '10px 14px', color: C.muted }}>{m.cuotas_emitidas}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>Gs. {(m.total_facturado || 0).toLocaleString('es-PY')}</td>
                            <td style={{ padding: '10px 14px', color: C.green }}>{m.cuotas_cobradas}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>Gs. {(m.total_cobrado || 0).toLocaleString('es-PY')}</td>
                            <td style={{ padding: '10px 14px', color: m.total_pendiente > 0 ? C.red : C.faint, fontWeight: m.total_pendiente > 0 ? 700 : 400 }}>
                              Gs. {(m.total_pendiente || 0).toLocaleString('es-PY')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                                background: `${efectColor}20`, color: efectColor, border: `1px solid ${efectColor}44`
                              }}>
                                {efect}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Desglose por Categoría / Deporte si existen pagos */}
              {reporteCobranzas.por_categoria && reporteCobranzas.por_categoria.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>
                    RECAUDACIÓN POR CATEGORÍA / DEPORTE
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {reporteCobranzas.por_categoria.map((cat: any) => (
                      <div key={cat.categoria_id || cat.categoria} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{cat.categoria}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{cat.deporte} · {cat.sucursal}</div>
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: C.muted }}>{cat.cantidad_pagos} cobros</span>
                          <span style={{ fontWeight: 800, color: C.green, fontSize: 14 }}>Gs. {(cat.total_recaudado || 0).toLocaleString('es-PY')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: C.faint }}>
              No hay datos financieros registrados para el año {anioCobranzas}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// FACTURACIÓN ELECTRÓNICA SIFEN / .P12 TAB
// ═══════════════════════════════════════════════════════════
function SifenTab({ perfil, notify, apiFetch, abrirFactura }: any) {
  const [emisor, setEmisor] = useState<any>({});
  const [emisorStatus, setEmisorStatus] = useState<any>({});
  const [certPassword, setCertPassword] = useState('');
  const [documentosSifen, setDocumentosSifen] = useState<any[]>([]);
  const [savingSifen, setSavingSifen] = useState(false);
  const [loading, setLoading] = useState(true);
  const p12FileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSifenData();
  }, []);

  const loadSifenData = async () => {
    setLoading(true);
    try {
      const [st, em, docs] = await Promise.all([
        apiFetch('/academia/facturacion/emisor/status').catch(() => ({})),
        apiFetch('/academia/facturacion/emisor').catch(() => ({})),
        apiFetch('/academia/facturacion/documentos').catch(() => []),
      ]);
      setEmisorStatus(st || {});
      setEmisor(em || {});
      setDocumentosSifen(Array.isArray(docs) ? docs : []);
    } catch (e: any) {
      console.error('Error al cargar datos SIFEN:', e);
    } finally {
      setLoading(false);
    }
  };

  const guardarEmisor = async () => {
    setSavingSifen(true);
    try {
      await apiFetch('/academia/facturacion/emisor', {
        method: 'POST',
        body: JSON.stringify(emisor),
      });
      notify('Configuración de Emisor SIFEN guardada exitosamente');
      loadSifenData();
    } catch (e: any) {
      notify(e.message || 'Error al guardar emisor', 'err');
    }
    setSavingSifen(false);
  };

  const subirP12 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.p12')) {
      notify('Solo se aceptan archivos de certificado con extensión .p12', 'err');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/academia/facturacion/emisor/certificado', {
        method: 'POST',
        body: formData,
      });
      notify(res.message || 'Certificado .p12 subido correctamente');
      loadSifenData();
    } catch (e: any) {
      notify(e.message || 'Error al subir certificado .p12', 'err');
    }
  };

  const guardarPasswordP12 = async () => {
    if (!certPassword.trim()) {
      notify('Ingrese la contraseña del certificado .p12', 'err');
      return;
    }
    try {
      await apiFetch('/academia/facturacion/emisor/certificado/password', {
        method: 'PUT',
        body: JSON.stringify({ password: certPassword }),
      });
      notify('Contraseña del certificado .p12 guardada correctamente');
      setCertPassword('');
      loadSifenData();
    } catch (e: any) {
      notify(e.message || 'Error al guardar contraseña del certificado', 'err');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── SECTOR CABECERA SIFEN ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} color={C.yellow} /> Facturación Electrónica SIFEN / .P12
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Integración oficial con el Sistema Integrado de Facturación Electrónica Nacional (SIFEN - SET Paraguay).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadSifenData} disabled={loading} style={btn(C.surface, true)}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Cargando...' : 'Actualizar Estado'}
          </button>
        </div>
      </div>

      {/* Card 1: Estado del Sistema y Carga de Certificado .P12 */}
      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={C.yellow} /> Estado del Emisor y Certificado Digital (.P12)
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              Gestión del Certificado Firma Digital PKCS#12 y contraseña para e-Kuatia / SIFEN SET Paraguay.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={badge(emisorStatus?.configurado ? C.green : C.red)}>
              {emisorStatus?.configurado ? '✅ RUC Emisor Configurado' : '⚠️ RUC Pendiente'}
            </span>
            <span style={badge(emisorStatus?.tiene_certificado_activo ? C.green : C.red)}>
              {emisorStatus?.tiene_certificado_activo ? '🔐 Certificado .P12 Activo' : '❌ Sin Certificado .P12'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Carga de Archivo .P12 */}
          <div style={{ background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.text }}>
              1. Cargar Certificado Digital (.p12)
            </h4>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Suba el archivo <code>.p12</code> proveído por la autoridad certificadora (CODE10, E-Sign, etc.).
            </p>
            <input type="file" ref={p12FileRef} accept=".p12" onChange={subirP12} style={{ display: 'none' }} />
            <button onClick={() => p12FileRef.current?.click()} style={btn(C.primary)}>
              <Upload size={14} /> Seleccionar y Subir Archivo .P12
            </button>
          </div>

          {/* Contraseña del Certificado .P12 */}
          <div style={{ background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.text }}>
              2. Contraseña de la Firma Digital
            </h4>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              {emisorStatus?.tiene_password_cert ? '✅ Contraseña almacenada y cifrada correctamente.' : '⚠️ Ingrese la clave secreta de su archivo .p12 para firmar facturas.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                placeholder="Contraseña del .p12"
                value={certPassword}
                onChange={e => setCertPassword(e.target.value)}
                style={{ ...input(), flex: 1 }}
              />
              <button onClick={guardarPasswordP12} style={btn(C.yellow)}>
                <Lock size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Configuración de Datos Contribuyente SIFEN */}
      <div style={card()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color={C.primary} /> Datos del Emisor (Academia Contribuyente SET)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="RUC con DV *" value={emisor.ruc_con_dv || ''} onChange={(v: any) => setEmisor((e: any) => ({ ...e, ruc_con_dv: v }))} placeholder="80012345-6" />
          <FormField label="Razón Social *" value={emisor.razon_social || ''} onChange={(v: any) => setEmisor((e: any) => ({ ...e, razon_social: v }))} placeholder="Academia Deportiva S.A." />
          <FormField label="Nombre de Fantasía" value={emisor.nombre_fantasia || ''} onChange={(v: any) => setEmisor((e: any) => ({ ...e, nombre_fantasia: v }))} placeholder="Club Olimpia / Mi Cancha" />
          <FormField label="Timbrado *" value={emisor.d_num_tim || ''} onChange={(v: any) => setEmisor((e: any) => ({ ...e, d_num_tim: v }))} placeholder="12345678" />
          <FormField label="Establecimiento" value={emisor.d_est || '001'} onChange={(v: any) => setEmisor((e: any) => ({ ...e, d_est: v }))} placeholder="001" />
          <FormField label="Punto de Expedición" value={emisor.d_pun_exp || '001'} onChange={(v: any) => setEmisor((e: any) => ({ ...e, d_pun_exp: v }))} placeholder="001" />
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardarEmisor} disabled={savingSifen} style={btn(C.primary)}>
            {savingSifen ? 'Guardando...' : '💾 Guardar Datos de Emisor'}
          </button>
        </div>
      </div>

      {/* Card 3: Historial de Facturas Electrónicas & Prevención de Duplicados */}
      <div style={card()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color={C.green} /> Facturas Electrónicas Emitidas ({documentosSifen.length})
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              🛡️ <strong>Control Anti-Duplicado:</strong> El sistema impide generar más de una factura por cada cuota o matrícula pagada.
            </p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>N° COMPROBANTE</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>CDC (CÓDIGO CONTROL)</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>RECEPTOR / TUTOR</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>MONTO TOTAL</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ESTADO</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {documentosSifen.map((doc: any) => (
              <tr key={doc.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <td style={{ padding: '10px', fontWeight: 800, color: C.text }}>{doc.numero_documento}</td>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: 11, color: C.muted }}>{doc.cdc || 'En proceso'}</td>
                <td style={{ padding: '10px', color: C.text }}>{doc.receptor_nombre} ({doc.receptor_ruc || 'Sin RUC'})</td>
                <td style={{ padding: '10px', fontWeight: 800, color: C.green }}>{new Intl.NumberFormat('es-PY').format(doc.d_tot_gral_ope || 0)} GS</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={badge(doc.estado === 'firmado' ? C.green : doc.estado === 'anulado' ? C.red : C.yellow)}>
                    {doc.estado}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => abrirFactura && abrirFactura(doc.id)}
                      style={{ ...btn(C.primary, true), fontSize: 11, padding: '5px 10px' }}
                      title="Imprimir Representación Gráfica KuDE"
                    >
                      <Printer size={12} /> KuDE
                    </button>
                    <a
                      href={`${API_URL}/academia/facturacion/documentos/${doc.id}/xml`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...btn(C.surface, true), fontSize: 11, padding: '5px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title="Descargar XML firmado SIFEN"
                    >
                      <FileText size={12} /> XML
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {documentosSifen.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: C.muted }}>
                  Aún no se han emitido facturas electrónicas en esta academia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TESORERÍA — Cuentas, Métodos de Pago, Movimientos y Cierre de Caja
// ═══════════════════════════════════════════════════════════
function TesoreriaTab({ notify, apiFetch, isDueno, isTesorero, cuentas, setCuentas, metodosPago, setMetodosPago, fetchAll }: any) {
  const [subTab, setSubTab] = useState<'compras' | 'proveedores' | 'cuentas' | 'metodos' | 'movimientos' | 'cierre'>('compras');

  const hoyStr = new Date().toISOString().split('T')[0];
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // ── Estado Compras y Gastos ──
  const [compras, setCompras] = useState<any[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [resumenCompras, setResumenCompras] = useState<any>(null);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalPagarCompra, setModalPagarCompra] = useState<any>(null);
  const [savingCompra, setSavingCompra] = useState(false);
  const [savingPagoCompra, setSavingPagoCompra] = useState(false);

  const [filtroCompraEstado, setFiltroCompraEstado] = useState('');
  const [filtroCompraCondicion, setFiltroCompraCondicion] = useState('');
  const [filtroCompraCategoria, setFiltroCompraCategoria] = useState('');
  const [filtroCompraBusqueda, setFiltroCompraBusqueda] = useState('');

  const [compraForm, setCompraForm] = useState<any>({
    proveedor_id: '',
    proveedor_nombre: '',
    tipo: 'gasto_operativo',
    categoria: 'alquiler_pista',
    concepto: '',
    monto_total: '',
    condicion_pago: 'contado',
    fecha_emision: hoyStr,
    fecha_vencimiento: '',
    comprobante_nro: '',
    cuenta_id: cuentas[0]?.id || '',
    metodo_pago_id: '',
    notas: '',
  });

  const [pagoCompraForm, setPagoCompraForm] = useState<any>({
    monto: '',
    cuenta_id: cuentas[0]?.id || '',
    metodo_pago_id: '',
    fecha: hoyStr,
    notas: '',
  });

  // ── Estado Proveedores ──
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [modalProveedor, setModalProveedor] = useState<any>(null);
  const [savingProveedor, setSavingProveedor] = useState(false);
  const [proveedorForm, setProveedorForm] = useState<any>({
    nombre: '', ruc_ci: '', telefono: '', email: '', categoria_frecuente: 'alquiler_pista', direccion: '', notas: ''
  });

  // ── Estado Cuentas ──
  const [modalCuenta, setModalCuenta] = useState<any>(null);
  const [cuentaForm, setCuentaForm] = useState<any>({ nombre: '', tipo: 'efectivo', descripcion: '', numero_cuenta: '', banco: '', moneda: 'GS', es_principal: false, saldo_inicial: 0 });
  const [savingCuenta, setSavingCuenta] = useState(false);

  // ── Estado Métodos de Pago ──
  const [modalMetodo, setModalMetodo] = useState<any>(null);
  const [metodoForm, setMetodoForm] = useState<any>({ nombre: '', tipo: 'efectivo', descripcion: '' });
  const [savingMetodo, setSavingMetodo] = useState(false);

  // ── Estado Movimientos ──
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [egresoForm, setEgresoForm] = useState<any>({ cuenta_id: '', metodo_pago_id: '', categoria: 'alquiler_pista', concepto: '', monto: '', fecha: '', referencia: '', notas: '' });
  const [filtroMovCuenta, setFiltroMovCuenta] = useState('');
  const [filtroMovTipo, setFiltroMovTipo] = useState('');
  const [savingMov, setSavingMov] = useState(false);

  // ── Estado Cierre de Caja ──
  const [cierre, setCierre] = useState<any>(null);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [cierreFechaDesde, setCierreFechaDesde] = useState(primerDiaMes);
  const [cierreFechaHasta, setCierreFechaHasta] = useState(hoyStr);

  const categoriasGastos = [
    { value: 'alquiler_pista', label: '🏟️ Alquiler de Pistas / Instalaciones', color: '#3B82F6' },
    { value: 'sueldos', label: '👨‍🏫 Sueldos / Pago de Profesores', color: '#10B981' },
    { value: 'eventos_cumpleanos', label: '🎂 Eventos, Cumpleaños y Festejos', color: '#EC4899' },
    { value: 'impuestos', label: '🏛️ Habilitaciones, Impuestos y Tasas', color: '#8B5CF6' },
    { value: 'materiales', label: '⚽ Materiales y Equipamiento Deportivo', color: '#F59E0B' },
    { value: 'servicios', label: '💡 Servicios Básicos (Luz, Agua, Internet)', color: '#06B6D4' },
    { value: 'mantenimiento', label: '🛠️ Mantenimiento y Reparaciones', color: '#F97316' },
    { value: 'otro', label: '📦 Otro Gasto Operativo', color: '#64748B' },
  ];

  const tiposCuenta = [
    { value: 'efectivo', label: '💵 Efectivo (Caja)' },
    { value: 'banco', label: '🏦 Cuenta Bancaria' },
    { value: 'billetera_digital', label: '📱 Billetera Digital' },
    { value: 'otro', label: '📦 Otro' },
  ];

  const tiposMetodo = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia Bancaria' },
    { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
    { value: 'qr', label: 'Pago QR' },
    { value: 'debito', label: 'Débito Automático' },
    { value: 'otro', label: 'Otro' },
  ];

  const categoriasEgreso = [
    { value: 'alquiler_pista', label: 'Alquiler de Pistas / Local' },
    { value: 'sueldos', label: 'Sueldos / Pago Profesores' },
    { value: 'eventos_cumpleanos', label: 'Eventos / Cumpleaños' },
    { value: 'impuestos', label: 'Habilitaciones / Impuestos / Tasas' },
    { value: 'materiales', label: 'Materiales / Equipamiento' },
    { value: 'servicios', label: 'Servicios (Agua, Luz, etc.)' },
    { value: 'mantenimiento', label: 'Mantenimiento / Reparaciones' },
    { value: 'transferencia_interna', label: 'Transferencia entre Cuentas' },
    { value: 'otro', label: 'Otro' },
  ];

  const cargarCompras = async () => {
    setLoadingCompras(true);
    try {
      let url = '/academia/compras-gastos?limit=150';
      if (filtroCompraEstado) url += `&estado=${filtroCompraEstado}`;
      if (filtroCompraCondicion) url += `&condicion_pago=${filtroCompraCondicion}`;
      if (filtroCompraCategoria) url += `&categoria=${filtroCompraCategoria}`;
      if (filtroCompraBusqueda) url += `&search=${encodeURIComponent(filtroCompraBusqueda)}`;
      const data = await apiFetch(url);
      setCompras(data || []);

      const resResumen = await apiFetch('/academia/compras-gastos/resumen');
      setResumenCompras(resResumen || null);
    } catch (e: any) {
      notify(e.message || 'Error al cargar compras y gastos', 'err');
    }
    setLoadingCompras(false);
  };

  const cargarProveedores = async () => {
    setLoadingProveedores(true);
    try {
      const data = await apiFetch('/academia/proveedores?solo_activos=false');
      setProveedores(data || []);
    } catch (e: any) {
      notify(e.message || 'Error al cargar proveedores', 'err');
    }
    setLoadingProveedores(false);
  };

  const cargarMovimientos = async () => {
    setLoadingMov(true);
    try {
      let url = '/academia/caja/movimientos?limit=150';
      if (filtroMovCuenta) url += `&cuenta_id=${filtroMovCuenta}`;
      if (filtroMovTipo) url += `&tipo=${filtroMovTipo}`;
      const data = await apiFetch(url);
      setMovimientos(data || []);
    } catch (e: any) { notify(e.message || 'Error al cargar movimientos', 'err'); }
    setLoadingMov(false);
  };

  const cargarCierre = async () => {
    setLoadingCierre(true);
    try {
      const data = await apiFetch(`/academia/caja/cierre?fecha_desde=${cierreFechaDesde}&fecha_hasta=${cierreFechaHasta}`);
      setCierre(data);
    } catch (e: any) { notify(e.message || 'Error al generar cierre', 'err'); }
    setLoadingCierre(false);
  };

  // Cargar datos al cambiar sub-tab
  const handleSubTab = (t: typeof subTab) => {
    setSubTab(t);
    if (t === 'compras') cargarCompras();
    if (t === 'proveedores') cargarProveedores();
    if (t === 'movimientos') cargarMovimientos();
    if (t === 'cierre') cargarCierre();
  };

  useEffect(() => {
    cargarCompras();
    cargarProveedores();
  }, []);

  // ── Acciones Compras y Gastos ──
  const guardarCompra = async () => {
    if (!compraForm.concepto) { notify('El concepto o descripción es obligatorio', 'err'); return; }
    if (!compraForm.monto_total || Number(compraForm.monto_total) <= 0) { notify('Ingresá un monto válido', 'err'); return; }
    if (compraForm.condicion_pago === 'contado' && !compraForm.cuenta_id) {
      notify('Seleccioná la cuenta de donde sale el pago', 'err');
      return;
    }
    setSavingCompra(true);
    try {
      const body = {
        ...compraForm,
        monto_total: Number(compraForm.monto_total),
        proveedor_id: compraForm.proveedor_id || undefined,
        cuenta_id: compraForm.condicion_pago === 'contado' ? compraForm.cuenta_id : undefined,
        metodo_pago_id: compraForm.metodo_pago_id || undefined,
        fecha_vencimiento: compraForm.condicion_pago === 'credito' && compraForm.fecha_vencimiento ? compraForm.fecha_vencimiento : undefined,
      };
      await apiFetch('/academia/compras-gastos', { method: 'POST', body: JSON.stringify(body) });
      notify('Compra / Gasto registrado con éxito');
      setModalCompra(false);
      setCompraForm({
        proveedor_id: '',
        proveedor_nombre: '',
        tipo: 'gasto_operativo',
        categoria: 'alquiler_pista',
        concepto: '',
        monto_total: '',
        condicion_pago: 'contado',
        fecha_emision: hoyStr,
        fecha_vencimiento: '',
        comprobante_nro: '',
        cuenta_id: cuentas[0]?.id || '',
        metodo_pago_id: '',
        notas: '',
      });
      cargarCompras();
      if (fetchAll) fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al registrar compra o gasto', 'err');
    }
    setSavingCompra(false);
  };

  const abrirPagarCompra = (c: any) => {
    setModalPagarCompra(c);
    setPagoCompraForm({
      monto: c.saldo_pendiente,
      cuenta_id: cuentas[0]?.id || '',
      metodo_pago_id: '',
      fecha: hoyStr,
      notas: '',
    });
  };

  const ejecutarPagoCompra = async () => {
    if (!pagoCompraForm.cuenta_id) { notify('Seleccioná la cuenta para abonar', 'err'); return; }
    if (!pagoCompraForm.monto || Number(pagoCompraForm.monto) <= 0) { notify('Ingresá un monto a abonar válido', 'err'); return; }
    setSavingPagoCompra(true);
    try {
      const body = {
        cuenta_id: pagoCompraForm.cuenta_id,
        monto: Number(pagoCompraForm.monto),
        metodo_pago_id: pagoCompraForm.metodo_pago_id || undefined,
        fecha: pagoCompraForm.fecha || undefined,
        notas: pagoCompraForm.notas || undefined,
      };
      const res = await apiFetch(`/academia/compras-gastos/${modalPagarCompra.id}/pagar`, { method: 'POST', body: JSON.stringify(body) });
      notify(res.message || 'Pago registrado correctamente');
      setModalPagarCompra(null);
      cargarCompras();
      if (fetchAll) fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al pagar factura', 'err');
    }
    setSavingPagoCompra(false);
  };

  const anularCompra = async (c: any) => {
    const motivo = prompt('Motivo de anulación (opcional):');
    if (motivo === null) return;
    try {
      const res = await apiFetch(`/academia/compras-gastos/${c.id}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo_anulacion: motivo }),
      });
      notify(res.message || 'Anulado correctamente');
      cargarCompras();
      if (fetchAll) fetchAll();
    } catch (e: any) {
      notify(e.message || 'Error al anular compra', 'err');
    }
  };

  // ── Acciones Proveedores ──
  const guardarProveedor = async () => {
    if (!proveedorForm.nombre) { notify('El nombre del proveedor es obligatorio', 'err'); return; }
    setSavingProveedor(true);
    try {
      if (modalProveedor?.id) {
        await apiFetch(`/academia/proveedores/${modalProveedor.id}`, { method: 'PUT', body: JSON.stringify(proveedorForm) });
        notify('Proveedor actualizado');
      } else {
        await apiFetch('/academia/proveedores', { method: 'POST', body: JSON.stringify(proveedorForm) });
        notify('Proveedor registrado con éxito');
      }
      setModalProveedor(null);
      cargarProveedores();
    } catch (e: any) {
      notify(e.message || 'Error al guardar proveedor', 'err');
    }
    setSavingProveedor(false);
  };

  const desactivarProveedor = async (id: string) => {
    if (!confirm('¿Desactivar este proveedor?')) return;
    try {
      await apiFetch(`/academia/proveedores/${id}`, { method: 'DELETE' });
      notify('Proveedor desactivado');
      cargarProveedores();
    } catch (e: any) {
      notify(e.message || 'Error al desactivar proveedor', 'err');
    }
  };

  // ── CRUD Cuentas ──
  const guardarCuenta = async () => {
    if (!cuentaForm.nombre) { notify('El nombre es obligatorio', 'err'); return; }
    setSavingCuenta(true);
    try {
      if (modalCuenta?.id) {
        await apiFetch(`/academia/cuentas/${modalCuenta.id}`, { method: 'PUT', body: JSON.stringify(cuentaForm) });
        notify('Cuenta actualizada');
      } else {
        await apiFetch('/academia/cuentas', { method: 'POST', body: JSON.stringify(cuentaForm) });
        notify('Cuenta creada correctamente');
      }
      setModalCuenta(null);
      const data = await apiFetch('/academia/cuentas?solo_activas=false');
      setCuentas(data || []);
    } catch (e: any) { notify(e.message || 'Error al guardar cuenta', 'err'); }
    setSavingCuenta(false);
  };

  const desactivarCuenta = async (id: string) => {
    if (!confirm('¿Desactivar esta cuenta?')) return;
    try {
      const res = await apiFetch(`/academia/cuentas/${id}`, { method: 'DELETE' });
      notify(res.message || 'Cuenta desactivada');
      const data = await apiFetch('/academia/cuentas?solo_activas=false');
      setCuentas(data || []);
    } catch (e: any) { notify(e.message || 'Error', 'err'); }
  };

  // ── CRUD Métodos de Pago ──
  const guardarMetodo = async () => {
    if (!metodoForm.nombre) { notify('El nombre es obligatorio', 'err'); return; }
    setSavingMetodo(true);
    try {
      if (modalMetodo?.id) {
        await apiFetch(`/academia/metodos-pago/${modalMetodo.id}`, { method: 'PUT', body: JSON.stringify(metodoForm) });
        notify('Método actualizado');
      } else {
        await apiFetch('/academia/metodos-pago', { method: 'POST', body: JSON.stringify(metodoForm) });
        notify('Método de pago creado');
      }
      setModalMetodo(null);
      const data = await apiFetch('/academia/metodos-pago?solo_activos=false');
      setMetodosPago(data || []);
    } catch (e: any) { notify(e.message || 'Error al guardar', 'err'); }
    setSavingMetodo(false);
  };

  const eliminarMetodo = async (id: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    try {
      const res = await apiFetch(`/academia/metodos-pago/${id}`, { method: 'DELETE' });
      notify(res.message || 'Eliminado');
      const data = await apiFetch('/academia/metodos-pago?solo_activos=false');
      setMetodosPago(data || []);
    } catch (e: any) { notify(e.message || 'Error', 'err'); }
  };

  // ── Registrar Egreso ──
  const registrarEgreso = async () => {
    if (!egresoForm.cuenta_id) { notify('Seleccioná una cuenta', 'err'); return; }
    if (!egresoForm.concepto) { notify('El concepto es obligatorio', 'err'); return; }
    if (!egresoForm.monto || Number(egresoForm.monto) <= 0) { notify('Ingresá un monto válido', 'err'); return; }
    setSavingMov(true);
    try {
      const body: any = {
        ...egresoForm,
        tipo: 'egreso',
        monto: Number(egresoForm.monto),
        metodo_pago_id: egresoForm.metodo_pago_id || undefined,
        fecha: egresoForm.fecha || undefined,
        referencia: egresoForm.referencia || undefined,
        notas: egresoForm.notas || undefined,
      };
      const res = await apiFetch('/academia/caja/movimientos', { method: 'POST', body: JSON.stringify(body) });
      notify(res.message || 'Egreso registrado');
      setModalEgreso(false);
      setEgresoForm({ cuenta_id: '', metodo_pago_id: '', categoria: 'otro', concepto: '', monto: '', fecha: '', referencia: '', notas: '' });
      cargarMovimientos();
    } catch (e: any) { notify(e.message || 'Error al registrar egreso', 'err'); }
    setSavingMov(false);
  };

  const anularMovimiento = async (id: string) => {
    const motivo = prompt('Motivo de anulación (opcional):');
    if (motivo === null) return;
    try {
      const res = await apiFetch(`/academia/caja/movimientos/${id}/anular`, { method: 'PUT', body: JSON.stringify({ motivo_anulacion: motivo }) });
      notify(res.message || 'Anulado');
      cargarMovimientos();
    } catch (e: any) { notify(e.message || 'Error', 'err'); }
  };

  const tipoCuentaLabel = (tipo: string) => tiposCuenta.find(t => t.value === tipo)?.label || tipo;
  const tipoMovColor = (tipo: string) => tipo === 'ingreso' ? C.green : C.red;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Tesorería & Gastos</h1>
        <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Gestión de compras, gastos operativos, honorarios, proveedores, cuentas y flujo de caja</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'compras', label: '🧾 Gastos & Compras' },
          { id: 'proveedores', label: '👥 Proveedores' },
          { id: 'cuentas', label: '🏦 Cuentas' },
          { id: 'metodos', label: '💳 Métodos de Pago' },
          { id: 'movimientos', label: '📊 Libro Diario' },
          { id: 'cierre', label: '🔒 Cierre de Caja' },
        ].map(t => (
          <button key={t.id} onClick={() => handleSubTab(t.id as any)}
            style={{ ...btn(C.primary, subTab !== t.id) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════ GASTOS Y COMPRAS ════ */}
      {subTab === 'compras' && (
        <div>
          {/* Barra superior con resumen y botón crear */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 13 }}>
                {compras.length} registro{compras.length !== 1 ? 's' : ''} de compras y gastos
              </div>
            </div>
            {(isDueno || isTesorero) && (
              <button
                onClick={() => {
                  setCompraForm({
                    proveedor_id: '',
                    proveedor_nombre: '',
                    tipo: 'gasto_operativo',
                    categoria: 'alquiler_pista',
                    concepto: '',
                    monto_total: '',
                    condicion_pago: 'contado',
                    fecha_emision: hoyStr,
                    fecha_vencimiento: '',
                    comprobante_nro: '',
                    cuenta_id: cuentas[0]?.id || '',
                    metodo_pago_id: '',
                    notas: '',
                  });
                  setModalCompra(true);
                }}
                style={btn(C.primary)}
              >
                <Plus size={14} /> Registrar Gasto / Compra
              </button>
            )}
          </div>

          {/* Tarjetas KPI de Compras y Gastos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ ...card({ padding: 16 }), borderLeft: `4px solid ${C.primary}` }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Total Gastos del Mes</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>
                Gs. {(resumenCompras?.total_gastos || 0).toLocaleString('es-PY')}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Compras y gastos del período</div>
            </div>

            <div style={{ ...card({ padding: 16 }), borderLeft: `4px solid ${C.yellow}` }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Cuentas por Pagar (Deudas)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.yellow }}>
                Gs. {(resumenCompras?.total_por_pagar || 0).toLocaleString('es-PY')}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Facturas pendientes a crédito</div>
            </div>

            <div style={{ ...card({ padding: 16 }), borderLeft: `4px solid ${(resumenCompras?.cuentas_vencidas?.cantidad || 0) > 0 ? C.red : C.faint}` }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Facturas Vencidas</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: (resumenCompras?.cuentas_vencidas?.cantidad || 0) > 0 ? C.red : C.text }}>
                {(resumenCompras?.cuentas_vencidas?.cantidad || 0)} vencidas
              </div>
              <div style={{ fontSize: 11, color: (resumenCompras?.cuentas_vencidas?.cantidad || 0) > 0 ? C.red : C.muted, marginTop: 4, fontWeight: 600 }}>
                Gs. {(resumenCompras?.cuentas_vencidas?.monto_total || 0).toLocaleString('es-PY')}
              </div>
            </div>

            <div style={{ ...card({ padding: 16 }), borderLeft: `4px solid ${C.green}` }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Total Pagado al Contado</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>
                Gs. {(resumenCompras?.total_pagado || 0).toLocaleString('es-PY')}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Salidas efectivas de caja/banco</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ ...card({ padding: 14 }), marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
              <Search size={15} color={C.muted} />
              <input
                value={filtroCompraBusqueda}
                onChange={e => setFiltroCompraBusqueda(e.target.value)}
                placeholder="Buscar por concepto, proveedor o comprobante..."
                style={{ ...input(), width: '100%' }}
              />
            </div>

            <select value={filtroCompraEstado} onChange={e => setFiltroCompraEstado(e.target.value)} style={{ ...input({ width: 160 }) }}>
              <option value="">Todos los Estados</option>
              <option value="pendiente">⏳ Pendiente de Pago</option>
              <option value="parcial">⚖️ Pago Parcial</option>
              <option value="pagado">✓ Pagado</option>
              <option value="anulado">✕ Anulado</option>
            </select>

            <select value={filtroCompraCondicion} onChange={e => setFiltroCompraCondicion(e.target.value)} style={{ ...input({ width: 140 }) }}>
              <option value="">Condición: Todas</option>
              <option value="contado">💵 Contado</option>
              <option value="credito">📑 Crédito</option>
            </select>

            <select value={filtroCompraCategoria} onChange={e => setFiltroCompraCategoria(e.target.value)} style={{ ...input({ width: 190 }) }}>
              <option value="">Todas las Categorías</option>
              {categoriasGastos.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <button onClick={cargarCompras} style={btn(C.primary, true)}>
              <RefreshCw size={13} /> Filtrar
            </button>
          </div>

          {/* Tabla de Compras */}
          {loadingCompras ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Cargando compras y gastos...</div>
          ) : compras.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 60, color: C.faint }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>No hay gastos o compras registradas</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13 }}>Registrá tu primer gasto operativo, alquiler de pista, pago de profesor o compra de materiales</p>
              {(isDueno || isTesorero) && (
                <button onClick={() => setModalCompra(true)} style={btn(C.primary)}>
                  + Registrar primer gasto
                </button>
              )}
            </div>
          ) : (
            <div style={card({ padding: 0 })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}` }}>
                    {['Fecha', 'Categoría', 'Concepto / Detalle', 'Proveedor', 'Condición / Vencimiento', 'Monto Total', 'Pagado / Saldo', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 12px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c: any) => {
                    const catObj = categoriasGastos.find(x => x.value === c.categoria);
                    const vencida = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date(hoyStr) && c.estado !== 'pagado' && c.estado !== 'anulado';
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}22`, opacity: c.estado === 'anulado' ? 0.5 : 1 }}>
                        <td style={{ padding: '9px 12px', color: C.muted, fontSize: 11, fontFamily: 'monospace' }}>
                          {c.fecha_emision}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            ...badge(catObj?.color || C.primary),
                            fontSize: 10,
                            padding: '3px 7px',
                            whiteSpace: 'nowrap'
                          }}>
                            {catObj?.label || c.categoria}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, maxWidth: 220 }}>
                          <div>{c.concepto}</div>
                          {c.comprobante_nro && (
                            <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>
                              Comprobante: {c.comprobante_nro}
                            </div>
                          )}
                          {c.cuenta_nombre && (
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                              Cuenta: {c.cuenta_nombre}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', color: C.text, fontSize: 12 }}>
                          {c.proveedor_nombre}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ ...badge(c.condicion_pago === 'contado' ? C.green : C.yellow), fontSize: 10 }}>
                              {c.condicion_pago === 'contado' ? 'Contado' : 'Crédito'}
                            </span>
                          </div>
                          {c.condicion_pago === 'credito' && c.fecha_vencimiento && (
                            <div style={{ fontSize: 10, marginTop: 3, color: vencida ? C.red : C.muted, fontWeight: vencida ? 700 : 400 }}>
                              Vence: {c.fecha_vencimiento} {vencida ? '⚠️' : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 800, color: C.text }}>
                          Gs. {c.monto_total.toLocaleString('es-PY')}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                            Gs. {c.monto_pagado.toLocaleString('es-PY')}
                          </div>
                          {c.saldo_pendiente > 0 && (
                            <div style={{ fontSize: 10, color: C.red, fontWeight: 700, marginTop: 2 }}>
                              Saldo: Gs. {c.saldo_pendiente.toLocaleString('es-PY')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {c.estado === 'pagado' && <span style={badge(C.green)}>✓ Pagado</span>}
                          {c.estado === 'pendiente' && <span style={badge(C.yellow)}>⏳ Pendiente</span>}
                          {c.estado === 'parcial' && <span style={badge(C.purple)}>⚖️ Parcial</span>}
                          {c.estado === 'anulado' && <span style={badge(C.faint)}>✕ Anulado</span>}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {c.saldo_pendiente > 0 && c.estado !== 'anulado' && (
                              <button
                                onClick={() => abrirPagarCompra(c)}
                                style={{ ...btn(C.green), fontSize: 11, padding: '4px 8px' }}
                                title="Pagar saldo de factura"
                              >
                                💳 Pagar
                              </button>
                            )}
                            {isDueno && c.estado !== 'anulado' && (
                              <button
                                onClick={() => anularCompra(c)}
                                style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 7px' }}
                                title="Anular compra / gasto"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Nueva Compra / Gasto */}
          {modalCompra && (
            <Modal title="Registrar Compra o Gasto" onClose={() => setModalCompra(false)} wide>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={label()}>Categoría del Gasto *</label>
                  <select
                    value={compraForm.categoria}
                    onChange={e => setCompraForm({ ...compraForm, categoria: e.target.value })}
                    style={input()}
                  >
                    {categoriasGastos.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={label()}>Proveedor o Prestador</label>
                  <select
                    value={compraForm.proveedor_id}
                    onChange={e => {
                      const selId = e.target.value;
                      const selProv = proveedores.find(p => p.id === selId);
                      setCompraForm({
                        ...compraForm,
                        proveedor_id: selId,
                        proveedor_nombre: selProv ? selProv.nombre : compraForm.proveedor_nombre,
                      });
                    }}
                    style={input()}
                  >
                    <option value="">— Ninguno / Escribir libremente —</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.ruc_ci ? `(${p.ruc_ci})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!compraForm.proveedor_id && (
                <div style={{ marginBottom: 14 }}>
                  <label style={label()}>Nombre del Proveedor / Prestador (opcional)</label>
                  <input
                    value={compraForm.proveedor_nombre}
                    onChange={e => setCompraForm({ ...compraForm, proveedor_nombre: e.target.value })}
                    style={input()}
                    placeholder="Ej: Complejo Las Palmeras, Prof. Carlos Gómez, Municipalidad"
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Concepto / Descripción del Gasto *</label>
                <input
                  value={compraForm.concepto}
                  onChange={e => setCompraForm({ ...compraForm, concepto: e.target.value })}
                  style={input()}
                  placeholder="Ej: Alquiler de pista pista central, Pago de clases Karate, Torta cumpleaños, Habilitación"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={label()}>Monto Total (Gs.) *</label>
                  <input
                    type="number"
                    value={compraForm.monto_total}
                    onChange={e => setCompraForm({ ...compraForm, monto_total: e.target.value })}
                    style={input()}
                    placeholder="Ej: 500000"
                  />
                </div>

                <div>
                  <label style={label()}>Condición de Pago *</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setCompraForm({ ...compraForm, condicion_pago: 'contado' })}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8,
                        background: compraForm.condicion_pago === 'contado' ? C.green : C.surface,
                        color: compraForm.condicion_pago === 'contado' ? '#fff' : C.muted,
                        border: `1px solid ${compraForm.condicion_pago === 'contado' ? C.green : C.border}`,
                        fontWeight: 700, cursor: 'pointer', fontSize: 12
                      }}
                    >
                      💵 Contado
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompraForm({ ...compraForm, condicion_pago: 'credito' })}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8,
                        background: compraForm.condicion_pago === 'credito' ? C.yellow : C.surface,
                        color: compraForm.condicion_pago === 'credito' ? '#fff' : C.muted,
                        border: `1px solid ${compraForm.condicion_pago === 'credito' ? C.yellow : C.border}`,
                        fontWeight: 700, cursor: 'pointer', fontSize: 12
                      }}
                    >
                      📑 Crédito (Por pagar)
                    </button>
                  </div>
                </div>
              </div>

              {compraForm.condicion_pago === 'contado' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, background: `${C.green}10`, padding: 14, borderRadius: 10, border: `1px solid ${C.green}33` }}>
                  <div>
                    <label style={label()}>Cuenta de Salida (Caja / Banco) *</label>
                    <select
                      value={compraForm.cuenta_id}
                      onChange={e => setCompraForm({ ...compraForm, cuenta_id: e.target.value })}
                      style={input()}
                    >
                      <option value="">— Seleccionar cuenta —</option>
                      {cuentas.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.tipo === 'efectivo' ? '💵' : '🏦'} {c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={label()}>Método de Pago</label>
                    <select
                      value={compraForm.metodo_pago_id}
                      onChange={e => setCompraForm({ ...compraForm, metodo_pago_id: e.target.value })}
                      style={input()}
                    >
                      <option value="">— Seleccionar método —</option>
                      {metodosPago.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 14, background: `${C.yellow}10`, padding: 14, borderRadius: 10, border: `1px solid ${C.yellow}33` }}>
                  <label style={label()}>Fecha de Vencimiento de Factura / Deuda</label>
                  <input
                    type="date"
                    value={compraForm.fecha_vencimiento}
                    onChange={e => setCompraForm({ ...compraForm, fecha_vencimiento: e.target.value })}
                    style={input()}
                  />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    💡 Esta fecha te alertará en Cuentas por Pagar antes de que expire el plazo acordado con el proveedor.
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={label()}>Nro. de Comprobante / Factura / Timbrado</label>
                  <input
                    value={compraForm.comprobante_nro}
                    onChange={e => setCompraForm({ ...compraForm, comprobante_nro: e.target.value })}
                    style={input()}
                    placeholder="Ej: Fac 001-001-0001234"
                  />
                </div>

                <div>
                  <label style={label()}>Fecha de Emisión</label>
                  <input
                    type="date"
                    value={compraForm.fecha_emision}
                    onChange={e => setCompraForm({ ...compraForm, fecha_emision: e.target.value })}
                    style={input()}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Notas / Observaciones</label>
                <input
                  value={compraForm.notas}
                  onChange={e => setCompraForm({ ...compraForm, notas: e.target.value })}
                  style={input()}
                  placeholder="Detalles adicionales, modalidad de pago acordada, etc."
                />
              </div>

              <ModalActions
                onCancel={() => setModalCompra(false)}
                onSave={guardarCompra}
                saving={savingCompra}
                saveLabel="Guardar Compra / Gasto"
              />
            </Modal>
          )}

          {/* Modal Pagar Compra a Crédito */}
          {modalPagarCompra && (
            <Modal title="Registrar Pago de Factura / Deuda" onClose={() => setModalPagarCompra(null)}>
              <div style={{ background: `${C.primary}12`, padding: 14, borderRadius: 10, marginBottom: 16, border: `1px solid ${C.primary}33` }}>
                <div style={{ fontSize: 12, color: C.muted }}>Gasto / Compra a abonar:</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginTop: 2 }}>
                  {modalPagarCompra.concepto}
                </div>
                <div style={{ fontSize: 12, color: C.primary, marginTop: 2 }}>
                  Proveedor: {modalPagarCompra.proveedor_nombre}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Saldo pendiente:</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: C.red }}>
                    Gs. {modalPagarCompra.saldo_pendiente.toLocaleString('es-PY')}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Monto a Abonar (Gs.) *</label>
                <input
                  type="number"
                  value={pagoCompraForm.monto}
                  onChange={e => setPagoCompraForm({ ...pagoCompraForm, monto: e.target.value })}
                  style={input()}
                  placeholder="Monto a pagar"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Cuenta de Salida (Caja / Banco) *</label>
                <select
                  value={pagoCompraForm.cuenta_id}
                  onChange={e => setPagoCompraForm({ ...pagoCompraForm, cuenta_id: e.target.value })}
                  style={input()}
                >
                  <option value="">— Seleccionar cuenta —</option>
                  {cuentas.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.tipo === 'efectivo' ? '💵' : '🏦'} {c.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Método de Pago</label>
                <select
                  value={pagoCompraForm.metodo_pago_id}
                  onChange={e => setPagoCompraForm({ ...pagoCompraForm, metodo_pago_id: e.target.value })}
                  style={input()}
                >
                  <option value="">— Seleccionar método —</option>
                  {metodosPago.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Fecha de Pago</label>
                <input
                  type="date"
                  value={pagoCompraForm.fecha}
                  onChange={e => setPagoCompraForm({ ...pagoCompraForm, fecha: e.target.value })}
                  style={input()}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Notas / Referencia de Pago</label>
                <input
                  value={pagoCompraForm.notas}
                  onChange={e => setPagoCompraForm({ ...pagoCompraForm, notas: e.target.value })}
                  style={input()}
                  placeholder="Ej: Transferencia bancaria nro 481923"
                />
              </div>

              <ModalActions
                onCancel={() => setModalPagarCompra(null)}
                onSave={ejecutarPagoCompra}
                saving={savingPagoCompra}
                saveLabel="Confirmar Pago"
              />
            </Modal>
          )}
        </div>
      )}

      {/* ════ PROVEEDORES ════ */}
      {subTab === 'proveedores' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} / prestadores registrados
            </div>
            {(isDueno || isTesorero) && (
              <button
                onClick={() => {
                  setModalProveedor({});
                  setProveedorForm({
                    nombre: '', ruc_ci: '', telefono: '', email: '',
                    categoria_frecuente: 'alquiler_pista', direccion: '', notas: ''
                  });
                }}
                style={btn(C.green)}
              >
                + Nuevo Proveedor / Prestador
              </button>
            )}
          </div>

          {loadingProveedores ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Cargando directorio de proveedores...</div>
          ) : proveedores.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 60, color: C.faint }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>No hay proveedores registrados</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13 }}>Registrá tus complejos de pistas, profesores externos o proveedores de insumos</p>
              {(isDueno || isTesorero) && (
                <button
                  onClick={() => {
                    setModalProveedor({});
                    setProveedorForm({ nombre: '', ruc_ci: '', telefono: '', email: '', categoria_frecuente: 'alquiler_pista', direccion: '', notas: '' });
                  }}
                  style={btn(C.green)}
                >
                  + Crear primer proveedor
                </button>
              )}
            </div>
          ) : (
            <div style={card({ padding: 0 })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Proveedor / Empresa', 'RUC / CI', 'Contacto', 'Rubro / Categoría', 'Deuda Pendiente', 'Compras', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p: any) => {
                    const catObj = categoriasGastos.find(x => x.value === p.categoria_frecuente);
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}22`, opacity: p.activo ? 1 : 0.5 }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                          <div>{p.nombre}</div>
                          {p.direccion && <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>{p.direccion}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>
                          {p.ruc_ci || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {p.telefono && <div>📞 {p.telefono}</div>}
                          {p.email && <div style={{ color: C.muted, fontSize: 11 }}>✉️ {p.email}</div>}
                          {!p.telefono && !p.email && <span style={{ color: C.faint }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ ...badge(catObj?.color || C.primary), fontSize: 10 }}>
                            {catObj?.label || p.categoria_frecuente || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: p.saldo_pendiente > 0 ? C.red : C.green }}>
                          Gs. {(p.saldo_pendiente || 0).toLocaleString('es-PY')}
                        </td>
                        <td style={{ padding: '10px 14px', color: C.muted, fontSize: 12 }}>
                          {p.cant_compras || 0} facturas
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => {
                                setModalProveedor(p);
                                setProveedorForm({
                                  nombre: p.nombre,
                                  ruc_ci: p.ruc_ci || '',
                                  telefono: p.telefono || '',
                                  email: p.email || '',
                                  categoria_frecuente: p.categoria_frecuente || 'alquiler_pista',
                                  direccion: p.direccion || '',
                                  notas: p.notas || '',
                                });
                              }}
                              style={{ ...btn(C.yellow, true), fontSize: 11, padding: '4px 8px' }}
                              title="Editar proveedor"
                            >
                              <Pencil size={11} />
                            </button>
                            {isDueno && (
                              <button
                                onClick={() => desactivarProveedor(p.id)}
                                style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 8px' }}
                                title="Desactivar proveedor"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Proveedor */}
          {modalProveedor !== null && (
            <Modal title={modalProveedor.id ? `Editar — ${modalProveedor.nombre}` : 'Nuevo Proveedor / Prestador'} onClose={() => setModalProveedor(null)}>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Nombre del Proveedor o Prestador *</label>
                <input
                  value={proveedorForm.nombre}
                  onChange={e => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                  style={input()}
                  placeholder="Ej: Complejo Las Palmeras, Prof. Carlos Gómez, Deportes Asunción"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={label()}>RUC / C.I.</label>
                  <input
                    value={proveedorForm.ruc_ci}
                    onChange={e => setProveedorForm({ ...proveedorForm, ruc_ci: e.target.value })}
                    style={input()}
                    placeholder="Ej: 80012345-6"
                  />
                </div>
                <div>
                  <label style={label()}>Teléfono</label>
                  <input
                    value={proveedorForm.telefono}
                    onChange={e => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
                    style={input()}
                    placeholder="Ej: 0981 123 456"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Email</label>
                <input
                  type="email"
                  value={proveedorForm.email}
                  onChange={e => setProveedorForm({ ...proveedorForm, email: e.target.value })}
                  style={input()}
                  placeholder="proveedor@empresa.com"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Rubro / Categoría Habitual</label>
                <select
                  value={proveedorForm.categoria_frecuente}
                  onChange={e => setProveedorForm({ ...proveedorForm, categoria_frecuente: e.target.value })}
                  style={input()}
                >
                  {categoriasGastos.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Dirección</label>
                <input
                  value={proveedorForm.direccion}
                  onChange={e => setProveedorForm({ ...proveedorForm, direccion: e.target.value })}
                  style={input()}
                  placeholder="Ubicación o dirección (opcional)"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Notas / Datos bancarios para transferencias</label>
                <input
                  value={proveedorForm.notas}
                  onChange={e => setProveedorForm({ ...proveedorForm, notas: e.target.value })}
                  style={input()}
                  placeholder="Ej: Cta Cte Banco Itaú N° 1234567 a nombre de..."
                />
              </div>

              <ModalActions
                onCancel={() => setModalProveedor(null)}
                onSave={guardarProveedor}
                saving={savingProveedor}
                saveLabel={modalProveedor.id ? 'Guardar Cambios' : 'Registrar Proveedor'}
              />
            </Modal>
          )}
        </div>
      )}

      {/* ════ CUENTAS ════ */}
      {subTab === 'cuentas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} configurada{cuentas.length !== 1 ? 's' : ''}
            </div>
            {isDueno && (
              <button onClick={() => { setModalCuenta({}); setCuentaForm({ nombre: '', tipo: 'efectivo', descripcion: '', numero_cuenta: '', banco: '', moneda: 'GS', es_principal: false, saldo_inicial: 0 }); }} style={btn(C.green)}>
                + Nueva Cuenta
              </button>
            )}
          </div>

          {cuentas.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 60, color: C.faint }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>No hay cuentas configuradas</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13 }}>Creá tu primera cuenta (Caja, Banco, etc.) para empezar a registrar movimientos</p>
              {isDueno && <button onClick={() => { setModalCuenta({}); setCuentaForm({ nombre: '', tipo: 'efectivo', descripcion: '', numero_cuenta: '', banco: '', moneda: 'GS', es_principal: false, saldo_inicial: 0 }); }} style={btn(C.green)}>+ Crear primera cuenta</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {cuentas.map((c: any) => (
                <div key={c.id} style={{ ...card({ padding: 20 }), borderLeft: `4px solid ${c.tipo === 'efectivo' ? C.green : c.tipo === 'banco' ? C.primary : C.purple}`, opacity: c.activa ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.tipo === 'efectivo' ? '💵' : c.tipo === 'banco' ? '🏦' : '📱'} {c.nombre}
                        {c.es_principal && <span style={badge(C.green)}>Principal</span>}
                        {!c.activa && <span style={badge(C.faint)}>Inactiva</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{tipoCuentaLabel(c.tipo)}</div>
                      {c.banco && <div style={{ color: C.faint, fontSize: 11, marginTop: 2 }}>{c.banco}</div>}
                      {c.numero_cuenta && <div style={{ color: C.faint, fontSize: 11, fontFamily: 'monospace' }}>{c.numero_cuenta}</div>}
                    </div>
                    {isDueno && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setModalCuenta(c); setCuentaForm({ nombre: c.nombre, tipo: c.tipo, descripcion: c.descripcion || '', numero_cuenta: c.numero_cuenta || '', banco: c.banco || '', moneda: c.moneda, es_principal: c.es_principal, saldo_inicial: c.saldo_inicial }); }} style={{ ...btn(C.yellow, true), fontSize: 11, padding: '4px 8px' }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => desactivarCuenta(c.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 8px' }}>
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: C.muted }}>Saldo inicial configurado</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Gs. {(c.saldo_inicial || 0).toLocaleString('es-PY')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Cuenta */}
          {modalCuenta !== null && (
            <Modal title={modalCuenta.id ? `Editar — ${modalCuenta.nombre}` : 'Nueva Cuenta'} onClose={() => setModalCuenta(null)}>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Nombre *</label>
                <input value={cuentaForm.nombre} onChange={e => setCuentaForm((f: any) => ({ ...f, nombre: e.target.value }))} style={input()} placeholder="Ej: Caja Principal, Banco Itaú, Tigo Money" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Tipo *</label>
                <select value={cuentaForm.tipo} onChange={e => setCuentaForm((f: any) => ({ ...f, tipo: e.target.value }))} style={input()}>
                  {tiposCuenta.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {cuentaForm.tipo === 'banco' && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={label()}>Nombre del banco</label>
                    <input value={cuentaForm.banco} onChange={e => setCuentaForm((f: any) => ({ ...f, banco: e.target.value }))} style={input()} placeholder="Ej: Banco Itaú, BNF, Continental" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={label()}>Número de cuenta</label>
                    <input value={cuentaForm.numero_cuenta} onChange={e => setCuentaForm((f: any) => ({ ...f, numero_cuenta: e.target.value }))} style={input()} placeholder="Número de cuenta bancaria" />
                  </div>
                </>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Saldo inicial (Gs.) — para estimación de saldo actual</label>
                <input type="number" value={cuentaForm.saldo_inicial} onChange={e => setCuentaForm((f: any) => ({ ...f, saldo_inicial: e.target.value }))} style={input()} placeholder="0" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Descripción</label>
                <input value={cuentaForm.descripcion} onChange={e => setCuentaForm((f: any) => ({ ...f, descripcion: e.target.value }))} style={input()} placeholder="Notas adicionales (opcional)" />
              </div>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="es_principal" checked={cuentaForm.es_principal}
                  onChange={e => setCuentaForm((f: any) => ({ ...f, es_principal: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.primary }} />
                <label htmlFor="es_principal" style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Establecer como cuenta principal</label>
              </div>
              <ModalActions onCancel={() => setModalCuenta(null)} onSave={guardarCuenta} saving={savingCuenta} saveLabel={modalCuenta.id ? 'Guardar cambios' : 'Crear cuenta'} />
            </Modal>
          )}
        </div>
      )}

      {/* ════ MÉTODOS DE PAGO ════ */}
      {subTab === 'metodos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 13 }}>
              Métodos de pago disponibles para tu academia
            </div>
            {(isDueno || isTesorero) && (
              <button onClick={() => { setModalMetodo({}); setMetodoForm({ nombre: '', tipo: 'efectivo', descripcion: '' }); }} style={btn(C.green)}>
                + Nuevo Método
              </button>
            )}
          </div>

          {metodosPago.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 60, color: C.faint }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>No hay métodos de pago</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13 }}>Configurá los métodos de pago aceptados (Efectivo, Transferencia Itaú, QR Tigo, etc.)</p>
              {isDueno && <button onClick={() => { setModalMetodo({}); setMetodoForm({ nombre: '', tipo: 'efectivo', descripcion: '' }); }} style={btn(C.green)}>+ Crear primer método</button>}
            </div>
          ) : (
            <div style={card({ padding: 0 })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Nombre', 'Tipo', 'Descripción', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metodosPago.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}33`, opacity: m.activo ? 1 : 0.5 }}>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>{m.nombre}</td>
                      <td style={{ padding: '9px 14px', color: C.muted }}>{tiposMetodo.find(t => t.value === m.tipo)?.label || m.tipo}</td>
                      <td style={{ padding: '9px 14px', color: C.faint, fontSize: 12 }}>{m.descripcion || '—'}</td>
                      <td style={{ padding: '9px 14px' }}><span style={badge(m.activo ? C.green : C.faint)}>{m.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isDueno && (
                            <>
                              <button onClick={() => { setModalMetodo(m); setMetodoForm({ nombre: m.nombre, tipo: m.tipo, descripcion: m.descripcion || '', activo: m.activo }); }} style={{ ...btn(C.yellow, true), fontSize: 11, padding: '4px 8px' }}>
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => eliminarMetodo(m.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '4px 8px' }}>
                                <X size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Método */}
          {modalMetodo !== null && (
            <Modal title={modalMetodo.id ? `Editar — ${modalMetodo.nombre}` : 'Nuevo Método de Pago'} onClose={() => setModalMetodo(null)}>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Nombre *</label>
                <input value={metodoForm.nombre} onChange={e => setMetodoForm((f: any) => ({ ...f, nombre: e.target.value }))} style={input()} placeholder="Ej: Efectivo, Transferencia Itaú, QR Tigo Money" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Tipo *</label>
                <select value={metodoForm.tipo} onChange={e => setMetodoForm((f: any) => ({ ...f, tipo: e.target.value }))} style={input()}>
                  {tiposMetodo.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Descripción</label>
                <input value={metodoForm.descripcion} onChange={e => setMetodoForm((f: any) => ({ ...f, descripcion: e.target.value }))} style={input()} placeholder="Descripción opcional" />
              </div>
              <ModalActions onCancel={() => setModalMetodo(null)} onSave={guardarMetodo} saving={savingMetodo} saveLabel={modalMetodo.id ? 'Guardar cambios' : 'Crear método'} />
            </Modal>
          )}
        </div>
      )}

      {/* ════ MOVIMIENTOS ════ */}
      {subTab === 'movimientos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={filtroMovCuenta} onChange={e => setFiltroMovCuenta(e.target.value)} style={{ ...input({ width: 180 }) }}>
                <option value="">Todas las cuentas</option>
                {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={filtroMovTipo} onChange={e => setFiltroMovTipo(e.target.value)} style={{ ...input({ width: 150 }) }}>
                <option value="">Ing. y Egr.</option>
                <option value="ingreso">Solo Ingresos</option>
                <option value="egreso">Solo Egresos</option>
              </select>
              <button onClick={cargarMovimientos} style={btn(C.primary, true)}>
                <RefreshCw size={13} /> Filtrar
              </button>
            </div>
            {isTesorero && (
              <button onClick={() => { setModalEgreso(true); setEgresoForm({ cuenta_id: cuentas[0]?.id || '', metodo_pago_id: '', categoria: 'otro', concepto: '', monto: '', fecha: '', referencia: '', notas: '' }); }} style={btn(C.red)}>
                ➖ Registrar Egreso
              </button>
            )}
          </div>

          {/* KPIs del período */}
          {movimientos.length > 0 && (() => {
            const ingresos = movimientos.filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + m.monto, 0);
            const egresos = movimientos.filter((m: any) => m.tipo === 'egreso').reduce((s: number, m: any) => s + m.monto, 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Ingresos', value: ingresos, color: C.green },
                  { label: 'Total Egresos', value: egresos, color: C.red },
                  { label: 'Resultado Neto', value: ingresos - egresos, color: ingresos >= egresos ? C.green : C.red },
                ].map(k => (
                  <div key={k.label} style={{ ...card({ padding: 14 }), borderLeft: `3px solid ${k.color}` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>Gs. {k.value.toLocaleString('es-PY')}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {loadingMov ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Cargando movimientos...</div>
          ) : movimientos.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 50, color: C.faint }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p>No hay movimientos registrados con los filtros actuales.</p>
            </div>
          ) : (
            <div style={card({ padding: 0 })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Cuenta', 'Método', 'Monto', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: '8px 12px', color: C.muted, fontSize: 11, fontFamily: 'monospace' }}>{m.fecha}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={badge(tipoMovColor(m.tipo))}>{m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: C.faint, fontSize: 11 }}>{m.categoria}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, maxWidth: 200 }}>{m.concepto}</td>
                      <td style={{ padding: '8px 12px', color: C.muted, fontSize: 12 }}>{m.cuenta_nombre}</td>
                      <td style={{ padding: '8px 12px', color: C.faint, fontSize: 11 }}>{m.metodo_pago_nombre || '—'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: tipoMovColor(m.tipo) }}>
                        {m.tipo === 'egreso' ? '−' : '+'}Gs. {m.monto.toLocaleString('es-PY')}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {isDueno && !m.pago_id && (
                          <button onClick={() => anularMovimiento(m.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '3px 7px' }}>
                            <Trash2 size={10} />
                          </button>
                        )}
                        {m.pago_id && <span title="Originado por pago de cuota" style={{ color: C.faint, fontSize: 10 }}>🔗 cuota</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Egreso */}
          {modalEgreso && (
            <Modal title="Registrar Egreso" onClose={() => setModalEgreso(false)}>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Cuenta *</label>
                <select value={egresoForm.cuenta_id} onChange={e => setEgresoForm((f: any) => ({ ...f, cuenta_id: e.target.value }))} style={input()}>
                  <option value="">— Seleccioná cuenta —</option>
                  {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.tipo === 'efectivo' ? '💵' : '🏦'} {c.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Categoría *</label>
                <select value={egresoForm.categoria} onChange={e => setEgresoForm((f: any) => ({ ...f, categoria: e.target.value }))} style={input()}>
                  {categoriasEgreso.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Concepto *</label>
                <input value={egresoForm.concepto} onChange={e => setEgresoForm((f: any) => ({ ...f, concepto: e.target.value }))} style={input()} placeholder="Descripción del egreso" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Monto (Gs.) *</label>
                <input type="number" value={egresoForm.monto} onChange={e => setEgresoForm((f: any) => ({ ...f, monto: e.target.value }))} style={input()} placeholder="0" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Método de pago usado</label>
                <select value={egresoForm.metodo_pago_id} onChange={e => setEgresoForm((f: any) => ({ ...f, metodo_pago_id: e.target.value }))} style={input()}>
                  <option value="">— Sin especificar —</option>
                  {metodosPago.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Fecha</label>
                <input type="date" value={egresoForm.fecha} onChange={e => setEgresoForm((f: any) => ({ ...f, fecha: e.target.value }))} style={input()} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Referencia (Nro. comprobante, etc.)</label>
                <input value={egresoForm.referencia} onChange={e => setEgresoForm((f: any) => ({ ...f, referencia: e.target.value }))} style={input()} placeholder="Opcional" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label()}>Notas</label>
                <input value={egresoForm.notas} onChange={e => setEgresoForm((f: any) => ({ ...f, notas: e.target.value }))} style={input()} placeholder="Observaciones (opcional)" />
              </div>
              <ModalActions onCancel={() => setModalEgreso(false)} onSave={registrarEgreso} saving={savingMov} saveLabel="➖ Registrar Egreso" />
            </Modal>
          )}
        </div>
      )}

      {/* ════ CIERRE DE CAJA ════ */}
      {subTab === 'cierre' && (
        <div>
          <div style={{ ...card({ padding: 16 }), marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={label()}>Desde</label>
              <input type="date" value={cierreFechaDesde} onChange={e => setCierreFechaDesde(e.target.value)} style={{ ...input({ width: 160 }) }} />
            </div>
            <div>
              <label style={label()}>Hasta</label>
              <input type="date" value={cierreFechaHasta} onChange={e => setCierreFechaHasta(e.target.value)} style={{ ...input({ width: 160 }) }} />
            </div>
            <button onClick={cargarCierre} disabled={loadingCierre} style={btn(C.primary)}>
              {loadingCierre ? 'Calculando...' : '📊 Generar Cierre'}
            </button>
          </div>

          {cierre && (
            <>
              {/* Resumen Global */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Ingresos del período', value: cierre.resumen_global.total_ingresos, color: C.green },
                  { label: 'Total Egresos del período', value: cierre.resumen_global.total_egresos, color: C.red },
                  { label: 'Resultado Neto', value: cierre.resumen_global.resultado_neto, color: cierre.resumen_global.resultado_neto >= 0 ? C.green : C.red },
                ].map(k => (
                  <div key={k.label} style={{ ...card({ padding: 18 }), borderLeft: `4px solid ${k.color}` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>Gs. {k.value.toLocaleString('es-PY')}</div>
                  </div>
                ))}
              </div>

              {/* Por cuenta */}
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Detalle por Cuenta</h3>
              {cierre.cuentas.map((c: any) => (
                <div key={c.cuenta_id} style={{ ...card({ padding: 18 }), marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        {c.cuenta_tipo === 'efectivo' ? '💵' : c.cuenta_tipo === 'banco' ? '🏦' : '📱'} {c.cuenta_nombre}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{c.moneda}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Saldo estimado</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: c.saldo_estimado >= 0 ? C.green : C.red }}>
                        Gs. {c.saldo_estimado.toLocaleString('es-PY')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                    {[
                      { label: 'Saldo Inicial', value: c.saldo_inicial, color: C.muted },
                      { label: `↑ Ingresos (${c.cant_ingresos})`, value: c.total_ingresos, color: C.green },
                      { label: `↓ Egresos (${c.cant_egresos})`, value: c.total_egresos, color: C.red },
                    ].map(k => (
                      <div key={k.label}>
                        <div style={{ fontSize: 11, color: C.muted }}>{k.label}</div>
                        <div style={{ fontWeight: 700, color: k.color }}>Gs. {k.value.toLocaleString('es-PY')}</div>
                      </div>
                    ))}
                  </div>

                  {/* Desglose por método de pago */}
                  {c.por_metodo_pago.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Por método de pago:</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {c.por_metodo_pago.map((mp: any, i: number) => (
                          <div key={i} style={{ background: `${tipoMovColor(mp.mov_tipo)}18`, border: `1px solid ${tipoMovColor(mp.mov_tipo)}44`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                            <span style={{ color: tipoMovColor(mp.mov_tipo), fontWeight: 700 }}>{mp.metodo}</span>
                            <span style={{ color: C.muted, marginLeft: 6 }}>{mp.mov_tipo === 'ingreso' ? '↑' : '↓'} Gs. {mp.total.toLocaleString('es-PY')} ({mp.cantidad})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Desglose por categoría */}
                  {c.por_categoria.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Por categoría:</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {c.por_categoria.map((cat: any, i: number) => (
                          <div key={i} style={{ background: `${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
                            <span style={{ color: tipoMovColor(cat.mov_tipo) }}>{cat.mov_tipo === 'ingreso' ? '↑' : '↓'}</span>
                            {' '}<span style={{ color: C.text }}>{cat.categoria}</span>
                            <span style={{ color: C.muted, marginLeft: 6 }}>Gs. {cat.total.toLocaleString('es-PY')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {!cierre && !loadingCierre && (
            <div style={{ ...card(), textAlign: 'center', padding: 50, color: C.faint }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>Cierre de Caja</h3>
              <p style={{ fontSize: 13 }}>Seleccioná el período y hacé clic en "Generar Cierre" para ver el resumen financiero</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UNIFORMES Y ACCESORIOS TAB (TIENDA ACADÉMICA)
// ═══════════════════════════════════════════════════════════
function TiendaTab({ notify, apiFetch, isAdmin, isTesorero, alumnos = [], cuentas = [], metodosPago = [] }: any) {
  const [subTab, setSubTab] = useState<'catalogo' | 'ventas'>('catalogo');
  const [productos, setProductos] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Modales
  const [modalProducto, setModalProducto] = useState<any>(null);
  const [formProd, setFormProd] = useState<any>({});
  const [modalVenta, setModalVenta] = useState<any>(null);
  const [formVenta, setFormVenta] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, vts] = await Promise.all([
        apiFetch('/academia/productos').catch(() => []),
        apiFetch('/academia/ventas-productos').catch(() => []),
      ]);
      setProductos(Array.isArray(prods) ? prods : []);
      setVentas(Array.isArray(vts) ? vts : []);
    } catch (err: any) {
      notify(err.message || 'Error al cargar productos y ventas', 'err');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de productos
  const filteredProductos = productos.filter((p: any) => {
    const matchesSearch = !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = !filtroTipo || p.tipo === filtroTipo;
    return matchesSearch && matchesTipo;
  });

  // Abrir nuevo producto
  const openNewProducto = () => {
    setFormProd({
      nombre: '',
      tipo: 'uniforme',
      descripcion: '',
      talle_variante: '',
      precio: 0,
      stock: 10,
      stock_minimo: 3,
    });
    setModalProducto('new');
  };

  // Abrir edición de producto
  const openEditProducto = (p: any) => {
    setFormProd({ ...p });
    setModalProducto(p.id);
  };

  // Guardar producto
  const saveProducto = async () => {
    if (!formProd.nombre) return notify('Ingresá el nombre del artículo', 'err');
    setSaving(true);
    try {
      if (modalProducto === 'new') {
        await apiFetch('/academia/productos', { method: 'POST', body: JSON.stringify(formProd) });
        notify('Artículo creado exitosamente');
      } else {
        await apiFetch(`/academia/productos/${modalProducto}`, { method: 'PUT', body: JSON.stringify(formProd) });
        notify('Artículo actualizado exitosamente');
      }
      await cargarDatos();
      setModalProducto(null);
    } catch (err: any) {
      notify(err.message || 'Error al guardar producto', 'err');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar producto
  const deleteProducto = async (prodId: string) => {
    if (!confirm('¿Seguro que deseás eliminar este producto?')) return;
    try {
      await apiFetch(`/academia/productos/${prodId}`, { method: 'DELETE' });
      notify('Producto eliminado');
      await cargarDatos();
    } catch (err: any) {
      notify(err.message || 'Error al eliminar', 'err');
    }
  };

  // Abrir modal de venta
  const openVentaModal = (p?: any) => {
    const prodSeleccionado = p || productos[0];
    const precioUnitario = prodSeleccionado ? prodSeleccionado.precio : 0;
    setFormVenta({
      producto_id: prodSeleccionado?.id || '',
      alumno_id: '',
      cantidad: 1,
      precio_unitario: precioUnitario,
      cuenta_id: cuentas[0]?.id || '',
      metodo_pago_id: metodosPago[0]?.id || '',
      metodo_pago: '',
      entregado: true,
      generar_factura: false,
      notas: '',
    });
    setModalVenta(true);
  };

  // Cuando cambia el producto en el formulario de venta, actualizar el precio unitario
  const handleVentaProductoChange = (prodId: string) => {
    const p = productos.find((prod: any) => prod.id === prodId);
    setFormVenta((f: any) => ({
      ...f,
      producto_id: prodId,
      precio_unitario: p ? p.precio : f.precio_unitario,
    }));
  };

  // Guardar venta
  const saveVenta = async () => {
    if (!formVenta.producto_id) return notify('Seleccioná un producto', 'err');
    if (!formVenta.cantidad || formVenta.cantidad <= 0) return notify('Ingresá una cantidad válida', 'err');
    setSaving(true);
    try {
      const res = await apiFetch('/academia/ventas-productos', {
        method: 'POST',
        body: JSON.stringify(formVenta),
      });
      notify(res.message || 'Venta registrada exitosamente');
      await cargarDatos();
      setModalVenta(false);
    } catch (err: any) {
      notify(err.message || 'Error al registrar venta', 'err');
    } finally {
      setSaving(false);
    }
  };

  // Marcar venta como entregada
  const marcarEntregado = async (ventaId: string) => {
    try {
      await apiFetch(`/academia/ventas-productos/${ventaId}/entregar`, { method: 'PUT' });
      notify('Pedido marcado como entregado');
      await cargarDatos();
    } catch (err: any) {
      notify(err.message || 'Error al actualizar estado', 'err');
    }
  };

  const tipoBadgeColor: Record<string, string> = {
    uniforme: C.primary,
    accesorio: C.purple,
    indumentaria: '#06b6d4',
    calzado: '#f59e0b',
    otro: C.muted,
  };

  const totalVentasGs = ventas.reduce((acc, v) => acc + (v.precio_total || 0), 0);
  const pendientesEntrega = ventas.filter(v => !v.entregado).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Uniformes y Accesorios</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Gestión de indumentaria, talles, stock en depósito y ventas directas a alumnos.
          </p>
        </div>
        {(isAdmin || isTesorero) && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openVentaModal()} style={btn(C.green)}>
              <ShoppingBag size={15} /> Registrar Venta / Pedido
            </button>
            <button onClick={openNewProducto} style={btn(C.primary)}>
              <Plus size={15} /> Nuevo Artículo
            </button>
          </div>
        )}
      </div>

      {/* Subtabs Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
        <button
          onClick={() => setSubTab('catalogo')}
          style={{ ...btn(subTab === 'catalogo' ? C.primary : 'transparent', subTab !== 'catalogo'), borderRadius: 20 }}
        >
          🎽 Catálogo de Artículos ({productos.length})
        </button>
        <button
          onClick={() => setSubTab('ventas')}
          style={{ ...btn(subTab === 'ventas' ? C.purple : 'transparent', subTab !== 'ventas'), borderRadius: 20 }}
        >
          🛍️ Historial de Ventas y Pedidos ({ventas.length})
          {pendientesEntrega > 0 && (
            <span style={{ marginLeft: 6, background: C.yellow, color: '#000', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
              {pendientesEntrega} pend.
            </span>
          )}
        </button>
      </div>

      {/* ─── SUBTAB: CATÁLOGO DE PRODUCTOS ─── */}
      {subTab === 'catalogo' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar artículo..."
              style={input({ maxWidth: 280 })}
            />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={{ ...input({ width: 200 }) }}
            >
              <option value="">Todos los tipos</option>
              <option value="uniforme">Uniformes Oficiales</option>
              <option value="accesorio">Accesorios y Equipamiento</option>
              <option value="indumentaria">Indumentaria y Remeras</option>
              <option value="calzado">Calzados y Medias</option>
              <option value="otro">Otros</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando catálogo...</div>
          ) : filteredProductos.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', padding: 50, color: C.faint }}>
              <Package size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3 style={{ margin: 0, color: C.text }}>No hay productos registrados</h3>
              <p style={{ fontSize: 13, margin: '6px 0 16px' }}>Comenzá agregando uniformes o accesorios para vender a tus alumnos.</p>
              {(isAdmin || isTesorero) && (
                <button onClick={openNewProducto} style={btn()}><Plus size={14} /> Agregar Producto</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filteredProductos.map((p: any) => {
                const stockBajo = p.stock <= (p.stock_minimo || 3);
                return (
                  <div key={p.id} style={{ ...card({ padding: 18 }), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={badge(tipoBadgeColor[p.tipo] || C.muted)}>{p.tipo?.toUpperCase()}</span>
                        <span style={badge(stockBajo ? C.red : C.green)}>
                          {stockBajo ? `⚠️ Stock bajo (${p.stock})` : `📦 ${p.stock} unid.`}
                        </span>
                      </div>
                      <h3 style={{ margin: '4px 0', fontSize: 16, fontWeight: 800, color: C.text }}>{p.nombre}</h3>
                      {p.talle_variante && (
                        <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginBottom: 6 }}>
                          Talles: {p.talle_variante}
                        </div>
                      )}
                      {p.descripcion && (
                        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px', lineHeight: 1.4 }}>
                          {p.descripcion}
                        </p>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${C.border}44`, paddingTop: 12, marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Precio Unitario</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>
                          Gs. {(p.precio || 0).toLocaleString('es-PY')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {(isAdmin || isTesorero) && (
                          <>
                            <button onClick={() => openVentaModal(p)} style={{ ...btn(C.green), fontSize: 11, padding: '6px 10px' }} title="Vender a alumno">
                              <ShoppingBag size={12} /> Vender
                            </button>
                            <button onClick={() => openEditProducto(p)} style={{ ...btn(C.primary, true), fontSize: 11, padding: '6px 8px' }} title="Editar">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteProducto(p.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '6px 8px' }} title="Eliminar">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── SUBTAB: HISTORIAL DE VENTAS Y PEDIDOS ─── */}
      {subTab === 'ventas' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}33`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>RECAUDACIÓN POR PRODUCTOS</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.green, marginTop: 4 }}>
                Gs. {totalVentasGs.toLocaleString('es-PY')}
              </div>
            </div>
            <div style={{ background: `${pendientesEntrega > 0 ? C.yellow : C.green}15`, border: `1px solid ${pendientesEntrega > 0 ? C.yellow : C.green}33`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>PEDIDOS PENDIENTES DE ENTREGA</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: pendientesEntrega > 0 ? C.yellow : C.green, marginTop: 4 }}>
                {pendientesEntrega} pedidos
              </div>
            </div>
          </div>

          <div style={card({ padding: 0 })}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Fecha', 'Alumno / Cliente', 'Producto', 'Cant.', 'Total (Gs.)', 'Medio de Pago', 'Estado Entrega', 'Acción'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 14px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: C.faint }}>No hay ventas registradas aún.</td></tr>
                ) : (
                  ventas.map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12 }}>{v.fecha_venta?.slice(0, 10)}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{v.alumno_nombre || 'Público General'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{v.producto_nombre}</div>
                        {v.talle_variante && <div style={{ fontSize: 11, color: C.muted }}>Talle: {v.talle_variante}</div>}
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>{v.cantidad}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>Gs. {(v.precio_total || 0).toLocaleString('es-PY')}</td>
                      <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12 }}>{v.metodo_pago_nombre || v.metodo_pago || 'Efectivo'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={badge(v.entregado ? C.green : C.yellow)}>
                          {v.entregado ? '✅ Entregado' : '⏳ Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        {!v.entregado && (isAdmin || isTesorero) && (
                          <button
                            onClick={() => marcarEntregado(v.id)}
                            style={{ ...btn(C.green, true), fontSize: 11, padding: '4px 8px' }}
                          >
                            <Check size={11} /> Entregar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ MODAL CREAR / EDITAR PRODUCTO ════ */}
      {modalProducto && (
        <Modal title={modalProducto === 'new' ? 'Nuevo Artículo / Uniforme' : 'Editar Artículo'} onClose={() => setModalProducto(null)}>
          <FormField label="Nombre del Artículo *" value={formProd.nombre} onChange={v => setFormProd((f: any) => ({ ...f, nombre: v }))} placeholder="Ej: Camiseta Oficial Titular" />

          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Tipo de Artículo *</label>
            <select value={formProd.tipo || 'uniforme'} onChange={e => setFormProd((f: any) => ({ ...f, tipo: e.target.value }))} style={input()}>
              <option value="uniforme">Uniforme Oficial</option>
              <option value="accesorio">Accesorio / Equipamiento</option>
              <option value="indumentaria">Indumentaria de Entrenamiento</option>
              <option value="calzado">Calzado / Medias</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <FormField
            label="Talles o Variantes Disponibles"
            value={formProd.talle_variante}
            onChange={v => setFormProd((f: any) => ({ ...f, talle_variante: v }))}
            placeholder="Ej: Talles 6, 8, 10, 12, S, M, L, XL"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Precio de Venta (Gs.) *" type="number" value={formProd.precio} onChange={v => setFormProd((f: any) => ({ ...f, precio: Number(v) }))} />
            <FormField label="Stock Actual (unidades) *" type="number" value={formProd.stock} onChange={v => setFormProd((f: any) => ({ ...f, stock: Number(v) }))} />
          </div>

          <FormField label="Alerta de Stock Mínimo" type="number" value={formProd.stock_minimo} onChange={v => setFormProd((f: any) => ({ ...f, stock_minimo: Number(v) }))} placeholder="3" />
          <FormField label="Descripción o especificaciones" value={formProd.descripcion} onChange={v => setFormProd((f: any) => ({ ...f, descripcion: v }))} placeholder="Detalles de tela, color o marca..." />

          <ModalActions onCancel={() => setModalProducto(null)} onSave={saveProducto} saving={saving} />
        </Modal>
      )}

      {/* ════ MODAL REGISTRAR VENTA ════ */}
      {modalVenta && (
        <Modal title="Registrar Venta de Uniforme / Accesorio" onClose={() => setModalVenta(false)} wide>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Producto / Artículo *</label>
            <select value={formVenta.producto_id} onChange={e => handleVentaProductoChange(e.target.value)} style={input()}>
              <option value="">Seleccionar artículo...</option>
              {productos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — Gs. {(p.precio || 0).toLocaleString('es-PY')} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Alumno Comprador (Opcional — vincular a su ficha)</label>
            <select value={formVenta.alumno_id} onChange={e => setFormVenta((f: any) => ({ ...f, alumno_id: e.target.value }))} style={input()}>
              <option value="">— Público General / Sin alumno asociado —</option>
              {alumnos.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Cantidad *" type="number" value={formVenta.cantidad} onChange={v => setFormVenta((f: any) => ({ ...f, cantidad: Number(v) }))} />
            <FormField label="Precio Unitario (Gs.)" type="number" value={formVenta.precio_unitario} onChange={v => setFormVenta((f: any) => ({ ...f, precio_unitario: Number(v) }))} />
            <div>
              <label style={label()}>TOTAL A COBRAR</label>
              <div style={{ ...input(), fontWeight: 800, color: C.green, fontSize: 16 }}>
                Gs. {((formVenta.cantidad || 0) * (formVenta.precio_unitario || 0)).toLocaleString('es-PY')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <div>
              <label style={label()}>Cuenta de Caja Destino</label>
              <select value={formVenta.cuenta_id} onChange={e => setFormVenta((f: any) => ({ ...f, cuenta_id: e.target.value }))} style={input()}>
                <option value="">— Sin especificar cuenta —</option>
                {cuentas.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.tipo === 'efectivo' ? '💵' : '🏦'} {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label()}>Método de Pago</label>
              {metodosPago.length > 0 ? (
                <select value={formVenta.metodo_pago_id} onChange={e => setFormVenta((f: any) => ({ ...f, metodo_pago_id: e.target.value }))} style={input()}>
                  <option value="">— Sin especificar —</option>
                  {metodosPago.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              ) : (
                <select value={formVenta.metodo_pago} onChange={e => setFormVenta((f: any) => ({ ...f, metodo_pago: e.target.value }))} style={input()}>
                  {['Efectivo', 'Transferencia', 'Tarjeta', 'QR', 'Otro'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.text }}>
              <input
                type="checkbox"
                checked={formVenta.entregado}
                onChange={e => setFormVenta((f: any) => ({ ...f, entregado: e.target.checked }))}
              />
              Entregar artículo inmediatamente al comprador (o desmarcar si queda pendiente de entrega)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.text }}>
              <input
                type="checkbox"
                checked={formVenta.generar_factura}
                onChange={e => setFormVenta((f: any) => ({ ...f, generar_factura: e.target.checked }))}
              />
              📄 Emitir Factura Electrónica SIFEN por esta venta
            </label>
          </div>

          <ModalActions onCancel={() => setModalVenta(false)} onSave={saveVenta} saving={saving} saveLabel="Confirmar Venta y Cobro" />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPETENCIAS Y TORNEOS TAB
// ═══════════════════════════════════════════════════════════
function CompetenciasTab({ notify, apiFetch, isAdmin, isTesorero, alumnos = [] }: any) {
  const [competencias, setCompetencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [search, setSearch] = useState('');

  // Modales
  const [modalComp, setModalComp] = useState<any>(null);
  const [formComp, setFormComp] = useState<any>({});
  const [modalPart, setModalPart] = useState<any>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loadingPart, setLoadingPart] = useState(false);
  const [formPart, setFormPart] = useState<any>({ alumno_id: '', categoria_modalidad: '', arancel_pagado: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarCompetencias();
  }, []);

  const cargarCompetencias = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/academia/competencias');
      setCompetencias(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err.message || 'Error al cargar competencias', 'err');
    } finally {
      setLoading(false);
    }
  };

  const filteredComp = competencias.filter((c: any) => {
    const matchesSearch = !search || c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.sede_lugar?.toLowerCase().includes(search.toLowerCase());
    const matchesEstado = !filtroEstado || c.estado === filtroEstado;
    return matchesSearch && matchesEstado;
  });

  const openNewComp = () => {
    const hoyStr = new Date().toISOString().slice(0, 10);
    setFormComp({
      nombre: '',
      deporte: 'Fútbol',
      fecha_inicio: hoyStr,
      fecha_fin: hoyStr,
      sede_lugar: '',
      costo_inscripcion: 0,
      descripcion: '',
      estado: 'programada',
    });
    setModalComp('new');
  };

  const openEditComp = (c: any) => {
    setFormComp({ ...c });
    setModalComp(c.id);
  };

  const saveComp = async () => {
    if (!formComp.nombre) return notify('Ingresá el nombre del torneo o competencia', 'err');
    setSaving(true);
    try {
      if (modalComp === 'new') {
        await apiFetch('/academia/competencias', { method: 'POST', body: JSON.stringify(formComp) });
        notify('Competencia creada exitosamente');
      } else {
        await apiFetch(`/academia/competencias/${modalComp}`, { method: 'PUT', body: JSON.stringify(formComp) });
        notify('Competencia actualizada exitosamente');
      }
      await cargarCompetencias();
      setModalComp(null);
    } catch (err: any) {
      notify(err.message || 'Error al guardar competencia', 'err');
    } finally {
      setSaving(false);
    }
  };

  const deleteComp = async (compId: string) => {
    if (!confirm('¿Seguro que deseás eliminar esta competencia?')) return;
    try {
      await apiFetch(`/academia/competencias/${compId}`, { method: 'DELETE' });
      notify('Competencia eliminada');
      await cargarCompetencias();
    } catch (err: any) {
      notify(err.message || 'Error al eliminar', 'err');
    }
  };

  // Abrir modal de participantes
  const openParticipantesModal = async (c: any) => {
    setModalPart(c);
    setLoadingPart(true);
    setFormPart({ alumno_id: '', categoria_modalidad: '', arancel_pagado: false });
    try {
      const data = await apiFetch(`/academia/competencias/${c.id}/participantes`);
      setParticipantes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err.message || 'Error al cargar participantes', 'err');
    } finally {
      setLoadingPart(false);
    }
  };

  // Inscribir alumno en competencia
  const addParticipante = async () => {
    if (!formPart.alumno_id) return notify('Seleccioná un alumno', 'err');
    setSaving(true);
    try {
      await apiFetch(`/academia/competencias/${modalPart.id}/participantes`, {
        method: 'POST',
        body: JSON.stringify(formPart),
      });
      notify('Alumno inscripto en la competencia');
      const updated = await apiFetch(`/academia/competencias/${modalPart.id}/participantes`);
      setParticipantes(Array.isArray(updated) ? updated : []);
      setFormPart({ alumno_id: '', categoria_modalidad: '', arancel_pagado: false });
      await cargarCompetencias();
    } catch (err: any) {
      notify(err.message || 'Error al inscribir participante', 'err');
    } finally {
      setSaving(false);
    }
  };

  // Toggle arancel pagado
  const toggleArancelPagado = async (p: any) => {
    try {
      await apiFetch(`/academia/competencias/${modalPart.id}/participantes/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ arancel_pagado: !p.arancel_pagado }),
      });
      const updated = await apiFetch(`/academia/competencias/${modalPart.id}/participantes`);
      setParticipantes(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      notify(err.message || 'Error al actualizar arancel', 'err');
    }
  };

  // Actualizar puesto / podio
  const updatePuesto = async (p: any, puesto: string) => {
    try {
      await apiFetch(`/academia/competencias/${modalPart.id}/participantes/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ puesto_obtenido: puesto }),
      });
      notify('Resultado / Podio registrado');
      const updated = await apiFetch(`/academia/competencias/${modalPart.id}/participantes`);
      setParticipantes(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      notify(err.message || 'Error al registrar podio', 'err');
    }
  };

  // Quitar participante
  const removeParticipante = async (partId: string) => {
    if (!confirm('¿Quitar alumno de esta competencia?')) return;
    try {
      await apiFetch(`/academia/competencias/${modalPart.id}/participantes/${partId}`, {
        method: 'DELETE',
      });
      notify('Participante eliminado');
      const updated = await apiFetch(`/academia/competencias/${modalPart.id}/participantes`);
      setParticipantes(Array.isArray(updated) ? updated : []);
      await cargarCompetencias();
    } catch (err: any) {
      notify(err.message || 'Error al quitar participante', 'err');
    }
  };

  const compEstadoColor: Record<string, string> = {
    programada: C.primary,
    en_curso: C.green,
    finalizada: C.purple,
    cancelada: C.faint,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Competencias y Torneos</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Planificación de torneos, inscripción de alumnos, aranceles y seguimiento de podios.
          </p>
        </div>
        {(isAdmin || isTesorero) && (
          <button onClick={openNewComp} style={btn(C.primary)}>
            <Trophy size={15} /> Nueva Competencia
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar competencia o torneo..."
          style={input({ maxWidth: 280 })}
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{ ...input({ width: 180 }) }}
        >
          <option value="">Todos los estados</option>
          <option value="programada">Programada</option>
          <option value="en_curso">En Curso</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando competencias...</div>
      ) : filteredComp.length === 0 ? (
        <div style={{ ...card(), textAlign: 'center', padding: 50, color: C.faint }}>
          <Trophy size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ margin: 0, color: C.text }}>No hay competencias registradas</h3>
          <p style={{ fontSize: 13, margin: '6px 0 16px' }}>Creá torneos y eventos deportivos para inscribir a tus alumnos y registrar sus logros.</p>
          {(isAdmin || isTesorero) && (
            <button onClick={openNewComp} style={btn()}><Plus size={14} /> Crear Torneo</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filteredComp.map((c: any) => (
            <div key={c.id} style={{ ...card({ padding: 20 }), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={badge(compEstadoColor[c.estado] || C.muted)}>{c.estado?.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>
                    📅 {c.fecha_inicio}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0', fontSize: 17, fontWeight: 800, color: C.text }}>{c.nombre}</h3>
                <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginTop: 4 }}>
                  🏆 {c.deporte} {c.sede_lugar ? `· 📍 ${c.sede_lugar}` : ''}
                </div>
                {c.descripcion && (
                  <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 12px', lineHeight: 1.4 }}>
                    {c.descripcion}
                  </p>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${C.border}44`, paddingTop: 12, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Inscripción / Arancel</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                      {c.costo_inscripcion > 0 ? `Gs. ${c.costo_inscripcion.toLocaleString('es-PY')}` : 'Gratuito'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.muted }}>Participantes</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.purple }}>
                      👥 {c.total_participantes || 0} alumnos
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openParticipantesModal(c)}
                    style={{ ...btn(C.purple), fontSize: 11, padding: '6px 12px' }}
                  >
                    👥 Participantes y Podios
                  </button>
                  {(isAdmin || isTesorero) && (
                    <>
                      <button onClick={() => openEditComp(c)} style={{ ...btn(C.primary, true), fontSize: 11, padding: '6px 8px' }} title="Editar">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteComp(c.id)} style={{ ...btn(C.red, true), fontSize: 11, padding: '6px 8px' }} title="Eliminar">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ MODAL CREAR / EDITAR COMPETENCIA ════ */}
      {modalComp && (
        <Modal title={modalComp === 'new' ? 'Nueva Competencia / Torneo' : 'Editar Competencia'} onClose={() => setModalComp(null)} wide>
          <FormField label="Nombre de la Competencia *" value={formComp.nombre} onChange={v => setFormComp((f: any) => ({ ...f, nombre: v }))} placeholder="Ej: Torneo Apertura Sub-12" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Deporte / Modalidad *" value={formComp.deporte} onChange={v => setFormComp((f: any) => ({ ...f, deporte: v }))} placeholder="Fútbol, Tenis, Pádel..." />
            <div>
              <label style={label()}>Estado del Evento</label>
              <select value={formComp.estado || 'programada'} onChange={e => setFormComp((f: any) => ({ ...f, estado: e.target.value }))} style={input()}>
                <option value="programada">Programada</option>
                <option value="en_curso">En Curso</option>
                <option value="finalizada">Finalizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Fecha de Inicio *" type="date" value={formComp.fecha_inicio || ''} onChange={v => setFormComp((f: any) => ({ ...f, fecha_inicio: v }))} />
            <FormField label="Fecha de Fin" type="date" value={formComp.fecha_fin || ''} onChange={v => setFormComp((f: any) => ({ ...f, fecha_fin: v }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Sede o Lugar de Encuentro" value={formComp.sede_lugar} onChange={v => setFormComp((f: any) => ({ ...f, sede_lugar: v }))} placeholder="Cancha Principal Sede Central" />
            <FormField label="Arancel / Costo de Inscripción (Gs.)" type="number" value={formComp.costo_inscripcion} onChange={v => setFormComp((f: any) => ({ ...f, costo_inscripcion: Number(v) }))} />
          </div>

          <FormField label="Descripción o bases del torneo" value={formComp.descripcion} onChange={v => setFormComp((f: any) => ({ ...f, descripcion: v }))} placeholder="Reglamento, premios o detalles..." />

          <ModalActions onCancel={() => setModalComp(null)} onSave={saveComp} saving={saving} />
        </Modal>
      )}

      {/* ════ MODAL PARTICIPANTES Y PODIOS ════ */}
      {modalPart && (
        <Modal title={`Participantes — ${modalPart.nombre}`} onClose={() => setModalPart(null)} wide>
          {/* Formulario para agregar participante */}
          <div style={{ background: `${C.bg}88`, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Inscribir Alumno al Torneo:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={label()}>Alumno *</label>
                <select value={formPart.alumno_id} onChange={e => setFormPart((f: any) => ({ ...f, alumno_id: e.target.value }))} style={input()}>
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label()}>Categoría / División</label>
                <input
                  value={formPart.categoria_modalidad}
                  onChange={e => setFormPart((f: any) => ({ ...f, categoria_modalidad: e.target.value }))}
                  placeholder="Ej: Sub-12 Varones, Dobles"
                  style={input()}
                />
              </div>
              <button
                type="button"
                onClick={addParticipante}
                disabled={saving}
                style={{ ...btn(C.primary), padding: '10px 14px', height: 40 }}
              >
                <Plus size={14} /> Inscribir
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: C.muted }}>
                <input
                  type="checkbox"
                  checked={formPart.arancel_pagado}
                  onChange={e => setFormPart((f: any) => ({ ...f, arancel_pagado: e.target.checked }))}
                />
                Marcar arancel de inscripción como pagado inmediatamente
              </label>
            </div>
          </div>

          {/* Tabla de Participantes */}
          <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: `${C.bg}aa`, borderBottom: `1px solid ${C.border}` }}>
                  {['Alumno', 'División / Modalidad', 'Arancel', 'Podio / Puesto', 'Acción'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 12px', color: C.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPart ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: C.muted }}>Cargando participantes...</td></tr>
                ) : participantes.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.faint }}>No hay alumnos inscriptos aún en este torneo.</td></tr>
                ) : (
                  participantes.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.alumno_nombre}</td>
                      <td style={{ padding: '8px 12px', color: C.muted }}>{p.categoria_modalidad || 'General'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          onClick={() => toggleArancelPagado(p)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: 0
                          }}
                          title="Clic para alternar estado de pago del arancel"
                        >
                          <span style={badge(p.arancel_pagado ? C.green : C.yellow)}>
                            {p.arancel_pagado ? '✅ Pagado' : '⏳ Pendiente'}
                          </span>
                        </button>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={p.puesto_obtenido || ''}
                          onChange={e => updatePuesto(p, e.target.value)}
                          style={{ ...input({ padding: '4px 8px', fontSize: 11, width: 140 }), fontWeight: p.puesto_obtenido ? 700 : 400 }}
                        >
                          <option value="">— Sin puesto —</option>
                          <option value="1er Lugar 🥇">🥇 1er Lugar</option>
                          <option value="2do Lugar 🥈">🥈 2do Lugar</option>
                          <option value="3er Lugar 🥉">🥉 3er Lugar</option>
                          <option value="Mención de Honor 🏅">🏅 Mención de Honor</option>
                          <option value="Participación 🎖️">🎖️ Participación</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          onClick={() => removeParticipante(p.id)}
                          style={{ ...btn(C.red, true), padding: '4px 8px', fontSize: 11 }}
                          title="Quitar"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setModalPart(null)} style={btn(C.primary)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

