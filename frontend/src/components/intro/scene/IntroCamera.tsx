"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CAMERA,
  COLORS,
  PARALLAX,
  PORTRAIT_STACK_SPAN,
  RIM_LIGHT_INTENSITY,
  SUN_INTENSITY,
} from "@/lib/config";
import { introState } from "../introState";

interface IntroCameraProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group>;
}

export default function IntroCamera({
  isPortrait,
  rocketGroupRef,
}: IntroCameraProps) {
  const { camera, viewport } = useThree();
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const isCoarsePointer = useRef(false);

  useEffect(() => {
    isCoarsePointer.current = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      pointerTarget.current.x = nx * PARALLAX.x;
      pointerTarget.current.y = ny * PARALLAX.y;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useFrame(() => {
    if (!isCoarsePointer.current) {
      pointerCurrent.current.x = THREE.MathUtils.lerp(
        pointerCurrent.current.x,
        pointerTarget.current.x,
        PARALLAX.lerp
      );
      pointerCurrent.current.y = THREE.MathUtils.lerp(
        pointerCurrent.current.y,
        pointerTarget.current.y,
        PARALLAX.lerp
      );
    }

    const p = introState.p;
    const W = viewport.width;

    let targetCamX = 0;
    let camLookX = 0;
    let targetCamY = 0;
    let camLookY = 0;

    if (isPortrait) {
      // In portrait: track vertically from Earth (top) to Mars (bottom)
      const portraitFramingY = (0.5 - p) * PORTRAIT_STACK_SPAN * (viewport.height / 7.5);
      targetCamY = portraitFramingY;
      camLookY = portraitFramingY * 0.35;
      targetCamX = 0;
      camLookX = 0;
    } else {
      // In landscape: Cinematic Camera Pan tracking the rocket's horizontal flight across space
      // 1. p in [0.0, 0.30]: Earth framed on left, pans right so Earth exits off-screen left by p = 0.30
      // 2. p in [0.30, 0.68]: Deep space empty corridor during two-stage separation
      // 3. p in [0.68, 0.90]: Mars smoothly enters on the right, settling without clipping by p = 0.85
      if (p <= 0.30) {
        const t = p / 0.30;
        const ease = t * t * (3 - 2 * t);
        targetCamX = THREE.MathUtils.lerp(-W * 0.22, W * 0.16, ease);
      } else if (p <= 0.68) {
        const t = (p - 0.30) / (0.68 - 0.30);
        const ease = t * t * (3 - 2 * t);
        targetCamX = THREE.MathUtils.lerp(W * 0.16, W * 0.18, ease);
      } else if (p <= 0.85) {
        const t = (p - 0.68) / (0.85 - 0.68);
        const ease = t * t * (3 - 2 * t);
        targetCamX = THREE.MathUtils.lerp(W * 0.18, W * 0.20, ease);
      } else {
        targetCamX = W * 0.20;
      }

      // Smooth envelope-weighted dynamic tracking on the rocket (C1 continuous)
      const rocket = rocketGroupRef.current;
      if (rocket) {
        const leadEnvelope =
          THREE.MathUtils.smoothstep(p, 0.08, 0.22) *
          (1.0 - THREE.MathUtils.smoothstep(p, 0.76, 0.88));
        const rocketOffset = (rocket.position.x - targetCamX) * 0.12 * leadEnvelope;
        targetCamX += rocketOffset;
      }

      camLookX = targetCamX;
      // Flight curve & FHTM sits at exact vertical center (y = 0.0)
      targetCamY = 0.0;
      camLookY = 0.0;
    }

    // Pure continuous p-driven camZ evaluation (zero GSAP timeline jumps)
    let targetCamZ: number = CAMERA.z[1];
    if (p > 0.85) {
      const morphT = THREE.MathUtils.smoothstep((p - 0.85) / 0.15, 0, 1);
      targetCamZ = THREE.MathUtils.lerp(CAMERA.z[1], CAMERA.z[2], morphT);
    }
    introState.camZ = targetCamZ;
    introState.camX = targetCamX;
    introState.camLookX = camLookX;

    camera.position.x = targetCamX + pointerCurrent.current.x;
    camera.position.y = targetCamY + pointerCurrent.current.y;
    camera.position.z = targetCamZ;

    camera.lookAt(
      camLookX + pointerCurrent.current.x * 0.5,
      camLookY + pointerCurrent.current.y * 0.5,
      0
    );
  });

  return (
    <>
      <ambientLight color={COLORS.void} intensity={1.0} />
      <directionalLight
        color={COLORS.bone}
        intensity={SUN_INTENSITY}
        position={[6, 4, 6]}
      />
      <directionalLight
        color={COLORS.orbit}
        intensity={RIM_LIGHT_INTENSITY}
        position={[-6, 2, -4]}
      />
    </>
  );
}
