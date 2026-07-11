import * as THREE from "three";

function createCanvas(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, context: canvas.getContext("2d") };
}

function textureFromCanvas(canvas, repeatX =1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX,  repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createWoodTexture() {
  const { canvas, context } = createCanvas(256);
  context.fillStyle = "#5c3524";
  context.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 1) {
    const wave = Math.sin(x * 0.08) * 12 + Math.sin(x * 0.23) * 5;
    context.strokeStyle = `rgba(${92 + wave}, ${52 + wave * 0.4}, ${31}, 0.55)`;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + Math.sin(x * 0.04) * 12, 256);
    context.stroke();
  }
  return textureFromCanvas(canvas, 2, 1);
}

export function createObeliskTexture() {
  const { canvas, context } = createCanvas(512);
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#d5b46b");
  gradient.addColorStop(0.45, "#b8863f");
  gradient.addColorStop(1, "#7d5628");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 950; i += 1) {
    const alpha = 0.06 + Math.random() * 0.16;
    const shade = 80 + Math.floor(Math.random() * 90);
    context.fillStyle = `rgba(${shade}, ${shade * 0.78}, ${shade * 0.42}, ${alpha})`;
    context.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  context.strokeStyle = "rgba(66, 41, 22, 0.22)";
  context.lineWidth = 4;
  for (let y = 72; y < 512; y += 88) {
    context.beginPath();
    context.moveTo(28, y);
    context.lineTo(484, y + Math.sin(y * 0.06) * 4);
    context.stroke();
  }

  context.strokeStyle = "rgba(52, 32, 17, 0.46)";
  context.lineWidth = 5;
  for (let column = 0; column < 4; column += 1) {
    const x = 84 + column * 116;
    for (let y = 80; y < 440; y += 72) {
      context.beginPath();
      context.moveTo(x - 20, y + 4);
      context.lineTo(x + 20, y + 4);
      context.moveTo(x, y - 18);
      context.lineTo(x, y + 26);
      context.stroke();

      context.beginPath();
      context.arc(x, y + 30, 13, 0, Math.PI * 2);
      context.stroke();
    }
  }

  context.strokeStyle = "rgba(255, 230, 155, 0.22)";
  context.lineWidth = 3;
  context.strokeRect(24, 24, 464, 464);

  return textureFromCanvas(canvas, 1, 3);
}
