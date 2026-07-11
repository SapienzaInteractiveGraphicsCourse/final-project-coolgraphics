import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// GLB model to load
const MODEL_URL = new URL("../models/characters/trex.glb", import.meta.url).href;
const MODEL_TARGET_HEIGHT = 2.7;

// Skeleton configuration for animations

// Bones names
const JAW_BONE_NAME = "Boca_ArmatureRexy";
const HEAD_BONE_NAME = "Cabeza_ArmatureRexy";
const HEAD_IK_BONE_NAME = "CabezaIK_ArmatureRexy";
const BODY_BONE_NAME = "Mover_ArmatureRexy";
const LEFT_STEP_ROOT_NAME = "PiernaIKL_ArmatureRexy";

// Tail bones from base to tip and swing amplitude
const TAIL_BONES = [
  { name: "Cola1_ArmatureRexy", amplitude: 0.15 },
  { name: "Cola2_ArmatureRexy", amplitude: 0.2 },
  { name: "Cola3_ArmatureRexy", amplitude: 0.3 },
  { name: "Cola4_ArmatureRexy", amplitude: 0.5 },
  { name: "Cola5_ArmatureRexy", amplitude: 0.7 },
  { name: "Cola6_ArmatureRexy", amplitude: 0.9 }
];

// Local axis the tail bones swing around
const TAIL_SWING_AXIS = new THREE.Vector3(0, 0, 1);

// axis/angles used to open the jaw during roar
const JAW_OPEN_AXIS = new THREE.Vector3(-1, 0, -0.022).normalize();
const JAW_OPEN_ANGLE_FIRST = THREE.MathUtils.degToRad(15); // opening during the step
const JAW_OPEN_ANGLE = THREE.MathUtils.degToRad(30); // full open angle after the step

// Timing constants in ms in the roar timeline
const STEP_DURATION = 400; // duration of the step before the jaw fully opens
const JAW_SECOND_OPEN_DURATION = 150; // time to go from partially open to fully open
const JAW_OPEN_DURATION = STEP_DURATION + JAW_SECOND_OPEN_DURATION; // total time to reach full jaw opening
const JAW_OPEN_PAUSE = 2000; // how long the jaw stays fully open
const JAW_CLOSE_DURATION = 450; // time to close the jaw again
const JAW_CYCLE_DURATION = JAW_OPEN_DURATION + JAW_OPEN_PAUSE + JAW_CLOSE_DURATION; // full roar cycle length


// bones fror the neck curl and their angle
const HEAD_NECK_BONES = [
  { name: "Pecho001_ArmatureRexy", angle: THREE.MathUtils.degToRad(5) },
  { name: "Cuello_ArmatureRexy", angle: THREE.MathUtils.degToRad(10) },
  { name: "Cuello001_ArmatureRexy", angle: THREE.MathUtils.degToRad(2.5) },
  { name: "Atlas_ArmatureRexy", angle: THREE.MathUtils.degToRad(3.5) },
  { name: "Atlas001_ArmatureRexy", angle: THREE.MathUtils.degToRad(3) },
  { name: "Cabeza_ArmatureRexy", angle: THREE.MathUtils.degToRad(35) }
];

const HEAD_NECK_ROTATION_AXIS = new THREE.Vector3(1, 0, 0); // pitch axis
const HEAD_TILT_AXIS = new THREE.Vector3(0, 1, 0); // yaw axis for head tilt
const HEAD_TILT_ANGLE = THREE.MathUtils.degToRad(30);

// body rotation and lean for the the walk
const BODY_ROTATION_AXIS = new THREE.Vector3(1, 0.0, -0.5).normalize();
const BODY_DOWN_ANGLE = THREE.MathUtils.degToRad(15);
const BODY_STEP_FORWARD = 1.00; // forward body displacement during the roar step
const BODY_STEP_DROP = 0.1; // vertical dip during the roar step

// shake applied to the body while the jaw is held open
const BODY_VIBRATION_AXIS = new THREE.Vector3(0.33, 0.33, 0.33).normalize();
const BODY_VIBRATION_ANGLE = THREE.MathUtils.degToRad(0.2);
const BODY_VIBRATION_PERIOD = 120;
const BODY_VIBRATION_FADE_DURATION = 150; // Fade time for the vibration envelope

// Two-bone IK leg chains
const LEG_CHAINS = [
  {
    upper: "MusloL_ArmatureRexy",
    lower: "PiernaL_ArmatureRexy",
    footTarget: "TalonL_ArmatureRexy"
  },
  {
    upper: "MusloR_ArmatureRexy",
    lower: "PiernaR_ArmatureRexy",
    footTarget: "TalonR_ArmatureRexy"
  }
];

