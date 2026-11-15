"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HEART_BPM } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

interface HeartBeaconProps {
  isPortrait: boolean;
}

export default function HeartBeacon({ isPortrait }: HeartBeaconProps) {
  const { viewport } = useThree();

  const earthBeaconGroupRef = useRef<THREE.Group | null>(null);
  const earthInnerRingRef = useRef<THREE.Mesh | null>(null);
  const earthOuterRingRef = useRef<THREE.Mesh | null>(null);
  const earthCoreDotRef = useRef<THREE.Mesh | null>(null);

  const marsBeaconGroupRef = useRef<THREE.Group | null>(null);
  const marsInnerRingRef = useRef<THREE.Mesh | null>(null);
  const marsOuterRingRef = useRef<THREE.Mesh | null>(null);
  const marsCoreDotRef = useRef<THREE.Mesh | null>(null);

  const {
    coreDotGeo,
    innerRingGeo,
    outerRingGeo,
    pulseRingGeo,
    earthCoreMat,
    earthInnerRingMat,
    earthOuterRingMat,
    marsCoreMat,
    marsInnerRingMat,
    marsOuterRingMat,
  } = useMemo(() => {
    // 1. Small precision core dot
    const cdGeo = new THREE.SphereGeometry(0.024, 16, 16);

    // 2. Precision concentric orbital telemetry rings
    const irGeo = new THREE.RingGeometry(0.075, 0.084, 48);
    const orGeo = new THREE.RingGeometry(0.13, 0.138, 48);
    const prGeo = new THREE.RingGeometry(0.18, 0.19, 48);

    const eCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.heart),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const eInnerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const eOuterMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.heart),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mInnerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.soil),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mOuterMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.heart),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      coreDotGeo: cdGeo,
      innerRingGeo: irGeo,
      outerRingGeo: orGeo,
      pulseRingGeo: prGeo,
      earthCoreMat: eCoreMat,
      earthInnerRingMat: eInnerMat,
      earthOuterRingMat: eOuterMat,
      marsCoreMat: mCoreMat,
      marsInnerRingMat: mInnerMat,
      marsOuterRingMat: mOuterMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      coreDotGeo.dispose();
      innerRingGeo.dispose();
      outerRingGeo.dispose();
      pulseRingGeo.dispose();
      earthCoreMat.dispose();
      earthInnerRingMat.dispose();
      earthOuterRingMat.dispose();
      marsCoreMat.dispose();
      marsInnerRingMat.dispose();
      marsOuterRingMat.dispose();
    };
  }, [
    coreDotGeo,
    innerRingGeo,
    outerRingGeo,
    pulseRingGeo,
    earthCoreMat,
    earthInnerRingMat,
    earthOuterRingMat,
    marsCoreMat,
    marsInnerRingMat,
    marsOuterRingMat,
  ]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const beatFraction = fract(elapsed * (HEART_BPM / 60.0));
    const pulse = Math.exp(-Math.pow((beatFraction - 0.1) / 0.08, 2.0));

    // Earth telemetry marker (Tashkent anchor)
    const { position: tashkentPos, normal: tashkentNormal } =
      getTashkentWorldAnchor(viewport.width, viewport.height, isPortrait);

    const detachProgress = THREE.MathUtils.clamp(introState.p / 0.15, 0, 1);
    const earthOpacity = introState.rim * (1 - detachProgress * 0.7);

    if (earthBeaconGroupRef.current) {
      earthBeaconGroupRef.current.position.copy(tashkentPos);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        tashkentNormal
      );
      earthBeaconGroupRef.current.quaternion.copy(q);
    }

    if (earthCoreDotRef.current) {
      const coreScale = 1.0 + 0.35 * pulse * introState.beat;
      earthCoreDotRef.current.scale.setScalar(coreScale);
    }

    if (earthInnerRingRef.current) {
      earthInnerRingRef.current.rotation.z = elapsed * 0.8;
      earthInnerRingRef.current.scale.setScalar(1.0 + 0.08 * pulse);
    }

    if (earthOuterRingRef.current) {
      earthOuterRingRef.current.rotation.z = -elapsed * 0.5;
    }

    earthCoreMat.opacity = earthOpacity * 0.95;
    earthInnerRingMat.opacity = earthOpacity * 0.65;
    earthOuterRingMat.opacity = earthOpacity * 0.35;

    // Mars telemetry marker (Landing site anchor)
    const marsAnchor = getMarsLandingAnchor(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );

    if (marsBeaconGroupRef.current) {
      marsBeaconGroupRef.current.position.copy(marsAnchor.position);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        marsAnchor.normal
      );
      marsBeaconGroupRef.current.quaternion.copy(q);
    }

    if (marsCoreDotRef.current) {
      const coreScale = 1.0 + 0.3 * pulse;
      marsCoreDotRef.current.scale.setScalar(coreScale);
    }

    if (marsInnerRingRef.current) {
      marsInnerRingRef.current.rotation.z = -elapsed * 0.9;
    }

    if (marsOuterRingRef.current) {
      marsOuterRingRef.current.rotation.z = elapsed * 0.6;
      marsOuterRingRef.current.scale.setScalar(1.0 + 0.12 * pulse);
    }

    const marsOp = introState.marsHeart;
    marsCoreMat.opacity = marsOp * 0.95;
    marsInnerRingMat.opacity = marsOp * 0.7;
    marsOuterRingMat.opacity = marsOp * 0.45;
  });

  return (
    <>
      {/* Precision telemetry marker at Tashkent, Earth */}
      <group ref={earthBeaconGroupRef}>
        <mesh ref={earthCoreDotRef} geometry={coreDotGeo} material={earthCoreMat} />
        <mesh ref={earthInnerRingRef} geometry={innerRingGeo} material={earthInnerRingMat} />
        <mesh ref={earthOuterRingRef} geometry={outerRingGeo} material={earthOuterRingMat} />
      </group>

      {/* Precision telemetry marker at Jezero/landing site, Mars */}
      <group ref={marsBeaconGroupRef}>
        <mesh ref={marsCoreDotRef} geometry={coreDotGeo} material={marsCoreMat} />
        <mesh ref={marsInnerRingRef} geometry={innerRingGeo} material={marsInnerRingMat} />
        <mesh ref={marsOuterRingRef} geometry={outerRingGeo} material={marsOuterRingMat} />
      </group>
    </>
  );
}

function fract(x: number): number {
  return x - Math.floor(x);
}
