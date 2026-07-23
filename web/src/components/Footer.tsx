'use client';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">
            Mi<span>Cancha</span>
          </div>
          <p className="footer-about">
            La plataforma líder de reservas y gestión de clubes deportivos en Paraguay. Digitalizá tu negocio y conectá con miles de jugadores.
          </p>
        </div>

        <div>
          <h4 className="footer-title">Jugadores</h4>
          <div className="footer-links">
            <a href="#canchas" className="footer-link">Buscar Canchas</a>
            <a href="#torneos" className="footer-link">Ver Torneos</a>
            <a href="#app-download" className="footer-link">Descargar App</a>
            <a href="/registro" className="footer-link">Crear Cuenta</a>
          </div>
        </div>

        <div>
          <h4 className="footer-title">Clubes</h4>
          <div className="footer-links">
            <a href="/admin" className="footer-link">Panel Administrativo</a>
            <a href="#complejos-info" className="footer-link">Registrar mi Club</a>
            <a href="#complejos-info" className="footer-link">Características</a>
            <a href="#" className="footer-link">Casos de Éxito</a>
          </div>
        </div>

        <div>
          <h4 className="footer-title">Contacto & Redes</h4>
          <div className="footer-links">
            <span className="footer-link" style={{ cursor: 'default' }}>📍 Asunción, Paraguay</span>
            <span className="footer-link" style={{ cursor: 'default' }}>✉️ micancha.com.py@gmail.com</span>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <a href="#" className="footer-link" style={{ fontSize: '18px' }}>📸</a>
              <a href="#" className="footer-link" style={{ fontSize: '18px' }}>👥</a>
              <a href="#" className="footer-link" style={{ fontSize: '18px' }}>💼</a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          © {new Date().getFullYear()} MiCancha · Paraguay. Todos los derechos reservados.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#" className="footer-link">Términos y Condiciones</a>
          <a href="#" className="footer-link">Política de Privacidad</a>
        </div>
      </div>
    </footer>
  );
}
