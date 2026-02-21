// authFetch.js
// Helper para fetch que maneja autenticación JWT y refresco de token

export async function authFetch(url, options = {}) {
  // Obtener el token actual
  let token = sessionStorage.getItem('token');

  // Configurar headers iniciales
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // Asegurarse de que la URL sea relativa para usar el proxy
  const requestUrl = url.startsWith('http') ? url :
    (url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`);

  // Realizar la petición
  let response = await fetch(requestUrl, { ...options, headers });

  // Si recibimos 401, intentar refrescar el token
  if (response.status === 401) {
    try {
      // Intentar refrescar el token
      const refreshToken = sessionStorage.getItem('refreshToken');
      if (refreshToken) {
        // Usar ruta relativa para el proxy
        const refreshResponse = await fetch(`/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        });

        if (refreshResponse.ok) {
          const { access_token, refresh_token } = await refreshResponse.json();

          // Actualizar tokens
          sessionStorage.setItem('token', access_token);
          if (refresh_token) {
            sessionStorage.setItem('refreshToken', refresh_token);
          }

          // Reintentar la petición original con el nuevo token
          headers['Authorization'] = `Bearer ${access_token}`;
          response = await fetch(requestUrl, { ...options, headers });
        } else {
          // Si el refresh falla, limpiar y redirigir a login
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
        }
      } else {
        // No hay refresh token disponible
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
      }
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Error de autenticación. Por favor inicia sesión nuevamente.'));
    }
  }

  // Si hay un error diferente a 401, manejarlo
  if (!response.ok) {
    // No leer el body aquí, dejar que el código que llama a authFetch lo maneje
    const error = new Error(`Error ${response.status}: ${response.statusText}`);
    error.response = response;
    error.status = response.status;
    throw error;
  }

  return response;
}
