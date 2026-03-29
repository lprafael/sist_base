import React, { useState, useEffect } from "react";
import "./Catalog.css";

const PublicCatalog = ({ user }) => {
    const [vehicles, setVehicles] = useState([]);
    const [featuredVehicles, setFeaturedVehicles] = useState([]);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [categories, setCategories] = useState([]);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || "/api";
    /** ID de playa en sistema (sistema.playas.id) — obligatorio para catálogo sin sesión */
    const PUBLIC_PLAYA_ID = import.meta.env.VITE_PUBLIC_PLAYA_ID;

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, []);

    const fetchData = async () => {
        try {
            if (!PUBLIC_PLAYA_ID) {
                console.error("Defina VITE_PUBLIC_PLAYA_ID en el entorno del catálogo público.");
                setLoading(false);
                return;
            }
            const qp = new URLSearchParams({ available_only: "true", id_playa_publico: String(PUBLIC_PLAYA_ID) });
            const responseV = await fetch(`${API_URL}/playa/vehiculos?${qp}`);
            const rawV = await responseV.json();
            const vehiclesData = Array.isArray(rawV) ? rawV : [];
            if (!Array.isArray(rawV)) {
                console.warn("playa/vehiculos: se esperaba un array; respuesta:", rawV);
            }
            if (!responseV.ok) {
                setVehicles([]);
                setFeaturedVehicles([]);
                return;
            }
            setVehicles(vehiclesData);

            const responseT = await fetch(`${API_URL}/playa/vehiculos/top-vendidos?id_playa=${encodeURIComponent(PUBLIC_PLAYA_ID)}`);
            const rawT = await responseT.json();
            const topData = Array.isArray(rawT) ? rawT : [];

            // Filtrar vehículos disponibles que coincidan con los más vendidos
            // Si no hay disponibles de los más vendidos, usamos una selección aleatoria de los disponibles
            let featured = vehiclesData.filter(v =>
                topData.some(t => t.marca === v.marca && t.modelo === v.modelo)
            );

            if (featured.length === 0 && vehiclesData.length > 0) {
                // Shuffle y tomar 5
                featured = [...vehiclesData].sort(() => 0.5 - Math.random()).slice(0, 5);
            } else if (featured.length > 5) {
                featured = featured.slice(0, 5);
            }

            setFeaturedVehicles(featured);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            setVehicles([]);
            setFeaturedVehicles([]);
        } finally {
            setLoading(false);
        }
    };

    // Efecto para la rotación del vehículo destacado
    useEffect(() => {
        if (featuredVehicles.length > 1) {
            const interval = setInterval(() => {
                setFeaturedIndex((prev) => (prev + 1) % featuredVehicles.length);
            }, 5000); // Rotar cada 5 segundos
            return () => clearInterval(interval);
        }
    }, [featuredVehicles]);

    const fetchCategories = async () => {
        try {
            if (!PUBLIC_PLAYA_ID) return;
            const response = await fetch(`${API_URL}/playa/categorias?id_playa_publico=${encodeURIComponent(PUBLIC_PLAYA_ID)}`);
            const raw = await response.json();
            setCategories(Array.isArray(raw) ? raw : []);
        } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
        }
    };

    const getImageUrl = (vehicle) => {
        const imgs = Array.isArray(vehicle.imagenes) ? vehicle.imagenes : [];
        if (imgs.length > 0) {
            const principal = imgs.find(img => img.es_principal) || imgs[0];
            const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
            return `${baseUrl}${principal.ruta_archivo}`;
        }
        // Imagen estándar en caso de no tener fotos
        return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=1000";
    };

    const vehiclesList = Array.isArray(vehicles) ? vehicles : [];
    const filteredVehicles = vehiclesList.filter(v => {
        const matchesSearch = (v.marca + " " + v.modelo).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || v.id_categoria === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(price);
    };

    const handleWhatsApp = (vehicle) => {
        const message = `Hola! Estoy interesado en el ${vehicle.marca} ${vehicle.modelo} (${vehicle.anho_fabricacion}) que vi en su web.`;
        const phone = "595981431983";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (loading) {
        return <div className="public-loader">Cargando catálogo...</div>;
    }

    return (
        <div className="catalog-container">
            <nav className="catalog-nav">
                <div className="nav-content">
                    <img src="/imágenes/Logo_moderno2.png" alt="Peralta Automotores" className="nav-logo" />
                    <div className="nav-links">
                        <a href="#inventario">Inventario</a>
                        <a href="#contacto">Contacto</a>
                        {user ? (
                            <button className="btn-admin-link" onClick={() => window.location.href = "/admin"}>Ir al Sistema</button>
                        ) : (
                            <button className="btn-admin-link" onClick={() => window.location.href = "/login"}>Admin</button>
                        )}
                    </div>
                </div>
            </nav>

            {featuredVehicles.length > 0 && (
                <section className="hero-section" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${getImageUrl(featuredVehicles[featuredIndex])})` }}>
                    <div className="hero-content">
                        <span className="badge">Destacado {featuredVehicles.length > 1 ? `(${featuredIndex + 1}/${featuredVehicles.length})` : ''}</span>
                        <h1>{featuredVehicles[featuredIndex].marca} {featuredVehicles[featuredIndex].modelo}</h1>
                        <div className="hero-details">
                            <span>📅 {featuredVehicles[featuredIndex].anho_fabricacion || featuredVehicles[featuredIndex].año}</span>
                            <span>🎨 {featuredVehicles[featuredIndex].color}</span>
                            <span>⛽ {featuredVehicles[featuredIndex].tipo_combustible || featuredVehicles[featuredIndex].combustible || 'Nafta'}</span>
                        </div>
                        <button className="cta-button" onClick={() => handleWhatsApp(featuredVehicles[featuredIndex])}>
                            Consultar Ahora
                        </button>
                    </div>
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
                        <div key={vehicle.id_producto} className="vehicle-card glass">
                            <div className="card-image-wrapper">
                                <img src={getImageUrl(vehicle)} alt={vehicle.modelo} />
                                <div className="card-overlay">
                                    <button onClick={() => handleWhatsApp(vehicle)}>WhatsApp</button>
                                </div>
                            </div>
                            <div className="card-info">
                                <h3>{vehicle.marca} {vehicle.modelo}</h3>
                                <div className="card-specs">
                                    <span>{vehicle.anho_fabricacion || vehicle.año}</span>
                                    <span>•</span>
                                    <span>{vehicle.color}</span>
                                </div>
                            </div>
                        </div>
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
                            <span>FB</span>
                            <span>IG</span>
                            <span>TT</span>
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
        </div>
    );
};

export default PublicCatalog;
