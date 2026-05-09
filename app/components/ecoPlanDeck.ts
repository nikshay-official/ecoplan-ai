// ─────────────────────────────────────────────────────────────────
//  ECOPLAN DECK  –  Deck.gl map: OSM tiles, 3D OSM buildings,
//                   heatmap pollution overlay, drop markers
// ─────────────────────────────────────────────────────────────────
//  Dependencies needed:
//    npm install deck.gl @deck.gl/layers @deck.gl/geo-layers @deck.gl/extensions
//    npm install @loaders.gl/3d-tiles @loaders.gl/core
// ─────────────────────────────────────────────────────────────────

import { Deck } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import type { PlacedObject, PollutionStats } from "./ecoPlanData";
import { SENSORS } from "./ecoPlanData";

// India Gate, New Delhi
const INITIAL_VIEW = {
  longitude: 77.2295,
  latitude: 28.6129,
  zoom: 15.5,
  pitch: 55,
  bearing: -20,
  minZoom: 13,
  maxZoom: 18,
};

// ── Colour helpers ─────────────────────────────────────────────────
function aqiToRgb(aqi: number, alpha = 200): [number, number, number, number] {
  if (aqi < 50)  return [34,  197, 94,  alpha];
  if (aqi < 100) return [234, 179, 8,   alpha];
  if (aqi < 150) return [249, 115, 22,  alpha];
  if (aqi < 200) return [239, 68,  68,  alpha];
  if (aqi < 300) return [168, 85,  247, alpha];
  return               [127, 29,  29,  alpha];
}

function buildingColorForStats(
  stats: PollutionStats,
  view: "heat" | "aqi" | "pm25"
): [number, number, number, number] {
  const val = view === "pm25" ? stats.pm25 * 1.5 : stats.aqi;
  return aqiToRgb(val, 210);
}

// ── OSM Building data (Overpass API) ──────────────────────────────
let buildingGeoJson: any = null;

