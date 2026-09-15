import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FlikkerEngine } from '../game/engine';
import { characterScenes } from '../game/story';
import type { GameSettings, GameSnapshot, InputState, SkinId } from '../game/types';

const defaultSettings: GameSettings = { reducedFlicker: false, screenShake: true, brightness: 1, volume: .42, touchControls: true };
const loadSettings: () => GameSettings = () => { try { const s = localStorage.getItem('flikker-settings'); return s ? { ...defaultSettings, ...JSON.parse(s) } : defaultSettings; } catch { return defaultSettings; } };
const skinChoices: Array<{ id: SkinId; label: string; detail: string }> = [
  { id: 'DAWN', label: 'Dawn', detail: 'amber core' },
  { id: 'MOSS', label: 'Moss', detail: 'garden glow' },
  { id: 'VOID', label: 'Void', detail: 'memory shade' },
];
const loadSkin = (): SkinId => { try { const value = localStorage.getItem('flikker-skin') as SkinId | null; return skinChoices.some(choice => choice.id === value) ? value! : 'DAWN'; } catch { return 'DAWN'; } };

function TitleScreen({ onStart, onSettings, skin, onSkin }: { onStart: () => void; onSettings: () => void; skin: SkinId; onSkin: (skin: SkinId) => void }) {
  return <section className="game-overlay title-screen" aria-label="Flikker title screen"><div className="title-vignette"/><div className="title-content">
    <p className="eyebrow">a lantern remembers what people forget</p><h1 className="title-mark" data-testid="text-game-title">FLIKKER<span>the light remembers</span></h1>
    <div className="title-ornament"><i/><b>+</b><i/></div><p className="title-copy">Wake beneath a drowned chapel. Carry its last light through a ruin that remembers people better than they remember themselves.</p>
    <div className="title-actions"><button className="game-button" onClick={onStart} data-testid="button-begin">Begin descent <span>↳</span></button><button className="game-button ghost" onClick={onSettings}>Settings</button></div>
    <div className="skin-picker" aria-label="Choose Flik skin"><span>FLIK / MEMORY SKIN</span><div>{skinChoices.map(choice=><button key={choice.id} className={`skin-choice skin-${choice.id.toLowerCase()} ${skin===choice.id?'selected':''}`} onClick={()=>onSkin(choice.id)} aria-pressed={skin===choice.id}><i/><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div></div>
    <p className="title-note">A/D or arrows move · Space jump · Shift dash · J / click strike · K / right click flare · E Lumen Step</p><p className="title-credit">FLIKKER / THE LIGHT REMEMBERS</p>
  </div></section>;
}

function SettingsPanel({ settings, onChange, onClose }: { settings: GameSettings; onChange: (s: GameSettings) => void; onClose: () => void }) {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });
  return <div className="game-overlay pause-wrap"><section className="pause-panel" aria-label="Game settings"><p className="panel-kicker">the lantern / preferences</p><h2 className="panel-title">Settings</h2><div className="settings">
    <label className="setting"><span>Volume <small>{Math.round(settings.volume*100)}</small></span><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={settings.volume} onChange={e=>update('volume',Number(e.target.value))}/></label>
    <label className="setting"><span>Brightness <small>{Math.round(settings.brightness*100)}</small></span><input aria-label="Brightness" type="range" min=".7" max="1.3" step=".01" value={settings.brightness} onChange={e=>update('brightness',Number(e.target.value))}/></label>
    <label className="setting toggle-setting"><span>Reduced flicker</span><input aria-label="Reduced flicker" type="checkbox" checked={settings.reducedFlicker} onChange={e=>update('reducedFlicker',e.target.checked)}/></label>
    <label className="setting toggle-setting"><span>Screen shake</span><input aria-label="Screen shake" type="checkbox" checked={settings.screenShake} onChange={e=>update('screenShake',e.target.checked)}/></label>
    <label className="setting toggle-setting"><span>Touch controls</span><input aria-label="Touch controls" type="checkbox" checked={settings.touchControls} onChange={e=>update('touchControls',e.target.checked)}/></label>
  </div><div className="panel-actions"><button className="game-button" onClick={onClose}>Return</button></div></section></div>;
}
function PausePanel({ onResume, onSettings, onRestart }: { onResume:()=>void; onSettings:()=>void; onRestart:()=>void }) {
  return <div className="game-overlay pause-wrap"><section className="pause-panel" aria-label="Paused"><p className="panel-kicker">the dark is patient</p><h2 className="panel-title">Paused</h2><p className="pause-copy">The ruin keeps its breath. Your lantern does not.</p><div className="panel-actions"><button className="game-button" onClick={onResume}>Return to ruin</button><button className="game-button ghost" onClick={onSettings}>Settings</button><button className="game-button ghost" onClick={onRestart}>Restart descent</button></div></section></div>;
}
function EndingPanel({ onRestart }: { onRestart:()=>void }) { return <div className="game-overlay ending-wrap"><section className="ending-panel" aria-label="Ending"><p className="panel-kicker">THE LIGHT REMEMBERS / REVELATION</p><h2 className="panel-title">Mara was here.</h2><div className="ending-mark"><span/></div><p className="ending-copy">The Eater was not guarding the ruin. It was keeping its memories together. The names you heard were never separate stories; they were pieces of one person trying to remember why the lantern was passed on.</p><p className="ending-epitaph">“You did not find the last bearer. You became the one who remembers.”</p><div className="panel-actions" style={{marginTop:'2rem'}}><button className="game-button" onClick={onRestart}>Walk again <span>↳</span></button></div></section></div>; }

