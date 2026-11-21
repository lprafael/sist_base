/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, FileText, ExternalLink, X } from 'lucide-react';

const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://api.micancha.com.py';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
};

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function GuiasSection() {
  const [guias, setGuias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [videoModal, setVideoModal] = useState<{ titulo: string; youtubeId: string; url: string } | null>(null);

  useEffect(() => {
    const fetchGuias = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/guias`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setGuias(data);
        }
      } catch (e) {
        console.error('Error cargando guías:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchGuias();
  }, []);

  if (!loading && guias.length === 0) return null;

  const categorias = ['Todas', ...Array.from(new Set(guias.map(g => g.categoria || 'General')))];
  const filtradas = categoriaActiva === 'Todas'
    ? guias
    : guias.filter(g => (g.categoria || 'General') === categoriaActiva);

  const tipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'video': return { label: 'Video Tutorial', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'pdf': return { label: 'Documento PDF', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'enlace': return { label: 'Recurso Externo', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      default: return { label: 'Guía Interactiva', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    }
  };

  return (
    <section
      id="guias"
      style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
            padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
          }}>
            <BookOpen size={14} /> Centro de Aprendizaje
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>
            Guías &amp; Documentaciones
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 640, margin: '0 auto' }}>
            Manuales paso a paso, instructivos oficiales y videotutoriales para sacar el máximo provecho a Mi Cancha.
          </p>
        </div>

        {categorias.length > 2 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: categoriaActiva === cat ? '1px solid #16a34a' : '1px solid #cbd5e1',
                  background: categoriaActiva === cat ? '#16a34a' : '#ffffff',
                  color: categoriaActiva === cat ? '#ffffff' : '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Cargando guías...</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {filtradas.map((g) => {
              const ytId = getYoutubeId(g.url);
              const badge = tipoBadge(g.tipo);
              return (
                <div
                  key={g.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Visual header: YouTube thumbnail or styled banner */}
                  {ytId ? (
                    <div
                      onClick={() => setVideoModal({ titulo: g.titulo, youtubeId: ytId, url: g.url })}
                      style={{
                        position: 'relative',
                        paddingTop: '56.25%',
                        background: '#0f172a',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt={g.titulo}
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'cover', opacity: 0.9,
                        }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(15, 23, 42, 0.28)',
                      }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: '50%',
                          background: 'rgba(220, 38, 38, 0.92)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 10px 25px rgba(220, 38, 38, 0.45)',
                          color: '#fff',
                        }}>
                          <PlayCircle size={36} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: 150,
                      background: g.tipo === 'pdf'
                        ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                        : 'linear-gradient(135deg, #0f172a 0%, #166534 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      color: '#ffffff',
                    }}>
                      {g.tipo === 'pdf' ? <FileText size={48} opacity={0.9} /> : <BookOpen size={48} opacity={0.9} />}
                      <span style={{
                        position: 'absolute', bottom: 12, right: 14,
                        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                        background: 'rgba(255,255,255,0.16)', padding: '4px 10px',
                        borderRadius: 999, letterSpacing: 0.6,
                      }}>
                        {g.categoria || 'General'}
                      </span>
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ padding: 22, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                        {g.categoria || 'General'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>
                      {g.titulo}
                    </h3>

                    {g.descripcion && (
                      <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: '0 0 18px', flex: 1 }}>
                        {g.descripcion}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      {ytId ? (
                        <>
                          <button
                            onClick={() => setVideoModal({ titulo: g.titulo, youtubeId: ytId, url: g.url })}
                            style={{
                              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              padding: '10px 16px', borderRadius: 12, border: 'none',
                              background: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            <PlayCircle size={16} /> Ver Video
                          </button>
                          <a
                            href={g.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir en YouTube"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0',
                              background: '#f8fafc', color: '#475569', textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={16} />
                          </a>
                        </>
                      ) : (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '10px 16px', borderRadius: 12,
                            background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: 13,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={15} /> Abrir Documentación
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Reproductor YouTube */}
      {videoModal && (
        <div
          onClick={() => setVideoModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 900, background: '#0f172a',
              borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{videoModal.titulo}</span>
              <button
                onClick={() => setVideoModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                  borderRadius: 10, padding: 6, cursor: 'pointer', display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1`}
                title={videoModal.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
