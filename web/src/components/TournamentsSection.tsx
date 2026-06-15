'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function TournamentsSection() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTorneos = async () => {
      try {
        const res = await fetch(`${API_URL}/cancha/torneos`);
        if (res.ok) {
          const data = await res.json();
          setTorneos(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTorneos();
  }, []);

  if (loading) return null;
  if (torneos.length === 0) return null;

  return (
    <section 
      className="section" 
      id="torneos" 
      style={{ 
        padding: '100px 0', 
        position: 'relative',
        background: 'linear-gradient(rgba(6, 9, 19, 0.4), rgba(6, 9, 19, 0.8)), url("/torneo_bg.png") center/cover no-repeat',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <div className="section-header" style={{ marginBottom: '40px' }}>
        <div>
          <h2 className="section-title" style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🏆 Torneos Abiertos</h2>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Inscribí a tu equipo y demostrá quién es el mejor</div>
        </div>
      </div>

      <div className="courts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '30px' }}>
        {torneos.map(t => (
          <div key={t.id} style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '24px',
            padding: '30px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ 
                background: '#00D084', 
                color: '#000', 
                padding: '4px 12px', 
                borderRadius: '100px', 
                fontSize: '11px', 
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {t.deporte}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                {t.formato === 'liga' ? 'Liga' : 'Eliminación'}
              </span>
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>{t.nombre}</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              {t.descripcion}
            </p>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
                <span>📅 Inicio: {new Date(t.fecha_inicio).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
                <span>👥 Max: {t.max_equipos} equipos</span>
              </div>
              
              <button style={{ 
                width: '100%', 
                padding: '12px', 
                background: 'transparent', 
                border: '2px solid #00D084', 
                color: '#00D084',
                borderRadius: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                Inscribirme ahora
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
