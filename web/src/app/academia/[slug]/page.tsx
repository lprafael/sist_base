"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  GraduationCap, MapPin, Phone, Mail, Camera, Video,
  Share2, MessageCircle, Globe, Users, Building2, Star,
  ChevronRight, ExternalLink, Dumbbell
} from 'lucide-react';

const API_URL = "https://api.micancha.com.py";

interface Sucursal {
  id: string;
  nombre: string;
  deporte: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  telefono: string;
  email: string;
}

interface Academia {
  id: string;
  nombre: string;
  descripcion: string;
  logo_url: string;
  banner_url: string;
  color_primario: string;
  acerca_de: string;
  facebook: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  pais: string;
  sucursales: Sucursal[];
}

// Colores por deporte
const deporteColors: Record<string, string> = {
  'Fútbol': '#10B981', 'Fútbol 5': '#10B981', 'Fútbol 7': '#10B981',
  'Básquet': '#F59E0B', 'Basketball': '#F59E0B',
  'Tenis': '#EF4444', 'Pádel': '#8B5CF6',
  'Natación': '#06B6D4', 'Natacion': '#06B6D4',
  'Vóley': '#F97316', 'Voley': '#F97316',
  'Atletismo': '#EC4899', 'Artes Marciales': '#6366F1',
};

const deporteIcon = (deporte: string) => {
  const icons: Record<string, string> = {
    'Fútbol': '⚽', 'Fútbol 5': '⚽', 'Fútbol 7': '⚽',
    'Básquet': '🏀', 'Basketball': '🏀',
    'Tenis': '🎾', 'Pádel': '🏓',
    'Natación': '🏊', 'Natacion': '🏊',
    'Vóley': '🏐', 'Voley': '🏐',
    'Atletismo': '🏃', 'Artes Marciales': '🥋',
  };
  return icons[deporte] || '🏅';
};

