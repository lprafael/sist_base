"use client";

import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle } from "lucide-react";

const canchas = [
  { id: "1", nombre: "Cancha 1 (Sintético)" },
  { id: "2", nombre: "Cancha 2 (Sintético)" },
  { id: "3", nombre: "Padel 1 (Cristal)" }
];

const horas = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

export default function ReservasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCancha, setSelectedCancha] = useState(canchas[0].id);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<"calendar" | "confirm">("calendar");

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleBook = () => {
    // Aquí se llamaría a la API: POST /api/reservas
    setStep("confirm");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reservar Instalación</h1>
          <p className="text-gray-400">Selecciona una cancha, fecha y hora disponible.</p>
        </div>

        {step === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Filtros */}
            <div className="space-y-6">
              <div className="bg-surface rounded-2xl p-6 border border-gray-800">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Instalación
                </h3>
                <div className="space-y-2">
                  {canchas.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCancha(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${selectedCancha === c.id ? 'bg-primary text-white' : 'bg-background text-gray-300 hover:bg-surface-light border border-gray-800'}`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendario y Horas */}
            <div className="lg:col-span-2 bg-surface rounded-2xl p-6 border border-gray-800">
              {/* Selector de Días */}
              <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 gap-2">
                {weekDays.map(date => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <button
                      key={date.toString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center min-w-[80px] p-3 rounded-2xl transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-background text-gray-400 hover:bg-gray-800 border border-gray-800'}`}
                    >
                      <span className="text-xs font-medium uppercase">{format(date, 'EEE', { locale: es })}</span>
                      <span className="text-2xl font-bold mt-1">{format(date, 'd')}</span>
                    </button>
                  );
                })}
              </div>

              {/* Grilla de Horarios */}
              <div>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Horarios Disponibles
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {horas.map(hora => {
                    const isSelected = selectedTime === hora;
                    // Simular algunas horas ocupadas
                    const isOccupied = hora === "19:00" || hora === "20:00";
                    return (
                      <button
                        key={hora}
                        disabled={isOccupied}
                        onClick={() => setSelectedTime(hora)}
                        className={`py-3 rounded-xl font-medium transition-all text-sm
                          ${isOccupied ? 'bg-background border border-red-900/30 text-gray-600 cursor-not-allowed opacity-50' : 
                            isSelected ? 'bg-accent text-background shadow-lg shadow-accent/30' : 
                            'bg-background border border-gray-800 text-white hover:border-primary'}
                        `}
                      >
                        {hora}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón de Confirmación */}
              {selectedTime && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 pt-6 border-t border-gray-800">
                  <button onClick={handleBook} className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-primary/20">
                    Continuar Reserva
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto bg-surface rounded-3xl p-8 border border-gray-800 text-center">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Reserva Pre-confirmada!</h2>
            <p className="text-gray-400 mb-6">Tu turno para el {format(selectedDate, "dd 'de' MMMM", { locale: es })} a las {selectedTime} ha sido apartado.</p>
            
            <div className="bg-background rounded-2xl p-4 mb-6 border border-gray-800 text-left">
              <p className="text-sm text-gray-400 mb-1">Cancha</p>
              <p className="text-white font-medium mb-4">{canchas.find(c => c.id === selectedCancha)?.nombre}</p>
              
              <div className="flex justify-between items-center border-t border-gray-800 pt-4">
                <span className="text-gray-400">A pagar ahora</span>
                <span className="text-xl font-bold text-white">Gs. 50.000</span>
              </div>
            </div>

            <button onClick={() => setStep("calendar")} className="w-full py-4 bg-primary text-white rounded-xl font-bold transition-colors">
              Ir al Pago
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
