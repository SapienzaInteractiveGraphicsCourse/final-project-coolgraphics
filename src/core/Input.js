import * as THREE from "three";

export class InputManager extends EventTarget {
  constructor(domElement) {
    super();
    // track keyboard, click, drag, and wheel input and register as custom events
    this.domElement = domElement;
    this.keys =new Set();
    this.pointer =new THREE.Vector2();
    this.pointerScreen ={ x: 0, y: 0 };
    this.cameraDragging=false;
    this.dragDistance=0;
    this.lastDragPointer = new THREE.Vector2();

    window.addEventListener("keydown",event => {
      const key = event.key.toLowerCase();
      if(!this.keys.has(key)) {
        this.dispatchEvent(new CustomEvent("keyPressed",{ detail: key }));
      }
      this.keys.add(key);
    });

    window.addEventListener("keyup",event => {
      this.keys.delete(event.key.toLowerCase());
    });

    domElement.addEventListener("pointerdown",event => {
      if(event.button !== 0) {
        return;
      }

      this.cameraDragging=true;
      this.dragDistance=0;
      this.lastDragPointer.set(event.clientX,event.clientY);
      domElement.setPointerCapture(event.pointerId);
    });
    domElement.addEventListener("pointermove",event => {
      this.updatePointer(event);

      if(!this.cameraDragging) {
        return;
      }

      const deltaX =event.clientX - this.lastDragPointer.x;
      const deltaY =event.clientY - this.lastDragPointer.y;
      this.lastDragPointer.set(event.clientX,event.clientY);
      this.dragDistance += Math.hypot(deltaX,deltaY);
      this.dispatchEvent(new CustomEvent("cameraDragged", {
        detail: { deltaX, deltaY }
      }));
    });
    const stopCameraDrag =event => {
      if(!this.cameraDragging) {
        return;
      }

      this.cameraDragging=false;
      if(domElement.hasPointerCapture(event.pointerId)) {
        domElement.releasePointerCapture(event.pointerId);
      }
    };
    domElement.addEventListener("pointerup",stopCameraDrag);
    domElement.addEventListener("pointercancel",stopCameraDrag);
    domElement.addEventListener("click",event => {
      this.updatePointer(event);
      // large drags are camera movement not click on objects
      if(this.dragDistance > 4) {
        this.dragDistance=0;
        return;
      }
      this.dispatchEvent(new CustomEvent("click", { detail: { pointer: this.pointer.clone(), event } }));
    });
    domElement.addEventListener("wheel",event => {
      event.preventDefault();
      this.dispatchEvent(new CustomEvent("wheel",{ detail: event.deltaY }));
    },{ passive: false });
  }

  updatePointer(event) {
    // store normalized device coordinates and raw screen coordinates
    const rect =this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width)*2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height)*2 - 1);
    this.pointerScreen.x=event.clientX;
    this.pointerScreen.y=event.clientY;
  }

  isDown() {
    // returns true if any requested key is pressed
    for (let i = 0; i < arguments.length; i += 1) {
      if (this.keys.has(arguments[i].toLowerCase())) {
        return true;
      }
    }
    return false;
  }
}
