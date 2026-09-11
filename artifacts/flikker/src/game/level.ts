import type { AreaId, Checkpoint, Enemy, Platform } from './types';

export const WORLD_WIDTH = 8200;
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
  { x: 6680, y: 654, w: 1420, h: 150, moss: true, material: 'stone' },
];
export const checkpoints: Checkpoint[] = [
  { x: 170, y: 664, area: 'THE THRESHOLD', activated: false },
  { x: 980, y: 604, area: 'THE HOLLOW', activated: false },
  { x: 1990, y: 526, area: 'SHIFTING HALL', activated: false },
  { x: 2940, y: 664, area: 'THE SUNKEN GARDEN', activated: false },
  { x: 3740, y: 504, area: 'THE CHAPEL', activated: false },
  { x: 4730, y: 636, area: 'THE DESCENT', activated: false },
  { x: 5800, y: 570, area: 'BELL CHAMBER', activated: false },
  { x: 7050, y: 654, area: 'EATER ARENA', activated: false },
];

export function areaAt(x: number): AreaId {
  if (x < 820) return 'THE THRESHOLD';
  if (x < 1580) return 'THE HOLLOW';
  if (x < 2580) return 'SHIFTING HALL';
  if (x < 3420) return 'THE SUNKEN GARDEN';
  if (x < 4300) return 'THE CHAPEL';
  if (x < 5300) return 'THE DESCENT';
  if (x < 6680) return 'BELL CHAMBER';
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
    { id: 9, kind: 'eater', x: 7390, y: 504, w: 132, h: 150, vx: 0, vy: 0, hp: 12, maxHp: 12, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2, attackWindup: 0, dead: false, phase: 1 },
  ];
}