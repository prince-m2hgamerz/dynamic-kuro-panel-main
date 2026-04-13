import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Animated particles floating in space
const FloatingParticles3D = ({ count = 100 }: { count?: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      ),
      speed: Math.random() * 0.02 + 0.005,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const matrix = new THREE.Matrix4();
    
    particles.forEach((particle, i) => {
      const time = clock.elapsedTime;
      const x = particle.position.x + Math.sin(time * particle.speed + particle.offset) * 0.5;
      const y = particle.position.y + Math.cos(time * particle.speed * 1.5 + particle.offset) * 0.3;
      const z = particle.position.z + Math.sin(time * particle.speed * 0.8 + particle.offset) * 0.4;
      
      matrix.setPosition(x, y, z);
      meshRef.current!.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#ff1b8d" transparent opacity={0.6} />
    </instancedMesh>
  );
};

// Glowing center orb
const CenterOrb = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#ff1b8d" transparent opacity={0.15} />
    </mesh>
  );
};

// Rotating rings
const NeonRings = () => {
  const group1Ref = useRef<THREE.Group>(null);
  const group2Ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (group1Ref.current) {
      group1Ref.current.rotation.x = clock.elapsedTime * 0.2;
      group1Ref.current.rotation.z = clock.elapsedTime * 0.1;
    }
    if (group2Ref.current) {
      group2Ref.current.rotation.y = clock.elapsedTime * 0.15;
      group2Ref.current.rotation.x = clock.elapsedTime * -0.1;
    }
  });

  return (
    <group position={[0, 0, -10]}>
      <group ref={group1Ref}>
        <mesh>
          <torusGeometry args={[5, 0.02, 16, 100]} />
          <meshBasicMaterial color="#ff1b8d" transparent opacity={0.4} />
        </mesh>
      </group>
      <group ref={group2Ref}>
        <mesh>
          <torusGeometry args={[6, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.3} />
        </mesh>
      </group>
      <mesh>
        <torusGeometry args={[7, 0.01, 16, 100]} />
        <meshBasicMaterial color="#ff6b2b" transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

// Scene composition
const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.1} />
      <FloatingParticles3D count={80} />
      <CenterOrb />
      <NeonRings />
    </>
  );
};

export const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255, 27, 141, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(0, 240, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(128, 0, 255, 0.08) 0%, transparent 70%)
          `
        }}
      />
      
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(270 60% 6%) 0%,
            hsl(280 50% 10%) 30%,
            hsl(300 40% 15%) 60%,
            hsl(320 50% 18%) 100%
          )`
        }}
      />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
        className="absolute inset-0"
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
