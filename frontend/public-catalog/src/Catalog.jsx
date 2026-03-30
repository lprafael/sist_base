import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./Catalog.css";

// Components
import VehicleCard from "./components/VehicleCard";
import ImageModal from "./components/ImageModal";
import SkeletonLoader from "./components/SkeletonLoader";
import PublishForm from "./components/PublishForm";
import GoogleLogin from "./components/GoogleLogin";
import MyPublications from "./components/MyPublications";

// Utils
import { 
  API_URL, 
  DEFAULT_WA, 
  FILTROS_VACIOS, 
  añoVehiculo, 
  imagenesLista, 
  telParticular,
  getFullImageUrl,
  precioMostrar
} from "./utils/helpers";

const initialOferta = {
  marca: "", modelo: "", chasis: "", año: "", color: "",
  combustible: "", transmision: "", precio_pyg: "",
  telefono: "", nombre_contacto: "", ciudad: "", observaciones: ""
};

export default function PublicCatalog() {
  const [vehicles, setVehicles] = useState([]);
  const [playas, setPlayas] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("mc_user");
      return u ? JSON.parse(u) : null;
    } catch (_) { return null; }
  });
  const [misOfertas, setMisOfertas] = useState([]);
  const [loadingMisOfertas, setLoadingMisOfertas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 48;

  // Catálogos Normalizados
  const [catalogoTipos, setCatalogoTipos] = useState([]);
  const [catalogoMarcas, setCatalogoMarcas] = useState([]);
  const [catalogoModelos, setCatalogoModelos] = useState([]);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filtrosDraft, setFiltrosDraft] = useState(() => ({ ...FILTROS_VACIOS }));
  const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS }));

  const [viewMode, setViewMode] = useState("grid");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState(null);
  
  const [oferta, setOferta] = useState(initialOferta);
  const [ofertaMsg, setOfertaMsg] = useState(null);
  const [ofertaLoading, setOfertaLoading] = useState(false);
  const [ofertaFotos, setOfertaFotos] = useState([]);
  const ofertaFileInputRef = useRef(null);

  const vehiclesList = Array.isArray(vehicles) ? vehicles : [];
  const playasList = Array.isArray(playas) ? playas : [];

  const featuredVehicles = useMemo(() => {
    const withImg = vehiclesList.filter((v) => imagenesLista(v).some((i) => i.imagen_con_marca));
    const pool = withImg.length ? withImg : vehiclesList;
    return pool.slice(0, Math.min(5, pool.length));
  }, [vehiclesList]);
  
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const filtrosDebounceSkip = useRef(true);
  useEffect(() => {
    if (filtrosDebounceSkip.current) {
      filtrosDebounceSkip.current = false;
      return;
    }
    const t = setTimeout(() => setFiltros(filtrosDraft), 450);
    return () => clearTimeout(t);
  }, [filtrosDraft]);

  const fetchPlayas = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/playa/public/playas`);
      if (!r.ok) throw new Error("No se pudieron cargar las playas");
      const raw = await r.json();
      setPlayas(Array.isArray(raw) ? raw : []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchCatalogos = useCallback(async () => {
    try {
      const [rTipos, rMarcas] = await Promise.all([
        fetch(`${API_URL}/playa/public/catalogo/tipos-vehiculo`),
        fetch(`${API_URL}/playa/public/catalogo/marcas`)
      ]);
      if (rTipos.ok) setCatalogoTipos(await rTipos.json());
      if (rMarcas.ok) setCatalogoMarcas(await rMarcas.json());
    } catch (e) { console.error("Error cargando catálogos", e); }
  }, []);

  useEffect(() => {
    if (oferta.id_marca) {
      fetch(`${API_URL}/playa/public/catalogo/modelos?id_marca=${oferta.id_marca}`)
        .then(r => r.json())
        .then(data => setCatalogoModelos(data))
        .catch(e => console.error(e));
    } else {
      setCatalogoModelos([]);
    }
  }, [oferta.id_marca]);

  const fetchCatalog = useCallback(
    async (reset, offsetForPage) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else setLoadingMore(true);
      try {
        const off = reset ? 0 : offsetForPage;
        const p = new URLSearchParams();
        p.set("limit", String(limit));
        p.set("offset", String(off));
        if (q.trim()) p.set("q", q.trim());
        if (filtros.marca.trim()) p.set("marca", filtros.marca.trim());
        if (filtros.modelo.trim()) p.set("modelo", filtros.modelo.trim());
        if (filtros.año_desde) p.set("año_desde", filtros.año_desde);
        if (filtros.año_hasta) p.set("año_hasta", filtros.año_hasta);
        if (filtros.combustible.trim()) p.set("combustible", filtros.combustible.trim());
        if (filtros.transmision.trim()) p.set("transmision", filtros.transmision.trim());
        if (filtros.color.trim()) p.set("color", filtros.color.trim());
        if (filtros.solo_particulares) p.set("solo_particulares", "true");
        else if (filtros.id_playa) p.set("id_playa", filtros.id_playa);

        const r = await fetch(`${API_URL}/playa/public/catalogo?${p.toString()}`);
        const raw = await r.json();
        if (!r.ok) throw new Error("No se pudo cargar el catálogo");
        
        const data = Array.isArray(raw) ? raw : [];
        if (reset) {
          setVehicles(data);
          setOffset(data.length);
        } else {
          setVehicles((prev) => [...(Array.isArray(prev) ? prev : []), ...data]);
          setOffset((prev) => prev + data.length);
        }
        setHasMore(data.length >= limit);
      } catch (e) {
        setError(e.message || "Error de red");
        if (reset) setVehicles([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, filtros, limit]
  );

  const fetchMyOffers = useCallback(async () => {
    const token = localStorage.getItem("mc_token");
    if (!token) return;
    setLoadingMisOfertas(true);
    try {
      const r = await fetch(`${API_URL}/playa/public/mis-ofertas`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (r.ok) {
        const data = await r.json();
        setMisOfertas(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingMisOfertas(false); }
  }, []);

  useEffect(() => {
    fetchPlayas();
    fetchCatalogos();
    if (user) fetchMyOffers();
  }, [fetchPlayas, fetchCatalogos, user, fetchMyOffers]);

  useEffect(() => {
    fetchCatalog(true, 0);
  }, [q, filtros, fetchCatalog]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchCatalog(false, offset);
  };

  useEffect(() => {
    if (featuredVehicles.length > 1) {
      const interval = setInterval(() => {
        setFeaturedIndex((i) => (i + 1) % featuredVehicles.length);
      }, 5500);
      return () => clearInterval(interval);
    }
  }, [featuredVehicles]);

  const handleWhatsApp = (vehicle) => {
    const y = añoVehiculo(vehicle);
    const msg = vehicle.es_particular
      ? `Hola, vi su publicación en MiCoche (${vehicle.marca} ${vehicle.modelo}${y ? ` ${y}` : ""}) y quisiera más información.`
      : `Hola, vi en MiCoche el ${vehicle.marca} ${vehicle.modelo}${y ? ` (${y})` : ""}${vehicle.nombre_playa ? ` de ${vehicle.nombre_playa}` : ""} y quisiera consultar.`;
    const phone = vehicle.es_particular ? telParticular(vehicle) : DEFAULT_WA;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleOfertaSubmit = async (e) => {
    e.preventDefault();
    setOfertaMsg(null);
    setOfertaLoading(true);
    try {
      const precioDigits = String(oferta.precio_pyg).replace(/\D/g, "");
      if (!precioDigits) throw new Error("Indicá un precio válido.");
      
      const fd = new FormData();
      Object.entries(oferta).forEach(([k, v]) => {
        if (v && String(v).trim()) fd.append(k, String(v).trim());
      });
      fd.set("precio_pyg", precioDigits);
      ofertaFotos.forEach((file) => fd.append("fotos", file));

      const token = localStorage.getItem("mc_token");
      const r = await fetch(`${API_URL}/playa/public/oferta-particular`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || data.message || "No se pudo publicar");
      
      setOfertaMsg({ type: "ok", text: "¡Publicación registrada!" });
      setVehicles((prev) => [data, ...(Array.isArray(prev) ? prev : [])]);
      setOferta(initialOferta);
      setOfertaFotos([]);
      if (ofertaFileInputRef.current) ofertaFileInputRef.current.value = "";
      fetchMyOffers();
    } catch (err) {
      setOfertaMsg({ type: "err", text: err.message });
    } finally {
      setOfertaLoading(false);
    }
  };

  const fv = featuredVehicles[featuredIndex];

  return (
    <div className="mc-root">
      <header className="mc-topbar">
        <div className="mc-topbar-inner">
          <span>🚀 Marketplace de vehículos en Paraguay · Playas y particulares</span>
          <a href="http://localhost:3002/" className="mc-topbar-link" target="_blank" rel="noreferrer">
            Acceso Administración →
          </a>
        </div>
      </header>

      <nav className="mc-nav">
        <div className="mc-nav-inner">
          <a href="#inicio" className="mc-brand">
            <img src="/imágenes/logo_miplaya_oficial.png" alt="MiCoche" className="mc-logo" />
            <span className="mc-brand-text">
              <strong>MiCoche</strong>
            </span>
          </a>

          <div className="mc-nav-links">
            <a href="#catalogo">Explorar</a>
            <a href="#playas">Agencias</a>
            {user ? (
              <div className="mc-user-nav">
                <span className="mc-user-name">Hola, {user.nombre_completo.split(' ')[0]}</span>
                <button 
                  className="mc-link-btn mc-logout-btn" 
                  onClick={() => {
                    localStorage.removeItem("mc_token");
                    localStorage.removeItem("mc_user");
                    setUser(null);
                    setMisOfertas([]);
                  }}
                >
                  Salir
                </button>
              </div>
            ) : (
              <a href="/login">Acceso Clientes</a>
            )}
            <a href="#publicar" className="mc-nav-publish">Vender mi auto</a>
          </div>
        </div>
      </nav>

      <section id="inicio" className="mc-hero">
        <div className="mc-hero-grid">
          <div className="mc-hero-copy">
            <span className="mc-eyebrow">✨ EL MARKETPLACE N°1 DE PARAGUAY</span>
            <h1>Encontrá el auto que mejor va con vos</h1>
            <p className="mc-lead">
              Navegá entre cientos de opciones certificadas de las mejores playas y ofertas directas de particulares en todo el país.
            </p>
            <form className="mc-search glass-card" onSubmit={(e) => {
                e.preventDefault();
                document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
              }}>
              <input
                type="search"
                placeholder="¿Qué marca o modelo buscás? (Ej. Toyota Hilux)"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
              />
              <button type="submit" className="mc-btn mc-btn--primary">Buscar Ahora</button>
            </form>
          </div>
          
          {fv && (
            <div className="mc-hero-spotlight"
              style={{
                backgroundImage: `linear-gradient(160deg, rgba(10, 31, 68, 0.7), rgba(10, 31, 68, 0.2)), url(${getFullImageUrl(imagenesLista(fv).find(i => i.es_principal) || imagenesLista(fv)[0])})`,
                backgroundSize: 'cover', backgroundPosition: 'center'
              }}>
              <span className="mc-spot-badge">🔥 Recomendado</span>
              <h2>{fv.marca} {fv.modelo}</h2>
              <p>{añoVehiculo(fv)} · {fv.color}</p>
              <button className="mc-btn mc-btn--accent" onClick={() => handleWhatsApp(fv)}>
                Contactar ahora
              </button>
            </div>
          )}
        </div>
      </section>

      <div id="catalogo" className="mc-layout">
        <aside className="mc-filters glass-card">
          <h2>Filtros Avanzados</h2>
          <div className="mc-filters-list">
             <div className="mc-field">
                <span>¿Quién vende?</span>
                <select 
                  value={filtrosDraft.solo_particulares ? "__part" : filtrosDraft.id_playa} 
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__part") {
                      setFiltrosDraft((f) => ({ ...f, solo_particulares: true, id_playa: "" }));
                    } else {
                      setFiltrosDraft((f) => ({ ...f, solo_particulares: false, id_playa: v }));
                    }
                  }}
                >
                  <option value="">Todas las agencias y particulares</option>
                  <option value="__part">👤 Solo Particulares</option>
                  {playasList.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      🏪 {p.nombre} ({p.vehiculos_disponibles})
                    </option>
                  ))}
                </select>
             </div>
             
             <div className="mc-field">
                <span>Marca</span>
                <input placeholder="Ej. Toyota, Kia, Hyundai..." value={filtrosDraft.marca} onChange={e => setFiltrosDraft(f => ({...f, marca: e.target.value}))} />
             </div>

             <div className="mc-field">
                <span>Modelo</span>
                <input placeholder="Ej. Hilux, Picanto..." value={filtrosDraft.modelo} onChange={e => setFiltrosDraft(f => ({...f, modelo: e.target.value}))} />
             </div>

             <div className="mc-field">
                <span>Rango de Año</span>
                <div className="mc-field-row">
                  <input placeholder="Desde" value={filtrosDraft.año_desde} onChange={e => setFiltrosDraft(f => ({...f, año_desde: e.target.value}))} />
                  <input placeholder="Hasta" value={filtrosDraft.año_hasta} onChange={e => setFiltrosDraft(f => ({...f, año_hasta: e.target.value}))} />
                </div>
             </div>

             <div className="mc-field">
                <span>Especificaciones</span>
                <input placeholder="Combustible (Nafta, Diesel...)" value={filtrosDraft.combustible} onChange={e => setFiltrosDraft(f => ({...f, combustible: e.target.value}))} />
                <div style={{ marginTop: '0.5rem' }}></div>
                <input placeholder="Transmisión (Auto, Mec...)" value={filtrosDraft.transmision} onChange={e => setFiltrosDraft(f => ({...f, transmision: e.target.value}))} />
             </div>

             <div className="mc-field">
                <span>Color</span>
                <input placeholder="Ej. Plata, Blanco, Negro..." value={filtrosDraft.color} onChange={e => setFiltrosDraft(f => ({...f, color: e.target.value}))} />
             </div>

             <button className="mc-btn mc-btn--outline" style={{ marginTop: '1rem' }} onClick={() => {
                setFiltrosDraft(FILTROS_VACIOS);
                setFiltros(FILTROS_VACIOS);
             }}>
                Limpiar Filtros
             </button>
          </div>
        </aside>

        <main className="mc-main">
          <div className="mc-toolbar">
            <p className="mc-results-count">
              {loading ? "Buscando..." : `Se encontraron ${vehiclesList.length} vehículos`}
            </p>
            <div className="mc-view-toggle glass-card">
              <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>Grilla</button>
              <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>Lista</button>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={12} viewMode={viewMode} />
          ) : (
            <>
              <div className={viewMode === "grid" ? "mc-grid" : "mc-list"}>
                {vehiclesList.map(v => (
                  <VehicleCard 
                    key={v.id_producto} 
                    vehicle={v} 
                    viewMode={viewMode} 
                    onWhatsApp={handleWhatsApp} 
                    onPhotoClick={setSelectedVehicleForModal} 
                  />
                ))}
              </div>
              {vehiclesList.length === 0 && !error && (
                <div className="mc-empty glass-card">
                   <p>No encontramos vehículos con esos filtros.</p>
                   <button className="mc-btn mc-btn--outline" onClick={() => {
                     setFiltrosDraft(FILTROS_VACIOS);
                     setFiltros(FILTROS_VACIOS);
                   }}>Limpiar filtros</button>
                </div>
              )}
            </>
          )}
          
          {hasMore && !loading && vehiclesList.length > 0 && (
            <div className="mc-more-wrap">
              <button className="mc-btn mc-btn--outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Cargando..." : "Mostrar más resultados"}
              </button>
            </div>
          )}
        </main>
      </div>

      <section id="playas" className="mc-section">
         <div className="mc-section-inner">
            <h2 className="mc-section-title">Nuestras Playas Adheridas</h2>
            <div className="mc-playas-grid">
               {playasList.map(p => (
                 <article key={p.id} className="mc-playa-card glass-card">
                    <h3>{p.nombre}</h3>
                    <p className="mc-playa-stock">{p.vehiculos_disponibles} disponibles</p>
                    {p.direccion && <p className="mc-playa-dir">📍 {p.direccion}</p>}
                    <button className="mc-link-btn" onClick={() => {
                       const next = { ...FILTROS_VACIOS, id_playa: String(p.id) };
                       setFiltrosDraft(next);
                       setFiltros(next);
                       document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                    }}>Ver inventario →</button>
                 </article>
               ))}
            </div>
         </div>
      </section>

      <section id="publicar" className="mc-section">
         <div className="mc-section-inner">
            <div className="mc-publish-header">
                <h2>{user ? "Publicá un nuevo vehículo" : "Vendé tu auto hoy"}</h2>
                <p>Miles de personas buscan su próximo vehículo aquí cada día.</p>
            </div>
            
            {user ? (
                <>
                  <PublishForm 
                    oferta={oferta} setOferta={setOferta} 
                    handleOfertaSubmit={handleOfertaSubmit}
                    ofertaMsg={ofertaMsg} ofertaLoading={ofertaLoading}
                    ofertaFotos={ofertaFotos} setOfertaFotos={setOfertaFotos}
                    ofertaFileInputRef={ofertaFileInputRef}
                    catalogoTipos={catalogoTipos}
                    catalogoMarcas={catalogoMarcas}
                    catalogoModelos={catalogoModelos}
                  />
                  
                  {misOfertas.length > 0 && (
                    <div style={{ marginTop: '3rem' }}>
                      <h2 className="mc-section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>Mis Publicaciones</h2>
                      <MyPublications 
                        publications={misOfertas} 
                        loading={loadingMisOfertas} 
                        onUpdate={fetchMyOffers}
                      />
                    </div>
                  )}
                </>
            ) : (
              <div className="mc-login-box glass-card">
                  <span className="mc-login-icon">👤</span>
                  <h3>Iniciá sesión para publicar</h3>
                  <p>Accedé de forma segura con tu cuenta de Google para administrar tus publicaciones gratis.</p>
                  <div className="mc-google-login-wrap">
                    <GoogleLogin 
                      onLoginSuccess={(data) => {
                        setUser(data.user);
                        setOfertaMsg({ type: "ok", text: "¡Sesión iniciada! Completá los datos ahora." });
                      }}
                      onLoginError={(err) => setOfertaMsg({ type: "err", text: err })}
                    />
                  </div>
              </div>
            )}
         </div>
      </section>

      {selectedVehicleForModal && (
        <ImageModal vehicle={selectedVehicleForModal} onClose={() => setSelectedVehicleForModal(null)} />
      )}
    </div>
  );
}
