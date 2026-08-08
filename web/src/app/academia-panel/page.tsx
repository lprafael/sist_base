/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Building2, Users, CreditCard, ClipboardList,
  Settings, LogOut, Plus, Pencil, Trash2, Check, X, Upload,
  ChevronRight, AlertCircle, Save, Eye, RefreshCw, UserPlus,
  Calendar, TrendingUp, DollarSign, BookOpen, BarChart3, Link as LinkIcon,
  MessageSquare, FileText, Tag, Printer, QrCode, PhoneCall, Sparkles, Search, Image as ImageIcon
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

// ─── Colores ───────────────────────────────────────────────
const C = {
  bg: '#0f172a', surface: '#1e293b', border: '#334155',
  primary: '#3b82f6', primaryHover: '#2563eb',
  text: '#f1f5f9', muted: '#94a3b8', faint: '#64748b',
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', purple: '#8b5cf6',
};

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
  background: '#0f172a', border: `1px solid ${C.border}`,
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
type Tab = 'dashboard' | 'perfil' | 'sucursales' | 'categorias' | 'horarios_practica' | 'tarifas_costos' | 'alumnos' | 'tutores' | 'inscripciones' | 'cuotas' | 'reportes' | 'asistencias' | 'noticias' | 'feedback' | 'staff' | 'config';

interface Stat { label: string; value: string | number; icon: any; color: string; }

