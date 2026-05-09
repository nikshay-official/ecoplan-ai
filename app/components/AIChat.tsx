"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  text: string;
  time: string;
}

interface AIChatProps {
  pollution: any;
  placedObjects: any[];
}

const SUGGESTIONS = [
  "Where should I place trees?",
  "How do I reduce PM2.5 fast?",
  "What's the best object to place?",
  "Compare my city to Tokyo",
  "Is my pollution critical?",
  "Give me a 5-step action plan",
];

export default function AIChat({ pollution, placedObjects }: AIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: `🌍 EcoPlan AI online. Current AQI is ${pollution?.aqi ?? "—"} — ${
        (pollution?.aqi ?? 0) > 200
          ? "🔴 CRITICAL. Immediate action needed."
          : (pollution?.aqi ?? 0) > 100
          ? "🟠 Unhealthy. Let's fix this."
          : "🟢 Moderate. Good progress!"
      } Ask me anything about your city's pollution.`,
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update greeting when pollution changes
  useEffect(() => {
    if (messages.length === 1) {
      setMessages([
        {
          role: "ai",
          text: `🌍 EcoPlan AI online. Current AQI is ${pollution?.aqi ?? "—"} — ${
            (pollution?.aqi ?? 0) > 200
              ? "🔴 CRITICAL. Immediate action needed."
              : (pollution?.aqi ?? 0) > 100
              ? "🟠 Unhealthy. Let's fix this."
              : "🟢 Moderate. Good progress!"
          } Ask me anything about your city's pollution.`,
          time: now(),
        },
      ]);
    }
  }, [pollution?.aqi]);

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText, time: now() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          pollutionContext: {
            city: "New Delhi",
            score: pollution?.score ?? 78,
            aqi: pollution?.aqi ?? 274,
            co2: pollution?.co2 ?? 430,
            pm25: pollution?.pm25 ?? 168,
            label: pollution?.label ?? "Hazardous",
            placedObjects: placedObjects.length,
            improved: pollution?.improved ?? 0,
          },
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.reply, time: now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "⚠️ Connection error. Check your API key in .env.local",
          time: now(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: open
            ? "#ef4444"
            : "linear-gradient(135deg, #00ff88, #00aaff)",
          border: "none",
          cursor: "pointer",
          fontSize: 22,
          zIndex: 1000,
          boxShadow: open
            ? "0 0 20px #ef444466"
            : "0 0 20px #00ff8866, 0 0 40px #00aaff33",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="EcoPlan AI Assistant"
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Pulse ring on button when closed */}
      {!open && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "2px solid #00ff88",
            zIndex: 999,
            animation: "pulse-ring 2s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            width: 360,
            height: 500,
            background: "#030d18",
            border: "1px solid #0f2a3f",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            boxShadow: "0 0 40px #00ff8822, 0 20px 60px #000a",
            fontFamily: "'Share Tech Mono', monospace",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #0f2a3f",
              background: "#041220",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 8px #00ff88",
                animation: "blink 1.5s ease infinite",
              }}
            />
            <div>
              <div
                style={{
                  color: "#00ff88",
                  fontSize: 12,
                  fontWeight: "bold",
                  letterSpacing: 2,
                }}
              >
                ECOPLAN AI
              </div>
              <div style={{ color: "#1e4d2b", fontSize: 9 }}>
                Powered by LLaMA 3 · Live pollution data
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontSize: 9,
                color: "#475569",
                textAlign: "right",
              }}
            >
              AQI {pollution?.aqi ?? "—"}
              <br />
              <span
                style={{
                  color:
                    (pollution?.aqi ?? 0) > 200 ? "#ef4444" : "#22c55e",
                }}
              >
                {(pollution?.aqi ?? 0) > 200
                  ? "CRITICAL"
                  : (pollution?.aqi ?? 0) > 100
                  ? "UNHEALTHY"
                  : "MODERATE"}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius:
                      msg.role === "user"
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #00441b, #005724)"
                        : "#041220",
                    border:
                      msg.role === "user"
                        ? "1px solid #22c55e44"
                        : "1px solid #0f2a3f",
                    color: msg.role === "user" ? "#86efac" : "#94a3b8",
                    fontSize: 11,
                    lineHeight: 1.6,
                    boxShadow:
                      msg.role === "ai"
                        ? "0 0 10px #00ff8808"
                        : "none",
                  }}
                >
                  {msg.role === "ai" && (
                    <div
                      style={{
                        fontSize: 9,
                        color: "#00ff88",
                        marginBottom: 4,
                        letterSpacing: 1,
                      }}
                    >
                      🤖 ECOPLAN AI
                    </div>
                  )}
                  {msg.text}
                </div>
                <div
                  style={{ fontSize: 8, color: "#1e3a5f", marginTop: 2 }}
                >
                  {msg.time}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#041220",
                    border: "1px solid #0f2a3f",
                    borderRadius: "12px 12px 12px 2px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#00ff88",
                        animation: `bounce 1s ease ${d * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div
            style={{
              padding: "6px 12px",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              borderTop: "1px solid #0f2a3f",
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  flexShrink: 0,
                  padding: "4px 8px",
                  background: "#041220",
                  border: "1px solid #0f2a3f",
                  borderRadius: 20,
                  color: "#475569",
                  fontSize: 9,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "'Share Tech Mono', monospace",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = "#22c55e";
                  (e.target as HTMLButtonElement).style.color = "#22c55e";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = "#0f2a3f";
                  (e.target as HTMLButtonElement).style.color = "#475569";
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #0f2a3f",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about pollution, solutions..."
              style={{
                flex: 1,
                background: "#020c14",
                border: "1px solid #0f2a3f",
                borderRadius: 6,
                padding: "8px 10px",
                color: "#e2e8f0",
                fontSize: 11,
                fontFamily: "'Share Tech Mono', monospace",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#22c55e";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#0f2a3f";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                padding: "8px 14px",
                background:
                  loading || !input.trim()
                    ? "#0f2a3f"
                    : "linear-gradient(135deg, #00ff88, #00aaff)",
                border: "none",
                borderRadius: 6,
                color: loading || !input.trim() ? "#1e3a5f" : "#000",
                cursor:
                  loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}

function now(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}