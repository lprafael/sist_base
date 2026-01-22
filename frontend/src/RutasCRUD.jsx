// RutasCRUD.jsx
// CRUD de catálogo de rutas, siguiendo el diseño y validaciones de FeriadosCRUD
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { authFetch } from "./utils/authFetch";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import "./ButtonStyles.css";
import * as XLSX from "xlsx";
import * as shp from "shpjs";
import * as shapefile from "shapefile";
import { saveAs } from "file-saver";
import GeomMiniMap from "./GeomMiniMap";
import ItinerariosModal from "./ItinerariosModal";
import OperadoresModal from "./OperadoresModal";

const API_URL = "/api";  // Using proxy to avoid CORS issues

const initialForm = {
  ruta_hex: "",
  id_eot_catalogo: "",
  ruta_gtfs: "",
  ruta_dec: "",
  sentido: "",
  linea: "",
  ramal: "",
  origen: "",
  destino: "",
  identificacion: "",
  identificador_troncal: "",
  observaciones: "",
  par_id: "",
  ingresa: "",
  geom: "",
  latitud_a: "",
  longitud_a: "",
  latitud_b: "",
  longitud_b: "",
  estado: false,
};

export default function RutasCRUD() {
  // Custom filter function for geom column
  const geomFilterFn = (row, columnId, filterValue) => {
    if (filterValue === undefined || filterValue === "") return true;
    const geomValue = row.getValue(columnId);
    const hasShape =
      geomValue !== null && geomValue !== undefined && geomValue !== "";
    return filterValue === "hasShape" ? hasShape : !hasShape;
  };

  // Filtro por columna
  function DefaultColumnFilter({ column }) {
    const columnFilterValue = column.getFilterValue() || "";

    // Special handling for geom column
    if (column.id === "geom") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={columnFilterValue === "hasShape"}
              onChange={(e) =>
                column.setFilterValue(e.target.checked ? "hasShape" : "")
              }
              style={{ marginRight: "5px" }}
            />
            Con shape
          </label>
        </div>
      );
    }

    // Default input for other columns
    return (
      <input
        value={columnFilterValue}
        onChange={(e) => column.setFilterValue(e.target.value)}
        placeholder={`Filtrar...`}
        className="filter-input"
        style={{ width: "100%", padding: "4px 8px", fontSize: "12px" }}
      />
    );
  }
  // Filtro por columna
  const defaultColumn = React.useMemo(
    () => ({
      Filter: DefaultColumnFilter,
      filterFn: (row, columnId, filterValue) => {
        if (columnId === "geom" && filterValue) {
          return geomFilterFn(row, columnId, filterValue);
        }
        // Default filtering for other columns
        if (filterValue) {
          const value = row.getValue(columnId);
          return String(value)
            .toLowerCase()
            .includes(String(filterValue).toLowerCase());
        }
        return true;
      },
    }),
    []
  );
  const [rutas, setRutas] = useState([]);
  // removed hasOperadorMap to avoid per-route API calls
  const [form, setForm] = useState(initialForm);
  const [editRutaHex, setEditRutaHex] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [columnFilters, setColumnFilters] = useState([
    {
      id: "geom",
      value: "",
    },
  ]);
  const [showItinerariosModal, setShowItinerariosModal] = useState(false);
  const [showOperadoresModal, setShowOperadoresModal] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    authFetch(`${API_URL}/catalogo_rutas`)
      .then((r) => r.json())
      .then((data) => {
        setRutas(data);
        // No per-route operador checks to avoid N requests; mostramos el botón "Operador/es"
      })
      .catch(() => setMensaje("No se pudieron cargar las rutas"));
  }, []);

  function handleChange(e) {
    const { name, type, checked, value, files } = e.target;

    if (type === "file") {
      if (files && files.length > 0) {
        setFile(files);
        processShapefile(files);
      }
      return;
    }

    const newValue = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  async function processShapefile(fileOrFiles) {
    if (!fileOrFiles) return;

    setLoading(true);
    setMensaje("Procesando archivo shapefile...");

    try {
      // Resolve shpjs export shape: prefer top-level import, fallback to dynamic import
      let shpLib =
        typeof shp === "function"
          ? shp
          : shp && shp.default
            ? shp.default
            : null;
      if (!shpLib) {
        try {
          const shpModule = await import("shpjs");
          shpLib = shpModule && (shpModule.default || shpModule);
        } catch (e) {
          console.warn("Dynamic import('shpjs') failed:", e);
        }
      }
      if (!shpLib) {
        throw new Error(
          "La librería 'shpjs' no está disponible como función (import). Instale/importe 'shpjs' correctamente o comprueba el bundler."
        );
      }
      let geojson;

      if (fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) {
        const filesArr = Array.from(fileOrFiles);
        const zipFile = filesArr.find((f) =>
          f.name.toLowerCase().endsWith(".zip")
        );
        if (zipFile) {
          geojson = await shpLib(zipFile);
        } else {
          const shpFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".shp")) || null;
          const dbfFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".dbf")) || null;
          const shxFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".shx")) || null;

          if (!shpFile) throw new Error("Se requiere al menos un archivo .shp");

          if (!dbfFile) {
            throw new Error(
              "Por favor cargue también el archivo .dbf correspondiente al .shp, o suba un .zip que contenga ambos (.shp + .dbf)."
            );
          } else {
            const shpArrayBuffer = await shpFile.arrayBuffer();
            const dbfArrayBuffer = await dbfFile.arrayBuffer();
            const shxArrayBuffer = shxFile ? await shxFile.arrayBuffer() : null;

            geojson = await shapefile.read(
              new Uint8Array(shpArrayBuffer),
              new Uint8Array(dbfArrayBuffer),
              shxArrayBuffer ? new Uint8Array(shxArrayBuffer) : undefined,
              { encoding: "utf-8" }
            );
            if (geojson.type !== "FeatureCollection") {
              geojson = { type: "FeatureCollection", features: [geojson] };
            }
          }
        }
      } else if (fileOrFiles instanceof File) {
        const file = fileOrFiles;
        if (
          file.name.toLowerCase().endsWith(".zip") ||
          file.type === "application/zip"
        ) {
          geojson = await shpLib(file);
        } else if (
          file.name.toLowerCase().endsWith(".shp") ||
          file.name.toLowerCase().endsWith(".dbf") ||
          file.name.toLowerCase().endsWith(".shx")
        ) {
          const shpFile = file.name.toLowerCase().endsWith(".shp")
            ? file
            : null;
          const dbfFile = file.name.toLowerCase().endsWith(".dbf")
            ? file
            : null;
          const shxFile = file.name.toLowerCase().endsWith(".shx")
            ? file
            : null;

          if (!shpFile) throw new Error("Se requiere al menos un archivo .shp");

          if (!dbfFile) {
            throw new Error(
              "Por favor cargue también el archivo .dbf correspondiente al .shp, o suba un .zip que contenga ambos (.shp + .dbf)."
            );
          } else {
            const shpArrayBuffer = await shpFile.arrayBuffer();
            const dbfArrayBuffer = await dbfFile.arrayBuffer();
            const shxArrayBuffer = shxFile ? await shxFile.arrayBuffer() : null;

            geojson = await shapefile.read(
              new Uint8Array(shpArrayBuffer),
              new Uint8Array(dbfArrayBuffer),
              shxArrayBuffer ? new Uint8Array(shxArrayBuffer) : undefined,
              { encoding: "utf-8" }
            );
          }
          if (geojson.type !== "FeatureCollection") {
            geojson = { type: "FeatureCollection", features: [geojson] };
          }
        } else {
          throw new Error("Formato de archivo no soportado");
        }
      } else {
        throw new Error("Entrada de archivo inválida");
      }

      if (!geojson || !geojson.features || geojson.features.length === 0) {
        throw new Error("No se encontraron características en el archivo");
      }

      const feature = geojson.features[0];
      if (!feature || !feature.geometry)
        throw new Error("El archivo no contiene geometrías válidas");

      const geometry = feature.geometry;
      if (
        !geometry.coordinates ||
        (Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length === 0)
      ) {
        throw new Error("La geometría no contiene coordenadas válidas");
      }

      const formattedGeoJSON = {
        type: "Feature",
        geometry: geometry,
        properties: {},
      };

      setForm((prev) => ({ ...prev, geom: formattedGeoJSON }));
      setMensaje("Shapefile cargado exitosamente");
    } catch (error) {
      console.error("Error al procesar el shapefile:", error);
      setMensaje(
        `Error al procesar el shapefile: ${error.message || "Formato de archivo no válido"
        }`
      );
      setForm((prev) => ({ ...prev, geom: "" }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editRutaHex ? "PUT" : "POST";
      const url = editRutaHex
        ? `${API_URL}/catalogo_rutas/${encodeURIComponent(editRutaHex)}`
        : `${API_URL}/catalogo_rutas`;

      // Create the payload with proper type conversion
      const payload = { ...form };

      // Convert numeric fields
      const intFields = ["id_eot_catalogo", "ruta_dec", "ramal", "par_id", "ingresa"];
      const floatFields = ["ruta_gtfs", "latitud_a", "longitud_a", "latitud_b", "longitud_b"];

      // Format geometry if it exists
      if (payload.geom) {
        try {
          // If it's a string, try to parse it as JSON
          if (typeof payload.geom === 'string') {
            payload.geom = JSON.parse(payload.geom);
          }

          // If it's a GeoJSON Feature, extract the geometry
          if (payload.geom.type === 'Feature') {
            payload.geom = payload.geom.geometry;
          }

          // Ensure coordinates are properly formatted
          if (payload.geom.type === 'LineString' && Array.isArray(payload.geom.coordinates)) {
            // Ensure each coordinate pair has exactly 2 numbers
            payload.geom.coordinates = payload.geom.coordinates.map(coord =>
              Array.isArray(coord) && coord.length >= 2
                ? [Number(coord[0]), Number(coord[1])]
                : coord
            );
          }
        } catch (e) {
          console.error('Error processing geometry:', e);
          // If there's an error, remove the geometry to avoid validation errors
          delete payload.geom;
        }
      }

      // Handle boolean field
      if (payload.estado !== undefined) {
        payload.estado = !!payload.estado;
      }

      // Handle integer fields
      intFields.forEach(field => {
        if (payload[field] !== undefined && payload[field] !== '') {
          const num = parseInt(payload[field], 10);
          payload[field] = isNaN(num) ? null : num;
        } else if (payload[field] === '') {
          payload[field] = null;
        }
      });

      // Handle float fields
      floatFields.forEach(field => {
        if (payload[field] !== undefined && payload[field] !== '') {
          const num = parseFloat(payload[field]);
          payload[field] = isNaN(num) ? null : num;
        } else if (payload[field] === '') {
          payload[field] = null;
        }
      });

      // Handle string fields - convert empty strings to null
      const stringFields = ["sentido", "linea", "origen", "destino", "identificacion", "identificador_troncal", "observaciones"];
      stringFields.forEach(field => {
        if (payload[field] === '') {
          payload[field] = null;
        }
      });

      // Handle geometry field
      if (payload.geom) {
        try {
          payload.geom = typeof payload.geom === 'string' ? JSON.parse(payload.geom) : payload.geom;
        } catch (e) {
          console.warn('Failed to parse geometry:', e);
          // Keep original value if parsing fails
        }
      } else {
        delete payload.geom; // Don't send null/empty geometry
      }

      // Remove ruta_hex from payload for updates (it's in the URL)
      if (editRutaHex) {
        delete payload.ruta_hex;
      }

      console.log('Sending payload to', url, ':', JSON.stringify(payload, null, 2));
      console.log('Payload keys:', Object.keys(payload));
      console.log('Payload values:', Object.values(payload));

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Create a new response to read the body
        const errorResponse = response.clone();
        const errorText = await errorResponse.text();
        console.error('Error response text:', errorText);

        try {
          // Try to parse as JSON
          const errorData = JSON.parse(errorText);
          console.error('Parsed error data:', errorData);

          // Format validation errors if they exist
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              const errorMessages = errorData.detail.map(err => {
                if (err.loc) {
                  return `${err.loc.join('.')}: ${err.msg || JSON.stringify(err)}`;
                }
                return JSON.stringify(err);
              }).join('\n');
              throw new Error(`Error de validación:\n${errorMessages}`);
            } else if (typeof errorData.detail === 'string') {
              throw new Error(errorData.detail);
            }
            throw new Error(JSON.stringify(errorData.detail));
          }

          // Handle other error formats
          const errorMessage = errorData.message || errorData.detail ||
            `Error ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);

        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // If we can't parse as JSON, show the raw text
          throw new Error(`Error ${response.status}: ${response.statusText}\n${errorText}`);
        }
      }

      const data = await response.json();
      setMensaje(editRutaHex ? "Ruta actualizada correctamente" : "Ruta creada correctamente");
      setForm(initialForm);
      setEditRutaHex(null);

      // Refresh the routes list
      const rutasResponse = await authFetch(`${API_URL}/catalogo_rutas`);
      const rutasData = await rutasResponse.json();
      setRutas(rutasData);

    } catch (error) {
      console.error('Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      let errorMessage = 'Error al guardar la ruta';

      // Si el error ya tiene un mensaje específico (como los que lanzamos en el bloque if (!response.ok))
      if (error.message && error.message !== 'Error al guardar la ruta') {
        errorMessage = error.message;
      } else if (error.response) {
        // Solo intentar leer el body si no lo hemos leído antes
        try {
          const errorText = await error.response.text();
          console.error('Error response text:', errorText);

          try {
            const errorData = JSON.parse(errorText);
            console.error('Server validation errors:', errorData);

            if (errorData.detail) {
              if (Array.isArray(errorData.detail)) {
                const errorMessages = errorData.detail.map(err => {
                  if (err.loc) {
                    return `${err.loc.join('.')}: ${err.msg || JSON.stringify(err)}`;
                  }
                  return JSON.stringify(err);
                }).join('\n');
                errorMessage = `Error de validación:\n${errorMessages}`;
              } else if (typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
              } else {
                errorMessage = JSON.stringify(errorData.detail);
              }
            } else {
              errorMessage = errorData.message || errorData.detail || errorMessage;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
            errorMessage = `Error ${error.response.status}: ${error.response.statusText}\n${errorText}`;
          }
        } catch (e) {
          console.error('Could not read error response:', e);
          errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
        }
      }

      setMensaje(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = useCallback((ruta) => {
    setForm({ ...ruta });
    setEditRutaHex(ruta.ruta_hex);
    setShowForm(true); // Abre el formulario al editar
  }, []);

  const handleDelete = useCallback((ruta_hex) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta ruta?")) return;
    authFetch(`${API_URL}/catalogo_rutas/${ruta_hex}`, { method: "DELETE" })
      .then(() =>
        authFetch(`${API_URL}/catalogo_rutas`)
          .then((r) => r.json())
          .then(setRutas)
      )
      .then(() => setMensaje("Ruta eliminada"))
      .catch(() => setMensaje("Error al eliminar ruta"));
  }, []);

  // Definir columnas para la tabla
  const columns = useMemo(
    () => [
      // igual que antes, pero abajo se agregan los filtros

      { accessorKey: "ruta_hex", header: "Ruta HEX" },
      { accessorKey: "id_eot_catalogo", header: "ID EOT Catálogo" },
      { accessorKey: "ruta_gtfs", header: "Ruta GTFS" },
      { accessorKey: "ruta_dec", header: "Ruta DEC" },
      { accessorKey: "sentido", header: "Sentido" },
      { accessorKey: "linea", header: "Línea" },
      { accessorKey: "ramal", header: "Ramal" },
      { accessorKey: "origen", header: "Origen" },
      { accessorKey: "destino", header: "Destino" },
      { accessorKey: "identificacion", header: "Identificación" },
      { accessorKey: "identificador_troncal", header: "Identif. Troncal" },
      { accessorKey: "observaciones", header: "Observaciones" },
      { accessorKey: "par_id", header: "Par ID" },
      { accessorKey: "ingresa", header: "Ingresa" },
      // geom
      {
        accessorKey: "geom",
        header: "Geom",
        id: "geom",
        cell: ({ getValue }) =>
          getValue() ? <GeomMiniMap geom={getValue()} /> : "Sin shape",
      },
      { accessorKey: "latitud_a", header: "Latitud A" },
      { accessorKey: "longitud_a", header: "Longitud A" },
      { accessorKey: "latitud_b", header: "Latitud B" },
      { accessorKey: "longitud_b", header: "Longitud B" },
      { accessorKey: "estado", header: "Estado" },
      {
        header: "Acciones",
        id: "acciones",
        position: "sticky",
        right: 0,
        cell: ({ row }) => {
          const hasShape = !!row.original.geom;
          return (
            <div className="actions-cell" style={{ flexWrap: 'wrap', minWidth: '150px' }}>
              <button
                onClick={() => {
                  setSelectedRuta(row.original);
                  setShowItinerariosModal(true);
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                title={hasShape ? "Ver Itinerarios" : "Cargar Itinerario"}
              >
                {hasShape ? "🗺️" : "➕"}
              </button>
              <button
                onClick={() => {
                  setSelectedRuta(row.original);
                  setShowOperadoresModal(true);
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                title="Operador/es"
              >
                👥
              </button>
              <button
                onClick={() => handleEdit(row.original)}
                className="action-btn action-btn-edit"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(row.original.ruta_hex)}
                className="action-btn action-btn-delete"
                title="Eliminar"
              >
                🗑️
              </button>
            </div>
          );
        },
      },
    ],
    [handleEdit, handleDelete]
  );

  const table = useReactTable({
    data: rutas,
    columns,
    defaultColumn,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Exportar a Excel (implementación más abajo con filtros y timestamp)

  // Descargar shapes en formato shapefile comprimido
  async function descargarShapes() {
    try {
      // Obtener los datos filtrados o todos si no hay filtros
      const filteredData = table
        .getFilteredRowModel()
        .rows.map((row) => row.original);
      const dataToExport = filteredData.length > 0 ? filteredData : rutas;

      // Log para debug
      console.log('Datos a exportar:', dataToExport.length, 'rutas');
      console.log('Rutas con geometría:', dataToExport.filter(r => r.geom).length);
      if (dataToExport.length > 0) {
        console.log('Primera ruta:', {
          ruta_hex: dataToExport[0].ruta_hex,
          tiene_geom: !!dataToExport[0].geom,
          geom_preview: dataToExport[0].geom ? JSON.stringify(dataToExport[0].geom).substring(0, 200) + '...' : 'Sin geometría'
        });
      }

      // Procesar las geometrías para asegurar que estén en el formato correcto
      const processedData = dataToExport.map(ruta => {
        const processedRuta = { ...ruta };

        // Si la geometría es una cadena JSON, parsearla
        if (processedRuta.geom && typeof processedRuta.geom === 'string') {
          try {
            processedRuta.geom = JSON.parse(processedRuta.geom);
          } catch (e) {
            console.warn('Error parsing geometry for route', ruta.ruta_hex, e);
            // Si no se puede parsear, mantener como string
          }
        }

        return processedRuta;
      });

      console.log('Datos procesados - Rutas con geometría:', processedData.filter(r => r.geom).length);

      // Enviar solicitud al backend para generar el shapefile
      const response = await authFetch(
        `${API_URL}/catalogo_rutas/exportar_shapes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del servidor - Status:", response.status);
        console.error("Error del servidor - Text:", errorText);

        try {
          const errorData = JSON.parse(errorText);
          console.error("Error del servidor - Parsed:", errorData);
          throw new Error(errorData.detail || "Error al generar los shapes");
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
      }

      // Obtener el blob de la respuesta
      const blob = await response.blob();

      // Crear un enlace temporal para la descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generar el nombre del archivo con la fecha actual
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `shapes_rutas_${fecha}.zip`;

      // Disparar el evento de clic para iniciar la descarga
      document.body.appendChild(a);
      a.click();

      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMensaje("Descarga de shapes iniciada");
    } catch (error) {
      console.error("Error al descargar shapes:", error);
      setMensaje("Error al descargar los shapes");
    }
  }

  // Exportar a Excel
  function exportToExcel() {
    // Usar los datos filtrados de la tabla react-table y excluir 'geom'
    const filteredRows = table
      .getFilteredRowModel()
      .rows.map((row) => row.original);
    const dataToExport = (filteredRows.length > 0 ? filteredRows : rutas).map(
      ({ geom, ...rest }) => rest
    );
    if (dataToExport.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rutas Filtradas");
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const fechaHora = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const nombreArchivo = `rutas_filtradas_(${fechaHora}).xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Catálogo de Rutas</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportToExcel} className="btn btn-secondary">📥 Exportar a Excel</button>
          <button onClick={descargarShapes} className="btn btn-secondary">📂 Descargar shapes</button>
        </div>
      </div>

      {mensaje && (
        <div className={`message ${mensaje.includes('Error') ? 'error-message' : 'success-message'}`}
          style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', backgroundColor: mensaje.includes('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.includes('Error') ? '#ef4444' : '#10b981', border: `1px solid ${mensaje.includes('Error') ? '#fee2e2' : '#dcfce7'}` }}>
          {mensaje}
        </div>
      )}

      <div className="card">
        <div
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {editRutaHex ? "📝 Editando Ruta" : "➕ Nueva Ruta"}
          </h3>
          <span style={{ fontSize: '1.2rem', transition: 'transform 0.3s' }}>
            {showForm ? '🔼' : '🔽'}
          </span>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div><label className="form-label">Ruta HEX*</label><input name="ruta_hex" value={form.ruta_hex} onChange={handleChange} required={!editRutaHex} disabled={!!editRutaHex} /></div>
            <div><label className="form-label">EOT Catálogo</label><input name="id_eot_catalogo" value={form.id_eot_catalogo || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Ruta GTFS</label><input name="ruta_gtfs" value={form.ruta_gtfs || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Ruta DEC</label><input name="ruta_dec" value={form.ruta_dec || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Sentido</label><input name="sentido" value={form.sentido || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Línea</label><input name="linea" value={form.linea || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Ramal</label><input name="ramal" value={form.ramal || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Origen</label><input name="origen" value={form.origen || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Destino</label><input name="destino" value={form.destino || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Identificación</label><input name="identificacion" value={form.identificacion || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Troncal</label><input name="identificador_troncal" value={form.identificador_troncal || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Observaciones</label><input name="observaciones" value={form.observaciones || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Par ID</label><input name="par_id" value={form.par_id || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Ingresa</label><input name="ingresa" value={form.ingresa || ""} onChange={handleChange} /></div>

            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <label className="form-label">Cargar Shapefile (.shp / .zip)</label>
              <input type="file" multiple ref={fileInputRef} onChange={handleChange} accept=".shp,.dbf,.shx,.zip" style={{ padding: '8px 0' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {file
                  ? file instanceof FileList || Array.isArray(file)
                    ? `Archivos seleccionados: ${file.length}`
                    : `Archivo seleccionado: ${file.name}`
                  : "Seleccione un archivo .zip o los archivos (.shp + .dbf + [.shx])"}
              </p>
            </div>

            <div><label className="form-label">Latitud A</label><input name="latitud_a" value={form.latitud_a || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Longitud A</label><input name="longitud_a" value={form.longitud_a || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Latitud B</label><input name="latitud_b" value={form.latitud_b || ""} onChange={handleChange} /></div>
            <div><label className="form-label">Longitud B</label><input name="longitud_b" value={form.longitud_b || ""} onChange={handleChange} /></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '25px' }}>
              <input name="estado" type="checkbox" checked={!!form.estado} onChange={handleChange} style={{ width: 'auto' }} />
              <label className="form-label" style={{ marginBottom: 0 }}>Ruta Activa</label>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Procesando..." : (editRutaHex ? "Actualizar Ruta" : "Crear Ruta")}
              </button>
              {editRutaHex && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditRutaHex(null); setForm(initialForm); setShowForm(false); }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="table-container" style={{ marginTop: '24px', maxHeight: '550px', overflowY: 'auto' }}>
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} style={header.column.id === 'acciones' ? { position: 'sticky', right: 0, zIndex: 10, background: '#f8fafc' } : {}}>
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
                  <td key={cell.id} style={cell.column.id === 'acciones' ? { position: 'sticky', right: 0, zIndex: 5, background: 'white', boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.1)' } : {}}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showItinerariosModal && selectedRuta && (
        <ItinerariosModal
          rutaHex={selectedRuta.ruta_hex}
          onClose={() => {
            setShowItinerariosModal(false);
            setSelectedRuta(null);
            authFetch(`${API_URL}/catalogo_rutas`)
              .then((r) => r.json())
              .then(setRutas);
          }}
        />
      )}
      {showOperadoresModal && selectedRuta && (
        <OperadoresModal
          rutaHex={selectedRuta.ruta_hex}
          onClose={() => {
            setShowOperadoresModal(false);
            setSelectedRuta(null);
          }}
        />
      )}
    </div>
  );
}
