"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { AnimatePresence, motion } from "framer-motion";
import type { Video } from "@/lib/youtube";

const GAP = 34; // distance between universes along the flight path
const CARD_H = 4.2;
const COLORS = ["#9fd8ff", "#ffc78a", "#c9a7ff", "#ff9fb8", "#8fe3ff", "#ffd27a", "#a9c4ff", "#ffb08a", "#b8f0ff", "#f2e6ff"];

// the flight path curves gently so every universe sits somewhere new
export const pathX = (s: number) => Math.sin(s * 1.7) * 2.4;
export const pathY = (s: number) => Math.cos(s * 1.1) * 1.3;
const pathZ = (s: number) => -s * GAP;
// linger at each universe, rush between them
export const easeSeg = (seg: number) => {
  const i = Math.floor(seg);
  const t = seg - i;
  return i + (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
};

const shared = { progress: 0, vel: 0, pointer: { x: 0, y: 0 } };

const pointsMaterial = (blending: THREE.Blending = THREE.AdditiveBlending, soft = 0) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending,
    vertexColors: true,
    uniforms: { uPixel: { value: 1 }, uSoft: { value: soft } },
    vertexShader: /* glsl */ `
      uniform float uPixel; attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vA;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * uPixel * (24.0 / -mv.z), 256.0);
        vA = aAlpha * smoothstep(0.5, 4.0, -mv.z) * (1.0 - smoothstep(70.0, 120.0, -mv.z));
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSoft; varying vec3 vColor; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        // stars: crisp core; gas and dust (uSoft = 1): wide gaussian puff
        float f = mix(smoothstep(0.5, 0.0, d) * (0.4 + 0.6 * exp(-d * d * 60.0)), exp(-d * d * 14.0) * step(d, 0.5), uSoft);
        gl_FragColor = vec4(vColor, vA * f);
      }`,
  });

const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-6)) * Math.cos(2 * Math.PI * Math.random());

function makePoints(count: number, fill: (i: number, p: number[], c: THREE.Color, a: number[]) => number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const alpha = new Float32Array(count);
  const p = [0, 0, 0];
  const a = [1];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    a[0] = 1;
    size[i] = fill(i, p, c, a);
    alpha[i] = a[0];
    pos.set(p, i * 3);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  return g;
}

// star colour by temperature: hot blue-white in the arms, cooler gold in the bulge
const TEMPS = ["#9bb0ff", "#aabfff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffe8c6", "#ffd2a1", "#ffb56c"].map((c) => new THREE.Color(c));

/** A spiral galaxy built like a render: logarithmic arms of young stars, a warm bulge,
 *  pink/blue gas clouds along the arms and dark dust lanes on their inner edges. */
