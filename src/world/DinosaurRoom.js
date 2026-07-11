import * as THREE from "three";
import { Dinosaur } from "../entities/Dinosaur.js";
import { addWallSconce } from "./wallSconces.js";

export class DinosaurRoom {
  constructor(factory, lightingSystem, loadingController) {
    this.group = new THREE.Group();
    this.group.name = "Dinosaur Room";
    this.dinosaur = new Dinosaur(loadingController);
    this.createRoom(factory,lightingSystem);
    this.group.add(this.dinosaur.group);
  }

  createRoom(factory, lightingSystem) {
    // Build the room and leave an opening toward the hall
    this.group.add(factory.createFloor(17,12,[-16.5,0, 0]));
    this.group.add(factory.createWall(17,5.0, 0.35, [-16.5,2.5, -6]));
    this.group.add(factory.createWall(17, 5.0,0.35, [-16.5,2.5, 6]));
    this.group.add(factory.createWall(0.35,5.0,12, [-25,2.5, 0]));
    this.group.add(factory.createWall(0.35,5.0,4.2, [-8,2.5,-3.9]));
    this.group.add(factory.createWall(0.35, 5.0,4.2, [-8,2.5,3.9]));
    this.group.add(factory.createSign("T-REX",[-16.5,3.1,-5.76], 0,2.4));
    this.group.add(factory.createColumn([-23,0,-4]));
    this.group.add(factory.createColumn([-23, 0,4]));
    this.group.add(factory.createCeilingLight([-16.5,4.95,0],1.35));
    this.addWallSconces(factory, lightingSystem);
    this.createDisplayRopes(factory);
  }

  addWallSconces(factory, lightingSystem) {
    // Place paired sconces on the two long walls
    addWallSconce(this.group,factory, lightingSystem, [-20.9,2.45,-5.76],0);
    addWallSconce(this.group, factory,lightingSystem, [-12.1,2.45, -5.76], 0);
    addWallSconce(this.group,factory, lightingSystem, [-20.9,2.45,5.76],Math.PI);
    addWallSconce(this.group, factory,lightingSystem, [-12.1,2.45,5.76], Math.PI);
  }

  createDisplayRopes(factory) {
    const material = factory.materials.gold;

    // Create barriers on both sides of the dinosaur
    for (const z of [-2.8,2.8]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04, 10, 12), material);
      rail.rotation.z=Math.PI * 0.5;
      rail.position.set(-16.5,0.8, z);
      rail.castShadow = true;
      rail.receiveShadow = true;
      this.group.add(rail);

      // Add evenly spaced supports along each barrier
      for (const x of [-21.2,-18.85, -16.5,-14.15, -11.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.075,0.8, 14), material);
        post.position.set(x,0.4,z);
        post.castShadow = true;
        post.receiveShadow = true;

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24, 0.08,18), material);
        foot.position.set(x,0.04, z);
        foot.castShadow = true;
        foot.receiveShadow = true;

        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11,14,10), material);
        cap.position.set(x,0.82,z);
        cap.castShadow = true;
        cap.receiveShadow = true;

        this.group.add(post,foot, cap);
      }
    }
  }
}
