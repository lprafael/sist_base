import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Database,
  Truck,
  ClipboardCheck,
  Sparkles,
  Presentation,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = ({ user }) => {
  const [modal, setModal] = React.useState({ show: false, title: '', content: '' });

  const showLegal = (type) => {
    let title = '';
    let content = null;

    if (type === 'terminos') {
      title = 'Términos y Condiciones de Uso';
      content = (
        <div style={modalContentStyle}>
          <p>Al utilizar el Sistema Integral de Gestión Electoral (SIGEL), usted acepta los siguientes términos:</p>
          <ul>
            <li><strong>Uso Profesional:</strong> La plataforma está diseñada exclusivamente para la gestión de campañas electorales lícitas.</li>
            <li><strong>Veracidad de Datos:</strong> El usuario es responsable de la exactitud de la información cargada en el sistema.</li>
            <li><strong>Propiedad Intelectual:</strong> El software y su estructura son propiedad de Poliverso y su uso está sujeto a la licencia contratada.</li>
            <li><strong>Restricciones:</strong> Queda terminantemente prohibido el acceso no autorizado o el intento de vulnerar la seguridad del sistema.</li>
          </ul>
        </div>
      );
    } else if (type === 'privacidad') {
      title = 'Política de Privacidad y Manejo de Datos';
      content = (
        <div style={modalContentStyle}>
          <p>SIGEL se compromete con la protección de los datos electorales:</p>
          <ul>
            <li><strong>Confidencialidad:</strong> Los datos de votantes y simpatizantes no son compartidos con terceros ajenos a la campaña contratante.</li>
            <li><strong>Seguridad:</strong> Implementamos cifrado SSL y auditoría de accesos para proteger la información sensible.</li>
            <li><strong>Uso de Cookies:</strong> Utilizamos cookies técnicas esenciales para mantener la sesión activa y mejorar la experiencia de usuario.</li>
            <li><strong>Derechos ARCO:</strong> El administrador de cada campaña es responsable de gestionar las solicitudes de acceso o rectificación de sus datos cargados.</li>
          </ul>
        </div>
      );
    } else if (type === 'soporte') {
      title = 'Soporte Técnico y Consultas';
      content = (
        <div style={modalContentStyle}>
          <p>Si necesita asistencia técnica o demostraciones personalizadas, puede contactarnos a través de:</p>
          <div style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'left' }}>
            <p>📧 <strong>Email:</strong> soporte@sigel.in</p>
            <p>📱 <strong>WhatsApp:</strong> +595 9XX XXX XXX</p>
            <p>⏰ <strong>Horario:</strong> Lunes a Viernes 08:00 - 18:00 (Hora Paraguay)</p>
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#64748b' }}>
            Para incidentes críticos durante el Día D, el soporte estará activo 24 horas.
          </p>
        </div>
      );
    }

    setModal({ show: true, title, content });
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="landing-page" style={{ overflowX: 'hidden' }}>
      {/* Navbar Minimalista */}
      <nav className="landing-nav" style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        padding: '20px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-1px' }}>
          SIGEL
        </div>
        <Link to={user ? "/dashboard" : "/login"} style={{
          padding: '10px 24px',
          background: '#2563eb',
          color: 'white',
          borderRadius: '50px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
        }} className="login-nav-btn">
          {user ? "Ir al Panel" : "Ingresar al Sistema"}
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="hero" style={{
        padding: '160px 20px 100px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative'
      }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 style={{
            fontSize: '4.5rem',
            fontWeight: 900,
            color: '#1e3a8a',
            marginBottom: '20px',
            lineHeight: 1.1,
            letterSpacing: '-2px'
          }}>
            Gestión Electoral <span style={{ color: '#2563eb' }}>Inteligente</span>
          </h1>
          <p style={{
            fontSize: '1.4rem',
            color: '#64748b',
            maxWidth: '800px',
            margin: '0 auto 40px',
            lineHeight: 1.6
          }}>
            La plataforma definitiva para candidatos y equipos de campaña.
            Optimiza tu logística, detecta redes familiares y visualiza tu territorio en tiempo real.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <Link to={user ? "/dashboard" : "/login"} className="btn-hero-primary" style={{
              padding: '18px 40px',
              fontSize: '1.1rem',
              fontWeight: 700,
              background: '#2563eb',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)'
            }}>
              {user ? "Ir al Panel Principal" : "Empezar Ahora"} <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          style={{ marginTop: '60px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.15)', maxWidth: '1100px', margin: '60px auto 0' }}
        >
          <img src="/imagenes/sigel_election_hero_1772311729224.png" alt="SIGEL Dashboard" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </motion.div>
      </section>

      {/* Características / Etapas */}
      <section style={{ padding: '100px 50px', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '16px' }}>
            Inteligencia en cada etapa
          </h2>
          <div style={{ width: '60px', height: '4px', background: '#2563eb', margin: '0 auto' }}></div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}
        >
          {/* Etapa 1 */}
          <motion.div variants={itemVariants} className="feature-card" style={cardStyle}>
            <div style={iconContainerStyle}><Users color="#2563eb" size={32} /></div>
            <h3 style={cardTitleStyle}>Etapa 1: Captación Única</h3>
            <p style={cardTextStyle}>
              Registra simpatizantes con precisión milimétrica. Nuestro algoritmo detecta automáticamente
              núcleos familiares en el padrón electoral basándose en apellidos y domicilios.
            </p>
            <ul style={listStyle}>
              <li><CheckCircle2 size={16} color="#10b981" /> Detección de parientes</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Grados de seguridad (1-5)</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Mapa de calor de captación</li>
            </ul>
          </motion.div>

          {/* Gestión Global */}
          <motion.div variants={itemVariants} className="feature-card" style={cardStyle}>
            <div style={iconContainerStyle}><ShieldCheck color="#2563eb" size={32} /></div>
            <h3 style={cardTitleStyle}>Control de Colisión</h3>
            <p style={cardTextStyle}>
              ¿Múltiples candidatos trabajando para el mismo objetivo? El SuperAdministrador puede
              verificar si un votante ha sido prometido a más de un concejal.
            </p>
            <ul style={listStyle}>
              <li><CheckCircle2 size={16} color="#10b981" /> Auditoría de "Doble Carga"</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Multitenancy por Candidato</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Sinceramiento de lealtad</li>
            </ul>
          </motion.div>

          {/* Geo-Electoral */}
          <motion.div variants={itemVariants} className="feature-card" style={cardStyle}>
            <div style={iconContainerStyle}><MapPin color="#2563eb" size={32} /></div>
            <h3 style={cardTitleStyle}>Logística Geo-Electoral</h3>
            <p style={cardTextStyle}>
              Visualiza tus locales de votación y la densidad de tus votos seguros. Planifica el transporte
              y la logística del día E con datos geográficos reales (PostGIS).
            </p>
            <ul style={listStyle}>
              <li><CheckCircle2 size={16} color="#10b981" /> Ubicación GPS por captación</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Densidad zonal de votos</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Gestión de locales y secciones</li>
            </ul>
          </motion.div>

          {/* Logística Choferes */}
          <motion.div variants={itemVariants} className="feature-card" style={cardStyle}>
            <div style={iconContainerStyle}><Truck color="#2563eb" size={32} /></div>
            <h3 style={cardTitleStyle}>Logística de Traslado</h3>
            <p style={cardTextStyle}>
              Control de flota en tiempo real. Los choferes reciben sus listas de tareas por token y navegan
              hacia los locales mediante GPS, informando la llegada de cada votante.
            </p>
            <ul style={listStyle}>
              <li><CheckCircle2 size={16} color="#10b981" /> App PWA para Choferes</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Navegación GPS integrada</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Tracking de ubicación en vivo</li>
            </ul>
          </motion.div>

          {/* Veedores */}
          <motion.div variants={itemVariants} className="feature-card" style={cardStyle}>
            <div style={iconContainerStyle}><ClipboardCheck color="#2563eb" size={32} /></div>
            <h3 style={cardTitleStyle}>Control de Mesa (Veedores)</h3>
            <p style={cardTextStyle}>
              Sincronización total entre el transporte y la mesa. El veedor visualiza quién está en camino
              y quién ya llegó al local, registrando el voto al instante.
            </p>
            <ul style={listStyle}>
              <li><CheckCircle2 size={16} color="#10b981" /> Monitoreo de arribos</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Registro de voto en un clic</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Reporte de participación real</li>
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* Analytics Insight */}
      <section style={{
        padding: '100px 50px',
        background: '#1e3a8a',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '60px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '24px' }}>Toma decisiones basadas en datos reales</h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px', lineHeight: 1.6 }}>
              No dejes nada al azar. Nuestro dashboard entrega proyecciones de votos calculadas
              mediante el factor de seguridad y el ranking de efectividad de tus referentes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div>
                <BarChart3 size={40} style={{ marginBottom: '15px', color: '#60a5fa' }} />
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Proyección Real</h4>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Cálculo ponderado por grado de seguridad.</p>
              </div>
              <div>
                <Smartphone size={40} style={{ marginBottom: '15px', color: '#60a5fa' }} />
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>App de Campo</h4>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Interfaz amigable para carga rápida en territorio.</p>
              </div>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{
              flex: 1,
              minWidth: '300px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '40px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <div style={{ marginBottom: '15px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={20} /> <span style={{ fontWeight: 600 }}>Cálculo de Red Familiar</span>
            </div>
            <div style={{ fontStyle: 'italic', marginBottom: '20px', color: 'rgba(255,255,255,0.7)' }}>
              "El sistema ha detectado 3 parientes de Juan Pérez en el mismo distrito no registrados aún."
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ height: '8px', width: '80%', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '8px' }}></div>
                <div style={{ height: '8px', width: '50%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA: Prueba Gratuita y Capacitación */}
      <section style={{ 
        padding: '100px 20px', 
        background: '#f1f5f9', 
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '24px' }}>
            ¿Listo para llevar tu campaña al siguiente nivel?
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '50px' }}>
            Ofrecemos planes adaptados a cada necesidad, incluyendo opciones para nuevos candidatos.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '30px',
            marginBottom: '60px'
          }}>
            <div style={benefitStyle}>
              <Sparkles color="#2563eb" size={32} style={{ marginBottom: '15px' }} />
              <h4 style={{ fontWeight: 700 }}>Prueba Gratuita</h4>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Acceso de cortesía previa autorización del administrador.</p>
            </div>
            <div style={benefitStyle}>
              <Presentation color="#2563eb" size={32} style={{ marginBottom: '15px' }} />
              <h4 style={{ fontWeight: 700 }}>Demostración</h4>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Presentación personalizada de todas las funciones.</p>
            </div>
            <div style={benefitStyle}>
              <GraduationCap color="#2563eb" size={32} style={{ marginBottom: '15px' }} />
              <h4 style={{ fontWeight: 700 }}>Capacitación</h4>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Entrenamiento completo para tus referentes y choferes.</p>
            </div>
          </div>

          <Link to="/login" style={{
            padding: '20px 50px',
            background: '#1e3a8a',
            color: 'white',
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(30, 58, 138, 0.3)'
          }}>
            Solicitar Acceso <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 50px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '20px' }}>
          SIGEL
        </div>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>© 2026 Sistema de Gestión Electoral Profesional. Todos los derechos reservados.</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button onClick={() => showLegal('terminos')} style={footerLinkStyle}>Términos</button>
          <button onClick={() => showLegal('privacidad')} style={footerLinkStyle}>Privacidad</button>
          <button onClick={() => showLegal('soporte')} style={footerLinkStyle}>Soporte</button>
        </div>
      </footer>

      {/* Modal para Legal/Soporte */}
      {modal.show && (
        <div style={overlayStyle} onClick={() => setModal({ ...modal, show: false })}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={modalStyle} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 800 }}>{modal.title}</h3>
              <button onClick={() => setModal({ ...modal, show: false })} style={closeBtnStyle}>×</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {modal.content}
            </div>
            <div style={{ marginTop: '30px', textAlign: 'right' }}>
              <button onClick={() => setModal({ ...modal, show: false })} style={acceptBtnStyle}>Cerrar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Estilos Reutilizables
const cardStyle = {
  padding: '40px',
  borderRadius: '20px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  transition: 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column'
};

const iconContainerStyle = {
  width: '64px',
  height: '64px',
  background: 'white',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
};

const cardTitleStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#1e3a8a',
  marginBottom: '16px'
};

const cardTextStyle = {
  color: '#64748b',
  lineHeight: 1.6,
  marginBottom: '24px',
  flex: 1
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  fontSize: '0.9rem',
  color: '#475569',
  fontWeight: 500
};

const benefitStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '20px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const footerLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  fontSize: '1rem'
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '20px'
};

const modalStyle = {
  background: 'white',
  padding: '40px',
  borderRadius: '24px',
  maxWidth: '700px',
  width: '100%',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  maxHeight: '90vh',
  overflow: 'hidden',
  position: 'relative'
};

const modalContentStyle = {
  lineHeight: 1.6,
  color: '#475569',
  textAlign: 'left'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '2rem',
  color: '#94a3b8',
  cursor: 'pointer',
  lineHeight: 1,
  padding: '0 10px'
};

const acceptBtnStyle = {
  padding: '12px 30px',
  background: '#1e3a8a',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer'
};

export default LandingPage;
