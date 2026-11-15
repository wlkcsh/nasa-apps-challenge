import { CAMERA } from "@/lib/config";

export interface IntroState {
  letter: [number, number, number, number];
  sceneLive: boolean;
  p: number;
  deltaP: number;
  beat: number;
  rumble: number;
  trailRate: number;
  marsRipple: number;
  triggerPx: [number, number, number, number];
  // Auxiliary visual progress fields driven by Boot & Master timelines
  rim: number;
  stars: number;
  marsIn: number;
  marsHeart: number;
  camZ: number;
  camX: number;
  camLookX: number;
  rocketPx: { x: number; y: number };
}

export function createIntroState(): IntroState {
  return {
    letter: [0, 0, 0, 0],
    sceneLive: false,
    p: 0,
    deltaP: 0,
    beat: 1,
    rumble: 0,
    trailRate: 0,
    marsRipple: 0,
    triggerPx: [0, 0, 0, 0],
    rim: 0,
    stars: 0,
    marsIn: 5.5,
    marsHeart: 0,
    camZ: CAMERA.z[0],
    camX: 0,
    camLookX: 0,
    rocketPx: { x: -9999, y: -9999 },
  };
}

export const introState: IntroState = createIntroState();

export function resetIntroState(target: IntroState = introState): IntroState {
  const fresh = createIntroState();
  target.letter = [...fresh.letter];
  target.sceneLive = fresh.sceneLive;
  target.p = fresh.p;
  target.deltaP = fresh.deltaP;
  target.beat = fresh.beat;
  target.rumble = fresh.rumble;
  target.trailRate = fresh.trailRate;
  target.marsRipple = fresh.marsRipple;
  target.triggerPx = [...fresh.triggerPx];
  target.rim = fresh.rim;
  target.stars = fresh.stars;
  target.marsIn = fresh.marsIn;
  target.marsHeart = fresh.marsHeart;
  target.camZ = fresh.camZ;
  target.camX = fresh.camX;
  target.camLookX = fresh.camLookX;
  target.rocketPx = { ...fresh.rocketPx };
  return target;
}
