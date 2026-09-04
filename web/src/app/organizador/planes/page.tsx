/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import {
  Shield, Zap, Crown, CheckCircle, ArrowRight,
  CreditCard, AlertCircle, Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
const USD_TO_GS = 7200; // Fallback; real value from API

interface PlanInfo {
  id: string;
  nombre: string;
  precio_usd: number;
  precio_gs: number;
  descripcion: string;
  features: string[];
  tipo_cambio: number;
}

const PLAN_ICONS: Record<string, any> = {
  basico: Shield,
  profesional: Zap,
  premium: Crown,
};

const PLAN_COLORS: Record<string, { gradient: string; accent: string; text: string; glow: string }> = {
  basico: {
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    accent: '#475569',
    text: '#0f172a',
    glow: 'rgba(71,85,105,0.1)',
  },
  profesional: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
    accent: '#60a5fa',
    text: '#fff',
    glow: 'rgba(29,78,216,0.4)',
  },
  premium: {
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    accent: '#fde68a',
    text: '#fff',
    glow: 'rgba(217,119,6,0.35)',
  },
};

function fmtGs(n: number) {
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

function PlanCard({
  plan,
  isCurrent,
  isRecommended,
  onElegir,
  loadingId,
}: {
  plan: PlanInfo;
  isCurrent: boolean;
  isRecommended: boolean;
  onElegir: (planId: string) => void;
  loadingId: string | null;
}) {
  const Icon = PLAN_ICONS[plan.id] || Shield;
  const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.basico;
  const isDark = plan.id !== 'basico';
  const isLoading = loadingId === plan.id;

  return (
    <div
      style={{
        position: 'relative',
        background: colors.gradient,
        borderRadius: 28,
        padding: '36px 28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        boxShadow: isRecommended
          ? `0 20px 60px ${colors.glow}, 0 8px 20px rgba(0,0,0,0.12)`
          : '0 4px 20px rgba(0,0,0,0.06)',
        border: isRecommended
          ? `2px solid ${colors.accent}`
          : '1px solid #e2e8f0',
        transform: isRecommended ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.3s, box-shadow 0.3s',
        zIndex: isRecommended ? 2 : 1,
      }}
      onMouseOver={e => {
        if (!isRecommended) e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseOut={e => {
        if (!isRecommended) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Badge recomendado */}
      {isRecommended && (
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          background: colors.accent, color: isDark ? '#1e3a8a' : '#fff',
          padding: '5px 18px', borderRadius: 100, fontWeight: 900, fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap',
          boxShadow: `0 4px 12px ${colors.glow}`
        }}>
          ★ Recomendado
        </div>
      )}

      {/* Ícono */}
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: isDark ? 'rgba(255,255,255,0.15)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18
      }}>
        <Icon size={26} color={isDark ? '#fff' : colors.accent} />
      </div>

      {/* Nombre y descripción */}
      <div style={{ fontSize: 24, fontWeight: 900, color: colors.text, marginBottom: 6 }}>{plan.nombre}</div>
      <div style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.75)' : '#64748b', marginBottom: 24, minHeight: 40 }}>
        {plan.descripcion}
      </div>

      {/* Precio */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 44, fontWeight: 900, color: colors.text }}>
          ${plan.precio_usd}
        </span>
        <span style={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', fontWeight: 600 }}>/mes</span>
      </div>
      <div style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8', marginBottom: 28 }}>
        ≈ {fmtGs(plan.precio_gs)}/mes
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, flex: 1 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={16} color={isDark ? colors.accent : '#16a34a'} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.9)' : '#374151', fontWeight: 500 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div style={{
          textAlign: 'center', padding: '14px 0', borderRadius: 14,
          background: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
          color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
          fontWeight: 800, fontSize: 15, letterSpacing: 0.5
        }}>
          ✓ Plan Actual
        </div>
      ) : plan.precio_usd === 0 ? (
        <button
          onClick={() => onElegir(plan.id)}
          disabled={!!loadingId}
          style={{
            padding: '14px 0', borderRadius: 14, border: '2px solid #cbd5e1',
            background: 'transparent', color: '#475569', fontWeight: 800,
            fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.5
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Cambiar a Básico
        </button>
      ) : (
        <button
          onClick={() => onElegir(plan.id)}
          disabled={!!loadingId}
          style={{
            padding: '14px 0', borderRadius: 14, border: 'none',
            background: isDark ? '#fff' : colors.accent,
            color: isDark ? (plan.id === 'premium' ? '#92400e' : '#1e3a8a') : '#fff',
            fontWeight: 800, fontSize: 15, cursor: loadingId ? 'not-allowed' : 'pointer',
            opacity: loadingId && loadingId !== plan.id ? 0.6 : 1,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: isRecommended ? `0 6px 20px ${colors.glow}` : 'none'
          }}
          onMouseOver={e => { if (!loadingId) e.currentTarget.style.opacity = '0.9'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = loadingId && loadingId !== plan.id ? '0.6' : '1'; }}
        >
          {isLoading ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Procesando…</>
          ) : (
            <><CreditCard size={16} /> Elegir {plan.nombre} <ArrowRight size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}

function PlanesContent() {
  const searchParams = useSearchParams();
  const pagoStatus = searchParams.get('pago'); // 'exitoso' | 'fallido' | 'pendiente'

  const [planes, setPlanes] = useState<PlanInfo[]>([]);
  const [miPlan, setMiPlan] = useState<any>(null);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const getToken = () => {
    try {
      const s = localStorage.getItem('user_session');
      if (s) {
        const p = JSON.parse(s);
        return p.access_token || p.token || '';
      }
    } catch { }
    return '';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoadingPlanes(true);
      try {
        // Cargar planes
        const resPlanes = await fetch(`${API_URL}/api/suscripciones/planes`);
        if (resPlanes.ok) setPlanes(await resPlanes.json());

        // Cargar plan actual del usuario
        const token = getToken();
        if (token) {
          const resMi = await fetch(`${API_URL}/api/organizador/mi-plan`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resMi.ok) setMiPlan(await resMi.json());
        }
      } catch {
        setError('No se pudieron cargar los planes. Intente nuevamente.');
      }
      setLoadingPlanes(false);
    };
    fetchData();
  }, []);

  const handleElegir = async (planId: string) => {
    if (planId === 'basico') {
      // Para bajar a básico: pedir confirmación y llamar al backend
      if (!confirm('¿Confirmar cambio al plan Básico? Perderá las funcionalidades actuales.')) return;
      setLoadingId(planId);
      try {
        const token = getToken();
        const userId = miPlan?.usuario_id;
        if (!userId) { alert('No se pudo identificar el usuario.'); setLoadingId(null); return; }
        const res = await fetch(`${API_URL}/api/admin/usuarios/${userId}/plan`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: 'basico', notas: 'Downgrade solicitado por el usuario' })
        });
        if (res.ok) {
          setMiPlan((prev: any) => ({ ...prev, plan: 'basico', plan_info: planes.find(p => p.id === 'basico') }));
          alert('Plan actualizado a Básico.');
        }
      } catch { alert('Error al procesar el cambio.'); }
      setLoadingId(null);
      return;
    }

    // Para planes de pago: generar preferencia MercadoPago
    setLoadingId(planId);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/suscripciones/crear-preferencia?plan=${planId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Redirigir al checkout de MercadoPago
        const url = data.sandbox_init_point || data.init_point;
        if (url) window.location.href = url;
        else alert('No se pudo obtener el enlace de pago.');
      } else {
        const err = await res.json();
        setError(err.detail || 'Error al crear preferencia de pago.');
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    }
    setLoadingId(null);
  };

  return (
    <>
      <Nav scrolled={false} />
      <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%)', paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '80px 20px 56px', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', color: '#1d4ed8', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
            <Crown size={14} /> Planes de Organizador
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.1 }}>
            Mejora tu Plan de Organizador
          </h1>
          <p style={{ fontSize: 17, color: '#64748b', margin: 0 }}>
            Desbloquea herramientas profesionales y eleva el nivel de tus campeonatos.
          </p>
        </div>

        {/* Notificación de resultado de pago */}
        {pagoStatus && (
          <div style={{ maxWidth: 700, margin: '0 auto 32px', padding: '0 20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 14,
              background: pagoStatus === 'exitoso' ? '#dcfce7' : pagoStatus === 'fallido' ? '#fee2e2' : '#fffbeb',
              border: `1px solid ${pagoStatus === 'exitoso' ? '#86efac' : pagoStatus === 'fallido' ? '#fca5a5' : '#fde68a'}`,
              color: pagoStatus === 'exitoso' ? '#15803d' : pagoStatus === 'fallido' ? '#dc2626' : '#92400e',
              fontWeight: 700
            }}>
              {pagoStatus === 'exitoso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {pagoStatus === 'exitoso'
                ? '¡Pago exitoso! Tu plan ha sido activado. Puede tomar unos instantes en reflejarse.'
                : pagoStatus === 'fallido'
                  ? 'El pago no pudo procesarse. Intenta nuevamente o contacta soporte.'
                  : 'Pago en proceso. Te notificaremos cuando se confirme.'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ maxWidth: 700, margin: '0 auto 24px', padding: '0 20px' }}>
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 18px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          </div>
        )}

        {/* Cards de planes */}
        {loadingPlanes ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Cargando planes…</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
              alignItems: 'center',
            }}>
              {planes.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={miPlan?.plan === plan.id}
                  isRecommended={plan.id === 'profesional'}
                  onElegir={handleElegir}
                  loadingId={loadingId}
                />
              ))}
            </div>

            {/* Plan actual */}
            {miPlan && (
              <div style={{ textAlign: 'center', marginTop: 48, padding: '24px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Tu plan actual</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
                  {miPlan.plan_info?.nombre || miPlan.plan}
                </div>
                {miPlan.plan_vence_en && (
                  <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginTop: 6 }}>
                    Vence el {new Date(miPlan.plan_vence_en).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  ¿Necesitás ayuda? Escribinos por WhatsApp o chat de soporte.
                </div>
              </div>
            )}

            {/* Nota de tipo de cambio */}
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 24 }}>
              Los precios en Guaraníes son aproximados. Tipo de cambio referencial: 1 USD ≈ {(planes[0]?.tipo_cambio || USD_TO_GS).toLocaleString('es-PY')} Gs.
              Los cobros se procesan en Guaraníes vía MercadoPago Paraguay.
            </p>
          </div>
        )}
      </main>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Footer />
    </>
  );
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando…</div>}>
      <PlanesContent />
    </Suspense>
  );
}
