import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Floating particles ────────────────────────────── */
const Particles = ({ count = 80 }) => {
  const ref = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      sz[i] = Math.random() * 2 + 0.5;
    }
    return [pos, sz];
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.003;
      arr[i * 3] += Math.cos(t * 0.2 + i * 0.5) * 0.002;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial color="#3b82f6" size={0.08} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

/* ── Slowly rotating wireframe torus ───────────────── */
const HeroTorus = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.x = t * 0.08;
    ref.current.rotation.y = t * 0.12;
  });
  return (
    <mesh ref={ref} position={[3.5, 0.5, -4]}>
      <torusGeometry args={[2.2, 0.6, 24, 60]} />
      <meshStandardMaterial
        color="#3b82f6"
        emissive="#1d4ed8"
        emissiveIntensity={0.4}
        wireframe
        transparent
        opacity={0.35}
      />
    </mesh>
  );
};

/* ── Floating ring ─────────────────────────────────── */
const FloatingRing = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.z = t * 0.15;
    ref.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.2) * 0.1;
    ref.current.position.y = -1 + Math.sin(t * 0.4) * 0.3;
  });
  return (
    <mesh ref={ref} position={[-3, -1, -6]}>
      <torusGeometry args={[1.8, 0.08, 16, 80]} />
      <meshStandardMaterial
        color="#0ea5e9"
        emissive="#0284c7"
        emissiveIntensity={0.6}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
};

/* ── Icosahedron (abstract gem) ─────────────────────── */
const FloatingGem = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.2;
    ref.current.rotation.x = t * 0.1;
    ref.current.position.y = 2 + Math.sin(t * 0.5) * 0.4;
  });
  return (
    <mesh ref={ref} position={[-4.5, 2, -3]}>
      <icosahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#0891b2"
        emissiveIntensity={0.5}
        wireframe
        transparent
        opacity={0.45}
      />
    </mesh>
  );
};

/* ── Horizontal grid plane ──────────────────────────── */
const GridPlane = () => {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.z = (clock.elapsedTime * 0.5) % 2;
    }
  });

  const lines = useMemo(() => {
    const els: JSX.Element[] = [];
    const size = 30;
    const gap = 2;
    for (let i = -size; i <= size; i += gap) {
      els.push(
        <line key={`h${i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-size, 0, i, size, 0, i])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#1e40af" transparent opacity={0.15} />
        </line>,
        <line key={`v${i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([i, 0, -size, i, 0, size])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#1e3a8a" transparent opacity={0.1} />
        </line>
      );
    }
    return els;
  }, []);

  return (
    <group ref={ref} position={[0, -5, 0]} rotation={[-Math.PI / 5, 0, 0]}>
      {lines}
    </group>
  );
};

/* ── Scene composition ─────────────────────────────── */
const Scene = () => (
  <>
    <ambientLight intensity={0.15} />
    <pointLight position={[8, 6, 5]} color="#3b82f6" intensity={0.8} distance={30} />
    <pointLight position={[-8, -4, -5]} color="#0ea5e9" intensity={0.4} distance={25} />
    <Particles />
    <HeroTorus />
    <FloatingRing />
    <FloatingGem />
    <GridPlane />
  </>
);

const FuturisticAuthScene = () => (
  <Canvas
    camera={{ position: [0, 0, 12], fov: 50 }}
    gl={{ antialias: true, alpha: true }}
    style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
    role="img"
    aria-label="Futuristic 3D background with floating geometric shapes"
  >
    <Scene />
  </Canvas>
);

export default FuturisticAuthScene;
