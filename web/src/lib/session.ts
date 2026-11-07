// Acceso a la sesión guardada por el login (localStorage "user_session").

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const s = JSON.parse(localStorage.getItem("user_session") || "{}");
    return s.access_token || s.token || "";
  } catch {
    return "";
  }
}

/** Cabeceras con el token de sesión (más las que se pasen). */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