// Arm bones rotated during the roar
const ARM_BONES = [
  {
    name: "AntebrazoL_ArmatureRexy",
    axis: new THREE.Vector3(1, 0, 0),
    angle: THREE.MathUtils.degToRad(-25)
  },

  {
    name: "BrazoL_ArmatureRexy",
    axis: new THREE.Vector3(0, 0.2, 1).normalize(),
    angle: THREE.MathUtils.degToRad(-40)
  },

  {
    name: "AntebrazoR_ArmatureRexy",
    axis: new THREE.Vector3(1, 0, 0),
    angle: THREE.MathUtils.degToRad(-10)
  },

  {
    name: "BrazoR_ArmatureRexy",
    axis: new THREE.Vector3(0, 0.3, 1).normalize(),
    angle: THREE.MathUtils.degToRad(20)
  },
];

//  left step taken before the roar 
const LEFT_STEP_LIFT = 0.80; 
const LEFT_STEP_SIDE = 0.0; 

const LEFT_STEP_LIFT2 = 0.0; 
const LEFT_STEP_FORWARD2 = 1.7; // Total forward distance covered by the step
const LEFT_STEP_SIDE2 = 0.0;

const LEFT_STEP_FIRST_DURATION = STEP_DURATION * 0.5; // lift duration
const LEFT_STEP_SECOND_DURATION = LEFT_STEP_FIRST_DURATION; // landing duration

// Parameters for the walk cycle
const WALK_STEP_LIFT = 0.80;
const WALK_STEP_FORWARD = 1.5;
const WALK_STEP_SIDE = 0.0;
const WALK_STEP_LIFT2 = 0.0;
const WALK_STEP_FORWARD2 = 3.0;
const WALK_STEP_SIDE2 = 0.0;
const WALK_BODY_FORWARD = 1.5; 
const WALK_BODY_LIFT = 0.12; 
const WALK_BODY_DROP = -0.12; 
const WALK_STEP_DURATION = STEP_DURATION;

// Controls to descends to the floor while walking
const PLATFORM_DESCENT_DELAY_STEPS = 3; // number of walk steps before starting the descent
const PLATFORM_DESCENT_STEPS = 1; // number of steps to complete the descent
const ATRIUM_WALK_STEP_COUNT = 23; // total steps taken when walking to the atrium


// smoothly progress value between 0 and 1
function cosineEase(progress) {
  const safeProgress = THREE.MathUtils.clamp(progress, 0, 1);
  return (1 - Math.cos(Math.PI * safeProgress)) * 0.5;
}

// Cubic Hermite interpolation between start/end values
function hermiteInterpolate(start, end, startVelocity, endVelocity, elapsed, duration) {
  const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
  const progress2 = progress * progress;
  const progress3 = progress2 * progress;
  const startWeight = 2 * progress3 - 3 * progress2 + 1;
  const startVelocityWeight = progress3 - 2 * progress2 + progress;
  const endWeight = -2 * progress3 + 3 * progress2;
  const endVelocityWeight = progress3 - progress2;

  return startWeight * start
    + startVelocityWeight * startVelocity * duration
    + endWeight * end
    + endVelocityWeight * endVelocity * duration;
}

// Returns a -1..1 shake value for the body vibration effect
function bodyVibrationAt(elapsed) {
  const pauseElapsed = elapsed - JAW_OPEN_DURATION;

  if (pauseElapsed < 0 || pauseElapsed > JAW_OPEN_PAUSE) {
    return 0;
  }

  const fadeIn = THREE.MathUtils.clamp(
    pauseElapsed / BODY_VIBRATION_FADE_DURATION,
    0,
    1
  );
  const fadeOut = THREE.MathUtils.clamp(
    (JAW_OPEN_PAUSE - pauseElapsed) / BODY_VIBRATION_FADE_DURATION,
    0,
    1
  );
  const envelope = Math.min(fadeIn, fadeOut);

  return Math.sin((pauseElapsed / BODY_VIBRATION_PERIOD) * Math.PI * 2) * envelope;
}


function bodyMovementProgressAt(elapsed) {
  const returnStart = JAW_OPEN_DURATION + JAW_OPEN_PAUSE;

  if (elapsed < STEP_DURATION) {
    return cosineEase(elapsed / STEP_DURATION);
  }

  if (elapsed < returnStart) {
    return 1;
  }

  return 1 - cosineEase((elapsed - returnStart) / JAW_CLOSE_DURATION);
}

