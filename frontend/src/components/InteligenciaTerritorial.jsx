// InteligenciaTerritorial.jsx
// Módulo de Inteligencia Territorial con Social Listening e IA

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./InteligenciaTerritorial.css";

// Vacío = rutas relativas (/api/...) para que nginx haga proxy al backend en Docker
const API = import.meta.env.VITE_REACT_APP_API_URL ?? "";

// ── Helpers ──────────────────────────────────────────────────
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const SENTIMIENTO_COLOR = {
  Positivo: "#22c55e",
  Neutro: "#f59e0b",
  Negativo: "#ef4444",
};
const SENTIMIENTO_ICON = { Positivo: "😊", Neutro: "😐", Negativo: "😠" };

const CATEGORIAS = [
  "Salud", "Seguridad", "Infraestructura", "Educación",
  "Empleo", "Medio Ambiente", "Transporte", "Corrupción",
  "Servicios Públicos", "Otro",
];

function UrgenciaBar({ valor }) {
  const color =
    valor >= 8 ? "#ef4444" : valor >= 5 ? "#f59e0b" : "#22c55e";
  return (
    <div className="urgencia-bar-wrapper" title={`Urgencia: ${valor}/10`}>
      <div
        className="urgencia-bar"
        style={{ width: `${valor * 10}%`, background: color }}
      />
      <span className="urgencia-label">{valor}/10</span>
    </div>
  );
}

