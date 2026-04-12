// Dashboard.jsx
// Panel principal con KPIs en tiempo real del Sistema de Gestión de Surtidor

import React, { useState, useEffect, useCallback } from "react";
import "./Dashboard.css";

const API = import.meta.env.VITE_REACT_APP_API_URL;

function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function formatGs(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);
}

function formatL(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("es-PY", { maximumFractionDigits: 1 })} L`;
}

// Medidor circular de nivel de tanque
function TankGauge({ tank }) {
  const pct = tank.porcentaje_lleno || 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const stateColors = {
    critico: { stroke: "#ef4444", bg: "#fef2f2", badge: "#ef4444", label: "CRÍTICO" },
    bajo:    { stroke: "#f59e0b", bg: "#fffbeb", badge: "#f59e0b", label: "BAJO" },
    lleno:   { stroke: "#06b6d4", bg: "#ecfeff", badge: "#06b6d4", label: "LLENO" },
    ok:      { stroke: "#10b981", bg: "#f0fdf4", badge: "#10b981", label: "OK" },
  };
  const colors = stateColors[tank.estado_stock] || stateColors.ok;
  const combustibleColor = tank.tipo_combustible?.color_hex || "#4CAF50";

  return (
    <div className="tank-card" style={{ background: colors.bg }}>
      <div className="tank-header">
        <div className="tank-name">
          <span className="tank-dot" style={{ background: combustibleColor }} />
          <span>{tank.nombre}</span>
        </div>
        <span className="tank-badge" style={{ background: colors.badge }}>
          {colors.label}
        </span>
      </div>

      <div className="tank-gauge-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.stroke}>
            {Math.round(pct)}%
          </text>
          <text x="50" y="62" textAnchor="middle" fontSize="8" fill="#64748b">
            {tank.tipo_combustible?.nombre || "—"}
          </text>
        </svg>
      </div>

      <div className="tank-stats">
        <div className="tank-stat">
          <span className="tank-stat-label">Stock actual</span>
          <span className="tank-stat-value">{formatL(tank.stock_actual_litros)}</span>
        </div>
        <div className="tank-stat">
          <span className="tank-stat-label">Capacidad</span>
          <span className="tank-stat-value">{formatL(tank.capacidad_litros)}</span>
        </div>
        <div className="tank-stat">
          <span className="tank-stat-label">Stock mínimo</span>
          <span className="tank-stat-value" style={{ color: "#f59e0b" }}>{formatL(tank.stock_minimo_litros)}</span>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="kpi-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="kpi-icon" style={{ background: color + "22", color }}>{icon}</div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value}</span>
        {sub && <span className="kpi-sub">{sub}</span>}
      </div>
      {trend != null && (
        <div className={`kpi-trend ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function AlertaRow({ alerta }) {
  const isCretico = alerta.nivel === "CRÍTICO";
  return (
    <div className={`alerta-row ${isCretico ? "critico" : "bajo"}`}>
      <span className="alerta-icon">{isCretico ? "🔴" : "🟡"}</span>
      <span className="alerta-text">
        <strong>{alerta.tanque}</strong> — Stock {alerta.nivel}: {formatL(alerta.stock)}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const d = await apiFetch("/api/surtidor/dashboard");
      setData(d);
      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      setError("Error cargando el dashboard. Verifique la conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 60000); // Auto-refresh cada 60s
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">🛢️ Panel de Control — Surtidor</h2>
          <p className="dash-subtitle">
            {lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString("es-PY")}` : ""}
          </p>
        </div>
        <div className="dash-actions">
          {data?.turno_activo ? (
            <div className="turno-badge active">
              ✅ Turno activo: <strong>{data.turno_activo.config_turno?.nombre}</strong>
            </div>
          ) : (
            <div className="turno-badge inactive">⚪ Sin turno activo</div>
          )}
          <button onClick={loadDashboard} className="btn btn-secondary" id="btn-refresh-dashboard">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {data?.alertas_stock?.length > 0 && (
        <div className="dash-alertas">
          <h3>⚠️ Alertas de Stock</h3>
          <div className="alertas-list">
            {data.alertas_stock.map((a, i) => <AlertaRow key={i} alerta={a} />)}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard
          icon="💰"
          label="Ventas del Día"
          value={formatGs(data?.total_ventas_hoy)}
          sub={`${formatL(data?.total_litros_hoy)} despachados`}
          color="#2563eb"
        />
        <KPICard
          icon="💵"
          label="Efectivo Hoy"
          value={formatGs(data?.ventas_efectivo_hoy)}
          color="#10b981"
        />
        <KPICard
          icon="💳"
          label="Tarjetas Hoy"
          value={formatGs(data?.ventas_tarjeta_hoy)}
          color="#8b5cf6"
        />
        <KPICard
          icon="🏦"
          label="Saldo de Caja"
          value={formatGs(data?.saldo_caja)}
          color="#f59e0b"
        />
        <KPICard
          icon="📋"
          label="Pedidos Pendientes"
          value={data?.pedidos_pendientes ?? 0}
          color="#ef4444"
        />
        <KPICard
          icon="⏳"
          label="Reembolsos Pendientes"
          value={formatGs(data?.reembolsos_pendientes_monto)}
          sub="Por conciliar con banco"
          color="#06b6d4"
        />
      </div>

      {/* Tanques */}
      <div className="dash-section">
        <h3>🛢️ Estado de Tanques</h3>
        <div className="tanks-grid">
          {data?.stock_por_tanque?.length > 0 ? (
            data.stock_por_tanque.map((t) => <TankGauge key={t.id} tank={t} />)
          ) : (
            <div className="no-data">
              No hay tanques registrados. Agregue tanques desde el módulo de Administración.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
