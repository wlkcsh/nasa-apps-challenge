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
uniform vec3 uLand;
uniform vec3 uSoil;
uniform vec3 uOceanDeep;
uniform vec3 uOceanMid;
uniform vec3 uHeart;
uniform vec3 uBone;
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
    p = rot * p * 2.06 + vec3(0.13, -0.27, 0.41);
    a *= 0.5;
  }
  return v;
}

float sampleHeight(vec3 nPos) {
  float elev = fbm(nPos * 2.55 + vec3(0.45, -0.25, 0.72));
  float detail = fbm(nPos * 8.4 + vec3(1.3, 0.8, -0.5));
  return elev * 0.78 + detail * 0.22;
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  vec3 baseN = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(uSunDir);

  float h = sampleHeight(nLocal);
  float detail = fbm(nLocal * 8.4 + vec3(1.3, 0.8, -0.5));

  // Finite-difference topographic bump normal for crisp mountain/basin relief
  float eps = 0.008;
  float hx = sampleHeight(normalize(nLocal + vec3(eps, 0.0, 0.0))) - h;
  float hy = sampleHeight(normalize(nLocal + vec3(0.0, eps, 0.0))) - h;
  float hz = sampleHeight(normalize(nLocal + vec3(0.0, 0.0, eps))) - h;
  vec3 bumpGrad = vec3(hx, hy, hz) / eps;

  float landMask = smoothstep(0.482, 0.515, h);
  float shelfMask = smoothstep(0.38, 0.50, h);

  // Perturb normal on landmasses so mountain ranges catch grazing directional sunlight
  vec3 N = normalize(baseN - bumpGrad * (0.085 * landMask));

  // Rich abyssal ocean -> teal mid-ocean -> orbit cyan shallow coastal shelf
  vec3 oceanColor = mix(uOceanDeep, uOceanMid, smoothstep(0.20, 0.44, h));
  oceanColor = mix(oceanColor, uRimColor * 0.58, shelfMask * 0.68);

  // Land biomes: Vigor emerald (#10B981) agricultural valleys -> Soil gold (#C9A24A) steppes -> snow peaks
  float aridFactor = smoothstep(0.40, 0.66, detail + abs(nLocal.y) * 0.12);
  vec3 landColor = mix(uLand * 0.68, uSoil * 0.88, aridFactor);
  float alpine = smoothstep(0.63, 0.77, h);
  landColor = mix(landColor, uBone * 0.82, alpine * 0.55);

  vec3 surfaceColor = mix(oceanColor, landColor, landMask);

  // Faint cyan lat/lon telemetry graticule
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);
  float gridLat = abs(fract(lat * 6.0 / 3.14159265) - 0.5);
  float gridLon = abs(fract(lon * 12.0 / 3.14159265) - 0.5);
  float graticule = 1.0 - smoothstep(0.0, 0.02, min(gridLat, gridLon));
  surfaceColor += uRimColor * graticule * (0.06 + 0.06 * (1.0 - landMask));

  // Animated drifting cloud wisps with subtle shadow
  vec3 cloudCoord = nLocal * 3.3 + vec3(uTime * 0.015, -uTime * 0.007, uTime * 0.011);
  float cloudNoise = fbm(cloudCoord);
  float clouds = smoothstep(0.56, 0.76, cloudNoise) * 0.26;
  surfaceColor = mix(surfaceColor, uBone, clouds);

  // Day/night terminator with warm sunset scattering band
  float NoL = dot(N, L);
  float baseNoL = dot(baseN, L);
  float day = smoothstep(-0.20, 0.38, NoL);
  float twilightBand = exp(-pow((baseNoL - 0.02) / 0.16, 2.0)) * 0.28;

  // Blinn-Phong sun specular glint masked strictly to ocean pixels
  vec3 H = normalize(L + V);
  float specBase = pow(max(dot(baseN, H), 0.0), 72.0);
  float oceanSpec = specBase * (1.0 - landMask) * day * 0.72;
  vec3 specColor = mix(uRimColor, uBone, 0.6) * oceanSpec;

  // Night-side golden city light clusters & Central Asian telemetry network
  vec3 tDir = normalize(uTashkentLocal);
  float distTashkent = distance(nLocal, tDir);
  float cityNoise = pow( clamp(fbm(nLocal * 18.0), 0.0, 1.0), 4.2 );
  float regionalHub = exp(-distTashkent * 3.8);
  float nightMask = smoothstep(0.18, -0.25, baseNoL) * landMask;
  vec3 cityLights = mix(uSoil, uBone, 0.35) * (cityNoise * 2.4 + regionalHub * 0.45) * nightMask * 0.85;

  // Crisp Tashkent telemetry radar ring
  float coreHalo = exp(-distTashkent * 34.0) * 0.65;
  float radarPhase = fract(uTime * 0.55);
  float radarRadius = 0.025 + radarPhase * 0.13;
  float radarRing = exp(-pow((distTashkent - radarRadius) / 0.007, 2.0)) * pow(1.0 - radarPhase, 1.5);

  // Fresnel atmosphere surface rim
  float fres = pow(1.0 - max(dot(baseN, V), 0.0), uRimPower);
  float rim = fres * mix(0.42, 1.0, smoothstep(-0.3, 0.5, baseNoL)) * uRimIntensity;

  vec3 litSurface = surfaceColor * (0.14 + day * 0.86)
                  + uSoil * twilightBand * landMask
                  + specColor
                  + cityLights;
  litSurface += uHeart * coreHalo;
  litSurface += uRimColor * radarRing * 0.85 * uRimIntensity;
  vec3 finalColor = litSurface + mix(uRimColor, uBone, fres * 0.35) * rim * 1.15;

  gl_FragColor = vec4(finalColor, 1.0);
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
  float limb = pow(1.0 - viewDot, 2.6) * smoothstep(0.0, 0.46, viewDot);
  float sunWeight = mix(0.38, 1.0, smoothstep(-0.35, 0.55, dot(N, normalize(uSunDir))));
  float alpha = limb * sunWeight * uRimIntensity * 0.82;

  vec3 col = mix(uVoidColor, uRimColor, clamp(limb * 1.3, 0.0, 1.0));
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
  return new THREE.Vector3(-viewportWidth * 0.37, -viewportHeight * 0.12, -0.5);
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
        uLand: { value: new THREE.Color(COLORS.vigor) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
        uOceanDeep: { value: new THREE.Color("#06162E") },
        uOceanMid: { value: new THREE.Color("#0D3B5E") },
        uHeart: { value: new THREE.Color(COLORS.heart) },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uTashkentLocal: { value: localTashkent },
      },
    });

    const hGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.13, 48, 48);
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
