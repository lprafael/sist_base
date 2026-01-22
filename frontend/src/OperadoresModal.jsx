import React, { useEffect, useState } from "react";
import { authFetch } from "./utils/authFetch";

const API_URL = "/api";  // Using proxy to avoid CORS issues

export default function OperadoresModal({ rutaHex, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [eots, setEots] = useState([]);
  const [form, setForm] = useState({
    id_eot: "",
    fecha_inicio: "",
    fecha_fin: "",
    observacion: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!rutaHex) return;
    fetchItems();
  }, [rutaHex]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_URL}/historico_eot_ruta?ruta_hex=${encodeURIComponent(rutaHex)}`
      );
      if (!res.ok) throw new Error("Error al obtener historico de operadores");
      const data = await res.json();
      setItems(data);
      // fetch lista de EOTs para el formulario
      const r = await authFetch(`${API_URL}/eots`);
      if (r.ok) {
        const e = await r.json();
        setEots(e);
      }
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo cargar el historial de operadores");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ id_eot: "", fecha_inicio: "", fecha_fin: "", observacion: "" });
    setEditingId(null);
    setMensaje("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateOrUpdate(e) {
    e.preventDefault();
    try {
      // Client-side validation: fecha_inicio required and fecha_fin >= fecha_inicio if provided
      if (!form.fecha_inicio) {
        setMensaje("Fecha inicio es obligatoria");
        return;
      }

      const toDate = (s) => (s ? new Date(s + "T00:00:00") : null);
      const aStart = toDate(form.fecha_inicio);
      const aEnd = form.fecha_fin ? toDate(form.fecha_fin) : null; // null means open-ended

      if (aEnd && aEnd < aStart) {
        setMensaje("fecha_fin no puede ser anterior a fecha_inicio");
        return;
      }

      // overlap check against existing items (exclude editingId)
      const overlaps = (s1, e1, s2, e2) => {
        // s1,e1 and s2,e2 are Date or null (null means +infinity for end)
        const start1 = s1;
        const end1 = e1 || new Date("9999-12-31");
        const start2 = s2;
        const end2 = e2 || new Date("9999-12-31");
        return !(end1 < start2 || end2 < start1);
      };

      const conflict = items.find((it) => {
        if (!it) return false;
        if (editingId && it.id_hist_eot === editingId) return false;
        const itStart = it.fecha_inicio
          ? toDate(it.fecha_inicio.split("T")[0])
          : null;
        const itEnd = it.fecha_fin ? toDate(it.fecha_fin.split("T")[0]) : null;
        return overlaps(aStart, aEnd, itStart, itEnd);
      });

      if (conflict) {
        const name = conflict.eot_nombre || conflict.id_eot;
        const d1 = conflict.fecha_inicio
          ? conflict.fecha_inicio.split("T")[0]
          : "";
        const d2 = conflict.fecha_fin
          ? conflict.fecha_fin.split("T")[0]
          : "vigente";
        setMensaje(`Fechas superpuestas con ${name} (${d1} - ${d2})`);
        return;
      }

      const payload = { ...form, ruta_hex: rutaHex };
      let res;
      if (editingId) {
        res = await authFetch(`${API_URL}/historico_eot_ruta/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await authFetch(`${API_URL}/historico_eot_ruta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al guardar");
      }
      await fetchItems();
      resetForm();
      setMensaje(editingId ? "Registro actualizado" : "Operador asignado");
    } catch (err) {
      console.error(err);
      setMensaje(err.message || "Error");
    }
  }

  async function handleEdit(item) {
    setEditingId(item.id_hist_eot);
    setForm({
      id_eot: item.id_eot,
      fecha_inicio: item.fecha_inicio?.split("T")[0] || "",
      fecha_fin: item.fecha_fin?.split("T")[0] || "",
      observacion: item.observacion || "",
    });
    setMensaje("");
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      const res = await authFetch(`${API_URL}/historico_eot_ruta/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchItems();
      setMensaje("Registro eliminado");
    } catch (err) {
      console.error(err);
      setMensaje("Error al eliminar");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "80vw", maxWidth: 900 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 15px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h3 style={{ margin: 0 }}>Operadores históricos - {rutaHex}</h3>
          <button
            onClick={onClose}
            style={{ fontSize: 20, background: "none", border: "none" }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: 15 }}>
          {mensaje && <div style={{ color: "red" }}>{mensaje}</div>}
          <div>
            <form
              onSubmit={handleCreateOrUpdate}
              style={{
                marginBottom: 12,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                name="id_eot"
                value={form.id_eot}
                onChange={handleChange}
                required
              >
                <option value="">-- Seleccionar empresa (EOT) --</option>
                {eots.map((e) => (
                  <option key={e.eot_id} value={e.eot_id}>
                    {e.eot_nombre}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="fecha_inicio"
                value={form.fecha_inicio}
                onChange={handleChange}
                required
              />
              <input
                type="date"
                name="fecha_fin"
                value={form.fecha_fin}
                onChange={handleChange}
              />
              <input
                type="text"
                name="observacion"
                value={form.observacion}
                onChange={handleChange}
                placeholder="Observación"
              />
              <button type="submit" className="btn-accion btn-editar">
                {editingId ? "Actualizar" : "Asignar"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-accion"
                >
                  Cancelar
                </button>
              )}
            </form>

            {loading ? (
              <div>Cargando...</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Empresa (EOT)
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>Inicio</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Fin</th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Observación
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: 15 }}
                      >
                        No hay operadores registrados
                      </td>
                    </tr>
                  )}
                  {items.map((it) => (
                    <tr
                      key={it.id_hist_eot}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: 8 }}>
                        {it.eot_nombre || it.id_eot}
                      </td>
                      <td style={{ padding: 8 }}>
                        {it.fecha_inicio ? it.fecha_inicio.split("T")[0] : ""}
                      </td>
                      <td style={{ padding: 8 }}>
                        {it.fecha_fin ? it.fecha_fin.split("T")[0] : ""}
                      </td>
                      <td style={{ padding: 8 }}>{it.observacion || ""}</td>
                      <td style={{ padding: 8 }}>
                        <button
                          onClick={() => handleEdit(it)}
                          className="btn-accion btn-editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(it.id_hist_eot)}
                          className="btn-accion btn-eliminar"
                          style={{ marginLeft: 6 }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
