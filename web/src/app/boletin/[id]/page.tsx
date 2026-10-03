/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Award, Star, Printer, PhoneCall, CheckCircle2,
  Calendar, User, Activity, Dumbbell, Brain, Heart,
  Flame, Sparkles, ChevronRight, Share2, Check
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

export default function BoletinPublicoPage() {
  const params = useParams();
  const id = params?.id as string;

  const [boletin, setBoletin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchBoletin();
  }, [id]);

  const fetchBoletin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/public/boletin/${id}`);
      if (!res.ok) {
        throw new Error('No se encontró el boletín solicitado o no está disponible.');
      }
      const data = await res.json();
      setBoletin(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el boletín');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Boletín de ${boletin?.alumno_nombre} — ${boletin?.academia_nombre}`,
        text: `Ficha técnica oficial y evaluación deportiva de ${boletin?.alumno_nombre} (${boletin?.periodo})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚽</div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cargando Boletín Oficial...</h2>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Obteniendo notas por fundamento y ficha del atleta</p>
        </div>
      </div>
    );
  }

  if (error || !boletin) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#f1f5f9', padding: 20, fontFamily: 'sans-serif',
      }}>
        <div style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 20,
          padding: '36px 28px', maxWidth: 460, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Boletín no encontrado</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 20 }}>
            {error || 'El informe solicitado no existe o fue retirado por la administración de la academia.'}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block', padding: '10px 20px', borderRadius: 10,
              background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Ir a Mi Cancha
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0b1120', padding: '24px 16px 60px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Barra de acción flotante / superior (no se imprime) */}
      <div className="no-print" style={{
        maxWidth: 820, margin: '0 auto 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}>
          <span style={{ color: '#10b981', fontWeight: 800 }}>● Activo</span>
          <span>Boletín Oficial Digital</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}
          >
            <Printer size={15} /> Imprimir / PDF
          </button>

          <button
            onClick={handleShare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 9, border: '1px solid #334155',
              background: '#1e293b', color: '#f1f5f9', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {copiado ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
            {copiado ? 'Copiado' : 'Compartir'}
          </button>
        </div>
      </div>

      {/* Contenedor del Boletín (Hoja A4) */}
      <div id="hoja-boletin-publico" style={{
        maxWidth: 820, margin: '0 auto', background: '#ffffff', color: '#0f172a',
        borderRadius: 20, padding: '36px 36px', boxShadow: '0 20px 45px -10px rgba(0,0,0,0.5)',
      }}>
        {/* Encabezado */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 20, borderBottom: '2px solid #0f172a', marginBottom: 24, flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {boletin.academia_logo ? (
              <img src={boletin.academia_logo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: 58, height: 58, borderRadius: 14, background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26,
              }}>
                ⚽
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {boletin.academia_nombre}
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '2px 0 0' }}>
                Boletín de Desarrollo Deportivo • {boletin.periodo}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 999,
              background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            }}>
              FICHA TÉCNICA OFICIAL
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Fecha: {boletin.fecha || '2026'}
            </div>
          </div>
        </div>

        {/* Ficha del Atleta */}
        <div style={{
          display: 'flex', gap: 18, alignItems: 'center', background: '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginBottom: 24, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 14, background: '#e2e8f0',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: '2px solid #0f172a',
          }}>
            {boletin.alumno_foto ? (
              <img src={boletin.alumno_foto} alt={boletin.alumno_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 900, color: '#64748b' }}>
                {boletin.alumno_nombre.charAt(0)}
              </span>
            )}
          </div>

          <div style={{ flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {boletin.alumno_nombre}
              </h2>
              <span style={{
                fontSize: 12, fontWeight: 800, padding: '3px 12px', borderRadius: 999,
                background: '#10b981', color: '#fff',
              }}>
                Nivel: {boletin.nivel_global}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 10, fontSize: 12, color: '#475569' }}>
              <div><strong>Categoría:</strong> {boletin.categoria_nombre || 'General'}</div>
              <div><strong>Posición:</strong> {boletin.posicion || 'Campo'}</div>
              <div><strong>Pierna Hábil:</strong> {boletin.pierna_habil || 'Diestro'}</div>
              <div><strong>Edad:</strong> {boletin.alumno_edad ? `${boletin.alumno_edad} años` : '—'}</div>
              <div><strong>Dorsal:</strong> #{boletin.dorsal || '—'}</div>
              <div><strong>Evaluador:</strong> {boletin.evaluador_nombre || 'Cuerpo Técnico'}</div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Áreas / Promedios */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>Técnico</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e40af', margin: '4px 0' }}>
              {Number(boletin.promedio_tecnico || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Dominio &amp; Control</div>
          </div>

          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>Táctico</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#5b21b6', margin: '4px 0' }}>
              {Number(boletin.promedio_tactico || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600 }}>Decisiones &amp; Visión</div>
          </div>

          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Físico</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#065f46', margin: '4px 0' }}>
              {Number(boletin.promedio_fisico || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Velocidad &amp; Agilidad</div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Actitudinal</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e', margin: '4px 0' }}>
              {Number(boletin.promedio_actitudinal || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Disciplina &amp; Respeto</div>
          </div>
        </div>

        {/* Tabla de Fundamentos */}
        <div style={{ marginBottom: 24, overflowX: 'auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            Calificaciones Detalladas por Fundamento
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Área</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Fundamento</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Observación</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#475569', fontWeight: 700, width: 70 }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {boletin.fundamentos?.map((f: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 12px', fontWeight: 700, textTransform: 'capitalize', color: '#64748b' }}>
                    {f.categoria}
                  </td>
                  <td style={{ padding: '7px 12px', fontWeight: 700, color: '#0f172a' }}>
                    {f.nombre}
                  </td>
                  <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 11 }}>
                    {f.obs || '—'}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 900, fontSize: 13, color: Number(f.nota) >= 8 ? '#16a34a' : '#d97706' }}>
                    {Number(f.nota).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagnóstico y Recomendaciones */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 14, padding: 18, marginBottom: 28,
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10 }}>
            Diagnóstico del Entrenador y Recomendaciones
          </h4>

          {boletin.fortalezas && (
            <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
              <strong style={{ color: '#16a34a' }}>💪 Fortalezas destacadas:</strong> {boletin.fortalezas}
            </div>
          )}
          {boletin.areas_mejora && (
            <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
              <strong style={{ color: '#d97706' }}>🎯 Puntos a trabajar:</strong> {boletin.areas_mejora}
            </div>
          )}
          {boletin.recomendaciones && (
            <div style={{ fontSize: 12, color: '#334155' }}>
              <strong style={{ color: '#2563eb' }}>💡 Recomendaciones individuales:</strong> {boletin.recomendaciones}
            </div>
          )}
        </div>

        {/* Firmas de Certificación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #e2e8f0', marginTop: 20, flexWrap: 'wrap', gap: 20 }}>
          <div style={{ textAlign: 'center', width: 200, margin: '0 auto' }}>
            <div style={{ height: 40, borderBottom: '1px dashed #94a3b8', marginBottom: 6 }}></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{boletin.evaluador_nombre || 'Cuerpo Técnico'}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Entrenador / DT</div>
          </div>

          <div style={{ textAlign: 'center', width: 200, margin: '0 auto' }}>
            <div style={{ height: 40, borderBottom: '1px dashed #94a3b8', marginBottom: 6 }}></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{boletin.academia_nombre}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Dirección Deportiva</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#94a3b8' }}>
          Documento certificado y generado digitalmente por Mi Cancha Sports Management System • {new Date().getFullYear()}
        </div>
      </div>

      {/* Estilos para impresión A4 */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #hoja-boletin-publico, #hoja-boletin-publico * {
            visibility: visible !important;
          }
          #hoja-boletin-publico {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
