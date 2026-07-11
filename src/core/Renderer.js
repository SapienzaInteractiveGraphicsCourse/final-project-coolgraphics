import * as THREE from "three";
import { QUALITY_SETTINGS } from "../utils/constants.js";

export class renderer {
  constructor() {
    // create and configure the main Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,QUALITY_SETTINGS.medium.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
  }

  setQuality(quality) {
    // apply seelcted quality preset and shadows
    const setting = QUALITY_SETTINGS[quality] ?? QUALITY_SETTINGS.medium;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,setting.pixelRatio));
    this.setShadows(setting.shadows);
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled=enabled;
  }

  resize(camera) {
    // resize renderer and update camera aspect ratio
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect=window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  render(scene, camera) {
    this.renderer.render(scene,camera);
  }
}
