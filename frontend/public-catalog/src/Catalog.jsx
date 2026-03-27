import React, { useState, useEffect } from "react";
import "./Catalog.css";

const ImageModal = ({ vehicle, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const images = (vehicle?.imagenes || []).filter(img => img.imagen_con_marca);

    const getFullImageUrl = (img) => {
        const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
        return `${baseUrl}${img.imagen_con_marca}`;
    };

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    if (!vehicle) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <button className="modal-close" onClick={onClose}>&times;</button>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-thumbnails">
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            className={`thumb-item ${currentIndex === idx ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                        >
                            <img src={getFullImageUrl(img)} alt={`Thumbnail ${idx}`} />
                        </div>
                    ))}
                </div>
                <div className="modal-main-image">
                    {images.length > 1 && (
                        <button className="modal-nav-btn prev" onClick={() => setCurrentIndex((currentIndex - 1 + images.length) % images.length)}>
                            &#10094;
                        </button>
                    )}
                    <img src={getFullImageUrl(images[currentIndex])} alt={vehicle.modelo} />
                    {images.length > 1 && (
                        <button className="modal-nav-btn next" onClick={() => setCurrentIndex((currentIndex + 1) % images.length)}>
                            &#10095;
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const VehicleCard = ({ vehicle, onWhatsApp, onPhotoClick }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const images = (vehicle.imagenes || []).filter(img => img.imagen_con_marca);
    const hasImages = images.length > 0;

    useEffect(() => {
        if (!isHovered) {
            const principalIndex = images.findIndex(img => img.es_principal);
            setCurrentImageIndex(principalIndex !== -1 ? principalIndex : 0);
            return;
        }

        if (images.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % images.length);
        }, 1200);

        return () => clearInterval(interval);
    }, [isHovered, images]);

    const getImageUrl = () => {
        if (!hasImages) return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=1000";

        const img = images[currentImageIndex] || images[0];
        const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
        return `${baseUrl}${img.imagen_con_marca}`;
    };

    return (
        <div
            className="vehicle-card glass"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="card-image-wrapper">
                <img src={getImageUrl()} alt={`${vehicle.marca} ${vehicle.modelo}`} />
                <div className="card-overlay" onClick={() => onPhotoClick(vehicle)}>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        onWhatsApp(vehicle);
                    }}>WhatsApp</button>
                    {hasImages && images.length > 1 && isHovered && (
                        <div className="image-counter">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    )}
                </div>
            </div>
            <div className="card-info">
                <h3>{vehicle.marca} {vehicle.modelo}</h3>
                <div className="card-specs">
                    <span>{vehicle.anho_fabricacion || vehicle.año}</span>
                    <span>•</span>
                    <span>{vehicle.color}</span>
                    {vehicle.motor && (
                        <>
                            <span>•</span>
                            <span>{vehicle.motor}</span>
                        </>
                    )}
                    {vehicle.transmision && (
                        <>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{vehicle.transmision.toLowerCase()}</span>
                        </>
                    )}
                    {vehicle.combustible && (
                        <>
                            <span>•</span>
                            <span>{vehicle.combustible}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const PublicCatalog = ({ user }) => {
    const [vehicles, setVehicles] = useState([]);
    const [featuredVehicles, setFeaturedVehicles] = useState([]);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [categories, setCategories] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedVehicleForModal, setSelectedVehicleForModal] = useState(null);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || "/api";

    useEffect(() => {
        fetchData();
        fetchCategories();

        // Polling cada 30 segundos para que se actualice "automáticamente"
        const interval = setInterval(() => {
            fetchData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Obtener vehículos disponibles
            const responseV = await fetch(`${API_URL}/playa/vehiculos?available_only=true`);
            const vehiclesData = await responseV.json();
            setVehicles(vehiclesData);

            // Obtener los 5 más vendidos (marcas/modelos)
            const responseT = await fetch(`${API_URL}/playa/vehiculos/top-vendidos`);
            const topData = await responseT.json();

            // Filtrar vehículos disponibles que coincidan con los más vendidos
            let featured = vehiclesData.filter(v =>
                topData.some(t => t.marca === v.marca && t.modelo === v.modelo)
            );

            if (featured.length === 0 && vehiclesData.length > 0) {
                featured = [...vehiclesData].sort(() => 0.5 - Math.random()).slice(0, 5);
            } else if (featured.length > 5) {
                featured = featured.slice(0, 5);
            }

            setFeaturedVehicles(featured);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    // Efecto para la rotación del vehículo destacado
    useEffect(() => {
        if (featuredVehicles.length > 1) {
            const interval = setInterval(() => {
                setFeaturedIndex((prev) => (prev + 1) % featuredVehicles.length);
            }, 6000);
            return () => clearInterval(interval);
        }
    }, [featuredVehicles, featuredIndex]); // Reset interval if index changes manually

    const nextFeatured = () => {
        setFeaturedIndex((prev) => (prev + 1) % featuredVehicles.length);
    };

    const prevFeatured = () => {
        setFeaturedIndex((prev) => (prev - 1 + featuredVehicles.length) % featuredVehicles.length);
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/playa/categorias`);
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const getImageUrl = (vehicle) => {
        const watermarkedImages = (vehicle.imagenes || []).filter(img => img.imagen_con_marca);
        if (watermarkedImages.length > 0) {
            const principal = watermarkedImages.find(img => img.es_principal) || watermarkedImages[0];
            const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
            return `${baseUrl}${principal.imagen_con_marca}`;
        }
        // Imagen estándar en caso de no tener fotos (Unsplash)
        return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=1000";
    };

    const filteredVehicles = vehicles.filter(v => {
        const searchInput = searchTerm.toLowerCase();
        const matchesSearch = (v.marca + " " + v.modelo).toLowerCase().includes(searchInput) ||
            (v.chasis || "").toLowerCase().includes(searchInput);

        const matchesCategory = selectedCategory === "all" || v.id_categoria === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(price);
    };

    const handleWhatsApp = (vehicle) => {
        const message = `Hola! Estoy interesado en el ${vehicle.marca} ${vehicle.modelo} (${vehicle.anho_fabricacion || vehicle.año}) que vi en su web.`;
        const phone = "595981431983";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (loading) {
        return (
            <div className="public-loader">
                <div className="loader-spinner"></div>
                <p>Cargando catálogo...</p>
            </div>
        );
    }

    return (
        <div className="catalog-container">
            <nav className="catalog-nav">
                <div className="benefits-banner">
                    <div className="benefits-content">
                        <div className="benefit-item">
                            <span className="benefit-icon">💳</span>
                            <span>Financiación Propia</span>
                        </div>
                        <span className="separator">|</span>
                        <div className="benefit-item">
                            <span className="benefit-icon">📋</span>
                            <span>Mínimos Requisitos</span>
                        </div>
                        <span className="separator">|</span>
                        <div className="benefit-item">
                            <span className="benefit-icon">⚡</span>
                            <span>Aprobación Inmediata</span>
                        </div>
                    </div>
                </div>
                <div className="nav-content">
                    <img src="/imágenes/Logo_moderno2.png" alt="Peralta Automotores" className="nav-logo" />

                    <button
                        className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                        <a href="#inventario" onClick={() => setMobileMenuOpen(false)}>Inventario</a>
                        <a href="#contacto" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
                        {user ? (
                            <button className="btn-admin-link" onClick={() => window.location.href = "/admin"}>Ir al Sistema</button>
                        ) : (
                            <button className="btn-admin-link" onClick={() => window.location.href = "/login"}>Admin</button>
                        )}
                    </div>
                </div>
            </nav>

            {featuredVehicles.length > 0 && (
                <section className="hero-section" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${getImageUrl(featuredVehicles[featuredIndex])})` }}>
                    {featuredVehicles.length > 1 && (
                        <>
                            <button className="hero-nav-btn prev" onClick={prevFeatured} aria-label="Anterior">
                                &#10094;
                            </button>
                            <button className="hero-nav-btn next" onClick={nextFeatured} aria-label="Siguiente">
                                &#10095;
                            </button>
                        </>
                    )}

                    <div className="hero-content">
                        <div className="hero-badge-container">
                            <span className="badge">Destacado</span>
                        </div>
                        <h1>{featuredVehicles[featuredIndex].marca} {featuredVehicles[featuredIndex].modelo}</h1>
                        <div className="hero-details">
                            <div className="detail-item">
                                <span className="detail-icon">📅</span>
                                <span>{featuredVehicles[featuredIndex].anho_fabricacion || featuredVehicles[featuredIndex].año}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-icon">🎨</span>
                                <span>{featuredVehicles[featuredIndex].color}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-icon">⛽</span>
                                <span>{featuredVehicles[featuredIndex].tipo_combustible || featuredVehicles[featuredIndex].combustible || 'Nafta'}</span>
                            </div>
                        </div>
                        <div className="hero-actions">
                            <button className="cta-button" onClick={() => handleWhatsApp(featuredVehicles[featuredIndex])}>
                                Consultar Ahora
                            </button>
                        </div>
                    </div>

                    {featuredVehicles.length > 1 && (
                        <div className="hero-dots">
                            {featuredVehicles.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`dot ${featuredIndex === idx ? 'active' : ''}`}
                                    onClick={() => setFeaturedIndex(idx)}
                                    aria-label={`Ir a destacado ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            <section id="inventario" className="inventory-section">
                <div className="section-header">
                    <h2>Nuestra Flota</h2>
                    <div className="filters">
                        <input
                            type="text"
                            placeholder="Buscar marca o modelo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="all">Todas las categorías</option>
                            {categories.map(cat => (
                                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="vehicle-grid">
                    {filteredVehicles.map(vehicle => (
                        <VehicleCard
                            key={vehicle.id_producto}
                            vehicle={vehicle}
                            onWhatsApp={handleWhatsApp}
                            onPhotoClick={setSelectedVehicleForModal}
                        />
                    ))}
                </div>
                {filteredVehicles.length === 0 && <p className="no-results">No se encontraron vehículos.</p>}
            </section>

            <footer id="contacto" className="catalog-footer">
                <div className="footer-content">
                    <div className="footer-info">
                        <img src="/imágenes/Logo_actualizado2.png" alt="Logo" />
                        <p>Líderes en venta de vehículos con la mejor financiación del mercado.</p>
                    </div>
                    <div className="footer-contact">
                        <h4>Contacto</h4>
                        <p>📍 Avda. Ingavi 1165 c/ 6 de enero, Fdo de la Mora</p>
                        <p>📞 +595 981 431 983</p>
                        <p>✉️ peraltaautomotores@hotmail.com.py</p>
                    </div>
                    <div className="footer-social">
                        <h4>Síguenos</h4>
                        <div className="social-icons">
                            <a href="https://www.facebook.com/peraltaautomotores" target="_blank" rel="noopener noreferrer" className="social-link" title="Facebook">
                                FB
                            </a>
                            <a href="https://www.instagram.com/peraltaautomotores1/?hl=es" target="_blank" rel="noopener noreferrer" className="social-link" title="Instagram">
                                IG
                            </a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2026 Peralta Automotores. Todos los derechos reservados.</p>
                </div>
            </footer>

            <a 
                href={`https://wa.me/595981431983?text=${encodeURIComponent("Hola, estuve mirando desde la web algunos vehículos de la flota que tienen en playa y quería conocer más detalles sobre algunos modelos.")}`} 
                className="whatsapp-float" 
                target="_blank" 
                rel="noopener noreferrer"
            >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" />
            </a>

            {selectedVehicleForModal && (
                <ImageModal
                    vehicle={selectedVehicleForModal}
                    onClose={() => setSelectedVehicleForModal(null)}
                />
            )}
        </div>
    );
};

export default PublicCatalog;