// ─────────────────────────────────────────────────────────────
export default function AcademiaPanel() {
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [notif, setNotif] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Data
  const [perfil, setPerfil] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [tutores, setTutores] = useState<any[]>([]);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<string[]>([]);
  const [configCuotas, setConfigCuotas] = useState<any>(null);

  // Modals
  const [modalSucursal, setModalSucursal] = useState<any>(null); // null | {} | {existing}
  const [modalAlumno, setModalAlumno] = useState<any>(null);
  const [modalStaff, setModalStaff] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [modalInscripcion, setModalInscripcion] = useState<any>(null);

  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileBannerRef = useRef<HTMLInputElement>(null);

  // ── Auth ────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user_session');
    if (!raw) { setLoading(false); return; }
    const s = JSON.parse(raw);
    setSession(s);
    setToken(s.token || s.access_token || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const apiFetch = async (endpoint: string, opts: any = {}) => {
    const acadId = session?.academia_id || session?.id || '';
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(acadId ? { 'X-Academia-Id': acadId } : {}),
        ...opts.headers,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('user_session');
      window.location.href = '/login';
      throw new Error('Sesión expirada.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Error en la petición.');
    return data;
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  const fetchAll = async () => {
    try {
      const [p, s, cat, d] = await Promise.all([
        apiFetch('/academia/perfil').catch(() => null),
        apiFetch('/academia/sucursales').catch(() => []),
        apiFetch('/academia/categorias').catch(() => []),
        apiFetch('/api/deportes').catch(() => []),
      ]);
      setPerfil(p);
      setSucursales(s || []);
      setCategorias(cat || []);
      setDeportes(d || []);

      // Cargas opcionales según tab
      apiFetch('/academia/alumnos').then(setAlumnos).catch(() => {});
      apiFetch('/academia/tutores').then(setTutores).catch(() => {});
      apiFetch('/academia/inscripciones').then(setInscripciones).catch(() => {});
      apiFetch('/academia/cuotas').then(setCuotas).catch(() => {});
      apiFetch('/academia/miembros').then(setStaff).catch(() => {});
      apiFetch('/academia/config-cuotas').then(setConfigCuotas).catch(() => {});
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
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text }}>
      {/* ── Sidebar ── */}
      <Sidebar activeTab={activeTab} setTab={setActiveTab} perfil={perfil} rolInterno={rolInterno} session={session} />

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
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

        <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
          {/* ──────────────── DASHBOARD ──────────────── */}
          {activeTab === 'dashboard' && (
            <DashboardTab 
              perfil={perfil} sucursales={sucursales} alumnos={alumnos}
              inscripciones={inscripciones} cuotas={cuotas} setTab={setActiveTab}
            />
          )}

          {/* ──────────────── PERFIL ──────────────── */}
          {activeTab === 'perfil' && (
            <PerfilTab
              perfil={perfil} setPerfil={setPerfil} token={token}
              fileLogoRef={fileLogoRef} fileBannerRef={fileBannerRef}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} fetchAll={fetchAll}
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

          {/* ──────────────── CATEGORÍAS ──────────────── */}
          {activeTab === 'categorias' && (
            <CategoriasTab
              categorias={categorias} sucursales={sucursales}
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
              sucursales={sucursales} modal={modalAlumno} setModal={setModalAlumno}
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
            />
          )}

          {/* ──────────────── REPORTES Y CARNETS ──────────────── */}
          {activeTab === 'reportes' && (
            <ReportesTab
              perfil={perfil} sucursales={sucursales} categorias={categorias}
              notify={notify} apiFetch={apiFetch}
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════
function Sidebar({ activeTab, setTab, perfil, rolInterno, session }: any) {
  const navItems: { id: Tab; label: string; icon: any; roles?: string[] }[] = [
    { id: 'dashboard',         label: 'Dashboard',             icon: BarChart3 },
    { id: 'perfil',            label: 'Mi Academia',            icon: GraduationCap, roles: ['dueño','administrador'] },
    { id: 'sucursales',        label: 'Sedes y Canchas',        icon: Building2 },
    { id: 'categorias',        label: 'Categorías',            icon: Tag, roles: ['dueño','administrador'] },
    { id: 'horarios_practica', label: 'Horarios de Práctica',    icon: Calendar, roles: ['dueño','administrador'] },
    { id: 'tarifas_costos',    label: 'Costos e Indumentaria',  icon: DollarSign, roles: ['dueño','administrador','tesorero'] },
    { id: 'alumnos',           label: 'Alumnos',                icon: Users },
    { id: 'tutores',           label: 'Tutores / Padres',       icon: Users, roles: ['dueño','administrador','tesorero'] },
    { id: 'inscripciones',     label: 'Inscripciones',          icon: BookOpen },
    { id: 'cuotas',            label: 'Cuotas / Pagos',         icon: CreditCard, roles: ['dueño','administrador','tesorero'] },
    { id: 'reportes',          label: 'Reportes y Carnets',     icon: ClipboardList, roles: ['dueño','administrador','tesorero','profesor'] },
    { id: 'asistencias',       label: 'Asistencias',            icon: Calendar, roles: ['dueño','administrador','profesor'] },
    { id: 'noticias',          label: 'Noticias CMS',           icon: FileText, roles: ['dueño','administrador'] },
    { id: 'feedback',          label: 'Feedback Socios',        icon: MessageSquare, roles: ['dueño','administrador'] },
    { id: 'staff',             label: 'Mi Equipo',              icon: UserPlus, roles: ['dueño'] },
    { id: 'config',            label: 'Configuración',          icon: Settings, roles: ['dueño','tesorero'] },
  ];

  const visible = navItems.filter(n => !n.roles || n.roles.includes(rolInterno));

  return (
    <div style={{
      width: 230, background: '#0b1120', borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px', borderBottom: `1px solid ${C.border}` }}>
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
        {perfil?.nombre && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted, fontWeight: 600, lineHeight: 1.3 }}>
            {perfil.nombre}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {visible.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
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

      {/* Footer sidebar */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
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
        <button onClick={() => { localStorage.removeItem('user_session'); window.location.href = 'https://micancha.com.py'; }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8, background: 'transparent',
          border: 'none', color: C.faint, fontSize: 12, cursor: 'pointer',
        }}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function DashboardTab({ stats: propStats, cuotasPendientesGs: propCuotasPendientes, cuotas = [], alumnos = [], sucursales = [], perfil, inscripciones = [] }: any) {
  const stats: Stat[] = propStats || [
    { label: 'Alumnos activos', value: alumnos.filter((a: any) => a.estado === 'activo').length, icon: Users, color: C.green },
    { label: 'Sucursales', value: sucursales.filter((s: any) => s.activa).length, icon: Building2, color: C.primary },
    { label: 'Inscripciones activas', value: inscripciones.filter((i: any) => i.estado === 'activa').length, icon: BookOpen, color: C.purple },
    { label: 'Cuotas pendientes', value: cuotas.filter((q: any) => q.estado === 'pendiente').length, icon: CreditCard, color: C.yellow },
  ];

  const cuotasPendientesGs = propCuotasPendientes ?? cuotas.filter((q: any) => q.estado === 'pendiente').reduce((s: number, q: any) => s + (q.monto_final || 0), 0);
  const cuotasMes = cuotas.slice(0, 8);
  return (
    <div>
      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>Dashboard</h1>
      <p style={{ color: C.muted, margin: '0 0 28px', fontSize: 14 }}>Resumen general de tu academia</p>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map((s: Stat, i: number) => {
          const Icon = s.icon;
          return (
            <div key={i} style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: `${s.color}18` }}>
                  <Icon size={22} color={s.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerta de cuotas pendientes */}
      {cuotasPendientesGs > 0 && (
        <div style={{
          ...card(), marginBottom: 20,
          border: `1px solid ${C.yellow}44`, background: `${C.yellow}08`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <AlertCircle size={22} color={C.yellow} />
          <div>
            <div style={{ fontWeight: 700, color: C.yellow }}>Cuotas pendientes de cobro</div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {cuotas.filter((q: any) => q.estado === 'pendiente').length} cuotas por un total de
              {' '}
              <strong style={{ color: C.text }}>
                Gs. {cuotasPendientesGs.toLocaleString('es-PY')}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Últimas cuotas */}
      {cuotasMes.length > 0 && (
        <div style={card()}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} color={C.primary} /> Últimas cuotas registradas
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Alumno', 'Período', 'Monto', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuotasMes.map((q: any) => (
                <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                  <td style={{ padding: '9px 8px', fontWeight: 600 }}>{q.alumno}</td>
                  <td style={{ padding: '9px 8px', color: C.muted }}>{q.periodo}</td>
                  <td style={{ padding: '9px 8px' }}>Gs. {q.monto_final.toLocaleString('es-PY')}</td>
                  <td style={{ padding: '9px 8px' }}>
                    <span style={badge(q.estado === 'pagada' ? C.green : q.estado === 'pendiente' ? C.yellow : C.red)}>
                      {q.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sin configurar página */}
      {!perfil?.enlace_sitio && (
        <div style={{ ...card(), marginTop: 20, border: `1px solid ${C.primary}44`, background: `${C.primary}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LinkIcon size={20} color={C.primary} />
            <div>
              <div style={{ fontWeight: 700, color: C.primary }}>Tu página pública no está configurada</div>
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
function PerfilTab({ perfil, setPerfil, token, fileLogoRef, fileBannerRef, notify, apiFetch, isDueno }: any) {
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
function AlumnosTab({ alumnos, setAlumnos, sucursales, modal, setModal, notify, apiFetch, isAdmin, fetchAll }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = alumnos.filter((a: any) =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ nombre: '', apellido: '', estado: 'activo' }); setModal('new'); };
  const openEdit = (a: any) => { setForm({ ...a }); setModal(a.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'new') {
        await apiFetch('/academia/alumnos', { method: 'POST', body: JSON.stringify(form) });
        notify('Alumno registrado');
      } else {
        await apiFetch(`/academia/alumnos/${modal}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Alumno actualizado');
      }
      await fetchAll();
      setModal(null);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const estadoColor: Record<string, string> = { activo: C.green, inactivo: C.faint, prueba: C.yellow };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Alumnos</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>{alumnos.length} alumnos registrados</p>
        </div>
        {isAdmin && <button onClick={openNew} style={btn()}><Plus size={15} /> Nuevo alumno</button>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar alumno..." style={input({ maxWidth: 360 })} />
      </div>

      <div style={card({ padding: 0 })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Nombre', 'Sucursal', 'Edad', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.faint }}>No hay alumnos.</td></tr>
            )}
            {filtered.map((a: any) => {
              const edad = a.fecha_nacimiento ? Math.floor((Date.now() - new Date(a.fecha_nacimiento).getTime()) / 31557600000) : null;
              return (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <div>{a.nombre} {a.apellido}</div>
                  </td>
                  <td style={{ padding: '11px 16px', color: C.muted }}>{a.sucursal_nombre || '—'}</td>
                  <td style={{ padding: '11px 16px', color: C.muted }}>{edad != null ? `${edad} años` : '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={badge(estadoColor[a.estado] || C.faint)}>{a.estado}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {isAdmin && (
                      <button onClick={() => openEdit(a)} style={{ ...btn(C.primary, true), fontSize: 11, padding: '5px 10px' }}>
                        <Pencil size={11} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal alumno */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo Alumno' : 'Editar Alumno'} onClose={() => setModal(null)} wide>
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
          <ModalActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INSCRIPCIONES
// ═══════════════════════════════════════════════════════════
function InscripcionesTab({ inscripciones, alumnos, categorias, modal, setModal, notify, apiFetch, isAdmin, isTesorero, fetchAll }: any) {
  const [form, setForm] = useState<any>({ dias_por_semana: 3, cuota_mensual: 0, descuento_aplicado: 0, beca: false });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/academia/inscripciones', { method: 'POST', body: JSON.stringify(form) });
      notify('Alumno inscrito correctamente');
      await fetchAll();
      setModal(null);
    } catch (e: any) { notify(e.message, 'err'); }
    setSaving(false);
  };

  const estadoColor: Record<string, string> = { activa: C.green, suspendida: C.yellow, finalizada: C.faint };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Inscripciones</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>{inscripciones.filter((i: any) => i.estado === 'activa').length} inscripciones activas</p>
        </div>
        {(isAdmin || isTesorero) && (
          <button onClick={() => { setForm({ dias_por_semana: 3, cuota_mensual: 0, descuento_aplicado: 0, beca: false }); setModal('new'); }} style={btn()}>
            <Plus size={15} /> Inscribir alumno
          </button>
        )}
      </div>

      <div style={card({ padding: 0 })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Alumno', 'Categoría / Sucursal', 'Cuota mensual', 'Descuento', 'Desde', 'Estado'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inscripciones.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.faint }}>No hay inscripciones.</td></tr>
            )}
            {inscripciones.map((i: any) => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                <td style={{ padding: '11px 16px', fontWeight: 600 }}>{i.alumno_nombre}</td>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ fontWeight: 600 }}>{i.categoria}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{i.sucursal} · {i.deporte}</div>
                </td>
                <td style={{ padding: '11px 16px' }}>Gs. {i.cuota_mensual.toLocaleString('es-PY')}</td>
                <td style={{ padding: '11px 16px', color: i.descuento_aplicado > 0 ? C.green : C.faint }}>
                  {i.descuento_aplicado > 0 ? `-${i.descuento_aplicado}%` : '—'}
                </td>
                <td style={{ padding: '11px 16px', color: C.muted }}>{i.fecha_inicio}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={badge(estadoColor[i.estado] || C.faint)}>{i.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Inscribir Alumno" onClose={() => setModal(null)} wide>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Alumno *</label>
            <select value={form.alumno_id || ''} onChange={e => setForm((f: any) => ({ ...f, alumno_id: e.target.value }))} style={input()}>
              <option value="">Seleccionar alumno...</option>
              {alumnos.map((a: any) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Categoría *</label>
            <select value={form.categoria_id || ''} onChange={e => setForm((f: any) => ({ ...f, categoria_id: e.target.value }))} style={input()}>
              <option value="">Seleccionar categoría...</option>
              {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} — {c.sucursal_nombre}</option>)}
            </select>
          </div>
          <FormField label="Fecha de inicio *" value={form.fecha_inicio || ''} type="date" onChange={v => setForm((f: any) => ({ ...f, fecha_inicio: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Cuota mensual (Gs.)" value={form.cuota_mensual} type="number" onChange={v => setForm((f: any) => ({ ...f, cuota_mensual: Number(v) }))} />
            <FormField label="Días por semana" value={form.dias_por_semana} type="number" onChange={v => setForm((f: any) => ({ ...f, dias_por_semana: Number(v) }))} />
            <FormField label="Descuento (%)" value={form.descuento_aplicado} type="number" onChange={v => setForm((f: any) => ({ ...f, descuento_aplicado: Number(v) }))} />
          </div>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="beca" checked={form.beca} onChange={e => setForm((f: any) => ({ ...f, beca: e.target.checked }))} />
            <label htmlFor="beca" style={{ color: C.text, fontSize: 13, cursor: 'pointer' }}>Beca (cuota $0)</label>
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
function CuotasTab({ cuotas, notify, apiFetch, isTesorero, isDueno, fetchAll }: any) {
  const [subTab, setSubTab] = useState<'cuotas' | 'matriculas'>('cuotas');
  const [generando, setGenerando] = useState(false);
  const [generandoMat, setGenerandoMat] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modals
  const [modalPago, setModalPago] = useState<any>(null);       // cuota seleccionada para pagar
  const [modalHistorial, setModalHistorial] = useState<any>(null); // cuota para ver historial
  const [modalEditar, setModalEditar] = useState<any>(null);   // cuota para editar monto
  const [modalAnular, setModalAnular] = useState<any>(null);   // cuota o pago a anular
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [filtroMatEstado, setFiltroMatEstado] = useState('');

  // Form states
  const [pagoForm, setPagoForm] = useState<any>({ metodo_pago: 'Efectivo', monto: '', fecha_pago: '' });
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
                      <td style={{ padding: '9px 14px', color: q.descuento > 0 ? C.green : C.faint }}>
                        {q.descuento > 0 ? `- Gs. ${(q.descuento || 0).toLocaleString('es-PY')}` : '—'}
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
                              setPagoForm({ metodo_pago: 'Efectivo', monto: saldo > 0 ? String(saldo) : '', fecha_pago: '', notas: '' });
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
      {modalPago && (
        <Modal title={`Registrar Pago — ${modalPago.alumno}`} onClose={() => setModalPago(null)}>
          <div style={{ background: `${C.primary}11`, border: `1px solid ${C.primary}33`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Cuota {modalPago.periodo}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Gs. {(modalPago.monto_final || 0).toLocaleString('es-PY')}</div>
            {modalPago.monto_pagado > 0 && (
              <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>
                Ya pagado: Gs. {(modalPago.monto_pagado || 0).toLocaleString('es-PY')} —
                Saldo: Gs. {((modalPago.monto_final || 0) - (modalPago.monto_pagado || 0)).toLocaleString('es-PY')}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Monto a pagar (Gs.) <span style={{ color: C.faint, fontWeight: 400 }}>— vacío = pago total</span></label>
            <input type="number" placeholder={`${(modalPago.monto_final || 0) - (modalPago.monto_pagado || 0)}`}
              value={pagoForm.monto} onChange={e => setPagoForm((f: any) => ({ ...f, monto: e.target.value }))} style={input()} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Método de pago *</label>
            <select value={pagoForm.metodo_pago} onChange={e => setPagoForm((f: any) => ({ ...f, metodo_pago: e.target.value }))} style={input()}>
              {['Efectivo', 'Transferencia', 'Tarjeta', 'QR', 'Débito', 'Otro'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Fecha de pago (opcional — por defecto hoy)</label>
            <input type="date" value={pagoForm.fecha_pago} onChange={e => setPagoForm((f: any) => ({ ...f, fecha_pago: e.target.value }))} style={input()} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Notas</label>
            <input value={pagoForm.notas} onChange={e => setPagoForm((f: any) => ({ ...f, notas: e.target.value }))} style={input()} placeholder="Observaciones opcionales" />
          </div>
          <ModalActions onCancel={() => setModalPago(null)} onSave={registrarPago} saving={saving}
            saveLabel={pagoForm.monto && parseFloat(pagoForm.monto) < (modalPago.monto_final - modalPago.monto_pagado) ? '💰 Registrar pago parcial' : '✅ Registrar pago total'} />
        </Modal>
      )}

      {/* ════ MODAL: Historial de pagos ════ */}
      {modalHistorial && (
        <Modal title={`Historial de pagos — ${modalHistorial.alumno} (${modalHistorial.periodo})`} onClose={() => setModalHistorial(null)}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              Total: <strong style={{ color: C.text }}>Gs. {(modalHistorial.monto_final || 0).toLocaleString('es-PY')}</strong>
              {' '} · Pagado: <strong style={{ color: C.green }}>Gs. {(modalHistorial.monto_pagado || 0).toLocaleString('es-PY')}</strong>
            </div>
            <span style={badge(estadoColor[modalHistorial.estado] || C.faint)}>{modalHistorial.estado}</span>
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
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Monto final (Gs.) *</label>
            <input type="number" value={editarForm.monto_final} onChange={e => setEditarForm((f: any) => ({ ...f, monto_final: e.target.value }))} style={input()} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label()}>Descuento (Gs.)</label>
            <input type="number" value={editarForm.descuento} onChange={e => setEditarForm((f: any) => ({ ...f, descuento: e.target.value }))} style={input()} />
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
      zIndex: 9000, padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
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
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
                    <option key={c.id} value={c.id}>{c.nombre}</option>
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
// CATEGORÍAS TAB
// ═══════════════════════════════════════════════════════════
function CategoriasTab({ categorias = [], sucursales = [], notify, apiFetch, isAdmin, fetchAll }: any) {
  const listCategorias = Array.isArray(categorias) ? categorias : [];
  const listSucursales = Array.isArray(sucursales) ? sucursales : [];
  const [modal, setModal] = useState<any>(null);

  const abrirNuevo = () => {
    setModal({
      nombre: '',
      edad_min: 5,
      edad_max: 17,
      descripcion: '',
      color: '#3b82f6',
      sucursal_id: listSucursales[0]?.id || '',
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Categorías de la Academia</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Gestioná los grupos, edades y categorías deportivas (ej: Cat. 2018, Sub-15, Femenino) de tu academia.
          </p>
        </div>
        {isAdmin && (
          <button onClick={abrirNuevo} style={btn(C.primary)}>
            <Plus size={16} /> Crear Categoría
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {listCategorias.map((cat: any) => (
          <div key={cat.id} style={card({ borderLeft: `6px solid ${cat.color || C.primary}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={badge(cat.color || C.primary)}>
                  {cat.sucursal_nombre || 'General'}
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: 18, fontWeight: 800, color: C.text }}>
                  {cat.nombre}
                </h3>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setModal({ ...cat })} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(cat.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }}>
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

        {listCategorias.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, color: C.muted }}>
            <Tag size={40} color={C.faint} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No tenés categorías creadas en tu academia.</p>
            <p style={{ margin: '6px 0 16px', fontSize: 13, color: C.faint }}>
              Creá tus categorías (ej: Cat. 2020/2021, Sub-15, Principiantes) para organizar los horarios de práctica y cobros.
            </p>
            {isAdmin && (
              <button onClick={abrirNuevo} style={btn(C.primary)}>
                <Plus size={16} /> Crear primera categoría
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR CATEGORIA */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, width: 440, padding: 26 }}>
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
  const [subTab, setSubTab] = useState<'alumnos' | 'deudores' | 'carnets'>('alumnos');
  const [reporteAlumnos, setReporteAlumnos] = useState<any[]>([]);
  const [deudores, setDeudores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [modalCarnet, setModalCarnet] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

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

  const imprimir = () => {
    window.print();
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
            Reporte de alumnos, control de cartera morosa y emisión de carnets impresos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={imprimir} style={btn(C.surface, true)}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Subtabs Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
        <button
          onClick={() => setSubTab('alumnos')}
          style={{ ...btn(subTab === 'alumnos' ? C.primary : 'transparent', subTab !== 'alumnos'), borderRadius: 20 }}
        >
          📋 Listado de Alumnos ({alumnosFiltrados.length})
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
                  <td style={{ padding: '10px', fontWeight: 700, color: C.text }}>{a.nombre_completo}</td>
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
                <div style={{ width: 90, height: 90, borderRadius: 14, background: '#000', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0 }}>
                  {modalCarnet.foto_perfil ? <img src={modalCarnet.foto_perfil} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <GraduationCap size={44} color="#fff" />}
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
    </div>
  );
}