// Main Dinosaur class
export class Dinosaur {
  constructor(loadingController) {
    this.loadingController = loadingController;
    this.group = new THREE.Group();
    this.group.position.set(-16.5, 0.05, 0);
    this.group.rotation.y = Math.PI * 0.5;
    this.mobileRoot = new THREE.Group();
    this.group.add(this.mobileRoot);

    // Tail anim 
    this.tailBones = [];
    this.tailTween = null;
    this.tailLoopRequested = false;
    this.tailState = { phase: 0, strength: 0 };
    this.tailOffset = new THREE.Quaternion();

    // Jaw anim
    this.jawBone = null;
    this.jawBaseQuaternion = new THREE.Quaternion();
    this.jawOffset = new THREE.Quaternion();
    this.jawState = { progress: 0 };
    this.jawTween = null;

    // head and neck animation
    this.headNeckBones = [];
    this.headNeckOffset = new THREE.Quaternion();
    this.headTiltOffset = new THREE.Quaternion();

    // Body anim
    this.bodyBone = null;
    this.bodyBaseQuaternion = new THREE.Quaternion();
    this.bodyBasePosition = new THREE.Vector3();
    this.bodyOffset = new THREE.Quaternion();
    this.bodyVibrationOffset = new THREE.Quaternion();

    this.model = null;

    // leg IK state
    this.legChains = [];

    // arm animation state
    this.armBones = [];
    this.armOffset = new THREE.Quaternion();

    // left-foot step state
    this.leftStepRoot = null;
    this.leftStepBasePosition = new THREE.Vector3();

    // walking state
    this.walkFeet = [];
    this.walkingTween = null;
    this.walkingRequested = false;
    this.roarLoopRequested = false;
    this.walkingStepsRemaining = null;
    this.walkingCompleteCallback = null;

    // Platform descent state
    this.platformDropDistance = 0;
    this.platformDescentActive = false;
    this.platformDescentDone = false;
    this.platformDescentStep = 0;
    this.platformDescentDelayStep = 0;
    this.platformDescentStartY = 0;
    this.platformDescentTargetY = 0;

    this.nextWalkingFoot = 0;
    this.lastWalkingLandingY = null;
    this.walkingStanceInitialized = false;
    this.walkingBodyBaseZ = null;

    this.tweenGroup = new TWEEN.Group();

    this.createClickHitbox();
    this.ready = this.loadModel();
  }

