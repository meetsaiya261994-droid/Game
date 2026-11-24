import * as THREE from 'three';
import { CharacterConfig, ObstacleKind, PowerUpKind, WorldTheme } from '../game/types';
import { WorldTextureSet } from './textures';

export interface AdventurerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  shieldSphere: THREE.Mesh;
  magnetRing: THREE.Mesh;
  speedAura: THREE.Mesh;
}

/**
 * Build a 12-part articulated composite 3D Adventurer character
 * pivoted at bottom-center (y = 0 at boot soles).
 */
export function buildAdventurerModel(char: CharacterConfig): AdventurerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const tunicMat = new THREE.MeshStandardMaterial({
    color: char.colors.tunic,
    roughness: 0.72,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: char.colors.pants,
    roughness: 0.85,
    metalness: 0.05,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2a1c14,
    roughness: 0.65,
    metalness: 0.12,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: char.colors.hat,
    roughness: 0.78,
    metalness: 0.05,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: char.colors.accent,
    roughness: 0.25,
    metalness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: char.colors.skin,
    roughness: 0.65,
    metalness: 0.02,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: char.colors.pack,
    roughness: 0.82,
    metalness: 0.08,
  });

  // Contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.55, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  // Legs (hip pivot at y = 0.82)
  const makeLeg = (xOffset: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(xOffset, 0.82, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 6, 10), pantsMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    leg.add(thigh);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.3), bootMat);
    boot.position.set(0, -0.64, -0.04);
    boot.castShadow = true;
    leg.add(boot);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.12, 0.08, 10), accentMat);
    cuff.position.y = -0.48;
    leg.add(cuff);

    return leg;
  };

  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso + Explorer Belt + Sash
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.66, 10), tunicMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.11, 10), bootMat);
  belt.position.y = 0.88;
  bodyGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), accentMat);
  buckle.position.set(0, 0.88, -0.23);
  bodyGroup.add(buckle);

  // Explorer Scarf Collar
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.065, 8, 14), accentMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.48;
  bodyGroup.add(scarf);

  // Backpack + Rolled Bedroll + Brass Canteen (visible from third-person rear!)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), packMat);
  pack.position.set(0, 1.18, 0.26);
  pack.castShadow = true;
  bodyGroup.add(pack);

  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 10), accentMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.45, 0.27);
  bodyGroup.add(bedroll);

  const packStraps = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.26), accentMat);
  packStraps.position.set(0, 1.16, 0.26);
  bodyGroup.add(packStraps);

  // Arms (shoulder pivot at y = 1.4)
  const makeArm = (xOffset: number): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(xOffset, 1.4, 0);

    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.38, 6, 10), tunicMat);
    sleeve.position.y = -0.24;
    sleeve.castShadow = true;
    arm.add(sleeve);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), bootMat);
    glove.position.y = -0.48;
    arm.add(glove);

    return arm;
  };

  const leftArm = makeArm(-0.34);
  const rightArm = makeArm(0.34);
  bodyGroup.add(leftArm, rightArm);

  // Head + Adventurer Wide-Brim Hat
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.66, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.04, 16), hatMat);
  brim.position.y = 0.14;
  brim.castShadow = true;
  headGroup.add(brim);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.2, 14), hatMat);
  crown.position.y = 0.25;
  crown.castShadow = true;
  headGroup.add(crown);

  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.055, 14), accentMat);
  hatBand.position.y = 0.18;
  headGroup.add(hatBand);

  bodyGroup.add(headGroup);

  // Power-up Visual Auras (hidden until active)
  const shieldSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.28,
      roughness: 0.15,
      metalness: 0.2,
      depthWrite: false,
    })
  );
  shieldSphere.position.y = 1.0;
  shieldSphere.visible = false;
  root.add(shieldSphere);

  const magnetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.055, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    })
  );
  magnetRing.rotation.x = Math.PI / 2;
  magnetRing.position.y = 1.05;
  magnetRing.visible = false;
  root.add(magnetRing);

  const speedAura = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 2.2, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  speedAura.rotation.x = -Math.PI / 2;
  speedAura.position.set(0, 1.05, 0.55);
  speedAura.visible = false;
  root.add(speedAura);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    headGroup,
    shieldSphere,
    magnetRing,
    speedAura,
  };
}

