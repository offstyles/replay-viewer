export function deltaAngle(a: number, b: number): number {
  return (b - a) - Math.floor((b - a + 180) / 360) * 360;
}

export function hermiteValue(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const m0 = (p2 - p0) * 0.5;
  const m1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t * t * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m0
       + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m1;
}

export function hermitePosition(
  p0: Float32Array, p1: Float32Array, p2: Float32Array, p3: Float32Array,
  t: number, out: Float32Array
): void {
  out[0] = hermiteValue(p0[0], p1[0], p2[0], p3[0], t);
  out[1] = hermiteValue(p0[1], p1[1], p2[1], p3[1], t);
  out[2] = hermiteValue(p0[2], p1[2], p2[2], p3[2], t);
}

export function hermiteAngles(
  a0: Float32Array, a1: Float32Array, a2: Float32Array, a3: Float32Array,
  t: number, out: Float32Array
): void {
  // Pitch
  out[0] = hermiteValue(
    a1[0] + deltaAngle(a1[0], a0[0]),
    a1[0],
    a1[0] + deltaAngle(a1[0], a2[0]),
    a1[0] + deltaAngle(a1[0], a3[0]),
    t
  );
  // Yaw
  out[1] = hermiteValue(
    a1[1] + deltaAngle(a1[1], a0[1]),
    a1[1],
    a1[1] + deltaAngle(a1[1], a2[1]),
    a1[1] + deltaAngle(a1[1], a3[1]),
    t
  );
}
