import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinnedModel } from "three/addons/utils/SkeletonUtils.js";
import policemanModelUrl from "../models/characters/policeman.glb?url";

const COLUMN_MODEL_URL = new URL("../models/props/Column/ionic_column.glb",import.meta.url).href;
const BENCH_MODEL_URL = new URL("../models/props/bench/modern_bench_1.glb", import.meta.url).href;
const CEILING_LIGHT_MODEL_URL = new URL("../models/props/Ceiling light/ceiling_light.glb",import.meta.url).href;
const POLICEMAN_MODEL_URL = policemanModelUrl;
const BENCH_LENGTH = 2.45;
const CEILING_HEIGHT = 5.0;
const CORNICE_HEIGHT = 0.28;
const CORNICE_PROJECTION = 0.22;
const CORNICE_ACCENT_HEIGHT = 0.055;
const DOOR_HEIGHT = 3.4;
const DOOR_DEPTH = 0.16;
const DOOR_FRAME_THICKNESS = 0.14;
const DOOR_PANEL_OVERLAP = 0.025;
const DOOR_RAIL_THICKNESS = 0.1;
const DOOR_STILE_THICKNESS = 0.09;

export class Factory {
  constructor(materials, loadingController) {
    // builds reusable meshes and loaded model instances
    this.materials=materials;
    this.loadingController = loadingController;
    this.columnModelPromise = null;
    this.benchModelPromise=null;
    this.ceilingLightModelPromise = null;
    this.policemanModelPromise = null;
  }

