/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Edit3, ExternalLink, Upload, RefreshCw, X, Check, Power } from 'lucide-react';

const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://api.micancha.com.py';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
};

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  tipo: 'guia',
  categoria: 'Karate WKF',
  url: '',
  orden: 1,
  activo: true,
};

export default function GuiasAdminTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [guias, setGuias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const getToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('user_session') || '{}');
      return s.access_token || s.token || '';
    } catch {
      return '';
    }
  };

  const fetchGuias = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/guias/admin`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setGuias(list);
        if (onCountChange) onCountChange(list.length);
      }
    } catch (e) {
      console.error('Error cargando guías admin:', e);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchGuias(); }, [fetchGuias]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, orden: guias.length + 1 });
    setShowForm(true);
  };

  const openEdit = (g: any) => {
    setEditingId(g.id);
    setForm({
      titulo: g.titulo || '',
      descripcion: g.descripcion || '',
      tipo: g.tipo || 'guia',
      categoria: g.categoria || 'General',
      url: g.url || '',
      orden: g.orden ?? 0,
      activo: Boolean(g.activo),
    });
    setShowForm(true);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiUrl()}/api/guias/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        setForm((prev: any) => ({
          ...prev,
          url: data.url,
          tipo: isPdf ? 'pdf' : 'guia',
          titulo: prev.titulo || file.name.replace(/\.[^.]+$/, ''),
        }));
      } else {
        alert(data.detail || 'No se pudo subir el archivo');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al subir el archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.url.trim()) {
      alert('Completá al menos el título y la URL.');
      return;
    }
    setSaving(true);
    try {
      const endpoint = editingId ? `${getApiUrl()}/api/guias/${editingId}` : `${getApiUrl()}/api/guias`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          orden: Number(form.orden) || 0,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        await fetchGuias();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Error al guardar la guía');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (g: any) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/guias/${g.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...g, activo: !g.activo }),
      });
      if (res.ok) fetchGuias();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (g: any) => {
    if (!confirm(`¿Eliminar la guía "${g.titulo}"?`)) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/guias/${g.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchGuias();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="#16a34a" /> Guías &amp; Documentaciones (Pantalla Principal)
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Administrá los manuales, videos de YouTube y documentos visibles en el apartado público de la página principal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchGuias}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 14px', borderRadius: 12, border: '1px solid #cbd5e1',
              background: '#fff', color: '#334155', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} /> Refrescar
          </button>
          <button
            onClick={openNew}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12, border: 'none',
              background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Nueva Guía / Video
          </button>
        </div>
      </div>

      {/* Formulario crear / editar */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 18,
            padding: 24, marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              {editingId ? 'Editar Guía / Documentación' : 'Agregar Nueva Guía / Documentación'}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Título *</label>
              <input
                required
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Guía Oficial Torneo Karate WKF"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
              >
                <option value="guia">📘 Guía Web / HTML</option>
                <option value="video">🎬 Video (YouTube)</option>
                <option value="pdf">📄 Documento PDF</option>
                <option value="enlace">🔗 Enlace Externo</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Categoría</label>
              <input
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ej: Karate WKF, Torneos, Complejos"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Orden</label>
              <input
                type="number"
                value={form.orden}
                onChange={e => setForm({ ...form, orden: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              URL del recurso (YouTube, ruta interna como /guia_torneo_karate/index.html o archivo subido) *
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                required
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://youtu.be/... o /guia_torneo_karate/index.html"
                style={{ flex: 1, minWidth: 260, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1',
                background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: 13,
                cursor: uploading ? 'wait' : 'pointer',
              }}>
                <Upload size={15} /> {uploading ? 'Subiendo...' : 'Subir PDF/HTML'}
                <input type="file" accept=".pdf,.html,.htm,.doc,.docx" onChange={handleUploadFile} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Descripción</label>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Breve resumen de qué encontrará el usuario en este material..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm({ ...form, activo: e.target.checked })}
              />
              Visible en la pantalla principal
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                <Check size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Guía'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabla de guías */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando materiales...</div>
      ) : guias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 16 }}>
          No hay guías cargadas todavía. Hacé clic en <strong>Nueva Guía / Video</strong> para agregar la primera.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 10px' }}>Orden</th>
                <th style={{ padding: '12px 10px' }}>Título y Descripción</th>
                <th style={{ padding: '12px 10px' }}>Tipo</th>
                <th style={{ padding: '12px 10px' }}>Categoría</th>
                <th style={{ padding: '12px 10px' }}>Estado</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {guias.map((g) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 10px', fontWeight: 800, color: '#64748b' }}>#{g.orden}</td>
                  <td style={{ padding: '14px 10px', maxWidth: 380 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{g.titulo}</div>
                    {g.descripcion && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{g.descripcion}</div>
                    )}
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, textDecoration: 'none' }}
                    >
                      <ExternalLink size={11} /> {g.url}
                    </a>
                  </td>
                  <td style={{ padding: '14px 10px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                      background: g.tipo === 'video' ? '#fef2f2' : g.tipo === 'pdf' ? '#eff6ff' : '#f0fdf4',
                      color: g.tipo === 'video' ? '#dc2626' : g.tipo === 'pdf' ? '#2563eb' : '#15803d',
                    }}>
                      {g.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '14px 10px', fontWeight: 600, color: '#334155' }}>{g.categoria}</td>
                  <td style={{ padding: '14px 10px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                      background: g.activo ? '#dcfce7' : '#f1f5f9',
                      color: g.activo ? '#166534' : '#64748b',
                    }}>
                      {g.activo ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => toggleActivo(g)}
                      title={g.activo ? 'Ocultar de la pantalla principal' : 'Mostrar en la pantalla principal'}
                      style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: g.activo ? '#16a34a' : '#94a3b8', cursor: 'pointer', marginRight: 6 }}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      title="Editar"
                      style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#2563eb', cursor: 'pointer', marginRight: 6 }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      title="Eliminar"
                      style={{ padding: 8, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
