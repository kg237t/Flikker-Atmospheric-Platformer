import { GameAudio } from './audio';
import { areaAt, checkpoints, makeEnemies, platforms, WORLD_HEIGHT, WORLD_WIDTH } from './level';
import type { AreaId, Enemy, GameSettings, GameSnapshot, InputState, Particle, Player, Platform } from './types';

const VW = 1280;
const VH = 720;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const playerStart = (): Player => ({
  x: 150, y: 570, w: 30, h: 54, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0,
  dashTimer: 0, dashCooldown: 0, attackTimer: 0, attackCooldown: 0, burstTimer: 0, burstCooldown: 0,
  health: 4, maxHealth: 4, lantern: 100, maxLantern: 100, invuln: 0, hurtFlash: 0, landTimer: 0, runTime: 0, hurtTimer: 0,
});

type StoryBeat = { x: number; kicker: string; line: string; duration: number };
const storyBeats: StoryBeat[] = [
  { x: 0, kicker: 'THE FIRST WAKING', line: 'The lantern is warm. Someone was holding it before you.', duration: 4.8 },
  { x: 720, kicker: 'THE HOLLOW', line: 'A bell rope sways without wind. The keeper left in a hurry.', duration: 3.8 },
  { x: 1560, kicker: 'THE SHIFTING HALL', line: 'Another bearer marked the stones: not a map. A warning.', duration: 4.4 },
  { x: 2740, kicker: 'THE SUNKEN GARDEN', line: 'Roots drink from the old road. Something underneath remembers.', duration: 4.2 },
  { x: 3420, kicker: 'THE CHAPEL', line: 'Three lanterns. Three names scratched away.', duration: 4.2 },
  { x: 4300, kicker: 'THE DESCENT', line: 'The ghosts point down. They do not follow.', duration: 3.8 },
  { x: 5700, kicker: 'THE BELL CHAMBER', line: 'The bell does not call the dead. It keeps them here.', duration: 4.2 },
];

