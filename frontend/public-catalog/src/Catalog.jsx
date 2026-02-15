import React, { useState, useEffect } from "react";
import "./Catalog.css";

const PublicCatalog = ({ user }) => {
    const [vehicles, setVehicles] = useState([]);
    const [featuredVehicle, setFeaturedVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [categories, setCategories] = useState([]);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || "/api";

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_URL}/playa/vehiculos?available_only=true`);
            const data = await response.json();
            setVehicles(data);

            if (data.length > 0) {
                const randomIdx = Math.floor(Math.random() * data.length);
                setFeaturedVehicle(data[randomIdx]);
            }
        } catch (error) {
            console.error("Error fetching vehicles:", error);
        } finally {
            setLoading(false);
        }
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
        if (vehicle.imagenes && vehicle.imagenes.length > 0) {
            const principal = vehicle.imagenes.find(img => img.es_principal) || vehicle.imagenes[0];
            const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
            return `${baseUrl}${principal.ruta_archivo}`;
        }
        return "/placeholder-car.jpg";
    };

    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch = (v.marca + " " + v.modelo).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || v.id_categoria === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(price);
    };

    const handleWhatsApp = (vehicle) => {
        const message = `Hola! Estoy interesado en el ${vehicle.marca} ${vehicle.modelo} (${vehicle.anho_fabricacion}) que vi en su web.`;
        const phone = "595981123456";
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

            {featuredVehicle && (
                <section className="hero-section" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${getImageUrl(featuredVehicle)})` }}>
                    <div className="hero-content">
                        <span className="badge">Destacado de hoy</span>
                        <h1>{featuredVehicle.marca} {featuredVehicle.modelo}</h1>
                        <p className="hero-price">{formatPrice(featuredVehicle.precio_venta)}</p>
                        <div className="hero-details">
                            <span>📅 {featuredVehicle.anho_fabricacion}</span>
                            <span>🎨 {featuredVehicle.color}</span>
                            <span>⛽ {featuredVehicle.tipo_combustible || 'Nafta'}</span>
                        </div>
                        <button className="cta-button" onClick={() => handleWhatsApp(featuredVehicle)}>
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
                                    <span>{vehicle.anho_fabricacion}</span>
                                    <span>•</span>
                                    <span>{vehicle.color}</span>
                                </div>
                                <p className="card-price">{formatPrice(vehicle.precio_venta)}</p>
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
                        <p>📍 Av. Principal 123, Ciudad</p>
                        <p>📞 +595 981 123 456</p>
                        <p>✉️ ventas@peraltaautomotores.com.py</p>
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

            <a href="https://wa.me/595981123456" className="whatsapp-float" target="_blank" rel="noopener noreferrer">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" />
            </a>
        </div>
    );
};

export default PublicCatalog;
