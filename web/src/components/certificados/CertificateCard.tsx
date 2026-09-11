"use client";
import React from 'react';
import { Reconocimiento } from '@/app/admin-futbol/reconocimientos/page';

export interface CertificateCardProps {
  data: Reconocimiento;
  isPrintMode?: boolean;
  torneo?: any;
}

// =========================================================================
// PRESETS DE TEXTO RÁPIDO (INCLUYE LOS 3 NUEVOS MODELOS EXACTOS DE LAS FOTOS)
// =========================================================================
export const PRESETS_TEXTO = [
  // --- LOS 3 NUEVOS MODELOS AUTÉNTICOS SEIGOKAN ---
  {
    nombre: "🥋 1. Pergamino de Honor Marcial (Sensei / Maestro)",
    titulo: "Reconocimiento y Honor a",
    subtitulo: "KARATE DO GO JU RYU",
    destinatario: "Sensei ROBERTO TAKESHI FUKOCHI",
    texto: "Por sus incontables años de dedicación inquebrantable, pasión y sabiduría en la enseñanza y difusión del KARATE DO GO JU RYU, como pilar fundamental de la ASOCIACIÓN SEIGOKAN DE KARATE DO. Este pergamino certifica la gratitud profunda de sus estudiantes y la comunidad marcial. Su legado de rectitud y maestría perdurará.",
    otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
    ciudad_fecha: "Dada en Ciudad del Este, Paraguay. Noviembre 2026.",
    nombre_firmante: "Sensei Jorge Salgado Castillo",
    cargo_firmante: "Representación Seigokan Paraguay",
    plantilla: "pergamino_marcial"
  },
  {
    nombre: "🥋 2. Certificado de Participación de Torneo (Azul Marino y Oro)",
    titulo: "CERTIFICADO DE PARTICIPACIÓN",
    subtitulo: "XIII Torneo Seigokan Go Ju Ryu Karate Do",
    destinatario: "Sensei Jorge Salgado Castillo",
    texto: "La Escuela Seigokan otorga este presente Certificado por su valiosa participación en el XIII Torneo Seigokan Go Ju Ryu Karate Do realizado en noviembre de 2026.",
    otorgado_por: "ESCUELA SEIGOKAN DE KARATE DO",
    ciudad_fecha: "Dado en Ciudad del Este, a los 15 días del mes de noviembre de 2026.",
    nombre_firmante: "Jorge Salgado Castillo",
    cargo_firmante: "Representación de Seigokan Paraguay",
    plantilla: "azul_imperial_oro"
  },
  {
    nombre: "🥋 3. Certificado de Agradecimiento Sudamericano (Diploma Clásico)",
    titulo: "CERTIFICADO DE AGRADECIMIENTO",
    subtitulo: "XIII TORNEO SUDAMERICANO SEIGOKAN",
    destinatario: "Sensei JORGE SALGADO CASTILLO",
    texto: "La Asociación Seigokan, con profundo respeto y gratitud, otorga el presente Certificado en reconocimiento y sincera gratitud por su invaluable aporte y dedicación en la organización y éxito del XIII TORNEO SUDAMERICANO SEIGOKAN. Este evento, gracias a su apoyo, ha fortalecido los lazos de fraternidad y el espíritu del Karate Do.",
    otorgado_por: "ASOCIACIÓN SEIGOKAN DE KARATE DO",
    ciudad_fecha: "Realizado en la Ciudad del Este, Paraguay, en el mes de noviembre del año 2026.",
    nombre_firmante: "Sensei JORGE SALGADO CASTILLO.",
    cargo_firmante: "Seigokan Paraguay",
    plantilla: "diploma_marcial_laurel"
  },
  // --- PRESETS ANTERIORES EXISTENTES ---
  {
    nombre: "Placa Conmemorativa y Agradecimiento (Autoridad / Patrocinador)",
    titulo: "PLACA CONMEMORATIVA Y DE AGRADECIMIENTO",
    subtitulo: "Por su inestimable compromiso y contribución",
    texto: "Los integrantes del Comité Directivo y la Comunidad Deportiva le saludan en esta fecha tan especial y le extienden su más sincero agradecimiento por su inquebrantable apoyo, su visión inspiradora y la oportunidad de crecimiento brindada a nuestros deportistas, valores fundamentales para el fortalecimiento del deporte y el desarrollo de nuestra comunidad.",
    otorgado_por: "EL COMITÉ ORGANIZADOR",
    ciudad_fecha: "Asunción, Paraguay, 2026",
    cargo_firmante: "Presidente del Comité",
    plantilla: "placa_madera"
  },
  {
    nombre: "Diploma de Honor al Mérito Deportivo (Campeón / MVP)",
    titulo: "DIPLOMA DE HONOR AL MÉRITO",
    subtitulo: "En reconocimiento a la excelencia, disciplina y entrega",
    texto: "Por haber demostrado un desempeño sobresaliente, liderazgo en el campo de juego y un intachable espíritu competitivo, consagrándose como referente ejemplar a lo largo de todo el Campeonato.",
    otorgado_por: "ASOCIACIÓN Y LIGA DE TORNEOS",
    ciudad_fecha: "Asunción, Paraguay, 2026",
    cargo_firmante: "Director de Competición",
    plantilla: "diploma_clasico"
  },
  {
    nombre: "Premio Fair Play y Espíritu Deportivo",
    titulo: "RECONOCIMIENTO AL ESPÍRITU DEPORTIVO Y FAIR PLAY",
    subtitulo: "Copa Juego Limpio y Compañerismo",
    texto: "En homenaje a su ejemplar conducta deportiva, caballerosidad dentro y fuera de la cancha, y respeto irrestricto hacia rivales, árbitros y espectadores, engrandeciendo la verdadera esencia del deporte.",
    otorgado_por: "TRIBUNAL DE DISCIPLINA Y ORGANIZACIÓN",
    ciudad_fecha: "Asunción, Paraguay, 2026",
    cargo_firmante: "Coordinador General",
    plantilla: "gala_oscura"
  },
  {
    nombre: "Homenaje a la Trayectoria Deportiva y Dirigencial",
    titulo: "RECONOCIMIENTO A LA TRAYECTORIA",
    subtitulo: "Una vida dedicada a la pasión deportiva",
    texto: "En testimonio de profunda gratitud y admiración por sus años de entrega incondicional, esfuerzo incansable y liderazgo dirigencial, dejando una huella imborrable en el corazón de nuestra institución deportiva.",
    otorgado_por: "LA COMISIÓN DIRECTIVA Y CLUBES AFILIADOS",
    ciudad_fecha: "Asunción, Paraguay, 2026",
    cargo_firmante: "Secretario General",
    plantilla: "placa_madera"
  },
  {
    nombre: "Agradecimiento a Patrocinador Oficial",
    titulo: "DISTINCIÓN DE GRATITUD INSTITUCIONAL",
    subtitulo: "Alianza Estratégica y Apoyo al Deporte",
    texto: "Nuestro sincero agradecimiento por creer en el talento y la juventud, haciendo posible con su valioso patrocinio la realización exitosa de este gran certamen deportivo.",
    otorgado_por: "COMITÉ EJECUTIVO DEL CAMPEONATO",
    ciudad_fecha: "Asunción, Paraguay, 2026",
    cargo_firmante: "Área de Marketing y Alianzas",
    plantilla: "moderno_esmeralda"
  }
];

export function isPortraitTemplate(plantilla?: string | null): boolean {
  return (
    plantilla === "pergamino_marcial" ||
    plantilla === "azul_imperial_oro" ||
    plantilla === "diploma_marcial_laurel"
  );
}

