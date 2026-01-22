// EotsCRUD.js
// CRUD de Empresas Operadoras de Transporte (EOTs) refactorizado
import React, { useEffect, useState, useRef } from "react";
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

export default function EotsCRUD() {
  const [eots, setEots] = useState([]);
  const [form, setForm] = useState({
    eot_nombre: "", eot_linea: "", cod_catalogo: "", cod_planilla: "",
    cod_epas: "", cod_tdp: "", situacion: "", gre_id: "",
    autorizado: "", operativo: "", reserva: "", permisionario: false,
    operativo_declarado: "", reserva_declarada: "", id_eot_vmt_hex: "", e_mail: "",
  });
  const [editId, setEditId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const isMounted = useRef(true);

  useEffect(() => {
    authFetch(`/api/eots`)
      .then((r) => r.json())
      .then(setEots)
      .catch(() => setMensaje("No se pudieron cargar los EOTs"));
    return () => { isMounted.current = false; };
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/eots/${editId}` : `/api/eots`;
    authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(r => r.json())
      .then(() => {
        setMensaje(editId ? "EOT actualizado" : "EOT creado");
        setForm({
          eot_nombre: "", eot_linea: "", cod_catalogo: "", cod_planilla: "",
          cod_epas: "", cod_tdp: "", situacion: "", gre_id: "",
          autorizado: "", operativo: "", reserva: "", permisionario: false,
          operativo_declarado: "", reserva_declarada: "", id_eot_vmt_hex: "", e_mail: "",
        });
        setEditId(null);
        return authFetch(`/api/eots`).then(r => r.json()).then(setEots);
      })
      .catch(() => setMensaje("Error al guardar EOT"));
  }

  function handleEdit(eot) {
    setForm({ ...eot });
    setEditId(eot.eot_id);
  }

  function handleDelete(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este EOT?")) return;
    authFetch(`/api/eots/${id}`, { method: "DELETE" })
      .then(() => {
        setMensaje("EOT eliminado");
        setEots(eots.filter((e) => e.eot_id !== id));
      })
      .catch(() => setMensaje("Error al eliminar EOT"));
  }

  const defaultColumn = React.useMemo(() => ({ Filter: DefaultColumnFilter }), []);

  const columns = React.useMemo(() => [
    { id: "eot_id", header: "ID", accessorKey: "eot_id" },
    { id: "eot_nombre", header: "Nombre", accessorKey: "eot_nombre" },
    { id: "eot_linea", header: "Línea", accessorKey: "eot_linea" },
    { id: "cod_catalogo", header: "Catálogo", accessorKey: "cod_catalogo" },
    { id: "e_mail", header: "Email", accessorKey: "e_mail" },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="actions-cell">
          <button className="action-btn action-btn-edit" onClick={() => handleEdit(row.original)} title="Editar">✏️</button>
          <button className="action-btn action-btn-delete" onClick={() => handleDelete(row.original.eot_id)} title="Eliminar">🗑️</button>
        </div>
      ),
      enableColumnFilter: false,
    },
  ], [eots]);

  const table = useReactTable({
    data: eots,
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Empresas Operadoras (EOTs)</h1>
        <button onClick={() => {
          const ws = XLSX.utils.json_to_sheet(eots);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "EOTs");
          XLSX.writeFile(wb, "eots.xlsx");
        }} className="btn btn-secondary">📥 Exportar a Excel</button>
      </div>

      {mensaje && (
        <div className={`message ${mensaje.includes('Error') ? 'error-message' : 'success-message'}`}
          style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', backgroundColor: mensaje.includes('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.includes('Error') ? '#ef4444' : '#10b981', border: `1px solid ${mensaje.includes('Error') ? '#fee2e2' : '#dcfce7'}` }}>
          {mensaje}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{editId ? "Editar EOT" : "Nueva EOT"}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div><label className="form-label">Nombre</label><input name="eot_nombre" value={form.eot_nombre || ""} onChange={handleChange} required /></div>
          <div><label className="form-label">Línea</label><input name="eot_linea" value={form.eot_linea || ""} onChange={handleChange} /></div>
          <div><label className="form-label">Catálogo</label><input name="cod_catalogo" value={form.cod_catalogo || ""} onChange={handleChange} /></div>
          <div><label className="form-label">Planilla</label><input name="cod_planilla" value={form.cod_planilla || ""} onChange={handleChange} /></div>
          <div><label className="form-label">EPAS</label><input name="cod_epas" value={form.cod_epas || ""} onChange={handleChange} /></div>
          <div><label className="form-label">TDP</label><input name="cod_tdp" value={form.cod_tdp || ""} onChange={handleChange} /></div>
          <div><label className="form-label">Gremio ID</label><input name="gre_id" value={form.gre_id || ""} onChange={handleChange} /></div>
          <div><label className="form-label">Email</label><input name="e_mail" type="email" value={form.e_mail || ""} onChange={handleChange} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingTop: '25px' }}>
            <input name="permisionario" type="checkbox" checked={!!form.permisionario} onChange={handleChange} style={{ width: 'auto' }} />
            <label className="form-label" style={{ marginBottom: 0 }}>Permisionario</label>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary">{editId ? "Actualizar" : "Crear EOT"}</button>
            {editId && <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setForm({}); }}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="table-container" style={{ maxHeight: '500px' }}>
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
