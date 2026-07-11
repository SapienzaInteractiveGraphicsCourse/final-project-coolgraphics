import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

// player scale and walking animation timings
const PLAYER_MODEL_HEIGHT = 2.05;
const WALK_CYCLE_DURATION = 760;
const WALK_START_DURATION = 160;
const WALK_STOP_DURATION = 220;
const TAU =Math.PI * 2;
const FOOT_LIFT_ANGLE = THREE.MathUtils.degToRad(22);
const FOOT_PUSH_ANGLE = THREE.MathUtils.degToRad(-8);
const HELD_FLASHLIGHT_WORLD_SCALE = 0.44;
const HELD_FLASHLIGHT_HAND_OFFSET = new THREE.Vector3(0.2, 5.0, 5.0);
const RIGHT_WRIST_GRIP_BEND = THREE.MathUtils.degToRad(40);
const RIGHT_HAND_BONE_NAME = "mixamorig:RightHand_035";
// finger bones used for the flashlight grip
const RIGHT_HAND_GRIP_CHAINS = [
  {
    base: "mixamorig:RightHandThumb1_036",
    mid: "mixamorig:RightHandThumb2_037",
    tip: "mixamorig:RightHandThumb3_038",
    end: "mixamorig:RightHandThumb4_039",
    curl: [25, 35, 25]
  },
  {
    base: "mixamorig:RightHandIndex1_040",
    mid: "mixamorig:RightHandIndex2_041",
    tip: "mixamorig:RightHandIndex3_042",
    end: "mixamorig:RightHandIndex4_043",
    curl: [42, 55, 40]
  },
  {
    base: "mixamorig:RightHandMiddle1_044",
    mid: "mixamorig:RightHandMiddle2_045",
    tip: "mixamorig:RightHandMiddle3_046",
    end: "mixamorig:RightHandMiddle4_047",
    curl: [46, 58, 42]
  },
  {
    base: "mixamorig:RightHandRing1_048",
    mid: "mixamorig:RightHandRing2_049",
    tip: "mixamorig:RightHandRing3_050",
    end: "mixamorig:RightHandRing4_00",
    curl: [48, 60, 44]
  },
  {
    base: "mixamorig:RightHandPinky1_051",
    mid: "mixamorig:RightHandPinky2_052",
    tip: "mixamorig:RightHandPinky3_053",
    end: "mixamorig:RightHandPinky4_054",
    curl: [50, 62, 46]
  }
];

// arm bones used for procedural swing and aiming
const ARM_CHAINS = [
  {
    upper: "mixamorig:LeftArm_09",
    lower: "mixamorig:LeftForeArm_010",
    end: "mixamorig:LeftHand_011",
    sideSign: 1
  },
  {
    upper: "mixamorig:RightArm_033",
    lower: "mixamorig:RightForeArm_034",
    end: "mixamorig:RightHand_035",
    sideSign: -1
  }
];

// leg bones used for procedural walking
const LEG_CHAINS = [
  {
    upper: "mixamorig:LeftUpLeg_055",
    lower: "mixamorig:LeftLeg_056",
    end: "mixamorig:LeftFoot_057",
    toe: "mixamorig:LeftToeBase_058",
    sideSign: 1
  },
  {
    upper: "mixamorig:RightUpLeg_060",
    lower: "mixamorig:RightLeg_061",
    end: "mixamorig:RightFoot_062",
    toe: "mixamorig:RightToeBase_063",
    sideSign: -1
  }
];

const SPINE_BONE_NAME = "mixamorig:Spine_02";

export class Player {
  constructor(materials, inputManager, collisionSystem, factory) {
    this.materials = materials;
    this.inputManager = inputManager;
    this.collisionSystem = collisionSystem;
    this.factory = factory;
    this.speed = 5.4;
    this.turnSpeed = 2.8;
    this.group = new THREE.Group();
    this.group.position.set(0,0, 3.8);

    this.modelRoot = null;
    this.modelBasePosition = new THREE.Vector3();
    // walk cycle and procedural pose state
    this.walkDirection = 1;
    this.isWalking = false;
    this.walkState = { phase: 0, strength: 0 };
    this.walkTween = null;
    this.walkStrengthTween = null;
    this.tweenGroup = new TWEEN.Group();
    this.animatedBones = [];
    this.armChains = [];
    this.legChains = [];
    this.modelMeshes = [];
    this.spine = null;
    this.rightHand = null;
    this.rightHandGripChains = [];
    this.spineBaseQuaternion = new THREE.Quaternion();
    this.offsetQuaternion = new THREE.Quaternion();
    this.aimDirection = new THREE.Vector3(0, 0, 1);
    this.targetAimDirection = new THREE.Vector3(0, 0, 1);
    // The flashlight pose is only active when the museum uses secondary lighting.
    this.flashlightActive = false;

    this.createFlashlight();
    this.loadModel();
  }

