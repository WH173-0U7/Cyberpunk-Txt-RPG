import type { Weather } from '../engine/types';

type Rgb = [number, number, number];

interface Profile {
  kind: 'drop' | 'mote';
  /** Particles per 100,000 px² of viewport. */
  density: number;
  speed: [min: number, max: number];
  /** Streak length for drops, radius for motes. */
  size: [min: number, max: number];
  alpha: [min: number, max: number];
  /** Drops: horizontal slant. Motes: average horizontal direction (-1..1). */
  wind: number;
  /** Motes: random spread around `wind`. */
  jitter?: number;
  /** Motes: share of speed spent drifting upward. */
  rise?: number;
  splash?: boolean;
  /** How much of the neon tint particles pick up; the rest is white. */
  tint: number;
}

const PROFILES: Record<Weather, Profile | null> = {
  rain: { kind: 'drop', density: 16, speed: [950, 1450], size: [14, 30], alpha: [0.15, 0.5], wind: -0.18, splash: true, tint: 0.45 },
  drizzle: { kind: 'drop', density: 6, speed: [420, 620], size: [6, 13], alpha: [0.1, 0.32], wind: -0.06, tint: 0.55 },
  dust: { kind: 'mote', density: 6, speed: [50, 170], size: [0.6, 2], alpha: [0.15, 0.5], wind: 1, jitter: 0.3, rise: 0.08, tint: 0.8 },
  haze: { kind: 'mote', density: 2.2, speed: [5, 18], size: [1, 3.2], alpha: [0.08, 0.32], wind: 0, jitter: 0.6, rise: 0.7, tint: 0.85 },
  clear: null,
};

interface Particle {
  profile: Profile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** 0..1 multiplier so weather changes cross-fade instead of popping. */
  fade: number;
  dying: boolean;
  /** Seconds before a mote fades out and is replaced. */
  life: number;
  phase: number;
}

interface Splash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const WHITE: Rgb = [235, 242, 255];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Full-screen particle canvas: rain, drizzle, dust or indoor haze, tinted by the district's neon. */
export class WeatherFx {
  private readonly ctx: CanvasRenderingContext2D;
  private profile: Profile | null = null;
  private particles: Particle[] = [];
  private splashes: Splash[] = [];
  private tint: Rgb = [0, 240, 255];
  private targetTint: Rgb = [0, 240, 255];
  private width = 0;
  private height = 0;
  private lastFrame = 0;
  private firstFrame = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reducedMotion: boolean,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.resize();
    addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  setWeather(weather: Weather): void {
    const next = PROFILES[weather];
    if (next === this.profile) return;
    this.profile = next;
    for (const p of this.particles) if (p.profile !== next) p.dying = true;
  }

  /** Smoothly shifts particle color toward a hex tint. */
  setTint(hex: string): void {
    this.targetTint = hexToRgb(hex);
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = innerWidth;
    this.height = innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private frame = (now: number): void => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    const blend = Math.min(1, dt * 2.5);
    this.tint = this.tint.map((c, i) => c + ((this.targetTint[i] ?? c) - c) * blend) as Rgb;
    this.spawn();
    this.update(dt, now / 1000);
    this.draw();
    requestAnimationFrame(this.frame);
  };

  private spawn(): void {
    // On first load fill the screen at once; afterwards ramp in so new weather "arrives".
    const instant = this.firstFrame;
    this.firstFrame = false;
    const profile = this.profile;
    if (!profile) return;

    const area = (this.width * this.height) / 100_000;
    const target = Math.round(profile.density * area * (this.reducedMotion ? 0.4 : 1));
    let live = 0;
    for (const p of this.particles) if (!p.dying) live++;
    const budget = instant ? target : Math.max(3, Math.ceil(target / 30));
    for (let i = 0; i < budget && live < target; i++, live++) {
      this.particles.push(this.create(profile, instant));
    }
  }

  private create(profile: Profile, anywhere: boolean): Particle {
    const speed = rand(...profile.speed);
    const p: Particle = {
      profile,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: rand(...profile.size),
      alpha: rand(...profile.alpha),
      fade: 0,
      dying: false,
      life: rand(4, 10),
      phase: rand(0, Math.PI * 2),
    };
    if (profile.kind === 'drop') {
      // Drops slant as they fall, so spawn across a wider strip to cover the far edge.
      const drift = -profile.wind * this.height;
      p.x = rand(Math.min(0, drift), this.width + Math.max(0, drift));
      p.y = anywhere ? rand(-p.size, this.height) : rand(-160, -p.size);
      p.vy = speed;
      p.vx = speed * profile.wind;
      p.fade = 1;
    } else {
      const jitter = profile.jitter ?? 0;
      p.x = rand(0, this.width);
      p.y = rand(0, this.height);
      p.vx = speed * (profile.wind + rand(-jitter, jitter));
      p.vy = -speed * (profile.rise ?? 0);
    }
    return p;
  }

  private update(dt: number, t: number): void {
    const survivors: Particle[] = [];
    for (const p of this.particles) {
      p.fade = p.dying ? p.fade - dt * 1.4 : Math.min(1, p.fade + dt * 1.2);
      if (p.dying && p.fade <= 0) continue;

      if (p.profile.kind === 'drop') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > this.height) {
          if (p.profile.splash && !this.reducedMotion) this.splash(p.x);
          continue;
        }
      } else {
        p.life -= dt;
        if (p.life <= 0) p.dying = true;
        p.x += (p.vx + Math.sin(t * 1.3 + p.phase) * 10) * dt;
        p.y += (p.vy + Math.cos(t * 0.9 + p.phase) * 6) * dt;
        if (p.x < -10 || p.x > this.width + 10 || p.y < -10 || p.y > this.height + 10) continue;
      }
      survivors.push(p);
    }
    this.particles = survivors;

    for (const s of this.splashes) {
      s.vy += 1400 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.splashes = this.splashes.filter((s) => s.life > 0);
  }

  private splash(x: number): void {
    if (Math.random() > 0.35) return;
    for (let i = 0; i < 2; i++) {
      this.splashes.push({ x, y: this.height - 1, vx: rand(-70, 70), vy: -rand(120, 260), life: rand(0.2, 0.35) });
    }
  }

  private colorFor(profile: Profile): string {
    const [r, g, b] = this.tint.map((c, i) => Math.round(c * profile.tint + (WHITE[i] ?? 255) * (1 - profile.tint)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private draw(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;

    const colors = new Map<Profile, string>();
    for (const p of this.particles) {
      let color = colors.get(p.profile);
      if (!color) {
        color = this.colorFor(p.profile);
        colors.set(p.profile, color);
      }
      ctx.globalAlpha = p.alpha * p.fade;
      if (p.profile.kind === 'drop') {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.profile.wind * p.size, p.y - p.size);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const rain = PROFILES.rain;
    if (rain && this.splashes.length) {
      ctx.fillStyle = this.colorFor(rain);
      for (const s of this.splashes) {
        ctx.globalAlpha = Math.min(1, s.life * 2.5) * 0.6;
        ctx.fillRect(s.x, s.y, 1.5, 1.5);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
