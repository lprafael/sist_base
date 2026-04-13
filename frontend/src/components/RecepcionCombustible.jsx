// RecepcionCombustible.jsx
// Registro de recepciones de combustible + gestión de proveedores

import React, { useState, useEffect, useCallback } from "react";
import "./RecepcionCombustible.css";

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

const fmtGs = n => n == null ? "—" : new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);
const fmtL = n => `${Number(n || 0).toLocaleString("es-PY", { maximumFractionDigits: 1 })} L`;
const fmtDate = s => s ? new Date(s).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDateOnly = s => s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY") : "—";

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

// ── Formulario de recepción ───────────────────
function RecepcionForm({ tanques, proveedores, pedidosAprobados, onSave, onClose }) {
  const [form, setForm] = useState({
    tanque_id: tanques[0]?.id || "",
    pedido_id: "",
    proveedor_id: proveedores[0]?.id || "",
    litros_recibidos: "",
    precio_litro: "",
    nro_remito: "",
    nro_factura: "",
    fecha_recepcion: new Date().toISOString().split("T")[0],
    observaciones: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const tanqueSel = tanques.find(t => t.id === Number(form.tanque_id));
  const espacioDisponible = tanqueSel
    ? Number(tanqueSel.capacidad_litros) - Number(tanqueSel.stock_actual_litros)
    : null;
  const total = form.litros_recibidos && form.precio_litro
    ? Number(form.litros_recibidos) * Number(form.precio_litro)
    : null;

  // Al seleccionar pedido, auto-completar campos
  const handleSelectPedido = (pedidoId) => {
    const ped = pedidosAprobados.find(p => p.id === Number(pedidoId));
    if (ped) {
      setForm(f => ({
        ...f,
        pedido_id: pedidoId,
        tanque_id: ped.tanque_id || f.tanque_id,
        proveedor_id: ped.proveedor_id || f.proveedor_id,
        litros_recibidos: ped.litros_solicitados || f.litros_recibidos,
        precio_litro: ped.precio_litro_estimado || f.precio_litro,
      }));
    } else {
      setForm(f => ({ ...f, pedido_id: pedidoId }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (espacioDisponible !== null && Number(form.litros_recibidos) > espacioDisponible) {
      setErr(`Los litros a recibir (${form.litros_recibidos}) superan el espacio disponible en el tanque (${espacioDisponible.toFixed(1)} L)`);
      return;
    }
    setLoading(true); setErr("");
    try {
      await onSave({
        tanque_id: Number(form.tanque_id),
        pedido_id: form.pedido_id ? Number(form.pedido_id) : undefined,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : undefined,
        litros_recibidos: Number(form.litros_recibidos),
        precio_litro: form.precio_litro ? Number(form.precio_litro) : undefined,
        nro_remito: form.nro_remito || undefined,
        nro_factura: form.nro_factura || undefined,
        fecha_recepcion: form.fecha_recepcion,
        observaciones: form.observaciones || undefined,
      });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      {/* Vincular pedido aprobado (opcional) */}
      {pedidosAprobados.length > 0 && (
        <div className="form-group">
          <label className="form-label">Vincular con Pedido Aprobado (opcional)</label>
          <select value={form.pedido_id} id="sel-pedido-recepcion"
            onChange={e => handleSelectPedido(e.target.value)}>
            <option value="">— Recepción sin pedido previo —</option>
            {pedidosAprobados.map(p => (
              <option key={p.id} value={p.id}>
                Pedido #{p.id} — {fmtL(p.litros_solicitados)} — {fmtDateOnly(p.fecha_pedido)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tanque destino *</label>
          <select required value={form.tanque_id} id="sel-tanque-recepcion"
            onChange={e => setForm({ ...form, tanque_id: e.target.value })}>
            {tanques.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre} — Stock: {fmtL(t.stock_actual_litros)} / {fmtL(t.capacidad_litros)}
              </option>
            ))}
          </select>
          {espacioDisponible !== null && (
            <span className="form-hint">Espacio disponible: <strong>{fmtL(espacioDisponible)}</strong></span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Proveedor</label>
          <select value={form.proveedor_id}
            onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
            <option value="">— Sin especificar —</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Litros Recibidos *</label>
          <input id="inp-litros-recepcion" type="number" required min="0.001" step="0.001"
            value={form.litros_recibidos}
            onChange={e => setForm({ ...form, litros_recibidos: e.target.value })}
            placeholder="Ej: 25000.000" />
        </div>
        <div className="form-group">
          <label className="form-label">Precio / Litro (Gs.)</label>
          <input type="number" min="0" step="1"
            value={form.precio_litro}
            onChange={e => setForm({ ...form, precio_litro: e.target.value })}
            placeholder="Opcional — para control de costos" />
          {total && <span className="form-hint">Total: <strong>{fmtGs(total)}</strong></span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° Remito</label>
          <input value={form.nro_remito}
            onChange={e => setForm({ ...form, nro_remito: e.target.value })}
            placeholder="Nro. del remito del proveedor" />
        </div>
        <div className="form-group">
          <label className="form-label">N° Factura</label>
          <input value={form.nro_factura}
            onChange={e => setForm({ ...form, nro_factura: e.target.value })}
            placeholder="Nro. de factura" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha de recepción *</label>
          <input type="date" required value={form.fecha_recepcion}
            onChange={e => setForm({ ...form, fecha_recepcion: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea rows={1} value={form.observaciones}
            onChange={e => setForm({ ...form, observaciones: e.target.value })} />
        </div>
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-confirmar-recepcion">
          {loading ? "Registrando..." : "🚚 Registrar Recepción"}
        </button>
      </div>
    </form>
  );
}

// ── Formulario proveedor ──────────────────────
function ProveedorForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ razon_social: "", ruc: "", telefono: "", email: "", contacto: "", ...initial });
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
      <div className="form-group">
        <label className="form-label">Razón Social *</label>
        <input required id="inp-razon-social" value={form.razon_social}
          onChange={e => setForm({ ...form, razon_social: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">RUC</label>
          <input value={form.ruc || ""}
            onChange={e => setForm({ ...form, ruc: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input value={form.telefono || ""}
            onChange={e => setForm({ ...form, telefono: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" value={form.email || ""}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Contacto</label>
          <input value={form.contacto || ""}
            onChange={e => setForm({ ...form, contacto: e.target.value })} />
        </div>
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>Guardar</button>
      </div>
    </form>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────
export default function RecepcionCombustible() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recepciones, setRecepciones] = useState([]);
  const [tanques, setTanques] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [pedidosAprobados, setPedidosAprobados] = useState([]);
  const [activeTab, setActiveTab] = useState("recepciones");
  const [modalRecepcion, setModalRecepcion] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [re, ta, pv, pe] = await Promise.all([
        apiFetch("/api/surtidor/recepciones?limit=100"),
        apiFetch("/api/surtidor/tanques"),
        apiFetch("/api/surtidor/proveedores"),
        apiFetch("/api/surtidor/pedidos?estado=aprobado"),
      ]);
      setRecepciones(re); setTanques(ta); setProveedores(pv); setPedidosAprobados(pe);
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecepcion = async (data) => {
    await apiFetch("/api/surtidor/recepciones", { method: "POST", body: JSON.stringify(data) });
    showToast("Recepción registrada y stock actualizado");
    load();
  };

  const handleSaveProveedor = async (data) => {
    if (data.id) {
      await apiFetch(`/api/surtidor/proveedores/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await apiFetch("/api/surtidor/proveedores", { method: "POST", body: JSON.stringify(data) });
    }
    showToast("Proveedor guardado");
    load();
  };

  if (loading) return <div className="module-loading"><div className="dash-spinner" /><p>Cargando recepciones...</p></div>;

  return (
    <div className="recepcion-module">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {modalRecepcion && (
        <Modal title="Registrar Recepción de Combustible" onClose={() => setModalRecepcion(false)}>
          <RecepcionForm tanques={tanques} proveedores={proveedores}
            pedidosAprobados={pedidosAprobados}
            onSave={handleRecepcion} onClose={() => setModalRecepcion(false)} />
        </Modal>
      )}

      {modalProveedor !== null && (
        <Modal title={modalProveedor?.id ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={() => setModalProveedor(null)}>
          <ProveedorForm initial={modalProveedor || {}} onSave={handleSaveProveedor} onClose={() => setModalProveedor(null)} />
        </Modal>
      )}

      <div className="recepcion-header">
        <div>
          <h2>🚚 Recepciones de Combustible</h2>
          <p>Registro de ingresos de combustible a los tanques</p>
        </div>
        <div className="recepcion-actions">
          <button className="btn btn-secondary" onClick={load}>🔄</button>
          {activeTab === "recepciones" && (
            <button className="btn btn-primary" onClick={() => setModalRecepcion(true)} id="btn-nueva-recepcion">
              🚚 Registrar Recepción
            </button>
          )}
          {activeTab === "proveedores" && (
            <button className="btn btn-primary" onClick={() => setModalProveedor({})} id="btn-nuevo-proveedor">
              + Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {pedidosAprobados.length > 0 && (
        <div className="recepcion-alert">
          <strong>📦 {pedidosAprobados.length} pedido(s) aprobado(s)</strong> esperando recepción.
          <button className="btn btn-primary btn-sm" onClick={() => setModalRecepcion(true)}>
            Registrar llegada →
          </button>
        </div>
      )}

      <div className="conc-tabs">
        {[["recepciones", "🚚 Historial de Recepciones"], ["proveedores", "🏢 Proveedores"]].map(([id, label]) => (
          <button key={id} className={`config-tab ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)} id={`tab-recepcion-${id}`}>{label}</button>
        ))}
      </div>

      {/* TAB: Recepciones */}
      {activeTab === "recepciones" && (
        <div className="table-container">
          <table id="tabla-recepciones">
            <thead>
              <tr>
                <th>#</th><th>Fecha</th><th>Tanque</th><th>Combustible</th>
                <th>Litros</th><th>Precio/L</th><th>Total</th>
                <th>Proveedor</th><th>Remito</th><th>Factura</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.map(r => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{fmtDateOnly(r.fecha_recepcion)}</td>
                  <td>{tanques.find(t => t.id === r.tanque_id)?.nombre || `#${r.tanque_id}`}</td>
                  <td>
                    {(() => {
                      const t = tanques.find(ta => ta.id === r.tanque_id);
                      return t?.tipo_combustible?.nombre || "—";
                    })()}
                  </td>
                  <td><strong>{fmtL(r.litros_recibidos)}</strong></td>
                  <td>{r.precio_litro ? fmtGs(r.precio_litro) : "—"}</td>
                  <td>{r.precio_litro ? fmtGs(Number(r.litros_recibidos) * Number(r.precio_litro)) : "—"}</td>
                  <td>{proveedores.find(p => p.id === r.proveedor_id)?.razon_social || "—"}</td>
                  <td><code>{r.nro_remito || "—"}</code></td>
                  <td><code>{r.nro_factura || "—"}</code></td>
                </tr>
              ))}
              {recepciones.length === 0 && (
                <tr><td colSpan="10" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                  Sin recepciones registradas.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Proveedores */}
      {activeTab === "proveedores" && (
        <div className="proveedores-grid">
          {proveedores.map(p => (
            <div key={p.id} className="proveedor-card">
              <div className="prov-icon">🏢</div>
              <div className="prov-info">
                <strong>{p.razon_social}</strong>
                {p.ruc && <span>RUC: {p.ruc}</span>}
                {p.telefono && <span>📞 {p.telefono}</span>}
                {p.contacto && <span>👤 {p.contacto}</span>}
              </div>
              <button className="action-btn" onClick={() => setModalProveedor(p)}>✏️</button>
            </div>
          ))}
          {proveedores.length === 0 && (
            <div className="empty-state">No hay proveedores. Agregue con "+ Nuevo Proveedor".</div>
          )}
        </div>
      )}
    </div>
  );
}
