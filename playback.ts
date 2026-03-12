import { hermitePosition, hermiteAngles, hermiteValue } from './math';

// Button flags
export const IN_JUMP = 1 << 1;
export const IN_DUCK = 1 << 2;
export const IN_FORWARD = 1 << 3;
export const IN_BACK = 1 << 4;
export const IN_MOVELEFT = 1 << 9;
export const IN_MOVERIGHT = 1 << 10;

// Entity flags
export const FL_DUCKING = 1 << 1;

export interface PlaybackState {
  tick: number;
  position: Float32Array;   // [x, y, z]
  angles: Float32Array;     // [pitch, yaw]
  buttons: number;
  flags: number;
  eyeHeight: number;
  speed: number;
  isPlaying: boolean;
  playbackRate: number;
  totalTicks: number;
  tickRate: number;
  time: number;
}

export class PlaybackEngine {
  private positions: Float32Array;
  private angles: Float32Array;
  private buttons: Int32Array;
  private flags: Int32Array;
  private tickCount: number;
  readonly tickRate: number;
  readonly replayTime: number;

  tick = 0;
  isPlaying = true;
  playbackRate = 1.0;
  private spareTime = 0;
  private pauseTicks = 100;

  // Temp buffers for interpolation
  private tempPos = [new Float32Array(3), new Float32Array(3), new Float32Array(3), new Float32Array(3)];
  private tempAng = [new Float32Array(2), new Float32Array(2), new Float32Array(2), new Float32Array(2)];

  // Output state
  readonly state: PlaybackState;

  constructor(
    positions: Float32Array,
    angles: Float32Array,
    buttons: Int32Array,
    flags: Int32Array,
    tickCount: number,
    tickRate: number,
    replayTime: number,
  ) {
    this.positions = positions;
    this.angles = angles;
    this.buttons = buttons;
    this.flags = flags;
    this.tickCount = tickCount;
    this.tickRate = tickRate;
    this.replayTime = replayTime;

    this.state = {
      tick: 0,
      position: new Float32Array(3),
      angles: new Float32Array(2),
      buttons: 0,
      flags: 0,
      eyeHeight: 64,
      speed: 0,
      isPlaying: true,
      playbackRate: 1.0,
      totalTicks: tickCount,
      tickRate,
      time: replayTime,
    };
  }

  private clampTick(tick: number): number {
    return Math.max(0, Math.min(tick, this.tickCount - 1));
  }

  private getTickPos(tick: number, out: Float32Array): void {
    const t = this.clampTick(tick);
    const off = t * 3;
    out[0] = this.positions[off];
    out[1] = this.positions[off + 1];
    out[2] = this.positions[off + 2];
  }

  private getTickAngles(tick: number, out: Float32Array): void {
    const t = this.clampTick(tick);
    const off = t * 2;
    out[0] = this.angles[off];
    out[1] = this.angles[off + 1];
  }

  private getTickFlags(tick: number): number {
    return this.flags[this.clampTick(tick)];
  }

  private getTickButtons(tick: number): number {
    return this.buttons[this.clampTick(tick)];
  }

  private getEyeHeight(flags: number): number {
    return (flags & FL_DUCKING) !== 0 ? 46 : 64;
  }

  setTick(tick: number): void {
    this.tick = tick;
    this.spareTime = 0;
  }

  setPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    if (!isPlaying) {
      this.spareTime = 0;
    }
  }

  togglePlaying(): void {
    this.setPlaying(!this.isPlaying);
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
  }

  update(dt: number): void {
    const tickPeriod = 1.0 / this.tickRate;

    if (this.isPlaying) {
      this.spareTime += dt * this.playbackRate;

      while (this.spareTime > tickPeriod) {
        this.spareTime -= tickPeriod;
        this.tick += 1;
        if (this.tick > this.tickCount + this.pauseTicks * 2) {
          this.tick = -this.pauseTicks;
        }
      }

      while (this.spareTime < 0) {
        this.spareTime += tickPeriod;
        this.tick -= 1;
        if (this.tick < -this.pauseTicks * 2) {
          this.tick = this.tickCount + this.pauseTicks;
        }
      }
    } else {
      this.spareTime = 0;
    }

    const clamped = this.clampTick(this.tick);
    const curFlags = this.getTickFlags(this.tick);
    const curButtons = this.getTickButtons(this.tick);
    let eyeHeight = this.getEyeHeight(curFlags);

    // Get base position/angles
    this.getTickPos(this.tick, this.state.position);
    this.getTickAngles(this.tick, this.state.angles);

    // Hermite interpolation
    if (this.spareTime >= 0 && this.spareTime <= tickPeriod) {
      const t = this.spareTime / tickPeriod;

      this.getTickPos(this.tick - 1, this.tempPos[0]);
      this.getTickPos(this.tick, this.tempPos[1]);
      this.getTickPos(this.tick + 1, this.tempPos[2]);
      this.getTickPos(this.tick + 2, this.tempPos[3]);

      this.getTickAngles(this.tick - 1, this.tempAng[0]);
      this.getTickAngles(this.tick, this.tempAng[1]);
      this.getTickAngles(this.tick + 1, this.tempAng[2]);
      this.getTickAngles(this.tick + 2, this.tempAng[3]);

      hermitePosition(this.tempPos[0], this.tempPos[1], this.tempPos[2], this.tempPos[3], t, this.state.position);
      hermiteAngles(this.tempAng[0], this.tempAng[1], this.tempAng[2], this.tempAng[3], t, this.state.angles);

      eyeHeight = hermiteValue(
        this.getEyeHeight(this.getTickFlags(this.tick - 1)),
        this.getEyeHeight(curFlags),
        this.getEyeHeight(this.getTickFlags(this.tick + 1)),
        this.getEyeHeight(this.getTickFlags(this.tick + 2)),
        t,
      );
    }

    // Compute speed (horizontal velocity between ticks)
    const prevTick = this.clampTick(clamped - 1);
    const p0 = prevTick * 3;
    const p1 = clamped * 3;
    const dx = this.positions[p1] - this.positions[p0];
    const dy = this.positions[p1 + 1] - this.positions[p0 + 1];
    const speed = Math.sqrt(dx * dx + dy * dy) * this.tickRate;

    this.state.tick = clamped;
    this.state.buttons = curButtons;
    this.state.flags = curFlags;
    this.state.eyeHeight = eyeHeight;
    this.state.speed = speed;
    this.state.isPlaying = this.isPlaying;
    this.state.playbackRate = this.playbackRate;
  }
}
