export const MAX_FOTOS_PARTICULAR = 8;

export const API_URL = import.meta.env.VITE_REACT_APP_API_URL || "/api";
export const DEFAULT_WA =
  import.meta.env.VITE_PUBLIC_WHATSAPP?.replace(/\D/g, "") || "595981431983";

export const FILTROS_VACIOS = {
  id_playa: "",
  solo_particulares: false,
  marca: "",
  modelo: "",
  año_desde: "",
  año_hasta: "",
  combustible: "",
  transmision: "",
  color: "",
};

export const añoVehiculo = (v) => v.anho_fabricacion ?? v.año ?? v["año"];

/** La API a veces serializa relaciones distinto; evitamos .filter/.some sobre no-arrays. */
export const imagenesLista = (v) => {
  const x = v?.imagenes;
  return Array.isArray(x) ? x : [];
};

export const precioMostrar = (v) => {
  const n =
    v.precio_contado_sugerido ??
    v.precio_venta_minimo ??
    v.costo_final ??
    v.costo_base;
  if (n == null) return null;
  const num = typeof n === "string" ? parseFloat(n) : Number(n);
  if (Number.isNaN(num)) return null;
  return num;
};

export const getFullImageUrl = (img) => {
  if (!img || !img.imagen_con_marca) return null;
  const baseUrl = import.meta.env.VITE_REACT_APP_API_URL?.replace("/api", "") || "";
  return `${baseUrl}${img.imagen_con_marca}`;
};

export const formatPrice = (price) => {
  if (price == null) return "Consultar";
  try {
    return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG" }).format(price);
  } catch (e) {
    console.error("Error formatting price:", e);
    return `Gs. ${Number(price).toLocaleString('es-PY')}`;
  }
};

export const telParticular = (vehicle) => {
  const obs = vehicle.observaciones || "";
  const m = obs.match(/Tel:\s*([+\d\s\-]+)/i);
  if (m) return m[1].replace(/\D/g, "");
  return DEFAULT_WA;
};