  loadModel() {
    // load, scale and prepare the player model
    this.factory.loadPolicemanModel()
      .then(model => {
        const instance = this.factory.createPolicemanModelInstance(model, PLAYER_MODEL_HEIGHT);
        instance.rotation.y = 0;
        instance.updateMatrixWorld(true);

        this.modelRoot = instance;
        this.modelBasePosition.copy(instance.position);
        this.group.add(instance);
        this.collectModelMeshes(instance);
        this.setupHierarchicalWalk(instance);
        this.attachFlashlightToHand(instance);
        this.applyWalkPose();
      })
      .catch(error => {
        console.error("Failed to load the policeman player model:", error);
      });
  }

  setupHierarchicalWalk(model) {
    // cache bones used by walk and flashlight poses
    this.animatedBones = [];
    this.armChains = ARM_CHAINS.map(config => this.createAnimatedChain(model,config)).filter(Boolean);
    this.legChains = LEG_CHAINS.map(config => this.createAnimatedChain(model, config)).filter(Boolean);
    this.spine = this.getModelObjectByOriginalName(model, SPINE_BONE_NAME);
    this.rightHand = this.getModelObjectByOriginalName(model, RIGHT_HAND_BONE_NAME);
    this.rightHandGripChains = RIGHT_HAND_GRIP_CHAINS.map(config => this.createGripChain(model, config)).filter(Boolean);

    if (this.spine) {
      this.spineBaseQuaternion.copy(this.spine.quaternion);
    }
  }

  collectModelMeshes(model) {
    this.modelMeshes = [];
    model.traverse(child => {
      if (child.isMesh) {
        this.modelMeshes.push(child);
      }
    });
  }

  createAnimatedChain(model, config) {
    const upper = this.getModelObjectByOriginalName(model, config.upper);
    const lower = this.getModelObjectByOriginalName(model, config.lower);
    const end = this.getModelObjectByOriginalName(model, config.end);
    const toe = config.toe ? this.getModelObjectByOriginalName(model, config.toe) : null;

    if (!upper || !lower || !end) {
      return null;
    }

    return {
      upper: this.trackAnimatedBone(upper),
      lower: this.trackAnimatedBone(lower),
      end: this.trackAnimatedBone(end),
      toe: toe ? this.trackAnimatedBone(toe) : null,
      sideSign: config.sideSign
    };
  }

  createGripChain(model, config) {
    const base = this.getModelObjectByOriginalName(model, config.base);
    const mid = this.getModelObjectByOriginalName(model, config.mid);
    const tip = this.getModelObjectByOriginalName(model, config.tip);
    const end = this.getModelObjectByOriginalName(model, config.end);

    if (!base || !mid || !tip || !end) {
      return null;
    }

    return {
      base: this.trackAnimatedBone(base),
      mid: this.trackAnimatedBone(mid),
      tip: this.trackAnimatedBone(tip),
      end,
      curl: config.curl.map(THREE.MathUtils.degToRad)
    };
  }

  trackAnimatedBone(bone) {
    let tracked = this.animatedBones.find(entry => entry.bone === bone);

    if (!tracked) {
      tracked = {
        bone,
        baseQuaternion: bone.quaternion.clone()
      };
      this.animatedBones.push(tracked);
    }

    return tracked;
  }

  getModelObjectByOriginalName(model, name) {
    return model.getObjectByName(name)?? model.getObjectByName(name.replaceAll(":", ""));
  }

