import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// GLB models of the coffin and the mummy
const COFFIN_MODEL_URL = new URL("../models/characters/coffin.glb", import.meta.url).href;
const MUMMY_MODEL_URL = new URL("../models/characters/mummy.glb", import.meta.url).href;

// targeat height for each models
const COFFIN_TARGET_HEIGHT = 3.35;
const MUMMY_TARGET_HEIGHT = 2.7;

const PEDESTAL_HEIGHT = 0.55; // Height of the stone pedestal the coffin stands on.

// matrix to re-orient the coffin to stand upright on the pedestal
const COFFIN_UPRIGHT_ORIENTATION = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(-1, 0, 0)
);

const COFFIN_TOP_SLIDE_DISTANCE = 0.95; // how far the top part of the coffin lid slides
const COFFIN_TOP_SLIDE_LOCAL_AXIS = new THREE.Vector3(0, 0, -1);
const COFFIN_OPEN_HOLD_DURATION = 5000; // how long it stays open

const COFFIN_TOP_PART_NAMES = [
  "Ankh-Khonsu_Top_LD",
  "Ankh-Khonsu_Top_LD_Material_#26_0"
];


export class Sarcophagus {
  constructor(materials, loadingController) {
    this.materials = materials;
    this.loadingController = loadingController;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, -15);
    this.open = false; // whether the lid is currently open

    // root for the coffin and mummy models raised to be on the pedestal
    this.modelRoot = new THREE.Group();
    this.modelRoot.position.y = PEDESTAL_HEIGHT;

    this.pedestal = this.createPedestal();
    this.model = null; 
    this.topParts = []; // lid pieces that slide
    this.topSlideState = { distance: 0 };
    this.animationRunning = false;
    this.ready = this.createModel();
  }

  createPedestal() {
    // simple two-part stone pedestal
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.18, 36),
      this.materials.trim
    );
    base.position.y = 0.09;

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, PEDESTAL_HEIGHT - 0.18, 36),
      this.materials.statue
    );
    plinth.position.y = 0.18 + (PEDESTAL_HEIGHT - 0.18) / 2;

    group.add(base, plinth);
    group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  createModel() {
    this.modelRoot.name = "Upright Coffin";

    // Invisible box to be clicked to start the animation
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, COFFIN_TARGET_HEIGHT, 0.75),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    hitbox.name = "Coffin Click Hitbox";
    hitbox.position.y = PEDESTAL_HEIGHT + COFFIN_TARGET_HEIGHT * 0.5;

    this.group.add(this.pedestal, this.modelRoot, hitbox);
    return this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();

    const promise = loader.loadAsync(COFFIN_MODEL_URL).then(async gltf => {
      const model = gltf.scene;
      // Reorient the model
      model.quaternion.setFromRotationMatrix(COFFIN_UPRIGHT_ORIENTATION);
      model.updateMatrixWorld(true);

      // Scale to match COFFIN_TARGET_HEIGHT
      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new THREE.Vector3());
      const scale = COFFIN_TARGET_HEIGHT / Math.max(initialSize.y, 0.001);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.model = model;
      this.setupTopSlide(model);
      this.applyTopSlide();
      this.modelRoot.add(model);

      await this.loadMummy();
    });

    const trackedPromise = this.loadingController?.track(promise) ?? promise;
    trackedPromise.catch(error => {
      console.error("Failed to load the sarcophagus model:", error);
    });
    return trackedPromise;
  }

  async loadMummy() {
    const loader = new GLTFLoader();

    const gltf = await loader.loadAsync(MUMMY_MODEL_URL);
    const mummy = gltf.scene;
    mummy.updateMatrixWorld(true);

    // Scale so the mummy's height matches MUMMY_TARGET_HEIGHT
    const initialBox = new THREE.Box3().setFromObject(mummy);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const scale = MUMMY_TARGET_HEIGHT / Math.max(initialSize.y, 0.001);
    mummy.scale.setScalar(scale);
    mummy.updateMatrixWorld(true);

    // Center the mummy in the sarcophagus
    const box = new THREE.Box3().setFromObject(mummy);
    const center = box.getCenter(new THREE.Vector3());
    mummy.position.set(-center.x, 0.15 - box.min.y, -0.08 - center.z);

    mummy.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    mummy.name = "Mummy Inside Coffin";
    this.modelRoot.add(mummy);
  }

  setupTopSlide(model) {
    this.topParts = COFFIN_TOP_PART_NAMES.map(name => {
      const object = model.getObjectByName(name);

      return {
        object,
        basePosition: object.position.clone()
      };
    });

    this.topSlideState.distance = this.open ? COFFIN_TOP_SLIDE_DISTANCE : 0;
  }

  applyTopSlide() {
    if (!this.model || this.topParts.length === 0) {
      return;
    }

    const modelScale = Math.max(this.model.scale.x, 0.001);
    const localDistance = this.topSlideState.distance / modelScale;
    const offset = COFFIN_TOP_SLIDE_LOCAL_AXIS.clone().multiplyScalar(localDistance);

    this.topParts.forEach(part => {
      part.object.position.copy(part.basePosition).add(offset);
    });
  }

  onClick() {
    this.toggle();
  }

  toggle() {
    // Ignore clicks while the lid is animating, or before the model has finished loading.
    if (this.animationRunning || !this.model) {
      return;
    }

    this.animationRunning = true;
    this.open = true;

    // after staying open for a while, the lid is closed
    const closeTween = new TWEEN.Tween(this.topSlideState)
      .to({ distance: 0 }, 950)
      .delay(COFFIN_OPEN_HOLD_DURATION)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => this.applyTopSlide())
      .onComplete(() => {
        this.open = false;
        this.animationRunning = false;
      });

    // slide the lid open, then chain into the close tween above.
    const openTween = new TWEEN.Tween(this.topSlideState)
      .to({ distance: COFFIN_TOP_SLIDE_DISTANCE }, 950)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => this.applyTopSlide())
      .onComplete(() => {
        TWEEN.add(closeTween);
        closeTween.start();
      });

    TWEEN.add(openTween);
    openTween.start();
  }

  update() {}
}
