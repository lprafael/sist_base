// CuentasBancarias.jsx
// Módulo de Cuentas Bancarias y Depósitos del SGS
import React, { useState, useEffect, useCallback } from "react";
import "./CuentasBancarias.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;
const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const fmt = (v) => v == null ? "—" : Number(v).toLocaleString("es-PY");
const fmtGs = (v) => v == null ? "—" : `Gs. ${Number(v).toLocaleString("es-PY")}`;
const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

const TIPOS_CUENTA = ["corriente", "ahorro", "caja de ahorro"];
const MONEDAS = ["PYG", "USD", "BRL"];

export default function CuentasBancarias() {
  const [cuentas, setCuentas]       = useState([]);
  const [depositos, setDepositos]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [tab, setTab]               = useState("cuentas");   // "cuentas" | "depositos"

  // saldo calculado por cuenta (suma depositos)
  const [saldos, setSaldos]         = useState({});

  // modal cuenta
  const [modalCuenta, setModalCuenta] = useState(false);
  const [editCuenta, setEditCuenta]   = useState(null);
  const [formCuenta, setFormCuenta]   = useState({ banco: "", nro_cuenta: "", titular: "", tipo: "corriente", moneda: "PYG", activo: true });
  const [savingCuenta, setSavingCuenta] = useState(false);

  // modal depósito
  const [modalDeposito, setModalDeposito] = useState(false);
  const [formDep, setFormDep] = useState({ cuenta_bancaria_id: "", monto: "", fecha_deposito: new Date().toISOString().slice(0, 10), nro_boleta: "", observaciones: "" });
  const [savingDep, setSavingDep] = useState(false);

  // ── fetch ──
  const fetchCuentas = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/surtidor/cuentas-bancarias`, { headers: headers() });
      const data = await r.json();
      setCuentas(data);
    } catch { setCuentas([]); }
  }, []);

  const fetchDepositos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/surtidor/depositos`, { headers: headers() });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setDepositos(data);
      // Calcular saldo por cuenta
      const s = {};
      data.forEach((d) => {
        s[d.cuenta_bancaria_id] = (s[d.cuenta_bancaria_id] || 0) + Number(d.monto);
      });
      setSaldos(s);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCuentas(); fetchDepositos(); }, [fetchCuentas, fetchDepositos]);

  // ── guardar cuenta ──
  const guardarCuenta = async () => {
    setSavingCuenta(true);
    try {
      const url = editCuenta
        ? `${API}/api/surtidor/cuentas-bancarias/${editCuenta.id}`
        : `${API}/api/surtidor/cuentas-bancarias`;
      const method = editCuenta ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: headers(), body: JSON.stringify(formCuenta) });
      if (!r.ok) throw new Error(await r.text());
      setModalCuenta(false);
      setEditCuenta(null);
      setFormCuenta({ banco: "", nro_cuenta: "", titular: "", tipo: "corriente", moneda: "PYG", activo: true });
      fetchCuentas();
    } catch (e) { alert("Error: " + e.message); }
    finally { setSavingCuenta(false); }
  };

  const editarCuenta = (c) => {
    setEditCuenta(c);
    setFormCuenta({ banco: c.banco, nro_cuenta: c.nro_cuenta, titular: c.titular || "", tipo: c.tipo, moneda: c.moneda, activo: c.activo });
    setModalCuenta(true);
  };

  // ── guardar depósito ──
  const guardarDeposito = async () => {
    if (!formDep.cuenta_bancaria_id || !formDep.monto || !formDep.fecha_deposito) return;
    setSavingDep(true);
    try {
      const body = {
        cuenta_bancaria_id: Number(formDep.cuenta_bancaria_id),
        monto: Number(formDep.monto),
        fecha_deposito: formDep.fecha_deposito,
        nro_boleta: formDep.nro_boleta || null,
        observaciones: formDep.observaciones || null,
      };
      const r = await fetch(`${API}/api/surtidor/depositos`, {
        method: "POST", headers: headers(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      setModalDeposito(false);
      setFormDep({ cuenta_bancaria_id: "", monto: "", fecha_deposito: new Date().toISOString().slice(0, 10), nro_boleta: "", observaciones: "" });
      fetchDepositos();
    } catch (e) { alert("Error: " + e.message); }
    finally { setSavingDep(false); }
  };

  const cuentaNombre = (id) => {
    const c = cuentas.find((x) => x.id === Number(id));
    return c ? `${c.banco} — ${c.nro_cuenta}` : `Cuenta #${id}`;
  };

  return (
    <div className="cb-container">
      {/* HEADER */}
      <div className="cb-header">
        <div>
          <h2 className="cb-title">🏦 Cuentas Bancarias</h2>
          <p className="cb-subtitle">Administración de cuentas y registro de depósitos</p>
        </div>
        <div className="cb-header-actions">
          {tab === "cuentas" && (
            <button className="cb-btn-primary" onClick={() => { setEditCuenta(null); setFormCuenta({ banco: "", nro_cuenta: "", titular: "", tipo: "corriente", moneda: "PYG", activo: true }); setModalCuenta(true); }}>
              + Nueva Cuenta
            </button>
          )}
          {tab === "depositos" && (
            <button className="cb-btn-primary" onClick={() => { setFormDep({ cuenta_bancaria_id: "", monto: "", fecha_deposito: new Date().toISOString().slice(0, 10), nro_boleta: "", observaciones: "" }); setModalDeposito(true); }}
              disabled={cuentas.length === 0}>
              + Registrar Depósito
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS CUENTAS */}
      <div className="cb-kpi-grid">
        {cuentas.map((c) => (
          <div key={c.id} className="cb-kpi-card">
            <div className="cb-kpi-top">
              <div>
                <div className="cb-kpi-banco">{c.banco}</div>
                <div className="cb-kpi-nro">{c.nro_cuenta}</div>
              </div>
              <span className={`cb-tipo-badge cb-tipo-${c.tipo.replace(/\s/g,"")}`}>{c.tipo}</span>
            </div>
            {c.titular && <div className="cb-kpi-titular">Titular: {c.titular}</div>}
            <div className="cb-kpi-saldo-label">Total depósitos registrados</div>
            <div className="cb-kpi-saldo">{c.moneda} {fmt(saldos[c.id] || 0)}</div>
            <div className="cb-kpi-moneda">{c.moneda}</div>
            <button className="cb-btn-link cb-edit-btn" onClick={() => editarCuenta(c)}>Editar ✏️</button>
          </div>
        ))}
        {cuentas.length === 0 && (
          <div className="cb-empty-kpi">No hay cuentas bancarias registradas.</div>
        )}
      </div>

      {/* TABS */}
      <div className="cb-tabs">
        <button className={`cb-tab ${tab === "cuentas" ? "cb-tab-active" : ""}`} onClick={() => setTab("cuentas")}>
          🏦 Cuentas ({cuentas.length})
        </button>
        <button className={`cb-tab ${tab === "depositos" ? "cb-tab-active" : ""}`} onClick={() => setTab("depositos")}>
          💵 Depósitos ({depositos.length})
        </button>
      </div>

      {/* ──── TAB: CUENTAS ──── */}
      {tab === "cuentas" && (
        <div className="cb-table-wrap">
          <table className="cb-table">
            <thead>
              <tr>
                <th>#</th><th>Banco</th><th>Nro. Cuenta</th><th>Titular</th>
                <th>Tipo</th><th>Moneda</th><th>Total Depósitos</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 && <tr><td colSpan={9} className="cb-td-empty">Sin cuentas registradas</td></tr>}
              {cuentas.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.banco}</strong></td>
                  <td className="cb-mono">{c.nro_cuenta}</td>
                  <td>{c.titular || "—"}</td>
                  <td><span className={`cb-tipo-badge cb-tipo-${c.tipo.replace(/\s/g,"")}`}>{c.tipo}</span></td>
                  <td>{c.moneda}</td>
                  <td className="cb-saldo-cell">{c.moneda} {fmt(saldos[c.id] || 0)}</td>
                  <td>
                    <span className={`cb-badge ${c.activo ? "cb-badge-active" : "cb-badge-inactive"}`}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td><button className="cb-btn-link" onClick={() => editarCuenta(c)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──── TAB: DEPÓSITOS ──── */}
      {tab === "depositos" && (
        <>
          {loading && <div className="cb-loading">Cargando depósitos…</div>}
          {error && <div className="cb-error">⚠️ {error}</div>}
          {!loading && !error && (
            <div className="cb-table-wrap">
              <table className="cb-table">
                <thead>
                  <tr>
                    <th>#</th><th>Fecha Depósito</th><th>Cuenta Destino</th>
                    <th>Nro. Boleta</th><th>Monto</th><th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {depositos.length === 0 && <tr><td colSpan={6} className="cb-td-empty">Sin depósitos registrados</td></tr>}
                  {depositos.map((d) => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td>{fmtFecha(d.fecha_deposito)}</td>
                      <td>{cuentaNombre(d.cuenta_bancaria_id)}</td>
                      <td className="cb-mono">{d.nro_boleta || "—"}</td>
                      <td className="cb-monto-cell">{fmtGs(d.monto)}</td>
                      <td className="cb-obs">{d.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total depósitos */}
              {depositos.length > 0 && (
                <div className="cb-table-footer">
                  <span>Total ({depositos.length} depósitos):</span>
                  <strong>{fmtGs(depositos.reduce((s, d) => s + Number(d.monto), 0))}</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL CUENTA ── */}
      {modalCuenta && (
        <div className="cb-overlay" onClick={() => setModalCuenta(false)}>
          <div className="cb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cb-modal-title">{editCuenta ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}</h3>
            <div className="cb-form-grid">
              <label className="cb-label">
                Banco *
                <input type="text" className="cb-input" value={formCuenta.banco}
                  onChange={(e) => setFormCuenta({ ...formCuenta, banco: e.target.value })}
                  placeholder="Ej: Banco Continental" />
              </label>
              <label className="cb-label">
                Nro. Cuenta *
                <input type="text" className="cb-input cb-mono-input" value={formCuenta.nro_cuenta}
                  onChange={(e) => setFormCuenta({ ...formCuenta, nro_cuenta: e.target.value })}
                  placeholder="Ej: 001-001234-5" />
              </label>
              <label className="cb-label">
                Titular
                <input type="text" className="cb-input" value={formCuenta.titular}
                  onChange={(e) => setFormCuenta({ ...formCuenta, titular: e.target.value })}
                  placeholder="Nombre del titular" />
              </label>
              <label className="cb-label">
                Tipo
                <select className="cb-select" value={formCuenta.tipo}
                  onChange={(e) => setFormCuenta({ ...formCuenta, tipo: e.target.value })}>
                  {TIPOS_CUENTA.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>
              <label className="cb-label">
                Moneda
                <select className="cb-select" value={formCuenta.moneda}
                  onChange={(e) => setFormCuenta({ ...formCuenta, moneda: e.target.value })}>
                  {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="cb-label cb-label-check">
                <input type="checkbox" checked={formCuenta.activo}
                  onChange={(e) => setFormCuenta({ ...formCuenta, activo: e.target.checked })} />
                Cuenta activa
              </label>
            </div>
            <div className="cb-modal-actions">
              <button className="cb-btn-ghost" onClick={() => setModalCuenta(false)}>Cancelar</button>
              <button className="cb-btn-primary" onClick={guardarCuenta}
                disabled={savingCuenta || !formCuenta.banco || !formCuenta.nro_cuenta}>
                {savingCuenta ? "Guardando…" : editCuenta ? "Guardar Cambios" : "Crear Cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DEPÓSITO ── */}
      {modalDeposito && (
        <div className="cb-overlay" onClick={() => setModalDeposito(false)}>
          <div className="cb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cb-modal-title">💵 Registrar Depósito</h3>
            <p className="cb-modal-desc">
              El monto se deducirá automáticamente del saldo de caja.
            </p>
            <div className="cb-form-grid">
              <label className="cb-label" style={{ gridColumn: "1/-1" }}>
                Cuenta destino *
                <select className="cb-select" value={formDep.cuenta_bancaria_id}
                  onChange={(e) => setFormDep({ ...formDep, cuenta_bancaria_id: e.target.value })}>
                  <option value="">Seleccionar cuenta…</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>{c.banco} — {c.nro_cuenta} ({c.moneda})</option>
                  ))}
                </select>
              </label>
              <label className="cb-label">
                Monto *
                <input type="number" min="1" step="1000" className="cb-input" value={formDep.monto}
                  onChange={(e) => setFormDep({ ...formDep, monto: e.target.value })}
                  placeholder="Ej: 500000" />
              </label>
              <label className="cb-label">
                Fecha del depósito *
                <input type="date" className="cb-input" value={formDep.fecha_deposito}
                  onChange={(e) => setFormDep({ ...formDep, fecha_deposito: e.target.value })} />
              </label>
              <label className="cb-label" style={{ gridColumn: "1/-1" }}>
                Nro. de boleta
                <input type="text" className="cb-input cb-mono-input" value={formDep.nro_boleta}
                  onChange={(e) => setFormDep({ ...formDep, nro_boleta: e.target.value })}
                  placeholder="Número de comprobante (opcional)" />
              </label>
              <label className="cb-label" style={{ gridColumn: "1/-1" }}>
                Observaciones
                <textarea className="cb-textarea" rows={2} value={formDep.observaciones}
                  onChange={(e) => setFormDep({ ...formDep, observaciones: e.target.value })}
                  placeholder="Opcional…" />
              </label>
            </div>
            {formDep.monto && (
              <div className="cb-dep-preview">
                💵 Se depositarán <strong>{fmtGs(formDep.monto)}</strong> en la cuenta seleccionada y se descontarán de caja.
              </div>
            )}
            <div className="cb-modal-actions">
              <button className="cb-btn-ghost" onClick={() => setModalDeposito(false)}>Cancelar</button>
              <button className="cb-btn-primary" onClick={guardarDeposito}
                disabled={savingDep || !formDep.cuenta_bancaria_id || !formDep.monto}>
                {savingDep ? "Registrando…" : "Registrar Depósito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
