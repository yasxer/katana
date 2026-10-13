import * as THREE from 'three';
import type { KatanaScene } from './createScene';
import { BLADE_LEN, DRAW_DISTANCE, SORI_RADIUS, TOTAL_LEN } from './katana';

/** Where the scabbard is, relative to the sword. */
export interface SayaState {
  /** 0 = sheathed, 1 = slid fully off the blade along its curve (may exceed 1 to keep sliding) */
  draw: number;
  /** 0 = riding the blade's curve, 1 = floating at its own position */
  parted: number;
  /** its own position once parted, in sword-local units */
  freeX: number;
  freeY: number;
  /** tumble in the plane of the screen */
  spin: number;
  /** extra roll around its own axis on top of the sword's */
  rollOffset: number;
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const qRoll = new THREE.Quaternion();
const qTilt = new THREE.Quaternion();
const qSpin = new THREE.Quaternion();
const centre = new THREE.Vector3();
const offset = new THREE.Vector3();
/** Mid-point of the scabbard in its own frame: what it tumbles around. */
const SAYA_CENTRE = -(BLADE_LEN + 0.4) / 2;

const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * Scabbard transform in the sword's (un-rolled) frame.
 *
 * Drawing slides it along the arc of the blade: a rotation about the centre
 * of the curve, carried around with the sword's roll, so it stays wrapped
 * around the steel until the tip is out. Parting then moves it to its own
 * spot: it drops (and tumbles about its own middle) while still clear of the
 * tip, and only then drifts across. Played backwards it lines up with the
 * blade before sliding back on.
 */
export function placeSaya(target: THREE.Object3D, roll: number, s: SayaState) {
  const angle = -(s.draw * DRAW_DISTANCE) / SORI_RADIUS;
  const arcX = SORI_RADIUS * Math.sin(angle);
  const arcY = SORI_RADIUS * (1 - Math.cos(angle));
  const down = 1 - Math.pow(1 - ramp(s.parted, 0, 0.8), 2);
  const across = smooth(ramp(s.parted, 0.45, 1));

  qRoll.setFromAxisAngle(X, roll + s.rollOffset);
  qTilt.setFromAxisAngle(Z, angle * (1 - down));
  qSpin.setFromAxisAngle(Z, s.spin);
  target.quaternion.copy(qSpin).multiply(qRoll).multiply(qTilt);

  // where its middle sits while riding the arc…
  qRoll.setFromAxisAngle(X, roll);
  qTilt.setFromAxisAngle(Z, angle);
  centre.set(SAYA_CENTRE, 0, 0).applyQuaternion(qTilt).add(offset.set(arcX, arcY, 0)).applyQuaternion(qRoll);
  // …blended towards its own spot, then back from the middle to the mouth
  centre.set(
    centre.x + (s.freeX + SAYA_CENTRE - centre.x) * across,
    centre.y + (s.freeY - centre.y) * down,
    centre.z * (1 - down)
  );
  target.position.copy(offset.set(SAYA_CENTRE, 0, 0).applyQuaternion(target.quaternion).negate().add(centre));
}

export interface KatanaPlacement {
  /** length of the katana as a fraction of the viewport width */
  len: number;
  /** guard position as fractions of the viewport (0 = centre, ±0.5 = edges) */
  x: number;
  y: number;
  /** yaw and on-screen tilt of the whole katana */
  ry: number;
  rz: number;
  /** roll of the sword around its own axis */
  roll: number;
  saya: SayaState;
}

/** Applies a placement to the scene and returns the world scale it used. */
export function placeKatana(scene: KatanaScene, p: KatanaPlacement) {
  const { katana, view } = scene;
  const scale = (p.len * view.w) / TOTAL_LEN;
  katana.root.scale.setScalar(scale);
  katana.root.position.set(p.x * view.w, p.y * view.h, 0);
  katana.root.rotation.set(0, p.ry, p.rz);
  katana.sword.rotation.x = p.roll;
  placeSaya(katana.saya, p.roll, p.saya);
  return scale;
}

const glowAnchor = new THREE.Vector3();

/** Keeps the red light and the lacquer's inner fire breathing next to the scabbard. */
export function animateGlow(scene: KatanaScene, scale: number, time: number) {
  const { katana, redGlow } = scene;
  katana.saya.getWorldPosition(glowAnchor);
  redGlow.position.set(glowAnchor.x - 1.2 * scale, glowAnchor.y + 0.5 * scale, 1.6 * scale);
  redGlow.intensity = 7 * scale * scale * (0.85 + Math.sin(time * 0.004) * 0.15);
  redGlow.distance = 9 * scale;
  katana.lacquer.emissiveIntensity = 1.5 + Math.sin(time * 0.003) * 0.35;
}
