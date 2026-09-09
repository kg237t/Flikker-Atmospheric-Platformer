import { useEffect, useRef, useState } from 'react';
import { FlikkerEngine } from '../game/engine';
import type { GameSettings, GameSnapshot } from '../game/types';

const defaultSettings: GameSettings = { reducedFlicker: false, screenShake: true, brightness: 1, volume: .42 };
const loadSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem('flikker-settings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch { return defaultSettings; }
};

function TitleScreen({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  return (
    <section className="game-overlay title-screen" aria-label="Flikker title screen">
      <div className="title-content">
        <p className="eyebrow">a small atmospheric vertical slice</p>
        <h1 className="title-mark" data-testid="text-game-title">FLIKKER<span>the light remembers</span></h1>
        <div className="title-rule" />
        <p className="title-copy">Wake with a dying lantern. Follow what still glows. The ruin has been waiting in the dark.</p>
        <div className="title-actions">
          <button className="game-button" onClick={onStart} data-testid="button-begin">Begin descent</button>
          <button className="game-button ghost" onClick={onSettings} data-testid="button-title-settings">Settings</button>
        </div>
        <p className="title-note">a / d or arrows move · space jump · shift dash · j / click strike · k / right click flare</p>
      </div>
    </section>
  );
}

function SettingsPanel({ settings, onChange, onClose }: { settings: GameSettings; onChange: (settings: GameSettings) => void; onClose: () => void }) {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="game-overlay pause-wrap">
      <section className="pause-panel" aria-label="Game settings">
        <p className="panel-kicker">the lantern</p>
        <h2 className="panel-title">Settings</h2>
        <div className="settings">
          <label className="setting"><span>Volume</span><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={settings.volume} onChange={(event) => update('volume', Number(event.target.value))} /></label>
          <label className="setting"><span>Brightness</span><input aria-label="Brightness" type="range" min=".7" max="1.3" step=".01" value={settings.brightness} onChange={(event) => update('brightness', Number(event.target.value))} /></label>
          <label className="setting"><span>Reduced flicker</span><input aria-label="Reduced flicker" type="checkbox" checked={settings.reducedFlicker} onChange={(event) => update('reducedFlicker', event.target.checked)} /></label>
          <label className="setting"><span>Screen shake</span><input aria-label="Screen shake" type="checkbox" checked={settings.screenShake} onChange={(event) => update('screenShake', event.target.checked)} /></label>
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
        <p className="panel-kicker">a quiet ending</p>
        <h2 className="panel-title">The light remains.</h2>
        <div className="ending-mark" />
        <p className="ending-copy">Beyond the Eater, the ruin opens onto a sky without a name. The ghost is gone. In your hand, one small flame refuses to go out.</p>
        <div className="panel-actions" style={{ marginTop: '2rem' }}><button className="game-button" onClick={onRestart} data-testid="button-play-again">Walk again</button></div>
      </section>
    </div>
  );
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FlikkerEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({ mode: 'title', area: 'THE THRESHOLD', lantern: 100, health: 4, bossHealth: 9, bossMaxHealth: 9, checkpoint: 0, toast: 'The light remembers the way' });
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new FlikkerEngine(canvasRef.current);
    engine.setSettings(settings);
    engine.onSnapshot = setSnapshot;
    engineRef.current = engine;
    engine.start();
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
    const contextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    canvasRef.current.addEventListener('mousedown', pointerDown); canvasRef.current.addEventListener('contextmenu', contextMenu);
    return () => {
      engine.destroy(); engineRef.current = null;
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
      canvasRef.current?.removeEventListener('mousedown', pointerDown); canvasRef.current?.removeEventListener('contextmenu', contextMenu);
    };
    // engine instance intentionally owns the loop; controls read latest engine state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setSettings(settings);
    localStorage.setItem('flikker-settings', JSON.stringify(settings));
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

  return (
    <main className="game-shell" style={{ filter: `brightness(${settings.brightness})` }}>
      <canvas className="game-canvas" ref={canvasRef} data-testid="game-canvas" />
      <div className="grain" />
      {snapshot.mode === 'title' && !showSettings && <TitleScreen onStart={begin} onSettings={() => setShowSettings(true)} />}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
      {snapshot.mode === 'playing' && (
        <div className="game-overlay hud" aria-label="Game HUD">
          <div className="hud-top">
            <div className="hud-area"><div className="hud-kicker">current place</div><div className="hud-location" data-testid="text-area">{snapshot.area}</div></div>
            <div className="hud-bars">
              <div className="meter"><div className="meter-label"><span>LANtern</span><strong data-testid="text-lantern">{Math.ceil(snapshot.lantern)}</strong></div><div className="meter-track"><div className="meter-fill" style={{ width: lanternPercent }} /></div></div>
              <div className="meter"><div className="meter-label"><span>VITAL</span><strong data-testid="text-health">{snapshot.health}</strong></div><div className="meter-track"><div className="meter-fill health" style={{ width: healthPercent }} /></div></div>
            </div>
          </div>
          {snapshot.toast && <div className="toast-line" data-testid="text-toast">{snapshot.toast}</div>}
          {snapshot.bossMaxHealth > 0 && snapshot.area === 'EATER ARENA' && snapshot.bossHealth > 0 && <div className="boss-meter"><div className="boss-name">Lantern Eater</div><div className="boss-track"><div className="boss-fill" style={{ width: `${(snapshot.bossHealth / snapshot.bossMaxHealth) * 100}%` }} /></div></div>}
          <div className="hud-hint"><kbd>A</kbd><kbd>D</kbd> move &nbsp; <kbd>SPACE</kbd> jump &nbsp; <kbd>SHIFT</kbd> dash &nbsp; <kbd>J</kbd> strike &nbsp; <kbd>K</kbd> flare &nbsp; <kbd>ESC</kbd> pause</div>
        </div>
      )}
      {snapshot.mode === 'paused' && !showSettings && <PausePanel onResume={togglePause} onSettings={() => setShowSettings(true)} onRestart={restart} />}
      {snapshot.mode === 'ending' && <EndingPanel onRestart={restart} />}
    </main>
  );
}