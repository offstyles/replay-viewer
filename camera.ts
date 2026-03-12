import { mat4, vec3 } from 'gl-matrix';
import type { PlaybackState } from './playback';

export class Camera {
  readonly viewMatrix = mat4.create();
  private freecam = false;

  // Freecam state
  private pos = vec3.fromValues(0, 0, 0);
  private yaw = 0;
  private pitch = 0;
  private keys: Record<string, boolean> = {};
  private speed = 800;
  private sensitivity = 0.002;
  private canvas: HTMLCanvasElement;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };
    this.onMouseMove = (e: MouseEvent) => {
      if (!this.freecam || !document.pointerLockElement) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', () => {
      if (this.freecam && !document.pointerLockElement) {
        canvas.requestPointerLock();
      }
    });
  }

  get isFreecam(): boolean {
    return this.freecam;
  }

  toggleFreecam(): void {
    this.freecam = !this.freecam;
    if (this.freecam) {
      this.canvas.requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }

  forceFreecam(): void {
    this.freecam = true;
  }

  getPosition(): Float32Array {
    return new Float32Array([this.pos[0], this.pos[1], this.pos[2]]);
  }

  update(dt: number, state: PlaybackState): void {
    if (this.freecam) {
      this.updateFreecam(dt);
    } else {
      this.updateFollowCam(state);
    }
  }

  private updateFollowCam(state: PlaybackState): void {
    const px = state.position[0];
    const py = state.position[1];
    const pz = state.position[2] + state.eyeHeight;

    // Source Engine angles: yaw is angles[1], pitch is angles[0]
    const yaw = state.angles[1] * Math.PI / 180;
    const pitch = -state.angles[0] * Math.PI / 180;

    const cosPitch = Math.cos(pitch);
    const fx = Math.cos(yaw) * cosPitch;
    const fy = Math.sin(yaw) * cosPitch;
    const fz = Math.sin(pitch);

    mat4.lookAt(
      this.viewMatrix,
      [px, py, pz],
      [px + fx, py + fy, pz + fz],
      [0, 0, 1],
    );
  }

  private updateFreecam(dt: number): void {
    const spd = this.keys['shift'] ? this.speed * 3 : this.speed;

    const cosPitch = Math.cos(this.pitch);
    const fx = Math.cos(this.yaw) * cosPitch;
    const fy = Math.sin(this.yaw) * cosPitch;
    const fz = Math.sin(this.pitch);

    // Right vector (perpendicular to forward in XY plane)
    const rx = Math.cos(this.yaw - Math.PI / 2);
    const ry = Math.sin(this.yaw - Math.PI / 2);

    if (this.keys['w']) {
      this.pos[0] += fx * spd * dt;
      this.pos[1] += fy * spd * dt;
      this.pos[2] += fz * spd * dt;
    }
    if (this.keys['s']) {
      this.pos[0] -= fx * spd * dt;
      this.pos[1] -= fy * spd * dt;
      this.pos[2] -= fz * spd * dt;
    }
    if (this.keys['a']) {
      this.pos[0] -= rx * spd * dt;
      this.pos[1] -= ry * spd * dt;
    }
    if (this.keys['d']) {
      this.pos[0] += rx * spd * dt;
      this.pos[1] += ry * spd * dt;
    }

    mat4.lookAt(
      this.viewMatrix,
      this.pos as unknown as vec3,
      [this.pos[0] + fx, this.pos[1] + fy, this.pos[2] + fz],
      [0, 0, 1],
    );
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }
}
