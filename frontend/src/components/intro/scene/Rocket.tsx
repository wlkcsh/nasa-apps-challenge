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
    0,
    1.0
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

  // Landscape: Cruise spline straight through y = 0 (exact vertical center) from left to right
  // at z = 0.6 (in front of background stars and slicing directly through the centered F H T M monogram)
  // then sweeping into a graceful orbital capture curve toward Mars's upper-left sunlit limb (flightT = 0.72 -> 1.0)
  const p1 = new THREE.Vector3(-viewportWidth * 0.18, 0.0, 0.6);
  const p2 = new THREE.Vector3(viewportWidth * 0.15, 0.04, 0.55);
  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

interface RocketProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group>;
}

export default function Rocket({ isPortrait, rocketGroupRef }: RocketProps) {
  const { viewport, camera, size } = useThree();
  const innerRollRef = useRef<THREE.Group | null>(null);

  // Two-Stage separated groups
  const upperStageGroupRef = useRef<THREE.Group | null>(null);
  const boosterStageGroupRef = useRef<THREE.Group | null>(null);

  const boosterPlumeOuterRef = useRef<THREE.Mesh | null>(null);
  const boosterPlumeCoreRef = useRef<THREE.Mesh | null>(null);
  const vacuumPlumeRef = useRef<THREE.Mesh | null>(null);

  const shockRingRef = useRef<THREE.Mesh | null>(null);
  const heartPayloadRef = useRef<THREE.Mesh | null>(null);
  const thrusterLightRef = useRef<THREE.PointLight | null>(null);
  const smoothThrustRef = useRef(0.25);

  const curve = useMemo(
    () => buildFlightCurve(viewport.width, viewport.height, isPortrait),
    [viewport.width, viewport.height, isPortrait]
  );

  const {
    // Upper Stage Geometries
    upperHullGeo,
    thermalSpineGeo,
    telemetryRingGeo,
    viewportFrameGeo,
    heartCoreGeo,
    vacuumNozzleGeo,
    vacuumPlumeGeo,

    // Booster Stage Geometries
    boosterTankGeo,
    interstageCollarGeo,
    conduitGeo,
    finGeo,
    wingtipGeo,
    boosterNozzleGeo,
    shockRingGeo,
    boosterPlumeOuterGeo,
    boosterPlumeCoreGeo,

    // Shared Materials
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    shockRingMat,
    heartCoreMat,
    boosterPlumeMat,
    vacuumPlumeMat,
  } = useMemo(() => {
    // ==========================================
    // 1. UPPER STAGE GEOMETRY
    // ==========================================
    // Upper stage hull: cylinder tank from y = 0.0 to 0.18, Von Karman nosecone to y = 0.46
    const upperPoints: THREE.Vector2[] = [];
    const upperSteps = 24;
    for (let i = 0; i <= upperSteps; i++) {
      const t = i / upperSteps; // 0 to 1
      const y = t * 0.46;
      let r: number;
      if (t < 0.40) {
        // Cylindrical tank section
        r = 0.084;
      } else {
        // Sharp low-drag aerodynamic nosecone
        const u = (t - 0.40) / 0.60;
        r = 0.084 * (1.0 - Math.pow(u, 1.6));
      }
      upperPoints.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const uHullGeo = new THREE.LatheGeometry(upperPoints, 32);
    uHullGeo.computeVertexNormals();

    // Obsidian dorsal thermal tile spine on upper stage
    const tSpineGeo = new THREE.CylinderGeometry(
      0.0855,
      0.0855,
      0.24,
      20,
      1,
      false,
      -Math.PI * 0.35,
      Math.PI * 0.7
    );
    tSpineGeo.translate(0, 0.16, 0);

    // Gold telemetry ring around upper stage
    const telRingGeo = new THREE.TorusGeometry(0.086, 0.0045, 12, 32);
    telRingGeo.rotateX(Math.PI * 0.5);
    telRingGeo.translate(0, 0.12, 0);

    // Fuselage viewport & pulsing heart payload core
    const vpFrameGeo = new THREE.TorusGeometry(0.030, 0.005, 12, 24);
    const hCoreGeo = new THREE.OctahedronGeometry(0.022, 1);

    // Vacuum engine bell nozzle (at base of upper stage)
    const vacNozzlePts: THREE.Vector2[] = [
      new THREE.Vector2(0.022, 0.0),
      new THREE.Vector2(0.038, -0.04),
      new THREE.Vector2(0.052, -0.075),
    ];
    const vNozzleGeo = new THREE.LatheGeometry(vacNozzlePts, 24);
    vNozzleGeo.computeVertexNormals();

    // Crisp cyan-white vacuum plasma plume
    const vPlumeGeo = new THREE.ConeGeometry(0.048, 0.42, 20, 8, true);
    vPlumeGeo.rotateX(Math.PI);
    vPlumeGeo.translate(0, -0.28, 0);

    // ==========================================
    // 2. BOOSTER STAGE GEOMETRY
    // ==========================================
    // Booster propellant tank (from y = -0.28 to y = 0.0)
    const boosterPoints: THREE.Vector2[] = [];
    const boosterSteps = 16;
    for (let i = 0; i <= boosterSteps; i++) {
      const t = i / boosterSteps;
      const y = -0.28 + t * 0.28;
      let r = 0.084;
      if (t < 0.15) {
        // Aft boattail skirt taper
        r = 0.070 + (t / 0.15) * 0.014;
      }
      boosterPoints.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const bTankGeo = new THREE.LatheGeometry(boosterPoints, 32);
    bTankGeo.computeVertexNormals();

    // Interstage separation collar ring (top of booster)
    const isCollarGeo = new THREE.CylinderGeometry(0.0865, 0.0865, 0.036, 32);
    isCollarGeo.translate(0, -0.018, 0);

    // Dual external telemetry conduits on booster
    const cdGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.26, 8);
    cdGeo.translate(0.085, -0.14, 0);

    // Main booster bell nozzle
    const boosterNozzlePts: THREE.Vector2[] = [
      new THREE.Vector2(0.028, -0.27),
      new THREE.Vector2(0.044, -0.32),
      new THREE.Vector2(0.058, -0.37),
      new THREE.Vector2(0.064, -0.40),
    ];
    const bNozzleGeo = new THREE.LatheGeometry(boosterNozzlePts, 24);
    bNozzleGeo.computeVertexNormals();

    // 4 swept supersonic delta fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, -0.08);
    finShape.lineTo(0.11, -0.22);
    finShape.lineTo(0.11, -0.30);
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

    // Mach shockwave ring at booster exit
    const srGeo = new THREE.RingGeometry(0.075, 0.095, 32);
    srGeo.rotateX(Math.PI * 0.5);
    srGeo.translate(0, -0.42, 0);

    // Booster plume cones
    const bPlumeOuterGeo = new THREE.ConeGeometry(0.062, 0.54, 24, 12, true);
    bPlumeOuterGeo.rotateX(Math.PI);
    bPlumeOuterGeo.translate(0, -0.66, 0);

    const bPlumeCoreGeo = new THREE.ConeGeometry(0.032, 0.35, 16, 8, true);
    bPlumeCoreGeo.rotateX(Math.PI);
    bPlumeCoreGeo.translate(0, -0.56, 0);

    // ==========================================
    // 3. MATERIALS
    // ==========================================
    const hMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.bone),
      roughness: 0.22,
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

    const bpMat = new THREE.ShaderMaterial({
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

    const vpMat = new THREE.ShaderMaterial({
      vertexShader: PLUME_VERT,
      fragmentShader: PLUME_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uThrust: { value: 0.0 },
        uBone: { value: new THREE.Color(COLORS.bone) },
        uOrbit: { value: new THREE.Color(COLORS.orbit) },
        uSoil: { value: new THREE.Color(COLORS.bone) },
      },
    });

    return {
      upperHullGeo: uHullGeo,
      thermalSpineGeo: tSpineGeo,
      telemetryRingGeo: telRingGeo,
      viewportFrameGeo: vpFrameGeo,
      heartCoreGeo: hCoreGeo,
      vacuumNozzleGeo: vNozzleGeo,
      vacuumPlumeGeo: vPlumeGeo,

      boosterTankGeo: bTankGeo,
      interstageCollarGeo: isCollarGeo,
      conduitGeo: cdGeo,
      finGeo: fGeo,
      wingtipGeo: wtGeo,
      boosterNozzleGeo: bNozzleGeo,
      shockRingGeo: srGeo,
      boosterPlumeOuterGeo: bPlumeOuterGeo,
      boosterPlumeCoreGeo: bPlumeCoreGeo,

      hullMat: hMat,
      obsidianMat: obMat,
      goldTrimMat: gtMat,
      nozzleMat: nzMat,
      finMat: fnMat,
      cyanBeaconMat: cbMat,
      shockRingMat: srMat,
      heartCoreMat: hcMat,
      boosterPlumeMat: bpMat,
      vacuumPlumeMat: vpMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      upperHullGeo.dispose();
      thermalSpineGeo.dispose();
      telemetryRingGeo.dispose();
      viewportFrameGeo.dispose();
      heartCoreGeo.dispose();
      vacuumNozzleGeo.dispose();
      vacuumPlumeGeo.dispose();

      boosterTankGeo.dispose();
      interstageCollarGeo.dispose();
      conduitGeo.dispose();
      finGeo.dispose();
      wingtipGeo.dispose();
      boosterNozzleGeo.dispose();
      shockRingGeo.dispose();
      boosterPlumeOuterGeo.dispose();
      boosterPlumeCoreGeo.dispose();

      hullMat.dispose();
      obsidianMat.dispose();
      goldTrimMat.dispose();
      nozzleMat.dispose();
      finMat.dispose();
      cyanBeaconMat.dispose();
      shockRingMat.dispose();
      heartCoreMat.dispose();
      boosterPlumeMat.dispose();
      vacuumPlumeMat.dispose();
    };
  }, [
    upperHullGeo,
    thermalSpineGeo,
    telemetryRingGeo,
    viewportFrameGeo,
    heartCoreGeo,
    vacuumNozzleGeo,
    vacuumPlumeGeo,
    boosterTankGeo,
    interstageCollarGeo,
    conduitGeo,
    finGeo,
    wingtipGeo,
    boosterNozzleGeo,
    shockRingGeo,
    boosterPlumeOuterGeo,
    boosterPlumeCoreGeo,
    hullMat,
    obsidianMat,
    goldTrimMat,
    nozzleMat,
    finMat,
    cyanBeaconMat,
    shockRingMat,
    heartCoreMat,
    boosterPlumeMat,
    vacuumPlumeMat,
  ]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const tanVec = useMemo(() => new THREE.Vector3(), []);
  const flightQuat = useMemo(() => new THREE.Quaternion(), []);
  const landingQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    const landingAim = new THREE.Vector3(0.55, 0.82, 0.15).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), landingAim);
    return q;
  }, []);

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

    // Orientation: Forward flight tangent (flightQuat) through cruise & separation
    // Pitch smoothly into upright +45° landing attitude during Mars orbital capture (flightT = 0.86 -> 1.0)
    flightQuat.setFromUnitVectors(upVec, tanVec);
    if (flightT >= 0.86) {
      const pitchT = clamp((flightT - 0.86) / (1.0 - 0.86), 0, 1);
      const smoothPitch = pitchT * pitchT * (3 - 2 * pitchT);
      group.quaternion.copy(flightQuat).slerp(landingQuat, smoothPitch);
    } else {
      group.quaternion.copy(flightQuat);
    }

    // Banking roll around the forward flight axis
    if (innerRollRef.current) {
      const bankRoll = Math.sin(flightT * Math.PI) * 0.42;
      innerRollRef.current.rotation.y = bankRoll;
    }

    // Heart payload core pulse
    if (heartPayloadRef.current) {
      const beatPulse =
        1 +
        0.18 *
          Math.sin(elapsed * (HEART_BPM / 60) * Math.PI * 2) *
          introState.beat;
      heartPayloadRef.current.scale.setScalar(beatPulse);
      heartPayloadRef.current.rotation.y = elapsed * 2.4;
    }

    // Thrust calculation
    const inFlightEnvelope =
      flightT > 0.005
        ? 1.0 - THREE.MathUtils.smoothstep(flightT, 0.94, 0.995)
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

    // ========================================================
    // TWO-STAGE SEPARATION SEQUENCE (flightT: 0.48 -> 0.72)
    // ========================================================
    boosterPlumeMat.uniforms.uTime.value = elapsed;
    vacuumPlumeMat.uniforms.uTime.value = elapsed;

    if (flightT < 0.48) {
      // 1. Unified rocket stack while slicing through F H T M
      if (boosterStageGroupRef.current) {
        boosterStageGroupRef.current.position.set(0, 0, 0);
        boosterStageGroupRef.current.rotation.set(0, 0, 0);
        boosterStageGroupRef.current.visible = true;
      }
      boosterPlumeMat.uniforms.uThrust.value = smoothThrustRef.current;
      vacuumPlumeMat.uniforms.uThrust.value = 0.0;
    } else if (flightT <= 0.72) {
      // 2. Stage separation in center-right deep space zone (flightT: 0.48 -> 0.72)
      // Booster cleanly detaches backward along local -Y, drifts downward, and slowly tumbles
      const sepT = (flightT - 0.48) / (0.72 - 0.48);
      const sepEase = THREE.MathUtils.smoothstep(sepT, 0.0, 1.0);

      const decoupleY = -sepEase * 1.60; // decouple backward along -Y smoothly from 0.0 to -1.60 with zero pop
      const driftDown = -sepEase * 0.35;         // downward drift: -0.35
      const tumbleZ = sepEase * 0.55;            // slow tumble rotation
      const tumbleX = sepEase * 0.35;

      if (boosterStageGroupRef.current) {
        boosterStageGroupRef.current.position.set(
          -sepEase * 0.12,
          decoupleY + driftDown,
          -sepEase * 0.22
        );
        boosterStageGroupRef.current.rotation.set(tumbleX, 0, tumbleZ);
        boosterStageGroupRef.current.visible = true;
      }

      // Booster plume fades out between flightT = 0.48 and 0.56
      const boosterFade = clamp(1.0 - (flightT - 0.48) / 0.08, 0.0, 1.0);
      boosterPlumeMat.uniforms.uThrust.value = smoothThrustRef.current * boosterFade;

      // Ignite upper stage vacuum engine between flightT = 0.50 and 0.58
      const vacIgnite = clamp((flightT - 0.50) / 0.08, 0.0, 1.0);
      vacuumPlumeMat.uniforms.uThrust.value = smoothThrustRef.current * vacIgnite * 1.25;
    } else {
      // 3. Post-separation flight towards Mars orbital pass & retro-braking touchdown
      if (boosterStageGroupRef.current) {
        const postT = (flightT - 0.72) / 0.10;
        const postFade = clamp(1.0 - postT, 0.0, 1.0);
        if (postFade <= 0.01) {
          boosterStageGroupRef.current.visible = false;
        } else {
          boosterStageGroupRef.current.visible = true;
          boosterStageGroupRef.current.position.set(-0.25, -2.4 - postT * 1.6, -0.6);
        }
      }
      boosterPlumeMat.uniforms.uThrust.value = 0.0;

      // Retro-braking burn flare (flightT = 0.88 -> 0.97) cutting off cleanly at touchdown (flightT = 0.98)
      if (flightT < 0.88) {
        vacuumPlumeMat.uniforms.uThrust.value = smoothThrustRef.current * 1.25;
      } else if (flightT <= 0.97) {
        const retroT = (flightT - 0.88) / (0.97 - 0.88);
        const flare = Math.sin(retroT * Math.PI) * 1.8;
        vacuumPlumeMat.uniforms.uThrust.value = (smoothThrustRef.current + flare) * 1.4;
      } else if (flightT < 0.98) {
        const cutT = (flightT - 0.97) / (0.98 - 0.97);
        vacuumPlumeMat.uniforms.uThrust.value = (1.0 - cutT) * smoothThrustRef.current;
      } else {
        // Touchdown engine cutoff
        vacuumPlumeMat.uniforms.uThrust.value = 0.0;
      }
    }

    // Telemetry ripple expansion across Mars during retro-burn & touchdown (flightT = 0.88 -> 1.0)
    if (flightT >= 0.88) {
      introState.marsRipple = clamp((flightT - 0.88) / 0.11, 0, 1);
    } else {
      introState.marsRipple = 0;
    }

    // Scale plumes with thrust
    const bPlumeScaleY = Math.max(0.001, 0.5 + boosterPlumeMat.uniforms.uThrust.value * 0.85);
    const bPlumeScaleXZ = Math.max(0.001, 0.78 + boosterPlumeMat.uniforms.uThrust.value * 0.25);
    if (boosterPlumeOuterRef.current) {
      boosterPlumeOuterRef.current.scale.set(bPlumeScaleXZ, bPlumeScaleY, bPlumeScaleXZ);
    }
    if (boosterPlumeCoreRef.current) {
      boosterPlumeCoreRef.current.scale.set(
        bPlumeScaleXZ * 0.9,
        bPlumeScaleY * 0.85,
        bPlumeScaleXZ * 0.9
      );
    }

    const vPlumeScaleY = Math.max(0.001, 0.45 + vacuumPlumeMat.uniforms.uThrust.value * 0.9);
    const vPlumeScaleXZ = Math.max(0.001, 0.7 + vacuumPlumeMat.uniforms.uThrust.value * 0.3);
    if (vacuumPlumeRef.current) {
      vacuumPlumeRef.current.scale.set(vPlumeScaleXZ, vPlumeScaleY, vPlumeScaleXZ);
    }

    if (shockRingRef.current) {
      const pulse = 1 + 0.15 * Math.sin(elapsed * 28.0);
      shockRingRef.current.scale.setScalar(pulse * boosterPlumeMat.uniforms.uThrust.value);
      shockRingMat.opacity = clamp(boosterPlumeMat.uniforms.uThrust.value * 0.55, 0, 0.7);
    }
    if (thrusterLightRef.current) {
      const totalThrust =
        boosterPlumeMat.uniforms.uThrust.value + vacuumPlumeMat.uniforms.uThrust.value;
      thrusterLightRef.current.intensity = totalThrust * 2.2;
    }

    // Project 3D rocket position to screen CSS pixels
    projVec.copy(posVec).project(camera);
    const px = (projVec.x * 0.5 + 0.5) * size.width;
    const py = (-projVec.y * 0.5 + 0.5) * size.height;
    introState.rocketPx.x = px;
    introState.rocketPx.y = py;
  });

  return (
    <group ref={rocketGroupRef} scale={1.18}>
      <group ref={innerRollRef}>
        {/* ========================================================
            1. UPPER STAGE GROUP
            ======================================================== */}
        <group ref={upperStageGroupRef}>
          {/* Aerodynamic Von Karman nosecone & upper stage tank */}
          <mesh geometry={upperHullGeo} material={hullMat} />
          {/* Obsidian thermal protection tile spine */}
          <mesh geometry={thermalSpineGeo} material={obsidianMat} />
          {/* Gold upper stage telemetry ring */}
          <mesh geometry={telemetryRingGeo} material={goldTrimMat} />

          {/* Viewport bezel & pulsing heart core */}
          <group position={[0, 0.18, 0.082]}>
            <mesh geometry={viewportFrameGeo} material={goldTrimMat} />
            <mesh
              position={[0, 0, -0.008]}
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

          {/* Upper stage vacuum nozzle */}
          <mesh geometry={vacuumNozzleGeo} material={nozzleMat} />

          {/* Upper stage vacuum plasma plume */}
          <mesh
            ref={vacuumPlumeRef}
            geometry={vacuumPlumeGeo}
            material={vacuumPlumeMat}
          />
        </group>

        {/* ========================================================
            2. BOOSTER STAGE GROUP (Separates at flightT = 0.36 -> 0.62)
            ======================================================== */}
        <group ref={boosterStageGroupRef}>
          {/* Booster cylindrical propellant tank */}
          <mesh geometry={boosterTankGeo} material={hullMat} />
          {/* Interstage separation collar */}
          <mesh geometry={interstageCollarGeo} material={obsidianMat} />

          {/* Dual external gold propellant conduits */}
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

          {/* Main booster nozzle */}
          <mesh geometry={boosterNozzleGeo} material={nozzleMat} />

          {/* Mach shockwave ring at booster exit */}
          <mesh
            ref={shockRingRef}
            geometry={shockRingGeo}
            material={shockRingMat}
          />

          {/* Main booster plume cones */}
          <mesh
            ref={boosterPlumeOuterRef}
            geometry={boosterPlumeOuterGeo}
            material={boosterPlumeMat}
          />
          <mesh
            ref={boosterPlumeCoreRef}
            geometry={boosterPlumeCoreGeo}
            material={boosterPlumeMat}
          />
        </group>

        <pointLight
          ref={thrusterLightRef}
          position={[0, -0.32, 0]}
          color={COLORS.orbit}
          intensity={1.2}
          distance={2.8}
          decay={2}
        />
      </group>
    </group>
  );
}
