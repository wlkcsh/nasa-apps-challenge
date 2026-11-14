"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HEART_BPM } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

const HEART_SDF_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HEART_SDF_FRAG = /* glsl */ `
uniform float uTime;
uniform float uBpm;
uniform float uBeatAmp;
uniform float uOpacity;
uniform vec3 uColor;
uniform vec3 uBone;

varying vec2 vUv;

// Exact 2D signed distance to a classic symmetrical heart (Inigo Quilez SDF)
float dot2(in vec2 v) { return dot(v, v); }

float sdHeart(in vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0)
    return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.00, 1.00)),
                  dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

void main() {
  if (uOpacity <= 0.005) discard;

  float t = fract(uTime * uBpm / 60.0);
  float beat = exp(-pow((t - 0.08) / 0.05, 2.0))
             + 0.6 * exp(-pow((t - 0.30) / 0.06, 2.0));

  // Map UV to centered heart coordinates with generous margin so it never clips
  vec2 p = (vUv - 0.5) * 2.8;
  p /= (1.0 + 0.12 * beat * uBeatAmp);
  p.y += 0.52;

  float d = sdHeart(p);

  // Crisp sculpted 3D-like bevel shading inside the heart SDF
  float coreMask = 1.0 - smoothstep(-0.02, 0.025, d);
  float innerBevel = smoothstep(0.0, -0.22, d);
  float rimHighlight = smoothstep(-0.07, -0.01, d) * coreMask;

  // Soft outer radial glow that fades smoothly to 0 before quad edges
  float distFromCenter = length((vUv - 0.5) * 2.0);
  float quadFade = smoothstep(0.98, 0.35, distFromCenter);
  float outerAura = exp(-4.5 * max(d, 0.0)) * (0.38 + 0.45 * beat) * quadFade;

  vec3 heartCol = mix(uColor * 0.85, uBone, innerBevel * 0.42 + rimHighlight * 0.55);
  vec3 finalRgb = mix(uColor, heartCol, coreMask);
  float alpha = clamp(coreMask * 0.96 + outerAura * 0.75, 0.0, 1.0) * uOpacity;

  if (alpha < 0.005) discard;
  gl_FragColor = vec4(finalRgb, alpha);
}
`;

interface HeartBeaconProps {
  isPortrait: boolean;
}

export default function HeartBeacon({ isPortrait }: HeartBeaconProps) {
  const { viewport, camera } = useThree();
  const earthHeartGroupRef = useRef<THREE.Group | null>(null);
  const earthBillboardRef = useRef<THREE.Mesh | null>(null);
  const orbitRingRef = useRef<THREE.Mesh | null>(null);

  const marsHeartGroupRef = useRef<THREE.Group | null>(null);
  const marsBillboardRef = useRef<THREE.Mesh | null>(null);
  const marsRingRef = useRef<THREE.Mesh | null>(null);

  const { haloGeo, ringGeo, earthHaloMat, marsHaloMat, ringMat, marsRingMat } =
    useMemo(() => {
      const qGeo = new THREE.PlaneGeometry(0.82, 0.82);
      const rGeo = new THREE.RingGeometry(0.24, 0.26, 48);

      const makeHeartShader = () =>
        new THREE.ShaderMaterial({
          vertexShader: HEART_SDF_VERT,
          fragmentShader: HEART_SDF_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uTime: { value: 0 },
            uBpm: { value: HEART_BPM },
            uBeatAmp: { value: 1 },
            uOpacity: { value: 1 },
            uColor: { value: new THREE.Color(COLORS.heart) },
            uBone: { value: new THREE.Color(COLORS.bone) },
          },
        });

      const rMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLORS.orbit),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mrMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLORS.heart),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return {
        haloGeo: qGeo,
        ringGeo: rGeo,
        earthHaloMat: makeHeartShader(),
        marsHaloMat: makeHeartShader(),
        ringMat: rMat,
        marsRingMat: mrMat,
      };
    }, []);

  useEffect(() => {
    return () => {
      haloGeo.dispose();
      ringGeo.dispose();
      earthHaloMat.dispose();
      marsHaloMat.dispose();
      ringMat.dispose();
      marsRingMat.dispose();
    };
  }, [haloGeo, ringGeo, earthHaloMat, marsHaloMat, ringMat, marsRingMat]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const { position: tashkentPos, normal: tashkentNormal } =
      getTashkentWorldAnchor(viewport.width, viewport.height, isPortrait);

    // Detach/ascend smoothly into rocket during liftoff (p: 0.0 -> 0.12)
    const detachProgress = THREE.MathUtils.clamp(introState.p / 0.12, 0, 1);
    const earthOpacity = introState.rim * (1 - detachProgress * 0.65);

    if (earthHeartGroupRef.current) {
      earthHeartGroupRef.current.position
        .copy(tashkentPos)
        .addScaledVector(tashkentNormal, 0.08 + detachProgress * 0.25);
    }

    if (earthBillboardRef.current) {
      earthBillboardRef.current.quaternion.copy(camera.quaternion);
    }

    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.set(
        Math.PI * 0.32 + Math.sin(elapsed * 0.9) * 0.1,
        elapsed * 1.1,
        Math.PI * 0.15
      );
    }

    earthHaloMat.uniforms.uTime.value = elapsed;
    earthHaloMat.uniforms.uBeatAmp.value = introState.beat;
    earthHaloMat.uniforms.uOpacity.value = earthOpacity;
    ringMat.opacity = earthOpacity * 0.5;

    // Mars landing heart marker - positioned cleanly at the surface anchor below the landed rocket
    const marsAnchor = getMarsLandingAnchor(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );

    if (marsHeartGroupRef.current) {
      marsHeartGroupRef.current.position
        .copy(marsAnchor.position)
        .addScaledVector(marsAnchor.normal, 0.05);
    }

    if (marsBillboardRef.current) {
      marsBillboardRef.current.quaternion.copy(camera.quaternion);
    }

    if (marsRingRef.current) {
      marsRingRef.current.rotation.set(
        Math.PI * 0.32,
        -elapsed * 1.1,
        Math.PI * 0.15
      );
    }

    marsHaloMat.uniforms.uTime.value = elapsed;
    marsHaloMat.uniforms.uBeatAmp.value = 1;
    marsHaloMat.uniforms.uOpacity.value = introState.marsHeart;
    marsRingMat.opacity = introState.marsHeart * 0.55;
  });

  return (
    <>
      <group ref={earthHeartGroupRef}>
        <mesh
          ref={earthBillboardRef}
          geometry={haloGeo}
          material={earthHaloMat}
        />
        <mesh ref={orbitRingRef} geometry={ringGeo} material={ringMat} />
      </group>

      <group ref={marsHeartGroupRef}>
        <mesh
          ref={marsBillboardRef}
          geometry={haloGeo}
          material={marsHaloMat}
          scale={[0.85, 0.85, 0.85]}
        />
        <mesh ref={marsRingRef} geometry={ringGeo} material={marsRingMat} />
      </group>
    </>
  );
}