export default function AcademiaPublicaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [academia, setAcademia] = useState<Academia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/academias/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Academia no encontrada');
        return r.json();
      })
      .then(setAcademia)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <p>Cargando academia...</p>
      </div>
    </div>
  );

  if (error || !academia) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <p>{error || 'Academia no encontrada'}</p>
        <a href="/" style={{ color: '#3b82f6', marginTop: 12, display: 'inline-block' }}>← Volver al inicio</a>
      </div>
    </div>
  );

  const primary = academia.color_primario || '#1e3a8a';
  const deportesUnicos = [...new Set(academia.sucursales.map(s => s.deporte))];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: '#f1f5f9' }}>
      {/* ── BANNER ── */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        {academia.banner_url ? (
          <img src={academia.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${primary}cc 0%, #0f172a 100%)`,
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0f172a 100%)' }} />
      </div>

      {/* ── HEADER CARD ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          marginTop: -64,
          display: 'flex', alignItems: 'flex-end', gap: 24,
          flexWrap: 'wrap',
          position: 'relative', zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            width: 120, height: 120, borderRadius: 20,
            border: `4px solid ${primary}`,
            background: academia.logo_url ? 'transparent' : `${primary}22`,
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 32px ${primary}44`,
          }}>
            {academia.logo_url
              ? <img src={academia.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <GraduationCap size={48} color={primary} />
            }
          </div>

          {/* Nombre y ubicación */}
          <div style={{ flex: 1, minWidth: 200, paddingBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>
              {academia.nombre}
            </h1>
            {(academia.ciudad || academia.departamento) && (
              <p style={{ margin: '6px 0 0', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} />
                {[academia.ciudad, academia.departamento].filter(Boolean).join(', ')}
              </p>
            )}
            {/* Deportes como pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {deportesUnicos.map(d => (
                <span key={d} style={{
                  padding: '3px 10px', borderRadius: 999,
                  background: `${deporteColors[d] || primary}22`,
                  border: `1px solid ${deporteColors[d] || primary}55`,
                  color: deporteColors[d] || primary,
                  fontSize: 12, fontWeight: 700,
                }}>
                  {deporteIcon(d)} {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── REDES SOCIALES ── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          {academia.instagram && (
            <a href={`https://instagram.com/${academia.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
              style={socialBtn('#E1306C')}>
              <Camera size={16} /> Instagram
            </a>
          )}
          {academia.facebook && (
            <a href={academia.facebook} target="_blank" rel="noopener noreferrer" style={socialBtn('#1877F2')}>
              <Share2 size={16} /> Facebook
            </a>
          )}
          {academia.youtube && (
            <a href={academia.youtube} target="_blank" rel="noopener noreferrer" style={socialBtn('#FF0000')}>
              <Video size={16} /> YouTube
            </a>
          )}
          {academia.whatsapp && (
            <a href={`https://wa.me/${academia.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
              style={socialBtn('#25D366')}>
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          {academia.telefono && (
            <a href={`tel:${academia.telefono}`} style={socialBtn('#6366f1')}>
              <Phone size={16} /> {academia.telefono}
            </a>
          )}
          {academia.email && (
            <a href={`mailto:${academia.email}`} style={socialBtn('#0ea5e9')}>
              <Mail size={16} /> {academia.email}
            </a>
          )}
        </div>

        {/* ── ACERCA DE ── */}
        {academia.acerca_de && (
          <section style={sectionCard}>
            <h2 style={sectionTitle(primary)}><Star size={18} /> Acerca de la Academia</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
              {academia.acerca_de}
            </p>
          </section>
        )}

        {/* ── ESTADÍSTICAS RÁPIDAS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { icon: <Building2 size={22} />, value: academia.sucursales.length, label: 'Sucursales' },
            { icon: <Dumbbell size={22} />, value: deportesUnicos.length, label: 'Deportes' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: '#1e293b', borderRadius: 14, padding: '18px 20px',
              border: '1px solid #334155', textAlign: 'center',
            }}>
              <div style={{ color: primary, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── SUCURSALES ── */}
        {academia.sucursales.length > 0 && (
          <section style={sectionCard}>
            <h2 style={sectionTitle(primary)}><Building2 size={18} /> Nuestras Sedes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {academia.sucursales.map(suc => {
                const dColor = deporteColors[suc.deporte] || primary;
                return (
                  <div key={suc.id} style={{
                    background: '#0f172a', borderRadius: 14,
                    border: `1px solid ${dColor}33`,
                    padding: 20, transition: 'transform .2s, box-shadow .2s',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${dColor}22`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Deporte badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 999,
                      background: `${dColor}18`, color: dColor,
                      fontSize: 12, fontWeight: 700, marginBottom: 10,
                    }}>
                      {deporteIcon(suc.deporte)} {suc.deporte}
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                      {suc.nombre}
                    </h3>

                    {(suc.ciudad || suc.departamento) && (
                      <p style={{ margin: '4px 0', color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={13} /> {[suc.ciudad, suc.departamento].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {suc.direccion && (
                      <p style={{ margin: '4px 0', color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ChevronRight size={12} /> {suc.direccion}
                      </p>
                    )}
                    {suc.telefono && (
                      <a href={`tel:${suc.telefono}`} style={{ margin: '8px 0 0', color: dColor, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                        <Phone size={13} /> {suc.telefono}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', padding: '40px 0 60px', color: '#475569', fontSize: 13 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Globe size={14} /> Powered by MiCancha.com.py
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Helpers de estilo ──
const socialBtn = (color: string) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 9999,
  background: `${color}18`, border: `1px solid ${color}44`,
  color, fontSize: 13, fontWeight: 600, textDecoration: 'none',
  transition: 'background .2s',
} as React.CSSProperties);

const sectionCard: React.CSSProperties = {
  background: '#1e293b', borderRadius: 16, padding: 24,
  border: '1px solid #334155', marginTop: 20,
};

const sectionTitle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 18, fontWeight: 700, color,
  margin: '0 0 16px',
});