// Dropdown custom para que las opciones se vean con fondo oscuro y texto claro
function CustomTerritorySelect({ label, value, options, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.id) === String(value));
  const labelText = selected ? selected.descripcion : placeholder;

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="it-territory-select it-custom-select" ref={ref}>
      <label>{label}</label>
      <button
        type="button"
        className="it-custom-select-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="it-custom-select-value">{labelText}</span>
        <span className="it-custom-select-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="it-custom-select-list">
          <li>
            <button type="button" className="it-custom-select-option" onClick={() => { onChange(""); setOpen(false); }}>
              {placeholder}
            </button>
          </li>
          {options.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="it-custom-select-option"
                onClick={() => { onChange(d.id); setOpen(false); }}
              >
                {d.descripcion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function InteligenciaTerritorial({ user }) {
  const [tab, setTab] = useState("dashboard"); // dashboard | nuevo | guion | historial
  const [deptos, setDeptos] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [selDepto, setSelDepto] = useState(user?.departamento_id || "");
  const [selDistrito, setSelDistrito] = useState(user?.distrito_id || "");
  const [diasAtras, setDiasAtras] = useState(30);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [guiones, setGuiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form análisis
  const [textoAnalisis, setTextoAnalisis] = useState("");
  const [zonaAnalisis, setZonaAnalisis] = useState("");
  const [fuenteAnalisis, setFuenteAnalisis] = useState("manual");
  const [resultadoAnalisis, setResultadoAnalisis] = useState(null);
  const [analizando, setAnalizando] = useState(false);

  // Form manual
  const [manualForm, setManualForm] = useState({
    zona: "", fuente: "manual", texto_original: "",
    categoria: "", sentimiento: "", urgencia: 5,
    resumen_ia: "", temas_clave: "",
  });

  // Form guion
  const [guionForm, setGuionForm] = useState({ zona: "", dias: 30 });
  const [guionResult, setGuionResult] = useState(null);
  const [generandoGuion, setGenerandoGuion] = useState(false);

  // Cargar departamentos
  useEffect(() => {
    fetch(`${API}/api/electoral/departamentos`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setDeptos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Cargar distritos cuando cambia depto
  useEffect(() => {
    if (!selDepto) return;
    fetch(`${API}/api/electoral/distritos?departamento_id=${selDepto}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setDistritos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [selDepto]);

  // Pre-seleccionar del perfil de usuario
  useEffect(() => {
    if (user?.departamento_id) setSelDepto(user.departamento_id);
    if (user?.distrito_id) setSelDistrito(user.distrito_id);
  }, [user]);

  // ── Cargar estadísticas ──────────────────────────────────────
  const cargarStats = useCallback(async () => {
    if (!selDepto || !selDistrito) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        departamento_id: selDepto,
        distrito_id: selDistrito,
        dias_atras: String(diasAtras),
      });
      const url = `${API}/api/inteligencia/estadisticas?${params.toString()}`;
      const r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setStats(await r.json());
    } catch (e) {
      setError("Error al cargar estadísticas: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [selDepto, selDistrito, diasAtras]);

  // ── Cargar insights ──────────────────────────────────────────
  const cargarInsights = useCallback(async () => {
    if (!selDepto || !selDistrito) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        departamento_id: selDepto,
        distrito_id: selDistrito,
        dias_atras: String(diasAtras),
        limit: "30",
      });
      const url = `${API}/api/inteligencia/insights?${params.toString()}`;
      const r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setInsights(data.insights || []);
    } catch (e) {
      setError("Error al cargar insights: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [selDepto, selDistrito, diasAtras]);

  // ── Cargar guiones ───────────────────────────────────────────
  const cargarGuiones = useCallback(async () => {
    if (!selDepto || !selDistrito) return;
    try {
      const params = new URLSearchParams({
        departamento_id: selDepto,
        distrito_id: selDistrito,
      });
      const url = `${API}/api/inteligencia/guiones?${params.toString()}`;
      const r = await fetch(url, { headers: authHeaders() });
      const data = await r.json();
      setGuiones(Array.isArray(data) ? data : []);
    } catch (e) {}
  }, [selDepto, selDistrito]);

  useEffect(() => {
    cargarStats();
    cargarInsights();
    cargarGuiones();
  }, [cargarStats, cargarInsights, cargarGuiones]);

  // ── Analizar texto con IA ────────────────────────────────────
  const handleAnalizar = async (e) => {
    e.preventDefault();
    if (!textoAnalisis.trim()) return;
    if (!selDepto || !selDistrito) {
      setError("Seleccioná un departamento y distrito primero.");
      return;
    }
    setAnalizando(true);
    setResultadoAnalisis(null);
    setError(null);
    try {
      const r = await fetch(`${API}/api/inteligencia/analizar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          texto: textoAnalisis,
          departamento_id: parseInt(selDepto),
          distrito_id: parseInt(selDistrito),
          zona: zonaAnalisis || null,
          fuente: fuenteAnalisis,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setResultadoAnalisis(data.analisis);
      cargarStats();
      cargarInsights();
    } catch (e) {
      setError("Error al analizar: " + e.message);
    } finally {
      setAnalizando(false);
    }
  };

  // ── Crear manuel ─────────────────────────────────────────────
  const handleManual = async (e) => {
    e.preventDefault();
    if (!selDepto || !selDistrito) {
      setError("Seleccioná departamento y distrito.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const temas = manualForm.temas_clave
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      const r = await fetch(`${API}/api/inteligencia/insights`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          departamento_id: parseInt(selDepto),
          distrito_id: parseInt(selDistrito),
          zona: manualForm.zona || null,
          fuente: manualForm.fuente,
          texto_original: manualForm.texto_original,
          categoria: manualForm.categoria,
          sentimiento: manualForm.sentimiento,
          urgencia: parseInt(manualForm.urgencia),
          temas_clave: temas,
          resumen_ia: manualForm.resumen_ia,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setManualForm({ zona: "", fuente: "manual", texto_original: "", categoria: "", sentimiento: "", urgencia: 5, resumen_ia: "", temas_clave: "" });
      cargarStats();
      cargarInsights();
      setTab("historial");
    } catch (e) {
      setError("Error al guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Generar guion ─────────────────────────────────────────────
  const handleGenerarGuion = async (e) => {
    e.preventDefault();
    if (!selDepto || !selDistrito) {
      setError("Seleccioná departamento y distrito.");
      return;
    }
    setGenerandoGuion(true);
    setGuionResult(null);
    setError(null);
    try {
      const r = await fetch(`${API}/api/inteligencia/generar-guion`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          departamento_id: parseInt(selDepto),
          distrito_id: parseInt(selDistrito),
          zona: guionForm.zona || null,
          dias_atras: parseInt(guionForm.dias),
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setGuionResult(await r.json());
      cargarGuiones();
    } catch (e) {
      setError("Error al generar guion: " + e.message);
    } finally {
      setGenerandoGuion(false);
    }
  };

  // ── Eliminar insight ─────────────────────────────────────────
  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar este insight?")) return;
    try {
      await fetch(`${API}/api/inteligencia/insights/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      cargarInsights();
      cargarStats();
    } catch (e) {}
  };

  // ── UI ──────────────────────────────────────────────────────
  const nombreDepto = deptos.find(d => String(d.id) === String(selDepto))?.descripcion || "";
  const nombreDistrito = distritos.find(d => String(d.id) === String(selDistrito))?.descripcion || "";

  return (
    <div className="it-container">
      {/* ENCABEZADO */}
      <div className="it-header">
        <div className="it-header-icon">🧠</div>
        <div>
          <h2>Inteligencia Territorial</h2>
          <p>Motor de análisis de sentimiento y Social Listening para tu campaña</p>
        </div>
      </div>

      {/* SELECTOR DE TERRITORIO - dropdowns custom para texto visible en tema oscuro */}
      <div className="it-territory-bar">
        <CustomTerritorySelect
          label="📍 Departamento"
          value={selDepto}
          options={deptos}
          onChange={(id) => { setSelDepto(id); setSelDistrito(""); }}
          placeholder="— Seleccionar —"
        />
        <CustomTerritorySelect
          label="🏘️ Distrito"
          value={selDistrito}
          options={distritos}
          onChange={setSelDistrito}
          disabled={!selDepto}
          placeholder="— Seleccionar —"
        />
        <div className="it-territory-select">
          <label>📅 Período</label>
          <select value={diasAtras} onChange={e => setDiasAtras(Number(e.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
        {nombreDepto && nombreDistrito && (
          <div className="it-territory-badge">
            📌 {nombreDepto} / {nombreDistrito}
          </div>
        )}
      </div>

      {error && (
        <div className="it-error">⚠️ {error} <button onClick={() => setError(null)}>✕</button></div>
      )}

      {/* TABS */}
      <div className="it-tabs">
        {[
          { id: "dashboard", icon: "📊", label: "Dashboard" },
          { id: "nuevo", icon: "🔍", label: "Analizar con IA" },
          { id: "manual", icon: "✏️", label: "Carga Manual" },
          { id: "guion", icon: "🎤", label: "Generar Guion" },
          { id: "historial", icon: "📋", label: "Historial" },
        ].map(t => (
          <button
            key={t.id}
            className={`it-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB DASHBOARD ──────────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="it-dashboard">
          {loading && <div className="it-loading"><div className="it-spinner" />Cargando datos...</div>}
          {!selDepto || !selDistrito ? (
            <div className="it-empty-state">
              <span>🗺️</span>
              <p>Seleccioná un departamento y distrito para ver la inteligencia territorial.</p>
            </div>
          ) : stats ? (
            <>
              {/* KPIs */}
              <div className="it-kpis">
                <div className="it-kpi">
                  <div className="it-kpi-icon">📌</div>
                  <div className="it-kpi-value">{stats.total_insights}</div>
                  <div className="it-kpi-label">Hallazgos registrados</div>
                </div>
                <div className="it-kpi">
                  <div className="it-kpi-icon">⚡</div>
                  <div className="it-kpi-value" style={{ color: stats.urgencia_promedio >= 7 ? "#ef4444" : stats.urgencia_promedio >= 4 ? "#f59e0b" : "#22c55e" }}>
                    {stats.urgencia_promedio}/10
                  </div>
                  <div className="it-kpi-label">Urgencia promedio</div>
                </div>
                <div className="it-kpi">
                  <div className="it-kpi-icon">😠</div>
                  <div className="it-kpi-value" style={{ color: "#ef4444" }}>
                    {stats.por_sentimiento?.find(s => s.sentimiento === "Negativo")?.total || 0}
                  </div>
                  <div className="it-kpi-label">Negativos</div>
                </div>
                <div className="it-kpi">
                  <div className="it-kpi-icon">😊</div>
                  <div className="it-kpi-value" style={{ color: "#22c55e" }}>
                    {stats.por_sentimiento?.find(s => s.sentimiento === "Positivo")?.total || 0}
                  </div>
                  <div className="it-kpi-label">Positivos</div>
                </div>
              </div>

              <div className="it-charts-grid">
                {/* Categorías */}
                <div className="it-card">
                  <h3>🗂️ Por Categoría</h3>
                  {stats.por_categoria?.length === 0 && <p className="it-no-data">Sin datos</p>}
                  {stats.por_categoria?.map(c => (
                    <div key={c.categoria} className="it-bar-row">
                      <span className="it-bar-label">{c.categoria}</span>
                      <div className="it-bar-track">
                        <div
                          className="it-bar-fill"
                          style={{
                            width: `${(c.total / (stats.total_insights || 1)) * 100}%`,
                            background: "var(--it-accent)"
                          }}
                        />
                      </div>
                      <span className="it-bar-count">{c.total}</span>
                    </div>
                  ))}
                </div>

                {/* Sentimientos */}
                <div className="it-card">
                  <h3>💬 Sentimiento Social</h3>
                  <div className="it-sentiment-grid">
                    {["Negativo", "Neutro", "Positivo"].map(s => {
                      const val = stats.por_sentimiento?.find(x => x.sentimiento === s)?.total || 0;
                      const pct = stats.total_insights ? Math.round((val / stats.total_insights) * 100) : 0;
                      return (
                        <div key={s} className="it-sentiment-card" style={{ borderColor: SENTIMIENTO_COLOR[s] }}>
                          <span className="it-sent-icon">{SENTIMIENTO_ICON[s]}</span>
                          <span className="it-sent-pct" style={{ color: SENTIMIENTO_COLOR[s] }}>{pct}%</span>
                          <span className="it-sent-label">{s}</span>
                          <span className="it-sent-count">{val} casos</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top zonas */}
                {stats.por_zona?.length > 0 && (
                  <div className="it-card it-card-full">
                    <h3>📍 Zonas con mayor atención requerida</h3>
                    <div className="it-zones-table">
                      <div className="it-zones-header">
                        <span>Zona / Barrio</span>
                        <span>Urgencia</span>
                        <span>Sentimiento</span>
                        <span>Categoría</span>
                        <span>Casos</span>
                      </div>
                      {stats.por_zona.map((z, i) => (
                        <div key={i} className="it-zones-row">
                          <span className="it-zone-name">📌 {z.zona}</span>
                          <span>
                            <UrgenciaBar valor={z.urgencia_avg} />
                          </span>
                          <span style={{ color: SENTIMIENTO_COLOR[z.sentimiento_dominante] }}>
                            {SENTIMIENTO_ICON[z.sentimiento_dominante]} {z.sentimiento_dominante}
                          </span>
                          <span className="it-categoria-tag">{z.categoria_dominante}</span>
                          <span className="it-badge">{z.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="it-empty-state">
              <span>📭</span>
              <p>No hay datos para este territorio en el período seleccionado.</p>
              <button className="it-btn-primary" onClick={() => setTab("nuevo")}>
                + Agregar primer insight
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB ANALIZAR CON IA ───────────────────────────── */}
      {tab === "nuevo" && (
        <div className="it-form-container">
          <div className="it-ai-header">
            <span className="it-ai-badge">✨ Powered by IA</span>
            <h3>Analizar texto con Inteligencia Artificial</h3>
            <p>Pegá un post de red social, noticia local o queja ciudadana. La IA clasificará automáticamente la categoría, sentimiento y urgencia.</p>
          </div>

          <form onSubmit={handleAnalizar} className="it-form">
            <div className="it-form-row it-form-row-2">
              <div className="it-form-group">
                <label>Zona / Barrio</label>
                <input
                  type="text"
                  placeholder="Ej: Barrio San Pablo, Villa Elisa..."
                  value={zonaAnalisis}
                  onChange={e => setZonaAnalisis(e.target.value)}
                />
              </div>
              <div className="it-form-group">
                <label>Fuente</label>
                <select value={fuenteAnalisis} onChange={e => setFuenteAnalisis(e.target.value)}>
                  <option value="manual">Carga manual</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="noticia">Portal de noticias</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="n8n">Flujo n8n</option>
                </select>
              </div>
            </div>

            <div className="it-form-group">
              <label>Texto a analizar *</label>
              <textarea
                rows={6}
                placeholder="Pegá aquí el post, queja, noticia o comentario de la zona..."
                value={textoAnalisis}
                onChange={e => setTextoAnalisis(e.target.value)}
                required
              />
              <span className="it-char-count">{textoAnalisis.length} caracteres</span>
            </div>

            <button type="submit" className="it-btn-ai" disabled={analizando || !textoAnalisis.trim()}>
              {analizando ? <><span className="it-spinner-sm" />Analizando...</> : "🧠 Analizar y Guardar"}
            </button>
          </form>

          {/* Resultado del análisis */}
          {resultadoAnalisis && (
            <div className="it-result-card">
              <div className="it-result-header">
                <span className="it-result-icon">✅</span>
                <h4>Análisis completado y guardado</h4>
              </div>
              <div className="it-result-grid">
                <div className="it-result-item">
                  <span className="it-result-label">Categoría</span>
                  <span className="it-categoria-tag">{resultadoAnalisis.categoria}</span>
                </div>
                <div className="it-result-item">
                  <span className="it-result-label">Sentimiento</span>
                  <span style={{ color: SENTIMIENTO_COLOR[resultadoAnalisis.sentimiento], fontWeight: 700 }}>
                    {SENTIMIENTO_ICON[resultadoAnalisis.sentimiento]} {resultadoAnalisis.sentimiento}
                  </span>
                </div>
                <div className="it-result-item">
                  <span className="it-result-label">Urgencia</span>
                  <UrgenciaBar valor={resultadoAnalisis.urgencia} />
                </div>
                <div className="it-result-item it-result-full">
                  <span className="it-result-label">Temas clave</span>
                  <div className="it-tags">
                    {resultadoAnalisis.temas_clave?.map(t => (
                      <span key={t} className="it-tag">#{t}</span>
                    ))}
                  </div>
                </div>
                <div className="it-result-item it-result-full">
                  <span className="it-result-label">Resumen IA</span>
                  <p className="it-resumen-text">{resultadoAnalisis.resumen_ia}</p>
                </div>
              </div>
              <div className="it-result-actions">
                <button className="it-btn-secondary" onClick={() => { setTextoAnalisis(""); setResultadoAnalisis(null); }}>
                  Analizar otro texto
                </button>
                <button className="it-btn-primary" onClick={() => setTab("guion")}>
                  🎤 Generar guion para esta zona
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB MANUAL ────────────────────────────────────── */}
      {tab === "manual" && (
        <div className="it-form-container">
          <div className="it-ai-header">
            <h3>✏️ Carga Manual de Insight</h3>
            <p>Agregá un hallazgo territorial de forma manual, sin análisis automático.</p>
          </div>
          <form onSubmit={handleManual} className="it-form">
            <div className="it-form-row it-form-row-2">
              <div className="it-form-group">
                <label>Zona / Barrio</label>
                <input
                  type="text"
                  placeholder="Ej: Barrio Obrero, Zona Norte..."
                  value={manualForm.zona}
                  onChange={e => setManualForm(p => ({ ...p, zona: e.target.value }))}
                />
              </div>
              <div className="it-form-group">
                <label>Fuente</label>
                <select value={manualForm.fuente} onChange={e => setManualForm(p => ({ ...p, fuente: e.target.value }))}>
                  <option value="manual">Carga manual</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="noticia">Portal de noticias</option>
                  <option value="n8n">Flujo n8n</option>
                </select>
              </div>
            </div>

            <div className="it-form-row it-form-row-3">
              <div className="it-form-group">
                <label>Categoría *</label>
                <select value={manualForm.categoria} onChange={e => setManualForm(p => ({ ...p, categoria: e.target.value }))} required>
                  <option value="">— Seleccionar —</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="it-form-group">
                <label>Sentimiento *</label>
                <select value={manualForm.sentimiento} onChange={e => setManualForm(p => ({ ...p, sentimiento: e.target.value }))} required>
                  <option value="">— Seleccionar —</option>
                  <option value="Negativo">😠 Negativo</option>
                  <option value="Neutro">😐 Neutro</option>
                  <option value="Positivo">😊 Positivo</option>
                </select>
              </div>
              <div className="it-form-group">
                <label>Urgencia: {manualForm.urgencia}/10</label>
                <input
                  type="range" min={1} max={10}
                  value={manualForm.urgencia}
                  onChange={e => setManualForm(p => ({ ...p, urgencia: e.target.value }))}
                />
              </div>
            </div>

            <div className="it-form-group">
              <label>Texto original</label>
              <textarea
                rows={3}
                placeholder="Texto completo de la queja o hallazgo..."
                value={manualForm.texto_original}
                onChange={e => setManualForm(p => ({ ...p, texto_original: e.target.value }))}
              />
            </div>

            <div className="it-form-group">
              <label>Resumen / Descripción *</label>
              <textarea
                rows={2}
                placeholder="Describe el hallazgo en 1-2 oraciones..."
                value={manualForm.resumen_ia}
                onChange={e => setManualForm(p => ({ ...p, resumen_ia: e.target.value }))}
                required
              />
            </div>

            <div className="it-form-group">
              <label>Temas clave (separados por coma)</label>
              <input
                type="text"
                placeholder="Ej: raudales, baches, iluminación"
                value={manualForm.temas_clave}
                onChange={e => setManualForm(p => ({ ...p, temas_clave: e.target.value }))}
              />
            </div>

            <button type="submit" className="it-btn-primary" disabled={loading}>
              {loading ? "Guardando..." : "💾 Guardar Insight"}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB GENERAR GUION ─────────────────────────────── */}
      {tab === "guion" && (
        <div className="it-form-container">
          <div className="it-ai-header">
            <span className="it-ai-badge">🎤 Generador de Discurso</span>
            <h3>Crear Guion de Visita con IA</h3>
            <p>La IA analizará los hallazgos recientes de la zona y el perfil de tus adherentes para generar 3 puntos clave de discurso.</p>
          </div>

          <form onSubmit={handleGenerarGuion} className="it-form">
            <div className="it-form-row it-form-row-2">
              <div className="it-form-group">
                <label>Barrio / Zona específica</label>
                <input
                  type="text"
                  placeholder="Ej: Barrio San Pablo (opcional)"
                  value={guionForm.zona}
                  onChange={e => setGuionForm(p => ({ ...p, zona: e.target.value }))}
                />
              </div>
              <div className="it-form-group">
                <label>Considerar insights de los últimos</label>
                <select value={guionForm.dias} onChange={e => setGuionForm(p => ({ ...p, dias: e.target.value }))}>
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                </select>
              </div>
            </div>
            <button type="submit" className="it-btn-ai" disabled={generandoGuion}>
              {generandoGuion ? <><span className="it-spinner-sm" />Generando guion...</> : "🎤 Generar Guion de Visita"}
            </button>
          </form>

          {guionResult && (
            <div className="it-guion-result">
              <div className="it-guion-header">
                <span>🎤</span>
                <div>
                  <h4>Guion para: {guionResult.zona}</h4>
                  <p>Basado en {guionResult.insights_considerados} hallazgos recientes | {guionResult.perfil_audiencia?.total_adherentes || 0} adherentes en zona</p>
                </div>
              </div>

              <div className="it-puntos-grid">
                {["punto_1", "punto_2", "punto_3"].map((key, i) => (
                  <div key={key} className="it-punto-card">
                    <div className="it-punto-num">{i + 1}</div>
                    <p>{guionResult.guion[key]}</p>
                  </div>
                ))}
              </div>

              {guionResult.guion?.nota && (
                <div className="it-guion-nota">
                  💡 <strong>Nota estratégica:</strong> {guionResult.guion.nota}
                </div>
              )}

              <div className="it-result-actions">
                <button className="it-btn-secondary" onClick={() => {
                  const text = `GUION DE VISITA - ${guionResult.zona}\n\n1. ${guionResult.guion.punto_1}\n\n2. ${guionResult.guion.punto_2}\n\n3. ${guionResult.guion.punto_3}\n\n${guionResult.guion.nota ? 'Nota: ' + guionResult.guion.nota : ''}`;
                  navigator.clipboard.writeText(text);
                }}>
                  📋 Copiar
                </button>
                <button className="it-btn-primary" onClick={() => setGuionResult(null)}>
                  Generar otro
                </button>
              </div>
            </div>
          )}

          {/* Guiones previos */}
          {guiones.length > 0 && (
            <div className="it-card" style={{ marginTop: 24 }}>
              <h3>📚 Guiones anteriores</h3>
              {guiones.map(g => {
                const puntos = typeof g.puntos_clave === "string" ? JSON.parse(g.puntos_clave) : g.puntos_clave;
                return (
                  <div key={g.id} className="it-guion-prev">
                    <div className="it-guion-prev-meta">
                      <strong>📍 {g.zona || "Distrito completo"}</strong>
                      <span>{new Date(g.fecha_generacion).toLocaleDateString("es-PY")}</span>
                    </div>
                    <ol>
                      {["punto_1", "punto_2", "punto_3"].map(k => puntos?.[k] && <li key={k}>{puntos[k]}</li>)}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB HISTORIAL ─────────────────────────────────── */}
      {tab === "historial" && (
        <div className="it-historial">
          <div className="it-historial-header">
            <h3>📋 Historial de Insights</h3>
            <span className="it-badge">{insights.length} registros</span>
          </div>

          {loading && <div className="it-loading"><div className="it-spinner" />Cargando...</div>}

          {!loading && insights.length === 0 && (
            <div className="it-empty-state">
              <span>📭</span>
              <p>No hay insights registrados para este territorio en el período seleccionado.</p>
              <button className="it-btn-primary" onClick={() => setTab("nuevo")}>+ Agregar primer análisis</button>
            </div>
          )}

          <div className="it-insights-list">
            {insights.map(ins => {
              const temas = typeof ins.temas_clave === "string"
                ? JSON.parse(ins.temas_clave || "[]")
                : (ins.temas_clave || []);
              return (
                <div key={ins.id} className="it-insight-card">
                  <div className="it-insight-header">
                    <div className="it-insight-meta">
                      <span className="it-categoria-tag">{ins.categoria || "Sin clasificar"}</span>
                      <span
                        className="it-sent-pill"
                        style={{ background: SENTIMIENTO_COLOR[ins.sentimiento] + "33", color: SENTIMIENTO_COLOR[ins.sentimiento] }}
                      >
                        {SENTIMIENTO_ICON[ins.sentimiento]} {ins.sentimiento}
                      </span>
                      {ins.zona && <span className="it-zone-pill">📍 {ins.zona}</span>}
                      <span className="it-src-pill">🔗 {ins.fuente}</span>
                    </div>
                    <div className="it-insight-actions">
                      <span className="it-date">{new Date(ins.fecha_registro).toLocaleDateString("es-PY")}</span>
                      <button className="it-btn-delete" onClick={() => handleEliminar(ins.id)} title="Eliminar">🗑️</button>
                    </div>
                  </div>

                  {ins.urgencia && (
                    <div className="it-insight-urgencia">
                      <span>Urgencia:</span>
                      <UrgenciaBar valor={ins.urgencia} />
                    </div>
                  )}

                  <p className="it-insight-resumen">{ins.resumen_ia || ins.texto_original?.slice(0, 200)}</p>

                  {temas.length > 0 && (
                    <div className="it-tags">
                      {temas.map(t => <span key={t} className="it-tag">#{t}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