export type AdventurerPoseMode = 'IDLE' | 'RUN' | 'JUMP' | 'SLIDE' | 'STUMBLE' | 'VICTORY';

export function updateAdventurerPose(
  rig: AdventurerRig,
  mode: AdventurerPoseMode,
  phase: number,
  bankAngle: number
): void {
  rig.bodyGroup.rotation.z = bankAngle;

  if (mode === 'IDLE') {
    const breathe = Math.sin(phase * 2.4) * 0.035;
    rig.bodyGroup.position.y = breathe;
    rig.bodyGroup.rotation.x = 0;
    rig.bodyGroup.scale.set(1, 1, 1);
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArm.rotation.x = Math.sin(phase * 1.6) * 0.08;
    rig.rightArm.rotation.x = -Math.sin(phase * 1.6) * 0.08;
    rig.leftArm.rotation.z = 0.08;
    rig.rightArm.rotation.z = -0.08;
    rig.headGroup.rotation.y = Math.sin(phase * 0.8) * 0.14;
  } else if (mode === 'RUN') {
    const stride = Math.sin(phase * 13);
    const bob = Math.abs(Math.cos(phase * 13)) * 0.11;
    rig.bodyGroup.position.y = bob;
    rig.bodyGroup.rotation.x = -0.14; // athletic forward lean
    rig.bodyGroup.scale.set(1, 1, 1);
    rig.leftLeg.rotation.x = stride * 0.85;
    rig.rightLeg.rotation.x = -stride * 0.85;
    rig.leftArm.rotation.x = -stride * 0.78;
    rig.rightArm.rotation.x = stride * 0.78;
    rig.leftArm.rotation.z = 0.12;
    rig.rightArm.rotation.z = -0.12;
    rig.headGroup.rotation.y = 0;
  } else if (mode === 'JUMP') {
    rig.bodyGroup.position.y = 0;
    rig.bodyGroup.rotation.x = -0.18;
    rig.bodyGroup.scale.set(0.95, 1.08, 0.95);
    rig.leftLeg.rotation.x = 0.65;
    rig.rightLeg.rotation.x = -0.45;
    rig.leftArm.rotation.x = -1.2;
    rig.rightArm.rotation.x = -0.9;
    rig.leftArm.rotation.z = 0.35;
    rig.rightArm.rotation.z = -0.35;
    rig.headGroup.rotation.y = 0;
  } else if (mode === 'SLIDE') {
    rig.bodyGroup.position.y = -0.35;
    rig.bodyGroup.rotation.x = 0.95; // lean back baseball slide
    rig.bodyGroup.scale.set(1.06, 0.72, 1.06);
    rig.leftLeg.rotation.x = -0.4;
    rig.rightLeg.rotation.x = 0.2;
    rig.leftArm.rotation.x = 0.7;
    rig.rightArm.rotation.x = 0.5;
    rig.leftArm.rotation.z = 0.3;
    rig.rightArm.rotation.z = -0.3;
    rig.headGroup.rotation.y = 0;
  } else if (mode === 'STUMBLE') {
    rig.bodyGroup.position.y = -0.15;
    rig.bodyGroup.rotation.x = 0.45;
    rig.bodyGroup.scale.set(1.08, 0.92, 1.08);
    rig.leftArm.rotation.x = -0.8;
    rig.rightArm.rotation.x = -0.8;
    rig.leftArm.rotation.z = 0.6;
    rig.rightArm.rotation.z = -0.6;
  } else if (mode === 'VICTORY') {
    const hop = Math.abs(Math.sin(phase * 5.2)) * 0.25;
    rig.bodyGroup.position.y = hop;
    rig.bodyGroup.rotation.x = 0;
    rig.bodyGroup.scale.set(1, 1, 1);
    rig.leftLeg.rotation.x = Math.sin(phase * 5.2) * 0.22;
    rig.rightLeg.rotation.x = -Math.sin(phase * 5.2) * 0.22;
    rig.leftArm.rotation.x = -2.6;
    rig.rightArm.rotation.x = -2.6;
    rig.leftArm.rotation.z = 0.3 + Math.sin(phase * 8) * 0.15;
    rig.rightArm.rotation.z = -0.3 - Math.sin(phase * 8) * 0.15;
    rig.headGroup.rotation.y = Math.sin(phase * 2.5) * 0.18;
  }
}

