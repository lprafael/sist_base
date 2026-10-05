import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BarChart3, MapPin } from 'lucide-react';

const ResultadosElecciones = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: '#0a0f1d' }}>
      {/* Top Header */}
      <header style={{
        height: '56px',
        background: '#0d1527',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: '#fff',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#1e293b',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} /> Volver a SIGEL
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              SIGEL <span style={{ color: '#38bdf8', fontWeight: 600 }}>Electoral</span>
            </span>
            <span style={{
              fontSize: '0.72rem',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              TSJE & D'Hondt 2026
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="#38bdf8" /> 263 Distritos Electorales
          </span>
          <a
            href="/tablero_electoral.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
            }}
          >
            <ExternalLink size={14} /> Abrir en pantalla completa
          </a>
        </div>
      </header>

      {/* Embedded Dashboard Frame */}
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <iframe
          src="/tablero_electoral.html"
          title="Tablero Electoral Nacional TSJE"
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};

export default ResultadosElecciones;
