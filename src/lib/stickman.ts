/** The stickman's journey through one portal, as a pure function of u (0..1 across one video's stretch of scroll). */
export type Stage = { px: number; py: number; ground: number; startX: number; standX: number };
export type Pose = {
  x: number; y: number; scale: number; spin: number; alpha: number; open: number; flash: number;
  hipH: number; // local points are relative to the hip, so flips turn around the body, not the feet
  chains: [number, number][][]; // torso, legs, arms, as polylines in local units (hip at 0,0, facing +x)
  head: [number, number]; headR: number;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// angle measured from straight down, positive = forward
const limb = (o: [number, number], a: number, len: number): [number, number] => [o[0] + Math.sin(a) * len, o[1] - Math.cos(a) * len];

export const THIGH = 0.4, SHIN = 0.4, UPPER = 0.3, FORE = 0.28, TORSO = 0.5;

export function pose(u: number, s: Stage, time: number): Pose {
  let x = s.startX, y = s.ground, scale = 1, spin = 0, walk = 0, fall = 0, squash = 0, cast = 0, tuck = 0;

  if (u < 0.1) { // tumble in from above, one spin, land upright
    const e = u / 0.1;
    y = s.ground + 7 * (1 - e) * (1 - e);
    spin = -(1 - e) * (1 - e) * Math.PI * 2;
    fall = 1;
  } else if (u < 0.15) { // land
    squash = Math.sin(((u - 0.1) / 0.05) * Math.PI);
  } else if (u < 0.36) { // walk to the portal
    x = s.startX + (s.standX - s.startX) * inOut((u - 0.15) / 0.21);
    walk = 1;
  } else if (u < 0.62) { // open it
    x = s.standX;
    cast = smooth(0.36, 0.44, u) * (1 - smooth(0.54, 0.62, u));
  } else if (u < 0.68) { // crouch to jump
    x = s.standX;
    squash = Math.sin(((u - 0.62) / 0.06) * Math.PI * 0.5);
  } else { // leap: an arc with a front flip, diving into the centre of the portal
    const e = clamp((u - 0.68) / 0.22);
    x = s.standX + (s.px - s.standX) * e;
    y = s.ground + (s.py - s.ground) * e + 2.2 * 4 * e * (1 - e);
    spin = e * Math.PI * 2;
    tuck = Math.sin(e * Math.PI);
    scale = 1 - smooth(0.78, 1, e); // shrinks as he passes through the surface
  }

  const phase = x * 5.5;
  const sw = walk * Math.sin(phase);
  const breathe = Math.sin(time * 2) * 0.012;
  const bob = walk * Math.abs(Math.cos(phase)) * 0.05;
  const crouch = squash * 0.14;

  const hip: [number, number] = [0, THIGH + SHIN - crouch + bob];
  const neck: [number, number] = [walk * 0.05, hip[1] + TORSO + breathe];
  const shoulder: [number, number] = [neck[0], neck[1] - 0.05];

  // tuck: knees to chest mid-flip
  const legA = fall ? 0.35 : 0.55 * sw + squash * 0.5 + tuck * 1.5;
  const legB = fall ? -0.25 : -0.55 * sw + squash * 0.5 + tuck * 1.3;
  const bendA = fall ? 0.6 : walk * 0.7 * Math.max(0, Math.sin(phase - 1.3)) + squash * 1.0 + tuck * 2.0;
  const bendB = fall ? 0.4 : walk * 0.7 * Math.max(0, Math.sin(phase + Math.PI - 1.3)) + squash * 1.0 + tuck * 2.0;
  const flail = Math.sin(time * 14) * 0.25;
  // front arm swings, or reaches up toward the portal while casting
  const armF = fall ? 2.6 + flail : (1 - cast) * (-0.45 * sw + 0.1) + cast * 2.25 + tuck * 1.2 - squash * 0.6;
  const armB = fall ? -2.6 - flail : 0.45 * sw - 0.1 - cast * 0.35 + tuck * 1.0 - squash * 0.8;
  const elbowF = (1 - cast) * 0.45;

  const kneeA = limb(hip, legA, THIGH);
  const kneeB = limb(hip, legB, THIGH);
  const elbF = limb(shoulder, armF, UPPER);
  const elbB = limb(shoulder, armB, UPPER);

  const chains: [number, number][][] = [
    [hip, neck],
    [hip, kneeA, limb(kneeA, legA - bendA, SHIN)],
    [hip, kneeB, limb(kneeB, legB - bendB, SHIN)],
    [shoulder, elbF, limb(elbF, armF + elbowF, FORE)],
    [shoulder, elbB, limb(elbB, armB + 0.35, FORE)],
  ];
  const h = hip[1];
  return {
    x, y, scale, spin,
    alpha: u < 0.91 ? 1 : 0,
    open: smooth(0.36, 0.5, u) * (1 - smooth(0.9, 0.98, u)),
    flash: smooth(0.82, 0.9, u) * (1 - smooth(0.9, 0.97, u)), // the portal flares as he goes through
    hipH: h,
    chains: chains.map((c) => c.map(([a, b]) => [a, b - h] as [number, number])),
    head: [neck[0] + 0.02, neck[1] + 0.19 - h],
    headR: 0.15,
  };
}
