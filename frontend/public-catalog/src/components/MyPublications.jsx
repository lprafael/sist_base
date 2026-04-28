import React, { useState } from "react";
import { 
  API_URL, 
  getFullImageUrl, 
  formatPrice, 
  añoVehiculo 
} from "../utils/helpers";

const MyPublications = ({ publications, loading, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

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

  const handleEditClick = (p) => {
    setEditingId(p.id_producto);
    setEditForm({
      precio_pyg: p.costo_final || "",
      telefono: p.telefono || "",
      observaciones: p.observaciones || "",
      color: p.color || "",
      ciudad: p.ubicacion_actual || "",
      año: p.año || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id) => {
    setSaving(true);
    const token = localStorage.getItem("mc_token");
    try {
      const r = await fetch(`${API_URL}/playa/public/mis-ofertas/${id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });
      if (r.ok) {
        setEditingId(null);
        onUpdate();
      } else {
        const data = await r.json();
        alert(data.detail || "No se pudo actualizar");
      }
    } catch (e) {
      console.error(e);
      alert("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mc-my-pubs">
      <div className="mc-my-pubs-grid">
        {publications.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem", background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px dashed #ccc" }}>
            <p>Todavía no tenés ninguna publicación activa.</p>
          </div>
        ) : publications.map((p) => {
          const isEditing = editingId === p.id_producto;
          return (
          <div key={p.id_producto} className="mc-my-pub-card glass-card">
            <div className="mc-my-pub-img">
                <img 
                   src={getFullImageUrl(p.imagenes?.find(i => i.es_principal) || p.imagenes?.[0])} 
                   alt={p.modelo} 
                />
            </div>
            <div className="mc-my-pub-info">
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <h4>{p.marca} {p.modelo}</h4>
                  <input type="number" placeholder="Año" value={editForm.año} onChange={(e) => setEditForm({...editForm, año: e.target.value})} className="mc-edit-input" style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <input type="text" placeholder="Color" value={editForm.color} onChange={(e) => setEditForm({...editForm, color: e.target.value})} className="mc-edit-input" style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <input type="text" placeholder="Ciudad" value={editForm.ciudad} onChange={(e) => setEditForm({...editForm, ciudad: e.target.value})} className="mc-edit-input" style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <input type="number" placeholder="Precio (Gs)" value={editForm.precio_pyg} onChange={(e) => setEditForm({...editForm, precio_pyg: e.target.value})} className="mc-edit-input" style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <input type="tel" placeholder="Teléfono" value={editForm.telefono} onChange={(e) => setEditForm({...editForm, telefono: e.target.value})} className="mc-edit-input" style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <textarea placeholder="Observaciones" value={editForm.observaciones} onChange={(e) => setEditForm({...editForm, observaciones: e.target.value})} className="mc-edit-input" rows={2} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "inherit" }} />
                  
                  <div className="mc-my-pub-actions" style={{ marginTop: "1rem" }}>
                    <button className="mc-btn mc-btn--small mc-btn--primary" onClick={() => handleSave(p.id_producto)} disabled={saving} style={{ background: "#2563eb", color: "#fff", border: "none" }}>
                      {saving ? "..." : "✅ Guardar"}
                    </button>
                    <button className="mc-btn mc-btn--small mc-btn--outline" onClick={handleCancelEdit} disabled={saving}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h4>{p.marca} {p.modelo}</h4>
                  <p className="mc-my-pub-meta">{añoVehiculo(p)} · {p.color || 'Sin color'} · {p.ubicacion_actual || 'Sin ciudad'}</p>
                  <p className="mc-my-pub-price">{typeof formatPrice === 'function' ? formatPrice(p.costo_final) : p.costo_final}</p>
                  <p className="mc-my-pub-meta" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>Tel: {p.telefono}</p>
                  <div className="mc-my-pub-actions">
                    <button className="mc-btn mc-btn--small mc-btn--edit" onClick={() => handleEditClick(p)}>✏️ Editar</button>
                    <button 
                        className="mc-btn mc-btn--small mc-btn--err"
                        onClick={() => handleDelete(p.id_producto)}
                    >
                        🗑️ Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default MyPublications;