export interface GuardianRig {
  root: THREE.Group;
  legs: THREE.Mesh[];
  jaw: THREE.Mesh;
}

/** Composite 9-part Stone Jaguar Temple Guardian Monster */
export function buildGuardianMonster(): GuardianRig {
  const root = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x2c332d,
    roughness: 0.82,
    metalness: 0.15,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2a5c34,
    roughness: 0.9,
    metalness: 0.05,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0xff6b00,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 2.0), stoneMat);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  root.add(torso);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 1.8), mossMat);
  spine.position.set(0, 1.55, 0.1);
  root.add(spine);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.74, 0.9), stoneMat);
  head.position.set(0, 1.48, -1.25);
  head.castShadow = true;
  root.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.72), stoneMat);
  jaw.position.set(0, 1.04, -1.32);
  root.add(jaw);

  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.1), eyeMat);
  leftEye.position.set(-0.24, 1.58, -1.7);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.24;
  root.add(leftEye, rightEye);

  const legs: THREE.Mesh[] = [];
  const legCoords: [number, number][] = [
    [-0.55, -0.75],
    [0.55, -0.75],
    [-0.55, 0.75],
    [0.55, 0.75],
  ];
  for (const [lx, lz] of legCoords) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.36), stoneMat);
    leg.position.set(lx, 0.48, lz);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
  }

  return { root, legs, jaw };
}

export interface ObstacleMeshBundle {
  group: THREE.Group;
  dynamicPart?: THREE.Object3D;
}

