import { Text } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sfxPen } from "@/lib/gallery-audio";
import { clearBoard, createBoardCanvas, drawStroke } from "./whiteboard-canvas";
import type { NetMessage, StrokePoint } from "./types";
import { ROOM } from "./types";

export interface BoardStroke {
  id: string;
  color: string;
  width: number;
  erase: boolean;
  points: StrokePoint[];
}

interface WhiteboardProps {
  color: string;
  erase: boolean;
  brush: number;
  drawingEnabled: boolean;
  onLocalStroke: (msg: Extract<NetMessage, { t: "stroke" }>) => void;
  remoteStrokeRef: React.MutableRefObject<BoardStroke | null>;
  clearToken: number;
  strokeLogRef: React.MutableRefObject<BoardStroke[]>;
}

export function Whiteboard({
  color,
  erase,
  brush,
  drawingEnabled,
  onLocalStroke,
  remoteStrokeRef,
  clearToken,
  strokeLogRef,
}: WhiteboardProps) {
  const canvas = useMemo(() => createBoardCanvas(), []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  }, [canvas]);
  const ctx = useMemo(() => canvas.getContext("2d")!, [canvas]);
  const drawing = useRef(false);
  const strokeId = useRef("");
  const points = useRef<StrokePoint[]>([]);
  const lastSend = useRef(0);
  const lastTick = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const dirty = useRef(false);
  const colorRef = useRef(color);
  const eraseRef = useRef(erase);
  const brushRef = useRef(brush);
  colorRef.current = color;
  eraseRef.current = erase;
  brushRef.current = brush;

  useEffect(() => {
    clearBoard(ctx);
    for (const s of strokeLogRef.current) {
      drawStroke(ctx, s.points, s.color, s.width, s.erase);
    }
    texture.needsUpdate = true;
  }, [clearToken, ctx, texture, strokeLogRef]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const remote = remoteStrokeRef.current;
    if (remote) {
      drawStroke(ctx, remote.points, remote.color, remote.width, remote.erase);
      texture.needsUpdate = true;
      remoteStrokeRef.current = null;
    }
    if (dirty.current) {
      texture.needsUpdate = true;
      dirty.current = false;
    }
  });

  const uvFromEvent = (e: ThreeEvent<PointerEvent>): StrokePoint | null => {
    const uv = e.uv;
    if (!uv) return null;
    return [THREE.MathUtils.clamp(uv.x, 0, 1), THREE.MathUtils.clamp(1 - uv.y, 0, 1)];
  };

  const flush = (done: boolean) => {
    if (points.current.length === 0) return;
    const batch = points.current.slice();
    const msg: Extract<NetMessage, { t: "stroke" }> = {
      t: "stroke",
      id: strokeId.current,
      color: colorRef.current,
      width: brushRef.current,
      erase: eraseRef.current,
      points: batch,
      done,
    };
    const existing = strokeLogRef.current.find((s) => s.id === strokeId.current);
    if (existing) {
      existing.points.push(...batch);
    } else {
      strokeLogRef.current.push({
        id: strokeId.current,
        color: colorRef.current,
        width: brushRef.current,
        erase: eraseRef.current,
        points: batch.slice(),
      });
      if (strokeLogRef.current.length > 400) {
        strokeLogRef.current.splice(0, strokeLogRef.current.length - 400);
      }
    }
    onLocalStroke(msg);
    points.current = done ? [] : [batch[batch.length - 1]];
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!drawingEnabled) return;
    if (e.nativeEvent.button !== 0) return;
    e.stopPropagation();
    if (document.pointerLockElement) document.exitPointerLock();
    const p = uvFromEvent(e);
    if (!p) return;
    drawing.current = true;
    strokeId.current = `s-${Math.random().toString(36).slice(2, 10)}`;
    points.current = [p];
    drawStroke(ctx, [p], colorRef.current, brushRef.current, eraseRef.current);
    dirty.current = true;
    lastSend.current = performance.now();
    flush(false);
    sfxPen();
    gl.domElement.style.cursor = "crosshair";
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drawing.current) return;
    e.stopPropagation();
    const p = uvFromEvent(e);
    if (!p) return;
    const prev = points.current[points.current.length - 1];
    if (prev && Math.hypot(prev[0] - p[0], prev[1] - p[1]) < 0.002) return;
    const segment: StrokePoint[] = prev ? [prev, p] : [p];
    drawStroke(ctx, segment, colorRef.current, brushRef.current, eraseRef.current);
    dirty.current = true;
    points.current.push(p);
    const now = performance.now();
    if (now - lastTick.current > 90) {
      lastTick.current = now;
      sfxPen();
    }
    if (now - lastSend.current > 40) {
      lastSend.current = now;
      flush(false);
    }
  };

  const endStroke = (e?: ThreeEvent<PointerEvent>) => {
    if (!drawing.current) return;
    e?.stopPropagation();
    drawing.current = false;
    flush(true);
    gl.domElement.style.cursor = "";
  };

  const boardW = 4.6;
  const boardH = boardW * (576 / 1024);
  const z = ROOM.depth / 2 - 0.1;

  return (
    <group position={[0, 1.72, z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[boardW + 0.28, boardH + 0.38, 0.12]} />
        <meshStandardMaterial color="#2c2824" roughness={0.55} metalness={0.18} />
      </mesh>
      <mesh position={[0, -boardH / 2 - 0.16, 0.02]}>
        <boxGeometry args={[boardW + 0.2, 0.07, 0.1]} />
        <meshStandardMaterial color="#1f1c18" roughness={0.5} />
      </mesh>
      <spotLight
        position={[0, 0.55, 0.7]}
        angle={0.7}
        penumbra={0.65}
        intensity={16}
        distance={7}
        color="#fff6e4"
      />
      <mesh
        ref={meshRef}
        position={[0, 0, 0.02]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
        onPointerOver={() => {
          if (drawingEnabled) gl.domElement.style.cursor = "crosshair";
        }}
        onPointerOut={() => {
          if (!drawing.current) gl.domElement.style.cursor = "";
        }}
      >
        <planeGeometry args={[boardW, boardH]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Text
        position={[0, boardH / 2 + 0.18, 0.03]}
        fontSize={0.11}
        color="#efe8dc"
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.06}
      >
        SHARED WHITEBOARD
      </Text>
    </group>
  );
}
