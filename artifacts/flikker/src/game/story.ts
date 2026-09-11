import type { AreaId } from './types';

export interface CharacterScene {
  name: string;
  role: string;
  line: string;
  whisper?: string;
}

// These characters are intentionally brief and contradictory. The player has to
// decide what is true instead of being handed a clean explanation.
export const characterScenes: Partial<Record<AreaId, CharacterScene>> = {
  'THE HOLLOW': {
    name: 'IVEN', role: 'THE BELL KEEPER',
    line: '“I rang it for people who were lost. Then one night, it rang for me.”',
    whisper: 'The rope still moves when nobody touches it.'
  },
  'SHIFTING HALL': {
    name: 'MARA', role: 'THE LAST BEARER',
    line: '“If the stones show you my footprints, do not follow them. I was trying to leave.”',
    whisper: 'Her handwriting changes halfway through the warning.'
  },
  'THE SUNKEN GARDEN': {
    name: 'SERA', role: 'THE GARDENER',
    line: '“I planted memories here because people kept destroying the places they happened.”',
    whisper: 'Every flower faces the lantern, even underground.'
  },
  'THE CHAPEL': {
    name: 'THE WITNESS', role: 'A VOICE WITHOUT A FACE',
    line: '“You think the chapel is keeping you alive. It is keeping you remembered.”',
    whisper: 'There are four shadows, but only three lanterns.'
  },
  'THE DESCENT': {
    name: 'ORIN', role: 'THE ONE WHO CAME BACK',
    line: '“I reached the bottom. The worst part was finding out it looked exactly like home.”',
    whisper: 'His voice comes from behind you, then from below.'
  },
  'BELL CHAMBER': {
    name: 'IVEN', role: 'THE BELL KEEPER',
    line: '“The bell never summons the dead. It tells them where they are supposed to stay.”',
    whisper: 'For one heartbeat, the bell bears your name.'
  },
  'THE ARCHIVE': {
    name: 'ELIAN', role: 'THE ARCHIVIST',
    line: '“Every name in this room belongs to someone who believed they were the protagonist.”',
    whisper: 'One empty page is already written in your handwriting.'
  },
  'THE MIRROR WARD': {
    name: 'NERA', role: 'THE REFLECTION',
    line: '“I remember every choice you made. You remember none of mine.”',
    whisper: 'Your reflection stops moving before you do.'
  },
  'THE LAST VESTIBULE': {
    name: 'MARA', role: 'THE LAST BEARER',
    line: '“I lied to you at the beginning. The lantern did not choose you. I did.”',
    whisper: 'The second flame is not behind you. It is inside the lantern.'
  },
  'EATER ARENA': {
    name: 'THE EATER', role: 'THE MEMORY THAT REFUSES TO DIE',
    line: '“I kept them here because leaving meant forgetting them.”',
    whisper: 'The monster knows every name you have heard.'
  }
};

export const finaleReveal = {
  name: 'MARA',
  role: 'THE LAST BEARER',
  line: '“You were never carrying the last light. You were carrying the memory of the person who carried it.”'
};
