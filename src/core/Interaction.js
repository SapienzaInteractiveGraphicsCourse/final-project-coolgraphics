import * as THREE from "three";

export class InteractionManager {
  constructor(camera, inputManager) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.raycaster = new THREE.Raycaster();
    this.clickables = new Set();
    inputManager.addEventListener("click", event => this.handleClick(event.detail.pointer));
  }

  register(object, target = object) {
    object.traverse(child => {
      child.userData.clickable = target;
      this.clickables.add(child);
    });
  }

  handleClick(pointer) {
    this.raycaster.setFromCamera(pointer, this.camera);
    const clickableObjects = Array.from(this.clickables);
    const hits = this.raycaster.intersectObjects(clickableObjects, true);
    const clicked = hits.find(item => item.object.userData.clickable);

    if (clicked?.object.userData.clickable?.onClick) {
      clicked.object.userData.clickable.onClick(clicked);
    }
  }
}
