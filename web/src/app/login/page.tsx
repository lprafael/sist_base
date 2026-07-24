'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/torneos/login');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#ffffff',
      fontFamily: 'sans-serif'
    }}>
      <p>Redirigiendo al portal de acceso...</p>
    </div>
  );
}
