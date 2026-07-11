import * as THREE from "three";
import { distance2D } from "../utils/math.js";

// painting images
const PAINTING_IMAGE_URLS = [
  new URL("../texture/paintings/van_gogh_1.jpg", import.meta.url).href,
  new URL("../texture/paintings/van_gogh_2.jpeg", import.meta.url).href,
  new URL("../texture/paintings/seraut.jpg", import.meta.url).href,
  new URL("../texture/paintings/picasso.jpg", import.meta.url).href,
  new URL("../texture/paintings/monet.jpg", import.meta.url).href,
  new URL("../texture/paintings/daVinci.jpeg", import.meta.url).href,
  new URL("../texture/paintings/botticelli.jpg", import.meta.url).href
];
// Target aspect ratio to crop the loaded image 
const PAINTING_ASPECT = 1.8 / 1.22;
// Distance to show the hint "click to change artwork"
const PAINTING_PROMPT_DISTANCE = 4.2;

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadPaintingTexture(url, loadingController) {
  if (!textureCache.has(url)) {
    // Load the texture and crop it
    let resolveTexture;
    let rejectTexture;
    const promise = new Promise((resolve, reject) => {
      resolveTexture = resolve;
      rejectTexture = reject;
    });
    const texture = textureLoader.load(
      url,
      loadedTexture => {
        fitTextureToPainting(loadedTexture);
        loadedTexture.needsUpdate = true;
        resolveTexture(loadedTexture);
      },
      undefined,
      error => {
        rejectTexture(error);
      }
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    loadingController?.track(promise);
    textureCache.set(url, texture);
  }

  return textureCache.get(url);
}

function fitTextureToPainting(texture) {
  // Crop the image to PAINTING_ASPECT
  const image = texture.image;
  if (!image?.width || !image?.height) {
    return;
  }

  const imageAspect = image.width / image.height;
  texture.offset.set(0, 0);
  texture.repeat.set(1, 1);

  if (imageAspect > PAINTING_ASPECT) {
    texture.repeat.x = PAINTING_ASPECT / imageAspect;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else {
    texture.repeat.y = imageAspect / PAINTING_ASPECT;
    texture.offset.y = (1 - texture.repeat.y) / 2;
  }
}

class Painting {
  constructor(materials, index, position, rotationY, textureIndex, onRequestTextureChange, loadingController) {
    this.materials = materials;
    this.index = index;
    this.textureIndex = textureIndex;
    this.loadingController = loadingController;
    // pick a new texture for the painting
    this.onRequestTextureChange = onRequestTextureChange;
    this.group = new THREE.Group();
    this.group.position.set(position[0], position[1], position[2]);
    this.group.rotation.y = rotationY;
    this.reactive = false; // whether the player is near this painting
    this.createModel();
  }

  createModel() {
    // wooden frame bars around the canvas
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.18, 0.18), this.materials.wood);
    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.18, 0.18), this.materials.wood);
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.65, 0.18), this.materials.wood);
    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.65, 0.18), this.materials.wood);

    topFrame.position.y = 0.735;
    bottomFrame.position.y = -0.735;
    leftFrame.position.x = -1.035;
    rightFrame.position.x = 1.035;

    // canvas surface textured with the current artwork image
    const artMaterial = new THREE.MeshStandardMaterial({
      map: this.getTexture(),
      roughness: 0.34,
      metalness: 0.04,
      side: THREE.DoubleSide
    });
    this.surface = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.22), artMaterial);
    this.surface.position.z = -0.12;

    this.group.add(topFrame, bottomFrame, leftFrame, rightFrame, this.surface);
    this.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  getTexture() {
    return loadPaintingTexture(PAINTING_IMAGE_URLS[this.textureIndex], this.loadingController);
  }

  setTextureIndex(textureIndex) {
    // swap with a new artwork texture
    this.textureIndex = textureIndex;
    this.surface.material.map = this.getTexture();
    this.surface.material.needsUpdate = true;
  }

  onClick() {
    this.onRequestTextureChange(this);
  }

  react(strength) {
    this.reactive = strength > 0;
  }

  update(deltaTime, elapsedTime) {
    // when player nearby, shake the painting using a sine wave
    const target = this.reactive ? Math.sin(elapsedTime * 5 + this.index) * 0.08 : 0;
    this.group.rotation.z += (target - this.group.rotation.z) * Math.min(1, deltaTime * 7);
  }
}

// Manages the full set of paintings in the scene
export class Paintings {
  constructor(materials, loadingController) {
    this.materials = materials;
    this.loadingController = loadingController;
    this.group = new THREE.Group();
    this.nextTextureCursor = 4;
    this.prompt = this.createPrompt();
    PAINTING_IMAGE_URLS.forEach(url => {
      loadPaintingTexture(url, loadingController);
    });
    // painting placements
    this.paintings = [
      new Painting(materials, 0, [-2.4, 2.3, 22.68], Math.PI, 0, painting => this.changePaintingTexture(painting), loadingController),
      new Painting(materials, 1, [2.4, 2.3, 22.68], Math.PI, 1, painting => this.changePaintingTexture(painting), loadingController),
      new Painting(materials, 2, [-7.68, 2.3, 15.2], Math.PI * 0.5, 2, painting => this.changePaintingTexture(painting), loadingController),
      new Painting(materials, 3, [7.68, 2.3, 15.2], -Math.PI * 0.5, 3, painting => this.changePaintingTexture(painting), loadingController)
    ];
    this.paintings.forEach(painting => {
      this.group.add(painting.group);
    });
  }

  createPrompt() {
    // hint shown when the player is close enough to a painting 
    const prompt = document.createElement("div");
    prompt.textContent = "Click the painting to change the artwork";
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

  changePaintingTexture(selectedPainting) {
    // picks the next texture index that isn't currently displayed by any other painting 
    // and differs from the selected painting's current texture.
    const usedByOtherPaintings = new Set(
      this.paintings
        .filter(painting => painting !== selectedPainting)
        .map(painting => painting.textureIndex)
    );

    for (let i = 0; i < PAINTING_IMAGE_URLS.length; i += 1) {
      const candidate = (this.nextTextureCursor + i) % PAINTING_IMAGE_URLS.length;
      if (!usedByOtherPaintings.has(candidate) && candidate !== selectedPainting.textureIndex) {
        selectedPainting.setTextureIndex(candidate);
        this.nextTextureCursor = (candidate + 1) % PAINTING_IMAGE_URLS.length;
        return;
      }
    }
  }

  getClickables() {
    return this.paintings;
  }

  updateReactions(playerPosition) {
    // find the painting closest to the player
    let nearest = null;
    let nearestDistance = Infinity;
    this.paintings.forEach(painting => {
      const world = new THREE.Vector3();
      painting.group.getWorldPosition(world);
      const distance = distance2D(playerPosition, world);
      if (distance < nearestDistance) {
        nearest = painting;
        nearestDistance = distance;
      }
    });

    // only the nearest painting reacts: the closer the player, the higher the strength
    this.paintings.forEach(painting => {
      painting.react(painting === nearest && nearestDistance < 5 ? 1 - nearestDistance / 5 : 0);
    });
    // interaction hint only when close enough
    this.prompt.style.display = nearestDistance < PAINTING_PROMPT_DISTANCE ? "block" : "none";
  }

  update(deltaTime, elapsedTime) {
    this.paintings.forEach(painting => {
      painting.update(deltaTime, elapsedTime);
    });
  }
}
