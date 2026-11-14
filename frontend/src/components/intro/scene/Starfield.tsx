"use client";

import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STAR_COUNT } from "@/lib/config";
import { introState } from "../introState";

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;

varying float vTwinkle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.65 + 0.35 * sin(uTime * 2.2 + aPhase);
  vTwinkle = twinkle;

  gl_PointSize = aSize * uPixelRatio * (18.0 / max(1.0, -mvPosition.z));
}
`;

const STAR_FRAG = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  if (r > 1.0) discard;

  float soft = pow(1.0 - r, 1.8);
  vec3 bone = vec3(0.98, 0.973, 0.961);
  vec3 cyanTint = vec3(0.024, 0.714, 0.831);
  vec3 col = mix(bone, cyanTint, 0.18 * (1.0 - vTwinkle));

  gl_FragColor = vec4(col, soft * vTwinkle * uOpacity);
}
`;

interface StarfieldProps {
  isPortrait: boolean;
}

export default function Starfield({ isPortrait }: StarfieldProps) {
  const { gl } = useThree();
  const count = isPortrait ? STAR_COUNT.portrait : STAR_COUNT.landscape;

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution across camera frustum depth
      const seed = i * 12.9898;
      const rx = Math.sin(seed) * 43758.5453;
      const ry = Math.sin(seed + 1.23) * 23421.6312;
      const rz = Math.sin(seed + 2.47) * 65432.1234;
      const rs = Math.sin(seed + 3.91) * 19283.4756;

      const ux = rx - Math.floor(rx);
      const uy = ry - Math.floor(ry);
      const uz = rz - Math.floor(rz);
      const us = rs - Math.floor(rs);

      positions[i * 3 + 0] = (ux - 0.5) * 32.0;
      positions[i * 3 + 1] = (uy - 0.5) * 22.0;
      positions[i * 3 + 2] = -2.5 - uz * 14.0;

      sizes[i] = 1.2 + us * 2.4;
      phases[i] = ux * Math.PI * 2.0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      },
    });

    return { geometry: geo, material: mat };
  }, [count, gl]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uOpacity.value = introState.stars;
    material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
