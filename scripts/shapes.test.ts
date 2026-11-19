import assert from "node:assert/strict";
import { fromPixels, galaxy, portal, sphere } from "../src/lib/shapes.ts";
// 4x2 image: only the top-right pixel is opaque and bright
const w = 4, h = 2, data = new Uint8ClampedArray(w * h * 4);
data.set([255, 0, 0, 255], (0 * w + 3) * 4);
const s = fromPixels(data, w, h, 500, { height: 2 });
for (let i = 0; i < 500; i++) {
  const x = s.pos[i * 3], y = s.pos[i * 3 + 1];
  assert.ok(x >= 1 - 1e-9 && x <= 2 + 1e-9, `x in the top-right cell, got ${x}`);   // width 4 -> cell 3 spans 1..2
  assert.ok(y >= 0 - 1e-9 && y <= 1 + 1e-9, `y in the top row, got ${y}`);
  assert.equal(s.col[i * 3], 1); assert.equal(s.col[i * 3 + 1], 0);
}
for (const sh of [galaxy(1000), sphere(1000)]) {
  assert.equal(sh.pos.length, 3000); assert.ok(sh.pos.every(Number.isFinite)); assert.ok(sh.col.every((v) => v >= 0 && v <= 1.0001));
}
// portal: every star within 1.45x the ellipse around its centre, most of them on the rim
const pt = portal(4000, 2, 3, 1, -1, "#9fd8ff");
let rim = 0;
for (let i = 0; i < 4000; i++) {
  const r = Math.hypot((pt.pos[i * 3] - 1) / 2, (pt.pos[i * 3 + 1] + 1) / 3);
  assert.ok(r < 1.45, `portal star too far out: ${r}`);
  if (Math.abs(r - 1) < 0.1) rim++;
}
assert.ok(rim > 2000, `rim should hold most stars, got ${rim}`);
console.log("shapes ok");
