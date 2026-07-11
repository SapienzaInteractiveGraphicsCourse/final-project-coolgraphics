import * as THREE from "three";
import { Paintings } from "../entities/Paintings.js";
import { addWallSconce } from "./wallSconces.js";

export class GalleryRoom {
  constructor(factory, lightingSystem, loadingController) {
    this.group = new THREE.Group();
    this.group.name = "Gallery Room";
    this.paintings=new Paintings(factory.materials, loadingController);
    this.createRoom(factory,lightingSystem);
    this.group.add(this.paintings.group);
  }

  createRoom(factory, lightingSystem) {
    // Build the gallery room and leave the entrance open toward the hall
    this.group.add(factory.createFloor(16,17,[0,0,14.5]));
    this.group.add(factory.createWall(16,5.0,0.35, [0,2.5,23]));
    this.group.add(factory.createWall(0.35,5.0,17, [-8,2.5,14.5]));
    this.group.add(factory.createWall(0.35, 5.0,17, [8,2.5,14.5]));
    this.group.add(factory.createWall(5.8,5.0,0.35, [-5.1,2.5,6]));
    this.group.add(factory.createWall(5.8, 5.0,0.35, [5.1,2.5,6]));
    this.group.add(factory.createSign("LIVING CANVASES",[0,4.08,22.76],Math.PI,4.4));
    this.group.add(factory.createBench([0,0,12.2],0));
    this.group.add(factory.createColumn([-6.2,0,20.4]));
    this.group.add(factory.createColumn([6.2,0,20.4]));
    this.group.add(factory.createCeilingLight([0,4.95,14.5],1.35));
    this.addWallSconces(factory,lightingSystem);
  }

  addWallSconces(factory, lightingSystem) {
    // Place sconces along both side walls
    addWallSconce(this.group,factory, lightingSystem, [-7.76,2.45,10.4],Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [-7.76,2.45,20.4], Math.PI * 0.5);
    addWallSconce(this.group,factory, lightingSystem, [7.76,2.45,10.4], -Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [7.76,2.45,20.4],-Math.PI * 0.5);
  }
}
