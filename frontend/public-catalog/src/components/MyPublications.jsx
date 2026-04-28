import React from "react";
import { API_URL, getFullImageUrl, formatPrice, añoVehiculo } from "../utils/helpers";

const MyPublications = ({ publications, loading, onUpdate }) => {
  if (loading) return <div className="mc-loading-small">Cargando tus publicaciones...</div>;

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro que querés eliminar esta publicación?")) return;
    
    const token = localStorage.getItem("mc_token");
    try {
      const r = await fetch(`${API_URL}/playa/public/mis-ofertas/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (r.ok) {
        onUpdate();
      } else {
        const data = await r.json();
        alert(data.detail || "No se pudo eliminar");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="mc-my-pubs">
      <div className="mc-my-pubs-grid">
        {publications.map((p) => (
          <div key={p.id_producto} className="mc-my-pub-card glass-card">
            <div className="mc-my-pub-img">
                <img 
                  src={getFullImageUrl(p.imagenes?.find(i => i.es_principal) || p.imagenes?.[0])} 
                  alt={p.modelo} 
                />
            </div>
            <div className="mc-my-pub-info">
              <h4>{p.marca} {p.modelo}</h4>
              <p className="mc-my-pub-meta">{añoVehiculo(p)} · {p.color}</p>
              <p className="mc-my-pub-price">{formatPrice(p.costo_final)}</p>
              <div className="mc-my-pub-actions">
                {/* <button className="mc-btn mc-btn--small mc-btn--outline">Editar</button> */}
                <button 
                    className="mc-btn mc-btn--small mc-btn--err"
                    onClick={() => handleDelete(p.id_producto)}
                >
                    Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPublications;
