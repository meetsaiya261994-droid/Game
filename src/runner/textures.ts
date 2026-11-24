import * as THREE from 'three';
import { WorldTheme } from '../game/types';

export interface WorldTextureSet {
  pathMap: THREE.CanvasTexture;
  wallMap: THREE.CanvasTexture;
  barkMap: THREE.CanvasTexture;
  chestWoodMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createWorldTextures(
  theme: WorldTheme,
  maxAnisotropy: number
): WorldTextureSet {
  // 1. Temple Causeway Stone Paving with 3-Lane Inlays & Moss/Accent Motifs
  const [pathCanvas, pCtx] = makeCanvas(512, 512);
  pCtx.fillStyle = theme.pathPrimary;
  pCtx.fillRect(0, 0, 512, 512);

  // Carved stone slabs (4 rows x 3 lane columns)
  const rows = 4;
  const cols = 3;
  const tileW = 512 / cols;
  const tileH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      pCtx.fillStyle = (r + c) % 2 === 0 ? theme.pathPrimary : theme.pathSecondary;
      pCtx.fillRect(x + 4, y + 4, tileW - 8, tileH - 8);

      // Subtle bevel highlight
      pCtx.strokeStyle = 'rgba(255,255,255,0.12)';
      pCtx.lineWidth = 2;
      pCtx.strokeRect(x + 6, y + 6, tileW - 12, tileH - 12);

      // Grout shadows
      pCtx.strokeStyle = 'rgba(0,0,0,0.38)';
      pCtx.lineWidth = 4;
      pCtx.strokeRect(x + 2, y + 2, tileW - 4, tileH - 4);

      // Subtle stone grain speckles
      for (let s = 0; s < 24; s++) {
        const sx = x + 10 + ((r * 71 + c * 37 + s * 29) % Math.floor(tileW - 20));
        const sy = y + 10 + ((r * 43 + c * 89 + s * 53) % Math.floor(tileH - 20));
        pCtx.fillStyle = s % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
        pCtx.fillRect(sx, sy, 4, 4);
      }
    }
  }

  // Carved golden/accent lane divider grooves
  pCtx.fillStyle = theme.pathAccent;
  pCtx.globalAlpha = 0.55;
  pCtx.fillRect(tileW - 4, 0, 8, 512);
  pCtx.fillRect(tileW * 2 - 4, 0, 8, 512);
  // Outer carved trim
  pCtx.fillRect(0, 0, 12, 512);
  pCtx.fillRect(500, 0, 12, 512);
  pCtx.globalAlpha = 1;

  // Jungle moss / weathering patches along edges
  pCtx.fillStyle = theme.id === 'jungle' ? 'rgba(38, 96, 46, 0.35)' : 'rgba(0, 0, 0, 0.16)';
  for (let i = 0; i < 14; i++) {
    const mx = i % 2 === 0 ? 16 : 482;
    const my = (i * 39) % 512;
    pCtx.beginPath();
    pCtx.arc(mx, my, 14 + (i % 3) * 6, 0, Math.PI * 2);
    pCtx.fill();
  }

  const pathMap = new THREE.CanvasTexture(pathCanvas);
  pathMap.colorSpace = THREE.SRGBColorSpace;
  pathMap.wrapS = THREE.RepeatWrapping;
  pathMap.wrapT = THREE.RepeatWrapping;
  pathMap.anisotropy = maxAnisotropy;

  // 2. Ancient Temple Masonry Wall Texture
  const [wallCanvas, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = theme.pathSecondary;
  wCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    const y = row * 64;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + offset;
      wCtx.fillStyle = (row + col) % 2 === 0 ? theme.pathPrimary : theme.pathSecondary;
      wCtx.fillRect(x + 2, y + 2, 60, 60);
      wCtx.strokeStyle = 'rgba(0,0,0,0.35)';
      wCtx.lineWidth = 3;
      wCtx.strokeRect(x + 2, y + 2, 60, 60);
    }
  }
  // Carved geometric temple frieze band
  wCtx.fillStyle = theme.pathAccent;
  wCtx.globalAlpha = 0.5;
  wCtx.fillRect(0, 118, 256, 20);
  wCtx.globalAlpha = 1;
  const wallMap = new THREE.CanvasTexture(wallCanvas);
  wallMap.colorSpace = THREE.SRGBColorSpace;
  wallMap.wrapS = THREE.RepeatWrapping;
  wallMap.wrapT = THREE.RepeatWrapping;
  wallMap.anisotropy = maxAnisotropy;

  // 3. Weathered Wood / Log Bark Texture
  const [barkCanvas, bCtx] = makeCanvas(128, 128);
  bCtx.fillStyle = '#4e3422';
  bCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 32; i++) {
    bCtx.fillStyle = i % 2 === 0 ? '#3b2416' : '#63432c';
    bCtx.fillRect(i * 4, 0, 3, 128);
  }
  bCtx.fillStyle = 'rgba(46, 112, 54, 0.45)';
  bCtx.fillRect(0, 14, 128, 18);
  bCtx.fillRect(0, 82, 128, 14);
  const barkMap = new THREE.CanvasTexture(barkCanvas);
  barkMap.colorSpace = THREE.SRGBColorSpace;
  barkMap.wrapS = THREE.RepeatWrapping;
  barkMap.wrapT = THREE.RepeatWrapping;
  barkMap.anisotropy = maxAnisotropy;

  // 4. Ornate Treasure Chest Plank Texture
  const [chestCanvas, cCtx] = makeCanvas(256, 256);
  cCtx.fillStyle = '#5c2c16';
  cCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6; i++) {
    cCtx.fillStyle = i % 2 === 0 ? '#6e361c' : '#4f2411';
    cCtx.fillRect(0, i * 42, 256, 40);
    cCtx.fillStyle = 'rgba(0,0,0,0.35)';
    cCtx.fillRect(0, i * 42 + 40, 256, 2);
  }
  // Subtle wood grain lines
  cCtx.strokeStyle = 'rgba(255,210,160,0.08)';
  cCtx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    cCtx.beginPath();
    cCtx.moveTo(0, i * 11);
    cCtx.lineTo(256, i * 11 + 3);
    cCtx.stroke();
  }
  const chestWoodMap = new THREE.CanvasTexture(chestCanvas);
  chestWoodMap.colorSpace = THREE.SRGBColorSpace;
  chestWoodMap.anisotropy = maxAnisotropy;

  return {
    pathMap,
    wallMap,
    barkMap,
    chestWoodMap,
    dispose: () => {
      pathMap.dispose();
      wallMap.dispose();
      barkMap.dispose();
      chestWoodMap.dispose();
    },
  };
}
