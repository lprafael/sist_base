'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectDelay?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectedRef.current = true;
        options.onOpen?.();
        // Keepalive ping cada 30s
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage?.(data);
        } catch {}
      };

      ws.onclose = () => {
        isConnectedRef.current = false;
        clearInterval((ws as any)._pingInterval);
        options.onClose?.();
        // Reconectar automáticamente
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, options.reconnectDelay ?? 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connect, options.reconnectDelay ?? 5000);
      }
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected: isConnectedRef.current,
    send: (data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    },
  };
}
