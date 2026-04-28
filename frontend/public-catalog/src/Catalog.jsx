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
  precioMostrar,
  formatPrice
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
    return pool.slice(0, Math.min(3, pool.length));
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
      if (!r.ok) {
        let errMsg = data.detail || data.message || "No se pudo publicar";
        if (Array.isArray(data.detail)) {
          errMsg = data.detail.map(e => {
            const campo = e.loc ? e.loc[e.loc.length - 1] : "";
            return `${campo ? campo + ': ' : ''}${e.msg}`;
          }).join(", ");
        } else if (typeof data.detail === "object") {
          errMsg = JSON.stringify(data.detail);
        }
        throw new Error(errMsg);
      }
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
          <div className="mc-topbar-links">
             <a href="http://187.77.247.23:3004" className="mc-topbar-link" target="_blank" rel="noreferrer">
                Acceso Administración →
             </a>
          </div>
        </div>
      </header>

      <nav className="mc-nav">
        <div className="mc-nav-inner">
          <a href="/" className="mc-brand">
            <img src="/imágenes/logo_miplaya_oficial.png" alt="MiCoche" className="mc-logo" />
            <span className="mc-brand-text">
              <strong>MiCoche</strong>
            </span>
          </a>

          <div className="mc-nav-links">
            <a href="#catalogo">Comprar</a>
            <a href="#playas">Agencias</a>
            {user ? (
              <span className="mc-user-name">Hola, {user.nombre_completo.split(' ')[0]}</span>
            ) : (
              <a href="/login">Acceso Clientes</a>
            )}
            <a href="#publicar" className="mc-nav-publish">Vender mi auto</a>
          </div>
        </div>
      </nav>

      <section className="mc-hero">
        <div className="mc-hero-grid">
          <div className="mc-hero-copy">
            <h1>Encuentra tu próximo vehículo hoy</h1>
            <p className="mc-lead">
              Navega entre cientos de opciones certificadas de las mejores playas y ofertas directas en Paraguay.
            </p>
            
            <form className="mc-search" onSubmit={(e) => {
                e.preventDefault();
                document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
              }}>
              <input
                type="search"
                placeholder="¿Qué marca o modelo buscas? (Ej. Toyota Hilux)"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
              />
              <button type="submit" className="mc-btn--primary">Buscar Vehículo</button>
            </form>
          </div>
          
          {fv && (
            <div className="mc-hero-spotlight"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url(${getFullImageUrl(imagenesLista(fv).find(i => i.es_principal) || imagenesLista(fv)[0])})`,
                backgroundSize: 'cover', backgroundPosition: 'center'
              }}>
              <span className="mc-spot-badge">Destacado</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>{fv.marca} {fv.modelo}</h2>
              <p>{añoVehiculo(fv)} · {precioMostrar(fv) ? (typeof formatPrice === 'function' ? formatPrice(precioMostrar(fv)) : precioMostrar(fv)) : "Consultar"}</p>
            </div>
          )}
        </div>
      </section>

      <div id="catalogo" className="mc-layout">
        <aside className="mc-filters">
          <h2>Filtros</h2>
          <div className="mc-filters-list">
             <div className="mc-field">
                <span>Vendedor</span>
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
                  <option value="">Todos</option>
                  <option value="__part">👤 Particulares</option>
                  {playasList.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.nombre}</option>
                  ))}
                </select>
             </div>
             
             <div className="mc-field">
                <span>Marca</span>
                <input placeholder="Ej. Toyota" value={filtrosDraft.marca} onChange={e => setFiltrosDraft(f => ({...f, marca: e.target.value}))} />
             </div>

             <div className="mc-field">
                <span>Modelo</span>
                <input placeholder="Ej. Hilux" value={filtrosDraft.modelo} onChange={e => setFiltrosDraft(f => ({...f, modelo: e.target.value}))} />
             </div>

             <div className="mc-field">
                <span>Combustible</span>
                <select value={filtrosDraft.combustible} onChange={e => setFiltrosDraft(f => ({...f, combustible: e.target.value}))}>
                   <option value="">Todos</option>
                   <option value="Nafta">Nafta</option>
                   <option value="Diesel">Diesel</option>
                   <option value="Híbrido">Híbrido</option>
                   <option value="Eléctrico">Eléctrico</option>
                </select>
             </div>

             <button className="mc-btn--outline" style={{ marginTop: '1rem', padding: '0.5rem' }} onClick={() => {
                setFiltrosDraft(FILTROS_VACIOS);
                setFiltros(FILTROS_VACIOS);
             }}>
                Limpiar Filtros
             </button>
          </div>
        </aside>

        <main className="mc-main">
          <div className="mc-toolbar">
            <p className="mc-results-count-alt">
              Mostrando <strong>{vehiclesList.length}</strong> vehículos
            </p>
            <div className="mc-view-toggle">
              <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>Grilla</button>
              <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>Lista</button>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={12} />
          ) : (
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
          )}
          
          {hasMore && !loading && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button className="mc-btn--outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Cargando..." : "Ver más vehículos"}
              </button>
            </div>
          )}
        </main>
      </div>

      <section id="playas" className="mc-section" style={{ background: '#fff' }}>
         <div className="mc-section-inner">
            <h2 className="mc-section-title">Nuestras Playas</h2>
            <div className="mc-playas-grid">
               {playasList.map(p => (
                 <article key={p.id} className="mc-playa-card">
                    <h3>{p.nombre}</h3>
                    <p className="mc-playa-stock">{p.vehiculos_disponibles} vehículos</p>
                    <button className="mc-link-btn" onClick={() => {
                       const next = { ...FILTROS_VACIOS, id_playa: String(p.id) };
                       setFiltrosDraft(next);
                       setFiltros(next);
                       document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
                    }}>Ver Stock →</button>
                 </article>
               ))}
            </div>
         </div>
      </section>

      <section id="publicar" className="mc-section" style={{ background: '#f8fafc' }}>
         <div className="mc-section-inner">
            <h2 className="mc-section-title">Publicar mi vehículo</h2>
            {!user ? (
               <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ marginBottom: "1.5rem" }}>Iniciá sesión con Google para publicar un vehículo o administrar tus publicaciones.</p>
                  <GoogleLogin onLogin={setUser} />
               </div>
            ) : (
               <div className="mc-user-dashboard">
                  <div className="mc-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                     <h3>Tus Publicaciones</h3>
                     <button className="mc-btn--outline" onClick={() => {
                        localStorage.removeItem("mc_user");
                        localStorage.removeItem("mc_token");
                        setUser(null);
                     }}>Cerrar Sesión</button>
                  </div>
                  <MyPublications 
                     publications={misOfertas} 
                     loading={loadingMisOfertas} 
                     onUpdate={fetchMyOffers} 
                  />
                  <div className="mc-publish-divider" style={{ borderTop: '1px solid #e2e8f0', margin: '3rem 0' }}></div>
                  <h3 style={{ marginBottom: '1.5rem' }}>Nueva Publicación</h3>
                  <PublishForm 
                     oferta={oferta} 
                     setOferta={setOferta} 
                     ofertaMsg={ofertaMsg} 
                     ofertaLoading={ofertaLoading} 
                     ofertaFotos={ofertaFotos} 
                     setOfertaFotos={setOfertaFotos} 
                     ofertaFileInputRef={ofertaFileInputRef} 
                     handleOfertaSubmit={handleOfertaSubmit}
                     catalogoTipos={catalogoTipos}
                     catalogoMarcas={catalogoMarcas}
                     catalogoModelos={catalogoModelos}
                  />
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