type TouchKey = keyof InputState | 'weapon';
const touchButtons: Array<{key:TouchKey;label:string;className:string;testId:string}> = [
  {key:'left',label:'←',className:'touch-move touch-left',testId:'touch-left'},{key:'right',label:'→',className:'touch-move touch-right',testId:'touch-right'},
  {key:'jump',label:'JUMP',className:'touch-action touch-jump',testId:'touch-jump'},{key:'dash',label:'DASH',className:'touch-action touch-dash',testId:'touch-dash'},
  {key:'attack',label:'STRIKE',className:'touch-action touch-attack',testId:'touch-attack'},{key:'burst',label:'FLARE',className:'touch-action touch-burst',testId:'touch-burst'},
  {key:'special',label:'LUMEN',className:'touch-action touch-special',testId:'touch-special'},{key:'weapon',label:'WEAPON',className:'touch-action touch-weapon',testId:'touch-weapon'}
];
function TouchControls({engine}:{engine:FlikkerEngine|null}) {
  const jumpHeld=useRef(false); const raf=useRef<number|null>(null);
  useEffect(()=>()=>{ if(raf.current!==null) cancelAnimationFrame(raf.current); },[]);
  const pumpJump=()=>{ if(!jumpHeld.current) { raf.current=null; return; } if(engine?.mode==='playing' && !engine.player.grounded) engine.setInput({jump:true}); raf.current=requestAnimationFrame(pumpJump); };
  const press=(key:TouchKey,e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(key==='weapon'){engine?.cycleWeapon();return;}if(key==='jump'){jumpHeld.current=true;engine?.setInput({jump:true});if(raf.current===null)raf.current=requestAnimationFrame(pumpJump);}else engine?.setInput({[key]:true});};
  const release=(key:TouchKey,e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();if(key==='weapon')return;if(key==='jump')jumpHeld.current=false;engine?.setInput({[key]:false});if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  return <div className="touch-controls" aria-label="Touch controls">{touchButtons.map(b=><button key={b.key} className={`touch-button ${b.className}`} onPointerDown={e=>press(b.key,e)} onPointerUp={e=>release(b.key,e)} onPointerCancel={e=>release(b.key,e)} onPointerLeave={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))release(b.key,e)}} data-testid={b.testId} aria-label={b.label}>{b.label}</button>)}</div>;
}

