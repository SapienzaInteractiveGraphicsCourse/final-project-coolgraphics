import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Moai model setup and orientation
const MOAI_MODEL_URL = new URL("../models/characters/moai_statue.glb", import.meta.url).href;
const MOAI_TARGET_HEIGHT = 2.45;
const MOAI_LOCAL_FACE_ANGLE = -THREE.MathUtils.degToRad(40);
const MOAI_FACE_ENTRANCE_ROTATION = -Math.PI / 2 - MOAI_LOCAL_FACE_ANGLE;
const PEDESTAL_HEIGHT = 0.55;
const MOUTH_INTERIOR_DARKNESS = 0.08;

// hopping animation values
const HOP_FLOOR_Y = 0;
const HOP_HEIGHT = 0.5;
const HOP_DURATION = 620;
const HOP_PAUSE = 90;
const HOP_TILT = 0.12;

// room hopping path
const HOP_WAYPOINTS = [
  { x: 2.45, z: -1.7 },
  { x: 4.45, z: -0.9 },
  { x: 3.75, z: 1.55 },
  { x: 1.9, z: 2.25 },
  { x: 2.7, z: -2.25 },
  { x: 4.85, z: 0.95 }
];

// path used when the museum awakens
const ATRIUM_APPROACH_WAYPOINTS = [
  { x: 12.2, z: 0 },
  { x: 8.8, z: 0 },
  { x: 6.1, z: -0.35 },
  { x: 4.45, z: -1.1 }
];
const ATRIUM_LOOP_WAYPOINTS = [
  { x: 4.45, z: -1.1 },
  { x: 3.65, z: -2.25 },
  { x: 2.35, z: -2.05 },
  { x: 1.85, z: -0.85 },
  { x: 2.75, z: 0.2 },
  { x: 4.05, z: 0.05 }
];

// simple mouth opening sequence
const TALK_PHRASE = [
  { open: 0.52, openMs: 260, closeMs: 220, pauseMs: 90 },
  { open: 0.28, openMs: 180, closeMs: 170, pauseMs: 55 },
  { open: 0.82, openMs: 310, closeMs: 260, pauseMs: 130 },
  { open: 0.44, openMs: 220, closeMs: 210, pauseMs: 80 },
  { open: 0.68, openMs: 280, closeMs: 240, pauseMs: 260 }
];

export class Statue {
  constructor(materials, loadingController) {
    this.materials = materials;
    this.loadingController = loadingController;
    this.group = new THREE.Group();
    this.group.position.set(16.5, 0, 0);
    this.pedestal = this.createPedestal();
    this.modelRoot = new THREE.Group();
    this.modelRoot.position.y = PEDESTAL_HEIGHT;
    this.modelRoot.rotation.y = MOAI_FACE_ENTRANCE_ROTATION;
    this.modelRoot.add(this.createClickHitbox());
    this.group.add(this.pedestal, this.modelRoot);
    this.model = null;
    // mouth shader animation state
    this.mouthState = { open: 0 };
    this.mouthOpenUniform = { value: 0 };
    this.mouthDeformations = [];
    this.mouthTween = null;
    this.mouthCloseTween = null;
    this.mouthPlaying = false;
    this.talkIndex = 0;
    // hopping state
    this.hopping = false;
    this.hopTween = null;
    this.hopIndex = 0;
    this.hopWaypoints = HOP_WAYPOINTS;
    this.hopLoopWaypoints = null;
    this.hopLoops = true;
    this.awake = false;
    this.faceSpotlights = this.createFaceSpotlights();
    this.group.add(this.faceSpotlights);
    this.ready = this.createModel();
  }

  createPedestal() {
    // simple stone base under the Moai
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

  createClickHitbox() {
    // invisible mesh to click on the statue
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3.2, 2.5),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    hitbox.name = "Statue Click Hitbox";
    hitbox.userData.isCameraObstacle = true;
    hitbox.position.y = 1.45;
    return hitbox;
  }

  createFaceSpotlights() {
    // lights aimed at the statue face before awakening
    const group = new THREE.Group();
    group.name = "Statue Face Spotlights";

    const target = new THREE.Object3D();
    target.name = "Statue Face Spotlight Target";
    target.position.set(0, PEDESTAL_HEIGHT + 1.75, 0);
    this.faceSpotlightTarget = target;
    group.add(target);

    [
      { name: "Left Statue Face Spotlight", position: [-4.25, 3.15, -1.15] },
      { name: "Right Statue Face Spotlight", position: [-4.25, 3.15, 1.15] }
    ].forEach(config => {
      const light = new THREE.SpotLight(0xffedd0, 3.4, 8.5, Math.PI / 10, 0.4, 1.25);
      light.name = config.name;
      light.position.set(config.position[0], config.position[1], config.position[2]);
      light.target = target;
      light.castShadow = false;
      group.add(light);
    });

    return group;
  }

