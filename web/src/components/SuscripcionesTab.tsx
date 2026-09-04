/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useCallback } from 'react';
import { RefreshCw, Search, Crown, Zap, Shield, AlertTriangle, Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; badge: string }> = {
  basico:       { label: 'Básico',       color: '#475569', bg: '#f1f5f9', icon: Shield,  badge: '#94a3b8' },
  profesional:  { label: 'Profesional',  color: '#1d4ed8', bg: '#eff6ff', icon: Zap,    badge: '#3b82f6' },
  premium:      { label: 'Premium',      color: '#92400e', bg: '#fffbeb', icon: Crown,   badge: '#f59e0b' },
};

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.basico;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 100,
      fontSize: 12, fontWeight: 700, border: `1px solid ${cfg.badge}33`
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

interface SuscripcionesTabProps {
  susStats: any;
  setSusStats: (v: any) => void;
  susUsuarios: any[];
  setSusUsuarios: (v: any[]) => void;
  susTotal: number;
  setSusTotal: (v: number) => void;
  susSearch: string;
  setSusSearch: (v: string) => void;
  susPlanFilter: string;
  setSusPlanFilter: (v: string) => void;
  susRolFilter: string;
  setSusRolFilter: (v: string) => void;
  susPage: number;
  setSusPage: (v: number) => void;
  susPerPage: number;
  setSusPerPage: (v: number) => void;
  susLoading: boolean;
  setSusLoading: (v: boolean) => void;
  susChangingPlan: number | null;
  setSusChangingPlan: (v: number | null) => void;
}

