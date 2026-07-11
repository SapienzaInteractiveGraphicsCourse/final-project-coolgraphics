import * as THREE from "three";
import { addWallSconce } from "./wallSconces.js";

const WALL_HEIGHT = 5.0;
const DOOR_HEADER_BOTTOM = 3.35;
const DOOR_HEADER_HEIGHT=WALL_HEIGHT - DOOR_HEADER_BOTTOM;
const DOOR_HEADER_CENTER_Y = DOOR_HEADER_BOTTOM + DOOR_HEADER_HEIGHT / 2;

export class Hall {
  constructor(factory, lightingSystem) {
    this.group = new THREE.Group();
    this.group.name = "Central Atrium";
    this.group.add(factory.createFloor(16,12,[0,0,0]));
    // Add wall headers above room entrances
    this.group.add(factory.createWall(0.35,DOOR_HEADER_HEIGHT,3.6, [-8,DOOR_HEADER_CENTER_Y,0]));
    this.group.add(factory.createWall(0.35, DOOR_HEADER_HEIGHT,3.6, [8,DOOR_HEADER_CENTER_Y,0]));
    this.group.add(factory.createWall(4.4,DOOR_HEADER_HEIGHT,0.35, [0,DOOR_HEADER_CENTER_Y,-6]));
    this.group.add(factory.createWall(4.4, DOOR_HEADER_HEIGHT,0.35, [0,DOOR_HEADER_CENTER_Y,6]));
    // create one doorway for each room
    this.doors = [
      factory.createDoorFrame([-8,0,0], Math.PI * 0.5,3.6),
      factory.createDoorFrame([8,0,0], -Math.PI * 0.5,3.6),
      factory.createDoorFrame([0,0,-6],0,4.4),
      factory.createDoorFrame([0,0,6], Math.PI,4.4)
    ];
    this.doors.forEach(door => {
      this.group.add(door);
    });
    this.group.add(factory.createSign("DINOSAUR",[-7.76,3.9,0],Math.PI * 0.5,3));
    this.group.add(factory.createSign("STATUE", [7.76,3.9,0],-Math.PI * 0.5, 2.6));
    this.group.add(factory.createSign("EGYPT",[0,3.9,-5.76],0,2.4));
    this.group.add(factory.createSign("GALLERY", [0,3.9,5.76],Math.PI,2.8));
    this.group.add(factory.createColumn([-5.9,0,-4.1]));
    this.group.add(factory.createColumn([5.9,0,-4.1]));
    this.group.add(factory.createColumn([-5.9,0,4.1]));
    this.group.add(factory.createColumn([5.9,0,4.1]));
    this.group.add(factory.createBench([-2.8,0,2.8], Math.PI * 0.5));
    this.group.add(factory.createBench([2.8,0,2.8],-Math.PI * 0.5));
    this.group.add(factory.createCeilingLight([0,4.95,0],1.35));
    this.addWallSconces(factory, lightingSystem);
  }

  addWallSconces(factory, lightingSystem) {
    // place sconces on thw walls
    addWallSconce(this.group,factory, lightingSystem, [-7.76,2.45,-3.35],Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [-7.76,2.45,3.35], Math.PI * 0.5);
    addWallSconce(this.group,factory, lightingSystem, [7.76,2.45,-3.35], -Math.PI * 0.5);
    addWallSconce(this.group, factory,lightingSystem, [7.76,2.45,3.35],-Math.PI * 0.5);
  }

  getDoors() {
    // return the four doorways connected to the atrium.
    return this.doors;
  }
}
