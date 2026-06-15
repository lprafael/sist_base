"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ id: string, sender_id: number, contenido: string }[]>([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inicializar WebSocket
    const token = localStorage.getItem("token") || "dummy_token";
    const socket = new WebSocket(`ws://localhost:8001/api/chat/ws/${token}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !ws) return;
    
    const payload = {
      receiver_id: 2, // Dummy ID for now
      contenido: input,
      conversacion_id: "conv-123"
    };
    ws.send(JSON.stringify(payload));
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Sidebar Contactos */}
      <div className="w-1/3 border-r border-surface bg-surface/50 p-4 hidden md:block">
        <h2 className="text-xl font-bold text-white mb-4">Mensajes</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((contact) => (
            <div key={contact} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface cursor-pointer transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-white font-medium">Contacto {contact}</p>
                <p className="text-sm text-gray-400 truncate">Último mensaje...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-4 border-b border-surface bg-surface/30 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white">Chat en vivo</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className={`flex ${msg.sender_id === 1 ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender_id === 1 ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-gray-100 rounded-bl-none'}`}>
                {msg.contenido}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-surface/50 backdrop-blur-md border-t border-surface">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-surface border border-gray-700 rounded-full px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-primary hover:bg-primary-dark text-white rounded-full transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
