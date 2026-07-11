import * as THREE from "three";
import { Statue } from "../entities/Statue.js";
import { addWallSconce } from "./wallSconces.js";

export class StatueRoom {
  constructor(factory, lightingSystem, loadingController) {
    this.group = new THREE.Group();
    this.group.name = "Statue Room";
    this.statue=new Statue(factory.materials, loadingController);
    this.createRoom(factory,lightingSystem);
    this.group.add(this.statue.group);
  }

  createRoom(factory, lightingSystem) {
    // build the room and leave an opening toward the hall
    this.group.add(factory.createFloor(17,12,[16.5,0,0]));
    this.group.add(factory.createWall(17,5.0,0.35, [16.5,2.5, -6]));
    this.group.add(factory.createWall(17, 5.0,0.35, [16.5,2.5,6]));
    this.group.add(factory.createWall(0.35,5.0,12, [25,2.5,0]));
    this.group.add(factory.createWall(0.35,5.0,4.2, [8,2.5,-3.9]));
    this.group.add(factory.createWall(0.35, 5.0,4.2, [8,2.5,3.9]));
    this.group.add(factory.createSign("MARBLE GUARDIAN",[16.5,3.15,-5.76],0, 4.6));
    this.group.add(factory.createColumn([23,0,-4]));
    this.group.add(factory.createColumn([23, 0,4]));
    this.group.add(factory.createBench([16.5,0,4.45],Math.PI));
    this.group.add(factory.createCeilingLight([16.5,4.95,0],1.35));
    this.addWallSconces(factory,lightingSystem);
  }

  addWallSconces(factory, lightingSystem) {
    // bdd sconces on the wall
    addWallSconce(this.group,factory, lightingSystem, [13.1,2.45,-5.76],0);
    addWallSconce(this.group, factory,lightingSystem, [19.9,2.45,-5.76], 0);
    addWallSconce(this.group,factory, lightingSystem, [24.76,2.45,-2.35],-Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [24.76,2.45,2.35], -Math.PI * 0.5);
  }
}
