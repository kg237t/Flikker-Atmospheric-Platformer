export type GameMode = 'title' | 'playing' | 'paused' | 'ending';
export type AreaId = 'THE THRESHOLD' | 'THE HOLLOW' | 'SHIFTING HALL' | 'THE WILDERNESS' | 'THE DESCENT' | 'EATER ARENA';

export interface Vec2 { x: number; y: number }
export interface Particle extends Vec2 {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity?: number;
}
export interface Enemy {
  id: number;
  kind: 'hollow' | 'watcher' | 'eater';
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  grounded: boolean;
  hitFlash: number;
  alert: number;
  attackTimer: number;
  attackWindup: number;
  dead: boolean;
}
export interface Platform { x: number; y: number; w: number; h: number; moss?: boolean; }
export interface Checkpoint { x: number; y: number; area: AreaId; activated: boolean; }
export interface GameSettings { reducedFlicker: boolean; screenShake: boolean; brightness: number; volume: number; }
export interface InputState { left: boolean; right: boolean; jump: boolean; dash: boolean; attack: boolean; burst: boolean; pause: boolean; }
export interface Player extends Vec2 {
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  dashTimer: number;
  dashCooldown: number;
  attackTimer: number;
  attackCooldown: number;
  burstTimer: number;
  burstCooldown: number;
  health: number;
  maxHealth: number;
  lantern: number;
  maxLantern: number;
  invuln: number;
  hurtFlash: number;
}
export interface GameSnapshot {
  mode: GameMode;
  area: AreaId;
  lantern: number;
  health: number;
  bossHealth: number;
  bossMaxHealth: number;
  checkpoint: number;
  toast: string;
}