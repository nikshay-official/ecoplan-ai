// ─────────────────────────────────────────────
//  ECOPLAN DATA  –  objects, sensors, pollution
// ─────────────────────────────────────────────

export interface PlacedObject {
  id: string;
  type: string;
  lng: number;
  lat: number;
}

export interface PollutionStats {
  score: number;   // 0-100 (higher = worse)
  aqi: number;
  co2: number;
  pm25: number;
  improved: number; // % improvement vs baseline
}

// ── Draggable objects ──────────────────────────
export const OBJECTS = [
  { type: "tree",       icon: "🌳", label: "TREE",        effect: "-8% CO₂",  aqiDelta: -6,  co2Delta: -18,  pm25Delta: -4  },
  { type: "park",       icon: "🏞️", label: "PARK",        effect: "-12% CO₂", aqiDelta: -12, co2Delta: -30,  pm25Delta: -8  },
  { type: "garden",     icon: "🌸", label: "GARDEN",      effect: "-5% CO₂",  aqiDelta: -4,  co2Delta: -10,  pm25Delta: -3  },
  { type: "lake",       icon: "💧", label: "LAKE",        effect: "-8% CO₂",  aqiDelta: -8,  co2Delta: -5,   pm25Delta: -10 },
  { type: "solar",      icon: "☀️", label: "SOLAR",       effect: "-6% CO₂",  aqiDelta: -5,  co2Delta: -20,  pm25Delta: -2  },
  { type: "ev_hub",     icon: "⚡", label: "EV HUB",      effect: "-10% CO₂", aqiDelta: -10, co2Delta: -25,  pm25Delta: -6  },
  { type: "green_wall", icon: "🧱", label: "GREEN WALL",  effect: "-4% CO₂",  aqiDelta: -6,  co2Delta: -8,   pm25Delta: -5  },
  { type: "wind",       icon: "🌬️", label: "WIND",        effect: "-8% CO₂",  aqiDelta: -7,  co2Delta: -22,  pm25Delta: -3  },
] as const;

// ── Baseline for Delhi India Gate area ─────────
const BASELINE: PollutionStats = {
  score: 78,
  aqi: 274,
  co2: 414,
  pm25: 162,
  improved: 0,
};

export function computePollution(placed: PlacedObject[]): PollutionStats {
  let aqiDelta = 0;
  let co2Delta = 0;
  let pm25Delta = 0;

  for (const obj of placed) {
    const meta = OBJECTS.find((o) => o.type === obj.type);
    if (!meta) continue;
    aqiDelta  += meta.aqiDelta;
    co2Delta  += meta.co2Delta;
    pm25Delta += meta.pm25Delta;
  }

  const aqi  = Math.max(10,  BASELINE.aqi  + aqiDelta);
  const co2  = Math.max(350, BASELINE.co2  + co2Delta);
  const pm25 = Math.max(5,   BASELINE.pm25 + pm25Delta);

  const score = Math.max(
    5,
    Math.round(BASELINE.score * (aqi / BASELINE.aqi))
  );
  const improved = Math.round(
    ((BASELINE.aqi - aqi) / BASELINE.aqi) * 100
  );

  return { score, aqi, co2, pm25, improved };
}

// ── Mock sensor positions around India Gate ────
export const SENSORS: PollutionSensor[] = [
  { id: "s1", lng: 77.2295, lat: 28.6129, aqi: 310, label: "India Gate" },
  { id: "s2", lng: 77.2195, lat: 28.6180, aqi: 260, label: "Rajpath W" },
  { id: "s3", lng: 77.2380, lat: 28.6090, aqi: 290, label: "Tilak Marg" },
  { id: "s4", lng: 77.2250, lat: 28.6050, aqi: 240, label: "South Block" },
  { id: "s5", lng: 77.2320, lat: 28.6200, aqi: 270, label: "Shahjahan Rd" },
  { id: "s6", lng: 77.2150, lat: 28.6100, aqi: 220, label: "Janpath" },
];

export interface PollutionSensor {
  id: string;
  lng: number;
  lat: number;
  aqi: number;
  label: string;
}
