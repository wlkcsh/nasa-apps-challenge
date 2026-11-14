### `components/intro/scene/Earth.tsx`

```tsx
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
uniform vec3 uOcean;
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
    p = rot * p * 2.04 + vec3(0.13, -0.27, 0.41);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(uSunDir);

  // Multi-octave continental elevation & moisture fields
  float elev = fbm(nLocal * 2.65 + vec3(0.45, -0.25, 0.72));
  float detail = fbm(nLocal * 7.2 + vec3(1.3, 0.8, -0.5));
  float h = elev * 0.82 + detail * 0.18;

  // Coastal shelf & land mask
  float shelfMask = smoothstep(0.42, 0.50, h);
  float landMask = smoothstep(0.485, 0.515, h);

  // Deep ocean (#040711) -> shallow coastal shelf (#06B6D4)
  vec3 oceanColor = mix(uOcean, uRimColor * 0.44, shelfMask * 0.72);

  // Land biomes: Vigor emerald (#10B981) agricultural valleys -> Soil gold (#C9A24A) Central Asian arid basins
  float aridFactor = smoothstep(0.44, 0.68, detail + abs(nLocal.y) * 0.18);
  vec3 landColor = mix(uLand * 0.58, uSoil * 0.78, aridFactor);
  // Highland elevation tint
  float highland = smoothstep(0.62, 0.76, h);
  landColor = mix(landColor, uBone * 0.72, highland * 0.45);

  vec3 surfaceColor = mix(oceanColor, landColor, landMask);

  // Polar ice caps (#FAF8F5)
  float polar = smoothstep(0.76, 0.90, abs(nLocal.y) + (detail - 0.5) * 0.12);
  surfaceColor = mix(surfaceColor, uBone * 0.92, polar);

  // Faint cyan lat/lon telemetry graticule
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);
  float gridLat = abs(fract(lat * 6.0 / 3.14159265) - 0.5);
  float gridLon = abs(fract(lon * 12.0 / 3.14159265) - 0.5);
  float graticule = 1.0 - smoothstep(0.0, 0.024, min(gridLat, gridLon));
  surfaceColor += uRimColor * graticule * (0.09 + 0.07 * (1.0 - landMask));

  // Subtle animated drifting cloud wisps (uTime * 0.015)
  vec3 cloudCoord = nLocal * 3.4 + vec3(uTime * 0.015, -uTime * 0.008, uTime * 0.011);
  float cloudNoise = fbm(cloudCoord);
  float clouds = smoothstep(0.55, 0.74, cloudNoise) * 0.34;
  surfaceColor = mix(surfaceColor, uBone, clouds);

  // Day/night terminator lighting
  float NoL = dot(N, L);
  float day = smoothstep(-0.18, 0.38, NoL);

  // Blinn-Phong sun specular glint masked strictly to ocean pixels (1.0 - landMask)
  vec3 H = normalize(L + V);
  float specBase = pow(max(dot(N, H), 0.0), 56.0);
  float oceanSpec = specBase * (1.0 - landMask) * (1.0 - polar) * day * 0.65;
  vec3 specColor = mix(uRimColor, uBone, 0.6) * oceanSpec;

  // Crisp #E11D48 Tashkent marker + animated expanding #06B6D4 telemetry radar ring
  vec3 tDir = normalize(uTashkentLocal);
  float distTashkent = distance(nLocal, tDir);
  float coreDot = 1.0 - smoothstep(0.012, 0.024, distTashkent);
  float coreHalo = exp(-distTashkent * 30.0) * 0.9;

  float radarPhase = fract(uTime * 0.65);
  float radarRadius = 0.02 + radarPhase * 0.16;
  float radarRing = exp(-pow((distTashkent - radarRadius) / 0.011, 2.0)) * pow(1.0 - radarPhase, 1.5);

  // Fresnel atmosphere surface rim
  float fres = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  float rim = fres * mix(0.35, 1.0, day) * uRimIntensity;

  vec3 litSurface = surfaceColor * (0.07 + day * 0.93) + specColor;
  litSurface += uHeart * (coreDot * 1.35 + coreHalo);
  litSurface += uRimColor * radarRing * 1.15 * uRimIntensity;
  vec3 finalColor = litSurface + uRimColor * rim;

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

  // BackSide normal points outward from center; view alignment near the limb approaches 0
  float viewDot = max(dot(-N, V), 0.0);
  float limb = pow(1.0 - viewDot, 2.6) * smoothstep(0.0, 0.42, viewDot);
  float sunWeight = mix(0.32, 1.0, smoothstep(-0.35, 0.55, dot(N, normalize(uSunDir))));
  float alpha = limb * sunWeight * uRimIntensity * 0.78;

  vec3 col = mix(uVoidColor, uRimColor, clamp(limb * 1.25, 0.0, 1.0));
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

  // Orient the globe so Tashkent faces toward the camera & flight corridor
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
        uOcean: { value: new THREE.Color(COLORS.void) },
        uHeart: { value: new THREE.Color(COLORS.heart) },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uTashkentLocal: { value: localTashkent },
      },
    });

    const hGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.14, 48, 48);
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

```

