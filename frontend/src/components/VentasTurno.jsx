// VentasTurno.jsx
// Módulo de Ventas por turno + Gestión de apertura/cierre de turnos

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./VentasTurno.css";

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

function fmtGs(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);
}
function fmtL(n) {
  return `${Number(n || 0).toLocaleString("es-PY", { maximumFractionDigits: 3 })} L`;
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── MODAL ───────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${wide ? "modal-wide" : ""}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  return { toast, show };
}

// ─── ABRIR TURNO ─────────────────────────────
function AbrirTurnoForm({ configs, onSave, onClose }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ config_turno_id: configs[0]?.id || "", fecha: hoy });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try { await onSave({ ...form, config_turno_id: Number(form.config_turno_id) }); onClose(); }
    catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="config-form">
      <div className="form-group">
        <label className="form-label">Tipo de Turno *</label>
        <select required value={form.config_turno_id} onChange={e => setForm({ ...form, config_turno_id: e.target.value })}>
          <option value="">-- Seleccionar --</option>
          {configs.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre} — {c.hora_inicio} ({c.duracion_horas}hs)
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha *</label>
        <input type="date" required value={form.fecha}
          onChange={e => setForm({ ...form, fecha: e.target.value })} />
      </div>
      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-confirmar-abrir-turno">
          {loading ? "Abriendo..." : "✅ Abrir Turno"}
        </button>
      </div>
    </form>
  );
}

