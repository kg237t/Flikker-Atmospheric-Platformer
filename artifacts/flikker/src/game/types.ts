export type GameMode = 'title' | 'playing' | 'paused' | 'ending';
export type AreaId = 'THE THRESHOLD' | 'THE HOLLOW' | 'SHIFTING HALL' | 'THE SUNKEN GARDEN' | 'THE CHAPEL' | 'THE DESCENT' | 'BELL CHAMBER' | 'THE ARCHIVE' | 'THE MIRROR WARD' | 'THE LAST VESTIBULE' | 'EATER ARENA';
export type EnemyKind = 'hollow' | 'skitter' | 'watcher' | 'warden' | 'eater';
export type EndingChoice = 'LIGHT' | 'EATER' | 'FREEDOM' | null;
export interface Vec2 { x: number; y: number }
export interface Particle extends Vec2 { vx:number; vy:number; life:number; maxLife:number; size:number; color:string; gravity?:number; }
export interface Enemy { id:number; kind:EnemyKind; x:number; y:number; w:number; h:number; vx:number; vy:number; hp:number; maxHp:number; grounded:boolean; hitFlash:number; alert:number; attackTimer:number; attackWindup:number; dead:boolean; vulnerable?:boolean; facing?:number; phase?:number; }
export interface Platform { x:number; y:number; w:number; h:number; moss?:boolean; oneWay?:boolean; material?:'stone'|'wood'|'water'; }
export interface Checkpoint { x:number; y:number; area:AreaId; activated:boolean; }
export interface GameSettings { reducedFlicker:boolean; screenShake:boolean; brightness:number; volume:number; touchControls:boolean; }
export interface InputState { left:boolean; right:boolean; jump:boolean; dash:boolean; attack:boolean; burst:boolean; pause:boolean; special:boolean; }
export interface Player extends Vec2 { w:number; h:number; vx:number; vy:number; facing:number; grounded:boolean; coyote:number; jumpBuffer:number; dashTimer:number; dashCooldown:number; attackTimer:number; attackCooldown:number; burstTimer:number; burstCooldown:number; veilTimer:number; veilCooldown:number; health:number; maxHealth:number; lantern:number; maxLantern:number; invuln:number; hurtFlash:number; landTimer?:number; runTime?:number; hurtTimer?:number; }
export interface GameSnapshot {
  mode:GameMode; area:AreaId; lantern:number; health:number; bossHealth:number; bossMaxHealth:number; checkpoint:number; toast:string;
  storyKicker:string; storyLine:string; storyTimer:number; storyBeat:number; ghostVisible:boolean; ghostGesture:'wait'|'point'|'watch'|'vanish'; progress:number;
  act?:'FEAR'|'DOUBT'|'IDENTITY'; actQuestion?:string; roomTitle?:string; mechanic?:string; lanternMode?:string; memoryMode?:boolean; bossName?:string; bossPhase?:number; endingChoice?:EndingChoice;
}
