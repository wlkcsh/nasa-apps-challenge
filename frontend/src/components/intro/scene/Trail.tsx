"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, TRAIL_COUNT } from "@/lib/config";
import { introState } from "../introState";

interface ParticleData {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  isCyan: boolean;
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
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const cursorRef = useRef(0);

  const {
    planeGeo,
    mat,
    particles,
    dummy,
    cyanColor,
    soilColor,
    tempColor,
    spawnOffset,
  } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.11, 0.11);
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const pool: ParticleData[] = Array.from({ length: maxCount }, (_, i) => ({
      active: false,
      age: 0,
      life: 0.55,
      pos: new THREE.Vector3(0, 0, -9999),
      vel: new THREE.Vector3(),
      isCyan: i % 2 === 0,
    }));

    return {
      planeGeo: geo,
      mat: m,
      particles: pool,
      dummy: new THREE.Object3D(),
      cyanColor: new THREE.Color(COLORS.orbit),
      soilColor: new THREE.Color(COLORS.soil),
      tempColor: new THREE.Color(),
      spawnOffset: new THREE.Vector3(),
    };
  }, [maxCount]);

  // Pre-initialize instanceMatrix and instanceColor during mount so Three.js compiles
  // the instanced color vertex/fragment shader on boot rather than hitching on first scroll.
  useLayoutEffect(() => {
    const instanced = meshRef.current;
    if (!instanced) return;

    dummy.position.set(0, 0, -9999);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();

    for (let i = 0; i < maxCount; i++) {
      instanced.setMatrixAt(i, dummy.matrix);
      instanced.setColorAt(i, i % 2 === 0 ? cyanColor : soilColor);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  }, [maxCount, dummy, cyanColor, soilColor]);

  useEffect(() => {
    return () => {
      planeGeo.dispose();
      mat.dispose();
    };
  }, [planeGeo, mat]);

  useFrame(({ camera }, delta) => {
    const instanced = meshRef.current;
    const rocket = rocketGroupRef.current;
    if (!instanced) return;

    const dt = Math.min(delta, 0.1);

    // Emit particles strictly proportional to forward scroll deltaP (zero when stationary or reverse scrolling)
    if (
      rocket &&
      introState.deltaP > 0.00005 &&
      introState.p > 0.01 &&
      introState.p < 0.85
    ) {
      const rawSpawn = Math.ceil(introState.deltaP * 420 * qualityScale);
      const spawnCount = Math.min(rawSpawn, 16);

      for (let s = 0; s < spawnCount; s++) {
        const idx = cursorRef.current % maxCount;
        cursorRef.current += 1;

        const p = particles[idx];
        p.active = true;
        p.age = 0;
        p.life = 0.4 + (idx % 5) * 0.08;

        const spreadX = ((idx % 7) - 3) * 0.022;
        const spreadY = ((idx % 5) - 2) * 0.022;
        spawnOffset.set(spreadX, spreadY, 0);
        p.pos.copy(rocket.position).add(spawnOffset);
        p.vel.set(spreadX * 0.6, spreadY * 0.6, 0);
      }
    }

    // Consume deltaP for this frame so pausing scroll immediately stops emission
    introState.deltaP = 0;

    let needsColorUpdate = false;
    for (let i = 0; i < maxCount; i++) {
      const p = particles[i];
      if (!p.active) {
        dummy.position.set(0, 0, -9999);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        dummy.position.set(0, 0, -9999);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const lifeRatio = 1 - p.age / p.life;
      p.pos.addScaledVector(p.vel, dt);

      dummy.position.copy(p.pos);
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(lifeRatio);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      tempColor.copy(p.isCyan ? cyanColor : soilColor).multiplyScalar(lifeRatio);
      instanced.setColorAt(i, tempColor);
      needsColorUpdate = true;
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (needsColorUpdate && instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[planeGeo, mat, maxCount]}
      frustumCulled={false}
    />
  );
}
