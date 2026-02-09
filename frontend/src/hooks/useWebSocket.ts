import { useState, useEffect, useRef, useCallback } from "react";
import type { WSMessage } from "@/types";

interface UseWebSocketReturn {
  messages: WSMessage[];
  isConnected: boolean;
  lastMessage: WSMessage | null;
}

export function useWebSocket(runId: string | null): UseWebSocketReturn {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cleanedUpRef = useRef(false);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!runId || cleanedUpRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/runs/${runId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cleanedUpRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (cleanedUpRef.current) return;
        try {
          const msg: WSMessage = JSON.parse(event.data);
          setMessages((prev) => [...prev, msg]);
          setLastMessage(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (cleanedUpRef.current) return;
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // connection failed, will retry via onclose
    }
  }, [runId]);

  useEffect(() => {
    cleanedUpRef.current = false;
    setMessages([]);
    setLastMessage(null);
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;

    connect();

    return () => {
      cleanedUpRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { messages, isConnected, lastMessage };
}
