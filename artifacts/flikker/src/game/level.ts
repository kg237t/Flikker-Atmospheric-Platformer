import type { AreaId, Checkpoint, Enemy, Platform } from './types';

export const WORLD_WIDTH = 6200;
export const WORLD_HEIGHT = 900;

export const platforms: Platform[] = [
  { x: -180, y: 664, w: 980, h: 85, moss: true },
  { x: 880, y: 612, w: 310, h: 72, moss: true },
  { x: 1290, y: 694, w: 330, h: 75 },
  { x: 1680, y: 596, w: 380, h: 74, moss: true },
  { x: 2110, y: 530, w: 270, h: 68 },
  { x: 2430, y: 650, w: 300, h: 78, moss: true },
  { x: 2770, y: 585, w: 240, h: 60 },
  { x: 3060, y: 700, w: 450, h: 100, moss: true },
  { x: 3580, y: 590, w: 300, h: 65 },
  { x: 3960, y: 505, w: 240, h: 56, moss: true },
  { x: 4300, y: 650, w: 400, h: 110 },
  { x: 4790, y: 590, w: 230, h: 60 },
  { x: 5110, y: 665, w: 1090, h: 150, moss: true },
];
export const checkpoints: Checkpoint[] = [
  { x: 170, y: 664, area: 'THE THRESHOLD', activated: false },
  { x: 980, y: 612, area: 'THE HOLLOW', activated: false },
  { x: 2200, y: 530, area: 'SHIFTING HALL', activated: false },
  { x: 3250, y: 700, area: 'THE WILDERNESS', activated: false },
  { x: 4430, y: 650, area: 'THE DESCENT', activated: false },
  { x: 5400, y: 665, area: 'EATER ARENA', activated: false },
];

export function areaAt(x: number): AreaId {
  if (x < 820) return 'THE THRESHOLD';
  if (x < 1640) return 'THE HOLLOW';
  if (x < 2780) return 'SHIFTING HALL';
  if (x < 3900) return 'THE WILDERNESS';
  if (x < 5100) return 'THE DESCENT';
  return 'EATER ARENA';
}
export function makeEnemies(): Enemy[] {
  return [
    { id: 1, kind: 'hollow', x: 1050, y: 555, w: 34, h: 57, vx: 0, vy: 0, hp: 2, maxHp: 2, grounded: false, hitFlash: 0, alert: 0, attackTimer: 0, attackWindup: 0, dead: false },
    { id: 2, kind: 'hollow', x: 1810, y: 539, w: 34, h: 57, vx: 0, vy: 0, hp: 2, maxHp: 2, grounded: false, hitFlash: 0, alert: 0, attackTimer: .5, attackWindup: 0, dead: false },
    { id: 3, kind: 'watcher', x: 2500, y: 592, w: 44, h: 58, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1, attackWindup: 0, dead: false },
    { id: 4, kind: 'hollow', x: 3350, y: 641, w: 34, h: 59, vx: 0, vy: 0, hp: 2, maxHp: 2, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2, attackWindup: 0, dead: false },
    { id: 5, kind: 'watcher', x: 3810, y: 531, w: 44, h: 59, vx: 0, vy: 0, hp: 3, maxHp: 3, grounded: false, hitFlash: 0, alert: 0, attackTimer: 1.5, attackWindup: 0, dead: false },
    { id: 6, kind: 'eater', x: 5650, y: 515, w: 116, h: 150, vx: 0, vy: 0, hp: 9, maxHp: 9, grounded: false, hitFlash: 0, alert: 0, attackTimer: 2, attackWindup: 0, dead: false },
  ];
}