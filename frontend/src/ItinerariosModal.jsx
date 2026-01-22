import React, { useEffect, useState, useRef, useMemo } from "react";
import { authFetch } from "./utils/authFetch";
import GeomMiniMap from "./GeomMiniMap";
import MapEditor from "./components/MapEditor";
import * as shp from "shpjs";
import * as shapefile from "shapefile";
import { saveAs } from "file-saver";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import "./ButtonStyles.css";
import * as XLSX from "xlsx";

const API_URL =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000";

const initialForm = {
  fecha_inicio_vigencia: "",
  fecha_fin_vigencia: "",
  geom: "",
  vigente: false,
  observacion: "",
};

export default function ItinerariosModal({ rutaHex, onClose }) {
  const [itinerarios, setItinerarios] = useState([]);
  const [form, setForm] = useState({
    fecha_inicio_vigencia: "",
    fecha_fin_vigencia: "",
    vigente: true,
    observacion: "",
    geom: null,
  });
  
  // Estados para el editor de mapas
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [conflictItem, setConflictItem] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchItinerarios = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_URL}/historico_itinerario?ruta_hex=${rutaHex}`
      );
      if (!res.ok) throw new Error("Error al obtener itinerarios");
      const data = await res.json();

      // Asegurarse de que geom sea un string JSON válido
      const formattedData = data.map((item) => {
        // Normalize geom to a GeoJSON object when possible.
        if (!item.geom) return { ...item, geom: null };

        if (typeof item.geom === "string") {
          try {
            const parsed = JSON.parse(item.geom);
            return { ...item, geom: parsed };
          } catch (e) {
            // Try to wrap raw geometry into a Feature
            try {
              const fixedGeom = JSON.parse(
                `{"type":"Feature","geometry":${item.geom},"properties":{}}`
              );
              return { ...item, geom: fixedGeom };
            } catch (e2) {
              console.error("No se pudo corregir la geometría:", e2);
              return { ...item, geom: null };
            }
          }
        }

        if (typeof item.geom === "object") {
          return { ...item, geom: item.geom };
        }

        return { ...item, geom: null };
      });

      setItinerarios(formattedData);
    } catch (e) {
      console.error("Error al cargar itinerarios:", e);
      setMensaje("No se pudieron cargar los itinerarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItinerarios();
  }, [rutaHex]);

  function mapLocation(loc) {
    if (!loc) return <div>No disponible</div>;
    const labels = {
      road: "Calle",
      suburb: "Barrio/Compañía",
      city: "Ciudad",
      state: "Departamento",
      postcode: "Cod. Postal",
      country: "Pais",
    };

    return (
      <div style={{ fontSize: 13 }}>
        {Object.entries(labels).map(([key, label]) =>
          loc[key] ? (
            <div key={key}>
              <strong>{label}:</strong> {loc[key]}
            </div>
          ) : null
        )}
      </div>
    );
  }

  function formatLocationText(loc) {
    if (!loc) return "No disponible";
    const labels = {
      road: "Calle",
      suburb: "Barrio/Compañía",
      city: "Ciudad",
      state: "Departamento",
      postcode: "Cod. Postal",
      country: "Pais",
    };
    const lines = [];
    Object.entries(labels).forEach(([key, label]) => {
      const v = loc[key];
      if (v) lines.push(`${label}: ${v}`);
    });
    return lines.length > 0 ? lines.join("; ") : "Sin datos de ubicación";
  }

  function formatLocationHTML(loc) {
    if (!loc) return "<div>No disponible</div>";
    const labels = {
      road: "Calle",
      suburb: "Barrio/Compañía",
      city: "Ciudad",
      state: "Departamento",
      postcode: "Cod. Postal",
      country: "Pais",
    };
    let html = "<div>";
    Object.entries(labels).forEach(([key, label]) => {
      const v = loc[key];
      if (v) html += `<div><strong>${label}:</strong> ${v}</div>`;
    });
    html += "</div>";
    return html;
  }

  function formatAnalysisForExport(data) {
    if (!data) return "";
    const parts = [];
    parts.push("Inicio:");
    parts.push(formatLocationText(data.inicio?.ubicacion));
    const iniCoords = data.inicio?.coordenadas;
    if (iniCoords)
      parts.push(`Coordenadas: ${iniCoords.lat}, ${iniCoords.lon}`);
    parts.push("\nCalles encontradas:");
    (data.calles_recorrido || []).forEach((c) => {
      parts.push(`- ${c.name} (cerca de ${c.lat},${c.lon})`);
    });
    parts.push("\nFin:");
    parts.push(formatLocationText(data.fin?.ubicacion));
    const endCoords = data.fin?.coordenadas;
    if (endCoords)
      parts.push(`Coordenadas: ${endCoords.lat}, ${endCoords.lon}`);
    return parts.join("\n");
  }

  // Helper to consistently format date strings as local dates.
  // Avoids constructing Date from an ISO string that may be parsed as UTC
  // and then shown in local time (causing a previous-day shift).
  function formatDateLocal(value) {
    if (!value) return "";
    // If it's already a Date object, just format it
    if (value instanceof Date) return value.toLocaleDateString();
    // If string, extract YYYY-MM-DD
    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const d = parseInt(m[3], 10);
        return new Date(y, mo, d).toLocaleDateString();
      }
      // Fallback: try native parsing
      const parsed = new Date(value);
      if (!isNaN(parsed)) return parsed.toLocaleDateString();
      return value;
    }
    return String(value);
  }

  // Función para filtrar por geometría
  const geomFilterFn = (row, columnId, filterValue) => {
    if (filterValue === undefined || filterValue === "") return true;
    const geomValue = row.getValue(columnId);
    const hasShape =
      geomValue !== null && geomValue !== undefined && geomValue !== "";
    return filterValue === "hasShape" ? hasShape : !hasShape;
  };

  // Componente de filtro para columnas
  function DefaultColumnFilter({ column }) {
    const columnFilterValue = column.getFilterValue() || "";

    // Manejo especial para columna geom
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

    // Filtro por defecto para otras columnas
    return (
      <input
        value={columnFilterValue}
        onChange={(e) => column.setFilterValue(e.target.value)}
        placeholder={`Filtrar...`}
        style={{ width: "100%" }}
      />
    );
  }

  // Configuración de columnas con filtros
  const columns = useMemo(
    () => [
      {
        accessorKey: "fecha_inicio_vigencia",
        header: "Inicio Vigencia",
        cell: (info) =>
          info.getValue() ? formatDateLocal(info.getValue()) : "",
      },
      {
        accessorKey: "fecha_fin_vigencia",
        header: "Fin Vigencia",
        cell: (info) =>
          info.getValue() ? formatDateLocal(info.getValue()) : "",
      },
      {
        accessorKey: "geom",
        header: "Geometría",
        cell: ({ getValue }) => {
          const geom = getValue();
          if (!geom) return "Sin geometría";
          try {
            const geomObj = typeof geom === "string" ? JSON.parse(geom) : geom;
            return <GeomMiniMap geom={geomObj} />;
          } catch (e) {
            console.error("Error al parsear geometría:", e);
            return "Error en geometría";
          }
        },
      },
      {
        accessorKey: "vigente",
        header: "Vigente",
        cell: (info) => (info.getValue() ? "Sí" : "No"),
      },
      {
        accessorKey: "observacion",
        header: "Observación",
        cell: (info) => info.getValue() || "-",
      },
      {
        accessorKey: "acciones",
        header: "Acciones",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div style={{ display: "flex", gap: "5px" }}>
                <button
                  onClick={() => handleDuplicate(item)}
                  className="btn-accion"
                  style={{
                    padding: "3px 8px",
                    fontSize: "12px",
                    background: "#1976d2",
                    color: "white",
                  }}
                >
                  Duplicar
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="btn-accion btn-editar"
                  style={{ padding: "3px 8px", fontSize: "12px" }}
                >
                  Editar Datos
                </button>
                <button
                  onClick={() => handleEditGeometry(item)}
                  className="btn-accion"
                  style={{
                    padding: "3px 8px",
                    fontSize: "12px",
                    background: "#9c27b0",
                    color: "white"
                  }}
                >
                  Editar Ruta
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="btn-accion btn-eliminar"
                  style={{ padding: "3px 8px", fontSize: "12px" }}
                >
                  Eliminar
                </button>
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <button
                  onClick={async () => {
                    if (!item.geom) return;
                    try {
                      let geomProcessed =
                        typeof item.geom === "string"
                          ? JSON.parse(item.geom)
                          : item.geom;
                      if (geomProcessed.type === "Feature")
                        geomProcessed = geomProcessed.geometry;

                      const geometry = {
                        type: "MultiLineString",
                        coordinates: Array.isArray(geomProcessed.coordinates)
                          ? geomProcessed.type === "LineString"
                            ? [geomProcessed.coordinates]
                            : geomProcessed.coordinates
                          : [],
                      };

                      const itinerariosPayload = [
                        { ruta_hex: rutaHex, geom: geometry },
                      ];

                      const response = await authFetch(
                        `${API_URL}/catalogo_rutas/exportar_shapes`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(itinerariosPayload),
                        }
                      );
                      if (!response.ok)
                        throw new Error("Error al generar shapes");
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `shape_itinerario_${rutaHex}_${
                        item.fecha_inicio_vigencia.split("T")[0]
                      }.zip`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      setMensaje("Descarga de shapes iniciada");
                    } catch (err) {
                      console.error(err);
                      setMensaje("Error al descargar los shapes");
                    }
                  }}
                  className="btn-accion"
                  style={{
                    background: "#4caf50",
                    color: "white",
                    padding: "3px 8px",
                    fontSize: "12px",
                  }}
                >
                  Descargar Shape
                </button>

                <button
                  onClick={async () => {
                    if (!item.geom) return;
                    try {
                      let geomProcessed =
                        typeof item.geom === "string"
                          ? JSON.parse(item.geom)
                          : item.geom;
                      if (geomProcessed.type === "Feature")
                        geomProcessed = geomProcessed.geometry;

                      const response = await authFetch(
                        `${API_URL}/analizar_recorrido`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ geom: geomProcessed }),
                        }
                      );
                      if (!response.ok)
                        throw new Error("Error al analizar el recorrido");
                      const data = await response.json();
                      setAnalysisData(data);
                      setShowAnalysisDialog(true);
                    } catch (err) {
                      console.error(err);
                      setMensaje("Error al analizar el recorrido");
                    }
                  }}
                  className="btn-accion"
                  style={{
                    background: "#9c27b0",
                    color: "white",
                    padding: "3px 8px",
                    fontSize: "12px",
                  }}
                >
                  Analizar Recorrido
                </button>
              </div>
            </div>
          );
        },
      },
    ],
    [rutaHex]
  );

  // Configuración de la tabla
  const table = useReactTable({
    data: itinerarios,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: {
      Filter: DefaultColumnFilter,
      filterFn: (row, columnId, filterValue) => {
        if (columnId === "geom" && filterValue) {
          return geomFilterFn(row, columnId, filterValue);
        }
        if (filterValue) {
          const value = row.getValue(columnId);
          return String(value)
            .toLowerCase()
            .includes(String(filterValue).toLowerCase());
        }
        return true;
      },
    },
    // Nota: no pasar `state` ni `debugTable` para evitar re-rendering infinito
  });

  function handleChange(e) {
    const { name, type, checked, value, files } = e.target;

    if (type === "file") {
      if (files && files.length > 0) {
        // Guardar la lista completa de archivos seleccionados
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
      let geojson;

      // Si recibimos una lista de archivos (FileList o Array)
      if (fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) {
        const filesArr = Array.from(fileOrFiles);
        console.log(
          "Archivos recibidos:",
          filesArr.map((f) => f.name)
        );

        // Preferir .zip si está presente
        const zipFile = filesArr.find((f) =>
          f.name.toLowerCase().endsWith(".zip")
        );
        if (zipFile) {
          console.log("Procesando ZIP con shpjs...");
          geojson = await shp(zipFile);
        } else {
          // Buscar shp + dbf (+ shx opcional)
          const shpFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".shp")) || null;
          const dbfFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".dbf")) || null;
          const shxFile =
            filesArr.find((f) => f.name.toLowerCase().endsWith(".shx")) || null;

          if (!shpFile) {
            throw new Error("Se requiere al menos un archivo .shp");
          }

          // Si no hay DBF, intentamos leer geometría desde .shp usando shpjs (sin atributos)
          if (!dbfFile) {
            console.warn(
              "No se encontró .dbf — intentando leer solo geometría desde .shp (sin atributos)"
            );
            try {
              geojson = await shp(shpFile);
            } catch (err) {
              console.error("Fallback shpjs falló:", err);
              throw new Error(
                "Falta .dbf y no se pudo procesar la geometría desde .shp. Proporcione .dbf o un .zip con todos los archivos."
              );
            }
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
      }
      // Si es un único File
      else if (fileOrFiles instanceof File) {
        const file = fileOrFiles;
        console.log(
          "Archivo recibido:",
          file.name,
          "Tipo:",
          file.type,
          "Tamaño:",
          file.size
        );

        if (
          file.name.toLowerCase().endsWith(".zip") ||
          file.type === "application/zip"
        ) {
          console.log("Procesando como archivo ZIP con shpjs...");
          geojson = await shp(file);
        } else if (
          file.name.toLowerCase().endsWith(".shp") ||
          file.name.toLowerCase().endsWith(".dbf") ||
          file.name.toLowerCase().endsWith(".shx")
        ) {
          console.log(
            "Procesando como shapefile individual con shapefile-js..."
          );
          const shpFile = file.name.toLowerCase().endsWith(".shp")
            ? file
            : null;
          const dbfFile = file.name.toLowerCase().endsWith(".dbf")
            ? file
            : null;
          const shxFile = file.name.toLowerCase().endsWith(".shx")
            ? file
            : null;

          if (!shpFile) {
            throw new Error("Se requiere al menos un archivo .shp");
          }

          if (!dbfFile) {
            console.warn(
              "No se encontró .dbf — intentando leer solo geometría desde .shp (sin atributos)"
            );
            try {
              geojson = await shp(file);
            } catch (err) {
              console.error("Fallback shpjs falló:", err);
              throw new Error(
                "Falta .dbf y no se pudo procesar la geometría desde .shp. Proporcione .dbf o un .zip con todos los archivos."
              );
            }
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
          throw new Error(
            "Formato de archivo no soportado. Use un archivo .zip que contenga .shp, .dbf (y opcionalmente .shx) o seleccione los archivos .shp + .dbf."
          );
        }
      } else {
        throw new Error("Entrada de archivo inválida");
      }

      console.log("GeoJSON parseado:", geojson);

      if (!geojson || !geojson.features || geojson.features.length === 0) {
        throw new Error("No se encontraron características en el archivo");
      }

      // Tomamos solo la primera característica del shapefile
      const feature = geojson.features[0];
      console.log("Primera característica:", feature);

      if (!feature || !feature.geometry) {
        throw new Error("El archivo no contiene geometrías válidas");
      }

      const geometry = feature.geometry;

      // Validar que la geometría sea válida
      if (
        !geometry.coordinates ||
        (Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length === 0)
      ) {
        console.error("Coordenadas inválidas:", geometry);
        throw new Error("La geometría no contiene coordenadas válidas");
      }

      // Formatear correctamente el GeoJSON para el mapa
      const formattedGeoJSON = {
        type: "Feature",
        geometry: geometry,
        properties: {},
      };

      // Validar el GeoJSON resultante
      if (
        !formattedGeoJSON.geometry ||
        !formattedGeoJSON.geometry.coordinates
      ) {
        throw new Error("Formato de geometría no válido");
      }

      // Store geometry as an object (not as a double-encoded string) so
      // duplication and submit produce a proper GeoJSON object payload.
      setForm((prev) => ({ ...prev, geom: formattedGeoJSON }));

      setMensaje("Shapefile cargado exitosamente");
    } catch (error) {
      console.error("Error al procesar el shapefile:", error);
      setMensaje(
        `Error al procesar el shapefile: ${
          error.message || "Formato de archivo no válido"
        }`
      );
      setForm((prev) => ({ ...prev, geom: "" }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(it) {
    setForm({
      ...it,
      fecha_inicio_vigencia: it.fecha_inicio_vigencia?.split("T")[0] || "",
      fecha_fin_vigencia: it.fecha_fin_vigencia?.split("T")[0] || "",
    });
    setEditKey({
      ruta_hex: it.ruta_hex,
      fecha_inicio_vigencia: it.fecha_inicio_vigencia,
    });
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Duplicar un itinerario: prefill form but do NOT set editKey so fecha_inicio_vigencia is editable
  function handleDuplicate(it) {
    // Ensure geom is an object when prefilling the form. The source item
    // (it.geom) can be a string (from the server) or an object. Prefer an
    // object so the POST payload will contain proper GeoJSON.
    let geomVal = it.geom || null;
    if (typeof geomVal === "string" && geomVal) {
      try {
        geomVal = JSON.parse(geomVal);
      } catch (e) {
        // keep as string if parse fails
        console.warn("handleDuplicate: failed to parse geom string", e);
      }
    }

    setForm({
      ...it,
      // clear primary key date to force user to choose a new start date
      fecha_inicio_vigencia: "",
      fecha_fin_vigencia: it.fecha_fin_vigencia?.split("T")[0] || "",
      geom: geomVal || "",
      vigente: false, // desactivar por defecto al duplicar para evitar conflicto de 'vigente' existente
    });
    setEditKey(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMensaje(
      "Itinerario duplicado (vigente desactivado). Ajusta Fecha inicio y Vigente antes de Crear."
    );
    // focus the fecha input could be added later
  }

  function handleCancelEdit() {
    setForm({
      fecha_inicio_vigencia: "",
      fecha_fin_vigencia: "",
      geom: "",
      vigente: false,
      observacion: "",
    });
    setFile(null);
    setEditKey(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let method, url;
      // Normalizar fechas: enviar null si están vacías y asegurar formato YYYY-MM-DD
      const normalizeDate = (value) => {
        if (value === undefined || value === null) return null;
        if (typeof value === "string") {
          const v = value.trim();
          if (!v) return null;
          // Si viene con hora, tomar solo la fecha
          if (v.includes("T")) return v.split("T")[0];
          return v;
        }
        if (value instanceof Date) return value.toISOString().split("T")[0];
        return String(value);
      };

      const payload = {
        ...form,
        ruta_hex: rutaHex,
        vigente: !!form.vigente,
        fecha_inicio_vigencia: normalizeDate(form.fecha_inicio_vigencia),
        fecha_fin_vigencia: normalizeDate(form.fecha_fin_vigencia),
      };

      // Eliminar campos de fecha que quedaron como null para no enviar null/"" al backend
      ["fecha_inicio_vigencia", "fecha_fin_vigencia"].forEach((k) => {
        if (payload[k] === null) delete payload[k];
      });

      // Normalize geom: prefer sending a GeoJSON object. If there's no
      // geometry, remove the key so backend won't receive null/empty.
      if (!form.geom) {
        delete payload.geom;
      } else {
        try {
          payload.geom =
            typeof form.geom === "string" ? JSON.parse(form.geom) : form.geom;
        } catch (err) {
          console.warn("handleSubmit: failed to parse form.geom", err);
          payload.geom = form.geom;
        }
      }

      // Log para depuración: payload enviado
      console.debug("ItinerariosModal - payload:", payload);

      // Validación cliente: si estamos creando (no editKey) y ya existe un itinerario
      // con la misma fecha_inicio_vigencia, evitar el POST y avisar al usuario.
      if (!editKey) {
        const payloadDate = payload.fecha_inicio_vigencia;
        if (!payloadDate) {
          setMensaje("Debe completar Fecha inicio de vigencia antes de crear.");
          setLoading(false);
          return;
        }
        const exists = itinerarios.some((it) => {
          const itDate = it.fecha_inicio_vigencia
            ? it.fecha_inicio_vigencia.split("T")[0]
            : it.fecha_inicio_vigencia;
          return itDate === payloadDate;
        });
        if (exists) {
          // Encontrar el item en conflicto y guardarlo para ofrecer 'Editar existente'
          const conflict = itinerarios.find((it) => {
            const itDate = it.fecha_inicio_vigencia
              ? it.fecha_inicio_vigencia.split("T")[0]
              : it.fecha_inicio_vigencia;
            return itDate === payloadDate;
          });
          setConflictItem(conflict || null);
          setMensaje(
            "Ya existe un itinerario con esa fecha de inicio. Puedes editar el existente o cambiar la fecha."
          );
          setLoading(false);
          return;
        }
      }

      if (editKey) {
        method = "PUT";
        url = `${API_URL}/historico_itinerario/${rutaHex}/${encodeURIComponent(
          editKey.fecha_inicio_vigencia
        )}`;
      } else {
        method = "POST";
        url = `${API_URL}/historico_itinerario`;
      }

      // Send geom as-is (object or string). Backend accepts both formats.

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error response:", errorData);

        // Handle array of validation errors
        if (Array.isArray(errorData.detail)) {
          const errorMessages = errorData.detail
            .map(
              (err) =>
                `${err.loc ? err.loc.join(".") + ": " : ""}${
                  err.msg || JSON.stringify(err)
                }`
            )
            .join("\n");
          throw new Error(`Error de validación:\n${errorMessages}`);
        }

        // Handle single error object or string
        const errorMessage =
          errorData.detail?.msg ||
          errorData.detail ||
          JSON.stringify(errorData) ||
          `Error ${res.status} al guardar itinerario`;
        throw new Error(errorMessage);
      }

      setMensaje(editKey ? "Itinerario actualizado" : "Itinerario creado");
      handleCancelEdit();
      await fetchItinerarios();
    } catch (e) {
      const errorMessage = e.message || "Error al procesar la solicitud";
      setMensaje(errorMessage);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        formData: form,
        editKey,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(it) {
    if (!window.confirm("¿Eliminar este itinerario?")) return;
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_URL}/historico_itinerario/${rutaHex}/${encodeURIComponent(
          it.fecha_inicio_vigencia
        )}`,
        { method: 'DELETE' }
      );
      
      if (!res.ok) throw new Error('Error al eliminar el itinerario');
      
      setMensaje('Itinerario eliminado correctamente');
      fetchItinerarios();
    } catch (error) {
      console.error('Error al eliminar itinerario:', error);
      setMensaje('Error al eliminar el itinerario');
    } finally {
      setLoading(false);
    }
  }

  // Función para iniciar la edición de la geometría
  const handleEditGeometry = (itinerario) => {
    console.log('Iniciando edición de geometría:', itinerario);
    console.log('Geometría actual:', itinerario.geom);
    setEditingItinerary(itinerario);
    setShowMapEditor(true);
  };

  // Función para guardar la geometría editada
  const handleSaveGeometry = async (geoJSON) => {
    if (!editingItinerary) return;

    try {
      setLoading(true);
      const response = await authFetch(
        `${API_URL}/historico_itinerario/${editingItinerary.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geom: geoJSON })
        }
      );

      if (!response.ok) throw new Error('Error al guardar la geometría');
      
      setMensaje('Geometría actualizada correctamente');
      fetchItinerarios(); // Recargar la lista de itinerarios
    } catch (error) {
      console.error('Error al guardar la geometría:', error);
      setMensaje('Error al guardar la geometría');
    } finally {
      setLoading(false);
      setShowMapEditor(false);
      setEditingItinerary(null);
    }
  };

  // Función para cancelar la edición de geometría
  const handleCancelEditGeometry = () => {
    setShowMapEditor(false);
    setEditingItinerary(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: "95vw",
          maxWidth: 1400,
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 10,
            padding: "15px 20px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h3 style={{ margin: 0 }}>Itinerarios de la ruta {rutaHex}</h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {mensaje && (
            <div
              style={{
                color: mensaje.includes("Error") ? "#b71c1c" : "#388e3c",
                marginBottom: 15,
                padding: "10px",
                borderRadius: "4px",
                backgroundColor: mensaje.includes("Error")
                  ? "#ffebee"
                  : "#e8f5e9",
              }}
            >
              {mensaje.includes("\n") ? (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {mensaje}
                </pre>
              ) : (
                mensaje
              )}
            </div>
          )}

          {/* Draggable Analysis Dialog */}
          {showAnalysisDialog && analysisData && (
            <div
              id="analysis-dialog"
              style={{
                position: "fixed",
                left: 100,
                top: 100,
                width: 360,
                maxHeight: "60vh",
                overflowY: "auto",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: 6,
                boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
                zIndex: 9999,
                cursor: "move",
              }}
              onMouseDown={(e) => {
                const dialog = e.currentTarget;
                const startX = e.clientX;
                const startY = e.clientY;
                const origLeft = dialog.offsetLeft;
                const origTop = dialog.offsetTop;

                function onMouseMove(ev) {
                  dialog.style.left = origLeft + (ev.clientX - startX) + "px";
                  dialog.style.top = origTop + (ev.clientY - startY) + "px";
                }

                function onMouseUp() {
                  window.removeEventListener("mousemove", onMouseMove);
                  window.removeEventListener("mouseup", onMouseUp);
                }

                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <strong>Análisis del Recorrido</strong>
                <div>
                  <button
                    onClick={async () => {
                      const text = formatAnalysisForExport(analysisData) || "";
                      try {
                        await navigator.clipboard.writeText(text);
                        setMensaje("Análisis copiado al portapapeles");
                      } catch (e) {
                        console.error("Error al copiar:", e);
                        setMensaje("No se pudo copiar al portapapeles");
                      }
                    }}
                    className="btn-accion"
                    style={{ marginRight: 6 }}
                  >
                    Copiar Análisis
                  </button>
                  <button
                    onClick={() => {
                      const w = window.open(
                        "",
                        "_blank",
                        "width=600,height=600"
                      );
                      if (w) {
                        const html = `
                          <div style="font-family:inherit;padding:12px">
                            <h2>Análisis del Recorrido</h2>
                            <div><strong>Inicio:</strong>${formatLocationHTML(
                              analysisData.inicio?.ubicacion
                            )}
                            <div>Coordenadas: ${
                              analysisData.inicio?.coordenadas?.lat || ""
                            }, ${
                          analysisData.inicio?.coordenadas?.lon || ""
                        }</div>
                            </div>
                            <h3>Calles encontradas</h3>
                            <ul>
                              ${(analysisData.calles_recorrido || [])
                                .map(
                                  (c) =>
                                    `<li>${c.name} (cerca de ${c.lat},${c.lon})</li>`
                                )
                                .join("")}
                            </ul>
                            <div><strong>Fin:</strong>${formatLocationHTML(
                              analysisData.fin?.ubicacion
                            )}
                            <div>Coordenadas: ${
                              analysisData.fin?.coordenadas?.lat || ""
                            }, ${analysisData.fin?.coordenadas?.lon || ""}</div>
                            </div>
                          </div>
                        `;
                        w.document.write(
                          `<html><head><title>Análisis del Recorrido</title></head><body>${html}</body></html>`
                        );
                        w.document.close();
                      }
                    }}
                    className="btn-accion"
                    style={{ marginRight: 6 }}
                  >
                    Abrir en ventana
                  </button>
                  <button
                    onClick={() => setShowAnalysisDialog(false)}
                    style={{ border: "none", background: "none" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ padding: 10, fontSize: 13 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Inicio:</strong>
                  <div>
                    {mapLocation(analysisData.inicio?.ubicacion)}
                    <div>
                      Coordenadas: {analysisData.inicio?.coordenadas?.lat},{" "}
                      {analysisData.inicio?.coordenadas?.lon}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong>Calles encontradas:</strong>
                  <ul>
                    {(analysisData.calles_recorrido || []).map((c, i) => (
                      <li key={i}>
                        {c.name} (cerca de {c.lat},{c.lon})
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong>Fin:</strong>
                  <div>
                    {mapLocation(analysisData.fin?.ubicacion)}
                    <div>
                      Coordenadas: {analysisData.fin?.coordenadas?.lat},{" "}
                      {analysisData.fin?.coordenadas?.lon}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla con filtros */}
          <div style={{ marginBottom: "20px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "white",
                  zIndex: 10,
                  boxShadow: "0 2px 3px rgba(0,0,0,0.1)",
                }}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{
                          padding: "8px",
                          textAlign: "left",
                          borderBottom: "1px solid #ddd",
                          minWidth: "150px",
                        }}
                      >
                        <div>{header.column.columnDef.header}</div>
                        {header.column.getCanFilter() ? (
                          <div>
                            {flexRender(
                              header.column.columnDef.Filter,
                              header.getContext()
                            )}
                          </div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: "8px",
                          verticalAlign: "middle",
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={table.getAllColumns().length}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#666",
                        fontStyle: "italic",
                      }}
                    >
                      No hay datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              marginBottom: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "15px",
              alignItems: "end",
              padding: "15px",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                Fecha inicio vigencia *
              </label>
              <input
                name="fecha_inicio_vigencia"
                type="date"
                required
                value={form.fecha_inicio_vigencia}
                onChange={handleChange}
                disabled={!!editKey}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                Fecha fin vigencia
              </label>
              <input
                name="fecha_fin_vigencia"
                type="date"
                value={form.fecha_fin_vigencia || ""}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                Cargar Shapefile (.shp)
              </label>
              <input
                ref={fileInputRef}
                name="shapefile"
                type="file"
                accept=".shp,.dbf,.shx,.zip"
                multiple
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
              <div
                style={{ fontSize: "0.8em", color: "#666", marginTop: "5px" }}
              >
                {file
                  ? file instanceof FileList || Array.isArray(file)
                    ? `Archivos seleccionados: ${file.length}`
                    : `Archivo seleccionado: ${file.name}`
                  : "Seleccione un archivo .shp o .zip (o .shp + .dbf [+ .shx])"}
              </div>
              {form.geom && (
                <div style={{ marginTop: "10px" }}>
                  <div
                    style={{
                      fontSize: "0.8em",
                      color: "#388e3c",
                      marginBottom: "5px",
                    }}
                  >
                    ✓ GeoJSON generado correctamente
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const geo =
                          typeof form.geom === "string"
                            ? JSON.parse(form.geom)
                            : form.geom;
                        const blob = new Blob([JSON.stringify(geo, null, 2)], {
                          type: "application/json",
                        });
                        saveAs(blob, "geometria.json");
                      } catch (err) {
                        console.error("Error al descargar GeoJSON:", err);
                        setMensaje("Error al descargar GeoJSON");
                      }
                    }}
                    style={{
                      background: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "0.8em",
                    }}
                  >
                    Ver GeoJSON
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                id="vigente"
                name="vigente"
                type="checkbox"
                checked={form.vigente}
                onChange={handleChange}
                style={{ width: "18px", height: "18px" }}
              />
              <label htmlFor="vigente" style={{ fontWeight: "500" }}>
                Vigente
              </label>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                Observación
              </label>
              <input
                name="observacion"
                type="text"
                value={form.observacion || ""}
                onChange={handleChange}
                style={{
                  //width: "100%",
                  padding: "8px",
                  //hacer más ancho, de 340px a 100%
                  width: "340px",
                  height: "100px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", gridColumn: "1 / -1" }}>
              <button
                type="submit"
                className="btn-accion btn-editar"
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {editKey ? "Actualizar" : "Crear"}
              </button>

              {editKey && (
                <button
                  type="button"
                  className="btn-accion btn-eliminar"
                  onClick={handleCancelEdit}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
            {/* UI para conflicto cuando fecha ya existe */}
            {conflictItem && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "10px",
                  border: "1px solid #ffcc80",
                  background: "#fff8e1",
                  borderRadius: 4,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  Existe un itinerario con la misma fecha:{" "}
                  <strong>
                    {conflictItem.fecha_inicio_vigencia?.split("T")[0]}
                  </strong>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn-accion btn-editar"
                    onClick={() => {
                      // Cargar el item en modo edición
                      handleEdit(conflictItem);
                      setConflictItem(null);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                    }}
                  >
                    Editar existente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConflictItem(null);
                      setMensaje("");
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#e0e0e0",
                      border: "none",
                      borderRadius: 4,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* La lista detallada fue removida porque ahora la tabla con filtros de react-table
        renderiza los mismos datos arriba. Se conserva el formulario y la tabla filtrable. */}

          {/* Modal para edición de geometría */}
          {showMapEditor && editingItinerary && (
            <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div 
                className="modal" 
                style={{
                  width: '90vw',
                  maxWidth: '1200px',
                  height: '80vh',
                  maxHeight: '800px',
                  padding: '20px',
                  position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Editar Ruta del Itinerario</h3>
                <div style={{ height: 'calc(100% - 60px)', marginTop: '15px' }}>
                  <MapEditor 
                    initialRoute={editingItinerary.geom}
                    onSave={handleSaveGeometry}
                    onCancel={handleCancelEditGeometry}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
