// GremiosCRUD.js
// CRUD de gremios refactorizado con diseño moderno
import React, { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

const API_URL = "/api";

function DefaultColumnFilter({ column }) {
  const columnFilterValue = column.getFilterValue() || "";
  return (
    <input
      value={columnFilterValue}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder={`Filtrar...`}
      className="filter-input"
    />
  );
}

export default function GremiosCRUD() {
  const [gremios, setGremios] = useState([]);
  const [form, setForm] = useState({ gre_nombre: "", gre_estado: "" });
  const [editId, setEditId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);

  const defaultColumn = React.useMemo(
    () => ({ Filter: DefaultColumnFilter }),
    []
  );

  const columns = React.useMemo(
    () => [
      {
        id: "gre_id",
        header: "ID",
        accessorKey: "gre_id",
        filterFn: "includesString",
      },
      {
        id: "gre_nombre",
        header: "Nombre",
        accessorKey: "gre_nombre",
        filterFn: "includesString",
      },
      {
        id: "gre_estado",
        header: "Estado",
        accessorKey: "gre_estado",
        filterFn: "includesString",
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="actions-cell">
            <button
              className="action-btn action-btn-edit"
              onClick={() => handleEdit(row.original)}
              title="Editar"
            >
              ✏️
            </button>
            <button
              className="action-btn action-btn-delete"
              onClick={() => handleDelete(row.original.gre_id)}
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        ),
        enableColumnFilter: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: gremios,
    columns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/gremios`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setGremios)
      .catch(() => setMensaje("No se pudieron cargar los gremios"));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const method = editId ? "PUT" : "POST";
    const url = editId ? `${API_URL}/gremios/${editId}` : `${API_URL}/gremios`;
    const payload = {
      ...form,
      gre_estado: form.gre_estado === "" ? null : parseInt(form.gre_estado, 10),
    };

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then(() => {
        setMensaje(editId ? "Gremio actualizado" : "Gremio creado");
        setForm({ gre_nombre: "", gre_estado: "" });
        setEditId(null);
        return fetch(`${API_URL}/gremios`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then(setGremios);
      })
      .catch(() => setMensaje("Error al guardar gremio"));
  }

  function handleEdit(gremio) {
    setForm({
      gre_nombre: gremio.gre_nombre || "",
      gre_estado: gremio.gre_estado || "",
    });
    setEditId(gremio.gre_id);
  }

  function handleDelete(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este gremio?")) return;
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/gremios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setMensaje("Gremio eliminado");
        setGremios(gremios.filter((g) => g.gre_id !== id));
      })
      .catch(() => setMensaje("Error al eliminar gremio"));
  }

  function exportarExcel() {
    const filasFiltradas = table.getRowModel().rows.map((row) => {
      const obj = {};
      row.getVisibleCells().forEach((cell) => {
        obj[cell.column.columnDef.header || cell.column.id] = cell.getValue();
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(filasFiltradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gremios");
    XLSX.writeFile(wb, "gremios.xlsx");
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestión de Gremios</h1>
        <button onClick={exportarExcel} className="btn btn-secondary">
          📥 Exportar a Excel
        </button>
      </div>

      {mensaje && (
        <div className={`message ${mensaje.includes('Error') ? 'error-message' : 'success-message'}`}
          style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: mensaje.includes('Error') ? '#fef2f2' : '#f0fdf4',
            color: mensaje.includes('Error') ? '#ef4444' : '#10b981',
            border: `1px solid ${mensaje.includes('Error') ? '#fee2e2' : '#dcfce7'}`
          }}>
          {mensaje}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{editId ? "Editar Gremio" : "Nuevo Gremio"}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Nombre del Gremio</label>
            <input
              name="gre_nombre"
              placeholder="Ej: Gremio Nacional"
              value={form.gre_nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label">Estado</label>
            <input
              type="number"
              name="gre_estado"
              placeholder="0 o 1"
              value={form.gre_estado}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {editId ? "Actualizar" : "Crear Gremio"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditId(null);
                setForm({ gre_nombre: "", gre_estado: "" });
              }}
            >
              Cancelar
            </button>
          )}
        </form>
      </div>

      <div className="table-container">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    <div style={{ marginBottom: '8px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    {header.column.getCanFilter() && (
                      flexRender(header.column.columnDef.Filter ?? DefaultColumnFilter, { column: header.column })
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
