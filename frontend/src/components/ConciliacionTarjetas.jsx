// ConciliacionTarjetas.jsx
// Módulo de conciliación: ventas con tarjeta ↔ reembolsos bancarios

import React, { useState, useEffect, useCallback } from "react";
import "./ConciliacionTarjetas.css";

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
const fmtDate    = s => s ? new Date(s).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDateOnly = s => s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY") : "—";

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  return { toast, show };
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
// FORM: Registrar Reembolso Bancario
// ──────────────────────────────────────────────
function ReembolsoForm({ cuentas, metodosPago, ventasSeleccionadas, onSave, onClose }) {
  const totalSeleccionado = ventasSeleccionadas.reduce((s, v) => s + Number(v.monto_total), 0);

  const [form, setForm] = useState({
    cuenta_bancaria_id: cuentas[0]?.id || "",
    metodo_pago_id: metodosPago[0]?.id || "",
    nro_comprobante: "",
    fecha_deposito: new Date().toISOString().split("T")[0],
    monto_bruto: totalSeleccionado || "",
    comision: "",
    observacion: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const montoNeto = Number(form.monto_bruto || 0) - Number(form.comision || 0);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nro_comprobante.trim()) { setErr("El nro. de comprobante es obligatorio"); return; }
    setLoading(true); setErr("");
    try {
      await onSave({
        cuenta_bancaria_id: Number(form.cuenta_bancaria_id),
        metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : undefined,
        nro_comprobante: form.nro_comprobante.trim(),
        fecha_deposito: form.fecha_deposito,
        monto_bruto: Number(form.monto_bruto),
        comision: Number(form.comision || 0),
        observacion: form.observacion || undefined,
      });
      onClose();
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      {ventasSeleccionadas.length > 0 && (
        <div className="reembolso-seleccion-info">
          <span>💳 {ventasSeleccionadas.length} venta(s) seleccionadas</span>
          <strong>Total: {fmtGs(totalSeleccionado)}</strong>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Cuenta Bancaria *</label>
          <select required value={form.cuenta_bancaria_id}
            onChange={e => setForm({ ...form, cuenta_bancaria_id: e.target.value })}>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.nro_cuenta}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Red de Tarjeta</label>
          <select value={form.metodo_pago_id}
            onChange={e => setForm({ ...form, metodo_pago_id: e.target.value })}>
            <option value="">— Todas —</option>
            {metodosPago.filter(m => m.tipo === "tarjeta").map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° Comprobante Banco *</label>
          <input id="inp-nro-comprobante" required placeholder="Ej: DEP-2024-001234"
            value={form.nro_comprobante}
            onChange={e => setForm({ ...form, nro_comprobante: e.target.value })} />
          <span className="form-hint">Este número identifica el depósito en el extracto bancario</span>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha del Depósito *</label>
          <input type="date" required value={form.fecha_deposito}
            onChange={e => setForm({ ...form, fecha_deposito: e.target.value })} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Monto Bruto (Gs.) *</label>
          <input id="inp-monto-bruto" type="number" required min="1" value={form.monto_bruto}
            onChange={e => setForm({ ...form, monto_bruto: e.target.value })}
            placeholder="Monto acreditado por el banco" />
        </div>
        <div className="form-group">
          <label className="form-label">Comisión Banco (Gs.)</label>
          <input type="number" min="0" value={form.comision}
            onChange={e => setForm({ ...form, comision: e.target.value })} placeholder="0" />
        </div>
      </div>

      {form.monto_bruto && (
        <div className="monto-neto-display">
          <span>Monto neto a acreditar:</span>
          <strong>{fmtGs(montoNeto)}</strong>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Observación</label>
        <textarea rows={2} value={form.observacion}
          onChange={e => setForm({ ...form, observacion: e.target.value })} />
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-guardar-reembolso">
          {loading ? "Guardando..." : "✅ Registrar Reembolso"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// FORM: Asignar reembolso a venta individual
// ──────────────────────────────────────────────
function AsignarReembolsoModal({ venta, reembolsos, onSave, onClose }) {
  const [reembolsoId, setReembolsoId] = useState("");
  const [nroCompBanco, setNroCompBanco] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const reembolsoSel = reembolsos.find(r => r.id === Number(reembolsoId));

  // Al seleccionar reembolso, auto-llenar el nro comprobante
  const handleSelectReembolso = (id) => {
    setReembolsoId(id);
    const r = reembolsos.find(r => r.id === Number(id));
    if (r) setNroCompBanco(r.nro_comprobante);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!reembolsoId) { setErr("Seleccione un reembolso"); return; }
    setLoading(true); setErr("");
    try {
      await onSave(venta.id, { reembolso_id: Number(reembolsoId), nro_comprobante_banco: nroCompBanco });
      onClose();
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="venta-info-card">
        <div className="venta-info-row"><span>Venta #</span><strong>{venta.id}</strong></div>
        <div className="venta-info-row"><span>Fecha</span><strong>{fmtDate(venta.fecha_hora)}</strong></div>
        <div className="venta-info-row"><span>Método</span><strong>{venta.metodo_pago?.nombre}</strong></div>
        <div className="venta-info-row"><span>Monto</span><strong>{fmtGs(venta.monto_total)}</strong></div>
      </div>

      <div className="form-group">
        <label className="form-label">Reembolso bancario a vincular *</label>
        <select required value={reembolsoId} id="sel-reembolso"
          onChange={e => handleSelectReembolso(e.target.value)}>
          <option value="">-- Seleccionar comprobante --</option>
          {reembolsos.map(r => (
            <option key={r.id} value={r.id}>
              {r.nro_comprobante} — {fmtDateOnly(r.fecha_deposito)} — {fmtGs(r.monto_bruto)}
            </option>
          ))}
        </select>
      </div>

      {reembolsoSel && (
        <div className="reembolso-preview">
          <div className="venta-info-row"><span>Depositado</span><strong>{fmtDateOnly(reembolsoSel.fecha_deposito)}</strong></div>
          <div className="venta-info-row"><span>Monto bruto</span><strong>{fmtGs(reembolsoSel.monto_bruto)}</strong></div>
          <div className="venta-info-row"><span>Monto neto</span><strong>{fmtGs(reembolsoSel.monto_neto)}</strong></div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">N° Comprobante banco (confirmación)</label>
        <input value={nroCompBanco} onChange={e => setNroCompBanco(e.target.value)}
          placeholder="Se completa automáticamente al seleccionar" />
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-confirmar-asignar">
          {loading ? "Guardando..." : "✅ Marcar como Reembolsado"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────
export default function ConciliacionTarjetas() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [ventasPendientes, setVentasPendientes] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const [selectedVentas, setSelectedVentas] = useState(new Set());
  const [activeTab, setActiveTab] = useState("pendientes");
  const [modalReembolso, setModalReembolso] = useState(false);
  const [ventaAsignar, setVentaAsignar] = useState(null);

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vp, re, cu, mp] = await Promise.all([
        apiFetch("/api/surtidor/ventas?estado_reembolso=pendiente&limit=500"),
        apiFetch("/api/surtidor/reembolsos"),
        apiFetch("/api/surtidor/cuentas-bancarias"),
        apiFetch("/api/surtidor/metodos-pago"),
      ]);
      setVentasPendientes(vp);
      setReembolsos(re);
      setCuentas(cu);
      setMetodosPago(mp);
    } catch (e) {
      showToast("Error cargando datos: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filtrado
  const ventasFiltradas = ventasPendientes.filter(v => {
    const matchFecha = !filtroFecha || v.fecha_hora?.startsWith(filtroFecha);
    const matchMetodo = !filtroMetodo || v.metodo_pago_id === Number(filtroMetodo);
    return matchFecha && matchMetodo;
  });

  const totalPendiente = ventasFiltradas.reduce((s, v) => s + Number(v.monto_total), 0);
  const totalSeleccion = [...selectedVentas].reduce((s, id) => {
    const v = ventasFiltradas.find(v => v.id === id);
    return s + (v ? Number(v.monto_total) : 0);
  }, 0);

  const toggleVenta = (id) => {
    setSelectedVentas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVentas.size === ventasFiltradas.length) {
      setSelectedVentas(new Set());
    } else {
      setSelectedVentas(new Set(ventasFiltradas.map(v => v.id)));
    }
  };

  const handleRegistrarReembolso = async (data) => {
    // 1. Crear el reembolso
    const reembolso = await apiFetch("/api/surtidor/reembolsos", {
      method: "POST", body: JSON.stringify(data)
    });
    showToast(`Reembolso ${reembolso.nro_comprobante} registrado`);

    // 2. Asignar ventas seleccionadas al reembolso
    if (selectedVentas.size > 0) {
      let ok = 0;
      for (const ventaId of selectedVentas) {
        try {
          await apiFetch(`/api/surtidor/ventas/${ventaId}/asignar-reembolso`, {
            method: "PUT",
            body: JSON.stringify({
              reembolso_id: reembolso.id,
              nro_comprobante_banco: data.nro_comprobante
            })
          });
          ok++;
        } catch (e) { /* continúa */ }
      }
      showToast(`${ok} venta(s) marcadas como reembolsadas`);
    }

    setSelectedVentas(new Set());
    loadAll();
  };

  const handleAsignarReembolsoIndividual = async (ventaId, data) => {
    await apiFetch(`/api/surtidor/ventas/${ventaId}/asignar-reembolso`, {
      method: "PUT", body: JSON.stringify(data)
    });
    showToast("Venta conciliada correctamente");
    loadAll();
  };

  if (loading) {
    return <div className="module-loading"><div className="dash-spinner" /><p>Cargando conciliación...</p></div>;
  }

  const ventasSelArray = ventasFiltradas.filter(v => selectedVentas.has(v.id));

  return (
    <div className="conciliacion-module">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {/* Modal reembolso */}
      {modalReembolso && (
        <Modal title="Registrar Reembolso Bancario" onClose={() => setModalReembolso(false)}>
          <ReembolsoForm
            cuentas={cuentas}
            metodosPago={metodosPago}
            ventasSeleccionadas={ventasSelArray}
            onSave={handleRegistrarReembolso}
            onClose={() => setModalReembolso(false)}
          />
        </Modal>
      )}

      {/* Modal asignación individual */}
      {ventaAsignar && (
        <Modal title="Asignar Reembolso a Venta" onClose={() => setVentaAsignar(null)}>
          <AsignarReembolsoModal
            venta={ventaAsignar}
            reembolsos={reembolsos.filter(r => !r.conciliado)}
            onSave={handleAsignarReembolsoIndividual}
            onClose={() => setVentaAsignar(null)}
          />
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="conc-header">
        <div>
          <h2>💳 Conciliación de Tarjetas</h2>
          <p>Vincule las ventas con tarjeta a los reembolsos bancarios correspondientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalReembolso(true)} id="btn-nuevo-reembolso">
          + Registrar Reembolso Bancario
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="conc-kpis">
        <div className="conc-kpi conc-kpi-warn">
          <span className="conc-kpi-icon">⏳</span>
          <div>
            <span>Ventas pendientes</span>
            <strong>{ventasPendientes.length}</strong>
          </div>
        </div>
        <div className="conc-kpi conc-kpi-warn">
          <span className="conc-kpi-icon">💰</span>
          <div>
            <span>Monto pendiente total</span>
            <strong>{fmtGs(ventasPendientes.reduce((s, v) => s + Number(v.monto_total), 0))}</strong>
          </div>
        </div>
        <div className="conc-kpi conc-kpi-ok">
          <span className="conc-kpi-icon">🏦</span>
          <div>
            <span>Reembolsos registrados</span>
            <strong>{reembolsos.length}</strong>
          </div>
        </div>
        <div className="conc-kpi conc-kpi-ok">
          <span className="conc-kpi-icon">✅</span>
          <div>
            <span>Total reembolsado</span>
            <strong>{fmtGs(reembolsos.reduce((s, r) => s + Number(r.monto_neto), 0))}</strong>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="conc-tabs">
        <button className={`config-tab ${activeTab === "pendientes" ? "active" : ""}`}
          onClick={() => setActiveTab("pendientes")}>
          ⏳ Ventas Pendientes ({ventasPendientes.length})
        </button>
        <button className={`config-tab ${activeTab === "reembolsos" ? "active" : ""}`}
          onClick={() => setActiveTab("reembolsos")}>
          🏦 Reembolsos Bancarios ({reembolsos.length})
        </button>
      </div>

      {/* ── TAB: Ventas Pendientes ── */}
      {activeTab === "pendientes" && (
        <div className="conc-section">
          {/* Filtros */}
          <div className="conc-filtros">
            <div className="filtro-group">
              <label>📅 Fecha</label>
              <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
              {filtroFecha && <button className="btn-clear" onClick={() => setFiltroFecha("")}>✕</button>}
            </div>
            <div className="filtro-group">
              <label>💳 Tarjeta</label>
              <select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
                <option value="">Todas</option>
                {metodosPago.filter(m => m.tipo === "tarjeta").map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="filtro-totales">
              <span>Mostrando: <strong>{ventasFiltradas.length}</strong> ventas — Total: <strong>{fmtGs(totalPendiente)}</strong></span>
            </div>
          </div>

          {/* Barra de acción por lote */}
          {selectedVentas.size > 0 && (
            <div className="lote-action-bar">
              <span>✅ {selectedVentas.size} seleccionadas — Total: <strong>{fmtGs(totalSeleccion)}</strong></span>
              <button className="btn btn-primary btn-sm" onClick={() => setModalReembolso(true)} id="btn-conciliar-lote">
                💳 Conciliar seleccionadas con reembolso bancario
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVentas(new Set())}>
                Deseleccionar
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="table-container">
            <table id="tabla-ventas-pendientes">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox"
                      checked={selectedVentas.size === ventasFiltradas.length && ventasFiltradas.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <th>#</th>
                  <th>Fecha / Hora</th>
                  <th>Turno</th>
                  <th>Combustible</th>
                  <th>Litros</th>
                  <th>Monto</th>
                  <th>Tarjeta</th>
                  <th>Comprobante</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map(v => (
                  <tr key={v.id} className={selectedVentas.has(v.id) ? "row-selected" : ""}>
                    <td>
                      <input type="checkbox" checked={selectedVentas.has(v.id)} onChange={() => toggleVenta(v.id)} />
                    </td>
                    <td><code>{v.id}</code></td>
                    <td>{fmtDate(v.fecha_hora)}</td>
                    <td>Turno #{v.turno_id}</td>
                    <td>
                      {v.pico?.tipo_combustible && (
                        <span className="fuel-chip" style={{
                          background: (v.pico.tipo_combustible.color_hex || "#888") + "22",
                          color: v.pico.tipo_combustible.color_hex
                        }}>
                          {v.pico.tipo_combustible.nombre}
                        </span>
                      )}
                    </td>
                    <td>{Number(v.litros).toFixed(3)} L</td>
                    <td><strong>{fmtGs(v.monto_total)}</strong></td>
                    <td>
                      <span className="metodo-chip metodo-chip-tarjeta">
                        💳 {v.metodo_pago?.nombre || "—"}
                      </span>
                    </td>
                    <td><code>{v.nro_comprobante || "—"}</code></td>
                    <td>
                      <button className="btn btn-secondary btn-xs" title="Asignar reembolso"
                        onClick={() => setVentaAsignar(v)}>
                        🔗 Vincular
                      </button>
                    </td>
                  </tr>
                ))}
                {ventasFiltradas.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: "center", padding: 32, color: "#10b981" }}>
                    ✅ No hay ventas con tarjeta pendientes de conciliar
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Reembolsos Bancarios ── */}
      {activeTab === "reembolsos" && (
        <div className="conc-section">
          <div className="table-container">
            <table id="tabla-reembolsos">
              <thead>
                <tr>
                  <th>#</th>
                  <th>N° Comprobante</th>
                  <th>Fecha Depósito</th>
                  <th>Banco / Cuenta</th>
                  <th>Red Tarjeta</th>
                  <th>Monto Bruto</th>
                  <th>Comisión</th>
                  <th>Monto Neto</th>
                  <th>Estado</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {reembolsos.map(r => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td><strong><code>{r.nro_comprobante}</code></strong></td>
                    <td>{fmtDateOnly(r.fecha_deposito)}</td>
                    <td>
                      {cuentas.find(c => c.id === r.cuenta_bancaria_id)?.banco || `#${r.cuenta_bancaria_id}`}
                    </td>
                    <td>{metodosPago.find(m => m.id === r.metodo_pago_id)?.nombre || "Varias"}</td>
                    <td>{fmtGs(r.monto_bruto)}</td>
                    <td>{fmtGs(r.comision)}</td>
                    <td><strong>{fmtGs(r.monto_neto)}</strong></td>
                    <td>
                      {r.conciliado
                        ? <span className="badge-ok">✅ Conciliado</span>
                        : <span className="badge-pendiente">⏳ Pendiente</span>}
                    </td>
                    <td>{fmtDate(r.fecha_registro)}</td>
                  </tr>
                ))}
                {reembolsos.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                    No hay reembolsos registrados. Use "+ Registrar Reembolso Bancario" cuando llegue el depósito.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Instructivo */}
          <div className="conciliacion-instructivo">
            <h4>📖 ¿Cómo funciona la conciliación?</h4>
            <ol>
              <li>Las ventas con tarjeta quedan como <span className="badge-pendiente">⏳ Pendiente</span>.</li>
              <li>El banco deposita el dinero unos días después. Cuando llegue el extracto, registre el reembolso con el <strong>N° de comprobante</strong> del banco.</li>
              <li>Seleccione las ventas correspondientes (puede ser varias) y vincúlelas al reembolso.</li>
              <li>Las ventas quedan marcadas como <span className="badge-ok">✅ Reembolsado</span> con el nro. de comprobante bancario para trazabilidad completa.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
