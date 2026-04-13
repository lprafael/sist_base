// CajaFinanzas.jsx
// Módulo de caja: movimientos, saldo y depósitos bancarios

import React, { useState, useEffect, useCallback } from "react";
import "./CajaFinanzas.css";

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

// ── Formulario movimiento de caja ─────────────
function MovCajaForm({ onSave, onClose }) {
  const [form, setForm] = useState({ tipo: "egreso", concepto: "", monto: "", observaciones: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, monto: Number(form.monto) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-group">
        <label className="form-label">Tipo *</label>
        <div className="tipo-ajuste-btns">
          <button type="button" className={`tipo-btn ${form.tipo === "ingreso" ? "tipo-btn-active-entry" : ""}`}
            onClick={() => setForm({ ...form, tipo: "ingreso" })}>▲ Ingreso</button>
          <button type="button" className={`tipo-btn ${form.tipo === "egreso" ? "tipo-btn-active-exit" : ""}`}
            onClick={() => setForm({ ...form, tipo: "egreso" })}>▼ Egreso</button>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Concepto *</label>
        <input required value={form.concepto} id="inp-concepto-caja"
          onChange={e => setForm({ ...form, concepto: e.target.value })}
          placeholder="Ej: Pago de servicio, Retiro de efectivo..." />
      </div>
      <div className="form-group">
        <label className="form-label">Monto (Gs.) *</label>
        <input type="number" required min="1" id="inp-monto-caja"
          value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea rows={2} value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })} />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-guardar-mov-caja">
          {loading ? "Guardando..." : "✅ Registrar"}
        </button>
      </div>
    </form>
  );
}

// ── Formulario depósito bancario ──────────────
function DepositoForm({ cuentas, onSave, onClose }) {
  const [form, setForm] = useState({
    cuenta_bancaria_id: cuentas[0]?.id || "",
    monto: "", fecha_deposito: new Date().toISOString().split("T")[0],
    nro_boleta: "", observaciones: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, cuenta_bancaria_id: Number(form.cuenta_bancaria_id), monto: Number(form.monto) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Cuenta Bancaria *</label>
          <select required value={form.cuenta_bancaria_id}
            onChange={e => setForm({ ...form, cuenta_bancaria_id: e.target.value })}>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.nro_cuenta}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha del Depósito *</label>
          <input type="date" required value={form.fecha_deposito}
            onChange={e => setForm({ ...form, fecha_deposito: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Monto (Gs.) *</label>
          <input type="number" required min="1" id="inp-monto-deposito"
            value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">N° de Boleta</label>
          <input value={form.nro_boleta} onChange={e => setForm({ ...form, nro_boleta: e.target.value })}
            placeholder="Número de boleta bancaria" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea rows={2} value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })} />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-guardar-deposito">
          {loading ? "Guardando..." : "🏦 Registrar Depósito"}
        </button>
      </div>
    </form>
  );
}

