export function clamp(value, min, max) {
  return Math.max(min,Math.min(max, value));
}

export function lerp(a, b, t) {
  return a +(b - a) * t;
}

export function damp(current, target, lambda, deltaTime) {
  return lerp(current,target, 1 - Math.exp(-lambda *deltaTime));
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx*dx + dz * dz);
}
