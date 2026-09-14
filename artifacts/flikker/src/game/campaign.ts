import type { AreaId } from './types';

export type Act = 'FEAR' | 'DOUBT' | 'IDENTITY';
export interface RoomDesign { id: string; area: AreaId; from: number; to: number; act: Act; title: string; mechanic: string; memory: string; }

export const rooms: RoomDesign[] = [
  { id:'broken-road', area:'THE THRESHOLD', from:0, to:820, act:'FEAR', title:'BROKEN ROAD', mechanic:'movement, jump, dash', memory:'Someone walked this road carrying the lantern before you.' },
  { id:'hollow-city', area:'THE HOLLOW', from:820, to:1580, act:'FEAR', title:'HOLLOW CITY', mechanic:'combat + lantern reveal', memory:'The bell keeper remembers a city that is no longer here.' },
  { id:'shifting-hall', area:'SHIFTING HALL', from:1580, to:2580, act:'FEAR', title:'SHIFTING HALL', mechanic:'lantern throw + recall', memory:'Mara left a warning that changes when you look away.' },
  { id:'memory-room', area:'THE SUNKEN GARDEN', from:2580, to:3420, act:'FEAR', title:'MEMORY ROOM', mechanic:'first past/present reveal', memory:'For a few seconds, the dead world breathes again.' },
  { id:'bell-warden', area:'THE CHAPEL', from:3420, to:4300, act:'FEAR', title:'BELL WARDEN', mechanic:'boss vulnerability through light', memory:'The Warden knows your footsteps.' },
  { id:'descent', area:'THE DESCENT', from:4300, to:5300, act:'DOUBT', title:'THE DESCENT', mechanic:'vertical pressure + false routes', memory:'The ghosts point down, but none of them follow.' },
  { id:'memory-garden', area:'BELL CHAMBER', from:5300, to:6680, act:'DOUBT', title:'MEMORY GARDEN', mechanic:'memory mode + contradiction', memory:'Flowers disappear when the player stops remembering them.' },
  { id:'archive', area:'THE ARCHIVE', from:6680, to:8400, act:'DOUBT', title:'THE ARCHIVE', mechanic:'map logic + Cartographer', memory:'Every hero in the archive remembers a different ending.' },
  { id:'mirror-ward', area:'THE MIRROR WARD', from:8400, to:9740, act:'IDENTITY', title:'MIRROR WARD', mechanic:'echoes + delayed reflection', memory:'Your reflection remembers choices you do not.' },
  { id:'keeper', area:'THE LAST VESTIBULE', from:9740, to:10800, act:'IDENTITY', title:'THE KEEPER', mechanic:'identity puzzle + guardian fight', memory:'Mara admits the lantern did not choose you.' },
  { id:'eater', area:'EATER ARENA', from:10800, to:11200, act:'IDENTITY', title:'THE EATER', mechanic:'four-phase memory boss', memory:'The monster is made from everything the Hollow refused to forget.' },
];

export const acts: Record<Act, { label:string; question:string; color:string }> = {
  FEAR: { label:'ACT I — FEAR', question:'Can you survive the dark?', color:'#e6b35d' },
  DOUBT: { label:'ACT II — DOUBT', question:'What is real if memories can lie?', color:'#8ed8d1' },
  IDENTITY: { label:'ACT III — IDENTITY', question:'Who are you when memory cannot answer?', color:'#c88ed8' },
};

export function roomAt(x:number): RoomDesign { return rooms.find(r=>x>=r.from && x<r.to) ?? rooms[rooms.length-1]; }
export function actAt(x:number): Act { return roomAt(x).act; }