/** Build distinct composite 3D obstacles for every ObstacleKind */
export function buildObstacleModel(
  kind: ObstacleKind,
  textures: WorldTextureSet,
  theme: WorldTheme
): ObstacleMeshBundle {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.wallMap,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.12,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe6b84c,
    roughness: 0.24,
    metalness: 0.88,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    map: textures.barkMap,
    roughness: 0.88,
    metalness: 0.04,
  });

  if (kind === 'FALLEN_LOG') {
    // Jumpable low mossy trunk (height ~0.95m)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.35, 12), barkMat);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 0.44;
    trunk.castShadow = true;
    group.add(trunk);

    const stub1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.55, 8), barkMat);
    stub1.position.set(-0.65, 0.72, 0.12);
    stub1.rotation.z = 0.5;
    group.add(stub1);

    const mossCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.14, 0.5),
      new THREE.MeshStandardMaterial({ color: theme.foliageSecondary, roughness: 0.9 })
    );
    mossCap.position.set(0.15, 0.84, 0);
    group.add(mossCap);

    return { group };
  }

  if (kind === 'VINE_ARCH') {
    // Slide-under overhead stone lintel & hanging vines (bottom clearance ~1.05m)
    const pillarGeo = new THREE.BoxGeometry(0.42, 2.8, 0.46);
    const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
    leftPillar.position.set(-1.12, 1.4, 0);
    leftPillar.castShadow = true;
    const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
    rightPillar.position.set(1.12, 1.4, 0);
    rightPillar.castShadow = true;

    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.72, 0.62), stoneMat);
    beam.position.set(0, 1.62, 0);
    beam.castShadow = true;

    // Bright warning gold chevron trim so player immediately reads "SLIDE!"
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.68), goldMat);
    trim.position.set(0, 1.28, 0);

    const vineMat = new THREE.MeshStandardMaterial({ color: theme.foliagePrimary, roughness: 0.85 });
    for (let i = -2; i <= 2; i++) {
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.36, 6), vineMat);
      vine.position.set(i * 0.4, 1.15, 0.22);
      group.add(vine);
    }

    group.add(leftPillar, rightPillar, beam, trim);
    return { group };
  }

  if (kind === 'STONE_BARRIER') {
    // Tall carved totem monolith (dodge lane)
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.35, 1.0), stoneMat);
    base.position.y = 0.175;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.25, 0.82), stoneMat);
    body.position.y = 1.45;
    body.castShadow = true;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.24, 0.92), goldMat);
    crest.position.y = 2.62;
    const face = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.6,
        roughness: 0.25,
        metalness: 0.4,
      })
    );
    face.position.set(0, 1.65, 0.42);
    group.add(base, body, crest, face);
    return { group };
  }

  if (kind === 'MOVING_BARRIER') {
    // Sliding temple block with glowing bronze runners
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.0, 0.88), stoneMat);
    block.position.y = 1.05;
    block.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 0.94), goldMat);
    cap.position.y = 2.1;
    const baseGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.14, 0.95),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      })
    );
    baseGlow.position.y = 0.08;
    group.add(block, cap, baseGlow);
    return { group };
  }

  if (kind === 'FIRE_TRAP') {
    // Bronze fire grate + flickering multi-cone flame cluster (jump over or dodge)
    const grate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x3f2e24, roughness: 0.5, metalness: 0.7 })
    );
    grate.position.y = 0.11;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.08, 8, 16), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;

    const flameGroup = new THREE.Group();
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 1.15, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff5a1f,
        emissive: 0xff3b00,
        emissiveIntensity: 2.0,
        roughness: 0.3,
      })
    );
    outerFlame.position.y = 0.72;
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.82, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 2.6,
        roughness: 0.2,
      })
    );
    innerFlame.position.y = 0.62;
    flameGroup.add(outerFlame, innerFlame);

    group.add(grate, rim, flameGroup);
    return { group, dynamicPart: flameGroup };
  }

  if (kind === 'SWINGING_AXE') {
    // Full-width gantry with swinging double-bladed bronze pendulum
    const gantryL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 0.6), stoneMat);
    gantryL.position.set(-4.1, 2.6, 0);
    const gantryR = gantryL.clone();
    gantryR.position.x = 4.1;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.55, 0.65), stoneMat);
    topBar.position.set(0, 5.1, 0);
    group.add(gantryL, gantryR, topBar);

    const pivot = new THREE.Group();
    pivot.position.set(0, 4.9, 0);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.35, metalness: 0.85 })
    );
    rod.position.y = -1.8;
    pivot.add(rod);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.5);
    bladeShape.quadraticCurveTo(0.85, -0.35, 0.95, 0.35);
    bladeShape.quadraticCurveTo(0.35, 0.22, 0, 0.35);
    bladeShape.quadraticCurveTo(-0.35, 0.22, -0.95, 0.35);
    bladeShape.quadraticCurveTo(-0.85, -0.35, 0, -0.5);

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 2,
    });
    bladeGeo.center();
    const blade = new THREE.Mesh(bladeGeo, goldMat);
    blade.position.y = -3.65;
    blade.castShadow = true;
    pivot.add(blade);

    group.add(pivot);
    return { group, dynamicPart: pivot };
  }

  if (kind === 'ROLLING_BOULDER') {
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      new THREE.MeshStandardMaterial({
        map: textures.wallMap,
        color: 0x9ca3af,
        roughness: 0.85,
        metalness: 0.08,
      })
    );
    boulder.position.y = 0.98;
    boulder.castShadow = true;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 6, 16), goldMat);
    boulder.add(band);
    group.add(boulder);
    return { group, dynamicPart: boulder };
  }

  // GAP (broken chasm warning planks + dark abyss plane)
  const abyss = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 4.2),
    new THREE.MeshBasicMaterial({ color: 0x050c09 })
  );
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.y = 0.025;
  group.add(abyss);

  const waterMist = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 3.6),
    new THREE.MeshBasicMaterial({
      color: theme.id === 'volcano' ? 0xf97316 : 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    })
  );
  waterMist.rotation.x = -Math.PI / 2;
  waterMist.position.y = 0.035;
  group.add(waterMist);

  const edgeFront = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.18, 0.32), goldMat);
  edgeFront.position.set(0, 0.09, 2.1);
  const edgeBack = edgeFront.clone();
  edgeBack.position.z = -2.1;
  group.add(edgeFront, edgeBack);

  return { group };
}

