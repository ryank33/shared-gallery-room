import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { RemoteAvatar } from "./types";

export function Avatars({ avatars }: { avatars: Record<string, RemoteAvatar> }) {
  return (
    <group>
      {Object.values(avatars).map((a) => (
        <Avatar key={a.id} avatar={a} />
      ))}
    </group>
  );
}

function Avatar({ avatar }: { avatar: RemoteAvatar }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(avatar);
  const bob = useRef(Math.random() * Math.PI * 2);

  target.current = avatar;

  useFrame((_, delta) => {
    if (!group.current) return;
    const d = Math.min(delta, 0.1);
    const t = target.current;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, t.x, 12, d);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, t.z, 12, d);
    bob.current += d * 2.2;
    group.current.position.y = Math.sin(bob.current) * 0.015;
    const currentYaw = group.current.rotation.y;
    let dy = t.yaw - currentYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    group.current.rotation.y = currentYaw + dy * Math.min(1, 14 * d);
  });

  return (
    <group ref={group} position={[avatar.x, 0, avatar.z]} rotation={[0, avatar.yaw, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 20]} />
        <meshBasicMaterial color={avatar.color} transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.72, 5, 10]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.54, 0]} castShadow>
        <sphereGeometry args={[0.17, 18, 16]} />
        <meshStandardMaterial color={avatar.color} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.54, -0.15]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#f4f0ea" />
      </mesh>
      <Billboard position={[0, 1.92, 0]}>
        <Text
          fontSize={0.12}
          color="#f3efe8"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.012}
          outlineColor="#141210"
        >
          {avatar.name}
        </Text>
      </Billboard>
    </group>
  );
}
