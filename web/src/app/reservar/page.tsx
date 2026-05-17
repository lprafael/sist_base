export default function ReservarPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060912', color: '#fff', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>📅</div>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Reservar cancha</h1>
      <p style={{ color: '#94A3B8' }}>Usá el botón &quot;Reservar&quot; desde la pantalla principal</p>
      <a href="/#canchas" style={{ padding: '10px 24px', background: '#00D084', color: '#000', borderRadius: 100, fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>Ver canchas →</a>
    </div>
  );
}
