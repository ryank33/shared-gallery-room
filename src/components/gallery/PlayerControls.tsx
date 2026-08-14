import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sfxFootstep } from "@/lib/gallery-audio";
import { ROOM } from "./types";

const MOVE_SPEED = 3.4;
const LOOK_SENS = 0.0022;
const EYE = 1.65;
const HALF_W = ROOM.width / 2 - 0.5;
const HALF_D = ROOM.depth / 2 - 0.5;

export interface PoseSnapshot {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface PlayerControlsProps {
  enabled: boolean;
  onPose: (pose: PoseSnapshot) => void;
  mobileAxes?: { x: number; y: number };
}

function typingInField() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function PlayerControls({ enabled, onPose, mobileAxes }: PlayerControlsProps) {
  const { camera, gl } = useThree();
  const xrSession = useXR((s) => s.session);
  const keys = useRef(new Set<string>());
  const yaw = useRef(Math.PI);
  const pitch = useRef(0);
  const pos = useRef(new THREE.Vector3(0, EYE, 0.5));
  const locked = useRef(false);
  const lookDrag = useRef(false);
  const lastLook = useRef({ x: 0, y: 0 });
  const tmpF = useRef(new THREE.Vector3());
  const tmpR = useRef(new THREE.Vector3());
  const tmpM = useRef(new THREE.Vector3());
  const bob = useRef(0);
  const stepAcc = useRef(0);

  useEffect(() => {
    if (xrSession) return;
    camera.position.copy(pos.current);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
  }, [camera, xrSession]);

  useEffect(() => {
    if (!enabled || xrSession) return;
    const el = gl.domElement;
    const coarse = () => window.matchMedia("(pointer: coarse)").matches;

    const onKeyDown = (e: KeyboardEvent) => {
      if (typingInField()) return;
      keys.current.add(e.code);
      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
      if (e.code === "KeyL") {
        if (document.pointerLockElement === el) document.exitPointerLock();
        else void el.requestPointerLock?.();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);

    const onPointerLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= e.movementX * LOOK_SENS;
      pitch.current -= e.movementY * LOOK_SENS;
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current));
    };

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-ui]")) return;
      if (e.button === 2 || (coarse() && e.button === 0)) {
        lookDrag.current = true;
        lastLook.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!lookDrag.current) return;
      const dx = e.clientX - lastLook.current.x;
      const dy = e.clientY - lastLook.current.y;
      lastLook.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.005;
      pitch.current -= dy * 0.005;
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current));
    };

    const onPointerUp = () => {
      lookDrag.current = false;
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("mousemove", onMouseMove);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      window.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("contextmenu", onContextMenu);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [enabled, gl, xrSession]);

  useFrame((_, delta) => {
    if (!enabled || xrSession) return;
    const d = Math.min(delta, 0.1);
    const k = keys.current;

    let forward = 0;
    let strafe = 0;
    if (!typingInField()) {
      if (k.has("KeyW") || k.has("ArrowUp")) forward += 1;
      if (k.has("KeyS") || k.has("ArrowDown")) forward -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) strafe += 1;
      if (k.has("KeyA") || k.has("ArrowLeft")) strafe -= 1;
    }

    if (mobileAxes) {
      forward += -mobileAxes.y;
      strafe += mobileAxes.x;
    }

    const len = Math.hypot(forward, strafe);
    if (len > 1) {
      forward /= len;
      strafe /= len;
    }

    tmpF.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    tmpR.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    tmpM.current
      .set(0, 0, 0)
      .addScaledVector(tmpF.current, forward)
      .addScaledVector(tmpR.current, strafe)
      .multiplyScalar(MOVE_SPEED * d);

    pos.current.add(tmpM.current);
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -HALF_W, HALF_W);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -HALF_D, HALF_D);

    const moving = len > 0.08;
    if (moving) {
      bob.current += d * 11;
      stepAcc.current += d;
      if (stepAcc.current > 0.38) {
        stepAcc.current = 0;
        sfxFootstep();
      }
    } else {
      bob.current *= 1 - Math.min(1, d * 8);
      stepAcc.current = 0.2;
    }

    const eye = EYE + Math.sin(bob.current) * (moving ? 0.028 : 0);
    pos.current.y = eye;

    camera.position.copy(pos.current);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    onPose({
      x: pos.current.x,
      y: EYE,
      z: pos.current.z,
      yaw: yaw.current,
    });
  });

  return null;
}