async function fetchBuildings() {
  if (buildingGeoJson) return buildingGeoJson;

  // Bounding box around India Gate
  const bbox = "28.600,77.215,28.625,77.245";
  const query = `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      relation["building"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    const data = await res.json();
    buildingGeoJson = osmToGeoJson(data);
    return buildingGeoJson;
  } catch (e) {
    console.warn("Overpass fetch failed, using synthetic buildings:", e);
    return syntheticBuildings();
  }
}

// Convert OSM elements → GeoJSON FeatureCollection
function osmToGeoJson(osm: any) {
  const nodeMap: Record<number, [number, number]> = {};
  for (const el of osm.elements) {
    if (el.type === "node") nodeMap[el.id] = [el.lon, el.lat];
  }

  const features: any[] = [];
  for (const el of osm.elements) {
    if (el.type !== "way" || !el.nodes) continue;
    const coords = el.nodes
      .map((nid: number) => nodeMap[nid])
      .filter(Boolean);
    if (coords.length < 4) continue;

    const levels = parseInt(el.tags?.["building:levels"] || "3");
    const height = parseInt(el.tags?.["height"] || String(levels * 3.5));

    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
      properties: {
        height: isNaN(height) ? 10 : height,
        levels: isNaN(levels) ? 3 : levels,
        name: el.tags?.name || "",
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// Fallback synthetic buildings if Overpass is down
function syntheticBuildings() {
  const center = { lng: 77.2295, lat: 28.6129 };
  const features: any[] = [];
  const rng = (min: number, max: number) => Math.random() * (max - min) + min;

  for (let i = 0; i < 80; i++) {
    const dlng = rng(-0.015, 0.015);
    const dlat = rng(-0.010, 0.010);
    const w = rng(0.0002, 0.0008);
    const h = rng(0.0001, 0.0005);
    const cx = center.lng + dlng;
    const cy = center.lat + dlat;
    const height = rng(6, 60);
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [cx - w / 2, cy - h / 2],
          [cx + w / 2, cy - h / 2],
          [cx + w / 2, cy + h / 2],
          [cx - w / 2, cy + h / 2],
          [cx - w / 2, cy - h / 2],
        ]],
      },
      properties: { height, levels: Math.round(height / 3.5) },
    });
  }
  return { type: "FeatureCollection", features };
}

// ── Deck.gl initialisation ────────────────────────────────────────
export async function initDeckMap(
  container: HTMLElement,
  onReady: (deck: Deck) => void
) {
  const buildings = await fetchBuildings();

  // OSM tile layer (base map)
  const tileLayer = new TileLayer({
    id: "osm-tiles",
    data: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props: any) => {
      const {
        bbox: { west, south, east, north },
      } = props.tile;
      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },
  });

  // 3-D buildings layer
  const buildingLayer = new GeoJsonLayer({
    id: "buildings-3d",
    data: buildings,
    extruded: true,
    getElevation: (f: any) => f.properties?.height ?? 10,
    getFillColor: [30, 50, 70, 220],
    getLineColor: [0, 255, 128, 40],
    lineWidthMinPixels: 1,
    material: {
      ambient: 0.1,
      diffuse: 0.6,
      shininess: 32,
      specularColor: [0, 80, 60],
    },
  });

  // Heatmap from sensors — radius & intensity scale with actual AQI
  const maxAqi = Math.max(...SENSORS.map((s) => s.aqi));
  const heatIntensity = Math.max(2, maxAqi / 80);   // 274 AQI → ~3.4 intensity
  const heatRadius    = Math.max(150, maxAqi * 0.9); // 274 AQI → ~246px radius

  const heatLayer = new HeatmapLayer({
    id: "pollution-heat",
    data: SENSORS,
    getPosition: (d: any) => [d.lng, d.lat],
    // weight = normalised 0–10 so hotspots really pop
    getWeight: (d: any) => (d.aqi / 300) * 10,
    radiusPixels: heatRadius,
    intensity: heatIntensity,
    threshold: 0.01,          // show even faint areas
    colorRange: [
      [34,  197, 94,  255],   // good  – green
      [234, 179, 8,   255],   // moderate – yellow
      [249, 115, 22,  255],   // unhealthy – orange
      [239, 68,  68,  255],   // very unhealthy – red
      [168, 85,  247, 255],   // severe – purple
      [127, 29,  29,  255],   // hazardous – dark red
    ],
  });

  // Sensor scatter dots
  const sensorLayer = new ScatterplotLayer({
    id: "sensors",
    data: SENSORS,
    getPosition: (d: any) => [d.lng, d.lat],
    getRadius: 8,
    getFillColor: (d: any) => aqiToRgb(d.aqi),
    radiusUnits: "pixels",
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [255, 255, 255, 60],
  });

  const deck = new Deck({
    parent: container,
    style: { width: "100%", height: "100%" },
    initialViewState: INITIAL_VIEW,
    controller: true,
    layers: [tileLayer, buildingLayer, heatLayer, sensorLayer],
    parameters: { blend: true },
  });

  onReady(deck);
  return deck;
}

// ── Update building colours based on pollution stats ──────────────
export function updateBuildingColors(
  deck: Deck,
  stats: PollutionStats,
  view: "heat" | "aqi" | "pm25"
) {
  const color = buildingColorForStats(stats, view);

  const buildingLayer = new GeoJsonLayer({
    id: "buildings-3d",
    data: buildingGeoJson || syntheticBuildings(),
    extruded: true,
    getElevation: (f: any) => f.properties?.height ?? 10,
    getFillColor: color,
    getLineColor: [0, 255, 128, 30],
    lineWidthMinPixels: 1,
    transitions: { getFillColor: { duration: 800 } },
    material: {
      ambient: 0.1,
      diffuse: 0.6,
      shininess: 32,
      specularColor: [0, 80, 60],
    },
  });

  deck.setProps({ layers: mergeLayers(deck, "buildings-3d", buildingLayer) });
}

// ── Update heatmap when objects placed ───────────────────────────
export function updatePollutionLayer(
  deck: Deck,
  stats: PollutionStats,
  placed: PlacedObject[]
) {
  // Combine real sensors + placed green objects (they reduce local AQI)
  const dynSensors = SENSORS.map((s) => ({ ...s, aqi: Math.max(10, s.aqi + (stats.aqi - 274)) }));

  const maxAqi      = Math.max(...dynSensors.map((s) => s.aqi));
  const heatIntensity = Math.max(2, maxAqi / 80);
  const heatRadius    = Math.max(150, maxAqi * 0.9);

  const heatLayer = new HeatmapLayer({
    id: "pollution-heat",
    data: dynSensors,
    getPosition: (d: any) => [d.lng, d.lat],
    getWeight: (d: any) => Math.max(0.1, (d.aqi / 300) * 10),
    radiusPixels: heatRadius,
    intensity: heatIntensity,
    threshold: 0.01,
    colorRange: [
      [34,  197, 94,  255],
      [234, 179, 8,   255],
      [249, 115, 22,  255],
      [239, 68,  68,  255],
      [168, 85,  247, 255],
      [127, 29,  29,  255],
    ],
  });

  // Placed markers
  const markerLayer = new ScatterplotLayer({
    id: "placed-markers",
    data: placed,
    getPosition: (d: any) => [d.lng, d.lat],
    getRadius: 12,
    getFillColor: [34, 197, 94, 220],
    radiusUnits: "pixels",
    stroked: true,
    lineWidthMinPixels: 2,
    getLineColor: [255, 255, 255, 180],
  });

  deck.setProps({
    layers: mergeLayers(
      deck,
      ["pollution-heat", "placed-markers"],
      [heatLayer, markerLayer]
    ),
  });
}

// ── Drop animation marker ─────────────────────────────────────────
export function addDropMarker(deck: Deck, obj: PlacedObject) {
  // Just triggers updatePollutionLayer to re-render placed markers
  // Animation handled by CSS / re-render cycle
}

// ── Layer merge helper ────────────────────────────────────────────
function mergeLayers(
  deck: Deck,
  replaceIds: string | string[],
  newLayers: any | any[]
) {
  const ids = Array.isArray(replaceIds) ? replaceIds : [replaceIds];
  const replacements = Array.isArray(newLayers) ? newLayers : [newLayers];

  const current: any[] = (deck.props as any).layers ?? [];
  const filtered = current.filter((l: any) => !ids.includes(l.id));
  return [...filtered, ...replacements];
}