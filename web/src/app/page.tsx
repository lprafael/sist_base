/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import CourtCard from '@/components/CourtCard';
import BookingModal from '@/components/BookingModal';
import TournamentsSection from '@/components/TournamentsSection';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const SPORTS = ['Todos', 'Fútbol 5', 'Fútbol 7', 'Pádel', 'Tenis', 'Básquet'];
const SPORT_ICONS: Record<string, string> = {
  'Fútbol 5': '⚽', 'Fútbol 7': '⚽', 'Pádel': '🎾',
  'Tenis': '🎾', 'Básquet': '🏀', 'default': '🏟️',
};

export default function HomePage() {
  const [canchas, setCanchas] = useState<any[]>([]);
  const [complejos, setComplejos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroDeporte, setFiltroDeporte] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [selectedCancha, setSelectedCancha] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const complejosRes = await fetch(`${API_URL}/cancha/complejos`);
      const complejosData = await complejosRes.json();
      const lista = Array.isArray(complejosData) ? complejosData : [];
      setComplejos(lista);

      // Cargar canchas de todos los complejos
      const allCanchas: any[] = [];
      for (const c of lista) {
        try {
          const res = await fetch(`${API_URL}/cancha/complejos/${c.id}/canchas`);
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((cancha: any) => {
              allCanchas.push({ 
                ...cancha, 
                complejo_id: c.id,
                complejo_nombre: c.nombre, 
                complejo_ciudad: c.ciudad 
              });
            });
          }
        } catch (err) {
          console.error(`Error cargando canchas del complejo ${c.id}:`, err);
        }
      }
      setCanchas(allCanchas);
    } catch (e) {
      console.error('Error cargando:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const canchasFiltradas = canchas.filter(c => {
    const matchDeporte = filtroDeporte === 'Todos' || c.deporte === filtroDeporte;
    const matchBusqueda = !busqueda ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.complejo_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.deporte?.toLowerCase().includes(busqueda.toLowerCase());
    return matchDeporte && matchBusqueda;
  });

  const totalCanchas = canchas.length;
  const totalComplejos = complejos.length;

  return (
    <>
      <Nav scrolled={scrolled} />

      {/* HERO */}
      <section className="hero" style={{ backgroundImage: `url('/hero-cancha.png')` }}>
        <div className="hero-content">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            La plataforma deportiva #1 de Paraguay
          </div>

          <h1 className="hero-title">
            Agilizá la reserva y gestión de tu{' '}
            <span className="hero-title-grad">Club Deportivo</span>
          </h1>

          <p className="hero-subtitle">
            Encontrá y reservá canchas en segundos, o digitalizá por completo la gestión de tu complejo deportivo. Fácil, rápido y sin llamadas.
          </p>

          <div className="hero-actions">
            <a href="/buscar" className="btn btn-accent btn-lg">
              🏟️ Buscar en el Mapa
            </a>
            <a href="/login" className="btn btn-outline-white btn-lg">
              Registrar mi Club
            </a>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{totalComplejos || '12'}+</div>
              <div className="hero-stat-label">Complejos</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{totalCanchas || '45'}+</div>
              <div className="hero-stat-label">Canchas</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">24/7</div>
              <div className="hero-stat-label">Reservas Online</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">0 Gs</div>
              <div className="hero-stat-label">Comisión Extra</div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE ACTION CARDS (Inspired by Reva.la) */}
      <section className="action-cards-section">
        <div className="action-cards-grid">
          <div className="action-card">
            <div className="action-card-icon">⚡</div>
            <h3 className="action-card-title">Administrá tu Complejo</h3>
            <p className="action-card-desc">
              Hacé crecer tu negocio, automatizá turnos recurrentes y alcanzá nuevos clientes con el sistema inteligente de reservas online más completo de Paraguay.
            </p>
            <a href="/admin" className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
              Registrá tu negocio
            </a>
          </div>

          <div className="action-card">
            <div className="action-card-icon">🏆</div>
            <h3 className="action-card-title">Creá y Organizá Torneos</h3>
            <p className="action-card-desc">
              Como organizador, vas a poder publicar tus torneos, gestionar fixture, tablas de posiciones e inscripciones de manera 100% online y dinámica.
            </p>
            <a href="#torneos" className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
              Explorar Torneos
            </a>
          </div>

          <div className="action-card">
            <div className="action-card-icon">📱</div>
            <h3 className="action-card-title">¡Probá la App de Jugadores!</h3>
            <p className="action-card-desc">
              Los mejores complejos deportivos, canchas disponibles y torneos competitivos de tu zona en tiempo real, todo desde tu celular.
            </p>
            <a href="#app-download" className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
              Descargá la App
            </a>
          </div>
        </div>
      </section>

      {/* BUSCADOR */}
      <section className="search-section" id="canchas">
        <div className="search-container">
          <h2 className="search-title">Buscá tu Cancha Ideal</h2>
          <p className="search-subtitle-main">Encontrá el lugar perfecto para tu próximo partido en segundos</p>
          
          <div className="search-bar">
            <div className="search-field">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Nombre de cancha, deporte o complejo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="search-field">
              <span className="search-icon">🏆</span>
              <select
                className="search-select"
                value={filtroDeporte}
                onChange={e => setFiltroDeporte(e.target.value)}
              >
                {SPORTS.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos los Deportes' : s}</option>)}
              </select>
            </div>
            <button className="search-btn" onClick={() => { window.location.href = `/buscar?deporte=${filtroDeporte === 'Todos' ? 'Todos' : filtroDeporte}&q=${busqueda}`; }}>
              Buscar Ahora
            </button>
          </div>

          {/* Filtros rápidos por deporte */}
          <div className="quick-filters">
            {SPORTS.map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filtroDeporte === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFiltroDeporte(s)}
              >
                {s !== 'Todos' && SPORT_ICONS[s]} {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS SECTION */}
      <TournamentsSection />

      {/* LISTADO DE CANCHAS */}
      <div className="section" id="listado-canchas">
        <div className="section-header">
          <div>
            <h2 className="section-title">Canchas Disponibles Hoy</h2>
            <div className="section-subtitle">
              {loading ? 'Cargando las mejores opciones...' : `${canchasFiltradas.length} cancha${canchasFiltradas.length !== 1 ? 's' : ''} encontrada${canchasFiltradas.length !== 1 ? 's' : ''} lista${canchasFiltradas.length !== 1 ? 's' : ''} para jugar`}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : canchasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔎</div>
            <h3>No encontramos canchas con ese criterio</h3>
            <p style={{ marginTop: 8, fontSize: 15 }}>Intentá buscando con otro deporte o limpiando los filtros.</p>
          </div>
        ) : (
          <div className="courts-grid">
            {canchasFiltradas.map(cancha => (
              <CourtCard
                key={cancha.id}
                cancha={cancha}
                sportIcon={SPORT_ICONS[cancha.deporte] || SPORT_ICONS['default']}
                onReservar={() => setSelectedCancha(cancha)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CARACTERÍSTICAS / QUE OFRECEMOS */}
      <section className="features-section" id="complejos-info">
        <div className="features-inner">
          <div className="features-eyebrow">Solución para Clubes</div>
          <h2 className="features-title">Llevá la Gestión de tu Club al Siguiente Nivel</h2>

          <div className="features-split">
            <div className="features-list">
              <div className="feature-item">
                <div className="feature-check">✓</div>
                <div>
                  <h4 className="feature-item-title">Gestión y Reserva sin Esfuerzo</h4>
                  <p className="feature-item-desc">Los clientes reservan online 24/7 de manera automatizada. Se acabaron los mensajes de WhatsApp a deshora y las planillas manuales.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-check">✓</div>
                <div>
                  <h4 className="feature-item-title">Agenda Digital Dinámica</h4>
                  <p className="feature-item-desc">Un panel de control interactivo para ver disponibilidad, fijar turnos fijos o casuales, y reorganizar la grilla en segundos.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-check">✓</div>
                <div>
                  <h4 className="feature-item-title">Manejo Dinámico de Precios y Promociones</h4>
                  <p className="feature-item-desc">Configurá tarifas diferenciadas por horarios (diurno/nocturno), días festivos o promociones relámpago para maximizar la ocupación.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-check">✓</div>
                <div>
                  <h4 className="feature-item-title">Reportes Estadísticos en Tiempo Real</h4>
                  <p className="feature-item-desc">Visualizá tus ganancias, las horas más reservadas, tasas de cancelaciones y clientes frecuentes para tomar decisiones inteligentes.</p>
                </div>
              </div>
            </div>

            <div className="features-visual">
              <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', color: '#fff', boxShadow: '0 15px 30px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>🏟️ Mi Club Dashboard</span>
                  <span style={{ fontSize: '12px', background: 'rgba(22,163,74,0.2)', color: '#4ade80', padding: '3px 8px', borderRadius: '100px' }}>En Línea</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #16a34a', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Cancha 1 (Fútbol 5)</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>Reserva confirmada · 19:00 - 20:00</div>
                    </div>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>120.000 Gs</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ea580c', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Cancha Pádel Cristal</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>Reserva confirmada · 20:00 - 21:30</div>
                    </div>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>180.000 Gs</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Cancha Tenis Arcilla · Libre 21:00</span>
                    <button style={{ background: '#16a34a', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px' }}>Asignar Turno</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTICS BANNER (Inspired by Reva.la) */}
      <section className="stats-banner">
        <h2 className="stats-banner-title">Hay buenas razones para estar orgullosos de nuestra comunidad</h2>
        <div className="stats-banner-grid">
          <div className="stats-banner-item">
            <div className="stats-banner-number">150+</div>
            <div className="stats-banner-label">Clubes felices en la red</div>
          </div>
          <div className="stats-banner-item">
            <div className="stats-banner-number">480+</div>
            <div className="stats-banner-label">Torneos organizados</div>
          </div>
          <div className="stats-banner-item">
            <div className="stats-banner-number">280,000+</div>
            <div className="stats-banner-label">Horas reservadas con éxito</div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="testimonials-section">
        <div className="features-eyebrow" style={{ textAlign: 'center' }}>Testimonios</div>
        <h2 className="features-title" style={{ textAlign: 'center', marginBottom: '56px' }}>Lo que opinan los Clubes y Jugadores</h2>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Desde que decidimos reservar nuestras 12 canchas online hemos podido dejar de preocuparnos por contestar llamadas y audios las 24 horas del día. MiCancha hace todo el trabajo por nosotros."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">RD</div>
              <div>
                <div className="testimonial-name">Rubén 'Jimmy' Duarte</div>
                <div className="testimonial-club">La Quinta Sports · Luque</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Es la mejor herramienta que tenemos para conectarnos de verdad con los clientes. Les facilita encontrar los horarios libres y a nosotros nos da una agenda dinámica espectacular."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">JB</div>
              <div>
                <div className="testimonial-name">Josue Barreto</div>
                <div className="testimonial-club">Complejo Mburicao · Asunción</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Buscábamos digitalizar toda la información de nuestras canchas de tenis y fútbol. MiCancha cubrió todas nuestras necesidades al instante. Excelente servicio de soporte."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">FH</div>
              <div>
                <div className="testimonial-name">Frank Hernández</div>
                <div className="testimonial-club">Oriental FC · Gran Asunción</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APP DOWNLOAD SECTION (Inspired by Reva.la) */}
      <section className="app-section" id="app-download">
        <div className="app-inner">
          <div className="app-visual">
            <div className="app-phone-mockup">
              <div className="app-phone-screen">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>📲 MiCancha App</span>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>● Activa</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>¡Hola, Jugador! 👋</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>¿Qué jugamos hoy?</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ background: '#16a34a', padding: '6px 10px', borderRadius: '100px', fontSize: '11px' }}>⚽ Fútbol</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '100px', fontSize: '11px' }}>🎾 Pádel</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', marginTop: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Cancha Libre en Mburicao</div>
                    <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '4px' }}>Hoy 20:00 · Fútbol 5 sintético</div>
                    <button style={{ width: '100%', background: '#ea580c', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', marginTop: '10px' }}>Reservar al Instante</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="features-eyebrow" style={{ textAlign: 'left' }}>Aplicación Móvil</div>
            <h2 className="app-title-main">Descubrí la aplicación para Jugadores</h2>
            <p className="app-desc">
              Buscá los mejores complejos deportivos de tu zona, visualizá grillas libres al instante y completá tus reservas sin moverte de donde estás. Todo el deporte en tu bolsillo.
            </p>
            <div className="features-list" style={{ marginBottom: '40px' }}>
              <div className="feature-item">
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>Conveniente Proceso de Reserva</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Reservá las canchas que más te gusten con solo un par de toques, sin demoras.</p>
                </div>
              </div>
              <div className="feature-item">
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>Acceso Dinámico a Torneos</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Inscribite, revisá fechas de partidos, goleadores y tablas de manera interactiva.</p>
                </div>
              </div>
              <div className="feature-item">
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>Recordatorios Instantáneos</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Recibí notificaciones automáticas para que tu equipo nunca llegue tarde.</p>
                </div>
              </div>
            </div>

            <div className="app-badges">
              <button className="app-badge-btn">
                <span>🍎</span> App Store
              </button>
              <button className="app-badge-btn">
                <span>🤖</span> Google Play
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CONVERSION CTA */}
      <section className="cta-section">
        <h2 className="cta-title">¿Administrás un Club Deportivo?</h2>
        <p className="cta-subtitle">
          Unite hoy a la red deportiva de mayor crecimiento en el país y empezá a recibir reservas automáticas 24/7 sin comisiones abusivas.
        </p>
        <div className="cta-actions">
          <a href="/admin" className="btn btn-accent btn-lg">🚀 Registrar mi Club Gratis</a>
          <a href="#complejos-info" className="btn btn-outline-white btn-lg">Saber Más</a>
        </div>
      </section>

      <Footer />

      {/* Modal de reserva pública */}
      {selectedCancha && (
        <BookingModal
          cancha={selectedCancha}
          apiUrl={API_URL}
          onClose={() => setSelectedCancha(null)}
          onSuccess={() => { 
            setSelectedCancha(null); 
            alert('¡Reserva confirmada! El complejo se pondrá en contacto contigo.'); 
          }}
        />
      )}
    </>
  );
}
