export default function ReservaExitosaPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060912', color: '#fff', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>¡Reserva confirmada!</h1>
      <p style={{ color: '#94A3B8', fontSize: 16 }}>Tu turno ha sido registrado correctamente.</p>
      <p style={{ color: '#94A3B8', fontSize: 14 }}>El complejo se pondrá en contacto contigo.</p>
      <a href="/" style={{ padding: '12px 28px', background: '#00D084', color: '#000', borderRadius: 100, fontWeight: 700, textDecoration: 'none', marginTop: 16 }}>Reservar otra cancha</a>
    </div>
  );
}
