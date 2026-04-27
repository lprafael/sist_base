import React, { useState, useEffect } from "react";
import { imagenesLista, getFullImageUrl, formatPrice, añoVehiculo, precioMostrar } from "../utils/helpers";

const VehicleCard = ({ vehicle, viewMode, onWhatsApp, onPhotoClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const images = imagenesLista(vehicle).filter((img) => img.imagen_con_marca);
  const hasImages = images.length > 0;

  useEffect(() => {
    if (!isHovered) {
      const principalIndex = images.findIndex((img) => img.es_principal);
      setCurrentImageIndex(principalIndex !== -1 ? principalIndex : 0);
      return;
    }
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isHovered, images]);

  const getImageUrl = () => {
    if (!hasImages) {
      return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800";
    }
    const img = images[currentImageIndex] || images[0];
    return getFullImageUrl(img);
  };

  const price = precioMostrar(vehicle);
  const formattedPrice = formatPrice(price);
  const badge = vehicle.es_particular ? "Particular" : vehicle.nombre_playa || "Playa";

  if (viewMode === "list") {
    return (
      <article
        className="vehicle-row mc-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          className="vehicle-row-thumb"
          onClick={() => onPhotoClick(vehicle)}
        >
          <img src={getImageUrl()} alt="" />
          <div className="card-badges">
            <span className={`mc-badge ${vehicle.es_particular ? "mc-badge-particular" : ""}`}>
              {vehicle.es_particular ? "Particular" : "Playa"}
            </span>
          </div>
        </button>
        <div className="vehicle-row-body">
          <h3 className="vehicle-row-title">
            {vehicle.marca} {vehicle.modelo}
          </h3>
          <p className="vehicle-row-price">{formattedPrice}</p>
          <p className="vehicle-row-meta">
            {[añoVehiculo(vehicle), vehicle.color, vehicle.combustible, vehicle.transmision]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {vehicle.nombre_playa && !vehicle.es_particular && (
            <p className="vehicle-row-meta" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              Ofrecido por: <strong>{vehicle.nombre_playa}</strong>
            </p>
          )}
        </div>
        <div className="vehicle-row-side">
          <button type="button" className="mc-btn mc-btn--primary mc-btn--sm" style={{ width: '100%', borderRadius: '4px' }} onClick={() => onWhatsApp(vehicle)}>
            WhatsApp
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className="vehicle-card mc-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPhotoClick(vehicle)}
    >
      <div className="card-image-wrapper">
        <img src={getImageUrl()} alt={`${vehicle.marca} ${vehicle.modelo}`} />
        <div className="card-badges">
          <span className={`mc-badge ${vehicle.es_particular ? "mc-badge-particular" : ""}`}>
             {vehicle.es_particular ? "Particular" : "Playa"}
          </span>
        </div>
        <div className="card-overlay">
          <button
            type="button"
            className="mc-btn mc-btn--primary mc-btn--sm"
            style={{ borderRadius: '4px' }}
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(vehicle);
            }}
          >
            WhatsApp
          </button>
          {hasImages && images.length > 1 && isHovered && (
            <div className="image-counter" style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>
      <div className="card-info">
        <h3>
          {vehicle.marca} {vehicle.modelo}
        </h3>
        <p className="card-price">{formattedPrice}</p>
        <div className="card-specs">
          <span>{añoVehiculo(vehicle) || "—"}</span>
          <span>·</span>
          <span>{vehicle.color || "—"}</span>
          {vehicle.combustible && (
            <>
              <span>·</span>
              <span>{vehicle.combustible}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default VehicleCard;
