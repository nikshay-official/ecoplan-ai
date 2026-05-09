import { create } from 'zustand';

export type ObjectType = 'tree' | 'park' | 'garden' | 'lake' | 'solar' | 'ev' | 'wall' | 'wind';

export interface PlacedObject {
  id: string;
  type: ObjectType;
  x: number; // 0-1 normalized
  z: number; // 0-1 normalized
  col: number;
  row: number;
  reductionPct: number;
  placedAt: number;
}

export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lng: number;
  baseAQI: number;
  baseCO2: number;
  basePM25: number;
  description: string;
}

export const OBJECT_CONFIG: Record<ObjectType, {
  icon: string;
  label: string;
  reduction: number;
  color: string;
  description: string;
}> = {
  tree:   { icon: '🌳', label: 'Tree',       reduction: 12, color: '#22c55e', description: 'Absorbs CO₂, reduces particulates' },
  park:   { icon: '🏞️', label: 'Park',       reduction: 22, color: '#16a34a', description: 'Large green area, high impact' },
  garden: { icon: '🌻', label: 'Garden',     reduction: 15, color: '#84cc16', description: 'Urban garden, local air purification' },
  lake:   { icon: '💧', label: 'Lake',       reduction: 18, color: '#0ea5e9', description: 'Water body cools & cleans air' },
  solar:  { icon: '☀️', label: 'Solar',      reduction:  8, color: '#eab308', description: 'Replaces fossil fuel energy' },
  ev:     { icon: '⚡', label: 'EV Hub',     reduction: 10, color: '#a855f7', description: 'Reduces vehicle emissions' },
  wall:   { icon: '🪴', label: 'Green Wall', reduction:  9, color: '#4ade80', description: 'Vertical garden, noise + air filter' },
  wind:   { icon: '🌀', label: 'Wind',       reduction: 13, color: '#38bdf8', description: 'Clean energy generation' },
};

export const CITIES: Record<string, CityInfo> = {
  'new delhi':  { name: 'New Delhi',  country: 'India',   lat: 28.61, lng: 77.21, baseAQI: 284, baseCO2: 430, basePM25: 168, description: 'One of the most polluted capitals' },
  'mumbai':     { name: 'Mumbai',     country: 'India',   lat: 19.07, lng: 72.88, baseAQI: 196, baseCO2: 398, basePM25: 122, description: 'Coastal megacity with heavy traffic' },
  'beijing':    { name: 'Beijing',    country: 'China',   lat: 39.90, lng: 116.40, baseAQI: 312, baseCO2: 455, basePM25: 210, description: 'Industrial and traffic pollution' },
  'london':     { name: 'London',     country: 'UK',      lat: 51.51, lng: -0.13, baseAQI: 102, baseCO2: 380, basePM25:  45, description: 'Urban emissions with clean zones' },
  'new york':   { name: 'New York',   country: 'USA',     lat: 40.71, lng: -74.01, baseAQI: 148, baseCO2: 392, basePM25:  78, description: 'Dense urban environment' },
  'tokyo':      { name: 'Tokyo',      country: 'Japan',   lat: 35.68, lng: 139.69, baseAQI:  88, baseCO2: 375, basePM25:  32, description: 'Clean city with strict regulations' },
  'cairo':      { name: 'Cairo',      country: 'Egypt',   lat: 30.04, lng: 31.24, baseAQI: 262, baseCO2: 422, basePM25: 148, description: 'Dust and vehicle pollution' },
  'shanghai':   { name: 'Shanghai',   country: 'China',   lat: 31.23, lng: 121.47, baseAQI: 188, baseCO2: 418, basePM25: 98,  description: 'Industrial port megacity' },
  'lahore':     { name: 'Lahore',     country: 'Pakistan',lat: 31.55, lng: 74.34, baseAQI: 325, baseCO2: 468, basePM25: 218, description: 'Most polluted city globally' },
  'paris':      { name: 'Paris',      country: 'France',  lat: 48.86, lng: 2.35,  baseAQI:  88, baseCO2: 378, basePM25:  48, description: 'Traffic and heating emissions' },
};

interface EcoState {
  // City
  selectedCity: CityInfo;
  cityInput: string;
  // Grid simulation
  gridCols: number;
  gridRows: number;
  pollutionGrid: Float32Array;
  baseGrid: Float32Array;
  // Objects
  placedObjects: PlacedObject[];
  dragItem: ObjectType | null;
  // Stats
  currentAQI: number;
  currentCO2: number;
  currentPM25: number;
  improvementPct: number;
  // UI
  vizMode: 'heatmap' | 'waves' | 'particles';
  radiusKm: 1 | 3 | 5;
  showLabels: boolean;
  isLoading: boolean;
  // Actions
  setCity: (cityKey: string) => void;
  setCityInput: (v: string) => void;
  initGrid: () => void;
  placeObject: (obj: PlacedObject) => void;
  removeObject: (id: string) => void;
  resetAll: () => void;
  setDragItem: (t: ObjectType | null) => void;
  setVizMode: (m: 'heatmap' | 'waves' | 'particles') => void;
  setRadiusKm: (r: 1 | 3 | 5) => void;
  updateStats: () => void;
}

const COLS = 60;
const ROWS = 40;

