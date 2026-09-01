'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

function LichessCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMsg(errorDescription || error || 'Autorización cancelada o denegada');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('No se recibió código de autorización de Lichess.');
      return;
    }

    const savedState = sessionStorage.getItem('lichess_oauth_state');
    const codeVerifier = sessionStorage.getItem('lichess_oauth_verifier');
    const redirectUri = sessionStorage.getItem('lichess_oauth_redirect_uri') || `${window.location.origin}/auth/lichess/callback`;

    if (savedState && state && savedState !== state) {
      setStatus('error');
      setErrorMsg('El parámetro state no coincide. Posible ataque CSRF.');
      return;
    }

    if (!codeVerifier) {
      setStatus('error');
      setErrorMsg('No se encontró el verificador de código (code_verifier) en la sesión.');
      return;
    }

    // Intercambiar código por token y datos de usuario en backend
    fetch(`${API_URL}/api/ajedrez/lichess/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: 'micancha'
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Error al conectar con Lichess');
        }
        setUserData(data);
        setStatus('success');

        // Si fue abierto en un popup, notificar a la ventana principal
        if (window.opener) {
          window.opener.postMessage({ type: 'LICHESS_OAUTH_SUCCESS', user: data }, '*');
          setTimeout(() => {
            window.close();
          }, 1200);
        } else {
          // Si no es popup, guardar en sessionStorage y regresar
          sessionStorage.setItem('lichess_connected_user', JSON.stringify(data));
          const returnUrl = sessionStorage.getItem('lichess_oauth_return_url') || '/';
          setTimeout(() => {
            window.location.href = returnUrl;
          }, 1500);
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Error durante la autenticación');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="text-xl font-bold">Conectando con Lichess...</h2>
            <p className="text-xs text-slate-400">Verificando credenciales y obteniendo perfil oficial.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-emerald-300">¡Conexión Exitosa!</h2>
            <p className="text-xs text-slate-300">
              Bienvenido, <strong>@{userData?.username}</strong>. Volviendo al formulario...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-red-400">Error de Conexión</h2>
            <p className="text-xs text-slate-300">{errorMsg}</p>
            <button
              onClick={() => {
                if (window.opener) window.close();
                else window.history.back();
              }}
              className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LichessCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin" size={32} />
      </div>
    }>
      <LichessCallbackContent />
    </Suspense>
  );
}