function Galaxy({ tint, stars, seed }: { tint: string; stars: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const R = 18;
  const arms = seed % 3 === 2 ? 3 : 2;
  const twist = 2.3 + (seed % 4) * 0.25;
  const armAngle = (r: number, k: number) => (k / arms) * Math.PI * 2 + Math.log(1 + r) * twist;

  const [starMat, gasMat, dustMat] = useMemo(
    () => [pointsMaterial(), pointsMaterial(THREE.AdditiveBlending, 1), pointsMaterial(THREE.NormalBlending, 1)],
    []
  );
  const [starGeo, gasGeo, dustGeo] = useMemo(() => {
    const gasTint = new THREE.Color(tint);
    const starGeo = makePoints(stars, (i, p, c, a) => {
      if (i < stars * 0.22) {
        // bulge: dense, warm, slightly flattened
        const r = Math.abs(gauss()) * 1.6;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        p[0] = r * Math.sin(ph) * Math.cos(th);
        p[1] = r * Math.cos(ph) * 0.55;
        p[2] = r * Math.sin(ph) * Math.sin(th);
        c.copy(TEMPS[5 + Math.floor(Math.random() * 3)]);
        a[0] = 0.7;
        return 0.8 + Math.random() * 1.6;
      }
      const inArm = Math.random() < 0.72;
      const r = 1.2 + Math.pow(Math.random(), 1.35) * R;
      const spread = inArm ? 0.16 + r * 0.012 : Math.PI;
      const ang = armAngle(r, i % arms) + gauss() * spread;
      p[0] = Math.cos(ang) * r;
      p[1] = gauss() * (0.35 - r * 0.012);
      p[2] = Math.sin(ang) * r;
      const t = inArm ? Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 5);
      c.copy(TEMPS[t]);
      a[0] = (inArm ? 0.85 : 0.45) * (1 - (r / R) * 0.55);
      return Math.random() < 0.015 ? 3.5 + Math.random() * 3 : 0.6 + Math.random() * 1.4;
    });
    const gasGeo = makePoints(Math.round(stars * 0.06), (i, p, c, a) => {
      const core = i < 12;
      const r = core ? Math.random() * 0.8 : 2 + Math.random() * R * 0.85;
      const ang = core ? Math.random() * 7 : armAngle(r, i % arms) + gauss() * 0.12 + 0.05;
      p[0] = Math.cos(ang) * r;
      p[1] = gauss() * 0.15;
      p[2] = Math.sin(ang) * r;
      if (core) c.set("#ffd9a8");
      else if (Math.random() < 0.35) c.set("#ff6f9c"); // H-II regions: star-forming pink
      else c.copy(gasTint).lerp(new THREE.Color("#5f8dff"), 0.4);
      a[0] = core ? 0.16 : 0.035 + Math.random() * 0.05;
      return core ? 70 + Math.random() * 40 : 14 + Math.random() * 26;
    });
    const dustGeo = makePoints(Math.round(stars * 0.09), (i, p, c, a) => {
      const r = 1.6 + Math.pow(Math.random(), 0.9) * R * 0.8;
      // just inside each arm, where real dust lanes sit
      const ang = armAngle(r, i % arms) - 0.22 + gauss() * 0.07;
      p[0] = Math.cos(ang) * r;
      p[1] = gauss() * 0.08 + 0.12;
      p[2] = Math.sin(ang) * r;
      c.set(Math.random() < 0.5 ? "#120a06" : "#1c120c");
      a[0] = 0.18 + Math.random() * 0.2;
      return 6 + Math.random() * 12;
    });
    return [starGeo, gasGeo, dustGeo];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint, stars, seed]);

  useFrame((s, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03;
    const px = s.gl.getPixelRatio();
    starMat.uniforms.uPixel.value = gasMat.uniforms.uPixel.value = dustMat.uniforms.uPixel.value = px;
  });
  return (
    <group ref={ref}>
      <points geometry={gasGeo} material={gasMat} renderOrder={1} />
      <points geometry={dustGeo} material={dustMat} renderOrder={2} />
      <points geometry={starGeo} material={starMat} renderOrder={3} />
    </group>
  );
}