/** Build glowing composite 3D Power-Up Collectible */
export function buildPowerUpModel(kind: PowerUpKind): THREE.Group {
  const group = new THREE.Group();
  const palette: Record<PowerUpKind, { core: number; emissive: number }> = {
    MAGNET: { core: 0xf43f5e, emissive: 0xbe123c },
    SHIELD: { core: 0x38bdf8, emissive: 0x0284c7 },
    SPEED_BOOST: { core: 0xfbbf24, emissive: 0xd97706 },
    DOUBLE_COINS: { core: 0x34d399, emissive: 0x059669 },
  };
  const col = palette[kind];

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color: col.core,
      emissive: col.emissive,
      emissiveIntensity: 1.4,
      roughness: 0.15,
      metalness: 0.6,
    })
  );
  core.position.y = 1.25;
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.055, 8, 22),
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xca8a04,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    })
  );
  ring.position.y = 1.25;
  group.add(ring);

  return group;
}

/** Build monumental Golden Temple Vault Portal at the finite level destination */
export function buildTemplePortal(theme: WorldTheme, textures: WorldTextureSet): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.wallMap,
    color: 0xffffff,
    roughness: 0.75,
    metalness: 0.15,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf3c64f,
    roughness: 0.22,
    metalness: 0.92,
  });

  // Grand stepped pyramid arch
  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(1.9, 7.2, 2.2), stoneMat);
  leftCol.position.set(-4.3, 3.6, 0);
  const rightCol = leftCol.clone();
  rightCol.position.x = 4.3;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.8, 2.5), stoneMat);
  lintel.position.set(0, 7.6, 0);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.2, 2.0), stoneMat);
  crown.position.set(0, 9.0, 0);

  const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 20), goldMat);
  sunDisc.rotation.x = Math.PI / 2;
  sunDisc.position.set(0, 7.7, 1.3);

  const doorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 6.7),
    new THREE.MeshBasicMaterial({
      color: theme.accentHex,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  doorGlow.position.set(0, 3.35, 0);

  // Torch braziers flanking entrance
  for (const sx of [-3.1, 3.1]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.6, 10), goldMat);
    bowl.position.set(sx, 1.6, 1.4);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb703 })
    );
    flame.position.set(sx, 2.25, 1.4);
    group.add(bowl, flame);
  }

  group.add(leftCol, rightCol, lintel, crown, sunDisc, doorGlow);
  return group;
}

export interface TreasureChestRig {
  root: THREE.Group;
  lidPivot: THREE.Group;
  padlock: THREE.Group;
  lightBeam: THREE.Mesh;
  innerGlowLight: THREE.PointLight;
  burstCoins: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; rot: THREE.Vector3 }>;
}

