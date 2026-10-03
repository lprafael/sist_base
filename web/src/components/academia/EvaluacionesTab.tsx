/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Award, TrendingUp, TrendingDown, Star, Sparkles, Plus,
  Search, Printer, PhoneCall, Trash2, Pencil, Eye, CheckCircle2,
  AlertCircle, X, ShieldCheck, User, Calendar, Activity, ChevronRight,
  Flame, Heart, Dumbbell, Brain, Target, MessageSquare, Copy, Check
} from 'lucide-react';

interface EvaluacionesTabProps {
  perfil: any;
  alumnos: any[];
  sucursales: any[];
  categorias: any[];
  notify: (msg: string, type?: 'ok' | 'err') => void;
  apiFetch: (endpoint: string, opts?: any) => Promise<any>;
  isAdmin: boolean;
  isDueno: boolean;
  rolInterno: string;
}

// Fundamentos estándar por defecto para academias de fútbol y deportes de equipo
const DEFAULT_FUNDAMENTOS = [
  { nombre: 'Control y Dominio', categoria: 'tecnico', nota: 8.0, obs: 'Buen primer toque orientado' },
  { nombre: 'Pase Corto y Largo', categoria: 'tecnico', nota: 7.5, obs: 'Buena precisión con pierna hábil' },
  { nombre: 'Conducción y Regate', categoria: 'tecnico', nota: 8.0, obs: 'Excelente cambio de ritmo' },
  { nombre: 'Remate y Definición', categoria: 'tecnico', nota: 7.0, obs: 'Buena potencia, calibrar dirección' },
  { nombre: 'Cabeceo', categoria: 'tecnico', nota: 6.5, obs: 'En progreso en fase defensiva' },

  { nombre: 'Posicionamiento y Orden', categoria: 'tactico', nota: 8.0, obs: 'Mantiene las distancias tácticas' },
  { nombre: 'Lectura y Anticipación', categoria: 'tactico', nota: 8.5, obs: 'Corta jugadas con inteligencia' },
  { nombre: 'Toma de Decisiones', categoria: 'tactico', nota: 7.5, obs: 'Rápido al soltar el balón' },
  { nombre: 'Transición Ataque/Defensa', categoria: 'tactico', nota: 8.0, obs: 'Solidario en el retroceso' },

  { nombre: 'Velocidad y Aceleración', categoria: 'fisico', nota: 8.5, obs: 'Muy explosivo en distancias cortas' },
  { nombre: 'Resistencia Aeróbica', categoria: 'fisico', nota: 8.0, obs: 'Mantiene la intensidad todo el partido' },
  { nombre: 'Coordinación y Agilidad', categoria: 'fisico', nota: 8.5, obs: 'Gran destreza y cambios de dirección' },
  { nombre: 'Fuerza y Duelos', categoria: 'fisico', nota: 7.0, obs: 'Protege bien el balón con el cuerpo' },

  { nombre: 'Disciplina y Puntualidad', categoria: 'actitudinal', nota: 9.5, obs: 'Compromiso y respeto ejemplares' },
  { nombre: 'Trabajo en Equipo', categoria: 'actitudinal', nota: 9.0, obs: 'Excelente relación con sus pares' },
  { nombre: 'Receptividad al Aprendizaje', categoria: 'actitudinal', nota: 9.0, obs: 'Aplica las correcciones rápido' },
];

