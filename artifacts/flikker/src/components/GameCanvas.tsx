import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FlikkerEngine } from '../game/engine';
import type { GameSettings, GameSnapshot, InputState } from '../game/types';

const defaultSettings: GameSettings = { reducedFlicker: false, screenShake: true, brightness: 1, volume: .42, touchControls: true };
const loadSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem('flikker-settings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch { return defaultSettings; }
};

function TitleScreen({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  return (
    <section className="game-overlay title-screen" aria-label="Flikker title screen">
      <div className="title-vignette" />
      <div className="title-content">
        <p className="eyebrow">a lantern remembers what people forget</p>
        <h1 className="title-mark" data-testid="text-game-title">FLIKKER<span>the light remembers</span></h1>
        <div className="title-ornament"><i /><b>+</b><i /></div>
        <p className="title-copy">Wake beneath a drowned chapel. Carry its last light through a ruin that has learned to breathe.</p>
        <div className="title-actions">
          <button className="game-button" onClick={onStart} data-testid="button-begin">Begin descent <span>↳</span></button>
          <button className="game-button ghost" onClick={onSettings} data-testid="button-title-settings">Settings</button>
        </div>
        <p className="title-note">a / d or arrows move · space jump · shift dash · j / click strike · k / right click flare</p>
        <p className="title-credit">FLIKKER / vertical slice 01</p>
      </div>
    </section>
  );
}

function SettingsPanel({ settings, onChange, onClose }: { settings: GameSettings; onChange: (settings: GameSettings) => void; onClose: () => void }) {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="game-overlay pause-wrap">
      <section className="pause-panel" aria-label="Game settings">
        <p className="panel-kicker">the lantern / preferences</p>
        <h2 className="panel-title">Settings</h2>
        <div className="settings">
          <label className="setting"><span>Volume <small>{Math.round(settings.volume * 100)}</small></span><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={settings.volume} onChange={(event) => update('volume', Number(event.target.value))} /></label>
          <label className="setting"><span>Brightness <small>{Math.round(settings.brightness * 100)}</small></span><input aria-label="Brightness" type="range" min=".7" max="1.3" step=".01" value={settings.brightness} onChange={(event) => update('brightness', Number(event.target.value))} /></label>
          <label className="setting toggle-setting"><span>Reduced flicker</span><input aria-label="Reduced flicker" type="checkbox" checked={settings.reducedFlicker} onChange={(event) => update('reducedFlicker', event.target.checked)} /></label>
          <label className="setting toggle-setting"><span>Screen shake</span><input aria-label="Screen shake" type="checkbox" checked={settings.screenShake} onChange={(event) => update('screenShake', event.target.checked)} /></label>
          <label className="setting toggle-setting"><span>Touch controls</span><input aria-label="Touch controls" type="checkbox" checked={settings.touchControls} onChange={(event) => update('touchControls', event.target.checked)} /></label>
        </div>
        <div className="panel-actions"><button className="game-button" onClick={onClose} data-testid="button-close-settings">Return</button></div>
      </section>
    </div>
  );
}

function PausePanel({ onResume, onSettings, onRestart }: { onResume: () => void; onSettings: () => void; onRestart: () => void }) {
  return (
    <div className="game-overlay pause-wrap">
      <section className="pause-panel" aria-label="Paused">
        <p className="panel-kicker">the dark is patient</p>
        <h2 className="panel-title">Paused</h2>
        <p className="pause-copy">The ruin keeps its breath. Your lantern does not.</p>
        <div className="panel-actions">
          <button className="game-button" onClick={onResume} data-testid="button-resume">Return to ruin</button>
          <button className="game-button ghost" onClick={onSettings} data-testid="button-pause-settings">Settings</button>
          <button className="game-button ghost" onClick={onRestart} data-testid="button-restart">Restart descent</button>
        </div>
      </section>
    </div>
  );
}

