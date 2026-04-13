// GestionMejoras.jsx
// Módulo de gestión de mejoras del sistema — solicitud, seguimiento e implementación

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./GestionMejoras.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;
const tkn = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn()}`, ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const fmtDate = s => s
  ? new Date(s).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  return { toast, show };
}

// ── Configuración de estados ──────────────────
const ESTADOS = {
  pendiente:    { label: "Pendiente",    color: "#f59e0b", bg: "#fffbeb", icon: "🕐", next: ["en_analisis", "diferida", "rechazada"] },
  en_analisis:  { label: "En Análisis",  color: "#2563eb", bg: "#eff6ff", icon: "🔍", next: ["implementada", "diferida", "rechazada"] },
  implementada: { label: "Implementada", color: "#10b981", bg: "#f0fdf4", icon: "✅", next: [] },
  rechazada:    { label: "Rechazada",    color: "#ef4444", bg: "#fef2f2", icon: "❌", next: [] },
  diferida:     { label: "Diferida",     color: "#6366f1", bg: "#f5f3ff", icon: "⏸️",  next: ["pendiente", "en_analisis"] },
};

const PRIORIDADES = {
  baja:    { label: "Baja",    color: "#10b981", icon: "🟢" },
  media:   { label: "Media",   color: "#f59e0b", icon: "🟡" },
  alta:    { label: "Alta",    color: "#f97316", icon: "🟠" },
  critica: { label: "Crítica", color: "#ef4444", icon: "🔴" },
};

const MODULOS = [
  "General", "Dashboard", "Control de Stock", "Ventas / Turnos",
  "Conciliación Tarjetas", "Proyección de Stock", "Caja y Finanzas",
  "Personal / Playeros", "Recepciones", "Pedidos", "Administración", "Otro",
];

function Modal({ title, wide, onClose, children }) {
  return (
    <div className="mejoras-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mejoras-modal ${wide ? "mejoras-modal-wide" : ""}`}>
        <div className="mejoras-modal-header">
          <h3>{title}</h3>
          <button className="mejoras-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mejoras-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Formulario de nueva solicitud ─────────────
