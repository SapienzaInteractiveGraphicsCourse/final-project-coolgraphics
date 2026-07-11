import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

const INTERACTION_DISTANCE = 2.4;
const FACING_DOT_THRESHOLD = 0.35;
const DOOR_ANIMATION_DURATION_MS = 750;
const AUTO_CLOSE_DELAY_MS = 3500;

export class DoorInteractionSystem {
  constructor(player, doors) {
    this.player = player;
    this.doors = doors;
    this.activeDoor = null;
    this.playerPosition = new THREE.Vector3();
    this.doorPosition = new THREE.Vector3();
    this.playerForward = new THREE.Vector3();
    this.toDoor = new THREE.Vector3();
    this.prompt = this.createPrompt();
    this.handleKeyDown = this.handleKeyDown.bind(this);

    window.addEventListener("keydown",this.handleKeyDown);
  }

  createPrompt() {
    const prompt = document.createElement("div");
    prompt.textContent = "Press O to open the door";
    prompt.style.position = "fixed";
    prompt.style.left = "50%";
    prompt.style.bottom = "72px";
    prompt.style.transform = "translateX(-50%)";
    prompt.style.padding = "10px 16px";
    prompt.style.border = "0";
    prompt.style.borderRadius = "4px";
    prompt.style.background = "rgba(17, 13, 10, 0.94)";
    prompt.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.22)";
    prompt.style.clipPath = "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)";
    prompt.style.color = "#cbb98e";
    prompt.style.fontFamily = "var(--museum-font-family)";
    prompt.style.fontSize = "18px";
    prompt.style.fontWeight = "600";
    prompt.style.lineHeight = "1.2";
    prompt.style.letterSpacing = "0";
    prompt.style.pointerEvents = "none";
    prompt.style.display = "none";
    prompt.style.zIndex = "20";
    document.body.appendChild(prompt);
    return prompt;
  }

  handleKeyDown(event) {
    if(event.repeat || event.key.toLowerCase() !== "o") {
      return;
    }

    if (this.activeDoor) {
      this.openDoor(this.activeDoor);
    }
  }

  update() {
    this.activeDoor = this.findActiveDoor();
    this.prompt.style.display = this.activeDoor ? "block" : "none";
  }

  findActiveDoor() {
    this.player.group.getWorldPosition(this.playerPosition);
    this.player.group.getWorldDirection(this.playerForward);
    this.playerForward.y = 0;

    if (this.playerForward.lengthSq() === 0) {
      this.playerForward.set(Math.sin(this.player.group.rotation.y),0, Math.cos(this.player.group.rotation.y));
    } else {
      this.playerForward.normalize();
    }

    let nearestDoor = null;
    let nearestDistance = INTERACTION_DISTANCE;

    this.doors.forEach(door => {
      if (!this.canShowPromptForDoor(door)) {
        return;
      }

      door.getWorldPosition(this.doorPosition);
      this.toDoor.subVectors(this.doorPosition, this.playerPosition);
      this.toDoor.y = 0;

      const distance = this.toDoor.length();
      if(distance > nearestDistance || distance === 0) {
        return;
      }

      const facingDoor = this.toDoor.normalize().dot(this.playerForward) >= FACING_DOT_THRESHOLD;
      if (!facingDoor) {
        return;
      }

      nearestDoor = door;
      nearestDistance = distance;
    });

    return nearestDoor;
  }

  canShowPromptForDoor(door) {
    return door?.userData.ready && !door.userData.isOpen&& !door.userData.isAnimating;
  }

  openDoor(door, options = {}) {
    const { autoClose = true } = options;
    const data = door.userData;

    if (!data.ready || data.isAnimating) {
      return;
    }

    this.clearAutoClose(door);

    if (data.isOpen) {
      return;
    }

    this.animateDoor(door,data.openPositions, () => {
      data.isOpen = true;
      data.isAnimating = false;
      if (autoClose) {
        data.autoCloseTimeout = window.setTimeout(() => this.closeDoor(door),AUTO_CLOSE_DELAY_MS);
      }
    });
  }

  openAllDoors(options = {}) {
    this.doors.forEach(door => this.openDoor(door,options));
  }

  closeDoor(door) {
    const data = door.userData;
    if (!data.ready || !data.isOpen || data.isAnimating) {
      return;
    }

    this.clearAutoClose(door);
    this.animateDoor(door, data.closedPositions, () => {
      data.isOpen = false;
      data.isAnimating = false;
    });
  }

  animateDoor(door, targetPositions, onComplete) {
    const data = door.userData;
    const panels = data.slidingPanels?.length ? data.slidingPanels : [data.doorVisual].filter(Boolean);

    if (panels.length === 0) {
      return;
    }

    data.isAnimating = true;
    let completedTweens = 0;

    panels.forEach((panel, index) => {
      const targetPosition = targetPositions[index] ?? panel.position;
      const start ={ x: panel.position.x };
      const tween = new TWEEN.Tween(start)
        .to({ x: targetPosition.x }, DOOR_ANIMATION_DURATION_MS)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          panel.position.x = start.x;
        })
        .onComplete(() => {
          completedTweens += 1;
          if (completedTweens === panels.length) {
            onComplete();
          }
        });
      TWEEN.add(tween);
      tween.start();
    });
  }

  clearAutoClose(door) {
    const data = door.userData;
    if (data.autoCloseTimeout) {
      window.clearTimeout(data.autoCloseTimeout);
      data.autoCloseTimeout = null;
    }
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.doors.forEach(door => this.clearAutoClose(door));
    this.prompt.remove();
  }
}
