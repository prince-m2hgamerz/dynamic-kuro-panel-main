import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Animated grid floor with neon lines
const GridFloor = () => {
  const gridRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.z = (clock.elapsedTime * 2) % 2;
    }
  });

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const gridSize = 40;
    const spacing = 2;

    // Horizontal lines
    for (let i = -gridSize; i <= gridSize; i += spacing) {
      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-gridSize, 0, i, gridSize, 0, i])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff1b8d" opacity={0.3} transparent />
        </line>
      );
    }

    // Vertical lines
    for (let i = -gridSize; i <= gridSize; i += spacing) {
      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([i, 0, -gridSize, i, 0, gridSize])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00f0ff" opacity={0.2} transparent />
        </line>
      );
    }

    return lines;
  }, []);

  return (
    <group ref={gridRef} rotation={[-Math.PI / 3, 0, 0]} position={[0, -3, 0]}>
      {gridLines}
    </group>
  );
};

// Floating neon orbs
const NeonOrbs = () => {
  const orbsRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        Math.random() * 10 - 2,
        (Math.random() - 0.5) * 20,
      ] as [number, number, number],
      scale: Math.random() * 0.3 + 0.1,
      color: i % 3 === 0 ? "#ff1b8d" : i % 3 === 1 ? "#00f0ff" : "#ff6b2b",
      speed: Math.random() * 0.5 + 0.2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (orbsRef.current) {
      orbsRef.current.children.forEach((orb, i) => {
        const speed = orbs[i].speed;
        orb.position.y += Math.sin(clock.elapsedTime * speed + i) * 0.01;
        orb.position.x += Math.cos(clock.elapsedTime * speed * 0.5 + i) * 0.005;
      });
    }
  });

  return (
    <group ref={orbsRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[orb.scale, 16, 16]} />
          <meshBasicMaterial color={orb.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Neon light rays
const LightRays = () => {
  const raysRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (raysRef.current) {
      raysRef.current.rotation.y = clock.elapsedTime * 0.1;
    }
  });

  const rays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      rotation: (i / 6) * Math.PI * 2,
      color: i % 2 === 0 ? "#ff1b8d" : "#00f0ff",
    }));
  }, []);

  return (
    <group ref={raysRef} position={[0, -5, -10]}>
      {rays.map((ray, i) => (
        <mesh key={i} rotation={[0, ray.rotation, Math.PI / 6]}>
          <planeGeometry args={[0.1, 30]} />
          <meshBasicMaterial
            color={ray.color}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Main background scene
const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} color="#ff1b8d" intensity={1} />
      <pointLight position={[-10, -10, -10]} color="#00f0ff" intensity={0.5} />
      <GridFloor />
      <NeonOrbs />
      <LightRays />
    </>
  );
};

export const NeonGrid = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
