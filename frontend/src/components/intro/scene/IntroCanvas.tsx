"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA, COLORS, DPR_MAX } from "@/lib/config";
import { introState } from "../introState";
import IntroCamera from "./IntroCamera";
import Starfield from "./Starfield";
import Earth from "./Earth";
import HeartBeacon from "./HeartBeacon";
import Rocket from "./Rocket";
import Trail from "./Trail";
import Mars from "./Mars";

interface SceneDisposalGuardProps {
  onContextLost?: () => void;
}

function SceneDisposalGuard({ onContextLost }: SceneDisposalGuardProps) {
  const { gl, scene } = useThree();
  const onContextLostRef = useRef(onContextLost);
  onContextLostRef.current = onContextLost;

  useEffect(() => {
    const domEl = gl.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      introState.sceneLive = false;
      onContextLostRef.current?.();
    };

    const handleContextRestored = () => {
      gl.setClearColor(COLORS.void, 1);
    };

    domEl.addEventListener("webglcontextlost", handleContextLost);
    domEl.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      domEl.removeEventListener("webglcontextlost", handleContextLost);
      domEl.removeEventListener("webglcontextrestored", handleContextRestored);
      introState.sceneLive = false;

      // Traverse scene on unmount to guarantee zero leaked geometries, materials, or textures
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of materials) {
            for (const value of Object.values(mat)) {
              if (value instanceof THREE.Texture) {
                value.dispose();
              }
            }
            mat.dispose();
          }
        }
      });

      gl.renderLists.dispose();
      gl.dispose();
    };
  }, [gl, scene]);

  return null;
}

interface IntroCanvasProps {
  isPortrait: boolean;
  inView: boolean;
  onContextLost?: () => void;
}

export default function IntroCanvas({
  isPortrait,
  inView,
  onContextLost,
}: IntroCanvasProps) {
  const rocketGroupRef = useRef<THREE.Group>(null);
  const [degraded, setDegraded] = useState(false);

  const maxDpr = isPortrait ? DPR_MAX.portrait : DPR_MAX.landscape;
  const dpr: [number, number] = degraded ? [1, 1] : [1, maxDpr];

  return (
    <Canvas
      aria-hidden="true"
      dpr={dpr}
      frameloop={inView ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 10], fov: CAMERA.fov }}
      onCreated={({ gl }) => {
        gl.setClearColor(COLORS.void, 1);
        gl.domElement.setAttribute("aria-hidden", "true");
      }}
    >
      <color attach="background" args={[COLORS.void]} />
      <SceneDisposalGuard onContextLost={onContextLost} />
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <IntroCamera isPortrait={isPortrait} rocketGroupRef={rocketGroupRef} />
      <Starfield isPortrait={isPortrait} />
      <Earth isPortrait={isPortrait} />
      <Mars isPortrait={isPortrait} />
      <HeartBeacon isPortrait={isPortrait} />
      <Rocket isPortrait={isPortrait} rocketGroupRef={rocketGroupRef} />
      <Trail
        isPortrait={isPortrait}
        rocketGroupRef={rocketGroupRef}
        qualityScale={degraded ? 0.5 : 1}
      />
    </Canvas>
  );
}
