// ConfigSurtidor.jsx
// Módulo de administración: Tanques, Tipos de Combustible, Islas, Picos, Turnos
// Todo completamente dinámico: alta, baja y modificación

import React, { useState, useEffect, useCallback } from "react";
import "./ConfigSurtidor.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;
const tkn = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tkn()}`,
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ──────────────────────────────────────────────
// MODAL GENÉRICO
// ──────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// SECTION WRAPPER
// ──────────────────────────────────────────────
function Section({ icon, title, onAdd, addLabel = "Agregar", children }) {
  return (
    <div className="config-section">
      <div className="config-section-header">
        <h3>{icon} {title}</h3>
        <button className="btn btn-primary btn-sm" onClick={onAdd} id={`btn-add-${title.toLowerCase().replace(/\s/g, "-")}`}>
          + {addLabel}
        </button>
      </div>
      <div className="config-section-body">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────
// TIPOS DE COMBUSTIBLE
// ──────────────────────────────────────────────
const COLOR_PRESETS = [
  "#F44336", "#FF9800", "#795548", "#607D8B", "#4CAF50",
  "#2196F3", "#9C27B0", "#E91E63", "#00BCD4", "#FFEB3B"
];

function TipoForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "", descripcion: "", color_hex: "#4CAF50", unidad: "litros",
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await onSave(form);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nombre del Combustible *</label>
          <input id="tc-nombre" required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Nafta Super, Diesel, Alcohol..." />
        </div>
        <div className="form-group">
          <label className="form-label">Unidad</label>
          <select id="tc-unidad" value={form.unidad}
            onChange={e => setForm({ ...form, unidad: e.target.value })}>
            <option value="litros">Litros</option>
            <option value="m3">m³ (metros cúbicos)</option>
            <option value="galones">Galones</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <input value={form.descripcion || ""}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Descripción opcional" />
      </div>
      <div className="form-group">
        <label className="form-label">Color de identificación</label>
        <div className="color-picker">
          {COLOR_PRESETS.map(c => (
            <button type="button" key={c}
              className={`color-swatch ${form.color_hex === c ? "selected" : ""}`}
              style={{ background: c }}
              onClick={() => setForm({ ...form, color_hex: c })}
            />
          ))}
          <input type="color" value={form.color_hex}
            onChange={e => setForm({ ...form, color_hex: e.target.value })}
            className="color-input-custom" title="Color personalizado" />
        </div>
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-submit-tipo">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// TANQUES
// ──────────────────────────────────────────────
function TanqueForm({ initial, tipos, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "", numero: "", tipo_combustible_id: tipos[0]?.id || "",
    capacidad_litros: "", stock_minimo_litros: 5000, ubicacion: "",
    stock_actual_litros: 0,
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await onSave({
        ...form,
        numero: Number(form.numero),
        tipo_combustible_id: Number(form.tipo_combustible_id),
        capacidad_litros: Number(form.capacidad_litros),
        stock_minimo_litros: Number(form.stock_minimo_litros),
        stock_actual_litros: Number(form.stock_actual_litros),
      });
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° de Tanque *</label>
          <input id="t-numero" type="number" required min="1" value={form.numero}
            onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ej: 1" />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre / Identificador *</label>
          <input id="t-nombre" required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Tanque 1 - Nafta Super" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tipo de Combustible *</label>
          <select id="t-tipo" required value={form.tipo_combustible_id}
            onChange={e => setForm({ ...form, tipo_combustible_id: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Capacidad (litros) *</label>
          <input id="t-capacidad" type="number" required min="1" step="0.01" value={form.capacidad_litros}
            onChange={e => setForm({ ...form, capacidad_litros: e.target.value })} placeholder="Ej: 50000" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Stock Mínimo (litros)</label>
          <input id="t-minimo" type="number" min="0" step="0.01" value={form.stock_minimo_litros}
            onChange={e => setForm({ ...form, stock_minimo_litros: e.target.value })} />
        </div>
        {!initial?.id && (
          <div className="form-group">
            <label className="form-label">Stock Inicial (litros)</label>
            <input type="number" min="0" step="0.01" value={form.stock_actual_litros}
              onChange={e => setForm({ ...form, stock_actual_litros: e.target.value })} />
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Ubicación / Descripción</label>
        <input value={form.ubicacion || ""}
          onChange={e => setForm({ ...form, ubicacion: e.target.value })}
          placeholder="Ej: Sector Norte, Fosa 1" />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// TURNOS CONFIG
// ──────────────────────────────────────────────
function TurnoConfigForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "", hora_inicio: "06:00", duracion_horas: 8, orden: 1, color_hex: "#2196F3",
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const TURNO_COLORS = ["#FFC107", "#2196F3", "#673AB7", "#F44336", "#4CAF50"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, duracion_horas: Number(form.duracion_horas), orden: Number(form.orden) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nombre del Turno *</label>
          <input required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Mañana, Tarde, Noche" />
        </div>
        <div className="form-group">
          <label className="form-label">Hora de Inicio *</label>
          <input type="time" required value={form.hora_inicio}
            onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duración (horas)</label>
          <input type="number" min="1" max="24" value={form.duracion_horas}
            onChange={e => setForm({ ...form, duracion_horas: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Orden de visualización</label>
          <input type="number" min="1" value={form.orden}
            onChange={e => setForm({ ...form, orden: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="color-picker">
          {TURNO_COLORS.map(c => (
            <button type="button" key={c}
              className={`color-swatch ${form.color_hex === c ? "selected" : ""}`}
              style={{ background: c }} onClick={() => setForm({ ...form, color_hex: c })} />
          ))}
        </div>
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// ISLAS Y PICOS
// ──────────────────────────────────────────────
function IslaForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ nombre: "", numero: "", descripcion: "", ...initial });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, numero: Number(form.numero) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° de Isla *</label>
          <input type="number" required min="1" value={form.numero}
            onChange={e => setForm({ ...form, numero: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Isla 1, Isla Norte" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <input value={form.descripcion || ""} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
      </div>
    </form>
  );
}

function PicoForm({ initial, islas, tipos, onSave, onClose }) {
  const [form, setForm] = useState({
    numero: "", isla_id: islas[0]?.id || "", tipo_combustible_id: tipos[0]?.id || "",
    ...initial
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({
        ...form,
        numero: Number(form.numero),
        isla_id: Number(form.isla_id),
        tipo_combustible_id: Number(form.tipo_combustible_id)
      });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Isla *</label>
          <select required value={form.isla_id} onChange={e => setForm({ ...form, isla_id: e.target.value })}>
            {islas.map(i => <option key={i.id} value={i.id}>Isla {i.numero} - {i.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">N° de Pico *</label>
          <input type="number" required min="1" value={form.numero}
            onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="1, 2, 3..." />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Tipo de Combustible *</label>
        <select required value={form.tipo_combustible_id}
          onChange={e => setForm({ ...form, tipo_combustible_id: e.target.value })}>
          {tipos.map(t => <option key={t.id} value={t.id} style={{ color: t.color_hex }}>{t.nombre}</option>)}
        </select>
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────
export default function ConfigSurtidor() {
  const [activeTab, setActiveTab] = useState("combustibles");
  const [tipos, setTipos] = useState([]);
  const [tanques, setTanques] = useState([]);
  const [islas, setIslas] = useState([]);
  const [picos, setPicos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [modal, setModal] = useState(null);  // { type, data? }
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [t, ta, i, p, tu] = await Promise.all([
        apiFetch("/api/surtidor/tipos-combustible"),
        apiFetch("/api/surtidor/tanques"),
        apiFetch("/api/surtidor/islas"),
        apiFetch("/api/surtidor/picos"),
        apiFetch("/api/surtidor/turnos-config"),
      ]);
      setTipos(t); setTanques(ta); setIslas(i); setPicos(p); setTurnos(tu);
    } catch (e) {
      showToast("Error cargando configuración: " + e.message, "error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD handlers ──

  const saveTipo = async (form) => {
    if (form.id) {
      await apiFetch(`/api/surtidor/tipos-combustible/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
      showToast("Tipo de combustible actualizado");
    } else {
      await apiFetch("/api/surtidor/tipos-combustible", { method: "POST", body: JSON.stringify(form) });
      showToast("Tipo de combustible creado");
    }
    load();
  };

  const deleteTipo = async (id) => {
    await apiFetch(`/api/surtidor/tipos-combustible/${id}`, { method: "DELETE" });
    showToast("Tipo de combustible eliminado");
    load();
  };

  const saveTanque = async (form) => {
    if (form.id) {
      await apiFetch(`/api/surtidor/tanques/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
      showToast("Tanque actualizado");
    } else {
      await apiFetch("/api/surtidor/tanques", { method: "POST", body: JSON.stringify(form) });
      showToast("Tanque creado");
    }
    load();
  };

  const deleteTanque = async (id) => {
    await apiFetch(`/api/surtidor/tanques/${id}`, { method: "DELETE" });
    showToast("Tanque eliminado");
    load();
  };

  const saveIsla = async (form) => {
    if (form.id) {
      await apiFetch(`/api/surtidor/islas/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await apiFetch("/api/surtidor/islas", { method: "POST", body: JSON.stringify(form) });
    }
    showToast("Isla guardada"); load();
  };

  const deleteIsla = async (id) => {
    await apiFetch(`/api/surtidor/islas/${id}`, { method: "DELETE" });
    showToast("Isla eliminada"); load();
  };

  const savePico = async (form) => {
    if (form.id) {
      await apiFetch(`/api/surtidor/picos/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await apiFetch("/api/surtidor/picos", { method: "POST", body: JSON.stringify(form) });
    }
    showToast("Pico guardado"); load();
  };

  const deletePico = async (id) => {
    await apiFetch(`/api/surtidor/picos/${id}`, { method: "DELETE" });
    showToast("Pico eliminado"); load();
  };

  const saveTurno = async (form) => {
    if (form.id) {
      await apiFetch(`/api/surtidor/turnos-config/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await apiFetch("/api/surtidor/turnos-config", { method: "POST", body: JSON.stringify(form) });
    }
    showToast("Turno guardado"); load();
  };

  const deleteTurno = async (id) => {
    await apiFetch(`/api/surtidor/turnos-config/${id}`, { method: "DELETE" });
    showToast("Turno eliminado"); load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await confirmDelete.fn();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const TABS = [
    { id: "combustibles", label: "⛽ Combustibles" },
    { id: "tanques", label: "🛢️ Tanques" },
    { id: "islas", label: "🏝️ Islas" },
    { id: "picos", label: "🔩 Picos" },
    { id: "turnos", label: "🕐 Turnos" },
  ];

  return (
    <div className="config-surtidor">
      <div className="config-header">
        <h2>⚙️ Configuración del Surtidor</h2>
        <p>Gestione tanques, islas, picos y turnos de manera dinámica</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="confirm-box">
            <h4>⚠️ Confirmar eliminación</h4>
            <p>¿Está seguro que desea eliminar <strong>{confirmDelete.label}</strong>?</p>
            <p className="confirm-warn">Esta acción no se puede deshacer.</p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal?.type === "tipo" && (
        <Modal title={modal.data ? "Editar Tipo de Combustible" : "Nuevo Tipo de Combustible"} onClose={() => setModal(null)}>
          <TipoForm initial={modal.data} onSave={saveTipo} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "tanque" && (
        <Modal title={modal.data ? "Editar Tanque" : "Nuevo Tanque"} onClose={() => setModal(null)}>
          <TanqueForm initial={modal.data} tipos={tipos} onSave={saveTanque} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "isla" && (
        <Modal title={modal.data ? "Editar Isla" : "Nueva Isla"} onClose={() => setModal(null)}>
          <IslaForm initial={modal.data} onSave={saveIsla} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "pico" && (
        <Modal title={modal.data ? "Editar Pico" : "Nuevo Pico Expendedor"} onClose={() => setModal(null)}>
          <PicoForm initial={modal.data} islas={islas} tipos={tipos} onSave={savePico} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "turno" && (
        <Modal title={modal.data ? "Editar Turno" : "Nuevo Turno"} onClose={() => setModal(null)}>
          <TurnoConfigForm initial={modal.data} onSave={saveTurno} onClose={() => setModal(null)} />
        </Modal>
      )}

      {/* Tabs */}
      <div className="config-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`config-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)} id={`tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Combustibles */}
      {activeTab === "combustibles" && (
        <Section icon="⛽" title="Tipos de Combustible" addLabel="Nuevo Combustible"
          onAdd={() => setModal({ type: "tipo" })}>
          <div className="cards-grid">
            {tipos.map(t => (
              <div key={t.id} className="item-card">
                <div className="item-card-color" style={{ background: t.color_hex }} />
                <div className="item-card-body">
                  <div className="item-card-title">{t.nombre}</div>
                  <div className="item-card-sub">{t.descripcion || `Unidad: ${t.unidad}`}</div>
                </div>
                <div className="item-card-actions">
                  <button className="btn btn-icon" title="Editar" onClick={() => setModal({ type: "tipo", data: t })}>✏️</button>
                  <button className="btn btn-icon danger" title="Eliminar"
                    onClick={() => setConfirmDelete({ label: t.nombre, fn: () => deleteTipo(t.id) })}>🗑️</button>
                </div>
              </div>
            ))}
            {tipos.length === 0 && <div className="empty-state">No hay tipos de combustible. Agregue el primero.</div>}
          </div>
        </Section>
      )}

      {/* TAB: Tanques */}
      {activeTab === "tanques" && (
        <Section icon="🛢️" title="Tanques" addLabel="Nuevo Tanque"
          onAdd={() => setModal({ type: "tanque" })}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nombre</th>
                  <th>Combustible</th>
                  <th>Capacidad</th>
                  <th>Stock Mínimo</th>
                  <th>Stock Actual</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tanques.map(t => {
                  const pct = t.capacidad_litros > 0 ? (t.stock_actual_litros / t.capacidad_litros * 100) : 0;
                  const estado = t.stock_actual_litros <= t.stock_minimo_litros * 0.5 ? "critico"
                    : t.stock_actual_litros <= t.stock_minimo_litros ? "bajo" : "ok";
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.numero}</strong></td>
                      <td>{t.nombre}</td>
                      <td>
                        <span className="fuel-chip" style={{ background: (t.tipo_combustible?.color_hex || "#888") + "22", color: t.tipo_combustible?.color_hex || "#888" }}>
                          {t.tipo_combustible?.nombre || "—"}
                        </span>
                      </td>
                      <td>{Number(t.capacidad_litros).toLocaleString("es-PY")} L</td>
                      <td>{Number(t.stock_minimo_litros).toLocaleString("es-PY")} L</td>
                      <td>
                        <div className="stock-cell">
                          <span>{Number(t.stock_actual_litros).toLocaleString("es-PY")} L</span>
                          <div className="mini-bar">
                            <div className="mini-bar-fill"
                              style={{ width: `${Math.min(pct, 100)}%`, background: estado === "critico" ? "#ef4444" : estado === "bajo" ? "#f59e0b" : "#10b981" }} />
                          </div>
                          <span className="pct-label">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-chip status-${estado}`}>
                          {estado === "critico" ? "🔴 Crítico" : estado === "bajo" ? "🟡 Bajo" : "🟢 OK"}
                        </span>
                      </td>
                      <td>{t.ubicacion || "—"}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn action-btn-edit" title="Editar"
                            onClick={() => setModal({ type: "tanque", data: t })}>✏️</button>
                          <button className="action-btn action-btn-delete" title="Eliminar"
                            onClick={() => setConfirmDelete({ label: t.nombre, fn: () => deleteTanque(t.id) })}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tanques.length === 0 && (
                  <tr><td colSpan="9" className="empty-state">No hay tanques. Cree el primero haciendo clic en "+ Nuevo Tanque"</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* TAB: Islas */}
      {activeTab === "islas" && (
        <Section icon="🏝️" title="Islas" addLabel="Nueva Isla"
          onAdd={() => setModal({ type: "isla" })}>
          <div className="cards-grid">
            {islas.map(isla => (
              <div key={isla.id} className="item-card isla-card">
                <div className="isla-number">#{isla.numero}</div>
                <div className="item-card-body">
                  <div className="item-card-title">{isla.nombre}</div>
                  <div className="item-card-sub item-card-picos">
                    {picos.filter(p => p.isla_id === isla.id).map(p => (
                      <span key={p.id} className="pico-chip" style={{ background: (p.tipo_combustible?.color_hex || "#888") + "22", color: p.tipo_combustible?.color_hex }}>
                        Pico {p.numero} — {p.tipo_combustible?.nombre || "?"}
                      </span>
                    ))}
                    {picos.filter(p => p.isla_id === isla.id).length === 0 && (
                      <span className="no-picos">Sin picos asignados</span>
                    )}
                  </div>
                </div>
                <div className="item-card-actions">
                  <button className="btn btn-icon" onClick={() => setModal({ type: "isla", data: isla })}>✏️</button>
                  <button className="btn btn-icon danger"
                    onClick={() => setConfirmDelete({ label: isla.nombre, fn: () => deleteIsla(isla.id) })}>🗑️</button>
                </div>
              </div>
            ))}
            {islas.length === 0 && <div className="empty-state">No hay islas registradas.</div>}
          </div>
        </Section>
      )}

      {/* TAB: Picos */}
      {activeTab === "picos" && (
        <Section icon="🔩" title="Picos Expendedores" addLabel="Nuevo Pico"
          onAdd={() => setModal({ type: "pico" })}>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Isla</th><th>N° Pico</th><th>Combustible</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {picos.map(p => (
                  <tr key={p.id}>
                    <td>Isla {islas.find(i => i.id === p.isla_id)?.numero || p.isla_id}</td>
                    <td><strong>Pico {p.numero}</strong></td>
                    <td>
                      <span className="fuel-chip" style={{ background: (p.tipo_combustible?.color_hex || "#888") + "22", color: p.tipo_combustible?.color_hex }}>
                        {p.tipo_combustible?.nombre || "—"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn action-btn-edit" onClick={() => setModal({ type: "pico", data: { ...p, isla_id: p.isla_id, tipo_combustible_id: p.tipo_combustible_id } })}>✏️</button>
                        <button className="action-btn action-btn-delete"
                          onClick={() => setConfirmDelete({ label: `Pico ${p.numero}`, fn: () => deletePico(p.id) })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {picos.length === 0 && <tr><td colSpan="4" className="empty-state">No hay picos.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* TAB: Turnos */}
      {activeTab === "turnos" && (
        <Section icon="🕐" title="Configuración de Turnos" addLabel="Nuevo Turno"
          onAdd={() => setModal({ type: "turno" })}>
          <div className="cards-grid">
            {turnos.map(t => (
              <div key={t.id} className="item-card turno-card">
                <div className="turno-color-bar" style={{ background: t.color_hex }} />
                <div className="item-card-body">
                  <div className="item-card-title">{t.nombre}</div>
                  <div className="item-card-sub">
                    🕐 Inicio: <strong>{t.hora_inicio}</strong> — Duración: <strong>{t.duracion_horas}hs</strong>
                  </div>
                  <div className="turno-hora-fin">
                    Fin estimado: {(() => {
                      const [h, m] = t.hora_inicio.split(":").map(Number);
                      const fin = (h + t.duracion_horas) % 24;
                      return `${String(fin).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                    })()}
                  </div>
                </div>
                <div className="item-card-actions">
                  <button className="btn btn-icon" onClick={() => setModal({ type: "turno", data: t })}>✏️</button>
                  <button className="btn btn-icon danger"
                    onClick={() => setConfirmDelete({ label: t.nombre, fn: () => deleteTurno(t.id) })}>🗑️</button>
                </div>
              </div>
            ))}
            {turnos.length === 0 && <div className="empty-state">No hay turnos configurados.</div>}
          </div>
        </Section>
      )}
    </div>
  );
}
