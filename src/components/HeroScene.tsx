"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, Lightformer, MeshReflectorMaterial, Text3D } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

type Quality = { low: boolean; reduce: boolean };

const pointer = { x: 0, y: 0 };
let introAt = -1; // clock time the loader finished

const damp = THREE.MathUtils.damp;

function Logo({ reduce }: Quality) {
  const group = useRef<THREE.Group>(null);
  const [size, setSize] = useState({ w: 4.6, h: 1 });
  const { viewport } = useThree();
  // fit the wordmark: wide screens are capped by height, narrow ones by width
  const portrait = viewport.width < viewport.height;
  const scale = Math.min((viewport.width * (portrait ? 0.88 : 0.74)) / size.w, (viewport.height * 0.34) / size.h);
  const baseY = viewport.height * (portrait ? 0.2 : 0.07); // phones: lift it clear of the copy

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const intro = introAt < 0 ? 0 : Math.min((t - introAt) / 2.2, 1);
    const e = reduce ? 1 : 1 - Math.pow(1 - intro, 4);
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.2);

    g.rotation.y = damp(g.rotation.y, (reduce ? 0 : pointer.x * 0.28) - (1 - e) * 0.9, 4, dt);
    g.rotation.x = damp(g.rotation.x, (reduce ? 0 : -pointer.y * 0.14) + scroll * 0.35, 4, dt);
    g.position.y = baseY + (reduce ? 0 : Math.sin(t * 0.8) * 0.06) + scroll * 1.4;
    g.scale.setScalar(scale * (0.82 + e * 0.18));
  });

  return (
    <group ref={group}>
      <Center
        onCentered={({ width, height }) =>
          // Center re-measures on every render; only update when the size really changed
          setSize((s) => (Math.abs(s.w - width) < 1e-3 && Math.abs(s.h - height) < 1e-3 ? s : { w: width, h: height }))
        }
      >
        <Text3D
          font="/media/glacy-font.json"
          size={1}
          height={0.42}
          curveSegments={10}
          bevelEnabled
          bevelSize={0.022}
          bevelThickness={0.035}
          bevelSegments={6}
          letterSpacing={-0.03}
          castShadow
        >
          GLACY
          <meshPhysicalMaterial
            color="#dfe8f0"
            metalness={1}
            roughness={0.16}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={1.8}
          />
        </Text3D>
      </Center>
    </group>
  );
}

/** Ice dust: points drifting slowly upward, drawn as soft discs, fading with depth. */
function Particles({ count }: { count: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uPixel;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.y = mod(p.y + uTime * (0.08 + aSeed * 0.12) + 4.0, 14.0) - 4.0;
            p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.25;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.2 + aSeed * 2.8) * uPixel * (18.0 / -mv.z);
            vAlpha = smoothstep(-30.0, -6.0, mv.z) * (0.25 + aSeed * 0.6) * smoothstep(-4.0, -1.0, p.y);
          }`,
        fragmentShader: /* glsl */ `
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(0.78, 0.9, 1.0, vAlpha * smoothstep(0.5, 0.0, d));
          }`,
      }),
    []
  );
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 14 - 4;
      pos[i * 3 + 2] = -Math.random() * 22 + 4;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixel.value = state.gl.getPixelRatio();
  });
  return <points geometry={geometry} material={material} />;
}

function Rig({ reduce }: Quality) {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state, dt) => {
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.2);
    const cam = state.camera;
    const px = reduce ? 0 : pointer.x;
    const py = reduce ? 0 : pointer.y;
    cam.position.x = damp(cam.position.x, px * 0.9, 2.5, dt);
    cam.position.y = damp(cam.position.y, 0.6 + py * 0.5, 2.5, dt);
    cam.position.z = damp(cam.position.z, 11 + scroll * 4, 4, dt);
    cam.lookAt(0, 0.3, 0);
    // a cold key light that follows the cursor across the letters
    if (light.current) {
      light.current.position.x = damp(light.current.position.x, px * 6, 3, dt);
      light.current.position.y = damp(light.current.position.y, 1 + py * 3, 3, dt);
    }
  });
  return <pointLight ref={light} position={[0, 1, 4]} intensity={30} distance={14} color="#9fd8ff" />;
}

function Floor({ low }: Quality) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.15, 0]}>
      <planeGeometry args={[60, 40]} />
      {low ? (
        <meshStandardMaterial color="#060708" roughness={0.6} metalness={0.4} />
      ) : (
        <MeshReflectorMaterial
          resolution={512}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={2.2}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#08090b"
          metalness={0.6}
          mirror={0.6}
        />
      )}
    </mesh>
  );
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const quality = useMemo<Quality>(() => {
    const small = matchMedia("(max-width: 768px)").matches;
    return {
      low: small || (navigator.hardwareConcurrency ?? 8) <= 4,
      reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onReady = () => (introAt = performance.now() / 1000 - start);
    const start = performance.now() / 1000;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("glacy:ready", onReady);
    if (window.glacyReady) introAt = 0;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("glacy:ready", onReady);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, quality.low ? 1.5 : 2]}
        camera={{ position: [0, 0.6, 11], fov: 30, near: 0.1, far: 60 }}
        gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        frameloop={inView ? "always" : "never"}
      >
        <color attach="background" args={["#050506"]} />
        <fog attach="fog" args={["#050506", 12, 30]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[-6, 6, 4]} intensity={1.4} color="#ffffff" />

        <Logo {...quality} />
        <Particles count={quality.low ? 500 : 1400} />
        <Floor {...quality} />
        <Rig {...quality} />

        {/* procedural studio: no HDR download, just light panels for the chrome to reflect */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[14, 2, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2} position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} color="#9fd8ff" />
          <Lightformer form="rect" intensity={1.4} position={[7, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[10, 0.8, 1]} color="#6d8cff" />
          <Lightformer form="ring" intensity={1.5} position={[0, -3, 6]} scale={3} color="#ffffff" />
        </Environment>

        <EffectComposer multisampling={quality.low ? 0 : 4}>
          <Bloom mipmapBlur luminanceThreshold={0.7} intensity={0.55} radius={0.7} />
          <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0006)} radialModulation={false} modulationOffset={0} />
          <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
