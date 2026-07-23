"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  GraduationCap, MapPin, Phone, Mail, Camera, Video,
  Share2, MessageCircle, Globe, Building2, Star,
  ChevronRight, Dumbbell, Clock, DollarSign, Calendar, Info, Award
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.micancha.com.py";

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

interface HorarioOficina {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

interface Categoria {
  id: string;
  nombre: string;
  edad_min?: number;
  edad_max?: number;
  descripcion?: string;
  color?: string;
  sucursal_nombre?: string;
}

interface HorarioPractica {
  id: string;
  categoria_id?: string;
  categoria_nombre?: string;
  categoria_color?: string;
  sub_categoria?: string;
  sucursal_id?: string;
  cancha_nombre?: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  mes_inicio_vigencia?: number;
  anio_inicio_vigencia?: number;
  mes_fin_vigencia?: number;
  anio_fin_vigencia?: number;
  periodo_vigencia: string;
}

interface TarifaCosto {
  id: string;
  concepto: str;
  tipo_costo: string; // 'matricula', 'cuota_mensual', 'indumentaria', 'otro'
  categoria_id?: string;
  categoria_nombre?: string;
  monto: number;
  moneda: string;
  descripcion?: string;
  mes_inicio_vigencia?: number;
  anio_inicio_vigencia?: number;
  mes_fin_vigencia?: number;
  anio_fin_vigencia?: number;
  periodo_vigencia: string;
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
  horarios_oficina?: HorarioOficina[];
  sucursales: Sucursal[];
  categorias: Categoria[];
  horarios_practica: HorarioPractica[];
  tarifas_costos: TarifaCosto[];
  periodos_vigencia: string[];
}

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

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AcademiaPublicaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [academia, setAcademia] = useState<Academia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2026');

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/academias/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Academia no encontrada');
        return r.json();
      })
      .then((data: Academia) => {
        setAcademia(data);
        if (data.periodos_vigencia && data.periodos_vigencia.length > 0) {
          setPeriodoSeleccionado(data.periodos_vigencia[data.periodos_vigencia.length - 1]);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <p>Cargando datos de la academia...</p>
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

  // Filtrar horarios de práctica por periodo seleccionado
  const horariosFiltrados = academia.horarios_practica.filter(h => h.periodo_vigencia === periodoSeleccionado);
  // Obtenemos categorías únicas presentes en estos horarios o en academia.categorias
  const categoriasPractica = [...new Set(horariosFiltrados.map(h => h.categoria_nombre).filter(Boolean))] as string[];

  // Filtrar costos por periodo seleccionado
  const costosFiltrados = academia.tarifas_costos.filter(c => c.periodo_vigencia === periodoSeleccionado);

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-PY').format(monto) + ' GS';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', fontFamily: "'Inter', system-ui, sans-serif", color: '#f1f5f9' }}>
      
      {/* ── BANNER CABECERA ── */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
        {academia.banner_url ? (
          <img src={academia.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${primary}dd 0%, #090d16 100%)`,
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(9,13,22,0.2) 0%, #090d16 100%)' }} />
      </div>

      {/* ── TARJETA PRINCIPAL HEADER ── */}
      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          marginTop: -80,
          display: 'flex', alignItems: 'flex-end', gap: 24,
          flexWrap: 'wrap',
          position: 'relative', zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            width: 140, height: 140, borderRadius: 24,
            border: `4px solid ${primary}`,
            background: academia.logo_url ? '#090d16' : `${primary}22`,
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 36px ${primary}55`,
          }}>
            {academia.logo_url
              ? <img src={academia.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <GraduationCap size={56} color={primary} />
            }
          </div>

          {/* Info principal */}
          <div style={{ flex: 1, minWidth: 260, paddingBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, lineHeight: 1.15, textShadow: '0 2px 10px rgba(0,0,0,.7)' }}>
              {academia.nombre}
            </h1>
            {(academia.ciudad || academia.departamento) && (
              <p style={{ margin: '8px 0 0', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <MapPin size={16} color={primary} />
                {[academia.ciudad, academia.departamento, academia.pais].filter(Boolean).join(', ')}
              </p>
            )}
            {/* Badges Deportes */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {deportesUnicos.map(d => (
                <span key={d} style={{
                  padding: '4px 12px', borderRadius: 999,
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

        {/* ── BOTONES REDES / CONTACTO ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          {academia.whatsapp && (
            <a href={`https://wa.me/${academia.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
              style={socialBtn('#25D366')}>
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
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

        {/* ── HORARIOS DE OFICINA (Estilo Volante Image 1) ── */}
        {academia.horarios_oficina && academia.horarios_oficina.length > 0 && (
          <section style={{
            background: 'linear-gradient(145deg, #131d31 0%, #0b1324 100%)',
            borderRadius: 20, padding: 24,
            border: `1px solid ${primary}44`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
            marginTop: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color={primary} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
                  HORARIOS DE OFICINA
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Días y horarios de atención administrativa</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 12, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: `${primary}33` }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', color: primary, fontWeight: 800, fontSize: 14 }}>DÍA</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: primary, fontWeight: 800, fontSize: 14 }}>HORARIO ATENCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {academia.horarios_oficina.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{h.dia}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: '#38bdf8', fontSize: 15 }}>
                        {h.hora_inicio} a {h.hora_fin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Banner de llamada a la acción inferior estilo flyer */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#38bdf8', fontStyle: 'italic' }}>
                ¡Los esperamos!
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', color: '#94a3b8', fontSize: 13 }}>
                {academia.ciudad && <span><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} /> {academia.ciudad} {academia.departamento ? `- ${academia.departamento}` : ''}</span>}
                {academia.telefono && <span><Phone size={13} style={{ display: 'inline', marginRight: 4 }} /> {academia.telefono}</span>}
                {academia.instagram && <span><Camera size={13} style={{ display: 'inline', marginRight: 4 }} /> {academia.instagram}</span>}
              </div>
            </div>
          </section>
        )}

        {/* ── SELECTOR DE PERIODO DE VIGENCIA (ej. 2026) ── */}
        {academia.periodos_vigencia && academia.periodos_vigencia.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} color={primary} />
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
                PROGRAMACIÓN Y TARIFARIO
              </h2>
            </div>
            {academia.periodos_vigencia.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Periodo / Vigencia:</span>
                <select
                  value={periodoSeleccionado}
                  onChange={e => setPeriodoSeleccionado(e.target.value)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, background: '#1e293b',
                    border: `1px solid ${primary}`, color: '#f1f5f9', fontWeight: 700,
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {academia.periodos_vigencia.map(p => (
                    <option key={p} value={p}>Vigencia {p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── MATRIZ DE HORARIOS DE PRÁCTICA 2026 (Estilo Volante Images 2 & 4) ── */}
        <section style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={sectionTitle(primary)}>
              <Dumbbell size={20} /> HORARIOS DE PRÁCTICA ({periodoSeleccionado})
            </h2>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, background: `${primary}22`, border: `1px solid ${primary}44`, color: primary, fontWeight: 700 }}>
              Vigencia por Categorías
            </span>
          </div>

          {horariosFiltrados.length === 0 ? (
            <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', padding: '30px 0' }}>
              No se registraron horarios de práctica para el periodo {periodoSeleccionado}.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0b1324', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e293b' }}>
                <thead>
                  <tr style={{ background: '#101e38', borderBottom: '2px solid #1e293b' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', color: '#00f2fe', fontWeight: 800, width: 120, fontSize: 13 }}>DÍA</th>
                    {categoriasPractica.map(cat => (
                      <th key={cat} style={{ padding: '14px 16px', textAlign: 'center', color: '#00f2fe', fontWeight: 800, fontSize: 13, borderLeft: '1px solid #1e293b' }}>
                        {cat.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIAS_ORDEN.map((dia, idx) => {
                    const slotsDelDia = horariosFiltrados.filter(h => h.dia_semana === dia);
                    if (slotsDelDia.length === 0) return null;

                    return (
                      <tr key={dia} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#f8fafc', fontSize: 14 }}>
                          {dia.toUpperCase()}
                        </td>
                        {categoriasPractica.map(cat => {
                          const slotsCat = slotsDelDia.filter(s => s.categoria_nombre === cat);
                          return (
                            <td key={cat} style={{ padding: '12px 14px', textAlign: 'center', borderLeft: '1px solid #1e293b', verticalAlign: 'top' }}>
                              {slotsCat.length === 0 ? (
                                <span style={{ color: '#334155', fontSize: 18 }}>—</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {slotsCat.map(slot => (
                                    <div key={slot.id} style={{
                                      background: 'linear-gradient(135deg, #172554 0%, #1e1b4b 100%)',
                                      borderRadius: 10, padding: '8px 10px',
                                      border: '1px solid #3b82f644', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    }}>
                                      <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: 13 }}>
                                        {slot.sub_categoria ? `${slot.sub_categoria}: ` : ''}
                                        {slot.hora_inicio} A {slot.hora_fin}
                                      </div>
                                      {slot.cancha_nombre && (
                                        <div style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>
                                          ({slot.cancha_nombre})
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── COSTOS 2026 (Estilo Volante Image 3) ── */}
        <section style={{ ...sectionCard, background: 'linear-gradient(145deg, #0b1324 0%, #090d16 100%)', border: '1px solid #00f2fe44' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 900, color: '#00f2fe', margin: 0 }}>
              <DollarSign size={24} /> COSTOS ({periodoSeleccionado})
            </h2>
            <span style={{ fontSize: 12, padding: '4px 14px', borderRadius: 999, background: '#00f2fe22', border: '1px solid #00f2fe55', color: '#00f2fe', fontWeight: 800 }}>
              Tarifario Oficial
            </span>
          </div>

          {costosFiltrados.length === 0 ? (
            <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', padding: '30px 0' }}>
              No se registraron costos para el periodo {periodoSeleccionado}.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 14, overflow: 'hidden', background: '#0b1324', border: '1px solid #1e293b' }}>
                <thead>
                  <tr style={{ background: '#101e38', borderBottom: '2px solid #1e293b' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#00f2fe', fontWeight: 800, fontSize: 14 }}>CONCEPTO / CATEGORÍA</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right', color: '#00f2fe', fontWeight: 800, fontSize: 14 }}>MONTO EN GUARANÍES</th>
                  </tr>
                </thead>
                <tbody>
                  {costosFiltrados.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#f8fafc', fontSize: 15 }}>
                        {c.concepto.toUpperCase()}
                        {c.descripcion && (
                          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 3 }}>
                            {c.descripcion}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8' }}>
                          {formatMonto(c.monto)}
                        </div>
                        {c.tipo_costo === 'cuota_mensual' && (
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>
                            (CUOTA MENSUAL)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Agenda tus clases Banner Footer */}
          {academia.whatsapp && (
            <div style={{
              marginTop: 20, padding: '18px 24px', borderRadius: 14,
              background: 'linear-gradient(135deg, #10b98122 0%, #04785722 100%)',
              border: '1px solid #10b98144',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 14,
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>
                  Agenda tus clases e inscripciones
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Comunicate con nuestro equipo de admisiones por WhatsApp.
                </div>
              </div>
              <a
                href={`https://wa.me/${academia.whatsapp.replace(/\D/g,'')}?text=Hola,%20quisiera%20consultar%20sobre%20inscripciones`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '10px 22px', borderRadius: 10, background: '#10b981',
                  color: '#fff', fontWeight: 800, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                }}
              >
                <MessageCircle size={18} /> Escribir al WhatsApp
              </a>
            </div>
          )}
        </section>

        {/* ── ACERCA DE ── */}
        {academia.acerca_de && (
          <section style={sectionCard}>
            <h2 style={sectionTitle(primary)}><Star size={20} /> Acerca de la Academia</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line', fontSize: 15 }}>
              {academia.acerca_de}
            </p>
          </section>
        )}

        {/* ── SUCURSALES / CANCHAS DE PRÁCTICA ── */}
        {academia.sucursales.length > 0 && (
          <section style={sectionCard}>
            <h2 style={sectionTitle(primary)}><Building2 size={20} /> Sedes y Canchas de Entrenamiento</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {academia.sucursales.map(suc => {
                const dColor = deporteColors[suc.deporte] || primary;
                return (
                  <div key={suc.id} style={{
                    background: '#0b1324', borderRadius: 16,
                    border: `1px solid ${dColor}33`,
                    padding: 22, transition: 'transform .2s, box-shadow .2s',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 28px ${dColor}22`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Badge Deporte */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 999,
                      background: `${dColor}18`, color: dColor,
                      fontSize: 12, fontWeight: 800, marginBottom: 12,
                    }}>
                      {deporteIcon(suc.deporte)} {suc.deporte}
                    </div>

                    <h3 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: '#f8fafc' }}>
                      {suc.nombre}
                    </h3>

                    {(suc.ciudad || suc.departamento) && (
                      <p style={{ margin: '6px 0', color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} color={dColor} /> {[suc.ciudad, suc.departamento].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {suc.direccion && (
                      <p style={{ margin: '6px 0', color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevronRight size={14} /> {suc.direccion}
                      </p>
                    )}
                    {suc.telefono && (
                      <a href={`tel:${suc.telefono}`} style={{ margin: '10px 0 0', color: dColor, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                        <Phone size={14} /> {suc.telefono}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', padding: '50px 0 60px', color: '#475569', fontSize: 13 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
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
  padding: '8px 16px', borderRadius: 9999,
  background: `${color}18`, border: `1px solid ${color}44`,
  color, fontSize: 13, fontWeight: 700, textDecoration: 'none',
  transition: 'all .2s',
} as React.CSSProperties);

const sectionCard: React.CSSProperties = {
  background: '#131d31', borderRadius: 20, padding: 26,
  border: '1px solid #1e293b', marginTop: 24,
};

const sectionTitle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  fontSize: 20, fontWeight: 800, color,
  margin: 0,
});
