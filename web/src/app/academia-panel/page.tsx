/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Building2, Users, CreditCard, ClipboardList,
  Settings, LogOut, Plus, Pencil, Trash2, Check, X, Upload,
  ChevronRight, AlertCircle, Save, Eye, RefreshCw, UserPlus,
  Calendar, TrendingUp, DollarSign, BookOpen, BarChart3, Link as LinkIcon
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
type Tab = 'dashboard' | 'perfil' | 'sucursales' | 'alumnos' | 'inscripciones' | 'cuotas' | 'staff' | 'config';

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
    if (!token) return;
    fetchAll();
    fetch(`${API_URL}/api/deportes`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeportes(data.map((d: any) => d.nombre));
        }
      })
      .catch(() => {});
  }, [token]);

  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const apiFetch = async (url: string, opts: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${url}`, { headers: headers(), ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Error en la operación');
    return data;
  };

  const fetchAll = async () => {
    try {
      const [p, s, a, i, q, st, c, cfg] = await Promise.allSettled([
        apiFetch('/academia/perfil'),
        apiFetch('/academia/sucursales'),
        apiFetch('/academia/alumnos'),
        apiFetch('/academia/inscripciones'),
        apiFetch('/academia/cuotas'),
        apiFetch('/academia/miembros'),
        apiFetch('/academia/categorias'),
        apiFetch('/academia/config-cuotas'),
      ]);
      if (p.status === 'fulfilled') setPerfil(p.value);
      if (s.status === 'fulfilled') setSucursales(s.value);
      if (a.status === 'fulfilled') setAlumnos(a.value);
      if (i.status === 'fulfilled') setInscripciones(i.value);
      if (q.status === 'fulfilled') setCuotas(q.value);
      if (st.status === 'fulfilled') setStaff(st.value);
      if (c.status === 'fulfilled') setCategorias(c.value);
      if (cfg.status === 'fulfilled') setConfigCuotas(cfg.value);
    } catch (e) {}
  };

  // ─── Guard ──────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (!session) return <NoAccess />;
  const rolInterno = session.rol_academia || 'dueño';
  const isDueno = rolInterno === 'dueño';
  const isAdmin = isDueno || rolInterno === 'administrador';
  const isTesorero = isDueno || rolInterno === 'tesorero';
  const isProfesor = rolInterno === 'profesor';

  // ─── Stats para dashboard ────────────────────────────────────
  const stats: Stat[] = [
    { label: 'Alumnos activos', value: alumnos.filter(a => a.estado === 'activo').length, icon: Users, color: C.green },
    { label: 'Sucursales', value: sucursales.filter(s => s.activa).length, icon: Building2, color: C.primary },
    { label: 'Inscripciones activas', value: inscripciones.filter(i => i.estado === 'activa').length, icon: BookOpen, color: C.purple },
    { label: 'Cuotas pendientes', value: cuotas.filter(q => q.estado === 'pendiente').length, icon: CreditCard, color: C.yellow },
  ];

  const cuotasPendientesGs = cuotas.filter(q => q.estado === 'pendiente').reduce((s, q) => s + q.monto_final, 0);

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
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            padding: '12px 20px', borderRadius: 10,
            background: notif.type === 'ok' ? '#064e3b' : '#450a0a',
            border: `1px solid ${notif.type === 'ok' ? C.green : C.red}`,
            color: notif.type === 'ok' ? C.green : C.red,
            fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          }}>
            {notif.type === 'ok' ? '✓' : '✗'} {notif.msg}
          </div>
        )}

        <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
          {/* ──────────────── DASHBOARD ──────────────── */}
          {activeTab === 'dashboard' && (
            <Dashboard stats={stats} cuotasPendientesGs={cuotasPendientesGs} cuotas={cuotas} alumnos={alumnos} sucursales={sucursales} perfil={perfil} />
          )}

          {/* ──────────────── PERFIL ──────────────── */}
          {activeTab === 'perfil' && (
            <PerfilTab
              perfil={perfil} setPerfil={setPerfil} token={token}
              fileLogoRef={fileLogoRef} fileBannerRef={fileBannerRef}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno}
            />
          )}

          {/* ──────────────── SUCURSALES ──────────────── */}
          {activeTab === 'sucursales' && (
            <SucursalesTab
              sucursales={sucursales} setSucursales={setSucursales}
              deportes={deportes} modal={modalSucursal} setModal={setModalSucursal}
              notify={notify} apiFetch={apiFetch} isAdmin={isAdmin} isDueno={isDueno}
              categorias={categorias} fetchAll={fetchAll}
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

          {/* ──────────────── STAFF ──────────────── */}
          {activeTab === 'staff' && (
            <StaffTab
              staff={staff} sucursales={sucursales}
              modal={modalStaff} setModal={setModalStaff}
              notify={notify} apiFetch={apiFetch} isDueno={isDueno} fetchAll={fetchAll}
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
    { id: 'dashboard',     label: 'Dashboard',      icon: BarChart3 },
    { id: 'perfil',        label: 'Mi Academia',     icon: GraduationCap, roles: ['dueño','administrador'] },
    { id: 'sucursales',    label: 'Sucursales',      icon: Building2 },
    { id: 'alumnos',       label: 'Alumnos',         icon: Users },
    { id: 'inscripciones', label: 'Inscripciones',   icon: BookOpen },
    { id: 'cuotas',        label: 'Cuotas / Pagos',  icon: CreditCard, roles: ['dueño','administrador','tesorero'] },
    { id: 'staff',         label: 'Mi Equipo',       icon: UserPlus, roles: ['dueño'] },
    { id: 'config',        label: 'Configuración',   icon: Settings, roles: ['dueño','tesorero'] },
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
        <button onClick={() => { localStorage.removeItem('user_session'); window.location.href = '/login'; }} style={{
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
function Dashboard({ stats, cuotasPendientesGs, cuotas, alumnos, sucursales, perfil }: any) {
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

// ═══════════════════════════════════════════════════════════
// PERFIL (Mi Academia)
// ═══════════════════════════════════════════════════════════
function PerfilTab({ perfil, setPerfil, token, fileLogoRef, fileBannerRef, notify, apiFetch, isDueno }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (perfil) setForm({ ...perfil }); }, [perfil]);

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
          </div>

          <div style={card()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.primary }}>Ubicación</h3>
            {field('pais', 'País', 'Paraguay')}
            {field('departamento', 'Departamento', 'Central')}
            {field('ciudad', 'Ciudad', 'Asunción')}
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
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUCURSALES
// ═══════════════════════════════════════════════════════════
function SucursalesTab({ sucursales, setSucursales, deportes, modal, setModal, notify, apiFetch, isAdmin, isDueno, categorias, fetchAll }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ nombre: '', deporte: deportes[0] || '', ciudad: '', departamento: '', direccion: '', telefono: '', email: '' }); setModal('new'); };
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
          const dcolor = sportColors[s.deporte] || C.primary;
          const cats = categorias.filter((c: any) => c.sucursal_id === s.id);
          return (
            <div key={s.id} style={{ ...card(), border: `1px solid ${dcolor}33`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={badge(dcolor)}>{s.deporte}</span>
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
            <select value={form.deporte || ''} onChange={e => setForm((f: any) => ({ ...f, deporte: e.target.value }))}
              style={{ ...input() }}>
              {deportes.map((d: string) => <option key={d} value={d}>{d}</option>)}
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
  const [generando, setGenerando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const filtered = cuotas.filter((q: any) =>
    (!filtroEstado || q.estado === filtroEstado) &&
    (!filtroPeriodo || q.periodo === filtroPeriodo)
  );

  const generar = async () => {
    setGenerando(true);
    try {
      const data = await apiFetch(`/academia/cuotas/generar?periodo=${periodoActual}`, { method: 'POST' });
      notify(`${data.generadas} cuotas generadas para ${periodoActual}`);
      await fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
    setGenerando(false);
  };

  const pagar = async (id: string) => {
    try {
      await apiFetch(`/academia/cuotas/${id}/pagar`, {
        method: 'PUT',
        body: JSON.stringify({ metodo_pago: metodoPago }),
      });
      notify('Pago registrado');
      setPagandoId(null);
      await fetchAll();
    } catch (e: any) { notify(e.message, 'err'); }
  };

  const estadoColor: Record<string, string> = {
    pendiente: C.yellow, pagada: C.green, vencida: C.red, becada: C.purple, anulada: C.faint,
  };

  const totalFiltrado = filtered.reduce((s: number, q: any) => s + q.monto_final, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Cuotas y Pagos</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Gestión financiera de la academia</p>
        </div>
        {(isDueno || isTesorero) && (
          <button onClick={generar} disabled={generando} style={btn(C.green)}>
            <RefreshCw size={14} /> {generando ? 'Generando...' : `Generar cuotas ${periodoActual}`}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...input({ width: 'auto', minWidth: 160 }) }}>
          <option value="">Todos los estados</option>
          {['pendiente', 'pagada', 'vencida', 'becada', 'anulada'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} style={{ ...input({ width: 180 }) }} />
        <div style={{ marginLeft: 'auto', color: C.muted, fontSize: 13, display: 'flex', alignItems: 'center' }}>
          Total filtrado: <strong style={{ color: C.text, marginLeft: 4 }}>Gs. {totalFiltrado.toLocaleString('es-PY')}</strong>
        </div>
      </div>

      <div style={card({ padding: 0 })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Alumno', 'Período', 'Monto original', 'Descuento', 'Total', 'Estado', 'Vence', 'Acción'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: C.faint }}>
                No hay cuotas. Generá las del mes con el botón de arriba.
              </td></tr>
            )}
            {filtered.map((q: any) => (
              <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}44` }}>
                <td style={{ padding: '10px 16px', fontWeight: 600 }}>{q.alumno}</td>
                <td style={{ padding: '10px 16px', color: C.muted }}>{q.periodo}</td>
                <td style={{ padding: '10px 16px', color: C.faint }}>Gs. {q.monto_original.toLocaleString('es-PY')}</td>
                <td style={{ padding: '10px 16px', color: q.descuento > 0 ? C.green : C.faint }}>
                  {q.descuento > 0 ? `- Gs. ${q.descuento.toLocaleString('es-PY')}` : '—'}
                </td>
                <td style={{ padding: '10px 16px', fontWeight: 700 }}>Gs. {q.monto_final.toLocaleString('es-PY')}</td>
                <td style={{ padding: '10px 16px' }}><span style={badge(estadoColor[q.estado] || C.faint)}>{q.estado}</span></td>
                <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>{q.fecha_vencimiento}</td>
                <td style={{ padding: '10px 16px' }}>
                  {(isTesorero || isDueno) && q.estado === 'pendiente' && (
                    pagandoId === q.id
                      ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ ...input({ padding: '5px 8px', fontSize: 12, width: 110 }) }}>
                            {['Efectivo', 'Transferencia', 'Tarjeta', 'QR'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <button onClick={() => pagar(q.id)} style={{ ...btn(C.green), fontSize: 11, padding: '5px 10px' }}><Check size={11} /></button>
                          <button onClick={() => setPagandoId(null)} style={{ ...btn(C.red, true), fontSize: 11, padding: '5px 10px' }}><X size={11} /></button>
                        </div>
                      )
                      : (
                        <button onClick={() => setPagandoId(q.id)} style={{ ...btn(C.green, true), fontSize: 11, padding: '5px 10px' }}>
                          <DollarSign size={11} /> Pagar
                        </button>
                      )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
