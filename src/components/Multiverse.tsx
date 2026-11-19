"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { CHANNEL_URL, INSTAGRAM_URL, SUBSCRIBE_URL, type Video } from "@/lib/youtube";
import { Line } from "@react-three/drei";
import type { Line2, LineSegments2 } from "three-stdlib";
type FatLine = Line2 | LineSegments2;
import { canvasPixels, fromPixels, galaxy, portal, sphere, type Shape } from "@/lib/shapes";
import { pose, type Stage } from "@/lib/stickman";

type Scene =
  | { kind: "intro" | "name" | "about" | "connect" | "outro"; id?: string; label: string }
  | { kind: "video"; v: Video; n: number; id?: string; label: string };

// linger on each shape, rush between them
const easeSeg = (seg: number) => {
  const i = Math.floor(seg);
  const t = seg - i;
  return i + (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
};

const shared = { progress: 0, seg: 0, pointer: { x: 0, y: 0 }, hover: false, mode: 0, t: 0 };

// transition styles, one per scroll step (see the shader)
const VORTEX = 0, SHATTER = 1, FLIP = 2, WAVE = 3, RAIN = 4, WARP = 5, COLLAPSE = 6;
// which transition each step uses, picked by what it goes from/to; portal to portal collapses into the next
const modeFor = (from: string, to: string, last: boolean) =>
  last ? WARP : from === "intro" ? VORTEX : from === "name" ? SHATTER : from === "video" && to === "video" ? COLLAPSE : to === "about" ? VORTEX : to === "connect" ? FLIP : RAIN;
void WAVE;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const PASSIONS = ["Video editing", "Football", "Content creation", "Vlogging", "Creative experiments"];

/** One cloud of stars. Each scroll step it flows to the next shape with its own transition. */
function Morph({ shapes, centers, kinds, radius, count, children }: {
  shapes: React.RefObject<Shape[]>;
  centers: React.RefObject<[number, number][]>;
  kinds: string[];
  radius: React.RefObject<[number, number]>;
  count: number;
  children?: React.ReactNode;
}) {
  const { camera, viewport } = useThree();
  const group = useRef<THREE.Group>(null);
  const shown = useRef({ i: -1, version: -1 });
  const ray = useMemo(() => ({ v: new THREE.Vector3(), dir: new THREE.Vector3() }), []);

  const [geometry, material] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aTo", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aColTo", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) rnd[i] = Math.random();
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uT: { value: 0 },
        uMode: { value: 0 },
        uTime: { value: 0 },
        uPixel: { value: 1 },
        uMouse: { value: new THREE.Vector3(99, 99, 0) },
        uC0: { value: new THREE.Vector2() }, // centre of the shape we leave
        uC1: { value: new THREE.Vector2() }, // centre of the shape we arrive at
        uSpinA: { value: 0 }, // 1 when the shape we leave is a portal (it swirls)
        uSpinB: { value: 0 },
        uRad: { value: new THREE.Vector2(2, 3) }, // portal radii
      },
      vertexShader: /* glsl */ `
        uniform float uT, uMode, uTime, uPixel, uSpinA, uSpinB; uniform vec3 uMouse; uniform vec2 uC0, uC1, uRad;
        attribute vec3 aTo, aColTo; attribute float aRand;
        varying vec3 vColor; varying float vA;
        const float PI = 3.14159265;
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
        float inOut(float x) { return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0; }
        float backOut(float x) { float c = 1.9; return 1.0 + (c + 1.0) * pow(x - 1.0, 3.0) + c * pow(x - 1.0, 2.0); }
        float h1(float n) { return fract(sin(n) * 43758.5453); }
        // portals swirl: rotate in the portal's own circle space so the ellipse keeps its shape
        vec2 swirl(vec2 q, vec2 c, float on) {
          if (on < 0.5) return q;
          vec2 d = (q - c) / uRad;
          d = rot(uTime * (0.25 + aRand * 0.3) / (0.35 + length(d))) * d;
          return c + d * uRad;
        }

        void main() {
          vec3 A = position, B = aTo;
          A.xy = swirl(A.xy, uC0, uSpinA);
          B.xy = swirl(B.xy, uC1, uSpinB);
          int m = int(uMode + 0.5);
          vec2 c = mix(uC0, uC1, inOut(clamp(uT, 0.0, 1.0)));
          // when each star leaves: random for organic modes, left-to-right sweeps for wipes
          float sweep = clamp(mix(A.x, B.x, 0.5) / 18.0 + 0.5, 0.0, 1.0);
          float delay = (m == FLIP_ || m == WAVE_) ? sweep * 0.45 + aRand * 0.05
                      : (m == RAIN_) ? clamp(A.x / 18.0 + 0.5, 0.0, 1.0) * 0.3 + aRand * 0.12
                      : aRand * 0.3;
          float span = 1.0 - ((m == FLIP_ || m == WAVE_) ? 0.5 : (m == RAIN_) ? 0.42 : 0.3);
          float t = clamp((uT - delay) / span, 0.0, 1.0);
          float e = inOut(t);
          float k = sin(t * PI);               // 0 at rest, 1 mid-flight
          float fade = 1.0;
          vec3 p;

          if (m == VORTEX_) {
            // spiral down the drain into the next shape
            p = mix(A, B, e);
            p.xz = rot(k * (1.6 + aRand * 2.0)) * (p.xz - vec2(c.x, 0.0)) + vec2(c.x, 0.0);
            p += k * 1.8 * vec3(sin(p.y * 0.7 + uTime * 0.7 + aRand * 6.28), cos(p.x * 0.6 - uTime * 0.5 + aRand * 12.0), sin(p.x * 0.4 + aRand * 20.0));
          } else if (m == SHATTER_) {
            // burst outward like glass, hang, then snap into the new shape with overshoot
            vec3 dir = normalize(vec3(A.xy - uC0, 0.0) + vec3(h1(aRand * 91.0) - 0.5, h1(aRand * 37.0) - 0.5, h1(aRand * 13.0) - 0.5) * 2.5 + 1e-3);
            vec3 far = A + dir * (2.0 + aRand * 4.5);
            far.xy = rot((aRand - 0.5) * 1.2) * (far.xy - uC0) + uC0;
            p = t < 0.4 ? mix(A, far, 1.0 - pow(1.0 - t / 0.4, 3.0)) : mix(far, B, backOut((t - 0.4) / 0.6));
          } else if (m == FLIP_) {
            // a full card spin that ripples across the image
            p = mix(A, B, e);
            p.xz = rot(e * 2.0 * PI) * (p.xz - vec2(c.x, 0.0)) + vec2(c.x, 0.0);
            p.z += k * 1.5;
          } else if (m == WAVE_) {
            // a crest sweeps across and rebuilds the picture behind it
            p = mix(A, B, e);
            p.y += k * (2.4 + aRand * 1.2);
            p.z += k * (3.0 + aRand * 2.0);
          } else if (m == RAIN_) {
            // the picture falls away like a curtain, the next one drops in from above
            if (t < 0.5) { float s = t / 0.5; p = A + vec3(sin(aRand * 40.0) * 0.4 * s, -16.0 * s * s, 0.0); fade = 1.0 - s * s; }
            else { float s = (t - 0.5) / 0.5; float r = 1.0 - s; p = B + vec3(0.0, 16.0 * r * r * r, 0.0); fade = 1.0 - r * r; }
          } else if (m == WARP_) {
            // stars stream past the camera; the next shape arrives from deep space
            if (t < 0.5) { float s = t / 0.5; p = A; p.xy = mix(p.xy, p.xy * 2.2, s * s); p.z += s * s * 24.0; fade = 1.0 - s; }
            else { float s = (t - 0.5) / 0.5; float r = 1.0 - s; p = B; p.z -= r * r * 70.0; fade = s; }
          } else {
            // collapse into a single point of light, then bloom out
            vec3 core = vec3(c, 0.0);
            if (t < 0.5) { float s = pow(t / 0.5, 2.0); p = mix(A, core, s); p.xz = rot(s * 5.0) * (p.xz - core.xz) + core.xz; }
            else { float s = (t - 0.5) / 0.5; p = mix(core, B, backOut(s)); p.xz = rot((1.0 - s) * -3.0) * (p.xz - core.xz) + core.xz; }
          }

          // shapes breathe a little even when you stop scrolling
          p += 0.035 * vec3(sin(uTime * 0.9 + aRand * 50.0), cos(uTime * 1.1 + aRand * 30.0), sin(uTime * 0.7 + aRand * 10.0));
          // stars part around the cursor
          vec2 d = p.xy - uMouse.xy;
          float push = 0.5 * exp(-dot(d, d) * 2.4);
          p.xy += normalize(d + 1e-4) * push;
          p.z += push * 0.8;

          vColor = mix(color, aColTo, smoothstep(0.25, 0.75, t)) * (1.35 + push * 1.5 + k * 0.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min((1.2 + aRand * 1.6) * (1.0 + k * 1.2) * uPixel * (17.0 / max(-mv.z, 0.5)), 28.0);
          vA = (0.62 + k * 0.25) * fade;
        }`
          .replace(/VORTEX_/g, String(VORTEX)).replace(/SHATTER_/g, String(SHATTER)).replace(/FLIP_/g, String(FLIP))
          .replace(/WAVE_/g, String(WAVE)).replace(/RAIN_/g, String(RAIN)).replace(/WARP_/g, String(WARP)),
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vColor, vA * smoothstep(0.5, 0.05, d));
        }`,
    });
    return [g, m];
  }, [count]);

  useFrame((state, dt) => {
    const list = shapes.current;
    if (!list?.length) return;
    const seg = easeSeg(shared.progress * (list.length - 1));
    const i = Math.min(Math.floor(seg), list.length - 2);
    // swap the from/to buffers only when crossing into a new step (or a thumbnail finished loading)
    const version = (list as Shape[] & { version?: number }).version ?? 0;
    if (i !== shown.current.i || version !== shown.current.version) {
      const a = geometry.attributes;
      (a.position.array as Float32Array).set(list[i].pos);
      (a.color.array as Float32Array).set(list[i].col);
      (a.aTo.array as Float32Array).set(list[i + 1].pos);
      (a.aColTo.array as Float32Array).set(list[i + 1].col);
      a.position.needsUpdate = a.color.needsUpdate = a.aTo.needsUpdate = a.aColTo.needsUpdate = true;
      shown.current = { i, version };
    }
    material.uniforms.uT.value = seg - i;
    material.uniforms.uMode.value = modeFor(kinds[i], kinds[i + 1], i === list.length - 2);
    material.uniforms.uSpinA.value = kinds[i] === "video" ? 1 : 0;
    material.uniforms.uSpinB.value = kinds[i + 1] === "video" ? 1 : 0;
    if (radius.current) (material.uniforms.uRad.value as THREE.Vector2).set(...radius.current);
    shared.seg = seg;
    const cs = centers.current;
    if (cs?.[i + 1]) {
      (material.uniforms.uC0.value as THREE.Vector2).set(...cs[i]);
      (material.uniforms.uC1.value as THREE.Vector2).set(...cs[i + 1]);
    }
    shared.mode = material.uniforms.uMode.value;
    shared.t = seg - i;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixel.value = state.gl.getPixelRatio();

    // cursor -> point on the z=0 plane in the cloud's space
    ray.v.set(shared.pointer.x, shared.pointer.y, 0.5).unproject(camera);
    ray.dir.copy(ray.v).sub(camera.position).normalize();
    const s = -camera.position.z / ray.dir.z;
    const mouse = material.uniforms.uMouse.value as THREE.Vector3;
    const sc = group.current?.scale.x ?? 1;
    // no cursor yet (or touch): park the push far away instead of punching a hole in the middle
    if (shared.hover) ray.v.set(camera.position.x + ray.dir.x * s, camera.position.y + ray.dir.y * s, 0).divideScalar(sc);
    else ray.v.set(99, 99, 0);
    mouse.lerp(ray.v, 1 - Math.exp(-dt * 10));

    if (group.current) {
      const g = group.current;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, shared.pointer.x * 0.22 + Math.sin(state.clock.elapsedTime * 0.12) * 0.08, 3, dt);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -shared.pointer.y * 0.12, 3, dt);
      // phones: shrink so wide shapes (the wordmark) still fit
      g.scale.setScalar(Math.min(1, viewport.width / 16));
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      {children}
    </group>
  );
}

type Layout = Stage & { rx: number; ry: number; man: number; halfW: number };
const PORTAL_TINTS = ["#9fd8ff", "#c9a7ff", "#ffb08a", "#8fe3ff", "#ff9fb8", "#ffd27a"];

/** The latest videos as a walk: a stickman drops in, walks the glowing ground, opens a portal
 *  (the star ring + the real thumbnail swirling open inside it), steps in, and lands at the next one. */
function Journey({ layout, videos, first, onPlay }: { layout: React.RefObject<Layout | null>; videos: Video[]; first: number; onPlay: (v: Video) => void }) {
  const portalRef = useRef<THREE.Mesh>(null);
  const man = useRef<THREE.Group>(null);
  const limbs = useRef<(FatLine | null)[]>([]);
  const groundLine = useRef<FatLine | null>(null);
  const active = useRef(-1);

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    return videos.map((v) => {
      const t = loader.load(v.thumb);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [videos]);

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uMap: { value: null }, uOpen: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 0.66 }, uTint: { value: new THREE.Color("#9fd8ff") } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform float uOpen, uTime, uAspect; uniform vec3 uTint; varying vec2 vUv;
          mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
          void main() {
            vec2 q = (vUv - 0.5) * 2.0;                    // 1.0 = the portal rim
            float r = length(q);
            float edge = uOpen * 0.96;
            // the picture spirals open: heavy twist while opening, a slow living swirl once open
            float twist = (1.0 - uOpen) * 7.0 * (1.0 - r) + 0.25 * sin(uTime * 0.7) * (1.0 - r);
            vec2 w = rot(twist) * q;
            // object-fit: cover for a square thumbnail inside an ellipse of this aspect
            vec2 uv = 0.5 + vec2(w.x * 0.5 * uAspect, w.y * 0.5);
            vec3 img = texture2D(uMap, uv).rgb;
            float inside = smoothstep(edge, edge - 0.06, r);
            float rim = exp(-abs(r - edge) * 28.0) * uOpen;
            vec3 col = img * (0.75 + 0.35 * smoothstep(0.9, 0.2, r)) + uTint * rim * 0.9;
            gl_FragColor = vec4(col, clamp(inside * uOpen + rim * 0.6, 0.0, 1.0));
            #include <colorspace_fragment>
          }`,
      }),
    []
  );

  const dust = useMemo(() => {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([Math.random() * 30 - 15, Math.random(), Math.random() * 5 - 3.5], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTravel: { value: 0 }, uGround: { value: -3.6 }, uVis: { value: 0 }, uPixel: { value: 1 }, uHalf: { value: 15 } },
      vertexShader: /* glsl */ `
        uniform float uTravel, uGround, uVis, uPixel, uHalf; varying float vA;
        void main() {
          vec3 p = position;
          // the ground slides past as you travel, wrapping around
          p.x = mod(p.x - uTravel + uHalf, uHalf * 2.0) - uHalf;
          p.y = uGround - 0.02 + pow(p.y, 3.0) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPixel * (1.0 + position.y * 2.0) * (16.0 / -mv.z);
          vA = uVis * (1.0 - abs(p.x) / uHalf) * (0.35 + 0.65 * (1.0 - position.y));
        }`,
      fragmentShader: /* glsl */ `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.75, 0.88, 1.0, vA * smoothstep(0.5, 0.0, d)); }`,
    });
    return { g, m };
  }, []);

  useFrame((state) => {
    const L = layout.current;
    if (!L) return;
    const seg = shared.seg;
    const time = state.clock.elapsedTime;
    const lastV = first + videos.length - 1;
    const vis = THREE.MathUtils.smoothstep(seg, first - 0.75, first - 0.4) * (1 - THREE.MathUtils.smoothstep(seg, lastV + 0.6, lastV + 0.95));

    dust.m.uniforms.uTravel.value = seg * 7;
    dust.m.uniforms.uGround.value = L.ground;
    dust.m.uniforms.uVis.value = vis;
    dust.m.uniforms.uHalf.value = L.halfW;
    dust.m.uniforms.uPixel.value = state.gl.getPixelRatio();
    if (groundLine.current) {
      groundLine.current.position.y = L.ground;
      (groundLine.current.material as THREE.Material & { opacity: number }).opacity = vis * 0.45;
    }

    const n = Math.round(seg - first);
    const here = n >= 0 && n < videos.length && Math.abs(seg - (first + n)) <= 0.5;
    const u = here ? seg - (first + n - 0.5) : -1;
    const P = pose(Math.max(u, 0), L, time);

    // portal surface
    if (here && n !== active.current) {
      active.current = n;
      surface.uniforms.uMap.value = textures[n];
      (surface.uniforms.uTint.value as THREE.Color).set(PORTAL_TINTS[n % PORTAL_TINTS.length]);
    }
    surface.uniforms.uOpen.value = here ? P.open : 0;
    surface.uniforms.uTime.value = time;
    surface.uniforms.uAspect.value = L.rx / L.ry;
    if (portalRef.current) {
      portalRef.current.visible = here && P.open > 0.001;
      portalRef.current.position.set(L.px, L.py, 0.05);
      portalRef.current.scale.set(L.rx * 2, L.ry * 2, 1);
    }

    // stickman
    if (man.current) {
      man.current.visible = here && P.alpha > 0;
      man.current.position.set(P.x, P.y, 0.4);
      man.current.scale.setScalar(L.man * P.scale);
      man.current.rotation.z = -P.spin;
    }
    P.chains.forEach((c, k) => limbs.current[k]?.geometry.setPositions(c.flatMap(([x, y]) => [x, y, 0])));
    const head: number[] = [];
    for (let a = 0; a <= 20; a++) head.push(P.head[0] + Math.cos((a / 20) * Math.PI * 2) * P.headR, P.head[1] + Math.sin((a / 20) * Math.PI * 2) * P.headR, 0);
    limbs.current[5]?.geometry.setPositions(head);
  });

  const glow = { color: "#e6f6ff", lineWidth: 2.6, toneMapped: false, transparent: true } as const;
  return (
    <>
      <points geometry={dust.g} material={dust.m} frustumCulled={false} />
      <Line ref={groundLine} points={[[-40, 0, 0], [40, 0, 0]]} color="#9fd8ff" lineWidth={1} transparent opacity={0} toneMapped={false} />
      <mesh
        ref={portalRef}
        material={surface}
        renderOrder={5} // over the star cloud, so the thumbnail isn't buried under the swirl
        visible={false}
        onClick={(e) => {
          if (active.current < 0 || (surface.uniforms.uOpen.value as number) < 0.6) return;
          e.stopPropagation();
          onPlay(videos[active.current]);
        }}
        onPointerOver={() => { if ((surface.uniforms.uOpen.value as number) > 0.6) document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={man} visible={false}>
        {[2, 3, 3, 3, 3, 21].map((pts, k) => (
          <Line key={k} ref={(l) => { limbs.current[k] = l; }} points={Array.from({ length: pts }, () => [0, 0, 0] as [number, number, number])} {...glow} />
        ))}
      </group>
    </>
  );
}

/** Deep sky: faint milky band and nebula wisps, always infinitely far away. */
function Sky() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          float n(vec3 p) {
            vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
          }
          float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
          void main() {
            vec3 d = normalize(vDir);
            float band = exp(-pow((d.y + 0.25 * d.x) * 3.2, 2.0));
            float cloud = fbm(d * 3.0);
            vec3 col = mix(vec3(0.02, 0.03, 0.07), vec3(0.16, 0.12, 0.2), cloud) * (0.35 + band * 1.1);
            col += vec3(0.12, 0.22, 0.45) * pow(fbm(d * 2.0 + 9.0), 4.0) * 0.8;
            col += vec3(0.4, 0.08, 0.18) * pow(fbm(d * 2.5 - 3.0), 5.0) * 0.6;
            gl_FragColor = vec4(col * 0.12, 1.0);
          }`,
      }),
    []
  );
  useFrame((s) => ref.current?.position.copy(s.camera.position));
  return (
    <mesh ref={ref} material={material} renderOrder={-1}>
      <sphereGeometry args={[80, 48, 32]} />
    </mesh>
  );
}

function Camera() {
  useFrame((state, dt) => {
    const c = state.camera;
    const k = Math.sin(Math.min(Math.max(shared.t, 0), 1) * Math.PI); // 0 at rest, 1 mid-transition
    const m = shared.mode;
    const z = 16 + (m === SHATTER ? 4 : m === WARP ? -5 : m === COLLAPSE ? -3 : 0) * k;
    const x = shared.pointer.x * 0.6 + (m === FLIP ? 3.5 * k : 0);
    const y = shared.pointer.y * 0.4 + (m === WAVE ? -1.2 * k : m === RAIN ? 1.5 * k : 0);
    c.position.x = THREE.MathUtils.damp(c.position.x, x, 3, dt);
    c.position.y = THREE.MathUtils.damp(c.position.y, y, 3, dt);
    c.position.z = THREE.MathUtils.damp(c.position.z, z, 3, dt);
    c.lookAt(0, 0, 0);
    c.rotateZ((m === VORTEX ? 0.22 : m === COLLAPSE ? -0.15 : 0) * k); // roll with the spin
  });
  return null;
}

/** The whole site as one scroll: a single star field that becomes a galaxy, the wordmark,
 *  each latest Short (drawn in stars from the real thumbnail), a sphere, the YouTube logo, and back. */
export default function Multiverse({ videos, onPlay }: { videos: Video[]; onPlay: (v: Video) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const [inView, setInView] = useState(true);
  const shapes = useRef<Shape[]>([]);
  const centers = useRef<[number, number][]>([]);
  const layout = useRef<Layout | null>(null);
  const radius = useRef<[number, number]>([2, 3]);
  const shorts = useMemo(() => videos.slice(0, 6), [videos]);

  const scenes: Scene[] = useMemo(
    () => [
      { kind: "intro", label: "Intro" },
      { kind: "name", label: "GLACY" },
      ...shorts.map((v, n) => ({ kind: "video" as const, v, n, id: n === 0 ? "work" : undefined, label: v.title })),
      { kind: "about", id: "about", label: "About" },
      { kind: "connect", id: "connect", label: "Connect" },
      { kind: "outro", label: "Thank you" },
    ],
    [shorts]
  );
  const last = scenes.length - 1;

  const { count, wide } = useMemo(() => {
    const small = typeof window !== "undefined" && (matchMedia("(max-width: 768px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4);
    return { count: small ? 32000 : 72000, wide: typeof window === "undefined" || window.innerWidth > window.innerHeight };
  }, []);

  // build every target shape; thumbnails and text arrive async and replace placeholders
  useEffect(() => {
    let alive = true;
    const side = wide ? 3.4 : 0; // on desktop the subject sits right of the copy
    // phones: the cloud is scaled down so GLACY fits (see Morph), so size the other shapes
    // in screen terms instead and lift them into the top half, above the copy
    const visH = 2 * 16 * Math.tan((20 * Math.PI) / 180); // camera z=16, fov 40
    const k = Math.min(1, (visH * window.innerWidth) / window.innerHeight / 16);
    const lift = wide ? 0 : (visH * 0.22) / k;
    const size = (desktop: number, phoneShareOfHeight: number) => (wide ? desktop : (visH * phoneShareOfHeight) / k);
    const base = galaxy(count);
    const list: Shape[] & { version?: number } = scenes.map(() => base);
    list.version = 0;
    const bump = () => { if (alive) list.version = (list.version ?? 0) + 1; };
    shapes.current = list;
    // where each scene's shape sits, so spins and collapses pivot on the shape, not the screen
    const vy = wide ? 0 : (visH * 0.17) / k;
    centers.current = scenes.map((s) =>
      s.kind === "video" ? [side, vy] : s.kind === "about" || s.kind === "connect" ? [side, lift] : s.kind === "name" ? [0, 0.3] : [0, 0]
    );

    list[last] = galaxy(count, 11);
    list[scenes.findIndex((s) => s.kind === "about")] = sphere(count, size(3.4, 0.15), side, lift);

    const yt = canvasPixels(300, 210, (ctx) => {
      ctx.fillStyle = "#ff1f3d";
      ctx.beginPath();
      ctx.roundRect(0, 0, 300, 210, 60);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(118, 62); ctx.lineTo(118, 148); ctx.lineTo(196, 105); ctx.closePath();
      ctx.fill();
    });
    list[scenes.findIndex((s) => s.kind === "connect")] = fromPixels(yt, 300, 210, count, { height: size(4.6, 0.17), x: side, y: lift, depth: 0.6 });

    document.fonts.load('700 260px "Space Grotesk Variable"').finally(() => {
      if (!alive) return;
      const W = 1200, H = 300;
      const px = canvasPixels(W, H, (ctx) => {
        ctx.fillStyle = "#fff";
        ctx.font = '700 260px "Space Grotesk Variable", system-ui, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GLACY", W / 2, H / 2 + 10);
      });
      // white melting into ice blue across the word
      const word = fromPixels(px, W, H, count, { height: 3.6, y: 0.3, depth: 0.5, color: (u) => [1 - u * 0.35, 1 - u * 0.12, 1] });
      list[1] = word;
      bump();
    });

    // the latest videos are portals; the stickman walks the ground beneath them
    const rx = size(2.1, 0.11), ry = size(3.1, 0.165);
    const py = wide ? 0.5 : (visH * 0.2) / k;
    const halfW = (visH * window.innerWidth) / window.innerHeight / 2 / k;
    const ground = wide ? -3.7 : py - ry - (visH * 0.06) / k;
    layout.current = {
      px: side, py, rx, ry, ground, halfW,
      startX: wide ? -halfW * 0.72 : -halfW * 0.75,
      standX: side - rx - (wide ? 1.1 : 0.45 / k),
      man: wide ? 1 : (visH * 0.085) / k / 1.45,
    };
    radius.current = [rx, ry];
    shorts.forEach((_, n) => {
      list[2 + n] = portal(count, rx, ry, side, py, PORTAL_TINTS[n % PORTAL_TINTS.length]);
    });
    centers.current = centers.current.map((c, i) => (scenes[i].kind === "video" ? [side, py] : c));
    return () => { alive = false; };
  }, [scenes, count, wide, last, shorts]);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      shared.progress = Math.min(Math.max(-r.top / Math.max(r.height - window.innerHeight, 1), 0), 1);
      const seg = easeSeg(shared.progress * last);
      const i = Math.round(seg);
      setPhase(Math.abs(seg - i) < 0.22 ? i : -1);
    };
    const move = (e: PointerEvent) => {
      shared.hover = e.pointerType === "mouse";
      shared.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      shared.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("pointermove", move);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("pointermove", move);
      io.disconnect();
    };
  }, [last]);

  const jump = (i: number) => {
    const el = outer.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) * (i / last);
    if (window.glacyScroll) window.glacyScroll.scrollTo(y, { duration: 1.8 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const show = (on: boolean) =>
    `transition-[opacity,translate,filter] duration-700 ease-out-expo ${on ? "opacity-100 translate-y-0 blur-0" : "pointer-events-none opacity-0 translate-y-5 blur-sm"}`;
  const pill = "w-fit rounded-[4px] bg-ice px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bg";
  const left = "absolute inset-x-5 bottom-14 md:inset-x-auto md:bottom-auto md:left-[clamp(40px,4vw,120px)] md:top-1/2 md:max-w-[min(560px,40vw)] md:-translate-y-1/2";

  return (
    <div ref={outer} className="relative" style={{ height: `${last * 95 + 100}svh` }}>
      {/* nav targets: where each named scene settles */}
      {scenes.map((s, i) =>
        s.id ? <div key={s.id} id={s.id} className="absolute inset-x-0" style={{ top: `calc((100% - 100svh) * ${i / last})` }} /> : null
      )}

      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#030305]">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 16], fov: 40, near: 0.1, far: 200 }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          frameloop={inView ? "always" : "never"}
          aria-hidden
        >
          <color attach="background" args={["#030305"]} />
          <Sky />
          <Camera />
          <Morph shapes={shapes} centers={centers} kinds={scenes.map((s) => s.kind)} radius={radius} count={count}>
            <Journey layout={layout} videos={shorts} first={2} onPlay={onPlay} />
          </Morph>
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={0.35} intensity={0.75} radius={0.75} />
            <Vignette offset={0.25} darkness={0.75} />
          </EffectComposer>
        </Canvas>

        <div className="pointer-events-none absolute inset-0">
          {scenes.map((s, i) => {
            const on = phase === i;
            const live = on ? "pointer-events-auto" : "";
            if (s.kind === "intro")
              return (
                <div key={i}>
                  <div className={`absolute inset-x-5 top-[14%] text-center ${show(on)}`}>
                    <p className={`${pill} mx-auto mb-5`}>Independent creator</p>
                    <h1 className="font-display text-[clamp(44px,6.6vw,150px)] font-bold leading-[0.9] tracking-[-0.055em] [text-shadow:0_6px_40px_rgba(0,0,0,0.7)]">
                      Creating what <span className="ice-text">I love.</span>
                    </h1>
                  </div>
                  <div className={`absolute bottom-10 left-5 md:left-[clamp(40px,4vw,120px)] ${show(on)} ${live}`}>
                    <p className="mb-6 font-mono text-[11px] uppercase leading-[1.7] tracking-[0.14em] text-white/65">
                      Videos, edits and vlogs.<br />Cut frame by frame.<br />Uploading since 2024.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => jump(2)} className="btn btn-solid">Explore my work</button>
                      <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Watch on YouTube</a>
                    </div>
                  </div>
                  <p className={`absolute bottom-12 right-[clamp(40px,4vw,120px)] hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 md:flex ${show(on)}`}>
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-white/40">↓</span> Scroll to explore
                  </p>
                </div>
              );
            if (s.kind === "name")
              return (
                <div key={i} className={`absolute inset-x-5 bottom-[14%] text-center ${show(on)}`}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/70">Video creator · Editor · Vlogger</p>
                  <p className="mx-auto mt-3 max-w-md text-white/55">Edits, vlogs, football and whatever I&apos;m into this week.</p>
                </div>
              );
            if (s.kind === "video")
              return (
                <div key={i}>
                  <div className={`${left} ${show(on)} ${live}`}>
                    <p className={`${pill} mb-4`}>Latest release {String(s.n + 1).padStart(2, "0")} / {String(shorts.length).padStart(2, "0")}</p>
                    <h2 className="font-display text-[clamp(30px,4vw,76px)] font-bold leading-[0.95] tracking-[-0.045em] [text-shadow:0_4px_30px_rgba(0,0,0,0.8)]">{s.v.title}</h2>
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                      {fmtDate(s.v.published)} · {s.v.isShort ? "Short" : "Video"}{s.v.tags.length > 0 && <> · {s.v.tags.slice(0, 3).join(" ")}</>}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <button onClick={() => onPlay(s.v)} className="btn btn-solid">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                        Play
                      </button>
                      <a href={s.v.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Open on YouTube</a>
                    </div>
                  </div>
                </div>
              );
            if (s.kind === "about")
              return (
                <div key={i} className={`${left} ${show(on)} ${live}`}>
                  <p className={`${pill} mb-4`}>About</p>
                  <h2 className="font-display text-[clamp(34px,4.6vw,92px)] font-bold uppercase leading-[0.9] tracking-[-0.05em]">
                    Not just creating. <span className="ice-text">Experiencing.</span>
                  </h2>
                  <p className="mt-6 leading-relaxed text-white/70">
                    I&apos;m Glacy. I make videos about whatever I&apos;m into that week and edit them until they feel right. When I&apos;m not on the timeline I&apos;m
                    probably playing football, at the gym, or filming something random for a vlog.
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {PASSIONS.map((p) => (
                      <li key={p} className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white/75 backdrop-blur">{p}</li>
                    ))}
                  </ul>
                </div>
              );
            if (s.kind === "connect")
              return (
                <div key={i} className={`${left} ${show(on)} ${live}`}>
                  <p className={`${pill} mb-4`}>Connect</p>
                  <h2 className="font-display text-[clamp(40px,5.4vw,110px)] font-bold uppercase leading-[0.88] tracking-[-0.055em]">
                    Come hang <span className="ice-text">out.</span>
                  </h2>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      { href: SUBSCRIBE_URL, name: "YouTube", handle: "@glacyfilms", cta: "Subscribe" },
                      { href: INSTAGRAM_URL, name: "Instagram", handle: "@glacy.filmss", cta: "Follow" },
                    ].map((c) => (
                      <a
                        key={c.name}
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-lg border border-white/15 bg-black/35 p-4 backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/10"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{c.name}</span>
                        <span className="mt-1 block font-display text-xl font-bold tracking-[-0.03em]">{c.handle}</span>
                        <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.18em] text-ice">{c.cta} ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            return (
              <div key={i} className={`absolute inset-x-5 bottom-[10%] text-center ${show(on)} ${live}`}>
                <h2 className="font-display text-[clamp(36px,5vw,100px)] font-bold uppercase leading-[0.9] tracking-[-0.05em]">
                  Thank you for being <span className="ice-text">here.</span>
                </h2>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <button onClick={() => jump(0)} className="btn btn-ghost">Back to the start ↑</button>
                  <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-solid">Subscribe</a>
                </div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">© {new Date().getFullYear()} GLACY</p>
              </div>
            );
          })}

          {/* scene map */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 md:right-[clamp(16px,1.8vw,48px)]">
            <nav aria-label="Scenes" className="pointer-events-auto flex flex-col gap-1">
              {scenes.map((s, i) => (
                <button key={i} onClick={() => jump(i)} aria-label={`Go to ${s.label}`} aria-current={phase === i} className="flex h-6 w-6 items-center justify-center">
                  <span className={`block rounded-full transition-all duration-500 ${phase === i ? "h-2.5 w-2.5 bg-ice shadow-[0_0_14px_#9fd8ff]" : "h-1.5 w-1.5 bg-white/35"}`} />
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
