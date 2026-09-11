import type { AreaId, Checkpoint, Enemy, Platform } from './types';

// The world is deliberately stretched: each new section changes the emotional rhythm,
// not just the scenery. Long quiet spaces are followed by short, intimate encounters.
export const WORLD_WIDTH = 11200;
export const WORLD_HEIGHT = 900;

export const platforms: Platform[] = [
  { x: -180, y: 664, w: 1060, h: 85, moss: true, material: 'stone' },
  { x: 820, y: 604, w: 360, h: 72, moss: true, material: 'stone' },
  { x: 1150, y: 672, w: 420, h: 78, moss: true, material: 'water' },
  { x: 1510, y: 596, w: 430, h: 74, moss: true, material: 'stone' },
  { x: 1880, y: 526, w: 330, h: 68, oneWay: true, material: 'wood' },
  { x: 2160, y: 622, w: 430, h: 78, moss: true, material: 'stone' },
  { x: 2530, y: 568, w: 330, h: 60, oneWay: true, material: 'wood' },
  { x: 2820, y: 664, w: 520, h: 100, moss: true, material: 'stone' },
  { x: 3310, y: 580, w: 340, h: 65, material: 'stone' },
  { x: 3600, y: 504, w: 320, h: 56, moss: true, oneWay: true, material: 'wood' },
  { x: 3890, y: 626, w: 450, h: 110, moss: true, material: 'stone' },
  { x: 4300, y: 566, w: 310, h: 60, material: 'stone' },
  { x: 4570, y: 636, w: 430, h: 110, moss: true, material: 'stone' },
  { x: 4960, y: 548, w: 350, h: 64, moss: true, material: 'wood' },
  { x: 5270, y: 640, w: 450, h: 130, moss: true, material: 'stone' },
  { x: 5680, y: 570, w: 360, h: 65, material: 'stone' },
  { x: 6010, y: 640, w: 420, h: 120, moss: true, material: 'stone' },
  { x: 6380, y: 566, w: 320, h: 64, moss: true, oneWay: true, material: 'wood' },

  // THE ARCHIVE — narrow ledges and deliberate empty gaps.
  { x: 6680, y: 654, w: 420, h: 150, moss: true, material: 'stone' },
  { x: 7090, y: 570, w: 260, h: 58, material: 'wood' },
  { x: 7380, y: 650, w: 300, h: 140, material: 'stone' },
  { x: 7700, y: 535, w: 300, h: 60, oneWay: true, material: 'wood' },
  { x: 8020, y: 640, w: 360, h: 130, moss: true, material: 'stone' },

  // THE MIRROR WARD — platforms are staggered so the player repeatedly sees spaces behind them.
  { x: 8400, y: 575, w: 300, h: 64, material: 'stone' },
  { x: 8710, y: 660, w: 360, h: 130, material: 'stone' },
  { x: 9100, y: 520, w: 280, h: 58, oneWay: true, material: 'wood' },
  { x: 9400, y: 610, w: 330, h: 90, moss: true, material: 'stone' },

  // THE LAST VESTIBULE — a long, almost silent approach to the final chamber.
  { x: 9740, y: 675, w: 420, h: 100, moss: true, material: 'stone' },
  { x: 10160, y: 570, w: 300, h: 60, material: 'stone' },
  { x: 10480, y: 650, w: 300, h: 120, material: 'stone' },
  { x: 10800, y: 575, w: 360, h: 200, moss: true, material: 'stone' },
];

export const checkpoints: Checkpoint[] = [
  { x: 170, y: 664, area: 'THE THRESHOLD', activated: false },
  { x: 980, y: 604, area: 'THE HOLLOW', activated: false },
  { x: 1990, y: 526, area: 'SHIFTING HALL', activated: false },
  { x: 2940, y: 664, area: 'THE SUNKEN GARDEN', activated: false },
  { x: 3740, y: 504, area: 'THE CHAPEL', activated: false },
  { x: 4730, y: 636, area: 'THE DESCENT', activated: false },
  { x: 5800, y: 570, area: 'BELL CHAMBER', activated: false },
  { x: 6970, y: 654, area: 'THE ARCHIVE', activated: false },
  { x: 8120, y: 640, area: 'THE ARCHIVE', activated: false },
  { x: 8890, y: 660, area: 'THE MIRROR WARD', activated: false },
  { x: 9820, y: 675, area: 'THE LAST VESTIBULE', activated: false },
  { x: 10840, y: 575, area: 'EATER ARENA', activated: false },
];

