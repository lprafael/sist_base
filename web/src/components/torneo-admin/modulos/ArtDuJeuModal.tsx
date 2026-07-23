import React, { useState, useRef } from 'react';
import { ArrowLeft, Image as ImageIcon, Download } from 'lucide-react';

export default function ArtDuJeuModal({ match, onClose }: { match: any, onClose: () => void }) {
  const [opcion, setOpcion] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [equipo1, setEquipo1] = useState(match.jugador_local_nombre || match.local_nombre || 'Equipo 1');
  const [equipo2, setEquipo2] = useState(match.jugador_visitante_nombre || match.visitante_nombre || 'Equipo 2');
  const [goles1, setGoles1] = useState(match.goles_local ?? 3);
  const [goles2, setGoles2] = useState(match.goles_visitante ?? 1);

  const [titulo, setTitulo] = useState(match.titulo || 'Copa de Campeones 2026');
  const [subtitulo, setSubtitulo] = useState('Fase de Grupos — Fecha 1');
  const [direccion, setDirección] = useState(match.cancha || 'Cancha Central - Complejo Deportivo');
  const [diaSemana, setDiaSemana] = useState('Sábado');
  const [fecha, setFecha] = useState('25 de Julio');
  const [hora, setHora] = useState('18:00 Hs');

  // ─── Canvas Drawing Functions ───────────────────────────────────────────────

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const renderCanvas = (): HTMLCanvasElement => {
    const SIZE = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;

    if (opcion === 1) drawTemplate1(ctx, SIZE);
    else if (opcion === 2) drawTemplate2(ctx, SIZE);
    else drawTemplate3(ctx, SIZE);

    return canvas;
  };

  // ─── TEMPLATE 1: Dark Blue Stadium ─────────────────────────────────────────
  const drawTemplate1 = (ctx: CanvasRenderingContext2D, S: number) => {
    // Background gradient
    const bg = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.75);
    bg.addColorStop(0, '#1e3a8a');
    bg.addColorStop(0.6, '#0f172a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Stadium circle
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Midfield line
    ctx.beginPath();
    ctx.moveTo(0, S / 2);
    ctx.lineTo(S, S / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Grass footer
    const grassGrad = ctx.createLinearGradient(0, S - 80, 0, S);
    grassGrad.addColorStop(0, 'transparent');
    grassGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, S - 80, S, 80);

    // Title pill
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    drawRoundedRect(ctx, S / 2 - 240, 60, 480, 54, 27);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, S / 2 - 240, 60, 480, 54, 27);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(titulo.toUpperCase(), S / 2, 95);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(subtitulo, S / 2, 145);

    // Team 1 Shield
    const shield1Grad = ctx.createLinearGradient(160, 330, 160, 570);
    shield1Grad.addColorStop(0, '#f97316');
    shield1Grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = shield1Grad;
    drawRoundedRect(ctx, 90, 330, 140, 200, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, 90, 330, 140, 200, 24);
    ctx.stroke();
    ctx.font = '70px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', 160, 450);

    // Team 1 name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 26px system-ui';
    const t1Lines = wrapText(ctx, equipo1, 220);
    t1Lines.forEach((line, i) => ctx.fillText(line, 160, 555 + i * 32));

    // Team 2 Shield
    const shield2Grad = ctx.createLinearGradient(S - 160, 330, S - 160, 570);
    shield2Grad.addColorStop(0, '#f97316');
    shield2Grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = shield2Grad;
    drawRoundedRect(ctx, S - 230, 330, 140, 200, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, S - 230, 330, 140, 200, 24);
    ctx.stroke();
    ctx.font = '70px serif';
    ctx.fillText('⚽', S - 160, 450);

    // Team 2 name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 26px system-ui';
    const t2Lines = wrapText(ctx, equipo2, 220);
    t2Lines.forEach((line, i) => ctx.fillText(line, S - 160, 555 + i * 32));

    // Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 200px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 25;
    ctx.fillText(`${goles1}`, S / 2 - 110, 530);
    ctx.fillText(`${goles2}`, S / 2 + 110, 530);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic bold 50px system-ui';
    ctx.fillText('vs', S / 2, 480);

    // Yellow bar
    ctx.fillStyle = '#e2dc08';
    ctx.beginPath();
    ctx.roundRect(S / 2 - 60, 620, 120, 12, 6);
    ctx.fill();

    // Footer
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${direccion}`, 60, 700);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(`📅 ${diaSemana} ${fecha} — ${hora}`, 60, 730);

    // Ball icon
    ctx.font = '60px serif';
    ctx.textAlign = 'right';
    ctx.fillText('⚽', S - 60, 730);
  };

  // ─── TEMPLATE 2: Green Tropical ────────────────────────────────────────────
  const drawTemplate2 = (ctx: CanvasRenderingContext2D, S: number) => {
    // Background
    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, '#064e3b');
    bg.addColorStop(0.5, '#022c22');
    bg.addColorStop(1, '#011a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Stripe pattern
    for (let x = 0; x < S; x += 80) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(x, 0, 2, S);
    }

    // Top glow
    const glow = ctx.createRadialGradient(S / 2, -50, 0, S / 2, -50, 600);
    glow.addColorStop(0, 'rgba(52,211,153,0.25)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);

    // Title
    ctx.fillStyle = '#065f46';
    drawRoundedRect(ctx, S / 2 - 220, 55, 440, 54, 27);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, S / 2 - 220, 55, 440, 54, 27);
    ctx.stroke();
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(titulo.toUpperCase(), S / 2, 90);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(subtitulo, S / 2, 145);

    // Team 1 circle
    const c1 = ctx.createRadialGradient(190, 430, 0, 190, 430, 130);
    c1.addColorStop(0, '#047857');
    c1.addColorStop(1, '#064e3b');
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.arc(190, 430, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.font = '90px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', 190, 465);

    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 26px system-ui';
    const t1Lines = wrapText(ctx, equipo1, 260);
    t1Lines.forEach((line, i) => ctx.fillText(line, 190, 590 + i * 32));

    // Team 2 circle
    const c2 = ctx.createRadialGradient(S - 190, 430, 0, S - 190, 430, 130);
    c2.addColorStop(0, '#047857');
    c2.addColorStop(1, '#064e3b');
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.arc(S - 190, 430, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.font = '90px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', S - 190, 465);

    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 26px system-ui';
    const t2Lines = wrapText(ctx, equipo2, 260);
    t2Lines.forEach((line, i) => ctx.fillText(line, S - 190, 590 + i * 32));

    // Score center — HORIZONTAL: goles1 [VS] goles2
    ctx.shadowColor = 'rgba(52,211,153,0.5)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 180px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${goles1}`, S / 2 - 130, 510);
    ctx.fillText(`${goles2}`, S / 2 + 130, 510);
    ctx.shadowBlur = 0;

    // VS separator
    ctx.fillStyle = '#34d399';
    ctx.fillRect(S / 2 - 40, 430, 80, 4);
    ctx.fillRect(S / 2 - 40, 530, 80, 4);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 32px system-ui';
    ctx.fillText('VS', S / 2, 490);

    // Footer
    ctx.strokeStyle = 'rgba(52,211,153,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 710);
    ctx.lineTo(S - 60, 710);
    ctx.stroke();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${direccion}`, 60, 745);
    ctx.fillText(`📅 ${diaSemana} ${fecha} — ${hora}`, 60, 775);

    ctx.fillStyle = '#065f46';
    drawRoundedRect(ctx, S - 280, 730, 220, 52, 12);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, S - 280, 730, 220, 52, 12);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ RESULTADO FINAL', S - 170, 762);
  };

  // ─── TEMPLATE 3: Red Copa / Gold ───────────────────────────────────────────
  const drawTemplate3 = (ctx: CanvasRenderingContext2D, S: number) => {
    // Background
    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, '#7f1d1d');
    bg.addColorStop(0.5, '#450a0a');
    bg.addColorStop(1, '#1c0606');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Top bar
    const topBar = ctx.createLinearGradient(0, 0, S, 0);
    topBar.addColorStop(0, '#b91c1c');
    topBar.addColorStop(0.5, '#dc2626');
    topBar.addColorStop(1, '#b91c1c');
    ctx.fillStyle = topBar;
    ctx.fillRect(0, 0, S, 100);

    // Title in top bar
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(subtitulo.toUpperCase(), 60, 58);

    // Pill in top bar
    ctx.fillStyle = '#fbbf24';
    drawRoundedRect(ctx, S - 340, 22, 280, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#1c0606';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(titulo, S - 200, 54);

    // Team 1 circle
    const c1 = ctx.createRadialGradient(210, 430, 0, 210, 430, 140);
    c1.addColorStop(0, '#dc2626');
    c1.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.arc(210, 430, 140, 0, Math.PI * 2);
    ctx.fill();
    // Outer glow ring
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 7;
    ctx.stroke();
    // Inner ring
    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.font = '90px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', 210, 465);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px system-ui';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    const t1Lines = wrapText(ctx, equipo1, 280);
    t1Lines.forEach((line, i) => ctx.fillText(line, 210, 610 + i * 34));
    ctx.shadowBlur = 0;

    // Team 2 circle
    const c2 = ctx.createRadialGradient(S - 210, 430, 0, S - 210, 430, 140);
    c2.addColorStop(0, '#dc2626');
    c2.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.arc(S - 210, 430, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.font = '90px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', S - 210, 465);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px system-ui';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    const t2Lines = wrapText(ctx, equipo2, 280);
    t2Lines.forEach((line, i) => ctx.fillText(line, S - 210, 610 + i * 34));
    ctx.shadowBlur = 0;

    // Score center
    ctx.shadowColor = 'rgba(251,191,36,0.4)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 190px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${goles1}`, S / 2 - 100, 490);
    ctx.fillText(`${goles2}`, S / 2 + 100, 490);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 80px system-ui';
    ctx.fillText(':', S / 2, 480);

    // RESULTADO FINAL tag
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    drawRoundedRect(ctx, S / 2 - 160, 520, 320, 52, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.4)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, S / 2 - 160, 520, 320, 52, 26);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('⚽  RESULTADO FINAL', S / 2, 553);

    // Gold divider line
    const goldLine = ctx.createLinearGradient(0, 700, S, 700);
    goldLine.addColorStop(0, 'transparent');
    goldLine.addColorStop(0.5, '#fbbf24');
    goldLine.addColorStop(1, 'transparent');
    ctx.strokeStyle = goldLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 700);
    ctx.lineTo(S - 60, 700);
    ctx.stroke();

    // Footer bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 715, S, S - 715);

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${direccion}`, 60, 760);
    ctx.fillText(`📅 ${diaSemana} ${fecha} — ${hora}`, 60, 792);

    ctx.font = '70px serif';
    ctx.textAlign = 'right';
    ctx.fillText('🏆', S - 55, 795);
  };

  // ─── Export as PNG Image ────────────────────────────────────────────────────
  const handleExportImage = () => {
    const canvas = renderCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    // Open as a raw PNG in a new tab — browser shows the image natively
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Arte del Juego — ${equipo1} vs ${equipo2}</title>
      <style>
        * { margin: 0; padding: 0; }
        body { background: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        img { max-width: 100%; max-height: 100vh; display: block; border-radius: 12px; box-shadow: 0 30px 60px rgba(0,0,0,0.8); }
      </style></head>
      <body><img src="${dataUrl}" alt="${equipo1} vs ${equipo2}" /></body></html>
    `);
    win.document.close();
  };

  const handleDownloadImage = () => {
    const canvas = renderCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `arte-del-juego-${equipo1}-vs-${equipo2}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Preview Panels ──────────────────────────────────────────────────────────

  const PreviewOption1 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between p-5 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 pointer-events-none" />
      <div className="relative z-10 text-center">
        <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">{titulo}</span>
        <div className="text-[10px] font-bold text-slate-400 mt-1">{subtitulo}</div>
      </div>
      <div className="relative z-10 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-20 bg-gradient-to-b from-orange-500 to-red-700 rounded-xl border-2 border-white/80 flex items-center justify-center text-2xl shadow-lg">⚽</div>
          <span className="text-[9px] font-extrabold text-white text-center max-w-[80px] truncate">{equipo1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-5xl font-black text-white">{goles1}</span>
          <span className="text-base font-bold text-slate-400 italic">vs</span>
          <span className="text-5xl font-black text-white">{goles2}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-20 bg-gradient-to-b from-orange-500 to-red-700 rounded-xl border-2 border-white/80 flex items-center justify-center text-2xl shadow-lg">⚽</div>
          <span className="text-[9px] font-extrabold text-white text-center max-w-[80px] truncate">{equipo2}</span>
        </div>
      </div>
      <div className="relative z-10 w-10 h-1 bg-yellow-400 rounded-full mx-auto" />
      <div className="relative z-10 flex justify-between items-end text-white text-[9px] font-bold">
        <div><div>📍 {direccion.substring(0, 30)}</div><div className="text-slate-400">📅 {diaSemana} {fecha}</div></div>
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg">⚽</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-emerald-600 to-transparent" />
    </div>
  );

  const PreviewOption2 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-emerald-400/30 flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-900 via-green-950 to-slate-950">
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(90deg, white 0px, white 1px, transparent 1px, transparent 30px)' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 bg-emerald-400/10 rounded-full blur-2xl" />
      <div className="relative z-10 text-center">
        <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-900 px-3 py-1 rounded-full border border-emerald-600">{titulo}</span>
        <div className="text-[10px] font-bold text-emerald-300 mt-1">{subtitulo}</div>
      </div>
      <div className="relative z-10 flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-2 w-24">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-700 to-green-900 border-4 border-emerald-400 flex items-center justify-center text-3xl shadow-lg">⚽</div>
          <span className="text-[9px] font-extrabold text-green-100 text-center">{equipo1}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">{goles1}</span>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-5 h-0.5 bg-emerald-400 rounded" />
              <span className="text-[10px] font-black text-emerald-400">VS</span>
              <div className="w-5 h-0.5 bg-emerald-400 rounded" />
            </div>
            <span className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">{goles2}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 w-24">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-700 to-green-900 border-4 border-emerald-400 flex items-center justify-center text-3xl shadow-lg">⚽</div>
          <span className="text-[9px] font-extrabold text-green-100 text-center">{equipo2}</span>
        </div>
      </div>
      <div className="relative z-10 border-t border-emerald-700/50 pt-2 flex justify-between items-center">
        <div className="text-emerald-300 text-[9px] font-bold"><div>📍 {direccion.substring(0, 28)}</div><div>📅 {diaSemana} {fecha}</div></div>
        <div className="bg-emerald-900 border border-emerald-500 rounded-lg px-2 py-1 text-emerald-400 text-[9px] font-black">⚽ RESULTADO</div>
      </div>
    </div>
  );

  const PreviewOption3 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-red-800/50 flex flex-col bg-gradient-to-br from-red-900 via-red-950 to-slate-950">
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 px-4 py-2 flex justify-between items-center flex-shrink-0">
        <span className="text-[9px] font-black tracking-widest text-red-100 uppercase">{subtitulo}</span>
        <span className="bg-amber-400 text-red-900 font-black text-[9px] px-3 py-0.5 rounded-full">{titulo}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 py-2 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="w-18 h-18 rounded-full bg-gradient-to-br from-red-600 to-red-900 border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl p-3">⚽</div>
            <span className="text-[9px] font-extrabold text-white text-center">{equipo1}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-5xl font-black text-amber-400">{goles1}</span>
              <span className="text-2xl text-white/40 font-black">:</span>
              <span className="text-5xl font-black text-amber-400">{goles2}</span>
            </div>
            <div className="text-[8px] font-black text-amber-400/80 border border-amber-400/40 px-2 py-0.5 rounded-full">⚽ RESULTADO FINAL</div>
          </div>
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="w-18 h-18 rounded-full bg-gradient-to-br from-red-600 to-red-900 border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl p-3">⚽</div>
            <span className="text-[9px] font-extrabold text-white text-center">{equipo2}</span>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-6" />
      <div className="bg-black/40 border-t border-amber-400/20 px-4 py-2 flex justify-between items-center flex-shrink-0">
        <div className="text-red-300 text-[9px] font-bold"><div>📍 {direccion.substring(0, 28)}</div><div>📅 {diaSemana} {fecha}</div></div>
        <span className="text-3xl">🏆</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eeebf5] border border-indigo-200 text-slate-800 w-full max-w-xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* TOP NAVBAR */}
        <div className="bg-[#191942] text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-wide">Arte del juego</span>
          <div className="flex gap-2">
            <button onClick={handleExportImage} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Ver imagen PNG en nueva pestaña">
              <ImageIcon size={18} />
            </button>
            <button onClick={handleDownloadImage} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Descargar imagen PNG">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* OPTIONS PRESETS */}
          <div className="flex gap-2">
            {[
              { num: 1, label: 'Opción 1', desc: 'Azul Clásico' },
              { num: 2, label: 'Opción 2', desc: 'Verde Vibrante' },
              { num: 3, label: 'Opción 3', desc: 'Rojo Copa' },
            ].map(({ num, label, desc }) => (
              <button
                key={num}
                onClick={() => setOpcion(num)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold border transition flex flex-col items-center gap-0.5 ${
                  opcion === num
                    ? 'bg-[#191942] text-white border-indigo-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[9px] font-medium ${opcion === num ? 'text-indigo-300' : 'text-slate-400'}`}>{desc}</span>
              </button>
            ))}
          </div>

          {/* LIVE PREVIEW */}
          {opcion === 1 && <PreviewOption1 />}
          {opcion === 2 && <PreviewOption2 />}
          {opcion === 3 && <PreviewOption3 />}

          {/* FORM INPUTS */}
          <div className="space-y-3 pt-2">

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Nombre del equipo 1</label>
              <input type="text" value={equipo1} onChange={e => setEquipo1(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Nombre del equipo 2</label>
              <input type="text" value={equipo2} onChange={e => setEquipo2(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Goles Local</label>
                <input type="number" min={0} value={goles1} onChange={e => setGoles1(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative flex-1">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Goles Visitante</label>
                <input type="number" min={0} value={goles2} onChange={e => setGoles2(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Título del campeonato</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Subtítulo (Fase / Jornada)</label>
              <input type="text" value={subtitulo} onChange={e => setSubtitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Dirección / Cancha</label>
              <input type="text" value={direccion} onChange={e => setDirección(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Día</label>
                <input type="text" value={diaSemana} onChange={e => setDiaSemana(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Fecha</label>
                <input type="text" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Hora</label>
                <input type="text" value={hora} onChange={e => setHora(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
            </div>

          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-300 bg-[#eeebf5] grid grid-cols-2 gap-2">
          <button
            onClick={handleExportImage}
            className="bg-[#191942] hover:bg-indigo-800 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <ImageIcon size={15} /> Ver imagen PNG
          </button>
          <button
            onClick={handleDownloadImage}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <Download size={15} /> Descargar PNG
          </button>
        </div>

      </div>
    </div>
  );
}
