import * as THREE from "three";
import { ROOM_RECTS } from "../utils/constants.js";
import { Hall } from "./Hall.js";
import { DinosaurRoom } from "./DinosaurRoom.js";
import { StatueRoom } from "./StatueRoom.js";
import { EgyptianRoom } from "./EgyptianRoom.js";
import { GalleryRoom } from "./GalleryRoom.js";

export class Museum {
  constructor(factory,lightingSystem, sceneManager, loadingController) {
    this.group = new THREE.Group();
    this.factory=factory;
    this.lightingSystem = lightingSystem;
    this.sceneManager = sceneManager;
    this.hall = new Hall(factory,lightingSystem);
    this.dinosaurRoom = new DinosaurRoom(factory,lightingSystem, loadingController);
    this.statueRoom = new StatueRoom(factory, lightingSystem, loadingController);
    this.egyptianRoom=new EgyptianRoom(factory, lightingSystem, loadingController);
    this.galleryRoom = new GalleryRoom(factory, lightingSystem, loadingController);
    // assemble every room in a museum group
    this.rooms = [
      this.hall,
      this.dinosaurRoom,
      this.statueRoom,
      this.egyptianRoom,
      this.galleryRoom
    ];
    this.rooms.forEach(room => {
      this.group.add(room.group);
    });
    this.ceilings=this.createCeilings(factory);
    this.cornices = this.createCornices(factory);
    this.group.add(this.ceilings,this.cornices);

    this.sceneManager.addEventListener("museumAwakens", () => {
      this.lightingSystem.setAwakening(true);
    });
  }

  createCeilings(factory) {
    const group = new THREE.Group();
    group.name = "Museum Ceilings";

    // create one ceiling for each room
    Object.values(ROOM_RECTS).forEach(rect => {
      const width = rect.maxX- rect.minX;
      const depth=rect.maxZ - rect.minZ;
      group.add(factory.createCeiling(width,depth,[rect.center[0],0, rect.center[1]]));
    });

    return group;
  }

  createCornices(factory) {
    const group = new THREE.Group();
    group.name = "Museum Cornices";

    // create one cornice for eac room
    Object.values(ROOM_RECTS).forEach(rect => {
      const width = rect.maxX - rect.minX;
      const depth = rect.maxZ- rect.minZ;
      group.add(factory.createCornice(width,depth, [rect.center[0],0, rect.center[1]]));
    });

    return group;
  }

  setCeilingVisible(visible) {
    this.ceilings.visible=visible;
    this.cornices.visible = visible;
  }

  getAnimatables() {
    // return the museum entities updated on every frame
    return [
      this.dinosaurRoom.dinosaur,
      this.statueRoom.statue,
      this.egyptianRoom.sarcophagus,
      this.galleryRoom.paintings
    ];
  }

  getClickables() {
    // return every museum entity that can be clicked
    const clickables = [
      this.dinosaurRoom.dinosaur,
      this.statueRoom.statue,
      this.egyptianRoom.sarcophagus
    ];
    this.galleryRoom.paintings.getClickables().forEach(function(clickable) {
      clickables.push(clickable)
    });
    return clickables;
  }

  getDoors() {
    return this.hall.getDoors();
  }

  updateTriggers(player) {
    // update painting reactions
    const position=player.group.position;
    this.galleryRoom.paintings.updateReactions(position);
  }
}