export default function GameCanvas(){
  const canvasRef=useRef<HTMLCanvasElement|null>(null); const engineRef=useRef<FlikkerEngine|null>(null); const heldRef=useRef({left:false,right:false,jump:false}); const pumpRef=useRef<number|null>(null); const gamepadRef=useRef({jump:false,dash:false,attack:false,burst:false,special:false});
  const [snapshot,setSnapshot]=useState<GameSnapshot>({mode:'title',area:'THE THRESHOLD',lantern:100,health:4,bossHealth:9,bossMaxHealth:9,checkpoint:0,toast:'The light remembers the way',storyKicker:'THE FIRST WAKING',storyLine:'The lantern is warm. Someone was holding it before you.',storyTimer:0,storyBeat:0,ghostVisible:false,ghostGesture:'wait',progress:0,weapon:'LANTERN CORE',skin:'DAWN'});
  const [settings,setSettings]=useState<GameSettings>(loadSettings); const [skin,setSkin]=useState<SkinId>(loadSkin); const [showSettings,setShowSettings]=useState(false); const [characterScene,setCharacterScene]=useState<typeof characterScenes[keyof typeof characterScenes]>(undefined); const [dismissedStoryBeat,setDismissedStoryBeat]=useState<number|null>(null);

  useEffect(()=>{
    if(!canvasRef.current)return; const engine=new FlikkerEngine(canvasRef.current); engine.setSettings(settings); engine.setSkin(skin); engine.onSnapshot=setSnapshot; engineRef.current=engine; engine.start();
    const clearInput=()=>{heldRef.current={left:false,right:false,jump:false};engine.setInput({left:false,right:false,jump:false,dash:false,attack:false,burst:false,special:false});gamepadRef.current={jump:false,dash:false,attack:false,burst:false,special:false};};
    const begin=()=>{clearInput();engine.begin();setShowSettings(false);setSnapshot(engine.getSnapshot());};
    const keyDown=(e:KeyboardEvent)=>{
       const code=e.code; const movement=code==='KeyA'||code==='KeyD'||code==='ArrowLeft'||code==='ArrowRight'; const handled=movement||['Space','ShiftLeft','ShiftRight','KeyJ','KeyK','KeyE','KeyQ','Digit1','Digit2','Digit3','Digit4','Escape','Enter'].includes(code);
      if(handled)e.preventDefault();
      if(code==='Escape'){clearInput();if(engine.mode==='playing'){engine.setMode('paused');setSnapshot(engine.getSnapshot());}else if(engine.mode==='paused'){engine.setMode('playing');setSnapshot(engine.getSnapshot());}return;}
      if(code==='Enter'&&engine.mode==='title'){begin();return;}
      if(engine.mode!=='playing')return;
      if(code==='KeyA'||code==='ArrowLeft')heldRef.current.left=true;
      if(code==='KeyD'||code==='ArrowRight')heldRef.current.right=true;
      if(code==='Space'&&!e.repeat){heldRef.current.jump=true;engine.setInput({jump:true});}
       if(!e.repeat){if(code==='ShiftLeft'||code==='ShiftRight')engine.setInput({dash:true});if(code==='KeyJ')engine.setInput({attack:true});if(code==='KeyK')engine.setInput({burst:true});if(code==='KeyE')engine.setInput({special:true});if(code==='KeyQ')engine.cycleWeapon();if(code.startsWith('Digit')&&Number(code.slice(-1))>=1&&Number(code.slice(-1))<=4)engine.selectWeapon(Number(code.slice(-1)));}
    };
    const keyUp=(e:KeyboardEvent)=>{if(e.code==='KeyA'||e.code==='ArrowLeft')heldRef.current.left=false;if(e.code==='KeyD'||e.code==='ArrowRight')heldRef.current.right=false;if(e.code==='Space')heldRef.current.jump=false;};
    const blur=()=>clearInput(); const visibility=()=>{if(document.hidden)clearInput();};
    const pointerDown=(e:MouseEvent)=>{if(engine.mode!=='playing')return;if(e.button===0)engine.setInput({attack:true});if(e.button===2){e.preventDefault();engine.setInput({burst:true});}};
    const pointerUp=(e:MouseEvent)=>{if(e.button===0)engine.setInput({attack:false});if(e.button===2)engine.setInput({burst:false});};
    const contextMenu=(e:MouseEvent)=>e.preventDefault();
    let lastSnapshotAt=0;
    const pump=()=>{if(engine.mode==='playing'){engine.setInput({left:heldRef.current.left,right:heldRef.current.right});if(heldRef.current.jump&&!engine.player.grounded)engine.setInput({jump:true});
      const pads=navigator.getGamepads?.()??[];const gp=Array.from(pads).find(Boolean);if(gp){const ax=gp.axes[0]??0;const left=ax<-.25||!!gp.buttons[14]?.pressed;const right=ax>.25||!!gp.buttons[15]?.pressed;engine.setInput({left,right});
        const edge=(i:number,key:keyof typeof gamepadRef.current)=>{const down=!!gp.buttons[i]?.pressed;if(down&&!gamepadRef.current[key])engine.setInput({[key]:true});gamepadRef.current[key]=down;};
        edge(0,'jump');edge(2,'dash');edge(3,'attack');edge(1,'burst');edge(4,'special');
      }
    }
      const now=performance.now(); if(now-lastSnapshotAt>50){lastSnapshotAt=now;setSnapshot(engine.getSnapshot());}
      pumpRef.current=requestAnimationFrame(pump);
    }; pumpRef.current=requestAnimationFrame(pump);
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);canvasRef.current.addEventListener('mousedown',pointerDown);canvasRef.current.addEventListener('mouseup',pointerUp);canvasRef.current.addEventListener('contextmenu',contextMenu);
    return()=>{clearInput();engine.destroy();engineRef.current=null;if(pumpRef.current!==null)cancelAnimationFrame(pumpRef.current);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);canvasRef.current?.removeEventListener('mousedown',pointerDown);canvasRef.current?.removeEventListener('mouseup',pointerUp);canvasRef.current?.removeEventListener('contextmenu',contextMenu);};
  },[]);
  useEffect(()=>{engineRef.current?.setSettings(settings);try{localStorage.setItem('flikker-settings',JSON.stringify(settings));}catch{}},[settings]);
  useEffect(()=>{engineRef.current?.setSkin(skin);try{localStorage.setItem('flikker-skin',skin);}catch{}},[skin]);
  useEffect(()=>{if(snapshot.mode!=='playing')return;const scene=characterScenes[snapshot.area];setCharacterScene(scene);setDismissedStoryBeat(null);const t=window.setTimeout(()=>setCharacterScene(undefined),5200);return()=>window.clearTimeout(t);},[snapshot.area,snapshot.mode]);
  useEffect(()=>{setDismissedStoryBeat(null);},[snapshot.storyBeat]);
  const resetInput=()=>{heldRef.current={left:false,right:false,jump:false};gamepadRef.current={jump:false,dash:false,attack:false,burst:false,special:false};engineRef.current?.setInput({left:false,right:false,jump:false,dash:false,attack:false,burst:false,special:false});}; const begin=()=>{resetInput();engineRef.current?.begin();setShowSettings(false);}; const restart=()=>{resetInput();engineRef.current?.begin();setShowSettings(false);}; const togglePause=()=>{const e=engineRef.current;if(!e)return;e.setInput({left:false,right:false,jump:false,dash:false,attack:false,burst:false,special:false});e.setMode(snapshot.mode==='paused'?'playing':'paused');setSnapshot(e.getSnapshot());};
   const healthPercent=`${(snapshot.health/4)*100}%`; const lanternPercent=`${snapshot.lantern}%`; const storyActive=snapshot.storyTimer>0&&snapshot.storyLine&&dismissedStoryBeat!==snapshot.storyBeat; const showBoss=snapshot.bossMaxHealth>0&&snapshot.bossHealth>0&&(snapshot.area==='THE CHAPEL'||snapshot.area==='THE DESCENT'||snapshot.area==='THE LAST VESTIBULE'||snapshot.area==='EATER ARENA'); const bossName=snapshot.area==='EATER ARENA'?'Lantern Eater':snapshot.area==='THE LAST VESTIBULE'?'Bell Warden':'Bell Warden';
  return <main className="game-shell" style={{filter:`brightness(${settings.brightness})`}}><canvas className="game-canvas" ref={canvasRef} data-testid="game-canvas"/><div className="grain"/>
    {snapshot.mode==='title'&&!showSettings&&<TitleScreen onStart={begin} onSettings={()=>setShowSettings(true)} skin={skin} onSkin={setSkin}/>} {showSettings&&<SettingsPanel settings={settings} onChange={setSettings} onClose={()=>setShowSettings(false)}/>}
    {snapshot.mode==='playing'&&<div className="game-overlay hud" aria-label="Game HUD"><div className="hud-top"><div className="hud-area"><div className="hud-kicker">current place / {String(snapshot.progress*100|0).padStart(2,'0')}%</div><div className="hud-location" data-testid="text-area">{snapshot.area}</div></div><div className="hud-bars">
      <div className="meter lantern-meter"><div className="meter-label"><span>LANTERN</span><strong data-testid="text-lantern">{Math.ceil(snapshot.lantern)}</strong></div><div className="meter-track"><div className="meter-fill" style={{width:lanternPercent}}/></div></div>
      <div className="meter"><div className="meter-label"><span>VITAL</span><strong data-testid="text-health">{snapshot.health}</strong></div><div className="meter-track"><div className="meter-fill health" style={{width:healthPercent}}/></div></div>
     </div><div className="weapon-readout"><span>LOADOUT</span><strong data-testid="text-weapon">{snapshot.weapon ?? 'LANTERN CORE'}</strong></div></div>
       {(storyActive||characterScene)&&<div className="narrative-stack" aria-live="polite">
         {storyActive&&<div className="story-card" data-testid="story-card"><button className="story-dismiss" onClick={()=>setDismissedStoryBeat(snapshot.storyBeat)} aria-label="Dismiss story message">×</button><div className="story-rule"/><p>{snapshot.storyKicker}</p><strong>{snapshot.storyLine}</strong><small className="story-help">click × to keep playing</small></div>}
         {characterScene&&<div className="character-card" data-testid="character-card"><button className="story-dismiss" onClick={()=>setCharacterScene(undefined)} aria-label="Dismiss character message">×</button><div className="character-mark"/><p className="character-role">{characterScene.role}</p><h3>{characterScene.name}</h3><strong>{characterScene.line}</strong>{characterScene.whisper&&<small>{characterScene.whisper}</small>}</div>}
       </div>}
      {snapshot.toast&&<div className="toast-line" data-testid="text-toast">{snapshot.toast}</div>}
      {showBoss&&<div className="boss-meter"><div className="boss-name"><span>{snapshot.area==='EATER ARENA'?'THE DEEP':'THE CHAPEL'}</span>{bossName}</div><div className="boss-track"><div className="boss-fill" style={{width:`${(snapshot.bossHealth/snapshot.bossMaxHealth)*100}%`}}/></div></div>}
       <div className="hud-hint"><kbd>A</kbd><kbd>D</kbd> move <i/><kbd>SPACE</kbd> jump <i/><kbd>SHIFT</kbd> dash <i/><kbd>J</kbd> strike <i/><kbd>K</kbd> flare <i/><kbd>E</kbd> Lumen <i/><kbd>Q</kbd> weapon</div>{settings.touchControls&&<TouchControls engine={engineRef.current}/>}</div>}
    {snapshot.mode==='paused'&&!showSettings&&<PausePanel onResume={togglePause} onSettings={()=>setShowSettings(true)} onRestart={restart}/>} {snapshot.mode==='ending'&&<EndingPanel onRestart={restart}/>}</main>;
}