/** Build 10-part ornate 3D Treasure Chest with hinged lid, padlock, light shaft & coin fountain */
export function buildTreasureChest(
  theme: WorldTheme,
  textures: WorldTextureSet
): TreasureChestRig {
  const root = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.chestWoodMap,
    color: theme.id === 'ice' ? 0x67b7dc : theme.id === 'underwater' ? 0x2b7a78 : 0xffffff,
    roughness: 0.58,
    metalness: 0.14,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4c430,
    roughness: 0.2,
    metalness: 0.95,
  });
  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    emissive: 0x9f1239,
    emissiveIntensity: 0.9,
    roughness: 0.12,
    metalness: 0.3,
  });

  // Stone Altar Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.45, 0.45, 8),
    new THREE.MeshStandardMaterial({ map: textures.wallMap, roughness: 0.82 })
  );
  pedestal.position.y = 0.225;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  // Chest Base Box
  const chestGroup = new THREE.Group();
  chestGroup.position.y = 0.45;
  root.add(chestGroup);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 1.35), woodMat);
  base.position.y = 0.525;
  base.castShadow = true;
  chestGroup.add(base);

  // Forged Gold Straps & Corner Trim on Base
  for (const bx of [-0.95, 0, 0.95]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.09, 1.42), goldMat);
    strap.position.set(bx, 0.53, 0);
    chestGroup.add(strap);
  }
  const baseRim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.44), goldMat);
  baseRim.position.y = 1.02;
  chestGroup.add(baseRim);

  // Mound of shining gold coins inside chest
  const coinMound = new THREE.Mesh(
    new THREE.SphereGeometry(0.88, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    goldMat
  );
  coinMound.scale.set(1.05, 0.48, 0.62);
  coinMound.position.y = 0.88;
  chestGroup.add(coinMound);

  // Hinged Arched Lid (pivots along rear edge z = -0.68, y = 1.05)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.05, -0.68);
  chestGroup.add(lidPivot);

  const lidVault = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 2.22, 16, 1, false, 0, Math.PI),
    woodMat
  );
  lidVault.rotation.z = Math.PI / 2;
  lidVault.rotation.y = Math.PI;
  lidVault.position.set(0, 0, 0.68);
  lidVault.castShadow = true;
  lidPivot.add(lidVault);

  for (const lx of [-0.96, 0, 0.96]) {
    const archBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.695, 0.06, 8, 16, Math.PI),
      goldMat
    );
    archBand.rotation.y = Math.PI / 2;
    archBand.position.set(lx, 0, 0.68);
    lidPivot.add(archBand);
  }

  // Ornate Padlock on Front Center
  const padlock = new THREE.Group();
  padlock.position.set(0, 1.02, 0.75);
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.16), goldMat);
  const lockGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), rubyMat);
  lockGem.position.z = 0.1;
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 14, Math.PI), goldMat);
  shackle.position.y = 0.24;
  padlock.add(lockBody, lockGem, shackle);
  chestGroup.add(padlock);

  // Volumetric Golden Light Shaft (scales up when chest opens)
  const lightBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 0.65, 5.5, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  lightBeam.position.set(0, 3.6, 0);
  chestGroup.add(lightBeam);

  const innerGlowLight = new THREE.PointLight(0xffcf40, 0, 12);
  innerGlowLight.position.set(0, 1.6, 0.2);
  chestGroup.add(innerGlowLight);

  // Pooled burst coins & gems for chest opening fountain
  const burstCoins: TreasureChestRig['burstCoins'] = [];
  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12);
  coinGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 28; i++) {
    const isGem = i % 5 === 0;
    const mesh = new THREE.Mesh(
      isGem ? new THREE.OctahedronGeometry(0.18, 0) : coinGeo,
      isGem ? rubyMat : goldMat
    );
    mesh.position.set(0, 1.1, 0);
    mesh.visible = false;
    chestGroup.add(mesh);
    burstCoins.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 4.2,
        4.2 + Math.random() * 3.8,
        (Math.random() - 0.5) * 4.2
      ),
      rot: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    });
  }

  return { root, lidPivot, padlock, lightBeam, innerGlowLight, burstCoins };
}

export interface CompanionPetRig {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
}

/** Composite 6-part floating 3D Companion Pet that flies beside the adventurer */
export function buildCompanionPetModel(bodyColor: number, glowColor: number): CompanionPetRig {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.85,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), bodyMat);
  root.add(core);

  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 6), glowMat);
  crest.position.set(0, 0.28, -0.05);
  root.add(crest);

  const wingGeo = new THREE.BoxGeometry(0.42, 0.05, 0.24);
  const leftWing = new THREE.Mesh(wingGeo, glowMat);
  leftWing.position.set(-0.34, 0.04, 0.04);
  const rightWing = new THREE.Mesh(wingGeo, glowMat);
  rightWing.position.set(0.34, 0.04, 0.04);
  root.add(leftWing, rightWing);

  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lEye = new THREE.Mesh(eyeGeo, eyeMat);
  lEye.position.set(-0.1, 0.06, -0.24);
  const rEye = lEye.clone();
  rEye.position.x = 0.1;
  root.add(lEye, rEye);

  return { root, leftWing, rightWing };
}