export default function EvaluacionesTab({
  perfil,
  alumnos = [],
  sucursales = [],
  categorias = [],
  notify,
  apiFetch,
  isAdmin,
  isDueno,
  rolInterno,
}: EvaluacionesTabProps) {
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalForm, setModalForm] = useState<any>(null); // null | 'nuevo' | { evaluacion }
  const [formData, setFormData] = useState<any>({});
  const [modalBoletin, setModalBoletin] = useState<any>(null); // detalle para imprimir/compartir
  const [modalEvolucion, setModalEvolucion] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [enviandoWa, setEnviandoWa] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);

  useEffect(() => {
    cargarEvaluaciones();
  }, []);

  const cargarEvaluaciones = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/academia/evaluaciones');
      setEvaluaciones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err.message || 'Error al cargar evaluaciones', 'err');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = () => {
    setFormData({
      alumno_id: alumnos.length > 0 ? alumnos[0].id : '',
      sucursal_id: sucursales.length > 0 ? sucursales[0].id : '',
      categoria_id: categorias.length > 0 ? categorias[0].id : '',
      evaluador_nombre: perfil?.nombre_contacto || 'Profesor / DT',
      fecha: new Date().toISOString().split('T')[0],
      periodo: '1° Trimestre ' + new Date().getFullYear(),
      titulo: 'Evaluación Integral de Rendimiento',
      tipo: 'trimestral',
      posicion: 'Mediocampista',
      pierna_habil: 'Diestro',
      dorsal: '10',
      altura_cm: 140,
      peso_kg: 36,
      fundamentos: JSON.parse(JSON.stringify(DEFAULT_FUNDAMENTOS)),
      fortalezas: 'Excelente visión de juego, velocidad explosiva y actitud colaborativa con el equipo.',
      areas_mejora: 'Continuar fortaleciendo la pierna inhábil y mejorar la dirección en remates de media distancia.',
      recomendaciones: 'Realizar ejercicios de coordinación y control de balón 15 minutos diarios en casa.',
      observaciones: 'Atleta con alto potencial y gran predisposición al aprendizaje.',
      estado: 'publicado',
    });
    setModalForm('nuevo');
  };

  const abrirEditar = (ev: any) => {
    setFormData({
      id: ev.id,
      alumno_id: ev.alumno_id,
      sucursal_id: ev.sucursal_id || '',
      categoria_id: ev.categoria_id || '',
      evaluador_nombre: ev.evaluador_nombre || '',
      fecha: ev.fecha ? ev.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      periodo: ev.periodo || '',
      titulo: ev.titulo || 'Evaluación Integral de Rendimiento',
      tipo: ev.tipo || 'trimestral',
      posicion: ev.posicion || '',
      pierna_habil: ev.pierna_habil || 'Diestro',
      dorsal: ev.dorsal || '',
      altura_cm: ev.altura_cm || '',
      peso_kg: ev.peso_kg || '',
      fundamentos: ev.fundamentos && ev.fundamentos.length > 0 ? JSON.parse(JSON.stringify(ev.fundamentos)) : JSON.parse(JSON.stringify(DEFAULT_FUNDAMENTOS)),
      fortalezas: ev.fortalezas || '',
      areas_mejora: ev.areas_mejora || '',
      recomendaciones: ev.recomendaciones || '',
      observaciones: ev.observaciones || '',
      estado: ev.estado || 'publicado',
    });
    setModalForm(ev);
  };

  const guardarEvaluacion = async () => {
    if (!formData.alumno_id) {
      return notify('Tenés que seleccionar un alumno', 'err');
    }
    if (!formData.periodo || !formData.periodo.trim()) {
      return notify('El período es obligatorio (ej: 1° Trimestre 2026)', 'err');
    }

    setSaving(true);
    try {
      if (modalForm === 'nuevo') {
        await apiFetch('/academia/evaluaciones', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        notify('¡Evaluación registrada y boletín generado exitosamente!');
      } else {
        await apiFetch(`/academia/evaluaciones/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        notify('Evaluación actualizada exitosamente');
      }
      setModalForm(null);
      cargarEvaluaciones();
    } catch (err: any) {
      notify(err.message || 'Error al guardar evaluación', 'err');
    } finally {
      setSaving(false);
    }
  };

  const eliminarEvaluacion = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la evaluación de ${nombre}?`)) return;
    try {
      await apiFetch(`/academia/evaluaciones/${id}`, { method: 'DELETE' });
      notify('Evaluación eliminada exitosamente');
      cargarEvaluaciones();
    } catch (err: any) {
      notify(err.message || 'Error al eliminar', 'err');
    }
  };

  const verBoletin = async (evId: string) => {
    try {
      const data = await apiFetch(`/academia/evaluaciones/${evId}`);
      setModalBoletin(data);
    } catch (err: any) {
      notify(err.message || 'Error al cargar boletín', 'err');
    }
  };

  const verEvolucion = async (alumnoId: string) => {
    try {
      const data = await apiFetch(`/academia/evaluaciones/alumnos/${alumnoId}/evolucion`);
      setModalEvolucion(data);
    } catch (err: any) {
      notify(err.message || 'Error al cargar evolución del alumno', 'err');
    }
  };

  const enviarWhatsApp = async (evId: string) => {
    setEnviandoWa(true);
    try {
      const res = await apiFetch(`/academia/evaluaciones/${evId}/enviar-whatsapp`, {
        method: 'POST',
      });
      if (res.enviado_automatico) {
        notify(`¡Boletín enviado por WhatsApp al tutor (${res.telefono})!`);
      } else {
        notify('Abriendo WhatsApp para enviar ficha técnica...');
        if (res.whatsapp_url) {
          window.open(res.whatsapp_url, '_blank');
        }
      }
    } catch (err: any) {
      notify(err.message || 'Error al enviar WhatsApp', 'err');
    } finally {
      setEnviandoWa(false);
    }
  };

  const copiarLinkBoletin = (id: string) => {
    const url = `${window.location.origin}/boletin/${id}`;
    navigator.clipboard.writeText(url);
    setCopiadoLink(true);
    notify('Enlace del boletín copiado al portapapeles');
    setTimeout(() => setCopiadoLink(false), 3000);
  };

  // Cálculo en vivo de promedios para el modal de edición
  const calcularPromediosEnVivo = (funds: any[]) => {
    if (!funds || funds.length === 0) return { gen: 0, tec: 0, tac: 0, fis: 0, act: 0 };
    const all = funds.map(f => Number(f.nota) || 0);
    const tec = funds.filter(f => f.categoria === 'tecnico').map(f => Number(f.nota) || 0);
    const tac = funds.filter(f => f.categoria === 'tactico').map(f => Number(f.nota) || 0);
    const fis = funds.filter(f => f.categoria === 'fisico').map(f => Number(f.nota) || 0);
    const act = funds.filter(f => f.categoria === 'actitudinal').map(f => Number(f.nota) || 0);

    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '0.0';

    return {
      gen: avg(all),
      tec: avg(tec),
      tac: avg(tac),
      fis: avg(fis),
      act: avg(act),
    };
  };

  const updateFundamentoNota = (index: number, val: number) => {
    setFormData((prev: any) => {
      const copy = [...prev.fundamentos];
      copy[index] = { ...copy[index], nota: Math.min(10, Math.max(1, val)) };
      return { ...prev, fundamentos: copy };
    });
  };

  const updateFundamentoObs = (index: number, val: string) => {
    setFormData((prev: any) => {
      const copy = [...prev.fundamentos];
      copy[index] = { ...copy[index], obs: val };
      return { ...prev, fundamentos: copy };
    });
  };

  // Filtros aplicados
  const evalsFiltradas = evaluaciones.filter(ev => {
    if (filtroCategoria && ev.categoria_id !== filtroCategoria) return false;
    if (filtroSucursal && ev.sucursal_id !== filtroSucursal) return false;
    if (filtroPeriodo && ev.periodo !== filtroPeriodo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const matchNom = (ev.alumno_nombre || '').toLowerCase().includes(q);
      const matchEval = (ev.evaluador_nombre || '').toLowerCase().includes(q);
      const matchPer = (ev.periodo || '').toLowerCase().includes(q);
      if (!matchNom && !matchEval && !matchPer) return false;
    }
    return true;
  });

  // Métricas generales
  const totalEvals = evaluaciones.length;
  const promGlobalAcademia = totalEvals > 0
    ? (evaluaciones.reduce((acc, ev) => acc + (ev.promedio_general || 0), 0) / totalEvals).toFixed(1)
    : '0.0';
  const atletasDestacados = evaluaciones.filter(ev => (ev.promedio_general || 0) >= 9.0).length;
  const atletasAvanzados = evaluaciones.filter(ev => (ev.promedio_general || 0) >= 7.5 && (ev.promedio_general || 0) < 9.0).length;

  const promsForm = calcularPromediosEnVivo(formData.fundamentos || []);

  const getBadgeNivel = (nivel: string, nota: number) => {
    if (nota >= 9.0 || nivel === 'Destacado') {
      return { bg: 'rgba(16,185,129,0.18)', border: '#10b981', color: '#10b981', label: '🌟 Destacado' };
    }
    if (nota >= 7.5 || nivel === 'Avanzado') {
      return { bg: 'rgba(59,130,246,0.18)', border: '#3b82f6', color: '#60a5fa', label: '🟢 Avanzado' };
    }
    if (nota >= 6.0 || nivel === 'En Desarrollo') {
      return { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b', color: '#fcd34d', label: '🟡 En Desarrollo' };
    }
    return { bg: 'rgba(148,163,184,0.18)', border: '#94a3b8', color: '#cbd5e1', label: '⚪ Iniciación' };
  };

  return (
    <div>
      {/* ── CABECERA Y METRICAS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            }}>
              <Award size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                Evaluaciones &amp; Boletines Deportivos
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>
                Ficha técnica individual, notas por fundamento, evolución del atleta y reportes oficiales en PDF.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={abrirNuevo}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              transition: 'transform 0.15s',
            }}
          >
            <Plus size={16} /> Nueva Evaluación Técnica
          </button>
        </div>
      </div>

      {/* ── TARJETAS DE IMPACTO (KPIs) ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155',
          borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Evaluaciones</span>
            <Activity size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>{totalEvals}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Informes emitidos</div>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155',
          borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Promedio General</span>
            <Star size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>{promGlobalAcademia} <span style={{ fontSize: 15, color: '#94a3b8', fontWeight: 500 }}>/ 10</span></div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 }}>Nivel competitivo alto</div>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155',
          borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Atletas Destacados</span>
            <Sparkles size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{atletasDestacados}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Nota 9.0 a 10.0 (Élite)</div>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155',
          borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>En Nivel Avanzado</span>
            <Target size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#8b5cf6' }}>{atletasAvanzados}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Nota 7.5 a 8.9</div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS ── */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Buscar por atleta, profesor o período..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
              background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          style={{
            padding: '9px 12px', borderRadius: 9, background: '#0f172a',
            border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, outline: 'none',
          }}
        >
          <option value="">Todas las Categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <select
          value={filtroSucursal}
          onChange={e => setFiltroSucursal(e.target.value)}
          style={{
            padding: '9px 12px', borderRadius: 9, background: '#0f172a',
            border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, outline: 'none',
          }}
        >
          <option value="">Todas las Sedes</option>
          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>

        <input
          type="text"
          placeholder="Filtrar por período..."
          value={filtroPeriodo}
          onChange={e => setFiltroPeriodo(e.target.value)}
          style={{
            padding: '9px 12px', borderRadius: 9, background: '#0f172a',
            border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, outline: 'none',
            maxWidth: 160,
          }}
        />

        {(busqueda || filtroCategoria || filtroSucursal || filtroPeriodo) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroCategoria(''); setFiltroSucursal(''); setFiltroPeriodo(''); }}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              fontSize: 12, cursor: 'pointer', padding: '6px 10px',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── LISTADO DE EVALUACIONES ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
          <p>Cargando evaluaciones y fichas técnicas...</p>
        </div>
      ) : evalsFiltradas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed #334155', borderRadius: 18, color: '#94a3b8',
        }}>
          <Award size={48} color="#64748b" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>
            No hay evaluaciones registradas
          </h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, margin: '0 auto 16px' }}>
            Comenzá evaluando los fundamentos técnicos, tácticos, físicos y actitudinales de tus alumnos para generar sus boletines oficiales en PDF.
          </p>
          <button
            onClick={abrirNuevo}
            style={{
              padding: '9px 18px', borderRadius: 9, border: 'none',
              background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Crear Primera Evaluación
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {evalsFiltradas.map(ev => {
            const badgeNivel = getBadgeNivel(ev.nivel_global, ev.promedio_general);
            return (
              <div
                key={ev.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155',
                  borderRadius: 16, padding: '20px', backdropFilter: 'blur(12px)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Accent line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${badgeNivel.border}, #3b82f6)`,
                }} />

                <div>
                  {/* Top info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '3px 10px',
                      borderRadius: 999, background: badgeNivel.bg, border: `1px solid ${badgeNivel.border}`,
                      color: badgeNivel.color, letterSpacing: '0.03em', textTransform: 'uppercase',
                    }}>
                      {badgeNivel.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      {ev.periodo}
                    </span>
                  </div>

                  {/* Alumno profile card header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: '#0f172a', border: '2px solid #3b82f6',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {ev.alumno_foto ? (
                        <img src={ev.alumno_foto} alt={ev.alumno_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>
                          {ev.alumno_nombre.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {ev.alumno_nombre}
                      </h4>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                        {ev.categoria_nombre || 'Categoría General'} {ev.posicion ? `• ${ev.posicion}` : ''}
                      </p>
                      {ev.evaluador_nombre && (
                        <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                          DT: {ev.evaluador_nombre}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notas de fundamentos radar/breakdown */}
                  <div style={{
                    background: '#0f172a', borderRadius: 12, padding: '12px 14px',
                    marginBottom: 16, border: '1px solid #1e293b',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Nota Global</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: badgeNivel.color }}>
                        {Number(ev.promedio_general).toFixed(1)} <span style={{ fontSize: 11, color: '#64748b' }}>/ 10</span>
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                      <div style={{ background: '#1e293b', padding: '6px 4px', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Técnico</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginTop: 2 }}>
                          {Number(ev.promedio_tecnico || 0).toFixed(1)}
                        </div>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px 4px', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Táctico</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa', marginTop: 2 }}>
                          {Number(ev.promedio_tactico || 0).toFixed(1)}
                        </div>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px 4px', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Físico</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                          {Number(ev.promedio_fisico || 0).toFixed(1)}
                        </div>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px 4px', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Actitud</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#fcd34d', marginTop: 2 }}>
                          {Number(ev.promedio_actitudinal || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico rápido */}
                  {ev.fortalezas && (
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✦ Fortaleza:</span> {ev.fortalezas.length > 70 ? ev.fortalezas.slice(0, 70) + '...' : ev.fortalezas}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{
                  display: 'flex', gap: 6, paddingTop: 14,
                  borderTop: '1px solid #334155', alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <button
                    onClick={() => verBoletin(ev.id)}
                    style={{
                      flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                    title="Ver boletín técnico y descargar en PDF"
                  >
                    <Eye size={14} /> Boletín PDF
                  </button>

                  <button
                    onClick={() => enviarWhatsApp(ev.id)}
                    disabled={enviandoWa}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)',
                      background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                    title="Enviar informe oficial por WhatsApp al tutor"
                  >
                    <PhoneCall size={14} /> WhatsApp
                  </button>

                  <button
                    onClick={() => verEvolucion(ev.alumno_id)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, border: '1px solid #334155',
                      background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
                    }}
                    title="Ver histórico de evolución del atleta"
                  >
                    <TrendingUp size={14} color="#60a5fa" />
                  </button>

                  <button
                    onClick={() => abrirEditar(ev)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, border: '1px solid #334155',
                      background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
                    }}
                    title="Editar evaluación"
                  >
                    <Pencil size={14} />
                  </button>

                  {(isAdmin || isDueno) && (
                    <button
                      onClick={() => eliminarEvaluacion(ev.id, ev.alumno_nombre)}
                      style={{
                        padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer',
                      }}
                      title="Eliminar evaluación"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: FORMULARIO DE EVALUACIÓN TÉCNICA
      ═══════════════════════════════════════════════════════════════ */}
      {modalForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0f172a',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>
                  {modalForm === 'nuevo' ? '⚽ Nueva Evaluación Deportiva y Ficha Técnica' : '✏️ Editar Evaluación'}
                </h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>
                  Calificá los fundamentos del alumno del 1.0 al 10.0 para generar su boletín de evolución.
                </p>
              </div>
              <button
                onClick={() => setModalForm(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Scroll */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Sección 1: Alumno y Datos Básicos */}
              <div style={{
                background: '#0f172a', padding: 16, borderRadius: 14,
                border: '1px solid #334155', marginBottom: 20,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Datos del Atleta y Ciclo Evaluado
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Alumno *</label>
                    <select
                      value={formData.alumno_id}
                      onChange={e => {
                        const al = alumnos.find(a => a.id === e.target.value);
                        setFormData((f: any) => ({
                          ...f,
                          alumno_id: e.target.value,
                          sucursal_id: al?.sucursal_id || f.sucursal_id,
                          categoria_id: al?.categoria_id || f.categoria_id,
                        }));
                      }}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                      }}
                    >
                      <option value="">— Seleccionar alumno —</option>
                      {alumnos.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre} {a.apellido || ''} ({a.categoria_nombre || 'Sin cat.'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Período / Ciclo *</label>
                    <input
                      type="text"
                      placeholder="Ej: 1° Trimestre 2026"
                      value={formData.periodo}
                      onChange={e => setFormData({ ...formData, periodo: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Fecha de Evaluación</label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Profesor / Evaluador</label>
                    <input
                      type="text"
                      placeholder="Nombre del DT / Profesor"
                      value={formData.evaluador_nombre}
                      onChange={e => setFormData({ ...formData, evaluador_nombre: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Posición Táctica</label>
                    <input
                      type="text"
                      placeholder="Ej: Mediocampista Central, Extremo, Delantero"
                      value={formData.posicion}
                      onChange={e => setFormData({ ...formData, posicion: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Pierna Hábil</label>
                    <select
                      value={formData.pierna_habil}
                      onChange={e => setFormData({ ...formData, pierna_habil: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                      }}
                    >
                      <option value="Diestro">Diestro</option>
                      <option value="Zurdo">Zurdo</option>
                      <option value="Ambidiestro">Ambidiestro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Altura (cm) / Peso (kg)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        placeholder="cm"
                        value={formData.altura_cm || ''}
                        onChange={e => setFormData({ ...formData, altura_cm: e.target.value })}
                        style={{
                          width: '50%', padding: '9px 12px', borderRadius: 8,
                          background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                        }}
                      />
                      <input
                        type="number"
                        placeholder="kg"
                        value={formData.peso_kg || ''}
                        onChange={e => setFormData({ ...formData, peso_kg: e.target.value })}
                        style={{
                          width: '50%', padding: '9px 12px', borderRadius: 8,
                          background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>Dorsal</label>
                    <input
                      type="text"
                      placeholder="Ej: 10"
                      value={formData.dorsal || ''}
                      onChange={e => setFormData({ ...formData, dorsal: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Tablero de Promedios en Vivo */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.15))',
                border: '1px solid #3b82f6', borderRadius: 14, padding: '16px 20px', marginBottom: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' }}>Cálculo automático de notas</span>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', marginTop: 2 }}>
                    Promedio General: <span style={{ color: '#10b981' }}>{promsForm.gen}</span> / 10
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ background: '#0f172a', padding: '6px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Técnico:</span> <strong style={{ color: '#60a5fa' }}>{promsForm.tec}</strong>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Táctico:</span> <strong style={{ color: '#a78bfa' }}>{promsForm.tac}</strong>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Físico:</span> <strong style={{ color: '#34d399' }}>{promsForm.fis}</strong>
                  </div>
                  <div style={{ background: '#0f172a', padding: '6px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Actitud:</span> <strong style={{ color: '#fcd34d' }}>{promsForm.act}</strong>
                  </div>
                </div>
              </div>

              {/* Sección 3: Matriz de Fundamentos */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    ⚽ 2. Calificación por Fundamento (1.0 a 10.0)
                  </h4>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {formData.fundamentos?.length || 0} fundamentos evaluados
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {formData.fundamentos?.map((fund: any, idx: number) => {
                    const catColor = fund.categoria === 'tecnico' ? '#60a5fa'
                      : fund.categoria === 'tactico' ? '#a78bfa'
                      : fund.categoria === 'fisico' ? '#34d399' : '#fcd34d';

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#0f172a', border: '1px solid #334155', borderRadius: 12,
                          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 14, flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                              background: `${catColor}22`, border: `1px solid ${catColor}55`, color: catColor,
                              textTransform: 'uppercase',
                            }}>
                              {fund.categoria}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                              {fund.nombre}
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="Observación técnica del fundamento..."
                            value={fund.obs || ''}
                            onChange={e => updateFundamentoObs(idx, e.target.value)}
                            style={{
                              width: '100%', marginTop: 6, padding: '4px 8px', borderRadius: 6,
                              background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11,
                              outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        {/* Slider y Valor */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={fund.nota}
                            onChange={e => updateFundamentoNota(idx, parseFloat(e.target.value))}
                            style={{ width: 120, accentColor: catColor, cursor: 'pointer' }}
                          />
                          <div style={{
                            width: 44, height: 36, borderRadius: 8, background: '#1e293b',
                            border: `1px solid ${catColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 900, color: catColor,
                          }}>
                            {Number(fund.nota).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección 4: Recomendaciones y Diagnóstico */}
              <div style={{
                background: '#0f172a', padding: 18, borderRadius: 14,
                border: '1px solid #334155', marginBottom: 10,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#10b981', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🎯 3. Diagnóstico y Recomendaciones de Desarrollo
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>
                      💪 Fortalezas Principales Identificadas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Excelente visión de juego, velocidad explosiva y actitud colaborativa..."
                      value={formData.fortalezas}
                      onChange={e => setFormData({ ...formData, fortalezas: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>
                      🎯 Áreas de Mejora / Objetivos del Próximo Ciclo
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Fortalecer la pierna inhábil y mejorar la dirección en remates..."
                      value={formData.areas_mejora}
                      onChange={e => setFormData({ ...formData, areas_mejora: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 5 }}>
                      💡 Recomendaciones Pedagógicas y Plan Individual (Para el atleta y los padres)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Realizar ejercicios de coordinación y control de balón 15 min diarios..."
                      value={formData.recomendaciones}
                      onChange={e => setFormData({ ...formData, recomendaciones: e.target.value })}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13,
                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
              background: '#0f172a',
            }}>
              <button
                onClick={() => setModalForm(null)}
                style={{
                  padding: '9px 16px', borderRadius: 9, border: '1px solid #334155',
                  background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarEvaluacion}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={16} /> {saving ? 'Guardando...' : 'Guardar y Publicar Boletín'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: BOLETÍN DEPORTIVO PROFESIONAL EN PDF (VISTA OFICIAL)
      ═══════════════════════════════════════════════════════════════ */}
      {modalBoletin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#ffffff', color: '#0f172a',
            borderRadius: 20, width: '100%', maxWidth: 880, maxHeight: '94vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)',
          }}>
            {/* Barra superior de control (NO SE IMPRIME) */}
            <div className="no-print" style={{
              padding: '12px 20px', background: '#0f172a', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Boletín de Evaluación Deportiva Oficial</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Printer size={14} /> Imprimir / Guardar en PDF
                </button>

                <button
                  onClick={() => enviarWhatsApp(modalBoletin.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <PhoneCall size={14} /> Enviar al Tutor por WhatsApp
                </button>

                <button
                  onClick={() => copiarLinkBoletin(modalBoletin.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #334155',
                    background: '#1e293b', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {copiadoLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Link
                </button>

                <button
                  onClick={() => setModalBoletin(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Hoja Imprimible Oficial (A4 Formatted) */}
            <div id="hoja-boletin-oficial" style={{
              padding: '36px 40px', overflowY: 'auto', flex: 1,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}>
              {/* Encabezado Institucional */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 20, borderBottom: '2px solid #0f172a', marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {modalBoletin.academia_logo ? (
                    <img src={modalBoletin.academia_logo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: 60, height: 60, borderRadius: 12, background: '#0f172a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 900,
                    }}>
                      ⚽
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {modalBoletin.academia_nombre || 'Academia Deportiva'}
                    </h1>
                    <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '2px 0 0' }}>
                      Boletín de Desarrollo Deportivo y Evaluación Técnica • {modalBoletin.periodo}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block', padding: '4px 14px', borderRadius: 999,
                    background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    INFORME OFICIAL
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Fecha: {modalBoletin.fecha || new Date().toISOString().split('T')[0]}
                  </div>
                </div>
              </div>

              {/* Ficha del Atleta */}
              <div style={{
                display: 'flex', gap: 20, alignItems: 'center', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginBottom: 24,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 14, background: '#e2e8f0',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: '2px solid #0f172a',
                }}>
                  {modalBoletin.alumno_foto ? (
                    <img src={modalBoletin.alumno_foto} alt={modalBoletin.alumno_nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#64748b' }}>
                      {modalBoletin.alumno_nombre.charAt(0)}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {modalBoletin.alumno_nombre}
                    </h2>
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '3px 12px', borderRadius: 999,
                      background: '#10b981', color: '#fff',
                    }}>
                      Nivel: {modalBoletin.nivel_global}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 10, fontSize: 12, color: '#475569' }}>
                    <div><strong>Categoría:</strong> {modalBoletin.categoria_nombre || 'General'}</div>
                    <div><strong>Posición:</strong> {modalBoletin.posicion || 'Campo'}</div>
                    <div><strong>Pierna Hábil:</strong> {modalBoletin.pierna_habil || 'Diestro'}</div>
                    <div><strong>Edad:</strong> {modalBoletin.alumno_edad ? `${modalBoletin.alumno_edad} años` : '—'}</div>
                    <div><strong>Dorsal:</strong> #{modalBoletin.dorsal || '—'}</div>
                    <div><strong>Evaluador:</strong> {modalBoletin.evaluador_nombre || 'Cuerpo Técnico'}</div>
                  </div>
                </div>
              </div>

              {/* Indicador de Evolución respecto al ciclo anterior */}
              {modalBoletin.evolucion && (
                <div style={{
                  background: modalBoletin.evolucion.tendencia === 'subio' ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${modalBoletin.evolucion.tendencia === 'subio' ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 12, padding: '12px 18px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {modalBoletin.evolucion.tendencia === 'subio' ? (
                      <TrendingUp size={22} color="#16a34a" />
                    ) : (
                      <TrendingDown size={22} color="#64748b" />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        Evolución respecto a {modalBoletin.evolucion.anterior_periodo}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        {modalBoletin.evolucion.tendencia === 'subio'
                          ? `¡Progreso positivo! El atleta subió +${modalBoletin.evolucion.delta_general} puntos en su promedio general.`
                          : `Rendimiento sostenido con variaciones de consolidación técnica.`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: modalBoletin.evolucion.delta_general >= 0 ? '#16a34a' : '#dc2626' }}>
                      {modalBoletin.evolucion.delta_general >= 0 ? `+${modalBoletin.evolucion.delta_general}` : modalBoletin.evolucion.delta_general}
                    </span>
                  </div>
                </div>
              )}

              {/* Tarjetas de Áreas / Promedios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>Técnico</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1e40af', margin: '4px 0' }}>
                    {Number(modalBoletin.promedio_tecnico || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Dominio &amp; Control</div>
                </div>

                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>Táctico</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#5b21b6', margin: '4px 0' }}>
                    {Number(modalBoletin.promedio_tactico || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600 }}>Toma de Decisiones</div>
                </div>

                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Físico</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#065f46', margin: '4px 0' }}>
                    {Number(modalBoletin.promedio_fisico || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Velocidad &amp; Agilidad</div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Actitudinal</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e', margin: '4px 0' }}>
                    {Number(modalBoletin.promedio_actitudinal || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Disciplina &amp; Grupo</div>
                </div>
              </div>

              {/* Matriz Completa de Fundamentos */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                  Detalle de Calificaciones por Fundamento
                </h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Área</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Fundamento</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Observación del Entrenador</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#475569', fontWeight: 700, width: 70 }}>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalBoletin.fundamentos?.map((f: any, idx: number) => (
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

              {/* Recomendaciones de Desarrollo */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 14, padding: 18, marginBottom: 28,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10 }}>
                  Diagnóstico Técnico y Recomendaciones Pedagógicas
                </h4>

                {modalBoletin.fortalezas && (
                  <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
                    <strong style={{ color: '#16a34a' }}>💪 Fortalezas destacadas:</strong> {modalBoletin.fortalezas}
                  </div>
                )}
                {modalBoletin.areas_mejora && (
                  <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
                    <strong style={{ color: '#d97706' }}>🎯 Objetivos de trabajo:</strong> {modalBoletin.areas_mejora}
                  </div>
                )}
                {modalBoletin.recomendaciones && (
                  <div style={{ fontSize: 12, color: '#334155' }}>
                    <strong style={{ color: '#2563eb' }}>💡 Recomendaciones del Entrenador:</strong> {modalBoletin.recomendaciones}
                  </div>
                )}
              </div>

              {/* Firmas de Certificación */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #e2e8f0', marginTop: 20 }}>
                <div style={{ textAlign: 'center', width: 220 }}>
                  <div style={{ height: 40, borderBottom: '1px dashed #94a3b8', marginBottom: 6 }}></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{modalBoletin.evaluador_nombre || 'Entrenador / DT'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Cuerpo Técnico</div>
                </div>

                <div style={{ textAlign: 'center', width: 220 }}>
                  <div style={{ height: 40, borderBottom: '1px dashed #94a3b8', marginBottom: 6 }}></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{modalBoletin.academia_nombre}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Dirección Deportiva</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#94a3b8' }}>
                Documento generado digitalmente por Mi Cancha Sports Management System • {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: EVOLUCIÓN HISTÓRICA DEL ATLETA
      ═══════════════════════════════════════════════════════════════ */}
      {modalEvolucion && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0f172a',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>
                  📈 Trayectoria y Evolución: {modalEvolucion.alumno_nombre}
                </h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                  Historial comparativo de evaluaciones deportivas realizadas a lo largo del año.
                </p>
              </div>
              <button
                onClick={() => setModalEvolucion(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {modalEvolucion.cronologia?.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No hay evaluaciones previas cargadas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {modalEvolucion.cronologia?.map((c: any, i: number) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#0f172a', border: '1px solid #334155', borderRadius: 14,
                        padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>
                            {c.periodo}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>({c.fecha})</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          Técnico: <strong style={{ color: '#60a5fa' }}>{c.promedio_tecnico}</strong> • Táctico: <strong style={{ color: '#a78bfa' }}>{c.promedio_tactico}</strong> • Físico: <strong style={{ color: '#34d399' }}>{c.promedio_fisico}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>
                          {c.promedio_general}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{c.nivel_global}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #334155', textAlign: 'right', background: '#0f172a' }}>
              <button
                onClick={() => setModalEvolucion(null)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTILOS DE IMPRESIÓN OFICIAL A4 ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #hoja-boletin-oficial, #hoja-boletin-oficial * {
            visibility: visible !important;
          }
          #hoja-boletin-oficial {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: #ffffff !important;
            color: #0f172a !important;
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
