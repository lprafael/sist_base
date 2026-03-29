import React from "react";
import { MAX_FOTOS_PARTICULAR } from "../utils/helpers";

const PublishForm = ({ 
  oferta, setOferta, handleOfertaSubmit, 
  ofertaMsg, ofertaLoading, ofertaFotos, setOfertaFotos, 
  ofertaFileInputRef,
  catalogoTipos = [],
  catalogoMarcas = [],
  catalogoModelos = []
}) => {
  return (
    <div className="mc-publish-card glass-card">
      <h3>Completá los datos</h3>
      {ofertaMsg && (
        <div className={`mc-alert ${ofertaMsg.type === "ok" ? "mc-alert--ok" : "mc-alert--err"}`}>
          {ofertaMsg.text}
        </div>
      )}
      <form onSubmit={handleOfertaSubmit}>
        <div className="mc-field-grid">
          <label className="mc-field">
            <span>Marca *</span>
            <select
              required
              value={oferta.id_marca || ""}
              onChange={(e) => {
                const id = e.target.value;
                const m = catalogoMarcas.find(x => x.id_marca == id);
                setOferta((f) => ({ ...f, id_marca: id, marca: m?.nombre || "", id_modelo: "", modelo: "" }));
              }}
            >
              <option value="">-- Seleccionar --</option>
              {catalogoMarcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
            </select>
          </label>
          <label className="mc-field">
            <span>Modelo *</span>
            <select
              required
              disabled={!oferta.id_marca}
              value={oferta.id_modelo || ""}
              onChange={(e) => {
                const id = e.target.value;
                const m = catalogoModelos.find(x => x.id_modelo == id);
                setOferta((f) => ({ ...f, id_modelo: id, modelo: m?.nombre || "" }));
              }}
            >
              <option value="">-- Seleccionar --</option>
              {catalogoModelos.map(m => <option key={m.id_modelo} value={m.id_modelo}>{m.nombre}</option>)}
            </select>
          </label>
          <label className="mc-field">
            <span>Chasis (opcional)</span>
            <input
              value={oferta.chasis}
              onChange={(e) => setOferta((f) => ({ ...f, chasis: e.target.value }))}
              placeholder="Número de chasis"
            />
          </label>
          <div className="mc-field-row">
            <label className="mc-field">
              <span>Año*</span>
              <input
                required
                value={oferta.año}
                onChange={(e) => setOferta((f) => ({ ...f, año: e.target.value }))}
                inputMode="numeric"
                placeholder="2015"
              />
            </label>
            <label className="mc-field">
              <span>Color</span>
              <input
                value={oferta.color}
                onChange={(e) => setOferta((f) => ({ ...f, color: e.target.value }))}
                placeholder="Azul, gris..."
              />
            </label>
          </div>
          <label className="mc-field">
            <span>Tipo de Vehículo</span>
            <select
              value={oferta.id_tipo_vehiculo || ""}
              onChange={(e) => {
                const id = e.target.value;
                const t = catalogoTipos.find(x => x.id_tipo == id);
                setOferta((f) => ({ ...f, id_tipo_vehiculo: id, tipo_vehiculo: t?.nombre || "" }));
              }}
            >
              <option value="">-- Seleccionar --</option>
              {catalogoTipos.map(t => <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>)}
            </select>
          </label>
          <label className="mc-field">
            <span>Transmisión</span>
            <select
              value={oferta.transmision || ""}
              onChange={(e) => setOferta((f) => ({ ...f, transmision: e.target.value }))}
            >
              <option value="">-- Seleccionar --</option>
              <option value="AUTOMATICA">AUTOMÁTICA</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </label>
          <label className="mc-field">
            <span>Precio (Gs) *</span>
            <input
              required
              value={oferta.precio_pyg}
              onChange={(e) => setOferta((f) => ({ ...f, precio_pyg: e.target.value }))}
              inputMode="numeric"
              placeholder="Ej. 45000000"
            />
          </label>
          <label className="mc-field">
            <span>Teléfono WhatsApp *</span>
            <input
              required
              value={oferta.telefono}
              onChange={(e) => setOferta((f) => ({ ...f, telefono: e.target.value }))}
              inputMode="tel"
              placeholder="09xx..."
            />
          </label>
          <label className="mc-field">
            <span>Tu nombre</span>
            <input
              value={oferta.nombre_contacto}
              onChange={(e) => setOferta((f) => ({ ...f, nombre_contacto: e.target.value }))}
              placeholder="Nombre para el contacto"
            />
          </label>
          <label className="mc-field">
            <span>Ciudad</span>
            <input
              value={oferta.ciudad}
              onChange={(e) => setOferta((f) => ({ ...f, ciudad: e.target.value }))}
              placeholder="Donde está el auto"
            />
          </label>
          <label className="mc-field mc-field--full">
            <span>Observaciones</span>
            <textarea
              value={oferta.observaciones}
              onChange={(e) => setOferta((f) => ({ ...f, observaciones: e.target.value }))}
              rows="3"
            />
          </label>
          <div className="mc-field mc-field--full">
            <span>Fotos (máx. {MAX_FOTOS_PARTICULAR})</span>
            <div 
              className="mc-dropzone"
              onClick={() => ofertaFileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragging'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragging');
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                if (files.length > 0) {
                  const combined = [...ofertaFotos, ...files].slice(0, MAX_FOTOS_PARTICULAR);
                  setOfertaFotos(combined);
                }
              }}
            >
              <div className="mc-dropzone-icon">📸</div>
              <div className="mc-dropzone-text">
                <strong>Hacé clic o arrastrá tus fotos aquí</strong>
                <p>Desde el celular podés sacar fotos directamente</p>
              </div>
              <input
                type="file"
                multiple
                hidden
                accept="image/*"
                ref={ofertaFileInputRef}
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const combined = [...ofertaFotos, ...files].slice(0, MAX_FOTOS_PARTICULAR);
                  setOfertaFotos(combined);
                }}
              />
            </div>

            {ofertaFotos.length > 0 && (
              <div className="mc-photo-previews">
                {ofertaFotos.map((file, idx) => (
                  <div key={idx} className="mc-photo-thumb">
                    <img src={URL.createObjectURL(file)} alt="Preview" />
                    <button 
                      type="button" 
                      className="mc-photo-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOfertaFotos(ofertaFotos.filter((_, i) => i !== idx));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="mc-file-hint" style={{ marginTop: '1rem' }}>
              Subí hasta {MAX_FOTOS_PARTICULAR} fotos de buena calidad para vender más rápido.
            </p>
          </div>
        </div>
        <button type="submit" className="mc-btn mc-btn--primary mc-btn--wide" disabled={ofertaLoading}>
          {ofertaLoading ? "Publicando..." : "Publicar mi vehículo ahora"}
        </button>
      </form>
    </div>
  );
};

export default PublishForm;
