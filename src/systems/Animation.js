export class AnimationSystem {
  constructor() {
    this.animatables = new Set();
  }

  add(animatable) {
    if (animatable?.update) {
      this.animatables.add(animatable);
    }
  }

  addMany(animatables) {
    animatables.forEach(animatable => this.add(animatable));
  }

  update(deltaTime, elapsedTime) {
    this.animatables.forEach(animatable => animatable.update(deltaTime, elapsedTime));
  }
}