  createFlashlight() {
    // small handheld flashlight with its spotlight target
    this.flashlightGroup = new THREE.Group();
    this.flashlightGroup.name = "Player Flashlight";
    this.flashlightGroup.visible = false;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x151923,
      roughness: 0.35,
      metalness: 0.55
    });
    this.flashlightLensMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe0a4,
      roughness: 0.2,
      metalness: 0,
      emissive: 0xffc36d,
      emissiveIntensity: 0
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.42, 16), bodyMaterial);
    handle.rotation.x = Math.PI * 0.5;
    handle.castShadow = true;
    handle.receiveShadow = true;

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.075, 0.16, 20), bodyMaterial);
    head.rotation.x = Math.PI * 0.5;
    head.position.z = 0.24;
    head.castShadow = true;
    head.receiveShadow = true;

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.083, 20), this.flashlightLensMaterial);
    lens.position.z = 0.325;

    this.flashlight = new THREE.SpotLight(0xffe2b2, 0, 13, Math.PI / 8, 0.55, 1.25);
    this.flashlight.position.set(0, 0, 0.34);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.bias = -0.00025;
    this.flashlight.shadow.normalBias = 0.04;
    this.flashlight.userData.baseIntensity = 3.6;
    this.flashlight.userData.emissiveMaterial = this.flashlightLensMaterial;

    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0,-1.15, 7);
    this.flashlight.target = this.flashlightTarget;

    this.flashlightGroup.add(handle, head, lens, this.flashlight, this.flashlightTarget);
    this.group.add(this.flashlightGroup);
  }

  setModelVisible(visible) {
    this.modelMeshes.forEach(mesh => {
      mesh.visible = visible;
    });
  }

  setAimDirection(direction) {
    this.targetAimDirection.copy(direction).normalize();
  }

  aimForward() {
    this.targetAimDirection.set(
      Math.sin(this.group.rotation.y),
      0,
      Math.cos(this.group.rotation.y)
    );
  }

  attachFlashlightToHand(model) {
    // attach flashlight to the right hand and keep a stable scale
    const hand = this.rightHand ?? this.getModelObjectByOriginalName(model, RIGHT_HAND_BONE_NAME);

    if (!hand) {
      return;
    }

    this.rightHand=hand;
    this.modelRoot.updateMatrixWorld(true);
    hand.add(this.flashlightGroup);

    const handWorldScale =hand.getWorldScale(new THREE.Vector3());
    const parentScale = Math.max(handWorldScale.x,handWorldScale.y, handWorldScale.z, 0.0001);
    const localScale = HELD_FLASHLIGHT_WORLD_SCALE/parentScale;

    this.flashlightGroup.visible = this.flashlightActive;
    this.flashlightGroup.scale.setScalar(localScale);
    this.flashlightGroup.position.copy(HELD_FLASHLIGHT_HAND_OFFSET);
    this.updateHeldFlashlightTransform();
  }

  setFlashlightActive(active) {
    this.flashlightActive = Boolean(active);
    this.flashlightGroup.visible = this.flashlightActive;

    // Rebuild the pose immediately, including when the player is stationary.
    if (this.modelRoot) {
      this.applyWalkPose();
    }
  }

  update(deltaTime, elapsedTime) {
    // read input, move the player and refresh the pose
    const previousPosition =this.group.position.clone();
    const turnInput = (this.inputManager.isDown("d") ? 1 :0) - (this.inputManager.isDown("a") ? 1 : 0);
    const moveInput = (this.inputManager.isDown("w") ? 1 : 0) -(this.inputManager.isDown("s") ? 1 : 0);
    const moving = moveInput!==0;

    if(turnInput !== 0) {
      this.group.rotation.y -= turnInput*this.turnSpeed * deltaTime;
    }

    if(moving) {
      this.walkDirection = moveInput > 0 ? 1 : -1;
      const forward = new THREE.Vector3(Math.sin(this.group.rotation.y),0, Math.cos(this.group.rotation.y));
      this.group.position.addScaledVector(forward,moveInput * this.speed * deltaTime);
    }

    this.collisionSystem.constrain(this.group.position,0.48, previousPosition);
    this.setWalking(moving);
    this.tweenGroup.update(elapsedTime*1000);
    this.aimDirection
      .lerp(this.targetAimDirection,1 - Math.exp(-12 * deltaTime))
      .normalize();
    this.applyWalkPose();
  }

  setWalking(walking) {
    // fade the walking strength when movement starts or stops
    if(walking === this.isWalking) {
      return;
    }

    this.isWalking=walking;

    if(this.walkStrengthTween) {
      this.walkStrengthTween.stop();
      this.walkStrengthTween=null;
    }

    if(walking) {
      this.startWalkCycle();
      this.walkStrengthTween = new TWEEN.Tween(this.walkState, this.tweenGroup)
        .to({ strength: 1 },WALK_START_DURATION)
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .onUpdate(() => this.applyWalkPose())
        .start();
      return;
    }

    this.walkStrengthTween = new TWEEN.Tween(this.walkState, this.tweenGroup)
      .to({ strength: 0 },WALK_STOP_DURATION)
      .easing(TWEEN.Easing.Sinusoidal.Out)
      .onUpdate(() => this.applyWalkPose())
      .onComplete(() => {
        this.stopWalkCycle();
        this.walkState.phase=0;
        this.applyWalkPose();
      })
      .start();
  }

  startWalkCycle() {
    // loop the walk phase while movement is active
    if(this.walkTween) {
      return;
    }

    this.walkState.phase =this.walkState.phase % TAU;
    this.walkTween = new TWEEN.Tween(this.walkState, this.tweenGroup)
      .to({ phase: this.walkState.phase + TAU },WALK_CYCLE_DURATION)
      .easing(TWEEN.Easing.Linear.None)
      .repeat(Infinity)
      .onUpdate(() => this.applyWalkPose())
      .start();
  }

  stopWalkCycle() {
    if(!this.walkTween) {
      return;
    }

    this.walkTween.stop();
    this.walkTween=null;
  }

  applyWalkPose() {
    // rebuild the procedural pose from the current walk phase
    if(!this.modelRoot) {
      return;
    }

    const strength =this.walkState.strength;
    const phase =this.walkState.phase;
    const leftStep = Math.sin(phase)*strength * this.walkDirection;
    const rightStep =-leftStep;
    const bounce = Math.abs(Math.sin(phase* 2)) * 0.035 * strength;

    this.resetAnimatedBones();
    this.modelRoot.position.copy(this.modelBasePosition);
    this.modelRoot.position.y+= bounce;

    if(this.spine) {
      this.offsetQuaternion.setFromAxisAngle(
        new THREE.Vector3(0,0, 1),
        Math.sin(phase)*0.035 * strength
      );
      this.spine.quaternion.copy(this.spineBaseQuaternion).multiply(this.offsetQuaternion);
    }

    this.modelRoot.updateMatrixWorld(true);

    this.applyArmSwing(this.armChains[0],-leftStep);
    if (this.flashlightActive) {
      this.applyTorchArmPose(this.armChains[1],phase, strength);
      this.applyRightHandGrip();
    } else {
      this.applyArmSwing(this.armChains[1],-rightStep);
    }
    this.applyLegSwing(this.legChains[0],leftStep);
    this.applyLegSwing(this.legChains[1],rightStep);
    this.updateHeldFlashlightTransform();
  }

  resetAnimatedBones() {
    this.animatedBones.forEach(entry => {
      entry.bone.quaternion.copy(entry.baseQuaternion);
    });
  }

  applyArmSwing(chain, swing) {
    if(!chain) {
      return;
    }

    const upperTarget = new THREE.Vector3(chain.sideSign*0.14, -0.96, 0.3 * swing).normalize();
    const foreTarget = new THREE.Vector3(chain.sideSign * 0.05,-0.98, 0.18 * swing).normalize();

    this.applyChainTarget(chain,upperTarget, foreTarget);
  }

  applyTorchArmPose(chain, phase, strength) {
    // aim the right arm toward the flashlight direction
    if (!chain) {
      return;
    }

    const walkingBob = Math.sin(phase * 2) * 0.035 * strength;
    const modelWorldQuaternion = this.modelRoot.getWorldQuaternion(new THREE.Quaternion());
    const localAim = this.aimDirection
      .clone()
      .applyQuaternion(modelWorldQuaternion.invert())
      .normalize();
    const upperTarget = new THREE.Vector3(
      localAim.x + chain.sideSign * 0.16,
      localAim.y - 0.18 + walkingBob,
      localAim.z
    ).normalize();
    const foreTarget = new THREE.Vector3(
      localAim.x - chain.sideSign * 0.04,
      localAim.y - 0.04 + walkingBob,
      localAim.z
    ).normalize();

    this.applyChainTarget(chain, upperTarget, foreTarget);
  }

  applyRightHandGrip() {
    if (!this.flashlightGroup.visible || this.rightHandGripChains.length === 0) {
      return;
    }

    const wrist = this.armChains[1]?.end;
    if (wrist) {
      this.offsetQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        RIGHT_WRIST_GRIP_BEND
      );
      wrist.bone.quaternion
        .copy(wrist.baseQuaternion)
        .multiply(this.offsetQuaternion);
    }

    this.rightHandGripChains.forEach(chain => {
      [chain.base, chain.mid, chain.tip].forEach((joint, index) => {
        this.offsetQuaternion.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          chain.curl[index]
        );
        joint.bone.quaternion
          .copy(joint.baseQuaternion)
          .multiply(this.offsetQuaternion);
      });
    });

    this.modelRoot.updateMatrixWorld(true);
  }

  updateHeldFlashlightTransform() {
    if (!this.flashlightGroup.visible || !this.flashlightGroup.parent || !this.modelRoot) {
      return;
    }

    this.modelRoot.updateMatrixWorld(true);

    const forward = this.aimDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const correctedUp = new THREE.Vector3().crossVectors(forward, right).normalize();
    const worldMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward);
    const worldQuaternion = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
    const parentQuaternion = this.flashlightGroup.parent.getWorldQuaternion(new THREE.Quaternion());

    this.flashlightGroup.quaternion.copy(parentQuaternion.invert().multiply(worldQuaternion));
  }

  applyLegSwing(chain, swing) {
    // lift the advancing foot and bend the supporting leg
    if (!chain) {
      return;
    }

    const stride = THREE.MathUtils.clamp(swing, -1, 1);
    const forwardStride = Math.max(stride, 0);
    const supportPressure = Math.max(-stride, 0);
    const advancing = THREE.MathUtils.smoothstep(forwardStride, 0.04, 0.86);
    const toeOff = THREE.MathUtils.smoothstep(supportPressure, 0.72, 1);
    const kneeBend = advancing * 0.76 + toeOff * 0.16;
    const liftProgress = THREE.MathUtils.clamp(forwardStride, 0, 1);
    const lift = advancing * Math.sin(Math.PI * liftProgress);
    const clampedLift = THREE.MathUtils.clamp(lift, 0, 1);
    const supportBackDrift = supportPressure * 0.07;
    const upperTarget = new THREE.Vector3(
      chain.sideSign * 0.04,
      -0.84 + clampedLift * 0.1,
      0.62 * forwardStride - supportBackDrift
    ).normalize();
    const lowerTarget = new THREE.Vector3(
      chain.sideSign * 0.015,
      -0.91 + clampedLift * 0.08,
      -0.5 * kneeBend + 0.04 * toeOff
    ).normalize();

    this.applyChainTarget(chain, upperTarget, lowerTarget);
    this.applyFootSwing(chain, clampedLift, toeOff);
  }

  applyFootSwing(chain, lift, trailing) {
    if (!chain.end) {
      return;
    }

    const footAngle = FOOT_LIFT_ANGLE * lift + FOOT_PUSH_ANGLE * trailing;
    this.offsetQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), footAngle);
    chain.end.bone.quaternion
      .copy(chain.end.baseQuaternion)
      .multiply(this.offsetQuaternion);

    if (chain.toe) {
      this.offsetQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -footAngle * 0.45);
      chain.toe.bone.quaternion
        .copy(chain.toe.baseQuaternion)
        .multiply(this.offsetQuaternion);
    }

    this.modelRoot.updateMatrixWorld(true);
  }

  applyChainTarget(chain, upperLocalDirection, lowerLocalDirection) {
    this.rotateBoneTowardChild(
      chain.upper.bone,
      chain.lower.bone,
      this.modelDirectionToWorld(upperLocalDirection)
    );
    this.modelRoot.updateMatrixWorld(true);
    this.rotateBoneTowardChild(
      chain.lower.bone,
      chain.end.bone,
      this.modelDirectionToWorld(lowerLocalDirection)
    );
    this.modelRoot.updateMatrixWorld(true);
  }

  modelDirectionToWorld(direction) {
    return direction.clone().transformDirection(this.modelRoot.matrixWorld).normalize();
  }

  rotateBoneTowardChild(bone, childBone, targetWorldDirection) {
    // rotate a bone so its child points toward the target direction
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
}