export class FlikkerEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player = playerStart();
  enemies: Enemy[] = makeEnemies();
  particles: Particle[] = [];
  input: InputState = { left: false, right: false, jump: false, dash: false, attack: false, burst: false, pause: false };
  settings: GameSettings = { reducedFlicker: false, screenShake: true, brightness: 1, volume: .42, touchControls: true };
  camera = { x: 0, y: 0, shake: 0 };
  time = 0;
  last = 0;
  hitStop = 0;
  mode: 'title' | 'playing' | 'paused' | 'ending' = 'title';
  toast = 'The light remembers the way';
  toastTimer = 4;
  checkpoint = 0;
  bossDefeated = false;
  storyKicker = 'THE FIRST WAKING';
  storyLine = storyBeats[0].line;
  storyTimer = 0;
  storyBeat = 0;
  ghostGesture: 'wait' | 'point' | 'watch' | 'vanish' = 'wait';
  endingTimer = 0;
  onSnapshot: (snapshot: GameSnapshot) => void = () => {};
  private audio = new GameAudio();
  private raf = 0;
  private lastArea: AreaId = 'THE THRESHOLD';
  private burstRing = 0;
  private snapshotClock = 0;
  private lastSnapshotMode = this.mode;
  private readonly dustSeed = Array.from({ length: 72 }, (_, index) => ({ x: (index * 83) % VW, y: 50 + ((index * 47) % 430), speed: .3 + (index % 5) * .12 }));

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.ctx = context;
    this.resize();
  }
  start() {
    this.resize();
    window.addEventListener('resize', this.resize);
    this.raf = requestAnimationFrame(this.loop);
  }
  destroy() {
    window.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.raf);
  }
  resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
  };
  begin() {
    this.audio.init();
    this.mode = 'playing';
    this.player = playerStart();
    this.enemies = makeEnemies();
    this.particles = [];
    this.checkpoint = 0;
    this.bossDefeated = false;
    this.lastArea = 'THE THRESHOLD';
    this.camera.x = 0;
    this.toast = 'The light remembers the way';
    this.toastTimer = 3.4;
    this.storyBeat = 0;
    this.storyTimer = storyBeats[0].duration;
    this.storyKicker = storyBeats[0].kicker;
    this.storyLine = storyBeats[0].line;
    this.endingTimer = 0;
    this.addDust(180, 610, 28, '#b7ae91');
    this.onSnapshot(this.getSnapshot());
  }
  setMode(mode: 'title' | 'playing' | 'paused' | 'ending') { this.mode = mode; }
  setSettings(settings: GameSettings) { this.settings = settings; this.audio.setVolume(settings.volume); }
  setInput(input: Partial<InputState>) { this.input = { ...this.input, ...input }; }
  touchAction(action: keyof InputState, pressed = true) {
    if (action === 'pause') {
      this.mode = this.mode === 'paused' ? 'playing' : 'paused';
      return;
    }
    this.setInput({ [action]: pressed });
  }
  getSnapshot(): GameSnapshot {
    const boss = this.enemies.find((enemy) => (enemy.kind === 'warden' || enemy.kind === 'eater') && !enemy.dead)
      ?? this.enemies.find((enemy) => enemy.kind === 'eater');
    const ghost = this.ghostState();
    return {
      mode: this.mode, area: areaAt(this.player.x), lantern: this.player.lantern, health: this.player.health,
      bossHealth: boss?.hp ?? 0, bossMaxHealth: boss?.maxHp ?? 9, checkpoint: this.checkpoint,
      toast: this.toastTimer > 0 ? this.toast : '', storyKicker: this.storyKicker, storyLine: this.storyLine,
      storyTimer: this.storyTimer, storyBeat: this.storyBeat, ghostVisible: ghost.visible, ghostGesture: this.ghostGesture,
      progress: clamp(this.player.x / (WORLD_WIDTH - 500), 0, 1),
    };
  }
  private loop = (now: number) => {
    const dt = Math.min((now - this.last) / 1000 || .016, .034);
    this.last = now;
    this.time += dt;
    if (this.mode === 'playing') this.update(dt);
    this.render();
    this.snapshotClock += dt;
    if (this.snapshotClock > .075 || this.mode !== this.lastSnapshotMode) {
      this.snapshotClock = 0;
      this.lastSnapshotMode = this.mode;
      this.onSnapshot(this.getSnapshot());
    }
    this.raf = requestAnimationFrame(this.loop);
  };
  private update(dt: number) {
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    const p = this.player;
    const wasGrounded = p.grounded;
    p.coyote = p.grounded ? .12 : Math.max(0, p.coyote - dt);
    p.jumpBuffer = this.input.jump ? .12 : Math.max(0, p.jumpBuffer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.burstCooldown = Math.max(0, p.burstCooldown - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.burstTimer = Math.max(0, p.burstTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.landTimer = Math.max(0, (p.landTimer ?? 0) - dt);
    p.hurtTimer = Math.max(0, (p.hurtTimer ?? 0) - dt);
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.storyTimer > 0) this.storyTimer -= dt;
    this.advanceStory();

    if (this.input.jump && p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -635; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0;
      this.audio.tone(250, .12, 'triangle', .05, 90); this.addDust(p.x + 12, p.y + p.h, 5, '#bfc3b2');
    }
    if (!this.input.jump && p.vy < -280) p.vy += 990 * dt;
    const move = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (move) { p.facing = move; p.vx = lerp(p.vx, move * 255, Math.min(1, dt * 12)); p.runTime = (p.runTime ?? 0) + dt * 10; }
    else { p.vx = lerp(p.vx, 0, Math.min(1, dt * 10)); p.runTime = 0; }
    if (this.input.dash && p.dashCooldown <= 0) {
      p.dashTimer = .17; p.dashCooldown = .76; p.vx = p.facing * 610; p.vy = 0;
      this.audio.dash(); this.addDust(p.x + (p.facing < 0 ? p.w : 0), p.y + p.h - 5, 12, '#d7d0a0');
    }
    if (p.dashTimer > 0) { p.dashTimer -= dt; p.vx = p.facing * 610; p.vy = 0; }
    else p.vy += 1650 * dt;
    if (this.input.attack && p.attackCooldown <= 0) {
      p.attackTimer = .27; p.attackCooldown = .36; this.audio.attack();
      this.addArc(p.x + p.facing * 32, p.y + 25, '#e8c986'); this.attackEnemies();
    }
    if (this.input.burst && p.burstCooldown <= 0 && p.lantern >= 20) {
      p.burstTimer = .46; p.burstCooldown = 1.18; p.lantern = Math.max(0, p.lantern - 18);
      this.burstRing = 1; this.audio.burst(); this.addBurst(p.x + p.w / 2, p.y + 25); this.flashEnemies();
    }
    p.lantern = clamp(p.lantern - dt * (.54 + (this.lastArea === 'SHIFTING HALL' ? .16 : 0)), 0, p.maxLantern);
    if (p.grounded && Math.abs(p.vx) > 36 && Math.random() < dt * 4.2) this.addDust(p.x + 12, p.y + p.h, 1, '#898f85');

    const prevX = p.x;
    const prevY = p.y;
    p.x += p.vx * dt;
    p.x = clamp(p.x, -48, WORLD_WIDTH - p.w - 20);
    p.y += p.vy * dt;
    p.grounded = false;
    this.resolveVertical(p, prevY, platforms);
    if (p.y > WORLD_HEIGHT) this.respawn();
    if (!wasGrounded && p.grounded) { p.landTimer = .16; this.addDust(p.x + 12, p.y + p.h, 9, '#a3a497'); this.audio.tone(105, .08, 'triangle', .035, -30); }
    if (Math.abs(p.x - prevX) > 0 && p.x <= 0) p.vx = Math.max(0, p.vx);

    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateCheckpoints();
    this.updateGhost(dt);
    this.burstRing = Math.max(0, this.burstRing - dt * 2.7);
    const area = areaAt(p.x);
    if (area !== this.lastArea) { this.lastArea = area; this.toast = area; this.toastTimer = 2.8; this.addDust(p.x, p.y, 20, '#aaa98e'); }
    const eater = this.enemies.find((enemy) => enemy.kind === 'eater');
    if (eater?.dead && !this.bossDefeated) {
      this.bossDefeated = true; this.storyKicker = 'THE LIGHT REMEMBERS'; this.storyLine = 'Inside the Eater: a name, still warm. “Mara. Last bearer.”';
      this.storyTimer = 6.5; this.storyBeat = 7; this.toast = 'THE CHAPEL OPENS'; this.toastTimer = 4;
      this.endingTimer = 7; this.camera.shake = this.settings.screenShake ? 1 : 0; this.addBurst(eater.x, eater.y + 70);
      try { localStorage.setItem('flikker-progress', 'chapel-open'); } catch { /* storage is optional */ }
    }
    if (this.bossDefeated) {
      this.endingTimer -= dt;
      if (this.endingTimer <= 0) this.mode = 'ending';
    }
    this.camera.x = lerp(this.camera.x, clamp(p.x - VW * .35, 0, WORLD_WIDTH - VW), Math.min(1, dt * 4.2));
    this.camera.shake = Math.max(0, this.camera.shake - dt * 2.7);
    this.audio.tension(p.lantern / p.maxLantern);
    this.input.jump = false; this.input.dash = false; this.input.attack = false; this.input.burst = false;
  }
  private resolveVertical(body: { x: number; y: number; w: number; h: number; vy: number; grounded: boolean }, previousY: number, surfaces: Platform[]) {
    if (body.vy < 0) return;
    let landing: Platform | null = null;
    for (const platform of surfaces) {
      const y = this.shiftedPlatformY(platform.x, platform.y);
      const crossed = previousY + body.h <= y + 4 && body.y + body.h >= y;
      if (crossed && body.x + body.w > platform.x + 3 && body.x < platform.x + platform.w - 3 && (!platform.oneWay || previousY + body.h <= y + 2)) {
        if (!landing || y < this.shiftedPlatformY(landing.x, landing.y)) landing = platform;
      }
    }
    if (landing) {
      body.y = this.shiftedPlatformY(landing.x, landing.y) - body.h;
      body.vy = 0; body.grounded = true;
    }
  }
  private advanceStory() {
    if (this.bossDefeated || this.storyBeat >= storyBeats.length - 1) return;
    const next = storyBeats[this.storyBeat + 1];
    if (this.player.x >= next.x) {
      this.storyBeat += 1; this.storyKicker = next.kicker; this.storyLine = next.line; this.storyTimer = next.duration;
      this.toast = next.kicker; this.toastTimer = 2.2; this.addDust(this.player.x, this.player.y, 15, '#c1b58e');
      this.audio.tone(184, .3, 'sine', .04, 50);
    }
  }
  private updateCheckpoints() {
    for (let index = 0; index < checkpoints.length; index += 1) {
      if (this.player.x > checkpoints[index].x - 100 && index > this.checkpoint) {
        this.checkpoint = index; checkpoints[index].activated = true; this.player.health = this.player.maxHealth;
        this.player.lantern = Math.min(100, this.player.lantern + 35);
        this.toast = `checkpoint · ${checkpoints[index].area.toLowerCase()}`; this.toastTimer = 2.7;
        this.addBurst(checkpoints[index].x, checkpoints[index].y - 45);
      }
    }
  }
  private respawn() {
    const point = checkpoints[this.checkpoint];
    this.player.x = point.x; this.player.y = point.y - this.player.h - 6; this.player.vx = 0; this.player.vy = 0;
    this.player.health = this.player.maxHealth; this.player.lantern = Math.max(42, this.player.lantern);
    this.player.invuln = .8; this.toast = 'The lantern pulls you back'; this.toastTimer = 2.2; this.addDust(this.player.x, this.player.y + 45, 18, '#d0bd86');
  }
  private updateEnemies(dt: number) {
    const p = this.player;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackTimer -= dt;
      enemy.attackWindup = Math.max(0, enemy.attackWindup - dt);
      enemy.phase = (enemy.phase ?? 0) + dt;
      const distance = p.x - enemy.x;
      const illuminated = Math.hypot(p.x - enemy.x, p.y - enemy.y) < 218 + p.lantern * 1.45 || p.burstTimer > 0;
      if (enemy.kind !== 'eater' && enemy.kind !== 'warden' && !illuminated) { enemy.vx = lerp(enemy.vx, 0, dt * 3); continue; }
      enemy.facing = distance < 0 ? -1 : 1;
      if (enemy.kind === 'eater' || enemy.kind === 'warden') {
        if (Math.abs(distance) < 480) enemy.alert = 1;
        const isWarden = enemy.kind === 'warden';
        if (enemy.attackTimer < 0) {
          enemy.attackWindup = isWarden ? .78 : .62;
          enemy.attackTimer = isWarden ? 2.15 : 2.5;
          this.toast = isWarden ? 'THE BELL WARDEN TURNS' : 'THE EATER STIRS';
          this.toastTimer = .8; this.audio.boss();
        }
        if (enemy.attackWindup <= 0 && enemy.attackTimer > (isWarden ? 1.2 : 2.35) && Math.abs(distance) < (isWarden ? 600 : 540)) {
          this.hurtPlayer(1, Math.sign(distance) || 1);
        }
        enemy.vulnerable = p.burstTimer > 0 || enemy.attackWindup > .08;
        enemy.vx = lerp(enemy.vx, clamp(distance * (isWarden ? .55 : .42), -130, 130), dt * 1.6);
      } else if (enemy.kind === 'watcher') {
        enemy.vx = lerp(enemy.vx, 0, dt * 4);
        if (enemy.attackTimer < 0 && Math.abs(distance) < 440) { enemy.attackTimer = 2.6; enemy.attackWindup = .65; this.toast = 'A WATCHER TURNS'; this.toastTimer = .65; }
        if (enemy.attackWindup > .18 && enemy.attackWindup < .22 && Math.abs(distance) < 430) this.hurtPlayer(1, Math.sign(distance));
        enemy.vulnerable = enemy.attackWindup > .3;
      } else if (enemy.kind === 'skitter') {
        enemy.vx = lerp(enemy.vx, clamp(distance * 1.4, -170, 170), dt * 2.8);
        if (enemy.attackTimer < 0 && Math.abs(distance) < 115) { enemy.attackTimer = 1.6; enemy.attackWindup = .25; }
        if (enemy.attackWindup <= 0 && enemy.attackTimer > 1.35 && Math.abs(distance) < 120) this.hurtPlayer(1, Math.sign(distance));
        enemy.vulnerable = enemy.hitFlash > 0;
      } else {
        enemy.alert = clamp(enemy.alert + dt * .9, 0, 1);
        enemy.vx = lerp(enemy.vx, clamp(distance * .8, -100, 100), dt * 1.8);
        if (enemy.attackTimer < 0 && Math.abs(distance) < 80) { enemy.attackTimer = 1.7; enemy.attackWindup = .32; }
        if (enemy.attackWindup <= 0 && enemy.attackTimer > 1.4 && Math.abs(distance) < 88) this.hurtPlayer(1, Math.sign(distance));
        enemy.vulnerable = true;
      }
      const previousY = enemy.y;
      enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; enemy.vy += 1500 * dt; enemy.grounded = false;
      enemy.x = clamp(enemy.x, 0, WORLD_WIDTH - enemy.w);
      this.resolveVertical(enemy, previousY, platforms);
      if (enemy.y > WORLD_HEIGHT) { enemy.y = 0; enemy.vy = 0; }
      if (enemy.kind !== 'eater' && overlaps(p, enemy) && p.invuln <= 0) this.hurtPlayer(1, Math.sign(p.x - enemy.x) || 1);
    }
  }
  private hurtPlayer(damage: number, direction: number) {
    const p = this.player;
    if (p.invuln > 0) return;
    p.health -= damage; p.invuln = .85; p.hurtFlash = .35; p.hurtTimer = .3; p.vx = direction * 290; p.vy = -270;
    this.camera.shake = this.settings.screenShake ? .75 : 0; this.hitStop = .075; this.audio.hurt();
    this.addSparks(p.x, p.y + 20, '#d3ddd0', 8);
    if (p.health <= 0) this.respawn();
  }
  private attackEnemies() {
    const p = this.player;
    const hitbox = { x: p.facing > 0 ? p.x + 12 : p.x - 58, y: p.y + 5, w: 72, h: 50 };
    for (const enemy of this.enemies) {
      if (enemy.dead || !overlaps(hitbox, enemy)) continue;
      if ((enemy.kind === 'eater' || enemy.kind === 'warden') && !enemy.vulnerable) continue;
      enemy.hp -= 1; enemy.hitFlash = .2; enemy.vx = p.facing * 330; enemy.vy = -245;
      this.hitStop = .09; this.camera.shake = this.settings.screenShake ? .3 : 0; this.audio.hit();
      this.addSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.kind === 'eater' || enemy.kind === 'warden' ? '#cce7db' : '#e4c279', 13);
      if (enemy.hp <= 0) {
        enemy.dead = true; this.addBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        this.toast = enemy.kind === 'eater' ? 'THE HUNGER BREAKS' : enemy.kind === 'warden' ? 'THE BELL GOES SILENT' : 'THE DARK LETS GO';
        this.toastTimer = 1.7;
      }
    }
  }
  private flashEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.dead && Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) < 320) {
         enemy.alert = 1; enemy.vulnerable = true;
         if (enemy.kind === 'eater' || enemy.kind === 'warden') enemy.attackWindup = .01;
      }
    }
  }
  private shiftedPlatformY(x: number, y: number) {
    if (x > 1600 && x < 3000) return y + Math.sin(this.time * .9 + x * .012) * 7;
    return y;
  }
  private ghostState() {
    const anchors = [340, 980, 1920, 2880, 3740, 4780, 5850, 7040];
    let index = 0;
    for (let i = 0; i < anchors.length; i += 1) if (this.player.x > anchors[i] - 180) index = i;
    const x = anchors[index];
    const near = Math.abs(this.player.x - x);
    const visible = !this.bossDefeated && this.player.x > x - 230 && this.player.x < x + 175;
    this.ghostGesture = near < 70 ? 'watch' : near < 135 ? 'wait' : 'point';
    if (near < 35) this.ghostGesture = 'vanish';
    return { x, y: 465 - (index % 2) * 56, visible };
  }
  private updateGhost(dt: number) {
    const ghost = this.ghostState();
    if (ghost.visible && Math.random() < dt * .9) this.addMote(ghost.x, ghost.y + 5);
  }
  private addMote(x: number, y: number) {
    this.particles.push({ x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 38, vx: (Math.random() - .5) * 10, vy: -8 - Math.random() * 12, life: .6 + Math.random() * .7, maxLife: 1.3, size: 1 + Math.random() * 1.8, color: '#b8dfce', gravity: -8 });
  }
  private addDust(x: number, y: number, count: number, color = '#a5a99a') {
    for (let i = 0; i < count; i += 1) this.particles.push({ x: x + (Math.random() - .5) * 25, y: y + Math.random() * 8, vx: (Math.random() - .5) * 25, vy: -Math.random() * 24, life: .5 + Math.random() * .7, maxLife: 1.1, size: 1 + Math.random() * 2.3, color, gravity: -5 });
  }
  private addSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i += 1) this.particles.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, life: .2 + Math.random() * .3, maxLife: .5, size: 1 + Math.random() * 2, color });
  }
  private addArc(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i += 1) this.particles.push({ x: x + Math.cos(i / 9 * Math.PI) * 23, y: y - Math.sin(i / 9 * Math.PI) * 20, vx: 0, vy: 0, life: .16, maxLife: .16, size: 2.2, color, gravity: 0 });
  }
  private addBurst(x: number, y: number) {
    for (let i = 0; i < 30; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 35 + Math.random() * 145;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .5 + Math.random() * .45, maxLife: .95, size: 1 + Math.random() * 2.6, color: Math.random() > .3 ? '#e8cc8a' : '#c8e3dc' });
    }
  }
  private updateParticles(dt: number) {
    this.particles = this.particles.filter((particle) => particle.life > 0).slice(-260);
    for (const particle of this.particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += (particle.gravity ?? 280) * dt; }
  }
  private render() {
    const ctx = this.ctx;
    const scale = Math.min(this.canvas.width / VW, this.canvas.height / VH);
    const ox = (this.canvas.width - VW * scale) / 2; const oy = (this.canvas.height - VH * scale) / 2;
    ctx.save(); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.translate(ox, oy); ctx.scale(scale, scale);
    const shake = this.settings.screenShake ? this.camera.shake * (Math.random() - .5) * 8 : 0;
    ctx.translate(shake, shake * .45);
    this.drawSky(ctx);
    ctx.save(); ctx.translate(-this.camera.x * .12, 0); this.drawFarRuins(ctx); ctx.restore();
    ctx.save(); ctx.translate(-this.camera.x * .3, 0); this.drawMidRuins(ctx); ctx.restore();
    ctx.save(); ctx.translate(-this.camera.x, 0); this.drawWorld(ctx); ctx.restore();
    this.drawFog(ctx); this.drawDarkness(ctx, ox, oy, scale);
    ctx.restore();
  }
  private drawSky(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, '#08111e'); grad.addColorStop(.48, '#111c27'); grad.addColorStop(1, '#252a27'); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
    const moon = ctx.createRadialGradient(850, 190, 4, 850, 190, 320); moon.addColorStop(0, 'rgba(187,215,207,.16)'); moon.addColorStop(1, 'rgba(187,215,207,0)'); ctx.fillStyle = moon; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(188,201,193,.46)';
    for (const star of this.dustSeed) { const x = (star.x + this.time * star.speed * 4) % VW; const y = star.y + Math.sin(this.time * star.speed + star.x) * 4; ctx.globalAlpha = .12 + (star.x % 5) * .035; ctx.fillRect(x, y, star.x % 7 === 0 ? 2 : 1, 1); }
    ctx.globalAlpha = 1;
  }
  private drawFarRuins(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#101b25';
    for (let x = -300; x < WORLD_WIDTH + 600; x += 240) {
      const h = 130 + ((x * 7) % 150);
      ctx.beginPath(); ctx.moveTo(x, 592); ctx.lineTo(x + 18, 592 - h); ctx.lineTo(x + 76, 592 - h - 20); ctx.lineTo(x + 118, 592 - 80); ctx.lineTo(x + 158, 592); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#18252d'; ctx.fillRect(x + 36, 592 - h + 26, 12, 38); ctx.fillStyle = '#101b25';
    }
    ctx.strokeStyle = 'rgba(142,165,162,.13)'; ctx.lineWidth = 3;
    for (let x = 150; x < WORLD_WIDTH; x += 620) { this.arch(ctx, x, 574, 155, 255, 'rgba(142,165,162,.13)'); }
  }
  private drawMidRuins(ctx: CanvasRenderingContext2D) {
    for (let x = -80; x < WORLD_WIDTH + 500; x += 360) {
      const h = 90 + (Math.sin(x * .08) + 1) * 35;
      ctx.fillStyle = '#131d22'; ctx.fillRect(x, 625 - h, 22, h); ctx.fillRect(x + 105, 625 - h * .72, 25, h * .72);
      ctx.fillStyle = '#1c292c'; ctx.fillRect(x - 10, 625 - h, 148, 10);
      ctx.strokeStyle = 'rgba(92,126,116,.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, 625); ctx.quadraticCurveTo(x + 58, 540, x + 111, 625); ctx.stroke();
    }
  }
  private arch(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
    ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - height + 44); ctx.quadraticCurveTo(x + width / 2, y - height - 34, x + width, y - height + 44); ctx.lineTo(x + width, y); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeRect(x + 16, y - 58, width - 32, 42);
  }
  private drawWorld(ctx: CanvasRenderingContext2D) {
    this.drawArchitecture(ctx);
    for (const platform of platforms) this.drawPlatform(ctx, platform);
    this.drawCheckpoints(ctx);
    this.drawGhost(ctx);
    for (const enemy of this.enemies) if (!enemy.dead) this.drawEnemy(ctx, enemy);
    this.drawPlayer(ctx);
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  private drawArchitecture(ctx: CanvasRenderingContext2D) {
    const area = areaAt(this.player.x);
    if (area === 'THE HOLLOW' || area === 'THE THRESHOLD') {
      this.arch(ctx, 520, 662, 190, 290, 'rgba(100,118,111,.34)');
      ctx.fillStyle = '#202d2c'; ctx.fillRect(610, 475, 13, 188); ctx.fillRect(685, 520, 13, 143);
      ctx.strokeStyle = '#6f765f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(615, 474); ctx.lineTo(657, 434); ctx.lineTo(691, 518); ctx.stroke();
    }
    if (area === 'SHIFTING HALL') {
      for (let x = 1720; x < 2940; x += 210) { ctx.fillStyle = '#26302f'; ctx.fillRect(x, 390, 25, 270); ctx.fillRect(x + 125, 430, 19, 230); ctx.strokeStyle = 'rgba(169,148,104,.18)'; ctx.strokeRect(x + 26, 455, 98, 68); }
    }
    if (area === 'THE SUNKEN GARDEN') {
      ctx.strokeStyle = 'rgba(79,108,82,.55)'; ctx.lineWidth = 4;
      for (let x = 3080; x < 3910; x += 88) { ctx.beginPath(); ctx.moveTo(x, 700); ctx.bezierCurveTo(x - 12, 622, x + 30, 574, x + 11, 510); ctx.stroke(); }
      ctx.fillStyle = 'rgba(68,88,67,.3)'; for (let x = 3110; x < 3900; x += 130) ctx.fillRect(x, 450 + (x % 80), 9, 208);
    }
    if (area === 'THE CHAPEL' || area === 'THE DESCENT' || area === 'BELL CHAMBER' || area === 'EATER ARENA') {
      ctx.fillStyle = '#192229'; ctx.fillRect(4300, 290, 18, 360); ctx.fillRect(4660, 250, 20, 400);
      this.arch(ctx, 4840, 665, 230, 375, 'rgba(105,132,126,.32)');
      ctx.strokeStyle = 'rgba(208,181,115,.22)'; ctx.lineWidth = 2; for (let x = 5200; x < 6100; x += 120) { ctx.beginPath(); ctx.arc(x, 650, 15, Math.PI, Math.PI * 2); ctx.stroke(); }
    }
    if (area === 'THE CHAPEL' || area === 'BELL CHAMBER') {
      ctx.fillStyle = 'rgba(49,61,58,.7)';
      for (let x = 3420; x < 4330; x += 220) {
        ctx.fillRect(x, 300, 26, 365);
        ctx.fillRect(x + 118, 350, 18, 315);
        ctx.strokeStyle = 'rgba(178,151,99,.25)';
        ctx.strokeRect(x + 28, 430, 88, 74);
      }
      ctx.strokeStyle = 'rgba(208,181,115,.36)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(5800, 230); ctx.lineTo(5800, 520); ctx.stroke();
      ctx.beginPath(); ctx.arc(5800, 545, 56, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(213,178,101,.18)'; ctx.beginPath(); ctx.arc(5800, 560, 34, 0, Math.PI * 2); ctx.fill();
    }
  }
  private drawGhost(ctx: CanvasRenderingContext2D) {
    const state = this.ghostState();
    if (!state.visible) return;
    const gx = state.x; const gy = state.y + Math.sin(this.time * 1.5) * 5;
    const breath = Math.sin(this.time * 2.2) * 1.5;
    ctx.save(); ctx.translate(gx, gy); ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(0, -14, 3, 0, -14, 88);
    halo.addColorStop(0, 'rgba(213,255,233,.25)'); halo.addColorStop(.42, 'rgba(142,215,195,.08)'); halo.addColorStop(1, 'rgba(142,215,195,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, -14, 88, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .18; ctx.strokeStyle = '#d4f5de'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath(); ctx.arc(0, -17, 40 + i * 8 + breath, Math.PI * .1, Math.PI * .9); ctx.stroke();
    }
    ctx.globalAlpha = .92;
    const robe = ctx.createLinearGradient(0, -18, 0, 47);
    robe.addColorStop(0, '#d5f1df'); robe.addColorStop(.4, '#93c9b5'); robe.addColorStop(1, 'rgba(77,139,126,.08)');
    ctx.fillStyle = robe; ctx.beginPath();
    ctx.moveTo(-23, -7); ctx.quadraticCurveTo(-18, -24, 0, -27); ctx.quadraticCurveTo(18, -24, 23, -7);
    ctx.lineTo(32, 35); ctx.quadraticCurveTo(18, 28, 9, 45); ctx.quadraticCurveTo(0, 29, -9, 45);
    ctx.quadraticCurveTo(-18, 28, -32, 35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(215,250,229,.84)'; ctx.beginPath(); ctx.arc(0, -27, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(25,64,61,.75)'; ctx.beginPath(); ctx.ellipse(0, -25, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecffe9'; ctx.beginPath(); ctx.arc(-3, -26, 1.4, 0, Math.PI * 2); ctx.arc(3, -26, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(221,252,229,.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, -2); ctx.quadraticCurveTo(-30, 5, -38, 18); ctx.moveTo(15, -2); ctx.quadraticCurveTo(29, 3, 38, 15); ctx.stroke();
    ctx.lineCap = 'butt';
    if (this.ghostGesture === 'point') {
      ctx.strokeStyle = '#e5ffe7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(45, -24); ctx.stroke();
      ctx.fillStyle = '#e5ffe7'; ctx.beginPath(); ctx.moveTo(48, -28); ctx.lineTo(40, -25); ctx.lineTo(45, -19); ctx.closePath(); ctx.fill();
    } else if (this.ghostGesture === 'wait') {
      ctx.strokeStyle = 'rgba(229,255,231,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -7, 34 + Math.sin(this.time * 3) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  private drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
    const y = this.shiftedPlatformY(platform.x, platform.y);
    ctx.fillStyle = platform.material === 'water' ? '#263c40' : platform.material === 'wood' ? '#403b32' : '#283238';
    ctx.beginPath(); ctx.moveTo(platform.x, y); ctx.lineTo(platform.x + platform.w, y); ctx.lineTo(platform.x + platform.w - 10, y + platform.h); ctx.lineTo(platform.x + 10, y + platform.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = platform.material === 'water' ? '#4e7771' : '#46534d'; ctx.beginPath(); ctx.moveTo(platform.x - 3, y); ctx.lineTo(platform.x + platform.w + 3, y); ctx.lineTo(platform.x + platform.w - 12, y + 9); ctx.lineTo(platform.x + 15, y + 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = platform.material === 'water' ? 'rgba(154,207,192,.38)' : 'rgba(159,164,140,.2)'; ctx.lineWidth = 1;
    for (let x = platform.x + 28; x < platform.x + platform.w - 12; x += 56) { ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x - 10, y + platform.h - 9); ctx.stroke(); }
    if (platform.moss) {
      ctx.strokeStyle = '#5e735c'; ctx.lineWidth = 2;
      for (let x = platform.x + 15; x < platform.x + platform.w - 14; x += 29) { ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.quadraticCurveTo(x - 3, y - 5, x + 4, y - 13); ctx.stroke(); }
    }
    if (platform.material === 'water') {
      ctx.strokeStyle = 'rgba(181,212,193,.32)'; for (let x = platform.x + 20; x < platform.x + platform.w; x += 63) { ctx.beginPath(); ctx.moveTo(x, y + 25); ctx.quadraticCurveTo(x + 16, y + 20, x + 34, y + 26); ctx.stroke(); }
    }
  }
  private drawCheckpoints(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < checkpoints.length; i += 1) {
      const checkpoint = checkpoints[i]; const active = i <= this.checkpoint;
      ctx.strokeStyle = active ? 'rgba(220,178,98,.75)' : 'rgba(113,132,130,.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(checkpoint.x, checkpoint.y); ctx.lineTo(checkpoint.x, checkpoint.y - 66); ctx.stroke();
      ctx.beginPath(); ctx.arc(checkpoint.x, checkpoint.y - 71, 5 + Math.sin(this.time * 3 + i) * 1.4, 0, Math.PI * 2); ctx.stroke();
      if (active) { ctx.fillStyle = 'rgba(236,193,103,.3)'; ctx.beginPath(); ctx.arc(checkpoint.x, checkpoint.y - 71, 22, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const cx = enemy.x + enemy.w / 2; const cy = enemy.y + enemy.h / 2; const facing = enemy.facing ?? (enemy.vx < 0 ? -1 : 1);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(facing, 1);
    const hit = enemy.hitFlash > 0; const pulse = Math.sin(this.time * 5 + (enemy.phase ?? 0)) * 2;
    const ember = enemy.attackWindup > .05;
    const body = (top: string, bottom: string) => {
      const gradient = ctx.createLinearGradient(0, -enemy.h * .6, 0, enemy.h * .55);
      gradient.addColorStop(0, top); gradient.addColorStop(1, bottom); return gradient;
    };
    if (enemy.kind === 'warden') {
      ctx.fillStyle = 'rgba(220,193,111,.11)'; ctx.beginPath(); ctx.arc(0, -26, 92 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hit ? '#ecdfbd' : body('#516767', '#182a30');
      ctx.beginPath(); ctx.moveTo(-45, 67); ctx.lineTo(-39, -33); ctx.quadraticCurveTo(-30, -70, 0, -78); ctx.quadraticCurveTo(30, -70, 39, -33); ctx.lineTo(45, 67); ctx.lineTo(27, 58); ctx.lineTo(0, 75); ctx.lineTo(-27, 58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111b20'; ctx.beginPath(); ctx.ellipse(0, -39, 29, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a3af91'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -39, 25, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.fillStyle = ember ? '#ef9e62' : '#dbce8e'; ctx.beginPath(); ctx.ellipse(-11, -38, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(11, -38, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ember ? '#ee9864' : '#c6aa68'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(-30, -17); ctx.lineTo(-62, 35); ctx.moveTo(30, -17); ctx.lineTo(62, 35); ctx.stroke();
      ctx.strokeStyle = '#d8c27c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -72, 29, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(224,195,123,.56)'; ctx.fillRect(-6, 9, 12, 58);
      ctx.strokeStyle = 'rgba(218,243,221,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
      if (enemy.vulnerable) { ctx.beginPath(); ctx.arc(0, -22, 78 + pulse, 0, Math.PI * 2); ctx.stroke(); } ctx.setLineDash([]);
    } else if (enemy.kind === 'eater') {
      ctx.fillStyle = 'rgba(214,177,92,.1)'; ctx.beginPath(); ctx.arc(0, -26, 118 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hit ? '#e1eee0' : body('#354b4b', '#101c26');
      ctx.beginPath(); ctx.moveTo(-58, 71); ctx.quadraticCurveTo(-75, 14, -61, -49); ctx.quadraticCurveTo(-46, -91, 0, -100); ctx.quadraticCurveTo(46, -91, 61, -49); ctx.quadraticCurveTo(75, 14, 58, 71); ctx.lineTo(27, 58); ctx.lineTo(0, 78); ctx.lineTo(-27, 58); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(174,205,190,.32)'; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(i * 18, -64); ctx.quadraticCurveTo(i * 24, -4, i * 17, 52); ctx.stroke(); }
      ctx.fillStyle = '#080e14'; ctx.beginPath(); ctx.ellipse(0, -34, 41, 31 + Math.sin(this.time * 3) * 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ember ? '#ef9d62' : '#cfe8d4'; ctx.beginPath(); ctx.arc(0, -35, 7 + pulse * .35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4b46d'; ctx.beginPath(); ctx.moveTo(-30, -5); ctx.lineTo(-18, 15); ctx.lineTo(-7, -4); ctx.lineTo(7, 17); ctx.lineTo(19, -4); ctx.lineTo(31, -6); ctx.lineTo(22, 11); ctx.lineTo(0, 26); ctx.lineTo(-22, 11); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ember ? '#ef9965' : 'rgba(200,230,210,.52)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -18, 84 + pulse, Math.PI * .12, Math.PI * .88); ctx.stroke();
      if (enemy.vulnerable) { ctx.strokeStyle = 'rgba(224,239,204,.8)'; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.arc(0, -22, 102, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    } else if (enemy.kind === 'watcher') {
      ctx.fillStyle = 'rgba(180,204,177,.12)'; ctx.beginPath(); ctx.arc(0, -14, 53 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hit ? '#e9dbb4' : body('#56686a', '#1e2c35');
      ctx.beginPath(); ctx.moveTo(-27, 33); ctx.lineTo(-24, -13); ctx.quadraticCurveTo(-20, -39, 0, -47); ctx.quadraticCurveTo(20, -39, 24, -13); ctx.lineTo(28, 33); ctx.lineTo(0, 23); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#080f15'; ctx.beginPath(); ctx.ellipse(0, -17, 19, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ember ? '#ef9f63' : '#dfd07f'; ctx.beginPath(); ctx.arc(0, -17, 5 + pulse * .18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5e8a1'; ctx.beginPath(); ctx.arc(-1, -18, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#94a89a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-21, 25); ctx.lineTo(-38, 45); ctx.moveTo(21, 25); ctx.lineTo(38, 45); ctx.stroke();
      ctx.strokeStyle = 'rgba(226,174,91,.7)'; if (ember) { ctx.beginPath(); ctx.arc(0, -17, 38 + pulse, 0, Math.PI * 2); ctx.stroke(); }
    } else if (enemy.kind === 'skitter') {
      ctx.fillStyle = 'rgba(182,206,179,.1)'; ctx.beginPath(); ctx.ellipse(0, 4, 47, 29, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hit ? '#e4dcb6' : body('#526765', '#1a2a31');
      ctx.beginPath(); ctx.ellipse(0, 0, 29, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#91a88e'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(i * 12, -14); ctx.lineTo(i * 16, 14); ctx.stroke(); }
      ctx.fillStyle = '#0a1217'; ctx.beginPath(); ctx.ellipse(18, -7, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ember ? '#ed9a5f' : '#d8c06d'; ctx.beginPath(); ctx.arc(22, -8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#678078'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i += 1) { const step = Math.sin(this.time * 9 + i) * 4; ctx.beginPath(); ctx.moveTo(i * 15, 9); ctx.lineTo(i * 26, 25 + step); ctx.lineTo(i * 32, 17 + step); ctx.stroke(); }
      ctx.strokeStyle = '#9aa98c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30, -4); ctx.lineTo(42, -12); ctx.moveTo(30, 1); ctx.lineTo(44, 5); ctx.stroke();
      if (ember) { ctx.strokeStyle = 'rgba(224,171,89,.8)'; ctx.beginPath(); ctx.arc(0, 0, 39, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.fillStyle = 'rgba(155,190,165,.1)'; ctx.beginPath(); ctx.arc(0, -12, 42 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hit ? '#e5dcb9' : body('#526263', '#1c2b32');
      ctx.beginPath(); ctx.moveTo(-19, 31); ctx.quadraticCurveTo(-30, 7, -24, -19); ctx.quadraticCurveTo(-18, -43, 0, -47); ctx.quadraticCurveTo(18, -43, 24, -19); ctx.quadraticCurveTo(30, 7, 19, 31); ctx.lineTo(0, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#080f15'; ctx.beginPath(); ctx.ellipse(0, -22, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ember ? '#ee9860' : '#d7c47e'; ctx.fillRect(4, -25, 4, 7);
      ctx.strokeStyle = ember ? '#df9864' : '#84948a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, 25); ctx.lineTo(-32, 43); ctx.moveTo(18, 25); ctx.lineTo(32, 43); ctx.stroke();
      ctx.strokeStyle = 'rgba(153,179,160,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11, -3); ctx.lineTo(-17, 19); ctx.moveTo(0, -1); ctx.lineTo(0, 20); ctx.moveTo(11, -3); ctx.lineTo(17, 19); ctx.stroke();
    }
    ctx.restore();
    if (enemy.hp < enemy.maxHp && enemy.kind !== 'eater') {
      ctx.fillStyle = 'rgba(10,16,20,.78)'; ctx.fillRect(enemy.x - 2, enemy.y - 12, enemy.w + 4, 5);
      ctx.fillStyle = enemy.kind === 'warden' ? '#dbc077' : '#bca96e'; ctx.fillRect(enemy.x, enemy.y - 11, enemy.w * enemy.hp / enemy.maxHp, 3);
    }
  }
  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player; const run = Math.sin((p.runTime ?? 0)) * (Math.abs(p.vx) > 30 && p.grounded ? 1 : 0); const squash = p.landTimer && p.landTimer > 0 ? 1 - p.landTimer * .5 : 1;
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.scale(p.facing, 1); ctx.scale(1 + (1 - squash) * .4, squash);
    if (p.invuln > 0 && Math.floor(this.time * 18) % 2 === 0) ctx.globalAlpha = .52;
    const runLift = run * 2;
    ctx.fillStyle = 'rgba(209,166,80,.12)'; ctx.beginPath(); ctx.arc(18, 2, 34 + (p.burstTimer > 0 ? 12 : 0), 0, Math.PI * 2); ctx.fill();
    const cloak = ctx.createLinearGradient(-20, -38, 18, 34); cloak.addColorStop(0, '#324854'); cloak.addColorStop(.48, '#182934'); cloak.addColorStop(1, '#0a151e');
    ctx.fillStyle = cloak; ctx.beginPath(); ctx.moveTo(-18, 31); ctx.quadraticCurveTo(-30, 10 + runLift, -22, -13); ctx.quadraticCurveTo(-17, -34, 0, -38); ctx.quadraticCurveTo(21, -34, 23, -8); ctx.lineTo(18, 32); ctx.lineTo(8, 25); ctx.lineTo(0, 35); ctx.lineTo(-8, 25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(116,145,143,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(-5, 7, -7, 27); ctx.moveTo(0, -5); ctx.lineTo(0, 29); ctx.moveTo(15, -1); ctx.quadraticCurveTo(6, 7, 8, 27); ctx.stroke();
    ctx.fillStyle = '#9bafaa'; ctx.beginPath(); ctx.arc(1, -26, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6c39b'; ctx.beginPath(); ctx.arc(6, -27, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111c25'; ctx.beginPath(); ctx.moveTo(-15, -29); ctx.quadraticCurveTo(0, -49, 18, -32); ctx.lineTo(11, -25); ctx.lineTo(-15, -26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#758c87'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-15 + run * 5, 31); ctx.moveTo(8, -4); ctx.lineTo(16 - run * 5, 31); ctx.stroke();
    ctx.fillStyle = '#e1b95f'; ctx.beginPath(); ctx.arc(19, 4, 6 + (p.burstTimer > 0 ? 4 : 0), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,228,148,.35)'; ctx.beginPath(); ctx.arc(19, 4, 12 + (p.burstTimer > 0 ? 8 : 0), 0, Math.PI * 2); ctx.fill();
    const weaponAngle = p.attackTimer > 0 ? -.92 : .22 + run * .12; ctx.save(); ctx.translate(19, -4); ctx.rotate(weaponAngle);
    ctx.strokeStyle = '#a58d65'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(27, 20); ctx.stroke();
    ctx.strokeStyle = '#d8e4d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(19, 14); ctx.lineTo(35, 18); ctx.stroke();
    ctx.fillStyle = '#e6eee2'; ctx.beginPath(); ctx.moveTo(28, 16); ctx.lineTo(38, 18); ctx.lineTo(28, 24); ctx.closePath(); ctx.fill(); ctx.restore();
    if (p.attackTimer > 0) {
      ctx.strokeStyle = '#f0d58b'; ctx.lineWidth = 4; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(19, 4, 39, -1.08, .66); ctx.stroke();
      ctx.strokeStyle = 'rgba(214,245,222,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(19, 4, 45, -1.02, .45); ctx.stroke();
    }
    ctx.restore();
  }
  private drawFog(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .09;
    for (let i = 0; i < 4; i += 1) { const y = 420 + i * 43 + Math.sin(this.time * .18 + i) * 12; const x = (this.time * (9 + i * 4) + i * 240) % (VW + 500) - 250; const fog = ctx.createRadialGradient(x, y, 10, x, y, 260); fog.addColorStop(0, '#a6b5a7'); fog.addColorStop(1, 'rgba(166,181,167,0)'); ctx.fillStyle = fog; ctx.beginPath(); ctx.ellipse(x, y, 280, 32, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  private drawDarkness(ctx: CanvasRenderingContext2D, ox: number, oy: number, scale: number) {
    const p = this.player; const sx = (p.x - this.camera.x + p.w / 2) * scale + ox; const sy = (p.y + p.h / 2) * scale + oy;
    const energy = p.lantern / p.maxLantern; const flicker = this.settings.reducedFlicker ? 1 : 1 + Math.sin(this.time * 15.2) * .035 + Math.sin(this.time * 29.1) * (1 - energy) * .08;
    const radius = (116 + energy * 154) * flicker * scale;
    ctx.save(); ctx.fillStyle = `rgba(2,6,12,${clamp(.72 - energy * .16, .46, .73)})`; ctx.fillRect(0, 0, VW, VH);
    const clear = ctx.createRadialGradient(sx, sy, radius * .1, sx, sy, radius); clear.addColorStop(0, 'rgba(255,237,182,.22)'); clear.addColorStop(.42, 'rgba(18,25,29,.05)'); clear.addColorStop(1, 'rgba(0,0,0,.9)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = clear; ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'screen'; const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * .62); bloom.addColorStop(0, 'rgba(255,208,115,.24)'); bloom.addColorStop(.45, 'rgba(255,190,83,.08)'); bloom.addColorStop(1, 'rgba(255,205,112,0)'); ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(sx, sy, radius * .62, 0, Math.PI * 2); ctx.fill();
    if (this.burstRing > 0) { ctx.strokeStyle = `rgba(209,235,216,${this.burstRing})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, (1 - this.burstRing) * 370 * scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}