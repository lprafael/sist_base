// ProyeccionStock.jsx
// Proyección de agotamiento de combustible + generación automática de pedidos

import React, { useState, useEffect, useCallback } from "react";
import "./ProyeccionStock.css";

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
const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

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

// ─── Barra de nivel visual ────────────────────
function NivelBar({ pct, estado }) {
  const colores = {
    critico: "#ef4444",
    bajo:    "#f59e0b",
    ok:      "#10b981",
  };
  const color = colores[estado] || "#10b981";

  return (
    <div className="nivel-bar-wrap">
      <div className="nivel-bar-track">
        <div className="nivel-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
        {/* Línea de stock mínimo al 20% para referencia visual */}
      </div>
      <span className="nivel-pct" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ─── Tarjeta de proyección por tanque ────────
function TanqueProyeccionCard({ proy, onPedido }) {
  const estado = proy.se_requiere_pedido
    ? (proy.dias_hasta_minimo !== null && proy.dias_hasta_minimo <= 2 ? "critico" : "bajo")
    : "ok";

  const pct = proy.venta_promedio_diaria > 0 && proy.stock_actual > 0
    ? Math.min((Number(proy.stock_actual) / (proy.stock_minimo * 5)) * 100, 100)
    : (Number(proy.stock_actual) > 0 ? 60 : 0);

  const urgenciaLabel = estado === "critico" ? "🔴 URGENTE" : estado === "bajo" ? "🟡 PEDIDO RECOMENDADO" : "🟢 STOCK OK";

  const diasLabel = proy.dias_hasta_minimo != null
    ? `${Math.max(0, Math.floor(proy.dias_hasta_minimo))} días hasta stock mínimo`
    : "Sin datos de venta para proyectar";

  return (
    <div className={`proy-card proy-card-${estado}`}>
      <div className="proy-card-header">
        <div className="proy-nombre">
          <div className="proy-dot"
            style={{ background: estado === "critico" ? "#ef4444" : estado === "bajo" ? "#f59e0b" : "#10b981" }} />
          <span>{proy.nombre_tanque}</span>
        </div>
        <span className={`proy-badge proy-badge-${estado}`}>{urgenciaLabel}</span>
      </div>

      <div className="proy-combustible">{proy.tipo_combustible}</div>

      <NivelBar pct={pct} estado={estado} />

      <div className="proy-stats">
        <div className="proy-stat">
          <span>Stock actual</span>
          <strong>{fmtL(proy.stock_actual)}</strong>
        </div>
        <div className="proy-stat">
          <span>Stock mínimo</span>
          <strong style={{ color: "#f59e0b" }}>{fmtL(proy.stock_minimo)}</strong>
        </div>
        <div className="proy-stat">
          <span>Venta promedio/día</span>
          <strong>{proy.venta_promedio_diaria > 0 ? fmtL(proy.venta_promedio_diaria) : "Sin historial"}</strong>
        </div>
        {proy.dias_hasta_minimo != null && (
          <div className="proy-stat">
            <span>Fecha estimada mínimo</span>
            <strong style={{ color: estado !== "ok" ? "#ef4444" : "#1e293b" }}>
              {fmtDate(proy.fecha_minimo_estimada)}
            </strong>
          </div>
        )}
      </div>

      <div className="proy-timeline">
        <span className="proy-dias-label">{diasLabel}</span>
        {proy.dias_hasta_minimo != null && (
          <div className="proy-timeline-bar">
            {[0, 1, 2, 3, 5, 7, 14].map(d => (
              <div
                key={d}
                className={`proy-day-mark ${proy.dias_hasta_minimo <= d ? "past" : "future"}`}
                title={`Día ${d}`}
              />
            ))}
          </div>
        )}
      </div>

      {proy.se_requiere_pedido && (
        <div className="proy-accion">
          <div className="proy-litros-pedir">
            Litros a pedir: <strong>{fmtL(proy.litros_a_pedir)}</strong>
          </div>
          <button className="btn btn-primary btn-sm proy-btn-pedido" id={`btn-pedido-${proy.tanque_id}`}
            onClick={() => onPedido(proy)}>
            📦 Generar Pedido
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Form de pedido ───────────────────────────
function PedidoForm({ proy, proveedores, onSave, onClose }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    tipo_combustible_id: proy?.tanque_id || "",  // Se mapea desde el tanque
    tanque_id: proy?.tanque_id || "",
    proveedor_id: proveedores[0]?.id || "",
    litros_solicitados: proy?.litros_a_pedir ? Math.ceil(Number(proy.litros_a_pedir)) : "",
    precio_litro_estimado: "",
    fecha_pedido: hoy,
    fecha_entrega_estimada: "",
    observaciones: proy ? `Pedido generado automáticamente para ${proy.nombre_tanque} — ${proy.tipo_combustible}` : ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({
        ...form,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : undefined,
        tanque_id: form.tanque_id ? Number(form.tanque_id) : undefined,
        litros_solicitados: Number(form.litros_solicitados),
        precio_litro_estimado: form.precio_litro_estimado ? Number(form.precio_litro_estimado) : undefined,
      });
      onClose();
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      {proy && (
        <div className="pedido-proy-info">
          <span>🛢️ {proy.nombre_tanque}</span>
          <span>Combustible: <strong>{proy.tipo_combustible}</strong></span>
          <span>Stock actual: <strong>{fmtL(proy.stock_actual)}</strong></span>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Litros Solicitados *</label>
          <input id="inp-litros-pedido" type="number" required min="1" value={form.litros_solicitados}
            onChange={e => setForm({ ...form, litros_solicitados: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Precio/Litro Estimado (Gs.)</label>
          <input type="number" min="0" value={form.precio_litro_estimado}
            onChange={e => setForm({ ...form, precio_litro_estimado: e.target.value })}
            placeholder="Opcional" />
          {form.litros_solicitados && form.precio_litro_estimado && (
            <span className="form-hint">
              Total estimado: {fmtGs(Number(form.litros_solicitados) * Number(form.precio_litro_estimado))}
            </span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Proveedor</label>
          <select value={form.proveedor_id}
            onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
            <option value="">— Sin asignar —</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha del Pedido *</label>
          <input type="date" required value={form.fecha_pedido}
            onChange={e => setForm({ ...form, fecha_pedido: e.target.value })} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Fecha de Entrega Estimada</label>
        <input type="date" value={form.fecha_entrega_estimada}
          onChange={e => setForm({ ...form, fecha_entrega_estimada: e.target.value })} />
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea rows={2} value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })} />
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-confirmar-pedido">
          {loading ? "Generando..." : "📦 Generar Pedido"}
        </button>
      </div>
    </form>
  );
}

// ─── Historial de pedidos ─────────────────────
function HistorialPedidos({ pedidos, onCambiarEstado }) {
  const estados = { pendiente: "⏳ Pendiente", aprobado: "✅ Aprobado", entregado: "🚚 Entregado", cancelado: "❌ Cancelado" };
  const colores = { pendiente: "#f59e0b", aprobado: "#2563eb", entregado: "#10b981", cancelado: "#ef4444" };

  return (
    <div className="table-container">
      <table id="tabla-pedidos-combustible">
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha Pedido</th>
            <th>Combustible</th>
            <th>Litros</th>
            <th>Precio/L</th>
            <th>Total Est.</th>
            <th>Proveedor</th>
            <th>Entrega Est.</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <tr key={p.id}>
              <td><code>{p.id}</code></td>
              <td>{fmtDate(p.fecha_pedido)}</td>
              <td>{p.tipo_combustible_id}</td>
              <td>{fmtL(p.litros_solicitados)}</td>
              <td>{p.precio_litro_estimado ? fmtGs(p.precio_litro_estimado) : "—"}</td>
              <td>
                {p.litros_solicitados && p.precio_litro_estimado
                  ? fmtGs(Number(p.litros_solicitados) * Number(p.precio_litro_estimado))
                  : "—"}
              </td>
              <td>{p.proveedor?.razon_social || "—"}</td>
              <td>{fmtDate(p.fecha_entrega_estimada)}</td>
              <td>
                <span className="pedido-estado-chip" style={{ color: colores[p.estado], background: colores[p.estado] + "22" }}>
                  {estados[p.estado] || p.estado}
                </span>
              </td>
              <td>
                <div className="actions-cell">
                  {p.estado === "pendiente" && (
                    <button className="btn btn-primary btn-xs" onClick={() => onCambiarEstado(p.id, "aprobado")}>✅ Aprobar</button>
                  )}
                  {p.estado === "aprobado" && (
                    <button className="btn btn-secondary btn-xs" onClick={() => onCambiarEstado(p.id, "entregado")}>🚚 Entregado</button>
                  )}
                  {(p.estado === "pendiente" || p.estado === "aprobado") && (
                    <button className="action-btn action-btn-delete" onClick={() => onCambiarEstado(p.id, "cancelado")}>🗑️</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {pedidos.length === 0 && (
            <tr><td colSpan="10" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
              No hay pedidos registrados.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────
export default function ProyeccionStock() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proyecciones, setProyecciones] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [diasHistorial, setDiasHistorial] = useState(30);
  const [activeTab, setActiveTab] = useState("proyeccion");
  const [pedidoModal, setPedidoModal] = useState(null); // proy o null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, pe, pv] = await Promise.all([
        apiFetch(`/api/surtidor/proyeccion-stock?dias_historial=${diasHistorial}`),
        apiFetch("/api/surtidor/pedidos"),
        apiFetch("/api/surtidor/proveedores"),
      ]);
      setProyecciones(pr);
      setPedidos(pe);
      setProveedores(pv);
    } catch (e) {
      showToast("Error cargando proyección: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [diasHistorial]);

  useEffect(() => { load(); }, [load]);

  const handleGenerarPedido = async (data) => {
    // Necesitamos resolver el tipo_combustible_id desde el tanque
    const proy = proyecciones.find(p => p.tanque_id === data.tanque_id);
    // Buscar el tanque para obtener el tipo_combustible_id real
    const tanque = await apiFetch(`/api/surtidor/tanques/${data.tanque_id}`);
    const payload = {
      ...data,
      tipo_combustible_id: tanque.tipo_combustible_id,
      fecha_pedido: data.fecha_pedido,
    };
    delete payload.tipo_combustible_id_fake;
    await apiFetch("/api/surtidor/pedidos", { method: "POST", body: JSON.stringify(payload) });
    showToast("Pedido generado correctamente");
    load();
  };

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      await apiFetch(`/api/surtidor/pedidos/${pedidoId}/estado?estado=${nuevoEstado}`, { method: "PUT" });
      showToast(`Pedido marcado como ${nuevoEstado}`);
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const requierenPedido = proyecciones.filter(p => p.se_requiere_pedido);
  const criticos = proyecciones.filter(p => p.dias_hasta_minimo != null && p.dias_hasta_minimo <= 2);

  if (loading) {
    return <div className="module-loading"><div className="dash-spinner" /><p>Calculando proyecciones...</p></div>;
  }

  return (
    <div className="proyeccion-module">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {/* Modal pedido */}
      {pedidoModal && (
        <Modal title="Generar Pedido de Combustible" onClose={() => setPedidoModal(null)}>
          <PedidoForm
            proy={pedidoModal}
            proveedores={proveedores}
            onSave={handleGenerarPedido}
            onClose={() => setPedidoModal(null)}
          />
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="proy-header">
        <div>
          <h2>📈 Proyección de Stock</h2>
          <p>Análisis de venta promedio y estimación de agotamiento por tanque</p>
        </div>
        <div className="proy-header-actions">
          <div className="historial-selector">
            <label>📅 Historial de análisis:</label>
            <select value={diasHistorial}
              onChange={e => setDiasHistorial(Number(e.target.value))}
              id="sel-historial-dias">
              <option value="7">7 días</option>
              <option value="15">15 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={load}>🔄 Recalcular</button>
          <button className="btn btn-primary" onClick={() => setPedidoModal({})} id="btn-nuevo-pedido-manual">
            + Pedido Manual
          </button>
        </div>
      </div>

      {/* ── Alertas críticas ── */}
      {criticos.length > 0 && (
        <div className="proy-alertas">
          <strong>🔴 ATENCIÓN:</strong> {criticos.map(c => c.nombre_tanque).join(", ")} alcanzarán el stock mínimo en menos de 2 días.
          <button className="btn btn-danger btn-sm" onClick={() => requierenPedido.forEach(p => setPedidoModal(p))}>
            Generar todos los pedidos urgentes
          </button>
        </div>
      )}

      {/* ── Resumen ── */}
      <div className="proy-resumen">
        <div className="proy-res-item">
          <span>🛢️ Tanques analizados</span>
          <strong>{proyecciones.length}</strong>
        </div>
        <div className="proy-res-item proy-res-warn">
          <span>⚠️ Requieren pedido</span>
          <strong>{requierenPedido.length}</strong>
        </div>
        <div className="proy-res-item">
          <span>📦 Pedidos pendientes</span>
          <strong>{pedidos.filter(p => p.estado === "pendiente").length}</strong>
        </div>
        <div className="proy-res-item">
          <span>📅 Período analizado</span>
          <strong>{diasHistorial} días</strong>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="conc-tabs">
        <button className={`config-tab ${activeTab === "proyeccion" ? "active" : ""}`}
          onClick={() => setActiveTab("proyeccion")}>
          📈 Proyección por Tanque
        </button>
        <button className={`config-tab ${activeTab === "pedidos" ? "active" : ""}`}
          onClick={() => setActiveTab("pedidos")}>
          📦 Pedidos ({pedidos.length})
        </button>
      </div>

      {/* ── TAB: Proyección ── */}
      {activeTab === "proyeccion" && (
        <div className="proy-grid">
          {proyecciones.length > 0 ? (
            proyecciones.map(p => (
              <TanqueProyeccionCard key={p.tanque_id} proy={p} onPedido={setPedidoModal} />
            ))
          ) : (
            <div className="empty-proy">
              <span>🛢️</span>
              <h3>No hay datos de proyección</h3>
              <p>Asegúrese de tener tanques registrados y ventas registradas en el historial.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Pedidos ── */}
      {activeTab === "pedidos" && (
        <div className="conc-section">
          <HistorialPedidos pedidos={pedidos} onCambiarEstado={handleCambiarEstado} />
        </div>
      )}
    </div>
  );
}
