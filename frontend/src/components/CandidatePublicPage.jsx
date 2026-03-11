import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './CandidatePublicPage.css';

const CandidatePublicPage = () => {
    const { slug } = useParams();
    const [candidate, setCandidate] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCandidateInfo = async () => {
            try {
                // Fetch public candidate data
                const cResponse = await fetch(`/api/public/candidatos/${slug}`);
                if (!cResponse.ok) throw new Error('Candidato no encontrado');
                const cData = await cResponse.json();
                setCandidate(cData);

                // Fetch public activities
                const aResponse = await fetch(`/api/public/candidatos/${slug}/actividades`);
                if (aResponse.ok) {
                    const aData = await aResponse.json();
                    setActivities(aData);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCandidateInfo();
    }, [slug]);

    if (loading) {
        return <div className="loading-screen"><div className="loader">Cargando perfil...</div></div>;
    }

    if (error || !candidate) {
        return (
            <div className="candidate-public-error">
                <h2>Opps! 🛑</h2>
                <p>No pudimos encontrar la página de este candidato.</p>
                <Link to="/" className="btn-primary">Volver al inicio</Link>
            </div>
        );
    }

    // Default configuration if config is missing parts
    const config = candidate.config || {};
    const heroImage = config.hero_image || 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80';
    const profileImage = config.profile_image || '/imágenes/default_avatar.png';
    const bioText = config.bio || `Soy ${candidate.nombre_completo}, un ciudadano comprometido con nuestra ciudad y los valores de nuestro partido. Trabajaré incansablemente para llevar el progreso y bienestar a todas las familias de nuestra comunidad.`;
    const ejes = config.ejes || [
        { titulo: 'Seguridad', descripcion: 'Mayor presencia policial y cámaras inteligentes.' },
        { titulo: 'Salud', descripcion: 'Atención 24/7 en los centros de salud comunitarios.' },
        { titulo: 'Infraestructura', descripcion: 'Calles asfaltadas e iluminación LED 100%.' }
    ];

    const esSlogan = config.slogan || `¡Vamos juntos por una ciudad mejor!`;

    const concejales = candidate.equipo || [];

    return (
        <div className="candidate-public-layout">
            {/* Header/Nav */}
            <header className="candidate-nav">
                <div className="nav-container">
                    <div className="nav-logo">🗳️ {candidate.nombre_completo}</div>
                    <nav className="nav-links">
                        <a href="#quien-soy">Quién Soy</a>
                        {concejales.length > 0 && <a href="#equipo">El Equipo</a>}
                        <a href="#ejes">Propuestas</a>
                        <a href="#actividades">Actividades</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="candidate-hero" style={{ backgroundImage: `linear-gradient(rgba(185, 28, 28, 0.8), rgba(0, 0, 0, 0.6)), url(${heroImage})` }}>
                <div className="hero-content">
                    <h1>{candidate.nombre_completo}</h1>
                    <h2 className="hero-rol">Candidato a {candidate.rol.charAt(0).toUpperCase() + candidate.rol.slice(1)}</h2>
                    <p className="hero-slogan">"{esSlogan}"</p>
                    <div className="hero-cta">
                        <a href="#quien-soy" className="btn-primary">Conóceme</a>
                        <a href="#actividades" className="btn-secondary">Sigue mi campaña</a>
                    </div>
                </div>
            </section>

            {/* Quién Soy */}
            <section id="quien-soy" className="candidate-bio-section">
                <div className="container bio-grid">
                    <div className="bio-image-wrapper">
                        <img src={profileImage} alt={candidate.nombre_completo} className="bio-image" />
                    </div>
                    <div className="bio-text">
                        <h2 className="section-title">Quién Soy</h2>
                        <div className="title-underline"></div>
                        <p>{bioText}</p>
                    </div>
                </div>
            </section>

            {/* Ejes Estratégicos */}
            <section id="ejes" className="candidate-ejes-section">
                <div className="container">
                    <h2 className="section-title text-center">Nuestros Ejes Estratégicos</h2>
                    <div className="title-underline center"></div>
                    <div className="ejes-grid">
                        {ejes.map((eje, idx) => (
                            <div className="eje-card" key={idx}>
                                <div className="eje-icon">📍</div>
                                <h3>{eje.titulo}</h3>
                                <p>{eje.descripcion}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* El Equipo (Solo si es Intendente y tiene concejales) */}
            {concejales.length > 0 && (
                <section id="equipo" className="candidate-equipo-section">
                    <div className="container">
                        <h2 className="section-title text-center">Nuestros Candidatos a Concejales</h2>
                        <div className="title-underline center"></div>
                        <div className="equipo-grid">
                            {concejales.map((miembro, idx) => (
                                <Link to={`/candidato/${miembro.slug}`} className="equipo-card" key={idx}>
                                    <img src={miembro.foto || '/imágenes/default_avatar.png'} alt={miembro.nombre} />
                                    <h4>{miembro.nombre}</h4>
                                    <span>Candidato a Concejal</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Actividades */}
            <section id="actividades" className="candidate-actividades-section">
                <div className="container">
                    <h2 className="section-title text-center">Actividades de la Campaña</h2>
                    <div className="title-underline center"></div>
                    {activities.length === 0 ? (
                        <p className="no-activities text-center">Aún no hay actividades públicas agendadas.</p>
                    ) : (
                        <div className="actividades-timeline">
                            {activities.map(act => {
                                const actDate = new Date(act.fecha_programada || act.fecha_prevista);
                                const isFuture = actDate > new Date();
                                return (
                                    <div className={`actividad-card ${isFuture ? 'act-futura' : 'act-pasada'}`} key={act.id}>
                                        <div className="act-header">
                                            <h3>{act.titulo}</h3>
                                            <span className={`act-badge ${act.estado}`}>{act.estado}</span>
                                        </div>
                                        <p className="act-type"><strong>Tipo:</strong> {act.tipo}</p>
                                        <p className="act-date"><strong>Fecha:</strong> {actDate.toLocaleDateString()} a las {actDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        {act.observaciones && <p className="act-obs">{act.observaciones}</p>}

                                        {act.fotos && act.fotos.length > 0 && (
                                            <div className="act-fotos">
                                                {act.fotos.slice(0, 3).map(foto => (
                                                    <img key={foto.id} src={`/api/${foto.ruta_archivo}`} alt="Actividad" />
                                                ))}
                                                {act.fotos.length > 3 && <div className="more-fotos">+{act.fotos.length - 3} fotos</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="candidate-footer">
                <div className="container text-center">
                    <h2>{candidate.nombre_completo}</h2>
                    <p>La opción de todos - Lista 1</p>
                    <p className="copyright">&copy; {new Date().getFullYear()} Todos los derechos reservados. Desarrollado por SIGEL.</p>
                </div>
            </footer>
        </div>
    );
};

export default CandidatePublicPage;
