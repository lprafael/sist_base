// PersonalPlayeros.jsx
// ABM de personal / playeros

import React, { useState, useEffect, useCallback } from "react";
import "./PersonalPlayeros.css";

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

const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY") : "—";

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  return { toast, show };
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function PersonalForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "", apellido: "", documento: "", cargo: "playero", telefono: "",
    email: "", fecha_ingreso: new Date().toISOString().split("T")[0], activo: true, ...initial
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Apellido *</label>
          <input required id="inp-apellido" value={form.apellido}
            onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="García" />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input required value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Juan" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">CI / Documento</label>
          <input value={form.documento || ""}
            onChange={e => setForm({ ...form, documento: e.target.value })} placeholder="1234567" />
        </div>
        <div className="form-group">
          <label className="form-label">Cargo / Rol</label>
          <select value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>
            <option value="playero">Playero</option>
            <option value="supervisor">Supervisor de Turno</option>
            <option value="encargado">Encargado</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input value={form.telefono || ""}
            onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="0981 000000" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" value={form.email || ""}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha de ingreso</label>
          <input type="date" value={form.fecha_ingreso || ""}
            onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} />
        </div>
        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 28 }}>
          <input type="checkbox" id="chk-activo" checked={form.activo !== false}
            onChange={e => setForm({ ...form, activo: e.target.checked })} />
          <label htmlFor="chk-activo" style={{ cursor: "pointer", fontSize: "0.875rem" }}>Personal activo</label>
        </div>
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-guardar-personal">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

const cargosColor = { playero: "#2563eb", supervisor: "#7c3aed", encargado: "#0891b2" };
const cargosLabel = { playero: "Playero", supervisor: "Supervisor", encargado: "Encargado" };

export default function PersonalPlayeros() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("true");
  const [modal, setModal] = useState(null);
  const [confirmElim, setConfirmElim] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/surtidor/personal?activo=${filtroActivo}`);
      setPersonal(data);
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setLoading(false); }
  }, [filtroActivo]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (data.id) {
      await apiFetch(`/api/surtidor/personal/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
      showToast("Personal actualizado");
    } else {
      await apiFetch("/api/surtidor/personal", { method: "POST", body: JSON.stringify(data) });
      showToast("Personal creado");
    }
    load();
  };

  const handleEliminar = async (id) => {
    await apiFetch(`/api/surtidor/personal/${id}`, { method: "DELETE" });
    showToast("Personal dado de baja");
    setConfirmElim(null);
    load();
  };

  const filtrados = personal.filter(p => {
    const q = busqueda.toLowerCase();
    return !q || p.nombre?.toLowerCase().includes(q) || p.apellido?.toLowerCase().includes(q) || p.documento?.includes(q);
  });

  if (loading) return <div className="module-loading"><div className="dash-spinner" /><p>Cargando personal...</p></div>;

  return (
    <div className="personal-module">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {modal !== null && (
        <Modal title={modal?.id ? "Editar Personal" : "Nuevo Personal"} onClose={() => setModal(null)}>
          <PersonalForm initial={modal || {}} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}

      {confirmElim && (
        <div className="modal-overlay">
          <div className="confirm-box">
            <h4>⚠️ Dar de baja</h4>
            <p>¿Desactivar a <strong>{confirmElim.apellido}, {confirmElim.nombre}</strong>?</p>
            <p style={{ fontSize: "0.82rem", color: "#64748b" }}>El registro se conserva. Se puede reactivar en cualquier momento.</p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmElim(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleEliminar(confirmElim.id)}>Dar de Baja</button>
            </div>
          </div>
        </div>
      )}

      <div className="personal-header">
        <div>
          <h2>👷 Personal / Playeros</h2>
          <p>Gestión de empleados del surtidor</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})} id="btn-nuevo-personal">+ Nuevo Personal</button>
      </div>

      {/* KPIs */}
      <div className="personal-kpis">
        {["playero", "supervisor", "encargado"].map(cargo => {
          const cantidad = personal.filter(p => p.cargo === cargo).length;
          return (
            <div key={cargo} className="personal-kpi" style={{ borderLeftColor: cargosColor[cargo] }}>
              <strong style={{ color: cargosColor[cargo] }}>{cantidad}</strong>
              <span>{cargosLabel[cargo]}{cantidad !== 1 ? "s" : ""}</span>
            </div>
          );
        })}
        <div className="personal-kpi" style={{ borderLeftColor: "#64748b" }}>
          <strong>{personal.length}</strong><span>Total activos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="personal-filtros">
        <input placeholder="🔍 Buscar por nombre, apellido o CI..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, maxWidth: "360px" }} />
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>
        <span className="filtro-totales">{filtrados.length} persona(s)</span>
      </div>

      {/* Grid de tarjetas */}
      <div className="personal-grid">
        {filtrados.map(p => (
          <div key={p.id} className={`personal-card ${!p.activo ? "personal-inactivo" : ""}`}>
            <div className="personal-avatar"
              style={{ background: (cargosColor[p.cargo] || "#64748b") + "22", color: cargosColor[p.cargo] || "#64748b" }}>
              {(p.apellido?.[0] || "?")}{(p.nombre?.[0] || "")}
            </div>
            <div className="personal-info">
              <div className="personal-nombre">{p.apellido}, {p.nombre}</div>
              <div className="personal-cargo">
                <span className="cargo-chip" style={{ color: cargosColor[p.cargo], background: (cargosColor[p.cargo] || "#888") + "18" }}>
                  {cargosLabel[p.cargo] || p.cargo}
                </span>
                {!p.activo && <span className="cargo-chip cargo-inactivo">Inactivo</span>}
              </div>
              {p.documento && <div className="personal-doc">CI: {p.documento}</div>}
              {p.telefono && <div className="personal-doc">📞 {p.telefono}</div>}
              {p.fecha_ingreso && <div className="personal-doc">📅 Ingreso: {fmtDate(p.fecha_ingreso)}</div>}
            </div>
            <div className="personal-actions">
              <button className="action-btn" title="Editar" onClick={() => setModal(p)}>✏️</button>
              {p.activo && <button className="action-btn action-btn-delete" title="Dar de baja" onClick={() => setConfirmElim(p)}>🗑️</button>}
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="empty-personal">No hay personal que coincida con los filtros.</div>
        )}
      </div>
    </div>
  );
}