/** Deep sky: a faint milky band and coloured nebula wisps, always infinitely far away. */
function Sky() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
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
          float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 6; k++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
          void main() {
            vec3 d = normalize(vDir);
            float band = exp(-pow((d.y + 0.25 * d.x) * 3.2, 2.0));
            float cloud = fbm(d * 3.0);
            float dust = smoothstep(0.45, 0.75, fbm(d * 6.0 + 4.0));
            vec3 col = mix(vec3(0.02, 0.03, 0.07), vec3(0.16, 0.12, 0.2), cloud) * (0.35 + band * 1.1);
            col += vec3(0.32, 0.22, 0.14) * band * pow(cloud, 3.0) * 0.9;           // warm galactic glow
            col += vec3(0.12, 0.22, 0.45) * pow(fbm(d * 2.0 + 9.0), 4.0) * 0.8;    // blue nebula wisps
            col += vec3(0.4, 0.08, 0.18) * pow(fbm(d * 2.5 - 3.0), 5.0) * 0.6;     // red emission wisps
            col *= 1.0 - dust * band * 0.7;                                         // dark rifts
            gl_FragColor = vec4(col * 0.13, 1.0); // linear light: keep deep space nearly black
          }`,
      }),
    []
  );
  useFrame((s) => ref.current?.position.copy(s.camera.position));
  return (
    <mesh ref={ref} material={material} renderOrder={-1}>
      <sphereGeometry args={[130, 48, 32]} />
    </mesh>
  );
}

/** Background star field filling the whole tunnel. */
function Stars({ count, length }: { count: number; length: number }) {
  const material = useMemo(pointsMaterial, []);
  const geometry = useMemo(
    () =>
      makePoints(count, (_, p, c) => {
        p[0] = (Math.random() - 0.5) * 90;
        p[1] = (Math.random() - 0.5) * 60;
        p[2] = 20 - Math.random() * (length + 60);
        c.setHSL(0.58 + Math.random() * 0.1, 0.5, 0.75 + Math.random() * 0.25);
        return 0.6 + Math.random() * 1.6;
      }),
    [count, length]
  );
  useFrame((s) => (material.uniforms.uPixel.value = s.gl.getPixelRatio()));
  return <points geometry={geometry} material={material} />;
}

/** Light streaks that stretch with flight speed. */
function Warp({ length }: { length: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uLen: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform float uLen; attribute float aEnd; varying float vA;
          void main() {
            vec3 p = position; p.z += aEnd * uLen;
            vA = (1.0 - aEnd) * clamp(uLen / 6.0, 0.0, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(0.75, 0.88, 1.0, vA * 0.7); }`,
      }),
    []
  );
  const geometry = useMemo(() => {
    const n = 600;
    const pos = new Float32Array(n * 6);
    const end = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 22;
      const z = 10 - Math.random() * (length + 20);
      pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.7, z, Math.cos(a) * r, Math.sin(a) * r * 0.7, z], i * 6);
      end.set([0, 1], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    return g;
  }, [length]);
  useFrame(() => (material.uniforms.uLen.value = THREE.MathUtils.lerp(material.uniforms.uLen.value, Math.min(shared.vel * 0.5, 14), 0.15)));
  return <lineSegments geometry={geometry} material={material} />;
}