// ── Formulario cuenta bancaria ────────────────
function CuentaForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ banco: "", nro_cuenta: "", titular: "", tipo_cuenta: "corriente", ...initial });
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
          <label className="form-label">Banco *</label>
          <input required value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}
            placeholder="Ej: Banco Continental" />
        </div>
        <div className="form-group">
          <label className="form-label">N° de Cuenta *</label>
          <input required value={form.nro_cuenta} onChange={e => setForm({ ...form, nro_cuenta: e.target.value })}
            placeholder="Ej: 0123456789" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Titular</label>
          <input value={form.titular || ""} onChange={e => setForm({ ...form, titular: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tipo de Cuenta</label>
          <select value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}>
            <option value="corriente">Cuenta Corriente</option>
            <option value="ahorro">Caja de Ahorro</option>
          </select>
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

// ── COMPONENTE PRINCIPAL ──────────────────────
export default function CajaFinanzas() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [activeTab, setActiveTab] = useState("caja");
  const [modalMovCaja, setModalMovCaja] = useState(false);
  const [modalDeposito, setModalDeposito] = useState(false);
  const [modalCuenta, setModalCuenta] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mv, cu, kpi] = await Promise.all([
        apiFetch("/api/surtidor/caja/movimientos?limit=200"),
        apiFetch("/api/surtidor/cuentas-bancarias"),
        apiFetch("/api/surtidor/dashboard"),
      ]);
      setMovimientos(mv); setCuentas(cu);
      setSaldo(Number(kpi.saldo_caja || 0));
      // Depósitos
      const dep = await apiFetch("/api/surtidor/depositos?limit=100");
      setDepositos(dep);
    } catch (e) {
      showToast("Error cargando finanzas: " + e.message, "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMovCaja = async (data) => {
    await apiFetch("/api/surtidor/caja/movimientos", { method: "POST", body: JSON.stringify(data) });
    showToast("Movimiento registrado");
    load();
  };

  const handleDeposito = async (data) => {
    await apiFetch("/api/surtidor/depositos", { method: "POST", body: JSON.stringify(data) });
    showToast("Depósito registrado");
    load();
  };

  const handleSaveCuenta = async (data) => {
    if (data.id) {
      await apiFetch(`/api/surtidor/cuentas-bancarias/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await apiFetch("/api/surtidor/cuentas-bancarias", { method: "POST", body: JSON.stringify(data) });
    }
    showToast("Cuenta guardada");
    load();
  };

  // Resumen del día
  const hoy = new Date().toISOString().split("T")[0];
  const movsHoy = movimientos.filter(m => m.fecha_hora?.startsWith(hoy));
  const ingresosHoy = movsHoy.filter(m => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto), 0);
  const egresosHoy = movsHoy.filter(m => m.tipo === "egreso").reduce((s, m) => s + Number(m.monto), 0);

  if (loading) return <div className="module-loading"><div className="dash-spinner" /><p>Cargando finanzas...</p></div>;

  return (
    <div className="caja-finanzas">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {modalMovCaja && <Modal title="Registrar Movimiento de Caja" onClose={() => setModalMovCaja(false)}><MovCajaForm onSave={handleMovCaja} onClose={() => setModalMovCaja(false)} /></Modal>}
      {modalDeposito && <Modal title="Registrar Depósito Bancario" onClose={() => setModalDeposito(false)}><DepositoForm cuentas={cuentas} onSave={handleDeposito} onClose={() => setModalDeposito(false)} /></Modal>}
      {modalCuenta !== null && <Modal title={modalCuenta?.id ? "Editar Cuenta" : "Nueva Cuenta Bancaria"} onClose={() => setModalCuenta(null)}><CuentaForm initial={modalCuenta || {}} onSave={handleSaveCuenta} onClose={() => setModalCuenta(null)} /></Modal>}

      <div className="caja-header">
        <div>
          <h2>💵 Caja y Finanzas</h2>
          <p>Movimientos de caja, depósitos bancarios y cuentas</p>
        </div>
        <div className="caja-actions">
          <button className="btn btn-secondary" onClick={load}>🔄</button>
          {activeTab === "caja" && <button className="btn btn-primary" onClick={() => setModalMovCaja(true)} id="btn-nuevo-mov-caja">+ Movimiento</button>}
          {activeTab === "depositos" && <button className="btn btn-primary" onClick={() => setModalDeposito(true)} id="btn-nuevo-deposito">🏦 Nuevo Depósito</button>}
          {activeTab === "cuentas" && <button className="btn btn-primary" onClick={() => setModalCuenta({})} id="btn-nueva-cuenta">+ Nueva Cuenta</button>}
        </div>
      </div>

      {/* Saldo actual */}
      <div className="saldo-card">
        <div className="saldo-principal">
          <span>💰 Saldo Actual de Caja</span>
          <strong className={saldo >= 0 ? "saldo-pos" : "saldo-neg"}>{fmtGs(saldo)}</strong>
        </div>
        <div className="saldo-hoy">
          <div className="saldo-hoy-item"><span>Ingresos hoy</span><strong style={{ color: "#10b981" }}>+{fmtGs(ingresosHoy)}</strong></div>
          <div className="saldo-hoy-sep" />
          <div className="saldo-hoy-item"><span>Egresos hoy</span><strong style={{ color: "#ef4444" }}>-{fmtGs(egresosHoy)}</strong></div>
          <div className="saldo-hoy-sep" />
          <div className="saldo-hoy-item"><span>Neto hoy</span><strong style={{ color: ingresosHoy - egresosHoy >= 0 ? "#10b981" : "#ef4444" }}>{fmtGs(ingresosHoy - egresosHoy)}</strong></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="conc-tabs">
        {[["caja", "💵 Caja"], ["depositos", "🏦 Depósitos"], ["cuentas", "🏛️ Cuentas"]].map(([id, label]) => (
          <button key={id} className={`config-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)} id={`tab-caja-${id}`}>{label}</button>
        ))}
      </div>

      {/* TAB: Caja */}
      {activeTab === "caja" && (
        <div className="table-container">
          <table id="tabla-movimientos-caja">
            <thead>
              <tr><th>Fecha/Hora</th><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Saldo Ant.</th><th>Saldo Post.</th><th>Turno</th></tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td>{fmtDate(m.fecha_hora)}</td>
                  <td>
                    <span className={`tipo-badge ${m.tipo === "ingreso" ? "tipo-ingreso" : "tipo-egreso"}`}>
                      {m.tipo === "ingreso" ? "▲ Ingreso" : "▼ Egreso"}
                    </span>
                  </td>
                  <td>{m.concepto}</td>
                  <td style={{ color: m.tipo === "ingreso" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                    {m.tipo === "ingreso" ? "+" : "-"}{fmtGs(m.monto)}
                  </td>
                  <td>{fmtGs(m.saldo_anterior)}</td>
                  <td><strong>{fmtGs(m.saldo_posterior)}</strong></td>
                  <td>{m.turno_id ? `#${m.turno_id}` : "Manual"}</td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Sin movimientos de caja registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Depósitos */}
      {activeTab === "depositos" && (
        <div className="table-container">
          <table id="tabla-depositos">
            <thead>
              <tr><th>Fecha</th><th>Banco / Cuenta</th><th>Monto</th><th>N° Boleta</th><th>Observaciones</th><th>Registrado</th></tr>
            </thead>
            <tbody>
              {depositos.map(d => (
                <tr key={d.id}>
                  <td>{fmtDateOnly(d.fecha_deposito)}</td>
                  <td>{cuentas.find(c => c.id === d.cuenta_bancaria_id)?.banco || `#${d.cuenta_bancaria_id}`}</td>
                  <td><strong>{fmtGs(d.monto)}</strong></td>
                  <td><code>{d.nro_boleta || "—"}</code></td>
                  <td>{d.observaciones || "—"}</td>
                  <td>{fmtDate(d.fecha_registro)}</td>
                </tr>
              ))}
              {depositos.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Sin depósitos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Cuentas */}
      {activeTab === "cuentas" && (
        <div className="cuentas-grid">
          {cuentas.map(c => (
            <div key={c.id} className="cuenta-card">
              <div className="cuenta-banco">🏛️ {c.banco}</div>
              <div className="cuenta-nro">{c.nro_cuenta}</div>
              <div className="cuenta-tipo">{c.tipo_cuenta === "corriente" ? "Cuenta Corriente" : "Caja de Ahorro"}</div>
              {c.titular && <div className="cuenta-titular">Titular: {c.titular}</div>}
              <button className="btn btn-secondary btn-sm" onClick={() => setModalCuenta(c)}>✏️ Editar</button>
            </div>
          ))}
          {cuentas.length === 0 && (
            <div className="empty-state">No hay cuentas bancarias. Agregue una con "+ Nueva Cuenta".</div>
          )}
        </div>
      )}
    </div>
  );
}