---

### `components/intro/scene/HeartBeacon.tsx`

```tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HEART_BPM } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

const HEART_MESH_VERT = /* glsl */ `
uniform float uTime;
uniform float uBpm;
uniform float uBeatAmp;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;
varying float vBeat;

void main() {
  vLocalPos = position;
  float t = fract(uTime * uBpm / 60.0);
  float beat = exp(-pow((t - 0.08) / 0.05, 2.0))
             + 0.6 * exp(-pow((t - 0.30) / 0.06, 2.0));
  vBeat = beat;

  vec3 inflated = position + normal * (0.018 * beat * uBeatAmp);
  vec4 worldPos = modelMatrix * vec4(inflated, 1.0);
  vPosW = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const HEART_MESH_FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec3 uDeepCore;
uniform vec3 uBodyColor;
uniform vec3 uRimPink;
uniform vec3 uBoneColor;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;
varying float vBeat;

void main() {
  if (uOpacity <= 0.005) discard;

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(vec3(0.55, 0.65, 0.75));

  float NoV = max(dot(N, V), 0.0);
  float fresnel = pow(1.0 - NoV, 2.4);
  float diffuse = smoothstep(-0.25, 0.85, dot(N, L));

  // Subsurface scattering inner glow: deep crimson #7F0926 -> #E11D48 body -> #FF7A98 / #FAF8F5 rim
  float coreDepth = smoothstep(0.22, 0.0, length(vLocalPos.xy));
  vec3 baseCol = mix(uDeepCore, uBodyColor, 0.35 + 0.65 * diffuse);
  baseCol = mix(baseCol, uBodyColor * 1.45, coreDepth * (0.45 + 0.55 * vBeat));

  vec3 rimCol = mix(uRimPink, uBoneColor, fresnel * 0.55);
  vec3 finalCol = baseCol + rimCol * fresnel * (0.75 + 0.45 * vBeat);

  gl_FragColor = vec4(finalCol, uOpacity);
}
`;

const HALO_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HALO_FRAG = /* glsl */ `
uniform float uTime;
uniform float uBpm;
uniform float uBeatAmp;
uniform float uOpacity;
uniform vec3 uColor;
uniform vec3 uBone;

varying vec2 vUv;

void main() {
  if (uOpacity <= 0.005) discard;

  // Generous 3.3x UV padding so top arches and outer aura never clip the quad boundary
  vec2 p = (vUv - 0.5) * 3.3;
  p.y -= 0.08;

  float t = fract(uTime * uBpm / 60.0);
  float beat = exp(-pow((t - 0.08) / 0.05, 2.0))
             + 0.6 * exp(-pow((t - 0.30) / 0.06, 2.0));
  p /= 1.0 + 0.11 * beat * uBeatAmp;

  float a = dot(p, p) - 1.0;
  float d = a * a * a - p.x * p.x * p.y * p.y * p.y;
  float core = smoothstep(0.05, -0.04, d);
  float radial = length(p);
  // Smooth falloff to 0 before the quad edge (radial = 1.65)
  float edgeFade = smoothstep(1.62, 0.35, radial);
  float halo = exp(-2.4 * radial) * (0.45 + 0.55 * beat) * edgeFade;

  vec3 rgb = mix(uColor, uBone, core * 0.35 * beat) * (1.0 + 0.65 * beat * core);
  float alpha = (core * 0.55 + 0.85 * halo) * uOpacity;

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(rgb, alpha);
}
`;

/**
 * Builds a true sculpted 3D volumetric heart BufferGeometry with smooth front and back
 * curvature and computed vertex normals (no flat extrude slabs).
 */
function createVolumetricHeartGeometry(
  uSteps = 56,
  vSteps = 28,
  scale = 0.22
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= vSteps; iv++) {
    const v = (iv / vSteps) * Math.PI; // 0 (front pole) -> PI (back pole)
    const sinV = Math.sin(v);
    const cosV = Math.cos(v);

    for (let iu = 0; iu <= uSteps; iu++) {
      const u = (iu / uSteps) * Math.PI * 2;
      const sinU = Math.sin(u);
      const cosU = Math.cos(u);

      // Classic smooth parametric heart contour in XY, modulated radially by sin(v)
      // with pillowed front/back Z dome cos(v) for organic 3D volume
      const hx = Math.pow(sinU, 3);
      const hy =
        (13 * cosU -
          5 * Math.cos(2 * u) -
          2 * Math.cos(3 * u) -
          Math.cos(4 * u)) /
        16;

      // Soften the cleft & bottom cusp convergence toward the Z poles
      const radialEnv = Math.pow(sinV, 0.78);
      const x = hx * radialEnv * scale;
      const y = (hy * radialEnv + 0.08) * scale;
      const z = cosV * (0.42 + 0.16 * sinV) * scale;

      positions.push(x, y, z);
      uvs.push(iu / uSteps, iv / vSteps);
    }
  }

  const stride = uSteps + 1;
  for (let iv = 0; iv < vSteps; iv++) {
    for (let iu = 0; iu < uSteps; iu++) {
      const a = iv * stride + iu;
      const b = a + stride;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface HeartBeaconProps {
  isPortrait: boolean;
}

export default function HeartBeacon({ isPortrait }: HeartBeaconProps) {
  const { viewport, camera } = useThree();
  const earthHeartGroupRef = useRef<THREE.Group | null>(null);
  const earthSculptRef = useRef<THREE.Mesh | null>(null);
  const earthBillboardRef = useRef<THREE.Mesh | null>(null);
  const orbitRingRef = useRef<THREE.Mesh | null>(null);

  const marsHeartGroupRef = useRef<THREE.Group | null>(null);
  const marsSculptRef = useRef<THREE.Mesh | null>(null);
  const marsBillboardRef = useRef<THREE.Mesh | null>(null);

  const {
    heartGeo,
    haloGeo,
    ringGeo,
    earthHeartMat,
    marsHeartMat,
    earthHaloMat,
    marsHaloMat,
    ringMat,
  } = useMemo(() => {
    const hGeo = createVolumetricHeartGeometry(56, 28, 0.22);
    const qGeo = new THREE.PlaneGeometry(1.1, 1.1);
    const rGeo = new THREE.RingGeometry(0.28, 0.305, 48);

    const makeHeartMeshShader = () =>
      new THREE.ShaderMaterial({
        vertexShader: HEART_MESH_VERT,
        fragmentShader: HEART_MESH_FRAG,
        transparent: true,
        depthWrite: true,
        uniforms: {
          uTime: { value: 0 },
          uBpm: { value: HEART_BPM },
          uBeatAmp: { value: 1 },
          uOpacity: { value: 1 },
          uDeepCore: { value: new THREE.Color("#7F0926") },
          uBodyColor: { value: new THREE.Color(COLORS.heart) },
          uRimPink: { value: new THREE.Color("#FF7A98") },
          uBoneColor: { value: new THREE.Color(COLORS.bone) },
        },
      });

    const makeHaloShader = () =>
      new THREE.ShaderMaterial({
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
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
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return {
      heartGeo: hGeo,
      haloGeo: qGeo,
      ringGeo: rGeo,
      earthHeartMat: makeHeartMeshShader(),
      marsHeartMat: makeHeartMeshShader(),
      earthHaloMat: makeHaloShader(),
      marsHaloMat: makeHaloShader(),
      ringMat: rMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      heartGeo.dispose();
      haloGeo.dispose();
      ringGeo.dispose();
      earthHeartMat.dispose();
      marsHeartMat.dispose();
      earthHaloMat.dispose();
      marsHaloMat.dispose();
      ringMat.dispose();
    };
  }, [
    heartGeo,
    haloGeo,
    ringGeo,
    earthHeartMat,
    marsHeartMat,
    earthHaloMat,
    marsHaloMat,
    ringMat,
  ]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const { position: tashkentPos, normal: tashkentNormal } =
      getTashkentWorldAnchor(viewport.width, viewport.height, isPortrait);

    // Detach/ascend smoothly into rocket during liftoff (p: 0.0 -> 0.10)
    const detachProgress = THREE.MathUtils.clamp(introState.p / 0.1, 0, 1);
    const earthOpacity = introState.rim * (1 - detachProgress * 0.72);

    if (earthHeartGroupRef.current) {
      earthHeartGroupRef.current.position
        .copy(tashkentPos)
        .addScaledVector(tashkentNormal, 0.08 + detachProgress * 0.34);

      const scalePulse =
        1 +
        0.07 *
          Math.sin(elapsed * (HEART_BPM / 60) * Math.PI * 2) *
          introState.beat;
      earthHeartGroupRef.current.scale.setScalar(
        scalePulse * (1 - detachProgress * 0.4)
      );
    }

    if (earthSculptRef.current) {
      earthSculptRef.current.quaternion.copy(camera.quaternion);
      earthSculptRef.current.rotateY(Math.sin(elapsed * 1.4) * 0.22);
    }

    if (earthBillboardRef.current) {
      earthBillboardRef.current.quaternion.copy(camera.quaternion);
    }

    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.set(
        Math.PI * 0.36 + Math.sin(elapsed * 0.9) * 0.12,
        elapsed * 1.15,
        Math.PI * 0.18
      );
    }

    earthHeartMat.uniforms.uTime.value = elapsed;
    earthHeartMat.uniforms.uBeatAmp.value = introState.beat;
    earthHeartMat.uniforms.uOpacity.value = earthOpacity;

    earthHaloMat.uniforms.uTime.value = elapsed;
    earthHaloMat.uniforms.uBeatAmp.value = introState.beat;
    earthHaloMat.uniforms.uOpacity.value = earthOpacity;

    ringMat.opacity = earthOpacity * 0.65;

    // Mars synchronized landing heart
    const marsAnchor = getMarsLandingAnchor(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );

    if (marsHeartGroupRef.current) {
      marsHeartGroupRef.current.position
        .copy(marsAnchor.position)
        .addScaledVector(marsAnchor.normal, 0.08);
    }
    if (marsSculptRef.current) {
      marsSculptRef.current.quaternion.copy(camera.quaternion);
      marsSculptRef.current.rotateY(Math.sin(elapsed * 1.4) * 0.22);
    }
    if (marsBillboardRef.current) {
      marsBillboardRef.current.quaternion.copy(camera.quaternion);
    }

    marsHeartMat.uniforms.uTime.value = elapsed;
    marsHeartMat.uniforms.uBeatAmp.value = 1;
    marsHeartMat.uniforms.uOpacity.value = introState.marsHeart;

    marsHaloMat.uniforms.uTime.value = elapsed;
    marsHaloMat.uniforms.uBeatAmp.value = 1;
    marsHaloMat.uniforms.uOpacity.value = introState.marsHeart;
  });

  return (
    <>
      <group ref={earthHeartGroupRef}>
        <mesh
          ref={earthBillboardRef}
          geometry={haloGeo}
          material={earthHaloMat}
        />
        <mesh
          ref={earthSculptRef}
          geometry={heartGeo}
          material={earthHeartMat}
        />
        <mesh ref={orbitRingRef} geometry={ringGeo} material={ringMat} />
      </group>

      <group ref={marsHeartGroupRef}>
        <mesh
          ref={marsBillboardRef}
          geometry={haloGeo}
          material={marsHaloMat}
        />
        <mesh
          ref={marsSculptRef}
          geometry={heartGeo}
          material={marsHeartMat}
        />
      </group>
    </>
  );
}

```

---

### `components/intro/scene/Rocket.tsx`

```tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HEART_BPM, LAYOUT_PARAMS, LETTER_RAMP } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const PLUME_VERT = /* glsl */ `
uniform float uTime;
uniform float uThrust;

varying vec2 vUv;
varying float vAxial;

void main() {
  vUv = uv;
  // ConeGeometry tip is at -Y after translation; uv.y = 1 is nozzle base, uv.y = 0 is exhaust tip
  vAxial = 1.0 - uv.y;

  vec3 pos = position;
  float wave = sin(uTime * 42.0 - vAxial * 14.0) * 0.014 * vAxial * uThrust;
  pos.x += wave;
  pos.z += cos(uTime * 38.0 - vAxial * 12.0) * 0.014 * vAxial * uThrust;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const PLUME_FRAG = /* glsl */ `
uniform float uTime;
uniform float uThrust;
uniform vec3 uBone;
uniform vec3 uOrbit;
uniform vec3 uSoil;

varying vec2 vUv;
varying float vAxial;

void main() {
  if (uThrust <= 0.01) discard;

  // Shock diamonds & high-frequency plasma flicker along the exhaust cone
  float shock = pow(abs(cos(vAxial * 18.0 - uTime * 32.0)), 3.0);
  float coreMask = smoothstep(0.55, 0.0, vAxial);
  float tipFade = pow(clamp(1.0 - vAxial, 0.0, 1.0), 1.35);

  vec3 col = mix(uSoil, uOrbit, smoothstep(0.85, 0.22, vAxial));
  col = mix(col, uBone, coreMask * 0.85 + shock * 0.45 * tipFade);

  float alpha = tipFade * (0.65 + 0.35 * shock) * clamp(uThrust, 0.0, 1.35);
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

export function buildFlightCurve(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): THREE.CubicBezierCurve3 {
  const startAnchor = getTashkentWorldAnchor(
    viewportWidth,
    viewportHeight,
    isPortrait
  );
  const endAnchor = getMarsLandingAnchor(
    viewportWidth,
    viewportHeight,
    isPortrait,
    0
  );

  // Perched cleanly above the Tashkent heart at p = 0
  const p0 = startAnchor.position
    .clone()
    .addScaledVector(startAnchor.normal, 0.42);
  const p3 = endAnchor.position.clone();

  if (isPortrait) {
    // Top-to-bottom flight corridor along the vertical phrase stack
    const p1 = p0
      .clone()
      .add(new THREE.Vector3(0.12, -viewportHeight * 0.18, 0.75));
    const p2 = p3
      .clone()
      .add(new THREE.Vector3(-0.08, viewportHeight * 0.18, 0.75));
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }

  // Left-to-right flight corridor between the raised & lowered letters
  const p1 = p0
    .clone()
    .add(new THREE.Vector3(viewportWidth * 0.18, 0.35, 0.85));
  const p2 = p3
    .clone()
    .add(new THREE.Vector3(-viewportWidth * 0.18, -0.15, 0.85));
  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

interface RocketProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group | null>;
}

export default function Rocket({ isPortrait, rocketGroupRef }: RocketProps) {
  const { viewport, camera, size } = useThree();
  const innerRollRef = useRef<THREE.Group | null>(null);
  const plumeOuterRef = useRef<THREE.Mesh | null>(null);
  const plumeCoreRef = useRef<THREE.Mesh | null>(null);
  const heartPayloadRef = useRef<THREE.Mesh | null>(null);
  const thrusterLightRef = useRef<THREE.PointLight | null>(null);
  const smoothThrustRef = useRef(0.25);

  const curve = useMemo(
    () => buildFlightCurve(viewport.width, viewport.height, isPortrait),
    [viewport.width, viewport.height, isPortrait]
  );

  const {
    hullGeo,
    collarGeo,
    trimRingGeo,
    nozzleGeo,
    finGeo,
    wingtipGeo,
    portholeFrameGeo,
    heartCoreGeo,
    plumeOuterGeo,
    plumeCoreGeo,
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    heartCoreMat,
    plumeMat,
  } = useMemo(() => {
    // 1. Smooth LatheGeometry ogive nosecone & tapered fuselage (24 radial segments)
    const hullPoints: THREE.Vector2[] = [];
    const profileSteps = 18;
    for (let i = 0; i <= profileSteps; i++) {
      const t = i / profileSteps; // 0 (aft base y = -0.20) -> 1 (nose tip y = +0.38)
      const y = -0.2 + t * 0.58;
      let r: number;
      if (t < 0.15) {
        // Slight boat-tail taper at aft base
        r = 0.088 + (t / 0.15) * 0.024;
      } else if (t < 0.55) {
        // Cylindrical upper stage fairing
        r = 0.112;
      } else {
        // Tangent ogive aerodynamic nosecone
        const u = (t - 0.55) / 0.45;
        r = 0.112 * Math.cos(u * Math.PI * 0.5);
      }
      hullPoints.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const hGeo = new THREE.LatheGeometry(hullPoints, 24);
    hGeo.computeVertexNormals();

    // 2. Obsidian interstage collar & soil-gold telemetry trim ring
    const cGeo = new THREE.CylinderGeometry(0.114, 0.114, 0.055, 24);
    cGeo.translate(0, -0.04, 0);

    const trGeo = new THREE.TorusGeometry(0.114, 0.007, 12, 24);
    trGeo.rotateX(Math.PI * 0.5);
    trGeo.translate(0, 0.09, 0);

    // 3. Parabolic metallic aft engine bell nozzle
    const nozzlePts: THREE.Vector2[] = [
      new THREE.Vector2(0.042, -0.19),
      new THREE.Vector2(0.058, -0.23),
      new THREE.Vector2(0.078, -0.28),
      new THREE.Vector2(0.088, -0.31),
    ];
    const nzGeo = new THREE.LatheGeometry(nozzlePts, 24);
    nzGeo.computeVertexNormals();

    // 4. Swept delta fins (ExtrudeGeometry)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, -0.05);
    finShape.lineTo(0.14, -0.17);
    finShape.lineTo(0.14, -0.25);
    finShape.lineTo(0, -0.21);
    finShape.closePath();

    const fGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.004,
      bevelThickness: 0.004,
    });
    fGeo.translate(0.075, 0, -0.008);

    const wtGeo = new THREE.SphereGeometry(0.014, 10, 10);

    // 5. Fuselage viewport bezel & internal pulsing heart payload core
    const pfGeo = new THREE.TorusGeometry(0.042, 0.007, 12, 24);
    const hcGeo = new THREE.OctahedronGeometry(0.032, 1);

    // 6. Nested plasma plume cones (oriented pointing -Y below engine nozzle)
    const poGeo = new THREE.ConeGeometry(0.078, 0.44, 20, 12, true);
    poGeo.rotateX(Math.PI);
    poGeo.translate(0, -0.52, 0);

    const pcGeo = new THREE.ConeGeometry(0.042, 0.28, 16, 8, true);
    pcGeo.rotateX(Math.PI);
    pcGeo.translate(0, -0.44, 0);

    // Materials
    const hMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.bone),
      roughness: 0.26,
      metalness: 0.18,
    });

    const obMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.obsidian),
      roughness: 0.4,
      metalness: 0.45,
    });

    const gtMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.soil),
      roughness: 0.25,
      metalness: 0.75,
      emissive: new THREE.Color(COLORS.soil),
      emissiveIntensity: 0.22,
    });

    const nzMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#262936"),
      roughness: 0.3,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    const fnMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.rust),
      roughness: 0.38,
      metalness: 0.25,
    });

    const cbMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
    });

    const hcMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.heart),
    });

    const pMat = new THREE.ShaderMaterial({
      vertexShader: PLUME_VERT,
      fragmentShader: PLUME_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uThrust: { value: 0.3 },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uOrbit: { value: new THREE.Color(COLORS.orbit) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
      },
    });

    return {
      hullGeo: hGeo,
      collarGeo: cGeo,
      trimRingGeo: trGeo,
      nozzleGeo: nzGeo,
      finGeo: fGeo,
      wingtipGeo: wtGeo,
      portholeFrameGeo: pfGeo,
      heartCoreGeo: hcGeo,
      plumeOuterGeo: poGeo,
      plumeCoreGeo: pcGeo,
      hullMat: hMat,
      obsidianMat: obMat,
      goldTrimMat: gtMat,
      nozzleMat: nzMat,
      finMat: fnMat,
      cyanBeaconMat: cbMat,
      heartCoreMat: hcMat,
      plumeMat: pMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      hullGeo.dispose();
      collarGeo.dispose();
      trimRingGeo.dispose();
      nozzleGeo.dispose();
      finGeo.dispose();
      wingtipGeo.dispose();
      portholeFrameGeo.dispose();
      heartCoreGeo.dispose();
      plumeOuterGeo.dispose();
      plumeCoreGeo.dispose();
      hullMat.dispose();
      obsidianMat.dispose();
      goldTrimMat.dispose();
      nozzleMat.dispose();
      finMat.dispose();
      cyanBeaconMat.dispose();
      heartCoreMat.dispose();
      plumeMat.dispose();
    };
  }, [
    hullGeo,
    collarGeo,
    trimRingGeo,
    nozzleGeo,
    finGeo,
    wingtipGeo,
    portholeFrameGeo,
    heartCoreGeo,
    plumeOuterGeo,
    plumeCoreGeo,
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    heartCoreMat,
    plumeMat,
  ]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const tanVec = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const group = rocketGroupRef.current;
    if (!group) return;

    const elapsed = clock.getElapsedTime();

    // Flight occupies 0.0 - 6.8s of the 8.0s master timeline (p = 0.0 -> 0.85)
    const flightT = clamp(introState.p / 0.85, 0, 1);

    curve.getPointAt(flightT, posVec);
    curve.getTangentAt(flightT, tanVec).normalize();

    // Subtle high-frequency ignition jitter offset during 4s idle tease
    if (introState.rumble > 0.001) {
      const t = elapsed * 55.0;
      const amp = 0.035 * introState.rumble;
      posVec.x += Math.sin(t) * amp;
      posVec.y += Math.cos(t * 1.3) * amp;
    }

    group.position.copy(posVec);
    quat.setFromUnitVectors(upVec, tanVec);
    group.quaternion.copy(quat);

    // Gentle axial roll along the flight corridor while keeping nose tangent to curve
    if (innerRollRef.current) {
      innerRollRef.current.rotation.y =
        flightT * Math.PI * 1.6 + Math.sin(elapsed * 1.2) * 0.14;
    }

    // Pulse internal heart payload core inside the porthole window
    if (heartPayloadRef.current) {
      const beatPulse =
        1 +
        0.18 *
          Math.sin(elapsed * (HEART_BPM / 60) * Math.PI * 2) *
          introState.beat;
      heartPayloadRef.current.scale.setScalar(beatPulse);
      heartPayloadRef.current.rotation.y = elapsed * 2.4;
    }

    // Dynamic plasma thruster plume scaled by deltaP, trailRate, and rumble
    const activeFlight = flightT > 0.002 && flightT < 0.995 ? 1 : 0;
    const targetThrust = clamp(
      0.22 +
        introState.trailRate * 0.55 * activeFlight +
        introState.deltaP * 28.0 +
        introState.rumble * 0.75,
      0.15,
      1.45
    );
    smoothThrustRef.current = THREE.MathUtils.lerp(
      smoothThrustRef.current,
      targetThrust,
      0.18
    );

    plumeMat.uniforms.uTime.value = elapsed;
    plumeMat.uniforms.uThrust.value = smoothThrustRef.current;

    const plumeScaleY = 0.55 + smoothThrustRef.current * 0.75;
    const plumeScaleXZ = 0.82 + smoothThrustRef.current * 0.25;
    if (plumeOuterRef.current) {
      plumeOuterRef.current.scale.set(plumeScaleXZ, plumeScaleY, plumeScaleXZ);
    }
    if (plumeCoreRef.current) {
      plumeCoreRef.current.scale.set(
        plumeScaleXZ * 0.9,
        plumeScaleY * 0.85,
        plumeScaleXZ * 0.9
      );
    }
    if (thrusterLightRef.current) {
      thrusterLightRef.current.intensity = 0.6 + smoothThrustRef.current * 1.4;
    }

    // Project 3D rocket position to screen CSS pixels
    projVec.copy(posVec).project(camera);
    const px = (projVec.x * 0.5 + 0.5) * size.width;
    const py = (-projVec.y * 0.5 + 0.5) * size.height;
    introState.rocketPx.x = px;
    introState.rocketPx.y = py;

    // Continuous screen-space letter progress computation
    const layoutKey = isPortrait ? "portrait" : "landscape";
    const { axis, dir } = LAYOUT_PARAMS[layoutKey];
    const viewportAxis = axis === "x" ? size.width : size.height;
    const ramp = Math.max(1, viewportAxis * LETTER_RAMP[layoutKey]);
    const rocketCoord = axis === "x" ? px : py;

    for (let i = 0; i < 4; i++) {
      const triggerCoord = introState.triggerPx[i];
      introState.letter[i] = clamp(
        (dir * (rocketCoord - triggerCoord)) / ramp,
        0,
        1
      );
    }
    introState.sceneLive = true;
  });

  return (
    <group ref={rocketGroupRef} scale={1.45}>
      <group ref={innerRollRef}>
        {/* Lathe ceramic hull, obsidian interstage collar, soil-gold trim, metallic nozzle */}
        <mesh geometry={hullGeo} material={hullMat} />
        <mesh geometry={collarGeo} material={obsidianMat} />
        <mesh geometry={trimRingGeo} material={goldTrimMat} />
        <mesh geometry={nozzleGeo} material={nozzleMat} />

        {/* 4 swept delta fins with orbit-cyan wingtip navigation beacons */}
        {[0, 1, 2, 3].map((idx) => {
          const angle = (idx * Math.PI) / 2;
          return (
            <group key={idx} rotation={[0, angle, 0]}>
              <mesh geometry={finGeo} material={finMat} />
              <mesh
                position={[0.215, -0.21, 0]}
                geometry={wingtipGeo}
                material={cyanBeaconMat}
              />
            </group>
          );
        })}

        {/* Illuminated circular viewport window showing pulsing heart payload core */}
        <group position={[0, 0.035, 0.106]}>
          <mesh geometry={portholeFrameGeo} material={goldTrimMat} />
          <mesh
            position={[0, 0, -0.012]}
            geometry={wingtipGeo}
            scale={[2.4, 2.4, 0.5]}
            material={obsidianMat}
          />
          <mesh
            ref={heartPayloadRef}
            position={[0, 0, 0.002]}
            geometry={heartCoreGeo}
            material={heartCoreMat}
          />
        </group>

        {/* Nested additive GLSL plasma thruster plume */}
        <mesh
          ref={plumeOuterRef}
          geometry={plumeOuterGeo}
          material={plumeMat}
        />
        <mesh
          ref={plumeCoreRef}
          geometry={plumeCoreGeo}
          material={plumeMat}
        />

        {/* Local thruster pointLight illuminating fins and planet surfaces */}
        <pointLight
          ref={thrusterLightRef}
          position={[0, -0.36, 0]}
          color={COLORS.orbit}
          intensity={1.2}
          distance={2.5}
          decay={2}
        />
      </group>
    </group>
  );
}

```