function EndingPanel({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="game-overlay ending-wrap">
      <section className="ending-panel" aria-label="Ending">
        <p className="panel-kicker">THE CHAPEL OPENS / A REVEAL</p>
        <h2 className="panel-title">Mara was here.</h2>
        <div className="ending-mark"><span /></div>
        <p className="ending-copy">The Eater was not guarding the ruin. It was keeping the last lantern bearer from leaving it. In the ash beyond the chapel, a second flame answers yours.</p>
        <p className="ending-epitaph">“If you find this, do not bring the light back.”</p>
        <div className="panel-actions" style={{ marginTop: '2rem' }}><button className="game-button" onClick={onRestart} data-testid="button-play-again">Walk again <span>↳</span></button></div>
      </section>
    </div>
  );
}

const touchButtons: Array<{ key: keyof InputState; label: string; className: string; testId: string }> = [
  { key: 'left', label: '←', className: 'touch-move touch-left', testId: 'touch-left' },
  { key: 'right', label: '→', className: 'touch-move touch-right', testId: 'touch-right' },
  { key: 'jump', label: 'JUMP', className: 'touch-action touch-jump', testId: 'touch-jump' },
  { key: 'dash', label: 'DASH', className: 'touch-action touch-dash', testId: 'touch-dash' },
  { key: 'attack', label: 'STRIKE', className: 'touch-action touch-attack', testId: 'touch-attack' },
  { key: 'burst', label: 'FLARE', className: 'touch-action touch-burst', testId: 'touch-burst' },
];