export function getPlantillaLabel(plantilla?: string | null): string {
  switch (plantilla) {
    case "pergamino_marcial":
      return "Pergamino Antiguo de Honor (Vertical)";
    case "azul_imperial_oro":
      return "Azul Marino y Oro 24K (Vertical)";
    case "diploma_marcial_laurel":
      return "Diploma Clásico Laurel (Vertical)";
    case "placa_madera":
      return "Placa Nogal y Bronce (Horizontal)";
    case "placa_cristal":
      return "Placa Cristal y Acero (Horizontal)";
    case "placa_caoba_plata":
      return "Placa Caoba y Plata (Horizontal)";
    case "diploma_clasico":
      return "Diploma Real de Honor (Horizontal)";
    case "gala_oscura":
      return "Gala Dark & Gold 24K (Horizontal)";
    case "moderno_esmeralda":
      return "Certificado Deportivo (Horizontal)";
    default:
      return "Plantilla Personalizada";
  }
}

export function getTextColor(plantilla?: string | null): string {
  switch (plantilla) {
    case "pergamino_marcial":
      return "#3c2214";
    case "azul_imperial_oro":
      return "#f4e5a9";
    case "diploma_marcial_laurel":
      return "#1e1e1e";
    case "placa_madera":
      return "#ffd97a";
    case "placa_cristal":
      return "#e2e8f0";
    case "placa_caoba_plata":
      return "#f1f5f9";
    case "diploma_clasico":
      return "#1e293b";
    case "gala_oscura":
      return "#facc15";
    case "moderno_esmeralda":
    default:
      return "#0f172a";
  }
}

export function getTemplatePreviewStyle(plantilla?: string | null): React.CSSProperties {
  switch (plantilla) {
    case "pergamino_marcial":
      return {
        background: "linear-gradient(135deg, #e9d1a1 0%, #d8ba82 50%, #c49f63 100%)",
        border: "4px solid #6b4317"
      };
    case "azul_imperial_oro":
      return {
        background: "radial-gradient(circle, #102e52 0%, #08172c 100%)",
        border: "4px solid #d4af37"
      };
    case "diploma_marcial_laurel":
      return {
        background: "#faf6ed",
        border: "4px solid #5a4b3c"
      };
    case "placa_madera":
      return {
        background: "radial-gradient(circle, #572e12 0%, #200e04 100%)",
        border: "4px solid #381a08"
      };
    case "placa_cristal":
      return {
        background: "radial-gradient(circle, #1e293b 0%, #020617 100%)",
        border: "4px solid #64748b"
      };
    case "placa_caoba_plata":
      return {
        background: "radial-gradient(circle, #54160d 0%, #170402 100%)",
        border: "4px solid #300a04"
      };
    case "diploma_clasico":
      return {
        background: "#fbf9f4",
        border: "4px solid #b89758"
      };
    case "gala_oscura":
      return {
        background: "radial-gradient(circle, #1a202c 0%, #05070a 100%)",
        border: "4px solid #d4af37"
      };
    case "moderno_esmeralda":
    default:
      return {
        background: "#ffffff",
        border: "4px solid #0f172a"
      };
  }
}

// =========================================================================
// ELEMENTOS VECTORIALES COMPARTIDOS DE ALTA CALIDAD
// =========================================================================

// Emblema Oficial Seigokan (o logo subido por usuario)
export function SeigokanCrest({
  logoUrl,
  variant = 'dark',
  size = 'md'
}: {
  logoUrl?: string | null;
  variant?: 'dark' | 'gold' | 'black';
  size?: 'sm' | 'md' | 'lg';
}) {
  if (logoUrl) {
    return (
      <div className="flex flex-col items-center justify-center">
        <img
          src={logoUrl}
          alt="Logo Institucional"
          className={`object-contain ${
            size === 'sm' ? 'h-10 sm:h-12' : size === 'lg' ? 'h-16 sm:h-20' : 'h-12 sm:h-16'
          } ${variant === 'dark' || variant === 'black' ? 'mix-blend-multiply' : ''}`}
        />
      </div>
    );
  }

  const isGold = variant === 'gold';
  const leafColor = isGold ? 'url(#goldLeafGradient)' : '#262626';
  const sealBg = '#ba1e1e';
  const textColor = isGold ? 'url(#goldTextGradient)' : '#ba1e1e';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <svg
        viewBox="0 0 200 135"
        className={`${
          size === 'sm' ? 'w-24 h-16' : size === 'lg' ? 'w-36 h-24' : 'w-32 h-20'
        } drop-shadow-sm`}
      >
        <defs>
          <linearGradient id="goldLeafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e098" />
            <stop offset="35%" stopColor="#d8b152" />
            <stop offset="70%" stopColor="#fcf4ba" />
            <stop offset="100%" stopColor="#9a7322" />
          </linearGradient>
          <linearGradient id="goldTextGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ecd588" />
            <stop offset="50%" stopColor="#fcf4b8" />
            <stop offset="100%" stopColor="#b38728" />
          </linearGradient>
        </defs>

        {/* Corona de laurel izquierda */}
        <g fill={leafColor}>
          <path d="M 85,98 C 65,95 48,78 46,55 C 45,40 50,26 56,16 C 53,24 53,35 56,45 C 59,55 68,68 82,75 Z" />
          <ellipse cx="50" cy="22" rx="4" ry="10" transform="rotate(-30 50 22)" />
          <ellipse cx="44" cy="34" rx="4" ry="10" transform="rotate(-15 44 34)" />
          <ellipse cx="43" cy="48" rx="4" ry="10" transform="rotate(5 43 48)" />
          <ellipse cx="46" cy="62" rx="4" ry="10" transform="rotate(25 46 62)" />
          <ellipse cx="54" cy="74" rx="4" ry="10" transform="rotate(45 54 74)" />
          <ellipse cx="66" cy="85" rx="4" ry="10" transform="rotate(60 66 85)" />
          <ellipse cx="80" cy="93" rx="4" ry="10" transform="rotate(75 80 93)" />
        </g>

        {/* Corona de laurel derecha (espejada) */}
        <g fill={leafColor}>
          <path d="M 115,98 C 135,95 152,78 154,55 C 155,40 150,26 144,16 C 147,24 147,35 144,45 C 141,55 132,68 118,75 Z" />
          <ellipse cx="150" cy="22" rx="4" ry="10" transform="rotate(30 150 22)" />
          <ellipse cx="156" cy="34" rx="4" ry="10" transform="rotate(15 156 34)" />
          <ellipse cx="157" cy="48" rx="4" ry="10" transform="rotate(-5 157 48)" />
          <ellipse cx="154" cy="62" rx="4" ry="10" transform="rotate(-25 154 62)" />
          <ellipse cx="146" cy="74" rx="4" ry="10" transform="rotate(-45 146 74)" />
          <ellipse cx="134" cy="85" rx="4" ry="10" transform="rotate(-60 134 85)" />
          <ellipse cx="120" cy="93" rx="4" ry="10" transform="rotate(-75 120 93)" />
        </g>

        {/* Lazo inferior de la corona */}
        <path
          d="M 92,97 Q 100,103 108,97 Q 100,95 92,97 Z"
          fill={leafColor}
        />

        {/* Sello Rojo Central con Kanjis的正剛館 */}
        <g>
          <rect
            x="84"
            y="20"
            width="32"
            height="58"
            rx="3"
            fill={sealBg}
            stroke={isGold ? '#e0c068' : '#7f1d1d'}
            strokeWidth="1.2"
          />
          <rect
            x="86"
            y="22"
            width="28"
            height="54"
            rx="1.5"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
          />

          <text
            x="100"
            y="37"
            fill="#ffffff"
            fontSize="14"
            fontFamily="'Noto Serif JP', serif, 'SimSun', 'Songti SC'"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            正
          </text>
          <text
            x="100"
            y="54"
            fill="#ffffff"
            fontSize="13"
            fontFamily="'Noto Serif JP', serif, 'SimSun', 'Songti SC'"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            剛
          </text>
          <text
            x="100"
            y="70"
            fill="#ffffff"
            fontSize="13"
            fontFamily="'Noto Serif JP', serif, 'SimSun', 'Songti SC'"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            館
          </text>
        </g>

        {/* Texto SEIGOKAN debajo */}
        <text
          x="100"
          y="118"
          fill={textColor}
          fontSize="13"
          fontFamily="'Cinzel', 'Playfair Display', serif"
          fontWeight="900"
          letterSpacing="0.22em"
          textAnchor="middle"
        >
          SEIGOKAN
        </text>
      </svg>
    </div>
  );
}

