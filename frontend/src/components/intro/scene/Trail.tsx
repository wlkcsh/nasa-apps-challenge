"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, TRAIL_COUNT } from "@/lib/config";
import { introState } from "../introState";

const TRAIL_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aAlpha;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (260.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const TRAIL_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.005) discard;

  // Soft-sphere radial glow: Gaussian core + quadratic edge falloff
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distSq = dot(coord, coord);
  if (distSq > 0.25) discard;

  float d = sqrt(distSq) * 2.0; // 0 at center, 1 at boundary
  float core = exp(-distSq * 18.0);
  float halo = clamp(1.0 - d * d, 0.0, 1.0);

  float radial = core * 0.72 + halo * 0.28;
  float alpha = radial * vAlpha;
  if (alpha <= 0.005) discard;

  gl_FragColor = vec4(vColor, alpha);
}
`;

interface ParticleData {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  baseSize: number;
}

interface TrailProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group>;
  qualityScale?: number;
}

export default function Trail({
  isPortrait,
  rocketGroupRef,
  qualityScale = 1,
}: TrailProps) {
  const maxCount = isPortrait ? TRAIL_COUNT.portrait : TRAIL_COUNT.landscape;
  const pointsRef = useRef<THREE.Points | null>(null);
  const cursorRef = useRef(0);

  const { camera } = useThree();

  // Pointer position & velocity in 3D world space (on flight plane z = 0.6)
  const cursorWorldPos = useRef(new THREE.Vector3(0, 0, -9999));
  const cursorWorldVel = useRef(new THREE.Vector3(0, 0, 0));
  const prevCursorWorldPos = useRef(new THREE.Vector3(0, 0, -9999));
  const hasCursor = useRef(false);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);

      // Unproject to world coordinates at flight plane z = 0.6
      const planeZ = 0.6;
      const target = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
      const dir = target.sub(camera.position).normalize();
      if (Math.abs(dir.z) > 0.0001) {
        const dist = (planeZ - camera.position.z) / dir.z;
        const hit = camera.position.clone().addScaledVector(dir, dist);

        if (hasCursor.current) {
          cursorWorldVel.current.subVectors(hit, cursorWorldPos.current);
          // Clamp maximum cursor velocity to prevent particle explosion
          cursorWorldVel.current.clampLength(0, 1.8);
        } else {
          hasCursor.current = true;
          cursorWorldVel.current.set(0, 0, 0);
        }
        cursorWorldPos.current.copy(hit);
      }
    };

    const handlePointerLeave = () => {
      hasCursor.current = false;
      cursorWorldPos.current.set(0, 0, -9999);
      cursorWorldVel.current.set(0, 0, 0);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [camera]);

  const {
    geometry,
    material,
    particles,
    posArray,
    colorArray,
    alphaArray,
    sizeArray,
    cyanColor,
    soilColor,
    spawnOffset,
  } = useMemo(() => {
    const pCount = maxCount;
    const positions = new Float32Array(pCount * 3);
    const colors = new Float32Array(pCount * 3);
    const alphas = new Float32Array(pCount);
    const sizes = new Float32Array(pCount);

    const cCyan = new THREE.Color(COLORS.orbit);
    const cSoil = new THREE.Color(COLORS.soil);

    const pool: ParticleData[] = [];
    for (let i = 0; i < pCount; i++) {
      const isCyan = i % 2 === 0;
      const col = (isCyan ? cCyan : cSoil).clone();

      pool.push({
        active: false,
        age: 0,
        life: 0.55,
        pos: new THREE.Vector3(0, 0, -9999),
        vel: new THREE.Vector3(),
        color: col,
        baseSize: 0.16 + (i % 4) * 0.04,
      });

      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -9999;

      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      alphas[i] = 0.0;
      sizes[i] = 0.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return {
      geometry: geo,
      material: mat,
      particles: pool,
      posArray: positions,
      colorArray: colors,
      alphaArray: alphas,
      sizeArray: sizes,
      cyanColor: cCyan,
      soilColor: cSoil,
      spawnOffset: new THREE.Vector3(),
    };
  }, [maxCount]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const rocket = rocketGroupRef.current;
    const dt = Math.min(delta, 0.05);

    // Damping cursor velocity decay
    cursorWorldVel.current.multiplyScalar(0.88);

    // Emit volumetric wake particles strictly proportional to scroll progress
    if (
      rocket &&
      introState.deltaP > 0.00005 &&
      introState.p > 0.01 &&
      introState.p < 0.85
    ) {
      const rawSpawn = Math.ceil(introState.deltaP * 460 * qualityScale);
      const spawnCount = Math.min(rawSpawn, 18);

      for (let s = 0; s < spawnCount; s++) {
        const idx = cursorRef.current % maxCount;
        cursorRef.current += 1;

        const p = particles[idx];
        p.active = true;
        p.age = 0;
        p.life = 0.42 + (idx % 6) * 0.08;

        const spreadX = ((idx % 7) - 3) * 0.018;
        const spreadY = ((idx % 5) - 2) * 0.018;
        const spreadZ = ((idx % 3) - 1) * 0.012;
        spawnOffset.set(spreadX, spreadY, spreadZ);

        p.pos.copy(rocket.position).add(spawnOffset);
        // Initial soft radial velocity away from the rocket spine
        p.vel.set(spreadX * 0.8 - 0.04, spreadY * 0.8, spreadZ * 0.5);
      }
    }

    // Consume deltaP for this frame
    introState.deltaP = 0;

    const curPos = cursorWorldPos.current;
    const curVel = cursorWorldVel.current;
    const curSpeed = curVel.length();
    const repulsionRadius = 0.85;

    for (let i = 0; i < maxCount; i++) {
      const p = particles[i];
      if (!p.active) {
        posArray[i * 3 + 2] = -9999;
        alphaArray[i] = 0;
        sizeArray[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        posArray[i * 3 + 2] = -9999;
        alphaArray[i] = 0;
        sizeArray[i] = 0;
        continue;
      }

      const lifeRatio = 1 - p.age / p.life;

      // Cursor velocity repulsion & swirl interaction
      if (hasCursor.current && curPos.z > -9000) {
        const dx = p.pos.x - curPos.x;
        const dy = p.pos.y - curPos.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < repulsionRadius * repulsionRadius && dSq > 0.0001) {
          const dist = Math.sqrt(dSq);
          const force = (1.0 - dist / repulsionRadius);

          // Direct repulsive push away from cursor
          const pushX = (dx / dist) * force * 0.45;
          const pushY = (dy / dist) * force * 0.45;

          // Swirl torque perpendicular to cursor movement
          const swirlX = -curVel.y * force * 0.65;
          const swirlY = curVel.x * force * 0.65;

          p.vel.x += (pushX + swirlX) * dt * 8.0;
          p.vel.y += (pushY + swirlY) * dt * 8.0;
        }
      }

      // Natural aerodynamic drag & velocity integration
      p.vel.multiplyScalar(0.95);
      p.pos.addScaledVector(p.vel, dt);

      posArray[i * 3 + 0] = p.pos.x;
      posArray[i * 3 + 1] = p.pos.y;
      posArray[i * 3 + 2] = p.pos.z;

      // Soft-sprite expansion and alpha fade
      alphaArray[i] = Math.pow(lifeRatio, 1.4) * 0.82;
      sizeArray[i] = p.baseSize * (1.0 + (1.0 - lifeRatio) * 1.6);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