function TouchControls({ engine }: { engine: FlikkerEngine | null }) {
  const press = (key: keyof InputState, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    engine?.setInput({ [key]: true });
  };
  const release = (key: keyof InputState, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    engine?.setInput({ [key]: false });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <div className="touch-controls" aria-label="Touch controls">
      {touchButtons.map((button) => (
        <button
          key={button.key}
          className={`touch-button ${button.className}`}
          onPointerDown={(event) => press(button.key, event)}
          onPointerUp={(event) => release(button.key, event)}
          onPointerCancel={(event) => release(button.key, event)}
          onPointerLeave={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) release(button.key, event); }}
          data-testid={button.testId}
          aria-label={button.label}
        >{button.label}</button>
      ))}
    </div>
  );
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FlikkerEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    mode: 'title', area: 'THE THRESHOLD', lantern: 100, health: 4, bossHealth: 9, bossMaxHealth: 9, checkpoint: 0, toast: 'The light remembers the way',
    storyKicker: 'THE FIRST WAKING', storyLine: 'The lantern is warm. Someone was holding it before you.', storyTimer: 0, storyBeat: 0,
    ghostVisible: false, ghostGesture: 'wait', progress: 0,
  });
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new FlikkerEngine(canvasRef.current);
    engine.setSettings(settings);
    engine.onSnapshot = setSnapshot;
    engineRef.current = engine;
    engine.start();
    const begin = () => { engine.begin(); setShowSettings(false); };
    const keyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape') {
        if (engine.mode === 'playing') { engine.setMode('paused'); setSnapshot(engine.getSnapshot()); }
        else if (engine.mode === 'paused') { engine.setMode('playing'); setSnapshot(engine.getSnapshot()); }
        return;
      }
      if (event.code === 'Enter' && engine.mode === 'title') begin();
      engine.setInput({
        left: event.code === 'KeyA' || event.code === 'ArrowLeft' || engine.input.left,
        right: event.code === 'KeyD' || event.code === 'ArrowRight' || engine.input.right,
        jump: event.code === 'Space' ? true : engine.input.jump,
        dash: event.code === 'ShiftLeft' || event.code === 'ShiftRight' ? true : engine.input.dash,
        attack: event.code === 'KeyJ' ? true : engine.input.attack,
        burst: event.code === 'KeyK' ? true : engine.input.burst,
      });
    };
    const keyUp = (event: KeyboardEvent) => {
      engine.setInput({
        left: event.code === 'KeyA' || event.code === 'ArrowLeft' ? false : engine.input.left,
        right: event.code === 'KeyD' || event.code === 'ArrowRight' ? false : engine.input.right,
        jump: event.code === 'Space' ? false : engine.input.jump,
      });
    };
    const pointerDown = (event: MouseEvent) => {
      if (event.button === 0) engine.setInput({ attack: true });
      if (event.button === 2) { event.preventDefault(); engine.setInput({ burst: true }); }
    };
    const pointerUp = (event: MouseEvent) => {
      if (event.button === 0) engine.setInput({ attack: false });
      if (event.button === 2) engine.setInput({ burst: false });
    };
    const contextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    canvasRef.current.addEventListener('mousedown', pointerDown); canvasRef.current.addEventListener('mouseup', pointerUp);
    canvasRef.current.addEventListener('contextmenu', contextMenu);
    return () => {
      engine.destroy(); engineRef.current = null;
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
      canvasRef.current?.removeEventListener('mousedown', pointerDown); canvasRef.current?.removeEventListener('mouseup', pointerUp);
      canvasRef.current?.removeEventListener('contextmenu', contextMenu);
    };
    // The engine owns its animation loop and the bridge reads its current input state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setSettings(settings);
    try { localStorage.setItem('flikker-settings', JSON.stringify(settings)); } catch { /* storage is optional */ }
  }, [settings]);

  const begin = () => { engineRef.current?.begin(); setShowSettings(false); };
  const restart = () => { engineRef.current?.begin(); setShowSettings(false); };
  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setMode(snapshot.mode === 'paused' ? 'playing' : 'paused');
    setSnapshot(engine.getSnapshot());
  };
  const healthPercent = `${(snapshot.health / 4) * 100}%`;
  const lanternPercent = `${snapshot.lantern}%`;
  const storyActive = snapshot.storyTimer > 0 && snapshot.storyLine;

  return (
    <main className="game-shell" style={{ filter: `brightness(${settings.brightness})` }}>
      <canvas className="game-canvas" ref={canvasRef} data-testid="game-canvas" />
      <div className="grain" />
      {snapshot.mode === 'title' && !showSettings && <TitleScreen onStart={begin} onSettings={() => setShowSettings(true)} />}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
      {snapshot.mode === 'playing' && (
        <div className="game-overlay hud" aria-label="Game HUD">
          <div className="hud-top">
            <div className="hud-area"><div className="hud-kicker">current place / {String(snapshot.progress * 100 | 0).padStart(2, '0')}%</div><div className="hud-location" data-testid="text-area">{snapshot.area}</div></div>
            <div className="hud-bars">
              <div className="meter lantern-meter"><div className="meter-label"><span>LANTERN</span><strong data-testid="text-lantern">{Math.ceil(snapshot.lantern)}</strong></div><div className="meter-track"><div className="meter-fill" style={{ width: lanternPercent }} /></div></div>
              <div className="meter"><div className="meter-label"><span>VITAL</span><strong data-testid="text-health">{snapshot.health}</strong></div><div className="meter-track"><div className="meter-fill health" style={{ width: healthPercent }} /></div></div>
            </div>
          </div>
          {storyActive && <div className="story-card" data-testid="story-card"><div className="story-rule" /><p>{snapshot.storyKicker}</p><strong>{snapshot.storyLine}</strong></div>}
          {snapshot.toast && <div className="toast-line" data-testid="text-toast">{snapshot.toast}</div>}
          {snapshot.bossMaxHealth > 0 && snapshot.area === 'EATER ARENA' && snapshot.bossHealth > 0 && <div className="boss-meter"><div className="boss-name"><span>THE DEEP</span> Lantern Eater</div><div className="boss-track"><div className="boss-fill" style={{ width: `${(snapshot.bossHealth / snapshot.bossMaxHealth) * 100}%` }} /></div></div>}
          <div className="hud-hint"><kbd>A</kbd><kbd>D</kbd> move <i /> <kbd>SPACE</kbd> jump <i /> <kbd>SHIFT</kbd> dash <i /> <kbd>J</kbd> strike <i /> <kbd>K</kbd> flare</div>
          {settings.touchControls && <TouchControls engine={engineRef.current} />}
        </div>
      )}
      {snapshot.mode === 'paused' && !showSettings && <PausePanel onResume={togglePause} onSettings={() => setShowSettings(true)} onRestart={restart} />}
      {snapshot.mode === 'ending' && <EndingPanel onRestart={restart} />}
    </main>
  );
}