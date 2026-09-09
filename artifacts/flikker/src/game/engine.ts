import { GameAudio } from './audio';
import { areaAt, checkpoints, makeEnemies, platforms, WORLD_HEIGHT, WORLD_WIDTH } from './level';
import type { AreaId, Enemy, GameSettings, GameSnapshot, InputState, Particle, Player } from './types';

const VW = 1280;
const VH = 720;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class FlikkerEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player = { x: 150, y: 565, w: 30, h: 54, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0, dashTimer: 0, dashCooldown: 0, attackTimer: 0, attackCooldown: 0, burstTimer: 0, burstCooldown: 0, health: 4, maxHealth: 4, lantern: 100, maxLantern: 100, invuln: 0, hurtFlash: 0 };
  enemies: Enemy[] = makeEnemies();
  particles: Particle[] = [];
  input: InputState = { left: false, right: false, jump: false, dash: false, attack: false, burst: false, pause: false };
  settings: GameSettings = { reducedFlicker: false, screenShake: true, brightness: 1, volume: .42 };
  camera = { x: 0, y: 0, shake: 0 };
  time = 0;
  last = 0;
  hitStop = 0;
  mode: 'title' | 'playing' | 'paused' | 'ending' = 'title';
  toast = 'The light remembers the way';
  toastTimer = 4;
  checkpoint = 0;
  bossDefeated = false;
  onSnapshot: (snapshot: GameSnapshot) => void = () => {};
  private audio = new GameAudio();
  private raf = 0;
  private lastArea: AreaId = 'THE THRESHOLD';
  private burstRing = 0;
  private shiftSeed = 0;

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
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
  };
  begin() {
    this.audio.init();
    this.mode = 'playing';
    this.player = { x: 150, y: 565, w: 30, h: 54, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0, dashTimer: 0, dashCooldown: 0, attackTimer: 0, attackCooldown: 0, burstTimer: 0, burstCooldown: 0, health: 4, maxHealth: 4, lantern: 100, maxLantern: 100, invuln: 0, hurtFlash: 0 };
    this.enemies = makeEnemies();
    this.particles = [];
    this.checkpoint = 0;
    this.bossDefeated = false;
    this.lastArea = 'THE THRESHOLD';
    this.camera.x = 0;
    this.toast = 'The light remembers the way';
    this.toastTimer = 3.4;
    this.addDust(180, 520, 34);
  }
  setMode(mode: 'title' | 'playing' | 'paused' | 'ending') { this.mode = mode; }
  setSettings(settings: GameSettings) { this.settings = settings; this.audio.setVolume(settings.volume); }
  setInput(input: Partial<InputState>) { this.input = { ...this.input, ...input }; }
  getSnapshot(): GameSnapshot {
    const boss = this.enemies.find((enemy) => enemy.kind === 'eater');
    return { mode: this.mode, area: areaAt(this.player.x), lantern: this.player.lantern, health: this.player.health, bossHealth: boss?.hp ?? 0, bossMaxHealth: boss?.maxHp ?? 9, checkpoint: this.checkpoint, toast: this.toastTimer > 0 ? this.toast : '' };
  }
  private loop = (now: number) => {
    const dt = Math.min((now - this.last) / 1000 || .016, .034);
    this.last = now;
    this.time += dt;
    if (this.mode === 'playing') this.update(dt);
    this.render();
    this.onSnapshot(this.getSnapshot());
    this.raf = requestAnimationFrame(this.loop);
  };
  private update(dt: number) {
    if (this.hitStop > 0) { this.hitStop -= dt; this.render(); return; }
    const p = this.player;
    const wasGrounded = p.grounded;
    p.coyote = p.grounded ? .11 : Math.max(0, p.coyote - dt);
    p.jumpBuffer = this.input.jump ? .11 : Math.max(0, p.jumpBuffer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.burstCooldown = Math.max(0, p.burstCooldown - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.burstTimer = Math.max(0, p.burstTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.input.jump && p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -625; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0; this.audio.tone(250, .12, 'triangle', .05, 90);
    }
    if (!this.input.jump && p.vy < -260) p.vy += 900 * dt;
    const move = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (move) { p.facing = move; p.vx = lerp(p.vx, move * 250, Math.min(1, dt * 10)); }
    else p.vx = lerp(p.vx, 0, Math.min(1, dt * 9));
    if (this.input.dash && p.dashCooldown <= 0) {
      p.dashTimer = .15; p.dashCooldown = .72; p.vx = p.facing * 590; p.vy *= .15; this.audio.dash(); this.addDust(p.x, p.y + p.h, 10);
    }
    if (p.dashTimer > 0) { p.dashTimer -= dt; p.vx = p.facing * 590; p.vy = 0; }
    else p.vy += 1600 * dt;
    if (this.input.attack && p.attackCooldown <= 0) {
      p.attackTimer = .22; p.attackCooldown = .34; this.audio.attack(); this.addArc(p.x + p.facing * 31, p.y + 24, '#e9c37b');
      this.attackEnemies();
    }
    if (this.input.burst && p.burstCooldown <= 0 && p.lantern >= 20) {
      p.burstTimer = .42; p.burstCooldown = 1.2; p.lantern = Math.max(0, p.lantern - 18); this.burstRing = 1; this.audio.burst(); this.addBurst(p.x + p.w / 2, p.y + 25); this.flashEnemies();
    }
    p.lantern = clamp(p.lantern - dt * (.65 + (this.lastArea === 'SHIFTING HALL' ? .18 : 0)), 0, p.maxLantern);
    if (p.grounded && Math.abs(p.vx) > 35 && Math.random() < dt * 4) this.addDust(p.x + 12, p.y + p.h, 1);
    const prevY = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = clamp(p.x, -50, WORLD_WIDTH - p.w - 20);
    p.grounded = false;
    for (const platform of platforms) {
      const adjustedY = this.shiftedPlatformY(platform.x, platform.y);
      const surface = { ...platform, y: adjustedY };
      if (p.vy >= 0 && p.y + p.h >= surface.y && prevY + p.h <= surface.y + 12 && p.x + p.w > surface.x && p.x < surface.x + surface.w) {
        p.y = surface.y - p.h; p.vy = 0; p.grounded = true;
      }
    }
    if (p.y > WORLD_HEIGHT) this.respawn();
    if (!wasGrounded && p.grounded) this.addDust(p.x + 12, p.y + p.h, 5);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateCheckpoints();
    this.burstRing = Math.max(0, this.burstRing - dt * 2.6);
    const area = areaAt(p.x);
    if (area !== this.lastArea) { this.lastArea = area; this.toast = area; this.toastTimer = 2.8; this.addDust(p.x, p.y, 20); }
    if (this.enemies.some((enemy) => enemy.kind === 'eater' && enemy.dead) && !this.bossDefeated) {
      this.bossDefeated = true; this.toast = 'The dark releases its hold'; this.toastTimer = 4;
      window.setTimeout(() => { if (this.mode === 'playing') this.mode = 'ending'; }, 3000);
    }
    this.camera.x = lerp(this.camera.x, clamp(p.x - VW * .35, 0, WORLD_WIDTH - VW), Math.min(1, dt * 4.5));
    this.camera.shake = Math.max(0, this.camera.shake - dt * 2.9);
    this.audio.tension(p.lantern / p.maxLantern);
    this.input.jump = false; this.input.dash = false; this.input.attack = false; this.input.burst = false;
  }
  private updateCheckpoints() {
    for (let i = 0; i < checkpoints.length; i++) {
      if (this.player.x > checkpoints[i].x - 100 && i > this.checkpoint) {
        this.checkpoint = i; checkpoints[i].activated = true; this.player.health = this.player.maxHealth; this.player.lantern = Math.min(100, this.player.lantern + 35);
        this.toast = `checkpoint · ${checkpoints[i].area.toLowerCase()}`; this.toastTimer = 2.7;
      }
    }
  }
  private respawn() {
    const point = checkpoints[this.checkpoint];
    this.player.x = point.x; this.player.y = point.y - this.player.h - 4; this.player.vx = 0; this.player.vy = 0;
    this.player.health = this.player.maxHealth; this.player.lantern = Math.max(38, this.player.lantern);
    this.toast = 'The lantern pulls you back'; this.toastTimer = 2.2;
  }
  private updateEnemies(dt: number) {
    const p = this.player;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackTimer -= dt;
      const dist = p.x - enemy.x;
      const illuminated = Math.hypot(p.x - enemy.x, p.y - enemy.y) < 220 + p.lantern * 1.4 || p.burstTimer > 0;
      if (enemy.kind !== 'eater' && !illuminated) { enemy.vx *= .9; continue; }
      if (enemy.kind === 'eater') {
        if (Math.abs(dist) < 460) enemy.alert = 1;
        if (enemy.attackTimer < 0) { enemy.attackWindup = .56; enemy.attackTimer = 2.55; this.toast = 'THE EATER STIRS'; this.toastTimer = .8; this.audio.boss(); }
        if (enemy.attackWindup > 0) {
          enemy.attackWindup -= dt;
          if (enemy.attackWindup <= 0 && Math.abs(dist) < 540) this.hurtPlayer(1, Math.sign(dist));
        }
        enemy.vx = lerp(enemy.vx, clamp(dist * .45, -110, 110), dt * 1.6);
      } else {
        enemy.alert = clamp(enemy.alert + dt * .8, 0, 1);
        enemy.vx = lerp(enemy.vx, clamp(dist * .8, -95, 95), dt * 1.8);
        if (enemy.attackTimer < 0 && Math.abs(dist) < 75) { enemy.attackTimer = 1.8 + Math.random(); enemy.attackWindup = .3; }
        if (enemy.attackWindup > 0) {
          enemy.attackWindup -= dt;
          if (enemy.attackWindup <= 0 && Math.abs(dist) < 82) this.hurtPlayer(1, Math.sign(dist));
        }
      }
      enemy.vy += 1450 * dt;
      const prevY = enemy.y; enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; enemy.grounded = false;
      for (const platform of platforms) {
        const py = this.shiftedPlatformY(platform.x, platform.y);
        if (enemy.vy >= 0 && enemy.y + enemy.h >= py && prevY + enemy.h <= py + 12 && enemy.x + enemy.w > platform.x && enemy.x < platform.x + platform.w) {
          enemy.y = py - enemy.h; enemy.vy = 0; enemy.grounded = true;
        }
      }
      if (enemy.kind !== 'eater' && rectsOverlap(p, enemy) && p.invuln <= 0) this.hurtPlayer(1, Math.sign(p.x - enemy.x));
    }
  }
  private hurtPlayer(damage: number, direction: number) {
    const p = this.player;
    if (p.invuln > 0) return;
    p.health -= damage; p.invuln = .85; p.hurtFlash = .35; p.vx = direction * 280; p.vy = -250; this.camera.shake = this.settings.screenShake ? .75 : 0; this.hitStop = .06; this.audio.hurt(); this.addSparks(p.x, p.y + 20, '#c9d7d5', 7);
    if (p.health <= 0) this.respawn();
  }
  private attackEnemies() {
    const p = this.player;
    const hitbox = { x: p.facing > 0 ? p.x + 13 : p.x - 55, y: p.y + 5, w: 68, h: 48 };
    for (const enemy of this.enemies) {
      if (enemy.dead || !rectsOverlap(hitbox, enemy)) continue;
      if (enemy.kind === 'eater' && p.burstTimer <= 0) continue;
      enemy.hp -= 1; enemy.hitFlash = .18; enemy.vx = p.facing * 310; enemy.vy = -230; this.hitStop = .085; this.camera.shake = this.settings.screenShake ? .32 : 0; this.audio.hit(); this.addSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#e4c279', 12);
      if (enemy.hp <= 0) { enemy.dead = true; this.addBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2); }
    }
  }
  private flashEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.dead && Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) < 300) { enemy.alert = 1; if (enemy.kind === 'eater') enemy.attackWindup = 0; }
    }
  }
  private shiftedPlatformY(x: number, y: number) {
    if (x > 1600 && x < 3000) return y + Math.sin(this.time * .9 + x * .012) * 7;
    return y;
  }
  private addDust(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.particles.push({ x: x + (Math.random() - .5) * 25, y: y + Math.random() * 8, vx: (Math.random() - .5) * 25, vy: -Math.random() * 24, life: .5 + Math.random() * .7, maxLife: 1.1, size: 1 + Math.random() * 2.3, color: '#a5a99a', gravity: -.05 });
  }
  private addSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, life: .2 + Math.random() * .3, maxLife: .5, size: 1 + Math.random() * 2, color });
  }
  private addArc(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) this.particles.push({ x: x + Math.cos(i / 7 * Math.PI) * 22, y: y - Math.sin(i / 7 * Math.PI) * 20, vx: 0, vy: 0, life: .16, maxLife: .16, size: 2.2, color });
  }
  private addBurst(x: number, y: number) {
    for (let i = 0; i < 25; i++) { const angle = Math.random() * Math.PI * 2; const speed = 30 + Math.random() * 130; this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .5 + Math.random() * .45, maxLife: .95, size: 1 + Math.random() * 2.6, color: Math.random() > .3 ? '#e8cc8a' : '#c8e3dc' }); }
  }
  private updateParticles(dt: number) {
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const particle of this.particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += (particle.gravity ?? 280) * dt; }
  }
  private render() {
    const ctx = this.ctx;
    const scale = Math.min(this.canvas.width / VW, this.canvas.height / VH);
    const ox = (this.canvas.width - VW * scale) / 2;
    const oy = (this.canvas.height - VH * scale) / 2;
    ctx.save(); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.translate(ox, oy); ctx.scale(scale, scale);
    const shake = this.settings.screenShake ? this.camera.shake * (Math.random() - .5) * 10 : 0;
    ctx.translate(shake, shake * .5);
    this.drawSky(ctx);
    ctx.save(); ctx.translate(-this.camera.x * .17, 0); this.drawFarRuins(ctx); ctx.restore();
    ctx.save(); ctx.translate(-this.camera.x * .34, 0); this.drawMidRuins(ctx); ctx.restore();
    ctx.save(); ctx.translate(-this.camera.x, 0); this.drawWorld(ctx); ctx.restore();
    this.drawDarkness(ctx, ox, oy, scale);
    ctx.restore();
  }
  private drawSky(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, '#0b1422'); grad.addColorStop(.55, '#101923'); grad.addColorStop(1, '#151b1d'); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
    const glow = ctx.createRadialGradient(730, 260, 15, 730, 260, 420); glow.addColorStop(0, 'rgba(114,137,148,.12)'); glow.addColorStop(1, 'rgba(114,137,148,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(178,190,183,.5)'; for (let i = 0; i < 42; i++) { const x = (i * 97 + 23) % VW; const y = 58 + (i * 53) % 300; ctx.fillRect(x, y, i % 3 ? 1 : 2, i % 4 ? 1 : 2); }
  }
  private drawFarRuins(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#111b25'; ctx.beginPath(); ctx.moveTo(-200, 570); for (let x = -200; x < WORLD_WIDTH + 600; x += 160) { const h = 120 + ((x * 7) % 190); ctx.lineTo(x, 570); ctx.lineTo(x + 28, 570 - h); ctx.lineTo(x + 94, 570 - h + 17); ctx.lineTo(x + 125, 570); } ctx.lineTo(WORLD_WIDTH + 600, 720); ctx.lineTo(-200, 720); ctx.fill();
    ctx.strokeStyle = 'rgba(128,151,153,.16)'; ctx.lineWidth = 2; for (let x = 90; x < WORLD_WIDTH; x += 480) { ctx.beginPath(); ctx.moveTo(x, 570); ctx.lineTo(x + 20, 285); ctx.lineTo(x + 130, 280); ctx.lineTo(x + 164, 570); ctx.stroke(); }
  }
  private drawMidRuins(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#10171d'; for (let x = -50; x < WORLD_WIDTH + 500; x += 280) { const h = 30 + (Math.sin(x * .1) + 1) * 35; ctx.fillRect(x, 600 - h, 14, h); ctx.fillRect(x + 26, 570 - h * .6, 14, h * .6); ctx.fillRect(x + 7, 570 - h, 42, 7); }
    ctx.strokeStyle = 'rgba(92,113,107,.27)'; ctx.lineWidth = 2; for (let x = 0; x < WORLD_WIDTH; x += 210) { ctx.beginPath(); ctx.moveTo(x, 672); ctx.quadraticCurveTo(x + 42, 615, x + 68, 672); ctx.stroke(); }
  }
  private drawWorld(ctx: CanvasRenderingContext2D) {
    for (const platform of platforms) this.drawPlatform(ctx, platform);
    this.drawCheckpoints(ctx);
    this.drawGhost(ctx);
    for (const enemy of this.enemies) if (!enemy.dead) this.drawEnemy(ctx, enemy);
    this.drawPlayer(ctx);
    for (const particle of this.particles) { ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  private drawGhost(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const guideX = clamp(p.x + 210 + Math.sin(this.time * .7) * 70, 120, WORLD_WIDTH - 180);
    const guideY = 435 + Math.sin(this.time * 1.35) * 25 - (areaAt(guideX) === 'EATER ARENA' ? 30 : 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(guideX, guideY, 1, guideX, guideY, 45);
    halo.addColorStop(0, 'rgba(205,234,221,.24)'); halo.addColorStop(1, 'rgba(205,234,221,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(guideX, guideY, 45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(214,237,223,.86)'; ctx.beginPath(); ctx.arc(guideX, guideY, 3.5 + Math.sin(this.time * 4) * 1, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const t = this.time * .8 + i * .9;
      ctx.globalAlpha = .18 + i * .035;
      ctx.beginPath(); ctx.arc(guideX + Math.sin(t * 1.7) * (16 + i * 2), guideY + Math.cos(t * 1.3) * (12 + i * 2), 1.3 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  private drawPlatform(ctx: CanvasRenderingContext2D, platform: typeof platforms[number]) {
    const y = this.shiftedPlatformY(platform.x, platform.y);
    ctx.fillStyle = '#242f34'; ctx.beginPath(); ctx.moveTo(platform.x, y); ctx.lineTo(platform.x + platform.w, y); ctx.lineTo(platform.x + platform.w - 8, y + platform.h); ctx.lineTo(platform.x + 8, y + platform.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#43504d'; ctx.beginPath(); ctx.moveTo(platform.x, y); ctx.lineTo(platform.x + platform.w, y); ctx.lineTo(platform.x + platform.w - 10, y + 7); ctx.lineTo(platform.x + 14, y + 8); ctx.lineTo(platform.x + 7, y + 14); ctx.lineTo(platform.x - 5, y + 10); ctx.closePath(); ctx.fill();
    if (platform.moss) { ctx.strokeStyle = '#526557'; ctx.lineWidth = 2; for (let x = platform.x + 18; x < platform.x + platform.w - 12; x += 29) { ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.quadraticCurveTo(x - 1, y - 6, x + 4, y - 11); ctx.stroke(); } }
    ctx.strokeStyle = 'rgba(151,158,145,.18)'; ctx.lineWidth = 1; for (let x = platform.x + 28; x < platform.x + platform.w; x += 64) { ctx.beginPath(); ctx.moveTo(x, y + 21); ctx.lineTo(x - 10, y + platform.h - 9); ctx.stroke(); }
  }
  private drawCheckpoints(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < checkpoints.length; i++) { const c = checkpoints[i]; ctx.strokeStyle = i <= this.checkpoint ? 'rgba(217,177,99,.65)' : 'rgba(113,132,130,.24)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 68); ctx.stroke(); ctx.beginPath(); ctx.arc(c.x, c.y - 72, 5 + Math.sin(this.time * 3 + i) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
  }
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    ctx.save(); ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2); ctx.scale(enemy.vx < -2 ? -1 : 1, 1);
    if (enemy.kind === 'eater') {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#d4e1d5' : '#1d2b31'; ctx.beginPath(); ctx.moveTo(-55, 66); ctx.quadraticCurveTo(-60, -32, -35, -67); ctx.quadraticCurveTo(0, -92, 35, -67); ctx.quadraticCurveTo(64, -25, 55, 66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0b1218'; ctx.beginPath(); ctx.ellipse(0, -29, 35, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c9dcd0'; ctx.beginPath(); ctx.arc(0, -31, 5 + Math.sin(this.time * 4) * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9cb7b0'; ctx.fillRect(-45, 53, 90, 5);
      ctx.strokeStyle = enemy.attackWindup > 0 ? 'rgba(216,190,128,.8)' : 'rgba(129,155,151,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -20, 78 + Math.sin(this.time * 2) * 4, Math.PI * .12, Math.PI * .88); ctx.stroke();
    } else if (enemy.kind === 'watcher') {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#e1d6b2' : '#334148'; ctx.beginPath(); ctx.moveTo(-22, 30); ctx.lineTo(-18, -21); ctx.quadraticCurveTo(0, -37, 19, -21); ctx.lineTo(25, 30); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#0a1016'; ctx.beginPath(); ctx.ellipse(0, -12, 17, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d2bc76'; ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#65766f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 29); ctx.lineTo(-30, 45); ctx.moveTo(20, 29); ctx.lineTo(29, 45); ctx.stroke();
    } else {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#dbd8bc' : '#26343a'; ctx.beginPath(); ctx.moveTo(-17, 27); ctx.quadraticCurveTo(-25, -8, -15, -27); ctx.quadraticCurveTo(0, -40, 15, -27); ctx.quadraticCurveTo(25, -4, 18, 28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#0a1118'; ctx.beginPath(); ctx.arc(0, -17, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d4be79'; ctx.fillRect(2, -19, 3, 5);
    }
    ctx.restore();
  }
  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); if (p.facing < 0) ctx.scale(-1, 1);
    if (p.invuln > 0 && Math.floor(this.time * 18) % 2 === 0) ctx.globalAlpha = .52;
    ctx.fillStyle = '#101b23'; ctx.beginPath(); ctx.moveTo(-17, 27); ctx.lineTo(-22, -5); ctx.quadraticCurveTo(-17, -29, 0, -30); ctx.quadraticCurveTo(16, -28, 19, -6); ctx.lineTo(14, 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#36434a'; ctx.beginPath(); ctx.arc(1, -22, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d2c8a5'; ctx.beginPath(); ctx.arc(6, -23, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#67716e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-15, 31); ctx.moveTo(9, -8); ctx.lineTo(16, 31); ctx.stroke();
    const swing = Math.sin(this.time * 4.2) * .17 + (p.attackTimer > 0 ? .45 : 0); ctx.save(); ctx.translate(20, -4); ctx.rotate(swing); ctx.strokeStyle = '#b7a170'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 14); ctx.stroke(); ctx.fillStyle = '#e1ab53'; ctx.beginPath(); ctx.arc(17, 18, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (p.attackTimer > 0) { ctx.strokeStyle = '#e5c884'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(18, 5, 31, -.95, .6); ctx.stroke(); }
    ctx.restore();
  }
  private drawDarkness(ctx: CanvasRenderingContext2D, ox: number, oy: number, scale: number) {
    const p = this.player; const sx = (p.x - this.camera.x + p.w / 2) * scale + ox; const sy = (p.y + p.h / 2) * scale + oy;
    const energy = p.lantern / p.maxLantern; const flicker = this.settings.reducedFlicker ? 1 : 1 + Math.sin(this.time * 15.2) * .04 + Math.sin(this.time * 29.1) * (1 - energy) * .1;
    const radius = (110 + energy * 155) * flicker * scale;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(2, 6, 12, ${clamp(.68 - energy * .13, .44, .71)})`; ctx.fillRect(0, 0, VW, VH);
    const gradient = ctx.createRadialGradient(sx, sy, radius * .1, sx, sy, radius); gradient.addColorStop(0, 'rgba(255,229,164,.08)'); gradient.addColorStop(.45, 'rgba(14,20,25,.03)'); gradient.addColorStop(1, 'rgba(0,0,0,.86)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * .72); bloom.addColorStop(0, 'rgba(255,205,112,.16)'); bloom.addColorStop(1, 'rgba(255,205,112,0)'); ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(sx, sy, radius * .72, 0, Math.PI * 2); ctx.fill();
    if (this.burstRing > 0) { ctx.strokeStyle = `rgba(212,231,211,${this.burstRing})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, (1 - this.burstRing) * 360 * scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}