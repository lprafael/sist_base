// GestionTurnos.jsx
// Módulo de Gestión de Turnos del Sistema de Gestión de Surtidor
import React, { useState, useEffect, useCallback } from "react";
import "./GestionTurnos.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ─── helpers ─────────────────────────────────────────────────────
const fmt = (v) =>
  v == null ? "—" : Number(v).toLocaleString("es-PY", { minimumFractionDigits: 0 });
const fmtGs = (v) =>
  v == null ? "—" : `Gs. ${Number(v).toLocaleString("es-PY")}`;
const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const ESTADO_BADGE = {
  abierto: { label: "Abierto", cls: "badge-open" },
  cerrado:  { label: "Cerrado",  cls: "badge-closed" },
  anulado:  { label: "Anulado",  cls: "badge-cancelled" },
};

export default function GestionTurnos() {
  // ── state ──
  const [turnos, setTurnos]         = useState([]);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [configs, setConfigs]       = useState([]);
  const [personal, setPersonal]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // modales
  const [modalAbrir, setModalAbrir]     = useState(false);
  const [modalResumen, setModalResumen] = useState(null);   // turno_id
  const [resumenData, setResumenData]   = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);

  // filtros historial
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde]   = useState("");

  // form abrir turno
  const [formAbrir, setFormAbrir] = useState({ config_turno_id: "", fecha: new Date().toISOString().slice(0, 10), observaciones: "" });
  const [saving, setSaving]       = useState(false);

  // asignación personal
  const [asignando, setAsignando] = useState(null);   // turno_id
  const [selPersonal, setSelPersonal] = useState("");
  const [selRol, setSelRol]       = useState("playero");

  // cierre
  const [cerrando, setCerrando]   = useState(null);
  const [obsClose, setObsClose]   = useState("");

  // ── fetch ──
  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroDesde)  params.set("fecha_desde", filtroDesde);
      const r = await fetch(`${API}/api/surtidor/turnos?${params}`, { headers: headers() });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setTurnos(data);
      setTurnoActivo(data.find((t) => t.estado === "abierto") || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroEstado, filtroDesde]);

  const fetchCatalogos = useCallback(async () => {
    const [rConfigs, rPersonal] = await Promise.all([
      fetch(`${API}/api/surtidor/turnos-config`, { headers: headers() }),
      fetch(`${API}/api/surtidor/personal?activo=true`, { headers: headers() }),
    ]);
    setConfigs(await rConfigs.json());
    setPersonal(await rPersonal.json());
  }, []);

  useEffect(() => { fetchCatalogos(); }, [fetchCatalogos]);
  useEffect(() => { fetchTurnos(); }, [fetchTurnos]);

  // ── acciones ──
  const abrirTurno = async () => {
    if (!formAbrir.config_turno_id) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/surtidor/turnos`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ config_turno_id: Number(formAbrir.config_turno_id), fecha: formAbrir.fecha, observaciones: formAbrir.observaciones || null }),
      });
      if (!r.ok) throw new Error(await r.text());
      setModalAbrir(false);
      setFormAbrir({ config_turno_id: "", fecha: new Date().toISOString().slice(0, 10), observaciones: "" });
      fetchTurnos();
    } catch (e) { alert("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const cerrarTurno = async (id) => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/surtidor/turnos/${id}/cerrar`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ observaciones: obsClose || null }),
      });
      if (!r.ok) throw new Error(await r.text());
      setCerrando(null);
      setObsClose("");
      fetchTurnos();
    } catch (e) { alert("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const asignarPersonal = async (turnoId) => {
    if (!selPersonal) return;
    try {
      const r = await fetch(`${API}/api/surtidor/turnos/${turnoId}/asignar-personal`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ personal_id: Number(selPersonal), rol_turno: selRol }),
      });
      if (!r.ok) throw new Error(await r.text());
      setAsignando(null);
      setSelPersonal("");
      setSelRol("playero");
      fetchTurnos();
    } catch (e) { alert("Error: " + e.message); }
  };

  const removerPersonal = async (turnoId, personalId) => {
    if (!confirm("¿Quitar este playero del turno?")) return;
    const r = await fetch(`${API}/api/surtidor/turnos/${turnoId}/asignar-personal/${personalId}`, {
      method: "DELETE", headers: headers(),
    });
    if (r.ok) fetchTurnos();
  };

  const verResumen = async (turnoId) => {
    setModalResumen(turnoId);
    setResumenData(null);
    setLoadingResumen(true);
    try {
      const r = await fetch(`${API}/api/surtidor/turnos/${turnoId}/resumen`, { headers: headers() });
      setResumenData(await r.json());
    } catch { setResumenData(null); }
    finally { setLoadingResumen(false); }
  };

  // ── render ──
  return (
    <div className="gt-container">
      {/* HEADER */}
      <div className="gt-header">
        <div>
          <h2 className="gt-title">🔄 Gestión de Turnos</h2>
          <p className="gt-subtitle">Apertura, cierre y control del personal por turno</p>
        </div>
        <button
          className="gt-btn-primary"
          onClick={() => setModalAbrir(true)}
          disabled={!!turnoActivo}
          title={turnoActivo ? "Ya hay un turno abierto" : ""}
        >
          + Abrir Turno
        </button>
      </div>

      {/* TURNO ACTIVO */}
      {turnoActivo && (
        <div className="gt-card gt-card-active">
          <div className="gt-card-active-header">
            <div>
              <span className="gt-turno-nombre">{turnoActivo.config_turno?.nombre || "—"}</span>
              <span className={`gt-badge ${ESTADO_BADGE.abierto.cls}`}>● Abierto</span>
            </div>
            <div className="gt-card-active-actions">
              <button className="gt-btn-outline" onClick={() => verResumen(turnoActivo.id)}>Ver resumen</button>
              <button className="gt-btn-danger" onClick={() => { setCerrando(turnoActivo.id); setObsClose(""); }}>Cerrar turno</button>
            </div>
          </div>

          <div className="gt-active-meta">
            <span>📅 {turnoActivo.fecha}</span>
            <span>🕐 Apertura: {fmtFecha(turnoActivo.fecha_hora_apertura)}</span>
          </div>

          {/* Personal asignado */}
          <div className="gt-personal-section">
            <div className="gt-personal-header">
              <span className="gt-personal-title">👷 Personal asignado</span>
              <button className="gt-btn-sm" onClick={() => setAsignando(turnoActivo.id)}>+ Agregar</button>
            </div>
            {turnoActivo.asignaciones?.length === 0 && (
              <p className="gt-empty-small">Sin personal asignado aún</p>
            )}
            <div className="gt-chips">
              {turnoActivo.asignaciones?.map((a) => (
                <div key={a.id} className="gt-chip">
                  <span>{a.personal?.nombre_completo || `Personal #${a.personal_id}`}</span>
                  <span className="gt-chip-rol">{a.rol_turno}</span>
                  <button className="gt-chip-remove" onClick={() => removerPersonal(turnoActivo.id, a.personal_id)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Form asignar personal inline */}
          {asignando === turnoActivo.id && (
            <div className="gt-assign-form">
              <select value={selPersonal} onChange={(e) => setSelPersonal(e.target.value)} className="gt-select">
                <option value="">-- Seleccionar playero --</option>
                {personal.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                ))}
              </select>
              <select value={selRol} onChange={(e) => setSelRol(e.target.value)} className="gt-select">
                <option value="playero">Playero</option>
                <option value="supervisor">Supervisor</option>
              </select>
              <button className="gt-btn-primary gt-btn-sm" onClick={() => asignarPersonal(asignando)}>Asignar</button>
              <button className="gt-btn-ghost gt-btn-sm" onClick={() => setAsignando(null)}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* SIN TURNO ACTIVO */}
      {!turnoActivo && !loading && (
        <div className="gt-no-turno">
          <span>⚠️</span>
          <p>No hay turno abierto. Abra un nuevo turno para comenzar las operaciones del día.</p>
        </div>
      )}

      {/* FILTROS HISTORIAL */}
      <div className="gt-filters">
        <h3 className="gt-section-title">Historial de Turnos</h3>
        <div className="gt-filter-row">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="gt-select gt-select-sm">
            <option value="">Todos los estados</option>
            <option value="abierto">Abiertos</option>
            <option value="cerrado">Cerrados</option>
            <option value="anulado">Anulados</option>
          </select>
          <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="gt-input gt-input-sm" />
          <button className="gt-btn-ghost gt-btn-sm" onClick={() => { setFiltroEstado(""); setFiltroDesde(""); }}>Limpiar</button>
        </div>
      </div>

      {/* TABLA HISTORIAL */}
      {loading && <div className="gt-loading">Cargando turnos…</div>}
      {error && <div className="gt-error">⚠️ {error}</div>}

      {!loading && !error && (
        <div className="gt-table-wrap">
          <table className="gt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Turno</th>
                <th>Fecha</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Personal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 && (
                <tr><td colSpan={8} className="gt-td-empty">Sin turnos registrados</td></tr>
              )}
              {turnos.map((t) => {
                const est = ESTADO_BADGE[t.estado] || { label: t.estado, cls: "" };
                return (
                  <tr key={t.id} className={t.estado === "abierto" ? "gt-row-active" : ""}>
                    <td>{t.id}</td>
                    <td>{t.config_turno?.nombre || "—"}</td>
                    <td>{t.fecha}</td>
                    <td>{fmtFecha(t.fecha_hora_apertura)}</td>
                    <td>{fmtFecha(t.fecha_hora_cierre)}</td>
                    <td>
                      <span className="gt-personal-count">
                        {t.asignaciones?.length || 0} asignado(s)
                      </span>
                    </td>
                    <td><span className={`gt-badge ${est.cls}`}>{est.label}</span></td>
                    <td>
                      <button className="gt-btn-link" onClick={() => verResumen(t.id)}>Resumen</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: ABRIR TURNO ── */}
      {modalAbrir && (
        <div className="gt-overlay" onClick={() => setModalAbrir(false)}>
          <div className="gt-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="gt-modal-title">Abrir Nuevo Turno</h3>
            <div className="gt-form-grid">
              <label className="gt-label">
                Tipo de turno *
                <select className="gt-select" value={formAbrir.config_turno_id}
                  onChange={(e) => setFormAbrir({ ...formAbrir, config_turno_id: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.hora_inicio})</option>
                  ))}
                </select>
              </label>
              <label className="gt-label">
                Fecha *
                <input type="date" className="gt-input" value={formAbrir.fecha}
                  onChange={(e) => setFormAbrir({ ...formAbrir, fecha: e.target.value })} />
              </label>
              <label className="gt-label" style={{ gridColumn: "1/-1" }}>
                Observaciones
                <textarea className="gt-textarea" rows={2} value={formAbrir.observaciones}
                  onChange={(e) => setFormAbrir({ ...formAbrir, observaciones: e.target.value })}
                  placeholder="Opcional…" />
              </label>
            </div>
            <div className="gt-modal-actions">
              <button className="gt-btn-ghost" onClick={() => setModalAbrir(false)}>Cancelar</button>
              <button className="gt-btn-primary" onClick={abrirTurno} disabled={saving || !formAbrir.config_turno_id}>
                {saving ? "Abriendo…" : "Abrir Turno"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CERRAR TURNO ── */}
      {cerrando && (
        <div className="gt-overlay" onClick={() => setCerrando(null)}>
          <div className="gt-modal gt-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="gt-modal-title">⚠️ Cerrar Turno</h3>
            <p className="gt-modal-desc">Esta acción cierra el turno activo. No podrá registrar más ventas en él.</p>
            <label className="gt-label">
              Observaciones de cierre
              <textarea className="gt-textarea" rows={2} value={obsClose}
                onChange={(e) => setObsClose(e.target.value)} placeholder="Opcional…" />
            </label>
            <div className="gt-modal-actions">
              <button className="gt-btn-ghost" onClick={() => setCerrando(null)}>Cancelar</button>
              <button className="gt-btn-danger" onClick={() => cerrarTurno(cerrando)} disabled={saving}>
                {saving ? "Cerrando…" : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESUMEN TURNO ── */}
      {modalResumen && (
        <div className="gt-overlay" onClick={() => { setModalResumen(null); setResumenData(null); }}>
          <div className="gt-modal gt-modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="gt-modal-title">📊 Resumen del Turno #{modalResumen}</h3>
            {loadingResumen && <div className="gt-loading">Calculando…</div>}
            {resumenData && (
              <div className="gt-resumen">
                <div className="gt-resumen-kpis">
                  <div className="gt-kpi">
                    <span className="gt-kpi-label">Total Ventas</span>
                    <span className="gt-kpi-value">{fmtGs(resumenData.total_ventas)}</span>
                  </div>
                  <div className="gt-kpi">
                    <span className="gt-kpi-label">Litros Despachados</span>
                    <span className="gt-kpi-value">{fmt(resumenData.total_litros)} L</span>
                  </div>
                  <div className="gt-kpi">
                    <span className="gt-kpi-label">Efectivo</span>
                    <span className="gt-kpi-value gt-kpi-green">{fmtGs(resumenData.ventas_efectivo)}</span>
                  </div>
                  <div className="gt-kpi">
                    <span className="gt-kpi-label">Tarjeta</span>
                    <span className="gt-kpi-value gt-kpi-blue">{fmtGs(resumenData.ventas_tarjeta)}</span>
                  </div>
                  <div className="gt-kpi">
                    <span className="gt-kpi-label">Transacciones</span>
                    <span className="gt-kpi-value">{resumenData.cantidad_transacciones}</span>
                  </div>
                </div>

                {resumenData.por_tipo_combustible?.length > 0 && (
                  <div className="gt-resumen-table-wrap">
                    <h4 className="gt-sub-title">Por tipo de combustible</h4>
                    <table className="gt-table gt-table-sm">
                      <thead><tr><th>Combustible</th><th>Litros</th><th>Monto</th></tr></thead>
                      <tbody>
                        {resumenData.por_tipo_combustible.map((r, i) => (
                          <tr key={i}>
                            <td>{r.combustible}</td>
                            <td>{fmt(r.litros)} L</td>
                            <td>{fmtGs(r.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {resumenData.por_metodo_pago?.length > 0 && (
                  <div className="gt-resumen-table-wrap">
                    <h4 className="gt-sub-title">Por método de pago</h4>
                    <table className="gt-table gt-table-sm">
                      <thead><tr><th>Método</th><th>Cantidad</th><th>Monto</th></tr></thead>
                      <tbody>
                        {resumenData.por_metodo_pago.map((r, i) => (
                          <tr key={i}>
                            <td>{r.nombre}</td>
                            <td>{r.cantidad}</td>
                            <td>{fmtGs(r.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <div className="gt-modal-actions">
              <button className="gt-btn-primary" onClick={() => { setModalResumen(null); setResumenData(null); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
