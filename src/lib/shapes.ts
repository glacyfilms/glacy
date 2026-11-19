/** Point-cloud targets for the morphing star field. Every shape has exactly n points,
 *  so the same particles can travel from any shape to any other. */
export type Shape = { pos: Float32Array; col: Float32Array };
type RGB = [number, number, number];

const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-6)) * Math.cos(2 * Math.PI * Math.random());
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
// star colour by temperature: hot blue-white to cool gold
const TEMPS = ["#9bb0ff", "#aabfff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffe8c6", "#ffd2a1", "#ffb56c"].map(hex);

function build(n: number, fill: (i: number, p: number[], c: number[]) => void): Shape {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const p = [0, 0, 0];
  const c = [1, 1, 1];
  for (let i = 0; i < n; i++) {
    fill(i, p, c);
    pos.set(p, i * 3);
    col.set(c, i * 3);
  }
  return { pos, col };
}

/** Two-armed spiral galaxy, tilted toward the viewer. */
export function galaxy(n: number, radius = 9): Shape {
  const tilt = 1.05;
  const [ct, st] = [Math.cos(tilt), Math.sin(tilt)];
  return build(n, (i, p, c) => {
    const bulge = i < n * 0.2;
    const r = bulge ? Math.abs(gauss()) * radius * 0.09 : radius * (0.1 + Math.pow(Math.random(), 1.3) * 0.9);
    const arm = (i % 2) * Math.PI;
    const a = bulge ? Math.random() * Math.PI * 2 : arm + Math.log(1 + r) * 2.4 + gauss() * (0.18 + r * 0.015);
    const x = Math.cos(a) * r;
    const y = gauss() * (bulge ? radius * 0.05 : 0.12);
    const z = Math.sin(a) * r;
    p[0] = x;
    p[1] = y * ct - z * st;
    p[2] = y * st + z * ct;
    const t = TEMPS[bulge ? 4 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 6)];
    const fade = bulge ? 0.85 : 0.75 * (1 - (r / radius) * 0.5);
    c[0] = t[0] * fade; c[1] = t[1] * fade; c[2] = t[2] * fade;
  });
}

/** Even sphere of stars (fibonacci lattice) with soft latitude bands. */
export function sphere(n: number, radius = 3.6, x = 0): Shape {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const ice = hex("#9fd8ff");
  return build(n, (i, p, c) => {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * ga;
    const rr = radius * (1 + gauss() * 0.012);
    p[0] = Math.cos(th) * r * rr + x;
    p[1] = y * rr;
    p[2] = Math.sin(th) * r * rr;
    const band = 0.55 + 0.45 * Math.abs(Math.sin(y * 9 + Math.cos(th) * 1.5));
    c[0] = ice[0] * band; c[1] = ice[1] * band; c[2] = ice[2] * band;
  });
}

/** Sample n points from RGBA pixels, denser where the image is bright, so a picture is drawn in stars.
 *  Brightness also pushes points toward the viewer, giving the image real depth. */
export function fromPixels(
  data: ArrayLike<number>,
  w: number,
  h: number,
  n: number,
  o: { height: number; x?: number; y?: number; depth?: number; color?: (u: number, v: number, lum: number) => RGB }
): Shape {
  const cum = new Float64Array(w * h);
  let total = 0;
  for (let k = 0; k < w * h; k++) {
    const a = data[k * 4 + 3] / 255;
    const lum = (0.2126 * data[k * 4] + 0.7152 * data[k * 4 + 1] + 0.0722 * data[k * 4 + 2]) / 255;
    total += a * (0.12 + lum);
    cum[k] = total;
  }
  const width = (o.height * w) / h;
  return build(n, (_, p, c) => {
    // weighted pick by binary search over the cumulative weights
    const target = Math.random() * total;
    let lo = 0;
    let hi = w * h - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % w;
    const py = (lo / w) | 0;
    const r = data[lo * 4] / 255;
    const g = data[lo * 4 + 1] / 255;
    const b = data[lo * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const u = (px + Math.random()) / w;
    const v = (py + Math.random()) / h;
    p[0] = (u - 0.5) * width + (o.x ?? 0);
    p[1] = (0.5 - v) * o.height + (o.y ?? 0);
    p[2] = (lum - 0.4) * (o.depth ?? 0) + gauss() * 0.04;
    const rgb = o.color ? o.color(u, v, lum) : ([r, g, b] as RGB);
    c[0] = rgb[0]; c[1] = rgb[1]; c[2] = rgb[2];
  });
}

/** Draw into an offscreen canvas and return its pixels (browser only). */
export function canvasPixels(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  draw(ctx);
  return ctx.getImageData(0, 0, w, h).data;
}
