"use client";

import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, RIM_POWER, TASHKENT } from "@/lib/config";
import { introState } from "../introState";

const EARTH_VERT = /* glsl */ `
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

const EARTH_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uRimColor;
uniform float uRimIntensity;
uniform float uRimPower;
uniform float uTime;
uniform vec3 uOceanAbyss;
uniform vec3 uOceanMid;
uniform vec3 uLandTemperate;
uniform vec3 uLandArid;
uniform vec3 uSnow;
uniform vec3 uBone;
uniform vec3 uCityLights;
uniform vec3 uTashkentLocal;

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
    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
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
    p = rot * p * 2.02 + vec3(0.13, -0.27, 0.41);
    a *= 0.5;
  }
  return v;
}

// Multi-octave domain-warped continental elevation model
float sampleContinentalElevation(vec3 nPos) {
  vec3 q = vec3(
    fbm(nPos * 1.6 + vec3(0.0, 0.0, 0.0)),
    fbm(nPos * 1.6 + vec3(5.2, 1.3, 2.8)),
    fbm(nPos * 1.6 + vec3(1.8, 4.2, 3.1))
  );
  vec3 r = vec3(
    fbm(nPos * 1.6 + 3.2 * q + vec3(1.7, 9.2, 0.5)),
    fbm(nPos * 1.6 + 3.2 * q + vec3(8.3, 2.8, 1.2)),
    fbm(nPos * 1.6 + 3.2 * q + vec3(2.4, 5.1, 7.3))
  );
  float elev = fbm(nPos * 1.8 + 2.0 * r);
  float detail = fbm(nPos * 6.5);
  return elev * 0.78 + detail * 0.22;
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  vec3 baseN = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(uSunDir);

  float h = sampleContinentalElevation(nLocal);

  // Finite-difference topographic bump normal for mountain ranges
  float eps = 0.008;
  float hx = sampleContinentalElevation(normalize(nLocal + vec3(eps, 0.0, 0.0))) - h;
  float hy = sampleContinentalElevation(normalize(nLocal + vec3(0.0, eps, 0.0))) - h;
  float hz = sampleContinentalElevation(normalize(nLocal + vec3(0.0, 0.0, eps))) - h;
  vec3 bumpGrad = vec3(hx, hy, hz) / eps;

  float landMask = smoothstep(0.485, 0.515, h);
  float shelfMask = smoothstep(0.41, 0.495, h);

  // Mountain relief perturbed normal
  vec3 N = normalize(baseN - bumpGrad * (0.075 * landMask));

  // 1. Realistic Deep Navy Oceans (#040D1A -> #0A2A4A) with shallow coastal shelf
  vec3 oceanColor = mix(uOceanAbyss, uOceanMid, smoothstep(0.20, 0.46, h));
  oceanColor = mix(oceanColor, vec3(0.05, 0.22, 0.35), shelfMask * 0.65);

  // 2. Subtle Temperate (#1B3B2B) & Arid (#5C4D3C) Landmasses with alpine snow
  float detailNoise = fbm(nLocal * 8.0);
  float aridFactor = smoothstep(0.42, 0.68, detailNoise + abs(nLocal.y) * 0.18);
  vec3 landColor = mix(uLandTemperate, uLandArid, aridFactor);
  float alpine = smoothstep(0.66, 0.78, h);
  landColor = mix(landColor, uSnow, alpine * 0.65);

  vec3 surfaceColor = mix(oceanColor, landColor, landMask);

  // 3. Dedicated High-Detail Animated Cloud Layer with Soft Drop Shadows
  vec3 cloudOffset = vec3(uTime * 0.012, -uTime * 0.004, uTime * 0.008);
  vec3 cloudCoord = nLocal * 3.4 + cloudOffset;
  float c1 = fbm(cloudCoord);
  float c2 = fbm(cloudCoord * 2.2 + vec3(1.4, 2.1, 0.7));
  float cloudDensity = smoothstep(0.49, 0.75, c1 * 0.68 + c2 * 0.32);

  // Soft cloud drop shadow on surface (offset toward sun)
  vec3 shadowCoord = (nLocal - L * 0.032) * 3.4 + cloudOffset;
  float s1 = fbm(shadowCoord);
  float s2 = fbm(shadowCoord * 2.2 + vec3(1.4, 2.1, 0.7));
  float cloudShadow = smoothstep(0.49, 0.75, s1 * 0.68 + s2 * 0.32) * 0.45;

  // 4. Crisp Day/Night Terminator (smoothstep(-0.08, 0.25, NoL))
  float NoL = dot(N, L);
  float baseNoL = dot(baseN, L);
  float day = smoothstep(-0.08, 0.25, NoL);
  float twilightBand = exp(-pow((baseNoL - 0.02) / 0.14, 2.0)) * 0.24;

  // Ocean Blinn-Phong specular glint
  vec3 H = normalize(L + V);
  float specBase = pow(max(dot(baseN, H), 0.0), 64.0);
  float oceanSpec = specBase * (1.0 - landMask) * (1.0 - cloudDensity) * day * 0.75;
  vec3 specColor = vec3(0.85, 0.95, 1.0) * oceanSpec;

  // Darken surface under cloud shadows during daylight
  surfaceColor *= (1.0 - cloudShadow * day);

  // Night-side subtle golden city light clusters
  vec3 tDir = normalize(uTashkentLocal);
  float distTashkent = distance(nLocal, tDir);
  float cityNoise = pow(clamp(fbm(nLocal * 16.0), 0.0, 1.0), 4.2);
  float regionalHub = exp(-distTashkent * 4.0);
  float nightMask = smoothstep(0.12, -0.18, baseNoL) * landMask;
  vec3 cityLights = uCityLights * (cityNoise * 2.2 + regionalHub * 0.6) * nightMask * 0.75;

  // Blend in illuminated clouds with subtle Rayleigh tint
  vec3 cloudColor = mix(vec3(0.08, 0.12, 0.20), uBone, day);
  surfaceColor = mix(surfaceColor, cloudColor, cloudDensity * 0.88);

  // 5. Thin Rayleigh Atmospheric Limb Halo
  float fres = pow(1.0 - max(dot(baseN, V), 0.0), uRimPower);
  float rayleighSun = mix(0.35, 1.0, smoothstep(-0.25, 0.45, baseNoL));
  float rayleighRim = fres * rayleighSun * uRimIntensity;
  vec3 atmosphericRim = mix(uRimColor, vec3(0.55, 0.82, 1.0), 0.45) * rayleighRim * 1.05;

  vec3 litSurface = surfaceColor * (0.05 + day * 0.95)
                  + uLandArid * twilightBand * landMask
                  + specColor
                  + cityLights
                  + atmosphericRim;

  gl_FragColor = vec4(litSurface, 1.0);
}
`;