/** The video itself: rounded thumbnail with a glow in the universe colour. */
function Card({ video, color, index, onPlay }: { video: Video; color: string; index: number; onPlay: (v: Video) => void }) {
  const tex = useTexture(video.thumb);
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const aspect = video.isShort ? 9 / 16 : 16 / 9;
  const pad = 1.25; // plane is bigger than the card so the glow can spill out
  const material = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const img = tex.image as { width: number; height: number };
    const imgAspect = img.width / img.height;
    // object-fit: cover
    const scale = aspect < imgAspect ? [aspect / imgAspect, 1] : [1, imgAspect / aspect];
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false, // the glow margin must not hide what's behind the card
      toneMapped: false,
      uniforms: {
        uMap: { value: tex },
        uScale: { value: new THREE.Vector2(scale[0], scale[1]) },
        uAspect: { value: aspect },
        uPad: { value: pad },
        uGlow: { value: new THREE.Color(color) },
        uHover: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec2 uScale; uniform float uAspect; uniform float uPad; uniform vec3 uGlow; uniform float uHover;
        varying vec2 vUv;
        float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main() {
          vec2 local = (vUv - 0.5) * uPad;               // card space: -0.5..0.5
          vec2 p = vec2(local.x * uAspect, local.y);
          float d = sdRound(p, vec2(0.5 * uAspect, 0.5), 0.045);
          float inside = smoothstep(0.003, -0.003, d);
          vec2 uv = local / (1.0 + uHover * 0.06) * uScale + 0.5;
          vec3 img = texture2D(uMap, uv).rgb * (0.82 + uHover * 0.25);
          float rim = exp(-abs(d) * 90.0);
          // glow fades to exactly zero before the plane edge, so no box shows around the card
          vec2 e = 1.0 - smoothstep(0.38, 0.5, abs(vUv - 0.5));
          float halo = exp(-max(d, 0.0) * 45.0) * (0.35 + uHover * 0.4) * e.x * e.y;
          vec3 col = mix(uGlow, img + uGlow * rim * 0.9, inside);
          float a = max(inside, halo * (1.0 - inside));
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
  }, [tex, color, aspect]);

  useFrame((st, dt) => {
    material.uniforms.uHover.value = THREE.MathUtils.damp(material.uniforms.uHover.value, hover ? 1 : 0, 6, dt);
    if (mesh.current) {
      mesh.current.position.y = pathY(index) + Math.sin(st.clock.elapsedTime * 0.7 + index) * 0.08;
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, shared.pointer.x * 0.18, 4, dt);
      mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, -shared.pointer.y * 0.12, 4, dt);
    }
  });

  const h = video.isShort ? CARD_H : CARD_H * 0.62;
  return (
    <mesh
      ref={mesh}
      renderOrder={10} // after the galaxy layers, so stars never draw across the thumbnail
      position={[pathX(index), pathY(index), pathZ(index)]}
      material={material}
      onClick={(e) => { e.stopPropagation(); onPlay(video); }}
      onPointerOver={() => { setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
    >
      <planeGeometry args={[h * aspect * pad, h * pad]} />
    </mesh>
  );
}

function Rig({ count, onIndex }: { count: number; onIndex: (i: number, between: boolean) => void }) {
  const { camera, size } = useThree();
  const last = useRef({ z: camera.position.z, i: -1, between: false });
  // the effect keeps a reference to this vector, so mutating it per frame is enough
  const caOffset = useMemo(() => new THREE.Vector2(0.0004, 0.0004), []);
  useFrame((_, dt) => {
    const seg = easeSeg(shared.progress * (count - 1));
    const wide = size.width > size.height;
    // desktop: card sits right of the copy; phones: card sits above it
    const ox = wide ? -2.1 : 0;
    const oy = wide ? 0 : -1.0;
    const tx = pathX(seg) + ox + shared.pointer.x * 0.4;
    const ty = pathY(seg) + oy + shared.pointer.y * 0.25;
    const tz = pathZ(seg) + 8.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 5, dt);
    camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 10);

    shared.vel = Math.abs(camera.position.z - last.current.z) / Math.max(dt, 1e-3);
    last.current.z = camera.position.z;
    caOffset.setScalar(0.0003 + Math.min(shared.vel * 0.00005, 0.0025));

    const i = Math.round(seg);
    const between = Math.abs(seg - i) > 0.18;
    if (i !== last.current.i || between !== last.current.between) {
      last.current.i = i;
      last.current.between = between;
      onIndex(i, between);
    }
  });
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.3} intensity={0.9} radius={0.8} />
      {/* a hint of lens fringing that grows with speed */}
      <ChromaticAberration
        offset={caOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette offset={0.2} darkness={0.8} />
    </EffectComposer>
  );
}