// Sello de Lacre Rojo en Relieve 3D (Auténtico de las fotos)
export function RedWaxSeal({ size = 80 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center select-none transition-transform hover:scale-105"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <radialGradient id="waxBodyGradient" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#df2626" />
            <stop offset="45%" stopColor="#b31515" />
            <stop offset="80%" stopColor="#7a0909" />
            <stop offset="100%" stopColor="#450404" />
          </radialGradient>
          <linearGradient id="waxBevel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0.2)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
          </linearGradient>
        </defs>

        <path
          d="M 50,4
             C 63,3 74,9 83,18
             C 92,27 97,38 96,51
             C 95,64 89,76 80,85
             C 71,94 58,98 47,96
             C 34,94 23,88 15,79
             C 7,70 3,58 5,45
             C 7,31 16,19 27,11
             C 38,4 43,5 50,4 Z"
          fill="url(#waxBodyGradient)"
        />

        <circle cx="85" cy="78" r="4.5" fill="#880f0f" opacity="0.9" />
        <circle cx="20" cy="82" r="3.5" fill="#750b0b" opacity="0.8" />
        <circle cx="58" cy="98" r="2.5" fill="#991212" opacity="0.9" />

        <circle
          cx="50"
          cy="50"
          r="36"
          fill="#941111"
          stroke="url(#waxBevel)"
          strokeWidth="3.5"
          filter="drop-shadow(inset 0 2px 4px rgba(0,0,0,0.6))"
        />

        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="#680b0b"
          strokeWidth="1.2"
          strokeDasharray="2,3"
        />

        <g fill="#f87171" opacity="0.85" style={{ filter: "drop-shadow(0 1px 1px #3b0606)" }}>
          <text
            x="50"
            y="38"
            fontSize="14"
            fontFamily="'Noto Serif JP', serif, SimSun"
            fontWeight="900"
            textAnchor="middle"
          >
            正
          </text>
          <text
            x="50"
            y="52"
            fontSize="13"
            fontFamily="'Noto Serif JP', serif, SimSun"
            fontWeight="900"
            textAnchor="middle"
          >
            剛
          </text>
          <text
            x="50"
            y="66"
            fontSize="13"
            fontFamily="'Noto Serif JP', serif, SimSun"
            fontWeight="900"
            textAnchor="middle"
          >
            館
          </text>
        </g>

        <path id="sealTextPath" d="M 24,66 A 31,31 0 0,0 76,66" fill="none" />
        <text fontSize="6.5" fontFamily="'Cinzel', serif" fontWeight="bold" fill="#fca5a5" letterSpacing="0.2em">
          <textPath href="#sealTextPath" startOffset="50%" textAnchor="middle">
            SEIGOKAN
          </textPath>
        </text>

        <ellipse cx="38" cy="22" rx="14" ry="5" fill="rgba(255,255,255,0.28)" transform="rotate(-25 38 22)" />
      </svg>
    </div>
  );
}

// Sello Hanko / Inkan tradicional japonés cuadrado de tinta cinabrio
export function JapaneseHankoSeal({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      title="Sello Oficial Seigokan (Hanko / Inkan)"
    >
      <div
        className="w-full h-full rounded-xs flex flex-col items-center justify-center p-0.5"
        style={{
          border: "2px solid #b91c1c",
          backgroundColor: "rgba(220, 38, 38, 0.08)",
          boxShadow: "inset 0 0 0 1px #b91c1c",
          color: "#b91c1c"
        }}
      >
        <div className="grid grid-cols-2 gap-x-0.5 leading-none font-bold text-[10px] sm:text-[11px] font-serif">
          <span>正</span>
          <span>館</span>
          <span>剛</span>
          <span>印</span>
        </div>
      </div>
    </div>
  );
}

// Sello circular inkan de tinta roja (para plantilla Azul y Oro)
export function CircularInkanSeal({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative rounded-full flex items-center justify-center select-none"
      style={{
        width: size,
        height: size,
        border: "2px solid #dc2626",
        color: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.06)"
      }}
    >
      <div className="text-[10px] font-bold font-serif text-center leading-tight">
        <div>正剛</div>
        <div>館印</div>
      </div>
    </div>
  );
}

// Firma Caligráfica de Maestro
export function CalligraphySignature({
  nombre = "Jorge Salgado Castillo",
  color = "#111827",
  className = ""
}: {
  nombre?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`select-none ${className}`} style={{ color }}>
      <p
        className="text-2xl sm:text-3xl md:text-4xl leading-none font-normal italic drop-shadow-xs"
        style={{
          fontFamily: "'Alex Brush', 'Great Vibes', 'Brush Script MT', cursive",
          transform: "rotate(-2deg)"
        }}
      >
        {nombre || "Jorge Salgado Castillo"}
      </p>
    </div>
  );
}

// Varilla Superior de Madera para el Pergamino Enrollado
export function WoodenScrollRod() {
  return (
    <div className="w-full relative h-7 sm:h-9 flex items-center justify-center z-30 select-none">
      <div
        className="w-5 sm:w-7 h-5 sm:h-7 rounded-full shadow-md z-10 -mr-2"
        style={{
          background: "radial-gradient(circle at 35% 35%, #8b4513 0%, #4a240c 70%, #2b1204 100%)",
          border: "1.5px solid #d4af37"
        }}
      />
      <div
        className="w-2.5 h-6 sm:h-8 rounded-xs z-10 -mr-1"
        style={{
          background: "linear-gradient(to right, #ffd700, #b8860b, #ffe066, #8b6508)"
        }}
      />

      <div
        className="flex-1 h-4 sm:h-5 rounded-xs relative shadow-lg overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #7a3e12 0%, #9e531b 35%, #592a09 70%, #3a1a05 100%)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60" />
      </div>

      <div
        className="w-2.5 h-6 sm:h-8 rounded-xs z-10 -ml-1"
        style={{
          background: "linear-gradient(to right, #ffd700, #b8860b, #ffe066, #8b6508)"
        }}
      />
      <div
        className="w-5 sm:w-7 h-5 sm:h-7 rounded-full shadow-md z-10 -ml-2"
        style={{
          background: "radial-gradient(circle at 35% 35%, #8b4513 0%, #4a240c 70%, #2b1204 100%)",
          border: "1.5px solid #d4af37"
        }}
      />
    </div>
  );
}