const HALO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uRimColor;
uniform vec3 uVoidColor;
uniform float uRimIntensity;

varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);

  float viewDot = max(dot(-N, V), 0.0);
  float limb = pow(1.0 - viewDot, 3.2) * smoothstep(0.0, 0.38, viewDot);
  float sunWeight = mix(0.30, 1.0, smoothstep(-0.30, 0.50, dot(N, normalize(uSunDir))));
  float alpha = limb * sunWeight * uRimIntensity * 0.85;

  vec3 col = mix(uVoidColor, mix(uRimColor, vec3(0.50, 0.80, 1.0), 0.4), clamp(limb * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}
`;

export const EARTH_RADIUS = 1.85;

export function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

export function getEarthPosition(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): THREE.Vector3 {
  if (isPortrait) {
    return new THREE.Vector3(0, viewportHeight * 0.46, -0.6);
  }
  return new THREE.Vector3(-viewportWidth * 0.48, -viewportHeight * 0.12, -0.5);
}

export function getTashkentWorldAnchor(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): { position: THREE.Vector3; normal: THREE.Vector3; earthQuat: THREE.Quaternion } {
  const earthCenter = getEarthPosition(viewportWidth, viewportHeight, isPortrait);
  const localTashkent = latLonToUnitVector(TASHKENT.lat, TASHKENT.lon);

  const desiredWorldNormal = isPortrait
    ? new THREE.Vector3(0.08, -0.55, 0.83).normalize()
    : new THREE.Vector3(0.58, 0.22, 0.78).normalize();

  const earthQuat = new THREE.Quaternion().setFromUnitVectors(
    localTashkent,
    desiredWorldNormal
  );

  const worldNormal = localTashkent.clone().applyQuaternion(earthQuat).normalize();
  const anchorPos = earthCenter
    .clone()
    .addScaledVector(worldNormal, EARTH_RADIUS * 1.02);

  return { position: anchorPos, normal: worldNormal, earthQuat };
}

interface EarthProps {
  isPortrait: boolean;
}

export default function Earth({ isPortrait }: EarthProps) {
  const { viewport } = useThree();

  const { geometry, material, haloGeometry, haloMaterial } = useMemo(() => {
    const geo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const localTashkent = latLonToUnitVector(TASHKENT.lat, TASHKENT.lon);
    const sunDir = new THREE.Vector3(0.65, 0.4, 0.65).normalize();

    const mat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      uniforms: {
        uSunDir: { value: sunDir },
        uRimColor: { value: new THREE.Color(COLORS.orbit) },
        uRimIntensity: { value: 0 },
        uRimPower: { value: RIM_POWER },
        uTime: { value: 0 },
        uOceanAbyss: { value: new THREE.Color("#040D1A") },
        uOceanMid: { value: new THREE.Color("#0A2A4A") },
        uLandTemperate: { value: new THREE.Color("#1B3B2B") },
        uLandArid: { value: new THREE.Color("#5C4D3C") },
        uSnow: { value: new THREE.Color("#E6ECEF") },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uCityLights: { value: new THREE.Color(COLORS.soil) },
        uTashkentLocal: { value: localTashkent },
      },
    });

    const hGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.11, 48, 48);
    const hMat = new THREE.ShaderMaterial({
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSunDir: { value: sunDir },
        uRimColor: { value: new THREE.Color(COLORS.orbit) },
        uVoidColor: { value: new THREE.Color(COLORS.void) },
        uRimIntensity: { value: 0 },
      },
    });

    return {
      geometry: geo,
      material: mat,
      haloGeometry: hGeo,
      haloMaterial: hMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
    };
  }, [geometry, material, haloGeometry, haloMaterial]);

  const earthCenter = getEarthPosition(
    viewport.width,
    viewport.height,
    isPortrait
  );
  const { earthQuat } = getTashkentWorldAnchor(
    viewport.width,
    viewport.height,
    isPortrait
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    material.uniforms.uRimIntensity.value = introState.rim;
    haloMaterial.uniforms.uRimIntensity.value = introState.rim;
  });

  return (
    <group position={earthCenter}>
      <mesh
        quaternion={earthQuat}
        geometry={geometry}
        material={material}
      />
      <mesh geometry={haloGeometry} material={haloMaterial} />
    </group>
  );
}
