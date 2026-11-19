import assert from "node:assert/strict";
import { pose, THIGH, SHIN, UPPER, FORE } from "../src/lib/stickman.ts";
const stage = { px: 3.4, py: 0.4, ground: -3.6, startX: -7, standX: 0.4 };
const len = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
for (let u = 0; u <= 1; u += 0.01) {
  const p = pose(u, stage, u * 10);
  // limbs never stretch or shrink, whatever the animation does
  for (const [i, L] of [[1, [THIGH, SHIN]], [2, [THIGH, SHIN]], [3, [UPPER, FORE]], [4, [UPPER, FORE]]] as const) {
    const c = p.chains[i];
    assert.ok(Math.abs(len(c[0], c[1]) - L[0]) < 1e-9 && Math.abs(len(c[1], c[2]) - L[1]) < 1e-9, `limb ${i} length at u=${u}`);
  }
  assert.ok(p.scale >= 0 && p.scale <= 1 && p.open >= 0 && p.open <= 1);
}
// story beats: lands on the ground, stands left of the portal with it open, ends inside it
assert.equal(pose(0.13, stage, 0).y, stage.ground);
const hold = pose(0.5, stage, 0);
assert.equal(hold.x, stage.standX); assert.ok(hold.open > 0.99);
const gone = pose(0.92, stage, 0);
assert.ok(gone.scale < 0.01 && Math.abs(gone.x - stage.px) < 1e-9 && Math.abs(gone.y - stage.py) < 1e-9);
console.log("stickman ok");
