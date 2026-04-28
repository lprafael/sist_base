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
  const formattedPrice = typeof formatPrice === 'function' ? formatPrice(price) : price;

  return (
    <article
      className={`mc-card ${viewMode === "list" ? "vehicle-row" : "vehicle-card"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPhotoClick(vehicle)}
    >
      <div className="card-image-wrapper">
        <img src={getImageUrl()} alt={`${vehicle.marca} ${vehicle.modelo}`} loading="lazy" />
        
        <div className="card-badges">
          <span className={`mc-badge ${vehicle.es_particular ? "mc-badge-particular" : ""}`}>
             {vehicle.es_particular ? "Particular" : (vehicle.nombre_playa || "Playa")}
          </span>
          {vehicle.kilometraje && (
            <span className="mc-badge" style={{ background: 'rgba(255,255,255,0.9)', color: '#0f172a' }}>
              {vehicle.kilometraje} km
            </span>
          )}
        </div>

        <div className="card-overlay">
          <button
            type="button"
            className="mc-btn--primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(vehicle);
            }}
          >
            Consultar WhatsApp
          </button>
        </div>
      </div>

      <div className="card-info">
        <h3>{vehicle.marca} {vehicle.modelo} {añoVehiculo(vehicle)}</h3>
        <p className="card-price">{formattedPrice}</p>
        
        <div className="card-specs">
          <span>{vehicle.transmision || "Transmisión"}</span>
          <span>·</span>
          <span>{vehicle.combustible || "Combustible"}</span>
          <span>·</span>
          <span>{vehicle.color || "Color"}</span>
        </div>
      </div>
    </article>
  );
};

export default VehicleCard;
