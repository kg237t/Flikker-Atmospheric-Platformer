import { FlikkerEngine as BaseFlikkerEngine } from './engine_v3';
import { characterScenes } from './story';

// Keep engine_v3 as the physics/rendering core, while this stable facade owns
// narrative state that can evolve without destabilising gameplay code.
export class FlikkerEngine extends BaseFlikkerEngine {
  getCharacterScene() {
    return characterScenes[this.getSnapshot().area];
  }
}
