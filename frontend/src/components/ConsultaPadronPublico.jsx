import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, MapPin, Vote, CheckCircle, AlertCircle, Printer, RotateCcw, Clock, X } from 'lucide-react';
import './ConsultaPadronPublico.css';

// Ventana temporal: Desde 2 de octubre 2026 hasta el final del domingo 4 de octubre 2026
const FECHA_INICIO = new Date('2026-10-02T00:00:00-03:00');
const FECHA_FIN = new Date('2026-10-04T23:59:59.999-03:00');

export const isConsultaTemporalActiva = () => {
  const ahora = new Date();
  return ahora >= FECHA_INICIO && ahora <= FECHA_FIN;
};

const ConsultaPadronPublico = ({ isModal = false, onClose = null }) => {
  const [cedula, setCedula] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [isActiva, setIsActiva] = useState(isConsultaTemporalActiva());

  useEffect(() => {
    // Verificar si sigue activo
    const checkStatus = () => {
      setIsActiva(isConsultaTemporalActiva());
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleConsultar = async (e) => {
    e.preventDefault();
    setError('');
    setResultado(null);

    const ciClean = cedula.replace(/\D/g, '');
    if (!ciClean) {
      setError('Por favor ingrese un número de cédula válido.');
      return;
    }

    if (!fechaNacimiento) {
      setError('Por favor seleccione su fecha de nacimiento.');
      return;
    }

    setLoading(true);
    try {
      const getDeviceId = () => {
        let devId = localStorage.getItem('deviceId');
        if (!devId) {
          devId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
          localStorage.setItem('deviceId', devId);
        }
        return devId;
      };

      const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
      const cleanBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const endpoint = `${cleanBase}/public/padron/consulta`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cedula: ciClean,
          fecha_nacimiento: fechaNacimiento,
          device_id: getDeviceId(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.encontrado) {
        setResultado(data);
      } else {
        setError(data.detail || 'No se encontraron registros con los datos ingresados.');
      }
    } catch (err) {
      console.error('Error al consultar padrón:', err);
      setError('No se pudo establecer conexión con el servidor. Intente nuevamente en unos instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResultado(null);
    setError('');
    setCedula('');
    setFechaNacimiento('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`consulta-padron-wrapper ${isModal ? 'is-modal-view' : ''}`}>
      {/* Botón de cerrar si es modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            color: '#64748b'
          }}
          title="Cerrar ventana"
        >
          <X size={24} />
        </button>
      )}

      {/* Header */}
      <div className="consulta-header-card">
        <div className="consulta-header-badge">
          <Vote size={15} /> Elecciones Municipales
        </div>
        <h1>¿Dónde Voto?</h1>
        <p>
          Consulta oficial y gratuita de tu local de votación, número de mesa y orden en el padrón general.
        </p>
        <div className="temporal-timer-banner">
          ⏱️ Habilitado temporalmente hasta el domingo 4 de octubre (23:59 hs)
        </div>
      </div>

      {/* Si expiró */}
      {!isActiva && (
        <div className="padron-alert expired">
          <Clock size={36} color="#64748b" style={{ marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#1e293b' }}>
            Periodo de Consulta Temporal Finalizado
          </h3>
          <p style={{ margin: 0, fontSize: '0.95rem', maxWidth: '480px', lineHeight: 1.5 }}>
            El acceso público especial para consultar el padrón electoral de las elecciones municipales concluyó el <strong>domingo 4 de octubre a las 23:59 hs</strong>.
          </p>
        </div>
      )}

      {/* Formulario de Consulta (solo si está activa) */}
      {isActiva && !resultado && (
        <div className="consulta-form-card">
          {error && (
            <div className="padron-alert error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleConsultar}>
            <div className="form-row">
              <div className="form-group-padron">
                <label>
                  <User size={16} /> Número de Cédula (CI)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 3456789"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group-padron">
                <label>
                  <Calendar size={16} /> Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-consultar-padron"
              disabled={loading || !cedula || !fechaNacimiento}
            >
              {loading ? (
                <>Buscando en el padrón...</>
              ) : (
                <>
                  <Search size={20} /> Consultar Padrón
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Resultado de la Consulta */}
      {resultado && (
        <div className="resultado-padron-card">
          <div className="resultado-top-badge">
            <span className="badge-habilitado">
              <CheckCircle size={15} /> Habilitado para Votar
            </span>
            <span className="eleccion-tag">{resultado.eleccion || 'Elecciones Municipales'}</span>
          </div>

          <div className="elector-nombre-box">
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Elector / Ciudadano
            </div>
            <h3>{resultado.nombre_completo}</h3>
            <div className="elector-ci">
              C.I. N° {parseInt(resultado.cedula).toLocaleString('es-PY') || resultado.cedula}
            </div>
          </div>

          {/* Dónde votar destacado */}
          <div className="mesa-orden-highlight">
            <div className="highlight-box">
              <div className="box-label">Mesa de Votación</div>
              <div className="box-value">{resultado.mesa}</div>
            </div>
            <div className="highlight-box">
              <div className="box-label">N° de Orden</div>
              <div className="box-value">{resultado.orden}</div>
            </div>
          </div>

          {/* Detalles del local */}
          <div className="info-grid-padron">
            <div className="info-item" style={{ gridColumn: 'span 2' }}>
              <span className="item-title">🏫 Local de Votación</span>
              <span className="item-val" style={{ fontSize: '1.15rem', color: '#1e40af' }}>
                {resultado.local_votacion}
              </span>
            </div>

            {resultado.direccion_local && (
              <div className="info-item" style={{ gridColumn: 'span 2' }}>
                <span className="item-title">📍 Dirección del Local</span>
                <span className="item-val">{resultado.direccion_local}</span>
              </div>
            )}

            <div className="info-item">
              <span className="item-title">🏙️ Distrito / Ciudad</span>
              <span className="item-val">{resultado.distrito || '-'}</span>
            </div>

            <div className="info-item">
              <span className="item-title">🏛️ Departamento</span>
              <span className="item-val">{resultado.departamento || '-'}</span>
            </div>
          </div>

          <div className="resultado-actions">
            <button type="button" className="btn-action-padron print" onClick={handlePrint}>
              <Printer size={16} /> Imprimir Comprobante
            </button>
            <button type="button" className="btn-action-padron new" onClick={handleReset}>
              <RotateCcw size={16} /> Nueva Consulta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultaPadronPublico;
