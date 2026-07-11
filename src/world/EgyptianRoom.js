import * as THREE from "three";
import { Sarcophagus } from "../entities/Sarcophagus.js";
import { addWallSconce } from "./wallSconces.js";

const OBELISK_POSITIONS = [
  [-3.35, 0, -19.1],
  [3.35, 0, -19.1]
];
const OBELISK_SHAFT_BOTTOM_Y = 0.425;
const OBELISK_SHAFT_HEIGHT = 2.95;
const OBELISK_SHAFT_BOTTOM_RADIUS = 0.38;
const OBELISK_SHAFT_TOP_RADIUS = 0.25;

export class EgyptianRoom {
  constructor(factory, lightingSystem, loadingController) {
    this.group = new THREE.Group();
    this.group.name = "Egyptian Room";
    this.sarcophagus=new Sarcophagus(factory.materials, loadingController);
    this.createRoom(factory,lightingSystem);
    this.group.add(this.sarcophagus.group);
  }

  createRoom(factory, lightingSystem) {
    // build the room and leave the entrance open toward the hall
    this.group.add(factory.createFloor(16,17,[0,0, -14.5]));
    this.group.add(factory.createWall(16,5.0,0.35, [0,2.5, -23]));
    this.group.add(factory.createWall(0.35,5.0,17, [-8,2.5, -14.5]));
    this.group.add(factory.createWall(0.35, 5.0,17, [8,2.5, -14.5]));
    this.group.add(factory.createWall(5.8,5.0,0.35, [-5.1,2.5, -6]));
    this.group.add(factory.createWall(5.8, 5.0,0.35, [5.1,2.5, -6]));
    this.group.add(factory.createSign("EGYPTIAN WING",[0,3.15, -22.76],0,4.2));
    this.addObelisks(factory);
    this.group.add(factory.createCeilingLight([0,4.95,-14.5], 1.35));
    this.addWallSconces(factory,lightingSystem);
  }

  addWallSconces(factory, lightingSystem) {
    // place sconces along both side walls
    addWallSconce(this.group,factory, lightingSystem, [-7.76,2.45, -10.4], Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [-7.76,2.45,-18.6],Math.PI * 0.5);
    addWallSconce(this.group,factory, lightingSystem, [7.76,2.45, -10.4], -Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [7.76,2.45,-18.6], -Math.PI * 0.5);
  }

  addObelisks(factory) {
    // create the two obelisks
    OBELISK_POSITIONS.forEach(position => {
      const obelisk = this.createObelisk(factory);
      obelisk.position.set(position[0],position[1], position[2]);
      this.group.add(obelisk);
    });
  }

  createObelisk(factory) {
    // Assemble one obelisk
    const group = new THREE.Group();
    group.name = "Egyptian Procedural Obelisk";

    const lowerBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.18, 1.15),
      factory.materials.obelisk
    );
    lowerBase.position.y = 0.09;

    const upperBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.24, 0.86),
      factory.materials.obelisk
    );
    upperBase.position.y = 0.3;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.38, 2.95, 4),
      factory.materials.obelisk
    );
    shaft.position.y = 1.9;
    shaft.rotation.y = Math.PI * 0.25;

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.16, 0.62),
      factory.materials.gold
    );
    collar.position.y = 3.43;

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.78, 4),
      factory.materials.gold
    );
    cap.position.y = 3.9;
    cap.rotation.y = Math.PI * 0.25;

    const bandHeights = [0.72, 1.36, 2.0, 2.64];
    bandHeights.forEach(y => {
      const bandParts = this.createObeliskBand(factory, y);
      bandParts.forEach(function(part) {
        group.add(part);
      });
    });

    group.add(lowerBase, upperBase, shaft, collar, cap);
    group.rotation.y = Math.PI;
    group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  createObeliskBand(factory, y) {
    const progress = THREE.MathUtils.clamp(
      (y - OBELISK_SHAFT_BOTTOM_Y) / OBELISK_SHAFT_HEIGHT,
      0,
      1
    );
    const radius = THREE.MathUtils.lerp(
      OBELISK_SHAFT_BOTTOM_RADIUS,
      OBELISK_SHAFT_TOP_RADIUS,
      progress
    );
    const faceDistance=radius * Math.SQRT1_2;
    const faceWidth =radius*1.32;
    const stoneDepth = 0.075;
    const goldDepth = 0.026;
    const stoneHeight = 0.13;
    const goldHeight = 0.055;
    const stoneDistance = faceDistance + stoneDepth * 0.5;
    const goldDistance = faceDistance+stoneDepth + goldDepth * 0.5 + 0.004;
    const parts = [];

    const addBandFace = (axis, sign) => {
      const stoneGeometry = axis==="z"
        ? new THREE.BoxGeometry(faceWidth, stoneHeight, stoneDepth)
        : new THREE.BoxGeometry(stoneDepth, stoneHeight, faceWidth);
      const goldGeometry = axis === "z"
        ? new THREE.BoxGeometry(faceWidth * 0.78, goldHeight, goldDepth)
        : new THREE.BoxGeometry(goldDepth, goldHeight, faceWidth * 0.78);
      const stone = new THREE.Mesh(stoneGeometry, factory.materials.obelisk);
      const gold = new THREE.Mesh(goldGeometry, factory.materials.gold);

      if(axis === "z") {
        stone.position.set(0,y, sign * stoneDistance);
        gold.position.set(0,y, sign * goldDistance);
      } else {
        stone.position.set(sign * stoneDistance,y,0);
        gold.position.set(sign * goldDistance,y, 0);
      }

      parts.push(stone,gold);
    };

    addBandFace("z",1);
    addBandFace("z",-1);
    addBandFace("x", 1);
    addBandFace("x",-1);

    return parts;
  }
}