// Marco Vectorial de Filigrana Dorada (Para el Certificado Azul Marino)
export function GoldFiligreeFrame() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      preserveAspectRatio="none"
      viewBox="0 0 600 850"
    >
      <defs>
        <linearGradient id="goldBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dfbf68" />
          <stop offset="25%" stopColor="#fff2af" />
          <stop offset="50%" stopColor="#cda243" />
          <stop offset="75%" stopColor="#fae792" />
          <stop offset="100%" stopColor="#966e1b" />
        </linearGradient>
      </defs>

      <rect
        x="16"
        y="16"
        width="568"
        height="818"
        rx="4"
        fill="none"
        stroke="url(#goldBorderGradient)"
        strokeWidth="1.5"
      />

      <rect
        x="24"
        y="24"
        width="552"
        height="802"
        rx="2"
        fill="none"
        stroke="url(#goldBorderGradient)"
        strokeWidth="2.5"
      />

      <rect
        x="28"
        y="28"
        width="544"
        height="794"
        fill="none"
        stroke="url(#goldBorderGradient)"
        strokeWidth="0.8"
        strokeDasharray="4,2"
      />

      {/* Top Left */}
      <g transform="translate(24, 24)" stroke="url(#goldBorderGradient)" fill="none" strokeWidth="1.5">
        <path d="M 0,40 C 5,20 20,5 40,0" />
        <path d="M 8,30 C 12,18 18,12 30,8" />
        <circle cx="20" cy="20" r="3" fill="url(#goldBorderGradient)" />
      </g>
      {/* Top Right */}
      <g transform="translate(576, 24) scale(-1, 1)" stroke="url(#goldBorderGradient)" fill="none" strokeWidth="1.5">
        <path d="M 0,40 C 5,20 20,5 40,0" />
        <path d="M 8,30 C 12,18 18,12 30,8" />
        <circle cx="20" cy="20" r="3" fill="url(#goldBorderGradient)" />
      </g>
      {/* Bottom Left */}
      <g transform="translate(24, 826) scale(1, -1)" stroke="url(#goldBorderGradient)" fill="none" strokeWidth="1.5">
        <path d="M 0,40 C 5,20 20,5 40,0" />
        <path d="M 8,30 C 12,18 18,12 30,8" />
        <circle cx="20" cy="20" r="3" fill="url(#goldBorderGradient)" />
      </g>
      {/* Bottom Right */}
      <g transform="translate(576, 826) scale(-1, -1)" stroke="url(#goldBorderGradient)" fill="none" strokeWidth="1.5">
        <path d="M 0,40 C 5,20 20,5 40,0" />
        <path d="M 8,30 C 12,18 18,12 30,8" />
        <circle cx="20" cy="20" r="3" fill="url(#goldBorderGradient)" />
      </g>
    </svg>
  );
}

