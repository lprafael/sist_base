import React, { useState } from "react";
import { authFetch } from "../utils/authFetch";

const API_URL = "/api";

export default function BackupSystem() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [backupHistory, setBackupHistory] = useState([]);

  const handleAction = async (url, tableName, isDownload = true) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        if (isDownload) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `backup_${tableName}_${new Date().toISOString().split('T')[0]}.${tableName === 'sistema' ? 'zip' : 'json'}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
        }
        const successMsg = `✅ Acción completada: ${tableName}`;
        setMessage(successMsg);
        setBackupHistory(prev => [{ table: tableName, date: new Date().toLocaleString(), status: 'success' }, ...prev]);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Error: ${errorData.detail || 'Error desconocido'}`);
        setBackupHistory(prev => [{ table: tableName, date: new Date().toLocaleString(), status: 'error', error: errorData.detail }, ...prev]);
      }
    } catch (error) {
      setMessage(`❌ Error de conexión`);
    } finally {
      setLoading(false);
    }
  };

  const tables = [
    { name: "gremios", label: "Gremios" },
    { name: "eots", label: "EOTs" },
    { name: "feriados", label: "Feriados" },
    { name: "usuarios", label: "Usuarios" },
    { name: "catalogo_rutas", label: "Rutas" },
  ];

  return (
    <div className="fade-in">
      <div className="user-management-header">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sistema de Backup</h1>
        <button
          className="btn btn-primary"
          onClick={() => handleAction(`${API_URL}/system/backup`, 'sistema')}
          disabled={loading}
        >
          📦 Backup Completo (.zip)
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('❌') ? 'error-message' : 'success-message'}`}
          style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', backgroundColor: message.includes('❌') ? '#fef2f2' : '#f0fdf4', color: message.includes('❌') ? '#ef4444' : '#10b981', border: `1px solid ${message.includes('❌') ? '#fee2e2' : '#dcfce7'}` }}>
          {message}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Herramientas de Diagnóstico</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => handleAction(`${API_URL}/debug/auth-test`, 'Debug Auth', false)} disabled={loading}>🔍 Debug Auth</button>
          <button className="btn btn-secondary" onClick={() => handleAction(`${API_URL}/debug/backup-test`, 'Test Backup', false)} disabled={loading}>🧪 Test Sistema</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Backup Individual por Tabla</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {tables.map((table) => (
            <div key={table.name} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8fafc' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px' }}>{table.label}</p>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem' }}
                onClick={() => handleAction(`${API_URL}/backup/${table.name}`, table.name)}
                disabled={loading}
              >
                💾 Descargar JSON
              </button>
            </div>
          ))}
        </div>
      </div>

      {backupHistory.length > 0 && (
        <div className="table-container" style={{ marginTop: '24px' }}>
          <table>
            <thead>
              <tr>
                <th>Recurso</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {backupHistory.map((backup, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{backup.table}</td>
                  <td>{backup.date}</td>
                  <td>
                    <span className={`status-badge ${backup.status === 'success' ? 'active' : 'inactive'}`}>
                      {backup.status === 'success' ? 'Completado' : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
