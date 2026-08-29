import { FL_DUCKING } from './playback';

export type ZoneType = 'start' | 'end';

export interface Zone {
  type: ZoneType;
  min: [number, number, number];
  max: [number, number, number];
}

const ZONES_BASE = "https://raw.githubusercontent.com/srcwr/zones-cstrike/master/z";

interface RawZone {
  type: string;
  track: number;
  point_a: [number, number, number];
  point_b: [number, number, number];
}

export async function fetchZones(mapName: string): Promise<Zone[]> {
  const resp = await fetch(`${ZONES_BASE}/${encodeURIComponent(mapName)}.json`);
  if (!resp.ok) return [];
  const raw: RawZone[] = await resp.json();
  const zones: Zone[] = [];
  for (const z of raw) {
    if (z.track !== 0 || (z.type !== 'start' && z.type !== 'end')) continue;
    const a = z.point_a, b = z.point_b;
    zones.push({
      type: z.type,
      min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
      max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
    });
  }
  return zones;
}

const HULL_HALF_WIDTH = 16;
const HULL_HEIGHT_STANDING = 72;
const HULL_HEIGHT_DUCKED = 54;

function hullOverlaps(positions: Float32Array, flags: Int32Array, tick: number, z: Zone): boolean {
  const off = tick * 3;
  const x = positions[off], y = positions[off + 1], zBottom = positions[off + 2];
  const height = (flags[tick] & FL_DUCKING) !== 0 ? HULL_HEIGHT_DUCKED : HULL_HEIGHT_STANDING;
  return x + HULL_HALF_WIDTH > z.min[0] && x - HULL_HALF_WIDTH < z.max[0]
    && y + HULL_HALF_WIDTH > z.min[1] && y - HULL_HALF_WIDTH < z.max[1]
    && zBottom + height > z.min[2] && zBottom < z.max[2];
}

export interface RunTicks {
  start: number;
  end: number;
}

// bhoptimer restarts timer each grounded tick in start zone.
export function findRunTicks(
  zones: Zone[],
  positions: Float32Array,
  flags: Int32Array,
  tickCount: number,
): RunTicks | null {
  const startZones = zones.filter((z) => z.type === 'start');
  const endZones = zones.filter((z) => z.type === 'end');
  if (startZones.length === 0 || endZones.length === 0) return null;

  let end = -1;
  for (let t = 0; t < tickCount; t++) {
    if (endZones.some((z) => hullOverlaps(positions, flags, t, z))) { end = t; break; }
  }
  if (end < 0) return null;

  for (let t = end - 1; t >= 1; t--) {
    const grounded = positions[t * 3 + 2] === positions[(t - 1) * 3 + 2];
    if (grounded && startZones.some((z) => hullOverlaps(positions, flags, t, z))) return { start: t, end };
  }
  return null;
}
