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
uniform vec3 uOchre;
uniform vec3 uBasalt;
uniform vec3 uPolarIce;
uniform vec3 uDustRim;
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
  mat3 rot = mat3(
    0.80,  0.60,  0.00,
   -0.60,  0.80,  0.00,
    0.00,  0.00,  1.00
  );
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.12 + vec3(0.15, -0.25, 0.35);
    a *= 0.5;
  }
  return v;
}

// Ridged multifractal for Valles Marineris canyon rifts & crater relief
float sampleMarsHeight(vec3 nPos) {
  float base = fbm(nPos * 2.6 + vec3(1.2, 0.5, -0.7));
  float ridge = 1.0 - abs(noise(nPos * 6.0) * 2.0 - 1.0);
  float craters = smoothstep(0.38, 0.72, noise(nPos * 11.5));
  return base * 0.65 + ridge * ridge * 0.26 - craters * 0.11;
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

  vec3 N = normalize(baseN - bumpGrad * 0.095);

  // 1. Realistic dusty rust (#8C3B1E), bright ochre (#B85A32), and dark basalt (#4A1C0D)
  vec3 regolith = mix(uBasalt, uRust, smoothstep(0.24, 0.56, h));
  regolith = mix(regolith, uOchre, smoothstep(0.52, 0.80, h) * 0.65);

  // 2. Polar ice cap hint at north pole
  float polarNoise = fbm(nLocal * 6.5) * 0.045;
  float polarCap = smoothstep(0.82, 0.92, nLocal.y + polarNoise);
  regolith = mix(regolith, uPolarIce, polarCap * 0.88);

  // Fine lat/lon telemetry graticule
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);
  float gridLat = abs(fract(lat * 6.0 / 3.14159265) - 0.5);
  float gridLon = abs(fract(lon * 12.0 / 3.14159265) - 0.5);
  float graticule = 1.0 - smoothstep(0.0, 0.02, min(gridLat, gridLon));
  regolith += uOchre * graticule * 0.04;

  // 3. Strong day/night shadow terminator (ambient strictly 0.04 instead of 0.12)
  float NoL = dot(N, L);
  float day = smoothstep(-0.06, 0.28, NoL);
  float ambient = 0.04;

  // 4. Subtle dusty-amber atmospheric rim
  float fres = pow(1.0 - max(dot(baseN, V), 0.0), 3.2);
  vec3 rim = uDustRim * fres * uRimIntensity * 0.72;

  vec3 col = regolith * (ambient + (1.0 - ambient) * day) + rim;
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
  float ring1 = exp(-pow((dist - uRipple) / 0.045, 2.0));
  float ring2 = exp(-pow((dist - uRipple * 0.68) / 0.035, 2.0)) * 0.6;
  float alpha = (ring1 + ring2) * pow(1.0 - uRipple, 1.5) * 0.85;
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
  marsInOffset = 0,
  pOverride?: number
): THREE.Vector3 {
  const p = pOverride !== undefined ? pOverride : introState.p;
  if (isPortrait) {
    const glide = p < 0.68 ? (1.0 - p / 0.68) * 3.5 : 0;
    return new THREE.Vector3(
      0,
      -viewportHeight * 0.44 - glide,
      -0.6
    );
  }

  // In landscape:
  // Position Mars at x = viewport.width * 0.42 + marsInOffset, y = -0.05
  // so the entire sphere sits cleanly inside the right side of the frame with full margin.
  const targetX = viewportWidth * 0.42;

  // Between p = 0.68 and p = 0.85, Mars glides smoothly into view from off-screen right
  // Prior to p = 0.68, Mars is placed beyond the right edge, keeping deep space empty
  const glideFactor = p < 0.68
    ? 1.0
    : 1.0 - THREE.MathUtils.smoothstep(p, 0.68, 0.85);
  const glideOffset = glideFactor * (viewportWidth * 0.45 + MARS_RADIUS);

  return new THREE.Vector3(
    targetX + glideOffset + marsInOffset,
    -0.05,
    -0.5
  );
}

export function getMarsLandingAnchor(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean,
  marsInOffset = 0,
  pOverride?: number
): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const marsCenter = getMarsPosition(
    viewportWidth,
    viewportHeight,
    isPortrait,
    marsInOffset,
    pOverride !== undefined ? pOverride : 1.0
  );

  // Upper-left sunlit limb approach (orbital pass tangent to Mars)
  const landingNormal = isPortrait
    ? new THREE.Vector3(-0.12, 0.86, 0.5).normalize()
    : new THREE.Vector3(-0.62, 0.68, 0.39).normalize();

  const position = marsCenter
    .clone()
    .addScaledVector(landingNormal, MARS_RADIUS * 1.03);

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
        uRust: { value: new THREE.Color("#8C3B1E") },
        uOchre: { value: new THREE.Color("#B85A32") },
        uBasalt: { value: new THREE.Color("#4A1C0D") },
        uPolarIce: { value: new THREE.Color("#DFE6EC") },
        uDustRim: { value: new THREE.Color("#C9A24A") },
        uRimIntensity: { value: 1 },
      },
    });

    const rGeo = new THREE.PlaneGeometry(1.2, 1.2);
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
        introState.marsIn,
        introState.p
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
