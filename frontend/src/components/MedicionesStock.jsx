// MedicionesStock.jsx
// Módulo de Mediciones Manuales — cotejo físico del nivel de tanques
import React, { useState, useEffect, useCallback } from "react";
import "./MedicionesStock.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;
const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const fmt = (v, dec = 1) =>
  v == null ? "—" : Number(v).toLocaleString("es-PY", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Semáforo de desvío
function DesvioIndicator({ diferencia, litrosSistema }) {
  if (diferencia == null || litrosSistema == null || Number(litrosSistema) === 0) return <span className="ms-desvio-na">—</span>;
  const pct = Math.abs(Number(diferencia) / Number(litrosSistema)) * 100;
  const sign = Number(diferencia) >= 0 ? "+" : "";
  if (pct <= 1)  return <span className="ms-desvio ms-ok">●  {sign}{fmt(diferencia)} L ({fmt(pct)}%)</span>;
  if (pct <= 3)  return <span className="ms-desvio ms-warn">●  {sign}{fmt(diferencia)} L ({fmt(pct)}%)</span>;
  return             <span className="ms-desvio ms-danger">● {sign}{fmt(diferencia)} L ({fmt(pct)}%)</span>;
}

export default function MedicionesStock() {
  const [tanques, setTanques]         = useState([]);
  const [turnos, setTurnos]           = useState([]);
  const [mediciones, setMediciones]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Filtros
  const [filtroTanque, setFiltroTanque] = useState("");
  const [filtroLimit, setFiltroLimit]   = useState(50);

  // Modal nueva medición
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ tanque_id: "", litros_medidos: "", metodo_medicion: "varilla", turno_id: "", observaciones: "" });
  const [preview, setPreview] = useState(null);  // diferencia calculada en tiempo real
  const [saving, setSaving] = useState(false);

  // Modal ajuste de stock
  const [modalAjuste, setModalAjuste] = useState(null);   // medicion object
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [savingAjuste, setSavingAjuste] = useState(false);

  // ── fetch ──
  const fetchTanques = useCallback(async () => {
    const r = await fetch(`${API}/api/surtidor/tanques?activo=true`, { headers: headers() });
    setTanques(await r.json());
  }, []);

  const fetchTurnos = useCallback(async () => {
    const r = await fetch(`${API}/api/surtidor/turnos?estado=abierto`, { headers: headers() });
    const data = await r.json();
    setTurnos(data);
  }, []);

  const fetchMediciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: filtroLimit });
      if (filtroTanque) params.set("tanque_id", filtroTanque);
      const r = await fetch(`${API}/api/surtidor/mediciones?${params}`, { headers: headers() });
      if (!r.ok) throw new Error(await r.text());
      setMediciones(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtroTanque, filtroLimit]);

  useEffect(() => { fetchTanques(); fetchTurnos(); }, [fetchTanques, fetchTurnos]);
  useEffect(() => { fetchMediciones(); }, [fetchMediciones]);

  // Preview diferencia en tiempo real
  useEffect(() => {
    if (form.tanque_id && form.litros_medidos !== "") {
      const tanque = tanques.find((t) => t.id === Number(form.tanque_id));
      if (tanque) {
        const diff = Number(form.litros_medidos) - Number(tanque.stock_actual_litros);
        setPreview({ sistema: tanque.stock_actual_litros, diff });
      }
    } else {
      setPreview(null);
    }
  }, [form.tanque_id, form.litros_medidos, tanques]);

  // ── guardar medición ──
  const guardarMedicion = async () => {
    if (!form.tanque_id || form.litros_medidos === "") return;
    setSaving(true);
    try {
      const body = {
        tanque_id: Number(form.tanque_id),
        litros_medidos: Number(form.litros_medidos),
        metodo_medicion: form.metodo_medicion,
        turno_id: form.turno_id ? Number(form.turno_id) : null,
        observaciones: form.observaciones || null,
      };
      const r = await fetch(`${API}/api/surtidor/mediciones`, {
        method: "POST", headers: headers(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      setModal(false);
      setForm({ tanque_id: "", litros_medidos: "", metodo_medicion: "varilla", turno_id: "", observaciones: "" });
      setPreview(null);
      fetchMediciones();
    } catch (e) { alert("Error: " + e.message); }
    finally { setSaving(false); }
  };

  // ── ajuste de stock ──
  const aplicarAjuste = async () => {
    if (!modalAjuste) return;
    setSavingAjuste(true);
    const diff = Number(modalAjuste.litros_medidos) - Number(modalAjuste.litros_sistema);
    const tipo = diff >= 0 ? "entrada" : "salida";
    const litros = Math.abs(diff);
    try {
      const r = await fetch(`${API}/api/surtidor/ajuste-stock/body`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          tanque_id: modalAjuste.tanque_id,
          tipo,
          litros,
          motivo: ajusteMotivo || `Ajuste por medición manual #${modalAjuste.id}`,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setModalAjuste(null);
      setAjusteMotivo("");
      fetchTanques();
      fetchMediciones();
      alert("✅ Ajuste aplicado correctamente.");
    } catch (e) { alert("Error: " + e.message); }
    finally { setSavingAjuste(false); }
  };

  // ── tanque actual ──
  const tanqueActual = tanques.find((t) => t.id === Number(form.tanque_id));

  return (
    <div className="ms-container">
      {/* HEADER */}
      <div className="ms-header">
        <div>
          <h2 className="ms-title">📏 Mediciones Manuales</h2>
          <p className="ms-subtitle">Cotejo físico del nivel de tanques con el stock del sistema</p>
        </div>
        <button className="ms-btn-primary" onClick={() => setModal(true)}>+ Nueva Medición</button>
      </div>

      {/* ESTADO DE TANQUES */}
      <div className="ms-tanques-grid">
        {tanques.map((t) => {
          const pct = t.porcentaje_lleno ?? 0;
          const estado = t.estado_stock ?? "ok";
          return (
            <div key={t.id} className={`ms-tanque-card ms-tanque-${estado}`}>
              <div className="ms-tanque-header">
                <span className="ms-tanque-nombre">{t.nombre}</span>
                <span className={`ms-tank-badge ms-tank-${estado}`}>{estado.toUpperCase()}</span>
              </div>
              <div className="ms-tank-tipo">{t.tipo_combustible?.nombre}</div>
              <div className="ms-tank-level">
                <div className="ms-tank-bar-bg">
                  <div className="ms-tank-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: estado === "critico" ? "#ef4444" : estado === "bajo" ? "#f59e0b" : "#22c55e" }} />
                </div>
                <span className="ms-tank-pct">{fmt(pct, 1)}%</span>
              </div>
              <div className="ms-tank-litros">{fmt(t.stock_actual_litros)} L / {fmt(t.capacidad_litros)} L</div>
            </div>
          );
        })}
      </div>

      {/* FILTROS */}
      <div className="ms-filters">
        <h3 className="ms-section-title">Historial de Mediciones</h3>
        <div className="ms-filter-row">
          <select value={filtroTanque} onChange={(e) => setFiltroTanque(e.target.value)} className="ms-select ms-select-sm">
            <option value="">Todos los tanques</option>
            {tanques.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select value={filtroLimit} onChange={(e) => setFiltroLimit(Number(e.target.value))} className="ms-select ms-select-sm">
            <option value={20}>Últimas 20</option>
            <option value={50}>Últimas 50</option>
            <option value={100}>Últimas 100</option>
          </select>
          <button className="ms-btn-ghost ms-btn-sm" onClick={() => { setFiltroTanque(""); setFiltroLimit(50); }}>Limpiar</button>
        </div>
      </div>

      {/* TABLA MEDICIONES */}
      {loading && <div className="ms-loading">Cargando mediciones…</div>}
      {error && <div className="ms-error">⚠️ {error}</div>}

      {!loading && !error && (
        <div className="ms-table-wrap">
          <table className="ms-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha y Hora</th>
                <th>Tanque</th>
                <th>Medido (L)</th>
                <th>Sistema (L)</th>
                <th>Desvío</th>
                <th>Método</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mediciones.length === 0 && (
                <tr><td colSpan={8} className="ms-td-empty">Sin mediciones registradas</td></tr>
              )}
              {mediciones.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{fmtFecha(m.fecha_hora)}</td>
                  <td>
                    {tanques.find((t) => t.id === m.tanque_id)?.nombre ?? `Tanque #${m.tanque_id}`}
                  </td>
                  <td>{fmt(m.litros_medidos)}</td>
                  <td>{fmt(m.litros_sistema)}</td>
                  <td><DesvioIndicator diferencia={m.diferencia_litros ?? (Number(m.litros_medidos) - Number(m.litros_sistema))} litrosSistema={m.litros_sistema} /></td>
                  <td><span className="ms-metodo-tag">{m.metodo_medicion}</span></td>
                  <td>
                    {Math.abs(Number(m.litros_medidos) - Number(m.litros_sistema)) > 0.5 && (
                      <button className="ms-btn-link" onClick={() => { setModalAjuste(m); setAjusteMotivo(""); }}>
                        Ajustar stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL NUEVA MEDICIÓN ── */}
      {modal && (
        <div className="ms-overlay" onClick={() => setModal(false)}>
          <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ms-modal-title">📏 Nueva Medición Manual</h3>

            <div className="ms-form-grid">
              <label className="ms-label">
                Tanque *
                <select className="ms-select" value={form.tanque_id}
                  onChange={(e) => setForm({ ...form, tanque_id: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  {tanques.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre} — {fmt(t.stock_actual_litros)} L actuales</option>
                  ))}
                </select>
              </label>

              <label className="ms-label">
                Litros medidos *
                <input type="number" min="0" step="1" className="ms-input" value={form.litros_medidos}
                  onChange={(e) => setForm({ ...form, litros_medidos: e.target.value })}
                  placeholder="Ej: 12500" />
              </label>

              <label className="ms-label">
                Método de medición
                <select className="ms-select" value={form.metodo_medicion}
                  onChange={(e) => setForm({ ...form, metodo_medicion: e.target.value })}>
                  <option value="varilla">Varilla</option>
                  <option value="sensor">Sensor electrónico</option>
                  <option value="visual">Visual</option>
                  <option value="otro">Otro</option>
                </select>
              </label>

              <label className="ms-label">
                Turno (opcional)
                <select className="ms-select" value={form.turno_id}
                  onChange={(e) => setForm({ ...form, turno_id: e.target.value })}>
                  <option value="">Sin turno</option>
                  {turnos.map((t) => (
                    <option key={t.id} value={t.id}>Turno #{t.id} — {t.config_turno?.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="ms-label" style={{ gridColumn: "1/-1" }}>
                Observaciones
                <textarea className="ms-textarea" rows={2} value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Opcional…" />
              </label>
            </div>

            {/* Preview diferencia */}
            {preview && (
              <div className={`ms-preview ${Math.abs(preview.diff / Number(tanqueActual?.stock_actual_litros || 1)) > 0.03 ? "ms-preview-danger" : Math.abs(preview.diff / Number(tanqueActual?.stock_actual_litros || 1)) > 0.01 ? "ms-preview-warn" : "ms-preview-ok"}`}>
                <div className="ms-preview-row">
                  <span>Stock sistema:</span><strong>{fmt(preview.sistema)} L</strong>
                </div>
                <div className="ms-preview-row">
                  <span>Diferencia:</span>
                  <strong>{preview.diff >= 0 ? "+" : ""}{fmt(preview.diff)} L</strong>
                </div>
                {Number(preview.sistema) > 0 && (
                  <div className="ms-preview-row">
                    <span>Desvío %:</span>
                    <strong>{fmt(Math.abs(preview.diff / Number(preview.sistema)) * 100)}%</strong>
                  </div>
                )}
              </div>
            )}

            <div className="ms-modal-actions">
              <button className="ms-btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="ms-btn-primary" onClick={guardarMedicion}
                disabled={saving || !form.tanque_id || form.litros_medidos === ""}>
                {saving ? "Guardando…" : "Registrar Medición"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJUSTE DE STOCK ── */}
      {modalAjuste && (
        <div className="ms-overlay" onClick={() => setModalAjuste(null)}>
          <div className="ms-modal ms-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="ms-modal-title">⚖️ Ajuste de Stock</h3>
            <p className="ms-modal-desc">
              Se ajustará el stock del tanque para que coincida con la medición física.
            </p>
            <div className="ms-ajuste-info">
              <div className="ms-ajuste-row"><span>Tanque:</span><strong>{tanques.find((t) => t.id === modalAjuste.tanque_id)?.nombre}</strong></div>
              <div className="ms-ajuste-row"><span>Stock actual en sistema:</span><strong>{fmt(modalAjuste.litros_sistema)} L</strong></div>
              <div className="ms-ajuste-row"><span>Medición física:</span><strong>{fmt(modalAjuste.litros_medidos)} L</strong></div>
              <div className="ms-ajuste-row">
                <span>Ajuste a aplicar:</span>
                <strong className={Number(modalAjuste.litros_medidos) - Number(modalAjuste.litros_sistema) >= 0 ? "ms-color-green" : "ms-color-red"}>
                  {Number(modalAjuste.litros_medidos) - Number(modalAjuste.litros_sistema) >= 0 ? "+" : ""}
                  {fmt(Number(modalAjuste.litros_medidos) - Number(modalAjuste.litros_sistema))} L
                </strong>
              </div>
            </div>
            <label className="ms-label" style={{ marginTop: 16 }}>
              Motivo del ajuste
              <textarea className="ms-textarea" rows={2} value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
                placeholder={`Ajuste por medición manual #${modalAjuste.id}`} />
            </label>
            <div className="ms-modal-actions">
              <button className="ms-btn-ghost" onClick={() => setModalAjuste(null)}>Cancelar</button>
              <button className="ms-btn-warning" onClick={aplicarAjuste} disabled={savingAjuste}>
                {savingAjuste ? "Aplicando…" : "Aplicar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
