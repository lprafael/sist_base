/** Formatea un número como Guaraníes paraguayos */
export function formatGs(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formatea hora: "14:30" */
export function formatHour(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Formatea fecha legible: "Lunes 11 de Mayo" */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Calcula el precio total de una reserva */
export function calcularPrecio(precioHora: number, inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const inicioDate = new Date(inicio);
  const finDate = new Date(fin);
  const horas = (finDate.getTime() - inicioDate.getTime()) / 3600000;
  return Math.round(precioHora * horas);
}

/** Genera un rango de horas del día */
export function generarHorasDelDia(apertura = 7, cierre = 23): number[] {
  const horas = [];
  for (let h = apertura; h <= cierre; h++) horas.push(h);
  return horas;
}

/** Devuelve el color de fondo de una reserva según su estado */
export function getBookingBgColor(estado: string, canchaColor: string): string {
  if (estado === 'cancelada') return '#374151';
  if (estado === 'en_curso') return canchaColor;
  if (estado === 'finalizada') return '#374151';
  return canchaColor;
}

/** Devuelve la opacidad de la reserva según estado */
export function getBookingOpacity(estado: string): number {
  if (estado === 'cancelada' || estado === 'finalizada') return 0.5;
  if (estado === 'pendiente') return 0.75;
  return 1;
}
