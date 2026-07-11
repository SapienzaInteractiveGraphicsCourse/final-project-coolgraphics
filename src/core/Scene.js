import * as THREE from "three";
import { COLORS, MUSEUM_STATE } from "../utils/constants.js";

export class SceneManager extends EventTarget {
  constructor() {
    super();
    //create the main Three.js scene and initialize the museum state
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.night);
    this.scene.fog = new THREE.FogExp2(COLORS.night,0.018);
    this.state = MUSEUM_STATE.quiet;
  }

  setAwakening() {
    // switch the museum to the awakening state and notify once
    if(this.state === MUSEUM_STATE.awakening) {
      return;
    }
    this.state=MUSEUM_STATE.awakening;
    this.dispatchEvent(new CustomEvent("museumAwakens"));
  }
}
