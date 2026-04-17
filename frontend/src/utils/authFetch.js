// authFetch.js
// Helper para fetch que maneja autenticación JWT y refresco de token

export async function authFetch(url, options = {}) {
  // Obtener el token actual
  let token = localStorage.getItem('token');

  // Configurar headers iniciales
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // Obtener la URL base del entorno
  const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';

  // Evitar duplicación de /api si ya viene en la URL base y en el endpoint
  let baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  let endpoint = url;
  
  // Limpieza agresiva de prefijos duplicados
  if (baseUrl.endsWith('/api') && endpoint.startsWith('/api')) {
      // Si ambos tienen /api, lo removemos del endpoint para que al unir no se duplique
      endpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : (endpoint === '/api' ? '' : endpoint);
  }

  // Asegurarse de que la URL sea completa para la App móvil
  let requestUrl = url.startsWith('http') ? url : 
    `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Doble check: si por alguna razón quedó /api/api, lo corregimos
  if (requestUrl.includes('/api/api/')) {
      requestUrl = requestUrl.replace('/api/api/', '/api/');
  }

  // Realizar la petición
  let response = await fetch(requestUrl, { ...options, headers });

  // Si recibimos 401, intentar refrescar el token
  if (response.status === 401) {
    try {
      // Intentar refrescar el token
      const refreshToken = localStorage.getItem('refreshToken');
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
          localStorage.setItem('token', access_token);
          if (refresh_token) {
            localStorage.setItem('refreshToken', refresh_token);
          }

          // Reintentar la petición original con el nuevo token
          headers['Authorization'] = `Bearer ${access_token}`;
          response = await fetch(requestUrl, { ...options, headers });

        } else {
          // Si el refresh falla, limpiar y redirigir a login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
        }
      } else {
        // No hay refresh token disponible
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
      }
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
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