// Orla Clásica Grabada con Guirnaldas de Laurel (Para el Diploma Clásico)
export function ClassicLaurelEngravedBorder() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      preserveAspectRatio="none"
      viewBox="0 0 600 850"
    >
      <defs>
        <pattern id="laurelPatternLeft" width="24" height="40" patternUnits="userSpaceOnUse">
          <path d="M 12,5 Q 4,15 12,25 Q 20,15 12,5 Z" fill="#6b5b4a" opacity="0.8" />
          <ellipse cx="6" cy="12" rx="3" ry="6" transform="rotate(-30 6 12)" fill="#5c4d3d" />
          <ellipse cx="18" cy="12" rx="3" ry="6" transform="rotate(30 18 12)" fill="#5c4d3d" />
          <ellipse cx="6" cy="28" rx="3" ry="6" transform="rotate(-30 6 28)" fill="#5c4d3d" />
          <ellipse cx="18" cy="28" rx="3" ry="6" transform="rotate(30 18 28)" fill="#5c4d3d" />
        </pattern>
      </defs>

      <rect x="18" y="18" width="564" height="814" fill="none" stroke="#5a4b3b" strokeWidth="3" />
      <rect x="23" y="23" width="554" height="804" fill="none" stroke="#8c7a68" strokeWidth="1" />
      <rect x="42" y="42" width="516" height="766" fill="none" stroke="#5a4b3b" strokeWidth="1.5" />
      <rect x="45" y="45" width="510" height="760" fill="none" stroke="#8c7a68" strokeWidth="0.8" />

      <rect x="24" y="45" width="18" height="760" fill="url(#laurelPatternLeft)" />
      <rect x="558" y="45" width="18" height="760" fill="url(#laurelPatternLeft)" />

      <g fill="#5a4b3b" opacity="0.85">
        <path d="M 45,34 Q 300,28 555,34 Q 300,32 45,34 Z" />
        <circle cx="300" cy="33" r="4" />
      </g>

      {[[32, 32], [568, 32], [32, 818], [568, 818]].map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx}, ${cy})`}>
          <circle cx="0" cy="0" r="10" fill="#ede3d1" stroke="#5a4b3b" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#5a4b3b" />
          <circle cx="0" cy="0" r="2" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

// Tornillo de bronce con hendidura en cruz
export function Screw({ corner }: { corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionClasses = {
    "top-left": "top-2 left-2 sm:top-3 sm:left-3",
    "top-right": "top-2 right-2 sm:top-3 sm:right-3",
    "bottom-left": "bottom-2 left-2 sm:bottom-3 sm:left-3",
    "bottom-right": "bottom-2 right-2 sm:bottom-3 sm:right-3"
  }[corner];

  return (
    <div
      className={`absolute ${positionClasses} w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center pointer-events-none z-20`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #fff5c0 0%, #c9a33e 50%, #634710 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.7)",
        border: "1px solid #573e0e"
      }}
    >
      <div
        className="w-2.5 sm:w-3.5 h-[1.5px] sm:h-[2px] bg-[#3a2707] rounded-xs"
        style={{
          boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.3)",
          transform: "rotate(45deg)"
        }}
      />
    </div>
  );
}

// Perno / Separador cromado de acero inoxidable
export function ChromeBolt({ corner }: { corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionClasses = {
    "top-left": "top-2.5 left-2.5 sm:top-3.5 sm:left-3.5",
    "top-right": "top-2.5 right-2.5 sm:top-3.5 sm:right-3.5",
    "bottom-left": "bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5",
    "bottom-right": "bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5"
  }[corner];

  return (
    <div
      className={`absolute ${positionClasses} w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center pointer-events-none z-20`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #ffffff 0%, #cbd5e1 50%, #475569 100%)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.8)",
        border: "1px solid #64748b"
      }}
    >
      <div
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#1e293b]"
        style={{
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.4)"
        }}
      />
    </div>
  );
}

// Logo Oficial de MiCancha.com.py para plantillas
export function MiCanchaBadge({ theme }: { theme: 'bronce' | 'cristal' | 'acero' | 'diploma' | 'gala' | 'moderno' }) {
  if (theme === 'bronce' || theme === 'acero') {
    return (
      <div className="flex items-center select-none" title="MiCancha.com.py - Plataforma Oficial">
        <img
          src="/logo-micancha.jpg"
          alt="MiCancha.com.py"
          className="h-8 sm:h-10 md:h-12 max-w-[120px] object-contain mix-blend-multiply drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
        />
      </div>
    );
  }

  if (theme === 'cristal') {
    return (
      <div className="flex items-center bg-white/95 px-2 py-1 rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.6)] border border-white/50 backdrop-blur-sm select-none" title="MiCancha.com.py - Certificación Oficial">
        <img
          src="/logo-micancha.jpg"
          alt="MiCancha.com.py"
          className="h-7 sm:h-9 md:h-10 max-w-[110px] object-contain"
        />
      </div>
    );
  }

  if (theme === 'gala') {
    return (
      <div className="flex items-center bg-white/95 px-2 py-1 rounded-xl shadow-[0_4px_16px_rgba(212,175,55,0.3)] border border-amber-400/40 select-none" title="MiCancha.com.py - Gala Oficial">
        <img
          src="/logo-micancha.jpg"
          alt="MiCancha.com.py"
          className="h-7 sm:h-9 md:h-10 max-w-[110px] object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center select-none" title="MiCancha.com.py - Certificación Oficial">
      <img
        src="/logo-micancha.jpg"
        alt="MiCancha.com.py"
        className="h-8 sm:h-10 md:h-12 max-w-[120px] object-contain mix-blend-multiply"
      />
    </div>
  );
}

// Funciones auxiliares para detectar textos predeterminados de las fotos
function isDefaultPergaminoText(text?: string | null): boolean {
  if (!text) return true;
  return (
    text.includes("incontables años") ||
    text.includes("dedicación inquebrantable") ||
    text.includes("pilar fundamental") ||
    text.length < 10
  );
}

function isDefaultAzulText(text?: string | null): boolean {
  if (!text) return true;
  return (
    text.includes("valiosa participación") ||
    text.includes("otorga este presente") ||
    text.length < 10
  );
}

function isDefaultClasicoText(text?: string | null): boolean {
  if (!text) return true;
  return (
    text.includes("sincera gratitud") ||
    text.includes("invaluable aporte") ||
    text.includes("lazos de fraternidad") ||
    text.length < 10
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL: RENDERIZADOR DE TODAS LAS 9 PLANTILLAS
// =========================================================================
export default function CertificateCard({ data, isPrintMode = false, torneo }: CertificateCardProps) {
  const plantilla = data.plantilla || "placa_madera";

  // =======================================================================
  // NUEVA PLANTILLA 1: PERGAMINO MARCIAL / ROLLO DE HONOR (FOTO 1 IDÉNTICA)
  // =======================================================================
  if (plantilla === "pergamino_marcial") {
    return (
      <div
        className="w-full h-full relative select-none overflow-hidden"
        style={{
          aspectRatio: "842/1024",
          boxShadow: isPrintMode ? "none" : "0 20px 45px rgba(0,0,0,0.5)"
        }}
      >
        {/* Imagen fotográfica de fondo idéntica a la referencia */}
        <img
          src="/images/certificados/pergamino_clean.jpg"
          alt="Pergamino Antiguo de Honor"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />

        {/* Logo personalizado si se subió uno */}
        {data.logo_url && (
          <div className="absolute top-[12.5%] left-1/2 -translate-x-1/2 w-28 h-16 flex items-center justify-center pointer-events-none z-10">
            <img src={data.logo_url} alt="Logo" className="max-h-full max-w-full object-contain mix-blend-multiply" />
          </div>
        )}

        {/* Capa de textos con tipografía idéntica a la foto */}
        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20">
          
          {/* Título: "Reconocimiento y Honor a" */}
          <div
            className="absolute top-[31.6%] w-[78%] text-center text-[#241e19] italic font-medium leading-none"
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: "clamp(13px, 2.2vw, 24px)"
            }}
          >
            {data.titulo || "Reconocimiento y Honor a"}
          </div>

          {/* Destinatario: "Sensei ROBERTO TAKESHI FUKOCHI" */}
          <div
            className="absolute top-[34.8%] w-[78%] text-center text-[#15110e] font-bold uppercase tracking-[0.05em] leading-tight"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: "clamp(14px, 2.6vw, 27px)",
              textShadow: "0 0 1px rgba(0,0,0,0.2)"
            }}
          >
            {data.destinatario || "Sensei ROBERTO TAKESHI FUKOCHI"}
          </div>

          {/* Bloque central de dedicación */}
          <div
            className="absolute top-[39.2%] w-[72%] text-center flex flex-col items-center justify-start space-y-1 sm:space-y-1.5"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            {isDefaultPergaminoText(data.texto_agradecimiento) ? (
              <>
                <p
                  className="text-[#2a221b] italic font-medium leading-[1.34] text-center"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  Por sus incontables años de dedicación inquebrantable,<br className="hidden sm:inline" />
                  {" "}pasión y sabiduría en la enseñanza y difusión del
                </p>

                <p
                  className="text-[#15110e] font-bold tracking-[0.14em] uppercase text-center mt-0.5 sm:mt-1"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "clamp(11px, 2.05vw, 21px)"
                  }}
                >
                  {data.subtitulo || "KARATE DO GO JU RYU"}
                </p>

                <p
                  className="text-[#2a221b] italic font-medium leading-tight text-center mt-0.5 sm:mt-1"
                  style={{ fontSize: "clamp(10px, 1.75vw, 18px)" }}
                >
                  Como pilar fundamental de la
                </p>

                <p
                  className="text-[#15110e] font-bold tracking-[0.09em] uppercase text-center"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "clamp(11px, 1.95vw, 20px)"
                  }}
                >
                  {data.otorgado_por || "ASOCIACIÓN SEIGOKAN DE KARATE DO"}
                </p>

                <p
                  className="text-[#2a221b] italic font-medium leading-[1.32] text-center mt-1 sm:mt-2"
                  style={{ fontSize: "clamp(9.5px, 1.65vw, 17px)" }}
                >
                  Este pergamino certifica la gratitud profunda de sus estudiantes<br className="hidden sm:inline" />
                  {" "}y la comunidad marcial. Su legado de rectitud y maestría perdurará.
                </p>
              </>
            ) : (
              <div className="space-y-1.5 py-1">
                <p
                  className="text-[#2a221b] italic font-medium leading-relaxed text-center px-2"
                  style={{ fontSize: "clamp(10px, 1.8vw, 18px)" }}
                >
                  {data.texto_agradecimiento}
                </p>
                {data.subtitulo && (
                  <p
                    className="text-[#15110e] font-bold tracking-[0.12em] uppercase text-center"
                    style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(11px, 2.0vw, 20px)" }}
                  >
                    {data.subtitulo}
                  </p>
                )}
                {data.otorgado_por && (
                  <p
                    className="text-[#15110e] font-bold tracking-[0.08em] uppercase text-center"
                    style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(10px, 1.8vw, 18px)" }}
                  >
                    {data.otorgado_por}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fecha y Lugar */}
          <div
            className="absolute top-[64.2%] w-[72%] text-center text-[#2d241c] italic font-medium leading-snug whitespace-pre-line"
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: "clamp(10px, 1.7vw, 17px)"
            }}
          >
            {data.ciudad_fecha || "Dada en Ciudad del Este, Paraguay.\nNoviembre 2026."}
          </div>

          {/* Firma personalizada en caso de que se configure otro firmante */}
          {data.nombre_firmante && !data.nombre_firmante.includes("Jorge Salgado") && (
            <div className="absolute bottom-[17.5%] right-[11%] text-right bg-[#f1dfbe]/90 px-3 py-1 rounded shadow-sm">
              <p className="font-['Alex_Brush'] text-xl sm:text-2xl text-[#150a04] leading-none">{data.nombre_firmante}</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#1d0f07]">{data.nombre_firmante}</p>
              {data.cargo_firmante && <p className="text-[9px] sm:text-[10px] italic text-[#361d0f]">{data.cargo_firmante}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =======================================================================
  // NUEVA PLANTILLA 2: AZUL MARINO IMPERIAL Y ORO 24K (FOTO 2 IDÉNTICA)
  // =======================================================================
  if (plantilla === "azul_imperial_oro") {
    return (
      <div
        className="w-full h-full relative select-none overflow-hidden"
        style={{
          aspectRatio: "842/1024",
          boxShadow: isPrintMode ? "none" : "0 20px 45px rgba(0,0,0,0.6)"
        }}
      >
        {/* Imagen fotográfica de fondo idéntica a la referencia */}
        <img
          src="/images/certificados/azul_oro_clean.jpg"
          alt="Certificado Azul Marino y Oro 24K"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />

        {/* Logo personalizado opcional */}
        {data.logo_url && (
          <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-28 h-16 flex items-center justify-center pointer-events-none z-10">
            <img src={data.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20">
          
          {/* Título: "CERTIFICADO DE PARTICIPACIÓN" en oro en relieve */}
          <div
            className="absolute top-[40.2%] w-[76%] text-center font-bold uppercase tracking-[0.14em]"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: "clamp(13px, 2.35vw, 24px)",
              color: "#dfbe76",
              textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 12px rgba(223,190,118,0.45)"
            }}
          >
            {data.titulo || "CERTIFICADO DE PARTICIPACIÓN"}
          </div>

          {/* Texto del certificado */}
          <div
            className="absolute top-[45.2%] w-[68%] text-center flex flex-col items-center space-y-1 sm:space-y-1.5"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            {isDefaultAzulText(data.texto_agradecimiento) ? (
              <>
                <p
                  className="text-[#dfc285] italic leading-tight"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  La Escuela Seigokan otorga este presente
                </p>

                <p
                  className="text-[#dfc285] italic leading-tight"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  Certificado a <span className="font-semibold text-[#f8ebd0]">{data.destinatario || "Sensei .........................................."}</span>,
                </p>

                <p
                  className="text-[#dfc285] italic leading-tight"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  representante de la Escuela Seigokan de ......................
                </p>

                <p
                  className="text-[#dfc285] italic leading-tight mt-1 sm:mt-1.5"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  por su valiosa participación en el
                </p>

                <p
                  className="text-[#f1d798] font-bold italic leading-tight"
                  style={{ fontSize: "clamp(11px, 2.05vw, 21px)" }}
                >
                  {data.subtitulo || "XIII Torneo Seigokan Go Ju Ryu Karate Do"}
                </p>

                <p
                  className="text-[#dfc285] italic leading-tight"
                  style={{ fontSize: "clamp(10px, 1.85vw, 19px)" }}
                >
                  realizado en noviembre de 2026.
                </p>
              </>
            ) : (
              <div className="space-y-1.5 py-1">
                <p
                  className="text-[#dfc285] italic leading-relaxed text-center px-2"
                  style={{ fontSize: "clamp(10px, 1.8vw, 18px)" }}
                >
                  {data.texto_agradecimiento}
                </p>
                {data.destinatario && (
                  <p
                    className="text-[#f8ebd0] font-bold italic text-center"
                    style={{ fontSize: "clamp(11px, 2.1vw, 21px)" }}
                  >
                    {data.destinatario}
                  </p>
                )}
                {data.subtitulo && (
                  <p
                    className="text-[#f1d798] font-bold italic text-center"
                    style={{ fontSize: "clamp(11px, 2.0vw, 20px)" }}
                  >
                    {data.subtitulo}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fecha y Lugar */}
          <div
            className="absolute top-[66.0%] w-[68%] text-center text-[#d8bb78] italic leading-tight"
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: "clamp(9.5px, 1.55vw, 16px)"
            }}
          >
            {data.ciudad_fecha || "Dado en [Lugar], a los [Día] días del mes de noviembre de 2026."}
          </div>

          {/* Firma personalizada si se cambia de autoridad */}
          {data.nombre_firmante && !data.nombre_firmante.includes("Jorge Salgado") && (
            <div className="absolute bottom-[20%] left-[16%] text-left bg-[#091b33]/90 px-3 py-1 rounded border border-[#dfbe76]/40">
              <p className="font-['Alex_Brush'] text-xl sm:text-2xl text-[#f5dfa5] leading-none">{data.nombre_firmante}</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#f5dfa5]">{data.nombre_firmante}</p>
              {data.cargo_firmante && <p className="text-[9px] sm:text-[10px] italic text-[#dfc285]">{data.cargo_firmante}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =======================================================================
  // NUEVA PLANTILLA 3: DIPLOMA CLÁSICO LAUREL Y AGRADECIMIENTO (FOTO 3 IDÉNTICA)
  // =======================================================================
  if (plantilla === "diploma_marcial_laurel") {
    return (
      <div
        className="w-full h-full relative select-none overflow-hidden"
        style={{
          aspectRatio: "842/1024",
          boxShadow: isPrintMode ? "none" : "0 20px 45px rgba(0,0,0,0.3)"
        }}
      >
        {/* Imagen fotográfica de fondo idéntica a la referencia */}
        <img
          src="/images/certificados/clasico_laurel_clean.jpg"
          alt="Diploma Clásico Laurel"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />

        {/* Logo personalizado opcional */}
        {data.logo_url && (
          <div className="absolute top-[13.5%] left-1/2 -translate-x-1/2 w-28 h-16 flex items-center justify-center pointer-events-none z-10">
            <img src={data.logo_url} alt="Logo" className="max-h-full max-w-full object-contain mix-blend-multiply" />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20">
          
          {/* Título: "CERTIFICADO DE AGRADECIMIENTO" */}
          <div
            className="absolute top-[32.6%] w-[74%] text-center font-bold uppercase tracking-[0.12em] text-[#141414]"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: "clamp(13px, 2.4vw, 25px)"
            }}
          >
            {data.titulo || "CERTIFICADO DE AGRADECIMIENTO"}
          </div>

          {/* Texto de apertura */}
          <div
            className="absolute top-[36.8%] w-[68%] text-center text-[#252525] italic leading-tight"
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: "clamp(10.5px, 1.8vw, 18px)"
            }}
          >
            La Asociación Seigokan, con profundo respeto y<br className="hidden sm:inline" />
            {" "}gratitud, otorga el presente
          </div>

          {/* "CERTIFICADO A" */}
          <div
            className="absolute top-[43.4%] w-[68%] text-center font-bold uppercase tracking-[0.15em] text-[#141414]"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: "clamp(11px, 1.95vw, 20px)"
            }}
          >
            CERTIFICADO A
          </div>

          {/* Destinatario con línea punteada */}
          <div
            className="absolute top-[47.6%] w-[64%] text-center font-bold tracking-wide text-[#0f0f0f] border-b-2 border-dotted border-[#666] pb-0.5"
            style={{
              fontFamily: "'Cinzel', 'EB Garamond', serif",
              fontSize: "clamp(13px, 2.5vw, 26px)"
            }}
          >
            {data.destinatario || ".................................................."}
          </div>

          {/* Texto de agradecimiento */}
          <div
            className="absolute top-[52.4%] w-[68%] text-center flex flex-col items-center space-y-1 sm:space-y-1.5"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            {isDefaultClasicoText(data.texto_agradecimiento) ? (
              <>
                <p
                  className="text-[#222222] italic leading-[1.32]"
                  style={{ fontSize: "clamp(10.5px, 1.75vw, 18px)" }}
                >
                  En reconocimiento y sincera gratitud por su invaluable<br className="hidden sm:inline" />
                  {" "}aporte y dedicación en la organización y éxito del
                </p>

                <p
                  className="text-[#111111] font-bold tracking-[0.09em] uppercase text-center mt-0.5 sm:mt-1"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "clamp(11.5px, 2.05vw, 21px)"
                  }}
                >
                  {data.subtitulo || "XIII TORNEO SUDAMERICANO SEIGOKAN"}
                </p>

                <p
                  className="text-[#222222] italic leading-tight"
                  style={{ fontSize: "clamp(10.5px, 1.75vw, 18px)" }}
                >
                  {data.ciudad_fecha || "Realizado en la Ciudad del Este, Paraguay, en el mes de noviembre del año 2026."}
                </p>

                <p
                  className="text-[#222222] italic leading-[1.32] mt-0.5 sm:mt-1"
                  style={{ fontSize: "clamp(10.5px, 1.75vw, 18px)" }}
                >
                  Este evento, gracias a su apoyo, ha fortalecido los lazos<br className="hidden sm:inline" />
                  {" "}de fraternidad y el espíritu del Karate Do.
                </p>
              </>
            ) : (
              <div className="space-y-1.5 py-1">
                <p
                  className="text-[#222222] italic leading-relaxed text-center px-2"
                  style={{ fontSize: "clamp(10.5px, 1.8vw, 18px)" }}
                >
                  {data.texto_agradecimiento}
                </p>
                {data.subtitulo && (
                  <p
                    className="text-[#111111] font-bold tracking-[0.08em] uppercase text-center"
                    style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(11.5px, 2.0vw, 20px)" }}
                  >
                    {data.subtitulo}
                  </p>
                )}
                {data.ciudad_fecha && (
                  <p
                    className="text-[#222222] italic text-center"
                    style={{ fontSize: "clamp(10.5px, 1.7vw, 17px)" }}
                  >
                    {data.ciudad_fecha}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Firma personalizada si se cambia la autoridad */}
          {data.nombre_firmante && !data.nombre_firmante.includes("Jorge Salgado") && (
            <div className="absolute bottom-[16%] left-[22%] text-left bg-[#faf7f0]/95 px-3 py-1 rounded shadow-sm border border-slate-300">
              <p className="font-['Alex_Brush'] text-xl sm:text-2xl text-[#111111] leading-none">{data.nombre_firmante}</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#111111]">{data.nombre_firmante}</p>
              {data.cargo_firmante && <p className="text-[9px] sm:text-[10px] italic text-[#333333]">{data.cargo_firmante}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =======================================================================
  // PLANTILLAS EXISTENTES: PLACA MADERA, CRISTAL, CAOBA, DIPLOMA, GALA, MODERNO
  // =======================================================================

  // 1. PLACA DE MADERA Y BRONCE
  if (plantilla === "placa_madera") {
    return (
      <div
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #572e12 0%, #381a08 60%, #200e04 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 40px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.5)",
          border: "8px solid #281306"
        }}
      >
        <div
          className="absolute inset-[2.5%] pointer-events-none rounded-sm"
          style={{
            border: "2px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)"
          }}
        />

        <div
          className="w-full h-full relative rounded-sm p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #dfc26a 0%, #f6e28d 25%, #d1ae47 50%, #f3da82 75%, #caa135 100%)",
            boxShadow: "inset 0 0 35px rgba(135, 95, 20, 0.45), 0 10px 25px rgba(0,0,0,0.7)",
            border: "1px solid #997728"
          }}
        >
          <div
            className="absolute inset-[3.5%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid #6b4e12",
              boxShadow: "inset 0 0 0 3px rgba(255, 245, 180, 0.4), inset 0 0 0 4.5px #7a5a16"
            }}
          />

          <Screw corner="top-left" />
          <Screw corner="top-right" />
          <Screw corner="bottom-left" />
          <Screw corner="bottom-right" />

          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <h2
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase"
                style={{
                  color: "#181207",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,255,255,0.4)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p
                  className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider uppercase mt-0.5 opacity-90"
                  style={{ color: "#2e210a" }}
                >
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3
                  className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wide mb-2"
                  style={{
                    color: "#120c04",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 1px 0 rgba(255,255,255,0.3)"
                  }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed font-serif italic text-justify px-4"
                style={{
                  color: "#1f1708",
                  fontFamily: "Georgia, 'Times New Roman', serif"
                }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p
                  className="text-[10px] sm:text-xs md:text-sm font-medium italic mb-1"
                  style={{ color: "#2a1e08" }}
                >
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.15em] uppercase"
                  style={{
                    color: "#140e04",
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-amber-950/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold" style={{ color: "#201607" }}>
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] opacity-80" style={{ color: "#36260c" }}>
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img
                    src={data.logo_url}
                    alt="Logo Organizador"
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] mix-blend-multiply"
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-[#2a1e08] uppercase border-b border-[#2a1e08]/40 pb-0.5 opacity-80">
                    {torneo?.nombre || "Comité Organizador"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="bronce" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PLACA DE CRISTAL TEMPLADO Y ACERO FLOTANTE
  if (plantilla === "placa_cristal") {
    return (
      <div
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 60%, #020617 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 50px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.6)",
          border: "8px solid #0b0f19"
        }}
      >
        <div
          className="w-full h-full relative rounded-md p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.12) 100%)",
            backdropFilter: "blur(16px)",
            border: "2px solid rgba(255, 255, 255, 0.45)",
            boxShadow: "inset 0 0 30px rgba(255, 255, 255, 0.12), 0 15px 35px rgba(0, 0, 0, 0.7)"
          }}
        >
          <div
            className="absolute inset-[3%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "inset 0 0 15px rgba(255,255,255,0.05)"
            }}
          />

          <ChromeBolt corner="top-left" />
          <ChromeBolt corner="top-right" />
          <ChromeBolt corner="bottom-left" />
          <ChromeBolt corner="bottom-right" />

          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-cyan-200 font-bold block mb-1 drop-shadow">
                Distinción de Excelencia
              </span>
              <h2
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase text-white"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p className="text-[10px] sm:text-xs md:text-sm font-medium tracking-wider text-slate-300 mt-1 drop-shadow">
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3
                  className="text-xl sm:text-3xl md:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-100 mb-2 drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed italic text-slate-200 text-justify px-4 font-serif drop-shadow"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p className="text-[10px] sm:text-xs md:text-sm text-cyan-200/90 font-medium italic mb-1 drop-shadow">
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.18em] uppercase text-white drop-shadow"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-slate-300/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold text-slate-100 drop-shadow">
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] text-slate-300 drop-shadow">
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img
                    src={data.logo_url}
                    alt="Logo Organizador"
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-200 uppercase border-b border-white/40 pb-0.5 drop-shadow">
                    {torneo?.nombre || "Comisión Organizadora"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="cristal" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PLACA DE CAOBA Y PLATA
  if (plantilla === "placa_caoba_plata") {
    return (
      <div
        className="w-full h-full relative flex items-center justify-center p-[4%] select-none"
        style={{
          background: "radial-gradient(ellipse at center, #54160d 0%, #300a04 60%, #170402 100%)",
          boxShadow: isPrintMode ? "none" : "inset 0 0 45px rgba(0,0,0,0.9), 0 20px 45px rgba(0,0,0,0.55)",
          border: "8px solid #200603"
        }}
      >
        <div
          className="absolute inset-[2.5%] pointer-events-none rounded-sm"
          style={{
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)"
          }}
        />

        <div
          className="w-full h-full relative rounded-sm p-[5%] flex flex-col justify-between text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 25%, #e2e8f0 50%, #94a3b8 75%, #f8fafc 100%)",
            boxShadow: "inset 0 0 30px rgba(71, 85, 105, 0.35), 0 10px 25px rgba(0,0,0,0.7)",
            border: "1.5px solid #64748b"
          }}
        >
          <div
            className="absolute inset-[3.5%] pointer-events-none rounded-sm"
            style={{
              border: "1.5px solid #334155",
              boxShadow: "inset 0 0 0 3px rgba(255, 255, 255, 0.7), inset 0 0 0 4.5px #475569"
            }}
          />

          <ChromeBolt corner="top-left" />
          <ChromeBolt corner="top-right" />
          <ChromeBolt corner="bottom-left" />
          <ChromeBolt corner="bottom-right" />

          <div className="relative z-10 flex flex-col items-center justify-between h-full pt-1 pb-1">
            <div className="mb-2">
              <h2
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-[0.14em] uppercase"
                style={{
                  color: "#0f172a",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,255,255,0.6)"
                }}
              >
                {data.titulo}
              </h2>

              {data.subtitulo && (
                <p
                  className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider uppercase mt-0.5 opacity-90"
                  style={{ color: "#334155" }}
                >
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="my-auto py-2 max-w-[90%]">
              {data.destinatario && (
                <h3
                  className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wide mb-2"
                  style={{
                    color: "#020617",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 1px 0 rgba(255,255,255,0.5)"
                  }}
                >
                  {data.destinatario}
                </h3>
              )}

              <p
                className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] leading-relaxed font-serif italic text-justify px-4"
                style={{
                  color: "#1e293b",
                  fontFamily: "Georgia, 'Times New Roman', serif"
                }}
              >
                {data.texto_agradecimiento}
              </p>
            </div>

            <div className="w-full mt-2 pt-2 flex flex-col items-center">
              {data.ciudad_fecha && (
                <p className="text-[10px] sm:text-xs md:text-sm font-medium italic mb-1" style={{ color: "#334155" }}>
                  {data.ciudad_fecha}
                </p>
              )}

              {data.otorgado_por && (
                <p
                  className="text-xs sm:text-sm md:text-base font-black tracking-[0.15em] uppercase"
                  style={{
                    color: "#0f172a",
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}
                >
                  {data.otorgado_por}
                </p>
              )}

              {data.nombre_firmante && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="w-40 border-b border-slate-700/40 my-1" />
                  <p className="text-[10px] sm:text-xs font-bold" style={{ color: "#0f172a" }}>
                    {data.nombre_firmante}
                  </p>
                  {data.cargo_firmante && (
                    <p className="text-[9px] sm:text-[11px] opacity-80" style={{ color: "#475569" }}>
                      {data.cargo_firmante}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full flex items-end justify-between px-2 sm:px-4 mt-2">
              <div className="flex items-center">
                {data.logo_url ? (
                  <img
                    src={data.logo_url}
                    alt="Logo Organizador"
                    className="h-7 sm:h-10 md:h-12 max-w-[110px] object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] mix-blend-multiply"
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase border-b border-slate-700/40 pb-0.5">
                    {torneo?.nombre || "Comité Organizador"}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <MiCanchaBadge theme="acero" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. DIPLOMA REAL DE HONOR AL MÉRITO
  if (plantilla === "diploma_clasico") {
    return (
      <div
        className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none bg-[#fdfbf7]"
        style={{
          boxShadow: isPrintMode ? "none" : "0 10px 30px rgba(0,0,0,0.15)"
        }}
      >
        <div className="absolute inset-[2%] border-4 border-[#b89758] rounded pointer-events-none" />
        <div className="absolute inset-[3%] border border-[#7a5e2c] pointer-events-none" />

        <div className="absolute top-[2.5%] left-[2.5%] w-8 h-8 border-t-2 border-l-2 border-[#b89758]" />
        <div className="absolute top-[2.5%] right-[2.5%] w-8 h-8 border-t-2 border-r-2 border-[#b89758]" />
        <div className="absolute bottom-[2.5%] left-[2.5%] w-8 h-8 border-b-2 border-l-2 border-[#b89758]" />
        <div className="absolute bottom-[2.5%] right-[2.5%] w-8 h-8 border-b-2 border-r-2 border-[#b89758]" />

        <div className="relative z-10 flex flex-col justify-between h-full py-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo Organizador" className="h-10 sm:h-12 object-contain" />
              ) : (
                <div className="w-10" />
              )}
            </div>

            <div className="text-center">
              <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-amber-800 font-bold mb-0.5">
                Certificación Oficial del Campeonato
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-slate-900 tracking-wider font-serif">
                {data.titulo}
              </h2>
              {data.subtitulo && (
                <p className="text-xs sm:text-sm text-slate-600 font-medium italic mt-0.5">
                  {data.subtitulo}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <MiCanchaBadge theme="diploma" />
            </div>
          </div>

          <div className="my-auto py-2">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-slate-500 mb-1">
              Se otorga el presente reconocimiento a:
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#947632] font-serif tracking-wide border-b-2 border-[#e6d5aa] inline-block px-8 pb-2 mb-3">
              {data.destinatario}
            </h3>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-700 max-w-2xl mx-auto px-4 font-serif">
              {data.texto_agradecimiento}
            </p>
          </div>

          <div className="pt-2 border-t border-[#e2d5b6] flex items-end justify-between px-6">
            <div className="text-left text-[10px] sm:text-xs text-slate-600">
              <p className="font-semibold text-slate-800">{data.ciudad_fecha}</p>
              <p className="text-[10px] text-slate-500">{data.otorgado_por || "Registro Oficial"}</p>
            </div>

            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-[#b89758] flex items-center justify-center text-[#b89758] text-[10px] font-bold uppercase rotate-[-12deg]">
              ★ HONOR ★
            </div>

            <div className="text-center text-[10px] sm:text-xs">
              <div className="w-36 sm:w-48 border-b border-slate-400 mb-1 mx-auto" />
              <p className="font-bold text-slate-900">{data.nombre_firmante || data.otorgado_por || "Comité Organizador"}</p>
              <p className="text-slate-500 text-[10px]">{data.cargo_firmante || "Autoridad Competente"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. GALA DARK & 24K GOLD
  if (plantilla === "gala_oscura") {
    return (
      <div
        className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none text-white"
        style={{
          background: "radial-gradient(ellipse at center, #1a202c 0%, #0d1117 70%, #05070a 100%)",
          boxShadow: isPrintMode ? "none" : "0 15px 35px rgba(0,0,0,0.4)"
        }}
      >
        <div className="absolute inset-[2.5%] border-2 border-[#d4af37]/60 pointer-events-none" />
        <div className="absolute inset-[3.5%] border border-[#d4af37]/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full py-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2">
              ★ Noche de Campeones
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-serif">
              {data.titulo}
            </h2>
            {data.subtitulo && (
              <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide mt-1">
                {data.subtitulo}
              </p>
            )}
          </div>

          <div className="my-auto py-2">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">
              Distingue y Condecora a:
            </p>
            <h3 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wide text-white font-serif my-2 drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
              {data.destinatario}
            </h3>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 max-w-2xl mx-auto px-4 font-light">
              {data.texto_agradecimiento}
            </p>
          </div>

          <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between px-6 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {data.logo_url && (
                <img src={data.logo_url} alt="Logo Organizador" className="h-9 sm:h-11 object-contain opacity-90" />
              )}
              <div className="text-left">
                <p className="font-medium text-amber-200">{data.ciudad_fecha}</p>
                <p className="text-[10px] text-slate-500">{data.otorgado_por}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-32 border-b border-amber-400/40 mb-1 mx-auto" />
              <p className="font-bold text-amber-200">{data.nombre_firmante || "Directiva General"}</p>
              <p className="text-[10px] text-slate-400">{data.cargo_firmante || "Comisión Organizadora"}</p>
            </div>

            <div className="flex items-center">
              <MiCanchaBadge theme="gala" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. CERTIFICADO DEPORTIVO DINÁMICO & HERITAGE
  return (
    <div
      className="w-full h-full relative p-[5%] flex flex-col justify-between text-center select-none bg-white border-8 border-slate-900"
      style={{
        boxShadow: isPrintMode ? "none" : "0 10px 25px rgba(0,0,0,0.1)"
      }}
    >
      <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-blue-900 to-emerald-600 opacity-15 -rotate-45 -translate-x-16 -translate-y-16 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-36 h-36 bg-gradient-to-tl from-blue-900 to-emerald-600 opacity-15 -rotate-45 translate-x-16 translate-y-16 pointer-events-none" />
      <div className="absolute inset-[2%] border border-slate-200 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full py-2">
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3">
          <div className="flex items-center gap-3">
            {data.logo_url ? (
              <img src={data.logo_url} alt="Logo Organizador" className="h-10 sm:h-12 object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-700 text-xs">
                {torneo?.nombre ? torneo.nombre.charAt(0) : 'T'}
              </div>
            )}
            <div className="text-left">
              <h4 className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-center gap-1">
                Certificación Deportiva Oficial
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">{torneo?.nombre || "División de Competencias y Torneos"}</p>
            </div>
          </div>

          <div className="flex items-center">
            <MiCanchaBadge theme="moderno" />
          </div>
        </div>

        <div className="my-auto py-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-wide uppercase">
            {data.titulo}
          </h2>
          {data.subtitulo && (
            <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-1 uppercase tracking-wider">
              {data.subtitulo}
            </p>
          )}

          <div className="my-4">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Se concede la presente distinción a:</span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-950 mt-1">
              {data.destinatario}
            </h3>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-slate-700 max-w-2xl mx-auto px-4 leading-relaxed font-medium">
            {data.texto_agradecimiento}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-4 text-xs">
          <div className="text-left text-slate-600">
            <p className="font-bold text-slate-900">{data.ciudad_fecha}</p>
            <p className="text-[10px] text-slate-400 font-medium">{data.otorgado_por}</p>
          </div>

          <div className="text-right">
            <div className="w-36 border-b-2 border-slate-900 mb-1 ml-auto" />
            <p className="font-black text-slate-900">{data.nombre_firmante || "Comité Organizador"}</p>
            <p className="text-[10px] text-slate-500 font-medium">{data.cargo_firmante || "Dirección de Torneo"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
