import { Text, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MEDIA, ROOM } from "./types";

function prepMap(tex: THREE.Texture, repeatX: number, repeatY: number) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function WallFrame({
  position,
  rotation,
  width,
  height,
  src,
  title,
  credit,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  src: string;
  title: string;
  credit: string;
}) {
  const texture = useTexture(src);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[width + 0.16, height + 0.16, 0.07]} />
        <meshStandardMaterial color="#2a241e" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[width + 0.06, height + 0.06, 0.02]} />
        <meshStandardMaterial color="#ece6da" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.82} metalness={0} />
      </mesh>
      {/* picture light */}
      <mesh position={[0, height / 2 + 0.1, 0.08]}>
        <boxGeometry args={[width * 0.42, 0.035, 0.08]} />
        <meshStandardMaterial color="#c9c2b4" metalness={0.55} roughness={0.3} />
      </mesh>
      <spotLight
        position={[0, height / 2 + 0.08, 0.35]}
        angle={0.55}
        penumbra={0.7}
        intensity={18}
        distance={5}
        color="#fff4e0"
      />
      <Text
        position={[0, -height / 2 - 0.16, 0.03]}
        fontSize={0.09}
        color="#d8d2c6"
        anchorX="center"
        anchorY="top"
        maxWidth={width}
        letterSpacing={0.04}
      >
        {title}
      </Text>
      <Text
        position={[0, -height / 2 - 0.28, 0.03]}
        fontSize={0.065}
        color="#8a8478"
        anchorX="center"
        anchorY="top"
      >
        {credit}
      </Text>
    </group>
  );
}

function VideoWall({
  position,
  rotation,
  width,
  height,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const v = document.createElement("video");
    v.src = MEDIA.video.src;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";

    let tex: THREE.VideoTexture | null = null;
    const onReady = () => {
      if (!mounted.current || tex) return;
      if (v.readyState < 2) return;
      tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (mounted.current) setTexture(tex);
      void v.play().catch(() => {});
    };

    v.addEventListener("loadeddata", onReady);
    v.addEventListener("canplay", onReady);
    const t = window.setTimeout(() => v.load(), 0);

    return () => {
      mounted.current = false;
      window.clearTimeout(t);
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("canplay", onReady);
      v.pause();
      v.removeAttribute("src");
      v.load();
      tex?.dispose();
    };
  }, []);

  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[width + 0.22, height + 0.22, 0.1]} />
        <meshStandardMaterial color="#161412" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[width, height]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1c22" emissive="#243040" emissiveIntensity={0.3} />
        )}
      </mesh>
      <mesh position={[0, height / 2 + 0.09, 0.03]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshBasicMaterial color="#c45c5c" />
      </mesh>
      <Text
        position={[0, -height / 2 - 0.18, 0.03]}
        fontSize={0.09}
        color="#d8d2c6"
        anchorX="center"
        anchorY="top"
      >
        {MEDIA.video.title}
      </Text>
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.08, 0.48]} />
        <meshStandardMaterial color="#3d342c" roughness={0.55} />
      </mesh>
      <mesh position={[-0.7, 0.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.4, 0.42]} />
        <meshStandardMaterial color="#2c2620" roughness={0.65} />
      </mesh>
      <mesh position={[0.7, 0.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.4, 0.42]} />
        <meshStandardMaterial color="#2c2620" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 12]} />
        <meshStandardMaterial color="#4a3f36" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#3d5344" roughness={0.85} />
      </mesh>
      <mesh position={[0.08, 0.68, 0.04]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#4d6a54" roughness={0.8} />
      </mesh>
    </group>
  );
}

function CeilingCan({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.06, 12]} />
        <meshStandardMaterial color="#2a2622" metalness={0.4} roughness={0.4} />
      </mesh>
      <pointLight intensity={7} distance={6} color="#fff3dd" />
    </group>
  );
}

function Sculpture() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.18;
  });
  return (
    <group position={[0, 0, -1.35]}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.56, 0.72]} />
        <meshStandardMaterial color="#3a342e" roughness={0.55} />
      </mesh>
      <mesh ref={ref} position={[0, 1.05, 0]} castShadow>
        <icosahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#cfc6b8" metalness={0.62} roughness={0.22} />
      </mesh>
    </group>
  );
}

