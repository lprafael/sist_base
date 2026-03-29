import React, { useState, useEffect } from "react";
import { imagenesLista, getFullImageUrl } from "../utils/helpers";

const ImageModal = ({ vehicle, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = imagenesLista(vehicle).filter((img) => img.imagen_con_marca);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  if (!vehicle) return null;

  return (
    <div className="modal-overlay glass-overlay" onClick={onClose}>
      <button type="button" className="modal-close" onClick={onClose}>
        &times;
      </button>
      <div className="modal-content glass-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-thumbnails">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`thumb-item ${currentIndex === idx ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              role="presentation"
            >
              <img src={getFullImageUrl(img)} alt="" />
            </div>
          ))}
        </div>
        <div className="modal-main-image">
          {images.length > 1 && (
            <button
              type="button"
              className="modal-nav-btn prev"
              onClick={() =>
                setCurrentIndex((currentIndex - 1 + images.length) % images.length)
              }
            >
              &#10094;
            </button>
          )}
          {images.length > 0 ? (
            <img src={getFullImageUrl(images[currentIndex])} alt={vehicle.modelo} />
          ) : (
            <div className="modal-no-img">Sin fotos</div>
          )}
          {images.length > 1 && (
            <button
              type="button"
              className="modal-nav-btn next"
              onClick={() => setCurrentIndex((currentIndex + 1) % images.length)}
            >
              &#10095;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