function generateBaseGrid(city: CityInfo): Float32Array {
  const g = new Float32Array(COLS * ROWS);
  const normAQI = Math.min(1, city.baseAQI / 350);
  const cx = COLS / 2, cy = ROWS / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dx = (c - cx) / cx;
      const dy = (r - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let v = normAQI * 100;
      v += (Math.random() * 24 - 12);
      v += dist * -22;
      v += Math.sin(c * 0.4) * 7 + Math.cos(r * 0.35) * 5;
      // City center hotspot
      if (dist < 0.3) v += 18;
      g[r * COLS + c] = Math.max(3, Math.min(100, v));
    }
  }
  // Add industrial hotspots
  for (let i = 0; i < 5; i++) {
    const hr = Math.floor(Math.random() * (ROWS - 6)) + 3;
    const hc = Math.floor(Math.random() * (COLS - 6)) + 3;
    const intensity = 20 + Math.random() * 30;
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        if (hr + dr >= 0 && hr + dr < ROWS && hc + dc >= 0 && hc + dc < COLS) {
          const d = Math.sqrt(dr * dr + dc * dc) / 4;
          g[(hr + dr) * COLS + (hc + dc)] = Math.min(100,
            g[(hr + dr) * COLS + (hc + dc)] + intensity * Math.max(0, 1 - d));
        }
      }
    }
  }
  return g;
}

function smoothGrid(g: Float32Array): void {
  const tmp = new Float32Array(g);
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      g[r * COLS + c] = (
        tmp[r * COLS + c] * 4 +
        tmp[(r - 1) * COLS + c] +
        tmp[(r + 1) * COLS + c] +
        tmp[r * COLS + (c - 1)] +
        tmp[r * COLS + (c + 1)]
      ) / 8;
    }
  }
}

function applyObjectToGrid(g: Float32Array, col: number, row: number, reductionPct: number): void {
  const radius = 10;
  for (let r = Math.max(0, row - radius); r < Math.min(ROWS, row + radius); r++) {
    for (let c = Math.max(0, col - radius); c < Math.min(COLS, col + radius); c++) {
      const dist = Math.sqrt((r - row) ** 2 + (c - col) ** 2);
      if (dist <= radius) {
        const strength = (1 - dist / radius) * (reductionPct / 100) * 0.85;
        g[r * COLS + c] = Math.max(2, g[r * COLS + c] * (1 - strength));
      }
    }
  }
  smoothGrid(g);
  smoothGrid(g);
}

export const useEcoStore = create<EcoState>((set, get) => ({
  selectedCity: CITIES['new delhi'],
  cityInput: 'new delhi',
  gridCols: COLS,
  gridRows: ROWS,
  pollutionGrid: new Float32Array(COLS * ROWS),
  baseGrid: new Float32Array(COLS * ROWS),
  placedObjects: [],
  dragItem: null,
  currentAQI: 284,
  currentCO2: 430,
  currentPM25: 168,
  improvementPct: 0,
  vizMode: 'heatmap',
  radiusKm: 3,
  showLabels: true,
  isLoading: false,

  setCity: (key) => {
    const city = CITIES[key.toLowerCase()] || CITIES['new delhi'];
    set({ selectedCity: city, cityInput: key, placedObjects: [], isLoading: true });
    setTimeout(() => {
      const base = generateBaseGrid(city);
      set({ baseGrid: base.slice(), pollutionGrid: base.slice(), isLoading: false });
      get().updateStats();
    }, 800);
  },

  setCityInput: (v) => set({ cityInput: v }),

  initGrid: () => {
    const { selectedCity } = get();
    const base = generateBaseGrid(selectedCity);
    set({ baseGrid: base.slice(), pollutionGrid: base.slice(), placedObjects: [] });
    get().updateStats();
  },

  placeObject: (obj) => {
    const grid = get().pollutionGrid.slice();
    applyObjectToGrid(grid, obj.col, obj.row, obj.reductionPct);
    set(s => ({ pollutionGrid: grid, placedObjects: [...s.placedObjects, obj] }));
    get().updateStats();
  },

  removeObject: (id) => {
    // Recompute grid from scratch
    const { baseGrid, placedObjects, selectedCity } = get();
    const newObjects = placedObjects.filter(o => o.id !== id);
    const grid = baseGrid.slice();
    newObjects.forEach(o => applyObjectToGrid(grid, o.col, o.row, o.reductionPct));
    set({ pollutionGrid: grid, placedObjects: newObjects });
    get().updateStats();
  },

  resetAll: () => {
    const base = get().baseGrid.slice();
    set({ pollutionGrid: base, placedObjects: [] });
    get().updateStats();
  },

  setDragItem: (t) => set({ dragItem: t }),

  setVizMode: (m) => set({ vizMode: m }),

  setRadiusKm: (r) => set({ radiusKm: r }),

  updateStats: () => {
    const { pollutionGrid, baseGrid, selectedCity } = get();
    let sum = 0, baseSum = 0;
    for (let i = 0; i < pollutionGrid.length; i++) {
      sum += pollutionGrid[i];
      baseSum += baseGrid[i];
    }
    const avg = sum / pollutionGrid.length;
    const baseAvg = baseSum / baseGrid.length;
    const ratio = avg / baseAvg;
    const improvePct = Math.max(0, Math.round((1 - ratio) * 100));
    set({
      currentAQI: Math.round(selectedCity.baseAQI * ratio),
      currentCO2: Math.round(selectedCity.baseCO2 * ratio),
      currentPM25: Math.round(selectedCity.basePM25 * ratio),
      improvementPct: improvePct,
    });
  },
}));
