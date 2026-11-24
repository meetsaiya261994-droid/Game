import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundManager } from '../audio/soundManager';
import {
  COMPANION_PETS,
  TRAIL_COSMETICS,
  getCharacterById,
  getWorldById,
} from '../game/config';
import {
  GameState,
  LevelConfig,
  ObstacleKind,
  PowerUpKind,
  RunSessionResult,
  RunnerHudSnapshot,
} from '../game/types';
import { PlayerComputedStats } from '../storage/saveSystem';
import {
  AdventurerRig,
  CompanionPetRig,
  GuardianRig,
  TreasureChestRig,
  buildAdventurerModel,
  buildCompanionPetModel,
  buildGuardianMonster,
  buildObstacleModel,
  buildPowerUpModel,
  buildTemplePortal,
  buildTreasureChest,
  updateAdventurerPose,
} from './models';
import { WorldTextureSet, createWorldTextures } from './textures';

const LANE_X = [-2.5, 0, 2.5];
const JUMP_VELOCITY = 14.8;
const GRAVITY = 40.0;
const SLIDE_DURATION = 0.65;
const CHAMBER_Z_OFFSET = 22;

interface ObstacleInstance {
  kind: ObstacleKind;
  lane: number;
  z: number;
  baseX: number;
  phase: number;
  mesh: THREE.Group;
  dynamicPart?: THREE.Object3D;
  hit: boolean;
  dodged: boolean;
  isFullWidth: boolean;
}

interface CoinInstance {
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Mesh;
}

interface PowerUpInstance {
  kind: PowerUpKind;
  lane: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface RunnerViewportProps {
  gameState: GameState;
  level: LevelConfig;
  characterId: string;
  trailId: string;
  petId: string | null;
  stats: PlayerComputedStats;
  runNonce: number;
  reviveNonce: number;
  onHudUpdate: (snapshot: RunnerHudSnapshot) => void;
  onReachTreasureChamber: (result: RunSessionResult) => void;
  onRunnerGameOver: (result: RunSessionResult) => void;
  onChestOpenComplete: () => void;
  onTogglePause: () => void;
}

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _tmpVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createLevelRng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const RunnerViewport: React.FC<RunnerViewportProps> = ({
  gameState,
  level,
  characterId,
  trailId,
  petId,
  stats,
  runNonce,
  reviveNonce,
  onHudUpdate,
  onReachTreasureChamber,
  onRunnerGameOver,
  onChestOpenComplete,
  onTogglePause,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    gameState,
    level,
    characterId,
    trailId,
    petId,
    stats,
    onHudUpdate,
    onReachTreasureChamber,
    onRunnerGameOver,
    onChestOpenComplete,
    onTogglePause,
  });
  propsRef.current = {
    gameState,
    level,
    characterId,
    trailId,
    petId,
    stats,
    onHudUpdate,
    onReachTreasureChamber,
    onRunnerGameOver,
    onChestOpenComplete,
    onTogglePause,
  };

  const apiRef = useRef<{
    rebuildLevel: (lvl: LevelConfig, charId: string, tId: string, pId: string | null) => void;
    revivePlayer: () => void;
    startChestOpen: () => void;
  } | null>(null);

  useEffect(() => {
    apiRef.current?.rebuildLevel(level, characterId, trailId, petId);
  }, [level.id, characterId, trailId, petId, runNonce]);

  useEffect(() => {
    if (reviveNonce > 0) {
      apiRef.current?.revivePlayer();
    }
  }, [reviveNonce]);

  useEffect(() => {
    if (gameState === 'CHEST_OPENING') {
      apiRef.current?.startChestOpen();
    }
  }, [gameState]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.15,
      190
    );

