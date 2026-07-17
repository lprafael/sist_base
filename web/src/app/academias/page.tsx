"use client";
import React, { useEffect, useState } from 'react';
import { GraduationCap, MapPin, Building2, Search, Dumbbell, ChevronRight } from 'lucide-react';

const API_URL = "https://api.micancha.com.py";

interface AcademiaCard {
  id: string;
  nombre: string;
  enlace_sitio: string;
  logo_url: string;
  ciudad: string;
  departamento: string;
  color_primario: string;
  acerca_de: string;
  total_sucursales: number;
  deportes: string[];
}

const deporteColors: Record<string, string> = {
  'Fútbol': '#10B981', 'Fútbol 5': '#10B981', 'Fútbol 7': '#10B981',
  'Básquet': '#F59E0B', 'Basketball': '#F59E0B',
  'Tenis': '#EF4444', 'Pádel': '#8B5CF6',
  'Natación': '#06B6D4', 'Natacion': '#06B6D4',
  'Vóley': '#F97316', 'Voley': '#F97316',
  'Atletismo': '#EC4899', 'Artes Marciales': '#6366F1',
};

export default function AcademiasPage() {
  const [academias, setAcademias] = useState<AcademiaCard[]>([]);
  const [filtered, setFiltered] = useState<AcademiaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deporteFiltro, setDeporteFiltro] = useState('');
  const [deportes, setDeportes] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/academias`).then(r => r.json()),
      fetch(`${API_URL}/api/deportes`).then(r => r.json()),
    ]).then(([acads, deps]) => {
      setAcademias(acads);
      setFiltered(acads);
      if (Array.isArray(deps)) {
        setDeportes(deps.map((d: any) => d.nombre));
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let res = academias;
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        a.ciudad?.toLowerCase().includes(q) ||
        a.departamento?.toLowerCase().includes(q)
      );
    }
    if (deporteFiltro) {
      res = res.filter(a => a.deportes?.includes(deporteFiltro));
    }
    setFiltered(res);
  }, [search, deporteFiltro, academias]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: '#f1f5f9' }}>
      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 60%)',
        padding: '80px 20px 60px', textAlign: 'center',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎓</div>
        <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, letterSpacing: '-1px' }}>
          Academias Deportivas
        </h1>
        <p style={{ color: '#94a3b8', marginTop: 10, fontSize: 18 }}>
          Encontrá la academia perfecta para vos o tu hijo
        </p>

        {/* Buscador */}
        <div style={{ maxWidth: 560, margin: '30px auto 0', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ciudad..."
            style={{
              width: '100%', padding: '14px 16px 14px 48px',
              borderRadius: 12, border: '1px solid #334155',
              background: '#1e293b', color: '#f1f5f9', fontSize: 15,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 20px 60px' }}>
        {/* ── FILTRO DEPORTE ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {['', ...deportes].map(d => (
            <button
              key={d || 'todos'}
              onClick={() => setDeporteFiltro(d)}
              style={{
                padding: '7px 16px', borderRadius: 999,
                background: deporteFiltro === d ? '#3b82f6' : '#1e293b',
                border: `1px solid ${deporteFiltro === d ? '#3b82f6' : '#334155'}`,
                color: deporteFiltro === d ? '#fff' : '#94a3b8',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {d || 'Todos los deportes'}
            </button>
          ))}
        </div>

        {/* ── CONTADOR ── */}
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
          {loading ? 'Cargando...' : `${filtered.length} academia${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── GRID ── */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>
            <GraduationCap size={48} style={{ opacity: .3 }} />
            <p>Cargando academias...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>
            <p>No se encontraron academias con esos criterios.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {filtered.map(ac => {
              const color = ac.color_primario || '#1e3a8a';
              return (
                <a
                  key={ac.id}
                  href={ac.enlace_sitio ? `/academia/${ac.enlace_sitio}` : '#'}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: '#1e293b', borderRadius: 18,
                    border: `1px solid ${color}33`,
                    overflow: 'hidden', transition: 'transform .2s, box-shadow .2s',
                    height: '100%', display: 'flex', flexDirection: 'column',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${color}30`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Banda de color superior */}
                    <div style={{ height: 6, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

                    <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Logo + nombre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: 12,
                          background: ac.logo_url ? 'transparent' : `${color}22`,
                          border: `2px solid ${color}44`,
                          overflow: 'hidden', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {ac.logo_url
                            ? <img src={ac.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <GraduationCap size={24} color={color} />
                          }
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
                            {ac.nombre}
                          </h3>
                          {(ac.ciudad || ac.departamento) && (
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} /> {[ac.ciudad, ac.departamento].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Descripción */}
                      {ac.acerca_de && (
                        <p style={{
                          color: '#94a3b8', fontSize: 13, lineHeight: 1.5,
                          margin: '0 0 14px', flex: 1,
                          display: '-webkit-box', WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {ac.acerca_de}
                        </p>
                      )}

                      {/* Deportes */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {(ac.deportes || []).map(d => (
                          <span key={d} style={{
                            padding: '2px 8px', borderRadius: 999,
                            background: `${deporteColors[d] || color}18`,
                            border: `1px solid ${deporteColors[d] || color}44`,
                            color: deporteColors[d] || color,
                            fontSize: 11, fontWeight: 700,
                          }}>{d}</span>
                        ))}
                      </div>

                      {/* Stats footer */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 14, borderTop: '1px solid #334155',
                      }}>
                        <span style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={13} /> {ac.total_sucursales} sede{ac.total_sucursales !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          Ver academia <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
