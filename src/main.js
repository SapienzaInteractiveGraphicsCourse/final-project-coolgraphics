import * as TWEEN from "@tweenjs/tween.js";
import { renderer as rendererClass } from "./core/Renderer.js";
import { SceneManager } from "./core/Scene.js";
import { CameraManager } from "./core/Camera.js";
import { InputManager } from "./core/Input.js";
import { InteractionManager } from "./core/Interaction.js";
import { Factory } from "./core/factory.js";
import { createMaterials } from "./utils/materials.js";
import { Player } from "./entities/Player.js";
import { Museum } from "./world/Museum.js";
import { AnimationSystem } from "./systems/Animation.js";
import { LightingSystem } from "./systems/Lighting.js";
import { CollisionSystem } from "./systems/Collision.js";
import { UIController } from "./systems/UIController.js";
import { LoadingController } from "./systems/LoadingController.js";
import { DoorInteractionSystem } from "./systems/DoorInteraction.js";
import { ExhibitPromptSystem } from "./systems/ExhibitPrompt.js";

// core app services and scene content.
const loadingController = new LoadingController(document.getElementById("loading-root"));
const renderer =new rendererClass();
const sceneManager =new SceneManager();
const cameraManager =new CameraManager();
const inputManager =new InputManager(renderer.renderer.domElement);
const materials = createMaterials(loadingController);
const factory =new Factory(materials, loadingController);
const lightingSystem = new LightingSystem(sceneManager.scene);
const collisionSystem =new CollisionSystem();
const animationSystem = new AnimationSystem();
const museum = new Museum(factory,lightingSystem, sceneManager, loadingController);
const player = new Player(materials,inputManager, collisionSystem, factory);
collisionSystem.register(museum.group);
cameraManager.registerObstacleRoot(museum.group);
lightingSystem.registerFlashlight(player.flashlight);
const interactionManager = new InteractionManager(cameraManager.camera,inputManager);
const doorInteractionSystem = new DoorInteractionSystem(player,museum.getDoors());
const exhibitPromptSystem = new ExhibitPromptSystem(player, [
  {
    object: museum.dinosaurRoom.dinosaur,
    message: function() {
      return "Click the T-Rex to wake it up";
    }
  },
  {
    object: museum.statueRoom.statue,
    message: function() {
      return "Click the statue to make it talk";
    }
  },
  {
    object: museum.egyptianRoom.sarcophagus,
    message: function() {
      return "Click the sarcophagus to open it";
    }
  }
]);
const ui = new UIController(document.getElementById("ui-root"));

sceneManager.scene.add(museum.group,player.group);
// per-frame updated elements
const animatables = [lightingSystem,doorInteractionSystem, exhibitPromptSystem];
museum.getAnimatables().forEach(function(animatable) {
  animatables.push(animatable);
});
animationSystem.addMany(animatables);
// register scene objects that react to clicks
museum.getClickables().forEach(function(clickable) {
  interactionManager.register(clickable.group, clickable);
});

let shadowsEnabled=true;
let lastTime =performance.now();

inputManager.addEventListener("keyPressed",function(event) {
  // cycle through the available camera views
  if(event.detail === "c") {
    cameraManager.cycleMode();
    ui.setCamera(cameraManager.getLabel());
    museum.setCeilingVisible(!cameraManager.isOverheadView());
  }
  if(event.detail === "h") {
    ui.toggleVisible();
  }
  // activate full museum awakening sequence
  if(event.detail === "t") {
    sceneManager.setAwakening();
    doorInteractionSystem.openAllDoors({ autoClose: false });
    exhibitPromptSystem.removeExhibits(
      museum.dinosaurRoom.dinosaur,
      museum.statueRoom.statue
    );
    museum.dinosaurRoom.dinosaur.walkToAtriumAndRoar();
    museum.statueRoom.statue.awakenIntoAtrium();
  }
});

inputManager.addEventListener("wheel",function(event) {
  cameraManager.zoom(event.detail);
});

inputManager.addEventListener("cameraDragged", function(event) {
  cameraManager.orbit(event.detail.deltaX, event.detail.deltaY);
});

ui.addEventListener("lightModeChanged",function(event) {
  const mode = lightingSystem.setMode(event.detail);
  player.setFlashlightActive(mode === "off");
  ui.setLightMode(mode);
});

ui.addEventListener("secondaryIntensityChanged", function(event) {
  lightingSystem.setSecondaryIntensity(event.detail);
});

ui.addEventListener("flashlightIntensityChanged", function(event) {
  lightingSystem.setFlashlightIntensity(event.detail);
});

ui.addEventListener("flashlightRangeChanged", function(event) {
  lightingSystem.setFlashlightRange(event.detail);
});

ui.addEventListener("toggleShadows", function() {
  shadowsEnabled = !shadowsEnabled;
  renderer.setShadows(shadowsEnabled);
  ui.setShadows(shadowsEnabled);
});

ui.addEventListener("qualityChanged", function(event) {
  renderer.setQuality(event.detail);
  shadowsEnabled = renderer.renderer.shadowMap.enabled;
  ui.setShadows(shadowsEnabled);
});

window.addEventListener("resize", function() {
  renderer.resize(cameraManager.camera);
});

function loop(time) {
  // update gameplay, camera and render
  requestAnimationFrame(loop);
  const deltaTime =Math.min(0.05, (time- lastTime) / 1000);
  const elapsedTime =time / 1000;
  lastTime=time;
  TWEEN.update(time);
  if(cameraManager.isFirstPerson()) {
    player.setAimDirection(cameraManager.getAimDirection());
  } else {
    player.aimForward();
  }
  player.update(deltaTime,elapsedTime);
  museum.updateTriggers(player);
  animationSystem.update(deltaTime,elapsedTime);
  cameraManager.update(player,deltaTime, elapsedTime);
  renderer.render(sceneManager.scene,cameraManager.camera);
}

ui.setCamera(cameraManager.getLabel());
museum.setCeilingVisible(!cameraManager.isOverheadView());
player.setFlashlightActive(lightingSystem.mode === "off");
ui.setLightMode(lightingSystem.mode);
ui.setShadows(shadowsEnabled);

loadingController.waitForReady()
  .then(() => {
    loadingController.hide();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  })
  .catch(error => {
    loadingController.showError(error);
  });
