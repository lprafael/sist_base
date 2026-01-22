// FeriadosCRUD.js
// CRUD de feriados refactorizado con diseño moderno
import React, { useEffect, useState } from "react";
import { authFetch } from "./utils/authFetch";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

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

export default function FeriadosCRUD() {
  const [feriados, setFeriados] = useState([]);
  const [form, setForm] = useState({
    fecha: "",
    dia: "",
    nrodiasemana: "",
    descripcion: "",
    observacion: "",
  });
  const [editFecha, setEditFecha] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);

  const sortFeriadosByDate = (feriadosList) => {
    return [...feriadosList].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  useEffect(() => {
    authFetch('/feriados')
      .then((r) => r.json())
      .then(data => setFeriados(sortFeriadosByDate(data)))
      .catch(() => setMensaje("No se pudieron cargar los feriados"));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const method = editFecha ? "PUT" : "POST";
    const url = editFecha ? `/feriados/${editFecha}` : `/feriados`;

    authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(r => r.json())
      .then(() => {
        setMensaje(editFecha ? "Feriado actualizado correctamente" : "Feriado creado exitosamente");
        setForm({ fecha: "", dia: "", nrodiasemana: "", descripcion: "", observacion: "" });
        setEditFecha(null);
        return authFetch('/feriados');
      })
      .then(r => r.json())
      .then(data => setFeriados(sortFeriadosByDate(data)))
      .catch((error) => setMensaje(error.message || "Error al guardar el feriado"));
  }

  function handleEdit(feriado) {
    setForm({ ...feriado });
    setEditFecha(feriado.fecha);
  }

  function handleDelete(fecha) {
    if (!window.confirm("¿Seguro que deseas eliminar este feriado?")) return;
    authFetch(`/feriados/${fecha}`, { method: "DELETE" })
      .then(() => {
        setMensaje("Feriado eliminado");
        setFeriados(sortFeriadosByDate(feriados.filter((f) => f.fecha !== fecha)));
      })
      .catch(() => setMensaje("Error al eliminar feriado"));
  }

  const defaultColumn = React.useMemo(() => ({ Filter: DefaultColumnFilter }), []);

  const columns = React.useMemo(() => [
    { id: "fecha", header: "Fecha", accessorKey: "fecha" },
    { id: "dia", header: "Día", accessorKey: "dia" },
    { id: "nrodiasemana", header: "Nro día semana", accessorKey: "nrodiasemana" },
    { id: "descripcion", header: "Descripción", accessorKey: "descripcion" },
    { id: "observacion", header: "Observación", accessorKey: "observacion" },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="actions-cell">
          <button className="action-btn action-btn-edit" onClick={() => handleEdit(row.original)} title="Editar">✏️</button>
          <button className="action-btn action-btn-delete" onClick={() => handleDelete(row.original.fecha)} title="Eliminar">🗑️</button>
        </div>
      ),
      enableColumnFilter: false,
    },
  ], [feriados]);

  const table = useReactTable({
    data: feriados,
    columns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
  });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestión de Feriados</h1>
        <button onClick={() => {
          const ws = XLSX.utils.json_to_sheet(feriados);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Feriados");
          XLSX.writeFile(wb, "feriados.xlsx");
        }} className="btn btn-secondary">
          📥 Exportar a Excel
        </button>
      </div>

      {mensaje && (
        <div className={`message ${mensaje.includes('Error') ? 'error-message' : 'success-message'}`}
          style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', backgroundColor: mensaje.includes('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.includes('Error') ? '#ef4444' : '#10b981', border: `1px solid ${mensaje.includes('Error') ? '#fee2e2' : '#dcfce7'}` }}>
          {mensaje}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{editFecha ? "Editar Feriado" : "Nuevo Feriado"}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Fecha</label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">Día</label>
            <input name="dia" value={form.dia} onChange={handleChange} placeholder="Ej: Lunes" />
          </div>
          <div>
            <label className="form-label">Nro día semana</label>
            <input name="nrodiasemana" type="number" value={form.nrodiasemana} onChange={handleChange} placeholder="1-7" />
          </div>
          <div>
            <label className="form-label">Descripción</label>
            <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Nombre del feriado" />
          </div>
          <div>
            <label className="form-label">Observación</label>
            <input name="observacion" value={form.observacion} onChange={handleChange} placeholder="Detalles opcionales" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editFecha ? "Actualizar" : "Crear"}</button>
            {editFecha && <button type="button" className="btn btn-secondary" onClick={() => { setEditFecha(null); setForm({ fecha: "", dia: "", nrodiasemana: "", descripcion: "", observacion: "" }); }}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="table-container">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    <div style={{ marginBottom: '8px' }}>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                    {header.column.getCanFilter() && flexRender(header.column.columnDef.Filter ?? DefaultColumnFilter, { column: header.column })}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