  createClickHitbox() {
    // invisible mesh to click on the dino
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.4, 2.2),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    hitbox.name = "T-Rex Click Hitbox";
    hitbox.position.y = 1.7;
    this.mobileRoot.add(hitbox);
  }

  loadModel() {
    const loader = new GLTFLoader();

    const promise = loader.loadAsync(MODEL_URL).then(gltf => {
      const model = gltf.scene;
      this.model = model;
      model.rotation.x = 0;
      model.updateMatrixWorld(true);

      // scale the model to match MODEL_TARGET_HEIGHT
      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new THREE.Vector3());
      const scale = MODEL_TARGET_HEIGHT / initialSize.y;
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.isSkinnedMesh) {
            child.frustumCulled = false;
          }
        }
      });

      this.mobileRoot.add(model);
      this.keepPlatformOnDisplayBase(model);
      this.setupTailAnimation(model);
      this.setupJawAnimation(model);
      this.setupHeadNeckAnimation(model);
      this.setupBodyAnimation(model);
      this.setupLegCompensation(model);
      this.setupArmAnimation(model);
      this.setupLeftStep(model);
      this.setupWalking(model);
    });

    const trackedPromise = this.loadingController?.track(promise) ?? promise;
    trackedPromise.catch(error => {
      console.error("Failed to load the T-Rex model:", error);
    });
    return trackedPromise;
  }

  keepPlatformOnDisplayBase(model) {
    // Keep the platform fixed while the dinosaur moves
    const platform = model.getObjectByName("platform");

    model.updateMatrixWorld(true);
    this.group.updateMatrixWorld(true);

    this.group.attach(platform);
    this.updatePlatformDropDistance(platform);
  }

  updatePlatformDropDistance(platform) {
    this.group.updateMatrixWorld(true);
    platform.updateMatrixWorld(true);

    const platformBox = new THREE.Box3().setFromObject(platform);
    const groupWorldY = this.group.getWorldPosition(new THREE.Vector3()).y;
    this.platformDropDistance = Math.max(0, platformBox.max.y - groupWorldY);
  }

  setupTailAnimation(model) {
    this.tailBones = TAIL_BONES.map((config, index) => {
      const bone = model.getObjectByName(config.name);

      if (!bone) {
        return null;
      }

      return {
        bone,
        baseQuaternion: bone.quaternion.clone(),
        amplitude: config.amplitude,
        phaseOffset: index * 0.22
      };
    }).filter(Boolean);
  }

  startTailAnimation(loop = false) {
    if (loop) {
      this.tailLoopRequested = true;
    }

    if (this.tailTween || this.tailBones.length === 0) {
      return;
    }

    this.tailState.phase = 0;
    this.tailState.strength = this.tailLoopRequested ? 1 : 0;
    this.tailTween = new TWEEN.Tween(this.tailState, this.tweenGroup)
      .to({ phase: Math.PI * 2 }, 2600)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        this.tailBones.forEach(tailBone => {
          const angle =
            Math.sin(this.tailState.phase - tailBone.phaseOffset) *
            tailBone.amplitude *
            this.tailState.strength;
          this.tailOffset.setFromAxisAngle(TAIL_SWING_AXIS, angle);
          tailBone.bone.quaternion.copy(tailBone.baseQuaternion).multiply(this.tailOffset);
        });
      })
      .onComplete(() => {
        this.tailTween = null;
        if (this.tailLoopRequested) {
          // loop the sway as long as the roar loop is active
          this.startTailAnimation(true);
          return;
        }

        // reset bones back to bind pose
        this.tailBones.forEach(tailBone => {
          tailBone.bone.quaternion.copy(tailBone.baseQuaternion);
        });
      })
      .start();

    // fade the strength smoothly for a single sway
    if (!this.tailLoopRequested) {
      new TWEEN.Tween(this.tailState, this.tweenGroup)
        .to({ strength: 1 }, 700)
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .start();
    }
  }

  setupJawAnimation(model) {
    this.jawBone = model.getObjectByName(JAW_BONE_NAME);

    if (!this.jawBone) {
      return;
    }

    this.jawBaseQuaternion.copy(this.jawBone.quaternion);
  }

  setupHeadNeckAnimation(model) {
    this.headNeckBones = HEAD_NECK_BONES.map(config => {
      const bone = model.getObjectByName(config.name);

      if (!bone) {
        return null;
      }

      return {
        bone,
        baseQuaternion: bone.quaternion.clone(),
        angle: config.angle
      };
    }).filter(Boolean);

    const headBone = model.getObjectByName(HEAD_BONE_NAME);
    const headIkBone = model.getObjectByName(HEAD_IK_BONE_NAME);

    if (!headBone || !headIkBone) {
      return;
    }

    model.updateMatrixWorld(true);
    headBone.attach(headIkBone);
  }

  setupBodyAnimation(model) {
    this.bodyBone = model.getObjectByName(BODY_BONE_NAME);

    if (!this.bodyBone) {
      return;
    }

    this.bodyBaseQuaternion.copy(this.bodyBone.quaternion);
    this.bodyBasePosition.copy(this.bodyBone.position);
  }

  setupLegCompensation(model) {
    model.updateWorldMatrix(true, true);

    this.legChains = LEG_CHAINS.map(config => {
      const upperBone = model.getObjectByName(config.upper);
      const lowerBone = model.getObjectByName(config.lower);
      const footTargetBone = model.getObjectByName(config.footTarget);

      if (!upperBone || !lowerBone || !footTargetBone) {
        return null;
      }

      const hipPosition = upperBone.getWorldPosition(new THREE.Vector3());
      const kneePosition = lowerBone.getWorldPosition(new THREE.Vector3());
      const targetPosition = footTargetBone.getWorldPosition(new THREE.Vector3());

      return {
        upperBone,
        lowerBone,
        footTargetBone,
        upperBaseQuaternion: upperBone.quaternion.clone(),
        lowerBaseQuaternion: lowerBone.quaternion.clone(),
        upperLength: hipPosition.distanceTo(kneePosition),
        lowerLength: kneePosition.distanceTo(targetPosition),

        anklePoint: lowerBone.worldToLocal(targetPosition.clone())
      };
    }).filter(Boolean);
  }

  setupArmAnimation(model) {
    this.armBones = ARM_BONES.map(config => {
      const bone = model.getObjectByName(config.name);

      if (!bone) {
        return null;
      }

      return {
        bone,
        baseQuaternion: bone.quaternion.clone(),
        axis: config.axis,
        angle: config.angle
      };
    }).filter(Boolean);
  }

  setupLeftStep(model) {
    this.leftStepRoot = model.getObjectByName(LEFT_STEP_ROOT_NAME);

    if (!this.leftStepRoot) {
      return;
    }

    this.leftStepBasePosition.copy(this.leftStepRoot.position);

  }

  setupWalking(model) {
    // cache both foot IK targets and their bind-pose positions
    this.walkFeet = ["PiernaIKL_ArmatureRexy", "PiernaIKR_ArmatureRexy"]
      .map(name => {
        const bone = model.getObjectByName(name);

        if (!bone) {
          return null;
        }

        return {
          bone,
          basePosition: bone.position.clone()
        };
      })
      .filter(Boolean);

    if (this.walkingRequested) {
      this.startWalkingStep();
    }
  }

  applyWalkingStep(foot, bodyStart, landingForward, progress) {
    // Split step into a lift phase and a landing phase 
    const firstHalf = progress < 0.5;
    const phaseProgress = cosineEase(firstHalf ? progress * 2 : (progress - 0.5) * 2);
    const lift = firstHalf
      ? THREE.MathUtils.lerp(0, WALK_STEP_LIFT, phaseProgress)
      : THREE.MathUtils.lerp(WALK_STEP_LIFT, WALK_STEP_LIFT2, phaseProgress);
    const forward = firstHalf
      ? THREE.MathUtils.lerp(0, WALK_STEP_FORWARD, phaseProgress)
      : THREE.MathUtils.lerp(WALK_STEP_FORWARD, landingForward, phaseProgress);
    const side = firstHalf
      ? THREE.MathUtils.lerp(0, WALK_STEP_SIDE, phaseProgress)
      : THREE.MathUtils.lerp(WALK_STEP_SIDE, WALK_STEP_SIDE2, phaseProgress);

    foot.bone.position.copy(foot.basePosition);
    foot.bone.position.x += side;
    foot.bone.position.z += lift;
    foot.bone.position.y -= forward;

    // advance the body forward during the step and up/down movement
    this.bodyBone.position.copy(bodyStart);
    this.bodyBone.position.y -= WALK_BODY_FORWARD * cosineEase(progress);
    this.bodyBone.position.z = firstHalf
      ? THREE.MathUtils.lerp(
        bodyStart.z,
        this.walkingBodyBaseZ + WALK_BODY_LIFT,
        phaseProgress
      )
      : THREE.MathUtils.lerp(
        this.walkingBodyBaseZ + WALK_BODY_LIFT,
        this.walkingBodyBaseZ + WALK_BODY_DROP,
        phaseProgress
      );
    this.solveLegCompensation();
  }

  startPlatformDescentIfNeeded() {
    // start the descent once and only if there's actually a platform to descend from
    if (this.platformDescentDone || this.platformDescentActive || this.platformDropDistance <= 0) {
      return;
    }

    if (this.platformDescentDelayStep < PLATFORM_DESCENT_DELAY_STEPS) {
      return;
    }

    this.platformDescentActive = true;
    this.platformDescentStep = 0;
    this.platformDescentStartY = this.mobileRoot.position.y;
    this.platformDescentTargetY = -this.platformDropDistance;
  }

  applyPlatformDescent(stepProgress) {
    if (!this.platformDescentActive) {
      return;
    }

    // Lower the mobile root smoothly over PLATFORM_DESCENT_STEPS walking steps
    const progress = THREE.MathUtils.clamp(stepProgress / PLATFORM_DESCENT_STEPS, 0, 1);
    const easedProgress = cosineEase(progress);
    this.mobileRoot.position.y = THREE.MathUtils.lerp(
      this.platformDescentStartY,
      this.platformDescentTargetY,
      easedProgress
    );

    if (progress >= 1) {
      this.platformDescentActive = false;
      this.platformDescentDone = true;
      this.mobileRoot.position.y = this.platformDescentTargetY;
    }
  }

  startWalkingStep() {
    // don't start a new step while one is already running, while the roar
    // jaw animation is playing, or if the rig has no feet set up
    if (this.walkingTween || this.jawTween || !this.bodyBone || this.walkFeet.length < 2) {
      return;
    }

    if (!this.walkingStanceInitialized) {
      const rightFoot = this.walkFeet[1];
      rightFoot.basePosition.y -= WALK_BODY_FORWARD;
      rightFoot.bone.position.copy(rightFoot.basePosition);
      this.walkingBodyBaseZ = this.bodyBone.position.z;
      this.walkingStanceInitialized = true;
      this.solveLegCompensation();
    }

    this.startPlatformDescentIfNeeded();

    // Alternate between the two feet for each successive step
    const foot = this.walkFeet[this.nextWalkingFoot];
    const bodyStart = this.bodyBone.position.clone();

    const landingY = this.lastWalkingLandingY === null
      ? foot.basePosition.y - WALK_STEP_FORWARD2
      : this.lastWalkingLandingY - WALK_BODY_FORWARD;
    const landingForward = foot.basePosition.y - landingY;
    const state = { progress: 0 };

    this.walkingTween = new TWEEN.Tween(state, this.tweenGroup)
      .to({ progress: 1 }, WALK_STEP_DURATION)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        this.applyWalkingStep(foot, bodyStart, landingForward, state.progress);
        this.applyPlatformDescent(this.platformDescentStep + state.progress);
      })
      .onComplete(() => {
        foot.basePosition.copy(foot.bone.position);
        this.lastWalkingLandingY = foot.basePosition.y;
        this.bodyBasePosition.copy(this.bodyBone.position);
        this.nextWalkingFoot = (this.nextWalkingFoot + 1) % this.walkFeet.length;

        if (this.platformDescentActive) {
          this.platformDescentStep += 1;
          this.applyPlatformDescent(this.platformDescentStep);
        } else if (!this.platformDescentDone) {
          this.platformDescentDelayStep += 1;
        }
        this.walkingTween = null;

        // Stop after the requested number of step
        if (this.walkingStepsRemaining !== null) {
          this.walkingStepsRemaining -= 1;

          if (this.walkingStepsRemaining <= 0) {
            const walkingCompleteCallback = this.walkingCompleteCallback;
            this.walkingRequested = false;
            this.walkingStepsRemaining = null;
            this.walkingCompleteCallback = null;

            if (walkingCompleteCallback) {
              walkingCompleteCallback();
            }
            return;
          }
        }

        // otherwise keep walking indefinitely
        if (this.walkingRequested) {
          this.startWalkingStep();
        }
      })
      .start();
  }

  startWalking(stepCount = null, onComplete = null) {
    // start or reusme walking
    this.roarLoopRequested = false;
    this.walkingRequested = true;
    this.walkingStepsRemaining = stepCount;
    this.walkingCompleteCallback = onComplete;
    this.startWalkingStep();
  }

  stopWalking() {
    this.walkingRequested = false;
    this.walkingStepsRemaining = null;
    this.walkingCompleteCallback = null;

    if (this.walkingTween) {
      this.walkingTween.stop();
      this.walkingTween = null;
    }
  }

  walkToAtriumAndRoar() {
    // walk a fixed number of steps
    if (this.walkingStepsRemaining !== null || this.roarLoopRequested) {
      return;
    }

    // looping roar animation once the walk finishes
    this.roarLoopRequested = false;
    this.startWalking(ATRIUM_WALK_STEP_COUNT, () => this.startRoarLoop());
  }

  prepareRoarFromWalkingPose() {
    if (this.bodyBone) {
      this.bodyBasePosition.copy(this.bodyBone.position);
      this.walkingBodyBaseZ = this.bodyBone.position.z;
    }

    if (this.leftStepRoot) {
      this.leftStepBasePosition.copy(this.leftStepRoot.position);
    }

    this.walkFeet.forEach(foot => {
      foot.basePosition.copy(foot.bone.position);
    });

    this.solveLegCompensation();
  }

  applyLeftStep(elapsed) {
    // single left-foot step that precedes the roar
    if (!this.leftStepRoot) {
      return;
    }

    const firstStepEnd = LEFT_STEP_FIRST_DURATION;
    const secondStepEnd = firstStepEnd + LEFT_STEP_SECOND_DURATION;
    const returnStart = JAW_OPEN_DURATION + JAW_OPEN_PAUSE;
    let lift;
    let forward;
    let side;

    if (elapsed < secondStepEnd) {
      // lift then land.
      const progress = THREE.MathUtils.clamp(elapsed / secondStepEnd, 0, 1);

      forward = LEFT_STEP_FORWARD2 * cosineEase(progress);

      if (elapsed < firstStepEnd) {
        const liftProgress = cosineEase(elapsed / firstStepEnd);
        lift = LEFT_STEP_LIFT * liftProgress;
        side = LEFT_STEP_SIDE * liftProgress;
      } else {
        const landingProgress = cosineEase(
          (elapsed - firstStepEnd) / LEFT_STEP_SECOND_DURATION
        );
        lift = THREE.MathUtils.lerp(LEFT_STEP_LIFT, LEFT_STEP_LIFT2, landingProgress);
        side = THREE.MathUtils.lerp(LEFT_STEP_SIDE, LEFT_STEP_SIDE2, landingProgress);
      }
    } else if (elapsed < returnStart) {
      // foot stays where it was during the roar
      lift = LEFT_STEP_LIFT2;
      forward = LEFT_STEP_FORWARD2;
      side = LEFT_STEP_SIDE2;
    } else {
      // back to the resting position as the jaw closes
      const progress = cosineEase(
        (elapsed - returnStart) / JAW_CLOSE_DURATION
      );
      lift = THREE.MathUtils.lerp(LEFT_STEP_LIFT2, 0, progress);
      forward = THREE.MathUtils.lerp(LEFT_STEP_FORWARD2, 0, progress);
      side = THREE.MathUtils.lerp(LEFT_STEP_SIDE2, 0, progress);
    }

    this.leftStepRoot.position.copy(this.leftStepBasePosition);
    this.leftStepRoot.position.x += side;
    this.leftStepRoot.position.z += lift;
    this.leftStepRoot.position.y -= forward;
  }

  applyBodyStep(elapsed) {
    // Moves the body root forward and down
    if (!this.bodyBone) {
      return;
    }

    const progress = bodyMovementProgressAt(elapsed);

    this.bodyBone.position.copy(this.bodyBasePosition);
    this.bodyBone.position.y -= BODY_STEP_FORWARD * progress;
    this.bodyBone.position.z -= BODY_STEP_DROP * Math.sin(Math.PI * progress);
  }

  rotateBoneToward(bone, currentDirection, targetDirection) {
    const delta = new THREE.Quaternion().setFromUnitVectors(
      currentDirection.clone().normalize(),
      targetDirection.clone().normalize()
    );
    const worldQuaternion = bone.getWorldQuaternion(new THREE.Quaternion());
    const parentQuaternion = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const targetWorldQuaternion = delta.multiply(worldQuaternion);

    bone.quaternion.copy(parentQuaternion.invert().multiply(targetWorldQuaternion));
  }

  solveLegCompensation() {
    // thigh/shin analytic IK solver so the feet stay locked to their IK target
    if (!this.model || this.legChains.length === 0) {
      return;
    }

    this.legChains.forEach(chain => {

      chain.upperBone.quaternion.copy(chain.upperBaseQuaternion);
      chain.lowerBone.quaternion.copy(chain.lowerBaseQuaternion);
    });
    this.model.updateWorldMatrix(true, true);

    this.legChains.forEach(chain => {
      const hip = chain.upperBone.getWorldPosition(new THREE.Vector3());
      const currentKnee = chain.lowerBone.getWorldPosition(new THREE.Vector3());
      const target = chain.footTargetBone.getWorldPosition(new THREE.Vector3());
      const hipToTarget = target.clone().sub(hip);
      const targetDirection = hipToTarget.clone().normalize();

      const minimumReach = Math.abs(chain.upperLength - chain.lowerLength) + 0.0001;
      const maximumReach = chain.upperLength + chain.lowerLength - 0.0001;
      const distance = THREE.MathUtils.clamp(
        hipToTarget.length(),
        minimumReach,
        maximumReach
      );

      const along =
        (chain.upperLength ** 2 + distance ** 2 - chain.lowerLength ** 2) /
        (2 * distance);
      const height = Math.sqrt(Math.max(0, chain.upperLength ** 2 - along ** 2));
      const currentHipToKnee = currentKnee.clone().sub(hip);
      // preserve the current bend direction
      const bendDirection = currentHipToKnee
        .clone()
        .addScaledVector(targetDirection, -currentHipToKnee.dot(targetDirection))
        .normalize();
      const desiredKnee = hip
        .clone()
        .addScaledVector(targetDirection, along)
        .addScaledVector(bendDirection, height);

  
      this.rotateBoneToward(
        chain.upperBone,
        currentHipToKnee,
        desiredKnee.clone().sub(hip)
      );
      this.model.updateWorldMatrix(true, true);

      const knee = chain.lowerBone.getWorldPosition(new THREE.Vector3());
      const currentAnkle = chain.lowerBone.localToWorld(chain.anklePoint.clone());
      this.rotateBoneToward(
        chain.lowerBone,
        currentAnkle.sub(knee),
        target.clone().sub(knee)
      );
      this.model.updateWorldMatrix(true, true);
    });
  }

  startJawAnimation() {
    if (this.jawTween || !this.jawBone) {
      return;
    }

    this.jawState.progress = 0;
    this.jawTween = new TWEEN.Tween(this.jawState, this.tweenGroup)
      .to({ progress: 1 }, JAW_CYCLE_DURATION)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        const elapsed = this.jawState.progress * JAW_CYCLE_DURATION;
        let openness = 1; // 0 = jaw closed, 1 = jaw fully open.
        const transitionVelocity = 1 / JAW_OPEN_DURATION;

        if (elapsed < STEP_DURATION) {
          // small initial opening
          openness = hermiteInterpolate(
            0,
            JAW_OPEN_ANGLE_FIRST / JAW_OPEN_ANGLE,
            0,
            transitionVelocity,
            elapsed,
            STEP_DURATION
          );
        } else if (elapsed < JAW_OPEN_DURATION) {
          // finish opening to the full angle and hold
          openness = hermiteInterpolate(
            JAW_OPEN_ANGLE_FIRST / JAW_OPEN_ANGLE,
            1,
            transitionVelocity,
            0,
            elapsed - STEP_DURATION,
            JAW_SECOND_OPEN_DURATION
          );
        } else if (elapsed > JAW_OPEN_DURATION + JAW_OPEN_PAUSE) {
          // close the jaw after the hold phase
          const progress = (
            elapsed - JAW_OPEN_DURATION - JAW_OPEN_PAUSE
          ) / JAW_CLOSE_DURATION;
          openness = 1 - cosineEase(progress);
        }

        this.jawOffset.setFromAxisAngle(JAW_OPEN_AXIS, JAW_OPEN_ANGLE * openness);
        this.jawBone.quaternion.copy(this.jawBaseQuaternion).multiply(this.jawOffset);

        // curl the neck back in proportion the jaw openness
        this.headNeckBones.forEach(headNeckBone => {
          this.headNeckOffset.setFromAxisAngle(
            HEAD_NECK_ROTATION_AXIS,
            headNeckBone.angle * openness
          );
          headNeckBone.bone.quaternion
            .copy(headNeckBone.baseQuaternion)
            .multiply(this.headNeckOffset);

          // head bone tilt
          if (headNeckBone.bone.name === HEAD_BONE_NAME) {
            this.headTiltOffset.setFromAxisAngle(
              HEAD_TILT_AXIS,
              HEAD_TILT_ANGLE * openness
            );
            headNeckBone.bone.quaternion.multiply(this.headTiltOffset);
          }
        });

        if (this.bodyBone) {
          // lean the body down and forward 
          this.bodyOffset.setFromAxisAngle(
            BODY_ROTATION_AXIS,
            BODY_DOWN_ANGLE * bodyMovementProgressAt(elapsed)
          );
          this.bodyBone.quaternion
            .copy(this.bodyBaseQuaternion)
            .multiply(this.bodyOffset);
          //  small vibration shake on top 
          this.bodyVibrationOffset.setFromAxisAngle(
            BODY_VIBRATION_AXIS,
            BODY_VIBRATION_ANGLE * bodyVibrationAt(elapsed)
          );
          this.bodyBone.quaternion.multiply(this.bodyVibrationOffset);
        }

        // Rotate the arms 
        this.armBones.forEach(armBone => {
          this.armOffset.setFromAxisAngle(
            armBone.axis,
            armBone.angle * openness
          );
          armBone.bone.quaternion
            .copy(armBone.baseQuaternion)
            .multiply(this.armOffset);
        });

        this.applyLeftStep(elapsed);
        this.applyBodyStep(elapsed);
        this.solveLegCompensation();
      })
      .onComplete(() => {
        this.jawTween = null;
        if (this.roarLoopRequested) {
          // Keep repeating the roar cycle
          this.startJawAnimation();
        } else if (this.walkingRequested) {
          this.startWalkingStep();
        }
      })
      .start();
  }

  startRoarLoop() {
    // stop walk, start the looping tail sway and roar cycle
    this.stopWalking();
    this.roarLoopRequested = true;
    this.prepareRoarFromWalkingPose();
    this.startTailAnimation(true);
    this.startJawAnimation();
  }

  awaken() {
    // sway the tail once and play a single roar cycle if not walking
    this.startTailAnimation();
    if (!this.walkingRequested) {
      this.startJawAnimation();
    }
  }

  onClick() {
    this.awaken();
  }

  update(_deltaTime, elapsedTime) {
    this.tweenGroup.update(elapsedTime * 1000);
  }
}
