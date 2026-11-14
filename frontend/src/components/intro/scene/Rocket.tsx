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
  vAxial = 1.0 - uv.y;

  vec3 pos = position;
  float wave = sin(uTime * 48.0 - vAxial * 16.0) * 0.01 * vAxial * uThrust;
  pos.x += wave;
  pos.z += cos(uTime * 42.0 - vAxial * 14.0) * 0.01 * vAxial * uThrust;

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

  float shock = pow(abs(cos(vAxial * 22.0 - uTime * 36.0)), 3.5);
  float coreMask = smoothstep(0.6, 0.0, vAxial);
  float tipFade = pow(clamp(1.0 - vAxial, 0.0, 1.0), 1.4);

  vec3 col = mix(uSoil, uOrbit, smoothstep(0.88, 0.2, vAxial));
  col = mix(col, uBone, coreMask * 0.9 + shock * 0.5 * tipFade);

  float alpha = tipFade * (0.7 + 0.3 * shock) * clamp(uThrust, 0.0, 1.4);
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

  const p0 = startAnchor.position
    .clone()
    .addScaledVector(startAnchor.normal, 0.34);

  const p3 = endAnchor.position
    .clone()
    .addScaledVector(endAnchor.normal, 0.32);

  if (isPortrait) {
    const p1 = p0
      .clone()
      .add(new THREE.Vector3(0.08, -viewportHeight * 0.18, 0.65));
    const p2 = p3
      .clone()
      .add(new THREE.Vector3(-0.08, viewportHeight * 0.18, 0.65));
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }

  // Straight, crisp horizontal cruise corridor right through the center monogram (y ≈ 0)
  const p1 = new THREE.Vector3(-viewportWidth * 0.14, 0.04, 0.45);
  const p2 = new THREE.Vector3(viewportWidth * 0.14, -0.02, 0.45);
  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

interface RocketProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group>;
}

