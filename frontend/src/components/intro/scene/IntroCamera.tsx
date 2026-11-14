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
  const { camera } = useThree();
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

    const rocket = rocketGroupRef.current;
    const rocketTrackX = rocket ? rocket.position.x * CAMERA.track : 0;
    const portraitFramingY = isPortrait
      ? (0.5 - introState.p) * PORTRAIT_STACK_SPAN
      : 0;

    camera.position.x =
      introState.camX + rocketTrackX + pointerCurrent.current.x;
    camera.position.y = portraitFramingY + pointerCurrent.current.y;
    camera.position.z = introState.camZ;
    camera.lookAt(0, portraitFramingY * 0.35, 0);
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