// ─── ASIGNAR PERSONAL ────────────────────────
function AsignarPersonalPanel({ turnoId, asignaciones, personal, onAsignar, onRemover }) {
  const [personaId, setPersonaId] = useState("");
  const [rolTurno, setRolTurno] = useState("playero");
  const [loading, setLoading] = useState(false);

  const asignados = asignaciones.map(a => a.personal_id);

  const handleAdd = async () => {
    if (!personaId) return;
    setLoading(true);
    try { await onAsignar({ personal_id: Number(personaId), rol_turno: rolTurno }); setPersonaId(""); }
    catch (ex) { alert(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="asignar-panel">
      <h4>👷 Personal en este turno</h4>
      <div className="asignar-form">
        <select value={personaId} onChange={e => setPersonaId(e.target.value)} id="sel-personal-asignar">
          <option value="">-- Seleccionar playero --</option>
          {personal.filter(p => !asignados.includes(p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
          ))}
        </select>
        <select value={rolTurno} onChange={e => setRolTurno(e.target.value)}>
          <option value="playero">Playero</option>
          <option value="supervisor">Supervisor</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={loading || !personaId}>
          + Asignar
        </button>
      </div>
      <div className="asignados-list">
        {asignaciones.map(a => (
          <div key={a.id} className="asignado-chip">
            <span>👷 {a.personal?.apellido}, {a.personal?.nombre}</span>
            <span className="rol-badge">{a.rol_turno}</span>
            <button className="btn-remove" onClick={() => onRemover(a.personal_id)} title="Remover">✕</button>
          </div>
        ))}
        {asignaciones.length === 0 && <p className="no-asignados">Sin personal asignado</p>}
      </div>
    </div>
  );
}

// ─── FORMULARIO DE VENTA ─────────────────────
function VentaForm({ turnoId, picos, tanques, metodosPago, onSave, onClose }) {
  const [form, setForm] = useState({
    pico_id: "", tanque_id: "", metodo_pago_id: "", litros: "", precio_litro: "",
    nro_comprobante: "", observaciones: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Al seleccionar pico, pre-filtrar tanques compatibles
  const picosActivos = picos.filter(p => p.activo !== false);
  const picoSel = picosActivos.find(p => p.id === Number(form.pico_id));
  const tanquesCompatibles = picoSel
    ? tanques.filter(t => t.tipo_combustible_id === picoSel.tipo_combustible_id && t.activo !== false)
    : tanques.filter(t => t.activo !== false);

  const monto = form.litros && form.precio_litro
    ? (Number(form.litros) * Number(form.precio_litro)).toFixed(0)
    : "";

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await onSave({
        turno_id: turnoId,
        pico_id: Number(form.pico_id),
        tanque_id: Number(form.tanque_id),
        metodo_pago_id: Number(form.metodo_pago_id),
        litros: Number(form.litros),
        precio_litro: Number(form.precio_litro),
        nro_comprobante: form.nro_comprobante || undefined,
        observaciones: form.observaciones || undefined,
      });
      onClose();
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="venta-form">
      {/* Pico y Combustible */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Pico Expendedor *</label>
          <select required id="sel-pico" value={form.pico_id}
            onChange={e => setForm({ ...form, pico_id: e.target.value, tanque_id: "" })}>
            <option value="">-- Seleccionar pico --</option>
            {picos.map(p => (
              <option key={p.id} value={p.id}>
                Isla {p.isla?.numero || p.isla_id} — Pico {p.numero} ({p.tipo_combustible?.nombre || "?"})
              </option>
            ))}
          </select>
          {picoSel && (
            <div className="fuel-hint" style={{ background: (picoSel.tipo_combustible?.color_hex || "#888") + "22" }}>
              <span className="fuel-dot" style={{ background: picoSel.tipo_combustible?.color_hex }} />
              {picoSel.tipo_combustible?.nombre}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Tanque de origen *</label>
          <select required id="sel-tanque" value={form.tanque_id}
            onChange={e => setForm({ ...form, tanque_id: e.target.value })}>
            <option value="">-- Seleccionar tanque --</option>
            {tanquesCompatibles.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre} — Stock: {fmtL(t.stock_actual_litros)}
              </option>
            ))}
          </select>
          {tanquesCompatibles.length === 0 && form.pico_id && (
            <p className="warn-text">⚠️ No hay tanques compatibles con stock disponible</p>
          )}
        </div>
      </div>

      {/* Litros y Precio */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Litros despachados *</label>
          <input id="inp-litros" type="number" required step="0.001" min="0.001" placeholder="Ej: 30.500"
            value={form.litros} onChange={e => setForm({ ...form, litros: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Precio por litro (Gs.) *</label>
          <input id="inp-precio" type="number" required step="1" min="1" placeholder="Ej: 8500"
            value={form.precio_litro} onChange={e => setForm({ ...form, precio_litro: e.target.value })} />
        </div>
      </div>

      {/* Total */}
      {monto && (
        <div className="venta-total">
          <span>Total a cobrar:</span>
          <strong>{fmtGs(monto)}</strong>
        </div>
      )}

      {/* Método de pago */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Método de Pago *</label>
          <div className="metodos-grid" id="metodos-pago-grid">
            {metodosPago.map(m => (
              <button type="button" key={m.id}
                className={`metodo-btn ${form.metodo_pago_id === String(m.id) ? "selected" : ""} metodo-${m.tipo}`}
                onClick={() => setForm({ ...form, metodo_pago_id: String(m.id) })}>
                <span>{m.tipo === "efectivo" ? "💵" : "💳"}</span>
                {m.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">N° Comprobante</label>
          <input placeholder="Opcional" value={form.nro_comprobante}
            onChange={e => setForm({ ...form, nro_comprobante: e.target.value })} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea rows={2} placeholder="Opcional" value={form.observaciones}
          onChange={e => setForm({ ...form, observaciones: e.target.value })} />
      </div>

      {err && <div className="form-error">⚠️ {err}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading || !form.metodo_pago_id} id="btn-registrar-venta">
          {loading ? "Registrando..." : `✅ Registrar Venta — ${monto ? fmtGs(monto) : "..."}`}
        </button>
      </div>
    </form>
  );
}

// ─── RESUMEN DEL TURNO ────────────────────────
function ResumenTurno({ resumen }) {
  if (!resumen) return null;
  return (
    <div className="resumen-turno">
      <h4>📊 Resumen del Turno</h4>
      <div className="resumen-kpis">
        <div className="r-kpi">
          <span>Total Ventas</span>
          <strong>{fmtGs(resumen.total_ventas)}</strong>
        </div>
        <div className="r-kpi">
          <span>Litros Despachados</span>
          <strong>{fmtL(resumen.total_litros)}</strong>
        </div>
        <div className="r-kpi">
          <span>Efectivo</span>
          <strong style={{ color: "#10b981" }}>{fmtGs(resumen.ventas_efectivo)}</strong>
        </div>
        <div className="r-kpi">
          <span>Tarjetas</span>
          <strong style={{ color: "#8b5cf6" }}>{fmtGs(resumen.ventas_tarjeta)}</strong>
        </div>
        <div className="r-kpi">
          <span>Transacciones</span>
          <strong>{resumen.cantidad_transacciones}</strong>
        </div>
      </div>
      {resumen.por_tipo_combustible?.length > 0 && (
        <div className="resumen-desglose">
          <h5>Por Combustible</h5>
          {resumen.por_tipo_combustible.map((c, i) => (
            <div key={i} className="desglose-row">
              <span>{c.combustible}</span>
              <span>{fmtL(c.litros)}</span>
              <strong>{fmtGs(c.monto)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────
export default function VentasTurno() {
  const { toast, show: showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Catálogos
  const [turnosConfig, setTurnosConfig] = useState([]);
  const [picos, setPicos] = useState([]);
  const [tanques, setTanques] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Estado del turno activo
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [resumen, setResumen] = useState(null);

  // Ventas del turno
  const [ventas, setVentas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);

  // Modales
  const [showAbrirTurno, setShowAbrirTurno] = useState(false);
  const [showNuevaVenta, setShowNuevaVenta] = useState(false);
  const [showCerrarTurno, setShowCerrarTurno] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [anulando, setAnulando] = useState(null);
  const obsRef = useRef("");

  const loadCatalogos = useCallback(async () => {
    try {
      const [tc, p, t, mp, per] = await Promise.all([
        apiFetch("/api/surtidor/turnos-config"),
        apiFetch("/api/surtidor/picos"),
        apiFetch("/api/surtidor/tanques?activo=true"),
        apiFetch("/api/surtidor/metodos-pago"),
        apiFetch("/api/surtidor/personal?activo=true"),
      ]);
      setTurnosConfig(tc); setPicos(p); setTanques(t); setMetodosPago(mp); setPersonal(per);
    } catch (e) { showToast("Error cargando catálogos", "error"); }
  }, []);

  const loadTurnoActivo = useCallback(async () => {
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const lista = await apiFetch(`/api/surtidor/turnos?estado=abierto&fecha_desde=${hoy}&fecha_hasta=${hoy}`);
      if (lista.length > 0) {
        const t = lista[0];
        setTurnoActivo(t);
        setAsignaciones(t.asignaciones || []);
        // Cargar resumen y ventas
        loadVentas(t.id);
        loadResumen(t.id);
      } else {
        setTurnoActivo(null);
        setVentas([]);
        setResumen(null);
      }
    } catch (e) { showToast("Error verificando turno activo", "error"); }
  }, []);

  const loadVentas = async (turnoId) => {
    setLoadingVentas(true);
    try {
      const v = await apiFetch(`/api/surtidor/ventas?turno_id=${turnoId}&limit=200`);
      setVentas(v);
    } catch (e) { showToast("Error cargando ventas", "error"); }
    finally { setLoadingVentas(false); }
  };

  const loadResumen = async (turnoId) => {
    try {
      const r = await apiFetch(`/api/surtidor/turnos/${turnoId}/resumen`);
      setResumen(r);
    } catch (e) { /* silencioso */ }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCatalogos(), loadTurnoActivo()]);
      setLoading(false);
    })();
  }, [loadCatalogos, loadTurnoActivo]);

  // ── Handlers ──

  const handleAbrirTurno = async (data) => {
    await apiFetch("/api/surtidor/turnos", { method: "POST", body: JSON.stringify(data) });
    showToast("Turno abierto correctamente");
    loadTurnoActivo();
  };

  const handleCerrarTurno = async () => {
    if (!turnoActivo) return;
    try {
      await apiFetch(`/api/surtidor/turnos/${turnoActivo.id}/cerrar`, {
        method: "PUT",
        body: JSON.stringify({ observaciones: obsRef.current || undefined })
      });
      showToast("Turno cerrado correctamente");
      setShowCerrarTurno(false);
      loadTurnoActivo();
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleNuevaVenta = async (data) => {
    await apiFetch("/api/surtidor/ventas", { method: "POST", body: JSON.stringify(data) });
    showToast("Venta registrada");
    if (turnoActivo) { loadVentas(turnoActivo.id); loadResumen(turnoActivo.id); }
    // Recargar tanques para actualizar stock
    const t = await apiFetch("/api/surtidor/tanques?activo=true");
    setTanques(t);
  };

  const handleAnularVenta = async (ventaId) => {
    try {
      await apiFetch(`/api/surtidor/ventas/${ventaId}/anular`, { method: "PUT" });
      showToast("Venta anulada");
      setAnulando(null);
      if (turnoActivo) { loadVentas(turnoActivo.id); loadResumen(turnoActivo.id); }
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleAsignarPersonal = async (data) => {
    await apiFetch(`/api/surtidor/turnos/${turnoActivo.id}/asignar-personal`, {
      method: "POST", body: JSON.stringify(data)
    });
    showToast("Personal asignado");
    const lista = await apiFetch(`/api/surtidor/turnos?estado=abierto`);
    if (lista.length > 0) setAsignaciones(lista[0].asignaciones || []);
  };

  const handleRemoverPersonal = async (personalId) => {
    await apiFetch(`/api/surtidor/turnos/${turnoActivo.id}/asignar-personal/${personalId}`, { method: "DELETE" });
    showToast("Personal removido");
    const lista = await apiFetch(`/api/surtidor/turnos?estado=abierto`);
    if (lista.length > 0) setAsignaciones(lista[0].asignaciones || []);
  };

  if (loading) {
    return <div className="module-loading"><div className="dash-spinner" /><p>Cargando módulo de ventas...</p></div>;
  }

  const hoy = new Date().toLocaleDateString("es-PY", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="ventas-module">
      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✅" : "⚠️"} {toast.msg}</div>}

      {/* Confirmar anulación */}
      {anulando && (
        <div className="modal-overlay">
          <div className="confirm-box">
            <h4>⚠️ Anular venta</h4>
            <p>¿Confirma la anulación de la venta <strong>#{anulando.id}</strong> por {fmtGs(anulando.monto_total)}?</p>
            <p className="confirm-warn">El stock del tanque será reintegrado automáticamente.</p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setAnulando(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleAnularVenta(anulando.id)}>Confirmar Anulación</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar cierre */}
      {showCerrarTurno && (
        <div className="modal-overlay">
          <div className="confirm-box">
            <h4>🔒 Cerrar Turno</h4>
            <p>¿Confirma el cierre del turno <strong>{turnoActivo?.config_turno?.nombre}</strong>?</p>
            {resumen && (
              <div className="cierre-resumen">
                <div>Total ventas: <strong>{fmtGs(resumen.total_ventas)}</strong></div>
                <div>Litros: <strong>{fmtL(resumen.total_litros)}</strong></div>
                <div>Efectivo: <strong>{fmtGs(resumen.ventas_efectivo)}</strong></div>
                <div>Tarjetas: <strong>{fmtGs(resumen.ventas_tarjeta)}</strong></div>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Observaciones de cierre</label>
              <textarea rows={2} onChange={e => { obsRef.current = e.target.value; }} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowCerrarTurno(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleCerrarTurno} id="btn-confirmar-cierre">
                🔒 Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abrir Turno */}
      {showAbrirTurno && (
        <Modal title="Abrir Turno" onClose={() => setShowAbrirTurno(false)}>
          <AbrirTurnoForm configs={turnosConfig} onSave={handleAbrirTurno} onClose={() => setShowAbrirTurno(false)} />
        </Modal>
      )}

      {/* Modal Personal */}
      {showPersonal && turnoActivo && (
        <Modal title="Personal del Turno" onClose={() => setShowPersonal(false)}>
          <AsignarPersonalPanel
            turnoId={turnoActivo.id}
            asignaciones={asignaciones}
            personal={personal}
            onAsignar={handleAsignarPersonal}
            onRemover={handleRemoverPersonal}
          />
        </Modal>
      )}

      {/* Modal Nueva Venta */}
      {showNuevaVenta && turnoActivo && (
        <Modal title="Nueva Venta" onClose={() => setShowNuevaVenta(false)} wide>
          <VentaForm
            turnoId={turnoActivo.id}
            picos={picos}
            tanques={tanques}
            metodosPago={metodosPago}
            onSave={handleNuevaVenta}
            onClose={() => setShowNuevaVenta(false)}
          />
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="ventas-header">
        <div>
          <h2>💰 Ventas por Turno</h2>
          <p className="ventas-fecha">{hoy}</p>
        </div>
        <div className="ventas-header-actions">
          {turnoActivo ? (
            <>
              <div className="turno-activo-chip">
                <span className="turno-activo-dot" />
                <span><strong>{turnoActivo.config_turno?.nombre}</strong> — Abierto desde {fmtDate(turnoActivo.fecha_hora_apertura)}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPersonal(true)} id="btn-personal-turno">
                👷 Personal ({asignaciones.length})
              </button>
              <button className="btn btn-primary" onClick={() => setShowNuevaVenta(true)} id="btn-nueva-venta">
                + Nueva Venta
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowCerrarTurno(true)} id="btn-cerrar-turno">
                🔒 Cerrar Turno
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAbrirTurno(true)} id="btn-abrir-turno">
              ✅ Abrir Turno
            </button>
          )}
        </div>
      </div>

      {/* ── Sin turno activo ── */}
      {!turnoActivo && (
        <div className="sin-turno">
          <div className="sin-turno-icon">🔒</div>
          <h3>No hay turno activo</h3>
          <p>Para registrar ventas, primero debe abrir un turno de trabajo.</p>
          <button className="btn btn-primary" onClick={() => setShowAbrirTurno(true)}>
            ✅ Abrir Turno Ahora
          </button>
        </div>
      )}

      {/* ── Con turno activo ── */}
      {turnoActivo && (
        <div className="ventas-body">
          {/* Resumen */}
          <ResumenTurno resumen={resumen} />

          {/* Tabla de ventas */}
          <div className="ventas-tabla-wrap">
            <div className="ventas-tabla-header">
              <h3>📋 Ventas del Turno Actual</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => loadVentas(turnoActivo.id)}>
                🔄 Actualizar
              </button>
            </div>

            {loadingVentas ? (
              <div className="table-loading">Cargando ventas...</div>
            ) : (
              <div className="table-container">
                <table id="tabla-ventas-turno">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Hora</th>
                      <th>Pico</th>
                      <th>Combustible</th>
                      <th>Litros</th>
                      <th>Precio/L</th>
                      <th>Total</th>
                      <th>Pago</th>
                      <th>Reembolso</th>
                      <th>Comprobante</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr key={v.id} className={v.anulada ? "venta-anulada" : ""}>
                        <td><code>{v.id}</code></td>
                        <td>{fmtDate(v.fecha_hora)}</td>
                        <td>
                          {v.pico ? `Isla ${v.pico.isla?.numero || v.pico.isla_id} P${v.pico.numero}` : `#${v.pico_id}`}
                        </td>
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
                        <td>{fmtL(v.litros)}</td>
                        <td>{fmtGs(v.precio_litro)}</td>
                        <td><strong>{fmtGs(v.monto_total)}</strong></td>
                        <td>
                          <span className={`metodo-chip metodo-chip-${v.metodo_pago?.tipo}`}>
                            {v.metodo_pago?.tipo === "efectivo" ? "💵" : "💳"} {v.metodo_pago?.nombre || "—"}
                          </span>
                        </td>
                        <td>
                          {v.estado_reembolso === "na" ? <span className="badge-na">—</span>
                            : v.estado_reembolso === "pendiente" ? <span className="badge-pendiente">⏳ Pendiente</span>
                              : <span className="badge-ok">✅ Reembolsado</span>}
                        </td>
                        <td><code>{v.nro_comprobante || "—"}</code></td>
                        <td>
                          {!v.anulada ? (
                            <button className="action-btn action-btn-delete" title="Anular venta"
                              onClick={() => setAnulando(v)}>🗑️</button>
                          ) : (
                            <span className="badge-anulada">ANULADA</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {ventas.length === 0 && (
                      <tr><td colSpan="11" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                        Aún no hay ventas en este turno. Haga clic en "+ Nueva Venta".
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