export function areaAt(x: number): AreaId {
  if (x < 820) return 'THE THRESHOLD';
  if (x < 1580) return 'THE HOLLOW';
  if (x < 2580) return 'SHIFTING HALL';
  if (x < 3420) return 'THE SUNKEN GARDEN';
  if (x < 4300) return 'THE CHAPEL';
  if (x < 5300) return 'THE DESCENT';
  if (x < 6680) return 'BELL CHAMBER';
  if (x < 8400) return 'THE ARCHIVE';
  if (x < 9740) return 'THE MIRROR WARD';
  if (x < 10800) return 'THE LAST VESTIBULE';
  return 'EATER ARENA';
}

export function makeEnemies(): Enemy[] {
  return [
    { id: 1, kind: 'hollow', x: 1020, y: 547, w: 36, h: 57, vx: 0, vy: 0, hp: 2, maxHp: 2, grounded: false, hitFlash: 0, alert: 0, attackTimer: 0, attackWindup: 0, dead: false, phase: 0 },
    { id: 2, kind: 'skitter', x: 1390, y: 642, w: 48, h: 30, vx: 0, vy: 0, hp: 2, maxHp: 2, grounded: false, hitFlash: 0, alert: 0, attackTimer: .5, attackWindup: 0, dead: false, phase: .4 },
    { id: 3, kind: 'hollow', x: 1730, y: 539, w: 36, h: 57, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: .8, attackWindup: 0, dead: false, phase: 1 },
    { id: 4, kind: 'watcher', x: 2350, y: 564, w: 46, h: 58, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1, attackWindup: 0, dead: false, phase: 2 },
    { id: 5, kind: 'hollow', x: 3040, y: 607, w: 36, h: 57, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.2, attackWindup: 0, dead: false, phase: 3 },
    { id: 6, kind: 'warden', x: 4050, y: 476, w: 92, h: 150, vx: 0, vy: 0, hp: 7, maxHp: 7, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2.4, attackWindup: 0, dead: false, phase: 1 },
    { id: 7, kind: 'skitter', x: 4880, y: 606, w: 48, h: 30, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1, attackWindup: 0, dead: false, phase: 0 },
    { id: 8, kind: 'watcher', x: 6120, y: 508, w: 46, h: 58, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.5, attackWindup: 0, dead: false, phase: 0 },

    // The new areas use enemies as pressure around the character encounters rather than constant combat.
    { id: 10, kind: 'watcher', x: 7280, y: 512, w: 46, h: 58, vx: 0, vy: 0, hp: 4, maxHp: 4, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.8, attackWindup: 0, dead: false, phase: .8 },
    { id: 11, kind: 'hollow', x: 7900, y: 578, w: 36, h: 57, vx: 0, vy: 0, hp: 4, maxHp: 4, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.1, attackWindup: 0, dead: false, phase: 1.4 },
    { id: 12, kind: 'watcher', x: 8540, y: 517, w: 46, h: 58, vx: 0, vy: 0, hp: 4, maxHp: 4, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.3, attackWindup: 0, dead: false, phase: 2.1 },
    { id: 13, kind: 'skitter', x: 9280, y: 580, w: 48, h: 30, vx: 0, vy: 0, hp: 4, maxHp: 4, grounded: false, hitFlash: 0, alert: 0, attackTimer: .9, attackWindup: 0, dead: false, phase: 2.8 },
    { id: 14, kind: 'hollow', x: 10020, y: 618, w: 36, h: 57, vx: 0, vy: 0, hp: 4, maxHp: 4, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.6, attackWindup: 0, dead: false, phase: 3.4 },
    { id: 15, kind: 'warden', x: 10360, y: 420, w: 92, h: 150, vx: 0, vy: 0, hp: 9, maxHp: 9, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2.8, attackWindup: 0, dead: false, phase: 3.9 },

    { id: 9, kind: 'eater', x: 10920, y: 500, w: 132, h: 150, vx: 0, vy: 0, hp: 14, maxHp: 14, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2, attackWindup: 0, dead: false, phase: 1 },
  ];
}