export default function SuscripcionesTab({
  susStats, setSusStats,
  susUsuarios, setSusUsuarios,
  susTotal, setSusTotal,
  susSearch, setSusSearch,
  susPlanFilter, setSusPlanFilter,
  susRolFilter, setSusRolFilter,
  susPage, setSusPage,
  susPerPage, setSusPerPage,
  susLoading, setSusLoading,
  susChangingPlan, setSusChangingPlan
}: SuscripcionesTabProps) {

  const getToken = () => {
    try {
      const s = localStorage.getItem('user_session');
      if (s) {
        const parsed = JSON.parse(s);
        return parsed.access_token || parsed.token || '';
      }
    } catch { }
    return '';
  };

  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/suscripciones/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSusStats(await res.json());
    } catch { }
  }, [setSusStats]);

  const fetchUsuarios = useCallback(async () => {
    setSusLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        skip: String((susPage - 1) * susPerPage),
        limit: String(susPerPage),
      });
      if (susSearch)      params.append('search', susSearch);
      if (susPlanFilter)  params.append('plan', susPlanFilter);
      if (susRolFilter)   params.append('rol', susRolFilter);

      const res = await fetch(`${API_URL}/api/admin/usuarios?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSusUsuarios(data.items || []);
        setSusTotal(data.total || 0);
      }
    } catch { }
    setSusLoading(false);
  }, [susPage, susPerPage, susSearch, susPlanFilter, susRolFilter, setSusLoading, setSusUsuarios, setSusTotal]);

  useEffect(() => {
    fetchStats();
    fetchUsuarios();
  }, [fetchStats, fetchUsuarios]);

  const handleChangePlan = async (userId: number, newPlan: string) => {
    setSusChangingPlan(userId);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/usuarios/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: newPlan })
      });
      if (res.ok) {
        setSusUsuarios(susUsuarios.map((u: any) => u.id === userId ? { ...u, plan: newPlan } : u));
        fetchStats();
      } else {
        const err = await res.json();
        alert(err.detail || 'Error al cambiar plan');
      }
    } catch {
      alert('Error de conexión');
    }
    setSusChangingPlan(null);
  };

  const totalPages = Math.max(1, Math.ceil(susTotal / susPerPage));

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isVencimientoProximo = (iso: string | null) => {
    if (!iso) return false;
    const diff = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 15;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        {/* Total activos */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, fontWeight: 700 }}>
            <UserCheck size={15} /> Usuarios Activos
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>{susStats?.total_activos ?? '…'}</div>
        </div>

        {/* Inactivos */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, fontWeight: 700 }}>
            <UserX size={15} /> Suspendidos
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444' }}>{susStats?.total_inactivos ?? '…'}</div>
        </div>

        {/* Nuevos semana */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, fontWeight: 700 }}>
            <TrendingUp size={15} /> Nuevos (7 días)
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#16a34a' }}>{susStats?.nuevos_ultima_semana ?? '…'}</div>
        </div>

        {/* Básico */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13, fontWeight: 700 }}>
            <Shield size={15} /> Básico
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#475569' }}>{susStats?.por_plan?.basico ?? '…'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>$0 / mes</div>
        </div>

        {/* Profesional */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1d4ed8', fontSize: 13, fontWeight: 700 }}>
            <Zap size={15} /> Profesional
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#1d4ed8' }}>{susStats?.por_plan?.profesional ?? '…'}</div>
          <div style={{ fontSize: 11, color: '#60a5fa' }}>$29 / mes</div>
        </div>

        {/* Premium */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontSize: 13, fontWeight: 700 }}>
            <Crown size={15} /> Premium
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#92400e' }}>{susStats?.por_plan?.premium ?? '…'}</div>
          <div style={{ fontSize: 11, color: '#f59e0b' }}>$99 / mes</div>
        </div>
      </div>

      {/* ── Alertas de vencimiento ── */}
      {susStats?.proximos_a_vencer?.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#92400e', marginBottom: 10 }}>
            <AlertTriangle size={16} /> {susStats.proximos_a_vencer.length} plan(es) próximos a vencer (30 días)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {susStats.proximos_a_vencer.map((u: any) => (
              <div key={u.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: '6px 12px', fontSize: 12 }}>
                <strong>{u.nombre_completo}</strong>
                {' · '}<PlanBadge plan={u.plan} />
                {' · '}
                <span style={{ color: '#dc2626', fontWeight: 700 }}>vence {fmtDate(u.plan_vence_en)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabla de usuarios ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '24px 28px' }}>
        {/* Header + filtros */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} />
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Usuarios Registrados</h3>
            <span style={{ background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
              {susTotal}
            </span>
          </div>
          <button
            onClick={() => { fetchStats(); fetchUsuarios(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#f8fafc', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ margin: '0 10px', color: '#94a3b8', flexShrink: 0 }} />
            <input
              placeholder="Buscar por nombre, email o usuario..."
              value={susSearch}
              onChange={e => { setSusSearch(e.target.value); setSusPage(1); }}
              style={{ border: 'none', background: 'transparent', padding: '9px 0', outline: 'none', fontSize: 13, width: '100%' }}
            />
          </div>
          <select
            value={susPlanFilter}
            onChange={e => { setSusPlanFilter(e.target.value); setSusPage(1); }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#0f172a', cursor: 'pointer' }}
          >
            <option value="">Todos los planes</option>
            <option value="basico">Básico</option>
            <option value="profesional">Profesional</option>
            <option value="premium">Premium</option>
          </select>
          <select
            value={susRolFilter}
            onChange={e => { setSusRolFilter(e.target.value); setSusPage(1); }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#0f172a', cursor: 'pointer' }}
          >
            <option value="">Todos los roles</option>
            <option value="organizador">Organizador</option>
            <option value="admin">Admin</option>
            <option value="user">Usuario</option>
            <option value="tenant">Tenant</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['ID', 'Nombre / Email', 'Rol', 'Plan', 'Vence', 'Registro', 'Estado', 'Cambiar Plan'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {susLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando...</td></tr>
              ) : susUsuarios.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No se encontraron usuarios</td></tr>
              ) : susUsuarios.map(u => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>#{u.id}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.nombre_completo}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: u.rol === 'admin' || u.rol === 'superadmin' ? '#fef3c7' : '#f1f5f9',
                      color: u.rol === 'admin' || u.rol === 'superadmin' ? '#92400e' : '#475569',
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                    }}>
                      {u.rol || 'user'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <PlanBadge plan={u.plan} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {u.plan_vence_en ? (
                      <span style={{ color: isVencimientoProximo(u.plan_vence_en) ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: 12 }}>
                        {isVencimientoProximo(u.plan_vence_en) ? '⚠️ ' : ''}{fmtDate(u.plan_vence_en)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin vencimiento</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fmtDate(u.fecha_creacion)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: u.activo ? '#dcfce7' : '#fee2e2',
                      color: u.activo ? '#16a34a' : '#dc2626',
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                    }}>
                      {u.activo ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {susChangingPlan === u.id ? (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Guardando…</span>
                    ) : (
                      <select
                        value={u.plan || 'basico'}
                        onChange={e => handleChangePlan(u.id, e.target.value)}
                        disabled={susChangingPlan !== null}
                        style={{
                          padding: '5px 10px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: 12,
                          background: '#f8fafc', cursor: 'pointer',
                          color: PLAN_CONFIG[u.plan]?.color || '#475569',
                          fontWeight: 700
                        }}
                      >
                        <option value="basico">Básico ($0)</option>
                        <option value="profesional">Profesional ($29)</option>
                        <option value="premium">Premium ($99)</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {susTotal > susPerPage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Mostrando {Math.min((susPage - 1) * susPerPage + 1, susTotal)} – {Math.min(susPage * susPerPage, susTotal)} de {susTotal}
              </span>
              <select
                value={susPerPage}
                onChange={e => { setSusPerPage(Number(e.target.value)); setSusPage(1); }}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setSusPage(Math.max(1, susPage - 1))}
                disabled={susPage === 1}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: susPage === 1 ? '#f1f5f9' : '#fff', cursor: susPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}
              >Ant</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, susPage - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setSusPage(p)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: p === susPage ? '1px solid #1d4ed8' : '1px solid #cbd5e1', background: p === susPage ? '#1d4ed8' : '#fff', color: p === susPage ? '#fff' : '#0f172a', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >{p}</button>
                );
              })}
              <button
                onClick={() => setSusPage(Math.min(totalPages, susPage + 1))}
                disabled={susPage === totalPages}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: susPage === totalPages ? '#f1f5f9' : '#fff', cursor: susPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}
              >Sig</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
