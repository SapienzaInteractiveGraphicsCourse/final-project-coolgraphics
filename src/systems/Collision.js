import * as THREE from "three";
import { MUSEUM_BOUNDS } from "../utils/constants.js";
import { clamp } from "../utils/math.js";

const PLAYER_MIN_Y =0.12;
const PLAYER_MAX_Y = 1.8;

export class CollisionSystem {
  constructor(bounds = MUSEUM_BOUNDS) {
    this.bounds=bounds;
    this.roots=[];
    this.colliderBox = new THREE.Box3();
  }

  register(root) {
    if(root && !this.roots.includes(root)) {
      this.roots.push(root);
    }
  }

  constrain(position, radius = 0.45, previousPosition=position) {
    const desiredX = clamp(position.x,this.bounds.minX + radius, this.bounds.maxX-radius);
    const desiredZ = clamp(position.z, this.bounds.minZ+radius, this.bounds.maxZ - radius);
    const previousX = clamp(previousPosition.x,this.bounds.minX + radius, this.bounds.maxX - radius);
    const previousZ = clamp(previousPosition.z, this.bounds.minZ+radius, this.bounds.maxZ-radius);

    position.set(previousX,position.y, previousZ);

    if(!this.isBlocked(desiredX, previousZ, radius)) {
      position.x=desiredX;
    }

    if(!this.isBlocked(position.x, desiredZ, radius)) {
      position.z=desiredZ;
    }
  }

  isBlocked(x, z, radius) {
    for (const root of this.roots) {
      root.updateWorldMatrix(true, true);
      let blocked = false;

      root.traverse(object => {
        if(blocked || !object.isMesh || !object.geometry || !this.isVisible(object)) {
          return;
        }

        this.colliderBox.setFromObject(object,true);
        if (
          this.colliderBox.isEmpty()
          || this.colliderBox.max.y <= PLAYER_MIN_Y
          || this.colliderBox.min.y >= PLAYER_MAX_Y
        ) {
          return;
        }

        const closestX = clamp(x,this.colliderBox.min.x, this.colliderBox.max.x);
        const closestZ = clamp(z, this.colliderBox.min.z,this.colliderBox.max.z);
        const dx =x - closestX;
        const dz =z - closestZ;
        blocked = dx*dx + dz*dz < radius*radius;
      });

      if(blocked) {
        return true;
      }
    }

    return false;
  }

  isVisible(object) {
    let current = object;
    while (current) {
      if(!current.visible) {
        return false;
      }
      current = current.parent;
    }
    return true;
  }
}
