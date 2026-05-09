"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OBJECTS, PlacedObject, PollutionSensor, computePollution } from "./ecoPlanData";
import { initDeckMap, updateBuildingColors, updatePollutionLayer, addDropMarker } from "./ecoPlanDeck";
import AIChat from "./AIChat";

export default function EcoPlanMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);

  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [pollution, setPollution] = useState(computePollution([]));
  const [view, setView] = useState<"heat" | "aqi" | "pm25">("heat");
  const [mapReady, setMapReady] = useState(false);

  // Init deck.gl map on mount
  useEffect(() => {
    if (!mapContainer.current) return;
    initDeckMap(mapContainer.current, (deck: any) => {
      deckRef.current = deck;
      setMapReady(true);
    });
  }, []);

  // Re-render layers whenever placed objects or view changes
  useEffect(() => {
    if (!deckRef.current || !mapReady) return;
    const stats = computePollution(placedObjects);
    setPollution(stats);
    updateBuildingColors(deckRef.current, stats, view);
    updatePollutionLayer(deckRef.current, stats, placedObjects);
  }, [placedObjects, view, mapReady]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragItem || !deckRef.current) return;

      const rect = mapContainer.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Unproject pixel → lng/lat using deck viewport
      const viewport = deckRef.current.getViewports()[0];
      if (!viewport) return;
      const [lng, lat] = viewport.unproject([x, y]);

      const newObj: PlacedObject = {
        id: `${dragItem}-${Date.now()}`,
        type: dragItem,
        lng,
        lat,
      };

      setPlacedObjects((prev) => [...prev, newObj]);
      addDropMarker(deckRef.current, newObj);
      setDragItem(null);
    },
    [dragItem]
  );

  const removeObject = (id: string) => {
    setPlacedObjects((prev) => prev.filter((o) => o.id !== id));
  };

  const aqiColor =
    pollution.aqi < 50
      ? "#22c55e"
      : pollution.aqi < 100
      ? "#eab308"
      : pollution.aqi < 200
      ? "#f97316"
      : "#ef4444";

  const aqiLabel =
    pollution.aqi < 50
      ? "Good"
      : pollution.aqi < 100
      ? "Moderate"
      : pollution.aqi < 200
      ? "Unhealthy"
      : "Hazardous";

  return (
    <div className="ecoplan-root">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🌿</span>
          <div>
            <div className="brand-title">ECOPLAN AI</div>
            <div className="brand-sub">Environmental Simulation v3.0</div>
          </div>
        </div>

        {/* Pollution index */}
        <div className="pollution-card">
          <div className="pi-label">POLLUTION INDEX</div>
          <div className="pi-score" style={{ color: aqiColor }}>
            {pollution.score}
            <span className="pi-unit">/ 100</span>
          </div>
          <div className="pi-badge" style={{ background: aqiColor }}>
            {aqiLabel}
          </div>
          <div className="pi-bar-bg">
            <div
              className="pi-bar-fill"
              style={{ width: `${pollution.score}%`, background: aqiColor }}
            />
          </div>
          <div className="pi-stats">
            <Stat label="AQI" value={pollution.aqi} />
            <Stat label="CO₂ ppm" value={pollution.co2} />
            <Stat label="PM2.5 μg" value={pollution.pm25} />
            <Stat label="Improved" value={`${pollution.improved}%`} color="#22c55e" />
          </div>
        </div>

        {/* Drag objects */}
        <div className="section-title">⬇ DRAG TO MAP</div>
        <div className="objects-grid">
          {OBJECTS.map((obj) => (
            <div
              key={obj.type}
              className="obj-card"
              draggable
              onDragStart={() => setDragItem(obj.type)}
              title={obj.label}
            >
              <span className="obj-icon">{obj.icon}</span>
              <div className="obj-label">{obj.label}</div>
              <div className="obj-effect" style={{ color: "#22c55e" }}>
                {obj.effect}
              </div>
            </div>
          ))}
        </div>

        {/* Visualization toggle */}
        <div className="section-title">🎨 VISUALIZATION</div>
        <div className="view-toggle">
          {(["heat", "aqi", "pm25"] as const).map((v) => (
            <button
              key={v}
              className={`view-btn ${view === v ? "active" : ""}`}
              onClick={() => setView(v)}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Placed objects list */}
        {placedObjects.length > 0 && (
          <>
            <div className="section-title">📍 PLACED ({placedObjects.length})</div>
            <div className="placed-list">
              {placedObjects.map((o) => {
                const meta = OBJECTS.find((x) => x.type === o.type);
                return (
                  <div key={o.id} className="placed-item">
                    <span>{meta?.icon}</span>
                    <span className="placed-type">{meta?.label}</span>
                    <button className="remove-btn" onClick={() => removeObject(o.id)}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="section-title">🗺 LEGEND</div>
        <div className="legend">
          <LegendItem color="#dc2626" label="Critical (300+)" />
          <LegendItem color="#f97316" label="Severe (200–300)" />
          <LegendItem color="#eab308" label="Moderate (100–200)" />
          <LegendItem color="#22c55e" label="Good (&lt;100)" />
        </div>

        <button className="reset-btn" onClick={() => setPlacedObjects([])}>
          ⟳ RESET ZONE
        </button>
      </aside>

      {/* ── MAP ── */}
      <div className="map-wrap">
        <div
          ref={mapContainer}
          className="map-canvas"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        />
        {!mapReady && (
          <div className="map-loading">
            <div className="loading-spinner" />
            <div>Loading 3D city model…</div>
          </div>
        )}
        <div className="map-hint">DRAG OBJECTS FROM SIDEBAR · SCROLL TO ZOOM · CLICK+DRAG TO ROTATE</div>
        <WindCanvas pollution={pollution} />
      </div>
      <AIChat pollution={pollution} placedObjects={placedObjects} />
      <style>{CSS}</style>
    </div>
  );
}
function WindCanvas({ pollution }: { pollution: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Init 1200 wind particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 1200 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0.4 + Math.random() * 0.6,
        vy: (Math.random() - 0.5) * 0.15,
        size: 0.8 + Math.random() * 1.4,
        opacity: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.8,
      }));
    };
    initParticles();

    let t = 0;
    const score = pollution?.score ?? 78;

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // Wind drift with turbulence
        p.x += p.vx * p.speed + Math.sin(t * 0.8 + p.phase) * 0.3;
        p.y += p.vy + Math.cos(t * 0.6 + p.phase) * 0.1;

        // Wrap around edges
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        if (p.y < -10) p.y = canvas.height + 10;

        // Color based on pollution score
        let r, g, b;
        if (score > 70) { r = 160; g = 90;  b = 60;  } // brown smog
        else if (score > 50) { r = 160; g = 120; b = 70;  } // dusty orange
        else if (score > 30) { r = 140; g = 140; b = 80;  } // yellow haze
        else                 { r = 100; g = 180; b = 220; } // clean blue

        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(t * 1.2 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [pollution?.score]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || "#e2e8f0" }}>
        {value}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;600;800&display=swap');

  .ecoplan-root {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: #020c14;
    font-family: 'Share Tech Mono', monospace;
    color: #94a3b8;
    overflow: hidden;
  }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 200px;
    min-width: 200px;
    background: #030d18;
    border-right: 1px solid #0f2a3f;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 10px;
    overflow-y: auto;
    z-index: 10;
  }
  .sidebar::-webkit-scrollbar { width: 3px; }
  .sidebar::-webkit-scrollbar-thumb { background: #0f2a3f; }

  .brand { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #0f2a3f; }
  .brand-icon { font-size: 22px; }
  .brand-title { font-family: 'Exo 2', sans-serif; font-weight: 800; color: #22c55e; font-size: 13px; letter-spacing: 2px; }
  .brand-sub { font-size: 9px; color: #1e4d2b; }

  .pollution-card { background: #041220; border: 1px solid #0f2a3f; border-radius: 6px; padding: 10px; }
  .pi-label { font-size: 9px; letter-spacing: 2px; color: #475569; margin-bottom: 4px; }
  .pi-score { font-family: 'Exo 2', sans-serif; font-size: 36px; font-weight: 800; line-height: 1; }
  .pi-unit { font-size: 12px; color: #475569; margin-left: 2px; }
  .pi-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; color: #000; font-weight: bold; margin: 4px 0; }
  .pi-bar-bg { background: #0f2a3f; border-radius: 2px; height: 4px; margin: 6px 0; }
  .pi-bar-fill { height: 4px; border-radius: 2px; transition: width 0.8s ease; }
  .pi-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
  .stat { background: #020c14; border-radius: 4px; padding: 5px; }
  .stat-label { font-size: 8px; color: #475569; }
  .stat-value { font-size: 14px; font-family: 'Exo 2', sans-serif; font-weight: 600; }

  .section-title { font-size: 9px; letter-spacing: 2px; color: #22c55e; border-bottom: 1px solid #0f2a3f; padding-bottom: 4px; margin-top: 4px; }

  .objects-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .obj-card {
    background: #041220; border: 1px solid #0f2a3f; border-radius: 5px;
    padding: 8px 4px; text-align: center; cursor: grab;
    transition: border-color 0.2s, background 0.2s;
    user-select: none;
  }
  .obj-card:hover { border-color: #22c55e; background: #061a10; }
  .obj-card:active { cursor: grabbing; }
  .obj-icon { font-size: 20px; }
  .obj-label { font-size: 9px; color: #94a3b8; margin-top: 2px; }
  .obj-effect { font-size: 9px; margin-top: 1px; }

  .view-toggle { display: flex; gap: 4px; }
  .view-btn {
    flex: 1; padding: 4px 0; font-size: 9px; font-family: 'Share Tech Mono', monospace;
    background: #041220; border: 1px solid #0f2a3f; color: #475569; cursor: pointer; border-radius: 3px;
    transition: all 0.2s;
  }
  .view-btn.active { background: #22c55e22; border-color: #22c55e; color: #22c55e; }

  .placed-list { display: flex; flex-direction: column; gap: 4px; }
  .placed-item { display: flex; align-items: center; gap: 6px; background: #041220; padding: 4px 6px; border-radius: 4px; font-size: 10px; }
  .placed-type { flex: 1; color: #94a3b8; }
  .remove-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 10px; padding: 0; }

  .legend { display: flex; flex-direction: column; gap: 4px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  .reset-btn {
    margin-top: auto; padding: 8px; background: #1a0505; border: 1px solid #7f1d1d;
    color: #ef4444; cursor: pointer; font-family: 'Share Tech Mono', monospace; font-size: 10px;
    border-radius: 4px; letter-spacing: 1px;
    transition: background 0.2s;
  }
  .reset-btn:hover { background: #2a0808; }

  /* ── MAP ── */
  .map-wrap { flex: 1; position: relative; overflow: hidden; }
  .map-canvas { width: 100%; height: 100%; }
  .map-loading {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    background: #020c14cc; font-size: 13px; color: #22c55e; z-index: 5;
  }
  .loading-spinner {
    width: 32px; height: 32px; border: 2px solid #0f2a3f;
    border-top-color: #22c55e; border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .map-hint {
    position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
    font-size: 9px; letter-spacing: 2px; color: #1e3a5f; pointer-events: none;
    white-space: nowrap;
  }
`;
