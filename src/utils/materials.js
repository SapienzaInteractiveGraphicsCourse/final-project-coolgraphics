import * as THREE from "three";
import { COLORS } from "./constants.js";
import {
  createObeliskTexture,
  createWoodTexture
} from "./proceduralTextures.js";

const FLOOR_TEXTURE_REPEAT ={ x: 8, y: 8 };
const FLOOR_TEXTURE_PATHS = {
  color: new URL("../texture/floor/WoodFloor064_2K-JPG_Color.jpg", import.meta.url).href,
  normal: new URL("../texture/floor/WoodFloor064_2K-JPG_NormalGL.jpg",import.meta.url).href,
  roughness: new URL("../texture/floor/WoodFloor064_2K-JPG_Roughness.jpg", import.meta.url).href
};
const WALL_TEXTURE_REPEAT = { x: 3, y: 2 };
const WALL_TEXTURE_PATHS = {
  color: new URL("../texture/wall/Concrete030_2K-JPG_Color.jpg",import.meta.url).href,
  normal: new URL("../texture/wall/Concrete030_2K-JPG_NormalGL.jpg", import.meta.url).href,
  roughness: new URL("../texture/wall/Concrete030_2K-JPG_Roughness.jpg", import.meta.url).href
};
const CEILING_TEXTURE_REPEAT = { x: 5, y: 5 };
const CEILING_TEXTURE_PATHS = {
  color: new URL("../texture/ceiling/wooden_panels_diff_4k.jpg", import.meta.url).href,
  bump: new URL("../texture/ceiling/wooden_panels_disp_4k (1).png", import.meta.url).href
};

function configureFloorTexture(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(FLOOR_TEXTURE_REPEAT.x,FLOOR_TEXTURE_REPEAT.y);
  return texture;
}

function configureWallTexture(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(WALL_TEXTURE_REPEAT.x,WALL_TEXTURE_REPEAT.y);
  return texture;
}

function configureCeilingTexture(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(CEILING_TEXTURE_REPEAT.x,CEILING_TEXTURE_REPEAT.y);
  return texture;
}

function loadTrackedTexture(textureLoader, url, loadingController, onLoad) {
  let resolveTexture;
  let rejectTexture;
  const promise = new Promise((resolve, reject) => {
    resolveTexture = resolve;
    rejectTexture = reject;
  });

  const texture = textureLoader.load(
    url,
    loadedTexture => {
      onLoad?.(loadedTexture);
      resolveTexture(loadedTexture);
    },
    undefined,
    error => {
      rejectTexture(error);
    }
  );

  loadingController?.track(promise);
  return texture;
}

function createExternalFloorMaterial(loadingController) {
  const textureLoader = new THREE.TextureLoader();
  const material = new THREE.MeshStandardMaterial({
    map: null,
    normalMap: null,
    roughnessMap: null,
    roughness: 0.85,
    metalness: 0.0
  });

  const colorTexture=configureFloorTexture(loadTrackedTexture(textureLoader, FLOOR_TEXTURE_PATHS.color, loadingController));
  colorTexture.colorSpace = THREE.SRGBColorSpace;

  const normalTexture = configureFloorTexture(loadTrackedTexture(textureLoader, FLOOR_TEXTURE_PATHS.normal, loadingController));
  const roughnessTexture = configureFloorTexture(loadTrackedTexture(textureLoader, FLOOR_TEXTURE_PATHS.roughness, loadingController));

  material.map=colorTexture;
  material.normalMap = normalTexture;
  material.roughnessMap = roughnessTexture;

  return material;
}

function createExternalWallMaterial(loadingController) {
  const textureLoader = new THREE.TextureLoader();
  const material = new THREE.MeshStandardMaterial({
    map: null,
    normalMap: null,
    roughnessMap: null,
    roughness: 0.82,
    metalness: 0.0
  });

  const colorTexture=configureWallTexture(loadTrackedTexture(textureLoader, WALL_TEXTURE_PATHS.color, loadingController));
  colorTexture.colorSpace = THREE.SRGBColorSpace;

  const normalTexture = configureWallTexture(loadTrackedTexture(textureLoader, WALL_TEXTURE_PATHS.normal, loadingController));
  const roughnessTexture = configureWallTexture(loadTrackedTexture(textureLoader, WALL_TEXTURE_PATHS.roughness, loadingController));

  material.map=colorTexture;
  material.normalMap = normalTexture;
  material.roughnessMap = roughnessTexture;

  return material;
}

function createCeilingMaterial(loadingController) {
  const textureLoader=new THREE.TextureLoader();
  const colorTexture = configureCeilingTexture(loadTrackedTexture(textureLoader, CEILING_TEXTURE_PATHS.color, loadingController));
  const bumpTexture = configureCeilingTexture(loadTrackedTexture(textureLoader, CEILING_TEXTURE_PATHS.bump, loadingController));
  colorTexture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map:colorTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.035,
    roughness: 0.64,
    metalness: 0.04,
    side: THREE.DoubleSide
  });
}

export function createMaterials(loadingController) {
  const woodTexture = createWoodTexture();
  const obeliskTexture = createObeliskTexture();
  const floorMaterial = createExternalFloorMaterial(loadingController);
  const wallMaterial = createExternalWallMaterial(loadingController);

  return {
    floor: floorMaterial,
    wall: wallMaterial,
    ceiling: createCeilingMaterial(loadingController),
    trim: new THREE.MeshStandardMaterial({ color: COLORS.trim,roughness: 0.58 }),
    wood: new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.48,
      metalness: 0.04
    }),
    bone: new THREE.MeshStandardMaterial({ color: COLORS.bone, roughness: 0.42, metalness: 0.02 }),
    darkBone: new THREE.MeshStandardMaterial({ color: 0xb7ac91, roughness: 0.5 }),
    statue: new THREE.MeshStandardMaterial({ color: COLORS.statue, roughness: 0.38, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.28, metalness: 0.28 }),
    obelisk: new THREE.MeshStandardMaterial({ map: obeliskTexture, roughness: 0.54, metalness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xbfd8ff,
      roughness: 0.04,
      metalness: 0,
      transmission: 0.18,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide
    }),
    playerCoat: new THREE.MeshStandardMaterial({ color: 0x253153, roughness: 0.64 }),
    playerSkin: new THREE.MeshStandardMaterial({ color: 0xe2b58b, roughness: 0.56 }),
    sign: new THREE.MeshStandardMaterial({ color: 0x151b2e, roughness: 0.5 }),
    signText: new THREE.MeshBasicMaterial({ color: 0xffe1a3 })
  };
}