const sector = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(16).slice(0, 4).toUpperCase();
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Scroll-driven flight through a galaxy; every video is its own universe. */
export default function Multiverse({ videos, onPlay }: { videos: Video[]; onPlay: (v: Video) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ i: 0, between: false });
  const [inView, setInView] = useState(false);
  const count = videos.length;
  const low = useMemo(
    () => typeof window !== "undefined" && (matchMedia("(max-width: 768px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4),
    []
  );

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      shared.progress = Math.min(Math.max(-r.top / Math.max(r.height - window.innerHeight, 1), 0), 1);
    };
    const move = (e: PointerEvent) => {
      shared.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      shared.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("pointermove", move);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("pointermove", move);
      io.disconnect();
    };
  }, []);

  const jump = (i: number) => {
    const el = outer.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = top + (el.offsetHeight - window.innerHeight) * (i / Math.max(count - 1, 1));
    if (window.glacyScroll) window.glacyScroll.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const v = videos[state.i] ?? videos[0];
  const color = COLORS[state.i % COLORS.length];

  return (
    <div ref={outer} className="relative" style={{ height: `${count * 85 + 40}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-bg">
        <Canvas
          dpr={[1, low ? 1.25 : 1.75]}
          camera={{ position: [0, 0, 8.5], fov: 45, near: 0.1, far: 140 }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          frameloop={inView ? "always" : "never"}
          aria-hidden
        >
          <color attach="background" args={["#030305"]} />
          <Sky />
          <Stars count={low ? 2500 : 7000} length={count * GAP} />
          <Warp length={count * GAP} />
          {videos.map((video, i) => (
            <group key={video.id}>
              <group
                position={[pathX(i) + (i % 2 ? -5 : 5), pathY(i) - 2, pathZ(i) - 16]}
                rotation={[0.55 + (i % 3) * 0.2, i * 0.9, (i % 2 ? 0.35 : -0.35)]}
              >
                <Galaxy tint={COLORS[i % COLORS.length]} stars={low ? 5000 : 16000} seed={i} />
              </group>
              <Suspense fallback={null}>
                <Card video={video} color={COLORS[i % COLORS.length]} index={i} onPlay={onPlay} />
              </Suspense>
            </group>
          ))}
          <Rig count={count} onIndex={(i, between) => setState({ i, between })} />
        </Canvas>

        {/* overlay: what universe you're in */}
        <div className="pointer-events-none absolute inset-0 mx-auto max-w-[3200px] px-5 md:px-[clamp(40px,3.5vw,120px)]">
          <div className="absolute inset-x-5 bottom-10 md:inset-x-auto md:bottom-auto md:top-1/2 md:max-w-[min(560px,40vw)] md:-translate-y-1/2">
            <AnimatePresence mode="wait">
              {!state.between && v && (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="eyebrow mb-4 flex items-center gap-3" style={{ color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                    Universe {String(state.i + 1).padStart(2, "0")} · Sector {sector(v.id)}
                  </p>
                  <h3 className="font-display text-[clamp(30px,4vw,76px)] font-bold leading-[0.95] tracking-[-0.045em] [text-shadow:0_4px_30px_rgba(0,0,0,0.8)]">
                    {v.title}
                  </h3>
                  <p className="eyebrow mt-4 !text-[10px]">
                    {fmtDate(v.published)}
                    {state.i === 0 && <span style={{ color }}> · Newest</span>}
                  </p>
                  <div className="pointer-events-auto mt-7 flex flex-wrap gap-3">
                    <button onClick={() => onPlay(v)} className="btn btn-solid">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                      Play
                    </button>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Open on YouTube</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* universe map: jump to any video */}
          <nav aria-label="Jump to video" className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1 md:right-[clamp(20px,2vw,60px)]">
            {videos.map((x, i) => (
              <button
                key={x.id}
                onClick={() => jump(i)}
                aria-label={`Go to “${x.title}”`}
                aria-current={i === state.i}
                className="group flex h-6 w-6 items-center justify-center"
              >
                <span
                  className="block rounded-full transition-all duration-500"
                  style={{
                    width: i === state.i ? 10 : 5,
                    height: i === state.i ? 10 : 5,
                    background: i === state.i ? COLORS[i % COLORS.length] : "rgba(237,238,240,0.35)",
                    boxShadow: i === state.i ? `0 0 14px ${COLORS[i % COLORS.length]}` : "none",
                  }}
                />
              </button>
            ))}
          </nav>

          <p
            className={`eyebrow absolute left-1/2 top-24 hidden md:block -translate-x-1/2 whitespace-nowrap !text-[10px] transition-opacity duration-700 ${
              state.i === 0 && !state.between ? "opacity-100" : "opacity-0"
            }`}
          >
            Scroll to travel ↓
          </p>
        </div>
      </div>
    </div>
  );
}