export default function Rocket({ isPortrait, rocketGroupRef }: RocketProps) {
  const { viewport, camera, size } = useThree();
  const innerRollRef = useRef<THREE.Group | null>(null);
  const plumeOuterRef = useRef<THREE.Mesh | null>(null);
  const plumeCoreRef = useRef<THREE.Mesh | null>(null);
  const shockRingRef = useRef<THREE.Mesh | null>(null);
  const heartPayloadRef = useRef<THREE.Mesh | null>(null);
  const thrusterLightRef = useRef<THREE.PointLight | null>(null);
  const smoothThrustRef = useRef(0.25);

  const curve = useMemo(
    () => buildFlightCurve(viewport.width, viewport.height, isPortrait),
    [viewport.width, viewport.height, isPortrait]
  );

  // Subtle glowing orbital trajectory arc connecting Tashkent to Mars
  const { trajectoryLine } = useMemo(() => {
    const pts = curve.getPoints(80);
    const lGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const colors = new Float32Array(pts.length * 3);
    const cOrbit = new THREE.Color(COLORS.orbit);
    const cSoil = new THREE.Color(COLORS.soil);
    const cTemp = new THREE.Color();

    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      cTemp.copy(cOrbit).lerp(cSoil, t);
      colors[i * 3 + 0] = cTemp.r;
      colors[i * 3 + 1] = cTemp.g;
      colors[i * 3 + 2] = cTemp.b;
    }
    lGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const lMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineObj = new THREE.Line(lGeo, lMat);
    return { trajectoryLine: lineObj };
  }, [curve]);

  useEffect(() => {
    return () => {
      trajectoryLine.geometry.dispose();
      (trajectoryLine.material as THREE.Material).dispose();
    };
  }, [trajectoryLine]);

  const {
    hullGeo,
    heatshieldGeo,
    collarGeo,
    trimRingGeo,
    conduitGeo,
    nozzleGeo,
    finGeo,
    wingtipGeo,
    portholeFrameGeo,
    heartCoreGeo,
    shockRingGeo,
    plumeOuterGeo,
    plumeCoreGeo,
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    shockRingMat,
    heartCoreMat,
    plumeMat,
  } = useMemo(() => {
    // Sleek high-aspect-ratio orbital vehicle profile (slender 9:1 aerospace silhouette)
    const hullPoints: THREE.Vector2[] = [];
    const profileSteps = 28;
    for (let i = 0; i <= profileSteps; i++) {
      const t = i / profileSteps; // y from -0.28 to +0.48 (total length 0.76, max radius 0.084)
      const y = -0.28 + t * 0.76;
      let r: number;
      if (t < 0.08) {
        // Aft engine skirt taper
        r = 0.068 + (t / 0.08) * 0.016;
      } else if (t < 0.58) {
        // Slender booster & interstage cylinder
        r = 0.084;
      } else {
        // Sharp Von Karman / Haack low-drag orbital nosecone
        const u = (t - 0.58) / 0.42;
        const theta = Math.acos(1 - 2 * u);
        r =
          0.084 *
          Math.sqrt(
            Math.max(0, (theta - Math.sin(2 * theta) * 0.5) / Math.PI)
          );
        r = 0.084 * (1 - Math.pow(u, 1.65));
      }
      hullPoints.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const hGeo = new THREE.LatheGeometry(hullPoints, 32);
    hGeo.computeVertexNormals();

    // Dark obsidian dorsal thermal tile spine
    const hsGeo = new THREE.CylinderGeometry(
      0.0855,
      0.0855,
      0.38,
      20,
      1,
      false,
      -Math.PI * 0.35,
      Math.PI * 0.7
    );
    hsGeo.translate(0, -0.02, 0);

    // Interstage telemetry rings & gold external propellant conduits
    const cGeo = new THREE.CylinderGeometry(0.0865, 0.0865, 0.048, 32);
    cGeo.translate(0, -0.08, 0);

    const trGeo = new THREE.TorusGeometry(0.086, 0.005, 12, 32);
    trGeo.rotateX(Math.PI * 0.5);
    trGeo.translate(0, 0.14, 0);

    const cdGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.36, 8);
    cdGeo.translate(0.085, -0.06, 0);

    // Parabolic metallic engine bell nozzle
    const nozzlePts: THREE.Vector2[] = [
      new THREE.Vector2(0.028, -0.27),
      new THREE.Vector2(0.044, -0.32),
      new THREE.Vector2(0.058, -0.37),
      new THREE.Vector2(0.064, -0.4),
    ];
    const nzGeo = new THREE.LatheGeometry(nozzlePts, 24);
    nzGeo.computeVertexNormals();

    // Sleek swept supersonic delta fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, -0.08);
    finShape.lineTo(0.11, -0.22);
    finShape.lineTo(0.11, -0.3);
    finShape.lineTo(0, -0.27);
    finShape.closePath();

    const fGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.01,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.0025,
      bevelThickness: 0.0025,
    });
    fGeo.translate(0.055, 0, -0.005);

    const wtGeo = new THREE.SphereGeometry(0.01, 10, 10);
    const pfGeo = new THREE.TorusGeometry(0.032, 0.0055, 12, 24);
    const hcGeo = new THREE.OctahedronGeometry(0.024, 1);

    // Mach shockwave ring around thruster exit
    const srGeo = new THREE.RingGeometry(0.075, 0.095, 32);
    srGeo.rotateX(Math.PI * 0.5);
    srGeo.translate(0, -0.42, 0);

    // High-velocity plasma plume cones
    const poGeo = new THREE.ConeGeometry(0.062, 0.56, 24, 12, true);
    poGeo.rotateX(Math.PI);
    poGeo.translate(0, -0.66, 0);

    const pcGeo = new THREE.ConeGeometry(0.032, 0.36, 16, 8, true);
    pcGeo.rotateX(Math.PI);
    pcGeo.translate(0, -0.56, 0);

    // High-contrast aerospace materials
    const hMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.bone),
      roughness: 0.2,
      metalness: 0.32,
    });

    const obMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.obsidian),
      roughness: 0.35,
      metalness: 0.55,
    });

    const gtMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.soil),
      roughness: 0.22,
      metalness: 0.82,
      emissive: new THREE.Color(COLORS.soil),
      emissiveIntensity: 0.25,
    });

    const nzMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1E2230"),
      roughness: 0.25,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });

    const fnMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.rust),
      roughness: 0.32,
      metalness: 0.35,
    });

    const cbMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
    });

    const srMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
        uThrust: { value: 0.25 },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uOrbit: { value: new THREE.Color(COLORS.orbit) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
      },
    });

    return {
      hullGeo: hGeo,
      heatshieldGeo: hsGeo,
      collarGeo: cGeo,
      trimRingGeo: trGeo,
      conduitGeo: cdGeo,
      nozzleGeo: nzGeo,
      finGeo: fGeo,
      wingtipGeo: wtGeo,
      portholeFrameGeo: pfGeo,
      heartCoreGeo: hcGeo,
      shockRingGeo: srGeo,
      plumeOuterGeo: poGeo,
      plumeCoreGeo: pcGeo,
      hullMat: hMat,
      obsidianMat: obMat,
      goldTrimMat: gtMat,
      nozzleMat: nzMat,
      finMat: fnMat,
      cyanBeaconMat: cbMat,
      shockRingMat: srMat,
      heartCoreMat: hcMat,
      plumeMat: pMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      hullGeo.dispose();
      heatshieldGeo.dispose();
      collarGeo.dispose();
      trimRingGeo.dispose();
      conduitGeo.dispose();
      nozzleGeo.dispose();
      finGeo.dispose();
      wingtipGeo.dispose();
      portholeFrameGeo.dispose();
      heartCoreGeo.dispose();
      shockRingGeo.dispose();
      plumeOuterGeo.dispose();
      plumeCoreGeo.dispose();
      hullMat.dispose();
      obsidianMat.dispose();
      goldTrimMat.dispose();
      nozzleMat.dispose();
      finMat.dispose();
      cyanBeaconMat.dispose();
      shockRingMat.dispose();
      heartCoreMat.dispose();
      plumeMat.dispose();
    };
  }, [
    hullGeo,
    heatshieldGeo,
    collarGeo,
    trimRingGeo,
    conduitGeo,
    nozzleGeo,
    finGeo,
    wingtipGeo,
    portholeFrameGeo,
    heartCoreGeo,
    shockRingGeo,
    plumeOuterGeo,
    plumeCoreGeo,
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    shockRingMat,
    heartCoreMat,
    plumeMat,
  ]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const tanVec = useMemo(() => new THREE.Vector3(), []);
  const flightQuat = useMemo(() => new THREE.Quaternion(), []);
  const landQuat = useMemo(() => new THREE.Quaternion(), []);
  const profileNormal = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const group = rocketGroupRef.current;
    if (!group) return;

    const elapsed = clock.getElapsedTime();
    const flightT = clamp(introState.p / 0.85, 0, 1);

    curve.getPointAt(flightT, posVec);
    curve.getTangentAt(flightT, tanVec).normalize();

    if (introState.rumble > 0.001) {
      const t = elapsed * 55.0;
      const amp = 0.03 * introState.rumble;
      posVec.x += Math.sin(t) * amp;
      posVec.y += Math.cos(t * 1.3) * amp;
    }

    group.position.copy(posVec);
    flightQuat.setFromUnitVectors(upVec, tanVec);

    // During final approach (flightT 0.80 -> 1.0), pitch into a crisp side-profile landing attitude
    // (zero Z tilt toward camera so we see the full sleek rocket silhouette standing on Mars)
    const marsAnchor = getMarsLandingAnchor(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );
    profileNormal
      .set(marsAnchor.normal.x, marsAnchor.normal.y, 0.08)
      .normalize();
    landQuat.setFromUnitVectors(upVec, profileNormal);
    const landBlend = THREE.MathUtils.smoothstep(flightT, 0.8, 1.0);
    group.quaternion.copy(flightQuat).slerp(landQuat, landBlend);

    if (innerRollRef.current) {
      innerRollRef.current.rotation.y =
        flightT * Math.PI * 1.5 * (1 - landBlend);
    }

    if (heartPayloadRef.current) {
      const beatPulse =
        1 +
        0.18 *
          Math.sin(elapsed * (HEART_BPM / 60) * Math.PI * 2) *
          introState.beat;
      heartPayloadRef.current.scale.setScalar(beatPulse);
      heartPayloadRef.current.rotation.y = elapsed * 2.4;
    }

    const inFlightEnvelope =
      flightT > 0.005
        ? 1.0 - THREE.MathUtils.smoothstep(flightT, 0.93, 0.995)
        : 0.2;
    const targetThrust =
      clamp(
        0.25 +
          introState.trailRate * 0.6 +
          introState.deltaP * 30.0 +
          introState.rumble * 0.75,
        0.0,
        1.45
      ) * inFlightEnvelope;

    smoothThrustRef.current = THREE.MathUtils.lerp(
      smoothThrustRef.current,
      targetThrust,
      0.2
    );

    plumeMat.uniforms.uTime.value = elapsed;
    plumeMat.uniforms.uThrust.value = smoothThrustRef.current;

    const plumeScaleY = Math.max(0.001, 0.5 + smoothThrustRef.current * 0.85);
    const plumeScaleXZ = Math.max(0.001, 0.78 + smoothThrustRef.current * 0.25);
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
    if (shockRingRef.current) {
      const pulse = 1 + 0.15 * Math.sin(elapsed * 28.0);
      shockRingRef.current.scale.setScalar(pulse * smoothThrustRef.current);
      shockRingMat.opacity = clamp(smoothThrustRef.current * 0.55, 0, 0.7);
    }
    if (thrusterLightRef.current) {
      thrusterLightRef.current.intensity = smoothThrustRef.current * 1.8;
    }

    // Fade orbital trajectory guide arc as words settle
    const lineMat = trajectoryLine.material as THREE.LineBasicMaterial;
    lineMat.opacity =
      introState.rim * 0.18 * (1 - clamp((introState.p - 0.8) / 0.12, 0, 1));

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
    <>
      <primitive object={trajectoryLine} />
      <group ref={rocketGroupRef} scale={1.18}>
        <group ref={innerRollRef}>
          <mesh geometry={hullGeo} material={hullMat} />
          <mesh geometry={heatshieldGeo} material={obsidianMat} />
          <mesh geometry={collarGeo} material={obsidianMat} />
          <mesh geometry={trimRingGeo} material={goldTrimMat} />
          <mesh geometry={nozzleGeo} material={nozzleMat} />

          {/* Dual external gold telemetry conduits */}
          <mesh geometry={conduitGeo} material={goldTrimMat} />
          <mesh
            rotation={[0, Math.PI, 0]}
            geometry={conduitGeo}
            material={goldTrimMat}
          />

          {/* 4 swept supersonic delta fins with cyan navigation beacons */}
          {[0, 1, 2, 3].map((idx) => {
            const angle = (idx * Math.PI) / 2;
            return (
              <group key={idx} rotation={[0, angle, 0]}>
                <mesh geometry={finGeo} material={finMat} />
                <mesh
                  position={[0.165, -0.26, 0]}
                  geometry={wingtipGeo}
                  material={cyanBeaconMat}
                />
              </group>
            );
          })}

          {/* Fuselage viewport bezel & pulsing heart payload core */}
          <group position={[0, 0.05, 0.082]}>
            <mesh geometry={portholeFrameGeo} material={goldTrimMat} />
            <mesh
              position={[0, 0, -0.008]}
              geometry={wingtipGeo}
              scale={[2.6, 2.6, 0.5]}
              material={obsidianMat}
            />
            <mesh
              ref={heartPayloadRef}
              position={[0, 0, 0.002]}
              geometry={heartCoreGeo}
              material={heartCoreMat}
            />
          </group>

          {/* Mach shockwave ring + nested plasma plume */}
          <mesh
            ref={shockRingRef}
            geometry={shockRingGeo}
            material={shockRingMat}
          />
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

          <pointLight
            ref={thrusterLightRef}
            position={[0, -0.44, 0]}
            color={COLORS.orbit}
            intensity={1.2}
            distance={2.8}
            decay={2}
          />
        </group>
      </group>
    </>
  );
}