  setFaceSpotlightsEnabled(enabled) {
    if (!this.faceSpotlights) {
      return;
    }

    this.faceSpotlights.visible = enabled;
    this.faceSpotlights.traverse(child => {
      if (child.isLight) {
        child.intensity = enabled ? 3.4 : 0;
      }
    });
  }

  createModel() {
    // load the Moai model and place it on the pedestal
    const loader = new GLTFLoader();
    const promise = loader.loadAsync(MOAI_MODEL_URL).then(gltf => {
      const model = gltf.scene;

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        }
      });

      model.updateMatrixWorld(true);
      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new THREE.Vector3());
      const scale = MOAI_TARGET_HEIGHT / Math.max(initialSize.y, 0.001);
      model.scale.setScalar(scale);

      model.updateMatrixWorld(true);
      const groundAnchor = this.getGroundAnchor(model);
      model.position.set(-groundAnchor.x, -groundAnchor.y, -groundAnchor.z);

      this.model = model;
      this.modelRoot.add(model);
      this.setupMouthDeformation(model);
    });

    const trackedPromise = this.loadingController?.track(promise) ?? promise;
    trackedPromise.catch(error => {
      console.error("Failed to load the Moai model:", error);
    });
    return trackedPromise;
  }

  setupMouthDeformation(model) {
    // prepare vertex offsets used to fake the talking mouth
    this.modelRoot.updateMatrixWorld(true);
    model.updateMatrixWorld(true);

    const bounds = this.getModelRootBounds(model);
    const sizeY = bounds.maxY - bounds.minY;
    const depth = bounds.maxForward - bounds.minForward;
    const mouthY = bounds.minY + sizeY * 0.47;
    const mouthRadiusY = sizeY * 0.07;
    const frontDepth = depth * 0.24;
    const frontStart = bounds.maxForward - frontDepth;
    const forward = this.getLocalFaceDirection();
    const lateral = new THREE.Vector2(forward.y, -forward.x);
    const mouthBand = this.getMouthBand(model, mouthY, mouthRadiusY, frontStart, forward, lateral);
    const mouthLateral = mouthBand.center;
    const mouthRadiusX = Math.max(
      mouthBand.width * 0.58,
      (bounds.maxLateral - bounds.minLateral) * 0.26
    );
    const localVertex = new THREE.Vector3();
    const rootVertex = new THREE.Vector3();
    const targetRootVertex = new THREE.Vector3();
    const targetLocalVertex = new THREE.Vector3();

    model.traverse(child => {
      if (!child.isMesh || !child.geometry?.attributes?.position) {
        return;
      }

      child.geometry = child.geometry.clone();
      const position = child.geometry.attributes.position;
      const mouthOffsets = new Float32Array(position.count * 3);
      const mouthDarkness = new Float32Array(position.count);
      let targetCount = 0;

      for (let i = 0; i < position.count; i += 1) {
        localVertex.fromBufferAttribute(position, i);
        rootVertex.copy(localVertex);
        child.localToWorld(rootVertex);
        this.modelRoot.worldToLocal(rootVertex);

        const forwardCoord = rootVertex.x * forward.x + rootVertex.z * forward.y;
        const lateralCoord = rootVertex.x * lateral.x + rootVertex.z * lateral.y;
        const frontWeight = THREE.MathUtils.clamp((forwardCoord - frontStart) / frontDepth, 0, 1);
        if (frontWeight <= 0) {
          continue;
        }

        const dx = (lateralCoord - mouthLateral) / mouthRadiusX;
        const dy = (rootVertex.y - mouthY) / mouthRadiusY;
        const lateralAmount = Math.abs(dx);
        const verticalWeight = Math.max(0, 1 - dy * dy);
        const lateralWeight = Math.max(0, 1 - Math.pow(lateralAmount, 2.6));
        const mouthWeight = verticalWeight * lateralWeight;
        if (mouthWeight <= 0) {
          continue;
        }

        const centerWeight = Math.max(0, 1 - lateralAmount * 0.65);
        const weight = THREE.MathUtils.lerp(0.72, 1, frontWeight) * mouthWeight * centerWeight;
        const lowerLip = dy < 0;
        const lift = sizeY * (lowerLip ? -0.07 : 0.022) * weight;
        const surfacePush = depth * 0.004 * weight;
        const darknessWeight = Math.max(0, 1 - Math.abs(dy) * 1.25) * Math.max(0, 1 - lateralAmount * 1.2) * frontWeight;
        targetRootVertex.copy(rootVertex);
        targetRootVertex.y += lift;
        targetRootVertex.x += forward.x * surfacePush;
        targetRootVertex.z += forward.y * surfacePush;

        targetLocalVertex.copy(targetRootVertex);
        this.modelRoot.localToWorld(targetLocalVertex);
        child.worldToLocal(targetLocalVertex);

        const offset = i * 3;
        mouthOffsets[offset] = targetLocalVertex.x - localVertex.x;
        mouthOffsets[offset + 1] = targetLocalVertex.y - localVertex.y;
        mouthOffsets[offset + 2] = targetLocalVertex.z - localVertex.z;
        mouthDarkness[i] = darknessWeight;
        targetCount += 1;
      }

      child.geometry.setAttribute(
        "aMouthOffset",
        new THREE.BufferAttribute(mouthOffsets, 3)
      );
      child.geometry.setAttribute(
        "aMouthDarkness",
        new THREE.BufferAttribute(mouthDarkness, 1)
      );

      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }

      this.applyMouthShaderMaterial(child);

      if (targetCount > 0) {
        this.mouthDeformations.push(child);
      }
    });

  }

  applyMouthShaderMaterial(mesh) {
    // inject mouth offset and darkness into the material shader
    const enhance = material => {
      const shaderMaterial = material.clone();

      shaderMaterial.onBeforeCompile = shader => {
        shader.uniforms.uMouthOpen = this.mouthOpenUniform;

        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `
            #include <common>
            attribute vec3 aMouthOffset;
            attribute float aMouthDarkness;
            uniform float uMouthOpen;
            varying float vMouthDarkness;
            `
          )
          .replace(
            "#include <begin_vertex>",
            `
            vec3 transformed = vec3(position);
            transformed += aMouthOffset * uMouthOpen;
            vMouthDarkness = aMouthDarkness * uMouthOpen;
            `
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `
            #include <common>
            varying float vMouthDarkness;
            `
          )
          .replace(
            "#include <dithering_fragment>",
            `
            float mouthShade = clamp(vMouthDarkness, 0.0, 1.0);
            diffuseColor.rgb = mix(
              diffuseColor.rgb,
              diffuseColor.rgb * ${MOUTH_INTERIOR_DARKNESS.toFixed(2)},
              mouthShade
            );
            #include <dithering_fragment>
            `
          );
      };

      shaderMaterial.customProgramCacheKey = () => "moai-mouth-shader-v1";
      shaderMaterial.needsUpdate = true;
      return shaderMaterial;
    };

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(material => enhance(material))
      : enhance(mesh.material);
  }

  getMouthBand(model, mouthY, mouthRadiusY, frontStart, forward, lateral) {
    // find the horizontal mouth area from the front vertices
    const vertex = new THREE.Vector3();
    let minLateral = Infinity;
    let maxLateral = -Infinity;
    let sumLateral = 0;
    let count = 0;

    model.traverse(child => {
      const position = child.isMesh ? child.geometry?.attributes?.position : null;
      if (!position) {
        return;
      }

      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        child.localToWorld(vertex);
        this.modelRoot.worldToLocal(vertex);

        const forwardCoord = vertex.x * forward.x + vertex.z * forward.y;
        if (forwardCoord < frontStart) {
          continue;
        }

        const verticalDistance = Math.abs(vertex.y - mouthY);
        if (verticalDistance > mouthRadiusY * 1.15) {
          continue;
        }

        const lateralCoord = vertex.x * lateral.x + vertex.z * lateral.y;
        minLateral = Math.min(minLateral, lateralCoord);
        maxLateral = Math.max(maxLateral, lateralCoord);
        sumLateral += lateralCoord;
        count += 1;
      }
    });

    if (count === 0) {
      return { center: 0, width: 1 };
    }

    const average = sumLateral / count;
    const middle = (minLateral + maxLateral) / 2;
    return {
      center: (average + middle) / 2,
      width: maxLateral - minLateral
    };
  }

  getLocalFaceDirection() {
    return new THREE.Vector2(
      Math.sin(MOAI_LOCAL_FACE_ANGLE),
      Math.cos(MOAI_LOCAL_FACE_ANGLE)
    ).normalize();
  }

  getModelRootBounds(model) {
    // measure the model in the statue local face directions
    const forward = this.getLocalFaceDirection();
    const lateral = new THREE.Vector2(forward.y, -forward.x);
    const vertex = new THREE.Vector3();
    const bounds = {
      minY: Infinity,
      maxY: -Infinity,
      minForward: Infinity,
      maxForward: -Infinity,
      minLateral: Infinity,
      maxLateral: -Infinity
    };

    model.traverse(child => {
      const position = child.isMesh ? child.geometry?.attributes?.position : null;
      if (!position) {
        return;
      }

      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        child.localToWorld(vertex);
        this.modelRoot.worldToLocal(vertex);

        const forwardCoord = vertex.x * forward.x + vertex.z * forward.y;
        const lateralCoord = vertex.x * lateral.x + vertex.z * lateral.y;

        bounds.minY = Math.min(bounds.minY, vertex.y);
        bounds.maxY = Math.max(bounds.maxY, vertex.y);
        bounds.minForward = Math.min(bounds.minForward, forwardCoord);
        bounds.maxForward = Math.max(bounds.maxForward, forwardCoord);
        bounds.minLateral = Math.min(bounds.minLateral, lateralCoord);
        bounds.maxLateral = Math.max(bounds.maxLateral, lateralCoord);
      }
    });

    return bounds;
  }

  startMouthAnimation() {
    // play the short talking sequence when clicked
    if (this.mouthDeformations.length === 0 || this.mouthPlaying) {
      return;
    }

    this.mouthPlaying = true;
    this.talkIndex = 0;
    this.playNextMouthSyllable();
  }

  playNextMouthSyllable() {
    // chain one mouth opening into the next
    const syllable = TALK_PHRASE[this.talkIndex];
    this.talkIndex += 1;

    const openTween = new TWEEN.Tween(this.mouthState)
      .to({ open: syllable.open }, syllable.openMs)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(() => this.applyMouthDeformation());

    const closeTween = new TWEEN.Tween(this.mouthState)
      .to({ open: 0 }, syllable.closeMs)
      .delay(syllable.pauseMs)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(() => this.applyMouthDeformation())
      .onComplete(() => {
        if (this.talkIndex < TALK_PHRASE.length) {
          this.playNextMouthSyllable();
          return;
        }
        this.mouthPlaying = false;
        this.mouthTween = null;
        this.mouthCloseTween = null;
        this.mouthState.open = 0;
        this.applyMouthDeformation();
      });

    openTween.chain(closeTween);
    this.mouthTween = openTween;
    this.mouthCloseTween = closeTween;
    TWEEN.add(openTween, closeTween);
    openTween.start();
  }

  stopMouthAnimation() {
    if (this.mouthTween) {
      TWEEN.remove(this.mouthTween);
      this.mouthTween = null;
    }
    if (this.mouthCloseTween) {
      TWEEN.remove(this.mouthCloseTween);
      this.mouthCloseTween = null;
    }

    this.mouthPlaying = false;
    this.mouthState.open = 0;
    this.applyMouthDeformation();
  }

  applyMouthDeformation() {
    this.mouthOpenUniform.value = this.mouthState.open;
  }

  toLocalHopWaypoint(waypoint) {
    return {
      x: waypoint.x - this.group.position.x,
      z: waypoint.z - this.group.position.z
    };
  }

  stopHopping() {
    if (this.hopTween) {
      this.hopTween.stop();
      TWEEN.remove(this.hopTween);
      this.hopTween = null;
    }

    this.hopping = false;
  }

  startHopping(waypoints = HOP_WAYPOINTS, options = {}) {
    // start or restart the hopping path
    const {
      restart = false,
      loop = true,
      loopWaypoints = null
    } = options;

    if (this.hopping && !restart) {
      return;
    }

    if (restart) {
      this.stopHopping();
    }

    this.hopping = true;
    this.stopMouthAnimation();
    this.hopWaypoints = waypoints;
    this.hopLoopWaypoints = loopWaypoints;
    this.hopLoops = loop;
    this.hopIndex = 0;
    this.startNextHop(0);
  }

  startNextHop(delay = HOP_PAUSE) {
    // jump toward the next waypoint and loop when needed
    if (this.hopIndex >= this.hopWaypoints.length) {
      if (this.hopLoopWaypoints) {
        this.hopWaypoints = this.hopLoopWaypoints;
        this.hopLoopWaypoints = null;
        this.hopIndex = 0;
      } else if (this.hopLoops) {
        this.hopIndex = 0;
      } else {
        this.hopping = false;
        return;
      }
    }

    const destination = this.hopWaypoints[this.hopIndex];
    this.hopIndex += 1;

    const start = {
      x: this.modelRoot.position.x,
      y: this.modelRoot.position.y,
      z: this.modelRoot.position.z
    };
    const end = { x: destination.x, y: HOP_FLOOR_Y, z: destination.z };
    const direction = new THREE.Vector2(end.x - start.x, end.z - start.z);
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    const state = { t: 0 };
    this.hopTween = new TWEEN.Tween(state)
      .to({ t: 1 }, HOP_DURATION)
      .delay(delay)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        const arc = Math.sin(Math.PI * state.t);
        this.modelRoot.position.set(
          THREE.MathUtils.lerp(start.x, end.x, state.t),
          THREE.MathUtils.lerp(start.y, end.y, state.t) + arc * HOP_HEIGHT,
          THREE.MathUtils.lerp(start.z, end.z, state.t)
        );
        this.modelRoot.rotation.set(
          -direction.y * arc * HOP_TILT,
          MOAI_FACE_ENTRANCE_ROTATION + direction.x * arc * 0.08,
          direction.x * arc * HOP_TILT
        );
        this.updateFaceSpotlightTarget();
      })
      .onComplete(() => {
        this.modelRoot.position.set(end.x, end.y, end.z);
        this.modelRoot.rotation.set(0, MOAI_FACE_ENTRANCE_ROTATION, 0);
        this.updateFaceSpotlightTarget();
        if (!this.hopping) {
          return;
        }
        this.startNextHop();
      });

    TWEEN.add(this.hopTween);
    this.hopTween.start();
  }

  updateFaceSpotlightTarget() {
    if (!this.faceSpotlightTarget) {
      return;
    }

    this.faceSpotlightTarget.position.set(
      this.modelRoot.position.x,
      this.modelRoot.position.y + 1.75,
      this.modelRoot.position.z
    );
  }

  getGroundAnchor(model) {
    // use lower vertices to keep the imported model grounded
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const cutoffY = box.min.y + size.y * 0.22;
    const vertex = new THREE.Vector3();
    const groundBox = new THREE.Box3();
    let hasGroundVertices = false;

    model.traverse(child => {
      const position = child.isMesh ? child.geometry?.attributes?.position : null;
      if (!position) {
        return;
      }

      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        child.localToWorld(vertex);
        if (vertex.y <= cutoffY) {
          groundBox.expandByPoint(vertex);
          hasGroundVertices = true;
        }
      }
    });

    const center = hasGroundVertices
      ? groundBox.getCenter(new THREE.Vector3())
      : box.getCenter(new THREE.Vector3());

    return new THREE.Vector3(center.x, box.min.y, center.z);
  }

  awaken() {
    if (this.awake) {
      return;
    }

    this.awake = true;
    this.modelRoot.rotation.y = MOAI_FACE_ENTRANCE_ROTATION;
    this.startHopping();
  }

  awakenIntoAtrium() {
    // switch from room path to atrium path
    const approachWaypoints = ATRIUM_APPROACH_WAYPOINTS.map(waypoint => this.toLocalHopWaypoint(waypoint));
    const loopWaypoints = ATRIUM_LOOP_WAYPOINTS.map(waypoint => this.toLocalHopWaypoint(waypoint));

    this.awake = true;
    this.setFaceSpotlightsEnabled(false);
    this.modelRoot.rotation.y = MOAI_FACE_ENTRANCE_ROTATION;
    this.startHopping(approachWaypoints, {
      restart: true,
      loop: true,
      loopWaypoints
    });
  }

  onClick() {
    this.startMouthAnimation();
  }

  update() {
    if (!this.hopping) {
      this.modelRoot.position.set(0, PEDESTAL_HEIGHT, 0);
      this.modelRoot.rotation.set(0, MOAI_FACE_ENTRANCE_ROTATION, 0);
    }
    this.modelRoot.scale.setScalar(1);
    this.updateFaceSpotlightTarget();
  }
}
