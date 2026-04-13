// ControlStock.jsx
// Módulo de control de stock: vista de tanques, mediciones manuales y ajustes

import React, { useState, useEffect, useCallback } from "react";
import "./ControlStock.css";

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

const fmtL = n => `${Number(n || 0).toLocaleString("es-PY", { maximumFractionDigits: 1 })} L`;
const fmtDate = s => s ? new Date(s).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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

// ── Medidor visual ────────────────────────────
function TankVisual({ tanque }) {
  const pct = tanque.porcentaje_lleno || 0;
  const estado = tanque.estado_stock || "ok";
  const colores = { ok: "#10b981", bajo: "#f59e0b", critico: "#ef4444", lleno: "#06b6d4" };
  const color = colores[estado] || "#10b981";
  const combustibleColor = tanque.tipo_combustible?.color_hex || color;

  return (
    <div className={`tank-visual-card tank-${estado}`}>
      {/* Nivel visual vertical */}
      <div className="tank-cylinder-wrap">
        <div className="tank-cylinder">
          <div className="tank-fill" style={{ height: `${Math.min(pct, 100)}%`, background: `linear-gradient(180deg, ${combustibleColor}cc, ${combustibleColor})` }} />
          <div className="tank-pct-label">{Math.round(pct)}%</div>
          {/* Línea de stock mínimo */}
          {tanque.stock_minimo_litros && tanque.capacidad_litros && (
            <div className="tank-min-line" style={{
              bottom: `${Math.min((tanque.stock_minimo_litros / tanque.capacidad_litros) * 100, 100)}%`
            }} title={`Mínimo: ${fmtL(tanque.stock_minimo_litros)}`} />
          )}
        </div>
        <div className="tank-number">T{tanque.numero}</div>
      </div>

      {/* Info */}
      <div className="tank-info">
        <div className="tank-title">
          <span className="tank-color-dot" style={{ background: combustibleColor }} />
          <strong>{tanque.nombre}</strong>
          <span className={`tank-status-badge tank-status-${estado}`}>
            {estado === "critico" ? "🔴 Crítico" : estado === "bajo" ? "🟡 Bajo" : estado === "lleno" ? "🔵 Lleno" : "🟢 OK"}
          </span>
        </div>
        <div className="tank-combustible">{tanque.tipo_combustible?.nombre || "—"}</div>
        <div className="tank-stats-row">
          <div className="tank-stat-mini" title="Stock actual">
            <span>Stock</span><strong>{fmtL(tanque.stock_actual_litros)}</strong>
          </div>
          <div className="tank-stat-mini" title="Capacidad total">
            <span>Capacidad</span><strong>{fmtL(tanque.capacidad_litros)}</strong>
          </div>
          <div className="tank-stat-mini" title="Stock mínimo configurado">
            <span>Mínimo</span><strong style={{ color: "#f59e0b" }}>{fmtL(tanque.stock_minimo_litros)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Formulario de medición manual ─────────────
function MedicionForm({ tanques, onSave, onClose }) {
  const [form, setForm] = useState({ tanque_id: tanques[0]?.id || "", litros_medidos: "", metodo: "regla", observaciones: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const tanqueSel = tanques.find(t => t.id === Number(form.tanque_id));

  const diferencia = tanqueSel && form.litros_medidos
    ? (Number(form.litros_medidos) - Number(tanqueSel.stock_actual_litros)).toFixed(1)
    : null;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, tanque_id: Number(form.tanque_id), litros_medidos: Number(form.litros_medidos) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-group">
        <label className="form-label">Tanque a medir *</label>
        <select required value={form.tanque_id} id="sel-tanque-medicion"
          onChange={e => setForm({ ...form, tanque_id: e.target.value })}>
          {tanques.map(t => (
            <option key={t.id} value={t.id}>{t.nombre} — Stock actual: {fmtL(t.stock_actual_litros)}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Litros medidos físicamente *</label>
          <input id="inp-litros-medidos" type="number" required min="0" step="0.001"
            value={form.litros_medidos}
            onChange={e => setForm({ ...form, litros_medidos: e.target.value })}
            placeholder="Ej: 28500.500" />
          {diferencia !== null && (
            <div className={`diferencia-hint ${Math.abs(Number(diferencia)) > 100 ? "diferencia-alerta" : "diferencia-ok"}`}>
              Diferencia con stock sistema: <strong>{diferencia > 0 ? "+" : ""}{diferencia} L</strong>
              {Math.abs(Number(diferencia)) > 100 && " ⚠️ Diferencia significativa"}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Método de medición</label>
          <select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}>
            <option value="regla">Regla / varilla</option>
            <option value="sensor">Sensor automático</option>
            <option value="bomba">Lectura de bomba</option>
            <option value="visual">Estimación visual</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea rows={2} value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Ej: Medición de cierre de turno mañana" />
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-guardar-medicion">
          {loading ? "Guardando..." : "📏 Registrar Medición"}
        </button>
      </div>
    </form>
  );
}

// ── Formulario de ajuste de stock ─────────────
function AjusteForm({ tanques, onSave, onClose }) {
  const [form, setForm] = useState({ tanque_id: tanques[0]?.id || "", tipo: "entrada", litros: "", motivo: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({ ...form, tanque_id: Number(form.tanque_id), litros: Number(form.litros) });
      onClose();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="info-box info-warn">
        ⚠️ Utilice ajustes solo para corregir diferencias detectadas en mediciones manuales. Todos los ajustes quedan registrados en el log de auditoría.
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tanque *</label>
          <select required value={form.tanque_id}
            onChange={e => setForm({ ...form, tanque_id: e.target.value })}>
            {tanques.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tipo de ajuste *</label>
          <div className="tipo-ajuste-btns">
            <button type="button"
              className={`tipo-btn ${form.tipo === "entrada" ? "tipo-btn-active-entry" : ""}`}
              onClick={() => setForm({ ...form, tipo: "entrada" })}>
              ▲ Entrada
            </button>
            <button type="button"
              className={`tipo-btn ${form.tipo === "salida" ? "tipo-btn-active-exit" : ""}`}
              onClick={() => setForm({ ...form, tipo: "salida" })}>
              ▼ Salida
            </button>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Litros a ajustar *</label>
        <input type="number" required min="0.001" step="0.001"
          value={form.litros} onChange={e => setForm({ ...form, litros: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Motivo / Descripción *</label>
        <textarea required rows={2} value={form.motivo}
          onChange={e => setForm({ ...form, motivo: e.target.value })}
          placeholder="Ej: Ajuste por diferencia en medición manual del 12/04/2026" />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-danger" disabled={loading}>
          {loading ? "Aplicando..." : "⚡ Aplicar Ajuste"}
        </button>
      </div>
    </form>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────
export default function ControlStock() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tanques, setTanques] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [activeTab, setActiveTab] = useState("tanques");
  const [modalMedicion, setModalMedicion] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [filtroTanque, setFiltroTanque] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ta, me, mo] = await Promise.all([
        apiFetch("/api/surtidor/tanques"),
        apiFetch("/api/surtidor/mediciones?limit=100"),
        apiFetch("/api/surtidor/movimientos-stock?limit=200"),
      ]);
      setTanques(ta); setMediciones(me); setMovimientos(mo);
    } catch (e) {
      showToast("Error cargando stock: " + e.message, "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMedicion = async (data) => {
    await apiFetch("/api/surtidor/mediciones", { method: "POST", body: JSON.stringify(data) });
    showToast("Medición registrada");
    load();
  };

  const handleAjuste = async (data) => {
    await apiFetch("/api/surtidor/ajuste-stock", { method: "POST", body: JSON.stringify(data) });
    showToast("Ajuste aplicado");
    load();
  };

  const movsF = filtroTanque
    ? movimientos.filter(m => m.tanque_id === Number(filtroTanque))
    : movimientos;

  const tipoMov = { entrada: { label: "Entrada", color: "#10b981", icon: "▲" }, salida: { label: "Salida", color: "#ef4444", icon: "▼" }, ajuste: { label: "Ajuste", color: "#f59e0b", icon: "⚡" } };

  if (loading) return <div className="module-loading"><div className="dash-spinner" /><p>Cargando stock...</p></div>;

  return (
    <div className="control-stock">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {modalMedicion && (
        <Modal title="Registrar Medición Manual" onClose={() => setModalMedicion(false)}>
          <MedicionForm tanques={tanques} onSave={handleMedicion} onClose={() => setModalMedicion(false)} />
        </Modal>
      )}
      {modalAjuste && (
        <Modal title="Ajuste de Stock" onClose={() => setModalAjuste(false)}>
          <AjusteForm tanques={tanques} onSave={handleAjuste} onClose={() => setModalAjuste(false)} />
        </Modal>
      )}

      <div className="stock-header">
        <div>
          <h2>🛢️ Control de Stock</h2>
          <p>Niveles en tiempo real, mediciones manuales y trazabilidad de movimientos</p>
        </div>
        <div className="stock-actions">
          <button className="btn btn-secondary" onClick={load}>🔄 Actualizar</button>
          <button className="btn btn-secondary" onClick={() => setModalMedicion(true)} id="btn-nueva-medicion">📏 Medición Manual</button>
          <button className="btn btn-danger btn-sm" onClick={() => setModalAjuste(true)} id="btn-ajuste-stock">⚡ Ajuste</button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="stock-kpis">
        {[
          { label: "Tanques OK", value: tanques.filter(t => t.estado_stock === "ok" || t.estado_stock === "lleno").length, color: "#10b981" },
          { label: "Bajo stock", value: tanques.filter(t => t.estado_stock === "bajo").length, color: "#f59e0b" },
          { label: "Críticos", value: tanques.filter(t => t.estado_stock === "critico").length, color: "#ef4444" },
          { label: "Total tanques", value: tanques.length, color: "#2563eb" },
        ].map((k, i) => (
          <div key={i} className="stock-kpi" style={{ borderLeftColor: k.color }}>
            <span style={{ color: k.color, fontSize: "1.5rem", fontWeight: 700 }}>{k.value}</span>
            <span>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="conc-tabs">
        {[["tanques", "🛢️ Tanques"], ["mediciones", "📏 Mediciones"], ["movimientos", "📋 Movimientos"]].map(([id, label]) => (
          <button key={id} className={`config-tab ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)} id={`tab-stock-${id}`}>{label}</button>
        ))}
      </div>

      {/* TAB: Tanques */}
      {activeTab === "tanques" && (
        <div className="tanks-display-grid">
          {tanques.map(t => <TankVisual key={t.id} tanque={t} />)}
          {tanques.length === 0 && (
            <div className="empty-state">No hay tanques. Configure tanques en ⚙️ Configuración del Surtidor.</div>
          )}
        </div>
      )}

      {/* TAB: Mediciones */}
      {activeTab === "mediciones" && (
        <div className="table-container">
          <table id="tabla-mediciones">
            <thead>
              <tr><th>Fecha/Hora</th><th>Tanque</th><th>Litros Medidos</th><th>Stock Sistema</th><th>Diferencia</th><th>Método</th><th>Registrado por</th></tr>
            </thead>
            <tbody>
              {mediciones.map(m => {
                const dif = Number(m.litros_medidos) - Number(m.stock_sistema_al_momento);
                return (
                  <tr key={m.id}>
                    <td>{fmtDate(m.fecha_hora)}</td>
                    <td>{m.tanque?.nombre || `#${m.tanque_id}`}</td>
                    <td><strong>{fmtL(m.litros_medidos)}</strong></td>
                    <td>{fmtL(m.stock_sistema_al_momento)}</td>
                    <td>
                      <span style={{ color: Math.abs(dif) > 100 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                        {dif > 0 ? "+" : ""}{Number(dif).toFixed(1)} L
                      </span>
                    </td>
                    <td>{m.metodo}</td>
                    <td>{m.registrado_por_nombre || `#${m.registrado_por}`}</td>
                  </tr>
                );
              })}
              {mediciones.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                  No hay mediciones manuales. Use "📏 Medición Manual" para registrar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Movimientos */}
      {activeTab === "movimientos" && (
        <>
          <div className="mov-filtros">
            <label>Filtrar por tanque:</label>
            <select value={filtroTanque} onChange={e => setFiltroTanque(e.target.value)}>
              <option value="">Todos</option>
              {tanques.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <span className="filtro-totales">Mostrando {movsF.length} movimientos</span>
          </div>
          <div className="table-container">
            <table id="tabla-movimientos-stock">
              <thead>
                <tr><th>Fecha/Hora</th><th>Tanque</th><th>Tipo</th><th>Litros</th><th>Stock Ant.</th><th>Stock Post.</th><th>Referencia</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {movsF.map(m => {
                  const ti = tipoMov[m.tipo] || { label: m.tipo, color: "#64748b", icon: "●" };
                  return (
                    <tr key={m.id}>
                      <td>{fmtDate(m.fecha_hora)}</td>
                      <td>{m.tanque?.nombre || `#${m.tanque_id}`}</td>
                      <td>
                        <span className="tipo-badge" style={{ color: ti.color, background: ti.color + "18" }}>
                          {ti.icon} {ti.label}
                        </span>
                      </td>
                      <td style={{ color: m.tipo === "salida" ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                        {m.tipo === "salida" ? "-" : "+"}{fmtL(m.litros)}
                      </td>
                      <td>{fmtL(m.stock_anterior)}</td>
                      <td><strong>{fmtL(m.stock_posterior)}</strong></td>
                      <td><code style={{ fontSize: "0.78rem" }}>{m.referencia || "—"}</code></td>
                      <td>{m.motivo || "—"}</td>
                    </tr>
                  );
                })}
                {movsF.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Sin movimientos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
