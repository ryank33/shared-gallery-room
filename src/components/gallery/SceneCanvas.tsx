import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { Suspense, useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import { Avatars } from "./Avatars";
import { PlayerControls, type PoseSnapshot } from "./PlayerControls";
import { RoomShell } from "./Room";
import { Whiteboard, type BoardStroke } from "./Whiteboard";
import { XRRig } from "./XRRig";
import type { NetMessage, RemoteAvatar } from "./types";

export type GalleryXRStore = ReturnType<typeof createXRStore>;

interface SceneCanvasProps {
  entered: boolean;
  onPose: (p: PoseSnapshot) => void;
  onXrSession: (active: boolean) => void;
  mobileAxes: { x: number; y: number };
  penHex: string;
  erase: boolean;
  brush: number;
  onLocalStroke: (msg: Extract<NetMessage, { t: "stroke" }>) => void;
  remoteStrokeRef: MutableRefObject<BoardStroke | null>;
  clearToken: number;
  strokeLogRef: MutableRefObject<BoardStroke[]>;
  avatars: Record<string, RemoteAvatar>;
  onStore?: (store: GalleryXRStore) => void;
}

export function SceneCanvas(props: SceneCanvasProps) {
  const store = useMemo(
    () =>
      createXRStore({
        hand: true,
        controller: true,
        gaze: false,
      }),
    [],
  );

  useEffect(() => {
    props.onStore?.(store);
  }, [store, props.onStore]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.65, 0.5], fov: 68, near: 0.08, far: 80 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "default",
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor("#2a2622");
        gl.domElement.style.touchAction = "none";
        camera.position.set(0, 1.65, 0.5);
        camera.rotation.order = "YXZ";
        camera.rotation.y = Math.PI;
        camera.rotation.x = 0;
      }}
      className="absolute inset-0 h-full w-full"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <XR store={store}>
        <color attach="background" args={["#2a2622"]} />
        <Suspense
          fallback={
            <group>
              <ambientLight intensity={1.2} />
              <mesh position={[0, 1.2, 2]}>
                <boxGeometry args={[2.4, 1.4, 0.2]} />
                <meshStandardMaterial color="#c8bfb0" />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[14, 12]} />
                <meshStandardMaterial color="#6a5e50" />
              </mesh>
            </group>
          }
        >
          <RoomShell />
          <Whiteboard
            color={props.penHex}
            erase={props.erase}
            brush={props.brush}
            drawingEnabled={props.entered}
            onLocalStroke={props.onLocalStroke}
            remoteStrokeRef={props.remoteStrokeRef}
            clearToken={props.clearToken}
            strokeLogRef={props.strokeLogRef}
          />
          <Avatars avatars={props.avatars} />
          <XRRig onPose={props.onPose} onSession={props.onXrSession} />
          <PlayerControls
            enabled={props.entered}
            onPose={props.onPose}
            mobileAxes={props.mobileAxes}
          />
        </Suspense>
      </XR>
    </Canvas>
  );
}
