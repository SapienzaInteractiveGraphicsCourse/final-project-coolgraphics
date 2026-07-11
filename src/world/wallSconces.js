import * as THREE from "three";

export function addWallSconce(group,factory, lightingSystem, position, rotationY = 0) {
  const sconce = factory.createWallSconce(position,rotationY);
  group.add(sconce);

  const forward = new THREE.Vector3(Math.sin(rotationY),0, Math.cos(rotationY));
  const lightPosition = [
    position[0]+forward.x * 0.55,
    position[1],
    position[2]+forward.z * 0.55
  ];
  const light = lightingSystem.createSecondaryWallLight(lightPosition);
  lightingSystem.registerSecondaryEmitter(light,sconce.userData.emissiveMaterial);

  return sconce;
}
