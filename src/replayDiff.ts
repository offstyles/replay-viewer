import type { RunTicks } from './zones';

// Port of strafesnet roblox-bot-player's Bvh::closest_time_to_point.
const MAX_SLICE_LEN = 16;
const MAX_TERMINAL_BRANCH_LEAF_NODES = 20;
const TELEPORT_DIST_SQ = 512 * 512;

export interface DiffSample {
  time: number;
  speed: number;
}

interface Aabb {
  min: [number, number, number];
  max: [number, number, number];
}

// Ticks [start, end] form a polyline; when inclusive, the segment to end is included too.
interface Slice {
  start: number;
  end: number;
  inclusive: boolean;
}

interface Node {
  aabb: Aabb;
  children: Node[] | null;
  leaf: Slice | null;
}

function emptyAabb(): Aabb {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

function growAabb(a: Aabb, x: number, y: number, z: number) {
  if (x < a.min[0]) a.min[0] = x;
  if (y < a.min[1]) a.min[1] = y;
  if (z < a.min[2]) a.min[2] = z;
  if (x > a.max[0]) a.max[0] = x;
  if (y > a.max[1]) a.max[1] = y;
  if (z > a.max[2]) a.max[2] = z;
}

function joinAabb(a: Aabb, b: Aabb) {
  for (let i = 0; i < 3; i++) {
    if (b.min[i] < a.min[i]) a.min[i] = b.min[i];
    if (b.max[i] > a.max[i]) a.max[i] = b.max[i];
  }
}

function aabbDistSq(a: Aabb, p: Float32Array): number {
  let d = 0;
  for (let i = 0; i < 3; i++) {
    const c = Math.min(Math.max(p[i], a.min[i]), a.max[i]) - p[i];
    d += c * c;
  }
  return d;
}

function partitionPoint(sorted: [number, number][], n: number, median: number, strict: boolean): number {
  let i = 0;
  while (i < n && (strict ? sorted[i][1] < median : sorted[i][1] <= median)) i++;
  return i;
}

function choosePartition(sorted: [number, number][], n: number): number {
  const median = sorted[n >> 1][1];
  const eq = partitionPoint(sorted, n, median, true);
  const gt = partitionPoint(sorted, n, median, false);
  return Math.abs(n - 2 * eq) < Math.abs(n - 2 * gt) ? eq : gt;
}

function generateNode(boxen: [Slice, Aabb][], force: boolean): Node {
  const n = boxen.length;
  if (force || n < MAX_TERMINAL_BRANCH_LEAF_NODES) {
    const aabb = emptyAabb();
    const children = boxen.map(([leaf, box]) => {
      joinAabb(aabb, box);
      return { aabb: box, children: null, leaf };
    });
    return { aabb, children, leaf: null };
  }
  const sorted: [number, number][][] = [[], [], []];
  boxen.forEach(([, box], i) => {
    for (let axis = 0; axis < 3; axis++) sorted[axis].push([i, (box.min[axis] + box.max[axis]) / 2]);
  });
  const octant = new Uint8Array(n);
  for (let axis = 0; axis < 3; axis++) {
    sorted[axis].sort((a, b) => a[1] - b[1]);
    const split = choosePartition(sorted[axis], n);
    for (let k = split; k < n; k++) octant[sorted[axis][k][0]] |= 1 << axis;
  }
  const lists = new Map<number, [Slice, Aabb][]>();
  boxen.forEach((b, i) => {
    let list = lists.get(octant[i]);
    if (!list) lists.set(octant[i], (list = []));
    list.push(b);
  });
  if (lists.size === 1) return generateNode(boxen, true);
  const aabb = emptyAabb();
  const children = [...lists.values()].map((list) => {
    const node = generateNode(list, false);
    joinAabb(aabb, node.aabb);
    return node;
  });
  return { aabb, children, leaf: null };
}

export class ReplayDiff {
  private root: Node;
  private positions: Float32Array;
  private startTick: number;
  private tickRate: number;
  private bestDistSq = 0;
  private bestTick = 0;

  constructor(positions: Float32Array, tickRate: number, runTicks: RunTicks) {
    this.positions = positions;
    this.startTick = runTicks.start;
    this.tickRate = tickRate;
    this.root = this.build(runTicks.start, runTicks.end);
  }

  private build(start: number, end: number): Node {
    const p = this.positions;
    const boxen: [Slice, Aabb][] = [];
    let last = start;
    const pushSlices = (index: number) => {
      if (index === last) return;
      const count = Math.ceil((index - last) / MAX_SLICE_LEN);
      const pushSlice = (s: number, e: number, inclusive: boolean) => {
        const aabb = emptyAabb();
        for (let t = s; t < e + (inclusive ? 1 : 0); t++) growAabb(aabb, p[t * 3], p[t * 3 + 1], p[t * 3 + 2]);
        boxen.push([{ start: s, end: e, inclusive }, aabb]);
      };
      for (let i = 0; i < count - 1; i++) pushSlice(last + i * MAX_SLICE_LEN, last + (i + 1) * MAX_SLICE_LEN, true);
      pushSlice(last + (count - 1) * MAX_SLICE_LEN, index, false);
      last = index;
    };
    for (let t = start + 1; t <= end; t++) {
      const dx = p[t * 3] - p[t * 3 - 3];
      const dy = p[t * 3 + 1] - p[t * 3 - 2];
      const dz = p[t * 3 + 2] - p[t * 3 - 1];
      if (dx * dx + dy * dy + dz * dz > TELEPORT_DIST_SQ) pushSlices(t);
    }
    pushSlices(end + 1);
    return generateNode(boxen, false);
  }

  private visitLeaf(slice: Slice, q: Float32Array) {
    const p = this.positions;
    const lastSeg = slice.inclusive ? slice.end : slice.end - 1;
    for (let t = slice.start; t <= lastSeg; t++) {
      const off = t * 3;
      const dx = p[off] - q[0], dy = p[off + 1] - q[1], dz = p[off + 2] - q[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < this.bestDistSq) {
        this.bestDistSq = d;
        this.bestTick = t;
      }
      if (t === lastSeg && !slice.inclusive) break;
      const ex = p[off + 3] - p[off], ey = p[off + 4] - p[off + 1], ez = p[off + 5] - p[off + 2];
      const len = ex * ex + ey * ey + ez * ez;
      if (len === 0) continue;
      const s = -(dx * ex + dy * ey + dz * ez) / len;
      if (s <= 0 || s >= 1) continue;
      const cx = dx + ex * s, cy = dy + ey * s, cz = dz + ez * s;
      const sd = cx * cx + cy * cy + cz * cz;
      if (sd < this.bestDistSq) {
        this.bestDistSq = sd;
        this.bestTick = t + s;
      }
    }
  }

  private visit(node: Node, q: Float32Array) {
    if (node.leaf) {
      this.visitLeaf(node.leaf, q);
      return;
    }
    const children = node.children!;
    const order = children
      .map((c, i) => [aabbDistSq(c.aabb, q), i] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    for (const [d, i] of order) {
      if (d >= this.bestDistSq) break;
      this.visit(children[i], q);
    }
  }

  sample(pos: Float32Array, out: DiffSample) {
    this.bestDistSq = Infinity;
    this.bestTick = this.startTick;
    this.visit(this.root, pos);
    const t = this.bestTick;
    out.time = (t - this.startTick) / this.tickRate;
    const t0 = Math.floor(t);
    const t1 = Math.min(t0 + 1, this.positions.length / 3 - 1);
    out.speed = this.speedAt(t0) + (this.speedAt(t1) - this.speedAt(t0)) * (t - t0);
  }

  private speedAt(tick: number): number {
    if (tick <= 0) return 0;
    const p = this.positions;
    const off = tick * 3;
    const dx = p[off] - p[off - 3], dy = p[off + 1] - p[off - 2];
    return Math.sqrt(dx * dx + dy * dy) * this.tickRate;
  }
}