    const hemiLight = new THREE.HemisphereLight(0x8ad8b8, 0x263822, 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffdf9e, 1.85);
    sunLight.position.set(16, 28, 12);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x64dfdf, 0.55);
    rimLight.position.set(-14, 12, -20);
    scene.add(rimLight);

    let worldGroup = new THREE.Group();
    scene.add(worldGroup);

    let textures: WorldTextureSet | null = null;
    let adventurer: AdventurerRig | null = null;
    let companionPet: CompanionPetRig | null = null;
    let guardian: GuardianRig | null = null;
    let chestRig: TreasureChestRig | null = null;
    let obstacles: ObstacleInstance[] = [];
    let coins: CoinInstance[] = [];
    let powerUps: PowerUpInstance[] = [];
    let particles: ParticleItem[] = [];
    let torches: THREE.Mesh[] = [];

    const sparkGeo = new THREE.OctahedronGeometry(0.14, 0);
    const sparkGoldMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const sparkRedMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const sparkCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xa8a29e });

    const sim = {
      lane: 1,
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      isGrounded: true,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      slideTimer: 0,
      invulnTimer: 0,
      stumbleTimer: 0,
      hitstopTimer: 0,
      shakeIntensity: 0,
      elapsedRunSec: 0,
      runScore: 0,
      coinsCollected: 0,
      totalCoinsInLevel: 0,
      health: 1, // Strictly 1 LIFE!
      maxHealth: 1,
      damageTaken: 0,
      streakCount: 0,
      nearMissCount: 0,
      monsterDist: 6.5,
      monsterActive: false,
      activePowerUps: {} as Partial<Record<PowerUpKind, number>>,
      bannerText: null as string | null,
      bannerTimer: 0,
      hitFlash: 0,
      shieldFlash: 0,
      footstepAccum: 0,
      trailAccum: 0,
      completedRun: false,
      chestOpenProgress: 0,
      chestOpeningActive: false,
      chestOpenNotified: false,
      lastHudPush: 0,
      globalTime: 0,
      levelDistance: 620,
      hasCustomTrail: false,
    };

    const spawnBurst = (
      pos: THREE.Vector3,
      kind: 'gold' | 'hit' | 'shield' | 'trail',
      count = 10
    ) => {
      const mat =
        kind === 'gold'
          ? sparkGoldMat
          : kind === 'shield'
          ? sparkCyanMat
          : kind === 'trail'
          ? trailMat
          : sparkRedMat;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.position.copy(pos);
        worldGroup.add(mesh);
        particles.push({
          mesh,
          vel:
            kind === 'trail'
              ? new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 1.4, 2.5)
              : new THREE.Vector3(
                  (Math.random() - 0.5) * 7.5,
                  2.5 + Math.random() * 5.2,
                  (Math.random() - 0.5) * 7.5
                ),
          life: kind === 'trail' ? 0.32 : 0.45 + Math.random() * 0.25,
          maxLife: kind === 'trail' ? 0.32 : 0.7,
        });
      }
    };

    const showBanner = (text: string, duration = 1.8) => {
      sim.bannerText = text;
      sim.bannerTimer = duration;
    };

    const disposeGroup = (grp: THREE.Object3D) => {
      grp.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };

    const rebuildLevel = (
      lvl: LevelConfig,
      charId: string,
      tId: string,
      pId: string | null
    ) => {
      scene.remove(worldGroup);
      disposeGroup(worldGroup);
      textures?.dispose();

      worldGroup = new THREE.Group();
      scene.add(worldGroup);
      obstacles = [];
      coins = [];
      powerUps = [];
      particles = [];
      torches = [];

      const theme = getWorldById(lvl.worldId);
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      textures = createWorldTextures(theme, maxAniso);

      const trailCfg = TRAIL_COSMETICS.find((t) => t.id === tId) ?? TRAIL_COSMETICS[0];
      trailMat.color.setHex(trailCfg.colorNum);
      sim.hasCustomTrail = trailCfg.id !== 'none';

      scene.background = new THREE.Color(theme.skyColor);
      scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
      hemiLight.color.setHex(theme.hemiSky);
      hemiLight.groundColor.setHex(theme.hemiGround);
      sunLight.color.setHex(theme.sunColor);

      const L = lvl.distanceMeters;
      sim.levelDistance = L;

      const st = propsRef.current.stats;
      sim.lane = 1;
      sim.x = 0;
      sim.y = 0;
      sim.z = 0;
      sim.vy = 0;
      sim.isGrounded = true;
      sim.coyoteTimer = 0;
      sim.jumpBufferTimer = 0;
      sim.slideTimer = 0;
      sim.invulnTimer = 0;
      sim.stumbleTimer = 0;
      sim.hitstopTimer = 0;
      sim.shakeIntensity = 0;
      sim.elapsedRunSec = 0;
      sim.runScore = 0;
      sim.coinsCollected = 0;
      sim.health = 1; // Strictly 1 life!
      sim.maxHealth = 1;
      sim.damageTaken = 0;
      sim.streakCount = 0;
      sim.nearMissCount = 0;
      sim.monsterActive = lvl.hasMonsterChase;
      sim.monsterDist = lvl.hasMonsterChase ? 4.8 : 14;
      sim.activePowerUps = st.startsWithShield ? { SHIELD: st.shieldDurationSec } : {};
      sim.bannerText = `1 LIFE · ${lvl.name.toUpperCase()}`;
      sim.bannerTimer = 2.2;
      sim.completedRun = false;
      sim.chestOpenProgress = 0;
      sim.chestOpeningActive = false;
      sim.chestOpenNotified = false;

      // 1. Stone Causeway Track
      const totalTrackLen = L + 95;
      textures.pathMap.repeat.set(1, totalTrackLen / 10);
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 1.0, totalTrackLen),
        new THREE.MeshStandardMaterial({
          map: textures.pathMap,
          roughness: 0.82,
          metalness: 0.08,
        })
      );
      track.position.set(0, -0.5, -totalTrackLen / 2 + 24);
      track.receiveShadow = true;
      worldGroup.add(track);

      // 2. Valley Floor & Curbs
      const valley = new THREE.Mesh(
        new THREE.PlaneGeometry(240, totalTrackLen + 140),
        new THREE.MeshStandardMaterial({
          color:
            theme.id === 'volcano' ? 0x3b1208 : theme.id === 'pyramid' ? 0x8f6b3a : 0x0f261d,
          roughness: 0.95,
          metalness: 0.05,
        })
      );
      valley.rotation.x = -Math.PI / 2;
      valley.position.set(0, -5.5, -totalTrackLen / 2 + 20);
      worldGroup.add(valley);

      const curbMat = new THREE.MeshStandardMaterial({ map: textures.wallMap, roughness: 0.85 });
      const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, totalTrackLen), curbMat);
      leftCurb.position.set(-4.55, 0.15, -totalTrackLen / 2 + 24);
      const rightCurb = leftCurb.clone();
      rightCurb.position.x = 4.55;
      worldGroup.add(leftCurb, rightCurb);

      // Instanced Temple Pillars & Lush Foliage
      const rng = createLevelRng(lvl.id * 97 + 13);
      const pillarCount = Math.floor(totalTrackLen / 22) * 2;
      const pillarInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1.4, 6.2, 1.4),
        new THREE.MeshStandardMaterial({ map: textures.wallMap, roughness: 0.8 }),
        pillarCount
      );
      pillarInst.frustumCulled = false;

      const treeCount = Math.floor(totalTrackLen / 9) * 2;
      const trunkInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.32, 0.52, 7.5, 7),
        new THREE.MeshStandardMaterial({ map: textures.barkMap, roughness: 0.9 }),
        treeCount
      );
      const canopyInst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(2.7, 1),
        new THREE.MeshStandardMaterial({ color: theme.foliagePrimary, roughness: 0.85 }),
        treeCount
      );
      trunkInst.frustumCulled = false;
      canopyInst.frustumCulled = false;

      const dummy = new THREE.Object3D();
      const tintColor = new THREE.Color();
      let pIdx = 0;
      const flameGeo = new THREE.ConeGeometry(0.28, 0.72, 7);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });

      for (let z = 12; z > -L - 10; z -= 22) {
        for (const side of [-1, 1]) {
          if (pIdx >= pillarCount) break;
          dummy.position.set(side * 5.6, 2.7, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 0.88 + rng() * 0.35, 1);
          dummy.updateMatrix();
          pillarInst.setMatrixAt(pIdx++, dummy.matrix);

          if (Math.abs(Math.round(z)) % 44 < 22) {
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(side * 4.75, 2.15, z);
            worldGroup.add(flame);
            torches.push(flame);
          }
        }
      }
      pillarInst.instanceMatrix.needsUpdate = true;
      worldGroup.add(pillarInst);

      let tIdx = 0;
      for (let z = 18; z > -L - 30; z -= 9) {
        for (const side of [-1, 1]) {
          if (tIdx >= treeCount) break;
          const distOut = 9.5 + rng() * 14;
          const scale = 0.85 + rng() * 0.45;
          dummy.position.set(side * distOut, -1.5 + 3.2 * scale, z + (rng() - 0.5) * 4);
          dummy.rotation.set((rng() - 0.5) * 0.14, rng() * Math.PI * 2, (rng() - 0.5) * 0.14);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(tIdx, dummy.matrix);

          dummy.position.y += 3.6 * scale;
          dummy.scale.set(scale * 1.15, scale * 0.85, scale * 1.15);
          dummy.updateMatrix();
          canopyInst.setMatrixAt(tIdx, dummy.matrix);

          tintColor.setHex(tIdx % 2 === 0 ? theme.foliagePrimary : theme.foliageSecondary);
          tintColor.offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.08);
          canopyInst.setColorAt(tIdx, tintColor);
          tIdx++;
        }
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      canopyInst.instanceMatrix.needsUpdate = true;
      if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
      worldGroup.add(trunkInst, canopyInst);

      const waterfallMat = new THREE.MeshBasicMaterial({
        color:
          theme.id === 'volcano' ? 0xff5e1a : theme.id === 'pyramid' ? 0xd9a86c : 0x7dd3fc,
        transparent: true,
        opacity: 0.42,
      });
      for (let wz = -40; wz > -L; wz -= 95) {
        for (const side of [-1, 1]) {
          const cliff = new THREE.Mesh(
            new THREE.BoxGeometry(10, 26, 18),
            new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.92 })
          );
          cliff.position.set(side * 28, 7, wz);
          worldGroup.add(cliff);

          const fall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 24), waterfallMat);
          fall.position.set(side * 22.8, 7, wz);
          fall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          worldGroup.add(fall);
        }
      }

      // 3. INTENSE, HARDER & FUN Obstacle Waves!
      // Frequent 2-lane walls, 3-lane jump/slide gauntlets (where every lane requires a jump or slide!),
      // faster oscillating barriers, and coin arcs rewarding daring maneuvers!
      const coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 14);
      coinGeo.rotateX(Math.PI / 2);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd13b,
        emissive: 0x996500,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.94,
      });

      const powerKinds: PowerUpKind[] = ['MAGNET', 'SHIELD', 'SPEED_BOOST', 'DOUBLE_COINS'];
      const laneObstacles = lvl.obstacleKinds.filter(
        (k) => k !== 'SWINGING_AXE' && k !== 'GAP' && k !== 'MOVING_BARRIER'
      );
      const passableOverUnder = lvl.obstacleKinds.filter(
        (k) => k === 'FALLEN_LOG' || k === 'VINE_ARCH' || k === 'FIRE_TRAP'
      );
      let waveIdx = 0;

      for (let z = -26; z > -(L - 26); z -= lvl.obstacleSpacing) {
        waveIdx++;
        const kind = lvl.obstacleKinds[Math.floor(rng() * lvl.obstacleKinds.length)];
        const isFullWidth = kind === 'SWINGING_AXE' || kind === 'GAP';

        if (isFullWidth) {
          const bundle = buildObstacleModel(kind, textures, theme);
          bundle.group.position.set(0, 0, z);
          worldGroup.add(bundle.group);
          obstacles.push({
            kind,
            lane: 1,
            z,
            baseX: 0,
            phase: rng() * Math.PI * 2,
            mesh: bundle.group,
            dynamicPart: bundle.dynamicPart,
            hit: false,
            dodged: false,
            isFullWidth: true,
          });

          if (kind === 'GAP') {
            const coinLane = LANE_X[Math.floor(rng() * 3)];
            for (let k = -2; k <= 2; k++) {
              const cz = z + k * 1.35;
              const cy = 1.05 + Math.cos((k / 2.2) * (Math.PI / 2)) * 1.55;
              const cMesh = new THREE.Mesh(coinGeo, coinMat);
              cMesh.position.set(coinLane, cy, cz);
              worldGroup.add(cMesh);
              coins.push({ x: coinLane, y: cy, z: cz, collected: false, mesh: cMesh });
            }
          }
        } else if (kind === 'MOVING_BARRIER') {
          const bundle = buildObstacleModel('MOVING_BARRIER', textures, theme);
          bundle.group.position.set(0, 0, z);
          worldGroup.add(bundle.group);
          obstacles.push({
            kind: 'MOVING_BARRIER',
            lane: 1,
            z,
            baseX: 0,
            phase: rng() * Math.PI * 2,
            mesh: bundle.group,
            dynamicPart: bundle.dynamicPart,
            hit: false,
            dodged: false,
            isFullWidth: false,
          });
          // Risk-reward coins right down center
          for (let k = -1; k <= 1; k++) {
            const cz = z + k * 2.0;
            const cMesh = new THREE.Mesh(coinGeo, coinMat);
            cMesh.position.set(0, 1.05, cz);
            worldGroup.add(cMesh);
            coins.push({ x: 0, y: 1.05, z: cz, collected: false, mesh: cMesh });
          }
        } else {
          // 2-lane or 3-lane challenge waves!
          // On 3-lane waves, the 3rd lane ALWAYS gets a jumpable/slidable hazard so it's 100% fair but intense!
          const lanes = [0, 1, 2];
          for (let i = lanes.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
          }

          const tripleChallenge =
            passableOverUnder.length > 0 && rng() < 0.34 + lvl.levelNumber * 0.03;
          const blockTwo = rng() < 0.78; // Almost always 2 lanes blocked so you MUST dodge!

          const spawnCount = tripleChallenge ? 3 : blockTwo ? 2 : 1;
          const openLane = lanes[Math.min(2, spawnCount)];

          for (let i = 0; i < spawnCount; i++) {
            const lane = lanes[i];
            let subKind: ObstacleKind;
            if (tripleChallenge && i === 2) {
              // Guaranteed jumpable or slidable escape lane!
              subKind = passableOverUnder[Math.floor(rng() * passableOverUnder.length)];
            } else {
              subKind =
                i === 0
                  ? kind
                  : laneObstacles[Math.floor(rng() * Math.max(1, laneObstacles.length))] ??
                    'STONE_BARRIER';
            }

            const bundle = buildObstacleModel(subKind, textures, theme);
            const bx = LANE_X[lane];
            bundle.group.position.set(bx, 0, z);
            worldGroup.add(bundle.group);
            obstacles.push({
              kind: subKind,
              lane,
              z,
              baseX: bx,
              phase: rng() * Math.PI * 2,
              mesh: bundle.group,
              dynamicPart: bundle.dynamicPart,
              hit: false,
              dodged: false,
              isFullWidth: false,
            });
          }

          // Place coins along the escape lane (or arcing over the jumpable escape obstacle!)
          const escapeLaneX = LANE_X[openLane];
          const escapeIsJump =
            tripleChallenge &&
            obstacles[obstacles.length - 1] &&
            (obstacles[obstacles.length - 1].kind === 'FALLEN_LOG' ||
              obstacles[obstacles.length - 1].kind === 'FIRE_TRAP');

          for (let k = -1; k <= 1; k++) {
            const cz = z + k * 2.0;
            const cy = escapeIsJump ? (k === 0 ? 2.25 : 1.45) : 1.05;
            const cMesh = new THREE.Mesh(coinGeo, coinMat);
            cMesh.position.set(escapeLaneX, cy, cz);
            worldGroup.add(cMesh);
            coins.push({ x: escapeLaneX, y: cy, z: cz, collected: false, mesh: cMesh });
          }

          if (waveIdx % 6 === 3) {
            const pKind = powerKinds[Math.floor(rng() * powerKinds.length)];
            const pMesh = buildPowerUpModel(pKind);
            const pz = z - lvl.obstacleSpacing * 0.5;
            const pLane = Math.floor(rng() * 3);
            pMesh.position.set(LANE_X[pLane], 0, pz);
            worldGroup.add(pMesh);
            powerUps.push({
              kind: pKind,
              lane: pLane,
              z: pz,
              collected: false,
              mesh: pMesh,
            });
          }
        }
      }

      sim.totalCoinsInLevel = coins.length;

      // 4. Monumental Temple Destination Portal
      const portal = buildTemplePortal(theme, textures);
      portal.position.set(0, 0, -L);
      worldGroup.add(portal);

      // 5. Sacred 3D Treasure Chamber Platform
      const chamberZ = -L - CHAMBER_Z_OFFSET;
      const sanctuaryFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(11.5, 12.2, 0.9, 12),
        new THREE.MeshStandardMaterial({ map: textures.pathMap, roughness: 0.72 })
      );
      sanctuaryFloor.position.set(0, -0.45, chamberZ);
      sanctuaryFloor.receiveShadow = true;
      worldGroup.add(sanctuaryFloor);

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const cx = Math.cos(ang) * 9.5;
        const cz = chamberZ + Math.sin(ang) * 9.5;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.68, 7.2, 10),
          new THREE.MeshStandardMaterial({ map: textures.wallMap, roughness: 0.78 })
        );
        col.position.set(cx, 3.6, cz);
        worldGroup.add(col);

        const tFlame = new THREE.Mesh(flameGeo, flameMat);
        tFlame.position.set(cx * 0.85, 2.3, chamberZ + Math.sin(ang) * 8.1);
        worldGroup.add(tFlame);
        torches.push(tFlame);
      }

      chestRig = buildTreasureChest(theme, textures);
      chestRig.root.position.set(0, 0, chamberZ - 1.2);
      worldGroup.add(chestRig.root);

      // 6. Selected 3D Adventurer
      const charConfig = getCharacterById(charId);
      adventurer = buildAdventurerModel(charConfig);
      adventurer.root.position.set(0, 0, 0);
      worldGroup.add(adventurer.root);

      // 7. Equipped 3D Companion Pet (flies beside adventurer!)
      const petCfg = COMPANION_PETS.find((p) => p.id === pId) ?? null;
      if (petCfg) {
        companionPet = buildCompanionPetModel(petCfg.bodyColor, petCfg.glowColor);
        companionPet.root.position.set(1.1, 1.9, 0.2);
        worldGroup.add(companionPet.root);
      } else {
        companionPet = null;
      }

      // 8. Stone Guardian Monster
      guardian = buildGuardianMonster();
      guardian.root.position.set(0, 0, 7);
      guardian.root.visible = lvl.hasMonsterChase;
      worldGroup.add(guardian.root);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
      pushHudSnapshot(true);
    };

    const revivePlayer = () => {
      sim.health = 1; // Strictly 1 life restored on revive!
      sim.invulnTimer = 2.6;
      sim.stumbleTimer = 0;
      sim.monsterDist = 7.5;
      for (const ob of obstacles) {
        if (Math.abs(ob.z - sim.z) < 12) {
          ob.hit = true;
          ob.dodged = true;
        }
      }
      showBanner('ANKH REVIVE! 1 LIFE RESTORED!', 2.0);
      soundManager.playPowerUp();
      pushHudSnapshot(true);
    };

    const startChestOpen = () => {
      sim.chestOpeningActive = true;
      sim.chestOpenProgress = 0;
      sim.chestOpenNotified = false;
      if (chestRig) {
        chestRig.padlock.visible = true;
        chestRig.padlock.position.set(0, 1.02, 0.75);
        chestRig.lidPivot.rotation.x = 0;
        for (const bc of chestRig.burstCoins) {
          bc.mesh.visible = false;
          bc.mesh.position.set(0, 1.1, 0);
          bc.vel.set(
            (Math.random() - 0.5) * 4.5,
            4.4 + Math.random() * 3.8,
            (Math.random() - 0.5) * 4.5
          );
        }
      }
      soundManager.playChestUnlock();
    };

    apiRef.current = { rebuildLevel, revivePlayer, startChestOpen };

    const getStreakMultiplier = () => Math.min(5, 1 + Math.floor(sim.streakCount / 4));

    const pushHudSnapshot = (force = false) => {
      const now = performance.now();
      if (!force && now - sim.lastHudPush < 75) return;
      sim.lastHudPush = now;
      propsRef.current.onHudUpdate({
        distanceCovered: Math.min(sim.levelDistance, Math.max(0, -sim.z)),
        distanceTotal: sim.levelDistance,
        score: Math.floor(sim.runScore),
        coinsCollected: sim.coinsCollected,
        totalCoinsInLevel: sim.totalCoinsInLevel,
        health: sim.health,
        maxHealth: 1,
        streakCount: sim.streakCount,
        streakMultiplier: getStreakMultiplier(),
        monsterProximity: sim.monsterActive
          ? THREE.MathUtils.clamp(1 - (sim.monsterDist - 2.0) / 7.5, 0, 1)
          : 0,
        activePowerUps: { ...sim.activePowerUps },
        bannerText: sim.bannerTimer > 0 ? sim.bannerText : null,
        hitFlash: sim.hitFlash,
        shieldFlash: sim.shieldFlash,
      });
    };

    const triggerLaneShift = (dir: -1 | 1) => {
      if (propsRef.current.gameState !== 'RUNNING') return;
      const nextLane = THREE.MathUtils.clamp(sim.lane + dir, 0, 2);
      if (nextLane !== sim.lane) {
        sim.lane = nextLane;
        soundManager.playLaneShift();
      }
    };

    const triggerJump = () => {
      if (propsRef.current.gameState !== 'RUNNING') return;
      sim.jumpBufferTimer = 0.14;
      sim.slideTimer = 0;
    };

    const triggerSlide = () => {
      if (propsRef.current.gameState !== 'RUNNING') return;
      if (!sim.isGrounded) {
        sim.vy = Math.min(sim.vy, -22);
      }
      sim.slideTimer = SLIDE_DURATION;
      soundManager.playSlide();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      soundManager.unlock();
      const gs = propsRef.current.gameState;
      if (e.code === 'Escape' && (gs === 'RUNNING' || gs === 'RUNNING_PAUSED')) {
        propsRef.current.onTogglePause();
        return;
      }
      if (gs !== 'RUNNING') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        triggerLaneShift(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        triggerLaneShift(1);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        triggerSlide();
      }
    };

    let pointerDown = false;
    let swipeConsumed = false;
    let startX = 0;
    let startY = 0;
    const SWIPE_THRESHOLD = 30;

    const onPointerDown = (e: PointerEvent) => {
      soundManager.unlock();
      if (propsRef.current.gameState !== 'RUNNING') return;
      pointerDown = true;
      swipeConsumed = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown || swipeConsumed) return;
      if (propsRef.current.gameState !== 'RUNNING') return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return;
      swipeConsumed = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        triggerLaneShift(dx < 0 ? -1 : 1);
      } else {
        if (dy < 0) triggerJump();
        else triggerSlide();
      }
    };

    const onPointerUp = () => {
      pointerDown = false;
      swipeConsumed = false;
    };

    window.addEventListener('keydown', onKeyDown);
    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    rebuildLevel(
      propsRef.current.level,
      propsRef.current.characterId,
      propsRef.current.trailId,
      propsRef.current.petId
    );

    let disposed = false;
    let frameId = 0;
    let lastTs = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const handleObstacleImpact = () => {
      if (sim.invulnTimer > 0) return;

      // Speed boost smashes right through obstacles for massive bonus!
      if ((sim.activePowerUps.SPEED_BOOST ?? 0) > 0) {
        sim.shakeIntensity = 0.28;
        sim.runScore += 220 * propsRef.current.stats.runScoreMultiplier;
        spawnBurst(_tmpVec.set(sim.x, sim.y + 1, sim.z), 'gold', 14);
        soundManager.playCollision(true);
        showBanner('SMASHED THROUGH! +220', 1.0);
        return;
      }

      // Shield saves your 1 life once!
      if ((sim.activePowerUps.SHIELD ?? 0) > 0) {
        delete sim.activePowerUps.SHIELD;
        sim.invulnTimer = 1.4;
        sim.hitstopTimer = 0.05;
        sim.shakeIntensity = 0.42;
        sim.shieldFlash++;
        spawnBurst(_tmpVec.set(sim.x, sim.y + 1.1, sim.z), 'shield', 16);
        soundManager.playCollision(true);
        showBanner('SHIELD SAVED YOUR LIFE!', 1.5);
        pushHudSnapshot(true);
        return;
      }

      // STRICTLY 1 LIFE: Any unshielded hit is instant Game Over!
      sim.health = 0;
      sim.damageTaken++;
      sim.streakCount = 0;
      sim.stumbleTimer = 0.5;
      sim.hitstopTimer = 0.065;
      sim.shakeIntensity = 0.7;
      sim.hitFlash++;
      spawnBurst(_tmpVec.set(sim.x, sim.y + 1.0, sim.z), 'hit', 18);
      soundManager.playCollision(false);
      soundManager.playMonsterRoar();

      pushHudSnapshot(true);

      const res: RunSessionResult = {
        levelId: propsRef.current.level.id,
        runScore: Math.floor(sim.runScore),
        coinsCollected: sim.coinsCollected,
        totalCoinsInLevel: sim.totalCoinsInLevel,
        allCoinsCollected:
          sim.coinsCollected >= sim.totalCoinsInLevel && sim.totalCoinsInLevel > 0,
        timeSec: Math.max(1, Math.round(sim.elapsedRunSec)),
        damageTaken: sim.damageTaken,
        nearMissCount: sim.nearMissCount,
      };
      propsRef.current.onRunnerGameOver(res);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      sim.globalTime += dt;

      const gs = propsRef.current.gameState;
      const lvl = propsRef.current.level;
      const st = propsRef.current.stats;

      for (let i = 0; i < torches.length; i++) {
        const fl = torches[i];
        const flicker = 0.85 + Math.sin(sim.globalTime * 14 + i * 2.1) * 0.2;
        fl.scale.set(1, flicker, 1);
      }

      if (companionPet) {
        const flap = Math.sin(sim.globalTime * 16) * 0.55;
        companionPet.leftWing.rotation.z = flap;
        companionPet.rightWing.rotation.z = -flap;
      }

      if (gs === 'MAIN_MENU' || gs === 'LEVEL_SELECTION') {
        if (adventurer) {
          adventurer.root.position.set(0, 0, -4);
          adventurer.root.rotation.y = Math.PI;
          adventurer.shieldSphere.visible = false;
          adventurer.magnetRing.visible = false;
          adventurer.speedAura.visible = false;
          updateAdventurerPose(adventurer, 'IDLE', sim.globalTime, 0);
        }
        if (companionPet) {
          companionPet.root.position.set(
            1.15,
            2.05 + Math.sin(sim.globalTime * 3.5) * 0.22,
            -3.6
          );
          companionPet.root.rotation.y = Math.PI;
        }
        const panAngle = Math.sin(sim.globalTime * 0.28) * 0.42;
        _camTargetPos.set(
          Math.sin(panAngle) * 6.5,
          3.8 + Math.sin(sim.globalTime * 0.5) * 0.35,
          3.8
        );
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-3 * dt));
        _camLookAt.set(0, 1.8, -12);
        camera.lookAt(_camLookAt);
        camera.fov = THREE.MathUtils.damp(camera.fov, 58, 4, dt);
        camera.updateProjectionMatrix();
      } else if (gs === 'RUNNING') {
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        } else {
          sim.elapsedRunSec += dt;
          if (sim.bannerTimer > 0) sim.bannerTimer = Math.max(0, sim.bannerTimer - dt);
          if (sim.invulnTimer > 0) sim.invulnTimer = Math.max(0, sim.invulnTimer - dt);
          if (sim.stumbleTimer > 0) sim.stumbleTimer = Math.max(0, sim.stumbleTimer - dt);
          if (sim.slideTimer > 0) sim.slideTimer = Math.max(0, sim.slideTimer - dt);
          if (sim.jumpBufferTimer > 0) sim.jumpBufferTimer = Math.max(0, sim.jumpBufferTimer - dt);
          if (sim.shakeIntensity > 0)
            sim.shakeIntensity = Math.max(0, sim.shakeIntensity - dt * 2.2);

          for (const key of Object.keys(sim.activePowerUps) as PowerUpKind[]) {
            const rem = (sim.activePowerUps[key] ?? 0) - dt;
            if (rem <= 0) delete sim.activePowerUps[key];
            else sim.activePowerUps[key] = rem;
          }

          const hasSpeed = (sim.activePowerUps.SPEED_BOOST ?? 0) > 0;
          const hasMagnet = (sim.activePowerUps.MAGNET ?? 0) > 0;
          const hasShield = (sim.activePowerUps.SHIELD ?? 0) > 0;
          const hasDoubleCoins = (sim.activePowerUps.DOUBLE_COINS ?? 0) > 0;

          // Exciting escalating sprint speed as you near the vault!
          const progressRatio = Math.min(1, -sim.z / sim.levelDistance);
          const streakMult = getStreakMultiplier();
          const forwardSpeed =
            (lvl.baseSpeed + progressRatio * 6.5) *
            st.speedMultiplier *
            (hasSpeed ? 1.45 : 1.0);

          sim.z -= forwardSpeed * dt;
          sim.runScore +=
            forwardSpeed * dt * 2.8 * streakMult * st.runScoreMultiplier * (hasSpeed ? 1.8 : 1);

          // Crisp lane movement
          const targetX = LANE_X[sim.lane];
          const prevX = sim.x;
          sim.x = THREE.MathUtils.damp(sim.x, targetX, 20, dt);
          const lateralVel = (sim.x - prevX) / dt;
          const bankAngle = THREE.MathUtils.clamp(-lateralVel * 0.032, -0.32, 0.32);

          if (sim.isGrounded) {
            sim.coyoteTimer = 0.09;
          } else {
            sim.coyoteTimer = Math.max(0, sim.coyoteTimer - dt);
          }

          if (sim.jumpBufferTimer > 0 && sim.coyoteTimer > 0) {
            sim.vy = JUMP_VELOCITY;
            sim.isGrounded = false;
            sim.coyoteTimer = 0;
            sim.jumpBufferTimer = 0;
            sim.slideTimer = 0;
            soundManager.playJump();
          }

          if (!sim.isGrounded) {
            sim.vy -= GRAVITY * dt;
            sim.y += sim.vy * dt;
            if (sim.y <= 0) {
              sim.y = 0;
              sim.vy = 0;
              sim.isGrounded = true;
            }
          }

          if (sim.isGrounded && sim.slideTimer <= 0) {
            sim.footstepAccum += dt * (forwardSpeed / 16);
            if (sim.footstepAccum >= 0.26) {
              sim.footstepAccum = 0;
              soundManager.playFootstep();
            }
          }

          // Emit 3D cosmetic trail sparks behind boots!
          if (sim.hasCustomTrail || hasSpeed) {
            sim.trailAccum += dt;
            if (sim.trailAccum >= 0.045) {
              sim.trailAccum = 0;
              spawnBurst(
                _tmpVec.set(sim.x + (Math.random() - 0.5) * 0.35, sim.y + 0.25, sim.z + 0.45),
                hasSpeed ? 'gold' : 'trail',
                2
              );
            }
          }

          if (adventurer) {
            adventurer.root.position.set(sim.x, sim.y, sim.z);
            adventurer.root.rotation.y = 0;
            adventurer.bodyGroup.visible =
              sim.invulnTimer <= 0 || Math.floor(sim.globalTime * 18) % 2 === 0;
            adventurer.shieldSphere.visible = hasShield;
            adventurer.magnetRing.visible = hasMagnet;
            adventurer.magnetRing.rotation.z = sim.globalTime * 4;
            adventurer.speedAura.visible = hasSpeed;

            const pose = !sim.isGrounded ? 'JUMP' : sim.slideTimer > 0 ? 'SLIDE' : 'RUN';
            updateAdventurerPose(
              adventurer,
              pose,
              sim.globalTime * (hasSpeed ? 1.45 : 1.15),
              bankAngle
            );
          }

          if (companionPet) {
            companionPet.root.position.set(
              THREE.MathUtils.damp(companionPet.root.position.x, sim.x + 1.05, 8, dt),
              THREE.MathUtils.damp(
                companionPet.root.position.y,
                sim.y + 1.95 + Math.sin(sim.globalTime * 5) * 0.2,
                8,
                dt
              ),
              sim.z + 0.2
            );
            companionPet.root.rotation.y = 0;
          }

          if (guardian && sim.monsterActive) {
            guardian.root.visible = true;
            sim.monsterDist = THREE.MathUtils.damp(sim.monsterDist, 4.4, 0.5, dt);
            guardian.root.position.set(
              THREE.MathUtils.damp(guardian.root.position.x, sim.x, 6, dt),
              Math.abs(Math.sin(sim.globalTime * 12)) * 0.28,
              sim.z + sim.monsterDist
            );
            guardian.legs.forEach((leg, i) => {
              leg.rotation.x = Math.sin(sim.globalTime * 13 + (i < 2 ? 0 : Math.PI)) * 0.65;
            });
            guardian.jaw.rotation.x = 0.1 + Math.abs(Math.sin(sim.globalTime * 6)) * 0.28;
          }

          const playerSliding = sim.slideTimer > 0;
          const playerTopY = playerSliding ? 0.85 : sim.y + 1.85;
          const playerBottomY = sim.y;

          for (const ob of obstacles) {
            const dz = ob.z - sim.z;
            if (dz > 12 || dz < -75) continue;

            let obX = ob.baseX;

            if (ob.kind === 'MOVING_BARRIER') {
              obX = Math.sin(sim.globalTime * 3.15 + ob.phase) * 2.6;
              ob.mesh.position.x = obX;
            } else if (ob.kind === 'FIRE_TRAP' && ob.dynamicPart) {
              const s = 0.85 + Math.sin(sim.globalTime * 16 + ob.phase) * 0.24;
              ob.dynamicPart.scale.set(1, s, 1);
            } else if (ob.kind === 'SWINGING_AXE' && ob.dynamicPart) {
              const angle = Math.sin(sim.globalTime * 3.0 + ob.phase) * 0.92;
              ob.dynamicPart.rotation.z = angle;
              obX = Math.sin(angle) * 3.65;
            } else if (ob.kind === 'ROLLING_BOULDER' && ob.dynamicPart) {
              if (dz > -52) {
                ob.z += 9.2 * dt;
                ob.mesh.position.z = ob.z;
                ob.dynamicPart.rotation.x += 8.2 * dt;
              }
            }

            if (ob.hit) continue;

            const zThreshold = ob.kind === 'GAP' ? 1.7 : 0.92;
            if (Math.abs(ob.z - sim.z) < zThreshold) {
              if (ob.kind === 'GAP') {
                if (playerBottomY < 0.35) {
                  ob.hit = true;
                  handleObstacleImpact();
                }
              } else if (ob.kind === 'SWINGING_AXE') {
                const bladeDistX = Math.abs(sim.x - obX);
                if (bladeDistX < 1.12 && !playerSliding && playerBottomY < 1.7) {
                  ob.hit = true;
                  handleObstacleImpact();
                }
              } else {
                const xThreshold = ob.kind === 'VINE_ARCH' ? 1.18 : 1.05;
                if (Math.abs(sim.x - obX) < xThreshold) {
                  let collided = false;
                  if (ob.kind === 'FALLEN_LOG') {
                    collided = playerBottomY < 0.82;
                  } else if (ob.kind === 'FIRE_TRAP') {
                    collided = playerBottomY < 0.98;
                  } else if (ob.kind === 'VINE_ARCH') {
                    collided = playerTopY > 1.12;
                  } else {
                    collided = playerBottomY < 1.98;
                  }
                  if (collided) {
                    ob.hit = true;
                    handleObstacleImpact();
                  }
                }
              }
            } else if (!ob.dodged && ob.z - sim.z > 1.8) {
              // Cleanly passed obstacle! Reward Close-Call / Dodge Streak!
              ob.dodged = true;
              const wasCloseDodge =
                ob.isFullWidth ||
                Math.abs(sim.x - obX) < 2.8;
              if (wasCloseDodge) {
                sim.streakCount++;
                sim.nearMissCount++;
                const mult = getStreakMultiplier();
                const bonusPts = Math.round(90 * mult * st.nearMissMultiplier);
                sim.runScore += bonusPts;
                if (sim.streakCount % 4 === 0) {
                  const bonusCoins = Math.round(5 * mult * st.nearMissMultiplier);
                  sim.coinsCollected += bonusCoins;
                  showBanner(`DODGE STREAK ×${mult}! +${bonusPts} PTS · +${bonusCoins} COINS`, 1.3);
                  soundManager.playPowerUp();
                }
              }
            }
          }

          // Coins
          for (const coin of coins) {
            if (coin.collected) continue;
            coin.mesh.rotation.y = sim.globalTime * 4.2;
            const dz = coin.z - sim.z;
            if (dz > 6 || dz < -45) continue;

            if (hasMagnet && Math.abs(dz) < 12.5) {
              coin.x = THREE.MathUtils.damp(coin.x, sim.x, 14, dt);
              coin.y = THREE.MathUtils.damp(coin.y, sim.y + 1.1, 14, dt);
              coin.z = THREE.MathUtils.damp(coin.z, sim.z, 14, dt);
              coin.mesh.position.set(coin.x, coin.y, coin.z);
            }

            const distSq =
              (coin.x - sim.x) ** 2 +
              (coin.y - (sim.y + 1.0)) ** 2 +
              (coin.z - sim.z) ** 2;
            if (distSq < 1.4) {
              coin.collected = true;
              coin.mesh.visible = false;
              const gain = Math.round(1 * st.coinValueMultiplier * (hasDoubleCoins ? 2 : 1));
              sim.coinsCollected += gain;
              sim.runScore += 30 * getStreakMultiplier() * (hasDoubleCoins ? 2 : 1);
              soundManager.playCoin();
              spawnBurst(_tmpVec.set(coin.x, coin.y, coin.z), 'gold', 5);
            }
          }

          // Power-Ups
          for (const p of powerUps) {
            if (p.collected) continue;
            p.mesh.rotation.y = sim.globalTime * 2.6;
            p.mesh.position.y = Math.sin(sim.globalTime * 4.5) * 0.16;
            const distSq = (LANE_X[p.lane] - sim.x) ** 2 + (p.z - sim.z) ** 2;
            if (distSq < 1.65) {
              p.collected = true;
              p.mesh.visible = false;
              const dur =
                p.kind === 'MAGNET'
                  ? st.magnetDurationSec
                  : p.kind === 'SHIELD'
                  ? st.shieldDurationSec
                  : p.kind === 'SPEED_BOOST'
                  ? 5.0
                  : 8.5;
              sim.activePowerUps[p.kind] = dur;
              const labels: Record<PowerUpKind, string> = {
                MAGNET: 'COIN MAGNET ACTIVE!',
                SHIELD: 'JADE SHIELD ACTIVE!',
                SPEED_BOOST: 'TEMPLE SPEED SMASH!',
                DOUBLE_COINS: '2× DOUBLE COINS!',
              };
              showBanner(labels[p.kind], 1.7);
              soundManager.playPowerUp();
              spawnBurst(_tmpVec.set(sim.x, sim.y + 1.2, sim.z), 'shield', 12);
              pushHudSnapshot(true);
            }
          }

          // Finite Level Destination Reached!
          if (!sim.completedRun && -sim.z >= sim.levelDistance) {
            sim.completedRun = true;
            soundManager.playChestUnlock();
            pushHudSnapshot(true);
            const result: RunSessionResult = {
              levelId: lvl.id,
              runScore: Math.floor(sim.runScore + 400),
              coinsCollected: sim.coinsCollected,
              totalCoinsInLevel: sim.totalCoinsInLevel,
              allCoinsCollected:
                sim.coinsCollected >= sim.totalCoinsInLevel && sim.totalCoinsInLevel > 0,
              timeSec: Math.max(1, Math.round(sim.elapsedRunSec)),
              damageTaken: sim.damageTaken,
              nearMissCount: sim.nearMissCount,
            };
            propsRef.current.onReachTreasureChamber(result);
          }

          sunLight.position.set(sim.x + 16, 28, sim.z + 12);
          sunLight.target.position.set(sim.x, 0, sim.z - 12);
          sunLight.target.updateMatrixWorld();

          const shakeX = (Math.random() - 0.5) * sim.shakeIntensity;
          const shakeY = (Math.random() - 0.5) * sim.shakeIntensity;
          _camTargetPos.set(sim.x * 0.62 + shakeX, 4.35 + sim.y * 0.38 + shakeY, sim.z + 7.4);
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-11 * dt));
          _camLookAt.set(sim.x * 0.45, 1.5 + sim.y * 0.25, sim.z - 12);
          camera.lookAt(_camLookAt);
          const targetFov = hasSpeed ? 76 : 62 + progressRatio * 4;
          if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, dt);
            camera.updateProjectionMatrix();
          }

          pushHudSnapshot(false);
        }
      } else if (
        gs === 'TREASURE_CHAMBER' ||
        gs === 'CHEST_OPENING' ||
        gs === 'LEVEL_COMPLETED'
      ) {
        const chamberZ = -sim.levelDistance - CHAMBER_Z_OFFSET;
        if (adventurer) {
          adventurer.root.position.set(-2.35, 0, chamberZ + 1.2);
          adventurer.root.rotation.y = 0.65;
          adventurer.bodyGroup.visible = true;
          adventurer.shieldSphere.visible = false;
          adventurer.magnetRing.visible = false;
          adventurer.speedAura.visible = false;
          updateAdventurerPose(
            adventurer,
            gs === 'TREASURE_CHAMBER' ? 'IDLE' : 'VICTORY',
            sim.globalTime,
            0
          );
        }
        if (companionPet) {
          companionPet.root.position.set(
            -3.2,
            2.1 + Math.sin(sim.globalTime * 4) * 0.2,
            chamberZ + 1.1
          );
          companionPet.root.rotation.y = 0.65;
        }
        if (guardian) guardian.root.visible = false;

        sunLight.position.set(10, 22, chamberZ + 12);
        sunLight.target.position.set(0, 1, chamberZ);
        sunLight.target.updateMatrixWorld();

        if (chestRig && (gs === 'CHEST_OPENING' || gs === 'LEVEL_COMPLETED')) {
          if (sim.chestOpeningActive) {
            sim.chestOpenProgress = Math.min(1, sim.chestOpenProgress + dt * 0.55);
            const p = sim.chestOpenProgress;

            if (p < 0.22) {
              chestRig.padlock.position.x = Math.sin(p * 110) * 0.08;
            } else if (chestRig.padlock.visible) {
              chestRig.padlock.visible = false;
              soundManager.playChestOpen();
              spawnBurst(_tmpVec.set(0, 1.5, chamberZ - 0.5), 'gold', 18);
            }

            const lidT = THREE.MathUtils.clamp((p - 0.22) / 0.45, 0, 1);
            const easedLid = 1 - Math.pow(1 - lidT, 3);
            chestRig.lidPivot.rotation.x = -easedLid * 1.95;

            const beamMat = chestRig.lightBeam.material as THREE.MeshBasicMaterial;
            beamMat.opacity = easedLid * 0.55;
            chestRig.lightBeam.rotation.y = sim.globalTime * 0.7;
            chestRig.innerGlowLight.intensity = easedLid * 8.5;

            if (p > 0.25) {
              for (const bc of chestRig.burstCoins) {
                bc.mesh.visible = true;
                bc.vel.y -= 9.2 * dt;
                bc.mesh.position.addScaledVector(bc.vel, dt);
                bc.mesh.rotation.x += bc.rot.x * dt;
                bc.mesh.rotation.y += bc.rot.y * dt;
                if (bc.mesh.position.y < 0.12) {
                  bc.mesh.position.y = 0.12;
                  bc.vel.y *= -0.35;
                  bc.vel.x *= 0.7;
                  bc.vel.z *= 0.7;
                }
              }
            }

            if (p >= 1 && !sim.chestOpenNotified) {
              sim.chestOpenNotified = true;
              propsRef.current.onChestOpenComplete();
            }
          }
        } else if (chestRig && gs === 'TREASURE_CHAMBER') {
          chestRig.lidPivot.rotation.x = 0;
          chestRig.padlock.visible = true;
          chestRig.padlock.position.set(0, 1.02 + Math.sin(sim.globalTime * 3) * 0.03, 0.75);
          (chestRig.lightBeam.material as THREE.MeshBasicMaterial).opacity = 0;
          chestRig.innerGlowLight.intensity = 1.2 + Math.sin(sim.globalTime * 4) * 0.4;
        }

        const orbit = Math.sin(sim.globalTime * 0.42) * 0.35;
        const camDist = gs === 'CHEST_OPENING' ? 6.4 : 7.4;
        _camTargetPos.set(
          Math.sin(orbit) * camDist - 0.5,
          3.15,
          chamberZ + Math.cos(orbit) * camDist
        );
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-4.5 * dt));
        _camLookAt.set(-0.4, 1.45, chamberZ - 0.8);
        camera.lookAt(_camLookAt);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          worldGroup.remove(pt.mesh);
          particles.splice(i, 1);
          continue;
        }
        pt.vel.y -= 14 * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.rotation.x += 8 * dt;
        pt.mesh.rotation.y += 6 * dt;
        const s = Math.max(0.01, pt.life / pt.maxLife);
        pt.mesh.scale.setScalar(s);
      }

      if (gs !== 'PUZZLE' && gs !== 'PUZZLE_PAUSED' && gs !== 'PUZZLE_FAILED') {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      disposeGroup(worldGroup);
      textures?.dispose();
      sparkGeo.dispose();
      sparkGoldMat.dispose();
      sparkRedMat.dispose();
      sparkCyanMat.dispose();
      trailMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full z-0"
      aria-label="3D Temple Quest World Viewport"
    />
  );
};
