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