export function RoomShell() {
  const w = ROOM.width;
  const d = ROOM.depth;
  const h = ROOM.height;

  const oak = useTexture(MEDIA.floor);
  const plaster = useTexture(MEDIA.wall);
  const slate = useTexture(MEDIA.runner);

  useMemo(() => {
    prepMap(oak, 6, 5);
    prepMap(plaster, 2.4, 1.4);
    prepMap(slate, 4, 1.2);
  }, [oak, plaster, slate]);

  return (
    <group>
      <fog attach="fog" args={["#2a2622", 11, 22]} />
      <color attach="background" args={["#2a2622"]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={oak} roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[2.2, d - 1.6]} />
        <meshStandardMaterial map={slate} roughness={0.92} metalness={0.06} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#d8d2c6" roughness={1} />
      </mesh>

      <mesh position={[0, h / 2, -d / 2]} receiveShadow>
        <boxGeometry args={[w, h, ROOM.wallThickness]} />
        <meshStandardMaterial map={plaster} roughness={0.94} />
      </mesh>
      <mesh position={[0, h / 2, d / 2]} receiveShadow>
        <boxGeometry args={[w, h, ROOM.wallThickness]} />
        <meshStandardMaterial map={plaster} roughness={0.94} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[ROOM.wallThickness, h, d]} />
        <meshStandardMaterial map={plaster} roughness={0.94} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[ROOM.wallThickness, h, d]} />
        <meshStandardMaterial map={plaster} roughness={0.94} />
      </mesh>

      {(
        [
          [0, 0.07, -d / 2 + 0.08, 0, w],
          [0, 0.07, d / 2 - 0.08, Math.PI, w],
          [-w / 2 + 0.08, 0.07, 0, Math.PI / 2, d],
          [w / 2 - 0.08, 0.07, 0, -Math.PI / 2, d],
        ] as const
      ).map((t, i) => (
        <mesh key={i} position={[t[0], t[1], t[2]]} rotation={[0, t[3], 0]}>
          <boxGeometry args={[t[4], 0.14, 0.05]} />
          <meshStandardMaterial color="#5a5046" roughness={0.6} />
        </mesh>
      ))}

      <WallFrame
        position={[-3.15, 1.78, -d / 2 + 0.1]}
        rotation={[0, 0, 0]}
        width={3.1}
        height={1.95}
        src={MEDIA.images[0].src}
        title={MEDIA.images[0].title}
        credit={MEDIA.images[0].credit}
      />
      <WallFrame
        position={[3.15, 1.78, -d / 2 + 0.1]}
        rotation={[0, 0, 0]}
        width={3.1}
        height={1.95}
        src={MEDIA.images[1].src}
        title={MEDIA.images[1].title}
        credit={MEDIA.images[1].credit}
      />
      <WallFrame
        position={[-w / 2 + 0.1, 1.78, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={3.5}
        height={2.15}
        src={MEDIA.images[2].src}
        title={MEDIA.images[2].title}
        credit={MEDIA.images[2].credit}
      />

      <VideoWall
        position={[w / 2 - 0.1, 1.78, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={4.1}
        height={2.3}
      />

      <Sculpture />
      <Bench position={[-2.4, 0, 1.6]} />
      <Bench position={[2.4, 0, 1.6]} />
      <Planter position={[-6.3, 0, -5.1]} />
      <Planter position={[6.3, 0, -5.1]} />
      <Planter position={[-6.3, 0, 5.1]} />
      <Planter position={[6.3, 0, 5.1]} />

      <CeilingCan position={[-3.2, h - 0.04, -2.4]} />
      <CeilingCan position={[3.2, h - 0.04, -2.4]} />
      <CeilingCan position={[-3.2, h - 0.04, 2.2]} />
      <CeilingCan position={[3.2, h - 0.04, 2.2]} />
      <CeilingCan position={[0, h - 0.04, 0]} />

      <ambientLight intensity={0.42} color="#efe6d6" />
      <hemisphereLight args={["#f6f0e4", "#3a322a", 0.55]} />
      <directionalLight
        position={[4, 7, 3]}
        intensity={0.85}
        color="#fff6ea"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[0, 2.6, 4.4]} intensity={14} color="#eef2f8" distance={10} />
    </group>
  );
}
