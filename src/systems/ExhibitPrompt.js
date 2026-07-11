import * as THREE from "three";

const PROMPT_DISTANCE = 5.2;

export class ExhibitPromptSystem {
  constructor(player, exhibits) {
    this.player = player;
    this.exhibits = exhibits;
    this.playerPosition = new THREE.Vector3();
    this.exhibitPosition = new THREE.Vector3();
    this.prompt = this.createPrompt();
  }

  createPrompt() {
    const prompt = document.createElement("div");
    prompt.style.position = "fixed";
    prompt.style.left = "50%";
    prompt.style.bottom = "112px";
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

  update() {
    const activeExhibit = this.findNearestExhibit();

    if (!activeExhibit) {
      this.prompt.style.display = "none";
      return;
    }

    this.prompt.textContent = activeExhibit.message();
    this.prompt.style.display = "block";
  }

  removeExhibits() {
    const removedObjects = new Set();
    for (let i = 0; i < arguments.length; i += 1) {
      removedObjects.add(arguments[i]);
    }
    this.exhibits = this.exhibits.filter(exhibit => !removedObjects.has(exhibit.object));
    this.prompt.style.display = "none";
  }

  findNearestExhibit() {
    this.player.group.getWorldPosition(this.playerPosition);

    let nearest = null;
    let nearestDistance = PROMPT_DISTANCE;

    this.exhibits.forEach(exhibit => {
      const group = exhibit.object.group;
      group.getWorldPosition(this.exhibitPosition);

      const distance = this.distance2D(this.playerPosition, this.exhibitPosition);

      if (distance <= nearestDistance) {
        nearest = exhibit;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  distance2D(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.hypot(dx, dz);
  }
}
