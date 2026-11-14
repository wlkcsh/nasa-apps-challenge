"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "@/lib/config";
import { introState } from "../introState";

const MARS_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const MARS_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform vec3 uRust;
uniform vec3 uSoil;
uniform vec3 uDark;
uniform vec3 uBone;
uniform float uRimIntensity;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.12;
    a *= 0.5;
  }
  return v;
}

// Ridged multifractal for Valles Marineris canyon & crater rim relief
float sampleMarsHeight(vec3 nPos) {
  float base = fbm(nPos * 2.8 + vec3(1.2, 0.5, -0.7));
  float ridge = 1.0 - abs(noise(nPos * 6.5) * 2.0 - 1.0);
  float craters = smoothstep(0.35, 0.72, noise(nPos * 11.0));
  return base * 0.65 + ridge * ridge * 0.25 - craters * 0.12;
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  vec3 baseN = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(uSunDir);

  float h = sampleMarsHeight(nLocal);
  float eps = 0.008;
  float hx = sampleMarsHeight(normalize(nLocal + vec3(eps, 0.0, 0.0))) - h;
  float hy = sampleMarsHeight(normalize(nLocal + vec3(0.0, eps, 0.0))) - h;
  float hz = sampleMarsHeight(normalize(nLocal + vec3(0.0, 0.0, eps))) - h;
  vec3 bumpGrad = vec3(hx, hy, hz) / eps;

  vec3 N = normalize(baseN - bumpGrad * 0.11);

  // Basalt dark valleys (#3A1205) -> iron oxide rust plains (#C1440E) -> ochre dust plateaus (#C9A24A)
  vec3 base = mix(uDark, uRust, smoothstep(0.22, 0.58, h));
  base = mix(base, uSoil, smoothstep(0.55, 0.82, h) * 0.68);

  // Faint telemetry grid lines
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);
  float gridLat = abs(fract(lat * 6.0 / 3.14159265) - 0.5);
  float gridLon = abs(fract(lon * 12.0 / 3.14159265) - 0.5);
  float graticule = 1.0 - smoothstep(0.0, 0.02, min(gridLat, gridLon));
  base += uSoil * graticule * 0.06;

  float day = smoothstep(-0.22, 0.42, dot(N, L));
  float fres = pow(1.0 - max(dot(baseN, V), 0.0), 2.8);
  vec3 rim = mix(uRust, uSoil, 0.65) * fres * uRimIntensity * 0.95;

  vec3 col = base * (0.12 + 0.88 * day) + rim;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RIPPLE_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIPPLE_FRAG = /* glsl */ `
uniform float uRipple;
uniform vec3 uColor;
uniform vec3 uSoil;

varying vec2 vUv;

void main() {
  if (uRipple <= 0.001 || uRipple >= 0.999) discard;
  vec2 p = (vUv - 0.5) * 2.0;
  float dist = length(p);
  float ring1 = exp(-pow((dist - uRipple) / 0.055, 2.0));
  float ring2 = exp(-pow((dist - uRipple * 0.68) / 0.04, 2.0)) * 0.65;
  float alpha = (ring1 + ring2) * pow(1.0 - uRipple, 1.6);
  if (alpha < 0.005) discard;
  vec3 col = mix(uColor, uSoil, ring2);
  gl_FragColor = vec4(col, alpha);
}
`;

export const MARS_RADIUS = 1.45;

export function getMarsPosition(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean,
  marsInOffset: number
): THREE.Vector3 {
  if (isPortrait) {
    return new THREE.Vector3(
      0,
      -viewportHeight * 0.44 - marsInOffset * 0.9,
      -0.6
    );
  }
  return new THREE.Vector3(
    viewportWidth * 0.41 + marsInOffset,
    viewportHeight * 0.1,
    -0.5
  );
}

export function getMarsLandingAnchor(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean,
  marsInOffset = 0
): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const marsCenter = getMarsPosition(
    viewportWidth,
    viewportHeight,
    isPortrait,
    marsInOffset
  );

  // Place landing site on the camera-facing left-upper limb so the landed rocket is seen in crisp side-profile
  const landingNormal = isPortrait
    ? new THREE.Vector3(-0.12, 0.86, 0.5).normalize()
    : new THREE.Vector3(-0.84, 0.24, 0.48).normalize();

  const position = marsCenter
    .clone()
    .addScaledVector(landingNormal, MARS_RADIUS * 1.02);

  return { position, normal: landingNormal };
}

interface MarsProps {
  isPortrait: boolean;
}

export default function Mars({ isPortrait }: MarsProps) {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const rippleMeshRef = useRef<THREE.Mesh | null>(null);

  const { marsGeo, marsMat, rippleGeo, rippleMat } = useMemo(() => {
    const mGeo = new THREE.SphereGeometry(MARS_RADIUS, 64, 64);
    const mMat = new THREE.ShaderMaterial({
      vertexShader: MARS_VERT,
      fragmentShader: MARS_FRAG,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(-0.55, 0.45, 0.7).normalize() },
        uTime: { value: 0 },
        uRust: { value: new THREE.Color(COLORS.rust) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
        uDark: { value: new THREE.Color("#331004") },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uRimIntensity: { value: 1 },
      },
    });

    const rGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const rMat = new THREE.ShaderMaterial({
      vertexShader: RIPPLE_VERT,
      fragmentShader: RIPPLE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uRipple: { value: 0 },
        uColor: { value: new THREE.Color(COLORS.heart) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
      },
    });

    return {
      marsGeo: mGeo,
      marsMat: mMat,
      rippleGeo: rGeo,
      rippleMat: rMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      marsGeo.dispose();
      marsMat.dispose();
      rippleGeo.dispose();
      rippleMat.dispose();
    };
  }, [marsGeo, marsMat, rippleGeo, rippleMat]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const marsCenter = getMarsPosition(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );
    if (groupRef.current) {
      groupRef.current.position.copy(marsCenter);
      groupRef.current.rotation.y = elapsed * 0.05;
    }

    const { position: landingPos, normal: landingNormal } =
      getMarsLandingAnchor(
        viewport.width,
        viewport.height,
        isPortrait,
        introState.marsIn
      );

    if (rippleMeshRef.current) {
      rippleMeshRef.current.position.copy(landingPos);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        landingNormal
      );
      rippleMeshRef.current.quaternion.copy(q);
    }

    marsMat.uniforms.uTime.value = elapsed;
    rippleMat.uniforms.uRipple.value = introState.marsRipple;
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh geometry={marsGeo} material={marsMat} />
      </group>
      <mesh ref={rippleMeshRef} geometry={rippleGeo} material={rippleMat} />
    </>
  );
}