  mesh(geometry, material, position = [0, 0, 0], castShadow = true,receiveShadow = true) {
    // helper to create a positioned mesh with common shadow defaults
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0],position[1], position[2]);
    mesh.castShadow=castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }

  createFloor(width, depth, position = [0, 0, 0]) {
    const mesh = this.mesh(
      new THREE.BoxGeometry(width,0.16, depth),
      this.materials.floor,
      [position[0],-0.08, position[2]],
      false,
      true
    );
    return mesh;
  }

  createWall(width, height, depth, position) {
    return this.mesh(new THREE.BoxGeometry(width,height,depth), this.materials.wall, position,true, true);
  }

  createCeiling(width, depth, position, height = CEILING_HEIGHT) {
    const mesh = this.mesh(new THREE.PlaneGeometry(width,depth), this.materials.ceiling, [position[0],height, position[2]], false,true);
    mesh.rotation.x = Math.PI*0.5;
    return mesh;
  }

  createCornice(width, depth, position, height = CEILING_HEIGHT) {
    // decorative ceiling frame from simple bands
    const group = new THREE.Group();
    group.name = "Ceiling Cornice";

    const y=height- CORNICE_HEIGHT / 2;
    const accentY = height-CORNICE_HEIGHT + CORNICE_ACCENT_HEIGHT / 2;
    const halfWidth =width / 2;
    const halfDepth=depth/2;
    const addBand = (geometry, bandPosition) => {
      const band = this.mesh(geometry,this.materials.wood,bandPosition,true, true);
      group.add(band);
    };

    const addAccent = (geometry, accentPosition) => {
      const accent = this.mesh(geometry,this.materials.gold, accentPosition,true, true);
      group.add(accent);
    };

    addBand(new THREE.BoxGeometry(width,CORNICE_HEIGHT, CORNICE_PROJECTION), [position[0],y, position[2] - halfDepth + CORNICE_PROJECTION / 2]);
    addBand(new THREE.BoxGeometry(width, CORNICE_HEIGHT,CORNICE_PROJECTION), [position[0],y, position[2]+halfDepth - CORNICE_PROJECTION / 2]);
    addBand(new THREE.BoxGeometry(CORNICE_PROJECTION,CORNICE_HEIGHT, depth), [position[0]-halfWidth + CORNICE_PROJECTION / 2,y, position[2]]);
    addBand(new THREE.BoxGeometry(CORNICE_PROJECTION, CORNICE_HEIGHT,depth), [position[0]+halfWidth - CORNICE_PROJECTION / 2,y, position[2]]);

    addAccent(new THREE.BoxGeometry(width,CORNICE_ACCENT_HEIGHT,CORNICE_PROJECTION * 1.08), [position[0],accentY, position[2] - halfDepth + CORNICE_PROJECTION / 2]);
    addAccent(new THREE.BoxGeometry(width, CORNICE_ACCENT_HEIGHT,CORNICE_PROJECTION * 1.08), [position[0],accentY, position[2]+halfDepth - CORNICE_PROJECTION / 2]);
    addAccent(new THREE.BoxGeometry(CORNICE_PROJECTION * 1.08,CORNICE_ACCENT_HEIGHT, depth), [position[0] - halfWidth + CORNICE_PROJECTION / 2,accentY, position[2]]);
    addAccent(new THREE.BoxGeometry(CORNICE_PROJECTION * 1.08, CORNICE_ACCENT_HEIGHT,depth), [position[0] + halfWidth - CORNICE_PROJECTION / 2,accentY, position[2]]);

    return group;
  }

  createCeilingLight(position, diameter = 1.25) {
    // create the ceiling light group and fill it when 
    const group = new THREE.Group();
    group.position.set(position[0],position[1], position[2]);

    this.loadCeilingLightModel()
      .then(model => {
        group.add(this.createCeilingLightModelInstance(model,diameter));
      })
      .catch(error => {
        console.error("Failed to load the chandelier model:", error);
      });

    return group;
  }

  loadCeilingLightModel() {
    if (!this.ceilingLightModelPromise) {
      // Load the chandelier and then reuse it 
      const loader = new GLTFLoader();
      const promise = loader.loadAsync(CEILING_LIGHT_MODEL_URL).then(gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        return model;
      });
      this.ceilingLightModelPromise = this.loadingController?.track(promise) ?? promise;
    }

    return this.ceilingLightModelPromise;
  }

  createCeilingLightModelInstance(model, diameter) {
    const instance = model.clone(true);
    instance.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    const box = new THREE.Box3().setFromObject(instance);
    const size=box.getSize(new THREE.Vector3());
    const horizontalSize = Math.max(size.x,size.z, 0.001);
    const scale=diameter/ horizontalSize;

    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(instance);
    const center = scaledBox.getCenter(new THREE.Vector3());
    instance.position.set(-center.x,-scaledBox.max.y, -center.z);

    return instance;
  }

  createWallSconce(position, rotationY = 0) {
    // procedural wall lamp
    const group = new THREE.Group();
    group.name = "Wall Sconce";
    group.position.set(position[0],position[1], position[2]);
    group.rotation.y=rotationY;

    const metal = new THREE.MeshStandardMaterial({
      color: 0x10131a,
      roughness:0.34,
      metalness: 0.72
    });
    const warmGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffd7a0,
      roughness: 0.18,
      metalness: 0,
      transmission:0.25,
      transparent: true,
      opacity: 0.72,
      emissive: 0xffa64c,
      emissiveIntensity: 0
    });

    const backplate = this.mesh(new THREE.BoxGeometry(0.48,0.72,0.08), metal, [0,0,0], true,true);
    const topCap = this.mesh(new THREE.BoxGeometry(0.58,0.08, 0.1), this.materials.gold, [0,0.4,0.01], true, true);
    const bottomCap = this.mesh(new THREE.BoxGeometry(0.58, 0.08,0.1), this.materials.gold, [0,-0.4,0.01], true,true);

    const arm = this.mesh(new THREE.CylinderGeometry(0.035,0.045,0.36, 16), this.materials.gold, [0,0.02,0.2], true,true);
    arm.rotation.x=Math.PI * 0.5;

    const shade = this.mesh(new THREE.CylinderGeometry(0.16,0.19,0.52, 28), warmGlass, [0,0.02,0.39], true,false);
    const shadeTop = this.mesh(new THREE.TorusGeometry(0.16,0.018,8, 28), this.materials.gold, [0,0.29,0.39], true,true);
    const shadeBottom = this.mesh(new THREE.TorusGeometry(0.19, 0.018,8, 28), this.materials.gold, [0,-0.25,0.39], true,true);
    shadeTop.rotation.x = Math.PI * 0.5;
    shadeBottom.rotation.x = Math.PI * 0.5;

    group.add(backplate,topCap, bottomCap,arm, shade,shadeTop, shadeBottom);
    group.userData.emissiveMaterial=warmGlass;
    return group;
  }

  createColumn(position, height = 4.2) {
    // create the column container and fill it
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);

    this.loadColumnModel()
      .then(model => {
        group.add(this.createColumnModelInstance(model, height + 0.8));
      })
      .catch(error => {
        console.error("Failed to load the column model:", error);
      });

    return group;
  }

  loadColumnModel() {
    if (!this.columnModelPromise) {
      const loader = new GLTFLoader();
      const promise = loader.loadAsync(COLUMN_MODEL_URL).then(gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        return model;
      });
      this.columnModelPromise = this.loadingController?.track(promise) ?? promise;
    }

    return this.columnModelPromise;
  }

  createColumnModelInstance(model, height) {
    const instance = model.clone(true);
    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const scale = height / Math.max(size.y, 0.001);

    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(instance);
    const center = scaledBox.getCenter(new THREE.Vector3());
    instance.position.set(-center.x, -scaledBox.min.y, -center.z);

    return instance;
  }

  createDoorFrame(position, rotationY = 0, width = 3.6) {
    // interactive sliding doorway and cache its panel positions.
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotationY;
    group.userData.isDoor = true;
    group.userData.doorVisual = null;
    group.userData.slidingPanels = [];
    group.userData.isOpen = false;
    group.userData.isAnimating = false;
    group.userData.ready = true;
    group.userData.closedPositions = [];
    group.userData.openPositions = [];
    group.userData.autoCloseTimeout = null;

    const doorVisual = this.createProceduralSlidingDoor(width);
    const slidingPanels = [doorVisual.userData.leftPanel, doorVisual.userData.rightPanel];

    group.add(doorVisual);
    group.userData.doorVisual = doorVisual;
    group.userData.slidingPanels = slidingPanels;
    group.userData.closedPositions = slidingPanels.map(panel => panel.position.clone());
    group.userData.openPositions = slidingPanels.map(panel => {
      const direction = panel.userData.slideDirection ?? 1;
      return panel.position.clone().add(new THREE.Vector3(direction * width * 0.5, 0, 0));
    });

    return group;
  }

  createProceduralSlidingDoor(width) {
    // procedural two-panel door
    const group = new THREE.Group();
    group.name = "ProceduralSlidingDoor";

    const metalMaterial = this.createDoorMetalMaterial();
    const glassMaterial = this.createDoorGlassMaterial();
    const railMaterial = this.createDoorRailMaterial();

    const jambHeight = DOOR_HEIGHT;
    const headerY = DOOR_HEIGHT - DOOR_FRAME_THICKNESS / 2;
    const panelHeight = DOOR_HEIGHT - DOOR_FRAME_THICKNESS * 2;
    const panelWidth = width / 2 + DOOR_PANEL_OVERLAP;
    const panelY = DOOR_FRAME_THICKNESS + panelHeight / 2;

    const leftJamb = this.mesh(new THREE.BoxGeometry(DOOR_FRAME_THICKNESS, jambHeight, DOOR_DEPTH), metalMaterial, [-width / 2, jambHeight / 2, 0]);
    const rightJamb = this.mesh(new THREE.BoxGeometry(DOOR_FRAME_THICKNESS, jambHeight, DOOR_DEPTH), metalMaterial, [width / 2, jambHeight / 2, 0]);
    const header = this.mesh(new THREE.BoxGeometry(width + DOOR_FRAME_THICKNESS, DOOR_FRAME_THICKNESS, DOOR_DEPTH), metalMaterial, [0, headerY, 0]);
    const threshold = this.mesh(new THREE.BoxGeometry(width + DOOR_FRAME_THICKNESS, DOOR_FRAME_THICKNESS * 0.6, DOOR_DEPTH), metalMaterial, [0, DOOR_FRAME_THICKNESS * 0.3, 0]);
    const track = this.mesh(new THREE.BoxGeometry(width * 0.96, 0.04, DOOR_DEPTH * 1.22), railMaterial, [0, DOOR_HEIGHT - DOOR_FRAME_THICKNESS - 0.03, 0.01], true, true);

    const leftPanel = this.createDoorPanel(panelWidth, panelHeight, metalMaterial, glassMaterial);
    const rightPanel = this.createDoorPanel(panelWidth, panelHeight, metalMaterial, glassMaterial);
    leftPanel.name = "LeftSlidingDoorPanel";
    rightPanel.name = "RightSlidingDoorPanel";
    leftPanel.position.set(-panelWidth / 2 + DOOR_PANEL_OVERLAP / 2, panelY, 0);
    rightPanel.position.set(panelWidth / 2 - DOOR_PANEL_OVERLAP / 2, panelY, 0);
    leftPanel.userData.slideDirection = -1;
    rightPanel.userData.slideDirection = 1;

    group.add(leftJamb, rightJamb, header, threshold, track, leftPanel, rightPanel);
    group.userData.leftPanel = leftPanel;
    group.userData.rightPanel = rightPanel;
    return group;
  }

  createDoorPanel(width, height, metalMaterial, glassMaterial) {
    const panel = new THREE.Group();
    const glassWidth = width - DOOR_STILE_THICKNESS * 2;
    const glassHeight = height - DOOR_RAIL_THICKNESS * 2;

    const glass = this.mesh(new THREE.PlaneGeometry(glassWidth, glassHeight), glassMaterial, [0, 0, DOOR_DEPTH * 0.52], false, false);
    const leftStile = this.mesh(new THREE.BoxGeometry(DOOR_STILE_THICKNESS, height, DOOR_DEPTH), metalMaterial, [-width / 2 + DOOR_STILE_THICKNESS / 2, 0, 0]);
    const rightStile = this.mesh(new THREE.BoxGeometry(DOOR_STILE_THICKNESS, height, DOOR_DEPTH), metalMaterial, [width / 2 - DOOR_STILE_THICKNESS / 2, 0, 0]);
    const topRail = this.mesh(new THREE.BoxGeometry(width, DOOR_RAIL_THICKNESS, DOOR_DEPTH), metalMaterial, [0, height / 2 - DOOR_RAIL_THICKNESS / 2, 0]);
    const bottomRail = this.mesh(new THREE.BoxGeometry(width, DOOR_RAIL_THICKNESS, DOOR_DEPTH), metalMaterial, [0, -height / 2 + DOOR_RAIL_THICKNESS / 2, 0]);

    panel.add(glass, leftStile, rightStile, topRail, bottomRail);
    return panel;
  }

  createDoorMetalMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.42,
      metalness: 0.38
    });
  }

  createDoorRailMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.55,
      metalness: 0.45
    });
  }

  createDoorGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x9fc7ff,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  createSign(text, position, rotationY = 0, width = 3.1) {
    // build a 3D sign and draw its label onto a canvas texture
    const group = new THREE.Group();
    const sign = this.mesh(new THREE.BoxGeometry(width, 0.7, 0.12), this.materials.sign, [0, 0, 0], true, false);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "#10182a";
    context.fillRect(0, 0, 512, 128);
    context.strokeStyle = "#e9c477";
    context.lineWidth = 8;
    context.strokeRect(10, 10, 492, 108);
    context.fillStyle = "#ffe3a6";
    context.font = 'bold 40px "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 256, 67);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = this.mesh(
      new THREE.PlaneGeometry(width * 0.92, 0.52),
      labelMaterial,
      [0, 0, 0.065],
      false,
      false
    );
    group.add(sign, label);
    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotationY;
    return group;
  }

  createBench(position, rotationY = 0) {
    // // create the bench group and fill it
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = rotationY;

    this.loadBenchModel()
      .then(model => {
        group.add(this.createBenchModelInstance(model, BENCH_LENGTH));
      })
      .catch(error => {
        console.error("Failed to load the bench model:", error);
      });

    return group;
  }

  loadPolicemanModel() {
    if (!this.policemanModelPromise) {
      // load the policeman model once and reuse it for cloned instances
      const loader = new GLTFLoader();
      const promise = loader.loadAsync(POLICEMAN_MODEL_URL).then(async gltf => {
        const model = gltf.scene;
        gltf.animations.length = 0;
        await this.applyPolicemanSpecGlossMaterials(gltf);
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        return model;
      });
      this.policemanModelPromise = this.loadingController?.track(promise) ?? promise;
    }

    return this.policemanModelPromise;
  }

  async applyPolicemanSpecGlossMaterials(gltf) {
    // Convert the imported materials into the roughness-based setup
    const parser = gltf.parser;
    const materialDefs = parser?.json?.materials ?? [];
    const patchedMaterials = new Set();
    const textureAssignments = [];

    gltf.scene.traverse(child => {
      if (!child.isMesh) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => {
        if (!material || patchedMaterials.has(material)) {
          return;
        }

        patchedMaterials.add(material);
        const materialIndex = parser.associations.get(material)?.materials;
        const materialDef = materialDefs[materialIndex];
        const specGloss = materialDef?.extensions?.KHR_materials_pbrSpecularGlossiness;

        if (!specGloss) {
          return;
        }

        if (specGloss.diffuseFactor) {
          material.color.setRGB(
            specGloss.diffuseFactor[0],
            specGloss.diffuseFactor[1],
            specGloss.diffuseFactor[2],
            THREE.LinearSRGBColorSpace
          );
          material.opacity = specGloss.diffuseFactor[3] ?? 1;
          material.transparent = material.opacity < 1;
        }

        if (specGloss.diffuseTexture) {
          textureAssignments.push(parser.assignTexture(material, "map", specGloss.diffuseTexture, THREE.SRGBColorSpace));
        }

        material.metalness = 0;
        material.roughness = THREE.MathUtils.clamp(1 - (specGloss.glossinessFactor ?? 1), 0.04, 1);
        material.needsUpdate = true;
      });
    });

    await Promise.all(textureAssignments);
    patchedMaterials.forEach(material => {
      material.needsUpdate = true;
    });
  }

  createPolicemanModelInstance(model, height) {
    // clone, pose and scale the skinned model
    const instance = cloneSkinnedModel(model);
    this.posePolicemanArmsAtSides(instance);

    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const scale = height / Math.max(size.y, 0.001);

    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(instance);
    const center = scaledBox.getCenter(new THREE.Vector3());
    instance.position.set(-center.x, -scaledBox.min.y, -center.z);

    return instance;
  }

  posePolicemanArmsAtSides(model) {
    // rotate the imported arm bones into a standing pos.
    model.updateMatrixWorld(true);
    this.posePolicemanArm(model, {
      upperArm: "mixamorig:LeftArm_09",
      foreArm: "mixamorig:LeftForeArm_010",
      hand: "mixamorig:LeftHand_011",
      sideSign: 1
    });
    this.posePolicemanArm(model, {
      upperArm: "mixamorig:RightArm_033",
      foreArm: "mixamorig:RightForeArm_034",
      hand: "mixamorig:RightHand_035",
      sideSign: -1
    });
  }

  posePolicemanArm(model, config) {
    const upperArm = this.getModelObjectByOriginalName(model, config.upperArm);
    const foreArm = this.getModelObjectByOriginalName(model, config.foreArm);
    const hand = this.getModelObjectByOriginalName(model, config.hand);

    if (!upperArm || !foreArm || !hand) {
      return;
    }

    const upperTarget = new THREE.Vector3(config.sideSign * 0.16, -0.98, 0.04).normalize();
    const foreTarget = new THREE.Vector3(config.sideSign * 0.05, -0.99, 0.03).normalize();

    this.rotateBoneTowardChild(upperArm, foreArm, upperTarget);
    model.updateMatrixWorld(true);
    this.rotateBoneTowardChild(foreArm, hand, foreTarget);
    model.updateMatrixWorld(true);
  }

  getModelObjectByOriginalName(model, name) {
    return model.getObjectByName(name) ?? model.getObjectByName(name.replaceAll(":", ""));
  }

  rotateBoneTowardChild(bone, childBone, targetWorldDirection) {
    const bonePosition = bone.getWorldPosition(new THREE.Vector3());
    const childPosition = childBone.getWorldPosition(new THREE.Vector3());
    const currentDirection = childPosition.sub(bonePosition).normalize();

    if (currentDirection.lengthSq() === 0 || targetWorldDirection.lengthSq() === 0) {
      return;
    }

    const parentWorldQuaternion = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const boneWorldQuaternion = bone.getWorldQuaternion(new THREE.Quaternion());
    const correction = new THREE.Quaternion().setFromUnitVectors(currentDirection, targetWorldDirection.clone().normalize());

    bone.quaternion.copy(parentWorldQuaternion.invert().multiply(correction.multiply(boneWorldQuaternion)));
  }

  loadBenchModel() {
    if (!this.benchModelPromise) {
      // load the bench mode and reuse it for every bench in the scene
      const loader = new GLTFLoader();
      const promise = loader.loadAsync(BENCH_MODEL_URL).then(gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        return model;
      });
      this.benchModelPromise = this.loadingController?.track(promise) ?? promise;
    }

    return this.benchModelPromise;
  }

  createBenchModelInstance(model, length) {
    // scale the bench to requested footprint and place it on the floor
    const instance = model.clone(true);
    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const horizontalLength = Math.max(size.x, size.z, 0.001);
    const scale = length / horizontalLength;

    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(instance);
    const center = scaledBox.getCenter(new THREE.Vector3());
    instance.position.set(-center.x, -scaledBox.min.y, -center.z);

    return instance;
  }
}