function FormSolicitud({ onSave, onClose, editData }) {
  const [form, setForm] = useState({
    titulo: "", modulo_afectado: "General",
    funcionamiento_actual: "", mejora_sugerida: "", prioridad: "media",
    ...editData,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = !!editData?.id;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mejoras-form">
      <div className="mejoras-form-group">
        <label>Título de la mejora *</label>
        <input required id="inp-titulo-mejora" placeholder="Ej: Agregar filtro de fechas en el historial de ventas"
          value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
      </div>
      <div className="mejoras-form-row">
        <div className="mejoras-form-group">
          <label>Módulo afectado</label>
          <select value={form.modulo_afectado} onChange={e => setForm({ ...form, modulo_afectado: e.target.value })}>
            {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="mejoras-form-group">
          <label>Prioridad</label>
          <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
            {Object.entries(PRIORIDADES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mejoras-form-group">
        <label>¿Cómo funciona actualmente?</label>
        <textarea rows={3} placeholder="Describir el comportamiento actual del sistema que se quiere mejorar..."
          value={form.funcionamiento_actual}
          onChange={e => setForm({ ...form, funcionamiento_actual: e.target.value })} />
      </div>
      <div className="mejoras-form-group">
        <label>Mejora sugerida *</label>
        <textarea required rows={4}
          placeholder="Describir detalladamente qué se desea que haga el sistema. Cuanto más detalle, mejor podrá implementarse."
          value={form.mejora_sugerida}
          onChange={e => setForm({ ...form, mejora_sugerida: e.target.value })} />
        <span className="mejoras-hint">💡 Incluya ejemplos, casos de uso, y cualquier detalle operativo relevante</span>
      </div>
      {err && <div className="mejoras-error">⚠️ {err}</div>}
      <div className="mejoras-form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-enviar-mejora">
          {loading ? "Enviando..." : isEdit ? "💾 Guardar cambios" : "🚀 Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

// ── Modal de detalle / trazabilidad ──────────
function DetalleModal({ mejora, user, onClose, onRefresh }) {
  const { show: showToast } = useToast();
  const [comentario, setComentario] = useState("");
  const [loadingComentario, setLoadingComentario] = useState(false);

  // Admin: implementar
  const [formImpl, setFormImpl] = useState({ descripcion_implementacion: "", version_implementacion: "", comentarios: "" });
  const [loadingImpl, setLoadingImpl] = useState(false);
  const [showImpl, setShowImpl] = useState(false);

  // Admin: rechazar
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState(false);
  const [loadingRechazo, setLoadingRechazo] = useState(false);

  const est = ESTADOS[mejora.estado] || ESTADOS.pendiente;
  const prio = PRIORIDADES[mejora.prioridad] || PRIORIDADES.media;
  const isAdmin = user.rol === "admin";
  const isManager = user.rol === "admin" || user.rol === "manager";

  const handleComentario = async () => {
    if (!comentario.trim()) return;
    setLoadingComentario(true);
    try {
      await apiFetch(`/api/mejoras/${mejora.id}/comentario`, { method: "POST", body: JSON.stringify({ comentario }) });
      setComentario("");
      onRefresh();
    } catch (e) { showToast(e.message, "error"); } finally { setLoadingComentario(false); }
  };

  const handleEstado = async (estado) => {
    try {
      await apiFetch(`/api/mejoras/${mejora.id}/estado?estado=${estado}`, { method: "PUT" });
      onRefresh();
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleImplementar = async () => {
    if (!formImpl.descripcion_implementacion.trim()) return;
    setLoadingImpl(true);
    try {
      await apiFetch(`/api/mejoras/${mejora.id}/implementar`, { method: "PUT", body: JSON.stringify(formImpl) });
      setShowImpl(false);
      onRefresh();
    } catch (e) { showToast(e.message, "error"); } finally { setLoadingImpl(false); }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) return;
    setLoadingRechazo(true);
    try {
      await apiFetch(`/api/mejoras/${mejora.id}/rechazar`, { method: "PUT", body: JSON.stringify({ motivo_rechazo: motivoRechazo }) });
      setShowRechazo(false);
      onRefresh();
    } catch (e) { showToast(e.message, "error"); } finally { setLoadingRechazo(false); }
  };

  return (
    <div className="mejora-detalle">
      {/* Header */}
      <div className="detalle-head">
        <div className="detalle-badges">
          <span className="estado-badge" style={{ background: est.bg, color: est.color }}>
            {est.icon} {est.label}
          </span>
          <span className="prio-badge" style={{ color: prio.color }}>
            {prio.icon} {prio.label}
          </span>
          {mejora.modulo_afectado && <span className="modulo-badge">📂 {mejora.modulo_afectado}</span>}
        </div>
        <h2 className="detalle-titulo">{mejora.titulo}</h2>

        {/* Trazabilidad de solicitud */}
        <div className="detalle-meta">
          <span>📅 Solicitado: <strong>{fmtDate(mejora.fecha_solicitud)}</strong></span>
          <span>👤 Por: <strong>{mejora.solicitante?.nombre_completo || `#${mejora.solicitado_por}`}</strong></span>
          <span>🆔 #{mejora.id}</span>
        </div>
      </div>

      {/* Contenido */}
      <div className="detalle-secciones">
        {mejora.funcionamiento_actual && (
          <div className="detalle-seccion">
            <div className="detalle-seccion-titulo">⚙️ Funcionamiento actual</div>
            <div className="detalle-seccion-body">{mejora.funcionamiento_actual}</div>
          </div>
        )}
        <div className="detalle-seccion">
          <div className="detalle-seccion-titulo">💡 Mejora sugerida</div>
          <div className="detalle-seccion-body mejora-highlight">{mejora.mejora_sugerida}</div>
        </div>

        {/* Implementación */}
        {mejora.estado === "implementada" && (
          <div className="detalle-seccion detalle-implementada">
            <div className="detalle-seccion-titulo">✅ Implementación</div>
            <div className="detalle-impl-meta">
              <span>📅 {fmtDate(mejora.fecha_implementacion)}</span>
              <span>👤 {mejora.implementador?.nombre_completo || "Sistema"}</span>
              {mejora.version_implementacion && <span>🏷️ v{mejora.version_implementacion}</span>}
            </div>
            <div className="detalle-seccion-body">{mejora.descripcion_implementacion}</div>
          </div>
        )}

        {/* Rechazo */}
        {mejora.estado === "rechazada" && (
          <div className="detalle-seccion detalle-rechazada">
            <div className="detalle-seccion-titulo">❌ Motivo de rechazo</div>
            <div className="detalle-impl-meta">
              <span>📅 {fmtDate(mejora.fecha_implementacion)}</span>
              <span>👤 {mejora.implementador?.nombre_completo || "Admin"}</span>
            </div>
            <div className="detalle-seccion-body">{mejora.motivo_rechazo}</div>
          </div>
        )}

        {/* Comentarios */}
        {mejora.comentarios && (
          <div className="detalle-seccion">
            <div className="detalle-seccion-titulo">💬 Historial de comentarios</div>
            <div className="comentarios-log">
              {mejora.comentarios.split("\n").filter(Boolean).map((c, i) => (
                <div key={i} className="comentario-line">{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="detalle-acciones">
        {/* Cambiar estado — manager/admin */}
        {isManager && est.next.length > 0 && !showImpl && !showRechazo && (
          <div className="acciones-estado">
            {est.next.filter(e => e !== "implementada" && e !== "rechazada").map(e => {
              const ei = ESTADOS[e];
              return (
                <button key={e} className="btn btn-outline" style={{ borderColor: ei.color, color: ei.color }}
                  onClick={() => handleEstado(e)}>
                  {ei.icon} Pasar a {ei.label}
                </button>
              );
            })}
            {isAdmin && est.next.includes("implementada") && (
              <button className="btn btn-success" onClick={() => setShowImpl(true)} id="btn-implementar-mejora">
                ✅ Marcar como implementada
              </button>
            )}
            {isAdmin && est.next.includes("rechazada") && (
              <button className="btn btn-danger" onClick={() => setShowRechazo(true)}>
                ❌ Rechazar
              </button>
            )}
          </div>
        )}

        {/* Formulario de implementación */}
        {showImpl && (
          <div className="form-impl">
            <h4>📝 Descripción de la implementación</h4>
            <div className="mejoras-form-group">
              <label>¿Qué se cambió exactamente? *</label>
              <textarea required rows={4} id="inp-desc-implementacion"
                placeholder="Describir los cambios realizados: componentes modificados, nuevas funcionalidades, lógica de negocio agregada..."
                value={formImpl.descripcion_implementacion}
                onChange={e => setFormImpl({ ...formImpl, descripcion_implementacion: e.target.value })} />
            </div>
            <div className="mejoras-form-row">
              <div className="mejoras-form-group">
                <label>Versión / Commit</label>
                <input placeholder="Ej: v2.4.1 / abc1234"
                  value={formImpl.version_implementacion}
                  onChange={e => setFormImpl({ ...formImpl, version_implementacion: e.target.value })} />
              </div>
              <div className="mejoras-form-group">
                <label>Comentario adicional</label>
                <input placeholder="Nota para el solicitante..."
                  value={formImpl.comentarios}
                  onChange={e => setFormImpl({ ...formImpl, comentarios: e.target.value })} />
              </div>
            </div>
            <div className="mejoras-form-actions">
              <button className="btn btn-secondary" onClick={() => setShowImpl(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={handleImplementar} disabled={loadingImpl || !formImpl.descripcion_implementacion.trim()}>
                {loadingImpl ? "Guardando..." : "✅ Confirmar implementación"}
              </button>
            </div>
          </div>
        )}

        {/* Formulario de rechazo */}
        {showRechazo && (
          <div className="form-impl form-impl-danger">
            <h4>❌ Motivo de rechazo</h4>
            <div className="mejoras-form-group">
              <label>Explicar motivo *</label>
              <textarea required rows={3} id="inp-motivo-rechazo"
                placeholder="Explicar por qué no se implementará esta solicitud..."
                value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} />
            </div>
            <div className="mejoras-form-actions">
              <button className="btn btn-secondary" onClick={() => setShowRechazo(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleRechazar} disabled={loadingRechazo || !motivoRechazo.trim()}>
                {loadingRechazo ? "..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        )}

        {/* Agregar comentario — todos */}
        {mejora.estado !== "implementada" && mejora.estado !== "rechazada" && (
          <div className="comentario-form">
            <textarea rows={2} value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Agregar comentario o información adicional..." />
            <button className="btn btn-outline" onClick={handleComentario} disabled={loadingComentario || !comentario.trim()}>
              {loadingComentario ? "..." : "💬 Comentar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta individual ────────────────────────
function MejoraCard({ mejora, user, onClick }) {
  const est = ESTADOS[mejora.estado] || ESTADOS.pendiente;
  const prio = PRIORIDADES[mejora.prioridad] || PRIORIDADES.media;
  const esMia = mejora.solicitado_por === user.id;

  return (
    <div className={`mejora-card mejora-card-${mejora.estado}`} onClick={onClick} id={`mejora-${mejora.id}`}>
      <div className="mejora-card-header">
        <div className="mejora-card-badges">
          <span className="estado-badge" style={{ background: est.bg, color: est.color }}>
            {est.icon} {est.label}
          </span>
          <span className="prio-badge" style={{ color: prio.color }} title={`Prioridad ${prio.label}`}>
            {prio.icon}
          </span>
          {esMia && <span className="mia-badge">📍 Mía</span>}
        </div>
        <span className="mejora-id">#{mejora.id}</span>
      </div>

      <div className="mejora-card-titulo">{mejora.titulo}</div>

      {mejora.modulo_afectado && (
        <div className="mejora-card-modulo">📂 {mejora.modulo_afectado}</div>
      )}

      <div className="mejora-card-preview">{mejora.mejora_sugerida.substring(0, 120)}{mejora.mejora_sugerida.length > 120 ? "..." : ""}</div>

      <div className="mejora-card-footer">
        <span>👤 {mejora.solicitante?.nombre_completo?.split(" ")[0] || `#${mejora.solicitado_por}`}</span>
        <span>📅 {fmtDate(mejora.fecha_solicitud).split(",")[0]}</span>
        {mejora.fecha_implementacion && (
          <span style={{ color: "#10b981" }}>✅ {fmtDate(mejora.fecha_implementacion).split(",")[0]}</span>
        )}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────
export default function GestionMejoras({ user }) {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mejoras, setMejoras] = useState([]);
  const [stats, setStats] = useState({});
  const [vistaActiva, setVistaActiva] = useState("todas");  // todas | kanban | mias
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalNueva, setModalNueva] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const refreshDetalle = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mj, st] = await Promise.all([
        apiFetch("/api/mejoras/?limit=500"),
        apiFetch("/api/mejoras/estadisticas"),
      ]);
      setMejoras(mj);
      setStats(st);
    } catch (e) { showToast("Error cargando mejoras: " + e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  // Cuando recarga, también actualiza el detalle abierto
  const loadAndRefreshDetalle = useCallback(async () => {
    await load();
    if (detalle) {
      try {
        const updated = await apiFetch(`/api/mejoras/${detalle.id}`);
        setDetalle(updated);
      } catch { /* fallback: cerrar detalle */ }
    }
  }, [load, detalle]);

  useEffect(() => { load(); }, [load]);

  const handleNueva = async (data) => {
    await apiFetch("/api/mejoras/", { method: "POST", body: JSON.stringify(data) });
    showToast("✅ ¡Solicitud enviada! Recibirá una notificación cuando sea procesada.");
    load();
  };

  const handleEditar = async (data) => {
    await apiFetch(`/api/mejoras/${editando.id}/editar`, { method: "PUT", body: JSON.stringify(data) });
    showToast("Solicitud actualizada");
    load();
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar esta solicitud?")) return;
    await apiFetch(`/api/mejoras/${id}`, { method: "DELETE" });
    showToast("Solicitud eliminada");
    setDetalle(null);
    load();
  };

  // Filtrado
  let filtradas = mejoras.filter(m => {
    if (vistaActiva === "mias" && m.solicitado_por !== user.id) return false;
    if (filtroEstado && m.estado !== filtroEstado) return false;
    if (filtroPrioridad && m.prioridad !== filtroPrioridad) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return m.titulo?.toLowerCase().includes(q) ||
             m.mejora_sugerida?.toLowerCase().includes(q) ||
             m.modulo_afectado?.toLowerCase().includes(q);
    }
    return true;
  });

  // Kanban: agrupar por estado
  const kanbanEstados = ["pendiente", "en_analisis", "diferida", "implementada", "rechazada"];

  if (loading) return <div className="module-loading"><div className="dash-spinner" /><p>Cargando mejoras...</p></div>;

  return (
    <div className="mejoras-module">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {/* Modal Nueva/Editar */}
      {(modalNueva || editando) && (
        <Modal title={editando ? "Editar solicitud" : "✨ Nueva solicitud de mejora"} onClose={() => { setModalNueva(false); setEditando(null); }}>
          <FormSolicitud
            editData={editando}
            onSave={editando ? handleEditar : handleNueva}
            onClose={() => { setModalNueva(false); setEditando(null); }} />
        </Modal>
      )}

      {/* Modal Detalle */}
      {detalle && (
        <Modal title="Detalle de solicitud" wide onClose={() => setDetalle(null)}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            {(detalle.solicitado_por === user.id || user.rol === "admin") &&
              detalle.estado === "pendiente" && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(detalle); setDetalle(null); }}>
                  ✏️ Editar
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(detalle.id)}>
                  🗑️ Eliminar
                </button>
              </>
            )}
          </div>
          <DetalleModal mejora={detalle} user={user}
            onClose={() => setDetalle(null)}
            onRefresh={loadAndRefreshDetalle} />
        </Modal>
      )}

      {/* Header */}
      <div className="mejoras-header">
        <div>
          <h2>✨ Mejoras del Sistema</h2>
          <p>Sugerencias de usuarios · Estado de implementación · Trazabilidad completa</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNueva(true)} id="btn-nueva-mejora">
          + Solicitar mejora
        </button>
      </div>

      {/* KPIs */}
      <div className="mejoras-kpis">
        {Object.entries(ESTADOS).map(([k, est]) => (
          <div key={k} className="mejora-kpi" style={{ borderLeftColor: est.color }}
            onClick={() => setFiltroEstado(filtroEstado === k ? "" : k)}>
            <strong style={{ color: est.color }}>{stats.por_estado?.[k] || 0}</strong>
            <span>{est.icon} {est.label}</span>
          </div>
        ))}
        <div className="mejora-kpi mejora-kpi-mia" style={{ borderLeftColor: "#7c3aed" }}>
          <strong style={{ color: "#7c3aed" }}>{stats.mis_solicitudes || 0}</strong>
          <span>📍 Mis solicitudes</span>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="mejoras-toolbar">
        <div className="mejoras-vistas">
          {[["todas","📋 Todas"], ["mias","📍 Mis solicitudes"], ["kanban","🗂️ Kanban"]].map(([v, l]) => (
            <button key={v} className={`vista-btn ${vistaActiva === v ? "active" : ""}`}
              onClick={() => setVistaActiva(v)} id={`vista-mejoras-${v}`}>{l}</button>
          ))}
        </div>
        <div className="mejoras-filtros">
          <input placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
            <option value="">Toda prioridad</option>
            {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {/* VISTA: Lista / Mis solicitudes */}
      {(vistaActiva === "todas" || vistaActiva === "mias") && (
        <div className="mejoras-grid">
          {filtradas.map(m => (
            <MejoraCard key={m.id} mejora={m} user={user}
              onClick={async () => {
                const det = await apiFetch(`/api/mejoras/${m.id}`);
                setDetalle(det);
              }} />
          ))}
          {filtradas.length === 0 && (
            <div className="mejoras-empty">
              <div style={{ fontSize: "3rem" }}>💡</div>
              <p>No hay solicitudes que coincidan con los filtros.</p>
              <button className="btn btn-primary" onClick={() => setModalNueva(true)}>
                + Crear la primera solicitud
              </button>
            </div>
          )}
        </div>
      )}

      {/* VISTA: Kanban */}
      {vistaActiva === "kanban" && (
        <div className="mejoras-kanban">
          {kanbanEstados.map(estado => {
            const est = ESTADOS[estado];
            const cols = filtradas.filter(m => m.estado === estado);
            return (
              <div key={estado} className="kanban-col">
                <div className="kanban-col-header" style={{ borderTopColor: est.color }}>
                  <span>{est.icon} {est.label}</span>
                  <span className="kanban-count">{cols.length}</span>
                </div>
                <div className="kanban-cards">
                  {cols.map(m => (
                    <MejoraCard key={m.id} mejora={m} user={user}
                      onClick={async () => {
                        const det = await apiFetch(`/api/mejoras/${m.id}`);
                        setDetalle(det);
                      }} />
                  ))}
                  {cols.length === 0 && <div className="kanban-empty">Sin solicitudes</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
