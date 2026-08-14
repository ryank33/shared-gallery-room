import { useFrame, useThree } from "@react-three/fiber";
import { useXR, useXRControllerLocomotion, XROrigin } from "@react-three/xr";
import { useRef } from "react";
import * as THREE from "three";
import { ROOM } from "./types";
import type { PoseSnapshot } from "./PlayerControls";

const HALF_W = ROOM.width / 2 - 0.5;
const HALF_D = ROOM.depth / 2 - 0.5;

interface XRRigProps {
  onPose: (p: PoseSnapshot) => void;
  onSession: (active: boolean) => void;
}

/**
 * Headset origin + thumbstick locomotion. Only drives pose while a WebXR session
 * is running so desktop WASD/look stays in PlayerControls.
 */
export function XRRig({ onPose, onSession }: XRRigProps) {
  const origin = useRef<THREE.Group>(null);
  const session = useXR((s) => s.session);
  const camera = useThree((s) => s.camera);
  const lastReport = useRef(false);

  useXRControllerLocomotion(
    origin,
    { speed: 2.6 },
    { type: "snap", degrees: 45, deadZone: 0.55 },
    "left",
  );

  useFrame(() => {
    const active = !!session;
    if (active !== lastReport.current) {
      lastReport.current = active;
      onSession(active);
    }
    if (!origin.current) return;
    origin.current.position.x = THREE.MathUtils.clamp(origin.current.position.x, -HALF_W, HALF_W);
    origin.current.position.z = THREE.MathUtils.clamp(origin.current.position.z, -HALF_D, HALF_D);
    origin.current.position.y = 0;

    if (!active) return;
    onPose({
      x: camera.position.x,
      y: 1.65,
      z: camera.position.z,
      yaw: camera.rotation.y,
    });
  });

  return <XROrigin ref={origin} position={[0, 0, 0.5]} rotation={[0, Math.PI, 0]} />;
}
